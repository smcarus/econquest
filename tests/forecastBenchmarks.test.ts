import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { kpss, stationarityVerdict } from '../src/utils/stats';
import { allBenchmarks, alsoAgainst, benchmark, crpsNormal, distributionScore, intervalScore, judgeForecast, normCdf, pinballLoss, arForecastCases, type ForecastCase, type ForecastSpec } from '../src/utils/forecastEval';
import { alsoReported } from '../src/utils/forecastRegister';

function series(seed: number) {
  const rand = seededRandom(seed);
  const nrm = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rand()))) * Math.cos(2 * Math.PI * rand());
  const noise = Array.from({ length: 120 }, () => nrm());
  let w = 0;
  const walk = Array.from({ length: 120 }, () => (w += nrm()));
  return { noise, walk };
}

// Reference values from statsmodels 0.15 kpss(regression='c', nlags='auto') on the same series.
test('KPSS matches statsmodels on white noise and a random walk', () => {
  const { noise, walk } = series(11);
  const a = kpss(noise);
  const b = kpss(walk);
  assert.ok(!('error' in a) && !('error' in b));
  if ('error' in a || 'error' in b) return;
  assert.ok(Math.abs(a.stat - 0.20790952436282653) < 1e-9);
  assert.equal(a.lags, 3);
  assert.equal(a.p, 0.1);
  assert.equal(a.stationary, true);
  assert.ok(Math.abs(b.stat - 1.6732357690155257) < 1e-9);
  assert.equal(b.lags, 6);
  assert.equal(b.p, 0.01);
  assert.equal(b.stationary, false);
});

test('KPSS refuses short or flat series and reads p between table values', () => {
  assert.match((kpss([1, 2, 3]) as { error: string }).error, /at least 20/);
  assert.match((kpss(Array(30).fill(2)) as { error: string }).error, /does not vary/);
  assert.match(stationarityVerdict(true, true), /agree: the series looks stationary/);
  assert.match(stationarityVerdict(false, false), /unit root/);
  assert.match(stationarityVerdict(true, false), /disagree/);
});

test('benchmarks: naive, mean, drift and seasonal naive', () => {
  const t = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.equal(benchmark('naive', t).mean, 8);
  assert.equal(benchmark('mean', t).mean, 4.5);
  assert.equal(benchmark('drift', [1, 2, 4], 2).mean, 7);
  assert.equal(benchmark('seasonal_naive', t, 1, 4).mean, 5);
  assert.equal(benchmark('seasonal_naive', t, 4, 4).mean, 8);
  assert.equal(benchmark('seasonal_naive', t, 6, 4).mean, 6);
  // too short for a season: the naive stands in
  assert.equal(benchmark('seasonal_naive', [1, 2], 1, 4).mean, 2);
  assert.deepEqual(Object.keys(allBenchmarks(t, 1, 1)).sort(), ['drift', 'mean', 'naive']);
  assert.deepEqual(Object.keys(allBenchmarks(t, 1, 12)).sort(), ['drift', 'mean', 'naive', 'seasonal_naive']);
});

// CRPS reference: closed form checked against numerical integration of (F - 1{x >= y})^2 in scipy (0.92235).
test('distribution scores: CRPS, interval score and pinball loss', () => {
  assert.ok(Math.abs(crpsNormal(1.2, 0.7, 2.5) - 0.922353) < 1e-5);
  assert.ok(Math.abs(normCdf(1.96) - 0.975002) < 1e-6);
  assert.equal(intervalScore(0, 2, 1, 0.1), 2);
  assert.equal(intervalScore(0, 2, 3, 0.1), 22);
  assert.equal(pinballLoss(1, 2, 0.9), 0.9);
  assert.ok(Math.abs(pinballLoss(1, 0, 0.9) - 0.1) < 1e-12);
  const cases: ForecastCase[] = [
    { where: 'A', origin: '2020', target: '2021', h: 1, actual: 1, model: { mean: 1, sd: 1 }, bench: { mean: 3 }, others: { naive: 3, mean: 0 } },
    { where: 'A', origin: '2021', target: '2022', h: 1, actual: 2, model: { mean: 2, sd: 1 }, bench: { mean: 1 }, others: { naive: 1, mean: 0 } },
  ];
  const d = distributionScore(cases)!;
  assert.equal(d.cases, 2);
  assert.equal(d.benchMae, 1.5);
  assert.ok(d.crpsRatio < 1);
  assert.equal(distributionScore([{ ...cases[0], model: { mean: 1 } }]), null);
  const also = alsoAgainst(cases);
  assert.deepEqual(also.map((a) => a.benchmark), ['naive', 'mean']);
  assert.equal(also[0].relRmse, 0);
});

test('evaluation reports the other benchmarks and band scores without changing the verdict', () => {
  const rand = seededRandom(3);
  const y = [0];
  for (let t = 1; t < 160; t++) y.push(0.6 * y[t - 1] + (rand() - 0.5));
  const dates = y.map((_, i) => `${2000 + Math.floor(i / 4)}-Q${(i % 4) + 1}`);
  const spec: ForecastSpec = {
    id: 't', version: 1, registeredOn: '2026-11-22', registeredBy: 'test', hypothesis: '', target: 'gdp_growth_q',
    params: { maxLag: 4, minTrain: 40 }, benchmark: 'mean', horizons: [1], sample: { from: '2010-Q1' },
    passMark: { maxRelRmse: 1, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 20, minYears: 8 }, knownLimits: [],
  };
  const cases = arForecastCases([{ where: 'AAA', dates, values: y }], spec);
  assert.ok(cases.every((c) => c.others && 'seasonal_naive' in c.others));
  const r = judgeForecast(spec, 'h', cases, 'sim');
  const h = r.horizons[0];
  assert.deepEqual(h.alsoAgainst!.map((a) => a.benchmark), ['naive', 'mean', 'drift', 'seasonal_naive']);
  assert.equal(h.alsoAgainst!.find((a) => a.benchmark === 'mean')!.relRmse, h.relRmse);
  assert.ok(h.distribution && h.distribution.crps > 0);
  const line = alsoReported({ ...r, horizons: r.horizons });
  assert.match(line, /^Also reported \(not part of the verdict\): 1 ahead: relative RMSE against last value/);
  assert.match(line, /seasonal naive/);
  assert.match(line, /band CRPS ratio/);
  assert.equal(alsoReported({ id: 'x', status: 'failed', verdict: '', specVersion: 1, specHash: '', ranAt: '' }), '');
});
