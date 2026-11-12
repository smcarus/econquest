import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { cellsToRows, dayBefore, firstPrints, releaseDays } from '../src/utils/firstPublished.ts';
import { ALFRED_SERIES, figureOn, releasesOf } from '../src/utils/alfredVintages.ts';
import { loadFirstPublished, saveFirstPublished } from '../src/server/firstPublishedStore.ts';

// Three releases of a quarterly level: 2026 Q1 revised once, 2026 Q2 first printed in the third.
const cells = [
  { date: '2026-01-01', vintage: '2026-05-15', value: 100 },
  { date: '2025-10-01', vintage: '2026-05-15', value: 99 },
  { date: '2026-01-01', vintage: '2026-06-30', value: 100 },
  { date: '2025-10-01', vintage: '2026-06-30', value: 99.2 },
  { date: '2026-01-01', vintage: '2026-08-14', value: 100.4 },
  { date: '2025-10-01', vintage: '2026-08-14', value: 99.2 },
  { date: '2026-04-01', vintage: '2026-08-14', value: 101 },
  { date: 'bad', vintage: '2026-08-14', value: 1 },
  { date: '2026-04-01', vintage: '2026-09-30', value: Number.NaN },
];

test('cells become rows: repeated values merged, revisions start a row, the newest runs on', () => {
  assert.equal(dayBefore('2026-03-01'), '2026-02-28');
  const rows = cellsToRows(cells);
  assert.deepEqual(rows.filter((r) => r.date === '2026-01-01'), [
    { date: '2026-01-01', value: 100, from: '2026-05-15', to: '2026-08-13' },
    { date: '2026-01-01', value: 100.4, from: '2026-08-14', to: '9999-12-31' },
  ]);
  assert.deepEqual(releaseDays(rows), ['2026-05-15', '2026-06-30', '2026-08-14']);
  assert.deepEqual(firstPrints(rows).map((x) => [x.date, x.day, x.value]), [
    ['2025-10-01', '2026-05-15', 99],
    ['2026-01-01', '2026-05-15', 100],
    ['2026-04-01', '2026-08-14', 101],
  ]);
});

test('a period a later release drops ends the day before', () => {
  const rows = cellsToRows([
    { date: '2026-01-01', vintage: '2026-01-10', value: 5 },
    { date: '2026-02-01', vintage: '2026-01-10', value: 6 },
    { date: '2026-02-01', vintage: '2026-02-10', value: 6 },
  ]);
  assert.equal(rows.find((r) => r.date === '2026-01-01')!.to, '2026-02-09');
});

test('the US functions read the rows: growth inside one release, every revision listed', () => {
  const gdp = ALFRED_SERIES.find((d) => d.id === 'GDPC1')!;
  const rows = cellsToRows(cells);
  assert.equal(figureOn(gdp, rows, '2026-01-01', '2026-05-20'), Number(((Math.pow(100 / 99, 4) - 1) * 100).toFixed(2)));
  assert.equal(releasesOf(gdp, rows, '2026-01-01').length, 3);
});

test('saved gzipped and read back; a missing or foreign file reads as null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'first-pub-'));
  assert.equal(loadFirstPublished(dir, 'uk'), null);
  const p = saveFirstPublished(dir, { area: 'uk', pulledAt: '2026-11-12T00:00:00Z', source: 'test', series: [{ id: 'ABMI', rows: cellsToRows(cells) }] });
  assert.ok(p.endsWith('first-published-uk.json.gz'));
  assert.equal(fs.readFileSync(p)[0], 0x1f, 'gzip');
  assert.equal(loadFirstPublished(dir, 'uk')!.series[0].rows.length, 5);
  assert.equal(loadFirstPublished(dir, 'ea'), null);
});
