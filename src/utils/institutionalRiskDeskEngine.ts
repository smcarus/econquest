import {
  CacHoldoutGameTheoryResult,
  ContagionMatrixRow,
  CouncilAssessmentRun,
  CouncilKellyLobExecutionResult,
  CouncilKellyTicketItem,
  CrossCurrencyAndLegalResult,
  CrossCurrencyBasisPoint,
  KeyRateBucketExposure,
  OpenDataSnapshot,
  PortfolioPositionItem,
  PortfolioPositionRiskContribution,
  PortfolioRiskMandateConfig,
  PortfolioTailRiskResult,
  RatingMigrationProfile,
  RestructuringAndRatingResult,
  RestructuringSimulationParams,
  SeniorityTrancheItem,
  WatchlistItem,
} from '../types/council';
import { SOVEREIGN_CATALOG, buildDefaultAssessmentRun } from '../data/presetsAndBaselines';

export const DEFAULT_PORTFOLIO_MANDATE_CONFIG: PortfolioRiskMandateConfig = {
  portfolioNavUsdMillions: 250,
  maxPortfolioDv01UsdThousands: 175,
  maxSingleCountryCs01UsdThousands: 75,
  maxCvar99PctNav: 4.5,
};

export const DEFAULT_RESTRUCTURING_PARAMS: RestructuringSimulationParams = {
  exitYieldPct: 11.5,
  principalHaircutPct: 20,
  maturityExtensionYears: 5,
  couponReductionBps: 150,
};

export function buildDefaultPortfolioPositions(
  activeIso3: string,
  watchlistItems: WatchlistItem[]
): PortfolioPositionItem[] {
  const pool =
    watchlistItems.length >= 4
      ? watchlistItems.slice(0, 5)
      : SOVEREIGN_CATALOG.slice(0, 5);

  const hasActive = pool.some((p) => p.iso3 === activeIso3);
  const finalPool = hasActive
    ? pool
    : [
        SOVEREIGN_CATALOG.find((c) => c.iso3 === activeIso3) || SOVEREIGN_CATALOG[0],
        ...pool.slice(0, 4),
      ];

  const expressions: PortfolioPositionItem['expressionType'][] = [
    'CURVE_2S10S_STEEPENER',
    'FX_HEDGED_LOCAL_CARRY',
    'CDS_5Y_PROTECTION',
    'USD_EUROBOND_LONG',
    'LOCAL_RATES_RECEIVER',
  ];
  const defaultWeights = [30, 25, 15, 15, 15];

  return finalPool.map((item, idx) => {
    const snap = buildDefaultAssessmentRun(item.iso3).openData;
    return {
      iso3: item.iso3,
      countryName: item.countryName,
      currencyCode: snap.currencyCode,
      expressionType: expressions[idx % expressions.length],
      weightNavPct: defaultWeights[idx % defaultWeights.length],
    };
  });
}

/**
 * 1. Multi-Sovereign Portfolio VaR, Cornish-Fisher CVaR99, Key-Rate DV01 Ladder & Contagion Matrix
 */
