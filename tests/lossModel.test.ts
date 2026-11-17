import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lossModel, lossModels, normInv, ALL_TYPES, SIM_YEARS } from '../src/utils/lossModel';
import type { DisasterEvent } from '../src/utils/disasters';

const ev = (id: string, type: string, year: number, damageAdj?: number, extra: Partial<DisasterEvent> = {}): DisasterEvent => ({
  id,
  type,
  year,
  ...(damageAdj !== undefined ? { damageAdj, damage: damageAdj / 2 } : {}),
  ...extra,
});

// 2000-2019, one flood with damage every year (sizes 1..20), plus a storm without damage in 2005.
const steady = (): DisasterEvent[] => {
  const out: DisasterEvent[] = [];
  for (let y = 2000; y < 2020; y++) out.push(ev(`f${y}`, 'Flood', y, y - 1999, { deaths: 2, affected: 100 }));
  out.push(ev('s1', 'Storm', 2005, undefined, { deaths: 5 }));
  return out;
};

test('normInv matches known normal quantiles', () => {
  assert.ok(Math.abs(normInv(0.5)) < 1e-9);
  assert.ok(Math.abs(normInv(0.9) - 1.2815515655) < 1e-7);
  assert.ok(Math.abs(normInv(0.99) - 2.3263478740) < 1e-7);
  assert.ok(Math.abs(normInv(0.01) + 2.3263478740) < 1e-7);
});

test('yearly loss history, Poisson frequency and lognormal severity', () => {
  const gdp = new Map([[2005, 100], [2019, 400]]);
  const m = lossModel(ALL_TYPES, steady(), 2019, gdp)!;
  assert.equal(m.years.length, 20);
  const y05 = m.years.find((y) => y.year === 2005)!;
  assert.deepEqual([y05.events, y05.withDamage, y05.damageAdj, y05.deaths, y05.affected], [2, 1, 6, 7, 100]);
  assert.equal(y05.damagePctGdp, 3); // nominal 3 over GDP 100
  assert.equal(m.years.find((y) => y.year === 2006)!.damagePctGdp, undefined); // no GDP that year
  assert.equal(m.averageLoss, 10.5);
  assert.equal(m.frequency.model, 'poisson');
  assert.equal(m.frequency.mean, 1);
  assert.equal(m.frequency.variance, 0);
  assert.equal(m.frequency.atLeastOnePct, 63.21);
  // Lognormal by hand.
  const logs = Array.from({ length: 20 }, (_, i) => Math.log(i + 1));
  const mu = logs.reduce((a, b) => a + b, 0) / 20;
  const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mu) ** 2, 0) / 20);
  assert.equal(m.severity!.mu, Math.round(mu * 1000) / 1000);
  assert.equal(m.severity!.sigma, Math.round(sd * 1000) / 1000);
  assert.ok(Math.abs(m.severity!.median - Math.exp(mu)) < 1e-3);
  assert.ok(m.severity!.p99 > m.severity!.p90 && m.severity!.p90 > m.severity!.median);
  // Simulated mean near frequency x mean severity.
  const expected = 1 * Math.exp(mu + (sd * sd) / 2);
  assert.ok(Math.abs(m.annual!.mean - expected) / expected < 0.05, `${m.annual!.mean} vs ${expected}`);
  assert.ok(Math.abs(m.annual!.zeroPct - 36.79) < 1.5);
  assert.ok(m.annual!.p99 >= m.annual!.p98 && m.annual!.p98 >= m.annual!.p90);
  assert.equal(m.annual!.pctGdp!.gdpYear, 2019);
  assert.equal(m.annual!.pctGdp!.mean, Math.round((m.annual!.mean / 400) * 10000) / 100);
  // Same seed, same answer.
  assert.deepEqual(lossModel(ALL_TYPES, steady(), 2019, gdp)!.annual, m.annual);
  assert.equal(SIM_YEARS, 20000);
});

test('clustered years switch to negative binomial', () => {
  const evs: DisasterEvent[] = [];
  let k = 0;
  for (let y = 2000; y < 2020; y++) {
    const n = y % 5 === 0 ? 6 : 0; // 4 years with 6 events, the rest none
    for (let i = 0; i < n; i++) evs.push(ev(`e${k++}`, 'Flood', y, 1 + (k % 7)));
  }
  const m = lossModel('Flood', evs, 2019, new Map())!;
  assert.equal(m.frequency.model, 'negative_binomial');
  assert.equal(m.frequency.mean, 1.2);
  assert.ok(m.frequency.dispersion > 1.5);
  // r = mean^2 / (var - mean), p = r / (r + mean); P(N >= 1) = 1 - p^r, below the Poisson figure.
  const v = m.frequency.variance;
  const r = (1.2 * 1.2) / (v - 1.2);
  assert.ok(Math.abs(m.frequency.r! - r) < 0.02);
  assert.ok(m.frequency.atLeastOnePct < 69.88);
  assert.ok(m.annual!.zeroPct > 40, `${m.annual!.zeroPct}`);
  assert.equal(m.annual!.pctGdp, undefined);
});

test('too few damage figures or too short a record', () => {
  const few = [ev('a', 'Storm', 2001, 2), ev('b', 'Storm', 2003, 3), ev('c', 'Storm', 2010)];
  const m = lossModel('Storm', few, 2019, new Map())!;
  assert.match(m.noModel!, /Fewer than 5/);
  assert.equal(m.severity, undefined);
  assert.equal(m.annual, undefined);
  assert.equal(m.withDamage, 2);
  assert.equal(lossModel('Storm', few, 2005, new Map()), null);
  const all = lossModels([...steady(), ...few], 2019, new Map());
  assert.deepEqual(all.map((x) => x.type), [ALL_TYPES, 'Flood', 'Storm']);
  assert.equal(all[0].events, 24);
});
