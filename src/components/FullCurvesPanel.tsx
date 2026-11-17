import React, { useEffect, useMemo, useState } from 'react';
import { LineChart as LineIcon } from 'lucide-react';
import { CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { defaultCurveArea, type CurveArea, type FullCurveOutcome } from '../utils/fullCurves';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Full yield curves (R11, src/utils/fullCurves.ts): every
 * maturity of the US Treasury par curve and the ECB euro area curve, a fitted curve, level, slope and
 * curvature with their moves, and carry and roll-down over three months. Euro members open on the
 * euro area curve, every other country on the US curve.
 */

const signed = (v: number | undefined) => (v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`);

export const FullCurvesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3 }) => {
  const [area, setArea] = useState<CurveArea>(defaultCurveArea(iso3));
  const [reply, setReply] = useState<FullCurveOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => setArea(defaultCurveArea(iso3)), [iso3]);
  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/yield-curves?area=${area}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: FullCurveOutcome) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [area]);

  const curveData = useMemo(() => {
    if (!reply?.ok) return { published: [], fitted: [], ago: [] };
    return {
      published: reply.points.map((p) => ({ m: p.m, y: p.y })),
      fitted: reply.fit?.curve ?? [],
      ago: reply.monthAgo?.points ?? [],
    };
  }, [reply]);

  return (
    <section className="ui-panel" data-full-curves="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <LineIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('fyc_title')}
        </h2>
        <p className="ui-label">{t('fyc_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('fyc_title')}>
          {(['us', 'ea'] as const).map((a) => (
            <button key={a} type="button" className="ui-pill" aria-pressed={area === a} onClick={() => setArea(a)}>
              {t(a === 'us' ? 'fyc_us' : 'fyc_ea')}
            </button>
          ))}
        </div>
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('fyc_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('fyc_missing', { reason: tx(reply.reason) })}
          </p>
        )}
        {reply?.ok && (
          <>
            {reply.factors && (
              <p className="text-sm text-slate-900 dark:text-white" data-full-curves-sentence="true">
                {t(reply.factors.slope < 0 ? 'fyc_sentenceInverted' : 'fyc_sentenceUp', { date: reply.date, level: reply.factors.level, slope: Math.abs(Math.round(reply.factors.slope * 100)) })}
              </p>
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                  <XAxis dataKey="m" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12 }} unit="y" />
                  <YAxis tick={{ fontSize: 12 }} width={44} domain={['auto', 'auto']} unit="%" />
                  <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(2)}%`} labelFormatter={(m: unknown) => `${m}y`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {curveData.fitted.length > 0 && <Line data={curveData.fitted} dataKey="y" name={t('fyc_fitted')} stroke="#2563eb" dot={false} strokeWidth={2} isAnimationActive={false} />}
                  {curveData.ago.length > 0 && <Line data={curveData.ago} dataKey="y" name={t('fyc_monthAgo', { date: reply.monthAgo!.date })} stroke="#94a3b8" strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
                  <Scatter data={curveData.published} dataKey="y" name={t('fyc_published', { date: reply.date })} fill="#0f172a" className="dark:fill-white" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {reply.factors && (
              <table className="w-full text-sm tabular-nums" data-full-curves-factors="true">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium" />
                    <th className="py-1 pr-3 font-medium">{t('fyc_now')}</th>
                    <th className="py-1 pr-3 font-medium">{t('fyc_d1')}</th>
                    <th className="py-1 pr-3 font-medium">{t('fyc_d21')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['level', 'slope', 'curvature'] as const).map((k) => (
                    <tr key={k} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-3">{t(`fyc_${k}`)}</td>
                      <td className="py-1 pr-3">{reply.factors![k].toFixed(2)}%</td>
                      <td className="py-1 pr-3">{signed(reply.factors!.d1?.[k])}</td>
                      <td className="py-1 pr-3">{signed(reply.factors!.d21?.[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {reply.history.length > 20 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reply.history} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                    <YAxis tick={{ fontSize: 11 }} width={40} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="slope" name={t('fyc_slope')} stroke="#2563eb" dot={false} isAnimationActive={false} />
                    <Line dataKey="curvature" name={t('fyc_curvature')} stroke="#d97706" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums" data-full-curves-table="true">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('fyc_maturity')}</th>
                    <th className="py-1 pr-3 font-medium">{t(reply.kind === 'par' ? 'fyc_parYield' : 'fyc_spotRate')}</th>
                    <th className="py-1 pr-3 font-medium">{t('fyc_d1')}</th>
                    <th className="py-1 pr-3 font-medium">{t('fyc_carry')}</th>
                    <th className="py-1 pr-3 font-medium">{t('fyc_roll')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.points.map((p) => (
                    <tr key={p.m} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-3">{p.label}</td>
                      <td className="py-1 pr-3">{p.y.toFixed(2)}%</td>
                      <td className="py-1 pr-3">{signed(p.d1)}</td>
                      <td className="py-1 pr-3">{signed(p.carry)}</td>
                      <td className="py-1 pr-3">{signed(p.roll)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer">{t('c_methodSources')}</summary>
              <p className="mt-1">{t('fyc_method')}</p>
              {reply.fit && <p className="mt-1">{t('fyc_fitNote', { rmse: reply.fit.rmseBp, t1: reply.fit.t1, t2: reply.fit.t2 })}</p>}
              <p className="mt-1">{t(reply.area === 'us' ? 'fyc_sourceUs' : 'fyc_sourceEa')}</p>
            </details>
          </>
        )}
      </div>
    </section>
  );
};
