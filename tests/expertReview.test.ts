import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expertCsv, expertSummaryMarkdown, parseExpertForm, tallyExpert, type ExpertAnswers, type ExpertReview } from '../src/utils/expertReview';
import { appendExpertReview, newReview, saveStep, setExpertConsent, verifyExpertReviews } from '../src/utils/policyReviewStore';
import { parseFrame, type PolicyReview, type ReviewFrame } from '../src/utils/policyReview';

const form = { reviewer: ' Ana  Ruiz ', role: 'Professor of economics', clarity: 4, evidence: '3', sources: 'all_correct', wouldAct: 'with_changes', comment: ' Clear, but say who pays.\nCite the IMF table. ', consent: 'anonymous' };

const withMemo = (): PolicyReview => {
  const p = parseFrame({ iso3: 'BRA', problem: 'Inflation is well above target.', goal: { indicator: 'Headline inflation', direction: 'lower' }, constraints: [], asOf: '2026-11-01' }, new Date('2026-11-05T00:00:00Z'));
  let r = newReview((p as { frame: ReviewFrame }).frame, []);
  for (const step of ['diagnose', 'options', 'evidence', 'memo'] as const) r = (saveStep(r, step, { step }) as { review: PolicyReview }).review;
  return r;
};

test('the form needs a name, a role, both scores, the two answers and a consent choice', () => {
  const bad = parseExpertForm({ reviewer: 'A', clarity: 6, evidence: 2.5, sources: 'maybe' });
  assert.ok('errors' in bad);
  const msg = (bad as { errors: string[] }).errors.join(' ');
  for (const m of [/name/, /role/, /clear/, /evidence/, /sources/, /act/, /published summary/]) assert.match(msg, m);
  const ok = parseExpertForm(form);
  assert.ok('answers' in ok);
  const a = ok as { answers: ExpertAnswers; consent: string };
  assert.equal(a.answers.reviewer, 'Ana Ruiz');
  assert.equal(a.answers.evidence, 3);
  assert.equal(a.answers.comment, 'Clear, but say who pays.\nCite the IMF table.');
  assert.equal(a.consent, 'anonymous');
});

test('a review is saved against the memo hash, chained, and consent can change without breaking the hash', () => {
  const p = parseFrame({ iso3: 'BRA', problem: 'Inflation is well above target.', goal: { indicator: 'Headline inflation', direction: 'lower' }, constraints: [], asOf: '2026-11-01' }, new Date('2026-11-05T00:00:00Z'));
  const noMemo = newReview((p as { frame: ReviewFrame }).frame, []);
  const { answers, consent } = parseExpertForm(form) as { answers: any; consent: any };
  assert.match((appendExpertReview(noMemo, answers, consent) as { error: string }).error, /memo first/);
  const r = withMemo();
  const one = appendExpertReview(r, answers, consent, new Date('2026-11-12T10:00:00Z'), 'Sam') as { review: PolicyReview; saved: ExpertReview };
  assert.equal(one.saved.memoHash, r.steps.memo!.hash);
  assert.equal(one.saved.account, 'Sam');
  const two = appendExpertReview(one.review, { ...answers, reviewer: 'Bo Li' }, 'named') as { review: PolicyReview; saved: ExpertReview };
  assert.equal(two.saved.prevHash, one.saved.hash);
  assert.deepEqual(verifyExpertReviews(two.review), []);
  const changed = setExpertConsent(two.review, 'x1', 'none') as { review: PolicyReview };
  assert.equal(changed.review.expertReviews![0].consent, 'none');
  assert.deepEqual(verifyExpertReviews(changed.review), [], 'consent is not part of the hash');
  const edited = { ...changed.review, expertReviews: [{ ...changed.review.expertReviews![0], clarity: 5 }, changed.review.expertReviews![1]] };
  assert.deepEqual(verifyExpertReviews(edited), ['x1'], 'an edit outside the app shows');
});

test('the published summary holds only consenting reviews and names only where chosen', () => {
  const base = { version: 'v', memoHash: 'a'.repeat(64), savedAt: '2026-11-12T10:00:00Z', hash: 'b'.repeat(64), role: 'Economist', sources: 'all_correct', wouldAct: 'yes', comment: '' } as const;
  const rows = [
    { reviewId: 'r1', title: 'BRA: lower inflation', r: { ...base, id: 'x1', reviewer: 'Kept Private', clarity: 1, evidence: 1, consent: 'none' } as ExpertReview },
    { reviewId: 'r1', title: 'BRA: lower inflation', r: { ...base, id: 'x2', reviewer: 'No Name', clarity: 4, evidence: 4, consent: 'anonymous', comment: 'Good.' } as ExpertReview },
    { reviewId: 'r1', title: 'BRA: lower inflation', r: { ...base, id: 'x3', reviewer: 'Ana Ruiz', clarity: 5, evidence: 3, consent: 'named', wouldAct: 'with_changes' } as ExpertReview },
  ];
  const md = expertSummaryMarkdown(rows, '2026-11-12');
  assert.doesNotMatch(md, /Kept Private|No Name/);
  assert.match(md, /Ana Ruiz, Economist/);
  assert.match(md, /Reviewer \(name withheld\)/);
  assert.match(md, /\| 2 \| 4\.5 \| 3\.5 \| 2 \| 0 \| 0 \| 1 \| 1 \| 0 \|/);
  assert.match(md, /Fewer than five reviews/);
  assert.match(md, /> Good\./);
  const t = tallyExpert(rows.map((x) => x.r));
  assert.equal(t.reviews, 3);
  assert.equal(t.consenting, 2);
  const csv = expertCsv(rows);
  assert.equal(csv.trim().split('\n').length, 4, 'the CSV on this computer has every review, with its consent');
  assert.match(csv, /Kept Private,Economist,1,1,all_correct,yes,,none/);
  assert.match(expertSummaryMarkdown([], '2026-11-12'), /No reviews with consent to publish yet/);
});
