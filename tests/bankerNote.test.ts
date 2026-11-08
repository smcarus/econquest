import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessBand, bankerBrief, buildBankerSections, BANKER_SECTIONS } from '../src/utils/bankerNote.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';
import { markLive } from './helpers/live.ts';

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

test('no built-in maturity profile: financing figures without a source read Missing', () => {
  const b = bankerBrief(runFor('BRA'), [], NOW);
  const need = b.groups.find((g) => g.title === 'Financing need')!;
  for (const r of need.rows) {
    assert.equal(r.value, 'Missing', `${r.label} should be missing`);
    assert.equal(r.verified, false);
    assert.ok(r.help);
  }
  assert.ok(!JSON.stringify(b).includes('sample maturity profile'));
});

test('peers are ranked by official yield only, this issuer included when its yield is official', () => {
  const run = runFor('BRA', (s) => {
    s.monetaryAndMarket.sovereign10YBondYieldPct = 12;
    s.official10YYield = { valuePct: 12, period: '2026-10-30', source: 'Tesouro Direto', seriesId: 'x', url: 'u', frequency: 'daily' };
    s.dataStatus = { verifiedLiveSources: ['Tesouro Direto'], checkedAt: '2026-11-04T12:00:00Z' };
  });
  const b = bankerBrief(run, [peer('MEX', 'Mexico', 9.1, 'official', '2026-09'), peer('TUR', 'Turkey', 28.4), peer('BRA', 'Brazil', 99)], NOW);
  const rows = b.groups.find((g) => g.title === 'Peers by 10Y yield')!.rows;
  // Turkey's yield has no real source, so it is left out rather than compared.
  assert.deepEqual(rows.map((r) => r.label), ['Brazil (this issuer)', 'Mexico']);
  assert.equal(rows[1].source, 'official, Sep 2026 avg');
  assert.ok(b.judgements.some((j) => j.startsWith('It pays more than 1 of 1 watchlist peers')));
});

test('distress signals are counted from the stated tests, and untested ones are named', () => {
  const none = bankerBrief(runFor('MEX'), [], NOW);
  assert.ok(none.judgements.some((j) => /Distress tests not run/.test(j)));
  const calm = bankerBrief(
    runFor('MEX', (s) => {
      markLive(s);
      s.worldBankIndicators.fxReservesMonthsImport = 6;
      s.imfIndicators.debtToGdpPct = 50;
    }),
    [],
    NOW
  );
  assert.ok(calm.judgements.some((j) => /No signs of distress on the tests that could be run\. Not checked, figures missing: CDS/.test(j)));
  const bad = bankerBrief(
    runFor('EGY', (s) => {
      markLive(s);
      s.ownCds5Y = { bps: 1400, date: '2026-11-03', source: 'LSEG' };
      s.monetaryAndMarket.cds5YSpreadBps = 1400;
      s.dataStatus!.verifiedLiveSources.push('Own CDS data (LSEG, 5Y CDS)');
      s.worldBankIndicators.fxReservesMonthsImport = 2;
    }),
    [],
    NOW
  );
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

test('the United States issuer note lists the latest Treasury auctions from its watchlist row, or says they are not saved yet', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang.ts');
  const { ES, ES_TEXT } = await import('../src/i18n/es/index.ts');
  const { FR, FR_TEXT } = await import('../src/i18n/fr/index.ts');
  const none = bankerBrief(runFor('USA'), [], NOW).groups.find((g) => g.title === 'Recent US Treasury auctions')!;
  assert.equal(none.rows.length, 1);
  assert.equal(none.rows[0].value, 'Missing');
  assert.ok(!bankerBrief(runFor('BRA'), [], NOW).groups.some((g) => g.title === 'Recent US Treasury auctions'), 'United States only');
  const us = {
    ...peer('USA', 'United States', 4.1),
    ustAuctions: {
      pulledAt: '2026-11-04T06:00:00Z',
      latest: [
        { date: '2026-10-06', tenor: '13w', label: '13-week bill', reopening: false, bidToCover: 2.9, highYieldPct: 3.845 },
        { date: '2026-10-08', tenor: '10y', label: '10-year note', reopening: true, bidToCover: 2.31, highYieldPct: 4.112, indirectPct: 70, priorAvgBidToCover: 2.58 },
      ],
    },
  } as WatchlistItem;
  const rows = bankerBrief(runFor('USA'), [us], NOW).groups.find((g) => g.title === 'Recent US Treasury auctions')!.rows;
  assert.deepEqual(
    rows.map((r) => `${r.label} | ${r.value}`),
    [
      '13-week bill auction, 2026-10-06 | bid-to-cover 2.90, high yield 3.845%',
      '10-year note auction (reopening), 2026-10-08 | bid-to-cover 2.31, high yield 4.112%, indirect 70.0%; demand weaker than recent auctions',
    ]
  );
  assert.ok(rows.every((r) => r.verified && /Fiscal Data/.test(r.source)));
  // Every line reads in Spanish and French too.
  const lines = [none.title, none.rows[0].label, none.rows[0].source, none.rows[0].help!, ...rows.flatMap((r) => [r.label, r.value])];
  attachLanguage('es', ES, ES_TEXT);
  assert.deepEqual(lines.filter((l) => translateText(l, 'es') === l), [], 'no Spanish');
  assert.equal(translateText(rows[1].label, 'es'), 'subasta de nota a 10 años (reapertura), 2026-10-08');
  attachLanguage('fr', FR, FR_TEXT);
  assert.deepEqual(lines.filter((l) => translateText(l, 'fr') === l), [], 'no French');
  assert.equal(translateText(rows[1].value, 'fr'), 'taux de couverture 2.31, rendement maximal 4.112%, indirects 70.0% ; demande plus faible que lors des adjudications récentes'.replace(' ; ', '; '));
});
