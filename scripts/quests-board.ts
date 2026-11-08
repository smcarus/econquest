/**
 * Builds the public Quests board (npm run quests:board): one static page from the files in quests/
 * (src/utils/questBoard.ts), for GitHub Pages or any web host. Run `npm run quests:stats` first so
 * GitHub account dates are looked up; this script makes no network calls.
 *
 *   npm run quests:board                         writes docs/quests/index.html
 *   npm run quests:board -- --out site/q.html    writes it somewhere else
 *
 * QUESTS_REPO (owner/name) adds links to the repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { loadPublicEntries } from '../src/utils/questPublicEntryStore.ts';
import { loadResolutions, resolutionsPath } from '../src/utils/questResolveStore.ts';
import { computeStats } from '../src/utils/questStats.ts';
import { readAccounts } from '../src/utils/questStatsStore.ts';
import { loadTestRecord, testRecordPath } from '../src/utils/questTestStore.ts';
import { loadProfiles } from '../src/utils/questStanceStore.ts';
import { boardHtml } from '../src/utils/questBoard.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'quests');
const argv = process.argv.slice(2);
const i = argv.indexOf('--out');
const out = path.resolve(root, i === -1 ? 'docs/quests/index.html' : argv[i + 1]);
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const rec = loadResolutions(resolutionsPath(dir));
if (rec.brokenAt !== -1) fail(`quests/resolutions.jsonl is broken at line ${rec.brokenAt + 1}; restore it from git first.`);
const tests = loadTestRecord(testRecordPath(dir));
if (tests.problems.length) fail(`quests/test-verdicts.json: ${tests.problems.join('; ')}; restore it from git first.`);
const quests = loadQuests(dir).map((x) => ({ quest: x.quest, approved: x.approved }));
const stats = computeStats({ quests, entries: loadPublicEntries(dir), lines: rec.lines, accounts: readAccounts(dir), tests: tests.record.verdicts });
const html = boardHtml({ stats, quests, lines: rec.lines, profiles: loadProfiles(dir), repo: /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test((process.env.QUESTS_REPO || '').trim()) ? (process.env.QUESTS_REPO || '').trim() : '', today: new Date().toISOString().slice(0, 10) });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(root, out)}: ${stats.contributors.length} contributor(s), ${stats.board.allTime.length} ranked, ${quests.filter((q) => q.approved).length} approved Quest(s).`);
