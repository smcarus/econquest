import { upcomingOfficialEvents } from './officialCalendar';
import { MODEL_FIELD_MISSING } from '../utils/councilResult';
import {
  CouncilAssessmentRun,
  AddedCountry,
  DeskDebateTranscript,
  DeskId,
  PipelineStageTelemetry,
  SubAgentReport,
  TradeExecutionTicket,
  InstitutionalCatalystEvent,
  OpenDataSnapshot,
  WatchlistGroup,
  WatchlistItem,
} from '../types/council';

/**
 * Puts a country the user added into the catalog. Names only: every figure is NaN (Missing) until a
 * feed fills it, as for the built-in countries.
 */
export function registerCustomSovereignInCatalog(country: AddedCountry): WatchlistItem {
  const newItem: WatchlistItem = {
    iso3: country.iso3,
    countryName: country.countryName,
    region: country.region,
    currencyCode: country.currencyCode,
    focusTheme: '',
    yield10YPct: Number.NaN,
    cds5YBps: Number.NaN,
    debtToGdpPct: Number.NaN,
    fxReservesMonths: Number.NaN,
  };
  const existingIdx = SOVEREIGN_CATALOG.findIndex((c) => c.iso3 === country.iso3);
  // A built-in country keeps its catalog entry; adding it again only puts it on the watchlist.
  if (existingIdx < 0) SOVEREIGN_CATALOG.push(newItem);
  return existingIdx >= 0 ? SOVEREIGN_CATALOG[existingIdx] : newItem;
}

