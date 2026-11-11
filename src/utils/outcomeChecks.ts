/**
 * Policy outcome check (roadmap P1, Sam 9 November 2026): every saved policy review is checked on
 * its own at 12 and 24 months after its "As of" day. A check compares the review's goal indicator,
 * direction and target (from the Frame step) with the figure the app held at that date, and records
 * one of four results with the reason:
 *
 *  - Hit: the target was met (or, with no target, the figure moved the way the goal wants).
 *  - Miss: it was not.
 *  - Too early: no newer figure yet; the latest one is still for the period the review started from.
 *  - Missing: no starting figure, no saved pull near the check date, or the goal is not one of the
 *    standard indicators.
 *
 * From v2, each check also looks at the early-warning figures the council named in the pre-mortem of
 * the recommended option (roadmap G38): Warning shown (the figure moved the way that signals failure),
 * No warning, Too early or Missing.
 *
 * Only whether the stated goal was met is recorded. The app does not know whether the advice was
 * followed, and what happened afterwards is not what the advice caused; the track record says so.
 *
 * Each check is written once, chained to the check before it by hash, and never edited
 * (policyReviewStore.ts adds the hash). A check uses the saved pull on or before its due day, so
 * a check made late gives the same result as one made on the day. Browser-safe, pure.
 */
import type { GoalDirection, PolicyReview, ReviewFrame } from './policyReview';
import type { Diagnosis, DiagnosisFigure } from './reviewDiagnosis';
import { goalFigure } from './reviewOutcomes';
import type { EarlyWarning } from './reviewOptions';

/** Bumped when the rules below change, so each saved check says which rules made it. */
export const OUTCOME_CHECK_VERSION = 'outcome-check-v2';
export const CHECK_MONTHS = [12, 24] as const;
export type CheckMonths = (typeof CHECK_MONTHS)[number];
/** The saved pull a check reads must be from this many days before the due day, or later. */
export const PULL_WINDOW_DAYS = 45;
/** "Stable" counts as met when the figure stays within this band: the larger of 0.5 units and 5% of the reference. */
export const STABLE_BAND = { units: 0.5, share: 0.05 } as const;

export type CheckVerdict = 'hit' | 'miss' | 'too_early' | 'missing';

export const VERDICT_LABEL: Record<CheckVerdict, string> = {
  hit: 'Hit',
  miss: 'Miss',
  too_early: 'Too early',
  missing: 'Missing',
};

export interface CheckSide {
  value: number | null;
  period: string;
  source: string;
  pullDate: string;
}

export type WarningResult = 'shown' | 'not_shown' | 'too_early' | 'missing';

export const WARNING_LABEL: Record<WarningResult, string> = {
  shown: 'Warning shown',
  not_shown: 'No warning',
  too_early: 'Too early',
  missing: 'Missing',
};

export interface WarningCheck {
  ref: number;
  label: string;
  signal: EarlyWarning['signal'];
  result: WarningResult;
  reason: string;
}

export interface OutcomeCheck {
  version: string;
  months: CheckMonths;
  /** As of + months (YYYY-MM-DD). */
  due: string;
  /** The day the check was made (YYYY-MM-DD); later than due when the app was not running then. */
  checkedOn: string;
  /** Hash of the frame the check judged; a frame changed later keeps its old checks. */
  frameHash: string;
  goal: { indicator: string; direction: GoalDirection; target?: string; unit?: string };
  verdict: CheckVerdict;
  /** What the result was judged on: the target, the direction from the start, or the stable band. */
  basis?: 'target' | 'direction';
  reason: string;
  then?: CheckSide;
  now?: CheckSide;
  /** The target read as a number (or a range), when there is one. */
  targetRange?: [number, number];
  /** The recommended option's early-warning figures (pre-mortem), each judged the same way (v2 on). */
  warnings?: WarningCheck[];
  /** Hash of the check before this one in the same review. */
  prevHash?: string;
  hash: string;
}

export type UnsavedCheck = Omit<OutcomeCheck, 'hash' | 'prevHash'>;

const DAY_MS = 86_400_000;

/** "2026-01-31" + 1 month -> "2026-02-28": the same day of the month, or the month's last day. */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export const daysBefore = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

/**
 * The target as a number, or a range: "3%" -> [3, 3]; "below 60% of GDP" -> [60, 60];
 * "2-3%" or "2 to 3" -> [2, 3]; "-3% of GDP" -> [-3, -3]. Null when no number is written.
 */
export function parseTarget(text: string | undefined): [number, number] | null {
  if (!text) return null;
  const t = text.replace(/−/g, '-').replace(/—/g, '–').replace(/,/g, '');
  const range = /(-?\d+(?:\.\d+)?)\s*(?:–|to|-)\s*(-?\d+(?:\.\d+)?)/i.exec(t);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return a <= b ? [a, b] : [b, a];
  }
  const one = /-?\d+(?:\.\d+)?/.exec(t);
  return one ? [Number(one[0]), Number(one[0])] : null;
}

