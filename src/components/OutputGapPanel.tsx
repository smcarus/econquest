import React, { useEffect, useMemo, useState } from 'react';
import { ChartGuide } from './HelpLevel';
import { Activity } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OUTPUT_GAP_REFERENCES, type OutputGapResult } from '../utils/outputGap';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Output gap: the app's estimate from IMF real GDP growth,
 * three stated filters, the middle reading and the band between them. Projection years are drawn
 * dashed and say so. Not an official figure.
 */

type Reply = OutputGapResult & { iso3: string };

const sg = (v: number | undefined) => (v === undefined ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`);

export const OutputGapPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState<'all' | '2000'>('2000');
  const [showTable, setShowTable] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/output-gap/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const data = useMemo(() => {
    if (!reply?.ok) return [];
    return reply.years
      .filter((g) => since === 'all' || Number(g.year) >= 2000)
      .map((g) => ({
        year: g.year,
        band: g.low !== undefined && g.high !== undefined ? [g.low, g.high] : undefined,
        outturn: g.projection ? undefined : g.central,
        projection: g.projection ? g.central : undefined,
        // Join the dashed projection line to the last outturn.
        ...(reply.lastOutturnYear === g.year ? { projection: g.central } : {}),
        hp100: g.hp100,
        hp625: g.hp625,
        hamilton: g.hamilton,
      }));
  }, [reply, since]);

  return (
    <section className="ui-panel" data-output-gap="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('og_title', { country: countryName })}
          {reply?.ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Output gap, ${countryName}`,
                  value: `${reply.latest.central >= 0 ? '+' : ''}${reply.latest.central.toFixed(2)}% of potential GDP (band ${reply.latest.low} to ${reply.latest.high})`,
                  source: reply.method,
                  asOf: reply.latest.year,
                  iso3,
                  countryName,
                  detail: reply.years.filter((g) => !g.projection).slice(-6).map((g) => `${g.year}: middle ${g.central}, HP100 ${g.hp100}, HP6.25 ${g.hp625}, Hamilton ${g.hamilton ?? 'n/a'}`),
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('og_intro')}</p>
        <ChartGuide id="output_gap" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('og_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {reply?.ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-output-gap-sentence="true">
              {t('og_sentence', {
                year: reply.latest.year,
                gap: sg(reply.latest.central),
                low: sg(reply.latest.low),
                high: sg(reply.latest.high),
                side: t(reply.latest.central > 0.5 ? 'og_above' : reply.latest.central < -0.5 ? 'og_below' : 'og_close'),
              })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="ui-pill" aria-pressed={since === '2000'} onClick={() => setSince(since === 'all' ? '2000' : 'all')}>
                {t('og_from', { year: since === 'all' ? reply.firstYear : '2000' })}
              </button>
              <button type="button" className="ui-pill" aria-pressed={showTable} onClick={() => setShowTable(!showTable)}>
                {showTable ? t('og_hideEach') : t('og_showEach')}
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 12 }} width={40} unit="%" />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => {
                      if (Array.isArray(v)) return [t('c_range', { from: sg(v[0]), to: sg(v[1]) }), t('og_band')];
                      return [sg(v as number), String(name ?? "")];
                    }}
                  />
                  <Area dataKey="band" name={t('og_band')} stroke="none" fill="#3b82f6" fillOpacity={0.15} isAnimationActive={false} />
                  <Line dataKey="outturn" name={t('og_middle')} stroke="#2563eb" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line dataKey="projection" name={t('og_middleProj')} stroke="#2563eb" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {showTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums" data-output-gap-table="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3">{t('c_year')}</th>
                      <th className="py-1 pr-3">HP λ 100</th>
                      <th className="py-1 pr-3">HP λ 6.25</th>
                      <th className="py-1 pr-3">Hamilton</th>
                      <th className="py-1 pr-3">{t('og_middleCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reply.years].reverse().slice(0, 15).map((g) => (
                      <tr key={g.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3">
                          {g.year}
                          {g.projection ? t('c_imfProjection') : ''}
                        </td>
                        <td className="py-1 pr-3">{sg(g.hp100)}</td>
                        <td className="py-1 pr-3">{sg(g.hp625)}</td>
                        <td className="py-1 pr-3">{sg(g.hamilton)}</td>
                        <td className="py-1 pr-3 text-slate-900 dark:text-white">{sg(g.central)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer">{t('c_methodSources')}</summary>
              <p className="mt-1">{reply.method}. {t('og_hamiltonNote')}</p>
              <p className="mt-1">
                {t('og_data', { source: reply.source, saved: reply.pulledAt ? t('og_saved', { date: reply.pulledAt.slice(0, 10) }) : '', from: reply.firstYear, to: reply.lastOutturnYear })}
              </p>
              <ol className="mt-1 list-decimal pl-4">
                {OUTPUT_GAP_REFERENCES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </details>
          </>
        )}
      </div>
    </section>
  );
};
