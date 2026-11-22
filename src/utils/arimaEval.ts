/**
 * Rolling-origin cases for the ARMA forecast tests (docs/validation/forecasts/*_arma.json), the
 * same design as the AR tests (forecastEval.ts arForecastCases) with an ARMA(p, q) fitted by exact
 * maximum likelihood (arima.ts) in place of the AR:
 *
 * - The order (p and q each 0 to maxP / maxQ) is chosen by BIC at the first origin of each calendar
 *   year, on the data to then, and kept for that year's origins (choosing it at every origin would
 *   take hours for the monthly series and changes little).
 * - At every origin the coefficients are re-estimated on the data to then (the last `window`
 *   periods when window > 0), starting from the previous origin's estimates.
 *
 * Pure, browser-safe.
 */
import { autoArima, fitArima, forecastArima, type ArimaFit } from './arima';
import { allBenchmarks, benchmark, TARGET_SEASON, type ForecastCase, type ForecastSpec, type ForecastTarget, type PlainSeries } from './forecastEval';

export function armaForecastCases(series: PlainSeries[], spec: Pick<ForecastSpec, 'params' | 'benchmark' | 'horizons' | 'sample'> & { target?: ForecastTarget }): ForecastCase[] {
  const maxP = spec.params.maxP ?? 2;
  const maxQ = spec.params.maxQ ?? 2;
  const d = (spec.params.d ?? 0) as 0 | 1;
  const constant = (spec.params.intercept ?? 1) !== 0;
  const window = spec.params.window ?? 0;
  const minTrain = spec.params.minTrain ?? 40;
  const maxH = Math.max(...spec.horizons);
  const season = spec.params.season ?? (spec.target ? TARGET_SEASON[spec.target] : 1);
  const out: ForecastCase[] = [];
  for (const s of series) {
    let year = '';
    let order: { p: number; q: number } | null = null;
    let prev: ArimaFit | null = null;
    for (let i = 0; i < s.dates.length; i++) {
      const origin = s.dates[i];
      if (origin < spec.sample.from || (spec.sample.to && origin > spec.sample.to)) continue;
      if (i + 1 < minTrain) continue;
      const train = window > 0 ? s.values.slice(Math.max(0, i + 1 - window), i + 1) : s.values.slice(0, i + 1);
      if (origin.slice(0, 4) !== year || !order) {
        const auto = autoArima(train, { maxP, maxQ, d, constant });
        if ('error' in auto) continue;
        year = origin.slice(0, 4);
        order = { p: auto.order.p, q: auto.order.q };
        prev = auto;
      } else {
        const f = fitArima(train, { p: order.p, d, q: order.q }, { constant, start: prev?.raw });
        if ('error' in f) continue;
        prev = f;
      }
      const fc = forecastArima(prev!, train, maxH);
      if ('error' in fc) continue;
      for (const h of spec.horizons) {
        if (i + h >= s.values.length) continue;
        out.push({ where: s.where, origin, target: s.dates[i + h], h, actual: s.values[i + h], model: fc[h - 1], bench: benchmark(spec.benchmark, train, h, season), others: allBenchmarks(train, h, season) });
      }
    }
  }
  return out;
}
