/**
 * Bayesian and structural VARs (platform comparison gap CG8): for any number of series K on the
 * rows where all have a value.
 *
 *   Bayesian VAR   Minnesota prior (Litterman 1986; Doan, Litterman and Sims 1984). Each equation
 *                  is shrunk towards a random walk for series that wander (own first lag 1) or white
 *                  noise for series that do not (own first lag 0; chosen by the series' AR(1)
 *                  coefficient, 0.9 or more counts as wandering). Prior standard deviation of the
 *                  lag-l coefficient of series j in equation i: lambda1 / l^lambda3, times
 *                  lambda2 s_i / s_j when j != i, with s the AR(1) residual standard deviation.
 *                  lambda1 = 0.2, lambda2 = 0.5, lambda3 = 1 (the usual defaults, Canova 2007);
 *                  the constant has a flat prior. The error variance of each equation is fixed at
 *                  s_i^2, so the posterior of each equation is normal and has a closed form.
 *                  Response bands are the 5th and 95th percentiles over posterior draws.
 *   Structural VAR Two identifications of the same reduced-form VAR (OLS, lag by AIC):
 *                  - recursive (Cholesky) in an order the user states: a series earlier in the order
 *                    can move later ones in the same period, not the other way round;
 *                  - long-run (Blanchard and Quah 1989): the first series' shock is the only one
 *                    with a lasting effect on the first series' level. Meant for series in changes.
 *                  Each comes with the forecast-error variance decomposition. Bands by residual
 *                  bootstrap (recursive design), as the two-series VAR in the econometrics lab.
 *
 * Description, not a tested signal and not a forecast. Identification is an assumption the user
 * chooses; the reading names it. Browser-safe, pure, no data reads.
 */
import { invert, ols } from './stats';

type Failed = { error: string };

export interface IrfStep {
  h: number;
  value: number;
  lo: number;
  hi: number;
}

export interface VarCoefs {
  /** A[l][i][j]: effect of series j at lag l+1 on series i. */
  A: number[][][];
  c: number[];
  sigma: number[][];
  resid: number[][];
  T: number;
}

export const MINNESOTA = { lambda1: 0.2, lambda2: 0.5, lambda3: 1, wanderAr1: 0.9 } as const;
export const BVAR_DRAWS = 500;
export const SVAR_DRAWS = 300;

// ---------------------------------------------------------------------------------------------
// Linear algebra helpers

/** Lower Cholesky factor of a symmetric positive-definite matrix; null when it is not. */
export function cholesky(S: number[][]): number[][] | null {
  const K = S.length;
  const L = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++)
    for (let j = 0; j <= i; j++) {
      let s = S[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 1e-14)) return null;
        L[i][i] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
  return L;
}

const matMul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const transpose = (A: number[][]) => A[0].map((_, j) => A.map((r) => r[j]));
const eye = (K: number) => Array.from({ length: K }, (_, i) => Array.from({ length: K }, (_, j) => (i === j ? 1 : 0)));

/** Seeded uniform draws (Park-Miller), so bands are the same every time. */
function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Standard normal draws (Box-Muller) from a seeded uniform source. */
function normals(u: () => number): () => number {
  return () => Math.sqrt(-2 * Math.log(Math.max(1e-12, u()))) * Math.cos(2 * Math.PI * u());
}

const quantile = (v: number[], pr: number) => {
  const s = v.slice().sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(pr * (s.length - 1))))] : NaN;
};

// ---------------------------------------------------------------------------------------------
// Reduced form

function lagRows(data: number[][], p: number, start: number): { X: number[][]; Y: number[][] } {
  const X: number[][] = [];
  const Y: number[][] = [];
  for (let t = start; t < data.length; t++) {
    const row: number[] = [];
    for (let l = 1; l <= p; l++) row.push(...data[t - l]);
    X.push(row);
    Y.push(data[t]);
  }
  return { X, Y };
}

function unpack(coefs: number[][], K: number, p: number): { A: number[][][]; c: number[] } {
  const A = Array.from({ length: p }, () => Array.from({ length: K }, () => new Array(K).fill(0)));
  const c = coefs.map((b) => b[0]);
  coefs.forEach((b, i) => {
    for (let l = 0; l < p; l++) for (let j = 0; j < K; j++) A[l][i][j] = b[1 + l * K + j];
  });
  return { A, c };
}

