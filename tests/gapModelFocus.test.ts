import test from 'node:test';
import assert from 'node:assert/strict';
import { runGapModel } from '../src/utils/gapModel.ts';
import { gapRunFocus } from '../src/utils/gapModelFocus.ts';
import { cleanFocus } from '../src/utils/explain.ts';

const params = { b1: 0.8, b2: 0.1, b3: 0.05, c1: 0.7, c2: 0.2, c3: 0.1, rho: 0.7, phiP: 1.5, phiY: 0.5, d1: 0.8, d2: 0.3, rStar: 1, pStar: 2, iForeign: 3 };
const start = { y0: 0, p0: 3, i0: 4, q0: 0 };

test('a gap model run goes to the council labelled as your model, with every parameter', () => {
  const shocks = [{ variable: 'p' as const, quarter: 2, size: 1 }];
  const run = runGapModel({ params, start, shocks, quarters: 8 });
  assert.ok(run.ok);
  const f = gapRunFocus(run, shocks, 'BRA', 'Brazil');
  assert.match(f.label, /^Your model/);
  assert.match(f.source!, /not a forecast/);
  assert.match(f.detail!.join(' '), /Quarter 8, the last: output gap/);
  assert.match(f.detail!.join(' '), /b1 0\.8/);
  assert.match(f.detail!.join(' '), /iForeign 3/);
  assert.match(f.detail!.join(' '), /\+1 points to inflation in quarter 2/);
  // Survives the server's clean-up unchanged in substance (no line cut, at most 8 lines).
  const clean = cleanFocus(f)!;
  assert.equal(clean.detail!.length, f.detail!.length);
  assert.ok(f.detail!.length <= 8);
  assert.ok(f.detail!.every((d) => d.length <= 240));
});
