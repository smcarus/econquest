import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRECEDENT_FEATURES, MAX_PRECEDENTS, PRECEDENT_HORIZON, findPrecedents, parseFeatures, type HistoryInput } from '../src/utils/precedentFinder';

/** A history from yearly values: { debt_gdp: { 2010: 50, ... } }. */
function hist(iso3: string, series: Record<string, Record<number, number>>): HistoryInput {
  return {
    iso3,
    name: `Country ${iso3}`,
    series: Object.fromEntries(Object.entries(series).map(([id, ys]) => [id, { points: Object.entries(ys).map(([y, v]) => ({ date: y, value: v })) }])),
  };
}
const span = (from: number, to: number, f: (y: number) => number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, f(from + i)]));

test('features: known ids in a fixed order, defaults when none is known', () => {
  assert.deepEqual(parseFeatures('cpi_imf,debt_gdp,nonsense'), ['debt_gdp', 'cpi_imf']);
  assert.deepEqual(parseFeatures(''), DEFAULT_PRECEDENT_FEATURES);
  assert.deepEqual(parseFeatures(undefined), DEFAULT_PRECEDENT_FEATURES);
});

test('the closest country comes first, each country once in its closest year, and what followed is read from its own history', () => {
  const target = hist('AAA', { debt_gdp: { 2024: 80, 2025: 82 }, cpi_imf: { 2024: 10, 2025: 9 } });
  const near = hist('BBB', {
    debt_gdp: span(2000, 2020, (y) => (y === 2010 ? 81 : 30)),
    cpi_imf: span(2000, 2020, (y) => (y === 2010 ? 9.5 : 2)),
    gdp_growth: { 2011: 1, 2012: 2, 2013: 3 },
    primary_balance: { 2010: -3, 2013: 1 },
    fx_lcu_usd: { 2010: 2, 2013: 3 },
  });
  const far = hist('CCC', { debt_gdp: span(2000, 2020, () => 20), cpi_imf: span(2000, 2020, () => 1) });
  const r = findPrecedents('AAA', '2026-11-12', ['debt_gdp', 'cpi_imf'], [target, near, far]);
  assert.equal(r.missing, undefined);
  // 2026 and later are never read: the newest year before the As of year with both figures.
  assert.deepEqual(r.target, { year: 2025, values: { debt_gdp: 82, cpi_imf: 9 } });
  assert.deepEqual(r.matches.map((m) => [m.iso3, m.year]), [['BBB', 2010], ['CCC', 2000]]);
  const m = r.matches[0];
  assert.equal(m.outcomes.growth_avg, 2);
  assert.equal(m.outcomes.debt_change, 30 - 81);
  assert.equal(m.outcomes.primary_change, 4);
  assert.equal(m.outcomes.currency_change, 50);
  assert.equal(m.outcomes.reserves_after, null, 'a figure not in the history stays null, never filled in');
  assert.equal(r.summary.growth_avg.n, 1);
  assert.equal(r.summary.debt_change.n, 2);
});

test('a precedent needs three later years before the As of year, and years before 1980 are left out', () => {
  const target = hist('AAA', { debt_gdp: { 2020: 50 }, cpi_imf: { 2020: 5 } });
  const late = hist('BBB', { debt_gdp: { 1975: 50, 2018: 50, 2019: 50 }, cpi_imf: { 1975: 5, 2018: 5, 2019: 5 } });
  const r = findPrecedents('AAA', '2022-06-30', ['debt_gdp', 'cpi_imf'], [target, late]);
  // 2018 + 3 = 2021, which is before 2022, so it counts; 2019 + 3 = 2022 does not; 1975 is too early.
  assert.deepEqual(r.matches.map((m) => m.year), [2018]);
  assert.equal(PRECEDENT_HORIZON, 3);
});

