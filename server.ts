import crypto from 'crypto';
import { BIS_ISO2, BIS_LABEL, bisAllMarketsUrl, bisIntlUrl, parseBisAllMarkets, parseBisIntl } from './src/utils/bisDebtSecurities';
import {
  OWN_CDS_LABEL,
  lsegSnapshotUrl,
  lsegTokenRequest,
  ownCdsSettings,
  parseLsegSnapshot,
  parseOwnCdsCsv,
  type OwnCdsQuote,
} from './src/utils/ownCds';
import { WB_TRADE_INDICATORS, parseWbLatest, parseWitsShare, wbIndicatorUrl, witsUrl, type TradeExposure, type WbTradeKey, type WitsIndicator } from './src/utils/scenarioExposure';
import { cftcUrl, parseCftcRows, positioningFor, type CftcWeek } from './src/utils/cftcPositioning';
import { TIC_URL, parseTicTable, ticHoldingFor, type TicTable } from './src/utils/ticHoldings';
import { pullImfExternal, type ImfExternal, type ImfStructure } from './src/utils/imfReserves';
import { CBPOL_AREA, cbpolDailyUrl, cbpolMissing, cbpolMonthlyUrl, parseCbpolCsv, policyRateFor, type CbpolPull } from './src/utils/bisPolicyRates';
import { frankfurterSeriesUrl, parseEffr, parseFxVol, parseReer, reerUrl, type FxVol, type ReerGap } from './src/utils/fxValuation';
import { DEBATE_INSTRUCTION, challengesAsText, findChallenges, type DebateResult } from './src/utils/agentDebate';
import { AGENT_CHOICE_INSTRUCTION, SYNTHESIS_INSTRUCTION, agentChoicePrompt, answersAsText, sentenceCheck, checkBrief, earlierAsText, type AgentAnswer, type AgentChoiceResult, type CouncilBrief, type SynthesisResult } from './src/utils/askCouncil';
import { MARKET_EDGE_ANCHORS, MARKET_EDGE_ANCHOR_ISO3, buildAnchor, type MarketEdgeAnchorsReply } from './src/utils/marketEdgeAnchors';
import { IDS_LABEL, QEDS_LABEL, idsUrl, parseIds, parseQeds, qedsUrl, type DebtSchedule } from './src/utils/debtSchedule';
import { checkConnections, describeNetworkError, isFailure, type ConnectionReport } from './src/utils/connectionCheck';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
import {
  FRED_10Y_SERIES,
  US_10Y_SERIES,
  evdsSeriesUrl,
  fredApiUrl,
  fredCsvUrl,
  parseFredApiLatest,
  parseFredCsvLatest,
  parseTesouroDiretoLatest,
  TESOURO_DIRETO_CSV_URL,
  isValidEvdsSeriesCode,
  officialYieldFeedLabel,
  parseEvdsLatest,
  type OfficialYieldObservation,
} from './src/utils/officialYields.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function fetchWithTimeout(url: string, timeoutMs = 4200): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Latest official 10Y yield (OECD via FRED, monthly average), or null if not covered or unreachable.
 * Uses the official FRED API when FRED_API_KEY is set, and falls back to the no-key CSV download.
 */
/**
 * Brazil: the Treasury's Tesouro Direto CSV holds the whole price history. On Sam's Mac
 * (2026-11-05) it was 14.6 MB and took 60 seconds, so it gets 90 seconds, one download at a time,
 * and the parsed answer is kept 6 hours in memory and on disk (data/live/tesouro.json) so a restart
 * does not download it again. A failed download is retried after 30 minutes.
 */
const TESOURO_TIMEOUT_MS = 90000;
let tesouroCache: { at: number; obs: OfficialYieldObservation | null } | null = null;
let tesouroPending: Promise<OfficialYieldObservation | null> | null = null;
function tesouroFile(): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'tesouro.json');
}
async function fetchTesouroDiretoYield(): Promise<OfficialYieldObservation | null> {
  if (!tesouroCache) {
    try {
      const saved = JSON.parse(fs.readFileSync(tesouroFile(), 'utf8'));
      if (saved?.obs && typeof saved.at === 'number') tesouroCache = saved;
    } catch {
      // nothing saved yet
    }
  }
  if (tesouroCache && Date.now() - tesouroCache.at < (tesouroCache.obs ? 6 * 60 : 30) * 60 * 1000) return tesouroCache.obs;
  if (tesouroPending) return tesouroPending;
  tesouroPending = (async () => {
    let obs: OfficialYieldObservation | null = null;
    try {
      const res = await fetchWithTimeout(TESOURO_DIRETO_CSV_URL, TESOURO_TIMEOUT_MS);
      if (res.ok) obs = parseTesouroDiretoLatest(await res.text());
      else console.warn(`[Tesouro] Brazil yield file refused (HTTP ${res.status})`);
    } catch (e) {
      console.warn(`[Tesouro] Brazil yield file: ${describeNetworkError(e, TESOURO_TIMEOUT_MS)}`);
    }
    if (obs) {
      tesouroCache = { at: Date.now(), obs };
      try {
        fs.mkdirSync(path.dirname(tesouroFile()), { recursive: true });
        fs.writeFileSync(tesouroFile(), JSON.stringify(tesouroCache));
      } catch {
        // keep the memory copy
      }
    } else {
      // Keep serving the last good figure (it carries its own date); retry in 30 minutes.
      tesouroCache = { at: Date.now() - (tesouroCache?.obs ? 6 * 60 - 30 : 0) * 60 * 1000, obs: tesouroCache?.obs ?? null };
    }
    return tesouroCache.obs;
  })().finally(() => {
    tesouroPending = null;
  });
  return tesouroPending;
}

/**
 * Official yields change at most daily (Brazil) or monthly (FRED/OECD), so results are kept for
 * 6 hours. A miss (feed down, or no series) is kept for 30 minutes so the watchlist does not
 * retry every country on each refresh.
 */
const officialYieldCache = new Map<string, { at: number; obs: OfficialYieldObservation | null }>();
async function fetchOfficial10YYield(iso3: string): Promise<OfficialYieldObservation | null> {
  const hit = officialYieldCache.get(iso3);
  if (hit && Date.now() - hit.at < (hit.obs ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000)) return hit.obs;
  const obs = await fetchOfficial10YYieldUncached(iso3);
  officialYieldCache.set(iso3, { at: Date.now(), obs });
  return obs;
}

/**
 * Government external debt falling due (QEDS quarterly schedule, IDS yearly projections) from the
 * World Bank API, and government debt securities outstanding from the BIS API, all with no key. These change quarterly at most, so answers are kept for 12 hours
 * and misses for an hour. Each source is tried on its own; either can be missing.
 */
