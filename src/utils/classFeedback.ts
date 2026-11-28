/**
 * Feedback in a class (roadmap Phase 5, Q6): the teacher and markers comment on each student's entry
 * (with an optional short mark), students review two classmates' debate arguments without names
 * when the teacher turns peer review on, and a sensitive-topic switch hides names from students and
 * markers. Entries of a sensitive assignment are never exported, published or backed up off this
 * copy (sensitiveAssignmentIds below; the gradebook export in Q8 must leave them out).
 *
 * Server-only (node:crypto). Routes: src/server/routes/classes.ts.
 */
import crypto from 'crypto';
import type { ClassAssignment } from './classAssignments';

export const FEEDBACK_MAX = 2000;
export const MARK_MAX = 20;
export const REVIEW_MIN = 20;
export const REVIEW_MAX = 2000;
/** How many classmates' arguments each student reviews. */
export const PEER_REVIEWS_EACH = 2;

/** A comment by the teacher or a marker on one student's entry. */
export interface ClassFeedback {
  id: string;
  classId: string;
  assignmentId: string;
  /** The student whose entry this is about. */
  accountId: string;
  /** The teacher or marker who wrote it. */
  by: string;
  text: string;
  mark?: string;
  at: string;
}

/** A student's review of a classmate's argument (peer review on a debate). */
export interface ClassReview {
  id: string;
  classId: string;
  assignmentId: string;
  /** The student whose argument is reviewed. */
  authorId: string;
  reviewerId: string;
  text: string;
  at: string;
}

/**
 * A short reference to one student's entry on one assignment, so markers and reviewers can point at
 * an entry without seeing whose it is. Keyed with a per-class secret so it cannot be worked back.
 */
export function entryRef(secret: string, assignmentId: string, accountId: string): string {
  return crypto.createHmac('sha256', secret).update(`${assignmentId}:${accountId}`).digest('hex').slice(0, 16);
}

/**
 * Who reviews whom: the students who handed in, put in a fixed shuffled order (by a hash of the
 * assignment and account), and each reviews the next PEER_REVIEWS_EACH in the circle. Nobody reviews
 * their own argument; with fewer students, each reviews everyone else. The order is fixed once the
 * last due time passes, since no new entries come in after that.
 */
export function peerAllocation(assignmentId: string, authors: string[], each = PEER_REVIEWS_EACH): Map<string, string[]> {
  const key = (id: string) => crypto.createHash('sha256').update(`${assignmentId}:${id}`).digest('hex');
  const ring = [...new Set(authors)].sort((a, b) => key(a).localeCompare(key(b)) || a.localeCompare(b));
  const n = ring.length;
  const out = new Map<string, string[]>();
  ring.forEach((reviewer, i) => {
    const mine: string[] = [];
    for (let k = 1; k <= Math.min(each, n - 1); k++) mine.push(ring[(i + k) % n]!);
    out.set(reviewer, mine);
  });
  return out;
}

export function feedbackProblems(text: unknown, mark: unknown): string[] {
  const p: string[] = [];
  if (typeof text !== 'string' || !text.trim()) p.push('Write the feedback');
  else if (text.trim().length > FEEDBACK_MAX) p.push(`Feedback: at most ${FEEDBACK_MAX} characters`);
  if (mark !== undefined && mark !== null && mark !== '' && (typeof mark !== 'string' || mark.trim().length > MARK_MAX)) p.push(`A mark is at most ${MARK_MAX} characters, like "B+" or "7/10"`);
  return p;
}

export function reviewProblems(text: unknown): string[] {
  if (typeof text !== 'string' || text.trim().length < REVIEW_MIN) return [`Write at least ${REVIEW_MIN} characters: what is strong in the argument, and what would make it stronger`];
  if (text.trim().length > REVIEW_MAX) return [`A review is at most ${REVIEW_MAX} characters`];
  return [];
}

/** The latest of each kind of note: a new one from the same writer about the same entry replaces the old. */
export function latestBy<T extends { at: string }>(rows: T[], key: (r: T) => string): T[] {
  const m = new Map<string, T>();
  for (const r of rows) m.set(key(r), r);
  return [...m.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** Assignments whose entries must never leave this copy (exports, publishing, backups). */
export function sensitiveAssignmentIds(assignments: ClassAssignment[]): Set<string> {
  return new Set(assignments.filter((a) => a.sensitive).map((a) => a.id));
}
