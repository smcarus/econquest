/**
 * Regional figures (R6): how far apart the regions of a country are.
 *
 * - DOSE, the global dataset of reported subnational economic output (Wenz, Carr, Kögel, Kotz and
 *   Kalkuhl, Scientific Data 2023; Zenodo, CC BY 4.0): output per person for about 1,660 first-level
 *   regions in 83 countries, gathered from national statistics offices. Downloaded by the daily run
 *   when Zenodo lists a new version, and kept as a compact table from 2000 on.
 * - Eurostat regional accounts and labour force survey (reuse allowed with the source named): GDP
 *   per person in purchasing power standards and the unemployment rate for each NUTS 2 region of the
 *   EU and EFTA countries. Downloaded weekly.
 * - Global Data Lab subnational Human Development Index: only from a CSV you save in
 *   data/local/gdl/ (free for non-commercial use, never shipped).
 *
 * Nothing is filled in: a country or figure not in a source reads Missing with the reason.
 */
import { BLANK, findSeparator, splitLine } from '../engine/ownSeries';

/** DOSE on Zenodo: the latest version of this record is looked up before each download. */
export const DOSE_RECORD = '20035157';
export const doseLatestUrl = (record = DOSE_RECORD) => `https://zenodo.org/api/records/${record}/versions/latest`;
export const DOSE_FROM_YEAR = 2000;
/**
 * Zenodo refused the check from a Mac with HTTP 403 when the request carried only Node's default
 * client name. These headers say which program is asking and where its code lives; nothing else.
 */
export const ZENODO_HEADERS: Record<string, string> = { 'User-Agent': 'EconQuest/1.0 (open-source research terminal; +https://github.com/smcarus/econquest)' };

/** Per-person output columns in order of preference: constant 2015 US$ first, so years compare. */
const DOSE_VALUE_COLUMNS: { col: string; basis: DoseBasis }[] = [
  { col: 'grp_pc_usd_2015', basis: 'usd_2015' },
  { col: 'grp_pc_lcu2015_usd', basis: 'lcu2015_usd' },
  { col: 'grp_pc_usd', basis: 'usd_current' },
];
export type DoseBasis = 'usd_2015' | 'lcu2015_usd' | 'usd_current';

export interface DoseCountry {
  /** Region ids (GID_1) and names, in file order. */
  regions: { id: string; name: string }[];
  /** [region index, year, output per person, population or null]. */
  rows: [number, number, number, number | null][];
}
export interface DoseFile {
  record: string;
  version?: string;
  file: string;
  basis: DoseBasis;
  pulledAt: string;
  countries: Record<string, DoseCountry>;
}

const norm = (s: string) => s.trim().replace(/^﻿/, '').toLowerCase();

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (BLANK.has(t.toLowerCase())) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/** The DOSE CSV into the compact table, or the reason it did not read. */
export function parseDoseCsv(text: string, from: { record: string; version?: string; file: string; pulledAt: string }): DoseFile | { reason: string } {
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? '';
  const sep = findSeparator(header);
  const cols = splitLine(header, sep).map(norm);
  const at = (c: string) => cols.indexOf(c);
  const iIso = at('gid_0');
  const iId = at('gid_1');
  const iName = at('region');
  const iYear = at('year');
  const iPop = at('pop');
  const pick = DOSE_VALUE_COLUMNS.find((c) => at(c.col) >= 0);
  const missing = [iIso < 0 && 'GID_0', iId < 0 && 'GID_1', iName < 0 && 'region', iYear < 0 && 'year', !pick && 'grp_pc_usd_2015'].filter(Boolean);
  if (missing.length || !pick) return { reason: `the file has no ${missing.join(', ')} column (the DOSE layout); its columns are ${cols.slice(0, 15).join(', ')}` };
  const iVal = at(pick.col);
  const countries: Record<string, DoseCountry> = {};
  const regionIndex: Record<string, Record<string, number>> = {};
  for (let n = 1; n < lines.length; n++) {
    const line = lines[n];
    if (!line) continue;
    const f = splitLine(line, sep);
    const iso3 = (f[iIso] || '').trim().toUpperCase();
    const id = (f[iId] || '').trim();
    const year = num(f[iYear]);
    const v = num(f[iVal]);
    if (!/^[A-Z]{3}$/.test(iso3) || !id || year === null || year < DOSE_FROM_YEAR || v === null || v <= 0) continue;
    const c = (countries[iso3] ??= { regions: [], rows: [] });
    const idx = (regionIndex[iso3] ??= {});
    if (idx[id] === undefined) {
      idx[id] = c.regions.length;
      c.regions.push({ id, name: (f[iName] || id).trim() });
    }
    const pop = iPop >= 0 ? num(f[iPop]) : null;
    c.rows.push([idx[id], year, Math.round(v * 10) / 10, pop !== null && pop > 0 ? Math.round(pop) : null]);
  }
  if (!Object.keys(countries).length) return { reason: `no row from ${DOSE_FROM_YEAR} on had a country code, region, year and ${pick.col}` };
  return { ...from, basis: pick.basis, countries };
}

