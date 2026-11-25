/**
 * Team work on a home server (platform comparison gap CG10). The second approver already exists
 * (report and memo sign-off, src/utils/signoff.ts: the account that reviewed cannot approve). This
 * adds:
 *
 *   Comments   on a policy review or a saved report, by any signed-in account (Viewers too), each
 *              with the account, the time and the text; the author or an Admin can mark one done.
 *              Kept in data/local/comments.json.
 *   Read-only links  an Analyst or Admin makes a link to one policy review memo or saved report;
 *              anyone who can reach the server opens it without signing in, read-only, until it
 *              expires (1 to 90 days, 14 by default) or is withdrawn. The link holds 32 random bytes;
 *              only its SHA-256 is saved, in data/local/shares.json. The page is the memo or report
 *              as saved, with no scripts.
 *
 * Server-only (node:crypto, fs).
 */
import fs from 'fs';
import { createHash, randomBytes } from 'crypto';
import { writeFileAtomic } from './atomicWrite';

export type TargetKind = 'review' | 'report';
export const MAX_COMMENT = 4000;
export const SHARE_DAYS = { min: 1, max: 90, default: 14 } as const;

export interface TeamComment {
  id: string;
  kind: TargetKind;
  targetId: string;
  by: string;
  byAccount?: string;
  at: string;
  text: string;
  done?: { by: string; at: string };
}

export interface ShareLink {
  /** SHA-256 of the token; the token itself is shown once and never saved. */
  tokenHash: string;
  kind: TargetKind;
  targetId: string;
  title: string;
  by: string;
  at: string;
  expires: string;
  withdrawn?: { by: string; at: string };
  opened: number;
}

function readJson<T>(file: string, empty: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return empty;
  }
}

export const loadComments = (file: string) => readJson<{ comments: TeamComment[] }>(file, { comments: [] }).comments || [];
export const saveComments = (file: string, comments: TeamComment[]) => writeFileAtomic(file, JSON.stringify({ comments }, null, 1));
export const loadShares = (file: string) => readJson<{ links: ShareLink[] }>(file, { links: [] }).links || [];
export const saveShares = (file: string, links: ShareLink[]) => writeFileAtomic(file, JSON.stringify({ links }, null, 1), 0o600);

export const parseTarget = (kind: unknown, id: unknown): { kind: TargetKind; targetId: string } | null =>
  (kind === 'review' || kind === 'report') && typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id) ? { kind, targetId: id } : null;

export function newComment(input: { kind: unknown; targetId: unknown; text: unknown }, by: { name: string; account?: string }, now = new Date()): TeamComment | { error: string } {
  const t = parseTarget(input.kind, input.targetId);
  if (!t) return { error: 'Say which review or report the comment is on.' };
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) return { error: 'Write the comment first.' };
  if (text.length > MAX_COMMENT) return { error: `A comment can be at most ${MAX_COMMENT} characters.` };
  return { id: randomBytes(8).toString('hex'), ...t, by: by.name, ...(by.account ? { byAccount: by.account } : {}), at: now.toISOString(), text };
}

export function commentsFor(all: TeamComment[], kind: TargetKind, targetId: string): TeamComment[] {
  return all.filter((c) => c.kind === kind && c.targetId === targetId).sort((a, b) => (a.at < b.at ? -1 : 1));
}

/** Marks a comment done: only its author (same account) or an Admin. */
export function markDone(all: TeamComment[], id: string, who: { name: string; account?: string; admin: boolean }, now = new Date()): TeamComment[] | { error: string } {
  const c = all.find((x) => x.id === id);
  if (!c) return { error: 'No comment with that id.' };
  if (!who.admin && c.byAccount !== who.account) return { error: 'Only the person who wrote it or an Admin can mark a comment done.' };
  return all.map((x) => (x.id === id ? { ...x, done: { by: who.name, at: now.toISOString() } } : x));
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function newShare(input: { kind: TargetKind; targetId: string; title: string; days?: unknown }, by: string, now = new Date()): { token: string; link: ShareLink } | { error: string } {
  const days = input.days === undefined ? SHARE_DAYS.default : Number(input.days);
  if (!Number.isInteger(days) || days < SHARE_DAYS.min || days > SHARE_DAYS.max) return { error: `A link lasts ${SHARE_DAYS.min} to ${SHARE_DAYS.max} days.` };
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(now.getTime() + days * 86400_000).toISOString();
  return { token, link: { tokenHash: hashToken(token), kind: input.kind, targetId: input.targetId, title: input.title.slice(0, 200), by, at: now.toISOString(), expires, opened: 0 } };
}

/** The live link for a token, or why it does not open. */
export function resolveShare(links: ShareLink[], token: string, now = new Date()): ShareLink | { error: string } {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { error: 'This link is not valid.' };
  const h = hashToken(token);
  const l = links.find((x) => x.tokenHash === h);
  if (!l) return { error: 'This link is not valid.' };
  if (l.withdrawn) return { error: 'This link was withdrawn by the person who made it.' };
  if (l.expires <= now.toISOString()) return { error: 'This link has expired. Ask for a new one.' };
  return l;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A read-only page: the saved markdown shown as preformatted text (no markdown renderer, no scripts). */
export function sharePage(title: string, body: string, note: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>:root{--fg:#0f172a;--bg:#fff;--muted:#475569}@media (prefers-color-scheme:dark){:root{--fg:#e2e8f0;--bg:#0f172a;--muted:#94a3b8}}body{font:15px/1.5 system-ui,sans-serif;color:var(--fg);background:var(--bg);max-width:860px;margin:0 auto;padding:16px}pre{white-space:pre-wrap;word-wrap:break-word;font:inherit}.muted{color:var(--muted);font-size:12px}</style></head>
<body><h1>${esc(title)}</h1><p class="muted">${esc(note)}</p><pre>${esc(body)}</pre></body></html>`;
}