export function computeMultiSovereignPortfolioRisk(
  activeRun: CouncilAssessmentRun,
  positions: PortfolioPositionItem[],
  mandate: PortfolioRiskMandateConfig = DEFAULT_PORTFOLIO_MANDATE_CONFIG
): PortfolioTailRiskResult {
  const nav = Math.max(50, mandate.portfolioNavUsdMillions);
  const grossExposurePct = positions.reduce((acc, p) => acc + Math.abs(p.weightNavPct), 0);

  // Build telemetry lookup for each sovereign in the book
  const telemetryMap: Record<string, OpenDataSnapshot> = {};
  for (const pos of positions) {
    if (pos.iso3 === activeRun.iso3) {
      telemetryMap[pos.iso3] = activeRun.openData;
    } else {
      telemetryMap[pos.iso3] = buildDefaultAssessmentRun(pos.iso3).openData;
    }
  }

  // Compute standalone risk, DV01, CS01, and liquidity per position
  const rawContribs = positions.map((pos) => {
    const snap = telemetryMap[pos.iso3];
    const notionalM = (nav * pos.weightNavPct) / 100;
    const cdsBps = snap.monetaryAndMarket.cds5YSpreadBps;
    const debtGdp = snap.imfIndicators.debtToGdpPct;

    // Effective modified duration and spread duration by expression type
    const durationConfig: Record<
      PortfolioPositionItem['expressionType'],
      { rateDur: number; spreadDur: number; volMult: number; carryMult: number }
    > = {
      LOCAL_RATES_RECEIVER: { rateDur: 5.4, spreadDur: 1.8, volMult: 1.05, carryMult: 1.0 },
      USD_EUROBOND_LONG: { rateDur: 4.8, spreadDur: 6.2, volMult: 0.95, carryMult: 0.85 },
      CDS_5Y_PROTECTION: { rateDur: -0.4, spreadDur: -4.4, volMult: 0.85, carryMult: -0.55 },
      CURVE_2S10S_STEEPENER: { rateDur: 2.2, spreadDur: 2.9, volMult: 0.78, carryMult: 0.65 },
      FX_HEDGED_LOCAL_CARRY: { rateDur: 3.6, spreadDur: 2.5, volMult: 0.88, carryMult: 1.15 },
    };

    const cfg = durationConfig[pos.expressionType];
    // DV01 in $ thousands per 1 bp move: Notional ($M) * Duration * 0.1
    const rateDv01UsdThousands = Number((notionalM * cfg.rateDur * 0.1).toFixed(1));
    const creditCs01UsdThousands = Number((notionalM * cfg.spreadDur * 0.1).toFixed(1));

    // Annualized volatility calibrated to sovereign CDS spread & debt ratio
    const baseAnnualVolPct = Math.max(
      4.2,
      Math.min(22.5, (4.5 + cdsBps / 42 + Math.max(0, debtGdp - 60) * 0.04) * cfg.volMult)
    );

    // Stressed bid-ask cost & liquidation horizon
    const stressedBidAskCostBps = Math.round(
      Math.max(8, (cdsBps / 18) * (pos.expressionType === 'LOCAL_RATES_RECEIVER' ? 1.15 : 0.9))
    );
    const dailyDepthM = Math.max(18, 140 - cdsBps * 0.18);
    const liquidityDaysToLiquidate = Number(Math.max(0.5, notionalM / dailyDepthM).toFixed(1));

    return {
      pos,
      snap,
      notionalM,
      rateDv01UsdThousands,
      creditCs01UsdThousands,
      baseAnnualVolPct,
      stressedBidAskCostBps,
      liquidityDaysToLiquidate,
      cfg,
    };
  });

  // Build cross-sovereign correlation matrix (rho_ij)
  const getPairCorrelation = (isoA: string, isoB: string, exprA: string, exprB: string): number => {
    if (isoA === isoB) return 1.0;
    const snapA = telemetryMap[isoA];
    const snapB = telemetryMap[isoB];
    const spreadDiff = Math.abs(
      snapA.monetaryAndMarket.cds5YSpreadBps - snapB.monetaryAndMarket.cds5YSpreadBps
    );
    const baseRho = Math.max(0.22, Math.min(0.78, 0.68 - spreadDiff / 900));
    // If one position is a CDS protection hedge, correlation of returns is negative
    const signA = exprA === 'CDS_5Y_PROTECTION' ? -1 : 1;
    const signB = exprB === 'CDS_5Y_PROTECTION' ? -1 : 1;
    return Number((baseRho * signA * signB).toFixed(2));
  };

  // Compute Portfolio Variance & Marginal Contributions to Risk
  let portfolioVariancePct2 = 0;
  let undiversifiedVolSumPct = 0;

  for (let i = 0; i < rawContribs.length; i++) {
    const ci = rawContribs[i];
    const wi = ci.pos.weightNavPct / 100;
    const sigmaI = ci.baseAnnualVolPct;
    undiversifiedVolSumPct += Math.abs(wi) * sigmaI;

    for (let j = 0; j < rawContribs.length; j++) {
      const cj = rawContribs[j];
      const wj = cj.pos.weightNavPct / 100;
      const sigmaJ = cj.baseAnnualVolPct;
      const rho = getPairCorrelation(
        ci.pos.iso3,
        cj.pos.iso3,
        ci.pos.expressionType,
        cj.pos.expressionType
      );
      portfolioVariancePct2 += wi * wj * sigmaI * sigmaJ * rho;
    }
  }

  const portfolioAnnualVolPct = Math.max(0.8, Math.sqrt(Math.max(0.5, portfolioVariancePct2)));
  const tenDayScale = Math.sqrt(10 / 252); // ~0.1992
  const tenDayVolPct = portfolioAnnualVolPct * tenDayScale;

  // Parametric 95% VaR (z = 1.645)
  const parametricVar95TenDayPct = Number((tenDayVolPct * 1.645).toFixed(2));

  // Cornish-Fisher 99% Tail VaR (incorporating sovereign credit fat tails: skew S = -0.55, excess kurtosis K = 2.4)
  const z99 = 2.326;
  const skew = -0.55;
  const kurt = 2.4;
  const zCornishFisher =
    z99 +
    ((z99 * z99 - 1) * Math.abs(skew)) / 6 +
    ((z99 * z99 * z99 - 3 * z99) * kurt) / 24 -
    ((2 * z99 * z99 * z99 - 5 * z99) * skew * skew) / 36;
  const cornishFisherVar99TenDayPct = Number((tenDayVolPct * zCornishFisher).toFixed(2));

  // 99% Expected Shortfall (CVaR_99) = E[Loss | Loss > VaR_99]
  const expectedShortfallCvar99TenDayPct = Number(
    (cornishFisherVar99TenDayPct * 1.18).toFixed(2)
  );
  const expectedShortfallCvar99UsdMillions = Number(
    ((nav * expectedShortfallCvar99TenDayPct) / 100).toFixed(2)
  );

  // Liquidity-Adjusted VaR (LVaR_99) adds stressed bid-ask liquidation cost
  const weightedLiquidityCostPct = rawContribs.reduce(
    (acc, c) => acc + (Math.abs(c.pos.weightNavPct) / 100) * (c.stressedBidAskCostBps / 100),
    0
  );
  const liquidityAdjustedLvar99TenDayPct = Number(
    (expectedShortfallCvar99TenDayPct + weightedLiquidityCostPct).toFixed(2)
  );
  const liquidityHorizonDays = Number(
    Math.max(...rawContribs.map((c) => c.liquidityDaysToLiquidate), 1.0).toFixed(1)
  );

  const diversificationBenefitPct =
    undiversifiedVolSumPct > 0
      ? Number(
          Math.max(
            5,
            Math.min(65, ((undiversifiedVolSumPct - portfolioAnnualVolPct) / undiversifiedVolSumPct) * 100)
          ).toFixed(1)
        )
      : 22.5;

  // Compute Marginal Contribution to Risk (MCTR) and Component CVaR for each position
  const covWithPortfolio = rawContribs.map((ci) => {
    let covSum = 0;
    for (const cj of rawContribs) {
      const wj = cj.pos.weightNavPct / 100;
      const rho = getPairCorrelation(
        ci.pos.iso3,
        cj.pos.iso3,
        ci.pos.expressionType,
        cj.pos.expressionType
      );
      covSum += wj * ci.baseAnnualVolPct * cj.baseAnnualVolPct * rho;
    }
    return Math.max(0.1, covSum);
  });

  const totalRawComponent = rawContribs.reduce(
    (acc, ci, idx) => acc + Math.abs(ci.pos.weightNavPct / 100) * covWithPortfolio[idx],
    0
  );

  const positionContributions: PortfolioPositionRiskContribution[] = rawContribs.map((ci, idx) => {
    const share =
      totalRawComponent > 0
        ? ((Math.abs(ci.pos.weightNavPct / 100) * covWithPortfolio[idx]) / totalRawComponent) * 100
        : 100 / Math.max(1, rawContribs.length);
    const componentCvarPctNav = Number(
      ((expectedShortfallCvar99TenDayPct * share) / 100).toFixed(2)
    );
    const mctrPctNav = Number(
      (
        (covWithPortfolio[idx] / Math.max(1, portfolioAnnualVolPct)) *
        tenDayScale *
        zCornishFisher
      ).toFixed(2)
    );

    return {
      iso3: ci.pos.iso3,
      countryName: ci.pos.countryName,
      currencyCode: ci.pos.currencyCode,
      expressionType: ci.pos.expressionType,
      weightNavPct: ci.pos.weightNavPct,
      notionalUsdMillions: Number(ci.notionalM.toFixed(1)),
      rateDv01UsdThousands: ci.rateDv01UsdThousands,
      creditCs01UsdThousands: ci.creditCs01UsdThousands,
      standaloneVolAnnualPct: Number(ci.baseAnnualVolPct.toFixed(1)),
      mctrPctNav,
      componentCvarPctNav,
      componentRiskSharePct: Number(share.toFixed(1)),
      liquidityDaysToLiquidate: ci.liquidityDaysToLiquidate,
      stressedBidAskCostBps: ci.stressedBidAskCostBps,
      breachesSingleCountryCs01:
        Math.abs(ci.creditCs01UsdThousands) > mandate.maxSingleCountryCs01UsdThousands,
    };
  });

  const totalNetRateDv01UsdThousands = Number(
    positionContributions.reduce((acc, p) => acc + p.rateDv01UsdThousands, 0).toFixed(1)
  );
  const totalNetCreditCs01UsdThousands = Number(
    positionContributions.reduce((acc, p) => acc + p.creditCs01UsdThousands, 0).toFixed(1)
  );

  // Key-Rate Duration (KRD) Buckets: 2Y, 5Y, 10Y, 30Y
  const bucketSplits: Record<
    PortfolioPositionItem['expressionType'],
    { r: [number, number, number, number]; c: [number, number, number, number] }
  > = {
    LOCAL_RATES_RECEIVER: { r: [0.2, 0.45, 0.3, 0.05], c: [0.25, 0.45, 0.25, 0.05] },
    USD_EUROBOND_LONG: { r: [0.1, 0.3, 0.45, 0.15], c: [0.1, 0.32, 0.43, 0.15] },
    CDS_5Y_PROTECTION: { r: [0.15, 0.75, 0.1, 0.0], c: [0.1, 0.8, 0.1, 0.0] },
    CURVE_2S10S_STEEPENER: { r: [0.65, 0.15, -0.55, -0.25], c: [0.25, 0.35, 0.3, 0.1] },
    FX_HEDGED_LOCAL_CARRY: { r: [0.45, 0.35, 0.15, 0.05], c: [0.4, 0.4, 0.15, 0.05] },
  };

  const tenors: ('2Y' | '5Y' | '10Y' | '30Y')[] = ['2Y', '5Y', '10Y', '30Y'];
  const keyRateBuckets: KeyRateBucketExposure[] = tenors.map((tenor, tIdx) => {
    let rSum = 0;
    let cSum = 0;
    for (const p of positionContributions) {
      const split = bucketSplits[p.expressionType];
      rSum += p.rateDv01UsdThousands * split.r[tIdx];
      cSum += p.creditCs01UsdThousands * split.c[tIdx];
    }
    const bucketLimit = Number((mandate.maxPortfolioDv01UsdThousands * 0.48).toFixed(0));
    return {
      tenorBucket: tenor,
      rateDv01UsdThousands: Number(rSum.toFixed(1)),
      creditCs01UsdThousands: Number(cSum.toFixed(1)),
      mandateBucketLimitUsdThousands: bucketLimit,
      netCarryBps: Math.round((Math.abs(rSum) + Math.abs(cSum)) * 1.45),
    };
  });

  // Contagion & Global Macro Factor Beta Matrix
  const contagionMatrix: ContagionMatrixRow[] = rawContribs.map((ci) => {
    const cds = ci.snap.monetaryAndMarket.cds5YSpreadBps;
    const ca = ci.snap.worldBankIndicators.currentAccountPctGdp;
    const sign = ci.pos.expressionType === 'CDS_5Y_PROTECTION' ? -1 : 1;

    // Spread/yield sensitivity in bps to global macro shocks
    const betaUs10YReal50Bps = Math.round((28 + cds * 0.09) * sign);
    const betaDxyPlus5Pct = Math.round((34 + cds * 0.11 - ca * 3.5) * sign);
    const betaBrentPlus20Usd = Math.round(
      ((ci.pos.iso3 === 'BRA' || ci.pos.iso3 === 'MEX' ? -14 : 26) + cds * 0.04) * sign
    );
    const betaChinaPmiMinus2Pts = Math.round((22 + cds * 0.06) * sign);

    const avgShockBps = (betaUs10YReal50Bps + betaDxyPlus5Pct) * 0.5;
    const compositeShockPnlUsdThousands = Math.round(
      -(avgShockBps * (ci.rateDv01UsdThousands + ci.creditCs01UsdThousands) * 0.35)
    );

    return {
      iso3: ci.pos.iso3,
      countryName: ci.pos.countryName,
      correlations: rawContribs.map((cj) => ({
        targetIso3: cj.pos.iso3,
        rho: getPairCorrelation(
          ci.pos.iso3,
          cj.pos.iso3,
          ci.pos.expressionType,
          cj.pos.expressionType
        ),
      })),
      betaUs10YReal50Bps,
      betaDxyPlus5Pct,
      betaBrentPlus20Usd,
      betaChinaPmiMinus2Pts,
      compositeShockPnlUsdThousands,
    };
  });

  const dv01MandateUtilizationPct = Number(
    ((Math.abs(totalNetRateDv01UsdThousands) / mandate.maxPortfolioDv01UsdThousands) * 100).toFixed(1)
  );
  const maxSingleCs01 = Math.max(
    ...positionContributions.map((p) => Math.abs(p.creditCs01UsdThousands)),
    0
  );
  const cs01MaxSingleUtilizationPct = Number(
    ((maxSingleCs01 / mandate.maxSingleCountryCs01UsdThousands) * 100).toFixed(1)
  );
  const cvarMandateUtilizationPct = Number(
    ((expectedShortfallCvar99TenDayPct / mandate.maxCvar99PctNav) * 100).toFixed(1)
  );

  const hasMandateBreach =
    dv01MandateUtilizationPct > 100 ||
    cs01MaxSingleUtilizationPct > 100 ||
    cvarMandateUtilizationPct > 100;

  const topRiskPos = [...positionContributions].sort(
    (a, b) => b.componentRiskSharePct - a.componentRiskSharePct
  )[0];

  const conclusionHeadline = `In a severe 1-in-100 market crash over a 10-day period, the portfolio would lose an estimated ${expectedShortfallCvar99TenDayPct.toFixed(2)}% ($${expectedShortfallCvar99UsdMillions.toFixed(2)}M)—with diversification across countries cutting overall risk by ${diversificationBenefitPct.toFixed(1)}% and ${topRiskPos?.countryName || activeRun.countryName} driving ${topRiskPos?.componentRiskSharePct.toFixed(1) || '34.0'}% of the downside (Ref: 10D 99% CVaR = ${expectedShortfallCvar99TenDayPct.toFixed(2)}% NAV · CF-VaR 99% = ${cornishFisherVar99TenDayPct.toFixed(2)}% · LVaR 99% = ${liquidityAdjustedLvar99TenDayPct.toFixed(2)}%).`;

  return {
    conclusionHeadline,
    portfolioNavUsdMillions: nav,
    grossExposurePct,
    totalNetRateDv01UsdThousands,
    totalNetCreditCs01UsdThousands,
    parametricVar95TenDayPct,
    cornishFisherVar99TenDayPct,
    expectedShortfallCvar99TenDayPct,
    expectedShortfallCvar99UsdMillions,
    liquidityAdjustedLvar99TenDayPct,
    liquidityHorizonDays,
    diversificationBenefitPct,
    dv01MandateUtilizationPct,
    cs01MaxSingleUtilizationPct,
    cvarMandateUtilizationPct,
    hasMandateBreach,
    keyRateBuckets,
    positionContributions,
    contagionMatrix,
  };
}

