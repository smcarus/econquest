/**
 * Asks your own IBKR Client Portal Gateway, running on this computer, for prices
 * (src/engine/brokerPrices.ts, gap CG9). The gateway serves https with its own certificate made on
 * your computer, so the certificate check is relaxed for this one local address only
 * (checkGatewayUrl refuses any other host). Nothing here writes to disk or the audit log.
 */
import https from 'node:https';
import {
  brokerConfigFromEnv,
  ibkrAuthUrl,
  ibkrSnapshotUrl,
  parseIbkrSnapshot,
  readIbkrAuth,
  snapshotEmpty,
  type BrokerConfig,
  type BrokerQuote,
} from '../engine/brokerPrices';

export interface GatewayReply {
  status: number;
  text: string;
}
export type GatewayGet = (url: string, method?: 'GET' | 'POST') => Promise<GatewayReply>;

/** The real request: local gateway only, 8-second limit. */
export const localGatewayGet: GatewayGet = (url, method = 'GET') =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method, rejectUnauthorized: false, timeout: 8000, headers: { 'User-Agent': 'econquest', Accept: 'application/json', ...(method === 'POST' ? { 'Content-Length': '0' } : {}) } },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (d) => {
          if (text.length < 2_000_000) text += d;
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('the gateway did not answer within 8 seconds')));
    req.on('error', reject);
    req.end();
  });

export interface BrokerReply {
  on: boolean;
  ready: boolean;
  note: string;
  gateway?: string;
  signedIn?: boolean;
  quotes: BrokerQuote[];
  at: string;
}

const why = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return /ECONNREFUSED/.test(m) ? 'nothing answered at the gateway address. Start the IBKR Client Portal Gateway on this computer.' : m;
};

/** Gateway sign-in state only (the connection check): no prices. */
export async function brokerStatus(env: Record<string, string | undefined>, get: GatewayGet = localGatewayGet): Promise<{ state: 'off' | 'needs_setup' | 'no_answer' | 'connected'; note: string; gateway?: string; contracts?: number }> {
  const c = brokerConfigFromEnv(env);
  if ('off' in c) return { state: 'off', note: 'Off. No broker prices are shown.' };
  if ('problem' in c) return { state: 'needs_setup', note: c.problem };
  try {
    const r = await get(ibkrAuthUrl(c.config.gateway), 'POST');
    const a = readIbkrAuth(r.status, r.text);
    return { state: a.signedIn ? 'connected' : 'needs_setup', note: a.note, gateway: c.config.gateway, contracts: c.config.contracts.length };
  } catch (e) {
    return { state: 'no_answer', note: `IBKR gateway: ${why(e)}`, gateway: c.config.gateway };
  }
}

let held: { key: string; until: number; reply: BrokerReply } | null = null;
/** Tests only. */
export function clearBrokerMemory(): void {
  held = null;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Prices for the listed contracts, held in memory for 10 seconds so several screens share one ask.
 * The gateway's first snapshot for a contract is often empty, so an empty one is asked once more.
 */
export async function brokerQuotes(env: Record<string, string | undefined>, opts: { get?: GatewayGet; now?: number; retryMs?: number } = {}): Promise<BrokerReply> {
  const get = opts.get ?? localGatewayGet;
  const now = opts.now ?? Date.now();
  const at = new Date(now).toISOString();
  const c = brokerConfigFromEnv(env);
  if ('off' in c) return { on: false, ready: false, note: 'Your broker prices are off (Menu > Settings > Your subscriptions).', quotes: [], at };
  if ('problem' in c) return { on: true, ready: false, note: c.problem, quotes: [], at };
  const cfg: BrokerConfig = c.config;
  const key = `${cfg.gateway}|${cfg.contracts.map((x) => `${x.conid}=${x.label}`).join(',')}`;
  if (held && held.key === key && held.until > now) return held.reply;
  const base = { on: true, gateway: cfg.gateway, at };
  try {
    const auth = await get(ibkrAuthUrl(cfg.gateway), 'POST');
    const a = readIbkrAuth(auth.status, auth.text);
    if (!a.signedIn) return { ...base, ready: false, signedIn: false, note: a.note, quotes: [] };
    const url = ibkrSnapshotUrl(cfg.gateway, cfg.contracts.map((x) => x.conid));
    let r = await get(url);
    let quotes = r.status === 200 ? parseIbkrSnapshot(safeJson(r.text), cfg.contracts) : [];
    if (r.status === 200 && snapshotEmpty(quotes)) {
      await pause(opts.retryMs ?? 600);
      r = await get(url);
      quotes = r.status === 200 ? parseIbkrSnapshot(safeJson(r.text), cfg.contracts) : [];
    }
    if (r.status !== 200) return { ...base, ready: false, signedIn: true, note: `Signed in, but the gateway refused the price request (HTTP ${r.status}).`, quotes: [] };
    const priced = quotes.filter((q) => q.last !== null || q.bid !== null).length;
    const reply: BrokerReply = { ...base, ready: true, signedIn: true, note: `${priced} of ${quotes.length} contracts priced. Shown on screen only; never saved.`, quotes };
    held = { key, until: now + 10_000, reply };
    return reply;
  } catch (e) {
    return { ...base, ready: false, note: `IBKR gateway: ${why(e)}`, quotes: [] };
  }
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
