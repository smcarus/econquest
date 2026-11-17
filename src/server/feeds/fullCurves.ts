/**
 * Full yield curves (R11, src/utils/fullCurves.ts). Daily step world:curves downloads the US
 * Treasury par yield curve for this year (and last year in January) and the ECB euro area curve
 * (last CURVE_KEEP_DAYS days), merges them with the saved copy and keeps data/live/yield-curves.json.
 * Downloaded at most every 6 hours; a failed download keeps the saved copy and waits an hour.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout, RESEARCH_USER_AGENT } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { CURVE_KEEP_DAYS, ECB_CURVE_TENORS, ecbCurveUrl, mergeDays, parseEcbCurveCsv, parseUstCsv, ustCurveUrl, type CurveDay, type CurvesFile } from '../../utils/fullCurves';

const HOUR = 60 * 60 * 1000;
const TIMEOUT_MS = 60_000;
const FILE = 'yield-curves.json';

let saved: { value: CurvesFile | null; triedAt: number } | null = null;
let inFlight: Promise<CurvesFile | null> | null = null;

const filePath = () => path.join(DATA_DIR, 'live', FILE);

export function loadCurves(): CurvesFile | null {
  if (!saved) {
    let v: CurvesFile | null = null;
    try {
      const x = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
      if (x?.pulledAt && (x.us || x.ea)) v = x;
    } catch {
      // nothing saved yet
    }
    saved = { value: v, triedAt: v ? Date.parse(v.pulledAt) : 0 };
  }
  return saved.value;
}

async function getText(url: string, what: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS, headers);
    if (!res.ok) {
      console.warn(`[${what}] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[${what}] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

async function pullUs(now: Date): Promise<CurveDay[] | null> {
  const y = now.getUTCFullYear();
  const years = now.getUTCMonth() === 0 ? [y - 1, y] : [y];
  let days: CurveDay[] = [];
  for (const year of years) {
    const text = await getText(ustCurveUrl(year), 'US Treasury curve');
    if (!text) continue;
    const got = parseUstCsv(text);
    if ('reason' in got) console.warn(`[US Treasury curve] ${year}: ${got.reason}`);
    else days = mergeDays(days, got);
  }
  return days.length ? days : null;
}

/** One maturity at a time, each a small reply; the days are joined by date afterwards. */
async function pullEa(): Promise<CurveDay[] | null> {
  const byDate = new Map<string, CurveDay>();
  for (const tenor of ECB_CURVE_TENORS) {
    const text = await getText(ecbCurveUrl(CURVE_KEEP_DAYS, [tenor]), `ECB yield curve ${tenor}`, { Accept: 'text/csv', 'User-Agent': RESEARCH_USER_AGENT });
    if (!text) continue;
    const got = parseEcbCurveCsv(text);
    if ('reason' in got) {
      console.warn(`[ECB yield curve] ${tenor}: ${got.reason}`);
      continue;
    }
    for (const d of got) {
      const prev = byDate.get(d.date);
      byDate.set(d.date, { date: d.date, yields: { ...(prev?.yields ?? {}), ...d.yields } });
    }
  }
  return byDate.size ? [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) : null;
}

/** Both curves, downloaded when the saved copy is over 6 hours old (an hour after a miss). */
export function fetchCurves(opts: { force?: boolean } = {}): Promise<CurvesFile | null> {
  const cur = loadCurves();
  const due = opts.force || ((!cur || Date.now() - Date.parse(cur.pulledAt) >= 6 * HOUR) && Date.now() - (saved?.triedAt ?? 0) >= HOUR);
  if (!due) return Promise.resolve(cur);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const now = new Date();
    const [us, ea] = await Promise.all([pullUs(now), pullEa()]);
    if (!us && !ea) {
      saved = { value: cur, triedAt: Date.now() };
      return cur;
    }
    const next: CurvesFile = {
      pulledAt: now.toISOString(),
      ...(us || cur?.us ? { us: { area: 'us' as const, days: mergeDays(cur?.us?.days ?? [], us ?? []) } } : {}),
      ...(ea || cur?.ea ? { ea: { area: 'ea' as const, days: mergeDays(cur?.ea?.days ?? [], ea ?? []) } } : {}),
    };
    try {
      fs.mkdirSync(path.dirname(filePath()), { recursive: true });
      writeFileAtomic(filePath(), JSON.stringify(next));
    } catch {
      // keep the memory copy
    }
    saved = { value: next, triedAt: Date.now() };
    return next;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Tests only. */
export function resetCurvesForTests(): void {
  saved = null;
  inFlight = null;
}
