/**
 * Growth accounting (G27): how much of a country's growth came from more capital, more hours worked,
 * more human capital (schooling and its returns), and the rest (total factor productivity, TFP), from
 * the Penn World Table (CC BY 4.0, Feenstra, Inklaar and Timmer 2015).
 *
 * For each period, with average annual log changes (×100, % a year):
 *   GDP growth = α × capital growth + (1 − α) × (hours growth + human capital growth) + TFP growth
 * where α = 1 − the labour share of income, averaged over the period's years (PWT labsh). Hours =
 * persons engaged × average annual hours (PWT emp × avh); where PWT has no hours, persons engaged
 * alone, and the reading says so. Real GDP and the capital stock are at constant national prices
 * (rgdpna, rnna). TFP is what is left over: it also holds measurement error.
 *
 * Periods: 10-year spans ending at the edition's last year, going back while the figures last (at
 * most six). A description of the past, not a forecast. Browser-safe, pure.
 */

export const PWT_EDITION = 'PWT 11.0';
/**
 * The edition's Excel file. The GGDC page (www.rug.nl/ggdc/productivity/pwt/, March 2026) links it
 * on DataverseNL (doi 10.34894/FABVLR); the old www.rug.nl/ggdc/docs/pwt110.xlsx address answers 404.
 * Not downloadable from the cloud: connection check row pwt confirms it.
 */
export const PWT_URL = 'https://dataverse.nl/api/access/datafile/554105';
/** The name the downloaded workbook is kept under in data/local/pwt/. */
export const PWT_FILE_NAME = 'pwt110.xlsx';
export const PWT_CITATION = 'Feenstra, Robert C., Robert Inklaar and Marcel P. Timmer (2015), "The Next Generation of the Penn World Table", American Economic Review, 105(10), 3150-3182, available for download at www.ggdc.net/pwt';
export const PWT_SPAN = 10;
export const PWT_MAX_PERIODS = 6;
export const GA_METHOD =
  'Average annual log changes over each period: GDP growth = α × capital + (1 − α) × (hours + human capital) + TFP, with α = 1 − the labour share (PWT labsh) averaged over the period. Real GDP and capital at constant national prices (rgdpna, rnna); hours = persons engaged × average hours (emp × avh), or persons engaged where PWT has no hours; human capital index hc (years of schooling and returns to education). TFP is the residual.';

export interface PwtYear {
  year: number;
  rgdpna?: number;
  rnna?: number;
  emp?: number;
  avh?: number;
  hc?: number;
  labsh?: number;
}

export interface PwtFile {
  edition: string;
  /** Where the copy came from: the download address or your file's name. */
  from: string;
  readAt: string;
  countries: Record<string, PwtYear[]>;
}

export interface GaPeriod {
  from: number;
  to: number;
  gdp: number;
  capital: number;
  labour: number;
  humanCapital: number;
  tfp: number;
  capitalShare: number;
  /** true when hours are persons engaged only (no average hours in PWT). */
  personsOnly: boolean;
}

export interface GrowthAccounting {
  ok: true;
  edition: string;
  lastYear: number;
  periods: GaPeriod[];
  missing: string[];
  method: string;
  sources: string[];
}

export type GrowthAccountingOutcome = GrowthAccounting | { ok: false; reason: string };

const COLS = ['countrycode', 'year', 'rgdpna', 'rnna', 'emp', 'avh', 'hc', 'labsh'] as const;
const r2 = (v: number) => Math.round(v * 100) / 100 + 0;

/** Rows of the PWT "Data" sheet (header row first, anywhere in the first 20 rows) into years by ISO3. */
export function parsePwtRows(rows: Iterable<string[]>): Record<string, PwtYear[]> | null {
  const out: Record<string, PwtYear[]> = {};
  let at: Record<string, number> | null = null;
  let seen = 0;
  for (const r of rows) {
    if (!at) {
      if (++seen > 20) return null;
      const lower = r.map((c) => String(c || '').trim().toLowerCase());
      if (COLS.every((c) => lower.includes(c))) at = Object.fromEntries(COLS.map((c) => [c, lower.indexOf(c)]));
      continue;
    }
    const iso3 = String(r[at.countrycode] || '').trim().toUpperCase();
    const year = Number(r[at.year]);
    if (!/^[A-Z]{3}$/.test(iso3) || !Number.isInteger(year)) continue;
    const y: PwtYear = { year };
    for (const k of ['rgdpna', 'rnna', 'emp', 'avh', 'hc', 'labsh'] as const) {
      const raw = String(r[at[k]] ?? '').trim();
      const v = raw === '' ? NaN : Number(raw);
      if (Number.isFinite(v) && v > 0) y[k] = v;
    }
    (out[iso3] ||= []).push(y);
  }
  if (!at || !Object.keys(out).length) return null;
  for (const ys of Object.values(out)) ys.sort((a, b) => a.year - b.year);
  return out;
}

