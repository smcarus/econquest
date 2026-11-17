/**
 * The Quant desk (research tools item 2) on replies built from the contract's examples
 * (docs/contracts/research-tools.json): which tools a question calls, the answer's figures with
 * their link, data-through date and label, the number check, refusals and time-outs, the planner
 * and the AI pick, and that nothing changes while the research tools are off.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentChoicePrompt, applyAgentChoice, planCouncil, sentenceCheck, allowedNumbers, type AgentAnswer, type AgentChoiceResult } from '../src/utils/askCouncil.ts';
import { councilAnswers, type QuantRequest } from '../src/utils/councilQuestion.ts';
import { askCouncilColumns } from '../src/utils/councilNetwork.ts';
import { agentBadge } from '../src/utils/agentBadges.ts';
import { toAgentDocument } from '../src/utils/agentDocument.ts';
import { horizonDays, nowcastFollowUp, planToolCalls, quantAnswer, refsInQuestion, resultFigures, startDate, unavailableAnswer, type CallResult } from '../src/utils/quantDesk.ts';
import { QUANT_TOPIC, quantReason } from '../src/utils/quantDeskInfo.ts';
import type { WatchlistItem } from '../src/types/council.ts';
import { CONTRACT } from './helpers/researchToolsServer.ts';

const TOOLS: string[] = CONTRACT.tools.map((t: { name: string }) => t.name);
const GARCH = CONTRACT.examples.find((e: { what: string }) => /GARCH/.test(e.what)).reply.result.structuredContent as Record<string, unknown>;
const CITE = { source: 'Fund console research tools', tool: 'forecast_series', id: 'FC0000000001', url: 'https://console.example.ts.net:8443/research/forecasts/FC0000000001', dataThrough: '2026-11-16', label: 'Hypothetical, past performance; not a recommendation' };
const Q = "What's the 20-day volatility forecast for BRL?";
const NOW = new Date('2026-11-17T12:00:00Z');

const it = (iso3: string, countryName: string, o: Partial<WatchlistItem> = {}): WatchlistItem => ({ iso3, countryName, ...o }) as WatchlistItem;
const TUR = it('TUR', 'Turkey', { currencyCode: 'TRY', reerGapPct: -12.4, reerPeriod: '2026-09', fxVolPct: 14.1 } as Partial<WatchlistItem>);
const BRA = it('BRA', 'Brazil', { currencyCode: 'BRL', reerGapPct: 3.2, reerPeriod: '2026-09' } as Partial<WatchlistItem>);
const POOL = [TUR, BRA];

const garchResult = (call = planToolCalls(Q, [], TOOLS, 4, NOW, ['BRL']).calls[0]!): CallResult => ({ call, ok: true, data: GARCH, cite: CITE });

test('the words that bring the Quant desk in; "policy options" does not', () => {
  for (const q of ['Backtest momentum on USDBRL', 'volatility forecast for BRL', 'GDP nowcast for Brazil', 'option chain for $SPY', 'max drawdown of USDMXN', 'Sharpe of BTR-12']) assert.ok(QUANT_TOPIC.test(q), q);
  for (const q of ['What are the policy options for Egypt?', 'Is Turkey behind the curve?']) assert.ok(!QUANT_TOPIC.test(q), q);
});

test('instruments and sizes come only from the question', () => {
  assert.deepEqual(refsInQuestion(Q, [], ['BRL']), ['USDBRL'], 'BRL means USDBRL: the contract quotes FX as units per US dollar');
  assert.deepEqual(refsInQuestion('USD/MXN and $SPY', [], ['MXN']), ['USDMXN', 'SPY']);
  assert.deepEqual(refsInQuestion('How volatile is the lira?', [{ iso3: 'TUR', countryName: 'Turkey', currencyCode: 'TRY' }]), ['USDTRY']);
  assert.deepEqual(refsInQuestion('Sharpe of BTR-000012 and macro:US_CPI', []), ['BTR-000012', 'macro:US_CPI']);
  assert.deepEqual(refsInQuestion('Is the USD strong? What about GDP and CPI?', []), [], 'USD alone, GDP and CPI are not instruments');
  assert.equal(horizonDays(Q), 20);
  assert.equal(horizonDays('volatility for BRL'), null, 'no horizon stated, none picked');
  assert.equal(horizonDays('over 90 days'), null, 'beyond the contract\'s 60');
  assert.equal(startDate('momentum since 2015', NOW), '2015-01-01');
  assert.equal(startDate('over the last 5 years', NOW), '2021-11-17');
  assert.equal(startDate('momentum', NOW), null);
});

test('acceptance: the 20-day BRL volatility question calls forecast_series (GARCH, USDBRL, 20 days) and nothing else', () => {
  const { calls, notes } = planToolCalls(Q, [], TOOLS, 4, NOW, ['BRL']);
  assert.deepEqual(calls, [{ name: 'forecast_series', args: { ref: 'USDBRL', model: 'garch', horizon: 20 }, ref: 'USDBRL' }]);
  assert.deepEqual(notes, []);
});

test('tools come only from the server\'s list for this token, and at most the limit per question', () => {
  assert.deepEqual(planToolCalls(Q, [], TOOLS.filter((t) => t !== 'forecast_series'), 4, NOW, ['BRL']).calls, []);
  assert.match(planToolCalls(Q, [], ['list_runs'], 4, NOW, ['BRL']).notes[0]!, /do not cover this question/);
  const many = planToolCalls('Volatility forecast, drawdown and option chain for USD/MXN and $SPY, and their correlation', [], TOOLS, 2, NOW, ['MXN']);
  assert.equal(many.calls.length, 2);
  assert.match(many.notes.at(-1)!, /more tool calls were left out \(limit of 2 per question\)/);
  assert.match(planToolCalls('What is the volatility forecast?', [], TOOLS, 4, NOW).notes[0]!, /names no instrument/);
  // Backtests: a saved run by id, a new run only with a strategy, an instrument and a period, else the recent runs.
  assert.deepEqual(planToolCalls('Show backtest BTR-000012', [], TOOLS, 4, NOW).calls.map((c) => c.name), ['get_run']);
  const run = planToolCalls('Backtest momentum on USDBRL since 2018', [], TOOLS, 4, NOW, ['BRL']).calls[0]!;
  assert.deepEqual(run.args, { spec: { name: 'council momentum USDBRL', universe: ['USDBRL'], start: '2018-01-01', end: '2026-11-17', signal: { kind: 'momentum' } } });
  assert.deepEqual(planToolCalls('Backtest momentum on USDBRL', [], TOOLS, 4, NOW, ['BRL']).calls.map((c) => c.name), ['list_runs'], 'no period stated: no new run');
  assert.ok(!planToolCalls('Backtest momentum on USDBRL since 2018', [], TOOLS, 4, NOW, ['BRL']).calls.some((c) => c.name === 'create_paper_portfolio'));
  // Nowcasts: the list first, then the model for a country named.
  assert.deepEqual(planToolCalls('GDP nowcast for Brazil', [{ iso3: 'BRA', countryName: 'Brazil' }], TOOLS, 4, NOW).calls.map((c) => c.name), ['list_nowcasts']);
  assert.deepEqual(nowcastFollowUp({ models: [{ model_id: 'BRA_GDP_Q', target: 'Brazil GDP growth' }, { model_id: 'MEX_GDP_Q' }] }, [{ iso3: 'BRA', countryName: 'Brazil' }], TOOLS), [{ name: 'get_nowcast', args: { model_id: 'BRA_GDP_Q' }, ref: 'Brazil' }]);
});

test('the GARCH example: every figure from the reply, with its link, data-through date and label; no buy or sell words', () => {
  const a = quantAnswer('the question mentions "volatility"', [garchResult()]);
  assert.equal(a.id, 'quant');
  assert.equal(a.name, 'Quant desk');
  assert.equal(a.findings.length, 1);
  const f = a.findings[0]!;
  assert.equal(f.countryName, 'USDBRL');
  assert.equal(f.reading, 'GARCH volatility forecast over 20 days from the outside research tools, data through 2026-11-16. Hypothetical, past performance; not a recommendation.');
  assert.deepEqual(
    f.figures.map((g) => [g.label, g.value]),
    [
      ['Horizon (days)', '20'],
      ['Observations used', '1004'],
      ['Volatility now, a year', '0.142 (14.2%)'],
      ['Volatility at the end of the horizon, a year', '0.14 (14%)'],
    ]
  );
  for (const g of f.figures) {
    assert.equal(g.url, CITE.url);
    assert.equal(g.source, 'Fund console research tools, forecast_series FC0000000001, data through 2026-11-16. Hypothetical, past performance; not a recommendation');
    assert.equal(g.tag, 'model');
  }
  assert.ok(!/\b(buy|sell)\b/i.test(JSON.stringify(a)), 'never a buy or sell call');
  assert.ok(!JSON.stringify(a).includes('3f1c9a'), 'hashes and ids are not figures');
  // The standard document keeps the link.
  const doc = toAgentDocument(a, { question: Q, askedAt: '2026-11-17T12:00:00Z', scope: 'x', countriesAsked: 0 });
  assert.equal(doc.findings[0]!.figures[0]!.url, CITE.url);
  assert.match(doc.covers, /outside research-tools server/);
});

test('the number check admits the Quant desk\'s figures and nothing else', () => {
  const a = quantAnswer('why', [garchResult()]);
  const allowed = allowedNumbers(Q, [a]);
  for (const v of [0.142, 14.2, 0.14, 1004, 20]) assert.ok(allowed.includes(v), `${v} allowed`);
  const check = sentenceCheck(Q, [a]);
  assert.equal(check.ok('The GARCH forecast puts USDBRL volatility at 0.142 a year (14.2%), through 2026-11-16.'), true);
  assert.equal(check.ok('USDBRL volatility would rise to 0.25 a year.'), false);
  assert.equal(check.ok('It is 17.5% a year.'), false);
});

test('compliance flags are counted, never printed; a result without figures says so', () => {
  const flagged = quantAnswer('why', [{ ...garchResult(), data: { ...GARCH, flagged: ['INS-0042'] } }]);
  assert.ok(!JSON.stringify(flagged).includes('INS-0042'));
  assert.ok(flagged.missing.includes('The research tools server flagged 1 instrument for compliance; its id is not shown.'));
  const empty = quantAnswer('why', [{ ...garchResult(), data: { cite: {} } }]);
  assert.equal(empty.findings.length, 0);
  assert.match(empty.missing[0]!, /held no figures to show/);
  assert.deepEqual(resultFigures({ measures: { sharpe: 0.81234567, max_drawdown: -0.2 }, equity_curve: [{ d: 1 }, { d: 2 }] }), [
    { label: 'Sharpe (measures)', value: '0.8123' },
    { label: 'Max drawdown (measures)', value: '-0.2' },
    { label: 'Equity curve returned', value: '2' },
  ]);
});

test('refused or timed out: "Research tools unavailable" with the reason; only local models allowed: the desk is left out', () => {
  const call = planToolCalls(Q, [], TOOLS, 4, NOW, ['BRL']).calls[0]!;
  const late = quantAnswer('why', [{ call, ok: false, reason: 'no answer within 20 seconds' }]);
  assert.deepEqual(late.findings, []);
  assert.deepEqual(late.missing, ['Research tools unavailable: no answer within 20 seconds']);
  const local = quantAnswer('why', [garchResult(), { call, ok: false, reason: 'Compliance limits council research to local models', localOnly: true }]);
  assert.deepEqual(local.findings, [], 'nothing from the desk reaches the answer');
  assert.equal(local.missing[0], 'Research tools unavailable: Compliance limits council research to local models');
  assert.match(local.missing[1]!, /left out of this answer/);
  assert.deepEqual(unavailableAnswer('why', 'the app server did not answer').missing, ['Research tools unavailable: the app server did not answer']);
});

test('the planner: words or the AI model pick the Quant desk; the AI choice prompt lists it only when research tools are set up', () => {
  assert.equal(quantReason(Q, null), 'the question mentions "volatility"');
  assert.equal(quantReason('And for Turkey?', null, { quant: { why: 'w' } }), 'carried over from your last question (w)');
  assert.equal(quantReason('And their debt?', null, { quant: { why: 'w' } }, true), null, 'a follow-up on another topic does not carry it');
  assert.equal(quantReason('Is the real cheap?', { agents: [{ id: 'quant', why: 'Asks for a price forecast.' }] }), 'the AI model judged: Asks for a price forecast');
  assert.ok(!agentChoicePrompt(Q).includes('quant'), 'prompt unchanged while off, so the recorded council replay holds');
  assert.equal(agentChoicePrompt(Q), agentChoicePrompt(Q, [], {}));
  assert.match(agentChoicePrompt(Q, [], { quant: true }), /^- quant: Quant desk Agent, covers figures from an outside research-tools server/m);
  // An AI pick of only the Quant desk still counts as the AI's pick.
  const plan = applyAgentChoice(planCouncil(Q, POOL), { agents: [{ id: 'quant', why: 'x' }], provider: 'stand-in' }, ['quant']);
  assert.equal(plan.chosenBy, 'ai');
  assert.deepEqual(plan.agents, []);
  // Without the extra id the same pick is not on the list, as before.
  assert.equal(applyAgentChoice(planCouncil(Q, POOL), { agents: [{ id: 'quant', why: 'x' }] }).chosenBy, 'words');
});

const noAi = async (): Promise<AgentChoiceResult | null> => ({ agents: null, reason: 'no AI model answered' });
const noGet = (async () => new Response('null', { status: 404 })) as typeof fetch;

test('off: Council chat runs exactly as before (no status call changes anything, no Quant desk, same AI request)', async () => {
  const seen: unknown[][] = [];
  const choose = async (...args: unknown[]) => {
    seen.push(args);
    return noAi();
  };
  const before = await councilAnswers({ question: Q, items: POOL, history: [], now: NOW }, { chooseAgents: choose, get: noGet });
  let ran = false;
  const off = await councilAnswers({ question: Q, items: POOL, history: [], now: NOW }, { chooseAgents: choose, get: noGet, quant: { enabled: async () => false, run: async () => ((ran = true), null) } });
  assert.equal(ran, false);
  assert.deepEqual(off.answers, before.answers);
  assert.deepEqual(off.plan, before.plan);
  assert.equal(off.plan.quant, undefined);
  assert.deepEqual(seen.map((a) => a.length), [2, 2], 'the AI step is asked the same way');
});

test('on: the Quant desk joins the other desks; refused or timed out, the other desks still answer with a visible line', async () => {
  const reqs: QuantRequest[] = [];
  const steps = (answer: AgentAnswer | null) => ({
    chooseAgents: noAi,
    get: noGet,
    quant: {
      enabled: async () => true,
      run: async (r: QuantRequest) => {
        reqs.push(r);
        return answer;
      },
    },
  });
  const on = await councilAnswers({ question: Q, items: POOL, history: [], now: NOW, questionId: 'q-test-0001' }, steps(quantAnswer('the question mentions "volatility"', [garchResult()])));
  assert.equal(on.plan.quant?.why, 'the question mentions "volatility"');
  assert.equal(on.answers[0]!.id, 'quant', 'first, so the summary step never drops it');
  assert.ok(on.answers.some((a) => a.id === 'fx' && a.findings.length), 'the FX desk answers too');
  assert.deepEqual(reqs[0], { question: Q, why: 'the question mentions "volatility"', questionId: 'q-test-0001', countries: [], currencies: ['TRY', 'BRL'] });

  for (const down of [quantAnswer('why', [{ call: garchResult().call, ok: false, reason: 'no answer within 20 seconds' }]), null]) {
    const r = await councilAnswers({ question: Q, items: POOL, history: [], now: NOW }, steps(down));
    const quant = r.answers.find((a) => a.id === 'quant')!;
    assert.deepEqual(quant.findings, []);
    assert.match(quant.missing[0]!, /^Research tools unavailable: /);
    assert.ok(r.answers.some((a) => a.id !== 'quant' && a.findings.length), 'an answer from the other desks');
  }
  // A question only for the Quant desk does not bring every desk agent.
  const only = await councilAnswers({ question: 'Backtest a moving-average rule on $SPY since 2015', items: POOL, history: [], now: NOW }, steps(quantAnswer('w', [])));
  assert.deepEqual(only.plan.agents, []);
  assert.deepEqual(only.answers.map((a) => a.id), ['quant']);
});

test('network view: the Quant desk node, its badge reads outside research tools', () => {
  const cols = askCouncilColumns([quantAnswer('the question mentions "volatility"', [garchResult()])], false, null);
  const node = cols[1]!.nodes[0]!;
  assert.equal(node.label, 'Quant desk Agent');
  assert.equal(node.note, '1 result');
  assert.equal(askCouncilColumns([unavailableAnswer('w', 'x')], false, null)[1]!.nodes[0]!.note, 'Research tools unavailable');
  assert.equal(agentBadge('quant').icon, 'flask');
  assert.match(agentBadge('quant').reads!, /^Outside research tools/);
});

test('the Quant desk\'s words have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang.ts');
  const a = quantAnswer('w', [garchResult()]);
  const lines = [a.findings[0]!.reading, ...a.findings[0]!.figures.map((g) => g.label), ...quantAnswer('w', [{ call: garchResult().call, ok: false, reason: 'no answer within 20 seconds' }]).missing, ...quantAnswer('w', [{ call: garchResult().call, ok: false, reason: 'x', localOnly: true }]).missing.slice(1), agentBadge('quant').plain, agentBadge('quant').reads!, '1 result', '3 results'];
  for (const [lang, mod] of [['es', '../src/i18n/es/index.ts'], ['fr', '../src/i18n/fr/index.ts'], ['pt', '../src/i18n/pt/index.ts']] as const) {
    const m = await import(mod);
    const up = lang.toUpperCase();
    attachLanguage(lang, m[up], m[`${up}_TEXT`]);
    for (const l of lines) assert.notEqual(translateText(l, lang), l, `${lang}: ${l}`);
    const reading = translateText(a.findings[0]!.reading, lang);
    assert.ok(reading.includes('Hypothetical, past performance; not a recommendation'), 'the server\'s label is kept as sent');
  }
});
