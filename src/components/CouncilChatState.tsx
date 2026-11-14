/**
 * Council chat's conversation, kept above the pages (CouncilChatProvider). The screens that draw it
 * (CouncilChatView.tsx) load only when the chat is first shown, so they stay out of the start-up code.
 */
import { promptHelpLevel, readHelpLevel } from '../utils/helpLevel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { councilBriefMarkdown } from '../utils/briefExport';
import type { CouncilAssessmentRun, CROOverrideState, LiveWatchlistItem, WatchlistItem } from '../types/council';
import { useResearchLibrary } from './SavedResearch';
import { toLive } from '../utils/liveFigures';
import { briefId } from '../utils/researchLibrary';
import { pickPrevious, whatChanged, type ChangeReport } from '../utils/whatChanged';
import type { PolicyDoc } from '../utils/policyDocs';
import { findChallenges, type DebateResult } from '../utils/agentDebate';
import { type FullCouncilPhase } from '../utils/councilNetwork';
import { planCouncil, planFollowUp, applyAgentChoice, type AgentChoiceResult, type EarlierTurn, runCouncil, chartAnswer, answersForModel, type AgentAnswer, type CouncilPlan, type SavedCouncilBrief, type SynthesisResult } from '../utils/askCouncil';
import type { CouncilTiming } from '../utils/councilTiming';
import { focusQuestion, withExplainAgents, type ExplainFocus } from '../utils/explain';
import { EXPLAIN_EVENT } from '../utils/explainHandoff';
import { computeChart, fetchChartSeries } from '../utils/councilChart';
import { asksForecast, forecastAnswer, type CountryModels } from '../utils/forecastAgent';

