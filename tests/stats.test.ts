import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adf, alignPair, crossCorrelation, fPValue, granger, hpFilter, ols, pearson, periodKey, rollingCorrelation, shiftPeriod, toFreq, transform, tPValue } from '../src/utils/stats.ts';

// Deterministic noise (mulberry32 + Box-Muller), so the tests never flicker.
function rng(seed: number) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
}
const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('t and F p-values match the textbook tables', () => {
  close(tPValue(2.228, 10), 0.05, 0.001, 't(10)');
  close(tPValue(1.96, 1e6), 0.05, 0.001, 'normal limit');
  close(fPValue(4.96, 1, 10), 0.05, 0.001, 'F(1,10)');
  close(fPValue(3.1, 2, 60), 0.052, 0.003, 'F(2,60)');
});

test('periods: months to quarters and years, moving back a year', () => {
  assert.equal(periodKey('2026-05-14', 'monthly'), '2026-05');
  assert.equal(periodKey('2026-05', 'quarterly'), '2026-Q2');
  assert.equal(periodKey('2026-Q3', 'annual'), '2026');
  assert.equal(periodKey('2026', 'monthly'), null);
  assert.equal(shiftPeriod('2026-02', -12, 'monthly'), '2025-02');
  assert.equal(shiftPeriod('2026-Q1', -1, 'quarterly'), '2025-Q4');
  assert.deepEqual(toFreq([{ date: '2026-01', value: 1 }, { date: '2026-02', value: 2 }, { date: '2026-03', value: 3 }, { date: '2026-04', value: 10 }], 'quarterly'), [
    { date: '2026-Q1', value: 2 },
    { date: '2026-Q2', value: 10 },
  ]);
});

test('a monthly and an annual series line up on years, only where both exist', () => {
  const monthly = Array.from({ length: 36 }, (_, i) => ({ date: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, value: i }));
  const annual = [{ date: '2024', value: 5 }, { date: '2025', value: 6 }, { date: '2027', value: 9 }];
  const { freq, pairs } = alignPair(monthly, annual);
  assert.equal(freq, 'annual');
  assert.deepEqual(pairs.map((p) => p.date), ['2024', '2025']);
  close(pairs[0].x, 17.5, 1e-9);
});

test('transforms: year-on-year, index and z-score', () => {
  const pts = Array.from({ length: 24 }, (_, i) => ({ date: shiftPeriod('2024-01', i, 'monthly'), value: 100 + i }));
  const yoy = transform(pts, 'yoy', 'monthly');
  assert.equal(yoy.length, 12);
  close(yoy[0].value, 12, 1e-9);
  assert.equal(transform(pts, 'index100', 'monthly')[23].value, 123);
  const z = transform(pts, 'zscore', 'monthly');
  close(z.reduce((s, p) => s + p.value, 0), 0, 1e-9);
});

test('correlation and regression recover a known line, and say when too short', () => {
  const n = rng(1);
  const x = Array.from({ length: 60 }, (_, i) => i / 10);
  const y = x.map((v) => 2 + 0.5 * v + 0.05 * n());
  const c = pearson(x, y);
  assert.ok(!('error' in c) && c.r > 0.99 && c.p < 1e-6);
  const r = ols(y, x.map((v) => [v]));
  assert.ok(!('error' in r));
  if (!('error' in r)) {
    close(r.coef[0], 2, 0.05);
    close(r.coef[1], 0.5, 0.02);
    assert.ok(r.r2 > 0.98);
  }
  assert.match((pearson([1, 2, 3], [1, 2, 3]) as { error: string }).error, /at least 8/);
  assert.match((pearson([1, 1, 1, 1, 1, 1, 1, 1], [1, 2, 3, 4, 5, 6, 7, 8]) as { error: string }).error, /does not move/);
});

test('lead/lag: x leading y by 3 periods peaks at lag 3; rolling correlation has one point per window', () => {
  const n = rng(2);
  const x = Array.from({ length: 120 }, () => n());
  const pairs = x.map((_, i) => ({ date: String(i), x: x[i], y: i >= 3 ? x[i - 3] + 0.2 * n() : n() }));
  const cc = crossCorrelation(pairs, 6);
  const top = cc.reduce((a, b) => (b.r > a.r ? b : a));
  assert.equal(top.lag, 3);
  assert.equal(rollingCorrelation(pairs, 24).length, 120 - 23);
});

test('ADF: white noise is stationary, a random walk is not', () => {
  const n = rng(3);
  const noise = Array.from({ length: 200 }, () => n());
  let w = 0;
  const walk = Array.from({ length: 200 }, () => (w += n()));
  const a = adf(noise);
  const b = adf(walk);
  assert.ok(!('error' in a) && a.stationary, 'noise');
  assert.ok(!('error' in b) && !b.stationary, 'walk');
  if (!('error' in a)) close(a.critical['5%'], -2.876, 0.01);
  assert.match((adf([1, 2, 3]) as { error: string }).error, /at least 20/);
});

