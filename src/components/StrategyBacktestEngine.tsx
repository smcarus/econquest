import React, { useMemo, useState } from 'react';
import {
  BacktestBenchmarkId,
  BacktestConfigState,
  BacktestRegimeFilter,
  CouncilAssessmentRun,
  DeskId,
} from '../types/council';
import {
  BENCHMARK_LABELS,
  DEFAULT_BACKTEST_CONFIG,
  runSovereignStrategyBacktest,
} from '../utils/strategyBacktestingEngine';
import {
  Award,
  CheckCircle2,
  Filter,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface StrategyBacktestEngineProps {
  run: CouncilAssessmentRun;
}

export const StrategyBacktestEngine: React.FC<StrategyBacktestEngineProps> = ({
  run,
}) => {
  const [config, setConfig] = useState<BacktestConfigState>(DEFAULT_BACKTEST_CONFIG);
  const [deskFilter, setDeskFilter] = useState<'ALL' | DeskId>('ALL');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const backtest = useMemo(
    () => runSovereignStrategyBacktest(run.openData, config),
    [run.openData, config]
  );

  const visibleBlotter = useMemo(() => {
    if (deskFilter === 'ALL') return backtest.tradeBlotter;
    return backtest.tradeBlotter.filter((t) => t.deskId === deskFilter);
  }, [backtest.tradeBlotter, deskFilter]);

  // --- SVG GEOMETRY FOR CUMULATIVE ALPHA VS BENCHMARK CHART ---
  const svgW = 680;
  const svgH = 240;
  const padL = 48;
  const padR = 24;
  const padT = 22;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const curvePts = backtest.equityCurve;
  const allVals = curvePts.flatMap((p) => [
    p.strategyCumulativeReturnPct,
    p.benchmarkCumulativeReturnPct,
    p.cumulativeAlphaPct,
    0,
  ]);
  const minVal = Math.floor(Math.min(...allVals) * 1.1 - 2);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.08 + 2);
  const valRange = Math.max(10, maxVal - minVal);

  const getX = (i: number) =>
    curvePts.length <= 1 ? padL + plotW / 2 : padL + (i / (curvePts.length - 1)) * plotW;
  const getY = (v: number) => padT + plotH - ((v - minVal) / valRange) * plotH;

  const zeroY = getY(0);

  const stratPolyline = curvePts
    .map((p, i) => `${getX(i)},${getY(p.strategyCumulativeReturnPct)}`)
    .join(' ');
  const benchPolyline = curvePts
    .map((p, i) => `${getX(i)},${getY(p.benchmarkCumulativeReturnPct)}`)
    .join(' ');
  const alphaPolyline = curvePts
    .map((p, i) => `${getX(i)},${getY(p.cumulativeAlphaPct)}`)
    .join(' ');

  // Shaded area between Strategy and Benchmark
  const alphaFillPolygon = [
    ...curvePts.map((p, i) => `${getX(i)},${getY(p.strategyCumulativeReturnPct)}`),
    ...[...curvePts]
      .reverse()
      .map((p, revIdx) => {
        const origIdx = curvePts.length - 1 - revIdx;
        return `${getX(origIdx)},${getY(p.benchmarkCumulativeReturnPct)}`;
      }),
  ].join(' ');

  const activePoint =
    curvePts[hoverIdx !== null ? hoverIdx : curvePts.length - 1] || curvePts[0];

  return (
    <div className="space-y-6">
      {/* 1. TOP STRATEGY BACKTEST CONFIGURATION & BENCHMARK CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <span>Institutional Strategy Backtesting &amp; Alpha Attribution Engine</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Target Sovereign: {run.countryName} ({run.iso3} · {run.openData.currencyCode})</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Historical Council Trade Ticket Performance vs. Sovereign Benchmarks (2019–2025)
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setConfig(DEFAULT_BACKTEST_CONFIG)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors w-fit whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Backtest Rules</span>
          </button>
        </div>

        {/* Interactive Benchmark & Strategy Rule Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Benchmark Selector */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Sovereign Benchmark Index
            </label>
            <select
              value={config.benchmarkId}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  benchmarkId: e.target.value as BacktestBenchmarkId,
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="BLENDED_50_50">50/50 Blended (EMBI USD + GBI-EM Local)</option>
              <option value="EMBI_USD">J.P. Morgan EMBI Global (Hard-Currency USD)</option>
              <option value="GBI_EM_LOCAL">J.P. Morgan GBI-EM (Local Currency)</option>
            </select>
          </div>

          {/* Historical Regime Filter */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Macro Regime Window Filter
            </label>
            <select
              value={config.regimeFilter}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  regimeFilter: e.target.value as BacktestRegimeFilter,
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL_REGIMES">All Regimes (2019–2025 Full Cycle)</option>
              <option value="CRISIS_AND_SHOCK_ONLY">Crisis &amp; Shock Windows Only (2020, 2022, 2024)</option>
              <option value="CARRY_AND_RECOVERY">Carry &amp; Disinflation Recovery Windows</option>
            </select>
          </div>

          {/* CRO Stop-Loss Enforcement Toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                CRO Stop-Loss &amp; Tail Gate
              </span>
              <span
                className={`font-mono font-bold ${
                  config.enforceCroStopLoss
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {config.enforceCroStopLoss ? 'ENFORCED (ON)' : 'DISABLED (RAW)'}
              </span>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.enforceCroStopLoss}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    enforceCroStopLoss: e.target.checked,
                  }))
                }
                className="accent-blue-600"
              />
              <span>Enforce Hard Invalidation Stops (−{backtest.croDrawdownSavedPct}% DD Saved)</span>
            </label>
          </div>

          {/* Conviction Sizing & Risk Target */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Agent Sizing &amp; Leverage
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {config.leverageTarget.toFixed(1)}x · {config.sizingMode === 'BRIER_WEIGHTED' ? 'Brier' : 'Equal'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <select
                value={config.sizingMode}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    sizingMode: e.target.value as BacktestConfigState['sizingMode'],
                  }))
                }
                className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
              >
                <option value="BRIER_WEIGHTED">Brier-Calibrated Sizing</option>
                <option value="EQUAL_WEIGHT">Equal Desk Weighting</option>
              </select>
              <select
                value={config.leverageTarget}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    leverageTarget: Number(e.target.value),
                  }))
                }
                className="w-20 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
              >
                <option value={0.5}>0.5x</option>
                <option value={1.0}>1.0x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6-KPI Institutional Backtest Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Council Cumulative Return</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
              {backtest.totalStrategyReturnPct >= 0 ? '+' : ''}
              {backtest.totalStrategyReturnPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {backtest.horizonLabel.slice(0, 22)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Benchmark Return</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {backtest.totalBenchmarkReturnPct >= 0 ? '+' : ''}
              {backtest.totalBenchmarkReturnPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {config.benchmarkId}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Net Cumulative Alpha</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {backtest.netCumulativeAlphaPct >= 0 ? '+' : ''}
              {backtest.netCumulativeAlphaPct}%
            </div>
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              +{backtest.annualizedAlphaPct}% / yr Annualized
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Information &amp; Sharpe Ratio</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              IR {backtest.informationRatio}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Sharpe: {backtest.annualizedSharpeRatio}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Council Hit Rate (Win %)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {backtest.overallHitRatePct}%
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Profit Factor: {backtest.overallProfitFactor}x
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Max Drawdown (vs Bench)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
              {backtest.strategyMaxDrawdownPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Bench Max DD: {backtest.benchmarkMaxDrawdownPct}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. CUMULATIVE ALPHA VS BENCHMARK ATTRIBUTION CHART + DESK SHARE BREAKDOWN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Performance Attribution &amp; Cumulative Alpha Curve
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{backtest.benchmarkLabel}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 text-balance">
              {backtest.conclusionHeadline}
            </h3>
          </div>

          {activePoint && (
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 px-3.5 py-2 border border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <span className="text-slate-400 block text-[10px]">{activePoint.periodLabel} ({activePoint.regimeTag})</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Strat: {activePoint.strategyCumulativeReturnPct >= 0 ? '+' : ''}
                  {activePoint.strategyCumulativeReturnPct}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Benchmark</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {activePoint.benchmarkCumulativeReturnPct >= 0 ? '+' : ''}
                  {activePoint.benchmarkCumulativeReturnPct}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Alpha</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {activePoint.cumulativeAlphaPct >= 0 ? '+' : ''}
                  {activePoint.cumulativeAlphaPct}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left 8 Cols: Interactive SVG Equity & Alpha Attribution Chart */}
          <div className="lg:col-span-8">
            <div className="bg-slate-50/50 dark:bg-slate-950/50 p-3 border border-slate-100 dark:border-slate-800/80">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 overflow-visible">
                {/* Horizontal Reference Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                  const y = padT + t * plotH;
                  const val = maxVal - t * valRange;
                  return (
                    <g key={idx}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={svgW - padR}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={padL - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-slate-400"
                      >
                        {val >= 0 ? `+${val.toFixed(0)}%` : `${val.toFixed(0)}%`}
                      </text>
                    </g>
                  );
                })}

                {/* Zero Return Line */}
                <line
                  x1={padL}
                  y1={zeroY}
                  x2={svgW - padR}
                  y2={zeroY}
                  stroke="#64748b"
                  strokeWidth="1"
                />

                {/* Shaded Outperformance Ribbon between Strategy and Benchmark */}
                <polygon
                  points={alphaFillPolygon}
                  className="fill-blue-500/15 dark:fill-blue-400/15"
                />

                {/* Benchmark Cumulative Return Line (Slate Dashed) */}
                <polyline
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  points={benchPolyline}
                />

                {/* Cumulative Alpha Spread Line (Emerald) */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  points={alphaPolyline}
                />

                {/* Council Strategy Cumulative Return Line (Bold Blue) */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.75"
                  points={stratPolyline}
                />

                {/* Interactive Period Nodes */}
                {curvePts.map((pt, i) => {
                  const cx = getX(i);
                  const cyStrat = getY(pt.strategyCumulativeReturnPct);
                  const isShock = pt.regimeTag === 'SHOCK';
                  return (
                    <g
                      key={pt.periodLabel}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                    >
                      <rect
                        x={cx - plotW / (curvePts.length * 2)}
                        y={padT}
                        width={plotW / curvePts.length}
                        height={plotH}
                        fill="transparent"
                      />
                      <circle
                        cx={cx}
                        cy={cyStrat}
                        r={hoverIdx === i ? 5 : 3.5}
                        className={
                          isShock
                            ? 'fill-amber-500 stroke-white dark:stroke-slate-900 stroke-1'
                            : 'fill-blue-600 dark:fill-blue-400'
                        }
                      />
                      <text
                        x={cx}
                        y={svgH - 8}
                        textAnchor="middle"
                        className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400"
                      >
                        {pt.periodLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Council Multi-Desk Strategy (%)
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Net Cumulative Alpha Spread (%)
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                    <span>Benchmark Index (%)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>Crisis / Shock Regime Quarter</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Desk Alpha Attribution Share + 3 Concise Decision Bullets */}
          <div className="lg:col-span-4 space-y-4">
            {/* Stacked Desk Alpha Contribution Breakdown */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Realized Alpha Attribution by Desk
              </div>
              {backtest.deskAttribution.slice(0, 3).map((d) => (
                <div key={d.deskId} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {d.deskName}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{d.cumulativeAlphaContributionPct}% ({d.alphaShareOfTotalPct}% Share)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${d.alphaShareOfTotalPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 3 Concise Decision Bullets */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Alpha Attribution — 3 Key Takeaways
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">What It Measures (2019–2025):</strong> Cumulative total return of the Council&apos;s trade tickets against {BENCHMARK_LABELS[config.benchmarkId]}.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> Over 65% of cumulative Alpha is generated during sovereign shock windows (2020 Q1, 2022 Q1–Q3, 2024 Q4) when cross-desk cascade signals rotate into 5Y CDS and curve steepeners.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Decision Threshold &amp; Action Trigger:</strong> Keeping CRO Stop-Loss enforcement active saves {backtest.croDrawdownSavedPct}% in maximum drawdown and lifts the Information Ratio to {backtest.informationRatio}.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DESK-BY-DESK HIT-RATE, SHARPE, PROFIT FACTOR & BRIER CALIBRATION SCORECARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Empirical Desk Accuracy &amp; Brier Calibration Audit · Feeds Directly into Supreme Council Voting Weights
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Summary of Hit-Rate, Profit Factor, Sharpe &amp; Brier Calibration by Desk
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Sizing Mode: {config.sizingMode === 'BRIER_WEIGHTED' ? 'Brier-Calibrated Conviction Weights' : 'Equal Weighting'}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Council Desk / Composite</th>
                <th className="py-2.5 px-3 font-semibold text-right">Signals (W / L)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Hit Rate (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Avg Win / Loss</th>
                <th className="py-2.5 px-3 font-semibold text-right">Profit Factor</th>
                <th className="py-2.5 px-3 font-semibold text-right">Alpha Contrib</th>
                <th className="py-2.5 px-3 font-semibold text-right">Sharpe / IR</th>
                <th className="py-2.5 px-3 font-semibold text-right">Brier Score (Vote Wt)</th>
                <th className="py-2.5 px-3 font-semibold">Top Historical Alpha Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
              {backtest.deskAttribution.map((d) => {
                const isComposite = d.deskId === 'supreme_council';
                return (
                  <tr
                    key={d.deskId}
                    className={
                      isComposite
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 font-semibold'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {d.deskName}
                      </div>
                      <div className="text-[11px] text-slate-500">{d.leadAgentTitle}</div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      {d.totalSignalsGenerated} ({d.winningSignals}W / {d.losingSignals}L)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {d.hitRatePct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400">+{d.avgWinBps}</span> /{' '}
                      <span className="text-red-600 dark:text-red-400">-{d.avgLossBps} bps</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {d.profitFactor.toFixed(2)}x
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      +{d.cumulativeAlphaContributionPct}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      {d.annualizedSharpe.toFixed(2)} / {d.informationRatio.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 dark:text-slate-200">
                      {d.brierCalibrationScore.toFixed(3)} ({d.impliedVotingWeightPct}%)
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-300">
                      {d.bestHistoricalCall}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. HISTORICAL TRADE TICKET EXECUTION BLOTTER & REALIZED PNL AUDIT LEDGER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Auditable Historical Trade Execution Ledger · Entry, Target, CRO Stop &amp; Realized Alpha vs. Benchmark
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Historical Council Trade Ticket Execution Blotter ({run.countryName})
            </h3>
          </div>

          {/* Desk Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1">
            {[
              { id: 'ALL', label: 'All Desks' },
              { id: 'sovereign', label: 'Sovereign Credit' },
              { id: 'macro', label: 'Macroeconomic' },
              { id: 'geopolitical', label: 'Geopolitical' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDeskFilter(f.id as any)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  deskFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Ticket &amp; Window</th>
                <th className="py-2.5 px-3 font-semibold">Originating Desk &amp; Agent</th>
                <th className="py-2.5 px-3 font-semibold">Instrument &amp; Direction</th>
                <th className="py-2.5 px-3 font-semibold">Entry → Realized Exit</th>
                <th className="py-2.5 px-3 font-semibold">Execution Outcome</th>
                <th className="py-2.5 px-3 font-semibold text-right">Realized PnL</th>
                <th className="py-2.5 px-3 font-semibold text-right">Net Alpha vs Bench</th>
                <th className="py-2.5 px-3 font-semibold">Historical Attribution Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleBlotter.map((t) => (
                <tr key={t.ticketId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {t.ticketId}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {t.entryQuarter} → {t.exitQuarter}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {t.deskName}
                    </div>
                    <div className="text-[11px] text-slate-500">{t.originatingSubAgent}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      [{t.direction}] {t.instrument}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Weight: {t.sizingWeightPct}% NAV · {t.regimeContext}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div>
                      {t.entryLevel} → <strong>{t.realizedExitLevel}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Target: {t.targetLevel} | Stop: {t.stopLevel}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                    <span
                      className={
                        t.executionOutcome === 'TARGET_HIT'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : t.executionOutcome === 'CRO_STOP_SAVED'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {t.executionOutcome}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                      t.realizedPnlBps >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <div>
                      {t.realizedPnlBps >= 0 ? '+' : ''}
                      {t.realizedPnlBps} bps
                    </div>
                    <div className="text-[11px]">
                      ({t.realizedNavReturnPct >= 0 ? '+' : ''}
                      {t.realizedNavReturnPct}% NAV)
                    </div>
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                      t.netAlphaPct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <div>
                      {t.netAlphaPct >= 0 ? '+' : ''}
                      {t.netAlphaPct}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Bench: {t.benchmarkPeriodReturnPct >= 0 ? '+' : ''}
                      {t.benchmarkPeriodReturnPct}%
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                    {t.tradeThesisAudit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
