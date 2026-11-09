import React, { useEffect, useMemo, useState } from 'react';
import { ChartGuide, RangeNote, useShowRanges } from './HelpLevel';
import { TrendingUp } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ForecastOutcome, ForecastId } from '../utils/forecasts';
import type { NowcastOutcome } from '../utils/nowcast';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Nowcast and forecasts: the app's estimate of quarters and
 * months not published yet (nowcast) and the next one to eight quarters (forecast, fan chart), with
 * the IMF's own projection beside it where the IMF makes one. One measure at a time; method, inputs
 * and the evaluation status sit under "Method and sources". Every number is labelled the app's,
 * not validated advice, until its pre-registered evaluation passes.
 */

interface Validation {
  status: 'passed' | 'failed' | 'too_few_cases' | 'not_run';
  verdict: string;
  ranAt?: string;
}

interface NowcastReply {
  gdp: NowcastOutcome;
  cpi: NowcastOutcome;
  history: { pulledAt: string | null; problems: string[] };
}

interface ForecastReply {
  forecasts: ForecastOutcome[];
  validation?: Record<string, Validation>;
  history: { pulledAt: string | null; problems: string[] };
}

const MEASURES: Array<{ id: ForecastId; label: string; nowcast?: 'gdp' | 'cpi'; evalIds: string[] }> = [
  { id: 'gdp_qoq', label: 'GDP growth', nowcast: 'gdp', evalIds: ['gdp_nowcast', 'gdp_forecast'] },
  { id: 'cpi_yoy', label: 'Inflation', nowcast: 'cpi', evalIds: ['cpi_nowcast', 'cpi_forecast'] },
  { id: 'policy_rate', label: 'Policy rate', evalIds: ['policy_rate_forecast'] },
  { id: 'debt_gdp', label: 'Government debt', evalIds: ['debt_forecast'] },
];

const STATUS_TEXT: Record<Validation['status'], string> = {
  passed: 'Evaluation passed',
  failed: 'Evaluation failed',
  too_few_cases: 'Too few cases to evaluate',
  not_run: 'Not validated (evaluation not run yet)',
};

const f1 = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1));

