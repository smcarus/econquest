import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importRun, savedP, type RecordFile, type RegisteredHashes } from '../src/utils/trackRecordImport';
import { forwardHash } from '../src/utils/forwardRecordStore';
import { forwardLines, trackRecordMarkdown } from '../src/utils/trackRecordDoc';
import type { ForwardBody } from '../src/utils/forwardRecord';

const base = (): RecordFile => ({
  note: 'n',
  runs: [{ ranAt: '2026-11-07T00:24Z', where: 'first run' }],
  verdicts: [{ id: 'old_test', version: 1, ranAt: '2026-11-07T00:24Z', verdict: 'failed', method: 2, summary: 'Lift 1 point, p 0.4.' }],
});
const reg: RegisteredHashes = {
  backtest: { 'old_test.json': 'h-old', 'new_test.json': 'h-new', 'changed.json': 'h-registered' },
  forecast: { 'cpi_forecast.json': 'h-cpi' },
  signal: { 'fx_x.json': 'h-fx' },
};
const r = (id: string, specHash: string, over: Record<string, unknown> = {}) => ({ id, specVersion: 1, specHash, ranAt: '2026-11-17T17:57:47.959Z', status: 'failed' as const, verdict: `${id} failed, p = 0.3.`, pValue: 0.3, framework: 2 as const, ...over });

function chain(bodies: ForwardBody[]) {
  let prev = '';
  return bodies.map((b) => {
    const hash = forwardHash(prev, b);
    prev = hash;
    return { ...b, hash };
  });
}
const call = (where: string): ForwardBody => ({ kind: 'call', test: 'new_test v1', specHash: 'h-new', where, when: '2026-09-15', what: 'x', due: '2026-11-10', at: '2026-11-07T00:25:00.000Z' });
const outcome = (where: string, hit: boolean): ForwardBody => ({ kind: 'outcome', test: 'new_test v1', where, when: '2026-09-15', hit, base: 0.6, at: '2026-11-17T16:37:22.727Z' });

test('adds each test version not on record, once, with the run\'s own verdict and p; never changes a recorded row', () => {
  const out = importRun(
    base(),
    {
      backtest: { versions: { 'old_test v1': r('old_test', 'h-old', { status: 'passed', verdict: 'now passes' }), 'new_test v1': r('new_test', 'h-new'), 'changed v1': r('changed', 'h-other'), 'unknown v1': r('unknown', 'h-u') } },
      forecast: { versions: { 'cpi_forecast v1': r('cpi_forecast', 'h-cpi', { verdict: 'Failed. 3 ahead: relative RMSE 3.4 (p 1), 12 ahead (p 0.98).', pValue: undefined }) } },
      signal: { versions: { 'fx_x v1': r('fx_x', 'h-fx', { status: 'passed', verdict: 'Passed, p 0.02.', pValue: 0.0257 }) } },
    },
    reg,
    { where: 'Test Mac', now: '2026-11-19T12:00:00.000Z' },
  );
  assert.deepEqual(out.added, ['new_test v1', 'cpi_forecast v1', 'fx_x v1']);
  const old = out.record.verdicts.find((v) => v.id === 'old_test')!;
  assert.equal(old.verdict, 'failed', 'a later run never replaces the recorded verdict');
  const nt = out.record.verdicts.find((v) => v.id === 'new_test')!;
  assert.deepEqual(nt, { id: 'new_test', version: 1, ranAt: '2026-11-17T17:57Z', verdict: 'failed', method: 2, p: 0.3, summary: 'new_test failed, p = 0.3.' });
  const cpi = out.record.verdicts.find((v) => v.id === 'cpi_forecast')!;
  assert.equal(cpi.kind, 'forecast');
  assert.equal(cpi.registerId, 'app_forecasts');
  assert.equal(cpi.p, 1, 'a forecast evaluation is judged on its worst horizon');
  assert.equal(out.record.verdicts.find((v) => v.id === 'fx_x')!.p, 0.0257);
  assert.ok(out.notes.some((n) => /changed v1 .*hash differs/.test(n)));
  assert.ok(out.notes.some((n) => /unknown v1 .*no registered test file/.test(n)));
  assert.equal(out.record.runs.length, 2);
  assert.match(out.record.runs[1].where, /^Test Mac: imported with npm run track-record:import .*added new_test v1, cpi_forecast v1, fx_x v1/);
  assert.equal(out.record.runs[1].ranAt, '2026-11-17T17:57Z');
  // Running the same import again adds nothing.
  const again = importRun(out.record, { backtest: { versions: { 'new_test v1': r('new_test', 'h-new') } } }, reg, { where: 'Test Mac', now: '2026-11-19T13:00:00.000Z' });
  assert.deepEqual(again.added, []);
  assert.equal(again.record.runs.length, 2);
});

test('savedP: backtests and signal tests use the runner\'s p; forecast evaluations the largest p in the verdict', () => {
  assert.equal(savedP('backtest', r('a', 'h', { pValue: 0.063 })), 0.063);
  assert.equal(savedP('forecast', r('a', 'h', { verdict: '1 ahead (p 0), 2 ahead (p 0.719)' })), 0.719);
});

