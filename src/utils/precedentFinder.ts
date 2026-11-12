/**
 * G34 Precedent finder: other countries whose situation in some past year matched the review
 * country's on figures the user picks (government debt, inflation, reserves, current account,
 * growth, primary balance), and what their figures did in the three years that followed.
 *
 * The matching rule is fixed and shown on screen:
 * - Figures are the yearly IMF WEO, IMF Fiscal Monitor and World Bank series saved in
 *   data/history/ (src/utils/officialHistory.ts). Only years before the review's As of year are
 *   read, so no IMF projection and nothing published after the As of day goes in.
 * - The review country is described by its newest year that has every chosen figure.
 * - A precedent is another country in a year from 1980 on that has every chosen figure and three
 *   later years before the As of year, so what followed can be read.
 * - Each figure is clipped at the 1st and 99th percentile of those country-years (so a
 *   hyperinflation does not swamp the scale), then standardised: minus its mean, divided by its
 *   standard deviation. The distance is the root mean square of the standardised differences.
 * - Each country counts once, in its closest year. The eight closest are shown, ties broken by
 *   country code and year.
 *
 * Description, not a tested signal: it says what happened to similar countries, not what will
 * happen here. IMF programmes (MONA) and crisis dates (Laeven-Valencia) read Missing until their
 * terms are confirmed (docs/DATA_LICENCES.md).
 *
 * Browser-safe; the server hands in the saved histories.
 */

export const PRECEDENT_FEATURES = ['debt_gdp', 'cpi_imf', 'reserves_months', 'current_account', 'gdp_growth', 'primary_balance'] as const;
export type PrecedentFeature = (typeof PRECEDENT_FEATURES)[number];
export const DEFAULT_PRECEDENT_FEATURES: PrecedentFeature[] = ['debt_gdp', 'cpi_imf', 'reserves_months', 'current_account'];
export const PRECEDENT_HORIZON = 3;
export const MAX_PRECEDENTS = 8;
export const MIN_FEATURES = 2;
export const FIRST_YEAR = 1980;
export const PRECEDENT_METHOD_VERSION = 'precedents-v1';

/** What followed, read for each precedent from its own saved history. */
export const PRECEDENT_OUTCOMES = ['growth_avg', 'inflation_after', 'debt_change', 'primary_change', 'current_account_after', 'reserves_after', 'currency_change'] as const;
export type PrecedentOutcome = (typeof PRECEDENT_OUTCOMES)[number];

/** Where each figure comes from (the series ids in src/utils/officialHistory.ts). */
export const PRECEDENT_SOURCES: Record<PrecedentFeature | 'fx_lcu_usd', string> = {
  debt_gdp: 'IMF WEO (GGXWDG_NGDP)',
  cpi_imf: 'IMF WEO (PCPIPCH)',
  reserves_months: 'World Bank (FI.RES.TOTL.MO)',
  current_account: 'World Bank (BN.CAB.XOKA.GD.ZS)',
  gdp_growth: 'IMF WEO (NGDP_RPCH)',
  primary_balance: 'IMF Fiscal Monitor (GGXONLB_G01_GDP_PT)',
  fx_lcu_usd: 'World Bank (PA.NUS.FCRF)',
};

export interface HistoryInput {
  iso3: string;
  name: string;
  /** Series id -> yearly points (date YYYY). */
  series: Record<string, { points: Array<{ date: string; value: number }> } | undefined>;
}

export interface PrecedentMatch {
  iso3: string;
  name: string;
  year: number;
  /** Root mean square of the standardised differences; 0 is identical. */
  distance: number;
  values: Partial<Record<PrecedentFeature, number>>;
  /** Null when a year needed for it is not in the saved history. */
  outcomes: Record<PrecedentOutcome, number | null>;
}

export interface PrecedentScale {
  lo: number;
  hi: number;
  mean: number;
  sd: number;
}

