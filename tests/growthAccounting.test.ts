import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { decompose, gaCsv, gaSentence, growthAccounting, parsePwtRows, PWT_EDITION, type GrowthAccounting, type PwtFile, type PwtYear } from '../src/utils/growthAccounting.ts';
import { loadPwt, readPwtWorkbook, resetPwtForTests } from '../src/server/feeds/pwt.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';
import { DATA_LICENCES, PLANNED_LICENCES } from '../src/data/dataLicences.ts';

/** Years growing at fixed rates: GDP g, capital k, persons e, hours h, human capital c; labour share s. */
const grow = (from: number, to: number, r: { g: number; k: number; e: number; h?: number; c: number; s: number }): PwtYear[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    year: from + i,
    rgdpna: 100 * Math.exp((r.g / 100) * i),
    rnna: 300 * Math.exp((r.k / 100) * i),
    emp: 10 * Math.exp((r.e / 100) * i),
    ...(r.h !== undefined ? { avh: 2000 * Math.exp((r.h / 100) * i) } : {}),
    hc: 2 * Math.exp((r.c / 100) * i),
    labsh: r.s,
  }));

test('the split: α × capital + (1 − α) × (hours + human capital) + TFP adds up to GDP growth', () => {
  // α = 0.4: capital 0.4 × 5 = 2; hours (1 + −0.2) × 0.6 = 0.48; human capital 0.6 × 0.5 = 0.3; TFP 4 − 2.78 = 1.22.
  const p = decompose(grow(2013, 2023, { g: 4, k: 5, e: 1, h: -0.2, c: 0.5, s: 0.6 }), 2013, 2023)!;
  assert.deepEqual(p, { from: 2013, to: 2023, gdp: 4, capital: 2, labour: 0.48, humanCapital: 0.3, tfp: 1.22, capitalShare: 0.4, personsOnly: false });
  assert.ok(Math.abs(p.capital + p.labour + p.humanCapital + p.tfp - p.gdp) < 0.02);
  // No hours: persons engaged only, and it says so.
  const q = decompose(grow(2013, 2023, { g: 4, k: 5, e: 1, c: 0.5, s: 0.6 }), 2013, 2023)!;
  assert.equal(q.labour, 0.6);
  assert.equal(q.personsOnly, true);
});

test('periods: ten-year spans back from the last year, at most six; reading and CSV', () => {
  const file: PwtFile = { edition: PWT_EDITION, from: 'test', readAt: 'x', countries: { TST: grow(1950, 2023, { g: 3, k: 4, e: 1, h: 0, c: 0.6, s: 0.55 }) } };
  const r = growthAccounting(file, 'TST') as GrowthAccounting;
  assert.equal(r.ok, true);
  assert.deepEqual(r.periods.map((p) => `${p.from}-${p.to}`), ['1963-1973', '1973-1983', '1983-1993', '1993-2003', '2003-2013', '2013-2023']);
  assert.equal(r.lastYear, 2023);
  assert.deepEqual(r.missing, []);
  assert.match(gaSentence(r, 'Testland'), /^Testland: from 2013 to 2023 real GDP grew 3\.0% a year on average\. Capital added \+1\.8 points, hours worked \+0\.6, human capital \+0\.3, and productivity \(TFP, what is left\) \+0\.3 \(PWT 11\.0\)\.$/);
  const csv = gaCsv('TST', r);
  assert.ok(csv.startsWith('﻿iso3,edition,from,to,gdp_growth_pct_yr'));
  assert.equal(csv.trim().split('\r\n').length, 7);
  assert.match(csv, /CC BY 4\.0/);
});

test('Missing with the reason: not saved, not covered, too few years, no labour share', () => {
  assert.match((growthAccounting(null, 'TST') as { reason: string }).reason, /data\/local\/pwt\//);
  const file: PwtFile = { edition: PWT_EDITION, from: 'test', readAt: 'x', countries: { TST: grow(2018, 2023, { g: 3, k: 4, e: 1, c: 0.6, s: 0.5 }), NOL: grow(2000, 2023, { g: 3, k: 4, e: 1, c: 0.6, s: 0.5 }).map(({ labsh: _l, ...y }) => y) } };
  assert.equal((growthAccounting(file, 'ZZZ') as { reason: string }).reason, 'PWT 11.0 does not cover this country');
  assert.match((growthAccounting(file, 'TST') as { reason: string }).reason, /fewer than 11 years/);
  assert.match((growthAccounting(file, 'NOL') as { reason: string }).reason, /lacks the labour share/);
});

test('the PWT Data sheet: header found, blanks left out, a workbook in data/local/pwt/ is read and saved', async () => {
  const rows = [['Penn World Table 11.0'], ['countrycode', 'country', 'currency_unit', 'year', 'rgdpna', 'rnna', 'emp', 'avh', 'hc', 'labsh'], ['TST', 'Testland', 'x', '2022', '100', '300', '10', '', '2.5', '0.6'], ['TST', 'Testland', 'x', '2023', '103', '310', '10.1', '1900', '2.51', '0.61']];
  const parsed = parsePwtRows(rows)!;
  assert.deepEqual(parsed.TST[0], { year: 2022, rgdpna: 100, rnna: 300, emp: 10, hc: 2.5, labsh: 0.6 });
  assert.equal(parsed.TST[1].avh, 1900);
  assert.equal(parsePwtRows([['a', 'b']]), null);

  // A minimal .xlsx with a sheet named Data.
  const cell = (ref: string, v: string) => (/^[\d.]+$/.test(v) ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`);
  const cols = 'ABCDEFGHIJ';
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
    .slice(1)
    .map((r, i) => `<row r="${i + 1}">${r.map((v, j) => (v === '' ? '' : cell(`${cols[j]}${i + 1}`, v))).join('')}</row>`)
    .join('')}</sheetData></worksheet>`;
  const xlsx = zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Info" sheetId="1" r:id="rId1"/><sheet name="Data" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'),
    'xl/worksheets/sheet2.xml': strToU8(sheet),
  });
  const got = await readPwtWorkbook(xlsx, 'pwt110.xlsx');
  assert.ok('countries' in got, JSON.stringify(got));
  assert.equal(got.countries.TST.length, 2);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwt-'));
  fs.mkdirSync(path.join(dir, 'local', 'pwt'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'local', 'pwt', 'pwt110.xlsx'), xlsx);
  resetPwtForTests();
  const loaded = await loadPwt(dir);
  assert.equal(loaded?.from, 'pwt110.xlsx');
  assert.ok(fs.existsSync(path.join(dir, 'local', 'pwt', 'pwt-growth.json')), 'only the columns used are saved beside it');
  resetPwtForTests();
});

test('wired: register, tool, panel, route, licence row moved from planned to in use', () => {
  assert.equal(registerEntry('growth_accounting')!.status, 'descriptive');
  assert.equal(READY_BY_ID.growth_accounting.target.anchor, 'tool-growth-accounting');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-growth-accounting"/);
  assert.match(page, /GrowthAccountingPanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/growth-accounting\/:iso3/);
  assert.equal(DATA_LICENCES.find((l) => l.id === 'pwt')?.status, 'open');
  assert.ok(!PLANNED_LICENCES.some((l) => l.id === 'pwt'));
});
