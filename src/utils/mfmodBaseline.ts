/**
 * The World Bank's public MFMod country models (World Bank country models plan, step M2): which
 * countries have one, and the model file's own baseline turned into the headline measures the
 * country page shows (src/components/WorldBankModelPanel.tsx).
 *
 * The baseline comes from the optional models service (models/service.py, /baseline) through
 * /api/mfmod/baseline. Every number is worked out from the model file's series with the formula
 * named beside it; a measure whose inputs are missing in a year is null for that year, never filled.
 *
 * Quarterly models (Croatia) are turned into years: flows (GDP, budget, current account) are summed
 * over the four quarters, prices and rates averaged, debt taken at the fourth quarter; a year with
 * fewer than four quarters is left out.
 *
 * Browser-safe.
 */

export const MFMOD_COUNTRIES = ['BOL', 'HRV', 'IRQ', 'NPL', 'PAK', 'TUR'] as const;
export type MfmodCountry = (typeof MFMOD_COUNTRIES)[number];

export function hasMfmodModel(iso3: string): iso3 is MfmodCountry {
  return (MFMOD_COUNTRIES as readonly string[]).includes(iso3.toUpperCase());
}

export type MfmodSeriesKey =
  | 'real_gdp'
  | 'nominal_gdp'
  | 'cpi'
  | 'gov_debt'
  | 'gov_balance'
  | 'gov_revenue'
  | 'gov_spending'
  | 'current_account_usd'
  | 'usd_rate'
  | 'policy_rate'
  | 'consumer_deflator';

export interface MfmodBaselineReply {
  on?: boolean;
  ready?: boolean;
  note?: string;
  source?: string;
  iso3?: string;
  periods?: string[];
  projectedFrom?: string;
  series?: Partial<Record<MfmodSeriesKey, { code: string; description?: string; values: Array<number | null> }>>;
  missing?: string[];
}

export type MfmodMeasure = 'growth' | 'inflation' | 'balance' | 'debt' | 'current_account' | 'policy_rate';

/** How each measure is worked out, in words (shown under the table). */
export const MEASURE_FORMULA: Record<MfmodMeasure, string> = {
  growth: 'real GDP, % change on the year before',
  inflation: 'consumer price index, % change on the year before; the private consumption deflator where the model does not fill the index',
  balance: 'general government balance / nominal GDP x 100',
  debt: 'general government gross debt / nominal GDP x 100',
  current_account: 'current account in US$ x LCU per US$ / nominal GDP x 100',
  policy_rate: 'policy interest rate, % (only where the model has one)',
};

/** Inputs each measure needs, for the Missing line. */
const NEEDS: Record<MfmodMeasure, MfmodSeriesKey[]> = {
  growth: ['real_gdp'],
  inflation: ['cpi'],
  balance: ['gov_balance', 'nominal_gdp'],
  debt: ['gov_debt', 'nominal_gdp'],
  current_account: ['current_account_usd', 'usd_rate', 'nominal_gdp'],
  policy_rate: ['policy_rate'],
};

const FLOWS = new Set<MfmodSeriesKey>(['real_gdp', 'nominal_gdp', 'gov_balance', 'gov_revenue', 'gov_spending', 'current_account_usd']);
const END_OF_YEAR = new Set<MfmodSeriesKey>(['gov_debt']);

export interface AnnualSeries {
  years: number[];
  values: Partial<Record<MfmodSeriesKey, Array<number | null>>>;
  /** First year of the model's own projection (the year the stored solve starts). */
  projectedFrom: number | null;
  quarterly: boolean;
}

const yearOf = (p: string): number | null => {
  const m = /^(\d{4})/.exec(p);
  return m ? Number(m[1]) : null;
};

/** The reply's periods as years; quarterly series turned into years as described above. */
export function toAnnual(reply: MfmodBaselineReply): AnnualSeries {
  const periods = reply.periods ?? [];
  const quarterly = periods.some((p) => /Q[1-4]$/.test(p));
  const series = reply.series ?? {};
  const projectedFrom = reply.projectedFrom ? yearOf(reply.projectedFrom) : null;
  if (!quarterly) {
    const years = periods.map(yearOf).filter((y): y is number => y !== null);
    const values: AnnualSeries['values'] = {};
    for (const [k, s] of Object.entries(series) as Array<[MfmodSeriesKey, { values: Array<number | null> }]>) values[k] = s.values.slice(0, years.length);
    return { years, values, projectedFrom, quarterly };
  }
  const byYear = new Map<number, number[]>();
  periods.forEach((p, i) => {
    const y = yearOf(p);
    if (y === null) return;
    byYear.set(y, [...(byYear.get(y) ?? []), i]);
  });
  const years = [...byYear.keys()].filter((y) => byYear.get(y)!.length === 4).sort((a, b) => a - b);
  const values: AnnualSeries['values'] = {};
  for (const [k, s] of Object.entries(series) as Array<[MfmodSeriesKey, { values: Array<number | null> }]>) {
    values[k] = years.map((y) => {
      const xs = byYear.get(y)!.map((i) => s.values[i]);
      if (xs.some((x) => x === null || x === undefined)) return null;
      const n = xs as number[];
      if (FLOWS.has(k)) return n.reduce((a, b) => a + b, 0);
      if (END_OF_YEAR.has(k)) return n[3];
      return n.reduce((a, b) => a + b, 0) / 4;
    });
  }
  return { years, values, projectedFrom, quarterly };
}

