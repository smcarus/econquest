import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PooledResult } from '../utils/synthPooled';
import { SYNTH_OUTCOMES, SYNTH_SOURCES, type SynthOutcome, type SynthResult } from '../utils/syntheticControl';
import type { EventKind, PolicyEvent } from '../utils/policyEvents';
import { frameOf, type PolicyReview, type ReviewStep, type StepState } from '../utils/policyReview';
import { MAX_KEPT_SYNTH, OUTCOME_KEY, synthEventLabel, synthSentence } from '../utils/synthKeep';
import { CiteButton } from './CiteButton';
import { ValidationBadge } from './ValidationBadge';
import { ChartNumbers } from './ChartNumbers';
import { useHelpLevel } from './HelpLevel';
import { showGuides } from '../utils/helpLevel';
import { useT, useTx } from '../i18n/useLang';
import { SYNTH } from '../i18n/messages/synth';

/**
 * Policy review > Precedents > What happened after (plan step SC4). The review country's changes
 * (src/utils/policyEvents.ts: rules on the figures, your files, your own entries) and, for the one
 * picked, the country against its twin (synthetic control, src/utils/syntheticControl.ts), worked out
 * on request by the server from the saved yearly histories. Nothing is saved except your own events
 * and, when you press "Keep for the policy brief" (SC5), the result, worked out again by the server.
 * Not validated until the pre-registered false-alarm test passes (npm run synth:validate).
 */

interface EventsAnswer {
  iso3: string;
  asOf: string;
  events: PolicyEvent[];
  defaultOutcome: Record<EventKind, SynthOutcome>;
  fileReasons: Record<string, string>;
}
type Answer = SynthResult & { event: PolicyEvent; historyPulledAt?: string };

const FILE_KEY = { fxRegime: 'fileFx', fiscalRules: 'fileFr', chinnIto: 'fileCi' } as const;
const f2 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(2));

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
  return body as T;
}

