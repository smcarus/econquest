import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bisCbAssetsUrl, bisCreditGapUrl, bisCreditSeries, bisDsrUrl, bisPropertyUrl, bisUsdCreditUrl, parseBisCbAssets, parseBisUsdCredit, parseBisCreditGap, parseBisDsr, parseBisProperty } from '../src/utils/bisCreditCycle.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { countrySeries } from '../src/utils/seriesHistory.ts';

// Rows as the BIS answered on 2026-11-07 (Brazil).
const GAP = `FREQ,BORROWERS_CTY,TC_BORROWERS,TC_LENDERS,CG_DTYPE,COLLECTION,DECIMALS,UNIT_MEASURE,UNIT_MULT,TIME_FORMAT,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK
Q,BR,P,A,C,E,1,770,0,,,2025-Q4,1.7781,A,F,
Q,BR,P,A,C,E,1,770,0,,,2026-Q1,0.7199,A,F,
Q,BR,P,A,B,E,1,770,0,,,2025-Q4,91.2526,A,F,
Q,BR,P,A,B,E,1,770,0,,,2026-Q1,91.8091,A,F,
Q,BR,P,A,A,E,1,770,0,,,2025-Q4,93.030679486621,A,F,
Q,BR,P,A,A,E,1,770,0,,,2026-Q1,92.528995240837,A,F,`;
const DSR = `FREQ,BORROWERS_CTY,DSR_BORROWERS,COLLECTION,UNIT_MEASURE,UNIT_MULT,DECIMALS,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_CONF,OBS_PRE_BREAK,OBS_STATUS
Q,BR,P,,367,0,1,Brazil - Private non-financial sector,2025-Q4,29.3,F,,A
Q,BR,P,,367,0,1,Brazil - Private non-financial sector,2026-Q1,29.8,F,,A`;
const SPP = `FREQ,REF_AREA,VALUE,UNIT_MEASURE,UNIT_MULT,BREAKS,COVERAGE,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK
Q,BR,R,628,0,,,,2026-Q1,92.2275,A,F,
Q,BR,R,628,0,,,,2026-Q2,91.6772,A,F,
Q,BR,R,771,0,,,,2026-Q1,0.9362,A,F,
Q,BR,R,771,0,,,,2026-Q2,0.6215,A,F,
Q,BR,N,628,0,,,,2026-Q1,221.6281,A,F,
Q,BR,N,771,0,,,,2026-Q2,5.2362,A,F,`;

test('parsers: gap is C (= ratio A minus trend B), DSR private sector, real house prices y/y', () => {
  const g = parseBisCreditGap(GAP);
  assert.deepEqual(g.creditGap, { '2025Q4': 1.7781, '2026Q1': 0.7199 });
  assert.equal(g.creditToGdp?.['2025Q4'], 93.0307);
  assert.ok(Math.abs(93.030679 - 91.2526 - 1.7781) < 1e-3);
  assert.deepEqual(parseBisDsr(DSR).dsr, { '2025Q4': 29.3, '2026Q1': 29.8 });
  assert.deepEqual(parseBisProperty(SPP).realHousePricesYoy, { '2026Q1': 0.9362, '2026Q2': 0.6215 });
  assert.deepEqual(parseBisCreditGap('not csv'), {});
  assert.deepEqual(parseBisDsr(null), {});
  assert.match(bisCreditGapUrl('BR'), /WS_CREDIT_GAP\/Q\.BR\.P\.A\.\/all\?format=csv$/);
  assert.match(bisDsrUrl('BR'), /WS_DSR\/Q\.BR\.\.\/all/);
  assert.match(bisPropertyUrl('BR'), /WS_SPP\/Q\.BR\.\.\/all/);
});

test('series: quarterly, oldest first; Missing says why', () => {
  const cycle = { fetchedAt: '2026-11-07T05:00:00Z', ...parseBisCreditGap(GAP), ...parseBisDsr(DSR) };
  const out = bisCreditSeries(cycle, true);
  const gap = out.find((s) => s.id === 'credit_gap');
  assert.ok(gap && 'points' in gap);
  assert.equal(gap.freq, 'quarterly');
  assert.deepEqual(gap.points.map((p) => p.date), ['2025Q4', '2026Q1']);
  const hp = out.find((s) => s.id === 'house_prices_real_yoy');
  assert.ok(hp && 'reason' in hp && /publishes no real house prices/.test(hp.reason));
  assert.ok(bisCreditSeries(null, true).every((s) => 'reason' in s && s.reason === 'The BIS has not answered yet'));
  assert.ok(bisCreditSeries(cycle, false).every((s) => 'reason' in s && /Not a BIS reporting country/.test(s.reason)));
});

test('country series include the credit cycle for a BIS country', () => {
  const set = countrySeries('BRA', { bisCredit: { fetchedAt: '2026-11-07T05:00:00Z', ...parseBisCreditGap(GAP) } });
  assert.ok(set.series.some((s) => s.id === 'credit_gap' && s.source === 'BIS credit-to-GDP gaps'));
  assert.ok(set.missing.some((s) => s.id === 'debt_service_ratio'));
});

