/**
 * Wages and house prices (data batch G22).
 *
 * - Wages: average monthly earnings of employees in local currency from ILOSTAT (International
 *   Labour Organization; data published from 3 May 2023 is CC BY 4.0, credit the ILO), indicator
 *   EAR_4MTH_SEX_ECO_CUR_NB_A, both sexes, all economic activities. Nominal growth is the change on
 *   the year before in the same series; it is left out when the ILO marks a break in the series.
 *   Real growth is nominal growth deflated by consumer price inflation for the same year from the
 *   World Bank (FP.CPI.TOTL.ZG): (1 + nominal) / (1 + inflation) - 1. Yearly; coverage outside the
 *   OECD is patchy and often a few years old, so the year is always shown.
 * - House prices: BIS selected residential property prices (WS_SPP), real and nominal, change on
 *   the same quarter a year earlier (UNIT_MEASURE 771), all countries in one request.
 *
 * Both are downloaded by the daily run into data/live/ and laid over the snapshot. The ILOSTAT and
 * BIS hosts do not answer from this project's cloud session, so the parsers are tested on rows laid
 * out as their documentation describes; `npm run check:data` rows ilostat_wages and bis_property
 * confirm the live answers. Browser-safe: no fs, no network.
 */
import { BIS_API, BIS_ISO2, parseBisCsv } from './bisDebtSecurities';
import { quarterKey } from './debtSchedule';

/**
 * The indicator id the app asks for first. ILOSTAT refused it as "deprecated or invalid" on
 * 13 November 2026; the replacement is read from ILOSTAT's own list of indicators (see
 * pickIloEarningsId), or set by hand in .env as ILO_EARNINGS_ID.
 */
export const ILO_EARNINGS_ID = 'EAR_4MTH_SEX_ECO_CUR_NB_A';
export const ILO_EARNINGS_ENV = 'ILO_EARNINGS_ID';
export const ILO_API = 'https://rplumber.ilo.org/data/indicator';
/** ILOSTAT's lists of indicators (id, title, frequency), tried in this order. */
export const ILO_TOC_URLS = [
  'https://rplumber.ilo.org/metadata/toc/indicator/?lang=en&format=.csv',
  'https://rplumber.ilo.org/metadata/toc/indicator/?lang=en&format=.json',
  'https://rplumber.ilo.org/files/website/bulk/indicator/table_of_contents_en.csv',
];
export const WB_INFLATION_CODE = 'FP.CPI.TOTL.ZG';

/** Earnings of every country from `fromYear`, both sexes, as CSV with codes. */
export function iloEarningsUrl(fromYear: number, id = ILO_EARNINGS_ID): string {
  return `${ILO_API}?id=${id}&sex=SEX_T&timefrom=${fromYear}&type=code&format=.csv`;
}
/** One country only, for the connection check. */
export function iloEarningsSampleUrl(iso3: string, fromYear: number, id = ILO_EARNINGS_ID): string {
  return `${ILO_API}?id=${id}&ref_area=${iso3}&sex=SEX_T&timefrom=${fromYear}&type=code&format=.csv`;
}
/** True when ILOSTAT says the indicator id is no longer served. */
export const iloIdRefused = (status: number | undefined, body: string | undefined) => status === 400 && /deprecated|invalid dataset id/i.test(body || '');

/**
 * From ILOSTAT's list of indicators (CSV with an id column and, when present, a title column; or
 * any other reply, read for ids alone), the yearly ids for average monthly earnings of employees
 * by sex, other than the id it refused. By economic activity and in local currency (CUR or LCU)
 * first; empty when none fits.
 */
