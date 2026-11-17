/**
 * Outside research tools (research tools item 1): a small MCP client for a research-tools server
 * that a team runs itself (backtests, volatility and price forecasts, nowcasts, option prices).
 *
 * - Off by default. It is on only when both the server address and the token are set (Menu >
 *   Settings > Research tools, or RESEARCH_TOOLS_URL and RESEARCH_TOOLS_TOKEN in .env).
 * - Chat only: Council chat is the one caller. Scheduled council runs, the daily download, briefs,
 *   the pre-registered backtests, scores, badges and signals never call it.
 * - JSON-RPC 2.0 over HTTP POST to <address>/mcp: initialize, tools/list, tools/call, with a
 *   protocol version from the server's contract (docs/contracts/research-tools.json).
 * - Every request sends Authorization: Bearer <token>, X-Correlation-Id (the chat question's id)
 *   and X-Model-Location (local or cloud: where the model that will read the result runs).
 * - Each tools/list and tools/call goes in the audit log with the tool name, the correlation id and
 *   the outcome; the arguments are logged cut to one short line. The token is never logged.
 *
 * Server-only (reads the environment). Fetch is handed in so the tests replay recorded replies.
 */

/** Protocol versions the server's contract lists, newest first; the client asks for the first. */
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;
export const DEFAULT_TIMEOUT_S = 20;
export const DEFAULT_MAX_CALLS = 4;
/** Longest argument line kept in the audit log. */
export const ARGS_LINE_MAX = 160;
export const UNAVAILABLE = 'Research tools unavailable';

export interface ResearchToolsConfig {
  /** The MCP endpoint: the address as set, with /mcp added when it is not already there. */
  endpoint: string;
  token: string;
  timeoutMs: number;
  maxCalls: number;
}

const num = (raw: string | undefined, def: number, lo: number, hi: number) => {
  const v = Number(String(raw ?? '').trim());
  return String(raw ?? '').trim() && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : def;
};

/** The endpoint for a server address: <address>/mcp, unless the address already ends in /mcp. */
export function mcpEndpoint(address: string): string {
  const a = address.trim().replace(/\/+$/, '');
  return /\/mcp$/i.test(a) ? a : `${a}/mcp`;
}

/** The settings in use, or null when the feature is off (no address or no token). */
export function researchToolsConfig(env: Record<string, string | undefined>): ResearchToolsConfig | null {
  const url = (env.RESEARCH_TOOLS_URL || '').trim();
  const token = (env.RESEARCH_TOOLS_TOKEN || '').trim();
  if (!url || !token || !/^https?:\/\//i.test(url)) return null;
  return {
    endpoint: mcpEndpoint(url),
    token,
    timeoutMs: num(env.RESEARCH_TOOLS_TIMEOUT_S, DEFAULT_TIMEOUT_S, 1, 120) * 1000,
    maxCalls: num(env.RESEARCH_TOOLS_MAX_CALLS, DEFAULT_MAX_CALLS, 1, 10),
  };
}

export type ModelLocation = 'local' | 'cloud';

/**
 * Where the chat's model runs, for X-Model-Location. "cloud" whenever a step could reach a cloud
 * model (src/utils/aiCost.ts mayUseCloud: Google Gemini with a key set, which is also the fallback,
 * or an OpenAI-compatible server away from this computer); "local" otherwise.
 */
export function modelLocation(mayUseCloud: boolean): ModelLocation {
  return mayUseCloud ? 'cloud' : 'local';
}

/** The contract's correlation id: 8 to 64 of A-Z a-z 0-9 - _ . ; anything else is not sent. */
export function contractCorrelationId(id: string | undefined | null): string | null {
  const v = String(id ?? '').trim();
  return /^[A-Za-z0-9._-]{8,64}$/.test(v) ? v : null;
}

/** The arguments as one short line for the audit log. */
export function argsLine(args: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(args ?? {}) ?? '{}';
  } catch {
    s = '{}';
  }
  return s.length > ARGS_LINE_MAX ? `${s.slice(0, ARGS_LINE_MAX - 1)}…` : s;
}

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema?: unknown;
}

