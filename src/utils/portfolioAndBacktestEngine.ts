import {
  CouncilAssessmentRun,
  ForecastingShockInputs,
  GeopoliticalWargameParams,
  LiquidityStressParams,
  PortfolioExpressionType,
  PortfolioPositionItem,
} from '../types/council';
import { SOVEREIGN_CATALOG, buildDefaultAssessmentRun } from '../data/presetsAndBaselines';
import {
  DEFAULT_FORECAST_SHOCKS,
  computeFullEconometricForecastSuite,
} from './econometricForecastingEngine';
import { computeGeopoliticalRiskDeskSuite } from './geopoliticalRiskEngine';
import { computeGlobalLiquidityFundingSuite } from './globalLiquidityEngine';
import {
  DEFAULT_PORTFOLIO_MANDATE_CONFIG,
  computeMultiSovereignPortfolioRisk,
} from './institutionalRiskDeskEngine';

// ============================================================================
// 1. MULTI-SOVEREIGN CONTAGION BOOK & BILATERAL SPILLOVER MATRIX ENGINE
// ============================================================================

export type PortfolioBasketPresetId =
  | 'EM_HIGH_CARRY_CORE'
  | 'CHOKEPOINT_FRONTIER_BARBELL'
  | 'G10_EM_DURATION_CROSSOVER'
  | 'LATAM_EMEA_RELATIVE_VALUE';

export interface PortfolioBasketPreset {
  id: PortfolioBasketPresetId;
  name: string;
  description: string;
  positions: PortfolioPositionItem[];
}

