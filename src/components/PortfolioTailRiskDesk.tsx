import React, { useEffect, useMemo, useState } from 'react';
import { toDisplayCase } from '../utils/displayCase';
import {
  CouncilAssessmentRun,
  GeopoliticalWargameParams,
  PortfolioExpressionType,
  PortfolioPositionItem,
  PortfolioRiskMandateConfig,
  RestructuringSimulationParams,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_PORTFOLIO_MANDATE_CONFIG,
  DEFAULT_RESTRUCTURING_PARAMS,
  buildDefaultPortfolioPositions,
  computeCouncilKellyAndLobExecution,
  computeCrossCurrencyAndLegalBasis,
  computeMultiSovereignPortfolioRisk,
  simulateSovereignRestructuringAndRating,
} from '../utils/institutionalRiskDeskEngine';
import {
  DEFAULT_WARGAME_PARAMS,
  computeGeopoliticalRiskDeskSuite,
} from '../utils/geopoliticalRiskEngine';
import { RotateCcw, ShieldAlert, CheckCircle2, Sliders, Scale, Globe2, Zap, ArrowUpRight } from 'lucide-react';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface PortfolioTailRiskDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  onSelectSovereign?: (item: WatchlistItem) => void;
  propagatedGeoWargameParams?: GeopoliticalWargameParams;
  isGeoPropagationActive?: boolean;
  onOpenGeopoliticalDesk?: () => void;
}

const EXPRESSION_LABELS: Record<PortfolioExpressionType, string> = {
  LOCAL_RATES_RECEIVER: 'Receive 5Y/10Y Local Rates',
  USD_EUROBOND_LONG: 'Long 10Y USD Eurobond',
  CDS_5Y_PROTECTION: 'Buy 5Y Sovereign CDS Protection',
  CURVE_2S10S_STEEPENER: '2s10s Local Curve Steepener',
  FX_HEDGED_LOCAL_CARRY: 'FX-Hedged Local Bond Carry',
};

