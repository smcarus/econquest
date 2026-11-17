/**
 * Inflation drivers (G26): headline against core inflation, and how much food and energy add, from
 * official consumer price sub-indices. One source per country, never mixed:
 *
 * - EU members: Eurostat HICP annual rates for all items, all items excluding energy, food, alcohol
 *   and tobacco (core), energy, and food including alcohol and tobacco. These three parts add up to
 *   all items, so with Eurostat's item weights (per mille, set each year) the contribution of each
 *   part is weight ÷ 1000 × its annual rate. That is an approximation of Eurostat's exact
 *   chain-linked contributions; the gap to headline is shown, never hidden.
 * - United States: BLS CPI for all urban consumers (not seasonally adjusted), all items, all items
 *   less food and energy, food, and energy, read from FRED; annual rates worked out from the indices
 *   12 months apart. The app does not read BLS relative importance weights, so contributions read
 *   Missing with the reason.
 * - Other OECD members: OECD consumer prices (via DBnomics), all items, all items less food and
 *   energy, food and non-alcoholic beverages, and energy, annual growth rates. No weights, so
 *   contributions read Missing.
 *
 * Countries none of these sources cover read Missing with the reason. A description, not a
 * forecast. Browser-safe, pure.
 */

export type DriverPart = 'headline' | 'core' | 'food' | 'energy';
export type DriverSource = 'eurostat' | 'bls' | 'oecd';

export interface MonthValue {
  period: string;
  value: number;
}

export interface DriverInputs {
  source: DriverSource;
  /** Annual rates, % y/y, by "YYYY-MM". */
  rates: Partial<Record<DriverPart, MonthValue[]>>;
  /** Item weights per mille by year (Eurostat only). */
  weights?: Partial<Record<'core' | 'food' | 'energy', Record<string, number>>>;
  /** Label of each part's series, for the source line. */
  labels: Partial<Record<DriverPart, string>>;
  /** What did not answer (part by part). */
  problems?: string[];
}

export interface DriverRow {
  period: string;
  headline?: number;
  core?: number;
  food?: number;
  energy?: number;
}

export interface Contributions {
  year: string;
  core: number;
  food: number;
  energy: number;
  /** headline minus the sum of the three parts, points (the approximation's error). */
  residual: number;
  weights: { core: number; food: number; energy: number };
}

export interface InflationDrivers {
  ok: true;
  source: DriverSource;
  latest: DriverRow & { period: string };
  yearAgo?: DriverRow;
  /** core minus headline, points, at the latest month with both. */
  coreGapPts?: number;
  /** Change in core over the last 3 months, points, and the stated rule. */
  coreChange3m?: { pts: number; trend: 'rising' | 'easing' | 'steady' };
  contributions?: Contributions;
  /** The last 24 months, newest last. */
  months: DriverRow[];
  missing: string[];
  method: string;
  sources: string[];
}

export type InflationDriversOutcome = InflationDrivers | { ok: false; reason: string };

export const DRIVERS_MONTHS = 24;
export const NO_DRIVER_SOURCE = 'No free source the app reads publishes consumer price sub-indices for this country (Eurostat covers EU members, BLS the United States, the OECD its other members)';
export const BLS_NO_WEIGHTS = 'Contributions: the app does not read the BLS relative importance weights, so how much food and energy add to headline is not worked out';
export const OECD_NO_WEIGHTS = 'Contributions: the OECD series the app reads carry no expenditure weights, so how much food and energy add to headline is not worked out';
export const DRIVERS_METHOD: Record<DriverSource, string> = {
  eurostat:
    'Eurostat HICP annual rates: all items; core = all items excluding energy, food, alcohol and tobacco; energy; food including alcohol and tobacco. Contribution of each part = item weight (per mille, that year) ÷ 1000 × its annual rate, an approximation of Eurostat\'s exact chain-linked contributions; the residual is shown. Core trend: up 0.5 points or more over 3 months = rising, down 0.5 or more = easing.',
  bls: 'BLS CPI-U, not seasonally adjusted, read from FRED: annual rates from the indices 12 months apart for all items, all items less food and energy (core), food, and energy. Core trend: up 0.5 points or more over 3 months = rising, down 0.5 or more = easing.',
  oecd: 'OECD consumer prices (via DBnomics), annual growth rates: all items, all items less food and energy (core), food and non-alcoholic beverages, energy. Core trend: up 0.5 points or more over 3 months = rising, down 0.5 or more = easing.',
};

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;
const PARTS: DriverPart[] = ['headline', 'core', 'food', 'energy'];

