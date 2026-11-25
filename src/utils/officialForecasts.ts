/**
 * Official forecasts side by side (CG2, quick wins QW3 and QW4): growth and inflation forecasts for
 * one country from public institutions, with the spread between them. A free stand-in for paid
 * consensus forecasts, labelled as official forecasts, never as a consensus.
 *
 *   IMF World Economic Outlook, DataMapper API v1: NGDP_RPCH (real GDP growth) and PCPIPCH
 *     (consumer prices, annual average), every country in one reply.
 *   World Bank Global Economic Prospects, World Bank API source 27, indicator NYGDPMKTPKDZ (GDP
 *     growth at average 2010-19 prices and exchange rates), every country in one reply; the reply's
 *     "lastupdated" names the edition. CC BY 4.0 (World Bank Data Catalog, read 2026-11-23).
 *   OECD Economic Outlook, OECD SDMX API, dataflow OECD.ECO.MAD,DSD_EO@DF_EO: GDPV_ANNPCT (real GDP
 *     growth) and CPI_YTYPCT (consumer price inflation); OECD members and partners only. The edition
 *     is read from the dataflow's name ("Economic Outlook No 119 (Edition 2026/1)"). OECD terms
 *     (read 2026-11-23): data may be used for any purpose, including commercial, with credit.
 *   Federal Reserve Bank of Philadelphia, Survey of Professional Forecasters, median levels workbook
 *     (medianLevel.xlsx), United States only: RGDPA to RGDPD (annual-average real GDP levels, this
 *     year to three years on, so growth is known from next year on) and CPIA to CPIC (CPI inflation,
 *     fourth quarter on fourth quarter). No terms of use were found on the Bank's site (2026-11-23),
 *     so the workbook is read only from data/local/philly-spf/ when you save it there; never fetched,
 *     never shipped.
 *
 * Layouts were read live from the owner's computer on 2026-11-23 (the build machine cannot reach
 * these hosts). A reply that does not match gives nothing, so a changed layout shows as Missing with
 * the reason, never as a wrong number. Browser-safe and pure: no fs, no network.
 */

export type ForecastMeasure = 'gdp' | 'cpi';
export type ForecastSourceId = 'imf_weo' | 'wb_gep' | 'oecd_eo' | 'philly_spf';

/** How a yearly figure is formed; only rows with the same basis are compared in the spread. */
export type ForecastBasis = 'annual_average' | 'q4_on_q4';

export interface ForecastRow {
  source: ForecastSourceId;
  measure: ForecastMeasure;
  /** Year -> figure, % (one decimal). */
  values: Record<string, number>;
  basis: ForecastBasis;
  /** Which edition or survey the figures come from, as the source names it, when known. */
  edition?: string;
}

/** Why a source has no figure for this country; the panel words each code in the chosen language. */
export type ForecastMissingWhy = 'not_downloaded' | 'not_read' | 'no_years' | 'not_in_gep' | 'not_in_oecd' | 'philly_no_file' | 'philly_bad_file';

export interface ForecastMissing {
  source: ForecastSourceId;
  measure: ForecastMeasure;
  why: ForecastMissingWhy;
  /** The download's own problem line, when there is one (as the source answered, in English). */
  detail?: string;
}

export const SOURCE_LABEL: Record<ForecastSourceId, string> = {
  imf_weo: 'IMF World Economic Outlook',
  wb_gep: 'World Bank Global Economic Prospects',
  oecd_eo: 'OECD Economic Outlook',
  philly_spf: 'Philadelphia Fed Survey of Professional Forecasters (median)',
};

export const SOURCE_URL: Record<ForecastSourceId, string> = {
  imf_weo: 'https://www.imf.org/external/datamapper/datasets/WEO',
  wb_gep: 'https://www.worldbank.org/en/publication/global-economic-prospects',
  oecd_eo: 'https://www.oecd.org/en/topics/economic-outlook.html',
  philly_spf: 'https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/median-forecasts',
};

export const MEASURE_LABEL: Record<ForecastMeasure, string> = {
  gdp: 'Real GDP growth, %',
  cpi: 'Consumer price inflation, %',
};

export const BASIS_LABEL: Record<ForecastBasis, string> = {
  annual_average: 'annual average on annual average',
  q4_on_q4: 'fourth quarter on fourth quarter',
};

