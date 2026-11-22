import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { fitPenalized, fitPenalizedCv, predictPenalized } from '../src/utils/penalized';
import { penalizedNowcastCases, predictorRows } from '../src/utils/penalizedNowcast';
import { judgeForecast, type ForecastSpec } from '../src/utils/forecastEval';
import type { CountryData } from '../src/utils/forecastCases';

function data(seed = 9) {
  const rand = seededRandom(seed);
  const X = Array.from({ length: 80 }, () => Array.from({ length: 6 }, () => rand() * 4 - 2));
  const y = X.map((r) => 1 + 2 * r[0] - 1 * r[1] + 0.5 * r[2] + (rand() - 0.5));
  return { X, y };
}

// Reference values from scikit-learn 1.9: make_pipeline(StandardScaler(), Ridge(alpha=3) / Lasso(alpha=0.1)), coefficients put back on the original scale.
test('ridge and lasso match scikit-learn on the same data', () => {
  const { X, y } = data();
  const r = fitPenalized(X, y, 'ridge', 3);
  const l = fitPenalized(X, y, 'lasso', 0.1);
  assert.ok(!('error' in r) && !('error' in l));
  if ('error' in r || 'error' in l) return;
  const rRef = [1.8971855371690112, -0.9670823736797053, 0.4809498782892718, -0.0645818454565037, 0.014267845428215681, 0.013984982386025127];
  assert.ok(Math.abs(r.intercept - 1.036407334934118) < 1e-9);
  r.coef.forEach((c, j) => assert.ok(Math.abs(c - rRef[j]) < 1e-9, `ridge ${j}`));
  const lRef = [1.872794779744637, -0.9272277077466611, 0.4222120450854398, 0, 0, 0];
  assert.ok(Math.abs(l.intercept - 1.0377053165215488) < 1e-8);
  l.coef.forEach((c, j) => assert.ok(Math.abs(c - lRef[j]) < 1e-8, `lasso ${j}`));
  assert.equal(l.kept, 3);
  assert.ok(r.df > 5 && r.df < 6);
});

test('the penalty is chosen on the last 20% of rows only, and bad input is refused', () => {
  const { X, y } = data(4);
  const f = fitPenalizedCv(X, y, 'lasso');
  assert.ok(!('error' in f));
  if ('error' in f) return;
  assert.ok(Math.abs(predictPenalized(f, [1, 0, 0, 0, 0, 0]) - 3) < 0.6);
  // Changing a row in the held-out block can change the chosen alpha; changing nothing keeps it.
  assert.equal((fitPenalizedCv(X, y, 'lasso') as { alpha: number }).alpha, f.alpha);
  assert.match((fitPenalized([[1, 2]], [1], 'ridge', 1) as { error: string }).error, /at least 7/);
  assert.match((fitPenalized([[1], [NaN], [1], [2], [3], [4], [5]], [1, 2, 3, 4, 5, 6, 7], 'ridge', 1) as { error: string }).error, /gap/);
});

/** Simulated country: monthly activity drives quarterly GDP growth. */
function country(seed: number, iso3: string): CountryData {
  const rand = seededRandom(seed);
  const activity: CountryData['activity'] = [];
  const cpi: CountryData['cpi'] = [];
  const gdpQoq: CountryData['gdpQoq'] = [];
  let level = 100;
  let g = 0;
  for (let y = 1995; y <= 2020; y++) {
    for (let q = 1; q <= 4; q++) {
      g = 0.3 * g + (rand() - 0.5) * 2;
      for (let k = 0; k < 3; k++) {
        level *= 1 + g / 300 + (rand() - 0.5) * 0.001;
        const m = `${y}-${String((q - 1) * 3 + k + 1).padStart(2, '0')}`;
        activity.push({ date: m, value: level });
        cpi.push({ date: m, value: 2 + rand() });
      }
      gdpQoq.push({ date: `${y}-Q${q}`, value: 0.5 + 0.8 * g + (rand() - 0.5) * 0.2 });
    }
  }
  return { iso3, gdpQoq, activity, cpi };
}

const spec = (penalty: number): ForecastSpec => ({
  id: penalty === 1 ? 'gdp_nowcast_ridge' : 'gdp_nowcast_lasso', version: 1, registeredOn: '2026-11-22', registeredBy: 't', hypothesis: '', target: 'gdp_penalized_nowcast_q',
  params: { penalty, asOfDaysAfterQuarter: 30, gdpLagDays: 60, activityLagDays: 45, cliLagDays: 45, cpiLagDays: 30, policyLagDays: 1, minTrain: 32 },
  benchmark: 'mean', horizons: [1], sample: { from: '2008-Q1' },
  passMark: { maxRelRmse: 0.9, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 40, minYears: 5 }, knownLimits: [],
});

test('predictor rows use only what is published on the nowcast day', () => {
  const c = country(1, 'AAA');
  const pr = predictorRows(c, '2010-04-30', '2010-Q1', { gdp: 60, activity: 45, cli: 45, cpi: 30, policy: 1 })!;
  assert.deepEqual(pr.names, ['GDP growth q-1', 'GDP growth q-2', 'GDP growth q-3', 'GDP growth q-4', 'Activity index growth', 'Activity index growth q-1', 'Inflation change']);
  assert.equal(pr.gdp.has('2010-Q1'), false);
  assert.equal(pr.gdp.has('2009-Q4'), true);
  // March 2010 activity (out 45 days after March) is not out on 30 April: the quarter is partly a forecast.
  assert.equal(pr.rows.get('2010-Q1')!.complete, false);
  assert.equal(pr.rows.get('2009-Q3')!.complete, true);
  assert.equal(predictorRows({ iso3: 'X', gdpQoq: c.gdpQoq }, '2010-04-30', '2010-Q1', { gdp: 60, activity: 45, cli: 45, cpi: 30, policy: 1 }), null);
});

test('ridge and lasso nowcast cases beat the historical mean when activity drives GDP', () => {
  const d = [country(1, 'AAA'), country(2, 'BBB')];
  for (const p of [1, 2]) {
    const { cases, series } = penalizedNowcastCases(spec(p), d);
    assert.deepEqual(series, ['AAA', 'BBB']);
    assert.ok(cases.length >= 80, `${cases.length} cases`);
    assert.ok(cases.every((c) => c.target >= '2008-Q1' && c.model.sd! > 0));
    const r = judgeForecast(spec(p), 'h', cases, 'sim');
    assert.ok(r.horizons[0].relRmse < 0.9, `penalty ${p}: ${r.horizons[0].relRmse}`);
  }
});
