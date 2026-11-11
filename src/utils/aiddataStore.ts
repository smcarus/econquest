/**
 * Reads AidData's Global Chinese Development Finance file (utils/lowIncomeDebt.ts) from
 * data/local/aiddata/: .xlsx or .csv, or a .zip holding one. Nothing is fetched. Every worksheet is
 * tried until one has the GCDF columns (the workbook also holds notes and a data dictionary). The
 * newest file that reads wins. Cached until a file in the folder changes.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseCsv } from './ucdpConflict';
import { parseSharedStrings } from './xlsxRead';
import { sheetRows } from './acledFiles';
import { aiddataTable, type AiddataData, type AiddataTable } from './lowIncomeDebt';

export function aiddataDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'aiddata');
}

const FILE_RE = /\.(csv|xlsx|zip)$/i;

/** Every worksheet of an .xlsx (unzipped), in workbook order, as rows of text. */
function* workbookSheets(entries: Record<string, Uint8Array>): Generator<Iterable<string[]>> {
  const text = (name: string) => (entries[name] ? strFromU8(entries[name]) : null);
  const workbook = text('xl/workbook.xml');
  const rels = text('xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) return;
  const shared = text('xl/sharedStrings.xml');
  const strings = shared ? parseSharedStrings(shared) : [];
  const relTags = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]);
  for (const m of workbook.matchAll(/<sheet\b[^>]*\br:id="([^"]+)"/g)) {
    const target = relTags.find((r) => r.match(/\bId="([^"]+)"/)?.[1] === m[1])?.match(/\bTarget="([^"]+)"/)?.[1];
    if (!target) continue;
    const sheet = entries[target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`];
    if (sheet) yield sheetRows(sheet, strings);
  }
}

function readTable(name: string, buf: Uint8Array, modified: string): { table: AiddataTable } | { reason: string } {
  if (/\.csv$/i.test(name)) return aiddataTable(parseCsv(new TextDecoder().decode(buf)), name, modified);
  let last: { reason: string } = { reason: 'no worksheet found in the .xlsx' };
  for (const rows of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const got = aiddataTable(rows, name, modified);
    if ('table' in got) return got;
    last = got;
  }
  return last;
}

/** Reads the folder. Null when it has no file. */
export function loadAiddataFolder(dir: string): AiddataData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x) && !x.startsWith('~$'));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const files = names
    .map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtime }))
    .sort((a, b) => b.m.getTime() - a.m.getTime());
  const skipped: AiddataData['skipped'] = [];
  for (const { n, m } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      const modified = m.toISOString();
      if (/\.zip$/i.test(n)) {
        const inner = unzipSync(buf, { filter: (f) => /\.(csv|xlsx)$/i.test(f.name) && !f.name.startsWith('__MACOSX') });
        const list = Object.keys(inner);
        if (!list.length) skipped.push({ file: n, reason: 'zip has no .csv or .xlsx inside' });
        for (const f of list) {
          const got = readTable(`${n} > ${f}`, inner[f], modified);
          if ('table' in got) return { table: got.table, skipped };
          skipped.push({ file: `${n} > ${f}`, reason: got.reason });
        }
      } else {
        const got = readTable(n, buf, modified);
        if ('table' in got) return { table: got.table, skipped };
        skipped.push({ file: n, reason: got.reason });
      }
    } catch (err: any) {
      skipped.push({ file: n, reason: `could not be read (${err?.message || err})` });
    }
  }
  return { table: null, skipped };
}

function folderStamp(dir: string): string {
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

const cache = new Map<string, { stamp: string; data: AiddataData | null }>();

/** The file in data/local/aiddata/, read again only when a file changes. */
export function aiddataData(dataDir: string): AiddataData | null {
  const dir = aiddataDir(dataDir);
  const stamp = folderStamp(dir);
  const hit = cache.get(dir);
  if (hit && hit.stamp === stamp) return hit.data;
  const data = loadAiddataFolder(dir);
  cache.set(dir, { stamp, data });
  return data;
}
