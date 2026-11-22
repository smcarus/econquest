/**
 * Out-of-sample evaluation of the nowcast and forecast models (Sam, 2026-11-06). A model is marked
 * passed or failed only by an evaluation whose model, sample, horizons, benchmark and pass mark were
 * written down and hashed (docs/validation/forecasts/*.json, hashes in manifest.json) before it ran.
 * A failed model shows as failed and is never tuned afterwards; a changed rule is a new version.
 *
 * Method: rolling origin. At each origin the model is fitted only on what came before (expanding
 * window, or the last `window` periods), forecasts each horizon, and the error is recorded against
 * the value that came out. The benchmark is fitted the same way. The score is the relative RMSE
 * (model RMSE / benchmark RMSE, all series pooled): below 1 means the model beat the benchmark.
 *
 * Errors close in time are not independent (one recession moves every series), so, as with method 2
 * of the signal backtests, whole calendar years of cases are resampled together (block bootstrap,
 * fixed seed: every run gives the same answer). That gives a 90% range for the relative RMSE and a
 * one-sided p-value (share of resamples where the model did not beat the benchmark). The model must
 * also beat the benchmark in at least the stated share of series. The Diebold-Mariano test (with the
 * Harvey-Leybourne-Newbold small-sample correction) is reported per series, for reference.
 *
 * Also reported: how often the model's 70% and 90% bands held the outcome (coverage).
 *
 * Pure functions, browser-safe.
 */
import { seededRandom } from './backtest';
import { tPValue } from './stats';
import { BAND_Z, fitAr, forecastAr, type Prediction } from './forecastModels';
import { missQuantiles } from './missBands';

export type ForecastTarget = 'gdp_growth_q' | 'cpi_yoy_m' | 'policy_rate_m' | 'debt_gdp_a' | 'gdp_nowcast_q' | 'cpi_nowcast_m' | 'gdp_penalized_nowcast_q' | 'gdp_dfm_nowcast_q' | RealTimeTarget;
/** Evaluations on data as first published (src/utils/realTimeEval.ts). */
export type RealTimeTarget = 'gdp_realtime_q' | 'cpi_realtime_m' | 'gdp_weo_realtime_a' | 'cpi_weo_realtime_a';
export const REALTIME_TARGETS: RealTimeTarget[] = ['gdp_realtime_q', 'cpi_realtime_m', 'gdp_weo_realtime_a', 'cpi_weo_realtime_a'];
/**
 * Benchmarks: naive = the last value carries on (random walk); mean = the average of everything known
 * so far; drift = random walk with drift (the last value plus the average step so far, times the
 * horizon); seasonal_naive = the value of the same period one year earlier (Hyndman and
 * Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., section 5.2).
 */
export type BenchmarkKind = 'naive' | 'mean' | 'drift' | 'seasonal_naive';
export const BENCHMARK_KINDS: BenchmarkKind[] = ['naive', 'mean', 'drift', 'seasonal_naive'];
/** What a case can be compared with beside the verdict: the benchmarks, and the IMF projection of the same date. */
export type OtherForecast = BenchmarkKind | 'imf';
const OTHER_FORECASTS: OtherForecast[] = [...BENCHMARK_KINDS, 'imf'];
export const BENCHMARK_LABEL: Record<BenchmarkKind, string> = {
  naive: 'the naive benchmark (last value carried on)',
  mean: 'the historical-mean benchmark',
  drift: 'the random walk with drift',
  seasonal_naive: 'the seasonal naive benchmark (same period a year earlier)',
};
/** Periods per year for each target, for the seasonal naive benchmark. */
export const TARGET_SEASON: Record<ForecastTarget, number> = { gdp_growth_q: 4, cpi_yoy_m: 12, policy_rate_m: 12, debt_gdp_a: 1, gdp_nowcast_q: 4, cpi_nowcast_m: 12, gdp_penalized_nowcast_q: 4, gdp_dfm_nowcast_q: 4, gdp_realtime_q: 4, cpi_realtime_m: 12, gdp_weo_realtime_a: 1, cpi_weo_realtime_a: 1 };

export interface ForecastSpec {
  id: string;
  version: number;
  registeredOn: string;
  registeredBy: string;
  hypothesis: string;
  target: ForecastTarget;
  /** Model settings, fixed before the run (maxLag, d, window, release lags...). */
  params: Record<string, number>;
  benchmark: BenchmarkKind;
  /** Steps ahead judged (periods of the target's own frequency). */
  horizons: number[];
  /** First and last origin (period keys). */
  sample: { from: string; to?: string };
  passMark: { maxRelRmse: number; maxPValue: number; minSeriesShare: number; minCasesPerHorizon: number; minYears: number };
  knownLimits: string[];
  retestOf?: { version: number; verdict: string; change: string };
}

