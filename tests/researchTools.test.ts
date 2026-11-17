import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARGS_LINE_MAX,
  argsLine,
  auditSummary,
  contractCorrelationId,
  mcpEndpoint,
  modelLocation,
  PROTOCOL_VERSIONS,
  readCite,
  researchToolsConfig,
  ResearchToolsSession,
  rpcMessage,
  testConnection,
  type CallRecord,
} from '../src/server/researchTools.ts';
import { describeKeys, withKey } from '../src/utils/userSettings.ts';
import { describeRequest } from '../src/utils/auditLog.ts';
import { requiredRole } from '../src/utils/permissions.ts';
import { CONTRACT, standInServer } from './helpers/researchToolsServer.ts';

const ENV = { RESEARCH_TOOLS_URL: 'https://research.example.net:8443', RESEARCH_TOOLS_TOKEN: 'council-key-0123456789' };
const QID = 'q-mf2k9x-abc123';

function session(opts: Parameters<typeof standInServer>[0] = {}, env: Record<string, string> = ENV, location: 'local' | 'cloud' = 'local') {
  const server = standInServer(opts);
  const calls: CallRecord[] = [];
  const s = new ResearchToolsSession(researchToolsConfig(env)!, location, QID, { fetch: server.fetch, onCall: (r) => calls.push(r) });
  return { s, server, calls };
}

test('off by default: no address or no token means no config, so nothing is ever called', () => {
  assert.equal(researchToolsConfig({}), null);
  assert.equal(researchToolsConfig({ RESEARCH_TOOLS_URL: ENV.RESEARCH_TOOLS_URL }), null);
  assert.equal(researchToolsConfig({ RESEARCH_TOOLS_TOKEN: ENV.RESEARCH_TOOLS_TOKEN }), null);
  assert.equal(researchToolsConfig({ ...ENV, RESEARCH_TOOLS_URL: 'ftp://x' }), null);
  const c = researchToolsConfig(ENV)!;
  assert.equal(c.endpoint, 'https://research.example.net:8443/mcp');
  assert.equal(c.timeoutMs, 20000, 'time limit 20 s by default');
  assert.equal(c.maxCalls, 4, 'four tool calls per question by default');
  const set = researchToolsConfig({ ...ENV, RESEARCH_TOOLS_TIMEOUT_S: '5', RESEARCH_TOOLS_MAX_CALLS: '2' })!;
  assert.equal(set.timeoutMs, 5000);
  assert.equal(set.maxCalls, 2);
  assert.equal(researchToolsConfig({ ...ENV, RESEARCH_TOOLS_MAX_CALLS: '99' })!.maxCalls, 10, 'capped at 10');
  assert.equal(mcpEndpoint('https://h/mcp/'), 'https://h/mcp');
});

test('settings: four rows on the Research tools page; the token is masked and validated, the rest shown', () => {
  const rows = describeKeys({}, { apiKeys: { RESEARCH_TOOLS_URL: ENV.RESEARCH_TOOLS_URL, RESEARCH_TOOLS_TOKEN: ENV.RESEARCH_TOOLS_TOKEN } }).filter((k) => k.section === 'research');
  assert.deepEqual(rows.map((r) => r.id), ['RESEARCH_TOOLS_URL', 'RESEARCH_TOOLS_TOKEN', 'RESEARCH_TOOLS_TIMEOUT_S', 'RESEARCH_TOOLS_MAX_CALLS']);
  const token = rows.find((r) => r.id === 'RESEARCH_TOOLS_TOKEN')!;
  assert.equal(token.secret, true);
  assert.ok(!token.masked.includes('council-key'), 'never the token itself');
  assert.equal(rows.find((r) => r.id === 'RESEARCH_TOOLS_URL')!.masked, ENV.RESEARCH_TOOLS_URL);
  assert.ok('error' in withKey({ apiKeys: {} }, 'RESEARCH_TOOLS_URL', 'research.example.net'));
  assert.ok('error' in withKey({ apiKeys: {} }, 'RESEARCH_TOOLS_TIMEOUT_S', '0'));
  assert.ok('error' in withKey({ apiKeys: {} }, 'RESEARCH_TOOLS_MAX_CALLS', '11'));
  assert.ok('settings' in withKey({ apiKeys: {} }, 'RESEARCH_TOOLS_MAX_CALLS', '4'));
  assert.ok('error' in withKey({ apiKeys: {} }, 'RESEARCH_TOOLS_TOKEN', 'has space in it'));
  // Saving the token logs the setting's name only.
  assert.match(describeRequest('PUT', '/api/settings/keys/RESEARCH_TOOLS_TOKEN')!.summary, /not logged/);
});

