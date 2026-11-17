/**
 * NASA POWER monthly weather at each capital (W1, src/utils/weatherPower.ts), no key. One request per
 * country from 1981, saved in data/live/nasa-power/<ISO3>.json and downloaded again after 7 days (the
 * monthly figures change once a month). When NASA does not answer the saved copy is kept and the
 * download is not tried again for an hour. The monthly API may not yet cover the current year; then
 * the request is made again to the end of last year.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { CAPITALS, nasaPowerUrl, parseNasaPower, POWER_FROM_YEAR, type WeatherPull } from '../../utils/weatherPower';

const HOUR = 60 * 60 * 1000;
const MAX_AGE = 7 * 24 * HOUR;
const TIMEOUT_MS = 60_000;
const DIR = 'nasa-power';

const memory = new Map<string, { pull: WeatherPull | null; triedAt: number }>();
const inFlight = new Map<string, Promise<WeatherPull | null>>();

function file(iso3: string): string {
  return path.join(DATA_DIR, 'live', DIR, `${iso3}.json`);
}

export function loadWeather(iso3: string): WeatherPull | null {
  const code = iso3.toUpperCase();
  if (!memory.has(code)) {
    try {
      const saved = JSON.parse(fs.readFileSync(file(code), 'utf8')) as WeatherPull;
      if (saved?.pulledAt && saved.temp && saved.rain) memory.set(code, { pull: saved, triedAt: Date.parse(saved.pulledAt) });
    } catch {
      // never downloaded
    }
  }
  return memory.get(code)?.pull ?? null;
}

async function ask(url: string): Promise<ReturnType<typeof parseNasaPower> | 'refused'> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[NASA POWER] refused (HTTP ${res.status}): ${url}`);
      return 'refused';
    }
    const got = parseNasaPower(await res.json());
    if (!got) console.warn(`[NASA POWER] not in the expected layout: ${url}`);
    return got;
  } catch (e) {
    console.warn(`[NASA POWER] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

/** Monthly temperature and rainfall at the capital since 1981; the saved copy when NASA does not answer. */
export function fetchWeather(iso3: string, opts: { force?: boolean } = {}): Promise<WeatherPull | null> {
  const code = iso3.toUpperCase();
  const capital = CAPITALS[code];
  if (!capital) return Promise.resolve(null);
  const saved = loadWeather(code);
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MAX_AGE) return Promise.resolve(saved);
    const m = memory.get(code);
    if (m && Date.now() - m.triedAt < HOUR) return Promise.resolve(saved);
  }
  const running = inFlight.get(code);
  if (running) return running;
  const job = (async () => {
    const year = new Date().getUTCFullYear();
    let got = await ask(nasaPowerUrl(capital, POWER_FROM_YEAR, year));
    if (got === 'refused') got = await ask(nasaPowerUrl(capital, POWER_FROM_YEAR, year - 1));
    if (!got || got === 'refused') {
      memory.set(code, { pull: saved, triedAt: Date.now() });
      return saved;
    }
    const fresh: WeatherPull = { iso3: code, pulledAt: new Date().toISOString(), capital, temp: got.temp, rain: got.rain, ...(got.version ? { version: got.version } : {}) };
    memory.set(code, { pull: fresh, triedAt: Date.now() });
    try {
      fs.mkdirSync(path.join(DATA_DIR, 'live', DIR), { recursive: true });
      writeFileAtomic(file(code), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    inFlight.delete(code);
  });
  inFlight.set(code, job);
  return job;
}

/** Tests only. */
export function resetWeatherForTests(): void {
  memory.clear();
  inFlight.clear();
}
