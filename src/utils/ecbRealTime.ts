/**
 * Euro area figures as first published (G12), from the ECB Euro Area Real-Time Database (dataset
 * RTD on the ECB Data Portal, no key). The ECB keeps every value an observation has had, with the
 * time it took effect (VALID_FROM) and, for a value later removed, the time it stopped (VALID_TO);
 * asking with includeHistory=true returns them all. They become the same rows as the US vintages
 * (src/utils/alfredVintages.ts), so one screen reads both.
 *
 *   RTD.Q.S0.S.G_GDPM_TO_C.E  GDP at market prices, chain-linked volumes, euro, seasonally adjusted -> % q/q
 *   RTD.M.S0.N.P_C_OV.A       HICP overall index, annual rate of change, %                        -> as published
 *   RTD.M.S0.S.L_UNETO.F      standardised unemployment rate, total, seasonally adjusted, %       -> as published
 *
 * S0 is the euro area as the ECB counted it at each release (its "moving concept"), so a figure
 * from 2014 covers the members of 2014. The codes were read from the ECB code lists on Sam's Mac
 * (npm run check:vintages, 12 November 2026). The revision history goes back as far as the ECB
 * Data Portal recorded it, not to the start of each series.
 *
 * Browser-safe, pure.
 */
import type { AlfredDef, AlfredRow } from './alfredVintages';
import { dayBefore } from './firstPublished';
import { parseCsv } from './ucdpConflict';

export const ECB_RTD_SERIES: AlfredDef[] = [
  { id: 'Q.S0.S.G_GDPM_TO_C.E', label: 'Euro area real GDP growth (% q/q)', unit: '% q/q', transform: 'qoq', freq: 'quarterly' },
  { id: 'M.S0.N.P_C_OV.A', label: 'Euro area HICP inflation (% y/y)', unit: '% y/y', transform: 'level', freq: 'monthly' },
  { id: 'M.S0.S.L_UNETO.F', label: 'Euro area unemployment rate (%)', unit: '%', transform: 'level', freq: 'monthly' },
];

export const ECB_RTD_SOURCE = 'ECB Euro Area Real-Time Database (RTD), ECB Data Portal; Source: ECB statistics';

export const ecbRtdUrl = (key: string, startPeriod = '1999') =>
  `https://data-api.ecb.europa.eu/service/data/RTD/${key}?format=csvdata&includeHistory=true&startPeriod=${startPeriod}`;

/** "2024-Q2" -> 2024-04-01, "2026-02" -> 2026-02-01, "2026" -> 2026-01-01; anything else undefined. */
export function periodStart(p: string): string | undefined {
  let m = /^(\d{4})-Q([1-4])$/.exec(p);
  if (m) return `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, '0')}-01`;
  m = /^(\d{4})-(\d{2})$/.exec(p);
  if (m) return `${m[1]}-${m[2]}-01`;
  return /^\d{4}$/.test(p) ? `${p}-01-01` : undefined;
}

const day = (s: string | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined);

/**
 * CSV with history -> rows. Each period's values are put in the order they took effect; a value
 * runs to the day before the next one (or the day before it was removed), the newest to
 * 9999-12-31. A value that repeats the one before does not start a new row; one replaced on the
 * day it appeared is dropped.
 */
export function parseEcbHistory(csv: string): AlfredRow[] {
  const table = parseCsv(csv);
  if (table.length < 2) return [];
  const col = (name: string) => table[0].indexOf(name);
  const [ti, vi, ai, fi, ui] = [col('TIME_PERIOD'), col('OBS_VALUE'), col('ACTION'), col('VALID_FROM'), col('VALID_TO')];
  if (ti < 0 || vi < 0) return [];
  type Event = { at: string; value: number | null };
  const byDate = new Map<string, Event[]>();
  for (const r of table.slice(1)) {
    const date = periodStart(r[ti] || '');
    if (!date) continue;
    const list = byDate.get(date) || [];
    const action = ai >= 0 ? r[ai] : '';
    const raw = (r[vi] || '').trim();
    const value = Number(raw);
    if (action === 'Delete') {
      const at = day(r[ui]) || day(r[fi]);
      if (at) list.push({ at, value: null });
    } else if (raw !== '' && Number.isFinite(value)) {
      // No history columns (an ordinary reply): the value counts from an unknown day, kept as 1999-01-01.
      const at = fi >= 0 ? day(r[fi]) : '1999-01-01';
      if (!at) continue;
      list.push({ at, value });
      const until = ui >= 0 ? day(r[ui]) : undefined;
      if (until) list.push({ at: until, value: null });
    }
    byDate.set(date, list);
  }
  const out: AlfredRow[] = [];
  for (const date of [...byDate.keys()].sort()) {
    // Same day: a value beats the end of the one before it (VALID_TO of one line is VALID_FROM of
    // the next); between two values the later line wins.
    const events = byDate.get(date)!.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    const merged: Event[] = [];
    for (const e of events) {
      const last = merged[merged.length - 1];
      if (last && last.at === e.at) {
        if (e.value !== null || last.value === null) merged[merged.length - 1] = e;
      } else merged.push(e);
    }
    let open: AlfredRow | null = null;
    for (const e of merged) {
      if (open && e.value === open.value) continue;
      if (open) {
        open.to = dayBefore(e.at);
        if (open.to >= open.from) out.push(open);
        open = null;
      }
      if (e.value !== null) open = { date, value: e.value, from: e.at, to: '9999-12-31' };
    }
    if (open) out.push(open);
  }
  return out;
}