const AI_RUNTIME_STORAGE_KEY = 'econquest_ai_runtime_config_v1';
export function runtimeConfig(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(AI_RUNTIME_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

/** The full nine-agent council on the country open now, run from the conversation. */
/** The app's nowcast and forecast for each country (src/utils/forecastAgent.ts); a failed call reads Missing. */
async function fetchCountryModels(countries: Array<{ iso3: string; countryName: string }>): Promise<CountryModels[]> {
  const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return Promise.all(countries.map(async (c) => ({ iso3: c.iso3, countryName: c.countryName, nowcast: await get(`/api/nowcast/${encodeURIComponent(c.iso3)}`), forecast: await get(`/api/forecast/${encodeURIComponent(c.iso3)}`) })));
}

export interface FullCouncilStep {
  countryName: string;
  stage: CouncilAssessmentRun['stage'];
  isRunning: boolean;
  isApproving: boolean;
  deskState: CROOverrideState;
  draft: CROOverrideState;
  /** Set only for a report written in this session, never for the built-in example run. */
  result?: { reportId: string; verdict: string; summary: string; figureCheck?: CouncilAssessmentRun['figureCheck']; timing?: CouncilTiming };
  /** The run's id for live step progress; null until a run starts in this session. */
  progressId: string | null;
  onRun: () => void;
  onApprove: () => void;
  onChangeDraft: (next: CROOverrideState) => void;
  onOpenFullReview?: () => void;
}

export const VERDICT: Record<string, 'verdictExecute' | 'verdictHedge' | 'verdictHold'> = {
  EXECUTE_TRADES: 'verdictExecute',
  DEFENSIVE_HEDGE: 'verdictHedge',
  HOLD_AND_MONITOR: 'verdictHold',
};

export const EXAMPLES = [
  'Which central banks look behind the curve?',
  'Who is most exposed to a Hormuz closure?',
  'Whose government debt is on a rising path?',
  'What is coming up in the next month?',
];

export const toMarkdown = councilBriefMarkdown;

export type Asked = { question: string; plan: CouncilPlan; answers: AgentAnswer[]; askedAt: string; startedAt: string };
/** One exchange in the chat: the question and everything the council answered with. */
export type Turn = { asked: Asked; synthesis: SynthesisResult | null; debate: DebateResult | null; changes: ChangeReport | null; earlier: EarlierTurn[] };

export function toSaved(t: Turn, debateSettled = true): SavedCouncilBrief {
  return {
    question: t.asked.question,
    askedAt: t.asked.askedAt,
    scopeNote: t.asked.plan.scopeNote,
    answers: t.asked.answers,
    synthesis: t.synthesis,
    ...(t.earlier.length ? { earlier: t.earlier.map((e) => ({ question: e.question, headline: e.headline })) } : {}),
    ...(t.asked.plan.chooserNote ? { chooserNote: t.asked.plan.chooserNote } : {}),
    ...(t.debate && debateSettled ? { debate: t.debate } : {}),
    startedAt: t.asked.startedAt,
    ...(t.changes ? { changes: t.changes } : {}),
  };
}

export const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * Today > Council chat. A question goes to the desk agents that cover it (stated keyword
 * rules), each answers from the app's own figures, then the synthesis agent may summarise.
 */
/** The conversation itself, shared by every place the chat is shown (see CouncilChatProvider). */
function useCouncilChatState(items: LiveWatchlistItem[]) {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState('');
  const [asked, setAsked] = useState<Asked | null>(null);
  // Earlier exchanges of this conversation, in full, oldest first; shown above the latest one.
  const [past, setPast] = useState<Turn[]>([]);
  const lib = useResearchLibrary();
  const [changes, setChanges] = useState<ChangeReport | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  // Earlier questions of this conversation, oldest first, as sent to the AI steps.
  const [earlier, setEarlier] = useState<EarlierTurn[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [debating, setDebating] = useState(false);
  // Countries off the watchlist added for questions in this session (pulled on request, not saved to the list).
  const [extra, setExtra] = useState<LiveWatchlistItem[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  // Pinned: the conversation keeps the figures it had when pinned, even when the feeds refresh.
  const [pinned, setPinned] = useState<{ at: string; items: LiveWatchlistItem[] } | null>(null);
  const pool = useMemo(() => {
    const base = pinned ? pinned.items : items;
    return [...base, ...extra.filter((e) => !base.some((i) => i.iso3 === e.iso3))];
  }, [items, extra, pinned]);
  const pinData = (on: boolean) => setPinned(on ? { at: new Date().toISOString(), items: pool } : null);

  const runDebate = async () => {
    if (!asked) return;
    // Show the rule-based challenges at once; the AI replies replace them when they come.
    setDebate({ challenges: findChallenges(asked.answers), replies: null });
    setDebating(true);
    try {
      const r = await fetch('/api/council/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: asked.question, answers: answersForModel(asked.answers), runtimeConfig: runtimeConfig() }),
      });
      if (r.ok) setDebate((await r.json()) as DebateResult);
      else setDebate((d) => d && { ...d, reason: `the debate step did not answer (HTTP ${r.status})` });
    } catch {
      setDebate((d) => d && { ...d, reason: 'the app server did not answer' });
    } finally {
      setDebating(false);
    }
  };

  /** Ask the AI model which agents should answer; null when it cannot be reached in time. */
  const chooseAgents = async (question: string, history: EarlierTurn[]): Promise<AgentChoiceResult | null> => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch('/api/council/choose-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, earlier: history.map((t) => ({ question: t.question })), runtimeConfig: runtimeConfig() }),
        signal: ctl.signal,
      });
      return r.ok ? ((await r.json()) as AgentChoiceResult) : { agents: null, reason: `the AI step did not answer (HTTP ${r.status})` };
    } catch {
      return { agents: null, reason: ctl.signal.aborted ? 'the AI model took too long' : 'the app server did not answer' };
    } finally {
      clearTimeout(timer);
    }
  };

  /**
   * new: starts a conversation. followup: keeps this one's countries and agents unless others are
   * named. replace: asks the latest question again (after adding a country) without a new message.
   */
  const ask = async (q: string, mode: 'new' | 'followup' | 'replace' = 'new', poolOverride?: LiveWatchlistItem[], focus?: ExplainFocus) => {
    const text = q.trim();
    const items = poolOverride ?? pool;
    if (!text || !items.length) return;
    const asFollowUp = mode === 'followup' && Boolean(asked);
    const history = asFollowUp && asked ? [...earlier, { question: asked.question, headline: synthesis?.brief?.headline || undefined }] : mode === 'replace' ? earlier : [];
    if (asFollowUp && asked) setPast((p) => [...p, { asked, synthesis, debate, changes, earlier }]);
    else if (mode === 'new') setPast([]);
    setEarlier(history);
    setQuestion('');
    const wordPlan = asFollowUp && asked ? planFollowUp(text, asked.plan, items) : planCouncil(text, items, scope || undefined);
    setChoosing(true);
    // Explain questions ("why…", "what does it mean for…") also bring the agents for each lens.
    const plan = withExplainAgents(applyAgentChoice(wordPlan, await chooseAgents(text, history)), text, focus);
    setChoosing(false);
    const desk = runCouncil(text, plan, items, new Date(), docs);
    // The Chart Agent: fetch the series the question names from the app's own history, draw, test.
    const charted = plan.chart ? [chartAnswer(plan.chart, computeChart(plan.chart, await fetchChartSeries(plan.chart))), ...desk] : desk;
    // Nowcast & Forecast: the app's own estimates join when the question asks about the path ahead.
    const answers = asksForecast(text) && plan.countries.length ? [...charted, forecastAnswer(await fetchCountryModels(plan.countries.slice(0, 4)))] : charted;
    const askedAt = new Date().toISOString();
    setAsked({ question: text, plan, answers, askedAt, startedAt: (asFollowUp || mode === 'replace') && asked ? asked.startedAt : askedAt });
    setSynthesis(null);
    setDebate(null);
    setCopied(null);
    if (!answers.some((a) => a.findings.length)) {
      setSynthesis({ brief: null, removed: [], reason: 'The agents found no figures to answer with, so there is nothing to summarise.' });
      return;
    }
    setWriting(true);
    try {
      const r = await fetch('/api/council/synthesise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, askedAt, ...(pinned ? { dataPinnedAt: pinned.at } : {}), answers: answersForModel(answers), scope: plan.scopeNote, countries: plan.countries.length, earlier: history.map((t) => ({ question: t.question, headline: t.headline })), ...(plan.explain ? { explain: { ...plan.explain, helpLevel: promptHelpLevel(readHelpLevel()) } } : {}), runtimeConfig: runtimeConfig() }),
      });
      setSynthesis(r.ok ? ((await r.json()) as SynthesisResult) : { brief: null, removed: [], reason: `The summary step did not answer (HTTP ${r.status}).` });
    } catch {
      setSynthesis({ brief: null, removed: [], reason: 'The app server did not answer.' });
    } finally {
      setWriting(false);
    }
  };

  // "Explain" pressed on a figure, chart or panel: ask about it, with the exact figure, in this conversation.
  const askRef = useRef(ask);
  askRef.current = ask;
  const askedRef = useRef(asked);
  askedRef.current = asked;
  useEffect(() => {
    const onExplain = (e: Event) => {
      const f = (e as CustomEvent<ExplainFocus>).detail;
      if (f?.label) void askRef.current(focusQuestion(f), askedRef.current ? 'followup' : 'new', undefined, f);
    };
    window.addEventListener(EXPLAIN_EVENT, onExplain);
    return () => window.removeEventListener(EXPLAIN_EVENT, onExplain);
  }, []);

  /** Pulls live figures for countries the question named that are off the watchlist, then asks again. */
  const addForQuestion = async () => {
    const codes = asked?.plan.offWatchlistIso3;
    if (!asked || !codes?.length) return;
    setAdding(null);
    try {
      const r = await fetch(`/api/data/watchlist-live?iso3=${encodeURIComponent(codes.join(','))}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows = ((await r.json())?.items || []) as WatchlistItem[];
      const fresh = rows.filter((row) => !pool.some((p: LiveWatchlistItem) => p.iso3 === row.iso3)).map((row) => toLive(row as unknown as WatchlistItem));
      if (!fresh.length) {
        setAdding('The app could not pull figures for that country.');
        return;
      }
      const next = [...pool, ...fresh];
      setExtra((e) => [...e, ...fresh]);
      await ask(asked.question, 'replace', next);
    } catch (e) {
      setAdding(`The app server did not answer (${(e as Error).message}).`);
    }
  };

  const current: Turn | null = asked ? { asked, synthesis, debate, changes, earlier } : null;
  const saved: SavedCouncilBrief | null = current ? toSaved(current, !debating) : null;
  const newConversation = () => {
    setAsked(null);
    setPast([]);
    setEarlier([]);
    setSynthesis(null);
    setDebate(null);
    setChanges(null);
    setQuestion('');
    setPinned(null);
  };
  // Compare with the latest saved conversation on the same countries, once per question.
  useEffect(() => {
    setChanges(null);
    if (!asked) return;
    const prev = pickPrevious(lib.briefs, briefId(asked.startedAt), asked.answers);
    if (!prev) return;
    let live = true;
    void lib.loadBrief(prev.id).then((b) => {
      if (live && b) setChanges(whatChanged(b, asked.answers));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked?.askedAt]);
  // Keep each conversation on this computer once its answer is in (and again after a debate or follow-up).
  const settled = Boolean(saved) && !writing && !debating && !choosing;
  useEffect(() => {
    if (settled && saved) void lib.saveBrief(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, asked?.askedAt, synthesis, debate]);
  const changeDocs = (next: PolicyDoc[]) => {
    const known = new Set(lib.docs.map((d) => d.id));
    for (const d of next) if (!known.has(d.id)) void lib.saveDoc(d);
    setDocs(next);
  };
  const copy = async (b: SavedCouncilBrief | null) => {
    if (!b) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(b));
      setCopied(b.askedAt);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return {
    items, question, setQuestion, scope, setScope, asked, past, lib, synthesis, writing, copied, earlier, choosing, docs, setDocs,
    debate, debating, extra, adding, runDebate, ask, addForQuestion, current, saved, newConversation, changeDocs, copy, pinned, pinData,
  };
}

export function fullCouncilPhase(fc: FullCouncilStep | undefined): FullCouncilPhase {
  if (!fc) return 'idle';
  if (fc.isRunning) return 'debating';
  if (fc.stage === 'AWAITING_CRO_APPROVAL') return 'awaiting_review';
  if (fc.isApproving) return 'writing_report';
  return fc.result ? 'done' : 'idle';
}

type CouncilChat = ReturnType<typeof useCouncilChatState>;
const CouncilChatContext = React.createContext<CouncilChat | null>(null);

/**
 * Holds the council conversation above the pages, so the same chat carries on whether it is open
 * on Workspace or in the side panel on Research and Reports, and a question keeps running while you move.
 */
export const CouncilChatProvider: React.FC<{ items: LiveWatchlistItem[]; children: React.ReactNode }> = ({ items, children }) => {
  const chat = useCouncilChatState(items);
  return <CouncilChatContext.Provider value={chat}>{children}</CouncilChatContext.Provider>;
};

export function useCouncilChat(): CouncilChat {
  const chat = React.useContext(CouncilChatContext);
  if (!chat) throw new Error('Council chat needs a CouncilChatProvider above it.');
  return chat;
}

/** True once a question is asked or being planned in this conversation (the Agents panel then has something to show). */
export function useCouncilHasQuestion(): boolean {
  const { asked, choosing } = useCouncilChat();
  return Boolean(asked || choosing);
}

