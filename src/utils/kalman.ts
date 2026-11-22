/**
 * Kalman filter and smoother for linear Gaussian state-space models with one observed series
 * (Durbin and Koopman 2012, Time Series Analysis by State Space Methods, 2nd ed., chapter 4):
 *
 *   y_t     = Z a_t + d_t + e_t,      e_t ~ N(0, H)
 *   a_{t+1} = T a_t + c + R n_t,      n_t ~ N(0, Q)
 *
 * A missing y_t (NaN) is skipped: the state is carried forward without an update, which is how a
 * nowcast handles the ragged edge (months not published yet). The exact Gaussian log-likelihood is
 * the sum of the one-step prediction-error terms. Used by the ARIMA models (arima.ts) and the
 * dynamic factor nowcast (dynamicFactor.ts). Pure, browser-safe.
 */

export type Mat = number[][];

export const zeros = (r: number, c: number): Mat => Array.from({ length: r }, () => Array(c).fill(0));
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export function matMul(A: Mat, B: Mat): Mat {
  const n = A.length;
  const m = B[0].length;
  const k = B.length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++)
    for (let l = 0; l < k; l++) {
      const a = A[i][l];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) out[i][j] += a * B[l][j];
    }
  return out;
}
export const transpose = (A: Mat): Mat => A[0].map((_, j) => A.map((r) => r[j]));
export const matAdd = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const matVec = (A: Mat, x: number[]) => A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));

/** Solves A x = b by Gaussian elimination with partial pivoting; null when singular. */
export function solve(A: Mat, b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** The stationary state covariance: P = T P T' + V, solved as (I - T kron T) vec(P) = vec(V). Null when T is not stable. */
export function lyapunov(T: Mat, V: Mat): Mat | null {
  const m = T.length;
  const n = m * m;
  const A = zeros(n, n);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < m; j++)
      for (let k = 0; k < m; k++)
        for (let l = 0; l < m; l++) A[i * m + j][k * m + l] = (i === k && j === l ? 1 : 0) - T[i][k] * T[j][l];
  const x = solve(
    A,
    V.flatMap((r) => r),
  );
  if (!x) return null;
  const P = zeros(m, m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) P[i][j] = x[i * m + j];
  // Symmetrise against rounding.
  for (let i = 0; i < m; i++) for (let j = 0; j < i; j++) P[i][j] = P[j][i] = (P[i][j] + P[j][i]) / 2;
  return P;
}

export interface StateSpace {
  Z: number[];
  T: Mat;
  R: Mat;
  Q: Mat;
  H: number;
  /** Observation intercept per period (length n), or one number for all. */
  d?: number[] | number;
  /** State intercept. */
  c?: number[];
  a0: number[];
  P0: Mat;
}

export interface FilterResult {
  logLik: number;
  /** Prediction errors and their variances (NaN where y is missing). */
  v: number[];
  F: number[];
  /** Predicted state a_{t|t-1} and its covariance, t = 0..n (the last is the one-step forecast after the sample). */
  a: number[][];
  P: Mat[];
  /** Observations used in the likelihood. */
  nObs: number;
}

