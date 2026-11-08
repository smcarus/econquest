export type DeskId = 'geopolitical' | 'sovereign' | 'macro';

export type WorkspaceLayoutMode = 'executive_brief' | 'split_workbench' | 'full_report';

export type SubAgentId =
  | 'ag1_intel_scraper'
  | 'ag2_transmission_mapper'
  | 'ag3_sanctions_legal'
  | 'ag4_fiscal_auditor'
  | 'ag5_external_balance'
  | 'ag6_political_will'
  | 'ag7_hf_nowcaster'
  | 'ag8_cb_watcher'
  | 'ag9_global_spillover';

export type ProvenanceTier =
  | 'TIER_1_MULTILATERAL_API'
  | 'TIER_2_PREDICTION_EVENT'
  | 'TIER_3_SEARCH_POLICY_DOC'
  | 'TIER_4_MODEL_ESTIMATE';

export type TimeframeKey = '30D' | '90D' | '1Y' | '5Y' | '10Y_WEO';

export interface QuantitativeMetric {
  label: string;
  value: string;
  numericValue: number;
  unit: string;
  change: string;
  source: string;
  provenanceTier: ProvenanceTier;
}

export interface GroundingSource {
  title: string;
  uri: string;
  sourceType?: string;
}

export interface SubAgentReport {
  agentId: SubAgentId;
  agentCode: string;
  agentName: string;
  deskId: DeskId;
  roleTitle: string;
  dataSourcesUsed: string[];
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  riskScore: number; // 0.00 to 1.00
  confidence: number; // 0.00 to 1.00
  brierCalibrationWeight: number; // 0.50 to 1.00
  keyMetrics: QuantitativeMetric[];
  findingsSummary: string;
  structuredPayload: Record<string, string | number | boolean>;
  groundingSources: GroundingSource[];
}

export interface DeskDebateRound {
  roundNumber: number;
  proposerAgent: string;
  proposerStance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  thesis: string;
  challengerAgent: string;
  challengerStance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  counterThesis: string;
  deskLeadResolution: string;
  riskScoreAdjustment: number;
}

export interface MinorityDissentEntry {
  dissentId: string;
  deskId: DeskId;
  agentId: SubAgentId;
  agentName: string;
  agentRiskScore: number;
  deskConsensusScore: number;
  divergenceDelta: number;
  coreDissentArgument: string;
  earlyWarningTrigger: string;
  falsificationThreshold: string;
}

export interface DeskDebateTranscript {
  deskId: DeskId;
  deskName: string;
  deskLeadTitle: string;
  initialRiskSpread: number;
  rounds: DeskDebateRound[];
  preCascadeRiskScore: number;
  postCascadeRiskScore: number;
  consensusStance: 'CONSTRUCTIVE' | 'CAUTIOUS' | 'DEFENSIVE' | 'DISTRESSED';
  consensusSummary: string;
  minorityDissents: MinorityDissentEntry[];
}

export interface CascadeStep {
  stepOrder: number;
  sourceDesk: DeskId;
  targetDesk: DeskId;
  triggerAgent: string;
  receivingAgent: string;
  shockVariable: string;
  shockDelta: string;
  priorRiskScore: number;
  postCascadeRiskScore: number;
  transmissionMechanism: string;
  jsonPatch: Record<string, number | string>;
}

export interface CrisisAnalogMatch {
  analogId: string;
  crisisName: string;
  year: number;
  regionOrCountry: string;
  similarityScorePct: number;
  matchingDrivers: string[];
  historicalOutcome: {
    fxDrawdown3MPct: number;
    sovereignSpreadWideningBps: number;
    localBondReturn6MPct: number;
    policyResponseSummary: string;
  };
  keyDifferencesToday: string;
}

export interface RegimeProbabilityDistribution {
  baseCase: {
    label: string;
    probabilityPct: number;
    expectedSpreadDeltaBps: number;
    narrative: string;
  };
  adverseTailCase: {
    label: string;
    probabilityPct: number;
    expectedSpreadDeltaBps: number;
    narrative: string;
  };
  constructiveReformCase: {
    label: string;
    probabilityPct: number;
    expectedSpreadDeltaBps: number;
    narrative: string;
  };
}

export interface CounterfactualShockConfig {
  brentCrudeShockUsd: number;
  fedTerminalRateShockBps: number;
  chokepointTransitDropPct: number;
  domesticFiscalSlippagePctGdp: number;
}

export interface CROOverrideState {
  geopoliticalRiskScore: number;
  sovereignRiskScore: number;
  macroRiskScore: number;
  energyInflationShockPct: number;
  debtServicingSpreadBps: number;
  fxReserveAdequacyMonths: number;
  politicalWillIndex: number;
  counterfactualShocks: CounterfactualShockConfig;
  croNotes: string;
  croApproverName: string;
  isOverridden: boolean;
  approvedAt?: string;
}

