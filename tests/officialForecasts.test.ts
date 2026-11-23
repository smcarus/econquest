import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  gepAllUrl,
  officialForecastsFor,
  oecdEoAllUrl,
  parseGepAll,
  parseOecdEoCsv,
  parseOecdEoEdition,
  parseWeoAll,
  phillySpfLatest,
  type OfficialForecastsFile,
} from '../src/utils/officialForecasts.ts';
import { toXlsx } from '../src/utils/xlsxExport.ts';
import { readXlsxSheet } from '../src/utils/xlsxRead.ts';

const fx = (f: string) => readFileSync(path.join(import.meta.dirname, 'fixtures/official-forecasts', f), 'utf8');
const NOW = new Date('2026-11-23T12:00:00Z');

test('World Bank GEP: the reply read live on 23 November 2026 gives every year and the edition', () => {
  const g = parseGepAll(JSON.parse(fx('gep-bra-nga-2026-11-23.json')));
  assert.equal(g.edition, 'updated 2026-06-11');
  assert.deepEqual(g.byIso.BRA, { '2023': 3.2, '2024': 3.4, '2025': 2.3, '2026': 1.9, '2027': 2, '2028': 2.2 });
  assert.equal(g.byIso.NGA['2027'], 4.2);
  assert.deepEqual(parseGepAll({ message: 'not found' }).byIso, {}, 'an error reply gives nothing');
  assert.match(gepAllUrl(2026), /country\/all\/indicator\/NYGDPMKTPKDZ\?source=27&format=json&per_page=20000&date=2025:2030$/);
});

test('OECD Economic Outlook: the CSV read live on 23 November 2026, and the edition from the dataflow name', () => {
  const o = parseOecdEoCsv(fx('oecd-eo-bra-usa-2026-11-23.csv'));
  assert.deepEqual(o.BRA?.gdp, { '2024': 3.4, '2025': 2.3, '2026': 1.6, '2027': 2.1 });
  assert.equal(o.USA?.cpi?.['2026'], 3.5);
  assert.equal(o.NGA, undefined, 'Nigeria is not in the Outlook');
  assert.equal(parseOecdEoEdition('<common:Name xml:lang="en">Economic Outlook No 119 (Edition 2026/1)</common:Name>'), 'Economic Outlook No 119 (Edition 2026/1)');
  assert.equal(parseOecdEoEdition('<html>error</html>'), undefined);
  assert.deepEqual(parseOecdEoCsv('<html>Service unavailable</html>'), {});
  assert.match(oecdEoAllUrl(2026), /DSD_EO@DF_EO,\/\.GDPV_ANNPCT\+CPI_YTYPCT\.A\?startPeriod=2025&format=csvfile$/);
});

test('IMF DataMapper: one code for every country', () => {
  // Layout of api/v1/<code>; the values are made up for the test.
  const w = parseWeoAll({ values: { NGDP_RPCH: { BRA: { '2026': 2.04, '2027': 2.25, x: 1 }, WEOWORLD: { '2026': 3 }, NGA: {} } }, api: { version: '1' } }, 'NGDP_RPCH');
  assert.deepEqual(w, { BRA: { '2026': 2, '2027': 2.3 } });
  assert.deepEqual(parseWeoAll(null, 'NGDP_RPCH'), {});
});

