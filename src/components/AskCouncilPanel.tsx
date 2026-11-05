import React, { useState } from 'react';
import { Copy, FileText } from 'lucide-react';
import type { CouncilAssessmentRun, CROOverrideState, LiveWatchlistItem } from '../types/council';
import { CouncilApprovalCard } from './CouncilApprovalCard';
import { AgentNetwork, useCouncilProgress } from './AgentNetwork';
import { askCouncilColumns, fullCouncilColumns, type FullCouncilPhase } from '../utils/councilNetwork';
import {
  councilBriefSections,
  planCouncil,
  planFollowUp,
  suggestFollowUps,
  type EarlierTurn,
  runCouncil,
  saveCouncilBrief,
  tagLabel,
  type AgentAnswer,
  type CouncilPlan,
  type FigureTag,
  type SavedCouncilBrief,
  type SynthesisResult,
} from '../utils/askCouncil';

const AI_RUNTIME_STORAGE_KEY = 'econquest_ai_runtime_config_v1';
function runtimeConfig(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(AI_RUNTIME_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

const TAG_CLASS: Record<FigureTag, string> = {
  live: 'text-emerald-700 dark:text-emerald-400',
  official: 'text-emerald-700 dark:text-emerald-400',
  estimate: 'text-amber-700 dark:text-amber-400',
  sample: 'text-amber-700 dark:text-amber-400',
  model: 'text-blue-700 dark:text-blue-300',
};

/** The full nine-agent council on the country open now, run from the conversation. */
export interface FullCouncilStep {
  countryName: string;
  stage: CouncilAssessmentRun['stage'];
  isRunning: boolean;
  isApproving: boolean;
  deskState: CROOverrideState;
  draft: CROOverrideState;
  /** Set only for a report written in this session, never for the built-in example run. */
  result?: { reportId: string; verdict: string; summary: string };
  /** The run's id for live step progress; null until a run starts in this session. */
  progressId: string | null;
  onRun: () => void;
  onApprove: () => void;
  onChangeDraft: (next: CROOverrideState) => void;
  onOpenFullReview?: () => void;
}

const VERDICT: Record<string, string> = {
  EXECUTE_TRADES: 'Act on the trade ideas',
  DEFENSIVE_HEDGE: 'Hedge the exposure',
  HOLD_AND_MONITOR: 'Hold and keep watching',
};

const EXAMPLES = [
  'Which central banks look behind the curve?',
  'Who is most exposed to a Hormuz closure?',
  'What is coming up in the next month?',
];

function toMarkdown(b: SavedCouncilBrief): string {
  return [
    '# Council brief',
    '',
    ...councilBriefSections(b, () => true).flatMap((s) => [`## ${s.heading}`, '', ...s.lines.flatMap((l) => (l.startsWith('- ') ? [l] : [l, ''])), '']),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Today > Ask the council. A question goes to the desk agents that cover it (stated keyword
 * rules), each answers from the app's own figures, then the synthesis agent may summarise.
 */
export const AskCouncilPanel: React.FC<{
  items: LiveWatchlistItem[];
  onOpenCountry: (item: LiveWatchlistItem) => void;
  onSendToReports: () => void;
  fullCouncil?: FullCouncilStep;
}> = ({ items, onOpenCountry, onSendToReports, fullCouncil }) => {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState('');
  const [asked, setAsked] = useState<{ question: string; plan: CouncilPlan; answers: AgentAnswer[]; askedAt: string } | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState(false);
  // Earlier turns of this conversation, oldest first. A question in the top box starts a new one.
  const [earlier, setEarlier] = useState<Array<EarlierTurn & { scopeNote: string; points: string[] }>>([]);
  const [followUp, setFollowUp] = useState('');

  const ask = async (q: string, asFollowUp = false) => {
    const text = q.trim();
    if (!text || !items.length) return;
    const history = asFollowUp && asked ? [...earlier, { question: asked.question, headline: synthesis?.brief?.headline || undefined, scopeNote: asked.plan.scopeNote, points: synthesis?.brief?.points || [] }] : [];
    setEarlier(history);
    setFollowUp('');
    const plan = asFollowUp && asked ? planFollowUp(text, asked.plan, items) : planCouncil(text, items, scope || undefined);
    const answers = runCouncil(text, plan, items);
    const askedAt = new Date().toISOString();
    setAsked({ question: text, plan, answers, askedAt });
    setSynthesis(null);
    setCopied(false);
    if (!answers.some((a) => a.findings.length)) {
      setSynthesis({ brief: null, removed: [], reason: 'The agents found no figures to answer with, so there is nothing to summarise.' });
      return;
    }
    setWriting(true);
    try {
      const r = await fetch('/api/council/synthesise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, answers, earlier: history.map((t) => ({ question: t.question, headline: t.headline })), runtimeConfig: runtimeConfig() }),
      });
      setSynthesis(r.ok ? ((await r.json()) as SynthesisResult) : { brief: null, removed: [], reason: `The summary step did not answer (HTTP ${r.status}).` });
    } catch {
      setSynthesis({ brief: null, removed: [], reason: 'The app server did not answer.' });
    } finally {
      setWriting(false);
    }
  };

  const saved: SavedCouncilBrief | null = asked
    ? {
        question: asked.question,
        askedAt: asked.askedAt,
        scopeNote: asked.plan.scopeNote,
        answers: asked.answers,
        synthesis,
        ...(earlier.length ? { earlier: earlier.map((t) => ({ question: t.question, headline: t.headline })) } : {}),
      }
    : null;
  const copy = async () => {
    if (!saved) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(saved));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const send = () => {
    if (!saved) return;
    saveCouncilBrief(saved);
    onSendToReports();
  };

  const brief = synthesis?.brief;
  const fc = fullCouncil;
  const phase: FullCouncilPhase = !fc
    ? 'idle'
    : fc.isRunning
      ? 'debating'
      : fc.stage === 'AWAITING_CRO_APPROVAL'
        ? 'awaiting_review'
        : fc.isApproving
          ? 'writing_report'
          : fc.result
            ? 'done'
            : 'idle';
  const steps = useCouncilProgress(fc?.progressId ?? null, Boolean(fc && (fc.isRunning || fc.isApproving)));
  return (
    <section className="ui-panel" data-ask-council="true" data-no-provenance-overlay="true" data-no-stat-ref="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title">Ask the council</h3>
        <p className="ui-label">
          Ask about your watchlist. The desk agents that cover your question answer from the app’s own figures, each with its source; a synthesis agent then writes a short brief from their answers only.
        </p>
      </header>
      <form
        className="px-4 pt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="council-question" className="sr-only">
          Question
        </label>
        <textarea
          id="council-question"
          rows={2}
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
            }
          }}
          placeholder="For example: Is Turkey's central bank behind the curve, and what would a Hormuz closure do?"
          className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="ui-label flex items-center gap-1.5">
            <span>Countries</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="px-1.5 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-[14rem]"
            >
              <option value="">As named, else all</option>
              {items.map((i) => (
                <option key={i.iso3} value={i.iso3}>
                  {i.countryName}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={!question.trim() || writing}>
            Ask
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="ui-pill"
              onClick={() => {
                setQuestion(ex);
                void ask(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {asked && earlier.length > 0 && (
        <ol className="px-4 pt-3 space-y-1.5" data-council-earlier="true" aria-label="Earlier in this conversation">
          {earlier.map((t, i) => (
            <li key={`${i}-${t.question}`}>
              <details className="text-sm border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                <summary className="cursor-pointer text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">You asked: </span>
                  {t.question}
                </summary>
                <div className="mt-1 text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">About {t.scopeNote}.</p>
                  {t.headline ? <p className="font-medium">{t.headline}</p> : <p className="text-xs">No AI summary for this one; the agents answered on their own.</p>}
                  {t.points.length > 0 && (
                    <ul className="list-disc pl-5 space-y-0.5">
                      {t.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      {asked && (
        <div className="px-4 py-3 space-y-3" data-council-result="true">
          {earlier.length > 0 && (
            <p className="text-sm text-slate-900 dark:text-white">
              <span className="text-slate-500 dark:text-slate-400">Follow-up: </span>
              {asked.question}
            </p>
          )}
          <AgentNetwork
            title={`Agents on your question, about ${asked.plan.scopeNote}`}
            columns={askCouncilColumns(asked.answers, writing, synthesis)}
          />

          <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-council-summary="true">
            <div className="ui-label">Synthesis agent</div>
            {writing ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Writing the brief from the agents’ answers…</p>
            ) : brief ? (
              <>
                {brief.headline && <p className="text-sm font-medium text-slate-900 dark:text-white">{brief.headline}</p>}
                {brief.points.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-slate-800 dark:text-slate-200 space-y-1">
                    {brief.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
                {brief.disagreements.length > 0 && (
                  <div>
                    <div className="ui-label mt-1">Where the agents disagree</div>
                    <ul className="list-disc pl-5 text-sm text-slate-800 dark:text-slate-200 space-y-1">
                      {brief.disagreements.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI summary by {synthesis?.provider || 'the configured model'}, from the agents’ figures only.
                  {synthesis && synthesis.removed.length > 0 && ` ${synthesis.removed.length} sentence(s) removed because a number in them did not match any agent figure.`}
                  {synthesis && (synthesis.contradicted?.length ?? 0) > 0 &&
                    ` ${synthesis.contradicted!.length} sentence(s) removed because they contradicted an agent's call.`}
                </p>
                {synthesis && (synthesis.contradicted?.length ?? 0) > 0 && (
                  <details className="text-xs text-amber-800 dark:text-amber-300" data-council-contradicted="true">
                    <summary className="cursor-pointer">Show sentences that contradicted an agent</summary>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {synthesis.contradicted!.map((c) => (
                        <li key={c.sentence}>
                          “{c.sentence}” <span className="text-slate-600 dark:text-slate-400">{c.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {synthesis && synthesis.removed.length > 0 && (
                  <details className="text-xs text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer">Show removed sentences</summary>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {synthesis.removed.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300" data-council-no-summary="true">
                No AI summary. {synthesis?.reason || ''} The agents’ answers below stand on their own.
              </p>
            )}
          </div>

          {asked.answers.map((a) => (
            <div key={a.id} data-council-agent={a.id}>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{a.name} Agent</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Asked because {a.why}.</div>
              {a.findings.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No reading from the figures on hand.</p>
              ) : (
                <ul className="mt-1 space-y-2">
                  {a.findings.map((f) => {
                    const item = items.find((i) => i.iso3 === f.iso3);
                    return (
                      <li key={f.iso3} className="text-sm">
                        <button type="button" onClick={() => item && onOpenCountry(item)} className="font-medium text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300">
                          {f.countryName}
                        </button>
                        <span className="text-slate-800 dark:text-slate-200">: {f.reading}</span>
                        <ul className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                          {f.figures.map((g) => (
                            <li key={g.label} title={g.source}>
                              {g.label} <span className="tabular-nums text-slate-900 dark:text-slate-100">{g.value}</span>{' '}
                              <span className={TAG_CLASS[g.tag]}>{tagLabel(g.tag, a.name)}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
              {a.missing.length > 0 && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Not available: {a.missing.join('; ')}.</p>}
            </div>
          ))}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <button type="button" className="ui-btn" onClick={copy} disabled={writing}>
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy brief'}
            </button>
            <button type="button" className="ui-btn" onClick={send} disabled={writing}>
              <FileText className="w-3.5 h-3.5" /> Send to Reports
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Hover a figure for its source. For discussion, not investment advice.</p>

          <form
            className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2"
            data-council-followup="true"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(followUp, true);
            }}
          >
            <label htmlFor="council-followup" className="ui-label">
              Ask a follow-up. It keeps these countries and agents unless you name others.
            </label>
            <div className="flex gap-2">
              <input
                id="council-followup"
                value={followUp}
                maxLength={500}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="For example: and the currency? or what about Egypt?"
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button type="submit" className="ui-btn ui-btn-primary" disabled={!followUp.trim() || writing}>
                Ask
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestFollowUps(asked.plan, asked.answers).map((s) => (
                <button key={s} type="button" className="ui-pill" disabled={writing} onClick={() => void ask(s, true)}>
                  {s}
                </button>
              ))}
            </div>
          </form>
        </div>
      )}

      {fullCouncil && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-3" data-full-council={fullCouncil.stage}>
          {fullCouncil.progressId && phase !== 'idle' && (
            <AgentNetwork
              title={`Full council on ${fullCouncil.countryName}`}
              columns={fullCouncilColumns(steps, phase)}
              footnote="Each desk’s three analysts and its devil’s advocate debate run as one model call, so they finish together. Amber means no AI model answered and the desk used the app’s built-in figures."
            />
          )}
          {fullCouncil.stage === 'AWAITING_CRO_APPROVAL' ? (
            <CouncilApprovalCard
              countryName={fullCouncil.countryName}
              deskState={fullCouncil.deskState}
              draft={fullCouncil.draft}
              isApproving={fullCouncil.isApproving}
              onApprove={fullCouncil.onApprove}
              onChangeDraft={fullCouncil.onChangeDraft}
              onOpenFullReview={fullCouncil.onOpenFullReview}
            />
          ) : fullCouncil.isRunning ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">The desks are working. The council will pause here for your approval before the final report.</p>
          ) : fullCouncil.isApproving ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">Assumptions approved. The supreme council is writing the final {fullCouncil.countryName} report.</p>
          ) : (
            <>
              {fullCouncil.result && (
                <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-1" data-full-council-result="true">
                  <div className="ui-label">Full council, final report {fullCouncil.result.reportId}</div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {fullCouncil.countryName}: {VERDICT[fullCouncil.result.verdict] || fullCouncil.result.verdict}
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{fullCouncil.result.summary}</p>
                  {fullCouncil.onOpenFullReview && (
                    <button type="button" className="ui-btn" onClick={fullCouncil.onOpenFullReview}>
                      Open the full report
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {fullCouncil.result ? 'Run it again with fresh figures?' : 'Want the full council’s view?'} Nine desk agents debate {fullCouncil.countryName} (the country open now), then it pauses here for your approval before the final report.
                </p>
                <button type="button" className="ui-btn" onClick={fullCouncil.onRun}>
                  Run the full council on {fullCouncil.countryName}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
