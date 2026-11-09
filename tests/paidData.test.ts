import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createMemoryPlatform } from '../src/platform/memory';
import {
  addPaidMapping,
  checkPaidMapping,
  clearPaidMemory,
  isPaidSource,
  listPaidMappings,
  loadPaidPoints,
  paidSeriesFor,
  paidVendor,
  paidVendorFromEnv,
  paidWithheldRows,
  PAID_MAPPINGS_FILE,
  PAID_VENDORS,
  PAID_WITHHELD,
  PAID_WITHHELD_REASON,
  removePaidMapping,
  savePaidPoints,
  withholdPaidRows,
  type PaidVendor,
} from '../src/engine/paidData';
import { SERIES_HEADER, FIGURES_HEADER } from '../src/utils/csvExport';
import { withholdForSharing } from '../src/utils/shareMode';
import { checkConnections } from '../src/utils/connectionCheck';
import { API_KEY_FIELDS } from '../src/data/apiKeyFields';
import { isCountryIso3 } from '../src/data/iso3166';

const GDP = { vendor: 'macrobond', code: 'usgdp', iso3: 'USA', label: 'US real GDP', unit: '% y/y', freq: 'quarterly' };
/** The frame with an adapter, as G5 will make it: tests only. */
const built = (id: string): PaidVendor => ({ ...paidVendor(id)!, adapterBuilt: true });

test('off by default: no vendor unless the switch names one', () => {
  assert.equal(paidVendorFromEnv({}), null);
  assert.equal(paidVendorFromEnv({ PAID_DATA_VENDOR: 'off' }), null);
  assert.equal(paidVendorFromEnv({ PAID_DATA_VENDOR: 'bloomberg' }), null);
  assert.equal(paidVendorFromEnv({ PAID_DATA_VENDOR: 'Macrobond' })?.name, 'Macrobond');
  // The frame ships no adapter: every vendor says which change will add it.
  assert.deepEqual(PAID_VENDORS.map((v) => [v.id, v.adapterBuilt, v.plannedIn]), [
    ['macrobond', false, 'G5'],
    ['haver', false, 'G14'],
    ['moodys', false, 'G15'],
  ]);
  assert.equal(paidVendor('moodys')?.memoryOnly, true);
  // The switch and the sign-in details are settings like the other keys, on their own page.
  const ids = API_KEY_FIELDS.filter((f) => f.section === 'subscription').map((f) => [f.id, f.secret !== false]);
  assert.deepEqual(ids, [
    ['PAID_DATA_VENDOR', false],
    ['MACROBOND_CLIENT_ID', true],
    ['MACROBOND_CLIENT_SECRET', true],
  ]);
});

test('a mapping needs a vendor, a code with no spaces, a real country, a label, a unit and a frequency', () => {
  const now = new Date('2026-11-09T00:00:00Z');
  const ok = checkPaidMapping(GDP, now);
  assert.ok('mapping' in ok);
  assert.deepEqual([ok.mapping.id, ok.mapping.vendor, ok.mapping.code, ok.mapping.iso3], ['paid_macrobond_usgdp_usa', 'macrobond', 'usgdp', 'USA']);
  const world = checkPaidMapping({ ...GDP, code: 'brent@dly', iso3: 'wld' }, now, isCountryIso3);
  assert.ok('mapping' in world && world.mapping.id === 'paid_macrobond_brent-dly_wld');
  const bad = checkPaidMapping({ vendor: 'bloomberg', code: 'us gdp', iso3: 'XYZ', label: '', unit: '', freq: 'hourly' }, now, isCountryIso3);
  assert.ok('problems' in bad);
  assert.equal(bad.problems.length, 6);
});

test('mappings are kept with codes and labels only; adding twice and removing are handled', async () => {
  const platform = createMemoryPlatform();
  const a = await addPaidMapping(platform, GDP);
  assert.ok('saved' in a);
  const again = await addPaidMapping(platform, GDP);
  assert.ok('problems' in again && /already mapped/.test(again.problems[0]));
  assert.equal((await listPaidMappings(platform)).length, 1);
  const file = platform.fileMap.get(PAID_MAPPINGS_FILE)!;
  assert.match(file, /usgdp/);
  assert.equal(await removePaidMapping(platform, 'paid_macrobond_nope_usa'), null);
  assert.equal((await removePaidMapping(platform, a.saved.id))?.code, 'usgdp');
  assert.equal((await listPaidMappings(platform)).length, 0);
});

