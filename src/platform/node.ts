/**
 * The platform for the server on a computer (Node). Files live under the server's data folder,
 * web requests use Node's built-in fetch, and secrets are kept in a mode-600 file in the data
 * folder, encrypted with the server's master key when one is set (see src/utils/secretBox.ts).
 *
 * This is the only file in src/platform that may import Node modules; the phone gets its own
 * implementation in the app build.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import { hideKeysInFields, hideKeysInText, safeFileName, safeFolderName, safeSecretName } from './names';
import type { HttpRequest, HttpResponse, LogFields, Platform } from './types';

/** The server's key box (src/utils/secretBox.ts makes one); described here so this file stays strict. */
export interface KeyBox {
  encrypt(plain: string): string;
  decrypt(value: string): string | null;
}

export const DEFAULT_TIMEOUT_MS = 20_000;
/** Backups list the files they take by name, so this file is never in one. */
export const SECRETS_FILE = 'local/secrets.json';

export async function nodeRequest(req: HttpRequest, fetchImpl: typeof fetch = fetch): Promise<HttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  req.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const init: RequestInit = { method: req.method ?? 'GET', signal: controller.signal };
    if (req.headers) init.headers = req.headers;
    if (req.body !== undefined) init.body = req.body;
    const res = await fetchImpl(req.url, init);
    // Read the body now so the timeout also covers a reply that stalls half way.
    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => { headers[name.toLowerCase()] = value; });
    return {
      status: res.status,
      ok: res.ok,
      headers,
      url: res.url || req.url,
      text: async () => body,
      json: async <T>() => JSON.parse(body) as T,
    };
  } catch (error) {
    if (controller.signal.aborted && !req.signal?.aborted) {
      throw new Error(`No reply from ${new URL(req.url).host} within ${Math.round((req.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    req.signal?.removeEventListener('abort', onAbort);
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(file: string, text: string, mode?: number): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    await fsp.writeFile(tmp, text, mode === undefined ? undefined : { mode });
    await fsp.rename(tmp, file);
  } catch (error) {
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function walk(root: string, rel: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await fsp.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) await walk(root, child, out);
    else if (entry.isFile() && !entry.name.endsWith('.tmp')) out.push(child);
  }
}

export function createNodePlatform(options: {
  dataDir: string;
  secretBox?: KeyBox | null;
  fetchImpl?: typeof fetch;
  logLine?: (line: string) => void;
}): Platform {
  const root = path.resolve(options.dataDir);
  const box = options.secretBox ?? null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const write = options.logLine ?? ((line: string) => process.stderr.write(`${line}\n`));
  const full = (name: string) => path.join(root, safeFileName(name));
  const secretsPath = path.join(root, SECRETS_FILE);

  async function readSecrets(): Promise<Record<string, string>> {
    try {
      const parsed: unknown = JSON.parse(await fsp.readFile(secretsPath, 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  const log = (level: 'info' | 'warn' | 'error') => (message: string, fields?: LogFields) => {
    const safe = hideKeysInFields(fields);
    write(JSON.stringify({ time: new Date().toISOString(), level, message: hideKeysInText(message), ...(safe ?? {}) }));
  };

  return {
    kind: 'server',
    http: { request: (req) => nodeRequest(req, fetchImpl) },
    clock: { now: () => Date.now() },
    files: {
      async read(name) {
        try {
          return await fsp.readFile(full(name), 'utf8');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }
      },
      async write(name, text) { await writeAtomic(full(name), text, 0o600); },
      async append(name, text) {
        const file = full(name);
        await fsp.mkdir(path.dirname(file), { recursive: true });
        await fsp.appendFile(file, text, { mode: 0o600 });
      },
      async remove(name) { await fsp.rm(full(name), { force: true }); },
      async list(folder) {
        const base = safeFolderName(folder);
        const out: string[] = [];
        await walk(root, base, out);
        return out.sort();
      },
      async size(name) {
        const file = full(name);
        if (!(await exists(file))) return null;
        return (await fsp.stat(file)).size;
      },
    },
    secrets: {
      async get(name) {
        const value = (await readSecrets())[safeSecretName(name)];
        if (typeof value !== 'string') return null;
        if (value.startsWith('enc:')) return box ? box.decrypt(value) : null;
        return value;
      },
      async set(name, value) {
        const all = await readSecrets();
        all[safeSecretName(name)] = box ? box.encrypt(value) : value;
        await writeAtomic(secretsPath, JSON.stringify(all), 0o600);
      },
      async remove(name) {
        const all = await readSecrets();
        if (!(safeSecretName(name) in all)) return;
        delete all[name];
        await writeAtomic(secretsPath, JSON.stringify(all), 0o600);
      },
      async names() { return Object.keys(await readSecrets()).sort(); },
    },
    log: { info: log('info'), warn: log('warn'), error: log('error') },
  };
}
