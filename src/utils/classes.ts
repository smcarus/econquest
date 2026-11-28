/**
 * Classes for Quests in the classroom (roadmap Phase 5, Q1). A professor makes a class for a term,
 * shares its join code, and students join with their own accounts on this server. Inside a class
 * each member has one role:
 *   - teacher: made the class; adds markers and students, makes student accounts from nicknames,
 *     changes the join code, archives the class;
 *   - marker: sees the members (marking comes with later steps);
 *   - student: sees the class name, term and teachers, and their own role.
 * The app never grades; the professor does.
 *
 * Classes sit behind their own switch, CLASSES_ENABLED=on, so a school can start before Quests open
 * to everyone, and they need sign-in (accounts), because a role belongs to an account.
 *
 * Browser-safe: no server imports. The file store is src/utils/classStore.ts.
 */
import type { ClassAssignment } from './classAssignments';

export type ClassRole = 'teacher' | 'marker' | 'student';
export const CLASS_ROLES: ClassRole[] = ['teacher', 'marker', 'student'];

export interface ClassMember {
  accountId: string;
  role: ClassRole;
  joinedAt: string;
}

export interface ClassTerm {
  /** e.g. "Spring 2027". */
  label: string;
  /** YYYY-MM-DD. */
  starts: string;
  /** YYYY-MM-DD, on or after starts. */
  ends: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  term: ClassTerm;
  /** Eight letters and digits with no look-alikes (no I, L, O, 0 or 1); shown as ABCD-EFGH. */
  code: string;
  createdAt: string;
  createdBy: string;
  members: ClassMember[];
  /** Set when the teacher archives the class: nobody can join, and it leaves the active list. */
  archivedAt?: string;
  /** IANA time zone the class's due times are set in (Q3); UTC when not given. */
  timeZone?: string;
  /** Quests set for the class (Q3; src/utils/classAssignments.ts). */
  assignments?: ClassAssignment[];
}

export const CLASSES_OFF_REASON = 'Classes are switched off on this server. The administrator turns them on with CLASSES_ENABLED=on in .env and restarts the app.';
export const CLASSES_NEED_SIGNIN = 'Classes need sign-in, because each role in a class belongs to an account. An administrator makes the first account in Menu > Account.';

export function classesEnabled(value: string | undefined): boolean {
  return /^(1|on|true|yes)$/i.test((value || '').trim());
}

export const JOIN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A new join code from random bytes (at least 8). */
export function joinCodeFrom(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 8), (b) => JOIN_ALPHABET[b % JOIN_ALPHABET.length]).join('');
}

/** What a person typed, as a code to look up: case, spaces and dashes do not matter. '' when it cannot be a code. */
export function normaliseJoinCode(raw: unknown): string {
  const c = typeof raw === 'string' ? raw.toUpperCase().replace(/[\s-]/g, '') : '';
  return c.length === 8 && [...c].every((ch) => JOIN_ALPHABET.includes(ch)) ? c : '';
}

export function formatJoinCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** Problems with a new class, in plain words; empty when it can be made. */
export function classProblems(input: { name?: unknown; term?: Partial<Record<keyof ClassTerm, unknown>> }): string[] {
  const out: string[] = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) out.push('Give the class a name');
  else if (name.length > 80) out.push('Use at most 80 characters for the class name');
  else if (/[\u0000-\u001f<>]/.test(name)) out.push('The class name may not contain < > or control characters');
  const label = typeof input.term?.label === 'string' ? input.term.label.trim() : '';
  if (!label) out.push('Name the term, for example Spring 2027');
  else if (label.length > 40) out.push('Use at most 40 characters for the term');
  const starts = typeof input.term?.starts === 'string' ? input.term.starts : '';
  const ends = typeof input.term?.ends === 'string' ? input.term.ends : '';
  if (!validDate(starts) || !validDate(ends)) out.push('Give the first and last day of the term as dates');
  else if (ends < starts) out.push('The term cannot end before it starts');
  else if (Date.parse(ends) - Date.parse(starts) > 400 * 86400000) out.push('A term is at most 400 days, so make a new class for the next term');
  return out;
}

