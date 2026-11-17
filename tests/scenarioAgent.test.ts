import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dsaRuns, engineRuns, largestMove, lpRun, resolvedChange, scenarioAnswer, scenarioFinding, scenarioFromQuery, type ScenarioCountryData } from '../src/utils/scenarioAgent.ts';
import { parseScenario, scenarioQuery } from '../src/utils/scenarioQuestion.ts';
import { debtSustainability } from '../src/utils/debtSustainability.ts';
import type { LiveWatchlistItem } from '../src/types/council.ts';

const TUR = {
  iso3: 'TUR',
  countryName: 'Turkey',
  policyRatePct: 40,
  policyRateSource: 'bis',
  policyRateDate: '2026-10-23',
  cpiInflationPct: 33,
  cpiSource: 'live',
  yield10YPct: 30,
  yield10YSource: 'official',
  yield10YPeriod: '2026-10',
  trade: { fuelImportsPctMerch: 16, fuelExportsPctMerch: 4, importsPctGdp: 32, exportsPctGdp: 30, wbYear: '2025', brentUsd: 80, pricesAsOf: '2026-10' },
  tradeMix: { exportFoodPct: { value: 10, year: '2024' }, importFoodPct: { value: 5, year: '2024' } },
  fiscal: { intlBonds: { usdBn: 100, asOf: '2026-Q2' } },
  imf: { currentAccount4q: { usdBn: -20, through: '2026-Q2', pctGdp: -2, gdpYear: '2025', gdpUsdBn: 1000 }, pulledAt: '2026-11-01' },
} as unknown as LiveWatchlistItem;

test('the shocks travel to the server and back, checked', () => {
  const sq = parseScenario('What if the Fed raised rates by 1 point and oil hits $120?')!;
  const back = scenarioFromQuery(decodeURIComponent(scenarioQuery(sq)))!;
  assert.deepEqual(back.shocks.map((s) => [s.kind, s.change, s.target]), [['us_rate', 1, null], ['oil', null, { value: 120, unit: 'usd' }]]);
  assert.equal(scenarioFromQuery('[{"kind":"us_rate","change":900}]'), null);
  assert.equal(scenarioFromQuery('[{"kind":"weather","change":1}]'), null);
  assert.equal(scenarioFromQuery('not json'), null);
  assert.equal(scenarioFromQuery('[]'), null);
});

test('levels resolve against today\'s figure only when it is on file', () => {
  const oil = parseScenario('What if oil hits $120?')!.shocks[0];
  assert.equal(resolvedChange(oil, TUR)!.change, 50);
  assert.match(resolvedChange(oil, TUR)!.basis!, /Brent \$80\.0 in October 2026/);
  assert.equal(resolvedChange(oil, { ...TUR, trade: {} } as LiveWatchlistItem), null);
  const rate = parseScenario('What if the central bank raised rates to 45%?')!.shocks[0];
  assert.equal(resolvedChange(rate, TUR)!.change, 5);
});

test('engine runs apply the question\'s factor shocks with the band', () => {
  const model = { response: 'fx' as const, ok: true as const, factors: ['us_rate' as const], beta: [2], se: [0.5], cov: [[0.25]], r2: 0.2, n: 170, from: '2011-11', to: '2026-10', residualSd: 2, maxMove: [0.75] };
  const sq = parseScenario('What if the Fed raised rates by 1 point?')!;
  const [r] = engineRuns([model], sq);
  assert.equal(r.value, 2);
  assert.ok(r.lo! < 2 && r.hi! > 2);
  assert.deepEqual(r.beyondSample, ['us_rate']);
  assert.deepEqual(engineRuns([model], parseScenario('What if oil rose 10%?')!), []);
  assert.deepEqual(engineRuns([{ response: 'policy', ok: false, reason: 'not in BIS' }], sq), [{ response: 'policy', ok: false, reason: 'not in BIS' }]);
});

test('largest monthly move, with its month', () => {
  const m = new Map([['2020-03', -1.5], ['2022-06', 0.75], ['2023-01', 0.25]]);
  assert.deepEqual(largestMove('us_rate', m, 'BIS'), { kind: 'us_rate', move: -1.5, month: '2020-03', from: '2020-03', source: 'BIS' });
  assert.equal(largestMove('us_rate', new Map(), 'BIS'), null);
});

