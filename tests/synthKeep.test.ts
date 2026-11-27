import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keptFrom, MAX_KEPT_SYNTH, synthBrief, withKept, withoutKept, type KeptSynth } from '../src/utils/synthKeep';
import type { SynthResult } from '../src/utils/syntheticControl';
import type { PolicyEvent } from '../src/utils/policyEvents';
import { briefLines } from '../src/utils/plainBrief';

const event: PolicyEvent = { id: 'BRA-devaluation-2015', iso3: 'BRA', year: 2015, kind: 'devaluation', origin: 'rule', label: 'Currency down: 40% more local currency per US dollar', value: 40, parts: { v: 40 } };

function result(over: Partial<SynthResult> = {}): SynthResult {
  const path = [-2, -1, 0, 1, 2, 3, 4].map((k) => ({ k, year: 2015 + k, actual: 5 + k, twin: 4 + k, gap: k >= 0 ? 1 + k * 0.5 : 0.1 }));
  return {
    methodVersion: 'synth-v1', iso3: 'BRA', outcome: 'cpi_imf', eventYear: 2015, asOf: '2026-11-01', lastYear: 2026, preYears: [2013, 2014], postYears: [2015, 2016, 2017, 2018, 2019], path,
    weights: [{ iso3: 'MEX', name: 'Mexico', weight: 0.5 }, { iso3: 'COL', name: 'Colombia', weight: 0.3 }, { iso3: 'CHL', name: 'Chile', weight: 0.15 }, { iso3: 'PER', name: 'Peru', weight: 0.05 }],
    donorCount: 20, excluded: [], preRmspe: 0.2, postRmspe: 2, fitRatio: 0.1, dominantDonor: null,
    placebo: { p: 0.05, rank: 1, runs: 21, paths: [] }, leaveOneOut: null, inTime: null, ...over,
  };
}

test('keptFrom reads three years after, the placebo and the three largest parts of the twin', () => {
  const k = keptFrom(result(), event, new Date('2026-11-27T10:00:00Z'), '2026-11-20T00:00:00Z') as KeptSynth;
  assert.equal(k.k, 3);
  assert.equal(k.gap, 2.5);
  assert.equal(k.p, 0.05);
  assert.deepEqual(k.weights.map((w) => w.name), ['Mexico', 'Colombia', 'Chile']);
  assert.equal(k.source, 'IMF WEO (PCPIPCH)');
  assert.equal(k.keptAt, '2026-11-27T10:00:00.000Z');
});

test('a Missing twin or one with no placebo has nothing to keep', () => {
  assert.ok('error' in keptFrom(result({ missing: { reason: 'poor_fit', detail: '0.8' } }), event, new Date()));
  assert.ok('error' in keptFrom(result({ placebo: null }), event, new Date()));
});

test('keeping the same change and figure replaces it; at most five are kept; one can be taken out', () => {
  const k = keptFrom(result(), event, new Date()) as KeptSynth;
  let list = withKept([], k);
  list = withKept(list, { ...k, gap: 9 });
  assert.equal(list.length, 1);
  assert.equal(list[0].gap, 9);
  for (let i = 0; i < 7; i++) list = withKept(list, { ...k, eventId: `e${i}` });
  assert.equal(list.length, MAX_KEPT_SYNTH);
  assert.equal(list[list.length - 1].eventId, 'e6');
  assert.equal(withoutKept(list, 'e6', 'cpi_imf').length, MAX_KEPT_SYNTH - 1);
});

test('the brief section says the sentence, the twin, the source, and Not validated until the test passes', () => {
  const k = keptFrom(result(), event, new Date()) as KeptSynth;
  const b = synthBrief([k], 'en', false)!;
  assert.equal(b.heading, 'What happened after: the country against a twin');
  assert.match(b.lines[0], /^Currency down: 40% more local currency per US dollar\. 3 years after 2015, inflation was 2\.50 points above its twin/);
  assert.match(b.lines[0], /Twin: Mexico 50%, Colombia 30%, Chile 15%\. Figures: IMF WEO \(PCPIPCH\)\.$/);
  assert.ok(b.lines.some((l) => l.startsWith('Not validated')));
  assert.ok(!synthBrief([k], 'en', true)!.lines.some((l) => l.startsWith('Not validated')));
  assert.equal(synthBrief([], 'en', false), undefined);
});

test('the brief puts the section after what to watch and before the council parts', () => {
  const k = keptFrom(result(), event, new Date()) as KeptSynth;
  const wh = synthBrief([k], 'en', false);
  const lines = briefLines({ lang: 'en', title: 'T', question: 'Q', goal: 'G', asOf: '2026-11-01', option: { title: 'O', rankLine: 'r', how: '', effect: '', time: '', whoBears: '', risks: '', why: '' }, figures: [], watch: ['w'], reviewDate: '2027-05-01', researchOnly: true, whatHappened: wh, council: { heading: 'Council', lines: ['c'] } }).map((l) => l.text);
  const at = lines.indexOf('What happened after: the country against a twin');
  assert.ok(at > lines.indexOf('Look again on 2027-05-01.'));
  assert.ok(at < lines.indexOf('Council'));
});
