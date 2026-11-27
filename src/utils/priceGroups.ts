/**
 * What this means for you (plan step PY1): the official consumer price groups for one country, each
 * with its annual rate month by month and, where the source publishes them, the official basket
 * weights. One source per country, never mixed:
 *
 * - EU members: Eurostat HICP by main group (COICOP divisions). Since January 2026 Eurostat
 *   publishes the 2018 classification (prc_hicp_minr, 13 groups); the older one (prc_hicp_manr,
 *   12 groups) stopped at December 2025 and is used only when the newer one does not answer. The
 *   weights (prc_hicp_inw, per mille, set each year) are read in the same classification as the
 *   rates; when that classification has no weights the weights read Missing, never borrowed from
 *   the other one, because some groups changed content.
 * - Other countries with the IMF consumer price groups switched on (IMF_CPI_GROUPS=on after the
 *   Mac check, src/utils/imfCpiGroups.ts): the groups as the IMF names them.
 * - Otherwise the three parts the app already reads for Inflation drivers (food, energy and
 *   everything else, src/utils/inflationDrivers.ts). Those sources carry no weights, so the split
 *   is yours to enter.
 *
 * A country none of these cover reads Missing with the reason. A description, not a forecast.
 * Browser-safe, pure.
 */
import type { MonthValue } from './inflationDrivers';

export type GroupSource = 'eurostat' | 'imf' | 'parts';
export type GroupClassification = 'coicop2018' | 'ecoicop' | 'imf' | 'parts';

export interface PriceGroup {
  /** CP01..CP13 for a COICOP division; food, energy or rest for the three parts. */
  id: string;
  /** As the source names it (English). */
  label: string;
  /** Annual rates, % y/y, oldest first. */
  rates: MonthValue[];
  /** Official basket weight, % of the basket, for weightsYear. */
  weightPct?: number;
}

export interface PriceGroupsData {
  ok: true;
  iso3: string;
  source: GroupSource;
  classification: GroupClassification;
  /** Headline annual rate, % y/y, oldest first (the published all-items figure). */
  headline: MonthValue[];
  groups: PriceGroup[];
  /** The year the official weights are for, when there are any. */
  weightsYear?: string;
  weightsSource?: string;
  /** Why the weights or a group are not there. */
  missing: string[];
  sources: string[];
  method: string;
}

export type PriceGroupsOutcome = PriceGroupsData | { ok: false; reason: string };

/** Months kept per group (two years for the chart, plus one). */
export const GROUP_MONTHS = 25;

export const NO_GROUP_SOURCE =
  'No free source the app reads publishes consumer price groups for this country: Eurostat covers EU members, BLS the United States and the OECD its other members (food, energy and the rest). The IMF consumer price groups for other countries are switched on after a check on a computer that can reach the IMF.';
export const NO_WEIGHTS_PARTS = 'Official weights: the source the app reads for this country publishes no basket weights, so the split starts empty and is yours to enter.';

/** COICOP 2018 divisions as Eurostat names them in the HICP from 2026. */
export const COICOP2018: Record<string, string> = {
  CP01: 'Food and non-alcoholic beverages',
  CP02: 'Alcoholic beverages, tobacco and narcotics',
  CP03: 'Clothing and footwear',
  CP04: 'Housing, water, electricity, gas and other fuels',
  CP05: 'Furnishings, household equipment and routine household maintenance',
  CP06: 'Health',
  CP07: 'Transport',
  CP08: 'Information and communication',
  CP09: 'Recreation, sport and culture',
  CP10: 'Education services',
  CP11: 'Restaurants and accommodation services',
  CP12: 'Insurance and financial services',
  CP13: 'Personal care, social protection and miscellaneous goods and services',
};
/** ECOICOP (COICOP 1999) divisions, the HICP's classification to December 2025 and the IMF's. */
export const ECOICOP: Record<string, string> = {
  CP01: 'Food and non-alcoholic beverages',
  CP02: 'Alcoholic beverages, tobacco and narcotics',
  CP03: 'Clothing and footwear',
  CP04: 'Housing, water, electricity, gas and other fuels',
  CP05: 'Furnishings, household equipment and routine household maintenance',
  CP06: 'Health',
  CP07: 'Transport',
  CP08: 'Communications',
  CP09: 'Recreation and culture',
  CP10: 'Education',
  CP11: 'Restaurants and hotels',
  CP12: 'Miscellaneous goods and services',
};
export const PARTS_GROUPS: Record<'food' | 'energy' | 'rest', string> = {
  food: 'Food',
  energy: 'Energy',
  rest: 'Everything else (core)',
};

