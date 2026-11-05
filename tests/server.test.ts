/**
 * Server tests: start the real server.ts with the network replaced by fixtures
 * (tests/helpers/offline-fetch.mjs) and check what the data endpoints say about where each
 * figure came from. Nothing here reaches the internet.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  // Policy rate: BIS where the feed has one (Mexico daily, Turkey month-end), else no figure.
  assert.deepEqual(
    [byIso.get('MEX')?.policyRatePct, byIso.get('MEX')?.policyRateSource, byIso.get('MEX')?.policyRateDate, byIso.get('MEX')?.policyRateBank],
    [6.5, 'bis', '2026-10-27', 'Bank of Mexico']
  );
  assert.deepEqual(byIso.get('MEX')?.policyRateLastMove, { period: '2026-10', fromPct: 6.75, toPct: 6.5 });
  assert.equal(byIso.get('TUR')?.policyRateDate, '2026-09');
  assert.equal(byIso.get('EGY')?.policyRateSource, 'sample');
  assert.equal(byIso.get('EGY')?.policyRateDate, undefined);
  // FX valuation: BIS real exchange rate gap and ECB-rate volatility where they answered (South Africa).
  assert.equal(byIso.get('ZAF')?.reerGapPct, -14.9);
  assert.equal(byIso.get('ZAF')?.reerPeriod, '2026-09');
  assert.ok((byIso.get('ZAF')?.fxVol3mPct ?? 0) > 10);
  assert.equal(byIso.get('EGY')?.fxVol3mPct, undefined);
  assert.equal(byIso.get('ZAF')?.usFedFundsPct, 3.83);
  // Trade shares for the scenario ranking: World Bank for Turkey and Egypt, WITS for Turkey.
  assert.deepEqual(byIso.get('TUR')?.trade, {
    fuelImportsPctMerch: 20, fuelExportsPctMerch: 5, importsPctGdp: 35, exportsPctGdp: 30, wbYear: '2025',
    chinaExportSharePct: 2.5, russiaExportSharePct: 4, russiaImportSharePct: 12.5977, witsYear: '2023',
  });
  assert.equal(byIso.get('EGY')?.trade?.chinaExportSharePct, undefined);
  assert.equal(byIso.get('BRA')?.trade, undefined);
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

test('council synthesis: no model means no summary, said plainly; a bad request is refused', async () => {
  const bad = await fetch(`${base}/api/council/synthesise`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(bad.status, 400);
  const answers = [
    {
      id: 'cb',
      name: 'Central Bank Watcher',
      why: 'the question mentions "inflation"',
      findings: [{ iso3: 'TUR', countryName: 'Turkey', reading: 'Policy looks loose.', figures: [{ label: 'CPI inflation', value: '34.0%', source: 'IMF, live', tag: 'live' }], weight: 0.5 }],
      missing: [],
    },
  ];
  const res = await fetch(`${base}/api/council/synthesise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Is Turkey behind the curve on inflation?', answers }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.brief, null);
  assert.match(body.reason, /No AI model answered/);
});

test('council synthesis: a model brief keeps traceable sentences and drops invented numbers', async () => {
  const answers = [
    {
      id: 'cb',
      name: 'Central Bank Watcher',
      why: 'the question mentions "inflation"',
      findings: [{ iso3: 'TUR', countryName: 'Turkey', reading: 'Policy looks loose.', figures: [{ label: 'CPI inflation', value: '34.0%', source: 'IMF, live', tag: 'live' }], weight: 0.5 }],
      missing: [],
    },
  ];
  const res = await fetch(`${base}/api/council/synthesise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Is Turkey behind the curve on inflation?',
      answers,
      runtimeConfig: { providerMode: 'ollama', ollamaBaseUrl: 'http://fake-ollama.test:11434' },
    }),
  });
  const body = await res.json();
  assert.match(body.provider, /Ollama/);
  assert.equal(body.brief.headline, 'Turkey looks behind the curve.');
  assert.deepEqual(body.brief.points, ['Inflation is 34.0%, from live IMF data.']);
  assert.deepEqual(body.removed, ['Inflation should fall to 21% next year.']);
});

test('council progress: each step reports as it finishes, honestly marked when no model answered', async () => {
  const progressId = 'test-progress-1';
  const run = await fetch(`${base}/api/council/phase1-and-cascade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iso3: 'ZAF', countryName: 'South Africa', progressId }),
  });
  assert.equal(run.status, 200);
  const { steps } = await (await fetch(`${base}/api/council/progress/${progressId}`)).json();
  assert.equal(steps.data.status, 'done');
  for (const desk of ['geo', 'sov', 'macro', 'cascade']) {
    assert.equal(steps[desk].status, 'fallback', desk); // no Gemini key in tests
    assert.match(steps[desk].note, /No model answered/);
  }
  assert.equal(steps.search.status, 'skipped');
  // An unknown id answers with no steps rather than an error.
  assert.deepEqual((await (await fetch(`${base}/api/council/progress/nope-nope`)).json()).steps, {});
});

test('country snapshot: the BIS policy rate is marked live with its date; Egypt stays unmarked', async () => {
  const mex = await (await fetch(`${base}/api/data/sovereign-snapshot?iso3=MEX`)).json();
  const snap = (mex.snapshot || mex) as import('../src/types/council.ts').OpenDataSnapshot;
  assert.equal(snap.monetaryAndMarket.policyRatePct, 6.5);
  assert.equal(snap.liveFields?.['market.policyRatePct'], 'BIS, 2026-10-27 (Bank of Mexico)');
  assert.equal(snap.bisPolicyRate?.lastMove?.toPct, 6.5);
  const egy = await (await fetch(`${base}/api/data/sovereign-snapshot?iso3=EGY`)).json();
  const e = (egy.snapshot || egy) as import('../src/types/council.ts').OpenDataSnapshot;
  assert.equal(e.liveFields?.['market.policyRatePct'], undefined);
  assert.equal(e.bisPolicyRate, undefined);
});

test('policy rates: BIS figures with their dates, kept on disk; missing countries say why', async () => {
  const res = await fetch(`${base}/api/data/policy-rates`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { pulledAt: string; rows: Array<{ iso3: string; rate?: any; missing?: { short: string } }> };
  const row = (iso3: string) => body.rows.find((r) => r.iso3 === iso3)!;
  assert.ok(body.pulledAt);
  assert.equal(row('MEX').rate.ratePct, 6.5);
  assert.equal(row('MEX').rate.date, '2026-10-27');
  assert.equal(row('MEX').rate.bank, 'Bank of Mexico');
  assert.equal(row('USA').rate.ratePct, 3.875);
  assert.equal(row('EUU').rate.ratePct, 2.5);
  assert.equal(row('TUR').rate.date, '2026-09');
  assert.equal(row('EGY').missing!.short, 'Not in BIS policy rates');
  assert.equal(row('BRA').missing!.short, 'No BIS series returned');
  const file = path.join(dataDir, 'live', 'bis-policy-rates.json');
  assert.ok(existsSync(file));
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(saved.daily.MX.points[0].pct, 6.5);
  assert.equal(saved.pulledAt, body.pulledAt);
});

test('data connections: every source gets a row; keys are never in the reply', async () => {
  const res = await fetch(`${base}/api/data/connections?refresh=1`);
  assert.equal(res.status, 200);
  const rep = (await res.json()) as import('../src/utils/connectionCheck.ts').ConnectionReport;
  const row = (id: string) => rep.results.find((r) => r.id === id)!;
  assert.equal(rep.results.length, 32);
  assert.equal(row('bcb_ipca').state, 'connected');
  assert.match(row('bcb_ipca').sample || '', /Brazil IPCA 4\.58% over 12 months \(Sep 2026\)/);
  assert.equal(row('eurostat_hicp').state, 'no_answer');
  // The offline fixtures answer FRED's download, Brazil's Treasury and EVDS; everything else is down.
  assert.equal(row('fred_csv').state, 'connected');
  assert.equal(row('tesouro').state, 'connected');
  assert.equal(row('evds').state, 'connected');
  assert.equal(row('imf').state, 'no_answer');
  assert.equal(row('fred_api').state, 'needs_setup', 'the fixture refuses the test key for the US series');
  assert.equal(row('own_cds').state, 'connected');
  assert.match(row('own_cds').detail, /1 country/);
  const body = JSON.stringify(rep);
  assert.doesNotMatch(body, /test-key|test-evds-key/);
});

test('commodity prices: with the World Bank down every commodity reads Missing with a reason, never a number', async () => {
  const r = await (await fetch(`${base}/api/data/commodities`)).json();
  assert.deepEqual(r.moves, []);
  assert.equal(r.pinkStatus, 'no_answer');
  assert.ok(r.missing.length >= 20);
  assert.ok(r.missing.every((m: { reason: string }) => m.reason.length > 0));
});

test('trade partners: with Comtrade down every country says Missing and why, never a share', async () => {
  const r = await (await fetch(`${base}/api/data/trade-partners`)).json();
  assert.match(r.source, /UN Comtrade/);
  assert.ok(r.countries.length >= 5);
  for (const c of r.countries) {
    assert.equal(c.exportSharePct, undefined);
    assert.match(c.missing.short, /Comtrade did not answer|Not in the app/);
  }
});

test('no stand-in data when sources are down: prediction markets, connector test, Ollama models, health check', async () => {
  const pm = await (await fetch(`${base}/api/data/prediction-markets?iso3=BRA&countryName=Brazil`)).json();
  assert.deepEqual(pm.contracts, []);
  assert.match(pm.activeSourcesLabel, /^Missing/);

  const ping = await (
    await fetch(`${base}/api/connectors/ping-and-inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector: { id: 'x', name: 'My lake', url: 'http://lake.invalid/{{ISO3}}', category: 'macro_rest', telemetryMappings: { debtToGdp: 'telemetry.debtToGdpPct' } }, sampleIso3: 'BRA' }),
    })
  ).json();
  assert.equal(ping.ok, false);
  assert.equal(ping.isSimulatedPreview, false);
  assert.equal(ping.jsonPreview, null);
  assert.deepEqual(ping.extractedTelemetry, {});

  const ollama = await (await fetch(`${base}/api/ai/ollama-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ollamaBaseUrl":"http://ollama-down.invalid:11434"}' })).json();
  assert.equal(ollama.connected, false);
  assert.deepEqual(ollama.models, []);

  const sweep = await (await fetch(`${base}/api/health/full-sweep?iso3=BRA`)).json();
  assert.equal(sweep.status, 'PARTIAL_WARN', 'the health check reports real failures instead of passing everything');
  assert.ok(sweep.checks.some((c: { id: string; status: string }) => c.id === 'imf' && c.status === 'WARN'));
});

test('GDELT: after one refusal the app sends nothing more to GDELT for a while', async () => {
  await snapshot('MEX');
  await snapshot('ZAF');
  await fetch(`${base}/api/data/connections?refresh=1`);
  const asked = log.split('\n').filter((l) => l.startsWith('[offline-fetch] https://api.gdeltproject.org')).length;
  assert.equal(asked, 1, `GDELT was asked ${asked} times`);
  assert.match(log, /\[GDELT\] HTTP 429/);
});

test('Settings > Data API keys: a key saved in the app is masked, wins over .env and can be removed', async () => {
  const GOOD = 'abcdef0123456789abcdef0123456789';
  const keys = async () => (await fetch(`${base}/api/settings/keys`)).json();

  const start = await keys();
  const fred = start.keys.find((k: { id: string }) => k.id === 'FRED_API_KEY');
  assert.equal(fred.source, 'env');
  assert.equal(start.canEdit, true);
  assert.ok(!JSON.stringify(start).includes('test-key'), 'the .env key itself never reaches the browser');

  const bad = await fetch(`${base}/api/settings/keys/FRED_API_KEY`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"value":"nope"}' });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /32 lower-case/);

  const tested = await (
    await fetch(`${base}/api/settings/keys/FRED_API_KEY/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: GOOD }) })
  ).json();
  assert.equal(tested.check.id, 'fred_api');
  assert.equal((await keys()).keys[0].source, 'env', 'testing a key does not save it');

  const saved = await (
    await fetch(`${base}/api/settings/keys/FRED_API_KEY`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: GOOD }) })
  ).json();
  const after = saved.keys.find((k: { id: string }) => k.id === 'FRED_API_KEY');
  assert.equal(after.source, 'app');
  assert.equal(after.masked, '••••6789');
  assert.equal(after.envAlsoSet, true);
  assert.ok(!JSON.stringify(saved).includes(GOOD), 'the saved key never goes back to the browser');
  // The offline FRED fixture refuses the US series, so the check says the saved key was not accepted.
  assert.equal(saved.check.state, 'needs_setup');
  assert.match(saved.check.detail, /key saved in Settings/);

  const file = path.join(dataDir, 'local', 'settings.json');
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).apiKeys.FRED_API_KEY, GOOD);

  const report = await (await fetch(`${base}/api/data/connections`)).json();
  assert.match(report.results.find((r: { id: string }) => r.id === 'fred_api').detail, /key saved in Settings/);

  const removed = await (await fetch(`${base}/api/settings/keys/FRED_API_KEY`, { method: 'DELETE' })).json();
  assert.equal(removed.keys.find((k: { id: string }) => k.id === 'FRED_API_KEY').source, 'env');
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).apiKeys.FRED_API_KEY, undefined);
});

test('Settings > own paid data: switching CDS off in the app wins over CDS_FEED in .env', async () => {
  const put = await fetch(`${base}/api/settings/keys/CDS_FEED`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"value":"off"}' });
  const body = await put.json();
  assert.equal(put.status, 200);
  assert.equal(body.check.id, 'own_cds');
  assert.equal(body.check.state, 'off');
  const removed = await (await fetch(`${base}/api/settings/keys/CDS_FEED`, { method: 'DELETE' })).json();
  assert.equal(removed.keys.find((k: { id: string }) => k.id === 'CDS_FEED').source, 'env');
  const report = await (await fetch(`${base}/api/data/connections?refresh=1`)).json();
  assert.equal(report.results.find((r: { id: string }) => r.id === 'own_cds').state, 'connected');
});

test('Saved research: conversations and documents are kept in data/local/research.json and can be deleted', async () => {
  const post = (url: string, body: unknown) => fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const brief = { question: 'Is Brazil debt sustainable?', askedAt: '2026-11-05T05:00:00.000Z', startedAt: '2026-11-05T04:59:00.000Z', scopeNote: 'Brazil', answers: [], synthesis: null };
  const saved = await (await post('/api/research/briefs', brief)).json();
  assert.equal(saved.id, 'b-20261105045900000');
  // A follow-up in the same conversation replaces the entry instead of adding one.
  await post('/api/research/briefs', { ...brief, question: 'And the currency?', askedAt: '2026-11-05T05:01:00.000Z', earlier: [{ question: brief.question }] });
  assert.equal((await post('/api/research/briefs', { question: '' })).status, 400);
  await post('/api/research/docs', { id: 'd1', title: 'BCB Copom statement', text: 'The Committee decided to keep the Selic rate unchanged.', addedAt: '2026-11-05T05:00:00Z' });
  const list = await (await fetch(`${base}/api/research`)).json();
  assert.deepEqual(list.briefs.map((b: { question: string; turns: number }) => [b.question, b.turns]), [['And the currency?', 2]]);
  assert.deepEqual(list.docs.map((d: { title: string }) => d.title), ['BCB Copom statement']);
  const onDisk = JSON.parse(readFileSync(path.join(dataDir, 'local', 'research.json'), 'utf8'));
  assert.equal(onDisk.docs[0].text, 'The Committee decided to keep the Selic rate unchanged.');
  const doc = await (await fetch(`${base}/api/research/docs/d1`)).json();
  assert.equal(doc.title, 'BCB Copom statement');
  await fetch(`${base}/api/research/briefs/${saved.id}`, { method: 'DELETE' });
  await fetch(`${base}/api/research/docs/d1`, { method: 'DELETE' });
  const empty = await (await fetch(`${base}/api/research`)).json();
  assert.equal(empty.briefs.length + empty.docs.length, 0);
});

test('Research notebooks: group saved research by topic, keep notes, export as Markdown', async () => {
  const send = (method: string, url: string, body: unknown) => fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const brief = { question: 'Where is the Selic going?', askedAt: '2026-11-05T07:00:00.000Z', scopeNote: 'Brazil', answers: [], synthesis: null };
  const saved = await (await send('POST', '/api/research/briefs', brief)).json();
  assert.equal((await send('POST', '/api/research/notebooks', { title: ' ' })).status, 400);
  const made = await (await send('POST', '/api/research/notebooks', { title: 'Brazil rates', briefIds: [saved.id, 'b-nope'] })).json();
  assert.ok(made.id);
  assert.equal((await send('PUT', `/api/research/notebooks/${made.id}`, { notes: 'Copom next month.' })).status, 200);
  assert.equal((await send('PUT', '/api/research/notebooks/n-missing', { notes: 'x' })).status, 404);
  const list = await (await fetch(`${base}/api/research`)).json();
  assert.deepEqual(list.notebooks.map((n: { title: string; briefIds: string[] }) => [n.title, n.briefIds]), [['Brazil rates', [saved.id]]]);
  const file = await fetch(`${base}/api/export/notebook/${made.id}.md`);
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-disposition') || '', /notebook-brazil-rates-\d{4}-\d{2}-\d{2}\.md/);
  const md = await file.text();
  assert.match(md, /^# Brazil rates/);
  assert.match(md, /Copom next month\./);
  assert.match(md, /Where is the Selic going\?/);
  await fetch(`${base}/api/research/briefs/${saved.id}`, { method: 'DELETE' });
  const after = await (await fetch(`${base}/api/research/notebooks/${made.id}`)).json();
  assert.deepEqual(after.briefIds, []);
  await fetch(`${base}/api/research/notebooks/${made.id}`, { method: 'DELETE' });
  assert.equal((await fetch(`${base}/api/export/notebook/${made.id}.md`)).status, 404);
});

test('Watch alerts: rules you set are kept in data/local/watch-rules.json; bad rules are dropped', async () => {
  const put = (body: unknown) => fetch(`${base}/api/watch-rules`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.deepEqual((await (await fetch(`${base}/api/watch-rules`)).json()).rules, []);
  const saved = await (await put({ rules: [{ id: 'w1', iso3: '*', metric: 'cftc_percentile', op: '>=', value: 90, createdAt: '2026-11-05T05:00:00Z' }, { iso3: 'bad', metric: 'x', op: '>', value: 'no' }] })).json();
  assert.equal(saved.rules.length, 1);
  const onDisk = JSON.parse(readFileSync(path.join(dataDir, 'local', 'watch-rules.json'), 'utf8'));
  assert.equal(onDisk.rules[0].metric, 'cftc_percentile');
  await put({ rules: [] });
  assert.deepEqual((await (await fetch(`${base}/api/watch-rules`)).json()).rules, []);
});

test('integration API sends no built-in figures: without a council run it says so', async () => {
  for (const url of ['/api/v1/integration/bundle/BRA', '/api/v1/integration/desks/BRA']) {
    const res = await fetch(`${base}${url}`);
    assert.equal(res.status, 404, url);
    const body = (await res.json()) as { error: string; message: string };
    assert.equal(body.error, 'NO_COUNCIL_RUN');
    assert.match(body.message, /never built-in figures/);
  }
});

test('a snapshot served with every feed down carries no figures', async () => {
  const res = await fetch(`${base}/api/open-data/POL`);
  const { snapshot } = (await res.json()) as { snapshot: Record<string, Record<string, unknown>> };
  for (const section of ['imfIndicators', 'worldBankIndicators']) {
    for (const [k, v] of Object.entries(snapshot[section])) {
      if (k !== 'sourceUrl') assert.equal(v, null, `${section}.${k}`);
    }
  }
});

test("monthly inflation: Brazil's central bank figure is used and says so", async () => {
  const r = (await (await fetch(`${base}/api/data/watchlist-live`)).json()) as { items: Array<Record<string, any>> };
  const bra = r.items.find((i) => i.iso3 === 'BRA')!;
  assert.equal(bra.cpiInflationPct, 4.58);
  assert.equal(bra.cpiMonth, '2026-09');
  assert.equal(bra.oecdCpi.short, 'BCB IPCA');
  assert.equal(bra.oecdCpi.basis, 'national');
});

test('pull archive: each saved country pull is kept by day and read back on or before a date', async () => {
  // Earlier tests pulled Mexico, so it has a stored and archived pull for today.
  await fetch(`${base}/api/open-data/MEX`);
  const today = new Date().toISOString().slice(0, 10);
  let days: string[] = [];
  for (let i = 0; i < 40 && !days.includes(today); i++) {
    days = ((await (await fetch(`${base}/api/archive/MEX`)).json()) as { days: string[] }).days;
    if (!days.includes(today)) await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(days.includes(today), `archive days for MEX: ${JSON.stringify(days)}`);
  assert.ok(existsSync(path.join(dataDir, 'archive', 'MEX', `${today}.json.gz`)));

  const later = await fetch(`${base}/api/archive/MEX/2999-01-01`);
  assert.equal(later.status, 200);
  const body = (await later.json()) as { date: string; snapshot: OpenDataSnapshot };
  assert.equal(body.date, today);
  assert.equal(body.snapshot.iso3, 'MEX');

  const before = await fetch(`${base}/api/archive/MEX/2000-01-01`);
  assert.equal(before.status, 404);
  assert.equal(((await before.json()) as { error: string }).error, 'NOT_IN_ARCHIVE');

  const list = (await (await fetch(`${base}/api/archive`)).json()) as { countries: Array<{ iso3: string }> };
  assert.ok(list.countries.some((c) => c.iso3 === 'MEX'));
});

test('series: every figure lists its history or why it has none; unknown series say Missing', async () => {
  const list = (await (await fetch(`${base}/api/series/MEX`)).json()) as { series: Array<{ id: string; count: number }>; missing: Array<{ id: string; reason: string }> };
  const ids = [...list.series.map((s) => s.id), ...list.missing.map((m) => m.id)];
  for (const id of ['policy_rate', 'cpi_monthly', 'cli', 'cftc_lev_net', 'tic_holdings', 'debt_gdp', 'yield_10y']) assert.ok(ids.includes(id), id);
  for (const m of list.missing) assert.ok(m.reason.length > 0, m.id);
  for (const s of list.series) assert.ok(s.count > 0, s.id);
  const egypt = await fetch(`${base}/api/series/EGY/policy_rate`);
  assert.equal(egypt.status, 404);
  assert.match(((await egypt.json()) as { message: string }).message, /Missing\. Not in BIS policy rates/);
  const world = (await (await fetch(`${base}/api/series/world`)).json()) as { series: unknown[]; missing: unknown[] };
  assert.ok(Array.isArray(world.series) && Array.isArray(world.missing));
});

test('downloads: figures and series come as CSV files; a series with no history says why', async () => {
  const figs = await fetch(`${base}/api/export/MEX/figures.csv`);
  assert.equal(figs.status, 200);
  assert.match(figs.headers.get('content-type') || '', /text\/csv/);
  assert.match(figs.headers.get('content-disposition') || '', /MEX-figures-\d{4}-\d{2}-\d{2}\.csv/);
  const text = await figs.text();
  assert.ok(text.includes('iso3,country,field,figure,value,unit,status'));
  assert.ok(text.includes('Missing'));
  const all = await fetch(`${base}/api/export/MEX/series.csv`);
  assert.equal(all.status, 200);
  assert.ok((await all.text()).includes('iso3,series_id,series,unit,frequency,date,value'));
  const one = await fetch(`${base}/api/export/MEX/series/policy_rate.csv`);
  assert.ok(one.status === 200 || one.status === 404);
  const none = await fetch(`${base}/api/export/EGY/series/policy_rate.csv`);
  assert.equal(none.status, 404);
  const world = await fetch(`${base}/api/export/world/series.csv`);
  assert.equal(world.status, 200);
});

test('panel builder: countries x figures as JSON and CSV; missing cells say why', async () => {
  const r = await fetch(`${base}/api/panel?countries=MEX,EGY&figures=policy_rate,yield_10y`);
  assert.equal(r.status, 200);
  const body = (await r.json()) as { cells: Array<{ iso3: string; figureId: string; status: string; value: number | null; reason: string }> };
  assert.equal(body.cells.length, 4);
  for (const c of body.cells) if (c.status === 'Missing') assert.ok(c.value === null && c.reason.length > 0);
  const hist = (await (await fetch(`${base}/api/panel?countries=MEX&figures=policy_rate&mode=history`)).json()) as { rowCount: number };
  assert.equal(typeof hist.rowCount, 'number');
  const csv = await fetch(`${base}/api/export/panel.csv?countries=MEX,EGY&figures=policy_rate`);
  assert.equal(csv.status, 200);
  assert.ok((await csv.text()).includes('iso3,country,figure_id,figure,value,unit,status,period,source,reason_if_missing'));
  assert.equal((await fetch(`${base}/api/panel?countries=`)).status, 400);
});

test('council: a country off the catalog can be pulled for one question; its figures start Missing', async () => {
  const r = await fetch(`${base}/api/data/watchlist-live?iso3=ARG,MEX,XXQ`);
  assert.equal(r.status, 200);
  const items = ((await r.json()) as { items: Array<{ iso3: string; countryName: string; debtToGdpPct: number | null }> }).items;
  const codes = items.map((i) => i.iso3).sort();
  assert.deepEqual(codes, ['ARG', 'MEX']);
  const arg = items.find((i) => i.iso3 === 'ARG')!;
  assert.equal(arg.countryName, 'Argentina');
  // Feeds are down in tests: no figure, never a stand-in.
  assert.ok(arg.debtToGdpPct === null || arg.debtToGdpPct === undefined);
});
