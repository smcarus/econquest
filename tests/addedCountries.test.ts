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
import { LOW_INCOME_DEBT_ADDED_ISO3 } from '../src/data/lowIncomeCatalog.ts';
import { SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines';

const builtIn = new Set(SOVEREIGN_CATALOG.map((c) => c.iso3));
/** What the server downloads with nothing followed: the built-in countries less the follow-only ones on the IMF low-income debt list. */
const always = new Set([...builtIn].filter((iso3) => !LOW_INCOME_DEBT_ADDED_ISO3.includes(iso3)));
const added = (list: unknown) => ({ [ADDED_COUNTRIES_KEY]: JSON.stringify(list) });
const kenya = { iso3: 'NAM', countryName: 'Namibia', region: 'Africa', currencyCode: 'nad' };

test('added countries: valid ISO codes are taken, built-in and made-up codes are left out, each country once', () => {
  const pick = pickAddedCountries(
    [added([kenya, { iso3: 'bra', countryName: 'Brazil' }, { iso3: 'XXX', countryName: 'Nowhere' }, { iso3: 'KE' }, 'text']), added([{ iso3: 'NAM', countryName: 'Namibia again' }, { iso3: 'MAR', countryName: 'Morocco' }])],
    builtIn
  );
  assert.deepEqual(pick.countries, [
    { iso3: 'NAM', countryName: 'Namibia', region: 'Africa', currencyCode: 'NAD' },
    { iso3: 'MAR', countryName: 'Morocco', region: '', currencyCode: '' },
  ]);
  assert.deepEqual(pick.overLimit, []);
});

test('added countries: unreadable workspace values give nothing; a missing name falls back to the code', () => {
  assert.deepEqual(pickAddedCountries([{ [ADDED_COUNTRIES_KEY]: 'not json' }, {}, { [ADDED_COUNTRIES_KEY]: '{"iso3":"NAM"}' }], builtIn).countries, []);
  assert.equal(pickAddedCountries([added([{ iso3: 'LKA' }])], builtIn).countries[0].countryName, 'LKA');
});

test('added countries: at most the limit are taken, in the order added; the rest are named', () => {
  const pick = pickAddedCountries([added([{ iso3: 'NAM' }, { iso3: 'MAR' }, { iso3: 'LKA' }, { iso3: 'JAM' }])], builtIn, 2);
  assert.deepEqual(pick.countries.map((c) => c.iso3), ['NAM', 'MAR']);
  assert.deepEqual(pick.overLimit, ['LKA', 'JAM']);
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
  assert.equal(body.summary.countriesTotal, always.size + 1);
  assert.deepEqual(body.added, { overLimit: [], max: ADDED_COUNTRIES_MAX });
  assert.equal(await onlineTotal(), always.size + 1);
});

test('added countries server: adding and removing a country on the page changes the download list', async () => {
  const put = (list: unknown) =>
    fetch(`${base}/api/workspace/${ADDED_COUNTRIES_KEY}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify(list) }) });
  assert.equal((await put([kenya, { iso3: 'MAR', countryName: 'Morocco', region: 'Africa', currencyCode: 'MAD' }, { iso3: 'BRA', countryName: 'Brazil' }])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, always.size + 2);
  assert.equal((await put([])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, always.size);
  assert.equal(await onlineTotal(), always.size);
});

test('added countries server: a country on the IMF low-income debt list is downloaded once it is on a watchlist', async () => {
  const putLists = (groups: unknown) =>
    fetch(`${base}/api/workspace/sovereign_council_watchlists_v1`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify(groups) }) });
  assert.equal((await putLists([{ id: 'mine', name: 'Mine', items: [{ iso3: 'MWI' }, { iso3: 'BRA' }] }])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, always.size + 1);
  assert.equal((await putLists([{ id: 'mine', name: 'Mine', items: [{ iso3: 'BRA' }] }])).status, 200);
  assert.equal((await preload()).summary.countriesTotal, always.size);
});