export interface DecisionPointRow {
  variableId: string;
  variableName: string;
  deskSource: DeskId;
  provenanceTier: ProvenanceTier;
  currentValue: string;
  bullThreshold: string;
  bearBreakTrigger: string;
  requiredActionIfTriggered: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MONITOR';
}

export interface TradeExecutionTicket {
  ticketId: string;
  assetClass: 'RATES' | 'FX' | 'SOVEREIGN_CREDIT' | 'COMMODITIES' | 'EQUITY_INDEX';
  instrument: string;
  /** The referee model's call, or null when it gave none (shown as Missing). */
  direction: 'LONG' | 'SHORT' | 'HEDGE' | null;
  conviction: 'HIGH' | 'MEDIUM' | 'TACTICAL' | null;
  /** Nothing in the app sizes trades yet: null (shown as Missing). */
  sizingWeightPct: number | null;
  targetHorizon: string;
  entryLevel: string;
  targetLevel: string;
  invalidationStopTrigger: string;
  entryRationale: string;
}

export interface SupremeCouncilOutput {
  /** True only when an AI model wrote this report in a council run; the built-in starting report has none. */
  fromModel?: boolean;
  reportId: string;
  schemaVersion: 'SMCR-1.0';
  generatedAt: string;
  decisionVerdict: 'EXECUTE_TRADES' | 'DEFENSIVE_HEDGE' | 'HOLD_AND_MONITOR';
  compositeRiskScore: number;
  /** How far the council agreed, 0-1. Nothing measures it yet, so it is null (shown as Missing). */
  globalCoherenceScore: number | null;
  executiveSummary: string;
  decisionPointMatrix: DecisionPointRow[];
  policyResearcherReport: {
    structuralVulnerabilities: string[];
    transmissionPathways: string[];
    policyRecommendations: Array<{
      authority: string;
      action: string;
      expectedImpact: string;
      priority: 'IMMEDIATE' | 'MEDIUM_TERM' | 'STRUCTURAL';
    }>;
    longTermRegimeOutlook: string;
  };
  marketTranslationLayer: {
    regimeStance: string;
    tradeExpressions: TradeExecutionTicket[];
    riskGuardianCheck: {
      factorCrowdingWarning: string;
      /** Not estimated anywhere in the app yet: null (shown as Missing). */
      liquidityHaircutPct: number | null;
      /** Not estimated anywhere in the app yet: null (shown as Missing). */
      maxDrawdownEstimatePct: number | null;
      /** Written by the referee model, or MODEL_FIELD_MISSING. */
      tailRiskHedgeInstrument: string;
      /** The referee model's call, or null when it gave none. */
      approvalStatus: 'APPROVED' | 'APPROVED_WITH_HEDGE' | 'RESTRICTED' | null;
    };
  };
}

export interface PolymarketContract {
  id: string;
  question: string;
  probabilityPct: number;
  volumeUsd: number;
  category: string;
  url: string;
  /** Polymarket's own reported change in the price, over a day, a week and a month, in percentage points. */
  change1dPts?: number;
  change1wPts?: number;
  change1mPts?: number;
}

export interface GdeltEventItem {
  title: string;
  sourceDomain: string;
  publishedAt: string;
  toneScore: number;
  url: string;
}

export interface MaturityWallBucket {
  periodLabel: string;
  domesticLocalPctGdp: number;
  externalHardCurrencyPctGdp: number;
  totalUsdBn: number;
  avgCouponPct: number;
  isPeakRollover?: boolean;
}

export interface DebtRolloverProfile {
  greenspanGuidottiRatioPct: number; // Liquid FX Reserves / 12M Short-Term External Debt
  shortTermExternalDebtUsdBn: number;
  liquidFxReservesUsdBn: number;
  weightedAvgMaturityYears: number;
  floatingRateDebtSharePct: number;
  foreignHoldingsSharePct: number;
  rolloverVerdict: string;
  buckets: MaturityWallBucket[];
}

export interface DsaAnalytics {
  effectiveRealInterestRatePct: number; // r
  realGdpGrowthRatePct: number; // g
  rMinusGDifferentialPct: number; // r - g
  debtStabilizingPrimaryBalancePct: number; // pb* = ((r - g)/(1 + g)) * d
  actualPrimaryBalancePct: number; // pb
  fiscalConsolidationGapPct: number; // pb* - pb
  dsaInterpretation: string;
}

export interface YieldCurveTenorPoint {
  tenor: '3M' | '1Y' | '2Y' | '5Y' | '10Y' | '30Y';
  currentYieldPct: number;
  prior90DYieldPct: number;
  usdHedgedBasisBps: number;
}

