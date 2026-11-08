import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatPath, parseWhatIf, runWhatIf, whatIfSentence } from '../src/utils/fiscalWhatIf.ts';
import { BUDGET_SEMI_ELASTICITY, DEFENCE, PUBLIC_INVESTMENT } from '../src/data/spendingMultipliers.ts';
import { isExplainQuestion } from '../src/utils/explain.ts';
import { planCouncil } from '../src/utils/askCouncil.ts';

const SAM_Q = 'What would happen if the United States defense budget was halved and that money was reallocated back to the economy/restructuring?';

test('parseWhatIf reads the share and where the money goes', () => {
  const q = parseWhatIf(SAM_Q)!;
  assert.equal(q.sector.code, 'GF02');
  assert.equal(q.share, 0.5);
  assert.deepEqual(q.uses, ['respend']);
  assert.equal(q.said, 'halved');
  assert.equal(parseWhatIf('What if Germany halved energy subsidies and spent it on schools?')?.sector.code, 'GF0403');
  assert.equal(parseWhatIf('What if Brazil cut health spending by 10%?')?.share, 0.1);
  assert.equal(parseWhatIf('What if UK military spending were cut by 20% to reduce the deficit?')?.share, 0.2);
  assert.deepEqual(parseWhatIf('What if UK military spending were cut by 20% to reduce the deficit?')?.uses, ['deficit']);
  assert.deepEqual(parseWhatIf('What if Turkey halved defence spending?')?.uses, ['respend', 'deficit']);
  assert.equal(parseWhatIf('What if Poland doubled its defence budget?')?.share, -1);
  assert.equal(parseWhatIf('What if the US halved its deficit?'), null);
  assert.equal(parseWhatIf('Is US defence spending high?'), null);
  assert.equal(parseWhatIf('What if the US halved spending?'), null);
});

test('what-if questions are explanations, and "budget" alone no longer means the Calendar Agent', () => {
  assert.equal(isExplainQuestion(SAM_Q), true);
  assert.equal(isExplainQuestion('What if Turkey raised taxes?'), true);
  const plan = planCouncil(SAM_Q, [{ iso3: 'USA', countryName: 'United States' }] as any);
  const ids = plan.agents.map((a) => a.id);
  assert.ok(ids.includes('fiscal'));
  assert.ok(!ids.includes('calendar'));
  assert.ok(planCouncil('When is the next budget vote?', [] as any).agents.some((a) => a.id === 'calendar'));
});

const baseline = [2026, 2027, 2028, 2029, 2030].map((y) => ({ year: String(y), g: 2, pi: 2.5, i: 3.5, pb: -3 }));
const bucket = flatPath(0.4, 0.6, 'medium bucket');
const inp = { spend: { pct: 3.1, year: '2025', source: 'World Bank (SIPRI)' }, share: 0.5, debtNow: 120, year: '2025', baseline, cut: bucket };

test('respending at the same multiplier leaves growth and debt on the baseline', () => {
  const r = runWhatIf({ ...inp, uses: ['respend'] })!;
  assert.equal(r.cutPp, 1.55);
  assert.equal(r.newSpendPct, 1.55);
  const run = r.runs[0];
  assert.equal(run.pbChangePp, 0);
  assert.deepEqual(run.growth, { low: 0, high: 0 });
  assert.equal(run.debtEnd.low, run.debtEnd.baseline);
  assert.match(whatIfSentence(run, r.cutPp), /spent on other spending, first-year growth moves 0\.0%/);
});

test('keeping the money lowers debt despite the growth hit, and a higher respend multiplier adds growth', () => {
  const r = runWhatIf({ ...inp, uses: ['deficit'] })!;
  const run = r.runs[0];
  assert.equal(run.pbChangePp, 1.55);
  assert.deepEqual(run.growth, { low: -0.93, high: -0.62 });
  assert.ok(run.debtEnd.high < run.debtEnd.baseline - 5);
  const up = runWhatIf({ ...inp, uses: ['respend'], respend: flatPath(1, 1.5, 'your setting') })!.runs[0];
  assert.ok(up.growth.low > 0 && up.debtEnd.high < up.debtEnd.baseline);
});

test('runWhatIf refuses without baseline inputs or a spending figure', () => {
  assert.equal(runWhatIf({ ...inp, uses: ['respend'], baseline: [] }), null);
  assert.equal(runWhatIf({ ...inp, uses: ['respend'], spend: { ...inp.spend, pct: 0 } }), null);
});