test('until the vendor adapter exists, a mapped series reads Missing with that reason', async () => {
  const platform = createMemoryPlatform();
  await addPaidMapping(platform, GDP);
  assert.deepEqual(await paidSeriesFor(platform, 'USA', null), { series: [], missing: [] });
  const got = await paidSeriesFor(platform, 'USA', paidVendor('macrobond')!);
  assert.equal(got.series.length, 0);
  assert.equal(got.missing[0].label, 'US real GDP (Your subscription: Macrobond)');
  assert.match(got.missing[0].reason, /cannot fetch from Macrobond yet: that part is planned as data plan change G5/);
  // Another country, or another vendor switched on: nothing.
  assert.equal((await paidSeriesFor(platform, 'BRA', paidVendor('macrobond')!)).missing.length, 0);
  assert.equal((await paidSeriesFor(platform, 'USA', paidVendor('haver')!)).missing.length, 0);
});

test('figures an adapter saves show labelled as your subscription; a memory-only vendor never writes them', async () => {
  const platform = createMemoryPlatform();
  const m = await addPaidMapping(platform, GDP);
  assert.ok('saved' in m);
  const v = built('macrobond');
  assert.match((await paidSeriesFor(platform, 'USA', v)).missing[0].reason, /Not fetched from your Macrobond subscription yet/);
  await savePaidPoints(platform, m.saved, [{ date: '2026-Q2', value: 2.1 }, { date: '2026-Q3', value: Number.NaN }], '2026-11-09T01:00:00Z');
  const got = await paidSeriesFor(platform, 'USA', v);
  assert.equal(got.series.length, 1);
  const s = got.series[0];
  assert.deepEqual([s.source, s.unit, s.freq, s.paid, s.points], ['Your subscription: Macrobond, series usgdp', '% y/y', 'quarterly', true, [{ date: '2026-Q2', value: 2.1 }]]);
  assert.ok(isPaidSource(s.source));

  clearPaidMemory();
  const mood = await addPaidMapping(platform, { ...GDP, vendor: 'moodys', code: 'FGDP$.IUSA' });
  assert.ok('saved' in mood);
  const before = platform.fileMap.size;
  await savePaidPoints(platform, mood.saved, [{ date: '2026-Q2', value: 2 }], '2026-11-09T01:00:00Z');
  assert.equal(platform.fileMap.size, before, 'memory-only figures are not written');
  assert.equal((await loadPaidPoints(platform, mood.saved))?.points.length, 1);
  clearPaidMemory();
  assert.match((await paidSeriesFor(platform, 'USA', built('moodys'))).missing[0].reason, /since the app started \(held in memory only, never saved\)/);
  // Removing a mapping removes what was saved for it.
  await removePaidMapping(platform, m.saved.id);
  assert.equal([...platform.fileMap.keys()].some((k) => k.includes('paid_macrobond_usgdp_usa.json')), false);
});

test('every download withholds subscription figures, sharing mode or not', () => {
  const rows = [
    ['USA', 'gdp', 'GDP', '%', 'quarterly', '2026-Q2', 1.9, 'World Bank', '', ''],
    ['USA', 'paid_macrobond_usgdp_usa', 'US real GDP (Your subscription: Macrobond)', '% y/y', 'quarterly', '2026-Q2', 2.1, 'Your subscription: Macrobond, series usgdp', '', ''],
  ];
  const out = withholdPaidRows(SERIES_HEADER, rows);
  assert.equal(out[0][6], 1.9);
  assert.equal(out[1][6], PAID_WITHHELD);
  assert.doesNotMatch(JSON.stringify(out), /2\.1/);
  // A table with a status column says so there, with the reason.
  const fig = FIGURES_HEADER.map((h) => (h === 'value' ? 7 : h === 'source' ? 'Your subscription: Macrobond, series x' : h === 'status' ? 'ok' : ''));
  const held = withholdPaidRows(FIGURES_HEADER, [fig])[0];
  assert.equal(held[FIGURES_HEADER.indexOf('value')], null);
  assert.equal(held[FIGURES_HEADER.indexOf('status')], 'Withheld');
  assert.equal(held[FIGURES_HEADER.indexOf('reason_if_missing')], PAID_WITHHELD_REASON);
  // Sharing mode on top changes nothing for them.
  assert.doesNotMatch(JSON.stringify(withholdForSharing(SERIES_HEADER, out)), /2\.1/);
});

test('a series download names each mapped series as withheld, with no figures', () => {
  const m = checkPaidMapping(GDP, new Date('2026-11-09T00:00:00Z'));
  assert.ok('mapping' in m);
  assert.deepEqual(paidWithheldRows(SERIES_HEADER, 'USA', [m.mapping], null), []);
  const [row] = paidWithheldRows(SERIES_HEADER, 'USA', [m.mapping], paidVendor('macrobond')!);
  const cell = (h: string) => row[SERIES_HEADER.indexOf(h)];
  assert.deepEqual([cell('series_id'), cell('value'), cell('source'), cell('date')], ['paid_macrobond_usgdp_usa', PAID_WITHHELD, 'Your subscription: Macrobond, series usgdp', null]);
  assert.deepEqual(paidWithheldRows(SERIES_HEADER, 'BRA', [m.mapping], paidVendor('macrobond')!), []);
});