export interface YieldCurveProfile {
  slope2s10sBps: number;
  curveRegimeLabel: string;
  localVsUsdBasisSummary: string;
  tenors: YieldCurveTenorPoint[];
}

export interface InstitutionalCatalystEvent {
  eventId: string;
  dateLabel: string;
  daysOut: number;
  category:
    | 'CENTRAL_BANK_MPC'
    | 'CENTRAL_BANK_REPORT'
    | 'DATA_RELEASE'
    | 'IMF_FISCAL_REVIEW'
    | 'CREDIT_RATING_WINDOW'
    | 'BOND_REDEMPTION_WALL'
    | 'GEOPOLITICAL_DEADLINE';
  title: string;
  /** Official schedule this date was read from (src/data/officialCalendar.ts). */
  sourceName?: string;
  sourceUrl?: string;
  consensusExpectation: string;
  tailRiskScenario: string;
  impliedVolatilityImpact: string;
  deskOwner: DeskId;
}

export interface FactorSensitivityRow {
  factorName: string;
  shockMagnitudeDescription: string;
  local10YYieldImpactBps: number;
  spotFxImpactPct: number;
  cds5YImpactBps: number;
  transmissionChannel: string;
}

export interface OpenDataSnapshot {
  iso3: string;
  countryName: string;
  region: string;
  currencyCode: string;
  fetchedAt: string;
  liveApiSourcesActive: string[];
  /**
   * Set by the server: the feeds that actually answered on the last pull. Absent on
   * snapshots saved by older versions (treated as unverified). See utils/dataStatus.ts.
   */
  dataStatus?: {
    verifiedLiveSources: string[];
    checkedAt: string;
  };
  /**
   * Figures a live feed actually filled, by path (e.g. 'imf.debtToGdpPct'), with a short source
   * label. Any figure not listed is a built-in value and must not be shown as data.
   */
  liveFields?: Record<string, string>;
  /** The BIS central bank policy rate behind market.policyRatePct, when the feed has one (src/utils/bisPolicyRates.ts). */
  bisPolicyRate?: {
    ratePct: number;
    date: string;
    freq: 'daily' | 'monthly';
    bank?: string;
    rate?: string;
    change12mPts?: number;
    lastMove?: { period: string; fromPct: number; toPct: number };
    stale: boolean;
    pulledAt: string;
  };
  imfIndicators: {
    debtToGdpPct: number;
    debtToGdpForecast2027Pct: number;
    primaryFiscalBalancePct: number;
    realGdpGrowthPct: number;
    cpiInflationPct: number;
    /** IMF WEO output gap, % of potential GDP; set only where the IMF publishes one (mostly advanced economies). */
    outputGapPct?: number;
    /** IMF Fiscal Monitor general government revenue, expenditure and overall balance, % of GDP (src/utils/imfFiscal.ts). */
    revenuePct?: number;
    expenditurePct?: number;
    overallBalancePct?: number;
    /** IMF WEO unemployment rate, %. */
    unemploymentPct?: number;
    /** IMF WEO current account balance, US$ billions and % of GDP. */
    currentAccountUsdBn?: number;
    currentAccountImfPct?: number;
    sourceUrl: string;
    /** WEO year each live figure is for, by liveFields key (e.g. 'imf.debtToGdpPct' -> '2025'). */
    years?: Record<string, string>;
  };
  worldBankIndicators: {
    fxReservesMonthsImport: number;
    externalDebtPctGni: number;
    currentAccountPctGdp: number;
    politicalStabilityPercentile: number;
    /** Military expenditure, % of GDP (World Bank MS.MIL.XPND.GD.ZS, from SIPRI); only when the feed answered. */
    militaryExpenditurePctGdp?: number;
    sourceUrl: string;
  };
  monetaryAndMarket: {
    policyRatePct: number;
    realPolicyRatePct: number;
    sovereign10YBondYieldPct: number;
    cds5YSpreadBps: number;
    /** Hard-currency (USD) bond spread over Treasuries, bps, BCRP EMBIG monthly. Set only from the feed; never a built-in value. */
    hcBondSpreadBps?: number;
    exchangeRatePerUsd: number;
    fxYtdChangePct: number;
    chokepointExposureIndex: number;
  };
  polymarketContracts: PolymarketContract[];
  /** GDELT pull for this country (tone, its shift over the timeline, the date pulled). Set only when GDELT answered. */
  gdeltPull?: { pulledAt: string; tone: number; toneShift?: import('../utils/gdeltTone').GdeltToneShift };
  /** GDELT 2.0 raw files (events and GKG), latest complete week against the weeks before; laid over when served (utils/gdeltRaw.ts). */
  gdeltRaw?: import('../utils/gdeltRaw').GdeltRawReading;
  /** UCDP conflict figures from the downloaded CSV files in data/local/ucdp/; laid over when served (utils/ucdpConflict.ts). */
  ucdp?: import('../utils/ucdpConflict').UcdpReading;
  /** GDELT 1.0 monthly history: latest complete month against all months on disk; laid over when served (utils/gdeltDaily.ts). */
  gdeltDaily?: import('../utils/gdeltDaily').V1Reading;
  /** ACLED conflict events, monthly counts for twelve months, with your own ACLED account; laid over when served (utils/acled.ts). */
  acled?: import('../utils/acled').AcledReading;
  /** Why the ACLED figures are missing, in words (no account, no API access, no answer). */
  acledMissing?: string;
  gdeltMetrics: {
    conflictIntensityIndex: number;
    averageTone: number;
    articleCount24h: number;
    topHeadlines: GdeltEventItem[];
  };
  debtRollover: DebtRolloverProfile;
  dsaAnalytics: DsaAnalytics;
  yieldCurve: YieldCurveProfile;
  catalystCalendar: InstitutionalCatalystEvent[];
  factorBetas: FactorSensitivityRow[];
  liveCreditRating?: string;
  /** Official 10Y yield (OECD via FRED, monthly average) when the country is covered and the feed answered. */
  official10YYield?: import('../utils/officialYields').OfficialYieldObservation;
  groundingCitations?: Array<{ title: string; uri: string }>;
  /** US 10Y Treasury yield (OECD monthly via FRED), the benchmark for the spread over Treasuries. */
  us10YYield?: import('../utils/officialYields').OfficialYieldObservation;
  /** 5Y CDS from the user's own licensed data, when the own-account switch is on (utils/ownCds.ts). */
  ownCds5Y?: { bps: number; date: string; source: string };
  /** Hard-currency (USD) bond spread over Treasuries when BCRP covers the country (utils/hardCurrencySpread.ts). A bond spread, not CDS. */
  hcBondSpread?: import('../utils/hardCurrencySpread').HcSpreadObservation;
  /** Government external debt falling due, when QEDS or IDS answered (see utils/debtSchedule.ts). */
  debtSchedule?: import('../utils/debtSchedule').DebtSchedule;
  livePlumbingOverrides?: {
    usSofrRatePct?: number;
    usEffrRatePct?: number;
    fedOnRrpBalanceUsdBn?: number;
    fxRatesVsUsd?: Record<string, number>;
    fetchedAt?: string;
  };
}

