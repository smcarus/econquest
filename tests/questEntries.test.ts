import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { brier, directionBaseRate, firstOnOrAfter, scoreLevel, scoreProbability, type Point } from '../src/utils/questScoring';
import { classTable, countedEntries, entryProblems, practiceWindow, scoreEntry, scorePractice, type QuestEntry } from '../src/utils/questEntries';
import { appendEntry, entryHash, loadEntries } from '../src/utils/questEntryStore';
import type { ForecastQuest } from '../src/utils/quests';

const quest: ForecastQuest = {
  id: 'tur-test', version: 1, type: 'forecast', title: 'T', summary: 'S', countries: ['TUR'], topics: ['monetary'], region: 'EMEA',
  registeredOn: '2026-01-01', opensOn: '2026-01-01', closesOn: '2026-03-01', author: 'smcarus', knownLimits: [],
  rule: { kind: 'direction', ref: { country: 'TUR', series: 'policy_rate' }, from: 'closesOn', to: { on: '2026-06-01' }, op: 'lower' },
  fallback: 'unresolvable',
};
const entry = (over: Partial<QuestEntry> = {}): QuestEntry => ({ id: 'e1', questId: 'tur-test', questVersion: 1, questHash: 'h', author: 'a', loggedAt: '2026-02-01T10:00:00Z', answer: { probability: 0.7 }, hash: 'x', ...over });

/** Daily points from 2020-01-01, value falls by 0.01 a day after 2026-03-01 and rises before. */
function series(): Point[] {
  const out: Point[] = [];
  for (let d = Date.parse('2020-01-01T00:00:00Z'); d <= Date.parse('2026-07-01T00:00:00Z'); d += 86_400_000) {
    const date = new Date(d).toISOString().slice(0, 10);
    const peak = 10 + (Date.parse('2026-03-01T00:00:00Z') - Date.parse('2020-01-01T00:00:00Z')) / 86_400_000 / 100;
    out.push({ date, value: date <= '2026-03-01' ? 10 + (d - Date.parse('2020-01-01T00:00:00Z')) / 86_400_000 / 100 : peak - (d - Date.parse('2026-03-01T00:00:00Z')) / 86_400_000 / 100 });
  }
  return out;
}

test('scores: Brier, base-rate skill, absolute error against no change', () => {
  assert.ok(Math.abs(brier(0.7, true) - 0.09) < 1e-12);
  const s = scoreProbability(0.7, true, 0.5);
  assert.deepEqual([s.brier, s.baseBrier, s.skill], [0.09, 0.25, 0.16]);
  assert.equal(scoreProbability(0.7, true, null).skill, null);
  const l = scoreLevel(10, 12, 9);
  assert.deepEqual([l.error, l.noChangeError, l.skill], [2, 3, 1]);
});

test('first value on or after a date, and the base rate uses only past, non-overlapping windows', () => {
  const pts = series();
  assert.equal(firstOnOrAfter(pts, '2026-03-01')?.date, '2026-03-01');
  assert.equal(firstOnOrAfter(pts, '2030-01-01'), null);
  const up = directionBaseRate(pts, 90, 'higher', '2026-03-01');
  assert.ok(up && up.rate === 1 && up.windows >= 30);
  assert.equal(directionBaseRate(pts.slice(0, 40), 90, 'higher', '2026-03-01'), null);
});

test('only valid entries, while open, in the form the Quest asks for', () => {
  assert.deepEqual(entryProblems({ answer: { probability: 0.4 } }, quest, '2026-02-01'), []);
  assert.ok(entryProblems({ answer: { probability: 1.4 } }, quest, '2026-02-01').length);
  assert.ok(entryProblems({ answer: { level: 3 } }, quest, '2026-02-01').length);
  assert.match(entryProblems({ answer: { probability: 0.4 } }, quest, '2026-03-02')[0], /closed/);
  assert.ok(entryProblems({ answer: { probability: 0.4 }, group: 'bad code!' }, quest, '2026-02-01').length);
  const lvl = { ...quest, rule: { kind: 'level', ref: quest.rule.ref, at: { on: '2026-06-01' } } } as ForecastQuest;
  assert.deepEqual(entryProblems({ answer: { level: 41.5 } }, lvl, '2026-02-01'), []);
});

