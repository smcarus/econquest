import React, { useState } from 'react';
import { shortHash, type RunComparison, type SnapshotSummary } from '../utils/answerSnapshot';
import type { SynthesisResult } from '../utils/askCouncil';
import { useT, useTx } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * The snapshot an answer is pinned to (src/utils/answerSnapshot.ts), folded into one line under
 * the answer: open it for the data date, model, sampling, hashes, agent documents and every figure.
 */
export function AnswerSnapshotDetails({ snapshot, runtimeConfig }: { snapshot: SnapshotSummary; runtimeConfig?: () => Record<string, unknown> }) {
  const s = snapshot;
  const t = useT(CHAT);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex gap-2">
      <dt className="w-24 sm:w-32 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
  return (
    <details className="text-xs text-slate-500 dark:text-slate-400" data-council-snapshot={s.id}>
      <summary className="cursor-pointer">
        {t('sn_summary', { hash: shortHash(s.inputsHash), data: s.asOf ? t('sn_dataAsOf', { date: s.asOf }) : s.dataPinnedAt ? t('sn_pinned') : t('sn_latest'), model: s.model || t('sn_noModel') })}
      </summary>
      <div className="mt-1 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
        <p>
          {t('sn_intro', { temp: s.temperature, seed: s.seed })}
        </p>
        <dl className="space-y-0.5">
          {row(t('sn_asked'), when(s.askedAt))}
          {row(t('sn_data'), s.asOf ? t('sn_dataAsOfLong', { date: s.asOf }) : s.dataPinnedAt ? t('sn_pinnedLong', { when: when(s.dataPinnedAt) }) : t('sn_latestLong'))}
          {row(t('sn_model'), s.model || t('sn_none'))}
          {row(t('sn_sampling'), t('sn_samplingVal', { temp: s.temperature, seed: s.seed }))}
          {row(t('sn_instructions'), <span title={s.templateHash}>{shortHash(s.templateHash)}</span>)}
          {row(t('sn_prompt'), <span title={s.promptHash}>{shortHash(s.promptHash)}</span>)}
          {row(t('sn_io'), (
            <span>
              <span title={s.inputsHash}>{shortHash(s.inputsHash)}</span> / <span title={s.outputHash}>{shortHash(s.outputHash)}</span>
            </span>
          ))}
          {s.rerunOf && row(t('sn_rerunOf'), s.rerunOf)}
        </dl>
        {s.documents.length > 0 && (
          <div>
            <p className="text-slate-700 dark:text-slate-300">{t('sn_docs')}</p>
            <ul className="mt-0.5 space-y-0.5">
              {s.documents.map((d) => (
                <li key={d.docId}>
                  {d.figures === 1 ? t('sn_doc1', { agent: d.agent, version: d.version }) : t('sn_doc', { agent: d.agent, version: d.version, n: d.figures })} <span title={d.hash}>{shortHash(d.hash)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.figures.length > 0 && (
          <details>
            <summary className="cursor-pointer text-slate-700 dark:text-slate-300">{t('sn_figures', { n: s.figures.length })}</summary>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-left tabular-nums">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    <th className="pr-2 font-normal">{t('sn_country')}</th>
                    <th className="pr-2 font-normal">{t('sn_figure')}</th>
                    <th className="pr-2 font-normal">{t('sn_value')}</th>
                    <th className="font-normal">{t('sn_source')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                  {s.figures.map((f, i) => (
                    <tr key={i} className="align-top">
                      <td className="pr-2">{f.iso3}</td>
                      <td className="pr-2">{f.label}</td>
                      <td className="pr-2 whitespace-nowrap">{f.value}</td>
                      <td>{f.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <p>{t('sn_saved', { id: s.id })}</p>
        <RerunSnapshot id={s.id} runtimeConfig={runtimeConfig} />
      </div>
    </details>
  );
}

interface RerunReply {
  rerun: SynthesisResult;
  comparison: RunComparison | null;
}

/** Sends the same snapshot to the model again and says what, if anything, came out different. */
function RerunSnapshot({ id, runtimeConfig }: { id: string; runtimeConfig?: () => Record<string, unknown> }) {
  const [running, setRunning] = useState(false);
  const [reply, setReply] = useState<RerunReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(CHAT);
  const tx = useTx();
  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch('/api/council/rerun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, runtimeConfig: runtimeConfig?.() ?? {} }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(j?.error || t('sn_httpErr', { status: r.status }));
      else setReply(j as RerunReply);
    } catch {
      setError(t('sn_noServer'));
    } finally {
      setRunning(false);
    }
  };
  const c = reply?.comparison;
  const b = reply?.rerun.brief;
  return (
    <div className="space-y-1" data-council-rerun={id}>
      <button type="button" className="ui-btn text-xs" onClick={run} disabled={running}>
        {running ? t('sn_rerunning') : reply ? t('sn_rerunAgain') : t('sn_rerun')}
      </button>
      {!reply && !running && <p>{t('sn_rerunNote')}</p>}
      {error && <p className="text-amber-800 dark:text-amber-300">{error}</p>}
      {reply && !c && <p className="text-amber-800 dark:text-amber-300">{reply.rerun.reason ? tx(reply.rerun.reason) : t('sn_notSaved')}</p>}
      {c && (
        <div className="space-y-1" data-council-rerun-result={c.sameAnswer ? 'same' : 'different'}>
          <ul className="space-y-0.5">
            {c.notes.map((n, i) => (
              <li key={i} className={i === 0 ? (c.sameAnswer ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300') : ''}>
                {tx(n)}
              </li>
            ))}
          </ul>
          {!c.sameAnswer && b && (
            <details>
              <summary className="cursor-pointer text-slate-700 dark:text-slate-300">{t('sn_showChanged')}</summary>
              <div className="mt-1 space-y-1 text-slate-800 dark:text-slate-200">
                {c.headlineChanged && <p>{t('sn_newHeadline', { text: b.headline || t('sn_noneParen') })}</p>}
                {c.pointsAdded.length > 0 && (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t('sn_newSentences')}</p>
                    <ul className="list-disc pl-5">
                      {c.pointsAdded.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.pointsRemoved.length > 0 && (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t('sn_goneSentences')}</p>
                    <ul className="list-disc pl-5 line-through decoration-slate-400">
                      {c.pointsRemoved.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}
          {reply.rerun.snapshot && <p>{t('sn_savedAs', { id: reply.rerun.snapshot.id })}</p>}
        </div>
      )}
    </div>
  );
}
