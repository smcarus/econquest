import {
  CorridorStrategyAlphaRow,
  GlobalLiquidityFundingSuite,
  MarginAndStopOutTelemetry,
  MarketMakerBookId,
  MarketMakerSimulationSuite,
  MarketMakerStrategyConfig,
  OpenDataSnapshot,
  PnLWaterfallStep,
  StrategyBookSummary,
  StrategyEquityCurveDay,
} from '../types/council';
import {
  computeGlobalLiquidityFundingSuite,
  DEFAULT_LIQUIDITY_STRESS_PARAMS,
} from './globalLiquidityEngine';

export const DEFAULT_MARKET_MAKER_STRATEGY_CONFIG: MarketMakerStrategyConfig = {
  bookAumUsdMillions: 500,
  grossLeverageMultiplier: 3.5,
  avellanedaRiskAversionGamma: 0.35,
  inventorySkewPct: 15,
  orderArrivalIntensityKappa: 1.45,
  mmBookWeightPct: 35,
  cipArbBookWeightPct: 40,
  carryBookWeightPct: 25,
  fundingLegCurrency: 'USD',
  autoDeleverageOnMarginCall: true,
};

export interface StrategyPresetDefinition {
  id: string;
  label: string;
  subtitle: string;
  config: MarketMakerStrategyConfig;
}

