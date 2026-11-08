import React, { useMemo, useState } from 'react';
import { Waypoints } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OpenDataSnapshot } from '../types/council';
import { useT } from '../i18n/useLang';
import { GAP_MODEL } from '../i18n/messages/gapModel';
import { TOOLS } from '../i18n/messages/tools';
import { GAP_PARAMS, GAP_START, MAX_QUARTERS, gapPathCsv, runGapModel, type GapParam, type GapShock, type GapStart, type GapVariable } from '../utils/gapModel';
import { gapStartFromSnapshot, type StartMissing } from '../utils/gapModelStart';

/**
 * Country Research > History & data > Small gap model (plan item L2b). Four quarterly equations
 * (src/utils/gapModel.ts) that run only on numbers the user typed. Parameters always start blank;
 * the starting point is filled from saved figures only when the user presses the button
 * (src/utils/gapModelStart.ts), each value shown with its source.
 */

type Text = Record<string, string>;
type Fill = { source: string; period?: string } | { missing: StartMissing };
type ShockRow = { variable: GapVariable; quarter: string; size: string };

const VARS: GapVariable[] = ['y', 'p', 'i', 'q'];
const COLOURS: Record<GapVariable, string> = { y: '#2563eb', p: '#dc2626', i: '#059669', q: '#d97706' };
const blank = (v: string | undefined) => v === undefined || v.trim() === '';
const parse = (v: string) => Number(v.trim().replace(',', '.'));
const r2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

const inputCls = 'w-24 px-1.5 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

