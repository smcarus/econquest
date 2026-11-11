import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { aiddataColumns, aiddataTable, chinaValue, COMMON_FRAMEWORK, DSA_LIST, dsaValue, isLoanFlow, licDebtReading } from '../src/utils/lowIncomeDebt.ts';
import { aiddataData } from '../src/utils/aiddataStore.ts';
import { licDebtRows, bankerBrief, BANKER_SECTIONS } from '../src/utils/bankerNote.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { licenceRowsForSource } from '../src/utils/licenceLookup.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { makeXlsx } from './helpers/makeXlsx.ts';
import type { CouncilAssessmentRun, WatchlistItem } from '../src/types/council.ts';

const HEADER = ['AidData Record ID', 'Recommended For Aggregates', 'Financier Country', 'Recipient', 'Recipient ISO-3', 'Commitment Year', 'Flow Type', 'Amount (Constant USD 2021)', 'Amount (Nominal USD)'];
const ROWS = [
  HEADER,
  ['1', 'Yes', 'China (People\'s Republic of)', 'Zambia', 'ZMB', '2010', 'Loan', '1000000000', '900000000'],
  ['2', 'Yes', 'China (People\'s Republic of)', 'Zambia', 'ZMB', '2019', 'Loan', '500000000', '480000000'],
  ['3', 'Yes', 'China (People\'s Republic of)', 'Zambia', 'ZMB', '2020', 'Export Buyer\'s Credit', '250000000', '240000000'],
  ['4', 'Yes', 'China (People\'s Republic of)', 'Zambia', 'ZMB', '2021', 'Grant', '90000000', '90000000'],
  ['5', 'No', 'China (People\'s Republic of)', 'Zambia', 'ZMB', '2021', 'Loan', '700000000', '700000000'],
  ['6', 'Yes', 'China (People\'s Republic of)', 'Kenya', 'KEN', '2021', 'Loan', '40000000', '40000000'],
  ['7', 'Yes', 'China (People\'s Republic of)', 'Kenya', 'KEN', '2014', 'Debt forgiveness', '10000000', '10000000'],
];

test('the IMF list is typed as published: 67 ratings, each with its DSA date', () => {
  assert.equal(DSA_LIST.length, 67);
  const count = (r: string) => DSA_LIST.filter((d) => d.rating === r).length;
  assert.deepEqual([count('in_distress'), count('high'), count('moderate'), count('low')], [10, 22, 27, 8]);
  assert.equal(new Set(DSA_LIST.map((d) => d.iso3)).size, 67, 'one row per country');
  assert.ok(DSA_LIST.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.ratedOn)));
  const zmb = DSA_LIST.find((d) => d.iso3 === 'ZMB')!;
  assert.equal(dsaValue(zmb), 'High (DSA published 2026-02-02); debt judged sustainable');
  assert.equal(dsaValue(DSA_LIST.find((d) => d.iso3 === 'ETH')!), 'In debt distress (DSA published 2026-07-13); debt judged unsustainable; in a debt restructuring with an IMF programme');
  assert.match(dsaValue(DSA_LIST.find((d) => d.iso3 === 'COG')!), /because of unresolved arrears/);
  assert.equal(dsaValue(DSA_LIST.find((d) => d.iso3 === 'KHM')!), 'Low (DSA published 2026-09-28)');
});

test('AidData: loans and export credits added up per country, rows not recommended for aggregates left out', () => {
  assert.ok(aiddataColumns(HEADER));
  assert.equal(aiddataColumns(['Recipient', 'Year']), null);
  assert.ok(isLoanFlow('Loan') && isLoanFlow("Export Seller's Credit") && !isLoanFlow('Grant') && !isLoanFlow('Debt forgiveness'));
  const got = aiddataTable(ROWS, 'gcdf.csv', '2026-11-11T00:00:00Z');
  assert.ok('table' in got);
  const t = got.table;
  assert.equal(t.fileLastYear, 2021);
  const z = t.countries.get('ZMB')!;
  assert.equal(z.loans, 3);
  assert.equal(z.totalUsdBn, 1.75);
  assert.equal(z.recentUsdBn, 0.75, '2017-2021 only');
  assert.equal(z.dollars, 'constant 2021 US dollars');
  assert.equal(chinaValue(z), 'US$1.8 bn committed 2010-2020 (3 loans); US$750 m in 2017-2021');
  assert.equal(t.countries.get('KEN')!.loans, 1, 'debt forgiveness is not a loan');
  assert.deepEqual(aiddataTable([['a', 'b']], 'x.csv', ''), { reason: 'the columns "Recipient ISO-3", "Commitment Year", "Flow Type" and an "Amount" in US dollars were not found' });
});

test('AidData folder: .csv or a workbook whose data sheet is not the first; none, unreadable and read', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'aid-'));
  const none = path.join(dir, 'no-summary.json');
  assert.equal(aiddataData(dir, none), null, 'no folder and no shipped summary, no data');
  assert.equal(aiddataData(dir)?.table?.countries.get('ZMB')?.lastYear, 2019, 'the shipped summary when you have no file');
  const folder = path.join(dir, 'local', 'aiddata');
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, 'notes.csv'), 'hello,world\n1,2\n');
  const bad = aiddataData(dir, none)!;
  assert.equal(bad.table, null);
  assert.match(bad.skipped[0].reason, /columns/);
  assert.equal(licDebtReading('ZMB', bad).chinaMissing?.short, 'AidData file could not be read');
  const book = makeXlsx('GCDF_3.0', ROWS, { otherSheetFirst: true });
  writeFileSync(path.join(folder, 'AidDatas_GCDF_3.0.xlsx'), book as Uint8Array);
  const good = aiddataData(dir, none)!;
  assert.equal(good.table?.countries.get('ZMB')?.loans, 3, 'your file wins over the shipped summary');
  assert.match(aiddataData(dir)!.table!.file, /AidDatas_GCDF/);
});

