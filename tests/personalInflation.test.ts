import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PriceGroup } from '../src/utils/priceGroups.ts';
import { officialShares, personalRate } from '../src/utils/personalInflation.ts';

const G = (id: string, rates: Array<[string, number]>, weightPct?: number): PriceGroup => ({ id, label: id, rates: rates.map(([period, value]) => ({ period, value })), ...(weightPct !== undefined ? { weightPct } : {}) });

test('PY2 personalRate: shares × group rates, push per group, gap to headline', () => {
  const groups = [G('food', [['2026-09', 4], ['2026-10', 5]], 20), G('energy', [['2026-09', 10], ['2026-10', 8]], 10), G('rest', [['2026-09', 2], ['2026-10', 2]], 70)];
  const r = personalRate(groups, [{ period: '2026-10', value: 3 }], { food: 40, energy: 20, rest: 40 });
  assert.ok(r.ok);
  assert.equal(r.period, '2026-10');
  assert.equal(r.ratePct, 4.4); // 0.4×5 + 0.2×8 + 0.4×2
  assert.equal(r.gapPts, 1.4);
  assert.equal(r.pushes[0].id, 'food');
  assert.equal(r.pushes[0].push, 2);
  assert.equal(r.scaled, false);
  assert.equal(r.officialPct, 3.2); // 0.2×5 + 0.1×8 + 0.7×2
  assert.equal(r.months.length, 2);
});

test('PY2 personalRate scales shares, skips empty groups, and is Missing for a spent-in group with no figures', () => {
  const groups = [G('a', [['2026-10', 2]]), G('b', [['2026-10', 4]]), G('c', [])];
  const r = personalRate(groups, [], { a: 1, b: 1, c: 0 });
  assert.ok(r.ok);
  assert.equal(r.ratePct, 3);
  assert.equal(r.scaled, true);
  assert.equal(r.officialPct, undefined);
  const miss = personalRate(groups, [], { a: 1, c: 1 }, { c: 'Clothing' });
  assert.equal(miss.ok, false);
  assert.match((miss as { reason: string }).reason, /Clothing/);
  assert.equal(personalRate(groups, [], {}).ok, false);
});

test('PY2 personalRate uses the newest month every spent-in group has', () => {
  const groups = [G('a', [['2026-09', 1], ['2026-10', 9]]), G('b', [['2026-09', 3]])];
  const r = personalRate(groups, [], { a: 50, b: 50 });
  assert.ok(r.ok);
  assert.equal(r.period, '2026-09');
  assert.equal(r.ratePct, 2);
});

test('PY2 officialShares only when every group has a weight', () => {
  assert.deepEqual(officialShares([G('a', [], 30), G('b', [], 10)]), { a: 75, b: 25 });
  assert.equal(officialShares([G('a', [], 30), G('b', [])]), null);
});
