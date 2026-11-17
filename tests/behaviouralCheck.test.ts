import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BEHAVIOUR_CHANNELS, BEHAVIOUR_STUDIES, CHANNEL_RULES } from '../src/data/behaviouralEvidence';
import { BEHAVIOUR_LABEL, behaviourState, behaviourText, behaviouralFlags, flagOption, parseEffects } from '../src/utils/behaviouralCheck';
import { GLOSSARY } from '../src/data/glossary';
import { MODEL_REGISTER } from '../src/data/modelRegister';
import type { PolicyOption } from '../src/utils/reviewOptions';
import { newReview, saveBehaviour, saveStep, behaviourChanged } from '../src/utils/policyReviewStore';
import { parseFrame, stepStates, type PolicyReview, type ReviewFrame } from '../src/utils/policyReview';

const opt = (rank: number, patch: Partial<PolicyOption>): PolicyOption => ({
  rank,
  title: '',
  lever: 'other',
  how: '',
  effect: '',
  timeToEffect: '',
  tradeoffs: '',
  whoBears: '',
  mustBeTrue: '',
  risks: '',
  refs: [],
  views: {},
  fromUser: false,
  ...patch,
});

test('the study list is fixed, fully cited and holds no effect sizes', () => {
  const ids = new Set<string>();
  for (const s of BEHAVIOUR_STUDIES) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    assert.match(s.citation, /\(\d{4}\)/, `${s.id}: citation has a year`);
    assert.match(s.link, /^https:\/\//, `${s.id}: link`);
    assert.doesNotMatch(s.about, /\d/, `${s.id}: no figures in the description`);
  }
  for (const s of ['wdr2015', 'oecd2017']) assert.ok(ids.has(s), `official review ${s}`);
  for (const c of BEHAVIOUR_CHANNELS) {
    const r = CHANNEL_RULES[c];
    assert.ok(r.studies.length >= 2, `${c}: at least two studies`);
    for (const id of r.studies) assert.ok(ids.has(id), `${c}: ${id} is in the list`);
    if (r.glossary) assert.ok(GLOSSARY.some((g) => g.id === r.glossary), `${c}: glossary ${r.glossary}`);
  }
});

test('each behaviour the build sheet names raises its flag, with the studies cited', () => {
  const cases: Array<[Partial<PolicyOption>, string]> = [
    [{ title: 'Expand the cash transfer', mustBeTrue: 'Eligible households apply for it.' }, 'take_up'],
    [{ title: 'Raise the VAT rate', how: 'A higher VAT on most goods.' }, 'tax_response'],
    [{ title: 'Hold the policy rate', mustBeTrue: 'Households trust the inflation target.' }, 'expectations'],
    [{ title: 'Pension reform', how: 'Workers are enrolled automatically and can opt out.' }, 'defaults'],
    [{ title: 'Phase out fuel subsidies', how: 'Remove the subsidy over two years.' }, 'loss_aversion'],
    [{ title: 'Retirement saving scheme', how: 'Encourage household saving for old age.' }, 'present_bias'],
  ];
  for (const [o, channel] of cases) {
    const f = flagOption(opt(1, o)).find((x) => x.channel === channel);
    assert.ok(f, `${o.title}: ${channel}`);
    assert.ok(f!.studies.length >= 2 && f!.studies.every((s) => s.citation.length > 20));
    assert.ok(f!.matched.length >= 1 && f!.fields.length >= 1);
  }
  const plain = flagOption(opt(1, { title: 'Build a new port', how: 'Public investment in the port.' }));
  assert.deepEqual(plain, [], 'an option with none of the words has no flags');
  const debt = flagOption(opt(1, { title: 'Avoid a sovereign default', how: 'Keep paying bondholders.' }));
  assert.ok(!debt.some((f) => f.channel === 'defaults'), 'a sovereign default is not a default option');
});