function residCov(resid: number[][], dof: number): number[][] {
  const K = resid[0].length;
  return Array.from({ length: K }, (_, i) => Array.from({ length: K }, (_, j) => resid.reduce((s, e) => s + e[i] * e[j], 0) / dof));
}

/** OLS VAR: each equation on a constant and p lags of every series, rows t = start..n-1. */
export function olsVar(data: number[][], p: number, start = p): VarCoefs | null {
  const K = data[0].length;
  const { X, Y } = lagRows(data, p, start);
  const coefs: number[][] = [];
  const resid: number[][] = Y.map(() => []);
  for (let i = 0; i < K; i++) {
    const reg = ols(
      Y.map((r) => r[i]),
      X,
      K * p + 5
    );
    if ('error' in reg) return null;
    coefs.push(reg.coef);
    reg.residuals.forEach((e, t) => (resid[t][i] = e));
  }
  const { A, c } = unpack(coefs, K, p);
  const T = Y.length;
  return { A, c, resid, sigma: residCov(resid, Math.max(1, T - K * p - 1)), T };
}

/** Lag by AIC (Lütkepohl 2005) over 1..maxLag on one common sample. */
export function aicLag(data: number[][], maxLag: number): number | null {
  const K = data[0].length;
  let best: { aic: number; p: number } | null = null;
  for (let p = 1; p <= maxLag; p++) {
    const f = olsVar(data, p, maxLag);
    if (!f) continue;
    const ml = f.sigma.map((r) => r.map((v) => (v * (f.T - K * p - 1)) / f.T));
    const L = cholesky(ml);
    if (!L) continue;
    const logDet = 2 * L.reduce((s, r, i) => s + Math.log(r[i]), 0);
    const aic = logDet + (2 * p * K * K) / f.T;
    if (!best || aic < best.aic) best = { aic, p };
  }
  return best?.p ?? null;
}

/** Moving-average matrices Phi_0..Phi_H of the VAR (Phi_0 = I). */
export function maMatrices(A: number[][][], H: number): number[][][] {
  const K = A[0].length;
  const phi: number[][][] = [eye(K)];
  for (let h = 1; h <= H; h++) {
    const m = Array.from({ length: K }, () => new Array(K).fill(0));
    for (let l = 1; l <= Math.min(h, A.length); l++)
      for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) for (let k = 0; k < K; k++) m[i][j] += phi[h - l][i][k] * A[l - 1][k][j];
    phi.push(m);
  }
  return phi;
}

/** Impact matrix for a recursive identification in the stated order (indices into the series). */
export function recursiveImpact(sigma: number[][], order: number[]): number[][] | null {
  const S = order.map((i) => order.map((j) => sigma[i][j]));
  const L = cholesky(S);
  if (!L) return null;
  const K = sigma.length;
  const B = Array.from({ length: K }, () => new Array(K).fill(0));
  // Shock k (the k-th in the order) loads on series order[r] with L[r][k]; columns are indexed by series.
  order.forEach((row, r) => order.forEach((col, k) => (B[row][col] = L[r][k])));
  return B;
}

/**
 * Impact matrix for the long-run identification (Blanchard-Quah): C1 = (I - sum A_l)^-1, the
 * long-run effect matrix C1 B is lower triangular, so only the first shock moves the first
 * series' level for good. Null when the VAR has a unit root (I - sum A_l not invertible).
 */
export function longRunImpact(A: number[][][], sigma: number[][]): number[][] | null {
  const K = sigma.length;
  const M = eye(K).map((r, i) => r.map((v, j) => v - A.reduce((s, Al) => s + Al[i][j], 0)));
  const C1 = invert(M);
  if (!C1) return null;
  const LR = matMul(matMul(C1, sigma), transpose(C1));
  const L = cholesky(LR);
  if (!L) return null;
  return matMul(M, L);
}

/** Responses Phi_h B: [h][series][shock]. */
export function responses(A: number[][][], B: number[][], H: number): number[][][] {
  return maMatrices(A, H).map((F) => matMul(F, B));
}

