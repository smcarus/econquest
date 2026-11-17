/**
 * The FAOSTAT Consumer Price Indices file (utils/foodPrices.ts) from data/local/fao-cpi/: the
 * "All Data Normalized" .csv FAO posts, or the .zip holding it. The newest file that reads wins; read
 * again only when a file in the folder changes. Nothing is fetched and nothing is shipped.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { parseCsv } from './ucdpConflict';
import { faoCpiTable, type FaoCpiTable } from './foodPrices';

export interface FaoCpiData {
  table: FaoCpiTable | null;
  skipped: Array<{ file: string; reason: string }>;
}

export function faoCpiDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'fao-cpi');
}

const FILE_RE = /\.(csv|zip)$/i;

export function loadFaoCpiFolder(dir: string): FaoCpiData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const files = names.map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
  const skipped: FaoCpiData['skipped'] = [];
  for (const { n } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      // FAO zips hold the data .csv beside flag and code lists; the data file is the largest.
      const inner = /\.zip$/i.test(n)
        ? Object.entries(unzipSync(buf, { filter: (f) => /\.csv$/i.test(f.name) && !f.name.startsWith('__MACOSX') }))
            .sort((a, b) => b[1].length - a[1].length)
            .map(([f, b]) => [`${n} > ${f}`, b] as const)
        : [[n, buf] as const];
      if (!inner.length) skipped.push({ file: n, reason: 'zip has no .csv inside' });
      for (const [label, b] of inner) {
        const got = faoCpiTable(parseCsv(new TextDecoder().decode(b)), label);
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

const cache = new Map<string, { stamp: string; data: FaoCpiData | null }>();

/** The table and, when there is none but a file was there, why. */
export function faoCpiInput(dataDir: string): { table: FaoCpiTable | null; reason?: string } {
  const dir = faoCpiDir(dataDir);
  const s = stamp(dir);
  let hit = cache.get(dir);
  if (!hit || hit.stamp !== s) {
    hit = { stamp: s, data: loadFaoCpiFolder(dir) };
    cache.set(dir, hit);
  }
  const d = hit.data;
  if (d?.table) return { table: d.table };
  if (d?.skipped.length) return { table: null, reason: `The file in data/local/fao-cpi/ did not read: ${d.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}` };
  return { table: null };
}
