import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/utils/backtest';
import { dfmNowcastCases, factorInputs, fitFactorModel, quarterFactor } from '../src/utils/dynamicFactor';
import { kalmanFilter, kalmanSmoother } from '../src/utils/kalman';
import { judgeForecast, type ForecastSpec } from '../src/utils/forecastEval';
import type { CountryData } from '../src/utils/forecastCases';

/** A common monthly factor drives activity, the leading indicator and GDP. */
function country(seed: number, iso3: string): { c: CountryData; f: Map<string, number> } {
  const rand = seededRandom(seed);
  const nrm = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, rand()))) * Math.cos(2 * Math.PI * rand());
  const activity: CountryData['activity'] = [];
  const cli: CountryData['cli'] = [];
  const gdpQoq: CountryData['gdpQoq'] = [];
  const f = new Map<string, number>();
  let level = 100;
  let cl = 100;
  let ft = 0;
  for (let y = 1995; y <= 2020; y++)
    for (let q = 1; q <= 4; q++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        ft = 0.7 * ft + nrm();
        sum += ft;
        const m = `${y}-${String((q - 1) * 3 + k + 1).padStart(2, '0')}`;
        f.set(m, ft);
        level *= 1 + (0.3 * ft + 0.3 * nrm()) / 100;
        cl += 0.5 * ft + 0.5 * nrm();
        activity.push({ date: m, value: level });
        cli.push({ date: m, value: cl });
      }
      gdpQoq.push({ date: `${y}-Q${q}`, value: 0.5 + 0.3 * (sum / 3) + 0.1 * nrm() });
    }
  return { c: { iso3, gdpQoq, activity, cli }, f };
}

const corr = (a: number[], b: number[]) => {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  a.forEach((x, i) => {
    sab += (x - ma) * (b[i] - mb);
    saa += (x - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  });
  return sab / Math.sqrt(saa * sbb);
};

test('the smoothed factor tracks the true common factor, with gaps at the end filled by the filter', () => {
  const { c, f } = country(3, 'AAA');
  const inputs = factorInputs(c, '2020-05-30', { activity: 45, cli: 45, cpi: 30, policy: 1 })!;
  assert.deepEqual(inputs.map((s) => s.name), ['Activity index growth', 'Leading indicator change']);
  const fm = fitFactorModel(inputs, '2020-06');
  assert.ok(!('error' in fm));
  if ('error' in fm) return;
  assert.equal(fm.months[fm.months.length - 1], '2020-06');
  const months = fm.months.filter((m) => f.has(m) && m <= '2020-03');
  const r = corr(months.map((m) => fm.factor[fm.months.indexOf(m)]), months.map((m) => f.get(m)!));
  assert.ok(r > 0.8, `correlation ${r}`);
  assert.ok(fm.phi > 0.4 && fm.phi < 0.95);
  assert.ok(Number.isFinite(quarterFactor(fm, '2020-Q2')!));
  assert.equal(fitFactorModel([], '2020-01').hasOwnProperty('error'), true);
});

test('with one series, the scalar filter agrees with the general Kalman smoother', () => {
  const rand = seededRandom(8);
  const vals = new Map<string, number>();
  let x = 0;
  for (let i = 0; i < 120; i++) {
    x = 0.6 * x + (rand() - 0.5);
    vals.set(`${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, x + 0.3 * (rand() - 0.5));
  }
  const fm = fitFactorModel([{ name: 's', values: vals }], '2009-12');
  assert.ok(!('error' in fm));
  if ('error' in fm) return;
  // Same model in the general filter: observation on the standardised series.
  const v = [...vals.values()];
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  const y = v.map((z) => (z - m) / sd);
  const ss = { Z: [fm.loadings[0]], T: [[fm.phi]], R: [[1]], Q: [[fm.q]], H: fm.psi[0], a0: [0], P0: [[fm.q / (1 - fm.phi * fm.phi)]] };
  const sm = kalmanSmoother(y, ss, kalmanFilter(y, ss));
  sm.forEach((s, t) => assert.ok(Math.abs(s[0] - fm.factor[t]) < 1e-9, `month ${t}`));
});

const spec: ForecastSpec = {
  id: 'gdp_nowcast_dfm', version: 1, registeredOn: '2026-11-22', registeredBy: 't', hypothesis: '', target: 'gdp_dfm_nowcast_q',
  params: { asOfDaysAfterQuarter: 30, gdpLagDays: 60, activityLagDays: 45, cliLagDays: 45, cpiLagDays: 30, policyLagDays: 1, minQuarters: 24, minBalancedMonths: 36 },
  benchmark: 'mean', horizons: [1], sample: { from: '2008-Q1' },
  passMark: { maxRelRmse: 0.9, maxPValue: 0.1, minSeriesShare: 0.5, minCasesPerHorizon: 40, minYears: 5 }, knownLimits: [],
};

test('dynamic factor nowcast cases beat the historical mean when a common factor drives GDP', () => {
  const { cases, series } = dfmNowcastCases(spec, [country(3, 'AAA').c, country(4, 'BBB').c, { iso3: 'CCC', gdpQoq: country(5, 'CCC').c.gdpQoq }]);
  assert.deepEqual(series, ['AAA', 'BBB']);
  assert.ok(cases.length >= 80, `${cases.length}`);
  const r = judgeForecast(spec, 'h', cases, 'sim');
  assert.ok(r.horizons[0].relRmse < 0.9, `${r.horizons[0].relRmse}`);
});
