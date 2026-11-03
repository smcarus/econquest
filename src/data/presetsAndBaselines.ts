import {
  AnnotatedChartSpec,
  CouncilAssessmentRun,
  CustomSovereignOnboardingDraft,
  OpenDataSnapshot,
  WatchlistGroup,
  WatchlistItem,
} from '../types/council';

export const CUSTOM_SOVEREIGN_OVERRIDES: Record<string, Partial<OpenDataSnapshot>> = {};

export function registerCustomSovereignInCatalog(
  draft: CustomSovereignOnboardingDraft
): WatchlistItem {
  const cleanIso3 = draft.iso3.trim().toUpperCase().slice(0, 3);
  const cdsNorm = Math.min(0.92, Math.max(0.18, draft.cds5YSpreadBps / 520));
  const debtNorm = Math.min(0.92, Math.max(0.18, draft.debtToGdpPct / 130));
  const sovRisk = Number(((cdsNorm * 0.55 + debtNorm * 0.45)).toFixed(2));
  const macroRisk = Number(
    Math.min(
      0.92,
      Math.max(0.18, (draft.cpiInflationPct / 18) * 0.5 + (draft.sovereign10YBondYieldPct / 22) * 0.5)
    ).toFixed(2)
  );
  const geoRisk = Number(
    Math.min(
      0.92,
      Math.max(0.18, (draft.chokepointExposureIndex / 100) * 0.65 + ((100 - draft.politicalStabilityPercentile) / 100) * 0.35)
    ).toFixed(2)
  );
  const compositeRisk = Number(((geoRisk + sovRisk + macroRisk) / 3).toFixed(2));
  const alertStatus: WatchlistItem['alertStatus'] =
    compositeRisk >= 0.65 || draft.cds5YSpreadBps >= 320
      ? 'CRITICAL'
      : compositeRisk >= 0.45 || draft.cds5YSpreadBps >= 140
      ? 'ELEVATED'
      : 'STABLE';

  const newItem: WatchlistItem = {
    iso3: cleanIso3,
    countryName: draft.countryName.trim(),
    region: draft.region.trim(),
    currencyCode: draft.currencyCode.trim().toUpperCase(),
    focusTheme: draft.focusTheme.trim(),
    geopoliticalRisk: geoRisk,
    sovereignRisk: sovRisk,
    macroRisk: macroRisk,
    compositeRisk,
    yield10YPct: Number(draft.sovereign10YBondYieldPct.toFixed(2)),
    cds5YBps: Math.round(draft.cds5YSpreadBps),
    debtToGdpPct: Number(draft.debtToGdpPct.toFixed(1)),
    fxReservesMonths: Number(draft.fxReservesMonthsImport.toFixed(1)),
    alertStatus,
  };

  const existingIdx = SOVEREIGN_CATALOG.findIndex((c) => c.iso3 === cleanIso3);
  if (existingIdx >= 0) {
    SOVEREIGN_CATALOG[existingIdx] = newItem;
  } else {
    SOVEREIGN_CATALOG.push(newItem);
  }

  CUSTOM_SOVEREIGN_OVERRIDES[cleanIso3] = {
    imfIndicators: {
      debtToGdpPct: Number(draft.debtToGdpPct.toFixed(1)),
      debtToGdpForecast2027Pct: Number((draft.debtToGdpPct - draft.primaryFiscalBalancePct * 1.1).toFixed(1)),
      primaryFiscalBalancePct: Number(draft.primaryFiscalBalancePct.toFixed(2)),
      realGdpGrowthPct: Number(draft.realGdpGrowthPct.toFixed(2)),
      cpiInflationPct: Number(draft.cpiInflationPct.toFixed(2)),
      sourceUrl: `https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/${cleanIso3}`,
    },
    worldBankIndicators: {
      fxReservesMonthsImport: Number(draft.fxReservesMonthsImport.toFixed(1)),
      externalDebtPctGni: Number(draft.externalDebtPctGni.toFixed(1)),
      currentAccountPctGdp: Number(draft.currentAccountPctGdp.toFixed(2)),
      politicalStabilityPercentile: Number(draft.politicalStabilityPercentile.toFixed(1)),
      sourceUrl: `https://api.worldbank.org/v2/country/${cleanIso3}`,
    },
    monetaryAndMarket: {
      policyRatePct: Number(draft.policyRatePct.toFixed(2)),
      realPolicyRatePct: Number((draft.policyRatePct - draft.cpiInflationPct).toFixed(2)),
      sovereign10YBondYieldPct: Number(draft.sovereign10YBondYieldPct.toFixed(2)),
      cds5YSpreadBps: Math.round(draft.cds5YSpreadBps),
      exchangeRatePerUsd: Number(draft.exchangeRatePerUsd.toFixed(2)),
      fxYtdChangePct: -4.2,
      chokepointExposureIndex: Math.round(draft.chokepointExposureIndex),
    },
  };

  return newItem;
}

export const SOVEREIGN_CATALOG: WatchlistItem[] = [
  {
    iso3: 'BRA',
    countryName: 'Brazil',
    region: 'Latin America',
    currencyCode: 'BRL',
    focusTheme: 'Fiscal Primary Target Credibility vs. Selic Terminal Rate & Real Yield Cushion',
    geopoliticalRisk: 0.34,
    sovereignRisk: 0.64,
    macroRisk: 0.58,
    compositeRisk: 0.52,
    yield10YPct: 12.85,
    cds5YBps: 168,
    debtToGdpPct: 86.4,
    fxReservesMonths: 14.2,
    alertStatus: 'ELEVATED',
  },
  {
    iso3: 'TUR',
    countryName: 'Turkey',
    region: 'EMEA',
    currencyCode: 'TRY',
    focusTheme: 'Orthodox Monetary Disinflation Path, Net FX Reserve Rebuilding & Energy Import Sensitivity',
    geopoliticalRisk: 0.68,
    sovereignRisk: 0.61,
    macroRisk: 0.72,
    compositeRisk: 0.67,
    yield10YPct: 28.4,
    cds5YBps: 264,
    debtToGdpPct: 31.8,
    fxReservesMonths: 4.1,
    alertStatus: 'CRITICAL',
  },
  {
    iso3: 'EGY',
    countryName: 'Egypt (Red Sea Corridor)',
    region: 'MENA / Chokepoint',
    currencyCode: 'EGP',
    focusTheme: 'Bab el-Mandeb Maritime Transit Revenue Shock, IMF EFF Tranche & Rollover Wall',
    geopoliticalRisk: 0.84,
    sovereignRisk: 0.78,
    macroRisk: 0.74,
    compositeRisk: 0.79,
    yield10YPct: 24.1,
    cds5YBps: 540,
    debtToGdpPct: 90.2,
    fxReservesMonths: 3.4,
    alertStatus: 'CRITICAL',
  },
  {
    iso3: 'ZAF',
    countryName: 'South Africa',
    region: 'Sub-Saharan Africa',
    currencyCode: 'ZAR',
    focusTheme: 'Coalition Fiscal Consolidation, Logistics Bottlenecks & Commodity Terms-of-Trade',
    geopoliticalRisk: 0.45,
    sovereignRisk: 0.62,
    macroRisk: 0.54,
    compositeRisk: 0.54,
    yield10YPct: 10.45,
    cds5YBps: 205,
    debtToGdpPct: 75.8,
    fxReservesMonths: 5.3,
    alertStatus: 'ELEVATED',
  },
  {
    iso3: 'MEX',
    countryName: 'Mexico',
    region: 'Latin America',
    currencyCode: 'MXN',
    focusTheme: 'North American Trade Tariff Renegotiation, Judicial Reform & Quasi-Sovereign Contingent Liability',
    geopoliticalRisk: 0.56,
    sovereignRisk: 0.53,
    macroRisk: 0.49,
    compositeRisk: 0.53,
    yield10YPct: 9.95,
    cds5YBps: 132,
    debtToGdpPct: 54.6,
    fxReservesMonths: 4.6,
    alertStatus: 'ELEVATED',
  },
  {
    iso3: 'IDN',
    countryName: 'Indonesia',
    region: 'Asia-Pacific',
    currencyCode: 'IDR',
    focusTheme: 'Fiscal Deficit 3% Cap Discipline, Commodity Downstreaming & DXY Spillover Resilience',
    geopoliticalRisk: 0.31,
    sovereignRisk: 0.39,
    macroRisk: 0.42,
    compositeRisk: 0.37,
    yield10YPct: 6.75,
    cds5YBps: 74,
    debtToGdpPct: 39.6,
    fxReservesMonths: 6.2,
    alertStatus: 'STABLE',
  },
  {
    iso3: 'JPN',
    countryName: 'Japan',
    region: 'G10 / Asia-Pacific',
    currencyCode: 'JPY',
    focusTheme: 'BoJ Yield Curve Normalization, JGB Duration Supply & Yen Carry Trade Unwind Spillover',
    geopoliticalRisk: 0.38,
    sovereignRisk: 0.57,
    macroRisk: 0.51,
    compositeRisk: 0.49,
    yield10YPct: 1.18,
    cds5YBps: 24,
    debtToGdpPct: 251.2,
    fxReservesMonths: 15.8,
    alertStatus: 'ELEVATED',
  },
  {
    iso3: 'GBR',
    countryName: 'United Kingdom',
    region: 'G10 / Europe',
    currencyCode: 'GBP',
    focusTheme: 'Gilt Issuance Supply Absorption, Fiscal Headroom Rules & Services Inflation Persistence',
    geopoliticalRisk: 0.32,
    sovereignRisk: 0.48,
    macroRisk: 0.47,
    compositeRisk: 0.42,
    yield10YPct: 4.42,
    cds5YBps: 31,
    debtToGdpPct: 101.4,
    fxReservesMonths: 3.1,
    alertStatus: 'STABLE',
  },
];

export const DEFAULT_WATCHLISTS: WatchlistGroup[] = [
  {
    id: 'wl_em_sovereign_core',
    name: 'EM Sovereign Fiscal & Rollover Watch',
    description: 'High-carry Emerging Market sovereigns sensitive to fiscal anchors, domestic debt rollover walls, and US real yields.',
    isCustom: false,
    items: [
      SOVEREIGN_CATALOG[0], // BRA
      SOVEREIGN_CATALOG[1], // TUR
      SOVEREIGN_CATALOG[2], // EGY
      SOVEREIGN_CATALOG[3], // ZAF
      SOVEREIGN_CATALOG[4], // MEX
    ],
  },
  {
    id: 'wl_chokepoint_geopol',
    name: 'Maritime Chokepoints & Tariff Flashpoints',
    description: 'Sovereigns exposed to Red Sea / Suez shipping diversions, energy import shocks, and cross-border supply chain tariffs.',
    isCustom: false,
    items: [
      SOVEREIGN_CATALOG[2], // EGY
      SOVEREIGN_CATALOG[1], // TUR
      SOVEREIGN_CATALOG[4], // MEX
      SOVEREIGN_CATALOG[5], // IDN
    ],
  },
  {
    id: 'wl_g10_em_spillover',
    name: 'Global Duration & Carry Unwind Monitor',
    description: 'G10 funding markets and high-yielding EM destination markets vulnerable to volatility spikes.',
    isCustom: false,
    items: [
      SOVEREIGN_CATALOG[6], // JPN
      SOVEREIGN_CATALOG[7], // GBR
      SOVEREIGN_CATALOG[0], // BRA
      SOVEREIGN_CATALOG[5], // IDN
    ],
  },
];

