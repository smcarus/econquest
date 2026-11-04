import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessBand, bankerBrief, buildBankerSections, BANKER_SECTIONS } from '../src/utils/bankerNote.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

const NOW = new Date('2026-11-04T12:00:00Z');

function runFor(iso3: string, tweak: (s: OpenDataSnapshot) => void = () => {}): CouncilAssessmentRun {
  const openData = buildBaselineOpenData(iso3);
  openData.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-04T12:00:00Z' };
  tweak(openData);
  return { iso3, countryName: openData.countryName, openData } as unknown as CouncilAssessmentRun;
}

const peer = (iso3: string, countryName: string, y: number, src?: WatchlistItem['yield10YSource'], period?: string): WatchlistItem =>
  ({ iso3, countryName, yield10YPct: y, yield10YSource: src, yield10YPeriod: period, yield10YFrequency: 'monthly' }) as WatchlistItem;

test('access bands follow the CDS thresholds', () => {
  assert.equal(accessBand(150).open, true);
  assert.match(accessBand(250).label, /high-yield/);
  assert.match(accessBand(600).label, /stressed/);
  assert.deepEqual(accessBand(1200), { label: 'distressed: market access is likely closed', open: false });
});

test('maturity and rollover figures are always labelled sample', () => {
  const b = bankerBrief(runFor('BRA'), [], NOW);
  const need = b.groups.find((g) => g.title === 'Financing need')!;
  for (const r of need.rows.filter((r) => r.label !== 'Debt / GDP')) {
    assert.equal(r.source, 'sample', `${r.label} should be sample`);
    assert.equal(r.verified, false);
  }
});

test('peers are ranked by yield, this issuer included, with their own sources', () => {
  const run = runFor('BRA', (s) => (s.monetaryAndMarket.sovereign10YBondYieldPct = 12));
  const b = bankerBrief(run, [peer('MEX', 'Mexico', 9.1, 'official', '2026-09'), peer('TUR', 'Turkey', 28.4), peer('BRA', 'Brazil', 99)], NOW);
  const rows = b.groups.find((g) => g.title === 'Peers by 10Y yield')!.rows;
  assert.deepEqual(rows.map((r) => r.label), ['Turkey', 'Brazil (this issuer)', 'Mexico']);
  assert.equal(rows[2].source, 'official, Sep 2026 avg');
  assert.equal(rows[2].verified, true);
  assert.equal(rows[0].source, 'sample');
  assert.ok(b.judgements.some((j) => j.startsWith('It pays more than 1 of 2 watchlist peers') && j.includes('mix official, estimated and sample')));
});

test('distress signals are counted from the stated tests', () => {
  const calm = bankerBrief(runFor('MEX', (s) => { s.monetaryAndMarket.cds5YSpreadBps = 120; s.worldBankIndicators.fxReservesMonthsImport = 6; s.debtRollover.greenspanGuidottiRatioPct = 250; s.imfIndicators.debtToGdpPct = 50; s.dsaAnalytics.fiscalConsolidationGapPct = 0; }), [], NOW);
  assert.match(calm.headline, /no signs of distress/);
  const bad = bankerBrief(runFor('EGY', (s) => { s.monetaryAndMarket.cds5YSpreadBps = 1400; s.worldBankIndicators.fxReservesMonthsImport = 2; s.debtRollover.greenspanGuidottiRatioPct = 60; }), [], NOW);
  assert.match(bad.headline, /market access likely closed/);
  assert.ok(bad.judgements.some((j) => j.includes('5Y CDS above 1,000 bps') && j.includes('reserves under three months of imports')));
});

test('execution window lists official dates in the next 60 days', () => {
  const b = bankerBrief(runFor('BRA'), [], NOW);
  const win = b.groups.find((g) => g.title.startsWith('Execution window'))!;
  assert.ok(win.rows.length > 0);
  assert.ok(win.rows.every((r) => r.verified || r.value === 'none on file'));
});

test('issuer note: all sections in order, toggles respected, and no investment-advice wording missing', () => {
  const all = buildBankerSections(runFor('ZAF'), [peer('MEX', 'Mexico', 9.1)], () => true, NOW);
  assert.deepEqual(all.map((s) => s.id), Object.keys(BANKER_SECTIONS));
  assert.ok(all.at(-1)!.lines.some((l) => /Not an offer/.test(l)));
  const some = buildBankerSections(runFor('ZAF'), [], (id) => id !== 'peers', NOW);
  assert.ok(!some.some((s) => s.id === 'peers'));
});
