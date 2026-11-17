import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionText, engineShock, isWhatIfQuestion, parseScenario, readShock, shockLabel, sizeQuestion } from '../src/utils/scenarioQuestion.ts';

test('isWhatIfQuestion spots scenario questions and leaves others alone', () => {
  for (const q of [
    'What would happen if the Fed raised rates by 100 basis points?',
    'What if oil hits $150?',
    'Suppose the lira falls 30% against the dollar',
    'How would Brazil cope if growth slowed 2 points?',
    'What is the impact of a 200bp hike on Turkey?',
    'What happens to Egypt if wheat prices double?',
  ])
    assert.ok(isWhatIfQuestion(q), q);
  for (const q of ['Is Brazil debt sustainable?', 'Why is inflation high in Turkey?', 'Which currency is cheapest?']) assert.ok(!isWhatIfQuestion(q), q);
});

test('conditionText keeps the part after "if"', () => {
  assert.equal(conditionText('What would happen to Mexico if the Fed raised rates by 1 point?'), 'the Fed raised rates by 1 point');
  assert.equal(conditionText('What if oil doubles?'), 'oil doubles');
});

test('rates: basis points, points, words, a level, and % read as points', () => {
  assert.deepEqual(readShock('the Fed raised rates by 100 basis points'), { kind: 'us_rate', direction: 1, change: 1, target: null, said: 'the Fed raised rates by 100 basis points' });
  assert.equal(readShock('the central bank cuts rates 50bp')!.change, -0.5);
  assert.equal(readShock('the central bank cuts rates 50bp')!.kind, 'policy_rate');
  assert.equal(readShock('the Fed hikes by a quarter point')!.change, 0.25);
  assert.equal(readShock('Turkey raises interest rates by 5 percentage points')!.change, 5);
  const pct = readShock('the central bank raises rates by 2%')!;
  assert.equal(pct.change, 2);
  assert.deepEqual(pct.read, { as: 'pct_as_pts', value: 2 });
  const lvl = readShock('the Fed raises rates to 6%')!;
  assert.equal(lvl.change, null);
  assert.deepEqual(lvl.target, { value: 6, unit: 'pts' });
  assert.equal(readShock('bond yields jump 200 bps')!.kind, 'interest_cost');
  assert.equal(readShock('bond yields jump 200 bps')!.change, 2);
});

test('currencies: weaker is +, against the dollar, devaluation, named currencies', () => {
  const lira = readShock('the lira falls 30% against the dollar')!;
  assert.equal(lira.kind, 'currency');
  assert.equal(lira.change, 30);
  assert.equal(readShock('the peso strengthens 10%')!.change, -10);
  assert.equal(readShock('Egypt devalues by 20%')!.change, 20);
  assert.equal(readShock("Brazil's real drops 15%")!.kind, 'currency');
  assert.equal(readShock('real GDP growth falls 2 points')!.kind, 'growth');
});

test('dollar, prices, stress, supply chains, growth, inflation', () => {
  assert.deepEqual(readShock('the dollar strengthens 10%')!, { kind: 'dollar', direction: 1, change: 10, target: null, said: 'the dollar strengthens 10%' });
  assert.equal(readShock('the dollar weakens 5%')!.change, -5);
  const oil = readShock('oil hits $150')!;
  assert.equal(oil.kind, 'oil');
  assert.deepEqual(oil.target, { value: 150, unit: 'usd' });
  assert.equal(readShock('oil prices fall 40%')!.change, -40);
  assert.equal(readShock('wheat prices double')!.kind, 'food');
  assert.equal(readShock('wheat prices double')!.change, 100);
  assert.equal(readShock('copper prices halve')!.change, -50);
  assert.equal(readShock('financial stress rises 2 points')!.change, 2);
  assert.equal(readShock('supply chain pressure rises 1.5 standard deviations')!.change, 1.5);
  assert.equal(readShock('growth slows by 2 points')!.change, -2);
  const rec = readShock('there is a recession')!;
  assert.equal(rec.kind, 'growth');
  assert.equal(rec.direction, -1);
  assert.equal(rec.change, null);
  assert.equal(readShock('inflation rises 3 points')!.change, 3);
  assert.equal(readShock('Brazil and Mexico'), null);
});

test('parseScenario: several shocks, sizes asked for, spending and trade routes carried', () => {
  const q = parseScenario('What would happen to Turkey if the Fed raised rates by 1 point and the dollar strengthened 5%?')!;
  assert.deepEqual(q.shocks.map((s) => [s.kind, s.change]), [['us_rate', 1], ['dollar', 5]]);
  assert.deepEqual(engineShock(q), { us_rate: 1, dollar: 5 });
  assert.equal(q.needsSize.length, 0);
  const noSize = parseScenario('What if the Fed hikes?')!;
  assert.equal(noSize.needsSize.length, 1);
  assert.match(sizeQuestion(noSize.needsSize[0]), /percentage points/);
  assert.equal(shockLabel(noSize.shocks[0]), 'US Federal Reserve rate raised, size not stated');
  const sp = parseScenario('What if Turkey halved defence spending?')!;
  assert.equal(sp.spending?.sector.code, 'GF02');
  assert.equal(sp.shocks.length, 0);
  assert.deepEqual(parseScenario('What would happen to India if the Strait of Hormuz closed?')!.routes, ['hormuz']);
  assert.equal(parseScenario('Is Brazil debt sustainable?'), null);
  assert.equal(parseScenario('What if things change?'), null);
  assert.equal(shockLabel(q.shocks[0]), 'US Federal Reserve rate raised (+1 pts)');
});

test('planner: a what-if asks the agents that hold the figures its shocks move', async () => {
  const { planCouncil, applyAgentChoice, planFollowUp } = await import('../src/utils/askCouncil.ts');
  const TUR = { iso3: 'TUR', countryName: 'Turkey' } as never;
  const p = planCouncil('What would happen to Turkey if the Fed raised rates by 1 point?', [TUR]);
  assert.deepEqual(p.scenario?.shocks.map((s) => s.kind), ['us_rate']);
  for (const id of ['cb', 'fx', 'spill', 'rv']) assert.ok(p.agents.some((a) => a.id === id), id);
  assert.match(p.agents.find((a) => a.id === 'spill')!.why, /what-if changes the us federal reserve rate/);
  // The AI chooser's picks keep the scenario's agents.
  const ai = applyAgentChoice(p, { agents: [{ id: 'cb', why: 'rates' }] });
  assert.deepEqual(ai.agents.map((a) => a.id).sort(), ['cb', 'fx', 'rv', 'spill']);
  // A follow-up what-if takes its own shocks and agents.
  const f = planFollowUp('And what if oil prices fall 40%?', p, [TUR]);
  assert.deepEqual(f.scenario?.shocks.map((s) => [s.kind, s.change]), [['oil', -40]]);
  assert.ok(f.agents.some((a) => a.id === 'spill'));
  assert.ok(f.agents.some((a) => a.id === 'fiscal' && /world oil price/.test(a.why)));
  // A plain question has no scenario.
  assert.equal(planCouncil('Is Turkey debt sustainable?', [TUR]).scenario, undefined);
});
