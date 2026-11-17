import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { incidence, incidenceContext, incidenceSentence, type IncidenceResult, type IncomeShares } from '../src/utils/policyIncidence.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';

const yv = (pairs: Array<[number, number]>) => pairs.map(([year, value]) => ({ year, value }));
const income: IncomeShares = { year: 2021, q: [5, 10, 15, 20, 50] };
const base = { source: 'Test study, Testland, 2020', sizePctGdp: 2 };

test('context: latest year with all five income shares; Missing with the reason', () => {
  const c = incidenceContext({
    gini: yv([[2018, 40], [2021, 38.24]]),
    tax_revenue: yv([[2022, 15]]),
    income_share_q1: yv([[2019, 6], [2021, 5]]),
    income_share_q2: yv([[2019, 10], [2021, 10]]),
    income_share_q3: yv([[2019, 15], [2021, 15]]),
    income_share_q4: yv([[2019, 21], [2021, 20]]),
    income_share_q5: yv([[2019, 48], [2021, 50]]),
  });
  assert.deepEqual(c.incomeShares, income);
  assert.deepEqual(c.rows.map((r) => [r.id, r.value, r.year]), [['gini', 38.24, 2021], ['tax_revenue', 15, 2022]]);
  assert.equal(c.missing.length, 1);
  assert.match(c.missing[0], /^Poverty rates/);
  // A year missing one fifth is skipped.
  const gap = incidenceContext({ income_share_q1: yv([[2021, 5]]), income_share_q2: yv([[2021, 10]]), income_share_q3: yv([[2021, 15]]), income_share_q4: yv([[2021, 20]]) });
  assert.equal(gap.incomeShares, null);
  assert.match(gap.missing[0], /share ratios cannot be worked out/);
  assert.deepEqual(gap.sources, []);
});

test('a payment: amounts, ratios and the reading (regressive, progressive, proportional); a gain flips it', () => {
  const vat = incidence({ ...base, direction: 'pay', shares: [10, 15, 20, 25, 30] }, income) as IncidenceResult;
  assert.equal(vat.ok, true);
  assert.deepEqual(vat.groups[0], { q: 1, sharePct: 10, amountPctGdp: 0.2, incomeSharePct: 5, ratio: 2 });
  assert.equal(vat.groups[4].ratio, 0.6);
  assert.equal(vat.reading, 'regressive');
  assert.equal(
    incidenceSentence(vat, 'Testland'),
    'Testland: for a tax rise or spending cut of 2% of GDP, the poorest fifth pays 10% of it (0.2% of GDP) and the richest fifth 30% (0.6% of GDP), on shares from Test study, Testland, 2020. They hold 5% and 50% of income, so the change is regressive: heavier on poorer groups against their income.',
  );
  const wealth = incidence({ ...base, direction: 'pay', shares: [1, 4, 10, 20, 65] }, income) as IncidenceResult;
  assert.equal(wealth.reading, 'progressive');
  const flat = incidence({ ...base, direction: 'pay', shares: [5, 10, 15, 20, 50] }, income) as IncidenceResult;
  assert.equal(flat.reading, 'proportional');
  const transfer = incidence({ ...base, direction: 'gain', shares: [10, 15, 20, 25, 30] }, income) as IncidenceResult;
  assert.equal(transfer.reading, 'progressive');
  assert.match(incidenceSentence(transfer, 'Testland'), /progressive: more for poorer groups/);
  // Without income shares: amounts only, no reading.
  const noInc = incidence({ ...base, direction: 'pay', shares: [10, 15, 20, 25, 30] }, null) as IncidenceResult;
  assert.equal(noInc.reading, null);
  assert.equal(noInc.groups[0].ratio, undefined);
  assert.doesNotMatch(incidenceSentence(noInc, 'Testland'), /hold/);
});

test('starts empty: every problem is named; shares must add up to 100', () => {
  const none = incidence({ direction: null, sizePctGdp: null, shares: [null, null, null, null, null], source: '' }, income);
  assert.equal(none.ok, false);
  if (!none.ok) assert.deepEqual(none.problems, ['direction', 'size', 'shares', 'source']);
  const sum = incidence({ ...base, direction: 'pay', shares: [10, 10, 10, 10, 10] }, income);
  assert.ok(!sum.ok && sum.problems[0] === 'sum' && sum.sharesSum === 50);
  const big = incidence({ ...base, direction: 'pay', sizePctGdp: 60, shares: [20, 20, 20, 20, 20] }, income);
  assert.ok(!big.ok && big.problems.includes('size'));
});

test('wired: saved income shares, register, tool, panel, route, translations', () => {
  for (let k = 1; k <= 5; k++) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === `income_share_q${k}`));
  assert.equal(registerEntry('policy_incidence')!.status, 'descriptive');
  assert.equal(READY_BY_ID.policy_incidence.target.anchor, 'tool-policy-incidence');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-policy-incidence"/);
  assert.match(page, /PolicyIncidencePanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/policy-incidence\/:iso3/);
  const panel = fs.readFileSync('src/components/PolicyIncidencePanel.tsx', 'utf8');
  assert.match(panel, /useState<string\[\]>\(\['', '', '', '', ''\]\)/, 'no incidence shares built in');
  for (const lang of ['es', 'fr']) assert.match(fs.readFileSync(`src/i18n/${lang}/briefText.ts`, 'utf8'), /G30: who pays for a policy/);
});
