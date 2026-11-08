/**
 * Reads the Caldara-Iacoviello monthly GPR file (utils/gprIndex.ts) from data/local/gpr/: the
 * newest .xls (as published, fetched by `npm run gpr:pull`), .xlsx or .csv there. Read again only when the file changes. Server-only.
 */
import fs from 'fs';
import path from 'path';
import { parseCsvRows } from './sanctionsLists.ts';
import { xlsxRows } from './acledFiles.ts';
import { readXlsSheets } from './xlsRead.ts';
import { parseGprRows, type GprTable } from './gprIndex.ts';

export function gprDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'gpr');
}

/** Rows of the first sheet of a GPR .xls that reads as the GPR table (else the first sheet; [] if not a .xls). */
export function gprXlsRows(bytes: Uint8Array): string[][] {
  const sheets = readXlsSheets(bytes) || [];
  return sheets.find((rows) => !('reason' in parseGprRows(rows))) ?? sheets[0] ?? [];
}

export type GprLoad = { ok: true; file: string; modified: string; table: GprTable } | { ok: false; reason: string };

let cache: { key: string; load: GprLoad } | null = null;

export function gprData(dataDir: string): GprLoad {
  const dir = gprDir(dataDir);
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
  if (!files.length)
    return { ok: false, reason: `no GPR file in ${dir} (npm run gpr:pull fetches it, or download the monthly file from matteoiacoviello.com/gpr.htm and save it there)` };
  const f = files[0];
  const key = `${f.full}:${f.mtime}:${f.size}`;
  if (cache?.key === key) return cache.load;
  let load: GprLoad;
  try {
    const rows = /\.csv$/i.test(f.name)
      ? parseCsvRows(fs.readFileSync(f.full, 'utf8'))
      : /\.xls$/i.test(f.name)
        ? gprXlsRows(fs.readFileSync(f.full))
        : [...(xlsxRows(new Uint8Array(fs.readFileSync(f.full))) || [])];
    const t = parseGprRows(rows);
    load = 'reason' in t ? { ok: false, reason: `${f.name}: ${t.reason}` } : { ok: true, file: f.name, modified: new Date(f.mtime).toISOString().slice(0, 10), table: t };
  } catch (err: any) {
    load = { ok: false, reason: `${f.name} could not be read (${err?.message || err})` };
  }
  cache = { key, load };
  return load;
}
