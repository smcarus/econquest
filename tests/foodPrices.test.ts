import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { faoCpiTable, foodView, foodSentence, FOOD_IDS, FAO_CPI_NO_FILE, FAO_CPI_NO_COUNTRY, FAO_CPI_TOO_SHORT, STAPLE_CODES } from '../src/utils/foodPrices.ts';
import { faoCpiInput } from '../src/utils/faoCpiStore.ts';
import { PINK_COMMODITIES, type PriceMove } from '../src/utils/commodityPrices.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const HEAD = ['Area Code', 'Area Code (M49)', 'Area', 'Item Code', 'Item', 'Element Code', 'Element', 'Months Code', 'Months', 'Year Code', 'Year', 'Unit', 'Value', 'Flag', 'Note'];
const row = (m49: string, item: string, month: string, year: number, value: number, flag = 'X') => ['1', `'${m49}`, 'Somewhere', '23013', item, '6125', 'Value', '7001', month, String(year), String(year), '', String(value), flag, ''];
const FOOD = 'Consumer Prices, Food Indices (2015 = 100)';
const GEN = 'Consumer Prices, General Indices (2015 = 100)';

// Kenya (404): food and general for 2025 and 2026; one imputed and one estimated value left out.
const rows = [
  HEAD,
  row('404', FOOD, 'January', 2025, 200),
  row('404', FOOD, 'February', 2025, 210),
  row('404', FOOD, 'March', 2025, 220),
  row('404', FOOD, 'January', 2026, 230),
  row('404', FOOD, 'February', 2026, 231),
  row('404', FOOD, 'March', 2026, 999, 'I'),
  row('404', GEN, 'January', 2025, 150),
  row('404', GEN, 'January', 2026, 160.5),
  row('404', GEN, 'February', 2026, 170, 'E'),
  row('404', 'Food price inflation', 'January', 2026, 15),
  row('404', FOOD, 'Annual value', 2026, 230),
  row('999', FOOD, 'January', 2026, 100),
];

const mv = (code: string, change12mPct?: number, change1mPct?: number, source: PriceMove['source'] = 'pink_sheet'): PriceMove => ({ code, name: code, unit: '$/mt', source, asOf: '2026-10', latest: 1, ...(change12mPct !== undefined ? { change12mPct } : {}), ...(change1mPct !== undefined ? { change1mPct } : {}) });

const pts = (o: Record<number, number>) => Object.entries(o).map(([y, value]) => ({ year: Number(y), value }));
const series = {
  undernourishment: pts({ 2022: 28.04, 2023: 27.96 }),
  food_insecurity: pts({ 2023: 70.4 }),
  import_food: pts({ 2023: 15 }),
  export_food: pts({ 2023: 40 }),
  merch_imports_usd: pts({ 2023: 20 }),
  merch_exports_usd: pts({ 2023: 5 }),
  gdp_usd: pts({ 2023: 100 }),
};

test('FAOSTAT table: M49 to ISO3, food and general indices by month, estimated and imputed values left out', () => {
  const t = faoCpiTable(rows, 'cpi.csv');
  assert.ok('countries' in t);
  assert.deepEqual([...t.countries.keys()], ['KEN']);
  const ken = t.countries.get('KEN')!;
  assert.equal(ken.food.size, 5);
  assert.equal(ken.general.size, 2);
  assert.equal(t.leftOut, 2);
  assert.equal(t.latestMonth, '2026-02');
  assert.match((faoCpiTable([['a', 'b']], 'x.csv') as { reason: string }).reason, /not the FAOSTAT/);
});

test('the wide "All Data" layout (a column per year, its flag beside it) reads the same; regional medians are left out', () => {
  const head = ['Area Code', 'Area Code (M49)', 'Area', 'Item Code', 'Item', 'Element Code', 'Element', 'Months Code', 'Months', 'Unit', 'Y2025', 'Y2025F', 'Y2025N', 'Y2026', 'Y2026F', 'Y2026N'];
  const w = (m49: string, item: string, month: string, a: string, af: string, b: string, bf: string) => ['1', `'${m49}`, 'X', '23013', item, '6125', 'Value', '7001', month, '', a, af, 'base year is 2015', b, bf, ''];
  const t = faoCpiTable(
    [
      head,
      w('108', FOOD, 'January', '200', 'X', '230', 'X'),
      w('108', FOOD, 'February', '210', 'X', '231', 'I'),
      w('108', GEN, 'January', '150', 'E', '160.5', 'X'),
      w('108', 'Consumer Prices, Food Indices (2015 = 100); median', 'January', '1', 'X', '2', 'X'),
      w('002', FOOD, 'January', '100', 'X', '', ''),
    ],
    'wide.csv',
  );
  assert.ok('countries' in t);
  assert.deepEqual([...t.countries.keys()], ['BDI']);
  assert.deepEqual([...t.countries.get('BDI')!.food.entries()].sort(), [['2025-01', 200], ['2025-02', 210], ['2026-01', 230]]);
  assert.deepEqual([...t.countries.get('BDI')!.general.entries()], [['2026-01', 160.5]]);
  assert.equal(t.leftOut, 2);
  const f = foodView({ iso3: 'BDI', series: {}, beforeYear: 2026, historySaved: true, cpi: { table: t }, moves: null });
  assert.deepEqual({ month: f.inflation?.month, food: f.inflation?.food, general: f.inflation?.general }, { month: '2026-01', food: 15, general: undefined });
});

