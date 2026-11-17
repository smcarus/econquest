/**
 * Reads the Chinn-Ito capital account openness file (utils/chinnIto.ts) from data/local/chinn-ito/:
 * the newest .xls (as published, fetched by `npm run chinn-ito:pull`), .xlsx or .csv there. Read
 * again only when the file changes. Server-only.
 */
import fs from 'fs';
import path from 'path';
import { parseCsvRows } from './sanctionsLists.ts';
import { xlsxRows } from './acledFiles.ts';
import { readXlsSheets } from './xlsRead.ts';
import { CHINN_ITO_PAGE, parseChinnItoRows, type ChinnItoTable } from './chinnIto.ts';

export function chinnItoDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'chinn-ito');
}

/** Rows of the first sheet of a .xls that reads as the Chinn-Ito table (else the first sheet; [] if not a .xls). */
export function chinnItoXlsRows(bytes: Uint8Array): string[][] {
  const sheets = readXlsSheets(bytes) || [];
  return sheets.find((rows) => !('reason' in parseChinnItoRows(rows))) ?? sheets[0] ?? [];
}

export type ChinnItoLoad = { ok: true; table: ChinnItoTable } | { ok: false; reason: string };

let cache: { key: string; load: ChinnItoLoad } | null = null;

export function chinnItoData(dataDir: string): ChinnItoLoad {
  const dir = chinnItoDir(dataDir);
  let files: Array<{ name: string; full: string; mtime: number; size: number }> = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((n) => /\.(xlsx?|csv)$/i.test(n) && !n.startsWith('~$'))
      .map((name) => {
        const full = path.join(dir, name);
        const s = fs.statSync(full);
        return { name, full, mtime: s.mtimeMs, size: s.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    // folder not there
  }
  if (!files.length) return { ok: false, reason: `no Chinn-Ito file in ${dir} (the daily download fetches it, or npm run chinn-ito:pull, or save kaopen_<year>.xls from ${CHINN_ITO_PAGE} there)` };
  const f = files[0]!;
  const key = `${f.full}:${f.mtime}:${f.size}`;
  if (cache?.key === key) return cache.load;
  let load: ChinnItoLoad;
  try {
    const rows = /\.csv$/i.test(f.name)
      ? parseCsvRows(fs.readFileSync(f.full, 'utf8'))
      : /\.xls$/i.test(f.name)
        ? chinnItoXlsRows(fs.readFileSync(f.full))
        : [...(xlsxRows(new Uint8Array(fs.readFileSync(f.full))) || [])];
    const t = parseChinnItoRows(rows);
    load = 'reason' in t ? { ok: false, reason: `${f.name}: ${t.reason}` } : { ok: true, table: { ...t, file: f.name, saved: new Date(f.mtime).toISOString() } };
  } catch (err: any) {
    load = { ok: false, reason: `${f.name} could not be read (${err?.message || err})` };
  }
  cache = { key, load };
  return load;
}
