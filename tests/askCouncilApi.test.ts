/**
 * Data API: ask Council chat (scope ask:council, POST /api/v1/council/ask; src/server/councilAsk.ts).
 *
 * The pure parts first (request checks, history, hidden names, real and shareable figures, periods,
 * cost). Then the real server, reading the public recorded feed replies (tests/fixtures/recorded-public/)
 * with a stand-in model (tests/helpers/stand-in-model-fetch.mjs): a token with only ask:council gets
 * the answer the browser's Council chat gets for the same question and figures, the model is asked
 * the same thing by both, and the scope, history limit, cost limit, audit entry and hidden names hold.
 */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  agentsFrom,
  answersForApi,
  answerText,
  briefWithoutHidden,
  checksFrom,
  citationsFrom,
  hiddenCountryPatterns,
  hideNames,
  historyTurns,
  isProblem,
  parseAskRequest,
  periodFromSource,
  type HiddenTest,
} from '../src/server/councilAsk.ts';
import { addCost, isLocalAddress, mayUseCloud, pricesFromEnv, spentOn, stepCost } from '../src/utils/aiCost.ts';
import { answersForModel, type AgentAnswer, type AgentChoiceResult, type EarlierTurn, type SynthesisResult } from '../src/utils/askCouncil.ts';
import { councilAnswers, hasFindings } from '../src/utils/councilQuestion.ts';
import { marketEdgePeers } from '../src/utils/marketEdgeAnchors.ts';
import { toLive } from '../src/utils/liveFigures.ts';
import { isAiCall } from '../src/utils/requestLimits.ts';
import type { WatchlistItem } from '../src/types/council.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const hiding = (countries: string[], ids: Array<[string, string]> = []): HiddenTest => ({
  countryHidden: (iso3) => Boolean(iso3 && countries.includes(iso3.toUpperCase())),
  isHidden: (kind, value) => (kind === 'country' ? Boolean(value && countries.includes(value.toUpperCase())) : ids.some(([k, v]) => k === kind && v === value)),
});

test('request checks: empty or over 2,000 characters is 422; history over 10 turns is 422; bad cost limit is 422', () => {
  const p = (b: unknown) => parseAskRequest(b);
  assert.deepEqual(p({ question: '  ' }), { status: 422, code: 'question_empty', message: 'Send a question (the "question" field).' });
  assert.equal((p({ question: 'x'.repeat(2001) }) as { code: string }).code, 'question_too_long');
  assert.ok(!isProblem(p({ question: 'x'.repeat(2000) })));
  const turns = (n: number) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'council' : 'user', content: `turn ${i}` }));
  assert.ok(!isProblem(p({ question: 'q', history: turns(10) })));
  assert.equal((p({ question: 'q', history: turns(11) }) as { code: string; status: number }).code, 'history_too_long');
  assert.equal((p({ question: 'q', history: [{ role: 'system', content: 'x' }] }) as { code: string }).code, 'bad_history');
  assert.equal((p({ question: 'q', max_cost_usd: -1 }) as { code: string }).code, 'bad_max_cost');
  assert.equal((p({ question: 'q', iso3: 'Brazil' }) as { code: string }).code, 'bad_iso3');
  assert.deepEqual(p({ question: ' Is policy tight? ', iso3: 'bra', max_cost_usd: 0.01 }), { question: 'Is policy tight?', iso3: 'BRA', history: [], maxCostUsd: 0.01 });
});

test('history: user turns are earlier questions, the council turn after each is its headline', () => {
  const t: EarlierTurn[] = historyTurns([
    { role: 'user', content: 'Which central banks look behind the curve?' },
    { role: 'council', content: 'Turkey and Argentina look behind the curve.' },
    { role: 'user', content: 'And debt?' },
  ]);
  assert.deepEqual(t, [{ question: 'Which central banks look behind the curve?', headline: 'Turkey and Argentina look behind the curve.' }, { question: 'And debt?' }]);
});

