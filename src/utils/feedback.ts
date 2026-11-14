/**
 * Feedback from the person using the app (roadmap P2 and P3, Sam 9 November 2026):
 *
 *  - P2 Flag: a note on a figure or a council answer that looks wrong. It is saved on this computer
 *    in data/local/feedback.jsonl with the figure, its source and the app version, and the app offers
 *    a ready-made GitHub issue link that the person opens and sends themselves. Nothing is sent by the
 *    app. A figure from a paid subscription keeps its value only in the local file: the issue text
 *    leaves the value out.
 *  - P3 Rating: thumbs up or down on a council answer, with an optional reason, saved the same way.
 *    Ratings never change an answer. `npm run feedback:export` writes the rated questions (question,
 *    rating, reason, date, app version; no figures) for adding to the council test set.
 *
 * Text that looks like a key or token is blanked before it is saved. Browser-safe, pure.
 */
import { APP_CITATION } from './citation';
import { versionWithCommit } from './buildInfo';
import { redact } from './dataHealth';

export const FEEDBACK_VERSION = 'feedback-v1';
export const ISSUE_REPO = 'e-conquest/econquest';
export const PAID_PREFIX = 'Your subscription: ';
const MAX_NOTE = 1000;

export type FeedbackKind = 'flag' | 'rating';
export type FeedbackTarget = 'figure' | 'answer';

export interface FeedbackFigure {
  iso3?: string;
  label: string;
  value: string;
  source: string;
}

export interface FeedbackAnswer {
  question: string;
  /** When the question was asked (ISO), which with the question names the answer. */
  askedAt: string;
  /** The snapshot the answer is pinned to, when there is one. */
  snapshotId?: string;
  model?: string;
}

export interface FeedbackEntry {
  version: string;
  id: string;
  at: string;
  kind: FeedbackKind;
  target: FeedbackTarget;
  appVersion: string;
  note: string;
  rating?: 'up' | 'down';
  figure?: FeedbackFigure;
  answer?: FeedbackAnswer;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? (redact(v.trim().replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, max)) ?? '') : '');

/** Long runs of letters and digits (32+) look like keys: blanked wherever they appear. */
export function scrub(text: string): string {
  return (redact(text) ?? '').replace(/\b[A-Za-z0-9_-]{32,}\b/g, '…');
}

export const isPaidFigure = (f: Pick<FeedbackFigure, 'source'> | undefined): boolean => Boolean(f && f.source.startsWith(PAID_PREFIX));

/** Checks one entry from the browser. Returns the reason it cannot be saved, if any. */
export function parseFeedback(v: unknown, now: Date = new Date()): { entry: FeedbackEntry } | { error: string } {
  const b = (v ?? {}) as Record<string, unknown>;
  const kind = b.kind === 'flag' || b.kind === 'rating' ? b.kind : null;
  if (!kind) return { error: 'Say whether this is a flag or a rating.' };
  const target = b.target === 'figure' || b.target === 'answer' ? b.target : null;
  if (!target) return { error: 'Say whether this is about a figure or an answer.' };
  if (kind === 'rating' && target !== 'answer') return { error: 'Only council answers can be rated.' };
  const note = scrub(str(b.note, MAX_NOTE));
  const rating = b.rating === 'up' || b.rating === 'down' ? b.rating : undefined;
  if (kind === 'rating' && !rating) return { error: 'Pick thumbs up or thumbs down.' };
  if (kind === 'flag' && note.length < 3) return { error: 'Say in a few words what looks wrong.' };
  const f = (b.figure ?? null) as Record<string, unknown> | null;
  const a = (b.answer ?? null) as Record<string, unknown> | null;
  let figure: FeedbackFigure | undefined;
  let answer: FeedbackAnswer | undefined;
  if (target === 'figure') {
    const label = scrub(str(f?.label, 160));
    if (!label) return { error: 'Which figure? The flag came without one.' };
    const iso3 = str(f?.iso3, 3).toUpperCase();
    figure = { ...(iso3 && /^[A-Z]{3}$/.test(iso3) ? { iso3 } : {}), label, value: scrub(str(f?.value, 80)), source: scrub(str(f?.source, 200)) };
  }
  if (target === 'answer' || a) {
    const question = scrub(str(a?.question, 600));
    if (target === 'answer' && !question) return { error: 'Which answer? The question is missing.' };
    if (question) {
      const snapshotId = str(a?.snapshotId, 80);
      const model = str(a?.model, 80);
      answer = { question, askedAt: str(a?.askedAt, 40), ...(snapshotId ? { snapshotId } : {}), ...(model ? { model } : {}) };
    }
  }
  const at = now.toISOString();
  return {
    entry: {
      version: FEEDBACK_VERSION,
      id: `fb-${at.replace(/[^0-9]/g, '')}`,
      at,
      kind,
      target,
      appVersion: versionWithCommit(APP_CITATION.version),
      note,
      ...(rating ? { rating } : {}),
      ...(figure ? { figure } : {}),
      ...(answer ? { answer } : {}),
    },
  };
}