/**
 * 2. Sovereign Restructuring NPV Haircut Simulator & Credit Rating Migration Matrix
 */
export function simulateSovereignRestructuringAndRating(
  openData: OpenDataSnapshot,
  params: RestructuringSimulationParams = DEFAULT_RESTRUCTURING_PARAMS
): RestructuringAndRatingResult {
  const cds5Y = openData.monetaryAndMarket.cds5YSpreadBps;
  const debtGdp = openData.imfIndicators.debtToGdpPct;
  const reservesMonths = openData.worldBankIndicators.fxReservesMonthsImport;

  // Baseline 10Y benchmark USD Eurobond parameters
  const currentContractualCouponPct = Number(
    Math.max(3.5, Math.min(9.5, 4.25 + cds5Y / 110)).toFixed(2)
  );
  const currentRemainingMaturityYears = 8;
  const currentMarketYieldDecimal = (4.2 + cds5Y / 100) / 100;

  // Present value of current benchmark bond (cents on the dollar)
  const computeBondPvCents = (
    faceValue: number,
    couponPct: number,
    maturityYears: number,
    discountYieldPct: number
  ): number => {
    const y = Math.max(0.01, discountYieldPct / 100);
    const annualCoupon = faceValue * (couponPct / 100);
    let pv = 0;
    for (let t = 1; t <= maturityYears; t++) {
      pv += annualCoupon / Math.pow(1 + y, t);
    }
    pv += faceValue / Math.pow(1 + y, maturityYears);
    return Number(pv.toFixed(2));
  };

  const currentBenchmarkBondPriceCents = computeBondPvCents(
    100,
    currentContractualCouponPct,
    currentRemainingMaturityYears,
    currentMarketYieldDecimal * 100
  );

  // Restructured bond terms
  const newFaceValue = 100 * (1 - params.principalHaircutPct / 100);
  const newCouponPct = Math.max(
    0.5,
    currentContractualCouponPct - params.couponReductionBps / 100
  );
  const newMaturityYears = currentRemainingMaturityYears + params.maturityExtensionYears;

  const restructuredNpvRecoveryCents = computeBondPvCents(
    newFaceValue,
    newCouponPct,
    newMaturityYears,
    params.exitYieldPct
  );

  // Pre-restructuring claim evaluated at exit yield
  const preRestructuringClaimCents = computeBondPvCents(
    100,
    currentContractualCouponPct,
    currentRemainingMaturityYears,
    params.exitYieldPct
  );

  const impliedNpvHaircutPct = Number(
    Math.max(0, Math.min(95, 100 - restructuredNpvRecoveryCents)).toFixed(1)
  );
  const marginOfSafetyVsMarketCents = Number(
    (restructuredNpvRecoveryCents - currentBenchmarkBondPriceCents).toFixed(2)
  );

  // ISDA Standard Hazard Rate & Cumulative Default Probability
  const lossGivenDefaultLgdPct = Number(Math.max(25, Math.min(85, impliedNpvHaircutPct)).toFixed(1));
  const lgdDecimal = Math.max(0.25, lossGivenDefaultLgdPct / 100);
  const hazardRateLambda = (cds5Y / 10000) / lgdDecimal;
  const cdsImplied1YDefaultProbPct = Number(
    ((1 - Math.exp(-hazardRateLambda * 1)) * 100).toFixed(2)
  );
  const cdsImplied5YCumulativeDefaultProbPct = Number(
    ((1 - Math.exp(-hazardRateLambda * 5)) * 100).toFixed(2)
  );

  // Debt Stock Seniority & CAC Burden-Sharing Waterfall
  const extShare = openData.worldBankIndicators.externalDebtPctGni;
  const multilateralShare = Number(Math.max(4, Math.min(24, extShare * 0.22)).toFixed(1));
  const bilateralShare = Number(Math.max(3, Math.min(16, extShare * 0.14)).toFixed(1));
  const eurobondShare = Number(Math.max(12, Math.min(38, extShare * 0.64)).toFixed(1));
  const domesticShare = Number(
    Math.max(25, 100 - multilateralShare - bilateralShare - eurobondShare).toFixed(1)
  );

  const seniorityWaterfall: SeniorityTrancheItem[] = [
    {
      trancheName: 'IMF / World Bank / Preferred Multilateral',
      governingLaw: 'MULTILATERAL_PREFERRED',
      shareOfTotalDebtPct: multilateralShare,
      cacVotingThresholdPct: 100,
      assumedHaircutSensitivity: 'De-facto Senior (0% Principal Haircut)',
      impliedRecoveryCents: 100.0,
    },
    {
      trancheName: 'Paris Club & Official Bilateral Creditors',
      governingLaw: 'OFFICIAL_BILATERAL',
      shareOfTotalDebtPct: bilateralShare,
      cacVotingThresholdPct: 100,
      assumedHaircutSensitivity: 'Comparability of Treatment (Maturity Re-profiling)',
      impliedRecoveryCents: Number(Math.min(92, restructuredNpvRecoveryCents + 14).toFixed(1)),
    },
    {
      trancheName: 'International Eurobonds (NY / English Law ICMA CACs)',
      governingLaw: 'NY_ENGLISH_LAW_CAC',
      shareOfTotalDebtPct: eurobondShare,
      cacVotingThresholdPct: 75,
      assumedHaircutSensitivity: 'Single-Limb 75% Aggregated CAC Binding Restructuring',
      impliedRecoveryCents: restructuredNpvRecoveryCents,
    },
    {
      trancheName: 'Domestic-Law Treasury Bonds (Local Currency)',
      governingLaw: 'DOMESTIC_LOCAL_LAW',
      shareOfTotalDebtPct: domesticShare,
      cacVotingThresholdPct: 50,
      assumedHaircutSensitivity: 'Local Statutory / Inflation & Financial Repression Channel',
      impliedRecoveryCents: Number(Math.max(20, restructuredNpvRecoveryCents - 6.5).toFixed(1)),
    },
  ];

  // Credit Rating Migration & Fallen-Angel Profile
  let currentCompositeRating = 'BB / Ba2';
  let ratingTierClassification: RatingMigrationProfile['ratingTierClassification'] = 'CROSSOVER_BB';
  let notchesToIgThreshold = -2;
  let notchesToDistressedCutoff = 5;

  if (cds5Y < 95) {
    currentCompositeRating = 'A+ / A1';
    ratingTierClassification = 'INVESTMENT_GRADE';
    notchesToIgThreshold = 5;
    notchesToDistressedCutoff = 12;
  } else if (cds5Y < 165) {
    currentCompositeRating = 'BBB / Baa2';
    ratingTierClassification = 'INVESTMENT_GRADE';
    notchesToIgThreshold = 2;
    notchesToDistressedCutoff = 9;
  } else if (cds5Y < 260) {
    currentCompositeRating = 'BB / Ba2';
    ratingTierClassification = 'CROSSOVER_BB';
    notchesToIgThreshold = -2;
    notchesToDistressedCutoff = 5;
  } else if (cds5Y < 450) {
    currentCompositeRating = 'B+ / B1';
    ratingTierClassification = 'HIGH_YIELD_B';
    notchesToIgThreshold = -4;
    notchesToDistressedCutoff = 3;
  } else {
    currentCompositeRating = 'B- / B3';
    ratingTierClassification = 'DISTRESSED_CCC';
    notchesToIgThreshold = -6;
    notchesToDistressedCutoff = 1;
  }

  const stressFactor = Math.max(0, (cds5Y - 140) / 350 + (debtGdp - 65) / 150 - reservesMonths / 30);
  const probFallenAngelOrDefaultCliff12MPct = Number(
    Math.max(2.5, Math.min(38.0, 5.5 + stressFactor * 16)).toFixed(1)
  );
  const probDowngrade1Notch12MPct = Number(
    Math.max(8.0, Math.min(42.0, 14.0 + stressFactor * 18)).toFixed(1)
  );
  const probUpgrade12MPct = Number(
    Math.max(4.0, Math.min(32.0, 22.0 - stressFactor * 12)).toFixed(1)
  );
  const probStable12MPct = Number(
    Math.max(15.0, 100 - probFallenAngelOrDefaultCliff12MPct - probDowngrade1Notch12MPct - probUpgrade12MPct).toFixed(1)
  );

  const forcedIndexOutflowIfDowngradedUsdBn = Number(
    Math.max(1.2, Math.min(18.5, (debtGdp / 15) * (notchesToIgThreshold >= -2 ? 1.8 : 0.9))).toFixed(1)
  );

  // Collective Action Clause (CAC) Holdout & Official Creditor Game-Theory Matrix
  const icmaSingleLimb75SharePct = Number(
    Math.min(82, Math.max(48, 72 - (cds5Y > 400 ? 12 : 0))).toFixed(1)
  );
  const legacyDualLimbSharePct = Number(
    Math.min(38, Math.max(12, 100 - icmaSingleLimb75SharePct - 8)).toFixed(1)
  );
  const noCacOrDomesticSharePct = Number(
    Math.max(4, 100 - icmaSingleLimb75SharePct - legacyDualLimbSharePct).toFixed(1)
  );

  // Blocking minority cost (>25% of single series vs >25% of aggregated stock)
  const benchmarkSeriesNotionalUsdM = 1750;
  const aggregatedEurobondStockUsdM = Math.max(6500, Math.round(eurobondShare * 480));
  const singleSeriesBlockingCostUsdMillions = Math.round(
    benchmarkSeriesNotionalUsdM * 0.251 * (currentBenchmarkBondPriceCents / 100)
  );
  const aggregatedSingleLimbBlockingCostUsdMillions = Math.round(
    aggregatedEurobondStockUsdM * 0.251 * (currentBenchmarkBondPriceCents / 100)
  );

  const holdoutLitigationProbPct = Number(
    Math.min(
      85,
      Math.max(
        14,
        legacyDualLimbSharePct * 0.95 + (params.principalHaircutPct - 15) * 0.85 + (cds5Y > 350 ? 12 : 0)
      )
    ).toFixed(1)
  );

  const officialCreditorCoordinationLagMonths = Number(
    Math.max(4, Math.min(28, 6 + bilateralShare * 0.85 + (params.principalHaircutPct > 25 ? 5 : 1))).toFixed(1)
  );

  const nashEquilibriumPayoffCents = restructuredNpvRecoveryCents;
  // Holdouts face legal/funding costs and enforcement delay but seek par/pre-restructuring claim in legacy dual-limb series
  const rawHoldoutGross =
    restructuredNpvRecoveryCents +
    (100 - restructuredNpvRecoveryCents) * (legacyDualLimbSharePct / 100) * 0.65;
  const litigationAndCarryDragCents = officialCreditorCoordinationLagMonths * 0.58;
  const holdoutExpectedNetPayoffCents = Number(
    Math.max(18, rawHoldoutGross - litigationAndCarryDragCents).toFixed(2)
  );

  const gameTheoryVerdict =
    holdoutExpectedNetPayoffCents > nashEquilibriumPayoffCents + 2.5
      ? `LAWSUIT RISK IS HIGH: Older bond contracts (${legacyDualLimbSharePct}% of debt) let a holdout fund block a deal by buying just $${singleSeriesBlockingCostUsdMillions}M of a single bond issue, earning +${(
          holdoutExpectedNetPayoffCents - nashEquilibriumPayoffCents
        ).toFixed(1)}¢ more than investors who accept the restructuring offer (Ref: Legacy Dual-Limb Share = ${legacyDualLimbSharePct}% · Holdout Net = ${holdoutExpectedNetPayoffCents.toFixed(1)}¢ vs. Cooperative Nash = ${nashEquilibriumPayoffCents.toFixed(1)}¢).`
      : `SMOOTH DEBT DEAL LIKELY: Modern bond contracts (${icmaSingleLimb75SharePct}% of debt) group all bondholders into a single 75% vote, meaning a holdout would need $${aggregatedSingleLimbBlockingCostUsdMillions.toLocaleString()}M to block a deal—making it more profitable to accept the ${nashEquilibriumPayoffCents.toFixed(
          1
        )}¢ restructuring offer than sue in court (${holdoutExpectedNetPayoffCents.toFixed(1)}¢ net) (Ref: ICMA Single-Limb 75% CAC = ${icmaSingleLimb75SharePct}% · Blocking Cost = $${aggregatedSingleLimbBlockingCostUsdMillions.toLocaleString()}M).`;

  const conclusionHeadline = `If the government restructures its debt with a ${params.principalHaircutPct}% face-value cut and a +${params.maturityExtensionYears}-year payment delay, bondholders would recover ${restructuredNpvRecoveryCents.toFixed(1)}¢ on the dollar (${marginOfSafetyVsMarketCents >= 0 ? '+' : ''}${marginOfSafetyVsMarketCents.toFixed(1)}¢ compared to today's ${currentBenchmarkBondPriceCents.toFixed(1)}¢ bond price) (Ref: Implied NPV Haircut = ${impliedNpvHaircutPct.toFixed(1)}% · Exit Yield = ${params.exitYieldPct.toFixed(1)}% · 5Y CDS Default Prob = ${cdsImplied5YCumulativeDefaultProbPct}%).`;

  return {
    conclusionHeadline,
    currentBenchmarkBondPriceCents,
    currentContractualCouponPct,
    currentRemainingMaturityYears,
    restructuredNpvRecoveryCents,
    preRestructuringClaimCents,
    impliedNpvHaircutPct,
    marginOfSafetyVsMarketCents,
    cdsImplied1YDefaultProbPct,
    cdsImplied5YCumulativeDefaultProbPct,
    lossGivenDefaultLgdPct,
    seniorityWaterfall,
    ratingMigration: {
      currentCompositeRating,
      ratingTierClassification,
      notchesToIgThreshold,
      notchesToDistressedCutoff,
      probUpgrade12MPct,
      probStable12MPct,
      probDowngrade1Notch12MPct,
      probFallenAngelOrDefaultCliff12MPct,
      forcedIndexOutflowIfDowngradedUsdBn,
      indexMembershipStatus:
        ratingTierClassification === 'INVESTMENT_GRADE'
          ? 'IG Global Aggregate & EMBI IG Eligible'
          : 'EMBI Global Diversified & GBI-EM Crossover/HY Bucket',
    },
    cacGameTheory: {
      icmaSingleLimb75SharePct,
      legacyDualLimbSharePct,
      noCacOrDomesticSharePct,
      blockingMinorityThresholdPct: 25.0,
      singleSeriesBlockingCostUsdMillions,
      aggregatedSingleLimbBlockingCostUsdMillions,
      holdoutLitigationProbPct,
      officialCreditorCoordinationLagMonths,
      nashEquilibriumPayoffCents,
      holdoutExpectedNetPayoffCents,
      gameTheoryVerdict,
    },
  };
}