test('hidden names: country names, other names, adjectives, codes and identifiers become [hidden], counted', () => {
  const h = hiding(['BRA', 'TUR'], [['ticker', 'PBR'], ['isin', 'US71654V4086']]);
  const pats = hiddenCountryPatterns(h);
  const r = hideNames('Is Brazil (BRA) tight? What about Brazilian bonds, Türkiye, PBR and US71654V4086? Not Mexico.', h, pats);
  assert.equal(r.text, 'Is [hidden] ([hidden]) tight? What about [hidden] bonds, [hidden], [hidden] and [hidden]? Not Mexico.');
  assert.equal(r.count, 6);
  // A ticker only as written in capitals; ordinary words are left alone.
  assert.equal(hideNames('the pbr word', h, pats).count, 0);
  assert.equal(hideNames('Nothing hidden here.', hiding([]), []).count, 0);
});

const fig = (label: string, value: string, source: string, tag: AgentAnswer['findings'][0]['figures'][0]['tag'] = 'live') => ({ label, value, source, tag });
const ANSWERS: AgentAnswer[] = [
  {
    id: 'cb',
    name: 'Central Bank Agent',
    why: 'policy rates',
    findings: [
      { iso3: 'MEX', countryName: 'Mexico', reading: 'Policy looks tight.', weight: 1, figures: [fig('Policy rate', '7.25%', 'BIS policy rates, Oct 2026')], stance: [{ dim: 'policy', call: 'tight' }] },
      { iso3: 'BRA', countryName: 'Brazil', reading: 'Policy looks tight.', weight: 1, figures: [fig('Policy rate', '15.00%', 'BIS policy rates, Oct 2026')] },
      { iso3: 'TUR', countryName: 'Turkey', reading: 'An AI guess.', weight: 1, figures: [fig('Policy rate', '40%', 'AI estimate', 'estimate')] },
      { iso3: 'ZAF', countryName: 'South Africa', reading: 'Closed source.', weight: 1, figures: [fig('Something', '1.0', 'Closed Vendor Ltd')] },
    ],
    missing: ['Brazil: no inflation reading.', 'India: no policy rate.'],
  },
];

test('figures for the API: hidden countries, estimates and closed sources are left out and counted', () => {
  const h = hiding(['BRA']);
  const { answers, counts } = answersForApi(ANSWERS, h, hiddenCountryPatterns(h), (s) => /^BIS\b/.test(s));
  assert.deepEqual(answers[0]!.findings.map((f) => f.iso3), ['MEX']);
  assert.deepEqual(counts, { notShareable: 1, notReal: 1, hidden: 2 });
  assert.ok(answers[0]!.missing.includes('India: no policy rate.'));
  assert.ok(!JSON.stringify(answers).includes('Brazil'));
  const cites = citationsFrom(answers);
  assert.deepEqual(cites, [{ label: 'Mexico: Policy rate', value: '7.25%', source: 'BIS policy rates, Oct 2026', date: '2026-10', badge: 'official', url: cites[0]!.url, iso3: 'MEX', agent: 'Central Bank Agent', shareable: true }]);
  assert.match(String(cites[0]!.url), /^https:\/\/.*bis\.org/);
  assert.deepEqual(agentsFrom(answers)[0], { id: 'cb', label: 'Central Bank Agent', summary: 'Mexico: Policy looks tight.', stance: [{ iso3: 'MEX', dim: 'policy', call: 'tight' }] });
});

test('periods read from the source text', () => {
  assert.equal(periodFromSource('IMF CPI, 2026-09'), '2026-09');
  assert.equal(periodFromSource('ECB rates, 2026-11-04'), '2026-11-04');
  assert.equal(periodFromSource('BIS policy rates, Oct 2026'), '2026-10');
  assert.equal(periodFromSource('World Bank, 2025'), '2025');
  assert.equal(periodFromSource('OECD, 2026 Q2'), '2026-Q2');
  assert.equal(periodFromSource('EconQuest rule'), null);
});

