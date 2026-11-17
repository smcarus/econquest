/**
 * The server's side of OIDC sign-in (src/utils/oidc.ts): the provider's discovery document and
 * published keys, cached for an hour (the keys fetched again once when a token names a key not
 * seen yet, so a key rotation needs no restart), and the sign-ins started but not yet back, kept
 * in memory for 10 minutes and used once.
 */
import { discoveryProblem, OIDC_PENDING_MS, verifyIdToken, tokenHeader, type Discovery, type JwkSet, type OidcConfig, type PendingSignIn } from '../utils/oidc';

const CACHE_MS = 60 * 60_000;
type FetchFn = typeof fetch;

export class OidcClient {
  private disc: { at: number; value: Discovery } | null = null;
  private keys: { at: number; value: JwkSet } | null = null;
  private pending = new Map<string, PendingSignIn>();

  constructor(
    readonly config: OidcConfig | null,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  private async getJson(url: string): Promise<unknown> {
    const r = await this.fetchFn(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`${new URL(url).host} answered HTTP ${r.status}`);
    return r.json();
  }

  async discovery(now = Date.now()): Promise<Discovery> {
    if (!this.config) throw new Error('OIDC is not set up');
    if (this.disc && now - this.disc.at < CACHE_MS) return this.disc.value;
    const d = await this.getJson(`${this.config.issuer}/.well-known/openid-configuration`);
    const problem = discoveryProblem(d, this.config.issuer);
    if (problem) throw new Error(problem);
    this.disc = { at: now, value: d as Discovery };
    return this.disc.value;
  }

  private async jwks(force: boolean, now: number): Promise<JwkSet> {
    if (!force && this.keys && now - this.keys.at < CACHE_MS) return this.keys.value;
    const d = await this.discovery(now);
    const k = (await this.getJson(d.jwks_uri)) as JwkSet;
    if (!k || !Array.isArray(k.keys)) throw new Error('the provider\'s key set is not a JWKS');
    this.keys = { at: now, value: k };
    return k;
  }

  async verify(idToken: string, nonce: string, now = Date.now()) {
    if (!this.config) return { problem: 'OIDC is not set up' } as const;
    let keys = await this.jwks(false, now);
    const kid = tokenHeader(idToken)?.kid;
    if (kid && !keys.keys.some((k) => k.kid === kid)) keys = await this.jwks(true, now);
    return verifyIdToken(idToken, keys, this.config, nonce, now);
  }

  remember(p: PendingSignIn): void {
    const now = Date.now();
    for (const [k, v] of this.pending) if (now - v.createdAt > OIDC_PENDING_MS) this.pending.delete(k);
    if (this.pending.size > 1000) this.pending.delete(this.pending.keys().next().value!);
    this.pending.set(p.state, p);
  }

  /** The sign-in this state belongs to, once, if it is not older than 10 minutes. */
  take(state: string, now = Date.now()): PendingSignIn | null {
    const p = state ? this.pending.get(state) : undefined;
    if (!p) return null;
    this.pending.delete(state);
    return now - p.createdAt > OIDC_PENDING_MS ? null : p;
  }
}
