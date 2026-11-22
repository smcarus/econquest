import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { meanPinball, quantileForecastCases, quantReg } from '../src/utils/quantileForecast';
import { fitForest, predictForest } from '../src/utils/randomForest';
import { judgeLoss } from '../src/utils/lossEval';
import { casesFor } from '../src/utils/forecastCases';
import { judgeForecast, type ForecastSpec } from '../src/utils/forecastEval';
import type { CountryData } from '../src/utils/forecastCases';

function qrData() {
  const rand = seededRandom(17);
  const X = Array.from({ length: 150 }, () => [rand() * 4 - 2, rand() * 2]);
  const y = X.map((r) => 1 + 0.5 * r[0] - 0.7 * r[1] + (1 + 0.5 * r[1]) * Math.tan(Math.PI * (rand() - 0.5)) * 0.3);
  return { X, y };
}

// Reference values from statsmodels 0.15 QuantReg(y, add_constant(X)).fit(q).
test('quantile regression matches statsmodels QuantReg', () => {
  const { X, y } = qrData();
  const ref: Record<number, number[]> = {
    0.05: [0.6400254098744639, 0.676444519146248, -2.4646855980753117],
    0.5: [1.0729457324398237, 0.5625988402666244, -0.5958642332125795],
    0.95: [3.43687070885607, 2.029527987558107, 1.629491399561862],
  };
  for (const q of [0.05, 0.5, 0.95]) {
    const r = quantReg(y, X, q);
    assert.ok(!('error' in r));
    if ('error' in r) continue;
    r.coef.forEach((c, j) => assert.ok(Math.abs(c - ref[q][j]) < 1e-8, `q ${q} coef ${j}`));
  }
  assert.match((quantReg([1, 2], [[1], [2]], 0.5) as { error: string }).error, /Only 2 rows/);
});

test('quantile band cases: pinball loss of percentile regressions against the AR normal band', () => {
  // Growth with a fat downside: occasional large falls.
  const rand = seededRandom(5);
  const v: number[] = [];
  let g = 0.5;
  for (let i = 0; i < 160; i++) {
    g = 0.5 + 0.3 * (g - 0.5) + (rand() < 0.1 ? -3 * rand() : 0.4 * (rand() - 0.5));
    v.push(g);
  }
  const dates = v.map((_, i) => `${1985 + Math.floor(i / 4)}-Q${(i % 4) + 1}`);
  const cases = quantileForecastCases([{ where: 'AAA', dates, values: v }], { params: { maxLag: 4, minTrain: 40 }, horizons: [1, 4], sample: { from: '2000-Q1' } });
  assert.ok(cases.length > 100);
  assert.ok(cases.every((c) => c.lossModel >= 0 && c.lossBench >= 0));
  assert.equal(meanPinball([0, 0, 0, 0, 0], 0), 0);
  const r = judgeLoss({ id: 'gdp_forecast_quantile', version: 1, horizons: [1, 4], passMark: { maxLossRatio: 0.95, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerSeries: 30, minCases: 50, minYears: 5 } }, 'h', cases, 'sim', { loss: 'pinball', lossLabel: 'mean pinball loss', benchLabel: 'the AR band', unit: 'quarter(s)', resamples: 300, seed: 1 });
  assert.equal(r.loss, 'pinball');
  assert.equal(r.horizons.length, 2);
  assert.ok(['passed', 'failed'].includes(r.status));
  assert.match(r.verdict, /mean pinball loss ratio/);
});

test('random forest: deterministic, finds a threshold a straight line misses', () => {
  const rand = seededRandom(2);
  const X = Array.from({ length: 200 }, () => [rand() * 2 - 1, rand() * 2 - 1, rand()]);
  const y = X.map((r) => (r[0] > 0.2 ? 2 : -1) + 0.1 * (rand() - 0.5));
  const p = { trees: 50, maxDepth: 4, minLeaf: 5, seed: 7 };
  const f = fitForest(X, y, p);
  assert.ok(!('error' in f));
  if ('error' in f) return;
  assert.ok(predictForest(f, [0.8, 0, 0.5]) > 1.5);
  assert.ok(predictForest(f, [-0.8, 0, 0.5]) < -0.5);
  assert.ok(f.oobRmse! < 0.5);
  const g = fitForest(X, y, p) as typeof f;
  assert.equal(predictForest(g, [0.3, 0.1, 0.2]), predictForest(f, [0.3, 0.1, 0.2]));
  assert.match((fitForest([[1]], [1], p) as { error: string }).error, /at least 10/);
});

function country(seed: number, iso3: string): CountryData {
  const rand = seededRandom(seed);
  const activity: CountryData['activity'] = [];
  const gdpQoq: CountryData['gdpQoq'] = [];
  let level = 100;
  let g = 0;
  for (let y = 1995; y <= 2020; y++)
    for (let q = 1; q <= 4; q++) {
      g = 0.3 * g + (rand() - 0.5) * 2;
      for (let k = 0; k < 3; k++) {
        level *= 1 + g / 300 + (rand() - 0.5) * 0.001;
        activity.push({ date: `${y}-${String((q - 1) * 3 + k + 1).padStart(2, '0')}`, value: level });
      }
      gdpQoq.push({ date: `${y}-Q${q}`, value: 0.5 + 0.8 * g + (rand() - 0.5) * 0.2 });
    }
  return { iso3, gdpQoq, activity };
}

test('forest nowcast cases run through the shared predictor design and beat the mean on simulated data', () => {
  const spec: ForecastSpec = {
    id: 'gdp_nowcast_forest', version: 1, registeredOn: '2026-11-22', registeredBy: 't', hypothesis: '', target: 'gdp_forest_nowcast_q',
    params: { asOfDaysAfterQuarter: 30, gdpLagDays: 60, activityLagDays: 45, cliLagDays: 45, cpiLagDays: 30, policyLagDays: 1, minTrain: 32, trees: 60, maxDepth: 5, minLeaf: 5, seed: 3 },
    benchmark: 'mean', horizons: [1], sample: { from: '2008-Q1' },
    passMark: { maxRelRmse: 0.9, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 40, minYears: 5 }, knownLimits: [],
  };
  const { cases, series } = casesFor(spec, [country(1, 'AAA'), country(2, 'BBB')]);
  assert.deepEqual(series, ['AAA', 'BBB']);
  assert.ok(cases.length >= 80);
  const r = judgeForecast(spec, 'h', cases, 'sim');
  assert.ok(r.horizons[0].relRmse < 0.9, `${r.horizons[0].relRmse}`);
});
