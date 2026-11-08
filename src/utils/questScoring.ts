/**
 * Quest scoring (Quests step 4): how a forecast entry is scored once its Quest settles, and the
 * baselines it is shown against. Scoring, not a signal.
 *
 *   probability   Brier score (p - outcome)^2, 0 best, 1 worst. Baseline: the base rate, the share
 *                 of past windows of the same length in which the same thing happened. Skill =
 *                 base-rate Brier minus entry Brier (positive = better than the base rate).
 *   level         absolute error |forecast - outcome|. Baseline: no change, the value on the day
 *                 entries closed. Skill = no-change error minus entry error.
 *
 * Also: reading the first value on or after a date from a series, and the base rate of a
 * direction rule over a series' history. Browser-safe, pure.
 */

export interface Point {
  date: string;
  value: number;
}

/** First point dated on or after `date` (daily or weekly points, oldest first). */
export function firstOnOrAfter(points: Point[], date: string): Point | null {
  return points.find((p) => p.date >= date) ?? null;
}

export const brier = (p: number, happened: boolean) => (p - (happened ? 1 : 0)) ** 2;

export interface ProbabilityScore {
  answer: 'probability';
  happened: boolean;
  brier: number;
  baseRate: number | null;
  baseBrier: number | null;
  /** Base-rate Brier minus entry Brier; positive = better than the base rate. */
  skill: number | null;
}

export interface LevelScore {
  answer: 'level';
  outcome: number;
  error: number;
  noChange: number | null;
  noChangeError: number | null;
  /** No-change error minus entry error; positive = better than no change. */
  skill: number | null;
}

export function scoreProbability(p: number, happened: boolean, baseRate: number | null): ProbabilityScore {
  const b = brier(p, happened);
  const bb = baseRate === null ? null : brier(baseRate, happened);
  return { answer: 'probability', happened, brier: round(b), baseRate: baseRate === null ? null : round(baseRate), baseBrier: bb === null ? null : round(bb), skill: bb === null ? null : round(bb - b) };
}

export function scoreLevel(forecast: number, outcome: number, noChange: number | null): LevelScore {
  const e = Math.abs(forecast - outcome);
  const ne = noChange === null ? null : Math.abs(noChange - outcome);
  return { answer: 'level', outcome, error: round(e), noChange, noChangeError: ne === null ? null : round(ne), skill: ne === null ? null : round(ne - e) };
}

const round = (x: number) => Math.round(x * 1e6) / 1e6;

const DAY = 86_400_000;
export const addDaysIso = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/**
 * Base rate of "the value `days` later is higher (or lower)" over a daily or weekly series, using
 * windows that start at most once a week so overlapping windows do not count many times over.
 * Only windows that end on or before `before` count. Null with fewer than 30 windows.
 */
export function directionBaseRate(points: Point[], days: number, op: 'higher' | 'lower', before: string, minWindows = 30): { rate: number; windows: number } | null {
  if (days < 1) return null;
  let hits = 0;
  let n = 0;
  let nextStart = '';
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    if (start.date < nextStart) continue;
    const endDate = addDaysIso(start.date, days);
    if (endDate > before) break;
    let end: Point | null = null;
    for (let j = i + 1; j < points.length; j++) if (points[j].date >= endDate) { end = points[j]; break; }
    if (!end) break;
    n++;
    if (op === 'higher' ? end.value > start.value : end.value < start.value) hits++;
    nextStart = addDaysIso(start.date, 7);
  }
  return n >= minWindows ? { rate: hits / n, windows: n } : null;
}

/** Mean of numbers, null when empty. */
export const mean = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
