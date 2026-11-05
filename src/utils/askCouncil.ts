/**
 * Ask the council: a question goes to the desk agents that cover it, each answers only from the
 * figures the app already holds, and a synthesis agent may then write a short brief from those
 * answers alone.
 *
 * - The AI model picks the agents when one is set up (applyAgentChoice); otherwise stated keyword
 *   rules do. Either way the reason each agent was asked is shown.
 * - Agents are deterministic: every figure keeps its source and its tag (Live data, Official,
 *   AI estimate, Sample data, or the agent's own model reading).
 * - The synthesis (server side, Gemini or Ollama) is checked here: any sentence with a number
 *   that does not trace back to an agent's figures is removed and listed.
 */
import type { LiveWatchlistItem } from '../types/council';
import { upcomingOfficialEvents, dateKindLabel } from '../data/officialCalendar';
import { INFLATION_TARGETS, cdsVsPeers, fitCdsOnRisk, policyStance, targetSource } from './marketsMacro';
import { missingReason } from './liveFigures';
import { carrySignal, cdsSignals, cdsTag, cpiTag, fxValueSignal, policySignal, policyTag, yieldTag, type Quality } from './divergences';
import { carryToVol, reerLabel } from './fxValuation';
import { SCENARIOS, scenarioImpact, type ScenarioId } from './scenarioExposure';
import { formatPeriod } from './officialYields';
import { contradiction, DIM_LABEL, policyCall, type Contradiction, type Stance } from './stanceCheck';
import { searchDocs, type PolicyDoc } from './policyDocs';
import type { DebateResult } from './agentDebate';

/** Desk agents the planner (or the AI model) can pick. */
export type CoreAgentId = 'cb' | 'rv' | 'fx' | 'spill' | 'calendar';
/** 'doc' = the Policy Document Agent, asked whenever you have added documents. */
export type AgentId = CoreAgentId | 'doc';
export type FigureTag = Quality | 'official' | 'model' | 'document';

export interface AgentFigure {
  label: string;
  value: string;
  source: string;
  tag: FigureTag;
}

export interface AgentFinding {
  iso3: string;
  countryName: string;
  /** One or two sentences, built from the figures below by stated rules. */
  reading: string;
  figures: AgentFigure[];
  /** How notable the reading is, 0 to 1, used to keep the strongest when many countries answer. */
  weight: number;
  /** The agent's call in fixed words (tight / neutral / loose, cheap / rich, strong / weak); the summary may not contradict it. */
  stance?: Stance[];
}

export interface AgentAnswer {
  id: AgentId;
  name: string;
  /** Why the planner asked this agent. */
  why: string;
  findings: AgentFinding[];
  /** What the agent could not answer, in words. */
  missing: string[];
}

export const COUNCIL_AGENTS: Record<CoreAgentId, { name: string; covers: string; topic: RegExp }> = {
  cb: {
    name: 'Central Bank Watcher',
    covers: 'inflation against target, policy rate, real rates',
    topic: /central bank|monetary|policy rate|interest rate|(?<!exchange )\brates?\b|inflation|\bcpi\b|hike|\bcuts?\b|easing|tightening|behind the curve|real rate|real yield|target/i,
  },
  rv: {
    name: 'Relative Value',
    covers: 'CDS against risk peers, carry over the US rate',
    topic: /\bcds\b|spread|cheap|rich|\bvalue\b|valuation|bonds?|yields?|carry|priced|pricing|relative|default|credit/i,
  },
  fx: {
    name: 'FX Valuation',
    covers: 'real exchange rate against its 10-year average, FX volatility',
    topic: /\bfx\b|currenc|exchange rate|\breer\b|lira|rand|peso|rupiah|zloty|pound|sterling|\byen\b|devalu|deprecia|apprecia|volatil/i,
  },
  spill: {
    name: 'Global Spillover',
    covers: 'Hormuz, Taiwan Strait and Russia shocks through trade',
    topic: /hormuz|taiwan|china|russia|ukrain|\boil\b|energy|gulf|iran|shock|spillover|scenario|trade|\bwar\b|sanction|conflict|geopolit/i,
  },
  calendar: {
    name: 'Calendar',
    covers: 'rate decisions, CPI releases, elections, budget deadlines, IMF dates',
    topic: /\bwhen\b|\bnext\b|calendar|election|budget|\bimf\b|\bdates?\b|upcoming|meeting|decision|catalyst|deadline|this (?:week|month|year)|coming/i,
  },
};

export const AGENT_ORDER: CoreAgentId[] = ['cb', 'rv', 'fx', 'spill', 'calendar'];
export const TAG_LABEL: Record<Exclude<FigureTag, 'model'>, string> = {
  live: 'Live data',
  official: 'Official',
  estimate: 'AI estimate',
  sample: 'Sample data',
  document: 'Your document',
};
export const tagLabel = (tag: FigureTag, agent: string) => (tag === 'model' ? `${agent} Agent` : TAG_LABEL[tag]);

