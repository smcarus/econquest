import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import type { AlfredDef, AlfredRow } from '../src/utils/alfredVintages';
import { figureAsOf, firstRelease, indexVintages, periodKeyOf, realTimeCases, seriesAsOf, weoRealTimeCases } from '../src/utils/realTimeEval';
import { realTimeRun } from '../src/utils/forecastEvalRun';
import type { ForecastSpec } from '../src/utils/forecastEval';
import type { WeoVintageStore } from '../src/utils/weoVintages';

const Q: AlfredDef = { id: 'X', label: 'x', unit: '%', transform: 'level', freq: 'quarterly' };
const day = (y: number, m: number, d = 15) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const qDate = (i: number) => `${2000 + Math.floor(i / 4)}-${String((i % 4) * 3 + 1).padStart(2, '0')}-01`;

/** Quarterly level series: each quarter first published a month after it ends at `first`, revised by +10 a year later. */
function vintages(n: number, seed = 5): { rows: AlfredRow[]; first: number[] } {
  const rand = seededRandom(seed);
  const rows: AlfredRow[] = [];
  const first: number[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    x = 0.5 * x + (rand() - 0.5);
    first.push(x);
    const y = 2000 + Math.floor(i / 4);
    const endMonth = (i % 4) * 3 + 3;
    const pub = endMonth === 12 ? day(y + 1, 1) : day(y, endMonth + 1);
    const rev = `${Number(pub.slice(0, 4)) + 1}${pub.slice(4)}`;
    rows.push({ date: qDate(i), value: x, from: pub, to: rev });
    rows.push({ date: qDate(i), value: x + 10, from: rev, to: '9999-12-31' });
  }
  return { rows, first };
}

test('the series as known on a day holds first figures for recent quarters and revisions for old ones', () => {
  const { rows, first } = vintages(12);
  const ix = indexVintages(Q, rows);
  const s = seriesAsOf(ix, '2002-02-20');
  // 2001-Q4 came out 2002-01-15; quarters published before 2001-02-20 were revised by then.
  assert.equal(s.dates[s.dates.length - 1], '2001-10-01');
  assert.equal(s.values[s.values.length - 1], first[7]);
  assert.equal(s.values[0], first[0] + 10);
  assert.equal(figureAsOf(ix, '2003-01-01', '2002-02-20'), undefined);
  assert.deepEqual(firstRelease(ix, qDate(3)), { day: '2001-01-15', value: first[3] });
  assert.equal(periodKeyOf(Q, '2001-10-01'), '2001-Q4');
});

test('growth rates as published use both periods from the same vintage', () => {
  const G: AlfredDef = { ...Q, transform: 'qoq' };
  const rows: AlfredRow[] = [
    { date: '2020-01-01', value: 100, from: '2020-04-30', to: '2020-07-29' },
    { date: '2020-01-01', value: 110, from: '2020-07-30', to: '9999-12-31' },
    { date: '2020-04-01', value: 105, from: '2020-07-30', to: '9999-12-31' },
  ];
  const ix = indexVintages(G, rows);
  assert.equal(figureAsOf(ix, '2020-04-01', '2020-08-01')!.toFixed(4), (((105 / 110) - 1) * 100).toFixed(4));
  assert.equal(firstRelease(ix, '2020-04-01')!.day, '2020-07-30');
});

const spec = (over: Partial<ForecastSpec> = {}): ForecastSpec => ({
  id: 'gdp_forecast_realtime', version: 1, registeredOn: '2026-11-22', registeredBy: 't', hypothesis: '', target: 'gdp_realtime_q',
  params: { maxLag: 2, d: 0, intercept: 1, window: 0, minTrain: 20 }, benchmark: 'mean', horizons: [1, 4], sample: { from: '2005-Q1' },
  passMark: { maxRelRmse: 0.95, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 10, minYears: 3 }, knownLimits: [], ...over,
});

test('real-time cases are scored on the first published figure and never on a later revision', () => {
  const { rows, first } = vintages(80);
  const cases = realTimeCases([{ where: 'USA', def: Q, rows }], spec());
  assert.ok(cases.length > 40);
  const byTarget = new Map(first.map((v, i) => [periodKeyOf(Q, qDate(i)), v]));
  for (const c of cases) assert.equal(c.actual, byTarget.get(c.target), c.target);
  assert.ok(cases.every((c) => c.origin >= '2005-Q1'));
  // One quarter ahead of origin 2010-Q1 is 2010-Q2; four ahead is 2011-Q1.
  const o = cases.filter((c) => c.origin === '2010-Q1');
  assert.deepEqual(o.map((c) => `${c.h}:${c.target}`).sort(), ['1:2010-Q2', '4:2011-Q1']);
  // The mean benchmark is taken on the vintage: it includes the +10 revisions of quarters over a year old.
  assert.ok(o[0].bench.mean > 5);
  assert.ok(cases.every((c) => c.others && Number.isFinite(c.others.drift)));
});

function weoStore(): WeoVintageStore {
  // Growth 2.0 every year, first published as 2.0 and later revised to 3.0; IMF projects 2.5.
  const editions = [] as WeoVintageStore['editions'];
  for (let y = 2010; y <= 2016; y++) {
    const years: Record<string, number> = {};
    for (let t = 1990; t <= y + 1; t++) years[String(t)] = t <= y - 1 ? (t <= y - 3 ? 3 : 2) : 2.5;
    editions.push({ vintage: `${y}-04`, publishedBy: `${y}-04-30`, file: `WEOApr${y}all.xls`, rows: { AAA: { NGDP_RPCH: { estimatesAfter: y - 1, years } }, WHQ: { NGDP_RPCH: { estimatesAfter: y - 1, years } } } });
  }
  return { editions, skipped: [] };
}

test('WEO real-time cases: fitted on the years an edition marks as actual, scored on the first actual figure, IMF projection kept beside', () => {
  const store = weoStore();
  const s = spec({ target: 'gdp_weo_realtime_a', horizons: [1, 2], params: { maxLag: 1, d: 0, intercept: 1, window: 0, minTrain: 10 }, sample: { from: '2010-01' } });
  const cases = weoRealTimeCases(store, 'NGDP_RPCH', s, (iso) => iso === 'AAA');
  assert.ok(cases.length > 0);
  assert.ok(cases.every((c) => c.where === 'AAA'));
  for (const c of cases) {
    assert.equal(c.actual, 2, `${c.origin} ${c.target}`);
    assert.equal(c.others!.imf, 2.5);
  }
  const first = cases.find((c) => c.origin === '2010-04' && c.h === 1)!;
  assert.equal(first.target, '2010');
  const r = realTimeRun(s, store, undefined);
  assert.ok('cases' in r && /7 editions \(2010-04 to 2016-04\)/.test(r.data));
});

test('a real-time spec with nothing to read says so', () => {
  assert.match((realTimeRun(spec({ target: 'gdp_weo_realtime_a' }), undefined, undefined) as { problem: string }).problem, /no past WEO editions/);
  assert.match((realTimeRun(spec(), undefined, { gdp: [], cpi: [], missing: ['US GDPC1: needs your free FRED API key'] }) as { problem: string }).problem, /FRED API key/);
});
