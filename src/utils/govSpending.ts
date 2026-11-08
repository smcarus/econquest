/**
 * Government spending by purpose (Sam, 2026-11-08): the UN Classification of the Functions of
 * Government (COFOG), general government, total expenditure as % of GDP, from two free tables.
 *
 * - Eurostat gov_10a_exp (no key): EU members, about a year behind. Used first where it has the year.
 * - IMF Government Finance Statistics, COFOG table, read through DBnomics (no key):
 *   IMF/GFSCOFOG/A.{ISO2}.S13.XDC_R_B1GQ.{code}. Most other countries, two to three years behind;
 *   some stop years earlier and some (Mexico, Chile, India, Saudi Arabia, Argentina in 2026) have none.
 *
 * Only a published value is kept, with its year and table; a sector neither table has stays absent,
 * and every screen reads it as Missing with the reason. Nothing is estimated or carried over.
 * Browser-safe.
 */

export interface CofogSector {
  code: string;
  label: string;
  /** Plain words a question uses for the sector. */
  words: RegExp;
}

/** The ten COFOG divisions, plus fuel and energy and transport (groups inside economic affairs). */
export const COFOG_SECTORS: CofogSector[] = [
  { code: 'GF01', label: 'General public services', words: /general public services|public administration|civil service/i },
  { code: 'GF02', label: 'Defence', words: /defen[cs]e|military|armed forces|pentagon/i },
  { code: 'GF03', label: 'Public order and safety', words: /public order|police|policing|prisons?|courts?|law enforcement|public safety/i },
  { code: 'GF04', label: 'Economic affairs', words: /economic affairs|industrial policy|subsid(?:y|ies)|agricultur/i },
  { code: 'GF0403', label: 'Fuel and energy', words: /\benergy\b|\bfuel\b|electricity|power (?:sector|generation)|renewables?/i },
  { code: 'GF0405', label: 'Transport', words: /transport|roads?|railways?|rail\b|highways?|transit/i },
  { code: 'GF05', label: 'Environmental protection', words: /environment|climate|pollution|green (?:spending|investment)/i },
  { code: 'GF06', label: 'Housing and community amenities', words: /housing|community amenities|water supply/i },
  { code: 'GF07', label: 'Health', words: /\bhealth|hospitals?|medicare|medicaid|\bnhs\b/i },
  { code: 'GF08', label: 'Recreation, culture and religion', words: /recreation|culture|religio|sports?\b|arts\b/i },
  { code: 'GF09', label: 'Education', words: /educat|schools?|universit|teachers?/i },
  { code: 'GF10', label: 'Social protection', words: /social protection|social security|pensions?|welfare|unemployment benefits?|benefits?\b/i },
];
export const COFOG_CODES = COFOG_SECTORS.map((s) => s.code);
export const sectorByCode = (code: string) => COFOG_SECTORS.find((s) => s.code === code);

/** The sectors a question names, in the order above. */
export function sectorsInQuestion(question: string): CofogSector[] {
  return COFOG_SECTORS.filter((s) => s.words.test(question));
}

export type SpendingTable = 'eurostat' | 'imf';
export const TABLE_LABEL: Record<SpendingTable, string> = {
  eurostat: 'Eurostat government spending by function (COFOG)',
  imf: 'IMF Government Finance Statistics, spending by function (COFOG)',
};

export interface SectorValue {
  pct: number;
  year: string;
  table: SpendingTable;
}
/** iso3 -> COFOG code -> latest published value. */
export type SpendingByCountry = Record<string, Record<string, SectorValue>>;

export interface GovSpendingPull {
  pulledAt: string;
  byCountry: SpendingByCountry;
}

/** EU members on Eurostat's table, by ISO3 (Eurostat writes Greece as EL). */
export const EUROSTAT_GEO: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK', EST: 'EE', FIN: 'FI', FRA: 'FR',
  DEU: 'DE', GRC: 'EL', HUN: 'HU', IRL: 'IE', ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL',
  POL: 'PL', PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE', NOR: 'NO', ISL: 'IS', CHE: 'CH',
};

export function eurostatUrl(geos: string[], sinceYear: number): string {
  const q = [
    ...geos.map((g) => `geo=${g}`),
    'sector=S13',
    'na_item=TE',
    'unit=PC_GDP',
    ...COFOG_CODES.map((c) => `cofog99=${c}`),
    `sinceTimePeriod=${sinceYear}`,
    'format=JSON',
  ];
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?${q.join('&')}`;
}

export const imfSeriesId = (iso2: string, code: string) => `IMF/GFSCOFOG/A.${iso2}.S13.XDC_R_B1GQ.${code}`;
export function dbnomicsUrl(ids: string[]): string {
  return `https://api.db.nomics.world/v22/series?series_ids=${ids.map(encodeURIComponent).join(',')}&observations=1&limit=${ids.length}`;
}