export interface ChartDataPoint {
  period: string;
  primaryValue: number;
  secondaryValue: number;
  tertiaryValue?: number;
  thresholdValue?: number;
  isForecast?: boolean;
}

export interface AnnotatedChartSpec {
  chartId: string;
  categoryKicker: string;
  title: string;
  conclusionHeadline: string;
  subtitle: string;
  deskOwner: DeskId;
  primarySeriesLabel: string;
  primaryUnit: string;
  secondarySeriesLabel: string;
  secondaryUnit: string;
  thresholdLabel: string;
  thresholdValue: number;
  provenanceTier: ProvenanceTier;
  dataSourceCitation: string;
  explainer: {
    whatItMeasures: string;
    whyItMattersInstitutionally: string;
    regimeBreakThresholdExplanation: string;
    crossDeskCascadeLink: string;
  };
  seriesByTimeframe: Record<TimeframeKey, ChartDataPoint[]>;
}

export interface WatchlistItem {
  /** A benchmark market added for peer comparisons (src/utils/marketEdgeAnchors.ts), not on your watchlist. */
  isBenchmark?: boolean;
  iso3: string;
  countryName: string;
  region: string;
  currencyCode: string;
  focusTheme: string;
  yield10YPct: number;
  cds5YBps: number;
  debtToGdpPct: number;
  fxReservesMonths: number;
  /** Whether this row's figures came from live feeds (see utils/dataStatus.ts). Absent = sample. */
  dataMode?: 'live' | 'partial' | 'sample' | 'unverified';
  dataAsOf?: string;
  /** Where yield10YPct came from (see utils/watchlistYield.ts). Absent = sample. */
  yield10YSource?: 'official' | 'ai_estimate' | 'sample' | 'uploaded';
  /** Where cds5YBps came from: the user's own data, an AI estimate, or the sample. Absent = sample. */
  cds5YSource?: 'own' | 'ai_estimate' | 'sample';
  cds5YDate?: string;
  cds5YProvider?: string;
  /** USD bond spread over US Treasuries, bps (J.P. Morgan EMBI Global via BCRP, monthly). Only from the feed; a bond spread, not CDS. */
  hcSpreadBps?: number;
  /** YYYY-MM of that monthly average. */
  hcSpreadPeriod?: string;
  hcSpreadChange12mBps?: number;
  /** Official figures only: YYYY-MM (monthly average) or YYYY-MM-DD (daily rate). */
  yield10YPeriod?: string;
  yield10YFrequency?: 'monthly' | 'daily';
  /** Official monthly yields only: change against 3 and 12 calendar months earlier, percentage points. */
  yield10YChange3mPts?: number;
  yield10YChange12mPts?: number;
  /** Macro figures for the ranked divergence list (utils/divergences.ts). Set by the live watchlist. */
  cpiInflationPct?: number;
  policyRatePct?: number;
  /** 'oecd' when the OECD monthly figure filled CPI, 'live' when the IMF feed answered, else 'sample'. */
  cpiSource?: 'live' | 'sample' | 'oecd';
  /** YYYY-MM of the OECD monthly CPI figure, when cpiSource is 'oecd'. */
  cpiMonth?: string;
  /**
   * Output gap (% of potential GDP): the IMF's where it publishes one ('imf'), else the app's stated
   * estimate from IMF real GDP growth ('estimate', src/utils/outputGap.ts) with its band across methods.
   */
  outputGap?: { pct: number; year: string; source?: 'imf' | 'estimate'; low?: number; high?: number };
  /** Debt sustainability summary (src/utils/debtSustainability.ts) from the saved IMF history. */
  debtSustainability?: DsaSummary;
  /** Government spending by purpose, % of GDP, latest published year per COFOG code (Eurostat or IMF); absent = Missing. */
  govSpending?: Record<string, import('../utils/govSpending').SectorValue>;
  /** 'bis' when the BIS central bank policy rates feed filled policyRatePct; anything else does not count. */
  policyRateSource?: 'bis' | 'ai_estimate' | 'sample';
  /** BIS figures only: the date (YYYY-MM-DD, or YYYY-MM for an end-of-month figure), the central bank, and the history read from the BIS. */
  policyRateDate?: string;
  policyRateBank?: string;
  policyRateStale?: boolean;
  policyRateChange12mPts?: number;
  policyRateLastMove?: { period: string; fromPct: number; toPct: number };
  /** BIS: every move in the history read, oldest first, and the first month read. */
  policyRateMoves?: { period: string; fromPct: number; toPct: number }[];
  policyRateHistoryFrom?: string;
  /** 'live' when the IMF filled debt/GDP, or the World Bank filled reserves; else built-in. */
  debtSource?: 'live' | 'sample';
  reservesSource?: 'live' | 'sample';
  /** BIS international government bonds: outstanding and due within a year, USD bn. */
  intlBondsUsdBn?: number;
  intlBondsDue1yUsdBn?: number;
  intlBondsAsOf?: string;
  /** BIS real effective exchange rate against its 10-year average, percent (utils/fxValuation.ts). */
  reerGapPct?: number;
  reerPeriod?: string;
  /** Three-month realised volatility against the US dollar, annualised percent (ECB rates). */
  fxVol3mPct?: number;
  fxVolTo?: string;
  /** US effective federal funds rate (NY Fed), for carry. */
  usFedFundsPct?: number;
  usFedFundsDate?: string;
  /** Where the fed funds rate came from: the New York Fed API, or FRED (DFF) when that was down. */
  usFedFundsSource?: 'nyfed' | 'fred';
  /** CFTC currency futures positioning (utils/cftcPositioning.ts), with the date the app pulled it. */
  cftc?: import('../utils/cftcPositioning').CftcPositioning & { pulledAt: string };
  /** TIC holdings of US Treasuries (utils/ticHoldings.ts), with the date the app pulled them. */
  tic?: import('../utils/ticHoldings').TicHolding & { pulledAt: string };
  /** United States only: the latest US Treasury auctions (utils/treasuryAuctions.ts), with the date the app pulled them. */
  ustAuctions?: import('../utils/treasuryAuctions').UstAuctionSummary;
  /** EU members only: the latest EU business and consumer surveys (utils/euSurveys.ts), with the date the app pulled them. */
  euSurveys?: import('../utils/euSurveys').EuSurveySummary;
  /** IMF official reserves and balance of payments (utils/imfReserves.ts), with the date the app pulled them. */
  imf?: import('../utils/imfReserves').ImfExternal & { pulledAt: string };
  /** OECD composite leading indicator (utils/oecdCli.ts), with the date the app pulled it. */
  oecdCli?: import('../utils/oecdCli').CliReading & { pulledAt: string };
  /** Set when the OECD answered but publishes no CLI for this country (so the reason can say so). */
  oecdCliPulledAt?: string;
  /** How often timing signals were followed by what they point to, in this country's history (utils/signalRecord.ts). */
  signalRecord?: import('../utils/signalRecord').SignalRecord;
  /** GDELT news tone and its shift (utils/gdeltTone.ts), with the date the app pulled it. */
  gdelt?: { pulledAt: string; tone: number; toneShift?: import('../utils/gdeltTone').GdeltToneShift };
  /** OECD monthly CPI inflation (utils/oecdInflation.ts), with the date the app pulled it. */
  oecdCpi?: import('../utils/oecdInflation').CpiReading & { pulledAt: string };
  /** Set when the OECD answered but publishes no CPI for this country. */
  oecdCpiPulledAt?: string;
  /** UN Comtrade partners and export mix (utils/comtradeTrade.ts), with the date the app pulled them. */
  comtrade?: import('../utils/comtradeTrade').ComtradeProfile & { pulledAt: string };
  /** IMF COFER world currency shares of FX reserves (utils/imfCofer.ts); the same world reading on every row. */
  cofer?: import('../utils/imfCofer').CoferReading & { pulledAt: string };
  /** Official trade shares for the scenario ranking (utils/scenarioExposure.ts). */
  trade?: import('../utils/scenarioExposure').TradeExposure;
  /** Public debt and fiscal figures from live feeds only, each with its year (utils/fiscalDebt.ts). */
  fiscal?: import('../utils/fiscalDebt').FiscalFigures;
  /** GDELT tone and headlines, WGI political stability and Polymarket odds, live only (utils/politicsEvents.ts). */
  politics?: import('../utils/politicsEvents').PoliticsFigures;
}

