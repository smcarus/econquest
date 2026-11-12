import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBaselineOpenData, buildDefaultAssessmentRun, recomputeDerivedOpenDataAnalytics } from '../src/data/presetsAndBaselines.ts';
import { MODEL_FIELD_MISSING } from '../src/utils/councilResult.ts';

const run = buildDefaultAssessmentRun('BRA');

test('the starting run holds no findings, debate, scenarios or analogies before a council run', () => {
  assert.equal(run.subAgents.length, 9);
  for (const a of run.subAgents) {
    assert.equal(a.findingsSummary, MODEL_FIELD_MISSING, a.agentName);
    assert.deepEqual(a.keyMetrics, [], a.agentName);
    assert.ok(Number.isNaN(a.riskScore) && Number.isNaN(a.confidence), a.agentName);
  }
  for (const d of Object.values(run.deskDebates)) {
    assert.equal(d.consensusSummary, MODEL_FIELD_MISSING);
    assert.deepEqual(d.rounds, []);
    assert.deepEqual(d.minorityDissents, []);
  }
  assert.deepEqual(run.cascadeSteps, []);
  assert.deepEqual(run.crisisAnalogs, []);
  for (const c of Object.values(run.regimeDistribution)) assert.ok(Number.isNaN(c.probabilityPct) && c.narrative === MODEL_FIELD_MISSING);
  assert.equal(run.policyDocumentTitle, undefined);
});

test('the starting review and report carry no built-in shocks, notes, calls or trade ideas', () => {
  assert.ok(Number.isNaN(run.croState.energyInflationShockPct));
  assert.ok(Number.isNaN(run.croState.debtServicingSpreadBps));
  assert.equal(run.croState.croNotes, '');
  const sc = run.supremeCouncil!;
  assert.notEqual(sc.fromModel, true);
  assert.equal(sc.executiveSummary, MODEL_FIELD_MISSING);
  assert.equal(sc.marketTranslationLayer.tradeExpressions.length, 4);
  for (const t of sc.marketTranslationLayer.tradeExpressions) assert.equal(t.instrument, MODEL_FIELD_MISSING);
  assert.equal(sc.policyResearcherReport.policyRecommendations.length, 3);
  for (const r of sc.policyResearcherReport.policyRecommendations) assert.equal(r.action, MODEL_FIELD_MISSING);
  // The old template's tell-tale figures.
  const text = JSON.stringify(run);
  for (const s of ['15%', '+15.0%', '0.68', '0.62', '24.5', 'Article IV', 'Taper Tantrum']) assert.ok(!text.includes(s), s);
});

test('derived figures: only the real policy rate, never a curve or reserve ratio from fixed multipliers', () => {
  const s = buildBaselineOpenData('MEX');
  s.monetaryAndMarket.policyRatePct = 7;
  s.imfIndicators.cpiInflationPct = 4;
  s.monetaryAndMarket.sovereign10YBondYieldPct = 9;
  s.worldBankIndicators.fxReservesMonthsImport = 4;
  recomputeDerivedOpenDataAnalytics(s);
  assert.equal(s.monetaryAndMarket.realPolicyRatePct, 3);
  assert.deepEqual(s.yieldCurve.tenors, []);
  assert.ok(Number.isNaN(s.debtRollover.greenspanGuidottiRatioPct));
  assert.ok(Number.isNaN(s.debtRollover.liquidFxReservesUsdBn));
  assert.ok(Number.isNaN(s.dsaAnalytics.rMinusGDifferentialPct));
});
