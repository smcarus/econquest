import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { TREATY_RULES, TREATY_MEMBERS, fiscalRulesCheck, fiscalRulesTable, frSentence, nameKey, treatyRulesFor } from '../src/utils/fiscalRules';
import { countryNameIndex, readFiscalRulesWorkbook } from '../src/utils/fiscalRulesStore';

const rows = (lines: string[][]) => lines;

test('treaty limits: EU 3% deficit and 60% debt, WAEMU -3% and 70%, CEMAC 70% debt with its balance rule Missing', () => {
  const f = (id: string) => TREATY_RULES.find((r) => r.id === id)!;
  assert.deepEqual([f('eu_deficit').limit, f('eu_debt').limit, f('waemu_balance').limit, f('waemu_debt').limit, f('cemac_debt').limit], [-3, 60, -3, 70, 70]);
  assert.equal(f('cemac_balance').figure, null);
  assert.match(f('cemac_balance').missing!, /reference fiscal balance/);
  assert.equal(TREATY_MEMBERS.EU.length, 27);
  assert.deepEqual(treatyRulesFor('USA'), []);
  assert.deepEqual(treatyRulesFor('SEN').map((r) => r.id), ['waemu_balance', 'waemu_debt']);
  for (const r of TREATY_RULES) assert.ok(r.source.length > 20, `${r.id} names its legal source`);
});

