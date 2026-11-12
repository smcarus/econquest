/**
 * Macrobond adapter (data plan G5): fetches the series you mapped (src/engine/paidData.ts) from your
 * own Macrobond Web API licence. The Web API licence is separate from the Macrobond desktop app.
 *
 * How the Web API works, as Macrobond's own open-source client (macrobond-data-api for Python, MIT
 * licence, version 3.0.4, read on 9 November 2026) calls it:
 * - Sign-in: OAuth2 client credentials. The token address comes from
 *   https://apiauth.macrobondfinancial.com/mbauth/.well-known/openid-configuration (token_endpoint);
 *   the app posts grant_type=client_credentials, client_id, client_secret and
 *   scope=macrobond_web_api.read_mb as a form, and gets a Bearer access_token with expires_in.
 *   A 400 with error "invalid_client" means wrong credentials; a 429 carries Retry-After (seconds).
 * - Series: GET https://api.macrobondfinancial.com/v1/series/fetchseries?n=<name>&n=<name>, answered
 *   in the same order as asked. Each item has dates (ISO 8601), values (null for a missing value)
 *   and metadata, or errorText and errorCode when that series could not be read.
 * - Limits (Macrobond help pages): 100 requests per 10 seconds, 20 at a time. The app asks for a few
 *   series per request, one request at a time, a quarter of a second apart.
 *
 * The sign-in token is held in memory only, never written anywhere. Figures are kept as
 * src/engine/paidData.ts says: on this computer only, never in a download, backup or shared copy.
 * Notes this file returns name series codes and counts, never a figure or a credential.
 *
 * Shared engine: reaches the network only through Platform.http.
 */
import type { Platform } from '../platform/types';
import { listPaidMappings, savePaidPoints, type PaidFreq, type PaidMapping, type PaidPoint } from './paidData';

export const MACROBOND_AUTH_URL = 'https://apiauth.macrobondfinancial.com/mbauth/';
export const MACROBOND_API_URL = 'https://api.macrobondfinancial.com/';
export const MACROBOND_SCOPE = 'macrobond_web_api.read_mb';
export const MACROBOND_HOSTS = ['apiauth.macrobondfinancial.com', 'api.macrobondfinancial.com'];
/** Series names per request: short addresses, and well under the limits. */
export const MACROBOND_CHUNK = 20;
/** Pause between requests, ms (100 requests per 10 seconds allowed). */
export const MACROBOND_GAP_MS = 250;

export interface MacrobondCredentials {
  clientId: string;
  clientSecret: string;
}

export function macrobondCredentials(env: Record<string, string | undefined>): MacrobondCredentials | null {
  const clientId = (env.MACROBOND_CLIENT_ID || '').trim();
  const clientSecret = (env.MACROBOND_CLIENT_SECRET || '').trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function macrobondFetchUrl(names: string[]): string {
  return `${MACROBOND_API_URL}v1/series/fetchseries?${names.map((n) => `n=${encodeURIComponent(n)}`).join('&')}`;
}

/** The form body of the token request. */
export function macrobondTokenBody(c: MacrobondCredentials): string {
  return new URLSearchParams({ grant_type: 'client_credentials', client_id: c.clientId, client_secret: c.clientSecret, scope: MACROBOND_SCOPE }).toString();
}

export type MacrobondSignIn = { token: string; expiresAt: number } | { error: string; badCredentials?: boolean; retryAfter?: number };

/** Reads the token reply (status and body text) as Macrobond's client does. */
export function readMacrobondToken(status: number, text: string, nowMs: number, retryAfterHeader?: string): MacrobondSignIn {
  if (status === 429) {
    const n = Number.parseInt(retryAfterHeader || '', 10);
    return { error: 'Macrobond said too many sign-ins; try again shortly', retryAfter: Number.isFinite(n) ? n : 5 };
  }
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = null;
  }
  if (status === 400) {
    if (json?.error === 'invalid_client') return { error: 'Macrobond refused the client ID and secret (invalid_client). Check both under Menu > Settings > Your subscriptions', badCredentials: true };
    return { error: `Macrobond refused the sign-in (${typeof json?.error === 'string' ? json.error : 'HTTP 400'})` };
  }
  if (status !== 200) return { error: `Macrobond sign-in answered HTTP ${status}` };
  if (!json || typeof json !== 'object') return { error: 'Macrobond sign-in answered without a readable reply' };
  if (json.token_type && String(json.token_type).toLowerCase() !== 'bearer') return { error: 'Macrobond sign-in answered with an unexpected token type' };
  const token = typeof json.access_token === 'string' ? json.access_token : '';
  if (!token) return { error: 'Macrobond sign-in answered without a token' };
  const expiresAt = json.expires_at ? Number(json.expires_at) * 1000 : json.expires_in ? nowMs + Number(json.expires_in) * 1000 : NaN;
  if (!Number.isFinite(expiresAt)) return { error: 'Macrobond sign-in answered without an expiry' };
  return { token, expiresAt };
}

