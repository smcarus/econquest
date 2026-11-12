/**
 * Trade and commodity exposure (data batch G18): what a country sells and buys abroad, how much of
 * its energy it imports, how concentrated its exports are and who buys them.
 *
 * - Shares of merchandise exports and imports in fuel, ores and metals, food and manufactures
 *   (World Bank WDI TX.VAL.*.ZS.UN and TM.VAL.*.ZS.UN, from UN Comtrade by SITC group). The four
 *   groups do not add up to 100%: farm raw materials and goods not classified are left out.
 * - Net energy imports, % of energy use (EG.IMP.CONS.ZS): energy use minus production, as a share
 *   of use. Negative means the country produces more than it uses (a net exporter). The World Bank
 *   stopped updating some energy balance series years ago, so the year is always shown and an old
 *   year is said to be old.
 * - Export concentration (Herfindahl index across HS chapters) and the top five export markets come
 *   from the UN Comtrade profile the app already pulls (utils/comtradeTrade.ts); the index is the
 *   app's own calculation, labelled so.
 *
 * Only figures a live feed answered are used; nothing built in. Browser-safe: no fs, no network.
 */
import type { OpenDataSnapshot } from '../types/council';
import { EXPORT_HHI_RULE, type ComtradeProfile } from './comtradeTrade';

export type TradeMixField =
  | 'exportFuelPct'
  | 'exportOresMetalsPct'
  | 'exportFoodPct'
  | 'exportManufPct'
  | 'importFuelPct'
  | 'importOresMetalsPct'
  | 'importFoodPct'
  | 'importManufPct'
  | 'netEnergyImportsPct';

/** The World Bank codes, the snapshot field each fills, and how many yearly rows to ask for. */
export const TRADE_MIX_CODES: Array<{ code: string; field: TradeMixField; perPage: number }> = [
  { code: 'TX.VAL.FUEL.ZS.UN', field: 'exportFuelPct', perPage: 8 },
  { code: 'TX.VAL.MMTL.ZS.UN', field: 'exportOresMetalsPct', perPage: 8 },
  { code: 'TX.VAL.FOOD.ZS.UN', field: 'exportFoodPct', perPage: 8 },
  { code: 'TX.VAL.MANF.ZS.UN', field: 'exportManufPct', perPage: 8 },
  { code: 'TM.VAL.FUEL.ZS.UN', field: 'importFuelPct', perPage: 8 },
  { code: 'TM.VAL.MMTL.ZS.UN', field: 'importOresMetalsPct', perPage: 8 },
  { code: 'TM.VAL.FOOD.ZS.UN', field: 'importFoodPct', perPage: 8 },
  { code: 'TM.VAL.MANF.ZS.UN', field: 'importManufPct', perPage: 8 },
  // Energy balances can stop years before today, so look further back and show the year.
  { code: 'EG.IMP.CONS.ZS', field: 'netEnergyImportsPct', perPage: 20 },
];

export const EXPORT_FIELDS = ['exportFuelPct', 'exportOresMetalsPct', 'exportFoodPct', 'exportManufPct'] as const;
export const IMPORT_FIELDS = ['importFuelPct', 'importOresMetalsPct', 'importFoodPct', 'importManufPct'] as const;
type ShareField = (typeof EXPORT_FIELDS)[number] | (typeof IMPORT_FIELDS)[number];

export const GROUP_LABEL: Record<ShareField, string> = {
  exportFuelPct: 'fuel',
  exportOresMetalsPct: 'ores and metals',
  exportFoodPct: 'food',
  exportManufPct: 'manufactures',
  importFuelPct: 'fuel',
  importOresMetalsPct: 'ores and metals',
  importFoodPct: 'food',
  importManufPct: 'manufactures',
};

/** An energy figure older than this many years is said to be old. */
export const ENERGY_OLD_YEARS = 5;

export interface TradeMixRow {
  value: number;
  year: string;
}

/**
 * The latest usable row of a World Bank reply (rows come newest first). Shares must lie between 0
 * and 100. Net energy imports must be at most 100 (a country cannot import more than it uses); it
 * has no lower limit, since a large exporter can produce many times what it uses.
 */
export function pickTradeMixRow(field: TradeMixField, rows: unknown): TradeMixRow | undefined {
  if (!Array.isArray(rows)) return undefined;
  for (const r of rows as Array<{ date?: unknown; value?: unknown }>) {
    const v = r?.value;
    const year = String(r?.date ?? '');
    if (typeof v !== 'number' || !Number.isFinite(v) || !/^\d{4}$/.test(year)) continue;
    if (v > 100) continue;
    if (field !== 'netEnergyImportsPct' && v < 0) continue;
    return { value: v, year };
  }
  return undefined;
}