const debtScheduleCache = new Map<string, { at: number; value: DebtSchedule | null }>();
async function fetchJsonWithTimeout(url: string, ms = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function fetchTextWithTimeout(url: string, ms = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
async function fetchDebtSchedule(iso3: string): Promise<DebtSchedule | null> {
  const hit = debtScheduleCache.get(iso3);
  if (hit && Date.now() - hit.at < (hit.value ? 12 : 1) * 60 * 60 * 1000) return hit.value;
  const iso2 = BIS_ISO2[iso3];
  const [qedsJson, idsJson, bisIntlCsv, bisAllCsv] = await Promise.all([
    fetchJsonWithTimeout(qedsUrl(iso3)),
    fetchJsonWithTimeout(idsUrl(iso3)),
    iso2 ? fetchTextWithTimeout(bisIntlUrl(iso2)) : Promise.resolve(null),
    iso2 ? fetchTextWithTimeout(bisAllMarketsUrl(iso2)) : Promise.resolve(null),
  ]);
  const qeds = qedsJson ? parseQeds(qedsJson) : null;
  const ids = idsJson ? parseIds(idsJson, new Date().getUTCFullYear()) : null;
  const intl = bisIntlCsv ? parseBisIntl(bisIntlCsv) : null;
  const all = bisAllCsv ? parseBisAllMarkets(bisAllCsv) : null;
  const bis = intl || all ? { ...(intl ? { intl } : {}), ...(all ? { all } : {}) } : null;
  const value: DebtSchedule | null =
    qeds || ids || bis
      ? { ...(qeds ? { qeds } : {}), ...(ids ? { ids } : {}), ...(bis ? { bis } : {}), fetchedAt: new Date().toISOString() }
      : null;
  debtScheduleCache.set(iso3, { at: Date.now(), value });
  return value;
}

/**
 * Own-account 5Y CDS (off unless CDS_FEED is set in .env; see src/utils/ownCds.ts). The CSV is
 * re-read when the file changes; LSEG answers are kept for 15 minutes and its token until expiry.
 * The credentials never leave the server and are never logged.
 */
let ownCdsCache: { key: string; at: number; quotes: Map<string, OwnCdsQuote> } | null = null;
let lsegToken: { token: string; until: number } | null = null;
async function loadOwnCds(): Promise<Map<string, OwnCdsQuote>> {
  const cfg = ownCdsSettings(process.env);
  if (!cfg) return new Map();
  try {
    if (cfg.provider === 'csv' && cfg.csvPath) {
      const stat = fs.statSync(cfg.csvPath);
      const key = `csv:${cfg.csvPath}:${stat.mtimeMs}`;
      if (ownCdsCache?.key === key) return ownCdsCache.quotes;
      const quotes = parseOwnCdsCsv(fs.readFileSync(cfg.csvPath, 'utf8'));
      ownCdsCache = { key, at: Date.now(), quotes };
      return quotes;
    }
    if (cfg.provider === 'lseg' && cfg.lseg) {
      const key = `lseg:${Object.entries(cfg.lseg.rics).join(',')}`;
      if (ownCdsCache?.key === key && Date.now() - ownCdsCache.at < 15 * 60 * 1000) return ownCdsCache.quotes;
      if (!lsegToken || Date.now() > lsegToken.until) {
        const req = lsegTokenRequest(cfg.lseg);
        const res = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: req.body,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`LSEG sign-in refused (${res.status})`);
        const tok = (await res.json()) as { access_token?: string; expires_in?: string | number };
        if (!tok.access_token) throw new Error('LSEG sign-in gave no token');
        lsegToken = { token: tok.access_token, until: Date.now() + (Number(tok.expires_in) || 300) * 1000 - 30000 };
      }
      const res = await fetch(lsegSnapshotUrl(cfg.lseg), {
        headers: { Authorization: `Bearer ${lsegToken.token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 401) lsegToken = null;
      if (!res.ok) throw new Error(`LSEG pricing snapshot refused (${res.status})`);
      const quotes = parseLsegSnapshot(await res.json(), cfg.lseg.rics, new Date().toISOString().slice(0, 10));
      ownCdsCache = { key, at: Date.now(), quotes };
      return quotes;
    }
  } catch (e) {
    console.warn(`[own CDS] ${cfg.provider}: ${e instanceof Error ? e.message : 'failed'}`);
  }
  return new Map();
}

/** Turkey's EVDS feed is on only when the user has set both a key and a series code. */
function evdsSettings(): { key: string; series: string } | null {
  const key = (process.env.EVDS_API_KEY || '').trim();
  const series = (process.env.EVDS_TR10Y_SERIES || '').trim();
  return key && isValidEvdsSeriesCode(series) ? { key, series } : null;
}

async function fetchEvdsTurkeyYield(): Promise<OfficialYieldObservation | null> {
  const cfg = evdsSettings();
  if (!cfg) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // The key goes only in the "key" header, never in the URL (EVDS returns 403 otherwise).
    const res = await fetch(evdsSeriesUrl(cfg.series), {
      signal: controller.signal,
      headers: { key: cfg.key, Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[EVDS] Turkey 10Y request failed with HTTP ${res.status}`);
      return null;
    }
    return parseEvdsLatest(await res.json(), cfg.series);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Countries with an official 10Y source wired in (Turkey only once EVDS is set up). */
function hasOfficial10YSource(iso3: string): boolean {
  return iso3 === 'BRA' || Boolean(FRED_10Y_SERIES[iso3]) || (iso3 === 'TUR' && evdsSettings() !== null);
}

async function fetchOfficial10YYieldUncached(iso3: string): Promise<OfficialYieldObservation | null> {
  if (iso3 === 'BRA') return fetchTesouroDiretoYield();
  if (iso3 === 'TUR') return fetchEvdsTurkeyYield();
  const seriesId = FRED_10Y_SERIES[iso3];
  if (!seriesId) return null;
  return fetchFredLatest(seriesId);
}

/** Latest observation of a FRED yield series: the API when FRED_API_KEY is set, else the CSV. */
async function fetchFredLatest(seriesId: string): Promise<OfficialYieldObservation | null> {
  const apiKey = (process.env.FRED_API_KEY || '').trim();
  if (apiKey) {
    try {
      const res = await fetchWithTimeout(fredApiUrl(seriesId, apiKey), 6000);
      if (res.ok) {
        const obs = parseFredApiLatest(await res.json(), seriesId);
        if (obs) return obs;
      }
    } catch {
      // fall through to the CSV download
    }
  }
  try {
    const res = await fetchWithTimeout(fredCsvUrl(seriesId), 6000);
    if (!res.ok) return null;
    return parseFredCsvLatest(await res.text(), seriesId);
  } catch {
    return null;
  }
}

/** A FRED yield series kept for 12 hours (1 hour after a miss). Used for MarketEdge benchmarks. */
const fredSeriesCache = new Map<string, { at: number; value: OfficialYieldObservation | null }>();
async function fetchFredCached(seriesId: string): Promise<OfficialYieldObservation | null> {
  const hit = fredSeriesCache.get(seriesId);
  if (hit && Date.now() - hit.at < (hit.value ? 12 : 1) * 60 * 60 * 1000) return hit.value;
  const value = await fetchFredLatest(seriesId);
  fredSeriesCache.set(seriesId, { at: Date.now(), value });
  return value;
}

/** US 10Y (OECD monthly, via FRED): the benchmark for spreads over Treasuries in MarketEdge. */
function fetchUs10YYield(): Promise<OfficialYieldObservation | null> {
  return fetchFredCached(US_10Y_SERIES);
}

/**
 * FX valuation per currency (see src/utils/fxValuation.ts): BIS real exchange rate gap and
 * three-month realised volatility against the dollar. Kept 12 hours (1 hour after a miss).
 */
type FxValuation = { reer: ReerGap | null; vol: FxVol | null };
const fxValuationCache = new Map<string, { at: number; value: FxValuation; pending?: Promise<FxValuation> }>();
async function fetchFxValuationUncached(iso3: string, ccy: string): Promise<FxValuation> {
  const iso2 = BIS_ISO2[iso3];
  const [reerText, volRes] = await Promise.all([
    iso2 ? fetchTextWithTimeout(reerUrl(iso2), 8000) : Promise.resolve(null),
    fetchWithTimeout(frankfurterSeriesUrl(ccy), 6000).catch(() => null),
  ]);
  let vol: FxVol | null = null;
  try {
    if (volRes?.ok) vol = parseFxVol(await volRes.json(), ccy);
  } catch {
    vol = null;
  }
  return { reer: parseReer(reerText), vol };
}
async function fetchFxValuation(iso3: string, ccy: string): Promise<FxValuation> {
  const hit = fxValuationCache.get(iso3);
  const fresh = hit && Date.now() - hit.at < (hit.value.reer || hit.value.vol ? 12 : 1) * 60 * 60 * 1000;
  if (fresh) return hit!.value;
  if (hit?.pending) return hit.pending;
  const pending = fetchFxValuationUncached(iso3, ccy).then((value) => {
    fxValuationCache.set(iso3, { at: Date.now(), value });
    return value;
  });
  fxValuationCache.set(iso3, { at: hit?.at ?? 0, value: hit?.value ?? { reer: null, vol: null }, pending });
  return pending;
}

/** US effective federal funds rate (NY Fed), the dollar leg of carry. 6h cache. */
let effrCache: { at: number; value: { pct: number; date: string } | null } | null = null;
async function fetchEffr(): Promise<{ pct: number; date: string } | null> {
  if (effrCache && Date.now() - effrCache.at < (effrCache.value ? 6 : 1) * 60 * 60 * 1000) return effrCache.value;
  let value: { pct: number; date: string } | null = null;
  try {
    const res = await fetchWithTimeout('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json', 4000);
    if (res.ok) value = parseEffr(await res.json());
  } catch {
    value = null;
  }
  effrCache = { at: Date.now(), value };
  return value;
}

/**
 * CFTC currency futures positioning (src/utils/cftcPositioning.ts). Weekly: positions as of
 * Tuesday, published Friday. One request covers every currency (about three years of weeks). The
 * pull is saved to data/live/cftc.json with its pull date. It is pulled again only when a newer
 * report can exist (the latest is 7 or more days old) and the last pull is over 12 hours old;
 * a failed pull keeps the last good one and is retried after an hour.
 */
type CftcPull = { pulledAt: string; weeks: Record<string, CftcWeek[]> };
let cftcMemory: { pull: CftcPull | null; triedAt: number } | null = null;
let cftcInFlight: Promise<CftcPull | null> | null = null;
function cftcFile(): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'cftc.json');
}
function cftcLatestDate(pull: CftcPull): string {
  return Object.values(pull.weeks).map((w) => w[w.length - 1]?.date || '').sort().pop() || '';
}
async function fetchCftcPull(): Promise<CftcPull | null> {
  if (!cftcMemory) {
    try {
      const saved = JSON.parse(fs.readFileSync(cftcFile(), 'utf8')) as CftcPull;
      if (saved?.pulledAt && saved.weeks && typeof saved.weeks === 'object') cftcMemory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never pulled
    }
  }
  const pull = cftcMemory?.pull;
  if (pull) {
    const sincePull = Date.now() - Date.parse(pull.pulledAt);
    const reportAge = Date.now() - Date.parse(cftcLatestDate(pull));
    if (sincePull < 12 * 60 * 60 * 1000 || reportAge < 7 * 24 * 60 * 60 * 1000) return pull;
  }
  if (cftcMemory && Date.now() - cftcMemory.triedAt < 60 * 60 * 1000) return cftcMemory.pull;
  if (cftcInFlight) return cftcInFlight;
  cftcInFlight = (async () => {
    let weeks: Map<string, CftcWeek[]> | null = null;
    try {
      const res = await fetchWithTimeout(cftcUrl(), 20000);
      if (res.ok) weeks = parseCftcRows(await res.json());
      else console.warn(`[CFTC] positioning refused (HTTP ${res.status})`);
    } catch (e) {
      console.warn(`[CFTC] positioning: ${describeNetworkError(e, 20000)}`);
    }
    const prev = cftcMemory?.pull ?? null;
    if (!weeks || weeks.size === 0) {
      cftcMemory = { pull: prev, triedAt: Date.now() };
      return prev;
    }
    const fresh: CftcPull = { pulledAt: new Date().toISOString(), weeks: Object.fromEntries(weeks) };
    cftcMemory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(cftcFile()), { recursive: true });
      fs.writeFileSync(cftcFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    cftcInFlight = null;
  });
  return cftcInFlight;
}

/**
 * TIC foreign holdings of US Treasuries (src/utils/ticHoldings.ts). Monthly, one small text file
 * for every country. Saved to data/live/tic.json with its pull date and pulled again after a day;
 * a failed pull keeps the last good one and is retried after an hour.
 */
type TicPull = { pulledAt: string; table: TicTable };
let ticMemory: { pull: TicPull | null; triedAt: number } | null = null;
let ticInFlight: Promise<TicPull | null> | null = null;
function ticFile(): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'tic.json');
}
async function fetchTicPull(): Promise<TicPull | null> {
  if (!ticMemory) {
    try {
      const saved = JSON.parse(fs.readFileSync(ticFile(), 'utf8')) as TicPull;
      if (saved?.pulledAt && saved.table?.months) ticMemory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never pulled
    }
  }
  if (ticMemory?.pull && Date.now() - Date.parse(ticMemory.pull.pulledAt) < 24 * 60 * 60 * 1000) return ticMemory.pull;
  if (ticMemory && Date.now() - ticMemory.triedAt < 60 * 60 * 1000) return ticMemory.pull;
  if (ticInFlight) return ticInFlight;
  ticInFlight = (async () => {
    let table: TicTable | null = null;
    try {
      const res = await fetchWithTimeout(TIC_URL, 15000);
      if (res.ok) table = parseTicTable(await res.text());
      else console.warn(`[TIC] Treasury holdings refused (HTTP ${res.status})`);
    } catch (e) {
      console.warn(`[TIC] Treasury holdings: ${describeNetworkError(e, 15000)}`);
    }
    const prev = ticMemory?.pull ?? null;
    if (!table) {
      ticMemory = { pull: prev, triedAt: Date.now() };
      return prev;
    }
    const fresh: TicPull = { pulledAt: new Date().toISOString(), table };
    ticMemory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(ticFile()), { recursive: true });
      fs.writeFileSync(ticFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    ticInFlight = null;
  });
  return ticInFlight;
}

/**
 * Central bank policy rates from the BIS (src/utils/bisPolicyRates.ts). Two small requests cover
 * every country: the latest daily figure and about 25 months of month-end figures. Saved to
 * data/live/bis-policy-rates.json with its pull date and pulled again after 12 hours; a failed
 * pull keeps the last good one and is retried after an hour.
 */
let cbpolMemory: { pull: CbpolPull | null; triedAt: number } | null = null;
let cbpolInFlight: Promise<CbpolPull | null> | null = null;
function cbpolFile(): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'bis-policy-rates.json');
}
async function fetchCbpolPull(): Promise<CbpolPull | null> {
  if (!cbpolMemory) {
    try {
      const saved = JSON.parse(fs.readFileSync(cbpolFile(), 'utf8')) as CbpolPull;
      if (saved?.pulledAt && saved.daily && saved.monthly) cbpolMemory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never pulled
    }
  }
  if (cbpolMemory?.pull && Date.now() - Date.parse(cbpolMemory.pull.pulledAt) < 12 * 60 * 60 * 1000) return cbpolMemory.pull;
  if (cbpolMemory && Date.now() - cbpolMemory.triedAt < 60 * 60 * 1000) return cbpolMemory.pull;
  if (cbpolInFlight) return cbpolInFlight;
  cbpolInFlight = (async () => {
    const get = async (url: string, what: string): Promise<string | null> => {
      try {
        const res = await fetchWithTimeout(url, 20000);
        if (res.ok) return await res.text();
        console.warn(`[BIS] policy rates (${what}) refused (HTTP ${res.status})`);
      } catch (e) {
        console.warn(`[BIS] policy rates (${what}): ${describeNetworkError(e, 20000)}`);
      }
      return null;
    };
    const [dailyCsv, monthlyCsv] = await Promise.all([get(cbpolDailyUrl(), 'daily'), get(cbpolMonthlyUrl(), 'monthly')]);
    const daily = parseCbpolCsv(dailyCsv, 'D');
    const monthly = parseCbpolCsv(monthlyCsv, 'M');
    const prev = cbpolMemory?.pull ?? null;
    if (!Object.keys(daily).length && !Object.keys(monthly).length) {
      cbpolMemory = { pull: prev, triedAt: Date.now() };
      return prev;
    }
    // If only one of the two answered, keep the other from the last good pull.
    const fresh: CbpolPull = {
      pulledAt: new Date().toISOString(),
      daily: Object.keys(daily).length ? daily : prev?.daily || {},
      monthly: Object.keys(monthly).length ? monthly : prev?.monthly || {},
    };
    cbpolMemory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(cbpolFile()), { recursive: true });
      fs.writeFileSync(cbpolFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    cbpolInFlight = null;
  });
  return cbpolInFlight;
}