test('the reading: typed rows, AidData, and Missing with the reason', () => {
  const t = (aiddataTable(ROWS, 'gcdf.csv', '') as { table: import('../src/utils/lowIncomeDebt.ts').AiddataTable }).table;
  const aid = { table: t, skipped: [] };
  const z = licDebtReading('ZMB', aid);
  assert.equal(z.dsa?.rating, 'high');
  assert.equal(z.commonFramework, true);
  assert.equal(z.china?.loans, 3);
  assert.equal(z.dssi, undefined, 'DSSI table not typed yet');
  const rows = licDebtRows(z);
  const by = (l: string) => rows.find((r) => r.label === l)!;
  assert.match(by('Risk of debt distress (IMF/World Bank)').source, /as of 2026-09-30, read 2026-11-11/);
  assert.equal(by('Common Framework').value, 'Applied for a debt treatment (as of 2024)');
  assert.equal(by('Debt Service Suspension Initiative (2020-21)').value, 'Missing');
  assert.equal(by('Official lending from China').verified, true);

  const bra = licDebtRows(licDebtReading('BRA', aid));
  assert.equal(bra[0].value, 'Not on the IMF low-income list');
  assert.equal(bra[2].value, 'Not among the four countries that applied (as of 2024)');
  assert.equal(bra[3].value, 'None recorded', 'read the file, found no loans: a record of none');
  const eri = licDebtRows(licDebtReading('ERI', null));
  assert.equal(eri[0].source, 'No published DSA');
  assert.equal(eri[3].source, 'AidData file not downloaded');
  assert.deepEqual(COMMON_FRAMEWORK, ['TCD', 'ZMB', 'ETH', 'GHA']);
});

test('the issuer brief has the group and its note section', () => {
  const open = buildBaselineOpenData('ZMB');
  open.licDebt = licDebtReading('ZMB', null);
  const b = bankerBrief({ iso3: 'ZMB', countryName: 'Zambia', openData: open } as unknown as CouncilAssessmentRun, []);
  const g = b.groups.find((x) => x.title === 'Debt relief and lending from China')!;
  assert.equal(g.rows.length, 4);
  assert.equal(BANKER_SECTIONS.relief, 'Debt relief and lending from China');
});

test('the Fiscal & Debt Agent quotes the rating, the Common Framework and China lending with their sources', () => {
  const t = (aiddataTable(ROWS, 'gcdf.csv', '') as { table: import('../src/utils/lowIncomeDebt.ts').AiddataTable }).table;
  const item = { iso3: 'ZMB', countryName: 'Zambia', fiscal: { debtPctGdp: { value: 110, year: '2025' } }, licDebt: licDebtReading('ZMB', { table: t, skipped: [] }) } as unknown as WatchlistItem;
  const q = 'Is Zambia debt sustainable?';
  const a = runCouncil(q, planCouncil(q, [item]), [item]).find((x) => x.id === 'fiscal')!;
  const f = a.findings[0];
  const fig = (l: string) => f.figures.find((x) => x.label === l)!;
  assert.match(fig('Risk of debt distress (IMF/World Bank)').value, /^High/);
  assert.equal(fig('Common Framework').tag, 'official');
  assert.match(fig('Official lending from China').source, /AidData.*not money paid out/);
  assert.match(f.reading, /rate its risk of debt distress high/);
  assert.match(f.reading, /Common Framework/);
  const plain = { iso3: 'USA', countryName: 'United States', fiscal: { debtPctGdp: { value: 120, year: '2025' } }, licDebt: licDebtReading('USA', null) } as unknown as WatchlistItem;
  const b = runCouncil('debt', planCouncil('debt', [plain]), [plain])[0];
  assert.ok(!b.findings[0].figures.some((x) => /debt distress|Common Framework|China/.test(x.label)), 'nothing added for a country with none of it');
});

test('Data health row and licence rows', async () => {
  const t = (aiddataTable(ROWS, 'gcdf.csv', '') as { table: import('../src/utils/lowIncomeDebt.ts').AiddataTable }).table;
  const rep = await checkConnections({ env: {}, only: ['aiddata_file'], aiddata: () => ({ table: t, skipped: [] }), fetchFn: async () => new Response('') } as never);
  const row = rep.results.find((r) => r.id === 'aiddata_file')!;
  assert.equal(row.state, 'connected');
  assert.match(row.sample || '', /^ZMB: US\$1\.8 bn/);
  const none = await checkConnections({ env: {}, only: ['aiddata_file'], aiddata: () => null, fetchFn: async () => new Response('') } as never);
  assert.equal(none.results[0].state, 'optional');
  assert.ok(licenceRowsForSource('AidData, Global Chinese Development Finance Dataset').some((r) => r.id === 'aiddata'));
  assert.ok(licenceRowsForSource('IMF, List of IMF/WBG LIC DSAs for PRGT-Eligible Countries').some((r) => r.id === 'imf_lic_dsa'));
  assert.ok(licenceRowsForSource('Paris Club, Common Framework').some((r) => r.id === 'dssi_cf'));
});
