import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adAs, debtPath, PE, YN } from '../src/utils/macroLab.ts';

test('AD-AS: no shock leaves output at potential; the equilibrium sits on both lines', () => {
  const none = adAs({ b: 1, c: 0.5, d: 0, s: 0 });
  if ('error' in none) assert.fail();
  assert.equal(none.y, YN);
  assert.equal(none.p, PE);
  const r = adAs({ b: 1, c: 0.5, d: 4, s: 1 });
  if ('error' in r) assert.fail();
  assert.ok(Math.abs(r.p - (PE - 1 * (r.y - YN - 4))) < 1e-9, 'on AD');
  assert.ok(Math.abs(r.p - (PE + 0.5 * (r.y - YN) + 1)) < 1e-9, 'on SRAS');
  assert.deepEqual(r.longRun, { y: YN, p: PE + 4 });
  const supply = adAs({ b: 1, c: 0.5, d: 0, s: 2 });
  if ('error' in supply) assert.fail();
  assert.ok(supply.y < YN && supply.p > PE);
  assert.match(supply.reading, /opposite directions/);
  assert.ok('error' in adAs({ b: 0, c: 1, d: 0, s: 0 }));
});

test('debt equation: the stabilising primary balance holds debt steady', () => {
  const r = debtPath({ d0: 60, r: 6, g: 4, pb: (60 * 2) / 104, years: 10 });
  if ('error' in r) assert.fail();
  assert.ok(r.path.every((p) => Math.abs(p.d - 60) < 1e-9));
  const up = debtPath({ d0: 60, r: 6, g: 4, pb: 0, years: 10 });
  if ('error' in up) assert.fail();
  assert.ok(up.path[10].d > 60);
  assert.match(up.reading, /below it, so debt rises/);
  assert.ok('error' in debtPath({ d0: 1, r: 1, g: 1, pb: 0, years: 0 }));
});
