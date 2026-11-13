/**
 * Sign-in against the real server.ts (feeds replaced by fixtures, nothing leaves this machine):
 * AUTH=on with no accounts, so the server starts in set-up mode and prints a one-time code.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { emitEvents, eventFiles } from '../src/server/eventBus';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4400 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
/** A webhook receiver this test runs; the server may reach it and nothing else. */
const receiverPort = port + 400;
let server: ChildProcess;
let dataDir: string;
let log = '';

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-auth-test-'));
  // What the single user had saved before accounts: the first admin starts from it.
  mkdirSync(path.join(dataDir, 'local'), { recursive: true });
  writeFileSync(path.join(dataDir, 'local', 'workspace.json'), JSON.stringify({ version: 1, values: { 'econquest.holdings.v1': '[{"iso3":"BRA"}]' }, updatedAt: {} }));
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      SCHEDULE_BACKTESTS: 'off',
      AUTH: 'on',
      TRUST_PROXY: '1',
      ECONQUEST_SECRET_KEY: 'test-master-key-that-is-long-enough-1234',
      GEMINI_API_KEY: '',
      SMCR_INTEGRATION_API_KEY: 'smcr_data_api_test_key',
      OFFLINE_PASS: `http://127.0.0.1:${receiverPort}/`,
      EVENTS_POLL_MS: '300',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start within 60s:\n${log}`);
});

after(() => {
  server?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

/** The CSRF token for a session, as the page gets it from /api/auth/status. */
const csrfCache = new Map<string, string>();
async function csrfFor(cookie: string): Promise<string> {
  if (!csrfCache.has(cookie)) {
    const s = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: cookie } })).json();
    csrfCache.set(cookie, s.csrfToken || '');
  }
  return csrfCache.get(cookie)!;
}
const write = async (method: string, p: string, body: unknown, cookie = '', csrf = true) =>
  fetch(`${base}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(cookie && csrf ? { 'X-CSRF-Token': await csrfFor(cookie) } : {}),
    },
    body: JSON.stringify(body),
  });
const post = (p: string, body: unknown, cookie = '') => write('POST', p, body, cookie);
const cookieOf = (res: Response) => (res.headers.get('set-cookie') || '').split(';')[0];

let adminCookie = '';
const PASSWORD = 'a long and boring sentence';

test('with no accounts, nothing but the setup works, and setup needs the code from the log', async () => {
  const status = await (await fetch(`${base}/api/auth/status`)).json();
  assert.equal(status.mode, 'setup');
  assert.equal(status.setupNeedsCode, true);
  assert.equal((await fetch(`${base}/api/settings/keys`)).status, 401);
  assert.equal((await fetch(`${base}/api/audit`)).status, 401);
  assert.equal((await fetch(`${base}/healthz`)).status, 200);

  const code = log.match(/setup code: ([A-Z0-9-]+)/)?.[1];
  assert.ok(code, 'setup code printed in the server log');
  const wrong = await post('/api/auth/setup', { code: 'AAAA-BBBB-CCCC', username: 'sam', displayName: 'Sam', password: PASSWORD });
  assert.equal(wrong.status, 403);
  const weak = await post('/api/auth/setup', { code, username: 'sam', displayName: 'Sam', password: 'short' });
  assert.equal(weak.status, 400);
  const ok = await post('/api/auth/setup', { code, username: 'sam', displayName: 'Sam', password: PASSWORD });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie') || '', /HttpOnly; SameSite=Lax/);
  adminCookie = cookieOf(ok);
  const again = await post('/api/auth/setup', { code, username: 'eve', displayName: 'Eve', password: PASSWORD });
  assert.equal(again.status, 409, 'only one first account');
});

test('signed in, the API answers; signed out, it refuses', async () => {
  const me = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: adminCookie } })).json();
  assert.equal(me.mode, 'required');
  assert.equal(me.account.username, 'sam');
  assert.equal(me.account.role, 'admin');
  assert.equal(me.account.passwordHash, undefined);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: adminCookie } })).status, 200);
  assert.equal((await fetch(`${base}/api/audit`)).status, 401);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: 'eq_session=forged' } })).status, 401);
});

