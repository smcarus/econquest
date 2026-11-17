/**
 * One Council chat question, from plan to the agents' answers: the steps the browser's Council chat
 * runs (src/components/CouncilChatState.tsx) and the data API runs for a token with the ask:council
 * scope (POST /api/v1/council/ask). One path for both, so an outside system gets the same answer
 * the chat gives for the same question and figures. The AI agent choice and the app's own reads
 * are handed in, because the browser calls them over HTTP and the server calls them directly.
 *
 * Browser-safe.
 */
import { AGENT_ORDER, applyAgentChoice, chartAnswer, COUNCIL_AGENTS, countriesInQuestion, planCouncil, planFollowUp, runCouncil, type AgentAnswer, type AgentChoiceResult, type CouncilPlan, type EarlierTurn } from './askCouncil';
import { quantReason } from './quantDeskInfo';
import { computeChart, fetchChartSeries } from './councilChart';
import { withExplainAgents, type ExplainFocus } from './explain';
import { asksForecast, forecastAnswer, type CountryModels } from './forecastAgent';
import type { PolicyDoc } from './policyDocs';
import type { ScenarioCountryData } from './scenarioAgent';
import { scenarioQuery, type ScenarioQuestion } from './scenarioQuestion';
import type { LiveWatchlistItem } from '../types/council';

export const NO_FIGURES_REASON = 'The agents found no figures to answer with, so there is nothing to summarise.';

export interface QuestionSteps {
  /** The AI step that picks the agents (POST /api/council/choose-agents); null when no model answered. */
  chooseAgents: (question: string, history: EarlierTurn[], opts?: { quant?: boolean }) => Promise<AgentChoiceResult | null>;
  /** A GET on the app's own addresses (/api/series/..., /api/nowcast/..., /api/forecast/...). */
  get: typeof fetch;
  /**
   * The Quant desk (outside research tools, src/utils/quantDesk.ts). Only the browser's Council chat
   * passes it, so scheduled runs, briefs and the data API never call the research tools.
   */
  quant?: {
    /** Whether the research tools are set up (GET /api/research-tools/status). */
    enabled: () => Promise<boolean>;
    /** Runs the desk on the server (POST /api/council/quant); null when the app server did not answer. */
    run: (req: QuantRequest) => Promise<AgentAnswer | null>;
  };
}

/** What the browser sends the server for the Quant desk. */
export interface QuantRequest {
  question: string;
  why: string;
  /** The question's id, sent to the research tools server as X-Correlation-Id. */
  questionId?: string;
  /** Countries named in the question or picked in the box (their currencies give FX pairs). */
  countries: Array<{ iso3: string; countryName: string; currencyCode?: string }>;
  /** Currency codes of the countries in the pool, so a code in the question is recognised. */
  currencies: string[];
}

export interface QuestionInput {
  question: string;
  /** The countries the agents may answer on, with their live figures. */
  items: LiveWatchlistItem[];
  /** Earlier turns of this conversation, oldest first (sent to the AI steps). */
  history: EarlierTurn[];
  /** The previous question's plan, for a follow-up: it keeps that question's countries and agents unless others are named. */
  previous?: CouncilPlan;
  /** One country picked for the question (the chat's scope picker, or iso3 in the API). */
  scopeIso3?: string;
  focus?: ExplainFocus;
  docs?: PolicyDoc[];
  now?: Date;
  /** The question's id (Council chat), sent to the research tools server so the audit entries can be joined. */
  questionId?: string;
}

/** The app's nowcast and forecast for each country (src/utils/forecastAgent.ts); a failed call reads Missing. */
export async function fetchCountryModels(countries: Array<{ iso3: string; countryName: string }>, get: typeof fetch): Promise<CountryModels[]> {
  const one = (u: string) =>
    get(u)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  return Promise.all(countries.map(async (c) => ({ iso3: c.iso3, countryName: c.countryName, nowcast: await one(`/api/nowcast/${encodeURIComponent(c.iso3)}`), forecast: await one(`/api/forecast/${encodeURIComponent(c.iso3)}`) })));
}

