/**
 * GDP nowcast with many predictors and a penalty (ridge or lasso, src/utils/penalized.ts), tested
 * against the same benchmark as the bridge-equation nowcast (docs/validation/forecasts/
 * gdp_nowcast_ridge.json and gdp_nowcast_lasso.json).
 *
 * For a quarter q, made `asOfDaysAfterQuarter` days after q ends, with only what is published by
 * then under the registered release lags (the same lags as the bridge nowcast):
 *
 *   target      real GDP growth in q (q/q)
 *   predictors  GDP growth in q-1 .. q-4; the activity index's quarterly growth in q and q-1; the
 *               OECD leading indicator's quarterly change in q and q-1; the change in quarterly
 *               average inflation (y/y) in q; the change in the quarterly average policy rate in q.
 *               A country uses the groups it has; months of q not out yet are an AR forecast of the
 *               monthly series (the ragged edge), as in the bridge.
 *   fit         every earlier quarter with all predictors fully published, oldest first; the penalty
 *               chosen in time order (first 80% fit, last 20% scored), then refitted on all rows.
 *
 * Countries with neither an activity index nor the leading indicator are left out, and so are
 * quarters where no indicator month was out (as in the bridge test), so the two compare like for
 * like. Pure, browser-safe.
 */
import { addDays, monthsOf, periodEnd, publishedBy, quarterlyFromMonthly, type DatedPoint } from './forecastModels';
import { quarterlyIndicator } from './nowcast';
import { fitPenalizedCv, predictPenalized, type PenaltyKind } from './penalized';
import type { ForecastCase, ForecastSpec } from './forecastEval';
import type { CountryData } from './forecastCases';

const prevQ = (q: string, k = 1) => {
  let y = Number(q.slice(0, 4));
  let n = Number(q.slice(-1)) - k;
  while (n < 1) {
    n += 4;
    y--;
  }
  return `${y}-Q${n}`;
};

type QMap = Map<string, { value: number; monthsForecast: number; monthsPublished: number }>;

/** Change of the quarterly average of a monthly series, quarter on quarter (ragged edge filled by AR). */
function quarterlyChange(points: DatedPoint[], upTo: string): QMap {
  const qa = quarterlyFromMonthly(points, { fill: 'ar', maxLag: 3, fillUpTo: upTo });
  const out: QMap = new Map();
  for (let i = 1; i < qa.length; i++) if (prevQ(qa[i].quarter) === qa[i - 1].quarter) out.set(qa[i].quarter, { value: qa[i].value - qa[i - 1].value, monthsForecast: qa[i].monthsForecast, monthsPublished: qa[i].monthsPublished });
  return out;
}

export interface PenalizedNowcastRow {
  quarter: string;
  x: number[];
  /** True when every indicator month behind the row is published (not a forecast). */
  complete: boolean;
}

/** The predictor rows a nowcast made on `asOf` can see, and the column names. */
export function predictorRows(c: CountryData, asOf: string, targetQ: string, lags: { gdp: number; activity: number; cli: number; cpi: number; policy: number }): { names: string[]; rows: Map<string, PenalizedNowcastRow>; gdp: Map<string, number> } | null {
  const gdpPts = publishedBy(c.gdpQoq || [], asOf, lags.gdp);
  const gdp = new Map(gdpPts.map((p) => [p.date, p.value]));
  const groups: Array<{ names: string[]; at: (q: string) => { v: number[]; complete: boolean } | null }> = [];
  groups.push({
    names: ['GDP growth q-1', 'GDP growth q-2', 'GDP growth q-3', 'GDP growth q-4'],
    at: (q) => {
      const v = [1, 2, 3, 4].map((k) => gdp.get(prevQ(q, k)));
      return v.every((x) => x !== undefined) ? { v: v as number[], complete: true } : null;
    },
  });
  const ind = (pts: DatedPoint[] | undefined, lag: number, kind: 'pct' | 'diff', label: string, withLag: boolean) => {
    if (!pts?.length) return;
    const pub = publishedBy(pts, asOf, lag);
    if (!pub.length) return;
    const s = quarterlyIndicator(pub, kind, targetQ, 3);
    groups.push({
      names: withLag ? [label, `${label} q-1`] : [label],
      at: (q) => {
        const a = s.get(q);
        const b = s.get(prevQ(q));
        if (!a || (withLag && !b)) return null;
        return { v: withLag ? [a.value, b!.value] : [a.value], complete: a.monthsForecast === 0 && (!withLag || b!.monthsForecast === 0) };
      },
    });
  };
  const hasIndicator = Boolean(c.activity?.length || c.cli?.length);
  if (!hasIndicator) return null;
  ind(c.activity, lags.activity, 'pct', 'Activity index growth', true);
  ind(c.cli, lags.cli, 'diff', 'Leading indicator change', true);
  for (const [pts, lag, label] of [
    [c.cpi, lags.cpi, 'Inflation change'],
    [c.policy, lags.policy, 'Policy rate change'],
  ] as const) {
    if (!pts?.length) continue;
    const pub = publishedBy(pts, asOf, lag);
    if (!pub.length) continue;
    const s = quarterlyChange(pub, targetQ);
    groups.push({ names: [label], at: (q) => (s.has(q) ? { v: [s.get(q)!.value], complete: s.get(q)!.monthsForecast === 0 } : null) });
  }
  const names = groups.flatMap((g) => g.names);
  const rows = new Map<string, PenalizedNowcastRow>();
  const quarters = [...new Set([...gdp.keys(), targetQ])].sort();
  for (const q of quarters) {
    const parts = groups.map((g) => g.at(q));
    if (parts.some((p) => !p)) continue;
    rows.set(q, { quarter: q, x: parts.flatMap((p) => p!.v), complete: parts.every((p) => p!.complete) });
  }
  return { names, rows, gdp };
}