// Countries the app knows. No built-in figures: every number is NaN (Missing) until a feed fills it.
const N = Number.NaN;
export const SOVEREIGN_CATALOG: WatchlistItem[] = [
  {
    iso3: 'BRA',
    countryName: 'Brazil',
    region: 'Latin America',
    currencyCode: 'BRL',
    focusTheme: 'Fiscal Primary Target Credibility vs. Selic Terminal Rate & Real Yield Cushion',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'TUR',
    countryName: 'Turkey',
    region: 'EMEA',
    currencyCode: 'TRY',
    focusTheme: 'Orthodox Monetary Disinflation Path, Net FX Reserve Rebuilding & Energy Import Sensitivity',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'EGY',
    countryName: 'Egypt (Red Sea Corridor)',
    region: 'MENA / Chokepoint',
    currencyCode: 'EGP',
    focusTheme: 'Bab el-Mandeb Maritime Transit Revenue Shock, IMF EFF Tranche & Rollover Wall',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'ZAF',
    countryName: 'South Africa',
    region: 'Sub-Saharan Africa',
    currencyCode: 'ZAR',
    focusTheme: 'Coalition Fiscal Consolidation, Logistics Bottlenecks & Commodity Terms-of-Trade',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'MEX',
    countryName: 'Mexico',
    region: 'Latin America',
    currencyCode: 'MXN',
    focusTheme: 'North American Trade Tariff Renegotiation, Judicial Reform & Quasi-Sovereign Contingent Liability',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'IDN',
    countryName: 'Indonesia',
    region: 'Asia-Pacific',
    currencyCode: 'IDR',
    focusTheme: 'Fiscal Deficit 3% Cap Discipline, Commodity Downstreaming & DXY Spillover Resilience',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'JPN',
    countryName: 'Japan',
    region: 'G10 / Asia-Pacific',
    currencyCode: 'JPY',
    focusTheme: 'BoJ Yield Curve Normalization, JGB Duration Supply & Yen Carry Trade Unwind Spillover',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'GBR',
    countryName: 'United Kingdom',
    region: 'G10 / Europe',
    currencyCode: 'GBP',
    focusTheme: 'Gilt Issuance Supply Absorption, Fiscal Headroom Rules & Services Inflation Persistence',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'POL',
    countryName: 'Poland',
    region: 'CEE / Europe',
    currencyCode: 'PLN',
    focusTheme: 'Defence Spending and the EU Deficit Procedure, NBP Easing Path & Frontline Geopolitical Premium',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'CHL',
    countryName: 'Chile',
    region: 'Latin America',
    currencyCode: 'CLP',
    focusTheme: 'Fiscal Rule Credibility, Copper Terms-of-Trade & BCCh Easing Room',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  // The rest of the G20 (added 2026-11-07). Names and topics only; every figure comes from a feed.
  {
    iso3: 'ARG',
    countryName: 'Argentina',
    region: 'Latin America',
    currencyCode: 'ARS',
    focusTheme: 'Bringing inflation down, rebuilding central bank reserves and repaying the IMF',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'AUS',
    countryName: 'Australia',
    region: 'G10 / Asia-Pacific',
    currencyCode: 'AUD',
    focusTheme: 'Interest rates, house prices and exports of iron ore and gas to China',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'CAN',
    countryName: 'Canada',
    region: 'G10 / North America',
    currencyCode: 'CAD',
    focusTheme: 'Trade with the United States, tariffs and household mortgage debt',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'CHN',
    countryName: 'China',
    region: 'Asia-Pacific',
    currencyCode: 'CNY',
    focusTheme: 'Slower growth, the property slump, local government debt and trade tensions',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'FRA',
    countryName: 'France',
    region: 'G10 / Europe',
    currencyCode: 'EUR',
    focusTheme: 'The budget deficit, rising government debt and a divided parliament',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'DEU',
    countryName: 'Germany',
    region: 'G10 / Europe',
    currencyCode: 'EUR',
    focusTheme: 'Weak industry, energy costs and new borrowing for defence and infrastructure',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'IND',
    countryName: 'India',
    region: 'Asia-Pacific',
    currencyCode: 'INR',
    focusTheme: 'Fast growth, food prices and inflation, and government borrowing',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'ITA',
    countryName: 'Italy',
    region: 'G10 / Europe',
    currencyCode: 'EUR',
    focusTheme: 'Very high government debt, the extra yield over Germany and EU recovery funds',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'RUS',
    countryName: 'Russia',
    region: 'EMEA',
    currencyCode: 'RUB',
    focusTheme: 'War spending, Western sanctions, oil income and high interest rates',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'SAU',
    countryName: 'Saudi Arabia',
    region: 'MENA',
    currencyCode: 'SAR',
    focusTheme: 'Oil prices and output, the riyal peg to the dollar and Vision 2030 spending',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'KOR',
    countryName: 'South Korea',
    region: 'Asia-Pacific',
    currencyCode: 'KRW',
    focusTheme: 'Chip and car exports, household debt and tension with North Korea',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
  {
    iso3: 'USA',
    countryName: 'United States',
    region: 'G10 / North America',
    currencyCode: 'USD',
    focusTheme: 'Federal Reserve rates, the budget deficit, Treasury borrowing and tariffs',
    yield10YPct: N,
    cds5YBps: N,
    debtToGdpPct: N,
    fxReservesMonths: N,
  },
];

/**
 * The G20's 19 member countries, in the alphabetical order the G20 itself uses. The EU and the
 * African Union are members too but are blocs, not countries, so they are not on this list.
 */
export const G20_ISO3 = ['ARG', 'AUS', 'BRA', 'CAN', 'CHN', 'FRA', 'DEU', 'IND', 'IDN', 'ITA', 'JPN', 'KOR', 'MEX', 'RUS', 'SAU', 'ZAF', 'TUR', 'GBR', 'USA'];

/** ISO-3 codes that have a free official 10Y yield feed (FRED, Brazil Treasury). Turkey needs a key. */
const OFFICIAL_YIELD_GROUP_ISO3 = ['BRA', 'MEX', 'ZAF', 'POL', 'CHL', 'GBR', 'JPN'];

export const DEFAULT_WATCHLISTS: WatchlistGroup[] = [
  {
    id: 'wl_g20',
    name: 'G20 Members',
    description:
      "The Group of Twenty: 19 of the world's largest economies, whose leaders meet every year to agree on the world economy, trade and finance. The EU and the African Union are also members but are groups of countries, so they are not listed here.",
    isCustom: false,
    items: G20_ISO3.map((iso3) => SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)!),
  },
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
  {
    id: 'wl_official_yields',
    name: 'Official 10Y Yields',
    description: 'Countries whose 10-year government bond yield comes from a free official source (FRED or the Brazil Treasury), not a sample figure.',
    isCustom: false,
    items: OFFICIAL_YIELD_GROUP_ISO3.map((iso3) => SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)!),
  },
];

const SEEN_DEFAULTS_KEY = 'econquest.watchlistDefaults.seen.v1';

/**
 * Add default watchlist groups that shipped after the user's watchlists were saved.
 * A group is offered once: if the user deletes it, `seenIds` remembers it and it stays gone.
 * Groups the user already has are never touched.
 */
