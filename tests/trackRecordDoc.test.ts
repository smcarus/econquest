import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trackRecordFromRepo } from '../src/utils/trackRecordDocNode.ts';
import { pFromSummary, trackRows, type TestFile } from '../src/utils/trackRecordDoc.ts';
import type { RecordedVerdict } from '../src/utils/methodsDoc.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

test('docs/TRACK_RECORD.md is up to date (run npm run docs:track-record after adding a verdict or a test file)', () => {
  assert.equal(readFileSync(new URL('../docs/TRACK_RECORD.md', import.meta.url), 'utf8'), trackRecordFromRepo(root));
});

test('pFromSummary takes the largest p written (worst horizon decides), and none when the summary states none', () => {
  assert.equal(pFromSummary('lift 19.8 points, p 1.3e-11 with cases counted as independent'), 1.3e-11);
  assert.equal(pFromSummary('1 month ahead relative RMSE 0.83 (p 0.001) but ...; 2 months ahead 1.201 (p 0.719)'), 0.719);
  assert.equal(pFromSummary('12 months ahead 4.321 (p 1), better in 11 of 46.'), 1);
  assert.equal(pFromSummary('Lift 35.8 points, positive in 24 of 24 countries.'), undefined);
  assert.equal(pFromSummary('the p-value was not kept'), undefined);
});

test('Holm across every verdict: a row\'s own p wins over the summary, a missing p counts as 1 and reads as not recorded', () => {
  const v = (id: string, verdict: RecordedVerdict['verdict'], summary: string, extra: Partial<RecordedVerdict> = {}): RecordedVerdict => ({ id, version: 1, ranAt: '2026-11-07T00:00Z', verdict, summary, ...extra });
  const files: TestFile[] = [{ kind: 'backtest', id: 'a', version: 1, file: 'a.json', maxPValue: 0.05 }];
  const rows = trackRows([v('a', 'passed', 'p 0.9', { p: 0.01 }), v('b', 'passed', 'no p here'), v('c', 'failed', 'p 0.5')], files);
  const a = rows.find((r) => r.verdict.id === 'a')!;
  assert.equal(a.p, 0.01);
  assert.equal(a.adjusted, 0.03); // 3 tests: 3 x 0.01
  assert.equal(a.holds, true);
  const b = rows.find((r) => r.verdict.id === 'b')!;
  assert.equal(b.p, undefined);
  assert.equal(b.adjusted, undefined);
  assert.equal(b.holds, undefined);
  assert.equal(rows.find((r) => r.verdict.id === 'c')!.adjusted, 1);
});

test('the carry pass does not survive the correction across the record, and the page says so', () => {
  const md = trackRecordFromRepo(root);
  assert.match(md, /Passes that do not hold after it: [^\n]*fx_carry v1/);
  assert.match(md, /\| fx_carry v1 \| Signal test \|[^\n]*\| No \(0\.05\) \|/);
});

test('the page says how long before each run its test was written down', async () => {
  const { trackRecordMarkdown, daysBeforeRun } = await import('../src/utils/trackRecordDoc');
  const v = { id: 'a', version: 1, ranAt: '2026-11-06T10:00:00Z', verdict: 'failed' as const, summary: 'p 0.4', method: 2 };
  const files = [{ kind: 'backtest' as const, id: 'a', version: 1, file: 'a.json', registeredOn: '2026-11-06' }];
  const md = trackRecordMarkdown([v], files, []);
  assert.match(md, /1 of the 1 tests were written down on the day they ran or the day before \(1 on the same day\)/);
  assert.match(md, /specified and hashed before the\nrun/);
  assert.equal(daysBeforeRun({ key: 'k', verdict: v, kind: 'backtest', alpha: 0.05, file: { ...files[0], registeredOn: '2026-10-01' } }), 36);
  assert.equal(daysBeforeRun({ key: 'k', verdict: v, kind: 'backtest', alpha: 0.05 }), undefined);
});