const ILO_EARNINGS_ID_RE = /^EAR_4M[A-Z]{2}_SEX_[A-Z0-9_]*_A$/;
export function iloEarningsCandidates(tocCsv: string, refused: string = ILO_EARNINGS_ID): string[] {
  const lines = tocCsv.split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const head = splitLine(lines[0].replace(/\r$/, '')).map((h) => h.trim().toLowerCase());
  const idCol = head.findIndex((h) => h === 'id' || h === 'indicator');
  const titleCol = head.findIndex((h) => /label|title|indicator\.label/.test(h));
  const ids = new Set<string>();
  for (const raw of lines.slice(1)) {
    const c = splitLine(raw.replace(/\r$/, ''));
    const id = String((idCol >= 0 ? c[idCol] : c[0]) || '').trim().replace(/^"|"$/g, '');
    if (!ILO_EARNINGS_ID_RE.test(id) || id === refused) continue;
    const title = titleCol >= 0 ? String(c[titleCol] || '') : '';
    if (title && !/earnings/i.test(title)) continue;
    ids.add(id);
  }
  // Not a CSV with an id column (JSON, for example): take the ids wherever they appear.
  if (!ids.size) for (const m of tocCsv.matchAll(/\bEAR_4M[A-Z]{2}_SEX_[A-Z0-9_]*?_A\b/g)) if (m[0] !== refused) ids.add(m[0]);
  const rank = (id: string) => (/_ECO_/.test(id) ? 0 : 2) + (/_(CUR|LCU)_/.test(id) ? 0 : 1);
  return [...ids].sort((a, b) => rank(a) - rank(b) || a.length - b.length || a.localeCompare(b));
}
export const pickIloEarningsId = (tocCsv: string, refused?: string): string | null => iloEarningsCandidates(tocCsv, refused)[0] ?? null;
/** Consumer price inflation of every country from `fromYear` (World Bank, one request). */
export function wbInflationUrl(fromYear: number, toYear: number): string {
  return `https://api.worldbank.org/v2/country/all/indicator/${WB_INFLATION_CODE}?format=json&per_page=20000&date=${fromYear}:${toYear}`;
}
/** Real and nominal house prices, change on a year earlier, every BIS country from `fromYear`. */
export function bisPropertyAllUrl(fromYear: number): string {
  return `${BIS_API}/WS_SPP/Q..N+R.771/all?format=csv&startPeriod=${fromYear}`;
}

/** Brazil only, for the connection check. */
export const BIS_PROPERTY_SAMPLE_URL = `${BIS_API}/WS_SPP/Q.BR.N+R.771/all?format=csv&lastNObservations=4`;

// --- CSV ---

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// --- Wages (ILOSTAT) ---

export interface WageReading {
  /** Latest year with a figure. */
  year: string;
  /** Average monthly earnings in local currency that year. */
  monthly: number;
  /** Change on the year before, %, when both years are published and no break is marked. */
  nominalGrowthPct?: number;
  /** Nominal growth deflated by the same year's consumer price inflation, %. */
  realGrowthPct?: number;
  /** Consumer price inflation used for the real figure, %. */
  inflationPct?: number;
  /** Why growth is left out, when it is. */
  growthNote?: 'break' | 'no_previous_year' | 'no_inflation';
}

export interface WagesPull {
  pulledAt: string;
  countries: Record<string, WageReading>;
}

/** Which columns hold what; null when the header is not the ILOSTAT layout. */
export function iloColumns(header: string): Record<'ref_area' | 'sex' | 'classif1' | 'classif2' | 'time' | 'obs_value' | 'obs_status', number> | null {
  const h = splitLine(header.replace(/^﻿/, '').trim()).map((x) => x.trim().replace(/\./g, '_').toLowerCase());
  const at = (n: string) => h.indexOf(n);
  const cols = { ref_area: at('ref_area'), sex: at('sex'), classif1: at('classif1'), classif2: at('classif2'), time: at('time'), obs_value: at('obs_value'), obs_status: at('obs_status') };
  return cols.ref_area >= 0 && cols.time >= 0 && cols.obs_value >= 0 && cols.classif1 >= 0 ? cols : null;
}

/** The total over all economic activities: the aggregate total first, then the sector total, then any other total. */
const TOTAL_RANK = (c: string): number => (c === 'ECO_AGGREGATE_TOTAL' ? 0 : c === 'ECO_SECTOR_TOTAL' ? 1 : /^ECO_.*_TOTAL$/.test(c) ? 2 : -1);

/**
 * The earnings file -> year -> {value, break} per country: both sexes, local currency, all
 * activities. Null when the header is not understood.
 */
