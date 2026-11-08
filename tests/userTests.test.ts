import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadSpecs, sha256 } from '../src/utils/backtestRun.ts';
import type { BacktestSpec } from '../src/utils/backtest.ts';
import { buildUserTest, methodParams, userTestId } from '../src/utils/userTests.ts';
import { listUserTests, registerUserTest } from '../src/server/userTestStore.ts';

const root = path.resolve(import.meta.dirname, '..');
const appSpecs = loadSpecs(path.join(root, 'docs/validation/preregistered')).map((s) => s.spec).filter((s): s is BacktestSpec => Boolean(s));
const methods = methodParams(appSpecs);

const good = {
  name: 'Taylor gap, wider band',
  method: 'taylor_gap',
  hypothesis: 'With a 2-point band the central bank still cuts within 6 months more often than in any month.',
  params: { publicationLagMonths: '1', windowMonths: '6', bandPts: '2', rStar: '1', inflationWeight: '0,5', outputWeight: '0.5', gapPublishMonth: '4' },
  from: '2000-01',
  passMark: { minCases: '30', minLiftPts: '10', maxPValue: '0.05', minYears: '8' },
  knownLimits: 'Same data as the app test.\n\n',
};

test('each method offers the threshold names of the app\'s latest test of it, with its values as a reference', () => {
  const taylor = methods.find((m) => m.method === 'taylor_gap')!;
  assert.equal(taylor.appTest, 'taylor_gap v2');
  assert.ok(taylor.keys.includes('outputWeight'));
  assert.equal(new Set(methods.map((m) => m.method)).size, methods.length);
});

test('nothing is filled in: every blank threshold and pass mark is named', () => {
  const r = buildUserTest({ name: 'x test', method: 'taylor_gap', hypothesis: 'short' }, methods, '2026-11-08', 'Sam');
  assert.equal(r.ok, false);
  if (r.ok) return;
  const codes = r.problems.map((p) => ('key' in p ? `${p.code}:${p.key}` : p.code));
  assert.ok(codes.includes('hypothesis'));
  assert.ok(codes.includes('param_missing:bandPts'));
  assert.ok(codes.includes('from'));
  assert.ok(codes.includes('pass_missing:maxPValue'));
});

test('a complete form becomes a frozen spec dated by the server, with the stricter method when years are set', () => {
  const r = buildUserTest(good, methods, '2026-11-08', 'Sam (sam)');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.spec.id, 'mine_taylor_gap_wider_band');
  assert.equal(r.spec.registeredOn, '2026-11-08');
  assert.equal(r.spec.params.inflationWeight, 0.5);
  assert.equal(r.spec.framework, 2);
  assert.deepEqual(r.spec.knownLimits, ['Same data as the app test.']);
  assert.equal(userTestId('  Ça marche!  '), 'mine_ca_marche');
  const bad = buildUserTest({ ...good, passMark: { ...good.passMark, maxPValue: '5' } }, methods, '2026-11-08', 'Sam');
  assert.ok(!bad.ok);
});

test('saving freezes the test: fingerprint in the manifest, no second save, a changed file is refused', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'econquest-user-tests-'));
  try {
    const r = buildUserTest(good, methods, '2026-11-08', 'Sam');
    assert.ok(r.ok);
    if (!r.ok) return;
    const saved = registerUserTest(dir, r.spec);
    assert.ok(saved.ok);
    if (!saved.ok) return;
    const file = path.join(dir, saved.file);
    assert.equal(saved.hash, sha256(readFileSync(file)));
    assert.deepEqual(registerUserTest(dir, { ...r.spec, hypothesis: 'changed after seeing the answer, which is not allowed' }), { ok: false, error: 'exists' });
    const listed = listUserTests(dir);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].spec?.id, 'mine_taylor_gap_wider_band');
    writeFileSync(file, readFileSync(file, 'utf8').replace('2-point', '3-point'));
    const tampered = listUserTests(dir);
    assert.equal(tampered[0].spec, null);
    assert.match(tampered[0].problem || '', /changed after it was registered/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