export interface ForecastCase {
  where: string;
  /** Last period known at the origin. */
  origin: string;
  /** Period forecast. */
  target: string;
  h: number;
  actual: number;
  model: Prediction;
  bench: Prediction;
  /** Every benchmark's point forecast for the same case, and in the WEO real-time test the IMF's own projection: reported beside the verdict, never used for it. */
  others?: Partial<Record<OtherForecast, number>>;
}

/** Scores for the forecast distribution (Gneiting and Raftery 2007), on the cases where the model gives a band. */
export interface DistributionScore {
  cases: number;
  /** Mean continuous ranked probability score of the model's normal band; lower is better, in the target's units. */
  crps: number;
  /** Mean absolute error of the registered benchmark: a point forecast's CRPS. */
  benchMae: number;
  /** crps / benchMae: below 1 means the model's band beats the benchmark's point forecast. */
  crpsRatio: number;
  /** Mean interval score of the 90% band (width plus 20 times any miss outside it); lower is better. */
  intervalScore90: number;
  /** Mean pinball (quantile) loss over the 5th, 25th, 50th, 75th and 95th percentiles. */
  pinball: number;
}

export interface HorizonScore {
  h: number;
  cases: number;
  years: number;
  rmseModel: number;
  rmseBench: number;
  relRmse: number;
  /** 90% range of the relative RMSE from resampling whole years. */
  relRmseRange: [number, number];
  /** Share of resamples with relative RMSE at or above 1 (model no better than the benchmark). */
  pValue: number;
  seriesTested: number;
  seriesBeat: number;
  /** Share of outcomes inside the model's 70% and 90% bands. */
  coverage70: number | null;
  coverage90: number | null;
  /** Relative RMSE against every benchmark the cases carry (reported only; the verdict uses the registered one). */
  alsoAgainst?: Array<{ benchmark: OtherForecast; relRmse: number; cases?: number }>;
  /** How good the whole band is, not only its middle (reported only). */
  distribution?: DistributionScore | null;
  /** Per series; `miss` (5th, 15th, 85th, 95th percentile of outcome minus forecast) and `meanMiss` when it has minSeriesCases or more (R8). */
  bySeries: Array<{ where: string; cases: number; relRmse: number; dm: number | null; dmPValue: number | null; miss?: [number, number, number, number]; meanMiss?: number }>;
}

export interface ForecastResult {
  id: string;
  specVersion: number;
  specHash: string;
  ranAt: string;
  status: 'passed' | 'failed' | 'too_few_cases';
  verdict: string;
  horizons: HorizonScore[];
  span: { from: string; to: string };
  series: string[];
  data: string;
  /** A few cases, newest first, so a reader can check them. */
  sample: ForecastCase[];
  /** The test's own p where it is not a horizon's relative-RMSE p (the fan coverage test). */
  pValue?: number;
  /** Fan coverage test only (src/utils/fanCoverage.ts): coverage by horizon, editions used, sample cases. */
  coverage?: import('./fanCoverage').FanCoverageHorizon[];
  origins?: string[];
  /** Set when the score is not RMSE: 'qlike' = volatility test (src/utils/volEval.ts), where the RMSE fields hold mean QLIKE losses and their ratio. */
  loss?: 'qlike';
  fanSample?: import('./fanCoverage').FanCase[];
}

/* ------------------------------------------------------------------ case generators */

export interface PlainSeries {
  where: string;
  /** Period keys, oldest first, unbroken (no missing periods). */
  dates: string[];
  values: number[];
}

/** Longest unbroken run of periods (each date the next period after the one before) that ends at the last point. */
export function unbrokenTail(s: PlainSeries, next: (d: string) => string): PlainSeries {
  let i = s.dates.length - 1;
  while (i > 0 && next(s.dates[i - 1]) === s.dates[i]) i--;
  return { where: s.where, dates: s.dates.slice(i), values: s.values.slice(i) };
}

/**
 * Rolling-origin cases for the AR forecast against a benchmark. At each origin from sample.from
 * (and with at least minTrain periods before it) the AR is refitted on data up to the origin only.
 */
