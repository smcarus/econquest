/**
 * EODHD adapter: fetches the series you mapped (src/engine/paidData.ts) with your own EODHD API
 * token. EODHD sells personal-use plans; All-in-One covers every series this adapter reads.
 *
 * How the API works, as EODHD's public documentation describes it (read on 27 November 2026,
 * eodhd.com/financial-apis):
 * - Address: https://eodhd.com/api/. The token goes in the address as api_token=<token> (EODHD
 *   offers no header). The app never logs or returns an address, so the token stays out of notes.
 * - Daily prices: GET /eod/<SYMBOL.EXCHANGE>?fmt=json&from=<yyyy-mm-dd>, for example GSPC.INDX (a
 *   stock index), EURUSD.FOREX or a listed share. Each row has date (YYYY-MM-DD), open, high, low,
 *   close, adjusted_close, volume. The app keeps close.
 * - Macro indicators: GET /macro-indicator/<ISO3>?indicator=<name>&fmt=json, for example
 *   inflation_consumer_prices_annual. Each row has CountryCode, CountryName, Indicator, Date,
 *   Period, Value (null when missing). You map these as macro:<name>; the country comes from the
 *   mapping. These are World Bank figures, which the app already reads free; they are here so one
 *   key covers everything you map.
 * - Replies: 401 bad token, 402 daily limit used up, 403 not in your plan, 404 unknown code, 429 too
 *   many a minute (Retry-After). Limits: 1,000 requests a minute, 100,000 calls a day on paid plans
 *   (a macro request counts as 10). The app asks one series per request, a fifth of a second apart.
 *
 * Licence (EODHD terms, read 27 November 2026): "Non-Professional Users are permitted to store,
 * manipulate, and analyze the data for private, non-commercial purposes", and may not redistribute,
 * display to or share access with others. The app keeps figures as src/engine/paidData.ts says: on this computer
 * only, never in a download, backup or shared copy. EODHD's sovereign credit risk data is CDS,
 * which is hidden in this app (src/utils/cdsHidden.ts), so it cannot be mapped.
 *
 * Shared engine: reaches the network only through Platform.http.
 */
import type { Platform } from '../platform/types';
import { listPaidMappings, paidPoints, savePaidPoints, type PaidFreq, type PaidMapping, type PaidPoint, type PaidPull, type PaidStep } from './paidData';

export const EODHD_API_URL = 'https://eodhd.com/api/';
export const EODHD_HOST = 'eodhd.com';
export const EODHD_GAP_MS = 200;
export const EODHD_FROM = '1990-01-01';
export const EODHD_MACRO_PREFIX = 'macro:';

export function eodhdToken(env: Record<string, string | undefined>): string | null {
  const k = (env.EODHD_API_TOKEN || '').trim();
  return k || null;
}

export const eodhdIsMacro = (code: string): boolean => code.toLowerCase().startsWith(EODHD_MACRO_PREFIX);

/** The address for one mapped series. It holds the token: never log or return it. */
export function eodhdUrl(m: Pick<PaidMapping, 'code' | 'iso3'>, token: string): string {
  const t = encodeURIComponent(token);
  if (eodhdIsMacro(m.code)) {
    const indicator = m.code.slice(EODHD_MACRO_PREFIX.length);
    return `${EODHD_API_URL}macro-indicator/${encodeURIComponent(m.iso3.toUpperCase())}?indicator=${encodeURIComponent(indicator)}&fmt=json&api_token=${t}`;
  }
  return `${EODHD_API_URL}eod/${encodeURIComponent(m.code)}?fmt=json&from=${EODHD_FROM}&api_token=${t}`;
}

export type EodhdRead = { points: PaidPoint[] } | { error: string };

