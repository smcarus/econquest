/**
 * Quantile forecasts (Koenker and Bassett 1978): instead of one forecast and a normal band around
 * it, a separate regression for each percentile of the outcome, so the band can be lopsided (for
 * example, a fatter downside for growth, as in "growth at risk", Adrian, Boyarchenko and Giannone
 * 2019, American Economic Review 109).
 *
 * - quantReg: linear quantile regression by iteratively reweighted least squares, the algorithm
 *   statsmodels QuantReg uses (same stopping rule), so the two agree (tests/quantileForecast.test.ts).
 * - quantileForecastCases: the pre-registered test (docs/validation/forecasts/gdp_forecast_quantile.json).
 *   At each origin, direct regressions of growth h quarters ahead on today's and last quarter's
 *   growth, fitted on the pairs known by then, for the 5th, 25th, 50th, 75th and 95th percentiles
 *   (sorted if they cross, Chernozhukov, Fernandez-Val and Galichon 2010). The benchmark is the
 *   same percentiles of the app's AR forecast with its normal band (the live forecast rule).
 *   Loss: mean pinball loss over the five percentiles; scored as the ratio of mean losses, years
 *   resampled (lossEval.ts).
 *
 * Pure, browser-safe.
 */
import { invert } from './stats';
import { fitAr, forecastAr } from './forecastModels';
import { pinballLoss, PINBALL_QUANTILES, type PlainSeries } from './forecastEval';
import type { LossCase } from './lossEval';

/** Linear quantile regression of y on X (an intercept is added), IRLS as statsmodels QuantReg (max 1000 iterations, tolerance 1e-6). */
export function quantReg(y: number[], X: number[][], q: number): { coef: number[]; iterations: number } | { error: string } {
  const n = y.length;
  const Z = X.map((r) => [1, ...r]);
  const k = Z[0]?.length ?? 0;
  if (n < k + 5) return { error: `Only ${n} rows for ${k} coefficients.` };
  let W = Array(n).fill(1);
  let beta = Array(k).fill(1);
  for (let it = 1; it <= 1000; it++) {
    const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => Z.reduce((s, r, t) => s + W[t] * r[i] * r[j], 0)));
    const b = Array.from({ length: k }, (_, i) => Z.reduce((s, r, t) => s + W[t] * r[i] * y[t], 0));
    const inv = invert(A);
    if (!inv) return { error: 'The quantile regression could not be solved.' };
    const nb = inv.map((row) => row.reduce((s, v, j) => s + v * b[j], 0));
    const diff = Math.max(...nb.map((v, i) => Math.abs(v - beta[i])));
    beta = nb;
    W = y.map((v, t) => {
      let r = v - Z[t].reduce((s, z, j) => s + z * beta[j], 0);
      if (Math.abs(r) < 1e-6) r = (r >= 0 ? 1 : -1) * 1e-6;
      return 1 / Math.abs(r < 0 ? q * r : (1 - q) * r);
    });
    if (diff <= 1e-6) return { coef: beta, iterations: it };
  }
  return { coef: beta, iterations: 1000 };
}

const Z_OF: Record<number, number> = { 0.05: -1.6448536, 0.25: -0.6744898, 0.5: 0, 0.75: 0.6744898, 0.95: 1.6448536 };

export const meanPinball = (qs: number[], y: number) => PINBALL_QUANTILES.reduce((a, q, i) => a + pinballLoss(qs[i], y, q), 0) / PINBALL_QUANTILES.length;

/** Pre-registered quantile forecast cases against the AR's normal band (see the file comment). */
export function quantileForecastCases(series: PlainSeries[], spec: { params: Record<string, number>; horizons: number[]; sample: { from: string; to?: string } }): LossCase[] {
  const maxLag = spec.params.maxLag ?? 4;
  const minTrain = spec.params.minTrain ?? 40;
  const out: LossCase[] = [];
  for (const s of series) {
    for (let i = 0; i < s.dates.length; i++) {
      const origin = s.dates[i];
      if (origin < spec.sample.from || (spec.sample.to && origin > spec.sample.to)) continue;
      if (i + 1 < minTrain) continue;
      const train = s.values.slice(0, i + 1);
      const ar = fitAr(train, { maxLag });
      if ('error' in ar) continue;
      const arF = forecastAr(ar, train, Math.max(...spec.horizons));
      for (const h of spec.horizons) {
        if (i + h >= s.values.length) continue;
        // Pairs known at the origin: (y_t, y_{t-1}) -> y_{t+h} with t + h <= i.
        const Y: number[] = [];
        const X: number[][] = [];
        for (let t = 1; t + h <= i; t++) {
          Y.push(train[t + h]);
          X.push([train[t], train[t - 1]]);
        }
        const qs: number[] = [];
        let failed = false;
        for (const q of PINBALL_QUANTILES) {
          const r = quantReg(Y, X, q);
          if ('error' in r) {
            failed = true;
            break;
          }
          qs.push(r.coef[0] + r.coef[1] * train[i] + r.coef[2] * train[i - 1]);
        }
        if (failed) continue;
        qs.sort((a, b) => a - b);
        const p = arF[h - 1];
        const bq = PINBALL_QUANTILES.map((q) => p.mean + Z_OF[q] * (p.sd ?? 0));
        const actual = s.values[i + h];
        out.push({ where: s.where, origin, target: s.dates[i + h], h, lossModel: meanPinball(qs, actual), lossBench: meanPinball(bq, actual) });
      }
    }
  }
  return out;
}
