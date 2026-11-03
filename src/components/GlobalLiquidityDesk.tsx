import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Flame,
  Globe,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CouncilAssessmentRun,
  CurrencyFundingCorridorRow,
  LiquidityCrisisPresetId,
  LiquidityStressParams,
} from '../types/council';
import {
  computeGlobalLiquidityFundingSuite,
  DEFAULT_LIQUIDITY_STRESS_PARAMS,
  LIQUIDITY_CRISIS_PRESETS,
} from '../utils/globalLiquidityEngine';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface GlobalLiquidityDeskProps {
  run: CouncilAssessmentRun;
  stressParams?: LiquidityStressParams;
  onChangeStressParams?: (params: LiquidityStressParams) => void;
  onOpenMarketMakerDesk?: () => void;
}

export const GlobalLiquidityDesk: React.FC<GlobalLiquidityDeskProps> = ({
  run,
  stressParams: controlledStressParams,
  onChangeStressParams,
  onOpenMarketMakerDesk,
}) => {
  const [internalStressParams, setInternalStressParams] = useState<LiquidityStressParams>(
    DEFAULT_LIQUIDITY_STRESS_PARAMS
  );
  const stressParams = controlledStressParams ?? internalStressParams;
  const updateStressParams = (next: LiquidityStressParams) => {
    setInternalStressParams(next);
    if (onChangeStressParams) {
      onChangeStressParams(next);
    }
  };
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'G10' | 'EM'>('ALL');
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);

  const suite = useMemo(
    () => computeGlobalLiquidityFundingSuite(run.openData, stressParams),
    [run.openData, stressParams]
  );

  const filteredCorridors = useMemo(() => {
    if (regionFilter === 'ALL') return suite.corridors;
    return suite.corridors.filter((c) => c.regionGroup === regionFilter);
  }, [suite.corridors, regionFilter]);

  const targetCorridor = useMemo(() => {
    return suite.corridors.find((c) => c.isTargetSovereign) || suite.corridors[0];
  }, [suite.corridors]);

  const activeCorridor: CurrencyFundingCorridorRow = useMemo(() => {
    if (selectedCorridorId) {
      const found = suite.corridors.find((c) => c.corridorId === selectedCorridorId);
      if (found) return found;
    }
    return targetCorridor;
  }, [selectedCorridorId, suite.corridors, targetCorridor]);

  // Benchmark comparison corridor for term structure chart (EUR/USD or JPY/USD)
  const benchmarkCorridor = useMemo(() => {
    if (activeCorridor.currencyCode === 'JPY') {
      return suite.corridors.find((c) => c.currencyCode === 'EUR') || suite.corridors[0];
    }
    return suite.corridors.find((c) => c.currencyCode === 'JPY') || suite.corridors[0];
  }, [activeCorridor, suite.corridors]);

  const handlePresetSelect = (presetId: Exclude<LiquidityCrisisPresetId, 'custom'>) => {
    updateStressParams(LIQUIDITY_CRISIS_PRESETS[presetId].params);
  };

  const handleSliderChange = (key: keyof Omit<LiquidityStressParams, 'presetId'>, val: number) => {
    updateStressParams({
      ...stressParams,
      presetId: 'custom',
      [key]: val,
    });
  };

  const getBasisHeatmapStyle = (basisBps: number) => {
    if (basisBps <= -120) {
      return 'bg-rose-500/25 text-rose-200 border-rose-500/50';
    }
    if (basisBps <= -65) {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/35';
    }
    if (basisBps <= -30) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
    }
    if (basisBps < 0) {
      return 'bg-sky-500/10 text-sky-200 border-sky-500/25';
    }
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
  };

  const getFraOisHeatmapStyle = (spreadBps: number) => {
    if (spreadBps >= 80) {
      return 'bg-rose-500/25 text-rose-200 border-rose-500/50';
    }
    if (spreadBps >= 45) {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/35';
    }
    if (spreadBps >= 22) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
    }
    return 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25';
  };

  const getRegimeBadge = (status: CurrencyFundingCorridorRow['regimeStatus']) => {
    switch (status) {
      case 'ACUTE_DOLLAR_SHORTAGE':
        return {
          label: 'ACUTE DOLLAR SHORTAGE',
          classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'FUNDING_SQUEEZE':
        return {
          label: 'FUNDING SQUEEZE',
          classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'TURN_PRESSURE':
        return {
          label: 'TURN PRESSURE',
          classes: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
      default:
        return {
          label: 'AMPLE LIQUIDITY',
          classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
    }
  };

  // Term Structure SVG coordinates
  const svgWidth = 640;
  const svgHeight = 250;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 34;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const allBasisValues = [
    ...activeCorridor.termStructurePoints.flatMap((p) => [
      p.baselineBasisBps,
      p.stressedBasisBps,
    ]),
    ...benchmarkCorridor.termStructurePoints.map((p) => p.stressedBasisBps),
    20,
    -180,
  ];
  const minBasis = Math.min(...allBasisValues, -140);
  const maxBasis = Math.max(...allBasisValues, 25);
  const yRange = Math.max(40, maxBasis - minBasis);

  const toX = (idx: number, total: number) =>
    padLeft + (idx / Math.max(1, total - 1)) * plotW;
  const toY = (val: number) =>
    padTop + ((maxBasis - val) / yRange) * plotH;

  const buildPolyline = (vals: number[]) =>
    vals.map((v, i) => `${toX(i, vals.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return (
    <section
      aria-label="Global Liquidity and Funding Conditions Workbench"
      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm overflow-hidden"
    >
      {/* Top Institutional Header */}
      <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
              <Globe className="w-3 h-3" />
              GLOBAL MONEY MARKET & DOLLAR FUNDING DESK
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              XCCY BASIS SWAPS • LIBOR/FRA-OIS & RFR-OIS • FED SRF / ON RRP / SWAP LINES • CIP ARBITRAGE
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-100">
            Global Liquidity & Funding Conditions — Centralized Cross-Currency & Repo Plumbing Heatmap
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-5xl">
            <RichTextWithStatRefs text={suite.headlineConclusion} />
          </p>
          <StatRefBadge
            refText={`Statistical Reference: 5Y Cross-Currency (XCCY) Basis & CIP Deviation · ${targetCorridor.pairLabel} 5Y Basis ${targetCorridor.xccyBasis5YBps.toFixed(1)} bps · Global USD Funding Stress Z = ${suite.globalLiquidityStressIndexZScore >= 0 ? '+' : ''}${suite.globalLiquidityStressIndexZScore.toFixed(2)}σ · Fed Swap Line Usage $${suite.fedSwapLinesTotalUsdBn.toFixed(1)}B`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenMarketMakerDesk && (
            <button
              type="button"
              onClick={onOpenMarketMakerDesk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Market-Maker &amp; Alpha Desk (Live Sync)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="px-2.5 py-1.5 rounded-sm bg-slate-900/90 border border-slate-800 text-right">
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              ACTIVE SOVEREIGN CORRIDOR
            </div>
            <div className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
              {targetCorridor.pairLabel} ({run.countryName})
            </div>
          </div>
          {stressParams.presetId !== 'baseline' && (
            <button
              type="button"
              onClick={() => handlePresetSelect('baseline')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Reset Stress
            </button>
          )}
        </div>
      </div>

      {/* 4-Card Institutional KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 bg-[var(--bg-canvas)]/60 border-b border-[var(--border-subtle)]">
        {/* KPI 1: Global Liquidity Stress Z-Score */}
        <div className="p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              GLOBAL USD FUNDING STRESS INDEX
            </span>
            <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span
              className={`text-xl font-mono font-bold tabular-nums ${
                suite.globalLiquidityStressIndexZScore >= 2.0
                  ? 'text-rose-400'
                  : suite.globalLiquidityStressIndexZScore >= 1.0
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {suite.globalLiquidityStressIndexZScore >= 0 ? '+' : ''}
              {suite.globalLiquidityStressIndexZScore.toFixed(2)}σ
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300 border border-slate-700">
              {suite.globalLiquidityStressIndexZScore >= 2.2
                ? 'CRISIS SQUEEZE'
                : suite.globalLiquidityStressIndexZScore >= 1.0
                ? 'TURN TENSION'
                : 'NORMAL PLUMBING'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            Fed Reserves: <span className="text-slate-200">${suite.fedBankReservesUsdTn.toFixed(2)}T</span> • Net Liquidity:{' '}
            <span className="text-cyan-300">${suite.fedNetLiquidityImpulseUsdTn.toFixed(2)}T</span>
          </div>
        </div>

        {/* KPI 2: US Interbank LIBOR/FRA-OIS & Repo-SOFR */}
        <div className="p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              3M FRA/LIBOR-OIS & REPO-SOFR
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span
              className={`text-xl font-mono font-bold tabular-nums ${
                suite.us3mFraOisSpreadBps >= 45
                  ? 'text-rose-400'
                  : suite.us3mFraOisSpreadBps >= 22
                  ? 'text-amber-300'
                  : 'text-slate-100'
              }`}
            >
              +{suite.us3mFraOisSpreadBps.toFixed(1)} bps
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              GC-SOFR: +{suite.usGcRepoSofrSpreadBps.toFixed(1)} bps
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            SOFR: <span className="text-slate-200">{suite.usSofrRatePct.toFixed(2)}%</span> • EFFR:{' '}
            <span className="text-slate-200">{suite.usEffrRatePct.toFixed(2)}%</span> • GC Repo:{' '}
            <span className="text-amber-300">{suite.usGcRepoRatePct.toFixed(2)}%</span>
          </div>
        </div>

        {/* KPI 3: Fed Repo & Swap Line Liquidity Backstop */}
        <div className="p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              FED SRF + FIMA + CB SWAP DRAWS
            </span>
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
              ${(suite.fedSrfDrawsUsdBn + suite.fedFimaDrawsUsdBn + suite.fedSwapLinesTotalUsdBn).toFixed(1)}B
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              ON RRP: ${suite.fedOnRrpBalanceUsdBn.toFixed(0)}B
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            SRF: <span className="text-slate-200">${suite.fedSrfDrawsUsdBn.toFixed(1)}B</span> • Swap Lines:{' '}
            <span className="text-slate-200">${suite.fedSwapLinesTotalUsdBn.toFixed(1)}B</span> • FIMA:{' '}
            <span className="text-slate-200">${suite.fedFimaDrawsUsdBn.toFixed(1)}B</span>
          </div>
        </div>

        {/* KPI 4: Active Sovereign XCCY Basis & CIP Arbitrage */}
        <div className="p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {targetCorridor.pairLabel} 3M XCCY & CIP WEDGE
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span
              className={`text-xl font-mono font-bold tabular-nums ${
                targetCorridor.xccyBasis3MBps <= -75
                  ? 'text-rose-400'
                  : targetCorridor.xccyBasis3MBps <= -35
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {targetCorridor.xccyBasis3MBps > 0 ? '+' : ''}
              {targetCorridor.xccyBasis3MBps.toFixed(1)} bps
            </span>
            <span className="text-[11px] font-mono text-emerald-300 tabular-nums">
              CIP Pick-Up: +{targetCorridor.cipArbitragePickupBps.toFixed(1)} bps
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            Synthetic USD Cost:{' '}
            <span className="text-rose-300 font-semibold">
              {targetCorridor.syntheticUsdBorrowingCostPct.toFixed(2)}%
            </span>{' '}
            • 5Y Basis: <span className="text-slate-200">{targetCorridor.xccyBasis5YBps.toFixed(1)} bps</span>
          </div>
        </div>
      </div>

      {/* Interactive Dollar Funding Squeeze & Repo Stress Simulator */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-slate-950/50 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-200">
              Interactive Dollar Funding Squeeze & Central Bank Plumbing Simulator
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {stressParams.presetId === 'custom'
                ? 'CUSTOM STRESS SCENARIO'
                : LIQUIDITY_CRISIS_PRESETS[stressParams.presetId].shortBadge}
            </span>
          </div>

          {/* Historical Crisis Regime Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              Object.keys(LIQUIDITY_CRISIS_PRESETS) as Array<
                Exclude<LiquidityCrisisPresetId, 'custom'>
              >
            ).map((presetKey) => {
              const preset = LIQUIDITY_CRISIS_PRESETS[presetKey];
              const isActive = stressParams.presetId === presetKey;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => handlePresetSelect(presetKey)}
                  className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 font-bold'
                      : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Interactive Parameter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-300">Offshore USD Basis Squeeze</span>
              <span className="text-rose-300 font-bold tabular-nums">
                -{stressParams.usdBasisSqueezeBps} bps
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={stressParams.usdBasisSqueezeBps}
              onChange={(e) => handleSliderChange('usdBasisSqueezeBps', Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>0 bps (Normal)</span>
              <span>-75 bps (Squeeze)</span>
              <span>-150 bps (2008 Freeze)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-300">LIBOR / FRA-OIS Credit Shock</span>
              <span className="text-amber-300 font-bold tabular-nums">
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
                handleSliderChange('interbankFraOisShockBps', Number(e.target.value))
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>0 bps</span>
              <span>+60 bps (Euro 2011)</span>
              <span>+120 bps (Lehman)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-300">Fed QT & TGA Reserve Drain</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                ${stressParams.fedQtAndTgaDrainUsdBn}B
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={25}
              value={stressParams.fedQtAndTgaDrainUsdBn}
              onChange={(e) => handleSliderChange('fedQtAndTgaDrainUsdBn', Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>$0B (Ample)</span>
              <span>$500B</span>
              <span>$1,000B (Sept 2019)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-300">G-SIB Turn Window Dressing</span>
              <span className="text-purple-300 font-bold tabular-nums">
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
                handleSliderChange('gsibTurnWindowDressingMultiplier', Number(e.target.value))
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>1.00x (Intra-Qtr)</span>
              <span>1.75x (Q4 Turn)</span>
              <span>2.50x (GSIB Cap)</span>
            </div>
          </div>
        </div>

        {/* Live Transmission Banner to Sovereign Rollover & Portfolio VaR */}
        <div className="p-3 rounded-sm bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-between md:border-r md:border-slate-800 md:pr-3">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                {run.countryName} External Rollover Shock
              </div>
              <div className="text-sm font-mono font-bold text-rose-300 tabular-nums">
                +{suite.portfolioTransmission.targetSovereignExternalRolloverSpreadDeltaBps} bps
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>

          <div className="flex items-center justify-between md:border-r md:border-slate-800 md:pr-3">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                FX-Hedged Rollover Carry Cost (1Y)
              </div>
              <div className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                {suite.portfolioTransmission.targetSovereignFxHedgeCarryCostPct.toFixed(2)}% p.a.
              </div>
            </div>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>

          <div className="flex items-center justify-between md:border-r md:border-slate-800 md:pr-3">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Portfolio Liquidity-Adjusted VaR (LVaR)
              </div>
              <div className="text-sm font-mono font-bold text-rose-400 tabular-nums">
                +{suite.portfolioTransmission.portfolioFundingLvarDeltaPctNav.toFixed(2)}% NAV
              </div>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Required Repo / Variation Margin Buffer
              </div>
              <div className="text-sm font-mono font-bold text-cyan-300 tabular-nums">
                ${suite.portfolioTransmission.estimatedMarginCallBufferUsdMillions}M USD
              </div>
            </div>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* SECTION 1: Centralized Global Liquidity & Cross-Currency Basis Heatmap */}
      <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-100">
              1. Centralized Global Liquidity, Cross-Currency Basis (XCCY) & Interbank Spread Heatmap
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any G10 or EM currency corridor row to inspect its full 1M–10Y Cross-Currency Basis Term Structure and Covered Interest Parity (CIP) arbitrage wedge below.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'G10', 'EM'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRegionFilter(tab)}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                  regionFilter === tab
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {tab === 'ALL' ? `ALL CORRIDORS (${suite.corridors.length})` : `${tab} CORRIDORS`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-slate-950/90 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Funding Corridor</th>
                <th className="py-2.5 px-2.5 text-right">Spot / Policy</th>
                <th className="py-2.5 px-2.5 text-right">3M XCCY Basis</th>
                <th className="py-2.5 px-2.5 text-right">1Y XCCY Basis</th>
                <th className="py-2.5 px-2.5 text-right">5Y XCCY Basis</th>
                <th className="py-2.5 px-2.5 text-right">3M FRA/LIBOR-OIS</th>
                <th className="py-2.5 px-2.5 text-right">RFR-OIS Spread</th>
                <th className="py-2.5 px-2.5 text-right">Repo Haircut</th>
                <th className="py-2.5 px-2.5 text-right">CB Swap/Repo Draw</th>
                <th className="py-2.5 px-2.5 text-right">CIP UST Pick-Up</th>
                <th className="py-2.5 px-3 text-right">Plumbing Regime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {filteredCorridors.map((row) => {
                const isSelected = row.corridorId === activeCorridor.corridorId;
                const badge = getRegimeBadge(row.regimeStatus);
                return (
                  <tr
                    key={row.corridorId}
                    onClick={() => setSelectedCorridorId(row.corridorId)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/12 hover:bg-cyan-500/15'
                        : row.isTargetSovereign
                        ? 'bg-amber-500/5 hover:bg-slate-900/80'
                        : 'hover:bg-slate-900/70'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold border ${
                            row.regionGroup === 'G10'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {row.regionGroup}
                        </span>
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{row.pairLabel}</span>
                            {row.isTargetSovereign && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-sm">
                                ACTIVE SOVEREIGN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {row.sovereignLabel} • {row.rfrBenchmarkName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <div className="text-slate-200">{row.spotRateVsUsd.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">
                        Pol: {row.domesticPolicyRatePct.toFixed(2)}%
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm border font-bold ${getBasisHeatmapStyle(
                          row.xccyBasis3MBps
                        )}`}
                      >
                        {row.xccyBasis3MBps > 0 ? '+' : ''}
                        {row.xccyBasis3MBps.toFixed(1)} bps
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm border ${getBasisHeatmapStyle(
                          row.xccyBasis1YBps
                        )}`}
                      >
                        {row.xccyBasis1YBps > 0 ? '+' : ''}
                        {row.xccyBasis1YBps.toFixed(1)} bps
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm border ${getBasisHeatmapStyle(
                          row.xccyBasis5YBps
                        )}`}
                      >
                        {row.xccyBasis5YBps > 0 ? '+' : ''}
                        {row.xccyBasis5YBps.toFixed(1)} bps
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm border font-semibold ${getFraOisHeatmapStyle(
                          row.liborOrFraOisSpreadBps
                        )}`}
                      >
                        +{row.liborOrFraOisSpreadBps.toFixed(1)} bps
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums text-slate-200">
                      +{row.rfrOisSpreadBps.toFixed(1)} bps
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums text-slate-200">
                      {row.repoHaircutPct.toFixed(1)}%
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums font-semibold text-cyan-300">
                      ${row.cbSwapOrRepoDrawUsdBn.toFixed(1)}B
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums">
                      <div className="text-emerald-300 font-bold">
                        +{row.cipArbitragePickupBps.toFixed(1)} bps
                      </div>
                      <div className="text-[10px] text-slate-400">
                        USD Cost: {row.syntheticUsdBorrowingCostPct.toFixed(2)}%
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono uppercase border ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          Z = {row.compositeStressZScore >= 0 ? '+' : ''}
                          {row.compositeStressZScore.toFixed(2)}σ
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Cross-Currency Basis Term Structure (1M to 10Y) & CIP Arbitrage Matrix */}
      <div className="p-4 border-b border-[var(--border-subtle)] grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left 7 Cols: Interactive SVG XCCY Term Structure Curve */}
        <div className="xl:col-span-7 p-3.5 rounded-sm bg-slate-950/70 border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-100">
                2A. Cross-Currency Basis Swap Term Structure (1M to 10Y) — {activeCorridor.pairLabel}
              </h3>
              <p className="text-[11px] text-slate-400">
                Comparing {activeCorridor.pairLabel} Stressed Curve (solid cyan) vs. Baseline Curve (dashed slate) and {benchmarkCorridor.pairLabel} Benchmark (amber).
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                {activeCorridor.pairLabel} (Active)
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 border-b border-dashed border-slate-400 inline-block" />
                Baseline
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                {benchmarkCorridor.pairLabel}
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[480px] select-none"
              role="img"
              aria-label={`Cross-currency basis term structure for ${activeCorridor.pairLabel}`}
            >
              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const val = maxBasis - t * yRange;
                const y = padTop + t * plotH;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeDasharray={Math.abs(val) < 5 ? undefined : '3 3'}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {Math.round(val)} bps
                    </text>
                  </g>
                );
              })}

              {/* Zero Parity Reference Line if within range */}
              {maxBasis >= 0 && minBasis <= 0 && (
                <line
                  x1={padLeft}
                  y1={toY(0)}
                  x2={svgWidth - padRight}
                  y2={toY(0)}
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth={1.2}
                />
              )}

              {/* Baseline Curve (Dashed) */}
              <polyline
                fill="none"
                stroke="rgba(148, 163, 184, 0.65)"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                points={buildPolyline(
                  activeCorridor.termStructurePoints.map((p) => p.baselineBasisBps)
                )}
              />

              {/* Benchmark Corridor Stressed Curve */}
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth={1.75}
                points={buildPolyline(
                  benchmarkCorridor.termStructurePoints.map((p) => p.stressedBasisBps)
                )}
              />

              {/* Active Corridor Stressed Curve */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth={2.5}
                points={buildPolyline(
                  activeCorridor.termStructurePoints.map((p) => p.stressedBasisBps)
                )}
              />

              {/* Tenor Nodes & Labels */}
              {activeCorridor.termStructurePoints.map((pt, i) => {
                const x = toX(i, activeCorridor.termStructurePoints.length);
                const yStress = toY(pt.stressedBasisBps);
                return (
                  <g key={pt.tenor}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={svgHeight - padBottom}
                      stroke="rgba(148, 163, 184, 0.08)"
                    />
                    <circle
                      cx={x}
                      cy={yStress}
                      r={4}
                      fill="#0891b2"
                      stroke="#ecfeff"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x}
                      y={yStress - 9}
                      textAnchor="middle"
                      className="fill-cyan-200 text-[10px] font-mono font-bold"
                    >
                      {pt.stressedBasisBps.toFixed(0)}
                    </text>
                    <text
                      x={x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      className="fill-slate-300 text-[10px] font-mono font-semibold"
                    >
                      {pt.tenor}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="p-2.5 rounded-sm bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="font-mono text-slate-300">
              <span className="text-cyan-300 font-bold">DESK TRADE EXPRESSION:</span>{' '}
              {activeCorridor.deskTradeExpression}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Covered Interest Parity (CIP) Arbitrage & Synthetic Funding Matrix */}
        <div className="xl:col-span-5 p-3.5 rounded-sm bg-slate-950/70 border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-100">
              2B. Covered Interest Parity (CIP) Arbitrage & Synthetic USD Matrix ({activeCorridor.pairLabel})
            </h3>
            <p className="text-[11px] text-slate-400">
              Term-by-term breakdown of FX-swap implied USD funding rates and risk-free US Treasury asset-swap pick-up over {activeCorridor.rfrBenchmarkName}.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-sm">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase text-slate-400">
                  <th className="py-2 px-2.5">Tenor</th>
                  <th className="py-2 px-2.5 text-right">Baseline XCCY</th>
                  <th className="py-2 px-2.5 text-right">Stressed XCCY</th>
                  <th className="py-2 px-2.5 text-right">Implied USD Cost</th>
                  <th className="py-2 px-2.5 text-right">FX-Hedged UST Pick-Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 tabular-nums">
                {activeCorridor.termStructurePoints.map((pt) => (
                  <tr key={pt.tenor} className="hover:bg-slate-900/60">
                    <td className="py-1.5 px-2.5 font-bold text-slate-200">{pt.tenor}</td>
                    <td className="py-1.5 px-2.5 text-right text-slate-400">
                      {pt.baselineBasisBps > 0 ? '+' : ''}
                      {pt.baselineBasisBps.toFixed(1)} bps
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-rose-300">
                      {pt.stressedBasisBps > 0 ? '+' : ''}
                      {pt.stressedBasisBps.toFixed(1)} bps
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-amber-300">
                      {pt.cipImpliedUsdRatePct.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-emerald-300">
                      +{pt.hedgedUstPickupBps.toFixed(1)} bps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-sm bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-cyan-400 font-semibold mb-1">
                IB SOVEREIGN & CORPORATE TREASURY MANDATE
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {suite.portfolioTransmission.ibTreasuryAdvisoryMandate}
              </p>
            </div>
            <div className="p-2.5 rounded-sm bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold mb-1">
                HEDGE FUND MACRO RV & BASIS ARBITRAGE
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {suite.portfolioTransmission.hfRelativeValueArbitrageTrade}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Central Bank Repo Facility & USD Swap Line Plumbing Monitor */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-100">
              3. Central Bank Repo Facilities (Fed SRF, ON RRP, FIMA) & Standing USD Liquidity Swap Lines
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time utilization, collateral eligibility, and reserve scarcity signals across Federal Reserve, ECB, BoJ, PBoC, and {run.countryName} liquidity backstops.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
             Total Official Liquidity Backstop Deployed: $
            {suite.centralBankFacilities
              .reduce((acc, f) => acc + f.stressedUsageUsdBn, 0)
              .toFixed(1)}
            B
          </span>
        </div>

        <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-slate-950/90 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Central Bank & Facility</th>
                <th className="py-2.5 px-2.5 text-right">Award / Offering Rate</th>
                <th className="py-2.5 px-2.5 text-right">Baseline Usage</th>
                <th className="py-2.5 px-2.5 text-right">Stressed Usage</th>
                <th className="py-2.5 px-3">Facility Capacity & Utilization</th>
                <th className="py-2.5 px-2.5">Eligible Collateral & Scope</th>
                <th className="py-2.5 px-3 text-right">Reserve Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {suite.centralBankFacilities.map((fac) => {
                const signalStyles =
                  fac.reserveScarcitySignal === 'CRITICAL_DRAIN'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : fac.reserveScarcitySignal === 'SCARCE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : fac.reserveScarcitySignal === 'AMPLE'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

                return (
                  <tr key={fac.facilityId} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-100">{fac.facilityName}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {fac.centralBank} • <span className="font-mono text-cyan-300">{fac.tickerCode}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums text-slate-200">
                      {fac.policyRatePct.toFixed(2)}%
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums text-slate-400">
                      ${fac.currentUsageUsdBn.toFixed(1)}B
                    </td>

                    <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-cyan-300">
                      ${fac.stressedUsageUsdBn.toFixed(1)}B
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-between text-[10px] mb-1 tabular-nums">
                        <span className="text-slate-400">{fac.capacityLimitLabel}</span>
                        <span className="text-slate-200 font-bold">
                          {fac.utilizationPctOfCap.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                        <div
                          className={`h-full ${
                            fac.utilizationPctOfCap > 65
                              ? 'bg-rose-400'
                              : fac.utilizationPctOfCap > 35
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, fac.utilizationPctOfCap))}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 font-sans">
                      <div className="text-[11px] text-slate-200">{fac.collateralAccepted}</div>
                      <div className="text-[10px] text-slate-400">{fac.plumbingNotes}</div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-mono uppercase border ${signalStyles}`}
                      >
                        {fac.reserveScarcitySignal.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
