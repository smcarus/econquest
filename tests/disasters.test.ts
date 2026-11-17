import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { emdatTable, disasterView, disasterSentence, EMDAT_NO_FILE, EMDAT_NO_COUNTRY, EMDAT_NONE_SINCE, type EmdatTable } from '../src/utils/disasters.ts';
import { emdatInput } from '../src/utils/disasterStore.ts';
import { toXlsx } from '../src/utils/xlsxExport.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

// The public table columns EM-DAT documents (a subset, in its order, with its typographic quotes).
const HEAD = ['DisNo.', 'Historic', 'Disaster Group', 'Disaster Subgroup', 'Disaster Type', 'Disaster Subtype', 'Event Name', 'ISO', 'Country', 'Start Year', 'Start Month', 'Total Deaths', 'No. Injured', 'Total Affected', 'Total Damage (‘000 US$)', 'Total Damage, Adjusted (‘000 US$)'];
const ev = (id: string, iso: string, group: string, type: string, year: number, deaths: string, affected: string, dmg = '', adj = '', name = '') =>
  [id, year < 2000 ? 'Yes' : 'No', group, group === 'Natural' ? 'Hydrological' : 'Industrial accident', type, type, name, iso, 'Somewhere', String(year), '6', deaths, '', affected, dmg, adj];

// Mozambique: 1 pre-2000 flood, 5 natural events since 2000 (one with no figures), 1 technological event left out.
const ROWS = [
  HEAD,
  ev('1999-0001-MOZ', 'MOZ', 'Natural', 'Flood', 1999, '50', '1000'),
  ev('2000-0010-MOZ', 'MOZ', 'Natural', 'Flood', 2000, '800', '4500000', '419000', '750000'),
  ev('2019-0100-MOZ', 'MOZ', 'Natural', 'Storm', 2019, '603', '1500000', '1000000', '1200000', 'Cyclone Idai'),
  ev('2019-0200-MOZ', 'MOZ', 'Natural', 'Storm', 2019, '45', '300000', '', '', 'Cyclone Kenneth'),
  ev('2022-0050-MOZ', 'MOZ', 'Natural', 'Drought', 2022, '', '1800000'),
  ev('2023-0001-MOZ', 'MOZ', 'Natural', 'Flood', 2023, '', ''),
  ev('2021-0003-MOZ', 'MOZ', 'Technological', 'Explosion (industrial)', 2021, '20', '50'),
  ev('1998-0001-KEN', 'KEN', 'Natural', 'Flood', 1998, '10', '100'),
  ev('2024-0001-PHL', 'PHL', 'Natural', 'Storm', 2024, '10', '500'),
];

const table = (): EmdatTable => {
  const t = emdatTable(ROWS, 'public_emdat.xlsx');
  assert.ok('countries' in t);
  return t;
};

const series = {
  gdp_usd: [{ year: 2000, value: 4.2 }, { year: 2019, value: 15 }],
  population: [{ year: 2023, value: 33 }, { year: 2024, value: 34 }],
};

test('emdatTable reads the public table, natural events only, damage in US$ bn', () => {
  const t = table();
  assert.equal(t.leftOut, 1);
  assert.equal(t.latestYear, 2024);
  assert.deepEqual([...t.countries.keys()].sort(), ['KEN', 'MOZ', 'PHL']);
  const idai = t.countries.get('MOZ')!.find((e) => e.id === '2019-0100-MOZ')!;
  assert.deepEqual(idai, { id: '2019-0100-MOZ', type: 'Storm', year: 2019, name: 'Cyclone Idai', month: 6, deaths: 603, affected: 1500000, damage: 1, damageAdj: 1.2 });
  const blank = t.countries.get('MOZ')!.find((e) => e.id === '2023-0001-MOZ')!;
  assert.equal(blank.deaths, undefined);
  assert.equal(blank.affected, undefined);
  assert.match((emdatTable([['Country', 'Year']], 'x.xlsx') as { reason: string }).reason, /not the EM-DAT public table/);
});

