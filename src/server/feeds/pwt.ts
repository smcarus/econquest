/**
 * The Penn World Table for growth accounting (G27, src/utils/growthAccounting.ts), kept in
 * data/local/pwt/. Read once per edition: the app downloads the edition's workbook the first time it
 * is needed (or reads a PWT .xlsx or .zip you put in that folder) and keeps only the columns growth
 * accounting uses, in data/local/pwt/pwt-growth.json. A new edition is read when PWT_EDITION changes.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { DATA_DIR } from '../config';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { readXlsxSheet } from '../../utils/xlsxRead';
import { describeNetworkError } from '../../utils/connectionCheck';
import { parsePwtRows, PWT_EDITION, PWT_URL, type PwtFile } from '../../utils/growthAccounting';

const RETRY_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 180_000;

let memory: PwtFile | null = null;
let triedAt = 0;
let inFlight: Promise<PwtFile | null> | null = null;

export const pwtDir = (dataDir = DATA_DIR) => path.join(dataDir, 'local', 'pwt');
const cacheFile = (dataDir = DATA_DIR) => path.join(pwtDir(dataDir), 'pwt-growth.json');

/** A workbook (or a zip holding one) into the saved table, or the reason it did not read. */
export async function readPwtWorkbook(buf: Uint8Array, from: string): Promise<PwtFile | { reason: string }> {
  let book = buf;
  if (/\.zip$/i.test(from)) {
    const inner = Object.entries(unzipSync(buf, { filter: (f) => /\.xlsx$/i.test(f.name) && !f.name.startsWith('__MACOSX') }))[0];
    if (!inner) return { reason: 'the zip has no .xlsx inside' };
    book = inner[1];
  }
  const rows = await readXlsxSheet(book, 'Data');
  if (!rows) return { reason: 'no sheet named "Data" (the Penn World Table layout)' };
  const countries = parsePwtRows(rows);
  if (!countries) return { reason: 'the Data sheet has no countrycode, year, rgdpna, rnna, emp, avh, hc and labsh columns' };
  return { edition: PWT_EDITION, from, readAt: new Date().toISOString(), countries };
}

function save(file: PwtFile, dataDir = DATA_DIR): void {
  try {
    fs.mkdirSync(pwtDir(dataDir), { recursive: true });
    writeFileAtomic(cacheFile(dataDir), JSON.stringify(file));
  } catch {
    // keep the memory copy
  }
}

/** The saved table, or a workbook you put in data/local/pwt/; never downloads. */
export async function loadPwt(dataDir = DATA_DIR): Promise<PwtFile | null> {
  if (memory) return memory;
  try {
    const saved = JSON.parse(fs.readFileSync(cacheFile(dataDir), 'utf8')) as PwtFile;
    if (saved?.edition === PWT_EDITION && saved.countries) return (memory = saved);
  } catch {
    // not saved yet
  }
  let names: string[] = [];
  try {
    names = fs.readdirSync(pwtDir(dataDir)).filter((n) => /\.(xlsx|zip)$/i.test(n) && !n.startsWith('~$'));
  } catch {
    return null;
  }
  for (const n of names.sort().reverse()) {
    try {
      const got = await readPwtWorkbook(new Uint8Array(fs.readFileSync(path.join(pwtDir(dataDir), n))), n);
      if ('countries' in got) {
        save(got, dataDir);
        return (memory = got);
      }
      console.warn(`[Penn World Table] ${n}: ${got.reason}`);
    } catch (e: any) {
      console.warn(`[Penn World Table] ${n} could not be read (${e?.message || e})`);
    }
  }
  return null;
}

/** loadPwt, else the edition's download (at most once every 6 hours after a miss). */
export async function fetchPwt(dataDir = DATA_DIR): Promise<PwtFile | null> {
  const have = await loadPwt(dataDir);
  if (have) return have;
  if (Date.now() - triedAt < RETRY_MS) return null;
  if (inFlight) return inFlight;
  triedAt = Date.now();
  inFlight = (async () => {
    try {
      const res = await fetchWithTimeout(PWT_URL, TIMEOUT_MS);
      if (!res.ok) {
        console.warn(`[Penn World Table] download refused (HTTP ${res.status}): ${PWT_URL}`);
        return null;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const got = await readPwtWorkbook(buf, PWT_URL);
      if (!('countries' in got)) {
        console.warn(`[Penn World Table] ${PWT_URL}: ${got.reason}`);
        return null;
      }
      try {
        fs.mkdirSync(pwtDir(dataDir), { recursive: true });
        fs.writeFileSync(path.join(pwtDir(dataDir), path.basename(PWT_URL)), buf);
      } catch {
        // the table below is enough
      }
      save(got, dataDir);
      return (memory = got);
    } catch (e) {
      console.warn(`[Penn World Table] download: ${describeNetworkError(e, TIMEOUT_MS)}`);
      return null;
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Tests only. */
export function resetPwtForTests(): void {
  memory = null;
  triedAt = 0;
  inFlight = null;
}