/** Built-in figures on a watchlist row; LiveWatchlistItem leaves each out unless a live source filled it. */
export type BuiltInWatchlistField =
  | 'yield10YPct'
  | 'cds5YBps'
  | 'debtToGdpPct'
  | 'fxReservesMonths';

/** A watchlist row with only figures from live, official, your own or AI-search sources (utils/liveFigures.ts). */
export type LiveWatchlistItem = Omit<WatchlistItem, BuiltInWatchlistField> & Partial<Pick<WatchlistItem, BuiltInWatchlistField>>;

export interface WatchlistGroup {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  items: WatchlistItem[];
}

export type ExternalInternalConnectorMetricKey =
  | 'gdpGrowth'
  | 'cpiInflation'
  | 'debtToGdp'
  | 'cds5yBps'
  | 'fxReservesMonths'
  | 'policyRate'
  | 'politicalStability';

export interface ExternalInternalConnectorConfig {
  id: string;
  name: string;
  category: 'macro_rest' | 'llm_gateway' | 'webhook_bus';
  networkScope: 'external' | 'internal_host';
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  bodyTemplate?: string;
  enabled: boolean;
  timeoutMs: number;
  telemetryMappings?: Partial<Record<ExternalInternalConnectorMetricKey, string>>;
  injectIntoCouncilPrompt?: boolean;
  lastStatus?: 'untested' | 'ok' | 'error';
  lastLatencyMs?: number;
  lastTestedAt?: string;
}