/** A date from Macrobond (ISO 8601) as the app's period for the series' frequency. */
export function macrobondPeriod(iso: string, freq: PaidFreq): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const [, y, mo, d] = m;
  if (freq === 'annual') return y!;
  if (freq === 'quarterly') return `${y}-Q${Math.floor((Number(mo) - 1) / 3) + 1}`;
  if (freq === 'monthly') return `${y}-${mo}`;
  return `${y}-${mo}-${d}`;
}

export type MacrobondRead = { points: PaidPoint[] } | { error: string };

/**
 * One item of a fetchseries reply as points for the mapping's frequency, oldest first. Missing
 * values (null) are skipped, never filled; two dates in one period keep the later one.
 */
export function readMacrobondSeries(item: unknown, freq: PaidFreq): MacrobondRead {
  const o = (item && typeof item === 'object' ? item : {}) as { dates?: unknown; values?: unknown; errorText?: unknown; errorCode?: unknown };
  if (typeof o.errorText === 'string' && o.errorText) return { error: `Macrobond: ${o.errorText}${o.errorCode !== undefined ? ` (code ${String(o.errorCode)})` : ''}` };
  if (!Array.isArray(o.dates) || !Array.isArray(o.values) || o.dates.length !== o.values.length) return { error: 'Macrobond answered this series in a shape the app cannot read' };
  const byPeriod = new Map<string, number>();
  o.dates.forEach((d, i) => {
    const v = (o.values as unknown[])[i];
    const period = macrobondPeriod(String(d), freq);
    if (period && typeof v === 'number' && Number.isFinite(v)) byPeriod.set(period, v);
  });
  const points = [...byPeriod.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  return points.length ? { points } : { error: 'Macrobond answered this series with no values' };
}

/** The sign-in, held in memory only for the life of the app. */
let session: { key: string; token: string; expiresAt: number; tokenUrl: string } | null = null;
/** Tests only. */
export function resetMacrobondSession(): void {
  session = null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function signIn(platform: Platform, c: MacrobondCredentials, timeoutMs: number): Promise<{ token: string } | { error: string; badCredentials?: boolean }> {
  const key = `${c.clientId}\u0000${c.clientSecret}`;
  const now = platform.clock.now();
  if (session && session.key === key && session.expiresAt - 60_000 > now) return { token: session.token };
  let tokenUrl = session?.key === key ? session.tokenUrl : '';
  if (!tokenUrl) {
    try {
      const r = await platform.http.request({ url: `${MACROBOND_AUTH_URL}.well-known/openid-configuration`, timeoutMs });
      if (!r.ok) return { error: `Macrobond sign-in address lookup answered HTTP ${r.status}` };
      tokenUrl = String(((await r.json().catch(() => ({}))) as { token_endpoint?: unknown }).token_endpoint || '');
      if (!/^https:\/\//.test(tokenUrl)) return { error: 'Macrobond sign-in address lookup answered without a token address' };
    } catch (e) {
      return { error: `Macrobond did not answer (${e instanceof Error ? e.message : String(e)})` };
    }
  }
  try {
    const r = await platform.http.request({ url: tokenUrl, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: macrobondTokenBody(c), timeoutMs });
    const got = readMacrobondToken(r.status, await r.text(), platform.clock.now(), r.headers['retry-after']);
    if ('error' in got) return got;
    session = { key, token: got.token, expiresAt: got.expiresAt, tokenUrl };
    return { token: got.token };
  } catch (e) {
    return { error: `Macrobond did not answer the sign-in (${e instanceof Error ? e.message : String(e)})` };
  }
}

export interface MacrobondStep {
  id: string;
  code: string;
  ok: boolean;
  /** Counts and dates only, never a figure. */
  note: string;
}

export interface MacrobondPull {
  ok: boolean;
  signedIn: boolean;
  /** One line for the daily log and Data health: no figures, no credentials. */
  note: string;
  steps: MacrobondStep[];
}

/**
 * Fetches every Macrobond mapping (or only `onlyIds`) and keeps what came back with savePaidPoints.
 * A series that fails keeps its last saved copy; nothing is ever filled in.
 */
export async function pullMacrobond(
  platform: Platform,
  c: MacrobondCredentials,
  opts: { timeoutMs?: number; gapMs?: number; onlyIds?: string[]; mappings?: PaidMapping[] } = {}
): Promise<MacrobondPull> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const gap = opts.gapMs ?? MACROBOND_GAP_MS;
  const all = (opts.mappings ?? (await listPaidMappings(platform))).filter((m) => m.vendor === 'macrobond' && (!opts.onlyIds || opts.onlyIds.includes(m.id)));
  const auth = await signIn(platform, c, timeoutMs);
  if ('error' in auth) return { ok: false, signedIn: false, note: auth.error, steps: [] };
  if (!all.length) return { ok: true, signedIn: true, note: 'Signed in to Macrobond; no series are mapped yet', steps: [] };
  // One request per group of codes; the same code mapped for two countries is asked once.
  const codes = [...new Set(all.map((m) => m.code))];
  const replies = new Map<string, unknown>();
  const failed = new Map<string, string>();
  for (let i = 0; i < codes.length; i += MACROBOND_CHUNK) {
    const chunk = codes.slice(i, i + MACROBOND_CHUNK);
    if (i > 0 && gap > 0) await wait(gap);
    try {
      let r = await platform.http.request({ url: macrobondFetchUrl(chunk), headers: { Authorization: `Bearer ${auth.token}`, Accept: 'application/json' }, timeoutMs });
      if (r.status === 429) {
        const n = Number.parseInt(r.headers['retry-after'] || '', 10);
        await wait(Math.min(30, Number.isFinite(n) ? n : 5) * 1000);
        r = await platform.http.request({ url: macrobondFetchUrl(chunk), headers: { Authorization: `Bearer ${auth.token}`, Accept: 'application/json' }, timeoutMs });
      }
      if (r.status === 401 || r.status === 403) {
        session = null;
        chunk.forEach((code) => failed.set(code, r.status === 401 ? 'Macrobond refused the sign-in token (HTTP 401)' : 'Macrobond said your licence does not cover this request (HTTP 403)'));
        continue;
      }
      if (!r.ok) {
        chunk.forEach((code) => failed.set(code, `Macrobond answered HTTP ${r.status}`));
        continue;
      }
      const body = await r.json().catch(() => null);
      if (!Array.isArray(body) || body.length !== chunk.length) {
        chunk.forEach((code) => failed.set(code, 'Macrobond answered in a shape the app cannot read'));
        continue;
      }
      chunk.forEach((code, k) => replies.set(code, body[k]));
    } catch (e) {
      chunk.forEach((code) => failed.set(code, `Macrobond did not answer (${e instanceof Error ? e.message : String(e)})`));
    }
  }
  const pulledAt = new Date(platform.clock.now()).toISOString();
  const steps: MacrobondStep[] = [];
  for (const m of all) {
    const why = failed.get(m.code);
    if (why) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${why}; the last saved copy is kept` });
      continue;
    }
    const read = readMacrobondSeries(replies.get(m.code), m.freq);
    if ('error' in read) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${read.error}` });
      continue;
    }
    await savePaidPoints(platform, m, read.points, pulledAt);
    steps.push({ id: m.id, code: m.code, ok: true, note: `${m.code}: ${read.points.length} values, ${read.points[0]!.date} to ${read.points[read.points.length - 1]!.date}` });
  }
  const good = steps.filter((s) => s.ok).length;
  return { ok: good === steps.length, signedIn: true, note: `Signed in to Macrobond; ${good} of ${steps.length} mapped series read`, steps };
}
