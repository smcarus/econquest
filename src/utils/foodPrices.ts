/**
 * Food prices and food security (parked idea PA2, pulled forward by Sam on 13 November 2026): how fast
 * food prices are rising against prices in general, how many people go hungry, how much the country
 * depends on food from abroad, and how world prices of staple foods have moved.
 *
 * - Food price inflation: FAOSTAT Consumer Price Indices (food and general indices, monthly, 2015 = 100),
 *   read only from the file the user saves in data/local/fao-cpi/ (utils/faoCpiStore.ts). FAO's
 *   statistical databases are CC BY 4.0 by default, but this table is built from IMF, OECD and national
 *   figures and FAO fills some gaps with its own estimates, so the app ships none of it until its terms
 *   are confirmed. Values FAO flags as estimated (E) or imputed (I) are left out. Annual rate = index
 *   over the same month a year earlier, minus 1.
 * - Food security: undernourishment, moderate or severe and severe food insecurity (World Bank WDI
 *   SN.ITK.DEFC.ZS, SN.ITK.MSFI.ZS, SN.ITK.SVFI.ZS, from FAO, CC BY 4.0), three-year averages.
 * - Food trade: food as a share of goods exports and imports (WDI TX/TM.VAL.FOOD.ZS.UN) times goods
 *   exports and imports in US dollars, over GDP in US dollars, all for one year.
 * - World prices of staple foods: World Bank Pink Sheet monthly prices the app already reads.
 *
 * Only published figures; gaps say Missing with the reason. Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';
import type { PriceMove } from './commodityPrices';
import { ISO_NUMERIC_TO_ALPHA3 } from '../data/isoNumeric';

export const FOOD_IDS = ['undernourishment', 'food_insecurity', 'food_insecurity_severe', 'export_food', 'import_food', 'merch_exports_usd', 'merch_imports_usd', 'gdp_usd'] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export const STAPLE_CODES = ['RICE_05', 'WHEAT_US_HRW', 'MAIZE', 'SOYBEANS', 'PALM_OIL', 'SUGAR_WLD'];

export const FAO_CPI_URL = 'https://www.fao.org/faostat/en/#data/CP';
export const FAO_CPI_SETUP_HELP = `Food price inflation comes from the FAOSTAT Consumer Price Indices (FAO). FAO's statistical databases are CC BY 4.0 by default, but this table is built from IMF, OECD and national figures, so the app ships none of it until its terms are confirmed. To add it: open ${FAO_CPI_URL}, choose Bulk downloads, "All Data" or "All Data Normalized" (a .zip with .csv files inside), and put the .zip in data/local/fao-cpi/. The app reads it on this computer; nothing is sent anywhere.`;
export const FAO_CPI_NO_FILE = 'No FAOSTAT consumer price file in data/local/fao-cpi/ (its terms are not confirmed, so the app ships none of it)';
export const FAO_CPI_NO_COUNTRY = 'The FAOSTAT file has no food price index for this country';
export const FAO_CPI_TOO_SHORT = 'The FAOSTAT file has no two months 12 months apart for this country (values FAO estimated or filled in are left out)';

export const FOOD_SOURCES =
  'FAOSTAT Consumer Price Indices (FAO, from your file); World Bank World Development Indicators (from FAO, UN Comtrade, WTO) and Commodity Price Data (Pink Sheet), CC BY 4.0; IMF World Economic Outlook for GDP in US dollars';

export const FOOD_METHOD =
  'Food price inflation: FAOSTAT food and general consumer price indices, each month over the same month a year earlier, values flagged estimated or imputed left out. Food security: latest World Bank year. Net food imports: food share of goods imports times goods imports, minus the same for exports, over GDP, all for one year. World staple prices: World Bank Pink Sheet, 1 and 12 months. A description, not a forecast.';

/** One country's monthly indices, keyed YYYY-MM. */
export interface CpiSeries {
  food: Map<string, number>;
  general: Map<string, number>;
}

export interface FaoCpiTable {
  file: string;
  countries: Map<string, CpiSeries>;
  latestMonth: string;
  /** Values left out because FAO flagged them estimated or imputed. */
  leftOut: number;
}

const MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const SKIP_FLAGS = new Set(['E', 'I']);

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The FAOSTAT Consumer Price Indices table, in either layout FAO posts: "All Data" (one row per
 * country, item and month, a column per year with its flag beside it, Y2000 and Y2000F) or "All Data
 * Normalized" (one row per country, item, month and year, with Year, Value and Flag columns).
 */