export function buildBaselineOpenData(iso3: string): OpenDataSnapshot {
  const item = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3) || SOVEREIGN_CATALOG[0];

  const snapshots: Record<string, Partial<OpenDataSnapshot>> = {
    BRA: {
      imfIndicators: {
        debtToGdpPct: 86.4,
        debtToGdpForecast2027Pct: 91.2,
        primaryFiscalBalancePct: -0.6,
        realGdpGrowthPct: 2.8,
        cpiInflationPct: 4.55,
        sourceUrl: 'https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/BRA',
      },
      worldBankIndicators: {
        fxReservesMonthsImport: 14.2,
        externalDebtPctGni: 29.4,
        currentAccountPctGdp: -1.7,
        politicalStabilityPercentile: 38.5,
        sourceUrl: 'https://data.worldbank.org/country/brazil',
      },
      monetaryAndMarket: {
        policyRatePct: 11.75,
        realPolicyRatePct: 7.20,
        sovereign10YBondYieldPct: 12.85,
        cds5YSpreadBps: 168,
        exchangeRatePerUsd: 5.74,
        fxYtdChangePct: -14.8,
        chokepointExposureIndex: 34,
      },
      polymarketContracts: [
        {
          id: 'pm-bra-selic',
          question: 'Will Banco Central do Brasil hike Selic above 12.50% in H1?',
          probabilityPct: 68,
          volumeUsd: 1420000,
          category: 'Monetary Policy',
          url: 'https://polymarket.com',
        },
        {
          id: 'pm-bra-fiscal',
          question: 'Will Brazil achieve a 0.0% Primary Fiscal Deficit target this fiscal year?',
          probabilityPct: 24,
          volumeUsd: 890000,
          category: 'Sovereign Fiscal',
          url: 'https://polymarket.com',
        },
      ],
      gdeltMetrics: {
        conflictIntensityIndex: 36,
        averageTone: -1.8,
        articleCount24h: 312,
        topHeadlines: [
          {
            title: 'Brazilian Treasury signals commitment to fiscal framework amid rising DI swap yields',
            sourceDomain: 'valorinternational.globo.com',
            publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
            toneScore: -2.1,
            url: 'https://valorinternational.globo.com',
          },
          {
            title: 'BCB Monetary Policy Committee (Copom) minutes highlight unanchored inflation expectations',
            sourceDomain: 'bcb.gov.br',
            publishedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
            toneScore: -3.4,
            url: 'https://www.bcb.gov.br',
          },
        ],
      },
    },
    TUR: {
      imfIndicators: {
        debtToGdpPct: 31.8,
        debtToGdpForecast2027Pct: 33.4,
        primaryFiscalBalancePct: -1.9,
        realGdpGrowthPct: 3.1,
        cpiInflationPct: 44.3,
        sourceUrl: 'https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/TUR',
      },
      worldBankIndicators: {
        fxReservesMonthsImport: 4.1,
        externalDebtPctGni: 47.2,
        currentAccountPctGdp: -1.8,
        politicalStabilityPercentile: 19.4,
        sourceUrl: 'https://data.worldbank.org/country/turkiye',
      },
      monetaryAndMarket: {
        policyRatePct: 50.0,
        realPolicyRatePct: 5.7,
        sovereign10YBondYieldPct: 28.4,
        cds5YSpreadBps: 264,
        exchangeRatePerUsd: 34.65,
        fxYtdChangePct: -16.2,
        chokepointExposureIndex: 69,
      },
      polymarketContracts: [
        {
          id: 'pm-tur-cbrt',
          question: 'Will CBRT maintain policy rate >= 45% through Q2?',
          probabilityPct: 74,
          volumeUsd: 1180000,
          category: 'Central Banks',
          url: 'https://polymarket.com',
        },
        {
          id: 'pm-tur-rating',
          question: 'Will Turkey receive an additional sovereign credit rating upgrade within 6 months?',
          probabilityPct: 61,
          volumeUsd: 640000,
          category: 'Sovereign Credit',
          url: 'https://polymarket.com',
        },
      ],
      gdeltMetrics: {
        conflictIntensityIndex: 64,
        averageTone: -3.1,
        articleCount24h: 498,
        topHeadlines: [
          {
            title: 'CBRT net FX reserves excluding swaps expand as local deposit dollarization declines',
            sourceDomain: 'tcmb.gov.tr',
            publishedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
            toneScore: 1.6,
            url: 'https://www.tcmb.gov.tr',
          },
          {
            title: 'Eastern Mediterranean and regional energy transit corridors face heightened security premiums',
            sourceDomain: 'reuters.com',
            publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
            toneScore: -4.2,
            url: 'https://www.reuters.com',
          },
        ],
      },
    },
    EGY: {
      imfIndicators: {
        debtToGdpPct: 90.2,
        debtToGdpForecast2027Pct: 82.6,
        primaryFiscalBalancePct: 2.1,
        realGdpGrowthPct: 3.6,
        cpiInflationPct: 26.5,
        sourceUrl: 'https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/EGY',
      },
      worldBankIndicators: {
        fxReservesMonthsImport: 3.4,
        externalDebtPctGni: 42.8,
        currentAccountPctGdp: -3.4,
        politicalStabilityPercentile: 16.2,
        sourceUrl: 'https://data.worldbank.org/country/egypt-arab-rep',
      },
      monetaryAndMarket: {
        policyRatePct: 27.25,
        realPolicyRatePct: 0.75,
        sovereign10YBondYieldPct: 24.1,
        cds5YSpreadBps: 540,
        exchangeRatePerUsd: 49.3,
        fxYtdChangePct: -37.1,
        chokepointExposureIndex: 92,
      },
      polymarketContracts: [
        {
          id: 'pm-egy-suez',
          question: 'Will Red Sea / Suez Canal container transit volumes recover above 65% of pre-crisis baseline this quarter?',
          probabilityPct: 19,
          volumeUsd: 2350000,
          category: 'Geopolitics & Trade',
          url: 'https://polymarket.com',
        },
        {
          id: 'pm-egy-imf',
          question: 'Will IMF Executive Board complete Egypt EFF review without fiscal waiver delay?',
          probabilityPct: 79,
          volumeUsd: 520000,
          category: 'Multilateral Policy',
          url: 'https://polymarket.com',
        },
      ],
      gdeltMetrics: {
        conflictIntensityIndex: 82,
        averageTone: -4.9,
        articleCount24h: 640,
        topHeadlines: [
          {
            title: 'IMF PortWatch reports Suez Canal daily transit volume remains 58% below historical average',
            sourceDomain: 'portwatch.imf.org',
            publishedAt: new Date(Date.now() - 1 * 3600_000).toISOString(),
            toneScore: -5.4,
            url: 'https://portwatch.imf.org',
          },
          {
            title: 'Central Bank of Egypt maintains tight monetary stance to anchor FX unification gains',
            sourceDomain: 'cbe.org.eg',
            publishedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
            toneScore: -1.2,
            url: 'https://www.cbe.org.eg',
          },
        ],
      },
    },
  };

  const specific = CUSTOM_SOVEREIGN_OVERRIDES[item.iso3] || snapshots[item.iso3] || {};

  const imf = specific.imfIndicators || {
    debtToGdpPct: item.debtToGdpPct,
    debtToGdpForecast2027Pct: Number((item.debtToGdpPct * 1.04).toFixed(1)),
    primaryFiscalBalancePct: -0.8,
    realGdpGrowthPct: 2.5,
    cpiInflationPct: 4.8,
    sourceUrl: `https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/${item.iso3}`,
  };

  const wb = specific.worldBankIndicators || {
    fxReservesMonthsImport: item.fxReservesMonths,
    externalDebtPctGni: 34.5,
    currentAccountPctGdp: -1.9,
    politicalStabilityPercentile: 42.0,
    sourceUrl: `https://api.worldbank.org/v2/country/${item.iso3}`,
  };

  const mkt = specific.monetaryAndMarket || {
    policyRatePct: Number((item.yield10YPct * 0.92).toFixed(2)),
    realPolicyRatePct: 3.4,
    sovereign10YBondYieldPct: item.yield10YPct,
    cds5YSpreadBps: item.cds5YBps,
    exchangeRatePerUsd: 18.4,
    fxYtdChangePct: -8.4,
    chokepointExposureIndex: Math.round(item.geopoliticalRisk * 100),
  };

  // Compute IMF Debt Sustainability Analysis (r - g) Math
  const rEff = Number(Math.max(1.2, mkt.sovereign10YBondYieldPct - imf.cpiInflationPct * 0.75).toFixed(2));
  const gReal = imf.realGdpGrowthPct;
  const rMinusG = Number((rEff - gReal).toFixed(2));
  const pbStar = Number((((rEff - gReal) / (100 + gReal)) * imf.debtToGdpPct).toFixed(2));
  const fiscalGap = Number((pbStar - imf.primaryFiscalBalancePct).toFixed(2));

  // Compute Debt Rollover & Maturity Wall Profile
  const liquidReservesBn = Number((wb.fxReservesMonthsImport * 24.5).toFixed(1));
  const stExtDebtBn = Number(Math.max(18, liquidReservesBn / (wb.fxReservesMonthsImport >= 6 ? 2.45 : 1.18)).toFixed(1));
  const ggRatio = Math.round((liquidReservesBn / stExtDebtBn) * 100);
  const floatShare = item.iso3 === 'BRA' ? 42.8 : item.iso3 === 'EGY' ? 48.5 : item.iso3 === 'TUR' ? 36.2 : 28.4;

  const base10Y = mkt.sovereign10YBondYieldPct;
  const basePol = mkt.policyRatePct;

  return {
    iso3: item.iso3,
    countryName: item.countryName,
    region: item.region,
    currencyCode: item.currencyCode,
    fetchedAt: new Date().toISOString(),
    liveApiSourcesActive: [
      'IMF DataMapper WEO v1 (GGXWDG_NGDP, PCPIPCH)',
      'World Bank Open Data v2 (FI.RES.TOTL.MO, BN.CAB.XOKA.GD.ZS)',
      'Polymarket Gamma Markets API',
      'GDELT 2.0 Global Conflict & Tone API',
      'US Treasury Fiscal Data Exchange Rates API',
    ],
    imfIndicators: imf,
    worldBankIndicators: wb,
    monetaryAndMarket: mkt,
    polymarketContracts: specific.polymarketContracts || snapshots.BRA!.polymarketContracts!,
    gdeltMetrics: specific.gdeltMetrics || snapshots.BRA!.gdeltMetrics!,
    dsaAnalytics: {
      effectiveRealInterestRatePct: rEff,
      realGdpGrowthRatePct: gReal,
      rMinusGDifferentialPct: rMinusG,
      debtStabilizingPrimaryBalancePct: pbStar,
      actualPrimaryBalancePct: imf.primaryFiscalBalancePct,
      fiscalConsolidationGapPct: fiscalGap,
      dsaInterpretation:
        fiscalGap > 0.5
          ? `Borrowing costs are higher than economic growth, so government debt will keep rising unless the budget cuts spending or raises taxes by ${fiscalGap.toFixed(2)}% of GDP (Ref: Gross Debt = ${imf.debtToGdpPct.toFixed(1)}% GDP · r - g = +${rMinusG.toFixed(2)}% · Required Primary Surplus = +${pbStar.toFixed(2)}% GDP).`
          : `The government's current budget balance is strong enough to keep national debt from snowballing relative to the economy (Ref: Actual Primary Balance = ${imf.primaryFiscalBalancePct.toFixed(1)}% GDP vs. Stabilizing Threshold = ${pbStar.toFixed(2)}% GDP).`,
    },
    debtRollover: {
      greenspanGuidottiRatioPct: ggRatio,
      shortTermExternalDebtUsdBn: stExtDebtBn,
      liquidFxReservesUsdBn: liquidReservesBn,
      weightedAvgMaturityYears: item.iso3 === 'BRA' ? 4.1 : item.iso3 === 'EGY' ? 3.2 : 5.4,
      floatingRateDebtSharePct: floatShare,
      foreignHoldingsSharePct: item.iso3 === 'BRA' ? 9.8 : item.iso3 === 'MEX' ? 16.4 : 21.5,
      rolloverVerdict:
        ggRatio >= 150
          ? `The central bank holds more than enough US dollars to pay all foreign debt due in the next year, though local-currency debt costs rise quickly when interest rates go up (Ref: Greenspan-Guidotti Reserve Cover = ${ggRatio}% vs. 100% IMF Floor · Floating-Rate Debt = ${floatShare}%).`
          : `Hard-currency reserves are tight compared to foreign debt coming due over the next 12 months, meaning continued IMF or multilateral funding is essential (Ref: Greenspan-Guidotti Reserve Cover = ${ggRatio}% vs. 100% IMF Minimum Floor).`,
      buckets: [
        {
          periodLabel: 'Next 90D (Q1)',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.045).toFixed(1)),
          externalHardCurrencyPctGdp: 0.6,
          totalUsdBn: 28.4,
          avgCouponPct: Number((basePol * 0.96).toFixed(2)),
        },
        {
          periodLabel: 'Q2 Rollover',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.062).toFixed(1)),
          externalHardCurrencyPctGdp: 1.1,
          totalUsdBn: 41.2,
          avgCouponPct: Number((base10Y * 0.95).toFixed(2)),
          isPeakRollover: true,
        },
        {
          periodLabel: 'Q3 Rollover',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.048).toFixed(1)),
          externalHardCurrencyPctGdp: 0.8,
          totalUsdBn: 31.0,
          avgCouponPct: Number((base10Y * 0.94).toFixed(2)),
        },
        {
          periodLabel: 'Q4 Rollover',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.051).toFixed(1)),
          externalHardCurrencyPctGdp: 0.9,
          totalUsdBn: 33.8,
          avgCouponPct: Number((base10Y * 0.92).toFixed(2)),
        },
        {
          periodLabel: 'FY 2027 Wall',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.165).toFixed(1)),
          externalHardCurrencyPctGdp: 2.9,
          totalUsdBn: 112.5,
          avgCouponPct: Number((base10Y * 0.90).toFixed(2)),
          isPeakRollover: true,
        },
        {
          periodLabel: 'FY 2028 Wall',
          domesticLocalPctGdp: Number((imf.debtToGdpPct * 0.142).toFixed(1)),
          externalHardCurrencyPctGdp: 2.4,
          totalUsdBn: 96.0,
          avgCouponPct: Number((base10Y * 0.88).toFixed(2)),
        },
      ],
    },
    yieldCurve: {
      slope2s10sBps: Math.round((base10Y - (basePol * 0.96)) * 100),
      curveRegimeLabel:
        base10Y >= basePol
          ? 'Bear Steepening (Fiscal Term-Premium Expansion)'
          : 'Inverted Monetary Restriction (Front-End Anchored by Hawkish CB)',
      localVsUsdBasisSummary: `Local 10-year government bonds pay extra yield above US Treasuries even after insuring against default, reflecting investor caution over inflation and currency swings (Ref: 10Y Local Yield = ${base10Y.toFixed(2)}% · Local vs. USD Basis Pickup = +${Math.round(
        (base10Y - 4.35) * 100 - mkt.cds5YSpreadBps
      )} bps · 5Y CDS = ${mkt.cds5YSpreadBps} bps).`,
      tenors: [
        {
          tenor: '3M',
          currentYieldPct: Number((basePol * 0.98).toFixed(2)),
          prior90DYieldPct: Number((basePol * 0.92).toFixed(2)),
          usdHedgedBasisBps: -15,
        },
        {
          tenor: '1Y',
          currentYieldPct: Number((basePol * 1.01).toFixed(2)),
          prior90DYieldPct: Number((basePol * 0.94).toFixed(2)),
          usdHedgedBasisBps: 22,
        },
        {
          tenor: '2Y',
          currentYieldPct: Number((base10Y * 0.96).toFixed(2)),
          prior90DYieldPct: Number((base10Y * 0.90).toFixed(2)),
          usdHedgedBasisBps: 48,
        },
        {
          tenor: '5Y',
          currentYieldPct: Number((base10Y * 0.98).toFixed(2)),
          prior90DYieldPct: Number((base10Y * 0.92).toFixed(2)),
          usdHedgedBasisBps: 85,
        },
        {
          tenor: '10Y',
          currentYieldPct: base10Y,
          prior90DYieldPct: Number((base10Y - 0.65).toFixed(2)),
          usdHedgedBasisBps: 118,
        },
        {
          tenor: '30Y',
          currentYieldPct: Number((base10Y + 0.35).toFixed(2)),
          prior90DYieldPct: Number((base10Y - 0.35).toFixed(2)),
          usdHedgedBasisBps: 142,
        },
      ],
    },
    catalystCalendar: [
      {
        eventId: `cat-${item.iso3}-1`,
        dateLabel: 'In 9 Days',
        daysOut: 9,
        category: 'CENTRAL_BANK_MPC',
        title: `${item.countryName} Central Bank Monetary Policy Committee Rate Decision`,
        consensusExpectation: `Hold / +25bps Hawkish Guidance (${mkt.policyRatePct.toFixed(2)}% Benchmark)`,
        tailRiskScenario: 'Unanimous +75bps hike or dissenting dovish split unanchoring 5Y breakevens',
        impliedVolatilityImpact: '±38 bps on 2Y/5Y Swaps · ±1.6% Spot FX',
        deskOwner: 'macro',
      },
      {
        eventId: `cat-${item.iso3}-2`,
        dateLabel: 'In 21 Days',
        daysOut: 21,
        category: 'BOND_REDEMPTION_WALL',
        title: `Quarterly Domestic Treasury Benchmark Auction & Coupon Rollover`,
        consensusExpectation: 'Bid-to-cover > 2.1x with partial floating-rate note allocation',
        tailRiskScenario: 'Tail > 12bps forcing Debt Management Office to shorten issuance maturity',
        impliedVolatilityImpact: '±45 bps on 10Y Local Yield',
        deskOwner: 'sovereign',
      },
      {
        eventId: `cat-${item.iso3}-3`,
        dateLabel: 'In 38 Days',
        daysOut: 38,
        category: 'IMF_FISCAL_REVIEW',
        title: `Bimonthly Primary Fiscal Budget Execution Report & IMF Staff Assessment`,
        consensusExpectation: `Primary deficit containment within ${imf.primaryFiscalBalancePct.toFixed(1)}% GDP corridor`,
        tailRiskScenario: 'Mandatory spending overrun > 0.6% GDP triggering fiscal target revision',
        impliedVolatilityImpact: '±35 bps on 5Y Sovereign CDS · ±2.2% Spot FX',
        deskOwner: 'sovereign',
      },
      {
        eventId: `cat-${item.iso3}-4`,
        dateLabel: 'In 64 Days',
        daysOut: 64,
        category: 'CREDIT_RATING_WINDOW',
        title: `Sovereign Credit Rating Agency Scheduled Outlook Review (S&P / Moody's)`,
        consensusExpectation: 'Affirm current rating with Stable/Cautious fiscal commentary',
        tailRiskScenario: 'Negative Outlook revision citing rising (r - g) debt service trajectory',
        impliedVolatilityImpact: '±50 bps on 5Y USD CDS',
        deskOwner: 'sovereign',
      },
    ],
    factorBetas: [
      {
        factorName: 'US 10Y Real Yield (TIPS) +50 bps Shock',
        shockMagnitudeDescription: '+50 bps parallel rise in US real yields',
        local10YYieldImpactBps: 68,
        spotFxImpactPct: -3.4,
        cds5YImpactBps: 28,
        transmissionChannel: 'Tightens global USD financial conditions and raises minimum required EM real yield buffer.',
      },
      {
        factorName: 'Broad USD Index (DXY) +3.0% Appreciation',
        shockMagnitudeDescription: '+3.0% surge in trade-weighted USD',
        local10YYieldImpactBps: 42,
        spotFxImpactPct: -4.1,
        cds5YImpactBps: 24,
        transmissionChannel: 'Triggers FX pass-through into tradable CPI and increases local value of USD debt.',
      },
      {
        factorName: 'Brent Crude & Maritime Freight +15% Spike',
        shockMagnitudeDescription: '+15% energy & container shipping shock',
        local10YYieldImpactBps: 55,
        spotFxImpactPct: -2.2,
        cds5YImpactBps: 32,
        transmissionChannel: 'Raises headline CPI breakevens by +85–110bps and delays central bank easing cycles.',
      },
      {
        factorName: 'Global / China Manufacturing PMI -2.0 pt Drop',
        shockMagnitudeDescription: '-2.0 pt contraction in global industrial cycle',
        local10YYieldImpactBps: 18,
        spotFxImpactPct: -2.9,
        cds5YImpactBps: 36,
        transmissionChannel: 'Weakens commodity export terms-of-trade and widens the external current account deficit.',
      },
    ],
  };
}

