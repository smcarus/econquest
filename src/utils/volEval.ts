/**
 * Pre-registered test of the GARCH(1,1) currency volatility forecast (docs/validation/forecasts/
 * fx_vol_garch.json): does GARCH forecast next month's swings better than the plain three-month
 * volatility the app shows today?
 *
 * At each month-end from the registered start, for each currency in the registered list:
 *   model      GARCH(1,1) (src/utils/garch.ts) fitted on the last `window` daily returns (100 x log
 *              change of units per US dollar, ECB reference rates), forecasting the total variance
 *              of the next `horizonDays` returns.
 *   benchmark  the realised variance of the last `benchDays` returns, scaled to `horizonDays`.
 *   outcome    the realised variance of the next `horizonDays` returns (sum of squared returns).
 *
 * Loss: QLIKE, L = RV / F - ln(RV / F) - 1 (Patton 2011, "Volatility forecast comparison using
 * imperfect volatility proxies", Journal of Econometrics 160): it ranks forecasts correctly even
 * though realised variance is a noisy stand-in for the true variance, and it punishes forecasting
 * calm before a storm more than the reverse. The score is the ratio of mean losses (model over
 * benchmark, all currencies pooled); below 1 means GARCH did better. Whole calendar years of cases
 * are resampled together for the 90% range and the p-value, as in the other evaluations.
 *
 * Pure: the caller hands in the daily rates.
 */
import { seededRandom } from './backtest';
import { fitGarch, garchHorizon } from './garch';
import type { ForecastResult, HorizonScore } from './forecastEval';

export interface VolSpec {
  id: string;
  version: number;
  registeredOn: string;
  registeredBy: string;
  hypothesis: string;
  target: 'fx_vol_d';
  params: { window: number; horizonDays: number; benchDays: number; resamples: number; seed: number };
  /** Currencies (ISO 4217), quoted per US dollar. */
  universe: string[];
  sample: { from: string; to?: string };
  passMark: { maxLossRatio: number; maxPValue: number; minSeriesShare: number; minCasesPerCurrency: number; minCases: number; minYears: number };
  knownLimits: string[];
}

export interface VolCase {
  ccy: string;
  /** Month-end day of the forecast (YYYY-MM-DD). */
  origin: string;
  rv: number;
  model: number;
  bench: number;
}

export const qlike = (rv: number, f: number) => rv / f - Math.log(rv / f) - 1;

