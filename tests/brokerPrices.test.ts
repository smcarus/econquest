import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  brokerConfigFromEnv,
  checkGatewayUrl,
  ibkrSnapshotUrl,
  parseConids,
  parseIbkrSnapshot,
  readIbkrAuth,
  snapshotEmpty,
} from '../src/engine/brokerPrices';
import { brokerQuotes, brokerStatus, clearBrokerMemory, type GatewayGet } from '../src/server/brokerGateway';
import { apiKeyField } from '../src/data/apiKeyFields';
import { createMemoryPlatform } from '../src/platform/memory';

test('gateway address: this computer only, https, no path', () => {
  assert.deepEqual(checkGatewayUrl('https://localhost:5000/'), { url: 'https://localhost:5000' });
  assert.deepEqual(checkGatewayUrl('https://127.0.0.1:5000'), { url: 'https://127.0.0.1:5000' });
  assert.deepEqual(checkGatewayUrl('https://host.docker.internal:5000'), { url: 'https://host.docker.internal:5000' });
  assert.ok('error' in checkGatewayUrl('http://localhost:5000'));
  assert.ok('error' in checkGatewayUrl('https://example.com:5000'));
  assert.ok('error' in checkGatewayUrl('https://localhost:5000/v1/api'));
  assert.ok('error' in checkGatewayUrl('not a url'));
});

test('contracts: conid=label pairs, duplicates dropped, unreadable parts listed', () => {
  const r = parseConids('111=One, 222 = Two;111=Again\nbad, =x');
  assert.deepEqual(r.contracts, [{ conid: '111', label: 'One' }, { conid: '222', label: 'Two' }]);
  assert.deepEqual(r.problems, ['bad', '=x']);
  assert.equal(apiKeyField('IBKR_CONIDS')!.validate('111=One'), null);
  assert.match(apiKeyField('IBKR_CONIDS')!.validate('abc')!, /Could not read/);
  assert.equal(apiKeyField('IBKR_GATEWAY_URL')!.validate('https://localhost:5000'), null);
  assert.equal(apiKeyField('BROKER_PRICES')!.validate('ibkr'), null);
});

test('settings: off by default, problems named, ready config', () => {
  assert.deepEqual(brokerConfigFromEnv({}), { off: true });
  assert.deepEqual(brokerConfigFromEnv({ BROKER_PRICES: 'off' }), { off: true });
  assert.ok('problem' in brokerConfigFromEnv({ BROKER_PRICES: 'schwab' }));
  assert.match((brokerConfigFromEnv({ BROKER_PRICES: 'ibkr' }) as { problem: string }).problem, /no contracts/);
  const c = brokerConfigFromEnv({ BROKER_PRICES: 'ibkr', IBKR_CONIDS: '111=One' });
  assert.ok('config' in c && c.config.gateway === 'https://localhost:5000');
});

test('auth status and snapshot replies read as IBKR writes them', () => {
  assert.equal(readIbkrAuth(200, '{"authenticated":true,"connected":true,"competing":false}').signedIn, true);
  assert.equal(readIbkrAuth(200, '{"authenticated":false}').signedIn, false);
  assert.match(readIbkrAuth(200, '{"authenticated":true,"competing":true}').note, /Another IBKR session/);
  assert.equal(readIbkrAuth(401, '').signedIn, false);
  assert.match(ibkrSnapshotUrl('https://localhost:5000', ['1', '2']), /snapshot\?conids=1,2&fields=31,84,86,82,83,55,6509$/);
  const contracts = [{ conid: '1', label: 'A' }, { conid: '2', label: 'B' }, { conid: '3', label: 'C' }];
  const q = parseIbkrSnapshot(
    [
      { conid: 1, '31': '1.0812', '84': '1.0811', '86': '1.0813', '83': '0.12%', '55': 'EUR.USD', '6509': 'RpB', _updated: 1763900000000 },
      { conid: 2, '31': 'C101.5', '6509': 'DPB' },
    ],
    contracts
  );
  assert.equal(q[0].last, 1.0812);
  assert.equal(q[0].changePct, 0.12);
  assert.equal(q[0].availability, 'Live');
  assert.equal(q[0].updated, new Date(1763900000000).toISOString());
  assert.equal(q[1].last, 101.5);
  assert.equal(q[1].closePrice, true);
  assert.equal(q[1].availability, 'Delayed');
  assert.equal(q[2].last, null);
  assert.equal(snapshotEmpty(q), false);
  assert.equal(snapshotEmpty(parseIbkrSnapshot([{ conid: 1 }], contracts)), true);
});