export interface MeasureRow {
  measure: MfmodMeasure;
  values: Array<number | null>;
}

export interface MfmodTable {
  years: number[];
  /** Which series inflation was worked out from; null when neither is there. */
  inflationFrom: 'cpi' | 'consumer_deflator' | null;
  projectedFrom: number | null;
  quarterly: boolean;
  rows: MeasureRow[];
  /** Measures the model cannot give, with the inputs it lacks. */
  missing: Array<{ measure: MfmodMeasure; lacks: MfmodSeriesKey[] }>;
}

const round1 = (x: number | null): number | null => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);

function pctChange(xs: Array<number | null>, i: number): number | null {
  const a = xs[i - 1];
  const b = xs[i];
  if (i === 0 || a === null || a === undefined || b === null || b === undefined || a === 0) return null;
  return (b / a - 1) * 100;
}

/** The headline measures for every year of the annual series. */
export function measures(a: AnnualSeries, opts: { round?: boolean; inflationFrom?: MfmodTable['inflationFrom'] } = {}): MfmodTable {
  const rnd = opts.round === false ? (x: number | null) => (x === null || !Number.isFinite(x) ? null : x) : round1;
  const v = a.values;
  const filled = (xs: Array<number | null> | undefined): boolean => Boolean(xs) && a.years.every((y, i) => a.projectedFrom === null || y < a.projectedFrom || (xs![i] !== null && xs![i] !== undefined));
  // Pakistan's model stops filling its consumer price index in 2017: inflation then comes from the private consumption deflator for every year, never a mix of the two.
  const inflationFrom: MfmodTable['inflationFrom'] = opts.inflationFrom !== undefined ? opts.inflationFrom : filled(v.cpi) ? 'cpi' : v.consumer_deflator ? 'consumer_deflator' : v.cpi ? 'cpi' : null;
  const prices = inflationFrom ? v[inflationFrom] : undefined;
  const at = (k: MfmodSeriesKey, i: number): number | null => v[k]?.[i] ?? null;
  const ratio = (num: MfmodSeriesKey, i: number): number | null => {
    const n = at(num, i);
    const g = at('nominal_gdp', i);
    return n === null || g === null || g === 0 ? null : (n / g) * 100;
  };
  const calc: Record<MfmodMeasure, (i: number) => number | null> = {
    growth: (i) => (v.real_gdp ? pctChange(v.real_gdp, i) : null),
    inflation: (i) => (prices ? pctChange(prices, i) : null),
    balance: (i) => ratio('gov_balance', i),
    debt: (i) => ratio('gov_debt', i),
    current_account: (i) => {
      const ca = at('current_account_usd', i);
      const fx = at('usd_rate', i);
      const g = at('nominal_gdp', i);
      return ca === null || fx === null || g === null || g === 0 ? null : ((ca * fx) / g) * 100;
    },
    policy_rate: (i) => at('policy_rate', i),
  };
  const rows: MeasureRow[] = [];
  const missing: MfmodTable['missing'] = [];
  for (const m of Object.keys(calc) as MfmodMeasure[]) {
    const lacks = m === 'inflation' ? (inflationFrom ? [] : (['cpi'] as MfmodSeriesKey[])) : NEEDS[m].filter((k) => !v[k]);
    const values = a.years.map((_, i) => rnd(calc[m](i)));
    if (lacks.length || values.every((x) => x === null)) {
      missing.push({ measure: m, lacks });
      continue;
    }
    rows.push({ measure: m, values });
  }
  return { years: a.years, inflationFrom, projectedFrom: a.projectedFrom, quarterly: a.quarterly, rows, missing };
}

/**
 * The years to show: the three before the projection starts, every projected year for ten years,
 * then every fifth year to the end. Indexes into table.years.
 */
export function shownYears(t: Pick<MfmodTable, 'years' | 'projectedFrom'>): number[] {
  const start = t.projectedFrom ?? t.years[0];
  return t.years
    .map((y, i) => ({ y, i }))
    .filter(({ y }) => y >= start - 3 && (y < start + 10 || (y - start) % 5 === 0 || y === t.years[t.years.length - 1]))
    .map(({ i }) => i);
}
