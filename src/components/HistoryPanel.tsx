import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChartGuide, RangeNote } from './HelpLevel';
import type { SeriesTags } from '../utils/seriesDefinitions';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { seriesGaps, type Series, type SeriesMissing } from '../utils/seriesHistory';
import { historicalContext, type HistoricalContext } from '../utils/historicalContext';
import { PublishChartButton } from './PublishChartButton';
import { CiteButton } from './CiteButton';
import { isPaidSource } from '../engine/paidData';
import { useT, useTx } from '../i18n/useLang';
import { PANELS, type PanelT } from '../i18n/messages/panels';

/**
 * Country Research > History: every figure that has a run of real observations, as a chart with
 * its source, dates and any gaps, plus each figure that has none and why. Points are drawn as
 * they came: nothing filled in, carried forward or smoothed.
 */

type SeriesListItem = Omit<Series, 'points'> & { count: number; first?: string; last?: string; latest?: number; tags?: SeriesTags };

const FREQ_KEY = {
  daily: 'freq_daily',
  weekly: 'freq_weekly',
  monthly: 'freq_monthly',
  quarterly: 'freq_quarterly',
  annual: 'freq_annual',
  'per pull': 'freq_perPull',
} as const satisfies Record<Series['freq'], string>;


/** The "how this compares with its own past" sentence, in the reader's language. */
function contextLine(t: PanelT, label: string, unit: string | undefined, c: HistoricalContext): string {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const u = unit?.startsWith('%') ? unit : unit ? ` ${unit}` : '';
  const parts = [t('ctx_was', { label, value: `${r2(c.value)}${u}`, date: c.date })];
  if (c.record) {
    const high = c.record.kind === 'highest';
    parts.push(c.record.since ? t(high ? 'ctx_highestSince' : 'ctx_lowestSince', { since: c.record.since }) : t(high ? 'ctx_highestOnRecord' : 'ctx_lowestOnRecord', { first: c.first }));
  }
  parts.push(t('ctx_percentile', { pct: c.percentile, n: c.observations, first: c.first }));
  if (c.yearAgo) {
    const amount = Math.abs(c.yearAgo.change);
    const change = unit?.startsWith('%') ? t('ctx_points', { n: amount }) : `${amount}${u}`;
    parts.push(t(c.yearAgo.change >= 0 ? 'ctx_up' : 'ctx_down', { change, date: c.yearAgo.date }));
  }
  return `${parts.join(', ')}.`;
}

function fmt(v: number | undefined, unit?: string, missing = 'Missing'): string {
  if (v === undefined || !Number.isFinite(v)) return missing;
  const abs = Math.abs(v);
  const n = abs >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs >= 100 ? v.toFixed(1) : v.toFixed(2);
  return unit === '%' || unit?.startsWith('%') ? `${n}%` : n;
}

function pulledLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export const HistoryPanel: React.FC<{ iso3: string; countryName: string; pick?: string | null }> = ({ iso3, countryName, pick }) => {
  const [list, setList] = useState<SeriesListItem[] | null>(null);
  const [missing, setMissing] = useState<SeriesMissing[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(pick ?? null);
  const [series, setSeries] = useState<Series | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();
  const miss = t('c_missing');
  const freqLabel = (f: Series['freq']) => t(FREQ_KEY[f]);

  useEffect(() => {
    let live = true;
    setList(null);
    setFailed(null);
    fetch(`/api/series/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { series: SeriesListItem[]; missing: SeriesMissing[] }) => {
        if (!live) return;
        setList(body.series || []);
        setMissing(body.missing || []);
      })
      .catch((e: Error) => live && setFailed(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  useEffect(() => {
    if (pick) setSelected(pick);
  }, [pick]);

  // Default to the first series when nothing (or something unavailable) is picked.
  const current = useMemo(() => {
    if (!list?.length) return null;
    return list.find((s) => s.id === selected) ?? list[0];
  }, [list, selected]);
  const pickedMissing = selected && !(list || []).some((s) => s.id === selected) ? missing.find((m) => m.id === selected) : undefined;

  useEffect(() => {
    if (!current) return;
    let live = true;
    setSeries(null);
    setSeriesError(null);
    fetch(`/api/series/${encodeURIComponent(iso3)}/${encodeURIComponent(current.id)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({})))?.message || `HTTP ${r.status}`))))
      .then((s: Series) => live && setSeries(s))
      .catch((e: Error) => live && setSeriesError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, current?.id]);

  const gaps = useMemo(() => (series ? seriesGaps(series) : []), [series]);
  const chartRef = useRef<HTMLDivElement>(null);
  const context = useMemo(() => (series ? historicalContext(series.points, series.freq) : null), [series]);

  if (failed) {
    return (
      <section className="ui-panel p-4" data-history-panel="true">
        <p className="ui-body">{t('h_failed', { error: failed })}</p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" data-history-panel="true">
      <section className="ui-panel xl:col-span-2">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">{current ? `${tx(current.label)}, ${countryName}` : t('h_titleFor', { country: countryName })}</h2>
          {current && (
            <p className="ui-label">
              {tx(current.unit)} · {freqLabel(current.freq)} · {current.source}
              {pulledLabel(current.pulledAt) ? t('h_pulled', { date: pulledLabel(current.pulledAt)! }) : ''}
            </p>
          )}
          {current?.tags && (
            <p className="ui-label pt-0.5" data-history-definition="true">
              {t('h_defines', { definition: tx(current.tags.definition) })} {t('h_covers', { coverage: tx(current.tags.coverage) })}
              {current.tags.seasonalAdjustment && <> {t('h_seasonal', { value: tx(current.tags.seasonalAdjustment) })}</>}
              {current.tags.frequencyNote && <> {t('h_freqNote', { note: tx(current.tags.frequencyNote) })}</>}
              {current.tags.measure && <> {t('h_measure', { value: tx(current.tags.measure) })}</>}
              {current.tags.baseYear && <> {t('h_baseYear', { year: current.tags.baseYear })}</>}
              {current.tags.currency && <> {t('h_currency', { value: tx(current.tags.currency) })}</>}
            </p>
          )}
          {series?.points.some((p) => p.note === 'IMF projection') && <RangeNote none="noRangeImf" className="ui-label pt-0.5" />}
          {current && <ChartGuide id="history" className="pt-1" />}
        </header>
        <div className="p-4 space-y-3">
          {list === null && <p className="ui-body">{t('c_loading')}</p>}
          {list !== null && list.length === 0 && (
            <p className="ui-body">{t('h_none', { country: countryName })}</p>
          )}
          {pickedMissing && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('h_missingLine', { label: tx(pickedMissing.label), reason: tx(pickedMissing.reason) })}
            </p>
          )}
          {current && seriesError && <p className="text-sm text-amber-700 dark:text-amber-400">{seriesError}</p>}
          {current && !series && !seriesError && <p className="ui-body">{t('c_loading')}</p>}
          {series && (
            <>
              {series.about && <p className="text-xs text-slate-500 dark:text-slate-400">{tx(series.about)}</p>}
              {context && (
                <p className="text-sm text-slate-900 dark:text-white" data-history-context="true">
                  {contextLine(t, tx(series.label), series.unit && tx(series.unit), context)}
                </p>
              )}
              <div className="h-64" data-history-chart="true" ref={chartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 12 }} width={56} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v), series.unit, miss), tx(series.label)]}
                      labelFormatter={(label) => {
                        const d = String(label ?? '');
                        const pt = series.points.find((p) => p.date === d);
                        const extra = [pt?.note, pt?.revised].filter(Boolean).join(' · ');
                        return extra ? `${d} · ${extra}` : d;
                      }}
                    />
                    <Line type="linear" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={series.points.length <= 40} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(series.points.length === 1 ? 'h_obs1' : 'h_obsN', { n: series.points.length, from: series.points[0]?.date ?? '', to: series.points[series.points.length - 1]?.date ?? '' })}{' '}
                {series.freq === 'per pull' && series.points.length < 3 ? t('h_gainsPoint') : ''}
                {gaps.length === 0
                  ? series.freq === 'monthly' || series.freq === 'weekly'
                    ? t('h_noGaps')
                    : ''
                  : t('h_gaps', { gaps: gaps.map((g) => t('c_range', { from: g.after, to: g.before })).join('; ') })}
              </p>
              {isPaidSource(series.source) && (
                <p className="ui-label" data-paid-held="true">
                  {t('h_paidHeld')}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {!isPaidSource(series.source) && (
                  <>
                    <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/series/${encodeURIComponent(series.id)}.csv`} download>
                      {t('h_dlSeries')}
                    </a>
                    <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/series/${encodeURIComponent(series.id)}.xlsx`} download>
                      {t('c_excel')}
                    </a>
                  </>
                )}
                <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/series.csv`} download>
                  {t('h_dlAll', { country: countryName })}
                </a>
                <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/series.xlsx`} download>
                  {t('c_excel')}
                </a>
                <CiteButton kind="table" className="ui-btn inline-flex items-center gap-1" title={`${tx(series.label)}, ${countryName}`} sources={[series.source || current?.source]} />
              </div>
              {!isPaidSource(series.source) && <PublishChartButton
                chartRef={chartRef}
                title={`${tx(series.label)}, ${countryName}`}
                subtitle={`${tx(series.unit)}, ${freqLabel(series.freq).toLowerCase()}`}
                source={series.source || current?.source || ''}
                period={t('c_range', { from: series.points[0]?.date ?? '', to: series.points[series.points.length - 1]?.date ?? '' })}
                fileName={`${iso3}-${series.id}`}
              />}
              <details>
                <summary className="text-xs text-blue-700 dark:text-blue-300 cursor-pointer">{t('h_showNumbers')}</summary>
                <div className="mt-2 max-h-64 overflow-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-normal">{t('c_date')}</th>
                        <th className="py-1 pr-3 font-normal text-right">{tx(series.unit)}</th>
                        {series.points.some((p) => p.note || p.revised) && <th className="py-1 font-normal">{series.freq === 'per pull' ? t('h_sourceThatDay') : t('c_note')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {[...series.points].reverse().map((p) => (
                        <tr key={p.date} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1 pr-3">{p.date}</td>
                          <td className="py-1 pr-3 text-right">{fmt(p.value, series.unit, miss)}</td>
                          {series.points.some((x) => x.note || x.revised) && <td className="py-1">{[p.note, p.revised].filter(Boolean).join(' · ')}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </div>
      </section>

      <section className="ui-panel">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">{t('h_withHistory')}</h2>
          <p className="ui-label">{t('h_pick')}</p>
        </header>
        <div className="p-2">
          <ul>
            {(list || []).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  aria-current={current?.id === s.id ? 'true' : undefined}
                  className={`w-full text-left px-2 py-1.5 flex items-baseline justify-between gap-3 ${
                    current?.id === s.id ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm text-slate-900 dark:text-white">{tx(s.label)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap [font-variant-numeric:tabular-nums]">
                    {fmt(s.latest, s.unit, miss)} · {s.last} · {t(s.count === 1 ? 'h_pt1' : 'h_ptN', { n: s.count })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <>
              <h3 className="mt-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('h_noHistory')}</h3>
              <ul className="mt-1">
                {groupMissing(missing).map((g) => (
                  <li key={g.reason} className="px-2 py-1 text-xs" data-missing="true">
                    <span className="text-slate-700 dark:text-slate-300">{g.labels.map(tx).join(', ')}</span>
                    <span className="text-amber-700 dark:text-amber-400">{t('h_missingSuffix', { reason: tx(g.reason) })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

/** One line per reason, naming every figure it applies to. */
function groupMissing(rows: { label: string; reason: string }[]): { reason: string; labels: string[] }[] {
  const by = new Map<string, string[]>();
  for (const r of rows) by.set(r.reason, [...(by.get(r.reason) || []), r.label]);
  return [...by].map(([reason, labels]) => ({ reason, labels }));
}
