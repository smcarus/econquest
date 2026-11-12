/**
 * Expert review round (roadmap P4): a short structured form that a pilot economist or professor
 * fills for one policy review's memo. Five questions: how clear it is, how well it uses evidence,
 * whether the sources are correct, whether they would act on it, and a free comment.
 *
 * Each review is saved with the policy review on this computer (data/local/reviews.json), tied to
 * the hash of the memo it read, hash chained like the outcome checks and written to the audit log.
 * The reviewer chooses whether it may appear in the published summary (docs/validation/
 * expert-reviews.md, written by `npm run reviews:summary`): not at all, without their name, or with
 * their name. Only reviews with consent go in; the consent can be changed later.
 *
 * The app never scores the reviewer or the review. Browser-safe.
 */

export const EXPERT_TEMPLATE_VERSION = 'expert-review-v1';
export const MAX_EXPERT_REVIEWS = 50;

export const SOURCES_ANSWERS = ['all_correct', 'some_wrong', 'not_checked'] as const;
export type SourcesAnswer = (typeof SOURCES_ANSWERS)[number];
export const SOURCES_LABEL: Record<SourcesAnswer, string> = {
  all_correct: 'Yes, the ones I checked are correct',
  some_wrong: 'Some are wrong or do not say what the memo says',
  not_checked: 'I did not check them',
};

export const ACT_ANSWERS = ['yes', 'with_changes', 'no'] as const;
export type ActAnswer = (typeof ACT_ANSWERS)[number];
export const ACT_LABEL: Record<ActAnswer, string> = {
  yes: 'Yes, as written',
  with_changes: 'Yes, with changes',
  no: 'No',
};

export const CONSENTS = ['none', 'anonymous', 'named'] as const;
export type Consent = (typeof CONSENTS)[number];
export const CONSENT_LABEL: Record<Consent, string> = {
  none: 'Keep it on this computer only',
  anonymous: 'May go in the published summary, without my name',
  named: 'May go in the published summary, with my name and role',
};

/** The 1 to 5 scale used for clarity and use of evidence. */
export const SCALE_LABEL: Record<number, string> = {
  1: 'Poor',
  2: 'Weak',
  3: 'Adequate',
  4: 'Good',
  5: 'Excellent',
};

export interface ExpertAnswers {
  reviewer: string;
  /** E.g. "Professor of economics" or "Central bank economist". */
  role: string;
  clarity: number;
  evidence: number;
  sources: SourcesAnswer;
  wouldAct: ActAnswer;
  comment: string;
}

/** What is hashed: the answers, the memo they read and when. */
export interface UnsavedExpertReview extends ExpertAnswers {
  version: string;
  memoHash: string;
  savedAt: string;
  /** The signed-in account that saved it, when sign-in is on. */
  account?: string;
}

export interface ExpertReview extends UnsavedExpertReview {
  id: string;
  /** May change after saving; not part of the hash. */
  consent: Consent;
  consentChangedAt?: string;
  prevHash?: string;
  hash: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max) : '');
const scale = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5 ? Number(v) : null;

