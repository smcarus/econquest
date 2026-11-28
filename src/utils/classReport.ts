/**
 * The class table and each student's report (roadmap Phase 5, Q7). The teacher chooses what
 * students see of the table (only their own row, classmates as nicknames, or as "Student 7"), puts
 * students in teams of 3 to 5 that share a row, and opens a one-page report per student: entries,
 * scores against the base rate and "no change", a calibration chart once there are 10 settled
 * probability answers, a plain-words coach, and every comment received.
 *
 * Browser-safe and pure. Routes: src/server/routes/classes.ts; screen: src/components/ClassTable.tsx.
 */
import { calibrationBins, type CalibrationBin } from './questStats';
import type { EntryScore } from './questEntries';

/** What students see of the class table: their own row only, classmates' nicknames, or numbers. */
export type TableView = 'own' | 'nicknames' | 'numbers';
export const TABLE_VIEWS: TableView[] = ['own', 'nicknames', 'numbers'];

export const TEAM_MIN = 3;
export const TEAM_MAX = 5;
export const TEAM_NAME_MAX = 40;
export const TEAMS_MAX = 40;
/** Settled probability answers before the calibration chart is drawn. */
export const CALIBRATION_MIN = 10;
/** A bin needs this many answers before the coach says anything about it. */
export const COACH_BIN_MIN = 3;
/** How far "said" and "happened" may differ before the coach calls it too sure or not sure enough. */
export const COACH_GAP = 0.15;

export interface ClassTeam {
  id: string;
  name: string;
  members: string[];
}

/** Problems with a team: a name, 3 to 5 students of this class, none already in another team. */
export function teamProblems(name: unknown, members: unknown, isStudent: (id: string) => boolean, inOtherTeam: (id: string) => boolean): string[] {
  const p: string[] = [];
  if (typeof name !== 'string' || !name.trim()) p.push('Give the team a name');
  else if (name.trim().length > TEAM_NAME_MAX) p.push(`A team name is at most ${TEAM_NAME_MAX} characters`);
  if (!Array.isArray(members) || members.some((m) => typeof m !== 'string')) return [...p, 'List the team members'];
  const ids = [...new Set(members as string[])];
  if (ids.length < TEAM_MIN || ids.length > TEAM_MAX) p.push(`A team has ${TEAM_MIN} to ${TEAM_MAX} students`);
  if (ids.some((id) => !isStudent(id))) p.push('Every team member must be a student of this class');
  if (ids.some((id) => inOtherTeam(id))) p.push('A student is in one team at most');
  return p;
}

/** One scored class entry, as the table and the report read it. */
export interface ScoredClassEntry {
  accountId: string;
  assignmentId: string;
  title: string;
  answer: Record<string, number>;
  at: string;
  score: EntryScore;
}

export interface TableRow {
  key: string;
  entries: number;
  settled: number;
  /** Mean Brier score on settled probability answers (lower is better). */
  brier: number | null;
  /** Mean skill against the base rate (probabilities) and against no change (numbers); positive is better. */
  probabilitySkill: number | null;
  levelSkill: number | null;
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1e4) / 1e4 : null);

/** Rows of the class table, one per key (a student, or a team). */
export function tableRows(scored: ScoredClassEntry[], keyOf: (accountId: string) => string | null): TableRow[] {
  const rows = new Map<string, { entries: number; settled: number; b: number[]; p: number[]; l: number[] }>();
  for (const s of scored) {
    const key = keyOf(s.accountId);
    if (!key) continue;
    const r = rows.get(key) || { entries: 0, settled: 0, b: [], p: [], l: [] };
    r.entries++;
    if (s.score.status === 'settled') {
      r.settled++;
      if (s.score.answer === 'probability') r.b.push(s.score.brier);
      if (s.score.skill !== null) (s.score.answer === 'probability' ? r.p : r.l).push(s.score.skill);
    }
    rows.set(key, r);
  }
  return [...rows.entries()]
    .map(([key, r]) => ({ key, entries: r.entries, settled: r.settled, brier: avg(r.b), probabilitySkill: avg(r.p), levelSkill: avg(r.l) }))
    .sort((a, b) => (b.probabilitySkill ?? -Infinity) - (a.probabilitySkill ?? -Infinity) || (b.levelSkill ?? -Infinity) - (a.levelSkill ?? -Infinity) || a.key.localeCompare(b.key));
}

export type CoachLine = { kind: 'tooSure' | 'notSureEnough'; said: number; happened: number; n: number } | { kind: 'wellCalibrated'; n: number };

/** What the coach says about a calibration chart, in parts the screen words in the chosen language. */
export function calibrationCoach(bins: CalibrationBin[]): CoachLine[] {
  const lines: CoachLine[] = [];
  for (const b of bins) {
    if (b.n < COACH_BIN_MIN) continue;
    // Above 50% "too sure" means it happened less often than said; below 50%, more often.
    const sure = b.said >= 0.5 ? b.said - b.happened : b.happened - b.said;
    if (sure > COACH_GAP) lines.push({ kind: 'tooSure', said: b.said, happened: b.happened, n: b.n });
    else if (sure < -COACH_GAP) lines.push({ kind: 'notSureEnough', said: b.said, happened: b.happened, n: b.n });
  }
  if (!lines.length) lines.push({ kind: 'wellCalibrated', n: bins.reduce((s, b) => s + b.n, 0) });
  return lines;
}

export interface ReportSummary {
  entries: number;
  settled: number;
  brier: number | null;
  probabilitySkill: number | null;
  levelSkill: number | null;
  /** Settled answers that did better than the base rate or "no change". */
  beat: number;
  /** Settled answers that had a base rate or "no change" to compare with. */
  compared: number;
  calibration: { bins: CalibrationBin[]; gap: number; coach: CoachLine[] } | { needs: number; have: number };
}

export function reportSummary(scored: ScoredClassEntry[]): ReportSummary {
  const settled = scored.flatMap((s) => (s.score.status === 'settled' ? [s.score] : []));
  const probs = settled.filter((s) => s.answer === 'probability');
  const withSkill = settled.filter((s) => s.skill !== null);
  const pRows = scored.flatMap((s) => (s.score.status === 'settled' && s.score.answer === 'probability' && typeof s.answer.probability === 'number' ? [{ p: s.answer.probability, happened: s.score.happened }] : []));
  const cal = calibrationBins(pRows);
  return {
    entries: scored.length,
    settled: settled.length,
    brier: avg(probs.flatMap((s) => (s.answer === 'probability' ? [s.brier] : []))),
    probabilitySkill: avg(withSkill.filter((s) => s.answer === 'probability').map((s) => s.skill as number)),
    levelSkill: avg(withSkill.filter((s) => s.answer === 'level').map((s) => s.skill as number)),
    beat: withSkill.filter((s) => (s.skill as number) > 0).length,
    compared: withSkill.length,
    calibration: pRows.length >= CALIBRATION_MIN ? { ...cal, coach: calibrationCoach(cal.bins) } : { needs: CALIBRATION_MIN, have: pRows.length },
  };
}
