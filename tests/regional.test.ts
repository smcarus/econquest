import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doseCsvLink, mergeEuroRegions, parseDoseCsv, parseGdlCsv, regionalProfile, regionalSentence, spreadOf, type DoseFile, type EuroRegionsFile } from '../src/utils/regional.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { WORLD_STEPS } from '../src/utils/preload.ts';

// DOSE V2 column names as the data descriptor lists them (Table 3); the v7 header is not read yet.
const doseCsv = [
  'country,GID_0,region,GID_1,year,grp_lcu,pop,grp_pc_lcu,grp_pc_usd,grp_pc_lcu_2015,grp_pc_usd_2015,grp_pc_lcu2015_usd,cpi_2015,deflator_2015',
  'Kenya,KEN,Nairobi,KEN.30_1,2008,1,4000000,1,1,1,3000,1,1,1',
  'Kenya,KEN,Turkana,KEN.43_1,2008,1,1000000,1,1,1,600,1,1,1',
  'Kenya,KEN,"Nakuru, Rift",KEN.31_1,2008,1,2000000,1,1,1,1500,1,1,1',
  'Kenya,KEN,Nairobi,KEN.30_1,2018,1,5000000,1,1,1,4000,1,1,1',
  'Kenya,KEN,Turkana,KEN.43_1,2018,1,1000000,1,1,1,1000,1,1,1',
  'Kenya,KEN,"Nakuru, Rift",KEN.31_1,2018,1,2000000,1,1,1,2000,1,1,1',
  'Kenya,KEN,Nairobi,KEN.30_1,2019,1,5100000,1,1,1,4100,1,1,1', // one region only: not enough for 2019
  'Kenya,KEN,Nairobi,KEN.30_1,1995,1,3000000,1,1,1,2000,1,1,1', // before 2000: left out
  'Chile,CHL,Santiago,CHL.13_1,2018,1,NA,1,1,1,20000,1,1,1',
  'Chile,CHL,Araucanía,CHL.9_1,2018,1,1000000,1,1,1,8000,1,1,1',
].join('\n');
const dose = (): DoseFile => {
  const got = parseDoseCsv(doseCsv, { record: '20035157', version: 'v7', file: 'DOSE_V2.14.csv', pulledAt: '2026-11-15T03:00:00Z' });
  assert.ok(!('reason' in got));
  return got as DoseFile;
};

// Eurostat JSON-stat, trimmed: geo by time, other dimensions fixed to one category.
const jsonStat = (geo: Record<string, string>, years: string[], values: Record<string, number>, extra: string[] = []) => ({
  id: [...extra, 'geo', 'time'],
  size: [...extra.map(() => 1), Object.keys(geo).length, years.length],
  dimension: {
    ...Object.fromEntries(extra.map((d) => [d, { category: { index: { X: 0 } } }])),
    geo: { category: { index: Object.fromEntries(Object.keys(geo).map((k, i) => [k, i])), label: geo } },
    time: { category: { index: Object.fromEntries(years.map((y, i) => [y, i])) } },
  },
  value: values,
});
const geo = { EL: 'Greece', EL30: 'Attiki', EL41: 'Voreio Aigaio', ELZZ: 'Extra-Regio', EU27_2020: 'EU', LU: 'Luxembourg', LU00: 'Luxembourg' };
// index = geo position × 2 + time position
const gdpReply = jsonStat(geo, ['2022', '2023'], { '0': 20000, '1': 21000, '3': 30000, '5': 14000, '9': 37000, '11': 80000, '13': 80000 }, ['freq', 'unit']);
const unempReply = jsonStat(geo, ['2023', '2024'], { '1': 10.1, '3': 9.0, '4': 15.5, '13': 5.0 }, ['freq', 'isced11', 'sex', 'age', 'unit']);

