import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryPlatform, type FakeReply } from '../src/platform/memory';
import type { HttpRequest } from '../src/platform/types';
import { addPaidMapping, checkPaidMapping, loadPaidPoints, paidSeriesFor, paidVendor } from '../src/engine/paidData';
import { pullTradingEconomics, readTeSeries, teDate, teIsMarket, teKey, teRequest } from '../src/engine/tradingEconomics';
import { fetchSubscription, resetSubscriptionFetch } from '../src/server/routes/subscriptions';
import { checkConnections } from '../src/utils/connectionCheck';

/*
 * Hand-made replies shaped as Trading Economics' public API documentation shows them (read
 * 27 November 2026). No live call: the cloud cannot reach Trading Economics without a paid key.
 */

const NOW = Date.UTC(2026, 10, 27, 12);
const KEY = 'te-key-abcdef123';
const ENV = { PAID_DATA_VENDOR: 'tradingeconomics', TRADINGECONOMICS_API_KEY: KEY };
const GDP = { vendor: 'tradingeconomics', code: 'GHGDPYY', iso3: 'GHA', label: 'Ghana real GDP growth', unit: '% y/y', freq: 'quarterly' };
const IDX = { vendor: 'tradingeconomics', code: 'NGSEINDX:IND', iso3: 'NGA', label: 'Nigeria stock index', unit: 'index', freq: 'daily' };

const econ = (dt: string, v: number | null) => ({ Country: 'Ghana', Category: 'GDP Annual Growth Rate', DateTime: dt, Value: v, Frequency: 'Quarterly', HistoricalDataSymbol: 'GHGDPYY', LastUpdate: '2026-09-15T10:00:00' });
const market = (d: string, close: number) => ({ Symbol: 'NGSEINDX:IND', Date: d, Open: close, High: close, Low: close, Close: close });

function fakeTe(status = 200) {
  return (req: HttpRequest): FakeReply => {
    if (req.headers?.Authorization !== KEY || status === 401) return { status: 401, body: 'Unauthorized' };
    if (req.url.startsWith('https://api.tradingeconomics.com/historical/ticker/GHGDPYY/')) return { body: JSON.stringify([econ('2025-12-31T00:00:00', 5.4), econ('2026-03-31T00:00:00', null), econ('2026-06-30T00:00:00', 6.1)]) };
    if (req.url.startsWith('https://api.tradingeconomics.com/markets/historical/ngseindx%3Aind?')) return { body: JSON.stringify([market('24/11/2026', 101250.5), market('25/11/2026', 101900.25)]) };
    if (req.url.includes('/historical/ticker/NOPE/')) return { body: '[]' };
    return { status: 404 };
  };
}

beforeEach(() => resetSubscriptionFetch());

test('key, request addresses and dates: the key goes only in the header', () => {
  assert.equal(teKey({ TRADINGECONOMICS_API_KEY: '  ' }), null);
  assert.equal(teKey({ TRADINGECONOMICS_API_KEY: ' k1 ' }), 'k1');
  assert.deepEqual([teIsMarket('GHGDPYY'), teIsMarket('ngseindx:ind')], [false, true]);
  const econReq = teRequest('GHGDPYY', KEY);
  assert.equal(econReq.url, 'https://api.tradingeconomics.com/historical/ticker/GHGDPYY/1950-01-01?f=json');
  assert.equal(econReq.headers.Authorization, KEY);
  const mkt = teRequest('NGSEINDX:IND', KEY);
  assert.equal(mkt.url, 'https://api.tradingeconomics.com/markets/historical/ngseindx%3Aind?f=json&d1=2000-01-01');
  assert.doesNotMatch(econReq.url + mkt.url, new RegExp(KEY));
  assert.deepEqual([teDate('14/04/2026'), teDate('2020-12-31T00:00:00'), teDate('soon')], ['2026-04-14', '2020-12-31', null]);
});

test('replies: missing values skipped, never filled; empty and odd replies reported', () => {
  const q = readTeSeries('GHGDPYY', [econ('2025-12-31T00:00:00', 5.4), econ('2026-03-31T00:00:00', null), econ('2026-06-30T00:00:00', 6.1)], 'quarterly');
  assert.deepEqual(q, { points: [{ date: '2025-Q4', value: 5.4 }, { date: '2026-Q2', value: 6.1 }] });
  const d = readTeSeries('ngseindx:ind', [market('25/11/2026', 2), market('24/11/2026', 1)], 'daily');
  assert.deepEqual(d, { points: [{ date: '2026-11-24', value: 1 }, { date: '2026-11-25', value: 2 }] });
  // Two days in one month keep the later one.
  assert.deepEqual(readTeSeries('x:ind', [market('25/11/2026', 2), market('03/11/2026', 1)], 'monthly'), { points: [{ date: '2026-11', value: 2 }] });
  assert.match((readTeSeries('X', [], 'daily') as { error: string }).error, /no rows/);
  assert.match((readTeSeries('X', { Message: 'nope' }, 'daily') as { error: string }).error, /shape/);
  assert.match((readTeSeries('X', [econ('2026-01-01', null)], 'daily') as { error: string }).error, /no values/);
});

