/**
 * One Council chat question, from plan to the agents' answers: the steps the browser's Council chat
 * runs (src/components/CouncilChatState.tsx) and the data API runs for a token with the ask:council
 * scope (POST /api/v1/council/ask). One path for both, so an outside system gets the same answer
 * the chat gives for the same question and figures. The AI agent choice and the app's own reads
 * are handed in, because the browser calls them over HTTP and the server calls them directly.
 *
 * Browser-safe.
 */
import { applyAgentChoice, chartAnswer, planCouncil, planFollowUp, runCouncil, type AgentAnswer, type AgentChoiceResult, type CouncilPlan, type EarlierTurn } from './askCouncil';
import { computeChart, fetchChartSeries } from './councilChart';
import { withExplainAgents, type ExplainFocus } from './explain';
import { asksForecast, forecastAnswer, type CountryModels } from './forecastAgent';
import type { PolicyDoc } from './policyDocs';
import type { LiveWatchlistItem } from '../types/council';

export const NO_FIGURES_REASON = 'The agents found no figures to answer with, so there is nothing to summarise.';

export interface QuestionSteps {
  /** The AI step that picks the agents (POST /api/council/choose-agents); null when no model answered. */
  chooseAgents: (question: string, history: EarlierTurn[]) => Promise<AgentChoiceResult | null>;
  /** A GET on the app's own addresses (/api/series/..., /api/nowcast/..., /api/forecast/...). */
  get: typeof fetch;
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
}

/** The app's nowcast and forecast for each country (src/utils/forecastAgent.ts); a failed call reads Missing. */
export async function fetchCountryModels(countries: Array<{ iso3: string; countryName: string }>, get: typeof fetch): Promise<CountryModels[]> {
  const one = (u: string) =>
    get(u)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  return Promise.all(countries.map(async (c) => ({ iso3: c.iso3, countryName: c.countryName, nowcast: await one(`/api/nowcast/${encodeURIComponent(c.iso3)}`), forecast: await one(`/api/forecast/${encodeURIComponent(c.iso3)}`) })));
}

/**
 * Plans the question, asks the AI model which agents answer, runs the desk agents on the app's own
 * figures, and adds the Chart Agent and Nowcast & Forecast when the question asks for them.
 */
export async function councilAnswers(input: QuestionInput, steps: QuestionSteps): Promise<{ plan: CouncilPlan; answers: AgentAnswer[] }> {
  const { question: text, items } = input;
  const wordPlan = input.previous ? planFollowUp(text, input.previous, items, input.scopeIso3) : planCouncil(text, items, input.scopeIso3);
  // Explain questions ("why…", "what does it mean for…") also bring the agents for each lens.
  const plan = withExplainAgents(applyAgentChoice(wordPlan, await steps.chooseAgents(text, input.history)), text, input.focus);
  const desk = runCouncil(text, plan, items, input.now ?? new Date(), input.docs ?? []);
  // The Chart Agent: fetch the series the question names from the app's own history, draw, test.
  const charted = plan.chart ? [chartAnswer(plan.chart, computeChart(plan.chart, await fetchChartSeries(plan.chart, steps.get))), ...desk] : desk;
  // Nowcast & Forecast: the app's own estimates join when the question asks about the path ahead.
  const answers = asksForecast(text) && plan.countries.length ? [...charted, forecastAnswer(await fetchCountryModels(plan.countries.slice(0, 4), steps.get))] : charted;
  return { plan, answers };
}

/** True when at least one agent found figures, so the synthesis agent has something to summarise. */
export function hasFindings(answers: AgentAnswer[]): boolean {
  return answers.some((a) => a.findings.length);
}
