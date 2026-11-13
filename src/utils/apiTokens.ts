/**
 * Scoped API tokens (console integration item 2). An outside system gets a named token that can do
 * only what it needs; it can be revoked at any time. The secret is shown once when the token is
 * made and only a SHA-256 hash of it is kept (the secret is 32 random bytes, so a plain hash is
 * enough: there is nothing to guess). Every use is written to the audit log by the server.
 *
 * Scopes:
 *   read:data         series, panels, tables, country snapshots
 *   read:council      the last council run per country (integration desks and bundle)
 *   read:events       the event stream, webhooks and indicator watches
 *   write:holdings    positions sent in by the outside system
 *   write:exclusions  the hidden-names list
 *   run:scenarios     scenarios on a portfolio sent in the request
 *
 * The integration key from .env (SMCR_INTEGRATION_API_KEY) keeps working as a legacy key, with the
 * three read scopes only, as it had before.
 *
 * Server only (node:crypto). The screens import src/utils/apiTokenScopes.ts.
 */
import { createHash, randomBytes } from 'crypto';
import { isDataApiRead } from '../server/dataApi';

export { SCOPES, SCOPE_LABEL, LEGACY_SCOPES, type Scope, type PublicTokenView } from './apiTokenScopes';
import { SCOPES, type Scope } from './apiTokenScopes';

export const TOKEN_PREFIX = 'eqt_';
export const TOKEN_NAME_MAX = 60;
export const MAX_TOKENS = 50;

export interface ApiToken {
  id: string;
  name: string;
  scopes: Scope[];
  /** SHA-256 of the secret, hex. The secret itself is never stored. */
  hash: string;
  /** First characters of the secret, to tell tokens apart in a list. */
  hint: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

/** A token as lists show it: never the hash. */
export type PublicToken = Omit<ApiToken, 'hash'> & { active: boolean };

export function publicToken(t: ApiToken): PublicToken {
  const { hash: _hash, ...rest } = t;
  return { ...rest, active: !t.revokedAt };
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** A new secret: eqt_<id>_<43 characters>, so the server finds the token by id before hashing. */
export function newSecret(id: string): string {
  return `${TOKEN_PREFIX}${id}_${randomBytes(32).toString('base64url')}`;
}

export function newTokenId(): string {
  return randomBytes(6).toString('hex');
}

/** The id inside a secret, or null when it does not look like a token. */
export function tokenIdFrom(secret: string): string | null {
  const m = /^eqt_([0-9a-f]{12})_[A-Za-z0-9_-]{43}$/.exec(secret);
  return m ? m[1]! : null;
}

export function isScope(v: unknown): v is Scope {
  return typeof v === 'string' && (SCOPES as readonly string[]).includes(v);
}

export function tokenNameProblem(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) return 'Give the token a name, for example the system that will use it.';
  if (name.trim().length > TOKEN_NAME_MAX) return `Keep the name under ${TOKEN_NAME_MAX} characters.`;
  return null;
}

export function scopesProblem(scopes: unknown): string | null {
  if (!Array.isArray(scopes) || scopes.length === 0) return 'Pick at least one thing the token may do.';
  const bad = scopes.filter((s) => !isScope(s));
  if (bad.length) return `Unknown scope: ${bad.map(String).join(', ')}. Scopes: ${SCOPES.join(', ')}.`;
  return null;
}

const SEG = '[A-Za-z0-9_.-]+';
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * The scope an address needs when it is called with a token, or null when no token may call it.
 * One table, so a new address is closed to tokens until it is listed here.
 */
export function scopeFor(method: string, pathname: string): Scope | null {
  const m = method.toUpperCase();
  const p = pathname.split('?')[0]!;
  const write = WRITE.has(m);
  if (!write && isDataApiRead(m, p)) return 'read:data';
  if (!write && new RegExp(`^/api/v1/countries(/${SEG})*$`).test(p)) return 'read:data';
  if (!write && new RegExp(`^/api/v1/integration/(desks|bundle)/${SEG}$`).test(p)) return 'read:council';
  if (!write && /^\/api\/v1\/integration\/stream$/.test(p)) return 'read:events';
  if (/^\/api\/v1\/(events|watches|webhooks)(\/|$)/.test(p)) return 'read:events';
  if (/^\/api\/v1\/holdings(\/|$)/.test(p)) return 'write:holdings';
  if (/^\/api\/v1\/exclusions(\/|$)/.test(p)) return 'write:exclusions';
  if (/^\/api\/v1\/scenarios(\/|$)/.test(p)) return 'run:scenarios';
  return null;
}

/** Addresses only a token may call (the console addresses); the app's own pages never use them. */
export function tokenOnly(pathname: string): boolean {
  const p = pathname.split('?')[0]!;
  return /^\/api\/v1\//.test(p) && !/^\/api\/v1\/integration\//.test(p);
}

/** The wording of a refusal, so a caller knows what to fix. */
export function scopeRefusal(name: string, needed: Scope | null): string {
  return needed
    ? `The token "${name}" may not do this: it needs the ${needed} scope. Make a token with that scope in Menu > Settings > API tokens.`
    : `Tokens cannot use this address.`;
}
