import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { PolicyReview, ReviewFrame } from '../src/utils/policyReview';
import type { Diagnosis } from '../src/utils/reviewDiagnosis';
import type { OptionsStep, PolicyOption } from '../src/utils/reviewOptions';
import type { EvidenceStep } from '../src/utils/reviewEvidence';
import { BRIEF_LANGS, BRIEF_TEXT, asBriefLang, briefFigures, briefLines, plainBrief, plainBriefFileName } from '../src/utils/plainBrief';
import { plainBriefPdf } from '../src/utils/plainBriefPdf';
import { EXPORT_NOTICE } from '../src/utils/disclaimer';
import { REPORTS } from '../src/i18n/messages/reports';

const frame: ReviewFrame = { iso3: 'BRA', problem: 'Inflation is above target and growth is slowing.', goal: { indicator: 'Inflation', direction: 'lower', target: '3%', by: '2027-12' }, constraints: [], asOf: '2026-11-01', audience: 'Monetary policy committee' };
const fig = (ref: number, label: string, value: number | null, unit = '%') => ({ ref, field: `f${ref}`, group: 'g', label, unit, value, status: value === null ? ('Missing' as const) : ('Live' as const), period: value === null ? '' : '2026', source: value === null ? '' : 'IMF WEO', reason: value === null ? 'IMF did not answer' : '' });
const d: Diagnosis = {
  iso3: 'BRA',
  asOf: '2026-11-01',
  pullDate: '2026-10-30',
  pulledAt: '',
  incomplete: false,
  figures: [fig(1, 'Inflation (IMF WEO)', 4.4), fig(2, 'Policy rate', null), fig(3, 'Fiscal multiplier, first year, low end', 0.2, 'ratio'), fig(4, 'Fiscal multiplier, first year, high end', 0.5, 'ratio'), fig(5, 'Unemployment', 7)],
  readings: [],
  coverage: '',
};
const opt = (rank: number, title: string, refs: number[]): PolicyOption => ({ rank, title, lever: 'fiscal', how: 'Cut spending slowly.', effect: 'Lower inflation.', timeToEffect: 'a year', tradeoffs: 'Slower growth.', whoBears: 'Public workers.', mustBeTrue: 'x', risks: 'Recession.', refs, views: {}, fromUser: false });
const o: OptionsStep = { templateVersion: 'v', model: 'm', temperature: 0, promptHash: 'p', options: [opt(1, 'Hold rates', [1]), opt(2, 'Fiscal tightening', [1, 3])], ranking: '', gaps: [], userOptions: [], removed: [] };
const e = { researchOnly: true } as EvidenceStep;
const rec = (content: unknown) => ({ content, savedAt: '2026-11-01T00:00:00Z', hash: 'h'.repeat(64) });
const review: Pick<PolicyReview, 'title' | 'steps'> = { title: 'BRA: lower Inflation to 3% (as of 2026-11-01)', steps: { frame: rec(frame), diagnose: rec(d), options: rec(o), evidence: rec(e) } };
const inputs = { recommended: 2, rationale: 'Room in the budget.', watch: [{ indicator: 'Policy rate [2]', trigger: 'early warning if it falls' }], reviewDate: '2027-05-01' };

test('figures: a cited low end brings its high end and reads as one range; Missing keeps its reason', () => {
  const f = briefFigures(d, [3, 1, 2], 'en');
  assert.deepEqual(f, [
    { refs: [1], label: 'Inflation (IMF WEO)', value: '4.4%', source: 'IMF WEO, 2026', missing: false },
    { refs: [2], label: 'Policy rate', value: 'Missing: IMF did not answer', source: '', missing: true },
    { refs: [3, 4], label: 'Fiscal multiplier, first year', value: '0.2 to 0.5 ratio', source: 'IMF WEO, 2026', missing: false },
  ]);
  assert.equal(briefFigures(d, [4], 'es')[0].value, '0.2 a 0.5 ratio');
  assert.deepEqual(briefFigures(d, [99], 'en'), []);
});

