import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryPlatform, type FakeReply } from '../src/platform/memory';
import type { HttpRequest } from '../src/platform/types';
import { addPaidMapping, checkPaidMapping, paidSeriesFor, paidVendor } from '../src/engine/paidData';
import { eodhdIsMacro, eodhdToken, eodhdUrl, pullEodhd, readEodhdSeries } from '../src/engine/eodhd';
import { fetchSubscription, resetSubscriptionFetch } from '../src/server/routes/subscriptions';
import { checkConnections } from '../src/utils/connectionCheck';

/*
 * Hand-made replies shaped as EODHD's public API documentation shows them (read 27 November
 * 2026). No live call: the cloud cannot reach EODHD with a paid token.
 */

const NOW = Date.UTC(2026, 10, 27, 12);
const TOKEN = 'eod-token-987xyz';
const ENV = { PAID_DATA_VENDOR: 'eodhd', EODHD_API_TOKEN: TOKEN };
const IDX = { vendor: 'eodhd', code: 'GSPC.INDX', iso3: 'USA', label: 'S&P 500', unit: 'index', freq: 'daily' };
const CPI = { vendor: 'eodhd', code: 'macro:inflation_consumer_prices_annual', iso3: 'KEN', label: 'Kenya inflation', unit: '% y/y', freq: 'annual' };

const eod = (date: string, close: number) => ({ date, open: close, high: close, low: close, close, adjusted_close: close, volume: 1000 });
const macro = (Date: string, Value: number | null) => ({ CountryCode: 'KEN', CountryName: 'Kenya', Indicator: 'Inflation, consumer prices (annual %)', Date, Period: 'Annual', Value });

function fakeEodhd(status = 200) {
  return (req: HttpRequest): FakeReply => {
    const u = new URL(req.url);
    if (u.searchParams.get('api_token') !== TOKEN || status === 401) return { status: 401, body: 'Unauthenticated' };
    if (status !== 200) return { status, body: 'no' };
    if (u.pathname === '/api/eod/GSPC.INDX') return { body: JSON.stringify([eod('2026-11-24', 6801.5), eod('2026-11-25', 6822.25)]) };
    if (u.pathname === '/api/macro-indicator/KEN' && u.searchParams.get('indicator') === 'inflation_consumer_prices_annual') return { body: JSON.stringify([macro('2025-12-31', 4.1), macro('2024-12-31', 4.5), macro('2023-12-31', null)]) };
    return { status: 404, body: 'Ticker Not Found.' };
  };
}

beforeEach(() => resetSubscriptionFetch());

test('token and addresses: daily prices and macro indicators for the mapped country', () => {
  assert.equal(eodhdToken({ EODHD_API_TOKEN: ' ' }), null);
  assert.deepEqual([eodhdIsMacro('GSPC.INDX'), eodhdIsMacro('macro:gdp_growth_annual')], [false, true]);
  assert.equal(eodhdUrl(IDX, 't'), 'https://eodhd.com/api/eod/GSPC.INDX?fmt=json&from=1990-01-01&api_token=t');
  assert.equal(eodhdUrl(CPI, 't'), 'https://eodhd.com/api/macro-indicator/KEN?indicator=inflation_consumer_prices_annual&fmt=json&api_token=t');
});

test('replies: macro rows come newest first and nulls are skipped, never filled', () => {
  assert.deepEqual(readEodhdSeries(CPI.code, [macro('2025-12-31', 4.1), macro('2024-12-31', 4.5), macro('2023-12-31', null)], 'annual'), {
    points: [{ date: '2024', value: 4.5 }, { date: '2025', value: 4.1 }],
  });
  assert.deepEqual(readEodhdSeries('GSPC.INDX', [eod('2026-11-24', 1), eod('2026-11-25', 2)], 'monthly'), { points: [{ date: '2026-11', value: 2 }] });
  assert.match((readEodhdSeries('X.US', [], 'daily') as { error: string }).error, /no rows/);
  assert.match((readEodhdSeries('X.US', 'Ticker Not Found.', 'daily') as { error: string }).error, /shape/);
});