export const WhatHappenedAfter: React.FC<{
  review: PolicyReview;
  countryName: string;
  /** Called with the saved review after a result is kept for the brief or taken out. */
  onSaved?: (out: { review: PolicyReview; states: Record<ReviewStep, StepState> }) => Promise<void>;
}> = ({ review, countryName, onSaved }) => {
  const t = useT(SYNTH);
  const tx = useTx();
  const guides = showGuides(useHelpLevel());
  const [events, setEvents] = useState<EventsAnswer | null>(null);
  const [picked, setPicked] = useState('');
  const [outcome, setOutcome] = useState<SynthOutcome>('cpi_imf');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [own, setOwn] = useState({ year: '', label: '', sourceUrl: '' });
  const [ownNote, setOwnNote] = useState('');
  const [keepNote, setKeepNote] = useState('');
  const [pooled, setPooled] = useState<PooledResult | null>(null);
  const [pooledBusy, setPooledBusy] = useState(false);
  const base = `/api/reviews/${encodeURIComponent(review.id)}`;
  const year = Number(frameOf(review)?.asOf.slice(0, 4));

  const load = async (select?: string) => {
    try {
      const e = await getJson<EventsAnswer>(`${base}/events`);
      setEvents(e);
      const first = select ?? e.events[0]?.id ?? '';
      setPicked(first);
      const ev = e.events.find((x) => x.id === first);
      if (ev) setOutcome(e.defaultOutcome[ev.kind]);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  useEffect(() => {
    setEvents(null);
    setAnswer(null);
    setError('');
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.id, review.steps.frame?.hash]);

  const eventLabel = (e: Pick<PolicyEvent, 'kind' | 'label' | 'parts'>) => synthEventLabel(e, t);
  const originLabel = (e: PolicyEvent) => t(`origin_${e.origin}` as 'origin_rule');
  const figure = (o: SynthOutcome) => t(OUTCOME_KEY[o]);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setAnswer(await getJson<Answer>(`${base}/what-happened?event=${encodeURIComponent(picked)}&outcome=${outcome}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveOwn = async () => {
    setOwnNote('');
    try {
      const body = await getJson<{ event: PolicyEvent }>(`${base}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: Number(own.year), label: own.label, sourceUrl: own.sourceUrl }) });
      setOwn({ year: '', label: '', sourceUrl: '' });
      setOwnNote(t('ownSaved'));
      await load(body.event.id);
    } catch (err) {
      setOwnNote(t('error', { why: (err as Error).message }));
    }
  };

  const missingText = (a: Answer) => {
    const m = a.missing!;
    const detail = m.reason === 'outside_range' ? t(m.detail === 'above' ? 'above_range' : 'below_range') : m.detail ?? '';
    return t(`m_${m.reason}` as 'm_poor_fit', { detail, country: countryName });
  };

  const sentence = (a: Answer) => {
    const after = a.path.filter((p) => p.k >= 0);
    const at = after.find((p) => p.k === 3) ?? after[after.length - 1];
    if (!at || !a.placebo) return '';
    return synthSentence({ k: at.k, eventYear: a.eventYear, outcome: a.outcome, gap: at.gap, actual: at.actual, twin: at.twin, rank: a.placebo.rank, runs: a.placebo.runs, p: a.placebo.p }, t);
  };
  // SC5: keep the result on the review for the policy brief; the server works it out again.
  const keep = async (body: { event: string; outcome: SynthOutcome } | null, remove?: { event: string; outcome: string }) => {
    setKeepNote('');
    try {
      const out = remove
        ? await getJson<{ review: PolicyReview; states: Record<ReviewStep, StepState> }>(`${base}/what-happened/keep?event=${encodeURIComponent(remove.event)}&outcome=${encodeURIComponent(remove.outcome)}`, { method: 'DELETE' })
        : await getJson<{ review: PolicyReview; states: Record<ReviewStep, StepState> }>(`${base}/what-happened/keep`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!remove) setKeepNote(t('keptNote', { max: MAX_KEPT_SYNTH }));
      await onSaved?.(out);
    } catch (err) {
      setKeepNote(t('error', { why: (err as Error).message }));
    }
  };
  const kept = review.whatHappened ?? [];
  // SC6: every country that made this kind of change, each against its own twin.
  const runPooled = async (kind: string) => {
    setPooledBusy(true);
    setError('');
    try {
      setPooled(await getJson<PooledResult>(`${base}/what-happened/pooled?kind=${encodeURIComponent(kind)}&outcome=${outcome}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPooledBusy(false);
    }
  };

  const current = events?.events.find((e) => e.id === picked);
  const chart = answer && !answer.missing ? answer.path.map((p) => ({ k: p.k, year: p.year, actual: p.actual, twin: p.twin })) : [];

  return (
    <section className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2" data-review-part="what-happened">
      <div className="flex flex-wrap items-center gap-2">
        <h5 className="ui-label">{t('title')}</h5>
        <ValidationBadge id="synthetic_control" />
      </div>
      {guides && <p className="text-xs text-slate-600 dark:text-slate-300 max-w-prose">{t('intro', { country: countryName })}</p>}
      {!events && !error && <p className="text-xs text-slate-500">{t('loading')}</p>}
      {events && (
        <>
          {events.events.length ? (
            <label className="block text-xs">
              <span className="ui-label">{t('events', { country: countryName, year: Number.isFinite(year) ? year : '' })}</span>
              <select
                className="ui-input mt-1 w-full"
                value={picked}
                onChange={(e) => {
                  setPicked(e.target.value);
                  setAnswer(null);
                  setPooled(null);
                  const ev = events.events.find((x) => x.id === e.target.value);
                  if (ev) setOutcome(events.defaultOutcome[ev.kind]);
                }}
              >
                {events.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.year}: {eventLabel(e)} ({originLabel(e)})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('noEvents', { country: countryName, year: Number.isFinite(year) ? year : '' })}</p>
          )}
          {Object.keys(events.fileReasons).length > 0 && (
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer">{t('filesNotRead', { n: Object.keys(events.fileReasons).length })}</summary>
              {Object.entries(events.fileReasons).map(([k, why]) => (
                <p key={k} className="mt-1">
                  {t(FILE_KEY[k as keyof typeof FILE_KEY] ?? 'fileFx')}: {t('fileMissing', { why: tx(why) })}
                </p>
              ))}
            </details>
          )}
          {current && (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('rule', { rule: t(`rule_${current.kind}` as 'rule_own') })}
                {current.sourceUrl && (
                  <>
                    {' '}
                    <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {current.sourceUrl}
                    </a>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  <span className="ui-label">{t('outcome')}</span>
                  <select className="ui-input mt-1" value={outcome} onChange={(e) => { setOutcome(e.target.value as SynthOutcome); setAnswer(null); setPooled(null); }}>
                    {SYNTH_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{figure(o)}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className={answer ? 'ui-btn' : 'ui-btn ui-btn-primary'} disabled={busy} onClick={run}>
                  <History className="w-3.5 h-3.5" /> {busy ? t('running') : t('run')}
                </button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-700 dark:text-red-400">{t('error', { why: error })}</p>}
      {answer?.missing && <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">{missingText(answer)}</p>}
      {answer && !answer.missing && (
        <div className="space-y-2">
          <p className="text-sm text-slate-900 dark:text-white" data-synth-sentence="true">{sentence(answer)}</p>
          {guides && <p className="text-xs text-slate-600 dark:text-slate-300">{t('plainP')}</p>}
          <div className="h-56" role="img" aria-label={t('chartAria', { figure: figure(answer.outcome), country: countryName })}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={44} />
                <ReferenceLine x={answer.eventYear} stroke="#94a3b8" strokeDasharray="4 2" />
                <Tooltip formatter={(v: unknown) => f2(v as number)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="actual" name={countryName} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="twin" name={t('twinLine')} stroke="#64748b" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartNumbers
            caption={t('caption', { figure: figure(answer.outcome), country: countryName })}
            columns={[t('colYear'), countryName, t('colTwin'), t('colGap')]}
            rows={answer.path.map((p) => [p.year, f2(p.actual), f2(p.twin), f2(p.gap)])}
            newestFirst={false}
          />
          <p className="text-xs">{t('twinMadeOf', { list: answer.weights.map((w) => `${w.name} ${(w.weight * 100).toFixed(1)}%`).join(', ') })}</p>
          {answer.dominantDonor && <p className="text-xs text-amber-700 dark:text-amber-400">{t('dominant', { country: answer.weights[0]?.name ?? answer.dominantDonor })}</p>}
          {answer.excluded.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{t('excluded', { list: answer.excluded.join(', ') })}</p>}
          <details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer">{t('checks')}</summary>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>{t('fit', { rmspe: f2(answer.preRmspe), ratio: f2(answer.fitRatio), country: countryName })}</li>
              {answer.leaveOneOut && (
                <li>
                  {t('check_loo', {
                    country: answer.weights.find((w) => w.iso3 === answer.leaveOneOut!.dropped)?.name ?? answer.leaveOneOut.dropped,
                    k: Math.min(3, answer.leaveOneOut.gaps.length - 1),
                    gap: f2(answer.leaveOneOut.gaps[Math.min(3, answer.leaveOneOut.gaps.length - 1)]),
                  })}
                </li>
              )}
              <li>{answer.inTime ? t('check_inTime', { year: answer.inTime.fakeYear, gaps: answer.inTime.gaps.map(f2).join(', ') }) : t('check_inTimeMissing')}</li>
            </ul>
          </details>
          <details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer">{t('method')}</summary>
            <p className="mt-1">{t('methodText')}</p>
            <p className="mt-1">{t('sources', { source: SYNTH_SOURCES[answer.outcome], date: answer.historyPulledAt?.slice(0, 10) ?? '—' })}</p>
          </details>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('notAdvice')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {onSaved && (
              <button type="button" className="ui-btn" onClick={() => keep({ event: answer.event.id, outcome: answer.outcome })} data-synth-keep="true">
                {t('keep')}
              </button>
            )}
            <CiteButton kind="chart" title={t('caption', { figure: figure(answer.outcome), country: countryName })} sources={[SYNTH_SOURCES[answer.outcome]]} asOf={answer.historyPulledAt?.slice(0, 10)} />
          </div>
          {keepNote && <p className="text-xs">{keepNote}</p>}
        </div>
      )}
      {current && current.kind !== 'own' && (
        <div className="space-y-2" data-synth-pooled="true">
          {!pooled && (
            <button type="button" className="ui-btn ui-btn-ghost text-xs" disabled={pooledBusy} onClick={() => runPooled(current.kind)}>
              {pooledBusy ? t('pooledRunning') : t('pooledRun')}
            </button>
          )}
          {pooled && (
            <>
              <p className="ui-label">{t('pooledTitle')}</p>
              {pooled.years.length ? (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    {t('pooledLead', { used: pooled.used, events: pooled.events, year: Number.isFinite(year) ? year : '', countries: pooled.countries })}
                    {pooled.tried < pooled.events ? ` ${t('pooledCapped', { tried: pooled.tried })}` : ''}
                  </p>
                  <div className="h-48" role="img" aria-label={t('pooledAria', { figure: figure(pooled.outcome) })}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={pooled.years.map((y) => ({ k: y.k, median: y.median, band: [y.p10, y.p90] }))} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                        <XAxis dataKey="k" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} width={44} />
                        <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 2" />
                        <ReferenceLine y={0} stroke="#94a3b8" />
                        <Tooltip formatter={(v: unknown) => (Array.isArray(v) ? v.map((x) => f2(x as number)).join(' to ') : f2(v as number))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area dataKey="band" name={t('pooledBand')} stroke="none" fill="#94a3b8" fillOpacity={0.3} isAnimationActive={false} />
                        <Line dataKey="median" name={t('pooledMedian')} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartNumbers
                    caption={t('pooledCaption', { figure: figure(pooled.outcome) })}
                    columns={[t('colK'), t('colN'), t('colMedian'), t('colP10'), t('colP90')]}
                    rows={pooled.years.map((y) => [y.k, y.n, f2(y.median), f2(y.p10), f2(y.p90)])}
                    newestFirst={false}
                  />
                </>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t('pooledNone')}</p>
              )}
              {Object.keys(pooled.missing).length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('pooledMissing', { list: Object.entries(pooled.missing).map(([r, n]) => `${t(`mr_${r}` as 'mr_poor_fit')} ${n}`).join(', ') })}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('pooledNote')}</p>
            </>
          )}
        </div>
      )}
      {kept.length > 0 && (
        <div className="text-xs space-y-1" data-synth-kept="true">
          <p className="ui-label">{t('keptTitle')}</p>
          <ul className="list-disc pl-4 space-y-1">
            {kept.map((x) => (
              <li key={`${x.eventId}-${x.outcome}`}>
                {x.eventYear}: {eventLabel({ kind: x.kind, label: x.eventLabel, parts: x.parts })}, {figure(x.outcome)}{' '}
                {onSaved && (
                  <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => keep(null, { event: x.eventId, outcome: x.outcome })}>
                    {t('unkeep')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer">{t('addOwn')}</summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label>
            <span className="ui-label">{t('ownYear')}</span>
            <input className="ui-input mt-1 w-20" inputMode="numeric" value={own.year} onChange={(e) => setOwn({ ...own, year: e.target.value })} />
          </label>
          <label className="flex-1 min-w-[10rem]">
            <span className="ui-label">{t('ownLabel')}</span>
            <input className="ui-input mt-1 w-full" value={own.label} maxLength={160} onChange={(e) => setOwn({ ...own, label: e.target.value })} />
          </label>
          <label className="flex-1 min-w-[10rem]">
            <span className="ui-label">{t('ownSource')}</span>
            <input className="ui-input mt-1 w-full" type="url" value={own.sourceUrl} onChange={(e) => setOwn({ ...own, sourceUrl: e.target.value })} />
          </label>
          <button type="button" className="ui-btn" onClick={saveOwn}>{t('ownSave')}</button>
        </div>
        {ownNote && <p className="mt-1">{ownNote}</p>}
      </details>
    </section>
  );
};