/** Annual rate % from a monthly index, 12 months apart. */
export function yoyFromIndex(index: MonthValue[]): MonthValue[] {
  const by = new Map(index.map((p) => [p.period, p.value]));
  const out: MonthValue[] = [];
  for (const p of index) {
    const y = Number(p.period.slice(0, 4));
    const prev = by.get(`${y - 1}${p.period.slice(4, 7)}`);
    if (prev && prev > 0) out.push({ period: p.period, value: r2((p.value / prev - 1) * 100) });
  }
  return out.sort((a, b) => a.period.localeCompare(b.period));
}

export function inflationDrivers(inp: DriverInputs): InflationDriversOutcome {
  const maps = Object.fromEntries(PARTS.map((k) => [k, new Map((inp.rates[k] || []).filter((p) => /^\d{4}-\d{2}/.test(p.period) && Number.isFinite(p.value)).map((p) => [p.period.slice(0, 7), p.value]))])) as Record<DriverPart, Map<string, number>>;
  if (!maps.headline.size) return { ok: false, reason: inp.problems?.length ? `Headline consumer prices did not answer: ${inp.problems.join('; ')}` : 'Headline consumer prices are not published for this country by the source the app reads' };
  const periods = [...maps.headline.keys()].sort();
  const row = (period: string): DriverRow => {
    const r: DriverRow = { period };
    for (const k of PARTS) {
      const v = maps[k].get(period);
      if (v !== undefined) r[k] = r2(v);
    }
    return r;
  };
  const months = periods.slice(-DRIVERS_MONTHS).map(row);
  const lp = periods[periods.length - 1];
  const latest = row(lp) as DriverRow & { period: string };
  const agoKey = `${Number(lp.slice(0, 4)) - 1}${lp.slice(4)}`;
  const yearAgo = maps.headline.has(agoKey) ? row(agoKey) : undefined;

  const missing: string[] = [];
  const names: Record<DriverPart, string> = { headline: 'Headline', core: 'Core (excluding food and energy)', food: 'Food', energy: 'Energy' };
  for (const k of ['core', 'food', 'energy'] as const) {
    if (!maps[k].size) missing.push(`${names[k]}: the source did not answer or publishes no such series for this country`);
    else if (latest[k] === undefined) {
      const last = [...maps[k].keys()].sort().pop()!;
      missing.push(`${names[k]}: not yet published for ${lp}; the newest month is ${last}`);
    }
  }

  // Core against headline, and the core trend, at the latest month core has.
  const coreMonths = [...maps.core.keys()].filter((m) => maps.headline.has(m)).sort();
  const cm = coreMonths[coreMonths.length - 1];
  const coreGapPts = cm ? r2(maps.core.get(cm)! - maps.headline.get(cm)!) : undefined;
  let coreChange3m: InflationDrivers['coreChange3m'];
  if (cm) {
    const y = Number(cm.slice(0, 4));
    const m = Number(cm.slice(5, 7)) - 3;
    const back = `${y + Math.floor((m - 1) / 12)}-${String(((m - 1 + 120) % 12) + 1).padStart(2, '0')}`;
    const b = maps.core.get(back);
    if (b !== undefined) {
      const pts = r2(maps.core.get(cm)! - b);
      coreChange3m = { pts, trend: pts >= 0.5 ? 'rising' : pts <= -0.5 ? 'easing' : 'steady' };
    }
  }

  let contributions: Contributions | undefined;
  if (inp.source === 'eurostat') {
    const yr = lp.slice(0, 4);
    const w = { core: inp.weights?.core?.[yr], food: inp.weights?.food?.[yr], energy: inp.weights?.energy?.[yr] };
    if (w.core !== undefined && w.food !== undefined && w.energy !== undefined && latest.core !== undefined && latest.food !== undefined && latest.energy !== undefined && latest.headline !== undefined) {
      const c = { core: r2((w.core / 1000) * latest.core), food: r2((w.food / 1000) * latest.food), energy: r2((w.energy / 1000) * latest.energy) };
      contributions = { year: yr, ...c, residual: r2(latest.headline - c.core - c.food - c.energy), weights: { core: w.core, food: w.food, energy: w.energy } };
    } else if (w.core === undefined || w.food === undefined || w.energy === undefined) missing.push(`Contributions: Eurostat item weights for ${yr} have not answered, so how much food and energy add to headline is not worked out`);
    else missing.push(`Contributions: needs all three parts for ${lp}`);
  } else missing.push(inp.source === 'bls' ? BLS_NO_WEIGHTS : OECD_NO_WEIGHTS);

  const sources = [...new Set(PARTS.map((k) => inp.labels[k]).filter((x): x is string => Boolean(x)))];
  if (contributions) sources.push('Eurostat HICP item weights (prc_hicp_inw)');
  return {
    ok: true,
    source: inp.source,
    latest,
    ...(yearAgo ? { yearAgo } : {}),
    ...(coreGapPts !== undefined ? { coreGapPts } : {}),
    ...(coreChange3m ? { coreChange3m } : {}),
    ...(contributions ? { contributions } : {}),
    months,
    missing,
    method: DRIVERS_METHOD[inp.source],
    sources,
  };
}

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export function driversSentence(r: InflationDrivers, name: string): string {
  const l = r.latest;
  let s = `${name}: headline inflation was ${l.headline!.toFixed(1)}% in ${l.period}`;
  s += l.core !== undefined ? ` and core inflation (excluding food and energy) ${l.core.toFixed(1)}%.` : '.';
  if (r.coreChange3m) s += ` Core is ${r.coreChange3m.trend} (${sg(r.coreChange3m.pts)} points over 3 months).`;
  const c = r.contributions;
  if (c) s += ` Of the headline rate, about ${sg(c.food)} points came from food, ${sg(c.energy)} from energy and ${sg(c.core)} from everything else.`;
  else if (l.food !== undefined && l.energy !== undefined) s += ` Over the year food prices changed by ${sg(l.food)}% and energy prices by ${sg(l.energy)}%.`;
  return s;
}

