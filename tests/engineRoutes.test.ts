import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { checkRouteTable, dispatch, json, matchRoute, type Caller, type Route } from '../src/engine/routes';
import { ENGINE_ROUTES } from '../src/engine/routeTable';
import { WATCH_RULES_FILE_NAME } from '../src/engine/watchRules';
import { createMemoryPlatform } from '../src/platform/memory';
import { createNodePlatform } from '../src/platform/node';
import { mountEngineRoutes } from '../src/server/engineRoutes';
import { loadWatchRules as loadWatchRulesSync, watchRulesFilePath } from '../src/utils/watchRulesStore';

const here: Caller = { trusted: true, account: null, from: '127.0.0.1' };
const away: Caller = { trusted: false, account: null, from: '192.168.1.40' };
const rule = { id: 'r1', iso3: 'MEX', metric: 'cftc_percentile', op: '>=', value: 90, createdAt: '2026-11-08' };

test('routes match by method and path, with :name parts decoded', () => {
  const routes: Route[] = [
    { method: 'GET', path: '/api/things', handle: async () => json([]) },
    { method: 'GET', path: '/api/things/:id', handle: async (req) => json(req.params) },
  ];
  assert.equal(matchRoute(routes, 'GET', '/api/things')?.route, routes[0]);
  assert.deepEqual(matchRoute(routes, 'GET', '/api/things/a%20b')?.params, { id: 'a b' });
  assert.equal(matchRoute(routes, 'POST', '/api/things'), null);
  assert.equal(matchRoute(routes, 'GET', '/api/things/a/b'), null);
  assert.equal(matchRoute(routes, 'GET', '/api/things/%E0%A4%A'), null);
});

test('dispatch answers unknown addresses with 404 and failures with a plain 500, keys hidden', async () => {
  const platform = createMemoryPlatform();
  const boom: Route = { method: 'GET', path: '/api/boom', handle: async () => { throw new Error(`bad key AIza${'x'.repeat(30)}`); } };
  const miss = await dispatch([boom], { platform }, { method: 'GET', path: '/api/none', query: {}, body: undefined, caller: here });
  assert.equal(miss.status, 404);
  const out = await dispatch([boom], { platform }, { method: 'GET', path: '/api/boom', query: {}, body: undefined, caller: here });
  assert.equal(out.status, 500);
  assert.match(String((out.body as { error: string }).error), /bad key \[hidden\]/);
  assert.equal(platform.logLines[0]?.level, 'error');
  assert.ok(!JSON.stringify(platform.logLines).includes('AIza'));
});

test('the route table has no duplicate or non-/api routes', () => {
  assert.deepEqual(checkRouteTable(ENGINE_ROUTES), []);
  const dup: Route[] = [
    { method: 'GET', path: '/api/a/:id', handle: async () => json(1) },
    { method: 'GET', path: '/api/a/:key', handle: async () => json(2) },
    { method: 'GET', path: '/other', handle: async () => json(3) },
  ];
  assert.equal(checkRouteTable(dup).length, 2);
});

test('watch alerts: read, refuse changes from another computer, save and read back', async () => {
  const platform = createMemoryPlatform();
  const ask = (method: 'GET' | 'PUT', caller: Caller, body?: unknown) => dispatch(ENGINE_ROUTES, { platform }, { method, path: '/api/watch-rules', query: {}, body, caller });
  assert.deepEqual((await ask('GET', here)).body, { rules: [], file: 'data/local/watch-rules.json' });
  const refused = await ask('PUT', away, { rules: [rule] });
  assert.equal(refused.status, 403);
  assert.match(String((refused.body as { error: string }).error), /came from 192\.168\.1\.40/);
  assert.equal(platform.fileMap.size, 0);
  const saved = await ask('PUT', here, { rules: [rule, { iso3: 'bad' }] });
  assert.equal(saved.status, 200);
  assert.deepEqual((saved.body as { rules: unknown[] }).rules, [rule]);
  assert.deepEqual((await ask('GET', here)).body, { rules: [rule], file: 'data/local/watch-rules.json' });
  // A damaged file reads as no rules rather than failing.
  await platform.files.write(WATCH_RULES_FILE_NAME, '{not json');
  assert.deepEqual(((await ask('GET', here)).body as { rules: unknown[] }).rules, []);
});

test('the server saves watch alerts in the same file and format as before', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-routes-'));
  const platform = createNodePlatform({ dataDir: dir, logLine: () => undefined });
  await dispatch(ENGINE_ROUTES, { platform }, { method: 'PUT', path: '/api/watch-rules', query: {}, body: { rules: [rule] }, caller: here });
  assert.deepEqual(loadWatchRulesSync(watchRulesFilePath(dir)), [rule]);
});

test('the Express adapter serves engine routes with the caller the server works out', async () => {
  const platform = createMemoryPlatform();
  const app = express();
  app.use(express.json());
  mountEngineRoutes(app, ENGINE_ROUTES, { platform }, (req) => (req.get('x-test-remote') ? away : here));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const put = await fetch(`${base}/api/watch-rules`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rules: [rule] }) });
    assert.equal(put.status, 200);
    const refused = await fetch(`${base}/api/watch-rules`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-test-remote': '1' }, body: '{"rules":[]}' });
    assert.equal(refused.status, 403);
    const got = await (await fetch(`${base}/api/watch-rules`)).json();
    assert.deepEqual(got, { rules: [rule], file: 'data/local/watch-rules.json' });
  } finally {
    server.close();
  }
});
