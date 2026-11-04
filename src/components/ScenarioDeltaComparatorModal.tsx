import React from 'react';
import {
  ForecastingShockInputs,
} from '../types/council';
import {
  ScenarioDeltaComparisonSuite,
  ScenarioSnapshotState,
} from '../utils/portfolioAndBacktestEngine';
import { LiveMacroSyncResult } from '../utils/macroLiveSyncService';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';
import {
  GitCompare,
  Pin,
  ArrowLeftRight,
  RotateCcw,
  X,
  RefreshCw,
  CheckCircle2,
  Database,
  Flame,
} from 'lucide-react';

interface ScenarioDeltaComparatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonSuite: ScenarioDeltaComparisonSuite;
  onPinCurrentAsScenarioA: () => void;
  onSwapScenarioAAndB: () => void;
  onResetToBaseline: () => void;
  onApplyPresetShockToLiveB: (label: string, shocks: ForecastingShockInputs) => void;
  liveSyncResult: LiveMacroSyncResult | null;
  isSyncingLiveMacro: boolean;
  onTriggerLiveMacroSync: () => void;
}

export const ScenarioDeltaComparatorDrawer: React.FC<ScenarioDeltaComparatorDrawerProps> = ({
  isOpen,
  onClose,
  comparisonSuite,
  onPinCurrentAsScenarioA,
  onSwapScenarioAAndB,
  onResetToBaseline,
  onApplyPresetShockToLiveB,
  liveSyncResult,
  isSyncingLiveMacro,
  onTriggerLiveMacroSync,
}) => {
  if (!isOpen) return null;

  const { scenarioA, scenarioB, rows, overallRegimeShiftHeadline } = comparisonSuite;

  return (
    <div className="bg-white dark:bg-slate-900 border-b-2 border-blue-600 dark:border-blue-500 px-6 py-5 shadow-lg">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Top Header & Quick Action Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <GitCompare className="w-3.5 h-3.5" />
              <span>CRO Side-by-Side Scenario A vs. Scenario B Delta Attribution &amp; Live API Provenance</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {scenarioB.countryName} ({scenarioB.iso3}): {scenarioA.label} vs. {scenarioB.label}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onPinCurrentAsScenarioA}
              className="ui-btn ui-btn-primary inline-flex"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pin Current State as Scenario A</span>
            </button>

            <button
              type="button"
              onClick={onSwapScenarioAAndB}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap A ↔ B</span>
            </button>

            <button
              type="button"
              onClick={onResetToBaseline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset B to Baseline</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
              <span>Close Drawer</span>
            </button>
          </div>
        </div>

        {/* Quick Stress Presets for Scenario B + Plain-English Regime Delta Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-950/90 p-3.5 border border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-7 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <strong className="text-blue-600 dark:text-blue-400">Delta Attribution Summary: </strong>
            <RichTextWithStatRefs text={overallRegimeShiftHeadline} />
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Test Scenario B Shock:</span>
            </span>
            <button
              type="button"
              onClick={() =>
                onApplyPresetShockToLiveB('Stagflation & Rate Spike (+250bp)', {
                  realRateShockBps: 250,
                  realGdpGrowthShockPct: -2.2,
                  primaryBalanceShockPctGdp: -1.8,
                  fxDepreciationShockPct: 22,
                  externalVolatilityMultiplier: 1.75,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100"
            >
              Stagflation +250bp
            </button>
            <button
              type="button"
              onClick={() =>
                onApplyPresetShockToLiveB('Sudden-Stop & FX Devaluation (+35%)', {
                  realRateShockBps: 380,
                  realGdpGrowthShockPct: -3.8,
                  primaryBalanceShockPctGdp: -2.6,
                  fxDepreciationShockPct: 35,
                  externalVolatilityMultiplier: 2.15,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100"
            >
              Sudden-Stop FX -35%
            </button>
            <button
              type="button"
              onClick={() =>
                onApplyPresetShockToLiveB('Orthodox Fiscal Consolidation (+1.8% GDP)', {
                  realRateShockBps: -110,
                  realGdpGrowthShockPct: 0.8,
                  primaryBalanceShockPctGdp: 1.8,
                  fxDepreciationShockPct: -6,
                  externalVolatilityMultiplier: 0.85,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
            >
              Fiscal Reform +1.8% GDP
            </button>
          </div>
        </div>

        {/* Side-by-Side Scenario A vs. Scenario B Delta Attribution Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3">Institutional Risk Metric</th>
                <th className="py-2.5 px-3 text-right">
                  Scenario A ({scenarioA.label} · {scenarioA.capturedAt})
                </th>
                <th className="py-2.5 px-3 text-right">
                  Scenario B ({scenarioB.label})
                </th>
                <th className="py-2.5 px-3 text-right">Net Delta (B − A)</th>
                <th className="py-2.5 px-3">Plain-English Meaning &amp; Interactive Statistical Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row) => {
                const isZero = Math.abs(row.delta) < 0.01;
                return (
                  <tr key={row.metricId} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {row.label}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {row.formattedScenarioA}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {row.formattedScenarioB}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-semibold tabular-nums ${
                        isZero
                          ? 'text-slate-400'
                          : row.isDeterioration
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      }`}
                    >
                      {row.formattedDelta}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-300">
                          {row.plainEnglishImpact}
                        </span>
                        <StatRefBadge refText={row.statRefString} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Live World Bank WDI v2 & US Treasury API Sync Provenance Strip */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Live World Bank WDI v2 &amp; US Treasury Fiscal Data API Telemetry Sync
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-2">
                  {liveSyncResult
                    ? `Last Synced: ${new Date(liveSyncResult.syncedAt).toLocaleTimeString()} · Status: ${liveSyncResult.syncStatus}`
                    : 'Ready to query live World Bank v2 & US Treasury REST endpoints with deterministic fallback'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onTriggerLiveMacroSync}
              disabled={isSyncingLiveMacro}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveMacro ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingLiveMacro
                  ? 'Syncing World Bank & Treasury APIs...'
                  : 'Sync Live World Bank & Treasury APIs'}
              </span>
            </button>
          </div>

          {liveSyncResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              {liveSyncResult.deltas.map((d) => (
                <div
                  key={d.indicatorCode}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs tabular-nums text-slate-500">
                    <span>{d.indicatorCode}</span>
                    <span
                      className={
                        d.isLiveApi
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {d.isLiveApi ? `Live (${d.observationYear})` : 'Fallback'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {d.label}
                  </div>
                  <div className="tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {d.liveValue}
                    {d.unit}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      (Base: {d.baselineValue}
                      {d.unit})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
