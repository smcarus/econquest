import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digestMarkdown, generateQuests, MONTHLY_POLICY, questDigest, WEEKLY_FX } from '../src/utils/questGenerator';
import { questProblems, type ForecastQuest } from '../src/utils/quests';
import type { ResolutionLine } from '../src/utils/questResolve';

test('the generator drafts weekly and monthly Quests that pass the checker and carry no figures', () => {
  const { quests, skipped } = generateQuests({ today: '2026-11-07', weeks: 2, author: 'smcarus', existing: new Set(['brent-week-2026-11-20']) });
  assert.deepEqual(skipped, []);
  assert.equal(quests.length, 2 * (1 + WEEKLY_FX.length) + MONTHLY_POLICY.length - 1);
  assert.ok(!quests.some((q) => q.id === 'brent-week-2026-11-20'), 'existing ids are skipped');
  for (const q of quests) {
    assert.deepEqual(questProblems(q, { approved: false, fileName: `${q.id}.json` }), [], q.id);
    assert.equal(q.rule.kind, 'direction');
    assert.equal((q.rule as { from: unknown }).from, 'closesOn');
    assert.ok(q.opensOn >= '2026-11-07' && q.opensOn < q.closesOn, q.id);
    assert.equal(q.approvedBy, undefined);
    assert.ok(!/\d+\.\d/.test(q.title + q.summary), `no figures in ${q.id}`);
  }
  const brent = quests.find((q) => q.id === 'brent-week-2026-11-27')!;
  assert.equal(brent.closesOn, '2026-11-27');
  assert.equal(new Date('2026-11-27T00:00:00Z').getUTCDay(), 5, 'weekly Quests close on Fridays');
  assert.deepEqual((brent.rule as { to: { on: string } }).to, { on: '2026-12-04' });
  const usa = quests.find((q) => q.id === 'usa-policy-cut-2026-12')!;
  assert.equal(usa.closesOn, '2026-11-30');
  assert.equal(usa.title, 'Will the central bank of the United States have cut its policy rate by 31 December 2026?');
  assert.equal((usa.rule as { op: string }).op, 'lower');
});

test('the digest lists what closes and opens this week and results recorded in the last 7 days', () => {
  const mk = (id: string, opensOn: string, closesOn: string, approved = true, settle = '2026-12-31') => ({ quest: { id, version: 1, type: 'forecast', title: `T ${id}`, opensOn, closesOn, approvedBy: approved ? 'smcarus' : undefined, rule: { kind: 'direction', ref: { country: 'WLD', series: 'commodity_eia_rbrte' }, from: 'closesOn', to: { on: settle }, op: 'higher' } } as unknown as ForecastQuest, approved });
  const quests = [mk('a', '2026-11-01', '2026-11-10'), mk('b', '2026-11-09', '2026-11-30'), mk('c', '2026-10-01', '2026-10-20', true, '2026-11-02'), mk('d', '2026-11-01', '2026-11-12', false)];
  const lines: ResolutionLine[] = [{ seq: 1, at: '2026-11-05T10:00:00Z', kind: 'settled', questId: 'c', questVersion: 1, questHash: 'h', via: 'rule', readings: [{ value: 1, date: '2026-10-20' }, { value: 2, date: '2026-11-02' }], outcome: { answer: 'probability', happened: true, baseRate: 0.5 }, by: 'm', prev: '', hash: '' }];
  const d = questDigest(quests, lines, '2026-11-07');
  assert.deepEqual(d.closingSoon.map((x) => x.id), ['a']);
  assert.deepEqual(d.opening.map((x) => x.id), ['b']);
  assert.deepEqual(d.settled.map((x) => x.id), ['c']);
  assert.deepEqual(d.due, []);
  const md = digestMarkdown(d);
  assert.match(md, /## Quests this week \(7 November 2026 to 14 November 2026\)/);
  assert.match(md, /\*\*T c\*\*: Yes, it happened/);
  assert.match(questDigest(quests, [], '2026-11-07').due.map((x) => x.id).join(), /c/);
});
