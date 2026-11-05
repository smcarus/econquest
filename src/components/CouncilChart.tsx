import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Download, Maximize2, X } from 'lucide-react';
import type { ChartResult } from '../utils/councilChart';

/**
 * Council chat > the Chart Agent's chart: the lines the question named, then each test with its
 * plain-English reading. Loaded on demand (recharts stays out of the first download).
 */

const COLORS = ['#2563eb', '#d97706', '#059669', '#db2777'];

function fmt(v: number): string {
  const a = Math.abs(v);
  return a >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : a >= 100 ? v.toFixed(1) : v.toFixed(2);
}

/** Every line on one row per date, for the line chart and the CSV. */
function rows(result: ChartResult): Array<Record<string, number | string>> {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const l of result.lines)
    for (const p of l.points) {
      const row = byDate.get(p.date) || { date: p.date };
      row[l.key] = p.value;
      byDate.set(p.date, row);
    }
  return [...byDate.values()].sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1));
}

function downloadCsv(result: ChartResult) {
  const data = rows(result);
  const head = ['date', ...result.lines.map((l) => `${l.label} (${l.unit})`)];
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const body = data.map((r) => [String(r.date), ...result.lines.map((l) => (r[l.key] === undefined ? '' : String(r[l.key])))].map(esc).join(','));
  const sources = result.lines.map((l) => `# ${l.label}: ${l.source}`);
  const blob = new Blob([[...sources, head.map(esc).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${result.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'chart'}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ChartLines: React.FC<{ result: ChartResult; height: number }> = ({ result, height }) => {
  const data = useMemo(() => rows(result), [result]);
  const right = result.lines.some((l) => l.axis === 'right');
  const unitOf = (axis: 'left' | 'right') => result.lines.find((l) => l.axis === axis)?.unit ?? '';
  return (
    <div style={{ height }} data-council-chart-lines={result.lines.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: right ? 8 : 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={52} domain={['auto', 'auto']} label={{ value: unitOf('left'), angle: -90, position: 'insideLeft', fontSize: 11, offset: 12 }} />
          {right && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={52} domain={['auto', 'auto']} label={{ value: unitOf('right'), angle: 90, position: 'insideRight', fontSize: 11, offset: 12 }} />}
          <Tooltip formatter={(v, name) => [fmt(Number(v)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {result.lines.map((l, i) => (
            <Line
              key={l.key}
              yAxisId={l.axis}
              type="linear"
              dataKey={l.key}
              name={`${l.label} (${l.unit})`}
              stroke={l.dashed ? '#64748b' : COLORS[i % COLORS.length]}
              strokeDasharray={l.dashed ? '5 4' : undefined}
              strokeWidth={l.dashed ? 1.5 : 2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ScatterFit: React.FC<{ result: ChartResult; height: number }> = ({ result, height }) => {
  const s = result.scatter;
  if (!s) return null;
  const xs = s.pairs.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const fit = s.fit ? [{ x: lo, y: s.fit.a + s.fit.b * lo }, { x: hi, y: s.fit.a + s.fit.b * hi }] : [];
  return (
    <div style={{ height }} data-council-chart-scatter={s.pairs.length}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />
          <XAxis type="number" dataKey="x" name={s.xLabel} tick={{ fontSize: 11 }} domain={['auto', 'auto']} label={{ value: s.xLabel, position: 'insideBottom', offset: -8, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={s.yLabel} tick={{ fontSize: 11 }} width={52} domain={['auto', 'auto']} />
          <ZAxis range={[24, 24]} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Scatter data={s.pairs} fill="#2563eb" fillOpacity={0.55} isAnimationActive={false} name="Points" />
          {fit.length > 0 && <Scatter data={fit} line={{ stroke: '#d97706', strokeWidth: 2 }} shape={() => <g />} isAnimationActive={false} name="Regression line" legendType="line" />}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

const SmallLags: React.FC<{ lags: NonNullable<ChartResult['tests'][number]['lags']> }> = ({ lags }) => (
  <div className="h-28" data-council-chart-lags={lags.length}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={lags} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="lag" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={36} domain={[-1, 1]} />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
        <Tooltip formatter={(v) => [Number(v).toFixed(2), 'r']} labelFormatter={(l) => `lag ${l}`} />
        <Bar dataKey="r" fill="#2563eb" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const SmallRolling: React.FC<{ points: NonNullable<ChartResult['tests'][number]['rolling']> }> = ({ points }) => (
  <div className="h-28" data-council-chart-rolling={points.length}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={28} />
        <YAxis tick={{ fontSize: 10 }} width={36} domain={[-1, 1]} />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
        <Tooltip formatter={(v) => [Number(v).toFixed(2), 'rolling r']} />
        <Line dataKey="value" stroke="#2563eb" dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/** Notes, then each line's source, then the frequency and dates. */
function footnote(result: ChartResult): string {
  const parts = [...result.notes];
  const drawn = result.lines.filter((l) => !l.dashed);
  if (drawn.length) {
    parts.push(`Sources: ${[...new Set(drawn.map((l) => `${l.label}, ${l.source}`))].join('; ')}`);
    parts.push(`${result.freq[0].toUpperCase()}${result.freq.slice(1)} points, ${result.first} to ${result.last}`);
  }
  return parts.length ? `${parts.join('. ')}.` : '';
}

const Body: React.FC<{ result: ChartResult; big?: boolean }> = ({ result, big }) => (
  <div className="space-y-3">
    {result.lines.length ? <ChartLines result={result} height={big ? 420 : 240} /> : <p className="ui-body">Nothing to draw: every series asked for is missing.</p>}
    {result.scatter && <ScatterFit result={result} height={big ? 360 : 220} />}
    {result.tests.length > 0 && (
      <ul className="space-y-2" data-council-chart-tests={result.tests.length}>
        {result.tests.map((t, i) => (
          <li key={`${t.test}-${i}`} className="border-t border-slate-100 dark:border-slate-800 pt-2">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{t.title}</div>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t.reading}</p>
            {t.caution && <p className="text-xs text-amber-700 dark:text-amber-400">{t.caution}</p>}
            {big && t.lags && <SmallLags lags={t.lags} />}
            {big && t.rolling && <SmallRolling points={t.rolling} />}
          </li>
        ))}
      </ul>
    )}
    {result.missing.length > 0 && (
      <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5" data-council-chart-missing={result.missing.length}>
        {result.missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    )}
    {footnote(result) && <p className="text-xs text-slate-500 dark:text-slate-400">{footnote(result)}</p>}
  </div>
);

/** The chart card inside a council answer, with Open larger and Download CSV. */
export const CouncilChartCard: React.FC<{ result: ChartResult }> = ({ result }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2" data-council-chart="true">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="ui-label">Chart Agent</div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{result.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOpen(true)} data-council-chart-open="true">
            <Maximize2 className="w-3.5 h-3.5" /> Open larger
          </button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => downloadCsv(result)} disabled={!result.lines.length}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </header>
      <Body result={result} />
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-2 sm:p-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label={result.title} onClick={() => setOpen(false)}>
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-3" onClick={(e) => e.stopPropagation()} data-council-chart-dialog="true">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="ui-label">Chart Agent</div>
                <h2 className="ui-section-title">{result.title}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={() => downloadCsv(result)} disabled={!result.lines.length}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button type="button" className="ui-btn" onClick={() => setOpen(false)} aria-label="Close chart">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Body result={result} big />
          </div>
        </div>
      )}
    </section>
  );
};
