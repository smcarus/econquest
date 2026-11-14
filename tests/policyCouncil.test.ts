import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cbAt, costBenefitResults, discountFactors, flipRate, parseCostBenefit, parseValues, type CostBenefit } from '../src/utils/policyCouncil';
import { DISCOUNT_RATES } from '../src/data/discountRates';
import { councilPartHash, councilPartsChanged, saveCouncilPart, newReview } from '../src/utils/policyReviewStore';
import { councilPartState } from '../src/utils/policyCouncil';
import { parseFrame, type ReviewFrame } from '../src/utils/policyReview';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const cb = (over: Partial<CostBenefit> = {}): CostBenefit => ({
  unit: 'lcu_bn',
  firstYear: 2027,
  lines: [
    { kind: 'cost', label: 'Transfers', values: [10, 0, 0], source: 'Budget 2027' },
    { kind: 'benefit', label: 'Subsidy saved', values: [0, 6, 6], source: 'Outturn 2026' },
  ],
  rateIds: ['us_a4_7'],
  ...over,
});

test('yearly values read from text; thousands commas kept, a word refused', () => {
  assert.deepEqual(parseValues('1.2, 1.2; 0.8 -1'), [1.2, 1.2, 0.8, -1]);
  assert.deepEqual(parseValues('1,200, 1,300'), [1200, 1300]);
  assert.deepEqual(parseValues([1, '2']), [1, 2]);
  assert.equal(parseValues('1, lots'), null);
});

test('discount factors: the first year is not discounted, a schedule changes rate from its year', () => {
  near(discountFactors([{ from: 0, rate: 10 }], 3)[2], 1 / 1.21);
  const gb = DISCOUNT_RATES.find((r) => r.id === 'uk_green_book_2026')!;
  const df = discountFactors(gb.steps, 33);
  near(df[30], 1 / Math.pow(1.03, 30));
  near(df[31], df[30] / 1.025);
});

test('present values, net, ratio, pay-back year and switching values', () => {
  const r = cbAt(cb(), '10%', [{ from: 0, rate: 10 }]);
  near(r.pvCosts, 10);
  near(r.pvBenefits, 6 / 1.1 + 6 / 1.21);
  near(r.npv, r.pvBenefits - 10);
  assert.equal(r.breakEvenYear, 2029);
  assert.equal(r.switchWhat, 'costs_rise');
  near(r.switchPct!, (r.npv / 10) * 100);
  // At 30% the net is negative: benefits must rise.
  const hi = cbAt(cb(), '30%', [{ from: 0, rate: 30 }]);
  assert.ok(hi.npv < 0);
  assert.equal(hi.breakEvenYear, null);
  assert.equal(hi.switchWhat, 'benefits_rise');
  near(hi.pvBenefits * (1 + hi.switchPct! / 100), hi.pvCosts);
  // The flat rate where the net is zero sits between the two.
  const f = flipRate(cb())!;
  assert.ok(f > 10 && f < 30);
  assert.ok(Math.abs(cbAt(cb(), 'f', [{ from: 0, rate: f }]).npv) < 0.01);
  // Results come in the order ticked, own rate last.
  const out = costBenefitResults(cb({ rateIds: ['us_a4_3', 'us_a4_7'], ownRate: 5 }));
  assert.deepEqual(out.results.map((x) => x.id), ['us_a4_3', 'us_a4_7', 'own']);
});