/** The cite block every successful result carries (contract "cite"). */
export interface ToolCite {
  source: string;
  tool: string;
  id: string | null;
  url: string | null;
  dataThrough: string | null;
  retrievedAt: string | null;
  label: string;
}

export type CallOutcome = 'ok' | 'refused' | 'no_answer' | 'bad_reply';

export interface ToolResult {
  ok: boolean;
  outcome: CallOutcome;
  /** The result's structured content (ok only). */
  data?: Record<string, unknown>;
  cite?: ToolCite;
  /** Why it failed, in the server's words where it gave some. */
  reason?: string;
  /** True when the server refused because only local models may read research results. */
  localOnly?: boolean;
}

/** One line per request for the audit log (the server writes it with appendAudit). */
export interface CallRecord {
  method: 'initialize' | 'tools/list' | 'tools/call';
  tool?: string;
  args?: string;
  correlationId: string | null;
  modelLocation: ModelLocation;
  outcome: CallOutcome;
  reason?: string;
  ms: number;
  citeId?: string | null;
}

export interface ClientDeps {
  fetch: typeof fetch;
  onCall?: (r: CallRecord) => void;
  now?: () => number;
}

const LOCAL_ONLY = /local model|only local|local only|X-Model-Location/i;

/** Reads the cite block; null when there is none or it lacks the label. */
export function readCite(data: unknown): ToolCite | null {
  const c = (data && typeof data === 'object' ? (data as Record<string, unknown>).cite : null) as Record<string, unknown> | null;
  if (!c || typeof c !== 'object') return null;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const label = str(c.label);
  if (!label) return null;
  return {
    source: str(c.source) || 'Outside research tools',
    tool: str(c.tool) || '',
    id: str(c.id),
    url: str(c.url) && /^https?:\/\//i.test(String(c.url)) ? String(c.url) : null,
    dataThrough: str(c.data_through) && /^\d{4}-\d{2}-\d{2}$/.test(String(c.data_through)) ? String(c.data_through) : null,
    retrievedAt: str(c.retrieved_at),
    label,
  };
}

/** The JSON-RPC message in a reply body: plain JSON, or the matching data line of an event stream. */
export function rpcMessage(body: string, contentType: string, id: number): Record<string, unknown> | null {
  const parse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  if (/text\/event-stream/i.test(contentType)) {
    let found: Record<string, unknown> | null = null;
    for (const event of body.split(/\r?\n\r?\n/)) {
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      const m = data ? parse(data) : null;
      if (m && m.id === id) found = m;
    }
    return found;
  }
  const m = parse(body);
  return Array.isArray(m) ? ((m as unknown[]).find((x) => (x as { id?: unknown })?.id === id) as Record<string, unknown>) ?? null : m;
}

/** The text a refusal or failed call gives, cut to one sentence-sized line. */
function textOf(result: Record<string, unknown> | undefined): string {
  const content = Array.isArray(result?.content) ? (result!.content as Array<Record<string, unknown>>) : [];
  return content
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => String(c.text))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/**
 * One conversation with the server for one Council chat question: initialize once, list the tools
 * the token can see, then call tools. Never throws: every failure comes back as a result.
 */
export class ResearchToolsSession {
  private nextId = 1;
  private sessionId: string | null = null;
  private protocol: string | null = null;
  private ready: Promise<ToolResult> | null = null;
  readonly correlationId: string | null;

