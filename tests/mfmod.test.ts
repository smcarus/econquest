import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { hasMfmodModel, mfmodAsk, mfmodConfigFromEnv, mfmodStatus, type ServiceGet } from '../src/server/mfmod';
import { registerMfmodRoutes } from '../src/server/routes/mfmod';
import { checkConnections } from '../src/utils/connectionCheck';

const ON = { MFMOD_URL: 'http://mfmod:8765' };

function fakeService(routes: Record<string, { status: number; body: unknown } | Error>): { get: ServiceGet; asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    get: async (url) => {
      asked.push(url);
      const path = new URL(url).pathname + new URL(url).search;
      const r = routes[path];
      if (!r) return { status: 404, text: JSON.stringify({ error: 'Unknown call.' }) };
      if (r instanceof Error) throw r;
      return { status: r.status, text: typeof r.body === 'string' ? r.body : JSON.stringify(r.body) };
    },
  };
}

test('address: off when empty, this computer or the Docker service only', () => {
  assert.deepEqual(mfmodConfigFromEnv({}), { off: true });
  assert.deepEqual(mfmodConfigFromEnv({ MFMOD_URL: ' off ' }), { off: true });
  assert.deepEqual(mfmodConfigFromEnv(ON), { url: 'http://mfmod:8765' });
  assert.deepEqual(mfmodConfigFromEnv({ MFMOD_URL: 'http://localhost:8765/' }), { url: 'http://localhost:8765' });
  assert.deepEqual(mfmodConfigFromEnv({ MFMOD_URL: 'http://[::1]:8765' }), { url: 'http://[::1]:8765' });
  assert.ok('problem' in mfmodConfigFromEnv({ MFMOD_URL: 'http://example.com:8765' }));
  assert.ok('problem' in mfmodConfigFromEnv({ MFMOD_URL: 'ftp://localhost' }));
  assert.ok('problem' in mfmodConfigFromEnv({ MFMOD_URL: 'mfmod' }));
});

test('only the six public models are offered', () => {
  for (const c of ['BOL', 'HRV', 'IRQ', 'NPL', 'PAK', 'tur']) assert.ok(hasMfmodModel(c), c);
  for (const c of ['GHA', 'USA', '']) assert.equal(hasMfmodModel(c), false, c);
});

test('status: off, wrong address, no answer, no files, connected', async () => {
  assert.equal((await mfmodStatus({})).state, 'off');
  assert.equal((await mfmodStatus({ MFMOD_URL: 'http://example.com' })).state, 'needs_setup');
  const silent = fakeService({ '/health': Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }) });
  const s1 = await mfmodStatus(ON, silent.get);
  assert.equal(s1.state, 'no_answer');
  assert.match(s1.note, /docker compose --profile models/);
  const empty = fakeService({ '/health': { status: 200, body: { ok: true, modelflow: '2.97', models: [{ iso3: 'PAK', onDisk: false }] } } });
  assert.equal((await mfmodStatus(ON, empty.get)).state, 'needs_setup');
  const ready = fakeService({ '/health': { status: 200, body: { ok: true, modelflow: '2.97', models: [{ iso3: 'PAK', onDisk: true }, { iso3: 'TUR', onDisk: true }] } } });
  const s2 = await mfmodStatus(ON, ready.get);
  assert.equal(s2.state, 'connected');
  assert.equal(s2.onDisk, 2);
  assert.match(s2.note, /2 of 6 .*ModelFlow 2\.97/);
  assert.deepEqual(ready.asked, ['http://mfmod:8765/health']);
});

test('baseline: passed on with its source; unknown country never sent to the service', async () => {
  const body = { iso3: 'PAK', periods: ['2015', '2016'], projectedFrom: '2016', series: { real_gdp: { code: 'PAKNYGDPMKTPKN', values: [1, 2] } }, missing: ['cpi'] };
  const svc = fakeService({ '/baseline?iso3=PAK': { status: 200, body } });
  const r = await mfmodAsk(ON, 'baseline', 'pak', svc.get);
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
  assert.match(String(r.body.source), /World Bank MFMod/);
  assert.deepEqual(r.body.missing, ['cpi']);
  const none = await mfmodAsk(ON, 'baseline', 'GHA', svc.get);
  assert.equal(none.status, 404);
  assert.match(String(none.body.note), /not published a model for GHA/);
  assert.equal(svc.asked.length, 1);
  const off = await mfmodAsk({}, 'baseline', 'PAK', svc.get);
  assert.equal(off.body.on, false);
  const bad = await mfmodAsk(ON, 'models', undefined, fakeService({ '/models': { status: 200, body: 'not json' } }).get);
  assert.equal(bad.status, 502);
  const err = await mfmodAsk(ON, 'models', undefined, fakeService({ '/models': { status: 500, body: { error: 'model broke' } } }).get);
  assert.equal(err.body.note, 'model broke');
});

test('routes answer through the app', async () => {
  const svc = fakeService({
    '/health': { status: 200, body: { ok: true, modelflow: '2.97', models: [{ iso3: 'PAK', onDisk: true }] } },
    '/models': { status: 200, body: { models: [{ iso3: 'PAK', solveFrom: '2016', solveTo: '2030' }], problems: [] } },
  });
  const app = express();
  registerMfmodRoutes(app, { env: ON, get: svc.get });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const st = await (await fetch(`${base}/api/mfmod/status`)).json();
    assert.equal(st.state, 'connected');
    const models = await (await fetch(`${base}/api/mfmod/models`)).json();
    assert.equal(models.models[0].iso3, 'PAK');
    const r = await fetch(`${base}/api/mfmod/baseline?iso3=USA`);
    assert.equal(r.status, 404);
  } finally {
    server.close();
  }
});

test('connection check row: off by default, connected when the service answers', async () => {
  const off = await checkConnections({ env: {}, only: ['mfmod'] });
  assert.equal(off.results.find((r) => r.id === 'mfmod')?.state, 'off');
  const on = await checkConnections({
    env: ON,
    only: ['mfmod'],
    mfmodStatus: async () => ({ state: 'connected', note: '6 of 6 World Bank country models on this computer (ModelFlow 2.97).', url: 'http://mfmod:8765', onDisk: 6 }),
  });
  const row = on.results.find((r) => r.id === 'mfmod');
  assert.equal(row?.state, 'connected');
  assert.equal(row?.sample, '6 model files');
});
