/**
 * Official forecasts side by side (CG2, src/utils/officialForecasts.ts). Daily step
 * world:official_forecasts: five requests for every country at once (IMF DataMapper growth and
 * inflation, World Bank GEP, OECD Economic Outlook data and its edition name), saved in
 * data/live/official-forecasts.json. A source that does not answer keeps its figures from the last
 * good copy, with that copy's date. Downloaded again after a day; an hour after a miss.
 * The Philadelphia Fed workbook is read only from data/local/philly-spf/, never downloaded.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { readXlsxSheet } from '../../utils/xlsxRead';
import {
  gepAllUrl,
  oecdEoAllUrl,
  OECD_EO_DATAFLOW_URL,
  parseGepAll,
  parseOecdEoCsv,
  parseOecdEoEdition,
  parseWeoAll,
  phillySpfLatest,
  weoAllUrl,
  WEO_CODES,
  type ForecastSourceId,
  type OfficialForecastsFile,
} from '../../utils/officialForecasts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TIMEOUT_MS = 120_000;
const FILE = 'official-forecasts.json';

let saved: { value: OfficialForecastsFile | null; triedAt: number } | null = null;
let inFlight: Promise<OfficialForecastsFile | null> | null = null;
let philly: { file: string | null; mtime: number; value: ReturnType<typeof phillySpfLatest> } | null = null;

const livePath = (dataDir = DATA_DIR) => path.join(dataDir, 'live', FILE);
export const phillyDir = (dataDir = DATA_DIR) => path.join(dataDir, 'local', 'philly-spf');

export function loadOfficialForecasts(): OfficialForecastsFile | null {
  if (!saved) {
    let v: OfficialForecastsFile | null = null;
    try {
      const x = JSON.parse(fs.readFileSync(livePath(), 'utf8'));
      if (x?.pulledAt) v = x;
    } catch {
      // none saved yet
    }
    saved = { value: v, triedAt: v ? Date.parse(v.pulledAt) : 0 };
  }
  return saved.value;
}

async function get(url: string, what: string, accept: string): Promise<Response | string> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS, { Accept: accept });
    if (!res.ok) {
      console.warn(`[${what}] refused (HTTP ${res.status}): ${url}`);
      return `${what} refused the request (HTTP ${res.status})`;
    }
    return res;
  } catch (e) {
    const why = describeNetworkError(e, TIMEOUT_MS);
    console.warn(`[${what}] ${why}`);
    return `${what} did not answer: ${why}`;
  }
}

/** One fresh pull; each source falls back to the previous copy (with its date in the problem line). */
export async function pullOfficialForecasts(prev: OfficialForecastsFile | null, now = new Date()): Promise<OfficialForecastsFile> {
  const y = now.getUTCFullYear();
  const problems: Partial<Record<ForecastSourceId, string>> = {};
  const kept = () => (prev ? `; figures kept from the ${prev.pulledAt.slice(0, 10)} pull` : '');

  const [wg, wc, gep, oecd, flow] = await Promise.all([
    get(weoAllUrl(WEO_CODES.gdp), 'IMF DataMapper', 'application/json'),
    get(weoAllUrl(WEO_CODES.cpi), 'IMF DataMapper', 'application/json'),
    get(gepAllUrl(y), 'World Bank GEP', 'application/json'),
    get(oecdEoAllUrl(y), 'OECD Economic Outlook', 'text/csv'),
    get(OECD_EO_DATAFLOW_URL, 'OECD Economic Outlook', 'application/xml'),
  ]);

  const out: OfficialForecastsFile = { pulledAt: now.toISOString() };

  const weoGdp = typeof wg === 'string' ? null : parseWeoAll(await wg.json().catch(() => null), WEO_CODES.gdp);
  const weoCpi = typeof wc === 'string' ? null : parseWeoAll(await wc.json().catch(() => null), WEO_CODES.cpi);
  if (weoGdp && Object.keys(weoGdp).length && weoCpi && Object.keys(weoCpi).length) out.weo = { gdp: weoGdp, cpi: weoCpi };
  else {
    problems.imf_weo = (typeof wg === 'string' ? wg : typeof wc === 'string' ? wc : 'The IMF DataMapper reply was not in the expected layout') + kept();
    if (prev?.weo) out.weo = prev.weo;
  }

  const g = typeof gep === 'string' ? null : parseGepAll(await gep.json().catch(() => null));
  if (g && Object.keys(g.byIso).length) out.gep = g;
  else {
    problems.wb_gep = (typeof gep === 'string' ? gep : 'The World Bank GEP reply was not in the expected layout') + kept();
    if (prev?.gep) out.gep = prev.gep;
  }

  const o = typeof oecd === 'string' ? null : parseOecdEoCsv(await oecd.text().catch(() => ''));
  if (o && Object.keys(o).length) {
    const edition = typeof flow === 'string' ? undefined : parseOecdEoEdition(await flow.text().catch(() => ''));
    out.oecd = { ...(edition ? { edition } : {}), byIso: o };
  } else {
    problems.oecd_eo = (typeof oecd === 'string' ? oecd : 'The OECD reply was not in the expected layout') + kept();
    if (prev?.oecd) out.oecd = prev.oecd;
  }

  if (Object.keys(problems).length) out.problems = problems;
  return out;
}

/** The daily step: a fresh pull when a day old (an hour after a miss), the saved copy otherwise. */
export function fetchOfficialForecasts(opts: { force?: boolean } = {}): Promise<OfficialForecastsFile | null> {
  const prev = loadOfficialForecasts();
  const due = opts.force || ((!prev || Date.now() - Date.parse(prev.pulledAt) >= DAY) && Date.now() - (saved?.triedAt ?? 0) >= HOUR);
  if (!due) return Promise.resolve(prev);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const got = await pullOfficialForecasts(prev);
    const anything = got.weo || got.gep || got.oecd;
    if (anything) {
      try {
        fs.mkdirSync(path.dirname(livePath()), { recursive: true });
        writeFileAtomic(livePath(), JSON.stringify(got));
      } catch {
        // keep the memory copy
      }
    }
    saved = { value: anything ? got : prev, triedAt: Date.now() };
    return saved.value;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** The newest .xlsx in data/local/philly-spf/ (re-read when it changes); never downloads. */
export async function loadPhillySpf(dataDir = DATA_DIR): Promise<{ file: string | null; value: ReturnType<typeof phillySpfLatest> }> {
  let names: string[] = [];
  try {
    names = fs.readdirSync(phillyDir(dataDir)).filter((n) => /\.xlsx$/i.test(n));
  } catch {
    return { file: null, value: null };
  }
  const top = names.map((n) => ({ n, t: fs.statSync(path.join(phillyDir(dataDir), n)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
  if (!top) return { file: null, value: null };
  if (philly && philly.file === top.n && philly.mtime === top.t) return philly;
  let value: ReturnType<typeof phillySpfLatest> = null;
  try {
    const buf = fs.readFileSync(path.join(phillyDir(dataDir), top.n));
    const [rgdp, cpi] = await Promise.all([readXlsxSheet(buf, 'RGDP'), readXlsxSheet(buf, 'CPI')]);
    value = phillySpfLatest(rgdp, cpi);
  } catch (e: any) {
    console.warn(`[Philadelphia Fed SPF] ${top.n} could not be read (${e?.message || e})`);
  }
  philly = { file: top.n, mtime: top.t, value };
  return philly;
}

/** Tests only. */
export function resetOfficialForecastsForTests(): void {
  saved = null;
  inFlight = null;
  philly = null;
}
