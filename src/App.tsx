/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AIRuntimeConfig,
  AnnotatedChartSpec,
  CROOverrideState,
  CalibratedPolicyShockVector,
  CommandPaletteItem,
  ConditionalBayesianEventSimulation,
  CouncilAssessmentRun,
  CustomSovereignOnboardingDraft,
  ExternalInternalConnectorMetricKey,
  ForecastingShockInputs,
  GeopoliticalWargameParams,
  LiquidityStressParams,
  NavigationCategoryGroupId,
  OpenDataSnapshot,
  UserPersonaId,
  WatchlistGroup,
  WatchlistItem,
  WorkspaceLayoutMode,
  WorkspaceSessionSnapshot,
} from './types/council';
import {
  DEFAULT_WATCHLISTS,
  SOVEREIGN_CATALOG,
  addNewDefaultWatchlists,
  loadSeenDefaultWatchlists,
  saveSeenDefaultWatchlists,
  buildAnnotatedChartsForSovereign,
  buildDefaultAssessmentRun,
  recomputeDerivedOpenDataAnalytics,
  registerCustomSovereignInCatalog,
} from './data/presetsAndBaselines';
import {
  COMPACT_NAV_CATEGORIES,
  buildCommandPaletteIndex,
  loadCustomSovereignsFromStorage,
  loadWorkspaceSessionFromStorage,
  runPreFlightModelIntegrityAudit,
  saveWorkspaceSessionToStorage,
} from './utils/turnkeyReadinessAndCommandEngine';
import {
  CustomSovereignOnboardingModal,
  GlobalCommandPaletteModal,
  ModelIntegrityAuditModal,
  SelfHostAndOllamaRuntimeModal,
  SovereignManualAndGithubModal,
  WorkspaceSessionModal,
} from './components/TurnkeyCommandAndIntegrityModals';
import { DEFAULT_WARGAME_PARAMS } from './utils/geopoliticalRiskEngine';
import { DEFAULT_LIQUIDITY_STRESS_PARAMS } from './utils/globalLiquidityEngine';
import {
  DEFAULT_FORECAST_SHOCKS,
  HistoricalCrisisEpisode,
  HistoricalCrisisEpisodeId,
  ScenarioSnapshotState,
  captureScenarioSnapshot,
  computeScenarioDeltaComparison,
} from './utils/portfolioAndBacktestEngine';
import {
  LiveMacroSyncResult,
  syncLiveWorldBankAndTreasuryData,
} from './utils/macroLiveSyncService';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { TodayPage } from './components/TodayPage';
import {
  COUNTRY_TABS,
  DEFAULT_COUNTRY_TAB,
  CountryPage,
  CountryTabId,
  findCountryTabForDesk,
} from './components/CountryPage';
import {
  WorkspacePage,
  PORTFOLIO_TABS,
  REPORTS_TABS,
  findTabForDesk,
} from './components/WorkspacePage';
import { PortfolioSummary } from './components/PortfolioSummary';
import { HoldingsPanel } from './components/HoldingsPanel';
import { IcMemoBuilder } from './components/IcMemoBuilder';
import { RolePicker } from './components/RolePicker';
import { PresentMode } from './components/PresentMode';
import { getRole, loadRole, saveRole, USER_ROLES, type ReportTemplate, type UserRoleId, type WorkflowArea } from './data/roles';
import { loadHoldings, saveHoldings, holdingsWeightsPct, holdingsToContagionBook, type Holding } from './utils/holdings';

type AppArea = 'today' | 'country' | 'portfolio' | 'reports' | 'desks';
import { ExecutiveBriefScorecard } from './components/ExecutiveBriefScorecard';
import { HeroGeopoliticalMapCard } from './components/HeroGeopoliticalMapCard';
import { ScenarioDeltaComparatorDrawer } from './components/ScenarioDeltaComparatorModal';
import type { QuantSubWorkspaceId } from './components/InstitutionalQuantDesk';
import type { PortfolioFundingSubTabId } from './components/PortfolioAndFundingDesk';
import type { DecisionCommandSubTabId } from './components/DecisionCommandCenterDesk';
import type { RatingsFxIcSubTabId } from './components/SovereignRatingsFxAndIcDesk';
import type { RestructuringMonetaryGeoSubTabId } from './components/RestructuringMonetaryGeoDesk';
import type { PersonaPlaybookSubTabId } from './components/PersonaPlaybooksAndSignalDesk';
import { EconQuestLogo } from './components/EconQuestLogo';
import { lazyNamed, DeskLoading } from './components/LazyDesk';
import { describeSnapshotSync } from './utils/syncMessages';
import {
  DeskClaritySynthesisBanner,
  WorkspaceDensityMode,
} from './components/DeskClaritySynthesisBanner';
import { MorningAlphaAndCatalystRadar } from './components/MorningAlphaAndCatalystRadar';
import {
  MultiSovereignComparatorDrawer,
  ExecutiveTearSheetAndTradeTicketDrawer,
} from './components/MultiSovereignComparatorAndTicketDrawers';
import { GlobalTerminalProvenanceAndStatRefController } from './components/RealTimeDataProvenanceOverlay';
import {
  ACTIVITY_PILLARS,
  ActivityPillarId,
  findPillarForNavSection,
  buildThreePillarHubsForCommandPalette,
  PillarSubNavigationStrip,
  CompactTopStatusAndDrawersBar,
  MacroOverviewTabbedWorkspace,
  ViewportScrollBudgetContainer,
} from './components/ActivityPillarWorkspaceController';
import {
  computeSovereignNssYieldCurveSuite,
  DEFAULT_NSS_SHOCK_INPUTS,
  StagedTradeTicketSpec,
} from './utils/nssYieldCurveAndCatalystEngine';
import type { CouncilAssessmentRun as RunForPdf } from './types/council';
import { watchlistYieldFields } from './utils/watchlistYield';
// The PDF library is large, so it loads only when someone exports a PDF.
const exportSMCRPdfDossier = (r: RunForPdf) =>
  import('./utils/smcrReportExporter').then((m) => m.exportSMCRPdfDossier(r));
import {
  FileUp,
  Sun,
  Moon,
  Play,
  Download,
  AlertCircle,
  CheckCircle2,
  Layout,
  Columns,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  GitCompare,
  RefreshCw,
  Pin,
  Search,
  ShieldCheck,
  Plus,
  Database,
  ChevronDown,
  Briefcase,
  BookOpen,
  Cpu,
  Settings2,
  Presentation,
} from 'lucide-react';

// Desks load on first use, so the first screen does not download all 41 of them.
const AnnotatedChartsDeck = lazyNamed(() => import('./components/AnnotatedChartsDeck'), 'AnnotatedChartsDeck');
const StatisticalForecastingLab = lazyNamed(() => import('./components/StatisticalForecastingLab'), 'StatisticalForecastingLab');
const GeopoliticalRiskDesk = lazyNamed(() => import('./components/GeopoliticalRiskDesk'), 'GeopoliticalRiskDesk');
const PortfolioContagionDesk = lazyNamed(() => import('./components/PortfolioContagionDesk'), 'PortfolioContagionDesk');
const CrisisBacktestDesk = lazyNamed(() => import('./components/CrisisBacktestDesk'), 'CrisisBacktestDesk');
const PolicyDocumentAndCsvLab = lazyNamed(() => import('./components/PolicyDocumentAndCsvLab'), 'PolicyDocumentAndCsvLab');
const InstitutionalRiskModules = lazyNamed(() => import('./components/InstitutionalRiskModules'), 'InstitutionalRiskModules');
const CouncilHierarchyAndDebates = lazyNamed(() => import('./components/CouncilHierarchyAndDebates'), 'CouncilHierarchyAndDebates');
const CROCheckpointAndReports = lazyNamed(() => import('./components/CROCheckpointAndReports'), 'CROCheckpointAndReports');
const SupplyChainMatrixDesk = lazyNamed(() => import('./components/SupplyChainMatrixDesk'), 'SupplyChainMatrixDesk');
const GlobalLiquidityDesk = lazyNamed(() => import('./components/GlobalLiquidityDesk'), 'GlobalLiquidityDesk');
const MarketMakerAlphaDesk = lazyNamed(() => import('./components/MarketMakerAlphaDesk'), 'MarketMakerAlphaDesk');
const InstitutionalQuantDesk = lazyNamed(() => import('./components/InstitutionalQuantDesk'), 'InstitutionalQuantDesk');
const PortfolioAndFundingDesk = lazyNamed(() => import('./components/PortfolioAndFundingDesk'), 'PortfolioAndFundingDesk');
const DecisionCommandCenterDesk = lazyNamed(() => import('./components/DecisionCommandCenterDesk'), 'DecisionCommandCenterDesk');
const SovereignRatingsFxAndIcDesk = lazyNamed(() => import('./components/SovereignRatingsFxAndIcDesk'), 'SovereignRatingsFxAndIcDesk');
const RestructuringMonetaryGeoDesk = lazyNamed(() => import('./components/RestructuringMonetaryGeoDesk'), 'RestructuringMonetaryGeoDesk');
const PersonaPlaybooksAndSignalDesk = lazyNamed(() => import('./components/PersonaPlaybooksAndSignalDesk'), 'PersonaPlaybooksAndSignalDesk');


const WATCHLIST_STORAGE_KEY = 'sovereign_council_watchlists_v1';
const THEME_STORAGE_KEY = 'econquest_theme_dark_v1';
const AI_RUNTIME_STORAGE_KEY = 'econquest_ai_runtime_config_v1';

type NavSectionId =
  | 'charts_watchlists'
  | 'forecasting_lab'
  | 'geopolitical_desk'
  | 'supply_chain_matrix'
  | 'global_liquidity'
  | 'market_maker_alpha'
  | 'portfolio_risk_desk'
  | 'backtest_engine'
  | 'risk_analytics'
  | 'council_debates'
  | 'cro_reports'
  | 'policy_doc_lab'
  | 'institutional_quant_desk'
  | 'quant_cds_basis'
  | 'quant_restructuring_npv'
  | 'quant_matrix_econometrics'
  | 'quant_trade_blotter'
  | 'quant_macro_surprise'
  | 'quant_alpha_correlation'
  | 'quant_nss_yield_curve'
  | 'quant_macro_catalyst_calendar'
  | 'quant_portfolio_stress_lab'
  | 'embi_portfolio_pair_book'
  | 'dmo_treasury_auction_sim'
  | 'mpc_imf_document_ai'
  | 'decision_dislocation_screener'
  | 'decision_premortem_killswitch'
  | 'decision_ledger_brier'
  | 'decision_quadrant_stress'
  | 'decision_prediction_markets'
  | 'ratings_shadow_fallen_angel'
  | 'fx_beer_feer_equilibrium'
  | 'debt_investor_base_doom_loop'
  | 'ic_pitchbook_dossier_exporter'
  | 'restructuring_npv_cac_waterfall'
  | 'taylor_rule_fiscal_dominance'
  | 'geopolitical_reserves_chokepoints'
  | 'ngfs_climate_slb_greenium'
  | 'persona_cross_hub_signal_scanner'
  | 'persona_guided_playbook_cockpit'
  | 'persona_strategy_backtester_lab'
  | 'persona_academic_latex_csv_exporter';

type DomainHubId =
  | 'overview_visuals'
  | 'macro_econometrics'
  | 'geo_supply_chain'
  | 'portfolio_governance'
  | 'institutional_quant_hub'
  | 'portfolio_dmo_doc_hub'
  | 'decision_command_hub'
  | 'ratings_fx_ic_hub'
  | 'restructuring_monetary_geo_hub'
  | 'persona_playbooks_signal_hub';

interface DomainHubConfig {
  id: DomainHubId;
  label: string;
  defaultSection: NavSectionId;
  subTabs: { id: NavSectionId; label: string; description: string }[];
}