test('DOSE: columns by name, constant 2015 US$, quoted names, rows before 2000 left out; wrong layout gives the reason', () => {
  const d = dose();
  assert.equal(d.basis, 'usd_2015');
  assert.equal(d.countries.KEN.regions.length, 3);
  assert.equal(d.countries.KEN.regions[2].name, 'Nakuru, Rift');
  assert.ok(d.countries.KEN.rows.every((r) => r[1] >= 2000));
  assert.equal(d.countries.CHL.rows[0][3], null);
  const bad = parseDoseCsv('a,b\n1,2', { record: '1', file: 'x.csv', pulledAt: '' });
  assert.ok('reason' in bad && /GID_0, GID_1, region, year, grp_pc_usd_2015/.test(bad.reason));
  // An older layout with current dollars only still reads, labelled as such.
  const old = parseDoseCsv('GID_0,GID_1,region,year,grp_pc_usd\nKEN,K1,A,2010,5\nKEN,K2,B,2010,6', { record: '1', file: 'x.csv', pulledAt: '' });
  assert.ok(!('reason' in old) && old.basis === 'usd_current');
});

test('Zenodo record: the DOSE .csv link, version and record id', () => {
  const reply = { id: 20035157, metadata: { version: 'v7' }, files: [{ key: 'DOSE_additional_regions_V2_14.gpkg', links: { self: 'g' } }, { key: 'DOSE_V2.14.csv', links: { self: 'https://zenodo.org/api/records/20035157/files/DOSE_V2.14.csv/content' } }] };
  assert.deepEqual(doseCsvLink(reply), { url: 'https://zenodo.org/api/records/20035157/files/DOSE_V2.14.csv/content', file: 'DOSE_V2.14.csv', record: '20035157', version: 'v7' });
  assert.equal(doseCsvLink({ files: [] }), null);
});

test('spread: top to bottom, coefficient of variation, population weights only when every region has one', () => {
  assert.deepEqual(spreadOf([100, 100]), { topBottom: 1, cvPct: 0, weighted: false });
  const s = spreadOf([300, 100], [1, 3])!;
  assert.equal(s.weighted, true);
  assert.equal(s.topBottom, 3);
  // weighted mean 150, sd sqrt((150² + 3×50²)/4) = 86.6 → 57.7%
  assert.equal(s.cvPct, 57.7);
  assert.equal(spreadOf([300, 100], [1, null])!.weighted, false);
  assert.equal(spreadOf([5]), null);
});

test('country profile from DOSE: latest year with enough regions, weighted national figure, gap, spread then and now', () => {
  const p = regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: dose(), euro: null, gdl: null });
  const d = p.dose!;
  assert.equal(d.year, 2018);
  assert.equal(d.nationalFrom, 'population_weighted');
  // (4000×5 + 1000×1 + 2000×2) ÷ 8 = 3125
  assert.equal(d.national, 3125);
  assert.deepEqual(d.rows.map((r) => [r.name, r.gapPct]), [['Nairobi', 28], ['Nakuru, Rift', -36], ['Turkana', -68]]);
  assert.equal(d.spread.topBottom, 4);
  assert.equal(d.spreadThen?.year, 2008);
  assert.ok(d.spreadThen!.cvPct > 0);
  assert.match(p.euroMissing!, /not been downloaded/);
  assert.match(p.gdlMissing!, /No Global Data Lab file/);
  // Chile: one region has no population, so the simple mean is used and labelled.
  const c = regionalProfile({ iso3: 'CHL', iso2: 'CL', dose: dose(), euro: null, gdl: null }).dose!;
  assert.equal(c.nationalFrom, 'simple_mean');
  assert.equal(c.national, 14000);
  assert.match(regionalProfile({ iso3: 'FRA', iso2: 'FR', dose: dose(), euro: null, gdl: null }).doseMissing!, /83 countries/);
});

test('Eurostat: Greece under GR, extra-regio and EU totals left out, single-region countries dropped, gaps against the country row', () => {
  const m = mergeEuroRegions(gdpReply, unempReply)!;
  assert.deepEqual(Object.keys(m.countries), ['GR']);
  const gr = m.countries.GR;
  assert.deepEqual(gr.national, { gdp: { value: 21000, year: 2023 }, unemp: { value: 10.1, year: 2024 } });
  assert.deepEqual(gr.regions.map((r) => r.code), ['EL30', 'EL41']);
  const euro: EuroRegionsFile = { pulledAt: '2026-11-16T03:00:00Z', ...m };
  const p = regionalProfile({ iso3: 'GRC', iso2: 'GR', dose: dose(), euro, gdl: null });
  assert.equal(p.euro!.rows[0].code, 'EL30');
  assert.equal(p.euro!.rows[0].gdpGapPct, 42.9);
  assert.equal(p.euro!.rows[0].unempGap, -1.1);
  assert.equal(p.euro!.rows[1].unemp, 15.5);
  assert.equal(p.euro!.gdpSpread!.topBottom, 2.1);
  assert.match(regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: null, euro, gdl: null }).euroMissing!, /EU and EFTA countries only/);
  assert.equal(mergeEuroRegions(null, { nothing: 1 }), null);
});