/* ------------------------------------------------------------------ sources */

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
/** Eurostat special aggregates: core, energy, food incl. alcohol and tobacco; with all items. */
export const EUROSTAT_PARTS: Record<DriverPart, { minr: string; manr: string }> = {
  headline: { minr: 'TOTAL', manr: 'CP00' },
  core: { minr: 'TOT_X_NRG_FOOD', manr: 'TOT_X_NRG_FOOD' },
  energy: { minr: 'NRG', manr: 'NRG' },
  food: { minr: 'FOOD', manr: 'FOOD' },
};
/** prc_hicp_minr (ECOICOP ver. 2) for one part and country. */
export const driversMinrUrl = (part: DriverPart, geo: string, since: string) =>
  `${EUROSTAT}/prc_hicp_minr?format=JSON&lang=EN&unit=RCH_A&coicop18=${EUROSTAT_PARTS[part].minr}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${since}`;
/** prc_hicp_manr (stopped at December 2025), the fallback for a part minr does not answer. */
export const driversManrUrl = (part: DriverPart, geo: string, since: string) =>
  `${EUROSTAT}/prc_hicp_manr?format=JSON&lang=EN&unit=RCH_A&coicop=${EUROSTAT_PARTS[part].manr}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${since}`;
/** HICP item weights, per mille, by year. */
export const driversWeightsUrl = (part: 'core' | 'food' | 'energy', geo: string, sinceYear: number) =>
  `${EUROSTAT}/prc_hicp_inw?format=JSON&lang=EN&coicop=${EUROSTAT_PARTS[part].manr}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${sinceYear}`;

/** BLS CPI-U, not seasonally adjusted, on FRED. */
export const BLS_FRED: Record<DriverPart, string> = { headline: 'CPIAUCNS', core: 'CPILFENS', food: 'CPIUFDNS', energy: 'CPIENGNS' };
/** OECD DF_PRICES_ALL expenditure codes. */
export const OECD_PARTS: Record<DriverPart, string> = { headline: '_T', core: '_TXCP01_NRG', food: 'CP01', energy: 'NRG' };

/** Yearly values from a JSON-stat reply with one series (geo and every other dimension filtered to one). */
export function parseEurostatYears(json: unknown): Record<string, number> {
  const j = json as { id?: string[]; size?: number[]; value?: Record<string, number> | number[]; dimension?: Record<string, { category?: { index?: Record<string, number> } }> };
  const out: Record<string, number> = {};
  if (!j?.id || !j.size || !j.value || !j.dimension) return out;
  const timeAt = j.id.indexOf('time');
  if (timeAt < 0 || j.size.some((n, i) => i !== timeAt && n !== 1)) return out;
  for (const [period, ti] of Object.entries(j.dimension.time?.category?.index || {})) {
    const v = (j.value as Record<string, number>)[String(ti)];
    if (typeof v === 'number' && Number.isFinite(v) && /^\d{4}$/.test(period)) out[period] = v;
  }
  return out;
}
