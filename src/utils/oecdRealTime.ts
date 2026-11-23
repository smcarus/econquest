/**
 * OECD real-time data (platform comparison gap CG15): the OECD's "Short-term economic statistics
 * revisions" dataset (SDMX dataflow OECD.SDD.STES,DSD_STES_REVISIONS@DF_STES_REVISIONS, no key)
 * keeps each monthly edition of the Main Economic Indicators since February 1999, so a figure can be
 * read as it stood in any month, for every OECD member.
 *
 *   B1GQ_Q  GDP volume, quarterly, national currency  -> % q/q (transform qoq)
 *   CP      consumer price index, monthly             -> % y/y (transform yoy)
 *
 * An edition is taken as published on the first day of its month (the OECD does not give the day),
 * and holds until the day before the next edition. The rows match the ALFRED shape, so the real-time
 * tests (utils/realTimeEval.ts) read them unchanged. Browser-safe, pure.
 */
import type { AlfredDef, AlfredRow } from './alfredVintages';

export const OECD_RT_DATAFLOW = 'OECD.SDD.STES,DSD_STES_REVISIONS@DF_STES_REVISIONS,4.0';
export const OECD_RT_SOURCE = 'OECD Short-term economic statistics revisions (Main Economic Indicators editions since 1999), OECD Data Explorer';

/** The 38 OECD members (membership as of 2026). */
export const OECD_MEMBERS = ['AUS', 'AUT', 'BEL', 'CAN', 'CHL', 'COL', 'CRI', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'ISL', 'IRL', 'ISR', 'ITA', 'JPN', 'KOR', 'LVA', 'LTU', 'LUX', 'MEX', 'NLD', 'NZL', 'NOR', 'POL', 'PRT', 'SVK', 'SVN', 'ESP', 'SWE', 'CHE', 'TUR', 'GBR', 'USA'];

export type OecdRtMeasure = 'gdp' | 'cpi';

export const OECD_RT_DEFS: Record<OecdRtMeasure, AlfredDef & { measure: string; sdmxFreq: 'Q' | 'M' }> = {
  gdp: { id: 'OECD B1GQ_Q', label: 'Real GDP growth (% q/q), OECD editions', unit: '% q/q', transform: 'qoq', freq: 'quarterly', measure: 'B1GQ_Q', sdmxFreq: 'Q' },
  cpi: { id: 'OECD CP', label: 'Consumer price inflation (% y/y), OECD editions', unit: '% y/y', transform: 'yoy', freq: 'monthly', measure: 'CP', sdmxFreq: 'M' },
};

export function oecdRtUrl(iso3: string, m: OecdRtMeasure, startPeriod: string, editions?: string[]): string {
  const d = OECD_RT_DEFS[m];
  return `https://sdmx.oecd.org/public/rest/data/${OECD_RT_DATAFLOW}/${iso3}.${d.sdmxFreq}.${d.measure}...${editions?.length ? editions.join('+') : ''}?format=csvfile&startPeriod=${startPeriod}`;
}

/** Period key (2024-Q3, 2024-07) to the vintage row date (first day of the period's first month). */
export function rowDate(period: string): string | null {
  const q = /^(\d{4})-Q([1-4])$/.exec(period);
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, '0')}-01`;
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

/** Edition code (202501) to its first day. */
export const editionDay = (ed: string) => `${ed.slice(0, 4)}-${ed.slice(4, 6)}-01`;

function dayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** CSV reply: edition -> row date -> value, for one area and measure. Rows with other areas or a non-number are skipped. */
export function parseOecdRevisionsCsv(text: string, iso3: string): Map<string, Map<string, number>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const out = new Map<string, Map<string, number>>();
  if (!lines.length) return out;
  const head = lines[0].split(',');
  const ix = (k: string) => head.indexOf(k);
  const [iArea, iEd, iTime, iVal] = [ix('REF_AREA'), ix('EDITION'), ix('TIME_PERIOD'), ix('OBS_VALUE')];
  if ([iArea, iEd, iTime, iVal].some((i) => i < 0)) return out;
  for (const l of lines.slice(1)) {
    const f = l.split(',');
    if (f[iArea] !== iso3 || !/^\d{6}$/.test(f[iEd])) continue;
    const date = rowDate(f[iTime]);
    const v = Number(f[iVal]);
    if (!date || f[iVal] === '' || !Number.isFinite(v)) continue;
    if (!out.has(f[iEd])) out.set(f[iEd], new Map());
    out.get(f[iEd])!.set(date, v);
  }
  return out;
}

/**
 * Editions to ALFRED-style rows: each period's value with the first and last day it was the
 * published one. A run of editions with the same value is one row; a period that drops out of a
 * later edition stops at the day before that edition.
 */
export function editionsToRows(editions: Map<string, Map<string, number>>): AlfredRow[] {
  return extendRows([], editions);
}

/** Adds later editions to rows already saved (rows still current end on 9999-12-31). */
export function extendRows(saved: AlfredRow[], editions: Map<string, Map<string, number>>): AlfredRow[] {
  const eds = [...editions.keys()].sort();
  const rows: AlfredRow[] = saved.filter((r) => r.to !== '9999-12-31').map((r) => ({ ...r }));
  const open = new Map<string, AlfredRow>(saved.filter((r) => r.to === '9999-12-31').map((r) => [r.date, { ...r }]));
  for (const ed of eds) {
    const day = editionDay(ed);
    const vals = editions.get(ed)!;
    for (const [date, row] of open) {
      const v = vals.get(date);
      if (v === undefined || v !== row.value) {
        row.to = dayBefore(day);
        rows.push(row);
        open.delete(date);
      }
    }
    for (const [date, v] of vals) if (!open.has(date)) open.set(date, { date, value: v, from: day, to: '9999-12-31' });
  }
  rows.push(...open.values());
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.from < b.from ? -1 : 1));
}

/** The newest edition in saved rows (the latest "from" day), as 202501; null when none. */
export function lastEdition(rows: AlfredRow[]): string | null {
  let best = '';
  for (const r of rows) if (r.from > best) best = r.from;
  return best ? best.slice(0, 4) + best.slice(5, 7) : null;
}

/** Edition codes from the month after `after` (202501) up to `through` (inclusive), oldest first. */
export function editionsBetween(after: string, through: string): string[] {
  const out: string[] = [];
  let y = Number(after.slice(0, 4));
  let m = Number(after.slice(4, 6));
  for (;;) {
    m++;
    if (m > 12) (m = 1), y++;
    const ed = `${y}${String(m).padStart(2, '0')}`;
    if (ed > through) break;
    out.push(ed);
  }
  return out;
}
