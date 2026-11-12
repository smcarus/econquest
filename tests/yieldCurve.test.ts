import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { curveSentence, curveSpells, financialConditions, yieldCurve, CURVE_NOT_RUN, type YieldCurve } from '../src/utils/yieldCurve.ts';
import { yieldCurveCases, judgeWithRobustness, type BacktestSpec, type OpenCall } from '../src/utils/backtest.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';

/** Monthly points "YYYY-MM" from a start month. */
const months = (from: string, values: number[]) => {
  const y0 = Number(from.slice(0, 4));
  const m0 = Number(from.slice(5, 7)) - 1;
  return values.map((value, i) => ({ period: `${y0 + Math.floor((m0 + i) / 12)}-${String(((m0 + i) % 12) + 1).padStart(2, '0')}`, value }));
};
const SPEC: BacktestSpec = JSON.parse(fs.readFileSync('docs/validation/preregistered/yield_curve_recession.json', 'utf8'));

test('inverted spells: start, end and lowest month; a missing month ends a spell', () => {
  const pts = [...months('2006-01', [0.5, -0.2, -0.6, -0.1, 0.3]), ...months('2023-01', [-0.4, -1.1])];
  assert.deepEqual(curveSpells(pts), [
    { from: '2006-02', to: '2006-04', low: -0.6, lowMonth: '2006-03' },
    { from: '2023-01', low: -1.1, lowMonth: '2023-02' },
  ]);
});

test('the reading: spread, a year earlier, year averages with 10 months or more, and the conditions index with equal weights', () => {
  const n = 120;
  const yields = months('2016-01', Array.from({ length: n }, (_, i) => 2 + (i % 12) * 0.05 + (i > 100 ? 1 : 0)));
  const policy = months('2016-01', Array.from({ length: n }, (_, i) => (i > 96 ? 3.5 : 1)));
  const us = months('2016-01', Array.from({ length: n }, (_, i) => 2 + Math.sin(i / 5)));
  const reer = months('2016-01', Array.from({ length: n }, (_, i) => 100 + Math.cos(i / 7) * 3));
  const r = yieldCurve({ hasFred: true, hasPolicy: true, yields, policy, usYields: us, reer }) as YieldCurve;
  assert.equal(r.ok, true);
  assert.deepEqual(r.latest, { month: '2025-12', yield10: 3.55, policy: 3.5, spread: 0.05 });
  assert.deepEqual(r.yearAgo, { month: '2024-12', spread: 0.05 });
  assert.equal(r.years.length, 10);
  assert.ok(r.years.every((y) => y.months >= 10));
  assert.equal(r.fci!.components.length, 4);
  assert.equal(r.fci!.weight, 0.25);
  assert.equal(r.fci!.since, '2016-01');
  assert.ok(Math.abs(r.fci!.value - r.fci!.components.reduce((s, c) => s + c.z, 0) / 4) < 0.02);
  assert.deepEqual(r.missing, []);
  assert.equal(r.hitRate, undefined, 'no recession figure before the test passes');
  const s = curveSentence(r, 'Testland');
  assert.match(s, /^Testland: in Dec 2025 the 10-year yield was 3\.55% and the policy rate 3\.50%, a term spread of \+0\.05 points \(not inverted\)\./);
  assert.ok(!/probab|\d+% chance|will (?:have|face) a recession/i.test(s + JSON.stringify(r)));
});

test('the hit rate shows only from a passed verdict, and only as the historical hit rate', () => {
  const yields = months('2020-01', Array(72).fill(1));
  const policy = months('2020-01', Array(72).fill(2));
  const base = { hasFred: true, hasPolicy: true, yields, policy, isUs: true };
  const failed = yieldCurve({ ...base, test: { status: 'failed', hitRatePct: 40, baseRatePct: 10, cases: 50, span: { from: '1991', to: '2024' } } }) as YieldCurve;
  assert.equal(failed.hitRate, undefined);
  const passed = yieldCurve({ ...base, test: { status: 'passed', hitRatePct: 40, baseRatePct: 10, cases: 50, span: { from: '1991', to: '2024' } } }) as YieldCurve;
  assert.equal(passed.hitRate!.hitRatePct, 40);
  assert.match(curveSentence(passed, 'X'), /In the passed test, an inverted year was followed by a fall in real GDP in 40% of 50 cases \(1991 to 2024\), against 10% of years in general\./);
  // The US has no spread over itself; without the REER the index has two parts.
  assert.equal(passed.fci, undefined, 'constant series have no spread to scale');
  assert.ok(passed.missing.some((m) => /Real effective exchange rate/.test(m)));
});

