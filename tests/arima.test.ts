import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { arimaPsi, autoArima, constrainStationary, expandPolys, fitArima, forecastArima } from '../src/utils/arima';
import { kalmanFilter, kalmanSmoother, lyapunov } from '../src/utils/kalman';
import { armaForecastCases } from '../src/utils/arimaEval';

/** Same generator as the statsmodels reference run: ARMA(1,1) errors around 2 + 0.8 x, and a seasonal AR. */
function sim() {
  const rand = seededRandom(31);
  const nrm = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, rand()))) * Math.cos(2 * Math.PI * rand());
  const n = 300;
  const y: number[] = [];
  const x: number[] = [];
  let u = 0;
  let e0 = 0;
  for (let t = 0; t < n; t++) {
    const e = nrm();
    u = 0.6 * u + e + 0.4 * e0;
    e0 = e;
    const xv = nrm();
    x.push(Number(xv.toFixed(8)));
    y.push(Number((2 + 0.8 * xv + u).toFixed(8)));
  }
  const z: number[] = [];
  for (let t = 0; t < n; t++) z.push(Number((0.3 * (z[t - 1] ?? 0) + 0.5 * (z[t - 4] ?? 0) - 0.15 * (z[t - 5] ?? 0) + nrm()).toFixed(8)));
  return { y, x, z };
}

const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) < tol, `${what}: ${a} vs ${b}`);

// Reference values from statsmodels 0.15 tsa.arima.model.ARIMA(...).fit() on the same series.
test('ARMA(1,1) with a mean matches statsmodels ARIMA, forecasts included', () => {
  const { y, x } = sim();
  const yy = y.map((v, i) => v - 0.8 * x[i]);
  const f = fitArima(yy, { p: 1, d: 0, q: 1 });
  assert.ok(!('error' in f));
  if ('error' in f) return;
  near(f.logLik, -422.26366165949304, 1e-6, 'log-likelihood');
  near(f.beta[0], 1.9274279688310632, 1e-4, 'mean');
  near(f.ar[0], 0.6023618367700232, 1e-4, 'ar');
  near(f.ma[0], 0.3966387386437673, 1e-4, 'ma');
  near(f.sigma2, 0.9740453357172463, 1e-4, 'sigma2');
  const fc = forecastArima(f, yy, 3);
  assert.ok(!('error' in fc));
  if ('error' in fc) return;
  [3.3469358345770495, 2.782485334151311, 2.4424818939491044].forEach((m, i) => near(fc[i].mean, m, 1e-4, `forecast ${i + 1}`));
  [0.986937351465252, 1.395042893478905, 1.5161995209243169].forEach((s, i) => near(fc[i].sd, s, 1e-4, `forecast sd ${i + 1}`));
});

test('regression with ARMA errors (an outside predictor) matches statsmodels', () => {
  const { y, x } = sim();
  const f = fitArima(y, { p: 1, d: 0, q: 1 }, { exog: x.map((v) => [v]) });
  assert.ok(!('error' in f));
  if ('error' in f) return;
  near(f.logLik, -422.14400569832947, 1e-6, 'log-likelihood');
  near(f.beta[0], 1.928611511649912, 1e-4, 'constant');
  near(f.beta[1], 0.820494134102587, 1e-4, 'slope');
  near(f.ar[0], 0.6024189011249952, 1e-4, 'ar');
  near(f.ma[0], 0.3959873214925836, 1e-4, 'ma');
  assert.match((forecastArima(f, y, 2, { exog: x.map((v) => [v]) }) as { error: string }).error, /future period/);
  const fc = forecastArima(f, y, 2, { exog: x.map((v) => [v]), exogFuture: [[1], [0]] });
  assert.ok(!('error' in fc));
});

test('seasonal AR (1,0,0)x(1,0,0,4) matches statsmodels', () => {
  const { z } = sim();
  const f = fitArima(z, { p: 1, d: 0, q: 0, P: 1, Q: 0, s: 4 }, { constant: false });
  assert.ok(!('error' in f));
  if ('error' in f) return;
  near(f.logLik, -400.87954748911534, 1e-6, 'log-likelihood');
  near(f.ar[0], 0.3801356178845049, 1e-4, 'ar');
  near(f.sar[0], 0.5871993463458818, 1e-4, 'seasonal ar');
  const { phi } = expandPolys(f.ar, [], f.sar, [], 4);
  assert.equal(phi.length, 5);
  near(phi[4], -f.ar[0] * f.sar[0], 1e-12, 'cross term');
});

test('building blocks: stationarity transform, Lyapunov start, psi weights with differencing, smoother', () => {
  const c = constrainStationary([10, -10]);
  assert.ok(c.every((v) => Number.isFinite(v)));
  const P = lyapunov([[0.5]], [[1]])!;
  near(P[0][0], 1 / (1 - 0.25), 1e-12, 'AR(1) variance');
  const psi = arimaPsi({ ar: [], ma: [], sar: [], sma: [], order: { p: 0, d: 1, q: 0, P: 0, Q: 0, s: 0 } }, 4);
  assert.deepEqual(psi, [1, 1, 1, 1]);
  // Smoother on a local level with a gap fills the gap between its neighbours.
  const ss = { Z: [1], T: [[1]], R: [[1]], Q: [[0.1]], H: 1, a0: [0], P0: [[1e6]] };
  const y = [1, 1.2, NaN, 1.1, 0.9];
  const f = kalmanFilter(y, ss);
  assert.equal(f.nObs, 4);
  const sm = kalmanSmoother(y, ss, f);
  assert.ok(sm[2][0] > 0.9 && sm[2][0] < 1.2);
});

test('auto order by BIC and rolling ARMA cases', () => {
  const { z } = sim();
  const a = autoArima(z.slice(0, 200), { maxP: 1, maxQ: 1, d: 0 });
  assert.ok(!('error' in a));
  const dates = z.map((_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  const cases = armaForecastCases([{ where: 'AAA', dates: dates.slice(0, 160), values: z.slice(0, 160) }], { params: { maxP: 1, maxQ: 1, window: 120, minTrain: 120 }, benchmark: 'naive', horizons: [1, 3], sample: { from: '2009-06' }, target: 'cpi_yoy_m' });
  assert.ok(cases.length > 50);
  assert.ok(cases.every((c) => c.model.sd !== undefined && c.others && 'seasonal_naive' in c.others));
  const d1 = fitArima(z.map((_, i) => i * 0.1 + z[i]), { p: 1, d: 1, q: 0 });
  assert.ok(!('error' in d1) && Math.abs(d1.beta[0] - 0.1) < 0.1);
});