export function faoCpiTable(rows: string[][], file: string): FaoCpiTable | { reason: string } {
  const head = (rows[0] || []).map((h) => norm(h.replace(/^\uFEFF/, '')));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const cM49 = col('area code (m49)', 'm49 code');
  const cIso = col('iso3 code', 'area code (iso3)');
  const cItem = col('item');
  const cMonth = col('months');
  const cYear = col('year');
  const cValue = col('value');
  const cFlag = col('flag');
  // Wide layout: a column per year (y2000), its flag in y2000f.
  const yearCols = head.flatMap((h, i) => {
    const m = /^y(\d{4})$/.exec(h);
    return m ? [{ year: Number(m[1]), value: i, flag: head.indexOf(`${h}f`) }] : [];
  });
  const long = cYear >= 0 && cValue >= 0;
  if ((cM49 < 0 && cIso < 0) || cItem < 0 || cMonth < 0 || (!long && !yearCols.length)) {
    return { reason: 'not the FAOSTAT Consumer Price Indices table (needs Area Code (M49), Item and Months columns, and either Year and Value columns or a column per year)' };
  }
  const countries = new Map<string, CpiSeries>();
  let latest = '';
  let leftOut = 0;
  for (const r of rows.slice(1)) {
    const item = norm(r[cItem] || '');
    // The country indices only; FAO's regional medians and weighted averages are left out.
    if (/median|weighted average/.test(item)) continue;
    const kind = /food indices/.test(item) ? 'food' : /general indices/.test(item) ? 'general' : null;
    if (!kind) continue;
    const mo = MONTHS[norm(r[cMonth] || '')];
    if (!mo) continue;
    let iso = cIso >= 0 ? (r[cIso] || '').trim().toUpperCase() : '';
    if (!/^[A-Z]{3}$/.test(iso) && cM49 >= 0) iso = ISO_NUMERIC_TO_ALPHA3[(r[cM49] || '').replace(/[^0-9]/g, '').padStart(3, '0')] || '';
    if (!iso) continue;
    const cells = long ? [{ year: Number(r[cYear]), raw: r[cValue], flag: cFlag >= 0 ? r[cFlag] : '' }] : yearCols.map((c) => ({ year: c.year, raw: r[c.value], flag: c.flag >= 0 ? r[c.flag] : '' }));
    for (const { year, raw, flag } of cells) {
      if (raw === undefined || String(raw).trim() === '') continue;
      const v = Number(raw);
      if (!Number.isFinite(year) || !Number.isFinite(v) || v <= 0) continue;
      if (SKIP_FLAGS.has((flag || '').trim().toUpperCase())) {
        leftOut++;
        continue;
      }
      const key = `${year}-${String(mo).padStart(2, '0')}`;
      const s = countries.get(iso) ?? { food: new Map(), general: new Map() };
      s[kind].set(key, v);
      countries.set(iso, s);
      if (key > latest) latest = key;
    }
  }
  if (!countries.size) return { reason: 'no food or general consumer price index rows for any country' };
  return { file, countries, latestMonth: latest, leftOut };
}

const back12 = (m: string) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

function annual(series: Map<string, number>, month: string): number | undefined {
  const now = series.get(month);
  const then = series.get(back12(month));
  return now !== undefined && then ? r1((now / then - 1) * 100) : undefined;
}

export interface FoodInflation {
  month: string;
  food: number;
  general?: number;
  /** Food minus general, points. */
  gap?: number;
  /** Up to the last 24 months with a food rate, oldest first. */
  months: Array<{ month: string; food: number; general?: number }>;
  /** Highest food rate in those months. */
  peak?: { month: string; food: number };
}

export interface FoodView {
  inflation?: FoodInflation;
  inflationMissing?: string;
  inflationFile?: string;
  security?: { undernourishment?: YearFig; insecurity?: YearFig; severe?: YearFig };
  securityMissing?: string;
  trade?: { year: number; foodExportsPctGdp: number; foodImportsPctGdp: number; netImportsPctGdp: number; importShare: number; exportShare: number };
  tradeMissing?: string;
  staples: Array<{ code: string; name: string; asOf: string; move1m?: number; move12m?: number }>;
  staplesMissing?: string;
  sources: string;
  method: string;
}

export interface YearFig {
  year: number;
  value: number;
}

const byYear = (pts: YearValue[] | undefined, beforeYear: number) => new Map((pts ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).map((p) => [p.year, p.value]));

function latestFig(m: Map<number, number>): YearFig | undefined {
  const ys = [...m.keys()].sort((a, b) => b - a);
  return ys.length ? { year: ys[0], value: r1(m.get(ys[0])!) } : undefined;
}

export interface FoodInput {
  iso3: string;
  series: Partial<Record<FoodId, YearValue[]>>;
  beforeYear: number;
  historySaved: boolean;
  cpi: { table: FaoCpiTable | null; reason?: string };
  moves: PriceMove[] | null;
  /** Latest month allowed (YYYY-MM), for the As of date; the whole file when absent. */
  beforeMonth?: string;
}

