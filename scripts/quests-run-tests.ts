/**
 * Runs the tests entered to a Signal Quest, once, after entries close (npm run quests:run-tests),
 * and records the verdicts in quests/test-verdicts.json (src/utils/questSignal.ts). Needs the same
 * free feeds as `npm run backtest` (BIS, DBnomics, CFTC, OECD, IMF), so run it on a computer that
 * reaches them; a test of protest spikes also reads the GDELT and UCDP files in data/.
 *
 *   npm run quests:run-tests -- --by <login> <quest id>             run and record
 *   npm run quests:run-tests -- --by <login> <quest id> --dry-run   run and print, record nothing
 *
 * Then run `npm run docs:track-record` and commit both files in one pull request. A Quest's tests
 * are run once: a second run is refused, and a failed test is never re-run or re-tuned.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { runQuestTests } from '../src/utils/questTestRun.ts';
import { appendTestRun, loadTestRecord, testRecordPath } from '../src/utils/questTestStore.ts';
import { gdeltDailyDir, loadAllMonths } from '../src/utils/gdeltDailyStore.ts';
import { ucdpData } from '../src/utils/ucdpStore.ts';
import type { SignalQuest } from '../src/utils/quests.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'quests');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const by = opt('--by');
const id = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--by');
const dry = argv.includes('--dry-run');
if (!by || !id) fail('npm run quests:run-tests -- --by <your GitHub login> <signal quest id> [--dry-run]');

const found = loadQuests(dir).find((x) => x.quest.id === id && x.approved);
if (!found) fail(`No approved Quest with id ${id} in quests/.`);
if (found!.quest.type !== 'signal') fail(`${id} is a ${found!.quest.type} Quest; only Signal Quests take tests.`);
const q = found!.quest as SignalQuest;
const today = new Date().toISOString().slice(0, 10);
if (today <= q.closesOn) fail(`Entries close on ${q.closesOn}; the tests are run once, after that.`);
const file = testRecordPath(dir);
const rec = loadTestRecord(file);
if (rec.problems.length) fail(`quests/test-verdicts.json: ${rec.problems.join('; ')}. Restore it from git: git checkout -- quests/test-verdicts.json`);
const before = rec.record.runs.find((r) => r.questId === q.id && r.questVersion === q.version);
if (before) fail(`The tests for ${q.id} were run on ${before.ranAt} by ${before.by}; each Quest's tests are run once.`);

console.log(`Running the tests entered to ${q.id} (this pulls the long histories; it can take a few minutes)...`);
const out = await runQuestTests({ questsDir: dir, quest: q, questHash: found!.hash, by: by!, local: { gdeltMonths: () => loadAllMonths(gdeltDailyDir(dataDir)), ucdp: () => ucdpData(dataDir) } });
for (const s of out.skipped) console.log(`left out ${s.path}: ${s.reason}`);
for (const p of out.problems) console.log(`Problem: ${p}`);
if (!out.verdicts.length && !out.notRun.length) fail('No test was entered (or none passed the entry check), so nothing is recorded.');
if (out.notRun.length) fail(`These tests could not run this time: ${out.notRun.join(', ')}. Nothing was recorded; fix the problems above and run again.`);
for (const v of out.verdicts) console.log(`${v.login}.${v.n}.json (${v.method}): ${v.verdict.replace(/_/g, ' ')}${v.p !== undefined ? `, p ${v.p}` : ''}. ${v.summary}`);
if (dry) {
  console.log('Dry run: nothing recorded.');
} else {
  appendTestRun(file, { questId: q.id, questVersion: q.version, ranAt: new Date().toISOString(), by: by!, where: process.env.QUEST_RUN_WHERE || 'the maintainer\'s computer' }, out.verdicts);
  console.log(`Recorded ${out.verdicts.length} verdict(s) in quests/test-verdicts.json. Now run npm run docs:track-record and commit both files.`);
}
