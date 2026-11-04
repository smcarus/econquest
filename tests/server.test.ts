/**
 * Server tests: start the real server.ts with the network replaced by fixtures
 * (tests/helpers/offline-fetch.mjs) and check what the data endpoints say about where each
 * figure came from. Nothing here reaches the internet.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import type { OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3900 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let dataDir: string;
let log = '';

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-server-test-'));
  // Own-account CDS switched on with a user file that covers Mexico only.
  writeFileSync(path.join(dataDir, 'cds.csv'), 'iso3,date,cds5y_bps,source\nMEX,2026-11-02,119.0,Bloomberg\nMEX,2026-11-03,117.4,Bloomberg\n');
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${path.join(root, 'tests/helpers/offline-fetch.mjs')}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: dataDir,
      FRED_API_KEY: 'test-key',
      EVDS_API_KEY: 'test-evds-key',
      EVDS_TR10Y_SERIES: 'TP.TEST.Y10',
      GEMINI_API_KEY: '',
      CDS_FEED: 'csv',
      CDS_CSV_PATH: path.join(dataDir, 'cds.csv'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      const res = await fetch(`${base}/api/ai/runtime-defaults`);
      if (res.ok) return;
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

async function snapshot(iso3: string): Promise<OpenDataSnapshot> {
  const res = await fetch(`${base}/api/data/sovereign-snapshot?iso3=${iso3}&refresh=1`);
  assert.equal(res.status, 200, `snapshot ${iso3} returned ${res.status}`);
  const body = await res.json();
  assert.ok(body.snapshot && body.charts && body.run, 'snapshot reply has snapshot, charts and run');
  return body.snapshot;
}

test('with every feed down, a country without an official yield is plainly sample data', async () => {
  const s = await snapshot('EGY');
  assert.deepEqual(s.dataStatus?.verifiedLiveSources, []);
  assert.equal(s.ownCds5Y, undefined); // not in the CDS file
  assert.equal(s.official10YYield, undefined);
  const status = getSnapshotDataStatus(s);
  assert.equal(status.mode, 'sample');
  assert.equal(status.yieldSource, 'sample');
});

test('Indonesia: QEDS and IDS debt falling due are attached and named as live sources', async () => {
  const s = await snapshot('IDN');
  assert.equal(s.debtSchedule?.qeds?.asOf, '2026Q2');
  assert.equal(s.debtSchedule?.qeds?.next12mUsdBn.toFixed(1), '11.0');
  assert.deepEqual(s.debtSchedule?.ids?.years.map((y) => y.year), [2027, 2028]);
  const live = s.dataStatus?.verifiedLiveSources || [];
  assert.ok(live.some((x) => /QEDS/.test(x)) && live.some((x) => /IDS/.test(x)));
  // BIS: international bonds and all-markets debt securities.
  assert.equal(s.debtSchedule?.bis?.intl?.outstandingUsdBn.toFixed(3), '88.044');
  assert.equal(s.debtSchedule?.bis?.intl?.dueWithin1yUsdBn?.toFixed(3), '3.615');
  assert.equal(s.debtSchedule?.bis?.all?.valuation, 'nominal');
  assert.ok(live.some((x) => /BIS debt securities/.test(x)));
  // These feeds alone do not make the IMF or World Bank indicator feeds count as live.
  const st = getSnapshotDataStatus(s);
  assert.equal(st.isFeedLive('worldbank'), false);
  assert.equal(st.isFeedLive('imf'), false);
});

test('Mexico: the FRED API answers and its value replaces the sample yield', async () => {
  const s = await snapshot('MEX');
  assert.equal(s.official10YYield?.valuePct, 9.35);
  assert.equal(s.official10YYield?.period, '2026-09');
  assert.equal(s.monetaryAndMarket.sovereign10YBondYieldPct, 9.35);
  assert.equal(getSnapshotDataStatus(s).yieldSource, 'official');
  // Own CDS file: latest row used, named with its provider and date.
  assert.equal(s.monetaryAndMarket.cds5YSpreadBps, 117);
  assert.deepEqual(s.ownCds5Y, { bps: 117.4, date: '2026-11-03', source: 'Bloomberg' });
  assert.equal(getSnapshotDataStatus(s).ownCds?.source, 'Bloomberg');
  // Only the yield feed answered, so the snapshot as a whole is not called live.
  assert.notEqual(getSnapshotDataStatus(s).mode, 'live');
});

test('South Africa: when the FRED API refuses, the public CSV is used, skipping missing months', async () => {
  const s = await snapshot('ZAF');
  assert.equal(s.official10YYield?.valuePct, 8.71);
  assert.equal(s.official10YYield?.period, '2026-08');
  assert.match(s.official10YYield?.source || '', /FRED/);
  // US 10Y benchmark for the spread over Treasuries comes from the same FRED fallback.
  assert.equal(s.us10YYield?.seriesId, 'IRLTLT01USM156N');
  assert.equal(s.us10YYield?.valuePct, 8.71);
});

test('Brazil: Tesouro Direto NTN-F mid rate, dated by day', async () => {
  const s = await snapshot('BRA');
  assert.equal(s.official10YYield?.valuePct, 15.29);
  assert.equal(s.official10YYield?.period, '2026-10-30');
  assert.equal(s.official10YYield?.frequency, 'daily');
  assert.ok(s.dataStatus?.verifiedLiveSources.some((x) => /Tesouro Direto/.test(x)));
});

test('Turkey: EVDS is asked with the key in a header only, and its value is used', async () => {
  const s = await snapshot('TUR');
  assert.equal(s.official10YYield?.valuePct, 31.92);
  assert.equal(s.official10YYield?.seriesId, 'TP.TEST.Y10');
  assert.ok(s.dataStatus?.verifiedLiveSources.some((x) => /CBRT EVDS/.test(x)));
  const evdsCalls = log.split('\n').filter((l) => l.includes('evds3.tcmb.gov.tr'));
  assert.ok(evdsCalls.length > 0, 'EVDS was called');
  for (const line of evdsCalls) {
    assert.ok(line.endsWith('key=present'), `key header missing: ${line}`);
    assert.ok(!line.includes('test-evds-key'), 'the key must never appear in the URL');
  }
});

test('watchlist: official yields carry a date, everything else says sample', async () => {
  const res = await fetch(`${base}/api/data/watchlist-live`);
  assert.equal(res.status, 200);
  const { items } = (await res.json()) as { items: WatchlistItem[] };
  const byIso = new Map(items.map((i) => [i.iso3, i]));
  for (const iso of ['BRA', 'MEX', 'ZAF', 'TUR']) {
    const it = byIso.get(iso);
    assert.equal(it?.yield10YSource, 'official', `${iso} should be official`);
    assert.ok(it?.yield10YPeriod, `${iso} official yield needs a date`);
  }
  assert.equal(byIso.get('TUR')?.yield10YPct, 31.92);
  for (const iso of ['EGY', 'IDN']) {
    assert.equal(byIso.get(iso)?.yield10YSource, 'sample', `${iso} has no official source`);
    assert.equal(byIso.get(iso)?.yield10YPeriod, undefined);
  }
  assert.equal(byIso.get('MEX')?.cds5YSource, 'own');
  assert.equal(byIso.get('MEX')?.cds5YDate, '2026-11-03');
  assert.equal(byIso.get('BRA')?.cds5YSource, 'sample');
  // FX valuation: BIS real exchange rate gap and ECB-rate volatility where they answered (South Africa).
  assert.equal(byIso.get('ZAF')?.reerGapPct, -14.9);
  assert.equal(byIso.get('ZAF')?.reerPeriod, '2026-09');
  assert.ok((byIso.get('ZAF')?.fxVol3mPct ?? 0) > 10);
  assert.equal(byIso.get('EGY')?.fxVol3mPct, undefined);
  assert.equal(byIso.get('ZAF')?.usFedFundsPct, 3.83);
  for (const it of items) {
    assert.ok(it.dataMode !== 'live', `${it.iso3} cannot be live with every macro feed down`);
  }
});

test('MarketEdge benchmarks: US, China, Russia, UK, EU, India, with sources or reasons', async () => {
  const res = await fetch(`${base}/api/data/market-edge-anchors`);
  assert.equal(res.status, 200);
  const body = await res.json();
  const by = Object.fromEntries(body.anchors.map((a: any) => [a.iso3, a]));
  assert.deepEqual(Object.keys(by), ['USA', 'CHN', 'RUS', 'GBR', 'EUU', 'IND']);
  assert.equal(by.USA.yield.seriesId, 'IRLTLT01USM156N');
  assert.equal(by.EUU.yield.seriesId, 'IRLTLT01DEM156N');
  assert.equal(by.IND.yield.seriesId, 'INDIRLTLT01STM');
  assert.equal(by.CHN.yield, undefined);
  assert.match(by.RUS.noYieldReason, /2018/);
  assert.equal(body.us10Y.seriesId, 'IRLTLT01USM156N');
  // The UK is a full country, so it comes with its live watchlist figures for the peer fit.
  assert.deepEqual(body.peers.map((p: WatchlistItem) => p.iso3), ['GBR']);
});

test('an unknown country does not crash the server', async () => {
  const res = await fetch(`${base}/api/data/sovereign-snapshot?iso3=ZZZ&refresh=1`);
  assert.ok(res.status === 200 || res.status === 500, `got ${res.status}`);
  const again = await fetch(`${base}/api/ai/runtime-defaults`);
  assert.equal(again.status, 200);
});