/** Share of each shock in the forecast-error variance of each series at horizon h (1-based): [series][shock]. */
export function fevd(resp: number[][][], h: number): number[][] {
  const K = resp[0].length;
  return Array.from({ length: K }, (_, i) => {
    const parts = Array.from({ length: K }, (_, k) => resp.slice(0, h).reduce((s, m) => s + m[i][k] ** 2, 0));
    const tot = parts.reduce((s, v) => s + v, 0);
    return parts.map((v) => (tot > 0 ? v / tot : NaN));
  });
}

// ---------------------------------------------------------------------------------------------
// Bayesian VAR

function ar1(y: number[]): { rho: number; s: number } | null {
  const reg = ols(y.slice(1), y.slice(0, -1).map((v) => [v]), 10);
  if ('error' in reg) return null;
  const s = Math.sqrt(reg.residuals.reduce((a, e) => a + e * e, 0) / Math.max(1, reg.residuals.length - 2));
  return s > 0 ? { rho: reg.coef[1], s } : null;
}

export interface BvarPrior {
  /** Prior mean of each series' own first lag (1 = random walk, 0 = white noise). */
  ownMean: number[];
  /** AR(1) residual standard deviation of each series (the prior's scale). */
  scale: number[];
}

export interface BvarFit extends VarCoefs {
  p: number;
  prior: BvarPrior;
  /** Posterior mean and covariance of each equation's coefficients (constant first). */
  post: Array<{ mean: number[]; cov: number[][] }>;
}

export function bvarFit(data: number[][], p: number, hyper: Partial<typeof MINNESOTA> = {}): BvarFit | Failed {
  const h = { ...MINNESOTA, ...hyper };
  const K = data[0].length;
  const n = data.length;
  if (n < p + 20) return { error: `Only ${n} rows; the Bayesian VAR with ${p} lags needs at least ${p + 20}.` };
  const uni = Array.from({ length: K }, (_, j) => ar1(data.map((r) => r[j])));
  if (uni.some((u) => !u)) return { error: 'A series does not vary enough to scale the prior.' };
  const scale = uni.map((u) => u!.s);
  const ownMean = uni.map((u) => (u!.rho >= h.wanderAr1 ? 1 : 0));
  const { X, Y } = lagRows(data, p, p);
  const Xc = X.map((r) => [1, ...r]);
  const m = 1 + K * p;
  const post: BvarFit['post'] = [];
  const coefs: number[][] = [];
  for (let i = 0; i < K; i++) {
    const s2 = scale[i] ** 2;
    const b0 = new Array(m).fill(0);
    b0[1 + i] = ownMean[i];
    const vInv = new Array(m).fill(0);
    vInv[0] = 1 / (100 * scale[i]) ** 2;
    for (let l = 1; l <= p; l++)
      for (let j = 0; j < K; j++) {
        const sd = (h.lambda1 / l ** h.lambda3) * (j === i ? 1 : (h.lambda2 * scale[i]) / scale[j]);
        vInv[1 + (l - 1) * K + j] = 1 / sd ** 2;
      }
    const prec = Array.from({ length: m }, (_, a) => Array.from({ length: m }, (_, b) => Xc.reduce((s, r) => s + r[a] * r[b], 0) / s2 + (a === b ? vInv[a] : 0)));
    const cov = invert(prec);
    if (!cov) return { error: 'The Bayesian VAR could not be solved for this sample.' };
    const rhs = Array.from({ length: m }, (_, a) => Xc.reduce((s, r, t) => s + r[a] * Y[t][i], 0) / s2 + vInv[a] * b0[a]);
    const mean = cov.map((r) => r.reduce((s, v, b) => s + v * rhs[b], 0));
    post.push({ mean, cov });
    coefs.push(mean);
  }
  const { A, c } = unpack(coefs, K, p);
  const resid = Y.map((y, t) => y.map((v, i) => v - coefs[i].reduce((s, b, a) => s + b * Xc[t][a], 0)));
  return { A, c, resid, sigma: residCov(resid, Math.max(1, Y.length - m)), T: Y.length, p, prior: { ownMean, scale }, post };
}