/** The source tag; the year comes first so the year readers find it. */
export const tradeMixTag = (row: TradeMixRow): string => `World Bank, ${row.year}`;

export interface YearValue {
  value: number;
  year: string;
}

export interface TradeMixFigures {
  exportFuelPct?: YearValue;
  exportOresMetalsPct?: YearValue;
  exportFoodPct?: YearValue;
  exportManufPct?: YearValue;
  importFuelPct?: YearValue;
  importOresMetalsPct?: YearValue;
  importFoodPct?: YearValue;
  importManufPct?: YearValue;
  netEnergyImportsPct?: YearValue;
}

const yearOf = (tag: string | undefined) => /((?:19|20)\d{2})/.exec(tag || '')?.[1];

/** The live figures of a snapshot, each with the year in its source tag; undefined when none is live. */
export function tradeMixFromSnapshot(snap: OpenDataSnapshot): TradeMixFigures | undefined {
  const lf = snap.liveFields || {};
  const wb = (snap.worldBankIndicators || {}) as unknown as Record<string, unknown>;
  const out: TradeMixFigures = {};
  for (const { field } of TRADE_MIX_CODES) {
    const tag = lf[`wb.${field}`];
    const v = wb[field];
    const year = yearOf(tag);
    if (!tag || tag === 'AI estimate' || !year || typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[field] = { value: v, year };
  }
  return Object.keys(out).length ? out : undefined;
}

/** "manufactures 55.2%, food 20.0%, fuel 12.3%, ores and metals 4.1% (2023)": largest first, the latest year shared by all. */
export function shareSplitValue(f: TradeMixFigures, fields: readonly ShareField[]): string | undefined {
  const parts = fields.map((k) => ({ k, v: f[k] })).filter((p): p is { k: ShareField; v: YearValue } => !!p.v);
  if (!parts.length) return undefined;
  const years = [...new Set(parts.map((p) => p.v.year))].sort();
  const yearText = years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;
  return `${parts
    .sort((a, b) => b.v.value - a.v.value)
    .map((p) => `${GROUP_LABEL[p.k]} ${p.v.value.toFixed(1)}%`)
    .join(', ')} (${yearText})`;
}

/**
 * "Net importer: imports 45% of the energy it uses (2015)" or "Net exporter: produces 2.3 times the
 * energy it uses (2015)"; says when the figure is old.
 */
export function netEnergyValue(e: YearValue, now: Date = new Date()): string {
  const age = now.getUTCFullYear() - Number(e.year);
  const old = age > ENERGY_OLD_YEARS ? `, ${age} years old` : '';
  if (e.value >= 0) return `Net importer: imports ${e.value.toFixed(0)}% of the energy it uses (${e.year}${old})`;
  const times = 1 - e.value / 100;
  return `Net exporter: produces ${times.toFixed(1)} times the energy it uses (${e.year}${old})`;
}

/** "0.18, as concentrated as about 6 equal-sized product groups (UN Comtrade 2024, 96 HS chapters)". */
export function concentrationValue(hhi: NonNullable<ComtradeProfile['exportHhi']>, year: string | undefined): string {
  const equiv = 1 / hhi.value;
  return `${hhi.value.toFixed(2)}, as concentrated as about ${equiv >= 10 ? equiv.toFixed(0) : equiv.toFixed(1)} equal-sized product groups (UN Comtrade${year ? ` ${year}` : ''}, ${hhi.chapters} HS chapters)`;
}

/** "China 30.7%, United States 10.2%, …" for up to five partners. */
export function topPartnersValue(p: Pick<ComtradeProfile, 'topExportPartners' | 'year'>): string {
  return `${p.topExportPartners
    .slice(0, 5)
    .map((x) => `${x.name} ${x.sharePct.toFixed(1)}%`)
    .join(', ')} (${p.year})`;
}

export const TRADE_MIX_SOURCE = 'World Bank WDI (from UN Comtrade, by SITC group)';
export const ENERGY_SOURCE = 'World Bank WDI (IEA energy balances)';
export const CONCENTRATION_SOURCE = `${EXPORT_HHI_RULE}`;
export const TRADE_GROUPS_NOTE = 'The four groups do not add up to 100%: farm raw materials and goods not classified are left out.';
