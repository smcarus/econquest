/**
 * Is the official calendar (src/data/officialCalendar.ts) still fit to use? Gap analysis D13: the
 * calendar is typed by hand from central bank and government pages, so its dates go stale without warning
 * and the "Next two weeks" panel thins out without saying why. This reads the calendar against
 * today and says, per country and kind of event, what to check. Stated rules, no model:
 *
 * - Old check: the rows were read from their source more than STALE_DAYS ago.
 * - Running out: the last listed date is within RUNNING_OUT_DAYS, so next year's schedule (or the
 *   next release dates) should be read and added.
 * - Ended: every listed date has passed.
 * - No decision dates: a country in the app with no central bank decision dates at all.
 *
 * Browser-safe, pure. Nothing here adds or changes a date.
 */
import type { OfficialCalendarEvent, OfficialEventCategory } from '../data/officialCalendar';

export const STALE_DAYS = 30;
export const RUNNING_OUT_DAYS = 60;

export type CalendarFlag = 'old_check' | 'running_out' | 'ended';

export const CALENDAR_FLAG_TEXT: Record<CalendarFlag, string> = {
  old_check: `Source last read more than ${STALE_DAYS} days ago`,
  running_out: `Last listed date is within ${RUNNING_OUT_DAYS} days: read and add the next dates`,
  ended: 'Every listed date has passed',
};

export const CATEGORY_TEXT: Record<OfficialEventCategory, string> = {
  MPC_DECISION: 'Central bank decisions',
  CPI_RELEASE: 'CPI releases',
  GDP_RELEASE: 'GDP releases',
  INFLATION_REPORT: 'Inflation reports',
  ELECTION: 'Elections',
  BUDGET: 'Budget deadlines',
  IMF_PROGRAMME: 'IMF programme',
};

export interface CalendarHealthRow {
  iso3: string;
  category: OfficialEventCategory;
  label: string;
  /** Dates on file from today on. */
  upcoming: number;
  nextDate: string | null;
  lastDate: string;
  /** Oldest `retrieved` among the rows (the date the source was last read). */
  checked: string;
  ageDays: number;
  sourceName: string;
  sourceUrl: string;
  flags: CalendarFlag[];
}

export interface CalendarHealth {
  today: string;
  rows: CalendarHealthRow[];
  /** Countries in the app with no central bank decision dates on file. */
  noDecisionDates: string[];
  /** Rows that need a look (any flag), plus countries without decision dates. */
  needsLook: number;
}

const dayNum = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86400000);

/** Today as YYYY-MM-DD in local time (the calendar dates are local calendar dates). */
export function localDay(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function calendarHealth(events: OfficialCalendarEvent[], countries: string[], today: string): CalendarHealth {
  const groups = new Map<string, OfficialCalendarEvent[]>();
  for (const e of events) {
    const k = `${e.iso3}|${e.category}`;
    const g = groups.get(k) || [];
    g.push(e);
    groups.set(k, g);
  }
  const t = dayNum(today);
  const rows: CalendarHealthRow[] = [];
  for (const g of groups.values()) {
    const dates = g.map((e) => e.date).sort();
    const future = dates.filter((d) => d >= today);
    const lastDate = dates[dates.length - 1];
    const oldest = [...g].sort((a, b) => (a.retrieved < b.retrieved ? -1 : 1))[0];
    const ageDays = t - dayNum(oldest.retrieved);
    const flags: CalendarFlag[] = [];
    if (ageDays > STALE_DAYS) flags.push('old_check');
    if (!future.length) flags.push('ended');
    // Elections and IMF programme ends are one-off dates: only the scheduled series run out.
    else if (['MPC_DECISION', 'CPI_RELEASE', 'GDP_RELEASE', 'INFLATION_REPORT'].includes(g[0].category) && dayNum(lastDate) - t <= RUNNING_OUT_DAYS) flags.push('running_out');
    rows.push({
      iso3: g[0].iso3,
      category: g[0].category,
      label: CATEGORY_TEXT[g[0].category],
      upcoming: future.length,
      nextDate: future[0] ?? null,
      lastDate,
      checked: oldest.retrieved,
      ageDays,
      sourceName: oldest.sourceName,
      sourceUrl: oldest.sourceUrl,
      flags,
    });
  }
  // Flagged first, then by country and kind.
  rows.sort((a, b) => Number(!a.flags.length) - Number(!b.flags.length) || a.iso3.localeCompare(b.iso3) || a.category.localeCompare(b.category));
  const withDecisions = new Set(events.filter((e) => e.category === 'MPC_DECISION').map((e) => e.iso3));
  const noDecisionDates = [...new Set(countries.map((c) => c.toUpperCase()))].filter((c) => !withDecisions.has(c)).sort();
  return { today, rows, noDecisionDates, needsLook: rows.filter((r) => r.flags.length).length + noDecisionDates.length };
}
