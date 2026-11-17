/**
 * The EM-DAT public table (utils/disasters.ts) from data/local/emdat/: the .xlsx a user downloads from
 * public.emdat.be with their own account, a .csv saved from it, or a .zip holding either. The newest
 * file that reads wins; read again only when a file in the folder changes. Nothing is fetched and
 * nothing is shipped: EM-DAT's terms do not allow the data to be passed on.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { workbookSheets } from './aiddataStore';
import { parseCsv } from './ucdpConflict';
import { emdatTable, type EmdatTable } from './disasters';

export interface EmdatData {
  table: EmdatTable | null;
  /** Year the file was saved, for EM-DAT's citation (year of access). */
  downloadYear?: number;
  skipped: Array<{ file: string; reason: string }>;
}

export function emdatDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'emdat');
}

const FILE_RE = /\.(xlsx|csv|zip)$/i;

function readOne(label: string, buf: Uint8Array): EmdatTable | { reason: string } {
  if (/\.csv$/i.test(label)) return emdatTable(parseCsv(new TextDecoder().decode(buf)), label);
  let last: { reason: string } = { reason: 'no worksheet found in the .xlsx' };
  for (const rows of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const got = emdatTable(rows, label);
    if ('countries' in got) return got;
    last = got;
  }
  return last;
}

export function loadEmdatFolder(dir: string): EmdatData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x) && !x.startsWith('~$'));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const files = names.map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtime })).sort((a, b) => b.m.getTime() - a.m.getTime());
  const skipped: EmdatData['skipped'] = [];
  for (const { n, m } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      const inner = /\.zip$/i.test(n)
        ? Object.entries(unzipSync(buf, { filter: (f) => /\.(xlsx|csv)$/i.test(f.name) && !f.name.startsWith('__MACOSX') })).map(([f, b]) => [`${n} > ${f}`, b] as const)
        : [[n, buf] as const];
      if (!inner.length) skipped.push({ file: n, reason: 'zip has no .xlsx or .csv inside' });
      for (const [label, b] of inner) {
        const got = readOne(label, b);
        if ('countries' in got) return { table: got, downloadYear: m.getUTCFullYear(), skipped };
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

const cache = new Map<string, { stamp: string; data: EmdatData | null }>();

/** The table and, when there is none but a file was there, why. */
export function emdatInput(dataDir: string): { table: EmdatTable | null; reason?: string; downloadYear?: number } {
  const dir = emdatDir(dataDir);
  const s = stamp(dir);
  let hit = cache.get(dir);
  if (!hit || hit.stamp !== s) {
    hit = { stamp: s, data: loadEmdatFolder(dir) };
    cache.set(dir, hit);
  }
  const d = hit.data;
  if (d?.table) return { table: d.table, ...(d.downloadYear ? { downloadYear: d.downloadYear } : {}) };
  if (d?.skipped.length) return { table: null, reason: `The file in data/local/emdat/ did not read: ${d.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}` };
  return { table: null };
}
