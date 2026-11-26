import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { checkMfmodShock, mfmodFigures, mfmodPlan, shockDiff, type MfmodShockReply } from '../src/utils/mfmodShock';
import { measures, toAnnual } from '../src/utils/mfmodBaseline';
import { mfmodAsk, mfmodScenario, type ServiceGet } from '../src/server/mfmod';
import { registerMfmodRoutes } from '../src/server/routes/mfmod';
import type { Shock } from '../src/utils/scenarioQuestion';

const ON = { MFMOD_URL: 'http://mfmod:8765' };
const s = (code: string, values: Array<number | null>) => ({ code, values });

/** Two runs of a made-up annual model: the shock lowers real GDP 1% and 2%, adds to prices, worsens the balance. */
const annual: MfmodShockReply = {
  ready: true,
  iso3: 'PAK',
  kind: 'oil',
  size: 50,
  hold: 5,
  periods: ['2015', '2016', '2017', '2018'],
  shockFrom: '2016',
  shockTo: '2020',
  base: {
    real_gdp: s('PAKNYGDPMKTPKN', [100, 104, 108, 112]),
    nominal_gdp: s('PAKNYGDPMKTPCN', [1000, 1100, 1200, 1300]),
    cpi: s('PAKFPCPITOTLXN', [100, null, null, null]),
    consumer_deflator: s('PAKNECONPRVTXN', [100, 105, 110, 115]),
    gov_balance: s('PAKGGBALOVRLCN', [-50, -55, -60, -65]),
    usd_rate: s('PAKPANUSATLS', [100, 100, 100, 100]),
  },
  shocked: {
    real_gdp: s('PAKNYGDPMKTPKN', [100, 102.96, 105.84, 110.88]),
    nominal_gdp: s('PAKNYGDPMKTPCN', [1000, 1100, 1200, 1300]),
    cpi: s('PAKFPCPITOTLXN', [100, null, null, null]),
    consumer_deflator: s('PAKNECONPRVTXN', [100, 107.1, 112.2, 117.3]),
    gov_balance: s('PAKGGBALOVRLCN', [-50, -66, -72, -65]),
    usd_rate: s('PAKPANUSATLS', [100, 101, 102, 100]),
  },
  missing: [],
};

test('checks: kinds, sizes and the countries with a policy rate rule', () => {
  assert.deepEqual(checkMfmodShock('PAK', 'oil', '20'), { ok: true, kind: 'oil', size: 20, hold: 6 });
  assert.deepEqual(checkMfmodShock('TUR', 'policy_rate', 1), { ok: true, kind: 'policy_rate', size: 1, hold: 2 });
  assert.deepEqual(checkMfmodShock('NPL', 'spending', -1.5, '3'), { ok: true, kind: 'spending', size: -1.5, hold: 3 });
  for (const bad of [0, '', 'x', 301, -400]) assert.equal(checkMfmodShock('PAK', 'oil', bad).ok, false, String(bad));
  assert.equal(checkMfmodShock('PAK', 'spending', 11).ok, false);
  assert.equal(checkMfmodShock('PAK', 'oil', 10, 7).ok, false);
  assert.equal(checkMfmodShock('PAK', 'oil', 10, 1.5).ok, false);
  assert.equal(checkMfmodShock('PAK', 'dollar', 10).ok, false);
  for (const c of ['BOL', 'NPL', 'HRV']) {
    const r = checkMfmodShock(c, 'policy_rate', 1);
    assert.ok(!r.ok && /no policy rate rule/.test(r.reason), c);
  }
});

test('difference: shocked run minus baseline from the shock year, inflation from the deflator in both runs', () => {
  const d = shockDiff(annual)!;
  assert.deepEqual(d.years, [1, 2, 3]);
  assert.equal(d.inflationFrom, 'consumer_deflator');
  const row = (m: string) => d.rows.find((r) => r.measure === m)?.values;
  assert.deepEqual(row('gdp_level'), [-1, -2, -1]);
  // Growth 2016: 2.96% against 4% → -1.04 pts.
  assert.deepEqual(row('growth'), [-1.04, -1.05, 1.06]);
  // Inflation 2016: 7.1% against 5% → +2.1 pts.
  assert.equal(row('inflation')![0], 2.1);
  assert.deepEqual(row('balance'), [-1, -1, 0]);
  assert.deepEqual(row('currency'), [1, 2, 0]);
  assert.ok(d.missing.includes('debt') && d.missing.includes('current_account') && d.missing.includes('policy_rate'));
});