const DOMAIN_HUBS: DomainHubConfig[] = [
  {
    id: 'overview_visuals',
    label: '1. Overview, Maps & Charts',
    defaultSection: 'charts_watchlists',
    subTabs: [
      {
        id: 'charts_watchlists',
        label: 'Flagship Geopolitical Map & Horizon Charts',
        description: 'Interactive global chokepoint & GDELT map + 2×2 sovereign horizon charts with plain-English guides',
      },
      {
        id: 'risk_analytics',
        label: 'Peer Relative Value & Stress Matrix',
        description: 'Cross-sovereign Z-score relative value scatter, rating migration & contagion matrix',
      },
    ],
  },
  {
    id: 'macro_econometrics',
    label: '2. Macro & Econometrics',
    defaultSection: 'forecasting_lab',
    subTabs: [
      {
        id: 'forecasting_lab',
        label: 'Econometric & Debt Sustainability Lab',
        description: 'Monte Carlo debt fan charts, Nelson-Siegel yield curves, Taylor Rule & IMF ARA reserve adequacy',
      },
      {
        id: 'global_liquidity',
        label: 'Global Liquidity & XCCY Basis',
        description: 'Fed/ECB/BoJ/PBoC balance sheet impulse, SOFR funding stress & cross-currency basis swaps',
      },
      {
        id: 'market_maker_alpha',
        label: 'Market-Maker & Alpha Microstructure',
        description: 'Limit order book depth, dealer gamma inventory & systematic sovereign carry/momentum signals',
      },
    ],
  },
  {
    id: 'geo_supply_chain',
    label: '3. Geopolitics & Supply Chains',
    defaultSection: 'geopolitical_desk',
    subTabs: [
      {
        id: 'geopolitical_desk',
        label: 'Geopolitical Wargaming Desk',
        description: 'Interactive 5-factor shock simulator, sanctions custody freeze, game-theory tree & GDELT alerts',
      },
      {
        id: 'supply_chain_matrix',
        label: 'Chokepoint Supply-Chain Matrix',
        description: 'Critical commodity dependencies, shipping lane blockades & imported inflation pass-through',
      },
    ],
  },
  {
    id: 'portfolio_governance',
    label: '4. Portfolio & Council Governance',
    defaultSection: 'portfolio_risk_desk',
    subTabs: [
      {
        id: 'portfolio_risk_desk',
        label: 'Portfolio & Contagion Book',
        description: 'Multi-sovereign portfolio book, N×N cross-contagion spillover matrix, Cornish-Fisher CVaR₉₉ & MCTR',
      },
      {
        id: 'backtest_engine',
        label: 'Crisis Replay & Backtest',
        description: 'Historical crisis replay (1997 Asia, 1998 Russia GKO, 2001 Argentina, 2011 Eurozone, 2022 UK LDI) & AUROC validation',
      },
      {
        id: 'council_debates',
        label: '9-Agent Council & Devil’s Advocate Debates',
        description: 'Live pipeline health telemetry, 3-desk adversarial transcripts & cross-desk cascade audit',
      },
      {
        id: 'cro_reports',
        label: 'CRO Gate & SMCR-1.0 Dossier',
        description: 'Human-in-the-loop Chief Risk Officer assumption overrides & standardized institutional report export',
      },
      {
        id: 'policy_doc_lab',
        label: 'Policy Document Lab',
        description: 'Ingest IMF Article IV consultations, central bank minutes or sanctions annexes into Council context',
      },
    ],
  },
  {
    id: 'institutional_quant_hub',
    label: '5. Institutional Quant Desk',
    defaultSection: 'quant_cds_basis',
    subTabs: [
      {
        id: 'quant_cds_basis',
        label: 'CDS Hazard & Basis Arb',
        description: 'ISDA piecewise-constant hazard rate bootstrap, survival curve Q(0,T) & Eurobond Z-spread vs. CDS basis arbitrage',
      },
      {
        id: 'quant_restructuring_npv',
        label: 'Restructuring & Haircut NPV',
        description: 'Sovereign LGD workbench, creditor seniority waterfall, ICMA CAC voting thresholds & exit-yield NPV haircut calculator',
      },
      {
        id: 'quant_matrix_econometrics',
        label: 'Matrix OLS (HAC) & ROC',
        description: 'In-browser matrix OLS (β̂ = (XᵀX)⁻¹Xᵀy) with Newey-West HAC standard errors, Bohn test & out-of-sample ROC/AUC',
      },
      {
        id: 'quant_trade_blotter',
        label: 'RV Blotter & DV01/CS01',
        description: 'Multi-leg relative-value trade structuring blotter, DV01/CS01/Convexity Greeks, 90D Carry+Roll & 5-factor P&L waterfall',
      },
      {
        id: 'quant_macro_surprise',
        label: 'Macro Surprise & Bayes',
        description: 'High-frequency macro release calendar, standardized consensus surprise Z-scores (ESI/ISI) & Bayesian regime update',
      },
      {
        id: 'quant_alpha_correlation',
        label: 'Alpha Correlation Matrix',
        description: 'Pairwise rolling correlations of 5Y CDS & 10Y Eurobond spreads, PCA beta vs. alpha & EMBI weight optimizer',
      },
      {
        id: 'quant_nss_yield_curve',
        label: 'NSS Yield Curve & Carry+Roll',
        description: '6-factor Nelson-Siegel-Svensson (1Y–30Y) parametric yield curve, 12M Carry + Roll-Down (bps) & 2s5s10s butterfly lab',
      },
      {
        id: 'quant_macro_catalyst_calendar',
        label: 'Macro & MPC Catalyst Vol',
        description: '90-day forward Central Bank MPC, CPI & IMF review catalyst calendar with implied 1-day event volatility (±bps)',
      },
      {
        id: 'quant_portfolio_stress_lab',
        label: 'Portfolio Stress-Test & Scenario Lab',
        description: 'Batch EMBI portfolio stress testing (e.g., 20% FX devaluation + 200bps spread widening) & instantaneous multi-sovereign book PnL hit attribution',
      },
    ],
  },
  {
    id: 'portfolio_dmo_doc_hub',
    label: '6. Portfolio, DMO & Doc AI',
    defaultSection: 'embi_portfolio_pair_book',
    subTabs: [
      {
        id: 'embi_portfolio_pair_book',
        label: 'EMBI Portfolio & Pair-Trade Book',
        description: 'Multi-sovereign EMBI Global Diversified index weights, active tilt allocator, tracking error & beta-neutral pair trades',
      },
      {
        id: 'dmo_treasury_auction_sim',
        label: '24M DMO Treasury Auction Simulator',
        description: '24-month gross financing rollover calendar (% GDP), 5-channel issuance mix, bid-to-cover & bank Tier-1 saturation',
      },
      {
        id: 'mpc_imf_document_ai',
        label: 'MPC & IMF Article IV Document AI',
        description: 'Hybrid Gemini AI + econometric parser for Central Bank MPC statements, IMF Article IV QPCs & Eurobond CACs',
      },
    ],
  },
  {
    id: 'decision_command_hub',
    label: '7. Decision Command Center',
    defaultSection: 'decision_dislocation_screener',
    subTabs: [
      {
        id: 'decision_dislocation_screener',
        label: 'Model vs. Market Dislocation Screener',
        description: 'Cross-sovereign ISDA 5Y CDS market-implied default probability vs. econometric fundamental default probability gap',
      },
      {
        id: 'decision_premortem_killswitch',
        label: 'Pre-Mortem & Kill-Switch Engine',
        description: '3-pathway Klein pre-mortem failure tree, automated 5-domain kill-switch tripwires & cognitive bias guardrails',
      },
      {
        id: 'decision_ledger_brier',
        label: 'Decision Ledger & Brier Audit',
        description: 'Persistent sovereign thesis ledger, live mark-to-market performance (bps) & ex-post Brier skill score calibration',
      },
      {
        id: 'decision_quadrant_stress',
        label: '4-Quadrant Macro Stress Matrix',
        description: 'Simultaneous 4-quadrant global macro regime stress grid & cross-sovereign resilience ranking',
      },
      {
        id: 'decision_prediction_markets',
        label: 'Polymarket & Kalshi Event Arb',
        description: 'Live Polymarket Gamma & Kalshi v2 dual-venue spread scanner, event vs. CDS probability arbitrage & conditional Bayes shock simulator',
      },
    ],
  },
  {
    id: 'ratings_fx_ic_hub',
    label: '8. Sovereign Ratings, FX & IC Dossier',
    defaultSection: 'ratings_shadow_fallen_angel',
    subTabs: [
      {
        id: 'ratings_shadow_fallen_angel',
        label: 'Shadow Rating & Fallen-Angel Cliff',
        description: 'S&P/Moody’s/Fitch 5-pillar  rating replica, notch dislocation vs. official rating & BBB-/BB+ fallen-angel cliff simulator',
      },
      {
        id: 'fx_beer_feer_equilibrium',
        label: 'FX BEER / FEER Valuation Lab',
        description: 'Behavioral (BEER) & IMF Fundamental (FEER) Real Effective Exchange Rate valuation, current-account norm (% GDP) & misalignment %',
      },
      {
        id: 'debt_investor_base_doom_loop',
        label: 'Investor Base & Bank Doom-Loop',
        description: 'IMF SDIB 5-sector sovereign debt ownership (% share), foreign sudden-stop outflow beta (bps) & domestic bank Tier-1 CET1 doom-loop',
      },
      {
        id: 'ic_pitchbook_dossier_exporter',
        label: 'Boardroom IC Pitchbook & Exports',
        description: 'Multi-sovereign Investment Committee comparative scorecard & multi-page PDF, Markdown & JSON pitchbook exporter',
      },
    ],
  },
  {
    id: 'restructuring_monetary_geo_hub',
    label: '9. Restructuring, Monetary & Geo-Risk',
    defaultSection: 'restructuring_npv_cac_waterfall',
    subTabs: [
      {
        id: 'restructuring_npv_cac_waterfall',
        label: 'IMF / Paris Club Restructuring & NPV',
        description: '5-tier creditor seniority waterfall, IMF Preferred Creditor Status, Paris Club comparability & CAC Eurobond NPV recovery (0–100¢)',
      },
      {
        id: 'taylor_rule_fiscal_dominance',
        label: 'Central Bank Taylor Rule & Dominance',
        description: 'Open-economy Augmented Taylor Rule vs. spot policy rate (bps), fiscal dominance score (0–100) & financial repression tax (% GDP)',
      },
      {
        id: 'geopolitical_reserves_chokepoints',
        label: 'Reserve Custody Freeze & Chokepoints',
        description: 'Central bank FX/gold reserve custody freeze resilience (months import cover) & 5-corridor maritime chokepoint blockade simulator',
      },
      {
        id: 'ngfs_climate_slb_greenium',
        label: 'NGFS Climate Stress & SLB Greenium',
        description: 'NGFS Net Zero / Delayed / Hot House fiscal revenue erosion (% rev), physical damage (% GDP) & SLB step-up spread analyzer (bps)',
      },
    ],
  },
  {
    id: 'persona_playbooks_signal_hub',
    label: '10. Persona Playbooks & Signal Hub',
    defaultSection: 'persona_cross_hub_signal_scanner',
    subTabs: [
      {
        id: 'persona_cross_hub_signal_scanner',
        label: 'Cross-Hub Top Alpha & Research Scanner',
        description: 'Automated 9-engine watchlist synthesis surfacing Top-3 Trader Arbitrage, Institutional IC & Policy Research signals',
      },
      {
        id: 'persona_guided_playbook_cockpit',
        label: 'Guided Persona Playbook Cockpit',
        description: 'Step-by-step operational checklists for Individual Traders, Institutional PMs/ICs & Policy Researchers with 1-click module jump',
      },
      {
        id: 'persona_strategy_backtester_lab',
        label: 'Systematic Strategy Backtester Lab',
        description: 'Historical regime replay (2022–2025) for Prediction Arb, Taylor FX Short, Fallen-Angel Hedge & Eurobond NPV Workout (bps & Sharpe)',
      },
      {
        id: 'persona_academic_latex_csv_exporter',
        label: 'Academic LaTeX & Empirical CSV Exporter',
        description: 'Publication-ready LaTeX Booktabs tables (\\toprule/\\bottomrule), BibTeX citations, Empirical Panel CSV & Working Paper (.md)',
      },
    ],
  },
];