// PB3: central bank total assets (WS_CBTA). Layout as the BIS answered on 2026-11-14 (United States
// 2026-Q2: 21.24% of GDP, US$ 6735.645 bn); a break-adjusted (B) and an unadjusted (N) row both
// present for one quarter, B wins.
const CBTA = `FREQ,REF_AREA,COMP_METHOD,UNIT_MEASURE,CURRENCY,TRANSFORMATION,UNIT_MULT,DECIMALS,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS
Q,US,A,XDF_R_B1GQ,_Z,B,0,2,,2026-Q1,21.9,A
Q,US,A,XDF_R_B1GQ,_Z,N,0,2,,2026-Q1,22.5,A
Q,US,A,XDF_R_B1GQ,_Z,N,0,2,,2026-Q2,21.24,A
Q,US,A,USD,USD,B,9,3,,2026-Q2,6735.645,A
Q,US,A,USD,USD,N,6,3,,2026-Q1,6700000,A
Q,US,A,XDC,USD,B,9,3,,2026-Q2,6735.645,A
Q,US,A,USD,USD,B,9,3,,2026-Q3,NaN,A`;

test('central bank assets: % of GDP and US$ bn, break-adjusted rows first', () => {
  const p = parseBisCbAssets(CBTA);
  assert.deepEqual(p.cbAssetsGdp, { '2026Q1': 21.9, '2026Q2': 21.24 });
  assert.deepEqual(p.cbAssetsUsd, { '2026Q1': 6700, '2026Q2': 6735.645 });
  assert.deepEqual(parseBisCbAssets('<html>'), {});
  assert.match(bisCbAssetsUrl('US'), /WS_CBTA\/Q\.US\/all\?format=csv$/);
  const out = bisCreditSeries({ fetchedAt: '2026-11-14T00:00:00Z', ...p }, true);
  const gdp = out.find((s) => s.id === 'cb_assets_gdp');
  assert.ok(gdp && 'points' in gdp && gdp.unit === '% of GDP' && gdp.source === 'BIS central bank total assets');
  const none = bisCreditSeries({ fetchedAt: '2026-11-14T00:00:00Z' }, true).find((s) => s.id === 'cb_assets_usd');
  assert.ok(none && 'reason' in none);
  assert.equal(none.reason, 'The BIS publishes no central bank assets in dollars series for this country');
});

test('Data health row bis_cb_assets reads the sample answer', async () => {
  const rep = await checkConnections({ env: {}, only: ['bis_cb_assets'], fetchFn: async () => new Response(CBTA, { status: 200 }) } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].sample || '', /central bank assets 21\.2% of GDP, US\$ 6,735\.6 bn \(2026 Q2\)/);
  const bad = await checkConnections({ env: {}, only: ['bis_cb_assets'], fetchFn: async () => new Response('a,b\n1,2', { status: 200 }) } as never);
  assert.equal(bad.results[0].state, 'bad_reply');
});

// PB4: US dollar credit to non-banks (WS_GLI), rows as the BIS answered on 2026-11-14 (Brazil).
const GLI = `FREQ,CURR_DENOM,BORROWERS_CTY,BORROWERS_SECTOR,LENDERS_SECTOR,L_POS_TYPE,L_INSTR,UNIT_MEASURE,TITLE,UNIT_MULT,DECIMALS,COLLECTION,AVAILABILITY,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_PRE_BREAK,OBS_CONF
Q,USD,BR,N,A,I,B,USD,x,6,0,,A,2026-Q1,197689.632,A,,F
Q,USD,BR,N,A,I,B,USD,x,6,0,,A,2026-Q2,199599.546,A,,F
Q,USD,BR,N,B,I,G,USD,x,6,0,,A,2026-Q2,108485.496,A,,F
Q,USD,BR,N,A,I,B,771,x,0,2,,A,2026-Q1,7.934,A,,F
Q,USD,BR,N,A,I,B,771,x,0,2,,A,2026-Q2,6.906,A,,F`;

test('dollar credit to non-banks: US$ bn and y/y, bank-loan-only rows left out', () => {
  const p = parseBisUsdCredit(GLI);
  assert.deepEqual(p.usdCredit, { '2026Q1': 197.6896, '2026Q2': 199.5995 });
  assert.deepEqual(p.usdCreditYoy, { '2026Q1': 7.934, '2026Q2': 6.906 });
  assert.match(bisUsdCreditUrl('BR'), /WS_GLI\/Q\.USD\.BR\.N\.A\.I\.B\.\/all\?format=csv$/);
  assert.deepEqual(parseBisUsdCredit(''), {});
});

test('Data health row bis_usd_credit', async () => {
  const rep = await checkConnections({ env: {}, only: ['bis_usd_credit'], fetchFn: async () => new Response(GLI, { status: 200 }) } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].sample || '', /dollar credit to non-banks US\$ 199\.6 bn, 6\.9% on a year earlier \(2026 Q2\)/);
});
