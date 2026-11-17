import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWhatIf, citedWhatIf, isWhatIfAnswer, sectionOfFigure, whatIfCoverage, whatIfTask, WHATIF_INSTRUCTION, WHATIF_ORDER } from '../src/utils/whatIfAnswer.ts';
import type { AgentAnswer } from '../src/utils/askCouncil.ts';

const scenario: AgentAnswer = {
  id: 'scenario',
  name: 'Scenario',
  why: 'the question is a what-if',
  findings: [
    {
      iso3: 'TUR',
      countryName: 'Turkey',
      reading: 'A 1 point Fed rise, applied to today\'s figures.',
      weight: 1,
      figures: [
        { label: 'Now: policy rate', value: '40.00%', source: 'BIS central bank policy rates, 2026-10-23', tag: 'official' },
        { label: 'Shock: us federal reserve rate', value: '+1.00 pts', source: 'size as stated in the question', tag: 'model' },
        { label: 'After the shock: currency against the US dollar (+ = weaker)', value: '+2.00% (90% band +1.02 to +2.98)', source: 'scenario engine, monthly co-movement 2011-11 to 2026-10 (170 months), not cause; App calculation on a stated shock, not a forecast', tag: 'model' },
        {
          label: 'Research: Iacoviello, M. and Navarro, G. (2019)',
          value: 'A 100 basis point rise in US rates driven by monetary policy lowers GDP in advanced economies by 0.5% after three years.',
          source: 'Iacoviello, M. and Navarro, G. (2019), "Foreign effects of higher U.S. interest rates", Journal of International Money and Finance 95, 232-250, doi 10.1016/j.jimonfin.2018.06.012; "by 0.5%" (p. 233); Published study, an average over the countries and years it covers; not an estimate for this country',
          tag: 'model',
        },
      ],
    },
  ],
  missing: ['Turkey: past episodes (the replay series are not set up on this server)'],
};
const cb: AgentAnswer = {
  id: 'cb',
  name: 'Central Bank Watcher',
  why: 'the question names rates',
  findings: [{ iso3: 'TUR', countryName: 'Turkey', reading: 'Policy looks tight.', weight: 0.8, figures: [{ label: 'CPI inflation', value: '33.0%', source: 'IMF consumer prices', tag: 'official' }], stance: [{ dim: 'policy', call: 'tight' }] }],
  missing: [],
};

test('a what-if answer needs the Scenario Agent with a finding', () => {
  assert.equal(isWhatIfAnswer([scenario, cb]), true);
  assert.equal(isWhatIfAnswer([cb]), false);
  assert.equal(isWhatIfAnswer([{ ...scenario, findings: [] }, cb]), false);
});

test('figures go to sections by their label', () => {
  assert.equal(sectionOfFigure('Now: inflation'), 'start');
  assert.equal(sectionOfFigure('Shock: oil price'), 'shock');
  assert.equal(sectionOfFigure('After the shock: trade balance, first round'), 'effects');
  assert.equal(sectionOfFigure('Net fuel trade'), 'effects');
  assert.equal(sectionOfFigure('Past episode, taper tantrum 2013: currency'), 'history');
  assert.equal(sectionOfFigure('When it happened before: median inflation 3 years later'), 'history');
  assert.equal(sectionOfFigure('Record context: policy rate after the shock'), 'history');
  assert.equal(sectionOfFigure('Research: Kilian, L. (2009)'), 'research');
  assert.equal(sectionOfFigure('CPI inflation'), null);
});