test('difference: quarterly model turned into years before comparing', () => {
  const q = (base: number, step: number) => Array.from({ length: 12 }, (_, i) => base + step * i);
  const periods = ['2021Q1', '2021Q2', '2021Q3', '2021Q4', '2022Q1', '2022Q2', '2022Q3', '2022Q4', '2023Q1', '2023Q2', '2023Q3', '2023Q4'];
  const reply: MfmodShockReply = {
    ready: true,
    periods,
    shockFrom: '2022Q1',
    hold: 5,
    base: { real_gdp: s('HRVNYGDPMKTPKN', q(100, 1)) },
    shocked: { real_gdp: s('HRVNYGDPMKTPKN', q(100, 1).map((v, i) => (i >= 4 ? v * 1.01 : v))) },
  };
  const d = shockDiff(reply)!;
  assert.equal(d.quarterly, true);
  assert.deepEqual(d.years, [1, 2]);
  assert.deepEqual(d.rows.find((r) => r.measure === 'gdp_level')!.values, [1, 1]);
});

test('baseline table: inflation from the deflator only when the price index is not filled in every model year', () => {
  const t = measures(toAnnual({ periods: annual.periods, projectedFrom: '2016', series: annual.base }));
  assert.equal(t.inflationFrom, 'consumer_deflator');
  assert.deepEqual(t.rows.find((r) => r.measure === 'inflation')!.values, [null, 5, 4.8, 4.5]);
  const full = measures(toAnnual({ periods: ['2015', '2016'], projectedFrom: '2016', series: { cpi: s('X', [100, 103]), consumer_deflator: s('Y', [100, 110]) } }));
  assert.equal(full.inflationFrom, 'cpi');
  assert.deepEqual(full.rows.find((r) => r.measure === 'inflation')!.values, [null, 3]);
});

const shock = (kind: Shock['kind'], change: number | null, target: Shock['target'] = null): Shock => ({ kind, direction: change === null ? null : change > 0 ? 1 : -1, change, target, said: '' });

test('Scenario Agent shocks the model takes: oil, food, policy rate; others left to the other channels', () => {
  assert.deepEqual(mfmodPlan({ shocks: [shock('oil', 30), shock('us_rate', 1), shock('food', -10)] }, 'PAK'), [
    { kind: 'oil', size: 30, hold: 6 },
    { kind: 'food', size: -10, hold: 6 },
  ]);
  assert.deepEqual(mfmodPlan({ shocks: [shock('policy_rate', 2)] }, 'IRQ'), [{ kind: 'policy_rate', size: 2, hold: 2 }]);
  const peg = mfmodPlan({ shocks: [shock('policy_rate', 2)] }, 'BOL');
  assert.ok('reason' in peg[0] && /no policy rate rule/.test(peg[0].reason));
  const level = mfmodPlan({ shocks: [shock('oil', null, { value: 150, unit: 'usd' })] }, 'NPL');
  assert.ok('reason' in level[0] && /change in %/.test(level[0].reason));
  assert.deepEqual(mfmodPlan({ shocks: [shock('oil', null)] }, 'NPL'), []);
});

function fakeService(reply: { status: number; body: unknown }): { get: ServiceGet; asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    get: async (url) => {
      asked.push(url);
      return { status: reply.status, text: JSON.stringify(reply.body) };
    },
  };
}

