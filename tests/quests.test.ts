import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { collectionProblems, questFileName, questHorizon, questProblems, questSettlesOn, questStatus, type ForecastQuest, type Quest } from '../src/utils/quests';
import { describeRule, evaluateRule, ruleProblems, type QuestRule } from '../src/utils/questRules';
import { seriesProblem } from '../src/utils/questSeries';
import { checkQuests, readQuestFiles, writeManifest } from '../src/utils/questStore';

const forecast: ForecastQuest = {
  id: 'tur-policy-test',
  version: 1,
  type: 'forecast',
  title: 'Will the rate be lower?',
  summary: 'A test Quest.',
  countries: ['TUR'],
  topics: ['monetary'],
  region: 'EMEA',
  registeredOn: '2026-11-07',
  opensOn: '2026-12-01',
  closesOn: '2026-12-31',
  author: 'smcarus',
  knownLimits: [],
  rule: { kind: 'direction', ref: { country: 'TUR', series: 'policy_rate' }, from: 'closesOn', to: { on: '2027-06-30' }, op: 'lower' },
  fallback: 'unresolvable',
};

test('a valid draft forecast passes, and needs an approver only in quests/', () => {
  assert.deepEqual(questProblems(forecast, { approved: false, fileName: 'tur-policy-test.json' }), []);
  assert.ok(questProblems(forecast, { approved: true }).some((p) => p.startsWith('approvedBy')));
  assert.deepEqual(questProblems({ ...forecast, approvedBy: 'smcarus' }, { approved: true }), []);
  assert.ok(questProblems({ ...forecast, approvedBy: 'smcarus' }, { approved: false }).some((p) => p.startsWith('approvedBy')));
});

test('file name follows id and version', () => {
  assert.equal(questFileName({ id: 'a-b', version: 1 }), 'a-b.json');
  assert.equal(questFileName({ id: 'a-b', version: 3 }), 'a-b.v3.json');
  assert.ok(questProblems(forecast, { approved: false, fileName: 'other.json' }).some((p) => p.startsWith('file name')));
});

test('dates must run registered <= opens < closes < settle', () => {
  assert.ok(questProblems({ ...forecast, opensOn: '2026-11-01' }, { approved: false }).some((p) => p.startsWith('opensOn')));
  assert.ok(questProblems({ ...forecast, closesOn: '2026-12-01' }, { approved: false }).some((p) => p.startsWith('closesOn')));
  const early = { ...forecast, rule: { ...forecast.rule, to: { on: '2026-12-15' } } as QuestRule };
  assert.ok(questProblems(early, { approved: false }).some((p) => p.includes('after the day entries close')));
});

test('only series whose licence allows free sharing can settle a Quest', () => {
  assert.equal(seriesProblem('TUR', 'policy_rate'), null);
  assert.equal(seriesProblem('WLD', 'commodity_eia_rbrte'), null);
  assert.match(seriesProblem('TUR', 'yield_10y') || '', /cannot settle/);
  assert.match(seriesProblem('EGY', 'policy_rate') || '', /does not cover EGY/);
  assert.match(seriesProblem('USA', 'fx_per_usd') || '', /does not cover USA/);
  assert.match(seriesProblem('TUR', 'commodity_eia_rbrte') || '', /world series/);
});

test('annual series need a period that can be published by the date', () => {
  const r = { kind: 'level', ref: { country: 'IND', series: 'cpi_imf' }, at: { on: '2027-05-01' } };
  assert.ok(ruleProblems(r).some((p) => p.includes('needs the year')));
  assert.deepEqual(ruleProblems({ ...r, at: { on: '2027-05-01', period: '2026' } }), []);
  assert.ok(ruleProblems({ ...r, at: { on: '2027-05-01', period: '2027' } }).some((p) => p.includes('cannot be published')));
  assert.ok(ruleProblems({ kind: 'direction', ref: r.ref, from: 'closesOn', to: { on: '2027-05-01', period: '2026' }, op: 'higher' }).some((p) => p.includes('closesOn')));
  assert.ok(ruleProblems({ kind: 'level', ref: { country: 'TUR', series: 'policy_rate' }, at: { on: '2027-01-01', period: '2026' } }).some((p) => p.includes('only annual')));
});

