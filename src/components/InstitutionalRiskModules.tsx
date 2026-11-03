import React, { useMemo, useState } from 'react';
import { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import {
  ShieldAlert,
  TrendingDown,
  Building2,
  Landmark,
  AlertTriangle,
  Sliders,
  RotateCcw,
  Layers,
  Activity,
  Scale,
  ArrowUpRight,
} from 'lucide-react';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface InstitutionalRiskModulesProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  onSelectSovereign: (item: WatchlistItem) => void;
  onOpenPortfolioRiskDesk?: () => void;
}

type SovereignSubView =
  | 'all_sovereign'
  | 'dsa_rollover_peers'
  | 'rating_fallen_angel'
  | 'bank_doom_loop'
  | 'imf_ara_sudden_stop';

interface RatingTierSpec {
  rank: number; // 1 (AAA) to 10 (CCC/D)
  spCode: string;
  moodysCode: string;
  bucket: 'IG_PRIME' | 'IG_CORE' | 'IG_THRESHOLD' | 'HY_SPECULATIVE' | 'DISTRESSED';
  typicalCdsBps: number;
}

const RATING_SCALE: RatingTierSpec[] = [
  { rank: 1, spCode: 'AAA', moodysCode: 'Aaa', bucket: 'IG_PRIME', typicalCdsBps: 18 },
  { rank: 2, spCode: 'AA+', moodysCode: 'Aa1', bucket: 'IG_PRIME', typicalCdsBps: 30 },
  { rank: 3, spCode: 'AA / AA-', moodysCode: 'Aa2 / Aa3', bucket: 'IG_CORE', typicalCdsBps: 48 },
  { rank: 4, spCode: 'A+ / A', moodysCode: 'A1 / A2', bucket: 'IG_CORE', typicalCdsBps: 75 },
  { rank: 5, spCode: 'BBB+', moodysCode: 'Baa1', bucket: 'IG_CORE', typicalCdsBps: 115 },
  { rank: 6, spCode: 'BBB', moodysCode: 'Baa2', bucket: 'IG_THRESHOLD', typicalCdsBps: 155 },
  { rank: 7, spCode: 'BBB-', moodysCode: 'Baa3', bucket: 'IG_THRESHOLD', typicalCdsBps: 205 },
  { rank: 8, spCode: 'BB+ / BB', moodysCode: 'Ba1 / Ba2', bucket: 'HY_SPECULATIVE', typicalCdsBps: 295 },
  { rank: 9, spCode: 'B+ / B', moodysCode: 'B1 / B2', bucket: 'HY_SPECULATIVE', typicalCdsBps: 480 },
  { rank: 10, spCode: 'CCC / SD', moodysCode: 'Caa1 / Ca', bucket: 'DISTRESSED', typicalCdsBps: 850 },
];

