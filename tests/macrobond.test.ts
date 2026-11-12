import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryPlatform, type FakeReply } from '../src/platform/memory';
import type { HttpRequest } from '../src/platform/types';
import { addPaidMapping, checkPaidMapping, loadPaidPoints, paidSeriesFor, paidVendor, savePaidPoints } from '../src/engine/paidData';
import {
  macrobondCredentials,
  macrobondFetchUrl,
  macrobondPeriod,
  macrobondTokenBody,
  MACROBOND_SCOPE,
  pullMacrobond,
  readMacrobondSeries,
  readMacrobondToken,
  resetMacrobondSession,
} from '../src/engine/macrobond';
import { fetchSubscription, resetSubscriptionFetch } from '../src/server/routes/subscriptions';
import { checkConnections } from '../src/utils/connectionCheck';

/*
 * Hand-made replies shaped as Macrobond's own open-source client (macrobond-data-api 3.0.4) reads
 * them. No live call: the cloud cannot reach Macrobond, and a live test needs a licence holder.
 */

const NOW = Date.UTC(2026, 10, 9, 12);
const CREDS = { clientId: 'client-id-1234', clientSecret: 'super-secret-value' };
const ENV = { PAID_DATA_VENDOR: 'macrobond', MACROBOND_CLIENT_ID: CREDS.clientId, MACROBOND_CLIENT_SECRET: CREDS.clientSecret };
const GDP = { vendor: 'macrobond', code: 'usgdp', iso3: 'USA', label: 'US real GDP', unit: '% y/y', freq: 'quarterly' };
const CPI = { vendor: 'macrobond', code: 'uscpi', iso3: 'USA', label: 'US prices', unit: 'index', freq: 'monthly' };
const TOKEN_URL = 'https://apiauth.macrobondfinancial.com/mbauth/connect/token';

const series = (dates: string[], values: (number | null)[]) => ({ dates, values, metadata: { Description: 'x' } });
const SERIES: Record<string, unknown> = {
  usgdp: series(['2025-10-01T00:00:00', '2026-01-01T00:00:00', '2026-04-01T00:00:00'], [1.9, null, 2.1]),
  uscpi: series(['2026-08-01', '2026-09-01'], [321.5, 322.25]),
  gone: { errorText: 'Series not found', errorCode: 404 },
};

/** A fake Macrobond: discovery, token, fetchseries. `token` sets the token reply. */
function fakeMacrobond(token: FakeReply = { body: JSON.stringify({ access_token: 'tok-abc', token_type: 'Bearer', expires_in: 3600 }) }) {
  return (req: HttpRequest): FakeReply => {
    if (req.url.endsWith('/.well-known/openid-configuration')) return { body: JSON.stringify({ token_endpoint: TOKEN_URL }) };
    if (req.url === TOKEN_URL) return token;
    if (req.url.startsWith('https://api.macrobondfinancial.com/v1/series/fetchseries?')) {
      if (req.headers?.Authorization !== 'Bearer tok-abc') return { status: 401 };
      const names = new URL(req.url).searchParams.getAll('n');
      return { body: JSON.stringify(names.map((n) => SERIES[n] ?? { errorText: 'Series not found', errorCode: 404 })) };
    }
    throw new Error(`unexpected ${req.url}`);
  };
}

beforeEach(() => {
  resetMacrobondSession();
  resetSubscriptionFetch();
});

test('credentials, token form and series address', () => {
  assert.equal(macrobondCredentials({ MACROBOND_CLIENT_ID: ' a ' }), null);
  assert.deepEqual(macrobondCredentials({ MACROBOND_CLIENT_ID: ' a ', MACROBOND_CLIENT_SECRET: 'b' }), { clientId: 'a', clientSecret: 'b' });
  const form = new URLSearchParams(macrobondTokenBody(CREDS));
  assert.deepEqual([form.get('grant_type'), form.get('client_id'), form.get('client_secret'), form.get('scope')], ['client_credentials', CREDS.clientId, CREDS.clientSecret, MACROBOND_SCOPE]);
  assert.equal(macrobondFetchUrl(['usgdp', 'a b']), 'https://api.macrobondfinancial.com/v1/series/fetchseries?n=usgdp&n=a%20b');
});

