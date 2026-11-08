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
import type { DebateQuest, Quest, QuestHorizon, QuestStatus, QuestType, ReplicationQuest, SignalQuest } from '../utils/quests';
import { SIGNAL_FLOOR, SIGNAL_METHODS, SIGNAL_TEMPLATE, signalTestProblems, type SignalTest } from '../utils/questSignal';
import { describeOutcome, type QuestResultState, type ResolutionDraft, type ResolutionLine } from '../utils/questResolve';
import type { BoardRow, ContributorStats, Gated, QuestStats } from '../utils/questStats';
import type { LiveWatchlistItem } from '../types/council';
import { newFileUrl, type PublicEntry } from '../utils/questPublicEntries';
import { profileFileText, profilePath, stancesProblems, stanceWords, type StanceAxis, type StanceProfile, type Stances, type StanceValue } from '../utils/questStances';
import { ARGUMENT_MIN } from '../utils/questEntries';
import { checkArgument, evidenceMap, evidenceMarkdown, type ArgumentCheck, type DebateBrief, type EvidenceMap } from '../utils/questDebate';

type Summary = {
  id: string;
  type: QuestType;
  title: string;
  countries: string[];
  topics: string[];
  region: string;
  approved: boolean;
  tutorial: boolean;
  status: QuestStatus;
  horizon: QuestHorizon;
  horizonLabel: string;
  opensOn: string;
  closesOn: string;
  settlesOn: string;
};
type Figure = { country: string; series: string; label: string; value?: number; date?: string; unit?: string; source?: string; missing?: string };
type ListReply = { enabled: false; reason: string } | { enabled: true; quests: Summary[] };
type Detail = { enabled: true; quest: Quest; summary: Summary; file: string; rule?: string; fallback?: string; figures: Figure[]; result?: QuestResultState; brief?: { brief: DebateBrief; hashOk: boolean } | null; related?: EvidenceMap['related'] };

const TYPE_LABEL: Record<QuestType, string> = { forecast: 'Forecast', signal: 'Signal', replication: 'Replication', debate: 'Debate' };
const STATUS_LABEL: Record<QuestStatus, string> = { draft: 'Draft', upcoming: 'Opens soon', open: 'Open', closed: 'Closed to entries', due: 'Result due' };
const HOW_IT_ENDS: Record<QuestType, string> = {
  forecast: 'Settled from the feed by the rule below. Scored against the base rate and a no-change forecast.',
  signal: 'Entries are pre-registered tests. Each is run once and badged under the signal standard; a failed test is recorded and never re-tuned.',
  replication: 'Solved when a script reproduces the app\'s figure within the tolerance, or shows where the app is wrong.',
  debate: 'Debate, not a tested signal. Not scored; it closes with an evidence map of the positions and the figures each cites.',
};