test('a hyperinflation is clipped so it does not swamp the scale', () => {
  const others = Array.from({ length: 120 }, (_, i) => hist(`X${String(i).padStart(2, '0')}`, { debt_gdp: { 2000: 40 + (i % 40) }, cpi_imf: { 2000: 2 + (i % 10) } }));
  const hyper = hist('HYP', { debt_gdp: { 2000: 60 }, cpi_imf: { 2000: 50000 } });
  const target = hist('AAA', { debt_gdp: { 2020: 60 }, cpi_imf: { 2020: 6 } });
  const r = findPrecedents('AAA', '2024-01-01', ['debt_gdp', 'cpi_imf'], [target, hyper, ...others]);
  const s = r.scale.cpi_imf!;
  assert.ok(s.hi < 50000, 'the top percentile is clipped');
  assert.ok(s.sd < 10, `the scale stays readable (sd ${s.sd})`);
  assert.ok(!r.matches.some((m) => m.iso3 === 'HYP'), 'the hyperinflation is not a close match for 6%');
  assert.equal(r.matches.length, MAX_PRECEDENTS);
  assert.equal(r.pool.countries, 121);
});

test('ties are broken by country code, then year, so the same inputs give the same list', () => {
  const target = hist('AAA', { debt_gdp: { 2020: 50 }, cpi_imf: { 2020: 5 } });
  const a = hist('ZZZ', { debt_gdp: { 2001: 50, 2000: 50 }, cpi_imf: { 2001: 5, 2000: 5 } });
  const b = hist('MMM', { debt_gdp: { 2005: 50 }, cpi_imf: { 2005: 5 } });
  const r1 = findPrecedents('AAA', '2024-01-01', ['debt_gdp', 'cpi_imf'], [target, a, b]);
  const r2 = findPrecedents('AAA', '2024-01-01', ['debt_gdp', 'cpi_imf'], [b, a, target]);
  assert.deepEqual(r1.matches.map((m) => [m.iso3, m.year]), [['MMM', 2005], ['ZZZ', 2000]]);
  assert.deepEqual(r1, r2);
});

test('Missing says why: too few figures, no saved history, no year with every figure, no precedent', () => {
  const target = hist('AAA', { debt_gdp: { 2020: 50 } });
  assert.equal(findPrecedents('AAA', '2024-01-01', ['debt_gdp'], [target]).missing?.reason, 'too_few_features');
  assert.equal(findPrecedents('QQQ', '2024-01-01', ['debt_gdp', 'cpi_imf'], [target]).missing?.reason, 'no_history');
  const noYear = findPrecedents('AAA', '2024-01-01', ['debt_gdp', 'cpi_imf'], [target]);
  assert.deepEqual(noYear.missing, { reason: 'no_target_year', features: ['cpi_imf'] });
  assert.equal(noYear.matches.length, 0);
  const full = hist('AAA', { debt_gdp: { 2020: 50 }, cpi_imf: { 2020: 5 } });
  assert.equal(findPrecedents('AAA', '2024-01-01', ['debt_gdp', 'cpi_imf'], [full]).missing?.reason, 'no_pool');
});

test('Policy review shows the precedents after Diagnose, from a read-only route, with the unconfirmed sources Missing', async () => {
  const { readFileSync } = await import('node:fs');
  const ui = readFileSync('src/components/PolicyReviews.tsx', 'utf8');
  assert.match(ui, /data-review-step="precedents"/);
  assert.ok(ui.indexOf('data-review-step="precedents"') < ui.indexOf('data-review-step="options"'), 'after Diagnose, before Options');
  const routes = readFileSync('src/server/routes/reviews.ts', 'utf8');
  assert.match(routes, /app\.get\('\/api\/reviews\/:id\/precedents'/);
  const { REPORTS } = await import('../src/i18n/messages/reports');
  assert.match(REPORTS.en.pc_programmeMissing, /^Missing: .*MONA/);
  assert.match(REPORTS.en.pc_crisisMissing, /^Missing: .*Laeven-Valencia/);
  assert.match(REPORTS.en.pc_hint, /not a tested signal/);
});