/** One reply as points for the mapping's frequency, oldest first; nothing is filled in. */
export function readEodhdSeries(code: string, body: unknown, freq: PaidFreq): EodhdRead {
  if (!Array.isArray(body)) return { error: 'EODHD answered in a shape the app cannot read' };
  if (!body.length) return { error: 'EODHD answered with no rows for this code and country' };
  const macro = eodhdIsMacro(code);
  const rows = body.map((r) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return { date: String((macro ? o.Date : o.date) ?? ''), value: macro ? o.Value : o.close };
  });
  const points = paidPoints(rows, freq);
  return points.length ? { points } : { error: 'EODHD answered this series with no values' };
}

export function eodhdRefusal(status: number): string {
  if (status === 401) return 'EODHD refused the API token (HTTP 401). Check it under Menu > Settings > Your subscriptions';
  if (status === 402) return "EODHD said today's request allowance is used up (HTTP 402)";
  if (status === 403) return 'EODHD said your plan does not cover this series (HTTP 403)';
  if (status === 404) return 'EODHD does not know this code or country (HTTP 404)';
  if (status === 429) return 'EODHD said too many requests (HTTP 429)';
  return `EODHD answered HTTP ${status}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** An error's words with the token taken out, in case a network error repeats the address. */
const why = (e: unknown, token: string) => {
  const s = e instanceof Error ? e.message : String(e);
  return token ? s.split(token).join('…').split(encodeURIComponent(token)).join('…') : s;
};

/**
 * Fetches every EODHD mapping (or only `onlyIds`) and keeps what came back. A series that fails
 * keeps its last saved copy; nothing is ever filled in. Stops asking once EODHD refuses the token
 * or says the day's allowance is used up.
 */
export async function pullEodhd(
  platform: Platform,
  token: string,
  opts: { timeoutMs?: number; gapMs?: number; onlyIds?: string[]; mappings?: PaidMapping[] } = {}
): Promise<PaidPull> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const gap = opts.gapMs ?? EODHD_GAP_MS;
  const all = (opts.mappings ?? (await listPaidMappings(platform))).filter((m) => m.vendor === 'eodhd' && (!opts.onlyIds || opts.onlyIds.includes(m.id)));
  if (!all.length) return { ok: true, signedIn: false, note: 'EODHD: no series are mapped yet', steps: [] };
  const pulledAt = new Date(platform.clock.now()).toISOString();
  const steps: PaidStep[] = [];
  let stopped: number | null = null;
  let asked = 0;
  for (const m of all) {
    if (stopped !== null) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${eodhdRefusal(stopped)}; the last saved copy is kept` });
      continue;
    }
    if (asked++ > 0 && gap > 0) await wait(gap);
    let body: unknown = null;
    try {
      const req = { url: eodhdUrl(m, token), headers: { Accept: 'application/json' }, timeoutMs };
      let r = await platform.http.request(req);
      if (r.status === 429) {
        const n = Number.parseInt(r.headers['retry-after'] || '', 10);
        await wait(Math.min(60, Number.isFinite(n) ? n : 5) * 1000);
        r = await platform.http.request(req);
      }
      if (!r.ok) {
        if (r.status === 401 || r.status === 402) stopped = r.status;
        steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${eodhdRefusal(r.status)}; the last saved copy is kept` });
        continue;
      }
      body = await r.json().catch(() => null);
    } catch (e) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: EODHD did not answer (${why(e, token)}); the last saved copy is kept` });
      continue;
    }
    const read = readEodhdSeries(m.code, body, m.freq);
    if ('error' in read) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${read.error}` });
      continue;
    }
    await savePaidPoints(platform, m, read.points, pulledAt);
    steps.push({ id: m.id, code: m.code, ok: true, note: `${m.code}: ${read.points.length} values, ${read.points[0]!.date} to ${read.points[read.points.length - 1]!.date}` });
  }
  const good = steps.filter((s) => s.ok).length;
  if (stopped === 401 && !good) return { ok: false, signedIn: false, note: eodhdRefusal(401), steps };
  return { ok: good === steps.length, signedIn: true, note: `EODHD: ${good} of ${steps.length} mapped series read`, steps };
}
