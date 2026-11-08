/**
 * An in-memory platform for tests: files and secrets live in maps, the clock is set by hand, and
 * web requests go to a handler the test supplies (no network). Portable: no Node imports.
 */
import { hideKeysInFields, hideKeysInText, safeFileName, safeFolderName, safeSecretName } from './names';
import type { HttpRequest, HttpResponse, LogFields, Platform } from './types';

export type FakeReply = { status?: number; body?: string; headers?: Record<string, string> };
export type FakeHandler = (req: HttpRequest) => FakeReply | Promise<FakeReply>;

export type LogLine = { level: 'info' | 'warn' | 'error'; message: string; fields?: LogFields };

export interface MemoryPlatform extends Platform {
  /** What was written, for assertions. */
  readonly fileMap: Map<string, string>;
  readonly logLines: LogLine[];
  readonly requests: HttpRequest[];
  setNow(ms: number): void;
}

export function makeResponse(req: HttpRequest, reply: FakeReply): HttpResponse {
  const status = reply.status ?? 200;
  const body = reply.body ?? '';
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(reply.headers ?? {})) headers[k.toLowerCase()] = v;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    url: req.url,
    text: async () => body,
    json: async <T>() => JSON.parse(body) as T,
  };
}

export function createMemoryPlatform(options: {
  files?: Record<string, string>;
  secrets?: Record<string, string>;
  now?: number;
  http?: FakeHandler;
} = {}): MemoryPlatform {
  const fileMap = new Map<string, string>();
  for (const [name, text] of Object.entries(options.files ?? {})) fileMap.set(safeFileName(name), text);
  const secretMap = new Map<string, string>(Object.entries(options.secrets ?? {}));
  const logLines: LogLine[] = [];
  const requests: HttpRequest[] = [];
  let now = options.now ?? Date.UTC(2026, 0, 1);
  const handler: FakeHandler = options.http ?? (() => { throw new Error('No network in tests.'); });

  const log = (level: LogLine['level']) => (message: string, fields?: LogFields) => {
    const line: LogLine = { level, message: hideKeysInText(message) };
    const safe = hideKeysInFields(fields);
    if (safe) line.fields = safe;
    logLines.push(line);
  };

  return {
    kind: 'test',
    fileMap,
    logLines,
    requests,
    setNow(ms: number) { now = ms; },
    clock: { now: () => now },
    http: {
      async request(req) {
        requests.push(req);
        if (req.signal?.aborted) throw new Error('Request was cancelled.');
        return makeResponse(req, await handler(req));
      },
    },
    files: {
      async read(name) { return fileMap.get(safeFileName(name)) ?? null; },
      async write(name, text) { fileMap.set(safeFileName(name), text); },
      async append(name, text) {
        const key = safeFileName(name);
        fileMap.set(key, (fileMap.get(key) ?? '') + text);
      },
      async remove(name) { fileMap.delete(safeFileName(name)); },
      async list(folder) {
        const base = safeFolderName(folder);
        const prefix = base === '' ? '' : `${base}/`;
        return [...fileMap.keys()].filter((k) => k.startsWith(prefix)).sort();
      },
      async size(name) {
        const text = fileMap.get(safeFileName(name));
        return text === undefined ? null : new TextEncoder().encode(text).length;
      },
    },
    secrets: {
      async get(name) { return secretMap.get(safeSecretName(name)) ?? null; },
      async set(name, value) { secretMap.set(safeSecretName(name), value); },
      async remove(name) { secretMap.delete(safeSecretName(name)); },
      async names() { return [...secretMap.keys()].sort(); },
    },
    log: { info: log('info'), warn: log('warn'), error: log('error') },
  };
}
