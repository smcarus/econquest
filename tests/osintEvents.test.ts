import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGeopoliticalRiskDeskSuite, OSINT_MISSING_NOTE } from '../src/utils/geopoliticalRiskEngine.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';

test('no built-in conflict alerts: the event list is empty and says why', () => {
  for (const iso3 of ['BRA', 'TUR', 'MEX', 'EGY']) {
    const suite = computeGeopoliticalRiskDeskSuite(buildBaselineOpenData(iso3));
    assert.deepEqual(suite.osintEvents, []);
    assert.equal(suite.osintEventStreamHeadline, OSINT_MISSING_NOTE);
    assert.match(OSINT_MISSING_NOTE, /^Missing: /);
    assert.doesNotMatch(JSON.stringify(suite.osintEvents), /VERIFIED_PRIMARY|MULTI_SOURCE_CORROBORATED/);
  }
});

test('an event you log appears, labelled as yours, never as verified', async () => {
  const { parseOsintIntelligenceSignal } = await import('../src/utils/geopoliticalRiskEngine.ts');
  const snap = buildBaselineOpenData('TUR');
  const logged = parseOsintIntelligenceSignal('Port strike in Istanbul', snap.iso3, snap.countryName);
  const suite = computeGeopoliticalRiskDeskSuite(snap, undefined, [logged.event]);
  assert.equal(suite.osintEvents.length, 1);
  assert.equal(suite.osintEvents[0].verificationStatus, 'ANALYST_INJECTED');
  assert.match(suite.osintEventStreamHeadline, /you logged \(not from a feed/);
});
