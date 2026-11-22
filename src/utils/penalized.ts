/**
 * Ridge and lasso regression (Hoerl and Kennard 1970; Tibshirani 1996), for forecasting with more
 * predictors than ordinary least squares handles well. Both shrink the coefficients towards zero;
 * lasso can set some exactly to zero (it picks predictors). Columns are standardised on the training
 * rows first (mean 0, standard deviation 1) and the intercept is not penalised, as scikit-learn's
 * StandardScaler + Ridge / Lasso pipeline does. Objectives (n rows):
 *
 *   ridge  sum (y - a - Xb)^2 + alpha |b|^2               (scikit-learn Ridge)
 *   lasso  (1 / 2n) sum (y - a - Xb)^2 + alpha |b|_1      (scikit-learn Lasso, coordinate descent)
 *
 * The penalty is chosen in time order only: fit on the first 80% of the rows, score on the last
 * 20%, keep the alpha with the lowest error, then refit on all rows. Never random folds, which
 * would let the model learn from the future. Pure, browser-safe.
 */
import { invert } from './stats';

export type PenaltyKind = 'ridge' | 'lasso';

export interface PenalizedFit {
  kind: PenaltyKind;
  alpha: number;
  intercept: number;
  /** Coefficients on the original (unstandardised) scale, one per column. */
  coef: number[];
  /** Residual standard deviation with the fit's effective degrees of freedom. */
  sigma: number;
  /** Effective number of parameters (ridge: trace of the hat matrix; lasso: non-zero coefficients). */
  df: number;
  n: number;
  /** Columns the lasso kept (all columns for ridge). */
  kept: number;
}

export const RIDGE_GRID = Array.from({ length: 20 }, (_, i) => 10 ** (-2 + (5 * i) / 19));
export const LASSO_GRID = Array.from({ length: 20 }, (_, i) => 10 ** (-3 + (3 * i) / 19));

interface Scaled {
  Z: number[][];
  mu: number[];
  sd: number[];
  ym: number;
  yc: number[];
}

function scale(X: number[][], y: number[]): Scaled {
  const n = X.length;
  const k = X[0]?.length ?? 0;
  const mu = Array.from({ length: k }, (_, j) => X.reduce((a, r) => a + r[j], 0) / n);
  const sd = Array.from({ length: k }, (_, j) => Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const ym = y.reduce((a, b) => a + b, 0) / n;
  return { Z, mu, sd, ym, yc: y.map((v) => v - ym) };
}

function unscale(s: Scaled, b: number[]): { intercept: number; coef: number[] } {
  const coef = b.map((v, j) => v / s.sd[j]);
  return { intercept: s.ym - coef.reduce((a, c, j) => a + c * s.mu[j], 0), coef };
}

/** Ridge on standardised columns: b = (Z'Z + alpha I)^-1 Z'y. */
function ridgeScaled(s: Scaled, alpha: number): { b: number[]; df: number } | null {
  const k = s.Z[0]?.length ?? 0;
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => s.Z.reduce((a, r) => a + r[i] * r[j], 0) + (i === j ? alpha : 0)));
  const inv = invert(A);
  if (!inv) return null;
  const zy = Array.from({ length: k }, (_, i) => s.Z.reduce((a, r, t) => a + r[i] * s.yc[t], 0));
  const b = inv.map((row) => row.reduce((a, v, j) => a + v * zy[j], 0));
  // df = trace(Z (Z'Z + aI)^-1 Z') = trace((Z'Z + aI)^-1 Z'Z) = k - alpha trace(inv)
  const df = k - alpha * inv.reduce((a, row, i) => a + row[i], 0);
  return { b, df };
}