test('the brief: the question, the chosen option, its figures plus the watched ones, what to watch, same every time', () => {
  const b = plainBrief(review, inputs, 'en');
  assert.equal(b.question, frame.problem);
  assert.equal(b.goal, 'Inflation: lower, target 3%, by 2027-12');
  assert.equal(b.option.title, 'Fiscal tightening');
  assert.equal(b.option.rankLine, 'ranked 2 of 2 options');
  assert.deepEqual(b.figures.map((f) => f.refs), [[1], [2], [3, 4]]);
  assert.deepEqual(b.watch, ['Policy rate [2]: early warning if it falls']);
  assert.deepEqual(plainBrief(review, inputs, 'en'), b);
  const text = briefLines(b).map((l) => l.text);
  for (const s of ['The question', 'What is proposed', 'Who bears the cost: Public workers.', "Why this option (the principal's own words): Room in the budget.", '[3][4] Fiscal multiplier, first year: 0.2 to 0.5 ratio (IMF WEO, 2026)', 'Look again on 2027-05-01.', EXPORT_NOTICE]) assert.ok(text.includes(s), s);
  assert.ok(!text.includes(BRIEF_TEXT.en.savedText));
  assert.ok(!text.some((t) => t.includes('Unemployment')), 'figures not cited stay off');
});

test('every language has every fixed text, and non-English briefs say the review text is as saved', () => {
  const keys = Object.keys(BRIEF_TEXT.en).sort();
  for (const l of BRIEF_LANGS) assert.deepEqual(Object.keys(BRIEF_TEXT[l]).sort(), keys, l);
  for (const l of ['es', 'fr', 'pt'] as const) {
    const lines = briefLines(plainBrief(review, inputs, l)).map((x) => x.text);
    assert.ok(lines.includes(BRIEF_TEXT[l].savedText));
    assert.ok(lines.includes(BRIEF_TEXT[l].notice));
    assert.ok(lines[0].startsWith(BRIEF_TEXT[l].title));
  }
  assert.equal(plainBrief(review, inputs, 'es').goal, 'Inflation: más bajo, meta 3%, para 2027-12');
  assert.equal(asBriefLang('fr'), 'fr');
  assert.equal(asBriefLang('ar'), 'en');
  assert.equal(plainBriefFileName(review.title, 'pt'), 'policy-brief-BRA-lower-Inflation-to-3-as-of-2026-11-01-pt.pdf');
});

test('the PDF is one page; very long text shrinks, then is cut with a note, the notice still printed', async () => {
  const short = await plainBriefPdf(plainBrief(review, inputs, 'fr'), '2026-11-01T10:00:00Z', 'a'.repeat(64));
  assert.equal(short.pages, 1);
  assert.equal(short.size, 10);
  assert.equal(short.cut, false);
  const head = new TextDecoder('latin1').decode(new Uint8Array(short.bytes).slice(0, 5));
  assert.equal(head, '%PDF-');
  const long = 'This sentence is long on purpose so the brief cannot fit at the normal size. '.repeat(60);
  const big = plainBrief({ ...review, steps: { ...review.steps, frame: rec({ ...frame, problem: long }) } }, inputs, 'en');
  const shrunk = await plainBriefPdf(big, '2026-11-01T10:00:00Z', 'a'.repeat(64));
  assert.equal(shrunk.pages, 1);
  assert.ok(shrunk.size < 10);
  const huge = plainBrief({ ...review, steps: { ...review.steps, frame: rec({ ...frame, problem: long.repeat(4) }) } }, inputs, 'en');
  const cut = await plainBriefPdf(huge, '2026-11-01T10:00:00Z', 'a'.repeat(64));
  assert.equal(cut.pages, 1);
  assert.equal(cut.cut, true);
  const raw = new TextDecoder('latin1').decode(new Uint8Array(cut.bytes));
  assert.ok(raw.includes('Cut to fit one page'));
  assert.ok(raw.includes('Research, not validated advice.'));
});

test('wiring: Policy review memo step has the one-page brief button, with text in every language', () => {
  const ui = readFileSync('src/components/PolicyReviews.tsx', 'utf8');
  assert.match(ui, /data-review-brief="true"/);
  assert.match(ui, /plainBriefPdf\(plainBrief\(r, memo\.inputs, asBriefLang\(lang\)\)/);
  assert.ok('pr_brief' in REPORTS.en && 'pr_briefTitle' in REPORTS.en);
});
