import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { fitGarch, garchHorizon, garchPath } from '../src/utils/garch';
import { nelderMead } from '../src/utils/optimize';
import { dailyReturns, judgeVol, qlike, volCases, type VolSpec } from '../src/utils/volEval';

/** Simulated GARCH(1,1) returns in percent: omega 0.02, alpha 0.08, beta 0.9, mean 0.01 (same generator as the reference run). */
function simulate(n: number, seed = 21): number[] {
  const rand = seededRandom(seed);
  const nrm = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, rand()))) * Math.cos(2 * Math.PI * rand());
  const r: number[] = [];
  let s2 = 0.4;
  let e = 0;
  for (let t = 0; t < n; t++) {
    s2 = 0.02 + 0.08 * e * e + 0.9 * s2;
    e = Math.sqrt(s2) * nrm();
    r.push(Number((0.01 + e).toFixed(8)));
  }
  return r;
}

test('Nelder-Mead finds the minimum of the Rosenbrock function', () => {
  const r = nelderMead(([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2, [-1.2, 1], { maxIter: 5000 });
  assert.ok(Math.abs(r.x[0] - 1) < 1e-4 && Math.abs(r.x[1] - 1) < 1e-4);
});

// Reference values from the Python arch package 9.0: arch_model(r, mean='Constant', vol='GARCH', p=1, q=1, dist='normal').
test('GARCH(1,1) matches the arch package on simulated returns', () => {
  const r = simulate(1500);
  const f = fitGarch(r);
  assert.ok(!('error' in f));
  if ('error' in f) return;
  assert.ok(Math.abs(f.mu - 0.01811372537600043) < 1e-5, `mu ${f.mu}`);
  assert.ok(Math.abs(f.omega - 0.02089097794977971) < 1e-5, `omega ${f.omega}`);
  assert.ok(Math.abs(f.alpha - 0.08111728125183669) < 1e-5, `alpha ${f.alpha}`);
  assert.ok(Math.abs(f.beta - 0.8941258876831276) < 1e-5, `beta ${f.beta}`);
  assert.ok(Math.abs(f.logLik - -1905.9094982054162) < 1e-4);
  // arch forecast(horizon=5).variance
  const ref = [0.46630592, 0.47565264, 0.48476796, 0.49365762, 0.5023272];
  garchPath(f, 5).forEach((v, i) => assert.ok(Math.abs(v - ref[i]) < 1e-5, `day ${i + 1}`));
  const s = simulate(600);
  const g = fitGarch(s);
  assert.ok(!('error' in g));
  if ('error' in g) return;
  assert.ok(Math.abs(g.alpha - 0.07411142982256232) < 1e-4 && Math.abs(g.beta - 0.9112877138516473) < 1e-4);
  assert.ok(Math.abs(g.logLik - -691.8208510868335) < 1e-3);
  const h = garchHorizon(f, 21);
  assert.ok(Math.abs(h.variance - garchPath(f, 21).reduce((a, b) => a + b, 0)) < 1e-12);
  assert.ok(f.halfLifeDays > 10 && f.halfLifeDays < 60);
});

test('GARCH refuses short, broken or flat returns', () => {
  assert.match((fitGarch([1, 2, 3]) as { error: string }).error, /at least 250/);
  assert.match((fitGarch([...Array(300).fill(0.1), NaN]) as { error: string }).error, /gap/);
  assert.match((fitGarch(Array(300).fill(0.1)) as { error: string }).error, /do not vary/);
});

test('QLIKE is zero for a perfect forecast and punishes calm-before-storm forecasts more', () => {
  assert.equal(qlike(2, 2), 0);
  assert.ok(qlike(4, 1) > qlike(1, 4));
});

function spec(over: Partial<VolSpec> = {}): VolSpec {
  return {
    id: 'fx_vol_garch', version: 1, registeredOn: '2026-11-22', registeredBy: 't', hypothesis: '', target: 'fx_vol_d',
    params: { window: 400, horizonDays: 21, benchDays: 63, resamples: 200, seed: 1 }, universe: ['AAA', 'BBB'], sample: { from: '2001-01' },
    passMark: { maxLossRatio: 0.95, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerCurrency: 10, minCases: 40, minYears: 3 }, knownLimits: [], ...over,
  };
}

/** Business-day price path from returns (percent log changes), starting 2000-01-03. */
function prices(r: number[]): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  const d = new Date(Date.UTC(2000, 0, 3));
  let p = 1;
  out.push({ date: d.toISOString().slice(0, 10), value: p });
  for (const x of r) {
    do d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    p *= Math.exp(x / 100);
    out.push({ date: d.toISOString().slice(0, 10), value: p });
  }
  return out;
}

test('volatility cases: month-end origins, realised variance of the next 21 returns, and a pooled verdict', () => {
  const daily = { AAA: prices(simulate(1600, 3)), BBB: prices(simulate(1600, 4)) };
  const rs = dailyReturns(daily.AAA);
  assert.equal(rs.length, 1600);
  const cases = volCases(daily, spec());
  assert.ok(cases.length > 40);
  for (const c of cases.slice(0, 5)) {
    const i = rs.findIndex((x) => x.date === c.origin);
    assert.notEqual(rs[i + 1].date.slice(0, 7), c.origin.slice(0, 7));
    if (c.ccy === 'AAA') assert.ok(Math.abs(c.rv - rs.slice(i + 1, i + 22).reduce((a, x) => a + x.r * x.r, 0)) < 1e-9);
  }
  const r = judgeVol(spec(), 'h', cases, 'sim');
  assert.equal(r.loss, 'qlike');
  assert.equal(r.horizons[0].seriesTested, 2);
  assert.ok(['passed', 'failed'].includes(r.status));
  // On data simulated from a GARCH process, GARCH should beat the trailing three-month variance.
  assert.ok(r.horizons[0].relRmse < 1, `ratio ${r.horizons[0].relRmse}`);
  const few = judgeVol(spec({ passMark: { ...spec().passMark, minCases: 100000 } }), 'h', cases, 'sim');
  assert.equal(few.status, 'too_few_cases');
});
