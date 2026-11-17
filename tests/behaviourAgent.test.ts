import { test } from 'node:test';
import assert from 'node:assert/strict';
import { behaviourAgent, behaviourReadings, NOT_TESTED, BREAKEVEN_MISSING_EU, SURVEY_MISSING_NON_EU, KALSHI_MISSING } from '../src/utils/behaviourAgent.ts';
import { AGENT_ORDER, COUNCIL_AGENTS, planCouncil, runCouncil, agentChoicePrompt } from '../src/utils/askCouncil.ts';
import { EU_PRICE_EXPECTATIONS, euSurveySummary, euSurveyUrl, surveyPercentile, SURVEY_PERCENTILE_MIN_MONTHS } from '../src/utils/euSurveys.ts';
import { expectationsDirectionCases, hitRateSpec, judgeWithRobustness, robustness, type BacktestSpec } from '../src/utils/backtest.ts';
import { spliceHicp } from '../src/utils/backtestRun.ts';
import { agentBadge } from '../src/utils/agentBadges.ts';
import fs from 'node:fs';

const NOW = new Date('2026-11-12T00:00:00Z');
const item = (o: Record<string, unknown> = {}) => ({ iso3: 'DEU', countryName: 'Germany', compositeRisk: 0.5, ...o }) as never;
const months = (from: string, n: number) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1 + i, 1)).toISOString().slice(0, 7));

const surveys = {
  pulledAt: '2026-11-10T00:00:00Z',
  latest: [
    { id: 'consumer', label: 'Consumer confidence', kind: 'balance', period: '2026-10', value: -25, percentile: { pct: 4, from: '2005-01', months: 262 } },
    { id: 'esi', label: 'Economic sentiment indicator', kind: 'index', period: '2026-10', value: 98.2, percentile: { pct: 40, from: '2005-01', months: 262 } },
    { id: 'prices', label: "Households' expected price trends over the next 12 months", kind: 'balance', period: '2026-10', value: 30.5, yearAgo: { period: '2025-10', value: 20.0 }, percentile: { pct: 93, from: '2005-01', months: 262 } },
  ],
};

test('the agent is on the council list, with a badge, a follow-up and words that bring it in', () => {
  assert.ok(AGENT_ORDER.includes('behaviour'));
  assert.equal(COUNCIL_AGENTS.behaviour.name, 'Behavioural Finance');
  assert.equal(agentBadge('behaviour').icon, 'crowd');
  assert.match(agentChoicePrompt('x'), /- behaviour: Behavioural Finance Agent, covers herding and sentiment/);
  const plan = planCouncil('Is there herding in German sentiment?', [item({ euSurveys: surveys })]);
  assert.ok(plan.agents.some((a) => a.id === 'behaviour'));
});

test('surveys are placed against their own history; households expectations and their 12-month change are read', () => {
  const r = behaviourReadings(item({ euSurveys: surveys }), NOW);
  const text = r.parts.join(' ');
  assert.match(text, /Consumer confidence is balance −25\.0, the 4th percentile of 262 months since 2005-01, near the bottom of its range \(2026-10\)\./);
  assert.match(text, /expected price trends over the next 12 months is balance \+30\.5, the 93rd percentile .* near the top of its range/);
  assert.match(text, /have risen 10\.5 points over the year/);
  assert.ok(r.figures.every((f) => f.tag !== 'estimate' && f.tag !== 'sample'));
  assert.ok(r.figures.filter((f) => /European Commission/.test(f.source)).every((f) => f.source.includes(NOT_TESTED) || /pre-registered test/.test(f.source)));
  assert.ok(r.missing.some((m) => m.includes(BREAKEVEN_MISSING_EU)));
  assert.ok(r.missing.some((m) => m.includes(KALSHI_MISSING)));
  assert.equal(r.weight, 0.92);
});

test('crowding points to its own test; crowd odds are prices, not forecasts; non-EU surveys read Missing', () => {
  const it = item({
    iso3: 'MEX',
    countryName: 'Mexico',
    cftc: { iso3: 'MEX', ccy: 'MXN', market: 'x', reportDate: '2026-11-04', openInterest: 1, levNetContracts: 1, levNetPctOi: 30, assetMgrNetPctOi: 0, percentile: 95, weeks: 156, pulledAt: 'x' },
    politics: { markets: [{ question: 'Will Mexico cut rates?', probabilityPct: 93, volumeUsd: 5e5, url: 'u', change1wPts: 4 }], marketsPulledAt: '2026-11-11' },
  });
  const a = behaviourAgent([it], NOW);
  assert.equal(a.findings.length, 1);
  const f = a.findings[0];
  assert.match(f.reading, /Speculators are crowded long the MXN \(95th percentile of 3 years\)/);
  assert.match(f.reading, /prices "Will Mexico cut rates\?" at 93% yes, close to certain/);
  assert.match(f.reading, /Description, not a tested signal; the crowding rule has its own badge\.$/);
  assert.ok(f.figures.find((x) => /Leveraged funds/.test(x.label))!.source.includes('cftc_crowding'));
  assert.ok(f.figures.find((x) => /Crowd odds/.test(x.label))!.source.includes('not a forecast'));
  assert.ok(a.missing.some((m) => m.includes(SURVEY_MISSING_NON_EU)));
  assert.ok(!/will (?:rise|fall)|probability of|\d+% chance/i.test(f.reading));
});

