import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyReview, ReviewFrame } from '../src/utils/policyReview';
import type { Diagnosis } from '../src/utils/reviewDiagnosis';
import { addMonths, dueChecks, judgeCheck, nextCheck, parseTarget, tallyChecks, tallySentence, OUTCOME_CHECK_CAVEAT } from '../src/utils/outcomeChecks';
import { appendOutcomeCheck, newReview, verifyOutcomeChecks } from '../src/utils/policyReviewStore';

const frame: ReviewFrame = { iso3: 'BRA', problem: 'Inflation is above target and growth is slowing.', goal: { indicator: 'Inflation', direction: 'lower', target: '3%' }, constraints: [], asOf: '2026-01-31' };
const fig = (value: number | null, period: string) => ({ ref: 1, field: 'imf.cpiInflationPct', group: 'g', label: 'Inflation (IMF WEO)', unit: '%', value, status: value === null ? ('Missing' as const) : ('Live' as const), period: value === null ? '' : period, source: value === null ? '' : 'IMF WEO', reason: value === null ? 'IMF did not answer' : '' });
const diag = (pullDate: string, cpi: number | null, period: string): Diagnosis => ({ iso3: 'BRA', asOf: pullDate, pullDate, pulledAt: '', incomplete: false, figures: [fig(cpi, period)], readings: [], coverage: '' });
const start = diag('2026-01-30', 4.4, '2025');
const judge = (now: Diagnosis | null, f: ReviewFrame = frame, then: Diagnosis | null = start) => judgeCheck({ frame: f, frameHash: 'h', months: 12, then, now, checkedOn: '2027-02-01' });

test('due days: same day of the month, or the last day of a shorter month', () => {
  assert.equal(addMonths('2026-01-31', 12), '2027-01-31');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2027-02-28', 24), '2029-02-28');
  assert.equal(addMonths('2026-11-11', 14), '2028-01-11');
});

test('targets read as a number or a range', () => {
  assert.deepEqual(parseTarget('3%'), [3, 3]);
  assert.deepEqual(parseTarget('below 60% of GDP'), [60, 60]);
  assert.deepEqual(parseTarget('2-3%'), [2, 3]);
  assert.deepEqual(parseTarget('4 to 2.5'), [2.5, 4]);
  assert.deepEqual(parseTarget('−3% of GDP'), [-3, -3]);
  assert.equal(parseTarget('as low as possible'), null);
  assert.equal(parseTarget(undefined), null);
});

test('hit and miss against the target, with the reason', () => {
  const hit = judge(diag('2027-01-25', 2.9, '2026'));
  assert.equal(hit.verdict, 'hit');
  assert.equal(hit.basis, 'target');
  assert.match(hit.reason, /Inflation 2\.9% \(2026\) against the target "3%" \(at or below 3%\): met/);
  assert.equal(hit.due, '2027-01-31');
  assert.equal(hit.now?.source, 'IMF WEO');
  const miss = judge(diag('2027-01-25', 3.6, '2026'));
  assert.equal(miss.verdict, 'miss');
  assert.match(miss.reason, /not met/);
  assert.equal(judge(diag('2027-01-25', 54, '2026'), { ...frame, goal: { indicator: 'Inflation', direction: 'higher', target: '50' } }).verdict, 'hit');
  const band = { ...frame, goal: { indicator: 'Inflation', direction: 'stable' as const, target: '4' } };
  assert.equal(judge(diag('2027-01-25', 4.4, '2026'), band).verdict, 'hit');
  assert.equal(judge(diag('2027-01-25', 4.6, '2026'), band).verdict, 'miss');
  assert.equal(judge(diag('2027-01-25', 2.5, '2026'), { ...frame, goal: { indicator: 'Inflation', direction: 'stable', target: '2-3%' } }).verdict, 'hit');
});

test('with no number in the target, the direction from the start decides', () => {
  const f = { ...frame, goal: { indicator: 'Inflation', direction: 'lower' as const } };
  const c = judge(diag('2027-01-25', 4.1, '2026'), f);
  assert.equal(c.verdict, 'hit');
  assert.equal(c.basis, 'direction');
  assert.match(c.reason, /a change of -0\.3\. No number in the target, so judged on the direction \(lower\): met/);
  assert.equal(judge(diag('2027-01-25', 4.4, '2026'), f).verdict, 'miss');
});

test('too early when the latest figure is still for the starting period', () => {
  const c = judge(diag('2027-01-25', 4.4, '2025'));
  assert.equal(c.verdict, 'too_early');
  assert.match(c.reason, /still has the 2025 figure/);
});

test('missing, each with its reason', () => {
  assert.match(judge(diag('2027-01-25', 3, '2026'), frame, null).reason, /Diagnose was not run/);
  assert.equal(judge(diag('2027-01-25', 3, '2026'), { ...frame, goal: { indicator: 'Unemployment', direction: 'lower' } }).verdict, 'missing');
  assert.match(judge(diag('2027-01-25', 3, '2026'), frame, diag('2026-01-30', null, '')).reason, /No starting figure: IMF did not answer/);
  assert.match(judge(null).reason, /No saved pull for BRA on or before 2027-01-31/);
  const stale = judge(diag('2026-11-01', 3, '2026'));
  assert.equal(stale.verdict, 'missing');
  assert.match(stale.reason, /in the 45 days before 2027-01-31; the latest before it is from 2026-11-01/);
  assert.match(judge(diag('2027-01-25', null, '')).reason, /No figure on 2027-01-25: IMF did not answer/);
});

