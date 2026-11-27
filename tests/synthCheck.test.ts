import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runSynthCheck, seeded, synthCheckSummary, type SynthCheckSpec } from '../src/utils/synthCheck';
import type { SynthHistory } from '../src/utils/syntheticControl';

const dir = 'docs/validation/models';
const raw = fs.readFileSync(`${dir}/synthetic_control.json`);

test('the test file is registered: its hash is in the manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
  assert.equal(manifest.files['synthetic_control.json'], createHash('sha256').update(raw).digest('hex'));
  const spec = JSON.parse(raw.toString('utf8')) as SynthCheckSpec;
  assert.deepEqual(spec.params.outcomes, ['cpi_imf', 'gdp_growth', 'debt_gdp']);
  assert.equal(spec.passMark.minFalseAlarm, 0.05);
  assert.equal(spec.passMark.maxFalseAlarm, 0.15);
});

test('the seeded generator gives the same draws for the same seed', () => {
  const a = seeded(7);
  const b = seeded(7);
  const xs = Array.from({ length: 5 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

/** Made-up countries: two shared waves plus each country's own persistent noise, so twins can fit. */
function made(n: number): SynthHistory[] {
  const rnd = seeded(42);
  const f1 = Array.from({ length: 50 }, (_, t) => Math.sin(t / 3));
  const f2 = Array.from({ length: 50 }, (_, t) => Math.cos(t / 5));
  return Array.from({ length: n }, (_, i) => {
    const a = rnd() * 2;
    const b = rnd() * 2;
    let e = 0;
    const pts = f1.map((v, t) => {
      e = 0.5 * e + (rnd() - 0.5) * 0.4;
      return { date: String(1980 + t), value: 4 + a * v + b * f2[t] + e };
    });
    return { iso3: `C${String(i).padStart(2, '0')}`, name: `C${i}`, series: { cpi_imf: { points: pts } } };
  });
}

const small: SynthCheckSpec = {
  id: 'x', version: 1, registeredOn: '', registeredBy: '', hypothesis: '', method: '', knownLimits: [],
  params: { seed: 1, perOutcome: 12, outcomes: ['cpi_imf'], fromYear: 1995, alpha: 0.1, jumpSd: 3, maxDrawsPerOutcome: 200 },
  passMark: { minFalseAlarm: 0, maxFalseAlarm: 0.5, minRunsPerOutcome: 12 },
};

test('the test runs on made-up countries, the same way twice, and finds a large made-up jump more often than none', () => {
  const hs = made(30);
  const a = runSynthCheck(small, hs, '2029-06-30');
  const b = runSynthCheck(small, hs, '2029-06-30');
  assert.deepEqual(a, b);
  const o = a.outcomes[0];
  assert.equal(o.runs, 12, synthCheckSummary(a));
  assert.ok(o.falseAlarmRate !== null && o.power !== null);
  assert.ok(o.power! > o.falseAlarmRate!, synthCheckSummary(a));
  assert.equal(a.verdict, 'passed');
  assert.match(synthCheckSummary(a), /cpi_imf: 12 runs/);
});

test('too few saved histories, or too few runs, is not a verdict', () => {
  assert.equal(runSynthCheck(small, made(5), '2029-06-30').verdict, 'not_run');
  const r = runSynthCheck({ ...small, params: { ...small.params, maxDrawsPerOutcome: 3 } }, made(30), '2029-06-30');
  assert.equal(r.verdict, 'not_run');
  assert.match(r.reason!, /runs could be made/);
});
