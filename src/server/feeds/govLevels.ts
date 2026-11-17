/**
 * Revenue and spending by level of government (G42 step 1, src/utils/govLevels.ts): one Eurostat
 * request for the EU members on the country list and DBnomics requests for the IMF GFS table (forty
 * series a request). Saved to data/live/gov-levels.json and pulled again after a week, since both
 * tables are annual; a run where nothing answered keeps the last copy and is retried after an hour.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { BIS_ISO2 } from '../../utils/bisDebtSecurities';
import { EUROSTAT_GEO } from '../../utils/govSpending';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines';
import {
  DBNOMICS_GFSMAB_URL,
  dbnomicsLevelsUrl,
  eurostatLevelsUrl,
  GFS_DEFAULT,
  GFS_UNIT_ENV,
  type GfsCodes,
  type GovLevelsPull,
  type GovLevelsReading,
  imfLevelIds,
  mergeLevels,
  parseDbnomicsLevels,
  parseEurostatLevels,
  pickGfsCodes,
} from '../../utils/govLevels';

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;
const BATCH = 40;
const FILE = 'gov-levels.json';

let memory: { pull: GovLevelsPull | null; triedAt: number } | null = null;
let inFlight: Promise<GovLevelsPull | null> | null = null;

export function loadGovLevels(): GovLevelsPull | null {
  if (!memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'live', FILE), 'utf8')) as GovLevelsPull;
      if (saved?.pulledAt && saved.countries) memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return memory?.pull ?? null;
}

async function getJson(url: string, what: string): Promise<unknown | null> {
  try {
    const res = await fetchWithTimeout(url, 30000);
    if (res.ok) return await res.json();
    console.warn(`[Government levels] ${what} refused (HTTP ${res.status})`);
  } catch (e) {
    console.warn(`[Government levels] ${what}: ${describeNetworkError(e, 30000)}`);
  }
  return null;
}

export function fetchGovLevels(opts: { force?: boolean } = {}): Promise<GovLevelsPull | null> {
  const saved = loadGovLevels();
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < WEEK) return Promise.resolve(saved);
    if (memory && Date.now() - memory.triedAt < HOUR) return Promise.resolve(saved);
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const isos = SOVEREIGN_CATALOG.map((c) => c.iso3);
    const geos = isos.filter((i) => EUROSTAT_GEO[i]).map((i) => EUROSTAT_GEO[i]);
    const iso2s = isos.map((i) => BIS_ISO2[i]).filter(Boolean);
    const since = new Date().getUTCFullYear() - 10;
    const iso2ToIso3 = Object.fromEntries(Object.entries(BIS_ISO2).map(([iso3, iso2]) => [iso2, iso3]));
    const unitSet = process.env[GFS_UNIT_ENV]?.trim();
    const askImf = async (codes: GfsCodes) => {
      const ids = imfLevelIds(iso2s, codes);
      const batches: string[][] = [];
      for (let k = 0; k < ids.length; k += BATCH) batches.push(ids.slice(k, k + BATCH));
      const replies = await Promise.all(batches.map((b, k) => getJson(dbnomicsLevelsUrl(b), `IMF GFS via DBnomics (batch ${k + 1} of ${batches.length})`)));
      // One country's series can be split across batches: parse them together.
      const docs = replies.flatMap((r) => ((r as { series?: { docs?: unknown[] } } | null)?.series?.docs as unknown[]) || []);
      return { answered: replies.some(Boolean), imf: parseDbnomicsLevels({ series: { docs } }, iso2ToIso3, codes) };
    };
    const first: GfsCodes = { ...GFS_DEFAULT, ...(unitSet ? { unit: unitSet } : {}) };
    const [euro, firstImf] = await Promise.all([geos.length ? getJson(eurostatLevelsUrl(geos, since), 'Eurostat gov_10a_main') : Promise.resolve(null), askImf(first)]);
    let { imf } = firstImf;
    if (firstImf.answered && !Object.keys(imf).length) {
      // None of the series asked for came back: read the dataset's own codes and ask again with them.
      const picked = pickGfsCodes(await getJson(DBNOMICS_GFSMAB_URL, 'IMF GFS dataset codes via DBnomics'));
      const next: GfsCodes = { unit: unitSet || picked.codes.unit || first.unit, revenue: picked.codes.revenue || first.revenue, spending: picked.codes.spending || first.spending };
      if (JSON.stringify(next) !== JSON.stringify(first)) imf = (await askImf(next)).imf;
      if (!Object.keys(imf).length)
        console.warn(
          `[IMF GFS via DBnomics] answered, but none of the GFSMAB series the app asks for came back${picked.codes.unit ? '' : '; the dataset lists no unit labelled as a percent of GDP'}${picked.units.length ? ` (units: ${picked.units.join('; ')})` : ''}. npm run check:data row imf_gov_levels lists the codes DBnomics holds; ${GFS_UNIT_ENV} in .env sets the unit.`
        );
    }
    const geoToIso3 = Object.fromEntries(Object.entries(EUROSTAT_GEO).map(([iso3, g]) => [g, iso3]));
    const eurostat = euro ? parseEurostatLevels(euro, geoToIso3) : {};
    const countries: Record<string, GovLevelsReading> = mergeLevels(eurostat, imf);
    if (!Object.keys(countries).length) {
      memory = { pull: saved, triedAt: Date.now() };
      return saved;
    }
    // A table that did not answer this time keeps last time's figures for its countries.
    const fresh: GovLevelsPull = { pulledAt: new Date().toISOString(), countries: { ...(saved?.countries || {}), ...countries } };
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
export function resetGovLevelsForTests(): void {
  memory = null;
  inFlight = null;
}