export function roleIn(cls: SchoolClass, accountId: string): ClassRole | null {
  return cls.members.find((m) => m.accountId === accountId)?.role ?? null;
}

/** A username for a student account made from a nickname: lower case, no accents, unique. */
export function studentUsername(nickname: string, taken: (username: string) => boolean): string {
  // Character by character, so a long run of dashes costs nothing (no backtracking regex).
  let base = '';
  for (const ch of nickname.slice(0, 80).normalize('NFKD').toLowerCase()) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x300 && code <= 0x36f) continue;
    const ok = /[a-z0-9._-]/.test(ch) ? ch : '-';
    if (!base && !/[a-z0-9]/.test(ok)) continue;
    if (ok === '-' && base.endsWith('-')) continue;
    base += ok;
  }
  base = base.slice(0, 30);
  while (base.endsWith('-')) base = base.slice(0, -1);
  if (base.length < 2) base = 'student';
  if (!taken(base)) return base;
  for (let n = 2; n < 10000; n++) if (!taken(`${base}-${n}`)) return `${base}-${n}`;
  throw new Error('No free username');
}

/** Problems with a list of nicknames for new student accounts. */
export function nicknameProblems(nicknames: unknown): string[] {
  if (!Array.isArray(nicknames) || !nicknames.length) return ['Give at least one nickname, one per line'];
  if (nicknames.length > 200) return ['At most 200 students at a time'];
  const out: string[] = [];
  for (const n of nicknames) {
    const s = typeof n === 'string' ? n.trim() : '';
    if (!s) out.push('A nickname is empty');
    else if (s.length > 40) out.push(`"${s.slice(0, 40)}…" is longer than 40 characters`);
    else if (/[\u0000-\u001f<>]/.test(s)) out.push(`"${s}" may not contain < > or control characters`);
  }
  return [...new Set(out)];
}

export interface ClassMemberView {
  accountId: string;
  username: string;
  displayName: string;
  role: ClassRole;
  joinedAt: string;
}

export interface ClassView {
  id: string;
  name: string;
  term: ClassTerm;
  myRole: ClassRole;
  archived: boolean;
  timeZone: string;
  teachers: string[];
  memberCount: number;
  /** Teacher only. */
  code?: string;
  /** Teacher and markers only: students see who teaches, not the other students. */
  members?: ClassMemberView[];
}

/** What one member may see of a class. */
export function classView(cls: SchoolClass, viewerId: string, nameOf: (id: string) => { username: string; displayName: string } | undefined): ClassView | null {
  const myRole = roleIn(cls, viewerId);
  if (!myRole) return null;
  const named = (m: ClassMember): ClassMemberView => ({ accountId: m.accountId, role: m.role, joinedAt: m.joinedAt, username: nameOf(m.accountId)?.username ?? '(account removed)', displayName: nameOf(m.accountId)?.displayName ?? '(account removed)' });
  const order: Record<ClassRole, number> = { teacher: 0, marker: 1, student: 2 };
  return {
    id: cls.id,
    name: cls.name,
    term: cls.term,
    myRole,
    archived: Boolean(cls.archivedAt),
    timeZone: cls.timeZone || 'UTC',
    teachers: cls.members.filter((m) => m.role === 'teacher').map((m) => nameOf(m.accountId)?.displayName ?? '(account removed)'),
    memberCount: cls.members.length,
    ...(myRole === 'teacher' ? { code: formatJoinCode(cls.code) } : {}),
    ...(myRole === 'student'
      ? {}
      : { members: cls.members.map(named).sort((a, b) => order[a.role] - order[b.role] || a.displayName.localeCompare(b.displayName)) }),
  };
}

/** Classes listed for one account: active ones first (term start, newest first), then archived. */
export function classesFor(classes: SchoolClass[], viewerId: string, nameOf: Parameters<typeof classView>[2]): ClassView[] {
  return classes
    .map((c) => classView(c, viewerId, nameOf))
    .filter((v): v is ClassView => v !== null)
    .sort((a, b) => Number(a.archived) - Number(b.archived) || b.term.starts.localeCompare(a.term.starts) || a.name.localeCompare(b.name));
}
