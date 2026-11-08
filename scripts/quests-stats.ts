/**
 * Contributor statistics (npm run quests:stats): recomputes quests/stats.json from the public entries
 * (quests/entries/) and the recorded results (quests/resolutions.jsonl), and looks up the creation
 * date of each new contributor's GitHub account (kept in quests/accounts.json) for the 90-day rule.
 * Commit both files after a run.
 *
 *   npm run quests:stats              look up new accounts on GitHub, then write the files
 *   npm run quests:stats -- --offline write the files without looking anything up (new contributors
 *                                     stay unranked until a run that can reach GitHub)
 *
 * GITHUB_TOKEN, when set, is sent to GitHub to lift the lookup limit (60 an hour without it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { loadPublicEntries } from '../src/utils/questPublicEntryStore.ts';
import { loadResolutions, resolutionsPath } from '../src/utils/questResolveStore.ts';
import { computeStats } from '../src/utils/questStats.ts';
import { accountsPath, readAccounts, statsPath } from '../src/utils/questStatsStore.ts';
import { loadTestRecord, testRecordPath } from '../src/utils/questTestStore.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const rec = loadResolutions(resolutionsPath(dir));
if (rec.brokenAt !== -1) {
  console.error(`quests/resolutions.jsonl is broken at line ${rec.brokenAt + 1}; restore it from git before computing statistics.`);
  process.exit(1);
}
const quests = loadQuests(dir).map((x) => ({ quest: x.quest, approved: x.approved }));
const tests = loadTestRecord(testRecordPath(dir));
if (tests.problems.length) {
  console.error(`quests/test-verdicts.json: ${tests.problems.join('; ')}; restore it from git before computing statistics.`);
  process.exit(1);
}
const entries = loadPublicEntries(dir);
const accounts = readAccounts(dir);
const missing = [...new Set(entries.map((e) => e.login))].filter((l) => !l.startsWith('~') && !accounts[l]).sort();
if (missing.length && !process.argv.includes('--offline')) {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'econquest-quests-stats' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (const login of missing) {
    try {
      const r = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers, signal: AbortSignal.timeout(15_000) });
      const j = (await r.json().catch(() => ({}))) as { created_at?: string };
      if (r.ok && j.created_at) accounts[login] = j.created_at;
      else console.log(`could not look up ${login}: HTTP ${r.status}`);
    } catch (e) {
      console.log(`could not look up ${login}: ${(e as Error).message}`);
    }
  }
}
const sorted = Object.fromEntries(Object.entries(accounts).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(accountsPath(dir), `${JSON.stringify({ note: 'GitHub account creation times, looked up by npm run quests:stats for the 90-day ranking rule. Public data.', accounts: sorted }, null, 2)}\n`);
const stats = computeStats({ quests, entries, lines: rec.lines, accounts: sorted, tests: tests.record.verdicts });
fs.writeFileSync(statsPath(dir), `${JSON.stringify(stats, null, 2)}\n`);
console.log(`Wrote quests/stats.json: ${stats.contributors.length} contributor(s), ${stats.board.allTime.length} ranked; quests/accounts.json: ${Object.keys(sorted).length} account(s).`);