/** One period's decomposition, or null when an end lacks a figure. */
export function decompose(years: PwtYear[], from: number, to: number): GaPeriod | null {
  const a = years.find((y) => y.year === from);
  const b = years.find((y) => y.year === to);
  if (!a || !b || to <= from) return null;
  const n = to - from;
  const g = (x0?: number, x1?: number) => (x0 && x1 ? (Math.log(x1 / x0) / n) * 100 : undefined);
  const gY = g(a.rgdpna, b.rgdpna);
  const gK = g(a.rnna, b.rnna);
  const gH = g(a.hc, b.hc);
  const withHours = a.avh !== undefined && b.avh !== undefined && a.emp !== undefined && b.emp !== undefined;
  const gL = withHours ? g(a.emp! * a.avh!, b.emp! * b.avh!) : g(a.emp, b.emp);
  const shares = years.filter((y) => y.year >= from && y.year <= to && y.labsh !== undefined).map((y) => y.labsh!);
  if (gY === undefined || gK === undefined || gH === undefined || gL === undefined || shares.length < Math.ceil((n + 1) / 2)) return null;
  const alpha = 1 - shares.reduce((s, v) => s + v, 0) / shares.length;
  const capital = alpha * gK;
  const labour = (1 - alpha) * gL;
  const humanCapital = (1 - alpha) * gH;
  return { from, to, gdp: r2(gY), capital: r2(capital), labour: r2(labour), humanCapital: r2(humanCapital), tfp: r2(gY - capital - labour - humanCapital), capitalShare: r2(alpha), personsOnly: !withHours };
}

export function growthAccounting(file: PwtFile | null, iso3: string): GrowthAccountingOutcome {
  if (!file) return { ok: false, reason: 'The Penn World Table is not saved yet (it downloads once per edition while online, or put the PWT .xlsx in data/local/pwt/)' };
  const years = file.countries[iso3];
  if (!years?.length) return { ok: false, reason: `${file.edition} does not cover this country` };
  const complete = years.filter((y) => y.rgdpna && y.rnna && y.emp && y.hc);
  if (complete.length < PWT_SPAN + 1) return { ok: false, reason: `${file.edition} has fewer than ${PWT_SPAN + 1} years with real GDP, capital, employment and human capital for this country` };
  const lastYear = complete[complete.length - 1].year;
  const periods: GaPeriod[] = [];
  for (let to = lastYear; periods.length < PWT_MAX_PERIODS; to -= PWT_SPAN) {
    const p = decompose(years, to - PWT_SPAN, to);
    if (!p) break;
    periods.push(p);
  }
  if (!periods.length) return { ok: false, reason: `${file.edition} lacks the labour share for the last ${PWT_SPAN} years, so the split cannot be worked out` };
  periods.reverse();
  const missing: string[] = [];
  if (periods.some((p) => p.personsOnly)) missing.push('Average hours worked: PWT has none for some periods here, so labour there is persons engaged only');
  return { ok: true, edition: file.edition, lastYear, periods, missing, method: GA_METHOD, sources: [`Penn World Table (${file.edition}), Groningen Growth and Development Centre, CC BY 4.0: ${PWT_CITATION}`] };
}

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export function gaSentence(r: GrowthAccounting, name: string): string {
  const p = r.periods[r.periods.length - 1];
  return `${name}: from ${p.from} to ${p.to} real GDP grew ${p.gdp.toFixed(1)}% a year on average. Capital added ${sg(p.capital)} points, hours worked ${sg(p.labour)}, human capital ${sg(p.humanCapital)}, and productivity (TFP, what is left) ${sg(p.tfp)} (${r.edition}).`;
}

export const GA_CSV_HEADER = ['iso3', 'edition', 'from', 'to', 'gdp_growth_pct_yr', 'capital_pts', 'hours_pts', 'human_capital_pts', 'tfp_pts', 'capital_share', 'labour_is_persons_only', 'source'];
export function gaCsvRows(iso3: string, r: GrowthAccounting): Array<Array<string | number>> {
  return r.periods.map((p) => [iso3, r.edition, p.from, p.to, p.gdp, p.capital, p.labour, p.humanCapital, p.tfp, p.capitalShare, p.personsOnly ? 'yes' : 'no', r.sources[0]]);
}

/** The CSV file the panel offers (UTF-8 with byte order mark, so Excel keeps accents). */
export function gaCsv(iso3: string, r: GrowthAccounting): string {
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + [GA_CSV_HEADER, ...gaCsvRows(iso3, r)].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
