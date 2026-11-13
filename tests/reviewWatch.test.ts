import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrigger, figureFor, reviewWatch } from '../src/utils/reviewWatch.ts';
import type { Diagnosis, DiagnosisFigure } from '../src/utils/reviewDiagnosis.ts';
import type { ReviewFrame } from '../src/utils/policyReview.ts';
import type { MemoStep } from '../src/utils/reviewMemo.ts';
import { WORKSPACE } from '../src/i18n/messages/workspace.ts';

const fig = (ref: number, field: string, label: string, value: number | null, period = '2026'): DiagnosisFigure => ({
  ref, field, group: 'g', label, unit: '%', value, status: value === null ? 'Missing' : 'Live', period: value === null ? '' : period, source: 's', reason: value === null ? 'not in this pull' : '',
});
const diag = (pullDate: string, vals: [number | null, number | null, number | null]): Diagnosis => ({
  iso3: 'KEN', asOf: pullDate, pullDate, pulledAt: `${pullDate}T00:00:00Z`, incomplete: false, readings: [], coverage: '',
  figures: [fig(1, 'imf.cpiInflationPct', 'Inflation', vals[0]), fig(2, 'market.policyRatePct', 'Policy rate', vals[1]), fig(4, 'imf.debtToGdpPct', 'Government debt (% of GDP)', vals[2])],
});
const frame = (direction: 'lower' | 'higher' | 'stable' = 'lower'): ReviewFrame => ({ iso3: 'KEN', problem: 'p', goal: { indicator: 'Inflation', direction }, constraints: [], asOf: '2026-01-10' });
const memo = (watch: Array<{ indicator: string; trigger?: string }>): MemoStep => ({ templateVersion: 'v', inputs: { recommended: 1, rationale: '', watch, reviewDate: '2026-07-10' }, title: 't', researchOnly: true, sections: [], markdown: '' });

test('parseTrigger reads the stated wordings in four languages and nothing else', () => {
  assert.deepEqual(parseTrigger('above 8'), { kind: 'above', value: 8 });
  assert.deepEqual(parseTrigger('More than 7.5%'), { kind: 'above', value: 7.5 });
  assert.deepEqual(parseTrigger('> 5'), { kind: 'above', value: 5 });
  assert.deepEqual(parseTrigger('below 3'), { kind: 'below', value: 3 });
  assert.deepEqual(parseTrigger('target 4'), { kind: 'target', value: 4 });
  assert.deepEqual(parseTrigger('target 3%'), { kind: 'target', value: 3 });
  assert.deepEqual(parseTrigger('target below 60% of GDP'), { kind: 'below', value: 60 });
  assert.deepEqual(parseTrigger('early warning if it rises'), { kind: 'rises' });
  assert.deepEqual(parseTrigger('early warning if it falls'), { kind: 'falls' });
  assert.deepEqual(parseTrigger('por encima de 8,5'), { kind: 'above', value: 8.5 });
  assert.deepEqual(parseTrigger('en dessous de 3'), { kind: 'below', value: 3 });
  assert.deepEqual(parseTrigger('cible 4'), { kind: 'target', value: 4 });
  assert.deepEqual(parseTrigger('se a inflação sobe'), { kind: 'rises' });
  assert.deepEqual(parseTrigger('si baja'), { kind: 'falls' });
  assert.equal(parseTrigger('watch closely'), null);
  assert.equal(parseTrigger('montant élevé'), null);
  assert.equal(parseTrigger(''), null);
});

test('figureFor uses the [n] reference, else a label match', () => {
  const d = diag('2026-01-10', [7, 10, 60]);
  assert.equal(figureFor('Policy rate [2]', d)?.ref, 2);
  assert.equal(figureFor('Government debt', d)?.ref, 4);
  assert.equal(figureFor('Unemployment', d), undefined);
});

test('reviewWatch checks each trigger against the latest pull', () => {
  const then = diag('2026-01-10', [7, 10, 60]);
  const now = diag('2026-11-01', [9.1, 9.5, null]);
  const w = reviewWatch(
    frame(),
    then,
    memo([
      { indicator: 'Inflation [1]', trigger: 'above 8' },
      { indicator: 'Inflation [1]', trigger: 'target 5' },
      { indicator: 'Policy rate [2]', trigger: 'early warning if it rises' },
      { indicator: 'Government debt [4]', trigger: 'above 70' },
      { indicator: 'Unemployment', trigger: 'above 10' },
      { indicator: 'Inflation [1]', trigger: 'watch closely' },
      { indicator: 'Policy rate [2]' },
    ]),
    now,
  );
  assert.equal(w.pullDate, '2026-11-01');
  assert.equal(w.reviewDate, '2026-07-10');
  assert.deepEqual(w.items.map((i) => i.status), ['crossed', 'not_crossed', 'not_crossed', 'missing', 'no_match', 'cannot_read']);
  assert.deepEqual({ then: w.items[0].then, now: w.items[0].now, period: w.items[0].nowPeriod, ref: w.items[0].ref }, { then: 7, now: 9.1, period: '2026', ref: 1 });
  // A target with a goal to raise the figure; a "stable" goal has no side, so the target cannot be read.
  assert.equal(reviewWatch(frame('higher'), then, memo([{ indicator: 'Inflation [1]', trigger: 'target 9' }]), now).items[0].status, 'crossed');
  assert.equal(reviewWatch(frame('stable'), then, memo([{ indicator: 'Inflation [1]', trigger: 'target 9' }]), now).items[0].status, 'cannot_read');
  // Falls, against the figure the review started from.
  assert.equal(reviewWatch(frame(), then, memo([{ indicator: 'Policy rate [2]', trigger: 'falls' }]), now).items[0].status, 'crossed');
  // No saved pull yet.
  const none = reviewWatch(frame(), then, memo([{ indicator: 'Inflation [1]', trigger: 'above 8' }]), null);
  assert.equal(none.pullDate, undefined);
  assert.equal(none.items[0].status, 'no_pull');
});

test('Policy review watch has its text', () => {
  for (const k of ['rw_title', 'rw_intro', 'rw_summary', 'rw_crossed', 'rw_wording', 'rw_open'] as const) assert.ok(k in WORKSPACE.en, k);
});