test('rule kinds evaluate from readings, and a missing reading is Unresolvable', () => {
  const values: Record<string, number> = { '2026-12-31': 40, '2027-06-30': 35 };
  const read = (_ref: unknown, o: { on: string }) => (o.on in values ? { value: values[o.on], date: o.on } : { reason: 'BIS did not answer' });
  const out = evaluateRule(forecast.rule, '2026-12-31', read);
  assert.equal(out.status, 'settled');
  assert.equal(out.status === 'settled' && out.answer === 'probability' && out.happened, true);
  const lvl = evaluateRule({ kind: 'level', ref: forecast.rule.ref, at: { on: '2027-06-30' } }, '2026-12-31', read);
  assert.equal(lvl.status === 'settled' && lvl.answer === 'level' && lvl.value, 35);
  const thr = evaluateRule({ kind: 'threshold', ref: forecast.rule.ref, at: { on: '2027-06-30' }, op: 'above', value: 35 }, '2026-12-31', read);
  assert.equal(thr.status === 'settled' && thr.answer === 'probability' && thr.happened, false);
  const btw = evaluateRule({ kind: 'between', ref: forecast.rule.ref, at: { on: '2027-06-30' }, low: 30, high: 35 }, '2026-12-31', read);
  assert.equal(btw.status === 'settled' && btw.answer === 'probability' && btw.happened, true);
  const miss = evaluateRule({ kind: 'level', ref: forecast.rule.ref, at: { on: '2027-07-01' } }, '2026-12-31', read);
  assert.deepEqual(miss, { status: 'unresolvable', reason: 'BIS did not answer' });
});

test('describeRule reads as a sentence', () => {
  assert.match(describeRule(forecast.rule), /^Yes if Central bank policy rate \(TUR\) on the first value published on or after 2027-06-30 is lower than/);
});

test('horizon, settle date and status come from the dates', () => {
  assert.equal(questSettlesOn(forecast), '2027-06-30');
  assert.equal(questHorizon(forecast), 'year');
  assert.equal(questStatus(forecast, '2026-12-05'), 'draft');
  const a = { ...forecast, approvedBy: 'smcarus' };
  assert.equal(questStatus(a, '2026-11-20'), 'upcoming');
  assert.equal(questStatus(a, '2026-12-31'), 'open');
  assert.equal(questStatus(a, '2027-01-01'), 'closed');
  assert.equal(questStatus(a, '2027-06-30'), 'due');
  const tut = { ...forecast, tutorial: true };
  assert.ok(questProblems(tut, { approved: false }).some((p) => p.startsWith('tutorial')));
});

test('other types: debate positions, replication tolerance, settle after close', () => {
  const base = { ...forecast } as Partial<ForecastQuest>;
  delete base.rule;
  delete base.fallback;
  const debate = { ...base, type: 'debate', positions: ['A', 'B'], settlesOn: '2027-01-15' } as Quest;
  assert.deepEqual(questProblems(debate, { approved: false }), []);
  assert.ok(questProblems({ ...debate, positions: ['A'] } as Quest, { approved: false }).some((p) => p.startsWith('positions')));
  assert.ok(questProblems({ ...debate, positions: ['A', 'a'] } as Quest, { approved: false }).some((p) => p.includes('differ')));
  assert.ok(questProblems({ ...debate, settlesOn: '2026-12-01' } as Quest, { approved: false }).some((p) => p.startsWith('settlesOn')));
  const rep = { ...base, type: 'replication', tool: 'exercises', target: 'x', tolerance: 0, settlesOn: '2027-01-15' } as Quest;
  assert.ok(questProblems(rep, { approved: false }).some((p) => p.startsWith('tolerance')));
});

test('an approved Quest is fixed by the manifest, and never deleted', () => {
  const f = { name: 'a.json', approved: true, json: forecast, hash: 'h1' };
  assert.deepEqual(collectionProblems([f], { 'a.json': 'h1' }), []);
  assert.match(collectionProblems([f], {})[0], /not in quests\/manifest.json/);
  assert.match(collectionProblems([{ ...f, hash: 'h2' }], { 'a.json': 'h1' })[0], /changed after it was approved/);
  assert.match(collectionProblems([], { 'a.json': 'h1' })[0], /missing/);
  assert.match(collectionProblems([f, { ...f, name: 'b.json', approved: false }], { 'a.json': 'h1' })[0], /same id and version/);
});

test('store reads approved files and drafts and checks them together', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quests-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  const approved = { ...forecast, approvedBy: 'smcarus' };
  fs.writeFileSync(path.join(dir, 'tur-policy-test.json'), JSON.stringify(approved));
  fs.writeFileSync(path.join(dir, 'drafts', 'bad.json'), '{not json');
  const files = readQuestFiles(dir);
  assert.equal(files.length, 2);
  let r = checkQuests(dir);
  assert.equal(r.ok, false);
  assert.ok(r.problems['quests/drafts/bad.json'][0].startsWith('not valid JSON'));
  assert.ok(r.problems.collection[0].includes('not in quests/manifest.json'));
  fs.rmSync(path.join(dir, 'drafts', 'bad.json'));
  writeManifest(dir, { 'tur-policy-test.json': files[0].hash });
  r = checkQuests(dir);
  assert.equal(r.ok, true, JSON.stringify(r.problems));
});

test('every Quest file in the repo passes the check', () => {
  const r = checkQuests(path.join(process.cwd(), 'quests'));
  assert.equal(r.ok, true, JSON.stringify(r.problems, null, 2));
  assert.ok(r.files.length >= 10, 'the seed set has at least 10 Quests');
});