test('the forward record is summarised only from an unbroken chain that has grown', () => {
  const lines = chain([call('MXN'), call('JPY'), call('BRL'), outcome('MXN', true), outcome('JPY', false)]);
  const out = importRun(base(), { forward: { lines, chainOk: true, badLines: 0 } }, reg, { where: 'Test Mac', now: '2026-11-19T12:00:00.000Z' });
  assert.ok(out.forwardUpdated);
  const t = out.record.forward!.tests[0];
  assert.deepEqual([t.test, t.calls, t.scored, t.hits, t.pending, t.baseRatePct], ['new_test v1', 3, 2, 1, 1, 60]);
  assert.equal(out.record.forward!.chainHead, lines[4].hash);
  assert.equal(out.record.forward!.lines, 5);
  assert.match(out.record.runs[1].where, /forward record summarised \(5 lines\)/);
  // Broken chain or a shorter file: refused, the summary on record stays.
  const broken = importRun(out.record, { forward: { lines: [...lines, ...chain([outcome('BRL', true)])], chainOk: false, badLines: 0 } }, reg, { where: 'x', now: 'y' });
  assert.ok(!broken.forwardUpdated && broken.notes.some((n) => /chain is broken/.test(n)));
  const shorter = importRun(out.record, { forward: { lines: lines.slice(0, 3), chainOk: true, badLines: 0 } }, reg, { where: 'x', now: 'y' });
  assert.ok(!shorter.forwardUpdated && shorter.notes.some((n) => /fewer than the 5/.test(n)));
  const same = importRun(out.record, { forward: { lines, chainOk: true, badLines: 0 } }, reg, { where: 'x', now: 'y' });
  assert.ok(!same.forwardUpdated && same.record.runs.length === 2);
  // The page shows one line per test from the summary.
  const md = trackRecordMarkdown(out.record.verdicts, [], out.record.runs, [], out.record.forward);
  assert.match(md, /hash chain checked, last hash `[0-9a-f]{12}`\. 2 calls have been scored so far\./);
  assert.match(md, /- \*\*new_test v1\*\*: Forward record since 2026-11-07: 3 calls, 2 scored, 1 followed \(50% against a base rate of 60%\), 1 still open; too few to lean on\./);
  assert.match(forwardLines(undefined).join(' '), /No forward results are copied/);
});

test('recordJson keeps the repository layout: one row per line, and reads back the same', async () => {
  const fs = await import('node:fs');
  const { recordJson } = await import('../src/utils/trackRecordImport');
  const text = fs.readFileSync('docs/validation/recorded-verdicts.json', 'utf8');
  const parsed = JSON.parse(text);
  assert.equal(recordJson(parsed), text, 'the file on record is in the same layout recordJson writes');
});

test('a recorded row without a p takes the p of a run on the same file with the same verdict; nothing else changes', () => {
  const rec = base();
  rec.verdicts.push({ id: 'new_test', version: 1, ranAt: '2026-11-06T02:31Z', verdict: 'passed', method: 2, summary: 'Lift 21 points, positive in 6 of 6.' });
  rec.verdicts.push({ id: 'changed', version: 1, ranAt: '2026-11-06T02:31Z', verdict: 'failed', method: 2, summary: 'Lift 1 point.' });
  const out = importRun(rec, { backtest: { versions: {
    'new_test v1': r('new_test', 'h-new', { status: 'passed', pValue: 0.00025 }),
    'old_test v1': r('old_test', 'h-old', { pValue: 0.2 }),
    'changed v1': r('changed', 'h-other', { pValue: 0.5 }),
  } } }, reg, { where: 'Test Mac', now: '2026-11-19T12:00:00.000Z' });
  assert.deepEqual(out.filled, ['new_test v1']);
  const row = out.record.verdicts.find((v) => v.id === 'new_test')!;
  assert.deepEqual(row, { id: 'new_test', version: 1, ranAt: '2026-11-06T02:31Z', verdict: 'passed', method: 2, summary: 'Lift 21 points, positive in 6 of 6.', p: 0.00025, pRanAt: '2026-11-17T17:57Z' });
  assert.equal(out.record.verdicts.find((v) => v.id === 'old_test')!.p, undefined, 'a summary that already states p keeps it');
  assert.equal(out.record.verdicts.find((v) => v.id === 'changed')!.p, undefined, 'a run from a changed file gives no p');
  assert.match(out.record.runs[1].where, /p filled in from this run for new_test v1/);
  const differs = importRun(rec, { backtest: { versions: { 'new_test v1': r('new_test', 'h-new', { status: 'failed', pValue: 0.4 }) } } }, reg, { where: 'x', now: 'y' });
  assert.deepEqual(differs.filled, [], 'a different verdict gives no p');
  const md = trackRecordMarkdown(out.record.verdicts, [], out.record.runs);
  assert.match(md, /The p \(2\.5e-4\) is from the run of 2026-11-17, on the same test file with the same verdict/);
});
