/**
 * The Database of Political Institutions file (utils/politicalFeasibility.ts) from data/local/dpi/:
 * the .csv or .xlsx the Inter-American Development Bank posts, or a .zip holding one. Every worksheet
 * is tried. The newest file that reads wins; read again only when a file in the folder changes.
 * Nothing is fetched and nothing is shipped.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { workbookSheets } from './aiddataStore';
import { parseCsv } from './ucdpConflict';
import { dpiTable, type DpiTable } from './politicalFeasibility';

export interface DpiData {
  table: DpiTable | null;
  skipped: Array<{ file: string; reason: string }>;
}

export function dpiDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'dpi');
}

const FILE_RE = /\.(csv|xlsx|zip)$/i;

export function readDpiFile(name: string, buf: Uint8Array): DpiTable | { reason: string } {
  if (/\.csv$/i.test(name)) return dpiTable(parseCsv(new TextDecoder().decode(buf)), name);
  let last: { reason: string } = { reason: 'no worksheet found in the .xlsx' };
  for (const rows of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const got = dpiTable(rows, name);
    if ('countries' in got) return got;
    last = got;
  }
  return last;
}

export function loadDpiFolder(dir: string): DpiData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x) && !x.startsWith('~$'));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const files = names.map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
  const skipped: DpiData['skipped'] = [];
  for (const { n } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      const inner = /\.zip$/i.test(n)
        ? Object.entries(unzipSync(buf, { filter: (f) => /\.(csv|xlsx)$/i.test(f.name) && !f.name.startsWith('__MACOSX') })).map(([f, b]) => [`${n} > ${f}`, b] as const)
        : [[n, buf] as const];
      if (!inner.length) skipped.push({ file: n, reason: 'zip has no .csv or .xlsx inside' });
      for (const [label, b] of inner) {
        const got = readDpiFile(label, b);
        if ('countries' in got) return { table: got, skipped };
        skipped.push({ file: label, reason: got.reason });
      }
    } catch (err: any) {
      skipped.push({ file: n, reason: `could not be read (${err?.message || err})` });
    }
  }
  return { table: null, skipped };
}

function stamp(dir: string): string {
  try {
    return fs
      .readdirSync(dir)
      .filter((n) => FILE_RE.test(n))
      .sort()
      .map((n) => {
        const s = fs.statSync(path.join(dir, n));
        return `${n}:${s.size}:${s.mtimeMs}`;
      })
      .join('|');
  } catch {
    return '';
  }
}

const cache = new Map<string, { stamp: string; data: DpiData | null }>();

/** The file in data/local/dpi/, or null when the folder has none. */
export function dpiData(dataDir: string): DpiData | null {
  const dir = dpiDir(dataDir);
  const s = stamp(dir);
  const hit = cache.get(dir);
  if (hit && hit.stamp === s) return hit.data;
  const data = loadDpiFolder(dir);
  cache.set(dir, { stamp: s, data });
  return data;
}

/** The table and, when there is none but a file was there, why. */
export function dpiInput(dataDir: string): { table: DpiTable | null; reason?: string } {
  const d = dpiData(dataDir);
  if (d?.table) return { table: d.table };
  if (d?.skipped.length) return { table: null, reason: `The file in data/local/dpi/ did not read: ${d.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}` };
  return { table: null };
}
