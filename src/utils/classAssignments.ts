/**
 * Class assignments (roadmap Phase 5, Q3): a teacher sets a Quest for the class with a due date and
 * time in the class's time zone (shown to each person in their own time too), a rule on AI use,
 * optional instructions, and private extensions for single students. Entries stay hidden from other
 * students until the last due time (extensions included), unless the teacher shows them early.
 * Assignments copy from last term's class with their dates moved by the gap between the two terms.
 *
 * Browser-safe: no server imports. Routes: src/server/routes/classes.ts.
 */
import type { EntryAnswer } from './questEntries';

export type AiRule = 'allowed' | 'note' | 'none';
export const AI_RULES: AiRule[] = ['allowed', 'note', 'none'];
export const AI_NOTE_MIN = 10;
export const INSTRUCTIONS_MAX = 2000;

export interface Extension {
  accountId: string;
  /** Local date and time in the class's time zone, YYYY-MM-DDTHH:mm. */
  due: string;
  dueUtc: string;
}

export interface ClassAssignment {
  id: string;
  questId: string;
  questVersion: number;
  /** The Quest's title when the assignment was set (the Quest file stays the authority). */
  title: string;
  due: string;
  dueUtc: string;
  aiRule: AiRule;
  instructions?: string;
  /** Set when the teacher shows the entries to students before the last due time. */
  revealedAt?: string;
  extensions: Extension[];
  createdAt: string;
  /** Q6: students review two classmates' arguments without names once the last due time passes (debates only). */
  peerReview?: boolean;
  /** Q6: a sensitive topic. Names are hidden from students and markers, and the entries never leave this copy. */
  sensitive?: boolean;
}

export interface ClassEntry {
  id: string;
  classId: string;
  assignmentId: string;
  accountId: string;
  questId: string;
  questVersion: number;
  questHash: string;
  answer: EntryAnswer;
  rationale?: string;
  code?: string;
  ai: { rule: AiRule; note?: string; declaredNone?: boolean };
  at: string;
}

export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock time in `tz` at instant `ms`, read back as if it were UTC (ms). */
function wallAsUtc(ms: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** A local date and time (YYYY-MM-DDTHH:mm) in time zone `tz` as a UTC instant (ISO), or null. */
export function zonedToUtc(local: string, tz: string): string | null {
  const m = LOCAL.exec(local);
  if (!m || !validTimeZone(tz)) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(guess).getUTCDate() !== d) return null;
  let utc = guess - (wallAsUtc(guess, tz) - guess);
  utc = guess - (wallAsUtc(utc, tz) - utc);
  return new Date(utc).toISOString();
}

/** When the student's own entry is due: their extension, else the assignment's due time. */
export function dueFor(a: ClassAssignment, accountId: string): { due: string; dueUtc: string; extended: boolean } {
  const x = a.extensions.find((e) => e.accountId === accountId);
  return x ? { due: x.due, dueUtc: x.dueUtc, extended: true } : { due: a.due, dueUtc: a.dueUtc, extended: false };
}

/** The last due time of anyone in the class (extensions included). */
export function lastDueUtc(a: ClassAssignment): string {
  return [a.dueUtc, ...a.extensions.map((e) => e.dueUtc)].sort().pop()!;
}

/** Students see each other's entries only after the last due time, or once the teacher shows them. */
export function entriesVisibleToStudents(a: ClassAssignment, nowIso: string): boolean {
  return Boolean(a.revealedAt) || nowIso > lastDueUtc(a);
}

/** The latest entry per student (a new entry before the due time replaces the earlier one). */
export function latestEntries(entries: ClassEntry[], assignmentId: string): ClassEntry[] {
  const byAccount = new Map<string, ClassEntry>();
  for (const e of entries) if (e.assignmentId === assignmentId) byAccount.set(e.accountId, e);
  return [...byAccount.values()];
}

/** The last moment entries are accepted for a Quest: the end of its closing day (UTC). */
export function questCloseUtc(closesOn: string): string {
  return `${closesOn}T23:59:59.999Z`;
}

/** Problems with a due time for a Quest; empty when it is fine. */
export function dueProblems(local: unknown, tz: string, questClosesOn: string, nowIso: string): string[] {
  const utc = typeof local === 'string' ? zonedToUtc(local, tz) : null;
  if (!utc) return ['Give the due date and time'];
  if (utc <= nowIso) return ['The due time has already passed'];
  if (utc > questCloseUtc(questClosesOn)) return [`The Quest takes entries only until ${questClosesOn}, so the due time cannot be later`];
  return [];
}

/** Problems with the AI part of an entry under the assignment's rule. */
export function aiProblems(rule: AiRule, note: unknown, declaredNone: unknown): string[] {
  if (rule === 'note' && (typeof note !== 'string' || note.trim().length < AI_NOTE_MIN)) return [`Say in a sentence how you used AI tools, or that you did not (at least ${AI_NOTE_MIN} characters)`];
  if (rule === 'none' && declaredNone !== true) return ['This assignment does not allow AI tools: confirm that you did not use them'];
  return [];
}

/** Whole days from one date to another (YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** A local date-time moved by whole days, keeping the time of day. */
export function shiftLocal(local: string, days: number): string {
  const d = new Date(`${local.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}${local.slice(10)}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
const icsTime = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** A calendar file (.ics) with one event at each assignment's due time for this person. */
export function assignmentsIcs(className: string, assignments: ClassAssignment[], accountId: string, stampIso: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EconQuest//Classes//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsText(className)}`];
  for (const a of assignments) {
    const due = dueFor(a, accountId).dueUtc;
    lines.push('BEGIN:VEVENT', `UID:${a.id}-${accountId}@econquest`, `DTSTAMP:${icsTime(stampIso)}`, `DTSTART:${icsTime(due)}`, `DTEND:${icsTime(due)}`, `SUMMARY:${icsText(`Due: ${a.title}`)}`, `DESCRIPTION:${icsText(`${className}. Quest ${a.questId}.${a.instructions ? ` ${a.instructions}` : ''}`)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
