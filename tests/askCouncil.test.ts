import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentChoicePrompt,
  allowedNumbers,
  applyAgentChoice,
  checkBrief,
  councilBriefSections,
  countriesInQuestion,
  planCouncil,
  runCouncil,
  scenariosInQuestion,
  traces,
} from '../src/utils/askCouncil.ts';
import type { WatchlistItem } from '../src/types/council.ts';

const it = (iso3: string, countryName: string, o: Partial<WatchlistItem> = {}): WatchlistItem =>
  ({ iso3, countryName, compositeRisk: 0.5, cds5YBps: 150, yield10YPct: 8, ...o }) as WatchlistItem;

const TUR = it('TUR', 'Turkey', {
  compositeRisk: 0.7,
  cds5YBps: 300,
  yield10YPct: 28,
  cpiInflationPct: 34,
  cpiSource: 'live',
  policyRatePct: 30,
  policyRateSource: 'ai_estimate',
  reerGapPct: -12.4,
  reerPeriod: '2026-09',
  trade: { fuelImportsPctMerch: 15, fuelExportsPctMerch: 3, importsPctGdp: 32, exportsPctGdp: 30, wbYear: '2025', chinaExportSharePct: 2, witsYear: '2023' },
});
const ZAF = it('ZAF', 'South Africa', { compositeRisk: 0.5, cds5YBps: 250, cpiInflationPct: 3.4, cpiSource: 'live', policyRatePct: 8 });
const EGY = it('EGY', 'Egypt (Red Sea Corridor)', { compositeRisk: 0.8, cds5YBps: 600 });
const POL = it('POL', 'Poland', { compositeRisk: 0.3, cds5YBps: 70 });
const ALL = [TUR, ZAF, EGY, POL];

test('planner: countries by name, alias or ISO code; the whole watchlist when none is named', () => {
  assert.deepEqual(countriesInQuestion('How exposed is Türkiye?', ALL).map((c) => c.iso3), ['TUR']);
  assert.deepEqual(countriesInQuestion('Egypt and ZAF', ALL).map((c) => c.iso3), ['ZAF', 'EGY']);
  assert.deepEqual(countriesInQuestion('Poles apart', ALL), []); // no partial-word match
  const p = planCouncil('Which central banks look behind the curve?', ALL);
  assert.equal(p.countries.length, 4);
  assert.match(p.scopeNote, /whole watchlist \(4 countries\)/);
  // A country picked in the box overrides the question.
  assert.deepEqual(planCouncil('Turkey?', ALL, 'POL').countries.map((c) => c.iso3), ['POL']);
});

test('planner: agents by stated keyword rules, with the reason; all five when no topic matches', () => {
  const p = planCouncil("Is Turkey's central bank behind the curve, and what would a Hormuz closure do?", ALL);
  assert.deepEqual(p.agents.map((a) => a.id), ['cb', 'spill']);
  assert.match(p.agents[0].why, /mentions "central bank"/);
  assert.match(p.agents[1].why, /mentions "hormuz"/i);
  // "exchange rate" is the FX agent's, not the central bank's.
  assert.deepEqual(planCouncil('Is the exchange rate weak?', ALL).agents.map((a) => a.id), ['fx']);
  const all = planCouncil('Tell me about Poland', ALL);
  assert.deepEqual(all.agents.map((a) => a.id), ['cb', 'rv', 'fx', 'spill', 'calendar']);
  assert.match(all.agents[0].why, /every agent answers/);
});

test('agents answer only from figures on hand, each figure tagged, and say what is missing', () => {
  const q = 'Turkey: central bank, CDS, currency, Hormuz and what is next?';
  const answers = runCouncil(q, planCouncil(q, ALL), ALL, new Date('2026-11-04T12:00:00Z'));
  const by = Object.fromEntries(answers.map((a) => [a.id, a]));
  const cb = by.cb.findings[0];
  assert.match(cb.reading, /Behind the curve/);
  const tag = (label: string) => cb.figures.find((f) => f.label === label)!.tag;
  assert.equal(tag('CPI inflation'), 'live');
  assert.equal(tag('Policy rate'), 'estimate');
  assert.equal(tag('Real policy rate'), 'model');
  // CDS against peers needs the whole watchlist (4 countries with CDS).
  assert.ok(by.rv.findings[0].figures.some((f) => f.label === 'CDS against risk peers'));
  assert.match(by.fx.findings[0].reading, /weak for its history: 12% below/);
  assert.deepEqual(scenariosInQuestion(q), ['hormuz']);
  assert.match(by.spill.findings[0].reading, /Strait of Hormuz closure/);
  assert.equal(by.spill.findings[0].figures.length, 1);
  assert.ok(by.calendar.findings.length + by.calendar.missing.length > 0);
  // Egypt has no inflation or policy rate figure: the central bank agent says which source is missing.
  const wide = runCouncil('inflation', planCouncil('inflation', ALL), ALL);
  assert.ok(wide[0].missing.some((m) => /Egypt.*missing inflation \(IMF did not answer\) and policy rate \(No source yet\)/.test(m)));
});

test('number check: a sentence survives only when its numbers trace back to an agent figure', () => {
  const q = 'Is Turkey behind the curve?';
  const answers = runCouncil(q, planCouncil(q, ALL), ALL);
  const allowed = allowedNumbers(q, answers);
  assert.ok(traces('34', allowed) && traces('34.0', allowed) && traces('-4.0'.replace('-', ''), allowed));
  assert.equal(traces('41.5', allowed), false);
  const { brief, removed } = checkBrief(
    {
      headline: 'Turkey looks behind the curve, with inflation at 34.0% and a real policy rate of -4.0%.',
      points: ['The policy rate is 30.00%, an AI estimate.', 'Inflation will fall to 21% next year.', 'No number here.'],
      disagreements: [],
      gaps: [],
    },
    q,
    answers
  );
  assert.match(brief.headline, /behind the curve/);
  assert.deepEqual(brief.points, ['The policy rate is 30.00%, an AI estimate.', 'No number here.']);
  assert.deepEqual(removed, ['Inflation will fall to 21% next year.']);
});

