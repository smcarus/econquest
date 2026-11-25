import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editionsBetween, editionsToRows, extendRows, lastEdition, oecdRtUrl, parseOecdRevisionsCsv, rowDate, OECD_RT_DEFS } from '../src/utils/oecdRealTime.ts';
import { figureAsOf, firstRelease, indexVintages } from '../src/utils/realTimeEval.ts';

const H = 'DATAFLOW,REF_AREA,FREQ,MEASURE,UNIT_MEASURE,ACTIVITY,EDITION,TIME_PERIOD,OBS_VALUE,OBS_STATUS,UNIT_MULT,DECIMALS,BASE_PER';
const row = (ed: string, period: string, v: string, area = 'CAN') => `OECD.SDD.STES:DSD_STES_REVISIONS@DF_STES_REVISIONS(4.0),${area},Q,B1GQ_Q,XDC,_T,${ed},${period},${v},A,0,0,`;

test('URL, period dates and edition ranges', () => {
  assert.equal(oecdRtUrl('CAN', 'gdp', '2024-Q1', ['202501']), 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES_REVISIONS@DF_STES_REVISIONS,4.0/CAN.Q.B1GQ_Q...202501?format=csvfile&startPeriod=2024-Q1');
  assert.equal(rowDate('2024-Q3'), '2024-07-01');
  assert.equal(rowDate('2024-11'), '2024-11-01');
  assert.deepEqual(editionsBetween('202411', '202502'), ['202412', '202501', '202502']);
});

test('editions become rows: a revision closes the old value the day before the new edition', () => {
  const csv = [H, row('202402', '2023-Q3', '100'), row('202402', '2023-Q4', '101'), row('202405', '2023-Q3', '100'), row('202405', '2023-Q4', '101.5'), row('202405', '2024-Q1', '103'), row('202405', '2024-Q1', '1', 'USA'), row('202405', '2024-Q2', '')].join('\r\n');
  const eds = parseOecdRevisionsCsv(csv, 'CAN');
  assert.deepEqual([...eds.keys()], ['202402', '202405']);
  const rows = editionsToRows(eds);
  assert.deepEqual(rows, [
    { date: '2023-07-01', value: 100, from: '2024-02-01', to: '9999-12-31' },
    { date: '2023-10-01', value: 101, from: '2024-02-01', to: '2024-04-30' },
    { date: '2023-10-01', value: 101.5, from: '2024-05-01', to: '9999-12-31' },
    { date: '2024-01-01', value: 103, from: '2024-05-01', to: '9999-12-31' },
  ]);
  assert.equal(lastEdition(rows), '202405');
  // The real-time reader sees Q4 growth of 1% in March 2024 and 1.5% from May.
  const ix = indexVintages(OECD_RT_DEFS.gdp, rows);
  assert.ok(Math.abs(figureAsOf(ix, '2023-10-01', '2024-03-15')! - 1) < 1e-9);
  assert.ok(Math.abs(figureAsOf(ix, '2023-10-01', '2024-06-01')! - 1.5) < 1e-9);
  assert.equal(firstRelease(ix, '2023-10-01')!.day, '2024-02-01');
});

test('later editions extend saved rows exactly as reading them all at once', () => {
  const all = new Map([
    ['202401', new Map([['2023-07-01', 10], ['2023-10-01', 11]])],
    ['202402', new Map([['2023-07-01', 10], ['2023-10-01', 12]])],
    ['202403', new Map([['2023-10-01', 12], ['2024-01-01', 13]])],
  ]);
  const once = editionsToRows(all);
  const first = editionsToRows(new Map([...all].slice(0, 1)));
  const later = extendRows(first, new Map([...all].slice(1)));
  assert.deepEqual(later, once);
  assert.ok(once.some((r) => r.date === '2023-07-01' && r.to === '2024-02-29'), 'a period dropped from an edition stops there');
});
