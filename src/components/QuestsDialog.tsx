/**
 * Menu > Quests (read only): open questions anyone can answer, argue and check, each with the rule
 * that settles it and the latest value of the series it reads. Shown only when Quests are switched
 * on (QUESTS_ENABLED=on, docs/QUESTS.md). Forecasts can be logged privately on this computer,
 * practised on past data, and compared in a class table; nothing here is published. Debate Quests
 * show their recorded opening brief, take a position and an argument (checked by Claim Check as it
 * is written), and close with an evidence map that exports as Markdown. Replication Quests take a
 * script's figure; Signal Quests take a pre-registered test, shown after close with its verdict.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Compass, X } from 'lucide-react';
import { QUEST_LEVELS, type DebateQuest, type Quest, type QuestHorizon, type QuestLevel, type QuestStatus, type QuestType, type ReplicationQuest, type SignalQuest } from '../utils/quests';
import { SIGNAL_FLOOR, SIGNAL_METHODS, SIGNAL_TEMPLATE, signalTestProblems, type SignalTest } from '../utils/questSignal';
import { describeOutcome, OUTCOME_WORDS, type OutcomeWords, type QuestResultState, type ResolutionDraft, type ResolutionLine } from '../utils/questResolve';
import type { BoardRow, ContributorStats, Gated, QuestStats } from '../utils/questStats';
import type { OnTimeState, QuestHealth } from '../utils/questHealth';
import type { LiveWatchlistItem } from '../types/council';
import { newFileUrl, type PublicEntry } from '../utils/questPublicEntries';
import { profileFileText, profilePath, stancesProblems, stanceWords, type StanceAxis, type StanceProfile, type Stances, type StanceValue } from '../utils/questStances';
import { ARGUMENT_MIN } from '../utils/questEntries';
import { questSeriesDef } from '../utils/questSeries';
import { describeRule, RULE_WORDS, type QuestRule, type RuleWords } from '../utils/questRules';
import { packText, type QuestPack } from '../utils/questPacks';
import { questTextIn, questTitleIn, type QuestTranslationLang, type QuestText, type QuestTranslationMap } from '../utils/questTranslations';
import { useLang, useT, useTx } from '../i18n/useLang';
import { ClassesView } from './ClassesView';
import { SealedHandInTab } from './ClassHandInFile';
import { QuestReplays } from './QuestReplays';
import { questDataProblemUrl } from '../utils/problemReport';
import { APP_CITATION } from '../utils/citation';
import { versionWithCommit } from '../utils/buildInfo';
import { QUESTS } from '../i18n/messages/quests';
import { readLang, translateText } from '../i18n/lang';
import { checkArgument, evidenceMap, evidenceMarkdown, type ArgumentCheck, type DebateBrief, type EvidenceMap } from '../utils/questDebate';

type Summary = {
  id: string;
  version: number;
  type: QuestType;
  title: string;
  countries: string[];
  topics: string[];
  region: string;
  approved: boolean;
  tutorial: boolean;
  level?: QuestLevel | null;
  status: QuestStatus;
  horizon: QuestHorizon;
  horizonLabel: string;
  opensOn: string;
  closesOn: string;
  settlesOn: string;
  practice?: boolean;
};
type Figure = { country: string; series: string; label: string; value?: number; date?: string; unit?: string; source?: string; missing?: string };
type ListReply = { enabled: false; reason: string } | { enabled: true; quests: Summary[]; translations?: QuestTranslationMap; packs?: QuestPack[] };
type Detail = { enabled: true; quest: Quest; summary: Summary; file: string; rule?: string; fallback?: string; figures: Figure[]; result?: QuestResultState; translations?: Partial<Record<QuestTranslationLang, QuestText>>; brief?: { brief: DebateBrief; hashOk: boolean } | null; related?: EvidenceMap['related'] };

const QUEST_TYPE_LIST: QuestType[] = ['forecast', 'signal', 'replication', 'debate'];
type T = (key: keyof typeof QUESTS.en, vars?: Record<string, string | number>) => string;

/** A rule and a result in the chosen language, from the same parts the English is built from. */
function useQuestWords() {
  const t = useT(QUESTS);
  const tx = useTx();
  const pick = <W extends Record<string, string>>(en: W) => Object.fromEntries(Object.keys(en).map((k) => [k, t(k as keyof typeof QUESTS.en)])) as W;
  return {
    rule: (r: QuestRule) => describeRule(r, pick<RuleWords>(RULE_WORDS), tx),
    /** A series' name with its country, e.g. "Policy rate (BRA)", in the chosen language. */
    series: (series: string, country: string) => {
      const label = tx(questSeriesDef(series)?.label ?? series);
      return country === 'WLD' ? label : `${label} (${country})`;
    },
    unit: (series: string) => tx(questSeriesDef(series)?.unit ?? ''),
    outcome: (l: Parameters<typeof describeOutcome>[0]) => describeOutcome(l, pick<OutcomeWords>(OUTCOME_WORDS), tx),
  };
}

