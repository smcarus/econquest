/**
 * Menu > Quests (read only): open questions anyone can answer, argue and check, each with the rule
 * that settles it and the latest value of the series it reads. Shown only when Quests are switched
 * on (QUESTS_ENABLED=on, docs/QUESTS.md); entries, results and scores come in later steps.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, X } from 'lucide-react';
import type { Quest, QuestHorizon, QuestStatus, QuestType } from '../utils/quests';

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
type Detail = { enabled: true; quest: Quest; summary: Summary; file: string; rule?: string; fallback?: string; figures: Figure[] };

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
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open questions anyone can answer, argue and check. Each Quest states the rule that settles it, and every figure shown is read live from a feed. Entries and results are not open yet.
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