/**
 * 3. Cross-Currency Swap Basis (XCCY), FX-Hedged Carry & NY-Law vs. Local-Law Jurisdictional Monitor
 */
export function computeCrossCurrencyAndLegalBasis(
  openData: OpenDataSnapshot
): CrossCurrencyAndLegalResult {
  const cds5Y = openData.monetaryAndMarket.cds5YSpreadBps;
  const local10Y = openData.monetaryAndMarket.sovereign10YBondYieldPct;
  const policyRate = openData.monetaryAndMarket.policyRatePct;
  const cpi = openData.imfIndicators.cpiInflationPct;

  const tenors: ('1Y' | '3Y' | '5Y' | '10Y')[] = ['1Y', '3Y', '5Y', '10Y'];
  const tenorYears = [1, 3, 5, 10];

  const basisCurve: CrossCurrencyBasisPoint[] = tenors.map((tenor, idx) => {
    const yrs = tenorYears[idx];
    // USD Eurobond yield curve
    const usTreasuryBase = 4.05 + idx * 0.12;
    const creditSpreadPct = (cds5Y * (0.65 + idx * 0.16)) / 100;
    const usdEurobondYieldPct = Number((usTreasuryBase + creditSpreadPct).toFixed(2));

    // Local sovereign yield curve
    const slopeWeight = idx / 3;
    const localSovereignYieldPct = Number(
      (policyRate * (1 - slopeWeight * 0.45) + local10Y * (0.35 + slopeWeight * 0.65) - 2.1).toFixed(2)
    );

    // Cross-currency swap basis (negative in EM dollar-funding stress, adding to USD hedge yield)
    const xccySwapBasisBps = Math.round(-(22 + cds5Y * 0.14 + idx * 8));

    // FX Forward / XCCY Hedge Cost = interest rate differential adjusted for inflation & XCCY basis
    const rateDiff = localSovereignYieldPct - usTreasuryBase;
    const fxForwardOrXccyHedgeCostPct = Number(
      Math.max(-1.5, rateDiff - (policyRate - cpi) * 0.24 + xccySwapBasisBps / 100).toFixed(2)
    );

    const fxHedgedLocalYieldInUsdPct = Number(
      (localSovereignYieldPct - fxForwardOrXccyHedgeCostPct).toFixed(2)
    );
    const netHedgedPickUpOverEurobondBps = Math.round(
      (fxHedgedLocalYieldInUsdPct - usdEurobondYieldPct) * 100
    );

    return {
      tenor,
      usdEurobondYieldPct,
      localSovereignYieldPct,
      fxForwardOrXccyHedgeCostPct,
      xccySwapBasisBps,
      fxHedgedLocalYieldInUsdPct,
      netHedgedPickUpOverEurobondBps,
      optimalExpression:
        netHedgedPickUpOverEurobondBps >= 0 ? 'BUY_FX_HEDGED_LOCAL' : 'BUY_USD_EUROBOND',
    };
  });

  const fiveYearPt = basisCurve[2];
  const fiveYearNetHedgedPickUpBps = fiveYearPt.netHedgedPickUpOverEurobondBps;
  const fiveYearXccyBasisBps = fiveYearPt.xccySwapBasisBps;

  // Jurisdictional Legal Basis (NY Law vs Domestic Law)
  const jurisdictionalLegalSpreadBps = Math.round(18 + cds5Y * 0.16);
  const onTheRunBidAskBps = Math.round(Math.max(4, 5 + cds5Y * 0.04));
  const stressedCrisisBidAskBps = Math.round(onTheRunBidAskBps * 3.8);
  const avgDailyTurnoverUsdMillions = Math.round(Math.max(35, 420 - cds5Y * 0.55));

  const preferredSovereignVehicle =
    fiveYearNetHedgedPickUpBps >= 0
      ? `5Y FX-Hedged Local Sovereign Bond (+${fiveYearNetHedgedPickUpBps} bps over USD Eurobond)`
      : `5Y NY-Law USD Eurobond (${Math.abs(fiveYearNetHedgedPickUpBps)} bps superior to FX-Hedged Local)`;

  const conclusionHeadline = `Buying 5-year local bonds and locking in the US dollar exchange rate pays ${fiveYearPt.fxHedgedLocalYieldInUsdPct.toFixed(2)}% in USD (${fiveYearNetHedgedPickUpBps >= 0 ? '+' : ''}${fiveYearNetHedgedPickUpBps} bps vs. 5-year USD Eurobonds at ${fiveYearPt.usdEurobondYieldPct.toFixed(2)}%), while New York-law bonds trade with a ${jurisdictionalLegalSpreadBps} bps legal safety premium over local-law debt (Ref: 5Y XCCY Basis = ${fiveYearXccyBasisBps} bps · Legal Spread = ${jurisdictionalLegalSpreadBps} bps).`;

  return {
    conclusionHeadline,
    fiveYearNetHedgedPickUpBps,
    fiveYearXccyBasisBps,
    preferredSovereignVehicle,
    basisCurve,
    legalAndLiquidity: {
      bondPairLabel: `${openData.iso3} 2034 NY-Law Eurobond vs. Domestic Treasury Note`,
      nyLawEurobondYieldPct: basisCurve[3].usdEurobondYieldPct,
      domesticLawEquivalentYieldPct: basisCurve[3].fxHedgedLocalYieldInUsdPct,
      jurisdictionalLegalSpreadBps,
      onTheRunBidAskBps,
      stressedCrisisBidAskBps,
      avgDailyTurnoverUsdMillions,
      redenominationRiskAssessment:
        cds5Y > 300
          ? 'Elevated statutory redenomination & local capital-control risk; prioritize NY/English-law ICMA CAC indentures.'
          : 'Contained statutory redenomination risk; domestic institutional pension/bank base anchors local-law curve.',
    },
  };
}