test('local projections scale to the stated change, band flipped for a cut', () => {
  const lp = { ok: true as const, steps: [6, 12, 24].map((h) => ({ h, beta: -0.5, se: 0.1, lo: -0.7, hi: -0.3, p: 0.01, n: 100 })), from: '2005-01', to: '2026-09', n: 200, moves: 40, lags: 3, method: '' };
  const run = lpRun(lp);
  const data: ScenarioCountryData = { iso3: 'TUR', countryName: 'Turkey', lp: run };
  const cut = scenarioFinding(parseScenario('What if Turkey cut rates by 2 points?')!, TUR, data).finding!;
  const f24 = cut.figures.find((f) => f.label === 'After the shock: inflation, 24 months on')!;
  assert.equal(f24.value, '+1.00 pts (90% band +0.60 to +1.40)');
  assert.match(f24.source, /reduced form, co-movement not cause/);
  assert.equal(cut.figures.find((f) => f.label === 'After the shock: real policy rate on impact')!.value, '+7.00% to +5.00%');
  assert.ok(cut.figures.some((f) => f.label === 'Now: policy rate' && f.value === '40.00%'));
});

test('debt identity: borrowing costs, growth and inflation against the baseline', () => {
  const pts = (vals: Record<string, number>, projFrom = '2026') => ({ points: Object.entries(vals).map(([date, value]) => ({ date, value, ...(date >= projFrom ? { note: 'IMF projection' } : {}) })) });
  const years = ['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
  const flat = (v: number) => Object.fromEntries(years.map((y) => [y, v]));
  const base = debtSustainability({ debt: pts(flat(60)) as never, primaryBalance: pts(flat(0)) as never, overallBalance: pts(flat(-3)) as never, realGrowth: pts(flat(2)) as never, inflation: pts(flat(3)) as never });
  assert.ok(base.ok);
  const sq = parseScenario('What if bond yields rose 200 bps and growth slowed by 1 point?')!;
  const r = dsaRuns(base as never, sq, 'TUR');
  assert.ok(r.ok);
  if (!r.ok) return;
  const [i, g] = r.runs;
  assert.equal(i.kind, 'interest_cost');
  assert.ok(i.shockedEnd > i.baselineEnd);
  assert.equal(g.kind, 'growth');
  assert.ok(g.shockedEnd > g.baselineEnd);
  const inf = dsaRuns(base as never, parseScenario('What if inflation rose 3 points?')!, 'TUR');
  assert.ok(inf.ok && inf.runs[0].shockedEnd < inf.runs[0].baselineEnd);
  assert.deepEqual(dsaRuns({ ...(base as object), baselineInputs: undefined, missing: [] } as never, sq, 'TUR').ok, false);
});

test('currency and price shocks: dollar bonds and the first-round trade effect', () => {
  const ccy = scenarioFinding(parseScenario('What if the lira fell 20% against the dollar?')!, TUR, undefined).finding!;
  assert.equal(ccy.figures.find((f) => f.label === 'After the shock: debt to GDP from dollar bonds')!.value, '+2.00 pts of GDP');
  const oil = scenarioFinding(parseScenario('What if oil hits $120?')!, TUR, undefined).finding!;
  // Net fuel = 0.04 x 30 - 0.16 x 32 = -3.92% of GDP; +50% -> -1.96% of GDP.
  assert.equal(oil.figures.find((f) => f.label === 'After the shock: trade balance, first round')!.value, '-1.96% of GDP');
  assert.ok(oil.figures.some((f) => f.label === 'Now: Brent crude'));
  const food = scenarioFinding(parseScenario('What if food prices rose 10%?')!, TUR, undefined).finding!;
  assert.equal(food.figures.find((f) => f.label === 'After the shock: trade balance, first round')!.value, '+0.14% of GDP');
});

test('the answer: Missing with reasons, the largest past move offered when no size is given', () => {
  const sq = parseScenario('What if the Fed hikes?')!;
  const a = scenarioAnswer(sq, [TUR], [{ iso3: 'TUR', countryName: 'Turkey', largest: [{ kind: 'us_rate', move: 0.75, month: '2022-06', from: '2011-11', source: 'BIS, US policy rate, monthly' }] }]);
  assert.equal(a.id, 'scenario');
  assert.equal(a.findings.length, 0);
  assert.match(a.missing.join(' '), /largest monthly move since November 2011 was \+0\.75 pts in June 2022/);
  // Sample figures never start the scenario.
  const sample = scenarioFinding(parseScenario('What if the lira fell 20% against the dollar?')!, { ...TUR, cpiSource: 'sample', policyRateSource: 'sample' } as LiveWatchlistItem, undefined).finding!;
  assert.ok(!sample.figures.some((f) => f.label === 'Now: inflation' || f.label === 'Now: policy rate'));
});
