/**
 * Commodity prices and terms of trade (parked idea PA3, pulled forward by Sam on 13 November 2026):
 * how the latest world commodity prices bear on one country, given what it sells and buys abroad.
 *
 * - What the country trades: fuel, ores and metals, and food as shares of goods exports and imports
 *   (World Bank WDI TX.VAL.*.ZS.UN / TM.VAL.*.ZS.UN, from UN Comtrade by SITC group), and goods exports
 *   and imports against GDP (TX.VAL.MRCH.CD.WT, TM.VAL.MRCH.CD.WT over IMF WEO GDP in US dollars), all
 *   for the same year.
 * - Price moves: the World Bank Pink Sheet monthly prices the app already reads, 1 and 12 months to the
 *   latest month. Each group uses a simple average of the moves of its Pink Sheet prices (listed in
 *   GROUP_PRICES). The real basket inside each group differs by country, so this is a rough guide.
 * - The effect, % of GDP: share of goods exports in the group x goods exports / GDP x the group's
 *   12-month price move, minus the same for imports. As if today's prices held for a year and
 *   quantities did not change. The app's calculation, labelled so; not a forecast.
 * - Commodity dependence: fuel, ores and metals and food together as a share of goods exports, against
 *   UNCTAD's 60% line. These three groups leave out farm raw materials and gold, so the full commodity
 *   share can be higher.
 * - Terms of trade: the World Bank net barter terms of trade index (TT.PRI.MRCH.XD.WD, 2015 = 100),
 *   yearly, with its change over one and five years.
 *
 * Only figures the sources published; gaps say Missing with the reason. Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';
import type { PriceMove } from './commodityPrices';

export const CT_IDS = ['export_fuel', 'export_ores_metals', 'export_food', 'import_fuel', 'import_ores_metals', 'import_food', 'merch_exports_usd', 'merch_imports_usd', 'gdp_usd', 'terms_of_trade'] as const;
export type CtId = (typeof CT_IDS)[number];

export type GroupId = 'fuel' | 'ores_metals' | 'food';
export const GROUP_IDS: GroupId[] = ['fuel', 'ores_metals', 'food'];

/** Pink Sheet codes averaged for each group. Fuel uses the average crude oil price (Brent, Dubai, WTI). */
export const GROUP_PRICES: Record<GroupId, string[]> = {
  fuel: ['CRUDE_PETRO'],
  ores_metals: ['COPPER', 'IRON_ORE', 'ALUMINUM', 'NICKEL'],
  food: ['MAIZE', 'WHEAT_US_HRW', 'SOYBEANS', 'PALM_OIL', 'SUGAR_WLD', 'COFFEE_ARABIC', 'COCOA'],
};

const SHARE_ID: Record<GroupId, { x: CtId; m: CtId }> = {
  fuel: { x: 'export_fuel', m: 'import_fuel' },
  ores_metals: { x: 'export_ores_metals', m: 'import_ores_metals' },
  food: { x: 'export_food', m: 'import_food' },
};

/** UNCTAD calls a country commodity-dependent when commodities are more than 60% of its goods exports. */
export const DEPENDENCE_LINE = 60;

export const CT_SOURCES = 'World Bank Commodity Price Data (Pink Sheet) and World Development Indicators (UN Comtrade, WTO); IMF World Economic Outlook for GDP in US dollars; CC BY 4.0 (World Bank)';

export const CT_METHOD =
  'App calculation: for fuel, ores and metals, and food, the share of goods exports times goods exports as % of GDP times the 12-month price move, minus the same for imports, all trade figures from one year. Each group\'s move is a simple average of its World Bank Pink Sheet prices (fuel: average crude oil; ores and metals: copper, iron ore, aluminium, nickel; food: maize, wheat, soybeans, palm oil, sugar, coffee, cocoa). As if today\'s prices held for a year with no change in quantities: a rough guide, not a forecast. Terms of trade: World Bank index, yearly.';

export interface GroupView {
  id: GroupId;
  /** Pink Sheet codes that had a move, and their 12-month moves. */
  prices: Array<{ code: string; name: string; move12m?: number; move1m?: number }>;
  move1m?: number;
  move12m?: number;
  exportShare?: number;
  importShare?: number;
  /** Export side minus import side, % of GDP. */
  effectPctGdp?: number;
}

