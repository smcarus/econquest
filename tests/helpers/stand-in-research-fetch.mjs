/**
 * A stand-in research-tools server at http://standin-research.test/mcp, loaded into the server
 * under test after the feed helper (NODE_OPTIONS="--import <feeds> --import this"). It answers only
 * with replies built from the contract's examples (docs/contracts/research-tools.json):
 *   - initialize: the contract's first protocol version; tools/list: the contract's tools;
 *   - tools/call forecast_series: the GARCH example reply; anything else: a refusal naming the tool.
 * The token picks how it behaves, so one server run can try each case:
 *   ...-localonly  refuses calls that do not say X-Model-Location: local (compliance);
 *   ...-slow       never answers tools/call (the app's time limit runs out);
 *   ...-revoked    answers 401 Unknown or revoked key.
 * Every request is written to RESEARCH_STANDIN_LOG (one JSON line: method, tool, headers without
 * the token itself), so a test can check what was sent.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://standin-research.test';
const contract = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'contracts', 'research-tools.json'), 'utf8'));
const garch = contract.examples.find((e) => /GARCH/.test(e.what)).reply.result;
const log = process.env.RESEARCH_STANDIN_LOG || '';
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

const prev = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith(`${BASE}/`)) return prev(input, init);
  const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const body = JSON.parse(String(init.body || '{}'));
  const token = (headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (log) {
    const { authorization, ...rest } = headers;
    appendFileSync(log, `${JSON.stringify({ method: body.method, tool: body.params?.name, args: body.params?.arguments, bearer: Boolean(authorization), headers: rest })}\n`);
  }
  if (token.endsWith('-revoked')) return json(contract.refusals.json_api['401'], 401);
  if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (body.method === 'initialize') return json({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: contract.endpoints.mcp.protocol_versions[0], capabilities: { tools: {} }, serverInfo: { name: 'stand-in', version: '1' } } }, 200, { 'Mcp-Session-Id': 'standin-1' });
  if (body.method === 'tools/list') return json({ jsonrpc: '2.0', id: body.id, result: { tools: contract.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) } });
  if (body.method === 'tools/call') {
    if (token.endsWith('-slow')) {
      await new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    }
    if (token.endsWith('-localonly') && headers['x-model-location'] !== 'local') {
      return json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'Compliance limits council research to local models; this call said X-Model-Location: cloud' }], isError: true } });
    }
    const name = body.params?.name;
    const result = name === 'forecast_series' ? garch : { content: [{ type: 'text', text: `No recorded reply for ${name}` }], isError: true };
    return json({ jsonrpc: '2.0', id: body.id, result });
  }
  return json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
};
