import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readXlsSheets } from '../src/utils/xlsRead.ts';
const xlsRows = (b: Uint8Array) => readXlsSheets(b)?.[0] ?? null;
import { parseGprRows } from '../src/utils/gprIndex.ts';

const rec = (type: number, body: number[]) => [type & 255, type >> 8, body.length & 255, body.length >> 8, ...body];
const le16 = (n: number) => [n & 255, (n >> 8) & 255];
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const dbl = (v: number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v, true);
  return [...b];
};
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** A one-stream Compound File (512-byte sectors, stream kept in normal sectors). */
function cfb(name: string, stream: number[]): Uint8Array {
  const data = [...stream];
  while (data.length < 4096 || data.length % 512) data.push(0);
  const nData = data.length / 512;
  // Sector 0 = FAT, sector 1 = directory, sectors 2.. = stream.
  const fat = new Array(128).fill(0xffffffff);
  fat[0] = 0xfffffffd;
  fat[1] = 0xfffffffe;
  for (let i = 0; i < nData; i++) fat[2 + i] = i === nData - 1 ? 0xfffffffe : 3 + i;
  const header = new Array(512).fill(0);
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].forEach((x, i) => (header[i] = x));
  const set = (o: number, bytes: number[]) => bytes.forEach((x, i) => (header[o + i] = x));
  set(0x1a, le16(3));
  set(0x1c, le16(0xfffe));
  set(0x1e, le16(9));
  set(0x20, le16(6));
  set(0x2c, le32(1));
  set(0x30, le32(1));
  set(0x38, le32(4096));
  set(0x3c, le32(0xfffffffe));
  set(0x44, le32(0xfffffffe));
  for (let i = 0; i < 109; i++) set(0x4c + i * 4, le32(i === 0 ? 0 : 0xffffffff));
  const entry = (n: string, type: number, start: number, size: number) => {
    const e = new Array(128).fill(0);
    [...n].forEach((c, i) => {
      e[i * 2] = c.charCodeAt(0);
    });
    e[0x40] = (n.length + 1) * 2;
    e[0x42] = type;
    le32(0xffffffff).forEach((x, i) => (e[0x44 + i] = x));
    le32(0xffffffff).forEach((x, i) => (e[0x48 + i] = x));
    le32(type === 5 ? 1 : 0xffffffff).forEach((x, i) => (e[0x4c + i] = x));
    le32(start).forEach((x, i) => (e[0x74 + i] = x));
    le32(size).forEach((x, i) => (e[0x78 + i] = x));
    return e;
  };
  const dir = [...entry('Root Entry', 5, 0xfffffffe, 0), ...entry(name, 2, 2, data.length), ...new Array(256).fill(0)];
  return new Uint8Array([...header, ...fat.flatMap(le32), ...dir, ...data]);
}

function workbook(): number[] {
  // Shared strings "month", "GPR", "GPRC_TUR"; the third is split across a CONTINUE record.
  const sstStrings = [
    [...le16(5), 0, ...ascii('month')],
    [...le16(3), 0, ...ascii('GPR')],
  ];
  const sstHead = [...le32(3), ...le32(3)];
  const firstPart = [...sstHead, ...sstStrings.flat(), ...le16(8), 0, ...ascii('GPRC')];
  const contPart = [1, ...ascii('_TUR').flatMap((c) => [c, 0])]; // continues as 16-bit characters
  const globalsBeforeSheet = (sheetOffset: number) => [
    ...rec(0x0809, [0, 6, 5, 0, 0, 0, 0, 0]),
    ...rec(0x0085, [...le32(sheetOffset), 0, 0, 6, 0, ...ascii('Sheet1')]),
    ...rec(0x00fc, firstPart),
    ...rec(0x003c, contPart),
    ...rec(0x000a, []),
  ];
  const sheetStart = globalsBeforeSheet(0).length;
  const globals = globalsBeforeSheet(sheetStart);
  const rk2 = (n: number) => (n << 2) | 2;
  const sheet = [
    ...rec(0x0809, [0, 6, 0x10, 0, 0, 0, 0, 0]),
    ...rec(0x00fd, [...le16(0), ...le16(0), ...le16(0), ...le32(0)]),
    ...rec(0x00fd, [...le16(0), ...le16(1), ...le16(0), ...le32(1)]),
    ...rec(0x00fd, [...le16(0), ...le16(2), ...le16(0), ...le32(2)]),
    // 1985-01-01 = serial 31048, as an RK integer; GPR as NUMBER; country as a cached formula result.
    ...rec(0x027e, [...le16(1), ...le16(0), ...le16(0), ...le32(rk2(31048))]),
    ...rec(0x0203, [...le16(1), ...le16(1), ...le16(0), ...dbl(101.5)]),
    ...rec(0x0006, [...le16(1), ...le16(2), ...le16(0), ...dbl(0.25), 0, 0, 0, 0, 0, 0]),
    // Row 2 via MULRK: 1985-02-01 = 31079, GPR 90 (RK /100: 9000), country 0.5 left blank then a LABEL note
    ...rec(0x00bd, [...le16(2), ...le16(0), ...le16(0), ...le32(rk2(31079)), ...le16(0), ...le32(rk2(9000) | 1), ...le16(1)]),
    ...rec(0x0204, [...le16(3), ...le16(0), ...le16(0), ...le16(4), 0, ...ascii('note')]),
    ...rec(0x000a, []),
  ];
  return [...globals, ...sheet];
}

test('the rows read as a GPR table (Excel day numbers become months)', () => {
  // The GPR file as published is an Excel 97 .xls: read with the app's own .xls reader.
  const t = parseGprRows(xlsRows(cfb('Workbook', workbook()))!);
  assert.ok(!('reason' in t));
  if ('reason' in t) return;
  assert.deepEqual(t.months, ['1985-01', '1985-02']);
  assert.deepEqual(t.series.GPR, [101.5, 90]);
  assert.deepEqual(t.series.GPRC_TUR, [0.25, null]);
});

test('a GPR file in another layout is refused with the reason', () => {
  const t = parseGprRows([['date', 'index'], ['31048', '1']]);
  assert.ok('reason' in t);
});
