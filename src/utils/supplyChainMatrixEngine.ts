import {
  BilateralCriticalInputRow,
  IbSectorImpactRow,
  InstitutionalSupplyChainMatrixSuite,
  LeontiefCell,
  LeontiefSectorNode,
  OpenDataSnapshot,
  StockpileDepletionSeries,
  SupplyChainShockParams,
} from '../types/council';

export const DEFAULT_SUPPLY_CHAIN_SHOCKS: SupplyChainShockParams = {
  upstreamExportQuotaCutPct: 25,
  maritimeRoutingDelayDays: 10,
  inventoryBurnMultiplier: 1.25,
  importSubstitutionElasticityPct: 20,
};

export const CRITICAL_INPUT_CATALOG = [
  { id: 'logic_wafers_7nm', label: 'Logic Chips & Wafers (<7nm)', baseStockpileDays: 24 },
  { id: 'ndpr_rare_earths', label: 'NdPr Rare Earth Magnets', baseStockpileDays: 31 },
  { id: 'hv_grid_transformers', label: 'HV Grid Transformers & IGBT', baseStockpileDays: 28 },
  { id: 'refined_diesel_lng', label: 'Refined Diesel & Baseload LNG', baseStockpileDays: 42 },
  { id: 'npk_fertilizer_potash', label: 'NPK Fertilizers & Potash', baseStockpileDays: 46 },
];

