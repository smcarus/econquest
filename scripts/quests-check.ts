/**
 * Checks every Quest file (npm run quests:check). Fails with the exact problem for each file.
 *
 *   npm run quests:check            check quests/ and quests/drafts/
 *   npm run quests:check -- --add   also list approved Quest files that are not yet in
 *                                   quests/manifest.json (new files only; an existing entry is
 *                                   never changed, so an edited approved Quest still fails)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questSettlesOn, questHorizon, HORIZON_LABEL, type Quest } from '../src/utils/quests.ts';
import { describeRule } from '../src/utils/questRules.ts';
import { checkQuests, readManifest, readQuestFiles, writeManifest } from '../src/utils/questStore.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');

if (process.argv.includes('--add')) {
  const manifest = readManifest(dir);
  const added: string[] = [];
  for (const f of readQuestFiles(dir)) {
    if (f.approved && !manifest[f.name] && !f.parseError) {
      manifest[f.name] = f.hash;
      added.push(f.name);
    }
  }
  if (added.length) writeManifest(dir, manifest);
  console.log(added.length ? `Added to quests/manifest.json: ${added.join(', ')}` : 'Nothing new to add to quests/manifest.json');
}

const result = checkQuests(dir);
for (const f of result.files) {
  const p = result.problems[f.rel];
  if (p) {
    console.log(`FAIL ${f.rel}`);
    for (const line of p) console.log(`     - ${line}`);
    continue;
  }
  const q = f.json as Quest;
  const how = q.type === 'forecast' ? describeRule(q.rule) : q.type;
  console.log(`ok   ${f.rel} [${f.approved ? 'approved' : 'draft'}, ${q.type}, ${HORIZON_LABEL[questHorizon(q)].toLowerCase()}, due ${questSettlesOn(q)}] ${how}`);
}
for (const line of result.problems.collection || []) console.log(`FAIL ${line}`);
console.log(result.ok ? `\n${result.files.length} Quest file(s) pass.` : '\nQuest check failed.');
process.exit(result.ok ? 0 : 1);
