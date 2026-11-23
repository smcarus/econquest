/**
 * Live prices from your own broker account (platform comparison gap CG9), shown on screen only.
 *
 * How it works, in plain words:
 * - Off by default. Menu > Settings > Your subscriptions > "Your broker prices" switches it on.
 *   The first broker is Interactive Brokers, through the Client Portal Gateway that you download
 *   from IBKR, run on your own computer and sign in to yourself. The app never sees your IBKR user
 *   name or password: it only asks the gateway on this computer for prices.
 * - The app ships no contract ids. You list the contracts you want as IBKR contract ids (conids)
 *   with your own label, for example 12087792=EUR.USD.
 * - Prices are held in memory for a few seconds and shown on screen only. They are never written to
 *   disk, put in a download, a backup, a shared copy or an answer to a script, and never sent to the
 *   AI model. Your IBKR market data subscriptions decide what you see (live, delayed or none).
 *
 * Browser-safe and pure: the server reaches the gateway (src/server/brokerGateway.ts).
 */

export type BrokerId = 'ibkr';

export const BROKER_SWITCH_ID = 'BROKER_PRICES';
export const IBKR_GATEWAY_ID = 'IBKR_GATEWAY_URL';
export const IBKR_CONIDS_ID = 'IBKR_CONIDS';
export const IBKR_DEFAULT_GATEWAY = 'https://localhost:5000';
export const BROKER_MAX_CONTRACTS = 50;
export const BROKER_LABEL = 'Your broker: Interactive Brokers';
/** What a download or a script is told instead of a broker price. */
export const BROKER_WITHHELD = 'Withheld: your broker prices are shown on screen only';

/**
 * Snapshot fields asked for (IBKR Client Portal API market data fields):
 * 31 last, 84 bid, 86 ask, 82 change, 83 change %, 55 symbol, 6509 market data availability.
 */
export const IBKR_FIELDS = ['31', '84', '86', '82', '83', '55', '6509'] as const;

export interface BrokerContract {
  conid: string;
  label: string;
}

export interface BrokerConfig {
  broker: BrokerId;
  gateway: string;
  contracts: BrokerContract[];
}

export interface BrokerQuote {
  conid: string;
  label: string;
  symbol: string | null;
  last: number | null;
  bid: number | null;
  ask: number | null;
  change: number | null;
  changePct: number | null;
  /** "Live", "Delayed", "Frozen", "Frozen, delayed", "Not subscribed", or null when IBKR did not say. */
  availability: string | null;
  /** True when the last price is the previous close (IBKR marks it with a C). */
  closePrice: boolean;
  halted: boolean;
  /** When IBKR last updated the quote, ISO time; null when not given. */
  updated: string | null;
}

/** Hosts the app will ask: this computer, or the computer running Docker. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);

/** The gateway address, cleaned, or an error sentence. Only this computer is allowed. */
export function checkGatewayUrl(raw: string): { url: string } | { error: string } {
  const v = raw.trim().replace(/\/+$/, '');
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { error: 'Give the gateway address, for example https://localhost:5000.' };
  }
  if (u.protocol !== 'https:') return { error: 'The IBKR gateway address starts with https://.' };
  if (!LOCAL_HOSTS.has(u.hostname)) return { error: 'The gateway must run on this computer: use localhost, 127.0.0.1 or (under Docker) host.docker.internal.' };
  if (u.pathname !== '/' && u.pathname !== '') return { error: 'Give only the address and port, for example https://localhost:5000.' };
  return { url: `${u.protocol}//${u.host}` };
}

/** "12087792=EUR.USD, 265598=Apple" to contracts; unreadable parts are listed in `problems`. */
export function parseConids(raw: string): { contracts: BrokerContract[]; problems: string[] } {
  const contracts: BrokerContract[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]/)) {
    const p = part.trim();
    if (!p) continue;
    const m = /^(\d{1,12})\s*=\s*(.{1,60})$/.exec(p);
    if (!m) {
      problems.push(p);
      continue;
    }
    const conid = m[1] ?? '';
    const label = (m[2] ?? '').replace(/\s+/g, ' ').trim();
    if (seen.has(conid)) continue;
    seen.add(conid);
    contracts.push({ conid, label });
  }
  return { contracts: contracts.slice(0, BROKER_MAX_CONTRACTS), problems };
}

