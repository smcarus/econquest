/**
 * Sign-in against the real server.ts (feeds replaced by fixtures, nothing leaves this machine):
 * AUTH=on with no accounts, so the server starts in set-up mode and prints a one-time code.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4400 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let dataDir: string;
let log = '';

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-auth-test-'));
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${path.join(root, 'tests/helpers/offline-fetch.mjs')}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      AUTH: 'on',
      GEMINI_API_KEY: '',
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

const post = (p: string, body: unknown, cookie = '') =>
  fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
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
