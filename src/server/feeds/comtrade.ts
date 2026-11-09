/**
 * UN Comtrade trade partners and export mix per country, kept in data/live/comtrade.json.
 */

import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines.ts';
import { buildProfile, COMTRADE_REPORTERS, type ComtradeProfile, type ComtradeRow, comtradeUrl, comtradeYears, parseComtrade } from '../../utils/comtradeTrade';
import { describeNetworkError } from '../../utils/connectionCheck';
import { writeFileAtomic } from '../../utils/atomicWrite';

/**
 * UN Comtrade partners and export mix (src/utils/comtradeTrade.ts). Annual, so each country is
 * pulled once every 30 days (6 hours after a miss) and saved to data/live/comtrade.json with its
 * pull date. Two requests per country, sent one at a time with a gap, because the free preview
 * allows few requests; COMTRADE_API_KEY (free) switches to the keyed route.
 * The preview's HTTP 429 is a short throttle ("Rate limit is exceeded. Try again in 1 seconds."; on
 * Sam's Mac the next request a moment later went through). So a 429 is waited out for the seconds
 * Comtrade asks (plus one) and the same request is sent once more. When three countries in a row are
 * refused even so, the pass stops and nothing is sent to Comtrade for 6 hours.
 */
type ComtradeEntry = { pulledAt: string; profile: ComtradeProfile };
export type ComtradeFile = { countries: Record<string, ComtradeEntry> };
export let comtradeMemory: { file: ComtradeFile; triedAt: Record<string, number> } | null = null;
let comtradeInFlight: Promise<ComtradeFile> | null = null;
function comtradeFile(): string {
  return path.join(DATA_DIR, 'live', 'comtrade.json');
}
const COMTRADE_GAP_MS = 1500;
const COMTRADE_MAX_WAIT_S = 30;
const COMTRADE_STOP_AFTER = 3; // countries refused in a row
const COMTRADE_PAUSE_MS = 6 * 60 * 60 * 1000;
export let comtradePausedUntil = 0;
/** Tests only: clear the pause and the memory copy. */
export function resetComtradeForTests(): void {
  comtradePausedUntil = 0;
  comtradeMemory = null;
}
/** Seconds Comtrade asks the app to wait after a 429: Retry-After, else "Try again in N seconds". */
export function comtradeRetrySeconds(retryAfter: string | null, body: string): number {
  const header = Number(retryAfter);
  const m = body.match(/try again in (\d+) second/i);
  const s = Number.isFinite(header) && header > 0 ? header : m ? Number(m[1]) : 1;
  return Math.min(COMTRADE_MAX_WAIT_S, s) + 1;
}
async function comtradeGet(url: string, key: string): Promise<ComtradeRow[] | null> {
  try {
    const send = () => fetch(url, { headers: key ? { 'Ocp-Apim-Subscription-Key': key } : {}, signal: AbortSignal.timeout(20000) });
    let res = await send();
    if (res.status === 429) {
      const wait = comtradeRetrySeconds(res.headers.get('retry-after'), await res.text().catch(() => ''));
      await new Promise((r) => setTimeout(r, wait * 1000));
      res = await send();
    }
    if (!res.ok) {
      console.warn(`[Comtrade] refused (HTTP ${res.status}${res.status === 429 ? ', also after waiting' : ''})`);
      return null;
    }
    return parseComtrade(await res.json());
  } catch (e) {
    console.warn(`[Comtrade] ${describeNetworkError(e, 20000)}`);
    return null;
  }
}
async function pullComtradeCountry(iso3: string, key: string): Promise<ComtradeProfile | 'refused' | null> {
  const reporter = COMTRADE_REPORTERS[iso3];
  if (!reporter) return null;
  const pause = () => new Promise((r) => setTimeout(r, COMTRADE_GAP_MS));
  for (const year of comtradeYears()) {
    const partners = await comtradeGet(comtradeUrl(reporter, year, 'partners', !!key), key);
    await pause();
    if (partners === null) return 'refused'; // refused or no answer: stop, try again later
    if (!partners.length) continue; // not reported that year yet
    const products = (await comtradeGet(comtradeUrl(reporter, year, 'products', !!key), key)) || [];
    await pause();
    return buildProfile(iso3, partners, products);
  }
  return null;
}
export async function fetchComtrade(): Promise<ComtradeFile> {
  if (!comtradeMemory) {
    let file: ComtradeFile = { countries: {} };
    try {
      const f = JSON.parse(fs.readFileSync(comtradeFile(), 'utf8')) as ComtradeFile;
      if (f?.countries && typeof f.countries === 'object') file = f;
    } catch {
      // never pulled
    }
    comtradeMemory = { file, triedAt: {} };
  }
  const mem = comtradeMemory;
  const day = 24 * 60 * 60 * 1000;
  const due = SOVEREIGN_CATALOG.map((c) => c.iso3).filter((iso) => {
    if (!COMTRADE_REPORTERS[iso]) return false;
    const e = mem.file.countries[iso];
    const fresh = e && Date.now() - Date.parse(e.pulledAt) < 30 * day;
    const triedRecently = Date.now() - (mem.triedAt[iso] || 0) < day / 4;
    return !fresh && !triedRecently;
  });
  if (!due.length) return mem.file;
  if (Date.now() < comtradePausedUntil) return mem.file;
  if (comtradeInFlight) return comtradeInFlight;
  const key = (process.env.COMTRADE_API_KEY || '').trim();
  comtradeInFlight = (async () => {
    // Saved after each country: the paced pass takes minutes, and a restart or a stopped download
    // part-way must not lose the countries already pulled.
    let refusedInARow = 0;
    for (const iso of due) {
      mem.triedAt[iso] = Date.now();
      const profile = await pullComtradeCountry(iso, key);
      if (profile === 'refused') {
        if (++refusedInARow >= COMTRADE_STOP_AFTER) {
          comtradePausedUntil = Date.now() + COMTRADE_PAUSE_MS;
          console.warn(`[Comtrade] ${COMTRADE_STOP_AFTER} countries in a row got no answer: pausing Comtrade for 6 hours`);
          break;
        }
        continue;
      }
      refusedInARow = 0;
      if (!profile) continue; // not reported in the years asked
      mem.file.countries[iso] = { pulledAt: new Date().toISOString(), profile };
      try {
        fs.mkdirSync(path.dirname(comtradeFile()), { recursive: true });
        writeFileAtomic(comtradeFile(), JSON.stringify(mem.file));
      } catch {
        // keep the memory copy
      }
    }
    return mem.file;
  })().finally(() => {
    comtradeInFlight = null;
  });
  return comtradeInFlight;
}