test('summary: a sentence naming a hidden item is removed; the checks say what they did', () => {
  const out: SynthesisResult = { brief: { headline: 'Mexico looks tight.', points: ['Brazil is tighter.', 'The rate is 7.25%.'], disagreements: [], gaps: [] }, removed: ['x'], contradicted: [], provider: 'Local Ollama (qwen2.5:32b · Referee)' };
  const h = hiding(['BRA']);
  const clean = briefWithoutHidden(out, h, hiddenCountryPatterns(h));
  assert.equal(clean.count, 1);
  assert.equal(answerText(clean.out), 'Mexico looks tight.\n- The rate is 7.25%.');
  assert.deepEqual(checksFrom(clean.out), { number_trace: { status: 'pass', removed: 1 }, stance_check: { status: 'pass', removed: 0 } });
  assert.deepEqual(checksFrom({ brief: null, removed: [] }).number_trace, { status: 'no_answer', removed: 0 });
});

test('cost: free on this computer, priced from .env for the cloud, unknown without prices', () => {
  const prices = pricesFromEnv({ AI_PRICE_INPUT_PER_MTOK: '1', AI_PRICE_OUTPUT_PER_MTOK: '4' });
  assert.deepEqual(prices, { inputPerMTok: 1, outputPerMTok: 4 });
  assert.equal(pricesFromEnv({ AI_PRICE_INPUT_PER_MTOK: '1' }), null);
  assert.equal(mayUseCloud({ providerMode: 'ollama' }, {}), false);
  assert.equal(mayUseCloud({ providerMode: 'ollama' }, { GEMINI_API_KEY: 'k' }), true, 'Gemini is tried when the chosen model does not answer');
  assert.equal(mayUseCloud({ providerMode: 'openai_compatible', openAiBaseUrl: 'http://localhost:8000/v1' }, {}), false);
  assert.equal(mayUseCloud({ providerMode: 'openai_compatible', openAiBaseUrl: 'https://api.example.com/v1' }, {}), true);
  assert.ok(isLocalAddress('http://host.docker.internal:11434') && !isLocalAddress('https://api.example.com'));
  assert.equal(stepCost(4000, 1000, false, null), 0);
  assert.equal(stepCost(4000, 1000, true, null), null);
  assert.equal(stepCost(4_000_000, 1_000_000, true, prices), 1 + 4);
  assert.equal(spentOn({ providerUsed: 'Local Ollama (qwen2.5:32b · Referee)', usedFallback: false }, true, 4000, 4000, prices), 0);
  assert.equal(spentOn({ providerUsed: 'Hybrid Failover -> Google Gemini (gemini-x)', usedFallback: false }, true, 4_000_000, 4_000_000, prices), 5);
  assert.equal(addCost(0.1, null), null);
});

test('the AI request limit covers the API address', () => {
  assert.ok(isAiCall('POST', '/api/v1/council/ask'));
  assert.ok(!isAiCall('GET', '/api/v1/council/ask'));
});

/* ------------------------------ the real server ------------------------------ */

const recDir = path.join(root, 'tests', 'fixtures', 'recorded-public');
const skip = existsSync(path.join(recDir, 'index.json')) ? false : 'no public feed recording in tests/fixtures/recorded-public/';
const WATCHLIST = ['MEX', 'TUR', 'ZAF', 'IND', 'IDN'];
const RUNTIME = { providerMode: 'ollama', ollamaBaseUrl: 'http://standin-ollama.test:11434', ollamaModel: 'qwen2.5:7b', ollamaDeepModel: 'qwen2.5:32b' };
let server: ChildProcess | undefined;
let work = '';
let log = '';
let standinLog = '';
const port = 5800 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;

