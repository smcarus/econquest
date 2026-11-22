/**
 * GARCH(1,1) volatility (Bollerslev 1986): today's variance is a long-run level plus a share of
 * yesterday's surprise squared plus a share of yesterday's variance,
 *
 *   r_t = mu + e_t,  e_t = sigma_t z_t,  z_t ~ N(0, 1)
 *   sigma2_t = omega + alpha e_{t-1}^2 + beta sigma2_{t-1},  omega > 0, alpha, beta >= 0, alpha + beta < 1
 *
 * so a burst of large moves raises the forecast for the next days, and the forecast drifts back to
 * the long-run variance omega / (1 - alpha - beta) at the rate alpha + beta.
 *
 * Fitted by Gaussian (quasi-) maximum likelihood with the variance started at the same backcast the
 * Python arch package uses (exponentially weighted mean of the first 75 squared residuals, weight
 * 0.94, taken once around the sample mean), so the two give the same estimates (checked in tests/garch.test.ts). Returns are expected
 * in percent (100 x log change). Pure, browser-safe; a series too short returns { error }.
 */
import { minimise } from './optimize';

export interface GarchFit {
  mu: number;
  omega: number;
  alpha: number;
  beta: number;
  /** alpha + beta: how slowly a shock fades (1 = never). */
  persistence: number;
  /** Long-run daily variance omega / (1 - alpha - beta). */
  longRunVar: number;
  logLik: number;
  n: number;
  /** Conditional variance for each observation, and for the day after the last one. */
  sigma2: number[];
  nextVar: number;
  /** Days for a shock's effect to halve: ln 0.5 / ln(alpha + beta). */
  halfLifeDays: number;
}

export const GARCH_MIN_OBS = 250;
const LOG2PI = Math.log(2 * Math.PI);

function backcast(e: number[]): number {
  const tau = Math.min(75, e.length);
  let w = 1;
  let sw = 0;
  let s = 0;
  for (let i = 0; i < tau; i++) {
    s += w * e[i] * e[i];
    sw += w;
    w *= 0.94;
  }
  return s / sw;
}

const logistic = (u: number) => 1 / (1 + Math.exp(-u));
const logit = (p: number) => Math.log(p / (1 - p));

/** Parameters from the unconstrained search space: omega = exp(u1); persistence = 0.99999 logistic(u2); alpha = persistence x logistic(u3). */
function unpack(u: number[]): { mu: number; omega: number; alpha: number; beta: number } {
  const omega = Math.exp(u[1]);
  const p = 0.99999 * logistic(u[2]);
  const alpha = p * logistic(u[3]);
  return { mu: u[0], omega, alpha, beta: p - alpha };
}

function negLogLik(r: number[], bc: number, mu: number, omega: number, alpha: number, beta: number, out?: number[]): number {
  const e = r.map((x) => x - mu);
  let s2 = omega + (alpha + beta) * bc;
  let ll = 0;
  for (let t = 0; t < e.length; t++) {
    if (t > 0) s2 = omega + alpha * e[t - 1] * e[t - 1] + beta * s2;
    if (!(s2 > 0)) return Infinity;
    if (out) out.push(s2);
    ll += LOG2PI + Math.log(s2) + (e[t] * e[t]) / s2;
  }
  return 0.5 * ll;
}

export function fitGarch(returns: number[]): GarchFit | { error: string } {
  const r = returns.filter((x) => Number.isFinite(x));
  if (r.length !== returns.length) return { error: 'The returns have a gap or a non-number; GARCH needs an unbroken run.' };
  if (r.length < GARCH_MIN_OBS) return { error: `Only ${r.length} returns; GARCH(1,1) needs at least ${GARCH_MIN_OBS}.` };
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length;
  if (!(v > 1e-12 * (1 + m * m))) return { error: 'The returns do not vary, so there is no volatility to model.' };
  // The backcast is taken once, from the residuals around the sample mean, as arch does.
  const bc = backcast(r.map((x) => x - m));
  const obj = (u: number[]) => {
    const p = unpack(u);
    return negLogLik(r, bc, p.mu, p.omega, p.alpha, p.beta);
  };
  // Starting points as in arch: a few (alpha, beta) pairs, the best one kept.
  let best: { u: number[]; f: number } | null = null;
  for (const [a, b] of [
    [0.05, 0.9],
    [0.1, 0.8],
    [0.03, 0.95],
  ]) {
    const u0 = [m, Math.log(v * (1 - a - b)), logit((a + b) / 0.99999), logit(a / (a + b))];
    const f = obj(u0);
    if (!best || f < best.f) best = { u: u0, f };
  }
  const res = minimise(obj, best!.u, 4, { step: 0.2, maxIter: 6000, tol: 1e-12 });
  const p = unpack(res.x);
  const sigma2: number[] = [];
  const nll = negLogLik(r, bc, p.mu, p.omega, p.alpha, p.beta, sigma2);
  const last = r.length - 1;
  const eLast = r[last] - p.mu;
  const nextVar = p.omega + p.alpha * eLast * eLast + p.beta * sigma2[last];
  const persistence = p.alpha + p.beta;
  return {
    ...p,
    persistence,
    longRunVar: p.omega / (1 - persistence),
    logLik: -nll,
    n: r.length,
    sigma2,
    nextVar,
    halfLifeDays: persistence > 0 && persistence < 1 ? Math.log(0.5) / Math.log(persistence) : Infinity,
  };
}

/** Expected variance for each of the next h days: long run + persistence^(k-1) x (next day's variance - long run). */
export function garchPath(fit: Pick<GarchFit, 'nextVar' | 'longRunVar' | 'persistence'>, h: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= h; k++) out.push(fit.longRunVar + fit.persistence ** (k - 1) * (fit.nextVar - fit.longRunVar));
  return out;
}

/** Expected total variance over the next h days (the sum of the path), and as a yearly volatility in % (252 days). */
export function garchHorizon(fit: Pick<GarchFit, 'nextVar' | 'longRunVar' | 'persistence'>, h: number): { variance: number; annualVolPct: number } {
  const variance = garchPath(fit, h).reduce((a, b) => a + b, 0);
  return { variance, annualVolPct: Math.sqrt((variance / h) * 252) };
}