test('every request sends the bearer token, the question id and where the model runs', async () => {
  const { s, server } = session();
  const r = await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch', horizon: 20 });
  assert.equal(r.ok, true);
  assert.deepEqual(server.seen.map((x) => x.method), ['initialize', 'notifications/initialized', 'tools/call']);
  for (const req of server.seen) {
    assert.equal(req.headers.authorization, `Bearer ${ENV.RESEARCH_TOOLS_TOKEN}`);
    assert.equal(req.headers['x-correlation-id'], QID);
    assert.equal(req.headers['x-model-location'], 'local');
  }
  const call = server.seen.at(-1)!;
  assert.equal(call.headers['mcp-protocol-version'], PROTOCOL_VERSIONS[0]);
  assert.equal(call.headers['mcp-session-id'], 'sess-test-1');
  assert.deepEqual(PROTOCOL_VERSIONS, CONTRACT.endpoints.mcp.protocol_versions, 'versions from the contract');
});

test('tools/list gives the tools this token can see', async () => {
  const { s, calls } = session();
  const r = await s.listTools();
  assert.ok('tools' in r);
  assert.deepEqual(r.tools.map((t) => t.name), CONTRACT.tools.map((t: { name: string }) => t.name));
  assert.ok(!r.tools.some((t) => t.name === 'create_paper_portfolio'), 'the council key cannot see paper portfolios');
  assert.deepEqual(calls.map((c) => [c.method, c.outcome, c.correlationId]), [['tools/list', 'ok', QID]]);
});

test('the GARCH example: figures, cite url, data-through date and the label come back as sent', async () => {
  const { s, calls } = session();
  const r = await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch', horizon: 20 });
  assert.equal(r.ok, true);
  assert.equal(r.data!.vol_annual_now, 0.142);
  assert.deepEqual(r.cite, {
    source: 'Fund console research tools',
    tool: 'forecast_series',
    id: 'FC0000000001',
    url: 'https://console.example.ts.net:8443/research/forecasts/FC0000000001',
    dataThrough: '2026-11-16',
    retrievedAt: '2026-11-17T12:00:00+00:00',
    label: 'Hypothetical, past performance; not a recommendation',
  });
  const rec = calls.find((c) => c.method === 'tools/call')!;
  assert.equal(rec.tool, 'forecast_series');
  assert.equal(rec.args, '{"ref":"USDBRL","model":"garch","horizon":20}');
  assert.equal(rec.outcome, 'ok');
  assert.equal(rec.citeId, 'FC0000000001');
});

