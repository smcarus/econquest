/**
 * Monthly activity (G41, src/utils/monthlyIndicators.ts): industrial production, retail sales and
 * the monthly unemployment rate for the catalogue countries the app has a source for. One saved
 * copy in data/live/monthly-indicators.json, downloaded again after 20 hours by the daily run. Each
 * request stands alone: a source that fails keeps its last good series, and a run where nothing
 * answered keeps the whole copy and is not tried again for an hour.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines';
import { EUROSTAT_IP_GEO } from '../../utils/monthlyActivity';
import { fetchFredHistory } from './rates';
import {
  activitySourceOf,
  bcbActivityUrl,
  eurostatActivityUrl,
  fredToSeries,
  INDICATOR_IDS,
  type IndicatorId,
  type IndicatorSeries,
  type MonthlyIndicatorsPull,
  onsActivityUrl,
  parseBcbActivity,
  parseEurostatActivity,
  parseOnsSeries,
  US_ACTIVITY,
} from '../../utils/monthlyIndicators';

const HOUR = 60 * 60 * 1000;
const MAX_AGE = 20 * HOUR;
const TIMEOUT_MS = 30_000;
const FILE = 'monthly-indicators.json';

let memory: { pull: MonthlyIndicatorsPull | null; triedAt: number } | null = null;
let inFlight: Promise<MonthlyIndicatorsPull | null> | null = null;

/** The saved copy only (pages read this; the daily run refreshes it). */
export function loadMonthlyIndicators(): MonthlyIndicatorsPull | null {
  if (!memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'live', FILE), 'utf8')) as MonthlyIndicatorsPull;
      if (saved?.pulledAt && saved.countries) memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return memory?.pull ?? null;
}

async function getJson(url: string, who: string): Promise<unknown | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[${who}] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[${who}] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

type Got = Array<[iso3: string, id: IndicatorId, s: IndicatorSeries]>;

async function eurostat(iso3s: string[]): Promise<Got> {
  if (!iso3s.length) return [];
  const got: Got = [];
  await Promise.all(
    INDICATOR_IDS.map(async (id) => {
      const json = await getJson(eurostatActivityUrl(id, iso3s.map((i) => EUROSTAT_IP_GEO[i])), `Eurostat ${id}`);
      for (const [iso3, s] of Object.entries(json ? parseEurostatActivity(id, json, iso3s) : {})) got.push([iso3, id, s]);
    })
  );
  return got;
}

async function us(): Promise<Got> {
  const got: Got = [];
  await Promise.all(
    INDICATOR_IDS.map(async (id) => {
      const s = fredToSeries(id, await fetchFredHistory(US_ACTIVITY[id].id, '2015-01-01'));
      if (s) got.push(['USA', id, s]);
    })
  );
  return got;
}

async function ons(): Promise<Got> {
  const got: Got = [];
  await Promise.all(
    INDICATOR_IDS.map(async (id) => {
      const json = await getJson(onsActivityUrl(id), `ONS ${id}`);
      const s = json ? parseOnsSeries(id, json) : null;
      if (s) got.push(['GBR', id, s]);
    })
  );
  return got;
}

async function bcb(): Promise<Got> {
  const got: Got = [];
  await Promise.all(
    INDICATOR_IDS.map(async (id) => {
      const json = await getJson(bcbActivityUrl(id), `BCB SGS ${id}`);
      const s = json ? parseBcbActivity(id, json) : null;
      if (s) got.push(['BRA', id, s]);
    })
  );
  return got;
}

/** Downloads every source for the catalogue countries and saves the copy. */
export function fetchMonthlyIndicators(opts: { force?: boolean } = {}): Promise<MonthlyIndicatorsPull | null> {
  const saved = loadMonthlyIndicators();
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MAX_AGE) return Promise.resolve(saved);
    if (memory && Date.now() - memory.triedAt < HOUR) return Promise.resolve(saved);
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const isos = SOVEREIGN_CATALOG.map((c) => c.iso3);
    const has = (s: string) => isos.some((i) => activitySourceOf(i) === s);
    const parts = await Promise.all([
      eurostat(isos.filter((i) => activitySourceOf(i) === 'eurostat')),
      has('us') ? us() : Promise.resolve([] as Got),
      has('ons') ? ons() : Promise.resolve([] as Got),
      has('bcb') ? bcb() : Promise.resolve([] as Got),
    ]);
    const got = parts.flat();
    if (!got.length) {
      memory = { pull: saved, triedAt: Date.now() };
      return saved;
    }
    const countries: MonthlyIndicatorsPull['countries'] = JSON.parse(JSON.stringify(saved?.countries || {}));
    for (const [iso3, id, s] of got) (countries[iso3] ||= {})[id] = s;
    const fresh: MonthlyIndicatorsPull = { pulledAt: new Date().toISOString(), countries };
    memory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.join(DATA_DIR, 'live'), { recursive: true });
      writeFileAtomic(path.join(DATA_DIR, 'live', FILE), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Tests only. */
export function resetMonthlyIndicatorsForTests(): void {
  memory = null;
  inFlight = null;
}
