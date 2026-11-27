/**
 * Trading Economics adapter: fetches the series you mapped (src/engine/paidData.ts) with your own
 * Trading Economics API key. Every paid Trading Economics plan includes the API.
 *
 * How the API works, as Trading Economics' public documentation describes it (read on 27 November
 * 2026, docs.tradingeconomics.com):
 * - Address: https://api.tradingeconomics.com. The key goes in the Authorization header (the docs
 *   also allow ?c=<key>; the app uses the header so the key never sits in an address or a log).
 *   f=json asks for JSON.
 * - Economic series by ticker (the "HistoricalDataSymbol" Trading Economics shows for each
 *   indicator, for example GHGDPYY): GET /historical/ticker/<ticker>/<yyyy-mm-dd>. Each row has
 *   Country, Category, DateTime (ISO 8601), Value, Frequency, HistoricalDataSymbol, LastUpdate.
 * - Market series by symbol (bond yields, stock indices, currencies, commodities; symbols carry a
 *   colon, for example ngseindx:ind): GET /markets/historical/<symbol>?d1=<yyyy-mm-dd>. Each row has
 *   Symbol, Date (DD/MM/YYYY), Open, High, Low, Close. The app keeps Close.
 * - Limits: 5 requests a second, at least 200 ms apart, at most 10,000 rows a request. The app asks
 *   one series per request, a quarter of a second apart.
 *
 * So you map either a ticker or a market symbol as the series code. Figures are kept as
 * src/engine/paidData.ts says: on this computer only, never in a download, backup or shared copy.
 * Notes this file returns name series codes and counts, never a figure or the key.
 *
 * Licence: Trading Economics publishes no terms page for the API (checked 27 November 2026); its
 * pricing page says only Enterprise plans include redistribution. The app never passes figures on,
 * but check your own agreement allows keeping a copy on your computer.
 *
 * Shared engine: reaches the network only through Platform.http.
 */
import type { Platform } from '../platform/types';
import { listPaidMappings, paidPoints, savePaidPoints, type PaidFreq, type PaidMapping, type PaidPoint, type PaidPull, type PaidStep } from './paidData';

export const TE_API_URL = 'https://api.tradingeconomics.com/';
export const TE_HOST = 'api.tradingeconomics.com';
/** Pause between requests, ms (5 a second allowed, at least 200 ms apart). */
export const TE_GAP_MS = 250;
/** Earliest date asked for: market series are daily, so 2000 keeps a request under 10,000 rows. */
export const TE_MARKET_FROM = '2000-01-01';
export const TE_TICKER_FROM = '1950-01-01';

export function teKey(env: Record<string, string | undefined>): string | null {
  const k = (env.TRADINGECONOMICS_API_KEY || '').trim();
  return k || null;
}

/** True for a market symbol (with a colon), false for an economic ticker. */
export const teIsMarket = (code: string): boolean => code.includes(':');

/** The request for one mapped code: the key only in the header. */
export function teRequest(code: string, key: string): { url: string; headers: Record<string, string> } {
  const url = teIsMarket(code)
    ? `${TE_API_URL}markets/historical/${encodeURIComponent(code.toLowerCase())}?f=json&d1=${TE_MARKET_FROM}`
    : `${TE_API_URL}historical/ticker/${encodeURIComponent(code)}/${TE_TICKER_FROM}?f=json`;
  return { url, headers: { Authorization: key, Accept: 'application/json' } };
}

/** DD/MM/YYYY (market rows) or ISO 8601 (economic rows) as YYYY-MM-DD. */
export function teDate(text: unknown): string | null {
  const s = String(text ?? '');
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return iso ? iso[1]! : null;
}

export type TeRead = { points: PaidPoint[] } | { error: string };

