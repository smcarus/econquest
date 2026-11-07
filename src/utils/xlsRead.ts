/**
 * A small reader for old Excel 97-2003 workbooks (.xls: BIFF8 inside an OLE2 compound file), enough
 * for plain data sheets such as the NY Fed GSCPI download, which is served as .xls even at its .csv
 * address. No new package.
 *
 * Reads numbers only: NUMBER, RK, MULRK and cached FORMULA results. Text cells (shared strings) come
 * back empty, so a sheet's header row is blank; dates in .xls are numbers (Excel serial days), which
 * is what data columns need. Ignores styles, merged cells and everything else.
 *
 * Browser-safe, pure.
 */

const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const END = 0xfffffffe;

export function isOleFile(buf: Uint8Array): boolean {
  return buf.length >= 512 && OLE_SIG.every((b, i) => buf[i] === b);
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** The named stream ("Workbook" or "Book") of an OLE2 compound file, or null. */
export function oleStream(buf: Uint8Array, names: string[]): Uint8Array | null {
  if (!isOleFile(buf)) return null;
  const sectorSize = 1 << u16(buf, 0x1e);
  const miniSize = 1 << u16(buf, 0x20);
  const firstDir = u32(buf, 0x30);
  const cutoff = u32(buf, 0x38);
  const firstMiniFat = u32(buf, 0x3c);
  let difatNext = u32(buf, 0x44);
  const sector = (id: number) => (id + 1) * sectorSize;
  // FAT sector list: 109 in the header, then chained DIFAT sectors.
  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) {
    const id = u32(buf, 0x4c + i * 4);
    if (id < 0xfffffffa) fatSectors.push(id);
  }
  const per = sectorSize / 4;
  for (let guard = 0; difatNext < 0xfffffffa && guard < 10000; guard++) {
    const o = sector(difatNext);
    if (o + sectorSize > buf.length) break;
    for (let i = 0; i < per - 1; i++) {
      const id = u32(buf, o + i * 4);
      if (id < 0xfffffffa) fatSectors.push(id);
    }
    difatNext = u32(buf, o + (per - 1) * 4);
  }
  const fat: number[] = [];
  for (const s of fatSectors) {
    const o = sector(s);
    if (o + sectorSize > buf.length) return null;
    for (let i = 0; i < per; i++) fat.push(u32(buf, o + i * 4));
  }
  const chain = (start: number, table: number[]) => {
    const out: number[] = [];
    for (let id = start; id < 0xfffffffa && out.length <= table.length; id = table[id] ?? END) out.push(id);
    return out;
  };
  const read = (start: number, size: number) => {
    const ids = chain(start, fat);
    const out = new Uint8Array(ids.length * sectorSize);
    ids.forEach((id, k) => out.set(buf.subarray(sector(id), sector(id) + sectorSize), k * sectorSize));
    return out.subarray(0, Math.min(size, out.length));
  };
  const dirIds = chain(firstDir, fat);
  const dir = read(firstDir, dirIds.length * sectorSize);
  const entries: Array<{ name: string; type: number; start: number; size: number }> = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const len = u16(dir, o + 0x40);
    let name = '';
    for (let i = 0; i + 1 < len - 1 && i < 64; i += 2) name += String.fromCharCode(u16(dir, o + i));
    entries.push({ name, type: dir[o + 0x42], start: u32(dir, o + 0x74), size: u32(dir, o + 0x78) });
  }
  const want = names.map((n) => n.toLowerCase());
  const hit = entries.find((e) => e.type === 2 && want.includes(e.name.toLowerCase()));
  if (!hit) return null;
  if (hit.size >= cutoff) return read(hit.start, hit.size);
  // Small stream: in the mini stream (the root entry's data), sectors from the mini FAT.
  const root = entries.find((e) => e.type === 5);
  if (!root) return null;
  const miniStream = read(root.start, root.size);
  const miniFatIds = chain(firstMiniFat, fat);
  const miniFat: number[] = [];
  for (const s of miniFatIds) for (let i = 0; i < per; i++) miniFat.push(u32(buf, sector(s) + i * 4));
  const ids = chain(hit.start, miniFat);
  const out = new Uint8Array(ids.length * miniSize);
  ids.forEach((id, k) => out.set(miniStream.subarray(id * miniSize, (id + 1) * miniSize), k * miniSize));
  return out.subarray(0, hit.size);
}

/** An RK number (Excel's packed 30-bit number). */
export function rkValue(rk: number): number {
  let v: number;
  if (rk & 0x02) v = (rk | 0) >> 2;
  else {
    const b = new DataView(new ArrayBuffer(8));
    b.setUint32(0, 0, true);
    b.setUint32(4, rk & 0xfffffffc, true);
    v = b.getFloat64(0, true);
  }
  return rk & 0x01 ? v / 100 : v;
}

/** Every worksheet of a .xls file as rows of cell text (numbers only; text cells empty). Null if not a .xls. */
export function readXlsSheets(data: ArrayBuffer | Uint8Array): string[][][] | null {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const wb = oleStream(buf, ['Workbook', 'Book']);
  if (!wb) return null;
  const view = new DataView(wb.buffer, wb.byteOffset, wb.byteLength);
  const sheets: string[][][] = [];
  let cur: string[][] | null = null;
  const put = (row: number, col: number, v: number) => {
    if (!cur || !Number.isFinite(v)) return;
    while (cur.length <= row) cur.push([]);
    const r = cur[row];
    while (r.length < col) r.push('');
    r[col] = String(v);
  };
  for (let p = 0; p + 4 <= wb.length; ) {
    const type = u16(wb, p);
    const len = u16(wb, p + 2);
    const d = p + 4;
    if (d + len > wb.length) break;
    if (type === 0x0809) {
      const kind = u16(wb, d + 2);
      cur = kind === 0x0010 ? [] : null;
      if (cur) sheets.push(cur);
    } else if (type === 0x000a) cur = null; // EOF
    else if (cur && type === 0x0203 && len >= 14) put(u16(wb, d), u16(wb, d + 2), view.getFloat64(d + 6, true));
    else if (cur && type === 0x027e && len >= 10) put(u16(wb, d), u16(wb, d + 2), rkValue(u32(wb, d + 6)));
    else if (cur && type === 0x00bd && len >= 6) {
      const row = u16(wb, d);
      const first = u16(wb, d + 2);
      const n = (len - 6) / 6;
      for (let k = 0; k < n; k++) put(row, first + k, rkValue(u32(wb, d + 4 + k * 6 + 2)));
    } else if (cur && type === 0x0006 && len >= 14 && u16(wb, d + 12) !== 0xffff) put(u16(wb, d), u16(wb, d + 2), view.getFloat64(d + 6, true));
    p = d + len;
  }
  return sheets;
}