export function kalmanFilter(y: number[], m: StateSpace): FilterResult {
  const n = y.length;
  const k = m.T.length;
  const RQR = matMul(matMul(m.R, m.Q), transpose(m.R));
  const Tt = transpose(m.T);
  let a = m.a0.slice();
  let P = m.P0.map((r) => r.slice());
  const as: number[][] = [];
  const Ps: Mat[] = [];
  const v: number[] = [];
  const F: number[] = [];
  let ll = 0;
  let nObs = 0;
  const dOf = (t: number) => (Array.isArray(m.d) ? m.d[t] : m.d ?? 0);
  // Once the covariance stops changing (steady state), it is reused until a missing value breaks it.
  let steady = false;
  for (let t = 0; t < n; t++) {
    as.push(a);
    Ps.push(P);
    const PZ = P.map((r) => r.reduce((s, x, j) => s + x * m.Z[j], 0));
    const f = m.Z.reduce((s, z, i) => s + z * PZ[i], 0) + m.H;
    let aNext: number[];
    let PNext: Mat;
    if (Number.isFinite(y[t]) && f > 0) {
      const vt = y[t] - m.Z.reduce((s, z, i) => s + z * a[i], 0) - dOf(t);
      v.push(vt);
      F.push(f);
      ll += -0.5 * (Math.log(2 * Math.PI) + Math.log(f) + (vt * vt) / f);
      nObs++;
      // Filtered state, then predict.
      const af = a.map((x, i) => x + (PZ[i] * vt) / f);
      aNext = matVec(m.T, af);
      if (steady) PNext = P;
      else {
        const Pf = P.map((r, i) => r.map((x, j) => x - (PZ[i] * PZ[j]) / f));
        PNext = matAdd(matMul(matMul(m.T, Pf), Tt), RQR);
        let diff = 0;
        for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) diff = Math.max(diff, Math.abs(PNext[i][j] - P[i][j]));
        if (diff < 1e-11 * (1 + Math.abs(P[0][0]))) steady = true;
      }
    } else {
      steady = false;
      v.push(NaN);
      F.push(NaN);
      aNext = matVec(m.T, a);
      PNext = matAdd(matMul(matMul(m.T, P), Tt), RQR);
    }
    if (m.c) aNext = aNext.map((x, i) => x + m.c![i]);
    // Symmetrise.
    if (PNext !== P) for (let i = 0; i < k; i++) for (let j = 0; j < i; j++) PNext[i][j] = PNext[j][i] = (PNext[i][j] + PNext[j][i]) / 2;
    a = aNext;
    P = PNext;
  }
  as.push(a);
  Ps.push(P);
  return { logLik: ll, v, F, a: as, P: Ps, nObs };
}

/** h-step forecasts of y after the sample, with their variances (state intercept and observation intercept dFuture). */
export function kalmanForecast(m: StateSpace, f: FilterResult, h: number, dFuture: number[] = []): Array<{ mean: number; variance: number }> {
  const n = f.a.length - 1;
  let a = f.a[n];
  let P = f.P[n];
  const RQR = matMul(matMul(m.R, m.Q), transpose(m.R));
  const Tt = transpose(m.T);
  const out: Array<{ mean: number; variance: number }> = [];
  for (let s = 0; s < h; s++) {
    const PZ = P.map((r) => r.reduce((acc, x, j) => acc + x * m.Z[j], 0));
    out.push({ mean: m.Z.reduce((acc, z, i) => acc + z * a[i], 0) + (dFuture[s] ?? (Array.isArray(m.d) ? 0 : m.d ?? 0)), variance: m.Z.reduce((acc, z, i) => acc + z * PZ[i], 0) + m.H });
    a = matVec(m.T, a);
    if (m.c) a = a.map((x, i) => x + m.c![i]);
    P = matAdd(matMul(matMul(m.T, P), Tt), RQR);
  }
  return out;
}

/**
 * Fixed-interval smoother (Durbin and Koopman 2012, section 4.4): the state given all observations,
 * for every period. Used by the dynamic factor nowcast to read the factor in months with gaps.
 */
export function kalmanSmoother(y: number[], m: StateSpace, f: FilterResult): number[][] {
  const n = y.length;
  const k = m.T.length;
  let r = Array(k).fill(0);
  const out: number[][] = Array(n);
  for (let t = n - 1; t >= 0; t--) {
    const P = f.P[t];
    const a = f.a[t];
    const PZ = P.map((row) => row.reduce((s, x, j) => s + x * m.Z[j], 0));
    if (Number.isFinite(f.v[t])) {
      const Ft = f.F[t];
      const K = matVec(m.T, PZ).map((x) => x / Ft);
      // L = T - K Z
      const L = m.T.map((row, i) => row.map((x, j) => x - K[i] * m.Z[j]));
      const Ltr = matVec(transpose(L), r);
      r = m.Z.map((z, i) => (z * f.v[t]) / Ft + Ltr[i]);
    } else {
      r = matVec(transpose(m.T), r);
    }
    const Pr = matVec(P, r);
    out[t] = a.map((x, i) => x + Pr[i]);
  }
  return out;
}
