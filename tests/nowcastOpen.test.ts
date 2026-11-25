import test from 'node:test';
import assert from 'node:assert/strict';
import { predictorNowcastOpen, rowModelFor } from '../src/utils/penalizedNowcast.ts';
import { forestRowModel } from '../src/utils/forecastCases.ts';
import { forwardStep } from '../src/utils/forwardRecord.ts';
import type { ForecastSpec } from '../src/utils/forecastEval.ts';
import type { CountryData } from '../src/utils/forecastCases.ts';

// A made-up country for the test: monthly activity grows at a steady wave, quarterly GDP follows it.
function country(lastQ: string, lastMonth: string): CountryData {
  const months: Array<{ date: string; value: number }> = [];
  let level = 100;
  for (let y = 2000; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      const date = `${y}-${String(m).padStart(2, '0')}`;
      if (date > lastMonth) break;
      level *= 1 + 0.004 + 0.003 * Math.sin((y * 12 + m) / 5);
      months.push({ date, value: Number(level.toFixed(3)) });
    }
  const gdp: Array<{ date: string; value: number }> = [];
  for (let y = 2000; y <= 2026; y++)
    for (let q = 1; q <= 4; q++) {
      const date = `${y}-Q${q}`;
      if (date > lastQ) break;
      gdp.push({ date, value: Number((0.5 + 0.4 * Math.sin((y * 4 + q) / 2)).toFixed(3)) });
    }
  return { iso3: 'AAA', gdpQoq: gdp, activity: months };
}

const spec = (target: string, extra: Record<string, number> = {}) =>
  ({ id: 't', version: 1, target, benchmark: 'mean', params: { gdpLagDays: 60, minTrain: 32, ...extra }, sample: { from: '2005-Q1' } }) as unknown as ForecastSpec;

test('a passing ridge or lasso nowcast writes a call for each ended quarter not yet published, before its GDP is out', () => {
  const s = spec('gdp_penalized_nowcast_q', { penalty: 1 });
  const fit = rowModelFor(s)!;
  assert.ok(fit, 'ridge and lasso have a row model');
  const calls = predictorNowcastOpen(s, [country('2026-Q2', '2026-10')], '2026-11-23', fit);
  assert.deepEqual(calls.map((c) => [c.where, c.when, c.due]), [['AAA', '2026-Q3', '2026-11-29']], 'Q3 ended, Q2 is published, Q4 has not ended');
  assert.match(calls[0].what, /^nowcast -?\d+\.\d\d% q\/q against the benchmark \d+\.\d\d%/);
  assert.ok(Number.isFinite(calls[0].forecast.model));
  // Once Q3 is published there is nothing left to call.
  assert.deepEqual(predictorNowcastOpen(s, [country('2026-Q3', '2026-10')], '2026-11-23', fit), []);
  // No indicator month of the quarter out: no call, as in the test.
  assert.deepEqual(predictorNowcastOpen(s, [country('2026-Q2', '2026-06')], '2026-11-23', fit), []);
});

test('the call goes on the forward record only while the test passes, and is scored on the first published figure', () => {
  const s = spec('gdp_forest_nowcast_q', { trees: 20, maxDepth: 3, minLeaf: 5, seed: 1 });
  assert.equal(rowModelFor(s), null, 'the forest needs its own model');
  const fit = rowModelFor(s, forestRowModel(s))!;
  const open = predictorNowcastOpen(s, [country('2026-Q2', '2026-10')], '2026-11-23', fit);
  assert.equal(open.length, 1);
  const failing = forwardStep([], { key: 't v1', specHash: 'h', passing: false }, [], open, '2026-11-23T00:00:00Z');
  assert.deepEqual(failing, [], 'a failed test records nothing');
  const step = forwardStep([], { key: 't v1', specHash: 'h', passing: true }, [], open, '2026-11-23T00:00:00Z');
  assert.equal(step[0].kind, 'call');
  const scored = forwardStep(step, { key: 't v1', specHash: 'h', passing: true }, [{ where: 'AAA', when: '2026-Q3', what: '', hit: true, base: 0.6, value: 0.1 } as never], [], '2026-12-01T00:00:00Z');
  assert.deepEqual(scored.map((l) => [l.kind, (l as { hit?: boolean }).hit]), [['outcome', true]]);
});

test('the monthly scorecard counts calls written and scored each month, newest first', async () => {
  const { forwardByMonth } = await import('../src/utils/forwardRecord.ts');
  const call = (when: string, at: string) => ({ kind: 'call' as const, test: 't v1', specHash: 'h', where: 'AAA', when, what: '', due: '', at });
  const out = (when: string, at: string, hit: boolean, value: number) => ({ kind: 'outcome' as const, test: 't v1', where: 'AAA', when, hit, base: 0.5, value, at });
  const rows = forwardByMonth([call('2026-Q3', '2026-10-05T00:00:00Z'), call('2026-Q4', '2026-11-02T00:00:00Z'), out('2026-Q3', '2026-11-30T00:00:00Z', true, 0.2), out('2026-Q2', '2026-11-30T00:00:00Z', false, -0.1)]);
  assert.deepEqual(rows, [
    { month: '2026-11', test: 't v1', called: 1, scored: 2, hits: 1, meanGain: 0.05 },
    { month: '2026-10', test: 't v1', called: 1, scored: 0, hits: 0, meanGain: null },
  ]);
});

test('the tests run early once before each GDP release on the calendar', async () => {
  const { preReleaseTestsDue } = await import('../src/utils/dailyRun.ts');
  const ev = (iso3: string, category: string, date: string) => ({ iso3, category, date, title: `${iso3} ${category}` }) as never;
  const cal = [ev('USA', 'CPI_RELEASE', '2026-11-25'), ev('GBR', 'GDP_RELEASE', '2026-11-26'), ev('JPN', 'GDP_RELEASE', '2026-12-08')];
  const now = new Date('2026-11-24T06:00:00Z');
  assert.equal(preReleaseTestsDue(cal, '2026-11-20T03:30:00Z', now)?.iso3, 'GBR', 'last run before the three days ahead of the release');
  assert.equal(preReleaseTestsDue(cal, '2026-11-23T03:30:00Z', now), null, 'already ran inside the window');
  assert.equal(preReleaseTestsDue(cal, undefined, now)?.iso3, 'GBR');
  assert.equal(preReleaseTestsDue([cal[0], cal[2]], '2026-11-01T00:00:00Z', now), null, 'a CPI release does not trigger it, and Japan is too far off');
});