export interface MultiIrf {
  /** steps[series][shock] over horizons 0..H. */
  steps: IrfStep[][][];
  /** FEVD at the last horizon: [series][shock]. */
  fevd: number[][];
  draws: number;
}

function bandsFrom(point: number[][][], drawsResp: number[][][][]): IrfStep[][][] {
  const K = point[0].length;
  return Array.from({ length: K }, (_, i) =>
    Array.from({ length: K }, (_, k) =>
      point.map((m, h) => {
        const v = drawsResp.map((d) => d[h][i][k]);
        return { h, value: m[i][k], lo: quantile(v, 0.05), hi: quantile(v, 0.95) };
      })
    )
  );
}

/** Recursive responses of the Bayesian VAR at the posterior mean, with bands over posterior draws. */
export function bvarResponses(fit: BvarFit, order: number[], H: number, draws = BVAR_DRAWS): MultiIrf | Failed {
  const B = recursiveImpact(fit.sigma, order);
  if (!B) return { error: 'The residual covariance is not positive definite.' };
  const point = responses(fit.A, B, H);
  const K = fit.sigma.length;
  const z = normals(rng(20261123));
  const chol = fit.post.map((e) => cholesky(e.cov));
  if (chol.some((c) => !c)) return { error: 'The posterior covariance is not positive definite.' };
  const out: number[][][][] = [];
  for (let d = 0; d < draws; d++) {
    const coefs = fit.post.map((e, i) => {
      const e0 = e.mean.map(() => z());
      return e.mean.map((mu, a) => mu + chol[i]![a].reduce((s, v, b) => s + v * e0[b], 0));
    });
    const { A } = unpack(coefs, K, fit.p);
    out.push(responses(A, B, H));
  }
  return { steps: bandsFrom(point, out), fevd: fevd(point, H + 1), draws };
}

// ---------------------------------------------------------------------------------------------
// Structural VAR

export type Identification = { kind: 'recursive'; order: number[] } | { kind: 'longrun' };

export interface SvarResult extends MultiIrf {
  lags: number;
  maxLag: number;
  n: number;
  ident: Identification;
}

function impactFor(f: VarCoefs, ident: Identification): number[][] | null {
  return ident.kind === 'recursive' ? recursiveImpact(f.sigma, ident.order) : longRunImpact(f.A, f.sigma);
}

export function svarFit(data: number[][], maxLag: number, ident: Identification, H: number, draws = SVAR_DRAWS): SvarResult | Failed {
  const K = data[0].length;
  const n = data.length;
  if (n < 40) return { error: `Only ${n} rows; the structural VAR needs at least 40.` };
  if (ident.kind === 'recursive' && (ident.order.length !== K || new Set(ident.order).size !== K)) return { error: 'The order must name every series once.' };
  const p = aicLag(data, maxLag);
  if (!p) return { error: 'The VAR could not be solved for this sample.' };
  const fit = olsVar(data, p, maxLag);
  if (!fit) return { error: 'The VAR could not be solved for this sample.' };
  const B = impactFor(fit, ident);
  if (!B) return { error: ident.kind === 'longrun' ? 'The long-run effects are not defined: the VAR has a unit root. Use the series in changes.' : 'The residual covariance is not positive definite.' };
  const point = responses(fit.A, B, H);
  const rand = rng(20261123);
  const out: number[][][][] = [];
  for (let d = 0; d < draws; d++) {
    const sim = data.slice(0, maxLag).map((r) => r.slice());
    for (let t = maxLag; t < n; t++) {
      const e = fit.resid[Math.floor(rand() * fit.resid.length)];
      const row = fit.c.slice();
      for (let l = 1; l <= p; l++) for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) row[i] += fit.A[l - 1][i][j] * sim[t - l][j];
      sim.push(row.map((v, i) => v + e[i]));
    }
    const f = olsVar(sim, p, maxLag);
    const Bd = f && impactFor(f, ident);
    if (!f || !Bd) continue;
    out.push(responses(f.A, Bd, H));
  }
  return { steps: bandsFrom(point, out), fevd: fevd(point, H + 1), draws: out.length, lags: p, maxLag, n: fit.T, ident };
}
