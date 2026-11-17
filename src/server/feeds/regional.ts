/**
 * Regional figures (R6, src/utils/regional.ts). Two downloads in the daily step world:regional,
 * once a week each:
 * - DOSE from Zenodo (CC BY 4.0): the latest version of the record is looked up, and the CSV
 *   (about 18 MB) is downloaded only when the version differs from the saved one. Kept as a compact
 *   table in data/live/dose-regions.json.
 * - Eurostat NUTS 2 GDP per person (PPS) and unemployment, in data/live/eurostat-regions.json.
 * A failed download keeps the saved copy and is not tried again for an hour.
 * The Global Data Lab file is read only from data/local/gdl/, never downloaded.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import {
  doseCsvLink,
  doseLatestUrl,
  eurostatRegionGdpUrl,
  eurostatRegionUnempUrl,
  mergeEuroRegions,
  parseDoseCsv,
  parseGdlCsv,
  type DoseFile,
  type EuroRegionsFile,
  type GdlRow,
} from '../../utils/regional';

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;
const TIMEOUT_MS = 180_000;
const DOSE_FILE = 'dose-regions.json';
const EURO_FILE = 'eurostat-regions.json';

type Slot<T> = { value: T | null; triedAt: number; checkedAt?: number } | null;
let dose: Slot<DoseFile & { checkedAt?: string }> = null;
let euro: Slot<EuroRegionsFile> = null;
let gdl: { file: string | null; mtime: number; rows: GdlRow[] | null } | null = null;
let inFlight: Promise<{ dose: DoseFile | null; euro: EuroRegionsFile | null }> | null = null;

const livePath = (f: string, dataDir = DATA_DIR) => path.join(dataDir, 'live', f);
export const gdlDir = (dataDir = DATA_DIR) => path.join(dataDir, 'local', 'gdl');

function readSaved<T>(f: string, ok: (x: any) => boolean): T | null {
  try {
    const x = JSON.parse(fs.readFileSync(livePath(f), 'utf8'));
    return ok(x) ? (x as T) : null;
  } catch {
    return null;
  }
}

function save(f: string, x: unknown): void {
  try {
    fs.mkdirSync(path.join(DATA_DIR, 'live'), { recursive: true });
    writeFileAtomic(livePath(f), JSON.stringify(x));
  } catch {
    // keep the memory copy
  }
}

export function loadDose(): (DoseFile & { checkedAt?: string }) | null {
  if (!dose) {
    const v = readSaved<DoseFile & { checkedAt?: string }>(DOSE_FILE, (x) => !!x?.pulledAt && !!x?.countries);
    dose = { value: v, triedAt: v ? Date.parse(v.checkedAt || v.pulledAt) : 0 };
  }
  return dose.value;
}

export function loadEuroRegions(): EuroRegionsFile | null {
  if (!euro) {
    const v = readSaved<EuroRegionsFile>(EURO_FILE, (x) => !!x?.pulledAt && !!x?.countries);
    euro = { value: v, triedAt: v ? Date.parse(v.pulledAt) : 0 };
  }
  return euro.value;
}

/** The newest CSV in data/local/gdl/ (re-read when it changes), with its name; never downloads. */
export function loadGdl(dataDir = DATA_DIR): { file: string | null; rows: GdlRow[] | null } {
  let names: string[] = [];
  try {
    names = fs.readdirSync(gdlDir(dataDir)).filter((n) => /\.(csv|txt)$/i.test(n));
  } catch {
    return { file: null, rows: null };
  }
  const withTime = names.map((n) => ({ n, t: fs.statSync(path.join(gdlDir(dataDir), n)).mtimeMs })).sort((a, b) => b.t - a.t);
  const top = withTime[0];
  if (!top) return { file: null, rows: null };
  if (gdl && gdl.file === top.n && gdl.mtime === top.t) return gdl;
  let rows: GdlRow[] | null = null;
  try {
    rows = parseGdlCsv(fs.readFileSync(path.join(gdlDir(dataDir), top.n), 'utf8'));
  } catch (e: any) {
    console.warn(`[Global Data Lab] ${top.n} could not be read (${e?.message || e})`);
  }
  gdl = { file: top.n, mtime: top.t, rows };
  return gdl;
}

async function get(url: string, what: string): Promise<Response | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[${what}] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    return res;
  } catch (e) {
    console.warn(`[${what}] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

async function pullDose(saved: (DoseFile & { checkedAt?: string }) | null): Promise<(DoseFile & { checkedAt?: string }) | null> {
  const meta = await get(doseLatestUrl(), 'DOSE');
  const link = meta ? doseCsvLink(await meta.json().catch(() => null)) : null;
  if (!link) {
    if (meta) console.warn(`[DOSE] the Zenodo record lists no DOSE .csv file: ${doseLatestUrl()}`);
    return null;
  }
  const now = new Date().toISOString();
  if (saved && saved.record === link.record && saved.file === link.file) return { ...saved, checkedAt: now };
  const res = await get(link.url, 'DOSE');
  if (!res) return null;
  const got = parseDoseCsv(await res.text(), { record: link.record, version: link.version, file: link.file, pulledAt: now });
  if ('reason' in got) {
    console.warn(`[DOSE] ${link.file}: ${got.reason}`);
    return null;
  }
  return got;
}

async function pullEuro(): Promise<EuroRegionsFile | null> {
  const since = new Date().getUTCFullYear() - 5;
  const [g, u] = await Promise.all([get(eurostatRegionGdpUrl(since), 'Eurostat regions'), get(eurostatRegionUnempUrl(since), 'Eurostat regions')]);
  const merged = mergeEuroRegions(g ? await g.json().catch(() => null) : null, u ? await u.json().catch(() => null) : null);
  if (!merged) {
    if (g || u) console.warn('[Eurostat regions] the replies were not in the JSON-stat layout');
    return null;
  }
  return { pulledAt: new Date().toISOString(), ...merged };
}

/** Both downloads when due (a week old, an hour after a miss); the saved copies otherwise. */
export function fetchRegional(opts: { force?: boolean } = {}): Promise<{ dose: DoseFile | null; euro: EuroRegionsFile | null }> {
  const d = loadDose();
  const e = loadEuroRegions();
  const due = (s: Slot<unknown>, at?: string) => opts.force || ((!at || Date.now() - Date.parse(at) >= WEEK) && Date.now() - (s?.triedAt ?? 0) >= HOUR);
  const doseDue = due(dose, d?.checkedAt || d?.pulledAt);
  const euroDue = due(euro, e?.pulledAt);
  if (!doseDue && !euroDue) return Promise.resolve({ dose: d, euro: e });
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [nd, ne] = await Promise.all([doseDue ? pullDose(d) : Promise.resolve(null), euroDue ? pullEuro() : Promise.resolve(null)]);
    if (doseDue) {
      if (nd) save(DOSE_FILE, nd);
      dose = { value: nd ?? d, triedAt: Date.now() };
    }
    if (euroDue) {
      if (ne) save(EURO_FILE, ne);
      euro = { value: ne ?? e, triedAt: Date.now() };
    }
    return { dose: dose?.value ?? null, euro: euro?.value ?? null };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Tests only. */
export function resetRegionalForTests(): void {
  dose = null;
  euro = null;
  gdl = null;
  inFlight = null;
}