test('connection check: off, sign-in missing, adapter not built; never a sign-in detail', async () => {
  const row = async (env: Record<string, string>, text: string | null = null) =>
    (await checkConnections({ env, only: ['paid_data'], paidMappingsText: () => text })).results.find((r) => r.id === 'paid_data')!;
  assert.equal((await row({})).state, 'off');
  assert.equal((await row({ PAID_DATA_VENDOR: 'bloomberg' })).state, 'needs_setup');
  assert.match((await row({ PAID_DATA_VENDOR: 'macrobond' })).detail, /MACROBOND_CLIENT_ID and MACROBOND_CLIENT_SECRET are not set/);
  const mapped = JSON.stringify({ mappings: [(checkPaidMapping(GDP, new Date()) as { mapping: object }).mapping] });
  const r = await row({ PAID_DATA_VENDOR: 'macrobond', MACROBOND_CLIENT_ID: 'client-id-1234', MACROBOND_CLIENT_SECRET: 'super-secret-value' }, mapped);
  assert.equal(r.state, 'needs_setup');
  assert.match(r.detail, /1 series mapped.*planned as data plan change G5/);
  assert.doesNotMatch(JSON.stringify(r), /super-secret|client-id-1234/);
});

test('routes: only this computer sees the list status; changes are audited without figures or secrets; viewers refused', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paid-'));
  process.env.DATA_DIR = dir;
  const { registerSubscriptionRoutes, paidVisibleTo } = await import('../src/server/routes/subscriptions');
  const platform = createMemoryPlatform();
  let role: 'admin' | 'viewer' = 'admin';
  const env: Record<string, string | undefined> = { PAID_DATA_VENDOR: 'macrobond', MACROBOND_CLIENT_SECRET: 'super-secret-value' };
  const app = express();
  app.use(express.json());
  registerSubscriptionRoutes(app, { platform, env, refuseRemoteChange: () => false, signedIn: () => ({ id: 'u1', username: 'sam', name: 'Sam', role }) as never });
  app.get('/visible', (req, res) => res.json({ visible: paidVisibleTo(req, env) }));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (body: unknown) => fetch(`${base}/api/subscriptions/mappings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const empty = await (await fetch(`${base}/api/subscriptions`)).json();
    assert.deepEqual([empty.on, empty.vendor.name, empty.vendor.adapterBuilt, empty.mappings.length, empty.thisComputer], [true, 'Macrobond', false, 0, true]);
    role = 'viewer';
    assert.equal((await post(GDP)).status, 403);
    role = 'admin';
    assert.equal((await post({ ...GDP, code: '' })).status, 400);
    const saved = (await (await post(GDP)).json()).saved;
    const list = await (await fetch(`${base}/api/subscriptions`)).json();
    assert.equal(list.mappings[0].status.startsWith('The app cannot fetch from Macrobond yet'), true);
    assert.equal(list.mappings[0].count, 0);
    // A script sending the data API key never counts as this computer's screens.
    assert.equal((await (await fetch(`${base}/visible`)).json()).visible, true);
    assert.equal((await (await fetch(`${base}/visible`, { headers: { 'X-SMCR-API-Key': 'k' } })).json()).visible, false);
    assert.equal((await fetch(`${base}/api/subscriptions/mappings/${saved.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await fetch(`${base}/api/subscriptions/mappings/${saved.id}`, { method: 'DELETE' })).status, 404);
    const audit = fs.readFileSync(path.join(dir, 'local', 'audit', 'audit-log.jsonl'), 'utf8');
    assert.deepEqual(audit.trim().split('\n').map((l) => JSON.parse(l).kind), ['paid_data', 'paid_data']);
    assert.doesNotMatch(audit, /super-secret/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('reasons, statuses and form problems have Spanish and French', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  const bad = checkPaidMapping({ vendor: 'x', code: 'a b', iso3: 'XYZ', label: '', unit: '', freq: 'x' }, new Date(), isCountryIso3);
  assert.ok('problems' in bad);
  const platform = createMemoryPlatform();
  await addPaidMapping(platform, GDP);
  const reason = (await paidSeriesFor(platform, 'USA', paidVendor('macrobond')!)).missing[0].reason;
  const said = [...bad.problems, reason, PAID_WITHHELD_REASON, 'Not fetched from your Macrobond subscription yet', 'Not in use: your subscription is off', 'Ready'];
  for (const lang of ['es', 'fr'] as const) assert.deepEqual(said.filter((x) => translateText(x, lang) === x), [], lang);
});
