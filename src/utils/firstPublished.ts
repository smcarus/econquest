/**
 * Figures as first published for the euro area (G12, ECB Euro Area Real-Time Database) and the UK
 * (G13, ONS revision triangles): the shared part that does not depend on either file's layout.
 *
 * Both sources come down to cells: one period's value as one release (vintage) printed it. This
 * turns those cells into the same rows the US vintages use (src/utils/alfredVintages.ts: a value
 * with the first and last day it was the published one), so the US screen's functions (figureOn,
 * releasesOf, alfredReply) read all three areas the same way.
 *
 * - A release that repeats the previous value does not start a new row.
 * - A release that no longer prints a period ends that period's row the day before.
 * - The newest release's values run to 9999-12-31 (still current).
 *
 * Browser-safe, pure.
 */
import type { AlfredRow } from './alfredVintages';

export interface VintageCell {
  /** Observation period, first day of the month or quarter (YYYY-MM-DD). */
  date: string;
  /** Day the release came out (YYYY-MM-DD). */
  vintage: string;
  value: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STILL_CURRENT = '9999-12-31';

export function dayBefore(day: string): string {
  const t = Date.parse(`${day}T00:00:00Z`) - 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Cells (any order) -> rows sorted by period then first day. Bad dates and non-finite values are skipped. */
export function cellsToRows(cells: VintageCell[]): AlfredRow[] {
  const ok = cells.filter((c) => DAY.test(c.date) && DAY.test(c.vintage) && typeof c.value === 'number' && Number.isFinite(c.value));
  const vintages = [...new Set(ok.map((c) => c.vintage))].sort();
  const byDate = new Map<string, Map<string, number>>();
  for (const c of ok) {
    const m = byDate.get(c.date) || new Map<string, number>();
    m.set(c.vintage, c.value);
    byDate.set(c.date, m);
  }
  const out: AlfredRow[] = [];
  for (const date of [...byDate.keys()].sort()) {
    const m = byDate.get(date)!;
    let open: AlfredRow | null = null;
    for (const v of vintages) {
      const value = m.get(v);
      if (value === undefined) {
        if (open) {
          open.to = dayBefore(v);
          out.push(open);
          open = null;
        }
        continue;
      }
      if (open && open.value === value) continue;
      if (open) {
        open.to = dayBefore(v);
        out.push(open);
      }
      open = { date, value, from: v, to: STILL_CURRENT };
    }
    if (open) out.push(open);
  }
  return out;
}

/** The days a release came out, oldest first. */
export function releaseDays(rows: AlfredRow[]): string[] {
  return [...new Set(rows.map((r) => r.from))].sort();
}

/** The value of each period as first published (the first row of each period). */
export function firstPrints(rows: AlfredRow[]): Array<{ date: string; day: string; value: number }> {
  const seen = new Set<string>();
  const out: Array<{ date: string; day: string; value: number }> = [];
  for (const r of rows) {
    if (seen.has(r.date)) continue;
    seen.add(r.date);
    out.push({ date: r.date, day: r.from, value: r.value });
  }
  return out;
}