export function parseIloEarnings(text: string): Record<string, Record<string, { value: number; brk: boolean }>> | null {
  const lines = text.split('\n');
  const cols = iloColumns(lines[0] || '');
  if (!cols) return null;
  const best: Record<string, Record<string, { value: number; brk: boolean; rank: number }>> = {};
  for (const raw of lines.slice(1)) {
    if (!raw.trim()) continue;
    const c = splitLine(raw.replace(/\r$/, ''));
    const iso3 = c[cols.ref_area];
    const year = c[cols.time];
    if (!/^[A-Z]{3}$/.test(iso3 || '') || !/^\d{4}$/.test(year || '')) continue;
    if (cols.sex >= 0 && c[cols.sex] && c[cols.sex] !== 'SEX_T') continue;
    if (cols.classif2 >= 0 && c[cols.classif2] && c[cols.classif2] !== 'CUR_TYPE_LCU') continue;
    const rank = TOTAL_RANK(c[cols.classif1] || '');
    if (rank < 0) continue;
    const v = Number(c[cols.obs_value]);
    if (c[cols.obs_value] === '' || !Number.isFinite(v) || v <= 0) continue;
    const brk = cols.obs_status >= 0 && /^B$/i.test((c[cols.obs_status] || '').trim());
    const byYear = (best[iso3] ||= {});
    if (!byYear[year] || rank < byYear[year].rank) byYear[year] = { value: v, brk, rank };
  }
  const out: Record<string, Record<string, { value: number; brk: boolean }>> = {};
  for (const [iso3, ys] of Object.entries(best)) out[iso3] = Object.fromEntries(Object.entries(ys).map(([y, x]) => [y, { value: x.value, brk: x.brk }]));
  return out;
}

/** The World Bank answer ([meta, rows]) -> iso3 -> year -> inflation %. */
export function parseWbInflation(json: unknown): Record<string, Record<string, number>> {
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? (json[1] as Array<{ countryiso3code?: unknown; date?: unknown; value?: unknown }>) : [];
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const iso3 = String(r?.countryiso3code ?? '');
    const year = String(r?.date ?? '');
    if (!/^[A-Z]{3}$/.test(iso3) || !/^\d{4}$/.test(year) || typeof r.value !== 'number' || !Number.isFinite(r.value)) continue;
    (out[iso3] ||= {})[year] = r.value;
  }
  return out;
}

const round1 = (v: number) => Number(v.toFixed(1));

/** Latest year, its level, and nominal and real growth when they can be worked out. */
export function wageReading(years: Record<string, { value: number; brk: boolean }>, inflation: Record<string, number> | undefined): WageReading | undefined {
  const ys = Object.keys(years).sort();
  const year = ys[ys.length - 1];
  if (!year) return undefined;
  const cur = years[year];
  const out: WageReading = { year, monthly: cur.value };
  const prev = years[String(Number(year) - 1)];
  if (!prev) return { ...out, growthNote: 'no_previous_year' };
  if (cur.brk) return { ...out, growthNote: 'break' };
  const nominal = (cur.value / prev.value - 1) * 100;
  out.nominalGrowthPct = round1(nominal);
  const infl = inflation?.[year];
  if (infl === undefined || infl <= -100) return { ...out, growthNote: 'no_inflation' };
  out.inflationPct = round1(infl);
  out.realGrowthPct = round1(((1 + nominal / 100) / (1 + infl / 100) - 1) * 100);
  return out;
}

export function buildWages(earnings: ReturnType<typeof parseIloEarnings>, inflation: Record<string, Record<string, number>>): Record<string, WageReading> {
  const out: Record<string, WageReading> = {};
  for (const [iso3, ys] of Object.entries(earnings || {})) {
    const r = wageReading(ys, inflation[iso3]);
    if (r) out[iso3] = r;
  }
  return out;
}

// --- House prices (BIS) ---

export interface HousePriceReading {
  /** Latest quarter with either figure, YYYYQn. */
  quarter: string;
  realYoyPct?: number;
  nominalYoyPct?: number;
}

export interface HousePricesPull {
  pulledAt: string;
  countries: Record<string, HousePriceReading>;
}

const ISO3_OF_BIS: Record<string, string> = Object.fromEntries(Object.entries(BIS_ISO2).map(([iso3, iso2]) => [iso2, iso3]));

