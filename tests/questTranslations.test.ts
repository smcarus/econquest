import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { DebateQuest, ForecastQuest } from '../src/utils/quests';
import { numbersIn, questTextIn, questTitleIn, translationFileName, translationProblems, type QuestTranslation } from '../src/utils/questTranslations';
import { checkQuests, loadQuests, loadTranslations } from '../src/utils/questStore';

const forecast: ForecastQuest = {
  id: 'tur-policy-test',
  version: 1,
  type: 'forecast',
  title: 'Will the rate be lower on 30 June 2027?',
  summary: 'Give the probability that the rate on 30 June 2027 is lower.',
  countries: ['TUR'],
  topics: ['monetary'],
  region: 'EMEA',
  registeredOn: '2026-11-07',
  opensOn: '2026-12-01',
  closesOn: '2026-12-31',
  author: 'smcarus',
  knownLimits: ['BIS daily data can lag a decision.'],
  rule: { kind: 'direction', ref: { country: 'TUR', series: 'policy_rate' }, from: { on: '2026-12-31' }, to: { on: '2027-06-30' }, op: 'lower' } as never,
  fallback: 'unresolvable',
};

const es: QuestTranslation = {
  quest: 'tur-policy-test',
  version: 1,
  lang: 'es',
  translator: 'smcarus',
  title: '¿Estará el tipo más bajo el 30 de junio de 2027?',
  summary: 'Indique la probabilidad de que el tipo el 30 de junio de 2027 sea más bajo.',
  knownLimits: ['Los datos diarios del BPI pueden ir por detrás de una decisión.'],
};

test('a translation that matches its Quest passes', () => {
  assert.deepEqual(translationProblems(es, forecast, 'tur-policy-test.es.json'), []);
  assert.equal(translationFileName(es), 'tur-policy-test.es.json');
  assert.equal(translationFileName({ ...es, version: 2, lang: 'fr' }), 'tur-policy-test.v2.fr.json');
});

test('a translation may not add a figure the English does not have', () => {
  const p = translationProblems({ ...es, summary: 'El tipo bajará a 40 el 30 de junio de 2027.' }, forecast);
  assert.ok(p.some((x) => x.startsWith('summary:') && x.includes('40')), p.join('\n'));
  assert.deepEqual(numbersIn('3,5 y 2027'), ['3.5', '2027']);
});

test('lists line up with the English, and fields must exist in the Quest', () => {
  assert.ok(translationProblems({ ...es, knownLimits: [] }, forecast).some((x) => x.startsWith('knownLimits:')));
  assert.ok(translationProblems({ ...es, positions: ['a', 'b'] }, forecast).some((x) => x.startsWith('positions:')));
  assert.ok(translationProblems({ ...es, extra: 1 } as never, forecast).some((x) => x.startsWith('extra:')));
  assert.ok(translationProblems({ ...es, lang: 'de' } as never, forecast).some((x) => x.startsWith('lang:')));
  assert.ok(translationProblems(es, undefined).some((x) => x.startsWith('quest:')));
  assert.ok(translationProblems(es, forecast, 'wrong.json').some((x) => x.startsWith('file name:')));
});

test('a debate translation carries one line per position', () => {
  const debate: DebateQuest = { ...(forecast as never as DebateQuest), type: 'debate', positions: ['Yes', 'No'], settlesOn: '2027-02-01' };
  assert.ok(translationProblems(es, debate).some((x) => x.startsWith('positions:')));
  assert.deepEqual(translationProblems({ ...es, positions: ['Sí', 'No'] }, debate), []);
});

test('the text in the chosen language falls back to English', () => {
  const map = { 'tur-policy-test@1': { es: { title: es.title, summary: es.summary, knownLimits: es.knownLimits, translator: 'smcarus' } } };
  const inEs = questTextIn(forecast, 'es', map);
  assert.equal(inEs.title, es.title);
  assert.equal(inEs.translated, true);
  const inFr = questTextIn(forecast, 'fr', map);
  assert.equal(inFr.title, forecast.title);
  assert.equal(inFr.translated, false);
  assert.equal(questTextIn(forecast, 'en', map).title, forecast.title);
  assert.equal(questTitleIn('tur-policy-test', 'English', 'es', map), es.title);
  assert.equal(questTitleIn('other', 'English', 'es', map), 'English');
});

test('the repository translations all pass and cover every draft in es, fr and pt', () => {
  const dir = path.join(process.cwd(), 'quests');
  const r = checkQuests(dir);
  assert.ok(r.ok, JSON.stringify(r.problems, null, 2));
  const loaded = loadQuests(dir);
  const map = loadTranslations(dir, loaded);
  for (const { quest } of loaded) for (const lang of ['es', 'fr', 'pt'] as const) assert.ok(map[`${quest.id}@${quest.version}`]?.[lang], `${quest.id} has no ${lang}`);
});

test('a broken translation fails the Quest check and is not served', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qt-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.mkdirSync(path.join(dir, 'translations'));
  fs.writeFileSync(path.join(dir, 'drafts', 'tur-policy-test.json'), JSON.stringify(forecast));
  fs.writeFileSync(path.join(dir, 'translations', 'tur-policy-test.es.json'), JSON.stringify({ ...es, title: 'Bajará a 9' }));
  const r = checkQuests(dir, {});
  assert.equal(r.ok, false);
  assert.ok(r.problems['quests/translations/tur-policy-test.es.json']);
  assert.deepEqual(loadTranslations(dir, loadQuests(dir)), {});
});
