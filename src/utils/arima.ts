/**
 * ARIMA models with moving-average terms, seasonal terms and outside predictors (regression with
 * ARIMA errors), fitted by exact Gaussian maximum likelihood through the Kalman filter (kalman.ts),
 * as statsmodels' ARIMA / SARIMAX does:
 *
 *   y_t = x_t' b + u_t,   phi(L) Phi(L^s) (1 - L)^d u_t = theta(L) Theta(L^s) e_t,   e_t ~ N(0, s2)
 *
 * x_t holds a constant (the mean of the differenced series when d = 0, its drift when d = 1, if
 * asked for) and any outside predictors. The AR and seasonal AR parts are kept stationary and the
 * MA parts invertible with the transform statsmodels uses (Monahan 1984). The variance s2 is
 * concentrated out of the likelihood, which gives the same estimates. The ARMA part uses the
 * stationary start (the state covariance solves the Lyapunov equation).
 *
 * Differencing is done before the fit (statsmodels' simple_differencing=True), and forecasts are
 * summed back; forecast variances come from the MA(infinity) weights of the full model, including
 * the differencing. Order selection, when asked, is by BIC over a small grid. Pure, browser-safe.
 */
import { lyapunov, kalmanFilter, kalmanForecast, type StateSpace } from './kalman';
import { minimise } from './optimize';
import { ols } from './stats';

export interface ArimaOrder {
  p: number;
  d: 0 | 1;
  q: number;
  /** Seasonal AR and MA orders and the season length (0 = none). */
  P?: number;
  Q?: number;
  s?: number;
}

export interface ArimaFit {
  order: Required<ArimaOrder>;
  /** Regression coefficients: the constant first (when used), then one per outside predictor. */
  beta: number[];
  ar: number[];
  ma: number[];
  sar: number[];
  sma: number[];
  sigma2: number;
  logLik: number;
  /** Number of estimated parameters, s2 included. */
  k: number;
  aic: number;
  bic: number;
  /** Observations in the likelihood (after differencing). */
  n: number;
  constant: boolean;
  /** The optimiser's parameters (unconstrained), to warm-start the next fit of the same model. */
  raw: number[];
}

/** Monahan (1984) transform, as statsmodels constrain_stationary_univariate. */
export function constrainStationary(u: number[]): number[] {
  const n = u.length;
  if (!n) return [];
  const r = u.map((x) => x / Math.sqrt(1 + x * x));
  const y: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < k; i++) y[k][i] = y[k - 1][i] + r[k] * y[k - 1][k - i - 1];
    y[k][k] = r[k];
  }
  return y[n - 1].map((v) => -v);
}

/** Product of two lag polynomials given as coefficient arrays from lag 0. */
function polyMul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}

/** Full AR coefficients (y_t = sum phi_i y_{t-i} + ...) and MA coefficients (e_t + sum theta_j e_{t-j}) after multiplying the seasonal parts in. */
export function expandPolys(ar: number[], ma: number[], sar: number[], sma: number[], s: number): { phi: number[]; theta: number[] } {
  const arPoly = polyMul([1, ...ar.map((x) => -x)], seasonal(sar.map((x) => -x), s));
  const maPoly = polyMul([1, ...ma], seasonal(sma, s));
  return { phi: arPoly.slice(1).map((x) => -x), theta: maPoly.slice(1) };
}

function seasonal(coef: number[], s: number): number[] {
  if (!coef.length || !s) return [1];
  const out = Array(coef.length * s + 1).fill(0);
  out[0] = 1;
  coef.forEach((c, i) => (out[(i + 1) * s] = c));
  return out;
}

/** Harvey's state-space form of an ARMA(p, q) with unit innovation variance and the stationary start. */
export function armaStateSpace(phi: number[], theta: number[]): StateSpace | null {
  const m = Math.max(phi.length, theta.length + 1, 1);
  const T = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => (j === 0 ? (phi[i] ?? 0) : j === i + 1 ? 1 : 0)));
  const R = Array.from({ length: m }, (_, i) => [i === 0 ? 1 : (theta[i - 1] ?? 0)]);
  const RRt = R.map((r) => R.map((c) => r[0] * c[0]));
  const P0 = lyapunov(T, RRt);
  if (!P0) return null;
  return { Z: Array.from({ length: m }, (_, i) => (i === 0 ? 1 : 0)), T, R, Q: [[1]], H: 0, a0: Array(m).fill(0), P0 };
}