const band = (ref: number) => Math.max(STABLE_BAND.units, Math.abs(ref) * STABLE_BAND.share);
const fmt = (v: number, unit: string) => `${Math.round(v * 100) / 100}${unit.startsWith('%') ? unit : unit ? ` ${unit}` : ''}`;
const sideOf = (x: DiagnosisFigure, pullDate: string): CheckSide => ({ value: x.value, period: x.period, source: x.source, pullDate });

/** The checks a review is owed on `today` for its current frame and not yet made. */
export function dueChecks(review: Pick<PolicyReview, 'steps'> & { outcomeChecks?: OutcomeCheck[] }, today: string): Array<{ months: CheckMonths; due: string }> {
  const frame = review.steps.frame?.content as ReviewFrame | undefined;
  const frameHash = review.steps.frame?.hash;
  if (!frame || !frameHash) return [];
  const made = new Set((review.outcomeChecks ?? []).filter((c) => c.frameHash === frameHash).map((c) => c.months));
  return CHECK_MONTHS.map((months) => ({ months, due: addMonths(frame.asOf, months) })).filter((c) => c.due <= today && !made.has(c.months));
}

/** The next check still to come for the current frame, if any. */
export function nextCheck(review: Pick<PolicyReview, 'steps'> & { outcomeChecks?: OutcomeCheck[] }, today: string): { months: CheckMonths; due: string } | null {
  const frame = review.steps.frame?.content as ReviewFrame | undefined;
  if (!frame) return null;
  const c = CHECK_MONTHS.map((months) => ({ months, due: addMonths(frame.asOf, months) })).find((x) => x.due > today);
  return c ?? null;
}

/**
 * Judges one check. `then` is the review's saved Diagnose step (null when it was never run or is out
 * of date); `now` is the diagnosis built from the saved pull on or before the due day (null when
 * there is none).
 */
export function judgeCheck(input: { frame: ReviewFrame; frameHash: string; months: CheckMonths; then: Diagnosis | null; now: Diagnosis | null; checkedOn: string; warnings?: EarlyWarning[] }): UnsavedCheck {
  const core = judgeGoal(input);
  if (!input.warnings?.length) return core;
  return { ...core, warnings: judgeWarnings(input.warnings, input.then, input.now, core.due, input.frame.iso3) };
}

/** Each early-warning figure: did it move the way that signals failure, from the start to the pull read? */
export function judgeWarnings(warnings: EarlyWarning[], then: Diagnosis | null, now: Diagnosis | null, due: string, iso3: string): WarningCheck[] {
  const earliest = daysBefore(due, PULL_WINDOW_DAYS);
  return warnings.map((w) => {
    const start = then?.figures.find((f) => f.ref === w.ref);
    const label = (start?.label ?? `Figure [${w.ref}]`).replace(/ \(.*\)$/, '');
    const base = { ref: w.ref, label, signal: w.signal };
    if (!start || start.value === null) return { ...base, result: 'missing' as const, reason: `No starting figure${start?.reason ? `: ${start.reason}` : ''}.` };
    if (!now || now.pullDate < earliest) return { ...base, result: 'missing' as const, reason: `No saved pull for ${iso3} in the ${PULL_WINDOW_DAYS} days before ${due}.` };
    const end = now.figures.find((f) => f.field === start.field);
    if (!end || end.value === null) return { ...base, result: 'missing' as const, reason: `No figure on ${now.pullDate}${end?.reason ? `: ${end.reason}` : ''}.` };
    if (start.period && end.period === start.period) return { ...base, result: 'too_early' as const, reason: `Still the ${start.period} figure.` };
    const change = Math.round((end.value - start.value) * 100) / 100;
    const shown = w.signal === 'rises' ? change > 0 : change < 0;
    return { ...base, result: shown ? ('shown' as const) : ('not_shown' as const), reason: `${fmt(start.value, start.unit)} (${start.period || then!.pullDate}) to ${fmt(end.value, end.unit)} (${end.period || now.pullDate}); a warning if it ${w.signal}.` };
  });
}