test('Missing with the reason: no FRED series, no BIS policy rate, nothing saved yet', () => {
  assert.match((yieldCurve({ hasFred: false, hasPolicy: true }) as { reason: string }).reason, /OECD members and India/);
  assert.match((yieldCurve({ hasFred: true, hasPolicy: false }) as { reason: string }).reason, /does not publish a policy rate/);
  assert.match((yieldCurve({ hasFred: true, hasPolicy: true, yields: null, policy: months('2020-01', [1]) }) as { reason: string }).reason, /FRED has not answered/);
  assert.equal(financialConditions([{ id: 'policy', pts: new Map([['2020-01', 1]]) }]), undefined);
});

test('yieldCurveCases: year averages, next-year growth below 0 is a hit, pooled base rate, open call for the latest year', () => {
  // 20 years 2000-2019: inverted in 2006 and 2018 (growth falls in 2007; 2019 grows); growth also falls in 2012 without an inversion.
  const years = Array.from({ length: 21 }, (_, i) => 2000 + i);
  const yields = years.flatMap((y) => months(`${y}-01`, Array(12).fill(y === 2006 || y === 2018 || y === 2020 ? 1 : 4)));
  const policy = years.flatMap((y) => months(`${y}-01`, Array(12).fill(2)));
  const growth = years.map((y) => ({ year: y, value: y === 2007 || y === 2012 ? -1 : 2 }));
  const open: OpenCall[] = [];
  const cases = yieldCurveCases(SPEC, [{ where: 'AAA', yields, policy, growth }], 2020, open);
  assert.deepEqual(cases.map((c) => [c.when, c.hit]), [['2006', true], ['2018', false]]);
  assert.equal(cases[0].base, Math.round((2 / 20) * 10000) / 10000);
  assert.match(cases[0].what, /1\.00 pts below the policy rate on the 2006 averages; real GDP −1\.0% in 2007/);
  assert.deepEqual(open, [{ where: 'AAA', when: '2020', what: '10-year yield 1.00 pts below the policy rate on the 2020 averages, so the call is a fall in real GDP in 2021', due: '2021' }]);
  // A year with fewer than 10 months of both does not count; a country with under 15 scored years is out.
  const short = yieldCurveCases(SPEC, [{ where: 'BBB', yields: yields.slice(0, 14 * 12), policy, growth }], 2020);
  assert.deepEqual(short, []);
  const judged = judgeWithRobustness(SPEC, cases);
  assert.equal(judged.status, 'too_few_cases');
});

test('the spec moved to preregistered unchanged, with the hash it was registered under', () => {
  const body = fs.readFileSync('docs/validation/preregistered/yield_curve_recession.json', 'utf8');
  assert.equal(createHash('sha256').update(body).digest('hex'), 'de6ccb7b4827e48561918d31b588c43efcaa94bee6a2a8861f8bde8e9460b0e8');
  assert.ok(!fs.existsSync('docs/validation/pending/yield_curve_recession.json'));
  assert.equal(SPEC.passMark.minLiftPts, 10);
  assert.match(CURVE_NOT_RUN, /No recession figure is shown until it passes/);
});

test('wired: register, tool, panel and route', () => {
  assert.equal(registerEntry('yield_curve_recession')!.status, 'not_validated');
  assert.equal(READY_BY_ID.yield_curve.target.anchor, 'tool-yield-curve');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-yield-curve"/);
  assert.match(page, /YieldCurvePanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/yield-curve\/:iso3/);
});
