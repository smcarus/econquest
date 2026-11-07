/**
 * Drafts Forecast Quests for the coming weeks (npm run quests:generate), for the maintainer to read
 * and approve in a batch. Weekly Brent and currency Quests, monthly policy-rate Quests
 * (src/utils/questGenerator.ts). Nothing is approved here.
 *
 *   npm run quests:generate                         list what would be drafted for the next 4 weeks
 *   npm run quests:generate -- --weeks 6 --write    write them into quests/drafts/
 *   npm run quests:generate -- --by <login>         author of the drafts (default smcarus)
 *
 * Then: npm run quests:approve -- --by <login> <id> <id> ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readQuestFiles } from '../src/utils/questStore.ts';
import { generateQuests, questFileText } from '../src/utils/questGenerator.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const argv = process.argv.slice(2);
const opt = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const weeks = Math.max(1, Math.min(12, Number(opt('--weeks') ?? 4) || 4));
const existing = new Set(readQuestFiles(dir).map((f) => (f.json as { id?: string } | null)?.id).filter((x): x is string => !!x));
const today = new Date().toISOString().slice(0, 10);
const { quests, skipped } = generateQuests({ today, weeks, author: opt('--by') ?? 'smcarus', existing });
for (const q of quests) console.log(`${argv.includes('--write') ? 'wrote' : 'would draft'} quests/drafts/${q.id}.json  (open ${q.opensOn}, close ${q.closesOn})  ${q.title}`);
for (const s of skipped) console.log(`skip ${s.id}: ${s.why}`);
if (argv.includes('--write')) {
  fs.mkdirSync(path.join(dir, 'drafts'), { recursive: true });
  for (const q of quests) fs.writeFileSync(path.join(dir, 'drafts', `${q.id}.json`), questFileText(q), { flag: 'wx' });
}
console.log(quests.length ? `${quests.length} draft(s)${argv.includes('--write') ? ' written' : '; add --write to write them'}.` : 'Nothing new to draft.');
