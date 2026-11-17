/**
 * Streaming copies of the audit log to an S3-compatible bucket with object lock (console
 * integration item 10). Each entry goes up as its own object, in order, once it is written:
 *
 *   <prefix><seq, 10 digits>.json   the entry exactly as it is in data/local/audit/audit-log.jsonl
 *
 * with an object-lock retention date, so not even the account that wrote it can change or delete it
 * before that date (COMPLIANCE mode) or only with a special permission (GOVERNANCE mode). The
 * bucket must have been made with object lock on; the app checks nothing about the bucket's own
 * settings beyond the reply to each upload.
 *
 * Works with Amazon S3 and anything that speaks its API with object lock (MinIO, Backblaze B2,
 * Wasabi, Cloudflare R2 does not support object lock). Requests are signed with AWS Signature
 * Version 4; no SDK is needed.
 *
 * Settings (environment, never the audit log or backups):
 *   AUDIT_BUCKET_URL         the bucket's address, e.g. https://my-audit.s3.eu-west-1.amazonaws.com
 *                            or http://minio.internal:9000/my-audit (path style)
 *   AUDIT_BUCKET_REGION      default us-east-1
 *   AUDIT_BUCKET_ACCESS_KEY_ID, AUDIT_BUCKET_SECRET_ACCESS_KEY
 *   AUDIT_BUCKET_PREFIX      default econquest-audit/
 *   AUDIT_BUCKET_LOCK_MODE   COMPLIANCE (default) or GOVERNANCE
 *   AUDIT_BUCKET_RETAIN_DAYS default 2555 (7 years)
 *
 * What has gone up is kept in data/local/audit/bucket-state.json; a failed upload is tried again
 * with a growing wait (5 s to 10 min) and named in the audit screen until it goes through.
 */
import fs from 'fs';
import path from 'path';
import { createHash, createHmac } from 'crypto';
import { writeFileAtomic } from '../utils/atomicWrite';

export interface BucketConfig {
  url: URL;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  lockMode: 'COMPLIANCE' | 'GOVERNANCE';
  retainDays: number;
}