// --- Addresses ---------------------------------------------------------------------------------

export const WEO_CODES: Record<ForecastMeasure, string> = { gdp: 'NGDP_RPCH', cpi: 'PCPIPCH' };
export const weoAllUrl = (code: string) => `https://www.imf.org/external/datamapper/api/v1/${code}`;

export const GEP_SOURCE = 27;
export const GEP_CODE = 'NYGDPMKTPKDZ';
/** Every country, from the year before `from` to four years on: about 1,300 rows, one page. */
export const gepAllUrl = (from: number) =>
  `https://api.worldbank.org/v2/country/all/indicator/${GEP_CODE}?source=${GEP_SOURCE}&format=json&per_page=20000&date=${from - 1}:${from + 4}`;

/** One country, for the connection check. */
export const gepCountryUrl = (iso3: string, from: number) =>
  `https://api.worldbank.org/v2/country/${iso3}/indicator/${GEP_CODE}?source=${GEP_SOURCE}&format=json&per_page=50&date=${from - 1}:${from + 4}`;
/** One country, for the connection check. */
export const oecdEoCountryUrl = (iso3: string, from: number) =>
  `https://sdmx.oecd.org/public/rest/data/OECD.ECO.MAD,DSD_EO@DF_EO,/${iso3}.GDPV_ANNPCT+CPI_YTYPCT.A?startPeriod=${from - 1}&format=csvfile`;

export const OECD_EO_FLOW = 'OECD.ECO.MAD,DSD_EO@DF_EO,';
export const oecdEoAllUrl = (from: number) =>
  `https://sdmx.oecd.org/public/rest/data/${OECD_EO_FLOW}/.GDPV_ANNPCT+CPI_YTYPCT.A?startPeriod=${from - 1}&format=csvfile`;
export const OECD_EO_DATAFLOW_URL = 'https://sdmx.oecd.org/public/rest/dataflow/OECD.ECO.MAD/DSD_EO@DF_EO/latest';

export const PHILLY_SPF_DIR = 'data/local/philly-spf';

const round1 = (v: number) => Math.round(v * 10) / 10;
const isYear = (s: unknown) => typeof s === 'string' && /^\d{4}$/.test(s);

// --- Parsers -----------------------------------------------------------------------------------

/** IMF DataMapper v1 reply for one code: { values: { CODE: { ISO3: { "2026": 2.1 } } } } -> ISO3 -> year -> value. */
export function parseWeoAll(json: any, code: string): Record<string, Record<string, number>> {
  const byIso = json?.values?.[code];
  const out: Record<string, Record<string, number>> = {};
  if (!byIso || typeof byIso !== 'object') return out;
  for (const [iso, years] of Object.entries(byIso as Record<string, unknown>)) {
    if (!/^[A-Z]{3}$/.test(iso) || !years || typeof years !== 'object') continue;
    const row: Record<string, number> = {};
    for (const [y, v] of Object.entries(years as Record<string, unknown>)) {
      if (isYear(y) && typeof v === 'number' && Number.isFinite(v)) row[y] = round1(v);
    }
    if (Object.keys(row).length) out[iso] = row;
  }
  return out;
}

/** World Bank API reply [meta, rows] -> ISO3 -> year -> value, and the edition from meta.lastupdated. */
export function parseGepAll(json: any): { edition?: string; byIso: Record<string, Record<string, number>> } {
  const byIso: Record<string, Record<string, number>> = {};
  if (!Array.isArray(json) || !Array.isArray(json[1])) return { byIso };
  const meta = json[0] || {};
  for (const r of json[1]) {
    const iso = r?.countryiso3code;
    const v = r?.value;
    if (typeof iso !== 'string' || !/^[A-Z]{3}$/.test(iso) || !isYear(r?.date) || typeof v !== 'number' || !Number.isFinite(v)) continue;
    (byIso[iso] ||= {})[r.date] = round1(v);
  }
  const edition = typeof meta.lastupdated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meta.lastupdated) ? `updated ${meta.lastupdated}` : undefined;
  return { edition, byIso };
}