test('a pull reads each code once, saves what came back and keeps notes free of figures and the key', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeTe() });
  await addPaidMapping(platform, GDP);
  await addPaidMapping(platform, IDX);
  await addPaidMapping(platform, { ...GDP, code: 'NOPE', label: 'Nothing' });
  const pull = await pullTradingEconomics(platform, KEY, { gapMs: 0 });
  assert.equal(pull.ok, false);
  assert.equal(pull.note, 'Trading Economics: 2 of 3 mapped series read');
  assert.equal(platform.requests.length, 3);
  const notes = JSON.stringify(pull);
  assert.doesNotMatch(notes, new RegExp(`${KEY}|5\\.4|6\\.1|101250`));
  assert.match(notes, /GHGDPYY: 2 values, 2025-Q4 to 2026-Q2/);
  assert.match(notes, /NOPE: Trading Economics answered with no rows/);
  const [m] = (await paidSeriesFor(platform, 'GHA', paidVendor('tradingeconomics')!)).series;
  assert.equal(m!.source, 'Your subscription: Trading Economics, series GHGDPYY');
  assert.deepEqual(m!.points.at(-1), { date: '2026-Q2', value: 6.1 });
});

test('a refused key stops asking, and the last saved copy is kept', async () => {
  let refuse = false;
  const platform = createMemoryPlatform({ now: NOW, http: (req) => fakeTe(refuse ? 401 : 200)(req) });
  const saved = await addPaidMapping(platform, GDP);
  await addPaidMapping(platform, IDX);
  await pullTradingEconomics(platform, KEY, { gapMs: 0 });
  refuse = true;
  const before = platform.requests.length;
  const pull = await pullTradingEconomics(platform, KEY, { gapMs: 0 });
  assert.equal(platform.requests.length - before, 1);
  assert.deepEqual([pull.ok, pull.signedIn], [false, false]);
  assert.match(pull.note, /refused the API key \(HTTP 401\)/);
  assert.ok('saved' in saved && (await loadPaidPoints(platform, saved.saved))?.points.length === 2);
});

test('fetchSubscription: no key, then a real pull', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeTe() });
  await addPaidMapping(platform, GDP);
  const noKey = await fetchSubscription(platform, { PAID_DATA_VENDOR: 'tradingeconomics' });
  assert.equal(noKey.ok, false);
  assert.match(noKey.note, /API key is not set/);
  assert.equal(platform.requests.length, 0);
  const got = await fetchSubscription(platform, ENV);
  assert.deepEqual([got.ok, got.note], [true, 'Trading Economics: 1 of 1 mapped series read']);
});

test('connection check reads the first mapped series, showing counts only', async () => {
  const mapped = JSON.stringify({ mappings: [(checkPaidMapping(GDP, new Date()) as { mapping: object }).mapping] });
  const asFetch = (handler: (req: HttpRequest) => FakeReply) => async (url: string | URL | Request, init?: RequestInit) => {
    const reply = handler({ url: String(url), method: init?.method as never, headers: init?.headers as Record<string, string> });
    return new Response(reply.body ?? '', { status: reply.status ?? 200, headers: reply.headers });
  };
  const row = async (env: Record<string, string>, fetchFn = asFetch(fakeTe()), text: string | null = mapped) =>
    (await checkConnections({ env, only: ['paid_data'], paidMappingsText: () => text, fetchFn, now: new Date(NOW) })).results.find((r) => r.id === 'paid_data')!;
  const noKey = await row({ PAID_DATA_VENDOR: 'tradingeconomics' });
  assert.equal(noKey.state, 'needs_setup');
  assert.match(noKey.detail, /TRADINGECONOMICS_API_KEY is not set/);
  const good = await row(ENV);
  assert.equal(good.state, 'connected');
  assert.equal(good.sample, 'GHGDPYY: 2 values, 2025-Q4 to 2026-Q2 (figures not shown)');
  assert.doesNotMatch(JSON.stringify(good), new RegExp(`${KEY}|5\\.4|6\\.1`));
  const none = await row(ENV, asFetch(fakeTe()), null);
  assert.match(none.detail, /no series are mapped yet/);
  const wrong = await row(ENV, asFetch(fakeTe(401)));
  assert.equal(wrong.state, 'needs_setup');
  assert.match(wrong.detail, /refused the API key/);
});

test('CDS series cannot be mapped while CDS is hidden', () => {
  const now = new Date(NOW);
  for (const input of [{ ...IDX, code: 'GHANA5YCDS:GOV' }, { ...IDX, code: 'X', label: 'Ghana 5Y CDS' }, { ...IDX, code: 'X', label: 'credit default swap' }]) {
    const c = checkPaidMapping(input, now);
    assert.ok('problems' in c && c.problems.some((p) => /CDS/.test(p)), JSON.stringify(input));
  }
  // A code that merely contains the letters is fine.
  assert.ok('mapping' in checkPaidMapping({ ...IDX, code: 'ABCDSX:IND' }, now));
});

test('fetch notes have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  attachLanguage('pt', PT, PT_TEXT);
  const platform = createMemoryPlatform({ now: NOW, http: fakeTe(401) });
  await addPaidMapping(platform, GDP);
  const said = [
    (await fetchSubscription(platform, { PAID_DATA_VENDOR: 'tradingeconomics' })).note,
    (await fetchSubscription(platform, ENV)).note,
    'Trading Economics: 3 of 4 mapped series read',
    'Trading Economics: no series are mapped yet',
    'Credit default swap (CDS) series are hidden in this app for now, so they cannot be mapped.',
  ];
  for (const lang of ['es', 'fr', 'pt'] as const) assert.deepEqual(said.filter((x) => translateText(x, lang) === x), [], lang);
});