test('a pull saves what came back and keeps notes free of figures and the token', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeEodhd() });
  await addPaidMapping(platform, IDX);
  await addPaidMapping(platform, CPI);
  await addPaidMapping(platform, { ...IDX, code: 'NOPE.INDX', label: 'Nothing' });
  const pull = await pullEodhd(platform, TOKEN, { gapMs: 0 });
  assert.equal(pull.note, 'EODHD: 2 of 3 mapped series read');
  const notes = JSON.stringify(pull);
  assert.doesNotMatch(notes, new RegExp(`${TOKEN}|6801|6822|4\\.1|4\\.5`));
  assert.match(notes, /NOPE\.INDX: EODHD does not know this code or country \(HTTP 404\)/);
  const [k] = (await paidSeriesFor(platform, 'KEN', paidVendor('eodhd')!)).series;
  assert.equal(k!.source, 'Your subscription: EODHD, series macro:inflation_consumer_prices_annual');
  assert.equal(k!.points.length, 2);
});

test('a refused token or a used-up day stops asking', async () => {
  for (const status of [401, 402]) {
    const platform = createMemoryPlatform({ now: NOW, http: fakeEodhd(status) });
    await addPaidMapping(platform, IDX);
    await addPaidMapping(platform, CPI);
    const pull = await pullEodhd(platform, TOKEN, { gapMs: 0 });
    assert.equal(platform.requests.length, 1, String(status));
    assert.equal(pull.ok, false);
    assert.equal(pull.steps.length, 2);
    assert.match(pull.steps[1]!.note, status === 401 ? /refused the API token/ : /allowance is used up/);
  }
});

test('a network error never repeats the token', async () => {
  const platform = createMemoryPlatform({
    now: NOW,
    http: (req) => {
      throw new Error(`could not reach ${req.url}`);
    },
  });
  await addPaidMapping(platform, IDX);
  const pull = await pullEodhd(platform, TOKEN, { gapMs: 0 });
  assert.doesNotMatch(JSON.stringify(pull), new RegExp(TOKEN));
});

test('fetchSubscription and the connection check', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeEodhd() });
  await addPaidMapping(platform, IDX);
  assert.match((await fetchSubscription(platform, { PAID_DATA_VENDOR: 'eodhd' })).note, /API token is not set/);
  assert.equal((await fetchSubscription(platform, ENV)).note, 'EODHD: 1 of 1 mapped series read');
  const mapped = JSON.stringify({ mappings: [(checkPaidMapping(IDX, new Date()) as { mapping: object }).mapping] });
  const asFetch = (handler: (req: HttpRequest) => FakeReply) => async (url: string | URL | Request, init?: RequestInit) => {
    const reply = handler({ url: String(url), headers: init?.headers as Record<string, string> });
    return new Response(reply.body ?? '', { status: reply.status ?? 200 });
  };
  const row = async (fetchFn = asFetch(fakeEodhd())) => (await checkConnections({ env: ENV, only: ['paid_data'], paidMappingsText: () => mapped, fetchFn, now: new Date(NOW) })).results.find((r) => r.id === 'paid_data')!;
  const good = await row();
  assert.equal(good.state, 'connected');
  assert.equal(good.sample, 'GSPC.INDX: 2 values, 2026-11-24 to 2026-11-25 (figures not shown)');
  assert.doesNotMatch(JSON.stringify(good), new RegExp(`${TOKEN}|6801|6822`));
  const wrong = await row(asFetch(fakeEodhd(401)));
  assert.equal(wrong.state, 'needs_setup');
  assert.doesNotMatch(JSON.stringify(wrong), new RegExp(TOKEN));
});

test('fetch notes have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  attachLanguage('pt', PT, PT_TEXT);
  const said = ['Your subscription is EODHD, but the API token is not set (Menu > Settings > Your subscriptions)', 'EODHD: 3 of 4 mapped series read', 'EODHD: no series are mapped yet', 'EODHD refused the API token (HTTP 401). Check it under Menu > Settings > Your subscriptions'];
  for (const lang of ['es', 'fr', 'pt'] as const) assert.deepEqual(said.filter((x) => translateText(x, lang) === x), [], lang);
});
