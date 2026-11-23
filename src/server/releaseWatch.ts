/**
 * Release-day fetch (CG3, src/utils/releaseWatch.ts): while the app runs, once an hour, each CPI or
 * monthly activity release on the official calendar for today or yesterday (UTC) re-reads its
 * source, up to 12 times, until a newer month arrives. State in data/local/release-watch.json.
 * Off with RELEASE_WATCH=off. Never runs in the one-off preload or daily modes.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './config';
import { writeFileAtomic } from '../utils/atomicWrite';
import { OFFICIAL_CALENDAR, type OfficialCalendarEvent } from '../data/officialCalendar';
import { dueChecks, eventKey, pruneState, recordCheck, watchSources, type WatchCategory, type WatchSource, type WatchState } from '../utils/releaseWatch';
import { fetchImfCpiPull, loadImfCpi } from './feeds/imf';
import { fetchMonthlyIndicators, loadMonthlyIndicators } from './feeds/monthlyIndicators';
import { fetchSurpriseInputs, loadSurpriseInputs } from './feeds/dataSurprises';
import type { ImfCpiPull } from '../utils/imfCpi';
import type { MonthlyIndicatorsPull } from '../utils/monthlyIndicators';
import type { SurpriseInputs } from '../utils/dataSurprises';

const HOUR = 60 * 60 * 1000;
const statePath = (dataDir = DATA_DIR) => path.join(dataDir, 'local', 'release-watch.json');

export function loadWatchState(dataDir = DATA_DIR): WatchState {
  try {
    const x = JSON.parse(fs.readFileSync(statePath(dataDir), 'utf8'));
    return x && typeof x === 'object' ? (x as WatchState) : {};
  } catch {
    return {};
  }
}

function saveWatchState(state: WatchState, dataDir = DATA_DIR): void {
  try {
    fs.mkdirSync(path.dirname(statePath(dataDir)), { recursive: true });
    writeFileAtomic(statePath(dataDir), JSON.stringify(state, null, 1));
  } catch {
    // the next tick tries again
  }
}

const lastOf = (pts?: Array<{ period: string }>) => (pts && pts.length ? pts[pts.length - 1].period : null);

/** Newest month for one country in one source's pull. */
export function latestMonth(src: WatchSource, iso3: string, pulls: { imf?: ImfCpiPull | null; activity?: MonthlyIndicatorsPull | null; surprises?: SurpriseInputs | null }): string | null {
  if (src === 'us_cpi') return lastOf(pulls.surprises?.usCpi) ?? null;
  if (src === 'imf_cpi') return lastOf(pulls.imf?.series?.[iso3]?.points) ?? null;
  const c = pulls.activity?.countries?.[iso3];
  if (!c) return null;
  const ends = Object.values(c).map((s) => lastOf(s?.points)).filter((p): p is string => !!p).sort();
  return ends.length ? ends[ends.length - 1] : null;
}

export interface WatchDeps {
  events?: OfficialCalendarEvent[];
  now?: () => Date;
  dataDir?: string;
  saved?: () => { imf?: ImfCpiPull | null; activity?: MonthlyIndicatorsPull | null; surprises?: SurpriseInputs | null };
  fetch?: (src: WatchSource) => Promise<{ imf?: ImfCpiPull | null; activity?: MonthlyIndicatorsPull | null; surprises?: SurpriseInputs | null } | null>;
}

const defaultSaved = () => ({ imf: loadImfCpi(), activity: loadMonthlyIndicators(), surprises: loadSurpriseInputs() });
const defaultFetch = async (src: WatchSource) => {
  if (src === 'us_cpi') return { surprises: await fetchSurpriseInputs({ force: true }) };
  if (src === 'imf_cpi') return { imf: await fetchImfCpiPull({ force: true }) };
  return { activity: await fetchMonthlyIndicators({ force: true }) };
};

/** One pass: checks every release that is due, saves the state, and says what it did. */
export async function releaseWatchTick(deps: WatchDeps = {}): Promise<string[]> {
  const now = (deps.now ?? (() => new Date()))();
  const events = deps.events ?? OFFICIAL_CALENDAR;
  const dataDir = deps.dataDir ?? DATA_DIR;
  let state = pruneState(loadWatchState(dataDir), now);
  const due = dueChecks(events, state, now);
  const log: string[] = [];
  if (!due.length) return log;
  const saved = (deps.saved ?? defaultSaved)();
  // Each source is re-read once per pass, however many releases need it.
  const needed = [...new Set(due.flatMap((e) => watchSources(e.iso3, e.category as WatchCategory)))];
  const fresh: Record<string, unknown> = {};
  const problems: Partial<Record<WatchSource, string>> = {};
  for (const src of needed) {
    try {
      const got = await (deps.fetch ?? defaultFetch)(src);
      if (!got || Object.values(got).every((v) => !v)) problems[src] = `${src} did not answer`;
      Object.assign(fresh, got || {});
    } catch (e: any) {
      problems[src] = `${src}: ${e?.message || e}`;
    }
  }
  const after = { ...saved, ...Object.fromEntries(Object.entries(fresh).filter(([, v]) => v)) } as ReturnType<typeof defaultSaved>;
  for (const e of due) {
    const srcs = watchSources(e.iso3, e.category as WatchCategory);
    const before = Object.fromEntries(srcs.map((s) => [s, latestMonth(s, e.iso3, saved)]));
    const latest = Object.fromEntries(srcs.map((s) => [s, latestMonth(s, e.iso3, after)]));
    const problem = srcs.map((s) => problems[s]).filter(Boolean).join('; ') || undefined;
    const entry = recordCheck(state[eventKey(e)], before, latest, now, problem);
    state = { ...state, [eventKey(e)]: entry };
    log.push(entry.arrived ? `${e.iso3} ${e.title}: new month ${entry.arrived.period} (${entry.arrived.source})` : `${e.iso3} ${e.title}: check ${entry.checks}, no newer month yet${problem ? ` (${problem})` : ''}`);
  }
  saveWatchState(state, dataDir);
  return log;
}

let timer: NodeJS.Timeout | null = null;

/** Starts the hourly watch in the running app (first pass after two minutes). */
export function startReleaseWatch(): void {
  if (timer || String(process.env.RELEASE_WATCH || '').toLowerCase() === 'off') return;
  const run = () =>
    void releaseWatchTick()
      .then((lines) => lines.forEach((l) => console.log(`[release day] ${l}`)))
      .catch((e) => console.warn(`[release day] ${e?.message || e}`));
  setTimeout(run, 2 * 60 * 1000).unref();
  timer = setInterval(run, HOUR);
  timer.unref();
}