// Reference values from statsmodels 0.15 adfuller(regression='c', autolag='AIC', maxlag=12*(n/100)^0.25):
// the lag is chosen on one sample and the test refitted at that lag on every usable row.
const ADF_WALK = [0.001, 0.3, 0.026, -0.865, -1.319, -2.311, -2.251, -0.911, -1.403, -2.023, -1.534, -1.177, -1.071, -2.002, -2.031, -1.336, -2.68, -3.137, -5.039, -6.328, -8.17, -8.405, -9.673, -9.401, -9.245, -9.431, -11.948, -12.487, -12.535, -12.422, -13.952, -14.43, -15.408, -16.217, -15.156, -15.964, -15.996, -15.112, -15.696, -15.807, -15.697, -15.633, -16.858, -16.782, -15.423, -16.97, -16.111, -15.992, -16.633, -14.633, -13.87, -15.07, -14.995, -14.419, -14.607, -13.924, -13.991, -13.324, -11.885, -12.561, -12.358, -12.821, -12.694, -13.881, -14.46, -14.656, -13.758, -12.612, -13.936, -14.731, -14.084, -16.076, -16.539, -16.637, -15.38, -14.69, -15.017, -15.386, -15.636, -14.113, -14.541, -14.844, -14.492, -14.612, -14.81, -15.924, -15.935, -16.379, -15.213, -14.56, -14.584, -13.915, -14.255, -13.203, -13.209, -12.625, -13.916, -13.569, -15.258, -17.293];
const ADF_AR2 = [0.0, 0.0, 0.034, 1.411, 3.334, 4.199, 4.91, 4.998, 5.825, 6.208, 7.395, 6.256, 7.609, 7.848, 9.054, 9.591, 9.843, 10.593, 11.868, 12.528, 13.088, 14.251, 14.131, 12.905, 12.651, 11.486, 8.907, 6.453, 3.985, 0.822, -2.992, -5.812, -7.468, -9.376, -11.57, -12.855, -13.438, -14.415, -14.534, -13.843, -13.741, -14.296, -14.195, -14.063, -12.869, -13.516, -14.143, -15.489, -18.085, -19.66, -20.698, -22.428, -22.219, -21.812, -20.918, -19.947, -18.238, -18.424, -17.391, -16.327, -17.253, -17.049, -17.476, -16.847, -17.099, -17.055, -16.765, -17.484, -17.158, -17.315, -16.803, -17.116, -16.033, -14.981, -14.307, -13.023, -10.919, -7.69, -7.018, -4.831, -3.07, -1.628, -1.385, 0.426, 0.143, 1.112, 2.813, 2.355, 2.333, 0.876, 0.385, 1.217, 3.509, 3.126, 3.047, 3.597, 5.427, 6.929, 7.482, 8.507];
test('ADF matches statsmodels: lag by AIC on one sample, statistic on the full sample', () => {
  const a = adf(ADF_WALK);
  const b = adf(ADF_AR2);
  assert.ok(!('error' in a) && !('error' in b));
  if ('error' in a || 'error' in b) return;
  assert.equal(a.lags, 0);
  assert.equal(a.n, 99);
  close(a.stat, -2.022621638468061, 1e-6);
  assert.equal(a.stationary, false);
  assert.equal(b.lags, 2);
  assert.equal(b.n, 97);
  close(b.stat, -1.4872678905903447, 1e-6);
  close(b.critical['5%'], -2.8918, 0.002);
});

test('Granger: past x predicts y when it should, and not the other way round', () => {
  const n = rng(4);
  const x = Array.from({ length: 150 }, () => n());
  const y = x.map((_, i) => (i >= 1 ? 0.8 * x[i - 1] : 0) + 0.3 * n());
  const fwd = granger(x.map((_, i) => ({ date: String(i), x: x[i], y: y[i] })), 2);
  const back = granger(x.map((_, i) => ({ date: String(i), x: y[i], y: x[i] })), 2);
  assert.ok(!('error' in fwd) && fwd.p < 0.001);
  assert.ok(!('error' in back) && back.p > 0.01);
});

test('HP filter: a straight line is its own trend; cycle sums near zero', () => {
  const line = Array.from({ length: 40 }, (_, i) => 3 + 0.2 * i);
  const hp = hpFilter(line, 1600);
  assert.ok(!('error' in hp));
  if (!('error' in hp)) for (let i = 0; i < 40; i++) close(hp.trend[i], line[i], 1e-6);
  const n = rng(5);
  const wavy = Array.from({ length: 80 }, (_, i) => i * 0.1 + Math.sin(i / 3) + 0.1 * n());
  const h2 = hpFilter(wavy, 1600);
  if (!('error' in h2)) close(h2.cycle.reduce((s, v) => s + v, 0), 0, 1e-6);
});
