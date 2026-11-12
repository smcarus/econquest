/**
 * Builds tests/fixtures/recorded-public/ from the full recording in tests/fixtures/recorded/
 * (npm run record:public; npm run record:feeds runs it after recording).
 *
 * Keeps only the replies from sources whose terms allow passing data on (tests/helpers/publicFeeds.mjs),
 * then replays that subset through the real server, the way tests/recorded.test.ts does, and saves
 * what the app read from it (sources connected, country and watchlist figures filled) as the expected
 * result. The public repository ships this folder, so outside contributors run the same replay
 * checks without the private recording or any key.
 *
 * Nothing is made up: every reply is a real one recorded from the feed, unchanged.
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PUBLIC_FEEDS, publicFeedFor } from '../tests/helpers/publicFeeds.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'tests', 'fixtures', 'recorded');
const out = path.join(root, 'tests', 'fixtures', 'recorded-public');

if (!existsSync(path.join(from, 'index.json'))) {
  console.error('No full recording in tests/fixtures/recorded/: run `npm run record:feeds` on a computer that reaches the feeds first.');
  process.exit(1);
}

type Req = { method: string; url: string; status: number; contentType?: string; bytes?: number; at?: string; body?: string };
const full = JSON.parse(readFileSync(path.join(from, 'index.json'), 'utf8'));
const requests: Req[] = (full.requests as Req[]).filter((r) => publicFeedFor(r.url));
// Settings (series codes) carry over; keys never do, and no public source needs one.
const keys = Object.fromEntries(Object.entries(full.keys || {}).filter(([, v]) => v !== 'present'));

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'bodies'), { recursive: true });
for (const r of requests) if (r.body && existsSync(path.join(from, 'bodies', r.body))) cpSync(path.join(from, 'bodies', r.body), path.join(out, 'bodies', r.body));
const draft = { recordedAt: full.recordedAt, countries: full.countries, keys, expected: { connections: {}, watchlist: {}, snapshots: {} }, requests };
writeFileSync(path.join(out, 'index.json'), JSON.stringify(draft, null, 1));

// Replay the subset to see what the app reads from it.
const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-public-feeds-'));
const port = 4900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${port}`;
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
for (const k of ['FRED_API_KEY', 'EVDS_API_KEY', 'BANXICO_TOKEN', 'EIA_API_KEY', 'COMTRADE_API_KEY', 'ACLED_KEY', 'ACLED_EMAIL']) delete env[k];
Object.assign(env, keys, {
  NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/replay-fetch.mjs')).href}`,
  REPLAY_DIR: out,
  DATA_DIR: dataDir,
  PORT: String(port),
  HOST: '127.0.0.1',
  NODE_ENV: 'production',
  CDS_FEED: 'off',
  GEMINI_API_KEY: '',
  DEFAULT_AI_PROVIDER: 'none',
  SCHEDULE_BACKTESTS: 'off',
});
const server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout?.on('data', (d) => (log += d));
server.stderr?.on('data', (d) => (log += d));

const get = async (p: string) => (await fetch(`${base}${p}`, { signal: AbortSignal.timeout(300_000) })).json();
const filled = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== null && o[k] !== undefined).sort();

try {
  const deadline = Date.now() + 90_000;
  for (;;) {
    if (server.exitCode !== null) throw new Error(`The server stopped:\n${log.slice(-2000)}`);
    try {
      if ((await fetch(`${base}/api/ai/runtime-defaults`)).ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error('The server did not start within 90 s.');
    await new Promise((r) => setTimeout(r, 500));
  }
  const report = await get('/api/data/connections?refresh=1');
  const connections: Record<string, string> = {};
  for (const r of report.results || []) if (r.group !== 'ai') connections[r.id] = r.state;
  await get('/api/data/watchlist-live');
  const snapshots: Record<string, string[]> = {};
  for (const iso3 of Object.keys(full.expected.snapshots || {})) {
    const s = await get(`/api/data/sovereign-snapshot?iso3=${iso3}&refresh=1`);
    snapshots[iso3] = Object.keys(s?.snapshot?.liveFields || {}).sort();
  }
  const wl = await get('/api/data/watchlist-live?refresh=1');
  const watchlist: Record<string, string[]> = {};
  for (const it of wl.items || []) watchlist[it.iso3] = filled(it);

  writeFileSync(path.join(out, 'index.json'), JSON.stringify({ ...draft, expected: { connections, watchlist, snapshots } }, null, 1));

  const used = new Map<string, number>();
  for (const r of requests) {
    const rule = publicFeedFor(r.url)!;
    used.set(rule.source, (used.get(rule.source) || 0) + 1);
  }
  const readme = [
    '# Recorded feed replies anyone may use',
    '',
    `Real replies from free official feeds, recorded on ${String(full.recordedAt).slice(0, 10)} with \`npm run record:feeds\` and`,
    'kept unchanged (gzipped), from the sources whose terms allow passing their data on. `npm test`',
    'replays them through the server (tests/recordedPublic.test.ts), so you can check a change against',
    'real data without a key or a connection. Built by `npm run record:public`; edit',
    'tests/helpers/publicFeeds.mjs to change which sources are included, never the files here.',
    '',
    'Sources left out (their terms do not allow passing data on, or were not confirmed; see',
    'docs/DATA_LICENCES.md) read as not connected in this replay; that is expected.',
    '',
    'These files are not covered by the repository\'s Apache-2.0 licence: each stays under its',
    'provider\'s terms, below.',
    '',
    '| Source | Replies | Terms | Credit |',
    '| --- | --- | --- | --- |',
    ...PUBLIC_FEEDS.filter((r) => used.has(r.source)).map((r) => `| ${r.source} | ${used.get(r.source)} | ${r.terms} | ${r.credit} |`),
    '',
  ].join('\n');
  writeFileSync(path.join(out, 'README.md'), readme);

  const ok = Object.entries(connections).filter(([, s]) => s === 'connected').map(([id]) => id);
  console.log(`Kept ${requests.length} of ${full.requests.length} replies in tests/fixtures/recorded-public/; ${ok.length} sources read as connected (${ok.join(', ')}).`);
} finally {
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
