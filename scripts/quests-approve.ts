/**
 * Approves draft Quests in a batch (npm run quests:approve): moves each from quests/drafts/ to
 * quests/, sets approvedBy, and records its SHA-256 in quests/manifest.json. From then on the file is
 * fixed. Commit the result in a pull request.
 *
 *   npm run quests:approve -- --by <login> <id> [<id> ...]
 *
 * Refuses a draft that fails the checker or whose entries have already closed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, readQuestFiles, writeManifest } from '../src/utils/questStore.ts';
import { questFileName, questProblems, type Quest } from '../src/utils/quests.ts';
import { questFileText } from '../src/utils/questGenerator.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const argv = process.argv.slice(2);
const byAt = argv.indexOf('--by');
const by = byAt === -1 ? undefined : argv[byAt + 1];
const ids = argv.filter((a, i) => !a.startsWith('--') && i !== byAt + 1);
if (!by || !ids.length) {
  console.error('npm run quests:approve -- --by <your GitHub login> <id> [<id> ...]');
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const files = readQuestFiles(dir);
const manifest = readManifest(dir);
let bad = 0;
for (const id of ids) {
  const f = files.find((x) => !x.approved && (x.json as { id?: string } | null)?.id === id);
  if (!f) {
    console.log(`skip ${id}: no draft with that id in quests/drafts/`);
    bad++;
    continue;
  }
  const q = { ...(f.json as Quest), approvedBy: by } as Quest;
  const name = questFileName(q);
  const problems = questProblems(q, { approved: true, fileName: name });
  if (q.closesOn <= today) problems.push(`entries close ${q.closesOn}, which is not in the future`);
  if (files.some((x) => x.approved && x.name === name)) problems.push(`quests/${name} already exists; an approved Quest is changed only by a new version`);
  if (problems.length) {
    console.log(`skip ${id}: ${problems.join('; ')}`);
    bad++;
    continue;
  }
  const text = questFileText(q);
  fs.writeFileSync(path.join(dir, name), text, { flag: 'wx' });
  fs.unlinkSync(path.join(dir, 'drafts', f.name));
  manifest[name] = readQuestFiles(dir).find((x) => x.approved && x.name === name)!.hash;
  console.log(`approved quests/${name}`);
}
writeManifest(dir, manifest);
console.log(`${ids.length - bad} approved, ${bad} skipped. Run npm run quests:check, then commit quests/ in a pull request.`);
process.exit(bad ? 1 : 0);
