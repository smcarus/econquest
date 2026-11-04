import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Activity,
  Scale,
  Sigma,
  Briefcase,
  CalendarClock,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Network,
} from 'lucide-react';
import { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { StatRefBadge } from './StatRefTooltip';
import {
  bootstrapCdsSurvivalAndBasisCurve,
  computeDebtRestructuringNpvEngine,
  runMatrixOlsAndRocDiagnostics,
  buildInstitutionalTradeBlotterAndGreeks,
  computeMacroSurpriseCalendarAndPosterior,
  computeCrossSovereignAlphaCorrelationSuite,
  RestructuringParameters,
  EconometricModelId,
  TradeBlotterStressShocks,
  InstitutionalTradeTicket,
  SpreadSeriesType,
  RollingCorrelationHorizon,
} from '../utils/institutionalQuantEngine';
import {
  computeSovereignNssYieldCurveSuite,
  computeMacroCatalystEventVolatilitySuite,
  computeEmbiPortfolioBatchStressLabSuite,
  DEFAULT_NSS_SHOCK_INPUTS,
  DEFAULT_EMBI_PORTFOLIO_STRESS_PARAMS,
  EMBI_BATCH_SCENARIO_PRESETS,
  NssCurvePresetRegime,
  CatalystCategory,
  StagedTradeTicketSpec,
  EmbiPortfolioStressParams,
  EmbiStressPresetId,
  EmbiPortfolioWeightScheme,
} from '../utils/nssYieldCurveAndCatalystEngine';

export type QuantSubWorkspaceId =
  | 'quant_cds_basis'
  | 'quant_restructuring_npv'
  | 'quant_matrix_econometrics'
  | 'quant_trade_blotter'
  | 'quant_macro_surprise'
  | 'quant_alpha_correlation'
  | 'quant_nss_yield_curve'
  | 'quant_macro_catalyst_calendar'
  | 'quant_portfolio_stress_lab';

interface InstitutionalQuantDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems?: WatchlistItem[];
  isDark?: boolean;
  activeSubTab?: QuantSubWorkspaceId;
  onSelectSubTab?: (tab: QuantSubWorkspaceId) => void;
  onStageTradeTicket?: (ticket: StagedTradeTicketSpec) => void;
}