/** The settings as applied, or why broker prices are not ready. `off` is true when switched off. */
export function brokerConfigFromEnv(env: Record<string, string | undefined>): { config: BrokerConfig } | { off: true } | { problem: string } {
  const sw = (env[BROKER_SWITCH_ID] || '').trim().toLowerCase();
  if (!sw || sw === 'off') return { off: true };
  if (sw !== 'ibkr') return { problem: `${BROKER_SWITCH_ID} is "${sw}"; it must be off or ibkr.` };
  const gw = checkGatewayUrl(env[IBKR_GATEWAY_ID] || IBKR_DEFAULT_GATEWAY);
  if ('error' in gw) return { problem: gw.error };
  const { contracts } = parseConids(env[IBKR_CONIDS_ID] || '');
  if (!contracts.length) return { problem: 'Switched on for Interactive Brokers, but no contracts are listed. Add them as conid=label under Menu > Settings > Your subscriptions.' };
  return { config: { broker: 'ibkr', gateway: gw.url, contracts } };
}

export const ibkrAuthUrl = (gateway: string) => `${gateway}/v1/api/iserver/auth/status`;
export const ibkrSnapshotUrl = (gateway: string, conids: string[]) =>
  `${gateway}/v1/api/iserver/marketdata/snapshot?conids=${conids.map(encodeURIComponent).join(',')}&fields=${IBKR_FIELDS.join(',')}`;

/** The gateway's auth/status reply: signed in, or why not. */
export function readIbkrAuth(status: number, text: string): { signedIn: boolean; note: string } {
  if (status === 401) return { signedIn: false, note: 'The gateway is running, but nobody is signed in. Open the gateway address in your browser and sign in to IBKR.' };
  if (status < 200 || status >= 300) return { signedIn: false, note: `The gateway answered HTTP ${status}.` };
  let j: { authenticated?: unknown; connected?: unknown; competing?: unknown };
  try {
    j = JSON.parse(text);
  } catch {
    return { signedIn: false, note: 'The gateway answered, but not with its usual status reply.' };
  }
  if (j.competing === true) return { signedIn: false, note: 'Another IBKR session (for example Trader Workstation or the mobile app) is using your market data. Close it or sign in again at the gateway.' };
  if (j.authenticated !== true) return { signedIn: false, note: 'The gateway is running, but nobody is signed in. Open the gateway address in your browser and sign in to IBKR.' };
  if (j.connected === false) return { signedIn: false, note: 'Signed in, but the gateway is not connected to IBKR right now.' };
  return { signedIn: true, note: 'Signed in at the gateway.' };
}

const AVAIL: Record<string, string> = { R: 'Live', D: 'Delayed', Z: 'Frozen', Y: 'Frozen, delayed', N: 'Not subscribed' };

function num(v: unknown): { value: number | null; close: boolean; halted: boolean } {
  if (v === undefined || v === null || v === '') return { value: null, close: false, halted: false };
  const s = String(v).trim();
  const close = s.startsWith('C');
  const halted = s.startsWith('H');
  const n = Number(s.replace(/^[CH]/, '').replace(/,/g, '').replace(/%$/, ''));
  return { value: Number.isFinite(n) ? n : null, close, halted };
}

/** The snapshot reply to quotes, in the order of `contracts`. A contract with no reply has no prices. */
export function parseIbkrSnapshot(j: unknown, contracts: BrokerContract[]): BrokerQuote[] {
  const rows = Array.isArray(j) ? (j as Array<Record<string, unknown>>) : [];
  const byConid = new Map<string, Record<string, unknown>>();
  for (const r of rows) if (r && typeof r === 'object' && r.conid !== undefined) byConid.set(String(r.conid), r);
  return contracts.map((c) => {
    const r = byConid.get(c.conid) || {};
    const last = num(r['31']);
    const upd = Number(r._updated);
    const av = typeof r['6509'] === 'string' ? AVAIL[(r['6509'] as string).charAt(0)] ?? null : null;
    return {
      conid: c.conid,
      label: c.label,
      symbol: typeof r['55'] === 'string' && r['55'] ? (r['55'] as string) : null,
      last: last.value,
      bid: num(r['84']).value,
      ask: num(r['86']).value,
      change: num(r['82']).value,
      changePct: num(r['83']).value,
      availability: av,
      closePrice: last.close,
      halted: last.halted,
      updated: Number.isFinite(upd) && upd > 0 ? new Date(upd).toISOString() : null,
    };
  });
}

/** True when no quote has a price yet: the gateway's first snapshot for a contract is often empty. */
export const snapshotEmpty = (quotes: BrokerQuote[]) => quotes.every((q) => q.last === null && q.bid === null && q.ask === null);
