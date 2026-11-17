import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScenario, scenarioText, SHOCK_KINDS, type ShockKind } from '../src/utils/scenarioQuestion.ts';
import { editedShocks } from '../src/components/ScenarioReadNote.tsx';
import { answersForModel, type AgentAnswer } from '../src/utils/askCouncil.ts';
import { itemFromScenarioDebt } from '../src/utils/tradeOff.ts';

test('the card\'s question reads back to the same shocks, for every kind and both directions', () => {
  for (const kind of Object.keys(SHOCK_KINDS) as ShockKind[]) {
    for (const change of [2.5, -1, 1]) {
      const q = scenarioText([{ kind, change, target: null }], ['Turkey'])!;
      const sq = parseScenario(q);
      assert.ok(sq, q);
      assert.deepEqual(sq!.shocks.map((s) => [s.kind, s.change, s.target]), [[kind, change, null]], q);
    }
  }
});

test('levels, several shocks and several countries', () => {
  const q = scenarioText(
    [
      { kind: 'us_rate', change: 1, target: null },
      { kind: 'oil', change: null, target: { value: 120, unit: 'usd' } },
      { kind: 'policy_rate', change: null, target: { value: 45, unit: 'pts' } },
      { kind: 'growth', change: null, target: null },
    ],
    ['Turkey', 'Mexico', 'Brazil'],
  )!;
  assert.equal(q, 'What would happen to Turkey, Mexico and Brazil if the Fed raised rates by 1 point and oil hits $120 and the central bank raised rates to 45%?');
  const sq = parseScenario(q)!;
  assert.deepEqual(sq.shocks.map((s) => [s.kind, s.change, s.target]), [['us_rate', 1, null], ['oil', null, { value: 120, unit: 'usd' }], ['policy_rate', null, { value: 45, unit: 'pts' }]]);
  assert.equal(scenarioText([{ kind: 'growth', change: null, target: null }], []), null);
});

test('edits: blank sizes and changes taken out are left out; a level stays a level', () => {
  const d = (kind: ShockKind, value: string, on = true, level: null | { value: number; unit: 'pts' | 'usd' } = null) => ({ kind, value, on, level });
  assert.deepEqual(editedShocks([d('us_rate', '0.5'), d('oil', ''), d('food', '10', false), d('oil', '150', true, { value: 120, unit: 'usd' }), d('growth', 'abc')]), [
    { kind: 'us_rate', change: 0.5, target: null },
    { kind: 'oil', change: null, target: { value: 150, unit: 'usd' } },
  ]);
});

test('a kept debt path is one point on the chart; it never goes to the model', () => {
  const item = itemFromScenarioDebt('s1', 'Scenario: borrowing costs', { endYear: '2031', baselineEnd: 60, shockedEnd: 63.456 });
  assert.deepEqual(item.values.debt_end, { low: 63.46, high: 63.46 });
  assert.deepEqual(item.values.debt_vs_baseline, { low: 3.46, high: 3.46 });
  assert.equal(item.values.output_cost, null);
  const a: AgentAnswer = { id: 'scenario', name: 'Scenario', why: '', findings: [], missing: [], keep: [{ iso3: 'TUR', countryName: 'Turkey', item }] };
  assert.equal('keep' in answersForModel([a])[0], false);
});
