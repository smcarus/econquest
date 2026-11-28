/**
 * Quests live check (npm run quests:live-check): asks the running app what every Quest page shows,
 * drafts included, and prints one report to paste back. Run it on the maintainer's computer with all
 * keys set, after `npm run go` (or with `npm run dev`), with QUESTS_ENABLED=on in .env.
 *
 *   npm run quests:live-check                       Docker app at 3737, else npm run dev at 3000
 *   APP_URL=http://127.0.0.1:3000 npm run quests:live-check
 *
 * It checks:
 *   - each figure a Quest reads: a live value, or Missing with a reason;
 *   - a practice question for each Forecast Quest (daily and weekly series only; others say why);
 *   - the Bohn download (/api/bohn/BRA.csv), saved to data/local/quests-check/bohn-bra.csv, and the
 *     Python, R and Stata starters in quests/replications/bohn/ run on it, where installed.
 * It writes nothing in quests/ and records no entry. Exit code 1 if a page fails, a Missing figure
 * gives no reason, the download fails or an installed starter fails.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { liveCheckProblems, liveCheckReport, type LiveQuest, type StarterRun } from '../src/utils/questLiveCheck';

const root = process.cwd();
const candidates = process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : ['http://127.0.0.1:3737', 'http://127.0.0.1:3000'];

const getJson = async (url: string) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body: body as Record<string, unknown> };
};

let app = '';
let list: Array<{ id: string; type: string; approved: boolean }> = [];
for (const url of candidates) {
  try {
    const r = await getJson(`${url}/api/quests`);
    if (r.body.enabled === false) {
      console.error(`The app at ${url} has Quests switched off. Set QUESTS_ENABLED=on in .env and restart it (npm run go).`);
      process.exit(1);
    }
    list = (r.body.quests as typeof list) ?? [];
    app = url;
    break;
  } catch {
    /* try the next */
  }
}
if (!app) {
  console.error(`No app answered at ${candidates.join(' or ')}. Start it (npm run go, or npm run dev) and run this again.`);
  process.exit(1);
}

const quests: LiveQuest[] = [];
for (const q of list) {
  const item: LiveQuest = { id: q.id, type: q.type, approved: q.approved, figures: { error: '' } };
  try {
    const r = await getJson(`${app}/api/quests/${encodeURIComponent(q.id)}`);
    item.figures = r.ok ? ((r.body.figures as LiveQuest['figures']) ?? []) : { error: String(r.body.error ?? `HTTP ${r.status}`) };
  } catch (e) {
    item.figures = { error: (e as Error).message };
  }
  if (q.type === 'forecast') {
    try {
      const r = await getJson(`${app}/api/quests/${encodeURIComponent(q.id)}/practice`);
      const start = r.body.start as { date?: string } | undefined;
      item.practice = r.ok && start?.date ? { start: start.date, endDate: String(r.body.endDate) } : { error: String(r.body.error ?? `HTTP ${r.status}`) };
    } catch (e) {
      item.practice = { error: (e as Error).message };
    }
  }
  quests.push(item);
  process.stderr.write('.');
}
process.stderr.write('\n');

const outDir = path.join(root, 'data', 'local', 'quests-check');
fs.mkdirSync(outDir, { recursive: true });
const csvFile = path.join(outDir, 'bohn-bra.csv');
let bohn: { rows: number; file: string } | { error: string };
try {
  const r = await fetch(`${app}/api/bohn/BRA.csv`, { signal: AbortSignal.timeout(180_000) });
  const text = (await r.text()).replace(/^﻿/, '');
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  fs.writeFileSync(csvFile, text);
  bohn = { rows: Math.max(0, text.trim().split(/\r?\n/).length - 1), file: path.relative(root, csvFile) };
} catch (e) {
  bohn = { error: (e as Error).message };
}

const starters: StarterRun[] = [];
const dir = path.join(root, 'quests', 'replications', 'bohn');
const has = (cmd: string) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' }).status === 0;
const lastLine = (s: string) => s.trim().split(/\r?\n/).filter(Boolean).pop()?.slice(0, 160);
const run = (language: StarterRun['language'], cmd: string, args: string[], cwd = outDir): StarterRun => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000 });
  return r.status === 0 ? { language, outcome: 'ran', detail: lastLine(r.stdout) } : { language, outcome: 'failed', detail: lastLine(r.stderr || r.stdout) ?? `exit ${r.status}` };
};
if (!('error' in bohn)) {
  const py = ['python3', 'python'].find(has);
  if (!py) starters.push({ language: 'Python', outcome: 'not installed' });
  else if (spawnSync(py, ['-c', 'import pandas'], { encoding: 'utf8' }).status !== 0) starters.push({ language: 'Python', outcome: 'not installed', detail: 'pandas is missing: pip install pandas' });
  else starters.push(run('Python', py, [path.join(dir, 'bohn_starter.py'), csvFile]));

  starters.push(has('Rscript') ? run('R', 'Rscript', [path.join(dir, 'bohn_starter.R'), csvFile]) : { language: 'R', outcome: 'not installed' });

  const macStata = ['StataMP', 'StataSE', 'StataBE', 'StataIC', 'Stata'].flatMap((n) => {
    const bin = n === 'Stata' ? 'stata' : n.replace('Stata', 'stata-').toLowerCase();
    return [`/Applications/Stata/${n}.app/Contents/MacOS/${bin}`, `/Applications/Stata/${n}.app/Contents/MacOS/${n}`];
  });
  const stata = ['stata-mp', 'stata-se', 'stata-be', 'stata'].find(has) ?? macStata.find((p) => fs.existsSync(p));
  if (!stata) starters.push({ language: 'Stata', outcome: 'not installed' });
  else {
    fs.copyFileSync(path.join(dir, 'bohn_starter.do'), path.join(outDir, 'bohn_starter.do'));
    const r = spawnSync(stata, ['-b', 'do', 'bohn_starter.do'], { cwd: outDir, encoding: 'utf8', timeout: 120_000 });
    const log = fs.existsSync(path.join(outDir, 'bohn_starter.log')) ? fs.readFileSync(path.join(outDir, 'bohn_starter.log'), 'utf8') : '';
    const err = log.match(/^r\((\d+)\);/m);
    starters.push(r.status === 0 && log && !err ? { language: 'Stata', outcome: 'ran', detail: 'log in data/local/quests-check/bohn_starter.log' } : { language: 'Stata', outcome: 'failed', detail: err ? `Stata error r(${err[1]}), see data/local/quests-check/bohn_starter.log` : `exit ${r.status}` });
  }
}

const input = { app, quests, bohn, starters };
console.log(liveCheckReport(input).lines.join('\n'));
const problems = liveCheckProblems(input);
if (problems.length) {
  console.log(`\nTo look at: ${problems.join('; ')}`);
  process.exit(1);
}
