import {
  CentralBankLiquidityFacilityRow,
  CurrencyFundingCorridorRow,
  GlobalLiquidityFundingSuite,
  LiquidityCrisisPresetId,
  LiquidityStressParams,
  OpenDataSnapshot,
  XccyTermStructurePoint,
} from '../types/council';

export const DEFAULT_LIQUIDITY_STRESS_PARAMS: LiquidityStressParams = {
  presetId: 'baseline',
  usdBasisSqueezeBps: 0,
  interbankFraOisShockBps: 0,
  fedQtAndTgaDrainUsdBn: 0,
  gsibTurnWindowDressingMultiplier: 1.0,
};

export const LIQUIDITY_CRISIS_PRESETS: Record<
  Exclude<LiquidityCrisisPresetId, 'custom'>,
  {
    id: Exclude<LiquidityCrisisPresetId, 'custom'>;
    label: string;
    shortBadge: string;
    description: string;
    params: LiquidityStressParams;
  }
> = {
  baseline: {
    id: 'baseline',
    label: 'Baseline Plumbing',
    shortBadge: 'LIVE BASELINE',
    description:
      'Current post-QT money market equilibrium: SOFR anchored near Fed funds, mild quarter-end G-SIB balance-sheet cost, moderate EUR/JPY XCCY basis.',
    params: {
      presetId: 'baseline',
      usdBasisSqueezeBps: 0,
      interbankFraOisShockBps: 0,
      fedQtAndTgaDrainUsdBn: 0,
      gsibTurnWindowDressingMultiplier: 1.0,
    },
  },
  gfc_2008: {
    id: 'gfc_2008',
    label: '2008 GFC Post-Lehman',
    shortBadge: 'GFC 2008',
    description:
      'Acute counterparty credit freeze: 3M LIBOR/FRA-OIS blows out +115 bps, offshore EUR/JPY/EM XCCY basis collapses -130 bps, massive Fed swap line draws.',
    params: {
      presetId: 'gfc_2008',
      usdBasisSqueezeBps: 130,
      interbankFraOisShockBps: 115,
      fedQtAndTgaDrainUsdBn: 650,
      gsibTurnWindowDressingMultiplier: 2.35,
    },
  },
  euro_2011: {
    id: 'euro_2011',
    label: '2011 Eurozone Debt Crisis',
    shortBadge: 'EURO 2011',
    description:
      'European bank USD wholesale funding run: EUR/USD & CHF/USD 3M XCCY basis widens -95 bps, ECB 3Y LTRO + Fed swap line activation.',
    params: {
      presetId: 'euro_2011',
      usdBasisSqueezeBps: 95,
      interbankFraOisShockBps: 65,
      fedQtAndTgaDrainUsdBn: 380,
      gsibTurnWindowDressingMultiplier: 1.75,
    },
  },
  repo_2019: {
    id: 'repo_2019',
    label: 'Sept 2019 US Repo Spike',
    shortBadge: 'REPO 2019',
    description:
      'Domestic US reserve scarcity + corporate tax date + UST settlement drain ($750B QT/TGA): GC Repo-SOFR spikes while Fed SRF/repo backstop absorbs dealer inventory.',
    params: {
      presetId: 'repo_2019',
      usdBasisSqueezeBps: 42,
      interbankFraOisShockBps: 55,
      fedQtAndTgaDrainUsdBn: 780,
      gsibTurnWindowDressingMultiplier: 1.9,
    },
  },
  covid_2020: {
    id: 'covid_2020',
    label: 'March 2020 Dash-for-Cash',
    shortBadge: 'COVID 2020',
    description:
      'Global UST basis-trade unwind and EM FX reserve liquidation: JPY/EUR/EM XCCY basis plunges -110 bps, FIMA repo facility & $450B+ Fed swap lines deployed.',
    params: {
      presetId: 'covid_2020',
      usdBasisSqueezeBps: 110,
      interbankFraOisShockBps: 85,
      fedQtAndTgaDrainUsdBn: 820,
      gsibTurnWindowDressingMultiplier: 2.15,
    },
  },
};

interface CorridorSeed {
  corridorId: string;
  currencyCode: string;
  pairLabel: string;
  sovereignLabel: string;
  regionGroup: 'G10' | 'EM';
  spotRateVsUsd: number;
  domesticPolicyRatePct: number;
  domestic10YBondYieldPct: number;
  rfrBenchmarkName: string;
  baseXccy3MBps: number;
  baseXccy1YBps: number;
  baseXccy5YBps: number;
  baseFraOisBps: number;
  baseRfrOisBps: number;
  baseRepoHaircutPct: number;
  baseCbSwapDrawUsdBn: number;
  squeezeSensitivity: number; // multiplier on usdBasisSqueezeBps
  turnSensitivity: number; // sensitivity to G-SIB turn window dressing
}

