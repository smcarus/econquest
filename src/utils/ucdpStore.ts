/**
 * Reads the UCDP CSV downloads in data/local/ucdp/ (utils/ucdpConflict.ts). Files may be the .zip
 * as downloaded from ucdp.uu.se or the .csv inside it. Nothing is fetched: the app only reads what
 * you put in the folder. The result is cached until a file in the folder changes.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync, strFromU8 } from 'fflate';
import { addUcdpCsv, emptyUcdpData, type UcdpData } from './ucdpConflict.ts';

export function ucdpDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'ucdp');
}

/** Reads every .csv and .zip in the folder. Null when the folder has no file the app reads. */
export function loadUcdpFolder(dir: string): UcdpData | null {
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter((n) => /\.(csv|zip)$/i.test(n)).sort();
  } catch {
    return null;
  }
  const data = emptyUcdpData();
  for (const name of names) {
    const full = path.join(dir, name);
    try {
      if (/\.zip$/i.test(name)) {
        const entries = unzipSync(new Uint8Array(fs.readFileSync(full)), { filter: (f) => /\.csv$/i.test(f.name) && !f.name.startsWith('__MACOSX') });
        const csvs = Object.keys(entries);
        if (!csvs.length) data.skipped.push({ file: name, reason: 'zip has no .csv inside' });
        for (const inner of csvs) addUcdpCsv(data, `${name} > ${inner}`, strFromU8(entries[inner]));
      } else addUcdpCsv(data, name, fs.readFileSync(full, 'utf8'));
    } catch (err: any) {
      data.skipped.push({ file: name, reason: `could not be read (${err?.message || err})` });
    }
  }
  return Object.keys(data.files).length || data.skipped.length ? data : null;
}

/** Stamp of the folder: file names, sizes and times. */
function folderStamp(dir: string): string {
  try {
    return fs
      .readdirSync(dir)
      .filter((n) => /\.(csv|zip)$/i.test(n))
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

const cache = new Map<string, { stamp: string; data: UcdpData | null }>();

/** The folder's data, read again only when a file changes. */
export function ucdpData(dataDir: string): UcdpData | null {
  const dir = ucdpDir(dataDir);
  const stamp = folderStamp(dir);
  const hit = cache.get(dir);
  if (hit && hit.stamp === stamp) return hit.data;
  const data = stamp ? loadUcdpFolder(dir) : null;
  cache.set(dir, { stamp, data });
  return data;
}
