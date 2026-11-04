import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Globe,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CorridorStrategyAlphaRow,
  CouncilAssessmentRun,
  LiquidityCrisisPresetId,
  LiquidityStressParams,
  MarketMakerBookId,
  MarketMakerStrategyConfig,
} from '../types/council';
import {
  computeGlobalLiquidityFundingSuite,
  DEFAULT_LIQUIDITY_STRESS_PARAMS,
  LIQUIDITY_CRISIS_PRESETS,
} from '../utils/globalLiquidityEngine';
import {
  computeMarketMakerAlphaSuite,
  DEFAULT_MARKET_MAKER_STRATEGY_CONFIG,
  MARKET_MAKER_STRATEGY_PRESETS,
} from '../utils/marketMakerAlphaEngine';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface MarketMakerAlphaDeskProps {
  run: CouncilAssessmentRun;
  stressParams: LiquidityStressParams;
  onChangeStressParams: (params: LiquidityStressParams) => void;
  onOpenGlobalLiquidityDesk?: () => void;
  onOpenPortfolioDesk?: () => void;
}

export const MarketMakerAlphaDesk: React.FC<MarketMakerAlphaDeskProps> = ({
  run,
  stressParams,
  onChangeStressParams,
  onOpenGlobalLiquidityDesk,
  onOpenPortfolioDesk,
}) => {
  const [strategyConfig, setStrategyConfig] = useState<MarketMakerStrategyConfig>(
    DEFAULT_MARKET_MAKER_STRATEGY_CONFIG
  );
  const [activePresetId, setActivePresetId] = useState<string>('balanced_multi_strat');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'G10' | 'EM'>('ALL');
  const [bookFilter, setBookFilter] = useState<'ALL' | MarketMakerBookId>('ALL');
  const [inspectedDay, setInspectedDay] = useState<number>(30);

  // Live synchronized Global Liquidity & Funding Suite
  const liquiditySuite = useMemo(
    () => computeGlobalLiquidityFundingSuite(run.openData, stressParams),
    [run.openData, stressParams]
  );

  // Live Market-Maker & Alpha Simulation Suite
  const alphaSuite = useMemo(
    () => computeMarketMakerAlphaSuite(run.openData, liquiditySuite, strategyConfig),
    [run.openData, liquiditySuite, strategyConfig]
  );

  const filteredCorridors = useMemo(() => {
    return alphaSuite.corridorPositions.filter((row) => {
      if (regionFilter !== 'ALL' && row.regionGroup !== regionFilter) return false;
      if (bookFilter !== 'ALL' && row.dominantBook !== bookFilter) return false;
      return true;
    });
  }, [alphaSuite.corridorPositions, regionFilter, bookFilter]);

  const handleSelectStrategyPreset = (presetId: string) => {
    const found = MARKET_MAKER_STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setActivePresetId(presetId);
      setStrategyConfig(found.config);
    }
  };

  const handleConfigChange = <K extends keyof MarketMakerStrategyConfig>(
    key: K,
    val: MarketMakerStrategyConfig[K]
  ) => {
    setActivePresetId('custom');
    setStrategyConfig((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleLiquidityPresetSelect = (presetId: Exclude<LiquidityCrisisPresetId, 'custom'>) => {
    onChangeStressParams(LIQUIDITY_CRISIS_PRESETS[presetId].params);
  };

  const handleLiquiditySliderChange = (
    key: keyof Omit<LiquidityStressParams, 'presetId'>,
    val: number
  ) => {
    onChangeStressParams({
      ...stressParams,
      presetId: 'custom',
      [key]: val,
    });
  };

  // 30-Day Cumulative Equity Curve SVG Geometry
  const svgW = 640;
  const svgH = 250;
  const padL = 56;
  const padR = 24;
  const padT = 24;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const allPnlValues = alphaSuite.equityCurve30D.flatMap((d) => [
    d.baselineCumulativePnlUsdM,
    d.stressedCumulativePnlUsdM,
    0,
  ]);
  const minPnl = Math.min(...allPnlValues, -5);
  const maxPnl = Math.max(...allPnlValues, 10);
  const pnlSpan = Math.max(8, maxPnl - minPnl);

  const toX = (day: number) => padL + ((day - 1) / 29) * plotW;
  const toY = (val: number) => padT + ((maxPnl - val) / pnlSpan) * plotH;
  const zeroY = toY(0);

  const baselinePoints = alphaSuite.equityCurve30D
    .map((d) => `${toX(d.day).toFixed(1)},${toY(d.baselineCumulativePnlUsdM).toFixed(1)}`)
    .join(' ');
  const stressedPoints = alphaSuite.equityCurve30D
    .map((d) => `${toX(d.day).toFixed(1)},${toY(d.stressedCumulativePnlUsdM).toFixed(1)}`)
    .join(' ');

  const activeDayPoint =
    alphaSuite.equityCurve30D.find((d) => d.day === inspectedDay) ||
    alphaSuite.equityCurve30D[alphaSuite.equityCurve30D.length - 1];

  // Max absolute value for Waterfall bar scaling
  const maxWaterfallAbs = Math.max(
    10,
    ...alphaSuite.waterfall.map((w) => Math.abs(w.valueUsdMillions))
  );

  const getSignalStyle = (signal: CorridorStrategyAlphaRow['executionSignal']) => {
    switch (signal) {
      case 'HARVEST_CIP_BASIS':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800';
      case 'LONG_CARRY':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';
      case 'PROVIDE_DEPTH':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800';
      case 'WIDEN_QUOTES_DEFENSIVE':
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';
      case 'DELEVERAGE_STOP':
        return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800';
    }
  };

  return (
    <section
      aria-label="Market-Maker Strategy and Alpha Generator Workbench"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      {/* Institutional Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Quantitative Alpha &amp; Dealer Execution Simulator
            </span>
            <span aria-hidden="true">·</span>
            <span>Avellaneda-Stoikov Order-Book MM</span>
            <span aria-hidden="true">·</span>
            <span>XCCY CIP Basis Arbitrage</span>
            <span aria-hidden="true">·</span>
            <span>Sovereign FX Carry</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Market-Maker Strategy &amp; Alpha Generator — Real-Time PnL &amp; Funding Squeeze Attribution
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-5xl">
            <RichTextWithStatRefs text={alphaSuite.headlineConclusion} />
          </p>
          <StatRefBadge
            refText={`Statistical Reference: Avellaneda-Stoikov LOB Market-Making & CIP Arbitrage · Reservation Price r(s,q,t) = s − q·γ·σ²·(T−t) · Stressed 30D Net PnL ${alphaSuite.stressed30DayNetPnlUsdM >= 0 ? '+' : ''}$${alphaSuite.stressed30DayNetPnlUsdM.toFixed(2)}M · Sharpe ${alphaSuite.stressedSharpeRatio.toFixed(2)}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenGlobalLiquidityDesk && (
            <button
              type="button"
              onClick={onOpenGlobalLiquidityDesk}
              className="ui-btn ui-btn-primary inline-flex shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Liquidity &amp; XCCY Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenPortfolioDesk && (
            <button
              type="button"
              onClick={onOpenPortfolioDesk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Portfolio &amp; Tail Risk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              handleSelectStrategyPreset('balanced_multi_strat');
              handleLiquidityPresetSelect('baseline');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* 4-Card Executive Strategy KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 bg-slate-50/40 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
        {/* KPI 1: Stressed 30-Day Net Strategy PnL */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              30-Day Projected Net Strategy PnL
            </span>
            {alphaSuite.stressed30DayNetPnlUsdM >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
            )}
          </div>
          <div className="my-1.5 flex items-baseline gap-2 tabular-nums">
            <span
              className={`text-xl font-semibold ${
                alphaSuite.stressed30DayNetPnlUsdM >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {alphaSuite.stressed30DayNetPnlUsdM >= 0 ? '+' : ''}$
              {alphaSuite.stressed30DayNetPnlUsdM.toFixed(2)}M
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({alphaSuite.stressedAnnualizedReturnPct >= 0 ? '+' : ''}
              {alphaSuite.stressedAnnualizedReturnPct.toFixed(1)}% Ann.)
            </span>
          </div>
          <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Unstressed Baseline:{' '}
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              +${alphaSuite.baseline30DayNetPnlUsdM.toFixed(2)}M
            </span>{' '}
            · Squeeze Delta:{' '}
            <span
              className={
                alphaSuite.fundingSqueezePnlImpactUsdM >= 0
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-rose-600 dark:text-rose-400 font-semibold'
              }
            >
              {alphaSuite.fundingSqueezePnlImpactUsdM >= 0 ? '+' : ''}$
              {alphaSuite.fundingSqueezePnlImpactUsdM.toFixed(2)}M
            </span>
          </div>
        </div>

        {/* KPI 2: Avellaneda-Stoikov Optimal Bid-Ask & Order Flow */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Avellaneda-Stoikov Quoted Bid-Ask
            </span>
            <Activity className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {alphaSuite.avgOptimalBidAskSpreadBps.toFixed(1)} bps
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (δ* = {(alphaSuite.avgOptimalBidAskSpreadBps / 2).toFixed(1)} bps half-spread)
            </span>
          </div>
          <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Toxic Flow Adverse Selection:{' '}
            <span
              className={
                alphaSuite.adverseSelectionRatioPct >= 45
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-slate-800 dark:text-slate-200 font-semibold'
              }
            >
              {alphaSuite.adverseSelectionRatioPct.toFixed(1)}%
            </span>{' '}
            · Skew q: {strategyConfig.inventorySkewPct > 0 ? '+' : ''}
            {strategyConfig.inventorySkewPct}%
          </div>
        </div>

        {/* KPI 3: Strategy Sharpe Ratio & Gross Notional */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Multi-Book Sharpe Ratio (Stressed vs Base)
            </span>
            <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2 tabular-nums">
            <span
              className={`text-xl font-semibold ${
                alphaSuite.stressedSharpeRatio >= 1.2
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : alphaSuite.stressedSharpeRatio >= 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {alphaSuite.stressedSharpeRatio.toFixed(2)}x
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              vs {alphaSuite.baselineSharpeRatio.toFixed(2)}x Baseline
            </span>
          </div>
          <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            AUM: <span className="text-slate-800 dark:text-slate-200">${strategyConfig.bookAumUsdMillions}M</span> ·
            Gross Notional:{' '}
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              ${alphaSuite.grossNotionalUsdMillions.toFixed(0)}M ({strategyConfig.grossLeverageMultiplier.toFixed(1)}x)
            </span>
          </div>
        </div>

        {/* KPI 4: Prime Broker Margin & Stop-Out Buffer */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Margin &amp; Repo Haircut Utilization
            </span>
            <ShieldAlert
              className={`w-4 h-4 shrink-0 ${
                alphaSuite.marginTelemetry.marginStatus === 'STOP_OUT_DELEVERAGING'
                  ? 'text-rose-500'
                  : alphaSuite.marginTelemetry.marginStatus === 'MARGIN_WARNING'
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="my-1.5 flex items-baseline gap-2 tabular-nums">
            <span
              className={`text-xl font-semibold ${
                alphaSuite.marginTelemetry.marginUtilizationPctOfAum >= 85
                  ? 'text-rose-600 dark:text-rose-400'
                  : alphaSuite.marginTelemetry.marginUtilizationPctOfAum >= 70
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {alphaSuite.marginTelemetry.marginUtilizationPctOfAum.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({alphaSuite.marginTelemetry.marginStatus.replace(/_/g, ' ')})
            </span>
          </div>
          <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Encumbered:{' '}
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              ${alphaSuite.marginTelemetry.totalEncumberedCapitalUsdM.toFixed(1)}M
            </span>{' '}
            · Free Cash:{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ${alphaSuite.marginTelemetry.unencumberedCashBufferUsdM.toFixed(1)}M
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Dual Control Deck: Left = Strategy Pod Parameters | Right = Live Synced Global Liquidity Squeeze */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200 dark:border-slate-800">
        {/* Left 7 Columns: Market-Maker & Multi-Book Strategy Configuration */}
        <div className="lg:col-span-7 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>01. Multi-Book Strategy &amp; Microstructure Parameters</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calibrate Avellaneda-Stoikov risk aversion (γ), order arrival (κ), inventory skew (q), and capital weights
              </p>
            </div>

            {/* Funding Leg Currency Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">Funding Leg:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {(['USD', 'JPY', 'CHF', 'EUR'] as const).map((ccy) => (
                  <button
                    key={ccy}
                    type="button"
                    onClick={() => handleConfigChange('fundingLegCurrency', ccy)}
                    className={`px-2 py-0.5 text-xs tabular-nums font-medium transition-colors cursor-pointer ${
                      strategyConfig.fundingLegCurrency === ccy
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {ccy}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy Pod Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MARKET_MAKER_STRATEGY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectStrategyPreset(preset.id)}
                className={`p-2.5 text-left border transition-colors cursor-pointer ${
                  activePresetId === preset.id
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-600 dark:border-emerald-500'
                    : 'bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {preset.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {preset.subtitle}
                </div>
              </button>
            ))}
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            {/* Slider 1: Book AUM ($M) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Pod AUM ($M)</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  ${strategyConfig.bookAumUsdMillions}M
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={1500}
                step={50}
                value={strategyConfig.bookAumUsdMillions}
                onChange={(e) => handleConfigChange('bookAumUsdMillions', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>$200M</span>
                <span>$850M</span>
                <span>$1,500M</span>
              </div>
            </div>

            {/* Slider 2: Gross Leverage Multiplier */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Gross Leverage</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {strategyConfig.grossLeverageMultiplier.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={8.0}
                step={0.5}
                value={strategyConfig.grossLeverageMultiplier}
                onChange={(e) =>
                  handleConfigChange('grossLeverageMultiplier', Number(e.target.value))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>1.0x</span>
                <span>4.5x</span>
                <span>8.0x</span>
              </div>
            </div>

            {/* Slider 3: Avellaneda-Stoikov Risk Aversion Gamma */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Risk Aversion (γ)
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {strategyConfig.avellanedaRiskAversionGamma.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={strategyConfig.avellanedaRiskAversionGamma}
                onChange={(e) =>
                  handleConfigChange('avellanedaRiskAversionGamma', Number(e.target.value))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>0.05 (Tight)</span>
                <span>0.50</span>
                <span>1.00 (Wide)</span>
              </div>
            </div>

            {/* Slider 4: Inventory Skew q (%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Inventory Skew (q)
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {strategyConfig.inventorySkewPct > 0 ? '+' : ''}
                  {strategyConfig.inventorySkewPct}%
                </span>
              </div>
              <input
                type="range"
                min={-80}
                max={80}
                step={5}
                value={strategyConfig.inventorySkewPct}
                onChange={(e) => handleConfigChange('inventorySkewPct', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>-80% (Short)</span>
                <span>0% (Neutral)</span>
                <span>+80% (Long)</span>
              </div>
            </div>

            {/* Slider 5: Order Arrival Intensity Kappa */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Order Arrival (κ)
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {strategyConfig.orderArrivalIntensityKappa.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={strategyConfig.orderArrivalIntensityKappa}
                onChange={(e) =>
                  handleConfigChange('orderArrivalIntensityKappa', Number(e.target.value))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>0.5 (Illiquid)</span>
                <span>1.7</span>
                <span>3.0 (Deep)</span>
              </div>
            </div>

            {/* Slider 6: CIP Basis Book Allocation Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  CIP Basis Share
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {alphaSuite.config.cipArbBookWeightPct.toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={75}
                step={5}
                value={strategyConfig.cipArbBookWeightPct}
                onChange={(e) => {
                  const newCip = Number(e.target.value);
                  const rem = Math.max(10, 100 - newCip);
                  setActivePresetId('custom');
                  setStrategyConfig((prev) => ({
                    ...prev,
                    cipArbBookWeightPct: newCip,
                    mmBookWeightPct: Math.round(rem * 0.55),
                    carryBookWeightPct: Math.max(5, rem - Math.round(rem * 0.55)),
                  }));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400">
                <span>MM {alphaSuite.config.mmBookWeightPct.toFixed(0)}%</span>
                <span>CIP {alphaSuite.config.cipArbBookWeightPct.toFixed(0)}%</span>
                <span>Carry {alphaSuite.config.carryBookWeightPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* CRO Auto-Deleverage Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={strategyConfig.autoDeleverageOnMarginCall}
                onChange={(e) =>
                  handleConfigChange('autoDeleverageOnMarginCall', e.target.checked)
                }
                className="accent-emerald-600"
              />
              <span className="font-medium">
                Enforce CRO Dynamic Stop-Out &amp; Auto-Deleveraging on Margin Warning (&gt;70% AUM Encumbrance)
              </span>
            </label>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              Effective Post-Haircut Leverage: {alphaSuite.marginTelemetry.effectiveLeverageAfterHaircut.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Live Two-Way Synced Global Liquidity & Funding Squeeze Simulator */}
        <div className="lg:col-span-5 p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>02. Live Global Liquidity Squeeze Link (2-Way Sync)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronized with Global Liquidity &amp; XCCY Desk — shocks feed strategy funding drag live
              </p>
            </div>
            <span className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
              Z = {liquiditySuite.globalLiquidityStressIndexZScore >= 0 ? '+' : ''}
              {liquiditySuite.globalLiquidityStressIndexZScore.toFixed(2)}σ
            </span>
          </div>

          {/* Historical Liquidity Crisis Regime Presets */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'baseline', label: 'Baseline Plumbing' },
                { id: 'repo_2019', label: 'Sep 2019 Repo Spike' },
                { id: 'euro_2011', label: '2011 Euro USD Squeeze' },
                { id: 'covid_2020', label: 'Mar 2020 Dash-for-Cash' },
                { id: 'gfc_2008', label: '2008 GFC Freeze' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLiquidityPresetSelect(preset.id)}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  stressParams.presetId === preset.id
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 4 Synchronized Funding Squeeze Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">Offshore USD Basis Shock</span>
                <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  -{stressParams.usdBasisSqueezeBps} bps
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                step={5}
                value={stressParams.usdBasisSqueezeBps}
                onChange={(e) =>
                  handleLiquiditySliderChange('usdBasisSqueezeBps', Number(e.target.value))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">LIBOR/FRA-OIS &amp; Repo Shock</span>
                <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  +{stressParams.interbankFraOisShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={stressParams.interbankFraOisShockBps}
                onChange={(e) =>
                  handleLiquiditySliderChange('interbankFraOisShockBps', Number(e.target.value))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">Fed QT &amp; TGA Drain</span>
                <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  ${stressParams.fedQtAndTgaDrainUsdBn}B
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={stressParams.fedQtAndTgaDrainUsdBn}
                onChange={(e) =>
                  handleLiquiditySliderChange('fedQtAndTgaDrainUsdBn', Number(e.target.value))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">G-SIB Turn Scarcity</span>
                <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  {stressParams.gsibTurnWindowDressingMultiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.05}
                value={stressParams.gsibTurnWindowDressingMultiplier}
                onChange={(e) =>
                  handleLiquiditySliderChange(
                    'gsibTurnWindowDressingMultiplier',
                    Number(e.target.value)
                  )
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Live Plumbing Readout Strip */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-slate-600 dark:text-slate-300">
            <span>
              SOFR: <strong>{liquiditySuite.usSofrRatePct.toFixed(2)}%</strong>
            </span>
            <span>·</span>
            <span>
              GC Repo: <strong>{liquiditySuite.usGcRepoRatePct.toFixed(2)}%</strong>
            </span>
            <span>·</span>
            <span>
              US 3M fra-OIS: <strong>{liquiditySuite.us3mFraOisSpreadBps.toFixed(1)} bps</strong>
            </span>
            <span>·</span>
            <span>
              Fed SRF/Swaps:{' '}
              <strong>
                ${(liquiditySuite.fedSrfDrawsUsdBn + liquiditySuite.fedSwapLinesTotalUsdBn).toFixed(0)}B
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3-Book Quantitative Architecture Breakdown */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>03. Strategy Book Performance &amp; Funding Squeeze Decomposition</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct comparison of Gross Alpha capture vs. Repo Haircut Financing Drag and XCCY Basis Squeeze MTM across the 3 books
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {alphaSuite.books.map((book) => (
            <div
              key={book.bookId}
              className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {book.bookName}
                  </span>
                  <span className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {book.weightPct.toFixed(0)}% (${book.allocatedNotionalUsdMillions.toFixed(0)}M)
                  </span>
                </div>
                <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400 mt-1">
                  {book.modelSpecification}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs tabular-nums">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Gross Book Alpha
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{book.grossAlphaBps.toFixed(1)} bps
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Repo &amp; Funding Drag
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    -{book.fundingAndRepoDragBps.toFixed(1)} bps
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Squeeze MTM Shock
                  </span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -{book.squeezeMtmAndSlippageDragBps.toFixed(1)} bps
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Net Book PnL (30D)
                  </span>
                  <span
                    className={`font-semibold ${
                      book.netPnlUsdMillions >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {book.netPnlUsdMillions >= 0 ? '+' : ''}${book.netPnlUsdMillions.toFixed(2)}M (
                    {book.netAlphaBps >= 0 ? '+' : ''}
                    {book.netAlphaBps.toFixed(1)} bps)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={book.primaryRiskDriver}>
                  {book.primaryRiskDriver}
                </span>
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  Sharpe: {book.stressedAnnualizedSharpe.toFixed(2)}x
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time PnL Waterfall Decomposition & 30-Day Cumulative Equity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200 dark:border-slate-800">
        {/* Left 6 Columns: Real-Time PnL Waterfall Attribution */}
        <div className="lg:col-span-6 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              04. Real-Time PnL Waterfall Attribution (Alpha vs. Funding Squeeze Drag)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              30-day attribution from Gross Quoting, CIP &amp; Carry Alpha to Net Strategy PnL ($M and bps of AUM)
            </p>
          </div>

          <div className="space-y-2.5">
            {alphaSuite.waterfall.map((step) => {
              const widthPct = Math.min(
                100,
                Math.max(6, (Math.abs(step.valueUsdMillions) / maxWaterfallAbs) * 100)
              );
              const isPositive = step.valueUsdMillions >= 0;
              const barColor =
                step.category === 'NET_TOTAL'
                  ? isPositive
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-rose-600 dark:bg-rose-500'
                  : step.category === 'GROSS_ALPHA'
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : step.category === 'FUNDING_DRAG'
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-rose-600 dark:bg-rose-500';

              return (
                <div
                  key={step.stepId}
                  className={`p-2.5 border ${
                    step.category === 'NET_TOTAL'
                      ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {step.label}
                    </span>
                    <div className="tabular-nums flex items-center gap-2 shrink-0">
                      <span
                        className={`font-semibold ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}${step.valueUsdMillions.toFixed(2)}M
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({isPositive ? '+' : ''}
                        {step.valueBpsOfAum.toFixed(0)} bps AUM)
                      </span>
                    </div>
                  </div>

                  {/* Proportional Horizontal Bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 my-1.5 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-transform duration-150`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="truncate">{step.driverDetail}</span>
                    <span className="shrink-0">
                      Cum: {step.cumulativeUsdMillions >= 0 ? '+' : ''}$
                      {step.cumulativeUsdMillions.toFixed(2)}M
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Columns: 30-Day Cumulative Equity Curve (Baseline vs Stressed Funding Squeeze) */}
        <div className="lg:col-span-6 p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                05. 30-Day Cumulative Equity Curve (Baseline vs. Funding Squeeze)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click or scrub days D1–D30 to inspect funding squeeze drawdown &amp; CRO stop-out stabilization
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                Baseline
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                Active Regime
              </span>
            </div>
          </div>

          {/* SVG Equity Curve Chart */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-56 select-none"
              role="img"
              aria-label="30-Day Cumulative Strategy Equity Curve"
            >
              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const val = maxPnl - t * pnlSpan;
                const y = padT + t * plotH;
                return (
                  <g key={idx}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-500 dark:fill-slate-400 text-xs tabular-nums"
                    >
                      {val >= 0 ? `+$${val.toFixed(0)}M` : `-$${Math.abs(val).toFixed(0)}M`}
                    </text>
                  </g>
                );
              })}

              {/* Zero PnL Reference Line */}
              {zeroY >= padT && zeroY <= svgH - padB && (
                <line
                  x1={padL}
                  y1={zeroY}
                  x2={svgW - padR}
                  y2={zeroY}
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-600"
                  strokeWidth={1.2}
                />
              )}

              {/* Funding Squeeze Window Highlight (Days 8 to 19) */}
              <rect
                x={toX(8)}
                y={padT}
                width={toX(19) - toX(8)}
                height={plotH}
                className="fill-rose-500/5 dark:fill-rose-500/10"
              />
              <text
                x={(toX(8) + toX(19)) / 2}
                y={padT + 12}
                textAnchor="middle"
                className="fill-rose-600 dark:fill-rose-400 text-xs tabular-nums"
              >
                Funding Squeeze Window (D8–D19)
              </text>

              {/* Baseline Unstressed Trajectory */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 3"
                points={baselinePoints}
              />

              {/* Active Stressed Trajectory */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2.5}
                points={stressedPoints}
              />

              {/* Inspected Day Vertical Cursor */}
              <line
                x1={toX(activeDayPoint.day)}
                y1={padT}
                x2={toX(activeDayPoint.day)}
                y2={svgH - padB}
                stroke="#3b82f6"
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
              <circle
                cx={toX(activeDayPoint.day)}
                cy={toY(activeDayPoint.baselineCumulativePnlUsdM)}
                r={4}
                className="fill-emerald-500"
              />
              <circle
                cx={toX(activeDayPoint.day)}
                cy={toY(activeDayPoint.stressedCumulativePnlUsdM)}
                r={4.5}
                className="fill-blue-400 stroke-slate-900"
                strokeWidth={1.5}
              />

              {/* X-Axis Day Labels */}
              {[1, 5, 10, 15, 20, 25, 30].map((d) => (
                <text
                  key={d}
                  x={toX(d)}
                  y={svgH - 10}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-xs tabular-nums"
                >
                  Day {d}
                </text>
              ))}
            </svg>

            {/* Day Scrubber Slider */}
            <div className="px-3 pt-1 pb-2 flex items-center gap-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                Inspect Horizon: Day {activeDayPoint.day}
              </span>
              <input
                type="range"
                min={1}
                max={30}
                value={inspectedDay}
                onChange={(e) => setInspectedDay(Number(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300 shrink-0">
                Active: {activeDayPoint.stressedCumulativePnlUsdM >= 0 ? '+' : ''}$
                {activeDayPoint.stressedCumulativePnlUsdM.toFixed(2)}M vs Base +$
                {activeDayPoint.baselineCumulativePnlUsdM.toFixed(2)}M
              </span>
            </div>
          </div>

          {/* Prime Broker Margin Utilization & Repo Encumbrance Diagnostic Panel */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Prime Broker Margin, Repo Haircut &amp; Stop-Out Telemetry
              </span>
              <span className="tabular-nums text-slate-600 dark:text-slate-300">
                Stop-Out Trigger: 85.0% AUM
              </span>
            </div>

            {/* Stacked Capital Encumbrance Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
              <div
                title={`Initial Margin: $${alphaSuite.marginTelemetry.initialMarginRequiredUsdM}M`}
                className="bg-blue-600 h-full"
                style={{
                  width: `${Math.min(
                    100,
                    (alphaSuite.marginTelemetry.initialMarginRequiredUsdM /
                      strategyConfig.bookAumUsdMillions) *
                      100
                  )}%`,
                }}
              />
              <div
                title={`Repo Haircut Encumbrance: $${alphaSuite.marginTelemetry.repoHaircutEncumbranceUsdM}M`}
                className="bg-amber-500 h-full"
                style={{
                  width: `${Math.min(
                    100,
                    (alphaSuite.marginTelemetry.repoHaircutEncumbranceUsdM /
                      strategyConfig.bookAumUsdMillions) *
                      100
                  )}%`,
                }}
              />
              <div
                title={`Variation Margin Call: $${alphaSuite.marginTelemetry.variationMarginCallUsdM}M`}
                className="bg-rose-600 h-full"
                style={{
                  width: `${Math.min(
                    100,
                    (alphaSuite.marginTelemetry.variationMarginCallUsdM /
                      strategyConfig.bookAumUsdMillions) *
                      100
                  )}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Initial Margin</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  ${alphaSuite.marginTelemetry.initialMarginRequiredUsdM.toFixed(1)}M
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Repo Haircut Drag</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  ${alphaSuite.marginTelemetry.repoHaircutEncumbranceUsdM.toFixed(1)}M
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Variation Margin</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  ${alphaSuite.marginTelemetry.variationMarginCallUsdM.toFixed(1)}M
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Distance to Stop</span>
                <span
                  className={`font-semibold ${
                    alphaSuite.marginTelemetry.distanceToStopOutPct <= 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {alphaSuite.marginTelemetry.distanceToStopOutPct >= 0 ? '+' : ''}
                  {alphaSuite.marginTelemetry.distanceToStopOutPct.toFixed(1)}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {alphaSuite.marginTelemetry.primeBrokerDiagnostic}
            </p>
          </div>
        </div>
      </div>

      {/* 12-Corridor Strategy Greeks, Sharpe Ratio & DV01 / FX Delta Exposure Matrix */}
      <div className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              06. Strategy Greeks, Quoting Spreads, Sharpe Ratio &amp; DV01 / FX Delta Exposure Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corridor-by-corridor execution quotes, CIP arbitrage pickup, carry differential, repo drag, and risk sensitivities
            </p>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              {(['ALL', 'G10', 'EM'] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setRegionFilter(grp)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    regionFilter === grp
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {grp === 'ALL' ? 'All Corridors (12)' : `${grp} Desk`}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              {(
                [
                  { id: 'ALL', label: 'All Books' },
                  { id: 'AVELLANEDA_STOIKOV_MM', label: 'MM Quoting' },
                  { id: 'CIP_BASIS_ARB', label: 'CIP Basis' },
                  { id: 'SOVEREIGN_FX_CARRY', label: 'FX Carry' },
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBookFilter(b.id)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    bookFilter === b.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3">Corridor / Sovereign</th>
                <th className="py-2.5 px-2.5">Dominant Book</th>
                <th className="py-2.5 px-2.5 text-right">Notional</th>
                <th className="py-2.5 px-2.5 text-right">Bid-Ask (2δ*)</th>
                <th className="py-2.5 px-2.5 text-right">CIP Pickup</th>
                <th className="py-2.5 px-2.5 text-right">Carry Diff</th>
                <th className="py-2.5 px-2.5 text-right">Repo Drag</th>
                <th className="py-2.5 px-2.5 text-right">Squeeze MTM</th>
                <th className="py-2.5 px-2.5 text-right">Net Alpha (30D)</th>
                <th className="py-2.5 px-2.5 text-right">Sharpe</th>
                <th className="py-2.5 px-2.5 text-right">DV01 / FX Δ</th>
                <th className="py-2.5 px-3 text-right">Desk Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs tabular-nums">
              {filteredCorridors.map((row) => (
                <tr
                  key={row.corridorId}
                  className={`transition-colors ${
                    row.isTargetSovereign
                      ? 'bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{row.pairLabel}</span>
                      {row.isTargetSovereign && (
                        <span className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
                          [TARGET]
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.sovereignLabel} · {row.regionGroup}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 font-sans text-slate-700 dark:text-slate-300">
                    {row.dominantBookLabel}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-900 dark:text-slate-100 font-semibold">
                    ${row.notionalAllocationUsdM.toFixed(1)}M
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-800 dark:text-slate-200">
                    <div>{row.quotedBidAskSpreadBps.toFixed(1)} bps</div>
                    <div className="text-xs text-slate-500">
                      skew {row.reservationSpreadAdjustBps >= 0 ? '+' : ''}
                      {row.reservationSpreadAdjustBps.toFixed(1)}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-blue-600 dark:text-blue-400 font-semibold">
                    +{row.cipBasisPickupBps.toFixed(1)} bps
                  </td>
                  <td
                    className={`py-2.5 px-2.5 text-right ${
                      row.netCarryDifferentialBps >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {row.netCarryDifferentialBps >= 0 ? '+' : ''}
                    {row.netCarryDifferentialBps.toFixed(0)} bps
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-amber-600 dark:text-amber-400">
                    -{row.repoAndFundingDragBps.toFixed(1)} bps
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-rose-600 dark:text-rose-400">
                    -{row.squeezeBasisMtmShockBps.toFixed(1)} bps
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    <div
                      className={`font-semibold ${
                        row.netStrategyPnlUsdM >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.netStrategyPnlUsdM >= 0 ? '+' : ''}${row.netStrategyPnlUsdM.toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500">
                      ({row.netStrategyReturnBps >= 0 ? '+' : ''}
                      {row.netStrategyReturnBps.toFixed(1)} bps)
                    </div>
                  </td>
                  <td
                    className={`py-2.5 px-2.5 text-right font-semibold ${
                      row.stressedSharpeRatio >= 1.0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : row.stressedSharpeRatio >= 0
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {row.stressedSharpeRatio.toFixed(2)}x
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-700 dark:text-slate-300">
                    <div>${row.dv01UsdThousands.toFixed(0)}k/bp</div>
                    <div className="text-xs text-slate-500">
                      FX Δ ${row.fxDeltaUsdMillions.toFixed(1)}M
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${getSignalStyle(
                        row.executionSignal
                      )}`}
                    >
                      {row.executionSignal.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
