import test from 'node:test';
import assert from 'node:assert/strict';
import { burnAnalysis, burnSentence, designProblem, payoutFraction, peakSeason, quantile, seasonMonths, seasonValues, suggestLevels, type TriggerDesign } from '../src/utils/parametricTrigger.ts';

const monthly = (from: number, to: number, f: (y: number, m: number) => number) => {
  const pts: Array<{ date: string; value: number }> = [];
  for (let y = from; y <= to; y++) for (let m = 1; m <= 12; m++) pts.push({ date: `${y}-${String(m).padStart(2, '0')}`, value: f(y, m) });
  return pts;
};

test('seasonMonths and seasonValues: seasons across the new year belong to the year they end in; incomplete seasons left out', () => {
  assert.deepEqual(seasonMonths(11, 2), [11, 12, 1, 2]);
  assert.deepEqual(seasonMonths(3, 5), [3, 4, 5]);
  assert.equal(seasonMonths(1, 12).length, 12);
  const pts = monthly(2000, 2002, (y, m) => (y - 2000) * 100 + m);
  const sum = seasonValues(pts, 3, 5, 'sum');
  assert.deepEqual(sum.map((s) => s.year), [2000, 2001, 2002]);
  assert.equal(sum[0].value, 3 + 4 + 5);
  const wrap = seasonValues(pts, 12, 1, 'mean');
  assert.deepEqual(wrap.map((s) => s.year), [2001, 2002], '2000 has no December 1999; 2003 has no January');
  assert.equal(wrap[0].value, (12 + 101) / 2);
  const gap = seasonValues(pts.filter((p) => p.date !== '2001-04'), 3, 5, 'sum');
  assert.deepEqual(gap.map((s) => s.year), [2000, 2002]);
});

test('payoutFraction: straight line from trigger to exit, both directions', () => {
  const dry = { direction: 'below' as const, trigger: 300, exit: 200 };
  assert.equal(payoutFraction(350, dry), 0);
  assert.equal(payoutFraction(300, dry), 0);
  assert.equal(payoutFraction(250, dry), 0.5);
  assert.equal(payoutFraction(150, dry), 1);
  const hot = { direction: 'above' as const, trigger: 30, exit: 32 };
  assert.equal(payoutFraction(31.5, hot), 0.75);
  assert.equal(payoutFraction(29, hot), 0);
  assert.equal(payoutFraction(40, hot), 1);
});

test('designProblem names a design that cannot run', () => {
  const ok: TriggerDesign = { startMonth: 3, endMonth: 5, agg: 'sum', direction: 'below', trigger: 300, exit: 200, cover: 100 };
  assert.equal(designProblem(ok), null);
  assert.match(designProblem({ ...ok, exit: 300 })!, /exit must be below/);
  assert.match(designProblem({ ...ok, direction: 'above' })!, /exit must be above/);
  assert.match(designProblem({ ...ok, cover: 0 })!, /above 0/);
});

test('burnAnalysis: payouts per year, frequency, burn cost, SD, largest year, since 1991', () => {
  // 40 seasons 1981-2020: index 400 except 1984 = 250 (half), 2005 = 100 (full).
  const seasons = Array.from({ length: 40 }, (_, i) => ({ year: 1981 + i, value: 1981 + i === 1984 ? 250 : 1981 + i === 2005 ? 100 : 400 }));
  const d: TriggerDesign = { startMonth: 3, endMonth: 5, agg: 'sum', direction: 'below', trigger: 300, exit: 200, cover: 1_000_000 };
  const b = burnAnalysis(seasons, d)!;
  assert.equal(b.years, 40);
  assert.equal(b.paying, 2);
  assert.equal(b.frequencyPct, 5);
  assert.equal(b.burnPct, 3.75, '(50 + 100) / 40');
  assert.equal(b.burnAmount, 37_500);
  assert.equal(b.maxPct, 100);
  assert.equal(b.maxYear, 2005);
  const mean = 3.75;
  const sd = Math.sqrt(((50 - mean) ** 2 + (100 - mean) ** 2 + 38 * mean ** 2) / 39);
  assert.equal(b.sdPct, Math.round(sd * 100) / 100);
  assert.equal(b.recent!.from, 1991);
  assert.equal(b.recent!.years, 30);
  assert.equal(b.recent!.paying, 1);
  assert.equal(b.rows.find((r) => r.year === 1984)!.payout, 500_000);
  assert.match(burnSentence(b, d, 'rainfall, country average', 'mm'), /paid in 2 of 40 seasons 1981-2020 \(about 1 year in 20\); average yearly payout \(burn cost\) 3\.75% of the cover/);
  assert.equal(burnAnalysis(seasons.slice(0, 9), d), null, 'too few seasons');
  assert.equal(burnAnalysis(seasons, { ...d, exit: 400 }), null, 'bad design');
});

test('suggestLevels: 1 in 5 and 1 in 20 from the record; peakSeason finds the wettest run, across the new year too', () => {
  const vals = Array.from({ length: 21 }, (_, i) => ({ year: 2000 + i, value: i * 10 }));
  assert.equal(quantile([0, 10, 20], 0.5), 10);
  assert.deepEqual(suggestLevels(vals, 'below'), { trigger: 40, exit: 10 });
  assert.deepEqual(suggestLevels(vals, 'above'), { trigger: 160, exit: 190 });
  assert.equal(suggestLevels(vals.slice(0, 5), 'below'), null);
  const rainy = monthly(2000, 2004, (_y, m) => ([6, 7, 8].includes(m) ? 200 : 10));
  assert.deepEqual(peakSeason(rainy, 3), { startMonth: 6, endMonth: 8 });
  const summerSouth = monthly(2000, 2004, (_y, m) => ([12, 1, 2].includes(m) ? 200 : 10));
  assert.deepEqual(peakSeason(summerSouth, 3), { startMonth: 12, endMonth: 2 });
  assert.equal(peakSeason([], 3), null);
});
