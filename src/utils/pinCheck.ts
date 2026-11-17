/**
 * Replication check (R2): does a figure pinned to a research notebook (R1, notebookPins.ts) still
 * hold? The chart is drawn again from what was asked for, with the app's figures as they are now,
 * and every pinned point (each line's dates up to the pin's As of day) is compared with today's
 * value at the same date. New dates after the As of day are counted, not treated as a change.
 *
 *   Same       every pinned point has the same value today
 *   Revised    one or more values changed (old and new shown), or a date was dropped
 *   Gone       a pinned line's source no longer answers (the reason is shown)
 *   Cannot     the chart was pinned without what was asked for, so it cannot be drawn again
 *
 * Used by the "Check it still holds" button and `npm run notebook:check`. Browser-safe: the caller
 * hands in the fetch (the browser's own, or one pointed at the running app).
 */
import { computeChart, fetchChartSeries } from './councilChart';
import type { NotebookPin } from './notebookPins';

export type PinCheckState = 'same' | 'revised' | 'gone' | 'cannot';

export interface PinChange {
  line: string;
  date: string;
  old: number;
  /** null: the date is no longer in the figures. */
  now: number | null;
}

export interface PinCheck {
  state: PinCheckState;
  checkedAt: string;
  changes: PinChange[];
  /** Number of changes found; changes lists at most MAX_CHANGES. */
  changeCount: number;
  /** Lines whose source no longer answers, with the reason. */
  gone: { line: string; reason: string }[];
  /** Dates after the As of day now in the figures (all lines together). */
  newer: number;
  reason?: string;
}

export const MAX_CHANGES = 10;

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

export async function checkPin(pin: NotebookPin, get: typeof fetch, now: Date = new Date()): Promise<PinCheck> {
  const base = { checkedAt: now.toISOString(), changes: [], changeCount: 0, gone: [], newer: 0 };
  const req = pin.chart.request;
  if (!req) return { ...base, state: 'cannot', reason: 'the chart was pinned without what was asked for, so it cannot be drawn again' };
  if (req.cross) return { ...base, state: 'cannot', reason: 'a chart across countries uses each country\'s latest figure, so it is not compared point by point' };
  const fresh = computeChart(req, await fetchChartSeries(req, get));
  const changes: PinChange[] = [];
  const gone: PinCheck['gone'] = [];
  let newer = 0;
  for (const line of pin.chart.lines) {
    const today = fresh.lines.find((l) => l.key === line.key) ?? fresh.lines.find((l) => l.label === line.label);
    if (!today || !today.points.length) {
      const why = fresh.missing.find((m) => m.toLowerCase().includes(line.label.toLowerCase())) ?? fresh.missing[0] ?? 'no figures came back';
      gone.push({ line: line.label, reason: why });
      continue;
    }
    const byDate = new Map(today.points.map((p) => [p.date, p.value]));
    for (const p of line.points) {
      if (p.date > pin.asOf) continue;
      const v = byDate.get(p.date);
      if (v === undefined) changes.push({ line: line.label, date: p.date, old: p.value, now: null });
      else if (!same(v, p.value)) changes.push({ line: line.label, date: p.date, old: p.value, now: v });
    }
    newer += today.points.filter((p) => p.date > pin.asOf).length;
  }
  const state: PinCheckState = gone.length ? 'gone' : changes.length ? 'revised' : 'same';
  return { ...base, state, changes: changes.slice(0, MAX_CHANGES), changeCount: changes.length, gone, newer };
}

const r = (v: number) => String(Math.round(v * 1e6) / 1e6);

/** One line of plain English, for the panel and the command line. */
export function pinCheckText(c: PinCheck): string {
  const later = c.newer ? ` ${c.newer} newer figure${c.newer === 1 ? '' : 's'} since the As of day.` : '';
  if (c.state === 'cannot') return `Cannot check: ${c.reason}.`;
  if (c.state === 'gone') return `Source no longer answers: ${c.gone.map((g) => `${g.line} (${g.reason})`).join('; ')}.`;
  if (c.state === 'same') return `Same: every pinned figure has the same value today.${later}`;
  const list = c.changes.map((x) => (x.now === null ? `${x.line} ${x.date}: ${r(x.old)} no longer in the figures` : `${x.line} ${x.date}: ${r(x.old)} now ${r(x.now)}`)).join('; ');
  return `Revised: ${c.changeCount} figure${c.changeCount === 1 ? '' : 's'} changed (${list}${c.changeCount > c.changes.length ? '; …' : ''}).${later}`;
}
