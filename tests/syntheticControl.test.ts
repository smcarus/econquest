import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_DONORS, gapAt, outcomeYears, parseOutcome, simplexLeastSquares, syntheticControl, type SynthHistory } from '../src/utils/syntheticControl';

function hist(iso3: string, series: Record<string, Record<number, number>>): SynthHistory {
  return {
    iso3,
    name: `Country ${iso3}`,
    series: Object.fromEntries(Object.entries(series).map(([id, ys]) => [id, { points: Object.entries(ys).map(([y, v]) => ({ date: y, value: v })) }])),
  };
}
const span = (from: number, to: number, f: (y: number) => number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, f(from + i)]));

/** A made-up pool: donor i follows a level plus its own wave, so different mixes give different paths. */
function pool(n: number, from = 1990, to = 2020) {
  return Array.from({ length: n }, (_, i) => hist(`D${String(i).padStart(2, '0')}`, { cpi_imf: span(from, to, (y) => 2 + i * 0.5 + Math.sin((y + i * 1.7) / 2) * (1 + (i % 3))) }));
}

test('hand-worked case: y = 0.25 a + 0.75 b is found exactly; a third column gets nothing', () => {
  const a = [1, 2, 3, 4];
  const b = [4, 3, 5, 1];
  const c = [10, -3, 7, 0];
  const y = a.map((v, t) => 0.25 * v + 0.75 * b[t]);
  const { w } = simplexLeastSquares(y, [a, b, c]);
  assert.ok(Math.abs(w[0] - 0.25) < 1e-6, String(w));
  assert.ok(Math.abs(w[1] - 0.75) < 1e-6, String(w));
  assert.ok(w[2] < 1e-6);
});

test('hand-worked case: a target above every column gets all weight on the highest', () => {
  const { w } = simplexLeastSquares([5, 5], [[1, 1], [3, 3]]);
  assert.ok(Math.abs(w[1] - 1) < 1e-9);
});

test('outcomes: unknown ids fall back to inflation; currency change is the yearly % move', () => {
  assert.equal(parseOutcome('gdp_growth'), 'gdp_growth');
  assert.equal(parseOutcome('nonsense'), 'cpi_imf');
  const y = outcomeYears(hist('AAA', { fx_lcu_usd: { 2000: 2, 2001: 3, 2002: 3 } }), 'currency_change', 2030);
  assert.deepEqual([...y.entries()], [[2001, 50], [2002, 0]]);
  assert.equal(outcomeYears(hist('AAA', { cpi_imf: { 2024: 1, 2025: 2 } }), 'cpi_imf', 2025).has(2024), true);
  assert.equal(outcomeYears(hist('AAA', { cpi_imf: { 2024: 1, 2025: 2 } }), 'cpi_imf', 2025).has(2025), false);
});

test('a country built from two donors, then a drop of 3 points from the change year: the twin finds the mix (closely; the penalty moves it a little) and the gap', () => {
  const donors = pool(14);
  const a = donors[3].series.cpi_imf!.points;
  const b = donors[8].series.cpi_imf!.points;
  const own: Record<number, number> = {};
  a.forEach((p, i) => {
    const y = Number(p.date);
    own[y] = 0.4 * p.value + 0.6 * b[i].value - (y >= 2010 ? 3 : 0);
  });
  const r = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2016-06-30', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: own }), ...donors] });
  assert.equal(r.missing, undefined, JSON.stringify(r.missing));
  assert.deepEqual(r.preYears, [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009]);
  assert.deepEqual(r.postYears, [2010, 2011, 2012, 2013, 2014, 2015]);
  assert.equal(r.weights[0].iso3, 'D08');
  assert.ok(Math.abs(r.weights[0].weight - 0.6) < 0.03);
  assert.equal(r.weights[1].iso3, 'D03');
  assert.ok(Math.abs((gapAt(r, 3) ?? 0) + 3) < 0.1, String(gapAt(r, 3)));
  assert.ok((r.fitRatio ?? 1) < 0.1);
  assert.equal(r.dominantDonor, null);
  // The treated country's ratio is the largest, so it ranks first among the placebo runs.
  assert.equal(r.placebo?.rank, 1);
  assert.equal(r.placebo?.runs, 15);
  assert.ok((r.placebo?.p ?? 1) < 0.1);
  assert.equal(r.leaveOneOut?.dropped, 'D08');
  assert.ok(r.inTime && Math.abs(r.inTime.gaps[0]) < 0.3, JSON.stringify(r.inTime));
});

