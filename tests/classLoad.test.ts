import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantile, reportText, runLoad, stepResult } from '../scripts/class-load';
import { CLASS_LIMITS } from '../src/server/routes/classes';

test('the load test reads times by nearest rank and passes a step only without errors and within its limit', () => {
  const xs = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(quantile(xs, 0.5), 50);
  assert.equal(quantile(xs, 0.95), 95);
  assert.equal(quantile([], 0.95), 0);
  assert.equal(stepResult('a', xs, [], 100).pass, true);
  assert.equal(stepResult('a', xs, [], 90).pass, false, '95% over the limit');
  assert.equal(stepResult('a', xs, ['HTTP 429'], 1000).pass, false, 'any error fails');
  assert.equal(stepResult('a', [], [], 1000).pass, false, 'no replies is not a pass');
  assert.ok(CLASS_LIMITS.handIn.burst >= 60, 'a teacher can load a whole class of sealed files at once');
});

test('a small class plays a whole lesson on its own copy of the app', { timeout: 180_000 }, async () => {
  const r = await runLoad({ students: 4, seconds: 3, pollSeconds: 1 });
  assert.deepEqual(
    r.steps.map((s) => s.step),
    ['Sign in, all at once', 'Open the class, all at once', 'Hand in, all at once', 'Lesson: students look every 10 s', 'Lesson: teacher marks and reads', 'Teacher loads all sealed files'],
  );
  for (const s of r.steps) assert.deepEqual(s.errors, [], s.step);
  assert.match(reportText(r), /4 students/);
});