export interface CommodityTerms {
  /** Year of the trade shares and goods trade figures. */
  mixYear?: number;
  mixMissing?: string;
  exportsPctGdp?: number;
  importsPctGdp?: number;
  /** Why the effect could not be worked out (no goods trade or GDP figure for the share year). */
  effectMissing?: string;
  commodityExportShare?: number;
  dependent?: boolean;
  groups: GroupView[];
  /** Latest Pink Sheet month used. */
  pricesAsOf?: string;
  pricesMissing?: string;
  netEffectPctGdp?: number;
  tot?: { year: number; value: number; change1y?: number; change5y?: number; years: Array<{ year: number; value: number }> };
  totMissing?: string;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

const byYear = (pts: YearValue[] | undefined, beforeYear: number) => new Map((pts ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).map((p) => [p.year, p.value]));

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

/**
 * The view from the saved yearly series and the Pink Sheet moves. `beforeYear` cuts the yearly
 * figures (the current year by default); `moves` are the latest Pink Sheet moves, or null when the
 * Pink Sheet has not answered.
 */
export function commodityTerms(series: Partial<Record<CtId, YearValue[]>>, moves: PriceMove[] | null, beforeYear: number, historySaved = true): CommodityTerms {
  const m = Object.fromEntries(CT_IDS.map((id) => [id, byYear(series[id], beforeYear)])) as Record<CtId, Map<number, number>>;
  const out: CommodityTerms = { groups: [], sources: CT_SOURCES, method: CT_METHOD };
  // Unrounded exports and imports as % of GDP for the effect; the rounded ones are for display.
  let xGdp: number | undefined;
  let mGdp: number | undefined;
  const noHistory = 'No saved World Bank history for this country yet (Data health > World Bank)';

  // Share year: the latest year with all three export shares.
  const years = [...m.export_fuel.keys()].filter((y) => m.export_ores_metals.has(y) && m.export_food.has(y)).sort((a, b) => a - b);
  const my = years[years.length - 1];
  if (my === undefined) out.mixMissing = historySaved ? 'The World Bank publishes no goods trade breakdown for this country' : noHistory;
  else {
    out.mixYear = my;
    const share = GROUP_IDS.reduce((a, g) => a + m[SHARE_ID[g].x].get(my)!, 0);
    out.commodityExportShare = r1(share);
    out.dependent = share > DEPENDENCE_LINE;
    const gdp = m.gdp_usd.get(my);
    const x = m.merch_exports_usd.get(my);
    const im = m.merch_imports_usd.get(my);
    if (gdp && gdp > 0 && x !== undefined && im !== undefined) {
      xGdp = (x / gdp) * 100;
      mGdp = (im / gdp) * 100;
      out.exportsPctGdp = r1(xGdp);
      out.importsPctGdp = r1(mGdp);
    } else out.effectMissing = 'No goods exports, imports or GDP in US dollars for the year of the trade shares';
  }

  const byCode = new Map((moves ?? []).filter((v) => v.source === 'pink_sheet').map((v) => [v.code, v]));
  if (!byCode.size) out.pricesMissing = 'The World Bank Pink Sheet has not answered yet';
  else out.pricesAsOf = [...byCode.values()].map((v) => v.asOf).sort().pop();

  const raw: number[] = [];
  for (const g of GROUP_IDS) {
    const prices = GROUP_PRICES[g]
      .map((c) => byCode.get(c))
      .filter((v): v is PriceMove => v !== undefined)
      .map((v) => ({ code: v.code, name: v.name, ...(v.change12mPct !== undefined ? { move12m: v.change12mPct } : {}), ...(v.change1mPct !== undefined ? { move1m: v.change1mPct } : {}) }));
    const m12 = avg(prices.flatMap((p) => (p.move12m !== undefined ? [p.move12m] : [])));
    const m1 = avg(prices.flatMap((p) => (p.move1m !== undefined ? [p.move1m] : [])));
    const xs = my !== undefined ? m[SHARE_ID[g].x].get(my) : undefined;
    const ms = my !== undefined ? m[SHARE_ID[g].m].get(my) : undefined;
    const view: GroupView = {
      id: g,
      prices,
      ...(m1 !== undefined ? { move1m: r1(m1) } : {}),
      ...(m12 !== undefined ? { move12m: r1(m12) } : {}),
      ...(xs !== undefined ? { exportShare: r1(xs) } : {}),
      ...(ms !== undefined ? { importShare: r1(ms) } : {}),
    };
    if (m12 !== undefined && xs !== undefined && ms !== undefined && xGdp !== undefined && mGdp !== undefined) {
      const e = (xs / 100) * xGdp * (m12 / 100) - (ms / 100) * mGdp * (m12 / 100);
      raw.push(e);
      view.effectPctGdp = r2(e);
    }
    out.groups.push(view);
  }
  if (raw.length === GROUP_IDS.length) out.netEffectPctGdp = r2(raw.reduce((a, b) => a + b, 0));

  const totYears = [...m.terms_of_trade.keys()].sort((a, b) => a - b);
  const ty = totYears[totYears.length - 1];
  if (ty === undefined) out.totMissing = historySaved ? 'The World Bank publishes no terms of trade index for this country' : noHistory;
  else {
    const v = m.terms_of_trade.get(ty)!;
    const chg = (back: number) => {
      const old = m.terms_of_trade.get(ty - back);
      return old && old > 0 ? r1((v / old - 1) * 100) : undefined;
    };
    const c1 = chg(1);
    const c5 = chg(5);
    out.tot = {
      year: ty,
      value: r1(v),
      ...(c1 !== undefined ? { change1y: c1 } : {}),
      ...(c5 !== undefined ? { change5y: c5 } : {}),
      years: totYears.slice(-10).map((y) => ({ year: y, value: r1(m.terms_of_trade.get(y)!) })),
    };
  }
  return out;
}

const GROUP_WORD: Record<GroupId, string> = { fuel: 'fuel', ores_metals: 'ores and metals', food: 'food' };
const signed = (v: number, unit = '%') => `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`;

/** One English sentence for Explain in chat. */
export function ctSentence(c: CommodityTerms, country: string): string {
  const parts: string[] = [];
  if (c.mixYear !== undefined && c.commodityExportShare !== undefined) {
    const shares = c.groups.filter((g) => g.exportShare !== undefined).map((g) => `${GROUP_WORD[g.id]} ${g.exportShare}%`);
    parts.push(`In ${c.mixYear}, ${shares.join(', ')} of ${country}'s goods exports (${c.commodityExportShare}% together)`);
  } else parts.push(`${country}: goods trade breakdown Missing (${c.mixMissing})`);
  if (c.netEffectPctGdp !== undefined && c.pricesAsOf) parts.push(`at the 12-month price moves to ${c.pricesAsOf}, the net effect is about ${signed(c.netEffectPctGdp, '% of GDP')} a year if prices hold`);
  let s = `${parts.join('; ')}.`;
  if (c.tot) s += ` Terms of trade index ${c.tot.value} in ${c.tot.year} (2015 = 100)${c.tot.change1y !== undefined ? `, ${signed(c.tot.change1y)} on the year` : ''}.`;
  return s;
}