test('every official rate names its source, passage and the day it was checked', () => {
  assert.ok(DISCOUNT_RATES.length >= 5);
  for (const r of DISCOUNT_RATES) {
    assert.match(r.link, /^https:\/\//);
    assert.ok(r.citation.length > 20 && r.quote.length > 10, r.id);
    assert.match(r.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.steps.length && r.steps[0].from === 0);
  }
});

test('a table without sources, values or a rate is refused with every reason', () => {
  const bad = parseCostBenefit({ lines: [{ kind: 'cost', label: 'X', values: '1, two', source: '' }], rateIds: ['nope'], ownRate: 50 }, { firstYear: 2027 });
  assert.ok('errors' in bad);
  const e = (bad as { errors: string[] }).errors.join(' ');
  for (const m of [/name/, /number/, /where the figures/, /Unknown discount rate: nope/, /0 to 30/, /at least one discount rate/]) assert.match(e, m);
  const good = parseCostBenefit({ unit: 'usd_bn', firstYear: '2028', lines: [{ kind: 'benefit', label: 'Saved', values: '1 2', source: 'IMF Article IV 2026' }], ownRate: '4', ownRateSource: 'Long bond yield' }, { firstYear: 2027 });
  assert.ok('content' in good);
  assert.deepEqual((good as { content: CostBenefit }).content, { unit: 'usd_bn', firstYear: 2028, lines: [{ kind: 'benefit', label: 'Saved', values: [1, 2], source: 'IMF Article IV 2026' }], rateIds: [], ownRate: 4, ownRateSource: 'Long bond yield' });
});

test('a council part is saved against the frame, reads out of date when the frame changes, and catches edits', () => {
  const today = new Date('2026-11-05T12:00:00Z');
  const base = { iso3: 'BRA', problem: 'Fuel subsidies cost a large share of the budget.', goal: { indicator: 'Primary balance', direction: 'higher' }, asOf: '2026-11-01' };
  const plain = newReview((parseFrame(base, today) as { frame: ReviewFrame }).frame, []);
  assert.ok('error' in saveCouncilPart(plain, 'costBenefit', cb()));
  const r0 = newReview((parseFrame({ ...base, council: { measure: 'Phase out the diesel subsidy' } }, today) as { frame: ReviewFrame }).frame, []);
  const out = saveCouncilPart(r0, 'costBenefit', cb());
  assert.ok('review' in out);
  const r = (out as { review: typeof r0 }).review;
  const rec = r.councilParts!.costBenefit!;
  assert.equal(rec.hash, councilPartHash(rec));
  assert.equal(councilPartState(rec, r.steps.frame!.hash), 'done');
  assert.equal(councilPartState(rec, 'other'), 'out_of_date');
  assert.deepEqual(councilPartsChanged(r), []);
  (rec.content as CostBenefit).lines[0].values[0] = 1;
  assert.deepEqual(councilPartsChanged(r), ['costBenefit']);
});

test('winners and losers: a size needs its source and unit; no size reads Missing; by-fifth shares must add to 100', async () => {
  const { parseWinnersLosers, groupTally } = await import('../src/utils/policyCouncil');
  const bad = parseWinnersLosers({ rows: [{ group: 'X', effect: 'wins', why: '', size: 3 }], fifths: { direction: 'pay', sizePctGdp: 1, shares: [10, 10, 10, 10, 10], source: '' } });
  assert.ok('errors' in bad);
  const e = (bad as { errors: string[] }).errors.join(' ');
  for (const m of [/name/, /gains, loses or mixed/, /why/, /needs its source/, /add up to 50%/, /where the shares/]) assert.match(e, m);
  const good = parseWinnersLosers({
    rows: [
      { group: 'Poorer households', effect: 'loses', why: 'They spend more of their income on fuel.', size: '2.1', sizeUnit: '% of spending', source: 'CEQ Assessment 2024, table 3' },
      { group: 'Government budget', effect: 'gains', why: 'The subsidy bill falls.' },
    ],
    fifths: { direction: 'pay', sizePctGdp: '1', shares: ['10', '15', '20', '25', '30'], source: 'CEQ Assessment 2024' },
  });
  assert.ok('content' in good);
  const w = (good as { content: import('../src/utils/policyCouncil').WinnersLosers }).content;
  assert.equal(w.rows[0].size, 2.1);
  assert.equal(w.rows[1].size, undefined);
  assert.deepEqual(w.fifths!.shares, [10, 15, 20, 25, 30]);
  assert.deepEqual(groupTally(w), { gains: 1, loses: 1, mixed: 0, noFigure: ['Government budget'] });
});

test('second-order links: a figure is copied from Diagnose with its source; no figure or source means assumption', async () => {
  const { parseChain, chainTally } = await import('../src/utils/policyCouncil');
  const figures = [
    { ref: 1, field: 'cpi', group: 'Prices', label: 'Inflation', unit: '%', value: 6.2, status: 'Live' as const, period: '2026-09', source: 'IMF CPI', reason: '' },
    { ref: 2, field: 'gdp', group: 'Growth', label: 'Growth', unit: '%', value: null, status: 'Missing' as const, period: '', source: '', reason: 'not saved yet' },
  ];
  const bad = parseChain({ links: [{ from: 'Fuel price', to: 'Bus fares', direction: 'up', basis: 'figure', ref: 2 }, { from: 'Bus fares', to: 'Wages', direction: 'raises', basis: 'source', source: '' }] }, figures);
  assert.ok('errors' in bad);
  const e = (bad as { errors: string[] }).errors.join(' ');
  for (const m of [/raises, lowers or unclear/, /\[2\] is Missing \(not saved yet\)/, /name the source/]) assert.match(e, m);
  assert.match((parseChain({ links: [{ from: 'A b', to: 'C d', direction: 'raises', basis: 'figure', ref: 1 }] }, undefined) as { errors: string[] }).errors[0], /run Diagnose first/);
  const good = parseChain(
    {
      links: [
        { from: 'Diesel price', to: 'Inflation', direction: 'raises', lag: '1 to 3 months', basis: 'figure', ref: 1 },
        { from: 'Inflation', to: 'Policy rate', direction: 'raises', basis: 'source', source: 'Central bank reaction function, IMF WP/24/10' },
        { from: 'Policy rate', to: 'Credit', direction: 'lowers', basis: 'nonsense' },
      ],
    },
    figures,
  );
  assert.ok('content' in good);
  const c = (good as { content: import('../src/utils/policyCouncil').EffectChain }).content;
  assert.deepEqual(c.links[0].figure, { ref: 1, label: 'Inflation', value: 6.2, unit: '%', period: '2026-09', source: 'IMF CPI' });
  assert.equal(c.links[2].basis, 'assumption');
  assert.deepEqual(chainTally(c), { figure: 1, source: 1, assumption: 1 });
});
