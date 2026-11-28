import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { packProblems, packText } from '../src/utils/questPacks';
import { checkPacks, checkQuests, loadPacks, loadQuests } from '../src/utils/questStore';

const ids = new Set(['a-quest', 'b-quest']);
const good = { id: 'starter', title: { en: 'Starter pack', es: 'Paquete de inicio' }, summary: { en: 'Problems to work through.' }, level: 'intro', groups: [{ id: 'one', title: { en: 'One' }, quests: ['a-quest', 'b-quest'] }] };

test('a pack lists Quests on file, once each, with English titles', () => {
  assert.deepEqual(packProblems(good, 'starter.json', ids), []);
  assert.match(packProblems(good, 'other.json', ids).join(), /file name must be starter.json/);
  assert.match(packProblems({ ...good, groups: [{ id: 'one', title: { en: 'One' }, quests: ['a-quest', 'a-quest'] }] }, 'starter.json', ids).join(), /twice/);
  assert.match(packProblems({ ...good, groups: [{ id: 'one', title: { en: 'One' }, quests: ['nope'] }] }, 'starter.json', ids).join(), /not a Quest on file/);
  assert.match(packProblems({ ...good, title: { es: 'Solo español' } }, 'starter.json', ids).join(), /English is required/);
  assert.match(packProblems({ ...good, title: { en: 'x', de: 'y' } }, 'starter.json', ids).join(), /not a language/);
  assert.match(packProblems({ ...good, extra: 1 }, 'starter.json', ids).join(), /not a pack field/);
  assert.match(packProblems({ ...good, level: 'expert' }, 'starter.json', ids).join(), /level: one of intro, intermediate, advanced/);
  assert.match(packProblems({ ...good, level: undefined }, 'starter.json', ids).join(), /level/);
  assert.equal(packText(good.title, 'es'), 'Paquete de inicio');
  assert.equal(packText(good.title, 'fr'), 'Starter pack');
});

test('the starter pack in quests/packs passes, covers the six topics and only Quests on file', () => {
  const dir = path.join(process.cwd(), 'quests');
  assert.deepEqual(checkPacks(dir), {});
  assert.ok(checkQuests(dir).ok);
  const packs = loadPacks(dir, loadQuests(dir));
  const starter = packs.find((p) => p.id === 'starter');
  assert.ok(starter);
  assert.deepEqual(starter!.groups.map((g) => g.id), ['start', 'inflation', 'debt', 'currency', 'growth', 'trade', 'lower-income']);
  const all = starter!.groups.flatMap((g) => g.quests);
  assert.ok(all.length >= 20, `${all.length} Quests`);
  for (const g of starter!.groups) for (const l of ['es', 'fr', 'pt'] as const) assert.ok(g.title[l], `${g.id} has ${l}`);
  for (const l of ['es', 'fr', 'pt'] as const) assert.ok(starter!.title[l] && starter!.summary[l]);
  // No figures are typed into the pack's own text.
  assert.doesNotMatch(JSON.stringify([starter!.title, starter!.summary, starter!.groups.map((g) => g.title)]), /\d/);
});

test('a pack drops Quests that are not served and groups left empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'packs-'));
  fs.mkdirSync(path.join(dir, 'packs'));
  fs.writeFileSync(path.join(dir, 'packs', 'starter.json'), JSON.stringify(good));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ files: {} }));
  // No Quest files at all: the pack fails its check and is not served.
  assert.match(checkPacks(dir)['quests/packs/starter.json']!.join(), /not a Quest on file/);
  assert.deepEqual(loadPacks(dir, []), []);
});
