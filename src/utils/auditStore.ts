/**
 * The audit log on the server: data/local/audit/audit-log.jsonl plus its head file. Storage and
 * the hash chain are the shared engine's (src/engine/auditStore.ts, src/engine/auditLog.ts); this
 * file keeps the server's way of calling them and adds the signed-in account to each entry.
 */
import path from 'path';
import { createAuditStore, type AuditStore } from '../engine/auditStore';
import { createNodePlatform } from '../platform/node';
import type { AuditActor, AuditCheck, AuditEntry, AuditInput } from './auditLog';

export interface AuditFiles {
  log: string;
  head: string;
}

export function auditFiles(dataDir: string): AuditFiles {
  const dir = path.join(dataDir, 'local', 'audit');
  return { log: path.join(dir, 'audit-log.jsonl'), head: path.join(dir, 'audit-head.json') };
}

/** One store per log file, so every write to a log goes through the same queue. */
const stores = new Map<string, AuditStore>();

function storeFor(files: AuditFiles): AuditStore {
  let store = stores.get(files.log);
  if (!store) {
    const root = path.dirname(files.log);
    const platform = createNodePlatform({ dataDir: root, logLine: (line) => console.error('[audit]', line) });
    store = createAuditStore(platform, { log: path.basename(files.log), head: path.relative(root, files.head) });
    stores.set(files.log, store);
  }
  return store;
}

/**
 * Who is acting right now, for entries that do not say: the server sets this to read the signed-in
 * account of the request being handled (AsyncLocalStorage), so every route's entry carries it.
 */
let currentActor: () => AuditActor | undefined = () => undefined;
export function setAuditActor(fn: () => AuditActor | undefined): void {
  currentActor = fn;
}

/**
 * Append one entry. Never throws or rejects: a log that cannot be written must not stop the app
 * answering. The account and time are taken now, before the write waits its turn.
 */
export function appendAudit(files: AuditFiles, input: AuditInput, at: Date = new Date()): Promise<AuditEntry | null> {
  const by = input.by ?? currentActor();
  return storeFor(files).append(by ? { ...input, by } : input, at);
}

export function readAudit(files: AuditFiles): Promise<{ check: AuditCheck; entries: AuditEntry[] }> {
  return storeFor(files).read();
}

/** The raw file, for the JSON Lines download. */
export function rawAudit(files: AuditFiles): Promise<string> {
  return storeFor(files).raw();
}

/** Tests only: forget the stores so the next call reads the files again. */
export function resetAuditCache(): void {
  stores.clear();
}