export const ForecastPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [now, setNow] = useState<NowcastReply | null>(null);
  const [fc, setFc] = useState<ForecastReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [measure, setMeasure] = useState<ForecastId>('gdp_qoq');
  // A forecast that failed its pre-registered test is not drawn unless asked for (honest labels).
  const [showFailed, setShowFailed] = useState(false);
  const t = useT(PANELS);
  const ranges = useShowRanges();
  const tx = useTx();
  const status = (s: Validation['status']) => t(`fc_s_${s}`);

  useEffect(() => {
    let live = true;
    setNow(null);
    setFc(null);
    setError(null);
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    Promise.all([get(`/api/nowcast/${encodeURIComponent(iso3)}`), get(`/api/forecast/${encodeURIComponent(iso3)}`)])
      .then(([n, f]) => {
        if (!live) return;
        setNow(n);
        setFc(f);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const m = MEASURES.find((x) => x.id === measure)!;
  const forecast = fc?.forecasts.find((r) => r.id === measure);
  const nowcast = m.nowcast && now ? now[m.nowcast] : undefined;
  const statuses = m.evalIds.map((id) => ({ id, v: fc?.validation?.[id] ?? { status: 'not_run' as const, verdict: 'The pre-registered evaluation has not been run yet (npm run forecast:evaluate).' } }));
  const failedEval = (kind: 'nowcast' | 'forecast') => statuses.some((s) => s.id.includes(kind) && s.v.status === 'failed');
  const forecastFailed = failedEval('forecast');
  const nowcastFailed = failedEval('nowcast');
  const drawForecast = !forecastFailed || showFailed;

  const data = useMemo(() => {
    if (!forecast?.ok) return [];
    const rows = new Map<string, Record<string, unknown>>();
    const row = (p: string) => {
      if (!rows.has(p)) rows.set(p, { period: p });
      return rows.get(p)!;
    };
    for (const h of forecast.history) row(h.date).actual = h.value;
    if (nowcast?.ok) for (const p of nowcast.points) row(p.period).nowcast = p.mean;
    if (!drawForecast) return [...rows.values()].sort((a, b) => (String(a.period) < String(b.period) ? -1 : 1));
    const last = forecast.lastObserved;
    // The fan starts at the last real figure so the bands join the line.
    Object.assign(row(last.period), { mean: last.value, b90: [last.value, last.value], b70: [last.value, last.value], b50: [last.value, last.value] });
    for (const p of forecast.path) {
      const b = (lvl: number) => p.bands.find((x) => x.level === lvl);
      Object.assign(row(p.period), { mean: p.mean, b90: b(90) && [b(90)!.lo, b(90)!.hi], b70: b(70) && [b(70)!.lo, b(70)!.hi], b50: b(50) && [b(50)!.lo, b(50)!.hi] });
    }
    // Yearly IMF points sit on the last period of each year shown.
    if (forecast.imf && forecast.freq !== 'annual') {
      for (const ip of forecast.imf.points) {
        const inYear = [...rows.keys()].filter((k) => k.startsWith(ip.period)).sort();
        if (inYear.length) row(inYear[inYear.length - 1]).imf = ip.value;
      }
    } else if (forecast.imf) for (const ip of forecast.imf.points) row(ip.period).imf = ip.value;
    return [...rows.values()].sort((a, b) => (String(a.period) < String(b.period) ? -1 : 1));
  }, [forecast, nowcast, drawForecast]);

  const explain = () => {
    if (!forecast?.ok) return;
    const p4 = forecast.path[Math.min(3, forecast.path.length - 1)];
    const b70 = p4.bands.find((b) => b.level === 70);
    explainInChat({
      kind: 'panel',
      label: `${forecast.label}, ${countryName}`,
      value: `${f1(p4.mean)}${forecast.unit === '%' ? '%' : ` ${forecast.unit}`} in ${p4.period}${b70 ? ` (70% band ${f1(b70.lo)} to ${f1(b70.hi)})` : ''}; app forecast, ${forecastFailed ? 'FAILED its pre-registered out-of-sample test, illustration only' : 'not validated advice'}`,
      source: forecast.method,
      asOf: forecast.lastObserved.period,
      iso3,
      countryName,
      detail: [
        ...(nowcast?.ok ? nowcast.points.map((p) => `Nowcast ${p.period}: ${f1(p.mean)} (${p.how})`) : nowcast ? [`Nowcast: Missing, ${nowcast.reason}`] : []),
        ...forecast.path.slice(0, 8).map((p) => `${p.period}: ${f1(p.mean)} (90% ${f1(p.bands.find((b) => b.level === 90)?.lo)} to ${f1(p.bands.find((b) => b.level === 90)?.hi)})`),
        ...(forecast.imf ? forecast.imf.points.map((p) => `IMF projection ${p.period}: ${f1(p.value)}`) : []),
        ...statuses.map((s) => `${s.id}: ${STATUS_TEXT[s.v.status]}`),
      ],
    });
  };

  return (
    <section className="ui-panel" data-forecast-panel="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('fc_title', { country: countryName })}
          {forecast?.ok && (
            <button type="button" className="ui-btn ml-auto text-xs" data-explain-panel="true" onClick={explain}>
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('fc_intro')}</p>
        <ChartGuide id="forecast" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('fc_measure')}>
          {MEASURES.map((x) => (
            <button key={x.id} type="button" className="ui-pill" aria-pressed={measure === x.id} onClick={() => {
                setMeasure(x.id);
                setShowFailed(false);
              }}>
              {t(`fc_m_${x.id}`)}
            </button>
          ))}
        </div>
        {!fc && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('fc_what'), error })}</p>}
        {fc && (
          <>
            <ul className="text-sm space-y-1" data-forecast-status="true">
              {statuses.map((s) => (
                <li key={s.id} className={s.v.status === 'passed' ? 'text-emerald-700 dark:text-emerald-400' : s.v.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>
                  {s.id.includes('nowcast') ? t('fc_nowcast') : t('fc_forecast')}: {status(s.v.status)}
                </li>
              ))}
            </ul>
            {nowcast && !nowcast.ok && (
              <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
                {t('fc_nowcastMissing', { reason: tx(nowcast.reason) })}
              </p>
            )}
            {nowcast?.ok && (
              <div className="text-sm text-slate-900 dark:text-white space-y-1" data-nowcast="true">
                {nowcast.points.map((p) => {
                  const b = p.bands.find((x) => x.level === 70);
                  return (
                    <p key={p.period}>
                      <strong>{t('fc_nowcastFor', { period: p.period, failed: nowcastFailed ? t('fc_failedTest') : '' })}</strong> {f1(p.mean)}%{b && ranges ? t('fc_band70', { lo: f1(b.lo), hi: f1(b.hi) }) : ''}. <span className="text-slate-500 dark:text-slate-400">{tx(p.how)}</span>
                    </p>
                  );
                })}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('fc_lastPublished', { period: nowcast.lastPublished.period, value: f1(nowcast.lastPublished.value) })}
                </p>
              </div>
            )}
            {forecast && !forecast.ok && (
              <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
                {t('fc_forecastMissing', { reason: tx(forecast.reason) })}
              </p>
            )}
            {forecast?.ok && forecastFailed && (
              <div className="text-sm text-red-700 dark:text-red-400 flex flex-wrap items-center gap-2" data-forecast-failed="true">
                <span>
                  {t(showFailed ? 'fc_failedShown' : 'fc_failedHidden', { imf: forecast.imf ? t('fc_andImf') : '' })}
                </span>
                <button type="button" className="ui-btn text-xs" aria-pressed={showFailed} onClick={() => setShowFailed((v) => !v)}>
                  {showFailed ? t('fc_hideFailed') : t('fc_showAnyway')}
                </button>
              </div>
            )}
            {forecast?.ok && (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 12 }} width={44} />
                      <Tooltip
                        formatter={(v: unknown, name: unknown) => (Array.isArray(v) ? [t('c_range', { from: f1(v[0]), to: f1(v[1]) }), String(name ?? '')] : [f1(v as number), String(name ?? '')])}
                      />
                      {ranges && <Area dataKey="b90" name={t('fc_b90')} stroke="none" fill="#3b82f6" fillOpacity={0.12} isAnimationActive={false} />}
                      {ranges && <Area dataKey="b70" name={t('fc_b70')} stroke="none" fill="#3b82f6" fillOpacity={0.18} isAnimationActive={false} />}
                      {ranges && <Area dataKey="b50" name={t('fc_b50')} stroke="none" fill="#3b82f6" fillOpacity={0.25} isAnimationActive={false} />}
                      <Line dataKey="actual" name={t('fc_published')} stroke="#64748b" dot={false} strokeWidth={2} isAnimationActive={false} />
                      <Line dataKey="mean" name={forecastFailed ? t('fc_appForecastFailed') : t('fc_appForecast')} stroke="#2563eb" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                      <Line dataKey="nowcast" name={nowcastFailed ? t('fc_appNowcastFailed') : t('fc_appNowcast')} stroke="none" dot={{ r: 4, fill: '#7c3aed', stroke: '#7c3aed' }} activeDot={false} isAnimationActive={false} />
                      <Line dataKey="imf" name={t('fc_imfYearly')} stroke="none" dot={{ r: 5, fill: '#d97706', stroke: '#d97706' }} activeDot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {ranges && drawForecast && <p className="text-xs text-slate-500 dark:text-slate-400" data-range-note="true">{t('fc_rangeNote', { sigma: forecast.fit.sigma })}</p>}
                <RangeNote />
                {forecast.imf && (
                  <div className="overflow-x-auto" data-imf-compare="true">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400">
                          <th className="py-1 pr-3">{t('c_year')}</th>
                          {drawForecast && <th className="py-1 pr-3">{t('fc_appYearly')}</th>}
                          <th className="py-1 pr-3">{t('fc_imf')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.imf.points.map((p) => (
                          <tr key={p.period} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-1 pr-3">{p.period}</td>
                            {drawForecast && <td className="py-1 pr-3">{f1(forecast.imf!.app.find((a) => a.period === p.period)?.value)}</td>}
                            <td className="py-1 pr-3">{f1(p.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tx(forecast.imf.note)}</p>
                    <RangeNote none="noRangeImf" className="text-xs text-slate-500 dark:text-slate-400 mt-1" />
                  </div>
                )}
                {forecast.caveats.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{forecast.caveats.map(tx).join(' ')}</p>}
                <details className="text-xs text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer">{t('c_methodSources')}</summary>
                  {nowcast?.ok && <p className="mt-1">{t('fc_nowcastMethod', { method: nowcast.method, from: nowcast.fit.from, to: nowcast.fit.to, n: nowcast.fit.n, r2: nowcast.fit.r2 !== undefined ? `, R² ${nowcast.fit.r2}` : '' })}</p>}
                  <p className="mt-1">
                    {t('fc_forecastMethod', { method: forecast.method, from: forecast.fit.from, to: forecast.fit.to, n: forecast.fit.n, sigma: forecast.fit.sigma })}
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {[...(nowcast?.ok ? nowcast.inputs : []), ...forecast.inputs].map((i, k) => (
                      <li key={k}>
                        {t('fc_input', { label: tx(i.label), source: i.source, newest: i.newest, saved: i.pulledAt ? t('fc_saved', { date: i.pulledAt.slice(0, 10) }) : '' })}
                      </li>
                    ))}
                    {forecast.imf && <li>{tx(forecast.imf.label)}{forecast.imf.vintage ? t('fc_saved', { date: forecast.imf.vintage.slice(0, 10) }) : ''}</li>}
                  </ul>
                  {statuses.map((s) => (
                    <p key={s.id} className="mt-1">
                      {s.id}: {tx(s.v.verdict)}
                    </p>
                  ))}
                  {[...(fc.history.problems || [])].map((p) => (
                    <p key={p} className="mt-1 text-amber-700 dark:text-amber-400">
                      {p}
                    </p>
                  ))}
                </details>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};