test('scripts: with the integration key switched on, the key opens the data addresses and nothing else (docs/DATA_API.md)', async () => {
  const KEY = 'smcr_data_api_test_key';
  const read = (p: string, headers: Record<string, string> = {}) => fetch(`${base}${p}`, { headers });
  // Switched off (the default): a key does not stand in for signing in.
  assert.equal((await read('/api/series/BRA', { 'X-SMCR-API-Key': KEY })).status, 401);
  const on = await post('/api/ai/runtime-config-save', { runtimeConfig: { integrationConfig: { requireApiKey: true } } }, adminCookie);
  assert.equal(on.status, 200);
  try {
    assert.equal((await read('/api/series/BRA')).status, 401, 'no key');
    assert.equal((await read('/api/series/BRA', { 'X-SMCR-API-Key': 'wrong' })).status, 401, 'wrong key');
    assert.equal((await read('/api/series/BRA', { 'X-SMCR-API-Key': KEY })).status, 200, 'header key');
    assert.equal((await read('/api/export/BRA/figures.csv', { Authorization: `Bearer ${KEY}` })).status, 200, 'bearer key');
    assert.equal((await read(`/api/series/BRA?apiKey=${KEY}`)).status, 401, 'never from the address');
    assert.equal((await read('/api/audit', { 'X-SMCR-API-Key': KEY })).status, 401, 'not other reads');
    assert.equal((await read('/api/settings/keys', { 'X-SMCR-API-Key': KEY })).status, 401, 'not keys');
    const change = await fetch(`${base}/api/research/episodes`, { method: 'POST', headers: { 'X-SMCR-API-Key': KEY, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(change.status, 401, 'not changes');
  } finally {
    await post('/api/ai/runtime-config-save', { runtimeConfig: { integrationConfig: { requireApiKey: false } } }, adminCookie);
  }
});

test('scoped API tokens: made by the admin, limited to their scopes, revocable, every use audited', async () => {
  const read = (p: string, headers: Record<string, string> = {}) => fetch(`${base}${p}`, { headers });
  const made = await post('/api/settings/api-tokens', { name: 'Portfolio console', scopes: ['read:data'] }, adminCookie);
  assert.equal(made.status, 200);
  const body = await made.json();
  const secret: string = body.secret;
  assert.match(secret, /^eqt_[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/);
  assert.equal(body.created.hash, undefined, 'the hash is never sent');
  assert.equal((await post('/api/settings/api-tokens', { name: 'x', scopes: ['read:everything'] }, adminCookie)).status, 400);
  assert.equal((await post('/api/settings/api-tokens', { name: 'Portfolio console', scopes: ['read:data'] }, adminCookie)).status, 400, 'names are unique');
  const bearer = { Authorization: `Bearer ${secret}` };
  // With sign-in required and the integration key off, the token alone opens what its scope allows.
  assert.equal((await read('/api/series/BRA', bearer)).status, 200);
  assert.equal((await read('/api/series/BR', { 'X-SMCR-API-Key': secret })).status, 200);
  assert.equal((await read('/api/series/MEX', { ...bearer, 'X-Correlation-Id': 'console-run-42' })).status, 200);
  const council = await read('/api/v1/integration/bundle/BRA', bearer);
  assert.equal(council.status, 403);
  assert.match((await council.json()).message, /needs the read:council scope/);
  assert.equal((await read('/api/audit', bearer)).status, 403, 'not other reads');
  assert.equal((await read('/api/settings/api-tokens', bearer)).status, 403, 'a token cannot make tokens');
  // Console addresses answer tokens only.
  const noToken = await read('/api/v1/holdings');
  assert.equal(noToken.status, 401);
  assert.equal((await noToken.json()).error, 'TOKEN_REQUIRED');
  assert.equal((await read('/api/v1/holdings', bearer)).status, 403, 'needs write:holdings');
  // The legacy integration key still opens the read scopes, not the write ones.
  assert.notEqual((await read('/api/v1/countries/BRA', { 'X-SMCR-API-Key': 'smcr_data_api_test_key' })).status, 401);
  assert.equal((await read('/api/v1/holdings', { 'X-SMCR-API-Key': 'smcr_data_api_test_key' })).status, 401);
  // Revoked: refused at once.
  const list = await (await fetch(`${base}/api/settings/api-tokens`, { headers: { Cookie: adminCookie } })).json();
  const id = list.tokens.find((t: { name: string }) => t.name === 'Portfolio console').id;
  assert.ok(list.tokens[0].lastUsedAt, 'last use recorded');
  assert.equal((await post(`/api/settings/api-tokens/${id}/revoke`, {}, adminCookie)).status, 200);
  assert.equal((await read('/api/series/BRA', bearer)).status, 401);
  await new Promise((r) => setTimeout(r, 200));
  const raw = readFileSync(path.join(dataDir, 'local', 'audit', 'audit-log.jsonl'), 'utf8');
  assert.ok(!raw.includes(secret) && !raw.includes(secret.slice(17)), 'the secret never reaches the audit log');
  const lines = raw.trim().split('\n').map((l) => JSON.parse(l));
  const uses = lines.filter((e) => e.kind === 'api');
  assert.ok(uses.some((e) => e.summary === 'API token "Portfolio console": GET /api/series/BRA (200)' && e.by?.username === 'token:Portfolio console'));
  assert.ok(uses.some((e) => /refused: GET \/api\/v1\/integration\/bundle\/BRA needs read:council/.test(e.summary)));
  assert.ok(uses.some((e) => e.summary.includes('GET /api/series/MEX (200)') && e.correlationId === 'console-run-42'), 'the token use carries the correlation ID');
  assert.ok(uses.some((e) => /^Made the API token "Portfolio console"/.test(e.summary)));
  assert.ok(uses.some((e) => /^Revoked the API token "Portfolio console"/.test(e.summary)));
  assert.ok(uses.some((e) => /^Refused an unknown or revoked API token/.test(e.summary)));
  const stored = readFileSync(path.join(dataDir, 'local', 'api-tokens.json'), 'utf8');
  assert.ok(!stored.includes(secret.slice(17)), 'only the hash is stored');
});

test('events: a read:events token adds a webhook, gets a signed delivery, and can catch up and stream', async () => {
  const made = await (await post('/api/settings/api-tokens', { name: 'Event console', scopes: ['read:events'] }, adminCookie)).json();
  const bearer = { Authorization: `Bearer ${made.secret}`, 'Content-Type': 'application/json' };
  const got: { headers: Record<string, string | string[] | undefined>; body: string }[] = [];
  const receiver = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      got.push({ headers: req.headers, body });
      res.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((r) => receiver.listen(receiverPort, '127.0.0.1', () => r()));
  try {
    const bad = await fetch(`${base}/api/v1/webhooks`, { method: 'POST', headers: bearer, body: JSON.stringify({ url: 'ftp://x' }) });
    assert.equal(bad.status, 400);
    const add = await fetch(`${base}/api/v1/webhooks`, { method: 'POST', headers: bearer, body: JSON.stringify({ url: `http://127.0.0.1:${receiverPort}/hook`, types: ['daily_download_ready'], countries: [], name: 'Console' }) });
    assert.equal(add.status, 201);
    const hook = await add.json();
    assert.match(hook.secret, /^whsec_/);
    assert.equal(hook.webhook.secret, undefined, 'the stored secret is never listed');
    const listed = await (await fetch(`${base}/api/v1/webhooks`, { headers: bearer })).json();
    assert.deepEqual(listed.webhooks.map((w: { id: string }) => w.id), [hook.webhook.id]);
    // The live stream, opened before the event, gets it too.
    const ctl = new AbortController();
    const stream = await fetch(`${base}/api/v1/events/stream?types=daily_download_ready`, { headers: bearer, signal: ctl.signal });
    assert.equal(stream.headers.get('content-type'), 'text/event-stream');
    const reader = stream.body!.getReader();
    // The daily download (a separate process) writes the event; the server picks it up.
    const run = { startedAt: '2026-11-13T06:00:00.000Z', finishedAt: '2026-11-13T06:20:00.000Z', steps: [{ id: 'imf', label: 'IMF', outcome: 'done' }] };
    emitEvents(eventFiles(dataDir), [{ type: 'daily_download_ready', entity: { kind: 'app', name: 'Daily download' }, as_of: '2026-11-13', source: 'EconQuest daily download', summary: 'Daily download finished; every step done.', data: run, discriminator: run.startedAt }]);
    // A second write of the same happening is dropped (idempotency key).
    emitEvents(eventFiles(dataDir), [{ type: 'daily_download_ready', entity: { kind: 'app', name: 'Daily download' }, as_of: '2026-11-13', source: 'EconQuest daily download', summary: 'again', discriminator: run.startedAt }]);
    let text = '';
    const deadline = Date.now() + 15_000;
    while ((!got.length || !text.includes('daily_download_ready')) && Date.now() < deadline) {
      const chunk = await Promise.race([reader.read(), new Promise<null>((r) => setTimeout(() => r(null), 500))]);
      if (chunk && 'value' in chunk && chunk.value) text += new TextDecoder().decode(chunk.value);
    }
    ctl.abort();
    assert.equal(got.length, 1, 'one delivery');
    const h = got[0]!.headers;
    const expected = `sha256=${createHmac('sha256', hook.secret).update(`${h['x-econquest-timestamp']}.${got[0]!.body}`).digest('hex')}`;
    assert.equal(h['x-econquest-signature-256'], expected, 'signed with the webhook secret');
    const e = JSON.parse(got[0]!.body);
    assert.equal(h['idempotency-key'], e.idempotency_key);
    assert.equal(e.type, 'daily_download_ready');
    for (const k of ['id', 'entity', 'severity', 'occurred_at', 'as_of', 'source', 'evidence_url', 'shareable', 'badge']) assert.ok(k in e, `envelope has ${k}`);
    assert.equal(e.shareable, true);
    assert.match(text, /event: daily_download_ready/);
    // Catch-up by id and the delivery log.
    const all = await (await fetch(`${base}/api/v1/events?types=daily_download_ready`, { headers: bearer })).json();
    assert.equal(all.events.length, 1);
    assert.equal((await (await fetch(`${base}/api/v1/events?after=${e.id}`, { headers: bearer })).json()).events.length, 0);
    assert.equal((await fetch(`${base}/api/v1/events?types=nonsense`, { headers: bearer })).status, 400);
    const log = await (await fetch(`${base}/api/v1/events/deliveries`, { headers: bearer })).json();
    assert.equal(log.deliveries[0].ok, true);
    assert.equal(log.deliveries[0].status, 200);
    // Another token cannot see or remove it; the owner can.
    assert.equal((await fetch(`${base}/api/v1/webhooks/${hook.webhook.id}`, { method: 'DELETE', headers: { 'X-SMCR-API-Key': 'smcr_data_api_test_key' } })).status, 404);
    assert.equal((await fetch(`${base}/api/v1/webhooks/${hook.webhook.id}`, { method: 'DELETE', headers: bearer })).status, 200);
    const stored = readFileSync(eventFiles(dataDir).webhooks, 'utf8');
    assert.ok(!stored.includes(hook.secret), 'the secret is encrypted on disk');
    await new Promise((r) => setTimeout(r, 300));
    const audit = readFileSync(path.join(dataDir, 'local', 'audit', 'audit-log.jsonl'), 'utf8');
    assert.ok(!audit.includes(hook.secret), 'the secret never reaches the audit log');
    assert.ok(audit.trim().split('\n').some((l) => JSON.parse(l).summary?.startsWith('Added the webhook "Console"')), 'adding is audited');
  } finally {
    receiver.close();
  }
});

test('wrong passwords are refused, then locked out; the right one signs in', async () => {
  const bad = await post('/api/auth/sign-in', { username: 'sam', password: 'not the password at all' });
  assert.equal(bad.status, 401);
  const good = await post('/api/auth/sign-in', { username: 'sam', password: PASSWORD });
  assert.equal(good.status, 200);
  const c = cookieOf(good);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: c } })).status, 200);
  const out = await post('/api/auth/sign-out', {}, c);
  assert.equal(out.status, 200);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: c } })).status, 401, 'signed-out session is dead');
  for (let i = 0; i < 5; i++) await post('/api/auth/sign-in', { username: 'nobody', password: 'wrong wrong wrong' });
  assert.equal((await post('/api/auth/sign-in', { username: 'nobody', password: 'wrong wrong wrong' })).status, 429);
});

