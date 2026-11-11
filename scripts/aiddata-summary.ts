/**
 * Writes datasets/aiddata/china-lending.json: per-country sums of official loan commitments from
 * China, from AidData's Global Chinese Development Finance file, with the rules in
 * src/utils/lowIncomeDebt.ts (aiddataTable). The app ships this summary so the figures work with no
 * setup; a file in data/local/aiddata/ wins over it.
 *
 *   npm run aiddata:summary                 reads data/local/aiddata/
 *   npm run aiddata:summary -- <folder>     reads <folder>/local/aiddata/
 */
import fs from 'fs';
import path from 'path';
import { AIDDATA_BUNDLED, aiddataDir, loadAiddataFolder, summaryFromTable } from '../src/utils/aiddataStore.ts';

const RULES =
  'Loans only (Flow Type "Loan" or an export credit), rows AidData recommends for aggregates, firm commitments (pledges, cancelled and suspended loans left out), short-term loans (mostly central bank swap drawdowns recorded again each year) and refinancing left out; Amount (Constant USD 2021); the recent figure is the last five years of the file.';

const dataDir = process.argv[2] || process.env.DATA_DIR || path.join(process.cwd(), 'data');
const got = loadAiddataFolder(aiddataDir(dataDir));
if (!got?.table) {
  console.error(`No readable AidData file in ${aiddataDir(dataDir)}.${got?.skipped.length ? ` ${got.skipped.map((s) => `${s.file}: ${s.reason}`).join('; ')}` : ''}`);
  process.exit(1);
}
const summary = summaryFromTable({ ...got.table, file: path.basename(got.table.file.split(' > ').pop() || got.table.file) }, RULES, new Date().toISOString().slice(0, 10));
fs.mkdirSync(path.dirname(AIDDATA_BUNDLED), { recursive: true });
fs.writeFileSync(AIDDATA_BUNDLED, JSON.stringify(summary, null, 1) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), AIDDATA_BUNDLED)}: ${Object.keys(summary.countries).length} countries, to ${summary.fileLastYear}.`);
