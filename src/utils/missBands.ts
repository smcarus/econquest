/**
 * Ranges from past forecast misses (R8). Two ranges, both built only from how far past forecasts
 * missed what came out, never from a model's own idea of its uncertainty:
 *
 * - IMF projection: for each past WEO edition saved in data/local/weo-vintages/, the projection for
 *   a year (this year or one or two years ahead) is set against the figure the newest saved edition
 *   gives as actual data for that year. Misses are grouped by how far ahead the projection was and
 *   by the edition's season (April-type editions, January to June; October-type, July to December),
 *   because an April projection for this year knows less than an October one. The range around the
 *   latest edition's projection is that projection plus the 15th to 85th (70% range) and 5th to
 *   95th (90% range) percentiles of the past misses for the same horizon and season, for this
 *   country only.
 * - The app's own forecasts: the same percentiles of the out-of-sample misses that the
 *   pre-registered evaluation recorded for this country at each tested horizon (forecastEval.ts).
 *
 * Fewer than MIN_MISS_CASES past misses reads Missing with the reason. Percentiles of a few dozen
 * misses are rough, the 90% range most of all; the count is always shown. Pure, browser-safe.
 */
import { WEO_VINTAGE_LABELS, vintageLabel, weoValueKind, type WeoVintageStore } from './weoVintages';

export const MIN_MISS_CASES = 8;
export const MISS_YEARS_AHEAD = [0, 1, 2] as const;
/** Percentiles kept: 5th, 15th, 85th, 95th. */
export const MISS_QUANTILES = [0.05, 0.15, 0.85, 0.95] as const;

/** Linear-interpolation percentile of an ascending list (q from 0 to 1). */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** The four kept percentiles of a list of misses (outcome minus forecast), rounded to 2 decimals. */
export function missQuantiles(misses: number[]): [number, number, number, number] {
  const s = [...misses].sort((a, b) => a - b);
  return MISS_QUANTILES.map((q) => r2(quantile(s, q))) as [number, number, number, number];
}

export type Season = 'april' | 'october';
export const seasonOf = (vintage: string): Season => (Number(vintage.slice(5, 7)) <= 6 ? 'april' : 'october');

export interface WeoMissCase {
  vintage: string;
  season: Season;
  yearsAhead: number;
  year: string;
  projected: number;
  actual: number;
  /** Actual minus projected: above 0 means the outcome came in higher than projected. */
  miss: number;
  /** Edition the actual figure is taken from. */
  actualFrom: string;
}

/**
 * Every past projection with an outturn: for each edition, each year 0 to 2 years ahead of the
 * edition's year that it projects, against the newest later edition that gives that year as actual.
 */
export function weoMissCases(store: WeoVintageStore | null | undefined, iso3: string, code: string): WeoMissCase[] {
  const iso = String(iso3 || '').toUpperCase();
  const eds = (store?.editions || []).filter((e) => e.rows[iso]?.[code]);
  const actualOf = (year: string, after: string): { value: number; from: string } | null => {
    for (let i = eds.length - 1; i >= 0; i--) {
      const e = eds[i];
      if (e.vintage <= after) break;
      const row = e.rows[iso][code];
      const v = row.years[year];
      if (typeof v === 'number' && weoValueKind(e, row, year) === 'actual') return { value: v, from: e.vintage };
    }
    return null;
  };
  const out: WeoMissCase[] = [];
  for (const e of eds) {
    const row = e.rows[iso][code];
    const y0 = Number(e.vintage.slice(0, 4));
    for (const k of MISS_YEARS_AHEAD) {
      const year = String(y0 + k);
      const p = row.years[year];
      if (typeof p !== 'number' || weoValueKind(e, row, year) !== 'projection') continue;
      const a = actualOf(year, e.vintage);
      if (!a) continue;
      out.push({ vintage: e.vintage, season: seasonOf(e.vintage), yearsAhead: k, year, projected: p, actual: a.value, miss: r2(a.value - p), actualFrom: a.from });
    }
  }
  return out;
}

export interface MissRange {
  /** 70% range (15th to 85th percentile of past misses added to the forecast). */
  lo70: number;
  hi70: number;
  /** 90% range (5th to 95th). */
  lo90: number;
  hi90: number;
  /** Average past miss: above 0 means outcomes tended to come in above the forecast. */
  meanMiss: number;
  cases: number;
}

/** The range around `forecast` from past misses; null when there are fewer than MIN_MISS_CASES. */
export function rangeFromMisses(forecast: number, misses: number[]): MissRange | null {
  if (misses.length < MIN_MISS_CASES) return null;
  const [q05, q15, q85, q95] = missQuantiles(misses);
  return rangeFromQuantiles(forecast, [q05, q15, q85, q95], misses.length, misses.reduce((a, b) => a + b, 0) / misses.length);
}

export function rangeFromQuantiles(forecast: number, q: readonly [number, number, number, number], cases: number, meanMiss: number): MissRange {
  return { lo90: r2(forecast + q[0]), lo70: r2(forecast + q[1]), hi70: r2(forecast + q[2]), hi90: r2(forecast + q[3]), meanMiss: r2(meanMiss), cases };
}

