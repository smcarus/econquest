/**
 * Reads the IRR exchange rate classification workbook (utils/fxRegime.ts) from data/local/irr/: the
 * newest .xlsx there (or a .zip holding one) whose sheets read as the classification. Read again only
 * when a file in the folder changes. Nothing is fetched and nothing is shipped. Server-only.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { workbookSheets } from './aiddataStore';
import { nameKey } from './fiscalRules';
import { countryNameIndex } from './fiscalRulesStore';
import { IRR_PAGE, parseFxRegimeRows, type FxRegimeTable } from './fxRegime';

export function fxRegimeDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'irr');
}

/** Spellings in the IRR file that the shared name index does not hold. */
const MORE_NAMES: Record<string, string> = {
  'United States of America': 'USA', USA: 'USA', UK: 'GBR', 'Korea, South': 'KOR', 'South Korea': 'KOR', 'Korea (South)': 'KOR', Russia: 'RUS',
  Turkey: 'TUR', 'Egypt, Arab Republic': 'EGY', Egypt: 'EGY', 'Iran': 'IRN', 'Venezuela, RB': 'VEN', Venezuela: 'VEN', 'Hong Kong': 'HKG', 'Hong Kong, China': 'HKG',
  China: 'CHN', 'China, P.R.': 'CHN', 'Ivory Coast': 'CIV', "Cote D'Ivoire": 'CIV', Vietnam: 'VNM', 'Slovak Rep.': 'SVK', 'Czech Rep.': 'CZE',
  'Dominican Rep.': 'DOM', 'Central African Rep.': 'CAF', 'Congo, Dem. Rep.': 'COD', 'Congo, Rep.': 'COG', 'Syria': 'SYR', 'Laos': 'LAO', Burma: 'MMR', Myanmar: 'MMR',
};

export type FxRegimeLoad = { ok: true; table: FxRegimeTable } | { ok: false; reason: string };

function readBook(buf: Uint8Array, names: Record<string, string>): FxRegimeTable | { reason: string } {
  let last: { reason: string } = { reason: 'no worksheet found in the .xlsx' };
  for (const sheet of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const got = parseFxRegimeRows([...sheet], names, nameKey);
    if ('countries' in got) return got;
    last = got;
  }
  return last;
}

let cache: { key: string; load: FxRegimeLoad } | null = null;

export function fxRegimeData(dataDir: string): FxRegimeLoad {
  const dir = fxRegimeDir(dataDir);
  let files: Array<{ name: string; full: string; mtime: number; size: number }> = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((n) => /\.(xlsx|zip)$/i.test(n) && !n.startsWith('~$'))
      .map((name) => {
        const full = path.join(dir, name);
        const s = fs.statSync(full);
        return { name, full, mtime: s.mtimeMs, size: s.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    // folder not there
  }
  if (!files.length) return { ok: false, reason: `no IRR exchange rate classification file in data/local/irr/ (download the monthly workbook from ${IRR_PAGE} and put it there)` };
  const key = files.map((f) => `${f.name}:${f.mtime}:${f.size}`).join('|');
  if (cache?.key === key) return cache.load;
  const names: Record<string, string> = { ...countryNameIndex() };
  for (const [n, iso] of Object.entries(MORE_NAMES)) names[nameKey(n)] ||= iso;
  const reasons: string[] = [];
  let load: FxRegimeLoad | null = null;
  for (const f of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(f.full));
      const books = /\.zip$/i.test(f.name)
        ? Object.entries(unzipSync(buf, { filter: (x) => /\.xlsx$/i.test(x.name) && !x.name.startsWith('__MACOSX') })).map(([n, b]) => [`${f.name} > ${n}`, b] as const)
        : [[f.name, buf] as const];
      if (!books.length) reasons.push(`${f.name}: zip has no .xlsx inside`);
      for (const [label, b] of books) {
        const got = readBook(b, names);
        if ('countries' in got) {
          load = { ok: true, table: { ...got, file: label, saved: new Date(f.mtime).toISOString() } };
          break;
        }
        reasons.push(`${label}: ${got.reason}`);
      }
    } catch (err: any) {
      reasons.push(`${f.name} could not be read (${err?.message || err})`);
    }
    if (load) break;
  }
  load ||= { ok: false, reason: reasons.join('; ') };
  cache = { key, load };
  return load;
}
