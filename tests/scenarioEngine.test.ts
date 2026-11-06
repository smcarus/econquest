import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScenario, fitScenarioModel, monthEnd, monthlyChanges, scenarioSentence } from '../src/utils/scenarioEngine.ts';

const ym = (k: number) => `${2010 + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;

function data(n = 200) {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const us = new Map<string, number>();
  const usd = new Map<string, number>();
  const fx = new Map<string, number>();
  for (let k = 0; k < n; k++) {
    const dUs = rand() * 0.5;
    const dUsd = rand() * 4;
    us.set(ym(k), dUs);
    usd.set(ym(k), dUsd);
    // currency: 2% weaker per Fed point, 0.8 per 1% dollar, plus noise
    fx.set(ym(k), 2 * dUs + 0.8 * dUsd + rand() * 0.5);
  }
  return { us, usd, fx };
}

test('scenario engine: recovers the betas and applies a stated shock with a band', () => {
  const { us, usd, fx } = data();
  const m = fitScenarioModel('fx', fx, { us_rate: us, dollar: usd });
  assert.ok(m.ok);
  if (!m.ok) return;
  assert.equal(m.n, 180);
  assert.ok(Math.abs(m.beta[0] - 2) < 0.2, `us beta ${m.beta[0]}`);
  assert.ok(Math.abs(m.beta[1] - 0.8) < 0.05, `usd beta ${m.beta[1]}`);
  const r = applyScenario(m, { us_rate: 1, dollar: 5 });
  assert.ok(Math.abs(r.value - 6) < 0.4);
  assert.ok(r.lo < r.value && r.value < r.hi);
  assert.deepEqual(r.beyondSample, ['us_rate', 'dollar']);
  assert.deepEqual(applyScenario(m, { us_rate: 0.1 }).beyondSample, []);
  assert.match(scenarioSentence('Testland', 'Fed +1', [r]), /currency weaker by/);
});

test('scenario engine: Missing on short samples and on a pegged currency; month-end changes', () => {
  const { us, usd, fx } = data(40);
  const short = fitScenarioModel('fx', fx, { us_rate: us, dollar: usd });
  assert.equal(short.ok, false);
  const long = data();
  const peg = fitScenarioModel('fx', long.usd, { dollar: long.usd });
  assert.equal(peg.ok, false);
  if (!peg.ok) assert.match(peg.reason, /exactly/);
  const m = monthEnd([{ date: '2026-01-02', value: 10 }, { date: '2026-01-30', value: 11 }, { date: '2026-02-27', value: 11 * Math.E ** 0.01 }]);
  const c = monthlyChanges(m, 'log');
  assert.ok(Math.abs(c.get('2026-02')! - 1) < 1e-9);
  assert.equal(monthlyChanges(new Map([['2026-01', 5], ['2026-02', 5.25]]), 'diff').get('2026-02'), 0.25);
});