const CORE_CORRIDOR_SEEDS: CorridorSeed[] = [
  {
    corridorId: 'EUR_USD',
    currencyCode: 'EUR',
    pairLabel: 'EUR / USD',
    sovereignLabel: 'Eurozone (ECB)',
    regionGroup: 'G10',
    spotRateVsUsd: 1.084,
    domesticPolicyRatePct: 3.25,
    domestic10YBondYieldPct: 2.38,
    rfrBenchmarkName: 'ESTR',
    baseXccy3MBps: -18,
    baseXccy1YBps: -22,
    baseXccy5YBps: -26,
    baseFraOisBps: 11,
    baseRfrOisBps: 4.5,
    baseRepoHaircutPct: 1.5,
    baseCbSwapDrawUsdBn: 4.2,
    squeezeSensitivity: 1.05,
    turnSensitivity: 1.15,
  },
  {
    corridorId: 'JPY_USD',
    currencyCode: 'JPY',
    pairLabel: 'JPY / USD',
    sovereignLabel: 'Japan (BoJ)',
    regionGroup: 'G10',
    spotRateVsUsd: 153.4,
    domesticPolicyRatePct: 0.25,
    domestic10YBondYieldPct: 1.04,
    rfrBenchmarkName: 'TONA',
    baseXccy3MBps: -34,
    baseXccy1YBps: -41,
    baseXccy5YBps: -52,
    baseFraOisBps: 14,
    baseRfrOisBps: 6.2,
    baseRepoHaircutPct: 1.8,
    baseCbSwapDrawUsdBn: 11.8,
    squeezeSensitivity: 1.32,
    turnSensitivity: 1.4,
  },
  {
    corridorId: 'GBP_USD',
    currencyCode: 'GBP',
    pairLabel: 'GBP / USD',
    sovereignLabel: 'United Kingdom (BoE)',
    regionGroup: 'G10',
    spotRateVsUsd: 1.296,
    domesticPolicyRatePct: 4.75,
    domestic10YBondYieldPct: 4.42,
    rfrBenchmarkName: 'SONIA',
    baseXccy3MBps: -11,
    baseXccy1YBps: -14,
    baseXccy5YBps: -17,
    baseFraOisBps: 12,
    baseRfrOisBps: 5.0,
    baseRepoHaircutPct: 1.6,
    baseCbSwapDrawUsdBn: 1.9,
    squeezeSensitivity: 0.88,
    turnSensitivity: 0.95,
  },
  {
    corridorId: 'CHF_USD',
    currencyCode: 'CHF',
    pairLabel: 'CHF / USD',
    sovereignLabel: 'Switzerland (SNB)',
    regionGroup: 'G10',
    spotRateVsUsd: 0.865,
    domesticPolicyRatePct: 1.0,
    domestic10YBondYieldPct: 0.44,
    rfrBenchmarkName: 'SARON',
    baseXccy3MBps: -24,
    baseXccy1YBps: -29,
    baseXccy5YBps: -35,
    baseFraOisBps: 13,
    baseRfrOisBps: 5.4,
    baseRepoHaircutPct: 1.4,
    baseCbSwapDrawUsdBn: 3.6,
    squeezeSensitivity: 1.12,
    turnSensitivity: 1.2,
  },
  {
    corridorId: 'AUD_USD',
    currencyCode: 'AUD',
    pairLabel: 'AUD / USD',
    sovereignLabel: 'Australia (RBA)',
    regionGroup: 'G10',
    spotRateVsUsd: 0.658,
    domesticPolicyRatePct: 4.35,
    domestic10YBondYieldPct: 4.56,
    rfrBenchmarkName: 'AONIA',
    baseXccy3MBps: +8,
    baseXccy1YBps: +11,
    baseXccy5YBps: +14,
    baseFraOisBps: 15,
    baseRfrOisBps: 6.8,
    baseRepoHaircutPct: 2.0,
    baseCbSwapDrawUsdBn: 0.8,
    squeezeSensitivity: 0.78,
    turnSensitivity: 0.85,
  },
  {
    corridorId: 'CAD_USD',
    currencyCode: 'CAD',
    pairLabel: 'CAD / USD',
    sovereignLabel: 'Canada (BoC)',
    regionGroup: 'G10',
    spotRateVsUsd: 1.389,
    domesticPolicyRatePct: 3.75,
    domestic10YBondYieldPct: 3.24,
    rfrBenchmarkName: 'CORRA',
    baseXccy3MBps: -9,
    baseXccy1YBps: -12,
    baseXccy5YBps: -15,
    baseFraOisBps: 11,
    baseRfrOisBps: 4.8,
    baseRepoHaircutPct: 1.5,
    baseCbSwapDrawUsdBn: 0.6,
    squeezeSensitivity: 0.72,
    turnSensitivity: 0.8,
  },
  {
    corridorId: 'CNH_USD',
    currencyCode: 'CNY',
    pairLabel: 'CNH / USD',
    sovereignLabel: 'China Offshore (PBoC / HKMA)',
    regionGroup: 'EM',
    spotRateVsUsd: 7.13,
    domesticPolicyRatePct: 3.1,
    domestic10YBondYieldPct: 2.12,
    rfrBenchmarkName: 'CNH HIBOR / DR007',
    baseXccy3MBps: -42,
    baseXccy1YBps: -48,
    baseXccy5YBps: -58,
    baseFraOisBps: 26,
    baseRfrOisBps: 14.5,
    baseRepoHaircutPct: 3.5,
    baseCbSwapDrawUsdBn: 14.5,
    squeezeSensitivity: 1.38,
    turnSensitivity: 1.3,
  },
  {
    corridorId: 'BRL_USD',
    currencyCode: 'BRL',
    pairLabel: 'BRL / USD',
    sovereignLabel: 'Brazil (BCB Cupom Cambial)',
    regionGroup: 'EM',
    spotRateVsUsd: 5.76,
    domesticPolicyRatePct: 11.25,
    domestic10YBondYieldPct: 12.85,
    rfrBenchmarkName: 'SELIC / DI',
    baseXccy3MBps: -68,
    baseXccy1YBps: -79,
    baseXccy5YBps: -96,
    baseFraOisBps: 38,
    baseRfrOisBps: 21.0,
    baseRepoHaircutPct: 5.2,
    baseCbSwapDrawUsdBn: 9.4,
    squeezeSensitivity: 1.55,
    turnSensitivity: 1.35,
  },
  {
    corridorId: 'MXN_USD',
    currencyCode: 'MXN',
    pairLabel: 'MXN / USD',
    sovereignLabel: 'Mexico (Banxico)',
    regionGroup: 'EM',
    spotRateVsUsd: 20.12,
    domesticPolicyRatePct: 10.5,
    domestic10YBondYieldPct: 10.05,
    rfrBenchmarkName: 'TIIE Fondeo',
    baseXccy3MBps: -52,
    baseXccy1YBps: -61,
    baseXccy5YBps: -75,
    baseFraOisBps: 29,
    baseRfrOisBps: 16.2,
    baseRepoHaircutPct: 4.2,
    baseCbSwapDrawUsdBn: 4.8,
    squeezeSensitivity: 1.35,
    turnSensitivity: 1.2,
  },
  {
    corridorId: 'INR_USD',
    currencyCode: 'INR',
    pairLabel: 'INR / USD',
    sovereignLabel: 'India (RBI MIFOR)',
    regionGroup: 'EM',
    spotRateVsUsd: 84.08,
    domesticPolicyRatePct: 6.5,
    domestic10YBondYieldPct: 6.84,
    rfrBenchmarkName: 'MIBOR / TREPS',
    baseXccy3MBps: -38,
    baseXccy1YBps: -45,
    baseXccy5YBps: -56,
    baseFraOisBps: 24,
    baseRfrOisBps: 12.8,
    baseRepoHaircutPct: 3.8,
    baseCbSwapDrawUsdBn: 6.2,
    squeezeSensitivity: 1.18,
    turnSensitivity: 1.1,
  },
  {
    corridorId: 'ZAR_USD',
    currencyCode: 'ZAR',
    pairLabel: 'ZAR / USD',
    sovereignLabel: 'South Africa (SARB)',
    regionGroup: 'EM',
    spotRateVsUsd: 17.65,
    domesticPolicyRatePct: 8.0,
    domestic10YBondYieldPct: 10.45,
    rfrBenchmarkName: 'ZARONIA / JIBAR',
    baseXccy3MBps: -61,
    baseXccy1YBps: -72,
    baseXccy5YBps: -89,
    baseFraOisBps: 35,
    baseRfrOisBps: 19.4,
    baseRepoHaircutPct: 5.0,
    baseCbSwapDrawUsdBn: 3.1,
    squeezeSensitivity: 1.48,
    turnSensitivity: 1.25,
  },
  {
    corridorId: 'TRY_USD',
    currencyCode: 'TRY',
    pairLabel: 'TRY / USD',
    sovereignLabel: 'Turkey (CBRT Offshore Swap)',
    regionGroup: 'EM',
    spotRateVsUsd: 34.28,
    domesticPolicyRatePct: 50.0,
    domestic10YBondYieldPct: 29.8,
    rfrBenchmarkName: 'TLREF',
    baseXccy3MBps: -145,
    baseXccy1YBps: -168,
    baseXccy5YBps: -195,
    baseFraOisBps: 74,
    baseRfrOisBps: 46.0,
    baseRepoHaircutPct: 9.5,
    baseCbSwapDrawUsdBn: 16.4,
    squeezeSensitivity: 1.95,
    turnSensitivity: 1.65,
  },
];

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function computeGlobalLiquidityFundingSuite(
  openData: OpenDataSnapshot,
  params: LiquidityStressParams = DEFAULT_LIQUIDITY_STRESS_PARAMS
): GlobalLiquidityFundingSuite {
  const activeCurrency = (openData.currencyCode || 'USD').toUpperCase();
  const countryName = openData.countryName || 'Target Sovereign';
  const fxRatePerUsd = openData.monetaryAndMarket?.exchangeRatePerUsd ?? 1.0;
  const policyRatePct = openData.monetaryAndMarket?.policyRatePct ?? 5.0;
  const bondYield10YPct = openData.monetaryAndMarket?.sovereign10YBondYieldPct ?? 6.0;
  const sovereignSpreadBps = openData.monetaryAndMarket?.cds5YSpreadBps ?? 180;
  const fxReservesUsdBn = openData.debtRollover?.liquidFxReservesUsdBn ?? 85;
  const fxReservesMonths = openData.worldBankIndicators?.fxReservesMonthsImport ?? 6.5;

  // US Money Market Anchor Rates (hydrated with live NY Fed Markets API when available)
  const livePlumbing = openData.livePlumbingOverrides;
  const baseEffrPct =
    typeof livePlumbing?.usEffrRatePct === 'number' && livePlumbing.usEffrRatePct > 0
      ? livePlumbing.usEffrRatePct
      : 4.33;
  const qtReserveDrainFactor = params.fedQtAndTgaDrainUsdBn / 250; // 0 to 4.0
  const turnAddonBps = (params.gsibTurnWindowDressingMultiplier - 1.0) * 28; // 0 to +42 bps

  const baseSofrPct =
    typeof livePlumbing?.usSofrRatePct === 'number' && livePlumbing.usSofrRatePct > 0
      ? livePlumbing.usSofrRatePct
      : round2(baseEffrPct + 0.02);
  const baseSofrEffrBps = Math.max(0.5, (baseSofrPct - baseEffrPct) * 100);

  const usSofrEffrSpreadBps = round1(
    baseSofrEffrBps + qtReserveDrainFactor * 6.5 + turnAddonBps * 0.45 + params.interbankFraOisShockBps * 0.18
  );
  const usGcRepoSofrSpreadBps = round1(
    3.5 + qtReserveDrainFactor * 11.0 + turnAddonBps * 0.85 + params.interbankFraOisShockBps * 0.32
  );
  const usEffrRatePct = baseEffrPct;
  const usSofrRatePct = round2(usEffrRatePct + usSofrEffrSpreadBps / 100);
  const usGcRepoRatePct = round2(usSofrRatePct + usGcRepoSofrSpreadBps / 100);
  const us3mFraOisSpreadBps = round1(
    11.5 + params.interbankFraOisShockBps + qtReserveDrainFactor * 5.2 + turnAddonBps * 0.55
  );

  // Federal Reserve Balance Sheet & Plumbing aggregates (hydrated with live NY Fed ON RRP balance)
  const baseOnRrpBn =
    typeof livePlumbing?.fedOnRrpBalanceUsdBn === 'number' && livePlumbing.fedOnRrpBalanceUsdBn >= 0
      ? livePlumbing.fedOnRrpBalanceUsdBn
      : 185;
  const fedBankReservesUsdTn = round2(Math.max(2.15, 3.26 - params.fedQtAndTgaDrainUsdBn / 1000));
  const fedOnRrpBalanceUsdBn = round1(
    Math.max(15, baseOnRrpBn - params.fedQtAndTgaDrainUsdBn * 0.34 - params.usdBasisSqueezeBps * 0.6)
  );
  const fedSrfDrawsUsdBn = round1(
    Math.min(
      500,
      4.5 +
        Math.max(0, params.fedQtAndTgaDrainUsdBn - 200) * 0.22 +
        params.interbankFraOisShockBps * 1.35 +
        (params.gsibTurnWindowDressingMultiplier - 1.0) * 48
    )
  );
  const fedFimaDrawsUsdBn = round1(
    Math.min(
      320,
      2.0 +
        params.usdBasisSqueezeBps * 0.88 +
        params.interbankFraOisShockBps * 0.45 +
        (sovereignSpreadBps > 350 ? 14.5 : 0)
    )
  );

  // Prepare corridor seeds: apply live FX rates across all G10/EM corridors + active sovereign overrides
  const liveFxMap = livePlumbing?.fxRatesVsUsd || {};
  const seeds: CorridorSeed[] = CORE_CORRIDOR_SEEDS.map((seed) => {
    const rawUsdRate = liveFxMap[seed.currencyCode];
    let updatedSpot = seed.spotRateVsUsd;
    if (typeof rawUsdRate === 'number' && rawUsdRate > 0) {
      // EUR, GBP, AUD are conventionally quoted as CCY/USD (inverse of 1 USD = X CCY)
      if (seed.currencyCode === 'EUR' || seed.currencyCode === 'GBP' || seed.currencyCode === 'AUD') {
        updatedSpot = Number((1 / rawUsdRate).toFixed(3));
      } else {
        updatedSpot = Number(rawUsdRate.toFixed(seed.currencyCode === 'JPY' || seed.currencyCode === 'INR' ? 2 : 3));
      }
    }
    if (seed.currencyCode === activeCurrency) {
      return {
        ...seed,
        spotRateVsUsd: fxRatePerUsd || updatedSpot,
        domesticPolicyRatePct: policyRatePct ?? seed.domesticPolicyRatePct,
        domestic10YBondYieldPct: bondYield10YPct ?? seed.domestic10YBondYieldPct,
      };
    }
    return {
      ...seed,
      spotRateVsUsd: updatedSpot,
    };
  });

  const hasActiveInSeeds = seeds.some((s) => s.currencyCode === activeCurrency);
  if (activeCurrency !== 'USD' && !hasActiveInSeeds) {
    const spreadFactor = Math.min(2.4, Math.max(0.8, sovereignSpreadBps / 220));
    const base3m = -Math.round(28 + spreadFactor * 36);
    seeds.unshift({
      corridorId: `${activeCurrency}_USD`,
      currencyCode: activeCurrency,
      pairLabel: `${activeCurrency} / USD`,
      sovereignLabel: `${countryName} (${activeCurrency} Corridor)`,
      regionGroup: sovereignSpreadBps > 160 ? 'EM' : 'G10',
      spotRateVsUsd: fxRatePerUsd || 1.0,
      domesticPolicyRatePct: policyRatePct,
      domestic10YBondYieldPct: bondYield10YPct,
      rfrBenchmarkName: `${activeCurrency} OIS / Interbank`,
      baseXccy3MBps: base3m,
      baseXccy1YBps: Math.round(base3m * 1.18),
      baseXccy5YBps: Math.round(base3m * 1.38),
      baseFraOisBps: Math.round(18 + spreadFactor * 16),
      baseRfrOisBps: round1(9 + spreadFactor * 8.5),
      baseRepoHaircutPct: round1(2.5 + spreadFactor * 2.2),
      baseCbSwapDrawUsdBn: round1(3.5 + spreadFactor * 3.2),
      squeezeSensitivity: round2(1.15 + spreadFactor * 0.35),
      turnSensitivity: round2(1.1 + spreadFactor * 0.2),
    });
  }

  const tenors: XccyTermStructurePoint['tenor'][] = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y'];
  const tenorMultipliers: Record<XccyTermStructurePoint['tenor'], { base: number; shock: number }> = {
    '1M': { base: 1.12, shock: 1.28 },
    '3M': { base: 1.0, shock: 1.0 },
    '6M': { base: 1.08, shock: 0.92 },
    '1Y': { base: 1.18, shock: 0.82 },
    '2Y': { base: 1.26, shock: 0.72 },
    '5Y': { base: 1.38, shock: 0.58 },
    '10Y': { base: 1.45, shock: 0.48 },
  };

  const corridors: CurrencyFundingCorridorRow[] = seeds.map((seed) => {
    const isTarget =
      seed.currencyCode === activeCurrency ||
      (activeCurrency === 'USD' && seed.currencyCode === 'EUR');

    const basisShock3M =
      params.usdBasisSqueezeBps * seed.squeezeSensitivity +
      turnAddonBps * seed.turnSensitivity +
      qtReserveDrainFactor * 6.5 * seed.squeezeSensitivity;

    const xccyBasis3MBps = round1(seed.baseXccy3MBps - basisShock3M);
    const xccyBasis1YBps = round1(seed.baseXccy1YBps - basisShock3M * 0.82);
    const xccyBasis5YBps = round1(seed.baseXccy5YBps - basisShock3M * 0.58);

    const liborOrFraOisSpreadBps = round1(
      seed.baseFraOisBps +
        params.interbankFraOisShockBps * (seed.regionGroup === 'EM' ? 1.25 : 0.92) +
        turnAddonBps * 0.5
    );
    const rfrOisSpreadBps = round1(
      seed.baseRfrOisBps +
        params.interbankFraOisShockBps * 0.52 +
        qtReserveDrainFactor * (seed.regionGroup === 'EM' ? 4.2 : 2.6)
    );
    const repoHaircutPct = round1(
      seed.baseRepoHaircutPct +
        (params.interbankFraOisShockBps / 45) * (seed.regionGroup === 'EM' ? 1.8 : 0.85) +
        (params.usdBasisSqueezeBps / 60) * 0.9
    );

    const cbSwapOrRepoDrawUsdBn = round1(
      seed.baseCbSwapDrawUsdBn +
        (basisShock3M / 22) * (seed.regionGroup === 'G10' ? 9.5 : 5.8) +
        (params.fedQtAndTgaDrainUsdBn / 300) * 3.2
    );

    // CIP Arbitrage Pickup: FX-hedged 3M/1Y US Treasury yield vs Domestic Benchmark in bps
    const syntheticUsdBorrowingCostPct = round2(
      usSofrRatePct + Math.abs(Math.min(0, xccyBasis3MBps)) / 100 + liborOrFraOisSpreadBps / 200
    );
    const cipArbitragePickupBps = round1(
      Math.abs(xccyBasis3MBps) * 0.88 + (liborOrFraOisSpreadBps - 10) * 0.42
    );

    const rawZ =
      (Math.abs(xccyBasis3MBps) - 18) / 38 +
      (liborOrFraOisSpreadBps - 12) / 32 +
      (repoHaircutPct - 1.5) / 3.5;
    const compositeStressZScore = round2(Math.max(-0.6, Math.min(4.5, rawZ)));

    let regimeStatus: CurrencyFundingCorridorRow['regimeStatus'] = 'AMPLE_LIQUIDITY';
    if (compositeStressZScore >= 2.6 || xccyBasis3MBps <= -120) {
      regimeStatus = 'ACUTE_DOLLAR_SHORTAGE';
    } else if (compositeStressZScore >= 1.5 || xccyBasis3MBps <= -70) {
      regimeStatus = 'FUNDING_SQUEEZE';
    } else if (compositeStressZScore >= 0.65 || xccyBasis3MBps <= -35) {
      regimeStatus = 'TURN_PRESSURE';
    }

    const termStructurePoints: XccyTermStructurePoint[] = tenors.map((tenor) => {
      const mult = tenorMultipliers[tenor];
      const baselineBasisBps = round1(seed.baseXccy3MBps * mult.base);
      const stressedBasisBps = round1(baselineBasisBps - basisShock3M * mult.shock);
      const cipImpliedUsdRatePct = round2(
        usSofrRatePct - stressedBasisBps / 100 + (tenor === '5Y' || tenor === '10Y' ? 0.25 : 0)
      );
      const hedgedUstPickupBps = round1(Math.abs(stressedBasisBps) * 0.85 + rfrOisSpreadBps * 0.35);
      return {
        tenor,
        baselineBasisBps,
        stressedBasisBps,
        cipImpliedUsdRatePct,
        hedgedUstPickupBps,
      };
    });

    const deskTradeExpression =
      regimeStatus === 'ACUTE_DOLLAR_SHORTAGE' || regimeStatus === 'FUNDING_SQUEEZE'
        ? `Receive 3M/1Y ${seed.currencyCode}/USD XCCY Basis (${xccyBasis3MBps} bps) via USD Cash Lending vs. ${seed.rfrBenchmarkName} OIS (+${cipArbitragePickupBps} bps CIP Arbitrage Pickup)`
        : `Pay 5Y ${seed.currencyCode}/USD XCCY Tail Hedge (${xccyBasis5YBps} bps) & Harvest ${seed.rfrBenchmarkName}-SOFR Box Carry`;

    return {
      corridorId: seed.corridorId,
      currencyCode: seed.currencyCode,
      pairLabel: seed.pairLabel,
      sovereignLabel: seed.sovereignLabel,
      regionGroup: seed.regionGroup,
      isTargetSovereign: isTarget,
      spotRateVsUsd: seed.spotRateVsUsd,
      domesticPolicyRatePct: seed.domesticPolicyRatePct,
      domestic10YBondYieldPct: seed.domestic10YBondYieldPct,
      rfrBenchmarkName: seed.rfrBenchmarkName,
      xccyBasis3MBps,
      xccyBasis1YBps,
      xccyBasis5YBps,
      baselineXccyBasis3MBps: seed.baseXccy3MBps,
      liborOrFraOisSpreadBps,
      rfrOisSpreadBps,
      repoHaircutPct,
      cbSwapOrRepoDrawUsdBn,
      cipArbitragePickupBps,
      syntheticUsdBorrowingCostPct,
      compositeStressZScore,
      regimeStatus,
      termStructurePoints,
      deskTradeExpression,
    };
  });

  const fedSwapLinesTotalUsdBn = round1(
    corridors
      .filter((c) => ['EUR', 'JPY', 'GBP', 'CHF', 'CAD'].includes(c.currencyCode))
      .reduce((acc, c) => acc + c.cbSwapOrRepoDrawUsdBn, 0)
  );

  const avgZScore =
    corridors.reduce((acc, c) => acc + c.compositeStressZScore, 0) / Math.max(1, corridors.length);
  const globalLiquidityStressIndexZScore = round2(avgZScore);

  const fedNetLiquidityImpulseUsdTn = round2(
    fedBankReservesUsdTn - fedOnRrpBalanceUsdBn / 1000 + (fedSrfDrawsUsdBn + fedSwapLinesTotalUsdBn) / 1000
  );

  // Central Bank Plumbing & Repo Facilities Table
  const targetCorridor =
    corridors.find((c) => c.isTargetSovereign) || corridors[0];

  const centralBankFacilities: CentralBankLiquidityFacilityRow[] = [
    {
      facilityId: 'FED_SRF',
      centralBank: 'Federal Reserve (FRBNY)',
      facilityName: 'Standing Repo Facility (SRF)',
      tickerCode: 'SRF-UST/MBS',
      policyRatePct: round2(usEffrRatePct + 0.17),
      currentUsageUsdBn: 4.5,
      stressedUsageUsdBn: fedSrfDrawsUsdBn,
      capacityLimitLabel: '$500B Daily Aggregate Cap',
      utilizationPctOfCap: round1(Math.min(100, (fedSrfDrawsUsdBn / 500) * 100)),
      collateralAccepted: 'US Treasuries, Agency Debt & Agency MBS',
      counterpartyScope: 'Primary Dealers & Qualifying Depository Institutions',
      reserveScarcitySignal:
        fedSrfDrawsUsdBn > 120
          ? 'CRITICAL_DRAIN'
          : fedSrfDrawsUsdBn > 45
          ? 'SCARCE'
          : fedSrfDrawsUsdBn > 15
          ? 'AMPLE'
          : 'ABUNDANT',
      plumbingNotes: `Ceiling backstop when GC Repo (${usGcRepoRatePct.toFixed(2)}%) clears above SRF minimum bid rate.`,
    },
    {
      facilityId: 'FED_ON_RRP',
      centralBank: 'Federal Reserve (FRBNY)',
      facilityName: 'Overnight Reverse Repo Facility (ON RRP)',
      tickerCode: 'ON-RRP',
      policyRatePct: round2(usEffrRatePct - 0.03),
      currentUsageUsdBn: 295.0,
      stressedUsageUsdBn: fedOnRrpBalanceUsdBn,
      capacityLimitLabel: '$160B Per-Counterparty Limit',
      utilizationPctOfCap: round1(Math.min(100, (fedOnRrpBalanceUsdBn / 600) * 100)),
      collateralAccepted: 'SOMA US Treasury General Collateral',
      counterpartyScope: 'Money Market Funds (MMFs), GSEs & Banks',
      reserveScarcitySignal:
        fedOnRrpBalanceUsdBn < 60
          ? 'CRITICAL_DRAIN'
          : fedOnRrpBalanceUsdBn < 140
          ? 'SCARCE'
          : 'AMPLE',
      plumbingNotes: `Excess liquidity buffer; depletion below $100B shifts QT drain directly onto bank reserves ($${fedBankReservesUsdTn.toFixed(2)}T).`,
    },
    {
      facilityId: 'FED_FIMA',
      centralBank: 'Federal Reserve (FOMC)',
      facilityName: 'FIMA Foreign Central Bank Repo Facility',
      tickerCode: 'FIMA-REPO',
      policyRatePct: round2(usEffrRatePct + 0.17),
      currentUsageUsdBn: 2.0,
      stressedUsageUsdBn: fedFimaDrawsUsdBn,
      capacityLimitLabel: '$60B Per-Foreign-CB Account',
      utilizationPctOfCap: round1(Math.min(100, (fedFimaDrawsUsdBn / 240) * 100)),
      collateralAccepted: 'Custodied US Treasury Securities at FRBNY',
      counterpartyScope: 'Foreign Central Banks & Monetary Authorities',
      reserveScarcitySignal:
        fedFimaDrawsUsdBn > 75
          ? 'CRITICAL_DRAIN'
          : fedFimaDrawsUsdBn > 25
          ? 'SCARCE'
          : 'AMPLE',
      plumbingNotes:
        'Prevents forced fire-sales of foreign official UST holdings during acute EM/offshore dollar squeezes.',
    },
    {
      facilityId: 'FED_SWAP_LINES',
      centralBank: 'Fed + ECB / BoJ / BoE / SNB / BoC',
      facilityName: 'Standing Central Bank USD Liquidity Swap Lines',
      tickerCode: 'CB-USD-SWAP',
      policyRatePct: round2(usSofrRatePct + 0.25),
      currentUsageUsdBn: 22.1,
      stressedUsageUsdBn: fedSwapLinesTotalUsdBn,
      capacityLimitLabel: 'Unlimited (Standing G10 Network)',
      utilizationPctOfCap: round1(Math.min(100, (fedSwapLinesTotalUsdBn / 350) * 100)),
      collateralAccepted: 'Sovereign Local Currency & Eligible Domestic Collateral',
      counterpartyScope: 'Eurosystem, BoJ, BoE, SNB & BoC Member Banks',
      reserveScarcitySignal:
        fedSwapLinesTotalUsdBn > 140
          ? 'CRITICAL_DRAIN'
          : fedSwapLinesTotalUsdBn > 60
          ? 'SCARCE'
          : 'AMPLE',
      plumbingNotes: `Caps offshore XCCY basis blowouts when 3M EUR/JPY basis widens beyond OIS + 25 bps penalty spread.`,
    },
    {
      facilityId: 'ECB_MRO_LTRO',
      centralBank: 'European Central Bank (Eurosystem)',
      facilityName: 'MRO / 3M LTRO & USD Tender Operations',
      tickerCode: 'ECB-LTRO',
      policyRatePct: 3.4,
      currentUsageUsdBn: 34.8,
      stressedUsageUsdBn: round1(
        34.8 + params.usdBasisSqueezeBps * 0.58 + params.interbankFraOisShockBps * 0.42
      ),
      capacityLimitLabel: 'Full Allotment Fixed Rate',
      utilizationPctOfCap: round1(
        Math.min(100, (34.8 + params.usdBasisSqueezeBps * 0.58) / 1.8)
      ),
      collateralAccepted: 'Eurozone Sovereign Bonds & Covered Bank Debt (ECAF)',
      counterpartyScope: 'Eurozone Monetary Financial Institutions (MFIs)',
      reserveScarcitySignal:
        params.usdBasisSqueezeBps > 80 ? 'SCARCE' : 'AMPLE',
      plumbingNotes:
        'Stabilizes ESTR-EURIBOR spread and funds European G-SIB dollar books across quarter-end turns.',
    },
    {
      facilityId: 'BOJ_USD_FSO',
      centralBank: 'Bank of Japan (BoJ)',
      facilityName: 'USD Funds-Supplying Operations & JGB Repo Window',
      tickerCode: 'BOJ-USD-FSO',
      policyRatePct: round2(usSofrRatePct + 0.25),
      currentUsageUsdBn: 11.8,
      stressedUsageUsdBn: round1(
        corridors.find((c) => c.currencyCode === 'JPY')?.cbSwapOrRepoDrawUsdBn ?? 15.0
      ),
      capacityLimitLabel: 'Unlimited Against Pooled JGBs',
      utilizationPctOfCap: round1(
        Math.min(
          100,
          ((corridors.find((c) => c.currencyCode === 'JPY')?.cbSwapOrRepoDrawUsdBn ?? 15) / 120) *
            100
        )
      ),
      collateralAccepted: 'Japanese Government Bonds (JGBs) & T-Bills',
      counterpartyScope: 'Japanese City Banks, Norinchukin & Life Insurers',
      reserveScarcitySignal:
        (corridors.find((c) => c.currencyCode === 'JPY')?.xccyBasis3MBps ?? -34) < -85
          ? 'CRITICAL_DRAIN'
          : (corridors.find((c) => c.currencyCode === 'JPY')?.xccyBasis3MBps ?? -34) < -55
          ? 'SCARCE'
          : 'AMPLE',
      plumbingNotes:
        'Primary backstop for Japanese lifer & mega-bank FX-hedged UST carry portfolios during JPY/USD basis squeezes.',
    },
    {
      facilityId: 'PBOC_CNH_SWAP',
      centralBank: 'PBoC & HKMA',
      facilityName: 'Offshore CNH Liquidity Facility & FX Swap Line',
      tickerCode: 'PBOC-CNH',
      policyRatePct: 3.1,
      currentUsageUsdBn: 14.5,
      stressedUsageUsdBn: round1(
        corridors.find((c) => c.currencyCode === 'CNY')?.cbSwapOrRepoDrawUsdBn ?? 18.0
      ),
      capacityLimitLabel: 'RMB 800B (~$112B Equivalent)',
      utilizationPctOfCap: round1(
        Math.min(
          100,
          ((corridors.find((c) => c.currencyCode === 'CNY')?.cbSwapOrRepoDrawUsdBn ?? 18) / 112) *
            100
        )
      ),
      collateralAccepted: 'CGBs, PBoC Central Bank Bills & Policy Bank Bonds',
      counterpartyScope: 'Offshore CNH Clearing & Participating Banks',
      reserveScarcitySignal:
        params.usdBasisSqueezeBps > 75 ? 'SCARCE' : 'AMPLE',
      plumbingNotes:
        'Counteracts offshore CNH HIBOR squeeze attacks and manages USD/CNH forward points stability.',
    },
    {
      facilityId: 'TARGET_SOVEREIGN_WINDOW',
      centralBank: `${countryName} Monetary Authority`,
      facilityName: `${targetCorridor.currencyCode} FX Swap Auction & Lombard Repo Window`,
      tickerCode: `${targetCorridor.currencyCode}-FX-REPO`,
      policyRatePct: policyRatePct,
      currentUsageUsdBn: round1(targetCorridor.cbSwapOrRepoDrawUsdBn * 0.65),
      stressedUsageUsdBn: targetCorridor.cbSwapOrRepoDrawUsdBn,
      capacityLimitLabel: `$${Math.round(Math.max(25, fxReservesUsdBn * 0.28))}B FX Reserve Repo Envelope`,
      utilizationPctOfCap: round1(
        Math.min(
          100,
          (targetCorridor.cbSwapOrRepoDrawUsdBn / Math.max(20, fxReservesUsdBn * 0.28)) *
            100
        )
      ),
      collateralAccepted: `${countryName} Local Sovereign Bonds & USD Eurobonds`,
      counterpartyScope: `Domestic Commercial & Investment Banks (${countryName})`,
      reserveScarcitySignal:
        targetCorridor.regimeStatus === 'ACUTE_DOLLAR_SHORTAGE'
          ? 'CRITICAL_DRAIN'
          : targetCorridor.regimeStatus === 'FUNDING_SQUEEZE'
          ? 'SCARCE'
          : 'AMPLE',
      plumbingNotes: `Direct transmission channel for ${countryName}'s ${fxReservesMonths.toFixed(1)}-month FX reserve buffer and domestic bank dollar rollover.`,
    },
  ];

  // Portfolio VaR & Sovereign Refinancing Transmission
  const targetSovereignExternalRolloverSpreadDeltaBps = Math.round(
    Math.abs(targetCorridor.xccyBasis3MBps - targetCorridor.baselineXccyBasis3MBps) * 1.15 +
      (us3mFraOisSpreadBps - 11.5) * 0.85 +
      (targetCorridor.repoHaircutPct - 1.6) * 12
  );
  const targetSovereignFxHedgeCarryCostPct = round2(
    Math.max(0.25, (targetCorridor.domesticPolicyRatePct - usSofrRatePct) - targetCorridor.xccyBasis1YBps / 100)
  );
  const targetSovereignSyntheticUsdCostPct = targetCorridor.syntheticUsdBorrowingCostPct;
  const portfolioFundingLvarDeltaPctNav = round2(
    0.42 +
      (params.usdBasisSqueezeBps / 100) * 1.85 +
      (params.interbankFraOisShockBps / 100) * 1.45 +
      (params.gsibTurnWindowDressingMultiplier - 1.0) * 0.95
  );
  const estimatedMarginCallBufferUsdMillions = Math.round(
    125 +
      params.usdBasisSqueezeBps * 2.8 +
      params.interbankFraOisShockBps * 3.1 +
      (params.fedQtAndTgaDrainUsdBn / 10) * 1.9
  );

  const ibTreasuryAdvisoryMandate =
    targetSovereignExternalRolloverSpreadDeltaBps > 60
      ? `Lock in US dollar funding early using 5-year currency swaps and central bank repo lines instead of selling cash dollar reserves at a loss (Ref: 5Y ${targetCorridor.currencyCode}/USD XCCY Basis = ${targetCorridor.xccyBasis5YBps} bps · Rollover Spread Delta = +${targetSovereignExternalRolloverSpreadDeltaBps} bps).`
      : `Replace short-term local borrowing with longer 3-to-5 year fixed-rate bonds while currency hedging costs remain calm (Ref: 5Y ${targetCorridor.currencyCode}/USD XCCY Basis = ${targetCorridor.xccyBasis5YBps} bps).`;

  const hfRelativeValueArbitrageTrade =
    targetCorridor.cipArbitragePickupBps > 45
      ? `Buy 3-month/1-year US Treasury Bills and swap them into ${targetCorridor.currencyCode} to lock in +${targetCorridor.cipArbitragePickupBps.toFixed(1)} bps of extra risk-free yield over local overnight rates (Ref: CIP Arbitrage Wedge = +${targetCorridor.cipArbitragePickupBps.toFixed(1)} bps vs. ${targetCorridor.rfrBenchmarkName} OIS).`
      : `Position for quarter-end bank funding tightness by pairing US overnight repo spreads with 3-month ${targetCorridor.currencyCode}/USD currency swap protection (Ref: SOFR-EFFR = +${usSofrEffrSpreadBps} bps).`;

  const headlineConclusion =
    globalLiquidityStressIndexZScore >= 2.2
      ? `SEVERE US DOLLAR CASH SQUEEZE: Global banks are hoarding US dollars, pushing ${targetCorridor.pairLabel} currency-hedging costs out to ${targetCorridor.xccyBasis3MBps} bps and adding +${targetSovereignExternalRolloverSpreadDeltaBps} bps to ${countryName}'s foreign borrowing costs (Ref: Global Liquidity Stress Z = +${globalLiquidityStressIndexZScore.toFixed(2)}σ · US 3M FRA-OIS = ${us3mFraOisSpreadBps} bps · Fed SRF+Swaps = $${(fedSrfDrawsUsdBn + fedSwapLinesTotalUsdBn).toFixed(1)}B).`
      : globalLiquidityStressIndexZScore >= 1.1
      ? `TIGHTENING DOLLAR FUNDING: Big global banks are pulling back balance-sheet lending ahead of quarter-end, widening ${targetCorridor.pairLabel} swap costs to ${targetCorridor.xccyBasis3MBps} bps (Ref: Liquidity Stress Z = +${globalLiquidityStressIndexZScore.toFixed(2)}σ · GC Repo-SOFR = +${usGcRepoSofrSpreadBps} bps · CIP Wedge = +${targetCorridor.cipArbitragePickupBps} bps).`
      : `CALM GLOBAL DOLLAR FUNDING: Dollars are flowing smoothly across global banks, with ${targetCorridor.pairLabel} hedging costs steady at ${targetCorridor.xccyBasis3MBps} bps and a $${fedOnRrpBalanceUsdBn.toFixed(0)}B Federal Reserve cash cushion (Ref: Liquidity Stress Z = +${globalLiquidityStressIndexZScore.toFixed(2)}σ · SOFR-EFFR = +${usSofrEffrSpreadBps} bps).`;

  return {
    stressParams: params,
    headlineConclusion,
    globalLiquidityStressIndexZScore,
    usSofrRatePct,
    usEffrRatePct,
    usGcRepoRatePct,
    us3mFraOisSpreadBps,
    usSofrEffrSpreadBps,
    usGcRepoSofrSpreadBps,
    fedNetLiquidityImpulseUsdTn,
    fedBankReservesUsdTn,
    fedOnRrpBalanceUsdBn,
    fedSrfDrawsUsdBn,
    fedFimaDrawsUsdBn,
    fedSwapLinesTotalUsdBn,
    corridors,
    centralBankFacilities,
    portfolioTransmission: {
      targetSovereignExternalRolloverSpreadDeltaBps,
      targetSovereignFxHedgeCarryCostPct,
      targetSovereignSyntheticUsdCostPct,
      portfolioFundingLvarDeltaPctNav,
      estimatedMarginCallBufferUsdMillions,
      ibTreasuryAdvisoryMandate,
      hfRelativeValueArbitrageTrade,
    },
  };
}
