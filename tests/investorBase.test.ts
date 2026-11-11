import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { INVESTOR_BASE_ISO3, investorBaseReading, investorBaseTable, investorBaseValue, sheetBlocks, versionFromRows } from '../src/utils/investorBase.ts';
import { investorBaseData, readInvestorBaseWorkbook } from '../src/utils/investorBaseStore.ts';
import { investorBaseRow } from '../src/utils/countryNotes.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { licenceRowsForSource } from '../src/utils/licenceLookup.ts';
import { makeXlsx } from './helpers/makeXlsx.ts';
import type { WatchlistItem } from '../src/types/council.ts';

/** The ExtendedDataset layout: a header per block (label, then the years), one row per country. Shares, as posted. */
const Y = [2023, 2024, 2025];
const block = (label: string, rows: Array<[string, ...Array<number | string>]>) => [[label, ...Y], ...rows, []];
const str = (rows: unknown[][]) => rows.map((r) => r.map((c) => String(c)));
const SHEET = [
  ...block('Total (Billion USD)', [['Brazil', 1899, 1655.6, 2160.9], ['Zambia', 28, 28.4, '…']]),
  ...block('Foreign (Billion USD)', [['Brazil', 0.10, 0.11, 0.109]]),
  ...block('Foreign Official (Billion USD)', [['Brazil', 0.02, 0.02, 0.017], ['Zambia', 0.3, 0.33, 0.32]]),
  ...block('Foreign Banks (Billion USD)', [['Brazil', 0.001, 0.001, 0.001], ['Zambia', 0.06, 0.06, 0.06]]),
  ...block('Foreign Nonbanks (Billion USD)', [['Brazil', 0.08, 0.09, 0.091], ['Zambia', 0.1, 0.1, 0.08]]),
  ...block('Domestic Central Bank (Billion USD)', [['Brazil', 0.27, 0.26, 0.241], ['Zambia', 0.05, 0.04, 0.04]]),
  ...block('Domestic Banks (Billion USD)', [['Brazil', 0.22, 0.22, 0.247], ['Zambia', 0.1, 0.08, 0.12]]),
  ...block('Domestic Nonbanks (Billion USD)', [['Brazil', 0.409, 0.409, 0.403], ['Zambia', 0.39, 0.39, 0.38]]),
  ...block('Exchange Rate (end-of-period, LC per USD)', [['Brazil', 4.8, 6.2, 5.5]]),
];

test('the workbook\'s country names all map to ISO3 codes, once each', () => {
  const codes = Object.values(INVESTOR_BASE_ISO3);
  assert.equal(codes.length, 154);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(INVESTOR_BASE_ISO3['Congo, Dem. Rep.'], 'COD');
  assert.equal(INVESTOR_BASE_ISO3['Turkey'], 'TUR');
});

test('blocks: the latest year with a total and all six holders, as shares', () => {
  const b = sheetBlocks(str(SHEET))!;
  const t = investorBaseTable([b], 'x.xlsx', 'November 6, 2026')!;
  const bra = t.countries.get('BRA')!;
  assert.equal(bra.year, '2025');
  assert.equal(bra.totalUsdBn, 2160.9);
  assert.deepEqual(bra.pct, { foreignOfficial: 1.7, foreignBanks: 0.1, foreignNonbanks: 9.1, domesticCentralBank: 24.1, domesticBanks: 24.7, domesticNonbanks: 40.3 });
  assert.equal(t.countries.get('ZMB')!.year, '2024', 'no 2025 total: the year before');
  assert.equal(t.lastYear, 2025);
  assert.equal(investorBaseValue(bra, 2025), 'Foreign 11% (official 2%, banks 0%, other investors 9%); at home: central bank 24%, banks 25%, other investors 40% (2025, preliminary)');
  assert.equal(sheetBlocks([['ReadMe'], ['x']]), null, 'a sheet that does not start with the total block');
  assert.equal(versionFromRows([['', '(This version: November 6, 2026)']]), 'November 6, 2026');
});