/** The all-country WS_SPP answer -> the latest quarter per catalogue country, real and nominal y/y. */
export function parseBisPropertyAll(text: unknown): Record<string, HousePriceReading> {
  const latest: Record<string, Record<string, { R?: number; N?: number }>> = {};
  for (const r of parseBisCsv(text)) {
    if (r.UNIT_MEASURE !== '771' || (r.VALUE !== 'R' && r.VALUE !== 'N')) continue;
    const iso3 = ISO3_OF_BIS[r.REF_AREA];
    const q = quarterKey(r.TIME_PERIOD);
    const v = Number(r.OBS_VALUE);
    if (!iso3 || !q || r.OBS_VALUE === '' || r.OBS_VALUE === 'NaN' || !Number.isFinite(v)) continue;
    ((latest[iso3] ||= {})[q] ||= {})[r.VALUE as 'R' | 'N'] = v;
  }
  const out: Record<string, HousePriceReading> = {};
  for (const [iso3, qs] of Object.entries(latest)) {
    // The latest quarter with both figures; else the latest with either.
    const sorted = Object.keys(qs).sort();
    const quarter = [...sorted].reverse().find((q) => qs[q].R !== undefined && qs[q].N !== undefined) ?? sorted[sorted.length - 1];
    const x = qs[quarter];
    out[iso3] = { quarter, ...(x.R !== undefined ? { realYoyPct: round1(x.R) } : {}), ...(x.N !== undefined ? { nominalYoyPct: round1(x.N) } : {}) };
  }
  return out;
}

// --- Words ---

const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
/** "2025Q2" -> "2025 Q2". */
export const quarterLabel = (q: string) => q.replace(/^(\d{4})Q/, '$1 Q');

export function wageGrowthValue(w: WageReading, kind: 'nominal' | 'real'): string | undefined {
  const v = kind === 'nominal' ? w.nominalGrowthPct : w.realGrowthPct;
  return v === undefined ? undefined : `${signed(v)} on a year earlier (${w.year})`;
}
export function housePriceValue(h: HousePriceReading, kind: 'real' | 'nominal'): string | undefined {
  const v = kind === 'real' ? h.realYoyPct : h.nominalYoyPct;
  return v === undefined ? undefined : `${signed(v)} on a year earlier (${quarterLabel(h.quarter)})`;
}

export const WAGES_SOURCE = 'ILOSTAT (International Labour Organization), average monthly earnings of employees, local currency, all activities; CC BY 4.0';
export const REAL_WAGES_SOURCE = 'model: ILOSTAT nominal earnings growth deflated by World Bank consumer price inflation for the same year';
export const HOUSE_PRICES_SOURCE = 'BIS selected residential property prices';

export const WAGES_SETUP_HELP =
  'Wages come from ILOSTAT, the International Labour Organization\'s statistics, which the daily run downloads (npm run go -- daily, or Menu > Offline data > Download all country data). It has not been downloaded yet, or the download did not answer.';
export const WAGES_NOT_COVERED_HELP =
  'ILOSTAT was read but has no average monthly earnings for this country in local currency for all activities. Many countries outside the OECD report earnings only every few years, or not at all. The app shows Missing rather than an estimate.';
export const WAGES_GROWTH_HELP: Record<NonNullable<WageReading['growthNote']>, string> = {
  no_previous_year: 'ILOSTAT has earnings for the latest year but not for the year before, so the change cannot be worked out. The app shows Missing rather than compare years further apart.',
  break: 'ILOSTAT marks a break in the earnings series in the latest year (a new survey or a new definition), so the change on the year before would compare two different measures. The app shows Missing.',
  no_inflation: 'The World Bank has no consumer price inflation for this country in the year of the latest earnings figure, so real wage growth cannot be worked out.',
};
export const HOUSE_PRICES_SETUP_HELP =
  'House prices come from the BIS (Bank for International Settlements) residential property price series, which the daily run downloads. It has not been downloaded yet, or the download did not answer.';
export const HOUSE_PRICES_NOT_COVERED_HELP =
  'The BIS was read but publishes no residential property price series for this country. The BIS collects them from central banks and statistics offices in about 60 countries. The app shows Missing rather than an estimate.';