test('token replies: good, wrong credentials, too many, odd', () => {
  assert.deepEqual(readMacrobondToken(200, JSON.stringify({ access_token: 't', token_type: 'Bearer', expires_in: 60 }), NOW), { token: 't', expiresAt: NOW + 60_000 });
  assert.deepEqual(readMacrobondToken(200, JSON.stringify({ access_token: 't', expires_at: 2_000_000_000 }), NOW), { token: 't', expiresAt: 2_000_000_000_000 });
  const bad = readMacrobondToken(400, JSON.stringify({ error: 'invalid_client' }), NOW);
  assert.ok('error' in bad && bad.badCredentials);
  const busy = readMacrobondToken(429, '', NOW, '7');
  assert.ok('error' in busy && busy.retryAfter === 7);
  assert.ok('error' in readMacrobondToken(200, 'not json', NOW));
  assert.ok('error' in readMacrobondToken(200, JSON.stringify({ access_token: 't', token_type: 'mac', expires_in: 60 }), NOW));
  assert.ok('error' in readMacrobondToken(200, JSON.stringify({ access_token: 't' }), NOW));
  assert.ok('error' in readMacrobondToken(500, '', NOW));
});

test('dates become periods for the mapped frequency', () => {
  assert.equal(macrobondPeriod('2026-04-01T00:00:00', 'annual'), '2026');
  assert.equal(macrobondPeriod('2026-04-01T00:00:00', 'quarterly'), '2026-Q2');
  assert.equal(macrobondPeriod('2026-12-31', 'quarterly'), '2026-Q4');
  assert.equal(macrobondPeriod('2026-04-01', 'monthly'), '2026-04');
  assert.equal(macrobondPeriod('2026-04-03', 'weekly'), '2026-04-03');
  assert.equal(macrobondPeriod('soon', 'daily'), null);
});

test('series replies: missing values skipped, never filled; errors and odd shapes reported', () => {
  assert.deepEqual(readMacrobondSeries(SERIES.usgdp, 'quarterly'), { points: [{ date: '2025-Q4', value: 1.9 }, { date: '2026-Q2', value: 2.1 }] });
  // Two dates in one period: the later one is kept.
  assert.deepEqual(readMacrobondSeries(series(['2026-01-01', '2026-02-01'], [1, 2]), 'quarterly'), { points: [{ date: '2026-Q1', value: 2 }] });
  assert.match((readMacrobondSeries(SERIES.gone, 'monthly') as { error: string }).error, /Series not found \(code 404\)/);
  assert.ok('error' in readMacrobondSeries({ dates: ['2026-01-01'], values: [] }, 'monthly'));
  assert.ok('error' in readMacrobondSeries(series(['2026-01-01'], [null]), 'monthly'));
  assert.ok('error' in readMacrobondSeries(null, 'monthly'));
});

test('a pull signs in once, asks for each code once, saves what came back and keeps notes free of figures and secrets', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeMacrobond() });
  await addPaidMapping(platform, GDP);
  await addPaidMapping(platform, CPI);
  await addPaidMapping(platform, { ...GDP, iso3: 'WLD', label: 'Same code, another row' });
  await addPaidMapping(platform, { ...CPI, code: 'gone', label: 'Not there' });
  const pull = await pullMacrobond(platform, CREDS, { gapMs: 0 });
  assert.equal(pull.signedIn, true);
  assert.equal(pull.ok, false);
  assert.equal(pull.note, 'Signed in to Macrobond; 3 of 4 mapped series read');
  const fetches = platform.requests.filter((r) => r.url.includes('fetchseries'));
  assert.equal(fetches.length, 1);
  assert.deepEqual(new URL(fetches[0]!.url).searchParams.getAll('n').sort(), ['gone', 'uscpi', 'usgdp']);
  assert.deepEqual(pull.steps.map((s) => s.note).sort(), [
    'gone: Macrobond: Series not found (code 404)',
    'uscpi: 2 values, 2026-08 to 2026-09',
    'usgdp: 2 values, 2025-Q4 to 2026-Q2',
    'usgdp: 2 values, 2025-Q4 to 2026-Q2',
  ]);
  const text = JSON.stringify(pull);
  assert.doesNotMatch(text, /super-secret|client-id-1234|tok-abc|321\.5|2\.1\b/);
  // Saved on this computer, and shown as your subscription.
  const [m] = (await paidSeriesFor(platform, 'USA', paidVendor('macrobond')!)).series.filter((s) => s.id === 'paid_macrobond_usgdp_usa');
  assert.deepEqual(m!.points, [{ date: '2025-Q4', value: 1.9 }, { date: '2026-Q2', value: 2.1 }]);
  // The token is reused while it lasts: a second pull does not sign in again.
  const before = platform.requests.filter((r) => r.url === TOKEN_URL).length;
  await pullMacrobond(platform, CREDS, { gapMs: 0, onlyIds: ['paid_macrobond_uscpi_usa'] });
  assert.equal(platform.requests.filter((r) => r.url === TOKEN_URL).length, before);
});