test('coverage: each section has its figures, or Missing with the reason', () => {
  const c = whatIfCoverage([scenario, cb]);
  assert.deepEqual(c.map((x) => x.section), WHATIF_ORDER);
  const by = Object.fromEntries(c.map((x) => [x.section, x]));
  assert.ok(!by.start.missing && by.start.figures.some((f) => /Now: policy rate/.test(f)) && by.start.figures.some((f) => /Central Bank Watcher/.test(f)));
  assert.ok(!by.effects.missing && !by.spread.missing && !by.research.missing && !by.trends.missing && !by.watch.missing);
  assert.match(by.history.missing!, /past episodes \(the replay series are not set up/);
  // Without the other agents, trends have nothing to read.
  const alone = Object.fromEntries(whatIfCoverage([scenario]).map((x) => [x.section, x]));
  assert.equal(alone.trends.missing, 'no other agent came back with figures');
  // No calculated effects: nothing to spread.
  const noFx = { ...scenario, findings: [{ ...scenario.findings[0], figures: scenario.findings[0].figures.filter((f) => !/^After/.test(f.label)) }], missing: ['Turkey: currency against the US dollar in the scenario engine (not fitted)'] };
  const nf = Object.fromEntries(whatIfCoverage([noFx, cb]).map((x) => [x.section, x]));
  assert.match(nf.effects.missing!, /scenario engine \(not fitted\)/);
  assert.equal(nf.spread.missing, 'there are no calculated first effects to follow through the economy');
});

test('the prompt names the sections in order, their figures, and which are Missing', () => {
  const task = whatIfTask('What if the Fed raised rates by 1 point?', whatIfCoverage([scenario, cb]));
  const order = WHATIF_ORDER.map((id) => task.indexOf(`- ${id} (`));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), order.join(','));
  assert.match(task, /- history \(What history shows\): Missing, Turkey: past episodes/);
  assert.match(task, /From: Turkey: Research: Iacoviello/);
  assert.ok(task.trimEnd().endsWith('What-if question to answer: What if the Fed raised rates by 1 point?'));
  // The three kinds of evidence are kept apart in the instruction.
  assert.match(WHATIF_INSTRUCTION, /co-movement, not cause/);
  assert.match(WHATIF_INSTRUCTION, /not an estimate for this country/);
  assert.match(WHATIF_INSTRUCTION, /description of the past, not a forecast/);
});

test('the check: untraceable numbers removed, Missing sections never written, empty sections say why', () => {
  const q = 'What if the Fed raised rates by 1 point?';
  const r = checkWhatIf(
    {
      headline: 'A Fed rise would weaken the lira.',
      start: ['The policy rate is 40.00% and inflation is 33.0%.'],
      shock: ['The question sets a rise of +1.00 pts.'],
      effects: ['The lira would weaken by +2.00%, within a band of +1.02 to +2.98.', 'Growth would fall by 7.5%.'],
      spread: [],
      history: ['In 2013 the lira fell sharply.'],
      research: ['Iacoviello and Navarro find GDP in advanced economies is 0.5% lower after three years.'],
      trends: 'Policy is tight already.',
      watch: [42],
      disagreements: [],
      gaps: ['Past episodes are missing.'],
    },
    q,
    [scenario, cb],
  );
  const s = Object.fromEntries(r.brief.whatIf.sections.map((x) => [x.id, x]));
  assert.equal(r.brief.headline, 'A Fed rise would weaken the lira.');
  assert.deepEqual(s.effects.sentences, ['The lira would weaken by +2.00%, within a band of +1.02 to +2.98.']);
  assert.deepEqual(r.removed, ['Growth would fall by 7.5%.']);
  // History has no figures, so what the model wrote there is not shown.
  assert.deepEqual(s.history.sentences, []);
  assert.match(s.history.missing!, /past episodes/);
  assert.equal(s.spread.missing, 'the summary did not cover it');
  assert.deepEqual(s.trends.sentences, ['Policy is tight already.']);
  assert.equal(s.watch.missing, 'the summary did not cover it');
  assert.equal(r.brief.points[0], 'Where things stand now: The policy rate is 40.00% and inflation is 33.0%.');
  assert.equal(r.brief.points.length, 5);
  // A sentence that calls policy loose against the Central Bank Watcher's "tight" is removed too.
  const c = checkWhatIf({ trends: ['Policy is loose in Turkey.'] }, q, [scenario, cb]);
  assert.equal(c.contradicted.length, 1);
});

test('references: official figures by source, studies by citation with the DOI link; app calculations are not references', () => {
  const r = checkWhatIf(
    {
      start: ['The policy rate is 40.00%.'],
      effects: ['The lira would weaken by +2.00%.'],
      research: ['Iacoviello and Navarro find a fall of 0.5% after three years in advanced economies.'],
    },
    'What if the Fed raised rates by 1 point?',
    [scenario, cb],
  );
  const c = citedWhatIf(r.brief.whatIf, [scenario, cb]);
  const s = Object.fromEntries(c.sections.map((x) => [x.id, x]));
  assert.deepEqual(s.start.sentences[0].refs, [1]);
  assert.deepEqual(s.effects.sentences[0].refs, []);
  assert.deepEqual(s.research.sentences[0].refs, [2]);
  assert.match(c.references[1].source, /^Iacoviello, M\. and Navarro, G\. \(2019\)/);
  assert.equal(c.references[1].url, 'https://doi.org/10.1016/j.jimonfin.2018.06.012');
});
