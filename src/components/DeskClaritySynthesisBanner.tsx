import React from 'react';
import { CouncilAssessmentRun, UserPersonaId } from '../types/council';
import { Sparkles, ArrowRight, Eye, Layers } from 'lucide-react';
import { DataProvenanceBadge } from './RealTimeDataProvenanceOverlay';
import { StatRefBadge } from './StatRefTooltip';
import { coherenceText } from '../utils/councilResult';

export type WorkspaceDensityMode = 'SIMPLE_BRIEF' | 'PRO_QUANT';

interface DeskClaritySynthesisBannerProps {
  run: CouncilAssessmentRun;
  activeNavSection: string;
  activeHubLabel: string;
  activeSubTabLabel: string;
  activePersona: UserPersonaId;
  densityMode: WorkspaceDensityMode;
  onToggleDensityMode: (mode: WorkspaceDensityMode) => void;
  onJumpToSection: (sectionId: string) => void;
}

interface DeskSynthesisSpec {
  plainEnglishPurpose: string;
  liveSovereignSignal: string;
  actionableEdge: string;
  nextStepLabel: string;
  nextStepTargetSection: string;
}

function buildDeskSynthesisForSection(
  run: CouncilAssessmentRun,
  sectionId: string,
  persona: UserPersonaId
): DeskSynthesisSpec {
  const open = run.openData;
  const debt = open.imfIndicators.debtToGdpPct;
  const pb = open.imfIndicators.primaryFiscalBalancePct;
  const pbStar = open.dsaAnalytics.debtStabilizingPrimaryBalancePct;
  const gap = open.dsaAnalytics.fiscalConsolidationGapPct;
  const cds = open.monetaryAndMarket.cds5YSpreadBps;
  const y10 = open.monetaryAndMarket.sovereign10YBondYieldPct;
  const polRate = open.monetaryAndMarket.policyRatePct;
  const cpi = open.imfIndicators.cpiInflationPct;
  const resMos = open.worldBankIndicators.fxReservesMonthsImport;

  const personaPrefix =
    persona === 'INDIVIDUAL_TRADER'
      ? 'Trader Edge:'
      : persona === 'INSTITUTIONAL_PM_IC'
      ? 'Institutional PM Mandate:'
      : 'Empirical Research Insight:';

  switch (sectionId) {
    case 'charts_watchlists':
      return {
        plainEnglishPurpose:
          'Maps global shipping chokepoints, subsea fiber cables, and conflict alerts alongside 4 core sovereign debt, reserve, and interest-rate horizon charts.',
        liveSovereignSignal: `${run.countryName} (${run.iso3}) trades at ${cds} bps 5Y CDS and ${y10.toFixed(2)}% 10Y yield with ${resMos.toFixed(1)} months of FX import cover and ${debt.toFixed(1)}% GDP gross debt.`,
        actionableEdge: `${personaPrefix} Click any country border on the Natural Earth map to compare sovereign risk, or stress-test Hormuz/Red Sea blockades in 1 click.`,
        nextStepLabel: 'Open Econometric Forecasting Lab',
        nextStepTargetSection: 'forecasting_lab',
      };

    case 'risk_analytics':
      return {
        plainEnglishPurpose:
          'Compares your active country against its global peer group to spot whether its bonds and credit default swaps are cheap or expensive for its fundamental risk.',
        liveSovereignSignal: `${run.iso3} 5Y CDS (${cds} bps) and 10Y yield (${y10.toFixed(2)}%) vs. ${debt.toFixed(1)}% GDP debt locate ${run.countryName} on the cross-sovereign relative-value frontier.`,
        actionableEdge: `${personaPrefix} Identify outliers trading >1.2σ wide of peer fundamentals to structure long/short sovereign pair trades.`,
        nextStepLabel: 'Open Alpha Correlation Matrix (5.6)',
        nextStepTargetSection: 'quant_alpha_correlation',
      };

    case 'forecasting_lab':
      return {
        plainEnglishPurpose:
          'Simulates 2,000 future paths for government debt (Monte Carlo fan chart), models the bond yield curve (Nelson-Siegel), and tests central bank rate rules.',
        liveSovereignSignal: `To stop debt (${debt.toFixed(1)}% GDP) from rising, ${run.countryName} needs a +${pbStar.toFixed(2)}% GDP primary surplus vs. actual ${pb.toFixed(2)}% GDP (consolidation gap: ${gap > 0 ? '+' : ''}${gap.toFixed(2)}% GDP).`,
        actionableEdge: `${personaPrefix} Use the shock sliders to test if a +150 bps interest rate spike pushes 2029 debt above the institutional distress threshold.`,
        nextStepLabel: 'Check Taylor Rule & Dominance (9.2)',
        nextStepTargetSection: 'taylor_rule_fiscal_dominance',
      };

    case 'global_liquidity':
      return {
        plainEnglishPurpose:
          'Tracks US Federal Reserve, ECB, BoJ, and PBoC balance-sheet liquidity and US dollar cross-currency funding stress (SOFR & XCCY basis).',
        liveSovereignSignal: `Real policy rate cushion is ${(polRate - cpi).toFixed(2)}% (Policy ${polRate.toFixed(2)}% vs. CPI ${cpi.toFixed(1)}%) against ${resMos.toFixed(1)} months of USD reserve buffer.`,
        actionableEdge: `${personaPrefix} When global dollar liquidity contracts, favor high-reserve sovereigns (>6m import cover) and hedge low-buffer currencies.`,
        nextStepLabel: 'Open Market-Maker Microstructure',
        nextStepTargetSection: 'market_maker_alpha',
      };

    case 'market_maker_alpha':
      return {
        plainEnglishPurpose:
          'Measures bond market liquidity depth, dealer inventory limits, bid-ask execution slippage, and systematic carry + momentum signals.',
        liveSovereignSignal: `${run.iso3} 10Y sovereign bond (${y10.toFixed(2)}%) offers ${(y10 - 4.25).toFixed(2)}% spread pickup over US Treasuries with ${cds} bps credit risk premium.`,
        actionableEdge: `${personaPrefix} Size entries according to limit-order-book depth to avoid market-impact slippage during macro release windows.`,
        nextStepLabel: 'Open RV Blotter & Greeks (5.4)',
        nextStepTargetSection: 'quant_trade_blotter',
      };

    case 'geopolitical_desk':
      return {
        plainEnglishPurpose:
          'Simulates geopolitical wars, sanctions reserve freezes, maritime blockades, and election transitions, translating political shocks directly into bond & CDS moves.',
        liveSovereignSignal: `${run.countryName} faces a ${open.monetaryAndMarket.chokepointExposureIndex}/100 maritime chokepoint exposure index and ${open.worldBankIndicators.politicalStabilityPercentile.toFixed(0)}th percentile political stability anchor.`,
        actionableEdge: `${personaPrefix} Toggle OFAC/EU sanction blocs to see how much of ${run.iso3}’s FX reserve buffer remains usable under clearing restrictions.`,
        nextStepLabel: 'Open Chokepoint Supply-Chain Matrix',
        nextStepTargetSection: 'supply_chain_matrix',
      };

    case 'supply_chain_matrix':
      return {
        plainEnglishPurpose:
          'Maps critical energy, semiconductor, food, and mineral import/export dependencies across global shipping straits and calculates imported inflation spikes.',
        liveSovereignSignal: `A 65% maritime blockade across ${run.countryName}’s primary trade corridors passes directly into headline CPI (${cpi.toFixed(1)}%) and 5Y CDS (${cds} bps).`,
        actionableEdge: `${personaPrefix} Identify which single commodity export ban or strait closure creates the largest basis-point drag on real GDP growth.`,
        nextStepLabel: 'Open Geopolitical Reserves & Chokepoints (9.3)',
        nextStepTargetSection: 'geopolitical_reserves_chokepoints',
      };

    case 'portfolio_risk_desk':
      return {
        plainEnglishPurpose:
          'Calculates multi-country portfolio tail risk (99% Cornish-Fisher CVaR) and models how a crisis in one sovereign spills over into neighboring markets.',
        liveSovereignSignal: `${run.iso3} contributes to cross-border contagion via trade and financial channels with 5Y CDS at ${cds} bps and composite risk at ${(run.croState.sovereignRiskScore * 100).toFixed(0)}/100.`,
        actionableEdge: `${personaPrefix} Use the Cross-Sovereign Alpha Correlation Matrix (5.6) to pair ${run.iso3} with orthogonal low-correlation diversifiers.`,
        nextStepLabel: 'Open Alpha Correlation Matrix (5.6)',
        nextStepTargetSection: 'quant_alpha_correlation',
      };

    case 'backtest_engine':
      return {
        plainEnglishPurpose:
          'Replays 5 historical sovereign crises (1997 Asia, 1998 Russia, 2001 Argentina, 2011 Eurozone, 2022 UK LDI) onto your active country’s current balance sheet.',
        liveSovereignSignal: `Tests how ${run.countryName}’s ${debt.toFixed(1)}% GDP debt and ${resMos.toFixed(1)}m FX reserves would survive historical 2.5σ–4.0σ funding and currency shocks.`,
        actionableEdge: `${personaPrefix} Apply any historical crisis shock directly to the live terminal to stress-test your portfolio’s survival margin.`,
        nextStepLabel: 'Open Strategy Backtester Lab (10.3)',
        nextStepTargetSection: 'persona_strategy_backtester_lab',
      };

    case 'council_debates':
      return {
        plainEnglishPurpose:
          'Runs a 9-agent adversarial AI committee (Geopolitical, Sovereign Debt, Macro, and Devil’s Advocate desks) that debates bull vs. bear cases before issuing a trade verdict.',
        liveSovereignSignal: `Supreme Council coherence: ${coherenceText(run.supremeCouncil)}, with regime stance: "${run.supremeCouncil?.marketTranslationLayer.regimeStance}".`,
        actionableEdge: `${personaPrefix} Inspect where the Devil’s Advocate challenges consensus assumptions before committing risk capital.`,
        nextStepLabel: 'Open CRO Gate & SMCR Dossier',
        nextStepTargetSection: 'cro_reports',
      };

    case 'cro_reports':
      return {
        plainEnglishPurpose:
          'Provides human-in-the-loop Chief Risk Officer (CRO) assumption overrides and exports audit-ready institutional PDF risk dossiers.',
        liveSovereignSignal: `Current CRO risk weights: Geopolitical ${(run.croState.geopoliticalRiskScore * 100).toFixed(0)}/100 · Sovereign ${(run.croState.sovereignRiskScore * 100).toFixed(0)}/100 · Macro ${(run.croState.macroRiskScore * 100).toFixed(0)}/100.`,
        actionableEdge: `${personaPrefix} Override any model risk score you disagree with and re-convene the Supreme Council or export a 1-click PDF memo.`,
        nextStepLabel: 'Open IC Pitchbook Exporter (8.4)',
        nextStepTargetSection: 'ic_pitchbook_dossier_exporter',
      };

    case 'quant_cds_basis':
    case 'institutional_quant_desk':
      return {
        plainEnglishPurpose:
          'Bootstraps year-by-year default probabilities from 5Y CDS spreads and compares CDS insurance cost against cash Eurobond yields to spot arbitrage.',
        liveSovereignSignal: `${run.iso3} 5Y CDS trades at ${cds} bps vs. ${y10.toFixed(2)}% 10Y bond yield, pricing market-implied survival and CDS-bond basis dislocation.`,
        actionableEdge: `${personaPrefix} When negative basis widens beyond −25 bps, buying both the cash Eurobond and 5Y CDS locks in risk-free hedged carry.`,
        nextStepLabel: 'Open Alpha Correlation Matrix (5.6)',
        nextStepTargetSection: 'quant_alpha_correlation',
      };

    case 'quant_restructuring_npv':
      return {
        plainEnglishPurpose:
          'Calculates bondholder recovery value (cents on the dollar) under maturity extensions, coupon cuts, and principal haircuts across creditor seniority tiers.',
        liveSovereignSignal: `Models ${run.countryName} (${debt.toFixed(1)}% GDP debt) creditor waterfall across IMF/Official Bilateral priority and Eurobond Collective Action Clauses (CACs).`,
        actionableEdge: `${personaPrefix} Compare stressed exit-yield recovery (¢/par) against current bond prices to identify asymmetric distressed debt upside.`,
        nextStepLabel: 'Open CAC Workout Waterfall (9.1)',
        nextStepTargetSection: 'restructuring_npv_cac_waterfall',
      };

    case 'quant_matrix_econometrics':
      return {
        plainEnglishPurpose:
          'Runs live ordinary least squares (OLS) regressions with heteroskedasticity-robust (Newey-West HAC) standard errors and out-of-sample crisis ROC curves.',
        liveSovereignSignal: `Tests Bohn fiscal sustainability (whether ${run.iso3} raises its primary balance ${pb.toFixed(2)}% GDP when debt ${debt.toFixed(1)}% GDP rises) with exact t-stats and p-values.`,
        actionableEdge: `${personaPrefix} Export empirical regression tables directly to LaTeX or CSV for academic papers or quantitative IC memos.`,
        nextStepLabel: 'Open Academic LaTeX/CSV Exporter (10.4)',
        nextStepTargetSection: 'persona_academic_latex_csv_exporter',
      };

    case 'quant_trade_blotter':
      return {
        plainEnglishPurpose:
          'Structures multi-leg fixed-income and CDS trades, calculating exact rate sensitivity (DV01), credit sensitivity (CS01), 90-day carry, and stressed P&L.',
        liveSovereignSignal: `Structures duration-neutral and CS01-hedged packages for ${run.iso3} (${cds} bps CDS, ${y10.toFixed(2)}% 10Y yield) under 5-factor macro shocks.`,
        actionableEdge: `${personaPrefix} Verify your 90-day carry + roll-down cushion (in bps) exceeds expected spread volatility before executing.`,
        nextStepLabel: 'Open EMBI Pair Book (6.1)',
        nextStepTargetSection: 'embi_portfolio_pair_book',
      };

    case 'quant_macro_surprise':
      return {
        plainEnglishPurpose:
          'Tracks upcoming inflation, GDP, and bond auction releases, converting data surprises into instant Bayesian updates of crisis probability and CDS repricing.',
        liveSovereignSignal: `Monitors ${run.countryName} CPI (${cpi.toFixed(1)}%), Real GDP (${open.imfIndicators.realGdpGrowthPct.toFixed(1)}%), and Primary Balance (${pb.toFixed(1)}% GDP) consensus surprises.`,
        actionableEdge: `${personaPrefix} Type hypothetical CPI or GDP prints into the calendar before release day to pre-calculate exact 2Y yield and 5Y CDS moves.`,
        nextStepLabel: 'Open Prediction Markets & Event Tree (7.5)',
        nextStepTargetSection: 'decision_prediction_markets',
      };

    case 'quant_alpha_correlation':
      return {
        plainEnglishPurpose:
          'Calculates pairwise rolling correlations of 5Y CDS and 10Y Eurobond spreads across your sovereign universe to maximize EMBI portfolio diversification.',
        liveSovereignSignal: `Decomposes ${run.iso3} (${cds} bps) spread variance into global risk-on/risk-off beta (PC1) vs. pure country-specific alpha and solves for optimal % portfolio weights.`,
        actionableEdge: `${personaPrefix} Click any low-correlation green cell (ρ ≤ +0.15) in the heatmap to inspect the pair’s 24-period cointegration Z-score and hedge ratio β.`,
        nextStepLabel: 'Open NSS Yield Curve Lab (5.7)',
        nextStepTargetSection: 'quant_nss_yield_curve',
      };

    case 'quant_nss_yield_curve':
      return {
        plainEnglishPurpose:
          'Fits a 6-factor Nelson-Siegel-Svensson (NSS) parametric yield curve from 1Y to 30Y to pinpoint the exact tenor offering the highest 12M Carry + Roll-Down and Breakeven Cushion.',
        liveSovereignSignal: `Models ${run.countryName} (${polRate.toFixed(2)}% policy rate vs. ${y10.toFixed(2)}% 10Y yield) across 8 benchmark tenors, decomposing total return into spot carry (bps) and curve roll-down (bps).`,
        actionableEdge: `${personaPrefix} Shock β₀ (level), β₁ (slope), or β₂ (belly curvature) and stage the highest Carry+Roll tenor or 2s5s10s butterfly directly into your IC Trade Ticket Book.`,
        nextStepLabel: 'Open Catalyst Event Vol Calendar (5.8)',
        nextStepTargetSection: 'quant_macro_catalyst_calendar',
      };

    case 'quant_macro_catalyst_calendar':
      return {
        plainEnglishPurpose:
          'Tracks upcoming 90-day Central Bank MPC decisions, CPI prints, and IMF/Rating Agency reviews across all watchlist sovereigns, pricing implied 1-day event volatility (±bps).',
        liveSovereignSignal: `Compares EconQuest model nowcasts against consensus for ${run.countryName} (CPI ${cpi.toFixed(1)}%, Primary Balance ${pb.toFixed(1)}% vs. pb* ${pbStar.toFixed(1)}% GDP) to map post-release spread skew.`,
        actionableEdge: `${personaPrefix} Click any scheduled catalyst row to inspect the 3-branch post-event scenario tree (Dovish Relief vs. Hawkish Shock bps) and stage pre-event protection.`,
        nextStepLabel: 'Open Portfolio Stress-Test Lab (5.9)',
        nextStepTargetSection: 'quant_portfolio_stress_lab',
      };

    case 'quant_portfolio_stress_lab':
      return {
        plainEnglishPurpose:
          'Runs batch multi-factor stress tests (e.g., 20% currency devaluation + 200bps spread widening + US Treasury shifts) across the multi-sovereign EMBI book to quantify instantaneous NAV PnL impact.',
        liveSovereignSignal: `Benchmarks ${run.countryName} (${cds} bps 5Y CDS, ${debt.toFixed(1)}% Debt/GDP, ${resMos.toFixed(1)}m reserves) within your multi-sovereign portfolio across Credit CS01+Convexity, Unhedged FX, UST Duration, and 30D Carry+Roll.`,
        actionableEdge: `${personaPrefix} Select any of the 6 institutional crisis presets or adjust the 5 shock sliders to inspect sovereign PnL attribution and stage the auto-calibrated tail-risk hedge into your IC Trade Book.`,
        nextStepLabel: 'Open EMBI Portfolio Pair Book (6.1)',
        nextStepTargetSection: 'embi_portfolio_pair_book',
      };

    default:
      return {
        plainEnglishPurpose:
          'Synthesizes live IMF/World Bank macro fundamentals, sovereign credit spreads, and multi-agent risk models into ratio-normalized decision metrics.',
        liveSovereignSignal: `${run.countryName} (${run.iso3}): Debt ${debt.toFixed(1)}% GDP · Primary Balance ${pb.toFixed(2)}% GDP · 5Y CDS ${cds} bps · 10Y Yield ${y10.toFixed(2)}% · Reserves ${resMos.toFixed(1)}m.`,
        actionableEdge: `${personaPrefix} Use the top 1-click sovereign pills to compare ${run.iso3} against peers or open the Cross-Hub Signal Scanner for top setups.`,
        nextStepLabel: 'Open Cross-Hub Signal Scanner (10.1)',
        nextStepTargetSection: 'persona_cross_hub_signal_scanner',
      };
  }
}

