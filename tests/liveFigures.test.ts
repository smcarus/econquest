import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasFigure, missingReason, missingSummary, toLive } from '../src/utils/liveFigures.ts';
import type { WatchlistItem } from '../src/types/council.ts';

const row = (o: Partial<WatchlistItem> = {}): WatchlistItem =>
  ({
    iso3: 'MEX', countryName: 'Mexico', region: '', currencyCode: 'MXN', focusTheme: '',
    geopoliticalRisk: 0.4, sovereignRisk: 0.5, macroRisk: 0.5, compositeRisk: 0.47, alertStatus: 'ELEVATED',
    yield10YPct: 9.1, cds5YBps: 120, debtToGdpPct: 55, fxReservesMonths: 4.6, cpiInflationPct: 4.8, policyRatePct: 9.15,
    ...o,
  }) as WatchlistItem;

test('a row with no recorded sources keeps no figures at all (old saved rows, the built-in catalogue)', () => {
  const l = toLive(row());
  for (const k of ['compositeRisk', 'alertStatus', 'yield10YPct', 'cds5YBps', 'debtToGdpPct', 'fxReservesMonths', 'cpiInflationPct', 'policyRatePct'] as const)
    assert.equal(l[k], undefined, k);
  assert.equal(l.countryName, 'Mexico');
});

test('figures from real sources stay: IMF, World Bank, official yield, your CDS, AI estimates', () => {
  const l = toLive(
    row({ debtSource: 'live', reservesSource: 'live', cpiSource: 'live', policyRateSource: 'ai_estimate', yield10YSource: 'official', yield10YPeriod: '2026-08', cds5YSource: 'own', riskSource: 'live' })
  );
  assert.deepEqual(
    [l.debtToGdpPct, l.fxReservesMonths, l.cpiInflationPct, l.policyRatePct, l.yield10YPct, l.cds5YBps, l.compositeRisk],
    [55, 4.6, 4.8, 9.15, 9.1, 120, 0.47]
  );
  assert.equal(toLive(row({ yield10YSource: 'sample' })).yield10YPct, undefined);
  assert.equal(toLive(row({ cpiSource: 'sample' })).cpiInflationPct, undefined);
});

test('missing reasons say whether to set something up or that a free feed did not answer', () => {
  assert.equal(missingReason('cds', 'MEX').kind, 'setup');
  assert.match(missingReason('cds', 'MEX').help, /CDS_FEED=csv/);
  assert.equal(missingReason('policy', 'MEX').short, 'Needs Gemini key');
  assert.equal(missingReason('debt', 'MEX').kind, 'unreachable');
  assert.equal(missingReason('yield', 'MEX').kind, 'unreachable'); // free FRED series exists
  assert.equal(missingReason('yield', 'EGY').kind, 'setup'); // no free series
  assert.equal(missingReason('yield', 'TUR').short, 'Needs EVDS key');
});

test('summary counts missing figures across the list, setup reason first', () => {
  const s = missingSummary([row({ cpiSource: 'live', iso3: 'MEX' }), row({ iso3: 'EGY' })]);
  const y = s.find((r) => r.key === 'yield')!;
  assert.equal(y.count, 2);
  assert.equal(y.reason.kind, 'setup'); // Egypt needs setup, which beats Mexico's feed outage
  assert.equal(s.find((r) => r.key === 'cpi')!.count, 1);
  assert.ok(hasFigure(row({ cds5YSource: 'ai_estimate' }), 'cds'));
});
