/**
 * `npm run synth:validate`: the pre-registered false-alarm test of "What happened after" (synthetic
 * control; docs/validation/models/synthetic_control.json; plan step SC3).
 *
 * Reads the saved yearly histories in data/history/ (filled by the daily download), so it runs on a
 * computer that reaches the IMF and World Bank. Refuses a check file whose hash is not in
 * docs/validation/models/manifest.json. Saves the result in
 * data/local/validation/synthetic-control-<time>.json and prints a summary. Too few saved histories
 * is not a verdict. A FAILED verdict is a result: the method is not re-tuned after a fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sha256 } from '../src/utils/backtestRun';
import { runSynthCheck, synthCheckSummary, type SynthCheckSpec } from '../src/utils/synthCheck';
import type { SynthHistory } from '../src/utils/syntheticControl';

dotenv.config();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = path.join(root, 'docs', 'validation', 'models');
const file = 'synthetic_control.json';

const buf = fs.readFileSync(path.join(dir, file));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).files as Record<string, string>;
const hash = sha256(buf);
if (manifest[file] !== hash) {
  console.error(`${file}: the file changed after it was registered (hash ${hash.slice(0, 12)} is not in manifest.json). Not run.`);
  process.exit(1);
}
const spec = JSON.parse(buf.toString('utf8')) as SynthCheckSpec;

const historyDir = path.join(dataDir, 'history');
const histories: SynthHistory[] = [];
let names: string[] = [];
try {
  names = fs.readdirSync(historyDir).filter((n) => /^[A-Z0-9]+\.json$/.test(n)).sort();
} catch {
  // no history downloaded yet
}
for (const n of names) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(historyDir, n), 'utf8'));
    if (parsed?.series) histories.push({ iso3: n.replace(/\.json$/, ''), name: n.replace(/\.json$/, ''), series: parsed.series });
  } catch {
    // unreadable file: left out
  }
}
const asOf = new Date().toISOString().slice(0, 10);
console.log(`Running ${file} (hash ${hash.slice(0, 12)}) on ${histories.length} saved country histories, years before ${asOf.slice(0, 4)}. This takes a few minutes.`);
const result = runSynthCheck(spec, histories, asOf);
const outDir = path.join(dataDir, 'local', 'validation');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `synthetic-control-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), file, hash, asOf, result }, null, 2));
console.log(synthCheckSummary(result));
console.log(`Saved: ${path.relative(root, out)}`);