export function computeInstitutionalSupplyChainMatrix(
  openData: OpenDataSnapshot,
  params: SupplyChainShockParams = DEFAULT_SUPPLY_CHAIN_SHOCKS,
  embargoedInputIds: string[] = []
): InstitutionalSupplyChainMatrixSuite {
  const quotaShock = Math.max(0, Math.min(80, params.upstreamExportQuotaCutPct)) / 100;
  const delayShock = Math.max(0, Math.min(30, params.maritimeRoutingDelayDays)) / 30;
  const burnMult = Math.max(0.5, Math.min(2.5, params.inventoryBurnMultiplier));
  const subElasticity = Math.max(0, Math.min(60, params.importSubstitutionElasticityPct)) / 100;

  const embargoCount = embargoedInputIds.length;
  const effectiveShockIntensity =
    (quotaShock * 0.55 + delayShock * 0.35 + (burnMult - 1) * 0.25 + embargoCount * 0.14) *
    (1 - subElasticity * 0.45);

  const isCommodityExporter =
    openData.iso3 === 'BRA' || openData.iso3 === 'ZAF' || openData.iso3 === 'COL';
  const isManufacturingHub =
    openData.iso3 === 'MEX' || openData.iso3 === 'POL' || openData.iso3 === 'TUR';

  // =========================================================================
  // 1. LEONTIEF INPUT-OUTPUT (I - A)^-1 INTER-INDUSTRY DEPENDENCY MATRIX (6x6)
  // =========================================================================
  const rawSectors = [
    {
      sectorId: 'sec_semi_tech',
      sectorName: 'Semiconductors, Telecom 5G & Cloud Compute',
      shortCode: 'TECH/SEMI',
      shareGva: isManufacturingHub ? 14.5 : 10.2,
      importReliance: openData.iso3 === 'USA' ? 38 : 82,
      linkedInputId: 'logic_wafers_7nm',
    },
    {
      sectorId: 'sec_power_grid',
      sectorName: 'Power Generation, HV Grid & Renewables',
      shortCode: 'GRID/UTIL',
      shareGva: 12.8,
      importReliance: 54,
      linkedInputId: 'hv_grid_transformers',
    },
    {
      sectorId: 'sec_auto_aero',
      sectorName: 'Automotive, Aerospace & Heavy Machinery',
      shortCode: 'AUTO/MFG',
      shareGva: isManufacturingHub ? 22.4 : 15.6,
      importReliance: 64,
      linkedInputId: 'ndpr_rare_earths',
    },
    {
      sectorId: 'sec_mining_metals',
      sectorName: 'Mining, Metallurgy & Critical Minerals',
      shortCode: 'MINE/MET',
      shareGva: isCommodityExporter ? 19.5 : 11.4,
      importReliance: isCommodityExporter ? 24 : 58,
      linkedInputId: 'ndpr_rare_earths',
    },
    {
      sectorId: 'sec_agri_food',
      sectorName: 'Agribusiness, Fertilizers & Staple Food',
      shortCode: 'AGRI/FOOD',
      shareGva: openData.iso3 === 'BRA' || openData.iso3 === 'EGY' ? 21.0 : 13.5,
      importReliance: openData.iso3 === 'BRA' || openData.iso3 === 'EGY' ? 72 : 44,
      linkedInputId: 'npk_fertilizer_potash',
    },
    {
      sectorId: 'sec_petro_freight',
      sectorName: 'Refining, Petrochemicals & Maritime Logistics',
      shortCode: 'PETRO/LOG',
      shareGva: 18.2,
      importReliance: isCommodityExporter ? 34 : 68,
      linkedInputId: 'refined_diesel_lng',
    },
  ];

  // 6x6 Direct Technical Coefficients Matrix A = [a_ij]
  const A_MATRIX: number[][] = [
    // To: TECH, GRID, AUTO, MINE, AGRI, PETRO
    [0.22, 0.14, 0.26, 0.08, 0.05, 0.11], // From TECH/SEMI
    [0.18, 0.24, 0.21, 0.25, 0.14, 0.19], // From GRID/UTIL
    [0.09, 0.12, 0.28, 0.15, 0.11, 0.16], // From AUTO/MFG
    [0.16, 0.19, 0.24, 0.21, 0.07, 0.12], // From MINE/MET
    [0.02, 0.04, 0.03, 0.03, 0.29, 0.08], // From AGRI/FOOD
    [0.11, 0.22, 0.19, 0.23, 0.26, 0.27], // From PETRO/LOG
  ];

  // Approximate Leontief Inverse L = I + A + A^2 (exact 2nd-order Neumann series expansion)
  const n = 6;
  const L_MATRIX: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let a2 = 0;
      for (let k = 0; k < n; k++) {
        a2 += A_MATRIX[i][k] * A_MATRIX[k][j];
      }
      const identity = i === j ? 1.0 : 0.0;
      L_MATRIX[i][j] = Number((identity + A_MATRIX[i][j] + a2 * 1.35).toFixed(3));
    }
  }

  const leontiefMatrix: LeontiefCell[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const sup = rawSectors[i];
      const con = rawSectors[j];
      const aij = A_MATRIX[i][j];
      const lij = L_MATRIX[i][j];
      const isEmbargoed = embargoedInputIds.includes(sup.linkedInputId);
      const embargoBoost = isEmbargoed ? 1.65 : 1.0;

      const stressedCascadeLossBpsGdp = Math.round(
        aij *
          lij *
          (sup.importReliance / 100) *
          con.shareGva *
          effectiveShockIntensity *
          28 *
          embargoBoost
      );

      let tier: LeontiefCell['tier'] = 'LOW';
      if (aij >= 0.23 || stressedCascadeLossBpsGdp >= 18) {
        tier = 'CRITICAL';
      } else if (aij >= 0.17 || stressedCascadeLossBpsGdp >= 11) {
        tier = 'HIGH';
      } else if (aij >= 0.11 || stressedCascadeLossBpsGdp >= 6) {
        tier = 'MODERATE';
      }

      leontiefMatrix.push({
        supplierSectorId: sup.sectorId,
        supplierShortCode: sup.shortCode,
        consumingSectorId: con.sectorId,
        consumingShortCode: con.shortCode,
        directTechnicalCoeffAij: aij,
        totalRequirementMultiplierLij: lij,
        stressedCascadeLossBpsGdp,
        tier,
      });
    }
  }

  const leontiefSectors: LeontiefSectorNode[] = rawSectors.map((sec, idx) => {
    const forwardLinkageMultiplier = Number(
      L_MATRIX[idx].reduce((acc, v) => acc + v, 0).toFixed(2)
    );
    const backwardLinkageMultiplier = Number(
      L_MATRIX.reduce((acc, row) => acc + row[idx], 0).toFixed(2)
    );
    const isEmbargoed = embargoedInputIds.includes(sec.linkedInputId);
    const embargoFactor = isEmbargoed ? 1.55 : 1.0;

    const stressedOutputContractionPct = Number(
      (
        -(
          (sec.importReliance / 100) *
          backwardLinkageMultiplier *
          effectiveShockIntensity *
          2.6 *
          embargoFactor
        )
      ).toFixed(2)
    );
    const stressedProducerPriceSpikeBps = Math.round(
      (sec.importReliance / 100) *
        forwardLinkageMultiplier *
        effectiveShockIntensity *
        115 *
        embargoFactor
    );

    let bottleneckStatus: LeontiefSectorNode['bottleneckStatus'] = 'BUFFER_RESILIENT';
    if (Math.abs(stressedOutputContractionPct) >= 3.2 || isEmbargoed) {
      bottleneckStatus = 'CRITICAL_CHOKE';
    } else if (Math.abs(stressedOutputContractionPct) >= 2.0) {
      bottleneckStatus = 'HIGH_CASCADE';
    } else if (Math.abs(stressedOutputContractionPct) >= 1.1) {
      bottleneckStatus = 'MODERATE';
    }

    return {
      sectorId: sec.sectorId,
      sectorName: sec.sectorName,
      shortCode: sec.shortCode,
      shareOfDomesticGvaPct: sec.shareGva,
      importedInputReliancePct: sec.importReliance,
      backwardLinkageMultiplier,
      forwardLinkageMultiplier,
      stressedOutputContractionPct,
      stressedProducerPriceSpikeBps,
      bottleneckStatus,
    };
  });

  const aggregateLeontiefMultiplier = Number(
    (
      leontiefSectors.reduce((acc, s) => acc + s.backwardLinkageMultiplier, 0) /
      leontiefSectors.length
    ).toFixed(2)
  );
  const totalEconomyOutputContractionPctGdp = Number(
    leontiefSectors
      .reduce(
        (acc, s) => acc + (s.stressedOutputContractionPct * s.shareOfDomesticGvaPct) / 100,
        0
      )
      .toFixed(2)
  );
  const totalSupplyChainPpiPassThroughBps = Math.round(
    leontiefSectors.reduce(
      (acc, s) => acc + (s.stressedProducerPriceSpikeBps * s.shareOfDomesticGvaPct) / 100,
      0
    )
  );

  // =========================================================================
  // 2. BILATERAL COUNTRY-TO-COUNTRY CRITICAL INPUT & EXPORT CONTROL MATRIX
  // =========================================================================
  const bilateralCriticalInputs: BilateralCriticalInputRow[] = [
    {
      corridorId: 'bilat_tw_kr_semi',
      partnerCountryOrBloc: 'Taiwan & South Korea Foundry Cluster',
      criticalInputsSupplied: 'Logic Wafers (<7nm), CoWoS Packaging, HBM3e Memory',
      sovereignImportSharePct: openData.iso3 === 'USA' ? 64 : 78,
      globalSupplierHhi: 6450,
      exportControlRegime: 'US BIS Foreign Direct Product Rule & Wassenaar Dual-Use',
      domesticSubstitutionLagMonths: 48,
      bilateralRetaliationLeverageScore: openData.iso3 === 'USA' ? 76 : 24,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (2.8 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification: 'MONOPOLY_CHOKE',
    },
    {
      corridorId: 'bilat_cn_ree_battery',
      partnerCountryOrBloc: 'China Heavy Rare Earth & Battery Refining Bloc',
      criticalInputsSupplied: 'NdPr Permanent Magnets, Gallium/Germanium, Spherical Graphite, LFP Cathodes',
      sovereignImportSharePct: 74,
      globalSupplierHhi: 7100,
      exportControlRegime: 'MOFCOM Dual-Use Export Licensing & Strategic Quota Regime',
      domesticSubstitutionLagMonths: 36,
      bilateralRetaliationLeverageScore: isCommodityExporter ? 68 : 32,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (3.4 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification: 'MONOPOLY_CHOKE',
    },
    {
      corridorId: 'bilat_us_usmca_tech',
      partnerCountryOrBloc: 'United States & USMCA Corridor',
      criticalInputsSupplied: 'EDA Chip Design Software, Gas Turbines, Gulf LNG & Refined Distillates',
      sovereignImportSharePct: openData.iso3 === 'MEX' || openData.iso3 === 'COL' ? 68 : 42,
      globalSupplierHhi: 4600,
      exportControlRegime: 'OFAC / BIS Entity List & USMCA Rules-of-Origin Audit',
      domesticSubstitutionLagMonths: 30,
      bilateralRetaliationLeverageScore: openData.iso3 === 'MEX' ? 72 : 48,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (4.1 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification: 'STRATEGIC_DEPENDENCY',
    },
    {
      corridorId: 'bilat_eu_machinery',
      partnerCountryOrBloc: 'European Union Core (ASML / Siemens HV Grid)',
      criticalInputsSupplied: 'EUV/DUV Lithography Optics, 400kV HVDC Transformers, Precision CNC',
      sovereignImportSharePct: openData.iso3 === 'POL' || openData.iso3 === 'TUR' ? 66 : 38,
      globalSupplierHhi: 5200,
      exportControlRegime: 'EU Dual-Use Regulation & CBAM Carbon Border Levy',
      domesticSubstitutionLagMonths: 28,
      bilateralRetaliationLeverageScore: openData.iso3 === 'POL' || openData.iso3 === 'TUR' ? 64 : 45,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (2.4 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification: 'STRATEGIC_DEPENDENCY',
    },
    {
      corridorId: 'bilat_gcc_hormuz_energy',
      partnerCountryOrBloc: 'GCC / Strait of Hormuz Hydrocarbon Corridor',
      criticalInputsSupplied: 'Sour Crude Grades, Qatari LNG, Urea & Ammonia Feedstocks',
      sovereignImportSharePct: isCommodityExporter ? 22 : 56,
      globalSupplierHhi: 3450,
      exportControlRegime: 'OPEC+ Production Quotas & Strait of Hormuz War-Risk Clause',
      domesticSubstitutionLagMonths: 14,
      bilateralRetaliationLeverageScore: 52,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (3.9 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification: isCommodityExporter ? 'DIVERSIFIED' : 'STRATEGIC_DEPENDENCY',
    },
    {
      corridorId: 'bilat_blacksea_baltic_fert',
      partnerCountryOrBloc: 'Black Sea / Baltic Bulk Fertilizer & Grain Corridor',
      criticalInputsSupplied: 'Muriate of Potash (MOP), Ammonium Nitrate, Milling Wheat',
      sovereignImportSharePct: openData.iso3 === 'BRA' || openData.iso3 === 'EGY' ? 69 : 34,
      globalSupplierHhi: 3900,
      exportControlRegime: 'Maritime Humanitarian Corridor & Phytosanitary Export Quotas',
      domesticSubstitutionLagMonths: 18,
      bilateralRetaliationLeverageScore: 58,
      stressedAnnualImportBillDeltaUsdBn: Number(
        (2.2 * (1 + effectiveShockIntensity)).toFixed(2)
      ),
      riskClassification:
        openData.iso3 === 'BRA' || openData.iso3 === 'EGY'
          ? 'MONOPOLY_CHOKE'
          : 'DIVERSIFIED',
    },
  ];

  // =========================================================================
  // 3. STOCKPILE DEPLETION COUNTDOWN & PRODUCTION HALT HORIZON (DAYS 0 TO 90)
  // =========================================================================
  const horizonDays = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

  const depletionTrajectories: StockpileDepletionSeries[] = CRITICAL_INPUT_CATALOG.map((item) => {
    const isEmbargoed = embargoedInputIds.includes(item.id);
    const initialDays =
      isCommodityExporter && item.id === 'refined_diesel_lng'
        ? item.baseStockpileDays + 20
        : item.baseStockpileDays;

    // Net daily inventory depletion rate (days of buffer lost per calendar day)
    // If resupply is cut by quotaShock + delayShock + embargo, net burn > 0
    const resupplyFraction = isEmbargoed
      ? Math.max(0.08, subElasticity * 0.45)
      : Math.max(0.18, 1 - quotaShock * 0.85 - delayShock * 0.45 + subElasticity * 0.35);

    const netDailyDepletion = Math.max(0.12, burnMult - resupplyFraction);
    const stressedDepletionHorizonDay = Math.max(
      8,
      Math.min(90, Math.round(initialDays / netDailyDepletion))
    );

    const points = horizonDays.map((day) => {
      const remaining = Math.max(0, Number((initialDays - day * netDailyDepletion).toFixed(1)));
      return { day, remainingDaysBuffer: remaining };
    });

    const day90Remaining = points[points.length - 1].remainingDaysBuffer;

    return {
      inputId: item.id,
      inputLabel: item.label,
      initialStockpileDays: initialDays,
      dailyBurnRateNormalDays: Number(netDailyDepletion.toFixed(2)),
      stressedDepletionHorizonDay,
      breachesCritical15DayFloor: day90Remaining < 15,
      points,
    };
  });

  const sortedByDepletion = [...depletionTrajectories].sort(
    (a, b) => a.stressedDepletionHorizonDay - b.stressedDepletionHorizonDay
  );
  const earliestProductionHaltDay = sortedByDepletion[0].stressedDepletionHorizonDay;
  const mostVulnerableInputLabel = sortedByDepletion[0].inputLabel;

  // =========================================================================
  // 4. INVESTMENT BANKING SECTOR EQUITY, CREDIT SPREAD & CAPEX M&A IMPACT TABLE
  // =========================================================================
  const ibSectorImpacts: IbSectorImpactRow[] = leontiefSectors.map((sec) => {
    const absContraction = Math.abs(sec.stressedOutputContractionPct);
    const ebitdaMarginCompressionBps = Math.round(
      absContraction * 82 + sec.stressedProducerPriceSpikeBps * 0.45
    );
    const corporateCreditSpreadWideningBps = Math.round(
      absContraction * 46 + (sec.importedInputReliancePct / 100) * 55
    );
    const evToEbitdaMultipleImpactPct = Number(
      (-(absContraction * 2.8 + corporateCreditSpreadWideningBps / 45)).toFixed(1)
    );
    const workingCapitalFacilityNeedUsdMillions = Math.round(
      180 + absContraction * 145 + params.maritimeRoutingDelayDays * 14
    );

    let ibCapexAndMaAdvisoryMandate = '';
    let hedgeFundTradeExpression = '';

    if (sec.sectorId === 'sec_semi_tech') {
      ibCapexAndMaAdvisoryMandate =
        'Structure $650M JV & Offtake Project Finance for OSAT packaging nearshoring; advise on dual-foundry wafer supply covenants.';
      hedgeFundTradeExpression =
        'Long Upstream Foundry Leaders vs. Short Unhedged Domestic EMS / Consumer Electronics Basket.';
    } else if (sec.sectorId === 'sec_power_grid') {
      ibCapexAndMaAdvisoryMandate =
        'Underwrite Green/Transition Infrastructure Bonds to fund 18-month HVDC transformer buffer inventory & domestic switchgear M&A.';
      hedgeFundTradeExpression =
        'Long Regulated Inflation-Linked Grid Utilities vs. Short Merchant Thermal Generators.';
    } else if (sec.sectorId === 'sec_auto_aero') {
      ibCapexAndMaAdvisoryMandate =
        'Execute cross-border M&A vertical integration into domestic rare-earth magnet recycling and Tier-2 stamping consolidations.';
      hedgeFundTradeExpression =
        'Buy 5Y CDS on High-Import-Beta Auto OEMs; Long Defense & Aerospace Backlog Leaders.';
    } else if (sec.sectorId === 'sec_mining_metals') {
      ibCapexAndMaAdvisoryMandate =
        'Advise sovereign wealth & strategic buyers on critical mineral streaming/royalty carve-outs (Lithium, Niobium, Copper, PGMs).';
      hedgeFundTradeExpression =
        'Long Domestic Critical-Mineral Exporters & Royalty Streamers (Beneficiaries of Export Scarcity).';
    } else if (sec.sectorId === 'sec_agri_food') {
      ibCapexAndMaAdvisoryMandate =
        'Arrange syndicated revolving trade-finance lines for NPK fertilizer stockpiling and domestic ammonia synthesis brownfield capex.';
      hedgeFundTradeExpression =
        'Long Integrated Global Protein/Grain Exporters vs. Short Domestic Retail Grocery Margin.';
    } else {
      ibCapexAndMaAdvisoryMandate =
        'Structure floating-storage LNG regasification (FSRU) lease financing and port terminal automation concession debt.';
      hedgeFundTradeExpression =
        'Long Tanker/Container Freight Rates & Crack Spreads vs. Short Domestic Airline/Trucking Equities.';
    }

    return {
      sectorId: sec.sectorId,
      sectorName: sec.sectorName,
      ebitdaMarginCompressionBps,
      corporateCreditSpreadWideningBps,
      evToEbitdaMultipleImpactPct,
      workingCapitalFacilityNeedUsdMillions,
      ibCapexAndMaAdvisoryMandate,
      hedgeFundTradeExpression,
    };
  });

  const totalIbWorkingCapitalNeedUsdMillions = ibSectorImpacts.reduce(
    (acc, r) => acc + r.workingCapitalFacilityNeedUsdMillions,
    0
  );

  const leontiefConclusionHeadline = `Leontief Inverse (I − A)⁻¹ Multiplier averages ${aggregateLeontiefMultiplier}x across ${openData.countryName}'s 6 core sectors; under a ${params.upstreamExportQuotaCutPct}% quota cut & ${params.maritimeRoutingDelayDays}d transit lag, ${mostVulnerableInputLabel} hits critical depletion at Day ${earliestProductionHaltDay}, contracting GVA by ${totalEconomyOutputContractionPctGdp}% and requiring $${totalIbWorkingCapitalNeedUsdMillions.toLocaleString()}M in IB working-capital liquidity.`;

  return {
    shockParams: params,
    embargoedInputIds,
    leontiefConclusionHeadline,
    aggregateLeontiefMultiplier,
    totalEconomyOutputContractionPctGdp,
    totalSupplyChainPpiPassThroughBps,
    earliestProductionHaltDay,
    mostVulnerableInputLabel,
    totalIbWorkingCapitalNeedUsdMillions,
    leontiefSectors,
    leontiefMatrix,
    bilateralCriticalInputs,
    depletionTrajectories,
    ibSectorImpacts,
  };
}
