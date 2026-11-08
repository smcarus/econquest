/**
 * The audit log's hash chain, shared by the server and the phone (see src/utils/auditLog.ts for
 * what the log is for and what it never holds). Each entry is chained to the one before it by a
 * SHA-256 hash, so a line changed or removed after it was written shows up when the log is checked.
 */
import { sha256Hex } from './sha256';

export type AuditKind = 'council' | 'research' | 'export' | 'settings' | 'data' | 'model' | 'workspace' | 'audit' | 'validation' | 'signoff' | 'access' | 'idea' | 'own_data';

export const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  council: 'Council answer',
  research: 'Saved research',
  export: 'Download',
  settings: 'Settings',
  data: 'Data',
  model: 'AI model',
  workspace: 'Holdings and lists',
  audit: 'Audit log',
  validation: 'Validation',
  signoff: 'Sign-off',
  access: 'Sign-in and accounts',
  idea: 'Trade idea',
  own_data: 'Your data',
};

export interface AuditFigure {
  iso3: string;
  agent: string;
  label: string;
  value: string;
  /** Source as the agent showed it, with the period (e.g. "IMF IL, Sep 2026"). */
  source: string;
  tag: string;
}

/** Who did it: the signed-in account. Absent while sign-in is off (one user, no accounts). */
export interface AuditActor {
  id: string;
  username: string;
  name: string;
}

export interface AuditInput {
  kind: AuditKind;
  by?: AuditActor;
  /** One line in plain words, e.g. 'Council answer: "Is Brazil debt sustainable?"'. */
  summary: string;
  detail?: Record<string, unknown>;
}

export interface AuditEntry extends AuditInput {
  seq: number;
  /** ISO time the entry was written. */
  at: string;
  /** Hash of the entry before; GENESIS for the first. */
  prev: string;
  hash: string;
}

export const GENESIS = 'GENESIS';
export const MAX_FIGURES = 400;

/** JSON with object keys sorted at every level, so the same entry always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function entryHash(e: Omit<AuditEntry, 'hash'>): string {
  const { seq, at, kind, summary, detail, prev, by } = e;
  // `by` is left out of the hash when absent, so entries written before accounts existed still check.
  return sha256Hex(canonicalJson({ seq, at, kind, summary, detail: detail ?? null, prev, by }));
}

/** The next entry after `last` (null for an empty log). */
export function nextEntry(last: Pick<AuditEntry, 'seq' | 'hash'> | null, input: AuditInput, at: Date = new Date()): AuditEntry {
  const base = {
    seq: last ? last.seq + 1 : 1,
    at: at.toISOString(),
    kind: input.kind,
    summary: String(input.summary).slice(0, 500),
    ...(input.detail ? { detail: input.detail } : {}),
    prev: last ? last.hash : GENESIS,
    ...(input.by ? { by: { id: input.by.id, username: input.by.username, name: input.by.name } } : {}),
  };
  return { ...base, hash: entryHash(base) };
}

export interface AuditCheck {
  ok: boolean;
  entries: number;
  /** Line number (from 1) where the chain first breaks. */
  brokenAt?: number | undefined;
  problem?: string | undefined;
  firstAt?: string | undefined;
  lastAt?: string | undefined;
  lastHash?: string | undefined;
}

/**
 * Recompute the chain over the file's lines. `head` is the last entry the app recorded writing
 * (kept in a separate small file); when the log ends before it, lines were removed from the end.
 */
export function checkLog(lines: string[], head?: { seq: number; hash: string } | null): { check: AuditCheck; entries: AuditEntry[] } {
  const entries: AuditEntry[] = [];
  let last: AuditEntry | null = null;
  const fail = (at: number, problem: string) => ({
    check: { ok: false, entries: entries.length, brokenAt: at, problem, firstAt: entries[0]?.at, lastAt: last?.at, lastHash: last?.hash },
    entries,
  });
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (!line) continue;
    let e: AuditEntry;
    try {
      e = JSON.parse(line) as AuditEntry;
    } catch {
      return fail(i + 1, `line ${i + 1} is not a readable entry (cut off or edited)`);
    }
    const expectSeq = last ? last.seq + 1 : 1;
    if (e.seq !== expectSeq) return fail(i + 1, `entry ${expectSeq} is missing (line ${i + 1} is entry ${e.seq})`);
    if (e.prev !== (last ? last.hash : GENESIS)) return fail(i + 1, `entry ${e.seq} does not follow the one before it`);
    const { hash, ...rest } = e;
    if (entryHash(rest) !== hash) return fail(i + 1, `entry ${e.seq} was changed after it was written`);
    entries.push(e);
    last = e;
  }
  if (head && head.seq > 0) {
    if (!last || last.seq < head.seq) return fail(lines.length + 1, `the log ends at entry ${last?.seq ?? 0} but entry ${head.seq} was written: entries were removed from the end`);
    const atHead = entries.find((x) => x.seq === head.seq);
    if (atHead && atHead.hash !== head.hash) return fail(head.seq, `entry ${head.seq} differs from the one the app wrote`);
  }
  return { check: { ok: true, entries: entries.length, firstAt: entries[0]?.at, lastAt: last?.at, lastHash: last?.hash }, entries };
}