/** The bucket settings from the environment, null when none is set, or what is wrong with them. */
export function bucketConfigFromEnv(env: NodeJS.ProcessEnv): { config: BucketConfig | null; problem?: string } {
  const raw = (env.AUDIT_BUCKET_URL || '').trim();
  if (!raw) return { config: null };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { config: null, problem: 'AUDIT_BUCKET_URL is not an address.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { config: null, problem: 'AUDIT_BUCKET_URL must start with https:// (or http:// for a bucket on your own network).' };
  const accessKeyId = (env.AUDIT_BUCKET_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (env.AUDIT_BUCKET_SECRET_ACCESS_KEY || '').trim();
  if (!accessKeyId || !secretAccessKey) return { config: null, problem: 'Set AUDIT_BUCKET_ACCESS_KEY_ID and AUDIT_BUCKET_SECRET_ACCESS_KEY for the audit bucket.' };
  const mode = (env.AUDIT_BUCKET_LOCK_MODE || 'COMPLIANCE').trim().toUpperCase();
  if (mode !== 'COMPLIANCE' && mode !== 'GOVERNANCE') return { config: null, problem: 'AUDIT_BUCKET_LOCK_MODE must be COMPLIANCE or GOVERNANCE.' };
  const days = env.AUDIT_BUCKET_RETAIN_DAYS ? Number(env.AUDIT_BUCKET_RETAIN_DAYS) : 2555;
  if (!Number.isInteger(days) || days < 1 || days > 36500) return { config: null, problem: 'AUDIT_BUCKET_RETAIN_DAYS must be a whole number of days from 1 to 36500.' };
  let prefix = (env.AUDIT_BUCKET_PREFIX ?? 'econquest-audit/').trim();
  if (prefix && !prefix.endsWith('/')) prefix += '/';
  if (!/^[A-Za-z0-9._/-]*$/.test(prefix)) return { config: null, problem: 'AUDIT_BUCKET_PREFIX may hold only letters, digits and . _ / -' };
  url.pathname = url.pathname.replace(/\/+$/, '');
  return { config: { url, region: (env.AUDIT_BUCKET_REGION || 'us-east-1').trim(), accessKeyId, secretAccessKey, prefix, lockMode: mode, retainDays: days } };
}

// ---- AWS Signature Version 4 --------------------------------------------------------------------

const sha256Hex = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding of one path segment, as SigV4 asks. */
const encodeSegment = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export interface SignInput {
  method: string;
  url: URL;
  headers: Record<string, string>;
  payloadHash: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** YYYYMMDDTHHMMSSZ */
  amzDate: string;
  service?: string;
}

/** The Authorization header for a request (headers must already hold host, x-amz-date, x-amz-content-sha256). */
export function signV4(input: SignInput): string {
  const service = input.service ?? 's3';
  const date = input.amzDate.slice(0, 8);
  const canonicalUri = input.url.pathname.split('/').map((seg) => encodeSegment(decodeURIComponent(seg))).join('/') || '/';
  const query = [...input.url.searchParams.entries()]
    .map(([k, v]) => [encodeSegment(k), encodeSegment(v)])
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const lower = Object.entries(input.headers).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')] as const);
  lower.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const canonicalHeaders = lower.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = lower.map(([k]) => k).join(';');
  const canonicalRequest = [input.method.toUpperCase(), canonicalUri, query, canonicalHeaders, signedHeaders, input.payloadHash].join('\n');
  const scope = `${date}/${input.region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', input.amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, date), input.region), service), 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(toSign).digest('hex');
  return `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export const amzDateOf = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function objectKey(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(10, '0')}.json`;
}

/** One locked upload. Resolves with the HTTP status; throws on a network failure. */
export async function putLockedObject(cfg: BucketConfig, key: string, body: string, now: Date, fetchFn: typeof fetch = fetch): Promise<{ status: number; text: string }> {
  const url = new URL(cfg.url.toString());
  url.pathname = `${url.pathname}/${key}`;
  const bytes = Buffer.from(body, 'utf8');
  const payloadHash = sha256Hex(bytes);
  const retain = new Date(now.getTime() + cfg.retainDays * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const headers: Record<string, string> = {
    host: url.host,
    'content-type': 'application/json',
    'content-md5': createHash('md5').update(bytes).digest('base64'),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDateOf(now),
    'x-amz-object-lock-mode': cfg.lockMode,
    'x-amz-object-lock-retain-until-date': retain,
  };
  const authorization = signV4({ method: 'PUT', url, headers, payloadHash, region: cfg.region, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, amzDate: headers['x-amz-date']! });
  const { host: _host, ...sendHeaders } = headers;
  const res = await fetchFn(url, { method: 'PUT', headers: { ...sendHeaders, authorization }, body: bytes, signal: AbortSignal.timeout(30_000) });
  return { status: res.status, text: res.ok ? '' : (await res.text().catch(() => '')).slice(0, 300) };
}

// ---- the shipper ---------------------------------------------------------------------------------

export interface BucketState {
  /** The last entry that went up. */
  shippedSeq: number;
  lastOkAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  failures: number;
}

export function bucketStateFile(dataDir: string): string {
  return path.join(dataDir, 'local', 'audit', 'bucket-state.json');
}

export function readBucketState(file: string): BucketState {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { shippedSeq: Number.isInteger(s?.shippedSeq) ? s.shippedSeq : 0, failures: Number(s?.failures) || 0, ...(s?.lastOkAt ? { lastOkAt: s.lastOkAt } : {}), ...(s?.lastError ? { lastError: String(s.lastError), lastErrorAt: s.lastErrorAt } : {}) };
  } catch {
    return { shippedSeq: 0, failures: 0 };
  }
}

/** Wait before the next try after `failures` failed uploads in a row: 5 s doubling to 10 min. */
export function retryDelayMs(failures: number): number {
  return failures <= 0 ? 0 : Math.min(600_000, 5000 * 2 ** (failures - 1));
}

/**
 * Sends every entry after the last one that went up, in order, stopping at the first failure.
 * `lines` is the log file's lines; a line that does not read as an entry stops the run (the audit
 * check names it). Returns the new state (also saved).
 */
export async function shipAudit(cfg: BucketConfig, lines: string[], stateFile: string, now: () => Date = () => new Date(), fetchFn: typeof fetch = fetch, max = 200): Promise<BucketState> {
  const state = readBucketState(stateFile);
  const save = () => {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    writeFileAtomic(stateFile, JSON.stringify(state), 0o600);
  };
  if (state.failures && state.lastErrorAt && now().getTime() - Date.parse(state.lastErrorAt) < retryDelayMs(state.failures)) return state;
  let sent = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let seq: number;
    try {
      seq = JSON.parse(line).seq;
    } catch {
      break;
    }
    if (!Number.isInteger(seq) || seq <= state.shippedSeq) continue;
    if (seq !== state.shippedSeq + 1) {
      state.lastError = `entry ${state.shippedSeq + 1} is missing from the log, so later entries were not sent`;
      state.lastErrorAt = now().toISOString();
      state.failures += 1;
      save();
      return state;
    }
    if (sent >= max) break;
    try {
      const r = await putLockedObject(cfg, objectKey(cfg.prefix, seq), line, now(), fetchFn);
      if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}${r.text ? `: ${r.text.replace(/\s+/g, ' ').slice(0, 200)}` : ''}`);
    } catch (e) {
      state.lastError = `entry ${seq} did not go up: ${(e as Error)?.message || e}`;
      state.lastErrorAt = now().toISOString();
      state.failures += 1;
      save();
      return state;
    }
    state.shippedSeq = seq;
    state.lastOkAt = now().toISOString();
    state.failures = 0;
    delete state.lastError;
    delete state.lastErrorAt;
    sent += 1;
  }
  if (sent) save();
  return state;
}
