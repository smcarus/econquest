/**
 * UK figures as first published (G13), from the ONS revision triangle for GDP (ABMI, chained volume
 * measures, quarter-on-quarter growth; Open Government Licence v3.0). The ONS publishes it as a zip
 * with "ABMI - Quarterly GDP at Market Prices.xlsx" after each quarterly national accounts release.
 *
 * Layout (read from the 30 September 2026 edition, 12 November 2026): worksheet "triangle"; a row
 * "Relating to Period | 1992 Q1 | 1992 Q2 | ..." holds the quarters; each later row is one
 * publication, labelled with its month ("Apr-92" ... "Sep-26"), and holds the growth figures as
 * that publication printed them. Summary rows ("Month 2 estimate", "Latest Estimate") are skipped.
 *
 * The file gives the month of each publication, not the day, so each publication is dated the last
 * day of its month: a reading "as known on" a day never uses a figure before it could have been out.
 *
 * Browser-safe, pure (the xlsx is read with src/utils/xlsxRead.ts).
 */
import type { AlfredDef } from './alfredVintages';
import type { VintageCell } from './firstPublished';
import { periodStart } from './ecbRealTime';
import { readXlsxSheet } from './xlsxRead';

export const ONS_TRIANGLE_SERIES: AlfredDef[] = [{ id: 'ABMI', label: 'UK real GDP growth (% q/q)', unit: '% q/q', transform: 'level', freq: 'quarterly' }];

export const ONS_TRIANGLE_SOURCE = 'ONS revision triangle for GDP (ABMI, chained volume measures), Office for National Statistics, Open Government Licence v3.0';
export const ONS_TRIANGLE_PAGE = 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/revisionstrianglesforukgdpabmi';
export const ONS_TRIANGLE_SHEET = 'triangle';
export const ONS_TRIANGLE_FOLDER = 'data/local/ons-triangles';
export const ONS_TRIANGLE_SETUP_HELP = `The ONS did not let the app download the GDP revision triangle. Open ${ONS_TRIANGLE_PAGE} in your browser, download the latest abmi.zip and put it in ${ONS_TRIANGLE_FOLDER}; the app reads it from there.`;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function lastDay(y: number, m: number): string {
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "Apr-92", "Apr 1992", "April 2026" or an Excel date serial -> last day of that month; else undefined. */
export function publicationDay(label: string): string | undefined {
  const s = String(label ?? '').trim();
  const m = /^([A-Za-z]{3})[a-z]*[-\s](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const mi = MONTHS.indexOf(m[1].toLowerCase());
    if (mi < 0) return undefined;
    const y = m[2].length === 4 ? Number(m[2]) : Number(m[2]) + (Number(m[2]) >= 50 ? 1900 : 2000);
    return lastDay(y, mi + 1);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    if (d.getUTCFullYear() < 1950 || d.getUTCFullYear() > 2100) return undefined;
    return lastDay(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }
  return undefined;
}

/** The "triangle" worksheet's rows -> cells (period, publication day, value). */
export function parseOnsTriangle(rows: string[][]): VintageCell[] {
  const hi = rows.findIndex((r) => /^relating to period/i.test(String(r?.[0] ?? '').trim()));
  if (hi < 0) return [];
  const periods = rows[hi].map((c, k) => (k === 0 ? undefined : periodStart(String(c ?? '').trim().replace(/\s+/, '-'))));
  const out: VintageCell[] = [];
  for (const r of rows.slice(hi + 1)) {
    const vintage = publicationDay(r?.[0] ?? '');
    if (!vintage) continue;
    r.forEach((c, k) => {
      const date = periods[k];
      const raw = String(c ?? '').trim();
      const value = Number(raw);
      if (date && raw !== '' && Number.isFinite(value)) out.push({ date, vintage, value: Number(value.toFixed(3)) });
    });
  }
  return out;
}

/** The quarterly workbook's bytes -> cells; empty when the sheet is missing. */
export async function readOnsTriangle(xlsx: Uint8Array): Promise<VintageCell[]> {
  const rows = await readXlsxSheet(xlsx, ONS_TRIANGLE_SHEET);
  return rows ? parseOnsTriangle(rows) : [];
}

/** ONS page JSON (`<page>/data`) -> the newest edition's page uri. */
export function latestEditionUri(pageJson: unknown): string | undefined {
  const d = (pageJson as { datasets?: Array<{ uri?: string }> })?.datasets;
  return Array.isArray(d) && typeof d[0]?.uri === 'string' ? d[0].uri : undefined;
}

/** Edition JSON (`<edition>/data`) -> the download link of its file. */
export function editionFileUrl(editionUri: string, editionJson: unknown): string | undefined {
  const f = (editionJson as { downloads?: Array<{ file?: string }> })?.downloads?.[0]?.file;
  return typeof f === 'string' && f ? `https://www.ons.gov.uk/file?uri=${encodeURIComponent(`${editionUri}/${f}`)}` : undefined;
}
