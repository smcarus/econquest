/**
 * OIDC sign-in (src/utils/oidc.ts): the setting, the authorization address with PKCE, ID token
 * checks (signature with RSA, RSA-PSS and EC keys; issuer, audience, expiry, nonce; no "none" or
 * shared-secret algorithms) and who may sign in. Keys are made fresh for each run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto';
import {
  authorizationUrl,
  codeChallenge,
  discoveryProblem,
  emailListed,
  newPending,
  oidcConfigFromEnv,
  oidcDecision,
  tokenRequest,
  usernameFromEmail,
  verifyIdToken,
  type IdClaims,
  type JwkSet,
} from '../src/utils/oidc';

const ISS = 'https://login.example.org';
const cfg = oidcConfigFromEnv({ OIDC_ISSUER: `${ISS}/`, OIDC_CLIENT_ID: 'econquest', OIDC_ALLOWED_EMAILS: 'ana@example.org, @team.example.org', OIDC_ADMIN_EMAILS: 'boss@example.org', OIDC_NAME: 'Example' }).config!;
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwks: JwkSet = {
  keys: [
    { ...(rsa.publicKey.export({ format: 'jwk' }) as object), kid: 'r1', use: 'sig' },
    { ...(ec.publicKey.export({ format: 'jwk' }) as object), kid: 'e1', use: 'sig', alg: 'ES256' },
  ],
};
const now = Date.parse('2026-11-13T21:00:00Z');
const t = Math.floor(now / 1000);
const claims = (over: Partial<IdClaims> = {}): IdClaims => ({ iss: ISS, sub: 'person-1', aud: 'econquest', exp: t + 300, iat: t, nonce: 'n-1', email: 'ana@example.org', email_verified: true, name: 'Ana', ...over });

function jwt(body: object, alg: string, kid: string, key: KeyObject): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${enc({ alg, kid, typ: 'JWT' })}.${enc(body)}`;
  const hash = { RS256: 'sha256', PS256: 'sha256', ES256: 'sha256' }[alg]!;
  const sig =
    alg === 'ES256'
      ? cryptoSign(hash, Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' })
      : alg === 'PS256'
        ? cryptoSign(hash, Buffer.from(data), { key, padding: 6, saltLength: 32 })
        : cryptoSign(hash, Buffer.from(data), key);
  return `${data}.${sig.toString('base64url')}`;
}

test('setting: off without an issuer; https only; a trailing slash on the issuer is dropped', () => {
  assert.deepEqual(oidcConfigFromEnv({}), { config: null });
  assert.equal(cfg.issuer, ISS);
  assert.equal(cfg.defaultRole, 'viewer');
  assert.equal(cfg.scopes, 'openid email profile');
  assert.match(oidcConfigFromEnv({ OIDC_ISSUER: 'http://login.example.org', OIDC_CLIENT_ID: 'x' }).problem!, /https/);
  assert.ok(oidcConfigFromEnv({ OIDC_ISSUER: 'http://127.0.0.1:9000', OIDC_CLIENT_ID: 'x' }).config, 'a provider on this computer may use http');
  assert.match(oidcConfigFromEnv({ OIDC_ISSUER: ISS }).problem!, /OIDC_CLIENT_ID/);
  assert.match(oidcConfigFromEnv({ OIDC_ISSUER: ISS, OIDC_CLIENT_ID: 'x', OIDC_DEFAULT_ROLE: 'owner' }).problem!, /viewer, analyst or admin/);
  assert.match(oidcConfigFromEnv({ OIDC_ISSUER: ISS, OIDC_CLIENT_ID: 'x' }).problem!, /OIDC_ALLOWED_EMAILS is empty/);
});

test('authorization address: code flow, state, nonce and an S256 PKCE challenge', () => {
  const d = { issuer: ISS, authorization_endpoint: `${ISS}/authorize`, token_endpoint: `${ISS}/token`, jwks_uri: `${ISS}/jwks` };
  assert.equal(discoveryProblem(d, ISS), null);
  assert.match(discoveryProblem({ ...d, issuer: 'https://evil.example' }, ISS)!, /different issuer/);
  const p = newPending('https://eq.example.org/api/auth/oidc/callback', now);
  const u = new URL(authorizationUrl(d, cfg, p));
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('state'), p.state);
  assert.equal(u.searchParams.get('nonce'), p.nonce);
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.get('code_challenge'), createHash('sha256').update(p.verifier).digest('base64url'));
  assert.equal(codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', 'RFC 7636 appendix B');
  const pub = tokenRequest(cfg, p, 'abc');
  assert.equal(new URLSearchParams(pub.body).get('client_id'), 'econquest');
  assert.equal(new URLSearchParams(pub.body).get('code_verifier'), p.verifier);
  const conf = tokenRequest({ ...cfg, clientSecret: 's3cret' }, p, 'abc');
  assert.equal(conf.headers.Authorization, `Basic ${Buffer.from('econquest:s3cret').toString('base64')}`);
  assert.equal(new URLSearchParams(conf.body).get('client_id'), null);
});

test('ID token: RSA, RSA-PSS and EC signatures are checked, then the claims', () => {
  for (const [alg, kid, key] of [['RS256', 'r1', rsa.privateKey], ['PS256', 'r1', rsa.privateKey], ['ES256', 'e1', ec.privateKey]] as const) {
    const v = verifyIdToken(jwt(claims(), alg, kid, key), jwks, cfg, 'n-1', now);
    assert.ok('claims' in v, `${alg}: ${'problem' in v ? v.problem : ''}`);
  }
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const bad = (c: IdClaims, nonce = 'n-1', key = rsa.privateKey) => (verifyIdToken(jwt(c, 'RS256', 'r1', key), jwks, cfg, nonce, now) as { problem: string }).problem;
  assert.match(bad(claims(), 'n-1', other.privateKey), /signature/);
  assert.match(bad(claims({ iss: 'https://evil.example' })), /different issuer/);
  assert.match(bad(claims({ aud: 'someone-else' })), /different client/);
  assert.match(bad(claims({ aud: ['econquest', 'x'], azp: 'x' })), /azp/);
  assert.match(bad(claims({ exp: t - 600 })), /expired/);
  assert.match(bad(claims({ iat: t + 3600 })), /future/);
  assert.match(bad(claims(), 'another-nonce'), /nonce/);
  // No "none" and no shared-secret algorithm, whatever the token says.
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  assert.match((verifyIdToken(`${enc({ alg: 'none' })}.${enc(claims())}.`, jwks, cfg, 'n-1', now) as { problem: string }).problem, /algorithm/);
  assert.match((verifyIdToken(`${enc({ alg: 'HS256' })}.${enc(claims())}.x`, jwks, cfg, 'n-1', now) as { problem: string }).problem, /algorithm/);
  assert.match((verifyIdToken(jwt(claims(), 'RS256', 'unknown', rsa.privateKey), jwks, cfg, 'n-1', now) as { problem: string }).problem, /no published key/);
});

test('who may sign in: linked account, listed email or domain, admins; never an unverified email', () => {
  assert.ok(emailListed('x@team.example.org', cfg.allowed));
  assert.ok(!emailListed('x@evil-team.example.org', cfg.allowed));
  assert.deepEqual(oidcDecision(claims(), cfg, undefined), { create: { role: 'viewer', email: 'ana@example.org' } });
  assert.deepEqual(oidcDecision(claims({ email: 'Boss@Example.org' }), cfg, undefined), { create: { role: 'admin', email: 'boss@example.org' } });
  assert.deepEqual(oidcDecision(claims({ email: 'eve@other.org' }), cfg, undefined), { refuse: 'not_allowed' });
  assert.deepEqual(oidcDecision(claims({ email_verified: false }), cfg, undefined), { refuse: 'no_email' });
  assert.deepEqual(oidcDecision(claims({ email: 'eve@other.org' }), cfg, { id: 'a1' }), { use: 'a1' }, 'a linked account stays, even off the list');
  assert.deepEqual(oidcDecision(claims(), cfg, { id: 'a1', disabled: true }), { refuse: 'disabled' });
});

test('usernames from emails are valid and unique', () => {
  const taken = new Set(['ana', 'ana-2']);
  assert.equal(usernameFromEmail('Ana@example.org', (u) => taken.has(u)), 'ana-3');
  assert.equal(usernameFromEmail('j.o+x@example.org', () => false), 'j.ox');
  assert.equal(usernameFromEmail('+@example.org', () => false), 'user');
  assert.equal(usernameFromEmail('al@example.org', () => false), 'al-user');
});