export function QuestsDialog({ onClose, items = [], focusId = null, classesOn = false }: { onClose: () => void; items?: LiveWatchlistItem[]; focusId?: string | null; classesOn?: boolean }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [list, setList] = useState<ListReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<QuestType | ''>('');
  const [horizon, setHorizon] = useState<QuestHorizon | ''>('');
  const [level, setLevel] = useState<QuestLevel | ''>('');
  const [packId, setPackId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [view, setView] = useState<'quests' | 'replay' | 'mine' | 'class' | 'results' | 'board' | 'stances' | 'health' | 'maint' | 'classes' | 'handin'>('quests');
  const lang = useLang();
  const t = useT(QUESTS);
  const [english, setEnglish] = useState(false);
  const shownLang = english ? 'en' : lang;
  const listTr = list && list.enabled ? list.translations : undefined;
  const tx = useTx();
  const words = useQuestWords();
  const titleOf = useCallback((id: string, english: string) => questTitleIn(id, english, shownLang, listTr), [shownLang, listTr]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    fetch('/api/quests')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setList)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  const open = useCallback(async (id: string) => {
    setOpenId(id);
    setEnglish(false);
    setDetail(null);
    setDetailError(null);
    try {
      const r = await fetch(`/api/quests/${encodeURIComponent(id)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.enabled) throw new Error(j?.error || j?.reason || `HTTP ${r.status}`);
      setDetail(j);
    } catch (e: any) {
      setDetailError(e?.message || String(e));
    }
  }, []);

  // Opened from a link on a country page or under a Council chat answer: straight to that Quest.
  useEffect(() => {
    if (focusId) void open(focusId);
  }, [focusId, open]);

  const field = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
  const quests = list && list.enabled ? list.quests.filter((q) => (!type || q.type === type) && (!horizon || q.horizon === horizon) && (!level || q.level === level)) : [];
  const packs = (list && list.enabled && list.packs) || [];
  const pack = packs.find((p) => p.id === packId);
  const row = (q: Summary) => (
    <li key={q.id}>
      <button type="button" onClick={() => open(q.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" data-quest-row={q.id}>
        <div className="text-sm text-slate-900 dark:text-white">{questTextIn({ ...q, summary: '', knownLimits: [] }, shownLang, listTr).title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t('rowMeta', { type: t(`type_${q.type}`), status: t(q.approved ? `status_${q.status}` : 'status_draft'), horizon: t(`h_${q.horizon}`), date: q.settlesOn })}
          {q.level ? ` · ${t(`level_${q.level}`)}` : ''}
          {q.tutorial ? ` · ${t('tutorial')}` : ''}
          {q.practice ? ` · ${t('practiceNow')}` : ''}
        </div>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="quests-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl" data-quests>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="quests-title" className="ui-title inline-flex items-center gap-2">
            <Compass className="w-4 h-4" aria-hidden /> {t('title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('close')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          {error && <p className="text-sm text-rose-700 dark:text-rose-400">{t('loadFailed', { error })}</p>}
          {list && !list.enabled && <p className="text-sm text-slate-600 dark:text-slate-300">{list.reason}</p>}
          {list && !list.enabled && classesOn && <ClassesView />}
          {list && list.enabled && !openId && (
            <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist">
              {(
                [
                  'quests',
                  'replay',
                  'mine',
                  'class',
                  'results',
                  'board',
                  'stances',
                  'health',
                  'maint',
                  ...(classesOn ? (['classes'] as const) : []),
                  'handin',
                ] as const
              ).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`px-3 py-1.5 text-sm ${view === k ? 'border-b-2 border-blue-600 text-slate-900 dark:text-white' : 'text-slate-500'}`} data-quests-tab={k}>
                  {t(`tab_${k}`)}
                </button>
              ))}
            </div>
          )}
          {list && list.enabled && !openId && view === 'replay' && <QuestReplays />}
          {list && list.enabled && !openId && view === 'mine' && <MyEntries titleOf={titleOf} />}
          {list && list.enabled && !openId && view === 'class' && <ClassTable />}
          {list && list.enabled && !openId && view === 'results' && <Results titleOf={titleOf} />}
          {list && list.enabled && !openId && view === 'board' && <Scoreboard />}
          {list && list.enabled && !openId && view === 'stances' && <StancesView />}
          {list && list.enabled && !openId && view === 'health' && <Health titleOf={titleOf} />}
          {list && list.enabled && !openId && view === 'maint' && <Maintainer />}
          {list && list.enabled && !openId && view === 'classes' && <ClassesView />}
          {list && list.enabled && !openId && view === 'handin' && <SealedHandInTab />}
          {list && list.enabled && !openId && view === 'quests' && (
            <>
              <ThisWeek onOpen={open} titleOf={titleOf} />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('intro')}
              </p>
              <div className="flex flex-wrap gap-2">
                {packs.length > 0 && (
                  <label className="text-xs inline-flex items-center gap-1">
                    <span>{t('filterPack')}</span>
                    <select className={field} value={packId} onChange={(e) => setPackId(e.target.value)} data-quests-pack>
                      <option value="">{t('allQuests')}</option>
                      {packs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {packText(p.title, lang)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs inline-flex items-center gap-1">
                  <span>{t('filterType')}</span>
                  <select className={field} value={type} onChange={(e) => setType(e.target.value as QuestType | '')} data-quests-type>
                    <option value="">{t('all')}</option>
                    {QUEST_TYPE_LIST.map((k) => (
                      <option key={k} value={k}>
                        {t(`type_${k}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs inline-flex items-center gap-1">
                  <span>{t('filterLevel')}</span>
                  <select className={field} value={level} onChange={(e) => setLevel(e.target.value as QuestLevel | '')} data-quests-level>
                    <option value="">{t('anyLevel')}</option>
                    {QUEST_LEVELS.map((k) => (
                      <option key={k} value={k}>
                        {t(`level_${k}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs inline-flex items-center gap-1">
                  <span>{t('filterDue')}</span>
                  <select className={field} value={horizon} onChange={(e) => setHorizon(e.target.value as QuestHorizon | '')} data-quests-horizon>
                    <option value="">{t('anyTime')}</option>
                    {(['week', 'month', 'quarter', 'year', 'multi_year'] as const).map((h) => (
                      <option key={h} value={h}>
                        {t(`h_${h}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {pack && (
                <div className="space-y-3" data-quest-pack={pack.id}>
                  <p className="text-sm">{packText(pack.summary, lang)}</p>
                  {pack.level && <p className="text-xs text-slate-500 dark:text-slate-400" data-quest-pack-level>{t('packLevel', { level: t(`level_${pack.level}`) })}</p>}
                  {pack.groups.map((g) => {
                    const inGroup = g.quests.map((id) => quests.find((q) => q.id === id)).filter((q): q is Summary => Boolean(q));
                    return inGroup.length ? (
                      <div key={g.id} className="space-y-1" data-quest-pack-group={g.id}>
                        <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">{packText(g.title, lang)}</h3>
                        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">{inGroup.map(row)}</ul>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              {!pack &&
                (quests.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('noMatch')}</p>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">{quests.map(row)}</ul>
                ))}
            </>
          )}
          {openId && (
            <div className="space-y-3">
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setOpenId(null)}>
                {t('back')}
              </button>
              {detailError && <p className="text-sm text-rose-700 dark:text-rose-400">{t('detailFailed', { error: detailError })}</p>}
              {!detail && !detailError && <p className="text-sm text-slate-500">{t('loading')}</p>}
              {detail && (() => {
                const qd = detail.quest as Quest & { positions?: string[]; hypothesis?: string; target?: string };
                const tr = questTextIn(qd, lang, detail.translations ? { [`${qd.id}@${qd.version}`]: detail.translations } : undefined);
                const text = english ? questTextIn(qd, 'en', undefined) : tr;
                return (
                <>
                  <h3 className="text-base text-slate-900 dark:text-white">{text.title}</h3>
                  {tr.translated && (
                    <p className="text-xs text-slate-500 dark:text-slate-400" data-quest-translated>
                      {t('translatedNote', { who: tr.translator || '?' })}{' '}
                      <button type="button" className="underline" onClick={() => setEnglish((v) => !v)}>
                        {english ? t('showTranslation') : t('showEnglish')}
                      </button>
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('detailMeta', { type: t(`type_${detail.quest.type}`), status: detail.summary.approved ? t(`status_${detail.summary.status}`) : t('draftNotApproved'), opens: detail.quest.opensOn, closes: detail.quest.closesOn, due: detail.summary.settlesOn })}
                  </p>
                  <p className="text-sm">{text.summary}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{t(`end_${detail.quest.type}`)}</p>
                  {detail.rule && (
                    <div className="border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                      <div className="text-xs text-slate-500">{t('rule')}</div>
                      <p className="text-sm">{detail.quest.type === 'forecast' ? words.rule(detail.quest.rule) : tx(detail.rule)}</p>
                      {detail.quest.type === 'forecast' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {detail.quest.fallback === 'unresolvable' ? t('fallbackNone') : t('fallbackRule', { rule: words.rule(detail.quest.fallback.rule) })}
                        </p>
                      )}
                    </div>
                  )}
                  {detail.quest.type === 'debate' && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">{t('positions')}</div>
                      <ul className="list-disc pl-5 text-sm">
                        {(text.positions ?? detail.quest.positions).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.quest.type === 'replication' && (
                    <p className="text-sm">
                      {t('reproduce', { target: text.target ?? detail.quest.target, tolerance: detail.quest.tolerance })}
                    </p>
                  )}
                  {detail.quest.type === 'signal' && <p className="text-sm">{t('ideaToTest', { text: text.hypothesis ?? detail.quest.hypothesis })}</p>}
                  {detail.figures.length > 0 && (
                    <table className="w-full text-sm" data-quest-figures>
                      <thead>
                        <tr className="text-xs text-slate-500 text-left">
                          <th className="py-1 pr-2 font-normal">{t('colSeries')}</th>
                          <th className="py-1 pr-2 font-normal">{t('colLatest')}</th>
                          <th className="py-1 font-normal">{t('colSource')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.figures.map((f) => (
                          <tr key={`${f.country}-${f.series}`} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="py-1 pr-2">{words.series(f.series, f.country)}</td>
                            <td className="py-1 pr-2 tabular-nums">{f.missing ? t('missingFig', { reason: tx(f.missing) }) : `${f.value} ${f.unit ?? ''} (${f.date})`}</td>
                            <td className="py-1 text-xs text-slate-500">{f.source ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="text-xs">
                    <a
                      className="underline text-slate-600 dark:text-slate-300"
                      href={questDataProblemUrl({
                        version: versionWithCommit(APP_CITATION.version),
                        questId: detail.quest.id,
                        questVersion: detail.quest.version,
                        title: detail.quest.title,
                        figures: detail.figures.map((f) => ({ series: `${f.label} (${f.country})`, shown: f.missing ? `Missing: ${f.missing}` : `${f.value} ${f.unit ?? ''} (${f.date})`.replace(/\s+/g, ' '), source: f.source })),
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-quest-report-data
                    >
                      {t('reportData')}
                    </a>{' '}
                    <span className="text-slate-500">{t('reportDataNote')}</span>
                  </p>
                  {text.knownLimits.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">{t('knownLimits')}</div>
                      <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {text.knownLimits.map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.result && detail.result.state !== 'none' && <ResultBox state={detail.result} />}
                  {detail.quest.type === 'forecast' && (
                    <>
                      <PublicEntries questId={detail.quest.id} />
                      <EnterPublicly quest={detail.quest} />
                      <LogPrivately quest={detail.quest} />
                      <Practice questId={detail.quest.id} />
                    </>
                  )}
                  {detail.quest.type === 'replication' && (
                    <>
                      <ReplicationEntries questId={detail.quest.id} />
                      <Replicate quest={detail.quest} />
                    </>
                  )}
                  {detail.quest.type === 'signal' && (
                    <>
                      <SignalEntries questId={detail.quest.id} />
                      <ProposeTest quest={detail.quest} />
                    </>
                  )}
                  {detail.quest.type === 'debate' && (
                    <>
                      <BriefBox brief={detail.brief ?? null} quest={{ ...detail.quest, positions: text.positions ?? detail.quest.positions }} />
                      <EvidenceMapBox quest={{ ...detail.quest, positions: text.positions ?? detail.quest.positions }} items={items} brief={detail.brief?.brief ?? null} related={detail.related ?? []} />
                      <Argue quest={{ ...detail.quest, positions: text.positions ?? detail.quest.positions }} items={items} />
                    </>
                  )}
                  <p className="text-xs text-slate-500">
                    {t('file', { file: detail.file })}
                    {detail.quest.discussion ? (
                      <>
                        {' · '}
                        <a className="underline" href={detail.quest.discussion} target="_blank" rel="noreferrer">
                          {t('discussion')}
                        </a>
                      </>
                    ) : null}
                  </p>
                </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const fieldCls = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2 border border-slate-200 dark:border-slate-800 p-3">
      <legend className="text-sm px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

async function send(url: string, body?: unknown) {
  const r = await fetch(url, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  // The server's reasons are English; shown in the chosen language where known.
  if (!r.ok || j.error) throw new Error(j?.error ? translateText(j.error, readLang()) : `HTTP ${r.status}`);
  return j;
}

function LogPrivately({ quest }: { quest: Quest }) {
  const t = useT(QUESTS);
  const level = quest.type === 'forecast' && quest.rule.kind === 'level';
  const [value, setValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [group, setGroup] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async () => {
    setMsg(null);
    try {
      const n = Number(value);
      const answer = level ? { level: n } : { probability: n / 100 };
      const j = await send(`/api/quests/${encodeURIComponent(quest.id)}/private`, { answer, rationale, ...(group ? { group } : {}) });
      setMsg(t('loggedHash', { time: String(j.entry.loggedAt).slice(0, 16).replace('T', ' '), hash: String(j.entry.hash).slice(0, 12) }));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  return (
    <Box title={t('logPrivately')}>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{level ? t('yourForecast') : t('probYes')}</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-answer />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">{t('classCode')}</span>
          <input className={`${fieldCls} w-36`} value={group} onChange={(e) => setGroup(e.target.value)} />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">{t('why')}</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>
      <button type="button" className="ui-btn" onClick={submit} disabled={!value.trim()} data-quest-log>
        {t('logHere')}
      </button>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
    </Box>
  );
}

function Practice({ questId }: { questId: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const words = useQuestWords();
  const [q, setQ] = useState<{ token: string; question: string; start?: { date: string; value: number }; endDate?: string; ref?: { country: string; series: string }; op?: 'higher' | 'lower' } | null>(null);
  const [p, setP] = useState('50');
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ask = async () => {
    setErr(null);
    setResult(null);
    try {
      setQ(await send(`/api/quests/${encodeURIComponent(questId)}/practice`));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  const answer = async () => {
    if (!q) return;
    try {
      const r = await send(`/api/quests/practice/${q.token}`, { probability: Number(p) / 100 });
      const vars = { start: r.start.value, startDate: r.start.date, end: r.end.value, endDate: r.end.date, brier: r.brier.toFixed(3) };
      setResult(
        t(r.happened ? 'practiceDid' : 'practiceDidNot', vars) +
          (r.baseBrier === null ? ` ${t('practiceNoBase')}` : t('practiceBase', { rate: `${(r.baseRate * 100).toFixed(0)}%`, base: r.baseBrier.toFixed(3), skill: r.skill.toFixed(3) })) +
          ` ${t('practiceOnly')}`,
      );
      setQ(null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  return (
    <Box title={t('practice')}>
      {!q && (
        <button type="button" className="ui-btn ui-btn-ghost" onClick={ask} data-quest-practice>
          {t('practiceNew')}
        </button>
      )}
      {q && (
        <div className="space-y-2">
          <p className="text-sm">
            {q.ref && q.start && q.endDate && q.op
              ? t(q.op === 'lower' ? 'practiceQLower' : 'practiceQHigher', { date: q.start.date, name: words.series(q.ref.series, q.ref.country), value: q.start.value, unit: words.unit(q.ref.series), end: q.endDate })
              : tx(q.question)}
          </p>
          <label className="text-xs inline-flex items-center gap-2">
            <span>{t('probability')}</span>
            <input className={`${fieldCls} w-24`} inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
          </label>
          <button type="button" className="ui-btn" onClick={answer}>
            {t('check')}
          </button>
        </div>
      )}
      {result && <p className="text-xs text-slate-600 dark:text-slate-300">{result}</p>}
      {err && <p className="text-xs text-rose-700 dark:text-rose-400">{err}</p>}
    </Box>
  );
}

type ScoredEntry = { entry: { id: string; questId: string; loggedAt: string; answer: { probability?: number; level?: number; position?: number; value?: number }; group?: string }; title: string; counted: boolean; hashOk: boolean; score: { status: string; note?: string; brier?: number; error?: number; skill?: number | null } };

function MyEntries({ titleOf }: { titleOf: (id: string, english: string) => string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<{ author: string; entries: ScoredEntry[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/private').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  if (!data.entries.length) return <p className="text-sm text-slate-500">{t('mineNone')}</p>;
  return (
    <table className="w-full text-sm" data-quest-mine>
      <thead>
        <tr className="text-xs text-slate-500 text-left">
          <th className="py-1 pr-2 font-normal">{t('colQuest')}</th>
          <th className="py-1 pr-2 font-normal">{t('colAnswer')}</th>
          <th className="py-1 font-normal">{t('colResult')}</th>
        </tr>
      </thead>
      <tbody>
        {data.entries.map((e) => (
          <tr key={e.entry.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
            <td className="py-1 pr-2">
              {titleOf(e.entry.questId, e.title)}
              <div className="text-xs text-slate-500">
                {e.entry.loggedAt.slice(0, 10)} · {e.counted ? t('counts') : t('replaced')}
                {e.hashOk ? '' : ` · ${t('hashBad')}`}
              </div>
            </td>
            <td className="py-1 pr-2 tabular-nums">{e.entry.answer.value !== undefined ? e.entry.answer.value : e.entry.answer.position !== undefined ? t('positionN', { n: e.entry.answer.position }) : e.entry.answer.level !== undefined ? e.entry.answer.level : `${Math.round((e.entry.answer.probability ?? 0) * 100)}%`}</td>
            <td className="py-1 text-xs">
              {e.score.status === 'settled' ? scoreLine(t, e.score) : tx(e.score.note ?? '')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "Brier 0.120; skill 0.050" (or Error for a number forecast) in the chosen language. */
function scoreLine(t: T, s: { brier?: number; error?: number; skill?: number | null }): string {
  const first = s.brier !== undefined ? t('scoreBrier', { v: s.brier.toFixed(3) }) : t('scoreError', { v: String(s.error) });
  return `${first}; ${t('skillIs', { v: s.skill === null || s.skill === undefined ? t('noBaseline') : s.skill.toFixed(3) })}`;
}

function ClassTable() {
  const t = useT(QUESTS);
  const tx = useTx();
  const [code, setCode] = useState('');
  const [data, setData] = useState<{ rows: Array<{ author: string; entries: number; settled: number; probabilitySkill: number | null; levelSkill: number | null }>; note: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    setErr(null);
    try {
      setData(await send(`/api/quests/class/${encodeURIComponent(code)}`));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('classIntro')}</p>
      <div className="flex gap-2">
        <input className={`${fieldCls} w-40`} placeholder={t('classPlaceholder')} value={code} onChange={(e) => setCode(e.target.value)} data-quest-class-code />
        <button type="button" className="ui-btn" onClick={load} disabled={!code.trim()}>
          {t('show')}
        </button>
      </div>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
      {data && (data.rows.length === 0 ? <p className="text-sm text-slate-500">{t('classNone')}</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">{t('colPerson')}</th>
              <th className="py-1 pr-2 font-normal">{t('colEntries')}</th>
              <th className="py-1 pr-2 font-normal">{t('colSettled')}</th>
              <th className="py-1 pr-2 font-normal">{t('colSkillBase')}</th>
              <th className="py-1 font-normal">{t('colSkillNoChange')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.author} className="border-t border-slate-200 dark:border-slate-800 tabular-nums">
                <td className="py-1 pr-2">{r.author}</td>
                <td className="py-1 pr-2">{r.entries}</td>
                <td className="py-1 pr-2">{r.settled}</td>
                <td className="py-1 pr-2">{r.probabilitySkill ?? t('noneYet')}</td>
                <td className="py-1">{r.levelSkill ?? t('noneYet')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {data && <p className="text-xs text-slate-500">{tx(data.note)}</p>}
    </div>
  );
}

/** One Quest's recorded result, with the decision on a dispute when there was one. */
function ResultBox({ state }: { state: Exclude<QuestResultState, { state: 'none' }> }) {
  const t = useT(QUESTS);
  const words = useQuestWords();
  const decision = 'decision' in state ? state.decision : undefined;
  return (
    <Box title={t('resultTitle', { state: t(`state_${state.state}`) })}>
      <p className="text-sm" data-quest-result={state.state}>
        {words.outcome(state.line)}
      </p>
      {decision && <p className="text-sm">{words.outcome(decision)}</p>}
      <p className="text-xs text-slate-500">
        {t('recorded', { date: state.line.at.slice(0, 10), who: state.line.by, n: state.line.seq })}
      </p>
    </Box>
  );
}

type ResultsReply = { chain: string; badLines: number; lines: ResolutionLine[]; quests: Array<{ questId: string; title: string } & QuestResultState> };
type DueReply = { today: string; due: Array<{ questId: string; title: string; approved: boolean; settlesOn: string; result: ResolutionDraft | null; waiting?: string }> };

/** The public record of results, and a preview of what the feeds give for Quests now due. */
function Results({ titleOf }: { titleOf: (id: string, english: string) => string }) {
  const t = useT(QUESTS);
  const words = useQuestWords();
  const tx = useTx();
  const [data, setData] = useState<ResultsReply | null>(null);
  const [due, setDue] = useState<DueReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/results').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  const check = async () => {
    setBusy(true);
    setErr(null);
    try {
      setDue(await send('/api/quests/due?drafts=1'));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3" data-quest-results>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('resultsIntro')}
      </p>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
      {data && (
        <p className={`text-sm ${data.chain === 'holds' ? '' : 'text-rose-700 dark:text-rose-400'}`} data-quest-chain>
          {data.chain === 'holds' ? t('chainIntact', { n: data.lines.length }) : t('chainBroken', { state: tx(data.chain) })}
          {data.badLines ? `; ${t('badLines', { n: data.badLines })}` : ''}.
        </p>
      )}
      {data && data.quests.length === 0 && <p className="text-sm text-slate-500">{t('noResults')}</p>}
      {data && data.quests.length > 0 && (
        <ul className="space-y-2">
          {data.quests.map((q) => (
            <li key={`${q.questId}-${q.state}`} className="border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
              <div className="font-medium">{titleOf(q.questId, q.title)}</div>
              {q.state !== 'none' && <div>{words.outcome(q.line)}</div>}
              {q.state !== 'none' && 'decision' in q && q.decision && <div>{words.outcome(q.decision)}</div>}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <button type="button" className="ui-btn" onClick={check} disabled={busy} data-quest-check-due>
          {busy ? t('readingFeeds') : t('previewDue')}
        </button>
        <p className="text-xs text-slate-500">
          {t('previewNote')}
        </p>
        {due && due.due.length === 0 && <p className="text-sm text-slate-500">{t('noneDue')}</p>}
        {due && due.due.length > 0 && (
          <ul className="space-y-1 text-sm">
            {due.due.map((d) => (
              <li key={d.questId}>
                <span className="font-medium">{titleOf(d.questId, d.title)}</span>
                {d.approved ? '' : ` ${t('draftParen')}`}: {d.result ? words.outcome(d.result) : tx(d.waiting ?? '')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Menu > Models & validation > Quests (go-live checklist): the same record of results and chain check
 * as the Results tab here, shown beside the app's own track record. Nothing when Quests are off.
 */
export function QuestTrackRecord() {
  const t = useT(QUESTS);
  const lang = useLang();
  const [list, setList] = useState<ListReply | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/quests')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setList(j))
      .catch(() => live && setList(null));
    return () => {
      live = false;
    };
  }, []);
  const tr = list && list.enabled ? list.translations : undefined;
  const titleOf = useCallback((id: string, english: string) => questTitleIn(id, english, lang, tr), [lang, tr]);
  if (!list || !list.enabled) return null;
  return (
    <section className="space-y-2" data-quest-track-record>
      <h3 className="ui-section-title">{t('title')}</h3>
      <Results titleOf={titleOf} />
    </section>
  );
}

type MaintainerReply = { today: string; counts: { approved: number; drafts: number; openNow: number; publicEntries: number; results: number }; items: Array<{ kind: string; n: number; ids: string[]; command?: string }> };

/** Maintainer dashboard: what needs doing now, worked out from the files on every call. */
function Maintainer() {
  const t = useT(QUESTS);
  const [data, setData] = useState<MaintainerReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/maintainer').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  return (
    <div className="space-y-3" data-quest-maintainer>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('maintIntro')}</p>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
      {data && <p className="text-sm" data-quest-maintainer-counts>{t('maintCounts', data.counts)}</p>}
      {data && data.items.length === 0 && <p className="text-sm text-emerald-700 dark:text-emerald-400" data-quest-maintainer-clear>{t('maintClear')}</p>}
      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((it) => (
            <li key={it.kind} className="border-t border-slate-200 dark:border-slate-800 pt-2 text-sm" data-quest-maintainer-item={it.kind}>
              <div className="font-medium">{t(`maint_${it.kind}` as keyof typeof QUESTS.en, { n: it.n })}</div>
              <div className="text-xs text-slate-500 break-words">{it.ids.join(', ')}{it.n > it.ids.length ? ` ${t('maintMore', { n: it.n - it.ids.length })}` : ''}</div>
              {it.command && <code className="text-xs">{it.command}</code>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LOGIN_KEY = 'econquest.questsLogin.v1';
const readLogin = () => {
  try {
    return localStorage.getItem(LOGIN_KEY) || '';
  } catch {
    return '';
  }
};

/** Enter on the public repository: the app fills in the entry file and opens GitHub's prefilled page. */
function EnterPublicly({ quest }: { quest: Quest }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const level = quest.type === 'forecast' && quest.rule.kind === 'level';
  const [login, setLogin] = useState(readLogin);
  const [value, setValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [draft, setDraft] = useState<{ url: string; path: string; text: string; note: string; replaces?: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const make = async () => {
    setErr(null);
    setDraft(null);
    try {
      localStorage.setItem(LOGIN_KEY, login.trim());
    } catch {
      /* not remembered; fine */
    }
    try {
      const n = Number(value);
      const qs = new URLSearchParams({ login: login.trim(), ...(level ? { level: String(n) } : { probability: String(n / 100) }), ...(rationale.trim() ? { rationale: rationale.trim() } : {}) });
      setDraft(await send(`/api/quests/${encodeURIComponent(quest.id)}/draft-entry?${qs}`));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  return (
    <Box title={t('enterPublicly')}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('publicIntro')}
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{t('githubName')}</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" data-quest-login />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">{level ? t('yourForecast') : t('probYes')}</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-public-answer />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">{t('whyPublic')}</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>
      <button type="button" className="ui-btn" onClick={make} disabled={!value.trim() || !login.trim()} data-quest-draft-entry>
        {t('prepareEntry')}
      </button>
      {err && <p className="text-xs text-rose-700 dark:text-rose-400">{err}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `${t('replaces', { n: draft.replaces })} ` : ''}{t('file', { file: draft.path })}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto">{draft.text}</pre>
          <p>{tx(draft.note)}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            {t('openGithub')}
          </a>
        </div>
      )}
      <p className="text-xs text-slate-500">{t('noGithub')}</p>
    </Box>
  );
}

type PublicReply =
  | { open: true; count: number; note: string }
  | { open: false; count: number; answer: 'probability' | 'level'; spread: { n: number; low: number; median: number; high: number } | null; entries: Array<{ login: string; n: number; via: string; answer: { probability?: number; level?: number }; rationale?: string; score: { status: string; note?: string; brier?: number; error?: number; skill?: number | null } }> };

/** Public entries: hidden until close, then each counted entry with its score and the spread. */
function PublicEntries({ questId }: { questId: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<PublicReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">{t('publicFailed', { error: err })}</p>;
  if (!data) return null;
  const show = (a: { probability?: number; level?: number }) => (a.level !== undefined ? String(a.level) : `${Math.round((a.probability ?? 0) * 100)}%`);
  return (
    <Box title={t('publicTitle', { n: data.count })}>
      {data.open ? (
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {tx(data.note)}
        </p>
      ) : data.entries.length === 0 ? (
        <p className="text-xs text-slate-500">{t('noPublic')}</p>
      ) : (
        <>
          {data.spread && (
            <p className="text-sm" data-quest-spread>
              {t('spread', {
                median: data.answer === 'level' ? data.spread.median : `${Math.round(data.spread.median * 100)}%`,
                n: data.spread.n,
                low: data.answer === 'level' ? data.spread.low : `${Math.round(data.spread.low * 100)}%`,
                high: data.answer === 'level' ? data.spread.high : `${Math.round(data.spread.high * 100)}%`,
              })}
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 text-left">
                <th className="py-1 pr-2 font-normal">{t('colWho')}</th>
                <th className="py-1 pr-2 font-normal">{t('colAnswer')}</th>
                <th className="py-1 font-normal">{t('colResult')}</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.login} className="border-t border-slate-200 dark:border-slate-800 align-top">
                  <td className="py-1 pr-2">
                    {e.login}
                    {e.n > 1 ? <span className="text-xs text-slate-500"> {t('entryN', { n: e.n })}</span> : null}
                    {e.via === 'email' ? <span className="text-xs text-slate-500"> {t('emailed')}</span> : null}
                    {e.rationale && <div className="text-xs text-slate-500">{e.rationale}</div>}
                  </td>
                  <td className="py-1 pr-2 tabular-nums">{show(e.answer)}</td>
                  <td className="py-1 text-xs">
                    {e.score.status === 'settled' ? scoreLine(t, e.score) : tx(e.score.note ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Box>
  );
}

const fmt = (x: number) => (x > 0 ? `+${x.toFixed(3)}` : x.toFixed(3));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** A gated figure: the value, or how many more cases it needs. */
function G<V>({ g, show }: { g: Gated<V>; show: (v: V) => ReactNode }) {
  const t = useT(QUESTS);
  return 'value' in g ? <>{show(g.value)} <span className="text-xs text-slate-500">({g.n})</span></> : <span className="text-xs text-slate-500">{t('needsMore', { needs: g.needs, n: g.n })}</span>;
}

function BoardTable({ rows, onPick }: { rows: BoardRow[]; onPick: (login: string) => void }) {
  const t = useT(QUESTS);
  if (!rows.length) return <p className="text-sm text-slate-500">{t('boardNone')}</p>;
  return (
    <table className="w-full text-sm" data-quest-board>
      <thead>
        <tr className="text-xs text-slate-500 text-left">
          <th className="py-1 pr-2 font-normal">#</th>
          <th className="py-1 pr-2 font-normal">{t('colWho')}</th>
          <th className="py-1 pr-2 font-normal">{t('colSkill')}</th>
          <th className="py-1 pr-2 font-normal">{t('colRange')}</th>
          <th className="py-1 font-normal">{t('colForecasts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.login} className="border-t border-slate-200 dark:border-slate-800 tabular-nums">
            <td className="py-1 pr-2">{r.rank}</td>
            <td className="py-1 pr-2">
              <button type="button" className="underline" onClick={() => onPick(r.login)}>
                {r.login}
              </button>
            </td>
            <td className="py-1 pr-2">{fmt(r.score)}</td>
            <td className="py-1 pr-2 text-xs">
              {t('rangeTo', { low: fmt(r.low), high: fmt(r.high) })}
            </td>
            <td className="py-1">{r.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The public scoreboard and each contributor's page, recomputed from entries and recorded results. */
function Scoreboard() {
  const t = useT(QUESTS);
  const [data, setData] = useState<QuestStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [table, setTable] = useState('all');
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/stats').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  const person = who ? data.contributors.find((c) => c.login === who) : null;
  if (person) return <Contributor c={person} onBack={() => setWho(null)} />;

  const rows = table === 'all' ? data.board.allTime : table.startsWith('season:') ? data.board.seasons[table.slice(7)] ?? [] : data.board.fields[table.slice(6)] ?? [];
  return (
    <div className="space-y-3" data-quest-scoreboard>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('boardIntro', { skill: data.minimums.skill, days: data.accountDays })}
      </p>
      <label className="text-xs inline-flex items-center gap-1">
        <span>{t('table')}</span>
        <select className={fieldCls} value={table} onChange={(e) => setTable(e.target.value)} data-quest-board-table>
          <option value="all">{t('allTime')}</option>
          {Object.keys(data.board.seasons).map((y) => (
            <option key={y} value={`season:${y}`}>
              {t('season', { year: y })}
            </option>
          ))}
          {Object.keys(data.board.fields).map((f) => (
            <option key={f} value={`field:${f}`}>
              {t('fieldOnly', { field: f, n: data.minimums.field })}
            </option>
          ))}
        </select>
      </label>
      <BoardTable rows={rows} onPick={setWho} />
      <p className="text-sm">
        {t('crowd')} <G g={data.crowd} show={(v) => fmt(v)} />
      </p>
      {data.contributors.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t('everyone')}</div>
          <ul className="text-sm flex flex-wrap gap-x-3 gap-y-1">
            {data.contributors.map((c) => (
              <li key={c.login}>
                <button type="button" className="underline" onClick={() => setWho(c.login)} data-quest-contributor={c.login}>
                  {c.login}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.contributors.length === 0 && <p className="text-sm text-slate-500">{t('noPublicYet')}</p>}
    </div>
  );
}

/** Health: the few measures that show whether Quests are working, for the six-month review. */
function Health({ titleOf }: { titleOf: (id: string, english: string) => string }) {
  const t = useT(QUESTS);
  const [h, setH] = useState<QuestHealth | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/health').then(setH).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!h) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  const th = 'text-left font-normal text-slate-500 py-1 pr-3';
  const td = 'py-1 pr-3 border-t border-slate-200 dark:border-slate-800';
  return (
    <div className="space-y-4" data-quest-health>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('healthIntroA', { when: h.reviewOn ? t('healthReviewOn', { date: h.reviewOn, first: h.firstOpened ?? '' }) : t('healthReviewLater') })}
      </p>
      {!h.approved && <p className="text-sm text-slate-500">{t('healthNone')}</p>}
      {h.approved > 0 && (
        <>
          <p className="text-sm">
            {t('healthSummary', { approved: h.approved, closed: h.closed, empty: h.closedEmpty ? t('healthEmpty', { n: h.closedEmpty }) : '', entries: h.totalEntries, people: h.totalPeople, returning: h.returning })}
          </p>
          <Box title={t('peopleByMonth')}>
            <p className="text-xs text-slate-500">{t('monthsNote')}</p>
            {h.months.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr><th className={th}>{t('colMonth')}</th><th className={th}>{t('colQuestsClosed')}</th><th className={th}>{t('colEntries')}</th><th className={th}>{t('colPeople')}</th></tr>
                </thead>
                <tbody>
                  {h.months.map((m) => (
                    <tr key={m.month}><td className={td}>{m.month}</td><td className={td}>{m.questsClosed}</td><td className={td}>{m.entries}</td><td className={td}>{m.people}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">{t('noneClosed')}</p>
            )}
          </Box>
          <Box title={t('entriesPerQuest')}>
            <p className="text-xs text-slate-500">{t('medianNote', { n: h.medianEntries === null ? t('medianNone') : h.medianEntries })}</p>
            {h.perQuest.length > 0 && (
              <ul className="text-sm space-y-0.5">
                {h.perQuest.map((q) => (
                  <li key={q.id}>{titleOf(q.id, q.title)} <span className="text-xs text-slate-500">({t('closedOn', { type: t(`type_${q.type}`), date: q.closesOn })})</span>: {q.entries}</li>
                ))}
              </ul>
            )}
          </Box>
          <Box title={t('onTimeTitle')}>
            <p className="text-xs text-slate-500">{t('onTimeNote', { days: h.onTime.graceDays })}</p>
            <p className="text-sm">
              {h.onTime.share === null ? t('onTimeNone') : t('onTimeShare', { share: pct(h.onTime.share), on: h.onTime.onTime, due: h.onTime.due, late: h.onTime.late, overdue: h.onTime.overdue })}
              {h.onTime.waiting ? ` ${t('onTimeWaiting', { n: h.onTime.waiting })}` : ''}
            </p>
            {h.onTime.quests.length > 0 && (
              <ul className="text-sm space-y-0.5">
                {h.onTime.quests.map((q) => (
                  <li key={q.id}>{titleOf(q.id, q.title)} <span className="text-xs text-slate-500">({t('dueOn', { date: q.settlesOn })}{q.recordedOn ? t('recordedOn', { date: q.recordedOn }) : ''})</span>: {t(q.state as OnTimeState)}</li>
                ))}
              </ul>
            )}
          </Box>
          <p className="text-sm">
            {t('crowd')} <G g={h.crowd} show={(v) => fmt(v)} />. {t('crowdPlus')}
          </p>
        </>
      )}
    </div>
  );
}

function Contributor({ c, onBack }: { c: ContributorStats; onBack: () => void }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const row = (label: string, value: ReactNode, help: string) => (
    <tr className="border-t border-slate-200 dark:border-slate-800 align-top">
      <td className="py-1 pr-2">
        {label}
        <div className="text-xs text-slate-500">{help}</div>
      </td>
      <td className="py-1 tabular-nums">{value}</td>
    </tr>
  );
  return (
    <div className="space-y-3" data-quest-contributor-page>
      <button type="button" className="ui-btn ui-btn-ghost" onClick={onBack}>
        {t('backBoard')}
      </button>
      <h3 className="ui-title">
        {c.login}
        {c.emailed ? <span className="text-xs text-slate-500"> {t('emailedEntries')}</span> : null}
      </h3>
      <p className="text-sm">
        {t('contribSummary', { entered: c.entered, settled: c.settled, unres: c.unresolvable, waiting: c.waiting })}
      </p>
      {c.unranked && <p className="text-xs text-slate-500">{t('notRanked', { why: tx(c.unranked) })}</p>}
      <ProfileStances login={c.login} />
      <table className="w-full text-sm">
        <tbody>
          {row(t('r_skill'), <G g={c.skill} show={(v) => t('skillRange', { score: fmt(v.score), low: fmt(v.low), high: fmt(v.high) })} />, t('r_skillHelp'))}
          {row(t('r_beat'), <G g={c.beatNoChange} show={(v) => pct(v)} />, t('r_beatHelp'))}
          {row(t('r_sharp'), <G g={c.sharpness} show={(v) => v.toFixed(2)} />, t('r_sharpHelp'))}
          {row(t('r_cal'), <G g={c.calibration} show={(v) => pct(v.gap)} />, t('r_calHelp'))}
          {row(t('r_contra'), <G g={c.contrarian} show={(v) => fmt(v)} />, t('r_contraHelp'))}
          {row(t('r_streak'), <G g={c.streak} show={(v) => String(v)} />, t('r_streakHelp'))}
        </tbody>
      </table>
      {'value' in c.calibration && (
        <table className="w-full text-xs" data-quest-calibration>
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">{t('colSaid')}</th>
              <th className="py-1 pr-2 font-normal">{t('colAvg')}</th>
              <th className="py-1 pr-2 font-normal">{t('colHappened')}</th>
              <th className="py-1 font-normal">{t('colForecasts')}</th>
            </tr>
          </thead>
          <tbody>
            {c.calibration.value.bins.map((b) => (
              <tr key={b.from} className="border-t border-slate-200 dark:border-slate-800 tabular-nums">
                <td className="py-1 pr-2">
                  {t('rangeTo', { low: pct(b.from), high: pct(b.to) })}
                </td>
                <td className="py-1 pr-2">{pct(b.said)}</td>
                <td className="py-1 pr-2">{pct(b.happened)}</td>
                <td className="py-1">{b.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {c.fields.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t('byField')}</div>
          <ul className="text-sm">
            {c.fields.map((f) => (
              <li key={`${f.kind}-${f.field}`}>
                {tx(f.field)}: <G g={f.stat} show={(v) => fmt(v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.proposed.length > 0 && (
        <p className="text-sm">
          {t('proposed', { list: c.proposed.map((p) => t('proposedItem', { id: p.questId, n: p.entries })).join(', ') })}
        </p>
      )}
      {c.tests?.length > 0 && (
        <p className="text-sm" data-quest-tests>
          {t('testsProposed', { list: c.tests.map((x) => `${x.title} (${x.verdict === null ? t('notRun') : tx(x.verdict.replace(/_/g, ' '))})`).join('; ') })}
        </p>
      )}
      {c.replications?.length > 0 && (
        <p className="text-sm" data-quest-replications>
          {t('replicationsList', { list: c.replications.map((r) => `${r.title} (${r.matched === null ? t('waitingApp') : r.matched ? t('reproduced') : t('notMatch')})`).join('; ') })}
        </p>
      )}
      {c.debates?.length > 0 && (
        <p className="text-sm" data-quest-debates>
          {t('debatesArgued', { list: c.debates.map((d) => d.title).join('; ') })}
        </p>
      )}
      {c.entries.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">{t('colSettledQuest')}</th>
              <th className="py-1 pr-2 font-normal">{t('colAnswer')}</th>
              <th className="py-1 font-normal">{t('colScore')}</th>
            </tr>
          </thead>
          <tbody>
            {c.entries.map((e) => (
              <tr key={e.questId} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="py-1 pr-2">{e.title}</td>
                <td className="py-1 pr-2 tabular-nums">{e.answer === 'probability' ? `${pct(e.p ?? 0)}, ${e.happened ? t('happened') : t('didNot')}` : ''}</td>
                <td className="py-1 text-xs">{e.answer === 'probability' ? `${t('scoreBrier', { v: e.brier?.toFixed(3) ?? '' })}; ${t('skillIs', { v: e.skill === null || e.skill === undefined ? t('noBaseRate') : fmt(e.skill) })}` : `${t('scoreError', { v: String(e.error) })}; ${e.beatNoChange === null ? t('noNoChange') : e.beatNoChange ? t('beatNC') : t('notBeatNC')}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type DigestReply = { closingSoon: Array<{ id: string; title: string; closesOn: string }>; opening: Array<{ id: string; title: string; opensOn: string }>; settled: Array<{ id: string; title: string; result: string; line?: ResolutionLine }> };

/** This week: Quests closing soon, opening, and results recorded in the last 7 days. Hidden when there is nothing. */
function ThisWeek({ onOpen, titleOf }: { onOpen: (id: string) => void; titleOf: (id: string, english: string) => string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const words = useQuestWords();
  const [d, setD] = useState<DigestReply | null>(null);
  useEffect(() => {
    send('/api/quests/digest').then(setD).catch(() => setD(null));
  }, []);
  if (!d || (!d.closingSoon.length && !d.opening.length && !d.settled.length)) return null;
  const item = (id: string, title: string, note: string) => (
    <li key={id}>
      <button type="button" className="underline text-left" onClick={() => onOpen(id)}>
        {titleOf(id, title)}
      </button>{' '}
      <span className="text-xs text-slate-500">{note}</span>
    </li>
  );
  return (
    <Box title={t('thisWeek')}>
      <div className="text-sm space-y-2" data-quest-this-week>
        {d.closingSoon.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">{t('closingSoon')}</div>
            <ul>{d.closingSoon.map((x) => item(x.id, x.title, t('closes', { date: x.closesOn })))}</ul>
          </div>
        )}
        {d.opening.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">{t('opening')}</div>
            <ul>{d.opening.map((x) => item(x.id, x.title, t('opens', { date: x.opensOn })))}</ul>
          </div>
        )}
        {d.settled.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">{t('resultsRecorded')}</div>
            <ul>{d.settled.map((x) => item(x.id, x.title, x.line ? words.outcome(x.line) : tx(x.result)))}</ul>
          </div>
        )}
      </div>
    </Box>
  );
}

// ---------------------------------------------------------------- Debate Quests (step 9)

const VERDICT_TONE: Record<string, string> = {
  matches: 'text-emerald-700 dark:text-emerald-400',
  holds: 'text-emerald-700 dark:text-emerald-400',
  differs: 'text-rose-700 dark:text-rose-400',
  'does not hold': 'text-rose-700 dark:text-rose-400',
};

function Checks({ checks, empty }: { checks: ArgumentCheck[]; empty: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  if (!checks.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1 text-xs" data-quest-claims>
      {checks.map((c, i) => (
        <li key={i}>
          <span className={`font-medium ${VERDICT_TONE[c.verdict] ?? 'text-slate-600 dark:text-slate-300'}`}>{t(`v_${c.verdict}` as keyof typeof QUESTS.en) ?? c.verdict}</span>: {tx(c.reading)}
        </li>
      ))}
    </ul>
  );
}

/** The opening brief written once by the app's AI model, or why there is none. */
function BriefBox({ brief, quest }: { brief: { brief: DebateBrief; hashOk: boolean } | null; quest: DebateQuest }) {
  const t = useT(QUESTS);
  const tx = useTx();
  if (!brief)
    return (
      <Box title={t('briefTitle')}>
        <p className="text-xs text-slate-500">{t('briefNone')}</p>
      </Box>
    );
  const b = brief.brief;
  return (
    <Box title={t('briefTitle')}>
      <p className="text-xs text-amber-800 dark:text-amber-300" data-quest-brief-label>
        {tx(b.label)} {t('briefModel', { model: b.model, date: b.writtenAt.slice(0, 10) })}
        {!brief.hashOk && ` ${t('briefWarn')}`}
      </p>
      {b.positions.map((p) => (
        <div key={p.position} className="space-y-1">
          <div className="text-sm font-medium">
            {p.position}. {quest.positions[p.position - 1]}
          </div>
          <p className="text-xs">
            <span className="text-slate-500">{t('strongest')} </span>
            {p.strongest}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">{t('weakest')} </span>
            {p.weakest}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">{t('figuresCheck')} </span>
            {p.check}
          </p>
        </div>
      ))}
    </Box>
  );
}

/** Pick a position and argue it; Claim Check reads the argument as it is written. */
function Argue({ quest, items }: { quest: DebateQuest; items: LiveWatchlistItem[] }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [position, setPosition] = useState(0);
  const [argument, setArgument] = useState('');
  const [login, setLogin] = useState(readLogin);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ url: string; path: string; text: string; note: string; replaces?: number } | null>(null);
  const checks = argument.trim().length >= ARGUMENT_MIN ? checkArgument(argument, quest, items) : [];
  const ready = position > 0 && argument.trim().length >= ARGUMENT_MIN;
  const logPrivately = async () => {
    setMsg(null);
    try {
      const j = await send(`/api/quests/${encodeURIComponent(quest.id)}/private`, { answer: { position }, rationale: argument });
      setMsg(t('logged', { time: String(j.entry.loggedAt).slice(0, 16).replace('T', ' ') }));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  const preparePublic = async () => {
    setMsg(null);
    setDraft(null);
    try {
      localStorage.setItem(LOGIN_KEY, login.trim());
    } catch {
      /* not remembered; fine */
    }
    try {
      const qs = new URLSearchParams({ login: login.trim(), position: String(position), rationale: argument.trim() });
      setDraft(await send(`/api/quests/${encodeURIComponent(quest.id)}/draft-entry?${qs}`));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  return (
    <Box title={t('argueTitle')}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('argueIntro')}
      </p>
      <div className="space-y-1" role="radiogroup" aria-label={t('positionAria')}>
        {quest.positions.map((p, i) => (
          <label key={p} className="flex items-start gap-2 text-sm">
            <input type="radio" name={`pos-${quest.id}`} checked={position === i + 1} onChange={() => setPosition(i + 1)} data-quest-position={i + 1} />
            <span>
              {i + 1}. {p}
            </span>
          </label>
        ))}
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">{t('argumentLabel', { n: ARGUMENT_MIN })}</span>
        <textarea className={`${fieldCls} w-full`} rows={4} maxLength={2000} value={argument} onChange={(e) => setArgument(e.target.value)} data-quest-argument />
      </label>
      {argument.trim().length >= ARGUMENT_MIN && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t('claimCheck')}</div>
          <Checks checks={checks} empty={t('claimNone')} />
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <button type="button" className="ui-btn" onClick={logPrivately} disabled={!ready} data-quest-argue-log>
          {t('logHere')}
        </button>
        <label className="text-xs space-y-1">
          <span className="block">{t('githubName')}</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={!ready || !login.trim()} data-quest-argue-public>
          {t('preparePublic')}
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `${t('replaces', { n: draft.replaces })} ` : ''}{t('file', { file: draft.path })}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{tx(draft.note)}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            {t('openGithub')}
          </a>
        </div>
      )}
    </Box>
  );
}

type DebateReply = { open: true; count: number; note: string } | { open: false; count: number; entries: Array<Pick<PublicEntry, 'login' | 'n' | 'via' | 'answer' | 'rationale'>> };

/** After close: who argued what, each argument with its Claim Check readings, and related results. */
function EvidenceMapBox({ quest, items, brief, related }: { quest: DebateQuest; items: LiveWatchlistItem[]; brief: DebateBrief | null; related: EvidenceMap['related'] }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const words = useQuestWords();
  const [data, setData] = useState<DebateReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(quest.id)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [quest.id]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">{t('entriesFailed', { error: err })}</p>;
  if (!data) return null;
  if (data.open)
    return (
      <Box title={t('mapSoFar', { n: data.count })}>
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {tx(data.note)} {t('mapAppears')}
        </p>
      </Box>
    );
  const entries = data.entries.map((e) => ({ ...e, questId: quest.id, questVersion: quest.version, questHash: '' }) as PublicEntry);
  const map = evidenceMap(quest, entries, { check: (t) => checkArgument(t, quest, items), related });
  const exportMd = () => {
    const md = evidenceMarkdown(map, brief, new Date().toISOString().slice(0, 10));
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-map-${quest.id}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Box title={t('mapTitle', { n: map.total })}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('mapIntro')}
      </p>
      <table className="w-full text-sm" data-quest-map>
        <thead>
          <tr className="text-xs text-slate-500 text-left">
            <th className="py-1 pr-2 font-normal">{t('colPosition')}</th>
            <th className="py-1 pr-2 font-normal">{t('colArguedBy')}</th>
            <th className="py-1 pr-2 font-normal">{t('colMatch')}</th>
            <th className="py-1 font-normal">{t('colDiffer')}</th>
          </tr>
        </thead>
        <tbody>
          {map.positions.map((p) => (
            <tr key={p.position} className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-1 pr-2">
                {p.position}. {p.text}
              </td>
              <td className="py-1 pr-2 tabular-nums">{p.count}</td>
              <td className="py-1 pr-2 tabular-nums">{p.matches}</td>
              <td className="py-1 tabular-nums">{p.differs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {map.positions
        .filter((p) => p.arguments.length)
        .map((p) => (
          <details key={p.position} className="text-sm">
            <summary className="cursor-pointer">
              {p.position}. {p.text} ({p.count})
            </summary>
            <div className="space-y-2 pl-3 pt-1">
              {p.arguments.map((a) => (
                <div key={a.login} className="space-y-1">
                  <div className="text-xs text-slate-500">
                    {a.login}
                    {a.via === 'email' ? ` ${t('emailed')}` : ''}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{a.argument}</p>
                  <Checks checks={a.checks} empty={t('claimNoneShort')} />
                </div>
              ))}
            </div>
          </details>
        ))}
      {map.related.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t('relatedFound')}</div>
          <ul className="list-disc pl-5 text-xs">
            {map.related.map((r) => (
              <li key={r.questId}>
                {r.title}: {r.line ? words.outcome(r.line) : tx(r.result)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="ui-btn" onClick={exportMd} disabled={!map.total} data-quest-map-export>
        {t('exportMap')}
      </button>
      <p className="text-xs text-slate-500">{t('mapNote')}</p>
    </Box>
  );
}

// ---------------------------------------------------------------- Replication Quests (step 10)

/** Enter a replication: the figure the script produced and where the script is. */
function Replicate({ quest }: { quest: ReplicationQuest }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [login, setLogin] = useState(readLogin);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ url: string; path: string; text: string; note: string; replaces?: number } | null>(null);
  const ready = value.trim() !== '' && Number.isFinite(Number(value)) && code.trim() !== '';
  const logPrivately = async () => {
    setMsg(null);
    try {
      const j = await send(`/api/quests/${encodeURIComponent(quest.id)}/private`, { answer: { value: Number(value) }, code: code.trim(), rationale: notes });
      setMsg(t('loggedShort', { time: String(j.entry.loggedAt).slice(0, 16).replace('T', ' ') }));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  const preparePublic = async () => {
    setMsg(null);
    setDraft(null);
    try {
      localStorage.setItem(LOGIN_KEY, login.trim());
    } catch {
      /* not remembered; fine */
    }
    try {
      const qs = new URLSearchParams({ login: login.trim(), value: String(Number(value)), code: code.trim(), ...(notes.trim() ? { rationale: notes.trim() } : {}) });
      setDraft(await send(`/api/quests/${encodeURIComponent(quest.id)}/draft-entry?${qs}`));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  return (
    <Box title={t('replTitle')}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('replIntro', { tolerance: quest.tolerance })}
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{t('scriptFigure')}</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-replication-value />
        </label>
        <label className="text-xs space-y-1 grow">
          <span className="block">{t('scriptWhere')}</span>
          <input className={`${fieldCls} w-full`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="https://github.com/you/repo/blob/main/bohn.R" data-quest-replication-code />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">{t('replNotes')}</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2 items-end">
        <button type="button" className="ui-btn" onClick={logPrivately} disabled={!ready}>
          {t('logHere')}
        </button>
        <label className="text-xs space-y-1">
          <span className="block">{t('githubName')}</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={!ready || !login.trim()} data-quest-replication-public>
          {t('preparePublic')}
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `${t('replaces', { n: draft.replaces })} ` : ''}{t('file', { file: draft.path })}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{tx(draft.note)}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            {t('openGithub')}
          </a>
        </div>
      )}
    </Box>
  );
}

type ReplicationReply =
  | { open: true; count: number; note: string }
  | { open: false; count: number; entries: Array<{ login: string; n: number; via: string; answer: { value?: number }; code?: string; rationale?: string; score: { status: string; note?: string; matched?: boolean } }> };

/** Replication entries: hidden until close, then each figure and script, matched against the app's recorded figure. */
function ReplicationEntries({ questId }: { questId: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<ReplicationReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">{t('entriesFailed', { error: err })}</p>;
  if (!data) return null;
  return (
    <Box title={t('replsTitle', { n: data.count })}>
      {data.open ? (
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {tx(data.note)}
        </p>
      ) : data.entries.length === 0 ? (
        <p className="text-xs text-slate-500">{t('replNone')}</p>
      ) : (
        <table className="w-full text-sm" data-quest-replications-table>
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">{t('colWho')}</th>
              <th className="py-1 pr-2 font-normal">{t('colFigure')}</th>
              <th className="py-1 font-normal">{t('colAgainst')}</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.login} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="py-1 pr-2">
                  {e.login}
                  {e.via === 'email' ? <span className="text-xs text-slate-500"> {t('emailed')}</span> : null}
                  {e.code && (
                    <div className="text-xs">
                      <a className="underline" href={e.code} target="_blank" rel="noreferrer noopener">
                        {t('script')}
                      </a>
                    </div>
                  )}
                  {e.rationale && <div className="text-xs text-slate-500">{e.rationale}</div>}
                </td>
                <td className="py-1 pr-2 tabular-nums">{e.answer.value}</td>
                <td className={`py-1 text-xs ${e.score.status === 'replicated' ? (e.score.matched ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400') : ''}`}>{tx(e.score.note ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------- Signal Quests (step 10)

/** Propose a test: a pre-registered test file, entered in public so it is fixed before it runs. */
function ProposeTest({ quest }: { quest: SignalQuest }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const start: SignalTest = quest.methods?.length && !quest.methods.includes(SIGNAL_TEMPLATE.method) ? { ...SIGNAL_TEMPLATE, method: quest.methods[0] as SignalTest['method'], params: Object.fromEntries(SIGNAL_METHODS[quest.methods[0] as SignalTest['method']].params.map((k) => [k, 0])) } : SIGNAL_TEMPLATE;
  const [text, setText] = useState(() => JSON.stringify(start, null, 2));
  const [login, setLogin] = useState(readLogin);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ url: string; path: string; text: string; note: string; replaces?: number } | null>(null);
  let parsed: unknown = null;
  let parseError = '';
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    parseError = t('notJson', { error: String(e?.message || e) });
  }
  const problems = parseError ? [parseError] : signalTestProblems(parsed, quest.methods);
  const methods = (quest.methods?.length ? quest.methods : Object.keys(SIGNAL_METHODS)) as SignalTest['method'][];
  const preparePublic = async () => {
    setMsg(null);
    setDraft(null);
    try {
      localStorage.setItem(LOGIN_KEY, login.trim());
    } catch {
      /* not remembered; fine */
    }
    try {
      const qs = new URLSearchParams({ login: login.trim(), test: JSON.stringify(parsed) });
      setDraft(await send(`/api/quests/${encodeURIComponent(quest.id)}/draft-entry?${qs}`));
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  return (
    <Box title={t('testTitle')}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('testIntro')}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('testFloor', { cases: SIGNAL_FLOOR.minCases, years: SIGNAL_FLOOR.minYears, p: SIGNAL_FLOOR.maxPValue, lift: SIGNAL_FLOOR.minLiftPts })}
      </p>
      <div className="text-xs space-y-1" data-quest-test-methods>
        <div className="text-slate-500">{t('testRules')}</div>
        <ul className="list-disc pl-5">
          {methods.map((m) => (
            <li key={m}>
              <code>{m}</code>: {tx(SIGNAL_METHODS[m].label)}. {t('testSettings', { list: SIGNAL_METHODS[m].params.join(', ') })}{SIGNAL_METHODS[m].local ? ` ${t('testLocal')}` : ''}
            </li>
          ))}
        </ul>
        <p className="text-slate-500">{t('testNeedsCode')}</p>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">{t('testYour')}</span>
        <textarea className={`${fieldCls} w-full font-mono`} rows={14} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} data-quest-test-text />
      </label>
      {problems.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-400" data-quest-test-problems>
          {problems.map((p) => (
            <li key={p}>{tx(p)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" data-quest-test-ok>
          {t('testOk')}
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{t('githubName')}</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={problems.length > 0 || !login.trim()} data-quest-test-public>
          {t('preparePublic')}
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `${t('replacesRun', { n: draft.replaces })} ` : ''}{t('file', { file: draft.path })}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{tx(draft.note)}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            {t('openGithub')}
          </a>
        </div>
      )}
    </Box>
  );
}

type SignalVerdict = { verdict: string; label: string; text: string; p?: number; adjusted?: number; holds?: boolean; family: number; method: string };
type SignalReply =
  | { open: true; count: number; note: string }
  | { open: false; count: number; note: string; error?: string; entries: Array<{ login: string; n: number; via: string; answer: { test?: SignalTest }; verdict?: SignalVerdict }> };

const GRADE_CLS: Record<string, string> = {
  Validated: 'text-emerald-700 dark:text-emerald-400',
  'Provisional pass': 'text-amber-700 dark:text-amber-400',
  Failed: 'text-rose-700 dark:text-rose-400',
  'Too few cases': 'text-slate-600 dark:text-slate-300',
};

/** The tests entered: hidden until close, then each with its verdict and its reading after the Holm correction. */
function SignalEntries({ questId }: { questId: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<SignalReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">{t('testsFailed', { error: err })}</p>;
  if (!data) return null;
  return (
    <Box title={t('testsTitle', { n: data.count })}>
      <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden={data.open ? '' : undefined}>
        {tx(data.note)}
      </p>
      {!data.open && data.error && <p className="text-xs text-rose-700 dark:text-rose-400">{tx(data.error)}</p>}
      {!data.open && data.entries.length === 0 && <p className="text-xs text-slate-500">{t('testsNone')}</p>}
      {!data.open &&
        data.entries.map((e) => (
          <div key={e.login} className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1" data-quest-test-entry>
            <div className="text-sm">
              {e.login}
              {e.via === 'email' ? <span className="text-xs text-slate-500"> {t('emailed')}</span> : null}
              {e.answer.test ? <span className="text-xs text-slate-500"> · {tx(SIGNAL_METHODS[e.answer.test.method]?.label ?? e.answer.test.method)}</span> : null}
            </div>
            {e.answer.test && <p className="text-sm">{e.answer.test.hypothesis}</p>}
            {e.verdict ? (
              <p className={`text-xs ${GRADE_CLS[e.verdict.label] ?? ''}`} data-quest-test-verdict>
                <strong>{tx(e.verdict.label)}.</strong> {tx(e.verdict.text)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">{t('notRunYet')}</p>
            )}
            {e.answer.test && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500">{t('testAsEntered')}</summary>
                <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(e.answer.test, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      <p className="text-xs text-slate-500">{t('hypothetical')}</p>
    </Box>
  );
}

// ---------------------------------------------------------------- Stance profiles (step 11)

type StancesReply = { enabled: true; axes: StanceAxis[]; profiles: StanceProfile[]; repo: string | null };
const STANCES_KEY = 'econquest.questStances.v1';
const readStances = (): Stances => {
  try {
    const j = JSON.parse(localStorage.getItem(STANCES_KEY) || '{}');
    return j && typeof j === 'object' ? (j as Stances) : {};
  } catch {
    return {};
  }
};
const STANCE_STEPS: StanceValue[] = [-2, -1, 0, 1, 2];

/** A contributor's own profile, when they signed up for one on GitHub. */
function ProfileStances({ login }: { login: string }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<StancesReply | null>(null);
  useEffect(() => {
    send('/api/quests/stances').then(setData).catch(() => setData(null));
  }, []);
  const p = data?.profiles.find((x) => x.login === login);
  if (!data || !p) return null;
  return (
    <div className="space-y-1" data-quest-profile-stances>
      <div className="text-xs text-slate-500">{t('stancesSince', { login, date: p.shownSince })}</div>
      <ul className="text-sm list-disc pl-5">
        {data.axes.filter((a) => p.axes[a.id] !== undefined).map((a) => (
          <li key={a.id}>
            {tx(a.question)} {tx(stanceWords(a, p.axes[a.id]))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stances: set your own (kept in this browser), sign up with a profile on GitHub if you want one, and see who has. */
function StancesView() {
  const t = useT(QUESTS);
  const tx = useTx();
  const [data, setData] = useState<StancesReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<Stances>(readStances);
  const [login, setLogin] = useState(readLogin);
  const [understood, setUnderstood] = useState(false);
  useEffect(() => {
    send('/api/quests/stances').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  const set = (id: string, v: StanceValue | undefined) => {
    const next = { ...mine };
    if (v === undefined) delete next[id];
    else next[id] = v;
    setMine(next);
    try {
      localStorage.setItem(STANCES_KEY, JSON.stringify(next));
    } catch {
      /* not kept; fine */
    }
  };
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  const problems = stancesProblems(mine);
  const today = new Date().toISOString().slice(0, 10);
  const profile: StanceProfile = { login: login.trim(), axes: mine, shownSince: today };
  const text = profileFileText(profile);
  const canSignUp = !problems.length && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login.trim()) && understood && !!data.repo;
  return (
    <div className="space-y-3" data-quest-stances>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('stancesIntro')}
      </p>
      <div className="space-y-3">
        {data.axes.map((a) => (
          <fieldset key={a.id} className="border border-slate-200 dark:border-slate-800 p-2 space-y-1" data-quest-stance-axis={a.id}>
            <legend className="text-sm px-1">{tx(a.question)}</legend>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tx(a.explain)}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="w-40 text-right">{tx(a.first)}</span>
              {STANCE_STEPS.map((v) => (
                <label key={v} className="inline-flex flex-col items-center">
                  <input type="radio" name={`stance-${a.id}`} checked={mine[a.id] === v} onChange={() => set(a.id, v)} aria-label={tx(stanceWords(a, v))} />
                </label>
              ))}
              <span className="w-40">{tx(a.second)}</span>
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => set(a.id, undefined)} disabled={mine[a.id] === undefined}>
                {t('leaveOut')}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{tx(stanceWords(a, mine[a.id]))}</p>
          </fieldset>
        ))}
      </div>
      <Box title={t('signUpTitle')}>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('signUpIntro')}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('noGroupTables')}</p>
        <label className="text-xs inline-flex items-center gap-2">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} data-quest-stance-understood />
          <span>{t('understood')}</span>
        </label>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs space-y-1">
            <span className="block">{t('githubName')}</span>
            <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
          </label>
          {canSignUp ? (
            <a className="ui-btn inline-block" href={newFileUrl(data.repo!, 'main', profilePath(profile.login), text)} target="_blank" rel="noreferrer" data-quest-stance-signup>
              {t('openGithub')}
            </a>
          ) : (
            <button type="button" className="ui-btn" disabled>
              {t('openGithub')}
            </button>
          )}
        </div>
        {!data.repo && <p className="text-xs text-slate-500">{t('noRepo')}</p>}
        {problems.length > 0 && <p className="text-xs text-slate-500">{t('setOne')}</p>}
        {!problems.length && login.trim() && (
          <pre className="p-2 text-xs bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap" data-quest-stance-file>
            {profilePath(profile.login)}
            {'\n'}
            {text}
          </pre>
        )}
        <p className="text-xs text-slate-500">{t('changeLater')}</p>
      </Box>
      <div className="space-y-1">
        <div className="text-xs text-slate-500">{t('signedUp', { n: data.profiles.length })}</div>
        {data.profiles.length === 0 ? (
          <p className="text-sm text-slate-500">{t('nobody')}</p>
        ) : (
          <ul className="text-sm space-y-2">
            {data.profiles.map((p) => (
              <li key={p.login} data-quest-stance-profile={p.login}>
                <strong>{p.login}</strong> <span className="text-xs text-slate-500">{t('since', { date: p.shownSince })}</span>
                <ul className="list-disc pl-5 text-xs">
                  {data.axes.filter((a) => p.axes[a.id] !== undefined).map((a) => (
                    <li key={a.id}>
                      {tx(a.question)} {tx(stanceWords(a, p.axes[a.id]))}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
