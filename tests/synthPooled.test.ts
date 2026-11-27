import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pooledGaps, quantile } from '../src/utils/synthPooled';
import type { SynthHistory } from '../src/utils/syntheticControl';
import type { PolicyEvent } from '../src/utils/policyEvents';

function hist(iso3: string, ys: Record<number, number>): SynthHistory {
  return { iso3, name: `Country ${iso3}`, series: { cpi_imf: { points: Object.entries(ys).map(([y, v]) => ({ date: y, value: v })) } } };
}
const span = (from: number, to: number, f: (y: number) => number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, f(from + i)]));
const donors = Array.from({ length: 20 }, (_, i) => hist(`D${String(i).padStart(2, '0')}`, span(1990, 2020, (y) => 2 + i * 0.5 + Math.sin((y + i * 1.7) / 2) * (1 + (i % 3)))));
const val = (h: SynthHistory, y: number) => h.series.cpi_imf!.points.find((p) => Number(p.date) === y)!.value;
/** Six countries, each half of two donors, with inflation 2 points higher from 2010 on. */
const treated = Array.from({ length: 6 }, (_, i) => hist(`T0${i}`, span(1990, 2020, (y) => 0.5 * val(donors[i + 2], y) + 0.5 * val(donors[i + 9], y) + (y >= 2010 ? 2 : 0))));
const ev = (iso3: string, kind: PolicyEvent['kind'] = 'devaluation'): PolicyEvent => ({ id: `${iso3}-${kind}-2010`, iso3, year: 2010, kind, origin: kind === 'own' ? 'own' : 'rule', label: 'x' });

test('quantile interpolates between neighbours', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.ok(Math.abs(quantile([0, 10], 0.1) - 1) < 1e-12);
});

test('six made-up countries with a 2-point jump: the middle gap is near 2 after and near 0 before; Missing ones are counted, own events ignored', () => {
  const events = [...treated.map((h) => ev(h.iso3)), ev('NOHIST'), ev('T00', 'own')];
  const r = pooledGaps({ kind: 'devaluation', outcome: 'cpi_imf', asOf: '2021-06-01', events, histories: [...donors, ...treated] });
  assert.equal(r.events, 7);
  assert.equal(r.used, 6);
  assert.equal(r.countries, 6);
  assert.equal(r.missing.no_history, 1);
  const at = (k: number) => r.years.find((y) => y.k === k)!;
  assert.ok(Math.abs(at(2).median - 2) < 0.5, JSON.stringify(at(2)));
  assert.ok(Math.abs(at(-3).median) < 0.5, JSON.stringify(at(-3)));
  assert.ok(at(2).p10 <= at(2).median && at(2).median <= at(2).p90);
  assert.equal(at(0).n, 6);
});

test('fewer than five usable changes in a year leaves that year out', () => {
  const r = pooledGaps({ kind: 'devaluation', outcome: 'cpi_imf', asOf: '2021-06-01', events: treated.slice(0, 3).map((h) => ev(h.iso3)), histories: [...donors, ...treated] });
  assert.equal(r.used, 3);
  assert.deepEqual(r.years, []);
});