const diff1 = (v: number[]) => v.slice(1).map((x, i) => x - v[i]);

interface Prepared {
  y: number[];
  X: number[][];
}

function prepare(y: number[], exog: number[][] | undefined, d: 0 | 1, constant: boolean): Prepared {
  let yy = y.slice();
  let X = (exog || y.map(() => [])).map((r) => r.slice());
  if (d === 1) {
    yy = diff1(yy);
    X = X.slice(1).map((r, t) => r.map((v, j) => v - X[t][j]));
  }
  if (constant) X = X.map((r) => [1, ...r]);
  return { y: yy, X };
}

function unpackParams(u: number[], kx: number, o: Required<ArimaOrder>) {
  let i = 0;
  const take = (n: number) => u.slice(i, (i += n));
  const beta = take(kx);
  const ar = constrainStationary(take(o.p));
  const ma = constrainStationary(take(o.q)).map((x) => -x);
  const sar = constrainStationary(take(o.P));
  const sma = constrainStationary(take(o.Q)).map((x) => -x);
  return { beta, ar, ma, sar, sma };
}

/** Concentrated log-likelihood (s2 profiled out) and s2 for given parameters; null when the model cannot be set up. */
function concentrated(prep: Prepared, beta: number[], phi: number[], theta: number[]): { ll: number; sigma2: number } | null {
  const ss = armaStateSpace(phi, theta);
  if (!ss) return null;
  const u = prep.y.map((v, t) => v - prep.X[t].reduce((s, x, j) => s + x * beta[j], 0));
  const f = kalmanFilter(u, ss);
  let sv = 0;
  let sl = 0;
  for (let t = 0; t < f.v.length; t++) {
    if (!Number.isFinite(f.v[t])) continue;
    sv += (f.v[t] * f.v[t]) / f.F[t];
    sl += Math.log(f.F[t]);
  }
  const n = f.nObs;
  const sigma2 = sv / n;
  return { ll: -0.5 * n * (Math.log(2 * Math.PI) + 1 + Math.log(sigma2)) - 0.5 * sl, sigma2 };
}

export function fitArima(y: number[], order: ArimaOrder, opts: { constant?: boolean; exog?: number[][]; /** Warm start: the `raw` of an earlier fit of the same model. */ start?: number[] } = {}): ArimaFit | { error: string } {
  const o: Required<ArimaOrder> = { P: 0, Q: 0, s: 0, ...order };
  const constant = opts.constant ?? true;
  if (y.some((v) => !Number.isFinite(v))) return { error: 'The series has a gap or a non-number; the model needs an unbroken run.' };
  if (opts.exog && (opts.exog.length !== y.length || opts.exog.some((r) => r.some((v) => !Number.isFinite(v))))) return { error: 'The outside predictors must cover every period, with no gaps.' };
  const prep = prepare(y, opts.exog, o.d, constant);
  const kx = prep.X[0]?.length ?? 0;
  const kArma = o.p + o.q + o.P + o.Q;
  const need = Math.max(20, 3 * (kx + kArma + 1) + o.s * (o.P + o.Q));
  if (prep.y.length < need) return { error: `Only ${prep.y.length} usable points; this model needs at least ${need}.` };
  // Start: least squares for the regression part, zero ARMA terms.
  let beta0: number[] = [];
  if (kx) {
    const noConst = constant ? prep.X.map((r) => r.slice(1)) : prep.X;
    if (constant && !noConst[0].length) beta0 = [prep.y.reduce((a, b) => a + b, 0) / prep.y.length];
    else {
      const r = ols(prep.y, noConst, 3);
      if ('error' in r) return { error: r.error };
      beta0 = constant ? r.coef : r.coef.slice(1);
    }
  }
  const obj = (u: number[]) => {
    const p = unpackParams(u, kx, o);
    const { phi, theta } = expandPolys(p.ar, p.ma, p.sar, p.sma, o.s);
    const c = concentrated(prep, p.beta, phi, theta);
    return c ? -c.ll : Infinity;
  };
  const cold = [...beta0, ...Array(kArma).fill(0.1)];
  const u0 = opts.start && opts.start.length === cold.length && opts.start.every(Number.isFinite) ? opts.start : cold;
  const res = minimise(obj, u0, opts.start ? 2 : 5, { step: opts.start ? 0.05 : 0.2, maxIter: 4000 * Math.max(1, u0.length), tol: 1e-12 });
  const p = unpackParams(res.x, kx, o);
  const { phi, theta } = expandPolys(p.ar, p.ma, p.sar, p.sma, o.s);
  const c = concentrated(prep, p.beta, phi, theta);
  if (!c) return { error: 'The model could not be fitted.' };
  const k = kx + kArma + 1;
  const n = prep.y.length;
  return { order: o, beta: p.beta, ar: p.ar, ma: p.ma, sar: p.sar, sma: p.sma, sigma2: c.sigma2, logLik: c.ll, k, aic: -2 * c.ll + 2 * k, bic: -2 * c.ll + Math.log(n) * k, n, constant, raw: res.x };
}