function judgeGoal(input: { frame: ReviewFrame; frameHash: string; months: CheckMonths; then: Diagnosis | null; now: Diagnosis | null; checkedOn: string }): UnsavedCheck {
  const { frame, frameHash, months, then, now, checkedOn } = input;
  const due = addMonths(frame.asOf, months);
  const goal = { indicator: frame.goal.indicator, direction: frame.goal.direction, ...(frame.goal.target ? { target: frame.goal.target } : {}) };
  const base = { version: OUTCOME_CHECK_VERSION, months, due, checkedOn, frameHash, goal };
  const missing = (reason: string, extra: Partial<UnsavedCheck> = {}): UnsavedCheck => ({ ...base, verdict: 'missing', reason, ...extra });

  if (!then) return missing('Diagnose was not run (or is out of date), so there is no starting figure to compare with.');
  const start = goalFigure(frame, then);
  if (!start) return missing(`"${frame.goal.indicator}" is not one of the standard indicators, so the app cannot check it.`);
  const unit = start.unit;
  const withUnit = { ...base, goal: { ...goal, ...(unit ? { unit } : {}) } };
  const thenSide = sideOf(start, then.pullDate);
  if (start.value === null) return { ...withUnit, verdict: 'missing', reason: `No starting figure: ${start.reason || 'missing in the pull the review started from'}.`, then: thenSide };
  if (!now) return { ...withUnit, verdict: 'missing', reason: `No saved pull for ${frame.iso3} on or before ${due}.`, then: thenSide };
  const earliest = daysBefore(due, PULL_WINDOW_DAYS);
  if (now.pullDate < earliest) {
    return { ...withUnit, verdict: 'missing', reason: `No saved pull for ${frame.iso3} in the ${PULL_WINDOW_DAYS} days before ${due}; the latest before it is from ${now.pullDate}.`, then: thenSide };
  }
  const end = now.figures.find((x) => x.field === start.field);
  const nowSide: CheckSide = end ? sideOf(end, now.pullDate) : { value: null, period: '', source: '', pullDate: now.pullDate };
  if (!end || end.value === null) return { ...withUnit, verdict: 'missing', reason: `No figure on ${now.pullDate}: ${end?.reason || 'not in that pull'}.`, then: thenSide, now: nowSide };
  if (start.period && end.period === start.period) {
    return { ...withUnit, verdict: 'too_early', reason: `No newer figure yet: the pull of ${now.pullDate} still has the ${start.period} figure the review started from.`, then: thenSide, now: nowSide };
  }

  const v = end.value;
  const from = start.value;
  const range = parseTarget(frame.goal.target);
  const label = `${start.label.replace(/ \(.*\)$/, '')} ${fmt(v, unit)} (${end.period || now.pullDate})`;
  let hit: boolean;
  let reason: string;
  if (range) {
    const [lo, hi] = range;
    const t = lo === hi ? fmt(lo, unit) : `${fmt(lo, unit)} to ${fmt(hi, unit)}`;
    if (frame.goal.direction === 'lower') hit = v <= hi;
    else if (frame.goal.direction === 'higher') hit = v >= lo;
    else hit = lo === hi ? Math.abs(v - lo) <= band(lo) : v >= lo && v <= hi;
    const rule = frame.goal.direction === 'lower' ? `at or below ${fmt(hi, unit)}` : frame.goal.direction === 'higher' ? `at or above ${fmt(lo, unit)}` : lo === hi ? `within ${fmt(band(lo), unit)} of ${t}` : `between ${t}`;
    reason = `${label} against the target "${frame.goal.target}" (${rule}): ${hit ? 'met' : 'not met'}.`;
    return { ...withUnit, verdict: hit ? 'hit' : 'miss', basis: 'target', reason, then: thenSide, now: nowSide, targetRange: range };
  }
  const change = Math.round((v - from) * 100) / 100;
  if (frame.goal.direction === 'lower') hit = v < from;
  else if (frame.goal.direction === 'higher') hit = v > from;
  else hit = Math.abs(v - from) <= band(from);
  const want = frame.goal.direction === 'lower' ? 'lower' : frame.goal.direction === 'higher' ? 'higher' : `within ${fmt(band(from), unit)} of the start`;
  reason = `${label}, from ${fmt(from, unit)} (${start.period || then.pullDate}): a change of ${change > 0 ? '+' : ''}${change}. No number in the target, so judged on the direction (${want}): ${hit ? 'met' : 'not met'}.`;
  return { ...withUnit, verdict: hit ? 'hit' : 'miss', basis: 'direction', reason, then: thenSide, now: nowSide };
}

export interface CheckTally {
  hit: number;
  miss: number;
  too_early: number;
  missing: number;
}

export function tallyChecks(checks: OutcomeCheck[]): CheckTally {
  const t: CheckTally = { hit: 0, miss: 0, too_early: 0, missing: 0 };
  for (const c of checks) t[c.verdict] += 1;
  return t;
}

/** One line for the track record: hits out of the checks that could be judged, small samples said as such. */
export function tallySentence(t: CheckTally): string {
  const judged = t.hit + t.miss;
  const total = judged + t.too_early + t.missing;
  if (!total) return 'No outcome checks yet. The first comes 12 months after a review\'s As of day.';
  const rest = [t.too_early ? `${t.too_early} too early` : '', t.missing ? `${t.missing} missing` : ''].filter(Boolean).join(', ');
  const rate = judged ? ` The goal was met in ${t.hit} of ${judged} (${Math.round((100 * t.hit) / judged)}%).` : ' None could be judged yet.';
  const small = judged > 0 && judged < 10 ? ' Fewer than 10 judged checks: too few to read a rate from.' : '';
  return `${total} outcome check${total === 1 ? '' : 's'}: ${t.hit} hit, ${t.miss} miss${rest ? `, ${rest}` : ''}.${rate}${small}`;
}

export const OUTCOME_CHECK_CAVEAT =
  'Each check records only whether the goal written in the frame was met at 12 and 24 months. The app does not know whether the advice was followed, and what happened afterwards is not what the advice caused. Figures may be revised after a check; the check keeps the figure the app held then.';