export interface PrecedentResult {
  methodVersion: string;
  iso3: string;
  asOf: string;
  features: PrecedentFeature[];
  /** Years before this one are read. */
  lastYear: number;
  target: { year: number; values: Partial<Record<PrecedentFeature, number>> } | null;
  /** Why there is no result: the chosen figures the review country has no year for, or too few figures chosen. */
  missing?: { reason: 'too_few_features' | 'no_history' | 'no_target_year' | 'no_pool'; features?: PrecedentFeature[] };
  matches: PrecedentMatch[];
  /** Median of each outcome over the matches that have it. */
  summary: Record<PrecedentOutcome, { median: number | null; n: number }>;
  pool: { countries: number; countryYears: number };
  scale: Partial<Record<PrecedentFeature, PrecedentScale>>;
}

/** Known feature ids from a comma list, in the fixed order; the defaults when none is known. */
export function parseFeatures(raw: unknown): PrecedentFeature[] {
  const want = new Set(String(raw ?? '').split(',').map((s) => s.trim()));
  const ids = PRECEDENT_FEATURES.filter((f) => want.has(f));
  return ids.length ? ids : [...DEFAULT_PRECEDENT_FEATURES];
}

type Years = Map<number, number>;

function yearsOf(h: HistoryInput, id: string, lastYear: number): Years {
  const out: Years = new Map();
  for (const p of h.series[id]?.points || []) {
    const y = Number(p.date.slice(0, 4));
    if (Number.isInteger(y) && y < lastYear && Number.isFinite(p.value)) out.set(y, p.value);
  }
  return out;
}

/** Nearest-rank percentile of sorted values. */
function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

const round = (v: number, d = 2) => Number(v.toFixed(d));

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

function outcomesFor(get: (id: string) => Years, y: number): Record<PrecedentOutcome, number | null> {
  const H = PRECEDENT_HORIZON;
  const at = (id: string, year: number) => get(id).get(year);
  const growth = Array.from({ length: H }, (_, i) => at('gdp_growth', y + i + 1));
  const diff = (id: string) => {
    const a = at(id, y);
    const b = at(id, y + H);
    return a === undefined || b === undefined ? null : round(b - a);
  };
  const fxA = at('fx_lcu_usd', y);
  const fxB = at('fx_lcu_usd', y + H);
  const after = (id: string) => {
    const v = at(id, y + H);
    return v === undefined ? null : round(v);
  };
  return {
    growth_avg: growth.every((g) => g !== undefined) ? round((growth as number[]).reduce((s, g) => s + g, 0) / H) : null,
    inflation_after: after('cpi_imf'),
    debt_change: diff('debt_gdp'),
    primary_change: diff('primary_balance'),
    current_account_after: after('current_account'),
    reserves_after: after('reserves_months'),
    // Local currency per US dollar: a rise means the currency got weaker.
    currency_change: fxA !== undefined && fxB !== undefined && fxA > 0 ? round((fxB / fxA - 1) * 100, 1) : null,
  };
}

function emptySummary(): PrecedentResult['summary'] {
  return Object.fromEntries(PRECEDENT_OUTCOMES.map((o) => [o, { median: null, n: 0 }])) as PrecedentResult['summary'];
}