/** Other names people use for countries on the watchlists. */
const ALIASES: Record<string, string[]> = {
  TUR: ['turkiye', 'türkiye'],
  GBR: ['uk', 'britain', 'united kingdom'],
  ZAF: ['south africa', 'sa'],
  USA: ['us', 'united states', 'america'],
};

const baseName = (n: string) => n.replace(/\s*\(.*\)\s*$/, '').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface CouncilPlan {
  countries: LiveWatchlistItem[];
  /** How the countries were picked, in words. */
  scopeNote: string;
  agents: Array<{ id: CoreAgentId; why: string }>;
  /** Who picked the agents: the AI model, or word matching in the question (the default). */
  chosenBy?: 'ai' | 'words';
  /** Why word matching was used when the AI was asked, or which model picked. */
  chooserNote?: string;
}

/** Countries named in the question (by name, ISO code or a common alias). */
export function countriesInQuestion(question: string, items: LiveWatchlistItem[]): LiveWatchlistItem[] {
  return items.filter((it) => {
    const names = [baseName(it.countryName), ...(ALIASES[it.iso3] || [])];
    if (names.some((n) => new RegExp(`(^|[^\\p{L}])${escapeRe(n)}($|[^\\p{L}])`, 'iu').test(question))) return true;
    return new RegExp(`\\b${it.iso3}\\b`).test(question);
  });
}

/** Which agents answer and for which countries. `scopeIso3` = a country picked in the box, overriding the question. */
export function planCouncil(question: string, items: LiveWatchlistItem[], scopeIso3?: string): CouncilPlan {
  const picked = scopeIso3 ? items.filter((i) => i.iso3 === scopeIso3) : [];
  const named = picked.length ? [] : countriesInQuestion(question, items);
  const countries = picked.length ? picked : named.length ? named : items;
  const scopeNote = picked.length
    ? `${picked[0].countryName}, picked in the box`
    : named.length
      ? `${named.map((n) => baseName(n.countryName)).join(', ')}, named in the question`
      : `the whole watchlist (${items.length} countries), as no country was named`;

  const agents: CouncilPlan['agents'] = [];
  for (const id of AGENT_ORDER) {
    const m = question.match(COUNCIL_AGENTS[id].topic);
    if (m) agents.push({ id, why: `the question mentions "${m[0].trim()}"` });
  }
  if (!agents.length) {
    for (const id of AGENT_ORDER) agents.push({ id, why: 'no specific topic in the question, so every agent answers' });
  }
  return { countries, scopeNote, agents };
}

/* ------------------------------------------------------------------------------------------
 * Follow-up questions (Sam, 2026-11-05). A follow-up keeps the last question's countries when it
 * names none, and the last question's agents when it names no topic, so "and the currency?" or
 * "what about Egypt?" mean what they would in conversation.
 * ------------------------------------------------------------------------------------------ */

export const CARRIED = 'carried over from your last question';

export function planFollowUp(question: string, prev: CouncilPlan, items: LiveWatchlistItem[], scopeIso3?: string): CouncilPlan {
  const plan = planCouncil(question, items, scopeIso3);
  const namesCountry = Boolean(scopeIso3) || countriesInQuestion(question, items).length > 0;
  const namesTopic = AGENT_ORDER.some((id) => COUNCIL_AGENTS[id].topic.test(question));
  return {
    countries: namesCountry ? plan.countries : prev.countries,
    scopeNote: namesCountry ? plan.scopeNote : `${prev.scopeNote}, ${CARRIED}`,
    agents: namesTopic ? plan.agents : prev.agents.map((a) => ({ id: a.id, why: `${CARRIED} (${a.why})` })),
  };
}

/** Questions for the agents not yet asked, about the same countries. */
const FOLLOW_UP: Record<CoreAgentId, string> = {
  cb: 'How does inflation compare with the policy rate?',
  rv: 'Is CDS cheap or rich against peers?',
  fx: 'Is the currency strong or weak for its history?',
  spill: 'How exposed are they to a Hormuz closure?',
  calendar: 'What dates are coming up?',
};

export function suggestFollowUps(plan: CouncilPlan, answers: AgentAnswer[]): string[] {
  const asked = new Set(plan.agents.map((a) => a.id));
  const out = AGENT_ORDER.filter((id) => !asked.has(id)).map((id) => FOLLOW_UP[id]);
  // When one country stands out, offer to look at it alone.
  const top = answers.flatMap((a) => a.findings).filter((f) => !isDocFinding(f)).sort((x, y) => y.weight - x.weight)[0];
  if (top && plan.countries.length > 1 && top.weight > 0) out.unshift(`What about ${baseName(top.countryName)} on its own?`);
  return out.slice(0, 3);
}