export const MARKET_MAKER_STRATEGY_PRESETS: StrategyPresetDefinition[] = [
  {
    id: 'balanced_multi_strat',
    label: 'Balanced Multi-Book Pod ($500M · 3.5x)',
    subtitle: '35% Avellaneda-Stoikov MM · 40% XCCY CIP Basis · 25% Sovereign Carry',
    config: DEFAULT_MARKET_MAKER_STRATEGY_CONFIG,
  },
  {
    id: 'cip_basis_harvester',
    label: 'G10/EM XCCY Basis Arbitrage Desk ($750M · 4.5x)',
    subtitle: 'Heavy CIP basis harvest & FX-hedged UST pickup; low directional FX skew',
    config: {
      bookAumUsdMillions: 750,
      grossLeverageMultiplier: 4.5,
      avellanedaRiskAversionGamma: 0.5,
      inventorySkewPct: 5,
      orderArrivalIntensityKappa: 1.65,
      mmBookWeightPct: 20,
      cipArbBookWeightPct: 65,
      carryBookWeightPct: 15,
      fundingLegCurrency: 'USD',
      autoDeleverageOnMarginCall: true,
    },
  },
  {
    id: 'hft_dealer_liquidity',
    label: 'Principal Market-Maker & Dealer Flow ($400M · 2.5x)',
    subtitle: 'High-turnover Avellaneda-Stoikov bid/ask quoting with strict inventory control',
    config: {
      bookAumUsdMillions: 400,
      grossLeverageMultiplier: 2.5,
      avellanedaRiskAversionGamma: 0.25,
      inventorySkewPct: -10,
      orderArrivalIntensityKappa: 2.1,
      mmBookWeightPct: 65,
      cipArbBookWeightPct: 25,
      carryBookWeightPct: 10,
      fundingLegCurrency: 'USD',
      autoDeleverageOnMarginCall: true,
    },
  },
  {
    id: 'jpy_funded_em_carry',
    label: 'JPY-Funded Sovereign High-Carry Pod ($600M · 5.0x)',
    subtitle: 'Aggressive EM local sovereign yield harvest funded in JPY; high squeeze beta',
    config: {
      bookAumUsdMillions: 600,
      grossLeverageMultiplier: 5.0,
      avellanedaRiskAversionGamma: 0.2,
      inventorySkewPct: 45,
      orderArrivalIntensityKappa: 1.15,
      mmBookWeightPct: 15,
      cipArbBookWeightPct: 25,
      carryBookWeightPct: 60,
      fundingLegCurrency: 'JPY',
      autoDeleverageOnMarginCall: false,
    },
  },
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function computeMarketMakerAlphaSuite(
  openData: OpenDataSnapshot,
  activeLiquiditySuite: GlobalLiquidityFundingSuite,
  rawConfig: MarketMakerStrategyConfig
): MarketMakerSimulationSuite {
  // Normalize book weights so they sum to 100%
  const weightSum =
    rawConfig.mmBookWeightPct + rawConfig.cipArbBookWeightPct + rawConfig.carryBookWeightPct;
  const normFactor = weightSum > 0 ? 100 / weightSum : 1;
  const mmWeightPct = round1(rawConfig.mmBookWeightPct * normFactor);
  const cipWeightPct = round1(rawConfig.cipArbBookWeightPct * normFactor);
  const carryWeightPct = round1(Math.max(0, 100 - mmWeightPct - cipWeightPct));

  const config: MarketMakerStrategyConfig = {
    ...rawConfig,
    mmBookWeightPct: mmWeightPct,
    cipArbBookWeightPct: cipWeightPct,
    carryBookWeightPct: carryWeightPct,
  };

  // Compute baseline unstressed liquidity suite for direct comparison
  const baselineLiquiditySuite = computeGlobalLiquidityFundingSuite(
    openData,
    DEFAULT_LIQUIDITY_STRESS_PARAMS
  );

  const aumUsdM = config.bookAumUsdMillions;
  const grossNotionalUsdM = round1(aumUsdM * config.grossLeverageMultiplier);

  const { stressParams } = activeLiquiditySuite;
  const basisShockBps = stressParams.usdBasisSqueezeBps;
  const fraOisShockBps = stressParams.interbankFraOisShockBps;
  const qtDrainBn = stressParams.fedQtAndTgaDrainUsdBn;
  const gsibMult = stressParams.gsibTurnWindowDressingMultiplier;

  // Funding leg base policy rate
  const fundingCorridor = activeLiquiditySuite.corridors.find(
    (c) => c.currencyCode === config.fundingLegCurrency
  );
  const fundingBaseRatePct =
    config.fundingLegCurrency === 'USD'
      ? activeLiquiditySuite.usSofrRatePct
      : fundingCorridor
      ? fundingCorridor.domesticPolicyRatePct
      : 3.5;

  // Avellaneda-Stoikov structural parameters
  const gamma = clamp(config.avellanedaRiskAversionGamma, 0.05, 1.2);
  const kappa = clamp(config.orderArrivalIntensityKappa, 0.4, 3.5);
  const qNorm = clamp(config.inventorySkewPct / 100, -1, 1);

  // Adverse selection increases when liquidity stress Z-score rises and order arrival kappa drops
  const stressZ = activeLiquiditySuite.globalLiquidityStressIndexZScore;
  const adverseSelectionRatioPct = round1(
    clamp(18 + stressZ * 9.5 + Math.abs(qNorm) * 14 - (kappa - 1.2) * 5, 8, 78)
  );

  // Build corridor-level strategy execution rows across all 12 G10 & EM corridors
  const totalCorridors = activeLiquiditySuite.corridors.length;
  const corridorPositions: CorridorStrategyAlphaRow[] = activeLiquiditySuite.corridors.map(
    (corridor, idx) => {
      const baseCorridor =
        baselineLiquiditySuite.corridors.find((c) => c.corridorId === corridor.corridorId) ||
        corridor;

      // Weight allocation: Target sovereign gets 18% of book, others share remaining 82% weighted by strategy fit
      const rawShare = corridor.isTargetSovereign
        ? 0.18
        : corridor.regionGroup === 'G10'
        ? 0.82 / (totalCorridors - 1)
        : (0.82 / (totalCorridors - 1)) * 0.95;

      const notionalAllocationUsdM = round1(grossNotionalUsdM * rawShare);

      // Volatility proxy (annualized %)
      const volPct =
        corridor.regionGroup === 'EM'
          ? 11.5 + corridor.compositeStressZScore * 2.4
          : 7.2 + corridor.compositeStressZScore * 1.5;

      // Avellaneda-Stoikov optimal half-spread: (1/gamma)*ln(1 + gamma/kappa) scaled by volatility & dealer balance sheet
      const asBaseHalfSpreadBps =
        (1 / gamma) * Math.log(1 + gamma / kappa) * (volPct * 0.55) * (gsibMult * 0.85);
      const optimalHalfSpreadBps = round1(clamp(asBaseHalfSpreadBps, 1.8, 65.0));
      const quotedBidAskSpreadBps = round1(optimalHalfSpreadBps * 2);

      // Reservation price spread adjustment: q * gamma * sigma^2
      const reservationSpreadAdjustBps = round1(
        qNorm * gamma * Math.pow(volPct / 10, 2) * 18.5
      );

      // CIP Basis Arbitrage pickup (bps annualized, scaled to 30-day window)
      const cipBasisPickupBps = round1(
        corridor.cipArbitragePickupBps * (0.65 + ( config.cipArbBookWeightPct / 100 ) * 0.55)
      );

      // Sovereign FX & Rates Carry Differential (bps)
      const rawCarryPct =
        corridor.domestic10YBondYieldPct * 0.55 +
        corridor.domesticPolicyRatePct * 0.45 -
        fundingBaseRatePct;
      const netCarryDifferentialBps = round1(rawCarryPct * 100);

      // Repo Haircut & Balance-Sheet Financing Drag (bps)
      const haircutDeltaPct = Math.max(0, corridor.repoHaircutPct - baseCorridor.repoHaircutPct);
      const repoAndFundingDragBps = round1(
        corridor.liborOrFraOisSpreadBps * 0.42 +
          corridor.repoHaircutPct * 3.8 * (gsibMult - 0.35) +
          haircutDeltaPct * 6.5
      );

      // Funding Squeeze Mark-to-Market Basis & Carry Unwind Shock (bps)
      const basisWideningBps = Math.abs(
        corridor.xccyBasis3MBps - baseCorridor.baselineXccyBasis3MBps
      );
      const carryUnwindPenaltyBps =
        corridor.regionGroup === 'EM' && rawCarryPct > 1.5
          ? basisWideningBps * 0.55 * (1 + Math.max(0, qNorm) * 0.6)
          : basisWideningBps * 0.28;

      const squeezeBasisMtmShockBps = round1(
        basisWideningBps * 0.48 +
          carryUnwindPenaltyBps +
          (adverseSelectionRatioPct > 40 ? (adverseSelectionRatioPct - 30) * 0.45 : 0)
      );

      // Weighted Gross Alpha across the 3 books for this corridor
      const mmGrossCaptureBps =
        quotedBidAskSpreadBps * kappa * (1 - adverseSelectionRatioPct / 115) * 1.35;
      const weightedGrossBps =
        (mmWeightPct / 100) * mmGrossCaptureBps +
        (cipWeightPct / 100) * Math.max(12, cipBasisPickupBps) +
        (carryWeightPct / 100) * Math.max(-40, netCarryDifferentialBps * 0.35);

      const netStrategyReturnBps = round1(
        weightedGrossBps - repoAndFundingDragBps - squeezeBasisMtmShockBps
      );

      // 30-day PnL in $M (bps of allocated notional over 30-day active cycle)
      const netStrategyPnlUsdM = round2((notionalAllocationUsdM * netStrategyReturnBps) / 10000);

      // Dominant book classification for this corridor
      let dominantBook: MarketMakerBookId = 'CIP_BASIS_ARB';
      let dominantBookLabel = 'XCCY CIP Basis Arb';
      if (corridor.regionGroup === 'EM' && rawCarryPct >= 3.2 && carryWeightPct >= 20) {
        dominantBook = 'SOVEREIGN_FX_CARRY';
        dominantBookLabel = 'Sovereign FX Carry';
      } else if (mmWeightPct >= 45 || idx % 3 === 0) {
        dominantBook = 'AVELLANEDA_STOIKOV_MM';
        dominantBookLabel = 'Avellaneda-Stoikov MM';
      }

      const stressedSharpeRatio = round2(
        clamp(netStrategyReturnBps / Math.max(18, volPct * 5.2), -2.4, 3.8)
      );

      const dv01UsdThousands = round1(
        notionalAllocationUsdM * (corridor.regionGroup === 'G10' ? 4.2 : 3.4)
      );
      const fxDeltaUsdMillions = round1(
        notionalAllocationUsdM *
          ((carryWeightPct / 100) * 0.65 + qNorm * 0.35) *
          (corridor.regionGroup === 'EM' ? 1.15 : 0.75)
      );

      const inventorySkewPositionPct = round1(
        clamp(
          config.inventorySkewPct + (corridor.isTargetSovereign ? 8 : (idx % 5 - 2) * 6),
          -95,
          95
        )
      );

      let executionSignal: CorridorStrategyAlphaRow['executionSignal'] = 'PROVIDE_DEPTH';
      if (netStrategyReturnBps < -35 || corridor.compositeStressZScore >= 3.1) {
        executionSignal = config.autoDeleverageOnMarginCall
          ? 'DELEVERAGE_STOP'
          : 'WIDEN_QUOTES_DEFENSIVE';
      } else if (corridor.compositeStressZScore >= 2.1) {
        executionSignal = 'WIDEN_QUOTES_DEFENSIVE';
      } else if (dominantBook === 'CIP_BASIS_ARB' && corridor.cipArbitragePickupBps >= 35) {
        executionSignal = 'HARVEST_CIP_BASIS';
      } else if (dominantBook === 'SOVEREIGN_FX_CARRY' && rawCarryPct >= 2.5) {
        executionSignal = 'LONG_CARRY';
      }

      return {
        corridorId: corridor.corridorId,
        pairLabel: corridor.pairLabel,
        sovereignLabel: corridor.sovereignLabel,
        regionGroup: corridor.regionGroup,
        isTargetSovereign: corridor.isTargetSovereign,
        dominantBook,
        dominantBookLabel,
        notionalAllocationUsdM,
        reservationSpreadAdjustBps,
        optimalHalfSpreadBps,
        quotedBidAskSpreadBps,
        cipBasisPickupBps,
        netCarryDifferentialBps,
        repoAndFundingDragBps,
        squeezeBasisMtmShockBps,
        netStrategyReturnBps,
        netStrategyPnlUsdM,
        stressedSharpeRatio,
        dv01UsdThousands,
        fxDeltaUsdMillions,
        inventorySkewPositionPct,
        executionSignal,
      };
    }
  );

  // Compute the 3 Strategy Books Summary
  const avgQuotedSpreadBps = round1(
    corridorPositions.reduce((acc, r) => acc + r.quotedBidAskSpreadBps, 0) /
      Math.max(1, corridorPositions.length)
  );
  const avgCipPickupBps = round1(
    corridorPositions.reduce((acc, r) => acc + r.cipBasisPickupBps, 0) /
      Math.max(1, corridorPositions.length)
  );
  const avgCarryDiffBps = round1(
    corridorPositions
      .filter((r) => r.regionGroup === 'EM' || r.netCarryDifferentialBps > 50)
      .reduce((acc, r) => acc + Math.max(25, r.netCarryDifferentialBps * 0.35), 0) /
      Math.max(1, corridorPositions.length * 0.6)
  );

  // Book 1: Avellaneda-Stoikov Market-Making
  const mmNotional = round1(grossNotionalUsdM * (mmWeightPct / 100));
  const mmGrossAlphaBps = round1(
    avgQuotedSpreadBps * kappa * (1 - adverseSelectionRatioPct / 120) * 1.45
  );
  const mmFundingDragBps = round1(
    (activeLiquiditySuite.usGcRepoSofrSpreadBps + fraOisShockBps * 0.35) * 0.55 +
      12 * (gsibMult - 1)
  );
  const mmSqueezeMtmDragBps = round1(
    Math.abs(qNorm) * (basisShockBps * 0.42 + fraOisShockBps * 0.3) +
      Math.max(0, adverseSelectionRatioPct - 25) * 0.55
  );
  const mmNetAlphaBps = round1(mmGrossAlphaBps - mmFundingDragBps - mmSqueezeMtmDragBps);
  const mmNetPnlUsdM = round2((mmNotional * mmNetAlphaBps) / 10000);

  // Book 2: Cross-Currency CIP Basis Arbitrage
  const cipNotional = round1(grossNotionalUsdM * (cipWeightPct / 100));
  const cipGrossAlphaBps = round1(Math.max(24, avgCipPickupBps * 1.25));
  const cipFundingDragBps = round1(
    14 +
      fraOisShockBps * 0.48 +
      (gsibMult - 1) * 28 +
      (qtDrainBn / 1000) * 16
  );
  const cipSqueezeMtmDragBps = round1(
    basisShockBps * 0.52 * (config.grossLeverageMultiplier / 3.5)
  );
  const cipNetAlphaBps = round1(cipGrossAlphaBps - cipFundingDragBps - cipSqueezeMtmDragBps);
  const cipNetPnlUsdM = round2((cipNotional * cipNetAlphaBps) / 10000);

  // Book 3: Sovereign FX & Local-Currency Carry
  const carryNotional = round1(grossNotionalUsdM * (carryWeightPct / 100));
  const carryGrossAlphaBps = round1(Math.max(28, avgCarryDiffBps * 1.15));
  const carryFundingDragBps = round1(
    16 +
      basisShockBps * 0.38 +
      fraOisShockBps * 0.32 +
      (config.fundingLegCurrency === 'USD' ? 12 : 6)
  );
  const carrySqueezeMtmDragBps = round1(
    (basisShockBps * 0.65 + fraOisShockBps * 0.45) *
      (1 + Math.max(0, qNorm) * 0.55) *
      (config.autoDeleverageOnMarginCall ? 0.72 : 1.15)
  );
  const carryNetAlphaBps = round1(
    carryGrossAlphaBps - carryFundingDragBps - carrySqueezeMtmDragBps
  );
  const carryNetPnlUsdM = round2((carryNotional * carryNetAlphaBps) / 10000);

  const books: StrategyBookSummary[] = [
    {
      bookId: 'AVELLANEDA_STOIKOV_MM',
      bookName: 'Avellaneda-Stoikov Liquidity Provision',
      modelSpecification: `r(s,q,t) = s - q·γ·σ²(T-t) | γ=${gamma.toFixed(2)}, κ=${kappa.toFixed(2)}`,
      allocatedNotionalUsdMillions: mmNotional,
      weightPct: mmWeightPct,
      grossAlphaBps: mmGrossAlphaBps,
      fundingAndRepoDragBps: mmFundingDragBps,
      squeezeMtmAndSlippageDragBps: mmSqueezeMtmDragBps,
      netAlphaBps: mmNetAlphaBps,
      netPnlUsdMillions: mmNetPnlUsdM,
      baselineAnnualizedSharpe: 2.45,
      stressedAnnualizedSharpe: round2(clamp(2.45 - stressZ * 0.52, -1.2, 2.8)),
      primaryRiskDriver: 'Inventory skew q mark-to-market & toxic order-flow adverse selection',
    },
    {
      bookId: 'CIP_BASIS_ARB',
      bookName: 'XCCY Covered Interest Parity (CIP) Basis Book',
      modelSpecification: `Long FX-Hedged UST vs Local OIS/RFR | G-SIB Turn Mult ${gsibMult.toFixed(2)}x`,
      allocatedNotionalUsdMillions: cipNotional,
      weightPct: cipWeightPct,
      grossAlphaBps: cipGrossAlphaBps,
      fundingAndRepoDragBps: cipFundingDragBps,
      squeezeMtmAndSlippageDragBps: cipSqueezeMtmDragBps,
      netAlphaBps: cipNetAlphaBps,
      netPnlUsdMillions: cipNetPnlUsdM,
      baselineAnnualizedSharpe: 2.15,
      stressedAnnualizedSharpe: round2(clamp(2.15 - stressZ * 0.64, -1.6, 2.5)),
      primaryRiskDriver: 'G-SIB balance-sheet rental cost, repo haircut spike & XCCY basis widening',
    },
    {
      bookId: 'SOVEREIGN_FX_CARRY',
      bookName: `Sovereign FX & Rates Carry (${config.fundingLegCurrency}-Funded)`,
      modelSpecification: `Long EM/G10 Sovereign Yield vs ${config.fundingLegCurrency} Funding (${fundingBaseRatePct.toFixed(2)}%)`,
      allocatedNotionalUsdMillions: carryNotional,
      weightPct: carryWeightPct,
      grossAlphaBps: carryGrossAlphaBps,
      fundingAndRepoDragBps: carryFundingDragBps,
      squeezeMtmAndSlippageDragBps: carrySqueezeMtmDragBps,
      netAlphaBps: carryNetAlphaBps,
      netPnlUsdMillions: carryNetPnlUsdM,
      baselineAnnualizedSharpe: 1.65,
      stressedAnnualizedSharpe: round2(clamp(1.65 - stressZ * 0.85, -2.3, 1.9)),
      primaryRiskDriver: 'Dollar funding squeeze crash risk, FX spot unwind & variation margin calls',
    },
  ];

  // PnL Waterfall Decomposition (in $M and bps of AUM)
  const mmGrossUsdM = round2((mmNotional * mmGrossAlphaBps) / 10000);
  const cipGrossUsdM = round2((cipNotional * cipGrossAlphaBps) / 10000);
  const carryGrossUsdM = round2((carryNotional * carryGrossAlphaBps) / 10000);

  const totalRepoFundingDragUsdM = -round2(
    (mmNotional * mmFundingDragBps +
      cipNotional * cipFundingDragBps +
      carryNotional * carryFundingDragBps) /
      10000
  );

  const xccyBasisSqueezeMtmUsdM = -round2(
    (cipNotional * cipSqueezeMtmDragBps + carryNotional * (carrySqueezeMtmDragBps * 0.55)) / 10000
  );

  const inventoryAndAdverseSelectionUsdM = -round2(
    (mmNotional * mmSqueezeMtmDragBps + carryNotional * (carrySqueezeMtmDragBps * 0.45)) / 10000
  );

  const stressed30DayNetPnlUsdM = round2(
    mmGrossUsdM +
      cipGrossUsdM +
      carryGrossUsdM +
      totalRepoFundingDragUsdM +
      xccyBasisSqueezeMtmUsdM +
      inventoryAndAdverseSelectionUsdM
  );

  // Baseline 30-day PnL (when basisShockBps = 0, fraOisShockBps = 0, gsibMult = 1)
  const baselineDragUsdM = -round2(grossNotionalUsdM * 0.0014);
  const baseline30DayNetPnlUsdM = round2(
    mmGrossUsdM * 0.94 + cipGrossUsdM * 0.88 + carryGrossUsdM * 0.96 + baselineDragUsdM
  );
  const fundingSqueezePnlImpactUsdM = round2(stressed30DayNetPnlUsdM - baseline30DayNetPnlUsdM);

  let runningCum = 0;
  const rawSteps: Omit<PnLWaterfallStep, 'cumulativeUsdMillions' | 'valueBpsOfAum'>[] = [
    {
      stepId: 'mm_spread_alpha',
      label: 'Avellaneda-Stoikov Spread Capture',
      category: 'GROSS_ALPHA',
      valueUsdMillions: mmGrossUsdM,
      driverDetail: `Optimal half-spread ${ (avgQuotedSpreadBps / 2).toFixed(1) } bps · κ=${kappa.toFixed(2)}`,
    },
    {
      stepId: 'cip_basis_alpha',
      label: 'XCCY CIP Basis Arbitrage Pickup',
      category: 'GROSS_ALPHA',
      valueUsdMillions: cipGrossUsdM,
      driverDetail: `Avg FX-hedged UST pickup +${avgCipPickupBps.toFixed(1)} bps across 12 corridors`,
    },
    {
      stepId: 'sovereign_carry_alpha',
      label: `Sovereign & FX Carry Harvest (${config.fundingLegCurrency})`,
      category: 'GROSS_ALPHA',
      valueUsdMillions: carryGrossUsdM,
      driverDetail: `Rate differential vs ${config.fundingLegCurrency} funding leg (${fundingBaseRatePct.toFixed(2)}%)`,
    },
    {
      stepId: 'repo_haircut_drag',
      label: 'Repo Haircut & FRA-OIS Financing Drag',
      category: 'FUNDING_DRAG',
      valueUsdMillions: totalRepoFundingDragUsdM,
      driverDetail: `US 3M FRA-OIS ${activeLiquiditySuite.us3mFraOisSpreadBps.toFixed(0)} bps · G-SIB Turn ${gsibMult.toFixed(2)}x`,
    },
    {
      stepId: 'xccy_squeeze_mtm',
      label: 'XCCY Basis Squeeze MTM Shock',
      category: 'SQUEEZE_MTM',
      valueUsdMillions: xccyBasisSqueezeMtmUsdM,
      driverDetail: `Offshore USD basis shock -${basisShockBps} bps · Fed Swap/SRF draw`,
    },
    {
      stepId: 'inventory_slippage_drag',
      label: 'Inventory Skew & Adverse Selection Drag',
      category: 'SQUEEZE_MTM',
      valueUsdMillions: inventoryAndAdverseSelectionUsdM,
      driverDetail: `Skew q=${config.inventorySkewPct > 0 ? '+' : ''}${config.inventorySkewPct}% · Toxic flow ${adverseSelectionRatioPct.toFixed(1)}%`,
    },
  ];

  const waterfall: PnLWaterfallStep[] = rawSteps.map((s) => {
    runningCum = round2(runningCum + s.valueUsdMillions);
    return {
      ...s,
      valueBpsOfAum: round1((s.valueUsdMillions / aumUsdM) * 10000),
      cumulativeUsdMillions: runningCum,
    };
  });

  waterfall.push({
    stepId: 'net_total_pnl',
    label: 'Net 30-Day Strategy Alpha PnL',
    category: 'NET_TOTAL',
    valueUsdMillions: stressed30DayNetPnlUsdM,
    valueBpsOfAum: round1((stressed30DayNetPnlUsdM / aumUsdM) * 10000),
    cumulativeUsdMillions: stressed30DayNetPnlUsdM,
    driverDetail: config.autoDeleverageOnMarginCall
      ? 'Includes dynamic CRO stop-out & margin deleveraging protection'
      : 'Unhedged tail leverage (auto-deleveraging disabled)',
  });

  // Margin Utilization, Repo Haircut Encumbrance & Stop-Out Telemetry
  const avgRepoHaircutPct =
    activeLiquiditySuite.corridors.reduce((acc, c) => acc + c.repoHaircutPct, 0) /
    Math.max(1, activeLiquiditySuite.corridors.length);

  const initialMarginRequiredUsdM = round1(
    grossNotionalUsdM * (0.045 + (mmWeightPct / 100) * 0.015 + (carryWeightPct / 100) * 0.025)
  );
  const repoHaircutEncumbranceUsdM = round1(
    grossNotionalUsdM * (avgRepoHaircutPct / 100) * (0.75 + (cipWeightPct / 100) * 0.45)
  );
  const variationMarginCallUsdM = round1(
    Math.max(
      0,
      -xccyBasisSqueezeMtmUsdM * 1.35 +
        -inventoryAndAdverseSelectionUsdM * 1.15 +
        (stressZ > 1.5 ? (stressZ - 1.2) * (grossNotionalUsdM * 0.012) : 0)
    )
  );

  const totalEncumberedCapitalUsdM = round1(
    initialMarginRequiredUsdM + repoHaircutEncumbranceUsdM + variationMarginCallUsdM
  );
  const unencumberedCashBufferUsdM = round1(Math.max(0, aumUsdM - totalEncumberedCapitalUsdM));
  const marginUtilizationPctOfAum = round1(
    clamp((totalEncumberedCapitalUsdM / aumUsdM) * 100, 5, 135)
  );
  const stopOutThresholdPct = 85.0;
  const distanceToStopOutPct = round1(stopOutThresholdPct - marginUtilizationPctOfAum);
  const effectiveLeverageAfterHaircut = round2(
    grossNotionalUsdM / Math.max(25, aumUsdM - variationMarginCallUsdM)
  );

  let marginStatus: MarginAndStopOutTelemetry['marginStatus'] = 'NOMINAL_BUFFER';
  if (marginUtilizationPctOfAum >= stopOutThresholdPct) {
    marginStatus = 'STOP_OUT_DELEVERAGING';
  } else if (marginUtilizationPctOfAum >= 70) {
    marginStatus = 'MARGIN_WARNING';
  } else if (marginUtilizationPctOfAum >= 52) {
    marginStatus = 'ELEVATED_ENCUMBRANCE';
  }

  const primeBrokerDiagnostic =
    marginStatus === 'STOP_OUT_DELEVERAGING'
      ? `CRITICAL: Encumbered margin & repo haircuts (${marginUtilizationPctOfAum.toFixed(1)}% of AUM) breached the ${stopOutThresholdPct}% Prime Broker stop-out threshold. ${
          config.autoDeleverageOnMarginCall
            ? 'Automated 40% notional deleveraging triggered to cap tail drawdown.'
            : 'Forced liquidation penalty accruing across EM carry & XCCY basis legs.'
        }`
      : marginStatus === 'MARGIN_WARNING'
      ? `WARNING: Variation margin calls ($${variationMarginCallUsdM.toFixed(1)}M) and repo haircuts (${avgRepoHaircutPct.toFixed(2)}%) leave only ${distanceToStopOutPct.toFixed(1)}% buffer before stop-out.`
      : `NOMINAL: Unencumbered liquidity buffer stands at $${unencumberedCashBufferUsdM.toFixed(1)}M (${(100 - marginUtilizationPctOfAum).toFixed(1)}% of AUM) with ${avgRepoHaircutPct.toFixed(2)}% average repo haircut.`;

  const marginTelemetry: MarginAndStopOutTelemetry = {
    initialMarginRequiredUsdM,
    variationMarginCallUsdM,
    repoHaircutEncumbranceUsdM,
    totalEncumberedCapitalUsdM,
    unencumberedCashBufferUsdM,
    marginUtilizationPctOfAum,
    effectiveLeverageAfterHaircut,
    stopOutThresholdPct,
    distanceToStopOutPct,
    marginStatus,
    primeBrokerDiagnostic,
  };

  // Build 30-Day Cumulative Equity Curve (Baseline vs Stressed Funding Squeeze)
  const equityCurve30D: StrategyEquityCurveDay[] = [];
  let baseCum = 0;
  let stressCum = 0;
  const dailyBaseAvg = baseline30DayNetPnlUsdM / 30;
  const dailyStressAvg = stressed30DayNetPnlUsdM / 30;

  for (let day = 1; day <= 30; day++) {
    // Deterministic microstructure oscillation + funding squeeze inflection around Days 9-19
    const wave = Math.sin(day * 0.55) * (aumUsdM * 0.0008);
    const squeezePulse =
      day >= 8 && day <= 19
        ? -((basisShockBps + fraOisShockBps) / 220) * (grossNotionalUsdM * 0.0014) * Math.sin(((day - 7) / 12) * Math.PI)
        : day > 19 && config.autoDeleverageOnMarginCall && stressZ > 1.8
        ? (grossNotionalUsdM * 0.00045) // recovery stabilization after auto-deleverage
        : 0;

    baseCum = round2(baseCum + dailyBaseAvg + wave * 0.6);
    stressCum = round2(stressCum + dailyStressAvg + wave + squeezePulse * 0.35);

    // Ensure Day 30 lands cleanly on the exact 30-day totals
    if (day === 30) {
      baseCum = baseline30DayNetPnlUsdM;
      stressCum = stressed30DayNetPnlUsdM;
    }

    const dayMarginUtil = round1(
      clamp(
        marginUtilizationPctOfAum * (0.65 + 0.35 * Math.min(1, day / 16)) +
          (day >= 10 && day <= 18 ? stressZ * 3.2 : 0),
        10,
        130
      )
    );

    equityCurve30D.push({
      day,
      dayLabel: `D${day}`,
      baselineCumulativePnlUsdM: baseCum,
      baselineCumulativeReturnPct: round2((baseCum / aumUsdM) * 100),
      stressedCumulativePnlUsdM: stressCum,
      stressedCumulativeReturnPct: round2((stressCum / aumUsdM) * 100),
      marginUtilizationPct: dayMarginUtil,
      dailyFundingDragUsdM: round2(Math.abs(totalRepoFundingDragUsdM) / 30),
    });
  }

  const stressedAnnualizedReturnPct = round2(((stressed30DayNetPnlUsdM / aumUsdM) * 12) * 100);
  const baselineSharpeRatio = round2(
    books.reduce((acc, b) => acc + b.baselineAnnualizedSharpe * (b.weightPct / 100), 0)
  );
  const stressedSharpeRatio = round2(
    books.reduce((acc, b) => acc + b.stressedAnnualizedSharpe * (b.weightPct / 100), 0)
  );

  const headlineConclusion = `${openData.countryName} (${openData.currencyCode}) & 12-Corridor Multi-Book Pod ($${aumUsdM}M AUM · ${config.grossLeverageMultiplier.toFixed(1)}x): Under active plumbing (${activeLiquiditySuite.stressParams.presetId.toUpperCase()}, Z=${stressZ.toFixed(2)}σ), 30D Net PnL is ${
    stressed30DayNetPnlUsdM >= 0 ? '+' : ''
  }$${stressed30DayNetPnlUsdM.toFixed(2)}M (${fundingSqueezePnlImpactUsdM >= 0 ? '+' : ''}$${fundingSqueezePnlImpactUsdM.toFixed(2)}M vs. baseline), with Avellaneda-Stoikov optimal bid-ask at ${avgQuotedSpreadBps.toFixed(1)} bps and Prime Broker margin utilization at ${marginUtilizationPctOfAum.toFixed(1)}%.`;

  return {
    config,
    headlineConclusion,
    grossNotionalUsdMillions: grossNotionalUsdM,
    baseline30DayNetPnlUsdM,
    stressed30DayNetPnlUsdM,
    fundingSqueezePnlImpactUsdM,
    stressedAnnualizedReturnPct,
    baselineSharpeRatio,
    stressedSharpeRatio,
    avgOptimalBidAskSpreadBps: avgQuotedSpreadBps,
    adverseSelectionRatioPct,
    books,
    waterfall,
    equityCurve30D,
    corridorPositions,
    marginTelemetry,
  };
}