/** The Zenodo record reply: the CSV file's name and download link, the version and record id. */
export function doseCsvLink(reply: any): { url: string; file: string; record: string; version?: string } | null {
  const files: any[] = Array.isArray(reply?.files) ? reply.files : [];
  const csv = files.find((f) => /^DOSE.*\.csv$/i.test(String(f?.key ?? f?.filename ?? '')));
  if (!csv) return null;
  const file = String(csv.key ?? csv.filename);
  const url = String(csv.links?.self ?? csv.links?.content ?? csv.links?.download ?? '');
  const record = String(reply?.id ?? reply?.recid ?? '');
  if (!url || !record) return null;
  return { url, file, record, version: reply?.metadata?.version ? String(reply.metadata.version) : undefined };
}

// ----- Eurostat NUTS 2 -----

export const EUROSTAT_REGION_GDP = 'nama_10r_2gdp';
export const EUROSTAT_REGION_UNEMP = 'lfst_r_lfu3rt';
const ES = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
export const eurostatRegionGdpUrl = (since: number) => `${ES}/${EUROSTAT_REGION_GDP}?unit=PPS_EU27_2020_HAB&sinceTimePeriod=${since}&format=JSON&lang=EN`;
export const eurostatRegionUnempUrl = (since: number) => `${ES}/${EUROSTAT_REGION_UNEMP}?unit=PC&sex=T&age=Y15-74&isced11=TOTAL&sinceTimePeriod=${since}&format=JSON&lang=EN`;

/** Eurostat two-letter codes that differ from ISO 3166 (Greece). */
const EUROSTAT_TO_ISO2: Record<string, string> = { EL: 'GR' };

export interface EuroRegionValue {
  value: number;
  year: number;
}
export interface EuroRegions {
  /** By ISO two-letter country code. */
  countries: Record<string, { national: Partial<Record<'gdp' | 'unemp', EuroRegionValue>>; regions: { code: string; name: string; gdp?: EuroRegionValue; unemp?: EuroRegionValue }[] }>;
}
export interface EuroRegionsFile extends EuroRegions {
  pulledAt: string;
}

/** A JSON-stat reply into the latest value per geo code, with the geo names. */
export function latestByGeo(reply: any): { values: Record<string, EuroRegionValue>; names: Record<string, string> } | null {
  const ids: string[] = reply?.id;
  const size: number[] = reply?.size;
  const dims = reply?.dimension;
  const values = reply?.value;
  if (!Array.isArray(ids) || !Array.isArray(size) || !dims || !values) return null;
  const gi = ids.indexOf('geo');
  const ti = ids.indexOf('time');
  if (gi < 0 || ti < 0) return null;
  const byPos = ids.map((id) => {
    const out: string[] = [];
    for (const [k, v] of Object.entries(dims[id]?.category?.index || {})) out[v as number] = k;
    return out;
  });
  const names: Record<string, string> = { ...(dims.geo?.category?.label || {}) };
  const got: Record<string, EuroRegionValue> = {};
  for (const [flat, v] of Object.entries(values)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    let rest = Number(flat);
    const pos: number[] = [];
    for (let d = ids.length - 1; d >= 0; d--) {
      pos[d] = rest % size[d];
      rest = Math.floor(rest / size[d]);
    }
    // Only the first category of any other dimension (the query fixes each to one).
    if (pos.some((p, d) => d !== gi && d !== ti && p !== 0)) continue;
    const geo = byPos[gi][pos[gi]];
    const year = Number(String(byPos[ti][pos[ti]]).slice(0, 4));
    if (!geo || !Number.isFinite(year)) continue;
    if (!got[geo] || got[geo].year < year) got[geo] = { value: v, year };
  }
  return { values: got, names };
}

const COUNTRY_GEO = /^[A-Z]{2}$/;
const NUTS2_GEO = /^[A-Z]{2}[0-9A-Y][0-9A-Y]$/; // ZZ = outside any region