test('food price inflation, gap, food security, net food imports and staple prices', () => {
  const t = faoCpiTable(rows, 'cpi.csv') as Exclude<ReturnType<typeof faoCpiTable>, { reason: string }>;
  const f = foodView({ iso3: 'KEN', series, beforeYear: 2025, historySaved: true, cpi: { table: t }, moves: [mv('RICE_05', 12.34, 1), mv('MAIZE', -5), mv('CRUDE_BRENT', 1), mv('WHEAT_US_HRW', 50, 50, 'eia')] });
  assert.deepEqual(f.inflation, {
    month: '2026-02',
    food: 10,
    months: [
      { month: '2026-01', food: 15, general: 7 },
      { month: '2026-02', food: 10 },
    ],
    peak: { month: '2026-01', food: 15 },
  });
  assert.equal(f.inflationFile, 'cpi.csv');
  assert.deepEqual(f.security, { undernourishment: { year: 2023, value: 28 }, insecurity: { year: 2023, value: 70.4 } });
  assert.deepEqual(f.trade, { year: 2023, foodImportsPctGdp: 3, foodExportsPctGdp: 2, netImportsPctGdp: 1, importShare: 15, exportShare: 40 });
  assert.deepEqual(f.staples.map((s) => s.code), ['RICE_05', 'MAIZE']);
  assert.equal(f.staples[0].move12m, 12.34);
  assert.equal(
    foodSentence(f, 'Kenya'),
    'In Kenya, food prices were +10.0% on a year earlier in 2026-02 (FAOSTAT); 28% of people undernourished (2023); 70.4% in moderate or severe food insecurity (2023); net food imports 1% of GDP in 2023.',
  );
  // With the general rate the same month, the gap is shown.
  const jan = foodView({ iso3: 'KEN', series, beforeYear: 2025, historySaved: true, cpi: { table: t }, moves: null, beforeMonth: '2026-02' });
  assert.deepEqual({ food: jan.inflation?.food, general: jan.inflation?.general, gap: jan.inflation?.gap }, { food: 15, general: 7, gap: 8 });
  assert.match(jan.staplesMissing!, /Pink Sheet/);
});

test('Missing with the reason: no file, file without the country, too short, no history', () => {
  const t = faoCpiTable(rows, 'cpi.csv') as Exclude<ReturnType<typeof faoCpiTable>, { reason: string }>;
  const base = { series: {}, beforeYear: 2026, historySaved: false, moves: null };
  assert.equal(foodView({ ...base, iso3: 'KEN', cpi: { table: null } }).inflationMissing, FAO_CPI_NO_FILE);
  assert.equal(foodView({ ...base, iso3: 'KEN', cpi: { table: null, reason: 'did not read' } }).inflationMissing, 'did not read');
  assert.equal(foodView({ ...base, iso3: 'BRA', cpi: { table: t } }).inflationMissing, FAO_CPI_NO_COUNTRY);
  assert.equal(foodView({ ...base, iso3: 'KEN', cpi: { table: t }, beforeMonth: '2026-01' }).inflationMissing, FAO_CPI_TOO_SHORT);
  const none = foodView({ ...base, iso3: 'KEN', cpi: { table: null } });
  assert.match(none.securityMissing!, /No saved World Bank history/);
  assert.match(none.tradeMissing!, /No saved World Bank history/);
  assert.match(foodSentence(none, 'X'), /Missing/);
});

test('the store reads the newest .csv or the largest .csv inside a .zip in data/local/fao-cpi/', () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-fao-'));
  try {
    assert.deepEqual(faoCpiInput(dataDir), { table: null });
    const dir = path.join(dataDir, 'local', 'fao-cpi');
    mkdirSync(dir, { recursive: true });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    writeFileSync(path.join(dir, 'cpi.zip'), zipSync({ 'ConsumerPriceIndices_E_Flags.csv': strToU8('Flag,Description\nE,Estimated'), 'ConsumerPriceIndices_E_All_Data_(Normalized).csv': strToU8(csv) }));
    const got = faoCpiInput(dataDir);
    assert.equal(got.table?.countries.get('KEN')?.food.size, 5);
    assert.match(got.table!.file, /All_Data/);
    writeFileSync(path.join(dir, 'cpi.zip'), 'not a zip');
    assert.match(faoCpiInput(dataDir).reason!, /did not read/);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('saved series and wiring: three new World Bank figures, rice in the Pink Sheet list, the route, the panel and its text', () => {
  for (const [id, code] of [['undernourishment', 'SN.ITK.DEFC.ZS'], ['food_insecurity', 'SN.ITK.MSFI.ZS'], ['food_insecurity_severe', 'SN.ITK.SVFI.ZS']]) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  }
  for (const id of FOOD_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  const codes = new Set(PINK_COMMODITIES.map((c) => c.code));
  for (const c of STAPLE_CODES) assert.ok(codes.has(c), c);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/food-prices\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<FoodPricesPanel key=\{`fp-\$\{run\.iso3\}`\}/);
  const panel = readFileSync('src/components/FoodPricesPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'((?:fp|ct)_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 30, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
