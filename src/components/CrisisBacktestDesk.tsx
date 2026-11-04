import React, { useEffect, useMemo, useState } from 'react';
import {
  CouncilAssessmentRun,
  ForecastingShockInputs,
} from '../types/council';
import {
  HISTORICAL_CRISIS_EPISODES,
  HistoricalCrisisEpisode,
  HistoricalCrisisEpisodeId,
} from '../utils/portfolioAndBacktestEngine';
import { StrategyBacktestEngine } from './StrategyBacktestEngine';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';
import {
  History,
  Play,
  SkipForward,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';

interface CrisisBacktestDeskProps {
  run: CouncilAssessmentRun;
  customEpisodes?: HistoricalCrisisEpisode[];
  initialSelectedEpisodeId?: HistoricalCrisisEpisodeId;
  onApplyHistoricalShocksToLiveDesk?: (
    episode: HistoricalCrisisEpisode,
    shocks: ForecastingShockInputs
  ) => void;
  onOpenCsvLab?: () => void;
}

export const CrisisBacktestDesk: React.FC<CrisisBacktestDeskProps> = ({
  run,
  customEpisodes = [],
  initialSelectedEpisodeId,
  onApplyHistoricalShocksToLiveDesk,
  onOpenCsvLab,
}) => {
  const allEpisodes = useMemo(
    () => [...customEpisodes, ...HISTORICAL_CRISIS_EPISODES],
    [customEpisodes]
  );

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<HistoricalCrisisEpisodeId>(
    initialSelectedEpisodeId ||
      (customEpisodes.length > 0 ? customEpisodes[0].id : 'ASIA_1997_TWIN_CRISIS')
  );
  const [activeStepIdx, setActiveStepIdx] = useState<number>(3);

  useEffect(() => {
    if (initialSelectedEpisodeId) {
      setSelectedEpisodeId(initialSelectedEpisodeId);
      const ep =
        allEpisodes.find((e) => e.id === initialSelectedEpisodeId) || allEpisodes[0];
      const alertStep = ep.timeline.findIndex((t) => t.isAlertTriggered);
      setActiveStepIdx(alertStep >= 0 ? alertStep : 0);
    }
  }, [initialSelectedEpisodeId, allEpisodes]);

  const activeEpisode = useMemo(
    () => allEpisodes.find((e) => e.id === selectedEpisodeId) || allEpisodes[0],
    [allEpisodes, selectedEpisodeId]
  );

  const clampedStepIdx = Math.min(
    activeEpisode.timeline.length - 1,
    Math.max(0, activeStepIdx)
  );
  const currentStep = activeEpisode.timeline[clampedStepIdx] || activeEpisode.timeline[0];

  const handleSelectEpisode = (id: HistoricalCrisisEpisodeId) => {
    setSelectedEpisodeId(id);
    const ep = allEpisodes.find((e) => e.id === id) || allEpisodes[0];
    const alertStep = ep.timeline.findIndex((t) => t.isAlertTriggered);
    setActiveStepIdx(alertStep >= 0 ? alertStep : 0);
  };

  // SVG Dual-Axis Trajectory Geometry (Markov Crisis Prob % vs. Realized Spread bps)
  const svgW = 700;
  const svgH = 235;
  const padL = 48;
  const padR = 54;
  const padT = 24;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const pts = activeEpisode.timeline;
  const maxSpread = Math.max(400, ...pts.map((p) => p.realizedSpreadBps)) * 1.1;

  const getX = (i: number) =>
    pts.length <= 1 ? padL + plotW / 2 : padL + (i / (pts.length - 1)) * plotW;
  const getYProb = (probPct: number) =>
    padT + plotH - (Math.min(100, Math.max(0, probPct)) / 100) * plotH;
  const getYSpread = (spreadBps: number) =>
    padT + plotH - (Math.min(maxSpread, Math.max(0, spreadBps)) / maxSpread) * plotH;

  const probPolyline = pts
    .map((p, i) => `${getX(i)},${getYProb(p.markovCrisisProbPct)}`)
    .join(' ');
  const spreadPolyline = pts
    .map((p, i) => `${getX(i)},${getYSpread(p.realizedSpreadBps)}`)
    .join(' ');
  const alertThresholdY = getYProb(35);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SECTION 1: HISTORICAL SOVEREIGN CRISIS REPLAY & EWS CALIBRATION ENGINE
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <History className="w-3.5 h-3.5" />
              <span>Out-of-Sample Institutional Model Validation · Historical Sovereign Crisis Replay &amp; Custom CSV Backtesting</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Historical Crisis Replay &amp; Early-Warning Signal (EWS) Calibration Engine
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenCsvLab && (
              <button
                type="button"
                onClick={onOpenCsvLab}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Upload Custom CSV Series in Policy Lab</span>
              </button>
            )}
            {onApplyHistoricalShocksToLiveDesk && (
              <button
                type="button"
                onClick={() =>
                  onApplyHistoricalShocksToLiveDesk(
                    activeEpisode,
                    activeEpisode.equivalentForecastShocks
                  )
                }
                className="ui-btn ui-btn-primary inline-flex shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  Apply &ldquo;{activeEpisode.eraLabel}&rdquo; Shock to Live {run.countryName} Desk
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Canonical + Custom CSV Crisis Episode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {allEpisodes.map((ep) => {
            const isSelected = ep.id === activeEpisode.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => handleSelectEpisode(ep.id)}
                className={`p-3.5 text-left border transition-colors flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/35 border-blue-600 dark:border-blue-500'
                    : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {ep.eraLabel}
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                      Lead: +{ep.earlyWarningLeadTimeMonths}m Early
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {ep.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {ep.archetypeTag}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs tabular-nums pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <span>AUROC: {ep.aurocScore.toFixed(2)}</span>
                  <span>NSR: {ep.noiseToSignalRatio.toFixed(2)}</span>
                  <span>Peak: {ep.peakSpreadBps}bp</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 5-KPI Model Calibration & EWS Validation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">ROC Curve Area (AUROC)</span>
            <span className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeEpisode.aurocScore.toFixed(2)} / 1.00
            </span>
            <span className="text-xs text-slate-400 block">
              Institutional Benchmark ≥ 0.82
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Noise-to-Signal Ratio (NSR)</span>
            <span className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {activeEpisode.noiseToSignalRatio.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 block">
              Kaminsky-Reinhart (FPR / TPR)
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Early-Warning Lead Time</span>
            <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {activeEpisode.earlyWarningLeadTimeMonths} Months Prior
            </span>
            <span className="text-xs text-slate-400 block">
              Crossed 35% Markov Alert Threshold
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Brier Skill Score (BSS)</span>
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              +{activeEpisode.brierSkillScore.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 block">
              vs. Naive Climatology Baseline
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Realized Peak Crisis Drawdown</span>
            <span className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {activeEpisode.peakSpreadBps} bps / {activeEpisode.peakFxDepreciationPct}% FX
            </span>
            <span className="text-xs text-slate-400 block">
              T=0 Regime Break Realization
            </span>
          </div>
        </div>

        {/* Interactive Month-by-Month Timeline Scrubber Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Replay Timeline Scrubber ({currentStep.monthOffsetLabel} · {currentStep.calendarDateLabel}):
              </span>
              <span
                className={`px-2 py-0.5 tabular-nums font-semibold text-xs ${
                  currentStep.isActualCrisisWindow
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    : currentStep.isAlertTriggered
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {currentStep.isActualCrisisWindow
                  ? 'Regime 2: acute crisis break'
                  : currentStep.isAlertTriggered
                  ? 'REGIME 1: EARLY WARNING ALERT ACTIVE (≥35%)'
                  : 'Regime 0: pre-alert build-up'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveStepIdx((prev) => Math.max(0, prev - 1))}
                disabled={clampedStepIdx === 0}
                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                ← Prev Step
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveStepIdx((prev) =>
                    prev >= activeEpisode.timeline.length - 1 ? 0 : prev + 1
                  )
                }
                className="ui-btn ui-btn-primary inline-flex"
              >
                <SkipForward className="w-3 h-3" />
                <span>Step Forward</span>
              </button>
            </div>
          </div>

          {/* Step Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-1.5">
            {activeEpisode.timeline.map((pt, idx) => {
              const isCurr = idx === clampedStepIdx;
              return (
                <button
                  key={pt.monthOffsetLabel}
                  type="button"
                  onClick={() => setActiveStepIdx(idx)}
                  className={`p-2 text-left border text-xs tabular-nums transition-colors ${
                    isCurr
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-semibold'
                      : pt.isActualCrisisWindow
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                      : pt.isAlertTriggered
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="truncate">{pt.monthOffsetLabel}</div>
                  <div className="text-xs opacity-80">{pt.calendarDateLabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual-Axis Trajectory Chart + Active Historical Timestamp Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Dual-Axis SVG Chart (Markov EWS Prob % vs Realized Sovereign Spread bps) */}
          <div className="lg:col-span-7 bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Model Markov Crisis Probability (%) vs. Realized Sovereign Credit Spread (bps)
              </span>
              <span className="tabular-nums text-xs text-amber-600 dark:text-amber-400">
                EWS Alert Threshold: 35.0%
              </span>
            </div>

            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 overflow-visible">
              {/* Horizontal Grid Lines (0%, 25%, 50%, 75%, 100% Prob) */}
              {[0, 25, 50, 75, 100].map((probVal) => {
                const y = getYProb(probVal);
                const eqSpread = Math.round((probVal / 100) * maxSpread);
                return (
                  <g key={probVal}>
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
                      x={padL - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-xs tabular-nums fill-blue-600 dark:fill-blue-400"
                    >
                      {probVal}%
                    </text>
                    <text
                      x={svgW - padR + 6}
                      y={y + 3}
                      textAnchor="start"
                      className="text-xs tabular-nums fill-rose-500"
                    >
                      {eqSpread}bp
                    </text>
                  </g>
                );
              })}

              {/* 35% Early-Warning Alert Threshold Line */}
              <line
                x1={padL}
                y1={alertThresholdY}
                x2={svgW - padR}
                y2={alertThresholdY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x={padL + 6}
                y={alertThresholdY - 5}
                className="text-xs tabular-nums fill-amber-600 dark:fill-amber-400 font-semibold"
              >
                35% EWS Crisis Alert Trigger (+{activeEpisode.earlyWarningLeadTimeMonths}m Lead Time)
              </text>

              {/* Realized Sovereign Spread Line (Red Dashed) */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.25"
                strokeDasharray="4 3"
                points={spreadPolyline}
              />

              {/* Model Markov Crisis Probability Line (Bold Blue) */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.75"
                points={probPolyline}
              />

              {/* Interactive Timestamp Nodes */}
              {pts.map((pt, i) => {
                const cx = getX(i);
                const cyProb = getYProb(pt.markovCrisisProbPct);
                const cySpread = getYSpread(pt.realizedSpreadBps);
                const isSelectedNode = i === clampedStepIdx;
                return (
                  <g
                    key={pt.monthOffsetLabel}
                    className="cursor-pointer"
                    onClick={() => setActiveStepIdx(i)}
                  >
                    {isSelectedNode && (
                      <line
                        x1={cx}
                        y1={padT}
                        x2={cx}
                        y2={padT + plotH}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cySpread}
                      r={isSelectedNode ? 5 : 3.5}
                      className="fill-rose-500"
                    />
                    <circle
                      cx={cx}
                      cy={cyProb}
                      r={isSelectedNode ? 6 : 4}
                      className={
                        pt.isAlertTriggered
                          ? 'fill-amber-500 stroke-white dark:stroke-slate-900 stroke-2'
                          : 'fill-blue-600 dark:fill-blue-400'
                      }
                    />
                    <text
                      x={cx}
                      y={svgH - 8}
                      textAnchor="middle"
                      className={`text-xs tabular-nums ${
                        isSelectedNode
                          ? 'fill-slate-900 dark:fill-white font-semibold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {pt.monthOffsetLabel.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Left Axis: Hamilton Markov Crisis Probability (%)
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-rose-500 inline-block" />
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    Right Axis: Realized 5Y Sovereign Spread (bps)
                  </span>
                </span>
              </div>
              <StatRefBadge
                refText={`Ref: AUROC = ${activeEpisode.aurocScore.toFixed(2)} · Noise-to-Signal Ratio NSR = ${activeEpisode.noiseToSignalRatio.toFixed(2)} · Brier Skill = +${activeEpisode.brierSkillScore.toFixed(2)} · Lead Time = +${activeEpisode.earlyWarningLeadTimeMonths} mos`}
              />
            </div>
          </div>

          {/* Right 5 Cols: Active Timestamp Diagnostic Card & Plain-English Narrative */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <span className="text-xs tabular-nums text-slate-500 block">
                    Snapshot at {currentStep.monthOffsetLabel} ({currentStep.calendarDateLabel})
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activeEpisode.countryOrRegionName}
                  </h4>
                </div>
                {currentStep.isAlertTriggered ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>EWS alert active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pre-threshold</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Historical Milestone:</strong> {currentStep.historicalMilestoneNote}
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs tabular-nums">
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-sans text-slate-500 block">
                    Markov Crisis Prob (EWS)
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {currentStep.markovCrisisProbPct.toFixed(1)}% (Z = +{currentStep.ewsCompositeZScore.toFixed(2)}σ)
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-sans text-slate-500 block">
                    Realized Spread &amp; FX
                  </span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {currentStep.realizedSpreadBps} bps / {currentStep.realizedFxDrawdownPct}%
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-sans text-slate-500 block">
                    IMF ARA Reserve Adequacy
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {currentStep.imfAraCoveragePct}% of Floor
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-sans text-slate-500 block">
                    Blanchard-Leeper Headroom
                  </span>
                  <span
                    className={`font-semibold ${
                      currentStep.fiscalDominanceHeadroomBps < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {currentStep.fiscalDominanceHeadroomBps >= 0 ? '+' : ''}
                    {currentStep.fiscalDominanceHeadroomBps} bps
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Plain-English Structural Diagnosis &amp; Early-Warning Proof
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <RichTextWithStatRefs text={activeEpisode.plainEnglishOverview} />
              </p>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                <RichTextWithStatRefs text={activeEpisode.structuralLesson} />
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <StatRefBadge
                  refText={`Statistical Reference: Hamilton Markov 12M Crisis Prob = ${currentStep.markovCrisisProbPct.toFixed(1)}% · Composite Z = +${currentStep.ewsCompositeZScore.toFixed(2)}σ · IMF ARA Reserve Adequacy = ${currentStep.imfAraCoveragePct}% · GaR(5%) = ${currentStep.gar5thPctGdp.toFixed(1)}% GDP`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: COUNCIL TRADE TICKET STRATEGY BACKTEST & ALPHA ATTRIBUTION
          ===================================================================== */}
      <StrategyBacktestEngine run={run} />
    </div>
  );
};