export const PORTFOLIO_BASKET_PRESETS: PortfolioBasketPreset[] = [
  {
    id: 'EM_HIGH_CARRY_CORE',
    name: 'EM High-Carry & Fiscal Reform Basket',
    description: 'Long high-real-yield local bonds in Brazil, Mexico & South Africa hedged with 5Y CDS protection on Egypt and Turkey.',
    positions: [
      { iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL', expressionType: 'FX_HEDGED_LOCAL_CARRY', weightNavPct: 30 },
      { iso3: 'MEX', countryName: 'Mexico', currencyCode: 'MXN', expressionType: 'LOCAL_RATES_RECEIVER', weightNavPct: 25 },
      { iso3: 'ZAF', countryName: 'South Africa', currencyCode: 'ZAR', expressionType: 'CURVE_2S10S_STEEPENER', weightNavPct: 20 },
      { iso3: 'TUR', countryName: 'Turkey', currencyCode: 'TRY', expressionType: 'CDS_5Y_PROTECTION', weightNavPct: 15 },
      { iso3: 'EGY', countryName: 'Egypt (Red Sea Corridor)', currencyCode: 'EGP', expressionType: 'CDS_5Y_PROTECTION', weightNavPct: 10 },
    ],
  },
  {
    id: 'CHOKEPOINT_FRONTIER_BARBELL',
    name: 'Maritime Chokepoint & Frontier Stress Barbell',
    description: 'Defensive barbell pairing Suez/Red Sea CDS protection and 2s10s curve steepeners with resilient Asian local duration.',
    positions: [
      { iso3: 'EGY', countryName: 'Egypt (Red Sea Corridor)', currencyCode: 'EGP', expressionType: 'CDS_5Y_PROTECTION', weightNavPct: 25 },
      { iso3: 'TUR', countryName: 'Turkey', currencyCode: 'TRY', expressionType: 'CURVE_2S10S_STEEPENER', weightNavPct: 25 },
      { iso3: 'IDN', countryName: 'Indonesia', currencyCode: 'IDR', expressionType: 'USD_EUROBOND_LONG', weightNavPct: 25 },
      { iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL', expressionType: 'FX_HEDGED_LOCAL_CARRY', weightNavPct: 15 },
      { iso3: 'ZAF', countryName: 'South Africa', currencyCode: 'ZAR', expressionType: 'CDS_5Y_PROTECTION', weightNavPct: 10 },
    ],
  },
  {
    id: 'G10_EM_DURATION_CROSSOVER',
    name: 'G10 / EM Duration & Yen Carry Unwind Book',
    description: 'Cross-market book balancing JGB and UK Gilt curve steepeners against Indonesia and Brazil USD Eurobonds.',
    positions: [
      { iso3: 'JPN', countryName: 'Japan', currencyCode: 'JPY', expressionType: 'CURVE_2S10S_STEEPENER', weightNavPct: 30 },
      { iso3: 'GBR', countryName: 'United Kingdom', currencyCode: 'GBP', expressionType: 'CURVE_2S10S_STEEPENER', weightNavPct: 25 },
      { iso3: 'IDN', countryName: 'Indonesia', currencyCode: 'IDR', expressionType: 'USD_EUROBOND_LONG', weightNavPct: 20 },
      { iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL', expressionType: 'FX_HEDGED_LOCAL_CARRY', weightNavPct: 15 },
      { iso3: 'MEX', countryName: 'Mexico', currencyCode: 'MXN', expressionType: 'LOCAL_RATES_RECEIVER', weightNavPct: 10 },
    ],
  },
  {
    id: 'LATAM_EMEA_RELATIVE_VALUE',
    name: 'LatAm vs. EMEA Sovereign Relative Value',
    description: 'Overweight LatAm real-rate receivers against EMEA external rollover stress.',
    positions: [
      { iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL', expressionType: 'LOCAL_RATES_RECEIVER', weightNavPct: 30 },
      { iso3: 'MEX', countryName: 'Mexico', currencyCode: 'MXN', expressionType: 'USD_EUROBOND_LONG', weightNavPct: 25 },
      { iso3: 'TUR', countryName: 'Turkey', currencyCode: 'TRY', expressionType: 'FX_HEDGED_LOCAL_CARRY', weightNavPct: 20 },
      { iso3: 'ZAF', countryName: 'South Africa', currencyCode: 'ZAR', expressionType: 'USD_EUROBOND_LONG', weightNavPct: 15 },
      { iso3: 'EGY', countryName: 'Egypt (Red Sea Corridor)', currencyCode: 'EGP', expressionType: 'CDS_5Y_PROTECTION', weightNavPct: 10 },
    ],
  },
];

export interface BilateralContagionCell {
  sourceIso3: string;
  targetIso3: string;
  omegaTotalElasticity: number; // bps spread widening in target per +100 bps shock in source
  tradeChannelWeight: number;
  bisBankingChannelWeight: number;
  usdFundingBetaWeight: number;
  transmittedSpreadShockBps: number;
}

export interface ContagionSpilloverPositionImpact {
  iso3: string;
  countryName: string;
  currencyCode: string;
  expressionType: PortfolioExpressionType;
  weightNavPct: number;
  notionalUsdMillions: number;
  omegaFromEpicenter: number;
  transmittedSpreadWideningBps: number;
  transmittedYieldShiftBps: number;
  transmittedFxDeprPct: number;
  stressedPositionPnlUsdThousands: number;
  stressedPositionPnlPctNav: number;
  mctrPctNav: number;
  componentCvar99PctNav: number;
  riskSharePct: number;
}

export interface MultiSovereignContagionBookSuite {
  epicenterIso3: string;
  epicenterCountryName: string;
  epicenterSpreadShockBps: number;
  portfolioNavUsdMillions: number;
  grossExposurePctNav: number;
  undiversifiedCvar99PctNav: number;
  correlatedCvar99PctNav: number;
  contagionStressedCvar99PctNav: number;
  diversificationBenefitPct: number;
  totalEpicenterCascadePnlUsdThousands: number;
  totalEpicenterCascadePnlPctNav: number;
  maxBilateralOmega: number;
  mostVulnerableTargetIso3: string;
  headlinePlainEnglish: string;
  bilateralMatrix: BilateralContagionCell[];
  positionImpacts: ContagionSpilloverPositionImpact[];
}

export function computeMultiSovereignContagionBook(
  activeRun: CouncilAssessmentRun,
  positions: PortfolioPositionItem[],
  epicenterIso3: string,
  epicenterSpreadShockBps: number,
  portfolioNavUsdMillions = 250
): MultiSovereignContagionBookSuite {
  const basePortfolioRisk = computeMultiSovereignPortfolioRisk(activeRun, positions, {
    ...DEFAULT_PORTFOLIO_MANDATE_CONFIG,
    portfolioNavUsdMillions,
  });

  const epicenterItem =
    SOVEREIGN_CATALOG.find((c) => c.iso3 === epicenterIso3) || SOVEREIGN_CATALOG[0];

  const isosInBook = Array.from(
    new Set([epicenterIso3, ...positions.map((p) => p.iso3)])
  );

  const bilateralMatrix: BilateralContagionCell[] = [];

  const getPairChannelWeights = (srcIso: string, dstIso: string) => {
    if (srcIso === dstIso) {
      return { trade: 1.0, bank: 1.0, fx: 1.0, omega: 1.0 };
    }
    const srcItem = SOVEREIGN_CATALOG.find((c) => c.iso3 === srcIso) || SOVEREIGN_CATALOG[0];
    const dstItem = SOVEREIGN_CATALOG.find((c) => c.iso3 === dstIso) || SOVEREIGN_CATALOG[0];

    const sameRegion = srcItem.region === dstItem.region ? 0.24 : 0.09;
    const trade = Number(
      Math.min(0.65, sameRegion + (srcItem.geopoliticalRisk + dstItem.geopoliticalRisk) * 0.14).toFixed(2)
    );
    const bank = Number(
      Math.min(0.7, 0.12 + (srcItem.sovereignRisk * dstItem.sovereignRisk) * 0.42).toFixed(2)
    );
    const fx = Number(
      Math.min(
        0.85,
        0.22 +
          (Math.min(srcItem.cds5YBps, 600) / 1000) * 0.35 +
          (Math.min(dstItem.cds5YBps, 600) / 1000) * 0.42
      ).toFixed(2)
    );
    const omega = Number((0.30 * trade + 0.32 * bank + 0.38 * fx).toFixed(2));
    return { trade, bank, fx, omega };
  };

  for (const src of isosInBook) {
    for (const dst of isosInBook) {
      const { trade, bank, fx, omega } = getPairChannelWeights(src, dst);
      bilateralMatrix.push({
        sourceIso3: src,
        targetIso3: dst,
        omegaTotalElasticity: omega,
        tradeChannelWeight: trade,
        bisBankingChannelWeight: bank,
        usdFundingBetaWeight: fx,
        transmittedSpreadShockBps: Math.round(epicenterSpreadShockBps * omega),
      });
    }
  }

  let maxBilateralOmega = 0;
  let mostVulnerableTargetIso3 = positions[0]?.iso3 || 'BRA';

  const positionImpacts: ContagionSpilloverPositionImpact[] = positions.map((pos) => {
    const contrib =
      basePortfolioRisk.positionContributions.find((c) => c.iso3 === pos.iso3) ||
      basePortfolioRisk.positionContributions[0];

    const cell = bilateralMatrix.find(
      (c) => c.sourceIso3 === epicenterIso3 && c.targetIso3 === pos.iso3
    ) || {
      omegaTotalElasticity: pos.iso3 === epicenterIso3 ? 1.0 : 0.34,
      transmittedSpreadShockBps: Math.round(
        epicenterSpreadShockBps * (pos.iso3 === epicenterIso3 ? 1.0 : 0.34)
      ),
    };

    if (pos.iso3 !== epicenterIso3 && cell.omegaTotalElasticity > maxBilateralOmega) {
      maxBilateralOmega = cell.omegaTotalElasticity;
      mostVulnerableTargetIso3 = pos.iso3;
    }

    const transmittedSpreadWideningBps = cell.transmittedSpreadShockBps;
    const transmittedYieldShiftBps = Math.round(transmittedSpreadWideningBps * 0.78);
    const transmittedFxDeprPct = Number((transmittedSpreadWideningBps * 0.028).toFixed(2));

    // Calculate PnL impact in USD thousands using rate DV01 and credit CS01
    // Note: positive rateDv01 means long duration (loses money when yields rise)
    const ratePnlK = -contrib.rateDv01UsdThousands * transmittedYieldShiftBps;
    const creditPnlK = -contrib.creditCs01UsdThousands * transmittedSpreadWideningBps;
    const totalPnlK = Math.round(ratePnlK + creditPnlK);
    const totalPnlPctNav = Number(
      ((totalPnlK / (portfolioNavUsdMillions * 1000)) * 100).toFixed(2)
    );

    return {
      iso3: pos.iso3,
      countryName: pos.countryName,
      currencyCode: pos.currencyCode,
      expressionType: pos.expressionType,
      weightNavPct: pos.weightNavPct,
      notionalUsdMillions: contrib.notionalUsdMillions,
      omegaFromEpicenter: cell.omegaTotalElasticity,
      transmittedSpreadWideningBps,
      transmittedYieldShiftBps,
      transmittedFxDeprPct,
      stressedPositionPnlUsdThousands: totalPnlK,
      stressedPositionPnlPctNav: totalPnlPctNav,
      mctrPctNav: contrib.mctrPctNav,
      componentCvar99PctNav: contrib.componentCvarPctNav,
      riskSharePct: contrib.componentRiskSharePct,
    };
  });

  const totalEpicenterCascadePnlUsdThousands = positionImpacts.reduce(
    (sum, p) => sum + p.stressedPositionPnlUsdThousands,
    0
  );
  const totalEpicenterCascadePnlPctNav = Number(
    ((totalEpicenterCascadePnlUsdThousands / (portfolioNavUsdMillions * 1000)) * 100).toFixed(2)
  );

  const correlatedCvar99PctNav = basePortfolioRisk.expectedShortfallCvar99TenDayPct;
  const undiversifiedCvar99PctNav = Number(
    (
      correlatedCvar99PctNav /
      Math.max(0.55, 1 - basePortfolioRisk.diversificationBenefitPct / 100)
    ).toFixed(2)
  );
  const contagionStressedCvar99PctNav = Number(
    (correlatedCvar99PctNav + Math.abs(totalEpicenterCascadePnlPctNav) * 0.42).toFixed(2)
  );

  const headlinePlainEnglish = `A +${epicenterSpreadShockBps} bps credit shock originating in ${epicenterItem.countryName} (${epicenterIso3}) spills over into the multi-sovereign book with peak bilateral contagion intensity Ω = ${maxBilateralOmega.toFixed(2)} into ${mostVulnerableTargetIso3}, generating a net book impact of ${totalEpicenterCascadePnlUsdThousands >= 0 ? '+' : ''}$${totalEpicenterCascadePnlUsdThousands.toLocaleString()}k (${totalEpicenterCascadePnlPctNav >= 0 ? '+' : ''}${totalEpicenterCascadePnlPctNav}% NAV) and lifting Contagion-Stressed CVaR₉₉ to ${contagionStressedCvar99PctNav}% NAV (Ref: Contagion Spillover Ω(${epicenterIso3}→${mostVulnerableTargetIso3}) = ${maxBilateralOmega.toFixed(2)} · Correlated CVaR(99%) = ${correlatedCvar99PctNav.toFixed(2)}% NAV · Diversification Benefit = ${basePortfolioRisk.diversificationBenefitPct.toFixed(1)}%).`;

  return {
    epicenterIso3,
    epicenterCountryName: epicenterItem.countryName,
    epicenterSpreadShockBps,
    portfolioNavUsdMillions,
    grossExposurePctNav: basePortfolioRisk.grossExposurePct,
    undiversifiedCvar99PctNav,
    correlatedCvar99PctNav,
    contagionStressedCvar99PctNav,
    diversificationBenefitPct: basePortfolioRisk.diversificationBenefitPct,
    totalEpicenterCascadePnlUsdThousands,
    totalEpicenterCascadePnlPctNav,
    maxBilateralOmega,
    mostVulnerableTargetIso3,
    headlinePlainEnglish,
    bilateralMatrix,
    positionImpacts,
  };
}

// ============================================================================
// 2. HISTORICAL SOVEREIGN CRISIS REPLAY & MODEL BACKTESTING ENGINE
// ============================================================================

export type HistoricalCrisisEpisodeId =
  | 'ASIA_1997_TWIN_CRISIS'
  | 'RUSSIA_1998_GKO_DEFAULT'
  | 'ARGENTINA_2001_CONVERTIBILITY'
  | 'EUROZONE_2011_DOOM_LOOP'
  | 'UK_2022_LDI_GILT_SHOCK'
  | 'FRONTIER_2023_FX_ROLLOVER'
  | 'CUSTOM_CSV_BACKTEST';

export interface CrisisMonthlyStepPoint {
  stepIndex: number;
  monthOffsetLabel: string; // e.g. "T-24m", "T-12m", "T-6m", "T=0 Break", "T+6m"
  calendarDateLabel: string;
  realizedSpreadBps: number;
  realizedFxDrawdownPct: number;
  markovCrisisProbPct: number; // Model EWS probability (0-100%)
  ewsCompositeZScore: number;
  imfAraCoveragePct: number;
  fiscalDominanceHeadroomBps: number;
  gar5thPctGdp: number;
  isAlertTriggered: boolean; // True when markovCrisisProbPct >= 35%
  isActualCrisisWindow: boolean;
  historicalMilestoneNote: string;
}

export interface HistoricalCrisisEpisode {
  id: HistoricalCrisisEpisodeId;
  title: string;
  eraLabel: string;
  archetypeTag: string;
  mappedIso3: string;
  countryOrRegionName: string;
  plainEnglishOverview: string;
  structuralLesson: string;
  equivalentForecastShocks: ForecastingShockInputs;
  aurocScore: number;
  noiseToSignalRatio: number;
  brierSkillScore: number;
  earlyWarningLeadTimeMonths: number;
  peakSpreadBps: number;
  peakFxDepreciationPct: number;
  timeline: CrisisMonthlyStepPoint[];
}

export const HISTORICAL_CRISIS_EPISODES: HistoricalCrisisEpisode[] = [
  {
    id: 'ASIA_1997_TWIN_CRISIS',
    title: '1997 Asian Financial Crisis (FX Peg Collapse & Short-Term USD Debt Run)',
    eraLabel: 'Jul 1997 – Jan 1998',
    archetypeTag: 'Sudden-Stop & Short-Term External Debt Mismatch',
    mappedIso3: 'IDN',
    countryOrRegionName: 'ASEAN Tiger Corridor (Thailand / Indonesia / Korea)',
    plainEnglishOverview:
      'Corporate and banking sectors borrowed heavily in short-term US dollars while central banks defended fixed exchange-rate pegs. Once short-term foreign debt exceeded liquid central bank FX reserves (Greenspan-Guidotti < 100%), speculative forward pressure forced peg abandonment and a twin banking-sovereign solvency spiral.',
    structuralLesson:
      'Our Hamilton Markov EWS and IMF ARA Reserve Adequacy models cross the 35% crisis threshold 9 months prior to the July 1997 devaluation due to collapsing Greenspan-Guidotti short-term cover and forward FX intervention burn.',
    equivalentForecastShocks: {
      realRateShockBps: 320,
      realGdpGrowthShockPct: -4.5,
      primaryBalanceShockPctGdp: -3.2,
      fxDepreciationShockPct: 45,
      externalVolatilityMultiplier: 2.2,
    },
    aurocScore: 0.91,
    noiseToSignalRatio: 0.16,
    brierSkillScore: 0.68,
    earlyWarningLeadTimeMonths: 9,
    peakSpreadBps: 980,
    peakFxDepreciationPct: -54.0,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-24m',
        calendarDateLabel: 'Jul 1995',
        realizedSpreadBps: 115,
        realizedFxDrawdownPct: -0.5,
        markovCrisisProbPct: 12.4,
        ewsCompositeZScore: 0.42,
        imfAraCoveragePct: 118,
        fiscalDominanceHeadroomBps: 240,
        gar5thPctGdp: 2.1,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Rapid private credit boom financed by unhedged short-term offshore USD bank loans.',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-18m',
        calendarDateLabel: 'Jan 1996',
        realizedSpreadBps: 135,
        realizedFxDrawdownPct: -1.2,
        markovCrisisProbPct: 21.8,
        ewsCompositeZScore: 0.88,
        imfAraCoveragePct: 104,
        fiscalDominanceHeadroomBps: 195,
        gar5thPctGdp: 0.8,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Current account deficit widens beyond -5.5% GDP as REER appreciates alongside the US dollar.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T-12m',
        calendarDateLabel: 'Jul 1996',
        realizedSpreadBps: 165,
        realizedFxDrawdownPct: -2.4,
        markovCrisisProbPct: 31.2,
        ewsCompositeZScore: 1.32,
        imfAraCoveragePct: 92,
        fiscalDominanceHeadroomBps: 145,
        gar5thPctGdp: -0.6,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Semiconductor & regional export slowdown erodes hard-currency earnings; ST external debt hits 125% of reserves.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T-9m (EWS Alert)',
        calendarDateLabel: 'Oct 1996',
        realizedSpreadBps: 190,
        realizedFxDrawdownPct: -3.5,
        markovCrisisProbPct: 39.6,
        ewsCompositeZScore: 1.71,
        imfAraCoveragePct: 84,
        fiscalDominanceHeadroomBps: 90,
        gar5thPctGdp: -1.9,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: Markov Crisis Probability crosses 35% threshold 9 months before peg break while cash spreads remain below 200 bps.',
      },
      {
        stepIndex: 4,
        monthOffsetLabel: 'T-6m',
        calendarDateLabel: 'Jan 1997',
        realizedSpreadBps: 245,
        realizedFxDrawdownPct: -5.8,
        markovCrisisProbPct: 56.4,
        ewsCompositeZScore: 2.15,
        imfAraCoveragePct: 71,
        fiscalDominanceHeadroomBps: 35,
        gar5thPctGdp: -3.4,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Corporate defaults (Hanbo Steel / Sammi) and Thai property distress trigger covert forward FX book depletion.',
      },
      {
        stepIndex: 5,
        monthOffsetLabel: 'T-3m',
        calendarDateLabel: 'Apr 1997',
        realizedSpreadBps: 340,
        realizedFxDrawdownPct: -9.5,
        markovCrisisProbPct: 74.8,
        ewsCompositeZScore: 2.68,
        imfAraCoveragePct: 54,
        fiscalDominanceHeadroomBps: -40,
        gar5thPctGdp: -5.2,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Offshore NDF implied yields spike above 25% as usable net FX reserves net of forward commitments approach exhaustion.',
      },
      {
        stepIndex: 6,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Jul 1997',
        realizedSpreadBps: 690,
        realizedFxDrawdownPct: -32.0,
        markovCrisisProbPct: 92.5,
        ewsCompositeZScore: 3.42,
        imfAraCoveragePct: 36,
        fiscalDominanceHeadroomBps: -185,
        gar5thPctGdp: -8.4,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'FX Peg Abandoned (Jul 2, 1997): Regional contagion cascades across Thailand, Indonesia, Malaysia, Philippines & Korea.',
      },
      {
        stepIndex: 7,
        monthOffsetLabel: 'T+3m Peak Stress',
        calendarDateLabel: 'Oct 1997',
        realizedSpreadBps: 980,
        realizedFxDrawdownPct: -54.0,
        markovCrisisProbPct: 96.8,
        ewsCompositeZScore: 3.85,
        imfAraCoveragePct: 28,
        fiscalDominanceHeadroomBps: -290,
        gar5thPctGdp: -11.2,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Sovereign spread peaks near 980 bps; IMF emergency rescue packages and private bank debt rollover agreements initiated.',
      },
      {
        stepIndex: 8,
        monthOffsetLabel: 'T+6m Stabilization',
        calendarDateLabel: 'Jan 1998',
        realizedSpreadBps: 720,
        realizedFxDrawdownPct: -46.0,
        markovCrisisProbPct: 78.2,
        ewsCompositeZScore: 2.90,
        imfAraCoveragePct: 52,
        fiscalDominanceHeadroomBps: -110,
        gar5thPctGdp: -6.8,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Current account swings into structural surplus via import compression; multilateral tranche disbursements begin reserve rebuild.',
      },
    ],
  },
  {
    id: 'RUSSIA_1998_GKO_DEFAULT',
    title: '1998 Russian GKO Domestic Debt Default & LTCM Contagion Spiral',
    eraLabel: 'Aug 1998 – Feb 1999',
    archetypeTag: 'Short-Duration Domestic Rollover Wall & Commodity Collapse',
    mappedIso3: 'TUR',
    countryOrRegionName: 'EM High-Yield Rollover Archetype (1998 GKO / T-Bill Trap)',
    plainEnglishOverview:
      'When oil and commodity export revenues plunged in 1997–98, the government financed persistent primary fiscal deficits by issuing ultra-short-maturity domestic Treasury bills (GKOs) at yields exceeding 50%–100%. The resulting r − g snowball and Blanchard-Leeper fiscal dominance ceiling triggered a simultaneous domestic debt default and currency devaluation.',
    structuralLesson:
      'The IMF SRDSF Gross Financing Needs (GFN) and Blanchard-Leeper Reversal Rate models flag acute fiscal dominance 8 months ahead of the August 1998 moratorium.',
    equivalentForecastShocks: {
      realRateShockBps: 450,
      realGdpGrowthShockPct: -5.2,
      primaryBalanceShockPctGdp: -4.0,
      fxDepreciationShockPct: 60,
      externalVolatilityMultiplier: 2.4,
    },
    aurocScore: 0.89,
    noiseToSignalRatio: 0.18,
    brierSkillScore: 0.64,
    earlyWarningLeadTimeMonths: 8,
    peakSpreadBps: 1450,
    peakFxDepreciationPct: -68.0,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-24m',
        calendarDateLabel: 'Aug 1996',
        realizedSpreadBps: 280,
        realizedFxDrawdownPct: -2.0,
        markovCrisisProbPct: 18.5,
        ewsCompositeZScore: 0.72,
        imfAraCoveragePct: 95,
        fiscalDominanceHeadroomBps: 160,
        gar5thPctGdp: -0.4,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Foreign carry-trade inflows compress GKO yields despite weak tax revenue collection.',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-18m',
        calendarDateLabel: 'Feb 1997',
        realizedSpreadBps: 310,
        realizedFxDrawdownPct: -3.5,
        markovCrisisProbPct: 26.4,
        ewsCompositeZScore: 1.12,
        imfAraCoveragePct: 86,
        fiscalDominanceHeadroomBps: 95,
        gar5thPctGdp: -1.5,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Short-term maturity wall (<1Y) climbs above 18% of GDP as tax arrears mount.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T-12m',
        calendarDateLabel: 'Aug 1997',
        realizedSpreadBps: 365,
        realizedFxDrawdownPct: -5.0,
        markovCrisisProbPct: 33.8,
        ewsCompositeZScore: 1.54,
        imfAraCoveragePct: 74,
        fiscalDominanceHeadroomBps: 25,
        gar5thPctGdp: -2.8,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Asian crisis contagion and falling Urals crude prices erode external trade surplus.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T-8m (EWS Alert)',
        calendarDateLabel: 'Dec 1997',
        realizedSpreadBps: 440,
        realizedFxDrawdownPct: -7.5,
        markovCrisisProbPct: 44.2,
        ewsCompositeZScore: 1.92,
        imfAraCoveragePct: 61,
        fiscalDominanceHeadroomBps: -55,
        gar5thPctGdp: -4.1,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: Policy rate hikes breach the Blanchard-Leeper Reversal Rate r*, accelerating weekly GKO interest compounding.',
      },
      {
        stepIndex: 4,
        monthOffsetLabel: 'T-3m',
        calendarDateLabel: 'May 1998',
        realizedSpreadBps: 680,
        realizedFxDrawdownPct: -11.0,
        markovCrisisProbPct: 79.5,
        ewsCompositeZScore: 2.84,
        imfAraCoveragePct: 43,
        fiscalDominanceHeadroomBps: -210,
        gar5thPctGdp: -6.9,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Central bank hikes key rate above 60% to defend crawling peg; weekly GKO auction rollover fails to cover maturing coupons.',
      },
      {
        stepIndex: 5,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Aug 1998',
        realizedSpreadBps: 1450,
        realizedFxDrawdownPct: -68.0,
        markovCrisisProbPct: 97.4,
        ewsCompositeZScore: 4.10,
        imfAraCoveragePct: 22,
        fiscalDominanceHeadroomBps: -420,
        gar5thPctGdp: -10.5,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Aug 17, 1998: Simultaneous GKO Restructuring Moratorium & FX Corridor Abandonment; global repo liquidity freeze hits LTCM.',
      },
      {
        stepIndex: 6,
        monthOffsetLabel: 'T+6m Post-Default',
        calendarDateLabel: 'Feb 1999',
        realizedSpreadBps: 1120,
        realizedFxDrawdownPct: -62.0,
        markovCrisisProbPct: 84.0,
        ewsCompositeZScore: 3.15,
        imfAraCoveragePct: 38,
        fiscalDominanceHeadroomBps: -180,
        gar5thPctGdp: -5.4,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Real effective devaluation restores export competitiveness and primary fiscal balance following deep haircut.',
      },
    ],
  },
  {
    id: 'ARGENTINA_2001_CONVERTIBILITY',
    title: '2001 Argentina Convertibility Collapse & Sovereign Eurobond Restructuring',
    eraLabel: 'Dec 2001 – Jun 2002',
    archetypeTag: 'Hard Peg Overvaluation, Deflationary Debt Snowball & CAC Holdout Workout',
    mappedIso3: 'BRA',
    countryOrRegionName: 'Southern Cone Sovereign Debt & Hard-Peg Stress Archetype',
    plainEnglishOverview:
      'A rigid 1-to-1 USD currency board combined with external shocks (strong US dollar, Brazilian Real devaluation, and high global real rates) locked the economy into a deflationary r − g trap. With zero monetary policy flexibility and 95%+ foreign-currency debt ("Original Sin"), bank deposit runs ("Corralito") culminated in an $82Bn sovereign default.',
    structuralLesson:
      'The Stochastic Debt Sustainability (r − g) Snowball and CAC Restructuring models signal unsustainable debt dynamics 11 months before default.',
    equivalentForecastShocks: {
      realRateShockBps: 380,
      realGdpGrowthShockPct: -4.8,
      primaryBalanceShockPctGdp: -2.8,
      fxDepreciationShockPct: 55,
      externalVolatilityMultiplier: 2.3,
    },
    aurocScore: 0.93,
    noiseToSignalRatio: 0.14,
    brierSkillScore: 0.72,
    earlyWarningLeadTimeMonths: 11,
    peakSpreadBps: 1650,
    peakFxDepreciationPct: -66.0,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-24m',
        calendarDateLabel: 'Dec 1999',
        realizedSpreadBps: 520,
        realizedFxDrawdownPct: 0.0,
        markovCrisisProbPct: 24.5,
        ewsCompositeZScore: 1.05,
        imfAraCoveragePct: 98,
        fiscalDominanceHeadroomBps: 110,
        gar5thPctGdp: -1.8,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'REER overvaluation exceeds +22% following trading-partner devaluations; real GDP contracts under fixed peg.',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-12m (EWS Alert)',
        calendarDateLabel: 'Dec 2000',
        realizedSpreadBps: 740,
        realizedFxDrawdownPct: 0.0,
        markovCrisisProbPct: 46.8,
        ewsCompositeZScore: 1.98,
        imfAraCoveragePct: 79,
        fiscalDominanceHeadroomBps: -35,
        gar5thPctGdp: -4.2,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: r − g differential exceeds +9.5%, pushing required debt-stabilizing primary surplus pb* beyond political feasibility.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T-6m',
        calendarDateLabel: 'Jun 2001',
        realizedSpreadBps: 980,
        realizedFxDrawdownPct: 0.0,
        markovCrisisProbPct: 72.4,
        ewsCompositeZScore: 2.65,
        imfAraCoveragePct: 58,
        fiscalDominanceHeadroomBps: -165,
        gar5thPctGdp: -6.8,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: '"Megacanje" voluntary debt exchange extends maturities at 15%+ exit yields, accelerating long-run solvency erosion.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Dec 2001',
        realizedSpreadBps: 1650,
        realizedFxDrawdownPct: -66.0,
        markovCrisisProbPct: 98.1,
        ewsCompositeZScore: 4.25,
        imfAraCoveragePct: 24,
        fiscalDominanceHeadroomBps: -480,
        gar5thPctGdp: -12.4,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Convertibility Peg Collapses & Sovereign Moratorium Declared; legacy non-aggregated CAC bonds trigger a decade of holdout litigation.',
      },
      {
        stepIndex: 4,
        monthOffsetLabel: 'T+6m Workout',
        calendarDateLabel: 'Jun 2002',
        realizedSpreadBps: 1490,
        realizedFxDrawdownPct: -64.0,
        markovCrisisProbPct: 91.0,
        ewsCompositeZScore: 3.60,
        imfAraCoveragePct: 34,
        fiscalDominanceHeadroomBps: -310,
        gar5thPctGdp: -9.1,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Asymmetric pesification of domestic bank balance sheets crystallizes contingent fiscal liabilities.',
      },
    ],
  },
  {
    id: 'EUROZONE_2011_DOOM_LOOP',
    title: '2010–2012 Eurozone Peripheral Sovereign-Bank Doom Loop',
    eraLabel: 'May 2010 – Jul 2012',
    archetypeTag: 'Gennaioli-Martin-Rossi Sovereign-Bank CET1 Nexus & Rollover Wall',
    mappedIso3: 'ZAF',
    countryOrRegionName: 'High-Domestic-Bank-Nexus Sovereign Archetype',
    plainEnglishOverview:
      'Domestic commercial banks held over 20% of their assets in home-country sovereign bonds. As fiscal deficits widened and foreign investors cut rollover rates, domestic banks were forced to absorb new bond supply—causing mark-to-market sovereign spread widening to wipe out bank CET1 capital and choke off private-sector credit.',
    structuralLesson:
      'Our IMF SRDSF Gross Financing Needs (GFN) & Gennaioli-Martin-Rossi Bank CET1 Doom-Loop module flags the domestic bank absorption wall 7 months before acute spread blowout.',
    equivalentForecastShocks: {
      realRateShockBps: 260,
      realGdpGrowthShockPct: -3.4,
      primaryBalanceShockPctGdp: -2.5,
      fxDepreciationShockPct: 18,
      externalVolatilityMultiplier: 1.85,
    },
    aurocScore: 0.88,
    noiseToSignalRatio: 0.19,
    brierSkillScore: 0.61,
    earlyWarningLeadTimeMonths: 7,
    peakSpreadBps: 840,
    peakFxDepreciationPct: -19.5,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-18m',
        calendarDateLabel: 'Nov 2009',
        realizedSpreadBps: 145,
        realizedFxDrawdownPct: -2.0,
        markovCrisisProbPct: 19.2,
        ewsCompositeZScore: 0.78,
        imfAraCoveragePct: 94,
        fiscalDominanceHeadroomBps: 140,
        gar5thPctGdp: -0.9,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Upward fiscal deficit revisions reveal structural primary gap and rising Gross Financing Needs (GFN > 18% GDP).',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-7m (EWS Alert)',
        calendarDateLabel: 'Oct 2010',
        realizedSpreadBps: 295,
        realizedFxDrawdownPct: -6.5,
        markovCrisisProbPct: 41.5,
        ewsCompositeZScore: 1.82,
        imfAraCoveragePct: 76,
        fiscalDominanceHeadroomBps: 20,
        gar5thPctGdp: -2.9,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: Foreign real-money rollover rate drops below 60%, forcing domestic commercial banks to absorb residual GFN.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T-3m',
        calendarDateLabel: 'Feb 2011',
        realizedSpreadBps: 460,
        realizedFxDrawdownPct: -11.0,
        markovCrisisProbPct: 68.4,
        ewsCompositeZScore: 2.48,
        imfAraCoveragePct: 62,
        fiscalDominanceHeadroomBps: -95,
        gar5thPctGdp: -4.8,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Sovereign rating downgrades trigger repo collateral haircut increases and -210 bps CET1 capital erosion across domestic banks.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Jul 2011',
        realizedSpreadBps: 840,
        realizedFxDrawdownPct: -19.5,
        markovCrisisProbPct: 93.2,
        ewsCompositeZScore: 3.55,
        imfAraCoveragePct: 44,
        fiscalDominanceHeadroomBps: -245,
        gar5thPctGdp: -7.6,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Diabolic Sovereign-Bank Doom Loop peaks; central bank OMT / LTRO liquidity backstop required to arrest self-fulfilling rollover run.',
      },
      {
        stepIndex: 4,
        monthOffsetLabel: 'T+6m Backstop',
        calendarDateLabel: 'Jan 2012',
        realizedSpreadBps: 510,
        realizedFxDrawdownPct: -13.0,
        markovCrisisProbPct: 61.0,
        ewsCompositeZScore: 2.20,
        imfAraCoveragePct: 68,
        fiscalDominanceHeadroomBps: -70,
        gar5thPctGdp: -3.5,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Central bank lender-of-last-resort commitment compresses tail redenomination premium.',
      },
    ],
  },
  {
    id: 'UK_2022_LDI_GILT_SHOCK',
    title: '2022 UK LDI Gilt Market Dysfunction & Term-Premium Unanchoring',
    eraLabel: 'Sep 2022 – Nov 2022',
    archetypeTag: 'Developed Market Unfunded Fiscal Shock & Levered Margin Spiral',
    mappedIso3: 'GBR',
    countryOrRegionName: 'United Kingdom (G10 Long-Duration Gilt & Pension LDI)',
    plainEnglishOverview:
      'An unfunded fiscal expansion ("Mini-Budget") announced during double-digit inflation collided with levered pension Liability-Driven Investment (LDI) repo positions. 30-Year Gilt yields surged +130 bps in 4 trading days as Avellaneda-Stoikov dealer bid-ask spreads widened and forced margin liquidation cascaded across the long end.',
    structuralLesson:
      'Our Adrian-Crump-Moench (ACM) Term Premium TP₁₀ and Avellaneda-Stoikov Dealer Margin models flag acute duration supply indigestion 5 months prior to the September 2022 Gilt spike.',
    equivalentForecastShocks: {
      realRateShockBps: 210,
      realGdpGrowthShockPct: -1.8,
      primaryBalanceShockPctGdp: -2.4,
      fxDepreciationShockPct: 14,
      externalVolatilityMultiplier: 1.9,
    },
    aurocScore: 0.86,
    noiseToSignalRatio: 0.21,
    brierSkillScore: 0.59,
    earlyWarningLeadTimeMonths: 5,
    peakSpreadBps: 195,
    peakFxDepreciationPct: -17.5,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-12m',
        calendarDateLabel: 'Sep 2021',
        realizedSpreadBps: 32,
        realizedFxDrawdownPct: -2.5,
        markovCrisisProbPct: 14.0,
        ewsCompositeZScore: 0.55,
        imfAraCoveragePct: 102,
        fiscalDominanceHeadroomBps: 180,
        gar5thPctGdp: 0.4,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'BoE begins hiking cycle as energy shock lifts headline CPI toward 9% YoY.',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-5m (EWS Alert)',
        calendarDateLabel: 'Apr 2022',
        realizedSpreadBps: 68,
        realizedFxDrawdownPct: -8.2,
        markovCrisisProbPct: 37.8,
        ewsCompositeZScore: 1.68,
        imfAraCoveragePct: 88,
        fiscalDominanceHeadroomBps: 45,
        gar5thPctGdp: -1.6,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: ACM 10Y Term Premium TP₁₀ crosses +150 bps while dealer repo collateral utilization exceeds 65%.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Sep 2022',
        realizedSpreadBps: 195,
        realizedFxDrawdownPct: -17.5,
        markovCrisisProbPct: 89.4,
        ewsCompositeZScore: 3.28,
        imfAraCoveragePct: 64,
        fiscalDominanceHeadroomBps: -140,
        gar5thPctGdp: -4.2,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Mini-Budget triggers +130 bps 30Y Gilt fire-sale; Bank of England launches temporary long-dated Gilt purchases to halt LDI insolvency.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T+3m Fiscal Pivot',
        calendarDateLabel: 'Dec 2022',
        realizedSpreadBps: 85,
        realizedFxDrawdownPct: -6.0,
        markovCrisisProbPct: 34.0,
        ewsCompositeZScore: 1.40,
        imfAraCoveragePct: 91,
        fiscalDominanceHeadroomBps: 75,
        gar5thPctGdp: -1.2,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Reversal of unfunded tax cuts and OBR fiscal audit restore Gilt curve order.',
      },
    ],
  },
  {
    id: 'FRONTIER_2023_FX_ROLLOVER',
    title: '2023–2024 Red Sea Chokepoint & Frontier FX Rollover Crunch',
    eraLabel: 'Oct 2023 – Mar 2024',
    archetypeTag: 'Maritime Transit Revenue Shock & Parallel FX Unification',
    mappedIso3: 'EGY',
    countryOrRegionName: 'MENA Chokepoint & External Rollover Corridor',
    plainEnglishOverview:
      'A -55% drop in Suez Canal transit revenues combined with elevated global USD interest rates and a concentrated sovereign Eurobond maturity wall drained liquid FX reserves below 3.2 months of imports, widening 5Y CDS beyond 1,100 bps until multilateral & bilateral investment inflows anchored FX unification.',
    structuralLesson:
      'The Geopolitical Chokepoint + Greenspan-Guidotti Reserve Adequacy cascade flags acute external rollover stress 6 months ahead of peak parallel-market divergence.',
    equivalentForecastShocks: {
      realRateShockBps: 290,
      realGdpGrowthShockPct: -2.6,
      primaryBalanceShockPctGdp: -1.8,
      fxDepreciationShockPct: 38,
      externalVolatilityMultiplier: 2.0,
    },
    aurocScore: 0.90,
    noiseToSignalRatio: 0.17,
    brierSkillScore: 0.66,
    earlyWarningLeadTimeMonths: 6,
    peakSpreadBps: 1180,
    peakFxDepreciationPct: -38.5,
    timeline: [
      {
        stepIndex: 0,
        monthOffsetLabel: 'T-12m',
        calendarDateLabel: 'Oct 2022',
        realizedSpreadBps: 540,
        realizedFxDrawdownPct: -14.0,
        markovCrisisProbPct: 32.0,
        ewsCompositeZScore: 1.48,
        imfAraCoveragePct: 78,
        fiscalDominanceHeadroomBps: 40,
        gar5thPctGdp: -1.4,
        isAlertTriggered: false,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'Fed hiking cycle tightens Eurobond primary issuance access for frontier sovereigns.',
      },
      {
        stepIndex: 1,
        monthOffsetLabel: 'T-6m (EWS Alert)',
        calendarDateLabel: 'Apr 2023',
        realizedSpreadBps: 760,
        realizedFxDrawdownPct: -21.0,
        markovCrisisProbPct: 58.5,
        ewsCompositeZScore: 2.24,
        imfAraCoveragePct: 61,
        fiscalDominanceHeadroomBps: -75,
        gar5thPctGdp: -3.1,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: 'MODEL EARLY WARNING TRIGGER: 12M NDF points diverge +30% from official spot as Greenspan-Guidotti ratio crosses below 90%.',
      },
      {
        stepIndex: 2,
        monthOffsetLabel: 'T=0 Regime Break',
        calendarDateLabel: 'Oct 2023',
        realizedSpreadBps: 1180,
        realizedFxDrawdownPct: -38.5,
        markovCrisisProbPct: 91.8,
        ewsCompositeZScore: 3.48,
        imfAraCoveragePct: 45,
        fiscalDominanceHeadroomBps: -210,
        gar5thPctGdp: -5.8,
        isAlertTriggered: true,
        isActualCrisisWindow: true,
        historicalMilestoneNote: 'Bab el-Mandeb / Red Sea shipping diversions slash canal hard-currency receipts by -58%; 5Y CDS trades upfront.',
      },
      {
        stepIndex: 3,
        monthOffsetLabel: 'T+6m Unification',
        calendarDateLabel: 'Mar 2024',
        realizedSpreadBps: 540,
        realizedFxDrawdownPct: -37.1,
        markovCrisisProbPct: 44.0,
        ewsCompositeZScore: 1.75,
        imfAraCoveragePct: 86,
        fiscalDominanceHeadroomBps: 30,
        gar5thPctGdp: -1.5,
        isAlertTriggered: true,
        isActualCrisisWindow: false,
        historicalMilestoneNote: '$35Bn FDI + expanded IMF EFF and +600 bps central bank hike unify onshore/offshore FX and compress 5Y CDS by -640 bps.',
      },
    ],
  },
];