test('a country with nothing to describe is a gap, not a finding', () => {
  const a = behaviourAgent([item({ iso3: 'ZZZ', countryName: 'Nowhere' })], NOW);
  assert.equal(a.findings.length, 0);
  assert.ok(a.missing.some((m) => /Nowhere: no positioning, crowd odds or survey figures/.test(m)));
});

test('runCouncil runs the agent and keeps its figures for the number check', () => {
  const it = item({ euSurveys: surveys });
  const plan = { ...planCouncil('sentiment in Germany', [it]), agents: [{ id: 'behaviour' as const, why: 'test' }] };
  const out = runCouncil('sentiment in Germany', plan, [it], NOW);
  assert.equal(out[0].id, 'behaviour');
  assert.ok(out[0].findings[0].figures.some((x) => x.value.includes('30.5')));
});

test('EU surveys: households price expectations come from ei_bsco_m as a balance, with a percentile and a year-ago value', () => {
  assert.equal(EU_PRICE_EXPECTATIONS.code, 'BS-PT-NY');
  assert.match(euSurveyUrl(EU_PRICE_EXPECTATIONS, ['DE'], '1999-01'), /data\/ei_bsco_m\?format=JSON&lang=EN&indic=BS-PT-NY&s_adj=SA&unit=BAL&geo=DE&sinceTimePeriod=1999-01$/);
  const pts = months('2015-01', 72).map((period, i) => ({ period, value: i }));
  const s = euSurveySummary('DEU', { pulledAt: 'x', series: { DEU: { prices: pts } } })!;
  const p = s.latest.find((x) => x.id === 'prices')!;
  assert.equal(p.yearAgo!.value, 59);
  assert.deepEqual(p.percentile, { pct: 100, from: '2015-01', months: 72 });
  assert.equal(surveyPercentile(pts.slice(0, SURVEY_PERCENTILE_MIN_MONTHS - 1)), undefined);
});

/* --------------------------------------------------------------- the pre-registered test (G32) */

const spec = JSON.parse(fs.readFileSync('docs/validation/preregistered/inflation_expectations_lead.json', 'utf8')) as BacktestSpec;

test('the registered spec is runnable unchanged: method, seed and pass mark as written', () => {
  assert.equal(spec.method, 'expectations_direction');
  const h = hitRateSpec(spec);
  assert.equal(h.passMark.minLiftPts, 5);
  assert.equal(h.passMark.minSeriesShare, 0);
  assert.equal(h.passMark.minCases, 100);
  assert.equal(h.passMark.minYears, 15);
});

test('expectationsDirectionCases: one December per year, direction against inflation 12 months on, open calls for the latest', () => {
  const sv = [
    { period: '2009-12', value: 10 }, { period: '2010-12', value: 20 }, { period: '2011-12', value: 15 },
    { period: '2012-12', value: 15 }, { period: '2024-12', value: 5 }, { period: '2025-12', value: 9 },
  ];
  const hi = [
    { period: '2010-12', value: 2.0 }, { period: '2011-12', value: 3.0 }, { period: '2012-12', value: 2.5 },
    { period: '2013-12', value: 2.5 }, { period: '2025-12', value: 2.1 },
  ];
  const open: Array<{ due: string }> = [];
  const cases = expectationsDirectionCases(spec, 'DEU', sv, hi, 2025, open as never);
  // 2010: +10 then inflation 2.0 -> 3.0 (hit). 2011: -5 then 3.0 -> 2.5 (hit). 2012: unchanged, no call. 2025: +4, outcome 2026-12 not out: open.
  assert.deepEqual(cases.map((c) => [c.when, c.hit, c.base]), [['2010-12', true, 0.5], ['2011-12', true, 0.5]]);
  assert.deepEqual(open.map((o) => o.due), ['2026-12']);
});

test('the judge uses the spec seed and redraws, and no series-share rule', () => {
  const cases = Array.from({ length: 160 }, (_, i) => ({ where: `C${i % 8}`, when: `${2000 + (i % 20)}-12`, what: 'x', hit: i % 3 !== 0, base: 0.5 }));
  const r = judgeWithRobustness(hitRateSpec(spec), cases);
  assert.equal(r.robustness.resamples, 4000);
  assert.equal(r.hitRatePct, 66.3);
  assert.equal(r.status, 'passed');
  // A different seed gives a (slightly) different p-value: the spec's seed is the one used.
  const other = robustness({ ...hitRateSpec(spec), params: { ...spec.params, seed: 1 } }, cases);
  assert.ok(Number.isFinite(other.pValue));
  const few = judgeWithRobustness(hitRateSpec(spec), cases.slice(0, 90));
  assert.equal(few.status, 'too_few_cases');
});

test('HICP: prc_hicp_manr to its last month, then prc_hicp_minr only for later months', () => {
  const out = spliceHicp({ DE: [{ period: '2025-11', value: 2 }, { period: '2025-12', value: 2.1 }] }, { DE: [{ period: '2025-12', value: 9 }, { period: '2026-01', value: 2.2 }], FR: [{ period: '2026-01', value: 1 }] });
  assert.deepEqual(out.DE.map((p) => p.value), [2, 2.1, 2.2]);
  assert.deepEqual(out.FR.map((p) => p.value), [1]);
});
