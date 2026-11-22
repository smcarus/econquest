/**
 * Forecast evaluation on data as it was first published (real time), not on today's revised figures.
 *
 * The other evaluations (forecastEval.ts) use today's figures with each series' release lag, a
 * "pseudo real-time" test: the model never sees a period before it was out, but it sees that period
 * as later revised. Revisions to GDP in particular are large, so a model can look better (or worse)
 * than it would have been. These evaluations rebuild, for each forecast origin, the series exactly as
 * it was published on that day, fit the same model on it, and score the forecast against the
 * target period's FIRST published figure, the number a forecaster of the time would have been judged on
 * (Croushore and Stark 2001, "A real-time data set for macroeconomists", Journal of Econometrics 105).
 *
 * Two sources, both read as rows of (period, value, published from, published to):
 * - Monthly and quarterly vintages: ALFRED for the US (alfredVintages.ts, needs the user's FRED key)
 *   and the ECB Real-Time Database for the euro area (ecbRealTime.ts).
 *   Origins: the day each new period was first published. On that day the newest period has just
 *   come out; the model forecasts the periods after it.
 * - Yearly: past IMF WEO editions saved in data/local/weo-vintages/ (weoVintages.ts), every country.
 *   Origins: each edition. The series is the years the edition marks as actual data; the IMF's own
 *   projection in that edition for the same year is reported beside the verdict, never used for it.
 *
 * Pure: the caller hands in the rows. Nothing is filled in: a period without a published figure on
 * the day is a gap, and the model fits only the unbroken run that ends at the newest period.
 */
import type { AlfredDef, AlfredRow } from './alfredVintages';
import { fitAr, forecastAr } from './forecastModels';
import { allBenchmarks, benchmark, type ForecastCase, type ForecastSpec } from './forecastEval';
import { weoValueKind, type WeoVintageStore } from './weoVintages';

export interface VintageSeriesInput {
  /** Area code shown in the results (USA, EA). */
  where: string;
  def: AlfredDef;
  rows: AlfredRow[];
}

/** Rows of one series indexed by period for fast "value on day" lookups. */
export interface VintageIndex {
  def: AlfredDef;
  byDate: Map<string, AlfredRow[]>;
  periods: string[];
}

export function indexVintages(def: AlfredDef, rows: AlfredRow[]): VintageIndex {
  const byDate = new Map<string, AlfredRow[]>();
  for (const r of rows) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }
  return { def, byDate, periods: [...byDate.keys()].sort() };
}