test('Global Data Lab file: subnational rows, national figure, gap; wrong layout and other country give the reason', () => {
  const csv = 'iso_code,country,year,GDLCODE,level,region,shdi\nKEN,Kenya,2022,KENt,National,Total,0.601\nKEN,Kenya,2022,KENr101,Subnat,Nairobi,0.712\nKEN,Kenya,2022,KENr108,Subnat,Turkana,0.401\nKEN,Kenya,2021,KENr101,Subnat,Nairobi,0.7\n';
  const rows = parseGdlCsv(csv)!;
  assert.equal(rows.length, 4);
  const p = regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: null, euro: null, gdl: rows, gdlFile: 'SHDI.csv' });
  assert.deepEqual(p.gdl, { year: 2022, national: 0.601, rows: [{ name: 'Nairobi', value: 0.712 }, { name: 'Turkana', value: 0.401 }], topBottomGap: 0.311 });
  assert.match(regionalProfile({ iso3: 'FRA', iso2: 'FR', dose: null, euro: null, gdl: rows, gdlFile: 'SHDI.csv' }).gdlMissing!, /no subnational HDI rows/);
  assert.equal(parseGdlCsv('a,b\n1,2'), null);
  assert.match(regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: null, euro: null, gdl: null, gdlFile: 'mine.csv' }).gdlMissing!, /mine\.csv .*Global Data Lab layout/);
});

test('sentence, and Missing when nothing is there', () => {
  const p = regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: dose(), euro: null, gdl: null });
  assert.match(regionalSentence(p, 'Kenya'), /^Kenya, 2018: output per person in the richest region \(Nairobi, US\$4,000\) is 4 times that of the poorest \(Turkana, US\$1,000\); regions differ by [\d.]+% on average, against [\d.]+% in 2008 \(DOSE\)\.$/);
  assert.match(regionalSentence(regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: null, euro: null, gdl: null }), 'X'), /Missing/);
});

test('wiring: download step, route, panel, tool slot, register, licences and text keys', () => {
  assert.ok(WORLD_STEPS.some((s) => s.id === 'world:regional'));
  assert.match(readFileSync('server.ts', 'utf8'), /case 'world:regional'/);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/regional\/:iso3'/);
  const page = readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /<RegionalPanel key=\{`rg-\$\{run\.iso3\}`\}/);
  assert.match(page, /lazyNamed\(\(\) => import\('\.\/RegionalPanel'\)/);
  assert.match(readFileSync('src/utils/countryTools.ts', 'utf8'), /'tool-regional'/);
  assert.match(readFileSync('src/data/modelRegister.ts', 'utf8'), /id: 'regional'/);
  const lic = readFileSync('src/data/dataLicences.ts', 'utf8');
  for (const id of ['dose', 'gdl']) assert.match(lic, new RegExp(`id: '${id}'`));
  assert.match(lic, /nama_10r_2gdp/);
  const panel = readFileSync('src/components/RegionalPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(rg_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 25, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});

test('Data health rows', async () => {
  const fetchFn = async (url: string) =>
    new Response(
      JSON.stringify(
        url.includes('zenodo.org')
          ? { id: 20035157, metadata: { version: 'v7' }, files: [{ key: 'DOSE_V2.14.csv', links: { self: 'u' } }] }
          : url.includes('lfst_r_lfu3rt')
            ? unempReply
            : {},
      ),
      { status: 200 },
    );
  const rep = await checkConnections({ env: {}, only: ['dose', 'eurostat_regions'], fetchFn } as never);
  const a = rep.results.find((r) => r.id === 'dose')!;
  assert.equal(a.state, 'connected');
  assert.match(a.sample || '', /Latest version v7 \(record 20035157\): DOSE_V2\.14\.csv/);
  const b = rep.results.find((r) => r.id === 'eurostat_regions')!;
  assert.equal(b.state, 'connected');
  assert.match(b.sample || '', /areas read; e\.g\. unemployment 9% \(2024\)/);
});
