import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateGapModel, fitGapEquations, gapModelCases, gapQuarters, nextQuarter, projectGap, quarterMeans, realTimeGaps, type GapQuarter } from '../src/utils/gapModelEstimate.ts';
import type { CountryData } from '../src/utils/forecastCases.ts';

function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

const quarters = (from: string, n: number) => Array.from({ length: n }, (_, k) => nextQuarter(from, k));

/** A country whose data follow the model's own three equations (known coefficients). */
function country(n = 120, seed = 3): { c: CountryData; rows: GapQuarter[] } {
  const z = rng(seed);
  const rows: GapQuarter[] = [{ period: '1995-Q1', y: 0, p: 3, i: 4 }];
  for (let t = 1; t < n; t++) {
    const l = rows[t - 1];
    const y = 0.2 + 0.7 * l.y - 0.15 * (l.i - l.p) + 0.5 * z();
    const p = 0.6 + 0.8 * l.p + 0.2 * l.y + 0.3 * z();
    const i = 0.3 + 0.7 * l.i + 0.4 * p + 0.2 * y + 0.2 * z();
    rows.push({ period: nextQuarter('1995-Q1', t), y, p, i });
  }
  const months = (q: string) => [1, 2, 3].map((k) => `${q.slice(0, 4)}-${String((Number(q.slice(6)) - 1) * 3 + k).padStart(2, '0')}`);
  const g = rng(seed + 1);
  return {
    rows,
    c: {
      iso3: 'TST',
      gdpQoq: rows.map((r) => ({ date: r.period, value: 0.5 + 0.3 * g() })),
      cpi: rows.flatMap((r) => months(r.period).map((m) => ({ date: m, value: r.p }))),
      policy: rows.flatMap((r) => months(r.period).map((m) => ({ date: m, value: r.i }))),
    },
  };
}

test('quarter means need all three months; quarters step across years', () => {
  const m = quarterMeans([{ date: '2026-01', value: 1 }, { date: '2026-02', value: 2 }, { date: '2026-03', value: 3 }, { date: '2026-04', value: 9 }]);
  assert.deepEqual([...m], [['2026-Q1', 2]]);
  assert.equal(nextQuarter('2026-Q4'), '2027-Q1');
  assert.equal(nextQuarter('2026-Q1', 7), '2027-Q4');
});

test('the output gap is one-sided: adding later quarters never changes an earlier gap', () => {
  const g = rng(9);
  const pts = quarters('2000-Q1', 60).map((d) => ({ date: d, value: 0.6 + g() }));
  const short = realTimeGaps(pts.slice(0, 40));
  const long = realTimeGaps(pts);
  assert.equal(short.size, 40 - 11);
  for (const [q, v] of short) assert.equal(long.get(q), v);
});

test('equation fit recovers the coefficients of data built from the model', () => {
  const { rows } = country(2000, 5);
  const c = fitGapEquations(rows)!;
  assert.ok(Math.abs(c.b1 - 0.7) < 0.05 && Math.abs(c.b2 + 0.15) < 0.05, JSON.stringify(c));
  assert.ok(Math.abs(c.c1 - 0.8) < 0.05 && Math.abs(c.c2 - 0.2) < 0.05);
  assert.ok(Math.abs(c.rho - 0.7) < 0.05 && Math.abs(c.d1 - 0.4) < 0.08);
  const path = projectGap(c, rows[rows.length - 1], 40);
  assert.equal(path.length, 40);
  assert.ok(path.every((s) => Number.isFinite(s.p)));
});

test('cases: inflation h quarters ahead against the origin inflation carried on, nothing from after the origin', () => {
  const { c } = country(120, 7);
  const spec = { id: 'x', version: 1, registeredOn: '', registeredBy: '', hypothesis: '', target: 'cpi_gap_model_q', params: { window: 60, minTrain: 32 }, benchmark: 'naive', horizons: [4, 8], sample: { from: '2000-Q1' }, passMark: { maxRelRmse: 0.95, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 1, minYears: 1 }, knownLimits: [] } as any;
  const { cases, series } = gapModelCases(spec, [c]);
  assert.deepEqual(series, ['TST']);
  const rows = gapQuarters(c);
  const one = cases.find((x) => x.h === 4)!;
  const k = rows.findIndex((r) => r.period === one.origin);
  assert.equal(one.bench.mean, rows[k].p);
  assert.equal(one.target, rows[k + 4].period);
  assert.equal(one.actual, rows[k + 4].p);
  assert.ok(cases.every((x) => x.origin >= '2000-Q1' && x.target > x.origin));
});

test('live estimate: too few quarters gives none; otherwise a projection after the last quarter', () => {
  const { c } = country(120, 11);
  const e = estimateGapModel(c)!;
  assert.equal(e.quarters, 60);
  assert.equal(e.path[0].period, nextQuarter(e.through));
  assert.equal(e.path.length, 8);
  assert.equal(estimateGapModel(country(30, 2).c), null);
});
