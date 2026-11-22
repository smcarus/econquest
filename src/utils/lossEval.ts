/**
 * Verdicts for evaluations scored by a loss other than RMSE (the GARCH volatility test, the quantile
 * band test, the tree ensemble nowcast): the ratio of the model's mean loss to the benchmark's, all
 * series pooled, below 1 meaning the model did better; whole calendar years of cases resampled
 * together for a 90% range and a one-sided p-value (share of resamples with ratio >= 1), as in the
 * other evaluations; and the share of series where the model did better. Saved in the same shape as
 * the RMSE evaluations, with `loss` naming the loss (the RMSE fields then hold mean losses and
 * their ratio). Pure, browser-safe.
 */
import { seededRandom } from './backtest';
import type { ForecastResult, HorizonScore } from './forecastEval';

export interface LossCase {
  where: string;
  origin: string;
  target: string;
  h: number;
  lossModel: number;
  lossBench: number;
}

export interface LossPassMark {
  maxLossRatio: number;
  maxPValue: number;
  minSeriesShare: number;
  minCasesPerSeries: number;
  minCases: number;
  minYears: number;
}

const r3 = (x: number) => Number(x.toFixed(3));
const r5 = (x: number) => Number(x.toPrecision(5));

function ratio(cases: LossCase[]): { lm: number; lb: number; ratio: number } {
  let lm = 0;
  let lb = 0;
  for (const c of cases) {
    lm += c.lossModel;
    lb += c.lossBench;
  }
  lm /= cases.length;
  lb /= cases.length;
  return { lm, lb, ratio: lb > 0 ? lm / lb : Infinity };
}

export function scoreLossHorizon(cases: LossCase[], h: number, pm: Pick<LossPassMark, 'minCasesPerSeries'>, resamples: number, seed: number): HorizonScore {
  const hc = cases.filter((c) => c.h === h);
  const yearOf = (c: LossCase) => c.target.slice(0, 4);
  const years = [...new Set(hc.map(yearOf))].sort();
  const byYear = new Map<string, LossCase[]>();
  for (const c of hc) byYear.set(yearOf(c), [...(byYear.get(yearOf(c)) || []), c]);
  const base = hc.length ? ratio(hc) : { lm: NaN, lb: NaN, ratio: NaN };
  const rand = seededRandom(seed + h);
  const rs: number[] = [];
  if (years.length)
    for (let b = 0; b < resamples; b++) {
      const draw: LossCase[] = [];
      for (let k = 0; k < years.length; k++) draw.push(...byYear.get(years[Math.floor(rand() * years.length)])!);
      rs.push(ratio(draw).ratio);
    }
  rs.sort((a, b) => a - b);
  const pick = (q: number) => (rs.length ? rs[Math.min(rs.length - 1, Math.floor(q * rs.length))] : NaN);
  const wheres = [...new Set(hc.map((c) => c.where))].sort();
  const bySeries = wheres.map((where) => {
    const sc = hc.filter((c) => c.where === where);
    return { where, cases: sc.length, relRmse: r3(ratio(sc).ratio), dm: null, dmPValue: null };
  });
  const tested = bySeries.filter((s) => s.cases >= pm.minCasesPerSeries);
  return {
    h,
    cases: hc.length,
    years: years.length,
    rmseModel: r5(base.lm),
    rmseBench: r5(base.lb),
    relRmse: r3(base.ratio),
    relRmseRange: [r3(pick(0.05)), r3(pick(0.95))],
    pValue: rs.length ? r3(rs.filter((r) => r >= 1).length / rs.length) : 1,
    seriesTested: tested.length,
    seriesBeat: tested.filter((s) => s.relRmse < 1).length,
    coverage70: null,
    coverage90: null,
    bySeries,
  };
}

/** Verdict over every registered horizon (each must pass). `what` names the loss and benchmark in the verdict. */
export function judgeLoss(
  spec: { id: string; version: number; horizons: number[]; passMark: LossPassMark },
  specHash: string,
  cases: LossCase[],
  data: string,
  opts: { loss: NonNullable<ForecastResult['loss']>; lossLabel: string; benchLabel: string; unit: string; resamples: number; seed: number },
  ranAt = new Date().toISOString(),
): ForecastResult {
  const pm = spec.passMark;
  const horizons = spec.horizons.map((h) => scoreLossHorizon(cases, h, pm, opts.resamples, opts.seed));
  const desc = (s: HorizonScore) => `${s.h} ${opts.unit} ahead: ${opts.lossLabel} ratio ${s.relRmse} (90% range ${s.relRmseRange[0]} to ${s.relRmseRange[1]}, p ${s.pValue}) over ${s.cases} cases, better in ${s.seriesBeat} of ${s.seriesTested} series`;
  const tooFew = horizons.filter((s) => s.cases < pm.minCases || s.years < pm.minYears);
  const failing = horizons.filter((s) => !(s.relRmse <= pm.maxLossRatio && s.pValue <= pm.maxPValue && s.seriesTested > 0 && s.seriesBeat / s.seriesTested >= pm.minSeriesShare));
  let status: ForecastResult['status'];
  let verdict: string;
  if (tooFew.length) {
    status = 'too_few_cases';
    verdict = `Too few cases to judge: ${tooFew.map((s) => `${s.h} ${opts.unit} ahead has ${s.cases} cases over ${s.years} years`).join('; ')} (needs ${pm.minCases} over ${pm.minYears} years).`;
  } else if (failing.length) {
    status = 'failed';
    verdict = `Failed against ${opts.benchLabel}. ${horizons.map(desc).join('; ')}. Pass mark: ratio at most ${pm.maxLossRatio}, p at most ${pm.maxPValue}, better in at least ${Math.round(pm.minSeriesShare * 100)}% of series.`;
  } else {
    status = 'passed';
    verdict = `Passed against ${opts.benchLabel}. ${horizons.map(desc).join('; ')}.`;
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
    sample: [],
    loss: opts.loss,
  };
}