test('wrong credentials: nothing fetched, the last saved copy kept, the note says what to check', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeMacrobond({ status: 400, body: JSON.stringify({ error: 'invalid_client' }) }) });
  const made = await addPaidMapping(platform, GDP);
  assert.ok('saved' in made);
  await savePaidPoints(platform, made.saved, [{ date: '2026-Q1', value: 2 }], '2026-11-01T00:00:00Z');
  const pull = await pullMacrobond(platform, CREDS, { gapMs: 0 });
  assert.deepEqual([pull.ok, pull.signedIn, pull.steps.length], [false, false, 0]);
  assert.match(pull.note, /refused the client ID and secret/);
  assert.equal(platform.requests.some((r) => r.url.includes('fetchseries')), false);
  assert.deepEqual((await loadPaidPoints(platform, made.saved))?.points, [{ date: '2026-Q1', value: 2 }]);
});

test('a refused or unreadable series reply keeps the last saved copy', async () => {
  const platform = createMemoryPlatform({
    now: NOW,
    http: (req) => (req.url.includes('fetchseries') ? { status: 403 } : fakeMacrobond()(req)),
  });
  await addPaidMapping(platform, GDP);
  const pull = await pullMacrobond(platform, CREDS, { gapMs: 0 });
  assert.equal(pull.ok, false);
  assert.match(pull.steps[0]!.note, /licence does not cover this request \(HTTP 403\); the last saved copy is kept/);
});

test('fetchSubscription: off, not built, no sign-in, then a real pull', async () => {
  const platform = createMemoryPlatform({ now: NOW, http: fakeMacrobond() });
  await addPaidMapping(platform, GDP);
  assert.deepEqual([(await fetchSubscription(platform, {})).skipped, (await fetchSubscription(platform, {})).note], [true, 'Your data subscription is off; nothing to fetch']);
  assert.match((await fetchSubscription(platform, { PAID_DATA_VENDOR: 'haver' })).note, /cannot fetch from Haver Analytics yet/);
  const noCreds = await fetchSubscription(platform, { PAID_DATA_VENDOR: 'macrobond' });
  assert.deepEqual([noCreds.ok, noCreds.skipped], [false, undefined]);
  assert.equal(platform.requests.length, 0);
  const got = await fetchSubscription(platform, ENV);
  assert.deepEqual([got.ok, got.note], [true, 'Signed in to Macrobond; 1 of 1 mapped series read']);
});

test('connection check signs in and reads the first mapped series, showing counts only', async () => {
  const mapped = JSON.stringify({ mappings: [(checkPaidMapping(GDP, new Date()) as { mapping: object }).mapping] });
  const asFetch = (handler: (req: HttpRequest) => FakeReply) => async (url: string | URL | Request, init?: RequestInit) => {
    const reply = handler({ url: String(url), method: init?.method as never, headers: init?.headers as Record<string, string>, body: init?.body as string });
    return new Response(reply.body ?? '', { status: reply.status ?? 200, headers: reply.headers });
  };
  const row = async (fetchFn: ReturnType<typeof asFetch>, text: string | null = mapped) =>
    (await checkConnections({ env: ENV, only: ['paid_data'], paidMappingsText: () => text, fetchFn, now: new Date(NOW) })).results.find((r) => r.id === 'paid_data')!;
  const good = await row(asFetch(fakeMacrobond()));
  assert.equal(good.state, 'connected');
  assert.equal(good.sample, 'usgdp: 2 values, 2025-Q4 to 2026-Q2 (figures not shown)');
  assert.doesNotMatch(JSON.stringify(good), /super-secret|client-id-1234|tok-abc|1\.9|2\.1\b/);
  const none = await row(asFetch(fakeMacrobond()), null);
  assert.equal(none.state, 'needs_setup');
  assert.match(none.detail, /no series are mapped yet/);
  const wrong = await row(asFetch(fakeMacrobond({ status: 400, body: JSON.stringify({ error: 'invalid_client' }) })));
  assert.equal(wrong.state, 'needs_setup');
  assert.match(wrong.detail, /refused the client ID and secret/);
});

test('fetch notes have Spanish and French', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  const platform = createMemoryPlatform({ now: NOW, http: fakeMacrobond({ status: 400, body: JSON.stringify({ error: 'invalid_client' }) }) });
  await addPaidMapping(platform, GDP);
  const said = [
    (await fetchSubscription(platform, {})).note,
    (await fetchSubscription(platform, { PAID_DATA_VENDOR: 'haver' })).note,
    (await fetchSubscription(platform, { PAID_DATA_VENDOR: 'macrobond' })).note,
    (await fetchSubscription(platform, ENV)).note,
    'Signed in to Macrobond; 3 of 4 mapped series read',
    'Signed in to Macrobond; no series are mapped yet',
  ];
  for (const lang of ['es', 'fr'] as const) assert.deepEqual(said.filter((x) => translateText(x, lang) === x), [], lang);
});
