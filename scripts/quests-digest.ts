/**
 * The week's Quests digest as a Discussions post (npm run quests:digest): what closes and opens in
 * the next 7 days, results recorded in the last 7, and results still due. Prints Markdown to paste.
 *
 *   npm run quests:digest                    for today
 *   npm run quests:digest -- --date 2027-01-04
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { loadResolutions, resolutionsPath } from '../src/utils/questResolveStore.ts';
import { digestMarkdown, questDigest } from '../src/utils/questGenerator.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const i = process.argv.indexOf('--date');
const today = i === -1 ? new Date().toISOString().slice(0, 10) : process.argv[i + 1];
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error('--date YYYY-MM-DD');
  process.exit(1);
}
process.stdout.write(digestMarkdown(questDigest(loadQuests(dir), loadResolutions(resolutionsPath(dir)).lines, today)));