/** The two Eurostat replies merged by country: NUTS 2 regions and the national figure. */
export function mergeEuroRegions(gdpReply: unknown, unempReply: unknown): EuroRegions | null {
  const gdp = latestByGeo(gdpReply);
  const unemp = latestByGeo(unempReply);
  if (!gdp && !unemp) return null;
  const countries: EuroRegions['countries'] = {};
  const names = { ...(unemp?.names || {}), ...(gdp?.names || {}) };
  const codes = new Set([...Object.keys(gdp?.values || {}), ...Object.keys(unemp?.values || {})]);
  for (const code of [...codes].sort()) {
    const es2 = code.slice(0, 2);
    const iso2 = EUROSTAT_TO_ISO2[es2] || es2;
    if (COUNTRY_GEO.test(code)) {
      const c = (countries[iso2] ??= { national: {}, regions: [] });
      if (gdp?.values[code]) c.national.gdp = gdp.values[code];
      if (unemp?.values[code]) c.national.unemp = unemp.values[code];
    } else if (NUTS2_GEO.test(code)) {
      const c = (countries[iso2] ??= { national: {}, regions: [] });
      c.regions.push({ code, name: names[code] || code, gdp: gdp?.values[code], unemp: unemp?.values[code] });
    }
  }
  // A country whose only NUTS 2 region is the whole country (Cyprus, Luxembourg, Malta, Estonia...) has no spread to show.
  for (const [k, c] of Object.entries(countries)) if (c.regions.length < 2) delete countries[k];
  return Object.keys(countries).length ? { countries } : null;
}

// ----- Global Data Lab subnational HDI (your file) -----

export interface GdlRow {
  iso3: string;
  year: number;
  code: string;
  level: string;
  region: string;
  shdi: number;
}

/** The Global Data Lab CSV (SHDI database download), or null when the columns are not there. */
export function parseGdlCsv(text: string): GdlRow[] | null {
  const lines = text.split(/\r?\n/);
  const sep = findSeparator(lines[0] ?? '');
  const cols = splitLine(lines[0] ?? '', sep).map(norm);
  const at = (...names: string[]) => names.map((n) => cols.indexOf(n)).find((i) => i >= 0) ?? -1;
  const iIso = at('iso_code', 'iso3', 'isocode');
  const iYear = at('year');
  const iCode = at('gdlcode', 'gdl_code');
  const iLevel = at('level');
  const iRegion = at('region');
  const iVal = at('shdi');
  if ([iIso, iYear, iCode, iLevel, iRegion, iVal].some((i) => i < 0)) return null;
  const out: GdlRow[] = [];
  for (let n = 1; n < lines.length; n++) {
    if (!lines[n]) continue;
    const f = splitLine(lines[n], sep);
    const v = num(f[iVal]);
    const year = num(f[iYear]);
    const iso3 = (f[iIso] || '').trim().toUpperCase();
    if (v === null || year === null || !/^[A-Z]{3}$/.test(iso3)) continue;
    out.push({ iso3, year, code: (f[iCode] || '').trim(), level: (f[iLevel] || '').trim(), region: (f[iRegion] || '').trim(), shdi: v });
  }
  return out;
}

// ----- The country profile -----

