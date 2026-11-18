/** Historical context (utils/historicalContext.ts): synthetic series. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextSentence, historicalContext, yearBefore } from '../src/utils/historicalContext.ts';

const yearly = (vals: number[], start = 2000) => vals.map((value, i) => ({ date: String(start + i), value }));

test('year before keeps the date form', () => {
  assert.equal(yearBefore('2026-09'), '2025-09');
  assert.equal(yearBefore('2026-Q3'), '2025-Q3');
  assert.equal(yearBefore('2026'), '2025');
});

test('record high, and highest since a date', () => {
  const top = historicalContext(yearly([1, 2, 3, 2, 5]), 'annual')!;
  assert.deepEqual(top.record, { kind: 'highest', since: null });
  assert.equal(top.percentile, 100);
  assert.deepEqual(top.yearAgo, { date: '2003', value: 2, change: 3 });
  const since = historicalContext(yearly([9, 1, 2, 3, 2, 1, 2, 3, 4, 8]), 'annual')!;
  assert.deepEqual(since.record, { kind: 'highest', since: '2000' });
  assert.equal(contextSentence('Inflation', '%', since), 'Inflation was 8% in 2009, the highest since 2000, higher than or equal to 90% of the 10 observations since 2000, up 4 points on 2008.');
});

test('a "since" only a step back is not reported; projections are left out', () => {
  const c = historicalContext(yearly([5, 4, 6, 4.5]), 'annual')!;
  assert.equal(c.record, null);
  const p = historicalContext([...yearly([1, 2, 3]), { date: '2003', value: 99, note: 'IMF projection' }], 'annual')!;
  assert.equal(p.date, '2002');
  assert.equal(historicalContext(yearly([1]), 'annual'), null);
});

test('units: share of GDP changes are points', () => {
  const c = historicalContext(yearly([50, 55, 60, 70]), 'annual')!;
  assert.match(contextSentence('Government debt', '% of GDP', c), /was 70% of GDP in 2003, the highest on record \(since 2000\).*up 10 points on 2002/);
});

test('a daily date reads "on", a month or year "in"', () => {
  const c = { value: 13.75, date: '2026-11-03', first: '2024-10', observations: 26, percentile: 31 } as Parameters<typeof contextSentence>[2];
  assert.match(contextSentence('Policy rate', '%', c), /^Policy rate was 13\.75% on 2026-11-03,/);
  assert.match(contextSentence('Policy rate', '%', { ...c, date: '2026-10' }), /^Policy rate was 13\.75% in 2026-10,/);
});
