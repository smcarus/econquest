import test from 'node:test';
import assert from 'node:assert/strict';
import { noModelDigest } from '../src/utils/noModelDigest.ts';
import type { AgentAnswer } from '../src/utils/askCouncil.ts';

const fiscal: AgentAnswer = {
  id: 'fiscal' as never,
  name: 'Fiscal & Debt',
  why: 'you mentioned "debt"',
  findings: [
    {
      iso3: 'BRA',
      countryName: 'Brazil',
      reading: 'Government debt is 93.3% of GDP and the IMF projects it rising to 2027.',
      figures: [
        { label: 'Government debt', value: '93.3% of GDP', source: 'IMF WEO, 2025', tag: 'official' as never },
        { label: 'Government debt, IMF projection for 2027', value: '99.3% of GDP', source: 'IMF WEO', tag: 'official' as never },
        { label: 'Debt path', value: 'rising (+6.0 pts)', source: 'rule', tag: 'model' as never },
        { label: 'Public external debt service, 2027', value: '$19.1bn', source: 'World Bank IDS', tag: 'official' as never },
      ],
      weight: 0.8,
    },
  ],
  missing: ['Brazil: no debt sustainability view (needs the saved IMF history with Fiscal Monitor balances; see Research > History & data)'],
};

test('with no AI model the answer shows the agents’ readings and key figures', () => {
  const d = noModelDigest("Is Brazil's public debt sustainable?", [fiscal]);
  assert.equal(d.lines.length, 1);
  assert.equal(d.lines[0]!.reading, 'Government debt is 93.3% of GDP and the IMF projects it rising to 2027.');
  assert.deepEqual(d.lines[0]!.figures, ['Government debt 93.3% of GDP', 'Government debt, IMF projection for 2027 99.3% of GDP', 'Debt path rising (+6.0 pts)']);
  assert.equal(d.gaps.length, 1);
  assert.deepEqual(d.unanswered, []);
});

test('a rate-rise question that no agent works out is named, with where to work it out', () => {
  for (const q of [
    "Is Brazil's public debt sustainable, and what would a 200bp rise in rates do?",
    'What happens to Turkey if rates rise by 300 bps?',
    'What would higher interest rates do to Egypt’s debt?',
    'Impact of a rise in interest rates of 2 points on Mexico',
  ]) {
    const d = noModelDigest(q, [fiscal]);
    assert.equal(d.unanswered.length, 1, q);
    assert.match(d.unanswered[0]!.where, /Debt sustainability runs a stated interest rate shock/);
  }
  assert.equal(noModelDigest("Is Brazil's public debt sustainable, and what would a 200bp rise in rates do?", [fiscal])[ 'unanswered'][0]!.said, '200bp rise in rates');
  assert.deepEqual(noModelDigest('Are rates high in Brazil?', [fiscal]).unanswered, []);
});

test('no figures at all says so', () => {
  const d = noModelDigest('Tell me about the weather', [{ ...fiscal, findings: [], missing: [] }]);
  assert.equal(d.lines.length, 0);
  assert.equal(d.unanswered.length, 1);
});
