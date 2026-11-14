/**
 * Data connection check (Sam, 2026-11-05: "clean up the data sources and make sure they connect
 * properly").
 *
 * One list of every outside source the app reads, and a check that asks each one for a single
 * small, real answer through the same URL and parser the app uses. Each source comes back as one
 * row: connected (with the figure it returned), needs setup (which key or file), off (your own
 * paid account, not switched on), or failed (no answer, refused, or an answer the app could not
 * read), with the reason in plain words.
 *
 * Used by GET /api/data/connections (the Tools page) and by `npm run check:data` in a terminal.
 * Keys and passwords are never put in a row: only whether they are set.
 */
import { CHINN_ITO_PAGE, chinnItoLinks } from './chinnIto';
import { parseFredCsvSeries } from './fedBalanceSheet';
import { EMISSIONS_CODE, OWID_ENERGY_URL, energyColumns } from './climateEnergy';
import { DBNOMICS_GFSMAB_URL, dbnomicsGfsListUrl, dbnomicsLevelsUrl, GFS_DEFAULT, GFS_UNIT_ENV, type GfsCodes, gfsCodeSample, imfLevelSeriesId, pickGfsCodes } from './govLevels';
import { ECB_RTD_SERIES, ecbRtdUrl, parseEcbHistory } from './ecbRealTime';
import { latestEditionUri, ONS_TRIANGLE_PAGE } from './onsTriangles';
import { bcbActivityUrl, eurostatActivityUrl, monthText, onsActivityUrl, parseBcbActivity, parseEurostatActivity, parseOnsSeries } from './monthlyIndicators';
import { BIS_PRIVATE_DEBT_SAMPLE_URL, parseBisPrivateDebtAll } from './sectorBalances';
import { BIS_PROPERTY_SAMPLE_URL, ILO_EARNINGS_ENV, ILO_EARNINGS_ID, ILO_TOC_URLS, iloEarningsCandidates, iloEarningsSampleUrl, iloIdRefused, parseBisPropertyAll, parseIloEarnings, quarterLabel, wageReading } from './wagesHousing';
import { debtStructureUrl, parseDebtStructure, currencyValue } from './debtStructure';
import { INVESTOR_BASE_SETUP_HELP, investorBaseValue } from './investorBase';
import { FISCAL_RULES_SETUP_HELP, RULE_KINDS, RULE_KIND_NAME } from './fiscalRules';
import { DPI_SETUP_HELP } from './politicalFeasibility';
import { ECB_SPF_SERIES, ecbSpfUrl, FOCUS_URL, parseEcbCsv, parseFocus12m } from './inflationSurveys';
import { gscpiFromBytes, GSCPI_URLS } from './stressIndices';
import { chokepointsUrl, parsePortWatchStats } from './portWatch';
import { bcrpEmbigUrl, describeBcrpReply, parseBcrpEmbig } from './hardCurrencySpread';
import { geminiModel } from './geminiModel';
import { DEFAULT_REFEREE_MODEL, refereeModelOrDefault } from './refereeModel';
import { TIC_URL, formatMonth, parseTicTable, ticHoldingFor } from './ticHoldings';
import { latestUstAuctions, parseUstAuctions, ustAuctionsUrl } from './treasuryAuctions';
import { IMF_MEASURES, IMF_SDMX_HOST, formatImfPeriod, pullImfExternal } from './imfReserves';
import { cliFor, cliUrl, parseCli } from './oecdCli';
import { formatQuarter, parseQna, qnaReading, qnaUrl } from './oecdQna';
import { BCB_IBCBR_SA, bcbSgsSinceUrl, eurostatIpUrl, parseEurostatIp, parseIbcBr } from './monthlyActivity';
import { EU_PRICE_EXPECTATIONS, EU_SURVEY_INDICATORS, euSurveyUrl, parseEuSurvey } from './euSurveys';
import { driversMinrUrl } from './inflationDrivers';
import { PWT_EDITION, PWT_URL } from './growthAccounting';
import { OECD_HEADERS, isBotCheck } from './oecdSdmx';
import { cpiFor, cpiUrl, parseCpi } from './oecdInflation';
import { ACLED_TOKEN_URL, acledReadUrl, acledTokenBody, parseAcledPage } from './acled';
import { BANXICO_CPI_SERIES, banxicoHeaders, banxicoSeriesUrl, BCB_IPCA_12M, bcbSgsUrl, eurostatHicpUrl, EVDS_CPI_DEFAULT_SERIES, evdsCpiUrl, parseBanxicoMonthly, parseEvdsCpiYoy, parseBcbSgs, parseEurostatHicp } from './nationalCpi';
import { coferLine, pullCofer } from './imfCofer';
import { pullImfCpi } from './imfCpi';
import { CFTC_CURRENCY_CODES, cftcUrl, parseCftcRows, positioningFor } from './cftcPositioning';
import { BIS_ISO2, bisIntlUrl, parseBisIntl } from './bisDebtSecurities';
import { CBPOL_AREA, cbpolDailyUrl, parseCbpolCsv, policyRateFor } from './bisPolicyRates';
import { idsUrl, parseIds } from './debtSchedule';
import { frankfurterSeriesUrl, parseEffr, parseFxVol, parseReer, reerUrl } from './fxValuation';
import {
  US_10Y_SERIES,
  TESOURO_DIRETO_CSV_URL,
  evdsSeriesUrl,
  fredApiUrl,
  fredCsvUrl,
  isValidEvdsSeriesCode,
  parseEvdsLatest,
  parseFredApiLatest,
  parseFredCsvLatest,
  parseTesouroDiretoLatest,
} from './officialYields';
import { lsegSnapshotUrl, lsegTokenRequest, ownCdsSettings, parseLsegSnapshot, parseOwnCdsCsv } from './ownCds';
import { paidVendorFromEnv, parsePaidMappings } from '../engine/paidData';
import { macrobondCredentials, macrobondFetchUrl, macrobondTokenBody, MACROBOND_AUTH_URL, readMacrobondSeries, readMacrobondToken } from '../engine/macrobond';
import { parseWitsShare, witsUrl } from './scenarioExposure';
import { PINK_SHEET_PAGE, PINK_SHEET_SHEET, eiaSpotUrl, findPinkSheetUrl, moveSentence, parseEiaSpot, parsePinkSheet, priceMove } from './commodityPrices';
import { readXlsxSheet } from './xlsxRead';
import { GDELT_V1_SIZES_URL, parseFileSizes } from './gdeltDaily';
import { AIDDATA_SETUP_HELP, chinaValue, type AiddataData } from './lowIncomeDebt';
import { ACLED_AGGREGATED_PAGE, ACLED_FOLDER, acledFileReading, type AcledFileData } from './acledFiles';
import { UCDP_DATASETS, UCDP_DATASET_IDS, UCDP_DOWNLOADS_PAGE, UCDP_FOLDER, ucdpReading, type UcdpData } from './ucdpConflict';
import { COMTRADE_REPORTERS, buildProfile, comtradeUrl, comtradeYears, parseComtrade, partnerSentence } from './comtradeTrade';

export type ConnectionState =
  /** Answered, and the answer was read. */
  | 'connected'
  /** A key, file or setting the source needs is missing or invalid. */
  | 'needs_setup'
  /** An optional key that is not set; the app uses a free route instead. */
  | 'optional'
  /** Your own paid account, not switched on. */
  | 'off'
  /** No answer: timeout, address not found, connection refused, or blocked on the way. */
  | 'no_answer'
  /** Answered with an HTTP error (refused, not found, rate limited). */
  | 'refused'
  /** Answered, but not in the shape the app reads. */
  | 'bad_reply';

export type ConnectionGroup = 'free' | 'free_key' | 'own_account' | 'ai';

export interface ConnectionResult {
  id: string;
  name: string;
  group: ConnectionGroup;
  /** What the app fills from it. */
  feeds: string;
  state: ConnectionState;
  /** The reason, or what came back, in a sentence. */
  detail: string;
  /** A figure from the answer, to show it is real: "Brazil reserves 5.9 months of imports (2024)". */
  sample?: string;
  /** How to set it up (the .env lines), when it needs setup or is optional. */
  setup?: string;
  /** Something to fix even though it connected (a model not installed, a stale file). */
  warning?: string;
  host: string;
  httpStatus?: number;
  latencyMs?: number;
}

export interface ConnectionReport {
  checkedAt: string;
  results: ConnectionResult[];
  counts: Record<ConnectionState, number>;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface CheckOptions {
  env: Record<string, string | undefined>;
  fetchFn?: FetchFn;
  now?: Date;
  /** Per request, ms. The Brazil Treasury file gets at least 90 s because it is about 15 MB from a slow server. */
  timeoutMs?: number;
  /** AI settings as the app uses them (the in-app settings win over .env). */
  ai?: { provider?: string; ollamaBaseUrl?: string; ollamaQuickModel?: string; ollamaDeepModel?: string; openAiBaseUrl?: string; geminiModel?: string };
  /** File reader for the own CDS file (injected in tests). */
  readFile?: (path: string) => { text: string; modified: Date } | null;
  /** The UCDP files read from data/local/ucdp/ (utils/ucdpStore.ts); absent = not checked. */
  ucdp?: () => UcdpData | null;
  /** The ACLED aggregated files in data/local/acled/ (server: acledFileData). */
  acledFiles?: () => AcledFileData | null;
  aiddata?: () => AiddataData | null;
  investorBase?: () => import('./investorBaseStore').InvestorBaseData | null;
  fiscalRules?: () => import('./fiscalRulesStore').FiscalRulesData | null;
  dpi?: () => import('./dpiStore').DpiData | null;
  /** Only these source ids. */
  only?: string[];
  /** Where each key in `env` came from: 'app' = saved in Menu > Settings > API keys, 'env' = .env. */
  keySources?: Record<string, 'app' | 'env' | 'none'>;
  /** The text of data/local/paid/mappings.json (your subscription's mapped series); absent = none. */
  paidMappingsText?: () => string | null;
  /** Pause between the two OECD checks, ms (default 3000; tests set 0). */
  oecdGapMs?: number;
}

export const STATE_LABEL: Record<ConnectionState, string> = {
  connected: 'Connected',
  needs_setup: 'Needs setup',
  optional: 'Not set (optional)',
  off: 'Off (your own account)',
  no_answer: 'No answer',
  refused: 'Refused',
  bad_reply: 'Unreadable answer',
};

export const isFailure = (s: ConnectionState) => s === 'no_answer' || s === 'refused' || s === 'bad_reply';

const SAMPLE_ISO3 = 'BRA';
const SAMPLE_NAME = 'Brazil';

interface ProbeReply {
  ok: boolean;
  status?: number;
  latencyMs: number;
  text?: string;
  /** The address that finally answered, when redirects were followed. */
  finalUrl?: string;
  /** Set when there was no HTTP answer at all. */
  networkError?: string;
}

/** Turns a fetch failure into words: timeout, DNS, refused, TLS, proxy. */
export function describeNetworkError(err: unknown, timeoutMs: number): string {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return `No answer within ${Math.round(timeoutMs / 1000)} s.`;
  const code = e?.cause?.code || '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Address not found. Check the internet connection (or a VPN or firewall blocking DNS).';
  if (code === 'ECONNREFUSED') return 'Connection refused: nothing is listening at that address.';
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'The connection was cut. A firewall or proxy may be blocking it.';
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return 'The connection timed out.';
  if (/CERT|SSL|TLS/i.test(code) || /certificate/i.test(e?.cause?.message || '')) return 'Secure connection failed (certificate). A proxy may be intercepting it.';
  const msg = String(e?.cause?.message || e?.message || 'failed').replace(/\.+$/, '');
  if (/cancel|abort/i.test(msg)) return 'The request was stopped on the way, often by a proxy or firewall that does not allow this site.';
  return `Request failed: ${msg}.`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function probe(fetchFn: FetchFn, url: string, timeoutMs: number, init: RequestInit = {}): Promise<ProbeReply> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, text, ...(res.url && res.url !== url ? { finalUrl: res.url } : {}) };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, networkError: describeNetworkError(err, timeoutMs) };
  } finally {
    clearTimeout(timer);
  }
}

function httpRefusal(status: number | undefined, text: string | undefined): string {
  if (isBotCheck(status, text))
    return `Blocked by the site's bot check (a Cloudflare "Just a moment" page, HTTP ${status}), not a data error. It usually clears after an hour without calls; the app pauses its own calls for an hour after this.`;
  const snippet = (text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const why =
    status === 401 || status === 403
      ? 'Refused: the key or login was not accepted, or the site blocks this network.'
      : status === 404
        ? 'Not found: the address or series code may have changed.'
        : status === 429
          ? 'Rate limited: too many requests. Wait a minute and check again.'
          : status && status >= 500
            ? 'The source had a server error. Usually temporary.'
            : 'The source refused the request.';
  return `${why} (HTTP ${status}${snippet ? `: "${snippet}"` : ''})`;
}

function parseJson(text: string | undefined): unknown {
  try {
    return JSON.parse(text || '');
  } catch {
    return undefined;
  }
}

/**
 * True when a request was redirected to the site's own error page (for example the New York Fed
 * sends a 302 to www.newyorkfed.org/errors/500 during an outage). That is a fault on the source's
 * side, not a format change.
 */
export function isErrorPageRedirect(finalUrl: string | undefined): boolean {
  if (!finalUrl) return false;
  try {
    return /\/(errors?|error-pages?)(\/\d{3}|\.html?|\/?$)/i.test(new URL(finalUrl).pathname);
  } catch {
    return false;
  }
}

type Def = Omit<ConnectionResult, 'state' | 'detail' | 'host'> & { url?: string };

/** One HTTP check: probe, then read with the app's own parser. `read` returns a sample, or null if unreadable. */
async function httpCheck(
  def: Def,
  fetchFn: FetchFn,
  url: string,
  timeoutMs: number,
  read: (r: ProbeReply) => string | null,
  init?: RequestInit,
  unreadable = 'It answered, but not in the format the app reads. The source may have changed its format.'
): Promise<ConnectionResult> {
  const { url: _u, ...rest } = def;
  const r = await probe(fetchFn, url, timeoutMs, init);
  const base = { ...rest, host: hostOf(url), latencyMs: r.latencyMs, ...(r.status ? { httpStatus: r.status } : {}) };
  if (r.networkError) return { ...base, state: 'no_answer', detail: r.networkError };
  if (isErrorPageRedirect(r.finalUrl))
    return { ...base, state: 'refused', detail: `Site error: the source sent its own error page (redirected to ${r.finalUrl}). A problem on its side, usually temporary; not a format change.` };
  if (!r.ok) return { ...base, state: 'refused', detail: httpRefusal(r.status, r.text) };
  let sample: string | null = null;
  try {
    sample = read(r);
  } catch {
    sample = null;
  }
  if (!sample) return { ...base, state: 'bad_reply', detail: unreadable };
  return { ...base, state: 'connected', detail: `Answered in ${r.latencyMs} ms.`, sample };
}

const fmt = (n: number, dp = 1) => n.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: dp });

