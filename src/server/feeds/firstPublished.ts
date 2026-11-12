/**
 * Figures as first published for the euro area (G12, src/utils/ecbRealTime.ts) and the UK (G13,
 * src/utils/onsTriangles.ts).
 *
 * - Euro area: one ECB Data Portal request per series with the full revision history.
 * - UK: the ONS GDP revision triangle (abmi.zip), found through the dataset page's JSON. When the
 *   ONS refuses the download, a copy saved by hand in data/local/ons-triangles/ is read instead.
 *
 * Each area is saved gzipped in data/live/first-published-<area>.json.gz
 * (src/server/firstPublishedStore.ts) and pulled again after a week; a run where nothing answered
 * keeps the last copy and is not tried again for an hour.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import type { AlfredSeries } from '../../utils/alfredVintages';
import { ECB_RTD_SERIES, ECB_RTD_SOURCE, ecbRtdUrl, parseEcbHistory } from '../../utils/ecbRealTime';
import { type FirstPublishedArea, type FirstPublishedFile, loadFirstPublished, saveFirstPublished } from '../firstPublishedStore';
import { cellsToRows, type VintageCell } from '../../utils/firstPublished';
import { editionFileUrl, latestEditionUri, ONS_TRIANGLE_PAGE, ONS_TRIANGLE_SERIES, ONS_TRIANGLE_SOURCE, readOnsTriangle } from '../../utils/onsTriangles';

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;

const memory: Partial<Record<FirstPublishedArea, { file: FirstPublishedFile | null; triedAt: number }>> = {};
const inFlight: Partial<Record<FirstPublishedArea, Promise<FirstPublishedFile | null>>> = {};

export function loadSavedFirstPublished(area: FirstPublishedArea): FirstPublishedFile | null {
  if (!memory[area]) {
    const saved = loadFirstPublished(DATA_DIR, area);
    if (saved) memory[area] = { file: saved, triedAt: Date.parse(saved.pulledAt) };
  }
  return memory[area]?.file ?? null;
}

/** Shared timing: a week between pulls, an hour after a miss, one pull at a time per area. */
function pull(area: FirstPublishedArea, force: boolean | undefined, run: (saved: FirstPublishedFile | null) => Promise<FirstPublishedFile | null>): Promise<FirstPublishedFile | null> {
  const saved = loadSavedFirstPublished(area);
  const m = memory[area];
  if (!force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < WEEK) return Promise.resolve(saved);
    if (m && Date.now() - m.triedAt < HOUR) return Promise.resolve(saved);
  }
  const busy = inFlight[area];
  if (busy) return busy;
  const p = (async () => {
    const file = await run(saved);
    if (!file || file === saved) {
      memory[area] = { file: saved, triedAt: Date.now() };
      return saved;
    }
    memory[area] = { file, triedAt: Date.now() };
    try {
      saveFirstPublished(DATA_DIR, file);
    } catch {
      // keep the memory copy
    }
    return file;
  })().finally(() => {
    delete inFlight[area];
  });
  inFlight[area] = p;
  return p;
}

async function getSeries(key: string): Promise<AlfredSeries | null> {
  try {
    const res = await fetchWithTimeout(ecbRtdUrl(key), 60000);
    if (!res.ok) {
      console.warn(`[First published] ECB RTD ${key} refused (HTTP ${res.status})`);
      return null;
    }
    const rows = parseEcbHistory(await res.text());
    return rows.length ? { id: key, rows } : null;
  } catch (e) {
    console.warn(`[First published] ECB RTD ${key}: ${describeNetworkError(e, 60000)}`);
    return null;
  }
}

export function fetchEuroFirstPublished(opts: { force?: boolean } = {}): Promise<FirstPublishedFile | null> {
  return pull('ea', opts.force, async (saved) => {
    const got = await Promise.all(ECB_RTD_SERIES.map((d) => getSeries(d.id)));
    const fresh = got.filter((s): s is AlfredSeries => !!s);
    if (!fresh.length) return saved;
    // A series that did not answer this time keeps last time's rows.
    const kept = (saved?.series || []).filter((s) => !fresh.some((f) => f.id === s.id));
    return { area: 'ea', pulledAt: new Date().toISOString(), source: ECB_RTD_SOURCE, series: [...fresh, ...kept] };
  });
}

