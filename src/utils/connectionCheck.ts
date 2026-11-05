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
import { BIS_ISO2, bisIntlUrl, parseBisIntl } from './bisDebtSecurities';
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
import { parseWitsShare, witsUrl } from './scenarioExposure';

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
  /** Only these source ids. */
  only?: string[];
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
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

interface ProbeReply {
  ok: boolean;
  status?: number;
  latencyMs: number;
  text?: string;
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
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, text };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, networkError: describeNetworkError(err, timeoutMs) };
  } finally {
    clearTimeout(timer);
  }
}

function httpRefusal(status: number | undefined, text: string | undefined): string {
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
  'imf',
  'gdelt',
  'polymarket',
  'kalshi',
  'nyfed',
  'fx_spot',
  'frankfurter',
  'bis_reer',
  'bis_debt',
  'wits',
  'fred_csv',
  'fred_api',
  'tesouro',
  'evds',
  'own_cds',
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

  add('gdelt', () =>
    httpCheck(
      { id: 'gdelt', name: 'GDELT news', group: 'free', feeds: 'Headlines and news tone (risk score input)' },
      fetchFn,
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${SAMPLE_NAME}" economy`)}&mode=artlist&format=json&maxrecords=1`,
      Math.max(T, 12000),
      (r) => {
        const arts = (parseJson(r.text) as { articles?: Array<{ title?: string }> })?.articles;
        if (Array.isArray(arts)) return arts[0]?.title ? `Latest headline: "${String(arts[0].title).slice(0, 80)}"` : 'Answered (no articles in the window)';
        return null;
      },
      undefined,
      'It answered with text instead of data. GDELT does this when asked too often (one request every 5 seconds); check again in a minute.'
    ).then((r) =>
      r.state === 'refused' && r.httpStatus === 429
        ? { ...r, detail: 'GDELT allows one request every 5 seconds and this one came too soon. If the app is running it may have just used the slot; check again in a minute. (HTTP 429)' }
        : r
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
      { id: 'nyfed', name: 'New York Fed rates', group: 'free', feeds: 'Fed funds, SOFR, reverse repo (dollar leg of carry)' },
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

  // ---- Free with your own key -----------------------------------------------------------------
  add('fred_api', async () => {
    const def: Def = {
      id: 'fred_api',
      name: 'FRED API (free key)',
      group: 'free_key',
      feeds: 'Same yields as the FRED download, through the official API',
      setup: 'FRED_API_KEY="..." (free: fred.stlouisfed.org > My Account > API Keys). Without it the app uses the FRED download.',
    };
    const key = (env.FRED_API_KEY || '').trim();
    if (!key) return setRow(def, 'optional', 'No key set. The app uses the FRED download instead, which needs no key.', 'api.stlouisfed.org');
    const res = await httpCheck(def, fetchFn, fredApiUrl(US_10Y_SERIES, key), T, (r) => {
      const o = parseFredApiLatest(parseJson(r.text), US_10Y_SERIES);
      return o ? `US 10Y ${fmt(o.valuePct, 2)}% (${o.period})` : null;
    });
    if (res.state === 'refused' && (res.httpStatus === 400 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `FRED did not accept the key in FRED_API_KEY (HTTP ${res.httpStatus}). Check it was copied in full. The app falls back to the FRED download meanwhile.` };
    }
    return res;
  });

  add('evds', async () => {
    const def: Def = {
      id: 'evds',
      name: 'Turkey central bank (EVDS)',
      group: 'free_key',
      feeds: 'Turkey 10Y yield',
      setup: 'EVDS_API_KEY="..." (free: evds3.tcmb.gov.tr > profile > API key) and EVDS_TR10Y_SERIES="TP...." (the 10Y bond series code in EVDS).',
    };
    const key = (env.EVDS_API_KEY || '').trim();
    const series = (env.EVDS_TR10Y_SERIES || '').trim();
    if (!key && !series) return setRow(def, 'needs_setup', "Not set up. Turkey's 10Y yield reads Missing until it is.", 'evds3.tcmb.gov.tr');
    if (!key) return setRow(def, 'needs_setup', 'EVDS_TR10Y_SERIES is set but EVDS_API_KEY is empty.', 'evds3.tcmb.gov.tr');
    if (!isValidEvdsSeriesCode(series)) return setRow(def, 'needs_setup', series ? `EVDS_TR10Y_SERIES "${series}" is not a series code (it starts with "TP.").` : 'EVDS_API_KEY is set but EVDS_TR10Y_SERIES is empty.', 'evds3.tcmb.gov.tr');
    const res = await httpCheck(def, fetchFn, evdsSeriesUrl(series, now), T, (r) => {
      const o = parseEvdsLatest(parseJson(r.text), series);
      return o ? `Turkey 10Y ${fmt(o.valuePct, 2)}% (${o.period})` : null;
    }, { headers: { key, Accept: 'application/json' } }, `EVDS answered, but series ${series} had no recent values. Check the series code.`);
    if (res.state === 'refused' && (res.httpStatus === 401 || res.httpStatus === 403)) {
      return { ...res, state: 'needs_setup', detail: `EVDS did not accept the key in EVDS_API_KEY (HTTP ${res.httpStatus}).` };
    }
    return res;
  });

  // ---- Your own paid account (off unless switched on) -------------------------------------------
  add('own_cds', async () => {
    const def: Def = {
      id: 'own_cds',
      name: 'Your CDS data (file or LSEG)',
      group: 'own_account',
      feeds: '5Y sovereign CDS (no free source exists)',
      setup:
        'File: CDS_FEED="csv" and CDS_CSV_PATH="/full/path/cds.csv" with columns iso3,date,cds5y_bps,source. ' +
        'LSEG: CDS_FEED="lseg" with LSEG_APP_KEY, LSEG_USERNAME, LSEG_PASSWORD and LSEG_CDS_RICS="BRA=<ric>,TUR=<ric>".',
    };
    const feed = (env.CDS_FEED || '').trim().toLowerCase();
    if (!feed) return setRow(def, 'off', 'Off. CDS reads Missing until you connect your own licensed data.', 'your file or LSEG');
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

  // ---- AI models ---------------------------------------------------------------------------------
  add('gemini', async () => {
    const model = opts.ai?.geminiModel || DEFAULT_GEMINI_MODEL;
    const def: Def = {
      id: 'gemini',
      name: `Gemini (${model})`,
      group: 'ai',
      feeds: 'Council summary, debate replies, agent choice',
      setup: 'GEMINI_API_KEY="..." (aistudio.google.com > Get API key).',
    };
    const key = (env.GEMINI_API_KEY || '').trim();
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return setRow(def, usesGemini ? 'needs_setup' : 'optional', usesGemini ? 'The AI model is set to Gemini but GEMINI_API_KEY is empty.' : `Not set. The AI model is set to ${provider}, so Gemini is not needed.`, 'generativelanguage.googleapis.com');
    }
    // Reads the model's description: proves the key and the model name without spending tokens.
    const res = await httpCheck(def, fetchFn, `https://generativelanguage.googleapis.com/v1beta/models/${model}`, T, (r) => {
      const name = (parseJson(r.text) as { name?: string; displayName?: string })?.displayName;
      return name ? `Key accepted; model "${name}" available` : null;
    }, { headers: { 'x-goog-api-key': key } });
    if (res.state === 'refused' && (res.httpStatus === 400 || res.httpStatus === 401 || res.httpStatus === 403)) return { ...res, state: 'needs_setup', detail: `Google did not accept GEMINI_API_KEY (HTTP ${res.httpStatus}).` };
    if (res.state === 'refused' && res.httpStatus === 404) return { ...res, detail: `The key works but model ${model} was not found. The model name in the app may need updating.` };
    return res;
  });

  add('ollama', async () => {
    const base = (opts.ai?.ollamaBaseUrl || env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const quick = opts.ai?.ollamaQuickModel || env.OLLAMA_QUICK_MODEL || 'qwen2.5:7b';
    const deep = opts.ai?.ollamaDeepModel || env.OLLAMA_DEEP_MODEL || 'deepseek-r1:8b';
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
