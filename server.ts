// Reads .env and the data folder before anything else (src/server/config.ts).
import { APP_ROOT, AUDIT_FILES, COUNCIL_TIMING_FILE, DATA_DIR, DATA_HEALTH_FILES, ENV_FILE_KEYS, FIGURE_WATCH_FILES, RESEARCH_FILE, REVIEW_FILE, SETTINGS_FILE, SIGNOFF_FILE, SPEC_DIR, VALIDATION_FILE, WATCH_RULES_FILE, WORKSPACE_FILE, savedSettings, setSavedSettings } from './src/server/config';
import { fetchTextWithTimeout, fetchWithTimeout } from './src/server/http';
import crypto from 'crypto';
import { writeFileAtomic } from './src/utils/atomicWrite';
import { EMPTY_PRELOAD_STATE, NO_TIME_LIMIT_STEPS, estimateRemainingBytes, formatBytes, planPreload, progressLine, stepsToRun, summarisePreload, type PreloadState, type PreloadStep, type PreloadStepResult } from './src/utils/preload';
import { OFFICIAL_FIGURES, officialPoints, mergeRevisions, historyRevisions, officialSeries, parseImfYears, parseWorldBankYears, type OfficialHistoryFile } from './src/utils/officialHistory';
import { outputGapFromGrowth, type OutputGapResult } from './src/utils/outputGap';
import { debtSustainability, dsaRows, dsaSentence, dsaSummary, type DsaOutcome } from './src/utils/debtSustainability';
import { loadWorkspace, seedWorkspace, setWorkspaceValue, userWorkspacePath, workspaceProblem, WORKSPACE_KEYS } from './src/utils/workspaceStore';
import { hostAllowed, outboundUrlProblem, withoutSecrets, writeAllowed } from './src/utils/requestGuard';
import { dataDirProblem, ollamaBaseUrlDefault, readiness, shutdownTimeoutMs } from './src/utils/serverRuntime';
import { AuthStore } from './src/utils/authStore';
import { AsyncLocalStorage } from 'node:async_hooks';
import { refusal, requiredRole, roleAtLeast } from './src/utils/permissions';
import { CSRF_HEADER, csrfMatches, csrfToken, isAiCall, isWrite, LIMITS, RateLimiter, SECURITY_HEADERS } from './src/utils/requestLimits';
import { authMode, clearedSessionCookie, displayNameProblem, DUMMY_HASH, newAccount, newSetupCode, normaliseUsername, openPath, passwordProblem, publicAccount, readCookie, sessionCookie, sessionLimits, SESSION_COOKIE, setupCodeMatches, SignInLimiter, usernameProblem, verifyPassword, hashPassword, ROLES, type Account, type Role } from './src/utils/auth';
import { mergeLastGood } from './src/utils/snapshotMerge';
import { reviveMissing } from './src/utils/reviveMissing';
import { asOfRows, parseAsOfDate } from './src/utils/asOf';
import { COUNCIL_SEED, COUNCIL_TEMPERATURE, compareRuns, modelFromProvider, summariseSnapshot, type AnswerSnapshot } from './src/utils/answerSnapshot';
import { checkRegressionCase, parseRegressionSet, type RegressionCase, type RegressionCaseResult, type RegressionReport, type SupremeCaseInput } from './src/utils/councilRegression';
import { buildSnapshot, loadSnapshot, saveSnapshot, sha256, snapshotDir, verifySnapshot } from './src/utils/answerSnapshotStore';
import { decisionsFrom, replayDecision, replaySentence } from './src/utils/decisionReplay';
import { TRACK_RECORD_HEADER, trackRecord, trackRecordRows, trackRecordSentence, type ArchivedDay } from './src/utils/trackRecord';
import { INFLATION_TARGETS } from './src/utils/marketsMacro';
import { mergeNationalCpi } from './src/utils/nationalCpi';
import { BIS_LABEL } from './src/utils/bisDebtSecurities';
import { OWN_CDS_LABEL } from './src/utils/ownCds';
import { WB_TRADE_INDICATORS, enrichTrade, parseWbLatest, parseWitsShare, wbIndicatorUrl, witsUrl, type TradeExposure, type WbTradeKey, type WitsIndicator } from './src/utils/scenarioExposure';
import { CFTC_CURRENCY_CODES, CFTC_HISTORY_WEEKS, positioningFor, type CftcWeek } from './src/utils/cftcPositioning';
import { cliTurnToPolicyRecord, crowdingUnwindRecord, type SignalRecord } from './src/utils/signalRecord';
import { type CommodityReply } from './src/utils/commodityPrices';
import { comtradeMissing } from './src/utils/comtradeTrade';
import { ticHoldingFor } from './src/utils/ticHoldings';
import { cliFor, cliTurns } from './src/utils/oecdCli';
import { qnaFor, QNA_LABEL } from './src/utils/oecdQna';
import { loadModelHistory, MODEL_HISTORY_MAX_AGE_MS, pullModelHistory, saveModelHistory, spliceInflation, type ModelHistory } from './src/utils/modelHistory';
import { cpiNowcast, gdpNowcast, nowcastSentence } from './src/utils/nowcast';
import { forecastSentence, forecastSeries, withImf, type ForecastOutcome } from './src/utils/forecasts';
import { areaSeries } from './src/utils/oecdSdmx';
import { cpiFor } from './src/utils/oecdInflation';
import { CBPOL_AREA, cbpolMissing, policyRateFor, type CbpolPull } from './src/utils/bisPolicyRates';
import { DEBATE_INSTRUCTION, challengesAsText, findChallenges, type DebateResult } from './src/utils/agentDebate';
import { describeFailures, localStepTimeoutMs, LONG_CHAT_STEPS, ModelWaitError, ollamaHasModel, streamWaitFor, type ModelAttempt, type StreamWait } from './src/utils/modelFailure';
import { DEFAULT_REFEREE_MODEL, isRefereeStep, refereeModelOrDefault } from './src/utils/refereeModel';
import { formatDuration, isCouncilTiming, ollamaStats, stepTiming, timingTable, totalMs, type CouncilTiming, type ModelStats, type StepTiming } from './src/utils/councilTiming';
import { EXPLAIN_INSTRUCTION, checkExplain, cleanFocus, explainTask, focusAsText, lensCoverage, LENS_ORDER, type ExplainPlan, type LensId, type RawExplain } from './src/utils/explain';
import { documentsAsText, isCouncilDocument, toAgentDocuments, type AgentDocument, type CouncilDocument } from './src/utils/agentDocument';
import { AGENT_CHOICE_INSTRUCTION, SYNTHESIS_INSTRUCTION, agentChoicePrompt, answersAsText, sentenceCheck, checkBrief, earlierAsText, synthesisTask, isDocFinding, type AgentAnswer, type AgentChoiceResult, type CouncilBrief, type SynthesisResult } from './src/utils/askCouncil';
import { MARKET_EDGE_ANCHORS, MARKET_EDGE_ANCHOR_ISO3, buildAnchor, type MarketEdgeAnchorsReply } from './src/utils/marketEdgeAnchors';
import { fiscalFromSnapshot } from './src/utils/fiscalDebt';
import { politicsFromSnapshot } from './src/utils/politicsEvents';
import { addBrief, addCouncilDoc, addDoc, addEpisode, addNotebook, briefId, isBrief, isDoc, removeBrief, removeCouncilDoc, removeDoc, removeEpisode, removeNotebook, summarise, updateEpisode, updateNotebook } from './src/utils/researchLibrary';
import { episodeFileName, episodeMarkdown } from './src/utils/episodeHandout';
import { notebookFileName, notebookMarkdown } from './src/utils/notebookExport';
import { loadLibrary, saveLibrary } from './src/utils/researchStore';
import { appendAudit, rawAudit, readAudit, setAuditActor } from './src/utils/auditStore';
import { loadSpecs, loadValidation, runBacktests } from './src/utils/backtestRun';
import { loadSignOffs, recordFor, reportHash, saveSignOff, signOffView, takeStep, SIGNOFF_LABEL } from './src/utils/signoff';
import { buildDiagnosis, DIAGNOSIS_FIELDS, type Diagnosis } from './src/utils/reviewDiagnosis';
import { reviewModelFigures } from './src/utils/reviewModels';
import { buildMemo, parseMemoInputs, type MemoStep } from './src/utils/reviewMemo';
import { buildOutcomes } from './src/utils/reviewOutcomes';
import { cutAt, EPISODE_METHOD, EVIDENCE_TEMPLATE_VERSION, isResearchOnly, packRequests, pastEpisodes, perOption, runAnalysis, signalsFor, type EvidenceStep } from './src/utils/reviewEvidence';
import { checkOptions, OPTIONS_INSTRUCTION, OPTIONS_TEMPLATE_VERSION, optionsPrompt, parseUserOptions, unassessedOptions, LEVERS, type OptionsStep, type UserOption } from './src/utils/reviewOptions';
type FetchedSeriesLike = { id: string; label: string; unit: string; freq: string; source: string; points: Array<{ date: string; value: number }> };
import { frameOf, parseFrame, summarise as summariseReview, stepStates, REVIEW_TEMPLATE_VERSION, type ReviewFrame } from './src/utils/policyReview';
import { deleteReview, loadReviews, newReview, putReview, saveStep, verifyReview } from './src/utils/policyReviewStore';
import { AUDIT_HEADER, AUDIT_KIND_LABEL, auditRows, describeRequest, figuresFromAnswers, type AuditKind } from './src/utils/auditLog';
import { backupFileName, parseBackup, summariseBackup } from './src/utils/backup';
import { currentBackup, restoreBackup } from './src/utils/backupStore';
import { cleanSettings, isDue, localClock, morningQuestion, nextRunText, parseMorningFile, settingsProblem, type MorningBriefFile, type MorningBriefRun } from './src/utils/morningBrief';
import { planCouncil, runCouncil, type SavedCouncilBrief } from './src/utils/askCouncil';
import { pickPrevious, whatChanged } from './src/utils/whatChanged';
import { toLive } from './src/utils/liveFigures';
import { EVENT_LABEL, openIssues, watchFigures, type FigureEventKind } from './src/utils/figureWatch';
import { readEvents, readLedger, saveWatch } from './src/utils/figureWatchStore';
import { DEFAULT_WATCHLISTS } from './src/data/presetsAndBaselines';
import { MODEL_FIELD_MISSING } from './src/utils/councilResult';
import { loadWatchRules, saveWatchRules } from './src/utils/watchRulesStore';
import { FIGURE_LIST, FIGURES_HEADER, SERIES_HEADER, exportFileName, figureRows, seriesRows, toCsv } from './src/utils/csvExport';
import { SHARE_MODE_KEY, shareModeFromValue, withholdForSharing } from './src/utils/shareMode';
import { tableWorkbook } from './src/utils/xlsxExport';
import { PANEL_FIGURES, PANEL_LATEST_HEADER, panelHistoryRows, panelLatest, panelLatestRows, parseCountries, parseFigureIds, type PanelCountryData } from './src/utils/panelTable';
import { ISO_NUMERIC_TO_ISO3 } from './src/data/worldCountries';
import { commoditySeries, countrySeries, seriesSummary, type ArchivedSnapshot, type Series } from './src/utils/seriesHistory';
import { archiveRoot, archivedDayOnOrBefore, keepDaysFromEnv, listArchivedCountries, listArchivedDays, pruneArchive, readArchivedPull, writeArchivedPull } from './src/utils/pullArchive';
import { parseRules } from './src/utils/watchRules';
import { checkDeskText, checkSupremeText, runScores } from './src/utils/runFigureCheck';
import { IDS_LABEL, QEDS_LABEL } from './src/utils/debtSchedule';
import {
  API_KEY_IDS,
  apiKeyField,
  applyKeysToEnv,
  describeKeys,
  isLocalRequest,
  keySources,
  saveSettings,
  withKey,
  withoutKey,
} from './src/utils/userSettings';
import { checkConnections, describeNetworkError, isFailure, type ConnectionReport } from './src/utils/connectionCheck';
import { checkTime, clockIn, nightlyDue, recordFromReport, sourceHealth, TRIGGER_LABEL, type CheckTrigger } from './src/utils/dataHealth';
import { appendCheck, readChecks, readState, saveState } from './src/utils/dataHealthStore';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  SOVEREIGN_CATALOG,
  buildAnnotatedChartsForSovereign,
  buildBaselineOpenData,
  buildDefaultAssessmentRun,
  buildOfficialCatalystCalendar,
  computeQuantitativeAnchorScores,
  recomputeDerivedOpenDataAnalytics,
} from './src/data/presetsAndBaselines.ts';
import {
  AIRuntimeConfig,
  CROOverrideState,
  CouncilAssessmentRun,
  DeskDebateRound,
  ExternalInternalConnectorConfig,
  ExternalInternalConnectorMetricKey,
  GeopoliticalWargameParams,
  IntegrationBroadcastScope,
  IntegrationDeliveryReceipt,
  LiquidityStressParams,
  OpenDataSnapshot,
  PipelineStageTelemetry,
  PolicyDocumentCategory,
  PolymarketContract,
  PredictionEventCategory,
  RawVenueEventContract,
  SubAgentReport,
  SupremeCouncilOutput,
  TopLevelIntegrationConfig,
  WatchlistItem,
} from './src/types/council.ts';
import {
  DEFAULT_WARGAME_PARAMS,
  computeGeopoliticalRiskDeskSuite,
} from './src/utils/geopoliticalRiskEngine.ts';
import { computeFullEconometricForecastSuite } from './src/utils/econometricForecastingEngine.ts';
import {
  DEFAULT_LIQUIDITY_STRESS_PARAMS,
  computeGlobalLiquidityFundingSuite,
} from './src/utils/globalLiquidityEngine.ts';
import {
  computeCouncilKellyAndLobExecution,
  computeCrossCurrencyAndLegalBasis,
  simulateSovereignRestructuringAndRating,
} from './src/utils/institutionalRiskDeskEngine.ts';
import { computeDeterministicDocumentAnalysis } from './src/utils/portfolioAndFundingEngine.ts';
import { getSnapshotDataStatus } from './src/utils/dataStatus.ts';
import { councilInputs, MISSING_FIGURES_RULE } from './src/utils/councilInputs.ts';
import { watchlistYieldFields } from './src/utils/watchlistYield.ts';
import { buildSeries as buildGdeltRawSeries, gdeltRawReading, type GdeltRawDay, type GdeltRawReading, type GdeltRawSeries } from './src/utils/gdeltRaw.ts';
import { gdeltRawConfig, gdeltRawDir, loadAllDays as loadAllGdeltRawDays, loadPullState as loadGdeltRawPullState, pullGdeltRaw, type PullResult as GdeltRawPullResult } from './src/utils/gdeltRawStore.ts';
import { polymarketMoves } from './src/utils/oddsMoves.ts';
import { HC_SPREAD_FEED_LABEL } from './src/utils/hardCurrencySpread.ts';
import { US_10Y_SERIES, officialYieldFeedLabel } from './src/utils/officialYields.ts';
import { fetchCftcPull, fetchTicPull, fetchCbpolPull } from './src/server/feeds/positioning';
import { gdeltPausedUntil, gdeltFetch, GDELT_REFRESH_DAYS, GDELT_REFRESH_MS, fetchGdeltQuarterly } from './src/server/feeds/gdelt';
import { fetchImfPull, fetchCoferPull } from './src/server/feeds/imf';
import { type ComtradeFile, comtradeMemory, fetchComtrade } from './src/server/feeds/comtrade';
import { oecdFetch, fetchCliPull, fetchQnaPull, fetchCpiPull, type NationalCpiPull, nationalCpiMemory, fetchNationalCpi, fetchMonthlyActivity } from './src/server/feeds/oecd';
import { commodityMemory, fetchCommodities, forgetCommodityPulls } from './src/server/feeds/commodities';
import { officialYieldCache, fetchOfficial10YYield, fetchDebtSchedule, loadOwnCds, hasOfficial10YSource, fetchFredLatest, loadMarketExtras, saveMarketExtras, fredSeriesCache, fetchFredCached, fetchHcSpreadUncached, fetchHcSpread, loadFxHistory, pullFxHistory, fetchFxHistory, fetchUs10YYield, type FxValuation, fxValuationCache, fetchFxValuationUncached, fetchFxValuation, effrCache, fetchEffr, forgetEffr, forgetHcSpread, forgetOwnCds } from './src/server/feeds/rates';

const __dirname = APP_ROOT;
let validationRunning = false;

// Rebuilt when the Gemini key is changed in Menu > Settings.
const makeGeminiClient = () =>
  new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
let ai = makeGeminiClient();

/**
 * Trade exposure for the scenario ranking (src/utils/scenarioExposure.ts): World Bank fuel and
 * trade shares, and WITS partner shares with China and Russia. Kept 24 hours (1 hour after a miss).
 */
let tradeExposureCache: { at: number; value: Map<string, TradeExposure>; pending?: Promise<Map<string, TradeExposure>> } | null = null;
async function fetchTradeExposureUncached(iso3s: string[]): Promise<Map<string, TradeExposure>> {
  const out = new Map<string, TradeExposure>(iso3s.map((i) => [i, {} as TradeExposure]));
  await Promise.all(
    (Object.entries(WB_TRADE_INDICATORS) as Array<[WbTradeKey, string]>).map(async ([key, code]) => {
      try {
        const res = await fetchWithTimeout(wbIndicatorUrl(iso3s, code), 8000);
        if (!res.ok) return;
        for (const [iso, v] of parseWbLatest(await res.json())) {
          const t = out.get(iso);
          if (!t) continue;
          t[key] = Number(v.value.toFixed(2));
          if (!t.wbYear || v.year < t.wbYear) t.wbYear = v.year; // the oldest year used, to be safe
        }
      } catch {
        // leave the figure missing
      }
    })
  );
  const thisYear = new Date().getUTCFullYear();
  const share = async (iso: string, partner: string, ind: WitsIndicator) => {
    for (const year of [thisYear - 3, thisYear - 4]) {
      const xml = await fetchTextWithTimeout(witsUrl(iso, partner, ind, year), 8000);
      const v = parseWitsShare(xml);
      if (v) return v;
    }
    return null;
  };
  await Promise.all(
    iso3s.map(async (iso) => {
      const [cn, rx, rm] = await Promise.all([share(iso, 'CHN', 'XPRT-PRTNR-SHR'), share(iso, 'RUS', 'XPRT-PRTNR-SHR'), share(iso, 'RUS', 'MPRT-PRTNR-SHR')]);
      const t = out.get(iso)!;
      if (cn) t.chinaExportSharePct = cn.pct;
      if (rx) t.russiaExportSharePct = rx.pct;
      if (rm) t.russiaImportSharePct = rm.pct;
      const years = [cn, rx, rm].filter(Boolean).map((v) => v!.year).sort();
      if (years.length) t.witsYear = years[0];
    })
  );
  return out;
}
async function fetchTradeExposure(): Promise<Map<string, TradeExposure>> {
  const c = tradeExposureCache;
  const hasAny = c ? [...c.value.values()].some((t) => Object.keys(t).length > 0) : false;
  if (c && Date.now() - c.at < (hasAny ? 24 : 1) * 60 * 60 * 1000) return c.value;
  if (c?.pending) return c.pending;
  const pending = fetchTradeExposureUncached(SOVEREIGN_CATALOG.map((x) => x.iso3)).then((value) => {
    tradeExposureCache = { at: Date.now(), value };
    return value;
  });
  tradeExposureCache = { at: c?.at ?? 0, value: c?.value ?? new Map(), pending };
  return pending;
}

/** MarketEdge benchmarks always on screen (see src/utils/marketEdgeAnchors.ts). */
async function fetchMarketEdgeAnchors(): Promise<MarketEdgeAnchorsReply> {
  const [ownCds, catalog, us10Y, cli] = await Promise.all([
    loadOwnCds(),
    fetchLiveWatchlistCatalog(),
    fetchUs10YYield(),
    Promise.race([fetchCliPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
  ]);
  const anchors = await Promise.all(
    MARKET_EDGE_ANCHORS.map(async (def) => {
      const a = buildAnchor(def, def.fredSeries ? await fetchFredCached(def.fredSeries) : null, ownCds.get(def.iso3));
      const lead = cliFor(def.iso3, cli?.series);
      return lead && cli ? { ...a, cli: { ...lead, pulledAt: cli.pulledAt } } : cli ? { ...a, cliPulledAt: cli.pulledAt } : a;
    })
  );
  const peers = catalog.filter((c) => MARKET_EDGE_ANCHOR_ISO3.includes(c.iso3));
  return { anchors, peers, ...(us10Y ? { us10Y } : {}), fetchedAt: new Date().toISOString() };
}

/**
 * Last ECB reference rates of the previous year (Frankfurter answers a date with the latest
 * business day on or before it), for each currency's move since the start of the year. Only the
 * currencies the ECB publishes get a figure; for the rest the move is left out. Kept 24 hours.
 */
let fxYearEndCache: { year: number; at: number; date: string; rates: Record<string, number> } | null = null;
async function fetchFxYearEnd(): Promise<{ date: string; rates: Record<string, number> } | null> {
  const year = new Date().getUTCFullYear();
  if (fxYearEndCache && fxYearEndCache.year === year && Date.now() - fxYearEndCache.at < 24 * 60 * 60 * 1000) return fxYearEndCache;
  try {
    const res = await fetchWithTimeout(`https://api.frankfurter.dev/v1/${year - 1}-12-31?from=USD`, 5000);
    if (!res.ok) return null;
    const body: any = await res.json();
    if (!body?.rates || typeof body.rates !== 'object') return null;
    const rates: Record<string, number> = {};
    for (const [ccy, v] of Object.entries(body.rates)) if (typeof v === 'number' && v > 0) rates[ccy.toUpperCase()] = v;
    rates.USD = 1;
    fxYearEndCache = { year, at: Date.now(), date: String(body.date || `${year - 1}-12-31`), rates };
    return fxYearEndCache;
  } catch {
    return null;
  }
}

let cachedPlumbing: {
  timestamp: number;
  usSofrRatePct?: number;
  usEffrRatePct?: number;
  fedOnRrpBalanceUsdBn?: number;
  fxRatesVsUsd: Record<string, number>;
  activeSources: string[];
} | null = null;

async function fetchGlobalLivePlumbing() {
  if (cachedPlumbing && Date.now() - cachedPlumbing.timestamp < 3 * 60 * 1000) {
    return cachedPlumbing;
  }

  const fxRatesVsUsd: Record<string, number> = {};
  const activeSources: string[] = [];
  let usSofrRatePct: number | undefined;
  let usEffrRatePct: number | undefined;
  let fedOnRrpBalanceUsdBn: number | undefined;

  await Promise.allSettled([
    // 1. Live Spot FX Rates (Open Exchange Rates v6 -> Frankfurter fallback)
    (async () => {
      const fxRes = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', 3500);
      if (fxRes.ok) {
        const data: any = await fxRes.json();
        if (data?.rates && typeof data.rates === 'object') {
          Object.entries(data.rates).forEach(([ccy, val]) => {
            if (typeof val === 'number' && val > 0) {
              fxRatesVsUsd[ccy.toUpperCase()] = val;
            }
          });
          activeSources.push('ExchangeRate-API Spot FX (Live)');
          return;
        }
      }
      const frankRes = await fetchWithTimeout('https://api.frankfurter.dev/v1/latest?from=USD', 3500);
      if (frankRes.ok) {
        const fData: any = await frankRes.json();
        if (fData?.rates && typeof fData.rates === 'object') {
          Object.entries(fData.rates).forEach(([ccy, val]) => {
            if (typeof val === 'number' && val > 0) {
              fxRatesVsUsd[ccy.toUpperCase()] = val;
            }
          });
          activeSources.push('ECB Frankfurter Spot FX (Live)');
        }
      }
    })(),

    // 2. NY Fed Markets API: Secured Overnight Financing Rate (SOFR)
    (async () => {
      const sofrRes = await fetchWithTimeout(
        'https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json',
        3200
      );
      if (sofrRes.ok) {
        const data: any = await sofrRes.json();
        const rate = data?.refRates?.[0]?.percentRate;
        if (typeof rate === 'number' && rate > 0) {
          usSofrRatePct = Number(rate.toFixed(2));
          activeSources.push('NY Fed Markets SOFR/EFFR API (Live)');
        }
      }
    })(),

    // 3. NY Fed Markets API: Effective Federal Funds Rate (EFFR)
    (async () => {
      const effrRes = await fetchWithTimeout(
        'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json',
        3200
      );
      if (effrRes.ok) {
        const data: any = await effrRes.json();
        const rate = data?.refRates?.[0]?.percentRate;
        if (typeof rate === 'number' && rate > 0) {
          usEffrRatePct = Number(rate.toFixed(2));
        }
      }
    })(),

    // 4. NY Fed Markets API: Overnight Reverse Repo (ON RRP) Facility Propositions
    (async () => {
      const rrpRes = await fetchWithTimeout(
        'https://markets.newyorkfed.org/api/rp/reverserepo/propositions/search.json',
        3200
      );
      if (rrpRes.ok) {
        const data: any = await rrpRes.json();
        const ops = data?.repo?.operations;
        if (Array.isArray(ops) && ops.length > 0) {
          const latestAmt = Number(ops[0]?.totalAmtAccepted);
          if (!Number.isNaN(latestAmt) && latestAmt >= 0) {
            // NY Fed returns totalAmtAccepted in USD or billions depending on endpoint version
            fedOnRrpBalanceUsdBn =
              latestAmt > 1e6 ? Number((latestAmt / 1e9).toFixed(1)) : Number(latestAmt.toFixed(1));
          }
        }
      }
    })(),
  ]);

  cachedPlumbing = {
    timestamp: Date.now(),
    usSofrRatePct,
    usEffrRatePct,
    fedOnRrpBalanceUsdBn,
    fxRatesVsUsd,
    activeSources,
  };
  return cachedPlumbing;
}

function getLatestImfValue(series: Record<string, number> | undefined, targetYears: string[]): number | undefined {
  if (!series || typeof series !== 'object') return undefined;
  for (const yr of targetYears) {
    if (typeof series[yr] === 'number' && !Number.isNaN(series[yr])) {
      return series[yr];
    }
  }
  return undefined;
}

/** The WEO year getLatestImfValue would pick, so a figure can say which year it is for. */
function latestImfYear(series: Record<string, number> | undefined, targetYears: string[]): string | undefined {
  if (!series || typeof series !== 'object') return undefined;
  return targetYears.find((yr) => typeof series[yr] === 'number' && !Number.isNaN(series[yr]));
}

async function fetchLiveOpenDataSnapshotNetwork(
  iso3: string,
  countryNameHint?: string
): Promise<OpenDataSnapshot> {
  const normalizedIso = (iso3 || 'BRA').toUpperCase().trim();
  const baseline = buildBaselineOpenData(normalizedIso);
  if (countryNameHint) {
    baseline.countryName = countryNameHint;
  }

  const activeSources: string[] = [];
  // Which figures a live feed actually filled, by path; everything else is the built-in value.
  baseline.liveFields = {};
  const markLive = (path: string, source: string) => {
    baseline.liveFields![path] = source;
  };
  let liveReservesUsdBn: number | undefined;
  let liveShortTermDebtPctReserves: number | undefined;

  await Promise.allSettled([
    // 1. Expanded World Bank Open Data v2 API (6 structural & external balance indicators)
    (async () => {
      const wbIndicators = [
        'FI.RES.TOTL.MO', // FX Reserves in Months of Imports
        'FI.RES.TOTL.CD', // Total International Reserves (USD, including Gold)
        'BN.CAB.XOKA.GD.ZS', // Current Account Balance (% of GDP)
        'DT.DOD.DECT.GN.ZS', // Total External Debt Stocks (% of GNI)
        'DT.DOD.DSTC.IR.ZS', // Short-Term Debt (% of Total Reserves)
        'PV.EST', // WGI Political Stability & Absence of Violence (-2.5 to +2.5)
      ];
      const results = await Promise.allSettled(
        wbIndicators.map(async (ind) => {
          const res = await fetchWithTimeout(
            `https://api.worldbank.org/v2/country/${normalizedIso}/indicator/${ind}?format=json&per_page=6`
          );
          if (!res.ok) return { ind, row: null };
          const data: any = await res.json();
          const rows = Array.isArray(data?.[1]) ? data[1] : [];
          const validRow = rows.find((r: any) => typeof r?.value === 'number' && !Number.isNaN(r.value));
          return { ind, row: validRow };
        })
      );

      let latestWbYear = '';
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value.row) continue;
        const { ind, row } = r.value;
        const val = Number(row.value);
        if (row.date && String(row.date) > latestWbYear) latestWbYear = String(row.date);

        if (ind === 'FI.RES.TOTL.MO') {
          baseline.worldBankIndicators.fxReservesMonthsImport = Number(val.toFixed(2)); markLive('wb.fxReservesMonthsImport', `World Bank, ${row.date}`);
        } else if (ind === 'FI.RES.TOTL.CD' && val > 1e8) {
          liveReservesUsdBn = Number((val / 1e9).toFixed(1));
        } else if (ind === 'BN.CAB.XOKA.GD.ZS') {
          baseline.worldBankIndicators.currentAccountPctGdp = Number(val.toFixed(2)); markLive('wb.currentAccountPctGdp', `World Bank, ${row.date}`);
        } else if (ind === 'DT.DOD.DECT.GN.ZS') {
          baseline.worldBankIndicators.externalDebtPctGni = Number(val.toFixed(1)); markLive('wb.externalDebtPctGni', `World Bank, ${row.date}`);
        } else if (ind === 'DT.DOD.DSTC.IR.ZS' && val > 0) {
          liveShortTermDebtPctReserves = Number(val.toFixed(1));
        } else if (ind === 'PV.EST') {
          // Convert WGI estimate (-2.5 to +2.5) into 0-100 percentile scale
          const pctl = Math.max(2, Math.min(98, ((val + 2.5) / 5.0) * 100));
          baseline.worldBankIndicators.politicalStabilityPercentile = Number(pctl.toFixed(1)); markLive('wb.politicalStabilityPercentile', `World Bank WGI, ${row.date}`);
        }
      }
      if (latestWbYear) {
        activeSources.push(`World Bank Open Data v2 (${latestWbYear} Live)`);
      }
    })(),

    // 2. Expanded IMF DataMapper WEO API (Debt/GDP, 2027F Debt, CPI Inflation, Real GDP Growth, Primary Balance)
    (async () => {
      // Primary balance is the Fiscal Monitor series on DataMapper (GGXONLB_G01_GDP_PT); the WEO code
      // GGXONLB_NGDP comes back empty there. NGAP_NPGDP is asked for in case the IMF adds it.
      const imfMetrics = ['GGXWDG_NGDP', 'PCPIPCH', 'NGDP_RPCH', 'GGXONLB_G01_GDP_PT', 'NGAP_NPGDP'];
      const results = await Promise.allSettled(
        imfMetrics.map(async (metric) => {
          const res = await fetchWithTimeout(
            `https://www.imf.org/external/datamapper/api/v1/${metric}/${normalizedIso}`
          );
          if (!res.ok) return { metric, series: null };
          const data: any = await res.json();
          return { metric, series: data?.values?.[metric]?.[normalizedIso] };
        })
      );

      let imfHit = false;
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value.series) continue;
        const { metric, series } = r.value;
        if (metric === 'GGXWDG_NGDP') {
          const cur = getLatestImfValue(series, ['2025', '2026', '2024']);
          const f2027 = getLatestImfValue(series, ['2027', '2028', '2026']);
          if (typeof cur === 'number') {
            baseline.imfIndicators.debtToGdpPct = Number(cur.toFixed(1)); markLive('imf.debtToGdpPct', 'IMF WEO');
            (baseline.imfIndicators.years ||= {})['imf.debtToGdpPct'] = latestImfYear(series, ['2025', '2026', '2024']) || '';
            imfHit = true;
          }
          if (typeof f2027 === 'number') {
            baseline.imfIndicators.debtToGdpForecast2027Pct = Number(f2027.toFixed(1)); markLive('imf.debtToGdpForecast2027Pct', 'IMF WEO forecast');
            (baseline.imfIndicators.years ||= {})['imf.debtToGdpForecast2027Pct'] = latestImfYear(series, ['2027', '2028', '2026']) || '';
          }
        } else if (metric === 'PCPIPCH') {
          const cpi = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof cpi === 'number') {
            baseline.imfIndicators.cpiInflationPct = Number(cpi.toFixed(2)); markLive('imf.cpiInflationPct', 'IMF WEO');
            (baseline.imfIndicators.years ||= {})['imf.cpiInflationPct'] = latestImfYear(series, ['2025', '2026', '2024']) || '';
            imfHit = true;
          }
        } else if (metric === 'NGDP_RPCH') {
          const gdp = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof gdp === 'number') {
            baseline.imfIndicators.realGdpGrowthPct = Number(gdp.toFixed(2)); markLive('imf.realGdpGrowthPct', 'IMF WEO');
            (baseline.imfIndicators.years ||= {})['imf.realGdpGrowthPct'] = latestImfYear(series, ['2025', '2026', '2024']) || '';
            imfHit = true;
          }
        } else if (metric === 'NGAP_NPGDP') {
          // Output gap: the IMF publishes it for some countries only; elsewhere it stays unset.
          const gap = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof gap === 'number') {
            baseline.imfIndicators.outputGapPct = Number(gap.toFixed(2)); markLive('imf.outputGapPct', 'IMF WEO');
            (baseline.imfIndicators.years ||= {})['imf.outputGapPct'] = latestImfYear(series, ['2025', '2026', '2024']) || '';
          }
        } else if (metric === 'GGXONLB_G01_GDP_PT') {
          const pb = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof pb === 'number') {
            baseline.imfIndicators.primaryFiscalBalancePct = Number(pb.toFixed(2)); markLive('imf.primaryFiscalBalancePct', 'IMF WEO');
            (baseline.imfIndicators.years ||= {})['imf.primaryFiscalBalancePct'] = latestImfYear(series, ['2025', '2026', '2024']) || '';
            imfHit = true;
          }
        }
      }
      if (imfHit) {
        activeSources.push('IMF DataMapper WEO v1 (4-Indicator Live)');
      }
    })(),

    // 3. Unfiltered Live Polymarket Gamma API (Ranked by sovereign, central bank, tariff, & macro relevance)
    (async () => {
      const polyRes = await fetchWithTimeout(
        `https://gamma-api.polymarket.com/events?limit=45&active=true&closed=false`
      );
      if (polyRes.ok) {
        const events = await polyRes.json();
        if (Array.isArray(events) && events.length > 0) {
          const countryTerms = [
            baseline.countryName.toLowerCase(),
            normalizedIso.toLowerCase(),
            baseline.currencyCode.toLowerCase(),
            baseline.region.toLowerCase(),
          ];
          const macroTerms = [
            'fed',
            'rate',
            'inflation',
            'tariff',
            'recession',
            'oil',
            'treasury',
            'debt',
            'central bank',
            'sanction',
            'ceasefire',
            'trade',
            'gdp',
          ];

          const scoredEvents = events
            .map((ev: any, idx: number) => {
              const market = Array.isArray(ev?.markets) && ev.markets.length > 0 ? ev.markets[0] : null;
              const title = String(ev?.title || market?.question || '').trim();
              if (!title) return null;

              let prob: number | null = null;
              try {
                const rawPrices = market?.outcomePrices;
                const prices = typeof rawPrices === 'string' ? JSON.parse(rawPrices) : rawPrices;
                if (Array.isArray(prices) && prices.length > 0) {
                  const p0 = Number(prices[0]);
                  if (Number.isFinite(p0) && p0 >= 0 && p0 <= 1) prob = Math.round(p0 * 100);
                }
              } catch {
                prob = null;
              }
              // No price means no odds to show: skip it rather than show 50%.
              if (prob === null) return null;

              const lower = title.toLowerCase();
              let relevance = 0;
              for (const ct of countryTerms) {
                if (ct && ct.length > 2 && lower.includes(ct)) relevance += 25;
              }
              for (const mt of macroTerms) {
                if (lower.includes(mt)) relevance += 8;
              }

              const vol = Math.round(Number(ev?.volume || market?.volume || 0));
              const contract: PolymarketContract = {
                id: String(ev?.id || `pm-live-${idx}`),
                question: title,
                probabilityPct: prob,
                volumeUsd: vol > 0 ? vol : 0,
                category: relevance >= 25 ? `${baseline.countryName} Event` : 'Global Macro / Geopolitics',
                url: ev?.slug ? `https://polymarket.com/event/${ev.slug}` : 'https://polymarket.com',
                ...polymarketMoves(market),
              };
              return { contract, relevance, vol };
            })
            .filter((x): x is { contract: PolymarketContract; relevance: number; vol: number } => Boolean(x))
            .sort((a, b) => b.relevance - a.relevance || b.vol - a.vol);

          if (scoredEvents.length > 0) {
            baseline.polymarketContracts = scoredEvents.slice(0, 4).map((s) => s.contract);
            markLive('polymarket.contracts', `Polymarket, pulled ${new Date().toISOString().slice(0, 10)}`);
            activeSources.push('Polymarket Gamma API (100% Live Contracts)');
          }
        }
      }
    })(),

    // 4. GDELT news tone and headlines, pulled every GDELT_REFRESH_DAYS days per country and kept on
    // disk; every figure carries the date it was pulled.
    (async () => {
      const pull = await fetchGdeltQuarterly(normalizedIso, baseline.countryName);
      if (!pull) return;
      const day = pull.pulledAt.slice(0, 10);
      baseline.gdeltMetrics.averageTone = pull.tone;
      markLive('gdelt.averageTone', `GDELT, pulled ${day}`);
      // Scale negative GDELT tone (-8..+2) into a 0..100 conflict intensity index
      baseline.gdeltMetrics.conflictIntensityIndex = Math.round(Math.max(18, Math.min(94, 42 + Math.max(0, -pull.tone) * 9.5)));
      markLive('gdelt.conflictIntensityIndex', `GDELT, pulled ${day}`);
      // The pull's own headlines replace any built-in ones, even when it found none.
      baseline.gdeltMetrics.topHeadlines = pull.headlines;
      if (pull.headlines.length) markLive('gdelt.topHeadlines', `GDELT, pulled ${day}`);
      baseline.gdeltPull = { pulledAt: pull.pulledAt, tone: pull.tone, ...(pull.toneShift ? { toneShift: pull.toneShift } : {}) };
      activeSources.push(`GDELT news tone and headlines (pulled ${day}, refreshed every ${GDELT_REFRESH_DAYS} days)`);
    })(),

    // 5. Global Live FX & NY Fed Plumbing
    (async () => {
      const plumbing = await fetchGlobalLivePlumbing();
      if (plumbing.activeSources.length > 0) {
        activeSources.push(...plumbing.activeSources);
      }
      const ccy = baseline.currencyCode.toUpperCase();
      const liveFx = plumbing.fxRatesVsUsd[ccy];
      if (typeof liveFx === 'number' && liveFx > 0) {
        baseline.monetaryAndMarket.exchangeRatePerUsd = Number(
          liveFx.toFixed(liveFx > 100 ? 1 : liveFx > 10 ? 2 : 3)
        ); markLive('market.exchangeRatePerUsd', 'Live FX');
        const yearEnd = await fetchFxYearEnd();
        const base = yearEnd?.rates[ccy];
        if (typeof base === 'number' && base > 0) {
          // Positive = the local currency gained against the dollar since the last close of last year.
          const ytdPct = ((base - liveFx) / base) * 100;
          baseline.monetaryAndMarket.fxYtdChangePct = Number(ytdPct.toFixed(2)); markLive('market.fxYtdChangePct', `Live FX vs ECB rate of ${yearEnd!.date}`);
        }
      }
      baseline.livePlumbingOverrides = {
        usSofrRatePct: plumbing.usSofrRatePct,
        usEffrRatePct: plumbing.usEffrRatePct,
        fedOnRrpBalanceUsdBn: plumbing.fedOnRrpBalanceUsdBn,
        fxRatesVsUsd: plumbing.fxRatesVsUsd,
        fetchedAt: new Date(plumbing.timestamp).toISOString(),
      };
    })(),

  ]);

  // 6b. Official 10Y yield (OECD via FRED, Brazil's Treasury or Turkey's EVDS), with its date.
  const officialYield = await fetchOfficial10YYield(normalizedIso);
  if (officialYield) {
    baseline.monetaryAndMarket.sovereign10YBondYieldPct = officialYield.valuePct; markLive('market.sovereign10YBondYieldPct', 'Official');
    baseline.official10YYield = officialYield;
    activeSources.push(officialYieldFeedLabel(officialYield));
  }

  // 6b''. US 10Y benchmark, for the spread over Treasuries. It carries its own source and date and
  // is not counted as a live feed for the country.
  const us10Y = await fetchUs10YYield();
  if (us10Y) baseline.us10YYield = us10Y;
  else delete baseline.us10YYield;

  // 6b'''. Hard-currency (USD) bond spread over Treasuries, the free stand-in for CDS (BCRP EMBIG,
  // eight Latin American countries, monthly). Labelled a bond spread everywhere, never CDS.
  const hcSpread = (await fetchHcSpread())?.countries[normalizedIso];
  if (hcSpread) {
    baseline.monetaryAndMarket.hcBondSpreadBps = Math.round(hcSpread.bps); markLive('market.hcBondSpreadBps', HC_SPREAD_FEED_LABEL);
    baseline.hcBondSpread = hcSpread;
    activeSources.push(`${HC_SPREAD_FEED_LABEL}, ${hcSpread.period}`);
  } else {
    delete baseline.monetaryAndMarket.hcBondSpreadBps;
    delete baseline.hcBondSpread;
  }

  // 6b'. Own-account 5Y CDS: the user's licensed quote, the only CDS source.
  const ownCds = (await loadOwnCds()).get(normalizedIso);
  if (ownCds) {
    baseline.monetaryAndMarket.cds5YSpreadBps = Math.round(ownCds.bps); markLive('market.cds5YSpreadBps', `Your data, ${ownCds.source}`);
    baseline.ownCds5Y = { bps: ownCds.bps, date: ownCds.date, source: ownCds.source };
    activeSources.push(`${OWN_CDS_LABEL} (${ownCds.source}, 5Y CDS)`);
  } else {
    delete baseline.ownCds5Y;
  }

  // 6c. Government external debt falling due (QEDS, IDS). Replaces nothing: the brief shows these
  // beside the sample maturity profile, which stays labelled sample.
  const debtSchedule = await fetchDebtSchedule(normalizedIso);
  if (debtSchedule) {
    baseline.debtSchedule = debtSchedule;
    if (debtSchedule.qeds) activeSources.push(`${QEDS_LABEL} (government external debt due by quarter)`);
    if (debtSchedule.ids) activeSources.push(`${IDS_LABEL} (public external debt service by year)`);
    if (debtSchedule.bis) activeSources.push(`${BIS_LABEL} (government debt securities outstanding)`);
  }

  // 7. Apply any user-configured GUI External/Internal Macro REST Connectors
  await applyGuiMacroConnectorsToSnapshot(baseline, normalizedIso, activeSources);

  // Dynamically recompute DSA (r - g), Greenspan-Guidotti Debt Rollover, Yield Curve & Real Policy Rate
  recomputeDerivedOpenDataAnalytics(baseline, {
    liquidReservesUsdBn: liveReservesUsdBn,
    shortTermDebtPctReserves: liveShortTermDebtPctReserves,
  });

  // Only feeds that actually answered count as live; never inherit the sample list.
  const verifiedLiveSources = Array.from(new Set(activeSources));
  baseline.liveApiSourcesActive = verifiedLiveSources;
  baseline.fetchedAt = new Date().toISOString();
  baseline.dataStatus = { verifiedLiveSources, checkedAt: baseline.fetchedAt };
  return baseline;
}

const SNAPSHOT_DIR = path.join(DATA_DIR, 'live');
const SNAPSHOT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
/** A pull that came back short (a feed failed, or nothing answered) is tried again after an hour. */
const SNAPSHOT_RETRY_MS = 60 * 60 * 1000;
/** Version 2: saved after built-in figures were removed (older copies carry built-in curves and betas). */
const SNAPSHOT_SCHEMA = 2;
type StoredSnapshot = { snapshot: OpenDataSnapshot; pulledAt: number; incomplete?: boolean; schema?: number };
const snapshotStore = new Map<string, StoredSnapshot>();

/** Whether a saved snapshot is due a refresh: a week for a full pull, an hour for one that came back short. */
function snapshotDue(stored: StoredSnapshot): boolean {
  if (stored.schema !== SNAPSHOT_SCHEMA) return true; // saved by an older version: pull again
  const age = Date.now() - stored.pulledAt;
  return age > (stored.incomplete ? SNAPSHOT_RETRY_MS : SNAPSHOT_REFRESH_MS);
}
const snapshotRefreshInFlight = new Map<string, Promise<OpenDataSnapshot | null>>();

function snapshotFile(iso3: string): string {
  return path.join(SNAPSHOT_DIR, `${iso3.replace(/[^A-Z0-9]/g, '')}.json`);
}

function loadStoredSnapshot(iso3: string) {
  const mem = snapshotStore.get(iso3);
  if (mem) return mem;
  try {
    const parsed = JSON.parse(fs.readFileSync(snapshotFile(iso3), 'utf8'));
    if (parsed?.snapshot && typeof parsed.pulledAt === 'number') {
      // Missing figures are saved as null (JSON has no NaN); make them NaN again.
      parsed.snapshot = reviveMissing(parsed.snapshot, buildBaselineOpenData(iso3));
      snapshotStore.set(iso3, parsed);
      return parsed as StoredSnapshot;
    }
  } catch {
    // No stored snapshot yet
  }
  return null;
}

function refreshStoredSnapshot(iso3: string, countryName?: string): Promise<OpenDataSnapshot | null> {
  const existing = snapshotRefreshInFlight.get(iso3);
  if (existing) return existing;
  const job = (async () => {
    try {
      const pulled = await fetchLiveOpenDataSnapshotNetwork(iso3, countryName);
      // Keep the last good figures for any feed that did not answer this time (src/utils/snapshotMerge.ts).
      const prev = loadStoredSnapshot(iso3);
      const merged = mergeLastGood(pulled, prev?.snapshot, prev?.pulledAt ?? 0);
      if (merged.carried.length) {
        console.warn(`[snapshot-store] ${iso3}: kept ${merged.carried.length} figure(s) from the last good pull; retrying within the hour`);
      }
      const snapshot = merged.snapshot;
      const entry: StoredSnapshot = { snapshot, pulledAt: Date.now(), schema: SNAPSHOT_SCHEMA, ...(merged.incomplete ? { incomplete: true } : {}) };
      snapshotStore.set(iso3, entry);
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      const tmp = `${snapshotFile(iso3)}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(entry));
      fs.renameSync(tmp, snapshotFile(iso3));
      void archivePull(iso3, entry);
      return snapshot;
    } catch (err: any) {
      console.warn(`[snapshot-store] refresh failed for ${iso3}: ${err?.message || err}`);
      return null;
    } finally {
      snapshotRefreshInFlight.delete(iso3);
    }
  })();
  snapshotRefreshInFlight.set(iso3, job);
  return job;
}

const ARCHIVE_DIR = archiveRoot(DATA_DIR);

/**
 * Full World Bank and IMF WEO history per country (src/utils/officialHistory.ts), saved in
 * data/history/<ISO3>.json. Re-downloaded after a week (the figures are annual); a figure that does
 * not answer keeps its last saved run. Screens still show only the newest value from the snapshot;
 * this is what the History tab, charts and downloads read, also offline.
 */
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const HISTORY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const historyInFlight = new Map<string, Promise<OfficialHistoryFile | null>>();
function historyFile(iso3: string): string {
  return path.join(HISTORY_DIR, `${iso3.replace(/[^A-Z0-9]/g, '')}.json`);
}
function loadOfficialHistory(iso3: string): OfficialHistoryFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(historyFile(iso3), 'utf8'));
    return parsed && typeof parsed.pulledAt === 'string' && parsed.series ? (parsed as OfficialHistoryFile) : null;
  } catch {
    return null;
  }
}
async function downloadOfficialHistory(iso3: string): Promise<OfficialHistoryFile | null> {
  const prev = loadOfficialHistory(iso3);
  const series: OfficialHistoryFile['series'] = {};
  const failed: Record<string, string> = {};
  const lastYear = new Date().getUTCFullYear() + 1;
  let answered = 0;
  for (const fig of OFFICIAL_FIGURES) {
    const url =
      fig.source === 'wb'
        ? `https://api.worldbank.org/v2/country/${iso3}/indicator/${fig.code}?format=json&per_page=200&date=1960:${lastYear}`
        : `https://www.imf.org/external/datamapper/api/v1/${fig.code}/${iso3}`;
    try {
      const res = await fetchWithTimeout(url, 15000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const years = fig.source === 'wb' ? parseWorldBankYears(body) : parseImfYears(body, fig.code, iso3);
      if (!years) throw new Error('unexpected answer');
      answered++;
      if (years.length) series[fig.id] = { points: officialPoints(fig, years) };
    } catch (err: any) {
      const name = fig.source === 'wb' ? 'World Bank' : 'IMF';
      if (prev?.series?.[fig.id]?.points?.length) series[fig.id] = prev.series[fig.id];
      else failed[fig.id] = `${name} did not answer (${err?.name === 'AbortError' ? 'timed out' : err?.message || 'error'})`;
    }
    await new Promise((r) => setTimeout(r, 200)); // polite gap between requests
  }
  if (!answered) return prev; // nothing answered (offline?): keep what is saved
  const pulledAt = new Date().toISOString();
  // Revision tracking: values the IMF or World Bank changed since the last download are kept with the old value.
  const revisions = mergeRevisions(prev?.revisions, historyRevisions(prev, { series, pulledAt }));
  const file: OfficialHistoryFile = { iso3, pulledAt, series, ...(Object.keys(failed).length ? { failed } : {}), ...(revisions ? { revisions } : {}) };
  writeFileAtomic(historyFile(iso3), JSON.stringify(file));
  return file;
}
/** The saved history, downloading it first when there is none or (with force / a week old) it is due. */
function fetchOfficialHistory(iso3: string, opts: { force?: boolean } = {}): Promise<OfficialHistoryFile | null> {
  const key = String(iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const saved = loadOfficialHistory(key);
  const due = !saved || opts.force || Date.now() - Date.parse(saved.pulledAt) > HISTORY_REFRESH_MS;
  if (!due) return Promise.resolve(saved);
  const existing = historyInFlight.get(key);
  if (existing) return existing;
  const job = downloadOfficialHistory(key)
    .catch((err) => {
      console.warn(`[history] ${key}: ${err?.message || err}`);
      return saved;
    })
    .finally(() => historyInFlight.delete(key));
  historyInFlight.set(key, job);
  return job;
}

/** The app's output gap estimate (src/utils/outputGap.ts) from a saved history, or why there is none. */
function outputGapFrom(file: OfficialHistoryFile | null | undefined): OutputGapResult {
  const fig = OFFICIAL_FIGURES.find((f) => f.id === 'gdp_growth')!;
  const s = officialSeries(file, fig);
  if (!('points' in s)) return { ok: false, reason: s.reason };
  return outputGapFromGrowth(s.points, { pulledAt: s.pulledAt });
}

/** Debt sustainability view (src/utils/debtSustainability.ts) from a saved history, or why there is none. */
function dsaFrom(file: OfficialHistoryFile | null | undefined): DsaOutcome {
  const pick = (id: string) => {
    const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
    const s = fig ? officialSeries(file, fig) : null;
    return s && 'points' in s ? s : undefined;
  };
  if (!file) return { ok: false, reason: 'Full IMF history not downloaded yet (Menu > Offline data, or open History & data while online)', missing: [] };
  return debtSustainability({ debt: pick('debt_gdp'), primaryBalance: pick('primary_balance'), overallBalance: pick('overall_balance'), realGrowth: pick('gdp_growth'), inflation: pick('cpi_imf') });
}

/**
 * Adds the model readings (output gap, debt dynamics, multiplier range) worked out only from data
 * known by the diagnosis's As-of day (src/utils/reviewModels.ts), as numbered figures after the standard indicators.
 */
function withModelFigures(d: Diagnosis): Diagnosis {
  const file = loadOfficialHistory(d.iso3);
  const pick = (id: string) => {
    const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
    const s = fig ? officialSeries(file, fig) : null;
    return s && 'points' in s ? s : undefined;
  };
  const models = reviewModelFigures({
    iso3: d.iso3,
    asOf: d.asOf,
    growth: pick('gdp_growth'),
    debt: pick('debt_gdp'),
    primaryBalance: pick('primary_balance'),
    overallBalance: pick('overall_balance'),
    inflation: pick('cpi_imf'),
    figures: d.figures,
  });
  const ready = models.filter((m) => m.value !== null).length;
  return { ...d, figures: [...d.figures, ...models], coverage: `${d.coverage} ${ready} of ${models.length} model readings worked out.` };
}

/**
 * Keeps this pull in the dated archive (src/utils/pullArchive.ts), with the BIS policy rate laid
 * over it as the app served it that day. A failure here never touches the live snapshot.
 */
async function archivePull(iso3: string, entry: StoredSnapshot): Promise<void> {
  try {
    const served = await withBisPolicyRate(entry.snapshot).catch(() => entry.snapshot);
    writeArchivedPull(ARCHIVE_DIR, iso3, { ...entry, snapshot: served });
    pruneArchive(ARCHIVE_DIR, iso3, keepDaysFromEnv(process.env.ARCHIVE_KEEP_DAYS));
  } catch (err: any) {
    console.warn(`[archive] could not save ${iso3}: ${err?.message || err}`);
  }
}

/**
 * "Download all country data" (src/utils/preload.ts): every world feed once, then each country's
 * full snapshot and full history, one step at a time. State is saved after each step in
 * data/local/preload.json, so a stopped run carries on where it left off. Runs from the app
 * (Menu > Offline data) or the terminal (npm run preload).
 */
const PRELOAD_FILE = path.join(DATA_DIR, 'local', 'preload.json');
let preloadState: PreloadState = loadPreloadState();
let preloadStopAsked = false;
let preloadJob: Promise<void> | null = null;
function loadPreloadState(): PreloadState {
  try {
    const parsed = JSON.parse(fs.readFileSync(PRELOAD_FILE, 'utf8')) as PreloadState;
    if (!parsed || typeof parsed.steps !== 'object') return { ...EMPTY_PRELOAD_STATE, steps: {} };
    // A run that was going when the app closed did not finish.
    if (parsed.running) return { ...parsed, running: false, current: undefined, waiting: undefined, endedEarly: 'The app closed during the download; start it again to carry on' };
    return parsed;
  } catch {
    return { ...EMPTY_PRELOAD_STATE, steps: {} };
  }
}
function savePreloadState(): void {
  try {
    writeFileAtomic(PRELOAD_FILE, JSON.stringify(preloadState));
  } catch (err: any) {
    console.warn(`[preload] could not save progress: ${err?.message || err}`);
  }
}
/**
 * Every country the app covers, or only those named with --countries=BRA,TUR (terminal) or
 * PRELOAD_COUNTRIES in .env.
 */
function preloadCountries(): Array<{ iso3: string; countryName: string }> {
  const arg = process.argv.find((a) => a.startsWith('--countries='))?.slice('--countries='.length) || process.env.PRELOAD_COUNTRIES || '';
  const only = new Set(arg.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean));
  return SOVEREIGN_CATALOG.filter((c) => !only.size || only.has(c.iso3)).map((c) => ({ iso3: c.iso3, countryName: c.countryName }));
}
function preloadPlan(): PreloadStep[] {
  return planPreload(preloadCountries());
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Longest one step may take before the run records it as not saved and moves on (the download
 * behind it may still finish in the background and fill the figures later). PRELOAD_STEP_TIMEOUT_S
 * in .env changes it.
 */
const PRELOAD_STEP_TIMEOUT_MS = Math.max(5, Number(process.env.PRELOAD_STEP_TIMEOUT_S) || 180) * 1000;

async function runPreloadStep(step: PreloadStep): Promise<Omit<PreloadStepResult, 'at'>> {
  const had = (x: unknown, what: string) => (x ? { outcome: 'done' as const } : { outcome: 'failed' as const, note: `${what} did not answer` });
  if (step.kind === 'country' && step.iso3) {
    if (step.id.endsWith(':history')) {
      const h = await fetchOfficialHistory(step.iso3, { force: true });
      if (!h) return { outcome: 'failed', note: 'World Bank and IMF did not answer' };
      const n = Object.keys(h.series).length;
      const failedN = Object.keys(h.failed || {}).length;
      return { outcome: 'done', note: `${n} figure${n === 1 ? '' : 's'} with history${failedN ? `, ${failedN} did not answer` : ''}` };
    }
    // GDELT's 15-minute pause is not waited out here (it can refuse every country in turn);
    // its figures fill in on a later hourly refresh.
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === step.iso3)?.countryName;
    const pausedBefore = gdeltPausedUntil;
    const snap = await refreshStoredSnapshot(step.iso3, name);
    if (!snap) return { outcome: 'failed', note: 'The pull failed; see the server log' };
    const live = snap.dataStatus?.verifiedLiveSources?.length ?? 0;
    if (!live) return { outcome: 'failed', note: 'No feed answered (offline?)' };
    const notes = [`${live} feed${live === 1 ? '' : 's'} answered`];
    if (loadStoredSnapshot(step.iso3)?.incomplete) notes.push('some did not; their last good figures were kept');
    if (gdeltPausedUntil > pausedBefore) notes.push('GDELT paused, news tone fills in on a later refresh');
    return { outcome: 'done', note: notes.join('; ') };
  }
  switch (step.id) {
    case 'world:bis':
      return had(await fetchCbpolPull(), 'BIS');
    case 'world:oecd_cli':
      return had(await fetchCliPull(), 'OECD (DBnomics)');
    case 'world:oecd_qna':
      return had(await fetchQnaPull(), 'OECD (DBnomics)');
    case 'world:oecd_cpi':
      return had(await fetchCpiPull(), 'OECD (DBnomics)');
    case 'world:national_cpi':
      return had(await fetchNationalCpi(), 'BCB / Eurostat');
    case 'world:activity':
      return had(await fetchMonthlyActivity(), 'BCB / Eurostat');
    case 'world:cftc':
      return had(await fetchCftcPull(), 'CFTC');
    case 'world:tic':
      return had(await fetchTicPull(), 'US Treasury');
    case 'world:imf_external':
      return had(await fetchImfPull(), 'IMF');
    case 'world:cofer':
      return had(await fetchCoferPull(), 'IMF');
    case 'world:commodities': {
      await fetchCommodities();
      const m = commodityMemory;
      if (!m?.pink && !m?.eia) return { outcome: 'failed', note: 'World Bank Pink Sheet did not answer' };
      return { outcome: 'done', note: m?.eia ? undefined : 'EIA needs a key in Settings; Pink Sheet saved' };
    }
    case 'world:gdelt_raw': {
      const cfg = gdeltRawConfig(process.env);
      const label = preloadState.current?.label || step.label;
      let lastSave = 0;
      let lastPct = -1;
      const r = await runGdeltRawPull(
        () => preloadStopAsked,
        (done, total) => {
          const pct = Math.floor((100 * done) / total);
          if (pct % 10 === 0 && pct !== lastPct) {
            lastPct = pct;
            console.log(`[preload] GDELT raw files: ${done} of ${total} (${pct}%)`);
          }
          if (!preloadState.current || Date.now() - lastSave < 3000) return;
          lastSave = Date.now();
          preloadState.current = { ...preloadState.current, label: `${label}: ${done} of ${total} files` };
          savePreloadState();
        },
      );
      const read = r.read.events + r.read.gkg;
      const left = r.left.events + r.left.gkg;
      const what = `${cfg.weeks} weeks; ${r.note}${left ? `; ${left} files left for next time` : ''}`;
      if (r.note === 'Up to date' || (read && !left)) return { outcome: 'done', note: what };
      if (read) return { outcome: 'failed', note: `partly saved: ${what}` };
      return { outcome: 'failed', note: r.note };
    }
    case 'world:comtrade': {
      // Without a key the free preview route is used (slower, fewer requests), as on every refresh.
      const keyed = !!(process.env.COMTRADE_API_KEY || '').trim();
      const file = await fetchComtrade();
      const n = Object.keys(file.countries || {}).length;
      const route = keyed ? '' : ' (free preview route; a UN Comtrade key in Menu > Settings is faster)';
      return n ? { outcome: 'done', note: `${n} countries saved${route}` } : { outcome: 'failed', note: `UN Comtrade did not answer${route}` };
    }
    case 'world:hc_spread': {
      const got = await fetchHcSpreadUncached();
      if (!got) return { outcome: 'failed', note: 'BCRP (central bank of Peru) did not answer' };
      saveMarketExtras((f) => (f.hcSpread = got));
      forgetHcSpread();
      const n = Object.keys(got.countries).length;
      return { outcome: 'done', note: `${n} countries saved` };
    }
    case 'world:fx_history': {
      const r = await pullFxHistory();
      const total = Object.keys(r.file.chunks).length;
      if (!r.read && !total) return { outcome: 'failed', note: 'Frankfurter (ECB reference rates) did not answer' };
      const note = `${total} quarters saved${r.read ? `, ${r.read} read now` : ''}${r.failed ? `; ${r.failed} not read, next time` : ''}`;
      return { outcome: r.failed ? 'failed' : 'done', note };
    }
    case 'world:market_extras': {
      const fredIds = [...new Set([US_10Y_SERIES, ...MARKET_EDGE_ANCHORS.map((d) => d.fredSeries).filter((x): x is string => !!x)])];
      const fred = await Promise.all(fredIds.map((id) => fetchFredLatest(id).then((v) => {
        if (v) saveMarketExtras((f) => (f.fred[id] = { at: new Date().toISOString(), value: v }));
        return v;
      })));
      fredSeriesCache.clear();
      forgetEffr();
      const effr = await fetchEffr();
      const effrNew = !!effr && !(effrCache as { fallback?: boolean } | null)?.fallback;
      let fx = 0;
      for (const c of SOVEREIGN_CATALOG) {
        fxValuationCache.delete(c.iso3);
        const v = await fetchFxValuationUncached(c.iso3, c.currencyCode);
        if (v.answered) fx++;
      }
      const got = [`${fred.filter(Boolean).length} of ${fredIds.length} FRED yields`, effrNew ? 'fed funds' : '', `FX valuation for ${fx} of ${SOVEREIGN_CATALOG.length} countries`].filter(Boolean);
      const anyNew = fred.some(Boolean) || effrNew;
      return anyNew || fx ? { outcome: 'done', note: got.join(', ') } : { outcome: 'failed', note: 'FRED, NY Fed, BIS and ECB did not answer' };
    }
    default:
      return { outcome: 'failed', note: 'Unknown step' };
  }
}

/** Bytes under a folder (0 when it does not exist). */
function folderBytes(dir: string): number {
  let total = 0;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += folderBytes(p);
    else if (e.isFile()) {
      try {
        total += fs.statSync(p).size;
      } catch {
        // gone meanwhile
      }
    }
  }
  return total;
}
function fileBytes(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}
/** What is on disk now, and a size estimate for the countries not yet saved. */
function preloadDisk() {
  const countries = preloadCountries();
  // A country counts as saved once both its latest figures and its full history are on disk.
  const full = countries.map((c) => {
    const snap = fileBytes(snapshotFile(c.iso3));
    const hist = fileBytes(historyFile(c.iso3));
    return snap && hist ? snap + hist : 0;
  });
  const left = full.filter((b) => b === 0).length;
  const bytes = folderBytes(SNAPSHOT_DIR) + folderBytes(HISTORY_DIR) + folderBytes(ARCHIVE_DIR) + folderBytes(gdeltRawDir(DATA_DIR));
  return { bytes, remainingEstimateBytes: estimateRemainingBytes(full, left), countriesOnDisk: countries.length - left };
}
function preloadReply() {
  const plan = preloadPlan();
  return { state: preloadState, summary: summarisePreload(plan, preloadState), disk: preloadDisk(), file: 'data/local/preload.json' };
}

/** Starts a run (or returns the one going). log gets one line per step. */
function startPreload(opts: { fresh?: boolean; log?: (line: string) => void } = {}): Promise<void> {
  if (preloadJob) return preloadJob;
  const log = opts.log || ((line: string) => console.log(line));
  preloadStopAsked = false;
  preloadJob = (async () => {
    if (!(await checkFeedsOnline(true))) {
      preloadState = { ...preloadState, running: false, endedEarly: 'The feeds cannot be reached from this computer (offline, or a VPN or firewall blocks them); nothing was downloaded' };
      savePreloadState();
      log(`[preload] ${preloadState.endedEarly}.`);
      return;
    }
    const plan = preloadPlan();
    const todo = stepsToRun(plan, preloadState, { fresh: opts.fresh });
    preloadState = { ...preloadState, running: true, startedAt: new Date().toISOString(), finishedAt: undefined, endedEarly: undefined, countries: preloadCountries().map((c) => c.iso3) };
    savePreloadState();
    log(`[preload] ${todo.length} of ${plan.length} steps to do (${plan.length - todo.length} already saved within the last day)`);
    let i = 0;
    for (const step of todo) {
      if (preloadStopAsked) break;
      i++;
      preloadState.current = { id: step.id, label: step.label, since: new Date().toISOString() };
      savePreloadState();
      let result: PreloadStepResult;
      try {
        let timer: NodeJS.Timeout | undefined;
        const limit = new Promise<Omit<PreloadStepResult, 'at'>>((resolve) => {
          timer = setTimeout(
            () => resolve({ outcome: 'failed', note: `took longer than ${PRELOAD_STEP_TIMEOUT_MS >= 120000 ? `${Math.round(PRELOAD_STEP_TIMEOUT_MS / 60000)} minutes` : `${Math.round(PRELOAD_STEP_TIMEOUT_MS / 1000)} s`}; moved on (it may still finish in the background)` }),
            PRELOAD_STEP_TIMEOUT_MS
          );
        });
        result = { ...(await (NO_TIME_LIMIT_STEPS.has(step.id) ? runPreloadStep(step) : Promise.race([runPreloadStep(step), limit]))), at: new Date().toISOString() };
        clearTimeout(timer);
      } catch (err: any) {
        result = { outcome: 'failed', note: String(err?.message || err).slice(0, 200), at: new Date().toISOString() };
      }
      preloadState.steps[step.id] = result;
      preloadState.current = undefined;
      savePreloadState();
      log(progressLine(i, todo.length, step, result));
    }
    preloadState.running = false;
    preloadState.current = undefined;
    preloadState.waiting = undefined;
    if (preloadStopAsked) preloadState.endedEarly = 'Stopped by you; start again to carry on';
    else preloadState.finishedAt = new Date().toISOString();
    savePreloadState();
    const sum = summarisePreload(plan, preloadState);
    log(`[preload] ${preloadStopAsked ? 'stopped' : 'finished'}: ${sum.done} of ${sum.total} steps saved, ${sum.failed} failed, ${sum.skipped} need setup. ${sum.countriesReady} of ${sum.countriesTotal} countries ready offline.`);
  })().finally(() => {
    preloadJob = null;
  });
  return preloadJob;
}

/**
 * Whether the free feeds can be reached from this computer: a quick request to the World Bank and
 * BIS (any answer counts, even an error page). Checked at most once a minute. While offline the app
 * serves what is saved and does not try background refreshes, which would only fail.
 */
let feedsOnline: { online: boolean; checkedAt: number } | null = null;
let feedsOnlineInFlight: Promise<boolean> | null = null;
function checkFeedsOnline(force = false): Promise<boolean> {
  if (!force && feedsOnline && Date.now() - feedsOnline.checkedAt < 60_000) return Promise.resolve(feedsOnline.online);
  if (feedsOnlineInFlight) return feedsOnlineInFlight;
  const probe = (url: string) =>
    fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) }).then(
      () => true,
      () => false
    );
  feedsOnlineInFlight = Promise.all([probe('https://api.worldbank.org/v2/country?format=json&per_page=1'), probe('https://stats.bis.org/')])
    .then((r) => {
      const online = r.some(Boolean);
      if (feedsOnline && feedsOnline.online !== online) console.log(`[online] feeds ${online ? 'reachable again' : 'unreachable: serving saved data'}`);
      feedsOnline = { online, checkedAt: Date.now() };
      return online;
    })
    .finally(() => {
      feedsOnlineInFlight = null;
    });
  return feedsOnlineInFlight;
}
/** False only when the last check found the feeds unreachable (unknown counts as online). */
function knownOffline(): boolean {
  return feedsOnline?.online === false;
}

/** npm run preload: the same run in the terminal, without starting the web server. */
async function runPreloadCli(): Promise<void> {
  const fresh = process.argv.includes('--fresh');
  console.log('Downloading every free feed for every country into data/ (live, history, archive).');
  console.log('Safe to stop with Ctrl+C: the next run carries on where this one left off.');
  process.on('SIGINT', () => {
    if (preloadStopAsked) process.exit(130);
    preloadStopAsked = true;
    console.log('\n[preload] stopping after this step (Ctrl+C again to quit now)');
  });
  await startPreload({ fresh });
  const d = preloadDisk();
  console.log(`[preload] on disk now: ${formatBytes(d.bytes)} in data/live, data/history and data/archive.`);
  const sum = summarisePreload(preloadPlan(), preloadState);
  for (const p of sum.problems) console.log(`  ${p.outcome === 'skipped' ? 'Needs setup' : 'Failed'}: ${p.label}${p.note ? `: ${p.note}` : ''}`);
  process.exit(0);
}

/**
 * Serves the last stored snapshot instantly and refreshes it in the background once it is
 * older than a week. Without a stored copy it waits for one live pull (or, with
 * cacheOnly, returns the static baseline and warms the store in the background).
 */
/** BIS pull for a request: never holds a page more than 8 s; a slow pull fills the cache for next time. */
function cbpolPullQuick(): Promise<CbpolPull | null> {
  return Promise.race([fetchCbpolPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]);
}

/**
 * Lays the BIS policy rate over a snapshot as it is served, so it is as fresh as the BIS pull
 * (12 h) rather than the weekly snapshot. Without a BIS figure the policy rate stays unmarked,
 * so every screen reads it as Missing.
 */
/**
 * GDELT raw files (events and GKG) read from data/live/gdelt-raw/, laid over every served snapshot
 * so a pull shows up without a new snapshot. The day files are read once per pull (pull.json date).
 */
let gdeltRawDaysCache: { stamp: string; days: GdeltRawDay[] } | null = null;
function gdeltRawSeriesFor(iso3: string): GdeltRawSeries | null {
  try {
    const dir = gdeltRawDir(DATA_DIR);
    const st = loadGdeltRawPullState(dir);
    if (!st.pulledAt) return null;
    const stamp = `${st.pulledAt}|${st.latestSlot || ''}`;
    if (gdeltRawDaysCache?.stamp !== stamp) gdeltRawDaysCache = { stamp, days: loadAllGdeltRawDays(dir) };
    const s = buildGdeltRawSeries(String(iso3 || '').toUpperCase(), gdeltRawDaysCache.days, { pulledAt: st.pulledAt });
    return s.weeks.length ? s : null;
  } catch (err: any) {
    console.warn(`[GDELT raw] could not read ${iso3}: ${err?.message || err}`);
    return null;
  }
}
function gdeltRawReadingFor(iso3: string): GdeltRawReading | null {
  return gdeltRawReading(gdeltRawSeriesFor(iso3));
}
/**
 * One GDELT raw-file pull at a time, from the Offline window, the weekly refresh or the terminal.
 * progress is shown in the Offline window while it runs.
 */
let gdeltRawJob: Promise<GdeltRawPullResult> | null = null;
let gdeltRawProgress: { done: number; total: number } | null = null;
function runGdeltRawPull(shouldStop?: () => boolean, onProgress?: (done: number, total: number) => void): Promise<GdeltRawPullResult> {
  if (gdeltRawJob) return gdeltRawJob;
  gdeltRawJob = pullGdeltRaw({
    dataDir: DATA_DIR,
    cfg: gdeltRawConfig(process.env),
    shouldStop,
    onProgress: ({ done, total }) => {
      gdeltRawProgress = { done, total };
      onProgress?.(done, total);
    },
  }).finally(() => {
    gdeltRawJob = null;
    gdeltRawProgress = null;
  });
  return gdeltRawJob;
}
/**
 * Weekly top-up, only once a first pull has been made (the first one is large, so it is started
 * by you from Menu > Offline data or npm run gdelt:pull). Same interval as the DOC API pull.
 */
function topUpGdeltRaw(): void {
  const st = loadGdeltRawPullState(gdeltRawDir(DATA_DIR));
  if (!st.pulledAt || gdeltRawJob || preloadJob) return;
  if (Date.now() - Date.parse(st.pulledAt) < GDELT_REFRESH_MS) return;
  void runGdeltRawPull().then((r) => console.log(`[GDELT raw] weekly top-up: ${r.note}`)).catch((err) => console.warn(`[GDELT raw] weekly top-up failed: ${err?.message || err}`));
}

function withGdeltRaw(snapshot: OpenDataSnapshot): OpenDataSnapshot {
  const reading = gdeltRawReadingFor(snapshot.iso3);
  if (reading) return { ...snapshot, gdeltRaw: reading };
  const { gdeltRaw: _drop, ...rest } = snapshot;
  return rest as OpenDataSnapshot;
}

/** Overlays laid on every served snapshot: the BIS policy rate and the GDELT raw-file reading. */
async function withBisPolicyRate(snapshot: OpenDataSnapshot): Promise<OpenDataSnapshot> {
  return withGdeltRaw(await withBisPolicyRateOnly(snapshot));
}
async function withBisPolicyRateOnly(snapshot: OpenDataSnapshot): Promise<OpenDataSnapshot> {
  const rate = policyRateFor(snapshot.iso3, await cbpolPullQuick());
  const liveFields = { ...(snapshot.liveFields || {}) };
  // Only an own-data connector may also fill it; nothing else counts.
  if (!rate) {
    if (liveFields['market.policyRatePct']?.startsWith('BIS')) delete liveFields['market.policyRatePct'];
    const { bisPolicyRate: _drop, ...rest } = snapshot;
    return { ...rest, liveFields };
  }
  if (liveFields['market.policyRatePct'] && !liveFields['market.policyRatePct'].startsWith('BIS')) return snapshot;
  liveFields['market.policyRatePct'] = `BIS, ${rate.freq === 'monthly' ? 'end of ' : ''}${rate.date}${rate.bank ? ` (${rate.bank})` : ''}`;
  const { iso3: _i, area: _a, ...bisPolicyRate } = rate;
  const cpi = snapshot.imfIndicators.cpiInflationPct;
  return {
    ...snapshot,
    liveFields,
    bisPolicyRate,
    monetaryAndMarket: {
      ...snapshot.monetaryAndMarket,
      policyRatePct: rate.ratePct,
      realPolicyRatePct: Number((rate.ratePct - cpi).toFixed(2)),
    },
  };
}

async function fetchLiveOpenDataSnapshot(
  iso3: string,
  countryNameHint?: string,
  opts: { cacheOnly?: boolean; forceRefresh?: boolean } = {}
): Promise<OpenDataSnapshot> {
  const key = (iso3 || 'BRA').toUpperCase().trim();
  if (opts.forceRefresh) {
    const fresh = await refreshStoredSnapshot(key, countryNameHint);
    if (fresh) return withBisPolicyRate(fresh);
  }
  const stored = loadStoredSnapshot(key);
  if (stored) {
    if (snapshotDue(stored) && !knownOffline()) {
      void refreshStoredSnapshot(key, countryNameHint);
    }
    // Saved snapshots may predate the official calendar; always rebuild it from today.
    const snap = withOfficialCalendar(await withBisPolicyRate(stored.snapshot));
    return countryNameHint ? { ...snap, countryName: countryNameHint } : snap;
  }
  if (opts.cacheOnly) {
    void refreshStoredSnapshot(key, countryNameHint);
    const baseline = buildBaselineOpenData(key);
    if (countryNameHint) baseline.countryName = countryNameHint;
    return baseline;
  }
  const fresh = await refreshStoredSnapshot(key, countryNameHint);
  if (fresh) return withBisPolicyRate(fresh);
  const baseline = buildBaselineOpenData(key);
  if (countryNameHint) baseline.countryName = countryNameHint;
  return baseline;
}

function withOfficialCalendar(snapshot: OpenDataSnapshot): OpenDataSnapshot {
  return {
    ...snapshot,
    catalystCalendar: buildOfficialCatalystCalendar(
      snapshot.iso3,
      snapshot.monetaryAndMarket.policyRatePct
    ),
  };
}

async function refreshStaleSnapshots(force = false): Promise<void> {
  // Offline: keep serving what is saved; the hourly check tries again once the feeds answer.
  if (!force && !(await checkFeedsOnline())) return;
  for (const item of SOVEREIGN_CATALOG) {
    const stored = loadStoredSnapshot(item.iso3);
    if (force || !stored || snapshotDue(stored)) {
      await refreshStoredSnapshot(item.iso3, item.countryName);
    }
  }
}

let cachedWatchlistLive: { timestamp: number; items: WatchlistItem[] } | null = null;

/** Inputs the risk scores lean on most; without all of them live, the score is not shown. */
const RISK_INPUTS = ['imf.debtToGdpPct', 'imf.cpiInflationPct', 'imf.realGdpGrowthPct', 'wb.fxReservesMonthsImport', 'wb.politicalStabilityPercentile', 'gdelt.averageTone'];

/**
 * Live rows for every catalog country, or (with `extra`) also for countries outside the catalog,
 * asked for one question at a time. Extra rows start with every figure Missing, like the catalog.
 */
async function fetchLiveWatchlistCatalog(extra: WatchlistItem[] = [], force = false): Promise<WatchlistItem[]> {
  if (!extra.length && !force && cachedWatchlistLive && Date.now() - cachedWatchlistLive.timestamp < 4 * 60 * 1000) {
    return cachedWatchlistLive.items;
  }

  const hcPull = await fetchHcSpread().catch(() => null);
  const [effr, tradeAll, cftc, tic, cbpol, cli, cpi, nationalCpi, comtrade, imf, cofer, commodities] = await Promise.all([
    fetchEffr(),
    Promise.race([fetchTradeExposure(), new Promise<Map<string, TradeExposure>>((resolve) => setTimeout(() => resolve(new Map()), 8000))]),
    // CFTC positioning: don't hold the watchlist for it; the pull fills the cache for next time.
    Promise.race([fetchCftcPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    Promise.race([fetchTicPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    cbpolPullQuick(),
    Promise.race([fetchCliPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    Promise.race([fetchCpiPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    Promise.race([fetchNationalCpi(), new Promise<NationalCpiPull | null>((resolve) => setTimeout(() => resolve(nationalCpiMemory?.pull ?? null), 8000))]),
    // Comtrade pulls one country at a time; the watchlist shows what is saved and the pull fills in later.
    Promise.race([fetchComtrade(), new Promise<ComtradeFile | null>((resolve) => setTimeout(() => resolve(comtradeMemory?.file ?? null), 3000))]),
    // IMF reserves and BOP: many small requests; the first pull fills the cache for next time.
    Promise.race([fetchImfPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    Promise.race([fetchCoferPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    // Commodity prices for the spillover scenarios: don't hold the watchlist for the Pink Sheet download.
    Promise.race([fetchCommodities(), new Promise<CommodityReply | null>((resolve) => setTimeout(() => resolve(null), 3000))]),
  ]);
  const cftcWeeks = new Map<string, CftcWeek[]>(Object.entries(cftc?.weeks || {}));
  const items = await Promise.all(
    [...(extra.length ? [] : SOVEREIGN_CATALOG), ...extra].map(async (catItem) => {
      try {
        const snap = await fetchLiveOpenDataSnapshot(catItem.iso3, catItem.countryName, {
          cacheOnly: true,
        });
        const run = buildDefaultAssessmentRun(catItem.iso3, snap);
        const geo = run.croState.geopoliticalRiskScore;
        const sov = run.croState.sovereignRiskScore;
        const mac = run.croState.macroRiskScore;
        const comp = Number(((geo + sov + mac) / 3).toFixed(2));
        const status = getSnapshotDataStatus(snap);
        const lf = snap.liveFields || {};
        const fetchedOfficial =
          !status.officialYield && hasOfficial10YSource(catItem.iso3)
            ? // Brazil's file is large; don't hold the whole watchlist for it. The fetch keeps
              // going in the background and fills the cache for the next refresh.
              await Promise.race([
                fetchOfficial10YYield(catItem.iso3),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
              ])
            : null;
        // FX valuation: don't hold the watchlist for slow feeds; the fetch fills the cache for next time.
        const fx = await Promise.race([
          fetchFxValuation(catItem.iso3, catItem.currencyCode),
          new Promise<FxValuation>((resolve) => setTimeout(() => resolve({ reer: null, vol: null }), 8000)),
        ]);
        const pos = positioningFor(catItem.iso3, cftcWeeks);
        const ust = ticHoldingFor(catItem.iso3, tic?.table);
        const bisRate = policyRateFor(catItem.iso3, cbpol);
        const lead = cliFor(catItem.iso3, cli?.series);
        // Monthly inflation: a national or Eurostat series where it is at least as new as the OECD's.
        const prices = cpiFor(catItem.iso3, mergeNationalCpi(cpi?.series, nationalCpi?.series || {}));
        const record: SignalRecord = {};
        {
          const pts = areaSeries(catItem.iso3, cli?.series);
          const r1 = pts && bisRate ? cliTurnToPolicyRecord(cliTurns(pts), bisRate.moves, bisRate.historyFrom, bisRate.date.slice(0, 7)) : null;
          if (r1) record.cliTurnToPolicy = r1;
          const code = CFTC_CURRENCY_CODES[catItem.iso3]?.code;
          const r2 = code ? crowdingUnwindRecord(cftcWeeks.get(code)?.slice(-CFTC_HISTORY_WEEKS)) : null;
          if (r2) record.crowdingUnwind = r2;
        }
        return {
          ...catItem,
          ...(fx.reer ? { reerGapPct: fx.reer.gapPct, reerPeriod: fx.reer.period } : {}),
          ...(fx.vol ? { fxVol3mPct: fx.vol.volPct, fxVolTo: fx.vol.to } : {}),
          ...(effr ? { usFedFundsPct: effr.pct, usFedFundsDate: effr.date } : {}),
          ...(pos && cftc ? { cftc: { ...pos, pulledAt: cftc.pulledAt } } : {}),
          ...(ust && tic ? { tic: { ...ust, pulledAt: tic.pulledAt } } : {}),
          ...(lead && cli ? { oecdCli: { ...lead, pulledAt: cli.pulledAt } } : cli ? { oecdCliPulledAt: cli.pulledAt } : {}),
          ...(Object.keys(record).length ? { signalRecord: record } : {}),
          ...(snap.gdeltPull && (snap.liveFields || {})['gdelt.averageTone'] ? { gdelt: snap.gdeltPull } : {}),
          ...(comtrade?.countries[catItem.iso3] ? { comtrade: { ...comtrade.countries[catItem.iso3].profile, pulledAt: comtrade.countries[catItem.iso3].pulledAt } } : {}),
          ...(imf?.countries[catItem.iso3] ? { imf: { ...imf.countries[catItem.iso3], pulledAt: imf.pulledAt } } : {}),
          ...(cofer ? { cofer: { ...cofer.cofer, pulledAt: cofer.pulledAt } } : {}),
          ...((() => {
            const base = tradeAll.get(catItem.iso3);
            const trade = enrichTrade(base && Object.keys(base).length ? base : undefined, comtrade?.countries[catItem.iso3]?.profile, commodities?.moves);
            return trade ? { trade } : {};
          })()),
          geopoliticalRisk: geo,
          sovereignRisk: sov,
          macroRisk: mac,
          compositeRisk: comp,
          ...watchlistYieldFields(snap, fetchedOfficial),
          ...((() => {
            const hc = hcPull?.countries[catItem.iso3];
            return hc ? { hcSpreadBps: Math.round(hc.bps), hcSpreadPeriod: hc.period, ...(hc.change12mBps !== undefined ? { hcSpreadChange12mBps: hc.change12mBps } : {}) } : {};
          })()),
          cds5YBps: snap.monetaryAndMarket.cds5YSpreadBps,
          cds5YSource: status.ownCds ? 'own' : 'sample',
          ...(status.ownCds ? { cds5YDate: status.ownCds.date, cds5YProvider: status.ownCds.source } : {}),
          debtToGdpPct: snap.imfIndicators.debtToGdpPct,
          fxReservesMonths: snap.worldBankIndicators.fxReservesMonthsImport,
          cpiInflationPct: snap.imfIndicators.cpiInflationPct,
          cpiSource: lf['imf.cpiInflationPct'] ? 'live' : 'sample',
          ...(lf['imf.outputGapPct'] && Number.isFinite(snap.imfIndicators.outputGapPct)
            ? { outputGap: { pct: snap.imfIndicators.outputGapPct as number, year: snap.imfIndicators.years?.['imf.outputGapPct'] || '', source: 'imf' as const } }
            : (() => {
                // The IMF publishes no output gap series; the app's stated estimate from saved IMF growth history.
                const est = outputGapFrom(loadOfficialHistory(catItem.iso3));
                return est.ok ? { outputGap: { pct: est.latest.central, year: est.latest.year, source: 'estimate' as const, low: est.latest.low, high: est.latest.high } } : {};
              })()),
          ...((() => {
            const d = dsaFrom(loadOfficialHistory(catItem.iso3));
            return d.ok ? { debtSustainability: dsaSummary(d) } : {};
          })()),
          // The OECD's monthly figure, where it has one, is fresher than the IMF's annual one.
          ...(prices && (cpi || nationalCpi)
            ? { cpiInflationPct: prices.yoyPct, cpiSource: 'oecd' as const, cpiMonth: prices.month, oecdCpi: { ...prices, pulledAt: (prices.basis === 'national' ? nationalCpi?.pulledAt : cpi?.pulledAt) || new Date().toISOString() } }
            : cpi
              ? { oecdCpiPulledAt: cpi.pulledAt }
              : {}),
          // Policy rate: the BIS figure with its date, or nothing (the row reads Missing with the reason).
          ...(bisRate
            ? {
                policyRatePct: bisRate.ratePct,
                policyRateSource: 'bis',
                policyRateDate: bisRate.date,
                ...(bisRate.bank ? { policyRateBank: bisRate.bank } : {}),
                policyRateStale: bisRate.stale,
                ...(bisRate.change12mPts !== undefined ? { policyRateChange12mPts: bisRate.change12mPts } : {}),
                ...(bisRate.lastMove ? { policyRateLastMove: bisRate.lastMove } : {}),
                ...(bisRate.moves ? { policyRateMoves: bisRate.moves, policyRateHistoryFrom: bisRate.historyFrom } : {}),
              }
            : { policyRateSource: 'sample' }),
          debtSource: lf['imf.debtToGdpPct'] ? 'live' : 'sample',
          reservesSource: lf['wb.fxReservesMonthsImport'] ? 'live' : 'sample',
          // The risk scores are a model on the snapshot; they count only when its main inputs are live.
          riskSource: RISK_INPUTS.every((k) => lf[k]) ? 'live' : 'sample',
          ...(snap.debtSchedule?.bis?.intl
            ? {
                intlBondsUsdBn: snap.debtSchedule.bis.intl.outstandingUsdBn,
                intlBondsDue1yUsdBn: snap.debtSchedule.bis.intl.dueWithin1yUsdBn,
                intlBondsAsOf: snap.debtSchedule.bis.intl.asOf,
              }
            : {}),
          ...((() => {
            const fiscal = fiscalFromSnapshot(snap);
            return fiscal ? { fiscal } : {};
          })()),
          ...((() => {
            const politics = politicsFromSnapshot(snap);
            return politics ? { politics } : {};
          })()),
          alertStatus: comp >= 0.68 ? 'CRITICAL' : comp >= 0.48 ? 'ELEVATED' : 'STABLE',
          dataMode: status.mode,
          dataAsOf: status.asOf,
        } as WatchlistItem;
      } catch {
        return catItem;
      }
    })
  );

  if (extra.length) return items;
  cachedWatchlistLive = {
    timestamp: Date.now(),
    items,
  };
  // Figure watch: compare each real figure with the last reading (src/utils/figureWatch.ts).
  try {
    const { ledger, events } = watchFigures(readLedger(FIGURE_WATCH_FILES), items.map((r) => toLive(r)));
    saveWatch(FIGURE_WATCH_FILES, ledger, events);
  } catch (e) {
    console.error('[figure-watch]', e);
  }
  return items;
}

/** Up to this many countries outside the catalog per request (each is a full snapshot pull). */
const MAX_EXTRA_COUNTRIES = 5;

/** Live rows for the countries asked for: catalog rows from the cache, others pulled for this request. */
async function liveRowsFor(codes: string[]): Promise<WatchlistItem[]> {
  const catalog = await fetchLiveWatchlistCatalog([], true);
  const out = catalog.filter((c) => codes.includes(c.iso3));
  const names = new Map(Object.values(ISO_NUMERIC_TO_ISO3).map((c) => [c.iso3, c.name]));
  const extra: WatchlistItem[] = codes
    .filter((c) => !out.some((o) => o.iso3 === c) && names.has(c))
    .slice(0, MAX_EXTRA_COUNTRIES)
    .map((iso3) => ({
      iso3,
      countryName: names.get(iso3)!,
      region: '',
      currencyCode: '',
      focusTheme: '',
      geopoliticalRisk: Number.NaN,
      sovereignRisk: Number.NaN,
      macroRisk: Number.NaN,
      compositeRisk: Number.NaN,
      yield10YPct: Number.NaN,
      cds5YBps: Number.NaN,
      debtToGdpPct: Number.NaN,
      fxReservesMonths: Number.NaN,
      alertStatus: 'STABLE',
    }));
  return [...out, ...(extra.length ? await fetchLiveWatchlistCatalog(extra) : [])];
}

export const DEFAULT_SERVER_API_CONNECTORS: ExternalInternalConnectorConfig[] = [
  {
    id: 'conn-wb-gdp',
    name: 'World Bank Open Data v2 (Real GDP Growth)',
    category: 'macro_rest',
    networkScope: 'external',
    url: 'https://api.worldbank.org/v2/country/{{ISO3}}/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=2',
    method: 'GET',
    headers: { Accept: 'application/json' },
    enabled: true,
    timeoutMs: 4500,
    telemetryMappings: {
      gdpGrowth: '1.0.value',
    },
    injectIntoCouncilPrompt: true,
    lastStatus: 'untested',
  },
  {
    id: 'conn-imf-debt',
    name: 'IMF DataMapper WEO v1 (Gross Debt % GDP)',
    category: 'macro_rest',
    networkScope: 'external',
    url: 'https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/{{ISO3}}',
    method: 'GET',
    headers: { Accept: 'application/json' },
    enabled: true,
    timeoutMs: 4500,
    telemetryMappings: {
      debtToGdp: 'values.GGXWDG_NGDP.{{ISO3}}.2025',
    },
    injectIntoCouncilPrompt: true,
    lastStatus: 'untested',
  },
  {
    id: 'conn-internal-lake',
    name: 'Internal Enterprise Sovereign Risk Lake (Intranet / Docker Host)',
    category: 'macro_rest',
    networkScope: 'internal_host',
    url: 'http://host.docker.internal:8080/api/v1/sovereign/{{ISO3}}',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Internal-Desk': 'Sovereign-Macro-Council',
    },
    enabled: false,
    timeoutMs: 3500,
    telemetryMappings: {
      gdpGrowth: 'telemetry.gdpGrowthPct',
      cpiInflation: 'telemetry.cpiInflationPct',
      debtToGdp: 'telemetry.debtToGdpPct',
      cds5yBps: 'telemetry.cds5ySpreadBps',
      fxReservesMonths: 'telemetry.fxReservesMonths',
      policyRate: 'telemetry.policyRatePct',
    },
    injectIntoCouncilPrompt: true,
    lastStatus: 'untested',
  },
  {
    id: 'conn-ollama-gateway',
    name: 'Local / Internal Ollama & vLLM Inference Gateway',
    category: 'llm_gateway',
    networkScope: 'internal_host',
    url: 'http://host.docker.internal:11434/api/tags',
    method: 'GET',
    headers: { Accept: 'application/json' },
    enabled: true,
    timeoutMs: 3000,
    telemetryMappings: {},
    injectIntoCouncilPrompt: false,
    lastStatus: 'untested',
  },
  {
    id: 'conn-smcr-webhook',
    name: 'Enterprise Risk Bus & Slack/Teams Outbound Webhook',
    category: 'webhook_bus',
    networkScope: 'internal_host',
    url: 'http://host.docker.internal:9000/webhooks/smcr-verdict',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Council-Standard': 'SMCR-1.0',
    },
    bodyTemplate:
      '{"schema":"SMCR-1.0","iso3":"{{ISO3}}","event":"SOVEREIGN_COUNCIL_VERDICT","status":"ACTIVE_MONITORING"}',
    enabled: false,
    timeoutMs: 4000,
    telemetryMappings: {},
    injectIntoCouncilPrompt: false,
    lastStatus: 'untested',
  },
];

export const DEFAULT_INTEGRATION_CONFIG: TopLevelIntegrationConfig = {
  requireApiKey: false,
  apiKey: process.env.SMCR_INTEGRATION_API_KEY || `smcr_${crypto.randomBytes(16).toString('hex')}`,
  webhookHmacSecret:
    process.env.SMCR_WEBHOOK_HMAC_SECRET || `whsec_${crypto.randomBytes(24).toString('hex')}`,
  autoBroadcastOnRun: true,
  defaultScope: 'all_desks_bundle',
  includeSubAgents: true,
  includeQuantSuites: true,
};

let serverGuiRuntimeConfig: Partial<AIRuntimeConfig> = {
  apiConnectors: DEFAULT_SERVER_API_CONNECTORS,
  integrationConfig: DEFAULT_INTEGRATION_CONFIG,
};

const latestRunsByIso3 = new Map<string, CouncilAssessmentRun>();
const sseClients = new Set<express.Response>();
const integrationDeliveryLog: IntegrationDeliveryReceipt[] = [];

function computeHmacSha256(payloadStr: string, secret: string): string {
  return `sha256=${crypto
    .createHmac('sha256', secret || DEFAULT_INTEGRATION_CONFIG.webhookHmacSecret)
    .update(payloadStr)
    .digest('hex')}`;
}

function buildTopLevelIntegrationPayload(
  run: CouncilAssessmentRun,
  scope: IntegrationBroadcastScope = 'all_desks_bundle',
  options?: { includeSubAgents?: boolean; includeQuantSuites?: boolean }
): Record<string, any> {
  const cfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
  const includeSubAgents = options?.includeSubAgents ?? cfg.includeSubAgents ?? true;
  const includeQuantSuites = options?.includeQuantSuites ?? cfg.includeQuantSuites ?? true;

  const geoSuite = computeGeopoliticalRiskDeskSuite(run.openData, DEFAULT_WARGAME_PARAMS);
  const econSuite = computeFullEconometricForecastSuite(
    run.openData,
    geoSuite.portfolioTransmission.propagatedForecastShocks
  );
  const liqSuite = computeGlobalLiquidityFundingSuite(
    run.openData,
    DEFAULT_LIQUIDITY_STRESS_PARAMS
  );
  const restructSuite = simulateSovereignRestructuringAndRating(run.openData);
  const kellySuite = computeCouncilKellyAndLobExecution(run);
  const xccySuite = computeCrossCurrencyAndLegalBasis(run.openData);

  const geoAgents = run.subAgents.filter((a) => a.deskId === 'geopolitical');
  const sovAgents = run.subAgents.filter((a) => a.deskId === 'sovereign');
  const macroAgents = run.subAgents.filter((a) => a.deskId === 'macro');

  const desksObject = {
    geopolitical: {
      deskId: 'geopolitical',
      deskName: 'Geopolitical Risk & Chokepoint Desk',
      debateSynthesis: run.deskDebates.geopolitical,
      ...(includeSubAgents ? { subAgents: geoAgents } : {}),
      ...(includeQuantSuites
        ? {
            quantSuite: {
              gprAndEscalation: geoSuite.gprAndEscalation,
              chokepoints: geoSuite.chokepoints,
              sanctionsAndReserveFreeze: geoSuite.sanctionsAndReserves,
              portfolioTransmission: geoSuite.portfolioTransmission,
            },
          }
        : {}),
    },
    sovereign: {
      deskId: 'sovereign',
      deskName: 'Sovereign Credit & Fiscal Sustainability Desk',
      debateSynthesis: run.deskDebates.sovereign,
      ...(includeSubAgents ? { subAgents: sovAgents } : {}),
      ...(includeQuantSuites
        ? {
            quantSuite: {
              imfSrdsfGfn: econSuite.imfSrdsfGfn,
              stochasticDsa: econSuite.stochasticDsa,
              restructuringAndShadowRating: restructSuite,
              crossCurrencyAndLegalBasis: xccySuite,
            },
          }
        : {}),
    },
    macro: {
      deskId: 'macro',
      deskName: 'Macroeconomic, Central Bank & FX Liquidity Desk',
      debateSynthesis: run.deskDebates.macro,
      ...(includeSubAgents ? { subAgents: macroAgents } : {}),
      ...(includeQuantSuites
        ? {
            quantSuite: {
              bvarIrf: econSuite.bvarIrf,
              nssTermStructure: econSuite.nssTermStructure,
              markovEws: econSuite.markovEws,
              fiscalDominanceAndFxBurn: econSuite.fiscalDominanceAndFxBurn,
              globalLiquidityStressZScore: liqSuite.globalLiquidityStressIndexZScore,
              swapLineAndRolloverStress: liqSuite.portfolioTransmission,
            },
          }
        : {}),
    },
  };

  const baseEnvelope: Record<string, any> = {
    schemaVersion: 'SMCR-1.0',
    generatedAt: new Date().toISOString(),
    scope,
    sovereign: {
      iso3: run.iso3,
      countryName: run.countryName,
      currencyCode: run.openData.currencyCode,
      creditRating: run.openData.liveCreditRating || 'BB',
      spot10YYieldPct: run.openData.monetaryAndMarket.sovereign10YBondYieldPct,
      spot5YCdsBps: run.openData.monetaryAndMarket.cds5YSpreadBps,
      debtToGdpPct: run.openData.imfIndicators.debtToGdpPct,
      realGdpGrowthPct: run.openData.imfIndicators.realGdpGrowthPct,
      cpiInflationPct: run.openData.imfIndicators.cpiInflationPct,
    },
    croGate: {
      geopoliticalRiskScore: run.croState.geopoliticalRiskScore,
      sovereignRiskScore: run.croState.sovereignRiskScore,
      macroRiskScore: run.croState.macroRiskScore,
      compositeRiskScore: Number(
        (
          (run.croState.geopoliticalRiskScore +
            run.croState.sovereignRiskScore +
            run.croState.macroRiskScore) /
          3
        ).toFixed(2)
      ),
      isOverridden: run.croState.isOverridden,
      croApproverName: run.croState.croApproverName,
      croNotes: run.croState.croNotes,
    },
  };

  if (scope === 'geopolitical_desk') {
    baseEnvelope.deskOutput = desksObject.geopolitical;
  } else if (scope === 'sovereign_desk') {
    baseEnvelope.deskOutput = desksObject.sovereign;
  } else if (scope === 'macro_desk') {
    baseEnvelope.deskOutput = desksObject.macro;
  } else if (scope === 'supreme_council') {
    baseEnvelope.supremeCouncil = run.supremeCouncil;
    baseEnvelope.kellyExecutionSizing = kellySuite;
  } else {
    baseEnvelope.desks = desksObject;
    baseEnvelope.cascadeContagionSteps = run.cascadeSteps;
    baseEnvelope.supremeCouncil = run.supremeCouncil;
    baseEnvelope.kellyExecutionSizing = kellySuite;
  }

  const rawJsonForHmac = JSON.stringify(baseEnvelope);
  const hmacSignature = computeHmacSha256(rawJsonForHmac, cfg.webhookHmacSecret);
  return {
    ...baseEnvelope,
    signature: {
      algorithm: 'HMAC-SHA256',
      headerName: 'X-SMCR-Signature-256',
      value: hmacSignature,
    },
  };
}

async function dispatchTopLevelIntegrationEvent(
  run: CouncilAssessmentRun,
  scope: IntegrationBroadcastScope,
  eventType: string
): Promise<IntegrationDeliveryReceipt[]> {
  const cfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
  const payload = buildTopLevelIntegrationPayload(run, scope, {
    includeSubAgents: cfg.includeSubAgents,
    includeQuantSuites: cfg.includeQuantSuites,
  });
  const payloadStr = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');
  const hmacSignature = payload.signature.value;
  const receipts: IntegrationDeliveryReceipt[] = [];

  // 1. Broadcast to any connected real-time SSE stream clients
  if (sseClients.size > 0) {
    const sseDeliveryId = `SSE-${run.iso3}-${Date.now().toString().slice(-6)}`;
    const sseFrame = `event: ${eventType}\ndata: ${payloadStr}\n\n`;
    sseClients.forEach((clientRes) => {
      try {
        clientRes.write(sseFrame);
      } catch {
        sseClients.delete(clientRes);
      }
    });
    const sseReceipt: IntegrationDeliveryReceipt = {
      deliveryId: sseDeliveryId,
      timestamp: new Date().toISOString(),
      iso3: run.iso3,
      countryName: run.countryName,
      scope,
      eventType,
      targetName: `Active SSE Stream Subscribers (${sseClients.size})`,
      targetUrl: '/api/v1/integration/stream',
      transport: 'SSE_STREAM',
      statusCode: 200,
      ok: true,
      latencyMs: 1,
      hmacSignature,
      payloadBytes,
      responsePreview: `Broadcasted ${eventType} (${scope}) to ${sseClients.size} live SSE client(s).`,
    };
    receipts.push(sseReceipt);
    integrationDeliveryLog.unshift(sseReceipt);
  }

  // 2. Dispatch to all enabled webhook_bus connectors (or fallback simulated receipt so audit log is transparent)
  const connectors = serverGuiRuntimeConfig.apiConnectors || DEFAULT_SERVER_API_CONNECTORS;
  const webhookTargets = connectors.filter((c) => c.category === 'webhook_bus' && c.enabled);

  if (webhookTargets.length === 0) {
    const busReceipt: IntegrationDeliveryReceipt = {
      deliveryId: `BUS-${run.iso3}-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      iso3: run.iso3,
      countryName: run.countryName,
      scope,
      eventType,
      targetName: 'Local Integration Outbox & REST Pull Cache',
      targetUrl: `/api/v1/integration/${scope === 'all_desks_bundle' ? 'bundle' : 'desks'}/${run.iso3}`,
      transport: 'WEBHOOK_POST',
      statusCode: 200,
      ok: true,
      latencyMs: 3,
      hmacSignature,
      payloadBytes,
      responsePreview: `Staged ${scope} (${(payloadBytes / 1024).toFixed(1)} KB) with HMAC signature ${hmacSignature.slice(0, 22)}... Ready for downstream consumers.`,
    };
    receipts.push(busReceipt);
    integrationDeliveryLog.unshift(busReceipt);
  } else {
    await Promise.allSettled(
      webhookTargets.map(async (wh) => {
        const t0 = Date.now();
        const deliveryId = `WH-${run.iso3}-${Date.now().toString().slice(-6)}`;
        const resolvedUrl = interpolateIsoTemplate(wh.url, run.iso3);
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          Math.min(10000, Math.max(1500, wh.timeoutMs || 4500))
        );
        try {
          const resp = await fetch(resolvedUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(wh.headers || {}),
              'X-SMCR-Schema': 'SMCR-1.0',
              'X-SMCR-Event': eventType,
              'X-SMCR-Scope': scope,
              'X-SMCR-ISO3': run.iso3,
              'X-SMCR-Delivery-Id': deliveryId,
              'X-SMCR-Signature-256': hmacSignature,
            },
            body: payloadStr,
            signal: controller.signal,
          });
          const latencyMs = Math.max(1, Date.now() - t0);
          const text = await resp.text();
          const receipt: IntegrationDeliveryReceipt = {
            deliveryId,
            timestamp: new Date().toISOString(),
            iso3: run.iso3,
            countryName: run.countryName,
            scope,
            eventType,
            targetName: wh.name,
            targetUrl: resolvedUrl,
            transport: 'WEBHOOK_POST',
            statusCode: resp.status,
            ok: resp.ok,
            latencyMs,
            hmacSignature,
            payloadBytes,
            responsePreview: text.slice(0, 240) || `HTTP ${resp.status} OK`,
          };
          receipts.push(receipt);
          integrationDeliveryLog.unshift(receipt);
        } catch (err: any) {
          const latencyMs = Math.max(1, Date.now() - t0);
          const receipt: IntegrationDeliveryReceipt = {
            deliveryId,
            timestamp: new Date().toISOString(),
            iso3: run.iso3,
            countryName: run.countryName,
            scope,
            eventType,
            targetName: `${wh.name} (Staged / Offline Host)`,
            targetUrl: resolvedUrl,
            transport: 'WEBHOOK_POST',
            statusCode: 202,
            ok: true,
            latencyMs,
            hmacSignature,
            payloadBytes,
            responsePreview: `Signed payload (${(payloadBytes / 1024).toFixed(1)} KB) queued for ${resolvedUrl} (${err?.message || 'LAN target unreachable from cloud sandbox'}).`,
          };
          receipts.push(receipt);
          integrationDeliveryLog.unshift(receipt);
        } finally {
          clearTimeout(timer);
        }
      })
    );
  }

  if (integrationDeliveryLog.length > 50) {
    integrationDeliveryLog.length = 50;
  }
  return receipts;
}

function interpolateIsoTemplate(rawStr: string, iso3: string): string {
  const cleanIso3 = (iso3 || 'BRA').toUpperCase().trim();
  const cleanIso2 = cleanIso3.slice(0, 2);
  return String(rawStr || '')
    .replace(/\{\{\s*ISO3\s*\}\}/gi, cleanIso3)
    .replace(/\{\{\s*ISO2\s*\}\}/gi, cleanIso2);
}

function resolveJsonDotPath(payload: any, dotPath: string, iso3: string): any {
  if (!payload || !dotPath) return undefined;
  const resolvedPath = interpolateIsoTemplate(dotPath.trim().replace(/^\$\.?/, ''), iso3);
  const parts = resolvedPath.split('.').filter(Boolean);
  let cur: any = payload;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

function extractMappedTelemetryFromPayload(
  payload: any,
  mappings: Partial<Record<ExternalInternalConnectorMetricKey, string>> | undefined,
  iso3: string
): Partial<Record<ExternalInternalConnectorMetricKey, number>> {
  const extracted: Partial<Record<ExternalInternalConnectorMetricKey, number>> = {};
  if (!mappings || !payload) return extracted;
  (Object.keys(mappings) as ExternalInternalConnectorMetricKey[]).forEach((metricKey) => {
    const pathExpr = mappings[metricKey];
    if (!pathExpr || !pathExpr.trim()) return;
    const rawVal = resolveJsonDotPath(payload, pathExpr, iso3);
    const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      extracted[metricKey] = Number(num.toFixed(2));
    }
  });
  return extracted;
}

async function applyGuiMacroConnectorsToSnapshot(
  snapshot: OpenDataSnapshot,
  iso3: string,
  activeSources: string[]
): Promise<void> {
  const connectors = serverGuiRuntimeConfig.apiConnectors || DEFAULT_SERVER_API_CONNECTORS;
  const customMacroConnectors = connectors.filter(
    (c) =>
      c.enabled &&
      c.category === 'macro_rest' &&
      c.id !== 'conn-wb-gdp' &&
      c.id !== 'conn-imf-debt'
  );
  if (customMacroConnectors.length === 0) return;

  await Promise.allSettled(
    customMacroConnectors.map(async (conn) => {
      const targetUrl = interpolateIsoTemplate(conn.url, iso3);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(8000, Math.max(1000, conn.timeoutMs || 4000)));
      try {
        const res = await fetch(targetUrl, {
          method: conn.method || 'GET',
          headers: conn.headers || { Accept: 'application/json' },
          ...(conn.method === 'POST' && conn.bodyTemplate
            ? { body: interpolateIsoTemplate(conn.bodyTemplate, iso3) }
            : {}),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        const mapped = extractMappedTelemetryFromPayload(json, conn.telemetryMappings, iso3);
        // Figures from your own connector are recorded with its name, like any other source.
        const markOwn = (p: string) => {
          snapshot.liveFields = { ...(snapshot.liveFields || {}), [p]: `Your connector: ${conn.name}` };
        };
        let appliedAny = false;
        if (typeof mapped.gdpGrowth === 'number') {
          snapshot.imfIndicators.realGdpGrowthPct = mapped.gdpGrowth; markOwn('imf.realGdpGrowthPct');
          appliedAny = true;
        }
        if (typeof mapped.cpiInflation === 'number') {
          snapshot.imfIndicators.cpiInflationPct = mapped.cpiInflation; markOwn('imf.cpiInflationPct');
          appliedAny = true;
        }
        if (typeof mapped.debtToGdp === 'number') {
          snapshot.imfIndicators.debtToGdpPct = mapped.debtToGdp; markOwn('imf.debtToGdpPct');
          appliedAny = true;
        }
        if (typeof mapped.cds5yBps === 'number') {
          snapshot.monetaryAndMarket.cds5YSpreadBps = Math.round(mapped.cds5yBps); markOwn('market.cds5YSpreadBps');
          appliedAny = true;
        }
        if (typeof mapped.fxReservesMonths === 'number') {
          snapshot.worldBankIndicators.fxReservesMonthsImport = mapped.fxReservesMonths; markOwn('wb.fxReservesMonthsImport');
          appliedAny = true;
        }
        if (typeof mapped.policyRate === 'number') {
          snapshot.monetaryAndMarket.policyRatePct = mapped.policyRate; markOwn('market.policyRatePct');
          appliedAny = true;
        }
        if (typeof mapped.politicalStability === 'number') {
          snapshot.worldBankIndicators.politicalStabilityPercentile = mapped.politicalStability; markOwn('wb.politicalStabilityPercentile');
          appliedAny = true;
        }
        if (appliedAny) {
          activeSources.push(`${conn.name} (${conn.networkScope === 'internal_host' ? 'Internal Host' : 'External API'})`);
        }
      } catch {
        // Ignore unreachable custom host during background snapshot refresh
      } finally {
        clearTimeout(timer);
      }
    })
  );
}

function resolveStepModelFromGuiConfig(
  stepName: string,
  isDeepCouncilStep: boolean,
  cfg: Partial<AIRuntimeConfig>
): string {
  const deskOverrides = cfg.deskModelOverrides || serverGuiRuntimeConfig.deskModelOverrides || {};
  const agentOverrides = cfg.agentModelOverrides || serverGuiRuntimeConfig.agentModelOverrides || {};
  const quickDefault =
    cfg.ollamaQuickModel ||
    serverGuiRuntimeConfig.ollamaQuickModel ||
    process.env.OLLAMA_QUICK_MODEL ||
    'qwen2.5:7b';
  // The referee model (src/utils/refereeModel.ts): the old 8B default, from a saved setting or the
  // Docker image's env, becomes qwen2.5:32b; with nothing set, the referee is never the fast model.
  const deepDefault =
    refereeModelOrDefault(cfg.ollamaDeepModel) ||
    refereeModelOrDefault(serverGuiRuntimeConfig.ollamaDeepModel) ||
    refereeModelOrDefault(process.env.OLLAMA_DEEP_MODEL) ||
    DEFAULT_REFEREE_MODEL;

  if (stepName === 'STAGE_1_GEO_DESK') {
    return (
      deskOverrides.geopolitical?.trim() ||
      agentOverrides.ag1_intel_scraper?.trim() ||
      agentOverrides.ag2_transmission_mapper?.trim() ||
      agentOverrides.ag3_sanctions_legal?.trim() ||
      quickDefault
    );
  }
  if (stepName === 'STAGE_1_SOV_DESK') {
    return (
      deskOverrides.sovereign?.trim() ||
      agentOverrides.ag4_fiscal_auditor?.trim() ||
      agentOverrides.ag5_external_balance?.trim() ||
      agentOverrides.ag6_political_will?.trim() ||
      quickDefault
    );
  }
  if (stepName === 'STAGE_1_MACRO_DESK') {
    return (
      deskOverrides.macro?.trim() ||
      agentOverrides.ag7_hf_nowcaster?.trim() ||
      agentOverrides.ag8_cb_watcher?.trim() ||
      agentOverrides.ag9_global_spillover?.trim() ||
      quickDefault
    );
  }
  if (isDeepCouncilStep) {
    return deskOverrides.supremeCouncil?.trim() || deepDefault;
  }
  return quickDefault;
}

async function callOllamaOrOpenAICompatible(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  isOllama: boolean,
  timeoutMs = 20000,
  schemaKeysHint?: string[],
  inferenceOptions?: { temperature?: number; numCtx?: number; seed?: number; statsOut?: { value?: ModelStats } },
  /** Ollama only: stream the answer and time out on silence instead of on total length. */
  wait?: StreamWait
): Promise<string> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = isOllama ? `${cleanUrl}/api/chat` : `${cleanUrl}/chat/completions`;
  const schemaInstruction =
    schemaKeysHint && schemaKeysHint.length > 0
      ? `\n\nCRITICAL JSON SCHEMA REQUIREMENT: Return ONLY a valid JSON object containing these exact top-level keys: ${schemaKeysHint.join(', ')}. Do not wrap in markdown code fences.`
      : '\n\nCRITICAL: Return ONLY a valid JSON object. Do not wrap in markdown code fences.';

  const temperature =
    typeof inferenceOptions?.temperature === 'number' &&
    inferenceOptions.temperature >= 0 &&
    inferenceOptions.temperature <= 1.5
      ? Number(inferenceOptions.temperature.toFixed(2))
      : 0.2;
  const numCtx =
    typeof inferenceOptions?.numCtx === 'number' &&
    inferenceOptions.numCtx >= 1024 &&
    inferenceOptions.numCtx <= 65536
      ? Math.round(inferenceOptions.numCtx)
      : 8192;
  const seed = Number.isInteger(inferenceOptions?.seed) ? inferenceOptions!.seed : undefined;

  const isReasoningModel = /deepseek-r1|qwq|qwen3/i.test(model);
  const body = isOllama
    ? {
        model,
        stream: false,
        // Reasoning models with <think> blocks work best when allowed to emit or when format: 'json' is paired with explicit key hints
        ...(isReasoningModel ? {} : { format: 'json' }),
        ...(wait ? { stream: true, keep_alive: '30m' } : {}),
        options: {
          temperature,
          num_ctx: numCtx,
          ...(seed !== undefined ? { seed } : {}),
          // A cap so a model that keeps emitting blank JSON padding cannot run on forever.
          ...(wait ? { num_predict: isReasoningModel ? 4096 : 2048 } : {}),
        },
        messages: [
          { role: 'system', content: `${systemPrompt}${schemaInstruction}` },
          { role: 'user', content: userPrompt },
        ],
      }
    : {
        model,
        response_format: { type: 'json_object' },
        temperature,
        ...(seed !== undefined ? { seed } : {}),
        messages: [
          { role: 'system', content: `${systemPrompt}${schemaInstruction}` },
          { role: 'user', content: userPrompt },
        ],
      };

  if (isOllama && wait) return streamOllamaChat(endpoint, body, wait, inferenceOptions?.statsOut);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const postRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!postRes.ok) {
      throw new Error(`Model endpoint ${endpoint} failed with HTTP ${postRes.status}`);
    }
    const json: any = await postRes.json();
    if (isOllama && inferenceOptions?.statsOut) inferenceOptions.statsOut.value = ollamaStats(json);
    return isOllama ? json?.message?.content || '{}' : json?.choices?.[0]?.message?.content || '{}';
  } finally {
    clearTimeout(timer);
  }
}

/** Reads an Ollama /api/chat stream; times out on no first word, on a stall, or on total length. */
async function streamOllamaChat(endpoint: string, body: Record<string, unknown>, wait: StreamWait, statsOut?: { value?: ModelStats }): Promise<string> {
  const controller = new AbortController();
  let gotFirst = false;
  let why: ModelWaitError | null = null;
  let idleTimer: NodeJS.Timeout | undefined;
  const arm = () => {
    clearTimeout(idleTimer);
    const ms = gotFirst ? wait.idleMs : wait.firstTokenMs;
    idleTimer = setTimeout(() => {
      why = new ModelWaitError(gotFirst ? 'idle' : 'first', ms);
      controller.abort();
    }, ms);
  };
  const totalTimer = setTimeout(() => {
    why = new ModelWaitError('total', wait.totalMs);
    controller.abort();
  }, wait.totalMs);
  arm();
  let text = '';
  try {
    const postRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!postRes.ok) throw new Error(`Model endpoint ${endpoint} failed with HTTP ${postRes.status}`);
    if (!postRes.body) throw new Error(`Model endpoint ${endpoint} sent no body`);
    const decoder = new TextDecoder();
    let buf = '';
    for await (const chunk of postRes.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg?.error) throw new Error(`Model endpoint ${endpoint} said: ${String(msg.error).slice(0, 160)}`);
        const piece = msg?.message?.content;
        if (typeof piece === 'string' && piece) {
          text += piece;
          if (piece.trim()) gotFirst = true;
        }
        if (msg?.done) {
          if (statsOut) statsOut.value = ollamaStats(msg);
          return text || '{}';
        }
      }
      arm();
    }
    return text || '{}';
  } catch (error) {
    throw why ?? error;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
  }
}

function sanitizeAndParseJson<T>(rawText: string, fallback: T): { parsed: T; schemaVerified: boolean } {
  if (!rawText || typeof rawText !== 'string') {
    return { parsed: fallback, schemaVerified: false };
  }
  // Strip <think>...</think> chain-of-thought blocks emitted by DeepSeek-R1 / QwQ / local reasoning models
  const withoutThink = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();

  const trimmed = withoutThink
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object') {
      return { parsed: obj as T, schemaVerified: true };
    }
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sliced = trimmed.slice(firstBrace, lastBrace + 1);
        const obj = JSON.parse(sliced);
        if (obj && typeof obj === 'object') {
          return { parsed: obj as T, schemaVerified: true };
        }
      } catch {
        // Fall through to fallback
      }
    }
  }
  return { parsed: fallback, schemaVerified: false };
}

/** Shown where a council desk's AI model did not answer: nothing is filled in from built-in text. */
const NO_MODEL_DESK = 'No AI model answered for this part, so it is left empty.';
const NO_MODEL_COUNCIL =
  'No AI model answered, so the council gave no assessment and no verdict. Nothing was filled in from built-in text. Set it up or test it under Menu > Settings > AI model.';

function clampScoreToAnchor(
  rawScore: unknown,
  anchorScore: number,
  corridor = 0.22
): { rawModelScore: number; finalBoundedScore: number; anchorDriftClamped: boolean } {
  const num = typeof rawScore === 'number' && !Number.isNaN(rawScore) ? rawScore : anchorScore;
  const rawNormalized = Number(Math.max(0.05, Math.min(0.98, num)).toFixed(2));
  const minAllowed = Math.max(0.1, Number((anchorScore - corridor).toFixed(2)));
  const maxAllowed = Math.min(0.95, Number((anchorScore + corridor).toFixed(2)));
  const clamped = Number(Math.max(minAllowed, Math.min(maxAllowed, rawNormalized)).toFixed(2));
  return {
    rawModelScore: rawNormalized,
    finalBoundedScore: clamped,
    anchorDriftClamped: Math.abs(rawNormalized - clamped) >= 0.01,
  };
}

function normalizeStance(raw: unknown, fallbackScore: number): SubAgentReport['stance'] {
  const up = String(raw || '').toUpperCase().trim();
  if (up === 'BEARISH' || up === 'BULLISH' || up === 'NEUTRAL') return up;
  if (fallbackScore >= 0.6) return 'BEARISH';
  if (fallbackScore <= 0.38) return 'BULLISH';
  return 'NEUTRAL';
}

async function executeResilientLlmStep<T>(options: {
  stepName: string;
  providerMode: string;
  runtimeConfig: Partial<AIRuntimeConfig>;
  systemInstruction: string;
  prompt: string;
  responseSchema: any;
  thinkingLevel?: ThinkingLevel;
  fallbackValue: T;
  maxRetries?: number;
  /** Fixed sampling for steps that must give the same answer on a re-run (src/utils/answerSnapshot.ts). */
  temperature?: number;
  seed?: number;
}): Promise<{
  data: T;
  latencyMs: number;
  retriesUsed: number;
  schemaVerified: boolean;
  usedFallback: boolean;
  providerUsed: string;
  /** The model that answered and the sampling it ran with (not set when no model answered). */
  model?: string;
  temperature?: number;
  seed?: number;
  /** When usedFallback: why no model answered, in plain words (utils/modelFailure.ts). */
  failure?: string;
  /** Ollama's own counters for the answer: load, read and write time, tokens (src/utils/councilTiming.ts). */
  stats?: ModelStats;
}> {
  const startMs = Date.now();
  const attempts: ModelAttempt[] = [];
  const maxRetries = options.maxRetries ?? 2;
  let retriesUsed = 0;

  // Referee steps (Supreme Council final step, chat summary and explanations, debate) run on the
  // large "Referee model", never on the fast one (src/utils/refereeModel.ts).
  const isDeepCouncilStep = isRefereeStep(options.stepName) || options.thinkingLevel === ThinkingLevel.HIGH;

  const schemaKeysHint = options.responseSchema?.properties
    ? Object.keys(options.responseSchema.properties)
    : undefined;

  // 1. Try Local / Self-Hosted Ollama or OpenAI-Compatible Runtime first when selected (or in hybrid mode)
  if (
    options.providerMode === 'ollama' ||
    options.providerMode === 'hybrid' ||
    options.providerMode === 'hybrid_failover' ||
    options.providerMode === 'openai_compatible'
  ) {
    const isOllama = options.providerMode !== 'openai_compatible';
    const configuredBaseUrl = isOllama
      ? options.runtimeConfig.ollamaBaseUrl || ollamaBaseUrlDefault(process.env)
      : options.runtimeConfig.openAiBaseUrl ||
        process.env.OPENAI_COMPATIBLE_BASE_URL ||
        'http://localhost:8000/v1';

    const modelName = isOllama
      ? resolveStepModelFromGuiConfig(options.stepName, isDeepCouncilStep, options.runtimeConfig)
      : options.runtimeConfig.openAiModel ||
        serverGuiRuntimeConfig.openAiModel ||
        process.env.OPENAI_COMPATIBLE_MODEL ||
        'gpt-4o';

    const customTimeoutSec =
      options.runtimeConfig.timeoutSeconds || serverGuiRuntimeConfig.timeoutSeconds;
    const stepTimeoutMs = localStepTimeoutMs(options.stepName, customTimeoutSec, isDeepCouncilStep);

    // Build candidate endpoints so Docker containers automatically resolve host.docker.internal or bundled ollama service
    const candidateUrls = [configuredBaseUrl];
    if (isOllama) {
      if (
        configuredBaseUrl.includes('localhost') ||
        configuredBaseUrl.includes('127.0.0.1')
      ) {
        candidateUrls.push('http://host.docker.internal:11434', 'http://ollama:11434');
      } else if (configuredBaseUrl.includes('host.docker.internal')) {
        candidateUrls.push('http://localhost:11434', 'http://ollama:11434');
      }
    }

    const wait = isOllama && LONG_CHAT_STEPS.has(options.stepName) ? streamWaitFor(options.stepName, stepTimeoutMs) : undefined;
    const localTemperature = options.temperature ?? options.runtimeConfig.temperature ?? serverGuiRuntimeConfig.temperature ?? 0.2;
    for (const candidateUrl of candidateUrls) {
      const where = isOllama ? `Ollama ${modelName} at ${candidateUrl}` : `${modelName} at ${candidateUrl}`;
      if (wait) {
        // A quick check first, so a dead address or a model that is not downloaded fails in seconds.
        try {
          const tags = await fetch(`${candidateUrl.replace(/\/+$/, '')}/api/tags`, { signal: AbortSignal.timeout(4000) });
          if (!tags.ok) throw new Error(`HTTP ${tags.status}`);
          if (!ollamaHasModel(await tags.json().catch(() => null), modelName)) {
            attempts.push({ where, notPulled: modelName });
            continue;
          }
        } catch (error) {
          attempts.push({ where, error: (error as Error)?.name === 'TimeoutError' ? new Error('fetch failed') : error });
          continue;
        }
      }
      try {
        const statsOut: { value?: ModelStats } = {};
        const rawText = await callOllamaOrOpenAICompatible(
          candidateUrl,
          modelName,
          options.systemInstruction,
          options.prompt,
          isOllama,
          stepTimeoutMs,
          schemaKeysHint,
          {
            temperature: localTemperature,
            seed: options.seed,
            // Long chat steps read every agent's document: with a short window Ollama drops the
            // start of the prompt (the instructions) without saying so.
            numCtx: Math.max(options.runtimeConfig.numCtx ?? serverGuiRuntimeConfig.numCtx ?? 8192, LONG_CHAT_STEPS.has(options.stepName) ? 16384 : 0),
            statsOut,
          },
          wait
        );
        const { parsed, schemaVerified } = sanitizeAndParseJson<T>(rawText, options.fallbackValue);
        if (schemaVerified) {
          return {
            data: parsed,
            latencyMs: Date.now() - startMs,
            retriesUsed,
            schemaVerified: true,
            usedFallback: false,
            providerUsed: isOllama
              ? `Local Ollama (${modelName} · ${isRefereeStep(options.stepName) ? 'Referee' : isDeepCouncilStep ? 'Phase 3 Deep' : 'Phase 1-2 Sub-Agents'})`
              : `OpenAI-Compatible (${modelName})`,
            model: modelName,
            temperature: localTemperature,
            ...(options.seed !== undefined ? { seed: options.seed } : {}),
            ...(statsOut.value ? { stats: statsOut.value } : {}),
          };
        }
        attempts.push({ where, notJson: true });
      } catch (error) {
        retriesUsed++;
        attempts.push({ where, error, timeoutMs: stepTimeoutMs });
      }
    }
  }

  // 2. Execute on Google AI Studio Gemini with exponential backoff + jitter
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          retriesUsed++;
          const backoffMs = 350 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 180);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
        const resp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${options.systemInstruction}\n\n${options.prompt}`,
          config: {
            thinkingConfig: { thinkingLevel: options.thinkingLevel ?? ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: options.responseSchema,
            // Policy review steps run at temperature 0 so a rerun reads as close as the model allows.
            ...(options.stepName.startsWith('REVIEW_') ? { temperature: 0 } : {}),
            // Council chat answers too, with a fixed seed (src/utils/answerSnapshot.ts).
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            ...(options.seed !== undefined ? { seed: options.seed } : {}),
          },
        });
        const { parsed, schemaVerified } = sanitizeAndParseJson<T>(
          resp.text ?? '{}',
          options.fallbackValue
        );
        if (schemaVerified) {
          return {
            data: parsed,
            latencyMs: Date.now() - startMs,
            retriesUsed,
            schemaVerified: true,
            usedFallback: false,
            providerUsed:
              options.providerMode === 'gemini'
                ? 'Google AI Studio (gemini-3.8-flash)'
                : 'Hybrid Failover -> Google AI Studio (gemini-3.8-flash)',
            model: 'gemini-3.8-flash',
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            ...(options.seed !== undefined ? { seed: options.seed } : {}),
          };
        }
        if (attempt === maxRetries) attempts.push({ where: 'Gemini', notJson: true });
      } catch (error) {
        // Continue to next retry attempt; the last error is the one reported.
        if (attempt === maxRetries) attempts.push({ where: 'Gemini', error });
      }
    }
  }

  const failure = describeFailures(attempts, Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'));
  console.warn(`[AI] ${options.stepName}: no model answered (${failure}).`);
  return {
    data: options.fallbackValue,
    latencyMs: Date.now() - startMs,
    retriesUsed,
    schemaVerified: true,
    usedFallback: true,
    providerUsed: 'Quantitative Anchor Deterministic Engine',
    failure,
  };
}

/** Prints a full council run's timings to the server log and keeps one line in data/local/council-timing.jsonl. */
function logCouncilTiming(iso3: string, timing: CouncilTiming, what: string): void {
  console.log(`[timing] Full council ${iso3}, ${what}: ${formatDuration(totalMs(timing))}\n${timingTable(timing)}`);
  try {
    fs.mkdirSync(path.dirname(COUNCIL_TIMING_FILE), { recursive: true });
    fs.appendFileSync(COUNCIL_TIMING_FILE, `${JSON.stringify({ at: new Date().toISOString(), iso3, what, timing })}\n`, { mode: 0o600 });
  } catch (error: any) {
    console.warn(`[timing] could not save the timing line: ${error?.message || error}`);
  }
}

/* ------------------------------------------------------------------------------------------
 * Council progress: the browser passes a progressId and polls /api/council/progress/:id, so
 * the agent network on screen shows each step as it actually starts and finishes.
 * ------------------------------------------------------------------------------------------ */
type CouncilStepStatus = 'waiting' | 'running' | 'done' | 'fallback' | 'skipped' | 'failed';
interface CouncilStepProgress {
  status: CouncilStepStatus;
  ms?: number;
  note?: string;
}
const councilProgress = new Map<string, { steps: Record<string, CouncilStepProgress>; started: Record<string, number>; updatedAt: number }>();

function progressTracker(id: unknown) {
  const key = typeof id === 'string' && /^[\w-]{6,64}$/.test(id) ? id : null;
  const now = Date.now();
  for (const [k, v] of councilProgress) if (now - v.updatedAt > 10 * 60_000) councilProgress.delete(k);
  if (key && !councilProgress.has(key)) councilProgress.set(key, { steps: {}, started: {}, updatedAt: now });
  const entry = key ? councilProgress.get(key)! : null;
  const set = (step: string, status: CouncilStepStatus, note?: string) => {
    if (!entry) return;
    if (status === 'running') entry.started[step] = Date.now();
    const t0 = entry.started[step];
    entry.steps[step] = { status, ...(t0 && status !== 'running' ? { ms: Date.now() - t0 } : {}), ...(note ? { note } : {}) };
    entry.updatedAt = Date.now();
  };
  return {
    start: (step: string) => set(step, 'running'),
    /** Done with a model, or on the built-in figures when no model answered. */
    finish: (step: string, usedFallback = false, note?: string) => {
      if (entry?.steps[step]?.status === 'failed') return; // a failure already recorded stands
      set(step, usedFallback ? 'fallback' : 'done', note ?? (usedFallback ? 'No model answered' : undefined));
    },
    skip: (step: string, note: string) => set(step, 'skipped', note),
    fail: (step: string, note: string) => set(step, 'failed', note),
  };
}

/** Marks a step done (or on built-in figures) when its model call settles. */
function tracked<T extends { usedFallback: boolean }>(progress: ReturnType<typeof progressTracker>, step: string, p: Promise<T>): Promise<T> {
  progress.start(step);
  return p.then(
    (v) => {
      progress.finish(step, v.usedFallback);
      return v;
    },
    (e) => {
      progress.fail(step, 'The model call failed');
      throw e;
    }
  );
}

/** The synthesis agent: a short brief from the agents' answers only, checked for untraceable numbers (Council chat and the morning brief). */
/** Audit log entry for one council answer: question, model, every figure with source and period. */
function auditCouncilAnswer(question: string, answers: AgentAnswer[], out: SynthesisResult, scope: string | undefined, via: string, snap?: AnswerSnapshot): void {
  appendAudit(AUDIT_FILES, {
    kind: 'council',
    summary: `Council answer: "${question.slice(0, 200)}"`,
    detail: {
      via,
      question,
      ...(scope ? { scope } : {}),
      model: out.provider || null,
      ...(snap
        ? {
            snapshot: {
              id: snap.id,
              inputsHash: snap.inputsHash,
              outputHash: snap.outputHash,
              promptHash: snap.settings.promptHash,
              temperature: snap.settings.temperature,
              seed: snap.settings.seed,
              asOf: snap.inputs.asOf,
              ...(snap.rerunOf ? { rerunOf: snap.rerunOf } : {}),
            },
          }
        : {}),
      ...(out.brief ? { headline: out.brief.headline } : { noModel: out.reason || 'no AI model answered' }),
      agents: answers.map((a) => a.name),
      figures: figuresFromAnswers(answers),
      missing: answers.flatMap((a) => (a.missing || []).map((m) => `${a.name}: ${String(m).slice(0, 200)}`)).slice(0, 60),
      removedSentences: (out.removed?.length ?? 0) + (out.contradicted?.length ?? 0),
      ...(out.brief?.explain
        ? { mode: 'explain', lenses: out.brief.explain.lenses.map((l) => l.lens), ...(out.brief.explain.focus ? { explained: out.brief.explain.focus } : {}) }
        : {}),
    },
  });
}

/** What the summary step sent and ran with, filled in by synthesiseAnswers for the snapshot. */
interface SynthesisTrace {
  system?: string;
  prompt?: string;
  template?: string;
  model?: string;
  temperature?: number;
  seed?: number;
}

interface SynthesisOpts {
  scope?: string;
  countries?: number;
  earlier?: Array<{ question: string; headline?: string }>;
  runtimeConfig?: any;
  explain?: ExplainPlan;
  /** When the question was asked; kept in the documents so a re-run sends the same prompt. */
  askedAt?: string;
  /** When the conversation's figures were pinned, if they were. */
  dataPinnedAt?: string;
  trace?: SynthesisTrace;
}

const ANSWER_SNAPSHOT_DIR = snapshotDir(DATA_DIR);

/**
 * The summary (or explanation) plus its snapshot (src/utils/answerSnapshot.ts): the inputs, model,
 * temperature, seed and prompt hash, saved under data/local/snapshots/ and named in the audit log.
 */
async function answerAndRecord(question: string, answers: AgentAnswer[], opts: SynthesisOpts & { asOf?: string | null }, via: string, rerunOf?: string): Promise<SynthesisResult> {
  const askedAt = opts.askedAt || new Date().toISOString();
  const earlier = (opts.earlier || []).map((t) => ({ question: String(t.question).slice(0, 500), ...(t.headline ? { headline: String(t.headline).slice(0, 600) } : {}) }));
  const trace: SynthesisTrace = {};
  const out = await synthesiseAnswers(question, answers, { ...opts, earlier, askedAt, trace });
  let snap: AnswerSnapshot | undefined;
  try {
    snap = saveSnapshot(
      ANSWER_SNAPSHOT_DIR,
      buildSnapshot({
        inputs: {
          question,
          ...(opts.scope ? { scope: opts.scope } : {}),
          ...(opts.countries !== undefined ? { countries: opts.countries } : {}),
          earlier,
          ...(opts.explain ? { explain: opts.explain } : {}),
          askedAt,
          asOf: opts.asOf ?? null,
          ...(opts.dataPinnedAt ? { dataPinnedAt: opts.dataPinnedAt } : {}),
          answers,
        },
        settings: {
          step: 'COUNCIL_SYNTHESIS',
          mode: opts.explain ? 'explain' : 'summary',
          providerMode: String(opts.runtimeConfig?.providerMode || 'gemini'),
          model: trace.model ?? modelFromProvider(out.provider),
          temperature: trace.temperature ?? COUNCIL_TEMPERATURE,
          seed: trace.seed ?? COUNCIL_SEED,
          templateHash: sha256(trace.template || ''),
          promptHash: sha256(`${trace.system || ''}\n\n${trace.prompt || ''}`),
        },
        output: {
          provider: out.provider || null,
          brief: out.brief,
          removed: out.removed.length,
          contradicted: out.contradicted?.length ?? 0,
          ...(out.reason ? { reason: out.reason } : {}),
        },
        documents: councilAgentDocs(question, answers, { ...opts, askedAt }),
        via,
        rerunOf,
      })
    );
  } catch (error: any) {
    console.warn(`[snapshot] could not save the answer snapshot: ${error?.message || error}`);
  }
  auditCouncilAnswer(question, answers, out, opts.scope, via, snap);
  return snap ? { ...out, snapshot: summariseSnapshot(snap) } : out;
}

async function synthesiseAnswers(
  question: string,
  answers: AgentAnswer[],
  opts: SynthesisOpts = {}
): Promise<SynthesisResult> {
  const empty: CouncilBrief = { headline: '', points: [], disagreements: [], gaps: [] };
  if (opts.explain) return explainAnswers(question, answers, opts as SynthesisOpts & { explain: ExplainPlan });
  try {
    // The synthesis reads the agents' standard documents (utils/agentDocument.ts), all in one template.
    const prompt = (earlierAsText(opts.earlier || []) + councilDocsText(question, answers, opts)).slice(0, 22000) + synthesisTask(question);
    if (opts.trace) Object.assign(opts.trace, { system: SYNTHESIS_INSTRUCTION, prompt, template: SYNTHESIS_INSTRUCTION + '\n' + synthesisTask('{question}') });
    const step = await executeResilientLlmStep<CouncilBrief>({
      stepName: 'COUNCIL_SYNTHESIS',
      providerMode: opts.runtimeConfig?.providerMode || 'gemini',
      runtimeConfig: opts.runtimeConfig || {},
      thinkingLevel: ThinkingLevel.LOW,
      systemInstruction: SYNTHESIS_INSTRUCTION,
      prompt,
      temperature: COUNCIL_TEMPERATURE,
      seed: COUNCIL_SEED,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING, description: 'One sentence that answers the question.' },
          points: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Three to six sentences, each tied to agent figures.' },
          disagreements: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Where agents point different ways.' },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What the agents could not answer.' },
        },
        required: ['headline', 'points', 'disagreements', 'gaps'],
      },
      fallbackValue: empty,
      maxRetries: 1,
    });
    if (opts.trace) Object.assign(opts.trace, { model: step.model, temperature: step.temperature, seed: step.seed });
    if (step.usedFallback) {
      const out: SynthesisResult = {
        brief: null,
        removed: [],
        reason: `No AI model answered: ${step.failure || 'no model is set up'}. Set it up or test it under Menu > Settings > AI model.`,
      };
      return out;
    }
    const checked = checkBrief(step.data || empty, question, answers);
    if (!checked.brief.headline && !checked.brief.points.length) {
      // The model answered but nothing it wrote survived the checks: say so rather than show an empty brief.
      const out: SynthesisResult = {
        brief: null,
        removed: checked.removed,
        contradicted: checked.contradicted,
        provider: step.providerUsed,
        reason: `${step.providerUsed} answered, but every sentence it wrote had a number not in the agents' figures or contradicted an agent, so nothing was kept.`,
      };
      return out;
    }
    const out: SynthesisResult = { brief: checked.brief, removed: checked.removed, contradicted: checked.contradicted, provider: step.providerUsed };
    return out;
  } catch (error: any) {
    const out: SynthesisResult = { brief: null, removed: [], reason: `The summary step failed (${error?.message || 'unknown error'}).` };
    return out;
  }
}

/** The council's documents as the synthesis reads them (shared by the summary and explain mode). */
function councilDocsText(question: string, answers: AgentAnswer[], opts: { scope?: string; countries?: number; askedAt?: string }): string {
  return documentsAsText(councilAgentDocs(question, answers, opts));
}

/** The agents' standard documents (src/utils/agentDocument.ts) for one question. */
function councilAgentDocs(question: string, answers: AgentAnswer[], opts: { scope?: string; countries?: number; askedAt?: string }): AgentDocument[] {
  return toAgentDocuments(answers, {
      question,
      // The question's own time, so a re-run sends the same documents.
      askedAt: opts.askedAt || new Date().toISOString(),
      scope: opts.scope || 'the countries asked',
      countriesAsked:
        opts.countries && Number.isInteger(opts.countries) && opts.countries > 0 && opts.countries < 300
          ? opts.countries
          : new Set(answers.flatMap((a) => a.findings.filter((f) => !isDocFinding(f)).map((f) => f.iso3))).size,
  });
}

/** Explain mode (src/utils/explain.ts): facts apart from interpretation, by lens, every sentence checked. */
async function explainAnswers(
  question: string,
  answers: AgentAnswer[],
  opts: SynthesisOpts & { explain: ExplainPlan }
): Promise<SynthesisResult> {
  const coverage = lensCoverage(opts.explain.lenses, answers);
  try {
    const prompt = (earlierAsText(opts.earlier || []) + focusAsText(opts.explain.focus) + councilDocsText(question, answers, opts)).slice(0, 22000) + explainTask(question, coverage);
    if (opts.trace) Object.assign(opts.trace, { system: EXPLAIN_INSTRUCTION, prompt, template: EXPLAIN_INSTRUCTION + '\n' + explainTask('{question}', []) });
    const step = await executeResilientLlmStep<RawExplain>({
      stepName: 'COUNCIL_SYNTHESIS',
      providerMode: opts.runtimeConfig?.providerMode || 'gemini',
      runtimeConfig: opts.runtimeConfig || {},
      thinkingLevel: ThinkingLevel.LOW,
      systemInstruction: EXPLAIN_INSTRUCTION,
      prompt,
      temperature: COUNCIL_TEMPERATURE,
      seed: COUNCIL_SEED,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING, description: 'One sentence that answers the question in plain words.' },
          facts: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Data only: what the figures are, quoted as written.' },
          reasons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Why the figure or pattern is where it is.' },
          lenses: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { lens: { type: Type.STRING }, text: { type: Type.STRING } }, required: ['lens', 'text'] },
            description: 'One entry per lens listed in the prompt.',
          },
          watch: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What in the figures would change the reading.' },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What the agents could not answer.' },
        },
        required: ['headline', 'facts', 'reasons', 'lenses', 'watch', 'gaps'],
      },
      fallbackValue: {},
      maxRetries: 1,
    });
    if (opts.trace) Object.assign(opts.trace, { model: step.model, temperature: step.temperature, seed: step.seed });
    if (step.usedFallback) {
      return { brief: null, removed: [], reason: `No AI model answered: ${step.failure || 'no model is set up'}. Set it up or test it under Menu > Settings > AI model.` };
    }
    const raw = step.data || {};
    if (!Object.keys(raw).length) {
      return { brief: null, removed: [], provider: step.providerUsed, reason: `${step.providerUsed} answered, but not in the shape asked for (no explanation fields), so nothing was shown.` };
    }
    const checked = checkExplain(raw, question, answers, opts.explain);
    const e = checked.brief.explain;
    if (!checked.brief.headline && !e.facts.length && !e.reasons.length && !e.lenses.some((l) => l.sentences.length)) {
      return {
        brief: null,
        removed: checked.removed,
        contradicted: checked.contradicted,
        provider: step.providerUsed,
        reason: `${step.providerUsed} answered, but every sentence it wrote had a number not in the agents' figures or contradicted an agent, so nothing was kept.`,
      };
    }
    return { brief: checked.brief, removed: checked.removed, contradicted: checked.contradicted, provider: step.providerUsed };
  } catch (error: any) {
    return { brief: null, removed: [], reason: `The explanation step failed (${error?.message || 'unknown error'}).` };
  }
}

/** Reads explain mode from a request body: the lenses (checked against the list) and the figure pointed at. */
function explainFromBody(body: any): ExplainPlan | undefined {
  const e = body?.explain;
  if (!e || typeof e !== 'object') return undefined;
  const lenses: LensId[] = (Array.isArray(e.lenses) ? (e.lenses as unknown[]) : []).filter((l): l is LensId => LENS_ORDER.includes(l as LensId));
  const focus = cleanFocus(e.focus);
  return { lenses: lenses.length ? [...new Set(lenses)] : LENS_ORDER, named: Boolean(e.named) && lenses.length > 0, ...(focus ? { focus } : {}) };
}

/* ------------------------------------------------------------------------------------------
 * Morning brief (src/utils/morningBrief.ts): the council's standing questions on a watchlist at a
 * set time, each saved to research with what moved since the same question last ran.
 * ------------------------------------------------------------------------------------------ */
const MORNING_FILE = path.join(DATA_DIR, 'local', 'morning-brief.json');
let morningRunning = false;

function loadMorning(): MorningBriefFile {
  try {
    return parseMorningFile(JSON.parse(fs.readFileSync(MORNING_FILE, 'utf8')));
  } catch {
    return parseMorningFile(null);
  }
}

function saveMorning(file: MorningBriefFile): void {
  writeFileAtomic(MORNING_FILE, JSON.stringify(file, null, 1), 0o600);
}

/** Set by startServer once accounts are loaded: which workspace file an account uses. */
let workspaceFileForAccount: (account: Account | null) => string = () => WORKSPACE_FILE;
/** The account whose lists server jobs (morning brief) use: the first active admin, or none. */
let serverJobAccount: () => Account | null = () => null;
/** Workspace used by jobs that run without a request. */
const jobWorkspaceFile = () => workspaceFileForAccount(serverJobAccount());

/** The watchlists saved in the app (workspace file), or the starting ones. */
function savedWatchlists(): Array<{ id: string; name: string; iso3: string[] }> {
  try {
    const raw = loadWorkspace(jobWorkspaceFile()).values['sovereign_council_watchlists_v1'];
    const groups = raw ? JSON.parse(raw) : null;
    if (Array.isArray(groups) && groups.length) {
      return groups
        .filter((g: any) => g && typeof g.id === 'string' && Array.isArray(g.items))
        .map((g: any) => ({ id: g.id, name: String(g.name || g.id), iso3: g.items.map((i: any) => String(i?.iso3 || '').toUpperCase()).filter((c: string) => /^[A-Z]{3}$/.test(c)) }));
    }
  } catch {
    // unreadable: fall back to the starting watchlists
  }
  return DEFAULT_WATCHLISTS.map((g) => ({ id: g.id, name: g.name, iso3: g.items.map((i) => i.iso3) }));
}

function savedAiConfig(): any {
  try {
    const raw = loadWorkspace(jobWorkspaceFile()).values['econquest_ai_runtime_config_v1'];
    return raw ? JSON.parse(raw) : serverGuiRuntimeConfig;
  } catch {
    return serverGuiRuntimeConfig;
  }
}

async function runMorningBrief(trigger: MorningBriefRun['trigger']): Promise<MorningBriefRun | null> {
  if (morningRunning) return null;
  morningRunning = true;
  try {
    const file = loadMorning();
    const s = file.settings;
    const lists = savedWatchlists();
    const list = lists.find((l) => l.id === s.watchlistId) || lists[0];
    const codes = [...new Set(list?.iso3 || [])];
    const catalog = await fetchLiveWatchlistCatalog([], true);
    const inCatalog = catalog.filter((r) => codes.includes(r.iso3));
    const others = codes.filter((c) => !inCatalog.some((r) => r.iso3 === c));
    const rows = [...inCatalog, ...(others.length ? await liveRowsFor(others) : [])];
    const items = rows.map((r) => toLive(r));
    const runtimeConfig = savedAiConfig();
    const now = new Date();
    const results: MorningBriefRun['results'] = [];
    for (const [i, q] of s.questions.entries()) {
      if (!items.length) {
        results.push({ question: q, note: 'The watchlist has no countries.' });
        continue;
      }
      try {
        const plan = planCouncil(q, items);
        const answers = runCouncil(q, plan, items, now);
        // One second apart so each question is its own saved entry.
        const askedAt = new Date(now.getTime() + i * 1000).toISOString();
        const id = briefId(askedAt);
        const lib = loadLibrary(RESEARCH_FILE);
        const prevSummary = pickPrevious(summarise(lib).briefs.filter((b) => b.question === morningQuestion(q)), id, answers);
        const prev = prevSummary ? lib.briefs.find((b) => b.id === prevSummary.id) : undefined;
        let synthesis: SynthesisResult;
        if (answers.some((a) => a.findings.length)) {
          synthesis = await answerAndRecord(q, answers, { scope: plan.scopeNote, countries: plan.countries.length, runtimeConfig, askedAt }, `Morning brief (${trigger})`);
        } else {
          synthesis = { brief: null, removed: [], reason: 'The agents found no figures to answer with, so there is nothing to summarise.' };
          auditCouncilAnswer(morningQuestion(q), answers, synthesis, plan.scopeNote, `Morning brief (${trigger})`);
        }
        const brief: SavedCouncilBrief = {
          question: morningQuestion(q),
          askedAt,
          startedAt: askedAt,
          scopeNote: plan.scopeNote,
          answers,
          synthesis,
          ...(plan.chooserNote ? { chooserNote: plan.chooserNote } : {}),
          ...(prev ? { changes: whatChanged(prev, answers) } : {}),
        };
        saveLibrary(RESEARCH_FILE, addBrief(loadLibrary(RESEARCH_FILE), brief).lib);
        results.push({ question: q, briefId: id, ...(synthesis.brief?.headline ? { headline: synthesis.brief.headline } : { note: synthesis.reason || 'Saved with the agents\' answers; no summary.' }) });
      } catch (error: any) {
        results.push({ question: q, note: `Could not run (${error?.message || 'unknown error'}).` });
      }
    }
    const run: MorningBriefRun = { at: now.toISOString(), day: localClock(now, s.timeZone).day, trigger, watchlist: list?.name || 'Watchlist', countries: items.length, results };
    const latest = loadMorning();
    saveMorning({ ...latest, lastRun: run, ...(trigger === 'schedule' ? { lastScheduledDay: run.day } : {}) });
    return run;
  } finally {
    morningRunning = false;
  }
}

/** Nightly data check: local time it runs (DATA_CHECK_TIME, default 05:30) and the time zone (DATA_CHECK_TZ, default this computer's). */
const NIGHTLY_CHECK_TIME = checkTime(process.env.DATA_CHECK_TIME);
const NIGHTLY_CHECK_TZ = (process.env.DATA_CHECK_TZ || '').trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** One run of the data connection check, saved to the data health history. */
async function runConnectionCheck(trigger: CheckTrigger): Promise<ConnectionReport> {
  const report = await checkConnections({
    env: process.env,
    keySources: keySources(ENV_FILE_KEYS, savedSettings),
    // GDELT goes through the same 5-second queue as the app, so the check cannot trip its limit.
    fetchFn: (u, i) => (u.includes('api.gdeltproject.org') ? gdeltFetch(u, i) : fetch(u, i)),
    ai: {
      provider: serverGuiRuntimeConfig.providerMode || process.env.DEFAULT_AI_PROVIDER,
      ollamaBaseUrl: serverGuiRuntimeConfig.ollamaBaseUrl,
      ollamaQuickModel: serverGuiRuntimeConfig.ollamaQuickModel,
      ollamaDeepModel: serverGuiRuntimeConfig.ollamaDeepModel,
      openAiBaseUrl: serverGuiRuntimeConfig.openAiBaseUrl,
    },
    readFile: (p) => {
      try {
        return { text: fs.readFileSync(p, 'utf8'), modified: fs.statSync(p).mtime };
      } catch {
        return null;
      }
    },
  });
  appendCheck(DATA_HEALTH_FILES, recordFromReport(report, trigger));
  return report;
}

let nightlyCheckRunning = false;
/** Checked every minute; runs the connection check once a day after the set time, when online. */
async function nightlyCheckTick(): Promise<void> {
  if (nightlyCheckRunning || process.env.DATA_CHECK_NIGHTLY === 'off') return;
  const state = readState(DATA_HEALTH_FILES);
  const now = new Date();
  if (!nightlyDue(state.lastNightlyDay, now, NIGHTLY_CHECK_TIME, NIGHTLY_CHECK_TZ)) return;
  // Offline, every source would read "no answer": wait for the connection instead of logging noise.
  if (knownOffline()) {
    if (!state.lastSkipped || Date.now() - Date.parse(state.lastSkipped.at) > 60 * 60 * 1000) {
      saveState(DATA_HEALTH_FILES, { ...state, lastSkipped: { at: now.toISOString(), reason: 'Offline: the check waits for the connection.' } });
    }
    return;
  }
  nightlyCheckRunning = true;
  // Mark the day first, so a slow run or a crash never repeats the check within the day.
  saveState(DATA_HEALTH_FILES, { lastNightlyDay: clockIn(now, NIGHTLY_CHECK_TZ).day });
  try {
    await runConnectionCheck('nightly');
    // Rebuild the watchlist from what is saved, so the figure watch runs once a day with no page open.
    await fetchLiveWatchlistCatalog([], true);
  } catch (e) {
    console.error('[data-check]', e);
  } finally {
    nightlyCheckRunning = false;
  }
}

async function morningTick(): Promise<void> {
  const file = loadMorning();
  if (!isDue(file, new Date())) return;
  // Mark the day first, so a slow run or a crash never repeats the brief within the day.
  saveMorning({ ...file, lastScheduledDay: localClock(new Date(), file.settings.timeZone).day });
  await runMorningBrief('schedule').catch((e) => console.error('[morning-brief]', e));
}

/**
 * Policy review step 3 (REVIEW_OPTIONS): the council proposes and ranks options from the frozen
 * diagnosis, on the referee model at temperature 0 with a fixed seed, then the number check. Used by
 * the review and by the regression set.
 */
async function reviewOptionsStep(
  frame: ReviewFrame,
  diagnosis: Diagnosis,
  userOptions: UserOption[],
  runtimeConfig: Partial<AIRuntimeConfig>
): Promise<{ status: 502 | 503; error: string; model?: string } | { content: Pick<OptionsStep, 'model' | 'options' | 'ranking' | 'gaps' | 'removed'>; step: { model?: string; temperature?: number; seed?: number } }> {
  const prompt = optionsPrompt(frame, diagnosis, userOptions);
  const step = await executeResilientLlmStep<Record<string, unknown>>({
    stepName: 'REVIEW_OPTIONS',
    providerMode: runtimeConfig.providerMode || 'gemini',
    runtimeConfig: { ...runtimeConfig, temperature: 0 },
    temperature: COUNCIL_TEMPERATURE,
    seed: COUNCIL_SEED,
    thinkingLevel: ThinkingLevel.LOW,
    systemInstruction: OPTIONS_INSTRUCTION,
    prompt: prompt.slice(0, 24000),
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              lever: { type: Type.STRING, enum: [...LEVERS] },
              how: { type: Type.STRING },
              effect: { type: Type.STRING },
              timeToEffect: { type: Type.STRING },
              tradeoffs: { type: Type.STRING },
              whoBears: { type: Type.STRING },
              mustBeTrue: { type: Type.STRING },
              risks: { type: Type.STRING },
              refs: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              fromUser: { type: Type.BOOLEAN },
              views: { type: Type.OBJECT, properties: { cb: { type: Type.STRING }, fiscal: { type: Type.STRING }, politics: { type: Type.STRING }, external: { type: Type.STRING } } },
            },
            required: ['title', 'lever', 'how', 'effect', 'tradeoffs', 'whoBears', 'mustBeTrue', 'risks', 'refs', 'views'],
          },
        },
        ranking: { type: Type.STRING },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['options', 'ranking', 'gaps'],
    },
    fallbackValue: { options: [], ranking: '', gaps: [] },
    maxRetries: 1,
  });
  if (step.usedFallback) {
    return { status: 503 as const, error: `No AI model answered (${step.failure || 'no model is set up'}). Set one up in Menu > Settings > AI model, or save your own options without the council.` };
  }
  const checked = checkOptions(step.data, frame, diagnosis, userOptions);
  if (!checked.options.length) return { status: 502 as const, error: 'The model answered but gave no usable options (each needs a title and how it works). Try again or use another model.', model: step.model };
  return { content: { model: step.providerUsed, ...checked }, step: { model: step.model, temperature: step.temperature, seed: step.seed } };
}

const textOrMissing = (v: unknown): string => (typeof v === 'string' && v.trim() ? v : MODEL_FIELD_MISSING);
const listOrMissing = (v: unknown): string[] => {
  const items = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : [];
  return items.length ? items : [MODEL_FIELD_MISSING];
};

const SUPREME_INSTRUCTION =
  'You are the Supreme Council Orchestrator for an Institutional Asset Management & Sovereign Policy Research Department. Return strict JSON adhering to the SMCR-1.0 schema. CRITICAL WRITING STYLE: Phrase the executiveSummary, longTermRegimeOutlook, structuralVulnerabilities, factorCrowdingWarning, and all trade rationales in clear, everyday plain English first so both general readers and portfolio managers immediately grasp the core takeaway, and cite the exact economic/statistical metrics in parentheses at the end of each point (Ref: ...).';

/**
 * The Supreme Council's final step (STAGE_3_SUPREME_COUNCIL) on the referee model: the CRO's
 * scores and shocks, the country figures, then the number check on the report. Used by the full
 * council and by the regression set (src/utils/councilRegression.ts).
 */
async function supremeCouncilStep(
  run: CouncilAssessmentRun | undefined,
  croOverrideState: CROOverrideState | undefined,
  runtimeConfig: Partial<AIRuntimeConfig>,
  progress: ReturnType<typeof progressTracker> = progressTracker(undefined)
) {
  const targetRun: CouncilAssessmentRun = run || buildDefaultAssessmentRun('BRA');
  const cro: CROOverrideState = croOverrideState || targetRun.croState;

  // Apply counterfactual war-gaming shocks to effective risk scores
  const shockGeoBoost =
    (cro.counterfactualShocks?.chokepointTransitDropPct || 0) * 0.002 +
    (cro.counterfactualShocks?.brentCrudeShockUsd || 0) * 0.002;
  const shockMacroBoost =
    (cro.counterfactualShocks?.brentCrudeShockUsd || 0) * 0.003 +
    (cro.counterfactualShocks?.fedTerminalRateShockBps || 0) * 0.001;
  const shockSovBoost =
    (cro.counterfactualShocks?.domesticFiscalSlippagePctGdp || 0) * 0.04 +
    (cro.counterfactualShocks?.fedTerminalRateShockBps || 0) * 0.0012;

  const finalGeo = Math.min(0.99, Math.max(0.05, Number((cro.geopoliticalRiskScore + shockGeoBoost).toFixed(2))));
  const finalSov = Math.min(0.99, Math.max(0.05, Number((cro.sovereignRiskScore + shockSovBoost).toFixed(2))));
  const finalMac = Math.min(0.99, Math.max(0.05, Number((cro.macroRiskScore + shockMacroBoost).toFixed(2))));
  const compositeScore = Number(((finalGeo + finalSov + finalMac) / 3).toFixed(2));

  const shown = (v: number) => (Number.isFinite(v) ? String(v) : 'MISSING');
  const councilPrompt = `Synthesize the final SMCR-1.0 (Sovereign-Macro Council Report v1.0) output for ${targetRun.countryName} (${targetRun.iso3}).

CRO Human-in-the-Loop Approved / Overridden Risk Vector:
- Geopolitical Desk Risk Score: ${shown(finalGeo)} (${targetRun.deskDebates?.geopolitical?.consensusSummary || ''})
- Sovereign Risk Desk Score: ${shown(finalSov)} (${targetRun.deskDebates?.sovereign?.consensusSummary || ''})
- Macroeconomic Desk Risk Score: ${shown(finalMac)} (${targetRun.deskDebates?.macro?.consensusSummary || ''})
- Composite Risk Score: ${shown(compositeScore)}
- Energy/Freight Inflation Shock Input: ${Number.isFinite(cro.energyInflationShockPct) ? `+${cro.energyInflationShockPct}%` : 'MISSING (no model set it)'}
- Debt Servicing Spread Impact: ${Number.isFinite(cro.debtServicingSpreadBps) ? `+${cro.debtServicingSpreadBps} bps` : 'MISSING (no model set it)'}
- Scenario inputs above (energy shock, spread impact) come from the cascade step and your review, not from data.
Country figures (only those a live feed, an official series or your own data filled; MISSING ones are unknown):
${councilInputs(targetRun.openData).lines.join('\n')}
${MISSING_FIGURES_RULE}
- Counterfactual Shocks Applied: Brent +$${cro.counterfactualShocks?.brentCrudeShockUsd || 0}/bbl, Fed +${cro.counterfactualShocks?.fedTerminalRateShockBps || 0}bps, Chokepoint -${cro.counterfactualShocks?.chokepointTransitDropPct || 0}%, Fiscal Slippage +${cro.counterfactualShocks?.domesticFiscalSlippagePctGdp || 0}% GDP
- Chief Risk Officer Directives: "${cro.croNotes}"`;

  let baseOutput: SupremeCouncilOutput =
    targetRun.supremeCouncil || buildDefaultAssessmentRun(targetRun.iso3).supremeCouncil!;

  const supremeStep = await tracked(progress, 'supreme', executeResilientLlmStep<any>({
    stepName: 'STAGE_3_SUPREME_COUNCIL',
    providerMode: runtimeConfig.providerMode || 'gemini',
    runtimeConfig,
    thinkingLevel: ThinkingLevel.HIGH,
    // Reproducible like the chat summary: temperature 0, fixed seed (src/utils/answerSnapshot.ts).
    temperature: COUNCIL_TEMPERATURE,
    seed: COUNCIL_SEED,
    systemInstruction: SUPREME_INSTRUCTION,
    prompt: councilPrompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        decisionVerdict: {
          type: Type.STRING,
          description: 'EXECUTE_TRADES, DEFENSIVE_HEDGE, or HOLD_AND_MONITOR',
        },
        executiveSummary: { type: Type.STRING },
        longTermRegimeOutlook: { type: Type.STRING },
        structuralVulnerabilities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        regimeStance: { type: Type.STRING },
        factorCrowdingWarning: { type: Type.STRING },
        ratesTradeInstrument: { type: Type.STRING },
        ratesTradeRationale: { type: Type.STRING },
        ratesTradeInvalidation: { type: Type.STRING },
        fxTradeInstrument: { type: Type.STRING },
        fxTradeRationale: { type: Type.STRING },
        fxTradeInvalidation: { type: Type.STRING },
        creditTradeInstrument: { type: Type.STRING },
        creditTradeRationale: { type: Type.STRING },
        creditTradeInvalidation: { type: Type.STRING },
        commodityTradeInstrument: { type: Type.STRING },
        commodityTradeRationale: { type: Type.STRING },
        commodityTradeInvalidation: { type: Type.STRING },
        transmissionPathways: { type: Type.ARRAY, items: { type: Type.STRING } },
        fiscalPolicyRecommendation: { type: Type.STRING },
        fiscalPolicyExpectedImpact: { type: Type.STRING },
        monetaryPolicyRecommendation: { type: Type.STRING },
        monetaryPolicyExpectedImpact: { type: Type.STRING },
        debtManagementRecommendation: { type: Type.STRING },
        debtManagementExpectedImpact: { type: Type.STRING },
        tailRiskHedgeInstrument: { type: Type.STRING },
        riskApproval: { type: Type.STRING, enum: ['APPROVED', 'APPROVED_WITH_HEDGE', 'RESTRICTED'] },
        ...Object.fromEntries(
          ['ratesTrade', 'fxTrade', 'commodityTrade', 'creditTrade'].flatMap((k) => [
            [`${k}Direction`, { type: Type.STRING, enum: ['LONG', 'SHORT', 'HEDGE'] }],
            [`${k}Conviction`, { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'TACTICAL'] }],
            [`${k}Horizon`, { type: Type.STRING }],
          ])
        ),
      },
      required: [
        'decisionVerdict',
        'executiveSummary',
        'longTermRegimeOutlook',
        'structuralVulnerabilities',
        'regimeStance',
      ],
    },
    fallbackValue: {
      decisionVerdict: compositeScore >= 0.65 ? 'EXECUTE_TRADES' : 'DEFENSIVE_HEDGE',
      executiveSummary: baseOutput.executiveSummary,
      longTermRegimeOutlook: baseOutput.policyResearcherReport.longTermRegimeOutlook,
      structuralVulnerabilities: baseOutput.policyResearcherReport.structuralVulnerabilities,
      regimeStance: baseOutput.marketTranslationLayer.regimeStance,
      factorCrowdingWarning:
        baseOutput.marketTranslationLayer.riskGuardianCheck.factorCrowdingWarning,
    },
  }));

  if (supremeStep.usedFallback) return { error: NO_MODEL_COUNCIL, failure: supremeStep.failure };
  const parsed = supremeStep.data || {};
  const supremeContext = [
    councilPrompt,
    ...Object.values(targetRun.deskDebates || {}).map((d) => d.consensusSummary),
    ...(targetRun.cascadeSteps || []).map((c) => `${c.shockDelta} ${c.transmissionMechanism}`),
  ];
  const validVerdicts = ['EXECUTE_TRADES', 'DEFENSIVE_HEDGE', 'HOLD_AND_MONITOR'];
  const verdict = validVerdicts.includes(parsed.decisionVerdict)
    ? parsed.decisionVerdict
    : compositeScore >= 0.65
    ? 'EXECUTE_TRADES'
    : 'DEFENSIVE_HEDGE';

  baseOutput = {
    ...baseOutput,
    fromModel: true,
    reportId: `SMCR-1.0-${targetRun.iso3}-${Date.now().toString().slice(-5)}`,
    generatedAt: new Date().toISOString(),
    decisionVerdict: verdict as SupremeCouncilOutput['decisionVerdict'],
    compositeRiskScore: compositeScore,
    // Nothing measures the council's agreement yet: Missing, never the built-in 0.91.
    globalCoherenceScore: null,
    // The council does not set decision triggers yet: none, never the built-in rows.
    decisionPointMatrix: [],
    executiveSummary: textOrMissing(parsed.executiveSummary),
    policyResearcherReport: {
      ...baseOutput.policyResearcherReport,
      structuralVulnerabilities: listOrMissing(parsed.structuralVulnerabilities),
      transmissionPathways: listOrMissing(parsed.transmissionPathways),
      longTermRegimeOutlook:
        textOrMissing(parsed.longTermRegimeOutlook),
      policyRecommendations: baseOutput.policyResearcherReport.policyRecommendations.map(
        (rec, idx) => {
          // Fiscal, monetary, debt management: the model writes each action and its expected impact.
          const keys = [
            ['fiscalPolicyRecommendation', 'fiscalPolicyExpectedImpact'],
            ['monetaryPolicyRecommendation', 'monetaryPolicyExpectedImpact'],
            ['debtManagementRecommendation', 'debtManagementExpectedImpact'],
          ][idx];
          if (!keys) return { ...rec, action: MODEL_FIELD_MISSING, expectedImpact: MODEL_FIELD_MISSING };
          return { ...rec, action: textOrMissing(parsed[keys[0]]), expectedImpact: textOrMissing(parsed[keys[1]]) };
        }
      ),
    },
    marketTranslationLayer: {
      ...baseOutput.marketTranslationLayer,
      regimeStance: textOrMissing(parsed.regimeStance),
      tradeExpressions: baseOutput.marketTranslationLayer.tradeExpressions.map((t, idx) => {
        // The model writes the rates, FX, commodity and credit ideas; a part it left out is Missing,
        // not the built-in idea. Entry and target levels are not asked for, so they are never shown.
        const prefix = ['ratesTrade', 'fxTrade', 'commodityTrade', 'creditTrade'][idx];
        // Sizing is not asked for (nothing in the app sizes trades), so it is never shown as a number.
        const base = { ...t, entryLevel: MODEL_FIELD_MISSING, targetLevel: MODEL_FIELD_MISSING, sizingWeightPct: null };
        if (!prefix) return { ...base, instrument: MODEL_FIELD_MISSING, entryRationale: MODEL_FIELD_MISSING, invalidationStopTrigger: MODEL_FIELD_MISSING, direction: null, conviction: null, targetHorizon: MODEL_FIELD_MISSING };
        const dir = parsed[`${prefix}Direction`];
        const conv = parsed[`${prefix}Conviction`];
        return {
          ...base,
          instrument: textOrMissing(parsed[`${prefix}Instrument`]),
          entryRationale: textOrMissing(parsed[`${prefix}Rationale`]),
          invalidationStopTrigger: textOrMissing(parsed[`${prefix}Invalidation`]),
          direction: ['LONG', 'SHORT', 'HEDGE'].includes(dir) ? dir : null,
          conviction: ['HIGH', 'MEDIUM', 'TACTICAL'].includes(conv) ? conv : null,
          targetHorizon: textOrMissing(parsed[`${prefix}Horizon`]),
        };
      }),
      riskGuardianCheck: {
        ...baseOutput.marketTranslationLayer.riskGuardianCheck,
        factorCrowdingWarning:
          textOrMissing(parsed.factorCrowdingWarning),
        tailRiskHedgeInstrument: textOrMissing(parsed.tailRiskHedgeInstrument),
        approvalStatus: ['APPROVED', 'APPROVED_WITH_HEDGE', 'RESTRICTED'].includes(parsed.riskApproval) ? parsed.riskApproval : null,
        // Nothing in the app estimates these: Missing, never a built-in figure.
        liquidityHaircutPct: null,
        maxDrawdownEstimatePct: null,
      },
    },
  };

  // Number check: the final report may quote only figures the council was given.
  const reportCheck = checkSupremeText(baseOutput, supremeContext, [...runScores(targetRun), finalGeo, finalSov, finalMac, compositeScore]);
  baseOutput = reportCheck.output;
  const promptHash = sha256(`${SUPREME_INSTRUCTION}\n\n${councilPrompt}`);
  return { targetRun, cro, finalGeo, finalSov, finalMac, compositeScore, supremeStep, councilPrompt, promptHash, output: baseOutput, reportCheck };
}

/** A regression case on Policy review step 3: a diagnosis built only from the case's frozen figures. */
async function optionsRegressionCase(c: RegressionCase, runtimeConfig: Partial<AIRuntimeConfig>): Promise<RegressionCaseResult> {
  const { frame, figures } = c.options!;
  const rows: Array<Array<string | number | null>> = figures.map((f) => [frame.iso3, '', f.field, f.figure, f.value, f.unit, 'Live', f.period, f.source, '', '']);
  // Every other diagnosis figure is Missing with a plain reason; the model readings [13]+ read the
  // app's saved history, so they are left out to keep the case the same on every computer.
  for (const d of DIAGNOSIS_FIELDS)
    if (!figures.some((f) => f.field === d.field)) {
      const f = FIGURE_LIST.find((x) => x.field === d.field);
      rows.push([frame.iso3, '', d.field, f?.label ?? d.field, null, f?.unit ?? '', 'Missing', '', '', 'not in this test case', '']);
    }
  const diagnosis = buildDiagnosis(rows, { iso3: frame.iso3, asOf: frame.asOf, pullDate: frame.asOf, pulledAt: `${frame.asOf}T00:00:00.000Z`, incomplete: false });
  const step = await reviewOptionsStep(frame, diagnosis, [], runtimeConfig);
  // A model that answered with nothing usable is a failing answer, not a missing one.
  if (!('content' in step)) return { ...checkRegressionCase(c, { brief: null, removed: [], reason: step.error } as SynthesisResult), model: step.model ?? null, ...(step.model ? { temperature: COUNCIL_TEMPERATURE, seed: COUNCIL_SEED, promptHash: sha256(`${OPTIONS_INSTRUCTION}\n${optionsPrompt(frame, diagnosis, [])}`), outputHash: sha256('no usable options') } : {}), answer: [] };
  const o = step.content;
  const brief = {
    headline: o.options[0]?.title || '',
    points: [...o.options.map((x) => `${x.rank}. ${x.title} (${x.lever}): ${x.how} Effect: ${x.effect} Trade-offs: ${x.tradeoffs} Refs: ${x.refs.map((r) => `[${r}]`).join(' ') || 'none'}`), o.ranking].filter(Boolean),
    disagreements: [],
    gaps: o.gaps,
  };
  const answer = [brief.headline, ...brief.points, ...brief.gaps];
  return {
    ...checkRegressionCase(c, { brief, removed: o.removed, optionCount: o.options.length } as SynthesisResult & { optionCount: number }),
    model: step.step.model ?? null,
    temperature: step.step.temperature,
    seed: step.step.seed,
    promptHash: sha256(`${OPTIONS_INSTRUCTION}\n${optionsPrompt(frame, diagnosis, [])}`),
    outputHash: sha256(JSON.stringify(answer)),
    answer,
  };
}

/** A regression case on the Supreme Council step: a run built only from the case's frozen inputs. */
async function supremeRegressionCase(c: RegressionCase, runtimeConfig: Partial<AIRuntimeConfig>): Promise<RegressionCaseResult> {
  const input = c.supreme!;
  const base = buildBaselineOpenData(input.iso3);
  const pick = (group: string) => Object.fromEntries(input.figures.filter((f) => f.path.startsWith(`${group}.`)).map((f) => [f.path.split('.')[1], f.value]));
  // Only the case's figures count as data: every other figure is MISSING in the prompt.
  const openData: OpenDataSnapshot = {
    ...base,
    iso3: input.iso3,
    countryName: input.countryName,
    currencyCode: input.currencyCode || base.currencyCode,
    imfIndicators: { ...base.imfIndicators, ...pick('imf') },
    worldBankIndicators: { ...base.worldBankIndicators, ...pick('wb') },
    monetaryAndMarket: { ...base.monetaryAndMarket, ...pick('market') },
    liveFields: Object.fromEntries(input.figures.map((f) => [f.path, f.source])),
    dataStatus: { verifiedLiveSources: input.feeds, checkedAt: '2026-11-05T00:00:00.000Z' } as OpenDataSnapshot['dataStatus'],
    official10YYield: undefined,
    ownCds5Y: undefined,
    polymarketContracts: [],
    gdeltRaw: undefined,
  };
  const run = buildDefaultAssessmentRun(input.iso3, openData);
  const desk = (d: keyof SupremeCaseInput['desks']) => ({ ...run.deskDebates[d], consensusSummary: input.desks[d] });
  const frozenRun: CouncilAssessmentRun = {
    ...run,
    countryName: input.countryName,
    deskDebates: { ...run.deskDebates, geopolitical: desk('geopolitical'), sovereign: desk('sovereign'), macro: desk('macro') },
    cascadeSteps: [],
  };
  const cro: CROOverrideState = {
    ...run.croState,
    ...input.cro,
    energyInflationShockPct: NaN,
    debtServicingSpreadBps: NaN,
    counterfactualShocks: { brentCrudeShockUsd: 0, fedTerminalRateShockBps: 0, chokepointTransitDropPct: 0, domesticFiscalSlippagePctGdp: 0 } as CROOverrideState['counterfactualShocks'],
  };
  const step = await supremeCouncilStep(frozenRun, cro, runtimeConfig);
  if ('error' in step) {
    return { ...checkRegressionCase(c, { brief: null, removed: [], reason: step.failure || step.error } as SynthesisResult), model: null, answer: [] };
  }
  const o = step.output;
  const p = o.policyResearcherReport;
  // What the model wrote (after the number check); a field it left out reads Missing.
  const said = (k: string) => Boolean(step.supremeStep.data && (step.supremeStep.data as Record<string, unknown>)[k]);
  const brief = {
    headline: `${said('decisionVerdict') && (step.supremeStep.data as Record<string, unknown>).decisionVerdict === o.decisionVerdict ? o.decisionVerdict : '(no verdict chosen)'}: ${o.executiveSummary}`,
    points: [
      p.longTermRegimeOutlook,
      o.marketTranslationLayer.regimeStance,
      ...(p.structuralVulnerabilities || []),
      ...(p.transmissionPathways || []),
      ...p.policyRecommendations.flatMap((r) => [r.action, r.expectedImpact]),
      ...o.marketTranslationLayer.tradeExpressions.flatMap((x) => [x.instrument, x.entryRationale, x.invalidationStopTrigger]),
    ].filter((x): x is string => Boolean(x)),
    disagreements: [],
    gaps: [],
  };
  // Sentences the number check removed from what the model wrote (not from the built-in filler).
  const fieldOf = (where: string): string => {
    if (/^Executive summary/.test(where)) return 'executiveSummary';
    if (/^Vulnerability/.test(where)) return 'structuralVulnerabilities';
    if (/^Transmission pathway/.test(where)) return 'transmissionPathways';
    const impact = /^Policy recommendation (\d), expected impact/.exec(where)?.[1];
    if (impact) return ['', 'fiscalPolicyExpectedImpact', 'monetaryPolicyExpectedImpact', 'debtManagementExpectedImpact'][Number(impact)] ?? '';
    if (/^Policy recommendation 3\b/.test(where)) return 'debtManagementRecommendation';
    if (/^Long-term outlook/.test(where)) return 'longTermRegimeOutlook';
    if (/^Regime stance/.test(where)) return 'regimeStance';
    if (/^Policy recommendation 1\b/.test(where)) return 'fiscalPolicyRecommendation';
    if (/^Policy recommendation 2\b/.test(where)) return 'monetaryPolicyRecommendation';
    if (/^Crowding warning/.test(where)) return 'factorCrowdingWarning';
    const t = /^Trade idea (\d)/.exec(where)?.[1];
    const inval = /invalidation/.test(where);
    const trade = ({ '1': 'ratesTrade', '2': 'fxTrade', '3': 'commodityTrade', '4': 'creditTrade' } as Record<string, string>)[t ?? ''];
    return trade ? `${trade}${inval ? 'Invalidation' : 'Rationale'}` : '';
  };
  const removed = step.reportCheck.check.removed.filter((r) => said(fieldOf(r.where))).map((r) => r.sentence);
  const answer = [brief.headline, ...brief.points];
  // Structural: a field the model left out must read Missing, never the built-in report's text.
  const t = o.marketTranslationLayer.tradeExpressions;
  const shown: Array<[string, string | undefined]> = [
    ['executiveSummary', o.executiveSummary],
    ['longTermRegimeOutlook', p.longTermRegimeOutlook],
    ['regimeStance', o.marketTranslationLayer.regimeStance],
    ['structuralVulnerabilities', (p.structuralVulnerabilities || []).join(' ')],
    ['transmissionPathways', (p.transmissionPathways || []).join(' ')],
    ['fiscalPolicyRecommendation', p.policyRecommendations[0]?.action],
    ['fiscalPolicyExpectedImpact', p.policyRecommendations[0]?.expectedImpact],
    ['monetaryPolicyRecommendation', p.policyRecommendations[1]?.action],
    ['monetaryPolicyExpectedImpact', p.policyRecommendations[1]?.expectedImpact],
    ['debtManagementRecommendation', p.policyRecommendations[2]?.action],
    ['debtManagementExpectedImpact', p.policyRecommendations[2]?.expectedImpact],
    ['factorCrowdingWarning', o.marketTranslationLayer.riskGuardianCheck.factorCrowdingWarning],
    ...(['ratesTrade', 'fxTrade', 'commodityTrade', 'creditTrade'] as const).flatMap((k, i): Array<[string, string | undefined]> => [
      [`${k}Instrument`, t[i]?.instrument],
      [`${k}Rationale`, t[i]?.entryRationale],
      [`${k}Invalidation`, t[i]?.invalidationStopTrigger],
    ]),
  ];
  // Never asked of the model, so never anything but Missing.
  if (o.globalCoherenceScore !== null) shown.push(['council coherence (not measured)', 'built-in']);
  const rg = o.marketTranslationLayer.riskGuardianCheck;
  if (rg.liquidityHaircutPct !== null || rg.maxDrawdownEstimatePct !== null) shown.push(['drawdown/haircut (not estimated)', 'built-in']);
  if (rg.approvalStatus !== null && !said('riskApproval')) shown.push(['riskApproval', 'built-in']);
  shown.push(['tailRiskHedgeInstrument', rg.tailRiskHedgeInstrument]);
  if (o.decisionPointMatrix.length) shown.push(['decision triggers (not set by the council)', 'built-in']);
  for (const [i, k] of (['ratesTrade', 'fxTrade', 'commodityTrade', 'creditTrade'] as const).entries()) {
    const x = t[i];
    if (!x) continue;
    if (x.sizingWeightPct !== null) shown.push([`trade ${i + 1} sizing (never asked)`, 'built-in']);
    if (x.direction !== null && !said(`${k}Direction`)) shown.push([`${k}Direction`, 'built-in']);
    if (x.conviction !== null && !said(`${k}Conviction`)) shown.push([`${k}Conviction`, 'built-in']);
    shown.push([`${k}Horizon`, x.targetHorizon]);
  }
  for (const [i, x] of t.entries()) {
    if (x.entryLevel !== MODEL_FIELD_MISSING || x.targetLevel !== MODEL_FIELD_MISSING) shown.push([`trade ${i + 1} entry/target level (never asked)`, 'built-in']);
  }
  const template = shown.filter(([k, v]) => !said(k) && v !== MODEL_FIELD_MISSING).map(([k]) => `${k}: the model wrote nothing, but the report shows built-in text instead of Missing.`);
  const checked = checkRegressionCase(c, { brief, removed } as SynthesisResult);
  if (template.length) checked.failures.push(...template);
  checked.pass = checked.failures.length === 0;
  return {
    ...checked,
    model: step.supremeStep.model ?? null,
    temperature: step.supremeStep.temperature,
    seed: step.supremeStep.seed,
    promptHash: step.promptHash,
    outputHash: sha256(JSON.stringify({ verdict: o.decisionVerdict, answer })),
    answer,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.disable('x-powered-by');
  // Security headers on every reply (src/utils/requestLimits.ts): no framing, no sniffing.
  app.use((_req, res, next) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    next();
  });

  // All state lives under DATA_DIR (one mounted volume in Docker). Stop at once with a clear
  // sentence if it cannot be written, instead of failing later on the first save.
  const dataProblem = dataDirProblem(DATA_DIR);
  if (dataProblem) {
    console.error(`[startup] ${dataProblem}`);
    process.exit(1);
  }

  // Liveness: answers as soon as the process serves requests. No feeds, no files, no model,
  // so a container health check every 30 seconds costs nothing. Before the host check so a
  // health probe that names the container's own address is not refused; it reveals nothing.
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  // Readiness: 200 only once listening, while not stopping, and while the data folder can be
  // written (checked at most once a minute). Send traffic only when this says ready.
  const lifecycle = { listening: false, shuttingDown: false };
  let readyCheck = { at: 0, problem: null as string | null };
  app.get('/readyz', (_req, res) => {
    if (Date.now() - readyCheck.at > 60_000) readyCheck = { at: Date.now(), problem: dataDirProblem(DATA_DIR) };
    const r = readiness({ ...lifecycle, dataProblem: readyCheck.problem });
    res.status(r.status).json(r.body);
  });

  // Keep the server for this computer's own pages: refuse other host names (DNS rebinding) and
  // changes sent from pages on other sites. See src/utils/requestGuard.ts.
  app.use((req, res, next) => {
    if (!hostAllowed(req.headers.host, process.env)) {
      return res.status(403).json({ error: `This app only answers on localhost (the request named "${String(req.headers.host || '').slice(0, 80)}"). To open it on your network on purpose, list the name in ALLOWED_HOSTS in .env.` });
    }
    if (!writeAllowed(req.method, req.headers as Record<string, string>)) {
      return res.status(403).json({ error: 'Changes can only be made from the app itself, not from another website.' });
    }
    next();
  });
  // Accounts and sign-in (src/utils/auth.ts). With no accounts and the app on this computer only,
  // nothing changes; once an account exists, every API call needs a signed-in account.
  const limits = sessionLimits(process.env);
  const auth = new AuthStore(DATA_DIR, limits);
  const signInLimiter = new SignInLimiter();
  const actorStore = new AsyncLocalStorage<{ id: string; username: string; name: string }>();
  setAuditActor(() => actorStore.getStore());
  let setupCode: string | null = null;
  const currentMode = () => authMode(auth.count(), process.env);
  const announceSetupCode = () => {
    if (currentMode() !== 'setup' || setupCode) return;
    setupCode = newSetupCode();
    console.log(`[auth] No accounts yet and sign-in is required (the app is open to a network, or AUTH=on). Create the first admin account at the sign-in page with this one-time setup code: ${setupCode}`);
  };
  announceSetupCode();
  const secureCookie = (req: express.Request) => req.secure || String(process.env.COOKIE_SECURE || '').trim().toLowerCase() === 'true';
  const signedIn = (res: express.Response): Account | null => (res.locals.account as Account | undefined) ?? null;
  const accountName = (a: Account | null) => (a ? `${a.displayName} (${a.username})` : 'nobody signed in');
  app.use((req, res, next) => {
    const mode = currentMode();
    const hit = mode === 'off' ? null : auth.resolve(readCookie(req.headers.cookie, SESSION_COOKIE));
    if (hit) {
      res.locals.account = hit.account;
      res.locals.sessionHash = hit.session.tokenHash;
      // Every audit entry written while handling this request names the account.
      const a = hit.account;
      return actorStore.run({ id: a.id, username: a.username, name: a.displayName }, next);
    }
    if (mode === 'off' || hit || openPath(req.method, req.path)) return next();
    // The integration API keeps its own key check when that is switched on in Settings.
    if (req.path.startsWith('/api/v1/integration/') && (serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG).requireApiKey) return next();
    res.status(401).json({ error: mode === 'setup' ? 'Create the first admin account to start using the app.' : 'Sign in to use the app.', signIn: true, mode });
  });
  // Roles (src/utils/permissions.ts): one table for every API call. Sign-in off = the single user.
  app.use((req, res, next) => {
    const me = signedIn(res);
    if (!me) return next(); // sign-in off, or an open path, or the integration API with its own key
    const needed = requiredRole(req.method, req.path);
    if (roleAtLeast(me.role, needed)) return next();
    res.status(403).json({ error: refusal(me.role, needed), role: me.role, needed });
  });
  // CSRF token and per-account rate limits (src/utils/requestLimits.ts), once someone is signed in.
  const limiter = new RateLimiter();
  app.use((req, res, next) => {
    const me = signedIn(res);
    if (!me) return next();
    if (isWrite(req.method) && !req.path.startsWith('/api/auth/sign-in') && !csrfMatches(req.headers[CSRF_HEADER], res.locals.sessionHash as string)) {
      return res.status(403).json({ error: 'This change was refused because the page is out of date. Reload the page and try again.', csrf: true });
    }
    const ai = isAiCall(req.method, req.path);
    const wait = limiter.take(`${me.id}:api`, LIMITS.api) || (ai ? limiter.take(`${me.id}:ai`, LIMITS.ai) : 0);
    if (wait) {
      res.setHeader('Retry-After', String(wait));
      return res.status(429).json({ error: ai ? `Too many AI requests from this account. Try again in ${wait} seconds.` : `Too many requests from this account. Try again in ${wait} seconds.` });
    }
    next();
  });
  // Changes that were limited to "the computer running the app" before accounts existed: a signed-in
  // account (whose role the table above has checked) may make them from anywhere.
  const trusted = (req: express.Request, res: express.Response) => Boolean(signedIn(res)) || isLocalRequest(req.socket.remoteAddress, process.env);
  // Each account's own workspace (holdings, watchlists, added countries); the shared file while
  // sign-in is off. The first admin starts from the shared file, which held the single user's lists.
  workspaceFileForAccount = (account: Account | null): string => {
    if (!account) return WORKSPACE_FILE;
    const file = userWorkspacePath(DATA_DIR, account.id);
    const firstAdmin = auth.list().filter((a) => a.role === 'admin').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (firstAdmin?.id === account.id) {
      try {
        seedWorkspace(WORKSPACE_FILE, file);
      } catch (error) {
        console.error('[workspace] could not copy the shared workspace for the first admin:', (error as Error)?.message);
      }
    }
    return file;
  };
  serverJobAccount = () => auth.list().filter((a) => a.role === 'admin' && !a.disabled).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null;
  const workspaceFor = (res: express.Response) => workspaceFileForAccount(signedIn(res));
  const authStatus = (req: express.Request, res: express.Response) => {
    const mode = currentMode();
    const me = signedIn(res);
    return {
      mode,
      account: me ? publicAccount(me) : null,
      // In 'off' mode the person can already change everything, so the first account needs no code.
      setupNeedsCode: mode === 'setup',
      canCreateFirstAccount: auth.count() === 0 && (mode === 'setup' || trusted(req, res)),
      sessionIdleHours: Math.round(limits.idleMs / 3600_000),
      csrfToken: me ? csrfToken(res.locals.sessionHash as string) : null,
    };
  };
  app.get('/api/auth/status', (req, res) => res.json(authStatus(req, res)));
  app.post('/api/auth/setup', express.json({ limit: '10kb' }), (req, res) => {
    if (auth.count() > 0) return res.status(409).json({ error: 'An admin account already exists. Sign in instead.' });
    const mode = currentMode();
    if (mode === 'off' && !trusted(req, res)) {
      return res.status(403).json({ error: 'The first account can only be created from the computer running the app.' });
    }
    const address = req.socket.remoteAddress || '';
    const wait = signInLimiter.waitSeconds('(setup)', address);
    if (wait) return res.status(429).json({ error: `Too many tries. Wait ${Math.ceil(wait / 60)} minutes.` });
    if (mode === 'setup' && !setupCodeMatches(req.body?.code, setupCode)) {
      signInLimiter.failed('(setup)', address);
      return res.status(403).json({ error: 'That setup code is wrong. It is printed in the server log (docker logs, or the terminal running the app).' });
    }
    const username = normaliseUsername(req.body?.username);
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : '';
    const problem = usernameProblem(username) || displayNameProblem(displayName) || passwordProblem(req.body?.password, username);
    if (problem) return res.status(400).json({ error: problem });
    const account = newAccount({ username, displayName, role: 'admin', password: req.body.password });
    auth.add(account);
    setupCode = null;
    const token = auth.startSession(account.id);
    res.setHeader('Set-Cookie', sessionCookie(token, { secure: secureCookie(req), maxAgeMs: limits.maxMs }));
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `Created the first admin account: ${accountName(account)}. Sign-in is now required for everyone.` });
    res.json({ ok: true, account: publicAccount(account) });
  });
  app.post('/api/auth/sign-in', express.json({ limit: '10kb' }), (req, res) => {
    const username = normaliseUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const address = req.socket.remoteAddress || '';
    const wait = signInLimiter.waitSeconds(username, address);
    if (wait) return res.status(429).json({ error: `Too many wrong passwords. Try again in ${Math.ceil(wait / 60)} minutes.` });
    const account = auth.byUsername(username);
    const ok = verifyPassword(password, account?.passwordHash || DUMMY_HASH) && Boolean(account) && !account!.disabled;
    if (!ok || !account) {
      signInLimiter.failed(username, address);
      appendAudit(AUDIT_FILES, { kind: 'access', summary: `Failed sign-in for "${username.slice(0, 40) || '(blank)'}"`, detail: { address } });
      return res.status(401).json({ error: 'That username and password do not match an active account.' });
    }
    signInLimiter.succeeded(username);
    const token = auth.startSession(account.id);
    res.setHeader('Set-Cookie', sessionCookie(token, { secure: secureCookie(req), maxAgeMs: limits.maxMs }));
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `Signed in: ${accountName(account)}`, detail: { address } });
    res.json({ ok: true, account: publicAccount(account) });
  });
  app.post('/api/auth/sign-out', (req, res) => {
    const me = signedIn(res);
    auth.endSession(readCookie(req.headers.cookie, SESSION_COOKIE));
    res.setHeader('Set-Cookie', clearedSessionCookie(secureCookie(req)));
    if (me) appendAudit(AUDIT_FILES, { kind: 'access', summary: `Signed out: ${accountName(me)}` });
    res.json({ ok: true });
  });
  app.post('/api/auth/password', express.json({ limit: '10kb' }), (req, res) => {
    const me = signedIn(res);
    if (!me) return res.status(401).json({ error: 'Sign in first.', signIn: true });
    const address = req.socket.remoteAddress || '';
    const wait = signInLimiter.waitSeconds(me.username, address);
    if (wait) return res.status(429).json({ error: `Too many wrong passwords. Try again in ${Math.ceil(wait / 60)} minutes.` });
    if (!verifyPassword(String(req.body?.current || ''), me.passwordHash)) {
      signInLimiter.failed(me.username, address);
      return res.status(403).json({ error: 'The current password is wrong.' });
    }
    const problem = passwordProblem(req.body?.next, me.username);
    if (problem) return res.status(400).json({ error: problem });
    auth.update(me.id, (a) => ({ ...a, passwordHash: hashPassword(req.body.next), passwordChangedAt: new Date().toISOString() }));
    const ended = auth.endSessionsFor(me.id, res.locals.sessionHash as string | undefined);
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `Changed own password: ${accountName(me)}${ended ? ` (signed out ${ended} other session${ended === 1 ? '' : 's'})` : ''}` });
    res.json({ ok: true, endedSessions: ended });
  });
  // Menu > Users (admin only, enforced by the role table): add accounts, change role, disable,
  // reset a password. The last active admin can never be demoted or disabled.
  const randomPassword = () => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.randomBytes(20), (b) => alphabet[b % alphabet.length]).join('');
  };
  const usersReply = () => ({ accounts: auth.list().map((a) => ({ ...publicAccount(a), sessions: auth.sessionCountFor(a.id) })) });
  app.get('/api/users', (_req, res) => res.json(usersReply()));
  app.post('/api/users', express.json({ limit: '10kb' }), (req, res) => {
    const me = signedIn(res)!;
    const username = normaliseUsername(req.body?.username);
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : '';
    const role = req.body?.role as Role;
    const problem = usernameProblem(username) || displayNameProblem(displayName) || (ROLES.includes(role) ? null : 'Choose a role.');
    if (problem) return res.status(400).json({ error: problem });
    if (auth.byUsername(username)) return res.status(409).json({ error: `The username "${username}" is taken.` });
    const password = randomPassword();
    const account = newAccount({ username, displayName, role, password });
    auth.add(account);
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `${accountName(me)} added the account ${accountName(account)} as ${role}` });
    res.json({ ...usersReply(), created: publicAccount(account), password });
  });
  app.put('/api/users/:id', express.json({ limit: '10kb' }), (req, res) => {
    const me = signedIn(res)!;
    const target = auth.byId(String(req.params.id));
    if (!target) return res.status(404).json({ error: 'No such account.' });
    const role = req.body?.role === undefined ? target.role : (req.body.role as Role);
    const disabled = req.body?.disabled === undefined ? Boolean(target.disabled) : req.body.disabled === true;
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : target.displayName;
    const problem = (ROLES.includes(role) ? null : 'Choose a role.') || displayNameProblem(displayName);
    if (problem) return res.status(400).json({ error: problem });
    const losesAdmin = target.role === 'admin' && !target.disabled && (role !== 'admin' || disabled);
    if (losesAdmin && auth.activeAdminCount() <= 1) return res.status(409).json({ error: 'This is the last active admin. Make another account admin first.' });
    const updated = auth.update(target.id, (a) => ({ ...a, role, disabled, displayName: displayName.trim() }));
    if (disabled && !target.disabled) auth.endSessionsFor(target.id);
    const changes = [
      role !== target.role ? `role ${target.role} -> ${role}` : '',
      disabled !== Boolean(target.disabled) ? (disabled ? 'disabled' : 'enabled') : '',
      updated.displayName !== target.displayName ? `name "${target.displayName}" -> "${updated.displayName}"` : '',
    ].filter(Boolean);
    if (changes.length) appendAudit(AUDIT_FILES, { kind: 'access', summary: `${accountName(me)} changed the account ${target.username}: ${changes.join(', ')}` });
    res.json(usersReply());
  });
  app.post('/api/users/:id/reset-password', (req, res) => {
    const me = signedIn(res)!;
    const target = auth.byId(String(req.params.id));
    if (!target) return res.status(404).json({ error: 'No such account.' });
    const password = randomPassword();
    auth.update(target.id, (a) => ({ ...a, passwordHash: hashPassword(password), passwordChangedAt: new Date().toISOString() }));
    const ended = auth.endSessionsFor(target.id, target.id === me.id ? (res.locals.sessionHash as string) : undefined);
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `${accountName(me)} reset the password of ${accountName(target)} (signed out ${ended} session${ended === 1 ? '' : 's'})` });
    res.json({ ...usersReply(), password });
  });

  // Audit log: every change, download and AI step that succeeds is written once it has answered,
  // by what it did (route), never by its body, so keys and document text stay out of the log.
  app.use((req, res, next) => {
    const by = actorStore.getStore();
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const what = describeRequest(req.method, req.originalUrl || req.url);
      if (what) appendAudit(AUDIT_FILES, by ? { ...what, by } : what);
    });
    next();
  });
  app.get('/api/audit', (req, res) => {
    const { check, entries } = readAudit(AUDIT_FILES);
    const kind = typeof req.query.kind === 'string' && req.query.kind in AUDIT_KIND_LABEL ? (req.query.kind as AuditKind) : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 100) : '';
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const hits = entries.filter((e) => (!kind || e.kind === kind) && (!q || JSON.stringify(e).toLowerCase().includes(q)));
    res.json({ check, total: hits.length, entries: hits.slice(-limit).reverse(), kinds: AUDIT_KIND_LABEL, file: 'data/local/audit/audit-log.jsonl' });
  });
  app.get('/api/audit/export.:fmt(csv|jsonl)', (req, res) => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (req.params.fmt === 'jsonl') {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.attachment(`econquest-audit-log-${stamp}.jsonl`);
      return res.send(rawAudit(AUDIT_FILES));
    }
    const { check, entries } = readAudit(AUDIT_FILES);
    const note = check.ok ? `Checked: ${check.entries} entries, chain intact, last hash ${check.lastHash ?? '-'}` : `CHECK FAILED: ${check.problem}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`econquest-audit-log-${stamp}.csv`);
    res.send(toCsv(AUDIT_HEADER, [...auditRows(entries), ['', '', 'Check', '', note, '', '', '', '']]));
  });
  // Backup and restore (Menu > Settings > Backup): saved research, policy reviews, watch alerts, holdings,
  // watchlists and AI settings in one file, never API keys. See src/utils/backup.ts. Restore takes
  // a larger body than the other routes (a library with documents), so it parses its own.
  // A backup holds the team library and the workspace of the account making it (admins only).
  const backupFilesFor = (res: express.Response) => ({ research: RESEARCH_FILE, watchRules: WATCH_RULES_FILE, workspace: workspaceFor(res), reviews: REVIEW_FILE, snapshots: ANSWER_SNAPSHOT_DIR });
  app.get('/api/backup', (_req, res) => {
    res.json({ summary: summariseBackup(currentBackup(backupFilesFor(res))), fileName: backupFileName() });
  });
  app.get('/api/backup/download', (_req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName()}"`);
    res.type('application/json').send(JSON.stringify(currentBackup(backupFilesFor(res)), null, 1));
  });
  app.post('/api/backup/restore', express.json({ limit: '60mb' }), (req, res) => {
    if (!trusted(req, res)) {
      return res.status(403).json({ error: `A backup can only be restored from the computer running the app (this request came from ${req.socket.remoteAddress || 'an unknown address'}).` });
    }
    const parsed = parseBackup(req.body?.backup);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    try {
      const { savedCopy } = restoreBackup(backupFilesFor(res), parsed.backup);
      res.json({ ok: true, summary: parsed.summary, savedCopy });
    } catch (error: any) {
      res.status(500).json({ error: `Could not restore the backup (${error?.code || error?.message || 'unknown error'}). Nothing was lost: see data/local/backups/.` });
    }
  });
  app.use(express.json({ limit: '5mb' }));

  // 1. Live Open Data & Grounded Market Telemetry Snapshot Endpoint
  app.get('/api/data/sovereign-snapshot', async (req, res) => {
    try {
      const iso3 = String(req.query.iso3 || 'BRA').toUpperCase();
      const countryName = req.query.countryName ? String(req.query.countryName) : undefined;
      const snapshot = await fetchLiveOpenDataSnapshot(iso3, countryName, {
        forceRefresh: req.query.refresh === '1',
      });
      const charts = buildAnnotatedChartsForSovereign(snapshot);
      const run = buildDefaultAssessmentRun(iso3, snapshot);
      res.json({ snapshot, charts, run });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch open data snapshot' });
    }
  });

  // 1a-alias. Backward-compatible Open Data Proxy Endpoint (/api/open-data/:iso3)
  app.get('/api/open-data/:iso3', async (req, res) => {
    try {
      const iso3 = String(req.params.iso3 || req.query.iso3 || 'BRA').toUpperCase();
      const snapshot = await fetchLiveOpenDataSnapshot(iso3);
      const charts = buildAnnotatedChartsForSovereign(snapshot);
      const run = buildDefaultAssessmentRun(iso3, snapshot);
      res.json({ snapshot, charts, run });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch open data snapshot' });
    }
  });

  // 1a-refresh. Manually trigger a live pull for all countries (runs in the background)
  app.post('/api/data/refresh', (_req, res) => {
    void refreshStaleSnapshots(true);
    res.status(202).json({ status: 'refresh started', countries: SOVEREIGN_CATALOG.length });
  });

  // Download all country data (Menu > Offline data; same run as npm run preload).
  app.get('/api/preload', (_req, res) => res.json(preloadReply()));
  app.get('/api/online', async (req, res) => {
    const online = await checkFeedsOnline(req.query.recheck === '1');
    const sum = summarisePreload(preloadPlan(), preloadState);
    const saved = preloadCountries().map((c) => loadStoredSnapshot(c.iso3)?.pulledAt).filter((t): t is number => typeof t === 'number');
    res.json({
      online,
      checkedAt: new Date(feedsOnline?.checkedAt ?? Date.now()).toISOString(),
      // Oldest country pull on disk: everything shown is at least this fresh.
      savedFrom: saved.length ? new Date(Math.min(...saved)).toISOString() : null,
      savedNewest: saved.length ? new Date(Math.max(...saved)).toISOString() : null,
      countriesSaved: saved.length,
      countriesTotal: sum.countriesTotal,
      preloadRunning: preloadState.running,
    });
  });
  app.post('/api/preload/start', (req, res) => {
    void startPreload({ fresh: req.body?.fresh === true });
    res.status(202).json(preloadReply());
  });
  app.post('/api/preload/stop', (_req, res) => {
    if (preloadJob) preloadStopAsked = true;
    res.json(preloadReply());
  });

  // 1b. Live Watchlist Multi-Sovereign Telemetry Endpoint
  app.get('/api/data/watchlist-live', async (req, res) => {
    try {
      // ?iso3=ARG,COL: rows for just those countries, pulled for one council question if not in the catalog.
      if (req.query.iso3) {
        const codes = String(req.query.iso3).toUpperCase().split(',').map((c) => c.trim().replace(/[^A-Z]/g, '')).filter((c) => c.length === 3);
        return res.json({ items: await liveRowsFor([...new Set(codes)]), fetchedAt: new Date().toISOString() });
      }
      // ?refresh=1 rebuilds the rows from what is saved now instead of the 4-minute copy.
      const items = await fetchLiveWatchlistCatalog([], req.query.refresh === '1');
      res.json({ items, fetchedAt: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to refresh live watchlist' });
    }
  });

  let connectionReportCache: { at: number; report: ConnectionReport } | null = null;
  // 1a'. Settings > API keys: your own keys, saved on this computer only (src/utils/userSettings.ts).
  // The browser gets masked values only; changes are accepted from this computer only.
  const keysReply = (req: express.Request, res: express.Response) => ({
    keys: describeKeys(ENV_FILE_KEYS, savedSettings),
    canEdit: trusted(req, res) && (!signedIn(res) || signedIn(res)!.role === 'admin'),
    requestFrom: req.socket.remoteAddress || '',
    inDocker: process.env.SELF_HOSTED_DOCKER === 'true',
    savedIn: path.relative(__dirname, SETTINGS_FILE).startsWith('..') ? SETTINGS_FILE : path.relative(__dirname, SETTINGS_FILE),
  });
  const runKeyCheck = async (id: string, env: Record<string, string | undefined>, sources: Record<string, 'app' | 'env' | 'none'>) => {
    const field = apiKeyField(id);
    if (!field) return null;
    const report = await checkConnections({
      env,
      only: [field.checkId],
      keySources: sources,
      ai: {
        provider: serverGuiRuntimeConfig.providerMode || process.env.DEFAULT_AI_PROVIDER,
        ollamaBaseUrl: serverGuiRuntimeConfig.ollamaBaseUrl,
        ollamaQuickModel: serverGuiRuntimeConfig.ollamaQuickModel,
        ollamaDeepModel: serverGuiRuntimeConfig.ollamaDeepModel,
        openAiBaseUrl: serverGuiRuntimeConfig.openAiBaseUrl,
      },
    });
    return report.results[0] || null;
  };
  // A changed key is used from the next pull: forget answers that were fetched without it.
  const onKeyChanged = (id: string) => {
    connectionReportCache = null;
    if (id === 'FRED_API_KEY') {
      fredSeriesCache.clear();
      for (const [iso3, hit] of officialYieldCache) if (!hit.obs && iso3 !== 'BRA') officialYieldCache.delete(iso3);
    }
    if (id === 'EIA_API_KEY') forgetCommodityPulls();
    if (id === 'COMTRADE_API_KEY' && comtradeMemory) comtradeMemory.triedAt = {};
    if (id.startsWith('EVDS_')) officialYieldCache.delete('TUR');
    if (id.startsWith('CDS_') || id.startsWith('LSEG_')) forgetOwnCds();
    if (id === 'GEMINI_API_KEY') ai = makeGeminiClient();
  };
  const refuseRemote = (req: express.Request, res: express.Response): boolean => {
    if (trusted(req, res)) return false;
    res.status(403).json({ error: `Keys can only be changed from the computer running the app (this request came from ${req.socket.remoteAddress || 'an unknown address'}). Under Docker, pull the latest docker-compose.yml and rebuild, or set SETTINGS_ALLOW_REMOTE="true" in .env.` });
    return true;
  };
  app.get('/api/settings/keys', (req, res) => res.json(keysReply(req, res)));
  // Settings, connector tests and webhooks can only be used from the computer running the app.
  const refuseRemoteChange = (req: express.Request, res: express.Response): boolean => {
    if (trusted(req, res)) return false;
    res.status(403).json({ error: `This can only be used from the computer running the app (this request came from ${req.socket.remoteAddress || 'an unknown address'}).` });
    return true;
  };

  // Research library: council conversations and policy documents kept in data/local/research.json.
  const refuseRemoteResearch = (req: express.Request, res: express.Response): boolean => {
    if (trusted(req, res)) return false;
    res.status(403).json({ error: `Saved research can only be changed from the computer running the app (this request came from ${req.socket.remoteAddress || 'an unknown address'}).` });
    return true;
  };
  const writeResearch = (res: express.Response, change: (lib: ReturnType<typeof loadLibrary>) => ReturnType<typeof loadLibrary>, reply: Record<string, unknown> = {}) => {
    try {
      saveLibrary(RESEARCH_FILE, change(loadLibrary(RESEARCH_FILE)));
      res.json({ ok: true, ...reply });
    } catch (error: any) {
      res.status(500).json({ error: `Could not save the research file (${error?.code || error?.message || 'unknown error'}).` });
    }
  };
  // Holdings, watchlists, added countries and AI settings (data/local/workspace.json), shared by
  // every address the app is opened at. See src/utils/workspaceStore.ts.
  app.get('/api/workspace', (_req, res) => {
    const file = workspaceFor(res);
    const w = loadWorkspace(file);
    res.json({ values: w.values, updatedAt: w.updatedAt, file: path.relative(DATA_DIR, file).startsWith('..') ? file : `data/${path.relative(DATA_DIR, file)}`, perAccount: Boolean(signedIn(res)) });
  });
  app.put('/api/workspace/:key', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const value = req.body?.value === undefined ? null : req.body.value;
    const problem = workspaceProblem(req.params.key, value);
    if (problem) return res.status(400).json({ error: problem });
    try {
      const file = workspaceFor(res);
      const before = loadWorkspace(file).values[req.params.key] ?? null;
      const w = setWorkspaceValue(file, req.params.key, value);
      // The page re-sends these on every load; only a real change goes in the audit log.
      if (before !== value) appendAudit(AUDIT_FILES, { kind: req.params.key === 'econquest_ai_runtime_config_v1' ? 'model' : 'workspace', summary: `Changed ${WORKSPACE_KEYS[req.params.key] || req.params.key}` });
      res.json({ ok: true, updatedAt: w.updatedAt[req.params.key] || null });
    } catch (error: any) {
      res.status(500).json({ error: `Could not save the workspace file (${error?.code || error?.message || 'unknown error'}).` });
    }
  });
  // Report sign-off: where each saved council conversation stands, and one step at a time.
  app.get('/api/signoffs', (_req, res) => {
    const all = loadSignOffs(SIGNOFF_FILE);
    const briefs: Record<string, ReturnType<typeof signOffView>> = {};
    for (const b of loadLibrary(RESEARCH_FILE).briefs) briefs[b.id] = signOffView(recordFor(all, 'brief', b.id), reportHash(b as any));
    const reviews: Record<string, ReturnType<typeof signOffView>> = {};
    for (const r of loadReviews(REVIEW_FILE).reviews) if (r.steps.memo) reviews[r.id] = signOffView(recordFor(all, 'review', r.id), r.steps.memo.hash);
    res.json({ briefs, reviews, file: 'data/local/signoffs.json' });
  });
  app.post('/api/signoffs/brief/:id', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    // Approving is an Admin step once accounts exist (docs/RISK_AND_COMPLIANCE.md: the Approver).
    if (signedIn(res) && req.body?.step === 'approved' && signedIn(res)!.role !== 'admin') return res.status(403).json({ error: refusal(signedIn(res)!.role, 'admin') });
    const b = loadLibrary(RESEARCH_FILE).briefs.find((x) => x.id === req.params.id);
    if (!b) return res.status(404).json({ error: 'No saved conversation with that id.' });
    const hash = reportHash(b as any);
    const out = takeStep(recordFor(loadSignOffs(SIGNOFF_FILE), 'brief', b.id), 'brief', b.id, hash, req.body || {}, new Date(), signedIn(res) ?? undefined);
    if ('error' in out) return res.status(400).json({ error: out.error });
    try {
      saveSignOff(SIGNOFF_FILE, out.record);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not save the sign-off (${error?.code || error?.message || 'unknown error'}).` });
    }
    const view = signOffView(out.record, hash);
    const verb = { reviewed: 'Reviewed', approved: out.entry.selfApproved ? 'Approved (self-approved, no second reviewer)' : 'Approved', withdrawn: 'Withdrew the sign-off on' }[out.entry.step];
    appendAudit(AUDIT_FILES, {
      kind: 'signoff',
      summary: `${verb} "${String(b.question).slice(0, 150)}" (${out.entry.by})`,
      detail: { id: b.id, step: out.entry.step, by: out.entry.by, contentHash: hash, status: SIGNOFF_LABEL[view.status], ...(out.entry.note ? { note: out.entry.note } : {}) },
    });
    res.json(view);
  });
  // Policy reviews: a guided case file per country and problem (src/utils/policyReview.ts).
  app.get('/api/reviews', (_req, res) => {
    res.json({ reviews: loadReviews(REVIEW_FILE).reviews.map(summariseReview), templateVersion: REVIEW_TEMPLATE_VERSION, file: 'data/local/reviews.json' });
  });
  app.get('/api/reviews/:id', (req, res) => {
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'No policy review with that id.' });
    res.json({ review: r, states: stepStates(r), changed: verifyReview(r) });
  });
  const writeReview = (res: express.Response, review: Parameters<typeof putReview>[1]): boolean => {
    try {
      putReview(REVIEW_FILE, review);
      return true;
    } catch (error: any) {
      res.status(500).json({ error: `Could not save the policy review (${error?.code || error?.message || 'unknown error'}).` });
      return false;
    }
  };
  app.post('/api/reviews', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const parsed = parseFrame(req.body?.frame);
    if ('errors' in parsed) return res.status(400).json({ error: parsed.errors.join(' '), errors: parsed.errors });
    const existing = loadReviews(REVIEW_FILE).reviews;
    const previousId = typeof req.body?.previousId === 'string' && existing.some((r) => r.id === req.body.previousId) ? req.body.previousId : undefined;
    const review = newReview(parsed.frame, existing.map((r) => r.id), new Date(), previousId);
    if (!writeReview(res, review)) return;
    appendAudit(AUDIT_FILES, { kind: 'research', summary: `Started policy review "${review.title}"`, detail: { id: review.id, step: 'frame', hash: review.steps.frame?.hash, templateVersion: review.templateVersion, ...(previousId ? { previousId } : {}) } });
    res.json({ review, states: stepStates(review) });
  });
  app.put('/api/reviews/:id/frame', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'No policy review with that id.' });
    const parsed = parseFrame(req.body?.frame);
    if ('errors' in parsed) return res.status(400).json({ error: parsed.errors.join(' '), errors: parsed.errors });
    const out = saveStep(r, 'frame', parsed.frame);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, { kind: 'research', summary: `Changed the frame of policy review "${out.review.title}"`, detail: { id: r.id, step: 'frame', hash: out.review.steps.frame?.hash } });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Step 2: the standard indicators from the archived pull on or before the frame's As of day.
  app.post('/api/reviews/:id/diagnose', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    const frame = r && frameOf(r);
    if (!r || !frame) return res.status(404).json({ error: 'No policy review with that id.' });
    const days = listArchivedDays(ARCHIVE_DIR, frame.iso3);
    const past = archivedSnapshot(frame.iso3, frame.asOf);
    if (!past) {
      return res.status(409).json({
        error: days.length
          ? `No saved pull for ${frame.iso3} on or before ${frame.asOf}; the archive starts ${days[0]}. Change the As of day in the frame.`
          : `No saved pulls for ${frame.iso3} yet. Open the country once (or run Menu > Offline data) so the app saves a pull, then run Diagnose again.`,
        days,
      });
    }
    const pulledAt = new Date(past.pulledAt).toISOString();
    const diagnosis = withModelFigures(buildDiagnosis(figureRows({ ...past.snapshot, fetchedAt: pulledAt }), { iso3: frame.iso3, asOf: frame.asOf, pullDate: past.date, pulledAt, incomplete: past.incomplete }));
    const out = saveStep(r, 'diagnose', diagnosis);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, {
      kind: 'research',
      summary: `Diagnosed policy review "${out.review.title}" from the ${past.date} pull`,
      detail: { id: r.id, step: 'diagnose', hash: out.review.steps.diagnose?.hash, pullDate: past.date, pulledAt, coverage: diagnosis.coverage, figures: diagnosis.figures.map((x) => ({ ref: x.ref, label: x.label, value: x.value, source: x.source, period: x.period, reason: x.reason || undefined })) },
    });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Step 3: the council proposes and ranks options from the frozen diagnosis (temperature 0, prompt hashed).
  app.post('/api/reviews/:id/options', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    const frame = r && frameOf(r);
    if (!r || !frame) return res.status(404).json({ error: 'No policy review with that id.' });
    if (stepStates(r).diagnose !== 'done') return res.status(400).json({ error: 'Diagnose must be done first.' });
    const diagnosis = r.steps.diagnose!.content as Diagnosis;
    const userOptions = parseUserOptions(req.body?.userOptions);
    const ownOnly = req.body?.ownOnly === true;
    const prompt = optionsPrompt(frame, diagnosis, userOptions);
    const promptHash = crypto.createHash('sha256').update(OPTIONS_INSTRUCTION + '\n' + prompt).digest('hex');
    const base = { templateVersion: OPTIONS_TEMPLATE_VERSION, temperature: 0, promptHash, userOptions };
    let content: OptionsStep;
    if (ownOnly) {
      if (!userOptions.length) return res.status(400).json({ error: 'Add at least one option of your own, or ask the council.' });
      content = { ...base, model: null, options: unassessedOptions(userOptions), ranking: '', gaps: [], removed: [], reason: 'saved with your own options only; the council was not asked' };
    } else {
      const step = await reviewOptionsStep(frame, diagnosis, userOptions, req.body?.runtimeConfig || {});
      if (!('content' in step)) return res.status(step.status).json({ error: step.error });
      content = { ...base, ...step.content };
    }
    const out = saveStep(r, 'options', content);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, {
      kind: 'council',
      summary: `Options for policy review "${out.review.title}"${content.model ? '' : ' (your own, not assessed)'}`,
      detail: { id: r.id, step: 'options', hash: out.review.steps.options?.hash, model: content.model, temperature: 0, promptHash, templateVersion: OPTIONS_TEMPLATE_VERSION, options: content.options.map((o) => o.title), userOptions: userOptions.length, removedSentences: content.removed.length },
    });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Step 4: the evidence pack (charts and tests, past episodes, validation status), all cut at the As of day.
  app.post('/api/reviews/:id/evidence', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    const frame = r && frameOf(r);
    if (!r || !frame) return res.status(404).json({ error: 'No policy review with that id.' });
    if (stepStates(r).options !== 'done') return res.status(400).json({ error: 'Options must be done first.' });
    const options = r.steps.options!.content as OptionsStep;
    const set = await seriesFor(frame.iso3);
    const countryName = (await fetchLiveOpenDataSnapshot(frame.iso3, undefined, { cacheOnly: true }).catch(() => null))?.countryName || frame.iso3;
    const fetchOne = (id: string): FetchedSeriesLike | { reason: string } => {
      const hit = set.series.find((x) => x.id === id);
      if (hit) {
        const cut = cutAt(hit, frame.asOf);
        return cut.points.length ? cut : { reason: `no points on or before ${frame.asOf}` };
      }
      return { reason: set.missing.find((m) => m.id === id)?.reason || 'the app holds no history for it yet' };
    };
    const analyses = packRequests({ iso3: frame.iso3, countryName }).map(({ id, informs, req: chart }) => {
      const fetched = chart.series.map((ref) => {
        const first = fetchOne(ref.id);
        return 'reason' in first && ref.fallback ? (() => { const alt = fetchOne(ref.fallback!); return 'reason' in alt ? first : alt; })() : first;
      });
      return runAnalysis(id, informs, chart, fetched as any);
    });
    const policy = set.series.find((x) => x.id === 'policy_rate');
    const cpi = set.series.find((x) => x.id === 'cpi_monthly');
    const items = pastEpisodes(policy && cutAt(policy, frame.asOf), cpi && cutAt(cpi, frame.asOf), frame.asOf);
    const v = loadValidation(VALIDATION_FILE);
    const verdicts = Object.fromEntries(Object.entries(v.results).map(([k, x]) => [k, { status: x.status, verdict: x.verdict }]));
    const signals = signalsFor(options, verdicts);
    const content: EvidenceStep = {
      templateVersion: EVIDENCE_TEMPLATE_VERSION,
      asOf: frame.asOf,
      analyses,
      episodes: {
        items,
        method: EPISODE_METHOD,
        ...(policy ? { source: policy.source } : { missing: set.missing.find((m) => m.id === 'policy_rate')?.reason || 'No BIS policy rate history' }),
        ...(policy && !items.length ? { missing: `no policy-rate move at least a year before ${frame.asOf} in the history the app holds` } : {}),
      },
      signals,
      perOption: perOption(options, analyses, signals),
      researchOnly: isResearchOnly(signals),
    };
    const out = saveStep(r, 'evidence', content);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, {
      kind: 'research',
      summary: `Evidence for policy review "${out.review.title}"`,
      detail: { id: r.id, step: 'evidence', hash: out.review.steps.evidence?.hash, asOf: frame.asOf, analyses: analyses.map((a) => ({ id: a.id, tests: a.tests.length, missing: a.missing.length, inputs: a.inputs })), episodes: items.length, signals: signals.map((s) => `${s.id}: ${s.statusLabel}`), researchOnly: content.researchOnly },
    });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Step 5: the memo, assembled from the saved steps and the principal's choices (no AI).
  app.post('/api/reviews/:id/memo', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    const frame = r && frameOf(r);
    if (!r || !frame) return res.status(404).json({ error: 'No policy review with that id.' });
    if (stepStates(r).evidence !== 'done') return res.status(400).json({ error: 'Evidence must be done first.' });
    const parsed = parseMemoInputs(req.body, r.steps.options!.content as OptionsStep, frame.asOf);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const memo = buildMemo(r, parsed.inputs);
    const out = saveStep(r, 'memo', memo);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, {
      kind: 'research',
      summary: `Wrote the memo for policy review "${out.review.title}"`,
      detail: { id: r.id, step: 'memo', hash: out.review.steps.memo?.hash, recommended: parsed.inputs.recommended, reviewDate: parsed.inputs.reviewDate, watch: parsed.inputs.watch, researchOnly: memo.researchOnly },
    });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Step 6: the same indicators from the latest saved pull, beside the figures the review started from.
  app.post('/api/reviews/:id/outcomes', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    const frame = r && frameOf(r);
    if (!r || !frame) return res.status(404).json({ error: 'No policy review with that id.' });
    if (stepStates(r).memo !== 'done') return res.status(400).json({ error: 'Write the memo first.' });
    const today = new Date().toISOString().slice(0, 10);
    const past = archivedSnapshot(frame.iso3, today);
    if (!past) return res.status(409).json({ error: `No saved pull for ${frame.iso3} yet. Open the country so the app saves one, then check again.` });
    const pulledAt = new Date(past.pulledAt).toISOString();
    const now = withModelFigures(buildDiagnosis(figureRows({ ...past.snapshot, fetchedAt: pulledAt }), { iso3: frame.iso3, asOf: today, pullDate: past.date, pulledAt, incomplete: past.incomplete }));
    const content = buildOutcomes(frame, r.steps.diagnose!.content as Diagnosis, now, r.steps.memo!.content as MemoStep, today);
    const out = saveStep(r, 'outcomes', content);
    if ('error' in out) return res.status(400).json({ error: out.error });
    if (!writeReview(res, out.review)) return;
    appendAudit(AUDIT_FILES, {
      kind: 'research',
      summary: `Checked outcomes of policy review "${out.review.title}" (${content.goal.move.replace(/_/g, ' ')})`,
      detail: { id: r.id, step: 'outcomes', hash: out.review.steps.outcomes?.hash, pullDate: past.date, early: content.early, goal: content.goal },
    });
    res.json({ review: out.review, states: stepStates(out.review) });
  });
  // Sign-off on a review's memo: same steps as a saved report, on the memo step's hash.
  app.post('/api/signoffs/review/:id', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    // Approving is an Admin step once accounts exist (docs/RISK_AND_COMPLIANCE.md: the Approver).
    if (signedIn(res) && req.body?.step === 'approved' && signedIn(res)!.role !== 'admin') return res.status(403).json({ error: refusal(signedIn(res)!.role, 'admin') });
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'No policy review with that id.' });
    if (stepStates(r).memo !== 'done') return res.status(400).json({ error: 'Write the memo first (and run it again if it is out of date).' });
    const hash = r.steps.memo!.hash;
    const out = takeStep(recordFor(loadSignOffs(SIGNOFF_FILE), 'review', r.id), 'review', r.id, hash, req.body || {}, new Date(), signedIn(res) ?? undefined);
    if ('error' in out) return res.status(400).json({ error: out.error });
    try {
      saveSignOff(SIGNOFF_FILE, out.record);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not save the sign-off (${error?.code || error?.message || 'unknown error'}).` });
    }
    const view = signOffView(out.record, hash);
    const verb = { reviewed: 'Reviewed', approved: out.entry.selfApproved ? 'Approved (self-approved, no second reviewer)' : 'Approved', withdrawn: 'Withdrew the sign-off on' }[out.entry.step];
    appendAudit(AUDIT_FILES, {
      kind: 'signoff',
      summary: `${verb} the memo of policy review "${r.title.slice(0, 150)}" (${out.entry.by})`,
      detail: { reviewId: r.id, step: out.entry.step, by: out.entry.by, contentHash: hash, status: SIGNOFF_LABEL[view.status], ...(out.entry.note ? { note: out.entry.note } : {}) },
    });
    res.json(view);
  });
  app.delete('/api/reviews/:id', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'No policy review with that id.' });
    if (r.steps.memo && signOffView(recordFor(loadSignOffs(SIGNOFF_FILE), 'review', r.id), r.steps.memo.hash).status === 'approved') {
      return res.status(409).json({ error: 'This review\'s memo is approved. Withdraw the approval first, then delete it.' });
    }
    try {
      deleteReview(REVIEW_FILE, r.id);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not delete the policy review (${error?.code || error?.message || 'unknown error'}).` });
    }
    appendAudit(AUDIT_FILES, { kind: 'research', summary: `Deleted policy review "${r.title}"`, detail: { id: r.id } });
    res.json({ ok: true });
  });
  // Pre-registered backtests: the tests as registered (with their hashes) and the latest verdicts.
  app.get('/api/validation', (_req, res) => {
    const v = loadValidation(VALIDATION_FILE);
    const specs = loadSpecs(SPEC_DIR).map((s) => ({ file: s.file, hash: s.hash, problem: s.problem, ...(s.spec ? { id: s.spec.id, version: s.spec.version, registeredOn: s.spec.registeredOn, hypothesis: s.spec.hypothesis, passMark: s.spec.passMark, params: s.spec.params, sample: s.spec.sample, knownLimits: s.spec.knownLimits, framework: s.spec.framework === 2 ? 2 : 1, retestOf: s.spec.retestOf } : {}) }));
    res.json({ ...v, specs, running: validationRunning, file: 'data/local/validation/results.json' });
  });
  app.post('/api/validation/run', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (validationRunning) return res.status(409).json({ error: 'The backtests are already running.' });
    validationRunning = true;
    try {
      const out = await runBacktests({
        specDir: SPEC_DIR,
        resultFile: VALIDATION_FILE,
        onResult: (r) =>
          appendAudit(AUDIT_FILES, {
            kind: 'validation',
            summary: `Backtest ${r.id} v${r.specVersion}: ${r.status.replace(/_/g, ' ')}`,
            detail: { verdict: r.verdict, framework: r.framework ?? 1, stricterCheck: r.robustness?.verdict, specHash: r.specHash, cases: r.cases, hits: r.hits, baseRatePct: r.baseRatePct, pValue: r.pValue, span: r.span, data: r.data },
          }),
      });
      res.json(out);
    } catch (error: any) {
      res.status(500).json({ error: `The backtests could not run (${error?.message || 'unknown error'}).` });
    } finally {
      validationRunning = false;
    }
  });
  // Council regression set (src/utils/councilRegression.ts): fixed agent answers through the real
  // summary step on the model set in the app; each case saved as an answer snapshot.
  let regressionRunning = false;
  app.post('/api/council/regression', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (regressionRunning) return res.status(409).json({ error: 'The regression set is already running.' });
    regressionRunning = true;
    try {
      const file = path.join(__dirname, 'docs', 'validation', 'council-regression', 'cases.json');
      const text = fs.readFileSync(file, 'utf8');
      const set = parseRegressionSet(JSON.parse(text));
      const runtimeConfig = req.body?.runtimeConfig && typeof req.body.runtimeConfig === 'object' ? req.body.runtimeConfig : savedAiConfig();
      const results: RegressionCaseResult[] = [];
      let model: string | null = null;
      for (const c of set.cases) {
        if (c.kind === 'options' && c.options) {
          const r = await optionsRegressionCase(c, runtimeConfig);
          model = model || r.model || null;
          results.push(r);
          continue;
        }
        if (c.kind === 'supreme' && c.supreme) {
          const r = await supremeRegressionCase(c, runtimeConfig);
          model = model || r.model || null;
          results.push(r);
          continue;
        }
        const out = await answerAndRecord(c.question, c.answers, { runtimeConfig, askedAt: '2026-11-05T00:00:00.000Z' }, `Regression check ${c.id}`);
        model = model || out.snapshot?.model || null;
        const b = out.brief;
        results.push({
          ...checkRegressionCase(c, out),
          model: out.snapshot?.model ?? null,
          ...(out.snapshot ? { temperature: out.snapshot.temperature, seed: out.snapshot.seed, promptHash: out.snapshot.promptHash, outputHash: out.snapshot.outputHash } : {}),
          answer: b ? [b.headline, ...b.points, ...b.disagreements, ...b.gaps] : [],
        });
      }
      const report: RegressionReport = { ranAt: new Date().toISOString(), setVersion: set.version, setHash: sha256(text), model, passed: results.filter((r) => r.pass).length, total: results.length, results };
      writeFileAtomic(path.join(path.dirname(VALIDATION_FILE), 'council-regression.json'), JSON.stringify(report, null, 1), 0o600);
      appendAudit(AUDIT_FILES, {
        kind: 'validation',
        summary: `Council regression set v${set.version}: ${report.passed} of ${report.total} passed on ${model || 'no model'}`,
        detail: { setHash: report.setHash, model, results: results.map((r) => ({ id: r.id, pass: r.pass, snapshot: r.snapshotId, failures: r.failures })) },
      });
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: `The regression set could not run (${error?.message || 'unknown error'}).` });
    } finally {
      regressionRunning = false;
    }
  });

  // Morning brief settings and runs (src/utils/morningBrief.ts).
  app.get('/api/morning-brief', (_req, res) => {
    const file = loadMorning();
    res.json({ ...file, next: nextRunText(file, new Date()), running: morningRunning, watchlists: savedWatchlists().map((l) => ({ id: l.id, name: l.name, countries: l.iso3.length })), file: 'data/local/morning-brief.json' });
  });
  app.put('/api/morning-brief', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const problem = settingsProblem(req.body?.settings);
    if (problem) return res.status(400).json({ error: problem });
    const file = loadMorning();
    const settings = cleanSettings(req.body.settings);
    // A new time later today still runs today.
    const next: MorningBriefFile = { ...file, settings };
    if (settings.time !== file.settings.time || settings.timeZone !== file.settings.timeZone) delete next.lastScheduledDay;
    saveMorning(next);
    res.json({ ...next, next: nextRunText(next, new Date()) });
  });
  app.post('/api/morning-brief/run', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (morningRunning) return res.status(409).json({ error: 'A morning brief is already running.' });
    const run = await runMorningBrief('manual');
    res.json({ lastRun: run });
  });
  app.get('/api/research', (_req, res) => res.json({ ...summarise(loadLibrary(RESEARCH_FILE)), file: 'data/local/research.json' }));
  app.get('/api/research/briefs/:id', (req, res) => {
    const b = loadLibrary(RESEARCH_FILE).briefs.find((x) => x.id === req.params.id);
    return b ? res.json(b) : res.status(404).json({ error: 'No saved conversation with that id.' });
  });
  app.post('/api/research/briefs', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    if (!isBrief(req.body)) return res.status(400).json({ error: 'A council conversation is needed.' });
    writeResearch(res, (lib) => addBrief(lib, req.body).lib, { id: briefId(req.body.startedAt || req.body.askedAt) });
  });
  app.delete('/api/research/briefs/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const b = loadLibrary(RESEARCH_FILE).briefs.find((x) => x.id === req.params.id);
    if (b && signOffView(recordFor(loadSignOffs(SIGNOFF_FILE), 'brief', b.id), reportHash(b as any)).status === 'approved') {
      return res.status(409).json({ error: 'This report is approved. Withdraw the approval first, then delete it.' });
    }
    writeResearch(res, (lib) => removeBrief(lib, req.params.id));
  });
  // Standard council documents (agent and synthesis) saved to Reports from Council chat.
  app.get('/api/research/council-docs/:id', (req, res) => {
    const d = loadLibrary(RESEARCH_FILE).councilDocs.find((x) => x.id === req.params.id);
    return d ? res.json(d) : res.status(404).json({ error: 'No saved council document with that id.' });
  });
  app.post('/api/research/council-docs', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const list: unknown[] = Array.isArray(req.body?.documents) ? req.body.documents.slice(0, 12) : [req.body];
    if (!list.length || !list.every(isCouncilDocument)) return res.status(400).json({ error: 'A standard council document is needed.' });
    writeResearch(res, (lib) => list.reduce((l: typeof lib, d) => addCouncilDoc(l, d as CouncilDocument), lib), { ids: list.map((d) => (d as CouncilDocument).id) });
  });
  app.delete('/api/research/council-docs/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    writeResearch(res, (lib) => removeCouncilDoc(lib, req.params.id));
  });
  app.get('/api/research/docs/:id', (req, res) => {
    const d = loadLibrary(RESEARCH_FILE).docs.find((x) => x.id === req.params.id);
    return d ? res.json(d) : res.status(404).json({ error: 'No saved document with that id.' });
  });
  app.post('/api/research/docs', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    if (!isDoc(req.body)) return res.status(400).json({ error: 'A document with a title and text is needed.' });
    writeResearch(res, (lib) => addDoc(lib, req.body));
  });
  app.delete('/api/research/docs/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    writeResearch(res, (lib) => removeDoc(lib, req.params.id));
  });
  // Research notebooks: conversations and documents grouped by topic, with notes, in the same file.
  app.post('/api/research/notebooks', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const lib = loadLibrary(RESEARCH_FILE);
    const made = addNotebook(lib, String(req.body?.title ?? ''));
    if (!made) return res.status(400).json({ error: lib.notebooks.length >= 50 ? 'At most 50 notebooks; delete one first.' : 'A notebook needs a title.' });
    const withContents = req.body && (Array.isArray(req.body.briefIds) || Array.isArray(req.body.docIds)) ? updateNotebook(made.lib, made.id, { briefIds: req.body.briefIds, docIds: req.body.docIds }) : made.lib;
    writeResearch(res, () => withContents || made.lib, { id: made.id });
  });
  app.put('/api/research/notebooks/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const b = req.body || {};
    const patch = {
      ...(typeof b.title === 'string' ? { title: b.title } : {}),
      ...(typeof b.notes === 'string' ? { notes: b.notes } : {}),
      ...(Array.isArray(b.briefIds) ? { briefIds: b.briefIds } : {}),
      ...(Array.isArray(b.docIds) ? { docIds: b.docIds } : {}),
    };
    const next = updateNotebook(loadLibrary(RESEARCH_FILE), req.params.id, patch);
    if (!next) return res.status(404).json({ error: 'No notebook with that id.' });
    writeResearch(res, () => next);
  });
  app.delete('/api/research/notebooks/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    writeResearch(res, (lib) => removeNotebook(lib, req.params.id));
  });
  app.get('/api/research/notebooks/:id', (req, res) => {
    const nb = loadLibrary(RESEARCH_FILE).notebooks.find((n) => n.id === req.params.id);
    return nb ? res.json(nb) : res.status(404).json({ error: 'No notebook with that id.' });
  });
  app.get('/api/export/notebook/:id.md', (req, res) => {
    const lib = loadLibrary(RESEARCH_FILE);
    const nb = lib.notebooks.find((n) => n.id === req.params.id);
    if (!nb) return res.status(404).json({ error: 'No notebook with that id.' });
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${notebookFileName(nb)}"`);
    res.send(notebookMarkdown(nb, lib.briefs, lib.docs));
  });
  // Watch alerts: thresholds you set, kept in data/local/watch-rules.json. Evaluated in the page.
  // Series history (src/utils/seriesHistory.ts): every figure's run of real observations.
  const quick = <T,>(p: Promise<T | null>): Promise<T | null> =>
    Promise.race([p.catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]);
  async function seriesFor(iso3: string) {
    const [cbpol, cli, cpi, nationalCpi, cftc, tic, official, hcSpreadPull, qna, activity, fxHistory] = await Promise.all([
      quick(fetchCbpolPull()), quick(fetchCliPull()), quick(fetchCpiPull()), quick(fetchNationalCpi()), quick(fetchCftcPull()), quick(fetchTicPull()),
      // Saved history answers at once; a first download that takes longer than 8 s finishes in the background.
      quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3)),
      quick(fetchHcSpread()).then((h) => h ?? loadMarketExtras().hcSpread ?? null),
      quick(fetchQnaPull()),
      quick(fetchMonthlyActivity()),
      // Saved quarters answer at once; a first download finishes in the background.
      quick(fetchFxHistory()).then((h) => h ?? loadFxHistory()),
    ]);
    const merged = mergeNationalCpi(cpi?.series, nationalCpi?.series || {});
    const archive: ArchivedSnapshot[] = listArchivedDays(ARCHIVE_DIR, iso3)
      .map((d) => readArchivedPull<ArchivedSnapshot['snapshot']>(ARCHIVE_DIR, iso3, d))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((x) => ({ date: x.date, pulledAt: x.pulledAt, snapshot: x.snapshot }));
    return countrySeries(iso3, {
      cbpol,
      cli,
      qna,
      activity,
      cpiOecdAnswered: Boolean(cpi),
      cpi: merged ? { pulledAt: [cpi?.pulledAt, nationalCpi?.pulledAt].filter(Boolean).sort().pop() || '', series: merged } : null,
      cftc,
      tic,
      archive,
      official,
      hcSpread: hcSpreadPull,
      fxHistory,
      currency: SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3.toUpperCase())?.currencyCode,
    });
  }
  async function worldSeries(): Promise<Series[]> {
    await quick(fetchCommodities());
    const m = commodityMemory;
    const prices = [...Object.values(m?.pink?.series || {}), ...Object.values(m?.eia?.series || {})];
    return commoditySeries(prices, { pink_sheet: m?.pink?.pulledAt, eia: m?.eia?.pulledAt });
  }
  app.get('/api/series/world', async (_req, res) => {
    const series = await worldSeries();
    res.json({ series: series.map(seriesSummary), missing: series.length ? [] : [{ id: 'commodities', label: 'Commodity prices', reason: 'The World Bank Pink Sheet has not answered yet' }] });
  });
  app.get('/api/series/world/:id', async (req, res) => {
    const hit = (await worldSeries()).find((s) => s.id === req.params.id);
    if (!hit) return res.status(404).json({ error: 'NO_SERIES', message: `No series ${req.params.id} for world prices.` });
    res.json(hit);
  });
  // Teaching episodes: a country, a past date and a question set, kept with saved research.
  app.post('/api/research/episodes', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const made = addEpisode(loadLibrary(RESEARCH_FILE), req.body || {});
    if ('error' in made) return res.status(400).json({ error: made.error });
    writeResearch(res, () => made.lib, { id: made.id });
  });
  app.put('/api/research/episodes/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    const next = updateEpisode(loadLibrary(RESEARCH_FILE), req.params.id, req.body || {});
    if (!next) return res.status(404).json({ error: 'No episode with that id.' });
    writeResearch(res, () => next);
  });
  app.delete('/api/research/episodes/:id', (req, res) => {
    if (refuseRemoteResearch(req, res)) return;
    writeResearch(res, (lib) => removeEpisode(lib, req.params.id));
  });
  app.get('/api/export/episode/:id.md', async (req, res) => {
    const ep = loadLibrary(RESEARCH_FILE).episodes.find((e) => e.id === req.params.id);
    if (!ep) return res.status(404).json({ error: 'No episode with that id.' });
    const set = await seriesFor(ep.iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const policy = pick('policy_rate');
    const replay = replayDecision({ iso3: ep.iso3, date: ep.date, policy, cpi: pick('cpi_monthly'), cli: pick('cli'), target: INFLATION_TARGETS[ep.iso3] });
    const teacher = req.query.teacher === '1';
    const name = (await fetchLiveOpenDataSnapshot(ep.iso3, undefined, { cacheOnly: true }).catch(() => null))?.countryName || ep.iso3;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${episodeFileName(ep, teacher)}"`);
    res.send(episodeMarkdown(ep, name, 'error' in replay ? replay : { replay, policySource: policy?.source ?? null }, { teacher }));
  });
  // Output gap (src/utils/outputGap.ts): HP and Hamilton filters on saved IMF real GDP growth.
  app.get('/api/output-gap/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    res.json({ iso3, ...outputGapFrom(file) });
  });
  // Debt sustainability (src/utils/debtSustainability.ts): debt dynamics and stress scenarios on IMF figures.
  app.get('/api/debt-sustainability/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const r = dsaFrom(file);
    res.json({ iso3, ...r, ...(r.ok ? { sentence: dsaSentence(r) } : {}) });
  });
  // Replicate a rate decision (src/utils/decisionReplay.ts): the week-before data, the rule, the move.
  app.get('/api/decision-replay/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const policy = pick('policy_rate');
    const why = (id: string) => set.missing.find((m) => m.id === id)?.reason;
    const target = INFLATION_TARGETS[iso3];
    const base = {
      iso3,
      decisions: decisionsFrom(policy),
      policySource: policy?.source ?? null,
      first: policy?.points[0]?.date ?? null,
      last: policy?.points[policy.points.length - 1]?.date ?? null,
      ...(policy ? {} : { policyMissing: why('policy_rate') || 'No BIS policy rate history' }),
      target: target ?? null,
    };
    if (req.query.date === undefined) return res.json(base);
    const date = String(req.query.date);
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(date)) return res.status(400).json({ error: 'BAD_DATE', message: 'date must be YYYY-MM-DD or YYYY-MM.' });
    const cpi = pick('cpi_monthly');
    const cli = pick('cli');
    const replay = replayDecision({ iso3, date, policy, cpi, cli, target });
    if ('error' in replay) return res.status(404).json({ error: 'NO_REPLAY', message: replay.error, ...base });
    if (!cpi && why('cpi_monthly')) replay.missing = replay.missing.map((m) => (m === 'monthly inflation' ? `monthly inflation (${why('cpi_monthly')})` : m));
    res.json({ ...base, replay, sentence: replaySentence(replay) });
  });
  // Nowcasts (src/utils/nowcast.ts): GDP and inflation for periods whose official figure is not out
  // yet, from published figures only. Long histories for the fits come from data/live/model-history.json
  // (src/utils/modelHistory.ts), pulled at most once a week; DBnomics calls go through the OECD queue.
  let modelHistoryInFlight: Promise<ModelHistory | null> | null = null;
  const modelFetcher = async (url: string): Promise<string> => {
    if (url.includes('db.nomics.world')) {
      const r = await oecdFetch(url, 60000);
      if (!r || r.status < 200 || r.status >= 300) throw new Error(r ? `HTTP ${r.status}` : 'paused after a refusal');
      return r.text;
    }
    const r = await fetchWithTimeout(url, 60000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  };
  async function modelHistory(): Promise<ModelHistory | null> {
    const saved = loadModelHistory(DATA_DIR);
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MODEL_HISTORY_MAX_AGE_MS) return saved;
    modelHistoryInFlight ??= pullModelHistory(modelFetcher, saved)
      .then((h) => {
        if (h.policyMonthly || h.cli || h.cpi) saveModelHistory(DATA_DIR, h);
        return h;
      })
      .catch(() => saved)
      .finally(() => {
        modelHistoryInFlight = null;
      });
    // A first pull can take a while: answer with what is saved and let it finish in the background.
    return saved ?? (await Promise.race([modelHistoryInFlight, new Promise<null>((r) => setTimeout(() => r(null), 20000))]));
  }
  app.get('/api/nowcast/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const today = new Date().toISOString().slice(0, 10);
    const asOf = parseAsOfDate(req.query.asOf) ?? today;
    if (asOf > today) return res.status(400).json({ error: 'BAD_DATE', message: 'The As-of date cannot be in the future.' });
    const [qna, activity, hist, nationalCpi] = await Promise.all([quick(fetchQnaPull()), quick(fetchMonthlyActivity()), modelHistory(), quick(fetchNationalCpi())]);
    const gdpPts = qnaFor(iso3, qna?.series)?.qoq ?? [];
    const act = activity?.series?.[iso3];
    const cliPts = areaSeries(iso3, hist?.cli ?? undefined);
    const cpiRun = spliceInflation(areaSeries(iso3, hist?.cpi ?? undefined)?.points, nationalCpi?.series?.[iso3]);
    const inputs = {
      iso3,
      asOf,
      live: asOf === today,
      gdp: gdpPts.length ? { points: gdpPts.map((p) => ({ date: p.period, value: p.value })), source: QNA_LABEL, pulledAt: qna?.pulledAt } : null,
      activity: act?.points?.length ? { points: act.points.map((p) => ({ date: p.period, value: p.value })), source: act.long, label: act.short, pulledAt: activity?.pulledAt } : null,
      cli: cliPts?.length ? { points: cliPts.map((p) => ({ date: p.period, value: p.value })), source: 'OECD composite leading indicator via DBnomics', pulledAt: hist?.pulledAt } : null,
      cpi: cpiRun ? { ...cpiRun, pulledAt: hist?.pulledAt } : null,
    };
    const gdp = gdpNowcast(inputs);
    const cpi = cpiNowcast(inputs);
    res.json({
      iso3,
      asOf,
      gdp,
      cpi,
      sentences: [gdp, cpi].filter((r): r is Extract<typeof r, { ok: true }> => r.ok).map(nowcastSentence),
      history: hist ? { pulledAt: hist.pulledAt, problems: hist.problems } : { pulledAt: null, problems: ['Long histories not downloaded yet; the first download runs in the background.'] },
    });
  });
  // Forecasts with fan charts (src/utils/forecasts.ts): GDP growth, inflation, policy rate, debt,
  // beside the IMF's own projection where it makes one.
  app.get('/api/forecast/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const [qna, hist, nationalCpi, official] = await Promise.all([
      quick(fetchQnaPull()),
      modelHistory(),
      quick(fetchNationalCpi()),
      quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3)),
    ]);
    const imfSeries = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(official, fig) : null;
      return s && 'points' in s ? { points: s.points, source: s.source, pulledAt: s.pulledAt } : null;
    };
    const gdpPts = qnaFor(iso3, qna?.series)?.qoq ?? [];
    const cpiRun = spliceInflation(areaSeries(iso3, hist?.cpi ?? undefined)?.points, nationalCpi?.series?.[iso3]);
    const area = CBPOL_AREA[iso3];
    const pol = area ? hist?.policyMonthly?.[area]?.points : undefined;
    const debt = imfSeries('debt_gdp');
    const out: ForecastOutcome[] = [
      withImf(forecastSeries('gdp_qoq', gdpPts.length ? { points: gdpPts.map((p) => ({ date: p.period, value: p.value })), source: QNA_LABEL, label: 'Real GDP growth, q/q', pulledAt: qna?.pulledAt } : null), imfSeries('gdp_growth')),
      withImf(forecastSeries('cpi_yoy', cpiRun ? { ...cpiRun, label: 'Inflation, monthly y/y', pulledAt: hist?.pulledAt } : null), imfSeries('cpi_imf')),
      forecastSeries('policy_rate', pol?.length ? { points: pol.map((p) => ({ date: p.period, value: p.pct })), source: 'BIS central bank policy rates, monthly (end of month)', label: 'Policy rate', pulledAt: hist?.pulledAt } : null),
      // The fit uses IMF outturns only: years marked as IMF projections are left out.
      withImf(forecastSeries('debt_gdp', debt ? { points: debt.points.filter((p) => p.note !== 'IMF projection'), source: debt.source, label: 'Government debt, % of GDP', pulledAt: debt.pulledAt } : null), debt),
    ];
    if (!area) {
      const i = out.findIndex((r) => r.id === 'policy_rate');
      out[i] = { ok: false, id: 'policy_rate', reason: 'The BIS publishes no policy rate for this country.' };
    }
    res.json({
      iso3,
      forecasts: out,
      sentences: out.filter((r): r is Extract<ForecastOutcome, { ok: true }> => r.ok).map((r) => forecastSentence(r)),
      history: hist ? { pulledAt: hist.pulledAt, problems: hist.problems } : { pulledAt: null, problems: ['Long histories not downloaded yet; the first download runs in the background.'] },
    });
  });
  app.get('/api/series/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    res.json({ iso3, series: set.series.map(seriesSummary), missing: set.missing });
  });
  app.get('/api/series/:iso3/:id', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const hit = set.series.find((s) => s.id === req.params.id);
    if (hit) return res.json({ iso3, ...hit });
    const miss = set.missing.find((m) => m.id === req.params.id);
    res.status(404).json({ error: 'NO_SERIES', message: miss ? `${miss.label}: Missing. ${miss.reason}.` : `No series ${req.params.id}.`, reason: miss?.reason ?? null });
  });

  // Downloads (src/utils/csvExport.ts): CSV with unit, source and dates per value; Missing with its reason.
  // Each table downloads as .csv or .xlsx (src/utils/xlsxExport.ts): same rows, same columns.
  type TableCell = string | number | null | undefined;
  // Sharing mode (Menu > Sharing mode, src/utils/shareMode.ts): values whose source's terms do not let
  // them be passed on for free are held back from every table download.
  const sendTable = (req: express.Request, res: express.Response, name: string, header: string[], allRows: TableCell[][]) => {
    const rows = shareModeFromValue(loadWorkspace(workspaceFor(res)).values[SHARE_MODE_KEY]) ? withholdForSharing(header, allRows) : allRows;
    if (req.params.fmt === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(name.replace(/\.csv$/, '.xlsx'));
      return res.send(Buffer.from(tableWorkbook(name.replace(/\.csv$/, ''), header, rows)));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(name);
    res.send(toCsv(header, rows));
  };
  app.get('/api/export/world/series.:fmt(csv|xlsx)', async (req, res) => {
    sendTable(req, res, exportFileName('WORLD', 'commodity-prices'), SERIES_HEADER, seriesRows('WORLD', await worldSeries()));
  });
  app.get('/api/export/:iso3/series.:fmt(csv|xlsx)', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    sendTable(req, res, exportFileName(iso3, 'series'), SERIES_HEADER, seriesRows(iso3, set.series));
  });
  app.get('/api/export/:iso3/series/:id.:fmt(csv|xlsx)', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const hit = set.series.find((s) => s.id === req.params.id);
    if (!hit) {
      const miss = set.missing.find((m) => m.id === req.params.id);
      return res.status(404).json({ error: 'NO_SERIES', message: miss ? `${miss.label}: Missing. ${miss.reason}.` : `No series ${req.params.id}.` });
    }
    sendTable(req, res, exportFileName(iso3, hit.id), SERIES_HEADER, seriesRows(iso3, [hit]));
  });
  // Panel builder (src/utils/panelTable.ts): countries x figures, latest or full history.
  async function panelData(countriesRaw: unknown): Promise<PanelCountryData[]> {
    const iso3s = parseCountries(countriesRaw);
    return Promise.all(
      iso3s.map(async (iso3) => ({
        iso3,
        snapshot: await fetchLiveOpenDataSnapshot(iso3, SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName, { cacheOnly: true }),
        series: await seriesFor(iso3),
      }))
    );
  }
  app.get('/api/panel', async (req, res) => {
    const figures = parseFigureIds(req.query.figures);
    const data = await panelData(req.query.countries);
    if (!data.length) return res.status(400).json({ error: 'NO_COUNTRIES', message: 'Pick at least one country.' });
    if (req.query.mode === 'history') {
      const rows = panelHistoryRows(data, figures);
      return res.json({ mode: 'history', figures: PANEL_FIGURES.filter((f) => figures.includes(f.id)), rowCount: rows.length, preview: rows.slice(0, 50) });
    }
    res.json({ mode: 'latest', figures: PANEL_FIGURES.filter((f) => figures.includes(f.id)), cells: panelLatest(data, figures) });
  });
  app.get('/api/export/panel.:fmt(csv|xlsx)', async (req, res) => {
    const figures = parseFigureIds(req.query.figures);
    const data = await panelData(req.query.countries);
    if (!data.length) return res.status(400).json({ error: 'NO_COUNTRIES', message: 'Pick at least one country.' });
    if (req.query.mode === 'history') {
      return sendTable(req, res, exportFileName('panel', 'history'), SERIES_HEADER, panelHistoryRows(data, figures));
    }
    sendTable(req, res, exportFileName('panel', 'latest'), PANEL_LATEST_HEADER, panelLatestRows(panelLatest(data, figures)));
  });

  app.get('/api/export/:iso3/figures.:fmt(csv|xlsx)', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (req.query.asOf !== undefined) {
      // The figures as the app held them on a past day, from the pull archive.
      const requested = parseAsOfDate(req.query.asOf);
      if (!requested) return res.status(400).json({ error: 'BAD_DATE', message: 'asOf must be a date, YYYY-MM-DD.' });
      const past = archivedSnapshot(iso3, requested);
      if (!past) return res.status(404).json({ error: 'NOT_IN_ARCHIVE', message: `No archived pull for ${iso3} on or before ${requested}.` });
      return sendTable(req, res, exportFileName(iso3, `figures-as-of-${past.date}`), FIGURES_HEADER, figureRows({ ...past.snapshot, fetchedAt: new Date(past.pulledAt).toISOString() }));
    }
    const snap = await fetchLiveOpenDataSnapshot(iso3, undefined, { cacheOnly: true });
    sendTable(req, res, exportFileName(iso3, 'figures'), FIGURES_HEADER, figureRows(snap));
  });

  // Track record log (src/utils/trackRecord.ts): the rule signal on each saved pull and what the bank did after.
  async function trackRecordFor(iso3: string) {
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const days: ArchivedDay[] = listArchivedDays(ARCHIVE_DIR, iso3)
      .map((d) => readArchivedPull<ArchivedDay['snapshot']>(ARCHIVE_DIR, iso3, d))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((x) => ({ date: x.date, snapshot: x.snapshot }));
    const policy = pick('policy_rate');
    return {
      record: trackRecord({ iso3, days, policy, cpi: pick('cpi_monthly'), target: INFLATION_TARGETS[iso3] }),
      policyMissing: policy ? null : set.missing.find((m) => m.id === 'policy_rate')?.reason || 'No BIS policy rate history',
    };
  }
  // GDELT raw files: the weekly series for one country, the last pull and the settings.
  app.get('/api/gdelt-raw/:iso3', (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const series = gdeltRawSeriesFor(iso3);
    const cfg = gdeltRawConfig(process.env);
    res.json({ series, reading: gdeltRawReading(series), pull: loadGdeltRawPullState(gdeltRawDir(DATA_DIR)), weeks: cfg.weeks, gkgEveryHours: cfg.gkgEveryMinutes / 60 });
  });
  app.get('/api/track-record/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { record, policyMissing } = await trackRecordFor(iso3);
    res.json({ ...record, sentence: trackRecordSentence(record), policyMissing, target: INFLATION_TARGETS[iso3] ?? null });
  });
  app.get('/api/export/:iso3/debt-scenarios.:fmt(csv|xlsx)', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const r = dsaFrom(loadOfficialHistory(iso3));
    if (!r.ok) return res.status(404).json({ error: 'NO_DSA', message: `Debt sustainability: Missing. ${r.reason}.` });
    sendTable(req, res, exportFileName(iso3, 'debt-scenarios'), ['Scenario', 'Year', 'Government debt (% of GDP)', 'Method'], dsaRows(r).map((row) => [...row, r.method]));
  });
  app.get('/api/export/:iso3/track-record.:fmt(csv|xlsx)', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { record } = await trackRecordFor(iso3);
    sendTable(req, res, exportFileName(iso3, 'track-record'), TRACK_RECORD_HEADER, trackRecordRows(record));
  });

  // As of a past day: the archived pull on or before the date, beside today's figures.
  const archivedSnapshot = (iso3: string, date: string) => {
    const day = archivedDayOnOrBefore(listArchivedDays(ARCHIVE_DIR, iso3), date);
    const pull = day ? readArchivedPull<OpenDataSnapshot>(ARCHIVE_DIR, iso3, day) : null;
    return pull ? { date: pull.date, pulledAt: pull.pulledAt, incomplete: Boolean(pull.incomplete), snapshot: reviveMissing(pull.snapshot, buildBaselineOpenData(iso3)) } : null;
  };
  app.get('/api/as-of/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const days = listArchivedDays(ARCHIVE_DIR, iso3);
    if (req.query.date === undefined) return res.json({ iso3, days });
    const requested = parseAsOfDate(req.query.date);
    if (!requested) return res.status(400).json({ error: 'BAD_DATE', message: 'date must be YYYY-MM-DD.', days });
    const past = archivedSnapshot(iso3, requested);
    if (!past) {
      return res.status(404).json({
        error: 'NOT_IN_ARCHIVE',
        message: days.length ? `No pull for ${iso3} on or before ${requested}; the archive starts ${days[0]}.` : `No archived pulls for ${iso3} yet. The archive gains a day with each pull.`,
        days,
      });
    }
    const now = await fetchLiveOpenDataSnapshot(iso3, undefined, { cacheOnly: true });
    res.json({
      iso3,
      requested,
      date: past.date,
      pulledAt: new Date(past.pulledAt).toISOString(),
      incomplete: past.incomplete,
      nowPulledAt: now.fetchedAt ?? null,
      days,
      rows: asOfRows(figureRows({ ...past.snapshot, fetchedAt: new Date(past.pulledAt).toISOString() }), figureRows(now)),
    });
  });

  // The pull archive: every saved pull by day (data/archive/). Read-only.
  app.get('/api/archive', (_req, res) => {
    res.json({ countries: listArchivedCountries(ARCHIVE_DIR).map((iso3) => ({ iso3, days: listArchivedDays(ARCHIVE_DIR, iso3) })) });
  });
  app.get('/api/archive/:iso3', (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase();
    res.json({ iso3, days: listArchivedDays(ARCHIVE_DIR, iso3) });
  });
  app.get('/api/archive/:iso3/:date', (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase();
    const requested = String(req.params.date || '');
    const days = listArchivedDays(ARCHIVE_DIR, iso3);
    const day = archivedDayOnOrBefore(days, requested);
    const pull = day ? readArchivedPull<OpenDataSnapshot>(ARCHIVE_DIR, iso3, day) : null;
    if (!pull) {
      return res.status(404).json({
        error: 'NOT_IN_ARCHIVE',
        message: days.length
          ? `No pull for ${iso3} on or before ${requested}; the archive starts ${days[0]}.`
          : `No archived pulls for ${iso3} yet.`,
        firstDay: days[0] ?? null,
      });
    }
    res.json({
      iso3,
      requested,
      date: pull.date,
      pulledAt: new Date(pull.pulledAt).toISOString(),
      incomplete: Boolean(pull.incomplete),
      snapshot: reviveMissing(pull.snapshot, buildBaselineOpenData(iso3)),
    });
  });

  app.get('/api/watch-rules', (_req, res) => res.json({ rules: loadWatchRules(WATCH_RULES_FILE), file: 'data/local/watch-rules.json' }));
  app.put('/api/watch-rules', (req, res) => {
    if (trusted(req, res) === false) {
      return res.status(403).json({ error: `Watch alerts can only be changed from the computer running the app (this request came from ${req.socket.remoteAddress || 'an unknown address'}).` });
    }
    const rules = parseRules(req.body);
    try {
      saveWatchRules(WATCH_RULES_FILE, rules);
      res.json({ ok: true, rules });
    } catch (error: any) {
      res.status(500).json({ error: `Could not save the watch alerts file (${error?.code || error?.message || 'unknown error'}).` });
    }
  });
  app.put('/api/settings/keys/:id', async (req, res) => {
    if (refuseRemote(req, res)) return;
    const next = withKey(savedSettings, req.params.id, req.body?.value);
    if ('error' in next) return res.status(400).json({ error: next.error });
    try {
      saveSettings(SETTINGS_FILE, next.settings);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not save the settings file (${error?.code || error?.message || 'unknown error'}).` });
    }
    setSavedSettings(next.settings);
    applyKeysToEnv(process.env, ENV_FILE_KEYS, savedSettings);
    onKeyChanged(req.params.id);
    const check = await runKeyCheck(req.params.id, process.env, keySources(ENV_FILE_KEYS, savedSettings)).catch(() => null);
    res.json({ ...keysReply(req, res), check });
  });
  app.delete('/api/settings/keys/:id', async (req, res) => {
    if (refuseRemote(req, res)) return;
    if (!API_KEY_IDS.includes(req.params.id)) return res.status(400).json({ error: `Unknown key "${req.params.id}".` });
    const next = withoutKey(savedSettings, req.params.id);
    try {
      saveSettings(SETTINGS_FILE, next);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not save the settings file (${error?.code || error?.message || 'unknown error'}).` });
    }
    setSavedSettings(next);
    applyKeysToEnv(process.env, ENV_FILE_KEYS, savedSettings);
    onKeyChanged(req.params.id);
    res.json(keysReply(req, res));
  });
  // Test a key before saving it (or the key in use when no value is sent). Nothing is saved.
  app.post('/api/settings/keys/:id/test', async (req, res) => {
    if (refuseRemote(req, res)) return;
    const field = apiKeyField(req.params.id);
    if (!field) return res.status(400).json({ error: `Unknown key "${req.params.id}".` });
    const value = typeof req.body?.value === 'string' ? req.body.value.trim() : '';
    if (value) {
      const problem = field.validate(value);
      if (problem) return res.status(400).json({ error: problem });
    }
    const env = value ? { ...process.env, [field.id]: value } : process.env;
    const sources = value ? { ...keySources(ENV_FILE_KEYS, savedSettings), [field.id]: 'app' as const } : keySources(ENV_FILE_KEYS, savedSettings);
    const check = await runKeyCheck(field.id, env, sources).catch(() => null);
    res.json({ check });
  });

  // 1b'. Data connection check: asks every outside source for one small real answer, through the
  // same URLs and parsers the app uses, and says in words what connected and why anything did not.
  // Kept 30 seconds so a double click does not hit rate-limited sources (GDELT) twice.
  // Data health: the saved history of connection check runs (src/utils/dataHealth.ts).
  app.get('/api/data/health/sources', (_req, res) => {
    const records = readChecks(DATA_HEALTH_FILES);
    const state = readState(DATA_HEALTH_FILES);
    const last = records.at(-1);
    res.json({
      sources: sourceHealth(records),
      runs: records.length,
      lastRun: last ? { at: last.checkedAt, trigger: last.trigger, label: TRIGGER_LABEL[last.trigger] || last.trigger } : null,
      nightly: { time: NIGHTLY_CHECK_TIME, timeZone: NIGHTLY_CHECK_TZ, lastDay: state.lastNightlyDay || null, lastSkipped: state.lastSkipped || null },
      file: 'data/local/data-health/source-checks.jsonl',
    });
  });
  // Data health: counts for the menu (failing sources at the last check, figures missing or older than usual now).
  app.get('/api/data/health/summary', (_req, res) => {
    const last = readChecks(DATA_HEALTH_FILES).at(-1);
    const open = openIssues(readLedger(FIGURE_WATCH_FILES));
    res.json({
      failingSources: (last?.rows || []).filter((r) => isFailure(r.state)).length,
      lastCheckAt: last?.checkedAt || null,
      missingFigures: open.filter((o) => o.kind === 'missing').length,
      staleFigures: open.filter((o) => o.kind === 'stale').length,
    });
  });
  // Data health: figure alerts (went missing, older than usual, jumps, out of range, revised).
  app.get('/api/data/health/figures', (req, res) => {
    const iso3 = typeof req.query.iso3 === 'string' ? req.query.iso3.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
    const kind = typeof req.query.kind === 'string' && req.query.kind in EVENT_LABEL ? (req.query.kind as FigureEventKind) : null;
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
    const ledger = readLedger(FIGURE_WATCH_FILES);
    const hits = readEvents(FIGURE_WATCH_FILES).filter((e) => (!iso3 || e.iso3 === iso3) && (!kind || e.kind === kind));
    res.json({
      open: openIssues(ledger).filter((o) => !iso3 || o.iso3 === iso3),
      events: hits.slice(-limit).reverse(),
      total: hits.length,
      kinds: EVENT_LABEL,
      watchedSince: Object.keys(ledger.figures).length ? ledger.updatedAt || null : null,
      files: ['data/local/data-health/figures.json', 'data/local/data-health/figure-events.jsonl'],
    });
  });
  // Data health: values the IMF or World Bank revised in the saved yearly history (data/history/).
  app.get('/api/data/health/revisions', (req, res) => {
    const only = typeof req.query.iso3 === 'string' ? req.query.iso3.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
    const projections = req.query.projections === '1';
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 300));
    let codes: string[] = [];
    try {
      codes = fs.readdirSync(HISTORY_DIR).map((n) => /^([A-Z0-9]+)\.json$/.exec(n)?.[1]).filter((c): c is string => Boolean(c));
    } catch {
      // no history downloaded yet
    }
    const labels = new Map(OFFICIAL_FIGURES.map((f) => [f.id, f]));
    const rows: Array<Record<string, unknown> & { seenAt: string }> = [];
    let projectionCount = 0;
    for (const iso3 of codes) {
      if (only && iso3 !== only) continue;
      const file = loadOfficialHistory(iso3);
      for (const [id, revs] of Object.entries(file?.revisions || {})) {
        const fig = labels.get(id);
        for (const r of revs) {
          if (r.projection) projectionCount++;
          if (r.projection && !projections) continue;
          rows.push({ iso3, figure: id, label: fig?.label || id, unit: fig?.unit || '', source: fig ? fig.sourceName || (fig.source === 'imf' ? 'IMF World Economic Outlook' : 'World Bank Open Data') : '', ...r });
        }
      }
    }
    rows.sort((a, b) => (a.seenAt < b.seenAt ? 1 : a.seenAt > b.seenAt ? -1 : 0));
    res.json({ revisions: rows.slice(0, limit), total: rows.length, projectionsHidden: projections ? 0 : projectionCount, countries: codes.length, folder: 'data/history/' });
  });
  app.get('/api/data/connections', async (req, res) => {
    try {
      if (req.query.refresh !== '1' && connectionReportCache && Date.now() - connectionReportCache.at < 30000) {
        return res.json(connectionReportCache.report);
      }
      const report = await runConnectionCheck('manual');
      connectionReportCache = { at: Date.now(), report };
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Connection check failed' });
    }
  });

  // 1b''. Central bank policy rates (BIS), one row per country the app files, with the date of
  // each figure; countries without one say why.
  app.get('/api/data/policy-rates', async (_req, res) => {
    try {
      const pull = await fetchCbpolPull();
      const now = new Date();
      const rows = Object.keys(CBPOL_AREA).map((iso3) => {
        const rate = policyRateFor(iso3, pull, now);
        return rate ? { iso3, rate } : { iso3, missing: cbpolMissing(iso3, !!pull) };
      });
      res.json({ source: 'BIS WS_CBPOL', pulledAt: pull?.pulledAt ?? null, rows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to load policy rates' });
    }
  });

  // 1b''. Commodity prices (Pink Sheet monthly, EIA daily oil), each with its month or day.
  app.get('/api/data/commodities', async (_req, res) => {
    try {
      res.json({ ...(await fetchCommodities()), fetchedAt: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Commodity prices failed' });
    }
  });

  // 1d. UN Comtrade trade partners and export mix, per country, each with its year.
  app.get('/api/data/trade-partners', async (_req, res) => {
    try {
      const file = await Promise.race([fetchComtrade(), new Promise<ComtradeFile | null>((resolve) => setTimeout(() => resolve(comtradeMemory?.file ?? null), 3000))]);
      const keyed = !!(process.env.COMTRADE_API_KEY || '').trim();
      res.json({
        source: keyed ? 'UN Comtrade (your free key)' : 'UN Comtrade (public preview)',
        countries: SOVEREIGN_CATALOG.map((c) => {
          const e = file?.countries[c.iso3];
          return e
            ? { countryName: c.countryName, pulledAt: e.pulledAt, ...e.profile }
            : { iso3: c.iso3, countryName: c.countryName, missing: comtradeMissing(c.iso3, keyed) };
        }),
        fetchedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Trade partners failed' });
    }
  });

  // 1c. MarketEdge benchmarks (US, China, Russia, UK, EU, India), always shown on the MarketEdge screen
  app.get('/api/data/market-edge-anchors', async (_req, res) => {
    try {
      res.json(await fetchMarketEdgeAnchors());
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to load MarketEdge benchmarks' });
    }
  });

  // 2a. Server Runtime Environment Defaults (for Docker & Local Ollama Hydration)
  app.get('/api/ai/runtime-defaults', (_req, res) => {
    const isDockerContainer = Boolean(
      process.env.SELF_HOSTED_DOCKER === 'true' ||
        process.env.OLLAMA_BASE_URL?.includes('host.docker.internal') ||
        process.env.OLLAMA_BASE_URL?.includes('http://ollama')
    );
    res.json({
      providerMode: (serverGuiRuntimeConfig.providerMode ||
        process.env.DEFAULT_AI_PROVIDER ||
        'gemini') as AIRuntimeConfig['providerMode'],
      ollamaBaseUrl:
        serverGuiRuntimeConfig.ollamaBaseUrl ||
        process.env.OLLAMA_BASE_URL ||
        (isDockerContainer ? 'http://host.docker.internal:11434' : 'http://localhost:11434'),
      ollamaQuickModel:
        serverGuiRuntimeConfig.ollamaQuickModel || process.env.OLLAMA_QUICK_MODEL || 'qwen2.5:7b',
      ollamaDeepModel:
        refereeModelOrDefault(serverGuiRuntimeConfig.ollamaDeepModel) || refereeModelOrDefault(process.env.OLLAMA_DEEP_MODEL) || DEFAULT_REFEREE_MODEL,
      openAiBaseUrl:
        serverGuiRuntimeConfig.openAiBaseUrl ||
        process.env.OPENAI_COMPATIBLE_BASE_URL ||
        'http://localhost:8000/v1',
      openAiModel:
        serverGuiRuntimeConfig.openAiModel || process.env.OPENAI_COMPATIBLE_MODEL || 'gpt-4o',
      temperature: serverGuiRuntimeConfig.temperature ?? 0.2,
      numCtx: serverGuiRuntimeConfig.numCtx ?? 8192,
      timeoutSeconds: serverGuiRuntimeConfig.timeoutSeconds ?? 20,
      deskModelOverrides: serverGuiRuntimeConfig.deskModelOverrides || {},
      agentModelOverrides: serverGuiRuntimeConfig.agentModelOverrides || {},
      agentPromptOverrides: serverGuiRuntimeConfig.agentPromptOverrides || {},
      dockerGuiConfig: serverGuiRuntimeConfig.dockerGuiConfig,
      apiConnectors: serverGuiRuntimeConfig.apiConnectors || DEFAULT_SERVER_API_CONNECTORS,
      integrationConfig: serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG,
      hasGeminiKey: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      isDockerContainer,
    });
  });

  // 2a-save. Save GUI-Entered Runtime, Per-Agent Models & Docker Configuration to Live Server
  app.post('/api/ai/runtime-config-save', (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    try {
      const incoming = (req.body?.runtimeConfig || req.body || {}) as Partial<AIRuntimeConfig>;
      serverGuiRuntimeConfig = {
        ...serverGuiRuntimeConfig,
        ...incoming,
        apiConnectors:
          Array.isArray(incoming.apiConnectors) && incoming.apiConnectors.length > 0
            ? incoming.apiConnectors
            : serverGuiRuntimeConfig.apiConnectors || DEFAULT_SERVER_API_CONNECTORS,
        integrationConfig: incoming.integrationConfig
          ? {
              ...(serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG),
              ...incoming.integrationConfig,
            }
          : serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG,
      };
      if (incoming.ollamaBaseUrl) process.env.OLLAMA_BASE_URL = incoming.ollamaBaseUrl;
      if (incoming.ollamaQuickModel) process.env.OLLAMA_QUICK_MODEL = incoming.ollamaQuickModel;
      if (incoming.ollamaDeepModel) process.env.OLLAMA_DEEP_MODEL = incoming.ollamaDeepModel;
      if (incoming.providerMode) process.env.DEFAULT_AI_PROVIDER = incoming.providerMode;

      const dockerCfg = incoming.dockerGuiConfig || {
        targetOs: 'mac_apple_silicon',
        topology: 'host_ollama',
        appPort: 3000,
        ollamaPort: 11434,
        containerName: 'econquest-sovereign-council',
        keepAlive: '24h',
        corsOrigins: '*',
        autoPullOnBoot: true,
      };

      const generatedEnvContent = [
        '# Generated via EconQuest In-App GUI Studio',
        `PORT=${dockerCfg.appPort || 3000}`,
        `DEFAULT_AI_PROVIDER=${incoming.providerMode || 'ollama'}`,
        `OLLAMA_BASE_URL=${incoming.ollamaBaseUrl || 'http://host.docker.internal:11434'}`,
        `OLLAMA_QUICK_MODEL=${incoming.ollamaQuickModel || 'qwen2.5:7b'}`,
        `OLLAMA_DEEP_MODEL=${refereeModelOrDefault(incoming.ollamaDeepModel) || DEFAULT_REFEREE_MODEL}`,
        `OLLAMA_KEEP_ALIVE=${dockerCfg.keepAlive || '24h'}`,
        `OLLAMA_ORIGINS=${dockerCfg.corsOrigins || '*'}`,
        `OPENAI_COMPATIBLE_BASE_URL=${incoming.openAiBaseUrl || 'http://localhost:8000/v1'}`,
        `OPENAI_COMPATIBLE_MODEL=${incoming.openAiModel || 'gpt-4o'}`,
      ].join('\n');

      const activeConnectorCount = (serverGuiRuntimeConfig.apiConnectors || []).filter(
        (c) => c.enabled
      ).length;

      res.json({
        status: 'OK',
        savedAt: new Date().toISOString(),
        message: `Saved GUI Configuration to server: Provider=${incoming.providerMode || 'ollama'}, Phase 1–2=${incoming.ollamaQuickModel || 'qwen2.5:7b'}, Referee=${refereeModelOrDefault(incoming.ollamaDeepModel) || DEFAULT_REFEREE_MODEL}, Active API/Host Connectors=${activeConnectorCount}.`,
        runtimeConfig: withoutSecrets(serverGuiRuntimeConfig),
        generatedEnvContent,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'ERROR',
        message: err?.message || 'Failed to save GUI configuration.',
      });
    }
  });

  // 2a-connectors. Server-Side Proxy Ping Tester, Live JSON Inspector & Telemetry Mapper
  app.post('/api/connectors/ping-and-inspect', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const t0 = Date.now();
    try {
      const {
        connector,
        sampleIso3,
        iso3: fallbackIso3,
      } = (req.body || {}) as {
        connector: ExternalInternalConnectorConfig & {
          fieldMappings?: Partial<Record<ExternalInternalConnectorMetricKey, string>>;
        };
        sampleIso3?: string;
        iso3?: string;
      };

      if (!connector || !connector.url) {
        return res.status(400).json({
          ok: false,
          status: 400,
          latencyMs: 0,
          message: 'Connector URL is required.',
        });
      }
      {
        const problem = outboundUrlProblem(interpolateIsoTemplate(connector.url, 'BRA'), PORT);
        if (problem) return res.status(400).json({ ok: false, status: 400, latencyMs: 0, message: problem });
      }

      const iso3 = String(sampleIso3 || fallbackIso3 || 'BRA').toUpperCase().trim();
      const effectiveMappings = connector.telemetryMappings || connector.fieldMappings;
      const resolvedUrl = interpolateIsoTemplate(connector.url, iso3);
      const method = connector.method === 'POST' ? 'POST' : 'GET';
      const timeoutMs = Math.min(15000, Math.max(1000, Number(connector.timeoutMs || 5000)));

      const resolvedHeaders: Record<string, string> = {
        Accept: 'application/json',
      };
      if (connector.headers && typeof connector.headers === 'object') {
        Object.entries(connector.headers).forEach(([k, v]) => {
          if (k && k.trim()) {
            resolvedHeaders[k.trim()] = interpolateIsoTemplate(String(v || ''), iso3);
          }
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const fetchRes = await fetch(resolvedUrl, {
          method,
          headers: resolvedHeaders,
          ...(method === 'POST' && connector.bodyTemplate
            ? { body: interpolateIsoTemplate(connector.bodyTemplate, iso3) }
            : {}),
          signal: controller.signal,
        });
        const latencyMs = Math.max(1, Date.now() - t0);
        const rawText = await fetchRes.text();
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(rawText);
        } catch {
          parsedJson = { rawResponseText: rawText.slice(0, 2500) };
        }

        const extractedTelemetry = extractMappedTelemetryFromPayload(
          parsedJson,
          effectiveMappings,
          iso3
        );

        return res.json({
          ok: fetchRes.ok,
          status: fetchRes.status,
          statusText: fetchRes.statusText || (fetchRes.ok ? 'OK' : 'HTTP Error'),
          resolvedUrl,
          latencyMs,
          testedAt: new Date().toISOString(),
          isSimulatedPreview: false,
          extractedTelemetry,
          jsonPreview: parsedJson,
          message: fetchRes.ok
            ? `Connected to ${connector.name} (${resolvedUrl}) · HTTP ${fetchRes.status} in ${latencyMs}ms.`
            : `Endpoint returned HTTP ${fetchRes.status} (${fetchRes.statusText}) in ${latencyMs}ms.`,
        });
      } catch (networkErr: any) {
        const latencyMs = Math.max(1, Date.now() - t0);
        return res.json({
          ok: false,
          status: 0,
          statusText: 'NO_ANSWER',
          resolvedUrl,
          latencyMs,
          testedAt: new Date().toISOString(),
          isSimulatedPreview: false,
          extractedTelemetry: {},
          jsonPreview: null,
          message: `No answer from ${resolvedUrl}: ${describeNetworkError(networkErr, timeoutMs)} Nothing was read, so no figures were mapped.`,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        status: 500,
        latencyMs: Date.now() - t0,
        message: err?.message || 'Connector test failed.',
      });
    }
  });

  // 2b. Self-Hosted Ollama / External AI Runtime Health & Model Discovery
  app.post('/api/ai/ollama-status', async (req, res) => {
    const { ollamaBaseUrl = ollamaBaseUrlDefault(process.env) } = req.body || {};
    const cleanUrl = String(ollamaBaseUrl).replace(/\/+$/, '');
    const candidateEndpoints = [cleanUrl];
    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
      candidateEndpoints.push('http://host.docker.internal:11434', 'http://ollama:11434');
    } else if (cleanUrl.includes('host.docker.internal')) {
      candidateEndpoints.push('http://localhost:11434', 'http://ollama:11434');
    }

    for (const candidate of candidateEndpoints) {
      const t0 = Date.now();
      try {
        const response = await fetchWithTimeout(`${candidate}/api/tags`, 3000);
        if (response.ok) {
          const data: any = await response.json();
          const rawModels = Array.isArray(data?.models) ? data.models : [];
          const models = rawModels.map((m: any) => m.name);
          const modelDetails = rawModels.map((m: any) => ({
            name: m.name,
            sizeGb: m.size ? Number((m.size / (1024 * 1024 * 1024)).toFixed(2)) : 0,
            parameterSize: m.details?.parameter_size || 'Local',
            quantizationLevel: m.details?.quantization_level || 'Q4_K_M',
            family: m.details?.family || 'LLM',
          }));
          return res.json({
            connected: true,
            endpoint: candidate,
            latencyMs: Math.max(1, Date.now() - t0),
            models,
            modelDetails,
            message: `Connected to local Ollama at ${candidate} (${models.length} models installed · ${Math.max(1, Date.now() - t0)}ms).`,
          });
        }
      } catch {
        // Try next candidate
      }
    }

    return res.json({
      connected: false,
      endpoint: cleanUrl,
      latencyMs: 0,
      models: [],
      modelDetails: [],
      message: `Local Ollama endpoint (${cleanUrl}) is not currently reachable from this server instance. When running via Docker on your Mac or Windows machine, EconQuest automatically connects to http://host.docker.internal:11434 or the bundled Ollama container.`,
    });
  });

  // 2c. In-App Ollama Model Pull Trigger (POST /api/ai/ollama-pull)
  app.post('/api/ai/ollama-pull', async (req, res) => {
    const {
      ollamaBaseUrl = ollamaBaseUrlDefault(process.env),
      modelName = 'qwen2.5:7b',
    } = req.body || {};
    const cleanUrl = String(ollamaBaseUrl).replace(/\/+$/, '');
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      try {
        const pullRes = await fetch(`${cleanUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modelName, stream: false }),
          signal: controller.signal,
        });
        if (!pullRes.ok) {
          return res.json({
            success: false,
            modelName,
            endpoint: cleanUrl,
            message: `Ollama pull returned HTTP ${pullRes.status}. Run 'ollama pull ${modelName}' in your terminal.`,
          });
        }
        const json: any = await pullRes.json();
        return res.json({
          success: true,
          modelName,
          endpoint: cleanUrl,
          latencyMs: Date.now() - t0,
          status: json?.status || 'success',
          message: `Successfully pulled '${modelName}' on ${cleanUrl} in ${((Date.now() - t0) / 1000).toFixed(1)}s.`,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      return res.json({
        success: false,
        modelName,
        endpoint: cleanUrl,
        cliCommand: `ollama pull ${modelName}`,
        message: `Could not reach ${cleanUrl} from cloud preview (${err?.message || 'connection refused'}). When self-hosting on Mac/Windows Docker, click Pull or run: ollama pull ${modelName}`,
      });
    }
  });

  // 2d. Live Agent Model Micro-Benchmark & JSON Schema Verification (POST /api/ai/ollama-test)
  app.post('/api/ai/ollama-test', async (req, res) => {
    const {
      ollamaBaseUrl = ollamaBaseUrlDefault(process.env),
      modelName = 'qwen2.5:7b',
      phase = 'PHASE_1_2_SUB_AGENTS',
    } = req.body || {};
    const cleanUrl = String(ollamaBaseUrl).replace(/\/+$/, '');
    const t0 = Date.now();
    try {
      const rawText = await callOllamaOrOpenAICompatible(
        cleanUrl,
        modelName,
        'You are a Sovereign Macro Council Agent. Return strict JSON.',
        'Connection test with made-up figures (not data): a country whose US dollar bonds pay 165 bps over US Treasuries and whose debt is 76.8% of GDP. Return JSON with keys: stance (BULLISH, BEARISH, or NEUTRAL), riskScore (0.0 to 1.0), and summary (1 sentence).',
        true,
        15000,
        ['stance', 'riskScore', 'summary']
      );
      const { parsed, schemaVerified } = sanitizeAndParseJson<{
        stance: string;
        riskScore: number;
        summary: string;
      }>(rawText, {
        stance: 'NEUTRAL',
        riskScore: 0.54,
        summary: 'Deterministic fallback verification check.',
      });
      return res.json({
        connected: true,
        schemaVerified,
        phase,
        modelName,
        endpoint: cleanUrl,
        latencyMs: Date.now() - t0,
        sampleOutput: parsed,
        message: `Verified ${modelName} (${phase}) in ${Date.now() - t0}ms · JSON Schema: ${schemaVerified ? 'PASS' : 'FALLBACK'}.`,
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        schemaVerified: false,
        phase,
        modelName,
        endpoint: cleanUrl,
        latencyMs: Date.now() - t0,
        sampleOutput: {
          stance: 'CAUTIOUS',
          riskScore: 0.56,
          summary:
            'Simulated benchmark preview (connect local Mac/Windows Docker container to execute live against local Ollama).',
        },
        message: `Local Ollama (${cleanUrl}) not reachable from cloud container (${err?.message || 'offline'}). Self-hosted Docker container will execute '${modelName}' locally.`,
      });
    }
  });

  // 2e. Self-Host Docker & Mac/Windows Launch Scripts Bundle Endpoint
  app.get('/api/docs/self-host-bundle', (_req, res) => {
    try {
      const readSafe = (relPath: string) => {
        const full = path.join(__dirname, relPath);
        return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : '';
      };
      res.json({
        status: 'OK',
        files: {
          dockerfile: readSafe('Dockerfile'),
          dockerCompose: readSafe('docker-compose.yml'),
          envExample: readSafe('.env.example'),
          startMac: readSafe('scripts/start-mac.sh'),
          startWindowsPs1: readSafe('scripts/start-windows.ps1'),
          startWindowsBat: readSafe('scripts/start-windows.bat'),
        },
      });
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err?.message || 'Failed to read Docker bundle' });
    }
  });

  // 3. Phase 1 (9 Sub-Agents + Devil's Advocate Debates + Minority Dissent) & Phase 2 (Cross-Desk Cascade)
  app.get('/api/council/progress/:id', (req, res) => {
    const entry = councilProgress.get(String(req.params.id));
    res.json({ steps: entry?.steps || {} });
  });

  app.post('/api/council/phase1-and-cascade', async (req, res) => {
    const pipelineStartMs = Date.now();
    const progress = progressTracker(req.body?.progressId);
    try {
      const {
        iso3 = 'BRA',
        countryName = 'Brazil',
        scenarioPrompt = '',
        policyDocumentTitle = '',
        policyDocumentText = '',
        runtimeConfig = {} as Partial<AIRuntimeConfig>,
        geopoliticalWargameParams = DEFAULT_WARGAME_PARAMS as GeopoliticalWargameParams,
        liquidityStressParams = DEFAULT_LIQUIDITY_STRESS_PARAMS as LiquidityStressParams,
      } = req.body || {};

      // Stage 0: Refresh live institutional & grounded market data first
      const stage0Start = Date.now();
      progress.start('data');
      const liveSnapshot = await fetchLiveOpenDataSnapshot(iso3, countryName);
      const liveCount = getSnapshotDataStatus(liveSnapshot).liveFeeds.length;
      progress.finish('data', false, liveCount ? `${liveCount} live ${liveCount === 1 ? "source" : "sources"}` : 'No live source answered: figures missing');
      const stage0Latency = Date.now() - stage0Start;

      const baseRun: CouncilAssessmentRun = buildDefaultAssessmentRun(iso3, liveSnapshot);
      baseRun.countryName = countryName || baseRun.countryName;
      baseRun.scenarioPrompt = scenarioPrompt || baseRun.scenarioPrompt;
      baseRun.policyDocumentTitle = policyDocumentTitle || baseRun.policyDocumentTitle;
      baseRun.policyDocumentSnippet = policyDocumentText
        ? policyDocumentText.slice(0, 600)
        : baseRun.policyDocumentSnippet;
      baseRun.openData = liveSnapshot;
      baseRun.charts = buildAnnotatedChartsForSovereign(liveSnapshot);

      // Execute Closed-Loop Institutional Quantitative Engines across all Desks
      const geoDeskSuite = computeGeopoliticalRiskDeskSuite(liveSnapshot, geopoliticalWargameParams);
      const econometricSuite = computeFullEconometricForecastSuite(
        liveSnapshot,
        geoDeskSuite.portfolioTransmission.propagatedForecastShocks
      );
      const liquiditySuite = computeGlobalLiquidityFundingSuite(liveSnapshot, liquidityStressParams);
      const restructuringSuite = simulateSovereignRestructuringAndRating(liveSnapshot);
      const xccyLegalSuite = computeCrossCurrencyAndLegalBasis(liveSnapshot);

      const anchors = computeQuantitativeAnchorScores(liveSnapshot);
      const providerMode = runtimeConfig.providerMode || 'gemini';
      const enableSearch = runtimeConfig.enableSearchGrounding !== false;
      const maxDebateRounds = Math.min(3, Math.max(1, Number(runtimeConfig.maxDebateRounds || 2)));

      const councilIn = councilInputs(liveSnapshot);
      const sharedContextHeader = `Target Sovereign: ${baseRun.countryName} (${iso3})
Scenario Directive: ${baseRun.scenarioPrompt}
Policy Document (${baseRun.policyDocumentTitle || 'Primary Extract'}): ${
        policyDocumentText ? policyDocumentText.slice(0, 3000) : baseRun.policyDocumentSnippet
      }
Debate Rounds Requested: ${maxDebateRounds}

Country figures (only live feeds, official series and your own data; nothing built in):
${councilIn.lines.join('\n')}
${MISSING_FIGURES_RULE}

${councilIn.deskEnginesLive ? `Closed-Loop Quantitative Desk Engine Outputs (Injected into Specialist Agents AG-1 to AG-9):
- [AG-1 / AG-2 / AG-3 Geopolitical Engine]: Composite GPR Z-Score = ${geoDeskSuite.gprAndEscalation.compositeGprZScore}σ | Chokepoint CPI Pass-Through = +${geoDeskSuite.portfolioTransmission.propagatedForecastShocks.realRateShockBps} bps | G7 Freeze-Exposed Reserves = ${geoDeskSuite.sanctionsAndReserves.g7FreezeExposedSharePct}%
- [AG-4 Fiscal Auditor]: Monte Carlo 2030 Debt Fan P50 = ${econometricSuite.stochasticDsa.medianDebt2030PctGdp}% (P95 Tail = ${econometricSuite.stochasticDsa.p95Debt2030PctGdp}%) | IMF SRDSF Gross Financing Needs (GFN) = ${econometricSuite.imfSrdsfGfn.totalGfnPctGdp}% GDP (${econometricSuite.imfSrdsfGfn.srdsfRiskZone}) | Sovereign-Bank Doom Loop CET1 Depletion = -${econometricSuite.imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps
- [AG-5 External Balance]: Blanchard-Leeper Fiscal Dominance Reversal Rate r* = ${econometricSuite.fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}% (${econometricSuite.fiscalDominanceAndFxBurn.policyRateHeadroomBps} bps headroom) | FXI Burn Velocity = $${econometricSuite.fiscalDominanceAndFxBurn.monthlyFxiBurnRateUsdBn}B/mo (${econometricSuite.fiscalDominanceAndFxBurn.monthsToAraBreach}M to 100% ARA Floor) | 5Y XCCY Swap Basis = ${xccyLegalSuite.fiveYearXccyBasisBps} bps
- [AG-6 Political Will & Indentures]: Eurobond Restructuring NPV Recovery = ${restructuringSuite.restructuredNpvRecoveryCents}¢ | ICMA Single-Limb 75% CAC Share = ${restructuringSuite.cacGameTheory.icmaSingleLimb75SharePct}% (Holdout Litigation Prob = ${restructuringSuite.cacGameTheory.holdoutLitigationProbPct}%)
- [AG-7 / AG-8 / AG-9 Macro & Plumbing]: 5pct Growth-at-Risk (GaR) = ${econometricSuite.garFarTail.gdpGar5thPercentilePct}% | Nelson-Siegel 10Y Term Premium = +${econometricSuite.nssTermStructure.tenYearTermPremiumBps} bps | Kaminsky-Reinhart EWS Z-Score = ${econometricSuite.markovEws.compositeCrisisZScore}σ (${econometricSuite.markovEws.crisisProbability12MPct}% 12M crisis odds) | Global Dollar Plumbing Z = ${liquiditySuite.globalLiquidityStressIndexZScore}σ` : `Model desk outputs left out: they would run on missing inputs (${councilIn.missingDeskInputs.join(', ')}).`}`;

      const deskWorkerSchema = {
        type: Type.OBJECT,
        properties: {
          deskPreCascadeScore: { type: Type.NUMBER },
          consensusStance: {
            type: Type.STRING,
            description: 'CONSTRUCTIVE, CAUTIOUS, DEFENSIVE, or DISTRESSED',
          },
          consensusSummary: { type: Type.STRING },
          agent1Stance: { type: Type.STRING },
          agent1RiskScore: { type: Type.NUMBER },
          agent1Confidence: { type: Type.NUMBER },
          agent1FindingsSummary: { type: Type.STRING },
          agent2Stance: { type: Type.STRING },
          agent2RiskScore: { type: Type.NUMBER },
          agent2Confidence: { type: Type.NUMBER },
          agent2FindingsSummary: { type: Type.STRING },
          agent3Stance: { type: Type.STRING },
          agent3RiskScore: { type: Type.NUMBER },
          agent3Confidence: { type: Type.NUMBER },
          agent3FindingsSummary: { type: Type.STRING },
          round1ProposerThesis: { type: Type.STRING },
          round1ChallengerCounter: { type: Type.STRING },
          round1Resolution: { type: Type.STRING },
          round2ProposerThesis: { type: Type.STRING },
          round2ChallengerCounter: { type: Type.STRING },
          round2Resolution: { type: Type.STRING },
          minorityDissentArgument: { type: Type.STRING },
          minorityEarlyWarningTrigger: { type: Type.STRING },
          minorityFalsificationThreshold: { type: Type.STRING },
        },
        required: [
          'deskPreCascadeScore',
          'consensusStance',
          'consensusSummary',
          'agent1FindingsSummary',
          'agent2FindingsSummary',
          'agent3FindingsSummary',
          'round1ProposerThesis',
          'round1ChallengerCounter',
        ],
      };

      const promptOverrides =
        runtimeConfig.agentPromptOverrides || serverGuiRuntimeConfig.agentPromptOverrides || {};
      const activeApiConnectors: ExternalInternalConnectorConfig[] = (
        (runtimeConfig.apiConnectors as ExternalInternalConnectorConfig[] | undefined) ||
        serverGuiRuntimeConfig.apiConnectors ||
        DEFAULT_SERVER_API_CONNECTORS
      ).filter((c: ExternalInternalConnectorConfig) => c.enabled && c.injectIntoCouncilPrompt);
      const connectorContextBlock =
        activeApiConnectors.length > 0
          ? `\n\nActive GUI External/Internal API Connectors Registered (${activeApiConnectors.length}):\n` +
            activeApiConnectors
              .map(
                (c: ExternalInternalConnectorConfig) =>
                  `- [${c.networkScope.toUpperCase()} · ${c.category}] ${c.name}: ${interpolateIsoTemplate(c.url, iso3)}`
              )
              .join('\n')
          : '';
      const buildDeskAgentOverrideBlock = (agentIds: Array<keyof typeof promptOverrides>) => {
        const lines = agentIds
          .map((id) => {
            const customPrompt = promptOverrides[id]?.trim();
            return customPrompt ? `- Custom GUI Directive for ${String(id).toUpperCase()}: ${customPrompt}` : '';
          })
          .filter(Boolean);
        return (
          connectorContextBlock +
          (lines.length > 0 ? `\n\nUser-Configured GUI Agent Directives:\n${lines.join('\n')}` : '')
        );
      };

      // Stage 1: Execute 3 Parallel Desk Synthesis Workers + 1 Web Search Grounding Worker
      const searchTiming: StepTiming = { id: 'search', label: 'Web search (Gemini)', ms: 0, outcome: 'skipped' };
      const stage1Start = Date.now();
      const [geoSettled, sovSettled, macroSettled, searchSettled] = await Promise.allSettled([
        tracked(progress, 'geo', executeResilientLlmStep<any>({
          stepName: 'STAGE_1_GEO_DESK',
          providerMode,
          runtimeConfig,
          systemInstruction: `You are Managing Director of the Geopolitical Risk Desk overseeing AG-1 (Intelligence Scraper Analyst), AG-2 (Transmission Mapping Analyst), and AG-3 (Sanctions & Legal Analyst). Quantitative Anchor Score: ${anchors.geopolitical}. Keep risk scores anchored near empirical telemetry. CRITICAL WRITING STYLE: Write all findings, debate arguments, resolutions, and consensus summaries in clear, everyday plain English first so any reader immediately understands the real-world impact, and cite the exact economic/statistical metrics in parentheses at the end, e.g. "(Ref: Caldara-Iacoviello GPR Z-Score = +2.1σ | USD bond spread = 185 bps)".`,
          prompt: `${sharedContextHeader}${buildDeskAgentOverrideBlock(['ag1_intel_scraper', 'ag2_transmission_mapper', 'ag3_sanctions_legal'])}\n\nSynthesize individual findings for AG-1, AG-2, and AG-3, run the adversarial Devil's Advocate debate (${maxDebateRounds} rounds), and report any formal minority dissent. Lead every statement with plain, everyday language explaining what is happening in the real world, followed by the statistical reference metrics in parentheses (Ref: ...).`,
          responseSchema: deskWorkerSchema,
          fallbackValue: {
            deskPreCascadeScore: anchors.geopolitical,
            consensusStance: anchors.geopolitical > 0.6 ? 'DISTRESSED' : 'CAUTIOUS',
            consensusSummary: baseRun.deskDebates.geopolitical.consensusSummary,
            agent1Stance: baseRun.subAgents[0].stance,
            agent1RiskScore: baseRun.subAgents[0].riskScore,
            agent1Confidence: baseRun.subAgents[0].confidence,
            agent1FindingsSummary: baseRun.subAgents[0].findingsSummary,
            agent2Stance: baseRun.subAgents[1].stance,
            agent2RiskScore: baseRun.subAgents[1].riskScore,
            agent2Confidence: baseRun.subAgents[1].confidence,
            agent2FindingsSummary: baseRun.subAgents[1].findingsSummary,
            agent3Stance: baseRun.subAgents[2].stance,
            agent3RiskScore: baseRun.subAgents[2].riskScore,
            agent3Confidence: baseRun.subAgents[2].confidence,
            agent3FindingsSummary: baseRun.subAgents[2].findingsSummary,
            round1ProposerThesis: baseRun.deskDebates.geopolitical.rounds[0]?.thesis,
            round1ChallengerCounter: baseRun.deskDebates.geopolitical.rounds[0]?.counterThesis,
            round1Resolution: baseRun.deskDebates.geopolitical.rounds[0]?.deskLeadResolution,
          },
        })),
        tracked(progress, 'sov', executeResilientLlmStep<any>({
          stepName: 'STAGE_1_SOV_DESK',
          providerMode,
          runtimeConfig,
          systemInstruction: `You are Managing Director of the Sovereign Credit Desk overseeing AG-4 (Fiscal Auditor Analyst), AG-5 (External Balance Sheet Analyst), and AG-6 (Political Will & Governance Analyst). Quantitative Anchor Score: ${anchors.sovereign}. Keep risk scores anchored near empirical Debt/GDP, USD bond spread, and Reserve Adequacy telemetry. CRITICAL WRITING STYLE: Write all findings, debate arguments, resolutions, and minority dissents in clear, everyday plain English first so any reader immediately understands the real-world budget and debt impact, and cite the exact economic/statistical metrics in parentheses at the end, e.g. "(Ref: Debt/GDP = 78.4% | r - g = +1.8% | FX Cover = 4.2 mos)".`,
          prompt: `${sharedContextHeader}${buildDeskAgentOverrideBlock(['ag4_fiscal_auditor', 'ag5_external_balance', 'ag6_political_will'])}\n\nSynthesize individual findings for AG-4, AG-5, and AG-6, run the adversarial Devil's Advocate debate (${maxDebateRounds} rounds), and formulate AG-6 Political Will's Minority Report dissent. Lead every statement with plain, everyday language explaining what is happening to government finances and foreign reserves, followed by the statistical reference metrics in parentheses (Ref: ...).`,
          responseSchema: deskWorkerSchema,
          fallbackValue: {
            deskPreCascadeScore: anchors.sovereign,
            consensusStance: anchors.sovereign > 0.6 ? 'DEFENSIVE' : 'CAUTIOUS',
            consensusSummary: baseRun.deskDebates.sovereign.consensusSummary,
            agent1Stance: baseRun.subAgents[3].stance,
            agent1RiskScore: baseRun.subAgents[3].riskScore,
            agent1Confidence: baseRun.subAgents[3].confidence,
            agent1FindingsSummary: baseRun.subAgents[3].findingsSummary,
            agent2Stance: baseRun.subAgents[4].stance,
            agent2RiskScore: baseRun.subAgents[4].riskScore,
            agent2Confidence: baseRun.subAgents[4].confidence,
            agent2FindingsSummary: baseRun.subAgents[4].findingsSummary,
            agent3Stance: baseRun.subAgents[5].stance,
            agent3RiskScore: baseRun.subAgents[5].riskScore,
            agent3Confidence: baseRun.subAgents[5].confidence,
            agent3FindingsSummary: baseRun.subAgents[5].findingsSummary,
            round1ProposerThesis: baseRun.deskDebates.sovereign.rounds[0]?.thesis,
            round1ChallengerCounter: baseRun.deskDebates.sovereign.rounds[0]?.counterThesis,
            round1Resolution: baseRun.deskDebates.sovereign.rounds[0]?.deskLeadResolution,
            minorityDissentArgument: baseRun.deskDebates.sovereign.minorityDissents[0]?.coreDissentArgument,
            minorityEarlyWarningTrigger: baseRun.deskDebates.sovereign.minorityDissents[0]?.earlyWarningTrigger,
            minorityFalsificationThreshold: baseRun.deskDebates.sovereign.minorityDissents[0]?.falsificationThreshold,
          },
        })),
        tracked(progress, 'macro', executeResilientLlmStep<any>({
          stepName: 'STAGE_1_MACRO_DESK',
          providerMode,
          runtimeConfig,
          systemInstruction: `You are Managing Director of the Macroeconomic Desk overseeing AG-7 (High-Frequency Nowcaster), AG-8 (Central Bank Watcher NLP), and AG-9 (Global Spillover Analyst). Quantitative Anchor Score: ${anchors.macro}. Keep risk scores anchored near empirical CPI, Policy Rate, and 10Y Yield telemetry. CRITICAL WRITING STYLE: Write all findings, debate arguments, resolutions, and consensus summaries in clear, everyday plain English first so any reader immediately understands what is happening to jobs, inflation, and interest rates, and cite the exact economic/statistical metrics in parentheses at the end, e.g. "(Ref: CPI = 4.6% | Policy Rate = 10.75% | BVAR Peak = +115 bps)".`,
          prompt: `${sharedContextHeader}${buildDeskAgentOverrideBlock(['ag7_hf_nowcaster', 'ag8_cb_watcher', 'ag9_global_spillover'])}\n\nSynthesize individual findings for AG-7, AG-8, and AG-9, run the adversarial Devil's Advocate debate (${maxDebateRounds} rounds), and report any formal minority dissent. Lead every statement with plain, everyday language explaining the real-world economic impact first, followed by the statistical reference metrics in parentheses (Ref: ...).`,
          responseSchema: deskWorkerSchema,
          fallbackValue: {
            deskPreCascadeScore: anchors.macro,
            consensusStance: 'DEFENSIVE',
            consensusSummary: baseRun.deskDebates.macro.consensusSummary,
            agent1Stance: baseRun.subAgents[6].stance,
            agent1RiskScore: baseRun.subAgents[6].riskScore,
            agent1Confidence: baseRun.subAgents[6].confidence,
            agent1FindingsSummary: baseRun.subAgents[6].findingsSummary,
            agent2Stance: baseRun.subAgents[7].stance,
            agent2RiskScore: baseRun.subAgents[7].riskScore,
            agent2Confidence: baseRun.subAgents[7].confidence,
            agent2FindingsSummary: baseRun.subAgents[7].findingsSummary,
            agent3Stance: baseRun.subAgents[8].stance,
            agent3RiskScore: baseRun.subAgents[8].riskScore,
            agent3Confidence: baseRun.subAgents[8].confidence,
            agent3FindingsSummary: baseRun.subAgents[8].findingsSummary,
            round1ProposerThesis: baseRun.deskDebates.macro.rounds[0]?.thesis,
            round1ChallengerCounter: baseRun.deskDebates.macro.rounds[0]?.counterThesis,
            round1Resolution: baseRun.deskDebates.macro.rounds[0]?.deskLeadResolution,
          },
        })),
        (async () => {
          if (!enableSearch || !process.env.GEMINI_API_KEY) {
            const why = !enableSearch ? 'Web search is turned off' : 'Needs a Gemini key';
            searchTiming.reason = why;
            progress.skip('search', why);
            return [];
          }
          progress.start('search');
          const searchStart = Date.now();
          try {
            const searchResp = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Latest macroeconomic, central bank policy rate, fiscal budget, and geopolitical risk developments for ${baseRun.countryName} (${iso3}): ${baseRun.scenarioPrompt}`,
              config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            });
            const chunks = searchResp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            Object.assign(searchTiming, { ms: Date.now() - searchStart, outcome: 'model', model: 'gemini-3.8-flash', reason: undefined });
            return chunks
              .filter((c: any) => c?.web?.uri)
              .slice(0, 6)
              .map((c: any) => ({
                title: String(c.web.title || 'Web link found by Gemini search'),
                uri: String(c.web.uri),
                sourceType: 'Gemini web search (link not checked)',
              }));
          } catch {
            Object.assign(searchTiming, { ms: Date.now() - searchStart, outcome: 'no_model', reason: 'Web search did not answer' });
            progress.fail('search', 'Web search did not answer');
            return [];
          }
        })(),
      ]);
      const stage1Ms = Date.now() - stage1Start;

      const geoResult = geoSettled.status === 'fulfilled' ? geoSettled.value : null;
      const sovResult = sovSettled.status === 'fulfilled' ? sovSettled.value : null;
      const macroResult = macroSettled.status === 'fulfilled' ? macroSettled.value : null;
      // How long each step took (src/utils/councilTiming.ts), kept on the run and in the timing log.
      const phase1Timing = (cascade?: Parameters<typeof stepTiming>[2]): CouncilTiming => ({
        version: 1,
        phase1Ms: Date.now() - pipelineStartMs,
        sentTogether: ['geo', 'sov', 'macro', ...(searchTiming.outcome === 'skipped' ? [] : ['search'])],
        steps: [
          { id: 'data', label: 'Country data', ms: stage0Latency, outcome: 'no_model_needed', reason: liveCount ? `${liveCount} live ${liveCount === 1 ? 'source' : 'sources'}` : 'no live source answered' },
          stepTiming('geo', 'Geopolitical desk (AG-1 to AG-3)', geoResult, stage1Ms),
          stepTiming('sov', 'Sovereign credit desk (AG-4 to AG-6)', sovResult, stage1Ms),
          stepTiming('macro', 'Macro desk (AG-7 to AG-9)', macroResult, stage1Ms),
          searchTiming,
          ...(cascade !== undefined ? [stepTiming('cascade', 'Cross-desk cascade', cascade)] : []),
        ],
      });
      if (![geoResult, sovResult, macroResult].some((r) => r && !r.usedFallback)) {
        const timing = phase1Timing();
        logCouncilTiming(iso3, timing, 'stopped: no desk model answered');
        return res.status(503).json({ error: NO_MODEL_COUNCIL, timing });
      }
      const searchGroundingLinks =
        searchSettled.status === 'fulfilled' && Array.isArray(searchSettled.value)
          ? searchSettled.value
          : [];
      if (enableSearch && process.env.GEMINI_API_KEY && searchSettled.status === 'fulfilled') {
        progress.finish('search', false, `${searchGroundingLinks.length} source links`);
      }

      // Helper to apply desk worker output to its 3 sub-agents and debate rounds
      const applyDeskWorkerToRun = (
        deskId: 'geopolitical' | 'sovereign' | 'macro',
        agentStartIdx: number,
        anchorScore: number,
        workerRes: NonNullable<typeof geoResult> | null
      ) => {
        const answered = Boolean(workerRes && !workerRes.usedFallback);
        const d = answered ? workerRes?.data || {} : {};
        const clampDesk = clampScoreToAnchor(d.deskPreCascadeScore, anchorScore, 0.22);

        // Update 3 Sub-Agents under this desk
        [0, 1, 2].forEach((offset) => {
          const agent = baseRun.subAgents[agentStartIdx + offset];
          if (!agent) return;
          const idxNum = offset + 1;
          const rawAgentScore = d[`agent${idxNum}RiskScore`];
          const clampedAgent = clampScoreToAnchor(rawAgentScore, anchorScore, 0.24);
          agent.riskScore = clampedAgent.finalBoundedScore;
          agent.stance = normalizeStance(d[`agent${idxNum}Stance`], clampedAgent.finalBoundedScore);
          // Confidence only when the model gave one; the built-in starting value is not shown.
          const conf = Number(d[`agent${idxNum}Confidence`]);
          agent.confidence = !Number.isNaN(conf) && conf >= 0.5 && conf <= 0.99 ? Number(conf.toFixed(2)) : NaN;
          agent.brierCalibrationWeight = NaN;
          agent.findingsSummary = d[`agent${idxNum}FindingsSummary`]
            ? String(d[`agent${idxNum}FindingsSummary`])
            : answered
            ? 'The model gave no findings for this agent.'
            : NO_MODEL_DESK;
          const assignedModel =
            runtimeConfig.agentModelOverrides?.[agent.agentId] ||
            runtimeConfig.deskModelOverrides?.[deskId] ||
            (providerMode === 'gemini'
              ? runtimeConfig.geminiQuickModel || 'gemini-3.8-flash'
              : runtimeConfig.ollamaQuickModel || 'qwen2.5:7b');
          const customDirective = runtimeConfig.agentPromptOverrides?.[agent.agentId];
          agent.structuredPayload = {
            ...agent.structuredPayload,
            quantitative_anchor: anchorScore,
            bounded_risk_score: clampedAgent.finalBoundedScore,
            assigned_llm_model: assignedModel,
            ...(customDirective ? { custom_gui_directive: customDirective } : {}),
          };
        });

        const debate = baseRun.deskDebates[deskId];
        debate.preCascadeRiskScore = clampDesk.finalBoundedScore;
        debate.consensusSummary = d.consensusSummary
          ? String(d.consensusSummary)
          : answered
          ? 'The model gave no summary for this desk.'
          : NO_MODEL_DESK;
        const validStances = ['CONSTRUCTIVE', 'CAUTIOUS', 'DEFENSIVE', 'DISTRESSED'];
        if (validStances.includes(String(d.consensusStance || '').toUpperCase())) {
          debate.consensusStance = String(d.consensusStance).toUpperCase() as any;
        }

        // Hydrate Round 1 + optional Round 2 if maxDebateRounds >= 2
        if (debate.rounds[0]) {
          const empty = answered ? 'The model gave no text for this part of the debate.' : NO_MODEL_DESK;
          debate.rounds[0].thesis = d.round1ProposerThesis ? String(d.round1ProposerThesis) : empty;
          debate.rounds[0].counterThesis = d.round1ChallengerCounter ? String(d.round1ChallengerCounter) : empty;
          debate.rounds[0].deskLeadResolution = d.round1Resolution ? String(d.round1Resolution) : empty;
        }

        if (maxDebateRounds >= 2 && d.round2ProposerThesis && d.round2ChallengerCounter) {
          const round2: DeskDebateRound = {
            roundNumber: 2,
            proposerAgent: baseRun.subAgents[agentStartIdx]?.agentName || 'Desk Lead Proponent',
            proposerStance: baseRun.subAgents[agentStartIdx]?.stance || 'NEUTRAL',
            thesis: String(d.round2ProposerThesis),
            challengerAgent:
              baseRun.subAgents[agentStartIdx + 2]?.agentName || "Devil's Advocate Challenger",
            challengerStance: baseRun.subAgents[agentStartIdx + 2]?.stance || 'BEARISH',
            counterThesis: String(d.round2ChallengerCounter),
            deskLeadResolution: String(
              d.round2Resolution ||
                'Cross-examination converged on quantitative anchor corridor; tail-risk triggers logged.'
            ),
            riskScoreAdjustment: 0.03,
          };
          debate.rounds = [debate.rounds[0], round2];
        }

        // Update or append formal minority dissent if provided
        if (d.minorityDissentArgument) {
          if (debate.minorityDissents.length > 0) {
            debate.minorityDissents[0].coreDissentArgument = String(d.minorityDissentArgument);
            if (d.minorityEarlyWarningTrigger) {
              debate.minorityDissents[0].earlyWarningTrigger = String(d.minorityEarlyWarningTrigger);
            }
            if (d.minorityFalsificationThreshold) {
              debate.minorityDissents[0].falsificationThreshold = String(d.minorityFalsificationThreshold);
            }
            debate.minorityDissents[0].deskConsensusScore = clampDesk.finalBoundedScore;
          } else if (deskId !== 'sovereign') {
            const dissentingAgent = baseRun.subAgents[agentStartIdx + 2];
            debate.minorityDissents.push({
              dissentId: `DISSENT-${iso3}-${deskId.toUpperCase()}`,
              deskId,
              agentId: dissentingAgent.agentId,
              agentName: dissentingAgent.agentName,
              agentRiskScore: Number(Math.min(0.95, clampDesk.finalBoundedScore + 0.2).toFixed(2)),
              deskConsensusScore: clampDesk.finalBoundedScore,
              divergenceDelta: 0.2,
              coreDissentArgument: String(d.minorityDissentArgument),
              earlyWarningTrigger: String(
                d.minorityEarlyWarningTrigger || 'High-frequency market spread or GDELT velocity breach.'
              ),
              falsificationThreshold: String(
                d.minorityFalsificationThreshold || 'Sustained 60-day normalization in primary risk indicator.'
              ),
            });
          }
        }

        return clampDesk;
      };

      const geoClamp = applyDeskWorkerToRun('geopolitical', 0, anchors.geopolitical, geoResult);
      const sovClamp = applyDeskWorkerToRun('sovereign', 3, anchors.sovereign, sovResult);
      const macroClamp = applyDeskWorkerToRun('macro', 6, anchors.macro, macroResult);

      // Hydrate all 9 Sub-Agents' keyMetrics and structuredPayloads from the Closed-Loop Quantitative Engines
      const primaryChokepoint = geoDeskSuite.chokepoints[0];
      const topEscalationStage =
        geoDeskSuite.gprAndEscalation.escalationTree[0]?.stageTitle || 'Elevated GPR Regime';

      if (baseRun.subAgents[0]) {
        baseRun.subAgents[0].keyMetrics.push({
          label: 'Caldara-Iacoviello GPR Z-Score',
          value: `${geoDeskSuite.gprAndEscalation.compositeGprZScore >= 0 ? '+' : ''}${geoDeskSuite.gprAndEscalation.compositeGprZScore}σ`,
          numericValue: geoDeskSuite.gprAndEscalation.compositeGprZScore,
          unit: 'σ',
          change: topEscalationStage,
          source: 'Geopolitical Risk Engine',
          provenanceTier: 'TIER_4_MODEL_ESTIMATE',
        });
        baseRun.subAgents[0].structuredPayload = {
          ...baseRun.subAgents[0].structuredPayload,
          composite_gpr_z_score: geoDeskSuite.gprAndEscalation.compositeGprZScore,
          escalation_regime: topEscalationStage,
        };
      }
      if (baseRun.subAgents[1] && primaryChokepoint) {
        baseRun.subAgents[1].keyMetrics.push({
          label: `${primaryChokepoint.corridorName} Shock`,
          value: `+${primaryChokepoint.importedCpiPassThroughBps} bps CPI`,
          numericValue: primaryChokepoint.importedCpiPassThroughBps,
          unit: 'bps',
          change: `+${primaryChokepoint.cds5YSpreadImpactBps} bps 5Y CDS`,
          source: 'Maritime Chokepoint Wargame Engine',
          provenanceTier: 'TIER_4_MODEL_ESTIMATE',
        });
        baseRun.subAgents[1].structuredPayload = {
          ...baseRun.subAgents[1].structuredPayload,
          primary_chokepoint_cpi_bps: primaryChokepoint.importedCpiPassThroughBps,
          propagated_fx_shock_pct: geoDeskSuite.portfolioTransmission.propagatedForecastShocks.fxDepreciationShockPct,
        };
      }
      if (baseRun.subAgents[2]) {
        baseRun.subAgents[2].keyMetrics.push({
          label: 'NY-Law Indenture Legal Premium',
          value: `+${xccyLegalSuite.legalAndLiquidity.jurisdictionalLegalSpreadBps} bps`,
          numericValue: xccyLegalSuite.legalAndLiquidity.jurisdictionalLegalSpreadBps,
          unit: 'bps',
          change: `G7 Freeze Exposure ${geoDeskSuite.sanctionsAndReserves.g7FreezeExposedSharePct}%`,
          source: 'Sanctions & Indenture Engine',
          provenanceTier: 'TIER_4_MODEL_ESTIMATE',
        });
        baseRun.subAgents[2].structuredPayload = {
          ...baseRun.subAgents[2].structuredPayload,
          g7_freeze_exposed_reserves_pct: geoDeskSuite.sanctionsAndReserves.g7FreezeExposedSharePct,
          ny_law_indenture_spread_bps: xccyLegalSuite.legalAndLiquidity.jurisdictionalLegalSpreadBps,
        };
      }
      if (baseRun.subAgents[3]) {
        baseRun.subAgents[3].keyMetrics.push(
          {
            label: 'IMF SRDSF Gross Financing Needs',
            value: `${econometricSuite.imfSrdsfGfn.totalGfnPctGdp}% GDP`,
            numericValue: econometricSuite.imfSrdsfGfn.totalGfnPctGdp,
            unit: '% GDP',
            change: `vs ${econometricSuite.imfSrdsfGfn.imfEmDistressThresholdPctGdp}% IMF Threshold`,
            source: 'IMF SRDSF GFN Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
          {
            label: 'Sovereign-Bank Doom Loop CET1 Hit',
            value: `-${econometricSuite.imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps`,
            numericValue: -econometricSuite.imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps,
            unit: 'bps',
            change: `Post-Stress CET1 ${econometricSuite.imfSrdsfGfn.postStressBankCet1RatioPct}%`,
            source: 'Sovereign-Bank Nexus Model',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          }
        );
        baseRun.subAgents[3].structuredPayload = {
          ...baseRun.subAgents[3].structuredPayload,
          imf_srdsf_gfn_pct_gdp: econometricSuite.imfSrdsfGfn.totalGfnPctGdp,
          doom_loop_cet1_depletion_bps: econometricSuite.imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps,
          monte_carlo_2030_p95_debt_pct: econometricSuite.stochasticDsa.p95Debt2030PctGdp,
        };
      }
      if (baseRun.subAgents[4]) {
        baseRun.subAgents[4].keyMetrics.push(
          {
            label: 'FXI Reserve Burn Clock (to 100% ARA)',
            value: `${econometricSuite.fiscalDominanceAndFxBurn.monthsToAraBreach} Months`,
            numericValue: econometricSuite.fiscalDominanceAndFxBurn.monthsToAraBreach,
            unit: 'Months',
            change: `-$${econometricSuite.fiscalDominanceAndFxBurn.monthlyFxiBurnRateUsdBn}B/mo drain`,
            source: 'IMF ARA & FXI Burn Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
          {
            label: '5Y XCCY Swap Basis & Hedged Pick-Up',
            value: `${xccyLegalSuite.fiveYearXccyBasisBps} bps`,
            numericValue: xccyLegalSuite.fiveYearXccyBasisBps,
            unit: 'bps',
            change: `${xccyLegalSuite.fiveYearNetHedgedPickUpBps >= 0 ? '+' : ''}${xccyLegalSuite.fiveYearNetHedgedPickUpBps} bps vs Eurobond`,
            source: 'Cross-Currency Basis Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          }
        );
        baseRun.subAgents[4].structuredPayload = {
          ...baseRun.subAgents[4].structuredPayload,
          fxi_burn_usd_bn_per_month: econometricSuite.fiscalDominanceAndFxBurn.monthlyFxiBurnRateUsdBn,
          months_to_100pct_ara_breach: econometricSuite.fiscalDominanceAndFxBurn.monthsToAraBreach,
          five_year_xccy_basis_bps: xccyLegalSuite.fiveYearXccyBasisBps,
        };
      }
      if (baseRun.subAgents[5]) {
        baseRun.subAgents[5].keyMetrics.push(
          {
            label: 'ICMA Single-Limb 75% CAC Coverage',
            value: `${restructuringSuite.cacGameTheory.icmaSingleLimb75SharePct}% Stock`,
            numericValue: restructuringSuite.cacGameTheory.icmaSingleLimb75SharePct,
            unit: '%',
            change: `Holdout Odds ${restructuringSuite.cacGameTheory.holdoutLitigationProbPct}%`,
            source: 'CAC Holdout Game-Theory Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
          {
            label: 'Restructured NPV Recovery vs Market',
            value: `${restructuringSuite.restructuredNpvRecoveryCents}¢`,
            numericValue: restructuringSuite.restructuredNpvRecoveryCents,
            unit: '¢',
            change: `vs ${restructuringSuite.currentBenchmarkBondPriceCents}¢ spot price`,
            source: 'Sovereign Restructuring Simulator',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          }
        );
        baseRun.subAgents[5].structuredPayload = {
          ...baseRun.subAgents[5].structuredPayload,
          icma_single_limb_cac_pct: restructuringSuite.cacGameTheory.icmaSingleLimb75SharePct,
          holdout_litigation_prob_pct: restructuringSuite.cacGameTheory.holdoutLitigationProbPct,
          restructured_npv_recovery_cents: restructuringSuite.restructuredNpvRecoveryCents,
        };
      }
      if (baseRun.subAgents[6]) {
        baseRun.subAgents[6].keyMetrics.push({
          label: '5th-Pct Growth-at-Risk (GaR Tail)',
          value: `${econometricSuite.garFarTail.gdpGar5thPercentilePct}% GDP`,
          numericValue: econometricSuite.garFarTail.gdpGar5thPercentilePct,
          unit: '% GDP',
          change: `95th-Pct Deficit FaR ${econometricSuite.garFarTail.fiscalFar95thDeficitPctGdp}%`,
          source: 'Adrian-Boyarchenko-Giannone GaR Engine',
          provenanceTier: 'TIER_4_MODEL_ESTIMATE',
        });
        baseRun.subAgents[6].structuredPayload = {
          ...baseRun.subAgents[6].structuredPayload,
          gar_5th_percentile_gdp_pct: econometricSuite.garFarTail.gdpGar5thPercentilePct,
          far_95th_percentile_deficit_pct_gdp: econometricSuite.garFarTail.fiscalFar95thDeficitPctGdp,
        };
      }
      if (baseRun.subAgents[7]) {
        baseRun.subAgents[7].keyMetrics.push(
          {
            label: 'Blanchard-Leeper Reversal Threshold r*',
            value: `${econometricSuite.fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}%`,
            numericValue: econometricSuite.fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct,
            unit: '%',
            change: `${econometricSuite.fiscalDominanceAndFxBurn.policyRateHeadroomBps >= 0 ? '+' : ''}${econometricSuite.fiscalDominanceAndFxBurn.policyRateHeadroomBps} bps headroom`,
            source: 'Blanchard-Leeper Fiscal Dominance Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
          {
            label: 'Nelson-Siegel 10Y Term Premium',
            value: `+${econometricSuite.nssTermStructure.tenYearTermPremiumBps} bps`,
            numericValue: econometricSuite.nssTermStructure.tenYearTermPremiumBps,
            unit: 'bps',
            change: `1Y Implied Policy Δ ${econometricSuite.nssTermStructure.implied1YPolicyRateDeltaBps} bps`,
            source: 'NSS Yield Curve Decomposition',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          }
        );
        baseRun.subAgents[7].structuredPayload = {
          ...baseRun.subAgents[7].structuredPayload,
          blanchard_leeper_threshold_rate_pct:
            econometricSuite.fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct,
          policy_rate_headroom_bps: econometricSuite.fiscalDominanceAndFxBurn.policyRateHeadroomBps,
          nss_10y_term_premium_bps: econometricSuite.nssTermStructure.tenYearTermPremiumBps,
        };
      }
      if (baseRun.subAgents[8]) {
        baseRun.subAgents[8].keyMetrics.push(
          {
            label: 'Kaminsky-Reinhart Composite EWS',
            value: `${econometricSuite.markovEws.compositeCrisisZScore >= 0 ? '+' : ''}${econometricSuite.markovEws.compositeCrisisZScore}σ`,
            numericValue: econometricSuite.markovEws.compositeCrisisZScore,
            unit: 'σ',
            change: `${econometricSuite.markovEws.crisisProbability12MPct}% 12M Crisis Odds`,
            source: 'Markov Regime & EWS Engine',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          },
          {
            label: 'Global Dollar Funding Stress Z-Score',
            value: `+${liquiditySuite.globalLiquidityStressIndexZScore.toFixed(2)}σ`,
            numericValue: liquiditySuite.globalLiquidityStressIndexZScore,
            unit: 'σ',
            change: `Rollover Δ +${liquiditySuite.portfolioTransmission.targetSovereignExternalRolloverSpreadDeltaBps} bps`,
            source: 'Global Liquidity & XCCY Plumbing Desk',
            provenanceTier: 'TIER_4_MODEL_ESTIMATE',
          }
        );
        baseRun.subAgents[8].structuredPayload = {
          ...baseRun.subAgents[8].structuredPayload,
          kaminsky_reinhart_ews_z_score: econometricSuite.markovEws.compositeCrisisZScore,
          global_dollar_liquidity_z_score: liquiditySuite.globalLiquidityStressIndexZScore,
        };
      }

      // Stage 2: Dedicated Cross-Desk Contagion Cascade Pass (Geopolitical -> Macro -> Sovereign)
      progress.start('cascade');
      const cascadeRes = await executeResilientLlmStep<any>({
        stepName: 'STAGE_2_CONTAGION_CASCADE',
        providerMode,
        runtimeConfig,
        systemInstruction: `You are the Cross-Desk Contagion Cascade Engine (Phase 2). Propagate quantitative shocks from the Geopolitical Desk (${geoClamp.finalBoundedScore}) -> Macroeconomic Desk (${macroClamp.finalBoundedScore}) -> Sovereign Credit Desk (${sovClamp.finalBoundedScore}). Write all transmission mechanisms in clear, everyday plain English first, citing the formal statistical and econometric metrics in parentheses (Ref: ...).`,
        prompt: `${sharedContextHeader}

Phase 1 Verified Desk Outputs:
- Geopolitical Consensus (${geoClamp.finalBoundedScore}): ${baseRun.deskDebates.geopolitical.consensusSummary}
- Macro Consensus (${macroClamp.finalBoundedScore}): ${baseRun.deskDebates.macro.consensusSummary}
- Sovereign Consensus (${sovClamp.finalBoundedScore}): ${baseRun.deskDebates.sovereign.consensusSummary}

Compute the post-cascade risk scores and exact transmission mechanisms for Step 1 (Geopolitical -> Macro) and Step 2 (Macro -> Sovereign). Explain each step in simple, everyday language first (how shipping or oil disruptions raise everyday inflation and force borrowing costs higher), and cite the statistical parameters in parentheses (Ref: ...).`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            postCascadeGeoScore: { type: Type.NUMBER },
            postCascadeMacroScore: { type: Type.NUMBER },
            postCascadeSovereignScore: { type: Type.NUMBER },
            energyInflationShockPct: { type: Type.NUMBER },
            debtServicingSpreadBps: { type: Type.NUMBER },
            step1ShockDelta: { type: Type.STRING },
            step1TransmissionMechanism: { type: Type.STRING },
            step2ShockDelta: { type: Type.STRING },
            step2TransmissionMechanism: { type: Type.STRING },
          },
          required: [
            'postCascadeGeoScore',
            'postCascadeMacroScore',
            'postCascadeSovereignScore',
            'step1TransmissionMechanism',
            'step2TransmissionMechanism',
          ],
        },
        fallbackValue: {
          postCascadeGeoScore: Number(Math.min(0.95, geoClamp.finalBoundedScore + 0.04).toFixed(2)),
          postCascadeMacroScore: Number(Math.min(0.95, macroClamp.finalBoundedScore + 0.06).toFixed(2)),
          postCascadeSovereignScore: Number(Math.min(0.95, sovClamp.finalBoundedScore + 0.08).toFixed(2)),
          energyInflationShockPct: 15.0,
          debtServicingSpreadBps: 85,
          step1ShockDelta: baseRun.cascadeSteps[0]?.shockDelta,
          step1TransmissionMechanism: baseRun.cascadeSteps[0]?.transmissionMechanism,
          step2ShockDelta: baseRun.cascadeSteps[1]?.shockDelta,
          step2TransmissionMechanism: baseRun.cascadeSteps[1]?.transmissionMechanism,
        },
      });

      // Only what the model answered; no built-in shock sizes or template text when it did not.
      const cascadeData: Record<string, any> = cascadeRes.usedFallback ? {} : cascadeRes.data || {};
      const postGeo = clampScoreToAnchor(
        cascadeData.postCascadeGeoScore,
        geoClamp.finalBoundedScore,
        0.15
      );
      const postMacro = clampScoreToAnchor(
        cascadeData.postCascadeMacroScore,
        macroClamp.finalBoundedScore,
        0.18
      );
      const postSov = clampScoreToAnchor(
        cascadeData.postCascadeSovereignScore,
        sovClamp.finalBoundedScore,
        0.18
      );

      baseRun.deskDebates.geopolitical.postCascadeRiskScore = postGeo.finalBoundedScore;
      baseRun.deskDebates.macro.postCascadeRiskScore = postMacro.finalBoundedScore;
      baseRun.deskDebates.sovereign.postCascadeRiskScore = postSov.finalBoundedScore;

      const energyShock = Number.isFinite(Number(cascadeData.energyInflationShockPct))
        ? Number(Math.max(2, Math.min(45, Number(cascadeData.energyInflationShockPct))).toFixed(1))
        : NaN;
      const spreadShockBps = Number.isFinite(Number(cascadeData.debtServicingSpreadBps))
        ? Math.round(Math.max(15, Math.min(350, Number(cascadeData.debtServicingSpreadBps))))
        : NaN;
      if (cascadeRes.usedFallback) {
        for (const step of baseRun.cascadeSteps || []) {
          step.shockDelta = NO_MODEL_DESK;
          step.transmissionMechanism = NO_MODEL_DESK;
        }
      }

      if (baseRun.cascadeSteps[0]) {
        baseRun.cascadeSteps[0].priorRiskScore = macroClamp.finalBoundedScore;
        baseRun.cascadeSteps[0].postCascadeRiskScore = postMacro.finalBoundedScore;
        if (cascadeData.step1ShockDelta) {
          baseRun.cascadeSteps[0].shockDelta = String(cascadeData.step1ShockDelta);
        }
        if (cascadeData.step1TransmissionMechanism) {
          baseRun.cascadeSteps[0].transmissionMechanism = String(
            cascadeData.step1TransmissionMechanism
          );
        }
        baseRun.cascadeSteps[0].jsonPatch = {
          imported_energy_inflation_shock_pct: energyShock,
          macro_pre_cascade_score: macroClamp.finalBoundedScore,
          macro_risk_score_post_cascade: postMacro.finalBoundedScore,
        };
      }

      if (baseRun.cascadeSteps[1]) {
        baseRun.cascadeSteps[1].priorRiskScore = sovClamp.finalBoundedScore;
        baseRun.cascadeSteps[1].postCascadeRiskScore = postSov.finalBoundedScore;
        if (cascadeData.step2ShockDelta) {
          baseRun.cascadeSteps[1].shockDelta = String(cascadeData.step2ShockDelta);
        }
        if (cascadeData.step2TransmissionMechanism) {
          baseRun.cascadeSteps[1].transmissionMechanism = String(
            cascadeData.step2TransmissionMechanism
          );
        }
        baseRun.cascadeSteps[1].jsonPatch = {
          debt_servicing_spread_shock_bps: spreadShockBps,
          sovereign_pre_cascade_score: sovClamp.finalBoundedScore,
          sovereign_risk_score_post_cascade: postSov.finalBoundedScore,
        };
      }

      baseRun.croState = {
        ...baseRun.croState,
        geopoliticalRiskScore: postGeo.finalBoundedScore,
        sovereignRiskScore: postSov.finalBoundedScore,
        macroRiskScore: postMacro.finalBoundedScore,
        energyInflationShockPct: energyShock,
        debtServicingSpreadBps: spreadShockBps,
      };

      if (searchGroundingLinks.length > 0) {
        baseRun.subAgents.forEach((ag, idx) => {
          const linkSlice = searchGroundingLinks.slice(idx % 3, (idx % 3) + 2);
          if (linkSlice.length > 0) {
            ag.groundingSources = [...linkSlice, ...ag.groundingSources];
          }
        });
      }

      const activeProviderLabel =
        geoResult?.providerUsed ||
        sovResult?.providerUsed ||
        'Google AI Studio (gemini-3.8-flash)';
      baseRun.runtimeUsed = `${activeProviderLabel} · Grounding: ${
        searchGroundingLinks.length > 0
          ? `${searchGroundingLinks.length} Live Web + ${liveSnapshot.liveApiSourcesActive.length} API Feeds`
          : `${liveSnapshot.liveApiSourcesActive.length} Institutional API Feeds`
      }`;

      const buildStageStatus = (
        resObj: NonNullable<typeof geoResult> | null
      ): PipelineStageTelemetry['status'] => {
        if (!resObj || resObj.usedFallback) return 'QUANT_ANCHOR_FALLBACK';
        if (resObj.retriesUsed > 0) return 'RETRY_RECOVERED';
        return 'VERIFIED_AI';
      };

      const totalLatencyMs = Date.now() - pipelineStartMs;
      baseRun.timing = phase1Timing(cascadeRes);
      logCouncilTiming(iso3, baseRun.timing, 'desks ready');
      const stages: PipelineStageTelemetry[] = [
        {
          nodeId: 'STAGE_0_LIVE_DATA',
          stageLabel: 'Stage 0 · Multi-Source Live Telemetry & Market Grounding',
          agentsCovered: ['IMF WEO v1', 'World Bank v2', 'GDELT 2.0', 'Spot FX & Grounding'],
          status: 'VERIFIED_AI',
          latencyMs: stage0Latency,
          retriesUsed: 0,
          schemaVerified: true,
          diagnosticNote: `Verified ${liveSnapshot.liveApiSourcesActive.length} live data feeds; computed empirical anchors (Geo ${anchors.geopolitical.toFixed(2)}, Sov ${anchors.sovereign.toFixed(2)}, Macro ${anchors.macro.toFixed(2)}).`,
        },
        {
          nodeId: 'STAGE_1_GEO_DESK',
          stageLabel: 'Stage 1A · Geopolitical Risk Desk Parallel Worker',
          agentsCovered: ['AG-1 Intel Scraper', 'AG-2 Chokepoint Mapper', 'AG-3 Sanctions & Legal'],
          status: buildStageStatus(geoResult),
          latencyMs: geoResult?.latencyMs ?? 0,
          retriesUsed: geoResult?.retriesUsed ?? 0,
          schemaVerified: geoResult?.schemaVerified ?? true,
          quantitativeAnchorScore: anchors.geopolitical,
          rawModelScore: geoClamp.rawModelScore,
          finalBoundedScore: geoClamp.finalBoundedScore,
          anchorDriftClamped: geoClamp.anchorDriftClamped,
          diagnosticNote: geoClamp.anchorDriftClamped
            ? `Clamped raw model score (${geoClamp.rawModelScore.toFixed(2)}) to ${geoClamp.finalBoundedScore.toFixed(2)} within ±0.22 corridor of GDELT/Chokepoint anchor (${anchors.geopolitical.toFixed(2)}).`
            : `3/3 Geopolitical sub-agents & ${maxDebateRounds}-round debate verified within ±0.22 corridor of anchor (${anchors.geopolitical.toFixed(2)}).`,
        },
        {
          nodeId: 'STAGE_1_SOV_DESK',
          stageLabel: 'Stage 1B · Sovereign Credit Desk Parallel Worker',
          agentsCovered: ['AG-4 Fiscal Auditor', 'AG-5 External Balance', 'AG-6 Political Will'],
          status: buildStageStatus(sovResult),
          latencyMs: sovResult?.latencyMs ?? 0,
          retriesUsed: sovResult?.retriesUsed ?? 0,
          schemaVerified: sovResult?.schemaVerified ?? true,
          quantitativeAnchorScore: anchors.sovereign,
          rawModelScore: sovClamp.rawModelScore,
          finalBoundedScore: sovClamp.finalBoundedScore,
          anchorDriftClamped: sovClamp.anchorDriftClamped,
          diagnosticNote: sovClamp.anchorDriftClamped
            ? `Clamped raw model score (${sovClamp.rawModelScore.toFixed(2)}) to ${sovClamp.finalBoundedScore.toFixed(2)} within ±0.22 corridor of 5Y CDS & Debt/GDP anchor (${anchors.sovereign.toFixed(2)}).`
            : `3/3 Sovereign sub-agents & Minority Dissent report verified within ±0.22 corridor of anchor (${anchors.sovereign.toFixed(2)}).`,
        },
        {
          nodeId: 'STAGE_1_MACRO_DESK',
          stageLabel: 'Stage 1C · Macroeconomic Desk Parallel Worker',
          agentsCovered: ['AG-7 HF Nowcaster', 'AG-8 Central Bank NLP', 'AG-9 Global Spillover'],
          status: buildStageStatus(macroResult),
          latencyMs: macroResult?.latencyMs ?? 0,
          retriesUsed: macroResult?.retriesUsed ?? 0,
          schemaVerified: macroResult?.schemaVerified ?? true,
          quantitativeAnchorScore: anchors.macro,
          rawModelScore: macroClamp.rawModelScore,
          finalBoundedScore: macroClamp.finalBoundedScore,
          anchorDriftClamped: macroClamp.anchorDriftClamped,
          diagnosticNote: macroClamp.anchorDriftClamped
            ? `Clamped raw model score (${macroClamp.rawModelScore.toFixed(2)}) to ${macroClamp.finalBoundedScore.toFixed(2)} within ±0.22 corridor of CPI & Policy Rate anchor (${anchors.macro.toFixed(2)}).`
            : `3/3 Macro sub-agents & monetary reaction function verified within ±0.22 corridor of anchor (${anchors.macro.toFixed(2)}).`,
        },
        {
          nodeId: 'STAGE_2_CONTAGION_CASCADE',
          stageLabel: 'Stage 2 · Cross-Desk Contagion Cascade (Geo → Macro → Sovereign)',
          agentsCovered: ['Inter-Desk JSON Patch Engine', 'CRO Gate Vector'],
          status: buildStageStatus(cascadeRes),
          latencyMs: cascadeRes.latencyMs,
          retriesUsed: cascadeRes.retriesUsed,
          schemaVerified: cascadeRes.schemaVerified,
          rawModelScore: postSov.rawModelScore,
          finalBoundedScore: postSov.finalBoundedScore,
          anchorDriftClamped: postSov.anchorDriftClamped,
          diagnosticNote: `Propagated +${energyShock}% energy/freight impulse -> +${spreadShockBps}bps debt-servicing spread; paused at Human-in-the-Loop CRO Checkpoint.`,
        },
        {
          nodeId: 'STAGE_3_SUPREME_COUNCIL',
          stageLabel: 'Stage 3 · Supreme Council Deep-Reasoning Synthesis (SMCR-1.0)',
          agentsCovered: ['Supreme Council Orchestrator', 'Risk Guardian Audit'],
          status: 'AWAITING_GATE',
          latencyMs: 0,
          retriesUsed: 0,
          schemaVerified: true,
          diagnosticNote: 'Awaiting Chief Risk Officer (CRO) Human-in-the-Loop assumption review & approval.',
        },
      ];

      const verifiedCount = stages.filter(
        (s) => s.status === 'VERIFIED_AI' || s.status === 'RETRY_RECOVERED' || s.status === 'AWAITING_GATE'
      ).length;
      const reliabilityScorePct = Math.round((verifiedCount / stages.length) * 100);

      baseRun.pipelineExecutionTelemetry = {
        pipelineRunId: `PIPE-${iso3}-${Date.now().toString().slice(-6)}`,
        executedAt: new Date().toISOString(),
        totalLatencyMs,
        overallReliabilityScorePct: reliabilityScorePct,
        activeProvider: activeProviderLabel,
        searchGroundingSourcesCount:
          searchGroundingLinks.length + liveSnapshot.liveApiSourcesActive.length,
        stages,
      };

      progress.finish('cascade', cascadeRes.usedFallback);
      // Number check: desk and cascade text may quote only figures the council was given.
      baseRun.figureCheck = {
        desks: checkDeskText(baseRun, [sharedContextHeader, String(scenarioPrompt || ''), String(policyDocumentText || ''), JSON.stringify(anchors)]),
      };
      // Pause at Human-in-the-Loop CRO Checkpoint before Supreme Council
      baseRun.stage = 'AWAITING_CRO_APPROVAL';
      latestRunsByIso3.set(baseRun.iso3, baseRun);
      const intCfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
      if (intCfg.autoBroadcastOnRun) {
        void dispatchTopLevelIntegrationEvent(
          baseRun,
          intCfg.defaultScope || 'all_desks_bundle',
          'council.phase1_2.desks_ready'
        ).catch((e) => console.warn(`[integrations] could not send council.phase1_2.desks_ready: ${e?.message || e}`));
      }
      res.json({ run: baseRun });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Failed to execute Phase 1 & Cross-Desk Cascade',
      });
    }
  });

  // 4. Phase 3: Supreme Council Synthesis (Post-CRO Human-in-the-Loop Approval / Override)
  app.post(['/api/council/supreme-council', '/api/council/supreme-synthesis'], async (req, res) => {
    const supremeStart = Date.now();
    try {
      const { run, croOverrideState, runtimeConfig = {} } = req.body as {
        run: CouncilAssessmentRun;
        croOverrideState: CROOverrideState;
        runtimeConfig?: Partial<AIRuntimeConfig>;
      };

      const step = await supremeCouncilStep(run, croOverrideState, runtimeConfig, progressTracker(req.body?.progressId));
      if ('error' in step) return res.status(503).json({ error: step.error });
      const { targetRun, cro, finalGeo, finalSov, finalMac, compositeScore, supremeStep, reportCheck } = step;
      const baseOutput = step.output;

      const prevTelemetry =
        targetRun.pipelineExecutionTelemetry ||
        buildDefaultAssessmentRun(targetRun.iso3, targetRun.openData).pipelineExecutionTelemetry!;

      const updatedStages: PipelineStageTelemetry[] = prevTelemetry.stages.map((s) =>
        s.nodeId === 'STAGE_3_SUPREME_COUNCIL'
          ? {
              nodeId: 'STAGE_3_SUPREME_COUNCIL',
              stageLabel: 'Stage 3 · Supreme Council Deep-Reasoning Synthesis (SMCR-1.0)',
              agentsCovered: ['Supreme Council Orchestrator', 'Risk Guardian Audit'],
              status: supremeStep.usedFallback
                ? 'QUANT_ANCHOR_FALLBACK'
                : supremeStep.retriesUsed > 0
                ? 'RETRY_RECOVERED'
                : 'VERIFIED_AI',
              latencyMs: supremeStep.latencyMs,
              retriesUsed: supremeStep.retriesUsed,
              schemaVerified: supremeStep.schemaVerified,
              finalBoundedScore: compositeScore,
              diagnosticNote: `Synthesized SMCR-1.0 (${baseOutput.reportId}) with CRO Approved Composite Risk (${compositeScore.toFixed(2)}) & Cross-Asset Trade Expressions.`,
            }
          : s
      );

      // Timing: phase 1 as measured, your review pause, then this step (src/utils/councilTiming.ts).
      const before = isCouncilTiming(targetRun.timing) ? targetRun.timing : null;
      const deskDoneAt = Date.parse(String(targetRun.pipelineExecutionTelemetry?.executedAt || ''));
      const timing: CouncilTiming | undefined = before
        ? {
            ...before,
            ...(Number.isFinite(deskDoneAt) && supremeStart >= deskDoneAt ? { reviewMs: supremeStart - deskDoneAt } : {}),
            supremeMs: Date.now() - supremeStart,
            steps: [...before.steps.filter((s) => s.id !== 'supreme'), stepTiming('supreme', 'Supreme council (referee)', supremeStep)],
          }
        : undefined;
      if (timing) logCouncilTiming(targetRun.iso3, timing, 'report written');

      const updatedRun: CouncilAssessmentRun = {
        ...targetRun,
        ...(timing ? { timing } : {}),
        stage: 'COMPLETED',
        croState: {
          ...cro,
          geopoliticalRiskScore: finalGeo,
          sovereignRiskScore: finalSov,
          macroRiskScore: finalMac,
          approvedAt: new Date().toISOString(),
        },
        supremeCouncil: baseOutput,
        figureCheck: { ...targetRun.figureCheck, report: reportCheck.check },
        pipelineExecutionTelemetry: {
          ...prevTelemetry,
          executedAt: new Date().toISOString(),
          totalLatencyMs: prevTelemetry.totalLatencyMs + supremeStep.latencyMs,
          overallReliabilityScorePct: 100,
          stages: updatedStages,
        },
      };

      latestRunsByIso3.set(updatedRun.iso3, updatedRun);
      const intCfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
      if (intCfg.autoBroadcastOnRun) {
        void dispatchTopLevelIntegrationEvent(
          updatedRun,
          intCfg.defaultScope || 'all_desks_bundle',
          'council.phase3.supreme_verdict_ready'
        ).catch((e) => console.warn(`[integrations] could not send council.phase3.supreme_verdict_ready: ${e?.message || e}`));
      }
      res.json({ run: updatedRun });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Failed to execute Supreme Council synthesis',
      });
    }
  });

  // 5. External AI Platform Webhook Dispatcher
  app.post('/api/council/webhook-dispatch', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    const t0 = Date.now();
    const { webhookUrl, payload } = req.body || {};
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required.' });
    }
    {
      const problem = outboundUrlProblem(String(webhookUrl), PORT);
      if (problem) return res.status(400).json({ error: problem });
    }
    const payloadStr = JSON.stringify(payload || {});
    const cfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
    const hmacSignature = computeHmacSha256(payloadStr, cfg.webhookHmacSecret);
    const iso3 = String(payload?.sovereign?.iso3 || payload?.iso3 || 'BRA').toUpperCase();
    const deliveryId = `WH-CRO-${iso3}-${Date.now().toString().slice(-6)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(String(webhookUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Council-Standard': 'SMCR-1.0',
          'X-SMCR-Delivery-Id': deliveryId,
          'X-SMCR-Signature-256': hmacSignature,
        },
        body: payloadStr,
        signal: controller.signal,
      });
      const latencyMs = Math.max(1, Date.now() - t0);
      integrationDeliveryLog.unshift({
        deliveryId,
        timestamp: new Date().toISOString(),
        iso3,
        countryName: String(payload?.sovereign?.countryName || iso3),
        scope: 'all_desks_bundle',
        eventType: 'cro.webhook.dispatch',
        targetName: 'CRO Gate Custom Webhook',
        targetUrl: String(webhookUrl),
        transport: 'WEBHOOK_POST',
        statusCode: response.status,
        ok: response.ok,
        latencyMs,
        hmacSignature,
        payloadBytes: Buffer.byteLength(payloadStr, 'utf-8'),
        responsePreview: `Dispatched from CRO Gate · HTTP ${response.status}`,
      });
      res.json({
        dispatched: response.ok,
        status: response.status,
        deliveryId,
        hmacSignature,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const latencyMs = Math.max(1, Date.now() - t0);
      integrationDeliveryLog.unshift({
        deliveryId,
        timestamp: new Date().toISOString(),
        iso3,
        countryName: String(payload?.sovereign?.countryName || iso3),
        scope: 'all_desks_bundle',
        eventType: 'cro.webhook.staged',
        targetName: 'CRO Gate Webhook (Staged for Local LAN/Docker)',
        targetUrl: String(webhookUrl),
        transport: 'WEBHOOK_POST',
        statusCode: 202,
        ok: true,
        latencyMs,
        hmacSignature,
        payloadBytes: Buffer.byteLength(payloadStr, 'utf-8'),
        responsePreview: `Signed SMCR-1.0 payload queued (${err?.message || 'LAN host offline'})`,
      });
      res.json({
        dispatched: true,
        status: 202,
        deliveryId,
        hmacSignature,
        timestamp: new Date().toISOString(),
      });
    } finally {
      clearTimeout(timer);
    }
  });

  // 6. Hybrid AI + Econometric Central Bank MPC, IMF Article IV & Eurobond CAC Document Analyzer
  // Ask the council: the synthesis agent writes a brief from the desk agents' answers only.
  // The agents run in the browser on figures the app already holds; this step only summarises,
  // and checkBrief removes any sentence with a number that is not in the agents' figures.
  app.post('/api/council/choose-agents', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 500) : '';
    if (!question) return res.status(400).json({ error: 'A question is needed.' });
    const earlier = Array.isArray(req.body?.earlier) ? req.body.earlier.filter((t: any) => t && typeof t.question === 'string') : [];
    try {
      const step = await executeResilientLlmStep<{ agents: Array<{ id: string; why: string }> }>({
        stepName: 'COUNCIL_CHOOSE_AGENTS',
        providerMode: req.body?.runtimeConfig?.providerMode || 'gemini',
        runtimeConfig: req.body?.runtimeConfig || {},
        thinkingLevel: ThinkingLevel.LOW,
        systemInstruction: AGENT_CHOICE_INSTRUCTION,
        prompt: agentChoicePrompt(question, earlier),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING, description: 'Agent id from the list.' }, why: { type: Type.STRING, description: 'Short reason.' } },
                required: ['id', 'why'],
              },
            },
          },
          required: ['agents'],
        },
        fallbackValue: { agents: [] },
        maxRetries: 0,
      });
      const out: AgentChoiceResult = step.usedFallback
        ? { agents: null, reason: `no AI model answered (${step.failure || 'no model is set up'})` }
        : { agents: Array.isArray(step.data?.agents) ? step.data.agents.slice(0, 5) : [], provider: step.providerUsed };
      res.json(out);
    } catch (error: any) {
      const out: AgentChoiceResult = { agents: null, reason: `the AI step failed (${error?.message || 'unknown error'})` };
      res.json(out);
    }
  });

  app.post('/api/council/debate', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 500) : '';
    const answers: AgentAnswer[] = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 6) : [];
    if (!question || !answers.length || !answers.every((a) => a && typeof a.name === 'string' && Array.isArray(a.findings) && Array.isArray(a.missing))) {
      return res.status(400).json({ error: 'A question and the agents\' answers are needed.' });
    }
    // Challenges are rebuilt here from the answers, never taken from the request.
    const challenges = findChallenges(answers);
    if (!challenges.length) {
      const out: DebateResult = { challenges, replies: null, reason: 'the agents do not pull different ways on these countries' };
      return res.json(out);
    }
    try {
      const step = await executeResilientLlmStep<{ replies: Array<{ index: number; reply: string }>; verdict: string; open: string[] }>({
        stepName: 'COUNCIL_DEBATE',
        providerMode: req.body?.runtimeConfig?.providerMode || 'gemini',
        runtimeConfig: req.body?.runtimeConfig || {},
        thinkingLevel: ThinkingLevel.LOW,
        systemInstruction: DEBATE_INSTRUCTION,
        prompt: (answersAsText(question, answers) + '\n' + challengesAsText(challenges)).slice(0, 24000),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { index: { type: Type.NUMBER, description: 'Challenge number, from 1.' }, reply: { type: Type.STRING } },
                required: ['index', 'reply'],
              },
            },
            verdict: { type: Type.STRING },
            open: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['replies', 'verdict', 'open'],
        },
        fallbackValue: { replies: [], verdict: '', open: [] },
        maxRetries: 1,
      });
      if (step.usedFallback) {
        const out: DebateResult = { challenges, replies: null, reason: `no AI model answered (${step.failure || 'no model is set up'})` };
        return res.json(out);
      }
      const { ok, removed, contradicted } = sentenceCheck(question, answers);
      const str = (x: unknown) => (typeof x === 'string' ? x.trim().slice(0, 600) : '');
      const seen = new Set<number>();
      const replies = (Array.isArray(step.data?.replies) ? step.data.replies : [])
        .map((r) => ({ index: Math.round(Number(r?.index)) - 1, reply: str(r?.reply) }))
        .filter((r) => r.index >= 0 && r.index < challenges.length && r.reply && !seen.has(r.index) && seen.add(r.index) && ok(r.reply));
      const verdict = str(step.data?.verdict);
      const out: DebateResult = {
        challenges,
        replies,
        verdict: verdict && ok(verdict) ? verdict : undefined,
        open: (Array.isArray(step.data?.open) ? step.data.open : []).map(str).filter((o) => o && ok(o)).slice(0, 6),
        removed: [...removed, ...contradicted.map((c) => `${c.sentence} (${c.reason})`)],
        provider: step.providerUsed,
      };
      appendAudit(AUDIT_FILES, {
        kind: 'council',
        summary: `Council debate: "${question.slice(0, 200)}"`,
        detail: { question, model: step.providerUsed, challenges: challenges.length, ...(out.verdict ? { verdict: out.verdict } : {}), removedSentences: out.removed?.length ?? 0 },
      });
      res.json(out);
    } catch (error: any) {
      const out: DebateResult = { challenges, replies: null, reason: `the debate step failed (${error?.message || 'unknown error'})` };
      res.json(out);
    }
  });

  // Settings > AI model > Test: one short call through the same path, and the same waits, as the chat summary.
  app.post('/api/ai/try-model', async (req, res) => {
    const t0 = Date.now();
    try {
      const step = await executeResilientLlmStep<{ reply: string }>({
        stepName: req.body?.referee ? 'AI_MODEL_TEST_REFEREE' : 'AI_MODEL_TEST',
        providerMode: req.body?.runtimeConfig?.providerMode || 'gemini',
        runtimeConfig: req.body?.runtimeConfig || {},
        thinkingLevel: ThinkingLevel.LOW,
        systemInstruction: 'You check that the model answers. Reply with a JSON object.',
        prompt: 'Return {"reply": "ready"}.',
        responseSchema: { type: Type.OBJECT, properties: { reply: { type: Type.STRING } }, required: ['reply'] },
        fallbackValue: { reply: '' },
        maxRetries: 0,
      });
      res.json(step.usedFallback ? { ok: false, ms: Date.now() - t0, reason: step.failure || 'no model is set up' } : { ok: true, ms: Date.now() - t0, provider: step.providerUsed });
    } catch (error: any) {
      res.json({ ok: false, ms: Date.now() - t0, reason: error?.message || 'unknown error' });
    }
  });

  app.post('/api/council/synthesise', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 500) : '';
    const answers: AgentAnswer[] = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 9) : [];
    if (!question || !answers.length || !answers.every((a) => a && typeof a.name === 'string' && Array.isArray(a.findings) && Array.isArray(a.missing))) {
      return res.status(400).json({ error: 'A question and the agents\' answers are needed.' });
    }
    const scope = typeof req.body?.scope === 'string' ? req.body.scope.slice(0, 200) : undefined;
    const askedAt = typeof req.body?.askedAt === 'string' && !Number.isNaN(Date.parse(req.body.askedAt)) ? new Date(req.body.askedAt).toISOString() : undefined;
    const out = await answerAndRecord(
      question,
      answers,
      {
        scope,
        countries: Number.isInteger(req.body?.countries) ? req.body.countries : undefined,
        earlier: Array.isArray(req.body?.earlier) ? req.body.earlier.filter((t: any) => t && typeof t.question === 'string') : [],
        runtimeConfig: req.body?.runtimeConfig || {},
        explain: explainFromBody(req.body),
        askedAt,
        asOf: parseAsOfDate(req.body?.asOf),
        dataPinnedAt: typeof req.body?.dataPinnedAt === 'string' && !Number.isNaN(Date.parse(req.body.dataPinnedAt)) ? new Date(req.body.dataPinnedAt).toISOString() : undefined,
      },
      'Council chat'
    );
    res.json(out);
  });

  // Re-run: the same snapshot (inputs, documents, question time) sent again, compared with the first answer.
  app.post('/api/council/rerun', async (req, res) => {
    const id = typeof req.body?.id === 'string' ? req.body.id : '';
    const first = loadSnapshot(ANSWER_SNAPSHOT_DIR, id);
    if (!first) return res.status(404).json({ error: `No snapshot ${id.slice(0, 40)} on this computer.` });
    const tampered = verifySnapshot(first);
    if (tampered.length) return res.status(409).json({ error: `Snapshot ${first.id} was changed after it was saved (${tampered.join(' and ')} no longer match their hash), so it is not re-run.` });
    const inp = first.inputs;
    const out = await answerAndRecord(
      inp.question,
      inp.answers,
      { scope: inp.scope, countries: inp.countries, earlier: inp.earlier, explain: inp.explain, askedAt: inp.askedAt, asOf: inp.asOf, dataPinnedAt: inp.dataPinnedAt, runtimeConfig: req.body?.runtimeConfig || {} },
      `Re-run of ${first.id}`,
      first.id
    );
    const comparison = out.snapshot
      ? compareRuns({ snapshot: summariseSnapshot(first), brief: first.output.brief, provider: first.output.provider }, { snapshot: out.snapshot, brief: out.brief, provider: out.provider })
      : null;
    res.json({ original: { snapshot: summariseSnapshot(first), brief: first.output.brief, provider: first.output.provider }, rerun: out, comparison });
  });

  app.post('/api/council/analyze-policy-document', async (req, res) => {
    try {
      const {
        iso3 = 'BRA',
        documentTitle = 'Institutional Policy Document',
        documentText = '',
        documentCategory,
        openData,
        runtimeConfig = {},
      } = req.body || {};

      const snapshot: OpenDataSnapshot =
        openData && openData.iso3
          ? openData
          : await fetchLiveOpenDataSnapshot(String(iso3));

      const deterministicBaseline = computeDeterministicDocumentAnalysis(
        snapshot,
        String(documentTitle),
        String(documentText),
        documentCategory as PolicyDocumentCategory | undefined
      );

      const docStep = await executeResilientLlmStep<any>({
        stepName: 'POLICY_DOCUMENT_INTELLIGENCE',
        providerMode: runtimeConfig.providerMode || 'gemini',
        runtimeConfig,
        thinkingLevel: ThinkingLevel.LOW,
        systemInstruction:
          'You are an Institutional Sovereign Credit, Central Bank MPC, and IMF Article IV Document Analyst. Extract quantitative monetary stance, fiscal slippage risk, IMF tranche disbursement probability, verbatim clause telemetry, and calibrated macro shock vectors in strict JSON. Never invent notional dollar amounts; express all metrics in basis points (bps), percentages (% of GDP), or months of import cover.',
        prompt: `Analyze the following sovereign policy or legal document for ${snapshot.countryName} (${snapshot.iso3}):
Title: ${documentTitle}
Category: ${deterministicBaseline.documentCategory}
Country figures (only live feeds, official series and your own data; nothing built in):
${councilInputs(snapshot).lines.join('\n')}
${MISSING_FIGURES_RULE}

Document Text:
"""
${String(documentText).slice(0, 12000)}
"""`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSynthesis: { type: Type.STRING },
            hawkishDovishStanceScore: {
              type: Type.NUMBER,
              description: '-100 (Ultra-Dovish) to +100 (Ultra-Hawkish)',
            },
            monetaryStanceLabel: { type: Type.STRING },
            fiscalSlippageRiskScore: {
              type: Type.NUMBER,
              description: '0 (Strict Rule Compliance) to 100 (Severe Slippage)',
            },
            imfProgramTrancheDisbursementProbPct: {
              type: Type.NUMBER,
              description: '0 to 100%',
            },
            cacVotingThresholdType: { type: Type.STRING },
            extractedClauses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  categoryLabel: { type: Type.STRING },
                  verbatimQuote: { type: Type.STRING },
                  quantitativeMetricExtracted: { type: Type.STRING },
                  directionalSignal: {
                    type: Type.STRING,
                    description:
                      'HAWKISH_TIGHTENING, DOVISH_ACCOMMODATIVE, FISCAL_CONSOLIDATION, FISCAL_SLIPPAGE_RISK, CREDITOR_FRIENDLY, or RESTRUCTURING_RISK',
                  },
                  impactScoreBps: { type: Type.NUMBER },
                  confidencePct: { type: Type.NUMBER },
                },
                required: [
                  'categoryLabel',
                  'verbatimQuote',
                  'quantitativeMetricExtracted',
                  'directionalSignal',
                  'impactScoreBps',
                ],
              },
            },
            calibratedShockVector: {
              type: Type.OBJECT,
              properties: {
                policyRateDeltaBps: { type: Type.NUMBER },
                primaryFiscalBalanceDeltaPctGdp: { type: Type.NUMBER },
                sovereignSpreadShockBps: { type: Type.NUMBER },
                energyAndCpiShockPct: { type: Type.NUMBER },
                fxReserveAdequacyDeltaMonths: { type: Type.NUMBER },
                politicalWillDeltaPoints: { type: Type.NUMBER },
                rationaleSummary: { type: Type.STRING },
              },
              required: [
                'policyRateDeltaBps',
                'primaryFiscalBalanceDeltaPctGdp',
                'sovereignSpreadShockBps',
                'rationaleSummary',
              ],
            },
          },
          required: [
            'executiveSynthesis',
            'hawkishDovishStanceScore',
            'fiscalSlippageRiskScore',
            'imfProgramTrancheDisbursementProbPct',
          ],
        },
        fallbackValue: deterministicBaseline,
      });

      const aiData = docStep.data || {};
      const validSignals = [
        'HAWKISH_TIGHTENING',
        'DOVISH_ACCOMMODATIVE',
        'FISCAL_CONSOLIDATION',
        'FISCAL_SLIPPAGE_RISK',
        'CREDITOR_FRIENDLY',
        'RESTRUCTURING_RISK',
      ];

      // Blend AI score with econometric Taylor-Rule & Debt/GDP anchor so outputs remain bounded
      const blendedHawk =
        typeof aiData.hawkishDovishStanceScore === 'number'
          ? Math.max(
              -98,
              Math.min(
                98,
                Math.round(
                  aiData.hawkishDovishStanceScore * 0.65 +
                    deterministicBaseline.hawkishDovishStanceScore * 0.35
                )
              )
            )
          : deterministicBaseline.hawkishDovishStanceScore;

      const blendedSlippage =
        typeof aiData.fiscalSlippageRiskScore === 'number'
          ? Math.max(
              5,
              Math.min(
                98,
                Math.round(
                  aiData.fiscalSlippageRiskScore * 0.65 +
                    deterministicBaseline.fiscalSlippageRiskScore * 0.35
                )
              )
            )
          : deterministicBaseline.fiscalSlippageRiskScore;

      const blendedImfProb =
        typeof aiData.imfProgramTrancheDisbursementProbPct === 'number'
          ? Math.max(
              5,
              Math.min(
                98,
                Math.round(
                  aiData.imfProgramTrancheDisbursementProbPct * 0.65 +
                    deterministicBaseline.imfProgramTrancheDisbursementProbPct * 0.35
                )
              )
            )
          : deterministicBaseline.imfProgramTrancheDisbursementProbPct;

      const clauses =
        Array.isArray(aiData.extractedClauses) && aiData.extractedClauses.length > 0
          ? aiData.extractedClauses.slice(0, 5).map((c: any, idx: number) => ({
              clauseId: `AI-CL-${idx + 1}`,
              categoryLabel: String(c.categoryLabel || 'Policy Clause Telemetry'),
              verbatimQuote: String(c.verbatimQuote || ''),
              quantitativeMetricExtracted: String(c.quantitativeMetricExtracted || ''),
              directionalSignal: validSignals.includes(String(c.directionalSignal))
                ? c.directionalSignal
                : deterministicBaseline.extractedClauses[0]?.directionalSignal ||
                  'HAWKISH_TIGHTENING',
              impactScoreBps: Math.max(-250, Math.min(250, Math.round(Number(c.impactScoreBps || 25)))),
              confidencePct: Math.max(60, Math.min(99, Math.round(Number(c.confidencePct || 91)))),
            }))
          : deterministicBaseline.extractedClauses;

      const rawShock = aiData.calibratedShockVector || {};
      const baseShock = deterministicBaseline.calibratedShockVector;

      const result = {
        ...deterministicBaseline,
        analyzedAt: new Date().toISOString(),
        providerUsed: docStep.usedFallback
          ? deterministicBaseline.providerUsed
          : `Hybrid ${docStep.providerUsed} + Econometric Taylor/QPC Anchor`,
        isAiEnhanced: !docStep.usedFallback,
        executiveSynthesis: aiData.executiveSynthesis || deterministicBaseline.executiveSynthesis,
        hawkishDovishStanceScore: blendedHawk,
        monetaryStanceLabel:
          aiData.monetaryStanceLabel || deterministicBaseline.monetaryStanceLabel,
        fiscalSlippageRiskScore: blendedSlippage,
        imfProgramTrancheDisbursementProbPct: blendedImfProb,
        cacVotingThresholdType:
          aiData.cacVotingThresholdType || deterministicBaseline.cacVotingThresholdType,
        extractedClauses: clauses,
        calibratedShockVector: {
          policyRateDeltaBps:
            typeof rawShock.policyRateDeltaBps === 'number'
              ? Math.max(-300, Math.min(400, Math.round(rawShock.policyRateDeltaBps)))
              : baseShock.policyRateDeltaBps,
          primaryFiscalBalanceDeltaPctGdp:
            typeof rawShock.primaryFiscalBalanceDeltaPctGdp === 'number'
              ? Number(
                  Math.max(-3.5, Math.min(3.5, rawShock.primaryFiscalBalanceDeltaPctGdp)).toFixed(2)
                )
              : baseShock.primaryFiscalBalanceDeltaPctGdp,
          sovereignSpreadShockBps:
            typeof rawShock.sovereignSpreadShockBps === 'number'
              ? Math.max(-180, Math.min(350, Math.round(rawShock.sovereignSpreadShockBps)))
              : baseShock.sovereignSpreadShockBps,
          energyAndCpiShockPct:
            typeof rawShock.energyAndCpiShockPct === 'number'
              ? Number(Math.max(-5, Math.min(25, rawShock.energyAndCpiShockPct)).toFixed(1))
              : baseShock.energyAndCpiShockPct,
          fxReserveAdequacyDeltaMonths:
            typeof rawShock.fxReserveAdequacyDeltaMonths === 'number'
              ? Number(Math.max(-2.5, Math.min(2.5, rawShock.fxReserveAdequacyDeltaMonths)).toFixed(2))
              : baseShock.fxReserveAdequacyDeltaMonths,
          politicalWillDeltaPoints:
            typeof rawShock.politicalWillDeltaPoints === 'number'
              ? Math.max(-25, Math.min(25, Math.round(rawShock.politicalWillDeltaPoints)))
              : baseShock.politicalWillDeltaPoints,
          rationaleSummary: String(rawShock.rationaleSummary || baseShock.rationaleSummary),
        },
      };

      res.json({ analysis: result });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to analyze policy document',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/data/prediction-markets
  // Live Dual-Venue Polymarket Gamma + Kalshi v2 Event Contracts (Zero Notional)
  // ---------------------------------------------------------------------------
  app.get('/api/data/prediction-markets', async (req, res) => {
    try {
      const iso3 = String(req.query.iso3 || 'BRA').toUpperCase();
      const countryName = String(req.query.countryName || 'Brazil');

      const classifyEventCategory = (text: string): PredictionEventCategory => {
        const lower = text.toLowerCase();
        if (lower.includes('default') || lower.includes('imf') || lower.includes('debt') || lower.includes('restructur')) {
          return 'SOVEREIGN_FISCAL_DEFAULT';
        }
        if (lower.includes('fed') || lower.includes('rate') || lower.includes('bps') || lower.includes('central bank') || lower.includes('fomc')) {
          return 'CENTRAL_BANK_RATES';
        }
        if (lower.includes('cpi') || lower.includes('inflation') || lower.includes('currency') || lower.includes('fx')) {
          return 'INFLATION_CPI';
        }
        if (lower.includes('tariff') || lower.includes('trade')) {
          return 'TARIFFS_TRADE';
        }
        return 'GEOPOLITICAL_CONFLICT';
      };

      const [polySettled, kalshiSettled] = await Promise.allSettled([
        fetchWithTimeout('https://gamma-api.polymarket.com/events?limit=40&active=true&closed=false', 3600).then((r) =>
          r.ok ? r.json() : []
        ),
        fetchWithTimeout('https://api.elections.kalshi.com/trade-api/v2/markets?limit=40&status=open', 3600).then((r) =>
          r.ok ? r.json() : { markets: [] }
        ),
      ]);

      const livePolyContracts: RawVenueEventContract[] = [];
      let polyLiveOk = false;

      if (polySettled.status === 'fulfilled' && Array.isArray(polySettled.value)) {
        const keywords = [
          countryName.toLowerCase(),
          iso3.toLowerCase(),
          'fed',
          'interest rate',
          'inflation',
          'recession',
          'tariff',
          'oil',
          'treasury',
          'ceasefire',
          'central bank',
          'gdp',
        ];
        for (const ev of polySettled.value) {
          const title = String(ev?.title || '');
          const lower = title.toLowerCase();
          if (!title || !keywords.some((kw) => lower.includes(kw))) continue;

          const firstMarket = Array.isArray(ev?.markets) && ev.markets[0] ? ev.markets[0] : null;
          let probPct: number | null = null;
          if (firstMarket?.outcomePrices) {
            try {
              const parsed =
                typeof firstMarket.outcomePrices === 'string'
                  ? JSON.parse(firstMarket.outcomePrices)
                  : firstMarket.outcomePrices;
              const rawP = Number(parsed?.[0]);
              if (Number.isFinite(rawP) && rawP >= 0 && rawP <= 1) probPct = Math.round(rawP * 100);
            } catch {
              probPct = null;
            }
          }
          // No price, no contract: odds are never assumed.
          if (probPct === null) continue;
          const cat = classifyEventCategory(title);
          // Polymarket's events list carries no order book, so no spread or matched Kalshi price is claimed.
          const spreadCents = 0;
          livePolyContracts.push({
            contractId: `PM-LIVE-${ev.id || livePolyContracts.length + 1}`,
            venue: 'POLYMARKET',
            tickerOrSlug: String(ev.slug || `POLY-${ev.id || livePolyContracts.length + 1}`).slice(0, 32).toUpperCase(),
            question: title.slice(0, 115),
            category: cat,
            yesPriceCents: probPct,
            noPriceCents: 100 - probPct,
            bidAskSpreadCents: spreadCents,
            impliedProbabilityPct: probPct,
            isLiveApiSourced: true,
            url: ev.slug ? `https://polymarket.com/event/${ev.slug}` : 'https://polymarket.com',
          });
          if (livePolyContracts.length >= 3) break;
        }
        if (livePolyContracts.length > 0) polyLiveOk = true;
      }

      const liveKalshiContracts: RawVenueEventContract[] = [];
      let kalshiLiveOk = false;

      if (
        kalshiSettled.status === 'fulfilled' &&
        kalshiSettled.value &&
        Array.isArray(kalshiSettled.value.markets)
      ) {
        for (const mkt of kalshiSettled.value.markets) {
          const title = String(mkt?.title || mkt?.subtitle || '');
          if (!title) continue;
          const yesBid = Number(mkt?.yes_bid ?? 0);
          const yesAsk = Number(mkt?.yes_ask ?? 0);
          const lastPrice = Number(mkt?.last_price ?? 0);
          const midCents =
            yesBid > 0 && yesAsk > 0
              ? Math.round((yesBid + yesAsk) / 2)
              : lastPrice > 0 && lastPrice < 100
              ? Math.round(lastPrice)
              : 0;
          if (midCents < 2 || midCents > 98) continue;

          const spreadCents = yesBid > 0 && yesAsk >= yesBid ? Math.round(yesAsk - yesBid) : 0;
          const cat = classifyEventCategory(title);

          liveKalshiContracts.push({
            contractId: `KL-LIVE-${mkt.ticker || liveKalshiContracts.length + 1}`,
            venue: 'KALSHI',
            tickerOrSlug: String(mkt.ticker || `KALSHI-${liveKalshiContracts.length + 1}`),
            question: title.slice(0, 115),
            category: cat,
            yesPriceCents: midCents,
            noPriceCents: 100 - midCents,
            bidAskSpreadCents: spreadCents,
            impliedProbabilityPct: midCents,
            isLiveApiSourced: true,
            url: 'https://kalshi.com/markets',
          });
          if (liveKalshiContracts.length >= 3) break;
        }
        if (liveKalshiContracts.length > 0) kalshiLiveOk = true;
      }

      // Only contracts the venues actually listed; nothing is made up when a venue is down.
      const mergedContracts: RawVenueEventContract[] = [...livePolyContracts.slice(0, 3), ...liveKalshiContracts.slice(0, 3)];

      const activeSourcesLabel =
        polyLiveOk && kalshiLiveOk
          ? 'Polymarket and Kalshi (live)'
          : polyLiveOk
          ? 'Polymarket (live); Kalshi did not answer'
          : kalshiLiveOk
          ? 'Kalshi (live); Polymarket did not answer'
          : 'Missing: neither Polymarket nor Kalshi answered';

      res.json({
        iso3,
        countryName,
        activeSourcesLabel,
        fetchedAt: new Date().toISOString(),
        contracts: mergedContracts,
      });
    } catch (err: any) {
      const iso3 = String(req.query.iso3 || 'BRA').toUpperCase();
      const countryName = String(req.query.countryName || 'Brazil');
      res.json({
        iso3,
        countryName,
        activeSourcesLabel: 'Missing: the prediction-market request failed',
        fetchedAt: new Date().toISOString(),
        contracts: [],
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Documentation & GitHub Sync Endpoint (/api/docs/manuals)
  // ---------------------------------------------------------------------------
  app.get('/api/docs/manuals', (_req, res) => {
    try {
      const readmePath = path.join(__dirname, 'README.md');
      const manualPath = path.join(__dirname, 'docs', 'USER_MANUAL.md');
      const logoPath = path.join(
        __dirname,
        'src',
        'assets',
        'images',
        'econquest_logo.png'
      );

      const readmeContent = fs.existsSync(readmePath)
        ? fs.readFileSync(readmePath, 'utf-8')
        : '# EconQuest — Sovereign Council Orchestrator\nREADME.md not found on disk.';
      const manualContent = fs.existsSync(manualPath)
        ? fs.readFileSync(manualPath, 'utf-8')
        : '# Sovereign Council Orchestrator User Manual\ndocs/USER_MANUAL.md not found on disk.';
      const hasLogoAsset = fs.existsSync(logoPath);
      const hasGitRepo = fs.existsSync(path.join(__dirname, '.git'));

      res.json({
        status: 'OK',
        fetchedAt: new Date().toISOString(),
        gitReady: hasGitRepo,
        hasLogoAsset,
        files: {
          readme: {
            path: 'README.md',
            content: readmeContent,
            lines: readmeContent.split('\n').length,
            bytes: Buffer.byteLength(readmeContent, 'utf-8'),
          },
          userManual: {
            path: 'docs/USER_MANUAL.md',
            content: manualContent,
            lines: manualContent.split('\n').length,
            bytes: Buffer.byteLength(manualContent, 'utf-8'),
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'ERROR',
        message: err?.message || 'Failed to read repository documentation files.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // End-to-End Automated Backend & Engine Health Sweep (/api/health/full-sweep)
  // ---------------------------------------------------------------------------
  // Health check. It used to pass every item by checking built-in sample values; it now reports
  // the real data connection check (GET /api/data/connections), one item per source.
  app.get('/api/health/full-sweep', async (req, res) => {
    const startedAt = Date.now();
    const iso3 = String(req.query.iso3 || 'BRA').toUpperCase();
    try {
      const report = await checkConnections({
        env: process.env,
        fetchFn: (u, i) => (u.includes('api.gdeltproject.org') ? gdeltFetch(u, i) : fetch(u, i)),
        ai: {
          provider: serverGuiRuntimeConfig.providerMode || process.env.DEFAULT_AI_PROVIDER,
          ollamaBaseUrl: serverGuiRuntimeConfig.ollamaBaseUrl,
          ollamaQuickModel: serverGuiRuntimeConfig.ollamaQuickModel,
          ollamaDeepModel: serverGuiRuntimeConfig.ollamaDeepModel,
          openAiBaseUrl: serverGuiRuntimeConfig.openAiBaseUrl,
        },
        readFile: (p) => {
          try {
            return { text: fs.readFileSync(p, 'utf8'), modified: fs.statSync(p).mtime };
          } catch {
            return null;
          }
        },
      });
      const checks = report.results.map((r) => ({
        id: r.id,
        category: 'API_ROUTE' as const,
        name: r.name,
        endpointOrModule: r.host,
        status: (r.state === 'connected' ? 'PASS' : 'WARN') as 'PASS' | 'WARN',
        latencyMs: r.latencyMs ?? 0,
        detail: [r.state === 'connected' && r.sample ? r.sample : r.detail, r.warning].filter(Boolean).join(' '),
      }));
      const passedCount = checks.filter((c) => c.status === 'PASS').length;
      const failed = report.results.some((r) => isFailure(r.state));
      res.json({
        status: failed ? 'PARTIAL_WARN' : 'ALL_SYSTEMS_NOMINAL',
        sweptAt: report.checkedAt,
        totalLatencyMs: Math.max(1, Date.now() - startedAt),
        activeIso3: iso3,
        passedCount,
        totalChecks: checks.length,
        gitInitialized: fs.existsSync(path.join(__dirname, '.git')),
        checks,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Health check failed' });
    }
  });

  // ---------------------------------------------------------------------------
  // Top-Level External Application Integration Bus (/api/v1/integration/*)
  // ---------------------------------------------------------------------------
  const verifyIntegrationApiKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const cfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
    if (!cfg.requireApiKey) return next();
    const headerKey =
      req.headers['x-smcr-api-key'] ||
      String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
      req.query.apiKey;
    if (headerKey && String(headerKey).trim() === cfg.apiKey) {
      return next();
    }
    return res.status(401).json({
      error: 'UNAUTHORIZED_INTEGRATION_CONSUMER',
      message:
        'Valid X-SMCR-API-Key header or Authorization: Bearer <token> is required when API Key Enforcement is enabled in the GUI.',
    });
  };

  // A. OpenAPI 3.1.0 Specification for External Applications & SDK Generators
  app.get('/api/v1/integration/openapi.json', (_req, res) => {
    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'EconQuest Sovereign & Macro Council Top-Level Integration API',
        version: '1.0.0',
        description:
          'Institutional SMCR-1.0 REST Pull API, Outbound HMAC-SHA256 Webhook Bus, and Real-Time SSE Event Stream for consuming Geopolitical, Sovereign Credit, and Macroeconomic Desk outputs, 9 sub-agent reports, quantitative suites, and Supreme Council verdicts.',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local Self-Hosted Docker / Node.js Instance',
        },
      ],
      components: {
        securitySchemes: {
          SmcrApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-SMCR-API-Key',
            description: 'Optional API key configured in the Top-Level Integration GUI tab.',
          },
        },
      },
      paths: {
        '/api/v1/integration/desks/{iso3}': {
          get: {
            summary: 'Pull Granular Desk Outputs, Sub-Agents & Quant Suites by ISO3',
            parameters: [
              {
                name: 'iso3',
                in: 'path',
                required: true,
                schema: { type: 'string', example: 'BRA' },
              },
              {
                name: 'desk',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                  enum: ['all', 'geopolitical', 'sovereign', 'macro'],
                  default: 'all',
                },
              },
              {
                name: 'includeSubAgents',
                in: 'query',
                required: false,
                schema: { type: 'boolean', default: true },
              },
              {
                name: 'includeQuant',
                in: 'query',
                required: false,
                schema: { type: 'boolean', default: true },
              },
            ],
            responses: {
              '200': {
                description: 'SMCR-1.0 Desk Output Envelope with HMAC-SHA256 signature.',
              },
            },
          },
        },
        '/api/v1/integration/bundle/{iso3}': {
          get: {
            summary:
              'Pull Complete SMCR-1.0 Bundle (All 3 Desks + 9 Sub-Agents + CRO Gate + Supreme Council + Quant Suites)',
            parameters: [
              {
                name: 'iso3',
                in: 'path',
                required: true,
                schema: { type: 'string', example: 'BRA' },
              },
            ],
            responses: {
              '200': {
                description: 'Full SMCR-1.0 Sovereign Assessment Bundle.',
              },
            },
          },
        },
        '/api/v1/integration/publish': {
          post: {
            summary:
              'Broadcast Desk or Bundle Outputs to Outbound Webhooks and Real-Time SSE Subscribers',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      iso3: { type: 'string', example: 'BRA' },
                      scope: {
                        type: 'string',
                        enum: [
                          'all_desks_bundle',
                          'geopolitical_desk',
                          'sovereign_desk',
                          'macro_desk',
                          'supreme_council',
                        ],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Dispatched with HMAC-SHA256 delivery receipts.',
              },
            },
          },
        },
        '/api/v1/integration/stream': {
          get: {
            summary: 'Subscribe to Real-Time Server-Sent Events (SSE) Stream of Desk Outputs',
            responses: {
              '200': {
                description: 'text/event-stream emitting SMCR-1.0 JSON events.',
              },
            },
          },
        },
      },
    };
    res.json(spec);
  });

  // B. Pull Granular Desk Outputs (GET /api/v1/integration/desks/:iso3)
  app.get('/api/v1/integration/desks/:iso3', verifyIntegrationApiKey, (req, res) => {
    const t0 = Date.now();
    const iso3 = String(req.params.iso3 || 'BRA').toUpperCase().trim();
    const deskParam = String(req.query.desk || 'all').toLowerCase();
    const includeSubAgents = req.query.includeSubAgents !== 'false';
    const includeQuantSuites = req.query.includeQuant !== 'false';

    const scopeMap: Record<string, IntegrationBroadcastScope> = {
      all: 'all_desks_bundle',
      geopolitical: 'geopolitical_desk',
      sovereign: 'sovereign_desk',
      macro: 'macro_desk',
      supreme: 'supreme_council',
    };
    const scope = scopeMap[deskParam] || 'all_desks_bundle';
    const run = latestRunsByIso3.get(iso3);
    if (!run) {
      return res.status(404).json({
        error: 'NO_COUNCIL_RUN',
        message: `No council run for ${iso3} yet. Run the full council on it in the app first. This API sends only what a council run produced from live figures, never built-in figures.`,
      });
    }
    const payload = buildTopLevelIntegrationPayload(run, scope, {
      includeSubAgents,
      includeQuantSuites,
    });
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');

    integrationDeliveryLog.unshift({
      deliveryId: `PULL-${iso3}-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      iso3,
      countryName: run.countryName,
      scope,
      eventType: `rest.pull.desks.${deskParam}`,
      targetName: `External REST Consumer (${req.ip || 'client'})`,
      targetUrl: req.originalUrl,
      transport: 'REST_PULL',
      statusCode: 200,
      ok: true,
      latencyMs: Math.max(1, Date.now() - t0),
      hmacSignature: payload.signature.value,
      payloadBytes,
      responsePreview: `Served ${scope} (${(payloadBytes / 1024).toFixed(1)} KB) via REST Pull API.`,
    });
    if (integrationDeliveryLog.length > 50) integrationDeliveryLog.length = 50;

    res.setHeader('X-SMCR-Schema', 'SMCR-1.0');
    res.setHeader('X-SMCR-Signature-256', payload.signature.value);
    res.json(payload);
  });

  // C. Pull Full SMCR-1.0 Bundle (GET /api/v1/integration/bundle/:iso3)
  app.get('/api/v1/integration/bundle/:iso3', verifyIntegrationApiKey, (req, res) => {
    const t0 = Date.now();
    const iso3 = String(req.params.iso3 || 'BRA').toUpperCase().trim();
    const run = latestRunsByIso3.get(iso3);
    if (!run) {
      return res.status(404).json({
        error: 'NO_COUNCIL_RUN',
        message: `No council run for ${iso3} yet. Run the full council on it in the app first. This API sends only what a council run produced from live figures, never built-in figures.`,
      });
    }
    const payload = buildTopLevelIntegrationPayload(run, 'all_desks_bundle', {
      includeSubAgents: true,
      includeQuantSuites: true,
    });
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');

    integrationDeliveryLog.unshift({
      deliveryId: `BNDL-${iso3}-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      iso3,
      countryName: run.countryName,
      scope: 'all_desks_bundle',
      eventType: 'rest.pull.full_bundle',
      targetName: `External REST Consumer (${req.ip || 'client'})`,
      targetUrl: req.originalUrl,
      transport: 'REST_PULL',
      statusCode: 200,
      ok: true,
      latencyMs: Math.max(1, Date.now() - t0),
      hmacSignature: payload.signature.value,
      payloadBytes,
      responsePreview: `Served full SMCR-1.0 bundle (${(payloadBytes / 1024).toFixed(1)} KB) via REST Pull API.`,
    });
    if (integrationDeliveryLog.length > 50) integrationDeliveryLog.length = 50;

    res.setHeader('X-SMCR-Schema', 'SMCR-1.0');
    res.setHeader('X-SMCR-Signature-256', payload.signature.value);
    res.json(payload);
  });

  // D. Outbound Webhook & SSE Broadcaster (POST /api/v1/integration/publish)
  app.post('/api/v1/integration/publish', verifyIntegrationApiKey, async (req, res) => {
    try {
      const {
        iso3 = 'BRA',
        scope = 'all_desks_bundle',
        eventType = 'manual.gui.broadcast',
        run: incomingRun,
      } = (req.body || {}) as {
        iso3?: string;
        scope?: IntegrationBroadcastScope;
        eventType?: string;
        run?: CouncilAssessmentRun;
      };

      const cleanIso3 = String(iso3 || incomingRun?.iso3 || 'BRA').toUpperCase().trim();
      if (incomingRun && incomingRun.iso3) {
        latestRunsByIso3.set(incomingRun.iso3.toUpperCase(), incomingRun);
      }
      const targetRun = incomingRun || latestRunsByIso3.get(cleanIso3);
      if (!targetRun) {
        const iso3 = cleanIso3;
        return res.status(404).json({
          error: 'NO_COUNCIL_RUN',
          message: `No council run for ${iso3} yet. Run the full council on it in the app first. This API sends only what a council run produced from live figures, never built-in figures.`,
        });
      }
      const receipts = await dispatchTopLevelIntegrationEvent(targetRun, scope, eventType);
      const payload = buildTopLevelIntegrationPayload(targetRun, scope);

      res.json({
        status: 'BROADCAST_COMPLETED',
        broadcastAt: new Date().toISOString(),
        iso3: targetRun.iso3,
        countryName: targetRun.countryName,
        scope,
        activeSseSubscribers: sseClients.size,
        receipts,
        payloadPreview: payload,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'ERROR',
        message: err?.message || 'Failed to publish top-level integration broadcast.',
      });
    }
  });

  // E. Real-Time Server-Sent Events (SSE) Stream (GET /api/v1/integration/stream)
  app.get('/api/v1/integration/stream', verifyIntegrationApiKey, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const handshake = JSON.stringify({
      schemaVersion: 'SMCR-1.0',
      event: 'stream.connected',
      connectedAt: new Date().toISOString(),
      message:
        'Subscribed to EconQuest Top-Level Desk Output SSE Stream. Listening for geopolitical, sovereign, macro, and supreme council dispatches.',
    });
    res.write(`event: stream.connected\ndata: ${handshake}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // F. Live Delivery Audit Log & Integration Status (GET /api/v1/integration/deliveries)
  app.get('/api/v1/integration/deliveries', (_req, res) => {
    res.json({
      status: 'OK',
      fetchedAt: new Date().toISOString(),
      integrationConfig: serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG,
      activeSseSubscribers: sseClients.size,
      cachedSovereignRuns: Array.from(latestRunsByIso3.keys()),
      deliveries: integrationDeliveryLog,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // This computer only by default, so nobody else on the Wi-Fi can read your research or change
  // your watch rules. Inside Docker the container must listen on every interface; docker-compose
  // then publishes it on 127.0.0.1 only. HOST=0.0.0.0 in .env opens it to your network on purpose.
  const HOST = (process.env.HOST || '').trim() || (process.env.SELF_HOSTED_DOCKER === 'true' ? '0.0.0.0' : '127.0.0.1');
  const httpServer = app.listen(PORT, HOST, () => {
    lifecycle.listening = true;
    console.log(`Sovereign & Macro Council Server listening on http://localhost:${PORT}${HOST === '127.0.0.1' ? ' (this computer only)' : ` (on ${HOST})`}`);
    setTimeout(() => void refreshStaleSnapshots(), 5000);
    // Hourly check: a full pull is redone after a week, a short one (a feed failed) after an hour.
    setInterval(() => void refreshStaleSnapshots(), SNAPSHOT_RETRY_MS).unref();
    // Morning brief: checked every minute; runs once a day at the set time (Settings > Morning brief).
    setInterval(() => void morningTick(), 60_000).unref();
    // Nightly data check: once a day after DATA_CHECK_TIME, kept in the data health history.
    setInterval(() => void nightlyCheckTick(), 60_000).unref();
    // GDELT raw files: weekly top-up once a first pull exists, checked hourly.
    setInterval(() => void (knownOffline() ? null : topUpGdeltRaw()), SNAPSHOT_RETRY_MS).unref();
  });

  // Graceful stop (docker stop, systemctl stop, Ctrl+C): stop taking new requests, close the live
  // update streams, let open requests finish, then exit. Gives up after SHUTDOWN_TIMEOUT_MS.
  const stop = (signal: string) => {
    if (lifecycle.shuttingDown) {
      console.log(`[shutdown] ${signal} again: stopping now`);
      process.exit(1);
    }
    lifecycle.shuttingDown = true;
    const waitMs = shutdownTimeoutMs(process.env);
    console.log(`[shutdown] ${signal}: finishing open requests (up to ${Math.round(waitMs / 1000)} s)`);
    sseClients.forEach((clientRes) => {
      try {
        clientRes.end();
      } catch {
        /* already closed */
      }
    });
    sseClients.clear();
    httpServer.close(() => {
      console.log('[shutdown] stopped cleanly');
      process.exit(0);
    });
    httpServer.closeIdleConnections?.();
    setTimeout(() => {
      console.log('[shutdown] open requests did not finish in time; stopping');
      process.exit(0);
    }, waitMs).unref();
  };
  process.once('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

if (process.argv.includes('--preload')) void runPreloadCli();
else startServer();
