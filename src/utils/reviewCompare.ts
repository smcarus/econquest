/**
 * Review-to-review comparison (parked idea PC3, pulled forward by Sam on 13 November 2026): a review
 * started with "Review again" beside the review it came from. What changed in the frame (problem,
 * goal, constraints, As of day), each diagnosis figure then and now with the change, whether the goal
 * indicator moved the way the goal wants, and which option each memo recommended.
 *
 * What moved between two reviews is not what the first recommendation caused, and the app does not
 * know whether it was followed: the view says so. Browser-safe and pure.
 */
import type { PolicyReview, ReviewFrame } from './policyReview';
import type { Diagnosis } from './reviewDiagnosis';
import type { MemoStep } from './reviewMemo';
import type { OptionsStep } from './reviewOptions';
import { goalFigure, type GoalMove } from './reviewOutcomes';

export type FrameField = 'problem' | 'goal' | 'constraints' | 'audience';

export interface FrameChange {
  field: FrameField;
  before: string;
  after: string;
}

export interface CompareRow {
  ref: number;
  field: string;
  group: string;
  label: string;
  unit: string;
  before: number | null;
  beforePeriod: string;
  after: number | null;
  afterPeriod: string;
  change: number | null;
}

export interface ReviewComparison {
  earlier: { id: string; title: string; asOf: string; pullDate?: string };
  later: { id: string; title: string; asOf: string; pullDate?: string };
  frameChanges: FrameChange[];
  /** Diagnosis figures side by side, when both reviews have run Diagnose. */
  rows: CompareRow[];
  /** Which side has no diagnosis yet, when rows is empty. */
  rowsMissing?: 'earlier' | 'later' | 'both';
  goal?: { label: string; ref?: number; direction: ReviewFrame['goal']['direction']; move: GoalMove };
  recommended: { earlier?: string; later?: string };
}

const goalText = (f: ReviewFrame) => `${f.goal.direction} ${f.goal.indicator}${f.goal.target ? `, target ${f.goal.target}` : ''}${f.goal.by ? `, by ${f.goal.by}` : ''}`;

function recommendedTitle(r: PolicyReview): string | undefined {
  const memo = r.steps.memo?.content as MemoStep | undefined;
  const options = r.steps.options?.content as OptionsStep | undefined;
  if (!memo || !options) return undefined;
  const o = options.options.find((x) => x.rank === memo.inputs.recommended);
  return o ? o.title : undefined;
}

export function compareReviews(earlier: PolicyReview, later: PolicyReview): ReviewComparison | null {
  const fa = earlier.steps.frame?.content as ReviewFrame | undefined;
  const fb = later.steps.frame?.content as ReviewFrame | undefined;
  if (!fa || !fb) return null;
  const da = earlier.steps.diagnose?.content as Diagnosis | undefined;
  const db = later.steps.diagnose?.content as Diagnosis | undefined;

  const frameChanges: FrameChange[] = [];
  const diff = (field: FrameField, before: string, after: string) => {
    if (before.trim() !== after.trim()) frameChanges.push({ field, before, after });
  };
  diff('problem', fa.problem, fb.problem);
  diff('goal', goalText(fa), goalText(fb));
  diff('constraints', fa.constraints.join('; '), fb.constraints.join('; '));
  diff('audience', fa.audience ?? '', fb.audience ?? '');

  const out: ReviewComparison = {
    earlier: { id: earlier.id, title: earlier.title, asOf: fa.asOf, ...(da ? { pullDate: da.pullDate } : {}) },
    later: { id: later.id, title: later.title, asOf: fb.asOf, ...(db ? { pullDate: db.pullDate } : {}) },
    frameChanges,
    rows: [],
    recommended: { ...(recommendedTitle(earlier) ? { earlier: recommendedTitle(earlier) } : {}), ...(recommendedTitle(later) ? { later: recommendedTitle(later) } : {}) },
  };
  if (!da || !db) {
    out.rowsMissing = !da && !db ? 'both' : !da ? 'earlier' : 'later';
    return out;
  }
  out.rows = da.figures.map((a) => {
    const b = db.figures.find((x) => x.field === a.field);
    const after = b?.value ?? null;
    return {
      ref: a.ref,
      field: a.field,
      group: a.group,
      label: a.label,
      unit: a.unit,
      before: a.value,
      beforePeriod: a.value === null ? '' : a.period,
      after,
      afterPeriod: after === null ? '' : b!.period,
      change: a.value !== null && after !== null ? Math.round((after - a.value) * 100) / 100 : null,
    };
  });
  // The goal as the later review states it, judged on the same figure in both reviews.
  const g = goalFigure(fb, da);
  let move: GoalMove = 'no_match';
  if (g) {
    const row = out.rows.find((r) => r.ref === g.ref)!;
    if (row.change === null) move = 'missing';
    else if (fb.goal.direction === 'stable') move = Math.abs(row.change) < 1e-9 ? 'unchanged' : 'wrong_way';
    else if (row.change === 0) move = 'unchanged';
    else move = (row.change < 0) === (fb.goal.direction === 'lower') ? 'right_way' : 'wrong_way';
  }
  out.goal = { label: g?.label ?? fb.goal.indicator, ...(g ? { ref: g.ref } : {}), direction: fb.goal.direction, move };
  return out;
}
