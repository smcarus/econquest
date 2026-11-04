import React, { useState, useRef, useEffect } from 'react';
import { DataStatusBadge } from './DataStatusBadge';
import {
  TrendingUp,
  Landmark,
  Globe,
  Radar,
  FileSpreadsheet,
  BookOpen,
  X,
  ChevronRight,
  Layers,
  Maximize2,
  Minimize2,
  MapPin,
  BarChart3,
  ArrowUp,
} from 'lucide-react';
import {
  CouncilAssessmentRun,
  WatchlistItem,
  UserPersonaId,
} from '../types/council';
import { StagedTradeTicketSpec } from '../utils/nssYieldCurveAndCatalystEngine';
import {
  DeskClaritySynthesisBanner,
  WorkspaceDensityMode,
} from './DeskClaritySynthesisBanner';
import { MorningAlphaAndCatalystRadar } from './MorningAlphaAndCatalystRadar';
import { ExecutiveBriefScorecard } from './ExecutiveBriefScorecard';

export type ActivityPillarId =
  | 'market_trading'
  | 'policy_research'
  | 'macro_research';

export interface PillarModuleItem {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export interface PillarSubGroup {
  groupId: string;
  groupTitle: string;
  modules: PillarModuleItem[];
}

export interface ActivityPillarConfig {
  id: ActivityPillarId;
  numberLabel: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  accentColor: 'blue' | 'emerald' | 'indigo';
  defaultSection: string;
  subGroups: PillarSubGroup[];
}

export const ACTIVITY_PILLARS: ActivityPillarConfig[] = [
  {
    id: 'market_trading',
    numberLabel: '1',
    title: 'Market & Trading',
    shortTitle: '1. Market & Trading',
    subtitle:
      'Yield curves, CDS basis arbitrage, relative-value trade blotter, EMBI portfolio optimization & stress testing',
    accentColor: 'blue',
    defaultSection: 'quant_nss_yield_curve',
    subGroups: [
      {
        groupId: 'curve_cds_execution',
        groupTitle: 'Curve, CDS & Execution',
        modules: [
          {
            id: 'quant_nss_yield_curve',
            label: 'Yield Curve & NSS Carry+Roll',
            shortLabel: 'NSS Yield Curve',
            description:
              '6-factor Nelson-Siegel-Svensson (1Y–30Y) parametric yield curve, 12M Carry + Roll-Down (bps) & 2s5s10s butterfly lab',
          },
          {
            id: 'quant_cds_basis',
            label: 'CDS Hazard & Basis Arbitrage',
            shortLabel: 'CDS & Basis Arb',
            description:
              'ISDA piecewise-constant hazard rate bootstrap, survival curve Q(0,T) & Eurobond Z-spread vs. CDS basis arbitrage',
          },
          {
            id: 'quant_trade_blotter',
            label: 'RV Trade Blotter & DV01/CS01',
            shortLabel: 'RV Blotter & DV01',
            description:
              'Multi-leg relative-value trade structuring blotter, DV01/CS01/Convexity Greeks, 90D Carry+Roll & 5-factor P&L waterfall',
          },
          {
            id: 'market_maker_alpha',
            label: 'Market-Maker & Order Book Depth',
            shortLabel: 'Order Book & Liquidity',
            description:
              'Limit order book depth, dealer gamma inventory & systematic sovereign carry/momentum signals',
          },
        ],
      },
      {
        groupId: 'portfolio_stress_book',
        groupTitle: 'Portfolio & Stress Testing',
        modules: [
          {
            id: 'quant_portfolio_stress_lab',
            label: 'Portfolio Stress-Test & Scenario Lab',
            shortLabel: 'Portfolio Stress Lab',
            description:
              'Batch EMBI portfolio stress testing (e.g., 20% FX devaluation + 200bps spread widening) & instantaneous multi-sovereign book PnL hit',
          },
          {
            id: 'embi_portfolio_pair_book',
            label: 'EMBI Portfolio & Pair-Trade Book',
            shortLabel: 'EMBI Pair Book',
            description:
              'Multi-sovereign EMBI Global Diversified index weights, active tilt allocator, tracking error & beta-neutral pair trades',
          },
          {
            id: 'portfolio_risk_desk',
            label: 'Portfolio Contagion & CVaR₉₉',
            shortLabel: 'Contagion & CVaR₉₉',
            description:
              'Multi-sovereign portfolio book, N×N cross-contagion spillover matrix, Cornish-Fisher CVaR₉₉ & MCTR',
          },
          {
            id: 'quant_alpha_correlation',
            label: 'PCA Alpha & Correlation Matrix',
            shortLabel: 'PCA Alpha Matrix',
            description:
              'Pairwise rolling correlations of 5Y CDS & 10Y Eurobond spreads, PCA beta vs. alpha & EMBI weight optimizer',
          },
        ],
      },
      {
        groupId: 'signals_arbitrage_catalysts',
        groupTitle: 'Signals, Arbitrage & Catalysts',
        modules: [
          {
            id: 'persona_cross_hub_signal_scanner',
            label: 'Top Alpha Signal Scanner',
            shortLabel: 'Top Alpha Signals',
            description:
              'Automated 9-engine watchlist synthesis surfacing Top-3 Trader Arbitrage, Institutional IC & Policy Research signals',
          },
          {
            id: 'decision_dislocation_screener',
            label: 'Model vs. Market Dislocation',
            shortLabel: 'Dislocation Screener',
            description:
              'Cross-sovereign ISDA 5Y CDS market-implied default probability vs. econometric fundamental default probability gap',
          },
          {
            id: 'decision_prediction_markets',
            label: 'Polymarket & Kalshi Event Arb',
            shortLabel: 'Prediction Market Arb',
            description:
              'Live Polymarket Gamma & Kalshi v2 dual-venue spread scanner, event vs. CDS probability arbitrage & conditional Bayes shock simulator',
          },
          {
            id: 'quant_macro_catalyst_calendar',
            label: 'Macro & MPC Catalyst Vol Calendar',
            shortLabel: 'Catalyst Vol Calendar',
            description:
              '90-day forward Central Bank MPC, CPI & IMF review catalyst calendar with implied 1-day event volatility (±bps)',
          },
          {
            id: 'persona_strategy_backtester_lab',
            label: 'Systematic Strategy Backtester',
            shortLabel: 'Strategy Backtester',
            description:
              'Historical regime replay (2022–2025) for Prediction Arb, Taylor FX Short, Fallen-Angel Hedge & Eurobond NPV Workout',
          },
          {
            id: 'risk_analytics',
            label: 'Peer Relative Value Z-Score Matrix',
            shortLabel: 'Peer RV Matrix',
            description:
              'Cross-sovereign Z-score relative value scatter, rating migration & contagion matrix',
          },
        ],
      },
    ],
  },
  {
    id: 'policy_research',
    numberLabel: '2',
    title: 'Policy Research',
    shortTitle: '2. Policy Research',
    subtitle:
      'Central bank Taylor Rules, Treasury DMO auctions, IMF/Paris Club debt restructuring,  ratings & 9-agent Council governance',
    accentColor: 'emerald',
    defaultSection: 'taylor_rule_fiscal_dominance',
    subGroups: [
      {
        groupId: 'monetary_fiscal_issuance',
        groupTitle: 'Monetary, Treasury & Ratings Policy',
        modules: [
          {
            id: 'taylor_rule_fiscal_dominance',
            label: 'Central Bank Taylor Rule & Dominance',
            shortLabel: 'Taylor Rule & Dominance',
            description:
              'Open-economy Augmented Taylor Rule vs. spot policy rate (bps), fiscal dominance score (0–100) & financial repression tax (% GDP)',
          },
          {
            id: 'dmo_treasury_auction_sim',
            label: '24M DMO Treasury Auction Simulator',
            shortLabel: 'DMO Auction Simulator',
            description:
              '24-month gross financing rollover calendar (% GDP), 5-channel issuance mix, bid-to-cover & bank Tier-1 saturation',
          },
          {
            id: 'ratings_shadow_fallen_angel',
            label: 'Shadow Rating & Fallen-Angel Cliff',
            shortLabel: 'Shadow Credit Ratings',
            description:
              'S&P/Moody’s/Fitch 5-pillar  rating replica, notch dislocation vs. official rating & BBB-/BB+ fallen-angel cliff simulator',
          },
          {
            id: 'debt_investor_base_doom_loop',
            label: 'Investor Base & Bank Doom-Loop',
            shortLabel: 'Bank-Sovereign Doom Loop',
            description:
              'IMF SDIB 5-sector sovereign debt ownership (% share), foreign sudden-stop outflow beta (bps) & domestic bank Tier-1 CET1 doom-loop',
          },
        ],
      },
      {
        groupId: 'restructuring_climate_policy',
        groupTitle: 'Debt Restructuring & Climate Transition',
        modules: [
          {
            id: 'restructuring_npv_cac_waterfall',
            label: 'IMF / Paris Club & CAC Waterfall',
            shortLabel: 'IMF / CAC Waterfall',
            description:
              '5-tier creditor seniority waterfall, IMF Preferred Creditor Status, Paris Club comparability & CAC Eurobond NPV recovery (0–100¢)',
          },
          {
            id: 'quant_restructuring_npv',
            label: 'Sovereign Haircut & Exit-Yield NPV',
            shortLabel: 'Haircut NPV Solver',
            description:
              'Sovereign LGD workbench, creditor seniority waterfall, ICMA CAC voting thresholds & exit-yield NPV haircut calculator',
          },
          {
            id: 'ngfs_climate_slb_greenium',
            label: 'NGFS Climate Stress & SLB Greenium',
            shortLabel: 'NGFS Climate & SLBs',
            description:
              'NGFS Net Zero / Delayed / Hot House fiscal revenue erosion (% rev), physical damage (% GDP) & SLB step-up spread analyzer (bps)',
          },
        ],
      },
      {
        groupId: 'central_bank_ai_governance',
        groupTitle: 'Policy Document AI, Council & Governance',
        modules: [
          {
            id: 'mpc_imf_document_ai',
            label: 'MPC & IMF Article IV Document AI',
            shortLabel: 'MPC / IMF Document AI',
            description:
              'Hybrid AI + econometric parser for Central Bank MPC statements, IMF Article IV QPCs & Eurobond CACs',
          },
          {
            id: 'policy_doc_lab',
            label: 'Policy Document & CSV Lab',
            shortLabel: 'Document & CSV Lab',
            description:
              'Ingest IMF Article IV consultations, central bank minutes or sanctions annexes into Council context',
          },
          {
            id: 'council_debates',
            label: '9-Agent Council & Devil’s Advocate',
            shortLabel: '9-Agent Council Debates',
            description:
              'Live pipeline health telemetry, 3-desk adversarial transcripts & cross-desk cascade audit',
          },
          {
            id: 'cro_reports',
            label: 'CRO Gate & SMCR-1.0 Dossier',
            shortLabel: 'CRO Gate & Dossier',
            description:
              'Human-in-the-loop Chief Risk Officer assumption overrides & standardized institutional report export',
          },
          {
            id: 'decision_premortem_killswitch',
            label: 'Pre-Mortem & Kill-Switch Engine',
            shortLabel: 'Pre-Mortem & Kill-Switch',
            description:
              '3-pathway Klein pre-mortem failure tree, automated 5-domain kill-switch tripwires & cognitive bias guardrails',
          },
          {
            id: 'decision_ledger_brier',
            label: 'Decision Ledger & Brier Audit',
            shortLabel: 'Decision Ledger & Brier',
            description:
              'Persistent sovereign thesis ledger, live mark-to-market performance (bps) & ex-post Brier skill score calibration',
          },
          {
            id: 'persona_guided_playbook_cockpit',
            label: 'Guided Policy & IC Playbooks',
            shortLabel: 'Guided Playbooks',
            description:
              'Step-by-step operational checklists for Individual Traders, Institutional PMs/ICs & Policy Researchers',
          },
          {
            id: 'ic_pitchbook_dossier_exporter',
            label: 'Boardroom IC Pitchbook Exporter',
            shortLabel: 'IC Pitchbook Exporter',
            description:
              'Multi-sovereign Investment Committee comparative scorecard & multi-page PDF, Markdown & JSON pitchbook exporter',
          },
        ],
      },
    ],
  },
  {
    id: 'macro_research',
    numberLabel: '3',
    title: 'Macroeconomic Research',
    shortTitle: '3. Macroeconomic Research',
    subtitle:
      'Global macro maps, debt sustainability (DSA) fan charts, BEER/FEER FX equilibrium, Matrix OLS econometrics & geopolitical supply chains',
    accentColor: 'indigo',
    defaultSection: 'charts_watchlists',
    subGroups: [
      {
        groupId: 'macro_maps_dsa_liquidity',
        groupTitle: 'Global Macro Overview, DSA & Liquidity',
        modules: [
          {
            id: 'charts_watchlists',
            label: 'Global Macro Map & Horizon Forecasts',
            shortLabel: 'Global Map & Horizon Charts',
            description:
              'Interactive global chokepoint & GDELT map + 2×2 sovereign horizon charts & debt maturity wall',
          },
          {
            id: 'forecasting_lab',
            label: 'Debt Sustainability (DSA) & Fan Charts',
            shortLabel: 'DSA & Fan Charts Lab',
            description:
              'Monte Carlo debt fan charts, deterministic r − g debt dynamics, Taylor Rule & IMF ARA reserve adequacy',
          },
          {
            id: 'global_liquidity',
            label: 'Global Liquidity & XCCY Basis',
            shortLabel: 'Global Liquidity & XCCY',
            description:
              'Fed/ECB/BoJ/PBoC balance sheet impulse, SOFR funding stress & cross-currency basis swaps',
          },
          {
            id: 'decision_quadrant_stress',
            label: '4-Quadrant Macro Regime Matrix',
            shortLabel: '4-Quadrant Macro Matrix',
            description:
              'Simultaneous 4-quadrant global macro regime stress grid & cross-sovereign resilience ranking',
          },
        ],
      },
      {
        groupId: 'econometrics_fx_equilibrium',
        groupTitle: 'Econometrics & FX Valuation',
        modules: [
          {
            id: 'fx_beer_feer_equilibrium',
            label: 'FX BEER / FEER Valuation Lab',
            shortLabel: 'FX BEER / FEER Lab',
            description:
              'Behavioral (BEER) & IMF Fundamental (FEER) Real Effective Exchange Rate valuation, current-account norm (% GDP) & misalignment %',
          },
          {
            id: 'quant_matrix_econometrics',
            label: 'Matrix OLS (HAC) & ROC Econometrics',
            shortLabel: 'Matrix OLS (HAC) & ROC',
            description:
              'In-browser matrix OLS (β̂ = (XᵀX)⁻¹Xᵀy) with Newey-West HAC standard errors, Bohn test & out-of-sample ROC/AUC',
          },
          {
            id: 'quant_macro_surprise',
            label: 'Macro Surprise Z-Score & Bayes',
            shortLabel: 'Macro Surprise & Bayes',
            description:
              'High-frequency macro release calendar, standardized consensus surprise Z-scores (ESI/ISI) & Bayesian regime update',
          },
        ],
      },
      {
        groupId: 'geopolitics_chokepoints_history',
        groupTitle: 'Geopolitics, Chokepoints & Crisis Replay',
        modules: [
          {
            id: 'geopolitical_desk',
            label: 'Geopolitical Wargaming Desk',
            shortLabel: 'Geopolitical Wargaming',
            description:
              'Interactive 5-factor shock simulator, sanctions custody freeze, game-theory tree & GDELT alerts',
          },
          {
            id: 'supply_chain_matrix',
            label: 'Chokepoint Supply-Chain Matrix',
            shortLabel: 'Supply-Chain Chokepoints',
            description:
              'Critical commodity dependencies, shipping lane blockades & imported inflation pass-through',
          },
          {
            id: 'geopolitical_reserves_chokepoints',
            label: 'Reserve Custody Freeze & Chokepoints',
            shortLabel: 'Reserve Custody Freeze',
            description:
              'Central bank FX/gold reserve custody freeze resilience (months import cover) & 5-corridor maritime chokepoint blockade simulator',
          },
          {
            id: 'backtest_engine',
            label: 'Historical Crisis Replay (1997–2022)',
            shortLabel: 'Historical Crisis Replay',
            description:
              'Historical crisis replay (1997 Asia, 1998 Russia GKO, 2001 Argentina, 2011 Eurozone, 2022 UK LDI) & AUROC validation',
          },
          {
            id: 'persona_academic_latex_csv_exporter',
            label: 'Academic LaTeX & Empirical CSV Exporter',
            shortLabel: 'LaTeX & Empirical CSV',
            description:
              'Publication-ready LaTeX Booktabs tables, BibTeX citations, Empirical Panel CSV & Working Paper (.md)',
          },
        ],
      },
    ],
  },
];

export function findPillarForNavSection(navSectionId: string): {
  pillar: ActivityPillarConfig;
  subGroup: PillarSubGroup;
  moduleItem: PillarModuleItem;
} {
  const normalizedId =
    navSectionId === 'institutional_quant_desk' ? 'quant_cds_basis' : navSectionId;

  for (const pillar of ACTIVITY_PILLARS) {
    for (const subGroup of pillar.subGroups) {
      const found = subGroup.modules.find((m) => m.id === normalizedId);
      if (found) {
        return { pillar, subGroup, moduleItem: found };
      }
    }
  }

  const fallbackPillar = ACTIVITY_PILLARS[2];
  const fallbackGroup = fallbackPillar.subGroups[0];
  return {
    pillar: fallbackPillar,
    subGroup: fallbackGroup,
    moduleItem: fallbackGroup.modules[0],
  };
}

export function buildThreePillarHubsForCommandPalette(): Array<{
  id: string;
  label: string;
  defaultSection: string;
  subTabs: Array<{ id: string; label: string; description: string }>;
}> {
  return ACTIVITY_PILLARS.map((pillar) => ({
    id: pillar.id,
    label: pillar.shortTitle,
    defaultSection: pillar.defaultSection,
    subTabs: pillar.subGroups.flatMap((sg) =>
      sg.modules.map((mod) => ({
        id: mod.id,
        label: `${mod.label} (${sg.groupTitle})`,
        description: mod.description,
      }))
    ),
  }));
}

interface PillarSubNavigationStripProps {
  activeNavSection: string;
  onSelectNavSection: (sectionId: string) => void;
}

export const PillarSubNavigationStrip: React.FC<PillarSubNavigationStripProps> = ({
  activeNavSection,
  onSelectNavSection,
}) => {
  const { pillar, subGroup, moduleItem } = findPillarForNavSection(activeNavSection);

  const pillarBadgeStyles =
    pillar.id === 'market_trading'
      ? 'bg-blue-600 text-white border-blue-600'
      : pillar.id === 'policy_research'
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-blue-600 text-white border-blue-600';

  return (
    <div className="flex flex-col gap-2">
      {/* Row A: Sub-Group Switcher inside the Active Activity Pillar + Module Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`px-2.5 py-1 text-xs tabular-nums font-semibold border ${pillarBadgeStyles}`}
          >
            {pillar.shortTitle}
          </span>

          {/* Sub-group filter buttons for the active pillar */}
          <div className="inline-flex flex-wrap items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 border border-slate-200 dark:border-slate-700 mr-1">
            {pillar.subGroups.map((sg) => {
              const isActiveGroup = sg.groupId === subGroup.groupId;
              return (
                <button
                  key={sg.groupId}
                  type="button"
                  onClick={() => onSelectNavSection(sg.modules[0].id)}
                  aria-pressed={isActiveGroup}
                  className="ui-pill whitespace-nowrap"
                >
                  {sg.groupTitle}
                </button>
              );
            })}
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />

          {/* Module Tabs within the Active Sub-Group */}
          <div className="flex flex-wrap items-center gap-1">
            {subGroup.modules.map((mod) => {
              const isSelected =
                activeNavSection === mod.id ||
                (activeNavSection === 'institutional_quant_desk' &&
                  mod.id === 'quant_cds_basis');
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onSelectNavSection(mod.id)}
                  title={mod.description}
                  aria-pressed={isSelected}
                  className="ui-pill whitespace-nowrap"
                >
                  {mod.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Module 1-Line Context */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md truncate">
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            {moduleItem.label}:
          </span>
          <span className="truncate" title={moduleItem.description}>
            {moduleItem.description}
          </span>
        </div>
      </div>
    </div>
  );
};

interface CompactTopStatusAndDrawersBarProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  activeNavSection: string;
  activePersona: UserPersonaId;
  densityMode: WorkspaceDensityMode;
  onToggleDensityMode: (mode: WorkspaceDensityMode) => void;
  onSelectSovereign: (item: WatchlistItem) => void;
  onSelectNavSection: (sectionId: string) => void;
  onStageTradeTicket: (ticket: StagedTradeTicketSpec) => void;
}

export const CompactTopStatusAndDrawersBar: React.FC<
  CompactTopStatusAndDrawersBarProps
> = ({
  run,
  watchlistItems,
  activeNavSection,
  activePersona,
  densityMode,
  onToggleDensityMode,
  onSelectSovereign,
  onSelectNavSection,
  onStageTradeTicket,
}) => {
  const [openDrawer, setOpenDrawer] = useState<
    'morning_radar' | 'executive_bluf' | 'desk_guide' | null
  >(null);

  const { pillar, moduleItem } = findPillarForNavSection(activeNavSection);

  const debtGdp = run.openData.imfIndicators.debtToGdpPct;
  const cds5Y = run.openData.monetaryAndMarket.cds5YSpreadBps;
  const yield10Y = run.openData.monetaryAndMarket.sovereign10YBondYieldPct;
  const reservesMos = run.openData.worldBankIndicators.fxReservesMonthsImport;
  const policyRate = run.openData.monetaryAndMarket.policyRatePct;
  const compositeRisk = run.supremeCouncil?.compositeRiskScore ?? 0.62;

  return (
    <>
      {/* 1-LINE CONSOLIDATED STATUS & DRAWER TRIGGER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Active Sovereign Live KPIs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 tabular-nums font-semibold text-xs">
            <span>{run.iso3}</span>
            <span className="opacity-75">·</span>
            <span>{run.countryName}</span>
          </span>

          <DataStatusBadge snapshot={run.openData} />

          <div className="flex flex-wrap items-center gap-2.5 tabular-nums text-xs text-slate-600 dark:text-slate-300">
            <span>
              <strong className="text-slate-400 dark:text-slate-500 font-normal">Debt/GDP:</strong>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {debtGdp.toFixed(1)}%
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              <strong className="text-slate-400 dark:text-slate-500 font-normal">5Y CDS:</strong>{' '}
              <span
                className={`font-semibold ${
                  cds5Y >= 350
                    ? 'text-rose-600 dark:text-rose-400'
                    : cds5Y >= 200
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {cds5Y} bps
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              <strong className="text-slate-400 dark:text-slate-500 font-normal">10Y Yield:</strong>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {yield10Y.toFixed(2)}%
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline" title="FX reserves, in months of imports">
              <strong className="text-slate-400 dark:text-slate-500 font-normal">Reserves:</strong>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {reservesMos.toFixed(1)} mo imports
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline">
              <strong className="text-slate-400 dark:text-slate-500 font-normal">Policy Rate:</strong>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {policyRate.toFixed(2)}%
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden lg:inline">|</span>
            <span className="hidden lg:inline">
              <strong className="text-slate-400 dark:text-slate-500 font-normal">Risk Score:</strong>{' '}
              <span
                className={`font-semibold ${
                  compositeRisk >= 0.7
                    ? 'text-rose-600 dark:text-rose-400'
                    : compositeRisk >= 0.5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {compositeRisk.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {/* Right: 3 Slide-Over Drawer Buttons Consolidating the Top Banners */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setOpenDrawer((prev) =>
                prev === 'morning_radar' ? null : 'morning_radar'
              )
            }
            aria-pressed={openDrawer === 'morning_radar'}
            className="ui-pill inline-flex items-center gap-1.5"
            title="Open Morning Alpha & Catalyst Radar Slide-Over Drawer (Top-3 Daily Dislocations & Upcoming MPC/CPI Catalysts)"
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Morning Alpha Radar</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenDrawer((prev) =>
                prev === 'executive_bluf' ? null : 'executive_bluf'
              )
            }
            aria-pressed={openDrawer === 'executive_bluf'}
            className="ui-pill inline-flex items-center gap-1.5"
            title="Open Executive BLUF Risk Scorecard & Investment Thesis Slide-Over Drawer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Executive BLUF Scorecard</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenDrawer((prev) => (prev === 'desk_guide' ? null : 'desk_guide'))
            }
            aria-pressed={openDrawer === 'desk_guide'}
            className="ui-pill inline-flex items-center gap-1.5"
            title="Open Plain-English Desk Clarity Guide & Formula Glossary Slide-Over Drawer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Desk Guide &amp; Glossary</span>
          </button>
        </div>
      </div>

      {/* SLIDE-OVER DRAWER MODAL FOR MORNING RADAR, EXECUTIVE BLUF, OR DESK CLARITY GUIDE */}
      {openDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-[1px]"
          onClick={() => setOpenDrawer(null)}
        >
          <div
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-xs tabular-nums font-semibold bg-blue-600 text-white">
                  {pillar.shortTitle}
                </span>
                <h3 className="text-sm font-semibold">
                  {openDrawer === 'morning_radar' &&
                    'Morning Alpha & Catalyst Radar — Top Dislocations & 7D Event Vol'}
                  {openDrawer === 'executive_bluf' &&
                    `Executive BLUF Risk Scorecard — ${run.countryName} (${run.iso3})`}
                  {openDrawer === 'desk_guide' &&
                    `Plain-English Desk Guide & Quantitative Glossary — ${moduleItem.label}`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick Switch Tabs inside the Slide-Over Drawer */}
                <div className="hidden sm:flex items-center bg-slate-800 p-0.5 border border-slate-700 text-xs tabular-nums">
                  <button
                    type="button"
                    onClick={() => setOpenDrawer('morning_radar')}
                    className={`px-2 py-0.5 ${
                      openDrawer === 'morning_radar'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Morning Radar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDrawer('executive_bluf')}
                    className={`px-2 py-0.5 ${
                      openDrawer === 'executive_bluf'
                        ? 'bg-blue-500 text-white font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Executive BLUF
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDrawer('desk_guide')}
                    className={`px-2 py-0.5 ${
                      openDrawer === 'desk_guide'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Desk Guide
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDrawer(null)}
                  className="p-1 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500"
                  title="Close Slide-Over Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 dark:bg-slate-950">
              {openDrawer === 'morning_radar' && (
                <MorningAlphaAndCatalystRadar
                  activeRun={run}
                  watchlistItems={watchlistItems}
                  onSelectSovereignAndSection={(iso3, targetSectionId) => {
                    const found = watchlistItems.find((w) => w.iso3 === iso3);
                    if (found && found.iso3 !== run.iso3) {
                      onSelectSovereign(found);
                    }
                    onSelectNavSection(targetSectionId);
                    setOpenDrawer(null);
                  }}
                  onStageTradeTicket={(ticket) => {
                    onStageTradeTicket(ticket);
                    setOpenDrawer(null);
                  }}
                />
              )}

              {openDrawer === 'executive_bluf' && (
                <ExecutiveBriefScorecard
                  run={run}
                  isCompactByDefault={false}
                  onSelectSection={(sec) => {
                    onSelectNavSection(sec);
                    setOpenDrawer(null);
                  }}
                />
              )}

              {openDrawer === 'desk_guide' && (
                <DeskClaritySynthesisBanner
                  run={run}
                  activeNavSection={activeNavSection}
                  activeHubLabel={pillar.shortTitle}
                  activeSubTabLabel={moduleItem.label}
                  activePersona={activePersona}
                  densityMode={densityMode}
                  onToggleDensityMode={onToggleDensityMode}
                  onJumpToSection={(sec) => {
                    onSelectNavSection(sec);
                    setOpenDrawer(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface MacroOverviewTabbedWorkspaceProps {
  mapCard: React.ReactNode;
  chartsDeck: React.ReactNode;
  countryName: string;
  iso3: string;
}

export const MacroOverviewTabbedWorkspace: React.FC<
  MacroOverviewTabbedWorkspaceProps
> = ({ mapCard, chartsDeck, countryName, iso3 }) => {
  const [overviewTab, setOverviewTab] = useState<'horizon_charts' | 'geo_map'>(
    'horizon_charts'
  );

  return (
    <div className="space-y-3">
      {/* Inner Card Tab Bar so Global Macro Overview fits in 1–1.5 screens maximum */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400 mr-1">
            Macro Overview Workspace ({iso3}):
          </span>
          <button
            type="button"
            onClick={() => setOverviewTab('horizon_charts')}
            aria-pressed={overviewTab === 'horizon_charts'}
            className="ui-pill inline-flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>1. Sovereign Horizon Charts &amp; Debt Maturity Wall</span>
          </button>
          <button
            type="button"
            onClick={() => setOverviewTab('geo_map')}
            aria-pressed={overviewTab === 'geo_map'}
            className="ui-pill inline-flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>2. Interactive Global Geopolitical &amp; Chokepoint Map</span>
          </button>
        </div>

        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {countryName} ({iso3}) · 1–2 Page Maximum Scroll View
        </span>
      </div>

      {overviewTab === 'horizon_charts' ? chartsDeck : mapCard}
    </div>
  );
};

interface ViewportScrollBudgetContainerProps {
  activeNavSection: string;
  children: React.ReactNode;
}

/**
 * Enforces the 1–2 screen maximum vertical scroll budget across every workbench
 * by paginating tall multi-card desks into Page 1 (Primary Workbench & Controls)
 * and Page 2 (Deep-Dive Matrices & Diagnostics) with ZERO nested scrollbars.
 */
export const ViewportScrollBudgetContainer: React.FC<
  ViewportScrollBudgetContainerProps
> = ({ activeNavSection, children }) => {
  const [activePage, setActivePage] = useState<'page1' | 'page2' | 'all'>('page1');
  const [totalDetectedCards, setTotalDetectedCards] = useState<number>(1);
  const [page1CardCount, setPage1CardCount] = useState<number>(1);
  const [page2CardCount, setPage2CardCount] = useState<number>(0);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);

  // Reset to Page 1 whenever the user navigates to a different module
  useEffect(() => {
    setActivePage('page1');
  }, [activeNavSection]);

  useEffect(() => {
    const wrapper = contentWrapperRef.current;
    if (!wrapper) return;

    const applyCardPagination = () => {
      const rootDeskEl = wrapper.firstElementChild as HTMLElement | null;
      if (!rootDeskEl) return;

      // Identify the list of content cards inside the desk:
      // Pattern A: Multi-tab desk wrapper -> [headerCard, subWorkspaceContainer] where subWorkspaceContainer has 3-6 cards
      // Pattern B: Direct desk wrapper -> [card1, card2, card3, card4, ...]
      const directChildren = Array.from(rootDeskEl.children).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.tagName !== 'SCRIPT' &&
          el.tagName !== 'STYLE'
      );

      let headerElement: HTMLElement | null = null;
      let sectionCards: HTMLElement[] = directChildren;

      if (directChildren.length === 2) {
        const secondChild = directChildren[1];
        const nestedCards = Array.from(secondChild.children).filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            el.tagName !== 'SCRIPT' &&
            el.tagName !== 'STYLE' &&
            !el.hasAttribute('data-econquest-provenance-bar')
        );
        if (nestedCards.length >= 2) {
          headerElement = directChildren[0];
          sectionCards = nestedCards;
        }
      } else if (directChildren.length === 1) {
        const onlyChild = directChildren[0];
        const nestedCards = Array.from(onlyChild.children).filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            el.tagName !== 'SCRIPT' &&
            el.tagName !== 'STYLE' &&
            !el.hasAttribute('data-econquest-provenance-bar')
        );
        if (nestedCards.length >= 3) {
          sectionCards = nestedCards;
        }
      }

      // If no separate headerElement was detected and the first card is a compact banner/header (<240px) with >= 3 total cards,
      // keep the compact header pinned on both Page 1 and Page 2 and paginate the remaining cards.
      if (!headerElement && sectionCards.length >= 3) {
        const firstCard = sectionCards[0];
        const firstHeight = firstCard.offsetHeight;
        if (firstHeight > 0 && firstHeight <= 240 && sectionCards.length >= 4) {
          headerElement = firstCard;
          sectionCards = sectionCards.slice(1);
        }
      }

      const cardCount = sectionCards.length;
      setTotalDetectedCards(cardCount);

      // If this desk has 2 or fewer cards, it already fits within 1–2 screens without pagination
      if (cardCount <= 2) {
        setPage1CardCount(cardCount);
        setPage2CardCount(0);
        if (headerElement) headerElement.style.display = '';
        sectionCards.forEach((c) => {
          c.style.display = '';
        });
        return;
      }

      const splitIndex = Math.ceil(cardCount / 2);
      setPage1CardCount(splitIndex);
      setPage2CardCount(cardCount - splitIndex);

      if (headerElement) {
        headerElement.style.display = '';
      }

      sectionCards.forEach((card, idx) => {
        if (activePage === 'all') {
          card.style.display = '';
        } else if (activePage === 'page1') {
          card.style.display = idx < splitIndex ? '' : 'none';
        } else {
          card.style.display = idx >= splitIndex ? '' : 'none';
        }
      });
    };

    applyCardPagination();

    // Trigger resize event after visibility change so Recharts ResponsiveContainer charts immediately render at full width
    const resizeTimer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 40);

    return () => {
      window.clearTimeout(resizeTimer);
    };
  }, [activeNavSection, activePage, children]);

  const hasMultiplePages = totalDetectedCards > 2 && page2CardCount > 0;

  return (
    <div className="space-y-3" data-active-page={activePage}>
      {/* Top 1-Line Desk Page Switcher Bar (Zero Nested Scrollbars) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
            <Layers className="w-3.5 h-3.5" />
            <span>View</span>
          </span>

          {hasMultiplePages ? (
            <div className="inline-flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePage('page1')}
                aria-pressed={activePage === 'page1'}
                className="ui-pill"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActivePage('page2')}
                aria-pressed={activePage === 'page2'}
                className="ui-pill"
              >
                Details
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Single page
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasMultiplePages && (
            <button
              type="button"
              onClick={() =>
                setActivePage((prev) => (prev === 'all' ? 'page1' : 'all'))
              }
              aria-pressed={activePage === 'all'}
              className="ui-pill inline-flex items-center gap-1"
              title="Show every panel on one page, or go back to the Overview / Details split"
            >
              {activePage === 'all' ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  <span>Split into pages</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3" />
                  <span>Show all panels</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Desk Container — No inner overflow-y-auto, zero nested scrollbars */}
      <div ref={contentWrapperRef} className="space-y-4">
        {children}
      </div>

      {/* Bottom Page Switcher Footer when Desk has 2 Pages */}
      {hasMultiplePages && activePage !== 'all' && (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs tabular-nums">
          <span className="text-slate-500 dark:text-slate-400">
            {activePage === 'page1' ? 'Overview (1 of 2)' : 'Details (2 of 2)'}
          </span>
          <div className="flex items-center gap-2">
            {activePage === 'page1' ? (
              <button
                type="button"
                onClick={() => {
                  setActivePage('page2');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="ui-btn ui-btn-primary inline-flex"
              >
                <span>Next: Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActivePage('page1');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

