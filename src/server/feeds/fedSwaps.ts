/**
 * Federal Reserve dollar swap line operations (PB4, src/utils/fedSwapLines.ts), New York Fed, no key.
 * The whole list since December 2007 is read year by year and saved in data/live/nyfed-swaps.json;
 * downloaded again after 20 hours. When a year fails the saved copy is kept and the download is not
 * tried again for an hour.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { FED_SWAPS_FROM, type FedSwapsPull, nyfedSwapsUrl, parseNyfedSwaps, type SwapOperation } from '../../utils/fedSwapLines';

const HOUR = 60 * 60 * 1000;
const MAX_AGE = 20 * HOUR;
const TIMEOUT_MS = 60_000;
const FILE = 'nyfed-swaps.json';

let memory: { pull: FedSwapsPull | null; triedAt: number } | null = null;
let inFlight: Promise<FedSwapsPull | null> | null = null;

export function loadFedSwaps(): FedSwapsPull | null {
  if (!memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'live', FILE), 'utf8')) as FedSwapsPull;
      if (saved?.pulledAt && Array.isArray(saved.operations)) memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return memory?.pull ?? null;
}

async function year(start: string, end: string): Promise<SwapOperation[] | null> {
  const url = nyfedSwapsUrl(start, end);
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[NY Fed swap lines] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    const ops = parseNyfedSwaps(await res.json());
    if (!ops) console.warn(`[NY Fed swap lines] not in the expected layout: ${url}`);
    return ops;
  } catch (e) {
    console.warn(`[NY Fed swap lines] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

/** Every operation since December 2007; the saved copy when the New York Fed does not answer. */
export function fetchFedSwaps(opts: { force?: boolean } = {}): Promise<FedSwapsPull | null> {
  const saved = loadFedSwaps();
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MAX_AGE) return Promise.resolve(saved);
    if (memory && Date.now() - memory.triedAt < HOUR) return Promise.resolve(saved);
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const today = new Date().toISOString().slice(0, 10);
    const operations: SwapOperation[] = [];
    for (let y = Number(FED_SWAPS_FROM.slice(0, 4)); y <= Number(today.slice(0, 4)); y++) {
      const start = y === Number(FED_SWAPS_FROM.slice(0, 4)) ? FED_SWAPS_FROM : `${y}-01-01`;
      const end = `${y}-12-31` < today ? `${y}-12-31` : today;
      const ops = await year(start, end);
      if (!ops) {
        memory = { pull: saved, triedAt: Date.now() };
        return saved;
      }
      operations.push(...ops);
    }
    const fresh: FedSwapsPull = { pulledAt: new Date().toISOString(), operations };
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
export function resetFedSwapsForTests(): void {
  memory = null;
  inFlight = null;
}
