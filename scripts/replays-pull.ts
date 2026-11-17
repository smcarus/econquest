/**
 * `npm run replays:pull`: saves the monthly series the historical scenario replays read
 * (src/utils/scenarioReplay.ts) into data/local/replays/replay-series.json. Part of the daily
 * download; a scenario request only reads this file, it never fetches.
 *
 *   FRED (no key: the CSV download; with FRED_API_KEY: the official API), from January 1990:
 *     - OECD 10-year government yields (IRLTLT01...M156N, India INDIRLTLT01STM), the US one included;
 *     - Federal Reserve Board H.10 monthly exchange rates (EX..US / EXUS..).
 *   BCRP (BCRPData): J.P. Morgan EMBI Global spreads, monthly, from January 2016 (the current series).
 *
 * The series are monthly, so a file saved in the last 6 days is left alone (`-- --force` saves it
 * again). A series that does not answer keeps the copy saved before; it is never filled in.
 * Exit code 1 when nothing could be saved and there was no file before.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFredCsvSeries } from '../src/utils/fedBalanceSheet.ts';
import { parseFredApiObservations } from '../src/utils/inflationExpectations.ts';
import { bcrpEmbigUrl, parseBcrpEmbig, HC_SPREAD_SOURCE } from '../src/utils/hardCurrencySpread.ts';
import { fredMonths, readReplayFile, replayFredSeries, REPLAY_CURRENCY, H10_SOURCE, OECD_10Y_SOURCE, type ReplayFile, type ReplaySeries } from '../src/utils/scenarioReplay.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = path.join(dataDir, 'local', 'replays');
const target = path.join(dir, 'replay-series.json');
const force = process.argv.includes('--force');
const MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;
const FROM = '1990-01-01';

const prev: ReplayFile | null = (() => {
  try {
    return readReplayFile(JSON.parse(fs.readFileSync(target, 'utf8')));
  } catch {
    return null;
  }
})();
if (!force && prev && Date.now() - Date.parse(prev.savedAt) < MAX_AGE_MS) {
  console.log(`Replay series saved ${prev.savedAt.slice(0, 10)}; less than 6 days old, left alone.`);
  process.exit(0);
}

const h10Ids = new Set(Object.values(REPLAY_CURRENCY).flatMap((c) => (c.h10 ? [c.h10.id] : [])));
const apiKey = (process.env.FRED_API_KEY || '').trim();
const now = new Date().toISOString();
const series: Record<string, ReplaySeries> = { ...(prev?.series ?? {}) };
const problems: string[] = [];
let saved = 0;

async function fredSeries(id: string): Promise<Array<{ date: string; value: number }>> {
  if (apiKey) {
    try {
      const q = new URLSearchParams({ series_id: id, api_key: apiKey, file_type: 'json', observation_start: FROM });
      const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?${q}`, { signal: AbortSignal.timeout(30_000) });
      if (r.ok) {
        const obs = parseFredApiObservations(await r.json());
        if (obs.length) return obs;
      }
    } catch {
      /* the CSV download next */
    }
  }
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}&cosd=${FROM}`, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return parseFredCsvSeries(await r.text());
}

const ids = replayFredSeries();
for (let i = 0; i < ids.length; i += 4) {
  await Promise.all(
    ids.slice(i, i + 4).map(async (id) => {
      try {
        const obs = await fredSeries(id);
        if (!obs.length) throw new Error('no observations in the reply');
        const h10 = h10Ids.has(id);
        series[id] = { source: `${h10 ? H10_SOURCE : OECD_10Y_SOURCE}, ${id}`, url: `https://fred.stlouisfed.org/series/${id}`, unit: h10 ? (id.startsWith('EXUS') ? 'USD per unit' : 'units per USD') : '%', months: fredMonths(obs), pulledAt: now };
        saved += 1;
      } catch (e: any) {
        problems.push(`FRED ${id}: ${String(e?.message || e)}${series[id] ? ' (the earlier copy is kept)' : ''}`);
      }
    })
  );
}

// BCRP EMBIG: the whole current series, from January 2016.
{
  const today = new Date();
  const months = (today.getUTCFullYear() - 2016) * 12 + today.getUTCMonth() + 1;
  const url = bcrpEmbigUrl(today, months);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const got = parseBcrpEmbig(await r.text(), url, now, 10_000);
    if (!got || !Object.keys(got.countries).length) throw new Error('the reply did not read as the EMBIG table');
    for (const [iso3, o] of Object.entries(got.countries)) {
      series[`embig:${iso3}`] = { source: `${HC_SPREAD_SOURCE}, ${o.seriesId}`, url, unit: 'bp', months: Object.fromEntries(o.history.map((h) => [h.period, h.bps])), pulledAt: now };
      saved += 1;
    }
  } catch (e: any) {
    problems.push(`BCRP EMBIG spreads: ${String(e?.message || e)}`);
  }
}

if (saved) {
  fs.mkdirSync(dir, { recursive: true });
  const file: ReplayFile = { version: 1, savedAt: now, series };
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(file));
  fs.renameSync(tmp, target);
  console.log(`Saved replay-series.json (${saved} series read now, ${Object.keys(series).length} in the file)`);
}
if (problems.length) {
  console.log('Not saved:');
  for (const p of problems) console.log(`  ${p}`);
  if (!saved && !prev) process.exitCode = 1;
}
console.log(`Folder: ${dir}`);