test('the refusal example comes back as refused with the server\'s reason', async () => {
  const { s, calls } = session();
  const r = await s.callTool('create_paper_portfolio', {});
  assert.equal(r.ok, false);
  assert.equal(r.outcome, 'refused');
  assert.match(r.reason!, /Council keys can't start paper portfolios/);
  assert.equal(calls.at(-1)!.outcome, 'refused');
});

test('a server limited to local models refuses a cloud model, and says so', async () => {
  const { s } = session({ localOnly: true }, ENV, 'cloud');
  const r = await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch' });
  assert.equal(r.ok, false);
  assert.equal(r.localOnly, true);
  const local = session({ localOnly: true }, ENV, 'local');
  assert.equal((await local.s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch' })).ok, true);
});

test('no answer within the time limit: no_answer with the reason, never a throw', async () => {
  const { s, calls } = session({ slowCallMs: 5000 }, { ...ENV, RESEARCH_TOOLS_TIMEOUT_S: '1' });
  const r = await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch' });
  assert.equal(r.ok, false);
  assert.equal(r.outcome, 'no_answer');
  assert.match(r.reason!, /no answer within 1 seconds/);
  assert.equal(calls.at(-1)!.outcome, 'no_answer');
});

test('HTTP refusals from the contract: revoked key, too many calls, tools switched off', async () => {
  for (const [status, words] of [[401, /revoked/], [429, /Too many calls/], [503, /switched off/]] as const) {
    const { s, calls } = session({ httpStatus: status });
    const r = await s.listTools();
    assert.ok(!('tools' in r));
    assert.equal(r.outcome, 'refused');
    assert.match(r.reason!, words);
    assert.equal(calls[0].method, 'initialize', 'a failed opening is logged too');
  }
});

test('an event-stream reply is read like plain JSON', async () => {
  const { s } = session({ eventStream: true });
  const r = await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch' });
  assert.equal(r.ok, true);
  assert.equal(r.cite?.dataThrough, '2026-11-16');
  assert.equal(rpcMessage('data: {"id":3,"result":{}}\n\n', 'text/event-stream', 4), null);
});

test('a result without a labelled cite block is not used', () => {
  assert.equal(readCite({ value: 1 }), null);
  assert.equal(readCite({ cite: { url: 'https://x' } }), null);
  const c = readCite({ cite: { label: 'L', url: 'javascript:alert(1)', data_through: 'soon' } })!;
  assert.equal(c.url, null, 'only http(s) links');
  assert.equal(c.dataThrough, null, 'only YYYY-MM-DD');
});

test('audit lines: the arguments cut to one line, the outcome in words, never the token', async () => {
  const long = argsLine({ spec: { name: 'x'.repeat(400) } });
  assert.equal(long.length, ARGS_LINE_MAX);
  assert.ok(long.endsWith('…'));
  const { s, calls } = session();
  await s.listTools();
  await s.callTool('forecast_series', { ref: 'USDBRL', model: 'garch' });
  await s.callTool('create_paper_portfolio', {});
  assert.deepEqual(calls.map(auditSummary), ['Research tools listed: answered', 'Research tool forecast_series: answered', "Research tool create_paper_portfolio: refused (Council keys can't start paper portfolios; a person starts one on Research > Paper)"]);
  assert.ok(!JSON.stringify(calls).includes(ENV.RESEARCH_TOOLS_TOKEN));
  assert.equal(describeRequest('POST', '/api/research-tools/test'), null, 'the client logs each request itself');
});

test('correlation ids follow the contract (8 to 64 of A-Z a-z 0-9 - _ .), otherwise none is sent', async () => {
  assert.equal(contractCorrelationId(QID), QID);
  assert.equal(contractCorrelationId('short'), null);
  assert.equal(contractCorrelationId('has:colon-123'), null);
  const server = standInServer();
  const s = new ResearchToolsSession(researchToolsConfig(ENV)!, 'cloud', 'bad id!', { fetch: server.fetch });
  await s.listTools();
  assert.ok(server.seen.every((r) => !('x-correlation-id' in r.headers)));
  assert.ok(server.seen.every((r) => r.headers['x-model-location'] === 'cloud'));
  assert.equal(modelLocation(true), 'cloud');
  assert.equal(modelLocation(false), 'local');
});

test('Test connection lists the tools, or says why not', async () => {
  const off = await testConnection(null, 'local', { fetch: standInServer().fetch });
  assert.equal(off.ok, false);
  const on = await testConnection(researchToolsConfig(ENV), 'local', { fetch: standInServer().fetch });
  assert.ok(on.ok);
  assert.equal(on.tools.length, CONTRACT.tools.length);
  assert.equal(on.protocol, PROTOCOL_VERSIONS[0]);
  const down = await testConnection(researchToolsConfig(ENV), 'local', { fetch: standInServer({ httpStatus: 401 }).fetch });
  assert.equal(down.ok, false);
  assert.match(!down.ok ? down.reason : '', /^Research tools unavailable: Unknown or revoked key/);
  // Only an admin may run the test once sign-in is on.
  assert.equal(requiredRole('POST', '/api/research-tools/test'), 'admin');
  assert.equal(requiredRole('GET', '/api/research-tools/status'), 'viewer');
});

test('the messages the client and Test connection show have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang.ts');
  const lines = ['Research tools unavailable: no answer within 20 seconds', 'Research tools unavailable: the server could not be reached', 'Set the server address and the token first.', '6 tools this token can see.', 'Research tools unavailable: the server answered HTTP 500'];
  for (const [lang, mod] of [['es', '../src/i18n/es/index.ts'], ['fr', '../src/i18n/fr/index.ts'], ['pt', '../src/i18n/pt/index.ts']] as const) {
    const m = await import(mod);
    const up = lang.toUpperCase();
    attachLanguage(lang, m[up], m[`${up}_TEXT`]);
    for (const l of lines) {
      const out = translateText(l, lang);
      assert.notEqual(out, l, `${lang}: ${l}`);
      assert.ok(!/unavailable|seconds|could not/.test(out), `${lang} left English in: ${out}`);
    }
  }
});
