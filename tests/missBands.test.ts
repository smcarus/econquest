import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { appMissSteps, missQuantiles, quantile, rangeFromMisses, weoMissBands, weoMissCases, MIN_MISS_CASES } from '../src/utils/missBands';
import { scoreHorizon, type ForecastCase } from '../src/utils/forecastEval';
import type { WeoEdition, WeoVintageStore } from '../src/utils/weoVintages';

/** October editions 2005..2024 for BRA growth: each projects its own year at 3.0 and next year at 3.5; data up to the year before. Actual for year Y is 2 + (Y % 3). */
function store(lastYear = 2024): WeoVintageStore {
  const editions: WeoEdition[] = [];
  for (let y = 2005; y <= lastYear; y++) {
    const years: Record<string, number> = {};
    for (let past = 2000; past < y; past++) years[String(past)] = 2 + (past % 3);
    years[String(y)] = 3;
    years[String(y + 1)] = 3.5;
    editions.push({ vintage: `${y}-10`, publishedBy: `${y}-10-31`, file: `WEOOct${y}.xls`, rows: { BRA: { NGDP_RPCH: { estimatesAfter: y - 1, years } } } });
  }
  return { editions, skipped: [] };
}

test('quantile and missQuantiles interpolate', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantile([0, 10], 0.15), 1.5);
  assert.deepEqual(missQuantiles([0, 10]), [0.5, 1.5, 8.5, 9.5]);
  assert.equal(rangeFromMisses(1, [1, 2, 3]), null);
  const r = rangeFromMisses(2, [-1, -1, 0, 0, 0, 0, 1, 1])!;
  assert.equal(r.cases, 8);
  assert.ok(r.lo90 <= r.lo70 && r.lo70 <= 2 && 2 <= r.hi70 && r.hi70 <= r.hi90);
});

test('IMF misses: projection against the newest edition that gives the year as data', () => {
  const cases = weoMissCases(store(), 'bra', 'NGDP_RPCH');
  const same = cases.filter((c) => c.yearsAhead === 0);
  // Editions 2005..2023 have an outturn for their own year (the 2024 edition is the last).
  assert.equal(same.length, 19);
  const c = same.find((x) => x.year === '2010')!;
  assert.equal(c.projected, 3);
  assert.equal(c.actual, 2 + (2010 % 3));
  assert.equal(c.miss, c.actual - 3);
  assert.equal(c.actualFrom, '2024-10');
  assert.equal(cases.filter((x) => x.yearsAhead === 1).length, 18);
});

test('IMF bands around the latest edition, Missing under 8 cases, Missing with nothing saved', () => {
  const b = weoMissBands(store(), 'BRA', 'NGDP_RPCH');
  assert.equal(b.edition, '2024-10');
  assert.equal(b.season, 'october');
  const r0 = b.rows.find((r) => r.yearsAhead === 0)!;
  assert.equal(r0.projection, 3);
  assert.equal(r0.range!.cases, 19);
  assert.deepEqual(r0.span, { from: '2005-10', to: '2023-10' });
  assert.ok(r0.range!.lo90 >= 2 - 0.01 && r0.range!.hi90 <= 4 + 0.01);
  const small = weoMissBands(store(2010), 'BRA', 'NGDP_RPCH');
  const s0 = small.rows.find((r) => r.yearsAhead === 0)!;
  assert.equal(s0.range, undefined);
  assert.equal(s0.cases, 5);
  assert.match(s0.reason!, /only 5 past October-type editions .* 8 are needed/);
  assert.equal(weoMissBands({ editions: [], skipped: [] }, 'BRA', 'NGDP_RPCH').why, 'none_saved');
  assert.equal(weoMissBands(store(), 'ARG', 'NGDP_RPCH').why, 'no_series');
});

test('evaluation keeps per-country miss percentiles, and the app path gets ranges from them', () => {
  const mk = (i: number, where: string): ForecastCase => ({ where, origin: `${2000 + i}-Q1`, target: `${2000 + i}-Q2`, h: 1, actual: i % 2 ? 1 : -1, model: { mean: 0, sd: 1 }, bench: { mean: 0 } });
  const cases = [...Array.from({ length: 10 }, (_, i) => mk(i, 'BRA')), ...Array.from({ length: 3 }, (_, i) => mk(i, 'CHL'))];
  const hs = scoreHorizon(cases, 1);
  const bra = hs.bySeries.find((s) => s.where === 'BRA')!;
  assert.deepEqual(bra.miss, [-1, -1, 1, 1]);
  assert.equal(bra.meanMiss, 0);
  assert.equal(hs.bySeries.find((s) => s.where === 'CHL')!.miss, undefined);
  const path = [{ period: '2026-Q1', mean: 0.5 }, { period: '2026-Q2', mean: 0.6 }];
  const steps = appMissSteps(path, 'BRA', [hs], '2026-11-17T00:00:00Z');
  assert.equal(steps.length, 1, 'only tested horizons get a row');
  assert.deepEqual([steps[0].range!.lo70, steps[0].range!.hi70], [-0.5, 1.5]);
  assert.equal(appMissSteps(path, 'CHL', [hs])[0].why, 'few');
  assert.equal(appMissSteps(path, 'BRA', null)[0].why, 'not_run');
  const old = { h: 1, bySeries: [{ where: 'BRA', cases: 10 }] };
  assert.equal(appMissSteps(path, 'BRA', [old])[0].why, 'old');
  assert.ok(MIN_MISS_CASES === 8);
});

test('wiring: routes, panels and translations', () => {
  const routes = fs.readFileSync('src/server/routes/analysis.ts', 'utf8');
  assert.match(routes, /\/api\/weo-vintages\/:iso3\/bands/);
  assert.match(routes, /missRanges/);
  assert.match(fs.readFileSync('src/components/ForecastPanel.tsx', 'utf8'), /data-miss-ranges/);
  assert.match(fs.readFileSync('src/components/WeoVintagesPanel.tsx', 'utf8'), /data-weo-miss-bands/);
  for (const f of ['src/i18n/es/panels.ts', 'src/i18n/fr/panels.ts', 'src/i18n/pt/panels.ts']) assert.match(fs.readFileSync(f, 'utf8'), /weo_missIntro/);
});