test('govSpending parses both tables, keeps the newer year, and says Missing plainly', async () => {
  const { parseEurostat, parseDbnomics, mergeSpending, sectorLine } = await import('../src/utils/govSpending.ts');
  const euro = {
    id: ['geo', 'cofog99', 'time'],
    size: [1, 2, 2],
    dimension: { geo: { category: { index: { DE: 0 } } }, cofog99: { category: { index: { GF02: 0, GF07: 1 } } }, time: { category: { index: { '2023': 0, '2024': 1 } } } },
    value: { '0': 1.2, '1': 1.3, '2': 8.1 },
  };
  const e = parseEurostat(euro, { DE: 'DEU' });
  assert.deepEqual(e.DEU.GF02, { pct: 1.3, year: '2024', table: 'eurostat' });
  assert.deepEqual(e.DEU.GF07, { pct: 8.1, year: '2023', table: 'eurostat' });
  const imf = parseDbnomics({ series: { docs: [
    { series_code: 'A.DE.S13.XDC_R_B1GQ.GF07', period: ['2022', '2023', '2024'], value: [7.9, 8.0, 'NA'] },
    { series_code: 'A.TR.S13.XDC_R_B1GQ.GF0403', period: ['2022', '2023'], value: [0.9, 0.77] },
    { series_code: 'A.GB.S13.XDC_R_B1GQ.GF07', period: ['2022', '2023'], value: [8.9e-6, 8.7e-6] },
  ] } }, { DE: 'DEU', TR: 'TUR', GB: 'GBR' });
  assert.equal(imf.DEU.GF07.year, '2023');
  assert.equal(imf.GBR, undefined);
  const m = mergeSpending(e, imf);
  assert.equal(m.DEU.GF07.table, 'eurostat');
  assert.equal(m.TUR.GF0403.pct, 0.77);
  const line = sectorLine('TUR', 'Turkey', 'GF0403', m, new Date('2026-11-08'));
  assert.ok('value' in line && line.value === '0.8% of GDP' && /2023 \(3 years old\)/.test(line.source));
  const miss = sectorLine('IND', 'India', 'GF0403', m);
  assert.ok('missing' in miss && /India: no free source has fuel and energy spending/.test(miss.missing));
});

test('the cited paths: halving US defence into public investment adds output over time; the EU budget responds', () => {
  assert.equal(parseWhatIf(SAM_Q)!.destination, 'investment');
  assert.equal(parseWhatIf('What if Turkey halved defence spending?')!.destination, 'other');
  // Abiad, Furceri and Topalova (2015): 0.4 then 1.5 central; 0.2-0.7 and 0.8-2.6 by efficiency.
  assert.deepEqual([PUBLIC_INVESTMENT.low[0], PUBLIC_INVESTMENT.low[3], PUBLIC_INVESTMENT.high[0], PUBLIC_INVESTMENT.high[3]], [0.2, 0.7, 0.8, 2.6]);
  // Barro and Redlick (2011): 0.4-0.5 at once, 0.6-0.7 over two years.
  assert.deepEqual([DEFENCE.low[0], DEFENCE.high[0], DEFENCE.low[1], DEFENCE.high[1]], [0.4, 0.5, 0.6, 0.7]);
  const r = runWhatIf({ ...inp, uses: ['respend'], cut: { ...DEFENCE }, respend: { ...PUBLIC_INVESTMENT } })!.runs[0];
  // Year one: -1.55 x 0.5 + 1.55 x 0.2 at the weak end; -1.55 x 0.4 + 1.55 x 0.8 at the strong end.
  assert.deepEqual(r.growth, { low: -0.46, high: 0.62 });
  // Year five: -1.55 x 0.7 + 1.55 x 0.7 = 0 at the weak end; -1.55 x 0.6 + 1.55 x 2.6 = 3.1 at the strong end.
  assert.deepEqual([r.level.low, r.level.high], [0, 3.1]);
  assert.equal(r.feedback, undefined);
  assert.equal(BUDGET_SEMI_ELASTICITY.DEU, 0.504);
  const eu = runWhatIf({ ...inp, uses: ['deficit'], semiElasticity: { value: 0.504, source: 'EC DP 098' } })!.runs[0];
  const noFeedback = runWhatIf({ ...inp, uses: ['deficit'] })!.runs[0];
  // The output loss weakens the budget, so debt ends a little higher with the feedback in.
  assert.ok(eu.feedback!.low < 0 && eu.debtEnd.low > noFeedback.debtEnd.low);
});
