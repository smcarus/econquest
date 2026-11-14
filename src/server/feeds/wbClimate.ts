/**
 * World Bank climate portal country-average weather (W2, src/utils/weatherCountry.ts), no key. One
 * request per country, newest CRU TS version first, saved in data/live/wb-cckp/<ISO3>.json and
 * downloaded again after 30 days (CRU TS is published once a year). When the portal does not answer
 * the saved copy is kept and the download is not tried again for an hour.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { cckpUrl, CRU_VERSIONS, parseCckp, type CountryWeatherPull } from '../../utils/weatherCountry';

const HOUR = 60 * 60 * 1000;
const MAX_AGE = 30 * 24 * HOUR;
const TIMEOUT_MS = 60_000;
const DIR = 'wb-cckp';

const memory = new Map<string, { pull: CountryWeatherPull | null; triedAt: number }>();
const inFlight = new Map<string, Promise<CountryWeatherPull | null>>();

function file(iso3: string): string {
  return path.join(DATA_DIR, 'live', DIR, `${iso3}.json`);
}

export function loadCountryWeather(iso3: string): CountryWeatherPull | null {
  const code = iso3.toUpperCase();
  if (!memory.has(code)) {
    try {
      const saved = JSON.parse(fs.readFileSync(file(code), 'utf8')) as CountryWeatherPull;
      if (saved?.pulledAt && saved.temp && saved.rain) memory.set(code, { pull: saved, triedAt: Date.parse(saved.pulledAt) });
    } catch {
      // never downloaded
    }
  }
  return memory.get(code)?.pull ?? null;
}

async function ask(url: string, iso3: string): Promise<ReturnType<typeof parseCckp> | 'refused'> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[World Bank climate portal] refused (HTTP ${res.status}): ${url}`);
      return 'refused';
    }
    const got = parseCckp(await res.json(), iso3);
    if (!got) console.warn(`[World Bank climate portal] not in the expected layout: ${url}`);
    return got;
  } catch (e) {
    console.warn(`[World Bank climate portal] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

/** Country-average monthly temperature and rainfall since 1901; the saved copy when the portal does not answer. */
export function fetchCountryWeather(iso3: string, opts: { force?: boolean } = {}): Promise<CountryWeatherPull | null> {
  const code = iso3.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return Promise.resolve(null);
  const saved = loadCountryWeather(code);
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MAX_AGE) return Promise.resolve(saved);
    const m = memory.get(code);
    if (m && Date.now() - m.triedAt < HOUR) return Promise.resolve(saved);
  }
  const running = inFlight.get(code);
  if (running) return running;
  const job = (async () => {
    let answered = false;
    for (const v of CRU_VERSIONS) {
      const got = await ask(cckpUrl(code, v), code);
      if (got === 'refused') continue;
      if (!got) break;
      answered = true;
      if (!Object.keys(got.temp).length && !Object.keys(got.rain).length) continue;
      const fresh: CountryWeatherPull = { iso3: code, pulledAt: new Date().toISOString(), version: v.version, temp: got.temp, rain: got.rain };
      memory.set(code, { pull: fresh, triedAt: Date.now() });
      try {
        fs.mkdirSync(path.join(DATA_DIR, 'live', DIR), { recursive: true });
        writeFileAtomic(file(code), JSON.stringify(fresh));
      } catch {
        // keep the memory copy
      }
      return fresh;
    }
    if (answered && !saved) console.warn(`[World Bank climate portal] no CRU TS series for ${code}`);
    memory.set(code, { pull: saved, triedAt: Date.now() });
    return saved;
  })().finally(() => {
    inFlight.delete(code);
  });
  inFlight.set(code, job);
  return job;
}

/** Tests only. */
export function resetCountryWeatherForTests(): void {
  memory.clear();
  inFlight.clear();
}
