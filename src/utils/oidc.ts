/**
 * Sign-in through an OpenID Connect provider (Google, Microsoft Entra ID, Okta, Keycloak, Authentik
 * and others) for a server with several people on it. Optional: off unless OIDC_ISSUER and
 * OIDC_CLIENT_ID are set. Local accounts keep working beside it.
 *
 * The flow is the authorization code flow with PKCE (RFC 7636), a state value tied to the browser
 * by a short-lived cookie, and a nonce checked in the ID token. The ID token's signature is checked
 * against the provider's published keys (JWKS: RS256, PS256, ES256 and the larger sizes; never
 * "none" or a shared-secret algorithm), then its issuer, audience, expiry and nonce.
 *
 * Who may sign in is decided here, not by the provider: only a verified email listed in
 * OIDC_ALLOWED_EMAILS (whole addresses, or "@example.org" for a domain), or one already linked to an
 * account. A new person gets OIDC_DEFAULT_ROLE (viewer unless set); OIDC_ADMIN_EMAILS get admin.
 *
 * Server-only (node:crypto). Pure apart from the fetch it is handed.
 */
import { createHash, createPublicKey, randomBytes, verify as cryptoVerify, type JsonWebKey } from 'crypto';
import type { Role } from './auth';

export const OIDC_COOKIE = 'eq_oidc';
/** How long a sign-in that was started may take to come back. */
export const OIDC_PENDING_MS = 10 * 60_000;
const SKEW_S = 120;

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  /** Fixed callback address; else worked out from the request (the host is checked by ALLOWED_HOSTS). */
  redirectUri?: string;
  scopes: string;
  /** Shown on the button: "Sign in with <name>". */
  name: string;
  allowed: string[];
  admins: string[];
  defaultRole: Role;
}

const list = (v: string | undefined) =>
  String(v || '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** The setting from the environment, a problem to log, or null when OIDC is not set up. */
export function oidcConfigFromEnv(env: Record<string, string | undefined>): { config: OidcConfig | null; problem?: string } {
  const issuer = String(env.OIDC_ISSUER || '').trim().replace(/\/+$/, '');
  const clientId = String(env.OIDC_CLIENT_ID || '').trim();
  if (!issuer && !clientId) return { config: null };
  if (!issuer || !clientId) return { config: null, problem: 'OIDC sign-in needs both OIDC_ISSUER and OIDC_CLIENT_ID; it is off.' };
  let u: URL;
  try {
    u = new URL(issuer);
  } catch {
    return { config: null, problem: `OIDC_ISSUER is not an address ("${issuer.slice(0, 80)}"); OIDC sign-in is off.` };
  }
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/i.test(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return { config: null, problem: 'OIDC_ISSUER must be an https:// address (http:// only for a provider on this computer); OIDC sign-in is off.' };
  const redirectUri = String(env.OIDC_REDIRECT_URI || '').trim() || undefined;
  const role = String(env.OIDC_DEFAULT_ROLE || 'viewer').trim().toLowerCase();
  if (!['viewer', 'analyst', 'admin'].includes(role)) return { config: null, problem: 'OIDC_DEFAULT_ROLE must be viewer, analyst or admin; OIDC sign-in is off.' };
  const allowed = list(env.OIDC_ALLOWED_EMAILS);
  const admins = list(env.OIDC_ADMIN_EMAILS);
  return {
    config: {
      issuer,
      clientId,
      clientSecret: String(env.OIDC_CLIENT_SECRET || '').trim() || undefined,
      redirectUri,
      scopes: String(env.OIDC_SCOPES || '').trim() || 'openid email profile',
      name: String(env.OIDC_NAME || '').trim().slice(0, 40) || 'single sign-on',
      allowed,
      admins,
      defaultRole: role as Role,
    },
    ...(!allowed.length && !admins.length ? { problem: 'OIDC sign-in is on, but OIDC_ALLOWED_EMAILS is empty: only people already linked to an account can sign in with it.' } : {}),
  };
}

export interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

export function discoveryProblem(d: unknown, issuer: string): string | null {
  const x = d as Partial<Discovery> | null;
  if (!x || typeof x !== 'object') return 'the discovery document is not JSON';
  if (String(x.issuer || '').replace(/\/+$/, '') !== issuer) return `the discovery document names a different issuer (${String(x.issuer).slice(0, 80)})`;
  for (const k of ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const) if (typeof x[k] !== 'string' || !/^https?:\/\//.test(x[k]!)) return `the discovery document has no ${k}`;
  return null;
}

const b64url = (b: Buffer) => b.toString('base64url');

export interface PendingSignIn {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  createdAt: number;
}

/** A new sign-in: the values to keep until the provider sends the person back. */
export function newPending(redirectUri: string, now = Date.now()): PendingSignIn {
  return { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), redirectUri, createdAt: now };
}

export function codeChallenge(verifier: string): string {
  return b64url(createHash('sha256').update(verifier).digest());
}

export function authorizationUrl(d: Discovery, c: OidcConfig, p: PendingSignIn): string {
  const u = new URL(d.authorization_endpoint);
  const q = { response_type: 'code', client_id: c.clientId, redirect_uri: p.redirectUri, scope: c.scopes, state: p.state, nonce: p.nonce, code_challenge: codeChallenge(p.verifier), code_challenge_method: 'S256' };
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
}

/** The token request: client_secret_basic with a secret, a public client (PKCE only) without. */
export function tokenRequest(c: OidcConfig, p: PendingSignIn, code: string): { headers: Record<string, string>; body: string } {
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: p.redirectUri, code_verifier: p.verifier });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (c.clientSecret) headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(c.clientId)}:${encodeURIComponent(c.clientSecret)}`).toString('base64')}`;
  else form.set('client_id', c.clientId);
  return { headers, body: form.toString() };
}

