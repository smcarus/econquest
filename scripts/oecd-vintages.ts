/**
 * `npm run oecd:vintages` (CG15): downloads the OECD's monthly Main Economic Indicators editions
 * (GDP volume and consumer prices, every OECD member) and saves them as figures-as-published in
 * data/local/oecd-vintages/. Later runs fetch only the editions not yet saved. The first run reads
 * every edition since 1999 and takes a while (each country is one request per measure).
 *
 *   npm run oecd:vintages
 *   npm run oecd:vintages -- --country CAN --measure gdp
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESEARCH_USER_AGENT } from '../src/server/http.ts';
import { editionsBetween, extendRows, lastEdition, OECD_MEMBERS, oecdRtUrl, parseOecdRevisionsCsv, type OecdRtMeasure } from '../src/utils/oecdRealTime.ts';
import { readOecdVintages, writeOecdVintages } from '../src/utils/oecdRealTimeStore.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const countries = arg('country') ? [arg('country')!.toUpperCase()] : OECD_MEMBERS;
const measures: OecdRtMeasure[] = arg('measure') ? [arg('measure') as OecdRtMeasure] : ['gdp', 'cpi'];
const now = new Date();
const thisEdition = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const START: Record<OecdRtMeasure, string> = { gdp: '1990-Q1', cpi: '1990-01' };

let failed = 0;
for (const m of measures) {
  for (const iso3 of countries) {
    const saved = readOecdVintages(dataDir, m, iso3);
    const after = saved ? lastEdition(saved.rows) : null;
    const want = after ? editionsBetween(after, thisEdition) : undefined;
    if (want && !want.length) {
      console.log(`${m} ${iso3}: up to date (edition ${after})`);
      continue;
    }
    try {
      const r = await fetch(oecdRtUrl(iso3, m, START[m], want), { headers: { 'User-Agent': RESEARCH_USER_AGENT }, signal: AbortSignal.timeout(300_000) });
      if (r.status === 404) {
        console.log(`${m} ${iso3}: no new edition${after ? ` after ${after}` : ''} (the OECD says no records)`);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const eds = parseOecdRevisionsCsv(await r.text(), iso3);
      if (!eds.size) {
        console.log(`${m} ${iso3}: the reply held no figures`);
        continue;
      }
      const rows = extendRows(saved?.rows || [], eds);
      writeOecdVintages(dataDir, { iso3, measure: m, pulledAt: now.toISOString(), rows });
      const list = [...eds.keys()].sort();
      console.log(`${m} ${iso3}: ${eds.size} edition(s) ${list[0]} to ${list[list.length - 1]}, ${rows.length} rows saved`);
    } catch (e: any) {
      failed++;
      console.log(`${m} ${iso3}: FAILED (${e?.message || e})`);
    }
  }
}
console.log(failed ? `${failed} download(s) failed; run again later to fill them.` : 'Done.');
