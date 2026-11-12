import { ChartNumbers } from './ChartNumbers';
import { ChartGuide } from './HelpLevel';
import React, { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { V1Reading, V1Series } from '../utils/gdeltDaily';
import { GDELT_V1_SHORT, V1_PERCENTILE_RULE, v1Figures } from '../utils/gdeltDaily';
import type { SpikeMonth } from '../utils/unrestSpikes';
import { ValidationBadge } from './ValidationBadge';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Research > History & data > Event history: protests and violence as a share of the country's
 * events per month, from the GDELT 1.0 event files (utils/gdeltDaily.ts). Shares, not counts,
 * since GDELT's volume grew many times over the years. Before a pull it says Missing and how.
 */

type Reply = { series: V1Series | null; reading: V1Reading | null; spikes?: SpikeMonth[]; spikeSentence?: string | null; spikeMethod?: string; pull: { pulledAt?: string; note?: string }; from: string };

export const GdeltHistoryPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();
  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/gdelt-daily/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);
  const s = reply?.series;
  const r = reply?.reading;
  return (
    <section className="ui-panel" data-gdelt-daily="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">{t('gh_title', { country: countryName })} <ValidationBadge id="unrest_onset" /></h2>
        <p className="ui-label">{t('gh_intro')}</p>
        <ChartGuide id="event_history" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('gh_what'), error })}</p>}
        {reply && !s && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: reply.pull.pulledAt ? t('gh_noneOnDisk', { country: countryName }) : t('gh_notPulled') })} {t('gh_pullWith')} <code>npm run gdelt:daily</code> {t('gh_from', { from: reply.from })}{' '}
            <code>-- --estimate</code> {t('gh_estimate')}{reply.pull.note ? t('gd_lastPull', { note: tx(reply.pull.note) }) : ''}
          </p>
        )}
        {r && v1Figures(r).sentences.length > 0 && <p className="text-sm text-slate-900 dark:text-white">{v1Figures(r).sentences.map(tx).join(' ')}</p>}
        {s && (
          <>
            <div className="h-64" role="img" aria-label={t('gh_aria', { country: countryName, from: s.points[0]?.month ?? '', to: s.points[s.points.length - 1]?.month ?? '' })}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 12 }} width={48} unit="%" />
                  <Tooltip formatter={(v, name) => [`${Number(v).toFixed(2)}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="linear" dataKey="protestPct" name={t('gd_protests')} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="violencePct" name={t('gh_violence')} stroke="#e11d48" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {r && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('gh_reading', {
                  month: r.month,
                  p: r.protestPct,
                  pp: r.protestPctile !== null ? t('gh_pctile', { n: r.protestPctile }) : '',
                  v: r.violencePct,
                  vp: r.violencePctile !== null ? t('gh_pctile', { n: r.violencePctile }) : '',
                  n: r.months,
                  from: r.from,
                })}{' '}
                {tx(V1_PERCENTILE_RULE)}.
              </p>
            )}
            {reply?.spikeSentence && (
              <div className="space-y-1" data-unrest-spikes="true">
                <p className="text-sm text-slate-900 dark:text-white">{tx(reply.spikeSentence)}</p>
                {(reply.spikes || []).filter((x) => x.episodes.length).length > 0 && (
                  <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc pl-5">
                    {(reply.spikes || [])
                      .filter((x) => x.episodes.length)
                      .slice(-8)
                      .reverse()
                      .map((x) => (
                        <li key={x.month}>
                          {t('gh_spike', { month: x.month, what: x.episodes.map(tx).join(t('gh_and')), p: x.protestPct, pz: x.protestZ, v: x.violencePct, vz: x.violenceZ })}
                        </li>
                      ))}
                  </ul>
                )}
                {reply.spikeMethod && <p className="text-xs text-slate-500 dark:text-slate-400">{reply.spikeMethod} {t('gh_prereg')}</p>}
              </div>
            )}
            <ChartNumbers
              caption={t('gh_title', { country: countryName })}
              columns={[t('gh_month'), t('gh_protestsPct'), t('gh_violencePct')]}
              rows={s.points.map((p) => [p.month, p.protestPct, p.violencePct])}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('gh_footer', { n: s.points.length, from: s.points[0]?.month ?? '', to: s.points[s.points.length - 1]?.month ?? '', source: GDELT_V1_SHORT, pulled: s.pulledAt ? t('gh_pulled', { date: s.pulledAt.slice(0, 10) }) : '' })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
