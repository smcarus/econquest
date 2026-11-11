/**
 * AidData's Global Chinese Development Finance figures (utils/lowIncomeDebt.ts), from:
 * - data/local/aiddata/: the file you downloaded (.xlsx or .csv, or a .zip holding one), when there
 *   is one. Every worksheet is tried until one has the GCDF columns (the workbook also holds notes and
 *   a data dictionary). The newest file that reads wins. Cached until a file in the folder changes.
 * - otherwise datasets/aiddata/china-lending.json in the repository: the per-country sums from
 *   version 3.0, made by `npm run aiddata:summary` with the same rules and shipped with the app
 *   (ODC-By, credit to AidData).
 * Nothing is fetched.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseCsv } from './ucdpConflict';
import { parseSharedStrings } from './xlsxRead';
import { sheetRows } from './acledFiles';
import { AIDDATA_CITATION, AIDDATA_SOURCE, aiddataTable, type AiddataData, type AiddataTable, type ChinaLending } from './lowIncomeDebt';

export const AIDDATA_BUNDLED = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'datasets', 'aiddata', 'china-lending.json');

/** The shipped summary file's shape. */
export interface AiddataSummary {
  source: string;
  citation: string;
  licence: string;
  file: string;
  made: string;
  rules: string;
  fileLastYear: number;
  countries: Record<string, Omit<ChinaLending, 'file'>>;
}

export function summaryFromTable(t: AiddataTable, rules: string, made: string): AiddataSummary {
  const countries: AiddataSummary['countries'] = {};
  const r = (v: number) => Math.round(v * 1000) / 1000;
  for (const [iso, c] of [...t.countries.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const { file: _f, ...rest } = c;
    countries[iso] = { ...rest, totalUsdBn: r(c.totalUsdBn), recentUsdBn: r(c.recentUsdBn) };
  }
  return { source: AIDDATA_SOURCE, citation: AIDDATA_CITATION, licence: 'ODC-By 1.0 (Open Data Commons Attribution License)', file: t.file, made, rules, fileLastYear: t.fileLastYear, countries };
}

export function tableFromSummary(s: AiddataSummary, label: string): AiddataTable {
  const countries = new Map<string, ChinaLending>();
  for (const [iso, c] of Object.entries(s.countries)) countries.set(iso, { ...c, file: label });
  return { countries, fileLastYear: s.fileLastYear, file: label, modified: s.made };
}

function loadBundled(file: string): AiddataData | null {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8')) as AiddataSummary;
    return { table: tableFromSummary(s, 'AidData GCDF 3.0 summary shipped with the app'), skipped: [] };
  } catch {
    return null;
  }
}

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
        // The workbook first: AidData's zip also holds location .csv files without the loan columns.
        const list = Object.keys(inner).sort((a, b) => Number(/\.csv$/i.test(a)) - Number(/\.csv$/i.test(b)));
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

/**
 * Your file in data/local/aiddata/ when one reads (read again only when a file changes), otherwise
 * the summary shipped in datasets/aiddata/. A file of yours that does not read is reported in
 * `skipped` beside the shipped figures.
 */
export function aiddataData(dataDir: string, bundled: string = AIDDATA_BUNDLED): AiddataData | null {
  const dir = aiddataDir(dataDir);
  const stamp = folderStamp(dir);
  const hit = cache.get(dir);
  let local: AiddataData | null;
  if (hit && hit.stamp === stamp) local = hit.data;
  else {
    local = loadAiddataFolder(dir);
    cache.set(dir, { stamp, data: local });
  }
  if (local?.table) return local;
  const shipped = loadBundled(bundled);
  if (shipped) return { table: shipped.table, skipped: local?.skipped ?? [] };
  return local;
}
