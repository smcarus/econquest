/**
 * Energy mix per country (G20, src/utils/climateEnergy.ts) from Our World in Data's energy file,
 * kept in data/live/owid-energy.json.
 *
 * The file is large (about 10 MB or more) and changes a few times a year, so the daily run downloads
 * it again only when the saved copy is more than a week old; only the energy mix per country is kept.
 * The current file is asked for first and the older one (no longer updated) only when that fails.
 * The figures come from the Energy Institute, whose terms allow private, non-commercial use: the copy
 * is made on this computer and is never shipped with the app (Sam's choice, 2026-11-11).
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { OWID_ENERGY_LEGACY_URL, OWID_ENERGY_URL, type OwidEnergyPull, parseOwidEnergy } from '../../utils/climateEnergy';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 120_000;

let owidMemory: { pull: OwidEnergyPull | null; triedAt: number } | null = null;
let owidInFlight: Promise<OwidEnergyPull | null> | null = null;

function owidFile(): string {
  return path.join(DATA_DIR, 'live', 'owid-energy.json');
}

/** The saved copy only, without downloading (pages read this; the daily run refreshes it). */
export function loadOwidEnergy(): OwidEnergyPull | null {
  if (!owidMemory) {
    try {
      const saved = JSON.parse(fs.readFileSync(owidFile(), 'utf8')) as OwidEnergyPull;
      if (saved?.pulledAt && saved.countries) owidMemory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return owidMemory?.pull ?? null;
}

/** Tests only. */
export function resetOwidEnergyForTests(): void {
  owidMemory = null;
  owidInFlight = null;
}

async function download(url: string): Promise<ReturnType<typeof parseOwidEnergy>> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[Our World in Data] energy file refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    const parsed = parseOwidEnergy(await res.text());
    if (!parsed || !Object.keys(parsed).length) console.warn(`[Our World in Data] energy file not in the expected layout: ${url}`);
    return parsed && Object.keys(parsed).length ? parsed : null;
  } catch (e) {
    console.warn(`[Our World in Data] energy file: ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

/** Downloads the file when the copy is more than a week old (or `force`), else returns the copy. */
export async function fetchOwidEnergyPull(opts: { force?: boolean } = {}): Promise<OwidEnergyPull | null> {
  const saved = loadOwidEnergy();
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < WEEK_MS) return saved;
    if (owidMemory && Date.now() - owidMemory.triedAt < RETRY_MS) return saved;
  }
  if (owidInFlight) return owidInFlight;
  owidInFlight = (async () => {
    let file: OwidEnergyPull['file'] = 'current';
    let countries = await download(OWID_ENERGY_URL);
    if (!countries) {
      file = 'legacy';
      countries = await download(OWID_ENERGY_LEGACY_URL);
    }
    if (!countries) {
      owidMemory = { pull: saved, triedAt: Date.now() };
      return saved;
    }
    const fresh: OwidEnergyPull = { pulledAt: new Date().toISOString(), file, countries };
    owidMemory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(owidFile()), { recursive: true });
      writeFileAtomic(owidFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    owidInFlight = null;
  });
  return owidInFlight;
}
