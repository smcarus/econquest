import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasMfmodModel, measures, shownYears, toAnnual, type MfmodBaselineReply } from '../src/utils/mfmodBaseline';

const annual: MfmodBaselineReply = {
  on: true,
  ready: true,
  periods: ['2019', '2020', '2021', '2022'],
  projectedFrom: '2021',
  series: {
    real_gdp: { code: 'XNYGDPMKTPKN', values: [100, 95, 100, 103] },
    nominal_gdp: { code: 'XNYGDPMKTPCN', values: [1000, 1000, 1100, null] },
    cpi: { code: 'XFPCPITOTLXN', values: [100, 102, null, 110] },
    gov_debt: { code: 'XGGDBTTOTLCN', values: [500, 600, 660, 700] },
    gov_balance: { code: 'XGGBALOVRLCN', values: [-30, -80, -55, -40] },
    current_account_usd: { code: 'XBNCABFUNDCD', values: [-2, -1, 1, 2] },
    usd_rate: { code: 'XPANUSATLS', values: [10, 10, 11, 11] },
  },
  missing: ['policy_rate'],
};

test('annual: each measure from its stated formula; a missing input leaves that year Missing', () => {
  const t = measures(toAnnual(annual));
  assert.deepEqual(t.years, [2019, 2020, 2021, 2022]);
  assert.equal(t.projectedFrom, 2021);
  const row = (m: string) => t.rows.find((r) => r.measure === m)!.values;
  assert.deepEqual(row('growth'), [null, -5, 5.3, 3]);
  assert.deepEqual(row('inflation'), [null, 2, null, null]);
  assert.deepEqual(row('debt'), [50, 60, 60, null]);
  assert.deepEqual(row('balance'), [-3, -8, -5, null]);
  assert.deepEqual(row('current_account'), [-2, -1, 1, null]);
  assert.deepEqual(t.missing, [{ measure: 'policy_rate', lacks: ['policy_rate'] }]);
});

test('quarterly: flows summed, prices averaged, debt at the fourth quarter, part years left out', () => {
  const q: MfmodBaselineReply = {
    ready: true,
    periods: ['2020Q1', '2020Q2', '2020Q3', '2020Q4', '2021Q1', '2021Q2', '2021Q3', '2021Q4', '2022Q1'],
    projectedFrom: '2021Q1',
    series: {
      nominal_gdp: { code: 'HRVNYGDPMKTPCN', values: [25, 25, 25, 25, 30, 30, 30, 30, 31] },
      real_gdp: { code: 'HRVNYGDPMKTPKN', values: [25, 25, 25, 25, 26, 26, 26, 26, 27] },
      gov_debt: { code: 'HRVGGDBTTOTLCN', values: [40, 45, 48, 50, 52, 54, 58, 60, 61] },
      cpi: { code: 'HRVFPCPITOTLXN', values: [99, 100, 100, 101, 102, 103, 104, 103, 105] },
    },
  };
  const a = toAnnual(q);
  assert.equal(a.quarterly, true);
  assert.deepEqual(a.years, [2020, 2021]);
  assert.deepEqual(a.values.nominal_gdp, [100, 120]);
  assert.deepEqual(a.values.gov_debt, [50, 60]);
  assert.deepEqual(a.values.cpi, [100, 103]);
  const t = measures(a);
  assert.deepEqual(t.rows.find((r) => r.measure === 'debt')!.values, [50, 50]);
  assert.deepEqual(t.rows.find((r) => r.measure === 'growth')!.values, [null, 4]);
  assert.equal(t.projectedFrom, 2021);
  assert.ok(t.missing.some((m) => m.measure === 'balance' && m.lacks.includes('gov_balance')));
});

test('years shown: three before the model years, ten model years, then every fifth', () => {
  const years = Array.from({ length: 41 }, (_, i) => 2010 + i);
  const shown = shownYears({ years, projectedFrom: 2016 }).map((i) => years[i]);
  assert.deepEqual(shown, [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2031, 2036, 2041, 2046, 2050]);
});

test('only the six published countries', () => {
  assert.ok(hasMfmodModel('pak'));
  assert.equal(hasMfmodModel('KEN'), false);
});