test('service call: checked before asking, passed on with the source', async () => {
  const f = fakeService({ status: 200, body: annual });
  const r = await mfmodAsk(ON, 'shock', 'pak', f.get, { kind: 'oil', size: '50' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
  assert.match(String(r.body.source), /World Bank MFMod/);
  assert.deepEqual(f.asked, ['http://mfmod:8765/shock?iso3=PAK&kind=oil&size=50&hold=6']);
  const bad = await mfmodAsk(ON, 'shock', 'PAK', f.get, { kind: 'oil', size: '0' });
  assert.equal(bad.status, 400);
  const none = await mfmodAsk(ON, 'shock', 'GHA', f.get, { kind: 'oil', size: '10' });
  assert.equal(none.status, 404);
  assert.equal(f.asked.length, 1);
  const off = await mfmodAsk({}, 'shock', 'PAK', f.get, { kind: 'oil', size: '10' });
  assert.equal(off.body.on, false);
  const refused = await mfmodAsk(ON, 'shock', 'PAK', fakeService({ status: 400, body: { error: 'The model has none.' } }).get, { kind: 'food', size: '10' });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.note, 'The model has none.');
});

test('route: GET /api/mfmod/shock', async () => {
  const f = fakeService({ status: 200, body: annual });
  const app = express();
  registerMfmodRoutes(app, { env: ON, get: f.get });
  const server = app.listen(0);
  try {
    const port = (server.address() as AddressInfo).port;
    const r = await fetch(`http://127.0.0.1:${port}/api/mfmod/shock?iso3=PAK&kind=spending&size=1&hold=3`);
    assert.equal(r.status, 200);
    assert.deepEqual(f.asked, ['http://mfmod:8765/shock?iso3=PAK&kind=spending&size=1&hold=3']);
    const bad = await fetch(`http://127.0.0.1:${port}/api/mfmod/shock?iso3=PAK&kind=oil`);
    assert.equal(bad.status, 400);
  } finally {
    server.close();
  }
});

test('Scenario Agent: model runs become figures, sentences and Missing lines', async () => {
  const f = fakeService({ status: 200, body: annual });
  const data = await mfmodScenario(ON, 'PAK', mfmodPlan({ shocks: [shock('oil', 50), shock('policy_rate', null, { value: 20, unit: 'pts' })] }, 'PAK'), f.get);
  assert.equal(data.on, true);
  assert.equal(data.runs.length, 1);
  assert.equal(data.notRun.length, 1);
  const figures: Parameters<typeof mfmodFigures>[2] = [];
  const parts: string[] = [];
  const missing: string[] = [];
  const w = mfmodFigures(data, 'Pakistan', figures, parts, missing);
  assert.ok(w > 0);
  const gdp = figures.find((x) => x.label === 'World Bank model: real GDP')!;
  assert.equal(gdp.value, 'year 1 -1.00%, year 3 -1.00%');
  assert.match(gdp.source, /world oil price \+50%, held 6 years/);
  assert.match(gdp.source, /not a World Bank forecast/);
  assert.ok(figures.every((x) => x.tag === 'model'));
  assert.match(parts[0], /^In Pakistan's World Bank country model, world oil price \+50%, held 6 years leaves real GDP 1\.00% below its own baseline/);
  assert.match(missing[0], /Pakistan: World Bank country model, policy rate \(the model needs the change in points/);

  const off = await mfmodScenario({}, 'PAK', mfmodPlan({ shocks: [shock('oil', 50)] }, 'PAK'), f.get);
  assert.equal(off.on, false);
  const m2: string[] = [];
  assert.equal(mfmodFigures(off, 'Pakistan', [], [], m2), 0);
  assert.match(m2[0], /turned off/);
  assert.equal(f.asked.length, 1);
});

test('Scenario Agent finding: the World Bank model section counts as a result on its own', async () => {
  const { scenarioFinding } = await import('../src/utils/scenarioAgent');
  const { parseScenario } = await import('../src/utils/scenarioQuestion');
  const sq = parseScenario('What would happen to Pakistan if oil prices rose by 50%?')!;
  const it = { iso3: 'PAK', countryName: 'Pakistan' } as Parameters<typeof scenarioFinding>[1];
  const without = scenarioFinding(sq, it, { iso3: 'PAK', countryName: 'Pakistan' });
  assert.ok(!without.finding?.figures.some((f) => f.label.startsWith('World Bank model')));
  const data = await mfmodScenario(ON, 'PAK', mfmodPlan(sq, 'PAK'), fakeService({ status: 200, body: annual }).get);
  const r = scenarioFinding(sq, it, { iso3: 'PAK', countryName: 'Pakistan', worldBankModel: data });
  assert.ok(r.finding);
  assert.ok(r.finding!.figures.some((f) => f.label === 'World Bank model: real GDP'));
  assert.match(r.finding!.reading, /Pakistan's World Bank country model/);
});