/**
 * 4. Council Brier Conviction -> Half-Kelly Optimal Sizing & Market-Maker LOB Slippage Engine
 * Links the 9-Agent Council's Brier-calibrated conviction weights and Supreme Council trade expressions
 * directly to portfolio NAV sizing, DV01/CS01 risk budgets, and Limit Order Book (LOB) market impact.
 */
export function computeCouncilKellyAndLobExecution(
  run: CouncilAssessmentRun,
  mandateConfig: PortfolioRiskMandateConfig = DEFAULT_PORTFOLIO_MANDATE_CONFIG
): CouncilKellyLobExecutionResult {
  const navM = mandateConfig.portfolioNavUsdMillions;
  const cds5Y = run.openData.monetaryAndMarket.cds5YSpreadBps;
  const avgAgentBrierWeight =
    run.subAgents.reduce((acc, a) => acc + a.brierCalibrationWeight * a.confidence, 0) /
    Math.max(1, run.subAgents.length);
  const compositeBrierConvictionPct = Number(
    Math.min(92, Math.max(54, avgAgentBrierWeight * 100)).toFixed(1)
  );

  // Market-Maker LOB Liquidity & Dealer Inventory parameters
  const baseBidAskBps = Math.max(4, Math.round(4.5 + cds5Y * 0.038));
  const topOfBookDepthUsdM = Math.max(12, Math.round(145 - cds5Y * 0.22));
  const dealerInventoryRegime =
    cds5Y > 280
      ? 'SHORT_GAMMA_DEFENSIVE (Wide LOB Spreads · Slice via 3-5D TWAP)'
      : cds5Y > 175
      ? 'NEUTRAL_INVENTORY (Standard Two-Way Institutional Flow)'
      : 'LONG_GAMMA_WAREHOUSE (Tight Bid-Ask · Deep Block Liquidity)';

  const rawTrades: Array<{ instrument: string; direction: string }> =
    run.supremeCouncil?.marketTranslationLayer?.tradeExpressions?.length
      ? run.supremeCouncil.marketTranslationLayer.tradeExpressions.map((t) => ({
          instrument: t.instrument,
          direction: t.direction,
        }))
      : [
          {
            instrument: `5Y ${run.iso3} Sovereign CDS Protection`,
            direction: 'HEDGE',
          },
          {
            instrument: `${run.iso3} 2s10s Local Sovereign Curve Steepener`,
            direction: 'LONG',
          },
          {
            instrument: `USD/${run.openData.currencyCode} 3M NDF Collar Overlay`,
            direction: 'LONG',
          },
        ];

  const deskLabels = [
    'Sovereign Credit Desk (AG-4 / AG-5)',
    'Macroeconomic Desk (AG-7 / AG-8)',
    'Geopolitical & FX Desk (AG-1 / AG-2)',
  ];

  const tickets: CouncilKellyTicketItem[] = rawTrades.slice(0, 3).map((tr, idx: number) => {
    const deskScore =
      idx === 0
        ? run.croState.sovereignRiskScore
        : idx === 1
        ? run.croState.macroRiskScore
        : run.croState.geopoliticalRiskScore;

    // Brier-calibrated win probability p (55% to 78%) and payoff ratio b (1.6x to 2.6x)
    const brierCalibratedWinProbPct = Number(
      Math.min(79, Math.max(55, compositeBrierConvictionPct * 0.82 + deskScore * 18 - idx * 2.1)).toFixed(1)
    );
    const p = brierCalibratedWinProbPct / 100;
    const q = 1 - p;
    const rewardToRiskPayoffRatio = Number((1.75 + (1 - idx * 0.12) * 0.45).toFixed(2));

    // Classic Kelly f* = p - q / b, capped & scaled by Half-Kelly (0.5x) for institutional drawdown control
    const rawKelly = Math.max(0.06, p - q / rewardToRiskPayoffRatio);
    const fullKellyFractionPct = Number((rawKelly * 100).toFixed(1));
    const halfKellyNavAllocationPct = Number(
      Math.min(28, Math.max(5, (fullKellyFractionPct * 0.5))).toFixed(1)
    );

    const recommendedNotionalUsdMillions = Number(
      ((halfKellyNavAllocationPct / 100) * navM).toFixed(1)
    );
    const durationFactor = idx === 0 ? 4.3 : idx === 1 ? 6.2 : 2.4;
    const allocatedDv01OrCs01UsdThousands = Number(
      ((recommendedNotionalUsdMillions * durationFactor) / 10).toFixed(1)
    );

    // Almgren-Chriss Square-Root Market Impact & LOB Bid-Ask Slippage
    const lobQuotedBidAskBps = Math.round(baseBidAskBps * (idx === 1 ? 1.15 : idx === 2 ? 0.75 : 1.0));
    const orderToDepthRatio = recommendedNotionalUsdMillions / Math.max(5, topOfBookDepthUsdM);
    const lobMarketImpactSlippageBps = Number(
      (lobQuotedBidAskBps * 0.55 * Math.sqrt(orderToDepthRatio)).toFixed(1)
    );
    const totalExecutionDragBps = Number(
      (lobQuotedBidAskBps * 0.5 + lobMarketImpactSlippageBps).toFixed(1)
    );

    const optimalTwapExecutionDays = Number(
      Math.max(0.5, Math.min(6.0, orderToDepthRatio * 1.4)).toFixed(1)
    );
    const expectedGrossAlphaBps = Math.round(75 + deskScore * 95 - idx * 14);
    const netPostSlippageAlphaBps = Number(
      Math.max(12, expectedGrossAlphaBps - totalExecutionDragBps).toFixed(1)
    );

    const executionFeasibilityStatus: CouncilKellyTicketItem['executionFeasibilityStatus'] =
      orderToDepthRatio <= 0.65
        ? 'IMMEDIATE_BLOCK'
        : orderToDepthRatio <= 1.65
        ? 'TWAP_SLICED'
        : 'LIQUIDITY_CONSTRAINED';

    return {
      ticketId: `KELLY-${run.iso3}-0${idx + 1}`,
      originatingDesk: deskLabels[idx] || 'Supreme Council Desk',
      instrument: tr.instrument,
      direction: tr.direction,
      brierCalibratedWinProbPct,
      rewardToRiskPayoffRatio,
      fullKellyFractionPct,
      halfKellyNavAllocationPct,
      recommendedNotionalUsdMillions,
      allocatedDv01OrCs01UsdThousands,
      lobQuotedBidAskBps,
      lobMarketImpactSlippageBps,
      totalExecutionDragBps,
      optimalTwapExecutionDays,
      expectedGrossAlphaBps,
      netPostSlippageAlphaBps,
      executionFeasibilityStatus,
    };
  });

  const totalHalfKellyGrossNavPct = Number(
    tickets.reduce((acc, t) => acc + t.halfKellyNavAllocationPct, 0).toFixed(1)
  );
  const totalAllocatedNotionalUsdMillions = Number(
    tickets.reduce((acc, t) => acc + t.recommendedNotionalUsdMillions, 0).toFixed(1)
  );
  const weightedExecutionSlippageBps = Number(
    (
      tickets.reduce((acc, t) => acc + t.totalExecutionDragBps * t.recommendedNotionalUsdMillions, 0) /
      Math.max(1, totalAllocatedNotionalUsdMillions)
    ).toFixed(1)
  );
  const netPortfolioExpectedAlphaBps = Number(
    (
      tickets.reduce((acc, t) => acc + t.netPostSlippageAlphaBps * (t.halfKellyNavAllocationPct / 100), 0)
    ).toFixed(1)
  );

  const conclusionHeadline = `Based on the AI Council's ${compositeBrierConvictionPct}% track-record accuracy, the optimal trade size is ${totalHalfKellyGrossNavPct}% of the portfolio ($${totalAllocatedNotionalUsdMillions}M across 3 trades)—which costs ${weightedExecutionSlippageBps} bps in trading friction and leaves +${netPortfolioExpectedAlphaBps} bps in expected net profit (Ref: Brier Conviction = ${compositeBrierConvictionPct}% · Half-Kelly Allocation = ${totalHalfKellyGrossNavPct}% NAV · Almgren-Chriss Slippage = ${weightedExecutionSlippageBps} bps).`;

  return {
    conclusionHeadline,
    compositeBrierConvictionPct,
    totalHalfKellyGrossNavPct,
    totalAllocatedNotionalUsdMillions,
    weightedExecutionSlippageBps,
    netPortfolioExpectedAlphaBps,
    dealerInventoryRegime,
    tickets,
  };
}
