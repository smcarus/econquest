import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelCouncil } from '../src/utils/councilResult';
import { buildDefaultAssessmentRun } from '../src/data/presetsAndBaselines';

test('modelCouncil hides the built-in starting report and keeps one a model wrote', () => {
  const run = buildDefaultAssessmentRun('BRA');
  assert.ok(run.supremeCouncil, 'every country starts with a built-in report');
  assert.equal(modelCouncil(run), undefined);
  const written = { ...run, supremeCouncil: { ...run.supremeCouncil!, fromModel: true } };
  assert.equal(modelCouncil(written)?.fromModel, true);
  assert.equal(modelCouncil(null), undefined);
});

test('coherence and composite: a number when there is one, Missing with the reason otherwise (never a built-in 0.91 or 0.62)', async () => {
  const { coherenceText, compositeText, COHERENCE_MISSING } = await import('../src/utils/councilResult.ts');
  assert.equal(coherenceText({ globalCoherenceScore: 0.734 }), '73%');
  assert.equal(coherenceText({ globalCoherenceScore: null }), COHERENCE_MISSING);
  assert.equal(coherenceText(undefined), COHERENCE_MISSING);
  assert.equal(compositeText({ compositeRiskScore: 0.45 }), '0.45 / 1.00');
  assert.equal(compositeText({ compositeRiskScore: 0.45 }, 100), '45/100');
  assert.match(compositeText(undefined), /^Missing/);
});
