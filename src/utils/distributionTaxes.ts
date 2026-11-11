/**
 * Distribution and taxes (data batch G16): inequality, tax revenue, the split of taxes by type, and
 * applied tariffs, all from the World Bank's free World Development Indicators (CC BY 4.0).
 *
 * - Gini index (SI.POV.GINI): from household surveys, which most countries run only every few years.
 *   The app looks back up to GINI_LOOKBACK_YEARS and always shows the survey year. Some countries'
 *   surveys measure income and others consumption; the two are not the same (consumption is spread
 *   more evenly than income, so a consumption Gini reads lower).
 * - Tax revenue (GC.TAX.TOTL.GD.ZS): central government only, so it is lower than the IMF's general
 *   government revenue, which adds states, local government and social security.
 * - Tax split (GC.TAX.YPKG.RV.ZS, GC.TAX.GSRV.RV.ZS, GC.TAX.INTT.RV.ZS): taxes on income and profits,
 *   on goods and services, and on international trade, each as % of central government revenue.
 * - Applied tariff, all products (TM.TAX.MRCH.WM.AR.ZS weighted by imports, TM.TAX.MRCH.SM.AR.ZS
 *   simple mean): yearly, from WITS/TRAINS, so tariff changes made since that year are not in it.
 *
 * Only figures a live feed marked are used; nothing built in. Browser-safe: no fs, no network.
 */
import type { OpenDataSnapshot } from '../types/council';

/** Gini surveys older than this many years are left out. */
export const GINI_LOOKBACK_YEARS = 15;
/** A survey older than this many years is said to be old. */
export const GINI_OLD_YEARS = 5;

export const GINI_CODE = 'SI.POV.GINI';

export type DistTaxField =
  | 'giniIndex'
  | 'taxRevenuePctGdp'
  | 'taxIncomePctRevenue'
  | 'taxGoodsPctRevenue'
  | 'taxTradePctRevenue'
  | 'tariffWeightedPct'
  | 'tariffSimplePct';

/** The World Bank codes, the snapshot field each fills, and how many yearly rows to ask for. */
export const DIST_TAX_CODES: Array<{ code: string; field: DistTaxField; perPage: number }> = [
  { code: GINI_CODE, field: 'giniIndex', perPage: GINI_LOOKBACK_YEARS + 2 },
  { code: 'GC.TAX.TOTL.GD.ZS', field: 'taxRevenuePctGdp', perPage: 8 },
  { code: 'GC.TAX.YPKG.RV.ZS', field: 'taxIncomePctRevenue', perPage: 8 },
  { code: 'GC.TAX.GSRV.RV.ZS', field: 'taxGoodsPctRevenue', perPage: 8 },
  { code: 'GC.TAX.INTT.RV.ZS', field: 'taxTradePctRevenue', perPage: 8 },
  { code: 'TM.TAX.MRCH.WM.AR.ZS', field: 'tariffWeightedPct', perPage: 8 },
  { code: 'TM.TAX.MRCH.SM.AR.ZS', field: 'tariffSimplePct', perPage: 8 },
];

export type GiniWelfare = 'income' | 'consumption';

interface WbRow {
  date?: unknown;
  value?: unknown;
  footnote?: unknown;
}

/**
 * The latest usable row of a World Bank reply (rows come newest first). Shares and indexes must lie
 * between 0 and 100. For the Gini, a survey older than GINI_LOOKBACK_YEARS before this year is not used.
 */
export function pickDistTaxRow(code: string, rows: unknown, now: Date = new Date()): { value: number; year: string; welfare?: GiniWelfare } | undefined {
  if (!Array.isArray(rows)) return undefined;
  const oldest = now.getUTCFullYear() - GINI_LOOKBACK_YEARS;
  for (const r of rows as WbRow[]) {
    const v = r?.value;
    const year = String(r?.date ?? '');
    if (typeof v !== 'number' || !Number.isFinite(v) || !/^\d{4}$/.test(year)) continue;
    if (v < 0 || v > 100) continue;
    if (code === GINI_CODE) {
      if (Number(year) < oldest) return undefined;
      const welfare = welfareFromNote(r.footnote);
      return { value: v, year, ...(welfare ? { welfare } : {}) };
    }
    return { value: v, year };
  }
  return undefined;
}

/** Income or consumption, when the World Bank's footnote for the survey says which. */
export function welfareFromNote(note: unknown): GiniWelfare | undefined {
  if (typeof note !== 'string') return undefined;
  const c = /consumption|expenditure/i.test(note);
  const i = /\bincome\b/i.test(note);
  return c && !i ? 'consumption' : i && !c ? 'income' : undefined;
}

export interface YearFigure {
  value: number;
  year: string;
}

export interface DistTaxFigures {
  gini?: YearFigure & { welfare?: GiniWelfare };
  taxRevenuePctGdp?: YearFigure;
  taxIncomePctRevenue?: YearFigure;
  taxGoodsPctRevenue?: YearFigure;
  taxTradePctRevenue?: YearFigure;
  tariffWeightedPct?: YearFigure;
  tariffSimplePct?: YearFigure;
}

const yearOf = (tag: string | undefined) => /((?:19|20)\d{2})/.exec(tag || '')?.[1];

/** The live figures of a snapshot, each with the year in its source tag; undefined when none is live. */
export function distTaxFromSnapshot(snap: OpenDataSnapshot): DistTaxFigures | undefined {
  const lf = snap.liveFields || {};
  const wb = (snap.worldBankIndicators || {}) as unknown as Record<string, unknown>;
  const get = (field: DistTaxField): YearFigure | undefined => {
    const tag = lf[`wb.${field}`];
    const v = wb[field];
    const year = yearOf(tag);
    return tag && tag !== 'AI estimate' && year && typeof v === 'number' && Number.isFinite(v) ? { value: v, year } : undefined;
  };
  const out: DistTaxFigures = {};
  const g = get('giniIndex');
  if (g) out.gini = { ...g, ...(snap.worldBankIndicators?.giniWelfare ? { welfare: snap.worldBankIndicators.giniWelfare } : {}) };
  for (const f of ['taxRevenuePctGdp', 'taxIncomePctRevenue', 'taxGoodsPctRevenue', 'taxTradePctRevenue', 'tariffWeightedPct', 'tariffSimplePct'] as const) {
    const x = get(f);
    if (x) out[f] = x;
  }
  return Object.keys(out).length ? out : undefined;
}

export const WELFARE_LABEL: Record<GiniWelfare, string> = {
  income: 'income survey',
  consumption: 'consumption survey',
};

/** "34.5 (2021 income survey)"; adds that the survey is old when it is. */
export function giniValue(g: YearFigure & { welfare?: GiniWelfare }, now: Date = new Date()): string {
  const age = now.getUTCFullYear() - Number(g.year);
  const kind = g.welfare ? WELFARE_LABEL[g.welfare] : 'survey';
  return `${g.value.toFixed(1)} (${g.year} ${kind}${age > GINI_OLD_YEARS ? `, ${age} years old` : ''})`;
}

export const GINI_SOURCE = 'World Bank WDI (household surveys, Poverty and Inequality Platform)';
export const TAX_SOURCE = 'World Bank WDI (IMF Government Finance Statistics)';
export const TARIFF_SOURCE = 'World Bank WDI (WITS/TRAINS)';
export const TAX_CENTRAL_NOTE = 'central government only, so lower than the IMF general government revenue';
export const TARIFF_LAG_NOTE = 'tariff changes made since that year are not included';
