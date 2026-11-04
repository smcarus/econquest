/**
 * The watchlist table's columns and the user's choice of them, shared by the Workspace card and
 * the pop-out window (?view=watchlist). Choices are kept in this browser's storage, so a change in
 * one window shows in the other.
 */
import type { WatchlistGroup, WatchlistItem } from '../types/council';
import { cdsSourceNote, yieldSourceNote } from './watchlistYield';

export const WATCHLIST_STORAGE_KEY = 'sovereign_council_watchlists_v1';
export const WATCHLIST_VIEW_KEY = 'econquest.watchlistView.v1';
/** Messages between the main window and the pop-out. */
export const WATCHLIST_CHANNEL = 'econquest-watchlist';
export type WatchlistMessage = { type: 'open-country'; iso3: string };

/** What the previous visit recorded, for the change columns. */
export type LastLook = Record<string, { cds5YBps: number; yield10YPct: number; compositeRisk: number; yieldSource?: string }>;

export type ColumnId =
  | 'risk'
  | 'cds'
  | 'cdsChange'
  | 'yield'
  | 'yieldChange'
  | 'debt'
  | 'reserves'
  | 'cpi'
  | 'policy'
  | 'reer'
  | 'fxvol'
  | 'data';

export interface ColumnDef {
  id: ColumnId;
  label: string;
  /** Plain words for the column picker. */
  help: string;
  align: 'left' | 'right';
  /** Sort key; undefined sorts last. */
  value: (it: WatchlistItem, last?: LastLook) => number | string | undefined;
  /** Shown value; '–' when there is no figure. */
  text: (it: WatchlistItem, last?: LastLook) => string;
  /** Where the figure came from, shown under it. */
  note?: (it: WatchlistItem) => string | undefined;
  /** For colouring changes. */
  higherIsWorse?: boolean;
  isChange?: boolean;
}

const DATA_LABEL: Record<NonNullable<WatchlistItem['dataMode']>, string> = {
  live: 'Live',
  partial: 'Partly live',
  sample: 'Sample',
  unverified: 'Not checked',
};

