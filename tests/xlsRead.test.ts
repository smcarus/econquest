import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isOleFile, readXlsSheets, rkValue } from '../src/utils/xlsRead.ts';
import { gscpiFromBytes } from '../src/utils/stressIndices.ts';

// An Excel 97 workbook made with LibreOffice from a CSV shaped like the NY Fed GSCPI file
// (header "Date,GSCPI", month-end dates from Jan 1998, values made up: -1.5 rising by 0.1).
const XLS = new Uint8Array(readFileSync(new URL('./fixtures/xls/gscpi-shape.xls', import.meta.url)));

test('.xls: OLE2 signature, numbers read, dates as Excel serial days, text cells empty', () => {
  assert.ok(isOleFile(XLS));
  assert.ok(!isOleFile(new TextEncoder().encode('Date,GSCPI\n')));
  const sheets = readXlsSheets(XLS)!;
  assert.equal(sheets.length, 1);
  assert.deepEqual(sheets[0][0], []);
  assert.deepEqual(sheets[0][1], ['35826', '-1.5']);
  assert.equal(readXlsSheets(new Uint8Array(600)), null);
});

test('RK numbers: integers, hundredths and packed doubles', () => {
  assert.equal(rkValue((35826 << 2) | 0x02), 35826);
  assert.equal(rkValue((-150 << 2) | 0x03), -1.5);
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, 2.5, true);
  assert.equal(rkValue(b.getUint32(4, true)), 2.5);
});

test('GSCPI from bytes: the .xls, a CSV, or Missing with the file kind named', async () => {
  const x = await gscpiFromBytes(XLS);
  assert.ok('obs' in x);
  assert.equal(x.obs.length, 30);
  assert.deepEqual(x.obs[0], { date: '1998-01-01', value: -1.5 });
  const csv = 'Date,GSCPI\n' + Array.from({ length: 24 }, (_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-28,0.${i}`).join('\n');
  const c = await gscpiFromBytes(new TextEncoder().encode(csv));
  assert.ok('obs' in c && c.obs.length === 24);
  const bad = await gscpiFromBytes(new Uint8Array(600));
  assert.ok('reason' in bad && /CSV/.test(bad.reason));
});