export function arForecastCases(series: PlainSeries[], spec: Pick<ForecastSpec, 'params' | 'benchmark' | 'horizons' | 'sample'> & { target?: ForecastTarget }): ForecastCase[] {
  const maxLag = spec.params.maxLag ?? 4;
  const d = (spec.params.d ?? 0) as 0 | 1;
  const intercept = (spec.params.intercept ?? 1) !== 0;
  const window = spec.params.window ?? 0;
  const minTrain = spec.params.minTrain ?? 40;
  const maxH = Math.max(...spec.horizons);
  const season = spec.params.season ?? (spec.target ? TARGET_SEASON[spec.target] : 1);
  const out: ForecastCase[] = [];
  for (const s of series) {
    for (let i = 0; i < s.dates.length; i++) {
      const origin = s.dates[i];
      if (origin < spec.sample.from || (spec.sample.to && origin > spec.sample.to)) continue;
      if (i + 1 < minTrain) continue;
      const train = window > 0 ? s.values.slice(Math.max(0, i + 1 - window), i + 1) : s.values.slice(0, i + 1);
      const fit = fitAr(train, { maxLag, d, intercept });
      if ('error' in fit) continue;
      const f = forecastAr(fit, train, maxH);
      for (const h of spec.horizons) {
        if (i + h >= s.values.length) continue;
        out.push({ where: s.where, origin, target: s.dates[i + h], h, actual: s.values[i + h], model: f[h - 1], bench: benchmark(spec.benchmark, train, h, season), others: allBenchmarks(train, h, season) });
      }
    }
  }
  return out;
}

/**
 * The benchmark's forecast h steps after the end of train (see BenchmarkKind). `season` is the
 * number of periods in a year; with too short a history for drift or seasonal naive, the naive
 * forecast stands in (the same rule every time, so no case is dropped).
 */
export function benchmark(kind: BenchmarkKind, train: number[], h = 1, season = 1): Prediction {
  const n = train.length;
  const last = train[n - 1];
  if (kind === 'mean') return { mean: train.reduce((a, b) => a + b, 0) / n };
  if (kind === 'drift' && n >= 2) return { mean: last + (h * (last - train[0])) / (n - 1) };
  if (kind === 'seasonal_naive' && season > 1 && n >= season) {
    const k = Math.floor((h - 1) / season) + 1;
    return { mean: train[n + h - k * season - 1] };
  }
  return { mean: last };
}

/** Every benchmark's point forecast, for the "also against" line. */
export function allBenchmarks(train: number[], h: number, season: number): Partial<Record<BenchmarkKind, number>> {
  const out: Partial<Record<BenchmarkKind, number>> = {};
  for (const k of BENCHMARK_KINDS) {
    if (k === 'seasonal_naive' && season <= 1) continue;
    out[k] = benchmark(k, train, h, season).mean;
  }
  return out;
}

/* ------------------------------------------------------------------ distribution scores */

const SQRT_PI = Math.sqrt(Math.PI);
function normPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}
/** Standard normal CDF (Abramowitz and Stegun 7.1.26 through erf; error below 1.5e-7). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
/** CRPS of a normal forecast N(mu, sd^2) at outcome y (Gneiting and Raftery 2007, eq. 21). */
export function crpsNormal(mu: number, sd: number, y: number): number {
  const z = (y - mu) / sd;
  return sd * (z * (2 * normCdf(z) - 1) + 2 * normPdf(z) - 1 / SQRT_PI);
}
/** Interval score of a central (1 - alpha) interval [lo, hi] at outcome y (Gneiting and Raftery 2007, eq. 43). */
export function intervalScore(lo: number, hi: number, y: number, alpha: number): number {
  return hi - lo + (2 / alpha) * Math.max(0, lo - y) + (2 / alpha) * Math.max(0, y - hi);
}
/** Pinball (quantile) loss of the q-th quantile forecast at outcome y. */
export function pinballLoss(qf: number, y: number, q: number): number {
  return y >= qf ? q * (y - qf) : (1 - q) * (qf - y);
}
export const PINBALL_QUANTILES = [0.05, 0.25, 0.5, 0.75, 0.95];
const Z_OF: Record<number, number> = { 0.05: -1.6448536, 0.25: -0.6744898, 0.5: 0, 0.75: 0.6744898, 0.95: 1.6448536 };

