/** Council chat and the Agents panel, drawn from the conversation in CouncilChatState.tsx. Loaded on first show. */
import { SettingsText } from './SettingsText';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Copy, Download, FileText, NotebookPen, X } from 'lucide-react';
import { startPolicyReview } from '../utils/reviewHandoff';
import { openIdeaJournal } from '../utils/ideaHandoff';
import { downloadCouncilBrief } from '../utils/briefExport';
import type { LiveWatchlistItem } from '../types/council';
import { CouncilApprovalCard } from './CouncilApprovalCard';
import { PolicyDocsPicker } from './PolicyDocsPicker';
import { FigureCheckNote } from './FigureCheckNote';
import { SavedDocsRow, SavedResearchList } from './SavedResearch';
import { MAX_DOCS } from '../utils/policyDocs';
import { changeLines } from '../utils/whatChanged';
import { AgentNetwork, useCouncilProgress } from './AgentNetwork';
import { ExplainAnswer } from './ExplainAnswer';
import { parseWhatIf } from '../utils/fiscalWhatIf';
import { DocumentCards, DocumentViewer, SaveToReportsButton } from './CouncilDocuments';
import { toAgentDocuments, toSynthesisDocument, type CouncilDocument } from '../utils/agentDocument';
import { askCouncilColumns, fullCouncilColumns } from '../utils/councilNetwork';
import { suggestFollowUps, saveCouncilBrief, type SavedCouncilBrief } from '../utils/askCouncil';
import { smallRefereeNote } from '../utils/refereeModel';
import { useT, useTx } from '../i18n/useLang';
import { COUNCIL } from '../i18n/messages/council';
import { AnswerSnapshotDetails } from './AnswerSnapshot';
import { CouncilTimingNote } from './CouncilTimingNote';
import { PRESETS } from '../utils/councilChart';
import { lazyNamed } from './LazyDesk';
import { chatSuggestions, SUGGESTION_KIND_LABEL } from '../utils/chatSuggestions';
import { loadHoldings } from '../utils/holdings';
import { EXAMPLES, VERDICT, fullCouncilPhase, time, toMarkdown, toSaved, useCouncilChat, runtimeConfig, type FullCouncilStep, type Turn } from './CouncilChatState';
// The chart card (recharts) loads only when an answer has a chart.
const CouncilChartCard = lazyNamed(() => import('./CouncilChart'), 'CouncilChartCard');
const WhatIfCard = lazyNamed(() => import('./WhatIfCard'), 'WhatIfCard');