function setRow(def: Def, state: ConnectionState, detail: string, host: string): ConnectionResult {
  const { url: _u, ...rest } = def;
  return { ...rest, state, detail, host };
}

export const SOURCE_IDS = [
  'worldbank',
  'worldbank_debt',
  'worldbank_dist',
  'worldbank_people',
  'worldbank_trade',
  'worldbank_climate',
  'owid_energy',
  'ilostat_wages',
  'bis_property',
  'bis_private_debt',
  'imf_gov_levels',
  'eurostat_activity',
  'ons_activity',
  'bcb_activity',
  'ecb_rtd',
  'ons_triangle',
  'worldbank_debt_structure',
  'imf',
  'imf_reserves',
  'imf_cofer',
  'imf_cpi',
  'gdelt',
  'gdelt_v1',
  'polymarket',
  'kalshi',
  'nyfed',
  'fx_spot',
  'frankfurter',
  'bis_reer',
  'bis_debt',
  'bis_cbpol',
  'wits',
  'cftc',
  'tic',
  'ust_auctions',
  'pink_sheet',
  'oecd_cli',
  'oecd_cpi',
  'oecd_qna',
  'bcb_ipca',
  'bcrp_embig',
  'eurostat_hicp',
  'bcb_ibcbr',
  'eurostat_ip',
  'eu_surveys',
  'eu_price_expectations',
  'eurostat_hicp_parts',
  'pwt',
  'comtrade',
  'fred_csv',
  'fred_api',
  'fed_h10',
  'chinn_ito',
  'tesouro',
  'ecb_spf',
  'bcb_focus',
  'nyfed_gscpi',
  'imf_portwatch',
  'evds',
  'banxico',
  'ucdp',
  'acled',
  'acled_files',
  'aiddata_file',
  'imf_investor_base',
  'imf_fiscal_rules',
  'dpi',
  'eia',
  'own_cds',
  'paid_data',
  'gemini',
  'ollama',
  'openai_compatible',
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export async function checkConnections(opts: CheckOptions): Promise<ConnectionReport> {
  const env = opts.env;
  const fetchFn: FetchFn = opts.fetchFn || ((u, i) => fetch(u, i));
  const now = opts.now || new Date();
  const T = opts.timeoutMs ?? 10000;
  const year = now.getUTCFullYear();
  const want = (id: SourceId) => !opts.only || opts.only.includes(id);
  // How to name a key in a sentence: saved in Settings, or the .env name.
  const keyPhrase = (envName: string) => (opts.keySources?.[envName] === 'app' ? 'the key saved in Settings' : `the key in ${envName}`);
  const savedNote = (envName: string, r: ConnectionResult) =>
    r.state === 'connected' && opts.keySources?.[envName] === 'app' ? { ...r, detail: `${r.detail} (key saved in Settings)` } : r;
  const provider = (opts.ai?.provider || env.DEFAULT_AI_PROVIDER || 'gemini').toLowerCase();
  const usesOllama = provider === 'ollama' || provider.startsWith('hybrid');
  const usesGemini = provider === 'gemini' || provider.startsWith('hybrid');
  const usesOpenAi = provider === 'openai_compatible';

  const jobs: Array<Promise<ConnectionResult>> = [];
  const add = (id: SourceId, job: () => Promise<ConnectionResult>) => {
    if (want(id)) jobs.push(job());
  };

  // ---- Free, no key -------------------------------------------------------------------------
  add('worldbank', () =>
    httpCheck(
      { id: 'worldbank', name: 'World Bank indicators', group: 'free', feeds: 'Reserves, current account, external debt, political stability, trade shares' },
      fetchFn,
      `https://api.worldbank.org/v2/country/${SAMPLE_ISO3}/indicator/FI.RES.TOTL.MO?format=json&per_page=6`,
      T,
      (r) => {
        const rows = (parseJson(r.text) as unknown[])?.[1];
        const row = Array.isArray(rows) ? (rows as Array<{ value?: unknown; date?: string }>).find((x) => typeof x?.value === 'number') : undefined;
        return row ? `${SAMPLE_NAME} reserves ${fmt(Number(row.value))} months of imports (${row.date})` : null;
      }
    )
  );

  add('worldbank_dist', () =>
    httpCheck(
      { id: 'worldbank_dist', name: 'World Bank inequality, taxes and tariffs', group: 'free', feeds: 'Gini index, central government tax revenue and its split, applied tariffs (country brief, Fiscal & Debt Agent)' },
      fetchFn,
      `https://api.worldbank.org/v2/country/${SAMPLE_ISO3}/indicator/GC.TAX.TOTL.GD.ZS?format=json&per_page=8`,
      T,
      (r) => {
        const rows = (parseJson(r.text) as unknown[])?.[1];
        const row = Array.isArray(rows) ? (rows as Array<{ value?: unknown; date?: string }>).find((x) => typeof x?.value === 'number') : undefined;
        if (row) return `${SAMPLE_NAME} tax revenue ${fmt(Number(row.value))}% of GDP, central government (${row.date})`;
        return Array.isArray(rows) ? `Answered (no recent tax revenue figure for ${SAMPLE_NAME})` : null;
      }
    )
  );

  add('worldbank_climate', () =>
    httpCheck(
      { id: 'worldbank_climate', name: 'World Bank emissions and renewables', group: 'free', feeds: 'Greenhouse gas emissions per person, renewable share of energy use (country brief)' },
      fetchFn,
      `https://api.worldbank.org/v2/country/${SAMPLE_ISO3}/indicator/${EMISSIONS_CODE}?format=json&per_page=10`,
      T,
      (r) => {
        const rows = (parseJson(r.text) as unknown[])?.[1];
        const row = Array.isArray(rows) ? (rows as Array<{ value?: unknown; date?: string }>).find((x) => typeof x?.value === 'number') : undefined;
        if (row) return `${SAMPLE_NAME} greenhouse gas emissions ${fmt(Number(row.value))} tonnes CO2e per person (${row.date})`;
        return Array.isArray(rows) ? `Answered (no recent emissions figure for ${SAMPLE_NAME})` : null;
      }
    )
  );

  // The first few kilobytes are enough to see that the file answers and still has the energy mix columns.
  add('owid_energy', () =>
    httpCheck(
      { id: 'owid_energy', name: 'Our World in Data energy file', group: 'free', feeds: 'Energy mix: coal, oil, gas, nuclear and renewables shares (country brief, Global Spillover Agent); downloaded weekly to this computer, not shipped' },
      fetchFn,
      OWID_ENERGY_URL,
      T,
      (r) => (energyColumns((r.text || '').split('\n')[0] || '') ? 'Energy file answered with the coal, oil, gas, nuclear and renewables share columns' : null),
      { headers: { Range: 'bytes=0-16383' } },
      'It answered, but the first line has no coal, oil and gas share columns. Our World in Data may have renamed them again.'
    )
  );

  add('ilostat_wages', async () => {
    const def = { id: 'ilostat_wages' as SourceId, name: 'ILOSTAT earnings', group: 'free' as const, feeds: 'Nominal and real wage growth (country brief, Central Bank and Politics agents)' };
    const from = new Date().getUTCFullYear() - 8;
    const read = (r: ProbeReply) => {
      const parsed = parseIloEarnings(r.text || '');
      if (!parsed) return null;
      const w = parsed[SAMPLE_ISO3] && wageReading(parsed[SAMPLE_ISO3], undefined);
      if (!w) return `Answered (no earnings for ${SAMPLE_NAME} in local currency, all activities)`;
      return `${SAMPLE_NAME} average monthly earnings ${fmt(w.monthly, 0)} in local currency (${w.year})${w.nominalGrowthPct !== undefined ? `, ${w.nominalGrowthPct > 0 ? '+' : ''}${fmt(w.nominalGrowthPct)}% on a year earlier` : ''}`;
    };
    const unreadable = 'It answered, but not with the ILOSTAT columns the app reads (ref_area, classif1, time, obs_value). ILOSTAT may have changed its layout, or the indicator id.';
    const set = env[ILO_EARNINGS_ENV]?.trim();
    const id = set || ILO_EARNINGS_ID;
    const first = await httpCheck(def, fetchFn, iloEarningsSampleUrl(SAMPLE_ISO3, from, id), T, read, undefined, unreadable);
    if (set || first.state !== 'refused' || !iloIdRefused(first.httpStatus, first.detail)) return first;
    // The id is no longer served: look for its replacement in ILOSTAT's own list of indicators.
    for (const tocUrl of ILO_TOC_URLS) {
      const toc = await probe(fetchFn, tocUrl, T);
      const ids = toc.ok ? iloEarningsCandidates(toc.text || '', id) : [];
      if (!ids.length) continue;
      const next = await httpCheck(def, fetchFn, iloEarningsSampleUrl(SAMPLE_ISO3, from, ids[0]), T, read, undefined, unreadable);
      const note = `${id} is no longer served; ILOSTAT's indicator list offers ${ids.slice(0, 4).join(', ')}, and the daily run uses ${ids[0]} (${ILO_EARNINGS_ENV} in .env chooses another).`;
      return next.state === 'connected' ? { ...next, sample: `${next.sample}. ${note}` } : { ...next, detail: `${note} ${next.detail}` };
    }
    return { ...first, detail: `${first.detail} No replacement for ${id} was found in ILOSTAT's indicator list (${ILO_TOC_URLS.map(hostOf).join(', ')}); set ${ILO_EARNINGS_ENV} in .env to the current id (https://rplumber.ilo.org/).` };
  });

  add('bis_property', () =>
    httpCheck(
      { id: 'bis_property', name: 'BIS residential property prices', group: 'free', feeds: 'Real and nominal house prices (country brief, History & data, Central Bank agent)' },
      fetchFn,
      BIS_PROPERTY_SAMPLE_URL,
      T,
      (r) => {
        const all = parseBisPropertyAll(r.text || '');
        const h = all[SAMPLE_ISO3];
        if (!h) return Object.keys(all).length ? 'Answered (no row for the sample country)' : null;
        const v = (x?: number) => (x === undefined ? 'n/a' : `${x > 0 ? '+' : ''}${fmt(x)}%`);
        return `${SAMPLE_NAME} house prices ${v(h.realYoyPct)} real, ${v(h.nominalYoyPct)} nominal on a year earlier (${quarterLabel(h.quarter)})`;
      }
    )
  );

  // Levels of government (G42 step 1): state and local spending for every BIS country, which also
  // says how many publish them (the coverage that decides the per-state screen).
  add('imf_gov_levels', async () => {
    const iso2s = Object.values(BIS_ISO2);
    const unitSet = env[GFS_UNIT_ENV]?.trim();
    const first: GfsCodes = { ...GFS_DEFAULT, ...(unitSet ? { unit: unitSet } : {}) };
    const def = { id: 'imf_gov_levels' as SourceId, name: 'IMF GFS by level of government (via DBnomics)', group: 'free' as const, feeds: 'Revenue and spending by level of government (country brief, Fiscal Agent)' };
    const ask = async (codes: GfsCodes) => {
      let none = false;
      const ids = iso2s.flatMap((i) => [imfLevelSeriesId(i, 'state', 'spending', codes), imfLevelSeriesId(i, 'local', 'spending', codes), imfLevelSeriesId(i, 'central', 'spending', codes)]);
      const row = await httpCheck(def, fetchFn, dbnomicsLevelsUrl(ids), T, (r) => {
        const docs = (JSON.parse(r.text || '') as { series?: { docs?: Array<{ series_code?: string; value?: unknown[] }> } })?.series?.docs;
        if (!Array.isArray(docs)) return null;
        const has = (d: { value?: unknown[] }) => Array.isArray(d.value) && d.value.some((v) => typeof v === 'number');
        const sub = new Set(docs.filter((d) => /\.S131[23]\./.test(String(d.series_code)) && has(d)).map((d) => String(d.series_code).split('.')[1]));
        const central = new Set(docs.filter((d) => /\.S1311\./.test(String(d.series_code)) && has(d)).map((d) => String(d.series_code).split('.')[1]));
        if (!central.size && !sub.size) {
          none = true;
          return null;
        }
        return `Central government spending for ${central.size} of ${iso2s.length} countries; state or local spending for ${sub.size}${sub.size ? ` (${[...sub].sort().join(', ')})` : ''}`;
      });
      return { row, none, count: ids.length };
    };
    const tried = await ask(first);
    if (!tried.none) return tried.row;
    // None of the series asked for came back: read the dataset's own codes and try them.
    const sampleIso2 = BIS_ISO2[SAMPLE_ISO3] || 'BR';
    const ds = await probe(fetchFn, DBNOMICS_GFSMAB_URL, T);
    let picked: ReturnType<typeof pickGfsCodes> = { codes: {}, units: [] };
    try {
      if (ds.ok) picked = pickGfsCodes(JSON.parse(ds.text || ''));
    } catch {
      // unreadable; the listing below still helps
    }
    const next: GfsCodes = { unit: unitSet || picked.codes.unit || first.unit, revenue: picked.codes.revenue || first.revenue, spending: picked.codes.spending || first.spending };
    const found = `Codes read from DBnomics' GFSMAB description: unit ${picked.codes.unit || 'none labelled as a percent of GDP'}, revenue ${picked.codes.revenue || 'not found'}, expenditure ${picked.codes.spending || 'not found'}${picked.units.length ? `; units listed: ${picked.units.join('; ')}` : ds.ok ? '' : ` (description not read: ${ds.networkError || `HTTP ${ds.status}`})`}.`;
    if (JSON.stringify(next) !== JSON.stringify(first)) {
      const again = await ask(next);
      if (!again.none) return again.row.state === 'connected' ? { ...again.row, sample: `${again.row.sample}. Uses ${imfLevelSeriesId(sampleIso2, 'central', 'spending', next)}.` } : again.row;
    }
    const list = await probe(fetchFn, dbnomicsGfsListUrl(sampleIso2), T);
    let codes: string[] = [];
    try {
      codes = list.ok ? gfsCodeSample(JSON.parse(list.text || ''), 10) : [];
    } catch {
      codes = [];
    }
    return {
      ...tried.row,
      detail: `DBnomics answered, but none of the ${tried.count} GFSMAB series the app asks for (for example ${imfLevelSeriesId(sampleIso2, 'central', 'spending', first)}) came back, so revenue and spending by level of government stay Missing. ${found} ${
        codes.length ? `For ${SAMPLE_NAME}, central government, DBnomics holds: ${codes.join('; ')}.` : `DBnomics listed no GFSMAB series for ${SAMPLE_NAME}, central government${list.ok ? '' : ` (${list.networkError || `HTTP ${list.status}`})`}; the dataset may have moved.`
      }`,
    };
  });

  // Monthly activity (G41): one sample per source the daily run reads (FRED has its own row).
  const actSample = (s: { points: { period: string; value: number }[] } | null | undefined, what: string, unit = '') => {
    const last = s?.points[s.points.length - 1];
    return last ? `${what} ${fmt(last.value)}${unit} (${monthText(last.period)})` : null;
  };
  add('eurostat_activity', () =>
    httpCheck(
      { id: 'eurostat_activity', name: 'Eurostat monthly activity (industrial production, retail trade, unemployment)', group: 'free', feeds: 'Monthly activity for EU members and Turkey (country brief, History & data, Central Bank agent)' },
      fetchFn,
      eurostatActivityUrl('retail', ['DE'], '2025-01'),
      T,
      (r) => actSample(parseEurostatActivity('retail', JSON.parse(r.text || ''), ['DEU']).DEU, 'Germany retail trade volume index')
    )
  );
  add('ons_activity', () =>
    httpCheck(
      { id: 'ons_activity', name: 'ONS monthly activity (index of production, retail sales, unemployment)', group: 'free', feeds: 'Monthly activity for the United Kingdom (country brief, History & data, Central Bank agent)' },
      fetchFn,
      onsActivityUrl('retail'),
      T,
      (r) => actSample(parseOnsSeries('retail', JSON.parse(r.text || '')), 'UK retail sales volume index')
    )
  );
  add('bcb_activity', () =>
    httpCheck(
      { id: 'bcb_activity', name: 'IBGE monthly activity through BCB SGS (industrial production, retail sales, unemployment)', group: 'free', feeds: 'Monthly activity for Brazil (country brief, History & data, Central Bank agent)' },
      fetchFn,
      bcbActivityUrl('unemp'),
      T,
      (r) => actSample(parseBcbActivity('unemp', JSON.parse(r.text || '')), 'Brazil unemployment rate', '%')
    )
  );

  // Figures as first published (G12, G13). The ECB row reads euro area GDP with its revision
  // history; the ONS row checks the GDP revision triangle's page lists a file (the file itself can be
  // refused to programs, in which case a copy saved by hand in data/local/ons-triangles is read).
  add('ecb_rtd', () =>
    httpCheck(
      { id: 'ecb_rtd', name: 'ECB Euro Area Real-Time Database (figures as first published)', group: 'free', feeds: 'Euro area figures as first published (History & data on euro members\' pages)' },
      fetchFn,
      ecbRtdUrl(ECB_RTD_SERIES[0].id, '2023'),
      T,
      (r) => {
        const rows = parseEcbHistory(r.text || '');
        if (!rows.length) return null;
        const periods = new Set(rows.map((x) => x.date));
        return `Euro area GDP: ${rows.length} published values for ${periods.size} quarters since 2023, first change recorded ${rows.map((x) => x.from).sort()[0]}`;
      }
    )
  );
  add('ons_triangle', () =>
    httpCheck(
      { id: 'ons_triangle', name: 'ONS GDP revision triangle (UK GDP as first published)', group: 'free', feeds: 'UK GDP as first published (History & data on the UK page)' },
      fetchFn,
      `${ONS_TRIANGLE_PAGE}/data`,
      T,
      (r) => {
        const edition = latestEditionUri(JSON.parse(r.text || ''));
        return edition ? `Latest edition listed: ${edition.split('/').pop()}` : null;
      }
    )
  );

  add('bis_private_debt', () =>
    httpCheck(
      { id: 'bis_private_debt', name: 'BIS total credit (household and company debt)', group: 'free', feeds: 'Household and company debt, % of GDP (country brief, History & data, Fiscal Agent)' },
      fetchFn,
      BIS_PRIVATE_DEBT_SAMPLE_URL,
      T,
      (r) => {
        const all = parseBisPrivateDebtAll(r.text || '');
        const d = all[SAMPLE_ISO3];
        if (!d) return Object.keys(all).length ? 'Answered (no row for the sample country)' : null;
        const v = (x?: number) => (x === undefined ? 'n/a' : `${fmt(x)}% of GDP`);
        return `${SAMPLE_NAME} household debt ${v(d.householdPct)}, company debt ${v(d.corporatePct)} (${d.quarter.replace(/^(\d{4})Q/, '$1 Q')})`;
      },
      undefined,
      'It answered, but not with the BIS total credit columns the app reads (BORROWERS_CTY, TC_BORROWERS, TC_LENDERS, TIME_PERIOD, OBS_VALUE). The BIS may have changed the series key.'
    )
  );

  add('worldbank_trade', () =>
    httpCheck(
      { id: 'worldbank_trade', name: 'World Bank trade and energy', group: 'free', feeds: 'Goods exports and imports by group, net energy imports (country brief, Hormuz scenario)' },
      fetchFn,
      `https://api.worldbank.org/v2/country/${SAMPLE_ISO3}/indicator/TX.VAL.FUEL.ZS.UN?format=json&per_page=8`,
      T,
      (r) => {
        const rows = (parseJson(r.text) as unknown[])?.[1];
        const row = Array.isArray(rows) ? (rows as Array<{ value?: unknown; date?: string }>).find((x) => typeof x?.value === 'number') : undefined;
        if (row) return `${SAMPLE_NAME} fuel ${fmt(Number(row.value))}% of goods exports (${row.date})`;
        return Array.isArray(rows) ? `Answered (no recent fuel export share for ${SAMPLE_NAME})` : null;
      }
    )
  );

  add('worldbank_people', () =>
    httpCheck(
      { id: 'worldbank_people', name: 'World Bank people and living standards', group: 'free', feeds: 'Poverty rates, remittances, labour force participation, youth unemployment, age dependency (country brief, council)' },
      fetchFn,
      `https://api.worldbank.org/v2/country/${SAMPLE_ISO3}/indicator/BX.TRF.PWKR.DT.GD.ZS?format=json&per_page=8`,
      T,
      (r) => {
        const rows = (parseJson(r.text) as unknown[])?.[1];
        const row = Array.isArray(rows) ? (rows as Array<{ value?: unknown; date?: string }>).find((x) => typeof x?.value === 'number') : undefined;
        if (row) return `${SAMPLE_NAME} remittances received ${fmt(Number(row.value))}% of GDP (${row.date})`;
        return Array.isArray(rows) ? `Answered (no recent remittances figure for ${SAMPLE_NAME})` : null;
      }
    )
  );

  add('worldbank_debt_structure', () =>
    httpCheck(
      { id: 'worldbank_debt_structure', name: 'World Bank debt structure (IDS currency mix, interest burden)', group: 'free', feeds: 'Currency mix and maturity of new loans of public external debt, interest as % of revenue (country brief, Fiscal & Debt Agent)' },
      fetchFn,
      debtStructureUrl(SAMPLE_ISO3),
      T,
      (r) => {
        const d = parseDebtStructure(parseJson(r.text), '');
        if (d?.currency) return `${SAMPLE_NAME} public external debt: ${currencyValue(d.currency)}`;
        return d ? `Answered (no currency split for ${SAMPLE_NAME})` : null;
      }
    )
  );

  add('worldbank_debt', () =>
    httpCheck(
      { id: 'worldbank_debt', name: 'World Bank debt statistics (IDS, QEDS)', group: 'free', feeds: 'External debt falling due, by year and by quarter (banker brief)' },
      fetchFn,
      idsUrl(SAMPLE_ISO3),
      T,
      (r) => {
        const json = parseJson(r.text);
        const ids = parseIds(json, year);
        const y = ids?.years?.find((x) => x.principalUsdBn !== undefined);
        if (y) return `${SAMPLE_NAME} public external principal due ${y.year}: $${fmt(y.principalUsdBn!)}bn`;
        // An empty but well-formed reply still proves the connection.
        return Array.isArray(json) || (json && typeof json === 'object') ? `Answered (no projection rows for ${SAMPLE_NAME} this year)` : null;
      }
    )
  );

  add('imf', () =>
    httpCheck(
      { id: 'imf', name: 'IMF World Economic Outlook (DataMapper)', group: 'free', feeds: 'Debt/GDP, inflation, GDP growth, primary balance' },
      fetchFn,
      `https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/${SAMPLE_ISO3}`,
      T,
      (r) => {
        const series = (parseJson(r.text) as { values?: Record<string, Record<string, Record<string, number>>> })?.values?.GGXWDG_NGDP?.[SAMPLE_ISO3];
        if (!series) return null;
        for (const y of [String(year - 1), String(year), String(year - 2)]) {
          if (typeof series[y] === 'number') return `${SAMPLE_NAME} government debt ${fmt(series[y])}% of GDP (${y})`;
        }
        return null;
      }
    )
  );

  add('imf_reserves', async () => {
    const def: Def = {
      id: 'imf_reserves',
      name: 'IMF reserves and balance of payments (api.imf.org)',
      group: 'free',
      feeds: 'Monthly official reserves (IL), quarterly current account and imports (BOP), months of import cover',
    };
    const t0 = Date.now();
    let pulled: Awaited<ReturnType<typeof pullImfExternal>>;
    try {
      pulled = await pullImfExternal({ fetchFn, env, timeoutMs: Math.max(T, 30000) }, SAMPLE_ISO3);
    } catch (err) {
      return { ...setRow(def, 'no_answer', describeNetworkError(err, Math.max(T, 30000)), IMF_SDMX_HOST), latencyMs: Date.now() - t0 };
    }
    const e = pulled.external;
    const latencyMs = Date.now() - t0;
    const failed = pulled.steps.filter((s) => !s.ok);
    const steps = pulled.steps.map((s) => `${IMF_MEASURES[s.measure].label}: ${s.ok ? 'read' : 'not read'} (${s.note})`).join(' ');
    if (e.reserves || e.currentAccount) {
      const bits = [
        e.reserves ? `reserves $${fmt(e.reserves.usdBn)}bn (${formatImfPeriod(e.reserves.period)})` : '',
        e.monthsOfImports !== undefined ? `${fmt(e.monthsOfImports)} months of imports` : '',
        e.currentAccount4q?.pctGdp !== undefined
          ? `current account ${fmt(e.currentAccount4q.pctGdp)}% of GDP (4 quarters to ${formatImfPeriod(e.currentAccount4q.through)})`
          : e.currentAccount
            ? `current account $${fmt(e.currentAccount.usdBn)}bn (${formatImfPeriod(e.currentAccount.period)})`
            : '',
      ].filter(Boolean);
      return {
        ...setRow(def, 'connected', `Answered in ${latencyMs} ms. ${steps}`, IMF_SDMX_HOST),
        latencyMs,
        sample: `${SAMPLE_NAME} ${bits.join(', ')}`,
        ...(failed.length ? { warning: failed.map((s) => `${IMF_MEASURES[s.measure].label}: ${s.note}`).join(' ') } : {}),
        setup: 'If an IMF indicator is not matched by name, set its series key in .env: IMF_RESERVES_KEY, IMF_CA_KEY, IMF_IMPORTS_KEY ({ISO3} for the country).',
      };
    }
    const status = failed.map((s) => s.httpStatus ?? Number(/HTTP (\d{3})/.exec(s.note)?.[1] ?? 0)).find((n) => n >= 400);
    const noAnswer = failed.length > 0 && failed.every((s) => !s.httpStatus && /no answer within|fetch failed|request failed/i.test(s.note));
    return {
      ...setRow(def, status ? 'refused' : noAnswer ? 'no_answer' : 'bad_reply', steps || 'The IMF answered nothing the app could read.', IMF_SDMX_HOST),
      latencyMs,
      ...(status ? { httpStatus: status } : {}),
      setup: 'If an IMF indicator is not matched by name, set its series key in .env: IMF_RESERVES_KEY, IMF_CA_KEY, IMF_IMPORTS_KEY ({ISO3} for the country).',
    };
  });

  add('imf_cofer', async () => {
    const def: Def = { id: 'imf_cofer', name: 'IMF COFER (reserve currency shares)', group: 'free', feeds: 'World shares of official FX reserves by currency, quarterly' };
    const t0 = Date.now();
    let r: Awaited<ReturnType<typeof pullCofer>>;
    try {
      r = await pullCofer({ fetchFn, env, timeoutMs: Math.max(T, 30000) });
    } catch (err) {
      return { ...setRow(def, 'no_answer', describeNetworkError(err, Math.max(T, 30000)), IMF_SDMX_HOST), latencyMs: Date.now() - t0 };
    }
    const latencyMs = Date.now() - t0;
    const setup = 'If the world code or a currency is not found by name, set IMF_COFER_KEY in .env to the series key.';
    if (r.cofer) {
      return {
        ...setRow(def, 'connected', `Answered in ${latencyMs} ms. ${r.note}.`, IMF_SDMX_HOST),
        latencyMs,
        sample: `World FX reserves ${formatImfPeriod(r.cofer.period)}: ${coferLine(r.cofer, 3)}`,
        setup,
      };
    }
    const status = r.httpStatus && r.httpStatus >= 400 ? r.httpStatus : Number(/HTTP (\d{3})/.exec(r.note)?.[1] ?? 0) || undefined;
    const state: ConnectionState = status ? 'refused' : /no answer within|fetch failed|request failed/i.test(r.note) ? 'no_answer' : 'bad_reply';
    return { ...setRow(def, state, r.note, IMF_SDMX_HOST), latencyMs, ...(status ? { httpStatus: status } : {}), setup };
  });

  add('imf_cpi', async () => {
    const def: Def = { id: 'imf_cpi', name: 'IMF monthly consumer prices (api.imf.org)', group: 'free', feeds: 'Monthly inflation, all items, year on year, for countries outside the EU when fresher than the OECD copy' };
    const t0 = Date.now();
    let r: Awaited<ReturnType<typeof pullImfCpi>>;
    try {
      r = await pullImfCpi({ fetchFn, env, timeoutMs: Math.max(T, 30000) }, 'USA');
    } catch (err) {
      return { ...setRow(def, 'no_answer', describeNetworkError(err, Math.max(T, 30000)), IMF_SDMX_HOST), latencyMs: Date.now() - t0 };
    }
    const latencyMs = Date.now() - t0;
    const setup = 'If the IMF codes are not matched by name, set IMF_CPI_KEY in .env to the series key ({ISO3} for the country); npm run check:imf prints the codes.';
    const last = r.series?.points[r.series.points.length - 1];
    if (last) return { ...setRow(def, 'connected', `Answered in ${latencyMs} ms. ${r.step.note}.`, IMF_SDMX_HOST), latencyMs, sample: `United States inflation ${fmt(last.value, 1)}% y/y (${formatMonth(last.period)})`, setup };
    const status = Number(/HTTP (\d{3})/.exec(r.step.note)?.[1] ?? 0) || undefined;
    const state: ConnectionState = status ? 'refused' : /no answer within|fetch failed|request failed/i.test(r.step.note) ? 'no_answer' : 'bad_reply';
    return { ...setRow(def, state, r.step.note, IMF_SDMX_HOST), latencyMs, ...(status ? { httpStatus: status } : {}), setup };
  });

  add('gdelt', () =>
    httpCheck(
      { id: 'gdelt', name: 'GDELT news', group: 'free', feeds: 'Headlines and news tone (risk score input)' },
      fetchFn,
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${SAMPLE_NAME}" economy`)}&mode=artlist&format=json&maxrecords=1`,
      // A refusal arrives after about 11 s (Sam's Mac, 2026-11-05).
      Math.max(T, 25000),
      (r) => {
        const arts = (parseJson(r.text) as { articles?: Array<{ title?: string }> })?.articles;
        if (Array.isArray(arts)) return arts[0]?.title ? `Latest headline: "${String(arts[0].title).slice(0, 80)}"` : 'Answered (no articles in the window)';
        return null;
      },
      undefined,
      'It answered with text instead of data. GDELT does this when asked too often (one request every 5 seconds); check again in a minute.'
    ).then((r) =>
      r.state === 'refused' && r.httpStatus === 429
        ? { ...r, detail: 'GDELT refused: too many requests from this connection (HTTP 429). It allows one request every 5 seconds and keeps refusing for a while after it is exceeded. The app pauses GDELT for 15 minutes after a refusal; check again after that.' }
        : r.state === 'no_answer'
          ? { ...r, detail: `${r.detail} GDELT's news search (api.gdeltproject.org) is a separate server from its event files (data.gdeltproject.org) and is sometimes slow or down for hours. The app keeps the last saved headlines and tone, each with its own date, and tries again within the hour; nothing for you to change.` }
          : r
    )
  );

  add('gdelt_v1', () =>
    httpCheck(
      { id: 'gdelt_v1', name: 'GDELT 1.0 event files', group: 'free', feeds: 'Monthly event history per country back to 1979 (npm run gdelt:daily)' },
      fetchFn,
      GDELT_V1_SIZES_URL,
      Math.max(T, 20000),
      (r) => {
        const files = parseFileSizes(r.text || '');
        const days = files.filter((f) => f.kind === 'day');
        return files.length ? `${files.length} files listed, newest ${days.at(-1)?.period || files.at(-1)!.period}` : null;
      }
    )
  );

  add('polymarket', () =>
    httpCheck(
      { id: 'polymarket', name: 'Polymarket', group: 'free', feeds: 'Prediction-market odds' },
      fetchFn,
      'https://gamma-api.polymarket.com/events?limit=1&active=true&closed=false',
      T,
      (r) => {
        const ev = parseJson(r.text);
        return Array.isArray(ev) && ev.length ? `Open market: "${String((ev[0] as { title?: string }).title || '').slice(0, 80)}"` : null;
      }
    )
  );

  add('kalshi', () =>
    httpCheck(
      { id: 'kalshi', name: 'Kalshi', group: 'free', feeds: 'Prediction-market odds (second venue)' },
      fetchFn,
      'https://api.elections.kalshi.com/trade-api/v2/markets?limit=1&status=open',
      T,
      (r) => {
        const m = (parseJson(r.text) as { markets?: Array<{ title?: string }> })?.markets;
        return Array.isArray(m) ? (m[0]?.title ? `Open market: "${String(m[0].title).slice(0, 80)}"` : 'Answered (no open markets)') : null;
      }
    )
  );

  add('nyfed', () =>
    httpCheck(
      { id: 'nyfed', name: 'New York Fed rates', group: 'free', feeds: 'Fed funds, SOFR, reverse repo (dollar leg of carry). When it is down the app reads the same rate from FRED (DFF)' },
      fetchFn,
      'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json',
      T,
      (r) => {
        const e = parseEffr(parseJson(r.text));
        return e ? `Effective fed funds ${fmt(e.pct, 2)}% (${e.date})` : null;
      }
    )
  );

  add('fx_spot', () =>
    httpCheck(
      { id: 'fx_spot', name: 'Spot FX (open.er-api.com)', group: 'free', feeds: 'Exchange rates against the dollar' },
      fetchFn,
      'https://open.er-api.com/v6/latest/USD',
      T,
      (r) => {
        const brl = (parseJson(r.text) as { rates?: Record<string, number> })?.rates?.BRL;
        return typeof brl === 'number' && brl > 0 ? `USD/BRL ${fmt(brl, 3)}` : null;
      }
    )
  );

  add('frankfurter', () =>
    httpCheck(
      { id: 'frankfurter', name: 'ECB reference rates (Frankfurter)', group: 'free', feeds: 'FX volatility; spot FX backup' },
      fetchFn,
      frankfurterSeriesUrl('BRL', now),
      T,
      (r) => {
        const v = parseFxVol(parseJson(r.text), 'BRL');
        return v ? `BRL 3-month volatility ${fmt(v.volPct)}% (to ${v.to})` : null;
      }
    )
  );

  add('bis_reer', () =>
    httpCheck(
      { id: 'bis_reer', name: 'BIS real exchange rates', group: 'free', feeds: 'Currency valuation against its own history' },
      fetchFn,
      reerUrl(BIS_ISO2[SAMPLE_ISO3], now),
      T,
      (r) => {
        const g = parseReer(r.text);
        return g ? `${SAMPLE_NAME} real exchange rate ${g.gapPct > 0 ? '+' : ''}${fmt(g.gapPct)}% vs its 10-year average (${g.period})` : null;
      }
    )
  );

  add('bis_debt', () =>
    httpCheck(
      { id: 'bis_debt', name: 'BIS debt securities', group: 'free', feeds: 'Government bonds outstanding (international and all markets)' },
      fetchFn,
      bisIntlUrl(BIS_ISO2[SAMPLE_ISO3]),
      T,
      (r) => {
        const d = parseBisIntl(r.text);
        return d ? `${SAMPLE_NAME} international government bonds $${fmt(d.outstandingUsdBn)}bn (${d.asOf})` : null;
      }
    )
  );

  add('bis_cbpol', () =>
    httpCheck(
      { id: 'bis_cbpol', name: 'BIS central bank policy rates', group: 'free', feeds: 'Policy rate per country, daily, with the central bank and the date' },
      fetchFn,
      cbpolDailyUrl([CBPOL_AREA[SAMPLE_ISO3]]),
      Math.max(T, 15000),
      (r) => {
        const p = policyRateFor(SAMPLE_ISO3, { pulledAt: now.toISOString(), daily: parseCbpolCsv(r.text, 'D'), monthly: {} }, now);
        return p ? `${SAMPLE_NAME} policy rate ${fmt(p.ratePct, 2)}% (${p.bank ? `${p.bank}, ` : ''}${p.date})` : null;
      },
      undefined,
      'The BIS answered, but with no Brazil policy-rate rows the app could read. The dataset format may have changed.'
    )
  );

  add('wits', () =>
    httpCheck(
      { id: 'wits', name: 'WITS trade partners', group: 'free', feeds: 'Export and import shares with China and Russia (scenario exposure)' },
      fetchFn,
      witsUrl(SAMPLE_ISO3, 'CHN', 'XPRT-PRTNR-SHR', year - 3),
      Math.max(T, 12000),
      (r) => {
        const s = parseWitsShare(r.text);
        return s ? `${SAMPLE_NAME} exports to China ${fmt(s.pct)}% of total (${s.year})` : null;
      }
    )
  );

  add('cftc', () =>
    httpCheck(
      { id: 'cftc', name: 'CFTC Commitments of Traders', group: 'free', feeds: 'Weekly currency futures positioning: MXN, BRL, ZAR, JPY, GBP, EUR' },
      fetchFn,
      cftcUrl(now, [CFTC_CURRENCY_CODES.MEX.code]),
      Math.max(T, 20000),
      (r) => {
        const p = positioningFor('MEX', parseCftcRows(parseJson(r.text)));
        return p ? `Leveraged funds net MXN ${p.levNetPctOi > 0 ? '+' : ''}${fmt(p.levNetPctOi)}% of open interest (as of ${p.reportDate}, ${p.weeks} weeks)` : null;
      },
      undefined,
      'The CFTC answered, but with no Mexican peso rows the app could read. The report format may have changed.'
    )
  );

  add('tic', () =>
    httpCheck(
      { id: 'tic', name: 'US Treasury TIC (foreign holders)', group: 'free', feeds: 'Monthly holdings of US Treasuries by country (about 20 named holders)' },
      fetchFn,
      TIC_URL,
      Math.max(T, 15000),
      (r) => {
        const t = parseTicTable(r.text);
        const h = ticHoldingFor(SAMPLE_ISO3, t) || ticHoldingFor('JPN', t);
        return h ? `${h.iso3 === SAMPLE_ISO3 ? SAMPLE_NAME : 'Japan'} holds $${fmt(h.holdingsUsdBn)}bn of US Treasuries (${formatMonth(h.month)})` : null;
      },
      undefined,
      'Treasury answered, but the table was not in the layout the app reads (a Country row with YYYY-MM months). The file may have changed.'
    )
  );

  add('ust_auctions', () =>
    httpCheck(
      { id: 'ust_auctions', name: 'US Treasury auctions (Fiscal Data)', group: 'free', feeds: 'Bid-to-cover, high yield and amounts at each auction of US bills, notes and bonds (United States page)' },
      fetchFn,
      ustAuctionsUrl(now, 1),
      Math.max(T, 20000),
      (r) => {
        const a = parseUstAuctions(parseJson(r.text));
        const ten = latestUstAuctions(a ? { pulledAt: '', auctions: a } : null).find((x) => x.tenor === '10y');
        return a?.length ? `${a.length} auctions in the last year${ten ? `; 10-year note on ${ten.date}: bid-to-cover ${ten.bidToCover.toFixed(2)}` : ''}` : null;
      },
      undefined,
      'Fiscal Data answered, but without held auctions in the layout the app reads (auction_date, security_type, original_security_term, bid_to_cover_ratio). The dataset may have changed.'
    )
  );

  add('pink_sheet', async () => {
    const def: Def = {
      id: 'pink_sheet',
      name: 'World Bank Pink Sheet (commodity prices)',
      group: 'free',
      feeds: 'Monthly prices of oil, gas, coal, metals and farm goods (spillover scenarios)',
      setup: 'Nothing needed. If the World Bank page changes, set PINK_SHEET_URL to the "Monthly prices" .xlsx link from worldbank.org/en/research/commodity-markets.',
    };
    const override = (env.PINK_SHEET_URL || '').trim();
    let url = override;
    if (!url) {
      const page = await probe(fetchFn, PINK_SHEET_PAGE, Math.max(T, 15000));
      const base = { host: hostOf(PINK_SHEET_PAGE), latencyMs: page.latencyMs, ...(page.status ? { httpStatus: page.status } : {}) };
      if (page.networkError) return { ...setRow(def, 'no_answer', page.networkError, base.host), ...base };
      if (!page.ok) return { ...setRow(def, 'refused', httpRefusal(page.status, page.text), base.host), ...base };
      url = findPinkSheetUrl(page.text) || '';
      if (!url) return { ...setRow(def, 'bad_reply', 'The World Bank commodity markets page answered, but had no "Monthly prices" workbook link. Set PINK_SHEET_URL to the .xlsx link.', base.host), ...base };
    }
    const t0 = Date.now();
    const controller = new AbortController();
    const wait = Math.max(T, 45000);
    const timer = setTimeout(() => controller.abort(), wait);
    try {
      const res = await fetchFn(url, { signal: controller.signal });
      const host = hostOf(url);
      if (!res.ok) return { ...setRow(def, 'refused', httpRefusal(res.status, ''), host), httpStatus: res.status, latencyMs: Date.now() - t0 };
      const buf = await res.arrayBuffer();
      const latencyMs = Date.now() - t0;
      let rows: string[][] | null = null;
      try {
        rows = await readXlsxSheet(buf, PINK_SHEET_SHEET);
      } catch {
        rows = null;
      }
      const series = rows ? parsePinkSheet(rows) : new Map();
      const brent = series.get('CRUDE_BRENT') || [...series.values()][0];
      const mv = brent ? priceMove(brent) : null;
      if (!mv) return { ...setRow(def, 'bad_reply', `The workbook downloaded, but the "${PINK_SHEET_SHEET}" sheet was not in the layout the app reads (months like 2025M09 down the first column, commodity codes across the top).`, host), httpStatus: res.status, latencyMs };
      return {
        ...setRow(def, 'connected', `Answered in ${latencyMs} ms; ${series.size} commodities read${override ? ' (from PINK_SHEET_URL)' : ''}.`, host),
        httpStatus: res.status,
        latencyMs,
        sample: moveSentence(mv).replace(/\.$/, ''),
      };
    } catch (err) {
      return { ...setRow(def, 'no_answer', describeNetworkError(err, wait), hostOf(url)), latencyMs: Date.now() - t0 };
    } finally {
      clearTimeout(timer);
    }
  });
  // Shows how current DBnomics' copy is overall, so an old month for one country can be told
  // apart from the whole mirror running behind.
  const usMonthNote = (c: { iso3: string; month: string }, us: { month: string } | null) =>
    us && c.iso3 !== 'USA' ? `; newest for the United States: ${formatMonth(us.month)}` : '';
  // OECD data via DBnomics: one call at a time, the CPI check after the CLI one.
  let oecdGate: Promise<unknown> = Promise.resolve();
  add('oecd_cli', () => {
    const job = httpCheck(
      { id: 'oecd_cli', name: 'OECD leading indicators (via DBnomics)', group: 'free', feeds: 'Monthly OECD composite leading indicator (amplitude adjusted, 100 = long-term average) for the countries the OECD covers' },
      fetchFn,
      cliUrl({ areas: ['USA', SAMPLE_ISO3] }),
      Math.max(T, 20000),
      (r) => {
        const s = parseCli(r.text);
        const c = cliFor(SAMPLE_ISO3, s) || cliFor('USA', s);
        const us = cliFor('USA', s);
        return c ? `${c.iso3 === SAMPLE_ISO3 ? SAMPLE_NAME : 'United States'} leading indicator ${fmt(c.level, 2)} (${formatMonth(c.month)}${c.phase ? `, ${c.phase}` : ''})${usMonthNote(c, us)}` : null;
      },
      { headers: OECD_HEADERS },
      'DBnomics answered, but with no amplitude-adjusted OECD leading indicator series the app reads (dataset DSD_STES@DF_CLI). The dataset code or dimension names may differ.'
    );
    oecdGate = job;
    return job;
  });

  add('oecd_cpi', () => {
    const job = (async () => {
      await oecdGate.catch(() => undefined);
      await new Promise((r) => setTimeout(r, opts.oecdGapMs ?? 3000));
      return httpCheck(
        { id: 'oecd_cpi', name: 'OECD consumer prices (via DBnomics)', group: 'free', feeds: 'Monthly OECD headline CPI inflation, y/y, for the countries the OECD covers' },
        fetchFn,
        cpiUrl({ areas: ['USA', SAMPLE_ISO3] }),
        Math.max(T, 20000),
        (r) => {
          const s = parseCpi(r.text);
          const c = cpiFor(SAMPLE_ISO3, s) || cpiFor('USA', s);
          const us = cpiFor('USA', s);
          return c ? `${c.iso3 === SAMPLE_ISO3 ? SAMPLE_NAME : 'United States'} inflation ${fmt(c.yoyPct, 1)}% y/y (${formatMonth(c.month)})${usMonthNote(c, us)}` : null;
        },
        { headers: OECD_HEADERS },
        'DBnomics answered, but with no monthly OECD headline CPI growth series the app reads (dataset DSD_PRICES@DF_PRICES_ALL). The dataset code or dimension names may differ.'
      );
    })();
    oecdGate = job;
    return job;
  });

  add('oecd_qna', async () => {
    // Same DBnomics queue as the leading indicator and CPI checks: one call at a time.
    await oecdGate.catch(() => undefined);
    await new Promise((r) => setTimeout(r, opts.oecdGapMs ?? 3000));
    return httpCheck(
      { id: 'oecd_qna', name: 'OECD quarterly GDP (via DBnomics)', group: 'free', feeds: 'Quarterly real GDP growth (q/q and y/y, seasonally adjusted) for the OECD and partner countries, used by the nowcast and forecasts' },
      fetchFn,
      qnaUrl({ areas: ['USA', SAMPLE_ISO3] }),
      Math.max(T, 20000),
      (r) => {
        const s = parseQna(r.text);
        const c = qnaReading(SAMPLE_ISO3, s) || qnaReading('USA', s);
        const us = qnaReading('USA', s);
        if (!c) return null;
        const g = c.qoqPct ?? c.yoyPct!;
        return `${c.iso3 === SAMPLE_ISO3 ? SAMPLE_NAME : 'United States'} real GDP ${fmt(g, 1)}% ${c.qoqPct !== undefined ? 'q/q' : 'y/y'} (${formatQuarter(c.quarter)})${us && c.iso3 !== 'USA' ? `; newest for the United States: ${formatQuarter(us.quarter)}` : ''}`;
      },
      { headers: OECD_HEADERS },
      'DBnomics answered, but with no quarterly real GDP growth series the app reads (dataset DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_OECD). The dataset code or dimension names may differ.'
    );
  });

  add('bcb_ipca', () =>
    httpCheck(
      { id: 'bcb_ipca', name: 'Banco Central do Brasil (SGS)', group: 'free', feeds: "Brazil's monthly IPCA inflation over 12 months, fresher than the OECD mirror" },
      fetchFn,
      bcbSgsUrl(BCB_IPCA_12M, 3),
      T,
      (r) => {
        const pts = parseBcbSgs(parseJson(r.text));
        const last = pts[pts.length - 1];
        return last ? `Brazil IPCA ${fmt(last.value, 2)}% over 12 months (${formatMonth(last.period)})` : null;
      },
      {},
      'The BCB answered, but not with the SGS series 13522 rows the app reads.'
    )
  );

  add('bcrp_embig', async () => {
    // Read once, so a reply the app cannot read is described (empty, a web page, other series).
    let lastText: string | undefined;
    const res = await httpCheck(
      { id: 'bcrp_embig', name: 'Central bank of Peru (BCRPData, EMBIG)', group: 'free', feeds: 'USD bond spread over Treasuries (J.P. Morgan EMBI Global, monthly) for Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru, Venezuela; the free stand-in for CDS, labelled a bond spread' },
      fetchFn,
      bcrpEmbigUrl(now, 6),
      Math.max(T, 20000),
      (r) => {
        lastText = r.text;
        const p = parseBcrpEmbig(r.text, '');
        const c = p?.countries.BRA || (p ? Object.values(p.countries)[0] : undefined);
        return c ? `${c.iso3} USD bond spread ${fmt(c.bps)} bp (${formatMonth(c.period)}), ${Object.keys(p!.countries).length} countries` : null;
      },
      {},
      'BCRP answered, but not with the monthly EMBIG series the app reads (PN43672XM to PN43681XM).'
    );
    return res.state === 'bad_reply' ? { ...res, detail: describeBcrpReply(lastText) } : res;
  });

  add('bcb_ibcbr', () =>
    httpCheck(
      { id: 'bcb_ibcbr', name: 'Banco Central do Brasil IBC-Br (SGS)', group: 'free', feeds: "Brazil's monthly economic activity index, seasonally adjusted, for the GDP nowcast" },
      fetchFn,
      bcbSgsSinceUrl(BCB_IBCBR_SA, `01/01/${year - 1}`),
      T,
      (r) => {
        const s = parseIbcBr(parseJson(r.text));
        const last = s?.points[s.points.length - 1];
        return last ? `Brazil IBC-Br ${fmt(last.value, 1)} (${formatMonth(last.period)}, seasonally adjusted)` : null;
      },
      {},
      'The BCB answered, but not with the SGS series 24364 rows the app reads.'
    )
  );

  add('eurostat_ip', () =>
    httpCheck(
      { id: 'eurostat_ip', name: 'Eurostat industrial production', group: 'free', feeds: 'Monthly industrial production index for EU members (and Turkey where Eurostat has it), for the GDP nowcast' },
      fetchFn,
      eurostatIpUrl(['PL'], `${year - 1}-01`),
      T,
      (r) => {
        const s = parseEurostatIp(parseJson(r.text), ['POL']).POL;
        const last = s?.points[s.points.length - 1];
        return last ? `Poland industrial production ${fmt(last.value, 1)} (${formatMonth(last.period)}, 2021 = 100)` : null;
      },
      {},
      'Eurostat answered, but not with the sts_inpr_m index the app reads (B-D, PRD, SCA, I21).'
    )
  );

  add('eu_surveys', () =>
    httpCheck(
      { id: 'eu_surveys', name: 'EU business and consumer surveys (Eurostat)', group: 'free', feeds: 'Economic sentiment, industry, services and consumer confidence and employment expectations for EU members (not a PMI)' },
      fetchFn,
      euSurveyUrl(EU_SURVEY_INDICATORS[0], ['DE'], `${year - 1}-01`),
      T,
      (r) => {
        const s = parseEuSurvey(parseJson(r.text), ['DEU']).DEU;
        const last = s?.[s.length - 1];
        return last ? `Germany economic sentiment ${fmt(last.value, 1)} (${formatMonth(last.period)}, long-term average = 100)` : null;
      },
      {},
      'Eurostat answered, but not with the ei_bssi_m_r2 sentiment index the app reads (BS-ESI-I, SA).'
    )
  );

  add('eu_price_expectations', () =>
    httpCheck(
      { id: 'eu_price_expectations', name: "EU households' price expectations (Eurostat)", group: 'free', feeds: "Households' expected price trends over the next 12 months for EU members (Behavioural Finance Agent and the inflation_expectations_lead test)" },
      fetchFn,
      euSurveyUrl(EU_PRICE_EXPECTATIONS, ['DE'], `${year - 1}-01`),
      T,
      (r) => {
        const s = parseEuSurvey(parseJson(r.text), ['DEU']).DEU;
        const last = s?.[s.length - 1];
        return last ? `Germany households' expected price trends balance ${fmt(last.value, 1)} (${formatMonth(last.period)})` : null;
      },
      {},
      'Eurostat answered, but not with the ei_bsco_m series the app reads (BS-PT-NY, SA, balance).'
    )
  );

  add('eurostat_hicp_parts', () =>
    httpCheck(
      { id: 'eurostat_hicp_parts', name: 'Eurostat HICP core inflation (special aggregates)', group: 'free', feeds: 'Core inflation, energy and food for EU members (Inflation drivers); the item weights (prc_hicp_inw) are read the same way' },
      fetchFn,
      driversMinrUrl('core', 'DE', `${year - 1}-01`),
      T,
      (r) => {
        const s = parseEurostatHicp(parseJson(r.text)).DE;
        const last = s?.[s.length - 1];
        return last ? `Germany core HICP (TOT_X_NRG_FOOD) ${fmt(last.value, 1)}% y/y (${formatMonth(last.period)})` : null;
      },
      {},
      'Eurostat answered, but prc_hicp_minr has no coicop18 TOT_X_NRG_FOOD series; the panel falls back to prc_hicp_manr, which stopped at December 2025.'
    )
  );

  add('pwt', () =>
    httpCheck(
      { id: 'pwt', name: 'Penn World Table (GGDC)', group: 'free', feeds: 'Capital, hours, human capital and labour share for growth accounting (read once per edition into data/local/pwt/)' },
      fetchFn,
      PWT_URL,
      T,
      (r) => (r.text?.startsWith('PK') ? `${PWT_EDITION} workbook answered (${Math.round(r.text.length / 1e5) / 10} MB)` : null),
      {},
      'The GGDC answered, but not with an Excel workbook at the PWT address; download the Excel file from www.rug.nl/ggdc/productivity/pwt/ and put the .xlsx in data/local/pwt/.'
    )
  );

  add('eurostat_hicp', () =>
    httpCheck(
      { id: 'eurostat_hicp', name: 'Eurostat HICP', group: 'free', feeds: 'Monthly inflation for EU members (Poland on the default lists), fresher than the OECD mirror' },
      fetchFn,
      eurostatHicpUrl(['PL'], 3),
      T,
      (r) => {
        const pts = parseEurostatHicp(parseJson(r.text)).PL;
        const last = pts?.[pts.length - 1];
        return last ? `Poland HICP ${fmt(last.value, 1)}% y/y (${formatMonth(last.period)})` : null;
      },
      {},
      'Eurostat answered, but not with the prc_hicp_minr annual-rate figures the app reads (all items, coicop18 TOTAL).'
    )
  );

  add('comtrade', async () => {
    const key = (env.COMTRADE_API_KEY || '').trim();
    const def: Def = {
      id: 'comtrade',
      name: key ? 'UN Comtrade (your free key)' : 'UN Comtrade (public preview)',
      group: 'free',
      feeds: 'Trade partners (China, Taiwan, Russia, Gulf) and export mix by HS chapter (spillover scenarios)',
      setup: 'Nothing needed: the public preview answers without a key but allows few requests. For higher limits, add a key in Menu > Settings, or COMTRADE_API_KEY="..." (free: comtradeplus.un.org > My Comtrade > My API portal).',
    };
    const reporter = COMTRADE_REPORTERS[SAMPLE_ISO3];
    // The year two back is usually reported; if not, the year before.
    let last: ConnectionResult | null = null;
    for (const yr of comtradeYears(now)) {
      const res = await httpCheck(
        def,
        fetchFn,
        comtradeUrl(reporter, yr, 'partners', !!key),
        Math.max(T, 20000),
        (r) => {
          const p = buildProfile(SAMPLE_ISO3, parseComtrade(parseJson(r.text)));
          return p ? `${SAMPLE_NAME}: ${partnerSentence(p).replace(/\.$/, '')}` : null;
        },
        key ? { headers: { 'Ocp-Apim-Subscription-Key': key } } : undefined,
        `Comtrade answered, but with no ${SAMPLE_NAME} trade totals for ${yr} the app could read.`
      );
      last = res;
      if (res.state !== 'bad_reply') break;
    }
    const res = last!;
    if (key && res.state === 'refused' && (res.httpStatus === 401 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `Comtrade did not accept ${keyPhrase('COMTRADE_API_KEY')} (HTTP ${res.httpStatus}). Remove it to use the public preview.` };
    }
    if (!key && res.state === 'refused' && res.httpStatus === 429) {
      return { ...res, detail: `${res.detail} The public preview allows few requests; a free key (Menu > Settings or COMTRADE_API_KEY) gives more.` };
    }
    return savedNote('COMTRADE_API_KEY', { ...res, detail: key ? res.detail.split(key).join('***') : res.detail });
  });

  add('fred_csv', () =>
    httpCheck(
      { id: 'fred_csv', name: 'FRED download (no key)', group: 'free', feeds: '10Y yields: US, Mexico, South Africa, Japan, UK, Poland, Chile' },
      fetchFn,
      fredCsvUrl(US_10Y_SERIES, now),
      T,
      (r) => {
        const o = parseFredCsvLatest(r.text || '', US_10Y_SERIES);
        return o ? `US 10Y ${fmt(o.valuePct, 2)}% (${o.period})` : null;
      }
    )
  );

  add('fed_h10', () =>
    httpCheck(
      { id: 'fed_h10', name: 'Fed H.10 exchange rates (FRED download)', group: 'free', feeds: 'Monthly exchange rates since 1990 for the scenario replays (saved by the daily download)' },
      fetchFn,
      fredCsvUrl('EXBZUS', now),
      T,
      (r) => {
        const obs = parseFredCsvSeries(r.text || '');
        const last = obs[obs.length - 1];
        return last ? `Brazil ${fmt(last.value, 4)} reais per US dollar (${last.date.slice(0, 7)})` : null;
      }
    )
  );

  add('chinn_ito', () =>
    httpCheck(
      { id: 'chinn_ito', name: 'Chinn-Ito capital account openness index (authors\' page)', group: 'free', feeds: 'Capital account openness by country, yearly since 1970, for the country risk scorecard (file saved by the daily download)' },
      fetchFn,
      CHINN_ITO_PAGE,
      T,
      (r) => {
        const links = chinnItoLinks(r.text || '');
        return links.length ? `Newest file linked: ${links[0]!.split('/').pop()}` : null;
      },
      undefined,
      'The page answered but links no kaopen_<year>.xls file. The authors may have moved it; download it by hand into data/local/chinn-ito/.'
    )
  );

  add('tesouro', () =>
    httpCheck(
      { id: 'tesouro', name: 'Brazil Treasury (Tesouro Direto)', group: 'free', feeds: 'Brazil 10Y yield (NTN-F)' },
      fetchFn,
      TESOURO_DIRETO_CSV_URL,
      // The whole history, about 15 MB from a slow server: 60 s on Sam's Mac (2026-11-05).
      Math.max(T, 90000),
      (r) => {
        const o = parseTesouroDiretoLatest(r.text || '');
        return o ? `Brazil NTN-F ${fmt(o.valuePct, 2)}% (${o.period})` : null;
      }
    )
  );

  // Layout probes (not verified from the cloud session): on a bad reply the start of the reply is
  // shown, so the format can be confirmed from one run of npm run check:data.
  const replyStart = (t: string | undefined) => (t ? ` Start of the reply: ${t.replace(/\s+/g, ' ').slice(0, 300)}` : '');
  add('ecb_spf', async () => {
    let lastText: string | undefined;
    const key = ECB_SPF_SERIES[2].key;
    const res = await httpCheck(
      { id: 'ecb_spf', name: 'ECB Survey of Professional Forecasters', group: 'free', feeds: 'Euro-area HICP inflation expected one year, two years and longer term ahead (quarterly)' },
      fetchFn,
      ecbSpfUrl(key),
      Math.max(T, 15000),
      (r) => {
        lastText = r.text;
        const obs = parseEcbCsv(r.text || '');
        const last = obs[obs.length - 1];
        return last ? `SPF longer-term HICP ${fmt(last.value, 2)}% (${last.date}), ${obs.length} quarters` : null;
      },
      {},
      `The ECB answered, but not with TIME_PERIOD and OBS_VALUE columns for SPF.${key}.`
    );
    return res.state === 'bad_reply' || res.state === 'refused' ? { ...res, detail: `${res.detail}${replyStart(lastText)}` } : res;
  });

  add('bcb_focus', async () => {
    let lastText: string | undefined;
    const res = await httpCheck(
      { id: 'bcb_focus', name: 'Banco Central do Brasil Focus survey (Olinda)', group: 'free', feeds: "Brazil's market median for IPCA inflation over the next 12 months" },
      fetchFn,
      FOCUS_URL,
      Math.max(T, 30000),
      (r) => {
        lastText = r.text;
        const obs = parseFocus12m(parseJson(r.text));
        const last = obs[obs.length - 1];
        return last ? `Focus IPCA 12 months ahead ${fmt(last.value, 2)}% (${last.date}), ${obs.length} survey dates` : null;
      },
      {},
      'The BCB answered, but without the IPCA medians (Indicador, Data, Mediana) the app reads.'
    );
    return res.state === 'bad_reply' || res.state === 'refused' ? { ...res, detail: `${res.detail}${replyStart(lastText)}` } : res;
  });

  add('nyfed_gscpi', async () => {
    const def: Def = { id: 'nyfed_gscpi', name: 'NY Fed Global Supply Chain Pressure Index', group: 'free', feeds: 'Monthly supply chain pressure index (scenario factor and world series), an Excel 97 file' };
    const started = Date.now();
    try {
      const res = await fetchFn(GSCPI_URLS.csv, { signal: AbortSignal.timeout(Math.max(T, 20000)) });
      const latencyMs = Date.now() - started;
      if (!res.ok) return { ...setRow(def, 'refused', `HTTP ${res.status}`, 'www.newyorkfed.org'), httpStatus: res.status, latencyMs };
      const got = await gscpiFromBytes(new Uint8Array(await res.arrayBuffer()), now);
      if ('reason' in got) return { ...setRow(def, 'bad_reply', `${got.reason}.`, 'www.newyorkfed.org'), latencyMs };
      const last = got.obs[got.obs.length - 1];
      return { ...setRow(def, 'connected', `Answered in ${latencyMs} ms.`, 'www.newyorkfed.org'), latencyMs, sample: `GSCPI ${fmt(last.value, 2)} (${last.date.slice(0, 7)}), ${got.obs.length} months` };
    } catch (e) {
      return setRow(def, 'no_answer', (e as Error).message || 'No answer', 'www.newyorkfed.org');
    }
  });

  add('imf_portwatch', async () => {
    let lastText: string | undefined;
    const res = await httpCheck(
      { id: 'imf_portwatch', name: 'IMF PortWatch', group: 'free', feeds: 'Ships through eight chokepoints (world series) and each country\'s port activity, monthly averages of daily data' },
      fetchFn,
      chokepointsUrl(),
      Math.max(T, 25000),
      (r) => {
        lastText = r.text;
        const map = parsePortWatchStats(JSON.parse(r.text || 'null'), ['ships', 'volume']);
        const suez = map.get('chokepoint1');
        const last = suez?.[suez.length - 1];
        return last ? `Suez Canal ${fmt(last.sums.ships / last.lastDay, 1)} ships/day (${last.month}, to day ${last.lastDay}), ${map.size} chokepoints, ${suez!.length} months` : null;
      },
      {},
      'PortWatch answered, but without the monthly sums (portid, year, month, ships) the app asks for.'
    );
    return res.state === 'bad_reply' || res.state === 'refused' ? { ...res, detail: `${res.detail}${replyStart(lastText)}` } : res;
  });

  // ---- Free with your own key -----------------------------------------------------------------
  add('fred_api', async () => {
    const def: Def = {
      id: 'fred_api',
      name: 'FRED API (free key)',
      group: 'free_key',
      feeds: 'Same yields as the FRED download, through the official API',
      setup: 'Menu > Settings > API keys, or FRED_API_KEY="..." in .env (free: fred.stlouisfed.org > My Account > API Keys). Without it the app uses the FRED download.',
    };
    const key = (env.FRED_API_KEY || '').trim();
    if (!key) return setRow(def, 'optional', 'No key set. The app uses the FRED download instead, which needs no key.', 'api.stlouisfed.org');
    const res = await httpCheck(def, fetchFn, fredApiUrl(US_10Y_SERIES, key), T, (r) => {
      const o = parseFredApiLatest(parseJson(r.text), US_10Y_SERIES);
      return o ? `US 10Y ${fmt(o.valuePct, 2)}% (${o.period})` : null;
    });
    if (res.state === 'refused' && (res.httpStatus === 400 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `FRED did not accept ${keyPhrase('FRED_API_KEY')} (HTTP ${res.httpStatus}). Check it was copied in full. The app falls back to the FRED download meanwhile.` };
    }
    return savedNote('FRED_API_KEY', res);
  });

  add('evds', async () => {
    const def: Def = {
      id: 'evds',
      name: 'Turkey central bank (EVDS)',
      group: 'free_key',
      feeds: 'Turkey monthly CPI inflation; Turkey 10Y yield once its series code is set',
      setup: 'Menu > Settings > Data API keys, or in .env: EVDS_API_KEY="..." (free: evds3.tcmb.gov.tr > profile > API key). For the 10Y yield also EVDS_TR10Y_SERIES="TP...." (the 10Y bond series code in EVDS).',
    };
    const key = (env.EVDS_API_KEY || '').trim();
    const series = (env.EVDS_TR10Y_SERIES || '').trim();
    const cpiSeries = (env.EVDS_TR_CPI_SERIES || '').trim() || EVDS_CPI_DEFAULT_SERIES;
    if (!key && !series) return setRow(def, 'needs_setup', "Not set up. Turkey's 10Y yield reads Missing and Turkey's inflation stays on the OECD series until it is.", 'evds3.tcmb.gov.tr');
    if (!key) return setRow(def, 'needs_setup', 'The 10Y series code is set but the EVDS key is empty (Menu > Settings or EVDS_API_KEY).', 'evds3.tcmb.gov.tr');
    if (series && !isValidEvdsSeriesCode(series)) return setRow(def, 'needs_setup', `EVDS_TR10Y_SERIES "${series}" is not a series code (it starts with "TP.").`, 'evds3.tcmb.gov.tr');
    if (!isValidEvdsSeriesCode(cpiSeries)) return setRow(def, 'needs_setup', `EVDS_TR_CPI_SERIES "${cpiSeries}" is not a series code (it starts with "TP."). Leave it empty to use ${EVDS_CPI_DEFAULT_SERIES}.`, 'evds3.tcmb.gov.tr');
    const headers = { key, Accept: 'application/json' };
    let cpiNote = '';
    const res = await httpCheck(def, fetchFn, evdsCpiUrl(cpiSeries, now), T, (r) => {
      const pts = parseEvdsCpiYoy(parseJson(r.text), cpiSeries);
      const last = pts[pts.length - 1];
      if (!last) return null;
      cpiNote = `Turkey CPI ${fmt(last.value, 2)}% over 12 months (${formatMonth(last.period)})`;
      return cpiNote;
    }, { headers }, `EVDS answered, but CPI series ${cpiSeries} had no 12 months of values. Set the CPI index series code in Menu > Settings.`);
    if (res.state === 'refused' && (res.httpStatus === 401 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `EVDS did not accept ${keyPhrase('EVDS_API_KEY')} (HTTP ${res.httpStatus}).` };
    }
    if (res.state !== 'connected' && res.state !== 'bad_reply') return savedNote('EVDS_API_KEY', res);
    if (!series) {
      return savedNote('EVDS_API_KEY', { ...res, detail: `${res.detail} The 10Y series code is empty, so Turkey's 10Y yield reads Missing (Menu > Settings or EVDS_TR10Y_SERIES).` });
    }
    const y = await httpCheck(def, fetchFn, evdsSeriesUrl(series, now), T, (r) => {
      const o = parseEvdsLatest(parseJson(r.text), series);
      return o ? `Turkey 10Y ${fmt(o.valuePct, 2)}% (${o.period})` : null;
    }, { headers }, `EVDS answered, but series ${series} had no recent values. Check the series code.`);
    if (y.state !== 'connected') return savedNote('EVDS_API_KEY', { ...y, detail: res.state === 'connected' ? `${y.detail} (${cpiNote} read fine.)` : y.detail });
    const sample = [cpiNote, y.sample].filter(Boolean).join('; ');
    return savedNote('EVDS_API_KEY', { ...y, ...(sample ? { sample } : {}), detail: res.state === 'connected' ? y.detail : `${y.detail} ${res.detail}` });
  });

  add('banxico', async () => {
    const def: Def = {
      id: 'banxico',
      name: 'Banco de México (SIE)',
      group: 'free_key',
      feeds: "Mexico's monthly INPC inflation over 12 months, fresher than the OECD mirror",
      setup: 'Menu > Settings > Data API keys, or BANXICO_TOKEN="..." in .env (free: banxico.org.mx/SieAPIRest/service/v1/token). Without it Mexico keeps the OECD inflation series.',
    };
    const token = (env.BANXICO_TOKEN || '').trim();
    if (!token) return setRow(def, 'optional', 'No token set. Mexico keeps the OECD inflation series, which lags five to six months.', 'www.banxico.org.mx');
    const res = await httpCheck(def, fetchFn, banxicoSeriesUrl([BANXICO_CPI_SERIES], now, 3), T, (r) => {
      const pts = parseBanxicoMonthly(parseJson(r.text), BANXICO_CPI_SERIES);
      const last = pts[pts.length - 1];
      return last ? `Mexico INPC ${fmt(last.value, 2)}% over 12 months (${formatMonth(last.period)})` : null;
    }, { headers: banxicoHeaders(token) }, `Banxico answered, but not with the SIE series ${BANXICO_CPI_SERIES} rows the app reads.`);
    if (res.state === 'refused' && (res.httpStatus === 401 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `Banxico did not accept ${keyPhrase('BANXICO_TOKEN')} (HTTP ${res.httpStatus}). Check it was copied in full.` };
    }
    return savedNote('BANXICO_TOKEN', res);
  });

  add('acled', async () => {
    const def: Def = {
      id: 'acled',
      name: 'ACLED (conflict events)',
      group: 'free_key',
      feeds: 'Conflict events per country over twelve months, for the Politics & Events Agent',
      setup: 'Menu > Settings > Data API keys, or in .env: ACLED_EMAIL="..." and ACLED_PASSWORD="..." (free for non-commercial use; the API needs a myACLED Research-level account).',
    };
    const email = (env.ACLED_EMAIL || '').trim();
    const password = env.ACLED_PASSWORD || '';
    if (!email && !password) return setRow(def, 'needs_setup', 'Not set up. The conflict figures read Missing until it is.', 'acleddata.com');
    if (!email || !password) return setRow(def, 'needs_setup', `The ACLED ${email ? 'password' : 'email'} is empty (Menu > Settings or ${email ? 'ACLED_PASSWORD' : 'ACLED_EMAIL'}).`, 'acleddata.com');
    let bearer = '';
    const tok = await httpCheck(def, fetchFn, ACLED_TOKEN_URL, T, (r) => {
      const t = (parseJson(r.text) as { access_token?: unknown } | null)?.access_token;
      bearer = typeof t === 'string' ? t : '';
      return bearer ? 'signed in' : null;
    }, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: acledTokenBody(email, password).toString() }, 'ACLED answered the sign-in, but without an access token.');
    if (tok.state === 'refused' && [400, 401, 403].includes(tok.httpStatus || 0)) {
      return { ...tok, state: 'needs_setup', detail: `ACLED did not accept the email and password${opts.keySources?.ACLED_PASSWORD === 'app' ? ' saved in Settings' : ' in ACLED_EMAIL / ACLED_PASSWORD'} (HTTP ${tok.httpStatus}).` };
    }
    if (tok.state !== 'connected') return tok;
    // A token alone does not prove API access: Open accounts sign in but cannot read events.
    const read = await httpCheck(def, fetchFn, acledReadUrl('Mexico', now).replace(/limit=\d+/, 'limit=5'), T, (r) => {
      const rows = parseAcledPage(parseJson(r.text));
      if (!rows) return null;
      const last = rows.reduce((m, x) => (x.event_date > m ? x.event_date : m), '');
      return rows.length ? `Mexico events read, newest ${last}` : 'API answered (no Mexico events in the window)';
    }, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } }, 'ACLED answered, but not with the event rows the app reads.');
    if (read.state === 'refused' && (read.httpStatus === 401 || read.httpStatus === 403)) {
      return { ...read, state: 'needs_setup', detail: 'Signed in, but ACLED did not allow API access for this account. Open accounts (public email such as gmail.com) get aggregated downloads only; the API needs the Research level.' };
    }
    return read.state === 'connected' && opts.keySources?.ACLED_PASSWORD === 'app' ? { ...read, detail: `${read.detail} (account saved in Settings)` } : read;
  });

  add('acled_files', async () => {
    const def: Def = {
      id: 'acled_files',
      name: 'ACLED aggregated files (downloaded)',
      group: 'free',
      feeds: 'Conflict events per country over twelve months, for the Politics & Events Agent, when no ACLED API reading is on hand',
      setup: `Log in at ${ACLED_AGGREGATED_PAGE} (a free registered myACLED account is enough), download your region's aggregated file and put it, as downloaded (.xlsx or .csv, zipped or not), in ${ACLED_FOLDER}. Nothing is fetched. The API reading, when your account has one, wins.`,
    };
    const host = 'your files';
    if (!opts.acledFiles) return setRow(def, 'optional', `The folder ${ACLED_FOLDER} was not checked from here.`, host);
    let data: AcledFileData | null;
    try {
      data = opts.acledFiles();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The ACLED folder could not be read (${err?.message || err}).`, host);
    }
    const skipped = data?.skipped.length ? `Not read: ${data.skipped.map((s) => `${s.file} (${s.reason})`).join('; ')}.` : '';
    if (!data || !data.files.length) return setRow(def, 'optional', `No ACLED aggregated file in ${ACLED_FOLDER}.${skipped ? ` ${skipped}` : ''}`, host);
    const read = data.files.map((f) => `${f.file} (${f.countries} countries, weeks ${f.firstWeek} to ${f.lastWeek}, ${f.rows} rows)`);
    const first = [...data.countries.values()][0];
    const r = first ? acledFileReading(data, first.name, now) : null;
    const sample = r ? `${r.country}: ${r.total.events} events, ${r.total.fatalities} fatalities, ${r.total.from} to ${r.total.to}` : undefined;
    return { ...setRow(def, 'connected', `Read ${read.join('; ')}.`, host), ...(sample ? { sample } : {}), ...(skipped ? { warning: skipped } : {}) };
  });

  add('aiddata_file', async () => {
    const def: Def = {
      id: 'aiddata_file',
      name: 'AidData China lending file (downloaded)',
      group: 'free',
      feeds: 'Official loan commitments from China by borrowing country, for the issuer brief and the Fiscal & Debt Agent',
      setup: AIDDATA_SETUP_HELP,
    };
    const host = 'your files';
    if (!opts.aiddata) return setRow(def, 'optional', 'The folder data/local/aiddata/ was not checked from here.', host);
    let data: AiddataData | null;
    try {
      data = opts.aiddata();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The AidData folder could not be read (${err?.message || err}).`, host);
    }
    const skipped = data?.skipped.length ? `Not read: ${data.skipped.map((s) => `${s.file} (${s.reason})`).join('; ')}.` : '';
    if (!data?.table) return setRow(def, 'optional', `No AidData file in data/local/aiddata/.${skipped ? ` ${skipped}` : ''}`, host);
    const t = data.table;
    const first = [...t.countries.entries()].sort((a, b) => b[1].totalUsdBn - a[1].totalUsdBn)[0];
    return {
      ...setRow(def, 'connected', `Read ${t.file}: loans to ${t.countries.size} countries, to ${t.fileLastYear}.`, host),
      ...(first ? { sample: `${first[0]}: ${chinaValue(first[1])}` } : {}),
      ...(skipped ? { warning: skipped } : {}),
    };
  });

  add('imf_investor_base', async () => {
    const def: Def = {
      id: 'imf_investor_base',
      name: 'IMF sovereign debt investor base (downloaded)',
      group: 'free',
      feeds: 'Who holds government debt (foreign, central bank, banks, others), for the country brief and the Fiscal & Debt Agent',
      setup: INVESTOR_BASE_SETUP_HELP,
    };
    const host = 'your files';
    if (!opts.investorBase) return setRow(def, 'optional', 'The folder data/local/imf-investor-base/ was not checked from here.', host);
    let data: import('./investorBaseStore').InvestorBaseData | null;
    try {
      data = opts.investorBase();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The investor base folder could not be read (${err?.message || err}).`, host);
    }
    const skipped = data?.skipped.length ? `Not read: ${data.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}.` : '';
    if (!data?.table) return setRow(def, 'optional', `No IMF investor base file in data/local/imf-investor-base/.${skipped ? ` ${skipped}` : ''}`, host);
    const t = data.table;
    const sample = t.countries.get('BRA') ?? [...t.countries.values()][0];
    return {
      ...setRow(def, 'connected', `Read ${t.file}${t.version ? ` (version of ${t.version})` : ''}: ${t.countries.size} countries, to ${t.lastYear}.`, host),
      ...(sample ? { sample: `${t.countries.get('BRA') ? 'BRA' : [...t.countries.keys()][0]}: ${investorBaseValue(sample, t.lastYear)}` } : {}),
      ...(skipped ? { warning: skipped } : {}),
    };
  });

  add('imf_fiscal_rules', async () => {
    const def: Def = {
      id: 'imf_fiscal_rules',
      name: 'IMF Fiscal Rules Dataset (downloaded)',
      group: 'free',
      feeds: 'National fiscal rules (expenditure, revenue, budget balance, debt) and since when, for the Fiscal rules check',
      setup: FISCAL_RULES_SETUP_HELP,
    };
    const host = 'your files';
    if (!opts.fiscalRules) return setRow(def, 'optional', 'The folder data/local/imf-fiscal-rules/ was not checked from here.', host);
    let data: import('./fiscalRulesStore').FiscalRulesData | null;
    try {
      data = opts.fiscalRules();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The fiscal rules folder could not be read (${err?.message || err}).`, host);
    }
    const skipped = data?.skipped.length ? `Not read: ${data.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}.` : '';
    if (!data?.table) return setRow(def, 'optional', `No IMF Fiscal Rules Dataset in data/local/imf-fiscal-rules/.${skipped ? ` ${skipped}` : ''}`, host);
    const t = data.table;
    const code = t.countries.has('CHL') ? 'CHL' : [...t.countries.keys()][0];
    const c = t.countries.get(code);
    const unmatched = t.unmatched.length ? `Names not matched to a country: ${t.unmatched.slice(0, 12).join(', ')}${t.unmatched.length > 12 ? ` and ${t.unmatched.length - 12} more` : ''}.` : '';
    const warning = [skipped, unmatched].filter(Boolean).join(' ');
    return {
      ...setRow(def, 'connected', `Read ${t.file}: ${t.countries.size} countries, ${t.firstYear}-${t.lastYear}.`, host),
      ...(c ? { sample: `${code} ${c.year}: ${RULE_KINDS.filter((k) => c.has[k]).map((k) => RULE_KIND_NAME[k]).join(', ') || 'no rule'}` } : {}),
      ...(warning ? { warning } : {}),
    };
  });

  add('dpi', async () => {
    const def: Def = {
      id: 'dpi',
      name: 'Database of Political Institutions (downloaded)',
      group: 'free',
      feeds: 'Checks and balances, fractionalisation, polarisation and years left in the term, for Political feasibility in Policy review',
      setup: DPI_SETUP_HELP,
    };
    const host = 'your files';
    if (!opts.dpi) return setRow(def, 'optional', 'The folder data/local/dpi/ was not checked from here.', host);
    let data: import('./dpiStore').DpiData | null;
    try {
      data = opts.dpi();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The DPI folder could not be read (${err?.message || err}).`, host);
    }
    const skipped = data?.skipped.length ? `Not read: ${data.skipped.map((x) => `${x.file} (${x.reason})`).join('; ')}.` : '';
    if (!data?.table) return setRow(def, 'optional', `No Database of Political Institutions file in data/local/dpi/.${skipped ? ` ${skipped}` : ''}`, host);
    const t = data.table;
    const code = t.countries.has('BRA') ? 'BRA' : [...t.countries.keys()][0];
    const row = t.countries.get(code)?.slice(-1)[0];
    return {
      ...setRow(def, 'connected', `Read ${t.file}: ${t.countries.size} countries, ${t.firstYear}-${t.lastYear}.`, host),
      ...(row ? { sample: `${code} ${row.year}: ${Object.entries(row.values).map(([k, v]) => `${k} ${v}`).join(', ')}` } : {}),
      ...(skipped ? { warning: skipped } : {}),
    };
  });

  add('eia', async () => {
    const def: Def = {
      id: 'eia',
      name: 'US EIA oil prices (free key)',
      group: 'free_key',
      feeds: 'Daily Brent and WTI spot prices (spillover scenarios)',
      setup: 'Menu > Settings > Data API keys, or EIA_API_KEY="..." in .env (free: eia.gov/opendata > Register). Without it oil comes monthly from the World Bank Pink Sheet.',
    };
    const key = (env.EIA_API_KEY || '').trim();
    if (!key) return setRow(def, 'optional', 'No key set. Oil comes monthly from the World Bank Pink Sheet instead.', 'api.eia.gov');
    const res = await httpCheck(def, fetchFn, eiaSpotUrl(key, now), Math.max(T, 20000), (r) => {
      const s = parseEiaSpot(parseJson(r.text)).get('RBRTE');
      const mv = s ? priceMove(s) : null;
      return mv ? moveSentence(mv).replace(/\.$/, '') : null;
    }, undefined, 'EIA answered, but with no Brent rows the app could read. The route or series code may have changed.');
    if (res.state === 'refused' && (res.httpStatus === 401 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `EIA did not accept ${keyPhrase('EIA_API_KEY')} (HTTP ${res.httpStatus}). Oil comes monthly from the Pink Sheet meanwhile.` };
    }
    // Never echo the key: EIA puts it in the URL, so make sure no reply text carries it.
    return savedNote('EIA_API_KEY', { ...res, detail: res.detail.split(key).join('***') });
  });

  // UCDP: downloaded CSV files in data/local/ucdp/, read from disk (Sam, 2026-11-06: no live pulls).
  add('ucdp', async () => {
    const def: Def = {
      id: 'ucdp',
      name: 'UCDP conflict data (downloaded files)',
      group: 'free',
      feeds: 'Armed conflicts, battle deaths, non-state and one-sided violence per country and year (Politics & Events Agent)',
      setup: `Download the CSV files from ${UCDP_DOWNLOADS_PAGE} (UCDP/PRIO Armed Conflict, Battle-Related Deaths conflict level, Non-State, One-Sided, Dyadic) and put them, zipped or not, in ${UCDP_FOLDER}. Nothing is fetched.`,
    };
    const host = 'your files';
    if (!opts.ucdp) return setRow(def, 'needs_setup', `The folder ${UCDP_FOLDER} was not checked from here.`, host);
    let data: UcdpData | null;
    try {
      data = opts.ucdp();
    } catch (err: any) {
      return setRow(def, 'bad_reply', `The UCDP folder could not be read (${err?.message || err}).`, host);
    }
    const files = data ? UCDP_DATASET_IDS.filter((d) => data!.files[d]) : [];
    if (!data || !files.length) {
      const skipped = data?.skipped.length ? ` Not read: ${data.skipped.map((s) => `${s.file} (${s.reason})`).join('; ')}.` : '';
      return setRow(def, 'needs_setup', `No UCDP files in ${UCDP_FOLDER}.${skipped}`, host);
    }
    const missing = UCDP_DATASET_IDS.filter((d) => !data!.files[d]);
    const read = files.map((d) => { const f = data!.files[d]!; return `${UCDP_DATASETS[d].name} ${f.version} (${f.minYear}-${f.maxYear}, ${f.rows} rows)`; });
    if (data.candidate) read.push(`UCDP Candidate Events ${data.candidate.versions.join(', ')} (${data.candidate.events.size} events, preliminary)`);
    const r = ucdpReading(data, SAMPLE_ISO3);
    const latest = r?.latest;
    const sample = latest
      ? `${SAMPLE_NAME} ${latest.year}: ${latest.conflicts ? `${latest.conflicts.n} armed conflicts` : ''}${latest.totalBest !== undefined ? `${latest.conflicts ? ', ' : ''}${latest.totalBest} deaths from organised violence` : ''}`.replace(/: $/, ': read')
      : undefined;
    const warnings = [
      missing.length ? `Not added: ${missing.map((d) => UCDP_DATASETS[d].name).join(', ')}.` : '',
      data.skipped.length ? `Not read: ${data.skipped.map((s) => `${s.file} (${s.reason})`).join('; ')}.` : '',
      Object.keys(data.unknownCodes).length ? `Country codes the app has no country for: ${Object.keys(data.unknownCodes).slice(0, 8).join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    return { ...setRow(def, 'connected', `Read ${read.join('; ')}.`, host), ...(sample ? { sample } : {}), ...(warnings ? { warning: warnings } : {}) };
  });

  // ---- Your own paid account (off unless switched on) -------------------------------------------
  add('own_cds', async () => {
    const def: Def = {
      id: 'own_cds',
      name: 'Your CDS data (file or LSEG)',
      group: 'own_account',
      feeds: '5Y sovereign CDS (no free source exists)',
      setup:
        'Menu > Settings > Your own paid data, or in .env. File: CDS_FEED="csv" and CDS_CSV_PATH="/full/path/cds.csv" with columns iso3,date,cds5y_bps,source. ' +
        'LSEG: CDS_FEED="lseg" with LSEG_APP_KEY, LSEG_USERNAME, LSEG_PASSWORD and LSEG_CDS_RICS="BRA=<ric>,TUR=<ric>".',
    };
    const feed = (env.CDS_FEED || '').trim().toLowerCase();
    if (!feed || feed === 'off') return setRow(def, 'off', 'Off. CDS reads Missing until you connect your own licensed data.', 'your file or LSEG');
    if (feed !== 'csv' && feed !== 'lseg') return setRow(def, 'needs_setup', `CDS_FEED is "${feed}"; it must be "csv" or "lseg".`, 'your file or LSEG');
    const cfg = ownCdsSettings(env);
    if (feed === 'csv') {
      const p = (env.CDS_CSV_PATH || '').trim();
      if (!cfg?.csvPath) return setRow(def, 'needs_setup', 'CDS_FEED is "csv" but CDS_CSV_PATH is empty.', 'your file');
      const file = opts.readFile ? opts.readFile(cfg.csvPath) : null;
      if (!file) return setRow(def, 'needs_setup', `No file at CDS_CSV_PATH (${p}). Use the full path, starting with /.`, 'your file');
      const quotes = parseOwnCdsCsv(file.text);
      if (quotes.size === 0) return setRow(def, 'bad_reply', 'The file was read but no rows were usable. The header must be iso3,date,cds5y_bps,source.', 'your file');
      const latest = [...quotes.values()].map((q) => q.date).sort().pop()!;
      const ageDays = Math.floor((now.getTime() - Date.parse(latest)) / 86400000);
      const first = [...quotes.values()][0];
      return {
        ...setRow(def, 'connected', `Read ${quotes.size} ${quotes.size === 1 ? 'country' : 'countries'} from your file; latest quote ${latest}.`, 'your file'),
        sample: `${first.iso3} 5Y CDS ${fmt(first.bps)} bp (${first.date}, ${first.source})`,
        ...(ageDays > 7 ? { warning: `The latest quote is ${ageDays} days old. Export a fresh file to keep CDS current.` } : {}),
      };
    }
    // LSEG
    if (!cfg?.lseg) {
      const missing = ['LSEG_APP_KEY', 'LSEG_USERNAME', 'LSEG_PASSWORD', 'LSEG_CDS_RICS'].filter((k) => !(env[k] || '').trim());
      return setRow(def, 'needs_setup', `CDS_FEED is "lseg" but ${missing.length ? missing.join(', ') : 'LSEG_CDS_RICS (as ISO3=RIC pairs)'} ${missing.length > 1 ? 'are' : 'is'} not set.`, 'api.refinitiv.com');
    }
    const tokReq = lsegTokenRequest(cfg.lseg);
    const tok = await probe(fetchFn, tokReq.url, T, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokReq.body });
    const host = hostOf(tokReq.url);
    if (tok.networkError) return { ...setRow(def, 'no_answer', `LSEG sign-in: ${tok.networkError}`, host), latencyMs: tok.latencyMs };
    if (!tok.ok) return { ...setRow(def, tok.status === 400 || tok.status === 401 ? 'needs_setup' : 'refused', `LSEG sign-in refused (HTTP ${tok.status}). Check LSEG_APP_KEY, LSEG_USERNAME and LSEG_PASSWORD.`, host), httpStatus: tok.status };
    const token = (parseJson(tok.text) as { access_token?: string })?.access_token;
    if (!token) return setRow(def, 'bad_reply', 'LSEG sign-in answered without a token.', host);
    return httpCheck(def, fetchFn, lsegSnapshotUrl(cfg.lseg), T, (r) => {
      const q = parseLsegSnapshot(parseJson(r.text), cfg.lseg!.rics, now.toISOString().slice(0, 10));
      if (!q.size) return null;
      const first = [...q.values()][0];
      return `${q.size} of ${Object.keys(cfg.lseg!.rics).length} RICs priced; ${first.iso3} ${fmt(first.bps)} bp`;
    }, { headers: { Authorization: `Bearer ${token}` } }, 'LSEG answered but none of the RICs in LSEG_CDS_RICS had a price. Check the RICs against your entitlement.');
  });

  // Your paid data subscription (src/engine/paidData.ts): never fetches a figure here and never
  // prints a sign-in detail, only whether it is switched on, set up and how many series are mapped.
  add('paid_data', async () => {
    const def: Def = {
      id: 'paid_data',
      name: 'Your data subscription (Macrobond, Haver, Moody\'s)',
      group: 'own_account',
      feeds: 'Series you map from a paid data service you already subscribe to; never passed on',
      setup: 'Menu > Settings > Your subscriptions, or PAID_DATA_VENDOR in .env with the vendor\'s sign-in details. Then map the vendor series codes you want there.',
    };
    const vendor = paidVendorFromEnv(env);
    const raw = (env.PAID_DATA_VENDOR || '').trim().toLowerCase();
    if (!vendor) {
      if (raw && raw !== 'off') return setRow(def, 'needs_setup', `PAID_DATA_VENDOR is "${raw}"; it must be off, macrobond, haver or moodys.`, 'your subscription');
      return setRow(def, 'off', 'Off. The app uses free sources only.', 'your subscription');
    }
    const mapped = parsePaidMappings(opts.paidMappingsText?.() ?? null).filter((m) => m.vendor === vendor.id).length;
    const series = `${mapped} series mapped`;
    const missingCreds = vendor.credentialIds.filter((k) => !(env[k] || '').trim());
    if (missingCreds.length) return setRow(def, 'needs_setup', `Switched on for ${vendor.name} (${series}), but ${missingCreds.join(' and ')} ${missingCreds.length > 1 ? 'are' : 'is'} not set.`, 'your subscription');
    if (!vendor.adapterBuilt)
      return setRow(def, 'needs_setup', `Switched on for ${vendor.name} (${series}), but the app cannot fetch from ${vendor.name} yet: that part is planned as data plan change ${vendor.plannedIn}. Nothing is fetched until then.`, 'your subscription');
    // Macrobond (src/engine/macrobond.ts): sign in, then read the first mapped series. Only counts
    // and dates are reported: never a figure, the client ID or the secret.
    const creds = macrobondCredentials(env)!;
    const host = 'apiauth.macrobondfinancial.com';
    const disc = await probe(fetchFn, `${MACROBOND_AUTH_URL}.well-known/openid-configuration`, T);
    if (disc.networkError) return { ...setRow(def, 'no_answer', `Macrobond sign-in: ${disc.networkError}`, host), latencyMs: disc.latencyMs };
    const tokenUrl = String((parseJson(disc.text) as { token_endpoint?: unknown })?.token_endpoint || '');
    if (!disc.ok || !/^https:\/\//.test(tokenUrl)) return setRow(def, 'bad_reply', `Macrobond's sign-in address lookup did not give a token address (HTTP ${disc.status}).`, host);
    const tok = await probe(fetchFn, tokenUrl, T, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: macrobondTokenBody(creds) });
    if (tok.networkError) return { ...setRow(def, 'no_answer', `Macrobond sign-in: ${tok.networkError}`, host), latencyMs: tok.latencyMs };
    const signed = readMacrobondToken(tok.status ?? 0, tok.text ?? '', now.getTime());
    if ('error' in signed) return { ...setRow(def, signed.badCredentials ? 'needs_setup' : 'refused', `${signed.error}.`, host), httpStatus: tok.status };
    const first = parsePaidMappings(opts.paidMappingsText?.() ?? null).find((m) => m.vendor === vendor.id);
    if (!first) return setRow(def, 'needs_setup', `Signed in to ${vendor.name}, but no series are mapped yet. Map them under Menu > Settings > Your subscriptions.`, host);
    const got = await probe(fetchFn, macrobondFetchUrl([first.code]), T, { headers: { Authorization: `Bearer ${signed.token}`, Accept: 'application/json' } });
    const apiHost = 'api.macrobondfinancial.com';
    if (got.networkError) return { ...setRow(def, 'no_answer', `Macrobond series: ${got.networkError}`, apiHost), latencyMs: got.latencyMs };
    if (!got.ok) return { ...setRow(def, got.status === 401 || got.status === 403 ? 'needs_setup' : 'refused', `Signed in, but Macrobond refused series ${first.code} (HTTP ${got.status}).${got.status === 403 ? ' Your licence may not cover it.' : ''}`, apiHost), httpStatus: got.status };
    const body = parseJson(got.text);
    const read = readMacrobondSeries(Array.isArray(body) ? body[0] : null, first.freq);
    if ('error' in read) return setRow(def, 'bad_reply', `Signed in; series ${first.code}: ${read.error}.`, apiHost);
    return {
      ...setRow(def, 'connected', `Signed in to ${vendor.name}; ${series}. The figures stay on this computer.`, apiHost),
      sample: `${first.code}: ${read.points.length} values, ${read.points[0]!.date} to ${read.points[read.points.length - 1]!.date} (figures not shown)`,
    };
  });

  // ---- AI models ---------------------------------------------------------------------------------
  add('gemini', async () => {
    const model = opts.env.GEMINI_MODEL?.trim() || opts.ai?.geminiModel || geminiModel(undefined, opts.env);
    const def: Def = {
      id: 'gemini',
      name: `Gemini (${model})`,
      group: 'ai',
      feeds: 'Council summary, debate replies, agent choice',
      setup: 'Menu > Settings > AI model key, or GEMINI_API_KEY="..." in .env (https://ai.google.dev/gemini-api/docs/api-key).',
    };
    const key = (env.GEMINI_API_KEY || '').trim();
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return setRow(def, usesGemini ? 'needs_setup' : 'optional', usesGemini ? 'The AI model is set to Gemini but no Gemini key is set (Menu > Settings, or GEMINI_API_KEY).' : `Not set. The AI model is set to ${provider}, so Gemini is not needed.`, 'generativelanguage.googleapis.com');
    }
    // Reads the model's description: proves the key and the model name without spending tokens.
    const res = await httpCheck(def, fetchFn, `https://generativelanguage.googleapis.com/v1beta/models/${model}`, T, (r) => {
      const name = (parseJson(r.text) as { name?: string; displayName?: string })?.displayName;
      return name ? `Key accepted; model "${name}" available` : null;
    }, { headers: { 'x-goog-api-key': key } });
    if (res.state === 'refused' && (res.httpStatus === 400 || res.httpStatus === 401 || res.httpStatus === 403)) return { ...res, state: 'needs_setup', detail: `Google did not accept ${keyPhrase('GEMINI_API_KEY')} (HTTP ${res.httpStatus}).` };
    if (res.state === 'refused' && res.httpStatus === 404) return { ...res, detail: `The key works but model ${model} was not found. The model name in the app may need updating.` };
    return savedNote('GEMINI_API_KEY', res);
  });

  add('ollama', async () => {
    const base = (opts.ai?.ollamaBaseUrl || env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const quick = opts.ai?.ollamaQuickModel || env.OLLAMA_QUICK_MODEL || 'qwen2.5:7b';
    const deep = refereeModelOrDefault(opts.ai?.ollamaDeepModel) || refereeModelOrDefault(env.OLLAMA_DEEP_MODEL) || DEFAULT_REFEREE_MODEL;
    const def: Def = {
      id: 'ollama',
      name: 'Ollama (on this computer)',
      group: 'ai',
      feeds: 'Council summary, debate replies, agent choice (local)',
      setup: `OLLAMA_BASE_URL="${base}", OLLAMA_QUICK_MODEL="${quick}", OLLAMA_DEEP_MODEL="${deep}". Install from ollama.com, then run: ollama pull ${quick}`,
    };
    const r = await probe(fetchFn, `${base}/api/tags`, Math.min(T, 4000));
    const host = hostOf(base);
    if (r.networkError) {
      return { ...setRow(def, usesOllama ? 'no_answer' : 'optional', usesOllama ? `Ollama is not running at ${base}. Open the Ollama app, or run: ollama serve. ${r.networkError}` : `Not running at ${base}. The AI model is set to ${provider}, so Ollama is not needed.`, host), latencyMs: r.latencyMs };
    }
    if (!r.ok) return { ...setRow(def, 'refused', httpRefusal(r.status, r.text), host), httpStatus: r.status };
    const models = ((parseJson(r.text) as { models?: Array<{ name?: string }> })?.models || []).map((m) => String(m.name || ''));
    const has = (m: string) => models.some((x) => x === m || x === `${m}:latest` || (m.endsWith(':latest') && x === m.slice(0, -7)));
    const missing = [...new Set([quick, deep])].filter((m) => !has(m));
    return {
      ...setRow(def, 'connected', `Running at ${base} with ${models.length} model${models.length === 1 ? '' : 's'} installed.`, host),
      latencyMs: r.latencyMs,
      httpStatus: r.status,
      sample: models.length ? `Installed: ${models.slice(0, 5).join(', ')}${models.length > 5 ? ' …' : ''}` : 'No models installed',
      ...(missing.length ? { warning: `Not installed: ${missing.join(', ')}. Run: ${missing.map((m) => `ollama pull ${m}`).join(' && ')}` } : {}),
    };
  });

  add('openai_compatible', async () => {
    const base = (opts.ai?.openAiBaseUrl || env.OPENAI_COMPATIBLE_BASE_URL || '').replace(/\/+$/, '');
    const def: Def = {
      id: 'openai_compatible',
      name: 'Local OpenAI-style server (LM Studio, vLLM)',
      group: 'ai',
      feeds: 'Alternative local AI model',
      setup: 'OPENAI_COMPATIBLE_BASE_URL="http://localhost:1234/v1" and OPENAI_COMPATIBLE_MODEL="...". Only needed if the AI model is set to it.',
    };
    if (!usesOpenAi) return setRow(def, 'optional', `Not in use. The AI model is set to ${provider}.`, base ? hostOf(base) : 'not set');
    if (!base) return setRow(def, 'needs_setup', 'The AI model is set to this server but OPENAI_COMPATIBLE_BASE_URL is empty.', 'not set');
    return httpCheck(def, fetchFn, `${base}/models`, Math.min(T, 4000), (r) => {
      const ids = ((parseJson(r.text) as { data?: Array<{ id?: string }> })?.data || []).map((m) => m.id).filter(Boolean);
      return ids.length ? `Models: ${ids.slice(0, 4).join(', ')}` : 'Answered (no models listed)';
    });
  });

  const results = await Promise.all(jobs);
  const order = new Map<string, number>(SOURCE_IDS.map((id, i) => [id, i]));
  results.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  const counts = { connected: 0, needs_setup: 0, optional: 0, off: 0, no_answer: 0, refused: 0, bad_reply: 0 } as Record<ConnectionState, number>;
  for (const r of results) counts[r.state]++;
  return { checkedAt: now.toISOString(), results, counts };
}