test('due checks: 12 and 24 months, once each per frame', () => {
  const r = newReview(frame, [], new Date('2026-02-01T00:00:00Z'));
  assert.deepEqual(dueChecks(r, '2027-01-30'), []);
  assert.deepEqual(nextCheck(r, '2027-01-30'), { months: 12, due: '2027-01-31' });
  assert.deepEqual(dueChecks(r, '2028-02-01'), [{ months: 12, due: '2027-01-31' }, { months: 24, due: '2028-01-31' }]);
  const one = appendOutcomeCheck(r, judgeCheck({ frame, frameHash: r.steps.frame!.hash, months: 12, then: start, now: diag('2027-01-25', 2.9, '2026'), checkedOn: '2027-01-31' }));
  assert.deepEqual(dueChecks(one, '2028-02-01'), [{ months: 24, due: '2028-01-31' }]);
  assert.equal(nextCheck(one, '2028-02-01'), null);
  // A check made for an earlier frame does not count for the new one.
  assert.equal(dueChecks({ ...one, steps: { ...one.steps, frame: { ...one.steps.frame!, hash: 'other' } } }, '2027-02-01').length, 1);
});

test('checks are chained by hash and a changed one shows', () => {
  const r = newReview(frame, [], new Date('2026-02-01T00:00:00Z'));
  const a = appendOutcomeCheck(r, judge(diag('2027-01-25', 2.9, '2026')));
  const b = appendOutcomeCheck(a, { ...judge(diag('2028-01-25', 3.4, '2027')), months: 24 });
  assert.equal(b.outcomeChecks!.length, 2);
  assert.equal(b.outcomeChecks![1].prevHash, b.outcomeChecks![0].hash);
  assert.equal(b.updatedAt, r.updatedAt, 'adding a check does not move the review up the list');
  assert.deepEqual(verifyOutcomeChecks(JSON.parse(JSON.stringify(b)) as PolicyReview), []);
  const edited = JSON.parse(JSON.stringify(b)) as PolicyReview;
  edited.outcomeChecks![0].verdict = 'miss';
  assert.deepEqual(verifyOutcomeChecks(edited), [0]);
  const dropped = { ...b, outcomeChecks: [b.outcomeChecks![1]] };
  assert.deepEqual(verifyOutcomeChecks(dropped), [0], 'a removed check breaks the chain');
});

test('tally: hits out of judged checks, small samples said as such', () => {
  assert.match(tallySentence(tallyChecks([])), /No outcome checks yet/);
  const checks = [judge(diag('2027-01-25', 2.9, '2026')), judge(diag('2027-01-25', 3.6, '2026')), judge(diag('2027-01-25', 4.4, '2025')), judge(null)].map((c) => ({ ...c, hash: 'x' }));
  const t = tallyChecks(checks);
  assert.deepEqual(t, { hit: 1, miss: 1, too_early: 1, missing: 1 });
  assert.equal(tallySentence(t), '4 outcome checks: 1 hit, 1 miss, 1 too early, 1 missing. The goal was met in 1 of 2 (50%). Fewer than 10 judged checks: too few to read a rate from.');
  assert.match(OUTCOME_CHECK_CAVEAT, /not what the advice caused/);
});

test('early warnings from the pre-mortem are judged at each check', () => {
  const two = (pullDate: string, cpi: number | null, rate: number | null, period: string): Diagnosis => ({ ...diag(pullDate, cpi, period), figures: [fig(cpi, period), { ...fig(rate, period), ref: 2, field: 'market.policyRatePct', label: 'Policy rate' }] });
  const c = judgeCheck({ frame, frameHash: 'h', months: 12, then: two('2026-01-30', 4.4, 13, '2025'), now: two('2027-01-25', 4.8, 12, '2026'), checkedOn: '2027-02-01', warnings: [{ ref: 1, signal: 'rises' }, { ref: 2, signal: 'rises' }, { ref: 7, signal: 'falls' }] });
  assert.equal(c.version, 'outcome-check-v2');
  assert.deepEqual(c.warnings!.map((w) => [w.label, w.result]), [['Inflation', 'shown'], ['Policy rate', 'not_shown'], ['Figure [7]', 'missing']]);
  assert.match(c.warnings![0].reason, /4\.4% \(2025\) to 4\.8% \(2026\); a warning if it rises/);
  const early = judgeCheck({ frame, frameHash: 'h', months: 12, then: two('2026-01-30', 4.4, 13, '2025'), now: two('2027-01-25', 4.4, 13, '2025'), checkedOn: '2027-02-01', warnings: [{ ref: 2, signal: 'falls' }] });
  assert.equal(early.warnings![0].result, 'too_early');
  assert.equal(judge(diag('2027-01-25', 2.9, '2026')).warnings, undefined, 'no pre-mortem, no warnings field');
});