/** Earlier turns, for the synthesis prompt: the question and the summary's headline only. */
export interface EarlierTurn {
  question: string;
  headline?: string;
}

export function earlierAsText(earlier: EarlierTurn[]): string {
  if (!earlier.length) return '';
  return [
    'Earlier in this conversation (context only; every number you write must still come from the findings below):',
    ...earlier.slice(-4).map((t) => `- Q: ${t.question.slice(0, 300)}${t.headline ? ` A: ${t.headline.slice(0, 300)}` : ''}`),
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------------------------------
 * AI-chosen agents (Sam, 2026-11-05). The AI model reads the question and picks which agents
 * answer, with a reason for each. It only picks agents: countries still come from the question
 * or the box, and the agents still answer from app data. If no model answers, or it names no
 * valid agent, word matching decides as before and the panel says so.
 * ------------------------------------------------------------------------------------------ */

export const AGENT_CHOICE_INSTRUCTION = [
  'You route a policy research question to the agents best placed to answer it.',
  'Pick only from the agents listed, by id. Pick the fewest that cover the question, usually one to three.',
  'Give each a short reason in plain words (under 20 words) that names what in the question it answers.',
  'Do not answer the question and do not write any numbers.',
].join(' ');

export function agentChoicePrompt(question: string, earlier: EarlierTurn[] = []): string {
  return [
    'Agents:',
    ...AGENT_ORDER.map((id) => `- ${id}: ${COUNCIL_AGENTS[id].name} Agent, covers ${COUNCIL_AGENTS[id].covers}`),
    '',
    ...(earlier.length ? ['Earlier questions in this conversation:', ...earlier.slice(-4).map((t) => `- ${t.question.slice(0, 300)}`), ''] : []),
    `Question: ${question.slice(0, 500)}`,
  ].join('\n');
}

export interface AgentChoiceResult {
  /** The model's picks, unchecked; null when no model answered. */
  agents: Array<{ id: string; why: string }> | null;
  provider?: string;
  reason?: string;
}

/** Use the model's picks when at least one names a real agent; otherwise keep the word-matched plan. */
export function applyAgentChoice(plan: CouncilPlan, choice: AgentChoiceResult | null): CouncilPlan {
  const seen = new Set<CoreAgentId>();
  const picked: CouncilPlan['agents'] = [];
  for (const a of choice?.agents || []) {
    const id = String(a?.id || '').trim().toLowerCase() as CoreAgentId;
    if (!AGENT_ORDER.includes(id) || seen.has(id)) continue;
    seen.add(id);
    const why = String(a?.why || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim().slice(0, 200);
    picked.push({ id, why: why ? `the AI model judged: ${why}` : 'the AI model picked it' });
  }
  if (picked.length) {
    picked.sort((x, y) => AGENT_ORDER.indexOf(x.id) - AGENT_ORDER.indexOf(y.id));
    return { ...plan, agents: picked, chosenBy: 'ai', chooserNote: `Agents picked by the AI model${choice?.provider ? ` (${choice.provider})` : ''}.` };
  }
  const why = choice?.agents ? 'the AI model named no agent on the list' : choice?.reason || 'no AI model answered';
  return { ...plan, chosenBy: 'words', chooserNote: `Agents picked by matching words in the question, as ${why}.` };
}

/* ------------------------------------------------------------------------------------------ */

const p1 = (v: number) => `${v.toFixed(1)}%`;
const p2 = (v: number) => `${v.toFixed(2)}%`;
const sgn = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;
const MAX_FINDINGS = 6;

function cbAgent(countries: LiveWatchlistItem[]): Omit<AgentAnswer, 'why'> {
  const findings: AgentFinding[] = [];
  const missing: string[] = [];
  for (const it of countries) {
    if (it.cpiInflationPct === undefined || it.policyRatePct === undefined) {
      const why = [
        it.cpiInflationPct === undefined ? `inflation (${missingReason('cpi', it.iso3).short})` : '',
        it.policyRatePct === undefined ? `policy rate (${missingReason('policy', it.iso3).short})` : '',
      ].filter(Boolean);
      missing.push(`${it.countryName}: missing ${why.join(' and ')}`);
      continue;
    }
    const c = cpiTag(it);
    const pr = policyTag(it);
    const t = INFLATION_TARGETS[it.iso3];
    const gap = t ? it.cpiInflationPct - t.pct : undefined;
    const real = it.policyRatePct - it.cpiInflationPct;
    const real10 = it.yield10YPct !== undefined ? it.yield10YPct - it.cpiInflationPct : undefined;
    const sig = policySignal(it);
    const y = yieldTag(it);
    const figures: AgentFigure[] = [
      { label: 'CPI inflation', value: p1(it.cpiInflationPct), source: c.src, tag: c.q },
      t
        ? { label: 'Inflation target', value: `${p1(t.pct)}${t.bandPts ? ` ± ${t.bandPts}` : ''}`, source: targetSource(t), tag: 'official' }
        : { label: 'Inflation target', value: 'not on file', source: 'central bank page not reachable', tag: 'sample' },
      { label: 'Policy rate', value: p2(it.policyRatePct), source: pr.src, tag: pr.q },
      { label: 'Real policy rate', value: p1(real), source: 'policy rate minus inflation', tag: 'model' },
      ...(real10 !== undefined && it.yield10YPct !== undefined
        ? [{ label: 'Real 10Y yield', value: p1(real10), source: `10Y yield ${p2(it.yield10YPct)} (${y.src}) minus inflation`, tag: 'model' as const }]
        : []),
    ];
    const stanceText = policyStance(real, gap);
    findings.push({
      iso3: it.iso3,
      countryName: it.countryName,
      reading: `Policy looks ${stanceText}.${sig ? ` ${sig.label}: ${sig.soWhat}` : ''}`,
      figures,
      weight: sig?.score ?? 0,
      stance: [{ dim: 'policy', call: policyCall(stanceText) }],
    });
  }
  return { id: 'cb', name: COUNCIL_AGENTS.cb.name, findings, missing };
}

function rvAgent(countries: LiveWatchlistItem[], all: LiveWatchlistItem[]): Omit<AgentAnswer, 'why'> {
  const fit = fitCdsOnRisk(all);
  const cdsSig = cdsSignals(all);
  const findings: AgentFinding[] = [];
  const missing: string[] = fit ? [] : ['CDS against peers needs 4 or more countries with a CDS figure on the watchlist'];
  for (const it of countries) {
    const c = cdsTag(it);
    const y = yieldTag(it);
    const figures: AgentFigure[] = [];
    if (it.yield10YPct !== undefined) figures.push({ label: '10Y government yield', value: p2(it.yield10YPct), source: y.src, tag: y.q });
    else missing.push(`${it.countryName}: 10Y yield missing (${missingReason('yield', it.iso3).short})`);
    if (it.cds5YBps !== undefined) figures.push({ label: '5Y CDS', value: `${Math.round(it.cds5YBps)} bps`, source: c.src, tag: c.q });
    else missing.push(`${it.countryName}: 5Y CDS missing (${missingReason('cds', it.iso3).short})`);
    const parts: string[] = [];
    const stance: Stance[] = [];
    if (fit && it.cds5YBps !== undefined && it.compositeRisk !== undefined) {
      const rv = cdsVsPeers(it.cds5YBps, it.compositeRisk, fit);
      stance.push({ dim: 'cds', call: rv.label });
      figures.push(
        { label: 'Risk score', value: it.compositeRisk.toFixed(2), source: "the app's risk model", tag: 'model' },
        { label: 'CDS peers with this risk score pay', value: `${Math.round(rv.fittedBps)} bps`, source: `log CDS fitted on risk score, ${fit.n} countries`, tag: 'model' },
        { label: 'CDS against risk peers', value: `${sgn(rv.gapPct, 0)}% (${rv.label})`, source: 'more than 15% above the fit = cheap, 15% below = rich', tag: 'model' }
      );
      parts.push(
        rv.label === 'in line'
          ? `5Y CDS is in line with peers that have a similar risk score.`
          : `5Y CDS ${rv.label === 'cheap' ? 'pays more' : 'pays less'} than peers with a similar risk score (${sgn(rv.gapPct, 0)}%).`
      );
    }
    const cv =
      it.policyRatePct !== undefined && it.usFedFundsPct !== undefined && it.fxVol3mPct !== undefined
        ? carryToVol(it.policyRatePct, it.usFedFundsPct, it.fxVol3mPct)
        : null;
    if (cv && it.usFedFundsPct !== undefined) {
      figures.push(
        { label: 'US fed funds rate', value: p2(it.usFedFundsPct), source: `NY Fed${it.usFedFundsDate ? `, ${it.usFedFundsDate}` : ''}`, tag: 'live' },
        { label: 'Carry over US per unit of FX volatility', value: cv.ratio.toFixed(2), source: `policy rate ${cv.carryPts.toFixed(1)} pts over fed funds, over 3-month volatility`, tag: 'model' }
      );
      parts.push(cv.ratio >= 0.5 ? 'Carry over the US pays well for the currency’s recent swings.' : 'Carry over the US is small next to the currency’s recent swings.');
    }
    if (!parts.length) {
      missing.push(`${it.countryName}: no peer or carry reading`);
      continue;
    }
    findings.push({
      iso3: it.iso3,
      countryName: it.countryName,
      reading: parts.join(' '),
      figures,
      weight: Math.max(cdsSig.get(it.iso3)?.score ?? 0, carrySignal(it)?.score ?? 0),
      ...(stance.length ? { stance } : {}),
    });
  }
  return { id: 'rv', name: COUNCIL_AGENTS.rv.name, findings, missing };
}

function fxAgent(countries: LiveWatchlistItem[]): Omit<AgentAnswer, 'why'> {
  const findings: AgentFinding[] = [];
  const missing: string[] = [];
  for (const it of countries) {
    const figures: AgentFigure[] = [];
    const parts: string[] = [];
    const stance: Stance[] = [];
    if (it.reerGapPct !== undefined) {
      const l = reerLabel(it.reerGapPct);
      stance.push({ dim: 'fx', call: l });
      figures.push({
        label: 'Real exchange rate vs 10-year average',
        value: `${sgn(it.reerGapPct)}% (${l})`,
        source: `BIS real broad effective exchange rate${it.reerPeriod ? `, ${formatPeriod(it.reerPeriod)}` : ''}`,
        tag: 'official',
      });
      parts.push(
        l === 'near average'
          ? 'The real exchange rate is near its 10-year average.'
          : `The real exchange rate is ${l} for its history: ${Math.abs(it.reerGapPct).toFixed(0)}% ${it.reerGapPct > 0 ? 'above' : 'below'} its 10-year average.`
      );
    }
    if (it.fxVol3mPct !== undefined) {
      figures.push({ label: 'FX volatility against USD, 3 months', value: p1(it.fxVol3mPct), source: `ECB reference rates${it.fxVolTo ? ` to ${it.fxVolTo}` : ''}`, tag: 'live' });
      parts.push(`Three-month volatility against the dollar is ${p1(it.fxVol3mPct)} a year.`);
    }
    if (!parts.length) {
      missing.push(`${it.countryName}: no BIS real exchange rate or ECB rate`);
      continue;
    }
    findings.push({ iso3: it.iso3, countryName: it.countryName, reading: parts.join(' '), figures, weight: fxValueSignal(it)?.score ?? 0, ...(stance.length ? { stance } : {}) });
  }
  return { id: 'fx', name: COUNCIL_AGENTS.fx.name, findings, missing };
}

/** Scenarios the question points to; all three when it names none. */
export function scenariosInQuestion(question: string): ScenarioId[] {
  const out: ScenarioId[] = [];
  if (/hormuz|\boil\b|gulf|iran|energy/i.test(question)) out.push('hormuz');
  if (/taiwan|china/i.test(question)) out.push('taiwan');
  if (/russia|ukrain|sanction/i.test(question)) out.push('russia');
  return out.length ? out : SCENARIOS.map((s) => s.id);
}

const SCENARIO_PHRASE: Record<ScenarioId, string> = { hormuz: 'a Strait of Hormuz closure', taiwan: 'a Taiwan Strait crisis', russia: 'a Russia escalation' };

function spillAgent(countries: LiveWatchlistItem[], question: string): Omit<AgentAnswer, 'why'> {
  const ids = scenariosInQuestion(question);
  const scs = SCENARIOS.filter((s) => ids.includes(s.id));
  const findings: AgentFinding[] = [];
  const missing: string[] = [];
  for (const it of countries) {
    const rows = scs
      .map((sc) => ({ sc, imp: it.trade ? scenarioImpact(sc.id, it.trade) : null }))
      .filter((r): r is { sc: (typeof SCENARIOS)[number]; imp: NonNullable<ReturnType<typeof scenarioImpact>> } => r.imp !== null);
    if (!rows.length) {
      missing.push(`${it.countryName}: World Bank or WITS trade figures not loaded`);
      continue;
    }
    const worst = [...rows].sort((a, b) => a.imp.pctGdp - b.imp.pctGdp)[0];
    findings.push({
      iso3: it.iso3,
      countryName: it.countryName,
      reading:
        worst.imp.pctGdp < 0
          ? `Most exposed to ${SCENARIO_PHRASE[worst.sc.id]}: about ${Math.abs(worst.imp.pctGdp).toFixed(1)}% of GDP off the current account in the first round.`
          : `Gains in the first round from ${SCENARIO_PHRASE[worst.sc.id]} (${sgn(worst.imp.pctGdp)}% of GDP).`,
      figures: rows.map((r) => ({
        label: r.sc.name,
        value: `${sgn(r.imp.pctGdp)}% of GDP`,
        source: `${r.sc.shock} Basis: ${r.imp.basis}`,
        tag: 'model' as const,
      })),
      weight: Math.min(1, Math.max(...rows.map((r) => Math.abs(r.imp.pctGdp))) / 5),
    });
  }
  return { id: 'spill', name: COUNCIL_AGENTS.spill.name, findings, missing };
}

export const CALENDAR_HORIZON_DAYS = 120;

function calendarAgent(countries: LiveWatchlistItem[], now: Date): Omit<AgentAnswer, 'why'> {
  const events = upcomingOfficialEvents(countries.map((c) => c.iso3), CALENDAR_HORIZON_DAYS, now);
  const findings: AgentFinding[] = [];
  const none: string[] = [];
  for (const it of countries) {
    const mine = events.filter((e) => e.iso3 === it.iso3).slice(0, 4);
    if (!mine.length) {
      none.push(it.countryName);
      continue;
    }
    const first = mine[0];
    const when = first.daysUntil === 0 ? 'today' : first.daysUntil === 1 ? 'tomorrow' : `in ${first.daysUntil} days`;
    findings.push({
      iso3: it.iso3,
      countryName: it.countryName,
      reading: `Next: ${first.title} on ${first.date} (${when}${first.dateKind ? ', latest date in law' : ''}).`,
      figures: mine.map((e) => ({
        label: e.title,
        value: `${e.date}${dateKindLabel(e) ? ` (${dateKindLabel(e)})` : ''}`,
        source: `${e.sourceName}${e.primarySource ? '' : ', secondary source'}`,
        tag: 'official' as const,
      })),
      weight: 1 / (1 + first.daysUntil / 30),
    });
  }
  return {
    id: 'calendar',
    name: COUNCIL_AGENTS.calendar.name,
    findings,
    missing: none.length ? [`No dated events on file in the next ${CALENDAR_HORIZON_DAYS} days for ${none.join(', ')}`] : [],
  };
}

/** Run the planned agents. `all` is the whole watchlist, for peer comparisons. */
/* ------------------------------------------------------------------------------------------
 * Policy Document Agent: quotes the passages of your documents that best match the question.
 * ------------------------------------------------------------------------------------------ */

export const DOC_AGENT_NAME = 'Policy Document';
const DOC_PREFIX = 'doc:';
export const isDocFinding = (f: Pick<AgentFinding, 'iso3'>) => f.iso3.startsWith(DOC_PREFIX);

export function docAgent(question: string, docs: PolicyDoc[]): AgentAnswer {
  const hits = searchDocs(question, docs);
  return {
    id: 'doc',
    name: DOC_AGENT_NAME,
    why: `you added ${docs.length === 1 ? 'a document' : `${docs.length} documents`}`,
    findings: hits.map((h) => ({
      iso3: `${DOC_PREFIX}${h.docId}:${h.part}`,
      countryName: h.title,
      reading: `“${h.text}”`,
      figures: [{ label: 'Passage', value: `${h.part} of ${h.parts}`, source: `${h.title}, a document you added. Matched on: ${h.matched.join(', ')}`, tag: 'document' as const }],
      weight: h.score,
    })),
    missing: hits.length ? [] : ['no passage in your documents shares enough words with the question'],
  };
}

export function runCouncil(question: string, plan: CouncilPlan, all: LiveWatchlistItem[], now: Date = new Date(), docs: PolicyDoc[] = []): AgentAnswer[] {
  const desk = plan.agents.map(({ id, why }) => {
    const a =
      id === 'cb'
        ? cbAgent(plan.countries)
        : id === 'rv'
          ? rvAgent(plan.countries, all)
          : id === 'fx'
            ? fxAgent(plan.countries)
            : id === 'spill'
              ? spillAgent(plan.countries, question)
              : calendarAgent(plan.countries, now);
    const sorted = [...a.findings].sort((x, y) => y.weight - x.weight);
    const kept = sorted.slice(0, MAX_FINDINGS);
    const missing = [...a.missing];
    if (sorted.length > kept.length) missing.push(`${sorted.length - kept.length} more countries with smaller readings left out`);
    return { ...a, why, findings: kept, missing };
  });
  return docs.length ? [...desk, docAgent(question, docs)] : desk;
}

/* ------------------------------------------------------------------------------------------
 * The synthesis: what it is asked, and how its answer is checked.
 * ------------------------------------------------------------------------------------------ */

export interface CouncilBrief {
  headline: string;
  points: string[];
  disagreements: string[];
  gaps: string[];
}

export interface SynthesisResult {
  /** Null when no model answered: the agents' answers stand alone. */
  brief: CouncilBrief | null;
  provider?: string;
  /** Sentences removed because a number in them did not trace back to an agent's figures. */
  removed: string[];
  /** Sentences removed because they described an agent's call in an opposing word. */
  contradicted?: Contradiction[];
  reason?: string;
}

export const SYNTHESIS_INSTRUCTION = [
  'You are the synthesis agent of a sovereign research council.',
  'Answer the question in a short brief using ONLY the agent findings given.',
  'Every number you write must appear in the findings. Do not compute new numbers, forecast, or add outside facts.',
  'When a figure is tagged Sample data or AI estimate, say so next to it.',
  'Passages from the Policy Document Agent are quotes from documents the user added: name the document when you use one, and do not treat its forecasts as data.',
  'Each finding states the agent\'s stance in fixed words (policy tight, neutral or loose; CDS cheap, in line or rich; real exchange rate strong, near average or weak). Use those words; never describe a stance differently.',
  'Where agents point different ways (for example tight policy but a weak currency), say so under disagreements; do not smooth it over.',
  'List under gaps what the agents could not answer.',
  'Plain English, full sentences, no advice to buy or sell.',
].join(' ');

/** The agents' answers as plain text for the synthesis prompt. */
export function answersAsText(question: string, answers: AgentAnswer[]): string {
  const lines = [`Question: ${question}`, ''];
  for (const a of answers) {
    lines.push(`## ${a.name} Agent (asked because ${a.why})`);
    for (const f of a.findings) {
      lines.push(`- ${f.countryName}: ${f.reading}`);
      for (const s of f.stance || []) lines.push(`  - Stance on ${DIM_LABEL[s.dim]}: ${s.call}`);
      for (const g of f.figures) lines.push(`  - ${g.label}: ${g.value} [${tagLabel(g.tag, a.name)}; ${g.source}]`);
    }
    for (const m of a.missing) lines.push(`- Not available: ${m}`);
    lines.push('');
  }
  return lines.join('\n');
}

const NUM = /\d+(?:\.\d+)?/g;

/** Every number the agents (and the question) put on the table. */
export function allowedNumbers(question: string, answers: AgentAnswer[]): number[] {
  const text = answersAsText(question, answers);
  const set = new Set<number>((text.match(NUM) || []).map(Number));
  // Counts the brief may state: how many agents and countries answered.
  set.add(answers.length);
  set.add(new Set(answers.flatMap((a) => a.findings.filter((f) => !isDocFinding(f)).map((f) => f.iso3))).size);
  return [...set];
}

/** A number traces back when an agent's figure, rounded to the digits written, gives it. */
export function traces(written: string, allowed: number[]): boolean {
  const v = Number(written);
  const d = written.includes('.') ? written.split('.')[1].length : 0;
  const f = 10 ** d;
  return allowed.some((a) => Math.round(a * f) === Math.round(v * f));
}

/**
 * Drop any sentence with an untraceable number, and any sentence that describes an agent's call in
 * an opposing word (policy called loose when the Central Bank Watcher Agent reads it as tight; see
 * stanceCheck.ts). Both kinds are returned so the screen can show what was removed and why.
 */
/** A checker for AI-written sentences: false (and the sentence recorded) when a number does not trace or a call is contradicted. */
export function sentenceCheck(question: string, answers: AgentAnswer[]) {
  const allowed = allowedNumbers(question, answers);
  const removed: string[] = [];
  const contradicted: Contradiction[] = [];
  const stanced = answers.flatMap((a) =>
    a.findings.filter((f) => f.stance?.length).map((f) => ({ iso3: f.iso3, countryName: f.countryName, agent: a.name, stance: f.stance! }))
  );
  const ok = (s: string) => {
    const bad = (s.match(NUM) || []).some((n) => !traces(n, allowed));
    if (bad) {
      removed.push(s);
      return false;
    }
    const c = contradiction(s, stanced);
    if (c) contradicted.push(c);
    return !c;
  };
  return { ok, removed, contradicted };
}

export function checkBrief(
  brief: CouncilBrief,
  question: string,
  answers: AgentAnswer[]
): { brief: CouncilBrief; removed: string[]; contradicted: Contradiction[] } {
  const { ok, removed, contradicted } = sentenceCheck(question, answers);
  const clean = (xs: unknown): string[] =>
    (Array.isArray(xs) ? xs : [])
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 600))
      .filter(ok)
      .slice(0, 8);
  const headline = typeof brief.headline === 'string' ? brief.headline.trim().slice(0, 300) : '';
  return {
    brief: { headline: headline && ok(headline) ? headline : '', points: clean(brief.points), disagreements: clean(brief.disagreements), gaps: clean(brief.gaps) },
    removed,
    contradicted,
  };
}

/* ------------------------------------------------------------------------------------------
 * Saved brief, for Reports.
 * ------------------------------------------------------------------------------------------ */

export interface SavedCouncilBrief {
  question: string;
  askedAt: string;
  scopeNote: string;
  answers: AgentAnswer[];
  synthesis: SynthesisResult | null;
  /** Earlier questions in the same conversation, oldest first. */
  earlier?: EarlierTurn[];
  /** How the agents were picked (AI model or word matching). */
  chooserNote?: string;
  debate?: DebateResult;
}

const STORE_KEY = 'econquest.councilBrief.v1';

export function saveCouncilBrief(b: SavedCouncilBrief): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(b));
  } catch {
    /* storage blocked */
  }
}