const num = (v: number | undefined, digits: number, unit = '') => (v === undefined || !Number.isFinite(v) ? '–' : `${v.toFixed(digits)}${unit}`);
const signed = (v: number | undefined, digits: number, unit = '') =>
  v === undefined || Math.abs(v) < Math.pow(10, -digits) / 2 ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}${unit}`;

export function cdsChange(it: WatchlistItem, last?: LastLook): number | undefined {
  const prev = last?.[it.iso3];
  return prev ? it.cds5YBps - prev.cds5YBps : undefined;
}

/** A yield change only when both figures come from the same kind of source, in basis points. */
export function yieldChangeBp(it: WatchlistItem, last?: LastLook): number | undefined {
  const prev = last?.[it.iso3];
  if (!prev || (prev.yieldSource || 'sample') !== (it.yield10YSource || 'sample')) return undefined;
  return (it.yield10YPct - prev.yield10YPct) * 100;
}

export const COLUMNS: ColumnDef[] = [
  { id: 'risk', label: 'Risk', help: 'Composite risk score, 0 to 1', align: 'left', value: (it) => it.compositeRisk, text: (it) => it.compositeRisk.toFixed(2) },
  { id: 'cds', label: '5Y CDS (bps)', help: 'Five-year credit default swap spread', align: 'right', value: (it) => it.cds5YBps, text: (it) => String(Math.round(it.cds5YBps)), note: (it) => cdsSourceNote(it) },
  { id: 'cdsChange', label: 'CDS change', help: 'Since your last visit', align: 'right', value: cdsChange, text: (it, l) => signed(cdsChange(it, l), 0), higherIsWorse: true, isChange: true },
  { id: 'yield', label: '10Y yield', help: 'Ten-year government bond yield', align: 'right', value: (it) => it.yield10YPct, text: (it) => num(it.yield10YPct, 2, '%'), note: (it) => yieldSourceNote(it) },
  { id: 'yieldChange', label: 'Yield change', help: 'Since your last visit, same kind of source only', align: 'right', value: yieldChangeBp, text: (it, l) => signed(yieldChangeBp(it, l), 0, ' bp'), higherIsWorse: true, isChange: true },
  { id: 'debt', label: 'Debt/GDP', help: 'Government debt as a share of GDP', align: 'right', value: (it) => it.debtToGdpPct, text: (it) => num(it.debtToGdpPct, 1, '%') },
  { id: 'reserves', label: 'Reserves (mo)', help: 'FX reserves in months of imports', align: 'right', value: (it) => it.fxReservesMonths, text: (it) => num(it.fxReservesMonths, 1) },
  {
    id: 'cpi',
    label: 'Inflation',
    help: 'CPI inflation, IMF',
    align: 'right',
    value: (it) => it.cpiInflationPct,
    text: (it) => num(it.cpiInflationPct, 1, '%'),
    note: (it) => (it.cpiInflationPct === undefined ? undefined : it.cpiSource === 'live' ? 'Live, IMF' : 'Sample'),
  },
  {
    id: 'policy',
    label: 'Policy rate',
    help: 'Central bank policy rate',
    align: 'right',
    value: (it) => it.policyRatePct,
    text: (it) => num(it.policyRatePct, 2, '%'),
    note: (it) => (it.policyRatePct === undefined ? undefined : it.policyRateSource === 'ai_estimate' ? 'AI estimate' : 'Sample'),
  },
  {
    id: 'reer',
    label: 'REER vs 10y avg',
    help: 'Real effective exchange rate against its 10-year average, BIS',
    align: 'right',
    value: (it) => it.reerGapPct,
    text: (it) => signed(it.reerGapPct, 1, '%'),
    note: (it) => (it.reerGapPct === undefined ? undefined : it.reerPeriod ? `BIS, ${it.reerPeriod}` : 'BIS'),
  },
  {
    id: 'fxvol',
    label: 'FX vol (3m)',
    help: 'Three-month realised volatility against the US dollar, ECB rates',
    align: 'right',
    value: (it) => it.fxVol3mPct,
    text: (it) => num(it.fxVol3mPct, 1, '%'),
    note: (it) => (it.fxVol3mPct === undefined ? undefined : 'ECB rates'),
  },
  { id: 'data', label: 'Data', help: 'Whether the row came from live feeds', align: 'left', value: (it) => DATA_LABEL[it.dataMode || 'sample'], text: (it) => DATA_LABEL[it.dataMode || 'sample'] },
];

export const COLUMN_BY_ID = Object.fromEntries(COLUMNS.map((c) => [c.id, c])) as Record<ColumnId, ColumnDef>;

/** The columns the Workspace table always showed, in the same order. */
export const DEFAULT_COLUMNS: ColumnId[] = ['risk', 'cds', 'cdsChange', 'yield', 'yieldChange', 'debt', 'reserves', 'data'];

export type SortKey = 'country' | ColumnId;
export interface WatchlistView {
  columns: ColumnId[];
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  /** The list the pop-out shows; absent = the first list. */
  watchlistId?: string;
}

export const DEFAULT_VIEW: WatchlistView = { columns: DEFAULT_COLUMNS, sort: { key: 'risk', dir: 'desc' } };

/** Keeps only known columns, without repeats; falls back to the defaults when nothing usable is left. */
export function cleanView(raw: unknown): WatchlistView {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<WatchlistView>;
  const cols = Array.isArray(r.columns) ? r.columns.filter((c, i, a): c is ColumnId => c in COLUMN_BY_ID && a.indexOf(c) === i) : [];
  const key = r.sort?.key === 'country' || (r.sort?.key && r.sort.key in COLUMN_BY_ID) ? r.sort.key : DEFAULT_VIEW.sort.key;
  const dir = r.sort?.dir === 'asc' ? 'asc' : 'desc';
  return {
    columns: cols.length ? cols : [...DEFAULT_COLUMNS],
    sort: { key, dir },
    ...(typeof r.watchlistId === 'string' && r.watchlistId ? { watchlistId: r.watchlistId } : {}),
  };
}

export function loadView(): WatchlistView {
  try {
    const raw = globalThis.localStorage?.getItem(WATCHLIST_VIEW_KEY);
    return cleanView(raw ? JSON.parse(raw) : null);
  } catch {
    return cleanView(null);
  }
}

export function saveView(view: WatchlistView): void {
  try {
    globalThis.localStorage?.setItem(WATCHLIST_VIEW_KEY, JSON.stringify(view));
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

export function toggleColumn(view: WatchlistView, id: ColumnId): WatchlistView {
  const on = view.columns.includes(id);
  if (on && view.columns.length === 1) return view; // keep at least one figure
  const columns = on ? view.columns.filter((c) => c !== id) : [...view.columns, id];
  return { ...view, columns };
}

export function moveColumn(view: WatchlistView, id: ColumnId, by: -1 | 1): WatchlistView {
  const i = view.columns.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= view.columns.length) return view;
  const columns = [...view.columns];
  [columns[i], columns[j]] = [columns[j], columns[i]];
  return { ...view, columns };
}

/** Clicking a header: the same key flips direction, a new key starts high to low (A to Z for text). */
export function sortBy(view: WatchlistView, key: SortKey): WatchlistView {
  if (view.sort.key === key) return { ...view, sort: { key, dir: view.sort.dir === 'asc' ? 'desc' : 'asc' } };
  const textual = key === 'country' || key === 'data';
  return { ...view, sort: { key, dir: textual ? 'asc' : 'desc' } };
}

/** Rows in the chosen order; a row with no figure for the key always goes last. */
export function sortRows(items: WatchlistItem[], view: WatchlistView, last?: LastLook): WatchlistItem[] {
  const { key, dir } = view.sort;
  const get = (it: WatchlistItem) => (key === 'country' ? it.countryName : COLUMN_BY_ID[key].value(it, last));
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va === undefined && vb === undefined) return a.countryName.localeCompare(b.countryName);
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    const c = typeof va === 'string' || typeof vb === 'string' ? String(va).localeCompare(String(vb)) : va - vb;
    return c * sign || a.countryName.localeCompare(b.countryName);
  });
}

/** The saved watchlists, as the main window keeps them. */
export function loadWatchlists(): WatchlistGroup[] {
  try {
    const raw = globalThis.localStorage?.getItem(WATCHLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as WatchlistGroup[]) : [];
  } catch {
    return [];
  }
}

export function saveWatchlists(groups: WatchlistGroup[]): void {
  try {
    globalThis.localStorage?.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Storage unavailable.
  }
}

export function addToList(groups: WatchlistGroup[], listId: string, item: WatchlistItem): WatchlistGroup[] {
  return groups.map((g) => (g.id !== listId || g.items.some((i) => i.iso3 === item.iso3) ? g : { ...g, items: [...g.items, item] }));
}

export function removeFromList(groups: WatchlistGroup[], listId: string, iso3: string): WatchlistGroup[] {
  return groups.map((g) => (g.id === listId ? { ...g, items: g.items.filter((i) => i.iso3 !== iso3) } : g));
}

export const POP_OUT_URL = '/?view=watchlist';