export const InstitutionalRiskModules: React.FC<InstitutionalRiskModulesProps> = ({
  run,
  watchlistItems,
  onSelectSovereign,
  onOpenPortfolioRiskDesk,
}) => {
  const open = run.openData;
  const rollover = open.debtRollover;
  const dsa = open.dsaAnalytics;
  const curve = open.yieldCurve;

  const [subView, setSubView] = useState<SovereignSubView>('all_sovereign');

  // Interactive Sovereign Stress Parameters
  const [yieldShockBps, setYieldShockBps] = useState<number>(150);
  const [rolloverFreezePct, setRolloverFreezePct] = useState<number>(45);
  const [m2CapitalFlightPct, setM2CapitalFlightPct] = useState<number>(4.5);
  const [fxRegimeMode, setFxRegimeMode] = useState<'FLOATING' | 'MANAGED_PEG'>('FLOATING');

  const resetStressParams = () => {
    setYieldShockBps(150);
    setRolloverFreezePct(45);
    setM2CapitalFlightPct(4.5);
    setFxRegimeMode('FLOATING');
  };

  // Ensure the active country is always included in the Relative Value Peer Matrix
  const peersWithActive = useMemo(() => {
    const list = [...watchlistItems];
    const hasCurrent = list.some((p) => p.iso3 === run.iso3);
    if (!hasCurrent) {
      list.unshift({
        iso3: run.iso3,
        countryName: run.countryName,
        region: open.region,
        currencyCode: open.currencyCode,
        focusTheme: 'Active Sovereign Target',
        geopoliticalRisk: run.croState.geopoliticalRiskScore,
        sovereignRisk: run.croState.sovereignRiskScore,
        macroRisk: run.croState.macroRiskScore,
        compositeRisk: run.supremeCouncil?.compositeRiskScore || 0.55,
        yield10YPct: open.monetaryAndMarket.sovereign10YBondYieldPct,
        cds5YBps: open.monetaryAndMarket.cds5YSpreadBps,
        debtToGdpPct: open.imfIndicators.debtToGdpPct,
        fxReservesMonths: open.worldBankIndicators.fxReservesMonthsImport,
        alertStatus: 'ELEVATED',
      });
    }
    return list.slice(0, 7);
  }, [watchlistItems, run, open]);

  // =========================================================================
  // NEW ENGINE 1: CREDIT RATING MIGRATION & FALLEN-ANGEL CLIFF MODEL
  // =========================================================================
  const ratingAnalytics = useMemo(() => {
    const baseCds = open.monetaryAndMarket.cds5YSpreadBps;
    const stressedCds = Math.round(baseCds + yieldShockBps * 0.55 + rolloverFreezePct * 1.1);
    const debtGdp = open.imfIndicators.debtToGdpPct;
    const primaryBal = open.imfIndicators.primaryFiscalBalancePct;
    const reservesMonths = open.worldBankIndicators.fxReservesMonthsImport;

    // 1. Official Agency Rating Rank (derived from baseline structural fundamentals)
    const fundamentalScore =
      (debtGdp > 105 ? 2.6 : debtGdp > 75 ? 1.8 : 0.9) +
      (baseCds > 320 ? 3.2 : baseCds > 190 ? 2.1 : baseCds > 100 ? 1.2 : 0.3) +
      (primaryBal < -3.0 ? 1.5 : primaryBal < -1.0 ? 0.8 : 0.2) +
      (reservesMonths < 3.5 ? 1.5 : reservesMonths < 6.0 ? 0.6 : 0.1);

    const agencyRank = Math.max(1, Math.min(10, Math.round(fundamentalScore + 1.2)));
    const agencySpec = RATING_SCALE[agencyRank - 1];

    // 2. Market CDS-Implied Rating Rank (under active stress)
    const cdsImpliedSpec =
      RATING_SCALE.reduce((prev, curr) =>
        Math.abs(curr.typicalCdsBps - stressedCds) < Math.abs(prev.typicalCdsBps - stressedCds)
          ? curr
          : prev
      ) || RATING_SCALE[6];

    // 3. Macro-Fundamental Model Rank (incorporating r-g snowball & external debt)
    const macroRank = Math.max(
      1,
      Math.min(
        10,
        Math.round(
          agencyRank +
            (dsa.rMinusGDifferentialPct > 1.5 ? 1 : 0) +
            (rollover.greenspanGuidottiRatioPct < 110 ? 1 : 0) +
            (yieldShockBps >= 250 ? 1 : 0)
        )
      )
    );
    const macroSpec = RATING_SCALE[macroRank - 1];

    const notchDislocation = agencySpec.rank - cdsImpliedSpec.rank; // negative means market prices worse rating

    // 12-Month Markov Transition Probabilities
    const stressIntensity = Math.min(
      1,
      (yieldShockBps / 400) * 0.5 + (rolloverFreezePct / 100) * 0.35 + run.croState.sovereignRiskScore * 0.35
    );
    const probUpgrade = Math.max(2, Math.round((1 - stressIntensity) * 16));
    const probDowngrade1 = Math.min(48, Math.round(14 + stressIntensity * 28));
    const probDowngrade2Plus = Math.min(35, Math.round(4 + stressIntensity * 24));
    const probDefaultExchange = Math.min(
      28,
      Math.max(1, Math.round((agencyRank >= 8 ? 8 : 2) + stressIntensity * 16))
    );
    const probStable = Math.max(
      8,
      100 - (probUpgrade + probDowngrade1 + probDowngrade2Plus + probDefaultExchange)
    );

    const transitionData = [
      { bucket: '+1 Notch Upgrade', probabilityPct: probUpgrade, color: '#10b981' },
      { bucket: 'Affirm / Stable', probabilityPct: probStable, color: '#3b82f6' },
      { bucket: '-1 Notch Downgrade', probabilityPct: probDowngrade1, color: '#f59e0b' },
      { bucket: '-2+ Notch Cliff', probabilityPct: probDowngrade2Plus, color: '#f97316' },
      { bucket: 'Distressed / CAC', probabilityPct: probDefaultExchange, color: '#ef4444' },
    ];

    // Fallen-Angel (IG -> HY) Forced-Selling Cliff Calculation
    const totalBondStockUsdBn = Math.max(
      45,
      Math.round(rollover.buckets.reduce((acc, b) => acc + b.totalUsdBn, 0) * 2.15)
    );
    const foreignPassiveIgSharePct = agencyRank <= 7 ? 22.5 : 9.5;
    const forcedIndexSellingUsdBn = Number(
      ((totalBondStockUsdBn * (foreignPassiveIgSharePct / 100)) * (0.45 + stressIntensity * 0.45)).toFixed(1)
    );
    const domesticAbsorptionCapacityUsdBn = Number(
      (totalBondStockUsdBn * 0.085 * (1 - yieldShockBps / 800)).toFixed(1)
    );
    const netUnabsorbedOutflowUsdBn = Number(
      Math.max(0, forcedIndexSellingUsdBn - domesticAbsorptionCapacityUsdBn).toFixed(1)
    );
    const fallenAngelYieldSpikeBps = Math.round(
      85 + netUnabsorbedOutflowUsdBn * 6.5 + (agencyRank === 6 || agencyRank === 7 ? 65 : 25)
    );

    return {
      agencySpec,
      cdsImpliedSpec,
      macroSpec,
      stressedCds,
      notchDislocation,
      transitionData,
      totalBondStockUsdBn,
      forcedIndexSellingUsdBn,
      domesticAbsorptionCapacityUsdBn,
      netUnabsorbedOutflowUsdBn,
      fallenAngelYieldSpikeBps,
      fallenAngelProbPct:
        agencyRank <= 7
          ? Math.min(88, Math.round(probDowngrade1 * 0.65 + probDowngrade2Plus + (agencyRank >= 6 ? 18 : 0)))
          : 100,
    };
  }, [open, dsa, rollover, yieldShockBps, rolloverFreezePct, run.croState.sovereignRiskScore]);

  // =========================================================================
  // NEW ENGINE 2: SOVEREIGN-BANK "DOOM LOOP" & FINANCIAL REPRESSION ANALYZER
  // =========================================================================
  const doomLoopAnalytics = useMemo(() => {
    const debtGdp = open.imfIndicators.debtToGdpPct;
    const cpi = open.imfIndicators.cpiInflationPct;
    const yield10Y = open.monetaryAndMarket.sovereign10YBondYieldPct + yieldShockBps / 100;
    const domesticDebtSharePct = Math.max(25, 100 - rollover.foreignHoldingsSharePct);

    // Domestic banking sector sovereign bond holdings (% of total bank assets & % of Tier-1 CET1)
    const bankSovHoldingsPctAssets = Number(
      Math.min(38, Math.max(9.5, (debtGdp * (domesticDebtSharePct / 100)) * 0.28)).toFixed(1)
    );
    const bankSovHoldingsPctCet1 = Number((bankSovHoldingsPctAssets * 11.4).toFixed(0));

    // Split between AFS (mark-to-market) and HTM (held-to-maturity)
    const afsSharePct = 42;
    const htmSharePct = 58;
    const effectiveDurationYears = Math.max(3.2, Math.min(7.8, rollover.weightedAvgMaturityYears * 0.78));

    const totalBankSovPortfolioUsdBn = Number(
      (
        rollover.buckets.reduce((acc, b) => acc + b.totalUsdBn, 0) *
        (domesticDebtSharePct / 100) *
        0.72
      ).toFixed(1)
    );

    // Mark-to-market price drop from yield shock: -Duration * Δy
    const portfolioMtmLossPct = Number(
      ((effectiveDurationYears * (yieldShockBps / 100)) * 0.92).toFixed(2)
    );
    const unrealizedLossUsdBn = Number(
      ((totalBankSovPortfolioUsdBn * portfolioMtmLossPct) / 100).toFixed(1)
    );
    const recognizedAfsLossUsdBn = Number(
      (unrealizedLossUsdBn * (afsSharePct / 100) + (rolloverFreezePct > 60 ? unrealizedLossUsdBn * 0.25 : 0)).toFixed(1)
    );

    const baselineCet1RatioPct = 13.4;
    const cet1ErosionBps = Math.round(
      (portfolioMtmLossPct * (bankSovHoldingsPctCet1 / 100) * (afsSharePct / 100)) * 85
    );
    const stressedCet1RatioPct = Number(
      Math.max(4.8, baselineCet1RatioPct - cet1ErosionBps / 100).toFixed(2)
    );

    // Contingent sovereign bailout cost (% of GDP)
    const recapitalizationCostPctGdp = Number(
      Math.max(
        0,
        ((10.5 - stressedCet1RatioPct) * 0.65) + (cet1ErosionBps / 140)
      ).toFixed(2)
    );
    const postBailoutDebtToGdpPct = Number((debtGdp + recapitalizationCostPctGdp).toFixed(1));
    const doomLoopCdsFeedbackBps = Math.round(recapitalizationCostPctGdp * 28 + cet1ErosionBps * 0.32);

    // Financial Repression Metrics
    const realInterestRepressionPct = Number((yield10Y - cpi).toFixed(2));
    const implicitInflationLiquidationPctGdp = Number(
      Math.max(0, ((cpi - open.monetaryAndMarket.sovereign10YBondYieldPct * 0.6) * (debtGdp / 100)) * 0.35).toFixed(2)
    );

    const tierBreakdownChart = [
      {
        label: 'Baseline CET1',
        cet1Pct: baselineCet1RatioPct,
        thresholdPct: 10.5,
      },
      {
        label: 'AFS Mark-to-Market',
        cet1Pct: Number((baselineCet1RatioPct - (cet1ErosionBps * 0.65) / 100).toFixed(2)),
        thresholdPct: 10.5,
      },
      {
        label: 'Repo Haircut & Funding',
        cet1Pct: stressedCet1RatioPct,
        thresholdPct: 10.5,
      },
      {
        label: 'Forced HTM Liquidation',
        cet1Pct: Number(Math.max(4.2, stressedCet1RatioPct - (cet1ErosionBps * 0.55) / 100).toFixed(2)),
        thresholdPct: 10.5,
      },
    ];

    return {
      bankSovHoldingsPctAssets,
      bankSovHoldingsPctCet1,
      afsSharePct,
      htmSharePct,
      effectiveDurationYears: Number(effectiveDurationYears.toFixed(1)),
      totalBankSovPortfolioUsdBn,
      portfolioMtmLossPct,
      unrealizedLossUsdBn,
      recognizedAfsLossUsdBn,
      baselineCet1RatioPct,
      cet1ErosionBps,
      stressedCet1RatioPct,
      recapitalizationCostPctGdp,
      postBailoutDebtToGdpPct,
      doomLoopCdsFeedbackBps,
      realInterestRepressionPct,
      implicitInflationLiquidationPctGdp,
      tierBreakdownChart,
    };
  }, [open, rollover, yieldShockBps, rolloverFreezePct]);

  // =========================================================================
  // NEW ENGINE 3: IMF ARA RESERVE ADEQUACY & SUDDEN-STOP STRESS TESTER
  // =========================================================================
  const araAnalytics = useMemo(() => {
    const grossReservesUsdBn = rollover.liquidFxReservesUsdBn;
    const stExtDebtUsdBn = rollover.shortTermExternalDebtUsdBn;

    // Estimate Macro Aggregates in USD Bn from existing snapshot ratios
    const estimatedGdpUsdBn = Math.max(
      120,
      Math.round(
        rollover.buckets.reduce((acc, b) => acc + b.totalUsdBn, 0) /
          Math.max(0.22, open.imfIndicators.debtToGdpPct / 100)
      )
    );
    const broadMoneyM2UsdBn = Math.round(estimatedGdpUsdBn * 0.78);
    const annualExportsUsdBn = Math.round(estimatedGdpUsdBn * 0.29);
    const portfolioLiabilitiesUsdBn = Math.round(
      estimatedGdpUsdBn * (open.worldBankIndicators.externalDebtPctGni / 100) * 0.48
    );

    // IMF ARA Official Risk Weights (Floating vs Fixed/Managed Peg)
    const wStDebt = 0.30; // 30% for both regimes
    const wPortfolio = fxRegimeMode === 'FLOATING' ? 0.15 : 0.20;
    const wBroadMoney = fxRegimeMode === 'FLOATING' ? 0.05 : 0.10;
    const wExports = fxRegimeMode === 'FLOATING' ? 0.05 : 0.10;

    const reqStDebtUsdBn = Number((stExtDebtUsdBn * wStDebt).toFixed(1));
    const reqPortfolioUsdBn = Number((portfolioLiabilitiesUsdBn * wPortfolio).toFixed(1));
    const reqBroadMoneyUsdBn = Number((broadMoneyM2UsdBn * wBroadMoney).toFixed(1));
    const reqExportsUsdBn = Number((annualExportsUsdBn * wExports).toFixed(1));

    const totalImfAraRequirementUsdBn = Number(
      (reqStDebtUsdBn + reqPortfolioUsdBn + reqBroadMoneyUsdBn + reqExportsUsdBn).toFixed(1)
    );

    // Deduct encumbered swap lines & required bank FX reserves under stress
    const encumberedReservesUsdBn = Number((grossReservesUsdBn * 0.16).toFixed(1));
    const netUnencumberedReservesUsdBn = Number(
      Math.max(2, grossReservesUsdBn - encumberedReservesUsdBn).toFixed(1)
    );

    const headlineAraRatioPct = Math.round(
      (grossReservesUsdBn / Math.max(1, totalImfAraRequirementUsdBn)) * 100
    );
    const netUsableAraRatioPct = Math.round(
      (netUnencumberedReservesUsdBn / Math.max(1, totalImfAraRequirementUsdBn)) * 100
    );

    // Sudden-Stop Monthly Burn Rate
    const annualRolloverDrainUsdBn = stExtDebtUsdBn * (rolloverFreezePct / 100);
    const annualM2FlightDrainUsdBn = broadMoneyM2UsdBn * (m2CapitalFlightPct / 100);
    const currentAccountDrainUsdBn =
      open.worldBankIndicators.currentAccountPctGdp < 0
        ? Math.abs(open.worldBankIndicators.currentAccountPctGdp / 100) * estimatedGdpUsdBn
        : 0;

    const totalAnnualSuddenStopDrainUsdBn = Number(
      (annualRolloverDrainUsdBn + annualM2FlightDrainUsdBn + currentAccountDrainUsdBn).toFixed(1)
    );
    const monthlySuddenStopBurnUsdBn = Number((totalAnnualSuddenStopDrainUsdBn / 12).toFixed(2));

    const threeMonthImportFloorUsdBn = Number(
      ((grossReservesUsdBn / Math.max(1.5, open.worldBankIndicators.fxReservesMonthsImport)) * 3.0).toFixed(1)
    );

    const monthsToFloorBreach =
      monthlySuddenStopBurnUsdBn > 0
        ? Number(
            Math.max(
              0.5,
              (netUnencumberedReservesUsdBn - threeMonthImportFloorUsdBn) / monthlySuddenStopBurnUsdBn
            ).toFixed(1)
          )
        : 36;

    // 24-Month Reserve Depletion Horizon Curve
    const depletionSeries = Array.from({ length: 9 }, (_, idx) => {
      const month = idx * 3; // M0, M3, M6, ..., M24
      const baselineRes = Number(
        Math.max(
          threeMonthImportFloorUsdBn * 0.8,
          grossReservesUsdBn - month * (currentAccountDrainUsdBn / 24)
        ).toFixed(1)
      );
      const stressedRes = Number(
        Math.max(0, netUnencumberedReservesUsdBn - month * monthlySuddenStopBurnUsdBn).toFixed(1)
      );
      return {
        horizon: `M+${month}`,
        baselineReservesUsdBn: baselineRes,
        stressedReservesUsdBn: stressedRes,
        imfAraThresholdUsdBn: totalImfAraRequirementUsdBn,
        critical3MImportFloorUsdBn: threeMonthImportFloorUsdBn,
      };
    });

    return {
      grossReservesUsdBn,
      netUnencumberedReservesUsdBn,
      encumberedReservesUsdBn,
      reqStDebtUsdBn,
      reqPortfolioUsdBn,
      reqBroadMoneyUsdBn,
      reqExportsUsdBn,
      totalImfAraRequirementUsdBn,
      headlineAraRatioPct,
      netUsableAraRatioPct,
      totalAnnualSuddenStopDrainUsdBn,
      monthlySuddenStopBurnUsdBn,
      threeMonthImportFloorUsdBn,
      monthsToFloorBreach,
      depletionSeries,
    };
  }, [open, rollover, rolloverFreezePct, m2CapitalFlightPct, fxRegimeMode]);

  const showDsaRolloverPeers = subView === 'all_sovereign' || subView === 'dsa_rollover_peers';
  const showRatingFallenAngel = subView === 'all_sovereign' || subView === 'rating_fallen_angel';
  const showBankDoomLoop = subView === 'all_sovereign' || subView === 'bank_doom_loop';
  const showImfAraSuddenStop = subView === 'all_sovereign' || subView === 'imf_ara_sudden_stop';

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SOVEREIGN RISK DESK CONTROL HEADER & INTERACTIVE STRESS BAR
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Tier-1 Sovereign Credit &amp; Balance-of-Payments Desk · Rating Migration, Sovereign-Bank Doom Loop, IMF ARA Adequacy &amp; (r − g) Solvency
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {run.countryName} ({run.iso3}) — Sovereign Debt Sustainability, Rating Cliff &amp; BoP Stress Suite
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex border border-slate-300 dark:border-slate-700 text-xs font-mono">
              <button
                type="button"
                onClick={() => setFxRegimeMode('FLOATING')}
                className={`px-2.5 py-1 transition-colors ${
                  fxRegimeMode === 'FLOATING'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Floating FX Weights
              </button>
              <button
                type="button"
                onClick={() => setFxRegimeMode('MANAGED_PEG')}
                className={`px-2.5 py-1 transition-colors ${
                  fxRegimeMode === 'MANAGED_PEG'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Fixed / Managed Peg Weights
              </button>
            </div>
            <button
              type="button"
              onClick={resetStressParams}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sovereign Stress</span>
            </button>
            {onOpenPortfolioRiskDesk && (
              <button
                type="button"
                onClick={onOpenPortfolioRiskDesk}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                <span>Open Portfolio &amp; CAC Desk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Sovereign Stress Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/70 p-3.5 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Sovereign Yield Curve Shock</span>
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                +{yieldShockBps} bps
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={25}
              value={yieldShockBps}
              onChange={(e) => setYieldShockBps(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>+0 bps Baseline</span>
              <span>+200 bps Rerating</span>
              <span>+500 bps Distress</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>1Y External Debt Rollover Freeze</span>
              </span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                {rolloverFreezePct}% Frozen
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={rolloverFreezePct}
              onChange={(e) => setRolloverFreezePct(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% Full Rollover</span>
              <span>50% Sudden Stop</span>
              <span>100% Market Lockout</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Domestic M2 Deposit Dollarization Flight</span>
              </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {m2CapitalFlightPct.toFixed(1)}% M2 Outflow
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={m2CapitalFlightPct}
              onChange={(e) => setM2CapitalFlightPct(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% Stable Deposits</span>
              <span>5% IMF ARA Weight</span>
              <span>15% Bank Run</span>
            </div>
          </div>
        </div>

        {/* Sub-Desk Module Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'all_sovereign', label: 'Complete Sovereign Risk Suite' },
            { id: 'rating_fallen_angel', label: 'Credit Rating Migration & Fallen-Angel Model' },
            { id: 'bank_doom_loop', label: 'Sovereign-Bank Doom Loop & Repression' },
            { id: 'imf_ara_sudden_stop', label: 'IMF ARA Reserve Adequacy & Sudden-Stop' },
            { id: 'dsa_rollover_peers', label: 'Rollover Ladder, (r − g) DSA & Peer RV' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id as SovereignSubView)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                subView === tab.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          NEW MODULE A: CREDIT RATING MIGRATION & FALLEN-ANGEL CLIFF MODEL
          ===================================================================== */}
      {showRatingFallenAngel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Sovereign Credit Rating Migration Matrix &amp; Fallen-Angel Forced-Selling Cliff ({run.countryName})
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Agency Rating ({ratingAnalytics.agencySpec.spCode}) vs. Stressed CDS-Implied Rating ({ratingAnalytics.cdsImpliedSpec.spCode}) ·{' '}
                {ratingAnalytics.notchDislocation < 0
                  ? `Market Prices ${Math.abs(ratingAnalytics.notchDislocation)} Notch Downgrade Lead`
                  : ratingAnalytics.notchDislocation > 0
                  ? `Trading ${ratingAnalytics.notchDislocation} Notch Rich to Agency Tier`
                  : 'Aligned with Agency Rating'}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
              Stressed 5Y CDS: {ratingAnalytics.stressedCds} bps · Fallen-Angel Risk: {ratingAnalytics.fallenAngelProbPct}%
            </span>
          </div>

          {/* 4-Card Rating Dislocation & Fallen-Angel Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Agency Baseline Rating</span>
              <span className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
                {ratingAnalytics.agencySpec.spCode}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({ratingAnalytics.agencySpec.moodysCode})
                </span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Tier Bucket: {ratingAnalytics.agencySpec.bucket}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">CDS Market-Implied Rating</span>
              <span
                className={`font-mono font-bold text-lg ${
                  ratingAnalytics.cdsImpliedSpec.rank > ratingAnalytics.agencySpec.rank
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {ratingAnalytics.cdsImpliedSpec.spCode}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({ratingAnalytics.notchDislocation > 0 ? '+' : ''}
                  {ratingAnalytics.notchDislocation} notches)
                </span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Macro-Fundamental Implied: {ratingAnalytics.macroSpec.spCode}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">IG-to-HY Forced Index Selling</span>
              <span className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400">
                -${ratingAnalytics.forcedIndexSellingUsdBn}B
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Domestic Absorption: +${ratingAnalytics.domesticAbsorptionCapacityUsdBn}B (Gap: ${ratingAnalytics.netUnabsorbedOutflowUsdBn}B)
              </span>
            </div>

            <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
              <span className="text-red-600 dark:text-red-400 block">Fallen-Angel 10Y Yield Cliff</span>
              <span className="font-mono font-bold text-lg text-red-600 dark:text-red-400">
                +{ratingAnalytics.fallenAngelYieldSpikeBps} bps
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                WGBI / EMBI IG Mandate Exclusion Impact
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* 12-Month Markov Transition Probability Bar Chart (6 cols) */}
            <div className="xl:col-span-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  12-Month Markov Credit Rating Transition Distribution (%)
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Conditioned on +{yieldShockBps}bp Shock
                </span>
              </div>
              <div className="space-y-3 pt-1">
                {ratingAnalytics.transitionData.map((entry) => (
                  <div key={entry.bucket} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {entry.bucket}
                      </span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {entry.probabilityPct}%
                      </span>
                    </div>
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(100, entry.probabilityPct * 1.6)}%`,
                          backgroundColor: entry.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating Scale Ladder & Fallen-Angel Exclusion Threshold Table (6 cols) */}
            <div className="xl:col-span-6 overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3">Rating Tier (S&amp;P / Moody&apos;s)</th>
                    <th className="py-2 px-3">Mandate Bucket</th>
                    <th className="py-2 px-3 text-right">Par 5Y CDS</th>
                    <th className="py-2 px-3 text-center">Active Positioning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {RATING_SCALE.filter((r) =>
                    [2, 4, 5, 6, 7, 8, 9, 10].includes(r.rank)
                  ).map((tier) => {
                    const isAgency = tier.rank === ratingAnalytics.agencySpec.rank;
                    const isMarket = tier.rank === ratingAnalytics.cdsImpliedSpec.rank;
                    const isIgCliff = tier.rank === 7; // BBB- / Baa3
                    return (
                      <tr
                        key={tier.rank}
                        className={
                          isAgency || isMarket
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 font-semibold'
                            : isIgCliff
                            ? 'bg-amber-50/30 dark:bg-amber-950/15'
                            : ''
                        }
                      >
                        <td className="py-2 px-3 font-mono text-slate-900 dark:text-slate-100">
                          {tier.spCode} <span className="text-slate-400">({tier.moodysCode})</span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                          {tier.rank === 7 ? 'BBB- IG CLIFF THRESHOLD' : tier.bucket}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-700 dark:text-slate-300">
                          {tier.typicalCdsBps} bps
                        </td>
                        <td className="py-2 px-3 text-center space-x-1">
                          {isAgency && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-blue-600 text-white">
                              AGENCY
                            </span>
                          )}
                          {isMarket && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-red-600 text-white">
                              CDS IMPLIED
                            </span>
                          )}
                          {!isAgency && !isMarket && (
                            <span className="text-[10px] font-mono text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <StatRefBadge
            refText={`Statistical Reference: S&P / Moody's / Fitch 20-Notch Sovereign Scale · Implied Notch Dislocation ${ratingAnalytics.notchDislocation > 0 ? '+' : ''}${ratingAnalytics.notchDislocation} Notches · Fallen-Angel Prob ${ratingAnalytics.fallenAngelProbPct}%`}
          />
        </div>
      )}

      {/* =====================================================================
          NEW MODULE B: SOVEREIGN-BANK "DOOM LOOP" & FINANCIAL REPRESSION ANALYZER
          ===================================================================== */}
      {showBankDoomLoop && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>
                  Sovereign-Bank &quot;Doom Loop&quot; Nexus, Tier-1 Capital Contagion &amp; Financial Repression Analyzer ({run.countryName})
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Domestic Banks Hold ${doomLoopAnalytics.totalBankSovPortfolioUsdBn}B Sovereign Debt ({doomLoopAnalytics.bankSovHoldingsPctAssets}% Assets / {doomLoopAnalytics.bankSovHoldingsPctCet1}% CET1) · +{yieldShockBps}bp Shock Erodes -{doomLoopAnalytics.cet1ErosionBps} bps CET1
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0">
              Contingent Bank Bailout: +{doomLoopAnalytics.recapitalizationCostPctGdp}% GDP · CDS Feedback: +{doomLoopAnalytics.doomLoopCdsFeedbackBps} bps
            </span>
          </div>

          {/* 4-Card Sovereign-Bank Contagion Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Bank Sovereign Bond Exposure</span>
              <span className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
                {doomLoopAnalytics.bankSovHoldingsPctAssets}% Assets
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {doomLoopAnalytics.bankSovHoldingsPctCet1}% of Tier-1 CET1 (${doomLoopAnalytics.totalBankSovPortfolioUsdBn}B)
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Unrealized Mark-to-Market Loss</span>
              <span className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400">
                -${doomLoopAnalytics.unrealizedLossUsdBn}B ({doomLoopAnalytics.portfolioMtmLossPct}%)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                AFS Book: {doomLoopAnalytics.afsSharePct}% · HTM Book: {doomLoopAnalytics.htmSharePct}% (Dur: {doomLoopAnalytics.effectiveDurationYears}y)
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">Stressed Banking CET1 Ratio</span>
              <span
                className={`font-mono font-bold text-lg ${
                  doomLoopAnalytics.stressedCet1RatioPct < 10.5
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {doomLoopAnalytics.stressedCet1RatioPct}%{' '}
                <span className="text-xs font-normal text-slate-500">
                  (vs {doomLoopAnalytics.baselineCet1RatioPct}% Base)
                </span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Regulatory Buffer Floor: 10.50% CET1
              </span>
            </div>

            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
              <span className="text-purple-700 dark:text-purple-300 block">Post-Bailout Sovereign Debt/GDP</span>
              <span className="font-mono font-bold text-lg text-purple-700 dark:text-purple-300">
                {doomLoopAnalytics.postBailoutDebtToGdpPct}% GDP
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                +{doomLoopAnalytics.recapitalizationCostPctGdp}% GDP Contingent Liability Transfer
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* CET1 Capital Erosion Cascade Chart (6 cols) */}
            <div className="xl:col-span-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Domestic Banking Sector CET1 Ratio Under Sovereign Yield Shock (%)
                </div>
                <span className="text-[11px] font-mono text-red-500">
                  10.5% Basel III Hurdle
                </span>
              </div>
              <div className="space-y-3 pt-1">
                {doomLoopAnalytics.tierBreakdownChart.map((entry, idx) => {
                  const breached = entry.cet1Pct < 10.5;
                  return (
                    <div key={entry.label} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {entry.label}
                        </span>
                        <span
                          className={`font-bold tabular-nums ${
                            breached
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {entry.cet1Pct.toFixed(2)}% CET1 {breached ? ' (BREACH <10.5%)' : ''}
                        </span>
                      </div>
                      <div className="relative h-4 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, (entry.cet1Pct / 16) * 100)}%`,
                            backgroundColor: breached
                              ? '#ef4444'
                              : idx === 0
                              ? '#3b82f6'
                              : '#f59e0b',
                          }}
                        />
                        {/* 10.5% Minimum CET1 Marker */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                          style={{ left: `${(10.5 / 16) * 100}%` }}
                          title="10.5% Basel III Regulatory Hurdle"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Repression & Captive Demand Breakdown (6 cols) */}
            <div className="xl:col-span-6 space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Financial Repression &amp; Captive Domestic Absorption Channels
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-sans text-slate-500 block">
                      Real 10Y Yield (Nominal − CPI)
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        doomLoopAnalytics.realInterestRepressionPct < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {doomLoopAnalytics.realInterestRepressionPct > 0 ? '+' : ''}
                      {doomLoopAnalytics.realInterestRepressionPct}%
                    </span>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      {doomLoopAnalytics.realInterestRepressionPct < 0
                        ? 'Negative Real Rate Repression Active'
                        : 'Positive Real Bond Compensation'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-sans text-slate-500 block">
                      Inflation Debt Liquidation Transfer
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {doomLoopAnalytics.implicitInflationLiquidationPctGdp}% GDP / yr
                    </span>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Implicit Real Bondholder Haircut
                    </span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>
                    • <strong>HTM Accounting Shield vs. Liquidity Run:</strong> While{' '}
                    <span className="font-mono font-semibold">{doomLoopAnalytics.htmSharePct}%</span> of domestic bank sovereign holdings sit in Held-to-Maturity (HTM) buckets, a{' '}
                    <span className="font-mono font-semibold">{m2CapitalFlightPct.toFixed(1)}%</span> M2 deposit outflow forces banks to pledge underwater HTM bonds at central bank discount facilities with widened repo haircuts.
                  </li>
                  <li>
                    • <strong>Two-Way Sovereign-Bank Feedback:</strong> A{' '}
                    <span className="font-mono font-semibold">+{yieldShockBps} bps</span> sovereign yield spike inflicts{' '}
                    <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                      -${doomLoopAnalytics.unrealizedLossUsdBn}B
                    </span>{' '}
                    in portfolio losses, adding{' '}
                    <span className="font-mono font-semibold">
                      +{doomLoopAnalytics.doomLoopCdsFeedbackBps} bps
                    </span>{' '}
                    of secondary contagion to 5Y Sovereign CDS.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <StatRefBadge
            refText={`Statistical Reference: Sovereign-Bank Doom Loop & Basel III CET1 Stress · Bank Sov Holdings ${doomLoopAnalytics.bankSovHoldingsPctCet1}% CET1 · CET1 Depletion -${doomLoopAnalytics.cet1ErosionBps} bps · Stressed CET1 ${doomLoopAnalytics.stressedCet1RatioPct}% (10.5% Hurdle)`}
          />
        </div>
      )}

      {/* =====================================================================
          NEW MODULE C: IMF ARA RESERVE ADEQUACY & SUDDEN-STOP STRESS TESTER
          ===================================================================== */}
      {showImfAraSuddenStop && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  IMF Assessing Reserve Adequacy (ARA) Decomposition &amp; Capital-Account Sudden-Stop Stress Tester ({run.countryName})
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                IMF ARA Composite Coverage: {araAnalytics.headlineAraRatioPct}% Headline ({araAnalytics.netUsableAraRatioPct}% Net Unencumbered) vs. 100%–150% IMF Safe Zone
              </h3>
            </div>
            <span
              className={`text-xs font-mono font-bold shrink-0 ${
                araAnalytics.monthsToFloorBreach < 12
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Sudden-Stop Burn: -${araAnalytics.monthlySuddenStopBurnUsdBn}B/mo · 3M Import Floor Breach: {araAnalytics.monthsToFloorBreach} Months
            </span>
          </div>

          {/* 4-Pillar IMF ARA Requirement Decomposition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">1. ST External Debt (30% Weight)</span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                ${araAnalytics.reqStDebtUsdBn}B Required
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Rollover Risk on ${rollover.shortTermExternalDebtUsdBn}B 1Y Debt
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">
                2. Broad Money M2 ({fxRegimeMode === 'FLOATING' ? '5%' : '10%'} Weight)
              </span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                ${araAnalytics.reqBroadMoneyUsdBn}B Required
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Resident Deposit Capital Flight Buffer
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">
                3. Portfolio Liabilities ({fxRegimeMode === 'FLOATING' ? '15%' : '20%'} Weight)
              </span>
              <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                ${araAnalytics.reqPortfolioUsdBn}B Required
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Non-Resident Equity &amp; Bond Outflow Buffer
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block">
                4. Export Drop ({fxRegimeMode === 'FLOATING' ? '5%' : '10%'} Weight) &amp; Total ARA
              </span>
              <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                ${araAnalytics.totalImfAraRequirementUsdBn}B Total ARA
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Net Usable Reserves: ${araAnalytics.netUnencumberedReservesUsdBn}B (Ex-${araAnalytics.encumberedReservesUsdBn}B Encumbered)
              </span>
            </div>
          </div>

          {/* 24-Month FX Reserve Depletion Horizon Curve (Precision Native SVG) */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                24-Month FX Reserve Depletion Trajectory: Baseline vs. Capital-Account Sudden-Stop ($B)
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Annual Sudden-Stop Outflow: -${araAnalytics.totalAnnualSuddenStopDrainUsdBn}B/yr ({rolloverFreezePct}% Rollover Freeze + {m2CapitalFlightPct.toFixed(1)}% M2 Flight)
              </span>
            </div>

            {(() => {
              const svgW = 780;
              const svgH = 210;
              const padL = 48;
              const padR = 24;
              const padT = 18;
              const padB = 28;
              const maxVal = Math.max(
                araAnalytics.grossReservesUsdBn * 1.15,
                araAnalytics.totalImfAraRequirementUsdBn * 1.15,
                10
              );
              const toX = (i: number) =>
                padL + (i / (araAnalytics.depletionSeries.length - 1)) * (svgW - padL - padR);
              const toY = (v: number) =>
                padT + (1 - Math.max(0, Math.min(maxVal, v)) / maxVal) * (svgH - padT - padB);

              const basePts = araAnalytics.depletionSeries
                .map((d, i) => `${toX(i).toFixed(1)},${toY(d.baselineReservesUsdBn).toFixed(1)}`)
                .join(' ');
              const stressPts = araAnalytics.depletionSeries
                .map((d, i) => `${toX(i).toFixed(1)},${toY(d.stressedReservesUsdBn).toFixed(1)}`)
                .join(' ');
              const araY = toY(araAnalytics.totalImfAraRequirementUsdBn);
              const floorY = toY(araAnalytics.threeMonthImportFloorUsdBn);

              return (
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-56 bg-slate-950 border border-slate-800"
                >
                  {[0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = padT + (1 - frac) * (svgH - padT - padB);
                    const val = Math.round(maxVal * frac);
                    return (
                      <g key={frac}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={svgW - padR}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[10px] font-mono fill-slate-400"
                        >
                          ${val}B
                        </text>
                      </g>
                    );
                  })}

                  {/* 100% IMF ARA Benchmark Line */}
                  <line
                    x1={padL}
                    y1={araY}
                    x2={svgW - padR}
                    y2={araY}
                    stroke="#3b82f6"
                    strokeWidth={1.3}
                    strokeDasharray="5 3"
                  />
                  <text
                    x={svgW - padR - 4}
                    y={araY - 4}
                    textAnchor="end"
                    className="text-[9.5px] font-mono fill-blue-400"
                  >
                    100% IMF ARA (${araAnalytics.totalImfAraRequirementUsdBn}B)
                  </text>

                  {/* 3M Import Cover Crisis Floor Line */}
                  <line
                    x1={padL}
                    y1={floorY}
                    x2={svgW - padR}
                    y2={floorY}
                    stroke="#ef4444"
                    strokeWidth={1.3}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={svgW - padR - 4}
                    y={floorY - 4}
                    textAnchor="end"
                    className="text-[9.5px] font-mono fill-red-400"
                  >
                    3M Import Floor (${araAnalytics.threeMonthImportFloorUsdBn}B)
                  </text>

                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    points={basePts}
                  />
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2.4}
                    points={stressPts}
                  />

                  {araAnalytics.depletionSeries.map((d, i) => (
                    <g key={d.horizon}>
                      <circle
                        cx={toX(i)}
                        cy={toY(d.baselineReservesUsdBn)}
                        r={3}
                        fill="#10b981"
                      />
                      <circle
                        cx={toX(i)}
                        cy={toY(d.stressedReservesUsdBn)}
                        r={3.5}
                        fill="#ef4444"
                      />
                      <text
                        x={toX(i)}
                        y={svgH - 8}
                        textAnchor="middle"
                        className="text-[10px] font-mono fill-slate-400"
                      >
                        {d.horizon}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>

          <StatRefBadge
            refText={`Statistical Reference: IMF ARA (Assessing Reserve Adequacy) Metric · Headline ARA ${araAnalytics.headlineAraRatioPct}% · Net Unencumbered ARA ${araAnalytics.netUsableAraRatioPct}% · FXI Burn -${araAnalytics.monthlySuddenStopBurnUsdBn}B/mo (${araAnalytics.monthsToFloorBreach}m to 3M Floor)`}
          />
        </div>
      )}

      {/* =====================================================================
          EXISTING MODULES: RELATIVE VALUE PEER MATRIX, DEBT ROLLOVER WALL, (r - g) DSA,
          YIELD CURVE TERM STRUCTURE, 90-DAY CATALYST RADAR & FACTOR BETA MATRIX
          ===================================================================== */}
      {showDsaRolloverPeers && (
        <>
          {/* MODULE 1: CROSS-SOVEREIGN RELATIVE VALUE & PEER COMPARISON MATRIX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Cross-Sovereign Relative Value &amp; Peer Benchmarking Matrix
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Sovereign Spread, Fiscal Burden &amp; Reserve Adequacy Peer Table
                </h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click any sovereign row to switch active terminal telemetry
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Sovereign</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Composite Risk</th>
                    <th className="py-2.5 px-3 font-semibold text-right">10Y Bond Yield</th>
                    <th className="py-2.5 px-3 font-semibold text-right">5Y CDS Spread</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Gross Debt / GDP</th>
                    <th className="py-2.5 px-3 font-semibold text-right">FX Reserves</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Yield / Risk Ratio</th>
                    <th className="py-2.5 px-3 font-semibold">Relative Value Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {peersWithActive.map((peer) => {
                    const isCurrent = peer.iso3 === run.iso3;
                    const yieldToRisk = (peer.yield10YPct / Math.max(0.15, peer.compositeRisk)).toFixed(1);
                    const rvSignal =
                      peer.cds5YBps > 250 && peer.fxReservesMonths < 4.5
                        ? 'Underweight / Buy CDS Protection'
                        : peer.yield10YPct >= 6.0 && peer.fxReservesMonths >= 5.5
                        ? 'Overweight Local Carry (Hedged)'
                        : 'Neutral / Curve Steepener';

                    return (
                      <tr
                        key={peer.iso3}
                        onClick={() => {
                          if (!isCurrent) onSelectSovereign(peer);
                        }}
                        className={`transition-colors ${
                          isCurrent
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">
                          {peer.countryName} ({peer.iso3}){' '}
                          <span className="text-slate-400 font-mono">{peer.currencyCode}</span>
                          {isCurrent && (
                            <span className="ml-2 text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                              [ACTIVE]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900 dark:text-slate-100">
                          {peer.compositeRisk.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900 dark:text-slate-100">
                          {peer.yield10YPct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-amber-600 dark:text-amber-400">
                          {peer.cds5YBps} bps
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-800 dark:text-slate-200">
                          {peer.debtToGdpPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                          {peer.fxReservesMonths.toFixed(1)}m
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-blue-600 dark:text-blue-400">
                          {yieldToRisk}x
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {rvSignal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODULE 2 & MODULE 3: DEBT ROLLOVER MATURITY WALL + IMF (r - g) DEBT SUSTAINABILITY ENGINE */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Sovereign Debt Rollover & Maturity Wall Ladder (7 cols) */}
            <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Redemption Schedule &amp; Greenspan-Guidotti Liquidity Audit ({run.countryName})
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Sovereign Debt Rollover &amp; Maturity Wall Ladder
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <RichTextWithStatRefs text={rollover.rolloverVerdict} />
                </p>
              </div>

              {/* 4 Key Rollover Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Greenspan-Guidotti Ratio</span>
                  <span className="font-mono font-bold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                    {rollover.greenspanGuidottiRatioPct}%
                  </span>
                  <span className="text-[11px] text-slate-400 block">Reserves / 1Y ST Ext Debt</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Liquid FX Reserves</span>
                  <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-slate-100">
                    ${rollover.liquidFxReservesUsdBn}B
                  </span>
                  <span className="text-[11px] text-slate-400 block">vs ${rollover.shortTermExternalDebtUsdBn}B 1Y Ext Wall</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Floating-Rate Share</span>
                  <span className="font-mono font-bold text-sm tabular-nums text-amber-600 dark:text-amber-400">
                    {rollover.floatingRateDebtSharePct}%
                  </span>
                  <span className="text-[11px] text-slate-400 block">Immediate CB Rate Pass-Through</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Avg Debt Maturity</span>
                  <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-slate-100">
                    {rollover.weightedAvgMaturityYears} yrs
                  </span>
                  <span className="text-[11px] text-slate-400 block">Foreign Share: {rollover.foreignHoldingsSharePct}%</span>
                </div>
              </div>

              {/* Stacked Bar Ladder of Upcoming Redemptions */}
              <div className="space-y-2.5 pt-1">
                {rollover.buckets.map((b) => {
                  const totalPct = Number((b.domesticLocalPctGdp + b.externalHardCurrencyPctGdp).toFixed(1));
                  const domWidth = Math.min(82, b.domesticLocalPctGdp * 4.2);
                  const extWidth = Math.min(18, b.externalHardCurrencyPctGdp * 4.2);
                  return (
                    <div key={b.periodLabel} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono tabular-nums">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.periodLabel} {b.isPeakRollover ? '· Peak Rollover Window' : ''}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Total: {totalPct}% GDP (${b.totalUsdBn}B) · Avg Coupon {b.avgCouponPct}%
                        </span>
                      </div>
                      <div className="h-3.5 bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${domWidth}%` }}
                          title={`Domestic Local-Currency Rollover: ${b.domesticLocalPctGdp}% GDP`}
                        />
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${extWidth}%` }}
                          title={`External Hard-Currency (USD/EUR) Maturity: ${b.externalHardCurrencyPctGdp}% GDP`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-6 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Blue Bar: Domestic Local-Currency Maturities (% GDP)</span>
                  <span>Amber Bar: External Hard-Currency USD/EUR Maturities (% GDP)</span>
                </div>
              </div>
            </div>

            {/* IMF-Standard (r - g) Debt Sustainability Engine & Yield Curve Term Structure (5 cols) */}
            <div className="xl:col-span-5 space-y-6">
              {/* Module 3: IMF (r - g) Debt Sustainability Calculator */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    IMF Solvency Identity: pb* = ((r − g) / (1 + g)) × Debt/GDP
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    Debt Sustainability (r − g) &amp; Fiscal Consolidation Gap
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-sans block text-[11px]">Real Interest (r)</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      +{dsa.effectiveRealInterestRatePct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-sans block text-[11px]">Real Growth (g)</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{dsa.realGdpGrowthRatePct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-sans block text-[11px]">Snowball (r − g)</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      +{dsa.rMinusGDifferentialPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-sans block text-[11px]">Stabilizing pb*</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      +{dsa.debtStabilizingPrimaryBalancePct.toFixed(2)}% GDP
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-sans block text-[11px]">Actual Primary pb</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {dsa.actualPrimaryBalancePct > 0 ? '+' : ''}
                      {dsa.actualPrimaryBalancePct.toFixed(2)}% GDP
                    </span>
                  </div>
                  <div className="p-2.5 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                    <span className="text-red-600 dark:text-red-400 font-sans block text-[11px]">Fiscal Effort Gap</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {dsa.fiscalConsolidationGapPct > 0 ? '+' : ''}
                      {dsa.fiscalConsolidationGapPct.toFixed(2)}% GDP
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <RichTextWithStatRefs text={dsa.dsaInterpretation} />
                </p>

                <StatRefBadge
                  refText={`Statistical Reference: IMF Solvency Identity pb* = ((r − g)/(1 + g)) × Debt/GDP · r − g = +${dsa.rMinusGDifferentialPct.toFixed(2)}% · pb* = +${dsa.debtStabilizingPrimaryBalancePct.toFixed(2)}% GDP · Fiscal Gap ${dsa.fiscalConsolidationGapPct > 0 ? '+' : ''}${dsa.fiscalConsolidationGapPct.toFixed(2)}% GDP`}
                />
              </div>

              {/* Module 4: Sovereign Yield Curve Term-Structure (3M to 30Y) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Sovereign Yield Curve Term-Structure &amp; Basis
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {curve.curveRegimeLabel}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    2s10s: {curve.slope2s10sBps > 0 ? '+' : ''}
                    {curve.slope2s10sBps} bps
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1.5 text-center font-mono tabular-nums text-xs">
                  {curve.tenors.map((t) => (
                    <div
                      key={t.tenor}
                      className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-[11px] text-slate-400">{t.tenor}</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {t.currentYieldPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        +{((t.currentYieldPct - t.prior90DYieldPct) * 100).toFixed(0)}bp
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <RichTextWithStatRefs text={curve.localVsUsdBasisSummary} />
                </p>
              </div>
            </div>
          </div>

          {/* MODULE 5 & MODULE 6: 90-DAY CATALYST CALENDAR + GLOBAL FACTOR SENSITIVITY MATRIX */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Module 5: 90-Day Institutional Catalyst & Event Horizon Radar */}
            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Forward 90-Day Event Risk Schedule ({run.countryName})
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Institutional Catalyst, Central Bank &amp; Rating Review Calendar
                </h3>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {open.catalystCalendar.map((ev) => (
                  <div key={ev.eventId} className="py-3 first:pt-1 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {ev.title}
                      </span>
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                        {ev.dateLabel} · {ev.impliedVolatilityImpact}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>Consensus:</strong> {ev.consensusExpectation}
                    </div>
                    <div className="text-red-600 dark:text-red-400">
                      <strong>Tail Risk Scenario:</strong> {ev.tailRiskScenario}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 6: Global Macro Factor Beta & Cross-Asset Sensitivity Matrix */}
            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Cross-Border Spillover Elasticities (1-Standard-Deviation Shock Impact)
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Global Macro Factor Beta &amp; Sensitivity Matrix ({run.iso3})
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-3 font-semibold">Global Factor Shock</th>
                      <th className="py-2 px-3 font-semibold text-right">10Y Local Yield</th>
                      <th className="py-2 px-3 font-semibold text-right">Spot FX</th>
                      <th className="py-2 px-3 font-semibold text-right">5Y CDS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {open.factorBetas.map((fb, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {fb.factorName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {fb.transmissionChannel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-amber-600 dark:text-amber-400 font-semibold">
                          +{fb.local10YYieldImpactBps} bps
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-red-600 dark:text-red-400 font-semibold">
                          {fb.spotFxImpactPct}%
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-800 dark:text-slate-200 font-semibold">
                          +{fb.cds5YImpactBps} bps
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
