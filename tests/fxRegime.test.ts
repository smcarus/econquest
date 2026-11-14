import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const fx = await import('../src/utils/fxRegime.ts');
const { fxRegimeData } = await import('../src/utils/fxRegimeStore.ts');
const { nameKey } = await import('../src/utils/fiscalRules.ts');
const { countryNameIndex } = await import('../src/utils/fiscalRulesStore.ts');
const { tableWorkbook } = await import('../src/utils/xlsxExport.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
const { countrySeries } = await import('../src/utils/seriesHistory.ts');

const NAMES = countryNameIndex();
// Countries across, months down (Excel date serials for 2024, text months after), a title row on top.
const COUNTRIES = ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Mexico', 'Peru', 'India', 'Indonesia', 'Turkey', 'South Africa', 'Atlantis'];
const ROWS: string[][] = [
  ['Exchange rate arrangement classification, fine', ...COUNTRIES.map(() => '')],
  ['', ...COUNTRIES],
  ['45292', '12', '14', '12', '12', '13', '12', '12', '12', '14', '13', '4'], // 2024-01 as an Excel date
  ['2024M02', '12', '14', '12', '12', '13', '12', '12', '12', '14', '13', '4'],
  ['2024-03', '13', '12', '12', '12', '13', '12', '12', '12', '12', '13', '4'],
  ['Apr 2024', '13', '12', '12', '12', '13', '12', '7', '12', '12', '13', ''],
];

test('month cells: Excel date, 1946M01, 1946-01, Jan 1946, 01/1946', () => {
  assert.equal(fx.monthOf('45292'), '2024-01');
  assert.equal(fx.monthOf('1946M01'), '1946-01');
  assert.equal(fx.monthOf('1946m1'), '1946-01');
  assert.equal(fx.monthOf('2025-12'), '2025-12');
  assert.equal(fx.monthOf('Jan 1946'), '1946-01');
  assert.equal(fx.monthOf('03/2001'), '2001-03');
  assert.equal(fx.monthOf('Brazil'), null);
  assert.equal(fx.monthOf('2025-13'), null);
});

test('the table: countries across or down, fine codes found, unknown names listed, coarse grouping', () => {
  const t = fx.parseFxRegimeRows(ROWS, NAMES, nameKey);
  assert.ok('countries' in t);
  assert.equal(t.fine, true);
  assert.equal(t.firstMonth, '2024-01');
  assert.equal(t.lastMonth, '2024-04');
  assert.deepEqual(t.unmatched, ['Atlantis']);
  assert.equal(t.countries.BRA['2024-04'], 13);
  assert.equal(t.countries.IND['2024-04'], 7);
  const width = Math.max(...ROWS.map((r) => r.length));
  const down = Array.from({ length: width }, (_, c) => ROWS.map((r) => r[c] ?? ''));
  const t2 = fx.parseFxRegimeRows(down, NAMES, nameKey);
  assert.ok('countries' in t2);
  assert.deepEqual(t2.countries.ARG, t.countries.ARG);
  assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 14, 15].map(fx.coarseOf), [1, 1, 2, 2, 3, 3, 4, 5, 6]);
  assert.ok('reason' in fx.parseFxRegimeRows([['a', 'b'], ['1', '2']], NAMES, nameKey));
});

test('the reading: latest month, since when, and the words; Missing for a country not in the file', () => {
  const t = fx.parseFxRegimeRows(ROWS, NAMES, nameKey) as import('../src/utils/fxRegime.ts').FxRegimeTable;
  const r = fx.fxRegimeReading(t, 'BRA');
  assert.ok(!('missing' in r));
  assert.deepEqual({ month: r.month, fine: r.fine, coarse: r.coarse, since: r.since }, { month: '2024-04', fine: 13, coarse: 4, since: '2024-03' });
  assert.equal(fx.fxRegimeValue(r), 'Freely floating (IRR coarse 4; fine 13, Freely floating, Apr 2024), since Mar 2024');
  const arg = fx.fxRegimeReading(t, 'ARG');
  assert.ok(!('missing' in arg) && arg.coarse === 3 && arg.since === '2024-03');
  assert.match((fx.fxRegimeReading(t, 'JPN') as { missing: string }).missing, /not in the IRR file you saved \(2024-01 to 2024-04\)/);
});

test('History & data: two monthly code series, or Missing with the reason', () => {
  const t = fx.parseFxRegimeRows(ROWS, NAMES, nameKey) as import('../src/utils/fxRegime.ts').FxRegimeTable;
  const [coarse, fine] = fx.fxRegimeSeries('MEX', t);
  assert.ok('points' in coarse && 'points' in fine);
  assert.deepEqual(coarse.points.map((p) => p.value), [4, 4, 4, 4]);
  assert.deepEqual(fine.points.map((p) => p.value), [13, 13, 13, 13]);
  assert.equal(coarse.freq, 'monthly');
  const none = fx.fxRegimeSeries('MEX', null);
  assert.ok(none.every((x) => 'reason' in x && /data\/local\/irr/.test(x.reason)));
  const coarseOnly = { ...t, fine: false };
  assert.match((fx.fxRegimeSeries('MEX', coarseOnly)[1] as { reason: string }).reason, /only coarse codes/);
  const set = countrySeries('BRA', { fxRegime: t });
  assert.ok(set.series.some((s) => s.id === 'fx_regime_coarse'));
});

test('the folder: the workbook you save is read; the Data health row says what it found', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'irr-'));
  const none = fxRegimeData(dir);
  assert.ok(!none.ok && /^no IRR /.test(none.reason));
  const rows = (await checkConnections({ env: {}, only: ['irr_file'], fxRegime: () => fxRegimeData(dir) } as never)).results;
  assert.equal(rows[0].state, 'optional');
  fs.mkdirSync(path.join(dir, 'local', 'irr'), { recursive: true });
  const [head, ...body] = ROWS.slice(1);
  fs.writeFileSync(path.join(dir, 'local', 'irr', 'ERA_Classification_Monthly_1940-2025.xlsx'), tableWorkbook('ERA', head, body));
  const load = fxRegimeData(dir);
  assert.ok(load.ok, load.ok ? '' : load.reason);
  assert.equal(load.table.countries.BRA['2024-01'], 12);
  const row = (await checkConnections({ env: {}, only: ['irr_file'], fxRegime: () => fxRegimeData(dir) } as never)).results[0];
  assert.equal(row.state, 'connected');
  assert.match(row.detail, /10 countries, 2024-01 to 2024-04, fine codes 1-15/);
  assert.match(row.sample || '', /^Brazil: Freely floating \(IRR coarse 4/);
  assert.match(row.warning || '', /Atlantis/);
  fs.writeFileSync(path.join(dir, 'local', 'irr', 'other.xlsx'), tableWorkbook('x', ['a'], [['b']]));
  fs.utimesSync(path.join(dir, 'local', 'irr', 'other.xlsx'), new Date(Date.now() + 5000), new Date(Date.now() + 5000));
  assert.ok(fxRegimeData(dir).ok, 'a newer file that does not read falls back to the one that does');
});