export interface WeoMissRow {
  year: string;
  yearsAhead: number;
  projection: number;
  range?: MissRange;
  /** First and last edition whose misses were used. */
  span?: { from: string; to: string };
  /** Why there is no range (English), with `cases` past misses found. */
  reason?: string;
  cases?: number;
}

export interface WeoMissReply {
  iso3: string;
  code: string;
  label: string;
  /** Latest edition holding the series, whose projections get the ranges. */
  edition: string | null;
  editionLabel: string | null;
  season: Season | null;
  rows: WeoMissRow[];
  /** Why there is nothing at all (English), and the same as a code for the screen. */
  reason?: string;
  why?: 'none_saved' | 'no_series' | 'no_years';
  source: string;
}

export const WEO_MISS_SOURCE = 'IMF World Economic Outlook, past editions you saved (data/local/weo-vintages/); ranges worked out by the app from past IMF misses';

/** Ranges around the latest saved edition's projections for one country and indicator. */
export function weoMissBands(store: WeoVintageStore | null | undefined, iso3: string, code: string): WeoMissReply {
  const iso = String(iso3 || '').toUpperCase();
  const label = WEO_VINTAGE_LABELS[code] ?? code;
  const base = { iso3: iso, code, label, source: WEO_MISS_SOURCE };
  const eds = (store?.editions || []).filter((e) => e.rows[iso]?.[code]);
  const last = eds[eds.length - 1];
  if (!last) {
    const saved = Boolean(store?.editions.length);
    const reason = saved ? 'no saved IMF WEO edition holds this series for this country' : 'no past IMF WEO editions are saved in data/local/weo-vintages/';
    return { ...base, edition: null, editionLabel: null, season: null, rows: [], reason, why: saved ? 'no_series' : 'none_saved' };
  }
  const season = seasonOf(last.vintage);
  const cases = weoMissCases(store, iso, code);
  const row = last.rows[iso][code];
  const y0 = Number(last.vintage.slice(0, 4));
  const rows: WeoMissRow[] = [];
  for (const k of MISS_YEARS_AHEAD) {
    const year = String(y0 + k);
    const p = row.years[year];
    if (typeof p !== 'number') continue;
    const past = cases.filter((c) => c.yearsAhead === k && c.season === season);
    const range = rangeFromMisses(p, past.map((c) => c.miss));
    if (range) rows.push({ year, yearsAhead: k, projection: p, range, span: { from: past[0].vintage, to: past[past.length - 1].vintage } });
    else rows.push({ year, yearsAhead: k, projection: p, cases: past.length, reason: `only ${past.length} past ${season === 'april' ? 'April' : 'October'}-type editions with an outturn for ${k === 0 ? 'the same year' : `${k} year${k > 1 ? 's' : ''} ahead`}; ${MIN_MISS_CASES} are needed` });
  }
  return { ...base, edition: last.vintage, editionLabel: vintageLabel(last.vintage), season, rows, ...(rows.length ? {} : { reason: 'the latest saved edition projects no year for this series', why: 'no_years' as const }) };
}

/** Per-country misses the evaluation kept for one horizon (HorizonScore.bySeries[].miss). */
export interface SeriesMiss {
  where: string;
  cases: number;
  miss?: [number, number, number, number];
  meanMiss?: number;
}

export interface AppMissStep {
  period: string;
  h: number;
  mean: number;
  range?: MissRange;
  /** Why there is no range (English), and the same as a code for the screen. */
  reason?: string;
  why?: 'not_run' | 'few' | 'old';
  cases?: number;
}

/**
 * Ranges on the app's own forecast path from the evaluation's recorded misses for this country.
 * `horizons` are the evaluation's horizons with their per-country misses; steps not tested read
 * Missing.
 */
export function appMissSteps(path: Array<{ period: string; mean: number }>, iso3: string, horizons: Array<{ h: number; bySeries: SeriesMiss[] }> | null, ranAt?: string): AppMissStep[] {
  const out: AppMissStep[] = [];
  path.forEach((p, i) => {
    const h = i + 1;
    const hs = horizons?.find((x) => x.h === h);
    if (!horizons) return void out.push({ period: p.period, h, mean: p.mean, why: 'not_run', reason: 'this forecast has not been through its out-of-sample test on this computer yet (npm run go -- --validate)' });
    if (!hs) return;
    const s = hs.bySeries.find((x) => x.where === iso3);
    if (!s || s.cases < MIN_MISS_CASES) return void out.push({ period: p.period, h, mean: p.mean, why: 'few', cases: s?.cases ?? 0, reason: `the test has ${s?.cases ?? 0} past forecasts for this country at this step; ${MIN_MISS_CASES} are needed` });
    if (!s.miss || s.meanMiss === undefined) return void out.push({ period: p.period, h, mean: p.mean, why: 'old', reason: `the saved test result${ranAt ? ` (${ranAt.slice(0, 10)})` : ''} predates these ranges; run npm run go -- --validate again` });
    out.push({ period: p.period, h, mean: p.mean, range: rangeFromQuantiles(p.mean, s.miss, s.cases, s.meanMiss) });
  });
  return out;
}

/** Evaluation result id for each app forecast. */
export const FORECAST_EVAL_ID: Record<string, string> = { gdp_qoq: 'gdp_forecast', cpi_yoy: 'cpi_forecast', policy_rate: 'policy_rate_forecast', debt_gdp: 'debt_forecast' };