/** The Scenario Agent's server pieces for each country (GET /api/council/scenario); a failed call leaves the country to read Missing. */
export async function fetchScenarioData(sq: ScenarioQuestion, countries: Array<{ iso3: string }>, get: typeof fetch): Promise<ScenarioCountryData[]> {
  const q = scenarioQuery(sq);
  const one = (iso3: string) =>
    get(`/api/council/scenario/${encodeURIComponent(iso3)}?shocks=${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<ScenarioCountryData>) : null))
      .catch(() => null);
  return (await Promise.all(countries.map((c) => one(c.iso3)))).filter((d): d is ScenarioCountryData => d !== null);
}

/** Countries the Scenario Agent runs for: the first four in the plan. */
export const SCENARIO_MAX_COUNTRIES = 4;

/**
 * Plans the question, asks the AI model which agents answer, runs the desk agents on the app's own
 * figures, and adds the Chart Agent and Nowcast & Forecast when the question asks for them.
 */
export async function councilAnswers(input: QuestionInput, steps: QuestionSteps): Promise<{ plan: CouncilPlan; answers: AgentAnswer[] }> {
  const { question: text, items } = input;
  const wordPlan = input.previous ? planFollowUp(text, input.previous, items, input.scopeIso3) : planCouncil(text, items, input.scopeIso3);
  // The Quant desk is offered to the AI model, and planned, only when the research tools are set up.
  const quantOn = steps.quant ? await steps.quant.enabled().catch(() => false) : false;
  const choice = quantOn ? await steps.chooseAgents(text, input.history, { quant: true }) : await steps.chooseAgents(text, input.history);
  // Explain questions ("why…", "what does it mean for…") also bring the agents for each lens.
  const planned = withExplainAgents(applyAgentChoice(wordPlan, choice, quantOn ? ['quant'] : []), text, input.focus);
  const namesOtherTopic = AGENT_ORDER.some((id) => COUNCIL_AGENTS[id].topic.test(text));
  const quantWhy = quantOn ? quantReason(text, choice, input.previous, namesOtherTopic) : null;
  // A question only for the Quant desk ("backtest momentum on $SPY since 2015") does not bring every desk agent.
  const onlyQuant = Boolean(quantWhy) && planned.agents.length > 0 && planned.agents.every((a) => a.why.startsWith('no specific topic'));
  const plan: CouncilPlan = quantWhy ? { ...planned, ...(onlyQuant ? { agents: [] } : {}), quant: { why: quantWhy } } : planned;
  const desk = runCouncil(text, plan, items, input.now ?? new Date(), input.docs ?? []);
  // The Chart Agent: fetch the series the question names from the app's own history, draw, test.
  const charted = plan.chart ? [chartAnswer(plan.chart, computeChart(plan.chart, await fetchChartSeries(plan.chart, steps.get))), ...desk] : desk;
  // Nowcast & Forecast: the app's own estimates join when the question asks about the path ahead.
  const forecasted = asksForecast(text) && plan.countries.length ? [...charted, forecastAnswer(await fetchCountryModels(plan.countries.slice(0, 4), steps.get))] : charted;
  // Scenario Agent (WI2): a what-if's stated shocks applied to today's figures.
  const sq = plan.scenario;
  const scenarioCountries = plan.countries.slice(0, SCENARIO_MAX_COUNTRIES);
  // Loaded only for a what-if, so the start-up bundle does not carry it.
  const withScenario =
    sq?.shocks.length && scenarioCountries.length
      ? [(await import('./scenarioAgent')).scenarioAnswer(sq, scenarioCountries, await fetchScenarioData(sq, scenarioCountries, steps.get)), ...forecasted]
      : forecasted;
  // Quant desk: the outside research tools. First in the list, so the summary step's limit on answers never drops it.
  const answers = plan.quant && steps.quant ? [await quantDeskAnswer(input, plan, steps.quant), ...withScenario] : withScenario;
  return { plan, answers };
}

/** True when at least one agent found figures, so the synthesis agent has something to summarise. */
export function hasFindings(answers: AgentAnswer[]): boolean {
  return answers.some((a) => a.findings.length);
}

/** Runs the Quant desk; when the app server does not answer, the desk reads "Research tools unavailable". */
async function quantDeskAnswer(input: QuestionInput, plan: CouncilPlan, quant: NonNullable<QuestionSteps['quant']>): Promise<AgentAnswer> {
  const why = plan.quant!.why;
  const picked = input.scopeIso3 ? input.items.filter((i) => i.iso3 === input.scopeIso3) : countriesInQuestion(input.question, input.items);
  const req: QuantRequest = {
    question: input.question,
    why,
    ...(input.questionId ? { questionId: input.questionId } : {}),
    countries: picked.slice(0, 4).map((c) => ({ iso3: c.iso3, countryName: c.countryName, ...(c.currencyCode ? { currencyCode: c.currencyCode } : {}) })),
    currencies: [...new Set(input.items.map((i) => i.currencyCode).filter((c): c is string => Boolean(c)))],
  };
  const answer = await quant.run(req).catch(() => null);
  return answer ?? { id: 'quant', name: 'Quant desk', why, findings: [], missing: ['Research tools unavailable: the app server did not answer'] };
}
