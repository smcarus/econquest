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
