/**
 * `npm run council:regress`: runs the council regression set (docs/validation/council-regression/)
 * through the running app, on the AI model set under Menu > Settings > AI model, and prints each
 * case. The app must be running (Docker: http://localhost:3737; `npm run dev`: http://localhost:3000;
 * or set APP_URL). The report is saved in data/local/validation/council-regression.json and each case
 * is an answer snapshot you can open and re-run. Exits 1 when a case fails.
 */
import type { RegressionReport } from '../src/utils/councilRegression';

const candidates = process.env.APP_URL ? [process.env.APP_URL] : ['http://localhost:3737', 'http://localhost:3000'];
let report: RegressionReport | null = null;
let lastError = '';
for (const base of candidates) {
  try {
    await fetch(`${base}/api/ai/runtime-defaults`, { signal: AbortSignal.timeout(3000) });
  } catch {
    lastError = `no app at ${base}`;
    continue;
  }
  console.log(`Running the council regression set on the app at ${base} (each case waits for the referee model)...`);
  const r = await fetch(`${base}/api/council/regression`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(j?.error || `The app answered HTTP ${r.status}.`);
    process.exit(1);
  }
  report = j as RegressionReport;
  break;
}
if (!report) {
  console.error(`Start the app first (${lastError}). Set APP_URL if it runs elsewhere.`);
  process.exit(1);
}
console.log(`Model: ${report.model || 'none answered'} · set v${report.setVersion} (${report.setHash.slice(0, 12)})`);
for (const r of report.results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}: ${r.headline || '(no answer)'}${r.snapshotId ? `  [${r.snapshotId}]` : ''}`);
  for (const f of r.failures) console.log(`      ${f}`);
}
console.log(`${report.passed} of ${report.total} passed. Saved in data/local/validation/council-regression.json.`);
process.exit(report.passed === report.total ? 0 : 1);