export const GROUPS_METHOD: Record<GroupSource, string> = {
  eurostat:
    'Eurostat HICP annual rates by main group (COICOP division) and the official item weights (per mille, set each year), in the same classification. Your rate = each group\'s annual rate × your share of spending in it, added up. The official basket worked out the same way differs a little from the published headline because Eurostat chain-links the index; the difference is shown.',
  imf: 'IMF consumer price index by main group, annual rates, and the official weights where the IMF publishes them. Your rate = each group\'s annual rate × your share of spending in it, added up.',
  parts:
    'Annual rates for food, energy and everything else (core) from the source the app reads for Inflation drivers. Your rate = each part\'s annual rate × your share of spending in it, added up. The sources publish no weights, so there is no official split to start from.',
};

/* ------------------------------------------------------------------ Eurostat */

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const repeat = (param: string, codes: string[]) => codes.map((c) => `&${param}=${c}`).join('');

/** prc_hicp_minr (2018 classification): every group and all items in one request. */
export const groupsMinrUrl = (geo: string, since: string) =>
  `${EUROSTAT}/prc_hicp_minr?format=JSON&lang=EN&unit=RCH_A${repeat('coicop18', ['TOTAL', ...Object.keys(COICOP2018)])}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${since}`;
/** prc_hicp_manr (older classification, to December 2025). */
export const groupsManrUrl = (geo: string, since: string) =>
  `${EUROSTAT}/prc_hicp_manr?format=JSON&lang=EN&unit=RCH_A${repeat('coicop', ['CP00', ...Object.keys(ECOICOP)])}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${since}`;
/** prc_hicp_inw item weights, per mille, in the classification the rates came in. */
export const groupsWeightsUrl = (classification: 'coicop2018' | 'ecoicop', geo: string, sinceYear: number) =>
  classification === 'coicop2018'
    ? `${EUROSTAT}/prc_hicp_inw?format=JSON&lang=EN${repeat('coicop18', Object.keys(COICOP2018))}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${sinceYear}`
    : `${EUROSTAT}/prc_hicp_inw?format=JSON&lang=EN${repeat('coicop', Object.keys(ECOICOP))}&geo=${encodeURIComponent(geo)}&sinceTimePeriod=${sinceYear}`;

type JsonStat = { id?: string[]; size?: number[]; value?: Record<string, number> | number[]; dimension?: Record<string, { category?: { index?: Record<string, number> | string[] } }> };

/**
 * A JSON-stat reply with one category dimension (coicop or coicop18) and time, every other dimension
 * filtered to one: values by category, then by period. Empty for any other shape.
 */
export function parseEurostatByCategory(json: unknown, categoryDim: string): Record<string, Record<string, number>> {
  const j = json as JsonStat;
  const out: Record<string, Record<string, number>> = {};
  if (!j?.id || !j.size || !j.value || !j.dimension) return out;
  const ci = j.id.indexOf(categoryDim);
  const ti = j.id.indexOf('time');
  if (ci < 0 || ti < 0 || j.size.some((n, i) => i !== ci && i !== ti && n !== 1)) return out;
  const index = (d: string): Record<string, number> => {
    const x = j.dimension![d]?.category?.index;
    return Array.isArray(x) ? Object.fromEntries(x.map((k, i) => [k, i])) : x || {};
  };
  // Row-major position: stride of each dimension is the product of the sizes after it.
  const stride = (at: number) => j.size!.slice(at + 1).reduce((a, b) => a * b, 1);
  const cs = stride(ci);
  const ts = stride(ti);
  for (const [cat, c] of Object.entries(index(categoryDim))) {
    for (const [period, t] of Object.entries(index('time'))) {
      const v = (j.value as Record<string, number>)[String(c * cs + t * ts)];
      if (typeof v === 'number' && Number.isFinite(v)) (out[cat] ||= {})[period] = v;
    }
  }
  return out;
}