export interface RegionRow {
  name: string;
  value: number;
  /** Per cent above (+) or below (-) the national figure. */
  gapPct: number;
}
export interface Spread {
  /** Highest region ÷ lowest region. */
  topBottom: number;
  /** Coefficient of variation in per cent, weighted by population where every region has one. */
  cvPct: number;
  weighted: boolean;
}
export interface RegionalProfile {
  dose: { year: number; basis: DoseBasis; national: number; nationalFrom: 'population_weighted' | 'simple_mean'; rows: RegionRow[]; spread: Spread; spreadThen?: { year: number; cvPct: number } } | null;
  doseMissing?: string;
  euro: { gdpYear?: number; unempYear?: number; nationalGdp?: number; nationalUnemp?: number; rows: { name: string; code: string; gdp?: number; gdpGapPct?: number; unemp?: number; unempGap?: number }[]; gdpSpread?: Spread } | null;
  euroMissing?: string;
  gdl: { year: number; national?: number; rows: { name: string; value: number }[]; topBottomGap: number } | null;
  gdlMissing?: string;
  asOf?: string;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function spreadOf(values: number[], weights?: (number | null)[]): Spread | null {
  if (values.length < 2) return null;
  const weighted = !!weights && weights.length === values.length && weights.every((w) => w !== null && w > 0);
  const w = weighted ? (weights as number[]) : values.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  const mean = values.reduce((a, v, i) => a + v * w[i], 0) / total;
  const varc = values.reduce((a, v, i) => a + w[i] * (v - mean) ** 2, 0) / total;
  const min = Math.min(...values);
  if (mean <= 0 || min <= 0) return null;
  return { topBottom: r1(Math.max(...values) / min), cvPct: r1((Math.sqrt(varc) / mean) * 100), weighted };
}

export const REGIONAL_SOURCES =
  'DOSE global dataset of reported subnational economic output (Wenz et al. 2023, Zenodo, CC BY 4.0); Eurostat regional accounts (nama_10r_2gdp) and labour force survey (lfst_r_lfu3rt); Global Data Lab subnational HDI (your file)';
export const REGIONAL_METHOD =
  'Gap = region ÷ national figure - 1. National output per person from DOSE = regions weighted by population where every region has one, else the simple mean (labelled). Spread = highest ÷ lowest region and the coefficient of variation (standard deviation ÷ mean), population-weighted where possible. DOSE year = the latest year with at least two thirds of the regions ever reported. Eurostat national figure = the country row of the same table. Nothing is filled in for missing regions or years.';

function doseView(c: DoseCountry | undefined, basis: DoseBasis): RegionalProfile['dose'] {
  if (!c || c.regions.length < 2) return null;
  const byYear = new Map<number, [number, number, number | null][]>();
  for (const [ri, y, v, p] of c.rows) {
    const list = byYear.get(y) ?? [];
    list.push([ri, v, p]);
    byYear.set(y, list);
  }
  const need = Math.max(2, Math.ceil((c.regions.length * 2) / 3));
  const years = [...byYear.keys()].filter((y) => (byYear.get(y) as unknown[]).length >= need).sort((a, b) => a - b);
  const year = years[years.length - 1];
  if (year === undefined) return null;
  const list = byYear.get(year)!;
  const spread = spreadOf(
    list.map((x) => x[1]),
    list.map((x) => x[2]),
  );
  if (!spread) return null;
  const allPop = list.every((x) => x[2] !== null && (x[2] as number) > 0);
  const national = allPop ? list.reduce((a, x) => a + x[1] * (x[2] as number), 0) / list.reduce((a, x) => a + (x[2] as number), 0) : list.reduce((a, x) => a + x[1], 0) / list.length;
  const rows = list
    .map(([ri, v]) => ({ name: c.regions[ri].name, value: v, gapPct: r1((v / national - 1) * 100) }))
    .sort((a, b) => b.value - a.value);
  // The spread ten years before (or the earliest year with enough regions), to say whether regions drew closer.
  const thenYear = years.filter((y) => y <= year - 10).pop() ?? (years[0] !== year && year - years[0] >= 5 ? years[0] : undefined);
  let spreadThen: { year: number; cvPct: number } | undefined;
  if (thenYear !== undefined) {
    const then = byYear.get(thenYear)!;
    const s = spreadOf(
      then.map((x) => x[1]),
      then.map((x) => x[2]),
    );
    if (s) spreadThen = { year: thenYear, cvPct: s.cvPct };
  }
  return { year, basis, national: Math.round(national), nationalFrom: allPop ? 'population_weighted' : 'simple_mean', rows, spread, spreadThen };
}

export function regionalProfile(input: { iso3: string; iso2: string | null; dose: DoseFile | null; euro: EuroRegionsFile | null; gdl: GdlRow[] | null; gdlFile?: string | null }): RegionalProfile {
  const out: RegionalProfile = { dose: null, euro: null, gdl: null, sources: REGIONAL_SOURCES, method: REGIONAL_METHOD };
  // DOSE
  if (!input.dose) out.doseMissing = 'The regional output file (DOSE) has not been downloaded yet; the daily download fetches it.';
  else {
    out.dose = doseView(input.dose.countries[input.iso3], input.dose.basis);
    if (!out.dose) out.doseMissing = 'DOSE has no regional output figures for this country since 2000 (it covers 83 countries).';
  }
  // Eurostat
  const ec = input.iso2 ? input.euro?.countries[input.iso2] : undefined;
  if (!input.euro) out.euroMissing = 'The Eurostat regional figures have not been downloaded yet; the daily download fetches them once a week.';
  else if (!ec) out.euroMissing = 'Eurostat publishes regional figures for EU and EFTA countries only, or this country has a single region.';
  else {
    const gdpVals = ec.regions.filter((r) => r.gdp).map((r) => r.gdp!.value);
    const ng = ec.national.gdp?.value;
    const nu = ec.national.unemp?.value;
    out.euro = {
      gdpYear: ec.national.gdp?.year ?? ec.regions.find((r) => r.gdp)?.gdp?.year,
      unempYear: ec.national.unemp?.year ?? ec.regions.find((r) => r.unemp)?.unemp?.year,
      nationalGdp: ng,
      nationalUnemp: nu,
      rows: ec.regions
        .map((r) => ({
          name: r.name,
          code: r.code,
          gdp: r.gdp?.value,
          gdpGapPct: r.gdp && ng ? r1((r.gdp.value / ng - 1) * 100) : undefined,
          unemp: r.unemp?.value,
          unempGap: r.unemp && nu !== undefined ? r1(r.unemp.value - nu) : undefined,
        }))
        .sort((a, b) => (b.gdp ?? -1) - (a.gdp ?? -1)),
      gdpSpread: spreadOf(gdpVals) ?? undefined,
    };
  }
  // Global Data Lab
  if (!input.gdl) out.gdlMissing = input.gdlFile === undefined || input.gdlFile === null ? 'No Global Data Lab file in data/local/gdl/ (download the subnational HDI CSV from globaldatalab.org; free for non-commercial use).' : `The file ${input.gdlFile.replace(/,/g, ' ')} in data/local/gdl/ has no iso_code, year, GDLCODE, level, region and shdi columns (the Global Data Lab layout).`;
  else {
    const mine = input.gdl.filter((r) => r.iso3 === input.iso3);
    const sub = mine.filter((r) => /subnat/i.test(r.level));
    const year = Math.max(...sub.map((r) => r.year));
    const rows = sub.filter((r) => r.year === year).map((r) => ({ name: r.region, value: r.shdi })).sort((a, b) => b.value - a.value);
    if (rows.length < 2) out.gdlMissing = 'Your Global Data Lab file has no subnational HDI rows for this country.';
    else
      out.gdl = {
        year,
        national: mine.find((r) => r.year === year && /national/i.test(r.level) && !/subnat/i.test(r.level))?.shdi,
        rows,
        topBottomGap: Math.round((rows[0].value - rows[rows.length - 1].value) * 1000) / 1000,
      };
  }
  const dates = [input.dose?.pulledAt, input.euro?.pulledAt].filter(Boolean) as string[];
  if (dates.length) out.asOf = dates.sort().pop()!.slice(0, 10);
  return out;
}

const fmt = (v: number) => Math.round(v).toLocaleString('en');

export function regionalSentence(p: RegionalProfile, country: string): string {
  const parts: string[] = [];
  if (p.dose) {
    const top = p.dose.rows[0];
    const bottom = p.dose.rows[p.dose.rows.length - 1];
    parts.push(
      `${country}, ${p.dose.year}: output per person in the richest region (${top.name}, US$${fmt(top.value)}) is ${p.dose.spread.topBottom} times that of the poorest (${bottom.name}, US$${fmt(bottom.value)}); regions differ by ${p.dose.spread.cvPct}% on average${p.dose.spreadThen ? `, against ${p.dose.spreadThen.cvPct}% in ${p.dose.spreadThen.year}` : ''} (DOSE).`,
    );
  }
  if (p.euro?.gdpSpread) {
    const withU = p.euro.rows.filter((r) => r.unemp !== undefined).sort((a, b) => (b.unemp as number) - (a.unemp as number));
    parts.push(
      `EU regions: GDP per person ranges ${p.euro.gdpSpread.topBottom} times from top to bottom (${p.euro.gdpYear})${withU.length ? `; unemployment is highest in ${withU[0].name} at ${withU[0].unemp}% (${p.euro.unempYear})` : ''} (Eurostat).`,
    );
  }
  if (p.gdl) parts.push(`Human Development Index ${p.gdl.year}: ${p.gdl.rows[0].name} ${p.gdl.rows[0].value} to ${p.gdl.rows[p.gdl.rows.length - 1].name} ${p.gdl.rows[p.gdl.rows.length - 1].value} (Global Data Lab).`);
  if (!parts.length) return `${country}: regional figures Missing (${p.doseMissing ?? p.euroMissing ?? 'no source'}).`;
  return parts.join(' ');
}