/** One reply as points for the mapping's frequency, oldest first; nothing is filled in. */
export function readTeSeries(code: string, body: unknown, freq: PaidFreq): TeRead {
  if (!Array.isArray(body)) return { error: 'Trading Economics answered in a shape the app cannot read' };
  if (!body.length) return { error: 'Trading Economics answered with no rows (check the code, and that your plan covers it)' };
  const market = teIsMarket(code);
  const rows = body.map((r) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return { date: teDate(market ? o.Date : o.DateTime) ?? '', value: market ? o.Close : o.Value };
  });
  const points = paidPoints(rows, freq);
  return points.length ? { points } : { error: 'Trading Economics answered this series with no values' };
}

/** Why an HTTP status refused a series, in plain words. */
export function teRefusal(status: number): string {
  if (status === 401) return 'Trading Economics refused the API key (HTTP 401). Check it under Menu > Settings > Your subscriptions';
  if (status === 403) return 'Trading Economics said your plan does not cover this series (HTTP 403)';
  if (status === 404) return 'Trading Economics does not know this code (HTTP 404)';
  if (status === 429) return 'Trading Economics said too many requests (HTTP 429)';
  return `Trading Economics answered HTTP ${status}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const why = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Fetches every Trading Economics mapping (or only `onlyIds`) and keeps what came back. A series
 * that fails keeps its last saved copy; nothing is ever filled in.
 */
export async function pullTradingEconomics(
  platform: Platform,
  key: string,
  opts: { timeoutMs?: number; gapMs?: number; onlyIds?: string[]; mappings?: PaidMapping[] } = {}
): Promise<PaidPull> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const gap = opts.gapMs ?? TE_GAP_MS;
  const all = (opts.mappings ?? (await listPaidMappings(platform))).filter((m) => m.vendor === 'tradingeconomics' && (!opts.onlyIds || opts.onlyIds.includes(m.id)));
  if (!all.length) return { ok: true, signedIn: false, note: 'Trading Economics: no series are mapped yet', steps: [] };
  const codes = [...new Set(all.map((m) => m.code))];
  const replies = new Map<string, unknown>();
  const failed = new Map<string, string>();
  let keyRefused = false;
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]!;
    if (keyRefused) {
      failed.set(code, teRefusal(401));
      continue;
    }
    if (i > 0 && gap > 0) await wait(gap);
    try {
      const req = teRequest(code, key);
      let r = await platform.http.request({ ...req, timeoutMs });
      if (r.status === 429) {
        const n = Number.parseInt(r.headers['retry-after'] || '', 10);
        await wait(Math.min(30, Number.isFinite(n) ? n : 2) * 1000);
        r = await platform.http.request({ ...req, timeoutMs });
      }
      if (!r.ok) {
        if (r.status === 401) keyRefused = true;
        failed.set(code, teRefusal(r.status));
        continue;
      }
      replies.set(code, await r.json().catch(() => null));
    } catch (e) {
      failed.set(code, `Trading Economics did not answer (${why(e)})`);
    }
  }
  const pulledAt = new Date(platform.clock.now()).toISOString();
  const steps: PaidStep[] = [];
  for (const m of all) {
    const bad = failed.get(m.code);
    if (bad) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${bad}; the last saved copy is kept` });
      continue;
    }
    const read = readTeSeries(m.code, replies.get(m.code), m.freq);
    if ('error' in read) {
      steps.push({ id: m.id, code: m.code, ok: false, note: `${m.code}: ${read.error}` });
      continue;
    }
    await savePaidPoints(platform, m, read.points, pulledAt);
    steps.push({ id: m.id, code: m.code, ok: true, note: `${m.code}: ${read.points.length} values, ${read.points[0]!.date} to ${read.points[read.points.length - 1]!.date}` });
  }
  const good = steps.filter((s) => s.ok).length;
  if (keyRefused && !good) return { ok: false, signedIn: false, note: teRefusal(401), steps };
  return { ok: good === steps.length, signedIn: true, note: `Trading Economics: ${good} of ${steps.length} mapped series read`, steps };
}
