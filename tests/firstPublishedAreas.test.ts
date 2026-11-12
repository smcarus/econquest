import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipSync } from 'fflate';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'first-pub-areas-'));

const { ECB_RTD_SERIES, ecbRtdUrl, parseEcbHistory, periodStart } = await import('../src/utils/ecbRealTime.ts');
const { editionFileUrl, latestEditionUri, parseOnsTriangle, publicationDay, ONS_TRIANGLE_SERIES } = await import('../src/utils/onsTriangles.ts');
const { alfredReply, figureOn } = await import('../src/utils/alfredVintages.ts');
const { cellsToRows } = await import('../src/utils/firstPublished.ts');
const { toXlsx } = await import('../src/utils/xlsxExport.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
const { DATA_LICENCES } = await import('../src/data/dataLicences.ts');
const { figureHelp } = await import('../src/data/glossary.ts');

// ECB Data Portal csvdata with includeHistory=true, columns as the Mac probe showed (12 Nov 2026).
const HEAD = 'KEY,FREQ,REF_AREA,ADJUSTMENT,RT_ECON_CONCEPT,RT_DENOM,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK,OBS_COM,TITLE,UNIT,ACTION,VALID_FROM,VALID_TO';
const line = (p: string, v: string, action: string, from: string, to = '') => `RTD.Q.S0.S.G_GDPM_TO_C.E,Q,S0,S,G_GDPM_TO_C,E,${p},${v},A,F,,,"GDP, chain linked",EUR,${action},${from},${to}`;
const ECB_CSV = [
  HEAD,
  line('2026-Q1', '3000', 'Replace', '2026-04-30T09:00:00Z', '2026-06-06T09:00:00Z'),
  line('2026-Q1', '3003', 'Replace', '2026-06-06T09:00:00Z'),
  line('2025-Q4', '2990', 'Replace', '2026-01-30T09:00:00Z'),
  line('2026-Q2', '3010', 'Replace', '2026-07-30T09:00:00Z'),
  line('2026-Q2', '3012', 'Replace', '2026-07-30T15:00:00Z'),
  line('1995-Q1', '', 'Delete', '', '2021-01-20T14:30:00Z'),
].join('\n');

test('ECB real-time database: codes, periods, history into rows', () => {
  assert.deepEqual(ECB_RTD_SERIES.map((d) => d.id), ['Q.S0.S.G_GDPM_TO_C.E', 'M.S0.N.P_C_OV.A', 'M.S0.S.L_UNETO.F']);
  assert.equal(ecbRtdUrl('M.S0.N.P_C_OV.A'), 'https://data-api.ecb.europa.eu/service/data/RTD/M.S0.N.P_C_OV.A?format=csvdata&includeHistory=true&startPeriod=1999');
  assert.equal(periodStart('2024-Q2'), '2024-04-01');
  assert.equal(periodStart('2026-02'), '2026-02-01');
  assert.equal(periodStart('x'), undefined);
  const rows = parseEcbHistory(ECB_CSV);
  assert.deepEqual(rows.filter((r) => r.date === '2026-01-01'), [
    { date: '2026-01-01', value: 3000, from: '2026-04-30', to: '2026-06-05' },
    { date: '2026-01-01', value: 3003, from: '2026-06-06', to: '9999-12-31' },
  ]);
  assert.deepEqual(rows.filter((r) => r.date === '2026-04-01').map((r) => r.value), [3012], 'two values the same day: the later one');
  assert.ok(!rows.some((r) => r.date === '1995-01-01'));
  const gdp = ECB_RTD_SERIES[0];
  assert.equal(figureOn(gdp, rows, '2026-01-01', '2026-05-01'), Number(((3000 / 2990 - 1) * 100).toFixed(2)), 'q/q, not annualised');
  const r = alfredReply(gdp, { id: gdp.id, rows }, '2026-01-01', '2026-05-01', 'ECB', 'ECB');
  assert.equal(r.releases!.length, 2);
  assert.equal(r.freq, 'quarterly');
  assert.match(r.sentence!, /^Euro area real GDP growth for 2026 Q1 was first published on 2026-04-30 at 0\.33; the latest figure \(2026-06-06\) is 0\.43, up 0\.1 after 1 revision\.$/);
  assert.deepEqual(parseEcbHistory('nope'), []);
  assert.equal(alfredReply(gdp, null, undefined, undefined, 'ECB', 'ECB').reason, 'No ECB vintages for this series yet');
});

// The ONS "triangle" worksheet, as in the 30 September 2026 abmi.zip.
const TRIANGLE = [
  ['Quarterly GDP at Market Prices (ABMI) quarter-on-quarter growth'],
  ['Relating to Period', '2008 Q3', '2008 Q4'],
  ['Month 2 estimate', '-0.5', '-1.5'],
  ['Value 3 years later', '-0.9', '-2.1'],
  ['Nov-08', '-0.5', ' '],
  ['Jan-09', '-0.5', '-1.5'],
  ['Feb-09', '-0.6', '-1.5'],
  ['Mar-09', '-0.6', '-1.6'],
  ['Latest Estimate', '-0.9', '-2.1'],
];

test('ONS revision triangle: publication months to month-end days, cells to rows', () => {
  assert.equal(publicationDay('Apr-92'), '1992-04-30');
  assert.equal(publicationDay('Feb-24'), '2024-02-29');
  assert.equal(publicationDay('Sep 2026'), '2026-09-30');
  assert.equal(publicationDay('45900'), '2025-08-31');
  assert.equal(publicationDay('Latest Estimate'), undefined);
  const cells = parseOnsTriangle(TRIANGLE);
  assert.equal(cells.length, 7);
  const rows = cellsToRows(cells);
  const def = ONS_TRIANGLE_SERIES[0];
  const r = alfredReply(def, { id: 'ABMI', rows }, '2008-10-01', '2009-02-15', 'ONS', 'ONS');
  assert.deepEqual(r.releases, [
    { day: '2009-01-31', value: -1.5 },
    { day: '2009-03-31', value: -1.6 },
  ]);
  assert.deepEqual(r.asOf, { day: '2009-02-15', value: -1.5 });
  assert.equal(r.periodLabel, '2008 Q4');
  assert.deepEqual(parseOnsTriangle([['no header']]), []);
  const edition = latestEditionUri({ datasets: [{ uri: '/economy/x/datasets/abmi/quarter2' }, { uri: '/old' }] });
  assert.equal(edition, '/economy/x/datasets/abmi/quarter2');
  assert.equal(editionFileUrl(edition!, { downloads: [{ file: 'abmi.zip' }] }), 'https://www.ons.gov.uk/file?uri=%2Feconomy%2Fx%2Fdatasets%2Fabmi%2Fquarter2%2Fabmi.zip');
});

test('licence rows, glossary and the two Data health rows', async () => {
  assert.match(DATA_LICENCES.find((x) => x.id === 'ecb')!.usedFor, /Real-Time Database/);
  assert.match(DATA_LICENCES.find((x) => x.id === 'ons')!.usedFor, /revision triangle/);
  assert.ok(figureHelp('UK GDP as first published'));
  const rep = await checkConnections({
    env: {},
    only: ['ecb_rtd', 'ons_triangle'],
    fetchFn: async (u: string) => new Response(String(u).includes('ecb') ? ECB_CSV : JSON.stringify({ datasets: [{ uri: '/a/b/quarter2aprtojune2026' }] }), { status: 200 }),
  } as never);
  const by = Object.fromEntries(rep.results.map((x: { id: string; state?: string; sample?: string }) => [x.id, x]));
  assert.equal(by.ecb_rtd.state, 'connected');
  assert.match(by.ecb_rtd.sample || '', /^Euro area GDP: 4 published values for 3 quarters since 2023, first change recorded 2026-01-30$/);
  assert.match(by.ons_triangle.sample || '', /quarter2aprtojune2026/);
});

const workbook = () =>
  toXlsx([{ name: 'triangle', header: TRIANGLE[0], rows: TRIANGLE.slice(1) }]);

test('the downloads: ECB saved gzipped, ONS refused so the copy in data/local/ons-triangles is read', async () => {
  const mod = await import('../src/server/feeds/firstPublished.ts');
  mod.resetFirstPublishedForTests();
  const cells = await mod.onsTriangleCells(zipSync({ 'ABMI - Annual GDP at Market Prices.xlsx': new Uint8Array([1]), 'ABMI - Quarterly GDP at Market Prices.xlsx': workbook() }));
  assert.equal(cells.length, 7, 'the quarterly workbook inside the zip');
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    asked.push(url);
    if (url.includes('ecb')) return new Response(ECB_CSV, { status: 200 });
    return new Response('Too many requests', { status: 429 });
  }) as typeof fetch;
  try {
    const ea = (await mod.fetchEuroFirstPublished())!;
    assert.equal(ea.series.length, 3);
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'first-published-ea.json.gz')));
    assert.equal(await mod.fetchUkFirstPublished(), null, 'refused and no copy saved: nothing');
    fs.mkdirSync(mod.onsTriangleFolder(), { recursive: true });
    fs.writeFileSync(path.join(mod.onsTriangleFolder(), 'abmi.zip'), zipSync({ 'ABMI - Quarterly GDP at Market Prices.xlsx': workbook() }));
    const uk = (await mod.fetchUkFirstPublished())!;
    assert.equal(uk.series[0].id, 'ABMI');
    assert.match(uk.source, /copy saved in data\/local\/ons-triangles \(abmi\.zip\)/);
    const n = asked.length;
    await mod.fetchUkFirstPublished();
    assert.equal(asked.length, n, 'a fresh copy is not pulled again');
    mod.resetFirstPublishedForTests();
    assert.equal(mod.loadSavedFirstPublished('uk')!.series[0].rows.length, 4, 'read back from disk');
  } finally {
    globalThis.fetch = realFetch;
  }
});
