/**
 * Light mode (U3): LIGHT_MODE=on runs the app without an AI model on this computer, without the
 * GDELT news files, and downloads only the watchlist countries.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defaultProvider, isLightMode, lightModeCountries, skipGdeltRaw } from '../src/utils/lightMode';
import { DEFAULT_WATCHLISTS, SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines';
import { planPreload } from '../src/utils/preload';

const known = new Set(SOVEREIGN_CATALOG.map((c) => c.iso3));
const wl = (groups: Array<{ items: Array<{ iso3: string; isBenchmark?: boolean }> }>) => JSON.stringify(groups.map((g, i) => ({ id: `g${i}`, name: `G${i}`, description: '', items: g.items })));

test('light mode: switched on by LIGHT_MODE=on (or true, 1, yes), off otherwise', () => {
  for (const v of ['on', 'ON', 'true', '1', 'yes']) assert.equal(isLightMode({ LIGHT_MODE: v }), true, v);
  for (const v of [undefined, '', 'off', 'false', '0']) assert.equal(isLightMode({ LIGHT_MODE: v }), false, String(v));
});

test('light mode: an Ollama default becomes Gemini (your own key, or off); a cloud or compatible choice is kept', () => {
  assert.equal(defaultProvider({ LIGHT_MODE: 'on', DEFAULT_AI_PROVIDER: 'ollama' }), 'gemini');
  assert.equal(defaultProvider({ LIGHT_MODE: 'on', DEFAULT_AI_PROVIDER: 'hybrid' }), 'gemini');
  assert.equal(defaultProvider({ LIGHT_MODE: 'on', DEFAULT_AI_PROVIDER: 'openai_compatible' }), 'openai_compatible');
  assert.equal(defaultProvider({ DEFAULT_AI_PROVIDER: 'ollama' }), 'ollama');
  assert.equal(defaultProvider({}), 'gemini');
  assert.equal(defaultProvider({ DEFAULT_AI_PROVIDER: 'something' }), 'gemini');
});

test('light mode: the GDELT news files are left out unless GDELT_RAW_WEEKS is set', () => {
  assert.equal(skipGdeltRaw({ LIGHT_MODE: 'on' }), true);
  assert.equal(skipGdeltRaw({ LIGHT_MODE: 'on', GDELT_RAW_WEEKS: '2' }), false);
  assert.equal(skipGdeltRaw({}), false);
});

test('light mode countries: the first saved watchlist and added countries; the first default list when nothing is saved', () => {
  const saved = { sovereign_council_watchlists_v1: wl([{ items: [{ iso3: 'MEX' }, { iso3: 'bra' }, { iso3: 'USA', isBenchmark: true }] }, { items: [{ iso3: 'TUR' }] }]) };
  assert.deepEqual(lightModeCountries([saved], DEFAULT_WATCHLISTS, known), ['MEX', 'BRA']);
  const added = { econquest_custom_sovereigns_v1: JSON.stringify([{ iso3: 'ZAF' }, { iso3: 'XXX' }]) };
  assert.deepEqual(lightModeCountries([saved, added], DEFAULT_WATCHLISTS, known).sort(), ['BRA', 'MEX', 'ZAF']);
  const fallback = lightModeCountries([{}], DEFAULT_WATCHLISTS, known);
  assert.deepEqual(fallback, DEFAULT_WATCHLISTS[0].items.map((i) => i.iso3));
  assert.deepEqual(lightModeCountries([{ sovereign_council_watchlists_v1: 'not json' }], DEFAULT_WATCHLISTS, known), fallback);
});

// The real server with LIGHT_MODE=on: feeds replaced by fixtures, nothing leaves this machine.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4800 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let dataDir: string;
let log = '';

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-light-test-'));
  mkdirSync(path.join(dataDir, 'local'), { recursive: true });
  writeFileSync(path.join(dataDir, 'local', 'workspace.json'), JSON.stringify({ version: 1, values: { sovereign_council_watchlists_v1: wl([{ items: [{ iso3: 'MEX' }, { iso3: 'BRA' }] }]) }, updatedAt: {} }));
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      LIGHT_MODE: 'on',
      DEFAULT_AI_PROVIDER: 'ollama',
      GDELT_RAW_WEEKS: '',
      PRELOAD_COUNTRIES: '',
      GEMINI_API_KEY: '',
      SCHEDULE_BACKTESTS: 'off',
      SCHEDULE_DOWNLOAD_ALL: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start within 60s:\n${log}`);
});

after(() => {
  server?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

test('light mode server: the download covers the watchlist countries only, without the GDELT news files', async () => {
  const body = (await (await fetch(`${base}/api/preload`)).json()) as { summary: { total: number; countriesTotal: number } };
  assert.equal(body.summary.countriesTotal, 2);
  const full = planPreload([{ iso3: 'MEX' }, { iso3: 'BRA' }]);
  assert.ok(full.some((s) => s.id === 'world:gdelt_raw'));
  assert.equal(body.summary.total, full.length - 1);
});

test('light mode server: a new browser starts on Gemini, and the AI settings say light mode is on', async () => {
  const d = (await (await fetch(`${base}/api/ai/runtime-defaults`)).json()) as { providerMode: string; lightMode: boolean };
  assert.equal(d.providerMode, 'gemini');
  assert.equal(d.lightMode, true);
});

test('light mode: the start scripts and compose files carry the switch, and the Windows scripts stay ASCII', () => {
  const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
  assert.match(read('docker-compose.yml'), /LIGHT_MODE=\$\{LIGHT_MODE:-off\}/);
  assert.match(read('deploy/quick-start/compose.yml'), /LIGHT_MODE: \$\{LIGHT_MODE:-off\}/);
  assert.match(read('scripts/start-mac.sh'), /--light/);
  assert.match(read('scripts/start-windows.ps1'), /param\(\[switch\]\$Light\)/);
  assert.match(read('scripts/start-windows-light.bat'), /start-windows\.ps1" -Light/);
  for (const f of ['scripts/start-windows.ps1', 'scripts/start-windows-light.bat']) assert.doesNotMatch(read(f), /[^\x00-\x7F]/, f);
});
