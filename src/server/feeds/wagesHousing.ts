/**
 * Wages (ILOSTAT, with World Bank inflation for the real figure) and house prices (BIS), G22.
 * Each is one all-country download kept in data/live/: wages are yearly, so they are downloaded
 * again after a week; house prices are quarterly, downloaded again after 20 hours. A failed
 * download keeps the saved copy and is not tried again for an hour. See src/utils/wagesHousing.ts.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import {
  bisPropertyAllUrl,
  buildWages,
  type HousePricesPull,
  iloEarningsUrl,
  parseBisPropertyAll,
  parseIloEarnings,
  parseWbInflation,
  type WagesPull,
  wbInflationUrl,
} from '../../utils/wagesHousing';

const HOUR = 60 * 60 * 1000;
const TIMEOUT_MS = 120_000;

interface Saved<T extends { pulledAt: string }> {
  file: string;
  maxAge: number;
  memory: { pull: T | null; triedAt: number } | null;
  inFlight: Promise<T | null> | null;
}

const wages: Saved<WagesPull> = { file: 'ilostat-wages.json', maxAge: 7 * 24 * HOUR, memory: null, inFlight: null };
const housing: Saved<HousePricesPull> = { file: 'bis-property.json', maxAge: 20 * HOUR, memory: null, inFlight: null };

function load<T extends { pulledAt: string; countries: object }>(s: Saved<T>): T | null {
  if (!s.memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'live', s.file), 'utf8')) as T;
      if (saved?.pulledAt && saved.countries) s.memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return s.memory?.pull ?? null;
}

async function refresh<T extends { pulledAt: string; countries: object }>(s: Saved<T>, force: boolean, get: () => Promise<T['countries'] | null>): Promise<T | null> {
  const saved = load(s);
  if (!force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < s.maxAge) return saved;
    if (s.memory && Date.now() - s.memory.triedAt < HOUR) return saved;
  }
  if (s.inFlight) return s.inFlight;
  s.inFlight = (async () => {
    const countries = await get();
    if (!countries || !Object.keys(countries).length) {
      s.memory = { pull: saved, triedAt: Date.now() };
      return saved;
    }
    const fresh = { pulledAt: new Date().toISOString(), countries } as unknown as T;
    s.memory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.join(DATA_DIR, 'live'), { recursive: true });
      writeFileAtomic(path.join(DATA_DIR, 'live', s.file), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    s.inFlight = null;
  });
  return s.inFlight;
}

async function getText(url: string, who: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[${who}] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[${who}] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

export const loadWages = (): WagesPull | null => load(wages);
export const loadHousePrices = (): HousePricesPull | null => load(housing);

/** Earnings from ILOSTAT and inflation from the World Bank, eight years back. */
export function fetchWagesPull(opts: { force?: boolean } = {}): Promise<WagesPull | null> {
  return refresh(wages, !!opts.force, async () => {
    const year = new Date().getUTCFullYear();
    const [csv, wb] = await Promise.all([getText(iloEarningsUrl(year - 8), 'ILOSTAT earnings'), getText(wbInflationUrl(year - 8, year), 'World Bank inflation')]);
    const earnings = csv ? parseIloEarnings(csv) : null;
    if (csv && !earnings) console.warn('[ILOSTAT earnings] the file is not in the expected layout');
    if (!earnings) return null;
    let inflation: Record<string, Record<string, number>> = {};
    try {
      inflation = wb ? parseWbInflation(JSON.parse(wb)) : {};
    } catch {
      console.warn('[World Bank inflation] not JSON');
    }
    return buildWages(earnings, inflation);
  });
}

/** Real and nominal house prices from the BIS, three years back. */
export function fetchHousePricesPull(opts: { force?: boolean } = {}): Promise<HousePricesPull | null> {
  return refresh(housing, !!opts.force, async () => {
    const csv = await getText(bisPropertyAllUrl(new Date().getUTCFullYear() - 3), 'BIS property prices');
    return csv ? parseBisPropertyAll(csv) : null;
  });
}

/** Tests only. */
export function resetWagesHousingForTests(): void {
  for (const s of [wages, housing] as Array<Saved<{ pulledAt: string; countries: object }>>) {
    s.memory = null;
    s.inFlight = null;
  }
}