test('disasterView: since 2000, by type, last ten years, largest events, damage over GDP', () => {
  const v = disasterView({ iso3: 'MOZ', emdat: { table: table(), downloadYear: 2026 }, series });
  assert.equal(v.from, 2000);
  assert.equal(v.to, 2024);
  assert.deepEqual(v.totals, { events: 5, deaths: 1448, affected: 8100000, damageAdj: 1.95, withDamage: 2 });
  assert.deepEqual(v.perYear, { events: 0.2, deaths: 58, affected: 324000, affectedPctPop: 0.95, popYear: 2024 });
  assert.deepEqual(
    v.byType.map((b) => [b.type, b.events, b.deaths]),
    [['Flood', 2, 800], ['Storm', 2, 648], ['Drought', 1, 0]],
  );
  assert.deepEqual(v.years.map((y) => y.year), [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
  const y19 = v.years.find((y) => y.year === 2019)!;
  assert.deepEqual(y19, { year: 2019, events: 2, deaths: 648, affected: 1800000, damage: 1, damagePctGdp: 6.67 });
  assert.equal(v.years.find((y) => y.year === 2022)!.damage, undefined);
  assert.deepEqual(v.largest.map((e) => e.id), ['2000-0010-MOZ', '2022-0050-MOZ', '2019-0100-MOZ', '2019-0200-MOZ']);
  assert.equal(v.largest[0].damagePctGdp, 9.98);
  assert.equal(v.citation, 'EM-DAT data, 2026, www.emdat.be');
  const s = disasterSentence(v, 'Mozambique');
  assert.match(s, /EM-DAT lists 5 natural disasters in Mozambique from 2000 to 2024 \(flood 2, storm 2, drought 1\)/);
  assert.match(s, /1,448 deaths and 8\.1 million people affected/);
  assert.match(s, /0\.95% of the population/);
});

test('disasterView says Missing with the reason', () => {
  assert.equal(disasterView({ iso3: 'MOZ', emdat: { table: null }, series }).missing, EMDAT_NO_FILE);
  assert.equal(disasterView({ iso3: 'MOZ', emdat: { table: null, reason: 'bad file' }, series }).missing, 'bad file');
  assert.equal(disasterView({ iso3: 'CHL', emdat: { table: table() }, series }).missing, EMDAT_NO_COUNTRY);
  const ken = disasterView({ iso3: 'KEN', emdat: { table: table() }, series: {} });
  assert.equal(ken.missing, EMDAT_NONE_SINCE);
  assert.equal(ken.totals, undefined);
  assert.match(disasterSentence(ken, 'Kenya'), /Missing/);
  // No GDP or population: counts still shown, shares left out.
  const bare = disasterView({ iso3: 'MOZ', emdat: { table: table() }, series: {} });
  assert.equal(bare.perYear?.affectedPctPop, undefined);
  assert.ok(bare.years.every((y) => y.damagePctGdp === undefined));
});

test('emdatInput reads the .xlsx (or a .zip of it) from data/local/emdat/ and says why a file did not read', () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-emdat-'));
  try {
    assert.deepEqual(emdatInput(dataDir), { table: null });
    const dir = path.join(dataDir, 'local', 'emdat');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'public_emdat_custom_request.xlsx'), toXlsx([{ name: 'EM-DAT Data', header: HEAD, rows: ROWS.slice(1) }]));
    const got = emdatInput(dataDir);
    assert.equal(got.table?.countries.get('MOZ')?.length, 6);
    assert.equal(got.downloadYear, new Date().getUTCFullYear());
    rmSync(path.join(dir, 'public_emdat_custom_request.xlsx'));
    writeFileSync(path.join(dir, 'other.xlsx'), toXlsx([{ name: 'Sheet1', header: ['a', 'b'], rows: [['1', '2']] }]));
    assert.match(emdatInput(dataDir).reason!, /did not read/);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('PA6 uses saved GDP and population and has its panel text', () => {
  assert.ok(OFFICIAL_FIGURES.some((f) => f.id === 'gdp_usd'));
  assert.ok(OFFICIAL_FIGURES.some((f) => f.id === 'population'));
  for (const k of ['ds_title', 'ds_summary', 'ds_criteria', 'ds_fileNote'] as const) assert.ok(k in PANELS.en, k);
});