test('the check reads the latest year before the current year, never a projection, and gives the room left', () => {
  const debt = [{ year: 2023, value: 58 }, { year: 2024, value: 63.5 }, { year: 2025, value: 66 }, { year: 2026, value: 70 }];
  const bal = [{ year: 2024, value: -2.4 }, { year: 2025, value: -3.6 }];
  const r = fiscalRulesCheck('FRA', 2026, { debt_gdp: debt, overall_balance: bal }, { table: null });
  const byId = Object.fromEntries(r.treaty.map((t) => [t.rule.id, t]));
  assert.equal(byId.eu_debt.year, 2025);
  assert.equal(byId.eu_debt.meets, false);
  assert.equal(byId.eu_debt.room, -6);
  assert.equal(byId.eu_deficit.value, -3.6);
  assert.equal(byId.eu_deficit.meets, false);
  assert.equal(byId.eu_deficit.room, -0.6);
  assert.match(r.nationalMissing!, /No IMF Fiscal Rules Dataset in data\/local\/imf-fiscal-rules\//);
  assert.match(frSentence(r, 'France'), /France misses the EU balance limit \(-3.6 vs -3% of GDP, 2025\) and misses the EU debt limit/);
});

test('a missing figure reads Missing with the reason, never filled in', () => {
  const r = fiscalRulesCheck('CMR', 2026, {}, { table: null });
  assert.ok(r.treaty.every((t) => t.meets === null && t.missing));
  assert.match(r.treaty.find((t) => t.rule.id === 'cemac_debt')!.missing!, /No government debt figure before 2026/);
});

const SHEET = rows([
  ['IMF Fiscal Rules Dataset'],
  [],
  ['Country', 'ISO', 'Year', 'ER', 'RR', 'BBR', 'DR', 'Legal basis', 'Escape clause'],
  ['Chile', 'CHL', '2000', '-', '-', '-', '-', '', ''],
  ['Chile', 'CHL', '2001', '-', '-', '1', '-', '2', '0'],
  ['Chile', 'CHL', '2002', '-', '-', '1', '-', '2', '0'],
  ['Chile', 'CHL', '2003', '-', '-', '1', '1', '4', '1'],
  ['Atlantis', '', '2003', '1', '-', '-', '-', '', ''],
  ['Kenya', '', '2002', '1', '-', '-', '-', '', ''],
  ['Kenya', '', '2003', '-', '-', '-', '1', '-', ''],
]);

test('the IMF workbook: header found under a title, latest year per country, since = start of the current run, details kept', () => {
  const t = fiscalRulesTable(SHEET, 'frd.xlsx', countryNameIndex());
  assert.ok('countries' in t);
  const chl = t.countries.get('CHL')!;
  assert.equal(chl.year, 2003);
  assert.deepEqual(chl.has, { er: false, rr: false, bbr: true, dr: true });
  assert.deepEqual(chl.since, { bbr: 2001, dr: 2003 });
  assert.deepEqual(chl.details, [{ label: 'Legal basis', value: '4' }, { label: 'Escape clause', value: '1' }]);
  const ken = t.countries.get('KEN')!;
  assert.deepEqual(ken.has, { er: false, rr: false, bbr: false, dr: true }, 'matched by name; an expenditure rule dropped in 2003 is not in force');
  assert.deepEqual(t.unmatched, ['Atlantis']);
  assert.equal(t.firstYear, 2000);
  assert.equal(t.lastYear, 2003);
  const r = fiscalRulesCheck('CHL', 2026, {}, { table: t });
  assert.equal(r.national?.name, 'Chile');
  assert.match(frSentence(r, 'Chile'), /budget balance rule since 2001, debt rule since 2003/);
  assert.match(fiscalRulesCheck('USA', 2026, {}, { table: t }).nationalMissing!, /has no row for this country; it covers 2 economies/);
});

test('a sheet without the columns says why', () => {
  assert.deepEqual(fiscalRulesTable([['Notes'], ['Country', 'Year', 'Comment']], 'x.xlsx', {}), { reason: 'no header row with Country, Year and at least two of ER, RR, BBR and DR' });
  assert.equal(nameKey("Côte d'Ivoire"), nameKey('Cote d Ivoire'));
  assert.equal(countryNameIndex()[nameKey('Bahamas, The')], 'BHS');
});

test('reads an .xlsx workbook, trying each sheet until one has the columns', () => {
  const cell = (v: string) => `<c t="inlineStr"><is><t>${v}</t></is></c>`;
  const sheet = (lines: string[][]) => `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${lines.map((l, i) => `<row r="${i + 1}">${l.map(cell).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const book = zipSync({
    'xl/workbook.xml': strToU8('<workbook xmlns:r="r"><sheets><sheet name="Notes" r:id="rId1"/><sheet name="Data" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(sheet([['About this file']])),
    'xl/worksheets/sheet2.xml': strToU8(sheet(SHEET.filter((l) => l.length))),
  });
  const t = readFiscalRulesWorkbook('frd.xlsx', book, countryNameIndex());
  assert.ok('countries' in t, JSON.stringify(t));
  assert.equal(t.countries.get('CHL')?.since.bbr, 2001);
});

test('the data check row: what the saved workbook holds, or that none is saved', async () => {
  const { checkConnections } = await import('../src/utils/connectionCheck');
  const t = fiscalRulesTable(SHEET, 'frd.xlsx', countryNameIndex());
  assert.ok('countries' in t);
  const rep = await checkConnections({ env: {}, only: ['imf_fiscal_rules'], fiscalRules: () => ({ table: t, skipped: [] }), fetchFn: async () => new Response('') } as never);
  const r = rep.results[0];
  assert.equal(r.state, 'connected');
  assert.match(r.detail, /Read frd\.xlsx: 2 countries, 2000-2003/);
  assert.equal(r.sample, 'CHL 2003: Budget balance rule, Debt rule');
  assert.match(r.warning || '', /Names not matched to a country: Atlantis/);
  const none = await checkConnections({ env: {}, only: ['imf_fiscal_rules'], fiscalRules: () => null, fetchFn: async () => new Response('') } as never);
  assert.equal(none.results[0].state, 'optional');
});

test('wired: route, country page panel, tools list and register', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/fiscal-rules\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<FiscalRulesPanel key=/);
  const { READY_TOOLS } = await import('../src/data/toolsCatalog');
  assert.ok(READY_TOOLS.some((x) => x.id === 'fiscal_rules' && x.target.anchor === 'tool-fiscal-rules'));
  const { MODEL_REGISTER } = await import('../src/data/modelRegister');
  assert.equal(MODEL_REGISTER.find((m) => m.id === 'fiscal_rules')?.status, 'descriptive');
});