export const InstitutionalQuantDesk: React.FC<InstitutionalQuantDeskProps> = ({
  run,
  watchlistItems = SOVEREIGN_CATALOG,
  isDark = true,
  activeSubTab,
  onSelectSubTab,
  onStageTradeTicket,
}) => {
  const [internalTab, setInternalTab] = useState<QuantSubWorkspaceId>('quant_cds_basis');
  const currentTab = activeSubTab ?? internalTab;

  const handleTabChange = (tab: QuantSubWorkspaceId) => {
    setInternalTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  // --------------------------------------------------------------------------
  // STATE 1: CDS HAZARD BOOTSTRAP & BASIS ARBITRAGE
  // --------------------------------------------------------------------------
  const [recoveryRatePct, setRecoveryRatePct] = useState<number>(40);
  const [fundingSpreadBps, setFundingSpreadBps] = useState<number>(35);

  const cdsSuite = useMemo(
    () => bootstrapCdsSurvivalAndBasisCurve(run, recoveryRatePct, fundingSpreadBps),
    [run, recoveryRatePct, fundingSpreadBps]
  );

  // --------------------------------------------------------------------------
  // STATE 2: SOVEREIGN DEBT RESTRUCTURING & NPV HAIRCUT WORKBENCH
  // --------------------------------------------------------------------------
  const [restructuringParams, setRestructuringParams] = useState<RestructuringParameters>({
    nominalHaircutPct: 25,
    maturityExtensionYears: 6,
    gracePeriodYears: 2,
    couponReductionBps: 175,
    exitYieldPct: 11.0,
    includeDomesticDebt: false,
    includeOfficialBilateral: true,
  });

  const restructuringSuite = useMemo(
    () => computeDebtRestructuringNpvEngine(run, restructuringParams),
    [run, restructuringParams]
  );

  // --------------------------------------------------------------------------
  // STATE 3: MATRIX OLS ECONOMETRICS & ROC/AUC BACKTEST
  // --------------------------------------------------------------------------
  const [econometricModelId, setEconometricModelId] =
    useState<EconometricModelId>('BOHN_FISCAL_REACTION');
  const [rocThreshold, setRocThreshold] = useState<number>(0.45);

  const econometricsSuite = useMemo(
    () => runMatrixOlsAndRocDiagnostics(run, econometricModelId, rocThreshold),
    [run, econometricModelId, rocThreshold]
  );

  // --------------------------------------------------------------------------
  // STATE 4: MULTI-ASSET TRADE BLOTTER & DV01/CS01 GREEKS
  // --------------------------------------------------------------------------
  const [blotterShocks, setBlotterShocks] = useState<TradeBlotterStressShocks>({
    parallelRateShockBps: 50,
    curve2s10sSteepeningBps: 25,
    creditSpreadShockBps: 75,
    cdsBondBasisWideningBps: -15,
    fxSpotDepreciationPct: 5,
  });

  const [customTickets, setCustomTickets] = useState<InstitutionalTradeTicket[]>([]);
  const [showNewTicketForm, setShowNewTicketForm] = useState<boolean>(false);
  const [newTicketName, setNewTicketName] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] =
    useState<InstitutionalTradeTicket['structureCategory']>('CDS_BOND_BASIS');
  const [newTicketNotional, setNewTicketNotional] = useState<number>(15);
  const [newTicketDv01, setNewTicketDv01] = useState<number>(-2500);
  const [newTicketCs01, setNewTicketCs01] = useState<number>(4500);
  const [newTicketCarryBps, setNewTicketCarryBps] = useState<number>(32);

  const tradeBlotterSuite = useMemo(
    () => buildInstitutionalTradeBlotterAndGreeks(run, blotterShocks, customTickets),
    [run, blotterShocks, customTickets]
  );

  const handleAddCustomTicket = () => {
    const cleanName =
      newTicketName.trim() || `${run.iso3} Custom Relative-Value Package #${customTickets.length + 1}`;
    const expectedCarryUsdK = Math.round(newTicketNotional * newTicketCarryBps * 0.1 * 10) / 10;
    const newTicket: InstitutionalTradeTicket = {
      ticketId: `CUSTOM_${Date.now()}`,
      strategyName: cleanName,
      structureCategory: newTicketCategory,
      direction: newTicketCs01 > 0 ? 'SHORT_RISK' : 'LONG_RISK',
      leg1Description: `Custom Primary Leg ($${newTicketNotional}M Notional)`,
      leg2Description: `Custom Hedge Leg (DV01=${newTicketDv01}/bp, CS01=${newTicketCs01}/bp)`,
      notionalUsdMillions: newTicketNotional,
      entryLevelLabel: 'Custom Entry',
      targetLevelLabel: '+45 bps Target',
      stopLossLevelLabel: '-30 bps Stop',
      modifiedDurationYears: 4.5,
      dv01UsdPerBp: newTicketDv01,
      slopeDv01UsdPerBp: 0,
      cs01UsdPerBp: newTicketCs01,
      basis01UsdPerBp: newTicketCategory === 'CDS_BOND_BASIS' ? -5000 : 0,
      fxDeltaUsdPer1Pct: newTicketCategory === 'FX_MACRO_HEDGE' ? -50000 : 0,
      convexity: 18.0,
      carry90DBps: newTicketCarryBps,
      rollDown90DBps: 10,
      total90DCushionBps: newTicketCarryBps + 10,
      expectedCarryRoll90DUsdThousands: expectedCarryUsdK,
      annualizedVolBps: 45,
      carryToVolRatio: Math.round(((newTicketCarryBps + 10) / 45) * 100) / 100,
      breakevenWideningBps: newTicketCarryBps + 10,
      stressedPnlBreakdown: {
        ratesPnlUsdK: 0,
        creditSpreadPnlUsdK: 0,
        basisPnlUsdK: 0,
        fxPnlUsdK: 0,
        carryRollPnlUsdK: 0,
        convexityPnlUsdK: 0,
        netStressedPnlUsdK: 0,
      },
      isCustom: true,
    };
    setCustomTickets((prev) => [...prev, newTicket]);
    setNewTicketName('');
    setShowNewTicketForm(false);
  };

  const handleExportBlotterCsv = () => {
    const headers = [
      'Ticket_ID',
      'Strategy_Name',
      'Category',
      'Notional_USD_M',
      'Mod_Duration',
      'DV01_USD_bp',
      'Slope_DV01_USD_bp',
      'CS01_USD_bp',
      'Basis01_USD_bp',
      'FX_Delta_1Pct_USD',
      'Carry_90D_bps',
      'RollDown_90D_bps',
      'Breakeven_Widening_bps',
      'Carry_To_Vol',
      'Stressed_Net_PnL_USD_K',
    ];
    const rows = tradeBlotterSuite.tickets.map((t) => [
      t.ticketId,
      `"${t.strategyName.replace(/"/g, '""')}"`,
      t.structureCategory,
      t.notionalUsdMillions,
      t.modifiedDurationYears,
      t.dv01UsdPerBp,
      t.slopeDv01UsdPerBp,
      t.cs01UsdPerBp,
      t.basis01UsdPerBp,
      t.fxDeltaUsdPer1Pct,
      t.carry90DBps,
      t.rollDown90DBps,
      t.breakevenWideningBps,
      t.carryToVolRatio,
      t.stressedPnlBreakdown.netStressedPnlUsdK,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${run.iso3}_Institutional_RV_Trade_Blotter.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // STATE 5: MACRO RELEASE CALENDAR & BAYESIAN POSTERIOR SURPRISE ENGINE
  // --------------------------------------------------------------------------
  const [macroActualOverrides, setMacroActualOverrides] = useState<Record<string, number>>({});

  const macroSurpriseSuite = useMemo(
    () => computeMacroSurpriseCalendarAndPosterior(run, macroActualOverrides),
    [run, macroActualOverrides]
  );

  const applyMacroPreset = (preset: 'STAGFLATION' | 'GOLDILOCKS' | 'FISCAL_SLIPPAGE' | 'RESET') => {
    if (preset === 'RESET') {
      setMacroActualOverrides({});
      return;
    }
    const cpi = run.openData.imfIndicators.cpiInflationPct;
    const gdp = run.openData.imfIndicators.realGdpGrowthPct;
    const pb = run.openData.imfIndicators.primaryFiscalBalancePct;
    const res = run.openData.debtRollover.liquidFxReservesUsdBn;

    if (preset === 'STAGFLATION') {
      setMacroActualOverrides({
        REL_CPI_HEADLINE: Number((cpi + 0.65).toFixed(2)),
        REL_CORE_CPI: Number((cpi * 0.84 + 0.45).toFixed(2)),
        REL_GDP_QOQ: Number((gdp - 0.75).toFixed(2)),
        REL_BOND_AUCTION_BTC: 1.55,
      });
    } else if (preset === 'GOLDILOCKS') {
      setMacroActualOverrides({
        REL_CPI_HEADLINE: Number((cpi - 0.55).toFixed(2)),
        REL_CORE_CPI: Number((cpi * 0.84 - 0.35).toFixed(2)),
        REL_GDP_QOQ: Number((gdp + 0.65).toFixed(2)),
        REL_PRIMARY_BALANCE: Number((pb + 0.55).toFixed(2)),
        REL_FX_RESERVES: Number((res + 2.4).toFixed(2)),
        REL_BOND_AUCTION_BTC: 2.65,
      });
    } else if (preset === 'FISCAL_SLIPPAGE') {
      setMacroActualOverrides({
        REL_PRIMARY_BALANCE: Number((pb - 0.85).toFixed(2)),
        REL_FX_RESERVES: Number(Math.max(1, res - 2.1).toFixed(2)),
        REL_BOND_AUCTION_BTC: 1.48,
      });
    }
  };

  // --------------------------------------------------------------------------
  // STATE 6: CROSS-SOVEREIGN ALPHA CORRELATION MATRIX & EMBI DIVERSIFICATION
  // --------------------------------------------------------------------------
  const [corrSpreadSeries, setCorrSpreadSeries] = useState<SpreadSeriesType>('CDS_5Y_BPS');
  const [corrRollingWindow, setCorrRollingWindow] = useState<RollingCorrelationHorizon>('90D');
  const [corrCrisisStressPct, setCorrCrisisStressPct] = useState<number>(0);
  const [selectedPairIsoA, setSelectedPairIsoA] = useState<string>(run.iso3);
  const [selectedPairIsoB, setSelectedPairIsoB] = useState<string>(
    run.iso3 === 'BRA' ? 'MEX' : 'BRA'
  );

  const alphaCorrSuite = useMemo(
    () =>
      computeCrossSovereignAlphaCorrelationSuite(run, watchlistItems, {
        spreadSeries: corrSpreadSeries,
        rollingWindow: corrRollingWindow,
        crisisStressIntensityPct: corrCrisisStressPct,
        pairIsoA: selectedPairIsoA,
        pairIsoB: selectedPairIsoB,
      }),
    [
      run,
      watchlistItems,
      corrSpreadSeries,
      corrRollingWindow,
      corrCrisisStressPct,
      selectedPairIsoA,
      selectedPairIsoB,
    ]
  );

  const handleExportAlphaCorrelationCsv = () => {
    const isoHeaders = alphaCorrSuite.matrixRows.map((r) => `Rho_${r.iso3}`);
    const headers = [
      'ISO3',
      'Country',
      'Region',
      'Active_Spread_bps',
      'Annualized_Vol_bps',
      'Avg_Peer_Correlation',
      'PC1_Global_Beta_Pct',
      'PC2_Regional_Factor_Pct',
      'Idiosyncratic_Alpha_Pct',
      'EMBI_Benchmark_Weight_Pct',
      'Equal_Weight_Pct',
      'Min_Variance_Weight_Pct',
      'Max_Diversification_Weight_Pct',
      'Overweight_Vs_EMBI_Pct',
      'Marginal_Risk_Contribution_Pct',
      ...isoHeaders,
    ];
    const rows = alphaCorrSuite.matrixRows.map((row, idx) => {
      const pcaRow = alphaCorrSuite.pcaDecompositionRows[idx];
      const wRow = alphaCorrSuite.embiWeightRows[idx];
      return [
        row.iso3,
        `"${row.countryName.replace(/"/g, '""')}"`,
        `"${row.region.replace(/"/g, '""')}"`,
        row.activeSpreadBps,
        row.annualizedSpreadVolBps,
        row.averagePeerCorrelation.toFixed(2),
        pcaRow?.pc1GlobalBetaSharePct.toFixed(1) ?? '0.0',
        pcaRow?.pc2RegionalCommoditySharePct.toFixed(1) ?? '0.0',
        pcaRow?.idiosyncraticAlphaSharePct.toFixed(1) ?? '0.0',
        wRow?.embiBenchmarkWeightPct.toFixed(1) ?? '0.0',
        wRow?.equalWeightPct.toFixed(1) ?? '0.0',
        wRow?.minVarianceWeightPct.toFixed(1) ?? '0.0',
        wRow?.maxDiversificationWeightPct.toFixed(1) ?? '0.0',
        wRow?.activeOverweightVsEmbiPct.toFixed(1) ?? '0.0',
        wRow?.marginalRiskContributionPct.toFixed(1) ?? '0.0',
        ...row.cells.map((c) => c.activeCorrelation.toFixed(2)),
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${run.iso3}_Cross_Sovereign_Alpha_Correlation_Matrix_${corrRollingWindow}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // STATE 7: SOVEREIGN YIELD CURVE & NSS TERM STRUCTURE LAB (5.7)
  // --------------------------------------------------------------------------
  const [nssPresetRegime, setNssPresetRegime] =
    useState<NssCurvePresetRegime>(DEFAULT_NSS_SHOCK_INPUTS.presetRegime);
  const [nssLevelShiftBps, setNssLevelShiftBps] = useState<number>(0);
  const [nssSlopeShiftBps, setNssSlopeShiftBps] = useState<number>(0);
  const [nssCurvatureShiftBps, setNssCurvatureShiftBps] = useState<number>(0);

  const nssSuite = useMemo(
    () =>
      computeSovereignNssYieldCurveSuite(run, {
        presetRegime: nssPresetRegime,
        levelShiftBps: nssLevelShiftBps,
        slopeShiftBps: nssSlopeShiftBps,
        curvatureShiftBps: nssCurvatureShiftBps,
      }),
    [run, nssPresetRegime, nssLevelShiftBps, nssSlopeShiftBps, nssCurvatureShiftBps]
  );

  // --------------------------------------------------------------------------
  // STATE 8: REAL-TIME MACRO & CENTRAL BANK CATALYST EVENT VOL CALENDAR (5.8)
  // --------------------------------------------------------------------------
  const [catalystScope, setCatalystScope] = useState<'ALL_WATCHLIST' | 'ACTIVE_SOVEREIGN'>(
    'ALL_WATCHLIST'
  );
  const [catalystCategoryFilter, setCatalystCategoryFilter] = useState<
    'ALL' | CatalystCategory
  >('ALL');
  const [selectedCatalystEventId, setSelectedCatalystEventId] = useState<string>('');

  const catalystSuite = useMemo(
    () => computeMacroCatalystEventVolatilitySuite(run, watchlistItems),
    [run, watchlistItems]
  );

  const filteredCatalystEvents = useMemo(() => {
    const base =
      catalystScope === 'ACTIVE_SOVEREIGN'
        ? catalystSuite.activeSovereignEvents
        : catalystSuite.events;
    if (catalystCategoryFilter === 'ALL') return base;
    return base.filter((e) => e.category === catalystCategoryFilter);
  }, [catalystSuite, catalystScope, catalystCategoryFilter]);

  const activeInspectedCatalyst = useMemo(() => {
    return (
      filteredCatalystEvents.find((e) => e.eventId === selectedCatalystEventId) ||
      filteredCatalystEvents[0] ||
      catalystSuite.nextImminentCatalyst
    );
  }, [filteredCatalystEvents, selectedCatalystEventId, catalystSuite]);

  // --------------------------------------------------------------------------
  // STATE 9: PORTFOLIO STRESS-TEST & SCENARIO LAB (5.9 EMBI BATCH P&L HIT)
  // --------------------------------------------------------------------------
  const [portfolioStressParams, setPortfolioStressParams] =
    useState<EmbiPortfolioStressParams>(DEFAULT_EMBI_PORTFOLIO_STRESS_PARAMS);

  const portfolioStressSuite = useMemo(
    () =>
      computeEmbiPortfolioBatchStressLabSuite(
        run,
        watchlistItems,
        portfolioStressParams
      ),
    [run, watchlistItems, portfolioStressParams]
  );

  const handleSelectStressPreset = (presetId: EmbiStressPresetId) => {
    const found = EMBI_BATCH_SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setPortfolioStressParams((prev) => ({
      ...prev,
      activePresetId: presetId,
      fxDevaluationShockPct: found.fxDevaluationShockPct,
      creditSpreadWideningBps: found.creditSpreadWideningBps,
      usTreasuryShiftBps: found.usTreasuryShiftBps,
      commodityShockPct: found.commodityShockPct,
    }));
  };

  const handleExportPortfolioStressCsv = () => {
    const headers = [
      'ISO3',
      'Country',
      'Portfolio_Weight_Pct',
      'Mod_Duration_Yrs',
      'Credit_Beta',
      'FX_Beta',
      'Effective_FX_Deval_Pct',
      'Effective_Spread_Shock_Bps',
      'Weighted_Credit_Hit_Bps',
      'Weighted_FX_Hit_Bps',
      'Weighted_Rates_Hit_Bps',
      'Weighted_Carry_Offset_Bps',
      'Net_Book_PnL_Bps',
      'Net_Book_PnL_Pct_NAV',
      'Share_Of_Book_Loss_Pct',
      'Post_Shock_Debt_GDP_Pct',
      'Post_Shock_5Y_CDS_Bps',
    ];
    const rows = portfolioStressSuite.sovereignRows.map((r) => [
      r.iso3,
      `"${r.countryName.replace(/"/g, '""')}"`,
      r.portfolioWeightPct.toFixed(1),
      r.modifiedDurationYears.toFixed(2),
      r.creditBeta.toFixed(2),
      r.fxBeta.toFixed(2),
      r.effectiveFxDevaluationPct.toFixed(1),
      r.effectiveSpreadWideningBps,
      r.bookWeightedCreditHitBps.toFixed(1),
      r.bookWeightedFxHitBps.toFixed(1),
      r.bookWeightedRatesHitBps.toFixed(1),
      r.bookWeightedCarryOffsetBps.toFixed(1),
      r.bookWeightedNetPnlBps.toFixed(1),
      r.bookWeightedNetPnlPctNav.toFixed(2),
      r.shareOfTotalBookLossPct.toFixed(1),
      r.postShockDebtToGdpPct.toFixed(1),
      r.postShock5YCdsBps,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `EMBI_Portfolio_Stress_Test_${portfolioStressParams.fxDevaluationShockPct}FX_${portfolioStressParams.creditSpreadWideningBps}bps.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const subTabs: Array<{
    id: QuantSubWorkspaceId;
    shortCode: string;
    label: string;
    metricBadge: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'quant_cds_basis',
      shortCode: '5.1',
      label: 'CDS Hazard & Basis Arb',
      metricBadge: `5Y PD ${cdsSuite.fiveYearCumulativePdPct.toFixed(1)}% · Basis ${cdsSuite.fiveYearNetBasisBps > 0 ? '+' : ''}${cdsSuite.fiveYearNetBasisBps}bp`,
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_restructuring_npv',
      shortCode: '5.2',
      label: 'Restructuring & Haircut NPV',
      metricBadge: `NPV Cut ${restructuringSuite.aggregateMarketNpvHaircutPct.toFixed(1)}% · ${restructuringSuite.weightedRecoveryCents.toFixed(0)}¢/$`,
      icon: <Scale className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_matrix_econometrics',
      shortCode: '5.3',
      label: 'Matrix OLS (HAC) & ROC',
      metricBadge: `Adj R² ${(econometricsSuite.adjustedRSquared * 100).toFixed(0)}% · AUC ${econometricsSuite.confusionMatrix.auroc.toFixed(2)}`,
      icon: <Sigma className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_trade_blotter',
      shortCode: '5.4',
      label: 'RV Blotter & DV01/CS01',
      metricBadge: `CS01 $${(tradeBlotterSuite.netPortfolioCs01UsdPerBp / 1000).toFixed(1)}k/bp · 90D +$${tradeBlotterSuite.total90DCarryRollUsdK.toFixed(0)}k`,
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_macro_surprise',
      shortCode: '5.5',
      label: 'Macro Surprise & Bayes',
      metricBadge: `ESI ${macroSurpriseSuite.economicSurpriseIndexEsi > 0 ? '+' : ''}${macroSurpriseSuite.economicSurpriseIndexEsi.toFixed(0)} · P(S₁) ${macroSurpriseSuite.posteriorHamiltonCrisisProbPct.toFixed(1)}%`,
      icon: <CalendarClock className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_alpha_correlation',
      shortCode: '5.6',
      label: 'Alpha Correlation Matrix',
      metricBadge: `ρ̄ ${alphaCorrSuite.averagePairwiseCorrelation.toFixed(2)} · DR ${alphaCorrSuite.choueifatyDiversificationRatio.toFixed(2)}x`,
      icon: <Network className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_nss_yield_curve',
      shortCode: '5.7',
      label: 'NSS Yield Curve & Carry+Roll',
      metricBadge: `2s10s ${nssSuite.slope2s10sBps > 0 ? '+' : ''}${nssSuite.slope2s10sBps}bp · ${nssSuite.optimalCarryRollTenor.tenorLabel} +${nssSuite.optimalCarryRollTenor.totalCarryRoll12MBps}bp/yr`,
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_macro_catalyst_calendar',
      shortCode: '5.8',
      label: 'Macro & MPC Catalyst Vol',
      metricBadge: `Next ${catalystSuite.nextImminentCatalyst.iso3} ${catalystSuite.nextImminentCatalyst.daysUntilEvent}d · ±${catalystSuite.averageImpliedEventVolBps.toFixed(0)}bp Vol`,
      icon: <CalendarClock className="w-3.5 h-3.5" />,
    },
    {
      id: 'quant_portfolio_stress_lab',
      shortCode: '5.9',
      label: 'Portfolio Stress-Test & Scenario Lab',
      metricBadge: `Book PnL ${portfolioStressSuite.totalBookNetPnlPctNav > 0 ? '+' : ''}${portfolioStressSuite.totalBookNetPnlPctNav.toFixed(2)}% NAV (${portfolioStressSuite.totalBookNetPnlBps.toFixed(0)}bp)`,
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
  ];

  const chartGridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const chartAxisTick = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
  };

  return (
    <section
      id="institutional-quant-desk"
      className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/90 shadow-sm overflow-hidden"
    >
      {/* Top Institutional Desk Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-semibold">
              EM SOVEREIGN CREDIT & RELATIVE-VALUE DESK
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {run.countryName} ({run.iso3}) · Currency: {run.openData.currencyCode}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            Institutional Fixed Income, Credit Derivatives, LGD Restructuring & Matrix Econometrics Workbench
          </h2>
        </div>

        {/* Summary Telemetry Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
          <div className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">5Y SURVIVAL Q(0,5)</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {cdsSuite.fiveYearSurvivalPct.toFixed(1)}%
            </span>
          </div>
          <div className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">EXIT NPV RECOVERY</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {restructuringSuite.weightedRecoveryCents.toFixed(1)}¢ / $1
            </span>
          </div>
          <div className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">RV BOOK 90D CARRY+ROLL</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              +${tradeBlotterSuite.total90DCarryRollUsdK.toFixed(1)}k
            </span>
          </div>
          <div className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">BAYESIAN P(CRISIS|Z)</span>
            <span
              className={`font-bold ${
                macroSurpriseSuite.posteriorHamiltonCrisisProbPct >= 45
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-sky-600 dark:text-sky-400'
              }`}
            >
              {macroSurpriseSuite.posteriorHamiltonCrisisProbPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Workspace Selector Bar (Shown only in standalone/split mode when not controlled by Top 3-Pillar Bar) */}
      {!onSelectSubTab && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 flex flex-wrap items-center gap-1.5">
          {subTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700'
                }`}
              >
                {tab.icon}
                <span className="font-mono text-[10px] opacity-80">{tab.shortCode}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-800/80 text-indigo-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.metricBadge}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.1: CDS HAZARD RATE BOOTSTRAP & CASH-BOND BASIS ARB
         ===================================================================== */}
      {currentTab === 'quant_cds_basis' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                ISDA PIECEWISE-CONSTANT HAZARD CURVE & CASH EUROBOND Z-SPREAD BASIS ENGINE
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {cdsSuite.headlineConclusion}
              </p>
            </div>
            <StatRefBadge
              refText={`Statistical Reference: ISDA_CDS_HAZARD_BASIS · 5Y CDS = ${
                cdsSuite.tenors[3]?.cdsParSpreadBps ?? 250
              } bps · R = ${recoveryRatePct}% · λ₅ = ${cdsSuite.fiveYearHazardRatePct.toFixed(
                2
              )}%/yr · 5Y Cum PD = ${cdsSuite.fiveYearCumulativePdPct.toFixed(
                1
              )}% · Net Basis = ${cdsSuite.fiveYearNetBasisBps} bps`}
            />
          </div>

          {/* Interactive Calibration Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Assumed Recovery Rate (R)
                </span>
                <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                  {recoveryRatePct}% (LGD = {100 - recoveryRatePct}%)
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={65}
                step={1}
                value={recoveryRatePct}
                onChange={(e) => setRecoveryRatePct(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>15% (Severe Holdout)</span>
                <span>40% (ISDA Standard)</span>
                <span>65% (Secured/Senior)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Dealer Repo / Balance-Sheet Funding Spread
                </span>
                <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                  SOFR + {fundingSpreadBps} bps
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={fundingSpreadBps}
                onChange={(e) => setFundingSpreadBps(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 bps (GC Repo)</span>
                <span>35 bps (Prime Spec)</span>
                <span>120 bps (Balance-Sheet Squeeze)</span>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quick Recovery & Funding Presets
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryRatePct(40);
                    setFundingSpreadBps(30);
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  ISDA Std (R=40%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryRatePct(25);
                    setFundingSpreadBps(65);
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  EM Stress (R=25%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryRatePct(18);
                    setFundingSpreadBps(95);
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                >
                  Hard Default (R=18%)
                </button>
              </div>
            </div>
          </div>

          {/* Dual Charts: Survival vs Hazard Curve & Cash-Bond Basis Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bootstrapped Survival Curve Q(0,T) & Hazard Rate λ(t)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exact piecewise-constant intensity calibration across 1Y–10Y CDS tenors
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  2s10s CDS: {cdsSuite.cdsSlope2s10sBps > 0 ? '+' : ''}
                  {cdsSuite.cdsSlope2s10sBps} bps
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cdsSuite.tenors} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="tenorLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fill: chartAxisTick, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fill: chartAxisTick, fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="survivalProbabilityPct"
                      name="Survival Prob Q(0,T) (%)"
                      fill="#10b981"
                      fillOpacity={0.16}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cumulativeDefaultProbPct"
                      name="Cumulative Default PD(0,T) (%)"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="piecewiseHazardRatePct"
                      name="Piecewise Hazard λ_t (%/yr)"
                      fill="#6366f1"
                      barSize={22}
                      radius={[3, 3, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Eurobond Z-Spread vs. CDS Par Spread & Net Basis (bps)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Negative Basis (CDS &lt; Z-Spread) identifies funded cash-bond + protection arbitrage
                  </p>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    cdsSuite.fiveYearNetBasisBps <= -18
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  5Y Net Basis: {cdsSuite.fiveYearNetBasisBps > 0 ? '+' : ''}
                  {cdsSuite.fiveYearNetBasisBps} bps
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cdsSuite.tenors} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="tenorLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v: number) => `${v}bp`}
                      tick={{ fill: chartAxisTick, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v: number) => `${v}bp`}
                      tick={{ fill: chartAxisTick, fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine yAxisId="right" y={0} stroke="#64748b" strokeDasharray="3 3" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cdsParSpreadBps"
                      name="CDS Par Spread (bps)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cashBondZSpreadBps"
                      name="Eurobond Z-Spread (bps)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="netFundingAdjustedBasisBps"
                      name="Net Funding-Adj Basis (bps)"
                      barSize={22}
                    >
                      {cdsSuite.tenors.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.netFundingAdjustedBasisBps < 0 ? '#10b981' : '#f43f5e'}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tenor-by-Tenor Bootstrapped Term Structure Table */}
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Tenor</th>
                  <th className="py-2 px-3 text-right">CDS Spread</th>
                  <th className="py-2 px-3 text-right">Hazard λ_t</th>
                  <th className="py-2 px-3 text-right">Survival Q(0,T)</th>
                  <th className="py-2 px-3 text-right">Cum PD(0,T)</th>
                  <th className="py-2 px-3 text-right">RPV01</th>
                  <th className="py-2 px-3 text-right">Upfront (100/500c)</th>
                  <th className="py-2 px-3 text-right">Eurobond Yield</th>
                  <th className="py-2 px-3 text-right">Z-Spread</th>
                  <th className="py-2 px-3 text-right">Net Basis</th>
                  <th className="py-2 px-3">Desk Relative-Value Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {cdsSuite.tenors.map((row) => (
                  <tr
                    key={row.tenorLabel}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                      row.tenorLabel === '5Y' ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {row.tenorLabel}
                      {row.tenorLabel === '5Y' && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                          BMK
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">
                      {row.cdsParSpreadBps} bps
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                      {row.piecewiseHazardRatePct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.survivalProbabilityPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">
                      {row.cumulativeDefaultProbPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                      {row.riskyPv01.toFixed(2)}y
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                      {row.upfront100BpsPct > 0 ? '+' : ''}
                      {row.upfront100BpsPct.toFixed(1)}% / {row.upfront500BpsPct > 0 ? '+' : ''}
                      {row.upfront500BpsPct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">
                      {row.cashBondYieldPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                      {row.cashBondZSpreadBps} bps
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        row.netFundingAdjustedBasisBps <= -18
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.netFundingAdjustedBasisBps >= 18
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {row.netFundingAdjustedBasisBps > 0 ? '+' : ''}
                      {row.netFundingAdjustedBasisBps} bps
                    </td>
                    <td className="py-2 px-3 font-sans text-[11px] text-slate-700 dark:text-slate-300">
                      {row.deskTradeAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.2: SOVEREIGN DEBT RESTRUCTURING & HAIRCUT NPV ENGINE
         ===================================================================== */}
      {currentTab === 'quant_restructuring_npv' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                  SOVEREIGN LGD & COMPARABILITY OF TREATMENT (CoT) NPV RESTRUCTURING WORKBENCH
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    restructuringSuite.imfDsaVerdict === 'RESTORED_SUSTAINABILITY'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : restructuringSuite.imfDsaVerdict === 'MARGINAL_BUFFER_INSUFFICIENT'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  IMF SRDSF VERDICT: {restructuringSuite.imfDsaVerdict.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {restructuringSuite.headlineConclusion}
              </p>
            </div>
            <StatRefBadge
              refText={`Statistical Reference: CAC_RESTRUCTURING_NPV · Exit Yield = ${restructuringParams.exitYieldPct.toFixed(
                1
              )}% · Restructured NPV Haircut = ${restructuringSuite.aggregateMarketNpvHaircutPct.toFixed(
                1
              )}% · Recovery = ${restructuringSuite.weightedRecoveryCents.toFixed(
                1
              )}¢ · Post-Deal GFN = ${restructuringSuite.postGfnPctGdp.toFixed(1)}% GDP`}
            />
          </div>

          {/* Interactive Restructuring Parameter Sliders + Sovereign Deal Presets */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Exchange Offer Term Sheet Parameters & Comparability Perimeter</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-500 mr-1">Historical Deal Templates:</span>
                <button
                  type="button"
                  onClick={() =>
                    setRestructuringParams({
                      nominalHaircutPct: 10,
                      maturityExtensionYears: 5,
                      gracePeriodYears: 4,
                      couponReductionBps: 225,
                      exitYieldPct: 10.5,
                      includeDomesticDebt: false,
                      includeOfficialBilateral: false,
                    })
                  }
                  className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Ecuador 2020 (Reprofiling)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRestructuringParams({
                      nominalHaircutPct: 37,
                      maturityExtensionYears: 6,
                      gracePeriodYears: 3,
                      couponReductionBps: 250,
                      exitYieldPct: 13.5,
                      includeDomesticDebt: false,
                      includeOfficialBilateral: true,
                    })
                  }
                  className="px-2 py-0.5 text-[11px] font-mono rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  Ukraine 2024 (37% Cut)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRestructuringParams({
                      nominalHaircutPct: 28,
                      maturityExtensionYears: 8,
                      gracePeriodYears: 3,
                      couponReductionBps: 200,
                      exitYieldPct: 11.5,
                      includeDomesticDebt: true,
                      includeOfficialBilateral: true,
                    })
                  }
                  className="px-2 py-0.5 text-[11px] font-mono rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                >
                  Sri Lanka / Ghana 2024 (DDO + Ext)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Nominal Haircut</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {restructuringParams.nominalHaircutPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={restructuringParams.nominalHaircutPct}
                  onChange={(e) =>
                    setRestructuringParams((p) => ({
                      ...p,
                      nominalHaircutPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Maturity Extension</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    +{restructuringParams.maturityExtensionYears} Years
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={restructuringParams.maturityExtensionYears}
                  onChange={(e) =>
                    setRestructuringParams((p) => ({
                      ...p,
                      maturityExtensionYears: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Principal Grace Period</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {restructuringParams.gracePeriodYears} Years
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={restructuringParams.gracePeriodYears}
                  onChange={(e) =>
                    setRestructuringParams((p) => ({
                      ...p,
                      gracePeriodYears: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Coupon Step-Down</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    −{restructuringParams.couponReductionBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={450}
                  step={25}
                  value={restructuringParams.couponReductionBps}
                  onChange={(e) =>
                    setRestructuringParams((p) => ({
                      ...p,
                      couponReductionBps: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Exit Discount Yield</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {restructuringParams.exitYieldPct.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={0.5}
                  value={restructuringParams.exitYieldPct}
                  onChange={(e) =>
                    setRestructuringParams((p) => ({
                      ...p,
                      exitYieldPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restructuringParams.includeOfficialBilateral}
                    onChange={(e) =>
                      setRestructuringParams((p) => ({
                        ...p,
                        includeOfficialBilateral: e.target.checked,
                      }))
                    }
                    className="rounded accent-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Enforce Paris Club / G20 Official Bilateral Comparability of Treatment (CoT)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restructuringParams.includeDomesticDebt}
                    onChange={(e) =>
                      setRestructuringParams((p) => ({
                        ...p,
                        includeDomesticDebt: e.target.checked,
                      }))
                    }
                    className="rounded accent-indigo-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Include Domestic Local-Law Bonds (DDO — caution: Bank CET1 impact)
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span>
                  Pre-Deal Debt/GDP: <strong>{restructuringSuite.preDebtToGdpPct.toFixed(1)}%</strong>
                </span>
                <span>
                  Post-Deal PV Debt/GDP:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {restructuringSuite.postPvDebtToGdpPct.toFixed(1)}%
                  </strong>
                </span>
                <span>
                  5Y Cashflow Relief:{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    ${restructuringSuite.fiveYearCumulativeReliefUsdBn.toFixed(2)}Bn
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 15-Year Debt Service Relief Chart */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  15-Year Sovereign Debt Service Profile: Contractual Pre-Deal vs. Post-Exchange ($Bn)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bars show annual contractual principal + interest before and after grace period, extension, and coupon step-down
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                Post-Deal 3Y GFN: {restructuringSuite.postGfnPctGdp.toFixed(1)}% GDP (IMF Threshold: 15.0%)
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={restructuringSuite.cashflowSchedule}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="yearLabel" tick={{ fill: chartAxisTick, fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}B`}
                    tick={{ fill: chartAxisTick, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="preDebtServiceUsdBn"
                    name="Pre-Restructuring Debt Service ($Bn)"
                    fill="#94a3b8"
                    barSize={16}
                  />
                  <Bar
                    dataKey="postDebtServiceUsdBn"
                    name="Post-Restructuring Debt Service ($Bn)"
                    fill="#6366f1"
                    barSize={16}
                  />
                  <Line
                    type="monotone"
                    dataKey="netCashflowReliefUsdBn"
                    name="Annual Cashflow Relief ($Bn)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Creditor Seniority Waterfall & CAC Holdout Table */}
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Creditor Seniority Tranche</th>
                  <th className="py-2 px-3">Governing Law & CAC Clause</th>
                  <th className="py-2 px-3 text-right">Principal ($Bn)</th>
                  <th className="py-2 px-3 text-right">Share</th>
                  <th className="py-2 px-3 text-right">Orig → New Coupon</th>
                  <th className="py-2 px-3 text-right">Orig → New WAM</th>
                  <th className="py-2 px-3 text-right">Nominal Cut</th>
                  <th className="py-2 px-3 text-right">NPV Haircut</th>
                  <th className="py-2 px-3 text-right">Recovery Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {restructuringSuite.tranches.map((tr) => (
                  <tr key={tr.trancheId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                      <div>{tr.trancheName}</div>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          tr.isIncludedInPerimeter
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tr.isIncludedInPerimeter ? 'IN RESTRUCTURING PERIMETER' : 'EXEMPT / PROTECTED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="font-mono text-slate-800 dark:text-slate-200">{tr.governingLaw}</div>
                      <div>{tr.cacMechanism}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ${tr.outstandingPrincipalUsdBn.toFixed(2)}B
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {tr.shareOfTotalDebtPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {tr.originalWeightedCouponPct.toFixed(2)}% → {tr.newCouponPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {tr.originalMaturityYears}y → {tr.newMaturityYears}y
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                      −{tr.appliedNominalHaircutPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      −{tr.npvHaircutPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {tr.recoveryCentsPerDollar.toFixed(1)}¢ / $1
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.3: IN-BROWSER MATRIX OLS (HAC) & ROC/AUC BACKTEST
         ===================================================================== */}
      {currentTab === 'quant_matrix_econometrics' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                LIVE MATRIX OLS SOLVER (β̂ = (XᵀX)⁻¹Xᵀy) WITH NEWEY-WEST HAC SEs & OUT-OF-SAMPLE ROC/AUC
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {econometricsSuite.headlineConclusion}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatRefBadge
                refText={`Statistical Reference: NEWEY_WEST_HAC_OLS · Adj R² = ${(
                  econometricsSuite.adjustedRSquared * 100
                ).toFixed(1)}% · DW = ${econometricsSuite.durbinWatsonStat.toFixed(
                  2
                )} · F-Stat = ${econometricsSuite.fStatistic.toFixed(1)}`}
              />
              <StatRefBadge
                refText={`Statistical Reference: EWS_AUROC_NSR_BACKTEST · AUROC = ${econometricsSuite.confusionMatrix.auroc.toFixed(
                  3
                )} · NSR = ${econometricsSuite.confusionMatrix.noiseToSignalRatio.toFixed(
                  2
                )} · Brier = ${econometricsSuite.confusionMatrix.brierScore.toFixed(3)}`}
              />
            </div>
          </div>

          {/* Model Specification Selector & ROC Threshold Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="lg:col-span-2 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Select Structural Econometric Specification (Estimated across T = {econometricsSuite.sampleSizeQuarters} Quarters)
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      id: 'BOHN_FISCAL_REACTION',
                      label: '1. Bohn (1998) Fiscal Sustainability Function',
                    },
                    {
                      id: 'AUGMENTED_TAYLOR_RULE',
                      label: '2. Open-Economy Augmented Taylor Rule',
                    },
                    {
                      id: 'SOVEREIGN_SPREAD_FACTOR',
                      label: '3. Structural 5Y CDS Spread Pricing Model',
                    },
                  ] as Array<{ id: EconometricModelId; label: string }>
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setEconometricModelId(m.id)}
                    className={`px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                      econometricModelId === m.id
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                Specification: <strong className="text-slate-800 dark:text-slate-200">{econometricsSuite.equationFormula}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Crisis Signal Alert Threshold (τ)
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  τ = {(rocThreshold * 100).toFixed(0)}% (Optimal τ* = {(econometricsSuite.confusionMatrix.optimalThreshold * 100).toFixed(0)}%)
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.85}
                step={0.05}
                value={rocThreshold}
                onChange={(e) => setRocThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>15% (High Recall)</span>
                <span>45% (KLR Balanced)</span>
                <span>85% (Low False Alarm)</span>
              </div>
            </div>
          </div>

          {/* Matrix OLS Parameter Table with Newey-West HAC t-stats */}
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                DEPENDENT VARIABLE: {econometricsSuite.dependentVariableLabel} ({econometricsSuite.dependentVariableUnit})
              </span>
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <span>R² = {(econometricsSuite.rSquared * 100).toFixed(1)}%</span>
                <span>Adj R² = {(econometricsSuite.adjustedRSquared * 100).toFixed(1)}%</span>
                <span>F-Stat = {econometricsSuite.fStatistic.toFixed(1)}</span>
                <span>Durbin-Watson = {econometricsSuite.durbinWatsonStat.toFixed(2)}</span>
                <span>AIC = {econometricsSuite.akaikeInfoCriterion.toFixed(1)}</span>
                <span>HAC Lags L = {econometricsSuite.neweyWestLagTruncation}</span>
              </div>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Regressor Variable</th>
                  <th className="py-2 px-3">Economic Interpretation</th>
                  <th className="py-2 px-3 text-right">Coeff (β̂)</th>
                  <th className="py-2 px-3 text-right">OLS SE</th>
                  <th className="py-2 px-3 text-right">Newey-West HAC SE</th>
                  <th className="py-2 px-3 text-right">t-Stat (HAC)</th>
                  <th className="py-2 px-3 text-right">p-Value</th>
                  <th className="py-2 px-3">Institutional Hypothesis Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {econometricsSuite.coefficients.map((c) => (
                  <tr key={c.variableKey} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {c.variableLabel}
                    </td>
                    <td className="py-2 px-3 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                      {c.economicMeaning}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {c.betaHat > 0 ? '+' : ''}
                      {c.betaHat.toFixed(4)}{' '}
                      <span className="text-amber-500">{c.significanceStars}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      ({c.olsStdError.toFixed(4)})
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      [{c.hacNeweyWestStdError.toFixed(4)}]
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                      {c.tStatHac.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                      {c.pValueTwoSided.toFixed(4)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.hypothesisStatus === 'CONFIRMED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : c.hypothesisStatus === 'WEAK'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {c.hypothesisStatus} ({c.expectedSign})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dual Charts: Actual vs Fitted OLS Time Series + Out-of-Sample ROC & Confusion Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    In-Sample Fit & 95% HAC Confidence Band: {econometricsSuite.dependentVariableLabel}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Actual sovereign series vs. Matrix OLS fitted trajectory and residual shocks
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  RMSE = {econometricsSuite.residualStdError.toFixed(2)} {econometricsSuite.dependentVariableUnit}
                </span>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={econometricsSuite.fittedSeries}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="periodLabel" tick={{ fill: chartAxisTick, fontSize: 10 }} interval={3} />
                    <YAxis tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="upper95Band"
                      name="Upper 95% HAC Band"
                      stroke="none"
                      fill="#6366f1"
                      fillOpacity={0.12}
                    />
                    <Line
                      type="monotone"
                      dataKey="actualY"
                      name={`Actual ${econometricsSuite.dependentVariableLabel}`}
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fittedY"
                      name="Matrix OLS Fitted (Xβ̂)"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Bar
                      dataKey="residual"
                      name="Residual ε̂_t"
                      fill="#f59e0b"
                      barSize={8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Out-of-Sample Confusion Matrix & ROC Card */}
            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Out-of-Sample EWS Confusion Matrix
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    AUROC = {econometricsSuite.confusionMatrix.auroc.toFixed(3)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  48 Sovereign Episodes at Threshold τ = {(rocThreshold * 100).toFixed(0)}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
                <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">
                    True Positives (TP)
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {econometricsSuite.confusionMatrix.truePositives}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    TPR Recall: {econometricsSuite.confusionMatrix.tprRecallPct.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/10">
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 uppercase">
                    False Positives (FP)
                  </div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {econometricsSuite.confusionMatrix.falsePositives}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    FPR Noise: {econometricsSuite.confusionMatrix.fprFalseAlarmPct.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 rounded border border-rose-500/30 bg-rose-500/10">
                  <div className="text-[10px] text-rose-700 dark:text-rose-300 uppercase">
                    False Negatives (FN)
                  </div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {econometricsSuite.confusionMatrix.falseNegatives}
                  </div>
                  <div className="text-[10px] text-slate-500">Missed Crises</div>
                </div>
                <div className="p-2.5 rounded border border-sky-500/30 bg-sky-500/10">
                  <div className="text-[10px] text-sky-700 dark:text-sky-300 uppercase">
                    True Negatives (TN)
                  </div>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
                    {econometricsSuite.confusionMatrix.trueNegatives}
                  </div>
                  <div className="text-[10px] text-slate-500">Tranquil Correct</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-center font-mono text-xs tabular-nums">
                <div>
                  <span className="text-[10px] text-slate-500 block">KLR NSR (FPR/TPR)</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {econometricsSuite.confusionMatrix.noiseToSignalRatio.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">F1 Score</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {econometricsSuite.confusionMatrix.f1Score.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Brier Score</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {econometricsSuite.confusionMatrix.brierScore.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.4: MULTI-ASSET TRADE BLOTTER & DV01/CS01 GREEKS
         ===================================================================== */}
      {currentTab === 'quant_trade_blotter' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                INSTITUTIONAL RELATIVE-VALUE STRUCTURING BLOTTER, FIXED-INCOME GREEKS & 5-FACTOR P&L WATERFALL
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {tradeBlotterSuite.headlineConclusion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatRefBadge
                refText={`Statistical Reference: DV01_CS01_CARRY_ROLL · Net DV01 = $${tradeBlotterSuite.netPortfolioDv01UsdPerBp}/bp · Net CS01 = $${tradeBlotterSuite.netPortfolioCs01UsdPerBp}/bp · 90D Carry+Roll = +$${tradeBlotterSuite.total90DCarryRollUsdK}k`}
              />
              <button
                type="button"
                onClick={() => setShowNewTicketForm((s) => !s)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Ticket</span>
              </button>
              <button
                type="button"
                onClick={handleExportBlotterCsv}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Optional Add Custom Trade Ticket Form */}
          {showNewTicketForm && (
            <div className="p-3 rounded-md border border-indigo-500/40 bg-indigo-500/5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                Structure New Custom Relative-Value Trade Ticket
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Strategy Package Name</label>
                  <input
                    type="text"
                    placeholder={`${run.iso3} 5s10s Eurobond Curve Flattener`}
                    value={newTicketName}
                    onChange={(e) => setNewTicketName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Category</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) =>
                      setNewTicketCategory(
                        e.target.value as InstitutionalTradeTicket['structureCategory']
                      )
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  >
                    <option value="CDS_BOND_BASIS">CDS-Bond Basis</option>
                    <option value="RATES_CURVE">Rates Curve</option>
                    <option value="CREDIT_CURVE">Credit Curve</option>
                    <option value="FX_MACRO_HEDGE">FX Macro Hedge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Notional ($M)</label>
                  <input
                    type="number"
                    value={newTicketNotional}
                    onChange={(e) => setNewTicketNotional(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Net DV01 ($/bp)</label>
                  <input
                    type="number"
                    value={newTicketDv01}
                    onChange={(e) => setNewTicketDv01(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Net CS01 ($/bp)</label>
                  <input
                    type="number"
                    value={newTicketCs01}
                    onChange={(e) => setNewTicketCs01(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="px-3 py-1 rounded text-xs font-mono border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomTicket}
                  className="px-3 py-1 rounded text-xs font-mono font-semibold bg-indigo-600 text-white"
                >
                  Book Ticket to Blotter
                </button>
              </div>
            </div>
          )}

          {/* 5-Factor Stress Scenario Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Parallel Rate Shock</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {blotterShocks.parallelRateShockBps > 0 ? '+' : ''}
                  {blotterShocks.parallelRateShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min={-150}
                max={300}
                step={10}
                value={blotterShocks.parallelRateShockBps}
                onChange={(e) =>
                  setBlotterShocks((s) => ({
                    ...s,
                    parallelRateShockBps: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">2s10s Curve Shift</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {blotterShocks.curve2s10sSteepeningBps > 0 ? '+' : ''}
                  {blotterShocks.curve2s10sSteepeningBps} bps
                </span>
              </div>
              <input
                type="range"
                min={-100}
                max={150}
                step={5}
                value={blotterShocks.curve2s10sSteepeningBps}
                onChange={(e) =>
                  setBlotterShocks((s) => ({
                    ...s,
                    curve2s10sSteepeningBps: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">5Y CDS Spread Shock</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {blotterShocks.creditSpreadShockBps > 0 ? '+' : ''}
                  {blotterShocks.creditSpreadShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min={-150}
                max={400}
                step={10}
                value={blotterShocks.creditSpreadShockBps}
                onChange={(e) =>
                  setBlotterShocks((s) => ({
                    ...s,
                    creditSpreadShockBps: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">CDS-Bond Basis Shift</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {blotterShocks.cdsBondBasisWideningBps > 0 ? '+' : ''}
                  {blotterShocks.cdsBondBasisWideningBps} bps
                </span>
              </div>
              <input
                type="range"
                min={-80}
                max={120}
                step={5}
                value={blotterShocks.cdsBondBasisWideningBps}
                onChange={(e) =>
                  setBlotterShocks((s) => ({
                    ...s,
                    cdsBondBasisWideningBps: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Spot FX Depreciation</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {blotterShocks.fxSpotDepreciationPct > 0 ? '+' : ''}
                  {blotterShocks.fxSpotDepreciationPct}%
                </span>
              </div>
              <input
                type="range"
                min={-10}
                max={25}
                step={1}
                value={blotterShocks.fxSpotDepreciationPct}
                onChange={(e) =>
                  setBlotterShocks((s) => ({
                    ...s,
                    fxSpotDepreciationPct: Number(e.target.value),
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* 5-Factor P&L Attribution Waterfall Chart */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Multi-Factor Stress P&L Attribution Decomposition ($ Thousands)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Decomposes total book P&L into 90D Carry & Roll-Down, Rates DV01, Credit CS01, Basis Convergence, FX Delta, and Convexity
                </p>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  tradeBlotterSuite.totalNetStressedPnlUsdK >= 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                Net Stressed P&L: {tradeBlotterSuite.totalNetStressedPnlUsdK >= 0 ? '+' : ''}$
                {tradeBlotterSuite.totalNetStressedPnlUsdK.toFixed(1)}k
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={tradeBlotterSuite.attributionWaterfall}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="factorLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}k`}
                    tick={{ fill: chartAxisTick, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="pnlUsdThousands" name="Factor P&L ($K)" barSize={34}>
                    {tradeBlotterSuite.attributionWaterfall.map((entry, idx) => (
                      <Cell
                        key={`wf-${idx}`}
                        fill={
                          entry.category === 'NET'
                            ? '#6366f1'
                            : entry.pnlUsdThousands >= 0
                            ? '#10b981'
                            : '#f43f5e'
                        }
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Institutional Trade Blotter Table */}
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Strategy Package & Leg Structure</th>
                  <th className="py-2 px-3 text-right">Notional</th>
                  <th className="py-2 px-3 text-right">DV01 ($/bp)</th>
                  <th className="py-2 px-3 text-right">CS01 ($/bp)</th>
                  <th className="py-2 px-3 text-right">90D Carry+Roll</th>
                  <th className="py-2 px-3 text-right">Breakeven</th>
                  <th className="py-2 px-3 text-right">Carry/Vol</th>
                  <th className="py-2 px-3 text-right">Stressed P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {tradeBlotterSuite.tickets.map((t) => (
                  <tr key={t.ticketId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {t.strategyName}
                        </span>
                        {t.isCustom && (
                          <button
                            type="button"
                            onClick={() =>
                              setCustomTickets((prev) =>
                                prev.filter((item) => item.ticketId !== t.ticketId)
                              )
                            }
                            className="text-rose-500 hover:text-rose-400"
                            title="Remove custom ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Leg 1: {t.leg1Description}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Leg 2: {t.leg2Description}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ${t.notionalUsdMillions.toFixed(1)}M
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {t.dv01UsdPerBp >= 0 ? '+' : ''}${t.dv01UsdPerBp.toLocaleString()}
                      {t.slopeDv01UsdPerBp !== 0 && (
                        <div className="text-[10px] text-indigo-500">
                          Slope: {t.slopeDv01UsdPerBp > 0 ? '+' : ''}$
                          {t.slopeDv01UsdPerBp.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">
                      {t.cs01UsdPerBp >= 0 ? '+' : ''}${t.cs01UsdPerBp.toLocaleString()}
                      {t.basis01UsdPerBp !== 0 && (
                        <div className="text-[10px] text-emerald-500">
                          Basis01: ${t.basis01UsdPerBp.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{t.total90DCushionBps} bps
                      <div className="text-[10px] text-slate-500">
                        (+${t.expectedCarryRoll90DUsdThousands.toFixed(1)}k)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                      +{t.breakevenWideningBps} bps
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {t.carryToVolRatio.toFixed(2)}x
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        t.stressedPnlBreakdown.netStressedPnlUsdK >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {t.stressedPnlBreakdown.netStressedPnlUsdK >= 0 ? '+' : ''}$
                      {t.stressedPnlBreakdown.netStressedPnlUsdK.toFixed(1)}k
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.5: MACRO RELEASE CALENDAR & CONSENSUS SURPRISE INDEX
         ===================================================================== */}
      {currentTab === 'quant_macro_surprise' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                  STANDARDIZED CONSENSUS SURPRISE Z-SCORE & BAYESIAN REGIME POSTERIOR ENGINE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold">
                  QUADRANT: {macroSurpriseSuite.macroQuadrantRegime.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {macroSurpriseSuite.headlineConclusion}
              </p>
            </div>
            <StatRefBadge
              refText={`Statistical Reference: ECONOMIC_SURPRISE_INDEX_Z · ESI = ${macroSurpriseSuite.economicSurpriseIndexEsi.toFixed(
                1
              )} · ISI = ${macroSurpriseSuite.inflationSurpriseIndexIsi.toFixed(
                1
              )} · Prior P(S₁) = ${macroSurpriseSuite.priorHamiltonCrisisProbPct.toFixed(
                1
              )}% · Posterior P(S₁|Z) = ${macroSurpriseSuite.posteriorHamiltonCrisisProbPct.toFixed(
                1
              )}%`}
            />
          </div>

          {/* Bayesian Prior-to-Posterior Bar & Quick Surprise Scenario Presets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">GROWTH SURPRISE (ESI)</span>
                <span
                  className={`text-base font-bold ${
                    macroSurpriseSuite.economicSurpriseIndexEsi >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {macroSurpriseSuite.economicSurpriseIndexEsi > 0 ? '+' : ''}
                  {macroSurpriseSuite.economicSurpriseIndexEsi.toFixed(1)}
                </span>
              </div>
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">INFLATION SURPRISE (ISI)</span>
                <span
                  className={`text-base font-bold ${
                    macroSurpriseSuite.inflationSurpriseIndexIsi <= 10
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {macroSurpriseSuite.inflationSurpriseIndexIsi > 0 ? '+' : ''}
                  {macroSurpriseSuite.inflationSurpriseIndexIsi.toFixed(1)}
                </span>
              </div>
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">PRIOR → POSTERIOR P(S₁)</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {macroSurpriseSuite.priorHamiltonCrisisProbPct.toFixed(1)}% →{' '}
                  {macroSurpriseSuite.posteriorHamiltonCrisisProbPct.toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">IMPLIED 5Y CDS IMPULSE</span>
                <span
                  className={`text-base font-bold ${
                    macroSurpriseSuite.netCdsRepricingImpulseBps <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {macroSurpriseSuite.netCdsRepricingImpulseBps > 0 ? '+' : ''}
                  {macroSurpriseSuite.netCdsRepricingImpulseBps.toFixed(0)} bps
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Simulate Data Release Shock Presets (or Edit Actual Prints Below)
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => applyMacroPreset('GOLDILOCKS')}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                >
                  Disinflation Boom
                </button>
                <button
                  type="button"
                  onClick={() => applyMacroPreset('STAGFLATION')}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                >
                  Stagflation Shock
                </button>
                <button
                  type="button"
                  onClick={() => applyMacroPreset('FISCAL_SLIPPAGE')}
                  className="px-2.5 py-1 text-[11px] font-mono rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  Fiscal & Auction Miss
                </button>
                <button
                  type="button"
                  onClick={() => applyMacroPreset('RESET')}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* 12-Month ESI vs ISI & Posterior Crisis Probability Chart */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  12-Month Decay-Weighted Economic Surprise (ESI), Inflation Surprise (ISI) & Posterior Crisis Prob
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tracks how cumulative macro data beats/misses shift Hamilton Markov crisis probabilities in real time
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Bayes Likelihood Ratio L(Z) = {macroSurpriseSuite.bayesLikelihoodRatio.toFixed(2)}x
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={macroSurpriseSuite.historySeries}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="monthLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    domain={[-100, 100]}
                    tick={{ fill: chartAxisTick, fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fill: chartAxisTick, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="#64748b" strokeDasharray="3 3" />
                  <Bar
                    yAxisId="left"
                    dataKey="esiGrowthIndex"
                    name="Economic Growth Surprise Index (ESI)"
                    fill="#10b981"
                    barSize={18}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="isiInflationIndex"
                    name="Inflation Surprise Index (ISI)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="posteriorCrisisProbPct"
                    name="Posterior Crisis Prob P(S₁|Z) (%)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Macro Release Calendar Table */}
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Macroeconomic Release</th>
                  <th className="py-2 px-3">Release Window</th>
                  <th className="py-2 px-3 text-right">Prior</th>
                  <th className="py-2 px-3 text-right">Consensus</th>
                  <th className="py-2 px-3 text-right">Actual Print (Interactive)</th>
                  <th className="py-2 px-3 text-right">Std Error σ</th>
                  <th className="py-2 px-3 text-right">Surprise Z-Score</th>
                  <th className="py-2 px-3 text-right">2Y Yield Impact</th>
                  <th className="py-2 px-3 text-right">5Y CDS Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {macroSurpriseSuite.releases.map((r) => (
                  <tr key={r.releaseId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                      {r.indicatorName}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">{r.releaseDateLabel}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                      {r.priorReading.toFixed(2)} {r.unit}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {r.consensusForecast.toFixed(2)} {r.unit}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        value={r.actualReading}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            setMacroActualOverrides((prev) => ({
                              ...prev,
                              [r.releaseId]: val,
                            }));
                          }
                        }}
                        className="w-24 text-right px-2 py-1 rounded border border-indigo-500/40 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      ±{r.forecastStdDevSigma.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        Math.abs(r.standardizedSurpriseZ) >= 1.0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {r.standardizedSurpriseZ > 0 ? '+' : ''}
                      {r.standardizedSurpriseZ.toFixed(2)}σ
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        r.implied2YYieldMoveBps > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {r.implied2YYieldMoveBps > 0 ? '+' : ''}
                      {r.implied2YYieldMoveBps.toFixed(1)} bps
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        r.implied5YCdsMoveBps > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {r.implied5YCdsMoveBps > 0 ? '+' : ''}
                      {r.implied5YCdsMoveBps.toFixed(1)} bps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-WORKSPACE 5.6: CROSS-SOVEREIGN ALPHA CORRELATION MATRIX & EMBI   */}
      {/* ==================================================================== */}
      {currentTab === 'quant_alpha_correlation' && (
        <div className="p-4 space-y-5">
          {/* Answer-First Institutional Conclusion Banner */}
          <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                  5.6 CROSS-SOVEREIGN ALPHA CORRELATION MATRIX & EMBI DIVERSIFICATION ENGINE
                </span>
                <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
                  {alphaCorrSuite.universeCount}×{alphaCorrSuite.universeCount} Sovereign Matrix · Window: {corrRollingWindow} · Stress θ = {corrCrisisStressPct}%
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {alphaCorrSuite.headlineConclusion}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportAlphaCorrelationCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-indigo-500/40 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Matrix & Weights CSV</span>
              </button>
            </div>
          </div>

          {/* Interactive Control Bar: Spread Series Toggle + Rolling Horizon + Crisis Contagion Stress Slider */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* 1. Spread Series Toggle */}
            <div className="lg:col-span-5 space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                1. Sovereign Spread Series Analyzed (bps)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'CDS_5Y_BPS', label: '5Y USD CDS (bps)' },
                    { id: 'EUROBOND_10Y_ZSPREAD_BPS', label: '10Y Bond Z-Spread' },
                    { id: 'RESIDUAL_ALPHA_BPS', label: 'Residual Alpha (β-Adj)' },
                  ] as Array<{ id: SpreadSeriesType; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCorrSpreadSeries(item.id)}
                    className={`px-2.5 py-1.5 rounded text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      corrSpreadSeries === item.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Rolling Window Selector */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
                2. Rolling Correlation Window
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['30D', '90D', '180D', '1Y'] as RollingCorrelationHorizon[]).map((win) => (
                  <button
                    key={win}
                    type="button"
                    onClick={() => setCorrRollingWindow(win)}
                    className={`px-2 py-1.5 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      corrRollingWindow === win
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {win}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Crisis Contagion Compression Slider (Fisher-z tanh transformation) */}
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  3. Stressed Contagion Regime Overlay (θ)
                </span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded ${
                    corrCrisisStressPct >= 50
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : corrCrisisStressPct > 0
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {corrCrisisStressPct === 0
                    ? '0% (Normal Regime)'
                    : `${corrCrisisStressPct}% Stress (Δρ̄ +${alphaCorrSuite.crisisCorrelationJumpDelta.toFixed(2)})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={corrCrisisStressPct}
                  onChange={(e) => setCorrCrisisStressPct(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setCorrCrisisStressPct(corrCrisisStressPct > 0 ? 0 : 75)}
                  className="px-2 py-1 rounded text-[11px] font-mono font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0 cursor-pointer"
                >
                  {corrCrisisStressPct > 0 ? 'Reset 0%' : 'Crisis 75%'}
                </button>
              </div>
            </div>
          </div>

          {/* 4-Card Institutional Diversification & Alpha KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  CHOUEIFATY DIVERSIFICATION RATIO
                </span>
                <StatRefBadge
                  refText={`Choueifaty Diversification Ratio DR = (wᵀσ) / √(wᵀΣw) = ${alphaCorrSuite.choueifatyDiversificationRatio.toFixed(2)}x · Standalone σ̄ = ${alphaCorrSuite.weightedAverageStandaloneVolBps.toFixed(1)} bps vs. Portfolio σ = ${alphaCorrSuite.maxDiversificationPortfolioVolBps.toFixed(1)} bps`}
                />
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {alphaCorrSuite.choueifatyDiversificationRatio.toFixed(2)}x
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (Normal: {alphaCorrSuite.normalDiversificationRatio.toFixed(2)}x)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Standalone σ̄: {alphaCorrSuite.weightedAverageStandaloneVolBps.toFixed(1)} bps → Port σ:{' '}
                {alphaCorrSuite.maxDiversificationPortfolioVolBps.toFixed(1)} bps (−
                {alphaCorrSuite.volatilityReductionVsStandalonePct.toFixed(1)}%)
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  PCA BETA VS. IDIOSYNCRATIC ALPHA
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Eigen-Decomposition
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {alphaCorrSuite.idiosyncraticAlphaVariancePct.toFixed(1)}% Alpha
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  vs. {alphaCorrSuite.pc1GlobalBetaVariancePct.toFixed(1)}% PC1 Beta
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                PC2 Regional/Commodity Factor: {alphaCorrSuite.pc2RegionalFactorVariancePct.toFixed(1)}% of variance
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  BEST EMBI DIVERSIFIER PAIR (MIN ρ)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Orthogonal Pair
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {alphaCorrSuite.bestDiversifierPair.isoA}–{alphaCorrSuite.bestDiversifierPair.isoB} (ρ ={' '}
                  {alphaCorrSuite.bestDiversifierPair.correlation.toFixed(2)})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Spread Diff: {alphaCorrSuite.bestDiversifierPair.spreadDiffBps > 0 ? '+' : ''}
                {alphaCorrSuite.bestDiversifierPair.spreadDiffBps} bps · Max Contagion:{' '}
                {alphaCorrSuite.highestContagionPair.isoA}–{alphaCorrSuite.highestContagionPair.isoB} (
                {alphaCorrSuite.highestContagionPair.correlation.toFixed(2)})
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  EMBI PORTFOLIO VOL COMPRESSION
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold">
                  Max-Div vs. Benchmark
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  −{alphaCorrSuite.volatilityReductionVsBenchmarkBps.toFixed(1)} bps
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({alphaCorrSuite.maxDiversificationPortfolioVolBps.toFixed(1)} vs.{' '}
                  {alphaCorrSuite.embiBenchmarkPortfolioVolBps.toFixed(1)} bps)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Min-Var σ: {alphaCorrSuite.minVariancePortfolioVolBps.toFixed(1)} bps · Equal-Wt σ:{' '}
                {alphaCorrSuite.equalWeightPortfolioVolBps.toFixed(1)} bps
              </p>
            </div>
          </div>

          {/* MAIN WORKBENCH GRID: N x N CORRELATION HEATMAP + PAIRWISE ROLLING TIME-SERIES INSPECTOR */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* LEFT 7 COLS: INTERACTIVE N x N PAIRWISE ROLLING CORRELATION HEATMAP */}
            <div className="xl:col-span-7 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-mono uppercase tracking-wider">
                    Pairwise Sovereign Spread Correlation Matrix R({corrRollingWindow}) — Click Any Cell (i, j) to Inspect Pair
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Emerald cells (ρ ≤ +0.15) denote high-value EMBI portfolio diversifiers; Rose cells (ρ ≥ +0.68) denote contagion clusters.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    ρ ≤ 0.15 Diversifier
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                    0.16–0.42 Mod
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    0.43–0.68 Co-Move
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                    &gt; 0.68 Contagion
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-2 text-left">SOVEREIGN</th>
                      <th className="py-2 px-1.5 text-right">SPREAD</th>
                      <th className="py-2 px-1.5 text-right">VOL (σ)</th>
                      {alphaCorrSuite.matrixRows.map((colHeader) => (
                        <th
                          key={colHeader.iso3}
                          className={`py-2 px-1.5 text-center font-bold ${
                            colHeader.iso3 === run.iso3
                              ? 'text-indigo-600 dark:text-indigo-400 underline'
                              : ''
                          }`}
                        >
                          {colHeader.iso3}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-right">AVG ρ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {alphaCorrSuite.matrixRows.map((row) => (
                      <tr key={row.iso3} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-2 font-sans font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                            {row.iso3}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            {row.countryName}
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 text-right text-slate-700 dark:text-slate-300">
                          {row.activeSpreadBps}bp
                        </td>
                        <td className="py-1.5 px-1.5 text-right text-slate-500 dark:text-slate-400">
                          {row.annualizedSpreadVolBps.toFixed(0)}bp
                        </td>
                        {row.cells.map((cell) => {
                          const isDiagonal = cell.rowIso3 === cell.colIso3;
                          const isSelectedPair =
                            !isDiagonal &&
                            ((cell.rowIso3 === alphaCorrSuite.selectedPairSummary.isoA &&
                              cell.colIso3 === alphaCorrSuite.selectedPairSummary.isoB) ||
                              (cell.rowIso3 === alphaCorrSuite.selectedPairSummary.isoB &&
                                cell.colIso3 === alphaCorrSuite.selectedPairSummary.isoA));

                          const cellBg = isDiagonal
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                            : cell.activeCorrelation <= 0.15
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/35'
                            : cell.activeCorrelation <= 0.42
                            ? 'bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/30'
                            : cell.activeCorrelation <= 0.68
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/35'
                            : 'bg-rose-500/25 text-rose-800 dark:text-rose-200 hover:bg-rose-500/40';

                          return (
                            <td
                              key={`${cell.rowIso3}_${cell.colIso3}`}
                              onClick={() => {
                                if (!isDiagonal) {
                                  setSelectedPairIsoA(cell.rowIso3);
                                  setSelectedPairIsoB(cell.colIso3);
                                }
                              }}
                              title={
                                isDiagonal
                                  ? `${cell.rowCountryName} (${cell.rowIso3}) Diagonal = 1.00`
                                  : `${cell.rowCountryName} (${cell.rowIso3}) vs ${cell.colCountryName} (${cell.colIso3}): ρ = ${cell.activeCorrelation.toFixed(2)} (Normal: ${cell.normalCorrelation.toFixed(2)}, β Hedge = ${cell.betaHedgeRatioRowVsCol.toFixed(2)}x)`
                              }
                              className={`py-1.5 px-1 text-center font-mono text-[11px] font-semibold transition-all ${cellBg} ${
                                isDiagonal ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                isSelectedPair
                                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 font-bold'
                                  : ''
                              }`}
                            >
                              {cell.activeCorrelation.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-bold text-slate-800 dark:text-slate-200">
                          {row.averagePeerCorrelation.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT 5 COLS: PAIRWISE ROLLING CORRELATION TIME-SERIES & REGIME BREAKDOWN INSPECTOR */}
            <div className="xl:col-span-5 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
                    PAIRWISE REGIME BREAKDOWN & COINTEGRATION INSPECTOR
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {alphaCorrSuite.selectedPairSummary.countryA} ({alphaCorrSuite.selectedPairSummary.isoA}) vs.{' '}
                    {alphaCorrSuite.selectedPairSummary.countryB} ({alphaCorrSuite.selectedPairSummary.isoB})
                  </h3>
                </div>

                {/* Quick Pair Selectors */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <select
                    aria-label="Primary Sovereign Pair Leg A"
                    value={alphaCorrSuite.selectedPairSummary.isoA}
                    onChange={(e) => setSelectedPairIsoA(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                  >
                    {alphaCorrSuite.matrixRows.map((r) => (
                      <option key={r.iso3} value={r.iso3}>
                        {r.iso3}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400">vs</span>
                  <select
                    aria-label="Secondary Sovereign Pair Leg B"
                    value={alphaCorrSuite.selectedPairSummary.isoB}
                    onChange={(e) => setSelectedPairIsoB(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                  >
                    {alphaCorrSuite.matrixRows.map((r) => (
                      <option key={r.iso3} value={r.iso3}>
                        {r.iso3}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pair Telemetry Mini-Strip */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="text-[10px] text-slate-500 block">ACTIVE ρ</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {alphaCorrSuite.selectedPairSummary.currentCorrelation.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="text-[10px] text-slate-500 block">MEAN ρ̄</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {alphaCorrSuite.selectedPairSummary.longRunMeanCorrelation.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="text-[10px] text-slate-500 block">SPREAD Z-SCORE</span>
                  <span
                    className={`font-bold ${
                      Math.abs(alphaCorrSuite.selectedPairSummary.spreadDiffZScore) >= 1.15
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {alphaCorrSuite.selectedPairSummary.spreadDiffZScore > 0 ? '+' : ''}
                    {alphaCorrSuite.selectedPairSummary.spreadDiffZScore.toFixed(2)}σ
                  </span>
                </div>
                <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <span className="text-[10px] text-slate-500 block">HEDGE RATIO β</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {alphaCorrSuite.selectedPairSummary.optimalHedgeRatioBeta.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* 24-Point Rolling Correlation & Spread Z-Score Chart */}
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={alphaCorrSuite.pairwiseHistory}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="periodLabel"
                      tick={{ fontSize: 10, fill: chartAxisTick, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      yAxisId="corr"
                      domain={[-0.6, 1.0]}
                      tick={{ fontSize: 10, fill: chartAxisTick, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    />
                    <YAxis
                      yAxisId="zscore"
                      orientation="right"
                      domain={[-3.0, 3.0]}
                      tick={{ fontSize: 10, fill: chartAxisTick, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}σ`}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <ReferenceLine
                      yAxisId="corr"
                      y={alphaCorrSuite.selectedPairSummary.longRunMeanCorrelation}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                    />
                    <Bar
                      yAxisId="zscore"
                      dataKey="spreadDiffZScore"
                      name="Spread Diff Z-Score (σ)"
                      fill="#06b6d4"
                      opacity={0.3}
                    />
                    <Line
                      yAxisId="corr"
                      type="monotone"
                      dataKey="rollingCorrelation"
                      name="Normal Rolling ρ(t)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    {corrCrisisStressPct > 0 && (
                      <Line
                        yAxisId="corr"
                        type="monotone"
                        dataKey="stressedCorrelation"
                        name={`Stressed ρ(t, θ=${corrCrisisStressPct}%)`}
                        stroke="#f43f5e"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-2.5 rounded border border-indigo-500/25 bg-indigo-500/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">
                  [{alphaCorrSuite.selectedPairSummary.pairRegimeSignal.replace(/_/g, ' ')}]:
                </span>
                {alphaCorrSuite.selectedPairSummary.pairTradeRationale}
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: PCA EIGEN-DECOMPOSITION + EMBI MINIMUM-VARIANCE & MAX-DIVERSIFICATION WEIGHT OPTIMIZER */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* LEFT 5 COLS: PRINCIPAL COMPONENT ANALYSIS (PC1 GLOBAL BETA VS IDIOSYNCRATIC ALPHA %) */}
            <div className="xl:col-span-5 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
                  EIGEN-DECOMPOSITION OF SOVEREIGN SPREAD COVARIANCE
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Principal Component Analysis: PC1 Global Beta vs. Idiosyncratic Alpha (%)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Quantifies the % of each sovereign’s spread variance driven by systemic EM beta (PC1), regional/commodity factors (PC2), and pure country-specific alpha.
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={alphaCorrSuite.pcaDecompositionRows}
                    margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="iso3"
                      tick={{ fontSize: 10, fill: chartAxisTick, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: chartAxisTick, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <Bar
                      dataKey="pc1GlobalBetaSharePct"
                      stackId="pca"
                      name="PC1 Global Risk Beta (%)"
                      fill="#6366f1"
                    />
                    <Bar
                      dataKey="pc2RegionalCommoditySharePct"
                      stackId="pca"
                      name="PC2 Regional/Commodity (%)"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="idiosyncraticAlphaSharePct"
                      stackId="pca"
                      name="Idiosyncratic Sovereign Alpha (%)"
                      fill="#10b981"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                      <th className="py-1.5 px-2 text-left">ISO3</th>
                      <th className="py-1.5 px-2 text-right">PC1 BETA %</th>
                      <th className="py-1.5 px-2 text-right">PC2 REG %</th>
                      <th className="py-1.5 px-2 text-right">IDIO ALPHA %</th>
                      <th className="py-1.5 px-2 text-left">REGIME ROLE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {alphaCorrSuite.pcaDecompositionRows.map((p) => (
                      <tr key={p.iso3} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-2 font-bold text-slate-900 dark:text-slate-100">
                          {p.iso3}
                        </td>
                        <td className="py-1.5 px-2 text-right text-indigo-600 dark:text-indigo-400">
                          {p.pc1GlobalBetaSharePct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400">
                          {p.pc2RegionalCommoditySharePct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {p.idiosyncraticAlphaSharePct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              p.alphaClassification === 'PURE_IDIOSYNCRATIC_ALPHA'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : p.alphaClassification === 'REGIONAL_THEMATIC_MOVER'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {p.alphaClassification.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT 7 COLS: MINIMUM-VARIANCE & MAXIMUM-DIVERSIFICATION EMBI WEIGHT OPTIMIZER TABLE (% WEIGHTS) */}
            <div className="xl:col-span-7 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
                    MARKOWITZ MIN-VARIANCE & CHOUEIFATY MAX-DIVERSIFICATION SOLVER
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    EMBI Portfolio Weight Optimizer & Marginal Risk Contribution (% Weights Summing to 100.0%)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Strictly unit/ratio-normalized (% allocation weights and bps spread volatility). Overweights low-correlation sovereigns to maximize the portfolio Diversification Ratio.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-2 text-left">SOVEREIGN</th>
                      <th className="py-2 px-2 text-right">SPREAD / σ</th>
                      <th className="py-2 px-2 text-right">AVG ρ</th>
                      <th className="py-2 px-2 text-right">EMBI BENCH %</th>
                      <th className="py-2 px-2 text-right">EQUAL WT %</th>
                      <th className="py-2 px-2 text-right">MIN-VAR %</th>
                      <th className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                        MAX-DIV %
                      </th>
                      <th className="py-2 px-2 text-right">ACTIVE O/W</th>
                      <th className="py-2 px-2 text-right">RISK CONTRIB %</th>
                      <th className="py-2 px-2 text-left">DESK STANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {alphaCorrSuite.embiWeightRows.map((w) => (
                      <tr key={w.iso3} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-sans font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                            {w.iso3}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            {w.countryName}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {w.activeSpreadBps} / {w.standaloneSpreadVolBps.toFixed(0)}bp
                        </td>
                        <td className="py-2 px-2 text-right font-semibold">
                          {w.averageCorrelationToBook.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {w.embiBenchmarkWeightPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          {w.equalWeightPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-cyan-600 dark:text-cyan-400 font-semibold">
                          {w.minVarianceWeightPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {w.maxDiversificationWeightPct.toFixed(1)}%
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-bold ${
                            w.activeOverweightVsEmbiPct > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : w.activeOverweightVsEmbiPct < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {w.activeOverweightVsEmbiPct > 0 ? '+' : ''}
                          {w.activeOverweightVsEmbiPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                          {w.marginalRiskContributionPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              w.allocationRecommendation === 'CORE_OVERWEIGHT_DIVERSIFIER'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : w.allocationRecommendation === 'UNDERWEIGHT_BETA_CROWDED'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {w.allocationRecommendation === 'CORE_OVERWEIGHT_DIVERSIFIER'
                              ? 'OVERWEIGHT DIVERSIFIER'
                              : w.allocationRecommendation === 'UNDERWEIGHT_BETA_CROWDED'
                              ? 'UNDERWEIGHT BETA'
                              : 'NEUTRAL CARRY'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/80">
                      <td className="py-2 px-2">PORTFOLIO TOTAL / σ</td>
                      <td className="py-2 px-2 text-right">
                        σ̄ = {alphaCorrSuite.weightedAverageStandaloneVolBps.toFixed(1)}bp
                      </td>
                      <td className="py-2 px-2 text-right">
                        ρ̄ = {alphaCorrSuite.averagePairwiseCorrelation.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        100.0% ({alphaCorrSuite.embiBenchmarkPortfolioVolBps.toFixed(1)}bp)
                      </td>
                      <td className="py-2 px-2 text-right">
                        100.0% ({alphaCorrSuite.equalWeightPortfolioVolBps.toFixed(1)}bp)
                      </td>
                      <td className="py-2 px-2 text-right text-cyan-600 dark:text-cyan-400">
                        100.0% ({alphaCorrSuite.minVariancePortfolioVolBps.toFixed(1)}bp)
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                        100.0% ({alphaCorrSuite.maxDiversificationPortfolioVolBps.toFixed(1)}bp)
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                        DR {alphaCorrSuite.choueifatyDiversificationRatio.toFixed(2)}x
                      </td>
                      <td className="py-2 px-2 text-right">100.0%</td>
                      <td className="py-2 px-2 text-[10px] text-emerald-600 dark:text-emerald-400">
                        −{alphaCorrSuite.volatilityReductionVsBenchmarkBps.toFixed(1)} bps vs EMBI
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.7: SOVEREIGN YIELD CURVE & NSS TERM STRUCTURE LAB
         ===================================================================== */}
      {currentTab === 'quant_nss_yield_curve' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & NSS Formula Reference */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                5.7 NELSON-SIEGEL-SVENSSON (NSS) PARAMETRIC TERM STRUCTURE, 12M CARRY+ROLL & BUTTERFLY LAB
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {nssSuite.headlineConclusion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatRefBadge
                refText={`NSS 6-Factor Fit: β₀=${nssSuite.shockedParams.beta0LongRunLevelPct.toFixed(2)}% · β₁=${nssSuite.shockedParams.beta1ShortSlopePct.toFixed(2)}% · β₂=${nssSuite.shockedParams.beta2BellyCurvaturePct.toFixed(2)}% · β₃=${nssSuite.shockedParams.beta3LongConvexityPct.toFixed(2)}% · RMSE=${nssSuite.fittingRmseBps} bps`}
              />
              {onStageTradeTicket && (
                <button
                  type="button"
                  onClick={() => onStageTradeTicket(nssSuite.recommendedCurveTickets[0])}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Stage {nssSuite.optimalCarryRollTenor.tenorLabel} Carry+Roll Ticket
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive NSS Regime Presets & Parameter Shock Sliders */}
          <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 mr-1">
                  Curve Regime Preset:
                </span>
                {(
                  [
                    { id: 'BASELINE', label: 'Baseline NSS Fit' },
                    { id: 'BEAR_STEEPENER', label: 'Bear Steepener (+Term Prem)' },
                    { id: 'BULL_FLATTENER', label: 'Bull Flattener (Disinflation)' },
                    { id: 'MONETARY_PIVOT_RALLY', label: 'Monetary Pivot (2Y Rally)' },
                    {
                      id: 'FISCAL_DOMINANCE_UNANCHORING',
                      label: 'Fiscal Dominance (Long-End Unanchor)',
                    },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setNssPresetRegime(preset.id)}
                    className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                      nssPresetRegime === preset.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNssPresetRegime('BASELINE');
                  setNssLevelShiftBps(0);
                  setNssSlopeShiftBps(0);
                  setNssCurvatureShiftBps(0);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Curve Shocks</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">
                    Parallel Level Shift (Δβ₀):
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {nssLevelShiftBps > 0 ? '+' : ''}
                    {nssLevelShiftBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={5}
                  value={nssLevelShiftBps}
                  onChange={(e) => setNssLevelShiftBps(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">
                    Short-End Slope Shift (Δβ₁):
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {nssSlopeShiftBps > 0 ? '+' : ''}
                    {nssSlopeShiftBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={5}
                  value={nssSlopeShiftBps}
                  onChange={(e) => setNssSlopeShiftBps(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">
                    Belly Hump Curvature (Δβ₂):
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {nssCurvatureShiftBps > 0 ? '+' : ''}
                    {nssCurvatureShiftBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={5}
                  value={nssCurvatureShiftBps}
                  onChange={(e) => setNssCurvatureShiftBps(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 4-Card Term-Structure Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                PEAK 12M CARRY + ROLL-DOWN TENOR
              </span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {nssSuite.optimalCarryRollTenor.tenorLabel} (+
                {nssSuite.optimalCarryRollTenor.totalCarryRoll12MBps} bps/yr)
              </div>
              <span className="text-[11px] text-slate-500">
                Carry {nssSuite.optimalCarryRollTenor.carry12MBps > 0 ? '+' : ''}
                {nssSuite.optimalCarryRollTenor.carry12MBps}bp · Roll{' '}
                {nssSuite.optimalCarryRollTenor.rollDown12MBps > 0 ? '+' : ''}
                {nssSuite.optimalCarryRollTenor.rollDown12MBps}bp
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                MAX BREAKEVEN SELL-OFF CUSHION
              </span>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {nssSuite.optimalBreakevenTenor.tenorLabel} (+
                {nssSuite.optimalBreakevenTenor.breakevenCushionBps} bps/yr)
              </div>
              <span className="text-[11px] text-slate-500">
                ModDur {nssSuite.optimalBreakevenTenor.modifiedDurationYears.toFixed(2)}y
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                2s10s & 5s30s CURVE SLOPES
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                2s10s: {nssSuite.slope2s10sBps > 0 ? '+' : ''}
                {nssSuite.slope2s10sBps} bps
              </div>
              <span className="text-[11px] text-slate-500">
                5s30s: {nssSuite.slope5s30sBps > 0 ? '+' : ''}
                {nssSuite.slope5s30sBps} bps
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                2s5s10s BELLY BUTTERFLY SPREAD
              </span>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {nssSuite.butterfly2s5s10sBps > 0 ? '+' : ''}
                {nssSuite.butterfly2s5s10sBps} bps
              </div>
              <span className="text-[11px] text-slate-500">
                Cheapest vs NSS: {nssSuite.cheapestVsModelTenor.tenorLabel} (+
                {nssSuite.cheapestVsModelTenor.cheapRichResidualBps}bp)
              </span>
            </div>
          </div>

          {/* 2-Column Charts: Left = NSS Fitted Curve vs Market Spot (1Y-30Y) | Right = 12M Carry + Roll-Down Waterfall by Tenor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1Y–30Y Parametric NSS Fitted Curve vs. Market Spot Yields (%)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {nssSuite.curveRegimeClassification}
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={nssSuite.tenorNodes}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="tenorLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: chartAxisTick, fontSize: 11 }}
                      domain={['auto', 'auto']}
                      unit="%"
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="baselineNssYieldPct"
                      name="Baseline NSS Curve (%)"
                      stroke="#94a3b8"
                      strokeWidth={1.75}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="shockedNssYieldPct"
                      name="Active Shocked NSS Curve (%)"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="marketSpotYieldPct"
                      name="Market Spot Benchmark (%)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  12-Month Carry + Roll-Down & Breakeven Sell-Off Cushion by Tenor (bps)
                </h3>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Sweet Spot: {nssSuite.optimalCarryRollTenor.tenorLabel} (+
                  {nssSuite.optimalCarryRollTenor.totalCarryRoll12MBps} bps)
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={nssSuite.tenorNodes}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="tenorLabel" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartAxisTick, fontSize: 11 }} unit="bp" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke={chartAxisTick} />
                    <Bar
                      dataKey="carry12MBps"
                      name="12M Spot Carry (bps)"
                      stackId="cr"
                      fill="#3b82f6"
                      barSize={22}
                    />
                    <Bar
                      dataKey="rollDown12MBps"
                      name="12M Curve Roll-Down (bps)"
                      stackId="cr"
                      fill="#10b981"
                      barSize={22}
                    />
                    <Line
                      type="monotone"
                      dataKey="breakevenCushionBps"
                      name="Breakeven Sell-Off Cushion (bps/yr)"
                      stroke="#f59e0b"
                      strokeWidth={2.25}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full 8-Tenor NSS Term-Structure & Carry+Roll Decomposition Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-500">
                  <th className="py-2 px-3 text-left">TENOR</th>
                  <th className="py-2 px-3 text-right">MARKET SPOT %</th>
                  <th className="py-2 px-3 text-right">NSS FITTED %</th>
                  <th className="py-2 px-3 text-right">CHEAP / RICH (bps)</th>
                  <th className="py-2 px-3 text-right">MOD DURATION</th>
                  <th className="py-2 px-3 text-right">12M CARRY (bps)</th>
                  <th className="py-2 px-3 text-right">12M ROLL-DOWN (bps)</th>
                  <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    TOTAL CARRY+ROLL
                  </th>
                  <th className="py-2 px-3 text-right">BREAKEVEN CUSHION</th>
                  <th className="py-2 px-3 text-left">VALUATION SIGNAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {nssSuite.tenorNodes.map((node) => {
                  const isSweetSpot =
                    node.tenorLabel === nssSuite.optimalCarryRollTenor.tenorLabel;
                  return (
                    <tr
                      key={node.tenorLabel}
                      className={
                        isSweetSpot
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        {node.tenorLabel}{' '}
                        {isSweetSpot && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            ★ SWEET SPOT
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {node.marketSpotYieldPct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                        {node.shockedNssYieldPct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          node.cheapRichResidualBps > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : node.cheapRichResidualBps < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {node.cheapRichResidualBps > 0 ? '+' : ''}
                        {node.cheapRichResidualBps} bps
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        {node.modifiedDurationYears.toFixed(2)}y
                      </td>
                      <td className="py-2 px-3 text-right">
                        {node.carry12MBps > 0 ? '+' : ''}
                        {node.carry12MBps} bps
                      </td>
                      <td className="py-2 px-3 text-right">
                        {node.rollDown12MBps > 0 ? '+' : ''}
                        {node.rollDown12MBps} bps
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {node.totalCarryRoll12MBps > 0 ? '+' : ''}
                        {node.totalCarryRoll12MBps} bps
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {node.breakevenCushionBps > 0 ? '+' : ''}
                        {node.breakevenCushionBps} bps/yr
                      </td>
                      <td className="py-2 px-3 text-[10px] font-bold">
                        <span
                          className={
                            node.valuationSignal === 'CHEAP_OVERWEIGHT'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : node.valuationSignal === 'RICH_UNDERWEIGHT'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }
                        >
                          {node.valuationSignal.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 3 Algorithmic Curve Trade Ideas (Belly Carry+Roll, 2s10s Slope, 2s5s10s Butterfly) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {nssSuite.recommendedCurveTickets.map((ticket) => (
              <div
                key={ticket.ticketId}
                className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>{ticket.direction}</span>
                    <span>CONVICTION {ticket.convictionScore0To100}/100</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {ticket.strategyTitle}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    1: {ticket.leg1Summary}
                  </p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    2: {ticket.leg2Summary}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {ticket.thesisRationale}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{ticket.expected12MCarryRollBps} bps/yr Carry+Roll
                  </span>
                  {onStageTradeTicket && (
                    <button
                      type="button"
                      onClick={() => onStageTradeTicket(ticket)}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                    >
                      + Stage IC Ticket
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.8: REAL-TIME MACRO & CENTRAL BANK CATALYST VOL CALENDAR
         ===================================================================== */}
      {currentTab === 'quant_macro_catalyst_calendar' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                5.8 FORWARD 90-DAY SOVEREIGN MACRO, MPC & IMF CATALYST EVENT VOLATILITY CALENDAR (±BPS)
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {catalystSuite.headlineConclusion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onStageTradeTicket && activeInspectedCatalyst && (
                <button
                  type="button"
                  onClick={() =>
                    onStageTradeTicket(activeInspectedCatalyst.stagedTicketSpec)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold bg-amber-600 text-white hover:bg-amber-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Stage {activeInspectedCatalyst.iso3}{' '}
                    {activeInspectedCatalyst.categoryBadge} Ticket
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar: Scope (All Watchlist vs Active Sovereign) + Category Filter */}
          <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Scope:</span>
              <button
                type="button"
                onClick={() => setCatalystScope('ALL_WATCHLIST')}
                className={`px-2.5 py-1 border ${
                  catalystScope === 'ALL_WATCHLIST'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                All Watchlist Sovereigns ({catalystSuite.events.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalystScope('ACTIVE_SOVEREIGN')}
                className={`px-2.5 py-1 border ${
                  catalystScope === 'ACTIVE_SOVEREIGN'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                Active Sovereign Only ({run.iso3} ·{' '}
                {catalystSuite.activeSovereignEvents.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500">Catalyst Type:</span>
              {(
                [
                  { id: 'ALL', label: 'All Catalysts' },
                  { id: 'MPC_DECISION', label: 'MPC Rate Decisions' },
                  { id: 'CPI_RELEASE', label: 'CPI Prints' },
                  { id: 'IMF_REVIEW', label: 'IMF EFF / DSA' },
                  { id: 'RATING_REVIEW', label: 'Rating Agencies' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatalystCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 border ${
                    catalystCategoryFilter === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2-Column Split: Left 7 Cols = Catalyst Event Schedule Table | Right 5 Cols = Event Volatility & Scenario Tree Inspector */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-500">
                    <th className="py-2 px-2.5 text-left">COUNTDOWN</th>
                    <th className="py-2 px-2.5 text-left">SOVEREIGN / EVENT</th>
                    <th className="py-2 px-2.5 text-right">CONSENSUS</th>
                    <th className="py-2 px-2.5 text-right">ECONQUEST MODEL</th>
                    <th className="py-2 px-2.5 text-right">1D IMPLIED VOL</th>
                    <th className="py-2 px-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {filteredCatalystEvents.map((evt) => {
                    const isSelected =
                      activeInspectedCatalyst?.eventId === evt.eventId;
                    return (
                      <tr
                        key={evt.eventId}
                        onClick={() => setSelectedCatalystEventId(evt.eventId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="font-bold text-amber-600 dark:text-amber-400 block">
                            T−{evt.daysUntilEvent}d
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {evt.eventDateLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {evt.iso3}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {evt.categoryBadge}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs">
                            {evt.eventTitle}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-600 dark:text-slate-400">
                          {evt.consensusEstimateLabel}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-semibold text-slate-900 dark:text-white">
                          {evt.econQuestModelForecastLabel}
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <span className="font-bold text-amber-600 dark:text-amber-400 block">
                            ±{evt.implied1DayYieldVolBps} bps Yield
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ±{evt.implied1DayCdsVolBps} bps CDS
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          {onStageTradeTicket && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStageTradeTicket(evt.stagedTicketSpec);
                              }}
                              className="px-2 py-1 text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                            >
                              + Stage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right 5 Cols: Active Catalyst Scenario Tree & Volatility Envelope Inspector */}
            {activeInspectedCatalyst && (
              <div className="xl:col-span-5 p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                    <span>
                      EVENT VOLATILITY & POST-RELEASE SCENARIO TREE INSPECTOR
                    </span>
                    <span>T−{activeInspectedCatalyst.daysUntilEvent} DAYS</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {activeInspectedCatalyst.eventTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Positioning Skew: {activeInspectedCatalyst.positioningSkewLabel} · Surprise Vector:{' '}
                    {activeInspectedCatalyst.surpriseVectorLabel}
                  </p>
                </div>

                {/* 3-Branch Post-Catalyst Spread Delta Matrix */}
                <div className="grid grid-cols-3 gap-2.5 font-mono text-xs tabular-nums text-center">
                  <div className="p-2.5 border border-emerald-500/30 bg-emerald-500/10">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
                      DOVISH / CONSOLIDATION
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {activeInspectedCatalyst.dovishScenarioSpreadDeltaBps} bps
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Spread Compression
                    </span>
                  </div>
                  <div className="p-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-500 block">
                      ECONQUEST BASELINE
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {activeInspectedCatalyst.baselineScenarioSpreadDeltaBps > 0 ? '+' : ''}
                      {activeInspectedCatalyst.baselineScenarioSpreadDeltaBps} bps
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Expected Drift
                    </span>
                  </div>
                  <div className="p-2.5 border border-rose-500/30 bg-rose-500/10">
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 block">
                      HAWKISH / SLIPPAGE SHOCK
                    </span>
                    <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                      +{activeInspectedCatalyst.hawkishScenarioSpreadDeltaBps} bps
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Spread Widening
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="font-mono text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold">
                    PRE-EVENT TRADING PLAYBOOK & KILL-SWITCH
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {activeInspectedCatalyst.actionablePlaybookText}
                  </p>
                  <p className="text-[11px] font-mono text-amber-700 dark:text-amber-400 pt-1">
                    Kill-Switch: {activeInspectedCatalyst.stagedTicketSpec.preMortemKillSwitchRule}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-WORKSPACE 5.9: PORTFOLIO STRESS-TEST & SCENARIO LAB (EMBI BOOK P&L)
         ===================================================================== */}
      {currentTab === 'quant_portfolio_stress_lab' && (
        <div className="p-4 space-y-4">
          {/* Headline Conclusion & Action Buttons */}
          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                5.9 EMBI MULTI-SOVEREIGN PORTFOLIO BATCH STRESS-TEST & INSTANTANEOUS P&L HIT LAB
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {portfolioStressSuite.headlineConclusion}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatRefBadge
                refText={`Stress PnL Decomposition: ΔPnL_i = w_i · [−SD_i·β_c,i·Δs + ½Conv_i·(Δs)² − (1−h)·LCY_i·β_fx,i·ΔFX − MD_i·Δy_UST + CarryRoll_i]`}
              />
              {onStageTradeTicket && (
                <button
                  type="button"
                  onClick={() =>
                    onStageTradeTicket(
                      portfolioStressSuite.recommendedTailHedgeTicket
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold bg-rose-600 text-white hover:bg-rose-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Stage {portfolioStressSuite.worstHitSovereign.iso3} Tail-Risk Hedge
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportPortfolioStressCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Stress CSV</span>
              </button>
            </div>
          </div>

          {/* Batch Scenario Preset Bar & Portfolio Weight Scheme Selector */}
          <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 mr-1">
                  Batch Stress Scenario Preset:
                </span>
                {EMBI_BATCH_SCENARIO_PRESETS.map((preset) => {
                  const isActive =
                    portfolioStressParams.activePresetId === preset.id &&
                    portfolioStressParams.fxDevaluationShockPct ===
                      preset.fxDevaluationShockPct &&
                    portfolioStressParams.creditSpreadWideningBps ===
                      preset.creditSpreadWideningBps;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectStressPreset(preset.id)}
                      className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                        isActive
                          ? 'bg-rose-600 text-white border-rose-600 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400'
                      }`}
                    >
                      {preset.shortBadge}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">Book Weights:</span>
                {(
                  [
                    { id: 'EMBI_BENCHMARK', label: 'EMBI Benchmark %' },
                    { id: 'MAX_DIVERSIFICATION', label: 'Max-Div %' },
                    { id: 'EQUAL_WEIGHT', label: 'Equal Wt %' },
                  ] as const
                ).map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() =>
                      setPortfolioStressParams((prev) => ({
                        ...prev,
                        weightScheme: scheme.id as EmbiPortfolioWeightScheme,
                      }))
                    }
                    className={`px-2 py-1 border ${
                      portfolioStressParams.weightScheme === scheme.id
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {scheme.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPortfolioStressParams(DEFAULT_EMBI_PORTFOLIO_STRESS_PARAMS)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset (20% FX + 200bp)</span>
                </button>
              </div>
            </div>

            {/* 5 Interactive Joint Shock Vector Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">FX Devaluation Shock:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {portfolioStressParams.fxDevaluationShockPct > 0 ? '−' : '+'}
                    {Math.abs(portfolioStressParams.fxDevaluationShockPct)}% vs USD
                  </span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={50}
                  step={1}
                  value={portfolioStressParams.fxDevaluationShockPct}
                  onChange={(e) =>
                    setPortfolioStressParams((prev) => ({
                      ...prev,
                      fxDevaluationShockPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Credit Spread Shock:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {portfolioStressParams.creditSpreadWideningBps > 0 ? '+' : ''}
                    {portfolioStressParams.creditSpreadWideningBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-120}
                  max={600}
                  step={10}
                  value={portfolioStressParams.creditSpreadWideningBps}
                  onChange={(e) =>
                    setPortfolioStressParams((prev) => ({
                      ...prev,
                      creditSpreadWideningBps: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">US Treasury Shift:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {portfolioStressParams.usTreasuryShiftBps > 0 ? '+' : ''}
                    {portfolioStressParams.usTreasuryShiftBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-150}
                  max={250}
                  step={5}
                  value={portfolioStressParams.usTreasuryShiftBps}
                  onChange={(e) =>
                    setPortfolioStressParams((prev) => ({
                      ...prev,
                      usTreasuryShiftBps: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Commodity ToT Shock:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {portfolioStressParams.commodityShockPct > 0 ? '+' : ''}
                    {portfolioStressParams.commodityShockPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={30}
                  step={5}
                  value={portfolioStressParams.commodityShockPct}
                  onChange={(e) =>
                    setPortfolioStressParams((prev) => ({
                      ...prev,
                      commodityShockPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">FX Forward Hedge Ratio:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {portfolioStressParams.fxHedgeRatioPct}% Hedged
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={portfolioStressParams.fxHedgeRatioPct}
                  onChange={(e) =>
                    setPortfolioStressParams((prev) => ({
                      ...prev,
                      fxHedgeRatioPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* 4-Card Instantaneous Multi-Sovereign Book P&L Hit KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                INSTANTANEOUS NET BOOK P&L HIT
              </span>
              <div
                className={`text-base font-bold mt-0.5 ${
                  portfolioStressSuite.totalBookNetPnlPctNav < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {portfolioStressSuite.totalBookNetPnlPctNav > 0 ? '+' : ''}
                {portfolioStressSuite.totalBookNetPnlPctNav.toFixed(2)}% of NAV (
                {portfolioStressSuite.totalBookNetPnlBps > 0 ? '+' : ''}
                {portfolioStressSuite.totalBookNetPnlBps.toFixed(0)} bps)
              </div>
              <span className="text-[11px] text-slate-500">
                Unhedged (0% FX Hedge): {portfolioStressSuite.unhedgedBookNetPnlPctNav.toFixed(2)}% NAV
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                CREDIT SPREAD VS. FX DEVALUATION SPLIT
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Credit: {portfolioStressSuite.totalBookCreditHitBps.toFixed(0)}bp · FX:{' '}
                {portfolioStressSuite.totalBookFxHitBps.toFixed(0)}bp
              </div>
              <span className="text-[11px] text-slate-500">
                UST Duration Hit: {portfolioStressSuite.totalBookRatesHitBps.toFixed(0)} bps of NAV
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                CARRY+ROLL CUSHION & FX HEDGE SAVINGS
              </span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{portfolioStressSuite.totalBookCarryOffsetBps.toFixed(0)} bps Carry Offset
              </div>
              <span className="text-[11px] text-slate-500">
                Absorbs {portfolioStressSuite.carryBufferCoveragePct.toFixed(1)}% of shock · FX Hedge saved +{portfolioStressSuite.fxHedgeSavedBps}bp
              </span>
            </div>

            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-500 block">
                TOP DRAWDOWN CONTRIBUTOR IN BOOK
              </span>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {portfolioStressSuite.worstHitSovereign.iso3} (
                {portfolioStressSuite.worstHitSovereign.bookWeightedNetPnlPctNav.toFixed(2)}% NAV)
              </div>
              <span className="text-[11px] text-slate-500">
                {portfolioStressSuite.worstHitSovereign.shareOfTotalBookLossPct.toFixed(1)}% of book loss · Wt{' '}
                {portfolioStressSuite.worstHitSovereign.portfolioWeightPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 2-Column Charts: Left = Sovereign-by-Sovereign Instantaneous P&L Hit Attribution (bps of Book NAV) | Right = Simultaneous 6-Scenario Batch Comparison (% NAV) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Instantaneous P&L Hit by Sovereign Sleeve (bps of Total Book NAV)
                </h3>
                <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                  Net Book Hit: {portfolioStressSuite.totalBookNetPnlBps.toFixed(0)} bps
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={portfolioStressSuite.sovereignRows}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="iso3" tick={{ fill: chartAxisTick, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartAxisTick, fontSize: 11 }} unit="bp" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke={chartAxisTick} />
                    <Bar
                      dataKey="bookWeightedCreditHitBps"
                      name="Credit Spread Hit (bps NAV)"
                      stackId="stress"
                      fill="#e11d48"
                      barSize={20}
                    />
                    <Bar
                      dataKey="bookWeightedFxHitBps"
                      name="FX Devaluation Hit (bps NAV)"
                      stackId="stress"
                      fill="#f59e0b"
                      barSize={20}
                    />
                    <Bar
                      dataKey="bookWeightedRatesHitBps"
                      name="UST Rates Hit (bps NAV)"
                      stackId="stress"
                      fill="#6366f1"
                      barSize={20}
                    />
                    <Bar
                      dataKey="bookWeightedCarryOffsetBps"
                      name="Carry+Roll Cushion (+bps NAV)"
                      fill="#10b981"
                      barSize={14}
                    />
                    <Line
                      type="monotone"
                      dataKey="bookWeightedNetPnlBps"
                      name="Net Sleeve P&L Contribution (bps NAV)"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Batch Stress-Test Comparison Across 6 Macro/FX Regimes (% Book NAV)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Click any preset row below to load sliders
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={portfolioStressSuite.batchScenarioRows}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="shockFormulaBadge"
                      tick={{ fill: chartAxisTick, fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: chartAxisTick, fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke={chartAxisTick} />
                    <Bar
                      dataKey="bookCreditHitPctNav"
                      name="Credit Spread Hit (% NAV)"
                      stackId="batch"
                      fill="#e11d48"
                      barSize={22}
                    />
                    <Bar
                      dataKey="bookFxHitPctNav"
                      name="FX Deval Hit (% NAV)"
                      stackId="batch"
                      fill="#f59e0b"
                      barSize={22}
                    />
                    <Bar
                      dataKey="bookRatesHitPctNav"
                      name="UST Rates Hit (% NAV)"
                      stackId="batch"
                      fill="#6366f1"
                      barSize={22}
                    />
                    <Line
                      type="monotone"
                      dataKey="netPortfolioPnlPctNav"
                      name="Net Portfolio P&L (% NAV)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full Multi-Sovereign EMBI Book Instantaneous P&L Hit Attribution Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Multi-Sovereign EMBI Book Instantaneous P&L Hit & Post-Shock Solvency Attribution Table
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Weights sum to 100.0% · All P&L contributions in bps & % of Total Book NAV
              </span>
            </div>
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[10px] text-slate-500">
                  <th className="py-2 px-2.5 text-left">SOVEREIGN</th>
                  <th className="py-2 px-2 text-right">BOOK WT %</th>
                  <th className="py-2 px-2 text-right">MOD DUR</th>
                  <th className="py-2 px-2 text-right">β_CRED / β_FX</th>
                  <th className="py-2 px-2 text-right">EFF SHOCK (FX / Δs)</th>
                  <th className="py-2 px-2 text-right">CREDIT HIT (bp)</th>
                  <th className="py-2 px-2 text-right">FX HIT (bp)</th>
                  <th className="py-2 px-2 text-right">RATES HIT (bp)</th>
                  <th className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                    CARRY OFFSET
                  </th>
                  <th className="py-2 px-2 text-right">NET BOOK P&L</th>
                  <th className="py-2 px-2 text-right">LOSS SHARE %</th>
                  <th className="py-2 px-2 text-right">STRESSED DEBT / CDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {portfolioStressSuite.sovereignRows.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.iso3 === portfolioStressSuite.worstHitSovereign.iso3
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2 px-2.5 font-sans font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                        {row.iso3}
                      </span>
                      <span>{row.countryName}</span>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {row.portfolioWeightPct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right text-slate-500">
                      {row.modifiedDurationYears.toFixed(2)}y
                    </td>
                    <td className="py-2 px-2 text-right text-slate-500">
                      {row.creditBeta.toFixed(2)}x / {row.fxBeta.toFixed(2)}x
                    </td>
                    <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">
                      {row.effectiveFxDevaluationPct > 0 ? '−' : '+'}
                      {Math.abs(row.effectiveFxDevaluationPct).toFixed(1)}% /{' '}
                      {row.effectiveSpreadWideningBps > 0 ? '+' : ''}
                      {row.effectiveSpreadWideningBps}bp
                    </td>
                    <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">
                      {row.bookWeightedCreditHitBps > 0 ? '+' : ''}
                      {row.bookWeightedCreditHitBps.toFixed(1)}bp
                    </td>
                    <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">
                      {row.bookWeightedFxHitBps > 0 ? '+' : ''}
                      {row.bookWeightedFxHitBps.toFixed(1)}bp
                    </td>
                    <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400">
                      {row.bookWeightedRatesHitBps > 0 ? '+' : ''}
                      {row.bookWeightedRatesHitBps.toFixed(1)}bp
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{row.bookWeightedCarryOffsetBps.toFixed(1)}bp
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-bold ${
                        row.bookWeightedNetPnlBps < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {row.bookWeightedNetPnlPctNav > 0 ? '+' : ''}
                      {row.bookWeightedNetPnlPctNav.toFixed(2)}% (
                      {row.bookWeightedNetPnlBps > 0 ? '+' : ''}
                      {row.bookWeightedNetPnlBps.toFixed(0)}bp)
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {row.shareOfTotalBookLossPct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                      {row.postShockDebtToGdpPct.toFixed(1)}% / {row.postShock5YCdsBps}bp
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900">
                  <td className="py-2 px-2.5">EMBI PORTFOLIO TOTAL</td>
                  <td className="py-2 px-2 text-right">100.0%</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td className="py-2 px-2 text-right">
                    {portfolioStressParams.fxDevaluationShockPct > 0 ? '−' : '+'}
                    {Math.abs(portfolioStressParams.fxDevaluationShockPct)}% /{' '}
                    {portfolioStressParams.creditSpreadWideningBps > 0 ? '+' : ''}
                    {portfolioStressParams.creditSpreadWideningBps}bp
                  </td>
                  <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">
                    {portfolioStressSuite.totalBookCreditHitBps.toFixed(1)}bp
                  </td>
                  <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">
                    {portfolioStressSuite.totalBookFxHitBps.toFixed(1)}bp
                  </td>
                  <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400">
                    {portfolioStressSuite.totalBookRatesHitBps.toFixed(1)}bp
                  </td>
                  <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                    +{portfolioStressSuite.totalBookCarryOffsetBps.toFixed(1)}bp
                  </td>
                  <td
                    className={`py-2 px-2 text-right ${
                      portfolioStressSuite.totalBookNetPnlPctNav < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {portfolioStressSuite.totalBookNetPnlPctNav > 0 ? '+' : ''}
                    {portfolioStressSuite.totalBookNetPnlPctNav.toFixed(2)}% (
                    {portfolioStressSuite.totalBookNetPnlBps.toFixed(0)}bp)
                  </td>
                  <td className="py-2 px-2 text-right">100.0%</td>
                  <td className="py-2 px-2 text-right">
                    Worst: {portfolioStressSuite.worstHitSovereign.iso3}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Simultaneous 6-Scenario Batch Stress Matrix Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Simultaneous 6-Regime Batch Stress-Test Summary Matrix
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Click &quot;Load Scenario&quot; on any row to apply its joint shock vector to the active book
              </span>
            </div>
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[10px] text-slate-500">
                  <th className="py-2 px-2.5 text-left">BATCH SCENARIO</th>
                  <th className="py-2 px-2 text-left">SHOCK FORMULA</th>
                  <th className="py-2 px-2 text-right">CREDIT HIT (% NAV)</th>
                  <th className="py-2 px-2 text-right">FX HIT (% NAV)</th>
                  <th className="py-2 px-2 text-right">RATES HIT (% NAV)</th>
                  <th className="py-2 px-2 text-right">CARRY OFFSET</th>
                  <th className="py-2 px-2 text-right">NET BOOK P&L (% NAV)</th>
                  <th className="py-2 px-2 text-right">WORST SOVEREIGN</th>
                  <th className="py-2 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {portfolioStressSuite.batchScenarioRows.map((bRow) => (
                  <tr
                    key={bRow.scenarioId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2 px-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                      {bRow.scenarioLabel}
                    </td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">
                      {bRow.shockFormulaBadge}
                    </td>
                    <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">
                      {bRow.bookCreditHitPctNav > 0 ? '+' : ''}
                      {bRow.bookCreditHitPctNav.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">
                      {bRow.bookFxHitPctNav > 0 ? '+' : ''}
                      {bRow.bookFxHitPctNav.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400">
                      {bRow.bookRatesHitPctNav > 0 ? '+' : ''}
                      {bRow.bookRatesHitPctNav.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">
                      +{bRow.bookCarryOffsetPctNav.toFixed(2)}%
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-bold ${
                        bRow.netPortfolioPnlPctNav < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {bRow.netPortfolioPnlPctNav > 0 ? '+' : ''}
                      {bRow.netPortfolioPnlPctNav.toFixed(2)}% ({bRow.netPortfolioPnlBps.toFixed(0)}bp)
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {bRow.worstHitIso3} ({bRow.worstHitContributionPctNav.toFixed(2)}%)
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectStressPreset(bRow.scenarioId as EmbiStressPresetId)
                        }
                        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
                      >
                        Load Scenario
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