export const PortfolioTailRiskDesk: React.FC<PortfolioTailRiskDeskProps> = ({
  run,
  watchlistItems,
  onSelectSovereign,
  propagatedGeoWargameParams = DEFAULT_WARGAME_PARAMS,
  isGeoPropagationActive = false,
  onOpenGeopoliticalDesk,
}) => {
  const [positions, setPositions] = useState<PortfolioPositionItem[]>(() =>
    buildDefaultPortfolioPositions(run.iso3, watchlistItems)
  );
  const [mandateConfig, setMandateConfig] = useState<PortfolioRiskMandateConfig>(
    DEFAULT_PORTFOLIO_MANDATE_CONFIG
  );
  const [restructuringParams, setRestructuringParams] = useState<RestructuringSimulationParams>(
    DEFAULT_RESTRUCTURING_PARAMS
  );

  // Ensure the active sovereign is always represented in the multi-sovereign book when switched
  useEffect(() => {
    setPositions((prev) => {
      if (prev.some((p) => p.iso3 === run.iso3)) return prev;
      return buildDefaultPortfolioPositions(run.iso3, watchlistItems);
    });
  }, [run.iso3, watchlistItems]);

  const portfolioRisk = useMemo(
    () => computeMultiSovereignPortfolioRisk(run, positions, mandateConfig),
    [run, positions, mandateConfig]
  );

  const geoSuite = useMemo(
    () => computeGeopoliticalRiskDeskSuite(run.openData, propagatedGeoWargameParams),
    [run.openData, propagatedGeoWargameParams]
  );

  const restructuringResult = useMemo(
    () => simulateSovereignRestructuringAndRating(run.openData, restructuringParams),
    [run.openData, restructuringParams]
  );

  const xccyAndLegalResult = useMemo(
    () => computeCrossCurrencyAndLegalBasis(run.openData),
    [run.openData]
  );

  const kellyLobResult = useMemo(
    () => computeCouncilKellyAndLobExecution(run, mandateConfig),
    [run, mandateConfig]
  );

  const handleUpdateWeight = (iso3: string, weightNavPct: number) => {
    setPositions((prev) =>
      prev.map((p) => (p.iso3 === iso3 ? { ...p, weightNavPct } : p))
    );
  };

  const handleUpdateExpression = (iso3: string, expressionType: PortfolioExpressionType) => {
    setPositions((prev) =>
      prev.map((p) => (p.iso3 === iso3 ? { ...p, expressionType } : p))
    );
  };

  const handleResetBook = () => {
    setPositions(buildDefaultPortfolioPositions(run.iso3, watchlistItems));
    setMandateConfig(DEFAULT_PORTFOLIO_MANDATE_CONFIG);
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          MODULE 1: MULTI-SOVEREIGN PORTFOLIO BOOK BUILDER, VaR/CVaR99 & MANDATE GOVERNANCE
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tier-1 Institutional Risk Desk · Multi-Sovereign Book Aggregation, Tail CVaR &amp; Mandate Governance
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Multi-Sovereign Portfolio VaR, Expected Shortfall (CVaR₉₉) &amp; DV01 Book Builder
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs tabular-nums font-semibold border ${
                portfolioRisk.hasMandateBreach
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {portfolioRisk.hasMandateBreach ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>CRO mandate limit breach</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All CRO risk mandates compliant</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={handleResetBook}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Model Book</span>
            </button>
          </div>
        </div>

        {/* GEOPOLITICAL WARGAME PROPAGATION BANNER */}
        {isGeoPropagationActive && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Geopolitical Wargame Stress Transmission Active:</strong> Unhedged Book Geopolitical Stress Drawdown{' '}
                <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                  -${Math.abs(geoSuite.portfolioTransmission.totalUnhedgedGeoStressPnlUsdThousands).toLocaleString()}k ({geoSuite.portfolioTransmission.totalUnhedgedGeoStressPctNav}% NAV)
                </span>{' '}
                · Safe-Haven Tail-Hedge Offset{' '}
                <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  +$
                  {geoSuite.portfolioTransmission.tailHedgeOffsetPnlUsdThousands.toLocaleString()}k
                </span>{' '}
                · Geo-Stressed CVaR₉₉:{' '}
                <span className="tabular-nums font-semibold">
                  {geoSuite.portfolioTransmission.geoStressedCvar99PctNav}% NAV
                </span>
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

        {/* CRO Mandate Limits & Book Size Control Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/80 p-4 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Portfolio Capital (NAV)
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                ${mandateConfig.portfolioNavUsdMillions}M USD
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={mandateConfig.portfolioNavUsdMillions}
              onChange={(e) =>
                setMandateConfig((prev) => ({
                  ...prev,
                  portfolioNavUsdMillions: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>$100M</span>
              <span>Gross Book: {portfolioRisk.grossExposurePct}% NAV</span>
              <span>$1,000M</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                CRO Net Rate DV01 Limit
              </span>
              <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                ${mandateConfig.maxPortfolioDv01UsdThousands}k / bp
              </span>
            </div>
            <input
              type="range"
              min={80}
              max={350}
              step={10}
              value={mandateConfig.maxPortfolioDv01UsdThousands}
              onChange={(e) =>
                setMandateConfig((prev) => ({
                  ...prev,
                  maxPortfolioDv01UsdThousands: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>Util: {portfolioRisk.dv01MandateUtilizationPct}%</span>
              <span>Curr: ${Math.abs(portfolioRisk.totalNetRateDv01UsdThousands).toFixed(1)}k/bp</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Single-Country CS01 Cap
              </span>
              <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                ${mandateConfig.maxSingleCountryCs01UsdThousands}k / bp
              </span>
            </div>
            <input
              type="range"
              min={35}
              max={150}
              step={5}
              value={mandateConfig.maxSingleCountryCs01UsdThousands}
              onChange={(e) =>
                setMandateConfig((prev) => ({
                  ...prev,
                  maxSingleCountryCs01UsdThousands: Number(e.target.value),
                }))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>Max Country Util: {portfolioRisk.cs01MaxSingleUtilizationPct}%</span>
              <span>Cap: ${mandateConfig.maxSingleCountryCs01UsdThousands}k/bp</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                10-Day 99% CVaR Limit
              </span>
              <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                {mandateConfig.maxCvar99PctNav.toFixed(1)}% NAV
              </span>
            </div>
            <input
              type="range"
              min={2.0}
              max={8.0}
              step={0.25}
              value={mandateConfig.maxCvar99PctNav}
              onChange={(e) =>
                setMandateConfig((prev) => ({
                  ...prev,
                  maxCvar99PctNav: Number(e.target.value),
                }))
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>Util: {portfolioRisk.cvarMandateUtilizationPct}%</span>
              <span>Curr: {portfolioRisk.expectedShortfallCvar99TenDayPct.toFixed(2)}% NAV</span>
            </div>
          </div>
        </div>

        {/* 6-Metric Institutional Portfolio Tail Risk KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">10-Day 95% Parametric VaR</span>
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {portfolioRisk.parametricVar95TenDayPct.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              ${((portfolioRisk.portfolioNavUsdMillions * portfolioRisk.parametricVar95TenDayPct) / 100).toFixed(2)}M
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">99% Cornish-Fisher Tail VaR</span>
            <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {portfolioRisk.cornishFisherVar99TenDayPct.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-slate-400 block">
              Skew / Kurtosis Adjusted
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">99% Expected Shortfall (CVaR)</span>
            <span
              className={`text-base font-semibold tabular-nums tabular-nums ${
                portfolioRisk.cvarMandateUtilizationPct > 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {portfolioRisk.expectedShortfallCvar99TenDayPct.toFixed(2)}% (${portfolioRisk.expectedShortfallCvar99UsdMillions.toFixed(1)}M)
            </span>
            <span className="text-xs text-slate-400 block">
              Mandate Util: {portfolioRisk.cvarMandateUtilizationPct}%
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Liquidity-Adjusted LVaR₉₉</span>
            <span className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {portfolioRisk.liquidityAdjustedLvar99TenDayPct.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Max Exit: {portfolioRisk.liquidityHorizonDays}d stressed
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Net Portfolio Rate DV01</span>
            <span
              className={`text-base font-semibold tabular-nums tabular-nums ${
                portfolioRisk.dv01MandateUtilizationPct > 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              ${portfolioRisk.totalNetRateDv01UsdThousands.toFixed(1)}k / bp
            </span>
            <span className="text-xs text-slate-400 block">
              Limit: ${mandateConfig.maxPortfolioDv01UsdThousands}k/bp
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Diversification Benefit</span>
            <span className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              -{portfolioRisk.diversificationBenefitPct.toFixed(1)}% Vol
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Net CS01: ${portfolioRisk.totalNetCreditCs01UsdThousands.toFixed(1)}k/bp
            </span>
          </div>
        </div>

        {/* Live Multi-Sovereign Book Builder & MCTR Attribution Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
                <th className="py-2.5 px-3">Sovereign Position</th>
                <th className="py-2.5 px-3">Desk Trade Expression</th>
                <th className="py-2.5 px-3 w-44">Book Weight (% NAV)</th>
                <th className="py-2.5 px-3 text-right">Notional ($M)</th>
                <th className="py-2.5 px-3 text-right">Rate DV01</th>
                <th className="py-2.5 px-3 text-right">Credit CS01</th>
                <th className="py-2.5 px-3 text-right">Mctr (% NAV)</th>
                <th className="py-2.5 px-3 text-right">Component CVaR₉₉</th>
                <th className="py-2.5 px-3 text-right">Risk Share</th>
                <th className="py-2.5 px-3 text-right">Liq Horizon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {portfolioRisk.positionContributions.map((row) => {
                const isActive = row.iso3 === run.iso3;
                return (
                  <tr
                    key={row.iso3}
                    className={
                      isActive
                        ? 'bg-blue-50/50 dark:bg-blue-950/25'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-950/50'
                    }
                  >
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          const match = watchlistItems.find((w) => w.iso3 === row.iso3);
                          if (match && onSelectSovereign) onSelectSovereign(match);
                        }}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                      >
                        {row.countryName} ({row.iso3})
                      </button>
                      <span className="block text-xs tabular-nums text-slate-400">
                        {row.currencyCode} · Vol {row.standaloneVolAnnualPct}%
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={row.expressionType}
                        onChange={(e) =>
                          handleUpdateExpression(
                            row.iso3,
                            e.target.value as PortfolioExpressionType
                          )
                        }
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {Object.entries(EXPRESSION_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={50}
                          step={5}
                          value={row.weightNavPct}
                          onChange={(e) =>
                            handleUpdateWeight(row.iso3, Number(e.target.value))
                          }
                          className="w-24 accent-blue-600 cursor-pointer"
                        />
                        <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100 w-10 text-right">
                          {row.weightNavPct}%
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                      ${row.notionalUsdMillions.toFixed(1)}M
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-blue-600 dark:text-blue-400">
                      {row.rateDv01UsdThousands >= 0 ? '+' : ''}
                      ${row.rateDv01UsdThousands.toFixed(1)}k
                    </td>

                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-semibold tabular-nums ${
                        row.breachesSingleCountryCs01
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.creditCs01UsdThousands >= 0 ? '+' : ''}
                      ${row.creditCs01UsdThousands.toFixed(1)}k
                      {row.breachesSingleCountryCs01 && (
                        <span className="block text-xs text-rose-500">Breach</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {row.mctrPctNav.toFixed(2)}%
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                      {row.componentCvarPctNav.toFixed(2)}%
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {row.componentRiskSharePct.toFixed(1)}%
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      {row.liquidityDaysToLiquidate}d ({row.stressedBidAskCostBps}bps)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          MODULE 2: KEY-RATE DV01/CS01 LADDER & CROSS-SOVEREIGN CONTAGION MATRIX
          ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 5 Cols: Key-Rate Duration (KRD) DV01 & CS01 Bucket Ladder */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Curve Risk Decomposition · Key-Rate Duration (KRD) &amp; Credit Spread CS01 Ladder
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {portfolioRisk.conclusionHeadline}
            </h3>

            {/* SVG Key-Rate DV01 & CS01 Bucket Chart */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3">
              <svg viewBox="0 0 460 195" className="w-full h-44 overflow-visible">
                {/* Zero baseline */}
                <line
                  x1={48}
                  y1={115}
                  x2={435}
                  y2={115}
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeWidth="1"
                />
                {/* Mandate Bucket Limit Line */}
                <line
                  x1={48}
                  y1={42}
                  x2={435}
                  y2={42}
                  stroke="#f43f5e"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <text x={52} y={36} className="fill-rose-500 text-xs tabular-nums">
                  CRO Bucket Cap (${portfolioRisk.keyRateBuckets[0]?.mandateBucketLimitUsdThousands || 84}k/bp)
                </text>

                {portfolioRisk.keyRateBuckets.map((b, idx) => {
                  const xBase = 78 + idx * 92;
                  const maxScale = Math.max(
                    100,
                    b.mandateBucketLimitUsdThousands * 1.25,
                    ...portfolioRisk.keyRateBuckets.map((k) =>
                      Math.max(Math.abs(k.rateDv01UsdThousands), Math.abs(k.creditCs01UsdThousands))
                    )
                  );
                  const rHeight = (Math.abs(b.rateDv01UsdThousands) / maxScale) * 75;
                  const cHeight = (Math.abs(b.creditCs01UsdThousands) / maxScale) * 75;
                  const rY = b.rateDv01UsdThousands >= 0 ? 115 - rHeight : 115;
                  const cY = b.creditCs01UsdThousands >= 0 ? 115 - cHeight : 115;

                  return (
                    <g key={b.tenorBucket}>
                      {/* Rate DV01 Bar */}
                      <rect
                        x={xBase}
                        y={rY}
                        width={24}
                        height={Math.max(3, rHeight)}
                        fill="#3b82f6"
                      />
                      <text
                        x={xBase + 12}
                        y={b.rateDv01UsdThousands >= 0 ? rY - 4 : rY + rHeight + 10}
                        textAnchor="middle"
                        className="fill-blue-600 dark:fill-blue-400 text-xs tabular-nums font-semibold"
                      >
                        {b.rateDv01UsdThousands >= 0 ? '+' : ''}
                        {b.rateDv01UsdThousands.toFixed(0)}k
                      </text>

                      {/* Credit CS01 Bar */}
                      <rect
                        x={xBase + 28}
                        y={cY}
                        width={24}
                        height={Math.max(3, cHeight)}
                        fill="#f59e0b"
                      />
                      <text
                        x={xBase + 40}
                        y={b.creditCs01UsdThousands >= 0 ? cY - 4 : cY + cHeight + 10}
                        textAnchor="middle"
                        className="fill-amber-600 dark:fill-amber-400 text-xs tabular-nums font-semibold"
                      >
                        {b.creditCs01UsdThousands >= 0 ? '+' : ''}
                        {b.creditCs01UsdThousands.toFixed(0)}k
                      </text>

                      {/* Tenor Label */}
                      <text
                        x={xBase + 26}
                        y={168}
                        textAnchor="middle"
                        className="fill-slate-700 dark:fill-slate-300 text-xs tabular-nums font-semibold"
                      >
                        {b.tenorBucket} Bucket
                      </text>
                      <text
                        x={xBase + 26}
                        y={182}
                        textAnchor="middle"
                        className="fill-slate-400 text-xs tabular-nums"
                      >
                        Carry +{b.netCarryBps}bps
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 inline-block" />
                  <span>Interest-Rate Key-Rate DV01 ($k/bp)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 inline-block" />
                  <span>Sovereign Credit Spread CS01 ($k/bp)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Plain-English Guide & Statistical Reference */}
          <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>
                • <strong>Where the Interest-Rate Risk Sits</strong>: Most of the portfolio&apos;s sensitivity to credit spreads sits in 5-year and 10-year bonds, while curve-steepener trades protect the front end.
              </li>
              <li>
                • <strong>Why Crash Risk Is Higher Than Normal Models Say</strong>: Because emerging-market bond sell-offs happen in sudden jumps, realistic 1-in-100 crash loss is <strong className="tabular-nums">{portfolioRisk.cornishFisherVar99TenDayPct.toFixed(2)}%</strong> compared to <strong className="tabular-nums">{portfolioRisk.parametricVar95TenDayPct.toFixed(2)}%</strong> in standard bell-curve models.
              </li>
              <li>
                • <strong>Cost of Exiting During a Panic</strong>: Wider trading spreads during a market panic add another <strong className="tabular-nums">+{(portfolioRisk.liquidityAdjustedLvar99TenDayPct - portfolioRisk.expectedShortfallCvar99TenDayPct).toFixed(2)}% of NAV</strong> to potential losses if you have to sell quickly.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: 10D Gaussian VaR(95%) = ${portfolioRisk.parametricVar95TenDayPct.toFixed(2)}% · Cornish-Fisher VaR(99%) = ${portfolioRisk.cornishFisherVar99TenDayPct.toFixed(2)}% · Expected Shortfall CVaR(99%) = ${portfolioRisk.expectedShortfallCvar99TenDayPct.toFixed(2)}% · Liquidity-Adjusted LVaR(99%) = ${portfolioRisk.liquidityAdjustedLvar99TenDayPct.toFixed(2)}%`}
              />
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Cross-Sovereign Correlation & Macro Contagion Matrix */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Cross-Border Spillover &amp; Factor Beta Engine · Correlation (ρ) &amp; Global Shock Sensitivities
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Cross-Sovereign Contagion Matrix &amp; Global Macro Factor Betas (US 10Y Real, DXY, Brent, China PMI)
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
                    <th className="py-2 px-2.5">Sovereign</th>
                    {portfolioRisk.contagionMatrix.map((c) => (
                      <th key={c.iso3} className="py-2 px-2 text-center tabular-nums">
                        ρ({c.iso3})
                      </th>
                    ))}
                    <th className="py-2 px-2.5 text-right">US 10Y +50bp</th>
                    <th className="py-2 px-2.5 text-right">DXY +5%</th>
                    <th className="py-2 px-2.5 text-right">Brent +$20</th>
                    <th className="py-2 px-2.5 text-right">China -2pt</th>
                    <th className="py-2 px-2.5 text-right">Stress PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {portfolioRisk.contagionMatrix.map((row) => (
                    <tr key={row.iso3} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50">
                      <td className="py-2.5 px-2.5 font-sans font-semibold text-slate-900 dark:text-slate-100">
                        {row.countryName} ({row.iso3})
                      </td>
                      {row.correlations.map((cell) => {
                        const val = cell.rho;
                        const bg =
                          cell.targetIso3 === row.iso3
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : val >= 0.55
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold'
                            : val < 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300';
                        return (
                          <td key={cell.targetIso3} className={`py-2.5 px-2 text-center ${bg}`}>
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                      <td
                        className={`py-2.5 px-2.5 text-right ${
                          row.betaUs10YReal50Bps > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {row.betaUs10YReal50Bps > 0 ? '+' : ''}
                        {row.betaUs10YReal50Bps}bp
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right ${
                          row.betaDxyPlus5Pct > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {row.betaDxyPlus5Pct > 0 ? '+' : ''}
                        {row.betaDxyPlus5Pct}bp
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right ${
                          row.betaBrentPlus20Usd > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {row.betaBrentPlus20Usd > 0 ? '+' : ''}
                        {row.betaBrentPlus20Usd}bp
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-700 dark:text-slate-300">
                        {row.betaChinaPmiMinus2Pts > 0 ? '+' : ''}
                        {row.betaChinaPmiMinus2Pts}bp
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-semibold ${
                          row.compositeShockPnlUsdThousands >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.compositeShockPnlUsdThousands >= 0 ? '+' : ''}$
                        {row.compositeShockPnlUsdThousands}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>
                • <strong>How Countries Move Together in a Sell-Off</strong>: Riskier emerging markets tend to fall at the same time when US interest rates jump (correlation above 0.55); pairing local bond holdings with 5-year default insurance (CDS) offsets those losses.
              </li>
              <li>
                • <strong>Biggest Global Threat</strong>: A simultaneous jump in US 10-year interest rates (+50 bps) and the US dollar (+5%) hits countries that rely on foreign borrowing the hardest.
              </li>
              <li>
                • <strong>Oil Winners vs. Losers</strong>: A +$20/barrel jump in oil prices hurts fuel-importing countries while boosting oil-exporting nations in Latin America and the Gulf.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatRefBadge
                refText={`Statistical Reference: Cross-Sovereign Correlation Matrix ρ(i,j) + Multi-Factor Shock Betas · Diversification Benefit = ${portfolioRisk.diversificationBenefitPct.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODULE 3: SOVEREIGN RESTRUCTURING NPV HAIRCUT SIMULATOR & RATING MIGRATION MATRIX
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Distressed &amp; Crossover Sovereign Credit Lab · ISDA Hazard Default, CAC Seniority &amp; Fallen-Angel Flows
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {run.countryName} ({run.iso3}): <RichTextWithStatRefs text={restructuringResult.conclusionHeadline} />
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setRestructuringParams({
                  exitYieldPct: 10.0,
                  principalHaircutPct: 0,
                  maturityExtensionYears: 4,
                  couponReductionBps: 100,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0"
            >
              Maturity Re-Profiling Only
            </button>
            <button
              type="button"
              onClick={() => setRestructuringParams(DEFAULT_RESTRUCTURING_PARAMS)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0"
            >
              Standard IMF/CAC Workout
            </button>
            <button
              type="button"
              onClick={() =>
                setRestructuringParams({
                  exitYieldPct: 15.0,
                  principalHaircutPct: 35,
                  maturityExtensionYears: 7,
                  couponReductionBps: 250,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 whitespace-nowrap shrink-0"
            >
              Hard Default / Deep Haircut
            </button>
          </div>
        </div>

        {/* 4 Interactive Restructuring Workout Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/80 p-4 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Exit Discount Yield
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {restructuringParams.exitYieldPct.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={8.0}
              max={18.0}
              step={0.5}
              value={restructuringParams.exitYieldPct}
              onChange={(e) =>
                setRestructuringParams((prev) => ({
                  ...prev,
                  exitYieldPct: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>8.0% (Normal)</span>
              <span>18.0% (Distressed)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Principal Face Haircut
              </span>
              <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                -{restructuringParams.principalHaircutPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={restructuringParams.principalHaircutPct}
              onChange={(e) =>
                setRestructuringParams((prev) => ({
                  ...prev,
                  principalHaircutPct: Number(e.target.value),
                }))
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0% (Par)</span>
              <span>50% Write-Down</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Maturity Extension
              </span>
              <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                +{restructuringParams.maturityExtensionYears} Years
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={restructuringParams.maturityExtensionYears}
              onChange={(e) =>
                setRestructuringParams((prev) => ({
                  ...prev,
                  maturityExtensionYears: Number(e.target.value),
                }))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0Y</span>
              <span>+10Y Re-Profiling</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Coupon Step-Down
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                -{restructuringParams.couponReductionBps} bps
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={400}
              step={25}
              value={restructuringParams.couponReductionBps}
              onChange={(e) =>
                setRestructuringParams((prev) => ({
                  ...prev,
                  couponReductionBps: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0 bps</span>
              <span>-400 bps Relief</span>
            </div>
          </div>
        </div>

        {/* Restructuring KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Current Eurobond Price</span>
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {restructuringResult.currentBenchmarkBondPriceCents.toFixed(1)}¢ / $100
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Coupon {restructuringResult.currentContractualCouponPct}% · 8Y
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Restructured NPV Recovery</span>
            <span className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {restructuringResult.restructuredNpvRecoveryCents.toFixed(1)}¢ / $100
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Implied Haircut: {restructuringResult.impliedNpvHaircutPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Recovery Margin of Safety</span>
            <span
              className={`text-base font-semibold tabular-nums tabular-nums ${
                restructuringResult.marginOfSafetyVsMarketCents >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {restructuringResult.marginOfSafetyVsMarketCents >= 0 ? '+' : ''}
              {restructuringResult.marginOfSafetyVsMarketCents.toFixed(1)}¢ vs Market
            </span>
            <span className="text-xs text-slate-400 block">
              {restructuringResult.marginOfSafetyVsMarketCents >= 0
                ? 'Recovery > Market Price'
                : 'Downside vs Workout'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">ISDA 5Y Cumulative PD</span>
            <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {restructuringResult.cdsImplied5YCumulativeDefaultProbPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              1Y PD: {restructuringResult.cdsImplied1YDefaultProbPct.toFixed(2)}% (LGD {restructuringResult.lossGivenDefaultLgdPct}%)
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Composite Agency Rating</span>
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {restructuringResult.ratingMigration.currentCompositeRating}
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              IG Cutoff Distance: {restructuringResult.ratingMigration.notchesToIgThreshold > 0 ? '+' : ''}
              {restructuringResult.ratingMigration.notchesToIgThreshold} notches
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Forced Index Outflow Risk</span>
            <span className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              ${restructuringResult.ratingMigration.forcedIndexOutflowIfDowngradedUsdBn.toFixed(1)}Bn USD
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              12M Cliff Prob: {restructuringResult.ratingMigration.probFallenAngelOrDefaultCliff12MPct}%
            </span>
          </div>
        </div>

        {/* Two-Column Table: Seniority / CAC Waterfall & 12M Rating Migration Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 overflow-x-auto">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Sovereign Creditor Seniority Waterfall &amp; Collective Action Clause (CAC) Burden-Sharing
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950">
                  <th className="py-2 px-3">Creditor Tranche &amp; Indenture</th>
                  <th className="py-2 px-2.5 text-right">Debt Share</th>
                  <th className="py-2 px-2.5 text-right">CAC Vote</th>
                  <th className="py-2 px-3">Restructuring Treatment</th>
                  <th className="py-2 px-2.5 text-right">Implied Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {restructuringResult.seniorityWaterfall.map((t) => (
                  <tr key={t.trancheName}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {t.trancheName}
                    </td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      {t.shareOfTotalDebtPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      {t.cacVotingThresholdPct}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {t.assumedHaircutSensitivity}
                    </td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      {t.impliedRecoveryCents.toFixed(1)}¢
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="xl:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                12-Month Markov Credit Rating Migration Probabilities
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Index Status: {restructuringResult.ratingMigration.indexMembershipStatus}
              </div>

              <div className="space-y-2.5 mt-3 text-xs tabular-nums">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-emerald-700 dark:text-emerald-400 font-semibold">
                      Rating Upgrade (+1 Notch)
                    </span>
                    <span>{restructuringResult.ratingMigration.probUpgrade12MPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${restructuringResult.ratingMigration.probUpgrade12MPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-slate-700 dark:text-slate-300 font-semibold">
                      Rating Affirmation (Stable Horizon)
                    </span>
                    <span>{restructuringResult.ratingMigration.probStable12MPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${restructuringResult.ratingMigration.probStable12MPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-amber-700 dark:text-amber-400 font-semibold">
                      1-Notch Rating Downgrade
                    </span>
                    <span>{restructuringResult.ratingMigration.probDowngrade1Notch12MPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${restructuringResult.ratingMigration.probDowngrade1Notch12MPct}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-rose-700 dark:text-rose-400 font-semibold">
                      2+ Notch Fallen-Angel / Default Cliff
                    </span>
                    <span>
                      {restructuringResult.ratingMigration.probFallenAngelOrDefaultCliff12MPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-rose-600"
                      style={{
                        width: `${restructuringResult.ratingMigration.probFallenAngelOrDefaultCliff12MPct}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <strong>Passive Index Cliff Impact:</strong> A breach of the rating bucket triggers an estimated{' '}
              <strong className="tabular-nums text-slate-900 dark:text-slate-100">
                ${restructuringResult.ratingMigration.forcedIndexOutflowIfDowngradedUsdBn.toFixed(1)}Bn
              </strong>{' '}
              in mechanical benchmark tracker rebalancing.
            </div>
          </div>
        </div>

        {/* Collective Action Clause (CAC) Holdout & Official Creditor Game-Theory Matrix */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Indenture Voting Mechanics · ICMA Single-Limb 75% Aggregation vs. Legacy Dual-Limb Holdout Game Theory
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Collective Action Clause (CAC) Holdout &amp; Restructuring Game-Theory Matrix
              </h4>
            </div>
            <span className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
              Nash Cooperative NPV: {restructuringResult.cacGameTheory.nashEquilibriumPayoffCents.toFixed(1)}¢ vs. Holdout Net: {restructuringResult.cacGameTheory.holdoutExpectedNetPayoffCents.toFixed(1)}¢
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">ICMA Single-Limb (75%)</span>
              <span className="tabular-nums font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {restructuringResult.cacGameTheory.icmaSingleLimb75SharePct}% Stock
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Legacy Dual-Limb CAC</span>
              <span className="tabular-nums font-semibold text-sm text-amber-600 dark:text-amber-400">
                {restructuringResult.cacGameTheory.legacyDualLimbSharePct}% Stock
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Single-Series Block (25.1%)</span>
              <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                ${restructuringResult.cacGameTheory.singleSeriesBlockingCostUsdMillions}M
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Aggregated Stock Block</span>
              <span className="tabular-nums font-semibold text-sm text-blue-600 dark:text-blue-400">
                ${restructuringResult.cacGameTheory.aggregatedSingleLimbBlockingCostUsdMillions.toLocaleString()}M
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Holdout Litigation Odds</span>
              <span className="tabular-nums font-semibold text-sm text-rose-600 dark:text-rose-400">
                {restructuringResult.cacGameTheory.holdoutLitigationProbPct}%
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Official Creditor Delay</span>
              <span className="tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                {restructuringResult.cacGameTheory.officialCreditorCoordinationLagMonths} Months
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            <strong className="text-slate-900 dark:text-slate-100">Game-Theory Equilibrium Verdict: </strong>
            {restructuringResult.cacGameTheory.gameTheoryVerdict}
          </div>
        </div>

        {/* Plain-English Guide & Statistical Reference */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>
              • <strong>1. What This Shows in Plain English</strong>: Calculates how many cents on the dollar bondholders get back (<strong className="tabular-nums">{restructuringResult.restructuredNpvRecoveryCents.toFixed(1)}¢</strong>) if a country restructures its debt, who gets paid first, and whether ”vulture” holdout funds can block the deal in court.
            </li>
            <li>
              • <strong>2. Why It Matters</strong>: Under older bond contracts (<strong className="tabular-nums">{restructuringResult.cacGameTheory.legacyDualLimbSharePct}%</strong> of bonds), a holdout fund can spend just <strong className="tabular-nums">${restructuringResult.cacGameTheory.singleSeriesBlockingCostUsdMillions}M</strong> to buy 25.1% of one bond and block a deal, whereas modern contracts group all bonds together so blocking costs <strong className="tabular-nums">${restructuringResult.cacGameTheory.aggregatedSingleLimbBlockingCostUsdMillions.toLocaleString()}M</strong>.
            </li>
            <li>
              • <strong>3. Warning Sign &amp; Action</strong>: Modern bonds require a <strong className="tabular-nums">75% vote</strong> across all bondholders to force a deal through; if suing in court pays more than +2.5¢ above the voluntary deal (<strong className="tabular-nums">{restructuringResult.cacGameTheory.holdoutExpectedNetPayoffCents.toFixed(1)}¢</strong> vs. <strong className="tabular-nums">{restructuringResult.cacGameTheory.nashEquilibriumPayoffCents.toFixed(1)}¢</strong>), expect drawn-out holdout lawsuits.
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <StatRefBadge
              refText={`Statistical Reference: ISDA Hazard Rate λ (5Y PD = ${restructuringResult.cdsImplied5YCumulativeDefaultProbPct.toFixed(1)}%, LGD = ${restructuringResult.lossGivenDefaultLgdPct}%) · Restructured NPV = ${restructuringResult.restructuredNpvRecoveryCents.toFixed(1)}¢ (Exit Yield = ${restructuringParams.exitYieldPct.toFixed(1)}%) · ICMA Single-Limb 75% CAC = ${restructuringResult.cacGameTheory.icmaSingleLimb75SharePct}%`}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODULE 4: CROSS-CURRENCY BASIS (XCCY), FX-HEDGED CARRY & NY-LAW VS LOCAL-LAW MONITOR
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Cross-Market Arbitrage &amp; Indenture Monitor · Covered Interest Parity (CIP), XCCY Swap Basis &amp; Governing Law
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {run.countryName} ({run.iso3}): <RichTextWithStatRefs text={xccyAndLegalResult.conclusionHeadline} />
            </h2>
          </div>

          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs tabular-nums font-semibold text-blue-700 dark:text-blue-300 shrink-0">
            Optimal Vehicle: {xccyAndLegalResult.preferredSovereignVehicle}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: SVG Yield Comparison Across Tenors */}
          <div className="xl:col-span-5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              USD Eurobond Yield vs. FX-Hedged Local Bond Yield in USD (%)
            </div>
            <svg viewBox="0 0 440 185" className="w-full h-44 overflow-visible">
              <line
                x1={40}
                y1={145}
                x2={415}
                y2={145}
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
                strokeWidth="1"
              />
              {xccyAndLegalResult.basisCurve.map((pt, idx) => {
                const xBase = 68 + idx * 90;
                const maxY = Math.max(
                  12,
                  ...xccyAndLegalResult.basisCurve.map((b) =>
                    Math.max(b.usdEurobondYieldPct, b.fxHedgedLocalYieldInUsdPct)
                  )
                );
                const euroH = (pt.usdEurobondYieldPct / maxY) * 110;
                const hedgedH = (pt.fxHedgedLocalYieldInUsdPct / maxY) * 110;

                return (
                  <g key={pt.tenor}>
                    {/* USD Eurobond Bar */}
                    <rect
                      x={xBase}
                      y={145 - euroH}
                      width={24}
                      height={Math.max(4, euroH)}
                      fill="#64748b"
                    />
                    <text
                      x={xBase + 12}
                      y={145 - euroH - 5}
                      textAnchor="middle"
                      className="fill-slate-600 dark:fill-slate-400 text-xs tabular-nums font-semibold"
                    >
                      {pt.usdEurobondYieldPct.toFixed(1)}%
                    </text>

                    {/* FX-Hedged Local Bar */}
                    <rect
                      x={xBase + 28}
                      y={145 - hedgedH}
                      width={24}
                      height={Math.max(4, hedgedH)}
                      fill="#10b981"
                    />
                    <text
                      x={xBase + 40}
                      y={145 - hedgedH - 5}
                      textAnchor="middle"
                      className="fill-emerald-600 dark:fill-emerald-400 text-xs tabular-nums font-semibold"
                    >
                      {pt.fxHedgedLocalYieldInUsdPct.toFixed(1)}%
                    </text>

                    <text
                      x={xBase + 26}
                      y={162}
                      textAnchor="middle"
                      className="fill-slate-800 dark:fill-slate-200 text-xs tabular-nums font-semibold"
                    >
                      {pt.tenor}
                    </text>
                    <text
                      x={xBase + 26}
                      y={175}
                      textAnchor="middle"
                      className="fill-blue-600 dark:fill-blue-400 text-xs tabular-nums"
                    >
                      {pt.netHedgedPickUpOverEurobondBps >= 0 ? '+' : ''}
                      {pt.netHedgedPickUpOverEurobondBps}bp
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-500 inline-block" />
                <span>Hard-Currency USD Eurobond Yield</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 inline-block" />
                <span>FX-Hedged Local Bond Yield (USD Terms)</span>
              </span>
            </div>
          </div>

          {/* Right 7 Cols: XCCY Basis Table & Jurisdictional Legal Spread Box */}
          <div className="xl:col-span-7 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950">
                    <th className="py-2 px-2.5">Tenor</th>
                    <th className="py-2 px-2.5 text-right">Unhedged Local</th>
                    <th className="py-2 px-2.5 text-right">FX Hedge Cost</th>
                    <th className="py-2 px-2.5 text-right">XCCY Basis</th>
                    <th className="py-2 px-2.5 text-right">FX-Hedged (USD)</th>
                    <th className="py-2 px-2.5 text-right">USD Eurobond</th>
                    <th className="py-2 px-2.5 text-right">Net Pick-Up</th>
                    <th className="py-2 px-2.5 text-right">Desk Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {xccyAndLegalResult.basisCurve.map((pt) => (
                    <tr key={pt.tenor}>
                      <td className="py-2 px-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {pt.tenor}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        {pt.localSovereignYieldPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-500">
                        -{pt.fxForwardOrXccyHedgeCostPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2.5 text-right text-amber-600 dark:text-amber-400">
                        {pt.xccySwapBasisBps} bps
                      </td>
                      <td className="py-2 px-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {pt.fxHedgedLocalYieldInUsdPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-700 dark:text-slate-300">
                        {pt.usdEurobondYieldPct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2 px-2.5 text-right font-semibold ${
                          pt.netHedgedPickUpOverEurobondBps >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {pt.netHedgedPickUpOverEurobondBps >= 0 ? '+' : ''}
                        {pt.netHedgedPickUpOverEurobondBps} bps
                      </td>
                      <td className="py-2 px-2.5 text-right font-sans text-xs font-semibold">
                        {pt.optimalExpression === 'BUY_FX_HEDGED_LOCAL'
                          ? 'FX-Hedged Local'
                          : 'USD Eurobond'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* NY-Law vs Domestic-Law Jurisdictional & Liquidity Monitor */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-xs text-slate-500 block">
                  NY-Law vs. Local-Law Legal Basis
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  +{xccyAndLegalResult.legalAndLiquidity.jurisdictionalLegalSpreadBps} bps Indenture Premium
                </span>
                <span className="text-xs text-slate-400 block">
                  {xccyAndLegalResult.legalAndLiquidity.bondPairLabel}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">
                  Market Depth &amp; Bid-Ask Liquidity
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {xccyAndLegalResult.legalAndLiquidity.onTheRunBidAskBps} bps Normal /{' '}
                  <span className="text-amber-600 dark:text-amber-400">
                    {xccyAndLegalResult.legalAndLiquidity.stressedCrisisBidAskBps} bps Stressed
                  </span>
                </span>
                <span className="text-xs text-slate-400 block tabular-nums">
                  Avg Daily Turnover: ${xccyAndLegalResult.legalAndLiquidity.avgDailyTurnoverUsdMillions}M
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">
                  Statutory Redenomination Assessment
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug block mt-0.5">
                  {xccyAndLegalResult.legalAndLiquidity.redenominationRiskAssessment}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plain-English Guide & Statistical Reference */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>
              • <strong>1. What This Shows in Plain English</strong>: Compares whether you earn more by buying a country&apos;s US dollar Eurobonds directly or by buying its local-currency bonds and locking in the exchange rate back into US dollars.
            </li>
            <li>
              • <strong>2. Why It Matters</strong>: Bonds issued under New York or English law give stronger legal protection (<strong className="tabular-nums">+{xccyAndLegalResult.legalAndLiquidity.jurisdictionalLegalSpreadBps} bps</strong> safety premium) because a local parliament cannot unilaterally change their payment terms overnight.
            </li>
            <li>
              • <strong>3. Warning Sign &amp; Action</strong>: When currency-hedged local bonds pay at least <strong className="tabular-nums">+25 bps</strong> more than USD Eurobonds and default insurance (CDS) is below 300 bps, hedged local bonds are the better buy; above 300 bps CDS, stick to New York-law USD bonds.
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <StatRefBadge
              refText={`Statistical Reference: Covered Interest Parity (CIP) & 5Y XCCY Swap Basis = ${xccyAndLegalResult.fiveYearXccyBasisBps} bps · 5Y Net Hedged Pickup = ${xccyAndLegalResult.fiveYearNetHedgedPickUpBps >= 0 ? '+' : ''}${xccyAndLegalResult.fiveYearNetHedgedPickUpBps} bps · NY-Law vs. Local-Law Spread = +${xccyAndLegalResult.legalAndLiquidity.jurisdictionalLegalSpreadBps} bps`}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODULE 5: COUNCIL BRIER CONVICTION -> HALF-KELLY SIZING & MARKET-MAKER LOB EXECUTION BLOTTER
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Closed-Loop Execution Pipeline · 9-Agent Brier Conviction → Half-Kelly Sizing → Almgren-Chriss LOB Slippage Audit
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              <RichTextWithStatRefs text={kellyLobResult.conclusionHeadline} />
            </h2>
          </div>

          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
            Dealer Regime: {kellyLobResult.dealerInventoryRegime}
          </div>
        </div>

        {/* 4 Summary KPI Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">
              Composite Brier Conviction
            </span>
            <span className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {kellyLobResult.compositeBrierConvictionPct}% Calibrated
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">
              Half-Kelly Gross Allocation
            </span>
            <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {kellyLobResult.totalHalfKellyGrossNavPct}% NAV (${kellyLobResult.totalAllocatedNotionalUsdMillions}M)
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">
              Weighted LOB Slippage Drag
            </span>
            <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              -{kellyLobResult.weightedExecutionSlippageBps} bps
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">
              Net Post-Slippage Alpha
            </span>
            <span className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              +{kellyLobResult.netPortfolioExpectedAlphaBps} bps
            </span>
          </div>
        </div>

        {/* Execution Blotter Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Ticket &amp; Originating Desk</th>
                <th className="py-2.5 px-3 font-semibold">Supreme Council Expression</th>
                <th className="py-2.5 px-3 font-semibold text-right">Brier Win p / Payoff b</th>
                <th className="py-2.5 px-3 font-semibold text-right">Half-Kelly Size</th>
                <th className="py-2.5 px-3 font-semibold text-right">DV01 / CS01</th>
                <th className="py-2.5 px-3 font-semibold text-right">LOB Bid-Ask + Impact</th>
                <th className="py-2.5 px-3 font-semibold text-right">TWAP Horizon</th>
                <th className="py-2.5 px-3 font-semibold text-right">Net Alpha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              {kellyLobResult.tickets.map((t) => (
                <tr key={t.ticketId}>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{t.ticketId}</div>
                    <div className="font-sans text-xs text-slate-500">{t.originatingDesk}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-sans font-semibold text-slate-900 dark:text-slate-100">
                      {t.instrument}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">{toDisplayCase(t.direction)}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                    {t.brierCalibratedWinProbPct}% / {t.rewardToRiskPayoffRatio}x
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {t.halfKellyNavAllocationPct}% NAV (${t.recommendedNotionalUsdMillions}M)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                    ${t.allocatedDv01OrCs01UsdThousands}k/bp
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                    -{t.totalExecutionDragBps} bps ({t.lobQuotedBidAskBps}bp B/A + {t.lobMarketImpactSlippageBps}bp imp)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">
                      {t.optimalTwapExecutionDays}d
                    </span>{' '}
                    <span className="text-xs text-slate-500">({t.executionFeasibilityStatus})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    +{t.netPostSlippageAlphaBps} bps
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Plain-English Guide & Statistical Reference */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>
              • <strong>1. What This Shows in Plain English</strong>: Uses the AI Council&apos;s historical forecasting accuracy (<strong className="tabular-nums">{kellyLobResult.compositeBrierConvictionPct}%</strong>) to calculate how much money to put into each recommended trade, and subtracts the real-world cost of executing those trades in the bond market.
            </li>
            <li>
              • <strong>2. Why It Matters</strong>: Even a great trade idea loses money if you bet too much at once or move the market price against yourself by placing a huge order into a thin market.
            </li>
            <li>
              • <strong>3. Warning Sign &amp; Action</strong>: No single trade is allowed to exceed <strong className="tabular-nums">28% of the portfolio</strong>, and any order larger than <strong className="tabular-nums">65% of available dealer liquidity</strong> is automatically broken into smaller pieces over several days (TWAP).
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <StatRefBadge
              refText={`Statistical Reference: Half-Kelly Criterion f* = 0.5 × (p - q/b) + Almgren-Chriss Square-Root Impact · Brier Conviction = ${kellyLobResult.compositeBrierConvictionPct}% · Weighted Slippage = -${kellyLobResult.weightedExecutionSlippageBps} bps · Net Alpha = +${kellyLobResult.netPortfolioExpectedAlphaBps} bps`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
