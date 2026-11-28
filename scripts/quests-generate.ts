/**
 * Drafts Forecast Quests for the coming weeks (npm run quests:generate), for the maintainer to read
 * and approve in a batch. Weekly Brent and currency Quests, monthly policy-rate Quests
 * (src/utils/questGenerator.ts). Nothing is approved here.
 *
 *   npm run quests:generate                         list what would be drafted for the next 4 weeks
 *   npm run quests:generate -- --weeks 6 --write    write them into quests/drafts/
 *   npm run quests:generate -- --by <login>         author of the drafts (default smcarus)
 *   --write also writes Spanish, French and Portuguese text for each draft into quests/translations/
 *   npm run quests:generate -- --from 2027-01-08 --weeks 17 --kinds brent,brent-long,policy --write
 *                                                   a whole term ahead, only the kinds named
 *                                                   (brent, brent-long, fx, policy; default all)
 *
 * Then: npm run quests:approve -- --by <login> <id> <id> ...
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readQuestFiles } from '../src/utils/questStore.ts';
import { GENERATE_KINDS, generateQuests, questFileText, type GenerateKind } from '../src/utils/questGenerator.ts';
import { generatedTranslations } from '../src/utils/questGeneratorText.ts';
import { translationFileName } from '../src/utils/questTranslations.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const argv = process.argv.slice(2);
const opt = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const weeks = Math.max(1, Math.min(26, Number(opt('--weeks') ?? 4) || 4));
const from = opt('--from');
if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('--from takes a date, YYYY-MM-DD');
const kindsArg = opt('--kinds');
const kinds = kindsArg ? (kindsArg.split(',').map((k) => k.trim()) as GenerateKind[]) : undefined;
const badKind = kinds?.find((k) => !(GENERATE_KINDS as readonly string[]).includes(k));
if (badKind) throw new Error(`--kinds takes ${GENERATE_KINDS.join(', ')}; not "${badKind}"`);
const existing = new Set(readQuestFiles(dir).map((f) => (f.json as { id?: string } | null)?.id).filter((x): x is string => !!x));
const today = new Date().toISOString().slice(0, 10);
const author = opt('--by') ?? 'smcarus';
const { quests, skipped } = generateQuests({ today, weeks, from, kinds, author, existing });
for (const q of quests) console.log(`${argv.includes('--write') ? 'wrote' : 'would draft'} quests/drafts/${q.id}.json  (open ${q.opensOn}, close ${q.closesOn})  ${q.title}`);
for (const s of skipped) console.log(`skip ${s.id}: ${s.why}`);
if (argv.includes('--write')) {
  fs.mkdirSync(path.join(dir, 'drafts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'translations'), { recursive: true });
  for (const q of quests) {
    fs.writeFileSync(path.join(dir, 'drafts', `${q.id}.json`), questFileText(q), { flag: 'wx' });
    // Spanish, French and Portuguese text beside each draft, so a class taught in those languages reads it too.
    for (const t of generatedTranslations(q, author)) fs.writeFileSync(path.join(dir, 'translations', translationFileName(t)), `${JSON.stringify(t, null, 2)}\n`, { flag: 'wx' });
  }
}
console.log(quests.length ? `${quests.length} draft(s)${argv.includes('--write') ? ' written' : '; add --write to write them'}.` : 'Nothing new to draft.');
