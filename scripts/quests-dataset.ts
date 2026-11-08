/**
 * Builds the yearly open Quests dataset (npm run quests:dataset): CSV tables of every approved Quest
 * that closed in the year, its entries, results, test verdicts and scores, with a README, a citation
 * file and SHA256SUMS, ready to deposit for a DOI (src/utils/questDataset.ts). Makes no network calls.
 *
 *   npm run quests:dataset -- --year 2027                      writes quests-dataset-2027/
 *   npm run quests:dataset -- --year 2027 --out ~/Desktop/qd   writes it somewhere else
 *
 * QUESTS_REPO (owner/name) adds the repository's address to the README and citation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { loadPublicEntries } from '../src/utils/questPublicEntryStore.ts';
import { loadResolutions, resolutionsPath } from '../src/utils/questResolveStore.ts';
import { computeStats } from '../src/utils/questStats.ts';
import { readAccounts } from '../src/utils/questStatsStore.ts';
import { loadTestRecord, testRecordPath } from '../src/utils/questTestStore.ts';
import { buildDataset } from '../src/utils/questDataset.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'quests');
const argv = process.argv.slice(2);
const arg = (k: string) => {
  const i = argv.indexOf(k);
  return i === -1 ? undefined : argv[i + 1];
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const year = arg('--year') ?? fail('Usage: npm run quests:dataset -- --year <YYYY> [--out <folder>]');
if (!/^\d{4}$/.test(year)) fail(`--year must be four digits, e.g. 2027 (got ${year})`);
const today = new Date().toISOString().slice(0, 10);
if (`${year}-12-31` >= today) console.warn(`Note: ${year} is not over yet, so Quests that close later in the year are not in this build.`);
const out = path.resolve(root, arg('--out') ?? `quests-dataset-${year}`);

const rec = loadResolutions(resolutionsPath(dir));
if (rec.brokenAt !== -1) fail(`quests/resolutions.jsonl is broken at line ${rec.brokenAt + 1}; restore it from git first.`);
const tests = loadTestRecord(testRecordPath(dir));
if (tests.problems.length) fail(`quests/test-verdicts.json: ${tests.problems.join('; ')}; restore it from git first.`);
const loaded = loadQuests(dir);
const entries = loadPublicEntries(dir);
const stats = computeStats({ quests: loaded.map((x) => ({ quest: x.quest, approved: x.approved })), entries, lines: rec.lines, accounts: readAccounts(dir), tests: tests.record.verdicts });
const repo = (process.env.QUESTS_REPO || '').trim();
const ds = buildDataset({
  year,
  quests: loaded.map((x) => ({ quest: x.quest, approved: x.approved, hash: x.hash })),
  entries,
  lines: rec.lines,
  tests: tests.record.verdicts,
  stats,
  repo: /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(repo) ? repo : '',
  builtOn: today,
});
if (!ds.counts.quests) fail(`No approved Quest closed in ${year}; nothing written.`);
fs.mkdirSync(out, { recursive: true });
const sums: string[] = [];
for (const [name, text] of Object.entries(ds.files)) {
  fs.writeFileSync(path.join(out, name), text);
  sums.push(`${crypto.createHash('sha256').update(text).digest('hex')}  ${name}`);
}
fs.writeFileSync(path.join(out, 'SHA256SUMS'), `${sums.join('\n')}\n`);
const c = ds.counts;
console.log(`Wrote ${path.relative(root, out) || out}/: ${c.quests} Quest(s), ${c.entries} entries, ${c.results} result line(s), ${c.verdicts} test verdict(s), ${c.scores} score(s).`);
