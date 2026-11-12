/**
 * Government spending by purpose (src/utils/govSpending.ts): one Eurostat request for the EU
 * countries and a few DBnomics requests for the IMF COFOG table (forty series a request). Saved to
 * data/live/gov-spending.json with its pull date and pulled again after a week, since both tables
 * are annual; a failed pull keeps the last good one and is retried after an hour.
 */

import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { BIS_ISO2 } from '../../utils/bisDebtSecurities';
import { COFOG_CODES, EUROSTAT_GEO, dbnomicsUrl, eurostatUrl, imfSeriesId, mergeSpending, parseDbnomics, parseEurostat, type GovSpendingPull, type SpendingByCountry } from '../../utils/govSpending';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH = 40;

let memory: { pull: GovSpendingPull | null; triedAt: number } | null = null;
let inFlight: Promise<GovSpendingPull | null> | null = null;
function govSpendingFile(): string {
  return path.join(DATA_DIR, 'live', 'gov-spending.json');
}

async function getJson(url: string, what: string): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(url, 20000);
    if (res.ok) return await res.json();
    console.warn(`[COFOG] ${what} refused (HTTP ${res.status})`);
  } catch (e) {
    console.warn(`[COFOG] ${what}: ${describeNetworkError(e, 20000)}`);
  }
  return null;
}

export async function fetchGovSpendingPull(): Promise<GovSpendingPull | null> {
  if (!memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(govSpendingFile(), 'utf8')) as GovSpendingPull;
      if (saved?.pulledAt && saved.byCountry) memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never pulled
    }
  }
  if (memory?.pull && Date.now() - Date.parse(memory.pull.pulledAt) < WEEK_MS) return memory.pull;
  if (memory && Date.now() - memory.triedAt < 60 * 60 * 1000) return memory.pull;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const geoToIso3 = Object.fromEntries(Object.entries(EUROSTAT_GEO).map(([iso3, geo]) => [geo, iso3]));
    const iso2ToIso3 = Object.fromEntries(Object.entries(BIS_ISO2).map(([iso3, iso2]) => [iso2, iso3]));
    const ids = Object.values(BIS_ISO2).flatMap((iso2) => COFOG_CODES.map((code) => imfSeriesId(iso2, code)));
    const batches: string[][] = [];
    for (let k = 0; k < ids.length; k += BATCH) batches.push(ids.slice(k, k + BATCH));
    const since = new Date().getUTCFullYear() - 8;
    const [euro, ...imfReplies] = await Promise.all([
      getJson(eurostatUrl(Object.values(EUROSTAT_GEO), since), 'Eurostat gov_10a_exp'),
      ...batches.map((b, k) => getJson(dbnomicsUrl(b), `IMF COFOG via DBnomics (batch ${k + 1} of ${batches.length})`)),
    ]);
    const eurostat = euro ? parseEurostat(euro, geoToIso3) : {};
    const imf: SpendingByCountry = {};
    for (const r of imfReplies) if (r) Object.assign(imf, mergeByCountry(imf, parseDbnomics(r, iso2ToIso3)));
    const byCountry = mergeSpending(eurostat, imf);
    const prev = memory?.pull ?? null;
    if (!Object.keys(byCountry).length) {
      memory = { pull: prev, triedAt: Date.now() };
      return prev;
    }
    // A table that did not answer this time keeps last time's figures for its countries.
    const fresh: GovSpendingPull = { pulledAt: new Date().toISOString(), byCountry: { ...(prev?.byCountry || {}), ...byCountry } };
    memory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(govSpendingFile()), { recursive: true });
      writeFileAtomic(govSpendingFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Batches split one country's sectors across replies; join them by country. */
function mergeByCountry(a: SpendingByCountry, b: SpendingByCountry): SpendingByCountry {
  const out: SpendingByCountry = { ...a };
  for (const [iso3, sectors] of Object.entries(b)) out[iso3] = { ...(out[iso3] || {}), ...sectors };
  return out;
}
