/**
 * Audit seal and locked bucket copies (console integration item 10): a seal only the key can make,
 * a rewritten chain caught, AWS Signature Version 4 checked against AWS's own published example,
 * and entries sent in order to an S3-style receiver with object-lock headers, retried after a failure.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { checkLog, nextEntry, type AuditEntry } from '../src/utils/auditLog';
import { appendAudit, auditFiles, readAudit, resetAuditCache, setAuditSealKey } from '../src/utils/auditStore';
import { checkSeals, sealKeyFrom, sealKeyProblem } from '../src/utils/auditSeal';
import { bucketConfigFromEnv, objectKey, readBucketState, retryDelayMs, shipAudit, signV4 } from '../src/server/auditBucket';

const KEY = 'test-seal-key-0123456789abcdef0123456789';
const tmpFiles = () => {
  resetAuditCache();
  return auditFiles(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-seal-')));
};

test('seal key: short keys are refused, the id gives nothing away', () => {
  assert.match(sealKeyProblem('short')!, /at least 32/);
  assert.equal(sealKeyFrom('short'), null);
  assert.equal(sealKeyFrom(undefined), null);
  const k = sealKeyFrom(KEY)!;
  assert.match(k.id, /^[0-9a-f]{12}$/);
  assert.ok(!KEY.includes(k.id));
});

test('with a key every new entry is sealed; the chain check is unchanged; entries before the key read unsealed', () => {
  const files = tmpFiles();
  setAuditSealKey(null);
  appendAudit(files, { kind: 'data', summary: 'before the key' });
  setAuditSealKey(sealKeyFrom(KEY));
  try {
    appendAudit(files, { kind: 'data', summary: 'one' });
    appendAudit(files, { kind: 'data', summary: 'two' });
    const r = readAudit(files);
    assert.equal(r.check.ok, true);
    assert.equal(r.seals.ok, true);
    assert.deepEqual([r.seals.sealed, r.seals.unsealed, r.seals.unsealedAfterSealed], [2, 1, 0]);
    assert.ok(!fs.readFileSync(files.log, 'utf8').includes(KEY), 'the key is never in the log');
  } finally {
    setAuditSealKey(null);
  }
});

test('a chain rewritten without the key fails the seal check; stripped seals are flagged', () => {
  const files = tmpFiles();
  const key = sealKeyFrom(KEY)!;
  setAuditSealKey(key);
  try {
    for (let i = 0; i < 4; i++) appendAudit(files, { kind: 'data', summary: `step ${i}` });
  } finally {
    setAuditSealKey(null);
  }
  const lines = fs.readFileSync(files.log, 'utf8').trim().split('\n');
  const entries = lines.map((l) => JSON.parse(l) as AuditEntry);
  // Rewrite from entry 2 on: change the summary, recompute every hash, keep the old seals.
  const rewritten: AuditEntry[] = [entries[0]!];
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i]!;
    const next = nextEntry(rewritten[i - 1]!, { kind: e.kind, summary: i === 1 ? 'something else' : e.summary }, new Date(e.at));
    rewritten.push({ ...next, seal: e.seal, sealKey: e.sealKey });
  }
  const chain = checkLog(rewritten.map((e) => JSON.stringify(e)));
  assert.equal(chain.check.ok, true, 'the hash chain alone cannot see it');
  const seals = checkSeals(chain.entries, key);
  assert.equal(seals.ok, false);
  assert.equal(seals.badSeq, 2);
  // Stripping the seals instead is flagged.
  const stripped = rewritten.map((e, i) => (i === 0 ? e : { ...e, seal: undefined, sealKey: undefined }));
  const s2 = checkSeals(checkLog(stripped.map((e) => JSON.stringify(e))).entries, key);
  assert.equal(s2.ok, true);
  assert.equal(s2.unsealedAfterSealed, 3);
});

test('SigV4 matches the AWS documentation example (GET Object with a Range header)', () => {
  // Amazon S3 API Reference, "Signature Calculations for the Authorization Header", example GET Object.
  const auth = signV4({
    method: 'GET',
    url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
    headers: { host: 'examplebucket.s3.amazonaws.com', range: 'bytes=0-9', 'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'x-amz-date': '20130524T000000Z' },
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    region: 'us-east-1',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    amzDate: '20130524T000000Z',
  });
  assert.equal(
    auth,
    'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'
  );
});

test('bucket settings: off without a URL; problems named; defaults', () => {
  assert.equal(bucketConfigFromEnv({}).config, null);
  assert.match(bucketConfigFromEnv({ AUDIT_BUCKET_URL: 'https://b.example' }).problem!, /ACCESS_KEY_ID/);
  assert.match(bucketConfigFromEnv({ AUDIT_BUCKET_URL: 'ftp://b', AUDIT_BUCKET_ACCESS_KEY_ID: 'a', AUDIT_BUCKET_SECRET_ACCESS_KEY: 'b' }).problem!, /https/);
  assert.match(bucketConfigFromEnv({ AUDIT_BUCKET_URL: 'https://b.example', AUDIT_BUCKET_ACCESS_KEY_ID: 'a', AUDIT_BUCKET_SECRET_ACCESS_KEY: 'b', AUDIT_BUCKET_LOCK_MODE: 'loose' }).problem!, /COMPLIANCE/);
  const c = bucketConfigFromEnv({ AUDIT_BUCKET_URL: 'http://127.0.0.1:9000/audit/', AUDIT_BUCKET_ACCESS_KEY_ID: 'a', AUDIT_BUCKET_SECRET_ACCESS_KEY: 'b', AUDIT_BUCKET_PREFIX: 'eq' }).config!;
  assert.deepEqual([c.lockMode, c.retainDays, c.prefix, c.region, c.url.pathname], ['COMPLIANCE', 2555, 'eq/', 'us-east-1', '/audit']);
  assert.equal(objectKey('eq/', 12), 'eq/0000000012.json');
  assert.deepEqual([retryDelayMs(0), retryDelayMs(1), retryDelayMs(2), retryDelayMs(20)], [0, 5000, 10000, 600000]);
});

test('entries go up in order with object-lock headers; a failure is retried later and nothing is skipped', async () => {
  const got: Array<{ url: string; headers: Record<string, string | string[] | undefined>; body: string }> = [];
  let failNext = 0;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (failNext > 0) {
        failNext -= 1;
        res.writeHead(503).end('<Error><Code>SlowDown</Code></Error>');
        return;
      }
      got.push({ url: req.url!, headers: req.headers, body });
      res.writeHead(200).end();
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const port = (server.address() as { port: number }).port;
    const cfg = bucketConfigFromEnv({ AUDIT_BUCKET_URL: `http://127.0.0.1:${port}/audit`, AUDIT_BUCKET_ACCESS_KEY_ID: 'AKIDTEST', AUDIT_BUCKET_SECRET_ACCESS_KEY: 'secret-for-tests', AUDIT_BUCKET_RETAIN_DAYS: '30' }).config!;
    const files = tmpFiles();
    for (let i = 0; i < 3; i++) appendAudit(files, { kind: 'data', summary: `step ${i}` });
    const lines = () => fs.readFileSync(files.log, 'utf8').split('\n');
    const stateFile = path.join(path.dirname(files.log), 'bucket-state.json');
    let clock = new Date('2026-11-13T20:00:00Z');
    const now = () => clock;

    failNext = 1;
    let st = await shipAudit(cfg, lines(), stateFile, now);
    assert.equal(st.shippedSeq, 0);
    assert.match(st.lastError!, /entry 1 did not go up: HTTP 503/);
    // Within the wait nothing is tried.
    st = await shipAudit(cfg, lines(), stateFile, now);
    assert.equal(got.length, 0);
    clock = new Date(clock.getTime() + 6000);
    st = await shipAudit(cfg, lines(), stateFile, now);
    assert.equal(st.shippedSeq, 3);
    assert.equal(st.lastError, undefined);
    assert.deepEqual(got.map((g) => g.url), ['/audit/econquest-audit/0000000001.json', '/audit/econquest-audit/0000000002.json', '/audit/econquest-audit/0000000003.json']);
    const first = got[0]!;
    assert.equal(first.body, lines()[0]);
    assert.equal(first.headers['x-amz-object-lock-mode'], 'COMPLIANCE');
    assert.equal(first.headers['x-amz-object-lock-retain-until-date'], '2026-12-13T20:00:06Z');
    assert.equal(first.headers['content-md5'], createHash('md5').update(first.body).digest('base64'));
    assert.match(String(first.headers.authorization), /^AWS4-HMAC-SHA256 Credential=AKIDTEST\/20261113\/us-east-1\/s3\/aws4_request, SignedHeaders=content-md5;content-type;host;x-amz-content-sha256;x-amz-date;x-amz-object-lock-mode;x-amz-object-lock-retain-until-date, Signature=[0-9a-f]{64}$/);
    // A new entry goes up next time; what went up before is not sent again.
    appendAudit(files, { kind: 'data', summary: 'step 3' });
    st = await shipAudit(cfg, lines(), stateFile, now);
    assert.equal(st.shippedSeq, 4);
    assert.equal(got.length, 4);
    assert.equal(readBucketState(stateFile).shippedSeq, 4);
    assert.ok(!fs.readFileSync(stateFile, 'utf8').includes('secret-for-tests'));
  } finally {
    server.close();
  }
});