test('flags are the same every time and follow the option ranks', () => {
  const options = [opt(2, { title: 'Raise excise duty' }), opt(1, { title: 'Forward guidance on the inflation target' })];
  const a = behaviouralFlags(options);
  assert.deepEqual(a, behaviouralFlags(options));
  assert.deepEqual(a.map((o) => o.rank), [1, 2]);
  const text = behaviourText(a, [{ rank: 2, channel: 'tax_response', effect: 'a size', source: 'A study (2020), p. 4' }]);
  assert.match(text, new RegExp(BEHAVIOUR_LABEL));
  assert.match(text, /Size entered by you: a size \(source: A study \(2020\), p\. 4\)/);
});

test('effect sizes need an option, a behaviour, a size and a source', () => {
  const options = [{ rank: 1 }, { rank: 2 }];
  const bad = parseEffects([{ rank: 9, channel: 'nope', effect: '', source: 'x', link: 'ftp://a' }], options);
  assert.ok('errors' in bad);
  const msg = (bad as { errors: string[] }).errors.join(' ');
  for (const m of [/saved options/, /which behaviour/, /size/, /source/, /http/]) assert.match(msg, m);
  const good = parseEffects([{ rank: 2, channel: 'defaults', effect: '  participation rose ', source: 'Madrian and Shea (2001), Table IV', link: 'https://doi.org/10.1162/003355301753265543' }], options);
  assert.ok('effects' in good);
  assert.deepEqual((good as { effects: unknown[] }).effects, [{ rank: 2, channel: 'defaults', effect: 'participation rose', source: 'Madrian and Shea (2001), Table IV', link: 'https://doi.org/10.1162/003355301753265543' }]);
  assert.ok('effects' in parseEffects([], options), 'no entries is allowed');
});

test('saved sizes sit beside the chain, are hashed, and go out of date when the options are run again', () => {
  const p = parseFrame({ iso3: 'BRA', problem: 'Inflation is well above target.', goal: { indicator: 'Headline inflation', direction: 'lower' }, constraints: [], asOf: '2026-11-01' }, new Date('2026-11-05T00:00:00Z'));
  const frame = (p as { frame: ReviewFrame }).frame;
  const ok = (r: { review: PolicyReview } | { error: string }) => (r as { review: PolicyReview }).review;
  let r = newReview(frame, []);
  assert.ok('error' in saveBehaviour(r, []), 'needs options first');
  r = ok(saveStep(r, 'diagnose', { figures: [] }));
  r = ok(saveStep(r, 'options', { options: [opt(1, { title: 'A' })] }));
  const before = stepStates(r);
  const r2 = ok(saveBehaviour(r, [{ rank: 1, channel: 'take_up', effect: 'x', source: 'A source (2020)' }]));
  assert.deepEqual(stepStates(r2), before, 'the step chain is unchanged');
  assert.equal(behaviourState(r2.behaviour, r2.steps.options!.hash), 'done');
  assert.equal(behaviourChanged(r2), false);
  assert.equal(behaviourChanged({ ...r2, behaviour: { ...r2.behaviour!, effects: [] } }), true, 'an edit outside the app shows');
  const r3 = ok(saveStep(r2, 'options', { options: [opt(1, { title: 'B' })] }));
  assert.equal(behaviourState(r3.behaviour, r3.steps.options!.hash), 'out_of_date');
});

test('registered as a description, with the five glossary terms', () => {
  const reg = MODEL_REGISTER.find((m) => m.id === 'behavioural_check');
  assert.equal(reg?.status, 'descriptive');
  const behaviour = GLOSSARY.filter((g) => g.group === 'behaviour').map((g) => g.id);
  assert.deepEqual(behaviour.sort(), ['anchoring', 'defaults', 'framing', 'loss_aversion', 'present_bias']);
  assert.match(readFileSync(new URL('../docs/GLOSSARY.md', import.meta.url), 'utf8'), /## Behavioural economics/);
});
