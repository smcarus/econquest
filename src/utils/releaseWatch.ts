/**
 * Release-day fetch (CG3, quick wins QW5 and QW6). On a day the official calendar
 * (src/data/officialCalendar.ts) lists a CPI or monthly activity release for a country, the running
 * app re-reads that country's source about once an hour, up to 12 times, until a newer month
 * arrives, and then marks it "new today". The calendar gives dates, not times, so the watch covers
 * the release day and the day after (UTC), which also catches releases made in the evening by UTC.
 *
 * Sources re-read (each asked to skip its daily cache):
 *   CPI, United States: BLS CPI (the data surprises download), then IMF monthly consumer prices.
 *   CPI, other countries: IMF monthly consumer prices. The IMF often posts a month weeks after the
 *     national release, so a CPI release day may end with "no newer month yet"; that is said.
 *   Monthly activity: industrial production, retail sales and unemployment (FRED, Eurostat, ONS, BCB).
 *   GDP: not re-read. The app's quarterly GDP comes from OECD figures through DBnomics, which lag the
 *     national release by months, so a same-day check would find nothing; the panel says so.
 *
 * Pure and browser-safe: the server module (src/server/releaseWatch.ts) does the reading and saving.
 */
import type { OfficialCalendarEvent } from '../data/officialCalendar';

export type WatchSource = 'us_cpi' | 'imf_cpi' | 'activity';
export type WatchCategory = 'CPI_RELEASE' | 'GDP_RELEASE' | 'ACTIVITY_RELEASE';

export const WATCH_CATEGORIES: WatchCategory[] = ['CPI_RELEASE', 'GDP_RELEASE', 'ACTIVITY_RELEASE'];
export const MAX_CHECKS = 12;
export const CHECK_GAP_MS = 55 * 60 * 1000;

export const WATCH_SOURCE_LABEL: Record<WatchSource, string> = {
  us_cpi: 'BLS consumer prices',
  imf_cpi: 'IMF monthly consumer prices',
  activity: 'Monthly activity (FRED, Eurostat, ONS, BCB)',
};

/** Which sources a release is re-read from; empty for GDP (see the note above). */
export function watchSources(iso3: string, category: WatchCategory): WatchSource[] {
  if (category === 'CPI_RELEASE') return iso3 === 'USA' ? ['us_cpi', 'imf_cpi'] : ['imf_cpi'];
  if (category === 'ACTIVITY_RELEASE') return ['activity'];
  return [];
}

export const eventKey = (e: Pick<OfficialCalendarEvent, 'iso3' | 'category' | 'date'>) => `${e.iso3}:${e.category}:${e.date}`;

export interface WatchEntry {
  /** Newest month in the sources before the first check, by source. */
  before: Partial<Record<WatchSource, string | null>>;
  checks: number;
  lastCheck: string;
  /** Set when a newer month arrived. */
  arrived?: { at: string; source: WatchSource; period: string };
  /** Why the last check did not finish (a source that did not answer), as the source said it. */
  problem?: string;
}

export type WatchState = Record<string, WatchEntry>;

const day = (d: Date, offset = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset)).toISOString().slice(0, 10);

/** Calendar releases on the release day or the day before (UTC), for categories the watch covers. */
export function releasesInWindow(events: OfficialCalendarEvent[], now: Date): OfficialCalendarEvent[] {
  const days = new Set([day(now), day(now, -1)]);
  return events.filter((e) => (WATCH_CATEGORIES as string[]).includes(e.category) && days.has(e.date));
}

/** The releases to check now: in the window, with sources, not arrived, under the limit, an hour since the last check. */
export function dueChecks(events: OfficialCalendarEvent[], state: WatchState, now: Date): OfficialCalendarEvent[] {
  return releasesInWindow(events, now).filter((e) => {
    if (!watchSources(e.iso3, e.category as WatchCategory).length) return false;
    const s = state[eventKey(e)];
    if (!s) return true;
    if (s.arrived || s.checks >= MAX_CHECKS) return false;
    return now.getTime() - Date.parse(s.lastCheck) >= CHECK_GAP_MS;
  });
}

/** Months compare as text (YYYY-MM); a period counts as newer only when both are known. */
export function isNewer(after: string | null | undefined, before: string | null | undefined): boolean {
  if (!after) return false;
  if (!before) return false;
  return after > before;
}

/**
 * Records one check. `saved` is the newest month in each source's saved copy before this check
 * re-read it (used as the starting point on the first check); `latest` is the newest month after.
 */
export function recordCheck(
  prev: WatchEntry | undefined,
  saved: Partial<Record<WatchSource, string | null>>,
  latest: Partial<Record<WatchSource, string | null>>,
  now: Date,
  problem?: string
): WatchEntry {
  const before = prev?.before ?? saved;
  const entry: WatchEntry = { before, checks: (prev?.checks ?? 0) + 1, lastCheck: now.toISOString(), ...(problem ? { problem } : {}) };
  if (prev?.arrived) return { ...entry, arrived: prev.arrived };
  for (const [src, period] of Object.entries(latest) as Array<[WatchSource, string | null]>) {
    if (isNewer(period, before[src])) return { ...entry, arrived: { at: now.toISOString(), source: src, period: period! } };
  }
  return entry;
}

export type WatchStatus = 'arrived' | 'waiting' | 'no_new_month' | 'coming' | 'not_rechecked';

export interface WatchRow {
  iso3: string;
  category: WatchCategory;
  date: string;
  title: string;
  status: WatchStatus;
  sources: WatchSource[];
  checks: number;
  lastCheck?: string;
  arrived?: WatchEntry['arrived'];
  problem?: string;
}

/** Releases from yesterday to a week on, with where each stands; newest-due first. */
export function releaseWatchView(events: OfficialCalendarEvent[], state: WatchState, now: Date): WatchRow[] {
  const from = day(now, -1);
  const to = day(now, 7);
  const inWindow = new Set(releasesInWindow(events, now).map(eventKey));
  return events
    .filter((e) => (WATCH_CATEGORIES as string[]).includes(e.category) && e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.iso3.localeCompare(b.iso3))
    .map((e) => {
      const category = e.category as WatchCategory;
      const sources = watchSources(e.iso3, category);
      const s = state[eventKey(e)];
      let status: WatchStatus;
      if (!sources.length) status = 'not_rechecked';
      else if (s?.arrived) status = 'arrived';
      else if (!inWindow.has(eventKey(e))) status = e.date > day(now) ? 'coming' : 'no_new_month';
      else if (s && s.checks >= MAX_CHECKS) status = 'no_new_month';
      else status = 'waiting';
      return {
        iso3: e.iso3,
        category,
        date: e.date,
        title: e.title,
        status,
        sources,
        checks: s?.checks ?? 0,
        ...(s?.lastCheck ? { lastCheck: s.lastCheck } : {}),
        ...(s?.arrived ? { arrived: s.arrived } : {}),
        ...(s?.problem ? { problem: s.problem } : {}),
      };
    });
}

/** Keeps the state small: entries for releases more than ten days old are dropped. */
export function pruneState(state: WatchState, now: Date): WatchState {
  const cutoff = day(now, -10);
  return Object.fromEntries(Object.entries(state).filter(([k]) => (k.split(':')[2] || '') >= cutoff));
}