/** CRPS, 90% interval score and pinball loss over the cases whose model forecast has a band. */
export function distributionScore(cases: ForecastCase[]): DistributionScore | null {
  const withSd = cases.filter((c) => c.model.sd !== undefined && Number.isFinite(c.model.sd) && c.model.sd! > 0);
  if (!withSd.length) return null;
  let crps = 0;
  let mae = 0;
  let is90 = 0;
  let pin = 0;
  for (const c of withSd) {
    const { mean: mu, sd } = c.model as { mean: number; sd: number };
    crps += crpsNormal(mu, sd, c.actual);
    mae += Math.abs(c.actual - c.bench.mean);
    is90 += intervalScore(mu - 1.6448536 * sd, mu + 1.6448536 * sd, c.actual, 0.1);
    pin += PINBALL_QUANTILES.reduce((a, q) => a + pinballLoss(mu + Z_OF[q] * sd, c.actual, q), 0) / PINBALL_QUANTILES.length;
  }
  const n = withSd.length;
  return { cases: n, crps: r3(crps / n), benchMae: r3(mae / n), crpsRatio: r3(mae > 0 ? crps / mae : crps > 0 ? Infinity : 1), intervalScore90: r3(is90 / n), pinball: r3(pin / n) };
}

/** Relative RMSE of the model against each benchmark the cases carry, on the cases that carry it (`cases` given when fewer than all). */
export function alsoAgainst(cases: ForecastCase[]): Array<{ benchmark: OtherForecast; relRmse: number; cases?: number }> {
  if (!cases.length) return [];
  const out: Array<{ benchmark: OtherForecast; relRmse: number; cases?: number }> = [];
  for (const k of OTHER_FORECASTS) {
    const sub = cases.filter((c) => c.others && Number.isFinite(c.others[k]));
    if (!sub.length) continue;
    let sm = 0;
    let sb = 0;
    for (const c of sub) {
      sm += (c.actual - c.model.mean) ** 2;
      sb += (c.actual - c.others![k]!) ** 2;
    }
    out.push({ benchmark: k, relRmse: r3(sb > 0 ? Math.sqrt(sm / sb) : Infinity), ...(sub.length < cases.length ? { cases: sub.length } : {}) });
  }
  return out;
}

/* ------------------------------------------------------------------ statistics */

const sq = (x: number) => x * x;
const r3 = (x: number) => Number(x.toFixed(3));
const yearOf = (c: ForecastCase) => c.target.slice(0, 4);

function relRmse(cases: ForecastCase[]): { rm: number; rb: number; rel: number } {
  let sm = 0;
  let sb = 0;
  for (const c of cases) {
    sm += sq(c.actual - c.model.mean);
    sb += sq(c.actual - c.bench.mean);
  }
  const rm = Math.sqrt(sm / cases.length);
  const rb = Math.sqrt(sb / cases.length);
  return { rm, rb, rel: rb > 0 ? rm / rb : rm > 0 ? Infinity : 1 };
}

/**
 * Diebold-Mariano statistic on squared-error differences (model minus benchmark), with the
 * Harvey-Leybourne-Newbold correction for horizon h; one-sided p-value that the model is better.
 * Cases must be one series and one horizon, in time order.
 */
export function dieboldMariano(cases: ForecastCase[], h: number): { dm: number; pValue: number } | null {
  const d = cases.map((c) => sq(c.actual - c.model.mean) - sq(c.actual - c.bench.mean));
  const n = d.length;
  if (n < 8) return null;
  const mean = d.reduce((a, b) => a + b, 0) / n;
  const gamma = (k: number) => {
    let s = 0;
    for (let t = k; t < n; t++) s += (d[t] - mean) * (d[t - k] - mean);
    return s / n;
  };
  let v = gamma(0);
  for (let k = 1; k < h; k++) v += 2 * gamma(k);
  if (!(v > 0)) return null;
  const hln = Math.sqrt((n + 1 - 2 * h + (h * (h - 1)) / n) / n);
  const dm = (mean / Math.sqrt(v / n)) * hln;
  const p2 = tPValue(dm, n - 1);
  return { dm: r3(dm), pValue: r3(dm < 0 ? p2 / 2 : 1 - p2 / 2) };
}

export const EVAL_RESAMPLES = 2000;
export const EVAL_SEED = 20261106;