test('the same inputs give the same answer', () => {
  const donors = pool(12);
  const own = hist('TRT', { cpi_imf: span(1990, 2020, (y) => 4 + Math.cos(y / 3)) });
  const a = syntheticControl({ iso3: 'TRT', eventYear: 2008, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [own, ...donors] });
  const b = syntheticControl({ iso3: 'TRT', eventYear: 2008, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [own, ...[...donors].reverse()] });
  assert.deepEqual(a, b);
});

test('Missing: too few years before, no years after, too few donors, outside the range, loose fit', () => {
  const donors = pool(12);
  const short = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: span(2004, 2015, () => 3) }), ...donors] });
  assert.equal(short.missing?.reason, 'too_few_pre_years');
  const late = syntheticControl({ iso3: 'TRT', eventYear: 2019, asOf: '2019-06-30', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: span(1990, 2020, () => 3) }), ...donors] });
  assert.equal(late.missing?.reason, 'no_post_years');
  const few = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: span(1990, 2020, () => 3) }), ...donors.slice(0, MIN_DONORS - 1)] });
  assert.equal(few.missing?.reason, 'too_few_donors');
  const high = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: span(1990, 2020, () => 90) }), ...donors] });
  assert.equal(high.missing?.reason, 'outside_range');
  const zigzag = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [hist('TRT', { cpi_imf: span(1990, 2020, (y) => 5 + (y % 2 ? 3 : -3)) }), ...donors] });
  assert.equal(zigzag.missing?.reason, 'poor_fit');
  assert.equal(syntheticControl({ iso3: 'ZZZ', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: donors }).missing?.reason, 'no_history');
});

test('excluded countries (same kind of change in the window) are left out of the donors', () => {
  const donors = pool(13);
  const own = hist('TRT', { cpi_imf: Object.fromEntries(donors[2].series.cpi_imf!.points.map((p) => [Number(p.date), p.value])) });
  const r = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [own, ...donors], exclude: ['D02', 'TRT'] });
  assert.deepEqual(r.excluded, ['D02']);
  assert.equal(r.donorCount, 12);
  assert.ok(!r.weights.some((w) => w.iso3 === 'D02'));
});

test('a one-country twin is flagged', () => {
  const donors = pool(12);
  const own = hist('TRT', { cpi_imf: Object.fromEntries(donors[5].series.cpi_imf!.points.map((p) => [Number(p.date), p.value + 0.001])) });
  const r = syntheticControl({ iso3: 'TRT', eventYear: 2010, asOf: '2020-01-01', outcome: 'cpi_imf', histories: [own, ...donors] });
  assert.equal(r.dominantDonor, 'D05');
});

test('the active-set answer is the best mix: no point on a fine grid of three-donor mixes does better', () => {
  const y = [3, 1, 4, 1, 5];
  const cols = [[2, 7, 1, 8, 2], [8, 1, 8, 2, 8], [1, 4, 1, 4, 2]];
  const lin = [0.3, 0.1, 0.2];
  const cost = (w: number[]) => 0.5 * y.reduce((s, v, t) => s + (v - cols.reduce((a, c, j) => a + w[j] * c[t], 0)) ** 2, 0) + w.reduce((s, x, j) => s + x * lin[j], 0);
  const { w } = simplexLeastSquares(y, cols, { linear: lin });
  assert.ok(Math.abs(w.reduce((s, x) => s + x, 0) - 1) < 1e-12);
  let best = Infinity;
  for (let a = 0; a <= 200; a++) for (let b = 0; a + b <= 200; b++) best = Math.min(best, cost([a / 200, b / 200, (200 - a - b) / 200]));
  assert.ok(cost(w) <= best + 1e-6, `${cost(w)} vs ${best}`);
});
