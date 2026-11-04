import React, { useMemo, useState } from 'react';
import { toDisplayCase } from '../utils/displayCase';
import {
  CouncilAssessmentRun,
  ForecastingShockInputs,
  GeopoliticalWargameParams,
} from '../types/council';
import {
  DEFAULT_FORECAST_SHOCKS,
  computeFullEconometricForecastSuite,
} from '../utils/econometricForecastingEngine';
import {
  DEFAULT_WARGAME_PARAMS,
  computeGeopoliticalRiskDeskSuite,
} from '../utils/geopoliticalRiskEngine';
import { RotateCcw, Sliders, TrendingUp, Activity, AlertTriangle, Zap, ArrowUpRight } from 'lucide-react';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface StatisticalForecastingLabProps {
  run: CouncilAssessmentRun;
  propagatedGeoWargameParams?: GeopoliticalWargameParams;
  isGeoPropagationActive?: boolean;
  onOpenGeopoliticalDesk?: () => void;
  externalShocks?: ForecastingShockInputs;
  onChangeExternalShocks?: React.Dispatch<React.SetStateAction<ForecastingShockInputs>>;
}

export const StatisticalForecastingLab: React.FC<StatisticalForecastingLabProps> = ({
  run,
  propagatedGeoWargameParams = DEFAULT_WARGAME_PARAMS,
  isGeoPropagationActive = false,
  onOpenGeopoliticalDesk,
  externalShocks,
  onChangeExternalShocks,
}) => {
  const [localShocks, setLocalShocks] = useState<ForecastingShockInputs>(DEFAULT_FORECAST_SHOCKS);
  const shocks = externalShocks ?? localShocks;
  const setShocks = onChangeExternalShocks ?? setLocalShocks;
  const [selectedIrfVar, setSelectedIrfVar] = useState<
    'cds_5y_bps' | 'yield_10y_bps' | 'cpi_yoy_pct' | 'gdp_yoy_pct'
  >('cds_5y_bps');

  const geoSuite = useMemo(
    () => computeGeopoliticalRiskDeskSuite(run.openData, propagatedGeoWargameParams),
    [run.openData, propagatedGeoWargameParams]
  );

  const effectiveShocks: ForecastingShockInputs = useMemo(() => {
    if (!isGeoPropagationActive) return shocks;
    const g = geoSuite.portfolioTransmission.propagatedForecastShocks;
    return {
      realRateShockBps: shocks.realRateShockBps + g.realRateShockBps,
      realGdpGrowthShockPct: Number(
        (shocks.realGdpGrowthShockPct + g.realGdpGrowthShockPct).toFixed(2)
      ),
      primaryBalanceShockPctGdp: Number(
        (shocks.primaryBalanceShockPctGdp + g.primaryBalanceShockPctGdp).toFixed(2)
      ),
      fxDepreciationShockPct: shocks.fxDepreciationShockPct + g.fxDepreciationShockPct,
      externalVolatilityMultiplier: Number(
        Math.min(
          2.8,
          shocks.externalVolatilityMultiplier * g.externalVolatilityMultiplier
        ).toFixed(2)
      ),
    };
  }, [shocks, isGeoPropagationActive, geoSuite]);

  const suite = useMemo(
    () => computeFullEconometricForecastSuite(run.openData, effectiveShocks),
    [run.openData, effectiveShocks]
  );

  const {
    stochasticDsa,
    bvarIrf,
    garFarTail,
    nssTermStructure,
    markovEws,
    fiscalDominanceAndFxBurn,
    imfSrdsfGfn,
  } = suite;
  const activeIrfSeries =
    bvarIrf.series.find((s) => s.variableId === selectedIrfVar) || bvarIrf.series[0];

  const applyPresetScenario = (
    preset: 'baseline' | 'fiscal_slippage' | 'sudden_stop' | 'orthodox_reform'
  ) => {
    if (preset === 'baseline') {
      setShocks(DEFAULT_FORECAST_SHOCKS);
    } else if (preset === 'fiscal_slippage') {
      setShocks({
        realRateShockBps: 150,
        realGdpGrowthShockPct: -1.2,
        primaryBalanceShockPctGdp: -1.5,
        fxDepreciationShockPct: 12,
        externalVolatilityMultiplier: 1.35,
      });
    } else if (preset === 'sudden_stop') {
      setShocks({
        realRateShockBps: 275,
        realGdpGrowthShockPct: -2.5,
        primaryBalanceShockPctGdp: -2.0,
        fxDepreciationShockPct: 24,
        externalVolatilityMultiplier: 1.85,
      });
    } else if (preset === 'orthodox_reform') {
      setShocks({
        realRateShockBps: -100,
        realGdpGrowthShockPct: 1.1,
        primaryBalanceShockPctGdp: 1.5,
        fxDepreciationShockPct: 0,
        externalVolatilityMultiplier: 0.8,
      });
    }
  };

  // --- SVG GEOMETRY FOR MONTE CARLO FAN CHART ---
  const fanW = 560;
  const fanH = 220;
  const fanPadL = 44;
  const fanPadR = 24;
  const fanPadT = 18;
  const fanPadB = 28;
  const fanPlotW = fanW - fanPadL - fanPadR;
  const fanPlotH = fanH - fanPadT - fanPadB;

  const allFanVals = stochasticDsa.fanSeries.flatMap((p) => [
    p.p10,
    p.p95Extreme,
    p.distressThreshold,
  ]);
  const fanMinY = Math.max(10, Math.floor(Math.min(...allFanVals) * 0.9));
  const fanMaxY = Math.ceil(Math.max(...allFanVals) * 1.06);
  const fanRangeY = Math.max(10, fanMaxY - fanMinY);

  const getFanX = (i: number) =>
    fanPadL + (i / Math.max(1, stochasticDsa.fanSeries.length - 1)) * fanPlotW;
  const getFanY = (v: number) =>
    fanPadT + fanPlotH - ((v - fanMinY) / fanRangeY) * fanPlotH;

  const buildPolygonPoints = (
    upperGetter: (p: typeof stochasticDsa.fanSeries[0]) => number,
    lowerGetter: (p: typeof stochasticDsa.fanSeries[0]) => number
  ) => {
    const topPts = stochasticDsa.fanSeries.map(
      (p, i) => `${getFanX(i)},${getFanY(upperGetter(p))}`
    );
    const botPts = [...stochasticDsa.fanSeries]
      .reverse()
      .map((p, revIdx) => {
        const origIdx = stochasticDsa.fanSeries.length - 1 - revIdx;
        return `${getFanX(origIdx)},${getFanY(lowerGetter(p))}`;
      });
    return [...topPts, ...botPts].join(' ');
  };

  const poly10To95 = buildPolygonPoints(
    (p) => p.p95Extreme,
    (p) => p.p10
  );
  const poly25To90 = buildPolygonPoints(
    (p) => p.p90,
    (p) => p.p25
  );
  const poly25To75 = buildPolygonPoints(
    (p) => p.p75,
    (p) => p.p25
  );
  const medianLinePts = stochasticDsa.fanSeries
    .map((p, i) => `${getFanX(i)},${getFanY(p.p50Median)}`)
    .join(' ');
  const baselineLinePts = stochasticDsa.fanSeries
    .map((p, i) => `${getFanX(i)},${getFanY(p.deterministicBaseline)}`)
    .join(' ');
  const thresholdLineY = getFanY(stochasticDsa.distressThresholdPctGdp);

  // --- SVG GEOMETRY FOR BVAR IMPULSE RESPONSE ---
  const irfPoints = activeIrfSeries.horizonPoints;
  const allIrfVals = irfPoints.flatMap((p) => [p.lower95, p.upper95, 0]);
  const irfMin = Math.min(...allIrfVals) * 1.1;
  const irfMax = Math.max(...allIrfVals) * 1.1 || 10;
  const irfRange = Math.max(1e-3, irfMax - irfMin);

  const getIrfX = (i: number) =>
    fanPadL + (i / Math.max(1, irfPoints.length - 1)) * fanPlotW;
  const getIrfY = (v: number) =>
    fanPadT + fanPlotH - ((v - irfMin) / irfRange) * fanPlotH;

  const irfPoly95 = [
    ...irfPoints.map((p, i) => `${getIrfX(i)},${getIrfY(p.upper95)}`),
    ...[...irfPoints]
      .reverse()
      .map((p, revIdx) => {
        const idx = irfPoints.length - 1 - revIdx;
        return `${getIrfX(idx)},${getIrfY(p.lower95)}`;
      }),
  ].join(' ');

  const irfPoly68 = [
    ...irfPoints.map((p, i) => `${getIrfX(i)},${getIrfY(p.upper68)}`),
    ...[...irfPoints]
      .reverse()
      .map((p, revIdx) => {
        const idx = irfPoints.length - 1 - revIdx;
        return `${getIrfX(idx)},${getIrfY(p.lower68)}`;
      }),
  ].join(' ');

  const irfMeanLine = irfPoints
    .map((p, i) => `${getIrfX(i)},${getIrfY(p.meanResponse)}`)
    .join(' ');
  const irfZeroY = getIrfY(0);

  // --- SVG GEOMETRY FOR GROWTH-AT-RISK (GaR) TAIL DENSITY ---
  const densPts = garFarTail.gdpDensityCurve;
  const getDensX = (i: number) =>
    fanPadL + (i / Math.max(1, densPts.length - 1)) * fanPlotW;
  const getDensY = (d: number) => fanPadT + fanPlotH - d * (fanPlotH * 0.88);

  const baselineDensityLine = densPts
    .map((p, i) => `${getDensX(i)},${getDensY(p.baselineDensity)}`)
    .join(' ');
  const stressedDensityLine = densPts
    .map((p, i) => `${getDensX(i)},${getDensY(p.stressedDensity)}`)
    .join(' ');

  const tailPts = densPts
    .map((p, i) => ({ ...p, idx: i }))
    .filter((p) => p.isTailZone);
  const tailPolygon =
    tailPts.length > 0
      ? [
          `${getDensX(tailPts[0].idx)},${fanPadT + fanPlotH}`,
          ...tailPts.map((p) => `${getDensX(p.idx)},${getDensY(p.stressedDensity)}`),
          `${getDensX(tailPts[tailPts.length - 1].idx)},${fanPadT + fanPlotH}`,
        ].join(' ')
      : '';

  // --- SVG GEOMETRY FOR NELSON-SIEGEL-SVENSSON FORWARD CURVE ---
  const nssPts = nssTermStructure.points;
  const allNssVals = nssPts.flatMap((p) => [
    p.spotYieldPct,
    p.forward1Y1YYieldPct,
    p.expectedPolicyRatePathPct,
  ]);
  const nssMin = Math.floor(Math.min(...allNssVals) * 0.9);
  const nssMax = Math.ceil(Math.max(...allNssVals) * 1.08);
  const nssRange = Math.max(2, nssMax - nssMin);
  const getNssX = (i: number) =>
    fanPadL + (i / Math.max(1, nssPts.length - 1)) * fanPlotW;
  const getNssY = (v: number) =>
    fanPadT + fanPlotH - ((v - nssMin) / nssRange) * fanPlotH;

  const nssSpotLine = nssPts
    .map((p, i) => `${getNssX(i)},${getNssY(p.spotYieldPct)}`)
    .join(' ');
  const nssFwd1YLine = nssPts
    .map((p, i) => `${getNssX(i)},${getNssY(p.forward1Y1YYieldPct)}`)
    .join(' ');
  const nssPolicyLine = nssPts
    .map((p, i) => `${getNssX(i)},${getNssY(p.expectedPolicyRatePathPct)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* TOP INTERACTIVE ECONOMETRIC SHOCK & PARAMETER CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <span>Forward-Looking Econometric &amp; Statistical Forecasting Lab</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Live 1,000-Path Monte Carlo, BVAR Impulse Responses, GaR/FaR Tail Density &amp; Nelson-Siegel Curve</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Interactive Stochastic &amp; Econometric Forecasting Engine ({run.countryName})
            </h2>
          </div>

          {/* Preset Scenario Quick-Triggers */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetScenario('baseline')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Baseline WEO Path</span>
            </button>
            <button
              type="button"
              onClick={() => applyPresetScenario('fiscal_slippage')}
              className="px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              Stagflationary Fiscal Slippage
            </button>
            <button
              type="button"
              onClick={() => applyPresetScenario('sudden_stop')}
              className="px-3 py-1.5 text-xs font-medium text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
            >
              Hard-Currency Sudden Stop
            </button>
            <button
              type="button"
              onClick={() => applyPresetScenario('orthodox_reform')}
              className="px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
            >
              Orthodox Fiscal Consolidation
            </button>
          </div>
        </div>

        {/* GEOPOLITICAL WARGAME PROPAGATION BANNER */}
        {isGeoPropagationActive && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Geopolitical Wargame Shock Overlay Active:</strong> Injecting +
                {geoSuite.portfolioTransmission.propagatedForecastShocks.realRateShockBps} bps real rate,{' '}
                {geoSuite.portfolioTransmission.propagatedForecastShocks.realGdpGrowthShockPct}% GDP drag,{' '}
                {geoSuite.portfolioTransmission.propagatedForecastShocks.primaryBalanceShockPctGdp}% primary balance slippage, and +
                {geoSuite.portfolioTransmission.propagatedForecastShocks.fxDepreciationShockPct}% FX shock into the 1,000-Path Debt Fan Chart.
              </span>
            </div>
            {onOpenGeopoliticalDesk && (
              <button
                type="button"
                onClick={onOpenGeopoliticalDesk}
                className="ui-btn ui-btn-primary inline-flex shrink-0"
              >
                <span>Adjust Geopolitical Wargame</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 5 Live Interactive Econometric Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Real Interest Rate (Δr)
              </label>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {shocks.realRateShockBps >= 0 ? '+' : ''}
                {shocks.realRateShockBps} bps
              </span>
            </div>
            <input
              type="range"
              min="-200"
              max="400"
              step="25"
              value={shocks.realRateShockBps}
              onChange={(e) =>
                setShocks((prev) => ({
                  ...prev,
                  realRateShockBps: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-xs text-slate-500 mt-1">
              Base r: {run.openData.dsaAnalytics.effectiveRealInterestRatePct.toFixed(1)}%
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Real GDP Growth (Δg)
              </label>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {shocks.realGdpGrowthShockPct >= 0 ? '+' : ''}
                {shocks.realGdpGrowthShockPct.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="3.0"
              step="0.2"
              value={shocks.realGdpGrowthShockPct}
              onChange={(e) =>
                setShocks((prev) => ({
                  ...prev,
                  realGdpGrowthShockPct: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-xs text-slate-500 mt-1">
              Base g: +{run.openData.imfIndicators.realGdpGrowthPct.toFixed(1)}% YoY
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Primary Balance (Δpb)
              </label>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {shocks.primaryBalanceShockPctGdp >= 0 ? '+' : ''}
                {shocks.primaryBalanceShockPctGdp.toFixed(1)}% GDP
              </span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="3.0"
              step="0.25"
              value={shocks.primaryBalanceShockPctGdp}
              onChange={(e) =>
                setShocks((prev) => ({
                  ...prev,
                  primaryBalanceShockPctGdp: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-xs text-slate-500 mt-1">
              Base pb: {run.openData.imfIndicators.primaryFiscalBalancePct.toFixed(1)}% GDP
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                FX Depreciation (Δe)
              </label>
              <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                +{shocks.fxDepreciationShockPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="5"
              value={shocks.fxDepreciationShockPct}
              onChange={(e) =>
                setShocks((prev) => ({
                  ...prev,
                  fxDepreciationShockPct: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-amber-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              FX Debt Reval: +{stochasticDsa.foreignCurrencyRevaluationImpactPctGdp}% GDP
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Volatility Regime (σ)
              </label>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {shocks.externalVolatilityMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.2"
              step="0.1"
              value={shocks.externalVolatilityMultiplier}
              onChange={(e) =>
                setShocks((prev) => ({
                  ...prev,
                  externalVolatilityMultiplier: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-xs text-slate-500 mt-1">
              Scales Monte Carlo &amp; BVAR dispersion
            </div>
          </div>
        </div>
      </div>

      {/* ROW 1: ENGINE 1 (STOCHASTIC DEBT FAN CHART) + ENGINE 2 (BVAR IMPULSE RESPONSE FUNCTIONS) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ENGINE 1: STOCHASTIC DEBT SUSTAINABILITY FAN CHART (2025-2030) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Stochastic Debt Sustainability Analysis (IMF SRDSF Monte Carlo)
              </span>
              <span className="tabular-nums">
                {stochasticDsa.pathsSimulated.toLocaleString()} Correlated Paths · 2025–2030
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2 leading-snug text-balance">
              <RichTextWithStatRefs text={stochasticDsa.conclusionHeadline} />
            </h3>

            {/* Key Percentiles Strip */}
            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">2030 Median (P50)</span>
                <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {stochasticDsa.medianDebt2030PctGdp}% GDP
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">2030 Tail (P95)</span>
                <span className="tabular-nums font-semibold text-sm text-rose-600 dark:text-rose-400">
                  {stochasticDsa.p95Debt2030PctGdp}% GDP
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Distress Prob (≥{stochasticDsa.distressThresholdPctGdp}%)</span>
                <span
                  className={`tabular-nums font-semibold text-sm tabular-nums ${
                    stochasticDsa.probabilityOfDistress2030Pct >= 50
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {stochasticDsa.probabilityOfDistress2030Pct}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">FX Debt Reval Effect</span>
                <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                  +{stochasticDsa.foreignCurrencyRevaluationImpactPctGdp}% GDP
                </span>
              </div>
            </div>
          </div>

          {/* Monte Carlo Fan Chart SVG */}
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50">
            <svg viewBox={`0 0 ${fanW} ${fanH}`} className="w-full h-48 overflow-visible">
              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const y = fanPadT + t * fanPlotH;
                const val = fanMaxY - t * fanRangeY;
                return (
                  <g key={idx}>
                    <line
                      x1={fanPadL}
                      y1={y}
                      x2={fanW - fanPadR}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={fanPadL - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-xs tabular-nums fill-slate-400"
                    >
                      {val.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* 10th to 95th Percentile Outer Fan Band */}
              <polygon
                points={poly10To95}
                className="fill-blue-500/15 dark:fill-blue-400/15"
              />
              {/* 25th to 90th Percentile Mid Fan Band */}
              <polygon
                points={poly25To90}
                className="fill-blue-500/25 dark:fill-blue-400/25"
              />
              {/* 25th to 75th Interquartile Core Fan Band */}
              <polygon
                points={poly25To75}
                className="fill-blue-600/35 dark:fill-blue-500/35"
              />

              {/* IMF Distress Threshold Line */}
              <line
                x1={fanPadL}
                y1={thresholdLineY}
                x2={fanW - fanPadR}
                y2={thresholdLineY}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={fanW - fanPadR - 4}
                y={Math.max(12, thresholdLineY - 5)}
                textAnchor="end"
                className="text-xs tabular-nums fill-rose-500 font-semibold"
              >
                Distress Threshold ({stochasticDsa.distressThresholdPctGdp}% GDP)
              </text>

              {/* Deterministic Unshocked WEO Baseline (Dashed) */}
              <polyline
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                points={baselineLinePts}
              />

              {/* Shocked Median Trajectory (Solid Bold) */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points={medianLinePts}
              />

              {/* Year Labels & Median Nodes */}
              {stochasticDsa.fanSeries.map((p, i) => (
                <g key={p.year}>
                  <circle
                    cx={getFanX(i)}
                    cy={getFanY(p.p50Median)}
                    r={3.5}
                    className="fill-blue-600 dark:fill-blue-400"
                  />
                  <text
                    x={getFanX(i)}
                    y={fanH - 8}
                    textAnchor="middle"
                    className="text-xs tabular-nums fill-slate-500 dark:fill-slate-400"
                  >
                    {p.year}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">What This Shows in Plain English:</strong> Simulates 1,000 possible futures for government debt through 2030 if interest rates, economic growth, the budget, and the currency all move together.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> Single-line forecasts hide worst-case risks—when a country owes money in US dollars, a drop in the local currency makes that foreign debt jump overnight at the exact same time growth slows down.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Warning Sign &amp; Action:</strong> If the chance of crossing the danger line tops 35% (or worst-case debt exceeds {stochasticDsa.distressThresholdPctGdp + 10}% of GDP), sell long-term local bonds and shift into 2s10s steepeners.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Celasun-Debrun-Ostry Stochastic DSA (N=1,000 Cholesky Paths) · Median 2030 = ${stochasticDsa.medianDebt2030PctGdp}% GDP · P95 Tail = ${stochasticDsa.p95Debt2030PctGdp}% GDP · Distress Prob = ${stochasticDsa.probabilityOfDistress2030Pct}%`}
              />
            </div>
          </div>
        </div>

        {/* ENGINE 2: BAYESIAN VAR (BVAR) 8-QUARTER IMPULSE RESPONSE FUNCTIONS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Bayesian VAR (BVAR) Impulse Response Functions (Q+1 to Q+8)
              </span>
              {/* Variable Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5">
                {[
                  { id: 'cds_5y_bps', label: '5Y CDS (bps)' },
                  { id: 'yield_10y_bps', label: '10Y Yield (bps)' },
                  { id: 'cpi_yoy_pct', label: 'CPI (% YoY)' },
                  { id: 'gdp_yoy_pct', label: 'Real GDP (%)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedIrfVar(tab.id as any)}
                    className={`px-2 py-1 text-xs tabular-nums font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedIrfVar === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 '
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2 leading-snug text-balance">
              <RichTextWithStatRefs text={bvarIrf.conclusionHeadline} />
            </h3>

            {/* 4-Variable Peak Response Summary */}
            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              {bvarIrf.series.map((s) => (
                <div key={s.variableId}>
                  <span className="text-slate-500 block truncate">
                    Peak {s.variableId === 'cds_5y_bps' ? '5Y CDS' : s.variableId === 'yield_10y_bps' ? '10Y Yield' : s.variableId === 'cpi_yoy_pct' ? 'Headline CPI' : 'Real GDP'} ({s.peakQuarter})
                  </span>
                  <span
                    className={`tabular-nums font-semibold text-sm tabular-nums ${
                      s.variableId === 'gdp_yoy_pct'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {s.peakImpact >= 0 ? '+' : ''}
                    {s.peakImpact} {s.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BVAR IRF SVG Chart */}
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50">
            <svg viewBox={`0 0 ${fanW} ${fanH}`} className="w-full h-48 overflow-visible">
              {/* Zero Baseline */}
              <line
                x1={fanPadL}
                y1={irfZeroY}
                x2={fanW - fanPadR}
                y2={irfZeroY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* 95% Credible Band */}
              <polygon
                points={irfPoly95}
                className="fill-amber-500/15 dark:fill-amber-400/15"
              />
              {/* 68% Credible Band */}
              <polygon
                points={irfPoly68}
                className="fill-amber-500/30 dark:fill-amber-400/30"
              />

              {/* Mean Impulse Response Line */}
              <polyline
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                points={irfMeanLine}
              />

              {irfPoints.map((p, i) => (
                <g key={p.quarterLabel}>
                  <circle
                    cx={getIrfX(i)}
                    cy={getIrfY(p.meanResponse)}
                    r={3.5}
                    className="fill-amber-600 dark:fill-amber-400"
                  />
                  <text
                    x={getIrfX(i)}
                    y={getIrfY(p.meanResponse) - 8}
                    textAnchor="middle"
                    className="text-xs tabular-nums fill-slate-700 dark:fill-slate-200"
                  >
                    {p.meanResponse >= 0 ? '+' : ''}
                    {p.meanResponse}
                  </text>
                  <text
                    x={getIrfX(i)}
                    y={fanH - 8}
                    textAnchor="middle"
                    className="text-xs tabular-nums fill-slate-500 dark:fill-slate-400"
                  >
                    {p.quarterLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">What This Shows in Plain English:</strong> Tracks quarter by quarter (over the next 2 years) how a sudden economic shock ripples through bond yields, default insurance costs, inflation, and GDP growth.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> Financial stress rarely hits all at once on day one—the worst damage usually builds up and peaks around quarter {activeIrfSeries.peakQuarter} before slowly fading over {activeIrfSeries.halfLifeQuarters} quarters.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Warning Sign &amp; Action:</strong> Time your portfolio hedges to cover the {activeIrfSeries.peakQuarter} peak danger window, then begin taking profits on protection once the shock fades past Q+5.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Structural Bayesian VAR (Cholesky AR(2) Kernel, 68%/95% Credible Bands) · Peak ${activeIrfSeries.variableId} = ${activeIrfSeries.peakImpact >= 0 ? '+' : ''}${activeIrfSeries.peakImpact} ${activeIrfSeries.unit} (${activeIrfSeries.peakQuarter}) · Half-Life = ${activeIrfSeries.halfLifeQuarters}Q`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: ENGINE 3 (GROWTH-AT-RISK & FISCAL-AT-RISK TAIL DENSITY) + ENGINE 4 (NELSON-SIEGEL FORWARD CURVE) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ENGINE 3: IMF GROWTH-AT-RISK (GaR 5%) & FISCAL-AT-RISK (FaR 95%) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                IMF-Standard Growth-at-Risk (GaR 5%) &amp; Fiscal-at-Risk (FaR 95%)
              </span>
              <span className="tabular-nums">12M Forward Quantile Regression Density</span>
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2 leading-snug text-balance">
              <RichTextWithStatRefs text={garFarTail.conclusionHeadline} />
            </h3>

            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Mean GDP Forecast</span>
                <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {garFarTail.gdpMeanForecastPct >= 0 ? '+' : ''}
                  {garFarTail.gdpMeanForecastPct}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">5th-Pct Left Tail (GaR)</span>
                <span className="tabular-nums font-semibold text-sm text-rose-600 dark:text-rose-400">
                  {garFarTail.gdpGar5thPercentilePct}% YoY
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">12M Recession Prob</span>
                <span className="tabular-nums font-semibold text-sm text-amber-600 dark:text-amber-400">
                  {garFarTail.recessionProbabilityPct}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">95th-Pct Fiscal-at-Risk</span>
                <span className="tabular-nums font-semibold text-sm text-rose-600 dark:text-rose-400">
                  {garFarTail.fiscalFar95thDeficitPctGdp}% GDP
                </span>
              </div>
            </div>
          </div>

          {/* GaR Density Curve SVG */}
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50">
            <svg viewBox={`0 0 ${fanW} ${fanH}`} className="w-full h-48 overflow-visible">
              {/* Shaded 5th-Percentile Left Tail Zone */}
              {tailPolygon && (
                <polygon
                  points={tailPolygon}
                  className="fill-rose-500/35 dark:fill-rose-500/40"
                />
              )}

              {/* Baseline Unshocked Density Curve (Dashed) */}
              <polyline
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                points={baselineDensityLine}
              />

              {/* Stressed Conditional Density Curve */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                points={stressedDensityLine}
              />

              {/* X-Axis Labels */}
              {densPts
                .filter((_, idx) => idx % 4 === 0)
                .map((p) => {
                  const origIdx = densPts.findIndex((d) => d.xValue === p.xValue);
                  return (
                    <text
                      key={p.xValue}
                      x={getDensX(origIdx)}
                      y={fanH - 8}
                      textAnchor="middle"
                      className="text-xs tabular-nums fill-slate-500 dark:fill-slate-400"
                    >
                      {p.xValue >= 0 ? `+${p.xValue}%` : `${p.xValue}%`}
                    </text>
                  );
                })}
            </svg>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">What This Shows in Plain English:</strong> Shows the full range of best-case to worst-case economic growth over the next 12 months, highlighting the red 5% worst-case recession zone on the left.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> When interest rates rise and the currency weakens, the risk of a severe recession grows much faster than average Wall Street forecasts suggest.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Warning Sign &amp; Action:</strong> When the worst-5% growth forecast drops below −1.5% (or recession odds top 35%), cut exposure to local stocks and add US dollar call options.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Adrian-Boyarchenko-Giannone Quantile Regression · GaR(5%) = ${garFarTail.gdpGar5thPercentilePct}% YoY · FaR(95%) = ${garFarTail.fiscalFar95thDeficitPctGdp}% GDP · Pr(GDP < 0) = ${garFarTail.recessionProbabilityPct}%`}
              />
            </div>
          </div>
        </div>

        {/* ENGINE 4: NELSON-SIEGEL-SVENSSON (NSS) 1Y/2Y IMPLIED FORWARD YIELD CURVE & TERM PREMIUM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Nelson-Siegel-Svensson (NSS) Forward Curve &amp; Term Premium
              </span>
              <span className="tabular-nums">
                β₀={nssTermStructure.beta0Level}% · β₁={nssTermStructure.beta1Slope}% · β₂={nssTermStructure.beta2Curvature}%
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2 leading-snug text-balance">
              <RichTextWithStatRefs text={nssTermStructure.conclusionHeadline} />
            </h3>

            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">10Y Fiscal Term Premium</span>
                <span className="tabular-nums font-semibold text-sm text-amber-600 dark:text-amber-400">
                  {nssTermStructure.tenYearTermPremiumBps >= 0 ? '+' : ''}
                  {nssTermStructure.tenYearTermPremiumBps} bps
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">1Y Implied Policy Δ</span>
                <span className="tabular-nums font-semibold text-sm text-blue-600 dark:text-blue-400">
                  {nssTermStructure.implied1YPolicyRateDeltaBps >= 0 ? '+' : ''}
                  {nssTermStructure.implied1YPolicyRateDeltaBps} bps
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Long-Run Level (β₀)</span>
                <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {nssTermStructure.beta0Level}%
                </span>
              </div>
            </div>
          </div>

          {/* NSS Forward Curve SVG */}
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50">
            <svg viewBox={`0 0 ${fanW} ${fanH}`} className="w-full h-48 overflow-visible">
              {/* Expected Policy Rate Path (Dashed Emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.75"
                strokeDasharray="4 4"
                points={nssPolicyLine}
              />
              {/* 1Y-Forward Implied Curve (Amber) */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={nssFwd1YLine}
              />
              {/* Spot Yield Curve (Solid Blue) */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points={nssSpotLine}
              />

              {nssPts.map((p, i) => (
                <g key={p.tenor}>
                  <circle
                    cx={getNssX(i)}
                    cy={getNssY(p.spotYieldPct)}
                    r={3.5}
                    className="fill-blue-600 dark:fill-blue-400"
                  />
                  <text
                    x={getNssX(i)}
                    y={getNssY(p.spotYieldPct) - 8}
                    textAnchor="middle"
                    className="text-xs tabular-nums fill-slate-700 dark:fill-slate-200"
                  >
                    {p.spotYieldPct.toFixed(1)}%
                  </text>
                  <text
                    x={getNssX(i)}
                    y={fanH - 8}
                    textAnchor="middle"
                    className="text-xs tabular-nums fill-slate-500 dark:fill-slate-400"
                  >
                    {p.tenor} ({p.sovereignTermPremiumBps >= 0 ? `+${p.sovereignTermPremiumBps}` : p.sovereignTermPremiumBps}bp TP)
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">What This Shows in Plain English:</strong> Splits government bond yields (blue line) into two parts: what investors expect the Central Bank to do with interest rates (dashed green line) versus the extra compensation investors demand for budget risk.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> Tells you whether 10-year bond yields are high because the Central Bank is fighting inflation (which helps short-term bonds) or because investors are worried about government debt.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Warning Sign &amp; Action:</strong> When the extra 10-year risk premium exceeds +180 bps while 1-year forward rates price in rate cuts, bet on lower 2-year rates and higher 10-year yields (2s10s steepener).
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Nelson-Siegel-Svensson (τ=2.2) · β₀(Level)=${nssTermStructure.beta0Level}% · β₁(Slope)=${nssTermStructure.beta1Slope}% · β₂(Curvature)=${nssTermStructure.beta2Curvature}% · 10Y Term Premium = ${nssTermStructure.tenYearTermPremiumBps >= 0 ? '+' : ''}${nssTermStructure.tenYearTermPremiumBps} bps`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: ENGINE 5 — MARKOV-SWITCHING REGIME TRANSITION MATRIX & KAMINSKY-REINHART EARLY-WARNING Z-SCORE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Markov-Switching Regime Transition Matrix &amp; Kaminsky-Reinhart Early-Warning Signal (EWS)
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>12-Month Forward Regime Switching &amp; Multi-Indicator Z-Score Audit</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1 text-balance">
              <RichTextWithStatRefs text={markovEws.conclusionHeadline} />
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block text-xs">Composite Crisis Z-Score</span>
              <span
                className={`font-semibold text-sm ${
                  markovEws.compositeCrisisZScore >= 1.65
                    ? 'text-rose-600 dark:text-rose-400'
                    : markovEws.compositeCrisisZScore >= 0.85
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {markovEws.compositeCrisisZScore >= 0 ? '+' : ''}
                {markovEws.compositeCrisisZScore}σ (1.65σ Alert)
              </span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block text-xs">12M Crisis Transition Prob</span>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {markovEws.crisisProbability12MPct}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 3x3 Markov Regime Transition Matrix */}
          <div className="lg:col-span-6 space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              12-Month Markov-Switching Regime Transition Probability Matrix (P_ij)
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">From Current Regime (t)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">→ Carry (t+12M)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">→ Fiscal Dom (t+12M)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">→ Sudden Stop (t+12M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {markovEws.transitionMatrix.map((row) => (
                    <tr key={row.fromRegime} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                        {row.fromRegime}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {row.toCarryPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-semibold">
                        {row.toFiscalDominancePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {row.toSuddenStopPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: 5-Factor Kaminsky-Reinhart Early Warning Z-Score Breakdown */}
          <div className="lg:col-span-6 space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Kaminsky-Reinhart Crisis Early-Warning Indicator Z-Scores (Threshold: +1.65σ)
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3 font-semibold">Early-Warning Indicator</th>
                    <th className="py-2 px-3 font-semibold text-right">Reading</th>
                    <th className="py-2 px-3 font-semibold text-right">Z-Score</th>
                    <th className="py-2 px-3 font-semibold text-right">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {markovEws.ewsFactors.map((f) => (
                    <tr key={f.factorName}>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {f.factorName}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {f.currentReading}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {f.zScore >= 0 ? '+' : ''}
                        {f.zScore}σ
                      </td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums font-semibold ${
                          f.status === 'CRISIS_ALERT'
                            ? 'text-rose-600 dark:text-rose-400'
                            : f.status === 'WATCH'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {toDisplayCase(f.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Plain-English Guide & Statistical Reference */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-900 dark:text-slate-100">What This Shows in Plain English:</strong> Combines five early-warning gauges into a single crisis alarm score and calculates the odds that the economy shifts from calm markets into an acute funding crisis over the next year.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-100">Why It Matters:</strong> Emerging-market crises happen suddenly once a tipping point is crossed—when two or more warning gauges flash red (+1.65σ) at the same time, investor outflows accelerate rapidly.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-100">Warning Sign &amp; Action:</strong> When the overall alarm score reaches +1.65σ or higher, switch immediately to defensive hedges and cap unhedged local bond holdings at 5% of the portfolio.
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <StatRefBadge
              refText={`Statistical Reference: Hamilton (1989) 3-State Markov Chain + Kaminsky-Reinhart EWS · Composite Z = ${markovEws.compositeCrisisZScore >= 0 ? '+' : ''}${markovEws.compositeCrisisZScore}σ (Alert = +1.65σ) · 12M Crisis Prob = ${markovEws.crisisProbability12MPct}%`}
            />
          </div>
        </div>
      </div>

      {/* ROW 4: BLANCHARD-LEEPER FISCAL DOMINANCE FRONTIER & IMF SRDSF GROSS FINANCING NEEDS (GFN) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 6. Blanchard-Leeper Fiscal Dominance Frontier & FXI Burn-Rate Clock */}
        <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Engine 6 · Blanchard (2004) / Leeper (1991) Monetary-Fiscal Nexus &amp; Reserve Depletion
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Blanchard-Leeper Fiscal Dominance Frontier &amp; FXI Burn Clock
                </h3>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Reversal Threshold r* / Headroom
                </div>
                <div
                  className={`text-sm font-semibold ${
                    fiscalDominanceAndFxBurn.isFiscalDominanceActive
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}% (
                  {fiscalDominanceAndFxBurn.policyRateHeadroomBps >= 0 ? '+' : ''}
                  {fiscalDominanceAndFxBurn.policyRateHeadroomBps} bps)
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-l-2 border-blue-600 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <RichTextWithStatRefs text={fiscalDominanceAndFxBurn.conclusionHeadline} />
            </div>

            {/* 4 Key KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Floating/1Y Debt Share
                </span>
                <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {fiscalDominanceAndFxBurn.floatingShortDebtSharePct}%
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  +100bp Hike Fiscal Cost
                </span>
                <span className="tabular-nums font-semibold text-sm text-amber-600 dark:text-amber-400">
                  +{fiscalDominanceAndFxBurn.annualFiscalCostPer100BpsPctGdp}% GDP
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  FXI Burn Velocity
                </span>
                <span className="tabular-nums font-semibold text-sm text-rose-600 dark:text-rose-400">
                  ${fiscalDominanceAndFxBurn.monthlyFxiBurnRateUsdBn}B / mo
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Clock to 100% ARA Floor
                </span>
                <span
                  className={`tabular-nums font-semibold text-sm tabular-nums ${
                    fiscalDominanceAndFxBurn.monthsToAraBreach <= 6
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {fiscalDominanceAndFxBurn.monthsToAraBreach} Months
                </span>
              </div>
            </div>

            {/* Policy Rate vs Inflation Pass-Through Reversal Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3 font-semibold">Candidate Policy Rate</th>
                    <th className="py-2 px-3 font-semibold text-right">Fiscal Interest Δ (% GDP)</th>
                    <th className="py-2 px-3 font-semibold text-right">Net CPI Pass-Through</th>
                    <th className="py-2 px-3 font-semibold text-right">Monetary-Fiscal Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {fiscalDominanceAndFxBurn.frontierCurve.map((pt) => (
                    <tr
                      key={pt.policyRatePct}
                      className={
                        Math.abs(pt.policyRatePct - fiscalDominanceAndFxBurn.currentPolicyRatePct) <= 1.1
                          ? 'bg-blue-50/60 dark:bg-blue-950/25'
                          : ''
                      }
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {pt.policyRatePct.toFixed(1)}%
                        {Math.abs(pt.policyRatePct - fiscalDominanceAndFxBurn.currentPolicyRatePct) <= 1.1 && (
                          <span className="ml-1.5 text-xs font-sans font-semibold text-blue-600 dark:text-blue-400">
                            (Current)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                        {pt.annualInterestBillDeltaPctGdp >= 0 ? '+' : ''}
                        {pt.annualInterestBillDeltaPctGdp.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          pt.inflationPassThroughPct > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {pt.inflationPassThroughPct >= 0 ? '+' : ''}
                        {pt.inflationPassThroughPct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold text-xs ${
                          pt.regime === 'FISCAL_DOMINANCE'
                            ? 'text-rose-600 dark:text-rose-400'
                            : pt.regime === 'TRANSITION_ZONE'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {toDisplayCase(pt.regime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">1. What This Shows in Plain English:</strong> Finds the exact tipping-point interest rate (<span className="tabular-nums">r* = {fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}%</span>) where central bank rate hikes stop fighting inflation and start making it worse, plus how many months the central bank can spend US dollars defending the currency.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">2. Why It Matters:</strong> When a large share of government debt has floating interest rates (<span className="tabular-nums">{fiscalDominanceAndFxBurn.floatingShortDebtSharePct}%</span>), raising interest rates balloons the government's interest bill (+{fiscalDominanceAndFxBurn.annualFiscalCostPer100BpsPctGdp}% of GDP per +1% hike), scaring investors and weakening the currency.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">3. Warning Sign &amp; Action:</strong> If interest rates cross above the <span className="tabular-nums">{fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}%</span> tipping point (0 bps headroom) or reserve support drops below <span className="tabular-nums">6 months</span>, exit unhedged local-currency bond trades immediately.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Blanchard (2004) / Leeper (1991) Fiscal Dominance Frontier · Reversal r* = ${fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}% · Policy Headroom = ${fiscalDominanceAndFxBurn.policyRateHeadroomBps} bps · Months to Breach = ${fiscalDominanceAndFxBurn.monthsToAraBreach}m`}
              />
            </div>
          </div>
        </div>

        {/* 7. IMF SRDSF Gross Financing Needs (GFN % GDP) & Domestic Investor Absorption Matrix */}
        <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Engine 7 · IMF Sovereign Risk &amp; Debt Sustainability Framework (SRDSF) Rollover Matrix
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Gross Financing Needs (GFN % GDP) &amp; Sovereign-Bank Doom Loop
                </h3>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Annual GFN vs. {imfSrdsfGfn.imfEmDistressThresholdPctGdp}% IMF Threshold
                </div>
                <div
                  className={`text-sm font-semibold ${
                    imfSrdsfGfn.srdsfRiskZone === 'HIGH_ROLLOVER_CRISIS'
                      ? 'text-rose-600 dark:text-rose-400'
                      : imfSrdsfGfn.srdsfRiskZone === 'MODERATE_STRESS'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {imfSrdsfGfn.totalGfnPctGdp}% GDP ({imfSrdsfGfn.srdsfRiskZone})
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-l-2 border-blue-600 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <RichTextWithStatRefs text={imfSrdsfGfn.conclusionHeadline} />
            </div>

            {/* GFN Decomposition Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>12-Month Gross Financing Needs Decomposition</span>
                <span className="tabular-nums">
                  Total: {imfSrdsfGfn.totalGfnPctGdp}% GDP · Doom-Loop CET1 Hit: -{imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {imfSrdsfGfn.gfnComponents.map((comp) => (
                  <div
                    key={comp.componentLabel}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {comp.componentLabel}
                      </span>
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {comp.pctOfGdp}% GDP (${comp.usdBillions}B)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500"
                        style={{ width: `${Math.min(100, comp.shareOfTotalGfnPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investor Base Absorption & Crowding-Out Matrix */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3 font-semibold">Investor Sector</th>
                    <th className="py-2 px-3 font-semibold text-right">Stressed Absorption</th>
                    <th className="py-2 px-3 font-semibold text-right">Sector Capacity</th>
                    <th className="py-2 px-3 font-semibold">Balance-Sheet / CET1 Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {imfSrdsfGfn.investorAbsorptionMatrix.map((row) => (
                    <tr key={row.investorSector}>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.investorSector}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        {row.stressedAbsorptionPctGdp}% GDP
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        {row.maxCapacityLimitPctGdp}% GDP
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300">
                        {row.crowdingOutOrConstraintNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">1. What This Shows in Plain English:</strong> Adds up the government's total yearly borrowing bill—new budget deficits plus interest payments plus old debt coming due (<span className="tabular-nums">{imfSrdsfGfn.totalGfnPctGdp}% of GDP</span>)—and checks who has enough cash to buy those bonds if foreign investors step back.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">2. Why It Matters:</strong> Countries rarely default just because total debt is high; they run into trouble when their yearly refinancing bill is too big for local banks and pension funds to swallow without hurting bank capital (<span className="tabular-nums">-{imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps CET1</span> hit).
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">3. Warning Sign &amp; Action:</strong> When yearly borrowing needs exceed <span className="tabular-nums">15% of GDP</span> (for emerging markets) or force the Central Bank to print money to buy leftover bonds (<span className="tabular-nums">{imfSrdsfGfn.centralBankMonetizationResidualPctGdp}% GDP</span>), rollover crisis risk is high.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: IMF SRDSF Gross Financing Needs (GFN = ${imfSrdsfGfn.totalGfnPctGdp}% GDP vs. ${imfSrdsfGfn.imfEmDistressThresholdPctGdp}% Threshold) · Bank Doom-Loop CET1 Hit = -${imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