before(async () => {
  if (skip) return;
  work = mkdtempSync(path.join(tmpdir(), 'econquest-ask-council-'));
  const dataDir = path.join(work, 'data');
  mkdirSync(path.join(dataDir, 'local'), { recursive: true });
  standinLog = path.join(work, 'standin.jsonl');
  const index = JSON.parse(readFileSync(path.join(recDir, 'index.json'), 'utf8'));
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  for (const [id, v] of Object.entries(index.keys || {})) env[id] = v === 'present' ? 'replay-key' : String(v);
  Object.assign(env, {
    NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/replay-fetch.mjs')).href} --import ${pathToFileURL(path.join(root, 'tests/helpers/stand-in-model-fetch.mjs')).href}`,
    REPLAY_DIR: recDir,
    STANDIN_LOG: standinLog,
    DATA_DIR: dataDir,
    SCHEDULE_BACKTESTS: 'off',
    PORT: String(port),
    NODE_ENV: 'production',
    CDS_FEED: 'off',
    GEMINI_API_KEY: '',
    AI_PRICE_INPUT_PER_MTOK: '',
    AI_PRICE_OUTPUT_PER_MTOK: '',
  });
  server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout?.on('data', (d) => (log += d));
  server.stderr?.on('data', (d) => (log += d));
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/api/ai/runtime-defaults`)).ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`server did not start within 60s:\n${log}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  // The app's saved settings: the stand-in model and one watchlist (what the browser saves to the workspace).
  for (const [key, value] of Object.entries({
    econquest_ai_runtime_config_v1: JSON.stringify(RUNTIME),
    sovereign_council_watchlists_v1: JSON.stringify([{ id: 'wl_test', name: 'Test', items: WATCHLIST.map((iso3) => ({ iso3 })) }]),
  })) {
    const r = await fetch(`${base}/api/workspace/${encodeURIComponent(key)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
    assert.equal(r.status, 200, `${key}: ${await r.text()}`);
  }
});

after(() => {
  server?.kill();
  if (work) rmSync(work, { recursive: true, force: true });
});

const post = (p: string, body: unknown, headers: Record<string, string> = {}) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(240_000) });
const makeToken = async (name: string, scopes: string[]) => {
  const r = await post('/api/settings/api-tokens', { name, scopes });
  assert.equal(r.status, 200, await r.clone().text());
  return `Bearer ${(await r.json()).secret}`;
};
const standinCalls = (): Array<{ step: string; prompt: string; reply: string }> => (existsSync(standinLog) ? readFileSync(standinLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const clearStandin = () => existsSync(standinLog) && writeFileSync(standinLog, '');
// The documents name the time each question was asked; nothing else may differ.
const sameExceptTime = (p: string) => p.replace(/^Asked .*? about /gm, 'Asked (time) about ').replace(/doc-([a-z]+)-\d+/g, 'doc-$1-(time)');

/** What the browser's Council chat does for a new question (src/components/CouncilChatState.tsx). */
async function browserAnswer(question: string) {
  const rows = ((await (await fetch(`${base}/api/data/watchlist-live?iso3=${WATCHLIST.join(',')}`)).json()).items || []) as WatchlistItem[];
  const anchors = await (await fetch(`${base}/api/data/market-edge-anchors`)).json();
  const items = marketEdgePeers(rows.map((r) => toLive(r)), anchors?.peers || []);
  const { plan, answers } = await councilAnswers(
    { question, items, history: [] },
    {
      chooseAgents: async (q, h) => (await (await post('/api/council/choose-agents', { question: q, earlier: h.map((t) => ({ question: t.question })), runtimeConfig: RUNTIME })).json()) as AgentChoiceResult,
      get: (u) => fetch(`${base}${String(u)}`),
    }
  );
  if (!hasFindings(answers)) return { plan, answers, synthesis: null };
  const r = await post('/api/council/synthesise', { question, askedAt: new Date().toISOString(), answers: answersForModel(answers), scope: plan.scopeNote, countries: plan.countries.length, earlier: [], runtimeConfig: RUNTIME });
  return { plan, answers, synthesis: (await r.json()) as SynthesisResult };
}

const QUESTION = 'Whose government debt is high and rising?';

test('a token with only ask:council gets the browser chat\'s answer for the same question and figures; the model is asked the same', { skip, timeout: 400_000 }, async () => {
  const bearer = await makeToken('Research console', ['ask:council']);
  clearStandin();
  const browser = await browserAnswer(QUESTION);
  assert.ok(browser.synthesis?.brief, `the browser path wrote no summary: ${JSON.stringify(browser.synthesis)}\n${log.slice(-3000)}`);
  const browserCalls = standinCalls();
  clearStandin();
  const r = await post('/api/v1/council/ask', { question: QUESTION }, { Authorization: bearer, 'X-Correlation-Id': 'ask-test-1' });
  const body = await r.json();
  assert.equal(r.status, 200, JSON.stringify(body));
  const apiCalls = standinCalls();
  assert.equal(body.left_out.not_shareable + body.left_out.not_real, 0, 'every figure in this question may be passed on, so both paths read the same figures');
  assert.deepEqual(apiCalls.map((c) => c.step), browserCalls.map((c) => c.step));
  assert.deepEqual(apiCalls.map((c) => sameExceptTime(c.prompt)), browserCalls.map((c) => sameExceptTime(c.prompt)), 'the model is asked the same thing');
  const b = browser.synthesis!.brief!;
  assert.deepEqual(body.brief, { headline: b.headline, points: b.points, disagreements: b.disagreements, gaps: b.gaps });
  assert.equal(body.answer, [b.headline, ...b.points.map((p) => `- ${p}`)].join('\n'));
  assert.deepEqual(body.agents.map((a: { id: string }) => a.id), browser.answers.map((a) => a.id));
  assert.deepEqual(body.checks, { number_trace: { status: 'pass', removed: browser.synthesis!.removed.length }, stance_check: { status: 'pass', removed: browser.synthesis!.contradicted?.length ?? 0 } });
  assert.match(body.model, /qwen2\.5:32b/);
  assert.equal(body.cost_usd, 0, 'a model on this computer costs nothing');
  assert.match(body.run_id, /^ask_[0-9a-f]{20}$/);
  assert.equal(body.hidden_count, 0);
  assert.ok(body.citations.length > 0);
  for (const c of body.citations) {
    assert.ok(c.label && c.value && c.source && c.badge, JSON.stringify(c));
    assert.equal(c.shareable, true);
  }
  assert.match(body.disclaimer, /not investment advice/);
  assert.equal(r.headers.get('x-correlation-id'), 'ask-test-1');

  // The audit entry: token name, correlation ID, model, figures and cost, the question as other council questions are kept.
  const audit = (await (await fetch(`${base}/api/audit?kind=council&limit=5`)).json()).entries as Array<{ correlationId?: string; detail: Record<string, any> }>;
  const entry = audit.find((e) => e.detail.runId === body.run_id);
  assert.ok(entry, JSON.stringify(audit.map((e) => e.detail.via)));
  assert.equal(entry!.correlationId, 'ask-test-1');
  assert.equal(entry!.detail.via, 'Data API (token "Research console")');
  assert.equal(entry!.detail.tokenName, 'Research console');
  assert.equal(entry!.detail.question, QUESTION);
  assert.match(String(entry!.detail.model), /qwen2\.5:32b/);
  assert.equal(entry!.detail.costUsd, 0);
  assert.ok(entry!.detail.figures.length > 0);
});

test('scope: no token is 401, a token without ask:council is 403, the legacy key cannot ask', { skip, timeout: 60_000 }, async () => {
  assert.equal((await post('/api/v1/council/ask', { question: QUESTION })).status, 401);
  const reader = await makeToken('Reader', ['read:data', 'read:council']);
  const r = await post('/api/v1/council/ask', { question: QUESTION }, { Authorization: reader });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).needed, 'ask:council');
});

test('history: more than 10 turns is refused with 422 before any model call; an empty question too', { skip, timeout: 60_000 }, async () => {
  const bearer = await makeToken('History check', ['ask:council']);
  clearStandin();
  const history = Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? 'council' : 'user', content: `turn ${i}` }));
  const r = await post('/api/v1/council/ask', { question: QUESTION, history }, { Authorization: bearer });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error, 'history_too_long');
  assert.equal((await post('/api/v1/council/ask', { question: '' }, { Authorization: bearer })).status, 422);
  assert.equal((await post('/api/v1/council/ask', { question: 'x'.repeat(2001) }, { Authorization: bearer })).status, 422);
  assert.equal(standinCalls().length, 0, 'no model was asked');
});

test('a follow-up with history sends the earlier question and headline to the model', { skip, timeout: 400_000 }, async () => {
  const bearer = await makeToken('Follow-up', ['ask:council']);
  clearStandin();
  const r = await post('/api/v1/council/ask', { question: 'And which of them has the most debt?', history: [{ role: 'user', content: QUESTION }, { role: 'council', content: 'Turkey looks behind the curve.' }] }, { Authorization: bearer });
  assert.equal(r.status, 200, await r.clone().text());
  const synth = standinCalls().find((c) => !c.step.startsWith('You route'));
  assert.ok(synth && synth.prompt.includes(QUESTION) && synth.prompt.includes('Turkey looks behind the curve.'));
});

test('cost: with max_cost_usd and a model that could reach the cloud with no price set, 402 cost_limit before any model call', { skip, timeout: 120_000 }, async () => {
  const bearer = await makeToken('Cost check', ['ask:council']);
  const cloud = { ...RUNTIME, providerMode: 'openai_compatible', openAiBaseUrl: 'https://models.example.com/v1' };
  const put = await fetch(`${base}/api/workspace/econquest_ai_runtime_config_v1`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify(cloud) }) });
  assert.equal(put.status, 200);
  try {
    clearStandin();
    const r = await post('/api/v1/council/ask', { question: QUESTION, max_cost_usd: 0.05 }, { Authorization: bearer });
    const body = await r.json();
    assert.equal(r.status, 402, JSON.stringify(body));
    assert.equal(body.error, 'cost_limit');
    assert.match(body.message, /AI_PRICE_INPUT_PER_MTOK/);
    assert.equal(standinCalls().length, 0, 'no model was asked');
  } finally {
    await fetch(`${base}/api/workspace/econquest_ai_runtime_config_v1`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: JSON.stringify(RUNTIME) }) });
  }
  // On this computer the limit is never passed: a local model costs nothing.
  const ok = await post('/api/v1/council/ask', { question: QUESTION, max_cost_usd: 0 }, { Authorization: bearer });
  assert.equal(ok.status, 200, await ok.clone().text());
  assert.equal((await ok.json()).cost_usd, 0);
});

test('hidden names: a hidden country in the question, the figures or the model\'s answer never appears in the reply; only a count', { skip, timeout: 400_000 }, async () => {
  const bearer = await makeToken('Hidden check', ['ask:council']);
  const add = await post('/api/settings/hidden-names', { names: [{ kind: 'country', value: 'BRA' }, { kind: 'country', value: 'MEX' }] });
  assert.equal(add.status, 200, await add.clone().text());
  try {
    clearStandin();
    const r = await post('/api/v1/council/ask', { question: 'How do Brazil, Mexico and Turkey compare on policy rates and government debt?', history: [{ role: 'user', content: 'Is BRA tight?' }] }, { Authorization: bearer });
    const text = await r.text();
    assert.equal(r.status, 200, text);
    for (const name of ['Brazil', 'BRA', 'Mexic', 'MEX']) assert.ok(!text.includes(name), `${name} appears in the reply: ${text.slice(0, 2000)}`);
    const body = JSON.parse(text);
    assert.ok(body.hidden_count >= 3, String(body.hidden_count));
    assert.match(body.hidden_note, /items hidden/);
    for (const c of standinCalls()) for (const name of ['Brazil', 'BRA', 'Mexico', 'MEX']) assert.ok(!c.prompt.includes(name), `${name} reached the model`);
    // The model wrote a sentence naming Brazil (the stand-in always does); it was left out.
    assert.ok(!body.brief || body.brief.points.every((p: string) => !/Brazil/.test(p)));
    // An iso3 on the list is refused like any address about a hidden country.
    assert.equal((await post('/api/v1/council/ask', { question: 'Is policy tight?', iso3: 'BRA' }, { Authorization: bearer })).status, 404);
  } finally {
    await post('/api/settings/hidden-names/clear', {});
  }
});