/** The text of a GitHub issue for a flag. A paid figure's value is left out. */
export function issueText(e: FeedbackEntry): { title: string; body: string } {
  const what = e.figure ? `${e.figure.label}${e.figure.iso3 ? ` (${e.figure.iso3})` : ''}` : 'a council answer';
  const lines = [`**What looks wrong:** ${e.note || '(no note)'}`, ''];
  if (e.figure) {
    lines.push(
      `- Figure: ${e.figure.label}${e.figure.iso3 ? `, ${e.figure.iso3}` : ''}`,
      `- Value shown: ${isPaidFigure(e.figure) ? 'left out (a figure from a paid subscription)' : e.figure.value || '(none)'}`,
      `- Source: ${e.figure.source || '(none)'}`
    );
  }
  if (e.answer) {
    lines.push(`- Question: ${e.answer.question}`, ...(e.answer.askedAt ? [`- Asked: ${e.answer.askedAt}`] : []), ...(e.answer.model ? [`- Model: ${e.answer.model}`] : []), ...(e.answer.snapshotId ? [`- Snapshot: ${e.answer.snapshotId}`] : []));
  }
  lines.push(`- App version: ${e.appVersion}`, `- Flagged: ${e.at.slice(0, 10)}`, '', '_Written by the app\'s Flag button and sent by the person who opened this issue._');
  return { title: `Flag: ${what}`.slice(0, 120), body: lines.join('\n') };
}

/** A link that opens a new GitHub issue with the text filled in; nothing is sent until the person sends it. */
export function issueUrl(e: FeedbackEntry): string {
  const { title, body } = issueText(e);
  return `https://github.com/${ISSUE_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export interface FeedbackSummary {
  flags: number;
  flaggedFigures: number;
  flaggedAnswers: number;
  ratings: number;
  up: number;
  down: number;
  last?: string;
}

/** Counts for Data health. A rating changed later (or given a reason) counts once, as its newest value. */
export function summariseFeedback(entries: FeedbackEntry[]): FeedbackSummary {
  const s: FeedbackSummary = { flags: 0, flaggedFigures: 0, flaggedAnswers: 0, ratings: 0, up: 0, down: 0 };
  for (const e of entries) {
    if (e.kind === 'flag') {
      s.flags += 1;
      if (e.target === 'figure') s.flaggedFigures += 1;
      else s.flaggedAnswers += 1;
    }
    if (!s.last || e.at > s.last) s.last = e.at;
  }
  for (const r of ratedQuestions(entries)) {
    s.ratings += 1;
    if (r.rating === 'up') s.up += 1;
    else s.down += 1;
  }
  return s;
}

/** One line for Data health. */
export function feedbackLine(s: FeedbackSummary): string {
  if (!s.flags && !s.ratings) return 'No flags or answer ratings yet.';
  return `${s.flags} flag${s.flags === 1 ? '' : 's'} (${s.flaggedFigures} on figures, ${s.flaggedAnswers} on answers) and ${s.ratings} answer rating${s.ratings === 1 ? '' : 's'} (${s.up} up, ${s.down} down), saved on this computer in data/local/feedback.jsonl.`;
}

export interface RatedQuestion {
  question: string;
  rating: 'up' | 'down';
  reason: string;
  askedAt: string;
  ratedAt: string;
  appVersion: string;
  model?: string;
}

/**
 * The rated council questions, newest rating per question, for adding to the council test set
 * (docs/validation/council-regression/). Questions, ratings and reasons only: no figures, so no paid
 * figure can leave the computer this way.
 */
export function ratedQuestions(entries: FeedbackEntry[]): RatedQuestion[] {
  const byQ = new Map<string, RatedQuestion>();
  for (const e of [...entries].sort((x, y) => x.at.localeCompare(y.at))) {
    if (e.kind !== 'rating' || !e.answer || !e.rating) continue;
    byQ.set(`${e.answer.question}\u0000${e.answer.askedAt}`, {
      question: e.answer.question,
      rating: e.rating,
      reason: e.note,
      askedAt: e.answer.askedAt,
      ratedAt: e.at,
      appVersion: e.appVersion,
      ...(e.answer.model ? { model: e.answer.model } : {}),
    });
  }
  return [...byQ.values()];
}