export interface DockerSelfHostGuiConfig {
  targetOs: 'mac_apple_silicon' | 'mac_intel' | 'windows_nvidia' | 'windows_cpu' | 'linux';
  topology: 'host_ollama' | 'bundled_cpu' | 'bundled_gpu';
  appPort: number;
  ollamaPort: number;
  containerName: string;
  keepAlive: string;
  corsOrigins: string;
  autoPullOnBoot: boolean;
}

export type IntegrationBroadcastScope =
  | 'all_desks_bundle'
  | 'geopolitical_desk'
  | 'sovereign_desk'
  | 'macro_desk'
  | 'supreme_council';

export interface TopLevelIntegrationConfig {
  requireApiKey: boolean;
  apiKey: string;
  webhookHmacSecret: string;
  autoBroadcastOnRun: boolean;
  defaultScope: IntegrationBroadcastScope;
  includeSubAgents: boolean;
  includeQuantSuites: boolean;
}

export interface IntegrationDeliveryReceipt {
  deliveryId: string;
  timestamp: string;
  iso3: string;
  countryName: string;
  scope: IntegrationBroadcastScope;
  eventType: string;
  targetName: string;
  targetUrl: string;
  transport: 'WEBHOOK_POST' | 'SSE_STREAM' | 'REST_PULL';
  statusCode: number;
  ok: boolean;
  latencyMs: number;
  hmacSignature: string;
  payloadBytes: number;
  responsePreview: string;
}