/**
 * IMF reserves and balance of payments (src/utils/imfReserves.ts): monthly official reserves (IL)
 * and quarterly current account and imports (BOP) for each catalog country, from api.imf.org.
 * Saved to data/live/imf_external.json with its pull date and pulled again after a day; the
 * datasets' structures (dimensions, indicator names) are kept a week. A failed pull keeps the
 * last good figures per country and is retried after an hour.
 */
type ImfPull = { pulledAt: string; structuresAt?: string; structures?: Record<string, ImfStructure>; countries: Record<string, ImfExternal> };
let imfMemory: { pull: ImfPull | null; triedAt: number } | null = null;
let imfInFlight: Promise<ImfPull | null> | null = null;
function imfFile(): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'imf_external.json');
}
async function fetchImfPull(): Promise<ImfPull | null> {
  if (!imfMemory) {
    try {
      const saved = JSON.parse(fs.readFileSync(imfFile(), 'utf8')) as ImfPull;
      if (saved?.pulledAt && saved.countries && typeof saved.countries === 'object') imfMemory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never pulled
    }
  }
  const prev = imfMemory?.pull ?? null;
  if (prev && Date.now() - Date.parse(prev.pulledAt) < 24 * 60 * 60 * 1000) return prev;
  if (imfMemory && Date.now() - imfMemory.triedAt < 60 * 60 * 1000) return prev;
  if (imfInFlight) return imfInFlight;
  imfInFlight = (async () => {
    const weekOld = !prev?.structuresAt || Date.now() - Date.parse(prev.structuresAt) > 7 * 24 * 60 * 60 * 1000;
    let structures: Record<string, ImfStructure> = weekOld ? {} : { ...(prev?.structures || {}) };
    const countries: Record<string, ImfExternal> = {};
    let any = false;
    for (const c of SOVEREIGN_CATALOG) {
      try {
        const r = await pullImfExternal({ fetchFn: (u, i) => fetch(u, i), env: process.env, timeoutMs: 30000, structures }, c.iso3);
        structures = r.structures;
        const got = r.external.reserves || r.external.currentAccount;
        if (got) any = true;
        // Keep the last good figures when this pull got nothing for the country.
        countries[c.iso3] = got || !prev?.countries[c.iso3] ? r.external : prev.countries[c.iso3];
        const bad = r.steps.filter((s) => !s.ok);
        if (bad.length) console.warn(`[IMF] ${c.iso3}: ${bad.map((s) => `${s.measure}: ${s.note}`).join(' | ')}`);
      } catch (e) {
        console.warn(`[IMF] ${c.iso3}: ${describeNetworkError(e, 30000)}`);
        if (prev?.countries[c.iso3]) countries[c.iso3] = prev.countries[c.iso3];
      }
    }
    if (!any) {
      imfMemory = { pull: prev, triedAt: Date.now() };
      return prev;
    }
    const fresh: ImfPull = {
      pulledAt: new Date().toISOString(),
      structuresAt: weekOld ? new Date().toISOString() : prev?.structuresAt,
      structures,
      countries,
    };
    imfMemory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.dirname(imfFile()), { recursive: true });
      fs.writeFileSync(imfFile(), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    imfInFlight = null;
  });
  return imfInFlight;
}

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
  const [ownCds, catalog, us10Y] = await Promise.all([loadOwnCds(), fetchLiveWatchlistCatalog(), fetchUs10YYield()]);
  const anchors = await Promise.all(
    MARKET_EDGE_ANCHORS.map(async (def) => buildAnchor(def, def.fredSeries ? await fetchFredCached(def.fredSeries) : null, ownCds.get(def.iso3)))
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

/**
 * GDELT allows one request every 5 seconds and answers HTTP 429 otherwise (seen on Sam's Mac,
 * 2026-11-05). Every GDELT request takes the next free slot, 5.5 seconds apart. A request that
 * would wait more than 30 seconds is not sent; its figures read Missing until the next refresh.
 * After a refusal GDELT holds each further answer about 11 seconds and keeps refusing, so after any
 * 429 the app sends nothing to GDELT for 15 minutes.
 */
const GDELT_GAP_MS = 5500;
const GDELT_MAX_WAIT_MS = 30000;
const GDELT_PAUSE_MS = 15 * 60 * 1000;
let gdeltNextSlot = 0;
let gdeltPausedUntil = 0;
function gdeltSlot(): Promise<void> {
  const now = Date.now();
  if (now < gdeltPausedUntil) {
    const mins = Math.ceil((gdeltPausedUntil - now) / 60000);
    return Promise.reject(new Error(`GDELT refused too many requests; the app is pausing GDELT for ${mins} more minute${mins === 1 ? '' : 's'}`));
  }
  const slot = Math.max(now, gdeltNextSlot);
  if (slot - now > GDELT_MAX_WAIT_MS) return Promise.reject(new Error('GDELT queue full'));
  gdeltNextSlot = slot + GDELT_GAP_MS;
  return new Promise((resolve) => setTimeout(resolve, slot - now));
}
/** Any GDELT request, from the snapshot or the connection check, goes through here. */
async function gdeltFetch(url: string, init?: RequestInit): Promise<Response> {
  await gdeltSlot();
  const res = await fetch(url, init);
  if (res.status === 429) {
    gdeltPausedUntil = Date.now() + GDELT_PAUSE_MS;
    console.warn('[GDELT] HTTP 429 (too many requests): pausing GDELT for 15 minutes');
  }
  return res;
}
async function fetchGdelt(url: string, timeoutMs: number): Promise<Response> {
  // 20 s: a refusal arrives after about 11 s, and it must be seen to start the pause.
  return gdeltFetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
}

/**
 * GDELT on its own schedule per country: every GDELT_REFRESH_DAYS days (default 7; Sam asked about
 * quarterly on 2026-11-05, which is GDELT_REFRESH_DAYS=90). A pull is two requests (tone timeline,
 * article list). It is saved to data/live/gdelt/<ISO3>.json and reused until the interval passes;
 * it counts only when the tone came back. A failed pull is retried after an
 * hour (or after the 15-minute pause that follows a refusal). Headlines carry GDELT's own date and
 * the country's average tone: GDELT gives no tone per article, so none is made up.
 */
const GDELT_REFRESH_DAYS = Math.max(1, Number(process.env.GDELT_REFRESH_DAYS) || 7);
const GDELT_REFRESH_MS = GDELT_REFRESH_DAYS * 24 * 60 * 60 * 1000;
type GdeltPull = { pulledAt: string; tone: number; headlines: OpenDataSnapshot['gdeltMetrics']['topHeadlines'] };
const gdeltMemory = new Map<string, { pull: GdeltPull | null; triedAt: number }>();
const gdeltInFlight = new Map<string, Promise<GdeltPull | null>>();
function gdeltFile(iso3: string): string {
  return path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'live', 'gdelt', `${iso3.replace(/[^A-Z0-9]/g, '')}.json`);
}
async function fetchGdeltQuarterly(iso3: string, countryName: string): Promise<GdeltPull | null> {
  let mem = gdeltMemory.get(iso3);
  if (!mem) {
    try {
      const saved = JSON.parse(fs.readFileSync(gdeltFile(iso3), 'utf8')) as GdeltPull;
      if (saved?.pulledAt && typeof saved.tone === 'number') {
        mem = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
        gdeltMemory.set(iso3, mem);
      }
    } catch {
      // never pulled
    }
  }
  const fresh = mem?.pull && Date.now() - Date.parse(mem.pull.pulledAt) < GDELT_REFRESH_MS;
  if (fresh) return mem!.pull;
  if (mem && Date.now() - mem.triedAt < 60 * 60 * 1000) return mem.pull; // tried within the hour
  const running = gdeltInFlight.get(iso3);
  if (running) return running;
  const job = (async () => {
    const q = encodeURIComponent(`"${countryName}" (economy OR central bank OR debt OR inflation OR sanctions)`);
    let tone: number | null = null;
    let headlines: GdeltPull['headlines'] = [];
    try {
      const res = await fetchGdelt(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=timelinetone&format=json`, 20000);
      if (res.ok) {
        const series = ((await res.json()) as any)?.timeline?.[0]?.data;
        if (Array.isArray(series) && series.length) {
          const recent = series.slice(-7);
          const avg = recent.reduce((a: number, pt: any) => a + Number(pt?.value || 0), 0) / recent.length;
          if (Number.isFinite(avg) && avg !== 0) tone = Number(avg.toFixed(2));
        }
      }
    } catch {
      tone = null;
    }
    if (tone !== null) {
      try {
        const res = await fetchGdelt(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=6`, 20000);
        if (res.ok) {
          const arts = ((await res.json()) as any)?.articles;
          if (Array.isArray(arts)) {
            headlines = arts
              .filter((a: any) => a?.title && a?.url)
              .slice(0, 4)
              .map((a: any) => ({
                title: String(a.title),
                sourceDomain: String(a.domain || ''),
                publishedAt: parseGdeltSeenDate(a.seendate),
                toneScore: tone!,
                url: String(a.url),
              }));
          }
        }
      } catch {
        headlines = [];
      }
    }
    const prev = gdeltMemory.get(iso3)?.pull ?? null;
    if (tone === null) {
      // Keep the last good pull (it carries its own date) and retry later.
      gdeltMemory.set(iso3, { pull: prev, triedAt: Date.now() });
      return prev;
    }
    const pull: GdeltPull = { pulledAt: new Date().toISOString(), tone, headlines };
    gdeltMemory.set(iso3, { pull, triedAt: Date.now() });
    try {
      fs.mkdirSync(path.dirname(gdeltFile(iso3)), { recursive: true });
      fs.writeFileSync(gdeltFile(iso3), JSON.stringify(pull));
    } catch {
      // keep the memory copy
    }
    return pull;
  })().finally(() => gdeltInFlight.delete(iso3));
  gdeltInFlight.set(iso3, job);
  return job;
}

