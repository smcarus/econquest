/**
 * OECD composite leading indicators: read the SDMX-CSV reply by column name, keep only the
 * amplitude-adjusted LI series, call the phase by the OECD rule, and say why a country is missing.
 * The figures below are test fixtures in the OECD's layout, not real readings.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cliFor, cliMissing, cliPhase, cliSentence, cliUrl, parseCli } from '../src/utils/oecdCli.ts';
import { parseSdmxCsv, splitCsvLine, startPeriod } from '../src/utils/oecdSdmx.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { cliRows } from '../src/utils/marketsMacro.ts';
import { COLUMN_BY_ID } from '../src/utils/watchlistView.ts';
import { benchmarkRows } from '../src/utils/marketEdgeAnchors.ts';
import type { WatchlistItem } from '../src/types/council.ts';

const HEAD = 'STRUCTURE,STRUCTURE_ID,ACTION,REF_AREA,FREQ,MEASURE,UNIT_MEASURE,ACTIVITY,ADJUSTMENT,TRANSFORMATION,TIME_HORIZ,METHODOLOGY,TIME_PERIOD,OBS_VALUE,OBS_STATUS';
const row = (area: string, period: string, v: number | string, measure = 'LI', adj = 'AA') =>
  `DATAFLOW,OECD.SDD.STES:DSD_STES@DF_CLI(4.1),I,${area},M,${measure},IX,_Z,${adj},IX,_Z,H,${period},${v},A`;
const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const CSV = [
  HEAD,
  ...months.map((m, i) => row('BRA', m, (99.2 + i * 0.1).toFixed(2))),
  ...months.map((m, i) => row('TUR', m, (100.9 - i * 0.15).toFixed(2))),
  ...months.map((m, i) => row('EA20', m, (99.5 + i * 0.05).toFixed(2))),
  // Other series in the same dataflow must not be read as the CLI.
  ...months.map((m) => row('BRA', m, '1.2', 'LI', 'NOR')),
  ...months.map((m) => row('EGY', m, '98.0', 'BCICP')),
  row('BRA', '2026-10', ''),
].join('\n');

test('reads the amplitude-adjusted CLI by column name; other series are left out', () => {
  const s = parseCli(CSV)!;
  assert.deepEqual(Object.keys(s).sort(), ['BRA', 'EA20', 'TUR']);
  const bra = cliFor('BRA', s)!;
  assert.equal(bra.month, '2026-09');
  assert.equal(bra.level, 99.8);
  assert.equal(bra.change1m, 0.1);
  assert.equal(bra.change6m, 0.6);
  assert.equal(bra.phase, 'recovery');
  assert.equal(cliFor('TUR', s)!.phase, 'downturn');
  // The EU row reads the euro area.
  assert.equal(cliFor('EUU', s)!.level, 99.8);
  assert.equal(cliFor('EGY', s), null);
  assert.match(cliSentence(bra), /OECD leading indicator 99\.80 \(Sep 2026\), \+0\.10 on the month: recovery \(below its long-term average of 100 and rising\)\./);
});

test('not SDMX-CSV, no series; the OECD phase rule as stated', () => {
  assert.equal(parseCli('<html>Error</html>'), null);
  assert.equal(parseCli(undefined), null);
  assert.equal(parseSdmxCsv('a,b\n1,2'), null);
  assert.deepEqual(splitCsvLine('a,"b, c",d'), ['a', 'b, c', 'd']);
  assert.equal(cliPhase(100.2, 0.1), 'expansion');
  assert.equal(cliPhase(100.2, -0.1), 'downturn');
  assert.equal(cliPhase(99.8, -0.1), 'slowdown');
  assert.equal(cliPhase(99.8, 0.1), 'recovery');
  assert.equal(cliMissing(true).short, 'OECD publishes no CLI');
  assert.equal(cliMissing(false).short, 'OECD did not answer');
});

test('query: one call for every area, euro area for the EU row, months back from today', () => {
  const now = new Date('2026-11-05T00:00:00Z');
  assert.equal(startPeriod(24, now), '2024-11');
  assert.equal(cliUrl({ now }), 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI,/.M.LI......?startPeriod=2024-11&format=csvfile');
  assert.match(cliUrl({ areas: ['USA', 'EUU'], months: 6, now }), /\/USA\+EA20\+EA19\+EA\.M\.LI\.{6}\?startPeriod=2026-05/);
  assert.match(cliUrl({ wide: true, now }), /DF_CLI,\/all\?/);
});

const s = parseCli(CSV)!;
const pulledAt = '2026-11-05T02:00:00Z';
const BRA = { iso3: 'BRA', countryName: 'Brazil', oecdCli: { ...cliFor('BRA', s)!, pulledAt } } as WatchlistItem;
const TUR = { iso3: 'TUR', countryName: 'Turkey', oecdCli: { ...cliFor('TUR', s)!, pulledAt } } as WatchlistItem;
const EGY = { iso3: 'EGY', countryName: 'Egypt', oecdCliPulledAt: pulledAt } as WatchlistItem;
const IDN = { iso3: 'IDN', countryName: 'Indonesia' } as WatchlistItem;

test('Global Spillover agent: CLI figures are official with the month, the phase is its own reading', () => {
  const q = 'Which countries are heading into a slowdown on the OECD leading indicator?';
  const plan = planCouncil(q, [BRA, TUR, EGY]);
  assert.ok(plan.agents.some((a) => a.id === 'spill'));
  const sp = runCouncil(q, plan, [BRA, TUR, EGY]).find((a) => a.id === 'spill')!;
  const tur = sp.findings.find((f) => f.iso3 === 'TUR')!;
  const lvl = tur.figures.find((f) => f.label === 'OECD leading indicator')!;
  assert.equal(lvl.tag, 'official');
  assert.match(lvl.source, /Sep 2026/);
  assert.equal(tur.figures.find((f) => f.label === 'Growth cycle phase')!.tag, 'model');
  assert.match(tur.reading, /downturn/);
  assert.ok(sp.missing.some((m) => /Egypt: OECD leading indicator missing \(OECD publishes no CLI\)/.test(m)));
});

test('Country tab, watchlist and benchmarks: level with month and pull date, Missing with the reason', () => {
  const rows = cliRows(BRA);
  assert.equal(rows[0].value, '99.80');
  assert.match(rows[0].source, /Sep 2026 \(pulled 2026-11-05\)/);
  assert.equal(rows.find((r) => r.label === 'Change over 6 months')!.value, '+0.60');
  const egy = cliRows(EGY);
  assert.equal(egy[0].value, 'Missing');
  assert.match(egy[0].help!, /publishes no composite leading indicator/);
  assert.match(cliRows(IDN)[0].help!, /did not answer/);
  const col = COLUMN_BY_ID.oecdCli;
  assert.equal(col.text(BRA), '99.8');
  assert.equal(col.note!(BRA), 'OECD, Sep 2026, recovery');
  assert.equal(col.text(EGY), '–');
  assert.equal(col.note!(EGY), 'OECD publishes no CLI');
  const [chn] = benchmarkRows([{ iso3: 'CHN', countryName: 'China', cliPulledAt: pulledAt }], []);
  assert.equal(chn.cliNote, 'OECD leading indicator: Missing (OECD publishes no CLI)');
});
