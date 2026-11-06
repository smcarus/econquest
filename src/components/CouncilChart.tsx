import React, { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Download, Image as ImageIcon, Maximize2, MessageCircleQuestion, X } from 'lucide-react';
import { chartFocus, explainInChat } from '../utils/explainHandoff';
import { computeChart, fetchChartSeries, TEST_TITLE, type ChartResult, type ChartTest } from '../utils/councilChart';
import { TRANSFORM_LABEL, type Transform } from '../utils/stats';
import { csvNoticeLine, EXPORT_NOTICE } from '../utils/disclaimer';
import { creditsFor, framedSvg, shareModeBlock } from '../utils/creditLines';
import { loadShareMode } from '../utils/shareMode';

/**
 * Council chat > the Chart Agent's chart: the lines the question named, then each test with its
 * plain-English reading. Loaded on demand (recharts stays out of the first download).
 */

const COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed', '#0891b2'];

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
  const sources = [csvNoticeLine(), ...result.lines.map((l) => `# ${l.label}: ${l.source}`), ...creditsFor(result.lines.map((l) => l.source)).credits.map((c) => `# Credit: ${esc(c)}`)];
  const blob = new Blob([[...sources, head.map(esc).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${result.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'chart'}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fileStem = (title: string) => title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'chart';

/**
 * The chart as a stand-alone SVG image: title on top, then under the chart its sources, the credit
 * each source's terms ask for, the dates and the research notice, so it keeps them wherever it goes.
 */
function downloadImage(result: ChartResult, box: HTMLElement | null) {
  const svg = box?.querySelector('svg.recharts-surface') as SVGSVGElement | null;
  if (!svg) return;
  const width = Math.round(Number(svg.getAttribute('width')) || svg.clientWidth || 720);
  const height = Math.round(Number(svg.getAttribute('height')) || svg.clientHeight || 320);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const { credits } = creditsFor(result.lines.map((l) => l.source));
  const footer = [footnote(result), ...credits.map((c) => `Credit: ${c}`), `Made with EconQuest on ${new Date().toISOString().slice(0, 10)}. ${EXPORT_NOTICE}`].filter(Boolean);
  const blob = new Blob([framedSvg(new XMLSerializer().serializeToString(clone), width, height, result.title, footer)], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileStem(result.title)}.svg`;
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

const SHOW_AS: Transform[] = ['level', 'change', 'yoy', 'index100', 'zscore'];
const PAIR_TESTS: ChartTest[] = ['correlation', 'regression', 'leadlag', 'granger', 'rolling'];
const ALL_TESTS: ChartTest[] = ['summary', 'correlation', 'regression', 'leadlag', 'granger', 'rolling', 'adf', 'hp'];

/**
 * The larger view's controls: show the lines another way and switch tests on or off. The series are
 * fetched again from the app's own history, so the view is redrawn from real figures only.
 */
const Controls: React.FC<{ base: ChartResult; view: ChartResult; busy: boolean; onChange: (transform: Transform, tests: ChartTest[]) => void }> = ({ base, view, busy, onChange }) => {
  const req = view.request;
  if (!req) return null;
  const pair = req.series.length >= 2 && !req.derived?.length;
  const offered = ALL_TESTS.filter((t) => (t === 'summary' ? Boolean(req.derived?.length) || req.tests.includes('summary') : pair || !PAIR_TESTS.includes(t)));
  const toggle = (t: ChartTest) => onChange(req.transform, req.tests.includes(t) ? req.tests.filter((x) => x !== t) : [...req.tests, t]);
  const changed = req.transform !== base.request?.transform || req.tests.join() !== base.request?.tests.join();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-y border-slate-100 dark:border-slate-800 py-2" data-council-chart-controls="true">
      <label className="flex items-center gap-1.5">
        <span className="text-slate-500 dark:text-slate-400">Show as</span>
        <select className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs" value={req.transform} disabled={busy} onChange={(e) => onChange(e.target.value as Transform, req.tests)} data-council-chart-transform="true">
          {SHOW_AS.map((t) => (
            <option key={t} value={t}>
              {TRANSFORM_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-500 dark:text-slate-400">Tests</span>
        {offered.map((t) => (
          <button key={t} type="button" className="ui-pill" aria-pressed={req.tests.includes(t)} disabled={busy} onClick={() => toggle(t)} data-council-chart-test={t}>
            {TEST_TITLE[t].replace(/ \(.*\)$/, '').replace(/^Is the relationship stable\?/, 'Rolling correlation')}
          </button>
        ))}
      </span>
      {busy && <span className="text-slate-500 dark:text-slate-400">Redrawing…</span>}
      {changed && !busy && (
        <span className="text-slate-500 dark:text-slate-400">Changed here only; ask in the chat to have the council talk about this view.</span>
      )}
    </div>
  );
};

/** The chart card inside a council answer, with Open larger and Download CSV. */
export const CouncilChartCard: React.FC<{ result: ChartResult }> = ({ result }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChartResult>(result);
  const [busy, setBusy] = useState(false);
  const chartBox = useRef<HTMLDivElement>(null);
  // Sharing mode: no image or CSV of figures whose sources' terms do not let them be passed on.
  const blocked = shareModeBlock(result.lines.map((l) => l.source), loadShareMode());
  const redraw = async (transform: Transform, tests: ChartTest[]) => {
    if (!result.request) return;
    const req = { ...result.request, transform, tests: ALL_TESTS.filter((t) => tests.includes(t)) };
    setBusy(true);
    try {
      setView(computeChart(req, await fetchChartSeries(req)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2" data-council-chart="true" data-no-provenance-overlay="true">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="ui-label">Chart Agent</div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{result.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={() => explainInChat(chartFocus(result))}
            disabled={!result.lines.length}
            title="Ask the council what this pattern shows, why, and what it means"
            data-council-chart-explain="true"
          >
            <MessageCircleQuestion className="w-3.5 h-3.5" /> Explain
          </button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOpen(true)} data-council-chart-open="true">
            <Maximize2 className="w-3.5 h-3.5" /> Open larger
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={() => downloadImage(result, chartBox.current)}
            disabled={!result.lines.length || Boolean(blocked)}
            title={blocked ?? 'Download the chart as an image (SVG) with its sources and credit lines under it'}
            data-council-chart-image="true"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Image
          </button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => downloadCsv(result)} disabled={!result.lines.length || Boolean(blocked)} title={blocked ?? undefined}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </header>
      {blocked && <p className="text-xs text-amber-700 dark:text-amber-400" data-council-chart-blocked="true">{blocked}</p>}
      <div ref={chartBox}>
        <Body result={result} />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-2 sm:p-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label={result.title} onClick={() => setOpen(false)}>
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-3" onClick={(e) => e.stopPropagation()} data-council-chart-dialog="true">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="ui-label">Chart Agent</div>
                <h2 className="ui-section-title">{view.title}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={() => downloadCsv(view)} disabled={!view.lines.length}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button type="button" className="ui-btn" onClick={() => setOpen(false)} aria-label="Close chart">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Controls base={result} view={view} busy={busy} onChange={(t, tests) => void redraw(t, tests)} />
            <Body result={view} big />
          </div>
        </div>
      )}
    </section>
  );
};