export const GapModelPanel: React.FC<{ iso3: string; countryName: string; snapshot: OpenDataSnapshot }> = ({ iso3, countryName, snapshot }) => {
  const t = useT(GAP_MODEL);
  const missingWord = useT(TOOLS)('c_missing');
  const [params, setParams] = useState<Text>({});
  const [start, setStart] = useState<Text>({});
  const [fills, setFills] = useState<Partial<Record<GapStart, Fill>>>({});
  const [quarters, setQuarters] = useState('12');
  const [shocks, setShocks] = useState<ShockRow[]>([]);

  const label = (k: GapParam | GapStart) => t(`${GAP_PARAMS.includes(k as GapParam) ? 'p' : 's'}_${k}` as 'p_b1');
  const varName = (v: GapVariable) => t(`var_${v}` as 'var_y');

  const fill = () => {
    const nextStart = { ...start };
    const nextFills: Partial<Record<GapStart, Fill>> = {};
    for (const f of gapStartFromSnapshot(snapshot)) {
      if ('missing' in f) nextFills[f.key] = { missing: f.missing };
      else {
        nextStart[f.key] = String(Math.round(f.value * 100) / 100);
        nextFills[f.key] = { source: f.source, period: f.period };
      }
    }
    setStart(nextStart);
    setFills(nextFills);
  };

  const clear = () => {
    setParams({});
    setStart({});
    setFills({});
    setQuarters('12');
    setShocks([]);
  };

  const check = useMemo(() => {
    const missing: string[] = [];
    const problems: string[] = [];
    for (const k of GAP_PARAMS) {
      if (blank(params[k])) missing.push(label(k));
      else if (!Number.isFinite(parse(params[k]!))) problems.push(t('notNumber', { label: label(k) }));
    }
    for (const k of GAP_START) {
      if (blank(start[k])) missing.push(label(k));
      else if (!Number.isFinite(parse(start[k]!))) problems.push(t('notNumber', { label: label(k) }));
    }
    const q = Number(quarters.trim());
    if (!Number.isInteger(q) || q < 1 || q > MAX_QUARTERS) problems.push(t('badQuarters'));
    const shockList: GapShock[] = [];
    for (const s of shocks) {
      const quarter = Number(s.quarter.trim());
      const size = parse(s.size);
      if (!Number.isInteger(quarter) || quarter < 1 || quarter > MAX_QUARTERS || blank(s.size) || !Number.isFinite(size)) {
        if (!problems.includes(t('badShock'))) problems.push(t('badShock'));
      } else shockList.push({ variable: s.variable, quarter, size });
    }
    return { missing, problems, quarters: q, shocks: shockList };
  }, [params, start, quarters, shocks, t]);

  const result = useMemo(() => {
    if (check.missing.length || check.problems.length) return null;
    const r = runGapModel({ params, start, shocks: check.shocks, quarters: check.quarters });
    return r.ok ? r : null;
  }, [check, params, start]);

  const downloadCsv = () => {
    if (!result) return;
    const head = [
      `# Small gap model, ${countryName} (${iso3}): the user's own assumptions, not a forecast`,
      ...GAP_PARAMS.map((k) => `# ${k} = ${result.params[k]}`),
      ...GAP_START.map((k) => `# ${k} = ${result.start[k]}`),
      ...check.shocks.map((s) => `# shock on ${s.variable} in quarter ${s.quarter}: ${s.size}`),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[...head, gapPathCsv(result.path)].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `gap-model-${iso3.toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const missText = (m: StartMissing) => t(`miss_${m}` as 'miss_no_cpi');

  const field = (k: GapParam | GapStart, value: string | undefined, set: (v: string) => void) => (
    <label key={k} className="flex items-center justify-between gap-2 text-xs py-0.5">
      <span className="text-slate-600 dark:text-slate-300">{label(k)}</span>
      <input className={inputCls} inputMode="decimal" value={value ?? ''} placeholder={missingWord} aria-label={label(k)} data-gap-input={k} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <section className="ui-panel" data-gap-model="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Waypoints className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden />
          {t('title', { country: countryName })}
        </h2>
        <p className="ui-label mt-1">{t('intro')}</p>
      </header>
      <div className="p-4 space-y-4">
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">{t('eqTitle')}</summary>
          <ul className="mt-2 space-y-1 font-mono text-slate-700 dark:text-slate-300">
            <li>{t('eqY')}</li>
            <li>{t('eqP')}</li>
            <li>{t('eqI')}</li>
            <li>{t('eqQ')}</li>
          </ul>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('eqNote')}</p>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('params')}</h3>
            {GAP_PARAMS.map((k) => field(k, params[k], (v) => setParams((p) => ({ ...p, [k]: v }))))}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('start')}</h3>
            <button type="button" className="ui-pill mb-1" onClick={fill} data-gap-fill="true">
              {t('fill')}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('fillNote', { country: countryName })}</p>
            {GAP_START.map((k) => {
              const f = fills[k];
              return (
                <div key={k}>
                  {field(k, start[k], (v) => setStart((s) => ({ ...s, [k]: v })))}
                  {f && (
                    <p className="text-xs pb-1 text-slate-500 dark:text-slate-400" data-gap-fill-note={k}>
                      {'missing' in f ? missText(f.missing) : t('filledFrom', { source: f.source, period: f.period ? `, ${f.period}` : '' })}
                    </p>
                  )}
                </div>
              );
            })}

            <label className="flex items-center justify-between gap-2 text-xs py-0.5 mt-3">
              <span className="text-slate-600 dark:text-slate-300">{t('quarters')}</span>
              <input className={inputCls} inputMode="numeric" value={quarters} aria-label={t('quarters')} data-gap-input="quarters" onChange={(e) => setQuarters(e.target.value)} />
            </label>

            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 mb-1">{t('shocks')}</h3>
            {shocks.map((s, n) => (
              <div key={n} className="flex flex-wrap items-center gap-2 text-xs py-0.5" data-gap-shock={n}>
                <label className="flex items-center gap-1">
                  {t('shockVar')}
                  <select
                    className="px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    value={s.variable}
                    onChange={(e) => setShocks((list) => list.map((r, i) => (i === n ? { ...r, variable: e.target.value as GapVariable } : r)))}
                  >
                    {VARS.map((v) => (
                      <option key={v} value={v}>
                        {varName(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  {t('shockQ')}
                  <input className="w-12 px-1 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700" inputMode="numeric" value={s.quarter} onChange={(e) => setShocks((list) => list.map((r, i) => (i === n ? { ...r, quarter: e.target.value } : r)))} />
                </label>
                <label className="flex items-center gap-1">
                  {t('shockSize')}
                  <input className="w-16 px-1 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700" inputMode="decimal" value={s.size} onChange={(e) => setShocks((list) => list.map((r, i) => (i === n ? { ...r, size: e.target.value } : r)))} />
                </label>
                <button type="button" className="text-blue-700 dark:text-blue-300 hover:underline" onClick={() => setShocks((list) => list.filter((_, i) => i !== n))}>
                  {t('remove')}
                </button>
              </div>
            ))}
            <button type="button" className="ui-pill mt-1" onClick={() => setShocks((list) => [...list, { variable: 'y', quarter: '1', size: '' }])} data-gap-add-shock="true">
              {t('addShock')}
            </button>
          </div>
        </div>

        {(check.missing.length > 0 || check.problems.length > 0) && (
          <div className="text-xs text-amber-700 dark:text-amber-400" data-gap-missing="true">
            {check.problems.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {check.missing.length > 0 && (
              <>
                <p className="font-semibold">{t('missingHead')}</p>
                <ul className="list-disc pl-5">
                  {check.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3" data-gap-result="true">
            {result.unstable && (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-gap-unstable="true">
                {t('unstable', { q: result.path.length - 1 })}
              </p>
            )}
            <div className="h-64" role="img" aria-label={t('chartAria')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.path} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={44} />
                  <Tooltip formatter={(v) => r2(Number(v))} labelFormatter={(q) => `${t('colQuarter')} ${q}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {VARS.map((v) => (
                    <Line key={v} dataKey={v} name={varName(v)} stroke={COLOURS[v]} dot={false} strokeWidth={2} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="text-xs tabular-nums w-full">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="pr-3 font-medium">{t('colQuarter')}</th>
                    {VARS.map((v) => (
                      <th key={v} className="pr-3 font-medium">
                        {varName(v)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.path.map((r) => (
                    <tr key={r.quarter} className="text-slate-800 dark:text-slate-200">
                      <td className="pr-3">{r.quarter}</td>
                      {VARS.map((v) => (
                        <td key={v} className="pr-3">
                          {r2(r[v])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="ui-pill" onClick={downloadCsv} data-gap-csv="true">
                {t('csv')}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{t('notForecast')}</span>
          <button type="button" className="ui-pill" onClick={clear} data-gap-clear="true">
            {t('clear')}
          </button>
        </div>
      </div>
    </section>
  );
};
