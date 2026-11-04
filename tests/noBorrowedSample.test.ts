import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBaselineOpenData, buildDefaultAssessmentRun, SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines.ts';

const OWN_SNAPSHOT = ['BRA', 'TUR', 'EGY'];
const OTHERS = SOVEREIGN_CATALOG.map((c) => c.iso3).filter((i) => !OWN_SNAPSHOT.includes(i));

test('countries without their own snapshot get no borrowed contracts or headlines', () => {
  assert.ok(OTHERS.includes('POL') && OTHERS.includes('ZAF'));
  for (const iso3 of OTHERS) {
    const s = buildBaselineOpenData(iso3);
    assert.deepEqual(s.polymarketContracts, [], iso3);
    assert.deepEqual(s.gdeltMetrics.topHeadlines, [], iso3);
    assert.equal(s.gdeltMetrics.articleCount24h, 0, iso3);
    const item = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)!;
    assert.equal(s.gdeltMetrics.conflictIntensityIndex, Math.round(item.geopoliticalRisk * 100), iso3);
  }
  // Brazil keeps its own sample entries.
  assert.ok(buildBaselineOpenData('BRA').polymarketContracts.length > 0);
});

test('the sample council for another country never mentions Brazil and quotes no odds', () => {
  for (const iso3 of OTHERS) {
    const text = JSON.stringify(buildDefaultAssessmentRun(iso3));
    assert.doesNotMatch(text, /Brazilian|Brasil|Selic|Copom|valorinternational/, iso3);
    assert.doesNotMatch(text, /Polymarket (Adverse Policy Probability|Odds|Adverse Odds|Fiscal Target Odds|Target Odds) =/, iso3);
  }
});
