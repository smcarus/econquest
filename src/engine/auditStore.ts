/**
 * The audit log's storage, shared by the server and the phone: one entry per line in
 * local/audit/audit-log.jsonl, only ever appended to, plus a small head file recording the last
 * entry written so lines removed from the end are noticed too.
 *
 * Writes go one at a time through a queue, so entries keep their order and the chain stays whole
 * even when several requests log at once. Appending never throws: a log that cannot be written
 * must not stop the app answering.
 */
import type { Platform } from '../platform/types';
import { checkLog, nextEntry, type AuditCheck, type AuditEntry, type AuditInput } from './auditLog';

export const AUDIT_LOG_NAME = 'local/audit/audit-log.jsonl';
export const AUDIT_HEAD_NAME = 'local/audit/audit-head.json';

export interface AuditStore {
  /** Adds one entry; resolves to the entry, or null when it could not be written. */
  append(input: AuditInput, at?: Date): Promise<AuditEntry | null>;
  /** The whole log, checked. Waits for writes already queued. */
  read(): Promise<{ check: AuditCheck; entries: AuditEntry[] }>;
  /** The raw file, for the JSON Lines download. */
  raw(): Promise<string>;
}

type Last = Pick<AuditEntry, 'seq' | 'hash'> | null;

function lastWholeEntry(text: string): Last {
  const lines = text.split('\n').filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const e = JSON.parse(lines[i] ?? '') as Partial<AuditEntry>;
      if (Number.isInteger(e.seq) && typeof e.hash === 'string') return { seq: e.seq as number, hash: e.hash };
    } catch {
      // a cut-off last line: the check reports it; carry on from the last whole entry
    }
  }
  return null;
}

export function createAuditStore(platform: Platform, names: { log: string; head: string } = { log: AUDIT_LOG_NAME, head: AUDIT_HEAD_NAME }): AuditStore {
  let last: Last | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  /** Runs jobs one after another; a failed job does not stop later ones. */
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(job, job);
    queue = run.catch(() => undefined);
    return run;
  }

  async function readLog(): Promise<string> {
    return (await platform.files.read(names.log)) ?? '';
  }

  return {
    append(input, at = new Date()) {
      return enqueue(async () => {
        try {
          if (last === undefined) last = lastWholeEntry(await readLog());
          const entry = nextEntry(last, input, at);
          await platform.files.append(names.log, `${JSON.stringify(entry)}\n`);
          last = { seq: entry.seq, hash: entry.hash };
          await platform.files.write(names.head, JSON.stringify({ seq: entry.seq, hash: entry.hash, at: entry.at }));
          return entry;
        } catch (error) {
          // Read the file again next time rather than trust what is in memory.
          last = undefined;
          platform.log.error('Could not write the audit log', { error: error instanceof Error ? error.message : String(error) });
          return null;
        }
      });
    },
    read() {
      return enqueue(async () => {
        let head: { seq: number; hash: string } | null = null;
        try {
          const h = JSON.parse((await platform.files.read(names.head)) ?? 'null') as { seq?: unknown; hash?: unknown } | null;
          if (h && Number.isInteger(h.seq) && typeof h.hash === 'string') head = { seq: h.seq as number, hash: h.hash };
        } catch {
          head = null;
        }
        return checkLog((await readLog()).split('\n'), head);
      });
    },
    raw() {
      return enqueue(readLog);
    },
  };
}