const shiftMonths = (date: string, months: number) => {
  const [y, m] = date.split('-').map(Number);
  const t = y * 12 + (m - 1) + months;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01`;
};

function rawOn(ix: VintageIndex, date: string, day: string): number | undefined {
  const list = ix.byDate.get(date);
  if (!list) return undefined;
  for (const r of list) if (r.from <= day && day <= r.to) return r.value;
  return undefined;
}

/** A period's figure (after the series' transform) as published on `day`; undefined when not out. */
export function figureAsOf(ix: VintageIndex, date: string, day: string): number | undefined {
  const v = rawOn(ix, date, day);
  if (v === undefined) return undefined;
  const t = ix.def.transform;
  if (t === 'level') return v;
  const p = rawOn(ix, shiftMonths(date, t === 'yoy' ? -12 : -3), day);
  if (p === undefined || p === 0) return undefined;
  return t === 'qoq_ann' ? (Math.pow(v / p, 4) - 1) * 100 : (v / p - 1) * 100;
}

/** The step between periods: 3 months for quarterly series, 1 for monthly. */
const stepOf = (def: AlfredDef) => (def.freq === 'quarterly' ? 3 : 1);

/** The unbroken run of figures, as published on `day`, that ends at the newest period out then. */
export function seriesAsOf(ix: VintageIndex, day: string): { dates: string[]; values: number[] } {
  const step = stepOf(ix.def);
  const dates: string[] = [];
  const values: number[] = [];
  let i = ix.periods.length - 1;
  while (i >= 0 && figureAsOf(ix, ix.periods[i], day) === undefined) i--;
  if (i < 0) return { dates, values };
  let d = ix.periods[i];
  for (;;) {
    const v = figureAsOf(ix, d, day);
    if (v === undefined) break;
    dates.unshift(d);
    values.unshift(v);
    d = shiftMonths(d, -step);
  }
  return { dates, values };
}

/** The first figure published for a period (raw value and, for growth rates, the earlier period on that day). */
export function firstRelease(ix: VintageIndex, date: string): { day: string; value: number } | undefined {
  const t = ix.def.transform;
  const back = t === 'level' ? null : shiftMonths(date, t === 'yoy' ? -12 : -3);
  const days = new Set<string>();
  for (const r of ix.byDate.get(date) || []) days.add(r.from);
  for (const day of [...days].sort()) {
    const v = figureAsOf(ix, date, day);
    if (v !== undefined) return { day, value: v };
  }
  // A growth rate whose earlier period came out later than the period itself (rare): first day both are out.
  if (back) {
    for (const r of (ix.byDate.get(back) || []).slice().sort((a, b) => (a.from < b.from ? -1 : 1))) {
      const v = figureAsOf(ix, date, r.from);
      if (v !== undefined) return { day: r.from, value: v };
    }
  }
  return undefined;
}

/** Period key in the app's style (2024-Q3, 2024-07) for a vintage date (2024-07-01). */
export function periodKeyOf(def: AlfredDef, date: string): string {
  const [y, m] = date.split('-').map(Number);
  return def.freq === 'quarterly' ? `${y}-Q${Math.floor((m - 1) / 3) + 1}` : `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Real-time cases for a monthly or quarterly series. At each origin (the day a new newest period was
 * first published, from spec.sample.from on), the AR of spec.params is fitted on the series as
 * published that day (the last `window` periods when window > 0) and scored at each horizon against
 * the target period's first published figure. The benchmark is computed on the same vintage.
 */
export function realTimeCases(inputs: VintageSeriesInput[], spec: Pick<ForecastSpec, 'params' | 'benchmark' | 'horizons' | 'sample'>): ForecastCase[] {
  const maxLag = spec.params.maxLag ?? 4;
  const d = (spec.params.d ?? 0) as 0 | 1;
  const intercept = (spec.params.intercept ?? 1) !== 0;
  const window = spec.params.window ?? 0;
  const minTrain = spec.params.minTrain ?? 40;
  const maxH = Math.max(...spec.horizons);
  const out: ForecastCase[] = [];
  for (const inp of inputs) {
    const ix = indexVintages(inp.def, inp.rows);
    const step = stepOf(inp.def);
    const season = inp.def.freq === 'quarterly' ? 4 : 12;
    const firsts = new Map<string, { day: string; value: number }>();
    for (const p of ix.periods) {
      const f = firstRelease(ix, p);
      if (f) firsts.set(p, f);
    }
    // Origins: each day a period was first published, in date order; one origin per day.
    const originDays = [...new Set([...firsts.values()].map((f) => f.day))].sort();
    for (const day of originDays) {
      const s = seriesAsOf(ix, day);
      if (!s.dates.length) continue;
      const last = s.dates[s.dates.length - 1];
      const origin = periodKeyOf(inp.def, last);
      if (origin < spec.sample.from || (spec.sample.to && origin > spec.sample.to)) continue;
      if (s.values.length < minTrain) continue;
      const train = window > 0 ? s.values.slice(-window) : s.values;
      const fit = fitAr(train, { maxLag, d, intercept });
      if ('error' in fit) continue;
      const f = forecastAr(fit, train, maxH);
      for (const h of spec.horizons) {
        const target = shiftMonths(last, h * step);
        const actual = firsts.get(target);
        if (!actual) continue;
        out.push({
          where: inp.where,
          origin,
          target: periodKeyOf(inp.def, target),
          h,
          actual: actual.value,
          model: f[h - 1],
          bench: benchmark(spec.benchmark, train, h, season),
          others: allBenchmarks(train, h, season),
        });
      }
    }
  }
  return out;
}

/**
 * Real-time cases from past WEO editions (yearly, every country the editions cover). At each edition
 * from spec.sample.from (YYYY-MM) on, the series is the unbroken run of years the edition marks as
 * actual data for `code`; the AR is fitted on it and forecasts 1..h years after the last actual year.
 * Each forecast is scored against the first edition that marks the target year as actual. The IMF's
 * own projection for the target year in the origin edition is kept as `others.imf` (reported only).
 */
export function weoRealTimeCases(store: WeoVintageStore, code: string, spec: Pick<ForecastSpec, 'params' | 'benchmark' | 'horizons' | 'sample'>, keep: (iso3: string) => boolean = () => true): ForecastCase[] {
  const maxLag = spec.params.maxLag ?? 2;
  const intercept = (spec.params.intercept ?? 1) !== 0;
  const window = spec.params.window ?? 0;
  const minTrain = spec.params.minTrain ?? 15;
  const maxH = Math.max(...spec.horizons);
  const editions = store.editions.slice().sort((a, b) => (a.vintage < b.vintage ? -1 : 1));
  // First edition that marks each country-year as actual data.
  const firstActual = new Map<string, number>();
  for (const e of editions) {
    for (const [iso, codes] of Object.entries(e.rows)) {
      const row = codes[code];
      if (!row) continue;
      for (const [y, v] of Object.entries(row.years)) {
        const k = `${iso}|${y}`;
        if (!firstActual.has(k) && typeof v === 'number' && Number.isFinite(v) && weoValueKind(e, row, y) === 'actual') firstActual.set(k, v);
      }
    }
  }
  const out: ForecastCase[] = [];
  for (const e of editions) {
    if (e.vintage < spec.sample.from || (spec.sample.to && e.vintage > spec.sample.to)) continue;
    for (const [iso, codes] of Object.entries(e.rows)) {
      if (!keep(iso)) continue;
      const row = codes[code];
      if (!row) continue;
      const actualYears = Object.keys(row.years)
        .filter((y) => Number.isFinite(row.years[y]) && weoValueKind(e, row, y) === 'actual')
        .map(Number)
        .sort((a, b) => a - b);
      if (!actualYears.length) continue;
      const lastYear = actualYears[actualYears.length - 1];
      const values: number[] = [];
      for (let y = lastYear; row.years[String(y)] !== undefined && Number.isFinite(row.years[String(y)]) && weoValueKind(e, row, String(y)) === 'actual'; y--) values.unshift(row.years[String(y)]);
      if (values.length < minTrain) continue;
      const train = window > 0 ? values.slice(-window) : values;
      const fit = fitAr(train, { maxLag, d: 0, intercept });
      if ('error' in fit) continue;
      const f = forecastAr(fit, train, maxH);
      for (const h of spec.horizons) {
        const target = String(lastYear + h);
        const actual = firstActual.get(`${iso}|${target}`);
        if (actual === undefined) continue;
        const imf = row.years[target];
        out.push({
          where: iso,
          origin: e.vintage,
          target,
          h,
          actual,
          model: f[h - 1],
          bench: benchmark(spec.benchmark, train, h, 1),
          others: { ...allBenchmarks(train, h, 1), ...(Number.isFinite(imf) ? { imf } : {}) },
        });
      }
    }
  }
  return out;
}
