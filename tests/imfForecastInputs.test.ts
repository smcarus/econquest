/**
 * Nowcasts and forecasts for countries outside the OECD, national and BIS series (lower-income
 * watchlist): IMF monthly consumer prices and policy rates as the last choice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflationRunOrImf } from '../src/utils/modelHistory.ts';
import { imfPolicyForecastInput } from '../src/utils/imfPolicyRate.ts';
import type { ImfMonthlyPull } from '../src/utils/imfMonthly.ts';

const imfCpi = { points: [{ period: '2026-08', value: 20.1 }, { period: '2026-09', value: 18.4 }, { period: '2026', value: 19 }], short: 'IMF CPI', long: 'IMF CPI, Kenya, y/y (series KEN.CPI)' };

test('inflation: the OECD or national run wins; the IMF monthly series fills only a country with neither', () => {
  const own = { points: [{ date: '2026-09', value: 3 }], source: 'OECD CPI via DBnomics' };
  assert.equal(inflationRunOrImf(own, imfCpi), own);
  assert.deepEqual(inflationRunOrImf(null, imfCpi), { points: [{ date: '2026-08', value: 20.1 }, { date: '2026-09', value: 18.4 }], source: imfCpi.long });
  assert.equal(inflationRunOrImf(null, undefined), null);
  assert.equal(inflationRunOrImf(null, { points: [{ period: '2025', value: 4 }] }), null, 'years only: no monthly run');
});

const pull: ImfMonthlyPull = {
  pulledAt: '2026-11-18T00:00:00Z',
  series: {
    KEN: { key: 'KEN.MFS166_RT_PT_A_PT.M', short: 'IMF MFS', long: 'IMF MFS (series KEN.MFS166_RT_PT_A_PT.M)', points: [{ period: '2026-08', value: 9.5 }, { period: '2026-09', value: 9.25 }] },
    EGY: { key: 'EGY.MFS166_RT_PT_A_PT.M', short: 'IMF MFS', long: 'IMF MFS (series EGY.MFS166_RT_PT_A_PT.M)', points: [{ period: '2025-08', value: 22.5 }] },
  },
};
const now = new Date('2026-11-18T00:00:00Z');

test('policy rate: a recent IMF monthly rate is forecast input, with its source', () => {
  const r = imfPolicyForecastInput(pull, 'KEN', now);
  assert.ok(!('reason' in r));
  assert.deepEqual(r.points.map((p) => p.date), ['2026-08', '2026-09']);
  assert.match(r.source, /KEN\.MFS166_RT_PT_A_PT\.M/);
});

test('policy rate: an out-of-date IMF rate or none gives the reason, never a path', () => {
  const old = imfPolicyForecastInput(pull, 'EGY', now);
  assert.ok('reason' in old);
  assert.match(old.reason, /latest monthly figure is from 2025-08, more than 4 months ago/);
  const none = imfPolicyForecastInput(pull, 'UGA', now);
  assert.ok('reason' in none);
  assert.match(none.reason, /no IMF monthly policy rate is saved/);
});
