/**
 * Countries you add in the daily download (LI1): the server reads them from the workspace files and
 * puts them in its country list, so the start-up download and the daily run save them too.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ADDED_COUNTRIES_KEY, ADDED_COUNTRIES_MAX, pickAddedCountries } from '../src/utils/addedCountries';
import { SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines';

const builtIn = new Set(SOVEREIGN_CATALOG.map((c) => c.iso3));
const added = (list: unknown) => ({ [ADDED_COUNTRIES_KEY]: JSON.stringify(list) });
const kenya = { iso3: 'ZMB', countryName: 'Zambia', region: 'Africa', currencyCode: 'zmw' };

test('added countries: valid ISO codes are taken, built-in and made-up codes are left out, each country once', () => {
  const pick = pickAddedCountries(
    [added([kenya, { iso3: 'bra', countryName: 'Brazil' }, { iso3: 'XXX', countryName: 'Nowhere' }, { iso3: 'KE' }, 'text']), added([{ iso3: 'ZMB', countryName: 'Zambia again' }, { iso3: 'SEN', countryName: 'Senegal' }])],
    builtIn
  );
  assert.deepEqual(pick.countries, [
    { iso3: 'ZMB', countryName: 'Zambia', region: 'Africa', currencyCode: 'ZMW' },
    { iso3: 'SEN', countryName: 'Senegal', region: '', currencyCode: '' },
  ]);
  assert.deepEqual(pick.overLimit, []);
});

test('added countries: unreadable workspace values give nothing; a missing name falls back to the code', () => {
  assert.deepEqual(pickAddedCountries([{ [ADDED_COUNTRIES_KEY]: 'not json' }, {}, { [ADDED_COUNTRIES_KEY]: '{"iso3":"ZMB"}' }], builtIn).countries, []);
  assert.equal(pickAddedCountries([added([{ iso3: 'NPL' }])], builtIn).countries[0].countryName, 'NPL');
});

test('added countries: at most the limit are taken, in the order added; the rest are named', () => {
  const pick = pickAddedCountries([added([{ iso3: 'ZMB' }, { iso3: 'SEN' }, { iso3: 'NPL' }, { iso3: 'MWI' }])], builtIn, 2);
  assert.deepEqual(pick.countries.map((c) => c.iso3), ['ZMB', 'SEN']);
  assert.deepEqual(pick.overLimit, ['NPL', 'MWI']);
  assert.equal(ADDED_COUNTRIES_MAX, 25);
});

// The real server: feeds replaced by fixtures, nothing leaves this machine.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 5100 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let dataDir: string;
let log = '';

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-added-test-'));
  mkdirSync(path.join(dataDir, 'local'), { recursive: true });
  writeFileSync(path.join(dataDir, 'local', 'workspace.json'), JSON.stringify({ version: 1, values: added([kenya]), updatedAt: {} }));
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      LIGHT_MODE: 'off',
      PRELOAD_COUNTRIES: '',
      GEMINI_API_KEY: '',
      SCHEDULE_BACKTESTS: 'off',
      SCHEDULE_DOWNLOAD_ALL: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 120_000; // slow shared CI machines can take over a minute
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/healthz`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start within 120s:\n${log}`);
});

after(() => {
  server?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

const preload = async () => (await (await fetch(`${base}/api/preload`)).json()) as { summary: { countriesTotal: number }; added: { overLimit: string[]; max: number } };
const onlineTotal = async () => ((await (await fetch(`${base}/api/online`)).json()) as { countriesTotal: number }).countriesTotal;

test('added countries server: a country in the workspace is in the download', async () => {
  const body = await preload();
  assert.equal(body.summary.countriesTotal, builtIn.size + 1);
  assert.deepEqual(body.added, { overLimit: [], max: ADDED_COUNTRIES_MAX });
  assert.equal(await onlineTotal(), builtIn.size + 1);
});

test('added countries server: adding and removing a country on the page changes the download list', async () => {
  const put = (list: unknown) =>
    fetch(`${base}/api/workspace/${ADDED_COUNTRIES_KEY}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify(list) }) });
  assert.equal((await put([kenya, { iso3: 'SEN', countryName: 'Senegal', region: 'Africa', currencyCode: 'XOF' }, { iso3: 'BRA', countryName: 'Brazil' }])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, builtIn.size + 2);
  assert.equal((await put([])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, builtIn.size);
  assert.equal(await onlineTotal(), builtIn.size);
});