const toMonths = (byPeriod: Record<string, number> | undefined): MonthValue[] =>
  Object.entries(byPeriod || {})
    .filter(([p]) => /^\d{4}-\d{2}$/.test(p))
    .map(([period, value]) => ({ period, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-GROUP_MONTHS);

/** The newest year with weights, at or before the given year; per mille turned into % of the basket. */
export function weightsFor(byGroup: Record<string, Record<string, number>>, codes: string[], year: number): { year: string; pct: Record<string, number> } | null {
  const years = new Set<string>();
  for (const c of codes) for (const y of Object.keys(byGroup[c] || {})) if (/^\d{4}$/.test(y) && Number(y) <= year) years.add(y);
  for (const y of [...years].sort().reverse()) {
    if (codes.every((c) => byGroup[c]?.[y] !== undefined)) {
      return { year: y, pct: Object.fromEntries(codes.map((c) => [c, Math.round((byGroup[c][y] / 10) * 100) / 100])) };
    }
  }
  return null;
}

export interface EurostatGroupReplies {
  /** prc_hicp_minr reply (2018 classification), or null when it did not answer. */
  minr: unknown;
  /** prc_hicp_manr reply (older classification), read only when minr had no groups. */
  manr?: unknown;
  /** prc_hicp_inw reply in the classification used. */
  weights?: unknown;
}

/** Builds the groups from Eurostat replies. */
export function eurostatGroups(iso3: string, r: EurostatGroupReplies): PriceGroupsOutcome {
  const missing: string[] = [];
  const newer = parseEurostatByCategory(r.minr, 'coicop18');
  const useNew = Object.keys(COICOP2018).some((c) => newer[c]);
  const older = useNew ? {} : parseEurostatByCategory(r.manr, 'coicop');
  const names = useNew ? COICOP2018 : ECOICOP;
  const rates = useNew ? newer : older;
  const headline = toMonths(useNew ? newer.TOTAL : older.CP00);
  const codes = Object.keys(names).filter((c) => rates[c]);
  if (!codes.length || !headline.length) return { ok: false, reason: `Eurostat did not answer with consumer price groups for ${iso3} (prc_hicp_minr, then prc_hicp_manr).` };
  for (const c of Object.keys(names)) if (!rates[c]) missing.push(`${names[c]}: Eurostat sent no figures for this group`);
  const classification = useNew ? 'coicop2018' : 'ecoicop';
  const w = weightsFor(parseEurostatByCategory(r.weights, useNew ? 'coicop18' : 'coicop'), codes, Number(headline[headline.length - 1].period.slice(0, 4)));
  if (!w) missing.push(`Official weights: Eurostat sent no item weights (prc_hicp_inw) for ${useNew ? 'the 2018 classification' : 'these groups'}, so the split starts empty and is yours to enter`);
  const ratesLabel = useNew ? 'Eurostat HICP, annual rate of change by group (prc_hicp_minr, COICOP 2018)' : 'Eurostat HICP, annual rate of change by group (prc_hicp_manr, to December 2025)';
  return {
    ok: true,
    iso3,
    source: 'eurostat',
    classification,
    headline,
    groups: codes.map((c) => ({ id: c, label: names[c], rates: toMonths(rates[c]), ...(w ? { weightPct: w.pct[c] } : {}) })),
    ...(w ? { weightsYear: w.year, weightsSource: `Eurostat HICP item weights (prc_hicp_inw), ${w.year}` } : {}),
    missing,
    sources: [ratesLabel, ...(w ? [`Eurostat HICP item weights (prc_hicp_inw), ${w.year}`] : [])],
    method: GROUPS_METHOD.eurostat,
  };
}

/** The three parts (food, energy, everything else) from the Inflation drivers inputs. */
export function partsGroups(
  iso3: string,
  inp: { rates: Partial<Record<'headline' | 'core' | 'food' | 'energy', MonthValue[]>>; labels: Partial<Record<string, string>> } | null
): PriceGroupsOutcome {
  if (!inp) return { ok: false, reason: NO_GROUP_SOURCE };
  const headline = toMonths(Object.fromEntries((inp.rates.headline || []).map((p) => [p.period.slice(0, 7), p.value])));
  if (!headline.length) return { ok: false, reason: `Headline consumer prices did not answer for ${iso3}, so there is nothing to compare your rate with.` };
  const from: Record<'food' | 'energy' | 'rest', 'food' | 'energy' | 'core'> = { food: 'food', energy: 'energy', rest: 'core' };
  const missing: string[] = [NO_WEIGHTS_PARTS];
  const groups: PriceGroup[] = [];
  for (const id of ['food', 'energy', 'rest'] as const) {
    const pts = toMonths(Object.fromEntries((inp.rates[from[id]] || []).map((p) => [p.period.slice(0, 7), p.value])));
    if (pts.length) groups.push({ id, label: PARTS_GROUPS[id], rates: pts });
    else missing.push(`${PARTS_GROUPS[id]}: the source did not answer or publishes no such series for this country`);
  }
  if (!groups.length) return { ok: false, reason: `Food, energy and core consumer prices did not answer for ${iso3}.` };
  const sources = [...new Set(Object.values(inp.labels).filter((x): x is string => Boolean(x)))];
  return { ok: true, iso3, source: 'parts', classification: 'parts', headline, groups, missing, sources, method: GROUPS_METHOD.parts };
}
