import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { effectiveStatus, entryBadge, entryGrade, fromProjectRecord, projectStatus, projectVerdicts, type ProjectVerdict, type ValidationReply } from '../src/utils/validationGrades.ts';
import { trackRowsFromRepo } from '../src/utils/trackRecordDocNode.ts';

const root = path.resolve(import.meta.dirname, '..');

function publishedRecord(): ProjectVerdict[] {
  const rows = trackRowsFromRepo(root).filter((r) => r.kind !== 'quest');
  return rows.map((r) => ({
    id: r.verdict.id,
    ...(r.verdict.registerId ? { registerId: r.verdict.registerId } : {}),
    kind: r.kind as ProjectVerdict['kind'],
    version: r.verdict.version,
    status: r.verdict.verdict,
    ranAt: r.verdict.ranAt,
    summary: r.verdict.summary,
    ...(r.p !== undefined ? { p: r.p } : {}),
    ...(r.adjusted !== undefined ? { adjusted: r.adjusted, holds: !!r.holds } : {}),
    alpha: r.alpha,
    tested: rows.length,
  }));
}

const fresh = (projectRecord: ProjectVerdict[]): ValidationReply => ({ results: {}, specs: [], running: false, file: 'data/local/validation/results.json', forecasts: {}, forecastTests: [], projectRecord });

test('a new install shows the published verdicts instead of Not validated', () => {
  const v = fresh(publishedRecord());
  // The crowding rule passed and holds after the Holm correction in the published record.
  assert.equal(effectiveStatus('cftc_crowding', 'not_validated', v), 'passed');
  assert.ok(fromProjectRecord('cftc_crowding', v));
  assert.equal(projectVerdicts('cftc_crowding', v.projectRecord).length, 1, 'only the latest version');
  assert.equal(projectVerdicts('cftc_crowding', v.projectRecord)[0]!.version, 2);
  const g = entryGrade('cftc_crowding', 'not_validated', v);
  assert.ok(g);
  assert.equal(g!.grade, 'validated');
  // Failed tests read Failed; the app's own forecasts (five evaluations behind one entry) fail together.
  assert.equal(effectiveStatus('taylor_gap', 'not_validated', v), 'failed');
  assert.equal(projectStatus('app_forecasts', v.projectRecord), 'failed');
  assert.equal(projectStatus('debt_fan', v.projectRecord), 'too_few_cases');
  // A carry pass that does not hold after the correction is Provisional, as on the track record page.
  assert.equal(entryBadge('fx_carry', 'not_validated', v), 'provisional');
  // An entry with no published test keeps the register's own status.
  assert.equal(effectiveStatus('risk_scorecard', 'not_validated', v), 'not_validated');
});

test("this computer's own run wins over the published record", () => {
  const v = fresh(publishedRecord());
  v.results = { taylor_gap: { id: 'taylor_gap', specVersion: 3, specHash: 'x', ranAt: '2026-12-01T00:00:00Z', status: 'passed', verdict: 'Passed.', cases: 40, hits: 30, hitRatePct: 75, baseRatePct: 35, liftPts: 40, pValue: 0.001, span: { from: '2000', to: '2026' }, series: [], data: '', sample: [] } };
  assert.equal(effectiveStatus('taylor_gap', 'not_validated', v), 'passed');
  assert.ok(!fromProjectRecord('taylor_gap', v));
});