/** Lasso on standardised columns by cyclic coordinate descent (Friedman, Hastie and Tibshirani 2010). */
function lassoScaled(s: Scaled, alpha: number, start?: number[]): number[] {
  const n = s.Z.length;
  const k = s.Z[0]?.length ?? 0;
  const b = start ? start.slice() : Array(k).fill(0);
  const r = s.yc.map((v, t) => v - s.Z[t].reduce((a, z, j) => a + z * b[j], 0));
  const zz = Array.from({ length: k }, (_, j) => s.Z.reduce((a, row) => a + row[j] * row[j], 0) / n);
  for (let it = 0; it < 10000; it++) {
    let maxStep = 0;
    for (let j = 0; j < k; j++) {
      if (zz[j] === 0) continue;
      let rho = 0;
      for (let t = 0; t < n; t++) rho += s.Z[t][j] * (r[t] + s.Z[t][j] * b[j]);
      rho /= n;
      const nb = Math.sign(rho) * Math.max(Math.abs(rho) - alpha, 0) / zz[j];
      const d = nb - b[j];
      if (d !== 0) {
        for (let t = 0; t < n; t++) r[t] -= s.Z[t][j] * d;
        b[j] = nb;
        maxStep = Math.max(maxStep, Math.abs(d));
      }
    }
    if (maxStep < 1e-10) break;
  }
  return b;
}

/** Fit at one alpha on all rows. */
export function fitPenalized(X: number[][], y: number[], kind: PenaltyKind, alpha: number): PenalizedFit | { error: string } {
  const n = X.length;
  const k = X[0]?.length ?? 0;
  if (!n || n !== y.length) return { error: 'No rows to fit.' };
  if (!k) return { error: 'No predictors.' };
  if (n < k + 5) return { error: `Only ${n} rows for ${k} predictors; at least ${k + 5} are needed.` };
  if ([...y, ...X.flat()].some((v) => !Number.isFinite(v))) return { error: 'A predictor or the target has a gap; rows must be complete.' };
  const s = scale(X, y);
  let b: number[];
  let df: number;
  if (kind === 'ridge') {
    const r = ridgeScaled(s, alpha);
    if (!r) return { error: 'The ridge system could not be solved.' };
    b = r.b;
    df = r.df;
  } else {
    b = lassoScaled(s, alpha);
    df = b.filter((v) => v !== 0).length;
  }
  const { intercept, coef } = unscale(s, b);
  const rss = X.reduce((a, row, t) => a + (y[t] - intercept - row.reduce((c, v, j) => c + v * coef[j], 0)) ** 2, 0);
  const sigma = Math.sqrt(rss / Math.max(1, n - 1 - df));
  return { kind, alpha, intercept, coef, sigma, df, n, kept: kind === 'lasso' ? b.filter((v) => v !== 0).length : k };
}

export function predictPenalized(fit: Pick<PenalizedFit, 'intercept' | 'coef'>, x: number[]): number {
  return fit.intercept + x.reduce((a, v, j) => a + v * fit.coef[j], 0);
}

/**
 * Chooses alpha in time order (first 80% of rows to fit, last 20% to score, at least 8 rows held
 * out) and refits on all rows at that alpha. Rows must be in time order, oldest first.
 */
export function fitPenalizedCv(X: number[][], y: number[], kind: PenaltyKind, grid = kind === 'ridge' ? RIDGE_GRID : LASSO_GRID): PenalizedFit | { error: string } {
  const n = X.length;
  const hold = Math.max(8, Math.round(n * 0.2));
  const cut = n - hold;
  const k = X[0]?.length ?? 0;
  if (cut < k + 5) return { error: `Only ${n} rows; choosing the penalty in time order needs at least ${k + 5 + 8}.` };
  let best: { alpha: number; mse: number } | null = null;
  for (const alpha of grid) {
    const f = fitPenalized(X.slice(0, cut), y.slice(0, cut), kind, alpha);
    if ('error' in f) continue;
    let mse = 0;
    for (let t = cut; t < n; t++) mse += (y[t] - predictPenalized(f, X[t])) ** 2;
    mse /= hold;
    if (!best || mse < best.mse - 1e-12) best = { alpha, mse };
  }
  if (!best) return { error: 'No penalty on the grid could be fitted.' };
  return fitPenalized(X, y, kind, best.alpha);
}
