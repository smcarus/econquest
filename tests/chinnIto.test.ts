/**
 * Capital account openness (console integration item 13): the Chinn-Ito file read by column name,
 * the links on the authors' page, the scorecard row and the History & data series.
 *
 * The rows below follow the published layout of kaopen_2023.xls (cn, ccode, country_name, year,
 * kaopen, ka_open, per the 2023 readme). The values are made up for the layout test and are not
 * Chinn-Ito figures; the live file is checked on the Mac (npm run chinn-ito:pull, check:data row
 * chinn_ito), since the authors' site does not answer from the cloud session that built this.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chinnItoLinks, chinnItoReading, chinnItoSeries, parseChinnItoRows, CHINN_ITO_CITATION } from '../src/utils/chinnIto';
import { countryRiskScorecard } from '../src/utils/countryRiskScorecard';
import { countrySeries } from '../src/utils/seriesHistory';
import { licenceRowsForSource } from '../src/utils/licenceLookup';
import { FILE_PULLS } from '../src/utils/dailyRun';
import { shareableSource } from '../src/utils/consoleEvents';

const rows = [
  ['cn', 'ccode', 'country_name', 'year', 'kaopen', 'ka_open'],
  ['1', 'AAA', 'Testland', '2018', '-1.2', '0.17'],
  ['1', 'AAA', 'Testland', '2023', '0.5', '0.58'],
  ['2', 'BBB', 'Otherland', '2023', '2.3', '1'],
  ['3', 'CCC', 'Thirdland', '2023', '-1.9', '0'],
  ['4', 'DDD', 'Gapland', '2023', '.', ''],
];

test('the file is read by column name; blank and "." cells are no value', () => {
  const t = parseChinnItoRows(rows);
  assert.ok(!('reason' in t));
  if ('reason' in t) return;
  assert.deepEqual(Object.keys(t.countries).sort(), ['AAA', 'BBB', 'CCC']);
  assert.deepEqual([t.firstYear, t.lastYear], [2018, 2023]);
  assert.deepEqual(t.countries.AAA, [{ year: 2018, kaopen: -1.2, kaOpen: 0.17 }, { year: 2023, kaopen: 0.5, kaOpen: 0.58 }]);
  assert.match((parseChinnItoRows([['month', 'GPR']]) as { reason: string }).reason, /ccode/);
});

test('the reading: latest year, five-year change, place among countries that year', () => {
  const t = parseChinnItoRows(rows) as Exclude<ReturnType<typeof parseChinnItoRows>, { reason: string }>;
  assert.deepEqual(chinnItoReading(t, 'aaa'), { year: 2023, kaopen: 0.5, kaOpen: 0.58, change5y: 0.41, lessOpenPct: 33, countriesThatYear: 3 });
  assert.deepEqual(chinnItoReading(t, 'ZZZ'), { missing: 'not in the Chinn-Ito file (2018-2023)' });
});

test('newest kaopen file linked from the page comes first', () => {
  const html = '<a href="kaopen_2021.xls">old</a> <a href="https://web.pdx.edu/~ito/kaopen_2023.xls">Excel</a> <a href="kaopen_2023.dta">STATA</a> <a href=Readme_kaopen2023.pdf>readme</a>';
  assert.deepEqual(chinnItoLinks(html), ['https://web.pdx.edu/~ito/kaopen_2023.xls', 'https://web.pdx.edu/~ito/kaopen_2021.xls']);
  assert.deepEqual(chinnItoLinks('<p>nothing</p>'), []);
});

test('scorecard: a capital account pillar, or Missing with the reason', () => {
  const t = parseChinnItoRows(rows) as Exclude<ReturnType<typeof parseChinnItoRows>, { reason: string }>;
  const r = chinnItoReading(t, 'AAA');
  const p = countryRiskScorecard({ official: {}, capital: 'missing' in r ? null : r }).pillars.find((x) => x.id === 'capital')!;
  assert.equal(p.rows[0]!.value, 0.58);
  assert.equal(p.rows[0]!.change5y, 0.41);
  assert.equal(p.rows[0]!.context, 'more open than 33% of 3 countries that year');
  assert.equal(p.rows[1]!.label, 'Chinn-Ito index as published (KAOPEN)');
  const none = countryRiskScorecard({ official: {}, capitalMissing: 'no Chinn-Ito file in data/local/chinn-ito' }).pillars.find((x) => x.id === 'capital')!;
  assert.deepEqual(none.rows, []);
  assert.deepEqual(none.missing, ['Chinn-Ito index: no Chinn-Ito file in data/local/chinn-ito']);
});

test('History & data series carry the citation and the licence row; Missing says why', () => {
  const t = { ...(parseChinnItoRows(rows) as Exclude<ReturnType<typeof parseChinnItoRows>, { reason: string }>), file: 'kaopen_2023.xls', saved: '2026-11-13T05:00:00.000Z' };
  const set = countrySeries('AAA', { chinnIto: t });
  const s = set.series.find((x) => x.id === 'capital_openness')!;
  assert.deepEqual(s.points, [{ date: '2018', value: 0.17 }, { date: '2023', value: 0.58 }]);
  assert.ok(s.about!.includes(CHINN_ITO_CITATION));
  assert.deepEqual(licenceRowsForSource(s.source).map((x) => x.id), ['chinn_ito']);
  assert.equal(shareableSource(s.source), false, 'no licence: not passed on in sharing mode');
  assert.equal(chinnItoSeries('ZZZ', t).every((x) => 'reason' in x && /Not in the Chinn-Ito file/.test(x.reason)), true);
  const missing = countrySeries('AAA', { chinnItoMissing: 'no Chinn-Ito file in data/local/chinn-ito' }).missing.find((x) => x.id === 'capital_openness')!;
  assert.equal(missing.reason, 'no Chinn-Ito file in data/local/chinn-ito');
});

test('the daily download fetches the file', () => {
  assert.ok(FILE_PULLS.some((p) => p.id === 'chinn_ito' && p.script === 'chinn-ito-pull.ts'));
});
