import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryChart, chartRequest, computeChart, seriesInQuestion, type FetchedSeries } from '../src/utils/councilChart.ts';
import { chartAnswer, planCouncil, planFollowUp, suggestFollowUps, answersForModel, allowedNumbers, answersAsText } from '../src/utils/askCouncil.ts';
import { shiftPeriod } from '../src/utils/stats.ts';
import type { LiveWatchlistItem } from '../src/types/council.ts';

const it = (iso3: string, countryName: string) => ({ iso3, countryName }) as unknown as LiveWatchlistItem;
const BRA = it('BRA', 'Brazil');
const MEX = it('MEX', 'Mexico');
const items = [BRA, MEX, it('TUR', 'Turkey')];

// Test series made here (a policy rate that follows inflation three months later), never shown in the app.
const months = Array.from({ length: 120 }, (_, i) => shiftPeriod('2016-01', i, 'monthly'));
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
const infl = months.map((d, i) => ({ date: d, value: 5 + 3 * Math.sin(i / 9) + 0.6 * noise() }));
const rate = months.map((d, i) => ({ date: d, value: 8 + 3 * Math.sin((i - 3) / 9) + 0.4 * noise() }));
const S = (id: string, label: string, unit: string, points: Array<{ date: string; value: number }>): FetchedSeries => ({ id, label, unit, freq: 'monthly', source: 'test series', points });

test('reading the question: series in order, debt-to-GDP not read as GDP growth', () => {
  assert.deepEqual(seriesInQuestion('chart debt to GDP against the policy rate').map((s) => s.id), ['debt_gdp', 'policy_rate']);
  assert.deepEqual(seriesInQuestion('plot Brent and the exchange rate').map((s) => s.id), ['commodity_pink_sheet_crude_brent', 'fx_per_usd']);
});

test('a chart request needs chart words or a test that can run; ordinary questions are left alone', () => {
  assert.equal(chartRequest('Is Brazil behind the curve on inflation?', [BRA], true), null);
  const r = chartRequest("Chart Brazil's policy rate against inflation and test whether one leads the other", [BRA], true)!;
  assert.deepEqual(r.series.map((s) => s.id), ['policy_rate', 'cpi_monthly']);
  assert.equal(r.series[1].fallback, 'cpi_imf');
  assert.deepEqual(r.tests, ['correlation', 'leadlag']);
  // One series for two countries: both on one chart.
  const two = chartRequest('plot the policy rate for Brazil and Mexico', [BRA, MEX], true)!;
  assert.deepEqual(two.series.map((s) => s.iso3), ['BRA', 'MEX']);
  // A test word alone, with two series named, is enough.
  assert.ok(chartRequest('Is Brazil inflation correlated with the policy rate?', [BRA], true));
});

test('planner: a chart question with no desk topic goes to the Chart Agent alone; follow-ups keep the chart', () => {
  const p = planCouncil('plot Brazil copper and gold', items);
  assert.ok(p.chart);
  assert.equal(p.agents.length, 0);
  const f = planFollowUp('Is that relationship stable over time?', p, items);
  assert.ok(f.chart);
  assert.ok(f.chart!.tests.includes('rolling'));
  assert.deepEqual(f.chart!.series.map((s) => s.id), p.chart!.series.map((s) => s.id));
  const m = planFollowUp('what about Mexico?', planCouncil("chart Brazil's policy rate against inflation", items), items);
  assert.deepEqual(m.chart!.series.map((s) => s.iso3), ['MEX', 'MEX']);
  assert.ok(suggestFollowUps(p, []).length > 0);
});

test('computeChart: lines, tests with readings, and missing series named with the reason', () => {
  const req = chartRequest('chart Brazil policy rate against inflation, run a regression and Granger test, and check stationarity', [BRA], true)!;
  const res = computeChart(req, [S('policy_rate', 'Policy rate', '%', rate), { reason: 'OECD inflation has not answered yet' }]);
  assert.equal(res.lines.length, 1);
  assert.match(res.missing[0], /Inflation: Missing \(OECD inflation has not answered yet\)/);
  assert.match(res.tests.find((t) => t.test === 'regression')!.reading, /Not run: it needs two series/);

  const full = computeChart(req, [S('policy_rate', 'Policy rate', '%', rate), S('cpi_monthly', 'Inflation, monthly', '%', infl)]);
  assert.equal(full.freq, 'monthly');
  assert.equal(full.lines.length, 2);
  const lead = computeChart({ ...req, tests: ['leadlag'] }, [S('cpi_monthly', 'Inflation', '%', infl), S('policy_rate', 'Policy rate', '%', rate)]);
  assert.match(lead.tests[0].reading, /Inflation moves first, by about 3 months/);
  assert.ok(full.scatter && full.scatter.pairs.length === 120);
  assert.ok(full.tests.some((t) => t.test === 'adf'));
  assert.ok(full.tests.some((t) => t.test === 'granger' && t.figures.length));
});

test('the Chart Agent answer: findings the summary may quote, points kept off the AI request', () => {
  const req = chartRequest('chart Brazil policy rate against inflation', [BRA], true)!;
  const res = computeChart(req, [S('policy_rate', 'Policy rate', '%', rate), S('cpi_monthly', 'Inflation', '%', infl)]);
  const a = chartAnswer(req, res);
  assert.equal(a.id, 'chart');
  assert.ok(a.findings[0].figures.some((f) => /Correlation \(r\)/.test(f.label)));
  const r = res.tests[0].figures[0].value;
  assert.ok(allowedNumbers('q', [a]).includes(Number(r)));
  assert.equal('chart' in answersForModel([a])[0], false);
  assert.match(answersAsText('q', [a]), /Chart Agent/);
});

test('carryChart swaps countries for "what about Mexico?" and keeps world series', () => {
  const req = chartRequest('plot Brazil inflation and oil', [BRA], true)!;
  const next = carryChart('and Mexico?', req, [MEX]);
  assert.deepEqual(next.series.map((s) => s.iso3), ['MEX', null]);
});