export const DeskClaritySynthesisBanner: React.FC<DeskClaritySynthesisBannerProps> = ({
  run,
  activeNavSection,
  activeHubLabel,
  activeSubTabLabel,
  activePersona,
  densityMode,
  onToggleDensityMode,
  onJumpToSection,
}) => {
  const spec = buildDeskSynthesisForSection(run, activeNavSection, activePersona);

  if (densityMode === 'PRO_QUANT') {
    return (
      <div className="bg-slate-900 dark:bg-slate-900/90 text-slate-100 border border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span className="px-2 py-0.5 text-xs tabular-nums font-semibold bg-blue-600 text-white shrink-0">
            {activeSubTabLabel}
          </span>
          <span className="text-slate-300 truncate">{spec.plainEnglishPurpose}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DataProvenanceBadge
            run={run}
            contextTitle={`${activeHubLabel} · ${activeSubTabLabel}`}
            containerKind="CHART"
            compact
          />
          <button
            type="button"
            onClick={() => onJumpToSection(spec.nextStepTargetSection)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold text-blue-300 hover:text-white bg-blue-950/80 border border-blue-700/60 transition-colors cursor-pointer"
          >
            <span>{spec.nextStepLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onToggleDensityMode('SIMPLE_BRIEF')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            <span>Show Simple Brief</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs tabular-nums font-semibold bg-blue-600 text-white">
            <Sparkles className="w-3 h-3" />
            <span>PLAIN-ENGLISH DESK GUIDE · {activeHubLabel.toUpperCase()}</span>
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            {activeSubTabLabel} — {run.countryName} ({run.iso3})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataProvenanceBadge
            run={run}
            contextTitle={`${activeHubLabel} · ${activeSubTabLabel}`}
            containerKind="CHART"
          />
          <button
            type="button"
            onClick={() => onJumpToSection(spec.nextStepTargetSection)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <span>{spec.nextStepLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onToggleDensityMode('PRO_QUANT')}
            title="Condense this plain-English guide into a 1-line bar for maximum quant screen space"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            <span>Compact Pro Quant Bar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs tabular-nums font-semibold text-slate-500 dark:text-slate-400">
            1. What This Desk Shows (In Plain English)
          </div>
          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {spec.plainEnglishPurpose}
          </p>
        </div>

        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-900/60 space-y-1">
          <div className="text-xs tabular-nums font-semibold text-blue-700 dark:text-blue-300">
            2. Live Signal for {run.countryName} ({run.iso3})
          </div>
          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium tabular-nums text-xs">
            {spec.liveSovereignSignal}
          </p>
        </div>

        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
          <div className="text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
            3. How To Use This For An Edge
          </div>
          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {spec.actionableEdge}
          </p>
        </div>
      </div>

      {/* Interactive Statistical Reference Badges Ribbon (Hover for Formal Formula, Variable Glossary & Source) */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs tabular-nums font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Hover Statistical References (Formula &amp; Glossary):
          </span>
          <StatRefBadge
            variant="inline"
            refText={`VaR / CVaR₉₉ · 5Y CDS = ${run.openData.monetaryAndMarket.cds5YSpreadBps} bps`}
          />
          <StatRefBadge
            variant="inline"
            refText={`DV01 / CS01 · 10Y = ${run.openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%`}
          />
          <StatRefBadge
            variant="inline"
            refText={`pb* = ${run.openData.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(2)}% GDP · r − g = ${run.openData.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}%`}
          />
          <StatRefBadge
            variant="inline"
            refText={`Greenspan-Guidotti = ${run.openData.debtRollover.greenspanGuidottiRatioPct}% · Reserves = ${run.openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)}m`}
          />
          <StatRefBadge
            variant="inline"
            refText={`5Y CDS Hazard & Basis · ${run.iso3} = ${run.openData.monetaryAndMarket.cds5YSpreadBps} bps`}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
          Hover any underlined metric or click any Chart/Table Provenance Badge for live API audit
        </span>
      </div>
    </div>
  );
};
