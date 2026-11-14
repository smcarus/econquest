import test from 'node:test';
import assert from 'node:assert/strict';
import { latestInflation } from '../src/utils/latestInflation.ts';
import { economistBrief } from '../src/utils/countryNotes.ts';
import { marketsMacroBrief } from '../src/utils/marketsMacro.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { markLive } from './helpers/live.ts';

const monthly = { month: '2026-09', yoyPct: 4.58, basis: 'national' as const, long: 'Banco Central do Brasil, IPCA 12-month inflation', pulledAt: '2026-11-05T00:00:00Z' };

test('the monthly reading wins over the IMF yearly average, and each reading names itself', () => {
  const open = { imfIndicators: { years: { 'imf.cpiInflationPct': '2025' } } } as never;
  assert.deepEqual(latestInflation(open, 5.0, { oecdCpi: monthly as never }), { pct: 4.58, source: 'Banco Central do Brasil, IPCA 12-month inflation, Sep 2026', monthly: true });
  assert.deepEqual(latestInflation(open, 5.0, {}), { pct: 5.0, source: 'IMF WEO, 2025 average', monthly: false });
  assert.equal(latestInflation(open, undefined, {}), undefined);
});

test('Summary and Markets & signals give the same real policy rate from the same inflation figure', () => {
  const openData = buildBaselineOpenData('BRA');
  openData.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-05T00:00:00Z' } as never;
  openData.imfIndicators.cpiInflationPct = 5.0;
  openData.monetaryAndMarket.policyRatePct = 13.75;
  markLive(openData, ['imf.cpiInflationPct', 'market.policyRatePct']);
  const run = { iso3: 'BRA', countryName: 'Brazil', openData } as never;
  const peer = { iso3: 'BRA', oecdCpi: monthly } as never;
  const summary = economistBrief(run, new Date('2026-11-05T00:00:00Z'), [peer]);
  const markets = marketsMacroBrief(run, [peer]);
  const realRow = summary.groups.flatMap((g) => g.rows).find((r) => r.label === 'Real policy rate')!;
  assert.equal(realRow.value, '9.2%');
  assert.match(summary.judgements.join('\n'), /policy rate is 9\.2% above inflation \(Banco Central do Brasil, IPCA 12-month inflation, Sep 2026\)/);
  assert.match(markets.judgements.join('\n'), /the real rate is 9\.2%/);
  // No monthly figure: both fall back to the IMF yearly average and say so.
  const fallback = economistBrief(run, new Date('2026-11-05T00:00:00Z'), []);
  assert.match(fallback.judgements.join('\n'), /8\.8% above inflation \(IMF WEO, (\d{4} average|yearly average)\)/);
});
