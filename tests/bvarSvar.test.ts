import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bvarFit, bvarResponses, cholesky, fevd, longRunImpact, maMatrices, olsVar, recursiveImpact, responses, svarFit } from '../src/utils/bvarSvar.ts';

function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

/** y1 = 0.5 y1(-1) + e1; y2 = 0.3 y1(-1) + 0.4 y2(-1) + 0.5 e1 + e2. */
function simulate(n: number, seed = 7): number[][] {
  const z = rng(seed);
  const out = [[0, 0]];
  for (let t = 1; t < n; t++) {
    const e1 = z();
    const e2 = z();
    const [a, b] = out[t - 1];
    out.push([0.5 * a + e1, 0.3 * a + 0.4 * b + 0.5 * e1 + e2]);
  }
  return out;
}

test('cholesky: rebuilds the matrix and refuses one that is not positive definite', () => {
  const S = [[4, 2], [2, 3]];
  const L = cholesky(S)!;
  assert.ok(Math.abs(L[0][0] * L[1][0] - 2) < 1e-12 && Math.abs(L[1][0] ** 2 + L[1][1] ** 2 - 3) < 1e-12);
  assert.equal(cholesky([[1, 2], [2, 1]]), null);
});

test('Bayesian VAR: the posterior mean is close to the true coefficients on a long sample, and shrinks on a short one', () => {
  const long = bvarFit(simulate(2000), 2);
  assert.ok(!('error' in long));
  if ('error' in long) return;
  assert.ok(Math.abs(long.A[0][0][0] - 0.5) < 0.06, String(long.A[0][0][0]));
  assert.ok(Math.abs(long.A[0][1][0] - 0.3) < 0.08, String(long.A[0][1][0]));
  assert.ok(Math.abs(long.A[1][0][0]) < 0.06);
  assert.deepEqual(long.prior.ownMean, [0, 0]);
  const short = bvarFit(simulate(40, 3), 4);
  const shortOls = olsVar(simulate(40, 3), 4)!;
  if ('error' in short) assert.fail(short.error);
  const size = (A: number[][][]) => A.slice(1).flat(2).reduce((s, v) => s + Math.abs(v), 0);
  assert.ok(size(short.A) < size(shortOls.A), 'longer lags are pulled towards zero');
});

test('Bayesian VAR: a random walk gets own-lag prior mean 1; responses carry posterior bands', () => {
  const z = rng(11);
  const data: number[][] = [[0, 0]];
  for (let t = 1; t < 300; t++) data.push([data[t - 1][0] + z(), 0.2 * data[t - 1][1] + z()]);
  const fit = bvarFit(data, 2);
  if ('error' in fit) assert.fail(fit.error);
  assert.deepEqual(fit.prior.ownMean, [1, 0]);
  const r = bvarResponses(fit, [0, 1], 8, 100);
  if ('error' in r) assert.fail(r.error);
  const s = r.steps[0][0];
  assert.equal(s.length, 9);
  assert.ok(s.every((x) => x.lo <= x.value + 1e-9 && x.value <= x.hi + 1e-9));
  assert.equal(r.steps[0][1][0].value, 0, 'second shock does not move the first series on impact');
});

test('recursive identification: the order decides which series moves first; FEVD rows sum to one', () => {
  const sigma = [[1, 0.5], [0.5, 1.25]];
  const B = recursiveImpact(sigma, [0, 1])!;
  assert.equal(B[0][1], 0);
  const Brev = recursiveImpact(sigma, [1, 0])!;
  assert.equal(Brev[1][0], 0);
  for (const M of [B, Brev]) {
    const BB = M.map((r) => M.map((q) => r[0] * q[0] + r[1] * q[1]));
    assert.ok(Math.abs(BB[0][1] - 0.5) < 1e-12 && Math.abs(BB[1][1] - 1.25) < 1e-12);
  }
  const A = [[[0.5, 0], [0.3, 0.4]]];
  const v = fevd(responses(A, B, 10), 11);
  for (const row of v) assert.ok(Math.abs(row[0] + row[1] - 1) < 1e-12);
  assert.ok(Math.abs(v[0][0] - 1) < 1e-12, 'first series explained only by its own shock');
});

test('long-run identification: the second shock has no lasting effect on the first series', () => {
  const A = [[[0.5, 0.2], [0.3, 0.4]]];
  const sigma = [[1, 0.3], [0.3, 1]];
  const B = longRunImpact(A, sigma)!;
  const cum = maMatrices(A, 400).reduce((s, F) => s + F[0][0] * B[0][1] + F[0][1] * B[1][1], 0);
  assert.ok(Math.abs(cum) < 1e-9, String(cum));
  assert.equal(longRunImpact([[[1, 0], [0, 0.5]]], sigma), null, 'unit root: not defined');
});

test('structural VAR: recovers the true impact of the first shock, with bands, and checks the order', () => {
  const data = simulate(600, 5);
  const r = svarFit(data, 4, { kind: 'recursive', order: [0, 1] }, 8, 60);
  if ('error' in r) assert.fail(r.error);
  assert.ok(Math.abs(r.steps[1][0][0].value - 0.5) < 0.12, String(r.steps[1][0][0].value));
  assert.ok(r.steps[1][0][0].lo < 0.5 && r.steps[1][0][0].hi > 0.5);
  assert.ok(r.lags >= 1 && r.draws > 50);
  const bad = svarFit(data, 4, { kind: 'recursive', order: [0, 0] }, 8);
  assert.ok('error' in bad);
  const lr = svarFit(data, 4, { kind: 'longrun' }, 8, 20);
  assert.ok(!('error' in lr));
  assert.ok('error' in svarFit(data.slice(0, 30), 2, { kind: 'longrun' }, 8));
});

test('the Chart Agent reads Bayesian and structural VARs from a question and runs them on the chart lines', async () => {
  const { computeChart, testsInQuestion } = await import('../src/utils/councilChart.ts');
  assert.deepEqual(testsInQuestion('fit a Bayesian VAR'), ['var', 'bvar']);
  assert.deepEqual(testsInQuestion('structural VAR with a variance decomposition'), ['var', 'svar']);
  assert.deepEqual(testsInQuestion('BVAR and SVAR please'), ['bvar', 'svar']);
  const data = simulate(200, 9);
  const months = data.map((_, k) => `${2005 + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`);
  const req = { series: [{ iso3: 'BRA', countryName: 'Brazil', id: 'a', label: 'A' }, { iso3: 'BRA', countryName: 'Brazil', id: 'b', label: 'B' }], tests: ['bvar', 'svar'], transform: 'level', why: 't', notes: [] } as any;
  const r = computeChart(req, [
    { id: 'a', label: 'A', unit: '%', freq: 'monthly', source: 'x', points: months.map((d, k) => ({ date: d, value: data[k][0] })) },
    { id: 'b', label: 'B', unit: '%', freq: 'monthly', source: 'x', points: months.map((d, k) => ({ date: d, value: data[k][1] })) },
  ] as any);
  assert.deepEqual(r.tests.map((t) => t.test), ['bvar', 'svar']);
  assert.ok(r.tests.every((t) => !t.reading.startsWith('Not run')), r.tests.map((t) => t.reading).join('\n'));
  assert.match(r.tests[0].reading, /Minnesota prior/);
  assert.match(r.tests[1].reading, /Blanchard and Quah/);
  assert.equal(r.tests[1].irf?.steps.length, 25);
});
