/**
 * The IMF Sovereign Debt Investor Base workbook (utils/investorBase.ts) from data/local/imf-investor-base/:
 * the .zip the IMF posts (wp1439.zip) or the .xlsx inside it. The newest file that reads wins; read
 * again only when a file in the folder changes. Nothing is fetched and nothing is shipped.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { workbookSheets } from './aiddataStore';
import { investorBaseTable, sheetBlocks, versionFromRows, type InvestorBaseTable } from './investorBase';

export interface InvestorBaseData {
  table: InvestorBaseTable | null;
  skipped: Array<{ file: string; reason: string }>;
}

export function investorBaseDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'imf-investor-base');
}

const FILE_RE = /\.(xlsx|zip)$/i;

/** One workbook's bytes into the table, or the reason it did not read. */
export function readInvestorBaseWorkbook(name: string, buf: Uint8Array): InvestorBaseTable | { reason: string } {
  const sheets = [];
  let version: string | undefined;
  for (const rows of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const all = [...rows];
    version ||= versionFromRows(all.slice(0, 40));
    const b = sheetBlocks(all);
    if (b) sheets.push(b);
  }
  if (!sheets.length) return { reason: 'no sheet with the investor base blocks ("Total (Billion USD)", then the holder blocks) was found' };
  return investorBaseTable(sheets, name, version) ?? { reason: 'the holder blocks had no year with all six holders' };
}

export function loadInvestorBaseFolder(dir: string): InvestorBaseData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x) && !x.startsWith('~$'));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const files = names.map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
  const skipped: InvestorBaseData['skipped'] = [];
  for (const { n } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      const books = /\.zip$/i.test(n)
        ? Object.entries(unzipSync(buf, { filter: (f) => /\.xlsx$/i.test(f.name) && !f.name.startsWith('__MACOSX') })).map(([f, b]) => [`${n} > ${f}`, b] as const)
        : [[n, buf] as const];
      if (!books.length) skipped.push({ file: n, reason: 'zip has no .xlsx inside' });
      for (const [label, b] of books) {
        const got = readInvestorBaseWorkbook(label, b);
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

const cache = new Map<string, { stamp: string; data: InvestorBaseData | null }>();

/** The workbook in data/local/imf-investor-base/, or null when the folder has none. */
export function investorBaseData(dataDir: string): InvestorBaseData | null {
  const dir = investorBaseDir(dataDir);
  const s = stamp(dir);
  const hit = cache.get(dir);
  if (hit && hit.stamp === s) return hit.data;
  const data = loadInvestorBaseFolder(dir);
  cache.set(dir, { stamp: s, data });
  return data;
}
