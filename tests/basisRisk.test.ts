import test from 'node:test';
import assert from 'node:assert/strict';
import { basisRisk, basisSentence, spearman } from '../src/utils/basisRisk.ts';

test('spearman: perfect, reversed, ties averaged', () => {
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.ok(Math.abs(spearman([1, 2, 2, 3], [1, 2, 3, 4]) - 0.9487) < 1e-3);
});

test('basisRisk: identical series hit every bad year; a mismatched year shows as missed and as a payout with no bad year', () => {
  const cover = Array.from({ length: 20 }, (_, i) => ({ year: 2001 + i, value: 100 + i * 10 })); // 100..290
  const d = { direction: 'below' as const, trigger: 140, exit: 100 };
  const same = basisRisk(cover, cover, d)!;
  assert.equal(same.seasons, 20);
  assert.equal(same.badYears, 4, 'worst 1 in 5 of 20');
  assert.equal(same.hits, 4);
  assert.equal(same.missed, 0);
  assert.equal(same.paidNoBad, 0);
  assert.equal(same.spearman, 1);
  assert.equal(same.payoutGapPct, 0);
  assert.equal(same.otherTrigger, 140);
  // Swap one year: 2001 (driest for the cover) is wet in the other series, 2020 is dry there.
  const other = cover.map((s) => ({ ...s, value: s.year === 2001 ? 290 : s.year === 2020 ? 100 : s.value }));
  const b = basisRisk(cover, other, d)!;
  assert.equal(b.missed, 1, '2020 was bad in the other series but the cover did not pay');
  assert.equal(b.paidNoBad, 1, '2001 paid with no bad year');
  assert.equal(b.hitRatePct, 75);
  assert.ok(b.spearman < 1 && b.payoutGapPct > 0);
  assert.match(basisSentence(b, 'rainfall, country average'), /of the 4 worst seasons there, the cover paid in 3 and missed 1; it paid in 1 other seasons/);
  assert.equal(basisRisk(cover.slice(0, 9), cover, d), null, 'too few shared seasons');
  assert.equal(basisRisk(cover, other.map((s) => ({ ...s, year: s.year + 100 })), d), null, 'no shared years');
});
