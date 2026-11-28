/**
 * The gradebook and the end of a class (roadmap Phase 5, Q8). The teacher downloads a gradebook
 * file (CSV) with one row per student: participation, forecast accuracy, calibration, the marks
 * from feedback, and a weighted total from the teacher's own weights. Quests that were withdrawn
 * or found unresolvable drop out of the marks, and assignments on a sensitive topic never leave
 * this copy. Each student can download their own record. A class whose term ended 30 days ago is
 * archived and read-only; an archived class is deleted, with everything kept for it, once the
 * period the teacher chose has passed, and every member is warned in its last 30 days.
 *
 * Browser-safe and pure. Routes: src/server/routes/classes.ts.
 */
import type { ReportSummary, ScoredClassEntry } from './classReport';

export interface GradeWeights {
  /** Percent weights; they add up to 100. */
  participation: number;
  accuracy: number;
  calibration: number;
  marks: number;
}
export const DEFAULT_WEIGHTS: GradeWeights = { participation: 25, accuracy: 25, calibration: 20, marks: 30 };
export const WEIGHT_KEYS: Array<keyof GradeWeights> = ['participation', 'accuracy', 'calibration', 'marks'];

/** Days an archived class is kept before it is deleted: the teacher chooses within these bounds. */
export const KEEP_DAYS_DEFAULT = 365;
export const KEEP_DAYS_MIN = 30;
export const KEEP_DAYS_MAX = 3650;
/** Members are warned this many days before a class is deleted. */
export const DELETE_WARNING_DAYS = 30;
/** A class is archived this many days after the last day of its term. */
export const AUTO_ARCHIVE_AFTER_DAYS = 30;

export function weightProblems(w: unknown): string[] {
  if (!w || typeof w !== 'object') return ['Give the four weights'];
  const o = w as Record<string, unknown>;
  if (WEIGHT_KEYS.some((k) => typeof o[k] !== 'number' || !Number.isFinite(o[k] as number) || (o[k] as number) < 0 || (o[k] as number) > 100)) return ['Each weight is a number from 0 to 100'];
  const sum = WEIGHT_KEYS.reduce((s, k) => s + (o[k] as number), 0);
  if (Math.abs(sum - 100) > 1e-9) return [`The weights add up to 100 (now ${Math.round(sum * 100) / 100})`];
  return [];
}

export function keepDaysProblems(d: unknown): string[] {
  if (typeof d !== 'number' || !Number.isInteger(d) || d < KEEP_DAYS_MIN || d > KEEP_DAYS_MAX) return [`Keep an archived class for ${KEEP_DAYS_MIN} to ${KEEP_DAYS_MAX} days`];
  return [];
}

/**
 * A teacher's mark as a percent, when it reads as one: "7/10", "85%", "85" (out of 100) or a letter
 * grade (A+ to F). Anything else (a word, a comment) is kept in the file but not counted.
 */
export function markPercent(mark: string): number | null {
  const m = mark.trim();
  let x: RegExpExecArray | null;
  if ((x = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(m)) && Number(x[2]) > 0) return clamp((Number(x[1]) / Number(x[2])) * 100);
  if ((x = /^(\d+(?:\.\d+)?)\s*%?$/.exec(m)) && Number(x[1]) <= 100) return clamp(Number(x[1]));
  const letters: Record<string, number> = { 'A+': 98, A: 95, 'A-': 91, 'B+': 88, B: 85, 'B-': 81, 'C+': 78, C: 75, 'C-': 71, 'D+': 68, D: 65, 'D-': 61, F: 50 };
  return letters[m.toUpperCase()] ?? null;
}
const clamp = (x: number) => Math.round(Math.max(0, Math.min(100, x)) * 100) / 100;

export interface GradeRow {
  student: string;
  username: string;
  assignments: number;
  handedIn: number;
  participation: number | null;
  settled: number;
  brier: number | null;
  /** 100 × (1 − mean Brier): 100 is perfect, 75 is always saying 50%. */
  accuracy: number | null;
  /** 100 × (1 − 2 × calibration gap), once there are enough settled probability answers. */
  calibration: number | null;
  skillProbabilities: number | null;
  skillNumbers: number | null;
  marks: string;
  marksPercent: number | null;
  /** Weighted over the parts that have a figure; the weights of missing parts are shared out. */
  total: number | null;
}

export function gradeRow(input: { student: string; username: string; assignments: number; handedIn: number; summary: ReportSummary; marks: string[] }, w: GradeWeights): GradeRow {
  const s = input.summary;
  const participation = input.assignments ? clamp((input.handedIn / input.assignments) * 100) : null;
  const accuracy = s.brier === null ? null : clamp((1 - s.brier) * 100);
  const calibration = 'needs' in s.calibration ? null : clamp((1 - 2 * s.calibration.gap) * 100);
  const pcts = input.marks.map(markPercent).filter((x): x is number => x !== null);
  const marksPercent = pcts.length ? clamp(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const parts: Array<[number, number | null]> = [
    [w.participation, participation],
    [w.accuracy, accuracy],
    [w.calibration, calibration],
    [w.marks, marksPercent],
  ];
  const have = parts.filter(([wt, v]) => v !== null && wt > 0);
  const weight = have.reduce((a, [wt]) => a + wt, 0);
  const total = weight > 0 ? clamp(have.reduce((a, [wt, v]) => a + wt * (v as number), 0) / weight) : null;
  return {
    student: input.student,
    username: input.username,
    assignments: input.assignments,
    handedIn: input.handedIn,
    participation,
    settled: s.settled,
    brier: s.brier,
    accuracy,
    calibration,
    skillProbabilities: s.probabilitySkill,
    skillNumbers: s.levelSkill,
    marks: input.marks.join('; '),
    marksPercent,
    total,
  };
}

export const GRADEBOOK_HEADER = ['student', 'username', 'assignments', 'handed_in', 'participation_pct', 'settled', 'mean_brier', 'accuracy_pct', 'calibration_pct', 'skill_probabilities', 'skill_numbers', 'marks', 'marks_pct', 'weighted_total_pct'];

export function gradebookCells(r: GradeRow): Array<string | number | null> {
  return [r.student, r.username, r.assignments, r.handedIn, r.participation, r.settled, r.brier, r.accuracy, r.calibration, r.skillProbabilities, r.skillNumbers, r.marks, r.marksPercent, r.total];
}

/** Entries that count for marks: not on a voided Quest. */
export function countedForMarks(scored: ScoredClassEntry[], voided: Set<string>): ScoredClassEntry[] {
  return scored.filter((s) => !voided.has(s.assignmentId));
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The day an archived class is deleted (YYYY-MM-DD), or null while it is active. */
export function deleteOn(cls: { archivedAt?: string; keepDays?: number }): string | null {
  return cls.archivedAt ? addDays(cls.archivedAt, cls.keepDays ?? KEEP_DAYS_DEFAULT) : null;
}

/** What to do with a class today: archive it (its term ended long enough ago), delete it, or nothing. */
export function lifecycleStep(cls: { archivedAt?: string; keepDays?: number; term: { ends: string } }, today: string): 'archive' | 'delete' | null {
  const del = deleteOn(cls);
  if (del) return today >= del ? 'delete' : null;
  return today > addDays(cls.term.ends, AUTO_ARCHIVE_AFTER_DAYS) ? 'archive' : null;
}

/** True in the last DELETE_WARNING_DAYS days before a class is deleted. */
export function deleteWarning(cls: { archivedAt?: string; keepDays?: number }, today: string): boolean {
  const del = deleteOn(cls);
  return Boolean(del) && today >= addDays(del!, -DELETE_WARNING_DAYS);
}