/** The quarterly workbook inside abmi.zip (or the workbook itself). */
export async function onsTriangleCells(bytes: Uint8Array): Promise<VintageCell[]> {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return [];
  let files: Record<string, Uint8Array> = {};
  try {
    files = unzipSync(bytes);
  } catch {
    return [];
  }
  if (Object.keys(files).some((n) => n.startsWith('xl/'))) return readOnsTriangle(bytes);
  const name = Object.keys(files).find((n) => /quarterly/i.test(n) && /\.xlsx$/i.test(n)) || Object.keys(files).find((n) => /\.xlsx$/i.test(n));
  return name ? readOnsTriangle(files[name]) : [];
}

export const onsTriangleFolder = () => path.join(DATA_DIR, 'local', 'ons-triangles');

/** The newest .zip or .xlsx saved by hand in data/local/ons-triangles/, or null. */
function localTriangle(): { name: string; bytes: Uint8Array } | null {
  try {
    const dir = onsTriangleFolder();
    const files = fs
      .readdirSync(dir)
      .filter((n) => /\.(zip|xlsx)$/i.test(n))
      .map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return files[0] ? { name: files[0].n, bytes: new Uint8Array(fs.readFileSync(path.join(dir, files[0].n))) } : null;
  } catch {
    return null;
  }
}

async function downloadTriangle(): Promise<Uint8Array | null> {
  try {
    const page = await fetchWithTimeout(`${ONS_TRIANGLE_PAGE}/data`, 30000);
    if (!page.ok) throw new Error(`dataset page HTTP ${page.status}`);
    const edition = latestEditionUri(await page.json());
    if (!edition) throw new Error('no edition listed');
    const ed = await fetchWithTimeout(`https://www.ons.gov.uk${edition}/data`, 30000);
    if (!ed.ok) throw new Error(`edition page HTTP ${ed.status}`);
    const url = editionFileUrl(edition, await ed.json());
    if (!url) throw new Error('no file listed');
    const res = await fetchWithTimeout(url, 60000);
    if (!res.ok) throw new Error(`file HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.warn(`[First published] ONS revision triangle: ${describeNetworkError(e, 60000)}`);
    return null;
  }
}

function localTriangleTime(): number {
  try {
    const dir = onsTriangleFolder();
    return Math.max(0, ...fs.readdirSync(dir).filter((n) => /\.(zip|xlsx)$/i.test(n)).map((n) => fs.statSync(path.join(dir, n)).mtimeMs));
  } catch {
    return 0;
  }
}

export function fetchUkFirstPublished(opts: { force?: boolean } = {}): Promise<FirstPublishedFile | null> {
  // A copy put in data/local/ons-triangles/ after the last pull is read straight away.
  const saved = loadSavedFirstPublished('uk');
  const newLocal = localTriangleTime() > (saved ? Date.parse(saved.pulledAt) : 0);
  return pull('uk', opts.force || newLocal, async (saved) => {
    const def = ONS_TRIANGLE_SERIES[0];
    const downloaded = await downloadTriangle();
    let cells = downloaded ? await onsTriangleCells(downloaded) : [];
    let source = ONS_TRIANGLE_SOURCE;
    if (!cells.length) {
      const local = localTriangle();
      if (local) {
        cells = await onsTriangleCells(local.bytes);
        source = `${ONS_TRIANGLE_SOURCE}; copy saved in data/local/ons-triangles (${local.name})`;
      }
    }
    if (!cells.length) return saved;
    return { area: 'uk', pulledAt: new Date().toISOString(), source, series: [{ id: def.id, rows: cellsToRows(cells) }] };
  });
}

/** Tests only. */
export function resetFirstPublishedForTests(): void {
  for (const a of ['ea', 'uk'] as FirstPublishedArea[]) {
    delete memory[a];
    delete inFlight[a];
  }
}
