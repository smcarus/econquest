/**
 * Menu > Quests (read only): open questions anyone can answer, argue and check, each with the rule
 * that settles it and the latest value of the series it reads. Shown only when Quests are switched
 * on (QUESTS_ENABLED=on, docs/QUESTS.md). Forecasts can be logged privately on this computer,
 * practised on past data, and compared in a class table; nothing here is published.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Compass, X } from 'lucide-react';
import type { Quest, QuestHorizon, QuestStatus, QuestType } from '../utils/quests';
import { describeOutcome, type QuestResultState, type ResolutionDraft, type ResolutionLine } from '../utils/questResolve';

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
type Detail = { enabled: true; quest: Quest; summary: Summary; file: string; rule?: string; fallback?: string; figures: Figure[]; result?: QuestResultState };

const TYPE_LABEL: Record<QuestType, string> = { forecast: 'Forecast', signal: 'Signal', replication: 'Replication', debate: 'Debate' };
const STATUS_LABEL: Record<QuestStatus, string> = { draft: 'Draft', upcoming: 'Opens soon', open: 'Open', closed: 'Closed to entries', due: 'Result due' };
const HOW_IT_ENDS: Record<QuestType, string> = {
  forecast: 'Settled from the feed by the rule below. Scored against the base rate and a no-change forecast.',
  signal: 'Entries are pre-registered tests. Each is run once and badged under the signal standard; a failed test is recorded and never re-tuned.',
  replication: 'Solved when a script reproduces the app\'s figure within the tolerance, or shows where the app is wrong.',
  debate: 'Debate, not a tested signal. Not scored; it closes with an evidence map of the positions and the figures each cites.',
};

export function QuestsDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [list, setList] = useState<ListReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<QuestType | ''>('');
  const [horizon, setHorizon] = useState<QuestHorizon | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [view, setView] = useState<'quests' | 'mine' | 'class' | 'results'>('quests');

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
          {list && list.enabled && !openId && view === 'quests' && (
            <>
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

type ScoredEntry = { entry: { id: string; questId: string; loggedAt: string; answer: { probability?: number; level?: number }; group?: string }; title: string; counted: boolean; hashOk: boolean; score: { status: string; note?: string; brier?: number; error?: number; skill?: number | null } };

function MyEntries() {
  const [data, setData] = useState<{ author: string; entries: ScoredEntry[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    send('/api/quests/private').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  if (err) return <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!data.entries.length) return <p className="text-sm text-slate-500">No entries logged on this computer yet. Open a forecast Quest and use Log privately.</p>;
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
            <td className="py-1 pr-2 tabular-nums">{e.entry.answer.level !== undefined ? e.entry.answer.level : `${Math.round((e.entry.answer.probability ?? 0) * 100)}%`}</td>
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
