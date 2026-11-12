/**
 * The IMF Fiscal Rules Dataset workbook (utils/fiscalRules.ts) from data/local/imf-fiscal-rules/: the
 * .xlsx the IMF posts, or a .zip holding it. Every worksheet is tried until one has the columns. The
 * newest file that reads wins; read again only when a file in the folder changes. Nothing is fetched
 * and nothing is shipped.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { workbookSheets } from './aiddataStore';
import { fiscalRulesTable, nameKey, type FiscalRulesTable } from './fiscalRules';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { INVESTOR_BASE_ISO3 } from './investorBase';

export interface FiscalRulesData {
  table: FiscalRulesTable | null;
  skipped: Array<{ file: string; reason: string }>;
}

export function fiscalRulesDir(dataDir: string): string {
  return path.join(dataDir, 'local', 'imf-fiscal-rules');
}

const FILE_RE = /\.(xlsx|zip)$/i;

/** Advanced economies and other IMF spellings not in the investor base list. */
const MORE_NAMES: Record<string, string> = {
  Andorra: 'AND', Austria: 'AUT', Belgium: 'BEL', Cyprus: 'CYP', 'Czech Republic': 'CZE', Czechia: 'CZE', Denmark: 'DNK', Estonia: 'EST',
  Finland: 'FIN', France: 'FRA', Germany: 'DEU', Greece: 'GRC', 'Hong Kong SAR': 'HKG', Iceland: 'ISL', Ireland: 'IRL', Israel: 'ISR',
  Italy: 'ITA', Japan: 'JPN', Korea: 'KOR', 'Korea, Republic of': 'KOR', Latvia: 'LVA', Lithuania: 'LTU', Luxembourg: 'LUX', Malta: 'MLT',
  Netherlands: 'NLD', 'Netherlands, The': 'NLD', 'New Zealand': 'NZL', Norway: 'NOR', Portugal: 'PRT', 'San Marino': 'SMR', Singapore: 'SGP',
  'Slovak Republic': 'SVK', Slovakia: 'SVK', Slovenia: 'SVN', Spain: 'ESP', Sweden: 'SWE', Switzerland: 'CHE', 'Taiwan Province of China': 'TWN',
  'United Kingdom': 'GBR', 'United States': 'USA', Australia: 'AUS', Canada: 'CAN', 'Macao SAR': 'MAC', Türkiye: 'TUR', 'Turkiye': 'TUR',
  'Russian Federation': 'RUS', 'Egypt, Arab Rep.': 'EGY', 'Iran, Islamic Republic of': 'IRN', 'Lao P.D.R.': 'LAO', 'Kyrgyzstan': 'KGZ',
  'Congo, Republic of': 'COG', 'Republic of Congo': 'COG', 'Congo, Democratic Republic of the': 'COD', 'Democratic Republic of the Congo': 'COD',
  'Cote d\'Ivoire': 'CIV', 'Gambia': 'GMB', 'Bahamas': 'BHS', 'North Macedonia': 'MKD', 'China, P.R.: Mainland': 'CHN', "People's Republic of China": 'CHN',
  'Micronesia, Fed. States of': 'FSM', 'Sao Tome and Principe': 'STP', 'Kosovo, Republic of': 'XKX', 'Yemen, Republic of': 'YEM', 'Peru': 'PER',
  'St. Kitts and Nevis': 'KNA', 'Saint Kitts and Nevis': 'KNA', 'Saint Lucia': 'LCA', 'Saint Vincent and the Grenadines': 'VCT', 'Viet Nam': 'VNM',
};

/** Country names (IMF and app spellings) to codes, for workbooks without a code column. */
export function countryNameIndex(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [n, iso] of [...Object.entries(INVESTOR_BASE_ISO3), ...Object.entries(MORE_NAMES)]) out[nameKey(n)] = iso;
  for (const c of SOVEREIGN_CATALOG) out[nameKey(c.countryName)] ||= c.iso3;
  return out;
}

export function readFiscalRulesWorkbook(name: string, buf: Uint8Array, names: Record<string, string>): FiscalRulesTable | { reason: string } {
  let last: { reason: string } = { reason: 'no worksheet found in the .xlsx' };
  for (const rows of workbookSheets(unzipSync(buf, { filter: (f) => f.name.startsWith('xl/') }))) {
    const got = fiscalRulesTable(rows, name, names);
    if ('countries' in got) return got;
    last = got;
  }
  return last;
}

export function loadFiscalRulesFolder(dir: string): FiscalRulesData | null {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((x) => FILE_RE.test(x) && !x.startsWith('~$'));
  } catch {
    return null;
  }
  if (!names.length) return null;
  const index = countryNameIndex();
  const files = names.map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
  const skipped: FiscalRulesData['skipped'] = [];
  for (const { n } of files) {
    try {
      const buf = new Uint8Array(fs.readFileSync(path.join(dir, n)));
      const books = /\.zip$/i.test(n)
        ? Object.entries(unzipSync(buf, { filter: (f) => /\.xlsx$/i.test(f.name) && !f.name.startsWith('__MACOSX') })).map(([f, b]) => [`${n} > ${f}`, b] as const)
        : [[n, buf] as const];
      if (!books.length) skipped.push({ file: n, reason: 'zip has no .xlsx inside' });
      for (const [label, b] of books) {
        const got = readFiscalRulesWorkbook(label, b, index);
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

const cache = new Map<string, { stamp: string; data: FiscalRulesData | null }>();

/** The workbook in data/local/imf-fiscal-rules/, or null when the folder has none. */
export function fiscalRulesData(dataDir: string): FiscalRulesData | null {
  const dir = fiscalRulesDir(dataDir);
  const s = stamp(dir);
  const hit = cache.get(dir);
  if (hit && hit.stamp === s) return hit.data;
  const data = loadFiscalRulesFolder(dir);
  cache.set(dir, { stamp: s, data });
  return data;
}

/** The table and, when there is none, why: for fiscalRulesCheck. */
export function fiscalRulesInput(dataDir: string): { table: FiscalRulesTable | null; reason?: string } {
  const d = fiscalRulesData(dataDir);
  if (d?.table) return { table: d.table };
  if (d?.skipped.length) return { table: null, reason: `The file in data/local/imf-fiscal-rules/ did not read: ${d.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}` };
  return { table: null };
}