export function QuestsDialog({ onClose, items = [] }: { onClose: () => void; items?: LiveWatchlistItem[] }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [list, setList] = useState<ListReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<QuestType | ''>('');
  const [horizon, setHorizon] = useState<QuestHorizon | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [view, setView] = useState<'quests' | 'mine' | 'class' | 'results' | 'board' | 'stances'>('quests');

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

  const field = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
  const quests = list && list.enabled ? list.quests.filter((q) => (!type || q.type === type) && (!horizon || q.horizon === horizon)) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="quests-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl" data-quests>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="quests-title" className="ui-title inline-flex items-center gap-2">
            <Compass className="w-4 h-4" aria-hidden /> Quests
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close Quests" className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          {error && <p className="text-sm text-rose-700 dark:text-rose-400">Quests did not load: {error}</p>}
          {list && !list.enabled && <p className="text-sm text-slate-600 dark:text-slate-300">{list.reason}</p>}
          {list && list.enabled && !openId && (
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist">
              {(
                [
                  ['quests', 'Quests'],
                  ['mine', 'My entries'],
                  ['class', 'Class table'],
                  ['results', 'Results'],
                  ['board', 'Scoreboard'],
                  ['stances', 'Stances'],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`px-3 py-1.5 text-sm ${view === k ? 'border-b-2 border-blue-600 text-slate-900 dark:text-white' : 'text-slate-500'}`} data-quests-tab={k}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {list && list.enabled && !openId && view === 'mine' && <MyEntries />}
          {list && list.enabled && !openId && view === 'class' && <ClassTable />}
          {list && list.enabled && !openId && view === 'results' && <Results />}
          {list && list.enabled && !openId && view === 'board' && <Scoreboard />}
          {list && list.enabled && !openId && view === 'stances' && <StancesView />}
          {list && list.enabled && !openId && view === 'quests' && (
            <>
              <ThisWeek onOpen={open} />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open questions anyone can answer, argue and check. Each Quest states the rule that settles it, and every figure shown is read live from a feed. Forecasts you log here stay on this computer; nothing is published.
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="text-xs inline-flex items-center gap-1">
                  <span>Type</span>
                  <select className={field} value={type} onChange={(e) => setType(e.target.value as QuestType | '')} data-quests-type>
                    <option value="">All</option>
                    {(Object.keys(TYPE_LABEL) as QuestType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs inline-flex items-center gap-1">
                  <span>Result due</span>
                  <select className={field} value={horizon} onChange={(e) => setHorizon(e.target.value as QuestHorizon | '')} data-quests-horizon>
                    <option value="">Any time</option>
                    <option value="week">Within a week</option>
                    <option value="month">Within a month</option>
                    <option value="quarter">Within a quarter</option>
                    <option value="year">Within a year</option>
                    <option value="multi_year">More than a year</option>
                  </select>
                </label>
              </div>
              {quests.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No Quests match.</p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">
                  {quests.map((q) => (
                    <li key={q.id}>
                      <button type="button" onClick={() => open(q.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" data-quest-row={q.id}>
                        <div className="text-sm text-slate-900 dark:text-white">{q.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {TYPE_LABEL[q.type]} · {q.approved ? STATUS_LABEL[q.status] : 'Draft'} · {q.horizonLabel} · result due {q.settlesOn}
                          {q.tutorial ? ' · Tutorial' : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {openId && (
            <div className="space-y-3">
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setOpenId(null)}>
                Back to all Quests
              </button>
              {detailError && <p className="text-sm text-rose-700 dark:text-rose-400">This Quest did not load: {detailError}</p>}
              {!detail && !detailError && <p className="text-sm text-slate-500">Loading…</p>}
              {detail && (
                <>
                  <h3 className="text-base text-slate-900 dark:text-white">{detail.quest.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {TYPE_LABEL[detail.quest.type]} · {detail.summary.approved ? STATUS_LABEL[detail.summary.status] : 'Draft, not yet approved'} · opens {detail.quest.opensOn}, entries close {detail.quest.closesOn}, result due {detail.summary.settlesOn}
                  </p>
                  <p className="text-sm">{detail.quest.summary}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{HOW_IT_ENDS[detail.quest.type]}</p>
                  {detail.rule && (
                    <div className="border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                      <div className="text-xs text-slate-500">Rule</div>
                      <p className="text-sm">{detail.rule}</p>
                      {detail.fallback && <p className="text-xs text-slate-500 dark:text-slate-400">{detail.fallback}</p>}
                    </div>
                  )}
                  {detail.quest.type === 'debate' && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Positions</div>
                      <ul className="list-disc pl-5 text-sm">
                        {detail.quest.positions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.quest.type === 'replication' && (
                    <p className="text-sm">
                      Reproduce: {detail.quest.target} Tolerance: {detail.quest.tolerance}.
                    </p>
                  )}
                  {detail.quest.type === 'signal' && <p className="text-sm">Idea to test: {detail.quest.hypothesis}</p>}
                  {detail.figures.length > 0 && (
                    <table className="w-full text-sm" data-quest-figures>
                      <thead>
                        <tr className="text-xs text-slate-500 text-left">
                          <th className="py-1 pr-2 font-normal">Series</th>
                          <th className="py-1 pr-2 font-normal">Latest</th>
                          <th className="py-1 font-normal">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.figures.map((f) => (
                          <tr key={`${f.country}-${f.series}`} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="py-1 pr-2">{f.label}</td>
                            <td className="py-1 pr-2 tabular-nums">{f.missing ? `Missing: ${f.missing}` : `${f.value} ${f.unit ?? ''} (${f.date})`}</td>
                            <td className="py-1 text-xs text-slate-500">{f.source ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {detail.quest.knownLimits.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Known limits</div>
                      <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {detail.quest.knownLimits.map((k) => (
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
                      <BriefBox brief={detail.brief ?? null} quest={detail.quest} />
                      <EvidenceMapBox quest={detail.quest} items={items} brief={detail.brief?.brief ?? null} related={detail.related ?? []} />
                      <Argue quest={detail.quest} items={items} />
                    </>
                  )}
                  <p className="text-xs text-slate-500">
                    File: {detail.file}
                    {detail.quest.discussion ? (
                      <>
                        {' · '}
                        <a className="underline" href={detail.quest.discussion} target="_blank" rel="noreferrer">
                          Discussion
                        </a>
                      </>
                    ) : null}
                  </p>
                </>
              )}
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
  if (!r.ok || j.error) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

function LogPrivately({ quest }: { quest: Quest }) {
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
      setMsg(`Logged on this computer at ${String(j.entry.loggedAt).slice(0, 16).replace('T', ' ')} UTC. Hash ${String(j.entry.hash).slice(0, 12)}…. You can log again until entries close; the last one counts.`);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  };
  return (
    <Box title="Log privately">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{level ? 'Your forecast (number)' : 'Probability of yes (%)'}</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-answer />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">Class code (optional)</span>
          <input className={`${fieldCls} w-36`} value={group} onChange={(e) => setGroup(e.target.value)} />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">Why (optional)</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>
      <button type="button" className="ui-btn" onClick={submit} disabled={!value.trim()} data-quest-log>
        Log on this computer
      </button>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
    </Box>
  );
}

function Practice({ questId }: { questId: string }) {
  const [q, setQ] = useState<{ token: string; question: string } | null>(null);
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
      setResult(
        `It ${r.happened ? 'did' : 'did not'} happen: ${r.start.value} on ${r.start.date}, ${r.end.value} on ${r.end.date}. Your Brier score ${r.brier.toFixed(3)}` +
          (r.baseBrier === null ? ' (too little earlier history for a base rate).' : `; base rate ${(r.baseRate * 100).toFixed(0)}% scores ${r.baseBrier.toFixed(3)}, so your skill is ${r.skill.toFixed(3)}.`) +
          ' Practice only: not saved.',
      );
      setQ(null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  return (
    <Box title="Practise on the past">
      {!q && (
        <button type="button" className="ui-btn ui-btn-ghost" onClick={ask} data-quest-practice>
          New practice question
        </button>
      )}
      {q && (
        <div className="space-y-2">
          <p className="text-sm">{q.question}</p>
          <label className="text-xs inline-flex items-center gap-2">
            <span>Probability (%)</span>
            <input className={`${fieldCls} w-24`} inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
          </label>
          <button type="button" className="ui-btn" onClick={answer}>
            Check
          </button>
        </div>
      )}
      {result && <p className="text-xs text-slate-600 dark:text-slate-300">{result}</p>}
      {err && <p className="text-xs text-rose-700 dark:text-rose-400">{err}</p>}
    </Box>
  );
}

type ScoredEntry = { entry: { id: string; questId: string; loggedAt: string; answer: { probability?: number; level?: number; position?: number; value?: number }; group?: string }; title: string; counted: boolean; hashOk: boolean; score: { status: string; note?: string; brier?: number; error?: number; skill?: number | null } };

function MyEntries() {
  const [data, setData] = useState<{ author: string; entries: ScoredEntry[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/private').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!data.entries.length) return <p className="text-sm text-slate-500">No entries logged on this computer yet. Open a forecast Quest and use Log privately, or argue a Debate Quest.</p>;
  return (
    <table className="w-full text-sm" data-quest-mine>
      <thead>
        <tr className="text-xs text-slate-500 text-left">
          <th className="py-1 pr-2 font-normal">Quest</th>
          <th className="py-1 pr-2 font-normal">Answer</th>
          <th className="py-1 font-normal">Result</th>
        </tr>
      </thead>
      <tbody>
        {data.entries.map((e) => (
          <tr key={e.entry.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
            <td className="py-1 pr-2">
              {e.title}
              <div className="text-xs text-slate-500">
                {e.entry.loggedAt.slice(0, 10)} · {e.counted ? 'counts' : 'replaced by a later entry'}
                {e.hashOk ? '' : ' · hash does not match'}
              </div>
            </td>
            <td className="py-1 pr-2 tabular-nums">{e.entry.answer.value !== undefined ? e.entry.answer.value : e.entry.answer.position !== undefined ? `Position ${e.entry.answer.position}` : e.entry.answer.level !== undefined ? e.entry.answer.level : `${Math.round((e.entry.answer.probability ?? 0) * 100)}%`}</td>
            <td className="py-1 text-xs">
              {e.score.status === 'settled'
                ? `${e.score.brier !== undefined ? `Brier ${e.score.brier.toFixed(3)}` : `Error ${e.score.error}`}; skill ${e.score.skill === null || e.score.skill === undefined ? 'no baseline' : e.score.skill.toFixed(3)}`
                : e.score.note}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClassTable() {
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
      <p className="text-xs text-slate-500 dark:text-slate-400">For a class running its own server: everyone logs privately with the same class code, and the table shows each person's counted entries. It never leaves this server.</p>
      <div className="flex gap-2">
        <input className={`${fieldCls} w-40`} placeholder="Class code" value={code} onChange={(e) => setCode(e.target.value)} data-quest-class-code />
        <button type="button" className="ui-btn" onClick={load} disabled={!code.trim()}>
          Show
        </button>
      </div>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
      {data && (data.rows.length === 0 ? <p className="text-sm text-slate-500">No entries with that code.</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">Person</th>
              <th className="py-1 pr-2 font-normal">Entries</th>
              <th className="py-1 pr-2 font-normal">Settled</th>
              <th className="py-1 pr-2 font-normal">Skill vs base rate</th>
              <th className="py-1 font-normal">Skill vs no change</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.author} className="border-t border-slate-200 dark:border-slate-800 tabular-nums">
                <td className="py-1 pr-2">{r.author}</td>
                <td className="py-1 pr-2">{r.entries}</td>
                <td className="py-1 pr-2">{r.settled}</td>
                <td className="py-1 pr-2">{r.probabilitySkill ?? 'none yet'}</td>
                <td className="py-1">{r.levelSkill ?? 'none yet'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {data && <p className="text-xs text-slate-500">{data.note}</p>}
    </div>
  );
}

const STATE_LABEL: Record<Exclude<QuestResultState['state'], 'none'>, string> = { settled: 'Settled', unresolvable: 'Unresolvable', withdrawn: 'Withdrawn' };

/** One Quest's recorded result, with the decision on a dispute when there was one. */
function ResultBox({ state }: { state: Exclude<QuestResultState, { state: 'none' }> }) {
  const decision = 'decision' in state ? state.decision : undefined;
  return (
    <Box title={`Result: ${STATE_LABEL[state.state]}`}>
      <p className="text-sm" data-quest-result={state.state}>
        {describeOutcome(state.line)}
      </p>
      {decision && <p className="text-sm">{describeOutcome(decision)}</p>}
      <p className="text-xs text-slate-500">
        Recorded {state.line.at.slice(0, 10)} by {state.line.by}, line {state.line.seq} of quests/resolutions.jsonl. A recorded result is never changed; a dispute adds a decision below it.
      </p>
    </Box>
  );
}

type ResultsReply = { chain: string; badLines: number; lines: ResolutionLine[]; quests: Array<{ questId: string; title: string } & QuestResultState> };
type DueReply = { today: string; due: Array<{ questId: string; title: string; approved: boolean; settlesOn: string; result: ResolutionDraft | null; waiting?: string }> };

/** The public record of results, and a preview of what the feeds give for Quests now due. */
function Results() {
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
        When a Quest's date has passed, its answer is read from the feed exactly as its rule says and written to a public file, quests/resolutions.jsonl, one line per result. Each line carries a fingerprint (a SHA-256 hash) of the line before it, so if anyone changes or deletes an old line, the check below fails. A result is never edited: if someone disputes it, a maintainer adds a decision underneath, and both stay visible. Yearly figures such as government debt are read as the source first published them after the date, because sources often revise them later.
      </p>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
      {data && (
        <p className={`text-sm ${data.chain === 'holds' ? '' : 'text-rose-700 dark:text-rose-400'}`} data-quest-chain>
          Check of the record: {data.chain === 'holds' ? `every line is intact (${data.lines.length} line${data.lines.length === 1 ? '' : 's'})` : `the record is ${data.chain}; results after that line cannot be trusted until it is restored`}
          {data.badLines ? `; ${data.badLines} unreadable line(s)` : ''}.
        </p>
      )}
      {data && data.quests.length === 0 && <p className="text-sm text-slate-500">No results recorded yet.</p>}
      {data && data.quests.length > 0 && (
        <ul className="space-y-2">
          {data.quests.map((q) => (
            <li key={`${q.questId}-${q.state}`} className="border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
              <div className="font-medium">{q.title}</div>
              {q.state !== 'none' && <div>{describeOutcome(q.line)}</div>}
              {q.state !== 'none' && 'decision' in q && q.decision && <div>{describeOutcome(q.decision)}</div>}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <button type="button" className="ui-btn" onClick={check} disabled={busy} data-quest-check-due>
          {busy ? 'Reading the feeds…' : 'Preview what is due now'}
        </button>
        <p className="text-xs text-slate-500">
          A preview only: it shows what the feeds give today for Quests past their date. Nothing is recorded until a maintainer runs npm run quests:resolve, and drafts are never recorded.
        </p>
        {due && due.due.length === 0 && <p className="text-sm text-slate-500">No Quest is past its date without a result.</p>}
        {due && due.due.length > 0 && (
          <ul className="space-y-1 text-sm">
            {due.due.map((d) => (
              <li key={d.questId}>
                <span className="font-medium">{d.title}</span>
                {d.approved ? '' : ' (draft)'}: {d.result ? describeOutcome(d.result) : d.waiting}
              </li>
            ))}
          </ul>
        )}
      </div>
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
    <Box title="Enter publicly">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        A public entry goes on the project's GitHub page under your GitHub name, so your score can count on the public tables. You need a free GitHub account. Your forecast, your reason and your name are public and stay in the project's history for good. You can replace your entry until entries close; every entry is kept, and the last one counts.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">GitHub name</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" data-quest-login />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">{level ? 'Your forecast (number)' : 'Probability of yes (%)'}</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-public-answer />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">Why (optional, public)</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>
      <button type="button" className="ui-btn" onClick={make} disabled={!value.trim() || !login.trim()} data-quest-draft-entry>
        Prepare entry
      </button>
      {err && <p className="text-xs text-rose-700 dark:text-rose-400">{err}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `This replaces your entry ${draft.replaces}; both are kept. ` : ''}File: {draft.path}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto">{draft.text}</pre>
          <p>{draft.note}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            Open on GitHub
          </a>
        </div>
      )}
      <p className="text-xs text-slate-500">No GitHub, or GitHub is blocked where you are? See the project's contributing guide: a maintainer can post an entry you email before entries close.</p>
    </Box>
  );
}

type PublicReply =
  | { open: true; count: number; note: string }
  | { open: false; count: number; answer: 'probability' | 'level'; spread: { n: number; low: number; median: number; high: number } | null; entries: Array<{ login: string; n: number; via: string; answer: { probability?: number; level?: number }; rationale?: string; score: { status: string; note?: string; brier?: number; error?: number; skill?: number | null } }> };

/** Public entries: hidden until close, then each counted entry with its score and the spread. */
function PublicEntries({ questId }: { questId: string }) {
  const [data, setData] = useState<PublicReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">Public entries did not load: {err}</p>;
  if (!data) return null;
  const show = (a: { probability?: number; level?: number }) => (a.level !== undefined ? String(a.level) : `${Math.round((a.probability ?? 0) * 100)}%`);
  return (
    <Box title={`Public entries (${data.count})`}>
      {data.open ? (
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {data.note}
        </p>
      ) : data.entries.length === 0 ? (
        <p className="text-xs text-slate-500">No public entries.</p>
      ) : (
        <>
          {data.spread && (
            <p className="text-sm" data-quest-spread>
              The middle answer was {data.answer === 'level' ? data.spread.median : `${Math.round(data.spread.median * 100)}%`}; half of the {data.spread.n} entries were between {data.answer === 'level' ? data.spread.low : `${Math.round(data.spread.low * 100)}%`} and {data.answer === 'level' ? data.spread.high : `${Math.round(data.spread.high * 100)}%`}.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 text-left">
                <th className="py-1 pr-2 font-normal">Who</th>
                <th className="py-1 pr-2 font-normal">Answer</th>
                <th className="py-1 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e.login} className="border-t border-slate-200 dark:border-slate-800 align-top">
                  <td className="py-1 pr-2">
                    {e.login}
                    {e.n > 1 ? <span className="text-xs text-slate-500"> (entry {e.n})</span> : null}
                    {e.via === 'email' ? <span className="text-xs text-slate-500"> (emailed)</span> : null}
                    {e.rationale && <div className="text-xs text-slate-500">{e.rationale}</div>}
                  </td>
                  <td className="py-1 pr-2 tabular-nums">{show(e.answer)}</td>
                  <td className="py-1 text-xs">
                    {e.score.status === 'settled'
                      ? `${e.score.brier !== undefined ? `Brier ${e.score.brier.toFixed(3)}` : `Error ${e.score.error}`}; skill ${e.score.skill === null || e.score.skill === undefined ? 'no baseline' : e.score.skill.toFixed(3)}`
                      : e.score.note}
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
function G<T>({ g, show }: { g: Gated<T>; show: (v: T) => ReactNode }) {
  return 'value' in g ? <>{show(g.value)} <span className="text-xs text-slate-500">({g.n})</span></> : <span className="text-xs text-slate-500">needs {g.needs} more ({g.n} so far)</span>;
}

function BoardTable({ rows, onPick }: { rows: BoardRow[]; onPick: (login: string) => void }) {
  if (!rows.length) return <p className="text-sm text-slate-500">Nobody has enough settled forecasts to be ranked yet.</p>;
  return (
    <table className="w-full text-sm" data-quest-board>
      <thead>
        <tr className="text-xs text-slate-500 text-left">
          <th className="py-1 pr-2 font-normal">#</th>
          <th className="py-1 pr-2 font-normal">Who</th>
          <th className="py-1 pr-2 font-normal">Skill</th>
          <th className="py-1 pr-2 font-normal">90% range</th>
          <th className="py-1 font-normal">Forecasts</th>
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
              {fmt(r.low)} to {fmt(r.high)}
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
  const [data, setData] = useState<QuestStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [table, setTable] = useState('all');
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/stats').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  const person = who ? data.contributors.find((c) => c.login === who) : null;
  if (person) return <Contributor c={person} onBack={() => setWho(null)} />;

  const rows = table === 'all' ? data.board.allTime : table.startsWith('season:') ? data.board.seasons[table.slice(7)] ?? [] : data.board.fields[table.slice(6)] ?? [];
  return (
    <div className="space-y-3" data-quest-scoreboard>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        People are ranked on one thing: skill, meaning how much better their probabilities were than simply using the base rate (how often the same thing happened in the past). Plus means better than the base rate, minus means worse, and 0 means no better. The 90% range shows how sure we can be: if two people's ranges overlap, they may not really differ. To be ranked, a person needs at least {data.minimums.skill} settled forecasts, so one lucky call cannot top the table, and a GitHub account that was at least {data.accountDays} days old when the first Quest they entered closed. Nobody is ranked on how many Quests they enter. Everything here is worked out from the public entries and the recorded results, so anyone can check it.
      </p>
      <label className="text-xs inline-flex items-center gap-1">
        <span>Table</span>
        <select className={fieldCls} value={table} onChange={(e) => setTable(e.target.value)} data-quest-board-table>
          <option value="all">All time</option>
          {Object.keys(data.board.seasons).map((y) => (
            <option key={y} value={`season:${y}`}>
              Season {y}
            </option>
          ))}
          {Object.keys(data.board.fields).map((f) => (
            <option key={f} value={`field:${f}`}>
              {f} only (needs {data.minimums.field} in the field)
            </option>
          ))}
        </select>
      </label>
      <BoardTable rows={rows} onPick={setWho} />
      <p className="text-sm">
        The crowd (the middle answer on each Quest) against the base rate: <G g={data.crowd} show={(v) => fmt(v)} />
      </p>
      {data.contributors.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Everyone who has entered</div>
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
      {data.contributors.length === 0 && <p className="text-sm text-slate-500">No public entries yet.</p>}
    </div>
  );
}

function Contributor({ c, onBack }: { c: ContributorStats; onBack: () => void }) {
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
        Back to the scoreboard
      </button>
      <h3 className="ui-title">
        {c.login}
        {c.emailed ? <span className="text-xs text-slate-500"> (entries emailed to a maintainer)</span> : null}
      </h3>
      <p className="text-sm">
        {c.entered} Quest{c.entered === 1 ? '' : 's'} entered: {c.settled} settled, {c.unresolvable} unresolvable or withdrawn, {c.waiting} waiting for a result.
      </p>
      {c.unranked && <p className="text-xs text-slate-500">Not on the scoreboard: {c.unranked}.</p>}
      <ProfileStances login={c.login} />
      <table className="w-full text-sm">
        <tbody>
          {row('Skill', <G g={c.skill} show={(v) => `${fmt(v.score)} (90% range ${fmt(v.low)} to ${fmt(v.high)})`} />, 'Better (+) or worse (-) than the base rate, averaged over settled probability forecasts.')}
          {row('Beat no change', <G g={c.beatNoChange} show={(v) => pct(v)} />, 'Share of number forecasts that were closer than assuming nothing moves.')}
          {row('Sharpness', <G g={c.sharpness} show={(v) => v.toFixed(2)} />, '0 = always said 50%; 1 = always said 0% or 100%. Being sharp only helps if you are also right.')}
          {row('Calibration gap', <G g={c.calibration} show={(v) => pct(v.gap)} />, 'How far, on average, what was said was from what happened (0% = when they said 70%, it happened 70% of the time).')}
          {row('Against the crowd', <G g={c.contrarian} show={(v) => fmt(v)} />, 'Skill on Quests where they called the other outcome from the crowd\'s middle answer.')}
          {row('Streak', <G g={c.streak} show={(v) => String(v)} />, 'Settled Quests in a row with positive skill, latest first. Shown, never ranked.')}
        </tbody>
      </table>
      {'value' in c.calibration && (
        <table className="w-full text-xs" data-quest-calibration>
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">They said</th>
              <th className="py-1 pr-2 font-normal">On average</th>
              <th className="py-1 pr-2 font-normal">It happened</th>
              <th className="py-1 font-normal">Forecasts</th>
            </tr>
          </thead>
          <tbody>
            {c.calibration.value.bins.map((b) => (
              <tr key={b.from} className="border-t border-slate-200 dark:border-slate-800 tabular-nums">
                <td className="py-1 pr-2">
                  {pct(b.from)} to {pct(b.to)}
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
          <div className="text-xs text-slate-500">Skill by field (each needs 8 settled forecasts in the field)</div>
          <ul className="text-sm">
            {c.fields.map((f) => (
              <li key={`${f.kind}-${f.field}`}>
                {f.field}: <G g={f.stat} show={(v) => fmt(v)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.proposed.length > 0 && (
        <p className="text-sm">
          Quests proposed: {c.proposed.map((p) => `${p.questId} (${p.entries} entr${p.entries === 1 ? 'y' : 'ies'})`).join(', ')}
        </p>
      )}
      {c.tests?.length > 0 && (
        <p className="text-sm" data-quest-tests>
          Tests proposed (never ranked): {c.tests.map((t) => `${t.title} (${t.verdict === null ? 'not run yet' : t.verdict.replace(/_/g, ' ')})`).join('; ')}
        </p>
      )}
      {c.replications?.length > 0 && (
        <p className="text-sm" data-quest-replications>
          Replications (never ranked): {c.replications.map((r) => `${r.title} (${r.matched === null ? 'waiting for the app\'s figure' : r.matched ? 'reproduced' : 'did not match'})`).join('; ')}
        </p>
      )}
      {c.debates?.length > 0 && (
        <p className="text-sm" data-quest-debates>
          Debates argued (never scored or ranked): {c.debates.map((d) => d.title).join('; ')}
        </p>
      )}
      {c.entries.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">Settled Quest</th>
              <th className="py-1 pr-2 font-normal">Answer</th>
              <th className="py-1 font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {c.entries.map((e) => (
              <tr key={e.questId} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="py-1 pr-2">{e.title}</td>
                <td className="py-1 pr-2 tabular-nums">{e.answer === 'probability' ? `${pct(e.p ?? 0)}, ${e.happened ? 'it happened' : 'it did not'}` : ''}</td>
                <td className="py-1 text-xs">{e.answer === 'probability' ? `Brier ${e.brier?.toFixed(3)}; skill ${e.skill === null || e.skill === undefined ? 'no base rate' : fmt(e.skill)}` : `Error ${e.error}; ${e.beatNoChange === null ? 'no no-change baseline' : e.beatNoChange ? 'beat no change' : 'did not beat no change'}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type DigestReply = { closingSoon: Array<{ id: string; title: string; closesOn: string }>; opening: Array<{ id: string; title: string; opensOn: string }>; settled: Array<{ id: string; title: string; result: string }> };

/** This week: Quests closing soon, opening, and results recorded in the last 7 days. Hidden when there is nothing. */
function ThisWeek({ onOpen }: { onOpen: (id: string) => void }) {
  const [d, setD] = useState<DigestReply | null>(null);
  useEffect(() => {
    send('/api/quests/digest').then(setD).catch(() => setD(null));
  }, []);
  if (!d || (!d.closingSoon.length && !d.opening.length && !d.settled.length)) return null;
  const item = (id: string, title: string, note: string) => (
    <li key={id}>
      <button type="button" className="underline text-left" onClick={() => onOpen(id)}>
        {title}
      </button>{' '}
      <span className="text-xs text-slate-500">{note}</span>
    </li>
  );
  return (
    <Box title="This week">
      <div className="text-sm space-y-2" data-quest-this-week>
        {d.closingSoon.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">Closing soon</div>
            <ul>{d.closingSoon.map((x) => item(x.id, x.title, `closes ${x.closesOn}`))}</ul>
          </div>
        )}
        {d.opening.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">Opening</div>
            <ul>{d.opening.map((x) => item(x.id, x.title, `opens ${x.opensOn}`))}</ul>
          </div>
        )}
        {d.settled.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">Results recorded</div>
            <ul>{d.settled.map((x) => item(x.id, x.title, x.result))}</ul>
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
  if (!checks.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1 text-xs" data-quest-claims>
      {checks.map((c, i) => (
        <li key={i}>
          <span className={`font-medium ${VERDICT_TONE[c.verdict] ?? 'text-slate-600 dark:text-slate-300'}`}>{c.verdict}</span>: {c.reading}
        </li>
      ))}
    </ul>
  );
}

/** The opening brief written once by the app's AI model, or why there is none. */
function BriefBox({ brief, quest }: { brief: { brief: DebateBrief; hashOk: boolean } | null; quest: DebateQuest }) {
  if (!brief)
    return (
      <Box title="Opening brief">
        <p className="text-xs text-slate-500">No opening brief has been recorded for this Debate yet. A maintainer writes it once, before entries open, with the app's AI model.</p>
      </Box>
    );
  const b = brief.brief;
  return (
    <Box title="Opening brief">
      <p className="text-xs text-amber-800 dark:text-amber-300" data-quest-brief-label>
        {b.label} Model: {b.model}, written {b.writtenAt.slice(0, 10)}.
        {!brief.hashOk && ' Warning: the file no longer matches the hash it was saved with, so it may have been edited.'}
      </p>
      {b.positions.map((p) => (
        <div key={p.position} className="space-y-1">
          <div className="text-sm font-medium">
            {p.position}. {quest.positions[p.position - 1]}
          </div>
          <p className="text-xs">
            <span className="text-slate-500">Strongest case: </span>
            {p.strongest}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">Weakest point: </span>
            {p.weakest}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">Figures to check: </span>
            {p.check}
          </p>
        </div>
      ))}
    </Box>
  );
}

/** Pick a position and argue it; Claim Check reads the argument as it is written. */
function Argue({ quest, items }: { quest: DebateQuest; items: LiveWatchlistItem[] }) {
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
      setMsg(`Logged on this computer at ${String(j.entry.loggedAt).slice(0, 16).replace('T', ' ')} UTC. You can log again until entries close; the last one counts.`);
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
    <Box title="Argue a position">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Pick the position you find most convincing and say why in your own words, using the figures the app shows. Nobody is scored: the Debate ends with an evidence map of every argument. Claim Check reads your argument as you type and compares each figure you state with the app's figure, so you can fix a figure before you send it.
      </p>
      <div className="space-y-1" role="radiogroup" aria-label="Position">
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
        <span className="block">Your argument (at least {ARGUMENT_MIN} characters; public if you enter publicly)</span>
        <textarea className={`${fieldCls} w-full`} rows={4} maxLength={2000} value={argument} onChange={(e) => setArgument(e.target.value)} data-quest-argument />
      </label>
      {argument.trim().length >= ARGUMENT_MIN && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Claim Check</div>
          <Checks checks={checks} empty="No figure or ranking found that Claim Check can compare with the app's figures (it reads the policy rate, inflation, government debt, primary balance, reserves and growth)." />
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <button type="button" className="ui-btn" onClick={logPrivately} disabled={!ready} data-quest-argue-log>
          Log on this computer
        </button>
        <label className="text-xs space-y-1">
          <span className="block">GitHub name</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={!ready || !login.trim()} data-quest-argue-public>
          Prepare public entry
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `This replaces your entry ${draft.replaces}; both are kept. ` : ''}File: {draft.path}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{draft.note}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            Open on GitHub
          </a>
        </div>
      )}
    </Box>
  );
}

type DebateReply = { open: true; count: number; note: string } | { open: false; count: number; entries: Array<Pick<PublicEntry, 'login' | 'n' | 'via' | 'answer' | 'rationale'>> };

/** After close: who argued what, each argument with its Claim Check readings, and related results. */
function EvidenceMapBox({ quest, items, brief, related }: { quest: DebateQuest; items: LiveWatchlistItem[]; brief: DebateBrief | null; related: EvidenceMap['related'] }) {
  const [data, setData] = useState<DebateReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(quest.id)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [quest.id]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">Entries did not load: {err}</p>;
  if (!data) return null;
  if (data.open)
    return (
      <Box title={`Evidence map (${data.count} ${data.count === 1 ? 'argument' : 'arguments'} so far)`}>
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {data.note} The evidence map appears here once entries close.
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
    <Box title={`Evidence map (${map.total} ${map.total === 1 ? 'argument' : 'arguments'})`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Not scored: no position is marked right or wrong. For each position, how many people argued it, and how many of the figures they stated match or differ from the app's figures today. Read the arguments and the related results and judge for yourself.
      </p>
      <table className="w-full text-sm" data-quest-map>
        <thead>
          <tr className="text-xs text-slate-500 text-left">
            <th className="py-1 pr-2 font-normal">Position</th>
            <th className="py-1 pr-2 font-normal">Argued by</th>
            <th className="py-1 pr-2 font-normal">Figures that match</th>
            <th className="py-1 font-normal">Figures that differ</th>
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
                    {a.via === 'email' ? ' (emailed)' : ''}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{a.argument}</p>
                  <Checks checks={a.checks} empty="Claim Check found no figure or ranking it could compare." />
                </div>
              ))}
            </div>
          </details>
        ))}
      {map.related.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">What related Forecast Quests found</div>
          <ul className="list-disc pl-5 text-xs">
            {map.related.map((r) => (
              <li key={r.questId}>
                {r.title}: {r.result}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="ui-btn" onClick={exportMd} disabled={!map.total} data-quest-map-export>
        Export evidence map (Markdown)
      </button>
      <p className="text-xs text-slate-500">Claim Check compares figures with the app's figures as they are today, which may be newer than when an argument was written. It is a check against the app, not a verdict on the truth.</p>
    </Box>
  );
}

// ---------------------------------------------------------------- Replication Quests (step 10)

/** Enter a replication: the figure the script produced and where the script is. */
function Replicate({ quest }: { quest: ReplicationQuest }) {
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
      setMsg(`Logged on this computer at ${String(j.entry.loggedAt).slice(0, 16).replace('T', ' ')} UTC.`);
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
    <Box title="Enter a replication">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Write a script in any language (R, Python, Stata, a spreadsheet with its formulas) that rebuilds the figure from the same public data, put it somewhere anyone can read it (a GitHub repository or gist), and enter the figure it gives. After entries close, the maintainer records the app's own figure; your entry reproduces it if it is within {quest.tolerance} of it. If your script shows the app is wrong, say why in the notes: that solves the Quest too, and the app gets fixed.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">Your script's figure</span>
          <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-quest-replication-value />
        </label>
        <label className="text-xs space-y-1 grow">
          <span className="block">Where the script is (https address)</span>
          <input className={`${fieldCls} w-full`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="https://github.com/you/repo/blob/main/bohn.R" data-quest-replication-code />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">Notes (optional): data vintage, settings, and any difference you found</span>
        <textarea className={`${fieldCls} w-full`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2 items-end">
        <button type="button" className="ui-btn" onClick={logPrivately} disabled={!ready}>
          Log on this computer
        </button>
        <label className="text-xs space-y-1">
          <span className="block">GitHub name</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={!ready || !login.trim()} data-quest-replication-public>
          Prepare public entry
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `This replaces your entry ${draft.replaces}; both are kept. ` : ''}File: {draft.path}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{draft.note}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            Open on GitHub
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
  const [data, setData] = useState<ReplicationReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">Entries did not load: {err}</p>;
  if (!data) return null;
  return (
    <Box title={`Replications (${data.count})`}>
      {data.open ? (
        <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden>
          {data.note}
        </p>
      ) : data.entries.length === 0 ? (
        <p className="text-xs text-slate-500">No replications were entered.</p>
      ) : (
        <table className="w-full text-sm" data-quest-replications-table>
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="py-1 pr-2 font-normal">Who</th>
              <th className="py-1 pr-2 font-normal">Figure</th>
              <th className="py-1 font-normal">Against the app</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.login} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="py-1 pr-2">
                  {e.login}
                  {e.via === 'email' ? <span className="text-xs text-slate-500"> (emailed)</span> : null}
                  {e.code && (
                    <div className="text-xs">
                      <a className="underline" href={e.code} target="_blank" rel="noreferrer noopener">
                        Script
                      </a>
                    </div>
                  )}
                  {e.rationale && <div className="text-xs text-slate-500">{e.rationale}</div>}
                </td>
                <td className="py-1 pr-2 tabular-nums">{e.answer.value}</td>
                <td className={`py-1 text-xs ${e.score.status === 'replicated' ? (e.score.matched ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400') : ''}`}>{e.score.note}</td>
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
    parseError = `Not valid JSON yet: ${e?.message || e}`;
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
    <Box title="Propose a test">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        A test asks whether a rule would have beaten the simplest guess (how often the same thing happened after any month or week) on past data, using only figures that had been published at the time. You write the whole test down before anything is run: the rule, every setting, the years to use and the pass mark. Once entries close, the maintainer runs every test once. Its verdict is recorded and never changed: a failed test stays failed and is never re-tuned. Every test tried also makes the bar higher for all the others (the Holm correction), so propose a test you believe in, not many variations.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Pass mark floor: at least {SIGNAL_FLOOR.minCases} cases over at least {SIGNAL_FLOOR.minYears} years, a p of {SIGNAL_FLOOR.maxPValue} or less with whole years resampled, and at least {SIGNAL_FLOOR.minLiftPts} point better than the base rate. You may ask for more, never less. Tests are entered in public (a pull request, or by email to the maintainer), so they are fixed in the open.
      </p>
      <div className="text-xs space-y-1" data-quest-test-methods>
        <div className="text-slate-500">Rules a test can use</div>
        <ul className="list-disc pl-5">
          {methods.map((m) => (
            <li key={m}>
              <code>{m}</code>: {SIGNAL_METHODS[m].label}. Settings: {SIGNAL_METHODS[m].params.join(', ')}.{SIGNAL_METHODS[m].local ? ' Reads files on the maintainer\'s computer.' : ''}
            </li>
          ))}
        </ul>
        <p className="text-slate-500">A test that needs a rule or data the app does not have yet starts with a code pull request that adds it.</p>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="block">Your test (start from the example and change it)</span>
        <textarea className={`${fieldCls} w-full font-mono`} rows={14} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} data-quest-test-text />
      </label>
      {problems.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-400" data-quest-test-problems>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" data-quest-test-ok>
          The test can be run as written.
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">GitHub name</span>
          <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <button type="button" className="ui-btn" onClick={preparePublic} disabled={problems.length > 0 || !login.trim()} data-quest-test-public>
          Prepare public entry
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {draft && (
        <div className="space-y-1 text-xs" data-quest-draft>
          <p>
            {draft.replaces ? `This replaces your entry ${draft.replaces}; both are kept, and only the newest is run. ` : ''}File: {draft.path}
          </p>
          <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{draft.text}</pre>
          <p>{draft.note}</p>
          <a className="ui-btn inline-block" href={draft.url} target="_blank" rel="noreferrer">
            Open on GitHub
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
  const [data, setData] = useState<SignalReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send(`/api/quests/${encodeURIComponent(questId)}/entries`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [questId]);
  if (err) return <p className="text-xs text-rose-700 dark:text-rose-400">Tests did not load: {err}</p>;
  if (!data) return null;
  return (
    <Box title={`Tests proposed (${data.count})`}>
      <p className="text-xs text-slate-600 dark:text-slate-300" data-quest-entries-hidden={data.open ? '' : undefined}>
        {data.note}
      </p>
      {!data.open && data.error && <p className="text-xs text-rose-700 dark:text-rose-400">{data.error}</p>}
      {!data.open && data.entries.length === 0 && <p className="text-xs text-slate-500">No tests were proposed.</p>}
      {!data.open &&
        data.entries.map((e) => (
          <div key={e.login} className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1" data-quest-test-entry>
            <div className="text-sm">
              {e.login}
              {e.via === 'email' ? <span className="text-xs text-slate-500"> (emailed)</span> : null}
              {e.answer.test ? <span className="text-xs text-slate-500"> · {SIGNAL_METHODS[e.answer.test.method]?.label ?? e.answer.test.method}</span> : null}
            </div>
            {e.answer.test && <p className="text-sm">{e.answer.test.hypothesis}</p>}
            {e.verdict ? (
              <p className={`text-xs ${GRADE_CLS[e.verdict.label] ?? ''}`} data-quest-test-verdict>
                <strong>{e.verdict.label}.</strong> {e.verdict.text}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Not run yet.</p>
            )}
            {e.answer.test && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500">The test as entered</summary>
                <pre className="p-2 bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(e.answer.test, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      <p className="text-xs text-slate-500">Results on past data are hypothetical: they show how a rule would have done, not money made. Passing does not mean a rule will work in future.</p>
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
  const [data, setData] = useState<StancesReply | null>(null);
  useEffect(() => {
    send('/api/quests/stances').then(setData).catch(() => setData(null));
  }, []);
  const p = data?.profiles.find((x) => x.login === login);
  if (!data || !p) return null;
  return (
    <div className="space-y-1" data-quest-profile-stances>
      <div className="text-xs text-slate-500">Stances {login} chose to show (since {p.shownSince}; self-declared, never worked out by the app)</div>
      <ul className="text-sm list-disc pl-5">
        {data.axes.filter((a) => p.axes[a.id] !== undefined).map((a) => (
          <li key={a.id}>
            {a.question} {stanceWords(a, p.axes[a.id])}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stances: set your own (kept in this browser), sign up with a profile on GitHub if you want one, and see who has. */
function StancesView() {
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
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  const problems = stancesProblems(mine);
  const today = new Date().toISOString().slice(0, 10);
  const profile: StanceProfile = { login: login.trim(), axes: mine, shownSince: today };
  const text = profileFileText(profile);
  const canSignUp = !problems.length && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login.trim()) && understood && !!data.repo;
  return (
    <div className="space-y-3" data-quest-stances>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Eight questions economists disagree on. Each is a scale between two positions; leave any you would rather not answer. These are about economics, not parties: there is no left or right label and no answer is marked right. The app never works out anyone's stance from their forecasts or arguments. What you set here stays in this browser.
      </p>
      <div className="space-y-3">
        {data.axes.map((a) => (
          <fieldset key={a.id} className="border border-slate-200 dark:border-slate-800 p-2 space-y-1" data-quest-stance-axis={a.id}>
            <legend className="text-sm px-1">{a.question}</legend>
            <p className="text-xs text-slate-500 dark:text-slate-400">{a.explain}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="w-40 text-right">{a.first}</span>
              {STANCE_STEPS.map((v) => (
                <label key={v} className="inline-flex flex-col items-center">
                  <input type="radio" name={`stance-${a.id}`} checked={mine[a.id] === v} onChange={() => set(a.id, v)} aria-label={stanceWords(a, v)} />
                </label>
              ))}
              <span className="w-40">{a.second}</span>
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => set(a.id, undefined)} disabled={mine[a.id] === undefined}>
                Leave out
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{stanceWords(a, mine[a.id])}</p>
          </fieldset>
        ))}
      </div>
      <Box title="Sign up with a profile (optional)">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          If you want your stances on your public contributor page, add them as a file on GitHub by your own pull request. Only you can add or change your file. Be sure first: a stance tied to your name is a public statement of your views, and git keeps every version of the file for good, even after you remove it. Nobody has to do this, and it changes nothing about how your forecasts are scored.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Tables of stance against forecasting skill for groups of people are not shown: doing that safely needs a way to collect stances without names, which the project does not have.</p>
        <label className="text-xs inline-flex items-center gap-2">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} data-quest-stance-understood />
          <span>I understand my stances will be public under my GitHub name, and git keeps them.</span>
        </label>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs space-y-1">
            <span className="block">GitHub name</span>
            <input className={`${fieldCls} w-40`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
          </label>
          {canSignUp ? (
            <a className="ui-btn inline-block" href={newFileUrl(data.repo!, 'main', profilePath(profile.login), text)} target="_blank" rel="noreferrer" data-quest-stance-signup>
              Open on GitHub
            </a>
          ) : (
            <button type="button" className="ui-btn" disabled>
              Open on GitHub
            </button>
          )}
        </div>
        {!data.repo && <p className="text-xs text-slate-500">Profiles are not set up on this copy: QUESTS_REPO (the public repository) is not set.</p>}
        {problems.length > 0 && <p className="text-xs text-slate-500">Set at least one stance first.</p>}
        {!problems.length && login.trim() && (
          <pre className="p-2 text-xs bg-slate-50 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap" data-quest-stance-file>
            {profilePath(profile.login)}
            {'\n'}
            {text}
          </pre>
        )}
        <p className="text-xs text-slate-500">To change your profile later, edit your file on GitHub (keep its shownSince date) and open a pull request. To remove it, delete the file by pull request, or ask a maintainer.</p>
      </Box>
      <div className="space-y-1">
        <div className="text-xs text-slate-500">People who signed up with a profile ({data.profiles.length})</div>
        {data.profiles.length === 0 ? (
          <p className="text-sm text-slate-500">Nobody yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {data.profiles.map((p) => (
              <li key={p.login} data-quest-stance-profile={p.login}>
                <strong>{p.login}</strong> <span className="text-xs text-slate-500">since {p.shownSince}</span>
                <ul className="list-disc pl-5 text-xs">
                  {data.axes.filter((a) => p.axes[a.id] !== undefined).map((a) => (
                    <li key={a.id}>
                      {a.question} {stanceWords(a, p.axes[a.id])}
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
