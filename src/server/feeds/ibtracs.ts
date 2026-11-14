/**
 * IBTrACS tropical cyclone tracks (I8, src/utils/stormTracks.ts), NOAA NCEI, no key.
 *
 * Two ways in:
 * - a copy the user saves in data/local/ibtracs/ (any IBTrACS v04 CSV, for example the since-1980 or
 *   a basin file), read when the server starts or the file changes;
 * - a download the user asks for in the panel: the since-1980 CSV (a large file) is streamed to
 *   data/live/ibtracs/, cut down to the main tracks the app needs (tracks.json), and the CSV deleted.
 *   Nothing is downloaded until the user asks; the panel offers it again after 30 days.
 * NOAA data carry no restriction on use (IBTrACS terms: full and open access, WMO Resolution 40 as
 * the guide for commercial use); the app ships none of it.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { ibtracsParser, IBTRACS_URL, type StormFile } from '../../utils/stormTracks';

export const IBTRACS_REFRESH_DAYS = 30;
const DOWNLOAD_MS = 30 * 60 * 1000;

const localDir = () => path.join(DATA_DIR, 'local', 'ibtracs');
const liveDir = () => path.join(DATA_DIR, 'live', 'ibtracs');
const liveFile = () => path.join(liveDir(), 'tracks.json');

export interface StormStatus {
  state: 'idle' | 'downloading' | 'reading' | 'failed';
  /** Bytes received so far while downloading. */
  bytes?: number;
  error?: string;
}

let status: StormStatus = { state: 'idle' };
let local: { stamp: string; data: StormFile | { reason: string } | null } | null = null;
let live: StormFile | null | undefined;

async function parseCsv(file: string, label: string, pulledAt: string): Promise<StormFile | { reason: string }> {
  const p = ibtracsParser(label);
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) p.line(line);
  return p.done(pulledAt);
}

function localCsv(): { file: string; stamp: string } | null {
  try {
    const files = fs
      .readdirSync(localDir())
      .filter((f) => /\.csv$/i.test(f))
      .map((f) => ({ f, st: fs.statSync(path.join(localDir(), f)) }))
      .sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
    if (!files.length) return null;
    return { file: files[0].f, stamp: `${files[0].f}:${files[0].st.mtimeMs}:${files[0].st.size}` };
  } catch {
    return null;
  }
}

/** The user's own copy in data/local/ibtracs/, read once per change of file. */
async function loadLocal(): Promise<StormFile | { reason: string } | null> {
  const c = localCsv();
  if (!c) return null;
  if (local?.stamp === c.stamp) return local.data;
  const full = path.join(localDir(), c.file);
  const data = await parseCsv(full, c.file, fs.statSync(full).mtime.toISOString()).catch((e: Error) => ({ reason: e.message }));
  local = { stamp: c.stamp, data };
  return data;
}

function loadLive(): StormFile | null {
  if (live === undefined) {
    try {
      const got = JSON.parse(fs.readFileSync(liveFile(), 'utf8')) as StormFile;
      live = got?.storms?.length ? got : null;
    } catch {
      live = null;
    }
  }
  return live;
}

/** Tracks to use: the local copy first, then the download. */
export async function stormTracks(): Promise<{ tracks: StormFile | null; reason?: string; source?: 'local' | 'download'; stale?: boolean }> {
  const l = await loadLocal();
  if (l && 'storms' in l) return { tracks: l, source: 'local' };
  const d = loadLive();
  if (d) return { tracks: d, source: 'download', stale: Date.now() - Date.parse(d.pulledAt) > IBTRACS_REFRESH_DAYS * 86400000 };
  return { tracks: null, ...(l && 'reason' in l ? { reason: `The file in data/local/ibtracs/ did not read: ${l.reason}` } : {}) };
}

export function stormStatus(): StormStatus {
  return status;
}

/** Start the download (no-op while one runs). */
export function startStormDownload(): StormStatus {
  if (status.state === 'downloading' || status.state === 'reading') return status;
  status = { state: 'downloading', bytes: 0 };
  void (async () => {
    const part = path.join(liveDir(), 'ibtracs.since1980.csv.part');
    try {
      fs.mkdirSync(liveDir(), { recursive: true });
      const res = await fetch(IBTRACS_URL, { signal: AbortSignal.timeout(DOWNLOAD_MS) });
      if (!res.ok || !res.body) throw new Error(`NOAA refused the download (HTTP ${res.status})`);
      const body = Readable.fromWeb(res.body as import('stream/web').ReadableStream);
      body.on('data', (c: Buffer) => {
        status.bytes = (status.bytes ?? 0) + c.length;
      });
      await pipeline(body, fs.createWriteStream(part));
      status = { state: 'reading', bytes: status.bytes };
      const got = await parseCsv(part, 'ibtracs.since1980.list.v04r01.csv (downloaded)', new Date().toISOString());
      if (!('storms' in got)) throw new Error(got.reason);
      writeFileAtomic(liveFile(), JSON.stringify(got));
      live = got;
      status = { state: 'idle' };
    } catch (e) {
      const msg = e instanceof Error && /HTTP|columns|tracks/.test(e.message) ? e.message : describeNetworkError(e, DOWNLOAD_MS);
      console.warn(`[IBTrACS] ${msg}`);
      status = { state: 'failed', error: msg };
    } finally {
      fs.rmSync(part, { force: true });
    }
  })();
  return status;
}

/** Tests only. */
export function resetStormsForTests(): void {
  status = { state: 'idle' };
  local = null;
  live = undefined;
}
