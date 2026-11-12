/**
 * Watch alerts (Sam, 2026-11-05): thresholds you set on the timing figures; Today flags a country
 * when one is crossed. No threshold is built in: every rule is one you added.
 *
 * This part is shared by the server and the phone: what a rule is, how a rule sent by the page is
 * checked, and where the rules are saved (local/watch-rules.json in the app's data folder).
 * Checking rules against the figures on screen stays in src/utils/watchRules.ts.
 */
import type { Platform } from '../platform/types';

export type WatchMetric =
  | 'yield_level'
  | 'yield_3m_bps'
  | 'policy_rate'
  | 'cli_level'
  | 'cftc_percentile'
  | 'tone_shift'
  | 'reserves_12m_pct'
  | 'shock_alerts'
  | 'odds_1w_pts';

export const WATCH_METRICS: Record<WatchMetric, { label: string; unit: string; source: string }> = {
  yield_level: { label: '10Y yield', unit: '%', source: 'official 10Y yield' },
  yield_3m_bps: { label: '10Y yield change over 3 months', unit: 'bps', source: 'official monthly 10Y yield' },
  policy_rate: { label: 'Policy rate', unit: '%', source: 'BIS policy rates' },
  cli_level: { label: 'OECD leading indicator', unit: '', source: 'OECD CLI via DBnomics' },
  cftc_percentile: { label: 'CFTC positioning percentile (3 years)', unit: 'th percentile', source: 'CFTC TFF' },
  tone_shift: { label: 'GDELT news tone shift', unit: 'pts', source: 'GDELT tone timeline' },
  reserves_12m_pct: { label: 'Reserves change over 12 months', unit: '%', source: 'IMF reserves' },
  shock_alerts: { label: 'Shock early-warning alerts', unit: '', source: 'stated rules (Country tab)' },
  odds_1w_pts: { label: 'Largest weekly Polymarket odds move (either way)', unit: 'pts', source: 'Polymarket' },
};

export type WatchOp = '>=' | '<=';

export interface WatchRule {
  id: string;
  /** A watchlist country (ISO3), or '*' for every country on screen. */
  iso3: string;
  metric: WatchMetric;
  op: WatchOp;
  value: number;
  createdAt: string;
  note?: string;
}

export const MAX_RULES = 100;

/** A rule as sent by the page, checked. Null when anything is off. */
export function parseRule(x: unknown): WatchRule | null {
  const r = x as Partial<WatchRule> | null;
  if (!r || typeof r !== 'object') return null;
  if (typeof r.iso3 !== 'string' || !/^(\*|[A-Z]{3})$/.test(r.iso3)) return null;
  if (typeof r.metric !== 'string' || !(r.metric in WATCH_METRICS)) return null;
  if (r.op !== '>=' && r.op !== '<=') return null;
  if (typeof r.value !== 'number' || !Number.isFinite(r.value)) return null;
  return {
    id: typeof r.id === 'string' && /^[\w-]{1,40}$/.test(r.id) ? r.id : `w${Date.now().toString(36)}`,
    iso3: r.iso3,
    metric: r.metric as WatchMetric,
    op: r.op,
    value: r.value,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt.slice(0, 30) : new Date().toISOString(),
    ...(typeof r.note === 'string' && r.note.trim() ? { note: r.note.trim().slice(0, 200) } : {}),
  };
}

export function parseRules(x: unknown): WatchRule[] {
  const list = (x as { rules?: unknown })?.rules;
  return Array.isArray(list) ? list.map(parseRule).filter((r): r is WatchRule => r !== null).slice(0, MAX_RULES) : [];
}

export const WATCH_RULES_FILE_NAME = 'local/watch-rules.json';

/** The saved rules; [] when there is no file yet or it cannot be read. */
export async function loadWatchRules(platform: Platform): Promise<WatchRule[]> {
  try {
    const text = await platform.files.read(WATCH_RULES_FILE_NAME);
    return text === null ? [] : parseRules(JSON.parse(text));
  } catch {
    return [];
  }
}

export async function saveWatchRules(platform: Platform, rules: WatchRule[]): Promise<void> {
  await platform.files.write(WATCH_RULES_FILE_NAME, JSON.stringify({ rules }));
}
