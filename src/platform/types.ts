/**
 * The platform layer: the only door between the shared engine and the device it runs on.
 *
 * The engine (src/engine) holds the app's calculations, data-feed readers, stores and AI calls.
 * It runs in three places: the server on a computer, the phone app, and the tests. Each place
 * gives the engine one Platform object with the five services below, and the engine never reaches
 * past it. That is what lets one copy of the code serve the web version and the phone app.
 *
 * Rules every implementation keeps:
 * - files: names are relative to the app's own data folder ("local/watch-rules.json"); absolute
 *   paths and ".." are refused. Writes are crash-safe: a reader sees the old file or the new one,
 *   never half of each.
 * - secrets: API keys live here only. They are never written to a normal file, a backup or a log.
 * - log: anything that looks like a key is replaced with "[hidden]" before it is written.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface HttpRequest {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  /** Text body; JSON callers stringify first. */
  body?: string;
  /** Give up after this many milliseconds. Default 20 000. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  /** Header names in lower case. */
  headers: Record<string, string>;
  /** The final address after redirects. */
  url: string;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface PlatformHttp {
  /** Network failures and timeouts reject; HTTP error statuses resolve with ok: false. */
  request(req: HttpRequest): Promise<HttpResponse>;
}

export interface PlatformFiles {
  /** The file's text, or null when it does not exist. */
  read(name: string): Promise<string | null>;
  /** Crash-safe replace; creates folders as needed. */
  write(name: string, text: string): Promise<void>;
  /** Adds text to the end (used for .jsonl logs); creates the file when missing. */
  append(name: string, text: string): Promise<void>;
  /** Removing a file that does not exist is not an error. */
  remove(name: string): Promise<void>;
  /** File names (relative, with "/" separators) under a folder, sorted; [] when it does not exist. */
  list(folder: string): Promise<string[]>;
  /** Size in bytes, or null when the file does not exist. */
  size(name: string): Promise<number | null>;
}

export interface PlatformSecrets {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
  /** Names only, never values. */
  names(): Promise<string[]>;
}

export interface PlatformClock {
  /** Milliseconds since 1970, like Date.now(). */
  now(): number;
}

export type LogFields = Record<string, unknown>;

export interface PlatformLog {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export type PlatformKind = 'server' | 'phone' | 'test';

export interface Platform {
  kind: PlatformKind;
  http: PlatformHttp;
  files: PlatformFiles;
  secrets: PlatformSecrets;
  clock: PlatformClock;
  log: PlatformLog;
}