test('the last entry by the close date counts for each person; earlier and late ones do not', () => {
  const es = [entry({ id: '1', loggedAt: '2026-02-01T00:00:00Z' }), entry({ id: '2', loggedAt: '2026-02-20T00:00:00Z' }), entry({ id: '3', loggedAt: '2026-03-02T00:00:00Z' }), entry({ id: '4', author: 'b' })];
  assert.deepEqual(countedEntries(es, quest).map((e) => e.id).sort(), ['2', '4']);
});

test('an entry is scored from the feed after the date, with the base rate from before the close', () => {
  const pts = series();
  assert.equal(scoreEntry(entry(), quest, () => pts, '2026-02-15').status, 'open');
  assert.equal(scoreEntry(entry(), quest, () => pts, '2026-05-01').status, 'waiting');
  const s = scoreEntry(entry(), quest, () => pts, '2026-06-15');
  assert.equal(s.status, 'settled');
  if (s.status === 'settled' && s.answer === 'probability') {
    assert.equal(s.happened, true);
    assert.equal(s.baseRate, 0);
    assert.equal(s.brier, 0.09);
    assert.equal(s.skill, 0.91);
  }
  assert.equal(scoreEntry(entry(), quest, () => ({ reason: 'BIS did not answer' }), '2026-06-15').status, 'unresolvable');
  const annual = { ...quest, rule: { kind: 'level', ref: { country: 'IND', series: 'cpi_imf' }, at: { on: '2026-05-01', period: '2025' } } } as ForecastQuest;
  assert.equal(scoreEntry(entry({ answer: { level: 4 } }), annual, () => pts, '2026-06-15').status, 'resolver');
});

test('the fallback series decides when the main one has no data', () => {
  const pts = series();
  const q = { ...quest, fallback: { rule: { ...quest.rule, ref: { country: 'TUR', series: 'fx_per_usd' } } } } as ForecastQuest;
  const s = scoreEntry(entry(), q, (rule) => (rule.ref.series === 'policy_rate' ? { reason: 'down' } : pts), '2026-06-15');
  assert.equal(s.status === 'settled' && s.via, 'fallback');
});

test('class table ranks by skill and counts entries', () => {
  const pts = series();
  const rows = classTable([
    { entry: entry({ author: 'a', answer: { probability: 0.9 } }), score: scoreEntry(entry({ answer: { probability: 0.9 } }), quest, () => pts, '2026-06-15') },
    { entry: entry({ author: 'b', answer: { probability: 0.2 } }), score: scoreEntry(entry({ answer: { probability: 0.2 } }), quest, () => pts, '2026-06-15') },
  ]);
  assert.deepEqual(rows.map((r) => r.author), ['a', 'b']);
  assert.equal(rows[0].settled, 1);
});

test('practice picks a past window and scores it without look-ahead in the base rate', () => {
  const pts = series();
  const w = practiceWindow(quest.rule, quest.closesOn, pts, '2026-07-01', () => 0.5);
  assert.ok(!('reason' in w));
  if (!('reason' in w)) {
    assert.equal(w.days, 92);
    assert.ok(w.endDate < '2026-07-01');
    const r = scorePractice('lower', 0.3, w.start, w.endDate, w.days, pts);
    assert.ok(!('reason' in r));
  }
  const lvl = { kind: 'level', ref: quest.rule.ref, at: { on: '2026-06-01' } } as const;
  assert.ok('reason' in practiceWindow(lvl, quest.closesOn, pts, '2026-07-01', () => 0.5));
});

test('entry store appends hashed lines and spots a changed one', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qe-')), 'local', 'quest-entries.jsonl');
  const { hash: _h, ...rec } = entry();
  const saved = appendEntry(file, rec);
  assert.equal(saved.hash, entryHash(rec));
  fs.appendFileSync(file, `${JSON.stringify({ ...saved, answer: { probability: 0.1 } })}\nnot json\n`);
  const { entries, badLines } = loadEntries(file);
  assert.deepEqual(entries.map((e) => e.hashOk), [true, false]);
  assert.equal(badLines, 1);
});