export interface AIRuntimeConfig {
  providerMode: 'gemini' | 'ollama' | 'hybrid' | 'openai_compatible';
  geminiQuickModel: string;
  geminiDeepModel: string;
  ollamaBaseUrl: string;
  ollamaQuickModel: string;
  ollamaDeepModel: string;
  /** L1 (Sam, 2026-11-08): lets a mid-size referee (9B to 29B, for example 14B) judge answers, each labelled "small referee". Off by default. */
  allowSmallReferee?: boolean;
  openAiBaseUrl: string;
  openAiModel: string;
  webhookTargetUrl: string;
  enableSearchGrounding: boolean;
  maxDebateRounds: number;
  temperature?: number;
  numCtx?: number;
  timeoutSeconds?: number;
  deskModelOverrides?: {
    geopolitical?: string;
    sovereign?: string;
    macro?: string;
    supremeCouncil?: string;
  };
  agentModelOverrides?: Partial<Record<SubAgentId, string>>;
  agentPromptOverrides?: Partial<Record<SubAgentId, string>>;
  dockerGuiConfig?: DockerSelfHostGuiConfig;
  apiConnectors?: ExternalInternalConnectorConfig[];
  integrationConfig?: TopLevelIntegrationConfig;
}

export interface CouncilAssessmentRun {
  runId: string;
  iso3: string;
  countryName: string;
  scenarioPrompt: string;
  policyDocumentTitle?: string;
  policyDocumentSnippet?: string;
  runtimeUsed: string;
  stage: 'IDLE' | 'RUNNING_PHASE_1_2' | 'AWAITING_CRO_APPROVAL' | 'RUNNING_SUPREME_COUNCIL' | 'COMPLETED';
  /** How long each step took on this run, measured by the server (src/utils/councilTiming.ts). */
  timing?: import('../utils/councilTiming').CouncilTiming;
  openData: OpenDataSnapshot;
  charts: AnnotatedChartSpec[];
  subAgents: SubAgentReport[];
  deskDebates: Record<DeskId, DeskDebateTranscript>;
  cascadeSteps: CascadeStep[];
  crisisAnalogs: CrisisAnalogMatch[];
  regimeDistribution: RegimeProbabilityDistribution;
  croState: CROOverrideState;
  supremeCouncil?: SupremeCouncilOutput;
  pipelineExecutionTelemetry?: CouncilPipelineTelemetry;
  /** Sentences removed because a number did not trace to what the council was given (utils/runFigureCheck.ts). */
  figureCheck?: {
    desks?: import('../utils/runFigureCheck').FigureCheck;
    report?: import('../utils/runFigureCheck').FigureCheck;
  };
}

export type PipelineNodeId =
  | 'STAGE_0_LIVE_DATA'
  | 'STAGE_1_GEO_DESK'
  | 'STAGE_1_SOV_DESK'
  | 'STAGE_1_MACRO_DESK'
  | 'STAGE_2_CONTAGION_CASCADE'
  | 'STAGE_3_SUPREME_COUNCIL';

export type PipelineNodeStatus =
  | 'VERIFIED_AI'
  | 'RETRY_RECOVERED'
  | 'QUANT_ANCHOR_FALLBACK'
  | 'AWAITING_GATE';

export interface PipelineStageTelemetry {
  nodeId: PipelineNodeId;
  stageLabel: string;
  agentsCovered: string[];
  status: PipelineNodeStatus;
  latencyMs: number;
  retriesUsed: number;
  schemaVerified: boolean;
  quantitativeAnchorScore?: number;
  rawModelScore?: number;
  finalBoundedScore?: number;
  anchorDriftClamped?: boolean;
  diagnosticNote: string;
}

export interface CouncilPipelineTelemetry {
  pipelineRunId: string;
  executedAt: string;
  totalLatencyMs: number;
  overallReliabilityScorePct: number;
  activeProvider: string;
  searchGroundingSourcesCount: number;
  stages: PipelineStageTelemetry[];
}

// ============================================================================
// TIER-7.5 POLYMARKET & KALSHI EVENT ARBITRAGE & BAYESIAN SHOCK SUITE
// ============================================================================

export type PredictionMarketVenue = 'POLYMARKET' | 'KALSHI';

export type PredictionEventCategory =
  | 'CENTRAL_BANK_RATES'
  | 'INFLATION_CPI'
  | 'TARIFFS_TRADE'
  | 'GEOPOLITICAL_CONFLICT'
  | 'SOVEREIGN_FISCAL_DEFAULT';

export interface RawVenueEventContract {
  contractId: string;
  venue: PredictionMarketVenue;
  tickerOrSlug: string;
  question: string;
  category: PredictionEventCategory;
  yesPriceCents: number; // 1 to 99¢
  noPriceCents: number; // 1 to 99¢
  bidAskSpreadCents: number; // e.g., 1¢ to 4¢
  impliedProbabilityPct: number; // 1 to 99%
  counterVenuePriceCents?: number; // Matched Kalshi or Polymarket equivalent price in cents
  isLiveApiSourced: boolean;
  url: string;
}

