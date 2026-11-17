/**
 * OIDC sign-in against the real server.ts with a stand-in provider this test runs on this machine
 * (discovery, keys, token endpoint). The server may reach that provider and nothing else.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 5300 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const idpPort = port + 300;
const ISS = `http://127.0.0.1:${idpPort}`;
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });
/** code -> the ID token the stand-in provider hands back for it. */
const codes = new Map<string, string>();
const tokenBodies: string[] = [];
let server: ChildProcess;
let idp: Server;
let dataDir: string;
let log = '';

function idToken(claims: object, key = keys.privateKey): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${enc({ alg: 'RS256', kid: 'k1', typ: 'JWT' })}.${enc(claims)}`;
  return `${data}.${cryptoSign('sha256', Buffer.from(data), key).toString('base64url')}`;
}

before(async () => {
  idp = createServer((req, res) => {
    const json = (o: unknown, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(o));
    };
    if (req.url === '/.well-known/openid-configuration') return json({ issuer: ISS, authorization_endpoint: `${ISS}/authorize`, token_endpoint: `${ISS}/token`, jwks_uri: `${ISS}/jwks` });
    if (req.url === '/jwks') return json({ keys: [{ ...(keys.publicKey.export({ format: 'jwk' }) as object), kid: 'k1', use: 'sig', alg: 'RS256' }] });
    if (req.url === '/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        tokenBodies.push(body);
        const t = codes.get(new URLSearchParams(body).get('code') || '');
        return t ? json({ id_token: t, access_token: 'x', token_type: 'Bearer' }) : json({ error: 'invalid_grant' }, 400);
      });
      return;
    }
    json({ error: 'not found' }, 404);
  });
  await new Promise<void>((r) => idp.listen(idpPort, '127.0.0.1', r));
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-oidc-test-'));
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
      ECONQUEST_SECRET_KEY: 'test-master-key-that-is-long-enough-1234',
      GEMINI_API_KEY: '',
      OFFLINE_PASS: `${ISS}/`,
      OIDC_ISSUER: ISS,
      OIDC_CLIENT_ID: 'econquest-test',
      OIDC_NAME: 'Test Provider',
      OIDC_ADMIN_EMAILS: 'boss@example.org',
      OIDC_ALLOWED_EMAILS: '@team.example.org',
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
  idp?.close();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

const cookieOf = (r: Response, name: string) => r.headers.getSetCookie().map((c) => c.split(';')[0]!).find((c) => c.startsWith(`${name}=`)) || '';

/** Starts a sign-in, has the provider issue a token for these claims, and comes back. */
async function signIn(claims: (nonce: string) => object, opts: { key?: typeof keys.privateKey; badState?: boolean } = {}) {
  const start = await fetch(`${base}/api/auth/oidc/start`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const to = new URL(start.headers.get('location')!);
  assert.equal(to.origin + to.pathname, `${ISS}/authorize`);
  const state = to.searchParams.get('state')!;
  const code = `code-${Math.random()}`;
  codes.set(code, idToken({ iss: ISS, aud: 'econquest-test', exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), ...claims(to.searchParams.get('nonce')!) }, opts.key));
  const back = await fetch(`${base}/api/auth/oidc/callback?code=${encodeURIComponent(code)}&state=${opts.badState ? 'forged' : state}`, { redirect: 'manual', headers: { Cookie: cookieOf(start, 'eq_oidc') } });
  return { back, location: back.headers.get('location') || '', session: cookieOf(back, 'eq_session'), redirectUri: to.searchParams.get('redirect_uri') };
}

test('the sign-in page is told the provider name, never its settings', async () => {
  const s = await (await fetch(`${base}/api/auth/status`)).json();
  assert.equal(s.mode, 'setup');
  assert.deepEqual(s.oidc, { name: 'Test Provider' });
});

test('an admin email listed for OIDC becomes the first admin; PKCE is sent', async () => {
  const r = await signIn((nonce) => ({ sub: 'boss-1', nonce, email: 'boss@example.org', email_verified: true, name: 'The Boss' }));
  assert.equal(r.location, '/');
  assert.equal(r.redirectUri, `${base}/api/auth/oidc/callback`);
  assert.ok(r.session);
  assert.match(tokenBodies.at(-1)!, /code_verifier=/);
  const s = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: r.session } })).json();
  assert.equal(s.mode, 'required');
  assert.equal(s.account.provider, 'oidc');
  assert.equal(s.account.role, 'admin');
  assert.equal(s.account.email, 'boss@example.org');
  // The same person again: the same account.
  const again = await signIn((nonce) => ({ sub: 'boss-1', nonce, email: 'boss@example.org', email_verified: true }));
  const s2 = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: again.session } })).json();
  assert.equal(s2.account.id, s.account.id);
  // No password: a password change is refused.
  const pw = await fetch(`${base}/api/auth/password`, { method: 'POST', headers: { Cookie: r.session, 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken }, body: JSON.stringify({ current: '', next: 'a-long-new-password-123' }) });
  assert.equal(pw.status, 400);
});

test('a domain on the list gets the default role; anyone else is refused and logged', async () => {
  const ok = await signIn((nonce) => ({ sub: 'ana-1', nonce, email: 'ana@team.example.org', email_verified: true }));
  const s = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: ok.session } })).json();
  assert.equal(s.account.role, 'viewer');
  assert.equal(s.account.username, 'ana');
  const no = await signIn((nonce) => ({ sub: 'eve-1', nonce, email: 'eve@other.org', email_verified: true }));
  assert.equal(no.location, '/?signin_error=not_allowed');
  assert.equal(no.session, '');
  const unverified = await signIn((nonce) => ({ sub: 'eve-2', nonce, email: 'eve@team.example.org', email_verified: false }));
  assert.equal(unverified.location, '/?signin_error=no_email');
});

test('a forged state, a stranger\'s signature or a wrong nonce never signs anyone in', async () => {
  assert.equal((await signIn((nonce) => ({ sub: 'boss-1', nonce, email: 'boss@example.org', email_verified: true }), { badState: true })).location, '/?signin_error=expired');
  const forged = await signIn((nonce) => ({ sub: 'boss-1', nonce, email: 'boss@example.org', email_verified: true }), { key: stranger.privateKey });
  assert.equal(forged.location, '/?signin_error=failed');
  assert.equal(forged.session, '');
  const replay = await signIn(() => ({ sub: 'boss-1', nonce: 'not-this-sign-in', email: 'boss@example.org', email_verified: true }));
  assert.equal(replay.location, '/?signin_error=failed');
});

test('sign-ins through the provider are in the audit log', async () => {
  const r = await signIn((nonce) => ({ sub: 'boss-1', nonce, email: 'boss@example.org', email_verified: true }));
  const s = await (await fetch(`${base}/api/auth/status`, { headers: { Cookie: r.session } })).json();
  const audit = await (await fetch(`${base}/api/audit`, { headers: { Cookie: r.session, 'X-CSRF-Token': s.csrfToken } })).json();
  const text = JSON.stringify(audit.entries ?? audit);
  assert.match(text, /Created the admin account The Boss \(boss\) at its first sign-in through Test Provider/);
  assert.match(text, /Failed OIDC sign-in \(not_allowed\): eve@other.org/);
  assert.match(text, /Signed in through Test Provider/);
});
