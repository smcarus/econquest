import test from 'node:test';
import assert from 'node:assert/strict';
import { noModelDigest, plainGap } from '../src/utils/noModelDigest.ts';
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

test('Missing lines in the chat carry no terminal commands', () => {
  const lines = [
    'Brazil, COVID, Feb-Mar 2020: USD bond spread (The replay series have not been downloaded yet (the daily download saves them; npm run replays:pull))',
    'Brazil: weekly event counts missing (GDELT raw files not pulled yet: Menu > Offline data, or npm run gdelt:pull)',
    'Brazil: long-run event history missing (GDELT 1.0 files not pulled yet: Pull them with npm run gdelt:daily (about 25 GB from 2016; --estimate shows the size first.))',
    'X missing (saved by the daily download: npm run go -- daily, or Menu > Offline data > Download)',
  ];
  const d = noModelDigest('Brazil?', [{ ...fiscal, missing: lines }], false, true);
  assert.equal(d.gaps.length, 4);
  for (const g of d.gaps) assert.ok(!/npm run|--estimate|-- daily/.test(g), g);
  assert.match(d.gaps[0], /\(the daily download saves them\)\)$/);
  assert.match(d.gaps[1], /not pulled yet: Menu > Offline data\)$/);
  assert.equal(plainGap('Kenya: no debt figures (IMF WEO did not answer)'), 'Kenya: no debt figures (IMF WEO did not answer)');
});

test('a named country with no figures is not told to name a country', () => {
  const d = noModelDigest('How is Kenya doing?', [{ ...fiscal, findings: [], missing: [] }], false, true);
  assert.equal(d.unanswered.length, 1);
  assert.doesNotMatch(d.unanswered[0].where, /Try naming a country/);
});

const cb = (call: 'tight' | 'neutral' | 'loose', gap?: string): AgentAnswer => ({
  id: 'cb' as never,
  name: 'Central Bank Watcher',
  why: 'you mentioned "central bank"',
  findings: [
    {
      iso3: 'BRA',
      countryName: 'Brazil',
      reading: `Inflation 4.4% y/y (OECD via DBnomics, Apr 2026), -0.1 pts over 3 months: steady. Policy looks ${call}, with inflation still above target. The policy rate of 13.75% is 6.67 pts above a simple Taylor rule.`,
      figures: gap ? [{ label: 'Policy rate against the rule', value: gap, source: 'rule', tag: 'model' as never }] : [],
      weight: 0.5,
      stance: [{ dim: 'policy', call }],
    },
  ],
  missing: [],
});

test('a behind-the-curve question gets a plain short answer from the policy call and the Taylor rule', () => {
  const d = noModelDigest("Is Brazil's central bank behind the curve?", [cb('tight', '+6.67 pts (tighter than the rule)')]);
  assert.equal(d.short.length, 1);
  assert.equal(d.short[0]!.text, 'No. Policy looks tight, with inflation still above target. The policy rate is 6.67 pts above the rate a simple Taylor rule gives.');
  assert.match(noModelDigest('Is the central bank behind the curve in Brazil?', [cb('loose', '-2.10 pts (looser than the rule)')]).short[0]!.text, /^Possibly\. .* 2\.10 pts below the rate/);
  assert.match(noModelDigest('Is Brazil behind the curve?', [cb('neutral')]).short[0]!.text, /^Not clearly\. Policy looks neutral/);
  assert.match(noModelDigest('Is Brazil ahead of the curve?', [cb('tight')]).short[0]!.text, /^Yes\. /);
  assert.match(noModelDigest('Is policy tight in Brazil?', [cb('tight')]).short[0]!.text, /^Policy looks tight/);
});

test('other questions get each country’s calls and debt path in one line; none without calls', () => {
  const d = noModelDigest('How is Brazil doing?', [cb('tight'), fiscal]);
  assert.deepEqual(d.short, [{ country: 'Brazil', text: 'Monetary policy looks tight; government debt is 93.3% of GDP and the IMF projects it rising to 2027.' }]);
  assert.deepEqual(noModelDigest('How is Ghana doing?', [{ ...fiscal, findings: [] }]).short, []);
});

test('Missing lines: repeats dropped, older figures and what no source publishes set apart (Ghana, 24 Nov)', () => {
  const ghana = [
    'Ghana: missing inflation (IMF did not answer) and policy rate (Not in BIS policy rates)',
    'Ghana: no debt or fiscal figures (IMF WEO, World Bank QEDS/IDS and BIS did not answer)',
    'Ghana: news tone missing (GDELT did not answer or is in its pause)',
    'Ghana: political stability rank missing (World Bank did not answer)',
    'Ghana: weekly event counts and economic news themes missing (GDELT raw files not pulled yet: Menu > Offline data)',
    'Ghana: ACLED conflict events missing: add your ACLED account (email and password) in Menu > Settings > Free data keys',
    'Ghana: 10Y yield missing (No source yet)',
    'Ghana: USD bond spread missing (No free source)',
    'Ghana: no carry reading',
    'Ghana: futures positioning missing (No CFTC-reported future)',
    'Ghana: no BIS real exchange rate, ECB rate, CFTC positioning or TIC holdings',
    'Ghana: World Bank, WITS or UN Comtrade trade figures not loaded',
    'Ghana: OECD leading indicator missing (OECD publishes no CLI)',
    'No dated events on file in the next 120 days for Ghana',
    'Ghana: no dated event on file in the next 60 days',
    'Ghana: no BIS policy-rate history for the policy cycle',
    'Ghana: no OECD leading indicator',
    'Ghana: no GDELT pull',
    'Ghana: no CFTC currency future, so no futures positioning',
    'Ghana: no Polymarket contract names this country',
    'Ghana: Kalshi odds are not saved per country, so only Polymarket contracts are read',
    "Ghana: consumer confidence, economic sentiment and households' price expectations missing (the European Commission's household survey covers EU members only)",
    'Ghana: no positioning, crowd odds or survey figures to describe',
    'Brazil: older than usual, so read with their date: policy rate for 2026-11-03, 21 days old (usually 14 at most)',
  ];
  const d = noModelDigest('How is Ghana doing?', [{ ...fiscal, findings: [], missing: ghana }]);
  assert.equal(d.gaps.length, 7);
  assert.ok(d.gaps.every((g) => /did not answer|not pulled|add your|not loaded/.test(g)));
  assert.deepEqual(d.older, [ghana[23]]);
  assert.equal(d.notCovered.length, 9);
  for (const gone of [8, 14, 15, 16, 17, 18, 22]) assert.ok(![...d.gaps, ...d.notCovered].includes(ghana[gone]!), ghana[gone]);
  // A short line with nothing longer to repeat stays.
  assert.deepEqual(noModelDigest('x', [{ ...fiscal, findings: [], missing: ['Kenya: no GDELT pull'] }]).gaps, ['Kenya: no GDELT pull']);
});