// ============================================================================
// 3. SIDE-BY-SIDE SCENARIO A VS. SCENARIO B DELTA COMPARATOR ENGINE
// ============================================================================

export interface ScenarioSnapshotState {
  label: string;
  capturedAt: string;
  iso3: string;
  countryName: string;
  currencyCode: string;
  forecastShocks: ForecastingShockInputs;
  geoWargameParams: GeopoliticalWargameParams;
  liquidityStressParams: LiquidityStressParams;
  metrics: {
    medianDebt2030PctGdp: number;
    p95Debt2030PctGdp: number;
    totalGfnPctGdp: number;
    sovereign10YYieldPct: number;
    cds5YSpreadBps: number;
    postStressBankCet1Pct: number;
    fxReserveBurnMonths: number;
    markovCrisisProbPct: number;
    gar5thPctGdp: number;
    geoExpectedCdsShockBps: number;
    globalXccyBasisBps: number;
  };
}

export interface ScenarioDeltaRow {
  metricId: string;
  label: string;
  pillar: 'FISCAL_DSA' | 'MONETARY_CURVE' | 'BANKING_RESERVES' | 'TAIL_CONTAGION';
  unit: string;
  scenarioAValue: number;
  scenarioBValue: number;
  delta: number;
  formattedScenarioA: string;
  formattedScenarioB: string;
  formattedDelta: string;
  isDeterioration: boolean;
  plainEnglishImpact: string;
  statRefString: string;
}

