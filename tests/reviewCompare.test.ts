import test from 'node:test';
import assert from 'node:assert/strict';
import { compareReviews } from '../src/utils/reviewCompare.ts';
import type { PolicyReview, ReviewFrame } from '../src/utils/policyReview.ts';
import type { Diagnosis, DiagnosisFigure } from '../src/utils/reviewDiagnosis.ts';
import { REPORTS } from '../src/i18n/messages/reports.ts';

const fig = (ref: number, field: string, label: string, value: number | null, period: string): DiagnosisFigure => ({
  ref, field, group: 'g', label, unit: '%', value, status: value === null ? 'Missing' : 'Live', period: value === null ? '' : period, source: 's', reason: value === null ? 'x' : '',
});
const diag = (pullDate: string, cpi: number | null, rate: number | null, period: string): Diagnosis => ({
  iso3: 'KEN', asOf: pullDate, pullDate, pulledAt: '', incomplete: false, readings: [], coverage: '',
  figures: [fig(1, 'imf.cpiInflationPct', 'Inflation', cpi, period), fig(2, 'market.policyRatePct', 'Policy rate', rate, period)],
});
const frame = (asOf: string, extra: Partial<ReviewFrame> = {}): ReviewFrame => ({ iso3: 'KEN', problem: 'Inflation is high', goal: { indicator: 'Inflation', direction: 'lower', target: '5' }, constraints: ['Peg'], asOf, ...extra });
const step = (content: unknown) => ({ content, savedAt: '', hash: 'h' }) as any;
const review = (id: string, f: ReviewFrame, d?: Diagnosis, recommended?: number): PolicyReview => ({
  id, title: id, templateVersion: 'v', createdAt: '', updatedAt: '', runs: [],
  steps: {
    frame: step(f),
    ...(d ? { diagnose: step(d) } : {}),
    ...(recommended ? { options: step({ options: [{ rank: 1, title: 'Raise the policy rate' }, { rank: 2, title: 'Cut spending' }] }), memo: step({ inputs: { recommended, watch: [], reviewDate: '', rationale: '' } }) } : {}),
  },
});

test('compareReviews sets frame changes, figures, goal move and recommendations side by side', () => {
  const a = review('a', frame('2026-01-10'), diag('2026-01-09', 9, 10, '2025'), 1);
  const b = review('b', frame('2026-11-10', { constraints: ['Peg', 'Election in 2027'], audience: 'Minister' }), diag('2026-11-09', 6.5, null, '2026'), 2);
  const c = compareReviews(a, b)!;
  assert.deepEqual(c.earlier, { id: 'a', title: 'a', asOf: '2026-01-10', pullDate: '2026-01-09' });
  assert.deepEqual(c.later, { id: 'b', title: 'b', asOf: '2026-11-10', pullDate: '2026-11-09' });
  assert.deepEqual(c.frameChanges, [
    { field: 'constraints', before: 'Peg', after: 'Peg; Election in 2027' },
    { field: 'audience', before: '', after: 'Minister' },
  ]);
  assert.deepEqual(c.rows.map((r) => [r.ref, r.before, r.after, r.change, r.beforePeriod, r.afterPeriod]), [
    [1, 9, 6.5, -2.5, '2025', '2026'],
    [2, 10, null, null, '2025', ''],
  ]);
  assert.deepEqual(c.goal, { label: 'Inflation', ref: 1, direction: 'lower', move: 'right_way' });
  assert.deepEqual(c.recommended, { earlier: 'Raise the policy rate', later: 'Cut spending' });
});

test('compareReviews says which side lacks a diagnosis, and notes a changed goal', () => {
  const a = review('a', frame('2026-01-10'), diag('2026-01-09', 9, 10, '2025'));
  const b = review('b', frame('2026-11-10', { goal: { indicator: 'Inflation', direction: 'lower', target: '4' } }));
  const c = compareReviews(a, b)!;
  assert.equal(c.rowsMissing, 'later');
  assert.deepEqual(c.rows, []);
  assert.equal(c.goal, undefined);
  assert.deepEqual(c.frameChanges.map((x) => x.field), ['goal']);
  assert.deepEqual(c.recommended, {});
  assert.equal(compareReviews(review('x', frame('2026-01-01')), review('y', frame('2026-02-01')))!.rowsMissing, 'both');
  const noFrame = { ...a, steps: {} } as PolicyReview;
  assert.equal(compareReviews(noFrame, b), null);
});

test('compareReviews goal moves the wrong way, and a stable goal', () => {
  const a = review('a', frame('2026-01-10'), diag('2026-01-09', 5, 10, '2025'));
  assert.equal(compareReviews(a, review('b', frame('2026-11-10'), diag('2026-11-09', 7, 10, '2026')))!.goal!.move, 'wrong_way');
  assert.equal(compareReviews(a, review('b', frame('2026-11-10', { goal: { indicator: 'Policy rate', direction: 'stable' } }), diag('2026-11-09', 7, 10, '2026')))!.goal!.move, 'unchanged');
});

test('Review-to-review comparison has its text', () => {
  for (const k of ['prc_summary', 'prc_caveat', 'prc_beforeAfter', 'prc_goal'] as const) assert.ok(k in REPORTS.en, k);
});