/** Plain-text table for the terminal (`npm run check:data`). */
export function formatReport(rep: ConnectionReport): string {
  const mark: Record<ConnectionState, string> = {
    connected: 'OK  ',
    needs_setup: 'SET ',
    optional: '--  ',
    off: 'OFF ',
    no_answer: 'FAIL',
    refused: 'FAIL',
    bad_reply: 'FAIL',
  };
  const groupName: Record<ConnectionGroup, string> = {
    free: 'Free sources (no key)',
    free_key: 'Free sources that need your own key',
    own_account: 'Your own paid data (off unless you switch it on)',
    ai: 'AI model',
  };
  const lines: string[] = [`EconQuest data connection check, ${rep.checkedAt}`, ''];
  for (const g of ['free', 'free_key', 'own_account', 'ai'] as ConnectionGroup[]) {
    const rows = rep.results.filter((r) => r.group === g);
    if (!rows.length) continue;
    lines.push(groupName[g]);
    for (const r of rows) {
      lines.push(`  ${mark[r.state]} ${r.name}  [${STATE_LABEL[r.state]}${r.latencyMs !== undefined && r.state === 'connected' ? `, ${r.latencyMs} ms` : ''}]`);
      lines.push(`       ${r.sample || r.detail}`);
      if (r.sample && r.state !== 'connected') lines.push(`       ${r.detail}`);
      if (r.state !== 'connected' && !r.sample && r.host) lines.push(`       host: ${r.host}`);
      if (r.warning) lines.push(`       ! ${r.warning}`);
      if (r.setup && (r.state === 'needs_setup' || r.state === 'off')) lines.push(`       setup: ${r.setup}`);
    }
    lines.push('');
  }
  const c = rep.counts;
  const failed = c.no_answer + c.refused + c.bad_reply;
  lines.push(`${c.connected} connected, ${failed} failed, ${c.needs_setup} need setup, ${c.off} off, ${c.optional} optional not set.`);
  return lines.join('\n');
}
