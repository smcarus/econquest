/**
 * Positions sent by an outside system as JSON (console integration item 7). The same rules as the
 * CSV import (src/utils/holdings.ts): a country by ISO code, a non-zero notional in USD millions,
 * optional duration and identifiers checked by src/utils/securityIds.ts. Browser-safe.
 */
import { iso3FromCode } from '../data/iso3166Alpha2';
import { newHoldingId, parseAssetClass, type Holding, type HoldingAssetClass } from './holdings';
import { parseSecurityIds } from './securityIds';

export const MAX_API_HOLDINGS = 5000;
const CLASSES: HoldingAssetClass[] = ['HC_BOND', 'LC_BOND', 'CDS', 'FX', 'OTHER'];

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** One position from JSON, or the reasons it was refused. */
export function parseApiHolding(x: unknown, where: string): { holding?: Omit<Holding, 'id'>; errors: string[] } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { errors: [`${where}: send each position as an object.`] };
  const r = x as Record<string, unknown>;
  const errors: string[] = [];
  const country = str(r.country ?? r.iso3 ?? r.iso2);
  const iso3 = iso3FromCode(country);
  if (!iso3) errors.push(`${where}: country "${country}" is not an ISO alpha-2 or alpha-3 code.`);
  const nRaw = r.notional_usd_mm ?? r.notionalUsdMm;
  const n = typeof nRaw === 'number' ? nRaw : typeof nRaw === 'string' && nRaw.trim() ? Number(nRaw) : NaN;
  if (!Number.isFinite(n) || n === 0) errors.push(`${where}: notional_usd_mm must be a non-zero number (USD millions).`);
  const typeRaw = str(r.type ?? r.asset_class ?? r.assetClass);
  const assetClass = (CLASSES as string[]).includes(typeRaw.toUpperCase()) ? (typeRaw.toUpperCase() as HoldingAssetClass) : parseAssetClass(typeRaw);
  const sideRaw = str(r.side).toLowerCase();
  if (sideRaw && !['long', 'short', 'buy', 'sell'].includes(sideRaw)) errors.push(`${where}: side must be "long" or "short".`);
  const durRaw = r.duration ?? r.durationYears;
  const dur = durRaw === undefined || durRaw === null || durRaw === '' ? undefined : Number(durRaw);
  if (dur !== undefined && (!Number.isFinite(dur) || dur < 0 || dur > 100)) errors.push(`${where}: duration must be a number of years from 0 to 100.`);
  const ids = parseSecurityIds({ isin: str(r.isin), lei: str(r.lei), cik: str(r.cik), ticker: str(r.ticker), entityId: str(r.entity_id ?? r.entityId) }, where);
  errors.push(...ids.errors);
  const instrument = str(r.instrument).slice(0, 120);
  if (errors.length || !iso3) return { errors };
  return {
    errors: [],
    holding: {
      iso3,
      instrument: instrument || ids.ids.isin || `${iso3} position`,
      assetClass,
      side: sideRaw === 'short' || sideRaw === 'sell' || n < 0 ? 'SHORT' : 'LONG',
      notionalUsdMm: Math.abs(n),
      ...(dur !== undefined && dur > 0 ? { durationYears: dur } : {}),
      ...ids.ids,
    },
  };
}

/** A list of positions: all or nothing, with every problem listed. */
export function parseApiHoldings(list: unknown): { holdings: Omit<Holding, 'id'>[]; errors: string[] } {
  if (!Array.isArray(list)) return { holdings: [], errors: ['Send { "holdings": [ ... ] }.'] };
  if (list.length > MAX_API_HOLDINGS) return { holdings: [], errors: [`At most ${MAX_API_HOLDINGS} positions in one call.`] };
  const out: Omit<Holding, 'id'>[] = [];
  const errors: string[] = [];
  list.forEach((x, i) => {
    const r = parseApiHolding(x, `Position ${i + 1}`);
    if (r.holding) out.push(r.holding);
    errors.push(...r.errors);
  });
  const seen = new Set<string>();
  for (const h of out) {
    if (!h.entityId) continue;
    if (seen.has(h.entityId)) errors.push(`entity_id "${h.entityId}" is sent twice.`);
    seen.add(h.entityId);
  }
  return errors.length ? { holdings: [], errors } : { holdings: out, errors: [] };
}

/**
 * Merges positions from one sender into the saved list. Replace: that sender's positions become
 * exactly these. Upsert: a position with the same entity_id is replaced, the rest are added.
 * Positions added in the app or by other senders are never touched. Ids stay the same for a
 * position whose entity_id was already there.
 */
export function mergeApiHoldings(saved: Holding[], incoming: Omit<Holding, 'id'>[], from: { id: string; name: string }, mode: 'replace' | 'upsert'): Holding[] {
  const mine = saved.filter((h) => h.from === from.id);
  const others = saved.filter((h) => h.from !== from.id);
  const byEntity = new Map(mine.filter((h) => h.entityId).map((h) => [h.entityId!, h]));
  const made: Holding[] = incoming.map((h) => ({ ...h, id: (h.entityId && byEntity.get(h.entityId)?.id) || newHoldingId(), from: from.id, fromName: from.name }));
  if (mode === 'replace') return [...others, ...made];
  const replaced = new Set(made.map((h) => h.entityId).filter(Boolean));
  return [...others, ...mine.filter((h) => !h.entityId || !replaced.has(h.entityId)), ...made];
}

/** A position as the API shows it. */
export function apiHoldingView(h: Holding) {
  return {
    id: h.id,
    country: h.iso3,
    instrument: h.instrument,
    type: h.assetClass,
    side: h.side.toLowerCase(),
    notional_usd_mm: h.notionalUsdMm,
    ...(h.durationYears !== undefined ? { duration: h.durationYears } : {}),
    ...(h.isin ? { isin: h.isin } : {}),
    ...(h.lei ? { lei: h.lei } : {}),
    ...(h.cik ? { cik: h.cik } : {}),
    ...(h.ticker ? { ticker: h.ticker } : {}),
    ...(h.entityId ? { entity_id: h.entityId } : {}),
  };
}