export interface IdClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nonce?: string;
  azp?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  preferred_username?: string;
}

const ALGS: Record<string, { hash: string; kty: string; pss?: boolean; ec?: boolean }> = {
  RS256: { hash: 'sha256', kty: 'RSA' },
  RS384: { hash: 'sha384', kty: 'RSA' },
  RS512: { hash: 'sha512', kty: 'RSA' },
  PS256: { hash: 'sha256', kty: 'RSA', pss: true },
  PS384: { hash: 'sha384', kty: 'RSA', pss: true },
  PS512: { hash: 'sha512', kty: 'RSA', pss: true },
  ES256: { hash: 'sha256', kty: 'EC', ec: true },
  ES384: { hash: 'sha384', kty: 'EC', ec: true },
  ES512: { hash: 'sha512', kty: 'EC', ec: true },
};

export type JwkSet = { keys: Array<JsonWebKey & { kid?: string; use?: string; alg?: string }> };

/** The key id and algorithm of a token, before anything is trusted. */
export function tokenHeader(jwt: string): { kid?: string; alg: string } | null {
  try {
    const h = JSON.parse(Buffer.from(String(jwt).split('.')[0] || '', 'base64url').toString('utf8'));
    return h && typeof h.alg === 'string' ? { alg: h.alg, ...(typeof h.kid === 'string' ? { kid: h.kid } : {}) } : null;
  } catch {
    return null;
  }
}

/**
 * Checks an ID token: signature against the provider's keys, then issuer, audience, authorised
 * party, expiry, issue time and nonce. Returns the claims or the reason it was refused.
 */