/** The precedents for one country as of a day. The same histories, figures and day give the same result. */
export function findPrecedents(iso3: string, asOf: string, features: PrecedentFeature[], histories: HistoryInput[]): PrecedentResult {
  const lastYear = Number(asOf.slice(0, 4));
  const base: PrecedentResult = { methodVersion: PRECEDENT_METHOD_VERSION, iso3, asOf, features, lastYear, target: null, matches: [], summary: emptySummary(), pool: { countries: 0, countryYears: 0 }, scale: {} };
  if (features.length < MIN_FEATURES) return { ...base, missing: { reason: 'too_few_features' } };
  const own = histories.find((h) => h.iso3 === iso3);
  if (!own) return { ...base, missing: { reason: 'no_history' } };

  const cache = new Map<string, Years>();
  const get = (h: HistoryInput) => (id: string) => {
    const k = `${h.iso3}:${id}`;
    if (!cache.has(k)) cache.set(k, yearsOf(h, id, lastYear));
    return cache.get(k)!;
  };

  // The review country: its newest year with every chosen figure.
  const ownGet = get(own);
  const ownYears = [...ownGet(features[0]).keys()].filter((y) => features.every((f) => ownGet(f).has(y))).sort((a, b) => b - a);
  if (!ownYears.length) return { ...base, missing: { reason: 'no_target_year', features: features.filter((f) => !ownGet(f).size) } };
  const targetYear = ownYears[0];
  const targetRaw = Object.fromEntries(features.map((f) => [f, ownGet(f).get(targetYear)!])) as Record<PrecedentFeature, number>;
  const target = { year: targetYear, values: Object.fromEntries(features.map((f) => [f, round(targetRaw[f])])) };

  // The pool: every other country-year with every figure and three later years before the As of year.
  const pool: Array<{ h: HistoryInput; year: number; raw: Record<PrecedentFeature, number> }> = [];
  for (const h of histories) {
    if (h.iso3 === iso3) continue;
    const g = get(h);
    for (const y of g(features[0]).keys()) {
      if (y < FIRST_YEAR || y + PRECEDENT_HORIZON >= lastYear) continue;
      if (!features.every((f) => g(f).has(y))) continue;
      pool.push({ h, year: y, raw: Object.fromEntries(features.map((f) => [f, g(f).get(y)!])) as Record<PrecedentFeature, number> });
    }
  }
  if (!pool.length) return { ...base, target, missing: { reason: 'no_pool' } };

  const scale: Partial<Record<PrecedentFeature, PrecedentScale>> = {};
  for (const f of features) {
    const sorted = pool.map((p) => p.raw[f]).sort((a, b) => a - b);
    const lo = percentile(sorted, 1);
    const hi = percentile(sorted, 99);
    const clipped = sorted.map((v) => Math.min(hi, Math.max(lo, v)));
    const mean = clipped.reduce((s, v) => s + v, 0) / clipped.length;
    const sd = Math.sqrt(clipped.reduce((s, v) => s + (v - mean) ** 2, 0) / clipped.length);
    scale[f] = { lo: round(lo), hi: round(hi), mean: round(mean, 3), sd: round(sd, 3) };
  }
  const z = (f: PrecedentFeature, v: number) => {
    const s = scale[f]!;
    return s.sd > 0 ? (Math.min(s.hi, Math.max(s.lo, v)) - s.mean) / s.sd : 0;
  };
  const targetZ = Object.fromEntries(features.map((f) => [f, z(f, targetRaw[f])])) as Record<PrecedentFeature, number>;

  // Each country once, in its closest year.
  const best = new Map<string, { h: HistoryInput; year: number; d: number; raw: Record<PrecedentFeature, number> }>();
  for (const p of pool) {
    const d = Math.sqrt(features.reduce((s, f) => s + (z(f, p.raw[f]) - targetZ[f]) ** 2, 0) / features.length);
    const prev = best.get(p.h.iso3);
    if (!prev || d < prev.d || (d === prev.d && p.year < prev.year)) best.set(p.h.iso3, { h: p.h, year: p.year, d, raw: p.raw });
  }
  const ranked = [...best.values()].sort((a, b) => a.d - b.d || (a.h.iso3 < b.h.iso3 ? -1 : a.h.iso3 > b.h.iso3 ? 1 : 0) || a.year - b.year).slice(0, MAX_PRECEDENTS);
  const matches: PrecedentMatch[] = ranked.map((m) => ({
    iso3: m.h.iso3,
    name: m.h.name,
    year: m.year,
    distance: round(m.d, 3),
    values: Object.fromEntries(features.map((f) => [f, round(m.raw[f])])),
    outcomes: outcomesFor(get(m.h), m.year),
  }));
  const summary = Object.fromEntries(
    PRECEDENT_OUTCOMES.map((o) => {
      const xs = matches.map((m) => m.outcomes[o]).filter((v): v is number => v !== null);
      return [o, { median: median(xs), n: xs.length }];
    }),
  ) as PrecedentResult['summary'];
  return { ...base, target, matches, summary, pool: { countries: new Set(pool.map((p) => p.h.iso3)).size, countryYears: pool.length }, scale };
}
