/**
 * IMF reserves and balance of payments: structure reading, indicator matching by IMF name, data
 * reading (SDMX-JSON), series choice, readings and the whole pull with a fake network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IMF_MEASURES,
  buildExternal,
  formatImfPeriod,
  imfMissing,
  imfSentence,
  lastFourQuarters,
  matchIndicators,
  normalizePeriod,
  parseImfData,
  parseImfStructure,
  pickSeries,
  pullImfExternal,
  reserveCover,
  seriesKey,
  toUsdBn,
} from '../src/utils/imfReserves.ts';
import { imfStructureJson, imfDataJson, imfFetch } from './helpers/imfFixtures.ts';

test('reads a dataset structure: dimension order, indicator dimension and its names', () => {
  const s = parseImfStructure('BOP', imfStructureJson('BOP'))!;
  assert.deepEqual(s.dims, ['COUNTRY', 'BOP_ACCOUNTING_ENTRY', 'INDICATOR', 'UNIT', 'FREQUENCY']);
  assert.equal(s.indicatorDim, 'INDICATOR');
  assert.equal(s.countryDim, 'COUNTRY');
  assert.equal(s.freqDim, 'FREQUENCY');
  assert.ok(s.indicators.some((c) => c.id === 'CAB' && c.name === 'Current account, Total'));
  assert.equal(parseImfStructure('BOP', { data: { dataStructures: [] } }), null);
  assert.equal(parseImfStructure('BOP', 'nonsense'), null);
});

test('matches indicators by IMF name and leaves look-alikes out', () => {
  const bop = parseImfStructure('BOP', imfStructureJson('BOP'))!;
  assert.deepEqual(matchIndicators(bop, IMF_MEASURES.currentAccount).map((c) => c.id), ['CAB']);
  assert.deepEqual(matchIndicators(bop, IMF_MEASURES.imports).map((c) => c.id), ['GS']);
  const il = parseImfStructure('IL', imfStructureJson('IL'))!;
  assert.deepEqual(matchIndicators(il, IMF_MEASURES.reserves).map((c) => c.id), ['TRA']);
  assert.equal(seriesKey(bop, 'BRA', 'Q', ['CAB']), 'BRA.*.CAB.*.Q');
});

test('reads SDMX-JSON data with names, scale and periods, oldest first', () => {
  const series = parseImfData(imfDataJson('IL', 'BRA'));
  assert.equal(series.length, 2);
  const usd = series.find((s) => s.dims.UNIT.id === 'USD')!;
  assert.equal(usd.scale, 6);
  assert.equal(usd.key, 'BRA.TRA.USD.M');
  assert.equal(usd.obs[0].period, '2024-08');
  assert.equal(usd.obs[usd.obs.length - 1].period, '2025-09');
  assert.equal(normalizePeriod('2025-M09'), '2025-09');
  assert.equal(normalizePeriod('2025Q2'), '2025-Q2');
  assert.deepEqual(parseImfData({}), []);
});

test('picks the US dollar series at the right frequency, never domestic currency', () => {
  const series = parseImfData(imfDataJson('IL', 'BRA'));
  assert.equal(pickSeries(series, IMF_MEASURES.reserves)!.dims.UNIT.id, 'USD');
  const xdcOnly = series.filter((s) => s.dims.UNIT.id !== 'USD');
  assert.equal(pickSeries(xdcOnly, IMF_MEASURES.reserves), null);
});

test('four quarters in a row, else nothing', () => {
  const q = (p: string, v: number) => ({ period: p, value: v });
  assert.deepEqual(lastFourQuarters([q('2024-Q3', 1), q('2024-Q4', 2), q('2025-Q1', 3), q('2025-Q2', 4)]), { sum: 10, through: '2025-Q2' });
  assert.equal(lastFourQuarters([q('2024-Q2', 1), q('2024-Q4', 2), q('2025-Q1', 3), q('2025-Q2', 4)]), null);
});

test('builds reserves, months of imports and current account % of GDP by the stated rules', () => {
  const il = parseImfData(imfDataJson('IL', 'BRA'));
  const bopCa = parseImfData(imfDataJson('BOP', 'BRA', 'CAB'));
  const bopIm = parseImfData(imfDataJson('BOP', 'BRA', 'GS'));
  const e = buildExternal(
    'BRA',
    { reserves: pickSeries(il, IMF_MEASURES.reserves), currentAccount: pickSeries(bopCa, IMF_MEASURES.currentAccount), imports: pickSeries(bopIm, IMF_MEASURES.imports) },
    { '2025': 2400 }
  );
  assert.equal(e.reserves!.usdBn, 345);
  assert.equal(e.reserves!.period, '2025-09');
  assert.equal(e.reserves!.change12mPct, 2.4); // 345000 / 337000 - 1
  assert.equal(e.imports4q!.usdBn, 400);
  assert.equal(e.monthsOfImports, 10.3); // 345 / (400 / 12) = 10.35
  assert.equal(e.currentAccount!.usdBn, -18);
  assert.equal(e.currentAccount4q!.usdBn, -60);
  assert.equal(e.currentAccount4q!.pctGdp, -2.5);
  assert.equal(e.currentAccount4q!.gdpYear, '2025');
  assert.equal(reserveCover(2.5), 'thin');
  assert.equal(reserveCover(4), 'adequate');
  assert.equal(reserveCover(10.3), 'ample');
  assert.match(imfSentence(e), /Official reserves \$345\.0bn \(IMF, Sep 2025\), \+2\.4% on the year, 10\.3 months of imports: ample\. Current account -2\.5% of GDP over the four quarters to Q2 2025/);
});

test('no stated scale means Missing with that reason, not a guessed unit', () => {
  const il = parseImfData(imfDataJson('IL', 'BRA')).map((s) => ({ ...s, scale: undefined }));
  const e = buildExternal('BRA', { reserves: pickSeries(il, IMF_MEASURES.reserves) }, null);
  assert.equal(e.reserves, undefined);
  assert.match(imfMissing(e, 'reserves').help, /did not state the unit/);
  assert.equal(toUsdBn(1500, 6), 1.5);
  assert.equal(toUsdBn(1500, undefined), null);
});

test('the whole pull, through the structures, with a fake IMF', async () => {
  const urls: string[] = [];
  const r = await pullImfExternal({ fetchFn: imfFetch(urls), env: {} }, 'BRA');
  assert.equal(r.external.reserves!.usdBn, 345);
  assert.equal(r.external.currentAccount4q!.pctGdp, -2.5);
  assert.equal(r.steps.filter((s) => s.ok).length, 3);
  assert.ok(urls.some((u) => u.includes('/structure/dataflow/IMF.STA/BOP/')));
  assert.ok(urls.some((u) => u.includes('/data/dataflow/IMF.STA/BOP/+/BRA.*.CAB.*.Q')));
  // Structures are reused on the next country.
  const again: string[] = [];
  await pullImfExternal({ fetchFn: imfFetch(again), env: {}, structures: r.structures }, 'BRA');
  assert.ok(!again.some((u) => u.includes('/structure/')));
});

test('a series key in .env is used as given, without reading the structure', async () => {
  const urls: string[] = [];
  const r = await pullImfExternal({ fetchFn: imfFetch(urls), env: { IMF_RESERVES_KEY: '{ISO3}.TRA.USD.M', IMF_CA_KEY: '{ISO3}.*.CAB.*.Q', IMF_IMPORTS_KEY: '{ISO3}.*.GS.*.Q' } }, 'BRA');
  assert.ok(!urls.some((u) => u.includes('/structure/')));
  assert.ok(urls.some((u) => u.endsWith('/IL/+/BRA.TRA.USD.M?attributes=dsd&measures=all')));
  assert.equal(r.external.reserves!.usdBn, 345);
  assert.match(r.steps[0].note, /series key from IMF_RESERVES_KEY/);
});

test('no IMF answer leaves every figure Missing with the reason', async () => {
  const r = await pullImfExternal(
    {
      fetchFn: async () => {
        throw new TypeError('fetch failed');
      },
      env: {},
    },
    'BRA'
  );
  assert.equal(r.external.reserves, undefined);
  assert.match(imfMissing(r.external, 'reserves').help, /IL structure: fetch failed/);
  assert.equal(imfMissing(undefined, 'reserves').short, 'IMF did not answer');
  assert.equal(formatImfPeriod('2025-Q2'), 'Q2 2025');
});