/** MA(infinity) weights of the full model, differencing included: psi_0 = 1. */
export function arimaPsi(fit: Pick<ArimaFit, 'ar' | 'ma' | 'sar' | 'sma' | 'order'>, h: number): number[] {
  const { phi, theta } = expandPolys(fit.ar, fit.ma, fit.sar, fit.sma, fit.order.s);
  const full = fit.order.d === 1 ? polyMul([1, ...phi.map((x) => -x)], [1, -1]).slice(1).map((x) => -x) : phi;
  const psi = [1];
  for (let j = 1; j < h; j++) {
    let s = theta[j - 1] ?? 0;
    for (let i = 1; i <= Math.min(j, full.length); i++) s += full[i - 1] * psi[j - i];
    psi.push(s);
  }
  return psi;
}

/**
 * Forecasts 1..h steps after the sample, with standard deviations. Outside predictors for the
 * future periods must be given (exogFuture, one row per step); the model never guesses them.
 */
export function forecastArima(fit: ArimaFit, y: number[], h: number, opts: { exog?: number[][]; exogFuture?: number[][] } = {}): Array<{ mean: number; sd: number }> | { error: string } {
  const kx = fit.beta.length - (fit.constant ? 1 : 0);
  if (kx && (!opts.exogFuture || opts.exogFuture.length < h)) return { error: `The model uses ${kx} outside predictor(s); their values for the ${h} future period(s) are needed.` };
  const prep = prepare(y, opts.exog, fit.order.d, fit.constant);
  const { phi, theta } = expandPolys(fit.ar, fit.ma, fit.sar, fit.sma, fit.order.s);
  const ss = armaStateSpace(phi, theta);
  if (!ss) return { error: 'The fitted model is not stationary.' };
  const u = prep.y.map((v, t) => v - prep.X[t].reduce((s, x, j) => s + x * fit.beta[j], 0));
  const f = kalmanFilter(u, ss);
  const fc = kalmanForecast(ss, f, h);
  // Regression part for the future periods (differenced when d = 1).
  const lastX = (opts.exog || [])[y.length - 1] || [];
  const futureX: number[][] = Array.from({ length: h }, (_, s) => {
    const row = opts.exogFuture?.[s] || [];
    const prev = s === 0 ? lastX : opts.exogFuture?.[s - 1] || [];
    const r = fit.order.d === 1 ? row.map((v, j) => v - (prev[j] ?? 0)) : row.slice();
    return fit.constant ? [1, ...r] : r;
  });
  const dMean = fc.map((x, s) => x.mean + futureX[s].reduce((acc, v, j) => acc + v * fit.beta[j], 0));
  const psi = arimaPsi(fit, h);
  let level = y[y.length - 1];
  const out: Array<{ mean: number; sd: number }> = [];
  let cum = 0;
  for (let s = 0; s < h; s++) {
    cum += psi[s] * psi[s];
    if (fit.order.d === 1) level += dMean[s];
    out.push({ mean: fit.order.d === 1 ? level : dMean[s], sd: Math.sqrt(fit.sigma2 * cum) });
  }
  return out;
}

/** Fits every (p, q) with p, q at most maxP, maxQ and keeps the lowest BIC (ties: the smaller model). */
export function autoArima(y: number[], opts: { maxP: number; maxQ: number; d: 0 | 1; constant?: boolean }): ArimaFit | { error: string } {
  let best: ArimaFit | null = null;
  let firstError: string | null = null;
  for (let p = 0; p <= opts.maxP; p++)
    for (let q = 0; q <= opts.maxQ; q++) {
      const f = fitArima(y, { p, d: opts.d, q }, { constant: opts.constant });
      if ('error' in f) {
        firstError ??= f.error;
        continue;
      }
      if (!best || f.bic < best.bic - 1e-9) best = f;
    }
  return best ?? { error: firstError ?? 'No model could be fitted.' };
}
