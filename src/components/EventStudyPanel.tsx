import React, { useEffect, useState } from 'react';
import { ChartGuide } from './HelpLevel';
import { CalendarClock } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ValidationBadge } from './ValidationBadge';
import { ChartNumbers } from './ChartNumbers';
import { explainInChat } from '../utils/explainHandoff';
import type { EventStudy } from '../utils/eventStudy';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Currency around rate decisions (src/utils/eventStudy.ts):
 * the currency's average path in the days around its own central bank's and the Fed's rate changes.
 */

type Reply = ({ ok: true; sentence: string; method: string; sources: string[] } & EventStudy) | { ok: false; reason: string };

const f = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');

export const EventStudyPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [bank, setBank] = useState<'own' | 'fed'>('own');
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/event-study/${encodeURIComponent(iso3)}?bank=${bank}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, bank]);

  const ok = reply && reply.ok ? reply : null;
  const hikes = ok?.groups.find((g) => g.kind === 'hike');
  const cuts = ok?.groups.find((g) => g.kind === 'cut');
  const days = (hikes?.ok ? hikes.steps : cuts?.steps || []).map((s) => s.day);
  const data = days.map((day) => ({ day, hike: hikes?.steps.find((s) => s.day === day)?.mean, cut: cuts?.steps.find((s) => s.day === day)?.mean }));

  return (
    <section className="ui-panel" data-event-study="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ev_title', { country: countryName })}
          <ValidationBadge id="event_study" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Currency around ${bank === 'own' ? 'its central bank' : 'Fed'} rate changes, ${countryName}`,
                  value: ok.sentence,
                  source: ok.sources.join('; '),
                  asOf: ok.from && ok.to ? `${ok.from} to ${ok.to}` : undefined,
                  iso3,
                  countryName,
                  detail: [ok.method, ...ok.groups.filter((g) => g.ok).map((g) => `${g.kind}s (${g.n}): day 0 ${f(g.dayZero!)}%, day +20 ${f(g.end!)}%`)],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('ev_intro')}</p>
        <ChartGuide id="event_study" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-pill" aria-pressed={bank === 'own'} onClick={() => setBank('own')}>
            {t('ev_own')}
          </button>
          <button type="button" className="ui-pill" aria-pressed={bank === 'fed'} onClick={() => setBank('fed')}>
            {t('ev_fed')}
          </button>
        </div>
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ev_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-event-sentence="true">{tx(ok.sentence)}</p>
            {ok.groups.filter((g) => !g.ok).map((g) => (
              <p key={g.kind} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {g.kind === 'hike' ? t('ev_hikes') : t('ev_cuts')}: {tx(g.reason || '')}.
              </p>
            ))}
            {data.length > 0 && (
              <div className="h-56" role="img" aria-label={t('ev_aria')}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={44} unit="%" />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 2" />
                    <Tooltip formatter={(v: unknown) => `${f(v as number)}%`} labelFormatter={(d) => t('ev_day', { d: String(d) })} />
                    {hikes?.ok && <Line dataKey="hike" name={t('ev_afterHikes', { n: hikes.n })} stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {cuts?.ok && <Line dataKey="cut" name={t('ev_afterCuts', { n: cuts.n })} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <ChartNumbers
              caption={t('ev_caption')}
              columns={[t('ev_colDay'), t('ev_colHikeMean'), t('ev_colHikeBand'), t('ev_colCutMean'), t('ev_colCutBand')]}
              rows={days.map((d) => {
                const h = hikes?.steps.find((s) => s.day === d);
                const c = cuts?.steps.find((s) => s.day === d);
                return [d, h ? f(h.mean) : '—', h ? t('c_range', { from: f(h.lo), to: f(h.hi) }) : '—', c ? f(c.mean) : '—', c ? t('c_range', { from: f(c.lo), to: f(c.hi) }) : '—'];
              })}
              newestFirst={false}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('ev_count', { hikes: hikes?.n ?? 0, cuts: cuts?.n ?? 0, range: ok.from ? `, ${t('c_range', { from: ok.from, to: ok.to ?? '' })}` : '' })} {t('c_method', { method: ok.method })} {t('c_sources', { sources: ok.sources.join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