export default function App() {
  // Hydrate any previously onboarded custom ISO-3 sovereigns into SOVEREIGN_CATALOG on boot
  const [customOnboardedSovereigns, setCustomOnboardedSovereigns] = useState<
    CustomSovereignOnboardingDraft[]
  >(() => {
    const savedCustom = loadCustomSovereignsFromStorage();
    savedCustom.forEach((draft) => registerCustomSovereignInCatalog(draft));
    return savedCustom;
  });

  const savedSessionOnBoot = useMemo(() => loadWorkspaceSessionFromStorage(), []);

  // Default to Crisp Editorial Light Mode (false) unless user previously toggled Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (savedSessionOnBoot && typeof savedSessionOnBoot.darkMode === 'boolean') {
      return savedSessionOnBoot.darkMode;
    }
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch {
      // Ignore storage error
    }
    return false;
  });

  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState<boolean>(true);
  const [densityMode, setDensityMode] = useState<WorkspaceDensityMode>('SIMPLE_BRIEF');
  const [showScenarioInput, setShowScenarioInput] = useState<boolean>(false);

  // 3-Mode Workspace Layout Switcher (Default: Clean Executive Briefing)
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>(
    () => savedSessionOnBoot?.layoutMode || 'executive_brief'
  );
  const [activeNavSection, setActiveNavSection] = useState<NavSectionId>(
    () => (savedSessionOnBoot?.activeNavSection as NavSectionId) || 'quant_nss_yield_curve'
  );
  const [activePersona, setActivePersona] = useState<UserPersonaId>(
    () => savedSessionOnBoot?.activePersona || 'INSTITUTIONAL_PM_IC'
  );

  // Collapse Watchlist sidebar by default to maximize 1-2 screen canvas density
  useEffect(() => {
    setIsWatchlistCollapsed(true);
  }, [activeNavSection]);

  // Turnkey Modals & 3-Pillar Dropdown State
  const [openCategoryMenuId, setOpenCategoryMenuId] =
    useState<NavigationCategoryGroupId | null>(null);
  const [openPillarMenuId, setOpenPillarMenuId] =
    useState<ActivityPillarId | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState<boolean>(false);
  // Top-level area: the PM's Today page, or the analysis desks.
  const [userRole, setUserRole] = useState<UserRoleId | null>(() => loadRole());
  const [isRolePromptDismissed, setIsRolePromptDismissed] = useState<boolean>(false);
  const role = getRole(userRole);
  const [appArea, setAppArea] = useState<AppArea>(() => (userRole ? role.home.area : 'today'));
  const [countryTab, setCountryTab] = useState<CountryTabId>(
    () => ((userRole && role.home.countryTab) as CountryTabId) || 'overview'
  );
  const [portfolioTab, setPortfolioTab] = useState<string>(() => (userRole && role.home.portfolioTab) || PORTFOLIO_TABS[0].id);
  const [reportsTab, setReportsTab] = useState<string>(() => (userRole && role.home.reportsTab) || REPORTS_TABS[0].id);
  // Report template asked for from a Country brief; otherwise the role's own template.
  const [requestedReport, setRequestedReport] = useState<ReportTemplate | null>(null);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isPresentMode, setIsPresentMode] = useState<boolean>(false);
  const [holdings, setHoldingsState] = useState<Holding[]>(() => loadHoldings());
  const [isHoldingsPanelOpen, setIsHoldingsPanelOpen] = useState<boolean>(false);
  const setHoldings = (next: Holding[]) => {
    setHoldingsState(next);
    saveHoldings(next);
  };
  const openWorkspace = (area: 'portfolio' | 'reports', deskId?: string) => {
    const tabs = area === 'portfolio' ? PORTFOLIO_TABS : REPORTS_TABS;
    const current = area === 'portfolio' ? portfolioTab : reportsTab;
    const tab = (deskId && findTabForDesk(tabs, deskId)) || tabs.find((t) => t.id === current) || tabs[0];
    (area === 'portfolio' ? setPortfolioTab : setReportsTab)(tab.id);
    const desk = deskId && tab.desks.includes(deskId) ? deskId : tab.desks.includes(activeNavSection) ? activeNavSection : tab.desks[0];
    setActiveNavSection(desk as NavSectionId);
    setAppArea(area);
    window.scrollTo({ top: 0 });
  };
  const applyRole = (id: UserRoleId) => {
    const r = getRole(id);
    saveRole(id);
    setUserRole(id);
    setRequestedReport(null);
    setActivePersona(r.persona);
    if (r.home.reportsTab) setReportsTab(r.home.reportsTab);
    if (r.home.portfolioTab) setPortfolioTab(r.home.portfolioTab);
    if (r.home.area === 'country') {
      const tab = COUNTRY_TABS.find((t) => t.id === r.home.countryTab) || DEFAULT_COUNTRY_TAB;
      setCountryTab(tab.id);
      if (tab.desks[0]) setActiveNavSection(tab.desks[0] as NavSectionId);
      setAppArea('country');
    } else if (r.home.area === 'portfolio' || r.home.area === 'reports') {
      const tabs = r.home.area === 'portfolio' ? PORTFOLIO_TABS : REPORTS_TABS;
      const tabId = r.home.area === 'portfolio' ? r.home.portfolioTab : r.home.reportsTab;
      const tab = tabs.find((t) => t.id === tabId) || tabs[0];
      setActiveNavSection(tab.desks[0] as NavSectionId);
      setAppArea(r.home.area);
    } else {
      setAppArea(r.home.area);
    }
    window.scrollTo({ top: 0 });
  };
  const openCountryPage = (deskId?: string) => {
    if (deskId && !findCountryTabForDesk(deskId) && findTabForDesk(PORTFOLIO_TABS, deskId)) {
      openWorkspace('portfolio', deskId);
      return;
    }
    if (deskId && !findCountryTabForDesk(deskId) && findTabForDesk(REPORTS_TABS, deskId)) {
      openWorkspace('reports', deskId);
      return;
    }
    if (deskId && !findCountryTabForDesk(deskId)) {
      // Not part of any workflow page: open it in the desk library.
      setLayoutMode('executive_brief');
      setActiveNavSection(deskId as NavSectionId);
      setAppArea('desks');
      window.scrollTo({ top: 0 });
      return;
    }
    // No desk asked for: open on the role's own start tab (the Brief for economists and bankers).
    const roleTab = userRole && role.home.area === 'country' ? COUNTRY_TABS.find((t) => t.id === role.home.countryTab) : undefined;
    const tab = (deskId && findCountryTabForDesk(deskId)) || roleTab || DEFAULT_COUNTRY_TAB;
    setCountryTab(tab.id);
    if (tab.desks.length) setActiveNavSection((deskId && tab.desks.includes(deskId) ? deskId : tab.desks[0]) as NavSectionId);
    setAppArea('country');
    window.scrollTo({ top: 0 });
  };
  const returnToCountryPage = () => {
    const tab = COUNTRY_TABS.find((t) => t.id === countryTab) || DEFAULT_COUNTRY_TAB;
    if (tab.desks.length && !tab.desks.includes(activeNavSection)) setActiveNavSection(tab.desks[0] as NavSectionId);
    setAppArea('country');
  };
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHeaderMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isHeaderMenuOpen]);
  const [isIntegrityAuditOpen, setIsIntegrityAuditOpen] = useState<boolean>(false);
  const [isCustomSovereignModalOpen, setIsCustomSovereignModalOpen] =
    useState<boolean>(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isRuntimeModalOpen, setIsRuntimeModalOpen] = useState<boolean>(false);

  // Persistent Custom Watchlists
  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>(() => {
    let saved: WatchlistGroup[] | null = null;
    if (savedSessionOnBoot?.watchlists && savedSessionOnBoot.watchlists.length > 0) {
      saved = savedSessionOnBoot.watchlists;
    } else {
      try {
        const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) saved = parsed;
      } catch {
        // Fallback to defaults
      }
    }
    if (!saved) {
      saveSeenDefaultWatchlists(DEFAULT_WATCHLISTS.map((g) => g.id));
      return DEFAULT_WATCHLISTS;
    }
    // Groups added in a later release (e.g. official 10Y yields) appear once for existing users.
    const { groups, seen } = addNewDefaultWatchlists(saved, loadSeenDefaultWatchlists());
    saveSeenDefaultWatchlists(seen);
    return groups;
  });

  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(
    () =>
      savedSessionOnBoot?.activeWatchlistId ||
      watchlists[0]?.id ||
      'wl_em_sovereign_core'
  );

  // Active Council Run State
  const [run, setRun] = useState<CouncilAssessmentRun>(() =>
    buildDefaultAssessmentRun(savedSessionOnBoot?.activeIso3 || 'BRA')
  );
  const [scenarioInput, setScenarioInput] = useState<string>(
    () => savedSessionOnBoot?.scenarioDirective || SOVEREIGN_CATALOG[0].focusTheme
  );
  const [policyDocTitle, setPolicyDocTitle] = useState<string>(
    'IMF Article IV Consultation Staff Concluding Statement & Central Bank Minutes'
  );
  const [policyDocText, setPolicyDocText] = useState<string>(
    'Staff emphasizes that achieving the primary fiscal balance target requires structural expenditure containment. Unanchored medium-term inflation expectations and external maritime freight volatility warrant continued monetary vigilance and rebuilding of hard-currency liquidity buffers.'
  );

  const [croDraft, setCroDraft] = useState<CROOverrideState>(() => run.croState);
  const [forecastShocks, setForecastShocks] = useState<ForecastingShockInputs>(
    () => savedSessionOnBoot?.forecastShocks || DEFAULT_FORECAST_SHOCKS
  );
  const [scenarioBLabel, setScenarioBLabel] = useState<string>('Live Active Desk State');
  const [geopoliticalWargameParams, setGeopoliticalWargameParams] =
    useState<GeopoliticalWargameParams>(
      () => savedSessionOnBoot?.geopoliticalWargameParams || DEFAULT_WARGAME_PARAMS
    );
  const [propagateGeoShocks, setPropagateGeoShocks] = useState<boolean>(true);
  const [liquidityStressParams, setLiquidityStressParams] = useState<LiquidityStressParams>(
    () => savedSessionOnBoot?.liquidityStressParams || DEFAULT_LIQUIDITY_STRESS_PARAMS
  );

  // Side-by-Side Scenario A vs. Scenario B Delta Comparator & Live World Bank / Treasury Sync State
  const [pinnedScenarioA, setPinnedScenarioA] = useState<ScenarioSnapshotState>(() =>
    captureScenarioSnapshot(
      'Baseline Anchor (Scenario A)',
      run,
      DEFAULT_FORECAST_SHOCKS,
      DEFAULT_WARGAME_PARAMS,
      DEFAULT_LIQUIDITY_STRESS_PARAMS
    )
  );
  const [isScenarioDrawerOpen, setIsScenarioDrawerOpen] = useState<boolean>(false);
  const [isComparatorDrawerOpen, setIsComparatorDrawerOpen] = useState<boolean>(false);
  const [isTradeTicketDrawerOpen, setIsTradeTicketDrawerOpen] = useState<boolean>(false);
  const [stagedTradeTickets, setStagedTradeTickets] = useState<StagedTradeTicketSpec[]>(
    () =>
      computeSovereignNssYieldCurveSuite(
        buildDefaultAssessmentRun(savedSessionOnBoot?.activeIso3 || 'BRA'),
        DEFAULT_NSS_SHOCK_INPUTS
      ).recommendedCurveTickets.slice(0, 2)
  );

  const handleStageTradeTicket = (ticket: StagedTradeTicketSpec) => {
    setStagedTradeTickets((prev) => {
      const exists = prev.some((t) => t.ticketId === ticket.ticketId);
      if (exists) return prev;
      return [ticket, ...prev];
    });
    setIsTradeTicketDrawerOpen(true);
    setStatusBanner({
      type: 'success',
      message: `Staged IC Trade Ticket: "${ticket.strategyTitle}" (${ticket.iso3} · +${ticket.expected12MCarryRollBps} bps/yr Carry+Roll).`,
    });
  };

  const handleRemoveTradeTicket = (ticketId: string) => {
    setStagedTradeTickets((prev) => prev.filter((t) => t.ticketId !== ticketId));
  };
  const [liveMacroSyncResult, setLiveMacroSyncResult] = useState<LiveMacroSyncResult | null>(
    null
  );
  const [isSyncingLiveMacro, setIsSyncingLiveMacro] = useState<boolean>(false);
  const [customBacktestEpisodes, setCustomBacktestEpisodes] = useState<HistoricalCrisisEpisode[]>(
    []
  );
  const [selectedBacktestEpisodeId, setSelectedBacktestEpisodeId] = useState<
    HistoricalCrisisEpisodeId | undefined
  >(undefined);

  const [runtimeConfig, setRuntimeConfig] = useState<AIRuntimeConfig>(() => {
    try {
      const saved = localStorage.getItem(AI_RUNTIME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.providerMode) {
          return parsed as AIRuntimeConfig;
        }
      }
    } catch {
      // Ignore storage error
    }
    return {
      providerMode: 'gemini',
      geminiQuickModel: 'gemini-3.8-flash',
      geminiDeepModel: 'gemini-3.8-flash',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaQuickModel: 'qwen2.5:7b',
      ollamaDeepModel: 'deepseek-r1:8b',
      openAiBaseUrl: 'http://localhost:8000/v1',
      openAiModel: 'gpt-4o',
      webhookTargetUrl: '',
      enableSearchGrounding: true,
      maxDebateRounds: 2,
    };
  });

  // Hydrate server environment defaults (e.g., when self-hosted inside Docker on Mac or Windows)
  useEffect(() => {
    const hasSavedLocalPref = (() => {
      try {
        return Boolean(localStorage.getItem(AI_RUNTIME_STORAGE_KEY));
      } catch {
        return false;
      }
    })();
    fetch('/api/ai/runtime-defaults')
      .then((r) => r.json())
      .then((defaults) => {
        if (!defaults) return;
        setRuntimeConfig((prev) => ({
          ...prev,
          providerMode: !hasSavedLocalPref ? defaults.providerMode || prev.providerMode : prev.providerMode,
          ollamaBaseUrl: !hasSavedLocalPref ? defaults.ollamaBaseUrl || prev.ollamaBaseUrl : prev.ollamaBaseUrl,
          ollamaQuickModel: !hasSavedLocalPref ? defaults.ollamaQuickModel || prev.ollamaQuickModel : prev.ollamaQuickModel,
          ollamaDeepModel: !hasSavedLocalPref ? defaults.ollamaDeepModel || prev.ollamaDeepModel : prev.ollamaDeepModel,
          openAiBaseUrl: !hasSavedLocalPref ? defaults.openAiBaseUrl || prev.openAiBaseUrl : prev.openAiBaseUrl,
          openAiModel: !hasSavedLocalPref ? defaults.openAiModel || prev.openAiModel : prev.openAiModel,
          apiConnectors:
            prev.apiConnectors && prev.apiConnectors.length > 0
              ? prev.apiConnectors
              : defaults.apiConnectors,
          integrationConfig: prev.integrationConfig || defaults.integrationConfig,
        }));
      })
      .catch(() => {
        // Ignore network error
      });
  }, []);

  // Persist AI Runtime config changes
  useEffect(() => {
    try {
      localStorage.setItem(AI_RUNTIME_STORAGE_KEY, JSON.stringify(runtimeConfig));
    } catch {
      // Ignore storage error
    }
  }, [runtimeConfig]);

  const [isFetchingOpenData, setIsFetchingOpenData] = useState<boolean>(false);
  const [isRunningPhase1And2, setIsRunningPhase1And2] = useState<boolean>(false);
  const [isRunningPhase3, setIsRunningPhase3] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'warning' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Sync dark mode class on <html> and persist preference
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
    } catch {
      // Ignore storage error
    }
  }, [darkMode]);

  // Persist watchlists
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlists));
    } catch {
      // Ignore storage quota errors
    }
  }, [watchlists]);

  // Build current WorkspaceSessionSnapshot and persist automatically
  const currentWorkspaceSessionSnapshot = useMemo<WorkspaceSessionSnapshot>(
    () => ({
      schemaVersion: 'ECONQUEST-SESSION-1.0',
      savedAtIso: new Date().toISOString(),
      sessionLabel: `${run.countryName} (${run.iso3}) · ${activePersona}`,
      activeIso3: run.iso3,
      activeCountryName: run.countryName,
      activePersona,
      activeNavSection,
      layoutMode,
      darkMode,
      scenarioDirective: scenarioInput,
      forecastShocks,
      geopoliticalWargameParams,
      liquidityStressParams,
      watchlists,
      activeWatchlistId,
      customOnboardedSovereigns,
    }),
    [
      run.iso3,
      run.countryName,
      activePersona,
      activeNavSection,
      layoutMode,
      darkMode,
      scenarioInput,
      forecastShocks,
      geopoliticalWargameParams,
      liquidityStressParams,
      watchlists,
      activeWatchlistId,
      customOnboardedSovereigns,
    ]
  );

  useEffect(() => {
    saveWorkspaceSessionToStorage(currentWorkspaceSessionSnapshot);
  }, [currentWorkspaceSessionSnapshot]);

  // Global keyboard shortcut Cmd+K / Ctrl+K for Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Pull live open data on initial mount for default sovereign & hydrate all watchlists
  useEffect(() => {
    handlePullLiveOpenData(run.iso3, run.countryName, true);
    handleHydrateLiveWatchlists();
  }, []);

  const handleHydrateLiveWatchlists = async () => {
    try {
      const res = await fetch('/api/data/watchlist-live');
      if (!res.ok) return;
      const data = await res.json();
      const liveItems: WatchlistItem[] = Array.isArray(data?.items) ? data.items : [];
      if (liveItems.length === 0) return;
      const byIso = new Map(liveItems.map((it) => [it.iso3, it]));
      setWatchlists((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) => byIso.get(item.iso3) || item),
        }))
      );
    } catch {
      // Keep cached watchlist if background hydration fails
    }
  };

  const handlePullLiveOpenData = async (
    iso3Target = run.iso3,
    countryNameTarget = run.countryName,
    silent = false
  ) => {
    setIsFetchingOpenData(true);
    if (!silent) {
      setStatusBanner({
        type: 'info',
        message: `Fetching the latest public data for ${countryNameTarget}…`,
      });
    }
    try {
      const res = await fetch(
        `/api/data/sovereign-snapshot?iso3=${encodeURIComponent(
          iso3Target
        )}&countryName=${encodeURIComponent(countryNameTarget)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.snapshot && data?.charts) {
          setRun((prev) => {
            if (data.run) {
              return {
                ...data.run,
                scenarioPrompt: prev.scenarioPrompt || data.run.scenarioPrompt,
                policyDocumentTitle: prev.policyDocumentTitle || data.run.policyDocumentTitle,
                policyDocumentSnippet: prev.policyDocumentSnippet || data.run.policyDocumentSnippet,
              };
            }
            return {
              ...prev,
              openData: data.snapshot,
              charts: data.charts,
            };
          });
          if (data.run?.croState) {
            setCroDraft(data.run.croState);
          }
          // Sync active sovereign metrics in watchlists
          const snap = data.snapshot;
          const liveGeo = data.run?.croState?.geopoliticalRiskScore;
          const liveSov = data.run?.croState?.sovereignRiskScore;
          const liveMac = data.run?.croState?.macroRiskScore;
          setWatchlists((prev) =>
            prev.map((group) => ({
              ...group,
              items: group.items.map((it) =>
                it.iso3 === snap.iso3
                  ? {
                      ...it,
                      ...watchlistYieldFields(snap),
                      cds5YBps: snap.monetaryAndMarket.cds5YSpreadBps,
                      debtToGdpPct: snap.imfIndicators.debtToGdpPct,
                      fxReservesMonths: snap.worldBankIndicators.fxReservesMonthsImport,
                      geopoliticalRisk: typeof liveGeo === 'number' ? liveGeo : it.geopoliticalRisk,
                      sovereignRisk: typeof liveSov === 'number' ? liveSov : it.sovereignRisk,
                      macroRisk: typeof liveMac === 'number' ? liveMac : it.macroRisk,
                      compositeRisk:
                        typeof liveGeo === 'number' && typeof liveSov === 'number' && typeof liveMac === 'number'
                          ? Number(((liveGeo + liveSov + liveMac) / 3).toFixed(2))
                          : it.compositeRisk,
                    }
                  : it
              ),
            }))
          );
          if (!silent) {
            setStatusBanner(describeSnapshotSync(data.snapshot, countryNameTarget));
          }
        }
      }
    } catch {
      if (!silent) {
        setStatusBanner({
          type: 'warning',
          message: `Couldn't reach the data server. ${countryNameTarget} shows the last saved figures; check the data status badge for what is live.`,
        });
      }
    } finally {
      setIsFetchingOpenData(false);
    }
  };

  const handleSelectSovereign = (item: WatchlistItem) => {
    const nextRun = buildDefaultAssessmentRun(item.iso3);
    nextRun.countryName = item.countryName;
    nextRun.scenarioPrompt = item.focusTheme;
    setRun(nextRun);
    setCroDraft(nextRun.croState);
    setScenarioInput(item.focusTheme);
    setForecastShocks(DEFAULT_FORECAST_SHOCKS);
    setScenarioBLabel('Live Active Desk State');
    setPinnedScenarioA(
      captureScenarioSnapshot(
        'Baseline Anchor (Scenario A)',
        nextRun,
        DEFAULT_FORECAST_SHOCKS,
        geopoliticalWargameParams,
        liquidityStressParams
      )
    );
    handlePullLiveOpenData(item.iso3, item.countryName, false);
  };

  // Live World Bank WDI v2 & US Treasury Fiscal Data API Sync Handler
  const handleSyncLiveWorldBankAndTreasury = async () => {
    setIsSyncingLiveMacro(true);
    setStatusBanner({
      type: 'info',
      message: `Checking World Bank and US Treasury for new ${run.countryName} figures…`,
    });
    try {
      const result = await syncLiveWorldBankAndTreasuryData(run.openData);
      setLiveMacroSyncResult(result);
      const updatedCharts = buildAnnotatedChartsForSovereign(result.updatedSnapshot);
      setRun((prev) => ({
        ...prev,
        openData: result.updatedSnapshot,
        charts: updatedCharts,
      }));
      setWatchlists((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((it) =>
            it.iso3 === result.iso3
              ? {
                  ...it,
                  debtToGdpPct: result.updatedSnapshot.imfIndicators.debtToGdpPct,
                  fxReservesMonths:
                    result.updatedSnapshot.worldBankIndicators.fxReservesMonthsImport,
                }
              : it
          ),
        }))
      );
      setStatusBanner({
        type: result.syncStatus === 'DETERMINISTIC_FALLBACK' ? 'warning' : 'success',
        message: result.summaryHeadline,
      });
    } catch {
      setStatusBanner({
        type: 'warning',
        message: `Couldn't reach World Bank or US Treasury. ${run.countryName}'s figures are unchanged.`,
      });
    } finally {
      setIsSyncingLiveMacro(false);
    }
  };

  // Scenario A vs. Scenario B Delta Comparison Suite
  const liveScenarioBSnapshot = useMemo(
    () =>
      captureScenarioSnapshot(
        scenarioBLabel,
        run,
        forecastShocks,
        geopoliticalWargameParams,
        liquidityStressParams
      ),
    [scenarioBLabel, run, forecastShocks, geopoliticalWargameParams, liquidityStressParams]
  );

  const scenarioComparisonSuite = useMemo(
    () => computeScenarioDeltaComparison(pinnedScenarioA, liveScenarioBSnapshot),
    [pinnedScenarioA, liveScenarioBSnapshot]
  );
  const scenarioChangeCount =
    scenarioComparisonSuite.deteriorationCount + scenarioComparisonSuite.improvementCount;

  const handlePinCurrentAsScenarioA = () => {
    const pinned = captureScenarioSnapshot(
      `Pinned Anchor (${run.iso3})`,
      run,
      forecastShocks,
      geopoliticalWargameParams,
      liquidityStressParams
    );
    setPinnedScenarioA(pinned);
    setStatusBanner({
      type: 'success',
      message: `Pinned current ${run.countryName} (${run.iso3}) state as Scenario A reference anchor (${pinned.capturedAt}).`,
    });
  };

  const handleSwapScenarioAAndB = () => {
    const prevA = pinnedScenarioA;
    setPinnedScenarioA({
      ...liveScenarioBSnapshot,
      label: `Swapped Anchor (${liveScenarioBSnapshot.label})`,
    });
    setForecastShocks(prevA.forecastShocks);
    setGeopoliticalWargameParams(prevA.geoWargameParams);
    setLiquidityStressParams(prevA.liquidityStressParams);
    setScenarioBLabel(prevA.label);
  };

  const handleResetScenarioBToBaseline = () => {
    setForecastShocks(DEFAULT_FORECAST_SHOCKS);
    setGeopoliticalWargameParams(DEFAULT_WARGAME_PARAMS);
    setLiquidityStressParams(DEFAULT_LIQUIDITY_STRESS_PARAMS);
    setScenarioBLabel('Live Baseline State');
  };

  const handleApplyHistoricalCrisisShocks = (
    episode: HistoricalCrisisEpisode,
    shocks: ForecastingShockInputs
  ) => {
    setPinnedScenarioA(
      captureScenarioSnapshot(
        `Pre-Crisis Baseline (${run.iso3})`,
        run,
        DEFAULT_FORECAST_SHOCKS,
        DEFAULT_WARGAME_PARAMS,
        DEFAULT_LIQUIDITY_STRESS_PARAMS
      )
    );
    setForecastShocks(shocks);
    setScenarioBLabel(`${episode.eraLabel} Crisis Shock`);
    setIsScenarioDrawerOpen(true);
    setStatusBanner({
      type: 'warning',
      message: `Loaded "${episode.title}" shock parameters into live ${run.countryName} (${run.iso3}) desk and opened Scenario A vs. B Delta Comparator.`,
    });
  };

  const handleApplyCsvToLiveState = (
    updatedOpenData: OpenDataSnapshot,
    updatedCharts: AnnotatedChartSpec[],
    datasetSummary: string
  ) => {
    setRun((prev) => ({
      ...prev,
      openData: updatedOpenData,
      charts: updatedCharts,
    }));
    setWatchlists((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((it) =>
          it.iso3 === updatedOpenData.iso3
            ? {
                ...it,
                yield10YPct: updatedOpenData.monetaryAndMarket.sovereign10YBondYieldPct,
                yield10YSource: 'uploaded',
                yield10YPeriod: undefined,
                yield10YFrequency: undefined,
                cds5YBps: updatedOpenData.monetaryAndMarket.cds5YSpreadBps,
                debtToGdpPct: updatedOpenData.imfIndicators.debtToGdpPct,
                fxReservesMonths: updatedOpenData.worldBankIndicators.fxReservesMonthsImport,
              }
            : it
        ),
      }))
    );
    setScenarioBLabel('CSV Batch Calibrated State');
    setStatusBanner({
      type: 'success',
      message: datasetSummary,
    });
  };

  const handleRegisterCustomCrisisBacktest = (
    customEpisode: HistoricalCrisisEpisode,
    navigateImmediately: boolean
  ) => {
    setCustomBacktestEpisodes((prev) => {
      const filtered = prev.filter((ep) => ep.id !== customEpisode.id);
      return [customEpisode, ...filtered];
    });
    setSelectedBacktestEpisodeId(customEpisode.id);
    if (navigateImmediately) {
      setLayoutMode('executive_brief');
    setAppArea('desks');
      setActiveNavSection('backtest_engine');
    }
    setStatusBanner({
      type: 'success',
      message: `Registered custom CSV backtest "${customEpisode.title}" (${customEpisode.timeline.length} steps, Peak 5Y CDS ${customEpisode.peakSpreadBps} bps, EWS Lead Time T-${customEpisode.earlyWarningLeadTimeMonths} steps).`,
    });
  };

  const handleApplyCalibratedDocumentShock = (
    shock: CalibratedPolicyShockVector,
    docTitleStr: string,
    docTextStr: string
  ) => {
    setPolicyDocTitle(docTitleStr);
    setPolicyDocText(docTextStr);

    const nextOpenData: OpenDataSnapshot = JSON.parse(JSON.stringify(run.openData));
    nextOpenData.monetaryAndMarket.policyRatePct = Number(
      Math.max(
        0.5,
        nextOpenData.monetaryAndMarket.policyRatePct + shock.policyRateDeltaBps / 100
      ).toFixed(2)
    );
    nextOpenData.imfIndicators.primaryFiscalBalancePct = Number(
      (
        nextOpenData.imfIndicators.primaryFiscalBalancePct +
        shock.primaryFiscalBalanceDeltaPctGdp
      ).toFixed(2)
    );
    nextOpenData.monetaryAndMarket.cds5YSpreadBps = Math.max(
      15,
      Math.round(nextOpenData.monetaryAndMarket.cds5YSpreadBps + shock.sovereignSpreadShockBps)
    );
    nextOpenData.worldBankIndicators.fxReservesMonthsImport = Number(
      Math.max(
        0.8,
        nextOpenData.worldBankIndicators.fxReservesMonthsImport +
          shock.fxReserveAdequacyDeltaMonths
      ).toFixed(2)
    );
    recomputeDerivedOpenDataAnalytics(nextOpenData);
    const updatedCharts = buildAnnotatedChartsForSovereign(nextOpenData);

    const nextCro: CROOverrideState = {
      ...croDraft,
      energyInflationShockPct: Number(
        Math.max(0, croDraft.energyInflationShockPct + shock.energyAndCpiShockPct).toFixed(1)
      ),
      debtServicingSpreadBps: Math.max(
        10,
        Math.round(croDraft.debtServicingSpreadBps + shock.sovereignSpreadShockBps)
      ),
      fxReserveAdequacyMonths: nextOpenData.worldBankIndicators.fxReservesMonthsImport,
      politicalWillIndex: Math.max(
        10,
        Math.min(98, Math.round(croDraft.politicalWillIndex + shock.politicalWillDeltaPoints))
      ),
      croNotes: `${docTitleStr}: ${shock.rationaleSummary}`,
    };

    setCroDraft(nextCro);
    setRun((prev) => ({
      ...prev,
      policyDocumentTitle: docTitleStr,
      policyDocumentSnippet: docTextStr.slice(0, 600),
      openData: nextOpenData,
      charts: updatedCharts,
      croState: nextCro,
    }));
    setForecastShocks((prev) => ({
      ...prev,
      realRateShockBps: prev.realRateShockBps + shock.policyRateDeltaBps,
      primaryBalanceShockPctGdp: Number(
        (prev.primaryBalanceShockPctGdp + shock.primaryFiscalBalanceDeltaPctGdp).toFixed(2)
      ),
    }));
    setScenarioBLabel(`Doc AI Calibrated (${docTitleStr.slice(0, 26)})`);
    setStatusBanner({
      type: 'success',
      message: `Applied calibrated document shock vector from "${docTitleStr}" to live ${run.countryName} (${run.iso3}) terminal state (${shock.rationaleSummary}).`,
    });
  };

  const handleApplyConditionalEventShock = (sim: ConditionalBayesianEventSimulation) => {
    const nextOpenData: OpenDataSnapshot = JSON.parse(JSON.stringify(run.openData));
    nextOpenData.monetaryAndMarket.cds5YSpreadBps = Math.max(
      15,
      Math.round(nextOpenData.monetaryAndMarket.cds5YSpreadBps + sim.conditional5YCdsDeltaBps)
    );
    nextOpenData.monetaryAndMarket.sovereign10YBondYieldPct = Number(
      Math.max(
        0.5,
        nextOpenData.monetaryAndMarket.sovereign10YBondYieldPct +
          sim.conditional10YYieldDeltaBps / 100
      ).toFixed(2)
    );
    recomputeDerivedOpenDataAnalytics(nextOpenData);
    const updatedCharts = buildAnnotatedChartsForSovereign(nextOpenData);

    const nextCro: CROOverrideState = {
      ...croDraft,
      debtServicingSpreadBps: Math.max(
        10,
        Math.round(croDraft.debtServicingSpreadBps + sim.conditional5YCdsDeltaBps)
      ),
      croNotes: `[${sim.selectedContract.venue} Event Shock] ${sim.selectedContract.question} repriced from ${sim.currentMarketProbPct}¢ to ${sim.simulatedShockProbPct}¢.`,
    };

    setCroDraft(nextCro);
    setRun((prev) => ({
      ...prev,
      openData: nextOpenData,
      charts: updatedCharts,
      croState: nextCro,
    }));
    setForecastShocks((prev) => ({
      ...prev,
      realRateShockBps: prev.realRateShockBps + sim.conditional10YYieldDeltaBps,
      fxDepreciationShockPct: Number(
        (prev.fxDepreciationShockPct + sim.conditionalSpotFxDeltaPct).toFixed(1)
      ),
    }));
    setScenarioBLabel(`${sim.selectedContract.venue} Event Shock (${sim.simulatedShockProbPct}¢)`);
    setStatusBanner({
      type: 'success',
      message: `Applied conditional ${sim.selectedContract.venue} event shock ("${sim.selectedContract.question}" @ ${sim.simulatedShockProbPct}¢) to live ${run.countryName} (${run.iso3}) terminal state (5Y CDS Δ: ${sim.conditional5YCdsDeltaBps >= 0 ? `+${sim.conditional5YCdsDeltaBps}` : sim.conditional5YCdsDeltaBps} bps, 10Y Yield Δ: ${sim.conditional10YYieldDeltaBps >= 0 ? `+${sim.conditional10YYieldDeltaBps}` : sim.conditional10YYieldDeltaBps} bps).`,
    });
  };

  const handleApplyRatingOrDoomLoopShockToTerminal = (params: {
    label: string;
    cdsDeltaBps: number;
    yield10YDeltaBps: number;
    fxDepreciationPct: number;
  }) => {
    const nextOpenData: OpenDataSnapshot = JSON.parse(JSON.stringify(run.openData));
    nextOpenData.monetaryAndMarket.cds5YSpreadBps = Math.max(
      15,
      Math.round(nextOpenData.monetaryAndMarket.cds5YSpreadBps + params.cdsDeltaBps)
    );
    nextOpenData.monetaryAndMarket.sovereign10YBondYieldPct = Number(
      Math.max(
        0.5,
        nextOpenData.monetaryAndMarket.sovereign10YBondYieldPct + params.yield10YDeltaBps / 100
      ).toFixed(2)
    );
    recomputeDerivedOpenDataAnalytics(nextOpenData);
    const updatedCharts = buildAnnotatedChartsForSovereign(nextOpenData);

    const nextCro: CROOverrideState = {
      ...croDraft,
      debtServicingSpreadBps: Math.max(
        10,
        Math.round(croDraft.debtServicingSpreadBps + params.cdsDeltaBps)
      ),
      croNotes: `${params.label} applied to live sovereign state (5Y CDS Δ: ${params.cdsDeltaBps >= 0 ? `+${params.cdsDeltaBps}` : params.cdsDeltaBps} bps).`,
    };

    setCroDraft(nextCro);
    setRun((prev) => ({
      ...prev,
      openData: nextOpenData,
      charts: updatedCharts,
      croState: nextCro,
    }));
    setForecastShocks((prev) => ({
      ...prev,
      realRateShockBps: prev.realRateShockBps + params.yield10YDeltaBps,
      fxDepreciationShockPct: Number(
        (prev.fxDepreciationShockPct + params.fxDepreciationPct).toFixed(1)
      ),
    }));
    setScenarioBLabel(params.label.slice(0, 34));
    setStatusBanner({
      type: 'success',
      message: `Applied "${params.label}" to live ${run.countryName} (${run.iso3}) terminal state (5Y CDS Δ: ${params.cdsDeltaBps >= 0 ? `+${params.cdsDeltaBps}` : params.cdsDeltaBps} bps, 10Y Yield Δ: ${params.yield10YDeltaBps >= 0 ? `+${params.yield10YDeltaBps}` : params.yield10YDeltaBps} bps).`,
    });
  };

  const handleApplyConnectorTelemetryToActiveSovereign = (
    connectorName: string,
    extracted: Partial<Record<ExternalInternalConnectorMetricKey, number>>
  ) => {
    const nextOpenData: OpenDataSnapshot = JSON.parse(JSON.stringify(run.openData));
    const appliedFields: string[] = [];

    if (typeof extracted.gdpGrowth === 'number') {
      nextOpenData.imfIndicators.realGdpGrowthPct = extracted.gdpGrowth;
      appliedFields.push(`GDP Growth=${extracted.gdpGrowth}%`);
    }
    if (typeof extracted.cpiInflation === 'number') {
      nextOpenData.imfIndicators.cpiInflationPct = extracted.cpiInflation;
      appliedFields.push(`CPI=${extracted.cpiInflation}%`);
    }
    if (typeof extracted.debtToGdp === 'number') {
      nextOpenData.imfIndicators.debtToGdpPct = extracted.debtToGdp;
      appliedFields.push(`Debt/GDP=${extracted.debtToGdp}%`);
    }
    if (typeof extracted.cds5yBps === 'number') {
      nextOpenData.monetaryAndMarket.cds5YSpreadBps = Math.round(extracted.cds5yBps);
      appliedFields.push(`5Y CDS=${Math.round(extracted.cds5yBps)} bps`);
    }
    if (typeof extracted.fxReservesMonths === 'number') {
      nextOpenData.worldBankIndicators.fxReservesMonthsImport = extracted.fxReservesMonths;
      appliedFields.push(`FX Cover=${extracted.fxReservesMonths} mos`);
    }
    if (typeof extracted.policyRate === 'number') {
      nextOpenData.monetaryAndMarket.policyRatePct = extracted.policyRate;
      appliedFields.push(`Policy Rate=${extracted.policyRate}%`);
    }
    if (typeof extracted.politicalStability === 'number') {
      nextOpenData.worldBankIndicators.politicalStabilityPercentile = extracted.politicalStability;
      appliedFields.push(`Pol Stability=${extracted.politicalStability} pctl`);
    }

    if (appliedFields.length === 0) return;

    nextOpenData.liveApiSourcesActive = Array.from(
      new Set([...(nextOpenData.liveApiSourcesActive || []), `${connectorName} (GUI Connector)`])
    );
    recomputeDerivedOpenDataAnalytics(nextOpenData);
    const updatedCharts = buildAnnotatedChartsForSovereign(nextOpenData);

    setRun((prev) => ({
      ...prev,
      openData: nextOpenData,
      charts: updatedCharts,
    }));
    setStatusBanner({
      type: 'success',
      message: `Applied mapped JSON telemetry from "${connectorName}" to ${run.countryName} (${run.iso3}): ${appliedFields.join(' · ')}.`,
    });
  };

  const handleCreateWatchlist = (name: string, description: string) => {
    const newWl: WatchlistGroup = {
      id: `wl_custom_${Date.now()}`,
      name,
      description,
      isCustom: true,
      items: [SOVEREIGN_CATALOG[0], SOVEREIGN_CATALOG[1]],
    };
    setWatchlists((prev) => [...prev, newWl]);
    setActiveWatchlistId(newWl.id);
    setStatusBanner({
      type: 'success',
      message: `Created custom watchlist "${name}".`,
    });
  };

  const handleDeleteWatchlist = (id: string) => {
    setWatchlists((prev) => {
      const next = prev.filter((w) => w.id !== id);
      if (activeWatchlistId === id && next[0]) {
        setActiveWatchlistId(next[0].id);
      }
      return next;
    });
  };

  const handleAddSovereignToWatchlist = (watchlistId: string, item: WatchlistItem) => {
    setWatchlists((prev) =>
      prev.map((w) => {
        if (w.id !== watchlistId) return w;
        const exists = w.items.some((i) => i.iso3 === item.iso3);
        if (exists) return w;
        return { ...w, items: [...w.items, item] };
      })
    );
    handleSelectSovereign(item);
  };

  const handleRemoveSovereignFromWatchlist = (watchlistId: string, iso3: string) => {
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === watchlistId ? { ...w, items: w.items.filter((i) => i.iso3 !== iso3) } : w
      )
    );
  };

  const handleDocumentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPolicyDocTitle(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setPolicyDocText(content.slice(0, 25000));
      setStatusBanner({
        type: 'success',
        message: `Ingested policy document "${file.name}" (${content.length.toLocaleString()} characters) into Council context window.`,
      });
    };
    reader.readAsText(file);
  };

  // Run Phase 1 (Sub-Agents + Devil's Advocate Debates) & Phase 2 (Cross-Desk Cascade), then pause at CRO Checkpoint
  const handleRunCouncilPhase1And2 = async () => {
    setIsRunningPhase1And2(true);
    setStatusBanner({
      type: 'info',
      message: `Executing Phase 1 (9 Sub-Agents & Devil's Advocate Debates) + Phase 2 (Cross-Desk Dependency Cascade) for ${run.countryName} (${run.iso3})...`,
    });

    try {
      const res = await fetch('/api/council/phase1-and-cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iso3: run.iso3,
          countryName: run.countryName,
          scenarioPrompt: scenarioInput,
          policyDocumentTitle: policyDocTitle,
          policyDocumentText: policyDocText,
          runtimeConfig,
          geopoliticalWargameParams,
          liquidityStressParams,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Council Phase 1 & 2 failed');
      }
      if (data?.run) {
        setRun(data.run);
        setCroDraft(data.run.croState);
        if (layoutMode === 'executive_brief') {
          setActiveNavSection('cro_reports');
        }
        setStatusBanner({
          type: 'warning',
          message: `Phase 1 (Desk Debates) & Phase 2 (Dependency Cascade) complete. Pipeline paused at Human-in-the-Loop CRO Checkpoint — review or override assumptions below and click "Approve Assumptions & Convene Supreme Council".`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Error running Council Phase 1 & 2',
      });
    } finally {
      setIsRunningPhase1And2(false);
    }
  };

  // Run Phase 3 (Supreme Council Synthesis after CRO Approval / Override)
  const handleApproveAndConveneSupremeCouncil = async () => {
    setIsRunningPhase3(true);
    setStatusBanner({
      type: 'info',
      message: `CRO Gate Approved. Convening Supreme Council Orchestrator (Deep Think Synthesis) to generate standardized SMCR-1.0 Report...`,
    });

    try {
      const res = await fetch('/api/council/supreme-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run,
          croOverrideState: croDraft,
          runtimeConfig,
          geopoliticalWargameParams,
          liquidityStressParams,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Supreme Council synthesis failed');
      }
      if (data?.run) {
        setRun(data.run);
        setCroDraft(data.run.croState);
        if (layoutMode === 'executive_brief') {
          setActiveNavSection('cro_reports');
        }
        setStatusBanner({
          type: 'success',
          message: `Supreme Council synthesis complete (${data.run.supremeCouncil?.reportId}). Standardized SMCR-1.0 PDF, YAML-Markdown, and JSON-Schema reports are ready for export.`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Failed to synthesize Supreme Council report',
      });
    } finally {
      setIsRunningPhase3(false);
    }
  };

  const activeWatchlistItems =
    watchlists.find((w) => w.id === activeWatchlistId)?.items || SOVEREIGN_CATALOG;
  // Imported holdings, shaped for the stress lab (weights) and the contagion desk (positions).
  const holdingsStressWeights = useMemo(
    () => holdingsWeightsPct(holdings, SOVEREIGN_CATALOG.map((c) => c.iso3)),
    [holdings]
  );
  const holdingsContagionBook = useMemo(() => holdingsToContagionBook(holdings, SOVEREIGN_CATALOG), [holdings]);
  // Risk scores for held countries: the active watchlist first (it may carry live figures), then the catalogue.
  const holdingsRiskLookup = [
    ...activeWatchlistItems,
    ...SOVEREIGN_CATALOG.filter((c) => !activeWatchlistItems.some((w) => w.iso3 === c.iso3)),
  ];

  const activeDomainHub =
    DOMAIN_HUBS.find((hub) => hub.subTabs.some((t) => t.id === activeNavSection)) ||
    DOMAIN_HUBS[0];

  const activeSubTabObj =
    activeDomainHub.subTabs.find((t) => t.id === activeNavSection) ||
    activeDomainHub.subTabs[0];

  const allRegisteredSovereigns = useMemo(() => {
    const byIso = new Map<string, WatchlistItem>();
    SOVEREIGN_CATALOG.forEach((it) => byIso.set(it.iso3, it));
    watchlists.forEach((wl) => wl.items.forEach((it) => byIso.set(it.iso3, it)));
    return Array.from(byIso.values());
  }, [watchlists, customOnboardedSovereigns]);

  const commandPaletteItems = useMemo(
    () =>
      buildCommandPaletteIndex(
        buildThreePillarHubsForCommandPalette(),
        allRegisteredSovereigns
      ),
    [allRegisteredSovereigns]
  );

  const liveIntegrityAuditReport = useMemo(
    () => runPreFlightModelIntegrityAudit(run, activeWatchlistItems),
    [run, activeWatchlistItems]
  );

  const handleOnboardCustomSovereign = (draft: CustomSovereignOnboardingDraft) => {
    const newItem = registerCustomSovereignInCatalog(draft);
    setCustomOnboardedSovereigns((prev) => {
      const filtered = prev.filter((c) => c.iso3 !== newItem.iso3);
      return [...filtered, draft];
    });
    setWatchlists((prev) =>
      prev.map((w) => {
        if (w.id !== activeWatchlistId) return w;
        const exists = w.items.some((i) => i.iso3 === newItem.iso3);
        if (exists) {
          return {
            ...w,
            items: w.items.map((i) => (i.iso3 === newItem.iso3 ? newItem : i)),
          };
        }
        return { ...w, items: [...w.items, newItem] };
      })
    );
    const nextRun = buildDefaultAssessmentRun(newItem.iso3);
    setRun(nextRun);
    setCroDraft(nextRun.croState);
    setScenarioInput(newItem.focusTheme);
    setStatusBanner({
      type: 'success',
      message: `Onboarded ${newItem.countryName} (${newItem.iso3} · ${newItem.currencyCode}) into active watchlist and all 10 analytical hubs (Debt/GDP ${newItem.debtToGdpPct.toFixed(1)}%, 10Y Yield ${newItem.yield10YPct.toFixed(2)}%, 5Y CDS ${newItem.cds5YBps} bps).`,
    });
  };

  const handleRestoreWorkspaceSession = (snap: WorkspaceSessionSnapshot) => {
    if (Array.isArray(snap.customOnboardedSovereigns)) {
      snap.customOnboardedSovereigns.forEach((d) => registerCustomSovereignInCatalog(d));
      setCustomOnboardedSovereigns(snap.customOnboardedSovereigns);
    }
    setWatchlists(snap.watchlists);
    setActiveWatchlistId(snap.activeWatchlistId);
    setActivePersona(snap.activePersona);
    setActiveNavSection(snap.activeNavSection as NavSectionId);
    setLayoutMode(snap.layoutMode);
    setDarkMode(snap.darkMode);
    setScenarioInput(snap.scenarioDirective);
    setForecastShocks(snap.forecastShocks);
    setGeopoliticalWargameParams(snap.geopoliticalWargameParams);
    setLiquidityStressParams(snap.liquidityStressParams);
    const nextRun = buildDefaultAssessmentRun(snap.activeIso3);
    setRun(nextRun);
    setCroDraft(nextRun.croState);
    setStatusBanner({
      type: 'success',
      message: `Restored workspace session "${snap.sessionLabel}" (${snap.savedAtIso.slice(0, 19)}).`,
    });
  };

  const handleResetFactoryDefaults = () => {
    setCustomOnboardedSovereigns([]);
    setWatchlists(DEFAULT_WATCHLISTS);
    setActiveWatchlistId(DEFAULT_WATCHLISTS[0].id);
    setActivePersona('INDIVIDUAL_TRADER');
    setActiveNavSection('charts_watchlists');
    setLayoutMode('executive_brief');
    setAppArea('today');
    setForecastShocks(DEFAULT_FORECAST_SHOCKS);
    setGeopoliticalWargameParams(DEFAULT_WARGAME_PARAMS);
    setLiquidityStressParams(DEFAULT_LIQUIDITY_STRESS_PARAMS);
    const nextRun = buildDefaultAssessmentRun('BRA');
    setRun(nextRun);
    setCroDraft(nextRun.croState);
    setScenarioInput(SOVEREIGN_CATALOG[0].focusTheme);
    setStatusBanner({
      type: 'info',
      message: 'Reset workspace state, watchlists, and shock parameters to factory defaults.',
    });
  };

  const handleSelectCommandPaletteItem = (item: CommandPaletteItem) => {
    if (item.targetNavSection) {
      setLayoutMode('executive_brief');
    setAppArea('desks');
      setActiveNavSection(item.targetNavSection as NavSectionId);
      return;
    }
    if (item.targetPersona) {
      setActivePersona(item.targetPersona);
      return;
    }
    if (item.targetIso3) {
      const targetSov =
        allRegisteredSovereigns.find((s) => s.iso3 === item.targetIso3) ||
        SOVEREIGN_CATALOG[0];
      handleSelectSovereign(targetSov);
      return;
    }
    if (item.actionType === 'OPEN_INTEGRITY_AUDITOR') {
      setIsIntegrityAuditOpen(true);
    } else if (item.actionType === 'OPEN_CUSTOM_SOVEREIGN_WIZARD') {
      setIsCustomSovereignModalOpen(true);
    } else if (item.actionType === 'OPEN_SESSION_MANAGER') {
      setIsSessionModalOpen(true);
    } else if (item.actionType === 'EXPORT_SMCR_PDF') {
      exportSMCRPdfDossier(run);
    } else if (item.actionType === 'SYNC_LIVE_MACRO') {
      handleSyncLiveWorldBankAndTreasury();
    } else if (item.actionType === 'RUN_COUNCIL_PIPELINE') {
      handleRunCouncilPhase1And2();
    }
  };

  // One desk's content, by section id. Used by the desk view and by the Country page tabs.
  const renderDeskBody = (sec: NavSectionId) => (
    <>
              {sec === 'charts_watchlists' && (
                <MacroOverviewTabbedWorkspace
                  countryName={run.countryName}
                  iso3={run.iso3}
                  mapCard={
                    <HeroGeopoliticalMapCard
                      run={run}
                      watchlistItems={activeWatchlistItems}
                      wargameParams={geopoliticalWargameParams}
                      onChangeWargameParams={setGeopoliticalWargameParams}
                      onOpenGeopoliticalDesk={() => setActiveNavSection('geopolitical_desk')}
                      onOpenSupplyChainMatrix={() => setActiveNavSection('supply_chain_matrix')}
                      onSelectSovereign={handleSelectSovereign}
                    />
                  }
                  chartsDeck={
                    <AnnotatedChartsDeck
                      run={run}
                      onRefreshLiveOpenData={() =>
                        handlePullLiveOpenData(run.iso3, run.countryName, false)
                      }
                      isFetchingData={isFetchingOpenData}
                      onOpenForecastingLab={() => setActiveNavSection('forecasting_lab')}
                    />
                  }
                />
              )}

              {sec === 'forecasting_lab' && (
                <StatisticalForecastingLab
                  run={run}
                  propagatedGeoWargameParams={geopoliticalWargameParams}
                  isGeoPropagationActive={propagateGeoShocks}
                  onOpenGeopoliticalDesk={() => setActiveNavSection('geopolitical_desk')}
                  externalShocks={forecastShocks}
                  onChangeExternalShocks={setForecastShocks}
                />
              )}

              {sec === 'geopolitical_desk' && (
                <GeopoliticalRiskDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  wargameParams={geopoliticalWargameParams}
                  onChangeWargameParams={setGeopoliticalWargameParams}
                  propagateGeoShocks={propagateGeoShocks}
                  onTogglePropagateGeoShocks={setPropagateGeoShocks}
                  onSelectSovereign={handleSelectSovereign}
                  onJumpToCouncilDebates={() => setActiveNavSection('council_debates')}
                  onJumpToPortfolioDesk={() => setActiveNavSection('portfolio_risk_desk')}
                  onJumpToForecastingLab={() => setActiveNavSection('forecasting_lab')}
                  onOpenSupplyChainMatrixDesk={() => setActiveNavSection('supply_chain_matrix')}
                />
              )}

              {sec === 'supply_chain_matrix' && (
                <SupplyChainMatrixDesk
                  run={run}
                  onOpenGeopoliticalDesk={() => setActiveNavSection('geopolitical_desk')}
                  onOpenPortfolioDesk={() => setActiveNavSection('portfolio_risk_desk')}
                />
              )}

              {sec === 'global_liquidity' && (
                <GlobalLiquidityDesk
                  run={run}
                  stressParams={liquidityStressParams}
                  onChangeStressParams={setLiquidityStressParams}
                  onOpenMarketMakerDesk={() => setActiveNavSection('market_maker_alpha')}
                />
              )}

              {sec === 'market_maker_alpha' && (
                <MarketMakerAlphaDesk
                  run={run}
                  stressParams={liquidityStressParams}
                  onChangeStressParams={setLiquidityStressParams}
                  onOpenGlobalLiquidityDesk={() => setActiveNavSection('global_liquidity')}
                  onOpenPortfolioDesk={() => setActiveNavSection('portfolio_risk_desk')}
                />
              )}

              {sec === 'portfolio_risk_desk' && (
                <PortfolioContagionDesk
                  key={`contagion-${holdings.length}`}
                  holdingsBook={holdingsContagionBook}
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  onSelectSovereign={handleSelectSovereign}
                  propagatedGeoWargameParams={geopoliticalWargameParams}
                  isGeoPropagationActive={propagateGeoShocks}
                  onOpenGeopoliticalDesk={() => setActiveNavSection('geopolitical_desk')}
                />
              )}

              {sec === 'backtest_engine' && (
                <CrisisBacktestDesk
                  run={run}
                  customEpisodes={customBacktestEpisodes}
                  initialSelectedEpisodeId={selectedBacktestEpisodeId}
                  onApplyHistoricalShocksToLiveDesk={handleApplyHistoricalCrisisShocks}
                  onOpenCsvLab={() => setActiveNavSection('policy_doc_lab')}
                />
              )}

              {sec === 'risk_analytics' && (
                <InstitutionalRiskModules
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  onSelectSovereign={handleSelectSovereign}
                  onOpenPortfolioRiskDesk={() => setActiveNavSection('portfolio_risk_desk')}
                />
              )}

              {sec === 'council_debates' && (
                <CouncilHierarchyAndDebates
                  run={run}
                  onJumpToCROGate={() => setActiveNavSection('cro_reports')}
                  onOpenGeopoliticalDesk={() => setActiveNavSection('geopolitical_desk')}
                  isRunningPhase1And2={isRunningPhase1And2}
                  onReverifyPipeline={handleRunCouncilPhase1And2}
                  runtimeConfig={runtimeConfig}
                  onUpdateRuntimeConfig={setRuntimeConfig}
                  onOpenRuntimeModal={() => setIsRuntimeModalOpen(true)}
                />
              )}

              {sec === 'cro_reports' && (
                <CROCheckpointAndReports
                  run={run}
                  croDraft={croDraft}
                  runtimeConfig={runtimeConfig}
                  isRunningPhase1And2={isRunningPhase1And2}
                  isRunningPhase3={isRunningPhase3}
                  onUpdateCroDraft={setCroDraft}
                  onUpdateRuntimeConfig={setRuntimeConfig}
                  onApproveAndConveneSupremeCouncil={handleApproveAndConveneSupremeCouncil}
                  onReverifyPipeline={handleRunCouncilPhase1And2}
                />
              )}

              {sec === 'policy_doc_lab' && (
                <PolicyDocumentAndCsvLab
                  run={run}
                  policyDocTitle={policyDocTitle}
                  policyDocText={policyDocText}
                  onChangePolicyDocTitle={setPolicyDocTitle}
                  onChangePolicyDocText={setPolicyDocText}
                  onDocumentFileUpload={handleDocumentFileUpload}
                  onRunCouncilWithDocument={handleRunCouncilPhase1And2}
                  onApplyCsvToLiveState={handleApplyCsvToLiveState}
                  onRegisterCustomCrisisBacktest={handleRegisterCustomCrisisBacktest}
                />
              )}

              {(sec === 'institutional_quant_desk' ||
                sec === 'quant_cds_basis' ||
                sec === 'quant_restructuring_npv' ||
                sec === 'quant_matrix_econometrics' ||
                sec === 'quant_trade_blotter' ||
                sec === 'quant_macro_surprise' ||
                sec === 'quant_alpha_correlation' ||
                sec === 'quant_nss_yield_curve' ||
                sec === 'quant_macro_catalyst_calendar' ||
                sec === 'quant_portfolio_stress_lab') && (
                <InstitutionalQuantDesk
                  holdingsWeightsPct={holdingsStressWeights}
                  holdings={holdings}
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  activeSubTab={
                    sec === 'institutional_quant_desk'
                      ? 'quant_cds_basis'
                      : (sec as QuantSubWorkspaceId)
                  }
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onStageTradeTicket={handleStageTradeTicket}
                />
              )}

              {(sec === 'embi_portfolio_pair_book' ||
                sec === 'dmo_treasury_auction_sim' ||
                sec === 'mpc_imf_document_ai') && (
                <PortfolioAndFundingDesk
                  holdingsWeightsPct={holdingsStressWeights}
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  runtimeConfig={runtimeConfig}
                  isDark={darkMode}
                  activeSubTab={sec as PortfolioFundingSubTabId}
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyCalibratedDocumentShock={handleApplyCalibratedDocumentShock}
                />
              )}

              {(sec === 'decision_dislocation_screener' ||
                sec === 'decision_premortem_killswitch' ||
                sec === 'decision_ledger_brier' ||
                sec === 'decision_quadrant_stress' ||
                sec === 'decision_prediction_markets') && (
                <DecisionCommandCenterDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  activeSubTab={sec as DecisionCommandSubTabId}
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyConditionalEventShock={handleApplyConditionalEventShock}
                />
              )}

              {(sec === 'ratings_shadow_fallen_angel' ||
                sec === 'fx_beer_feer_equilibrium' ||
                sec === 'debt_investor_base_doom_loop' ||
                sec === 'ic_pitchbook_dossier_exporter') && (
                <SovereignRatingsFxAndIcDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  activeSubTab={sec as RatingsFxIcSubTabId}
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyRatingOrDoomLoopShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
              )}

              {(sec === 'restructuring_npv_cac_waterfall' ||
                sec === 'taylor_rule_fiscal_dominance' ||
                sec === 'geopolitical_reserves_chokepoints' ||
                sec === 'ngfs_climate_slb_greenium') && (
                <RestructuringMonetaryGeoDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  activeSubTab={sec as RestructuringMonetaryGeoSubTabId}
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
              )}

              {(sec === 'persona_cross_hub_signal_scanner' ||
                sec === 'persona_guided_playbook_cockpit' ||
                sec === 'persona_strategy_backtester_lab' ||
                sec === 'persona_academic_latex_csv_exporter') && (
                <PersonaPlaybooksAndSignalDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  activePersona={activePersona}
                  onChangePersona={setActivePersona}
                  isDark={darkMode}
                  activeSubTab={sec as PersonaPlaybookSubTabId}
                  onSelectSubTab={(sub) => setActiveNavSection(sub)}
                  onJumpToNavSection={(sec) => setActiveNavSection(sec as NavSectionId)}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
              )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col">
      {isPresentMode && (
        <PresentMode
          run={run}
          stagedTickets={stagedTradeTickets}
          holdings={holdings}
          riskLookup={holdingsRiskLookup}
          onClose={() => setIsPresentMode(false)}
        />
      )}
      {/* PRIMARY TOP BAR: BRAND + 4 COMPACT CATEGORY PILL MENUS + CMD+K SEARCH + PERSONA & ACTIONS */}
      <header className="flex items-center justify-between gap-3 min-w-0 px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        {/* Zone 1: EconQuest Crest Logo + Sovereign Council Orchestrator Identity */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setAppArea('today');
          }}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <EconQuestLogo size={34} />
          <div className="flex flex-col">
            <span className="hidden sm:inline lg:hidden xl:inline text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              EconQuest
            </span>
          </div>
        </a>

        {/* Zone 2: 3 Primary Activity Pillars (Market & Trading | Policy Research | Macroeconomic Research) + Cmd+K Search */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-medium">
          {role.nav.map((area) => (
            <React.Fragment key={area}>
              {({
              today: (
                <button
                  type="button"
                  onClick={() => setAppArea('today')}
                  aria-current={appArea === 'today' ? 'page' : undefined}
                  aria-pressed={appArea === 'today'}
                  className="ui-pill inline-flex items-center whitespace-nowrap"
                >
                  Today
                </button>
              ),
              country: (
                <button
                  type="button"
                  onClick={returnToCountryPage}
                  aria-current={appArea === 'country' ? 'page' : undefined}
                  title={`Country page: ${run.countryName}`}
                  aria-pressed={appArea === 'country'}
                  className="ui-pill inline-flex items-center whitespace-nowrap"
                >
                  Countries
                </button>
              ),
              portfolio: (
                <button
                  type="button"
                  onClick={() => openWorkspace('portfolio')}
                  aria-current={appArea === 'portfolio' ? 'page' : undefined}
                  aria-pressed={appArea === 'portfolio'}
                  className="ui-pill inline-flex items-center whitespace-nowrap"
                >
                  Portfolio
                </button>
              ),
              reports: (
                <button
                  type="button"
                  onClick={() => openWorkspace('reports')}
                  aria-current={appArea === 'reports' ? 'page' : undefined}
                  aria-pressed={appArea === 'reports'}
                  className="ui-pill inline-flex items-center whitespace-nowrap"
                >
                  Reports
                </button>
              ),
              desks: (
                <div
                  className="relative"
                  onMouseEnter={() => setIsToolsMenuOpen(true)}
                  onMouseLeave={() => setIsToolsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsToolsMenuOpen((v) => !v)}
                    aria-expanded={isToolsMenuOpen}
                    aria-current={appArea === 'desks' ? 'page' : undefined}
                    title="All 41 analysis desks"
                    aria-pressed={appArea === 'desks'}
                    className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Tools</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  {isToolsMenuOpen && (
                    <div className="fixed inset-x-4 top-[52px] pt-1 max-w-[1000px] mx-auto z-50" data-tools-menu="true">
                      <div className="ui-panel shadow-2xl p-3">
                        <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 ui-label">
                          The full desk library. Today, Countries, Portfolio and Reports group these desks by task.
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {ACTIVITY_PILLARS.map((pillar) => (
                            <div key={pillar.id} className="min-w-0 space-y-2">
                              <div className="ui-section-title">{pillar.shortTitle.replace(/^\d+\.\s*/, '')}</div>
                              {pillar.subGroups.map((sg) => (
                                <div key={sg.groupId}>
                                  <div className="ui-label mb-1">{sg.groupTitle}</div>
                                  <div className="flex flex-col">
                                    {sg.modules.map((mod) => (
                                      <button
                                        key={mod.id}
                                        type="button"
                                        onClick={() => {
                                          setLayoutMode('executive_brief');
                                          setAppArea('desks');
                                          setActiveNavSection(mod.id as NavSectionId);
                                          setIsToolsMenuOpen(false);
                                        }}
                                        title={mod.description}
                                        className={`text-left px-2 py-1 text-xs truncate hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                          appArea === 'desks' && activeNavSection === mod.id
                                            ? 'text-blue-700 dark:text-blue-300 font-semibold'
                                            : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {mod.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
              } as Record<WorkflowArea, React.ReactNode>)[area]}
            </React.Fragment>
          ))}

          {/* Global Command Palette Cmd+K Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            title="Open Global Command Palette & Module Jump Bar (Cmd+K / Ctrl+K)"
            className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs tabular-nums text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Jump</span>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>
        </nav>

        {/* Zone 3: everyday actions stay visible; settings and tools live in one menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPresentMode(true)}
            title="Present this country and your book full screen (Esc to leave)"
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Present</span>
          </button>
          <button
            type="button"
            onClick={() => setIsScenarioDrawerOpen((v) => !v)}
            title="Compare scenario A with scenario B"
            aria-pressed={isScenarioDrawerOpen}
            className="ui-pill hidden xl:inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>A vs B</span>
            {scenarioChangeCount > 0 && (
              <span className="px-1.5 text-xs tabular-nums font-semibold bg-amber-500 text-slate-950">
                {scenarioChangeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => exportSMCRPdfDossier(run)}
            title="Download the PDF report for this country"
            className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>

          <div className="relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={isHeaderMenuOpen}
              title="View settings, AI and data connections, manual, saved sessions"
              aria-pressed={isHeaderMenuOpen}
              className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Menu</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isHeaderMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-72 max-w-[calc(100vw-2rem)] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 space-y-3 text-xs"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Detail level
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'SIMPLE_BRIEF', label: 'Plain English' },
                        { id: 'PRO_QUANT', label: 'Full detail' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDensityMode(d.id)}
                        aria-pressed={densityMode === d.id}
                        className="ui-pill"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    My role
                  </div>
                  <div className="flex flex-col gap-1">
                    {USER_ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          applyRole(r.id);
                          setIsHeaderMenuOpen(false);
                        }}
                        aria-pressed={userRole === r.id}
                        className="ui-pill text-left"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex flex-col">
                  {(
                    [
                      {
                        key: 'runtime',
                        icon: <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
                        label: 'AI model and data connections',
                        hint:
                          runtimeConfig.providerMode === 'ollama'
                            ? `Ollama (${runtimeConfig.ollamaQuickModel.split(':')[0]})`
                            : runtimeConfig.providerMode === 'hybrid'
                            ? 'Hybrid Ollama'
                            : 'Gemini',
                        onClick: () => setIsRuntimeModalOpen(true),
                        className: '',
                      },
                      {
                        key: 'qa',
                        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
                        label: 'Model health check',
                        hint: `${liveIntegrityAuditReport.readinessScorePct}%`,
                        onClick: () => setIsIntegrityAuditOpen(true),
                        className: '',
                      },
                      {
                        key: 'session',
                        icon: <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                        label: 'Save or restore session',
                        hint: '',
                        onClick: () => setIsSessionModalOpen(true),
                        className: '',
                      },
                      {
                        key: 'manual',
                        icon: <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                        label: 'User manual',
                        hint: '',
                        onClick: () => setIsManualModalOpen(true),
                        className: '',
                      },
                      {
                        key: 'present',
                        icon: <Presentation className="w-3.5 h-3.5" />,
                        label: 'Present (full screen)',
                        hint: '',
                        onClick: () => setIsPresentMode(true),
                        className: 'xl:hidden',
                      },
                      {
                        key: 'ab',
                        icon: <GitCompare className="w-3.5 h-3.5" />,
                        label: 'Compare scenario A vs B',
                        hint: scenarioChangeCount > 0 ? String(scenarioChangeCount) : '',
                        onClick: () => setIsScenarioDrawerOpen((v) => !v),
                        className: 'xl:hidden',
                      },
                      {
                        key: 'pdf',
                        icon: <Download className="w-3.5 h-3.5" />,
                        label: 'Download PDF report',
                        hint: '',
                        onClick: () => exportSMCRPdfDossier(run),
                        className: 'xl:hidden',
                      },
                    ]
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        item.onClick();
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${item.className}`}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.hint && (
                        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRunCouncilPhase1And2}
            disabled={isRunningPhase1And2}
            title="Run the AI council assessment for the selected country"
            aria-label="Run Council"
            className="ui-btn ui-btn-primary inline-flex"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isRunningPhase1And2 ? 'Running...' : 'Run Council'}
            </span>
          </button>
        </div>
      </header>

      {/* SECONDARY CONTEXTUAL BAR: 3-PILLAR SUB-GROUP & MODULE TABS + 1-CLICK SOVEREIGN SWITCHER */}
      <section className={`bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 ${appArea !== 'desks' ? 'lg:hidden' : ''}`}>
        <div className="max-w-[1600px] mx-auto flex flex-col gap-2">
          {appArea === 'desks' && (
          <>
          {/* Row 1: Contextual Sub-Groups & Modules for Active Activity Pillar */}
          <PillarSubNavigationStrip
            activeNavSection={activeNavSection}
            onSelectNavSection={(sec) => {
              setLayoutMode('executive_brief');
    setAppArea('desks');
              setActiveNavSection(sec as NavSectionId);
            }}
          />

          {/* Row 2: Pinned 1-Click Sovereign Switcher Pill Strip + Custom ISO-3 Onboarding + Live Sync + Compare/IC Drawers */}
          <div className="flex flex-col gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsWatchlistCollapsed((v) => !v)}
                  title={isWatchlistCollapsed ? 'Show Sovereign Watchlist Sidebar' : 'Hide Sidebar to Expand Maps & Charts'}
                  className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 mr-1 transition-colors"
                >
                  {isWatchlistCollapsed ? (
                    <>
                      <PanelLeftOpen className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Watchlist</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftClose className="w-3 h-3" />
                      <span>Hide Sidebar</span>
                    </>
                  )}
                </button>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 mr-0.5">
                  Sovereign:
                </span>
                {activeWatchlistItems.map((item) => {
                  const isActiveSov = item.iso3 === run.iso3;
                  return (
                    <button
                      key={item.iso3}
                      type="button"
                      onClick={() => handleSelectSovereign(item)}
                      title={`Switch active sovereign to ${item.countryName} (${item.iso3} · ${item.currencyCode})`}
                      aria-pressed={isActiveSov}
                      className="ui-pill"
                    >
                      {item.iso3}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsCustomSovereignModalOpen(true)}
                  title="Onboard any new ISO-3 country (India, Poland, Chile, Colombia, Nigeria, or custom ISO-3) with live IMF/World Bank hydration"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ ISO-3</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncLiveWorldBankAndTreasury}
                  disabled={isSyncingLiveMacro}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingLiveMacro ? 'animate-spin' : ''}`} />
                  <span>{isSyncingLiveMacro ? 'Syncing...' : 'Sync WB/IMF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Compact Layout Mode Switcher (Focused Desk | Split | Full Report) */}
                <div
                  className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700"
                  title="Switch Workspace Layout Mode: Focused Desk (1-2 Screen Paginated View), Split Workbench, or Full Report"
                >
                  {(
                    [
                      { id: 'executive_brief', label: 'Focused Desk' },
                      { id: 'split_workbench', label: 'Split' },
                      { id: 'full_report', label: 'Report' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLayoutMode(mode.id)}
                      aria-pressed={layoutMode === mode.id}
                      className="ui-pill"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsComparatorDrawerOpen(true)}
                  title="Open Multi-Sovereign Head-to-Head Comparator (Compare any 2-3 countries side-by-side)"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs tabular-nums font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Columns className="w-3 h-3" />
                  <span>Compare 2–3 Sovereigns</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTradeTicketDrawerOpen(true)}
                  title="Open 1-Click Executive Tear-Sheet & IC Trade Ticket Quick-Drawer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs tabular-nums font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>IC Ticket / Tear-Sheet ({stagedTradeTickets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScenarioInput((v) => !v)}
                  aria-pressed={showScenarioInput}
                  className="ui-pill inline-flex items-center gap-1"
                >
                  <span>Scenario Directive {showScenarioInput ? '▴' : '▾'}</span>
                </button>
              </div>
            </div>

            {showScenarioInput && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  Scenario Query:
                </span>
                <input
                  type="text"
                  value={scenarioInput}
                  onChange={(e) => setScenarioInput(e.target.value)}
                  placeholder="Enter sovereign risk query, fiscal target test, or geopolitical shock scenario..."
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          </>
          )}

          {/* Mobile 3-Pillar Switcher + Cmd+K Trigger */}
          <div className="order-first flex lg:hidden items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shrink-0"
            >
              <Search className="w-3 h-3" />
              <span>Jump</span>
            </button>
            {role.nav.map((area) => (
              <React.Fragment key={area}>
                {({
              today: (
                <button
                  type="button"
                  onClick={() => setAppArea('today')}
                  aria-pressed={appArea === 'today'}
                  className="ui-pill whitespace-nowrap shrink-0"
                >
                  Today
                </button>
              ),
              country: (
                <button
                  type="button"
                  onClick={returnToCountryPage}
                  aria-pressed={appArea === 'country'}
                  className="ui-pill whitespace-nowrap shrink-0"
                >
                  Countries
                </button>
              ),
              portfolio: (
                <button
                  type="button"
                  onClick={() => openWorkspace('portfolio')}
                  aria-pressed={appArea === 'portfolio'}
                  className="ui-pill whitespace-nowrap shrink-0"
                >
                  Portfolio
                </button>
              ),
              reports: (
                <button
                  type="button"
                  onClick={() => openWorkspace('reports')}
                  aria-pressed={appArea === 'reports'}
                  className="ui-pill whitespace-nowrap shrink-0"
                >
                  Reports
                </button>
              ),
              desks: (
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode('executive_brief');
                    setAppArea('desks');
                  }}
                  aria-pressed={appArea === 'desks'}
                  className="ui-pill whitespace-nowrap shrink-0"
                >
                  Tools
                </button>
              )
                } as Record<WorkflowArea, React.ReactNode>)[area]}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* EXPANDABLE TOP-TOOLBAR SCENARIO A VS. SCENARIO B DELTA COMPARATOR & LIVE API DRAWER */}
      <ScenarioDeltaComparatorDrawer
        isOpen={isScenarioDrawerOpen}
        onClose={() => setIsScenarioDrawerOpen(false)}
        comparisonSuite={scenarioComparisonSuite}
        onPinCurrentAsScenarioA={handlePinCurrentAsScenarioA}
        onSwapScenarioAAndB={handleSwapScenarioAAndB}
        onResetToBaseline={handleResetScenarioBToBaseline}
        onApplyPresetShockToLiveB={(label, shocks) => {
          setForecastShocks(shocks);
          setScenarioBLabel(label);
        }}
        liveSyncResult={liveMacroSyncResult}
        isSyncingLiveMacro={isSyncingLiveMacro}
        onTriggerLiveMacroSync={handleSyncLiveWorldBankAndTreasury}
      />

      {/* STATUS BANNER */}
      {statusBanner && (
        <div
          className={`px-6 py-2.5 border-b text-xs flex items-center justify-between gap-4 ${
            statusBanner.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
              : statusBanner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
              : statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 max-w-[1600px]">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline opacity-75 hover:opacity-100 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE CANVAS: COLLAPSIBLE LEFT WATCHLIST SIDEBAR + RIGHT MAIN VIEWPORT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Watchlist Manager Sidebar (3 columns on desktop when expanded) */}
        {!isWatchlistCollapsed && (
          <aside className="lg:col-span-3">
            <WatchlistSidebar
              watchlists={watchlists}
              activeWatchlistId={activeWatchlistId}
              selectedIso3={run.iso3}
              onSelectWatchlist={setActiveWatchlistId}
              onSelectSovereign={handleSelectSovereign}
              onCreateWatchlist={handleCreateWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
              onAddSovereignToWatchlist={handleAddSovereignToWatchlist}
              onRemoveSovereignFromWatchlist={handleRemoveSovereignFromWatchlist}
            />
          </aside>
        )}

        {/* Right Primary Viewport (9 columns when sidebar open, 12 columns when collapsed) */}
        <section className={`${isWatchlistCollapsed ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-3`}>
          {!userRole && !isRolePromptDismissed && (
            <RolePicker current={userRole} onPick={applyRole} onSkip={() => setIsRolePromptDismissed(true)} />
          )}

          {appArea === 'today' && (
            <TodayPage
              run={run}
              watchlistName={watchlists.find((w) => w.id === activeWatchlistId)?.name || 'Watchlist'}
              watchlistItems={activeWatchlistItems}
              stagedTickets={stagedTradeTickets}
              onOpenCountry={(item, sectionId) => {
                if (item.iso3 !== run.iso3) handleSelectSovereign(item);
                openCountryPage(sectionId);
              }}
              onStageTicket={handleStageTradeTicket}
              onOpenTickets={() => setIsTradeTicketDrawerOpen(true)}
              onOpenWatchlistManager={() => setIsWatchlistCollapsed(false)}
            />
          )}

          {appArea === 'country' && (
            <CountryPage
              run={run}
              watchlistItems={activeWatchlistItems}
              activeTab={countryTab}
              activeDesk={activeNavSection}
              onChangeTab={(tab) => {
                setCountryTab(tab);
                const cfg = COUNTRY_TABS.find((t) => t.id === tab) || DEFAULT_COUNTRY_TAB;
                if (cfg.desks[0]) setActiveNavSection(cfg.desks[0] as NavSectionId);
              }}
              onChangeDesk={(d) => setActiveNavSection(d as NavSectionId)}
              onSelectCountry={handleSelectSovereign}
              onAddCountry={() => setIsCustomSovereignModalOpen(true)}
              onSync={handleSyncLiveWorldBankAndTreasury}
              isSyncing={isSyncingLiveMacro}
              onCompare={() => setIsComparatorDrawerOpen(true)}
              onOpenTickets={() => setIsTradeTicketDrawerOpen(true)}
              ticketCount={stagedTradeTickets.length}
              briefView={userRole === 'BANKER' ? 'banker' : userRole === 'MULTILATERAL' ? 'official' : 'economist'}
              onWriteNote={(view) => {
                setRequestedReport(view);
                openWorkspace('reports', 'ic_memo_builder');
              }}
              renderDesk={(d) => (
                <Suspense key={d} fallback={<DeskLoading />}>
                  <ViewportScrollBudgetContainer activeNavSection={d as NavSectionId}>
                    {renderDeskBody(d as NavSectionId)}
                  </ViewportScrollBudgetContainer>
                </Suspense>
              )}
            />
          )}

          {appArea === 'portfolio' && isHoldingsPanelOpen && (
            <HoldingsPanel
              holdings={holdings}
              countries={holdingsRiskLookup}
              onChange={setHoldings}
              onClose={() => setIsHoldingsPanelOpen(false)}
            />
          )}

          {(appArea === 'portfolio' || appArea === 'reports') && (
            <WorkspacePage
              key={appArea}
              ariaLabel={appArea === 'portfolio' ? 'Portfolio sections' : 'Reports sections'}
              title={appArea === 'portfolio' ? 'Portfolio' : 'Reports'}
              subtitle={
                appArea === 'portfolio'
                  ? holdings.length
                    ? 'Your book, from the holdings you imported'
                    : `No holdings yet: showing your watchlist, ${watchlists.find((w) => w.id === activeWatchlistId)?.name || 'Watchlist'}`
                  : `Documents to hand to the investment committee, risk and clients. Current country: ${run.countryName}`
              }
              tabs={appArea === 'portfolio' ? PORTFOLIO_TABS : REPORTS_TABS}
              activeTabId={appArea === 'portfolio' ? portfolioTab : reportsTab}
              activeDesk={activeNavSection}
              onChangeTab={(tabId) => {
                const tabs = appArea === 'portfolio' ? PORTFOLIO_TABS : REPORTS_TABS;
                (appArea === 'portfolio' ? setPortfolioTab : setReportsTab)(tabId);
                const cfg = tabs.find((t) => t.id === tabId) || tabs[0];
                setActiveNavSection(cfg.desks[0] as NavSectionId);
              }}
              onChangeDesk={(d) => setActiveNavSection(d as NavSectionId)}
              actions={
                <>
                  <button type="button" className="ui-btn" onClick={() => setIsTradeTicketDrawerOpen(true)}>
                    IC tickets ({stagedTradeTickets.length})
                  </button>
                  {appArea === 'reports' && (
                    <button type="button" className="ui-btn" onClick={() => setIsComparatorDrawerOpen(true)}>
                      Compare countries
                    </button>
                  )}
                </>
              }
              summary={
                appArea === 'portfolio' ? (
                  <PortfolioSummary
                    watchlistItems={activeWatchlistItems}
                    riskLookup={holdingsRiskLookup}
                    holdings={holdings}
                    onManageHoldings={() => setIsHoldingsPanelOpen(true)}
                    stagedTickets={stagedTradeTickets}
                    onOpenCountry={(item) => {
                      if (item.iso3 !== run.iso3) handleSelectSovereign(item);
                      openCountryPage();
                    }}
                  />
                ) : undefined
              }
              renderDesk={(d) =>
                d === 'ic_memo_builder' ? (
                  <IcMemoBuilder
                    key={`${d}-${requestedReport || role.report}`}
                    run={run}
                    stagedTickets={stagedTradeTickets}
                    holdings={holdings}
                    riskLookup={holdingsRiskLookup}
                    peers={activeWatchlistItems}
                    defaultAudience={requestedReport || role.report}
                  />
                ) : (
                  <Suspense key={d} fallback={<DeskLoading />}>
                    <ViewportScrollBudgetContainer activeNavSection={d as NavSectionId}>
                      {renderDeskBody(d as NavSectionId)}
                    </ViewportScrollBudgetContainer>
                  </Suspense>
                )
              }
            />
          )}

          {appArea === 'desks' && (
          <>
          {/* CONSOLIDATED 1-LINE STATUS BAR WITH SLIDE-OVER DRAWERS (MORNING RADAR, EXECUTIVE BLUF, DESK GUIDE) */}
          <CompactTopStatusAndDrawersBar
            run={run}
            watchlistItems={activeWatchlistItems}
            activeNavSection={activeNavSection}
            activePersona={activePersona}
            densityMode={densityMode}
            onToggleDensityMode={setDensityMode}
            onSelectSovereign={handleSelectSovereign}
            onSelectNavSection={(sec) => {
              setLayoutMode('executive_brief');
    setAppArea('desks');
              setActiveNavSection(sec as NavSectionId);
            }}
            onStageTradeTicket={handleStageTradeTicket}
          />

          {/* MODE 1: CLEAN EXECUTIVE BRIEFING (DEFAULT) WRAPPED IN 1-2 SCREEN SCROLL BUDGET CONTAINER */}
          {layoutMode === 'executive_brief' && (
            <Suspense key={activeNavSection} fallback={<DeskLoading />}>
              <ViewportScrollBudgetContainer activeNavSection={activeNavSection}>
                {renderDeskBody(activeNavSection)}
              </ViewportScrollBudgetContainer>
            </Suspense>
          )}

          {/* MODE 2: SPLIT DESK WORKBENCH (SIDE-BY-SIDE QUANT/ECONOMETRICS/GEOPOLITICAL/PORTFOLIO RISK + LIVE COUNCIL DEBATES) */}
          {layoutMode === 'split_workbench' && (
            <Suspense fallback={<DeskLoading />}>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-6 space-y-6">
                <AnnotatedChartsDeck
                  run={run}
                  onRefreshLiveOpenData={() =>
                    handlePullLiveOpenData(run.iso3, run.countryName, false)
                  }
                  isFetchingData={isFetchingOpenData}
                />
                <GeopoliticalRiskDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  wargameParams={geopoliticalWargameParams}
                  onChangeWargameParams={setGeopoliticalWargameParams}
                  propagateGeoShocks={propagateGeoShocks}
                  onTogglePropagateGeoShocks={setPropagateGeoShocks}
                  onSelectSovereign={handleSelectSovereign}
                />
                <SupplyChainMatrixDesk run={run} />
                <GlobalLiquidityDesk
                  run={run}
                  stressParams={liquidityStressParams}
                  onChangeStressParams={setLiquidityStressParams}
                />
                <MarketMakerAlphaDesk
                  run={run}
                  stressParams={liquidityStressParams}
                  onChangeStressParams={setLiquidityStressParams}
                />
                <StatisticalForecastingLab
                  run={run}
                  propagatedGeoWargameParams={geopoliticalWargameParams}
                  isGeoPropagationActive={propagateGeoShocks}
                  externalShocks={forecastShocks}
                  onChangeExternalShocks={setForecastShocks}
                />
                <PortfolioContagionDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  onSelectSovereign={handleSelectSovereign}
                  propagatedGeoWargameParams={geopoliticalWargameParams}
                  isGeoPropagationActive={propagateGeoShocks}
                />
                <CrisisBacktestDesk
                  run={run}
                  customEpisodes={customBacktestEpisodes}
                  initialSelectedEpisodeId={selectedBacktestEpisodeId}
                  onApplyHistoricalShocksToLiveDesk={handleApplyHistoricalCrisisShocks}
                  onOpenCsvLab={() => {
                    setLayoutMode('executive_brief');
    setAppArea('desks');
                    setActiveNavSection('policy_doc_lab');
                  }}
                />
                <InstitutionalRiskModules
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  onSelectSovereign={handleSelectSovereign}
                />
                <InstitutionalQuantDesk
                  holdingsWeightsPct={holdingsStressWeights}
                  holdings={holdings}
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                />
                <PortfolioAndFundingDesk
                  holdingsWeightsPct={holdingsStressWeights}
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  runtimeConfig={runtimeConfig}
                  isDark={darkMode}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyCalibratedDocumentShock={handleApplyCalibratedDocumentShock}
                />
                <DecisionCommandCenterDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyConditionalEventShock={handleApplyConditionalEventShock}
                />
                <SovereignRatingsFxAndIcDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyRatingOrDoomLoopShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
                <RestructuringMonetaryGeoDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  isDark={darkMode}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
                <PersonaPlaybooksAndSignalDesk
                  run={run}
                  watchlistItems={activeWatchlistItems}
                  activePersona={activePersona}
                  onChangePersona={setActivePersona}
                  isDark={darkMode}
                  onJumpToNavSection={(sec) => {
                    setLayoutMode('executive_brief');
    setAppArea('desks');
                    setActiveNavSection(sec as NavSectionId);
                  }}
                  onSelectSovereign={handleSelectSovereign}
                  onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
                />
              </div>
              <div className="xl:col-span-6 space-y-6">
                <CouncilHierarchyAndDebates
                  run={run}
                  onJumpToCROGate={() => {
                    setLayoutMode('executive_brief');
    setAppArea('desks');
                    setActiveNavSection('cro_reports');
                  }}
                  isRunningPhase1And2={isRunningPhase1And2}
                  onReverifyPipeline={handleRunCouncilPhase1And2}
                  runtimeConfig={runtimeConfig}
                  onUpdateRuntimeConfig={setRuntimeConfig}
                  onOpenRuntimeModal={() => setIsRuntimeModalOpen(true)}
                />
                <CROCheckpointAndReports
                  run={run}
                  croDraft={croDraft}
                  runtimeConfig={runtimeConfig}
                  isRunningPhase1And2={isRunningPhase1And2}
                  isRunningPhase3={isRunningPhase3}
                  onUpdateCroDraft={setCroDraft}
                  onUpdateRuntimeConfig={setRuntimeConfig}
                  onApproveAndConveneSupremeCouncil={handleApproveAndConveneSupremeCouncil}
                  onReverifyPipeline={handleRunCouncilPhase1And2}
                />
              </div>
            </div>
            </Suspense>
          )}

          {/* MODE 3: FULL RESEARCH REPORT FLOW (CONTINUOUS VERTICAL INSTITUTIONAL DOSSIER) */}
          {layoutMode === 'full_report' && (
            <Suspense fallback={<DeskLoading />}>
            <div className="space-y-8">
              <AnnotatedChartsDeck
                run={run}
                onRefreshLiveOpenData={() =>
                  handlePullLiveOpenData(run.iso3, run.countryName, false)
                }
                isFetchingData={isFetchingOpenData}
              />
              <GeopoliticalRiskDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                wargameParams={geopoliticalWargameParams}
                onChangeWargameParams={setGeopoliticalWargameParams}
                propagateGeoShocks={propagateGeoShocks}
                onTogglePropagateGeoShocks={setPropagateGeoShocks}
                onSelectSovereign={handleSelectSovereign}
              />
              <SupplyChainMatrixDesk run={run} />
              <GlobalLiquidityDesk
                run={run}
                stressParams={liquidityStressParams}
                onChangeStressParams={setLiquidityStressParams}
              />
              <MarketMakerAlphaDesk
                run={run}
                stressParams={liquidityStressParams}
                onChangeStressParams={setLiquidityStressParams}
              />
              <StatisticalForecastingLab
                run={run}
                propagatedGeoWargameParams={geopoliticalWargameParams}
                isGeoPropagationActive={propagateGeoShocks}
                externalShocks={forecastShocks}
                onChangeExternalShocks={setForecastShocks}
              />
              <PortfolioContagionDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                onSelectSovereign={handleSelectSovereign}
                propagatedGeoWargameParams={geopoliticalWargameParams}
                isGeoPropagationActive={propagateGeoShocks}
              />
              <CrisisBacktestDesk
                run={run}
                customEpisodes={customBacktestEpisodes}
                initialSelectedEpisodeId={selectedBacktestEpisodeId}
                onApplyHistoricalShocksToLiveDesk={handleApplyHistoricalCrisisShocks}
                onOpenCsvLab={() => {
                  setLayoutMode('executive_brief');
    setAppArea('desks');
                  setActiveNavSection('policy_doc_lab');
                }}
              />
              <InstitutionalRiskModules
                run={run}
                watchlistItems={activeWatchlistItems}
                onSelectSovereign={handleSelectSovereign}
              />
              <InstitutionalQuantDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                isDark={darkMode}
              />
              <PortfolioAndFundingDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                runtimeConfig={runtimeConfig}
                isDark={darkMode}
                onSelectSovereign={handleSelectSovereign}
                onApplyCalibratedDocumentShock={handleApplyCalibratedDocumentShock}
              />
              <DecisionCommandCenterDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                isDark={darkMode}
                onSelectSovereign={handleSelectSovereign}
                onApplyConditionalEventShock={handleApplyConditionalEventShock}
              />
              <SovereignRatingsFxAndIcDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                isDark={darkMode}
                onSelectSovereign={handleSelectSovereign}
                onApplyRatingOrDoomLoopShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
              />
              <RestructuringMonetaryGeoDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                isDark={darkMode}
                onSelectSovereign={handleSelectSovereign}
                onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
              />
              <PersonaPlaybooksAndSignalDesk
                run={run}
                watchlistItems={activeWatchlistItems}
                activePersona={activePersona}
                onChangePersona={setActivePersona}
                isDark={darkMode}
                onJumpToNavSection={(sec) => {
                  setLayoutMode('executive_brief');
    setAppArea('desks');
                  setActiveNavSection(sec as NavSectionId);
                }}
                onSelectSovereign={handleSelectSovereign}
                onApplyShockToTerminal={handleApplyRatingOrDoomLoopShockToTerminal}
              />
              <CouncilHierarchyAndDebates
                run={run}
                onJumpToCROGate={() => {
                  setLayoutMode('executive_brief');
    setAppArea('desks');
                  setActiveNavSection('cro_reports');
                }}
                isRunningPhase1And2={isRunningPhase1And2}
                onReverifyPipeline={handleRunCouncilPhase1And2}
                runtimeConfig={runtimeConfig}
                onUpdateRuntimeConfig={setRuntimeConfig}
                onOpenRuntimeModal={() => setIsRuntimeModalOpen(true)}
              />
              <CROCheckpointAndReports
                run={run}
                croDraft={croDraft}
                runtimeConfig={runtimeConfig}
                isRunningPhase1And2={isRunningPhase1And2}
                isRunningPhase3={isRunningPhase3}
                onUpdateCroDraft={setCroDraft}
                onUpdateRuntimeConfig={setRuntimeConfig}
                onApproveAndConveneSupremeCouncil={handleApproveAndConveneSupremeCouncil}
                onReverifyPipeline={handleRunCouncilPhase1And2}
              />
            </div>
            </Suspense>
          )}
          </>
          )}
        </section>
      </main>

      {/* GLOBAL REAL-TIME DATA PROVENANCE OVERLAY & INTERACTIVE STATISTICAL REFERENCE TOOLTIP CONTROLLER */}
      <GlobalTerminalProvenanceAndStatRefController
        run={run}
        activeNavSection={activeNavSection}
        onRefreshLiveOpenData={() => handlePullLiveOpenData(run.iso3, run.countryName, false)}
        isFetchingData={isFetchingOpenData}
      />

      {/* GLOBAL COMMAND PALETTE (CMD+K), PRE-FLIGHT MODEL INTEGRITY AUDITOR, CUSTOM SOVEREIGN WIZARD & SESSION SNAPSHOT MODALS */}
      <GlobalCommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        items={commandPaletteItems}
        onSelectCommand={handleSelectCommandPaletteItem}
      />

      <ModelIntegrityAuditModal
        isOpen={isIntegrityAuditOpen}
        onClose={() => setIsIntegrityAuditOpen(false)}
        auditReport={liveIntegrityAuditReport}
      />

      <CustomSovereignOnboardingModal
        isOpen={isCustomSovereignModalOpen}
        onClose={() => setIsCustomSovereignModalOpen(false)}
        onOnboardSovereign={handleOnboardCustomSovereign}
      />

      <WorkspaceSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentSnapshot={currentWorkspaceSessionSnapshot}
        onRestoreSession={handleRestoreWorkspaceSession}
        onResetFactoryDefaults={handleResetFactoryDefaults}
      />

      <SovereignManualAndGithubModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <SelfHostAndOllamaRuntimeModal
        isOpen={isRuntimeModalOpen}
        onClose={() => setIsRuntimeModalOpen(false)}
        runtimeConfig={runtimeConfig}
        onUpdateRuntimeConfig={setRuntimeConfig}
        onTriggerReverifyCouncil={handleRunCouncilPhase1And2}
        activeIso3={run.iso3}
        onApplyConnectorTelemetryToActiveSovereign={handleApplyConnectorTelemetryToActiveSovereign}
      />

      {/* MULTI-SOVEREIGN HEAD-TO-HEAD COMPARATOR DRAWER (2-3 COUNTRIES SIDE-BY-SIDE) */}
      <MultiSovereignComparatorDrawer
        isOpen={isComparatorDrawerOpen}
        onClose={() => setIsComparatorDrawerOpen(false)}
        activeRun={run}
        watchlistItems={activeWatchlistItems}
        onSelectSovereign={handleSelectSovereign}
        onStageTradeTicket={(ticket) => {
          setIsComparatorDrawerOpen(false);
          handleStageTradeTicket(ticket);
        }}
      />

      {/* 1-CLICK EXECUTIVE TEAR-SHEET & IC TRADE TICKET QUICK-DRAWER */}
      <ExecutiveTearSheetAndTradeTicketDrawer
        isOpen={isTradeTicketDrawerOpen}
        onClose={() => setIsTradeTicketDrawerOpen(false)}
        activeRun={run}
        stagedTickets={stagedTradeTickets}
        onAddTicket={handleStageTradeTicket}
        onRemoveTicket={handleRemoveTradeTicket}
        onNavigateToSection={(sec) => {
          setLayoutMode('executive_brief');
    setAppArea('desks');
          setActiveNavSection(sec as NavSectionId);
        }}
      />
    </div>
  );
}
