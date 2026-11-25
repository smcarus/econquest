/**
 * npm run track-record:import: copies the verdicts and forward record of a real run into the
 * published track record (docs/validation/recorded-verdicts.json), then rebuilds
 * docs/TRACK_RECORD.md and docs/METHODS.md. See src/utils/trackRecordImport.ts.
 *
 *   npm run track-record:import                      reads data/local/validation/ (or DATA_DIR)
 *   npm run track-record:import -- --from <folder>   reads another copy of that folder
 *   npm run track-record:import -- --where "<text>"  names the computer in the Runs list
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importRun, recordJson, type ImportInput, type RecordFile, type RegisteredHashes, type SavedFile } from '../src/utils/trackRecordImport.ts';
import { VERDICT_FOLDER, type VerdictKind } from '../src/utils/methodsDoc.ts';
import { loadForward } from '../src/utils/forwardRecordStore.ts';
import { trackRecordFromRepo } from '../src/utils/trackRecordDocNode.ts';
import { methodsFromRepo } from '../src/utils/methodsDocNode.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const from = path.resolve(arg('--from') || path.join(process.env.DATA_DIR || path.join(root, 'data'), 'local', 'validation'));
const where = arg('--where') || "The owner's computer";

const readJson = (file: string): SavedFile | undefined => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as SavedFile) : undefined);
const input: ImportInput = {
  backtest: readJson(path.join(from, 'results.json')),
  forecast: readJson(path.join(from, 'forecasts.json')),
  signal: readJson(path.join(from, 'signals.json')),
  forward: loadForward(path.join(from, 'forward.jsonl')),
};
if (!input.backtest && !input.forecast && !input.signal) {
  console.error(`No results.json, forecasts.json or signals.json in ${from}. Run npm run mac:validate first.`);
  process.exit(1);
}

const registered = {} as RegisteredHashes;
for (const [kind, folder] of Object.entries(VERDICT_FOLDER) as [VerdictKind, string][]) {
  registered[kind] = JSON.parse(readFileSync(path.join(root, 'docs/validation', folder, 'manifest.json'), 'utf8')).files;
}

const recordFile = path.join(root, 'docs/validation/recorded-verdicts.json');
const record = JSON.parse(readFileSync(recordFile, 'utf8')) as RecordFile;
const out = importRun(record, input, registered, { where, now: new Date().toISOString() });
for (const n of out.notes) console.log(`Note: ${n}`);
if (!out.added.length && !out.filled.length && !out.forwardUpdated) {
  console.log('Nothing new: every test in these files is already on record, and the forward record has not grown.');
  process.exit(0);
}
writeFileSync(recordFile, recordJson(out.record));
writeFileSync(path.join(root, 'docs/TRACK_RECORD.md'), trackRecordFromRepo(root));
writeFileSync(path.join(root, 'docs/METHODS.md'), methodsFromRepo(root));
console.log(out.added.length ? `Added ${out.added.length}: ${out.added.join(', ')}.` : 'No new tests.');
if (out.filled.length) console.log(`p filled in for ${out.filled.join(', ')}.`);
if (out.forwardUpdated) console.log(`Forward record summarised: ${out.record.forward!.lines} lines, ${out.record.forward!.tests.length} tests.`);
console.log('Wrote docs/validation/recorded-verdicts.json, docs/TRACK_RECORD.md and docs/METHODS.md.');