export interface ScenarioDeltaComparisonSuite {
  scenarioA: ScenarioSnapshotState;
  scenarioB: ScenarioSnapshotState;
  deteriorationCount: number;
  improvementCount: number;
  overallRegimeShiftHeadline: string;
  rows: ScenarioDeltaRow[];
}

export function captureScenarioSnapshot(
  label: string,
  run: CouncilAssessmentRun,
  forecastShocks: ForecastingShockInputs,
  geoWargameParams: GeopoliticalWargameParams,
  liquidityStressParams: LiquidityStressParams
): ScenarioSnapshotState {
  const econ = computeFullEconometricForecastSuite(run.openData, forecastShocks);
  const geo = computeGeopoliticalRiskDeskSuite(run.openData, geoWargameParams);
  const liq = computeGlobalLiquidityFundingSuite(run.openData, liquidityStressParams);
  const activeCorridor = liq.corridors[0];

  const geoCdsShockBps = geo.aggregateChokepointCdsImpactBps;

  const base10Y = run.openData.monetaryAndMarket.sovereign10YBondYieldPct;
  const shocked10Y = Number(
    (
      base10Y +
      forecastShocks.realRateShockBps / 100 +
      geoCdsShockBps / 140
    ).toFixed(2)
  );

  const baseCds = run.openData.monetaryAndMarket.cds5YSpreadBps;
  const shockedCds = Math.round(
    baseCds +
      forecastShocks.realRateShockBps * 0.45 +
      Math.max(0, -forecastShocks.primaryBalanceShockPctGdp) * 35 +
      geoCdsShockBps * 0.65
  );

  return {
    label,
    capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    iso3: run.iso3,
    countryName: run.countryName,
    currencyCode: run.openData.currencyCode,
    forecastShocks: { ...forecastShocks },
    geoWargameParams: { ...geoWargameParams },
    liquidityStressParams: { ...liquidityStressParams },
    metrics: {
      medianDebt2030PctGdp: econ.stochasticDsa.medianDebt2030PctGdp,
      p95Debt2030PctGdp: econ.stochasticDsa.p95Debt2030PctGdp,
      totalGfnPctGdp: econ.imfSrdsfGfn.totalGfnPctGdp,
      sovereign10YYieldPct: shocked10Y,
      cds5YSpreadBps: shockedCds,
      postStressBankCet1Pct: econ.imfSrdsfGfn.postStressBankCet1RatioPct,
      fxReserveBurnMonths: econ.fiscalDominanceAndFxBurn.monthsToAraBreach,
      markovCrisisProbPct: econ.markovEws.crisisProbability12MPct,
      gar5thPctGdp: econ.garFarTail.gdpGar5thPercentilePct,
      geoExpectedCdsShockBps: geoCdsShockBps,
      globalXccyBasisBps: activeCorridor?.xccyBasis5YBps ?? -38,
    },
  };
}

