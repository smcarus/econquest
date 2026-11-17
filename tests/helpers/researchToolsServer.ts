/**
 * A stand-in research-tools server for the tests, answering only with replies built from the
 * contract's examples (docs/contracts/research-tools.json). There is no live server in CI.
 *
 * - initialize: the contract's first protocol version, and a session id.
 * - tools/list: the contract's tools (the council key's list).
 * - tools/call forecast_series: the contract's GARCH example reply (id echoed).
 * - tools/call create_paper_portfolio: the contract's refusal example.
 * - anything else: a refusal naming the tool.
 * Options make it refuse cloud models, answer slowly, or fail with an HTTP status.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const CONTRACT = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '..', 'docs', 'contracts', 'research-tools.json'), 'utf8'));

export interface SeenRequest {
  method: string;
  name?: string;
  args?: unknown;
  headers: Record<string, string>;
}

export interface StandInOptions {
  /** Refuse every tools/call that does not come with X-Model-Location: local. */
  localOnly?: boolean;
  /** Wait this long before answering tools/call (ms), so a short time limit runs out. */
  slowCallMs?: number;
  /** Answer every request with this HTTP status and the contract's JSON API error body. */
  httpStatus?: number;
  /** Answer tools/call as an event stream instead of plain JSON. */
  eventStream?: boolean;
  /** Extra replies by tool name: a structuredContent object (with its cite block). */
  results?: Record<string, Record<string, unknown>>;
}

const example = (what: RegExp) => CONTRACT.examples.find((e: { what: string }) => what.test(e.what));

export function standInServer(opts: StandInOptions = {}) {
  const seen: SeenRequest[] = [];
  const fetchFn = (async (_url: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(Object.entries((init?.headers || {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), String(v)]));
    const body = JSON.parse(String(init?.body || '{}'));
    seen.push({ method: body.method, ...(body.params?.name ? { name: body.params.name, args: body.params.arguments } : {}), headers });
    const json = (v: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...extra } });
    if (opts.httpStatus) {
      const bodies = CONTRACT.refusals.json_api;
      return json(bodies[String(opts.httpStatus)] ?? { error: 'Server error' }, opts.httpStatus);
    }
    if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (body.method === 'initialize') {
      return json({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: CONTRACT.endpoints.mcp.protocol_versions[0], capabilities: { tools: {} }, serverInfo: { name: 'stand-in research tools', version: '1' }, instructions: CONTRACT.instructions } }, 200, { 'mcp-session-id': 'sess-test-1' });
    }
    if (body.method === 'tools/list') {
      return json({ jsonrpc: '2.0', id: body.id, result: { tools: CONTRACT.tools.map((t: { name: string; description: string; inputSchema: unknown }) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) } });
    }
    if (body.method === 'tools/call') {
      if (opts.slowCallMs) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, opts.slowCallMs);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        });
      }
      const name = body.params?.name;
      if (opts.localOnly && headers['x-model-location'] !== 'local') {
        return json({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'Compliance limits council research to local models; this call said X-Model-Location: cloud' }], isError: true } });
      }
      let result: unknown;
      if (opts.results?.[name]) result = { content: [{ type: 'text', text: JSON.stringify(opts.results[name]) }], structuredContent: opts.results[name], isError: false };
      else if (name === 'forecast_series') result = example(/GARCH/).reply.result;
      else if (name === 'create_paper_portfolio') result = example(/paper portfolio/).reply.result;
      else result = { content: [{ type: 'text', text: `No recorded reply for ${name}` }], isError: true };
      const msg = { jsonrpc: '2.0', id: body.id, result };
      if (opts.eventStream) return new Response(`event: message\ndata: ${JSON.stringify(msg)}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      return json(msg);
    }
    return json({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
  }) as typeof fetch;
  return { fetch: fetchFn, seen };
}