export function foodView(inp: FoodInput): FoodView {
  const out: FoodView = { staples: [], sources: FOOD_SOURCES, method: FOOD_METHOD };
  const noHistory = 'No saved World Bank history for this country yet (Data health > World Bank)';

  // Food price inflation.
  const table = inp.cpi.table;
  if (!table) out.inflationMissing = inp.cpi.reason || FAO_CPI_NO_FILE;
  else {
    out.inflationFile = table.file;
    const s = table.countries.get(inp.iso3);
    if (!s) out.inflationMissing = FAO_CPI_NO_COUNTRY;
    else {
      const months = [...s.food.keys()].filter((m) => !inp.beforeMonth || m < inp.beforeMonth).sort();
      const rated = months.flatMap((m) => {
        const f = annual(s.food, m);
        if (f === undefined) return [];
        const g = annual(s.general, m);
        return [{ month: m, food: f, ...(g !== undefined ? { general: g } : {}) }];
      });
      const last = rated[rated.length - 1];
      if (!last) out.inflationMissing = FAO_CPI_TOO_SHORT;
      else {
        const shown = rated.slice(-24);
        const peak = shown.reduce((b, x) => (x.food > b.food ? x : b), shown[0]);
        out.inflation = {
          month: last.month,
          food: last.food,
          ...(last.general !== undefined ? { general: last.general, gap: r1(last.food - last.general) } : {}),
          months: shown,
          peak: { month: peak.month, food: peak.food },
        };
      }
    }
  }

  // Food security and food trade, from the saved World Bank history.
  const m = Object.fromEntries(FOOD_IDS.map((id) => [id, byYear(inp.series[id], inp.beforeYear)])) as Record<FoodId, Map<number, number>>;
  const u = latestFig(m.undernourishment);
  const fi = latestFig(m.food_insecurity);
  const sv = latestFig(m.food_insecurity_severe);
  if (u || fi || sv) out.security = { ...(u ? { undernourishment: u } : {}), ...(fi ? { insecurity: fi } : {}), ...(sv ? { severe: sv } : {}) };
  else out.securityMissing = inp.historySaved ? 'The World Bank publishes no food security figures for this country' : noHistory;

  const years = [...m.import_food.keys()].filter((y) => m.export_food.has(y) && m.merch_imports_usd.has(y) && m.merch_exports_usd.has(y) && (m.gdp_usd.get(y) ?? 0) > 0).sort((a, b) => a - b);
  const ty = years[years.length - 1];
  if (ty === undefined) out.tradeMissing = inp.historySaved ? 'No year with food shares of goods trade, goods trade and GDP in US dollars together' : noHistory;
  else {
    const gdp = m.gdp_usd.get(ty)!;
    const imp = (m.import_food.get(ty)! / 100) * m.merch_imports_usd.get(ty)!;
    const exp = (m.export_food.get(ty)! / 100) * m.merch_exports_usd.get(ty)!;
    out.trade = {
      year: ty,
      foodImportsPctGdp: r2((imp / gdp) * 100),
      foodExportsPctGdp: r2((exp / gdp) * 100),
      netImportsPctGdp: r2(((imp - exp) / gdp) * 100),
      importShare: r1(m.import_food.get(ty)!),
      exportShare: r1(m.export_food.get(ty)!),
    };
  }

  // World staple prices.
  const byCode = new Map((inp.moves ?? []).filter((v) => v.source === 'pink_sheet').map((v) => [v.code, v]));
  out.staples = STAPLE_CODES.flatMap((c) => {
    const v = byCode.get(c);
    return v ? [{ code: c, name: v.name, asOf: v.asOf, ...(v.change1mPct !== undefined ? { move1m: v.change1mPct } : {}), ...(v.change12mPct !== undefined ? { move12m: v.change12mPct } : {}) }] : [];
  });
  if (!out.staples.length) out.staplesMissing = 'The World Bank Pink Sheet has not answered yet';
  return out;
}

const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

/** One English sentence for Explain in chat. */
export function foodSentence(f: FoodView, country: string): string {
  const parts: string[] = [];
  if (f.inflation) {
    parts.push(
      `In ${country}, food prices were ${signed(f.inflation.food)}% on a year earlier in ${f.inflation.month}${f.inflation.general !== undefined ? `, against ${signed(f.inflation.general)}% for all prices` : ''} (FAOSTAT)`,
    );
  } else parts.push(`${country}: food price inflation Missing (${f.inflationMissing})`);
  if (f.security?.undernourishment) parts.push(`${f.security.undernourishment.value}% of people undernourished (${f.security.undernourishment.year})`);
  if (f.security?.insecurity) parts.push(`${f.security.insecurity.value}% in moderate or severe food insecurity (${f.security.insecurity.year})`);
  if (f.trade) parts.push(`net food imports ${f.trade.netImportsPctGdp}% of GDP in ${f.trade.year}`);
  return `${parts.join('; ')}.`;
}