/** Daily 100 x log returns between consecutive published days. */
export function dailyReturns(pts: Array<{ date: string; value: number }>): Array<{ date: string; r: number }> {
  const s = pts.filter((p) => p.value > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: Array<{ date: string; r: number }> = [];
  for (let i = 1; i < s.length; i++) out.push({ date: s[i].date, r: 100 * Math.log(s[i].value / s[i - 1].value) });
  return out;
}

/** Cases for every currency and month-end (see the file comment). */
export function volCases(daily: Record<string, Array<{ date: string; value: number }>>, spec: Pick<VolSpec, 'params' | 'universe' | 'sample'>): VolCase[] {
  const { window, horizonDays: H, benchDays: B } = spec.params;
  const out: VolCase[] = [];
  for (const ccy of spec.universe) {
    const rs = dailyReturns(daily[ccy] || []);
    for (let i = Math.max(window, B) - 1; i + H < rs.length; i++) {
      const day = rs[i].date;
      // Month-end: the last return of its month.
      if (rs[i + 1].date.slice(0, 7) === day.slice(0, 7)) continue;
      if (day.slice(0, 7) < spec.sample.from || (spec.sample.to && day.slice(0, 7) > spec.sample.to)) continue;
      const train = rs.slice(i - window + 1, i + 1).map((x) => x.r);
      const fit = fitGarch(train);
      if ('error' in fit) continue;
      const model = garchHorizon(fit, H).variance;
      let past = 0;
      for (let k = i - B + 1; k <= i; k++) past += rs[k].r ** 2;
      let rv = 0;
      for (let k = i + 1; k <= i + H; k++) rv += rs[k].r ** 2;
      if (!(rv > 0) || !(past > 0) || !(model > 0)) continue;
      out.push({ ccy, origin: day, rv, model, bench: (past * H) / B });
    }
  }
  return out;
}

const r3 = (x: number) => Number(x.toFixed(3));
const r5 = (x: number) => Number(x.toPrecision(5));

function lossRatio(cases: VolCase[]): { lm: number; lb: number; ratio: number } {
  let lm = 0;
  let lb = 0;
  for (const c of cases) {
    lm += qlike(c.rv, c.model);
    lb += qlike(c.rv, c.bench);
  }
  lm /= cases.length;
  lb /= cases.length;
  return { lm, lb, ratio: lb > 0 ? lm / lb : Infinity };
}

/** Verdict under the registered pass mark, in the shape the other evaluations save (loss: 'qlike'). */
export function judgeVol(spec: VolSpec, specHash: string, cases: VolCase[], data: string, ranAt = new Date().toISOString()): ForecastResult {
  const pm = spec.passMark;
  const years = [...new Set(cases.map((c) => c.origin.slice(0, 4)))].sort();
  const byYear = new Map<string, VolCase[]>();
  for (const c of cases) byYear.set(c.origin.slice(0, 4), [...(byYear.get(c.origin.slice(0, 4)) || []), c]);
  const base = cases.length ? lossRatio(cases) : { lm: NaN, lb: NaN, ratio: NaN };
  const rand = seededRandom(spec.params.seed);
  const ratios: number[] = [];
  if (years.length)
    for (let b = 0; b < spec.params.resamples; b++) {
      const draw: VolCase[] = [];
      for (let k = 0; k < years.length; k++) draw.push(...byYear.get(years[Math.floor(rand() * years.length)])!);
      ratios.push(lossRatio(draw).ratio);
    }
  ratios.sort((a, b) => a - b);
  const pick = (q: number) => (ratios.length ? ratios[Math.min(ratios.length - 1, Math.floor(q * ratios.length))] : NaN);
  const pValue = ratios.length ? r3(ratios.filter((r) => r >= 1).length / ratios.length) : 1;
  const ccys = [...new Set(cases.map((c) => c.ccy))].sort();
  const bySeries = ccys.map((where) => {
    const sc = cases.filter((c) => c.ccy === where);
    return { where, cases: sc.length, relRmse: r3(lossRatio(sc).ratio), dm: null, dmPValue: null };
  });
  const tested = bySeries.filter((s) => s.cases >= pm.minCasesPerCurrency);
  const beat = tested.filter((s) => s.relRmse < 1).length;
  const h: HorizonScore = {
    h: spec.params.horizonDays,
    cases: cases.length,
    years: years.length,
    rmseModel: r5(base.lm),
    rmseBench: r5(base.lb),
    relRmse: r3(base.ratio),
    relRmseRange: [r3(pick(0.05)), r3(pick(0.95))],
    pValue,
    seriesTested: tested.length,
    seriesBeat: beat,
    coverage70: null,
    coverage90: null,
    bySeries,
  };
  const desc = `QLIKE loss ratio ${h.relRmse} (90% range ${h.relRmseRange[0]} to ${h.relRmseRange[1]}, p ${pValue}) over ${cases.length} month-ends, better in ${beat} of ${tested.length} currencies`;
  let status: ForecastResult['status'];
  let verdict: string;
  if (cases.length < pm.minCases || years.length < pm.minYears) {
    status = 'too_few_cases';
    verdict = `Too few cases to judge: ${cases.length} month-ends over ${years.length} years (needs ${pm.minCases} over ${pm.minYears} years).`;
  } else if (!(h.relRmse <= pm.maxLossRatio && pValue <= pm.maxPValue && tested.length > 0 && beat / tested.length >= pm.minSeriesShare)) {
    status = 'failed';
    verdict = `Failed against the three-month realised volatility: ${desc}. Pass mark: ratio at most ${pm.maxLossRatio}, p at most ${pm.maxPValue}, better in at least ${Math.round(pm.minSeriesShare * 100)}% of currencies.`;
  } else {
    status = 'passed';
    verdict = `Passed against the three-month realised volatility: ${desc}.`;
  }
  const dates = cases.map((c) => c.origin).sort();
  return {
    id: spec.id,
    specVersion: spec.version,
    specHash,
    ranAt,
    status,
    verdict,
    horizons: [h],
    span: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
    series: ccys,
    data,
    sample: [],
    loss: 'qlike',
  };
}