/** A fitted model for the nowcast: its prediction for a predictor row and its error spread (when it has one). */
export type RowModel = { predict: (x: number[]) => number; sd?: number };

/**
 * Out-of-sample cases for any model fitted on the predictor rows (ridge, lasso, random forest...):
 * the same quarters, release lags, benchmark and training rows whatever the model.
 */
export function predictorNowcastCases(spec: ForecastSpec, data: CountryData[], fitRows: (X: number[][], y: number[]) => RowModel | null): { cases: ForecastCase[]; series: string[] } {
  const after = spec.params.asOfDaysAfterQuarter ?? 30;
  const lags = { gdp: spec.params.gdpLagDays ?? 60, activity: spec.params.activityLagDays ?? 45, cli: spec.params.cliLagDays ?? 45, cpi: spec.params.cpiLagDays ?? 30, policy: spec.params.policyLagDays ?? 1 };
  const minTrain = spec.params.minTrain ?? 32;
  const out: ForecastCase[] = [];
  for (const c of data) {
    if (!c.gdpQoq?.length) continue;
    const gdpAll = c.gdpQoq.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const g of gdpAll) {
      if (g.date < spec.sample.from || (spec.sample.to && g.date > spec.sample.to)) continue;
      const asOf = addDays(periodEnd(g.date), after);
      const pr = predictorRows(c, asOf, g.date, lags);
      if (!pr) continue;
      if (pr.gdp.has(g.date)) continue; // already published: nothing to nowcast
      const target = pr.rows.get(g.date);
      if (!target) continue;
      // At least one indicator month of the target quarter must be out (as in the bridge test).
      const ms = monthsOf(g.date);
      const outIn = (pts: DatedPoint[] | undefined, lag: number) => Boolean(pts?.length && publishedBy(pts, asOf, lag).some((p) => ms.includes(p.date)));
      if (!outIn(c.activity, lags.activity) && !outIn(c.cli, lags.cli)) continue;
      const train = [...pr.rows.values()].filter((r) => r.quarter < g.date && r.complete && pr.gdp.has(r.quarter)).sort((a, b) => (a.quarter < b.quarter ? -1 : 1));
      if (train.length < minTrain) continue;
      const model = fitRows(
        train.map((r) => r.x),
        train.map((r) => pr.gdp.get(r.quarter)!),
      );
      if (!model) continue;
      const known = [...pr.gdp.values()];
      const bench = spec.benchmark === 'mean' ? known.reduce((a, b) => a + b, 0) / known.length : gdpAll.filter((x) => pr.gdp.has(x.date)).slice(-1)[0].value;
      const lastPub = [...pr.gdp.keys()].sort().slice(-1)[0];
      out.push({ where: c.iso3, origin: lastPub, target: g.date, h: 1, actual: g.value, model: { mean: model.predict(target.x), ...(model.sd !== undefined ? { sd: model.sd } : {}) }, bench: { mean: bench } });
    }
  }
  return { cases: out, series: [...new Set(out.map((x) => x.where))].sort() };
}