// ============================================================================
// TIER-10: PERSONA PLAYBOOKS, CROSS-HUB SIGNAL SCANNER, STRATEGY BACKTESTER
// & ACADEMIC LATEX / CSV EMPIRICAL EXPORTER (10.1 - 10.4)
// Strictly normalized (% of GDP, bps, 0-100c, % share, Sharpe, Brier 0-1)
// ============================================================================

export type UserPersonaId =
  | 'INDIVIDUAL_TRADER'
  | 'INSTITUTIONAL_PM_IC'
  | 'POLICY_RESEARCHER';

// ============================================================================
// TIER-11: TURNKEY PRODUCTION HARDENING, 4-CATEGORY NAVIGATION, GLOBAL
// COMMAND PALETTE (CMD+K), PRE-FLIGHT MODEL INTEGRITY AUDITOR, SESSION
// PERSISTENCE & CUSTOM ISO-3 SOVEREIGN ONBOARDING
// ============================================================================

export type CommandPaletteItemCategory =
  | 'ANALYTICAL_HUB'
  | 'SUB_MODULE'
  | 'SOVEREIGN_SWITCH'
  | 'PERSONA_MODE'
  | 'STRESS_SCENARIO'
  | 'EXPORT_AND_AUDIT';

export interface CommandPaletteItem {
  id: string;
  category: CommandPaletteItemCategory;
  categoryBadge: string;
  title: string;
  subtitle: string;
  shortcutHint?: string;
  keywords: string[];
  targetNavSection?: string;
  targetIso3?: string;
  targetPersona?: UserPersonaId;
  actionType?:
    | 'OPEN_INTEGRITY_AUDITOR'
    | 'OPEN_CUSTOM_SOVEREIGN_WIZARD'
    | 'OPEN_SESSION_MANAGER'
    | 'EXPORT_SMCR_PDF'
    | 'SYNC_LIVE_MACRO'
    | 'RUN_COUNCIL_PIPELINE';
}

export type IntegrityCheckCategory =
  | 'ACCOUNTING_IDENTITY'
  | 'NO_NOTIONAL_COMPLIANCE'
  | 'BOUNDS_AND_FINITENESS'
  | 'API_PROVENANCE';

export interface ModelIntegrityAuditCheck {
  checkId: string;
  category: IntegrityCheckCategory;
  hubReference: string;
  title: string;
  formulaChecked: string;
  expectedInvariant: string;
  observedReading: string;
  residualDeviationLabel: string;
  status: 'PASS' | 'WARN';
  diagnosticDetail: string;
}

export interface DataProvenanceFeedStatus {
  feedId: string;
  institutionName: string;
  endpointOrDataset: string;
  metricsProvided: string;
  status: 'LIVE_SYNCED' | 'VERIFIED_BASELINE';
  lastVerifiedTimestamp: string;
}

export interface ModelIntegrityAuditReport {
  generatedAtIso: string;
  activeSovereignIso3: string;
  activeSovereignName: string;
  watchlistCount: number;
  totalChecksRun: number;
  passedChecksCount: number;
  readinessScorePct: number;
  zeroNotionalComplianceVerified: boolean;
  executiveAuditVerdict: string;
  checks: ModelIntegrityAuditCheck[];
  provenanceFeeds: DataProvenanceFeedStatus[];
}

/** A country the user added under Research > One country > Add a country. Names only: its figures come from the feeds. */
export interface AddedCountry {
  iso3: string;
  countryName: string;
  region: string;
  currencyCode: string;
}

export interface WorkspaceSessionSnapshot {
  schemaVersion: 'ECONQUEST-SESSION-1.0';
  savedAtIso: string;
  sessionLabel: string;
  activeIso3: string;
  activeCountryName: string;
  activePersona: UserPersonaId;
  activeNavSection: string;
  layoutMode: WorkspaceLayoutMode;
  darkMode: boolean;
  scenarioDirective: string;
  // Old sessions may still carry forecastShocks, geopoliticalWargameParams and liquidityStressParams
  // (inputs of the retired model desk engines); they are ignored.
  watchlists: WatchlistGroup[];
  activeWatchlistId: string;
  customOnboardedSovereigns: AddedCountry[];
}

/** The few debt-sustainability figures the council and the watchlist carry (src/utils/debtSustainability.ts). */
export interface DsaSummary {
  year: string;
  debtNow: number;
  /** Baseline on IMF inputs where it ran, else the IMF path. */
  base?: { label: string; end: number; year: string };
  worst?: { label: string; end: number };
  stabilisingPb?: number;
  projectedPb?: number;
  rMinusG?: number;
  /** The baseline's yearly inputs (IMF growth, inflation, effective interest, primary balance), for what-ifs. */
  inputs?: import('../utils/debtSustainability').YearAssump[];
  method: string;
}
