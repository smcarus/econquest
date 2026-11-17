import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IndexPoint, SurpriseSeries } from '../utils/dataSurprises';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Data surprises (R9, src/utils/dataSurprises.ts): each release
 * against an expectation published before it (BCB Focus for Brazil, the ECB SPF for euro members,
 * the Kalshi CPI market for the United States, the app's own recorded GDP nowcast where there is
 * one), with the surprise scaled by the spread of earlier surprises.
 */

interface Reply {
  iso3: string;
  series: SurpriseSeries[];
  index?: IndexPoint[];
  pulledAt: string | null;
  problems: string[];
}

const SHOWN = 12;
const signed = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

export const SurprisesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/surprises/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  return (
    <section className="ui-panel" data-surprises="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('sp_title', { country: countryName })}
        </h2>
        <p className="ui-label">{t('sp_intro')}</p>
      </header>
      <div className="p-4 space-y-4">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('sp_what'), error })}</p>}
        {reply && !reply.series.length && <p className="text-sm text-slate-600 dark:text-slate-300" data-missing="true">{t('sp_none', { country: countryName })}</p>}
        {reply && reply.series.some((s) => s.source !== 'nowcast') && (
          <div className="space-y-1" data-surprise-index="true">
            <h3 className="ui-label font-medium">{t('sp_indexTitle')}</h3>
            {reply.index && reply.index.length > 0 ? (
              <>
                <p className="text-sm text-slate-900 dark:text-white">
                  {t('sp_indexNow', { date: reply.index[reply.index.length - 1].date, value: signed(reply.index[reply.index.length - 1].value), n: reply.index[reply.index.length - 1].n })}
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reply.index} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      <Line dataKey="value" name={t('sp_indexTitle')} stroke="#2563eb" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">{t('sp_indexMissing')}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('sp_indexNote')}</p>
          </div>
        )}
        {reply?.series.map((s) => {
          const rows = s.surprises.slice(-SHOWN).reverse();
          const last = s.surprises[s.surprises.length - 1];
          return (
            <div key={s.source} className="space-y-1" data-surprise-series={s.source}>
              <h3 className="ui-label font-medium">
                {t(`sp_ind_${s.source}`)} · {t(`sp_src_${s.source}`)}
              </h3>
              {s.reason && <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">{t('sp_missing', { reason: tx(s.reason) })}</p>}
              {last && (
                <p className="text-sm text-slate-900 dark:text-white">
                  {t(last.surprise > 0 ? 'sp_lastAbove' : last.surprise < 0 ? 'sp_lastBelow' : 'sp_lastSame', { period: last.period, actual: last.actual, expected: last.expected, gap: Math.abs(last.surprise).toFixed(2) })}
                  {last.scaled !== undefined ? ` ${t('sp_lastScaled', { z: signed(last.scaled) })}` : ` ${t('sp_noScale', { n: last.priorCases })}`}
                </p>
              )}
              {rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('sp_period')}</th>
                        <th className="py-1 pr-3 font-medium">{t('sp_expected')}</th>
                        <th className="py-1 pr-3 font-medium">{t('sp_expectedAt')}</th>
                        <th className="py-1 pr-3 font-medium">{t('sp_actual')}</th>
                        <th className="py-1 pr-3 font-medium">{t('sp_surprise')}</th>
                        <th className="py-1 pr-3 font-medium">{t('sp_scaled')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.period} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1 pr-3">{r.period}</td>
                          <td className="py-1 pr-3">{r.expected.toFixed(2)}</td>
                          <td className="py-1 pr-3">{r.expectedAt}</td>
                          <td className="py-1 pr-3">{r.actual.toFixed(2)}</td>
                          <td className="py-1 pr-3">{signed(r.surprise)}</td>
                          <td className="py-1 pr-3">{r.scaled !== undefined ? signed(r.scaled) : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.source === 'kalshi' && <p className="text-xs text-slate-500 dark:text-slate-400">{t('sp_kalshiTerms')}</p>}
            </div>
          );
        })}
        {reply && reply.series.length > 0 && (
          <details className="text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer">{t('c_methodSources')}</summary>
            <p className="mt-1">{t('sp_method')}</p>
            {reply.pulledAt && <p className="mt-1">{t('sp_pulled', { date: reply.pulledAt.slice(0, 16).replace('T', ' ') })}</p>}
            {reply.problems.map((p) => (
              <p key={p} className="mt-1 text-amber-700 dark:text-amber-400">{p}</p>
            ))}
          </details>
        )}
      </div>
    </section>
  );
};
