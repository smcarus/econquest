/**
 * Replication check (R2) for every figure pinned to a research notebook: draws each chart again
 * from the running app and says Same, Revised (old and new value) or Source no longer answers.
 *
 *   npm run notebook:check                         the app at http://localhost:3000
 *   npm run notebook:check -- --url http://localhost:3737
 *   npm run notebook:check -- --token <API token>  when sign-in is on (Menu > Settings > API tokens)
 *   npm run notebook:check -- --json               the results as JSON
 *
 * Reads the notebooks from data/local/research.json (DATA_DIR/local when set). Changes nothing.
 * Exits 1 when any figure was revised or its source no longer answers, so it can run on a schedule.
 */
import { loadLibrary } from '../src/utils/researchStore.ts';
import { RESEARCH_FILE } from '../src/server/config.ts';
import { checkPin, pinCheckText, type PinCheck } from '../src/utils/pinCheck.ts';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = (opt('--url') || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const token = opt('--token') || process.env.APP_TOKEN;
const json = args.includes('--json');

const get: typeof fetch = (input, init) => fetch(`${base}${String(input)}`, { ...init, headers: { ...(init?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });

async function main() {
  const file = RESEARCH_FILE;
  const lib = loadLibrary(file);
  const withPins = lib.notebooks.filter((n) => n.pins?.length);
  if (!withPins.length) {
    console.log(`No pinned figures in ${file}. Pin a Chart Agent chart to a notebook first (Council chat > Pin to notebook).`);
    return;
  }
  try {
    await get('/api/research');
  } catch {
    console.error(`The app does not answer at ${base}. Start it (npm run dev, or Docker) or pass --url.`);
    process.exit(2);
  }
  const out: Array<{ notebook: string; pin: string; asOf: string; check: PinCheck }> = [];
  for (const nb of withPins)
    for (const p of nb.pins!) {
      const check = await checkPin(p, get).catch((e) => ({ state: 'gone', checkedAt: new Date().toISOString(), changes: [], changeCount: 0, gone: [{ line: p.title, reason: (e as Error).message }], newer: 0 }) as PinCheck);
      out.push({ notebook: nb.title, pin: p.title, asOf: p.asOf, check });
      if (!json) console.log(`${nb.title} > ${p.title} (as of ${p.asOf}): ${pinCheckText(check)}`);
    }
  if (json) console.log(JSON.stringify(out, null, 2));
  const bad = out.filter((o) => o.check.state === 'revised' || o.check.state === 'gone').length;
  if (!json) console.log(`\n${out.length} pinned figure${out.length === 1 ? '' : 's'} checked; ${out.length - bad} unchanged or not checkable, ${bad} revised or gone.`);
  if (bad) process.exit(1);
}

void main();