/** Checks the form. Returns every reason it cannot be saved. */
export function parseExpertForm(v: unknown): { answers: ExpertAnswers; consent: Consent } | { errors: string[] } {
  const f = (v ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const reviewer = str(f.reviewer, 80);
  if (reviewer.length < 2) errors.push('Write your name.');
  const role = str(f.role, 120);
  if (role.length < 2) errors.push('Write your role (for example "Professor of economics").');
  const clarity = scale(f.clarity);
  if (clarity === null) errors.push('Score how clear the memo is, from 1 to 5.');
  const evidence = scale(f.evidence);
  if (evidence === null) errors.push('Score how well it uses evidence, from 1 to 5.');
  const sources = SOURCES_ANSWERS.find((s) => s === f.sources);
  if (!sources) errors.push('Say whether the sources are correct.');
  const wouldAct = ACT_ANSWERS.find((s) => s === f.wouldAct);
  if (!wouldAct) errors.push('Say whether you would act on it.');
  const consent = CONSENTS.find((s) => s === f.consent);
  if (!consent) errors.push('Choose whether the review may go in the published summary.');
  const comment = typeof f.comment === 'string' ? f.comment.trim().slice(0, 2000) : '';
  if (errors.length) return { errors };
  return { answers: { reviewer, role, clarity: clarity!, evidence: evidence!, sources: sources!, wouldAct: wouldAct!, comment }, consent: consent! };
}

export interface ExpertTally {
  reviews: number;
  /** Reviews whose reviewer agreed to the published summary. */
  consenting: number;
  meanClarity: number | null;
  meanEvidence: number | null;
  sources: Record<SourcesAnswer, number>;
  wouldAct: Record<ActAnswer, number>;
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Counts and means over the reviews given (pass only consenting ones for the published summary). */
export function tallyExpert(reviews: ExpertReview[]): ExpertTally {
  const sources = { all_correct: 0, some_wrong: 0, not_checked: 0 };
  const wouldAct = { yes: 0, with_changes: 0, no: 0 };
  for (const r of reviews) {
    sources[r.sources] += 1;
    wouldAct[r.wouldAct] += 1;
  }
  return {
    reviews: reviews.length,
    consenting: reviews.filter((r) => r.consent !== 'none').length,
    meanClarity: mean(reviews.map((r) => r.clarity)),
    meanEvidence: mean(reviews.map((r) => r.evidence)),
    sources,
    wouldAct,
  };
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const EXPERT_CSV_HEADER = ['policy_review', 'review_title', 'saved_at', 'reviewer', 'role', 'clarity_1_5', 'use_of_evidence_1_5', 'sources', 'would_act', 'comment', 'consent', 'memo_hash', 'hash'];

/** CSV of the reviews, one row each. Every review on this computer; the consent column says which may be published. */
export function expertCsv(rows: Array<{ reviewId: string; title: string; r: ExpertReview }>): string {
  const lines = [EXPERT_CSV_HEADER.join(',')];
  for (const { reviewId, title, r } of rows)
    lines.push([reviewId, title, r.savedAt, r.reviewer, r.role, r.clarity, r.evidence, r.sources, r.wouldAct, r.comment, r.consent, r.memoHash, r.hash].map(csvCell).join(','));
  return lines.join('\n') + '\n';
}

/** docs/validation/expert-reviews.md: only reviews with consent; names only where the reviewer chose "named". */
export function expertSummaryMarkdown(rows: Array<{ reviewId: string; title: string; r: ExpertReview }>, writtenOn: string): string {
  const shown = rows.filter((x) => x.r.consent !== 'none');
  const t = tallyExpert(shown.map((x) => x.r));
  const out = [
    '# Expert reviews of policy review memos (P4)',
    '',
    'Pilot economists and professors filled a short form for one policy review memo each: how clear it is, how well it uses evidence, whether the sources are correct, whether they would act on it, and a free comment. Only reviews whose reviewer agreed to publication are listed; a name appears only where the reviewer chose it. The app does not score reviewers or reviews.',
    '',
    `_Written by \`npm run reviews:summary\` on ${writtenOn} from data/local/reviews.json. Edit the reviews in the app, not this file._`,
    '',
  ];
  if (!shown.length) {
    out.push('No reviews with consent to publish yet.', '');
    return out.join('\n');
  }
  out.push(
    '## Summary',
    '',
    `| Reviews | Mean clarity (1-5) | Mean use of evidence (1-5) | Sources correct | Some sources wrong | Sources not checked | Would act as written | Would act with changes | Would not act |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    `| ${t.reviews} | ${t.meanClarity ?? 'Missing'} | ${t.meanEvidence ?? 'Missing'} | ${t.sources.all_correct} | ${t.sources.some_wrong} | ${t.sources.not_checked} | ${t.wouldAct.yes} | ${t.wouldAct.with_changes} | ${t.wouldAct.no} |`,
    ''
  );
  if (t.reviews < 5) out.push('Fewer than five reviews: too few to read the means as more than individual views.', '');
  out.push('## Reviews', '');
  for (const { title, r } of shown) {
    const who = r.consent === 'named' ? `${r.reviewer}, ${r.role}` : 'Reviewer (name withheld)';
    out.push(`### ${title}`, '', `${who}. ${r.savedAt.slice(0, 10)}. Memo hash ${r.memoHash.slice(0, 12)}.`, '');
    out.push(`- Clarity: ${r.clarity} of 5 (${SCALE_LABEL[r.clarity]})`, `- Use of evidence: ${r.evidence} of 5 (${SCALE_LABEL[r.evidence]})`, `- Sources: ${SOURCES_LABEL[r.sources]}`, `- Would act on it: ${ACT_LABEL[r.wouldAct]}`);
    if (r.comment) out.push('', ...r.comment.split('\n').map((l) => `> ${l}`));
    out.push('');
  }
  return out.join('\n');
}