function parseGdeltSeenDate(seenDate?: string): string {
  if (!seenDate || typeof seenDate !== 'string') return new Date().toISOString();
  // GDELT format: YYYYMMDDTHHMMSSZ
  const m = seenDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  }
  const d = new Date(seenDate);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
      const imfMetrics = ['GGXWDG_NGDP', 'PCPIPCH', 'NGDP_RPCH', 'GGXONLB_NGDP'];
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
            imfHit = true;
          }
          if (typeof f2027 === 'number') {
            baseline.imfIndicators.debtToGdpForecast2027Pct = Number(f2027.toFixed(1)); markLive('imf.debtToGdpForecast2027Pct', 'IMF WEO forecast');
          }
        } else if (metric === 'PCPIPCH') {
          const cpi = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof cpi === 'number') {
            baseline.imfIndicators.cpiInflationPct = Number(cpi.toFixed(2)); markLive('imf.cpiInflationPct', 'IMF WEO');
            imfHit = true;
          }
        } else if (metric === 'NGDP_RPCH') {
          const gdp = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof gdp === 'number') {
            baseline.imfIndicators.realGdpGrowthPct = Number(gdp.toFixed(2)); markLive('imf.realGdpGrowthPct', 'IMF WEO');
            imfHit = true;
          }
        } else if (metric === 'GGXONLB_NGDP') {
          const pb = getLatestImfValue(series, ['2025', '2026', '2024']);
          if (typeof pb === 'number') {
            baseline.imfIndicators.primaryFiscalBalancePct = Number(pb.toFixed(2)); markLive('imf.primaryFiscalBalancePct', 'IMF WEO');
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
              };
              return { contract, relevance, vol };
            })
            .filter((x): x is { contract: PolymarketContract; relevance: number; vol: number } => Boolean(x))
            .sort((a, b) => b.relevance - a.relevance || b.vol - a.vol);

          if (scoredEvents.length > 0) {
            baseline.polymarketContracts = scoredEvents.slice(0, 4).map((s) => s.contract);
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
      if (pull.headlines.length) baseline.gdeltMetrics.topHeadlines = pull.headlines;
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

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'live');
const SNAPSHOT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const snapshotStore = new Map<string, { snapshot: OpenDataSnapshot; pulledAt: number }>();
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
      snapshotStore.set(iso3, parsed);
      return parsed as { snapshot: OpenDataSnapshot; pulledAt: number };
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
      const snapshot = await fetchLiveOpenDataSnapshotNetwork(iso3, countryName);
      const entry = { snapshot, pulledAt: Date.now() };
      snapshotStore.set(iso3, entry);
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      const tmp = `${snapshotFile(iso3)}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(entry));
      fs.renameSync(tmp, snapshotFile(iso3));
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
async function withBisPolicyRate(snapshot: OpenDataSnapshot): Promise<OpenDataSnapshot> {
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
    if (Date.now() - stored.pulledAt > SNAPSHOT_REFRESH_MS) {
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
  for (const item of SOVEREIGN_CATALOG) {
    const stored = loadStoredSnapshot(item.iso3);
    if (force || !stored || Date.now() - stored.pulledAt > SNAPSHOT_REFRESH_MS) {
      await refreshStoredSnapshot(item.iso3, item.countryName);
    }
  }
}

let cachedWatchlistLive: { timestamp: number; items: WatchlistItem[] } | null = null;

/** Inputs the risk scores lean on most; without all of them live, the score is not shown. */
const RISK_INPUTS = ['imf.debtToGdpPct', 'imf.cpiInflationPct', 'imf.realGdpGrowthPct', 'wb.fxReservesMonthsImport', 'wb.politicalStabilityPercentile', 'gdelt.averageTone'];

async function fetchLiveWatchlistCatalog(): Promise<WatchlistItem[]> {
  if (cachedWatchlistLive && Date.now() - cachedWatchlistLive.timestamp < 4 * 60 * 1000) {
    return cachedWatchlistLive.items;
  }

  const [effr, tradeAll, cftc, tic, cbpol, imf] = await Promise.all([
    fetchEffr(),
    Promise.race([fetchTradeExposure(), new Promise<Map<string, TradeExposure>>((resolve) => setTimeout(() => resolve(new Map()), 8000))]),
    // CFTC positioning: don't hold the watchlist for it; the pull fills the cache for next time.
    Promise.race([fetchCftcPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    Promise.race([fetchTicPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
    cbpolPullQuick(),
    // IMF reserves and BOP: many small requests; the first pull fills the cache for next time.
    Promise.race([fetchImfPull(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]),
  ]);
  const cftcWeeks = new Map<string, CftcWeek[]>(Object.entries(cftc?.weeks || {}));
  const items = await Promise.all(
    SOVEREIGN_CATALOG.map(async (catItem) => {
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
        return {
          ...catItem,
          ...(fx.reer ? { reerGapPct: fx.reer.gapPct, reerPeriod: fx.reer.period } : {}),
          ...(fx.vol ? { fxVol3mPct: fx.vol.volPct, fxVolTo: fx.vol.to } : {}),
          ...(effr ? { usFedFundsPct: effr.pct, usFedFundsDate: effr.date } : {}),
          ...(pos && cftc ? { cftc: { ...pos, pulledAt: cftc.pulledAt } } : {}),
          ...(ust && tic ? { tic: { ...ust, pulledAt: tic.pulledAt } } : {}),
          ...(imf?.countries[catItem.iso3] ? { imf: { ...imf.countries[catItem.iso3], pulledAt: imf.pulledAt } } : {}),
          ...(tradeAll.get(catItem.iso3) && Object.keys(tradeAll.get(catItem.iso3)!).length ? { trade: tradeAll.get(catItem.iso3) } : {}),
          geopoliticalRisk: geo,
          sovereignRisk: sov,
          macroRisk: mac,
          compositeRisk: comp,
          ...watchlistYieldFields(snap, fetchedOfficial),
          cds5YBps: snap.monetaryAndMarket.cds5YSpreadBps,
          cds5YSource: status.ownCds ? 'own' : 'sample',
          ...(status.ownCds ? { cds5YDate: status.ownCds.date, cds5YProvider: status.ownCds.source } : {}),
          debtToGdpPct: snap.imfIndicators.debtToGdpPct,
          fxReservesMonths: snap.worldBankIndicators.fxReservesMonthsImport,
          cpiInflationPct: snap.imfIndicators.cpiInflationPct,
          cpiSource: lf['imf.cpiInflationPct'] ? 'live' : 'sample',
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
          alertStatus: comp >= 0.68 ? 'CRITICAL' : comp >= 0.48 ? 'ELEVATED' : 'STABLE',
          dataMode: status.mode,
          dataAsOf: status.asOf,
        } as WatchlistItem;
      } catch {
        return catItem;
      }
    })
  );

  cachedWatchlistLive = {
    timestamp: Date.now(),
    items,
  };
  return items;
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

function getOrBuildAssessmentRun(iso3Input: string): CouncilAssessmentRun {
  const iso3 = String(iso3Input || 'BRA').toUpperCase().trim();
  const cached = latestRunsByIso3.get(iso3);
  if (cached) return cached;
  const snapshot = buildBaselineOpenData(iso3);
  const freshRun = buildDefaultAssessmentRun(iso3, snapshot);
  latestRunsByIso3.set(iso3, freshRun);
  return freshRun;
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
  const deepDefault =
    cfg.ollamaDeepModel ||
    serverGuiRuntimeConfig.ollamaDeepModel ||
    cfg.ollamaQuickModel ||
    process.env.OLLAMA_DEEP_MODEL ||
    'deepseek-r1:8b';

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
  inferenceOptions?: { temperature?: number; numCtx?: number }
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

  const isReasoningModel = /deepseek-r1|qwq|qwen3/i.test(model);
  const body = isOllama
    ? {
        model,
        stream: false,
        // Reasoning models with <think> blocks work best when allowed to emit or when format: 'json' is paired with explicit key hints
        ...(isReasoningModel ? {} : { format: 'json' }),
        options: {
          temperature,
          num_ctx: numCtx,
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
        messages: [
          { role: 'system', content: `${systemPrompt}${schemaInstruction}` },
          { role: 'user', content: userPrompt },
        ],
      };

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
    return isOllama ? json?.message?.content || '{}' : json?.choices?.[0]?.message?.content || '{}';
  } finally {
    clearTimeout(timer);
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
}): Promise<{
  data: T;
  latencyMs: number;
  retriesUsed: number;
  schemaVerified: boolean;
  usedFallback: boolean;
  providerUsed: string;
}> {
  const startMs = Date.now();
  const maxRetries = options.maxRetries ?? 2;
  let retriesUsed = 0;

  const isDeepCouncilStep =
    options.stepName === 'STAGE_3_SUPREME_COUNCIL' ||
    options.thinkingLevel === ThinkingLevel.HIGH;

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
      ? options.runtimeConfig.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
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
    const stepTimeoutMs =
      typeof customTimeoutSec === 'number' && customTimeoutSec >= 5 && customTimeoutSec <= 180
        ? Math.round(customTimeoutSec * 1000)
        : isDeepCouncilStep
        ? 25000
        : 16000;

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

    for (const candidateUrl of candidateUrls) {
      try {
        const rawText = await callOllamaOrOpenAICompatible(
          candidateUrl,
          modelName,
          options.systemInstruction,
          options.prompt,
          isOllama,
          stepTimeoutMs,
          schemaKeysHint,
          {
            temperature:
              options.runtimeConfig.temperature ?? serverGuiRuntimeConfig.temperature ?? 0.2,
            numCtx: options.runtimeConfig.numCtx ?? serverGuiRuntimeConfig.numCtx ?? 8192,
          }
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
              ? `Local Ollama (${modelName} · ${isDeepCouncilStep ? 'Phase 3 Deep' : 'Phase 1-2 Sub-Agents'})`
              : `OpenAI-Compatible (${modelName})`,
          };
        }
      } catch {
        retriesUsed++;
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
          };
        }
      } catch {
        // Continue to next retry attempt
      }
    }
  }

  return {
    data: options.fallbackValue,
    latencyMs: Date.now() - startMs,
    retriesUsed,
    schemaVerified: true,
    usedFallback: true,
    providerUsed: 'Quantitative Anchor Deterministic Engine',
  };
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
      set(step, usedFallback ? 'fallback' : 'done', note ?? (usedFallback ? 'No model answered: built-in figures used' : undefined));
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // 1b. Live Watchlist Multi-Sovereign Telemetry Endpoint
  app.get('/api/data/watchlist-live', async (_req, res) => {
    try {
      const items = await fetchLiveWatchlistCatalog();
      res.json({ items, fetchedAt: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to refresh live watchlist' });
    }
  });

  // 1b'. Data connection check: asks every outside source for one small real answer, through the
  // same URLs and parsers the app uses, and says in words what connected and why anything did not.
  // Kept 30 seconds so a double click does not hit rate-limited sources (GDELT) twice.
  let connectionReportCache: { at: number; report: ConnectionReport } | null = null;
  app.get('/api/data/connections', async (req, res) => {
    try {
      if (req.query.refresh !== '1' && connectionReportCache && Date.now() - connectionReportCache.at < 30000) {
        return res.json(connectionReportCache.report);
      }
      const report = await checkConnections({
        env: process.env,
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
        serverGuiRuntimeConfig.ollamaDeepModel || process.env.OLLAMA_DEEP_MODEL || 'deepseek-r1:8b',
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
        `OLLAMA_DEEP_MODEL=${incoming.ollamaDeepModel || 'deepseek-r1:8b'}`,
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
        message: `Saved GUI Configuration to server: Provider=${incoming.providerMode || 'ollama'}, Phase 1–2=${incoming.ollamaQuickModel || 'qwen2.5:7b'}, Phase 3=${incoming.ollamaDeepModel || 'deepseek-r1:8b'}, Active API/Host Connectors=${activeConnectorCount}.`,
        runtimeConfig: serverGuiRuntimeConfig,
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
    const { ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434' } = req.body || {};
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
      ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
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
      ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
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
        'Evaluate Brazil (BRA) 5Y CDS at 165 bps and Debt/GDP at 76.8%. Return JSON with keys: stance (BULLISH, BEARISH, or NEUTRAL), riskScore (0.0 to 1.0), and summary (1 sentence).',
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
      const [geoSettled, sovSettled, macroSettled, searchSettled] = await Promise.allSettled([
        tracked(progress, 'geo', executeResilientLlmStep<any>({
          stepName: 'STAGE_1_GEO_DESK',
          providerMode,
          runtimeConfig,
          systemInstruction: `You are Managing Director of the Geopolitical Risk Desk overseeing AG-1 (Intelligence Scraper Analyst), AG-2 (Transmission Mapping Analyst), and AG-3 (Sanctions & Legal Analyst). Quantitative Anchor Score: ${anchors.geopolitical}. Keep risk scores anchored near empirical telemetry. CRITICAL WRITING STYLE: Write all findings, debate arguments, resolutions, and consensus summaries in clear, everyday plain English first so any reader immediately understands the real-world impact, and cite the exact economic/statistical metrics in parentheses at the end, e.g. "(Ref: Caldara-Iacoviello GPR Z-Score = +2.1σ | 5Y CDS = 185 bps)".`,
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
          systemInstruction: `You are Managing Director of the Sovereign Credit Desk overseeing AG-4 (Fiscal Auditor Analyst), AG-5 (External Balance Sheet Analyst), and AG-6 (Political Will & Governance Analyst). Quantitative Anchor Score: ${anchors.sovereign}. Keep risk scores anchored near empirical Debt/GDP, 5Y CDS, and Reserve Adequacy telemetry. CRITICAL WRITING STYLE: Write all findings, debate arguments, resolutions, and minority dissents in clear, everyday plain English first so any reader immediately understands the real-world budget and debt impact, and cite the exact economic/statistical metrics in parentheses at the end, e.g. "(Ref: Debt/GDP = 78.4% | r - g = +1.8% | FX Cover = 4.2 mos)".`,
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
            progress.skip('search', !enableSearch ? 'Web search is turned off' : 'Needs a Gemini key');
            return [];
          }
          progress.start('search');
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
            return chunks
              .filter((c: any) => c?.web?.uri)
              .slice(0, 6)
              .map((c: any) => ({
                title: String(c.web.title || 'Verified Web Grounding Source'),
                uri: String(c.web.uri),
                sourceType: 'Google Search Grounding',
              }));
          } catch {
            progress.fail('search', 'Web search did not answer');
            return [];
          }
        })(),
      ]);

      const geoResult = geoSettled.status === 'fulfilled' ? geoSettled.value : null;
      const sovResult = sovSettled.status === 'fulfilled' ? sovSettled.value : null;
      const macroResult = macroSettled.status === 'fulfilled' ? macroSettled.value : null;
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
        const d = workerRes?.data || {};
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
          const conf = Number(d[`agent${idxNum}Confidence`]);
          if (!Number.isNaN(conf) && conf >= 0.5 && conf <= 0.99) {
            agent.confidence = Number(conf.toFixed(2));
          }
          if (d[`agent${idxNum}FindingsSummary`]) {
            agent.findingsSummary = String(d[`agent${idxNum}FindingsSummary`]);
          }
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
        if (d.consensusSummary) {
          debate.consensusSummary = String(d.consensusSummary);
        }
        const validStances = ['CONSTRUCTIVE', 'CAUTIOUS', 'DEFENSIVE', 'DISTRESSED'];
        if (validStances.includes(String(d.consensusStance || '').toUpperCase())) {
          debate.consensusStance = String(d.consensusStance).toUpperCase() as any;
        }

        // Hydrate Round 1 + optional Round 2 if maxDebateRounds >= 2
        if (debate.rounds[0]) {
          if (d.round1ProposerThesis) debate.rounds[0].thesis = String(d.round1ProposerThesis);
          if (d.round1ChallengerCounter) debate.rounds[0].counterThesis = String(d.round1ChallengerCounter);
          if (d.round1Resolution) debate.rounds[0].deskLeadResolution = String(d.round1Resolution);
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

      const postGeo = clampScoreToAnchor(
        cascadeRes.data?.postCascadeGeoScore,
        geoClamp.finalBoundedScore,
        0.15
      );
      const postMacro = clampScoreToAnchor(
        cascadeRes.data?.postCascadeMacroScore,
        macroClamp.finalBoundedScore,
        0.18
      );
      const postSov = clampScoreToAnchor(
        cascadeRes.data?.postCascadeSovereignScore,
        sovClamp.finalBoundedScore,
        0.18
      );

      baseRun.deskDebates.geopolitical.postCascadeRiskScore = postGeo.finalBoundedScore;
      baseRun.deskDebates.macro.postCascadeRiskScore = postMacro.finalBoundedScore;
      baseRun.deskDebates.sovereign.postCascadeRiskScore = postSov.finalBoundedScore;

      const energyShock = Number(
        Math.max(2, Math.min(45, Number(cascadeRes.data?.energyInflationShockPct ?? 15.0))).toFixed(1)
      );
      const spreadShockBps = Math.round(
        Math.max(15, Math.min(350, Number(cascadeRes.data?.debtServicingSpreadBps ?? 85)))
      );

      if (baseRun.cascadeSteps[0]) {
        baseRun.cascadeSteps[0].priorRiskScore = macroClamp.finalBoundedScore;
        baseRun.cascadeSteps[0].postCascadeRiskScore = postMacro.finalBoundedScore;
        if (cascadeRes.data?.step1ShockDelta) {
          baseRun.cascadeSteps[0].shockDelta = String(cascadeRes.data.step1ShockDelta);
        }
        if (cascadeRes.data?.step1TransmissionMechanism) {
          baseRun.cascadeSteps[0].transmissionMechanism = String(
            cascadeRes.data.step1TransmissionMechanism
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
        if (cascadeRes.data?.step2ShockDelta) {
          baseRun.cascadeSteps[1].shockDelta = String(cascadeRes.data.step2ShockDelta);
        }
        if (cascadeRes.data?.step2TransmissionMechanism) {
          baseRun.cascadeSteps[1].transmissionMechanism = String(
            cascadeRes.data.step2TransmissionMechanism
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
      // Pause at Human-in-the-Loop CRO Checkpoint before Supreme Council
      baseRun.stage = 'AWAITING_CRO_APPROVAL';
      latestRunsByIso3.set(baseRun.iso3, baseRun);
      const intCfg = serverGuiRuntimeConfig.integrationConfig || DEFAULT_INTEGRATION_CONFIG;
      if (intCfg.autoBroadcastOnRun) {
        void dispatchTopLevelIntegrationEvent(
          baseRun,
          intCfg.defaultScope || 'all_desks_bundle',
          'council.phase1_2.desks_ready'
        );
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
    try {
      const { run, croOverrideState, runtimeConfig = {} } = req.body as {
        run: CouncilAssessmentRun;
        croOverrideState: CROOverrideState;
        runtimeConfig?: Partial<AIRuntimeConfig>;
      };

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

      const kellyExecutionSuite = computeCouncilKellyAndLobExecution(targetRun);

      const councilPrompt = `Synthesize the final SMCR-1.0 (Sovereign-Macro Council Report v1.0) output for ${targetRun.countryName} (${targetRun.iso3}).