export function loadCouncilBrief(): SavedCouncilBrief | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const b = raw ? (JSON.parse(raw) as SavedCouncilBrief) : null;
    return b && typeof b.question === 'string' && Array.isArray(b.answers) ? b : null;
  } catch {
    return null;
  }
}

export const COUNCIL_SECTIONS: Record<string, string> = {
  question: 'Question',
  summary: 'Summary',
  disagreements: 'Where the agents disagree',
  debate: 'Agent debate',
  agents: 'What each agent found',
  gaps: 'Gaps',
  method: 'Method',
};

export function councilBriefSections(b: SavedCouncilBrief | null, on: (id: string) => boolean): Array<{ heading: string; lines: string[] }> {
  if (!b) return [{ heading: 'No council brief yet', lines: ['Ask the council a question on Workspace, then choose "Send to Reports".'] }];
  const out: Array<{ heading: string; lines: string[] }> = [];
  const s = b.synthesis?.brief;
  if (on('question'))
    out.push({
      heading: COUNCIL_SECTIONS.question,
      lines: [
        b.question,
        `Asked ${b.askedAt.slice(0, 16).replace('T', ' ')} UTC about ${b.scopeNote}.`,
        ...(b.earlier?.length
          ? ['Earlier in the conversation:', ...b.earlier.map((t) => `- ${t.question}${t.headline ? ` (${t.headline})` : ''}`)]
          : []),
      ],
    });
  if (on('summary')) {
    out.push({
      heading: COUNCIL_SECTIONS.summary,
      lines: s
        ? [
            ...(s.headline ? [`**${s.headline}**`] : []),
            ...s.points.map((p) => `- ${p}`),
            `Written by the synthesis agent (${b.synthesis?.provider || 'AI model'}) from the agents' figures only.${
              b.synthesis?.removed.length ? ` ${b.synthesis.removed.length} sentence(s) removed because a number did not trace back to an agent.` : ''
            }`,
          ]
        : [`No AI summary. ${b.synthesis?.reason || 'No AI model answered.'} The agents' answers below stand on their own.`],
    });
  }
  if (on('disagreements') && s?.disagreements.length) out.push({ heading: COUNCIL_SECTIONS.disagreements, lines: s.disagreements.map((d) => `- ${d}`) });
  if (on('debate') && b.debate?.challenges.length) {
    const d = b.debate;
    const lines: string[] = [];
    d.challenges.forEach((c, i) => {
      lines.push(`- **${c.countryName}: ${c.fromName} Agent challenges ${c.toName} Agent.** ${c.challenge} What would settle it: ${c.settle}`);
      const r = d.replies?.find((x) => x.index === i);
      if (r) lines.push(`  - ${c.toName} Agent replies: ${r.reply}`);
    });
    if (d.verdict) lines.push('', `Where it lands: ${d.verdict}`);
    if (d.open?.length) lines.push('', 'Still open:', ...d.open.map((o) => `- ${o}`));
    if (!d.replies) lines.push('', `No AI replies (${d.reason || 'no AI model answered'}); the challenges come from stated rules on the agents' figures.`);
    out.push({ heading: COUNCIL_SECTIONS.debate, lines });
  }
  if (on('agents')) {
    const lines: string[] = [];
    for (const a of b.answers) {
      if (lines.length) lines.push('');
      lines.push(`**${a.name} Agent**, asked because ${a.why}.`);
      for (const f of a.findings) {
        lines.push(`- ${f.countryName}: ${f.reading} ${f.figures.map((g) => `${g.label} ${g.value} (${tagLabel(g.tag, a.name)}, ${g.source})`).join('; ')}.`);
      }
      if (!a.findings.length) lines.push('- No reading from the figures on hand.');
    }
    out.push({ heading: COUNCIL_SECTIONS.agents, lines });
  }
  if (on('gaps')) {
    const gaps = [...b.answers.flatMap((a) => a.missing.map((m) => `${a.name} Agent: ${m}`)), ...(s?.gaps || [])];
    if (gaps.length) out.push({ heading: COUNCIL_SECTIONS.gaps, lines: gaps.map((g) => `- ${g}`) });
  }
  if (on('method')) {
    out.push({
      heading: COUNCIL_SECTIONS.method,
      lines: [
        `${b.chooserNote || 'A rule-based planner picked the agents from words in the question.'} Each agent answered only from figures the app holds, each tagged Live data, Official, AI estimate, Sample data, or as that agent’s model reading (a stated rule on the figures, not a forecast).`,
        'For discussion. Not investment advice.',
      ],
    });
  }
  return out;
}