/** OECD SDMX "csvfile": REF_AREA, MEASURE, TIME_PERIOD, OBS_VALUE columns wherever they sit. */
export function parseOecdEoCsv(text: string): Record<string, Partial<Record<ForecastMeasure, Record<string, number>>>> {
  const out: Record<string, Partial<Record<ForecastMeasure, Record<string, number>>>> = {};
  const lines = String(text || '').replace(/^﻿/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return out;
  const split = (l: string) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
  const head = split(lines[0]).map((h) => h.toUpperCase());
  const ai = head.indexOf('REF_AREA');
  const mi = head.indexOf('MEASURE');
  const ti = head.indexOf('TIME_PERIOD');
  const vi = head.indexOf('OBS_VALUE');
  if (ai < 0 || mi < 0 || ti < 0 || vi < 0) return out;
  const MEASURES: Record<string, ForecastMeasure> = { GDPV_ANNPCT: 'gdp', CPI_YTYPCT: 'cpi' };
  for (const l of lines.slice(1)) {
    const c = split(l);
    const m = MEASURES[c[mi]];
    const iso = c[ai];
    const v = Number(c[vi]);
    if (!m || !/^[A-Z]{3}$/.test(iso) || !isYear(c[ti]) || c[vi] === '' || !Number.isFinite(v)) continue;
    ((out[iso] ||= {})[m] ||= {})[c[ti]] = round1(v);
  }
  return out;
}

/** "Economic Outlook No 119 (Edition 2026/1)" from the dataflow structure, when it is there. */
export function parseOecdEoEdition(xml: string): string | undefined {
  const m = String(xml || '').match(/Economic Outlook No\.?\s*(\d+)\s*\(Edition\s*(\d{4}\/\d)\)/i);
  return m ? `Economic Outlook No ${m[1]} (Edition ${m[2]})` : undefined;
}

/**
 * The newest survey in the Philadelphia Fed median levels workbook. `rgdp` and `cpi` are the RGDP
 * and CPI sheets as rows of cell text (first row = headers YEAR, QUARTER, RGDP1..., RGDPA...).
 * Growth from annual-average levels: next year = RGDPB / RGDPA - 1, and so on; this year needs last
 * year's actual average, which the workbook does not hold, so it is left out. CPI A to C are already
 * rates (fourth quarter on fourth quarter).
 */
export function phillySpfLatest(rgdp: string[][] | null, cpi: string[][] | null): { survey: string; gdp: Record<string, number>; cpi: Record<string, number> } | null {
  const latest = (rows: string[][] | null) => {
    if (!rows || rows.length < 2) return null;
    const head = rows[0].map((h) => String(h).trim().toUpperCase());
    const yi = head.indexOf('YEAR');
    const qi = head.indexOf('QUARTER');
    if (yi < 0 || qi < 0) return null;
    let best: { year: number; q: number; row: string[] } | null = null;
    for (const r of rows.slice(1)) {
      const y = Number(r[yi]);
      const q = Number(r[qi]);
      if (!Number.isInteger(y) || !Number.isInteger(q) || q < 1 || q > 4) continue;
      if (!best || y > best.year || (y === best.year && q > best.q)) best = { year: y, q, row: r };
    }
    return best ? { ...best, head } : null;
  };
  const num = (s: string | undefined) => {
    if (s === undefined || s === '' || /#N\/A/i.test(s)) return NaN;
    return Number(s);
  };
  const g = latest(rgdp);
  const c = latest(cpi);
  const base = g || c;
  if (!base) return null;
  const out = { survey: `${base.year} Q${base.q} survey`, gdp: {} as Record<string, number>, cpi: {} as Record<string, number> };
  if (g) {
    const lv = ['RGDPA', 'RGDPB', 'RGDPC', 'RGDPD'].map((k) => num(g.row[g.head.indexOf(k)]));
    for (let i = 1; i < lv.length; i++) {
      if (Number.isFinite(lv[i]) && Number.isFinite(lv[i - 1]) && lv[i - 1] > 0) out.gdp[String(g.year + i)] = round1((lv[i] / lv[i - 1] - 1) * 100);
    }
  }
  if (c) {
    ['CPIA', 'CPIB', 'CPIC'].forEach((k, i) => {
      const v = num(c.row[c.head.indexOf(k)]);
      if (c.head.indexOf(k) >= 0 && Number.isFinite(v)) out.cpi[String(c.year + i)] = round1(v);
    });
  }
  return out;
}

// --- The table ---------------------------------------------------------------------------------

export interface OfficialForecastsFile {
  pulledAt: string;
  weo?: { gdp: Record<string, Record<string, number>>; cpi: Record<string, Record<string, number>> };
  gep?: { edition?: string; byIso: Record<string, Record<string, number>> };
  oecd?: { edition?: string; byIso: Record<string, Partial<Record<ForecastMeasure, Record<string, number>>>> };
  /** Why a source is not in this copy, by source. */
  problems?: Partial<Record<ForecastSourceId, string>>;
}

export interface SpreadCell {
  year: string;
  /** Highest minus lowest, among rows on the same basis; only with two or more sources. */
  spread: number | null;
  sources: number;
}

export interface OfficialForecastsReply {
  iso3: string;
  years: string[];
  measures: Array<{ measure: ForecastMeasure; rows: ForecastRow[]; missing: ForecastMissing[]; spread: SpreadCell[] }>;
  pulledAt: string | null;
}

/** Puts one country's rows together for this year and the next two, with the spread per year. */
export function officialForecastsFor(
  iso3: string,
  file: OfficialForecastsFile | null,
  philly: { survey: string; gdp: Record<string, number>; cpi: Record<string, number> } | null,
  opts: { now?: Date; phillyFile?: boolean } = {}
): OfficialForecastsReply {
  const now = opts.now ?? new Date();
  const y0 = now.getUTCFullYear();
  const years = [String(y0), String(y0 + 1), String(y0 + 2)];
  const iso = iso3.toUpperCase();
  const pick = (vals: Record<string, number> | undefined) => {
    const o: Record<string, number> = {};
    for (const y of years) if (vals && typeof vals[y] === 'number') o[y] = vals[y];
    return o;
  };
  const notRead = (source: ForecastSourceId, measure: ForecastMeasure): ForecastMissing =>
    file ? { source, measure, why: 'not_read', ...(file.problems?.[source] ? { detail: file.problems[source] } : {}) } : { source, measure, why: 'not_downloaded' };

  const measures = (['gdp', 'cpi'] as ForecastMeasure[]).map((measure) => {
    const rows: ForecastRow[] = [];
    const missing: ForecastMissing[] = [];
    const push = (source: ForecastSourceId, vals: Record<string, number> | undefined, basis: ForecastBasis, whyIfNone: ForecastMissingWhy, edition?: string) => {
      const v = pick(vals);
      if (Object.keys(v).length) rows.push({ source, measure, values: v, basis, ...(edition ? { edition } : {}) });
      else missing.push({ source, measure, why: whyIfNone });
    };

    // IMF WEO
    if (file?.weo) push('imf_weo', file.weo[measure][iso], 'annual_average', 'no_years');
    else missing.push(notRead('imf_weo', measure));

    // World Bank GEP: growth only; it covers emerging and developing economies and the largest advanced ones.
    if (measure === 'gdp') {
      if (file?.gep) push('wb_gep', file.gep.byIso[iso], 'annual_average', file.gep.byIso[iso] ? 'no_years' : 'not_in_gep', file.gep.edition);
      else missing.push(notRead('wb_gep', measure));
    }

    // OECD EO: OECD members and partner economies only.
    if (file?.oecd) push('oecd_eo', file.oecd.byIso[iso]?.[measure], 'annual_average', file.oecd.byIso[iso] ? 'no_years' : 'not_in_oecd', file.oecd.edition);
    else missing.push(notRead('oecd_eo', measure));

    // Philadelphia Fed SPF: United States only, from your file (no terms found, so never downloaded).
    if (iso === 'USA') {
      if (philly) push('philly_spf', philly[measure], measure === 'cpi' ? 'q4_on_q4' : 'annual_average', 'no_years', philly.survey);
      else missing.push({ source: 'philly_spf', measure, why: opts.phillyFile ? 'philly_bad_file' : 'philly_no_file' });
    }

    const spread: SpreadCell[] = years.map((year) => {
      const vals = rows.filter((r) => r.basis === 'annual_average' && typeof r.values[year] === 'number').map((r) => r.values[year]);
      return { year, sources: vals.length, spread: vals.length >= 2 ? round1(Math.max(...vals) - Math.min(...vals)) : null };
    });
    return { measure, rows, missing, spread };
  });

  return { iso3: iso, years, measures, pulledAt: file?.pulledAt ?? null };
}