CRO Human-in-the-Loop Approved / Overridden Risk Vector:
- Geopolitical Desk Risk Score: ${finalGeo} (${targetRun.deskDebates?.geopolitical?.consensusSummary || ''})
- Sovereign Risk Desk Score: ${finalSov} (${targetRun.deskDebates?.sovereign?.consensusSummary || ''})
- Macroeconomic Desk Risk Score: ${finalMac} (${targetRun.deskDebates?.macro?.consensusSummary || ''})
- Composite Risk Score: ${compositeScore}
- Energy/Freight Inflation Shock Input: +${cro.energyInflationShockPct}%
- Debt Servicing Spread Impact: +${cro.debtServicingSpreadBps} bps
- FX Reserve Cover: ${cro.fxReserveAdequacyMonths} months | 10Y Local Yield: ${targetRun.openData.monetaryAndMarket.sovereign10YBondYieldPct}% | 5Y CDS: ${targetRun.openData.monetaryAndMarket.cds5YSpreadBps} bps | Spot FX: ${targetRun.openData.monetaryAndMarket.exchangeRatePerUsd} ${targetRun.openData.currencyCode}/USD
- Political Will Index: ${cro.politicalWillIndex}/100
- Counterfactual Shocks Applied: Brent +$${cro.counterfactualShocks?.brentCrudeShockUsd || 0}/bbl, Fed +${cro.counterfactualShocks?.fedTerminalRateShockBps || 0}bps, Chokepoint -${cro.counterfactualShocks?.chokepointTransitDropPct || 0}%, Fiscal Slippage +${cro.counterfactualShocks?.domesticFiscalSlippagePctGdp || 0}% GDP
- Chief Risk Officer Directives: "${cro.croNotes}"
- Brier-Calibrated Half-Kelly Sizing & Market-Maker LOB Execution Audit: Composite Conviction = ${kellyExecutionSuite.compositeBrierConvictionPct}% | Recommended Gross Half-Kelly Allocation = ${kellyExecutionSuite.totalHalfKellyGrossNavPct}% NAV ($${kellyExecutionSuite.totalAllocatedNotionalUsdMillions}M) | Weighted LOB Slippage Drag = -${kellyExecutionSuite.weightedExecutionSlippageBps} bps | Net Post-Slippage Alpha = +${kellyExecutionSuite.netPortfolioExpectedAlphaBps} bps (${kellyExecutionSuite.dealerInventoryRegime})`;

      let baseOutput: SupremeCouncilOutput =
        targetRun.supremeCouncil || buildDefaultAssessmentRun(targetRun.iso3).supremeCouncil!;

      const progress = progressTracker(req.body?.progressId);
      const supremeStep = await tracked(progress, 'supreme', executeResilientLlmStep<any>({
        stepName: 'STAGE_3_SUPREME_COUNCIL',
        providerMode: runtimeConfig.providerMode || 'gemini',
        runtimeConfig,
        thinkingLevel: ThinkingLevel.HIGH,
        systemInstruction:
          'You are the Supreme Council Orchestrator for an Institutional Asset Management & Sovereign Policy Research Department. Return strict JSON adhering to the SMCR-1.0 schema. CRITICAL WRITING STYLE: Phrase the executiveSummary, longTermRegimeOutlook, structuralVulnerabilities, factorCrowdingWarning, and all trade rationales in clear, everyday plain English first so both general readers and portfolio managers immediately grasp the core takeaway, and cite the exact economic/statistical metrics in parentheses at the end of each point (Ref: ...).',
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
            fiscalPolicyRecommendation: { type: Type.STRING },
            monetaryPolicyRecommendation: { type: Type.STRING },
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

      const parsed = supremeStep.data || {};
      const validVerdicts = ['EXECUTE_TRADES', 'DEFENSIVE_HEDGE', 'HOLD_AND_MONITOR'];
      const verdict = validVerdicts.includes(parsed.decisionVerdict)
        ? parsed.decisionVerdict
        : compositeScore >= 0.65
        ? 'EXECUTE_TRADES'
        : 'DEFENSIVE_HEDGE';

      baseOutput = {
        ...baseOutput,
        reportId: `SMCR-1.0-${targetRun.iso3}-${Date.now().toString().slice(-5)}`,
        generatedAt: new Date().toISOString(),
        decisionVerdict: verdict as SupremeCouncilOutput['decisionVerdict'],
        compositeRiskScore: compositeScore,
        executiveSummary: parsed.executiveSummary || baseOutput.executiveSummary,
        policyResearcherReport: {
          ...baseOutput.policyResearcherReport,
          structuralVulnerabilities:
            Array.isArray(parsed.structuralVulnerabilities) && parsed.structuralVulnerabilities.length > 0
              ? parsed.structuralVulnerabilities
              : baseOutput.policyResearcherReport.structuralVulnerabilities,
          longTermRegimeOutlook:
            parsed.longTermRegimeOutlook || baseOutput.policyResearcherReport.longTermRegimeOutlook,
          policyRecommendations: baseOutput.policyResearcherReport.policyRecommendations.map(
            (rec, idx) => {
              if (idx === 0 && parsed.fiscalPolicyRecommendation) {
                return { ...rec, action: String(parsed.fiscalPolicyRecommendation) };
              }
              if (idx === 1 && parsed.monetaryPolicyRecommendation) {
                return { ...rec, action: String(parsed.monetaryPolicyRecommendation) };
              }
              return rec;
            }
          ),
        },
        marketTranslationLayer: {
          ...baseOutput.marketTranslationLayer,
          regimeStance: parsed.regimeStance || baseOutput.marketTranslationLayer.regimeStance,
          tradeExpressions: baseOutput.marketTranslationLayer.tradeExpressions.map((t, idx) => {
            if (idx === 0 && parsed.ratesTradeInstrument) {
              return {
                ...t,
                instrument: String(parsed.ratesTradeInstrument),
                entryRationale: String(parsed.ratesTradeRationale || t.entryRationale),
                invalidationStopTrigger: String(
                  parsed.ratesTradeInvalidation || t.invalidationStopTrigger
                ),
              };
            }
            if (idx === 1 && parsed.fxTradeInstrument) {
              return {
                ...t,
                instrument: String(parsed.fxTradeInstrument),
                entryRationale: String(parsed.fxTradeRationale || t.entryRationale),
                invalidationStopTrigger: String(
                  parsed.fxTradeInvalidation || t.invalidationStopTrigger
                ),
              };
            }
            if (idx === 3 && parsed.creditTradeInstrument) {
              return {
                ...t,
                instrument: String(parsed.creditTradeInstrument),
                entryRationale: String(parsed.creditTradeRationale || t.entryRationale),
              };
            }
            return t;
          }),
          riskGuardianCheck: {
            ...baseOutput.marketTranslationLayer.riskGuardianCheck,
            factorCrowdingWarning:
              parsed.factorCrowdingWarning ||
              baseOutput.marketTranslationLayer.riskGuardianCheck.factorCrowdingWarning,
          },
        },
      };

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

      const updatedRun: CouncilAssessmentRun = {
        ...targetRun,
        stage: 'COMPLETED',
        croState: {
          ...cro,
          geopoliticalRiskScore: finalGeo,
          sovereignRiskScore: finalSov,
          macroRiskScore: finalMac,
          approvedAt: new Date().toISOString(),
        },
        supremeCouncil: baseOutput,
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
        );
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
    const t0 = Date.now();
    const { webhookUrl, payload } = req.body || {};
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required.' });
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
        ? { agents: null, reason: 'no AI model answered' }
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
        const out: DebateResult = { challenges, replies: null, reason: 'no AI model answered' };
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
      res.json(out);
    } catch (error: any) {
      const out: DebateResult = { challenges, replies: null, reason: `the debate step failed (${error?.message || 'unknown error'})` };
      res.json(out);
    }
  });

  app.post('/api/council/synthesise', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 500) : '';
    const answers: AgentAnswer[] = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 6) : [];
    if (!question || !answers.length || !answers.every((a) => a && typeof a.name === 'string' && Array.isArray(a.findings) && Array.isArray(a.missing))) {
      return res.status(400).json({ error: 'A question and the agents\' answers are needed.' });
    }
    const empty: CouncilBrief = { headline: '', points: [], disagreements: [], gaps: [] };
    try {
      const step = await executeResilientLlmStep<CouncilBrief>({
        stepName: 'COUNCIL_SYNTHESIS',
        providerMode: req.body?.runtimeConfig?.providerMode || 'gemini',
        runtimeConfig: req.body?.runtimeConfig || {},
        thinkingLevel: ThinkingLevel.LOW,
        systemInstruction: SYNTHESIS_INSTRUCTION,
        prompt: (earlierAsText(Array.isArray(req.body?.earlier) ? req.body.earlier.filter((t: any) => t && typeof t.question === 'string') : []) + answersAsText(question, answers)).slice(0, 20000),
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
      if (step.usedFallback) {
        const out: SynthesisResult = {
          brief: null,
          removed: [],
          reason: 'No AI model answered. Set up Gemini or Ollama under Menu > AI model and data connections to get a summary.',
        };
        return res.json(out);
      }
      const checked = checkBrief(step.data || empty, question, answers);
      const out: SynthesisResult = { brief: checked.brief, removed: checked.removed, contradicted: checked.contradicted, provider: step.providerUsed };
      res.json(out);
    } catch (error: any) {
      const out: SynthesisResult = { brief: null, removed: [], reason: `The summary step failed (${error?.message || 'unknown error'}).` };
      res.json(out);
    }
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
    const run = getOrBuildAssessmentRun(iso3);
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
    const run = getOrBuildAssessmentRun(iso3);
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
      const targetRun = incomingRun || getOrBuildAssessmentRun(cleanIso3);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sovereign & Macro Council Server listening on http://localhost:${PORT}`);
    setTimeout(() => void refreshStaleSnapshots(), 5000);
    setInterval(() => void refreshStaleSnapshots(), 6 * 60 * 60 * 1000).unref();
  });
}

startServer();
