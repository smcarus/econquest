/**
 * Hidden names (console integration item 8). A list of countries and securities that must not
 * appear anywhere in the app or its API: positions, the watchlist, snapshots, events and the data
 * addresses leave them out and show only a count ("1 item hidden").
 *
 * The list holds fingerprints, never the names: SHA-256 of "eq-hidden:v1:<kind>:<normalised value>".
 * So no screen, reply, backup or log can show a hidden name, yet anything can be checked against
 * it. Adding or removing needs the name itself; listing shows kinds and counts only.
 *
 * Browser-safe: the hashing is supplied by the caller (node:crypto on the server, Web Crypto here).
 */
import { iso3FromCode } from '../data/iso3166Alpha2';
import { isCik, isIsin, isLei, isTicker } from './securityIds';

export const HIDDEN_KINDS = ['country', 'isin', 'lei', 'cik', 'ticker', 'entity_id'] as const;
export type HiddenKind = (typeof HIDDEN_KINDS)[number];
export const MAX_HIDDEN = 2000;

export interface HiddenEntry {
  id: string;
  kind: HiddenKind;
  /** SHA-256 hex of fingerprintText(kind, value). */
  fp: string;
  addedAt: string;
}

/** What the browser and the API get: kinds and fingerprints, never names. */
export interface HiddenView {
  count: number;
  byKind: Partial<Record<HiddenKind, number>>;
  fingerprints: Array<{ kind: HiddenKind; fp: string }>;
}

export function isHiddenKind(v: unknown): v is HiddenKind {
  return typeof v === 'string' && (HIDDEN_KINDS as readonly string[]).includes(v);
}

/** The value as it is compared, or a reason it cannot be used. */
export function normaliseHidden(kind: HiddenKind, raw: unknown): { value: string } | { error: string } {
  const v = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
  if (!v) return { error: `Give a ${kind.replace('_', ' ')}.` };
  switch (kind) {
    case 'country': {
      const iso3 = iso3FromCode(v);
      return iso3 ? { value: iso3 } : { error: `"${v.slice(0, 20)}" is not an ISO alpha-2 or alpha-3 country code.` };
    }
    case 'isin':
      return isIsin(v.toUpperCase()) ? { value: v.toUpperCase() } : { error: 'That is not a valid ISIN (12 characters with a check digit).' };
    case 'lei':
      return isLei(v.toUpperCase()) ? { value: v.toUpperCase() } : { error: 'That is not a valid LEI (20 characters with check digits).' };
    case 'cik': {
      const padded = v.replace(/^0+/, '').padStart(10, '0');
      return isCik(padded) ? { value: padded } : { error: 'That is not a CIK (up to 10 digits).' };
    }
    case 'ticker':
      return isTicker(v.toUpperCase()) ? { value: v.toUpperCase() } : { error: 'That is not a ticker.' };
    case 'entity_id':
      return v.length <= 128 ? { value: v } : { error: 'An entity ID is at most 128 characters.' };
  }
}

export function fingerprintText(kind: HiddenKind, value: string): string {
  return `eq-hidden:v1:${kind}:${value}`;
}

/** The (kind, value) pairs that name a position, normalised; for checking against the list. */
export function holdingNames(h: { iso3?: string; isin?: string; lei?: string; cik?: string; ticker?: string; entityId?: string }): Array<{ kind: HiddenKind; value: string }> {
  const out: Array<{ kind: HiddenKind; value: string }> = [];
  const push = (kind: HiddenKind, raw: string | undefined) => {
    if (!raw) return;
    const n = normaliseHidden(kind, raw);
    if ('value' in n) out.push({ kind, value: n.value });
  };
  push('country', h.iso3);
  push('isin', h.isin);
  push('lei', h.lei);
  push('cik', h.cik);
  push('ticker', h.ticker);
  push('entity_id', h.entityId);
  return out;
}

export function viewOf(entries: HiddenEntry[]): HiddenView {
  const byKind: Partial<Record<HiddenKind, number>> = {};
  for (const e of entries) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  return { count: entries.length, byKind, fingerprints: entries.map((e) => ({ kind: e.kind, fp: e.fp })) };
}

/** "1 item hidden" / "3 items hidden", for replies. */
export function hiddenNote(n: number): string {
  return n === 1 ? '1 item hidden' : `${n} items hidden`;
}