/** Eurostat JSON-stat reply -> latest year with a value, per country and sector. */
export function parseEurostat(reply: any, geoToIso3: Record<string, string>): SpendingByCountry {
  const out: SpendingByCountry = {};
  const ids: string[] = reply?.id;
  const size: number[] = reply?.size;
  const dims = reply?.dimension;
  const values = reply?.value;
  if (!Array.isArray(ids) || !Array.isArray(size) || !dims || !values) return out;
  const index = ids.map((id) => {
    const idx = dims[id]?.category?.index || {};
    const byPos: string[] = [];
    for (const [k, v] of Object.entries(idx)) byPos[v as number] = k;
    return byPos;
  });
  const gi = ids.indexOf('geo');
  const ci = ids.indexOf('cofog99');
  const ti = ids.indexOf('time');
  if (gi < 0 || ci < 0 || ti < 0) return out;
  for (const [flat, v] of Object.entries(values)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    let rest = Number(flat);
    const pos: number[] = new Array(ids.length);
    for (let d = ids.length - 1; d >= 0; d--) {
      pos[d] = rest % size[d];
      rest = Math.floor(rest / size[d]);
    }
    const iso3 = geoToIso3[index[gi][pos[gi]]];
    const code = index[ci][pos[ci]];
    const year = index[ti][pos[ti]];
    if (!iso3 || !code || !year) continue;
    const cur = (out[iso3] ||= {})[code];
    if (!cur || year > cur.year) out[iso3][code] = { pct: Number(v.toFixed(2)), year, table: 'eurostat' };
  }
  return out;
}

export const MIN_PLAUSIBLE_PCT = 0.001;

/** DBnomics series reply -> latest year with a number, per country and sector. */
export function parseDbnomics(reply: any, iso2ToIso3: Record<string, string>): SpendingByCountry {
  const out: SpendingByCountry = {};
  const docs = reply?.series?.docs;
  if (!Array.isArray(docs)) return out;
  for (const doc of docs) {
    const m = /^A\.([A-Z0-9]{2})\.S13\.XDC_R_B1GQ\.(GF\d{2,4})$/.exec(String(doc?.series_code || ''));
    const iso3 = m && iso2ToIso3[m[1]];
    if (!m || !iso3 || !Array.isArray(doc.period) || !Array.isArray(doc.value)) continue;
    for (let k = doc.period.length - 1; k >= 0; k--) {
      const v = doc.value[k];
      // Some IMF series come in the wrong scale (the UK's, in 2026, at about a millionth of the
      // real share); a share of GDP under 0.001% is read as that error and dropped, not rescaled.
      if (typeof v === 'number' && Number.isFinite(v) && v >= MIN_PLAUSIBLE_PCT) {
        (out[iso3] ||= {})[m[2]] = { pct: Number(v.toFixed(2)), year: String(doc.period[k]), table: 'imf' };
        break;
      }
    }
  }
  return out;
}

/** Per sector, the newer of the two tables; Eurostat on a tie (it is the source the IMF copies for the EU). */
export function mergeSpending(eurostat: SpendingByCountry, imf: SpendingByCountry): SpendingByCountry {
  const out: SpendingByCountry = {};
  for (const iso3 of new Set([...Object.keys(eurostat), ...Object.keys(imf)])) {
    const a = eurostat[iso3] || {};
    const b = imf[iso3] || {};
    for (const code of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const pick = !b[code] || (a[code] && a[code].year >= b[code].year) ? a[code] : b[code];
      if (pick) (out[iso3] ||= {})[code] = pick;
    }
  }
  return out;
}

/** The figure line for a sector, or why it is Missing. */
export function sectorLine(iso3: string, countryName: string, code: string, pull: SpendingByCountry | undefined, now = new Date()): { value: string; source: string } | { missing: string } {
  const s = sectorByCode(code);
  const v = pull?.[iso3]?.[code];
  if (!s) return { missing: `${code} is not a COFOG sector` };
  if (!v) return { missing: `${countryName}: no free source has ${s.label.toLowerCase()} spending (Eurostat and the IMF COFOG table have no figure)` };
  const age = now.getUTCFullYear() - Number(v.year);
  return { value: `${v.pct.toFixed(1)}% of GDP`, source: `${TABLE_LABEL[v.table]}, ${v.year}${age >= 3 ? ` (${age} years old)` : ''}` };
}