test('side by side: same-basis rows give the spread; uncovered sources say why; Missing is never a number', () => {
  const file: OfficialForecastsFile = {
    pulledAt: '2026-11-23T06:00:00Z',
    weo: { gdp: { BRA: { '2026': 2.4, '2027': 2.2, '2028': 2.3 }, NGA: { '2026': 3.9, '2027': 4 } }, cpi: { BRA: { '2026': 4.6, '2027': 3.9 } } },
    gep: parseGepAll(JSON.parse(fx('gep-bra-nga-2026-11-23.json'))),
    oecd: { edition: 'Economic Outlook No 119 (Edition 2026/1)', byIso: parseOecdEoCsv(fx('oecd-eo-bra-usa-2026-11-23.csv')) },
  };
  const bra = officialForecastsFor('bra', file, null, { now: NOW });
  assert.deepEqual(bra.years, ['2026', '2027', '2028']);
  const gdp = bra.measures.find((m) => m.measure === 'gdp')!;
  assert.deepEqual(gdp.rows.map((r) => r.source), ['imf_weo', 'wb_gep', 'oecd_eo']);
  assert.deepEqual(gdp.spread, [
    { year: '2026', sources: 3, spread: 0.8 },
    { year: '2027', sources: 3, spread: 0.2 },
    { year: '2028', sources: 2, spread: 0.1 },
  ]);
  assert.equal(gdp.rows[1].edition, 'updated 2026-06-11');
  const cpi = bra.measures.find((m) => m.measure === 'cpi')!;
  assert.deepEqual(cpi.rows.map((r) => r.source), ['imf_weo', 'oecd_eo'], 'the World Bank publishes no inflation forecast here');
  assert.equal(cpi.spread[2].spread, null, 'one source is not a spread');

  const nga = officialForecastsFor('NGA', file, null, { now: NOW });
  const ngaGdp = nga.measures[0];
  assert.deepEqual(ngaGdp.missing, [{ source: 'oecd_eo', measure: 'gdp', why: 'not_in_oecd' }]);
  assert.deepEqual(nga.measures[1].missing.map((m) => [m.source, m.why]), [['imf_weo', 'no_years'], ['oecd_eo', 'not_in_oecd']]);

  const none = officialForecastsFor('BRA', null, null, { now: NOW });
  assert.ok(none.measures.every((m) => m.rows.length === 0 && m.missing.every((x) => x.why === 'not_downloaded')));
  const failed = officialForecastsFor('BRA', { pulledAt: file.pulledAt, problems: { wb_gep: 'World Bank GEP did not answer: No answer within 120 s.' } }, null, { now: NOW });
  assert.deepEqual(failed.measures[0].missing.find((m) => m.source === 'wb_gep'), { source: 'wb_gep', measure: 'gdp', why: 'not_read', detail: 'World Bank GEP did not answer: No answer within 120 s.' });
});

test('Philadelphia Fed: growth from annual-average levels, inflation fourth quarter on fourth quarter, kept out of the spread', async () => {
  // A workbook in the medianLevel.xlsx layout; the figures are made up for the test.
  const book = toXlsx([
    { name: 'RGDP', header: ['YEAR', 'QUARTER', 'RGDP1', 'RGDPA', 'RGDPB', 'RGDPC', 'RGDPD'], rows: [[2026, 3, 1, 23000, 23460, 23929.2, '#N/A'], [2026, 4, 1, 23100, 23654.4, 24174.8, 24658.3]] },
    { name: 'CPI', header: ['YEAR', 'QUARTER', 'CPI1', 'CPIA', 'CPIB', 'CPIC'], rows: [[2026, 4, 4, 3.8, 2.6, 2.4], [2026, 3, 2.5, 3, 2.4, 2.3]] },
  ]);
  const p = phillySpfLatest(await readXlsxSheet(book, 'RGDP'), await readXlsxSheet(book, 'CPI'));
  assert.equal(p?.survey, '2026 Q4 survey');
  assert.deepEqual(p?.gdp, { '2027': 2.4, '2028': 2.2, '2029': 2 }, 'this year needs last year\'s actual, which the workbook does not hold');
  assert.deepEqual(p?.cpi, { '2026': 3.8, '2027': 2.6, '2028': 2.4 });
  assert.equal(phillySpfLatest(null, null), null);

  const file: OfficialForecastsFile = { pulledAt: '2026-11-23T06:00:00Z', weo: { gdp: { USA: { '2026': 2, '2027': 2.1 } }, cpi: { USA: { '2026': 3.4, '2027': 2.5 } } } };
  const usa = officialForecastsFor('USA', file, p, { now: NOW });
  const cpi = usa.measures[1];
  assert.equal(cpi.rows.find((r) => r.source === 'philly_spf')?.basis, 'q4_on_q4');
  assert.equal(cpi.spread[0].sources, 1, 'a different basis is not compared');
  assert.equal(usa.measures[0].spread[1].spread, 0.3);
  const noFile = officialForecastsFor('USA', file, null, { now: NOW, phillyFile: false });
  assert.equal(noFile.measures[0].missing.find((m) => m.source === 'philly_spf')?.why, 'philly_no_file');
  assert.equal(officialForecastsFor('USA', file, null, { now: NOW, phillyFile: true }).measures[0].missing.find((m) => m.source === 'philly_spf')?.why, 'philly_bad_file');
  assert.ok(!officialForecastsFor('BRA', file, null, { now: NOW }).measures[0].missing.some((m) => m.source === 'philly_spf'), 'United States only');
});