export function verifyIdToken(jwt: string, jwks: JwkSet, c: OidcConfig, nonce: string, now = Date.now()): { claims: IdClaims } | { problem: string } {
  const parts = String(jwt || '').split('.');
  if (parts.length !== 3) return { problem: 'the ID token is not a signed token' };
  const head = tokenHeader(jwt);
  const alg = head && ALGS[head.alg];
  if (!head || !alg) return { problem: `the ID token uses an algorithm the app does not accept (${head?.alg ?? 'none'})` };
  const candidates = jwks.keys.filter((k) => k.kty === alg.kty && (!k.use || k.use === 'sig') && (!k.alg || k.alg === head.alg) && (!head.kid || k.kid === head.kid));
  if (!candidates.length) return { problem: 'no published key of the provider matches the ID token' };
  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = Buffer.from(parts[2]!, 'base64url');
  const ok = candidates.some((jwk) => {
    try {
      const key = createPublicKey({ key: jwk, format: 'jwk' });
      return cryptoVerify(alg.hash, data, alg.ec ? { key, dsaEncoding: 'ieee-p1363' } : alg.pss ? { key, padding: 6, saltLength: -1 } : key, sig);
    } catch {
      return false;
    }
  });
  if (!ok) return { problem: 'the ID token signature does not match the provider\'s keys' };
  let claims: IdClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
  } catch {
    return { problem: 'the ID token body is not JSON' };
  }
  const t = Math.floor(now / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (String(claims.iss || '').replace(/\/+$/, '') !== c.issuer) return { problem: 'the ID token comes from a different issuer' };
  if (!aud.includes(c.clientId)) return { problem: 'the ID token was made for a different client' };
  if (aud.length > 1 && claims.azp && claims.azp !== c.clientId) return { problem: 'the ID token was made for a different client (azp)' };
  if (typeof claims.exp !== 'number' || claims.exp + SKEW_S < t) return { problem: 'the ID token has expired' };
  if (typeof claims.iat === 'number' && claims.iat - SKEW_S > t) return { problem: 'the ID token is dated in the future' };
  if (!claims.nonce || claims.nonce !== nonce) return { problem: 'the ID token nonce does not match this sign-in' };
  if (typeof claims.sub !== 'string' || !claims.sub) return { problem: 'the ID token names no subject' };
  return { claims };
}

/** The verified email in the claims, lower case, or null. */
export function verifiedEmail(claims: IdClaims): string | null {
  const v = claims.email_verified;
  if (!claims.email || !(v === true || v === 'true')) return null;
  return String(claims.email).trim().toLowerCase();
}

/** Whether an email is on a list of addresses and "@domain" entries. */
export function emailListed(email: string | null, entries: string[]): boolean {
  if (!email) return false;
  const domain = email.slice(email.lastIndexOf('@'));
  return entries.some((e) => (e.startsWith('@') ? e === domain : e === email));
}

/**
 * What to do with a verified sign-in: use the linked account, create one (listed email), or refuse.
 * `linked` is the account already tied to this issuer and subject, if any.
 */
export function oidcDecision(
  claims: IdClaims,
  c: OidcConfig,
  linked: { id: string; disabled?: boolean } | undefined
): { use: string } | { create: { role: Role; email: string } } | { refuse: string } {
  if (linked) return linked.disabled ? { refuse: 'disabled' } : { use: linked.id };
  const email = verifiedEmail(claims);
  if (!email) return { refuse: 'no_email' };
  if (emailListed(email, c.admins)) return { create: { role: 'admin', email } };
  if (emailListed(email, c.allowed)) return { create: { role: c.defaultRole, email } };
  return { refuse: 'not_allowed' };
}

/** A username for a new account from the email, made unique against those taken. */
export function usernameFromEmail(email: string, taken: (u: string) => boolean): string {
  const base =
    email
      .split('@')[0]!
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '')
      .replace(/^[._-]+/, '')
      .slice(0, 28) || 'user';
  let name = base.length >= 3 ? base : `${base}-user`;
  for (let i = 2; taken(name); i++) name = `${base.slice(0, 26)}-${i}`;
  return name;
}

/** Error codes the sign-in page explains (in four languages); anything else reads as "failed". */
export const OIDC_ERRORS = ['not_allowed', 'no_email', 'disabled', 'expired', 'failed'] as const;
export type OidcError = (typeof OIDC_ERRORS)[number];

/** The short-lived cookie that ties a sign-in's state to the browser that started it. */
export function oidcCookie(state: string, opts: { secure: boolean; maxAgeMs: number }): string {
  return [`${OIDC_COOKIE}=${encodeURIComponent(state)}`, 'Path=/api/auth/oidc', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(opts.maxAgeMs / 1000)}`, ...(opts.secure ? ['Secure'] : [])].join('; ');
}