test('changing the password signs out other sessions and is in the audit log without the password', async () => {
  const other = cookieOf(await post('/api/auth/sign-in', { username: 'sam', password: PASSWORD }));
  const res = await post('/api/auth/password', { current: PASSWORD, next: 'an even longer and more boring sentence' }, adminCookie);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).endedSessions, 1);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: other } })).status, 401);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: adminCookie } })).status, 200);
  const raw = readFileSync(path.join(dataDir, 'local', 'audit', 'audit-log.jsonl'), 'utf8');
  assert.match(raw, /Created the first admin account: Sam \(sam\)/);
  assert.match(raw, /Failed sign-in for \\"sam\\"/);
  assert.match(raw, /Changed own password: Sam \(sam\)/);
  assert.ok(!raw.includes('boring'), 'no password in the log');
  assert.ok(!raw.includes(adminCookie.split('=')[1]), 'no session token in the log');
});

const put = (p: string, body: unknown, cookie: string) => write('PUT', p, body, cookie);

test('roles: the admin adds accounts; viewers only read, analysts cannot touch keys, users or the audit log', async () => {
  const addA = await post('/api/users', { username: 'ana', displayName: 'Ana', role: 'analyst' }, adminCookie);
  assert.equal(addA.status, 200);
  const a = await addA.json();
  assert.match(a.password, /^[A-Za-z0-9]{20}$/, 'random password shown once');
  const addV = await (await post('/api/users', { username: 'vic', displayName: 'Vic', role: 'viewer' }, adminCookie)).json();
  const ana = cookieOf(await post('/api/auth/sign-in', { username: 'ana', password: a.password }));
  const vic = cookieOf(await post('/api/auth/sign-in', { username: 'vic', password: addV.password }));

  assert.equal((await fetch(`${base}/api/workspace`, { headers: { Cookie: vic } })).status, 200, 'viewer reads');
  const vw = await post('/api/research/docs', { title: 'x' }, vic);
  assert.equal(vw.status, 403);
  assert.match((await vw.json()).error, /Viewer/);
  assert.equal((await post('/api/users', { username: 'x1', displayName: 'X', role: 'admin' }, vic)).status, 403);

  assert.equal((await fetch(`${base}/api/settings/keys`, { headers: { Cookie: ana } })).status, 200, 'analyst sees masked keys');
  const keys = await (await fetch(`${base}/api/settings/keys`, { headers: { Cookie: ana } })).json();
  assert.equal(keys.canEdit, false);
  assert.equal((await put('/api/settings/keys/FRED_API_KEY', { value: 'abcdefabcdefabcdefabcdefabcdefab' }, ana)).status, 403);
  assert.equal((await fetch(`${base}/api/audit`, { headers: { Cookie: ana } })).status, 403);
  assert.equal((await fetch(`${base}/api/users`, { headers: { Cookie: ana } })).status, 403);
  assert.equal((await fetch(`${base}/api/backup/download`, { headers: { Cookie: ana } })).status, 403);
  assert.equal((await fetch(`${base}/api/settings/keys`, { headers: { Cookie: adminCookie } }).then((r) => r.json())).canEdit, true);

  // The last admin cannot be demoted or disabled; disabling signs the person out.
  const users = (await (await fetch(`${base}/api/users`, { headers: { Cookie: adminCookie } })).json()).accounts as Array<{ id: string; username: string }>;
  const samId = users.find((u) => u.username === 'sam')!.id;
  const vicId = users.find((u) => u.username === 'vic')!.id;
  assert.equal((await put(`/api/users/${samId}`, { role: 'analyst' }, adminCookie)).status, 409);
  assert.equal((await put(`/api/users/${vicId}`, { disabled: true }, adminCookie)).status, 200);
  assert.equal((await fetch(`${base}/api/workspace`, { headers: { Cookie: vic } })).status, 401);
  assert.equal((await post('/api/auth/sign-in', { username: 'vic', password: addV.password })).status, 401);

  const raw = readFileSync(path.join(dataDir, 'local', 'audit', 'audit-log.jsonl'), 'utf8');
  assert.match(raw, /Sam \(sam\) added the account Ana \(ana\) as analyst/);
  assert.match(raw, /changed the account vic: disabled/);
  assert.ok(!raw.includes(a.password) && !raw.includes(addV.password), 'new passwords never logged');
});