export function addNewDefaultWatchlists(
  saved: WatchlistGroup[],
  seenIds: string[] | null,
  defaults: WatchlistGroup[] = DEFAULT_WATCHLISTS
): { groups: WatchlistGroup[]; seen: string[] } {
  const have = new Set(saved.map((g) => g.id));
  // First run of this check: treat the groups that existed before it as already seen.
  const seen = new Set(seenIds ?? ['wl_em_sovereign_core', 'wl_chokepoint_geopol', 'wl_g10_em_spillover']);
  const added = defaults.filter((g) => !have.has(g.id) && !seen.has(g.id));
  defaults.forEach((g) => seen.add(g.id));
  return { groups: [...saved, ...added], seen: [...seen] };
}

export function loadSeenDefaultWatchlists(): string[] | null {
  try {
    const raw = window.localStorage.getItem(SEEN_DEFAULTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

export function saveSeenDefaultWatchlists(ids: string[]): void {
  try {
    window.localStorage.setItem(SEEN_DEFAULTS_KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked */
  }
}

/** News metrics for a country with no sample headlines: neutral tone, no articles, no headlines. */
export function noNewsMetrics(geopoliticalRisk: number): OpenDataSnapshot['gdeltMetrics'] {
  return {
    conflictIntensityIndex: Math.round(geopoliticalRisk * 100),
    averageTone: 0,
    articleCount24h: 0,
    topHeadlines: [],
  };
}

/**
 * The empty shape of a country snapshot, before any feed answers. Every figure is NaN (shown as
 * Missing), every list is empty: no built-in numbers, headlines, prediction markets, curves or
 * shock betas (Sam, 2026-11-04: no built-in figures unless live, real or historic). The server fills
 * in what the feeds return and records it in `liveFields`; `recomputeDerivedOpenDataAnalytics` then
 * works out the debt and curve analytics from those live figures only.
 */
export function buildBaselineOpenData(iso3: string): OpenDataSnapshot {
  const item = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3) || SOVEREIGN_CATALOG[0];
  const N = Number.NaN;
  const missing = 'Missing: needs live figures from the data feeds.';
  const now = new Date().toISOString();

  const imf = {
    debtToGdpPct: N,
    debtToGdpForecast2027Pct: N,
    primaryFiscalBalancePct: N,
    realGdpGrowthPct: N,
    cpiInflationPct: N,
    sourceUrl: `https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/${item.iso3}`,
  };
  const wb = {
    fxReservesMonthsImport: N,
    externalDebtPctGni: N,
    currentAccountPctGdp: N,
    politicalStabilityPercentile: N,
    sourceUrl: `https://api.worldbank.org/v2/country/${item.iso3}`,
  };
  const mkt = {
    policyRatePct: N,
    realPolicyRatePct: N,
    sovereign10YBondYieldPct: N,
    cds5YSpreadBps: N,
    exchangeRatePerUsd: N,
    fxYtdChangePct: N,
    chokepointExposureIndex: N,
  };

  return {
    iso3: item.iso3,
    countryName: item.countryName,
    region: item.region,
    currencyCode: item.currencyCode,
    fetchedAt: now,
    liveApiSourcesActive: [],
    dataStatus: { verifiedLiveSources: [], checkedAt: now },
    imfIndicators: imf,
    worldBankIndicators: wb,
    monetaryAndMarket: mkt,
    polymarketContracts: [],
    gdeltMetrics: { conflictIntensityIndex: N, averageTone: N, articleCount24h: 0, topHeadlines: [] },
    dsaAnalytics: {
      effectiveRealInterestRatePct: N,
      realGdpGrowthRatePct: N,
      rMinusGDifferentialPct: N,
      debtStabilizingPrimaryBalancePct: N,
      actualPrimaryBalancePct: N,
      fiscalConsolidationGapPct: N,
      dsaInterpretation: missing,
    },
    debtRollover: {
      greenspanGuidottiRatioPct: N,
      shortTermExternalDebtUsdBn: N,
      liquidFxReservesUsdBn: N,
      weightedAvgMaturityYears: N,
      floatingRateDebtSharePct: N,
      foreignHoldingsSharePct: N,
      rolloverVerdict: missing,
      buckets: [],
    },
    yieldCurve: {
      slope2s10sBps: N,
      curveRegimeLabel: 'Missing',
      localVsUsdBasisSummary: missing,
      tenors: [],
    },
    catalystCalendar: buildOfficialCatalystCalendar(item.iso3, mkt.policyRatePct),
    factorBetas: [],
  };
}

/**
 * Figures worked out from the snapshot's own figures: the real policy rate (policy rate minus
 * inflation) and the official calendar. The old version also built a yield curve, a reserve cover
 * ratio and a debt rollover profile from fixed multipliers (for example reserves = months of imports
 * x 24.5 bn); those are gone and read Missing. The debt sustainability view is in
 * src/utils/debtSustainability.ts, on IMF history.
 */
export function recomputeDerivedOpenDataAnalytics(snapshot: OpenDataSnapshot): OpenDataSnapshot {
  const imf = snapshot.imfIndicators;
  const mkt = snapshot.monetaryAndMarket;
  mkt.realPolicyRatePct =
    Number.isFinite(mkt.policyRatePct) && Number.isFinite(imf.cpiInflationPct) ? Number((mkt.policyRatePct - imf.cpiInflationPct).toFixed(2)) : Number.NaN;
  snapshot.catalystCalendar = buildOfficialCatalystCalendar(snapshot.iso3, mkt.policyRatePct);
  return snapshot;
}

/**
 * Upcoming events for one country, from the official calendar only (next ~13 months).
 * Empty when no schedule is on file; nothing is generated.
 */
export function buildOfficialCatalystCalendar(
  iso3: string,
  policyRatePct: number,
  now: Date = new Date()
): InstitutionalCatalystEvent[] {
  return upcomingOfficialEvents([iso3], 400, now).map((ev, i) => ({
    eventId: `off-${iso3}-${ev.date}-${i}`,
    dateLabel: `${ev.date} (${ev.daysUntil === 0 ? 'today' : `in ${ev.daysUntil}d`})`,
    daysOut: ev.daysUntil,
    category:
      ev.category === 'MPC_DECISION'
        ? 'CENTRAL_BANK_MPC'
        : ev.category === 'INFLATION_REPORT'
        ? 'CENTRAL_BANK_REPORT'
        : ev.category === 'IMF_PROGRAMME' || ev.category === 'BUDGET'
        ? 'IMF_FISCAL_REVIEW'
        : ev.category === 'ELECTION'
        ? 'GEOPOLITICAL_DEADLINE'
        : 'DATA_RELEASE',
    title: ev.dateKind === 'legal_deadline' ? `${ev.title} (latest date in law)` : ev.title,
    consensusExpectation:
      ev.category === 'MPC_DECISION'
        ? `Policy rate now ${policyRatePct.toFixed(2)}% (no consensus feed)`
        : 'No consensus feed',
    tailRiskScenario: '',
    impliedVolatilityImpact: 'not estimated',
    deskOwner: 'macro',
    sourceName: ev.sourceName,
    sourceUrl: ev.sourceUrl,
  }));
}

// The council's nine desk agents and three desks: who they are, never what they found.
const AGENTS: Array<Pick<SubAgentReport, 'agentId' | 'agentCode' | 'agentName' | 'deskId' | 'roleTitle' | 'dataSourcesUsed'>> = [
  { agentId: 'ag1_intel_scraper', agentCode: 'Geopolitical · Intelligence', agentName: 'Intelligence Scraper Analyst', deskId: 'geopolitical', roleTitle: 'News event velocity and diplomatic monitor', dataSourcesUsed: ['GDELT'] },
  { agentId: 'ag2_transmission_mapper', agentCode: 'Geopolitical · Supply Chain', agentName: 'Transmission Mapping Analyst', deskId: 'geopolitical', roleTitle: 'Trade partners, chokepoints and supply chains', dataSourcesUsed: ['UN Comtrade', 'World Bank WITS'] },
  { agentId: 'ag3_sanctions_legal', agentCode: 'Geopolitical · Sanctions & Legal', agentName: 'Sanctions & Legal Analyst', deskId: 'geopolitical', roleTitle: 'Sanctions lists, tariffs and prediction-market odds', dataSourcesUsed: ['OFAC and UN sanctions lists', 'Polymarket', 'Kalshi'] },
  { agentId: 'ag4_fiscal_auditor', agentCode: 'Sovereign · Fiscal Sustainability', agentName: 'Fiscal Auditor Analyst', deskId: 'sovereign', roleTitle: 'Government debt, primary balance and debt service', dataSourcesUsed: ['IMF WEO and Fiscal Monitor', 'World Bank IDS'] },
  { agentId: 'ag5_external_balance', agentCode: 'Sovereign · External Balance Sheet', agentName: 'External Balance Sheet Analyst', deskId: 'sovereign', roleTitle: 'Reserves, import cover and the current account', dataSourcesUsed: ['World Bank', 'IMF reserves'] },
  { agentId: 'ag6_political_will', agentCode: 'Sovereign · Political Will', agentName: 'Political Will & Governance Analyst', deskId: 'sovereign', roleTitle: 'Governance, elections and willingness to pay', dataSourcesUsed: ['World Bank WGI', 'Polymarket'] },
  { agentId: 'ag7_hf_nowcaster', agentCode: 'Macro · Real-Time Nowcast', agentName: 'High-Frequency Nowcaster Analyst', deskId: 'macro', roleTitle: 'Growth, inflation and activity', dataSourcesUsed: ['IMF WEO', 'OECD', 'national statistics'] },
  { agentId: 'ag8_cb_watcher', agentCode: 'Macro · Monetary Policy', agentName: 'Central Bank Watcher Analyst', deskId: 'macro', roleTitle: 'Policy rate, real rate and inflation target', dataSourcesUsed: ['BIS central bank policy rates'] },
  { agentId: 'ag9_global_spillover', agentCode: 'Macro · Cross-Border Spillovers', agentName: 'Global Spillover Analyst', deskId: 'macro', roleTitle: 'US rates, the dollar and commodity prices', dataSourcesUsed: ['FRED', 'US Treasury', 'World Bank Pink Sheet'] },
];

const DESKS: Record<DeskId, { deskName: string; deskLeadTitle: string }> = {
  geopolitical: { deskName: 'Geopolitical Risk Desk', deskLeadTitle: 'Desk lead, geopolitics' },
  sovereign: { deskName: 'Sovereign Credit Desk', deskLeadTitle: 'Desk lead, sovereign credit' },
  macro: { deskName: 'Macroeconomic Desk', deskLeadTitle: 'Desk lead, macro' },
};

const PIPELINE_STAGES: Array<Pick<PipelineStageTelemetry, 'nodeId' | 'stageLabel' | 'agentsCovered'>> = [
  { nodeId: 'STAGE_0_LIVE_DATA', stageLabel: 'Stage 0 · Country figures', agentsCovered: ['Data feeds'] },
  { nodeId: 'STAGE_1_GEO_DESK', stageLabel: 'Stage 1A · Geopolitical Risk Desk', agentsCovered: ['AG-1', 'AG-2', 'AG-3'] },
  { nodeId: 'STAGE_1_SOV_DESK', stageLabel: 'Stage 1B · Sovereign Credit Desk', agentsCovered: ['AG-4', 'AG-5', 'AG-6'] },
  { nodeId: 'STAGE_1_MACRO_DESK', stageLabel: 'Stage 1C · Macroeconomic Desk', agentsCovered: ['AG-7', 'AG-8', 'AG-9'] },
  { nodeId: 'STAGE_2_CONTAGION_CASCADE', stageLabel: 'Stage 2 · Cross-desk cascade', agentsCovered: ['Desk leads'] },
  { nodeId: 'STAGE_3_SUPREME_COUNCIL', stageLabel: 'Stage 3 · Supreme Council (SMCR-1.0)', agentsCovered: ['Supreme Council', 'Risk check'] },
];

/**
 * The starting run for a country before any council run: who the agents and desks are, and the
 * country's figures. It holds no findings, debate, scores, scenarios, analogies, trade ideas or
 * risk notes: every text field reads MODEL_FIELD_MISSING and every score is NaN until a model
 * answers in a council run (server.ts). The slots the Supreme Council fills (three policy
 * recommendations, four trade ideas) are present and empty.
 */
export function buildDefaultAssessmentRun(iso3 = 'BRA', customOpenData?: OpenDataSnapshot): CouncilAssessmentRun {
  const openData = recomputeDerivedOpenDataAnalytics(customOpenData ?? buildBaselineOpenData(iso3));
  const catalogItem = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3) || SOVEREIGN_CATALOG[0];
  const countryName = customOpenData?.countryName || catalogItem.countryName;
  const M = MODEL_FIELD_MISSING;
  const N = Number.NaN;
  const desk = (deskId: DeskId): DeskDebateTranscript => ({
    deskId,
    ...DESKS[deskId],
    initialRiskSpread: N,
    rounds: [],
    preCascadeRiskScore: N,
    postCascadeRiskScore: N,
    consensusStance: 'CAUTIOUS',
    consensusSummary: M,
    minorityDissents: [],
  });
  const scenario = (label: string) => ({ label, probabilityPct: N, expectedSpreadDeltaBps: N, narrative: M });
  const trade = (ticketId: string, assetClass: TradeExecutionTicket['assetClass']): TradeExecutionTicket => ({
    ticketId,
    assetClass,
    instrument: M,
    direction: null,
    conviction: null,
    sizingWeightPct: null,
    targetHorizon: M,
    entryLevel: M,
    targetLevel: M,
    invalidationStopTrigger: M,
    entryRationale: M,
  });
  const now = new Date().toISOString();

  return {
    runId: `RUN-${iso3}-NOT-RUN`,
    iso3: customOpenData?.iso3 || catalogItem.iso3,
    countryName,
    scenarioPrompt: catalogItem.focusTheme,
    runtimeUsed: 'Not run yet',
    stage: 'COMPLETED',
    openData,
    charts: [],
    subAgents: AGENTS.map((a) => ({
      ...a,
      stance: 'NEUTRAL',
      riskScore: N,
      confidence: N,
      brierCalibrationWeight: N,
      keyMetrics: [],
      findingsSummary: M,
      structuredPayload: {},
      groundingSources: [],
    })),
    deskDebates: { geopolitical: desk('geopolitical'), sovereign: desk('sovereign'), macro: desk('macro') },
    cascadeSteps: [],
    crisisAnalogs: [],
    regimeDistribution: {
      baseCase: scenario('Base case'),
      adverseTailCase: scenario('Adverse case'),
      constructiveReformCase: scenario('Reform case'),
    },
    croState: {
      geopoliticalRiskScore: N,
      sovereignRiskScore: N,
      macroRiskScore: N,
      energyInflationShockPct: N,
      debtServicingSpreadBps: N,
      fxReserveAdequacyMonths: openData.worldBankIndicators.fxReservesMonthsImport,
      politicalWillIndex: N,
      counterfactualShocks: { brentCrudeShockUsd: 0, fedTerminalRateShockBps: 0, chokepointTransitDropPct: 0, domesticFiscalSlippagePctGdp: 0 },
      croNotes: '',
      croApproverName: '',
      isOverridden: false,
    },
    supremeCouncil: {
      reportId: `SMCR-1.0-${iso3}-NOT-RUN`,
      schemaVersion: 'SMCR-1.0',
      generatedAt: now,
      decisionVerdict: 'HOLD_AND_MONITOR',
      compositeRiskScore: N,
      globalCoherenceScore: null,
      executiveSummary: M,
      decisionPointMatrix: [],
      policyResearcherReport: {
        structuralVulnerabilities: [],
        transmissionPathways: [],
        policyRecommendations: [
          { authority: 'Ministry of Finance / National Treasury', action: M, expectedImpact: M, priority: 'IMMEDIATE' },
          { authority: 'Central bank', action: M, expectedImpact: M, priority: 'IMMEDIATE' },
          { authority: 'Public debt management office', action: M, expectedImpact: M, priority: 'STRUCTURAL' },
        ],
        longTermRegimeOutlook: M,
      },
      marketTranslationLayer: {
        regimeStance: M,
        tradeExpressions: [trade('Rates idea', 'RATES'), trade('FX idea', 'FX'), trade('Commodity idea', 'COMMODITIES'), trade('Credit idea', 'SOVEREIGN_CREDIT')],
        riskGuardianCheck: {
          factorCrowdingWarning: M,
          liquidityHaircutPct: null,
          maxDrawdownEstimatePct: null,
          tailRiskHedgeInstrument: M,
          approvalStatus: null,
        },
      },
    },
    pipelineExecutionTelemetry: {
      pipelineRunId: `PIPE-${iso3}-NOT-RUN`,
      executedAt: now,
      totalLatencyMs: 0,
      overallReliabilityScorePct: N,
      activeProvider: 'Not run yet',
      searchGroundingSourcesCount: openData.liveApiSourcesActive.length,
      stages: PIPELINE_STAGES.map((st) => ({ ...st, status: 'AWAITING_GATE', latencyMs: 0, retriesUsed: 0, schemaVerified: false, diagnosticNote: 'Not run yet.' })),
    },
  };
}