function fakeGateway(opts: { signedIn?: boolean; firstEmpty?: boolean } = {}) {
  const calls: string[] = [];
  let snaps = 0;
  const get: GatewayGet = async (url, method = 'GET') => {
    calls.push(`${method} ${url}`);
    if (url.endsWith('/auth/status')) return { status: 200, text: JSON.stringify({ authenticated: opts.signedIn !== false, connected: true }) };
    snaps++;
    if (opts.firstEmpty && snaps === 1) return { status: 200, text: '[{"conid":111}]' };
    return { status: 200, text: '[{"conid":111,"31":"5.5","6509":"R"}]' };
  };
  return { get, calls };
}

test('quotes: asks the gateway, retries an empty first snapshot, holds 10 seconds in memory', async () => {
  clearBrokerMemory();
  const env = { BROKER_PRICES: 'ibkr', IBKR_CONIDS: '111=Mine' };
  const g = fakeGateway({ firstEmpty: true });
  const r = await brokerQuotes(env, { get: g.get, now: 1_000_000, retryMs: 0 });
  assert.equal(r.ready, true);
  assert.equal(r.quotes[0].last, 5.5);
  assert.equal(g.calls.filter((c) => c.includes('snapshot')).length, 2);
  const again = await brokerQuotes(env, { get: g.get, now: 1_005_000, retryMs: 0 });
  assert.equal(again, r);
  await brokerQuotes(env, { get: g.get, now: 1_011_000, retryMs: 0 });
  assert.equal(g.calls.filter((c) => c.includes('snapshot')).length, 3);
  clearBrokerMemory();
  const out = await brokerQuotes(env, { get: fakeGateway({ signedIn: false }).get, now: 2_000_000 });
  assert.equal(out.ready, false);
  assert.match(out.note, /nobody is signed in/);
  const off = await brokerQuotes({}, { get: g.get });
  assert.equal(off.on, false);
  const down = await brokerQuotes(env, { get: async () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5000')), now: 3_000_000 });
  assert.match(down.note, /Start the IBKR Client Portal Gateway/);
  assert.equal((await brokerStatus(env, fakeGateway().get)).state, 'connected');
  assert.equal((await brokerStatus({})).state, 'off');
});

test('route: prices only for this computer, never for a script, never cached, nothing written', async () => {
  clearBrokerMemory();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'broker-'));
  process.env.DATA_DIR = dir;
  const { registerSubscriptionRoutes } = await import('../src/server/routes/subscriptions');
  const platform = createMemoryPlatform();
  const env = { BROKER_PRICES: 'ibkr', IBKR_CONIDS: '111=Mine' };
  const app = express();
  registerSubscriptionRoutes(app, { platform, env, gatewayGet: fakeGateway().get, refuseRemoteChange: () => false, signedIn: () => null });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const r = await fetch(`${base}/api/broker/prices`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal((await r.json()).quotes[0].last, 5.5);
    const s = await fetch(`${base}/api/broker/prices`, { headers: { 'X-SMCR-API-Key': 'k' } });
    assert.equal(s.status, 403);
    assert.match((await s.json()).error, /shown on screen only/);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    server.close();
  }
});

test('broker prices never reach downloads, backups or the council: no other module reads them', () => {
  const src = path.join(process.cwd(), 'src');
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f.name) && /from '[^']*brokerGateway'|brokerQuotes\(|fetch\('\/api\/broker\/prices'/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(src, p));
    }
  };
  walk(src);
  assert.deepEqual(hits.sort(), ['components/BrokerPrices.tsx', 'server/brokerGateway.ts', 'server/routes/subscriptions.ts']);
  const gw = fs.readFileSync(path.join(src, 'server/brokerGateway.ts'), 'utf8');
  assert.doesNotMatch(gw, /writeFile|appendFile|appendAudit|files\.write/);
});