/** Scores one horizon: pooled relative RMSE, year-block bootstrap range and p-value, per-series reading, band coverage. */
export function scoreHorizon(cases: ForecastCase[], h: number, minSeriesCases = 8): HorizonScore {
  const hc = cases.filter((c) => c.h === h);
  const years = [...new Set(hc.map(yearOf))].sort();
  const byYear = new Map<string, ForecastCase[]>();
  for (const c of hc) byYear.set(yearOf(c), [...(byYear.get(yearOf(c)) || []), c]);
  const base = hc.length ? relRmse(hc) : { rm: NaN, rb: NaN, rel: NaN };
  const rand = seededRandom(EVAL_SEED + h);
  const rels: number[] = [];
  if (years.length) {
    for (let b = 0; b < EVAL_RESAMPLES; b++) {
      const draw: ForecastCase[] = [];
      for (let k = 0; k < years.length; k++) draw.push(...byYear.get(years[Math.floor(rand() * years.length)])!);
      rels.push(relRmse(draw).rel);
    }
  }
  rels.sort((a, b) => a - b);
  const pick = (q: number) => (rels.length ? rels[Math.min(rels.length - 1, Math.floor(q * rels.length))] : NaN);
  const wheres = [...new Set(hc.map((c) => c.where))].sort();
  const bySeries = wheres.map((where) => {
    const sc = hc.filter((c) => c.where === where).sort((a, b) => (a.origin < b.origin ? -1 : 1));
    const dm = dieboldMariano(sc, h);
    const misses = sc.map((c) => c.actual - c.model.mean);
    const kept = misses.length >= minSeriesCases ? { miss: missQuantiles(misses), meanMiss: r3(misses.reduce((a, b) => a + b, 0) / misses.length) } : {};
    return { where, cases: sc.length, relRmse: r3(relRmse(sc).rel), dm: dm?.dm ?? null, dmPValue: dm?.pValue ?? null, ...kept };
  });
  const tested = bySeries.filter((s) => s.cases >= minSeriesCases);
  const withSd = hc.filter((c) => c.model.sd !== undefined && Number.isFinite(c.model.sd));
  const cover = (z: number) => (withSd.length ? r3(withSd.filter((c) => Math.abs(c.actual - c.model.mean) <= z * c.model.sd!).length / withSd.length) : null);
  return {
    h,
    cases: hc.length,
    years: years.length,
    rmseModel: r3(base.rm),
    rmseBench: r3(base.rb),
    relRmse: r3(base.rel),
    relRmseRange: [r3(pick(0.05)), r3(pick(0.95))],
    pValue: rels.length ? r3(rels.filter((r) => r >= 1).length / rels.length) : 1,
    seriesTested: tested.length,
    seriesBeat: tested.filter((s) => s.relRmse < 1).length,
    coverage70: cover(BAND_Z[70]),
    coverage90: cover(BAND_Z[90]),
    alsoAgainst: alsoAgainst(hc),
    distribution: distributionScore(hc),
    bySeries,
  };
}

/** Verdict from the cases under the registered pass mark. Every registered horizon must pass. */
export function judgeForecast(spec: ForecastSpec, specHash: string, cases: ForecastCase[], data: string, ranAt = new Date().toISOString()): ForecastResult {
  const horizons = spec.horizons.map((h) => scoreHorizon(cases, h));
  const pm = spec.passMark;
  const bench = BENCHMARK_LABEL[spec.benchmark];
  const tooFew = horizons.filter((s) => s.cases < pm.minCasesPerHorizon || s.years < pm.minYears);
  const failing = horizons.filter((s) => !(s.relRmse <= pm.maxRelRmse && s.pValue <= pm.maxPValue && s.seriesTested > 0 && s.seriesBeat / s.seriesTested >= pm.minSeriesShare));
  const desc = (s: HorizonScore) => `${s.h} ahead: relative RMSE ${s.relRmse} (90% range ${s.relRmseRange[0]} to ${s.relRmseRange[1]}, p ${s.pValue}), beat ${bench.split(' (')[0]} in ${s.seriesBeat} of ${s.seriesTested} series`;
  let status: ForecastResult['status'];
  let verdict: string;
  if (tooFew.length) {
    status = 'too_few_cases';
    verdict = `Too few cases to judge: ${tooFew.map((s) => `${s.h} ahead has ${s.cases} cases over ${s.years} years`).join('; ')} (needs ${pm.minCasesPerHorizon} cases over ${pm.minYears} years).`;
  } else if (failing.length) {
    status = 'failed';
    verdict = `Failed against ${bench}. ${horizons.map(desc).join('; ')}. Pass mark: relative RMSE at most ${pm.maxRelRmse}, p at most ${pm.maxPValue}, better in at least ${Math.round(pm.minSeriesShare * 100)}% of series.`;
  } else {
    status = 'passed';
    verdict = `Passed against ${bench}. ${horizons.map(desc).join('; ')}.`;
  }
  const dates = cases.map((c) => c.origin).sort();
  return {
    id: spec.id,
    specVersion: spec.version,
    specHash,
    ranAt,
    status,
    verdict,
    horizons,
    span: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
    series: [...new Set(cases.map((c) => c.where))].sort(),
    data,
    sample: cases.slice().sort((a, b) => (a.origin < b.origin ? 1 : -1)).slice(0, 12),
  };
}
