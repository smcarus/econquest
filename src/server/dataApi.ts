/**
 * Data API for scripts (plan item L3): the read-only addresses the app's own screens already use for
 * series, panels and table downloads, listed once so the guide (docs/DATA_API.md), the sign-in check
 * and the request limit all agree. Nothing here adds data: a script sees exactly what the screens
 * show, with the same Missing reasons and the same sharing-mode rules on downloads.
 *
 * - Sign-in off (the default on one computer): the addresses answer as they do for the app's pages.
 * - Sign-in on: a script with no account may read these addresses only when the integration API key
 *   is switched on (Advanced AI set-up > "Enforce X-SMCR-API-Key Header") and it sends that key in an
 *   `X-SMCR-API-Key` or `Authorization: Bearer` header. Never in the address, so it stays out of logs.
 * - Every read that does not come from a signed-in account is counted against a per-address limit,
 *   so a script in a loop cannot slow the app for everyone else.
 */
import { timingSafeEqual } from 'crypto';

export interface DataApiAddress {
  /** Express-style path, as written in the guide. */
  path: string;
  what: string;
}

export const DATA_API: DataApiAddress[] = [
  { path: '/api/series/:iso3', what: 'Every series the app holds for one country: id, label, unit, frequency, source, first and last date, latest value; plus what is Missing and why.' },
  { path: '/api/series/:iso3/:id', what: 'One series in full: every dated value with its source.' },
  { path: '/api/series/world', what: 'Series not about one country (commodity prices, stress indexes, your own world series).' },
  { path: '/api/series/world/:id', what: 'One world series in full.' },
  { path: '/api/panel', what: 'Countries by figures (?countries=BRA,MEX&figures=policy_rate,cpi_monthly&mode=latest|history); latest cells, or a 50-row preview of the history.' },
  { path: '/api/export/:iso3/series.csv', what: 'Every series for one country as one long table (also .xlsx).' },
  { path: '/api/export/:iso3/series/:id.csv', what: 'One series as a table (also .xlsx).' },
  { path: '/api/export/world/series.csv', what: 'World series as a table (also .xlsx).' },
  { path: '/api/export/panel.csv', what: 'The panel as a table, same query as /api/panel; mode=history gives every date (also .xlsx).' },
  { path: '/api/export/:iso3/figures.csv', what: 'The latest figures for one country with source and period; ?asOf=YYYY-MM-DD gives them as saved on a past day (also .xlsx).' },
];

const SEG = '[A-Za-z0-9_.-]+';
const READ_PATTERNS: RegExp[] = [
  new RegExp(`^/api/series/${SEG}$`),
  new RegExp(`^/api/series/${SEG}/${SEG}$`),
  /^\/api\/panel$/,
  new RegExp(`^/api/export/${SEG}/series\\.(csv|xlsx)$`),
  new RegExp(`^/api/export/${SEG}/series/${SEG}\\.(csv|xlsx)$`),
  /^\/api\/export\/panel\.(csv|xlsx)$/,
  new RegExp(`^/api/export/${SEG}/figures\\.(csv|xlsx)$`),
];

/** True for a GET or HEAD on one of the data addresses above. */
export function isDataApiRead(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') return false;
  const p = path.split('?')[0]!;
  return READ_PATTERNS.some((r) => r.test(p));
}

/** The key a script sent, from the header only (an address would leak it into logs and history). */
export function apiKeyFrom(headers: Record<string, string | string[] | undefined>): string {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const direct = pick(headers['x-smcr-api-key']).trim();
  if (direct) return direct;
  const auth = pick(headers.authorization).trim();
  return /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : '';
}

/** Constant-time comparison; an empty key never matches. */
export function keyMatches(given: string, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reads per minute for one address that is not a signed-in account (the app's own pages use a few). */
export const DATA_API_LIMIT = { burst: 120, perMinute: 120 };
