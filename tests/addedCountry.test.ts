import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toAddedCountry } from '../src/utils/workspaceSession.ts';
import { buildBaselineOpenData, registerCustomSovereignInCatalog, SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines.ts';

test('an added country saved by an older version keeps its names and loses its typed-in figures', () => {
  const old = { iso3: 'ind', countryName: 'India', region: 'Asia-Pacific', currencyCode: 'inr', debtToGdpPct: 81.9, cds5YSpreadBps: 82, policyRatePct: 6.5 };
  assert.deepEqual(toAddedCountry(old), { iso3: 'IND', countryName: 'India', region: 'Asia-Pacific', currencyCode: 'INR' });
  assert.equal(toAddedCountry({ iso3: 'XX', countryName: 'Nowhere' }), null);
  assert.equal(toAddedCountry(null), null);
});

test('an added country starts with every figure Missing, like the built-in ones', () => {
  const item = registerCustomSovereignInCatalog({ iso3: 'KEN', countryName: 'Kenya', region: 'Africa', currencyCode: 'KES' });
  assert.ok(SOVEREIGN_CATALOG.some((c) => c.iso3 === 'KEN'));
  for (const v of [item.yield10YPct, item.cds5YBps, item.debtToGdpPct, item.fxReservesMonths]) assert.ok(Number.isNaN(v));
  const snap = buildBaselineOpenData('KEN');
  assert.equal(snap.countryName, 'Kenya');
  for (const v of [snap.imfIndicators.debtToGdpPct, snap.monetaryAndMarket.policyRatePct, snap.monetaryAndMarket.fxYtdChangePct, snap.worldBankIndicators.fxReservesMonthsImport])
    assert.ok(Number.isNaN(v));
});

test('adding a built-in country again keeps its catalog entry', () => {
  const before = SOVEREIGN_CATALOG.find((c) => c.iso3 === 'BRA')!;
  const item = registerCustomSovereignInCatalog({ iso3: 'BRA', countryName: 'Brasil', region: '', currencyCode: '' });
  assert.equal(item, before);
  assert.equal(SOVEREIGN_CATALOG.filter((c) => c.iso3 === 'BRA').length, 1);
});
