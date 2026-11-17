import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CostedOptions } from '../src/utils/costedOptions.ts';
import type { WhatIfRun } from '../src/utils/fiscalWhatIf.ts';
import { itemsFromCosted, itemFromWhatIf, tradeOffChart, ticks } from '../src/utils/tradeOff.ts';
import { keepWhatIf, keptWhatIfs, removeWhatIf, onKeptChange, MAX_KEPT } from '../src/utils/tradeOffStore.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const costed = {
  ok: true,
  baselineEnd: 80,
  horizonYear: '2031',
  multiplier: { low: 0.5, high: 1.5, source: 'test' },
  method: 'm',
  options: [
    {
      option: { id: 'c1', label: 'Tighten 1 point', sizePts: 1, years: 1 },
      endLow: 75.4,
      endHigh: 77.1,
      vsBaselineLow: -4.6,
      vsBaselineHigh: -2.9,
      outputCostLow: 0.5,
      outputCostHigh: 1.5,
      denominatorEffect: false,
      pathHigh: [],
    },
  ],
} as unknown as CostedOptions;

const run: WhatIfRun = {
  use: 'deficit',
  pbChangePp: 0.4,
  growth: { low: -0.2, high: -0.3 },
  level: { year: '2030', low: -0.2, high: -0.3 },
  debtEnd: { year: '2030', baseline: 80, low: 78.5, high: 79 },
  years: [],
};

test('itemsFromCosted: baseline as a point, options with low and high ends, no first-year growth', () => {
  const items = itemsFromCosted(costed);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].values.debt_end, { low: 80, high: 80 });
  assert.equal(items[0].kind, 'baseline');
  const o = items[1];
  assert.equal(o.id, 'opt-c1');
  assert.deepEqual(o.values.debt_end, { low: 75.4, high: 77.1 });
  assert.deepEqual(o.values.output_cost, { low: 0.5, high: 1.5 });
  assert.equal(o.values.growth_first, null);
  assert.deepEqual(o.values.pb_change, { low: 1, high: 1 });
});

test('itemFromWhatIf: output cost is the fall in output, debt against baseline is the difference', () => {
  const w = itemFromWhatIf('w1', 'Defence cut, to deficit', run);
  assert.equal(w.kind, 'whatif');
  assert.equal(w.horizonYear, '2030');
  assert.deepEqual(w.values.output_cost, { low: 0.2, high: 0.3 });
  assert.deepEqual(w.values.debt_vs_baseline, { low: -1.5, high: -1 });
  assert.deepEqual(w.values.growth_first, { low: -0.2, high: -0.3 });
  assert.deepEqual(w.values.pb_change, { low: 0.4, high: 0.4 });
});

test('tradeOffChart: leaves items without a figure off with the axis, flags ranges and mixed horizons', () => {
  const items = [...itemsFromCosted(costed), itemFromWhatIf('w1', 'W', run)];
  const c = tradeOffChart(items, 'growth_first', 'debt_end');
  assert.deepEqual(
    c.left.map((l) => [l.item.id, l.axis]),
    [['opt-c1', 'growth_first']],
  );
  assert.deepEqual(c.plotted.map((p) => p.item.id), ['baseline', 'w1']);
  assert.equal(c.plotted[0].hasRange, false);
  assert.equal(c.plotted[1].hasRange, true);
  assert.equal(c.mixedHorizon, true);
  assert.ok(c.x.min < -0.3 && c.x.max > 0, 'x extent includes 0 and the data');
  assert.ok(c.y.min <= 0 && c.y.max > 80);

  const same = tradeOffChart(itemsFromCosted(costed), 'output_cost', 'debt_end');
  assert.equal(same.mixedHorizon, false);
  assert.deepEqual(same.plotted[1].a, { x: 0.5, y: 75.4 });
  assert.deepEqual(same.plotted[1].b, { x: 1.5, y: 77.1 });
  assert.equal(same.left.length, 0);
});

test('tradeOffChart: no items still gives a usable extent', () => {
  const c = tradeOffChart([], 'output_cost', 'debt_end');
  assert.equal(c.plotted.length, 0);
  assert.ok(c.x.max > c.x.min && c.y.max > c.y.min);
});

test('ticks: round steps inside the range', () => {
  assert.deepEqual(ticks(0, 10), [0, 2, 4, 6, 8, 10]);
  const t = ticks(-1.2, 86.5);
  assert.ok(t.length >= 3 && t.length <= 6);
  assert.ok(t.every((v) => v >= -1.2 && v <= 86.5));
  assert.deepEqual(ticks(3, 3), [3]);
});

test('store: keeps newest first per country, replaces the same id, caps the list, tells listeners', () => {
  let calls = 0;
  const off = onKeptChange(() => calls++);
  const w = (id: string) => itemFromWhatIf(id, id, run);
  keepWhatIf('TST', w('a'));
  keepWhatIf('TST', w('b'));
  keepWhatIf('TST', w('a'));
  assert.deepEqual(keptWhatIfs('TST').map((x) => x.id), ['a', 'b']);
  assert.equal(keptWhatIfs('OTH').length, 0);
  for (let i = 0; i < 10; i++) keepWhatIf('TST', w(`x${i}`));
  assert.equal(keptWhatIfs('TST').length, MAX_KEPT);
  removeWhatIf('TST', 'x9');
  assert.ok(!keptWhatIfs('TST').some((x) => x.id === 'x9'));
  off();
  const before = calls;
  keepWhatIf('TST', w('z'));
  assert.equal(calls, before);
  assert.equal(before, 14);
});

test('wiring: chart on the Debt sustainability panel, keep button on the what-if card, all text keys present', () => {
  const panel = readFileSync('src/components/DebtSustainabilityPanel.tsx', 'utf8');
  assert.match(panel, /<TradeOffChart iso3=\{reply\.iso3\} costed=\{reply\.options\} \/>/);
  const card = readFileSync('src/components/WhatIfCard.tsx', 'utf8');
  assert.match(card, /keepWhatIf\(item\.iso3, itemFromWhatIf\(/);
  const chart = readFileSync('src/components/TradeOffChart.tsx', 'utf8');
  const keys = new Set([...chart.matchAll(/'(to_[a-zA-Z_]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 15);
  for (const k of keys) assert.ok(k in PANELS.en, `missing panel key ${k}`);
});