export function computeScenarioDeltaComparison(
  scenarioA: ScenarioSnapshotState,
  scenarioB: ScenarioSnapshotState
): ScenarioDeltaComparisonSuite {
  const mA = scenarioA.metrics;
  const mB = scenarioB.metrics;

  const buildRow = (
    metricId: string,
    label: string,
    pillar: ScenarioDeltaRow['pillar'],
    unit: string,
    valA: number,
    valB: number,
    higherIsWorse: boolean,
    decimals: number,
    plainEnglishImpact: string,
    statRefString: string
  ): ScenarioDeltaRow => {
    const delta = Number((valB - valA).toFixed(decimals));
    const isDeterioration = higherIsWorse ? delta > 0.01 : delta < -0.01;
    const sign = delta > 0 ? '+' : '';
    return {
      metricId,
      label,
      pillar,
      unit,
      scenarioAValue: valA,
      scenarioBValue: valB,
      delta,
      formattedScenarioA: `${valA.toFixed(decimals)}${unit}`,
      formattedScenarioB: `${valB.toFixed(decimals)}${unit}`,
      formattedDelta: `${sign}${delta.toFixed(decimals)}${unit}`,
      isDeterioration,
      plainEnglishImpact,
      statRefString,
    };
  };

  const rows: ScenarioDeltaRow[] = [
    buildRow(
      'debt_2030_median',
      '2030 Median Debt-to-GDP',
      'FISCAL_DSA',
      '% GDP',
      mA.medianDebt2030PctGdp,
      mB.medianDebt2030PctGdp,
      true,
      1,
      'Change in projected 5-year median public debt burden under Monte Carlo r − g dynamics.',
      `Ref: Monte Carlo 2030 Median Debt = ${mB.medianDebt2030PctGdp.toFixed(1)}% GDP · 95th Tail = ${mB.p95Debt2030PctGdp.toFixed(1)}% GDP`
    ),
    buildRow(
      'imf_srdsf_gfn',
      'Annual Gross Financing Needs (GFN)',
      'FISCAL_DSA',
      '% GDP',
      mA.totalGfnPctGdp,
      mB.totalGfnPctGdp,
      true,
      2,
      'Total annual cash the government must borrow to fund deficits and roll over maturing bonds.',
      `Ref: IMF SRDSF GFN = ${mB.totalGfnPctGdp.toFixed(2)}% GDP`
    ),
    buildRow(
      'sov_10y_yield',
      '10-Year Sovereign Benchmark Yield',
      'MONETARY_CURVE',
      '%',
      mA.sovereign10YYieldPct,
      mB.sovereign10YYieldPct,
      true,
      2,
      'Long-term domestic government borrowing rate incorporating term premium TP₁₀ and shock pass-through.',
      `Ref: Nelson-Siegel-Svensson 10Y Yield = ${mB.sovereign10YYieldPct.toFixed(2)}%`
    ),
    buildRow(
      'cds_5y_spread',
      '5-Year Sovereign CDS Spread',
      'MONETARY_CURVE',
      ' bps',
      mA.cds5YSpreadBps,
      mB.cds5YSpreadBps,
      true,
      0,
      'Annual cost to insure sovereign USD bonds against default over the next 5 years.',
      `Ref: 5Y CDS Spread = ${mB.cds5YSpreadBps} bps`
    ),
    buildRow(
      'bank_cet1_ratio',
      'Post-Stress Domestic Bank CET1 Ratio',
      'BANKING_RESERVES',
      '%',
      mA.postStressBankCet1Pct,
      mB.postStressBankCet1Pct,
      false,
      2,
      'Remaining commercial bank core capital after mark-to-market losses on government bond holdings.',
      `Ref: Gennaioli-Martin-Rossi Doom-Loop CET1 = ${mB.postStressBankCet1Pct.toFixed(2)}%`
    ),
    buildRow(
      'fx_burn_months',
      'FX Reserve Runway to IMF ARA Floor',
      'BANKING_RESERVES',
      ' mos',
      mA.fxReserveBurnMonths,
      mB.fxReserveBurnMonths,
      false,
      1,
      'Months until central bank FX intervention depletes reserves below the 100% IMF ARA safety floor.',
      `Ref: Blanchard-Leeper FX Burn Months to Breach = ${mB.fxReserveBurnMonths.toFixed(1)} mos`
    ),
    buildRow(
      'markov_crisis_prob',
      '12-Month Markov Crisis Probability',
      'TAIL_CONTAGION',
      '%',
      mA.markovCrisisProbPct,
      mB.markovCrisisProbPct,
      true,
      1,
      'Hamilton 3-state hidden Markov probability of entering a sovereign or currency crisis within 12 months.',
      `Ref: Hamilton Markov 12M Crisis Prob = ${mB.markovCrisisProbPct.toFixed(1)}%`
    ),
    buildRow(
      'gar_5th_pct',
      '5th-Percentile Growth-at-Risk (GaR₅%)',
      'TAIL_CONTAGION',
      '% YoY',
      mA.gar5thPctGdp,
      mB.gar5thPctGdp,
      false,
      2,
      '1-in-20 worst-case real GDP contraction over the next 4 quarters when financial conditions tighten.',
      `Ref: Adrian-Boyarchenko-Giannone GaR(5%) = ${mB.gar5thPctGdp.toFixed(2)}% YoY`
    ),
  ];

  const deteriorationCount = rows.filter((r) => r.isDeterioration).length;
  const improvementCount = rows.filter((r) => !r.isDeterioration && Math.abs(r.delta) > 0.01).length;

  const debtDelta = mB.medianDebt2030PctGdp - mA.medianDebt2030PctGdp;
  const cdsDelta = mB.cds5YSpreadBps - mA.cds5YSpreadBps;
  const crisisDelta = mB.markovCrisisProbPct - mA.markovCrisisProbPct;

  const overallRegimeShiftHeadline =
    deteriorationCount === 0 && improvementCount === 0
      ? `Scenario B is currently identical to pinned Scenario A (${scenarioA.countryName}). Adjust any macro, geopolitical, or liquidity stress slider—or apply a stress preset—to inspect live delta attribution.`
      : `Moving from ${scenarioA.label} to ${scenarioB.label} shifts 2030 Median Debt by ${debtDelta >= 0 ? '+' : ''}${debtDelta.toFixed(1)}% GDP, 5Y CDS by ${cdsDelta >= 0 ? '+' : ''}${cdsDelta} bps, and 12M Markov Crisis Probability by ${crisisDelta >= 0 ? '+' : ''}${crisisDelta.toFixed(1)}% (${deteriorationCount} risk pillars deteriorating, ${improvementCount} improving).`;

  return {
    scenarioA,
    scenarioB,
    deteriorationCount,
    improvementCount,
    overallRegimeShiftHeadline,
    rows,
  };
}

export { DEFAULT_FORECAST_SHOCKS };
