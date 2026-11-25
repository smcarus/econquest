/**
 * Outside research tools on the real server (research tools item 1), with the stand-in research
 * server built from the contract's examples (tests/helpers/stand-in-research-fetch.mjs) and every
 * other outside call failing as if offline.
 *
 * Off by default: with no address and token, the status says off. Once both are saved in Settings,
 * Test connection lists the tools the token can see, the key test on the token row says Connected,
 * and the audit log holds each request with its outcome, but never the token.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTRACT } from './helpers/researchToolsServer.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 6300 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const TOKEN = 'council-key-for-tests-0001';
let server: ChildProcess | undefined;
let work = '';
let log = '';
let standin = '';

before(async () => {
  work = mkdtempSync(path.join(tmpdir(), 'econquest-research-tools-'));
  const dataDir = path.join(work, 'data');
  mkdirSync(path.join(dataDir, 'local'), { recursive: true });
  standin = path.join(work, 'research.jsonl');
  const helpers = ['offline-fetch.mjs', 'stand-in-research-fetch.mjs'].map((h) => `--import ${pathToFileURL(path.join(root, 'tests/helpers', h)).href}`).join(' ');
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: helpers, RESEARCH_STANDIN_LOG: standin, NODE_ENV: 'production', PORT: String(port), DATA_DIR: dataDir, SCHEDULE_BACKTESTS: 'off', GEMINI_API_KEY: '', RESEARCH_TOOLS_URL: '', RESEARCH_TOOLS_TOKEN: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 120_000; // slow shared CI machines can take over a minute
  for (;;) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/healthz`)).ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`server did not start within 120s:\n${log}`);
    await new Promise((r) => setTimeout(r, 300));
  }
});

after(() => {
  server?.kill();
  if (work) rmSync(work, { recursive: true, force: true });
});

const send = (method: string, p: string, body?: unknown) => fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const requests = () => (existsSync(standin) ? readFileSync(standin, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

test('off by default, then on once the address and token are saved; Test connection lists the tools; the audit log has each request but not the token', { timeout: 120_000 }, async () => {
  assert.deepEqual(await (await fetch(`${base}/api/research-tools/status`)).json(), { enabled: false });
  const off = await (await send('POST', '/api/research-tools/test', {})).json();
  assert.equal(off.ok, false);
  assert.equal(requests().length, 0, 'nothing is sent while the feature is off');

  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_URL', { value: 'http://standin-research.test' })).status, 200);
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN', { value: TOKEN })).status, 200);
  const status = await (await fetch(`${base}/api/research-tools/status`)).json();
  assert.deepEqual(status, { enabled: true, maxCalls: 4, timeoutS: 20 });
  assert.ok(!JSON.stringify(status).includes(TOKEN));

  const r = await (await send('POST', '/api/research-tools/test', {})).json();
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.tools.map((t: { name: string }) => t.name), CONTRACT.tools.map((t: { name: string }) => t.name));
  assert.equal(r.endpoint, 'http://standin-research.test/mcp');
  const sent = requests();
  assert.deepEqual(sent.map((x) => x.method), ['initialize', 'notifications/initialized', 'tools/list']);
  assert.ok(sent.every((x) => x.bearer && x.headers['x-model-location'] === 'local'), 'bearer token on every request; no cloud model is set up, so local');

  // The key test on the token row says Connected and names the tools.
  const keyTest = await (await send('POST', '/api/settings/keys/RESEARCH_TOOLS_TOKEN/test', {})).json();
  assert.equal(keyTest.check.state, 'connected');
  assert.match(keyTest.check.sample, /forecast_series/);

  const audit = await (await fetch(`${base}/api/audit?kind=research_tools`)).json();
  assert.ok(audit.entries.length >= 2, JSON.stringify(audit.entries));
  assert.ok(audit.entries.every((e: { summary: string; detail: { outcome: string } }) => /^Research tools listed: answered$/.test(e.summary) && e.detail.outcome === 'ok'));
  const raw = readFileSync(path.join(work, 'data', 'local', 'audit', 'audit-log.jsonl'), 'utf8');
  assert.ok(!raw.includes(TOKEN), 'the token never reaches the audit log');
});

test('a revoked token: Test connection says Research tools unavailable with the reason', { timeout: 60_000 }, async () => {
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN', { value: `${TOKEN}-revoked` })).status, 200);
  const r = await (await send('POST', '/api/research-tools/test', {})).json();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Research tools unavailable: Unknown or revoked key');
  const audit = await (await fetch(`${base}/api/audit?kind=research_tools`)).json();
  assert.match(audit.entries[0].summary, /Research tools server opened: refused \(Unknown or revoked key\)/);
});

const QID = 'q-brl-vol-0001';
const ask = (question: string, body: Record<string, unknown> = {}) =>
  fetch(`${base}/api/council/quant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': QID },
    body: JSON.stringify({ question, why: 'the question mentions "volatility"', questionId: QID, countries: [{ iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL' }], currencies: ['BRL', 'USD'], ...body }),
  }).then((r) => r.json());

test('Quant desk: "What\'s the 20-day volatility forecast for BRL?" quotes only the reply\'s figures, with its link and label; the audit log has the call under the question\'s id', { timeout: 60_000 }, async () => {
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN', { value: TOKEN })).status, 200);
  const before = requests().length;
  const { answer } = await ask("What's the 20-day volatility forecast for BRL?");
  assert.equal(answer.id, 'quant');
  assert.equal(answer.name, 'Quant desk');
  assert.equal(answer.findings.length, 1, JSON.stringify(answer));
  const garch = CONTRACT.examples.find((e: { what: string }) => /GARCH/.test(e.what)).reply.result;
  const cite = garch.structuredContent.cite;
  const f = answer.findings[0];
  assert.ok(f.figures.length > 0);
  for (const g of f.figures) {
    assert.equal(g.url, cite.url);
    assert.ok(g.source.includes(`data through ${cite.data_through}`));
    assert.ok(g.source.endsWith(cite.label));
  }
  assert.ok(f.reading.includes(cite.label));
  assert.doesNotMatch(JSON.stringify(answer), /\b(buy|sell)\b/i);
  const calls = requests().slice(before).filter((x) => x.method === 'tools/call');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tool, 'forecast_series');
  assert.equal(calls[0].headers['x-correlation-id'], QID);
  assert.equal(calls[0].headers['x-model-location'], 'local');
  const audit = await (await fetch(`${base}/api/audit?kind=research_tools`)).json();
  const call = audit.entries.find((e: { summary: string }) => e.summary === 'Research tool forecast_series: answered');
  assert.ok(call, JSON.stringify(audit.entries.slice(0, 3)));
  assert.equal(call.correlationId, QID);
  assert.equal(call.detail.tool, 'forecast_series');
  assert.ok(String(call.detail.args).length <= 160);
});

test('Quant desk: a local-only refusal shows its reason and leaves the desk out; a timed-out call shows Research tools unavailable', { timeout: 60_000 }, async () => {
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN', { value: `${TOKEN}-localonly` })).status, 200);
  const cloud = { providerMode: 'openai_compatible', openAiBaseUrl: 'https://models.example.net/v1' };
  const refused = (await ask("What's the 20-day volatility forecast for BRL?", { runtimeConfig: cloud })).answer;
  assert.deepEqual(refused.findings, []);
  assert.ok(refused.missing.some((m: string) => /Compliance limits council research to local models/.test(m)), JSON.stringify(refused.missing));

  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TIMEOUT_S', { value: '1' })).status, 200);
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN', { value: `${TOKEN}-slow` })).status, 200);
  const slow = (await ask("What's the 20-day volatility forecast for BRL?")).answer;
  assert.deepEqual(slow.findings, []);
  assert.ok(slow.missing.some((m: string) => /^Research tools unavailable: /.test(m)), JSON.stringify(slow.missing));
  assert.equal((await send('PUT', '/api/settings/keys/RESEARCH_TOOLS_TIMEOUT_S', { value: '20' })).status, 200);
});