test('Reports: no saved brief says how to make one; a brief without a model says so, never invents a summary', () => {
  assert.match(councilBriefSections(null, () => true)[0].lines[0], /Ask the council a question on Workspace/);
  const q = 'Is Turkey behind the curve?';
  const plan = planCouncil(q, ALL);
  const sections = councilBriefSections(
    { question: q, askedAt: '2026-11-04T22:10:00Z', scopeNote: plan.scopeNote, answers: runCouncil(q, plan, ALL), synthesis: { brief: null, removed: [], reason: 'No AI model answered.' } },
    () => true
  );
  const summary = sections.find((s) => s.heading === 'Summary')!;
  assert.match(summary.lines[0], /^No AI summary\. No AI model answered\./);
  const agents = sections.find((s) => s.heading === 'What each agent found')!;
  assert.match(agents.lines.join('\n'), /Central Bank Watcher Agent/);
  assert.match(agents.lines.join('\n'), /CPI inflation 34\.0% \(Live data, IMF, live\)/);
});

test('follow-ups keep the last countries and agents unless the question names others', async () => {
  const { planFollowUp, suggestFollowUps, earlierAsText, CARRIED } = await import('../src/utils/askCouncil.ts');
  const first = planCouncil('Is Turkey behind the curve?', ALL);
  assert.deepEqual(first.countries.map((c) => c.iso3), ['TUR']);
  // A topic but no country: same country, new agent.
  const fx = planFollowUp('And the currency?', first, ALL);
  assert.deepEqual(fx.countries.map((c) => c.iso3), ['TUR']);
  assert.match(fx.scopeNote, new RegExp(CARRIED));
  assert.deepEqual(fx.agents.map((a) => a.id), ['fx']);
  // A country but no topic: new country, same agents.
  const egy = planFollowUp('What about Egypt?', first, ALL);
  assert.deepEqual(egy.countries.map((c) => c.iso3), ['EGY']);
  assert.deepEqual(egy.agents.map((a) => a.id), first.agents.map((a) => a.id));
  assert.ok(egy.agents.every((a) => a.why.includes(CARRIED)));
  // Suggestions cover agents not yet asked.
  const s = suggestFollowUps(first, runCouncil('Is Turkey behind the curve?', first, ALL));
  assert.ok(s.length > 0 && s.length <= 3);
  assert.ok(!s.includes('How does inflation compare with the policy rate?'), 'the Central Bank Watcher was already asked');
  // Earlier turns go to the model as context only.
  assert.match(earlierAsText([{ question: 'Is Turkey behind the curve?', headline: 'Policy looks tight.' }]), /context only.*\n- Q: Is Turkey behind the curve\? A: Policy looks tight\./s);
  assert.equal(earlierAsText([]), '');
});

test('the saved brief lists earlier questions of the conversation', () => {
  const q = 'And the currency?';
  const plan = planCouncil(q, ALL);
  const lines = councilBriefSections(
    { question: q, askedAt: '2026-11-05T00:30:00Z', scopeNote: 'Turkey', answers: runCouncil(q, plan, ALL), synthesis: null, earlier: [{ question: 'Is Turkey behind the curve?', headline: 'Policy looks tight.' }] },
    (id) => id === 'question'
  )[0].lines;
  assert.ok(lines.includes('- Is Turkey behind the curve? (Policy looks tight.)'));
});

test('AI-chosen agents: valid picks replace word matching, in agent order; bad picks fall back with the reason', () => {
  const base = planCouncil('Is Turkey cheap?', ALL);
  assert.deepEqual(base.agents.map((a) => a.id), ['rv']);
  const ai = applyAgentChoice(base, {
    agents: [
      { id: 'FX', why: 'the lira drives the answer.' },
      { id: 'rv', why: 'CDS against peers' },
      { id: 'rv', why: 'duplicate' },
      { id: 'astrology', why: 'not an agent' },
    ],
    provider: 'gemini',
  });
  assert.equal(ai.chosenBy, 'ai');
  assert.deepEqual(ai.agents.map((a) => a.id), ['rv', 'fx']);
  assert.equal(ai.agents[1].why, 'the AI model judged: the lira drives the answer');
  assert.match(ai.chooserNote!, /AI model \(gemini\)/);
  assert.deepEqual(ai.countries.map((c) => c.iso3), ['TUR'], 'countries untouched');

  const none = applyAgentChoice(base, { agents: null, reason: 'no AI model answered' });
  assert.equal(none.chosenBy, 'words');
  assert.deepEqual(none.agents, base.agents);
  assert.match(none.chooserNote!, /matching words in the question, as no AI model answered/);
  assert.match(applyAgentChoice(base, { agents: [{ id: 'x', why: '' }] }).chooserNote!, /named no agent on the list/);
  assert.equal(applyAgentChoice(base, null).chosenBy, 'words');
});

test('agent choice prompt lists every agent by id and the earlier questions', () => {
  const p = agentChoicePrompt('And the currency?', [{ question: 'Is Turkey cheap?' }]);
  for (const id of ['cb', 'rv', 'fx', 'spill', 'calendar']) assert.match(p, new RegExp(`- ${id}: `));
  assert.match(p, /Earlier questions[\s\S]*Is Turkey cheap\?[\s\S]*Question: And the currency\?/);
});