export const AskCouncilPanel: React.FC<{
  onOpenCountry: (item: LiveWatchlistItem) => void;
  onSendToReports: () => void;
  fullCouncil?: FullCouncilStep;
  /** "Uses:" line linking back to Workspace > Your inputs. */
  uses?: React.ReactNode;
  /** Shown in the side panel on other pages: no height cap, a Close button in the header. */
  onClose?: () => void;
  /** Workspace: the chat fills the page like an AI chat app, with the input box pinned at the bottom. */
  page?: boolean;
  /** Extra buttons for the chat's top bar (Workspace puts Briefing there). */
  toolbar?: React.ReactNode;
}> = ({ onOpenCountry, onSendToReports, fullCouncil, uses, onClose, page, toolbar }) => {
  const {
    items, question, setQuestion, scope, setScope, asked, past, lib, synthesis, writing, copied, choosing, docs, setDocs,
    debate, debating, extra, adding, runDebate, ask, addForQuestion, current, newConversation, changeDocs, copy, pinned, pinData,
  } = useCouncilChat();
  const tr = useT(COUNCIL);
  const tx = useTx();
  // Welcome suggestions from your holdings, watchlist moves and your last saved question (src/utils/chatSuggestions.ts).
  const suggestions = React.useMemo(
    () => chatSuggestions({ holdings: loadHoldings(), items, recent: lib.briefs, examples: EXAMPLES }),
    [items, lib.briefs],
  );
  /** Save to Reports: the answer becomes the council brief there, and each document is kept. Stays in the chat. */
  const saveAnswer = (b: SavedCouncilBrief | null, docs: CouncilDocument[]) => {
    if (!b) return;
    saveCouncilBrief(b);
    void lib.saveCouncilDocs(docs);
  };

  const fc = fullCouncil;
  const phase = fullCouncilPhase(fc);
  // On Workspace the agents sit in their own side panel (CouncilAgentsPanel), which does the polling.
  const steps = useCouncilProgress(page ? null : fc?.progressId ?? null, Boolean(!page && fc && (fc.isRunning || fc.isApproving)));
  const fullCouncilInChat = Boolean(fc && (phase !== 'idle' || fc.result));
  const busy = writing || choosing;
  // The council document open over the page, if any (a card in the chat opens it).
  const [openDoc, setOpenDoc] = useState<CouncilDocument | null>(null);
  const closeDoc = React.useCallback(() => setOpenDoc(null), []);
  const savedDocIds = useMemo(() => new Set(lib.councilDocs.map((d) => d.id)), [lib.councilDocs]);

  // Keep the newest message in view as the conversation grows.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [asked?.askedAt, past.length, choosing, writing, synthesis, debate, debating, phase]);

  const submit = () => void ask(question, asked ? 'followup' : 'new');

  const userMessage = (text: string, when?: string, key?: string) => (
    <div className="flex justify-end" key={key} data-chat-user="true">
      <div className="max-w-[85%] bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-3 py-2">
        <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{text}</p>
        {when && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 text-right">{time(when)}</p>}
      </div>
    </div>
  );

  /** Warnings about the AI text: a small referee, and the sentences the checks removed. */
  const removedNotes = (t: Turn) => (
    <>
              {smallRefereeNote(t.synthesis?.provider) && (
                <p className="text-xs text-amber-800 dark:text-amber-300" data-council-small-referee="true">
                  <SettingsText text={smallRefereeNote(t.synthesis?.provider)!} />
                </p>
              )}
              {t.synthesis && (t.synthesis.contradicted?.length ?? 0) > 0 && (
                <details className="text-xs text-amber-800 dark:text-amber-300" data-council-contradicted="true">
                  <summary className="cursor-pointer">{tr('showContradicted')}</summary>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {t.synthesis.contradicted!.map((c) => (
                      <li key={c.sentence}>
                        “{c.sentence}” <span className="text-slate-600 dark:text-slate-400">{c.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {t.synthesis && t.synthesis.removed.length > 0 && (
                <details className="text-xs text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer">{tr('showRemoved')}</summary>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {t.synthesis.removed.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </details>
              )}
    </>
  );

  /** The one-line source note under an answer: the agents that gave figures and the model that wrote it. */
  const sourceLine = (t: Turn, writingNow: boolean) => {
    const from = t.asked.answers.filter((a) => a.findings.length).map((a) => a.name);
    const model = t.synthesis?.provider?.match(/\(([^·)]+)/)?.[1]?.trim() || t.synthesis?.provider;
    const writer = /^Local Ollama/.test(t.synthesis?.provider || '') ? tr('localAi', { model: model || '' }) : model || tr('theAiModel');
    const by = writingNow ? tr('summaryWriting') : t.synthesis?.brief ? tr('writtenBy', { writer }) : tr('noAiSummary');
    return `${from.length ? tr('fromAgents', { list: from.join(', ') }) : tr('noAgentFigures')} · ${by}`;
  };

  /** The council's answer to one question: summary first, then the agents, debate and downloads. */
  const councilReply = (t: Turn, live: boolean) => {
    const b = t.synthesis?.brief;
    const writingNow = live && writing;
    const debatingNow = live && debating;
    const savedT = toSaved(t, !debatingNow);
    const withFindings = t.asked.answers.filter((a) => a.findings.length).length;
    const docCtx = { question: t.asked.question, askedAt: t.asked.askedAt, scope: t.asked.plan.scopeNote, countriesAsked: t.asked.plan.countries.length };
    const agentDocs = toAgentDocuments(t.asked.answers, docCtx);
    const synthDoc = toSynthesisDocument(agentDocs, t.synthesis, docCtx);
    const allDocsSaved = !writingNow && [synthDoc, ...agentDocs].every((d) => savedDocIds.has(d.id));
    return (
      <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 space-y-3" data-council-result={live ? 'true' : 'earlier'}>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{tr('councilLabel')}</span> · {tr('about', { scope: tx(t.asked.plan.scopeNote) })} · {time(t.asked.askedAt)}
        </p>

        {t.changes && (
          <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-1" data-council-changes={t.changes.changes.length + t.changes.stanceChanges.length}>
            <div className="ui-label">
              {tr('changedSince', { when: t.changes.sinceAskedAt.slice(0, 16).replace('T', ' '), question: t.changes.sinceQuestion })}
            </div>
            <ul className="text-sm text-slate-800 dark:text-slate-200 space-y-0.5">
              {changeLines(t.changes).map((l, i) => (
                <li key={i} className={l.startsWith('- ') ? 'pl-3' : 'text-xs text-slate-500 dark:text-slate-400'}>
                  {l.replace(/^- /, '• ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2" data-council-summary="true">
          {writingNow ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr('writing')}</p>
          ) : b?.explain ? (
            <>
              <ExplainAnswer headline={b.headline} explain={b.explain} answers={t.asked.answers} />
              {removedNotes(t)}
            </>
          ) : b ? (
            <>
              {b.headline && <p className="text-sm font-medium text-slate-900 dark:text-white">{b.headline}</p>}
              {b.points.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-slate-800 dark:text-slate-200 space-y-1">
                  {b.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {b.disagreements.length > 0 && (
                <div>
                  <div className="ui-label mt-1">{tr('disagree')}</div>
                  <ul className="list-disc pl-5 text-sm text-slate-800 dark:text-slate-200 space-y-1">
                    {b.disagreements.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {removedNotes(t)}
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300" data-council-no-summary="true">
              {tr('noSummary')} <SettingsText text={t.synthesis?.reason || ''} /> {tr('noSummaryTail')}
            </p>
          )}
        </div>

        {/* What-if scenario card: the calculator's numbers for each country named (up to two), editable. */}
        {(() => {
          const wq = parseWhatIf(t.asked.question);
          return wq
            ? t.asked.plan.countries.slice(0, 2).map((c) => (
                <React.Suspense key={`whatif-${t.asked.askedAt}-${c.iso3}`} fallback={<p className="text-xs text-slate-500 dark:text-slate-400">Working out the scenario…</p>}>
                  <WhatIfCard question={wq} item={c} />
                </React.Suspense>
              ))
            : null;
        })()}

        {/* The Chart Agent's chart and test results, when the question asked for one. */}
        {t.asked.answers
          .filter((a) => a.chart)
          .map((a) => (
            <React.Suspense key={`chart-${t.asked.askedAt}`} fallback={<p className="text-xs text-slate-500 dark:text-slate-400">{tr('drawingChart')}</p>}>
              <CouncilChartCard result={a.chart!} />
            </React.Suspense>
          ))}

        {live && t.asked.plan.offWatchlistIso3 && t.asked.plan.offWatchlistIso3.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-council-off-watchlist="true">
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => void addForQuestion()}>
              {tr('addFor', { list: t.asked.plan.offWatchlist?.join(', ') || '' })}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">{tr('addForNote')}</span>
            {adding && <span className="text-xs text-amber-700 dark:text-amber-400"><SettingsText text={adding} /></span>}
          </div>
        )}

        {(t.debate || (live && t.asked.answers.filter((a) => a.id !== 'doc' && a.findings.length).length >= 2)) && (
          <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-council-debate="true">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="ui-label">{tr('debate')}</div>
              {live && !t.debate && (
                <button type="button" className="ui-btn" onClick={() => void runDebate()} disabled={busy}>
                  {tr('letDebate')}
                </button>
              )}
            </div>
            {!t.debate ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">{tr('debateIntro')}</p>
            ) : t.debate.challenges.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">{tr('debateNone')}</p>
            ) : (
              <>
                <ol className="space-y-3">
                  {t.debate.challenges.map((c, i) => {
                    const r = t.debate!.replies?.find((x) => x.index === i);
                    return (
                      <li key={`${c.iso3}-${c.from}-${c.to}`} className="text-sm space-y-1" data-debate-challenge={`${c.from}>${c.to}`}>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {tr('challenge', { country: c.countryName, from: c.fromName, to: c.toName })}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{tr('agentSaid', { agent: c.toName, claim: c.claim })}</p>
                        <p className="text-slate-800 dark:text-slate-200">{c.challenge}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{tr('settle', { settle: c.settle })}</p>
                        {r && (
                          <p className="border-l-2 border-blue-300 dark:border-blue-700 pl-2 text-slate-800 dark:text-slate-200" data-debate-reply="true">
                            <span className="text-slate-500 dark:text-slate-400">{tr('agentReplies', { agent: c.toName })}</span>
                            {r.reply}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {debatingNow ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tr('debateAsking')}</p>
                ) : t.debate.replies ? (
                  <>
                    {t.debate.verdict && (
                      <p className="text-sm text-slate-900 dark:text-white">
                        <span className="text-slate-500 dark:text-slate-400">{tr('lands')}</span>
                        {t.debate.verdict}
                      </p>
                    )}
                    {!!t.debate.open?.length && (
                      <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                        {t.debate.open.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                    {!!t.debate.removed?.length && (
                      <details className="text-xs text-amber-700 dark:text-amber-400">
                        <summary className="cursor-pointer">{tr('debateRemoved', { n: t.debate.removed.length })}</summary>
                        <ul className="list-disc pl-5 mt-1">
                          {t.debate.removed.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tr('debateFoot', { provider: t.debate.provider ? ` (${t.debate.provider})` : '' })}
                    </p>
                    {smallRefereeNote(t.debate.provider) && (
                      <p className="text-xs text-amber-800 dark:text-amber-300" data-council-small-referee="debate">
                        <SettingsText text={smallRefereeNote(t.debate.provider)!} />
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tr('noReplies', { reason: t.debate.reason || tr('noModelAnswered') })}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Sources fold: one quiet line under the answer, so the text reads straight through (Sam, 2026-11-08).
            Opening it shows who wrote the summary, the snapshot, each document, and the actions. */}
        <details className="group" data-council-sources="true">
          <summary className="cursor-pointer list-none text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span> {sourceLine(t, writingNow)}
            <span className="text-blue-700 dark:text-blue-300">{tr('sourcesActions')}</span>
          </summary>
          <div className="mt-2 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr(t.synthesis?.brief?.explain ? 'aiExplanationBy' : 'aiSummaryBy', { model: t.synthesis?.provider || tr('configuredModel') })}
              {t.synthesis && t.synthesis.removed.length > 0 && tr('removedNumbers', { n: t.synthesis.removed.length })}
              {t.synthesis && (t.synthesis.contradicted?.length ?? 0) > 0 && tr('removedContradicted', { n: t.synthesis.contradicted!.length })}
            </p>
            {t.synthesis?.snapshot && <AnswerSnapshotDetails snapshot={t.synthesis.snapshot} runtimeConfig={runtimeConfig} />}
            {/* Each agent's standard document, and the synthesis document, as cards that open the document. */}
            <DocumentCards
              agents={agentDocs}
              synthesis={writingNow ? null : synthDoc}
              writing={writingNow}
              onOpen={setOpenDoc}
              savedIds={savedDocIds}
              note={
                <span data-council-agents="true">
                  {t.asked.answers.length === 1 ? tr('agentsAnsweredOne', { n: withFindings }) : tr('agentsAnsweredMany', { n: withFindings, total: t.asked.answers.length })}
                </span>
              }
            />
            {!page && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-blue-700 dark:text-blue-300">{tr('showLayout')}</summary>
                <div className="mt-2 space-y-2">
                  <AgentNetwork title={tr('agentsOn', { scope: tx(t.asked.plan.scopeNote) })} columns={askCouncilColumns(t.asked.answers, writingNow, t.synthesis, t.asked.plan.chosenBy)} />
                  {t.asked.plan.chooserNote && (
                    <p className="text-xs text-slate-500 dark:text-slate-400" data-council-chooser={t.asked.plan.chosenBy}>
                      {tx(t.asked.plan.chooserNote)}
                    </p>
                  )}
                </div>
              </details>
            )}
            {/* One row of actions for the whole answer: save it (brief + every document), copy, download. */}
            <div className="flex flex-wrap items-center gap-1.5" data-council-answer-actions="true">
              {allDocsSaved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400" data-council-saved="true">
                  <FileText className="w-3.5 h-3.5" /> {tr('savedToReports')}
                  <button type="button" className="text-blue-700 dark:text-blue-300 hover:underline" onClick={onSendToReports}>
                    {tr('openReports')}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="ui-btn"
                  disabled={writingNow || !savedT}
                  onClick={() => saveAnswer(savedT, [synthDoc, ...agentDocs])}
                  title={tr('saveTitle')}
                  data-council-save="true"
                >
                  <FileText className="w-3.5 h-3.5" /> {tr('saveToReports')}
                </button>
              )}
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                disabled={writingNow}
                title={tr('startReviewTitle')}
                data-council-start-review="true"
                onClick={() => startPolicyReview({ iso3: t.asked.plan.countries.length === 1 ? t.asked.plan.countries[0].iso3 : undefined, problem: t.asked.question })}
              >
                <ClipboardList className="w-3.5 h-3.5" /> {tr('startReview')}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                disabled={writingNow}
                title={tr('logIdeaTitle')}
                data-council-log-idea="true"
                onClick={() => openIdeaJournal({ iso3: t.asked.plan.countries.length === 1 ? t.asked.plan.countries[0].iso3 : undefined, thesis: [t.asked.question, t.synthesis?.brief?.headline].filter(Boolean).join('\n') })}
              >
                <NotebookPen className="w-3.5 h-3.5" /> {tr('logIdea')}
              </button>
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => void copy(savedT)} disabled={writingNow}>
                <Copy className="w-3.5 h-3.5" /> {copied === t.asked.askedAt ? tr('copied') : tr('copy')}
              </button>
              <details className="relative" data-council-download="true">
                <summary className={`ui-btn ui-btn-ghost list-none cursor-pointer ${writingNow ? 'pointer-events-none opacity-50' : ''}`}>
                  <Download className="w-3.5 h-3.5" /> {tr('download')}
                </summary>
                <div className="absolute z-20 mt-1 left-0 min-w-[10rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm py-1">
                  <button type="button" className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; void downloadCouncilBrief(savedT, 'md'); }}>
                    Markdown (.md)
                  </button>
                  <button type="button" className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; void downloadCouncilBrief(savedT, 'pdf'); }}>
                    PDF
                  </button>
                </div>
              </details>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr('footer')}</p>
          </div>
        </details>
      </div>
    );
  };

  return (
    <section
      className={`flex flex-col ${page ? 'h-full' : 'ui-panel'} ${onClose ? 'h-full' : ''}`}
      data-ask-council="true"
      data-council-layout={page ? 'page' : onClose ? 'dock' : 'card'}
     
     
    >
      <header className={`flex items-center justify-between gap-2 ${page ? 'pb-2' : 'ui-panel-header'}`}>
        <div className="min-w-0">
          <h3 className="ui-section-title whitespace-nowrap">{tr('title')}</h3>
          {uses}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(asked || fullCouncilInChat) && (
            <button type="button" className="ui-btn ui-btn-ghost" onClick={newConversation} disabled={busy} data-council-new="true" aria-label={tr('newConversation')}>
              <span className="sm:hidden">{tr('newShort')}</span><span className="hidden sm:inline">{tr('newConversation')}</span>
            </button>
          )}
          {toolbar}
          {onClose && (
            <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose} aria-label={tr('closeAria')} data-council-close="true">
              <X className="w-3.5 h-3.5" /> {tr('close')}
            </button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className={`overflow-y-auto ${page || onClose ? 'flex-1 min-h-0' : 'max-h-[70vh] min-h-[16rem]'}`} data-council-chat="true" aria-live="polite">
        <div className={`space-y-4 py-3 ${page ? 'max-w-3xl mx-auto px-1 sm:px-4' : 'px-4'}`}>
        {!asked && !choosing && !fullCouncilInChat && (
          <div className={page ? 'pt-[12vh] text-center space-y-4' : 'border-l-2 border-slate-300 dark:border-slate-600 pl-3 space-y-2'} data-council-welcome="true">
            <p className={page ? 'text-xl font-semibold text-slate-900 dark:text-white' : 'text-sm text-slate-800 dark:text-slate-200'}>
              {tr('welcome')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr('welcomeNote')}
            </p>
            {tr('askInEnglish') && (
              <p className="text-xs text-amber-800 dark:text-amber-300" data-council-ask-in-english="true">
                {tr('askInEnglish')}
              </p>
            )}
            <div className={`flex flex-wrap gap-1.5 ${page ? 'justify-center' : ''}`}>
              {suggestions.map((sug) => (
                <button
                  key={sug.text}
                  type="button"
                  className="ui-pill"
                  disabled={busy}
                  onClick={() => void ask(sug.text, 'new')}
                  title={sug.why || undefined}
                  data-council-suggestion={sug.kind}
                >
                  {SUGGESTION_KIND_LABEL[sug.kind] && <span className="text-slate-500 dark:text-slate-400">{SUGGESTION_KIND_LABEL[sug.kind]} · </span>}
                  {sug.text}
                </button>
              ))}
            </div>
            <details className={`text-xs ${page ? 'mx-auto max-w-xl' : ''}`} data-council-chart-menu="true">
              <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">{tr('chartsMenu')}</summary>
              <div className="mt-2 text-left space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400">
                  {tr('chartsHelp')}
                </p>
                <ul className="space-y-1">
                  {PRESETS.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="text-left hover:underline disabled:opacity-50" disabled={busy} onClick={() => void ask(`Chart the ${p.name}`, 'new')} data-council-preset={p.id}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">: {p.about}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        )}

        {past.map((t) => (
          <React.Fragment key={t.asked.askedAt}>
            {userMessage(t.asked.question, t.asked.askedAt)}
            {councilReply(t, false)}
          </React.Fragment>
        ))}

        {asked && current && (
          <>
            {userMessage(asked.question, asked.askedAt, 'q-live')}
            {extra.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr('addedSession', { list: extra.map((e) => e.countryName).join(', ') })}</p>
            )}
            {councilReply(current, true)}
          </>
        )}

        {choosing && (
          <p className="text-sm text-slate-500 dark:text-slate-400" data-council-choosing="true">
            {tr('choosing')}
          </p>
        )}

        {fc && fullCouncilInChat && (
          <>
            {userMessage(tr('runFullMessage', { country: fc.countryName }))}
            <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 space-y-3" data-full-council={fc.stage}>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">{tr('fullCouncil')}</span> · {fc.countryName}</p>
              {!page && fc.progressId && phase !== 'idle' && (
                <AgentNetwork
                  title={tr('fullCouncilOn', { country: fc.countryName })}
                  columns={fullCouncilColumns(steps, phase)}
                  footnote={tr('deskFootnote')}
                />
              )}
              {fc.stage === 'AWAITING_CRO_APPROVAL' ? (
                <CouncilApprovalCard
                  countryName={fc.countryName}
                  deskState={fc.deskState}
                  draft={fc.draft}
                  isApproving={fc.isApproving}
                  onApprove={fc.onApprove}
                  onChangeDraft={fc.onChangeDraft}
                  onOpenFullReview={fc.onOpenFullReview}
                />
              ) : fc.isRunning ? (
                <p className="text-sm text-slate-700 dark:text-slate-300">{tr('desksWorking')}</p>
              ) : fc.isApproving ? (
                <p className="text-sm text-slate-700 dark:text-slate-300">{tr('approved', { country: fc.countryName })}</p>
              ) : fc.result ? (
                <div className="space-y-1" data-full-council-result="true">
                  <div className="ui-label">{tr('finalReport', { id: fc.result.reportId })}</div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {fc.countryName}: {VERDICT[fc.result.verdict] ? tr(VERDICT[fc.result.verdict]!) : fc.result.verdict}
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{fc.result.summary}</p>
                  <FigureCheckNote check={fc.result.figureCheck?.desks} what="desk debates" />
                  <FigureCheckNote check={fc.result.figureCheck?.report} what="final report" />
                  {fc.result.timing && <CouncilTimingNote timing={fc.result.timing} />}
                  {fc.onOpenFullReview && (
                    <button type="button" className="ui-btn" onClick={fc.onOpenFullReview}>
                      {tr('openFullReport')}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
        </div>
      </div>

      <form
        className={page ? 'w-full max-w-3xl mx-auto pt-2 pb-1 space-y-2' : 'px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2'}
        data-council-composer="true"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {asked && !busy && (
          <div className="flex flex-wrap gap-1.5" data-council-followup="true">
            {suggestFollowUps(asked.plan, asked.answers).map((sug) => (
              <button key={sug} type="button" className="ui-pill" onClick={() => void ask(sug, 'followup')}>
                {sug}
              </button>
            ))}
          </div>
        )}
        <label htmlFor="council-question" className="sr-only">
          {asked ? tr('followUpLabel') : tr('questionLabel')}
        </label>
        <div className={`flex gap-2 items-end ${page ? 'p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm' : ''}`}>
          <textarea
            id="council-question"
            rows={2}
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={asked ? tr('placeholderFollowUp') : tr('placeholderNew')}
            className={`flex-1 min-w-0 px-2 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${page ? 'border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none' : 'border border-slate-200 dark:border-slate-700'}`}
          />
          <button type="submit" className="ui-btn ui-btn-primary" disabled={!question.trim() || busy}>
            {tr('send')}
          </button>
        </div>
        {pinned && (
          <p className="text-xs text-slate-500 dark:text-slate-400" data-council-pinned="true">
            {tr('pinnedAt', { when: new Date(pinned.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}{' '}
            <button type="button" className="underline hover:text-slate-800 dark:hover:text-slate-200" onClick={() => pinData(false)}>
              {tr('useLatest')}
            </button>
          </p>
        )}
        <details className="group" data-council-options="true">
          <summary className="cursor-pointer select-none text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            {tr('options')}{lib.briefs.length ? tr('optionsSaved') : ''}
            {docs.length ? tr(docs.length === 1 ? 'docsInUseOne' : 'docsInUseMany', { n: docs.length }) : ''}
          </summary>
          <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {!asked && (
            <label className="ui-label flex items-center gap-1.5">
              <span>{tr('countries')}</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="px-1.5 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-[14rem]"
              >
                <option value="">{tr('asNamed')}</option>
                {items.map((i) => (
                  <option key={i.iso3} value={i.iso3}>
                    {i.countryName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {fc && !fc.isRunning && !fc.isApproving && fc.stage !== 'AWAITING_CRO_APPROVAL' && (
            <button type="button" className="ui-btn" onClick={fc.onRun} title={tr('runFullTitle', { country: fc.countryName })}>
              {fc.result ? tr('runFullAgain', { country: fc.countryName }) : tr('runFullMessage', { country: fc.countryName })}
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={Boolean(pinned)} onChange={(e) => pinData(e.target.checked)} disabled={busy} data-council-pin="true" />
          {tr('pinLabel')}
        </label>
        <PolicyDocsPicker docs={docs} onChange={changeDocs} disabled={busy} />
        <SavedDocsRow lib={lib} activeIds={docs.map((d) => d.id)} canAdd={docs.length < MAX_DOCS && !busy} onUse={(d) => setDocs((cur) => (cur.some((x) => x.id === d.id) || cur.length >= MAX_DOCS ? cur : [...cur, d]))} />
            <SavedResearchList lib={lib} toMarkdown={toMarkdown} onSendToReports={onSendToReports} />
          </div>
        </details>
      </form>
      {openDoc && <DocumentViewer doc={openDoc} items={items} onOpenCountry={(it) => { setOpenDoc(null); onOpenCountry(it); }} onClose={closeDoc} actions={<SaveToReportsButton saved={savedDocIds.has(openDoc.id)} onSave={() => void lib.saveCouncilDocs([openDoc])} />} />}
    </section>
  );
};

/**
 * Workspace > Agents: the agents on the latest question (and the full council, when one runs),
 * each with its live status, beside the chat instead of inside it. Statuses are the same ones
 * the chat used to show: from the browser for Council chat, from the server for the full council.
 */
export const CouncilAgentsPanel: React.FC<{ fullCouncil?: FullCouncilStep }> = ({ fullCouncil: fc }) => {
  const { asked, synthesis, writing, choosing } = useCouncilChat();
  const phase = fullCouncilPhase(fc);
  const steps = useCouncilProgress(fc?.progressId ?? null, Boolean(fc && (fc.isRunning || fc.isApproving)));
  const showFull = Boolean(fc?.progressId && phase !== 'idle');
  const tr = useT(COUNCIL);
  const tx = useTx();
  return (
    <div className="space-y-4" data-council-agents-panel="true">
      {choosing && (
        <p className="text-sm text-slate-500 dark:text-slate-400" data-agents-choosing="true">
          {tr('choosing')}
        </p>
      )}
      {asked && !choosing && (
        <div className="space-y-2" data-agents-question="true">
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2" title={asked.question}>
            “{asked.question}”
          </p>
          <AgentNetwork
            stacked
            title={tr('aboutTitle', { scope: tx(asked.plan.scopeNote) })}
            columns={askCouncilColumns(asked.answers, writing, synthesis, asked.plan.chosenBy)}
          />
          {asked.plan.chooserNote && (
            <p className="text-xs text-slate-500 dark:text-slate-400" data-council-chooser={asked.plan.chosenBy}>
              {tx(asked.plan.chooserNote)}
            </p>
          )}
        </div>
      )}
      {fc && showFull && (
        <AgentNetwork
          stacked
          title={tr('fullCouncilOn', { country: fc.countryName })}
          columns={fullCouncilColumns(steps, phase)}
          footnote={tr('deskFootnote')}
        />
      )}
      {!asked && !choosing && !showFull && (
        <p className="text-sm text-slate-500 dark:text-slate-400" data-agents-empty="true">
          {tr('noQuestion')}
        </p>
      )}
    </div>
  );
};
