/**
 * `npm run forecast:evaluate`: runs the pre-registered nowcast and forecast evaluations
 * (docs/validation/forecasts/) on the long free histories and saves the verdicts in
 * data/local/validation/forecasts.json. Needs a connection to DBnomics, the BIS, the BCB, Eurostat
 * and the IMF. See src/utils/forecastEval.ts.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultFetcher } from '../src/utils/backtestRun';
import { runForecastEvaluations } from '../src/utils/forecastEvalRun';
import { alsoReported } from '../src/utils/forecastRegister';
import { appendAudit, auditFiles } from '../src/utils/auditStore';
import { loadWeoVintages } from '../src/utils/weoVintagesStore';
import { fetchAlfred } from '../src/server/feeds/rates';
import { fetchEuroFirstPublished } from '../src/server/feeds/firstPublished';
import { ALFRED_SERIES } from '../src/utils/alfredVintages';
import { ECB_RTD_SERIES } from '../src/utils/ecbRealTime';
import type { RealTimeVintages } from '../src/utils/forecastEvalRun';
import fs from 'fs';
import { readFxHistoryFile, type FxHistoryFile } from '../src/utils/fxHistory';

// Data as first published for the real-time tests: US from ALFRED (your FRED key), euro area from the ECB.
const vintages: RealTimeVintages = { gdp: [], cpi: [], missing: [] };
for (const [kind, id] of [['gdp', 'GDPC1'], ['cpi', 'CPIAUCSL']] as const) {
  const got = await fetchAlfred(id);
  if ('reason' in got) vintages.missing.push(`US ${id}: ${got.reason}`);
  else vintages[kind].push({ where: 'USA', def: ALFRED_SERIES.find((d) => d.id === id)!, rows: got.rows });
}
const ea = await fetchEuroFirstPublished().catch(() => null);
for (const [kind, def] of [['gdp', ECB_RTD_SERIES[0]], ['cpi', ECB_RTD_SERIES[1]]] as const) {
  const s = ea?.series.find((x) => x.id === def.id);
  if (s?.rows.length) vintages[kind].push({ where: 'EA', def, rows: s.rows });
  else vintages.missing.push(`euro area ${def.id}: the ECB real-time database did not answer`);
}

dotenv.config();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
let savedFx: FxHistoryFile | null = null;
try {
  savedFx = readFxHistoryFile(JSON.parse(fs.readFileSync(path.join(dataDir, 'live', 'fx-history.json'), 'utf8')));
} catch {
  savedFx = null;
}
const resultFile = path.join(dataDir, 'local', 'validation', 'forecasts.json');
const out = await runForecastEvaluations({
  specDir: path.join(root, 'docs', 'validation', 'forecasts'),
  resultFile,
  fetcher: defaultFetcher,
  weoStore: loadWeoVintages(dataDir, { fresh: true }),
  vintages,
  savedFx,
  onResult: (r) =>
    appendAudit(auditFiles(dataDir), {
      kind: 'validation',
      summary: `Forecast evaluation ${r.id} v${r.specVersion}: ${r.status.replace(/_/g, ' ')} (npm run forecast:evaluate)`,
      detail: { verdict: r.verdict, specHash: r.specHash, span: r.span, series: r.series.length, data: r.data },
    }),
});
for (const r of Object.values(out.results)) {
  console.log(`${r.id} (v${r.specVersion}, ${r.series.length} series, ${r.span.from} to ${r.span.to}): ${r.verdict}`);
  for (const c of r.coverage || []) console.log(`  ${c.h} year(s) ahead: ${c.cases} cases over ${c.years} years, inside the 10-90 band ${c.coverage} (90% range ${c.coverageRange[0]} to ${c.coverageRange[1]})`);
  for (const h of r.horizons) console.log(`  ${h.h} ahead: ${h.cases} cases, RMSE ${h.rmseModel} vs ${h.rmseBench}; 70% band held ${h.coverage70 ?? 'n/a'}, 90% band held ${h.coverage90 ?? 'n/a'}`);
  const also = alsoReported(r);
  if (also) console.log(`  ${also}`);
}
for (const p of out.problems) console.log(`Problem: ${p}`);
console.log(`Saved in ${path.relative(root, resultFile)}.`);
