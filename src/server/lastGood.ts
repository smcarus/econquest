/**
 * The last good answer of a feed, kept on disk, standing in while the source does not answer.
 *
 * A good answer is kept in memory for `freshMs` and saved to data/live/last-good/<name>/<key>.json.
 * When a later download fails (no answer, an error, nothing readable), the saved answer is served
 * as it was, with its own dates (fetchedAt, periods), and the source is asked again after 15
 * minutes, then 1 hour, then every 4 hours while it keeps failing. A saved answer older than
 * `maxAgeMs` is not served: the figure reads Missing, as before. Nothing is made up or moved
 * forward in time. Which feeds are standing in right now is listed in Menu > Data health
 * (GET /api/data/health/summary, savedStandIns).
 */
import fs from 'fs';
import path from 'path';
import { writeFileAtomic } from '../utils/atomicWrite';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Wait before asking a failing source again: 15 min after the first miss, 1 h after the second, then 4 h. */
export function missWaitMs(misses: number): number {
  return misses <= 1 ? 15 * MIN : misses === 2 ? HOUR : 4 * HOUR;
}

export interface StandIn {
  feed: string;
  key: string;
  /** When the saved answer was downloaded. */
  savedAt: string;
  /** When the source first failed in this run of the app. */
  failingSince: string;
  /** When it will be asked again. */
  nextTryAt: string;
}

const standIns = new Map<string, StandIn>();

/** Feeds serving their saved answer right now, oldest saved first. */
export function currentStandIns(): StandIn[] {
  return [...standIns.values()].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

export interface LastGoodOptions {
  /** Folder name under data/live/last-good/. */
  name: string;
  /** How long a good answer is used before asking again. */
  freshMs: number;
  /** The oldest saved answer that may stand in; older reads Missing. */
  maxAgeMs: number;
  /** The data folder (default: the app's DATA_DIR). */
  dataDir: () => string;
  now?: () => number;
}

interface Entry<T> {
  at: number;
  value: T | null;
  standIn: boolean;
  misses: number;
  failingSince?: number;
}

export interface LastGoodCache<T> {
  get(key: string, pull: () => Promise<T | null>): Promise<T | null>;
  /** Forgets the memory copies (tests); saved files stay. */
  clear(): void;
}

const safeKey = (k: string) => k.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120) || '_';

export function lastGoodCache<T>(opts: LastGoodOptions): LastGoodCache<T> {
  const mem = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T | null>>();
  const now = () => (opts.now ? opts.now() : Date.now());
  const file = (key: string) => path.join(opts.dataDir(), 'live', 'last-good', opts.name, `${safeKey(key)}.json`);
  const load = (key: string): { savedAt: string; value: T } | null => {
    try {
      const p = JSON.parse(fs.readFileSync(file(key), 'utf8'));
      return p && typeof p.savedAt === 'string' && p.value != null ? p : null;
    } catch {
      return null;
    }
  };
  const save = (key: string, value: T, at: number) => {
    try {
      fs.mkdirSync(path.dirname(file(key)), { recursive: true });
      writeFileAtomic(file(key), JSON.stringify({ savedAt: new Date(at).toISOString(), value }));
    } catch (err: any) {
      console.warn(`[last-good] ${opts.name}/${key}: could not save (${err?.message || err})`);
    }
  };
  const id = (key: string) => `${opts.name}:${key}`;

  async function refresh(key: string, hit: Entry<T> | undefined): Promise<T | null> {
    let got: T | null = null;
    try {
      got = await pull_(key);
    } catch {
      got = null;
    }
    const t = now();
    if (got !== null && got !== undefined) {
      save(key, got, t);
      mem.set(key, { at: t, value: got, standIn: false, misses: 0 });
      standIns.delete(id(key));
      return got;
    }
    const misses = (hit && (hit.standIn || hit.value === null) ? hit.misses : 0) + 1;
    const failingSince = hit?.failingSince ?? t;
    const saved = load(key);
    const usable = saved && t - Date.parse(saved.savedAt) <= opts.maxAgeMs ? saved.value : null;
    mem.set(key, { at: t, value: usable, standIn: usable !== null, misses, failingSince });
    if (usable !== null && saved) {
      standIns.set(id(key), {
        feed: opts.name,
        key,
        savedAt: saved.savedAt,
        failingSince: new Date(failingSince).toISOString(),
        nextTryAt: new Date(t + missWaitMs(misses)).toISOString(),
      });
    } else standIns.delete(id(key));
    return usable;
  }
  // The pull for the key being refreshed (set per call so in-flight calls share one download).
  const pulls = new Map<string, () => Promise<T | null>>();
  const pull_ = (key: string) => pulls.get(key)!();

  return {
    async get(key, pull) {
      const hit = mem.get(key);
      if (hit) {
        const wait = hit.value !== null && !hit.standIn ? opts.freshMs : missWaitMs(hit.misses);
        if (now() - hit.at < wait) return hit.value;
      }
      const running = inFlight.get(key);
      if (running) return running;
      pulls.set(key, pull);
      const job = refresh(key, hit).finally(() => {
        inFlight.delete(key);
        pulls.delete(key);
      });
      inFlight.set(key, job);
      return job;
    },
    clear() {
      mem.clear();
      for (const k of [...standIns.keys()]) if (k.startsWith(`${opts.name}:`)) standIns.delete(k);
    },
  };
}
