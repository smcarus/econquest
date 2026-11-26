/**
 * `npm run mfmod:validate`: the pre-registered reproduction check of the World Bank country models
 * (docs/validation/models/mfmod_reproduction.json; World Bank country models plan, step M4).
 *
 * Needs the models service running (MFMOD_URL in .env; docs/INSTALL.md, "Add the World Bank country
 * models"). Refuses a check file whose hash is not in docs/validation/models/manifest.json. Saves
 * the result in data/local/validation/mfmod-reproduction-<time>.json and prints a summary. With the
 * service off it says so and stops: that is not a verdict.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sha256 } from '../src/utils/backtestRun';
import { mfmodConfigFromEnv, serviceGet } from '../src/server/mfmod';
import { checkSummary, judgeMfmodReproduction, type BaselineCheckReply, type BookOilReply, type MfmodCheckSpec } from '../src/utils/mfmodCheck';

dotenv.config();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = path.join(root, 'docs', 'validation', 'models');
const file = 'mfmod_reproduction.json';

const buf = fs.readFileSync(path.join(dir, file));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).files as Record<string, string>;
const hash = sha256(buf);
if (manifest[file] !== hash) {
  console.error(`${file}: the file changed after it was registered (hash ${hash.slice(0, 12)} is not in manifest.json). Not run.`);
  process.exit(1);
}
const spec = JSON.parse(buf.toString('utf8')) as MfmodCheckSpec;

const cfg = mfmodConfigFromEnv(process.env);
if ('off' in cfg) {
  console.log('World Bank country models are off (MFMOD_URL not set), so the reproduction check was not run. See docs/INSTALL.md, "Add the World Bank country models".');
  process.exit(0);
}
if ('problem' in cfg) {
  console.log(`World Bank country models: ${cfg.problem} The reproduction check was not run.`);
  process.exit(0);
}
const base = cfg.url;

async function ask<T>(p: string): Promise<T | null> {
  try {
    const r = await serviceGet(`${base}${p}`, 600_000);
    if (r.status !== 200) {
      console.log(`  ${p}: the models service answered HTTP ${r.status}: ${r.text.slice(0, 200)}`);
      return null;
    }
    return JSON.parse(r.text) as T;
  } catch (e) {
    console.log(`  ${p}: ${(e as Error).message}`);
    return null;
  }
}

console.log(`Running ${file} (hash ${hash.slice(0, 12)}) against the models service at ${base}. Loading and solving all six models takes up to a minute.`);
const baseline = await ask<BaselineCheckReply>('/check/baseline');
const bookOil = await ask<BookOilReply>('/check/book-oil');
const result = judgeMfmodReproduction(spec, baseline, bookOil);
const outDir = path.join(dataDir, 'local', 'validation');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `mfmod-reproduction-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), file, hash, result, replies: { baseline, bookOil } }, null, 2));
console.log(checkSummary(result));
console.log(`Saved: ${path.relative(root, out)}`);
