import React, { useEffect, useMemo, useState } from 'react';
import { ChartGuide, RangeNote, useShowRanges } from './HelpLevel';
import { ValidationBadge } from './ValidationBadge';
import { Landmark } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DsaOutcome, ScenarioId } from '../utils/debtSustainability';
import type { DebtFanOutcome } from '../utils/debtFan';
import type { CostedOptionsOutcome } from '../utils/costedOptions';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Debt sustainability: public debt dynamics on IMF figures,
 * what drove past changes, and stated stress scenarios five years out. A view on stated
 * assumptions, not a forecast or an IMF DSA.
 */

type Reply = DsaOutcome & { iso3: string; sentence?: string; fan?: DebtFanOutcome & { sentence?: string }; options?: CostedOptionsOutcome };

const COLOURS: Record<ScenarioId, string> = {
  imf: '#0f172a',
  baseline: '#2563eb',
  historical: '#64748b',
  growth: '#d97706',
  primary: '#059669',
  interest: '#7c3aed',
  combined: '#e11d48',
};

const f1 = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(1));
const sg1 = (v: number | undefined) => (v === undefined ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}`);

export const DebtSustainabilityPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const t = useT(PANELS);
  const ranges = useShowRanges();
  const tx = useTx();
  const pct = (v: string) => t('c_pctGdp', { value: v });

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/debt-sustainability/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const data = useMemo(() => {
    if (!reply?.ok) return [];
    const years = new Map<string, Record<string, number | string>>();
    for (const h of reply.history.slice(-8)) years.set(h.year, { year: h.year, outturn: h.debt });
    for (const s of reply.scenarios) {
      for (const p of s.path) {
        const row = years.get(p.year) || { year: p.year };
        row[s.id] = p.debt;
        years.set(p.year, row);
      }
    }
    return [...years.values()].sort((a, b) => String(a.year).localeCompare(String(b.year)));
  }, [reply]);

  return (
    <section className="ui-panel" data-dsa="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('dsa_title', { country: countryName })}
          {reply?.ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Debt sustainability, ${countryName}`,
                  value: reply.sentence,
                  source: reply.method,
                  asOf: reply.lastOutturnYear,
                  iso3,
                  countryName,
                  detail: [
                    ...reply.scenarios.map((s) => `${s.label}: ${s.end}% of GDP by ${s.path[s.path.length - 1].year}`),
                    ...(reply.rMinusG !== undefined ? [`r - g (10-year average): ${reply.rMinusG} pts`] : []),
                  ].slice(0, 8),
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('dsa_intro')}</p>
        <ChartGuide id="debt" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('dsa_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {reply?.ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-dsa-sentence="true">
              {tx(reply.sentence || '')}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <div>
                <dt className="ui-label">{t('dsa_debtYear', { year: reply.lastOutturnYear })}</dt>
                <dd className="text-slate-900 dark:text-white">{pct(f1(reply.debtNow))}</dd>
              </div>
              <div title={t('dsa_rgTitle')}>
                <dt className="ui-label">{t('dsa_rg')}</dt>
                <dd className="text-slate-900 dark:text-white">{reply.rMinusG === undefined ? t('c_missing') : t('c_pts', { value: sg1(reply.rMinusG) })}</dd>
              </div>
              <div>
                <dt className="ui-label">{t('dsa_stabilising')}</dt>
                <dd className="text-slate-900 dark:text-white">{reply.stabilisingPb === undefined ? t('c_missing') : pct(sg1(reply.stabilisingPb))}</dd>
              </div>
              <div>
                <dt className="ui-label">{t('dsa_projectedPb')}</dt>
                <dd className="text-slate-900 dark:text-white">{reply.projectedPb === undefined ? t('c_missing') : pct(sg1(reply.projectedPb))}</dd>
              </div>
            </dl>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} unit="%" domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => pct(f1(v as number))} />
                  <Line dataKey="outturn" name={t('dsa_outturn')} stroke="#0f172a" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {reply.scenarios.map((s) => (
                    <Line
                      key={s.id}
                      dataKey={s.id}
                      name={tx(s.label)}
                      stroke={COLOURS[s.id]}
                      strokeDasharray={s.id === 'imf' ? '2 3' : s.id === 'baseline' ? undefined : '5 4'}
                      strokeWidth={s.id === 'baseline' || s.id === 'imf' ? 2 : 1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {reply.scenarios.map((s) => (
                <li key={s.id}>
                  <span style={{ color: COLOURS[s.id] }}>■</span> <span className="text-slate-900 dark:text-white">{tx(s.label)}</span>{t('dsa_scenarioRest', { end: f1(s.end), year: s.path[s.path.length - 1].year, about: tx(s.about) })}
                </li>
              ))}
            </ul>
            {reply.fan && (
              <div className="space-y-2" data-dsa-fan="true">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">{t('dsa_fanTitle')} <ValidationBadge id="debt_fan" /></h3>
                {!reply.fan.ok && (
                  <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                    {t('c_missingReason', { reason: tx(reply.fan.reason) })}
                  </p>
                )}
                {reply.fan.ok && (
                  <>
                    {ranges ? <p className="text-sm text-slate-700 dark:text-slate-200">{tx(reply.fan.sentence || '')}</p> : <RangeNote />}
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={reply.fan.years.map((y) => ({ year: y.year, outer: [y.p10, y.p90], inner: [y.p25, y.p75], p50: y.p50 }))} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} width={40} unit="%" domain={['auto', 'auto']} />
                          <Tooltip formatter={(v: unknown) => (Array.isArray(v) ? pct(`${f1(v[0])}-${f1(v[1])}`) : pct(f1(v as number)))} />
                          {ranges && <Area dataKey="outer" name={t('dsa_p1090')} stroke="none" fill="#2563eb" fillOpacity={0.15} isAnimationActive={false} />}
                          {ranges && <Area dataKey="inner" name={t('dsa_p2575')} stroke="none" fill="#2563eb" fillOpacity={0.3} isAnimationActive={false} />}
                          <Line dataKey="p50" name={t('dsa_median')} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('c_method', { method: reply.fan.method })} {t('dsa_fanShocks', { n: reply.fan.sample.n, from: reply.fan.sample.from, to: reply.fan.sample.to })}
                      {reply.fan.probAboveBaseline !== undefined ? ` ${t('dsa_fanAbove', { pct: Math.round(reply.fan.probAboveBaseline * 100) })}` : ''} {t('dsa_fanNote')}
                    </p>
                  </>
                )}
              </div>
            )}
            {reply.options && (
              <div className="space-y-2" data-dsa-options="true">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">{t('dsa_optionsTitle')} <ValidationBadge id="costed_options" /></h3>
                {!reply.options.ok && (
                  <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                    {t('c_missingReason', { reason: tx(reply.options.reason) })}
                  </p>
                )}
                {reply.options.ok && (
                  <>
                    <table className="w-full text-xs tabular-nums">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400">
                          <th className="py-1 pr-3 font-medium">{t('dsa_option')}</th>
                          <th className="py-1 pr-3 font-medium text-right">{t('dsa_debtAt', { year: reply.options.horizonYear })}</th>
                          <th className="py-1 pr-3 font-medium text-right">{t('dsa_vsBaseline')}</th>
                          <th className="py-1 font-medium text-right">{t('dsa_outputLost')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">{t('dsa_baselineRow')}</td>
                          <td className="py-0.5 pr-3 text-right">{f1(reply.options.baselineEnd)}</td>
                          <td className="py-0.5 pr-3 text-right">—</td>
                          <td className="py-0.5 text-right">—</td>
                        </tr>
                        {reply.options.options.map((o) => (
                          <tr key={o.option.id} className="border-t border-slate-100 dark:border-slate-800" data-option={o.option.id}>
                            <td className="py-0.5 pr-3">
                              {tx(o.option.label)}
                              {o.denominatorEffect ? <span className="text-amber-700 dark:text-amber-400" title={t('dsa_debtUpTitle')}>{t('dsa_debtUp')}</span> : null}
                            </td>
                            <td className="py-0.5 pr-3 text-right">{f1(o.endLow)}-{f1(o.endHigh)}</td>
                            <td className="py-0.5 pr-3 text-right">{t('c_range', { from: sg1(o.vsBaselineLow), to: sg1(o.vsBaselineHigh) })}</td>
                            <td className="py-0.5 text-right">{f1(o.outputCostLow)}-{f1(o.outputCostHigh)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dsa_multiplier', { low: reply.options.multiplier.low, high: reply.options.multiplier.high, source: reply.options.multiplier.source })} {t('c_method', { method: reply.options.method })} {t('dsa_optionsNote')}
                    </p>
                  </>
                )}
              </div>
            )}
            {reply.missing.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: reply.missing.map(tx).join('; ') })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="ui-pill" aria-pressed={showPast} onClick={() => setShowPast(!showPast)}>
                {showPast ? t('dsa_hidePast') : t('dsa_showPast')}
              </button>
              <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/debt-scenarios.csv`} download>
                {t('dsa_download')}
              </a>
            </div>
            {showPast && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums" data-dsa-history="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3">{t('c_year')}</th>
                      <th className="py-1 pr-3">{t('dsa_debt')}</th>
                      <th className="py-1 pr-3">{t('dsa_change')}</th>
                      <th className="py-1 pr-3" title={t('dsa_snowballTitle')}>{t('dsa_snowball')}</th>
                      <th className="py-1 pr-3" title={t('dsa_primaryTitle')}>{t('dsa_primary')}</th>
                      <th className="py-1 pr-3" title={t('dsa_otherTitle')}>{t('dsa_other')}</th>
                      <th className="py-1 pr-3">{t('dsa_rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reply.history].reverse().slice(0, 12).map((h) => (
                      <tr key={h.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3">{h.year}</td>
                        <td className="py-1 pr-3">{f1(h.debt)}</td>
                        <td className="py-1 pr-3">{sg1(h.change)}</td>
                        <td className="py-1 pr-3">{sg1(h.snowball)}</td>
                        <td className="py-1 pr-3">{sg1(h.primary)}</td>
                        <td className="py-1 pr-3">{sg1(h.stockFlow)}</td>
                        <td className="py-1 pr-3">{h.interestPct === undefined ? '—' : `${f1(h.interestPct)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('dsa_identity')}</p>
              </div>
            )}
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer">{t('c_methodSources')}</summary>
              <p className="mt-1">{reply.method}.</p>
              <p className="mt-1">
                {t('dsa_outturnsTo', { year: reply.lastOutturnYear, saved: reply.pulledAt ? t('dsa_saved', { date: reply.pulledAt.slice(0, 10) }) : '' })}
              </p>
              <ol className="mt-1 list-decimal pl-4">
                {reply.sources.map((r) => (
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
