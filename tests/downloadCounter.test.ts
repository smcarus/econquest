import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { installDownloadCounter, isLocalUrl } from '../src/utils/downloadCounter.ts';

const reply = (body: string, headers: Record<string, string> = {}) => async () => new Response(body, { headers });

test('download counter: counts bodies from other computers as they are read, not this computer', async () => {
  const holder = { fetch: reply('x'.repeat(1000)) as unknown as typeof fetch };
  const c = installDownloadCounter(holder);
  const a = await holder.fetch('https://api.example.org/data');
  assert.equal((await a.text()).length, 1000);
  assert.equal(c.total(), 1000);
  await holder.fetch('https://api.example.org/unread'); // body never read: not counted
  assert.equal(c.total(), 1000);
  await (await holder.fetch('http://127.0.0.1:3000/api/nowcast/BRA')).text();
  await (await holder.fetch('http://localhost:3000/x')).text();
  assert.equal(c.total(), 1000);
  c.uninstall();
  await (await holder.fetch('https://api.example.org/after')).text();
  assert.equal(c.total(), 1000);
});

test('download counter: a compressed reply counts the size sent over the network', async () => {
  const raw = 'y'.repeat(50_000);
  const gz = zlib.gzipSync(raw);
  // The stand-in reply hands over the unpacked body, as fetch does, with the original headers.
  const holder = { fetch: reply(raw, { 'content-encoding': 'gzip', 'content-length': String(gz.length) }) as unknown as typeof fetch };
  const c = installDownloadCounter(holder);
  const r = await holder.fetch('https://api.example.org/big.csv');
  assert.equal((await r.text()).length, 50_000);
  assert.equal(c.total(), gz.length);
});

test('download counter: keeps status, headers and JSON reading working', async () => {
  const holder = { fetch: (async () => new Response(JSON.stringify({ ok: 1 }), { status: 201, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch };
  const c = installDownloadCounter(holder);
  const r = await holder.fetch(new URL('https://api.example.org/j'));
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('content-type'), 'application/json');
  assert.deepEqual(await r.json(), { ok: 1 });
  assert.equal(c.total(), 8);
  assert.equal(isLocalUrl('http://[::1]:3000/'), true);
  assert.equal(isLocalUrl('https://data.imf.org/'), false);
});