  constructor(
    readonly config: ResearchToolsConfig,
    readonly location: ModelLocation,
    correlationId: string | null | undefined,
    private readonly deps: ClientDeps
  ) {
    this.correlationId = contractCorrelationId(correlationId);
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.config.token}`,
      'X-Model-Location': this.location,
      ...(this.correlationId ? { 'X-Correlation-Id': this.correlationId } : {}),
      ...(this.protocol ? { 'MCP-Protocol-Version': this.protocol } : {}),
      ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
    };
  }

  /** One JSON-RPC request; the reply's result, or a failed ToolResult. */
  private async rpc(method: string, params: Record<string, unknown>): Promise<{ result: Record<string, unknown> } | ToolResult> {
    const id = this.nextId++;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.config.timeoutMs);
    try {
      const res = await this.deps.fetch(this.config.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: ctl.signal,
      });
      const sid = res.headers.get('mcp-session-id');
      if (sid && !this.sessionId) this.sessionId = sid;
      const body = await res.text();
      if (!res.ok) {
        let reason = '';
        try {
          const j = JSON.parse(body);
          reason = String(j?.error?.message ?? j?.error ?? j?.message ?? '').slice(0, 300);
        } catch {
          reason = '';
        }
        const text = reason || `the server answered HTTP ${res.status}`;
        return { ok: false, outcome: res.status >= 500 && res.status !== 503 ? 'no_answer' : 'refused', reason: text, ...(LOCAL_ONLY.test(text) ? { localOnly: true } : {}) };
      }
      const msg = rpcMessage(body, res.headers.get('content-type') || '', id);
      if (!msg) return { ok: false, outcome: 'bad_reply', reason: 'the server sent a reply the app could not read' };
      if (msg.error) {
        const e = msg.error as Record<string, unknown>;
        const text = String(e?.message ?? 'the server refused the request').slice(0, 300);
        return { ok: false, outcome: 'refused', reason: text, ...(LOCAL_ONLY.test(text) ? { localOnly: true } : {}) };
      }
      const result = msg.result;
      if (!result || typeof result !== 'object') return { ok: false, outcome: 'bad_reply', reason: 'the reply had no result' };
      return { result: result as Record<string, unknown> };
    } catch (e) {
      const aborted = ctl.signal.aborted || (e as Error)?.name === 'AbortError';
      return { ok: false, outcome: 'no_answer', reason: aborted ? `no answer within ${Math.round(this.config.timeoutMs / 1000)} seconds` : 'the server could not be reached' };
    } finally {
      clearTimeout(timer);
    }
  }

  private record(r: Omit<CallRecord, 'correlationId' | 'modelLocation' | 'ms'>, started: number): void {
    const now = this.deps.now ?? Date.now;
    try {
      this.deps.onCall?.({ ...r, correlationId: this.correlationId, modelLocation: this.location, ms: Math.max(0, now() - started) });
    } catch {
      // the audit log is best effort; the call's own result still stands
    }
  }

  /** The protocol version agreed with the server, once the session is open. */
  protocolVersion(): string | null {
    return this.protocol;
  }

  /** Opens the session once (initialize, then the initialized notice). */
  initialize(): Promise<ToolResult> {
    if (!this.ready) this.ready = this.open();
    return this.ready;
  }

  private async open(): Promise<ToolResult> {
    const started = (this.deps.now ?? Date.now)();
    const r = await this.rpc('initialize', { protocolVersion: PROTOCOL_VERSIONS[0], capabilities: {}, clientInfo: { name: 'EconQuest', version: '1.0' } });
    if (!('result' in r)) {
      this.record({ method: 'initialize', outcome: r.outcome, reason: r.reason }, started);
      return r;
    }
    const version = String(r.result.protocolVersion ?? '');
    if (!(PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
      const fail: ToolResult = { ok: false, outcome: 'bad_reply', reason: `the server speaks protocol version "${version || 'none'}", which the app does not know` };
      this.record({ method: 'initialize', outcome: fail.outcome, reason: fail.reason }, started);
      return fail;
    }
    this.protocol = version;
    // The initialized notice has no reply worth reading; a failure here is not a failure of the session.
    try {
      await this.deps.fetch(this.config.endpoint, { method: 'POST', headers: this.headers(), body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(this.config.timeoutMs) });
    } catch {
      // ignored
    }
    return { ok: true, outcome: 'ok' };
  }

  /** The tools this token can see. */
  async listTools(): Promise<{ ok: true; tools: ToolInfo[] } | ToolResult> {
    const init = await this.initialize();
    if (!init.ok) return init;
    const started = (this.deps.now ?? Date.now)();
    const r = await this.rpc('tools/list', {});
    if (!('result' in r)) {
      this.record({ method: 'tools/list', outcome: r.outcome, reason: r.reason }, started);
      return r;
    }
    const raw = Array.isArray(r.result.tools) ? (r.result.tools as Array<Record<string, unknown>>) : null;
    if (!raw) {
      const fail: ToolResult = { ok: false, outcome: 'bad_reply', reason: 'the tool list was not readable' };
      this.record({ method: 'tools/list', outcome: fail.outcome, reason: fail.reason }, started);
      return fail;
    }
    const tools = raw
      .filter((t) => typeof t?.name === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(String(t.name)))
      .map((t) => ({ name: String(t.name), description: typeof t.description === 'string' ? t.description.slice(0, 600) : '', ...(t.inputSchema ? { inputSchema: t.inputSchema } : {}) }));
    this.record({ method: 'tools/list', outcome: 'ok' }, started);
    return { ok: true, tools };
  }

  /** Calls one tool; the result with its cite block, or the reason it failed. */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const init = await this.initialize();
    if (!init.ok) return init;
    const started = (this.deps.now ?? Date.now)();
    const line = argsLine(args);
    const r = await this.rpc('tools/call', { name, arguments: args });
    if (!('result' in r)) {
      this.record({ method: 'tools/call', tool: name, args: line, outcome: r.outcome, reason: r.reason }, started);
      return r;
    }
    if (r.result.isError === true) {
      const reason = textOf(r.result) || 'the server refused the call';
      const out: ToolResult = { ok: false, outcome: 'refused', reason, ...(LOCAL_ONLY.test(reason) ? { localOnly: true } : {}) };
      this.record({ method: 'tools/call', tool: name, args: line, outcome: out.outcome, reason }, started);
      return out;
    }
    let data = r.result.structuredContent as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') {
      // Older servers put the JSON in the text block only.
      try {
        const parsed = JSON.parse(textOf(r.result) || 'null');
        data = parsed && typeof parsed === 'object' ? parsed : undefined;
      } catch {
        data = undefined;
      }
    }
    const cite = data ? readCite(data) : null;
    if (!data || !cite) {
      const out: ToolResult = { ok: false, outcome: 'bad_reply', reason: 'the result had no cite block with a label, so none of its figures are used' };
      this.record({ method: 'tools/call', tool: name, args: line, outcome: out.outcome, reason: out.reason }, started);
      return out;
    }
    this.record({ method: 'tools/call', tool: name, args: line, outcome: 'ok', citeId: cite.id }, started);
    return { ok: true, outcome: 'ok', data, cite };
  }
}

/** A short line for the audit log entry of one request. */
export function auditSummary(r: CallRecord): string {
  const what = r.method === 'tools/call' ? `Research tool ${r.tool}` : r.method === 'tools/list' ? 'Research tools listed' : 'Research tools server opened';
  return r.outcome === 'ok' ? `${what}: answered` : `${what}: ${r.outcome.replace('_', ' ')}${r.reason ? ` (${r.reason.slice(0, 160)})` : ''}`;
}

/** Test connection: the tools the token can see, or why the server did not answer. */
export async function testConnection(config: ResearchToolsConfig | null, location: ModelLocation, deps: ClientDeps, correlationId?: string): Promise<{ ok: true; endpoint: string; protocol: string; tools: ToolInfo[] } | { ok: false; reason: string; endpoint?: string }> {
  if (!config) return { ok: false, reason: 'Set the server address and the token first.' };
  const s = new ResearchToolsSession(config, location, correlationId ?? null, deps);
  const r = await s.listTools();
  if ('tools' in r) return { ok: true, endpoint: config.endpoint, protocol: s.protocolVersion() || '', tools: r.tools };
  return { ok: false, reason: `${UNAVAILABLE}: ${r.reason || r.outcome}`, endpoint: config.endpoint };
}