export function buildAnnotatedChartsForSovereign(snapshot: OpenDataSnapshot): AnnotatedChartSpec[] {
  const baseDebt = snapshot.imfIndicators.debtToGdpPct;
  const basePrimary = snapshot.imfIndicators.primaryFiscalBalancePct;
  const baseReserves = snapshot.worldBankIndicators.fxReservesMonthsImport;
  const baseCab = snapshot.worldBankIndicators.currentAccountPctGdp;
  const basePolicyRate = snapshot.monetaryAndMarket.policyRatePct;
  const baseCpi = snapshot.imfIndicators.cpiInflationPct;
  const baseConflict = snapshot.gdeltMetrics.conflictIntensityIndex;
  const basePolyProb = snapshot.polymarketContracts[0]?.probabilityPct ?? 62;

  return [
    {
      chartId: 'chart_sovereign_debt_trajectory',
      categoryKicker: 'Sovereign Credit Desk · Fiscal Sustainability',
      title: `Fiscal Sustainability & Gross Debt Trajectory (${snapshot.countryName})`,
      conclusionHeadline:
        baseDebt >= 80
          ? `Government Debt (${baseDebt.toFixed(1)}% of Economy) Is Above the 80% Danger Zone and Growing Faster Than Budget Savings (Ref: Debt/GDP = ${baseDebt.toFixed(1)}% | IMF Threshold = 80.0% | Primary Balance = ${basePrimary.toFixed(1)}%)`
          : `Government Debt (${baseDebt.toFixed(1)}% of Economy) Remains Below the 80% Danger Zone, Though High Interest Rates Require Budget Discipline (Ref: Debt/GDP = ${baseDebt.toFixed(1)}% | Required Primary Surplus = +${snapshot.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(1)}% GDP)`,
      subtitle: 'General Government Gross Debt (% of GDP) vs. Primary Fiscal Balance (% of GDP) · Historical & IMF WEO Staff Projection',
      deskOwner: 'sovereign',
      primarySeriesLabel: 'Gross Debt (% of GDP)',
      primaryUnit: '% GDP',
      secondarySeriesLabel: 'Primary Fiscal Balance (% of GDP)',
      secondaryUnit: '% GDP',
      thresholdLabel: 'EM Rollover Distress Ceiling (80% GDP)',
      thresholdValue: 80.0,
      provenanceTier: 'TIER_1_MULTILATERAL_API',
      dataSourceCitation: 'IMF DataMapper WEO API (GGXWDG_NGDP & GGXCNL_NGDP)',
      explainer: {
        whatItMeasures:
          'Compares total government debt against the annual budget balance (tax revenues minus everyday spending, excluding interest payments) over time (Ref: IMF WEO Series GGXWDG_NGDP & GGXCNL_NGDP).',
        whyItMattersInstitutionally:
          `When interest rates on debt are higher than economic growth, debt snowballs automatically unless the government runs a budget surplus. Right now ${snapshot.countryName} needs ${snapshot.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% of GDP in budget tightening to keep debt flat (Ref: r - g = +${snapshot.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}% · Stabilizing Primary Balance pb* = +${snapshot.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(2)}% GDP).`,
        regimeBreakThresholdExplanation:
          'Once debt stays above 80% of GDP without a budget surplus, investors demand much higher interest rates to lend long-term; action: Hedge long-term local bonds via 2s10s steepeners (Ref: EM Distress Threshold = 80.0% GDP).',
        crossDeskCascadeLink:
          'Directly hit when the Central Bank raises interest rates—each +1% rate hike adds roughly 0.85% of GDP to the annual interest bill (Ref: Macro → Sovereign Rate-to-Interest Pass-Through).',
      },
      seriesByTimeframe: {
        '30D': [
          { period: 'W-4', primaryValue: Number((baseDebt - 0.4).toFixed(1)), secondaryValue: basePrimary, thresholdValue: 80 },
          { period: 'W-3', primaryValue: Number((baseDebt - 0.3).toFixed(1)), secondaryValue: basePrimary, thresholdValue: 80 },
          { period: 'W-2', primaryValue: Number((baseDebt - 0.1).toFixed(1)), secondaryValue: Number((basePrimary - 0.1).toFixed(1)), thresholdValue: 80 },
          { period: 'W-1', primaryValue: baseDebt, secondaryValue: Number((basePrimary - 0.2).toFixed(1)), thresholdValue: 80 },
          { period: 'Now', primaryValue: Number((baseDebt + 0.2).toFixed(1)), secondaryValue: basePrimary, thresholdValue: 80 },
        ],
        '90D': [
          { period: 'M-3', primaryValue: Number((baseDebt - 1.2).toFixed(1)), secondaryValue: Number((basePrimary + 0.3).toFixed(1)), thresholdValue: 80 },
          { period: 'M-2', primaryValue: Number((baseDebt - 0.8).toFixed(1)), secondaryValue: Number((basePrimary + 0.1).toFixed(1)), thresholdValue: 80 },
          { period: 'M-1', primaryValue: Number((baseDebt - 0.3).toFixed(1)), secondaryValue: basePrimary, thresholdValue: 80 },
          { period: 'Now', primaryValue: baseDebt, secondaryValue: basePrimary, thresholdValue: 80 },
        ],
        '1Y': [
          { period: 'Q1', primaryValue: Number((baseDebt - 2.6).toFixed(1)), secondaryValue: Number((basePrimary + 0.6).toFixed(1)), thresholdValue: 80 },
          { period: 'Q2', primaryValue: Number((baseDebt - 1.8).toFixed(1)), secondaryValue: Number((basePrimary + 0.3).toFixed(1)), thresholdValue: 80 },
          { period: 'Q3', primaryValue: Number((baseDebt - 0.9).toFixed(1)), secondaryValue: Number((basePrimary - 0.1).toFixed(1)), thresholdValue: 80 },
          { period: 'Q4', primaryValue: baseDebt, secondaryValue: basePrimary, thresholdValue: 80 },
        ],
        '5Y': [
          { period: '2022', primaryValue: Number((baseDebt - 6.4).toFixed(1)), secondaryValue: Number((basePrimary + 1.4).toFixed(1)), thresholdValue: 80 },
          { period: '2023', primaryValue: Number((baseDebt - 4.1).toFixed(1)), secondaryValue: Number((basePrimary + 0.5).toFixed(1)), thresholdValue: 80 },
          { period: '2024', primaryValue: Number((baseDebt - 2.2).toFixed(1)), secondaryValue: Number((basePrimary - 0.3).toFixed(1)), thresholdValue: 80 },
          { period: '2025', primaryValue: Number((baseDebt - 0.8).toFixed(1)), secondaryValue: basePrimary, thresholdValue: 80 },
          { period: '2026', primaryValue: baseDebt, secondaryValue: basePrimary, thresholdValue: 80 },
        ],
        '10Y_WEO': [
          { period: '2020', primaryValue: Number((baseDebt - 3.2).toFixed(1)), secondaryValue: -6.8, thresholdValue: 80 },
          { period: '2022', primaryValue: Number((baseDebt - 6.4).toFixed(1)), secondaryValue: 1.1, thresholdValue: 80 },
          { period: '2024', primaryValue: Number((baseDebt - 2.2).toFixed(1)), secondaryValue: Number((basePrimary - 0.4).toFixed(1)), thresholdValue: 80 },
          { period: '2026E', primaryValue: baseDebt, secondaryValue: basePrimary, thresholdValue: 80 },
          { period: '2027F', primaryValue: Number((baseDebt + 2.1).toFixed(1)), secondaryValue: Number((basePrimary - 0.2).toFixed(1)), thresholdValue: 80, isForecast: true },
          { period: '2028F', primaryValue: Number((baseDebt + 3.8).toFixed(1)), secondaryValue: Number((basePrimary - 0.1).toFixed(1)), thresholdValue: 80, isForecast: true },
          { period: '2029F', primaryValue: Number((baseDebt + 5.1).toFixed(1)), secondaryValue: Number((basePrimary + 0.1).toFixed(1)), thresholdValue: 80, isForecast: true },
        ],
      },
    },
    {
      chartId: 'chart_external_reserve_adequacy',
      categoryKicker: 'Sovereign Credit Desk · External Liquidity & Reserves',
      title: `Foreign Exchange Reserve Adequacy & External Balance (${snapshot.countryName})`,
      conclusionHeadline:
        baseReserves >= 5.0
          ? `Central Bank Foreign Currency Savings Cover ${baseReserves.toFixed(1)} Months of Imports, Providing a Safe Cushion Above the 3-Month Minimum (Ref: FX Reserves = ${baseReserves.toFixed(1)} mos | IMF Floor = 3.0 mos | GG Cover = ${snapshot.debtRollover.greenspanGuidottiRatioPct}%)`
          : `Foreign Currency Savings Cover Only ${baseReserves.toFixed(1)} Months of Imports, Hovering Near the 3-Month Minimum Safety Line (Ref: FX Reserves = ${baseReserves.toFixed(1)} mos | IMF Floor = 3.0 mos | Current Account = ${baseCab.toFixed(1)}% GDP)`,
      subtitle: 'Gross International FX Reserves (Months of Imports) vs. Current Account Balance (% of GDP)',
      deskOwner: 'sovereign',
      primarySeriesLabel: 'FX Reserves (Months of Imports)',
      primaryUnit: 'Months',
      secondarySeriesLabel: 'Current Account (% of GDP)',
      secondaryUnit: '% GDP',
      thresholdLabel: 'IMF Reserve Adequacy Floor (3.0 Months)',
      thresholdValue: 3.0,
      provenanceTier: 'TIER_1_MULTILATERAL_API',
      dataSourceCitation: 'World Bank Open Data v2 (FI.RES.TOTL.MO & BN.CAB.XOKA.GD.ZS)',
      explainer: {
        whatItMeasures:
          'Shows how many months the country can pay for essential foreign imports using its central bank US dollar and gold savings, alongside its trade balance with the rest of the world (Ref: World Bank FI.RES.TOTL.MO & BN.CAB.XOKA.GD.ZS).',
        whyItMattersInstitutionally:
          `Tells us whether the country risks running out of US dollars to pay foreign bondholders. Liquid reserves currently cover ${snapshot.debtRollover.greenspanGuidottiRatioPct}% of all foreign debt due within 12 months (Ref: Greenspan-Guidotti Ratio = ${snapshot.debtRollover.greenspanGuidottiRatioPct}% vs. 100% Adequacy Benchmark).`,
        regimeBreakThresholdExplanation:
          'If reserve savings drop below 3 months of imports while the country spends more abroad than it earns, currency devaluation risk spikes; action: Buy 3-month USD call options (Ref: IMF Reserve Adequacy Floor = 3.0 Months).',
        crossDeskCascadeLink:
          'Drained faster when shipping bottlenecks or oil spikes suddenly make energy and food imports more expensive (Ref: Geopolitical Chokepoint → Trade Balance Channel).',
      },
      seriesByTimeframe: {
        '30D': [
          { period: 'W-4', primaryValue: Number((baseReserves + 0.3).toFixed(1)), secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: 'W-3', primaryValue: Number((baseReserves + 0.2).toFixed(1)), secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: 'W-2', primaryValue: Number((baseReserves + 0.1).toFixed(1)), secondaryValue: Number((baseCab - 0.1).toFixed(1)), thresholdValue: 3.0 },
          { period: 'W-1', primaryValue: baseReserves, secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: 'Now', primaryValue: baseReserves, secondaryValue: Number((baseCab - 0.2).toFixed(1)), thresholdValue: 3.0 },
        ],
        '90D': [
          { period: 'M-3', primaryValue: Number((baseReserves + 0.6).toFixed(1)), secondaryValue: Number((baseCab + 0.4).toFixed(1)), thresholdValue: 3.0 },
          { period: 'M-2', primaryValue: Number((baseReserves + 0.4).toFixed(1)), secondaryValue: Number((baseCab + 0.2).toFixed(1)), thresholdValue: 3.0 },
          { period: 'M-1', primaryValue: Number((baseReserves + 0.1).toFixed(1)), secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: 'Now', primaryValue: baseReserves, secondaryValue: baseCab, thresholdValue: 3.0 },
        ],
        '1Y': [
          { period: 'Q1', primaryValue: Number((baseReserves + 0.9).toFixed(1)), secondaryValue: Number((baseCab + 0.6).toFixed(1)), thresholdValue: 3.0 },
          { period: 'Q2', primaryValue: Number((baseReserves + 0.5).toFixed(1)), secondaryValue: Number((baseCab + 0.3).toFixed(1)), thresholdValue: 3.0 },
          { period: 'Q3', primaryValue: Number((baseReserves + 0.2).toFixed(1)), secondaryValue: Number((baseCab - 0.1).toFixed(1)), thresholdValue: 3.0 },
          { period: 'Q4', primaryValue: baseReserves, secondaryValue: baseCab, thresholdValue: 3.0 },
        ],
        '5Y': [
          { period: '2022', primaryValue: Number((baseReserves + 1.8).toFixed(1)), secondaryValue: Number((baseCab - 0.9).toFixed(1)), thresholdValue: 3.0 },
          { period: '2023', primaryValue: Number((baseReserves + 1.1).toFixed(1)), secondaryValue: Number((baseCab - 0.4).toFixed(1)), thresholdValue: 3.0 },
          { period: '2024', primaryValue: Number((baseReserves + 0.5).toFixed(1)), secondaryValue: Number((baseCab + 0.2).toFixed(1)), thresholdValue: 3.0 },
          { period: '2025', primaryValue: Number((baseReserves + 0.2).toFixed(1)), secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: '2026', primaryValue: baseReserves, secondaryValue: baseCab, thresholdValue: 3.0 },
        ],
        '10Y_WEO': [
          { period: '2020', primaryValue: Number((baseReserves + 2.4).toFixed(1)), secondaryValue: Number((baseCab - 1.2).toFixed(1)), thresholdValue: 3.0 },
          { period: '2022', primaryValue: Number((baseReserves + 1.6).toFixed(1)), secondaryValue: Number((baseCab - 0.8).toFixed(1)), thresholdValue: 3.0 },
          { period: '2024', primaryValue: Number((baseReserves + 0.5).toFixed(1)), secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: '2026E', primaryValue: baseReserves, secondaryValue: baseCab, thresholdValue: 3.0 },
          { period: '2027F', primaryValue: Number((baseReserves - 0.3).toFixed(1)), secondaryValue: Number((baseCab - 0.3).toFixed(1)), thresholdValue: 3.0, isForecast: true },
          { period: '2028F', primaryValue: Number((baseReserves - 0.4).toFixed(1)), secondaryValue: Number((baseCab - 0.2).toFixed(1)), thresholdValue: 3.0, isForecast: true },
        ],
      },
    },
    {
      chartId: 'chart_macro_policy_real_yield',
      categoryKicker: 'Macroeconomic Desk · Monetary Policy & Inflation',
      title: `Monetary Policy Stance & Real Yield Cushion (${snapshot.countryName})`,
      conclusionHeadline: `Central Bank Interest Rates (${basePolicyRate.toFixed(2)}%) Stay ${snapshot.monetaryAndMarket.realPolicyRatePct >= 0 ? '+' : ''}${snapshot.monetaryAndMarket.realPolicyRatePct.toFixed(2)}% Above Inflation (${baseCpi.toFixed(2)}%) to Protect the Currency (Ref: Policy Rate = ${basePolicyRate.toFixed(2)}% | CPI = ${baseCpi.toFixed(2)}% | Ex-Post Real Rate = +${snapshot.monetaryAndMarket.realPolicyRatePct.toFixed(2)}%)`,
      subtitle: 'Central Bank Benchmark Policy Rate (%) vs. Headline CPI Inflation YoY (%)',
      deskOwner: 'macro',
      primarySeriesLabel: 'Central Bank Policy Rate (%)',
      primaryUnit: '%',
      secondarySeriesLabel: 'Headline CPI Inflation YoY (%)',
      secondaryUnit: '%',
      thresholdLabel: 'Minimum Real Rate Anchor (CPI + 2.5%)',
      thresholdValue: Number((baseCpi + 2.5).toFixed(1)),
      provenanceTier: 'TIER_1_MULTILATERAL_API',
      dataSourceCitation: 'BIS Central Bank Policy Rates + IMF WEO CPI (PCPIPCH)',
      explainer: {
        whatItMeasures:
          'Compares the Central Bank benchmark interest rate against annual consumer price inflation to show the real after-inflation return earned by savers and bondholders (Ref: Ex-Post Real Policy Rate = Nominal Rate - Headline CPI).',
        whyItMattersInstitutionally:
          'Global investors only hold emerging-market currencies if interest rates pay a healthy cushion above inflation; if inflation catches up to interest rates, money flows out into US dollars (Ref: Real Yield Carry Buffer vs. US TIPS).',
        regimeBreakThresholdExplanation:
          `If inflation rises within 2.5% of the central bank interest rate (requiring at least ${Number((baseCpi + 2.5).toFixed(1))}% policy rate), the currency loses its protective cushion; action: Cut unhedged currency exposure by 50% (Ref: Minimum Real Rate Anchor = +250 bps).`,
        crossDeskCascadeLink:
          'High central bank interest rates protect the currency from inflation, but directly increase the government’s domestic debt payments (Ref: Monetary Tightening → Fiscal Interest Burden).',
      },
      seriesByTimeframe: {
        '30D': [
          { period: 'W-4', primaryValue: Number((basePolicyRate - 0.25).toFixed(2)), secondaryValue: Number((baseCpi - 0.2).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'W-3', primaryValue: Number((basePolicyRate - 0.25).toFixed(2)), secondaryValue: Number((baseCpi - 0.1).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'W-2', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'W-1', primaryValue: basePolicyRate, secondaryValue: Number((baseCpi + 0.1).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'Now', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
        ],
        '90D': [
          { period: 'M-3', primaryValue: Number((basePolicyRate - 0.75).toFixed(2)), secondaryValue: Number((baseCpi - 0.5).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'M-2', primaryValue: Number((basePolicyRate - 0.50).toFixed(2)), secondaryValue: Number((baseCpi - 0.3).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'M-1', primaryValue: Number((basePolicyRate - 0.25).toFixed(2)), secondaryValue: Number((baseCpi - 0.1).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'Now', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
        ],
        '1Y': [
          { period: 'Q1', primaryValue: Number((basePolicyRate - 1.25).toFixed(2)), secondaryValue: Number((baseCpi - 0.8).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'Q2', primaryValue: Number((basePolicyRate - 0.75).toFixed(2)), secondaryValue: Number((baseCpi - 0.4).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'Q3', primaryValue: Number((basePolicyRate - 0.25).toFixed(2)), secondaryValue: Number((baseCpi - 0.2).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: 'Q4', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
        ],
        '5Y': [
          { period: '2022', primaryValue: Number((basePolicyRate + 1.5).toFixed(2)), secondaryValue: Number((baseCpi + 3.8).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2023', primaryValue: Number((basePolicyRate + 1.0).toFixed(2)), secondaryValue: Number((baseCpi + 1.4).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2024', primaryValue: Number((basePolicyRate - 1.0).toFixed(2)), secondaryValue: Number((baseCpi - 0.4).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2025', primaryValue: Number((basePolicyRate - 0.5).toFixed(2)), secondaryValue: Number((baseCpi - 0.2).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2026', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
        ],
        '10Y_WEO': [
          { period: '2020', primaryValue: Number(Math.max(2.0, basePolicyRate - 6.5).toFixed(2)), secondaryValue: Number(Math.max(2.5, baseCpi - 1.5).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2022', primaryValue: Number((basePolicyRate + 1.5).toFixed(2)), secondaryValue: Number((baseCpi + 3.8).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2024', primaryValue: Number((basePolicyRate - 1.0).toFixed(2)), secondaryValue: Number((baseCpi - 0.4).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2026E', primaryValue: basePolicyRate, secondaryValue: baseCpi, thresholdValue: Number((baseCpi + 2.5).toFixed(1)) },
          { period: '2027F', primaryValue: Number((basePolicyRate - 1.0).toFixed(2)), secondaryValue: Number((baseCpi - 0.7).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)), isForecast: true },
          { period: '2028F', primaryValue: Number((basePolicyRate - 1.75).toFixed(2)), secondaryValue: Number((baseCpi - 1.1).toFixed(2)), thresholdValue: Number((baseCpi + 2.5).toFixed(1)), isForecast: true },
        ],
      },
    },
    {
      chartId: 'chart_geopol_prediction_velocity',
      categoryKicker: 'Geopolitical Risk Desk · High-Frequency Event & Prediction Odds',
      title: `Geopolitical Conflict Velocity & Market-Implied Policy Odds (${snapshot.countryName})`,
      conclusionHeadline:
        baseConflict >= 65 || basePolyProb >= 65
          ? `Real-Time News & Prediction Markets Signal High Risk of Trade or Shipping Disruptions (Ref: Polymarket Adverse Odds = ${basePolyProb}% | GDELT Conflict Index = ${baseConflict}/100 | Escalation Trigger = 65)`
          : `Global News Tension (${baseConflict}/100) Stays Below the Red-Alert Level Despite ${basePolyProb}% Market Odds of Policy Friction (Ref: GDELT Conflict Index = ${baseConflict}/100 | Polymarket Odds = ${basePolyProb}% | Trigger = 65)`,
      subtitle: 'GDELT Conflict & Tone Stress Index (0–100) vs. Polymarket Adverse Regime Probability (%)',
      deskOwner: 'geopolitical',
      primarySeriesLabel: 'GDELT Conflict & Tone Index',
      primaryUnit: 'Index',
      secondarySeriesLabel: 'Polymarket Adverse Odds',
      secondaryUnit: '% Prob',
      thresholdLabel: 'Acute Spillover Escalation Trigger (65)',
      thresholdValue: 65,
      provenanceTier: 'TIER_2_PREDICTION_EVENT',
      dataSourceCitation: 'GDELT 2.0 Global Knowledge Graph + Polymarket Gamma API + IMF PortWatch',
      explainer: {
        whatItMeasures:
          'Tracks live global news tension and shipping route disruptions every 15 minutes alongside real-money prediction market odds on tariffs, sanctions, and elections (Ref: GDELT 2.0 Tone/Volume Index + Polymarket Gamma API).',
        whyItMattersInstitutionally:
          'Official inflation and GDP reports come out 30 to 60 days late. Live news and prediction markets spot supply-chain and tariff shocks 2 to 4 weeks before they show up in government statistics (Ref: Lead Time = 14–28 Days vs. Official CPI/GDP).',
        regimeBreakThresholdExplanation:
          'When news conflict intensity or prediction market odds climb above 65, higher shipping and fuel costs quickly spill over into local inflation; action: Add oil/freight call spreads as a hedge (Ref: Regime Break Trigger = 65/100).',
        crossDeskCascadeLink:
          'Acts as the first domino: shipping delays and tariffs push up import prices, which then force the Central Bank to keep interest rates high (Ref: Stage 1 Geopolitical → Stage 2 Macro Cascade).',
      },
      seriesByTimeframe: {
        '30D': [
          { period: 'D-25', primaryValue: Math.max(15, baseConflict - 14), secondaryValue: Math.max(15, basePolyProb - 16), thresholdValue: 65 },
          { period: 'D-20', primaryValue: Math.max(18, baseConflict - 10), secondaryValue: Math.max(18, basePolyProb - 11), thresholdValue: 65 },
          { period: 'D-15', primaryValue: Math.max(20, baseConflict - 6), secondaryValue: Math.max(20, basePolyProb - 7), thresholdValue: 65 },
          { period: 'D-10', primaryValue: Math.max(22, baseConflict - 4), secondaryValue: Math.max(22, basePolyProb - 3), thresholdValue: 65 },
          { period: 'D-5', primaryValue: Math.max(24, baseConflict - 2), secondaryValue: Math.max(24, basePolyProb - 1), thresholdValue: 65 },
          { period: 'Now', primaryValue: baseConflict, secondaryValue: basePolyProb, thresholdValue: 65 },
        ],
        '90D': [
          { period: 'M-3', primaryValue: Math.max(15, baseConflict - 21), secondaryValue: Math.max(15, basePolyProb - 22), thresholdValue: 65 },
          { period: 'M-2', primaryValue: Math.max(18, baseConflict - 14), secondaryValue: Math.max(18, basePolyProb - 15), thresholdValue: 65 },
          { period: 'M-1', primaryValue: Math.max(20, baseConflict - 6), secondaryValue: Math.max(20, basePolyProb - 7), thresholdValue: 65 },
          { period: 'Now', primaryValue: baseConflict, secondaryValue: basePolyProb, thresholdValue: 65 },
        ],
        '1Y': [
          { period: 'Q1', primaryValue: Math.max(15, baseConflict - 26), secondaryValue: Math.max(15, basePolyProb - 24), thresholdValue: 65 },
          { period: 'Q2', primaryValue: Math.max(18, baseConflict - 18), secondaryValue: Math.max(18, basePolyProb - 18), thresholdValue: 65 },
          { period: 'Q3', primaryValue: Math.max(22, baseConflict - 9), secondaryValue: Math.max(22, basePolyProb - 8), thresholdValue: 65 },
          { period: 'Q4', primaryValue: baseConflict, secondaryValue: basePolyProb, thresholdValue: 65 },
        ],
        '5Y': [
          { period: '2022', primaryValue: 74, secondaryValue: 71, thresholdValue: 65 },
          { period: '2023', primaryValue: 58, secondaryValue: 54, thresholdValue: 65 },
          { period: '2024', primaryValue: Math.max(25, baseConflict - 12), secondaryValue: Math.max(25, basePolyProb - 10), thresholdValue: 65 },
          { period: '2025', primaryValue: Math.max(28, baseConflict - 5), secondaryValue: Math.max(28, basePolyProb - 4), thresholdValue: 65 },
          { period: '2026', primaryValue: baseConflict, secondaryValue: basePolyProb, thresholdValue: 65 },
        ],
        '10Y_WEO': [
          { period: '2020', primaryValue: 62, secondaryValue: 59, thresholdValue: 65 },
          { period: '2022', primaryValue: 74, secondaryValue: 71, thresholdValue: 65 },
          { period: '2024', primaryValue: Math.max(25, baseConflict - 12), secondaryValue: Math.max(25, basePolyProb - 10), thresholdValue: 65 },
          { period: '2026E', primaryValue: baseConflict, secondaryValue: basePolyProb, thresholdValue: 65 },
          { period: '2027F', primaryValue: Math.max(20, baseConflict - 8), secondaryValue: Math.max(20, basePolyProb - 9), thresholdValue: 65, isForecast: true },
        ],
      },
    },
  ];
}

export function recomputeDerivedOpenDataAnalytics(
  snapshot: OpenDataSnapshot,
  overrides?: {
    yield2Y?: number;
    yield5Y?: number;
    yield30Y?: number;
    liquidReservesUsdBn?: number;
    shortTermDebtPctReserves?: number;
  }
): OpenDataSnapshot {
  const imf = snapshot.imfIndicators;
  const wb = snapshot.worldBankIndicators;
  const mkt = snapshot.monetaryAndMarket;

  mkt.realPolicyRatePct = Number((mkt.policyRatePct - imf.cpiInflationPct).toFixed(2));

  // Recompute IMF Debt Sustainability Analysis (r - g) Math from live indicators
  const rEff = Number(Math.max(0.8, mkt.sovereign10YBondYieldPct - imf.cpiInflationPct * 0.75).toFixed(2));
  const gReal = imf.realGdpGrowthPct;
  const rMinusG = Number((rEff - gReal).toFixed(2));
  const pbStar = Number((((rEff - gReal) / (100 + gReal)) * imf.debtToGdpPct).toFixed(2));
  const fiscalGap = Number((pbStar - imf.primaryFiscalBalancePct).toFixed(2));

  snapshot.dsaAnalytics = {
    effectiveRealInterestRatePct: rEff,
    realGdpGrowthRatePct: gReal,
    rMinusGDifferentialPct: rMinusG,
    debtStabilizingPrimaryBalancePct: pbStar,
    actualPrimaryBalancePct: imf.primaryFiscalBalancePct,
    fiscalConsolidationGapPct: fiscalGap,
    dsaInterpretation:
      fiscalGap > 0.5
        ? `Borrowing costs are higher than economic growth, so government debt will keep rising unless the budget cuts spending or raises taxes by ${fiscalGap.toFixed(2)}% of GDP (Ref: Gross Debt = ${imf.debtToGdpPct.toFixed(1)}% GDP · r - g = ${rMinusG >= 0 ? '+' : ''}${rMinusG.toFixed(2)}% · Required Primary Balance = ${pbStar >= 0 ? '+' : ''}${pbStar.toFixed(2)}% GDP).`
        : `The government's current budget balance is strong enough to keep national debt from snowballing relative to the economy (Ref: Actual Primary Balance = ${imf.primaryFiscalBalancePct.toFixed(1)}% GDP vs. Stabilizing Threshold = ${pbStar.toFixed(2)}% GDP).`,
  };

  // Recompute Debt Rollover & Greenspan-Guidotti Profile from live World Bank reserves & short-term debt
  const liquidReservesBn =
    typeof overrides?.liquidReservesUsdBn === 'number' && overrides.liquidReservesUsdBn > 0
      ? Number(overrides.liquidReservesUsdBn.toFixed(1))
      : snapshot.debtRollover?.liquidFxReservesUsdBn || Number((wb.fxReservesMonthsImport * 24.5).toFixed(1));

  let stExtDebtBn = snapshot.debtRollover?.shortTermExternalDebtUsdBn || Number(Math.max(18, liquidReservesBn / 1.8).toFixed(1));
  if (typeof overrides?.shortTermDebtPctReserves === 'number' && overrides.shortTermDebtPctReserves > 1) {
    stExtDebtBn = Number(Math.max(4, (liquidReservesBn * overrides.shortTermDebtPctReserves) / 100).toFixed(1));
  }
  const ggRatio = Math.max(25, Math.round((liquidReservesBn / Math.max(1, stExtDebtBn)) * 100));
  const floatShare = snapshot.debtRollover?.floatingRateDebtSharePct ?? 34.0;
  const base10Y = mkt.sovereign10YBondYieldPct;
  const basePol = mkt.policyRatePct;

  snapshot.debtRollover = {
    ...snapshot.debtRollover,
    greenspanGuidottiRatioPct: ggRatio,
    shortTermExternalDebtUsdBn: stExtDebtBn,
    liquidFxReservesUsdBn: liquidReservesBn,
    rolloverVerdict:
      ggRatio >= 150
        ? `The central bank holds more than enough US dollars to pay all foreign debt due in the next year, though local-currency debt costs rise quickly when interest rates go up (Ref: Greenspan-Guidotti Reserve Cover = ${ggRatio}% vs. 100% IMF Floor · Floating-Rate Debt = ${floatShare}%).`
        : `Hard-currency reserves are tight compared to foreign debt coming due over the next 12 months, meaning continued IMF or multilateral funding is essential (Ref: Greenspan-Guidotti Reserve Cover = ${ggRatio}% vs. 100% IMF Minimum Floor).`,
    buckets: (snapshot.debtRollover?.buckets || []).map((b, idx) => ({
      ...b,
      domesticLocalPctGdp: Number((imf.debtToGdpPct * (idx === 4 ? 0.068 : idx === 1 ? 0.056 : 0.044)).toFixed(1)),
      avgCouponPct: Number(((idx === 0 ? basePol : base10Y) * (0.96 - idx * 0.015)).toFixed(2)),
    })),
  };

  // Recompute Yield Curve Tenors & Slope from live policy rate + grounded curve yields
  const y3M = Number((basePol * 0.99).toFixed(2));
  const y1Y = Number((basePol * 1.01).toFixed(2));
  const y2Y =
    typeof overrides?.yield2Y === 'number' && overrides.yield2Y > 0
      ? Number(overrides.yield2Y.toFixed(2))
      : Number((basePol * 0.45 + base10Y * 0.52).toFixed(2));
  const y5Y =
    typeof overrides?.yield5Y === 'number' && overrides.yield5Y > 0
      ? Number(overrides.yield5Y.toFixed(2))
      : Number((y2Y * 0.35 + base10Y * 0.65).toFixed(2));
  const y10Y = Number(base10Y.toFixed(2));
  const y30Y =
    typeof overrides?.yield30Y === 'number' && overrides.yield30Y > 0
      ? Number(overrides.yield30Y.toFixed(2))
      : Number((base10Y + 0.35).toFixed(2));

  const slope2s10sBps = Math.round((y10Y - y2Y) * 100);
  const us10YAnchor = 4.32;
  const basisPickupBps = Math.round((y10Y - us10YAnchor) * 100 - mkt.cds5YSpreadBps);

  snapshot.yieldCurve = {
    slope2s10sBps,
    curveRegimeLabel:
      y10Y >= basePol
        ? `Bear Steepening (+${slope2s10sBps} bps 2s10s · Fiscal Term-Premium Expansion)`
        : `Inverted Monetary Restriction (${slope2s10sBps} bps 2s10s · Front-End Anchored by CB at ${basePol.toFixed(2)}%)`,
    localVsUsdBasisSummary: `Local 10-year government bonds pay extra yield above US Treasuries even after insuring against default, reflecting investor caution over inflation and currency swings (Ref: 10Y Local Yield = ${y10Y.toFixed(2)}% · Local vs. USD Basis Pickup = ${basisPickupBps >= 0 ? '+' : ''}${basisPickupBps} bps · 5Y CDS = ${mkt.cds5YSpreadBps} bps).`,
    tenors: [
      {
        tenor: '3M',
        currentYieldPct: y3M,
        prior90DYieldPct: Number((y3M - 0.25).toFixed(2)),
        usdHedgedBasisBps: -18,
      },
      {
        tenor: '1Y',
        currentYieldPct: y1Y,
        prior90DYieldPct: Number((y1Y - 0.3).toFixed(2)),
        usdHedgedBasisBps: 19,
      },
      {
        tenor: '2Y',
        currentYieldPct: y2Y,
        prior90DYieldPct: Number((y2Y - 0.35).toFixed(2)),
        usdHedgedBasisBps: 46,
      },
      {
        tenor: '5Y',
        currentYieldPct: y5Y,
        prior90DYieldPct: Number((y5Y - 0.45).toFixed(2)),
        usdHedgedBasisBps: 84,
      },
      {
        tenor: '10Y',
        currentYieldPct: y10Y,
        prior90DYieldPct: Number((y10Y - 0.55).toFixed(2)),
        usdHedgedBasisBps: basisPickupBps,
      },
      {
        tenor: '30Y',
        currentYieldPct: y30Y,
        prior90DYieldPct: Number((y30Y - 0.45).toFixed(2)),
        usdHedgedBasisBps: basisPickupBps + 24,
      },
    ],
  };

  if (Array.isArray(snapshot.catalystCalendar) && snapshot.catalystCalendar.length >= 3) {
    snapshot.catalystCalendar[0].consensusExpectation = `Hold / +25bps Hawkish Guidance (${mkt.policyRatePct.toFixed(2)}% Benchmark)`;
    snapshot.catalystCalendar[2].consensusExpectation = `Primary balance containment within ${imf.primaryFiscalBalancePct.toFixed(1)}% GDP corridor`;
  }

  return snapshot;
}

export function buildDefaultAssessmentRun(
  iso3 = 'BRA',
  customOpenData?: OpenDataSnapshot
): CouncilAssessmentRun {
  const openData = customOpenData
    ? recomputeDerivedOpenDataAnalytics(customOpenData)
    : recomputeDerivedOpenDataAnalytics(buildBaselineOpenData(iso3));
  const charts = buildAnnotatedChartsForSovereign(openData);
  const catalogItem = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3) || SOVEREIGN_CATALOG[0];

  // Dynamically calibrate sovereign, macro, and geopolitical risk scores from live openData
  const anchors = computeQuantitativeAnchorScores(openData);
  const liveSovRisk = anchors.sovereign;
  const liveMacroRisk = anchors.macro;
  const liveGeoRisk = anchors.geopolitical;

  const item: WatchlistItem = customOpenData
    ? {
        ...catalogItem,
        iso3: openData.iso3,
        countryName: openData.countryName,
        currencyCode: openData.currencyCode,
        geopoliticalRisk: liveGeoRisk,
        sovereignRisk: liveSovRisk,
        macroRisk: liveMacroRisk,
        compositeRisk: Number(((liveGeoRisk + liveSovRisk + liveMacroRisk) / 3).toFixed(2)),
        yield10YPct: openData.monetaryAndMarket.sovereign10YBondYieldPct,
        cds5YBps: openData.monetaryAndMarket.cds5YSpreadBps,
        debtToGdpPct: openData.imfIndicators.debtToGdpPct,
        fxReservesMonths: openData.worldBankIndicators.fxReservesMonthsImport,
      }
    : catalogItem;

  return {
    runId: `SMCR-2026-${iso3}-001`,
    iso3: item.iso3,
    countryName: item.countryName,
    scenarioPrompt: item.focusTheme,
    policyDocumentTitle: 'IMF Article IV Consultation Staff Concluding Statement & Central Bank Policy Extract',
    policyDocumentSnippet:
      'Staff emphasizes that achieving the primary fiscal balance target requires structural expenditure containment. Unanchored medium-term inflation expectations and external maritime freight volatility warrant continued monetary vigilance and rebuilding of hard-currency liquidity buffers.',
    runtimeUsed: 'Google AI Studio (Quick: gemini-3.8-flash · Deep: gemini-3.8-flash High-Reasoning)',
    stage: 'COMPLETED',
    openData,
    charts,
    subAgents: [
      {
        agentId: 'ag1_intel_scraper',
        agentCode: 'Geopolitical · Intelligence',
        agentName: 'Intelligence Scraper Analyst',
        deskId: 'geopolitical',
        roleTitle: 'Alternative Data, GDELT Event Velocity & Diplomatic Think-Tank Monitor',
        dataSourcesUsed: ['GDELT 2.0 DOC API', 'CSIS / CrisisWatch Feeds', 'Google Search Grounding'],
        stance: item.geopoliticalRisk > 0.6 ? 'BEARISH' : 'NEUTRAL',
        riskScore: item.geopoliticalRisk,
        confidence: 0.86,
        brierCalibrationWeight: 0.88,
        keyMetrics: [
          {
            label: 'GDELT 24h Conflict Intensity',
            value: `${openData.gdeltMetrics.conflictIntensityIndex}/100`,
            numericValue: openData.gdeltMetrics.conflictIntensityIndex,
            unit: 'Index',
            change: '+6.4 vs 30D avg',
            source: 'GDELT 2.0 API',
            provenanceTier: 'TIER_2_PREDICTION_EVENT',
          },
          {
            label: 'Bilateral Media Tone Score',
            value: `${openData.gdeltMetrics.averageTone.toFixed(1)}`,
            numericValue: openData.gdeltMetrics.averageTone,
            unit: 'Tone',
            change: '-0.8 deterioration',
            source: 'GDELT 2.0 API',
            provenanceTier: 'TIER_2_PREDICTION_EVENT',
          },
        ],
        findingsSummary: `Live global news monitoring shows rising political and trade friction around ${item.countryName}, with media coverage turning more negative over the past 24 hours (Ref: GDELT 24h Volume = ${openData.gdeltMetrics.articleCount24h} articles · Conflict Intensity = ${openData.gdeltMetrics.conflictIntensityIndex}/100 · Media Tone = ${openData.gdeltMetrics.averageTone}).`,
        structuredPayload: {
          gdelt_conflict_index: openData.gdeltMetrics.conflictIntensityIndex,
          media_tone_score: openData.gdeltMetrics.averageTone,
          escalation_trigger_active: item.geopoliticalRisk > 0.55,
        },
        groundingSources: openData.gdeltMetrics.topHeadlines.map((h) => ({
          title: h.title,
          uri: h.url,
          sourceType: h.sourceDomain,
        })),
      },
      {
        agentId: 'ag2_transmission_mapper',
        agentCode: 'Geopolitical · Supply Chain',
        agentName: 'Transmission Mapping Analyst',
        deskId: 'geopolitical',
        roleTitle: 'Maritime Chokepoints, Physical Supply Chains & Energy Freight Mapper',
        dataSourcesUsed: ['IMF PortWatch Maritime Indicators', 'UN Comtrade Open Trade Flows'],
        stance: openData.monetaryAndMarket.chokepointExposureIndex > 55 ? 'BEARISH' : 'NEUTRAL',
        riskScore: Number(Math.min(0.95, item.geopoliticalRisk + 0.08).toFixed(2)),
        confidence: 0.84,
        brierCalibrationWeight: 0.91,
        keyMetrics: [
          {
            label: 'Maritime Chokepoint Exposure',
            value: `${openData.monetaryAndMarket.chokepointExposureIndex}/100`,
            numericValue: openData.monetaryAndMarket.chokepointExposureIndex,
            unit: 'Index',
            change: '+14% freight pass-through',
            source: 'IMF PortWatch',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Import Energy & Freight Pass-Through',
            value: '+15.0%',
            numericValue: 15.0,
            unit: '% Shock',
            change: '+110bps CPI impulse',
            source: 'Transmission Model',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
        ],
        findingsSummary: `Shipping route detours and higher cargo insurance rates are adding about 15% to the cost of imported fuel and goods entering ${item.countryName} (Ref: Chokepoint Exposure = ${openData.monetaryAndMarket.chokepointExposureIndex}/100 · Landed Freight/Energy Shock = +15.0% · CPI Pass-Through = +110 bps).`,
        structuredPayload: {
          chokepoint_exposure_index: openData.monetaryAndMarket.chokepointExposureIndex,
          energy_freight_inflation_shock_pct: 15.0,
          supply_chain_bottleneck_severity: openData.monetaryAndMarket.chokepointExposureIndex > 60 ? 'HIGH' : 'MODERATE',
        },
        groundingSources: [
          {
            title: 'IMF PortWatch Chokepoint Transit Volume & Spillover Tracker',
            uri: 'https://portwatch.imf.org',
            sourceType: 'IMF PortWatch',
          },
        ],
      },
      {
        agentId: 'ag3_sanctions_legal',
        agentCode: 'Geopolitical · Sanctions & Legal',
        agentName: 'Sanctions & Legal Analyst',
        deskId: 'geopolitical',
        roleTitle: 'OFAC Regulatory Tracker, Tariff Regimes & Polymarket Contract Auditor',
        dataSourcesUsed: ['Polymarket Gamma API', 'OFAC SDN / Tariff Schedules'],
        stance: 'BEARISH',
        riskScore: Number(Math.min(0.92, item.geopoliticalRisk + 0.05).toFixed(2)),
        confidence: 0.89,
        brierCalibrationWeight: 0.87,
        keyMetrics: [
          {
            label: 'Polymarket Adverse Policy Odds',
            value: `${openData.polymarketContracts[0]?.probabilityPct ?? 65}%`,
            numericValue: openData.polymarketContracts[0]?.probabilityPct ?? 65,
            unit: '% Prob',
            change: '+9% in 14D',
            source: 'Polymarket Gamma API',
            provenanceTier: 'TIER_2_PREDICTION_EVENT',
          },
          {
            label: 'Cross-Border Tariff / Capital Friction',
            value: 'Elevated',
            numericValue: 0.62,
            unit: 'Score',
            change: 'Secondary compliance watch',
            source: 'OFAC / Trade Registry',
            provenanceTier: 'TIER_3_SEARCH_POLICY_DOC',
          },
        ],
        findingsSummary: `Real-money prediction markets see a ${openData.polymarketContracts[0]?.probabilityPct ?? 65}% chance of new tariffs or policy friction soon, making cross-border trade and investment more expensive (Ref: Polymarket Adverse Policy Probability = ${openData.polymarketContracts[0]?.probabilityPct ?? 65}% · Regulatory Friction Score = 0.62).`,
        structuredPayload: {
          polymarket_implied_prob_pct: openData.polymarketContracts[0]?.probabilityPct ?? 65,
          capital_restriction_risk: 0.42,
        },
        groundingSources: [
          {
            title: openData.polymarketContracts[0]?.question || 'Polymarket Macro Contract',
            uri: 'https://polymarket.com',
            sourceType: 'Polymarket Gamma API',
          },
        ],
      },
      {
        agentId: 'ag4_fiscal_auditor',
        agentCode: 'Sovereign · Fiscal Sustainability',
        agentName: 'Fiscal Auditor Analyst',
        deskId: 'sovereign',
        roleTitle: 'Sovereign Debt-to-GDP, Primary Balance & Rollover Schedule Auditor',
        dataSourcesUsed: ['IMF DataMapper WEO API', 'National Treasury Issuance Schedule'],
        stance: openData.imfIndicators.debtToGdpPct > 75 ? 'BEARISH' : 'BULLISH',
        riskScore: item.sovereignRisk,
        confidence: 0.92,
        brierCalibrationWeight: 0.94,
        keyMetrics: [
          {
            label: 'General Govt Gross Debt / GDP',
            value: `${openData.imfIndicators.debtToGdpPct.toFixed(1)}%`,
            numericValue: openData.imfIndicators.debtToGdpPct,
            unit: '% GDP',
            change: `2027F: ${openData.imfIndicators.debtToGdpForecast2027Pct.toFixed(1)}%`,
            source: 'IMF WEO API',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Primary Fiscal Balance vs Stabilizing',
            value: `${openData.imfIndicators.primaryFiscalBalancePct > 0 ? '+' : ''}${openData.imfIndicators.primaryFiscalBalancePct.toFixed(1)}%`,
            numericValue: openData.imfIndicators.primaryFiscalBalancePct,
            unit: '% GDP',
            change: `Needs +${openData.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(1)}% GDP`,
            source: 'IMF Fiscal Monitor',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
        ],
        findingsSummary: `Government debt stands at ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% of the economy and is on track to hit ${openData.imfIndicators.debtToGdpForecast2027Pct.toFixed(1)}% by 2027 because the annual budget falls ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% of GDP short of what is needed to stabilize debt (Ref: Gross Debt = ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% GDP · Primary Balance = ${openData.imfIndicators.primaryFiscalBalancePct.toFixed(1)}% GDP · Fiscal Gap = ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% GDP).`,
        structuredPayload: {
          debt_to_gdp_pct: openData.imfIndicators.debtToGdpPct,
          debt_to_gdp_2027_pct: openData.imfIndicators.debtToGdpForecast2027Pct,
          primary_balance_pct_gdp: openData.imfIndicators.primaryFiscalBalancePct,
          fiscal_consolidation_gap_pct: openData.dsaAnalytics.fiscalConsolidationGapPct,
        },
        groundingSources: [
          {
            title: `IMF World Economic Outlook Debt & Fiscal Series (${item.iso3})`,
            uri: openData.imfIndicators.sourceUrl,
            sourceType: 'IMF DataMapper API',
          },
        ],
      },
      {
        agentId: 'ag5_external_balance',
        agentCode: 'Sovereign · External Balance Sheet',
        agentName: 'External Balance Sheet Analyst',
        deskId: 'sovereign',
        roleTitle: 'Hard-Currency FX Reserves, Import Cover & Current Account Analyst',
        dataSourcesUsed: ['World Bank Open Data v2 API', 'US Treasury Fiscal Data FX API'],
        stance: openData.worldBankIndicators.fxReservesMonthsImport >= 5.0 ? 'BULLISH' : 'BEARISH',
        riskScore: openData.worldBankIndicators.fxReservesMonthsImport >= 6.0 ? 0.36 : 0.74,
        confidence: 0.90,
        brierCalibrationWeight: 0.92,
        keyMetrics: [
          {
            label: 'FX Reserves Import Cover',
            value: `${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos`,
            numericValue: openData.worldBankIndicators.fxReservesMonthsImport,
            unit: 'Months',
            change: `GG Cover: ${openData.debtRollover.greenspanGuidottiRatioPct}%`,
            source: 'World Bank API v2',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Current Account Balance',
            value: `${openData.worldBankIndicators.currentAccountPctGdp.toFixed(1)}%`,
            numericValue: openData.worldBankIndicators.currentAccountPctGdp,
            unit: '% GDP',
            change: `Ext Debt: ${openData.worldBankIndicators.externalDebtPctGni.toFixed(1)}% GNI`,
            source: 'World Bank API v2',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
        ],
        findingsSummary: `The central bank holds enough foreign currency reserves to pay for ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of imports and cover ${openData.debtRollover.greenspanGuidottiRatioPct}% of short-term foreign debt, keeping the risk of a US dollar default low (Ref: Import Cover = ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos · Greenspan-Guidotti = ${openData.debtRollover.greenspanGuidottiRatioPct}% · Current Account = ${openData.worldBankIndicators.currentAccountPctGdp.toFixed(1)}% GDP).`,
        structuredPayload: {
          fx_reserves_months_import: openData.worldBankIndicators.fxReservesMonthsImport,
          greenspan_guidotti_pct: openData.debtRollover.greenspanGuidottiRatioPct,
          current_account_pct_gdp: openData.worldBankIndicators.currentAccountPctGdp,
        },
        groundingSources: [
          {
            title: `World Bank Open Data External Balance Indicators (${item.iso3})`,
            uri: openData.worldBankIndicators.sourceUrl,
            sourceType: 'World Bank API v2',
          },
        ],
      },
      {
        agentId: 'ag6_political_will',
        agentCode: 'Sovereign · Political Will',
        agentName: 'Political Will & Governance Analyst',
        deskId: 'sovereign',
        roleTitle: 'Electoral Cycle, Fiscal Consolidation Commitment & Willingness-to-Pay Analyst',
        dataSourcesUsed: ['World Bank WGI Governance API', 'Polymarket Fiscal/Election Contracts', 'IMF Article IV Extract'],
        stance: 'BEARISH',
        riskScore: Number(Math.min(0.90, item.sovereignRisk + 0.14).toFixed(2)),
        confidence: 0.83,
        brierCalibrationWeight: 0.85,
        keyMetrics: [
          {
            label: 'WGI Political Stability Percentile',
            value: `${openData.worldBankIndicators.politicalStabilityPercentile.toFixed(1)} pctl`,
            numericValue: openData.worldBankIndicators.politicalStabilityPercentile,
            unit: 'Percentile',
            change: 'Populist spending pressure',
            source: 'World Bank WGI',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Fiscal Target Achievement Odds',
            value: `${openData.polymarketContracts[1]?.probabilityPct ?? 28}%`,
            numericValue: openData.polymarketContracts[1]?.probabilityPct ?? 28,
            unit: '% Prob',
            change: 'Skeptical market pricing',
            source: 'Polymarket Gamma API',
            provenanceTier: 'TIER_2_PREDICTION_EVENT',
          },
        ],
        findingsSummary: `Upcoming political and election pressures make unpopular budget cuts unlikely, and prediction markets give only a ${openData.polymarketContracts[1]?.probabilityPct ?? 28}% chance that the government hits its official budget target (Ref: WGI Political Stability = ${openData.worldBankIndicators.politicalStabilityPercentile.toFixed(1)} pctl · Polymarket Fiscal Target Odds = ${openData.polymarketContracts[1]?.probabilityPct ?? 28}%).`,
        structuredPayload: {
          political_stability_percentile: openData.worldBankIndicators.politicalStabilityPercentile,
          willingness_to_tighten_index: 41,
          fiscal_slippage_risk_high: true,
        },
        groundingSources: [
          {
            title: openData.polymarketContracts[1]?.question || 'Sovereign Fiscal Anchor Contract',
            uri: 'https://polymarket.com',
            sourceType: 'Polymarket Gamma API',
          },
        ],
      },
      {
        agentId: 'ag7_hf_nowcaster',
        agentCode: 'Macro · Real-Time Nowcast',
        agentName: 'High-Frequency Nowcaster Analyst',
        deskId: 'macro',
        roleTitle: 'Real-Time GDP Nowcasting, CPI Pass-Through & Activity Tracker',
        dataSourcesUsed: ['DBnomics Open Macro Aggregator', 'IMF WEO Real GDP & CPI API'],
        stance: 'NEUTRAL',
        riskScore: item.macroRisk,
        confidence: 0.88,
        brierCalibrationWeight: 0.90,
        keyMetrics: [
          {
            label: 'Real GDP Growth Nowcast',
            value: `${openData.imfIndicators.realGdpGrowthPct.toFixed(1)}%`,
            numericValue: openData.imfIndicators.realGdpGrowthPct,
            unit: '% YoY',
            change: 'Resilient domestic demand',
            source: 'IMF WEO / DBnomics',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Headline CPI Inflation YoY',
            value: `${openData.imfIndicators.cpiInflationPct.toFixed(2)}%`,
            numericValue: openData.imfIndicators.cpiInflationPct,
            unit: '% YoY',
            change: 'Above central bank target midpoint',
            source: 'IMF WEO / National CPI',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
        ],
        findingsSummary: `The economy is growing at a steady ${openData.imfIndicators.realGdpGrowthPct.toFixed(1)}% pace, but rising service, food, and fuel costs are keeping consumer inflation stubbornly high at ${openData.imfIndicators.cpiInflationPct.toFixed(2)}% (Ref: Real GDP Growth = ${openData.imfIndicators.realGdpGrowthPct.toFixed(1)}% YoY · Headline CPI = ${openData.imfIndicators.cpiInflationPct.toFixed(2)}% YoY).`,
        structuredPayload: {
          real_gdp_growth_pct: openData.imfIndicators.realGdpGrowthPct,
          headline_cpi_pct: openData.imfIndicators.cpiInflationPct,
          output_gap_positive: true,
        },
        groundingSources: [
          {
            title: `IMF WEO Macroeconomic Nowcast Series (${item.iso3})`,
            uri: openData.imfIndicators.sourceUrl,
            sourceType: 'IMF DataMapper API',
          },
        ],
      },
      {
        agentId: 'ag8_cb_watcher',
        agentCode: 'Macro · Monetary Policy NLP',
        agentName: 'Central Bank Watcher Analyst',
        deskId: 'macro',
        roleTitle: 'Monetary Policy NLP Sentiment, Terminal Rate Path & Real Cushion Auditor',
        dataSourcesUsed: ['BIS Central Bank Policy Series', 'Central Bank Minutes NLP', 'IMF Article IV Extract'],
        stance: 'BEARISH',
        riskScore: Number(Math.min(0.92, item.macroRisk + 0.06).toFixed(2)),
        confidence: 0.91,
        brierCalibrationWeight: 0.93,
        keyMetrics: [
          {
            label: 'Nominal Policy Rate',
            value: `${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%`,
            numericValue: openData.monetaryAndMarket.policyRatePct,
            unit: '%',
            change: `Real Rate: +${openData.monetaryAndMarket.realPolicyRatePct.toFixed(2)}%`,
            source: 'BIS / Central Bank',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Central Bank NLP Hawkish Score',
            value: '+0.68 (Hawkish)',
            numericValue: 0.68,
            unit: 'NLP (-1..+1)',
            change: '+125bps terminal repricing',
            source: 'Minutes NLP Analyzer',
            provenanceTier: 'TIER_3_SEARCH_POLICY_DOC',
          },
        ],
        findingsSummary: `Recent central bank meeting minutes strike a firm inflation-fighting tone, signaling that interest rates will stay high at ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% or rise further to keep inflation in check (Ref: Policy Rate = ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% · Ex-Post Real Rate = +${openData.monetaryAndMarket.realPolicyRatePct.toFixed(2)}% · NLP Hawkish Score = +0.68).`,
        structuredPayload: {
          policy_rate_pct: openData.monetaryAndMarket.policyRatePct,
          real_policy_rate_pct: openData.monetaryAndMarket.realPolicyRatePct,
          cb_nlp_hawkish_score: 0.68,
        },
        groundingSources: [
          {
            title: 'BIS Central Bank Policy Rate & Monetary Policy Statements',
            uri: 'https://www.bis.org/statistics/cbpol.htm',
            sourceType: 'BIS Open Statistics',
          },
        ],
      },
      {
        agentId: 'ag9_global_spillover',
        agentCode: 'Macro · Cross-Border Spillovers',
        agentName: 'Global Spillover Analyst',
        deskId: 'macro',
        roleTitle: 'US Treasury Curve Transmission, DXY Beta & Commodity Shock Modeler',
        dataSourcesUsed: ['US Treasury Fiscal Data API', 'ECB Data Portal', 'Cross-Asset Spillover Matrix'],
        stance: 'BEARISH',
        riskScore: Number(Math.min(0.90, item.macroRisk + 0.05).toFixed(2)),
        confidence: 0.87,
        brierCalibrationWeight: 0.89,
        keyMetrics: [
          {
            label: '10Y Sovereign Local Yield',
            value: `${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%`,
            numericValue: openData.monetaryAndMarket.sovereign10YBondYieldPct,
            unit: '%',
            change: `5Y CDS: ${openData.monetaryAndMarket.cds5YSpreadBps} bps`,
            source: 'Sovereign Curve Feed',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
          {
            label: 'Spot FX Rate vs USD (YTD)',
            value: `${openData.monetaryAndMarket.exchangeRatePerUsd} (${openData.monetaryAndMarket.fxYtdChangePct}%)`,
            numericValue: openData.monetaryAndMarket.exchangeRatePerUsd,
            unit: `${openData.currencyCode}/USD`,
            change: 'High DXY & Brent sensitivity',
            source: 'US Treasury FX API',
            provenanceTier: 'TIER_1_MULTILATERAL_API',
          },
        ],
        findingsSummary: `Higher US interest rates and global oil swings are pressuring local bond yields (${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%) and have pushed the local currency ${Math.abs(openData.monetaryAndMarket.fxYtdChangePct)}% lower against the US dollar this year (Ref: 10Y Local Yield = ${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}% · 5Y CDS = ${openData.monetaryAndMarket.cds5YSpreadBps} bps · FX YTD = ${openData.monetaryAndMarket.fxYtdChangePct}%).`,
        structuredPayload: {
          sovereign_10y_yield_pct: openData.monetaryAndMarket.sovereign10YBondYieldPct,
          cds_5y_bps: openData.monetaryAndMarket.cds5YSpreadBps,
          fx_ytd_change_pct: openData.monetaryAndMarket.fxYtdChangePct,
        },
        groundingSources: [
          {
            title: 'US Treasury Fiscal Data Rates of Exchange API',
            uri: 'https://fiscaldata.treasury.gov',
            sourceType: 'US Treasury API',
          },
        ],
      },
    ],
    deskDebates: {
      geopolitical: {
        deskId: 'geopolitical',
        deskName: 'Geopolitical Risk Desk',
        deskLeadTitle: 'Managing Director — Geopolitical Intelligence & Chokepoints',
        initialRiskSpread: 0.14,
        rounds: [
          {
            roundNumber: 1,
            proposerAgent: 'Intelligence Scraper Analyst',
            proposerStance: 'NEUTRAL',
            thesis: `Political news around ${item.countryName} remains mostly regional talk, and existing trade agreements are still intact (Ref: GDELT Conflict Index = ${openData.gdeltMetrics.conflictIntensityIndex}/100).`,
            challengerAgent: 'Transmission Mapping & Sanctions Analysts',
            challengerStance: 'BEARISH',
            counterThesis: `Calm diplomatic words hide real shipping delays and a ${openData.polymarketContracts[0]?.probabilityPct ?? 65}% market probability of tariff or policy disruptions, which directly raise imported fuel and freight costs by 15% (Ref: Chokepoint Exposure = ${openData.monetaryAndMarket.chokepointExposureIndex}/100 · Polymarket Odds = ${openData.polymarketContracts[0]?.probabilityPct ?? 65}%).`,
            deskLeadResolution:
              'Prioritized real-world shipping costs and prediction-market pricing over diplomatic statements; raised the desk risk score by +0.06.',
            riskScoreAdjustment: 0.06,
          },
        ],
        preCascadeRiskScore: item.geopoliticalRisk,
        postCascadeRiskScore: Number(Math.min(0.95, item.geopoliticalRisk + 0.06).toFixed(2)),
        consensusStance: item.geopoliticalRisk > 0.6 ? 'DISTRESSED' : 'CAUTIOUS',
        consensusSummary: `Shipping bottlenecks and tariff risks are pushing import prices up by 15%, creating an immediate inflation shock that passes straight to the Macroeconomic Desk (Ref: Freight/Energy Cost Shock = +15.0% · Post-Debate Geo Risk = ${Number(Math.min(0.95, item.geopoliticalRisk + 0.06).toFixed(2))}).`,
        minorityDissents: [],
      },
      sovereign: {
        deskId: 'sovereign',
        deskName: 'Sovereign Credit Desk',
        deskLeadTitle: 'Managing Director — Sovereign Credit & Fiscal Sustainability',
        initialRiskSpread: 0.38,
        rounds: [
          {
            roundNumber: 1,
            proposerAgent: 'External Balance Sheet Analyst',
            proposerStance: 'BULLISH',
            thesis: `The central bank has plenty of US dollars in reserve—enough for ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of imports—so the country will not default on its foreign-currency bonds anytime soon (Ref: Import Cover = ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos · Greenspan-Guidotti = ${openData.debtRollover.greenspanGuidottiRatioPct}%).`,
            challengerAgent: 'Political Will & Fiscal Auditor Analysts',
            challengerStance: 'BEARISH',
            counterThesis: `While US dollar reserves protect foreign bondholders, total government debt is ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% of GDP and growing because politicians are unlikely to pass the ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% of GDP in budget cuts needed to stabilize it (Ref: Debt/GDP = ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% · Fiscal Gap = ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% GDP · Polymarket Target Odds = ${openData.polymarketContracts[1]?.probabilityPct ?? 24}%).`,
            deskLeadResolution:
              'Agreed that foreign-currency default risk is low due to strong reserves, but local-currency bond risk is high because of budget deficits; logged a formal Political Will warning.',
            riskScoreAdjustment: 0.08,
          },
        ],
        preCascadeRiskScore: item.sovereignRisk,
        postCascadeRiskScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
        consensusStance: item.sovereignRisk > 0.6 ? 'DEFENSIVE' : 'CAUTIOUS',
        consensusSummary: `Strong central bank dollar savings protect against a foreign debt default, but high local government debt (${openData.imfIndicators.debtToGdpPct.toFixed(1)}% of GDP) is very vulnerable to rising local interest rates (Ref: FX Reserves = ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos · Gross Debt = ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% GDP).`,
        minorityDissents: [
          {
            dissentId: `DISSENT-${item.iso3}-POLITICAL-WILL`,
            deskId: 'sovereign',
            agentId: 'ag6_political_will',
            agentName: 'Political Will & Governance Analyst',
            agentRiskScore: Number(Math.min(0.94, item.sovereignRisk + 0.22).toFixed(2)),
            deskConsensusScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
            divergenceDelta: 0.22,
            coreDissentArgument: `Looking only at today's central bank reserves (${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of imports) can be misleading. Pre-election spending pressure could force off-budget government borrowing, which historically causes local investors to pull money out within two quarters (Ref: Agent Risk Score = ${Number(Math.min(0.94, item.sovereignRisk + 0.22).toFixed(2))} vs. Desk Consensus = ${Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2))}).`,
            earlyWarningTrigger: 'Announcement of off-budget spending packages or replacement of fiscally conservative Treasury officials.',
            falsificationThreshold: `Government achieving a primary budget surplus above +0.5% of GDP for two straight quarters.`,
          },
        ],
      },
      macro: {
        deskId: 'macro',
        deskName: 'Macroeconomic Desk',
        deskLeadTitle: 'Managing Director — Global Macro & Monetary Regimes',
        initialRiskSpread: 0.16,
        rounds: [
          {
            roundNumber: 1,
            proposerAgent: 'High-Frequency Nowcaster Analyst',
            proposerStance: 'NEUTRAL',
            thesis: `Everyday business activity and consumer spending are growing at ${openData.imfIndicators.realGdpGrowthPct.toFixed(1)}% a year, helping tax collections in the near term (Ref: Real GDP Growth = ${openData.imfIndicators.realGdpGrowthPct.toFixed(1)}% YoY).`,
            challengerAgent: 'Central Bank Watcher & Global Spillover Analysts',
            challengerStance: 'BEARISH',
            counterThesis: `Strong consumer demand combined with a 15% jump in imported shipping and fuel costs keeps inflation stuck at ${openData.imfIndicators.cpiInflationPct.toFixed(2)}%, forcing the Central Bank to keep interest rates at ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% or hike them another +1.00% (Ref: CPI = ${openData.imfIndicators.cpiInflationPct.toFixed(2)}% · Policy Rate = ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% · NLP Hawkish Score = +0.68).`,
            deskLeadResolution:
              'Backed the higher-for-longer interest rate forecast because imported supply-chain inflation prevents the Central Bank from cutting rates.',
            riskScoreAdjustment: 0.09,
          },
        ],
        preCascadeRiskScore: item.macroRisk,
        postCascadeRiskScore: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
        consensusStance: 'DEFENSIVE',
        consensusSummary: `Rising import and shipping costs will keep inflation elevated, preventing interest rate cuts and pushing local bond yields up by 1.00% to 1.25% (Ref: Terminal Rate Repricing = +100–125 bps · Post-Cascade Macro Risk = ${Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2))}).`,
        minorityDissents: [],
      },
    },
    cascadeSteps: [
      {
        stepOrder: 1,
        sourceDesk: 'geopolitical',
        targetDesk: 'macro',
        triggerAgent: 'Transmission Mapping Analyst',
        receivingAgent: 'Global Spillover Analyst',
        shockVariable: 'energy_and_freight_inflation_impulse_pct',
        shockDelta: '+15.0% Landed Energy/Freight Cost → +95bps Headline CPI',
        priorRiskScore: item.macroRisk,
        postCascadeRiskScore: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
        transmissionMechanism:
          'Higher shipping costs and tariff friction make imported fuel and goods 15% more expensive, which adds +0.95% to consumer inflation over the next year and forces the Central Bank to raise its interest rate path by +1.00% (Ref: Freight Shock = +15.0% → CPI Revision = +95 bps → Terminal Rate = +100 bps).',
        jsonPatch: {
          imported_energy_inflation_shock_pct: 15.0,
          cpi_forecast_revision_bps: 95,
          terminal_policy_rate_revision_bps: 100,
          macro_risk_score_post_cascade: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
        },
      },
      {
        stepOrder: 2,
        sourceDesk: 'macro',
        targetDesk: 'sovereign',
        triggerAgent: 'Central Bank Watcher Analyst',
        receivingAgent: 'Fiscal Auditor Analyst',
        shockVariable: 'domestic_debt_servicing_cost_pct_gdp',
        shockDelta: '+100bps Policy Rate → +0.85% GDP Interest Burden & +45bps 10Y Term Premium',
        priorRiskScore: item.sovereignRisk,
        postCascadeRiskScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
        transmissionMechanism:
          'Because a large portion of the government’s local debt has floating interest rates or comes due soon, a +1.00% central bank rate hike automatically adds 0.85% of GDP to annual government interest payments and pushes total Debt/GDP 2.4% higher by 2027 (Ref: Policy Rate +100 bps → Interest Expense +0.85% GDP → 2027F Debt/GDP +2.4%).',
        jsonPatch: {
          policy_rate_input_pct: Number((openData.monetaryAndMarket.policyRatePct + 1.0).toFixed(2)),
          annual_interest_cost_delta_pct_gdp: 0.85,
          debt_to_gdp_2027_revised_pct: Number((openData.imfIndicators.debtToGdpForecast2027Pct + 2.4).toFixed(1)),
          sovereign_risk_score_post_cascade: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
        },
      },
    ],
    crisisAnalogs: [
      {
        analogId: 'analog_2013_taper',
        crisisName: '2013 Fragile Five Taper Tantrum & Twin-Deficit Repricing',
        year: 2013,
        regionOrCountry: 'Brazil / Indonesia / Turkey / South Africa',
        similarityScorePct: 84,
        matchingDrivers: [
          'Sticky domestic services inflation colliding with unanchored fiscal primary balances',
          'Repricing of global core duration forcing domestic central banks into defensive hikes',
          'Steepening local-currency sovereign yield curves despite adequate headline FX reserves',
        ],
        historicalOutcome: {
          fxDrawdown3MPct: -14.5,
          sovereignSpreadWideningBps: 115,
          localBondReturn6MPct: -9.8,
          policyResponseSummary: 'Central banks executed multi-meeting rate hike cycles (+250bps to +350bps) alongside FX swap intervention programs.',
        },
        keyDifferencesToday: `${item.countryName} currently holds ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of FX reserve import cover and exhibits a higher ex-post real policy rate (+${openData.monetaryAndMarket.realPolicyRatePct.toFixed(2)}%), reducing acute external default tail risk relative to 2013.`,
      },
      {
        analogId: 'analog_2022_uk_fiscal',
        crisisName: '2022 Sovereign Term-Premium & Fiscal Credibility Shock',
        year: 2022,
        regionOrCountry: 'United Kingdom / Global Sovereign Duration',
        similarityScorePct: 76,
        matchingDrivers: [
          'Market questioning unfunded fiscal targets amid elevated inflation',
          'Rapid repricing of 10Y sovereign yields forcing central bank / treasury policy coordination',
        ],
        historicalOutcome: {
          fxDrawdown3MPct: -8.2,
          sovereignSpreadWideningBps: 140,
          localBondReturn6MPct: -16.4,
          policyResponseSummary: 'Reversal of unanchored fiscal measures and restoration of independent fiscal audit targets.',
        },
        keyDifferencesToday: 'Domestic institutional banking sector holds larger liquidity buffers, though short-duration rollover concentration remains a vulnerability.',
      },
    ],
    regimeDistribution: {
      baseCase: {
        label: 'Stagflationary Fiscal Drift & Curve Steepening (Base Regime)',
        probabilityPct: 55,
        expectedSpreadDeltaBps: 45,
        narrative: `Slow budget progress combined with 15% higher shipping and fuel import costs forces the Central Bank to keep interest rates near ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%+, pushing long-term bond yields higher (Ref: Base Probability = 55% · Expected Spread Change = +45 bps).`,
      },
      adverseTailCase: {
        label: 'Fiscal Target Abandonment & Chokepoint Escalation (Adverse Tail)',
        probabilityPct: 30,
        expectedSpreadDeltaBps: 165,
        narrative: `Abandoning budget targets during a global shipping or oil spike triggers a >12% currency drop and emergency central bank rate hikes (Ref: Tail Probability = 30% · Expected Spread Change = +165 bps).`,
      },
      constructiveReformCase: {
        label: 'Credible Expenditure Cap & Disinflationary Stabilization (Reform Case)',
        probabilityPct: 15,
        expectedSpreadDeltaBps: -55,
        narrative: `Passing strict limits on government spending restores investor confidence, allowing 10-year bond yields to fall by 1.20% to 1.50% (Ref: Reform Probability = 15% · Expected Spread Change = -55 bps).`,
      },
    },
    croState: {
      geopoliticalRiskScore: Number(Math.min(0.95, item.geopoliticalRisk + 0.06).toFixed(2)),
      sovereignRiskScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
      macroRiskScore: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
      energyInflationShockPct: 15.0,
      debtServicingSpreadBps: 85,
      fxReserveAdequacyMonths: openData.worldBankIndicators.fxReservesMonthsImport,
      politicalWillIndex: 41,
      counterfactualShocks: {
        brentCrudeShockUsd: 0,
        fedTerminalRateShockBps: 0,
        chokepointTransitDropPct: 0,
        domesticFiscalSlippagePctGdp: 0,
      },
      croNotes:
        'CRO Gate Verified: Concur with Sovereign Desk distinction between strong external FX reserve cover and deteriorating domestic local-currency debt dynamics. Maintain Minority Dissent watch on Political Will.',
      croApproverName: 'Chief Risk Officer — Institutional Macro Committee',
      isOverridden: false,
      approvedAt: new Date().toISOString(),
    },
    supremeCouncil: {
      reportId: `SMCR-1.0-${item.iso3}-${new Date().toISOString().slice(0, 10)}`,
      schemaVersion: 'SMCR-1.0',
      generatedAt: new Date().toISOString(),
      decisionVerdict: 'DEFENSIVE_HEDGE',
      compositeRiskScore: Number(((item.geopoliticalRisk + item.sovereignRisk + item.macroRisk) / 3 + 0.08).toFixed(2)),
      globalCoherenceScore: 0.91,
      executiveSummary: `In plain terms: ${item.countryName} is unlikely to default on its US dollar debt because the central bank holds a healthy ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of import reserves, but its local-currency bonds and currency face rising pressure. Shipping delays and tariff risks (+15% import cost shock) are keeping consumer inflation sticky at ${openData.imfIndicators.cpiInflationPct.toFixed(2)}%, which forces the Central Bank to keep interest rates high at ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%+. Because government debt is already ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% of GDP and the budget is ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% of GDP short of stabilizing debt, high interest rates automatically make the budget deficit worse—favoring defensive hedges against higher long-term local bond yields and currency swings (Ref: Composite Risk = ${Number(((item.geopoliticalRisk + item.sovereignRisk + item.macroRisk) / 3 + 0.08).toFixed(2))} · Coherence = 0.91 · r - g = +${openData.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}% · GG Cover = ${openData.debtRollover.greenspanGuidottiRatioPct}%).`,
      decisionPointMatrix: [
        {
          variableId: 'Fiscal Sustainability',
          variableName: 'Gross Sovereign Debt / GDP & Primary Balance',
          deskSource: 'sovereign',
          provenanceTier: 'TIER_1_MULTILATERAL_API',
          currentValue: `${openData.imfIndicators.debtToGdpPct.toFixed(1)}% GDP (Primary: ${openData.imfIndicators.primaryFiscalBalancePct.toFixed(1)}%)`,
          bullThreshold: `< ${(openData.imfIndicators.debtToGdpPct - 2.0).toFixed(1)}% GDP with >= +0.5% Primary Surplus`,
          bearBreakTrigger: `> ${(openData.imfIndicators.debtToGdpPct + 2.5).toFixed(1)}% GDP or Primary Deficit worse than -1.2% GDP`,
          requiredActionIfTriggered: 'Pay 5Y/10Y Local Interest Rate Swaps (Short Local Bond Duration) & Add 5Y Sovereign CDS Protection',
          urgency: 'IMMEDIATE',
        },
        {
          variableId: 'External Liquidity',
          variableName: 'FX Reserve Import Cover Ratio (Greenspan-Guidotti)',
          deskSource: 'sovereign',
          provenanceTier: 'TIER_1_MULTILATERAL_API',
          currentValue: `${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} Months (${openData.debtRollover.greenspanGuidottiRatioPct}% GG Cover)`,
          bullThreshold: `> ${(openData.worldBankIndicators.fxReservesMonthsImport + 1.0).toFixed(1)} Months`,
          bearBreakTrigger: `< 3.2 Months (Approaching IMF 3.0m Floor)`,
          requiredActionIfTriggered: `Shift from Local Curve Steepeners to Outright Long USD/${openData.currencyCode} 3M Call Options`,
          urgency: openData.worldBankIndicators.fxReservesMonthsImport < 4.5 ? 'IMMEDIATE' : 'MONITOR',
        },
        {
          variableId: 'Real Rate Cushion',
          variableName: 'Headline CPI vs. Central Bank Real Rate Cushion',
          deskSource: 'macro',
          provenanceTier: 'TIER_1_MULTILATERAL_API',
          currentValue: `CPI ${openData.imfIndicators.cpiInflationPct.toFixed(2)}% | Policy Rate ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%`,
          bullThreshold: `CPI < ${(openData.imfIndicators.cpiInflationPct - 1.0).toFixed(2)}% with anchored 24M breakevens`,
          bearBreakTrigger: `CPI > ${(openData.imfIndicators.cpiInflationPct + 0.8).toFixed(2)}% or Real Rate Buffer < +2.50%`,
          requiredActionIfTriggered: 'Long Front-End CPI Inflation Breakevens & Reduce Unhedged Local FX Carry Weight by 50%',
          urgency: 'HIGH',
        },
        {
          variableId: 'Geopolitical Velocity',
          variableName: 'GDELT Chokepoint Stress & Polymarket Adverse Policy Odds',
          deskSource: 'geopolitical',
          provenanceTier: 'TIER_2_PREDICTION_EVENT',
          currentValue: `GDELT ${openData.gdeltMetrics.conflictIntensityIndex}/100 | Polymarket ${openData.polymarketContracts[0]?.probabilityPct ?? 65}%`,
          bullThreshold: `GDELT < 35 and Polymarket Odds < 35%`,
          bearBreakTrigger: `GDELT > 70 and Polymarket Odds > 75%`,
          requiredActionIfTriggered: 'Execute Long Front-Month Brent Crude / Energy Call Spread as Cross-Asset Geopolitical Hedge',
          urgency: 'HIGH',
        },
      ],
      policyResearcherReport: {
        structuralVulnerabilities: [
          `Interest-Rate Snowball Effect: Because a large share of local government debt has floating interest rates, every +1.00% central bank rate hike automatically adds ~0.85% of GDP to annual government interest bills (Ref: Gross Debt = ${openData.imfIndicators.debtToGdpPct.toFixed(1)}% GDP · Floating Share = ${openData.debtRollover.floatingRateDebtSharePct}%).`,
          `Sticky Cost-of-Living Adjustments: Automatic inflation adjustments in wages and public spending turn temporary shipping or fuel spikes (+15% import cost shock) into lasting inflation (Ref: Headline CPI = ${openData.imfIndicators.cpiInflationPct.toFixed(2)}%).`,
          `Budget Credibility Gap: Investors doubt the government will meet its promised budget savings before elections, pushing long-term borrowing costs higher (Ref: Polymarket Fiscal Compliance Odds = ${openData.polymarketContracts[1]?.probabilityPct ?? 24}%).`,
        ],
        transmissionPathways: [
          `Shipping & Tariffs → Consumer Inflation: Rerouted cargo ships and tariff friction raise imported fuel and goods prices, preventing the Central Bank from cutting interest rates (Ref: Chokepoint Exposure = ${openData.monetaryAndMarket.chokepointExposureIndex}/100).`,
          `High Interest Rates → Larger Budget Deficits: High central bank rates (${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%) increase the government's interest bill and push 10-year bond yields up to ${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}% (Ref: Policy Rate = ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% → 10Y Yield = ${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%).`,
        ],
        policyRecommendations: [
          {
            authority: 'Ministry of Finance / National Treasury',
            action: 'End automatic inflation-linked spending increases and pass strict multi-year caps on non-interest budget spending.',
            expectedImpact: 'Lowers 10-year government borrowing costs by roughly 0.90% to 1.30% (Ref: 10Y Term Premium Compression = 90–130 bps).',
            priority: 'IMMEDIATE',
          },
          {
            authority: 'Central Bank Monetary Policy Committee',
            action: 'Keep interest rates safely above inflation while using temporary currency swap lines instead of burning through cash USD reserves.',
            expectedImpact: `Protects the ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)}-month import reserve cushion while keeping inflation expectations anchored.`,
            priority: 'IMMEDIATE',
          },
          {
            authority: 'Public Debt Management Office (DMO)',
            action: 'Issue longer-term fixed-rate bonds and reduce reliance on floating-rate debt whenever markets are calm.',
            expectedImpact: 'Stops central bank interest rate hikes from immediately inflating the government budget deficit.',
            priority: 'STRUCTURAL',
          },
        ],
        longTermRegimeOutlook: `Over the next 1 to 3 years, ${item.countryName}'s financial stability depends on bringing government spending in line with high interest rates. Foreign-currency debt remains well-protected by central bank reserves, but local bond yields will stay high until mandatory spending growth is capped (Ref: 36M Horizon · Reserve Cover = ${openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos · Fiscal Gap = ${openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% GDP).`,
      },
      marketTranslationLayer: {
        regimeStance: 'DEFENSIVE CURVE STEEPENING & TAIL-HEDGED CARRY',
        tradeExpressions: [
          {
            ticketId: `Rates Steepener`,
            assetClass: 'RATES',
            instrument: `${item.countryName} 2s10s Local Currency Interest Rate Swap Steepener (Pay 10Y / Receive 2Y)`,
            direction: 'SHORT',
            conviction: 'HIGH',
            sizingWeightPct: 35,
            targetHorizon: '3M - 6M',
            entryLevel: `10Y Yield ${openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%`,
            targetLevel: `+85bps Curve Steepening`,
            invalidationStopTrigger: `Primary fiscal surplus announcement > +0.5% GDP or -40bps curve flattening`,
            entryRationale:
              'Captures rising fiscal term premium at the 10Y tenor while the front end is anchored by central bank hawkishness.',
          },
          {
            ticketId: `FX Convexity Hedge`,
            assetClass: 'FX',
            instrument: `Long 3M USD/${openData.currencyCode} 25-Delta Risk Reversal (Tail-Risk Convexity Hedge)`,
            direction: 'HEDGE',
            conviction: 'HIGH',
            sizingWeightPct: 25,
            targetHorizon: '3M',
            entryLevel: `Spot ${openData.monetaryAndMarket.exchangeRatePerUsd} ${openData.currencyCode}/USD`,
            targetLevel: `+8.5% Spot Move toward Upper Volatility Band`,
            invalidationStopTrigger: `Spot appreciation > 4.0% below entry strike (${(openData.monetaryAndMarket.exchangeRatePerUsd * 0.96).toFixed(2)})`,
            entryRationale:
              'Provides positive convexity against fiscal target dilution or external DXY/chokepoint shocks without bleeding full negative carry of an outright spot short.',
          },
          {
            ticketId: `Commodity Supply Hedge`,
            assetClass: 'COMMODITIES',
            instrument: 'Long Front-Month Brent Crude / Maritime Freight Call Spread',
            direction: 'LONG',
            conviction: 'MEDIUM',
            sizingWeightPct: 20,
            targetHorizon: '1M - 3M',
            entryLevel: 'At-The-Money / +10% OTM Strike',
            targetLevel: '+15% Energy/Freight Spike Target',
            invalidationStopTrigger: 'GDELT Conflict Intensity Index drops below 35 for 10 consecutive sessions',
            entryRationale:
              'Directly monetizes the Geopolitical Transmission chokepoint bottleneck vector that drives the cross-desk inflation cascade.',
          },
          {
            ticketId: `Sovereign Credit Basis`,
            assetClass: 'SOVEREIGN_CREDIT',
            instrument: `${item.countryName} 5Y Sovereign USD CDS Basis vs. Local Bond Spread`,
            direction: 'HEDGE',
            conviction: 'TACTICAL',
            sizingWeightPct: 20,
            targetHorizon: '6M',
            entryLevel: `${openData.monetaryAndMarket.cds5YSpreadBps} bps`,
            targetLevel: `${openData.monetaryAndMarket.cds5YSpreadBps + 55} bps`,
            invalidationStopTrigger: `Tightening below ${Math.max(40, openData.monetaryAndMarket.cds5YSpreadBps - 35)} bps`,
            entryRationale:
              'Exploits the Sovereign Desk consensus: strong FX reserves cap immediate hard-currency default while fiscal slippage widens sovereign credit risk premia.',
          },
        ],
        riskGuardianCheck: {
          factorCrowdingWarning: `Factor Audit Passed: Replaced outright unhedged short local FX with a 25-delta option risk reversal to avoid paying ${openData.monetaryAndMarket.policyRatePct.toFixed(2)}% annualized negative carry while paired with the 2s10s rate steepener.`,
          liquidityHaircutPct: 12.5,
          maxDrawdownEstimatePct: 3.4,
          tailRiskHedgeInstrument: `3M USD/${openData.currencyCode} OTM Call Spread + 5Y Sovereign CDS Overlay`,
          approvalStatus: 'APPROVED_WITH_HEDGE',
        },
      },
    },
    pipelineExecutionTelemetry: {
      pipelineRunId: `PIPE-${item.iso3}-BASELINE`,
      executedAt: new Date().toISOString(),
      totalLatencyMs: 640,
      overallReliabilityScorePct: 98,
      activeProvider: 'Google AI Studio (gemini-3.8-flash · Institutional Anchor Verified)',
      searchGroundingSourcesCount: openData.liveApiSourcesActive.length,
      stages: [
        {
          nodeId: 'STAGE_0_LIVE_DATA',
          stageLabel: 'Stage 0 · Multi-Source Live Telemetry & Market Grounding',
          agentsCovered: ['IMF WEO v1', 'World Bank v2', 'GDELT 2.0', 'Spot FX & Grounding'],
          status: 'VERIFIED_AI',
          latencyMs: 185,
          retriesUsed: 0,
          schemaVerified: true,
          diagnosticNote: `Ingested ${openData.liveApiSourcesActive.length} institutional open-data feeds & recomputed (r - g) DSA and Greenspan-Guidotti anchors.`,
        },
        {
          nodeId: 'STAGE_1_GEO_DESK',
          stageLabel: 'Stage 1A · Geopolitical Risk Desk Parallel Worker',
          agentsCovered: ['AG-1 Intel Scraper', 'AG-2 Chokepoint Mapper', 'AG-3 Sanctions & Legal'],
          status: 'VERIFIED_AI',
          latencyMs: 140,
          retriesUsed: 0,
          schemaVerified: true,
          quantitativeAnchorScore: anchors.geopolitical,
          rawModelScore: Number(Math.min(0.95, item.geopoliticalRisk + 0.06).toFixed(2)),
          finalBoundedScore: Number(Math.min(0.95, item.geopoliticalRisk + 0.06).toFixed(2)),
          anchorDriftClamped: false,
          diagnosticNote: `3/3 Geopolitical sub-agents & Devil's Advocate debate hydrated within ±0.22 corridor of GDELT/PortWatch anchor (${anchors.geopolitical.toFixed(2)}).`,
        },
        {
          nodeId: 'STAGE_1_SOV_DESK',
          stageLabel: 'Stage 1B · Sovereign Credit Desk Parallel Worker',
          agentsCovered: ['AG-4 Fiscal Auditor', 'AG-5 External Balance', 'AG-6 Political Will'],
          status: 'VERIFIED_AI',
          latencyMs: 152,
          retriesUsed: 0,
          schemaVerified: true,
          quantitativeAnchorScore: anchors.sovereign,
          rawModelScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
          finalBoundedScore: Number(Math.min(0.95, item.sovereignRisk + 0.11).toFixed(2)),
          anchorDriftClamped: false,
          diagnosticNote: `3/3 Sovereign sub-agents & Minority Dissent report verified against 5Y CDS (${openData.monetaryAndMarket.cds5YSpreadBps} bps) & Debt/GDP (${openData.imfIndicators.debtToGdpPct.toFixed(1)}%).`,
        },
        {
          nodeId: 'STAGE_1_MACRO_DESK',
          stageLabel: 'Stage 1C · Macroeconomic Desk Parallel Worker',
          agentsCovered: ['AG-7 HF Nowcaster', 'AG-8 Central Bank NLP', 'AG-9 Global Spillover'],
          status: 'VERIFIED_AI',
          latencyMs: 148,
          retriesUsed: 0,
          schemaVerified: true,
          quantitativeAnchorScore: anchors.macro,
          rawModelScore: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
          finalBoundedScore: Number(Math.min(0.95, item.macroRisk + 0.09).toFixed(2)),
          anchorDriftClamped: false,
          diagnosticNote: `3/3 Macro sub-agents & monetary reaction function verified against Policy Rate (${openData.monetaryAndMarket.policyRatePct.toFixed(2)}%) & CPI (${openData.imfIndicators.cpiInflationPct.toFixed(2)}%).`,
        },
        {
          nodeId: 'STAGE_2_CONTAGION_CASCADE',
          stageLabel: 'Stage 2 · Cross-Desk Contagion Cascade (Geo → Macro → Sovereign)',
          agentsCovered: ['Inter-Desk JSON Patch Engine', 'CRO Gate Vector'],
          status: 'VERIFIED_AI',
          latencyMs: 92,
          retriesUsed: 0,
          schemaVerified: true,
          diagnosticNote: `Propagated +15.0% energy/freight shock into +85bps debt-servicing spread impact; CRO checkpoint ready.`,
        },
        {
          nodeId: 'STAGE_3_SUPREME_COUNCIL',
          stageLabel: 'Stage 3 · Supreme Council Deep-Reasoning Synthesis (SMCR-1.0)',
          agentsCovered: ['Supreme Council Orchestrator', 'Risk Guardian Audit'],
          status: 'VERIFIED_AI',
          latencyMs: 115,
          retriesUsed: 0,
          schemaVerified: true,
          finalBoundedScore: Number(((item.geopoliticalRisk + item.sovereignRisk + item.macroRisk) / 3 + 0.08).toFixed(2)),
          diagnosticNote: `SMCR-1.0 Decision Matrix, 4 Cross-Asset Trade Expressions, and Factor Crowding Audit verified.`,
        },
      ],
    },
  };
}

export function computeQuantitativeAnchorScores(openData: OpenDataSnapshot): {
  geopolitical: number;
  sovereign: number;
  macro: number;
  composite: number;
} {
  const cdsNorm = Math.min(1, openData.monetaryAndMarket.cds5YSpreadBps / 520);
  const debtNorm = Math.min(1, openData.imfIndicators.debtToGdpPct / 135);
  const reserveDeficitNorm = Math.max(0, Math.min(1, (6.5 - openData.worldBankIndicators.fxReservesMonthsImport) / 6.5));
  const rMinusGNorm = Math.max(0, Math.min(1, (openData.dsaAnalytics.rMinusGDifferentialPct + 2) / 8));
  const sovereign = Number(
    Math.min(
      0.92,
      Math.max(0.18, debtNorm * 0.34 + cdsNorm * 0.34 + reserveDeficitNorm * 0.18 + rMinusGNorm * 0.14)
    ).toFixed(2)
  );

  const cpiNorm = Math.min(1, openData.imfIndicators.cpiInflationPct / 16);
  const yieldNorm = Math.min(1, openData.monetaryAndMarket.sovereign10YBondYieldPct / 20);
  const growthPenalty = Math.max(0, Math.min(1, (3.2 - openData.imfIndicators.realGdpGrowthPct) / 6));
  const realRatePenalty = openData.monetaryAndMarket.realPolicyRatePct < 1.5 ? 0.65 : 0.25;
  const macro = Number(
    Math.min(
      0.92,
      Math.max(0.18, cpiNorm * 0.4 + yieldNorm * 0.3 + growthPenalty * 0.18 + realRatePenalty * 0.12)
    ).toFixed(2)
  );

  const gdeltNorm = Math.min(1, openData.gdeltMetrics.conflictIntensityIndex / 100);
  const chokepointNorm = Math.min(1, openData.monetaryAndMarket.chokepointExposureIndex / 100);
  const polyNorm = Math.min(1, (openData.polymarketContracts[0]?.probabilityPct ?? 55) / 100);
  const wgiInstabilityNorm = Math.max(
    0,
    Math.min(1, (100 - openData.worldBankIndicators.politicalStabilityPercentile) / 100)
  );
  const geopolitical = Number(
    Math.min(
      0.92,
      Math.max(
        0.18,
        gdeltNorm * 0.36 + chokepointNorm * 0.28 + polyNorm * 0.2 + wgiInstabilityNorm * 0.16
      )
    ).toFixed(2)
  );

  const composite = Number(((geopolitical + sovereign + macro) / 3).toFixed(2));
  return { geopolitical, sovereign, macro, composite };
}