/** Out-of-sample cases for the ridge or lasso nowcast (spec.params.penalty: 1 ridge, 2 lasso). */
export function penalizedNowcastCases(spec: ForecastSpec, data: CountryData[]): { cases: ForecastCase[]; series: string[] } {
  const kind: PenaltyKind = spec.params.penalty === 2 ? 'lasso' : 'ridge';
  return predictorNowcastCases(spec, data, (X, y) => {
    const fit = fitPenalizedCv(X, y, kind);
    return 'error' in fit ? null : { predict: (x) => predictPenalized(fit, x), sd: fit.sigma };
  });
}

/** A live call of a passing nowcast, written to the forward record before the quarter's GDP is out. */
export interface NowcastOpenCall {
  where: string;
  when: string;
  what: string;
  due: string;
  forecast: { model: number; bench: number };
}

/**
 * Rule 7 for the nowcasts fitted on predictor rows (ridge, lasso, random forest): for each country,
 * the last two quarters that have ended by `asOf` and whose GDP is not in hand yet, estimated with
 * every figure in hand on `asOf` (what is in hand is published, so no release lag is applied), fitted
 * on the earlier complete rows exactly as in the test, with the test's benchmark beside it. The same
 * rules as the test: at least one indicator month of the quarter out, and `minTrain` rows to fit on.
 */
export function predictorNowcastOpen(spec: ForecastSpec, data: CountryData[], asOf: string, fitRows: (X: number[][], y: number[]) => RowModel | null): NowcastOpenCall[] {
  const lag = spec.params.gdpLagDays ?? 60;
  const minTrain = spec.params.minTrain ?? 32;
  const none = { gdp: 0, activity: 0, cli: 0, cpi: 0, policy: 0 };
  const thisQ = `${asOf.slice(0, 4)}-Q${Math.ceil(Number(asOf.slice(5, 7)) / 3)}`;
  const ended = [prevQ(thisQ, 1), prevQ(thisQ, 2)].filter((q) => periodEnd(q) <= asOf);
  const out: NowcastOpenCall[] = [];
  for (const c of data) {
    if (!c.gdpQoq?.length) continue;
    const published = new Set(c.gdpQoq.map((g) => g.date));
    for (const q of ended) {
      if (published.has(q)) continue;
      const pr = predictorRows(c, asOf, q, none);
      if (!pr) continue;
      const target = pr.rows.get(q);
      if (!target) continue;
      const ms = monthsOf(q);
      if (![c.activity, c.cli].some((pts) => pts?.some((p) => ms.includes(p.date)))) continue;
      const train = [...pr.rows.values()].filter((r) => r.quarter < q && r.complete && pr.gdp.has(r.quarter)).sort((a, b) => (a.quarter < b.quarter ? -1 : 1));
      if (train.length < minTrain) continue;
      const model = fitRows(
        train.map((r) => r.x),
        train.map((r) => pr.gdp.get(r.quarter)!),
      );
      if (!model) continue;
      const known = c.gdpQoq.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((g) => g.value);
      const bench = spec.benchmark === 'mean' ? known.reduce((a, b) => a + b, 0) / known.length : known[known.length - 1];
      const mean = model.predict(target.x);
      if (!Number.isFinite(mean)) continue;
      out.push({
        where: c.iso3,
        when: q,
        what: `nowcast ${mean.toFixed(2)}% q/q against the benchmark ${bench.toFixed(2)}%: closer to the first published figure?`,
        due: addDays(periodEnd(q), lag),
        forecast: { model: Number(mean.toFixed(4)), bench: Number(bench.toFixed(4)) },
      });
    }
  }
  return out;
}

/** The row model behind a predictor nowcast spec, or null when the spec is not one. */
export function rowModelFor(spec: ForecastSpec, forest?: (X: number[][], y: number[]) => RowModel | null): ((X: number[][], y: number[]) => RowModel | null) | null {
  if (spec.target === 'gdp_penalized_nowcast_q') {
    const kind: PenaltyKind = spec.params.penalty === 2 ? 'lasso' : 'ridge';
    return (X, y) => {
      const fit = fitPenalizedCv(X, y, kind);
      return 'error' in fit ? null : { predict: (x) => predictPenalized(fit, x), sd: fit.sigma };
    };
  }
  if (spec.target === 'gdp_forest_nowcast_q' && forest) return forest;
  return null;
}