test('blocks that hold amounts are turned into shares of the total', () => {
  const amounts = [
    ...block('Total (Billion USD)', [['Kenya', 90, 96, 100]]),
    ...block('Foreign Official (Billion USD)', [['Kenya', 1, 1, 30]]),
    ...block('Foreign Banks (Billion USD)', [['Kenya', 1, 1, 1]]),
    ...block('Foreign Nonbanks (Billion USD)', [['Kenya', 1, 1, 13]]),
    ...block('Domestic Central Bank (Billion USD)', [['Kenya', 1, 1, 5]]),
    ...block('Domestic Banks (Billion USD)', [['Kenya', 1, 1, 22]]),
    ...block('Domestic Nonbanks (Billion USD)', [['Kenya', 1, 1, 29]]),
  ];
  const t = investorBaseTable([sheetBlocks(str(amounts))!], 'k.xlsx')!;
  assert.deepEqual(t.countries.get('KEN')!.pct, { foreignOfficial: 30, foreignBanks: 1, foreignNonbanks: 13, domesticCentralBank: 5, domesticBanks: 22, domesticNonbanks: 29 });
  assert.equal(t.countries.get('KEN')!.year, '2025', 'years whose parts do not add up are passed over');
});

test('folder: none, unreadable, then the zip or .xlsx; readings and the brief row', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ib-'));
  assert.equal(investorBaseData(dir), null);
  assert.equal(investorBaseRow('BRA', investorBaseReading('BRA', null)).source, 'IMF investor base file not downloaded');
  const folder = path.join(dir, 'local', 'imf-investor-base');
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, 'other.xlsx'), makeXlsx('Notes', [['hello']]) as Uint8Array);
  const bad = investorBaseData(dir)!;
  assert.equal(bad.table, null);
  assert.match(investorBaseRow('BRA', investorBaseReading('BRA', bad)).help || '', /did not read: other\.xlsx: no sheet/);
  writeFileSync(path.join(folder, 'Database_For_Posting_EM_Frozen.xlsx'), makeXlsx('ExtendedDataset', SHEET, { otherSheetFirst: true }) as Uint8Array);
  const good = investorBaseData(dir)!;
  assert.equal(good.table?.countries.size, 2);
  const row = investorBaseRow('BRA', investorBaseReading('BRA', good));
  assert.match(row.value, /^Foreign 11%/);
  assert.match(row.source, /Sovereign Debt Investor Base.*shares of general government debt/);
  assert.equal(investorBaseRow('DEU', investorBaseReading('DEU', good)).source, 'Not in the IMF investor base');
  assert.match(investorBaseRow('USA', investorBaseReading('USA', good)).help || '', /TIC/);
  assert.ok(licenceRowsForSource(row.source).some((r) => r.id === 'imf_investor_base'));
  assert.ok('reason' in readInvestorBaseWorkbook('n.xlsx', makeXlsx('Notes', [['x']])));
});

test('the Fiscal & Debt Agent quotes who holds the debt, and the Data health row reads the file', async () => {
  const t = investorBaseTable([sheetBlocks(str(SHEET))!], 'x.xlsx', 'November 6, 2026')!;
  const data = { table: t, skipped: [] };
  const item = { iso3: 'ZMB', countryName: 'Zambia', fiscal: { debtPctGdp: { value: 110, year: '2025' } }, investorBase: investorBaseReading('ZMB', data) } as unknown as WatchlistItem;
  const q = 'Is Zambia debt sustainable?';
  const f = runCouncil(q, planCouncil(q, [item]), [item]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.match(f.figures.find((x) => x.label === 'Who holds government debt')!.value, /^Foreign 49%/);
  assert.match(f.reading, /Foreign investors hold 49% of its government debt \(IMF investor base, 2024\), so a change in global appetite/);
  const rep = await checkConnections({ env: {}, only: ['imf_investor_base'], investorBase: () => data, fetchFn: async () => new Response('') } as never);
  const r = rep.results[0];
  assert.equal(r.state, 'connected');
  assert.match(r.detail, /version of November 6, 2026\): 2 countries, to 2025/);
  assert.match(r.sample || '', /^BRA: Foreign 11%/);
  const none = await checkConnections({ env: {}, only: ['imf_investor_base'], investorBase: () => null, fetchFn: async () => new Response('') } as never);
  assert.equal(none.results[0].state, 'optional');
});
