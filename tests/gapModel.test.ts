import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGapModel, gapPathCsv, GAP_PARAMS, GAP_START, type GapInput } from '../src/utils/gapModel.ts';

// Numbers below are test inputs typed for these checks only; the app ships none.
const params = { b1: 0.8, b2: 0.1, b3: 0.05, c1: 0.7, c2: 0.2, c3: 0.1, rho: 0.7, phiP: 1.5, phiY: 0.5, d1: 0.9, d2: 0.5, rStar: 1, pStar: 3, iForeign: 4 };
const steady: GapInput = { params, start: { y0: 0, p0: 3, i0: 4, q0: 0 }, quarters: 12 };

test('a blank parameter is Missing and nothing is simulated; the model has no defaults', () => {
  const r = runGapModel({ params: {}, start: {}, quarters: 8 });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.missing.length, GAP_PARAMS.length + GAP_START.length);
  assert.ok(r.missing.every((m) => m.startsWith('Missing: enter')));
  const one = runGapModel({ ...steady, params: { ...params, phiP: '' } });
  assert.equal(one.ok, false);
  if (!one.ok) assert.deepEqual(one.missing, ['Missing: enter this parameter: Policy response to inflation (phiP)']);
});

test('words, bad quarters and bad shocks are refused with a plain reason', () => {
  const r = runGapModel({ ...steady, params: { ...params, b1: 'abc' }, quarters: 0, shocks: [{ variable: 'i', quarter: 99, size: 1 }] });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.problems.some((p) => p.includes('Output gap persistence')));
    assert.ok(r.problems.some((p) => p.startsWith('Quarters must be')));
    assert.ok(r.problems.some((p) => p.startsWith('Shock quarter')));
  }
});

test('at the steady state with no shocks, nothing moves', () => {
  const r = runGapModel(steady);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.path.length, 13);
  for (const pt of r.path) {
    assert.ok(Math.abs(pt.y) < 1e-12 && Math.abs(pt.p - 3) < 1e-12 && Math.abs(pt.i - 4) < 1e-12 && Math.abs(pt.q) < 1e-12, JSON.stringify(pt));
  }
  assert.equal(r.unstable, false);
});

test('a one-point policy rate rise in quarter 1: the rate jumps, the currency strengthens, the output gap and then inflation fall', () => {
  const r = runGapModel({ ...steady, shocks: [{ variable: 'i', quarter: 1, size: 1 }] });
  assert.ok(r.ok);
  if (!r.ok) return;
  const [, q1, q2, q3] = r.path;
  assert.ok(Math.abs(q1!.i - 5) < 1e-12); // 0.7*4 + 0.3*4 + 1
  assert.ok(Math.abs(q1!.q - -0.5) < 1e-12); // 0.9*0 - 0.5*(5-4)
  assert.ok(q2!.y < 0); // dearer money and a stronger currency
  assert.ok(q3!.p < 3);
});

test('hand-worked first quarter with every term switched on', () => {
  const r = runGapModel({ params, start: { y0: 1, p0: 4, i0: 5, q0: 2 }, quarters: 1 });
  assert.ok(r.ok);
  if (!r.ok) return;
  const q1 = r.path[1]!;
  const y = 0.8 * 1 - 0.1 * (5 - 4 - 1) + 0.05 * 2; // 0.9
  const p = 0.7 * 4 + 0.3 * 3 + 0.2 * 1 + 0.1 * (2 - 2); // 3.9
  const i = 0.7 * 5 + 0.3 * (1 + 3 + 1.5 * (p - 3) + 0.5 * y);
  const q = 0.9 * 2 - 0.5 * (i - 4);
  assert.ok(Math.abs(q1.y - y) < 1e-12 && Math.abs(q1.p - p) < 1e-12 && Math.abs(q1.i - i) < 1e-12 && Math.abs(q1.q - q) < 1e-12);
});

test('an exploding setting stops and says so instead of drawing nonsense', () => {
  const r = runGapModel({ ...steady, params: { ...params, b1: 5 }, start: { y0: 1, p0: 3, i0: 4, q0: 0 }, quarters: 40 });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.unstable, true);
    assert.ok(r.path.length < 41);
  }
});

test('numbers typed with a comma decimal are read; CSV has one row per quarter', () => {
  const r = runGapModel({ ...steady, params: { ...params, b1: '0,8' }, quarters: 2 });
  assert.ok(r.ok);
  if (r.ok) {
    const csv = gapPathCsv(r.path).split('\n');
    assert.equal(csv[0], 'quarter,output_gap_pct,inflation_pct,policy_rate_pct,exchange_rate_gap_pct');
    assert.equal(csv.length, 4);
    assert.equal(csv[1], '0,0,3,4,0');
  }
});