test('changes need the CSRF token of their own session; replies carry security headers', async () => {
  const c = cookieOf(await post('/api/auth/sign-in', { username: 'sam', password: 'an even longer and more boring sentence' }));
  const none = await write('PUT', '/api/watch-rules', { rules: [] }, c, false);
  assert.equal(none.status, 403);
  assert.equal((await none.json()).csrf, true);
  const wrong = await fetch(`${base}/api/watch-rules`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: c, 'X-CSRF-Token': await csrfFor(adminCookie) }, body: '{"rules":[]}' });
  assert.equal(wrong.status, 403, "another session's token does not work");
  assert.equal((await write('PUT', '/api/watch-rules', { rules: [] }, c)).status, 200);
  const res = await fetch(`${base}/api/auth/status`);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('audit entries name the account that acted, including generic route entries', async () => {
  const c = cookieOf(await post('/api/auth/sign-in', { username: 'sam', password: 'an even longer and more boring sentence' }));
  assert.equal((await write('PUT', '/api/watch-rules', { rules: [] }, c)).status, 200);
  await new Promise((r) => setTimeout(r, 200));
  const lines = readFileSync(path.join(dataDir, 'local', 'audit', 'audit-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const last = lines.filter((e) => e.summary === 'Changed the watch alerts').pop();
  assert.deepEqual(last.by && { username: last.by.username, name: last.by.name }, { username: 'sam', name: 'Sam' });
  const audit = await (await fetch(`${base}/api/audit`, { headers: { Cookie: c } })).json();
  assert.equal(audit.check.ok, true, 'chain still checks with names in it');
});

test('each account has its own workspace; the first admin kept the single user\'s', async () => {
  const sam = cookieOf(await post('/api/auth/sign-in', { username: 'sam', password: 'an even longer and more boring sentence' }));
  const ws = await (await fetch(`${base}/api/workspace`, { headers: { Cookie: sam } })).json();
  assert.equal(ws.values['econquest.holdings.v1'], '[{"iso3":"BRA"}]');
  assert.equal(ws.perAccount, true);
  const added = await (await post('/api/users', { username: 'wes', displayName: 'Wes', role: 'viewer' }, sam)).json();
  const wes = cookieOf(await post('/api/auth/sign-in', { username: 'wes', password: added.password }));
  assert.deepEqual((await (await fetch(`${base}/api/workspace`, { headers: { Cookie: wes } })).json()).values, {}, 'new account starts empty');
  assert.equal((await put('/api/workspace/sovereign_council_watchlists_v1', { value: '[{"id":"w","name":"Mine","items":[]}]' }, wes)).status, 200, 'viewer keeps own lists');
  assert.equal((await (await fetch(`${base}/api/workspace`, { headers: { Cookie: sam } })).json()).values.sovereign_council_watchlists_v1, undefined, "not in Sam's");
  const shared = JSON.parse(readFileSync(path.join(dataDir, 'local', 'workspace.json'), 'utf8'));
  assert.equal(shared.values.sovereign_council_watchlists_v1, undefined, 'shared file untouched');
});

test('a key saved in Settings is encrypted on disk with the master key from the environment', async () => {
  const sam = cookieOf(await post('/api/auth/sign-in', { username: 'sam', password: 'an even longer and more boring sentence' }));
  const res = await put('/api/settings/keys/FRED_API_KEY', { value: 'abcdefabcdefabcdefabcdefabcdefab' }, sam);
  assert.equal(res.status, 200);
  const raw = readFileSync(path.join(dataDir, 'local', 'settings.json'), 'utf8');
  assert.ok(!raw.includes('abcdefabcdef'), 'no plain key on disk');
  assert.match(raw, /enc:v1:/);
  const keys = await (await fetch(`${base}/api/settings/keys`, { headers: { Cookie: sam } })).json();
  assert.equal(keys.encryption.atRest, true);
  assert.equal(keys.encryption.keyFrom, 'ECONQUEST_SECRET_KEY');
  assert.ok(!JSON.stringify(keys).includes('test-master-key'), 'master key never sent');
  assert.equal(keys.keys.find((k: { id: string }) => k.id === 'FRED_API_KEY').source, 'app');
});

test('behind an HTTPS proxy (TRUST_PROXY=1) the cookie is Secure and HSTS is sent', async () => {
  const res = await fetch(`${base}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.9' },
    body: JSON.stringify({ username: 'sam', password: 'an even longer and more boring sentence' }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('set-cookie') || '', /; Secure/);
  assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000');
  const plain = await post('/api/auth/sign-in', { username: 'sam', password: 'an even longer and more boring sentence' });
  assert.ok(!(plain.headers.get('set-cookie') || '').includes('Secure'), 'plain HTTP keeps a cookie the browser will send');
  assert.equal(plain.headers.get('strict-transport-security'), null);
});
