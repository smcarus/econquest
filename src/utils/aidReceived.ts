/**
 * Aid received (parked idea PA4, pulled forward by Sam on 13 November 2026): how much development aid
 * a country gets, how large it is against the economy, the government budget, imports and investment,
 * which large donors give it, and how it has moved.
 *
 * - Net official development assistance received: US dollars (DT.ODA.ODAT.CD, saved since PA1), % of
 *   GNI (DT.ODA.ODAT.GN.ZS), per person (DT.ODA.ODAT.PC.ZS), % of central government expense
 *   (DT.ODA.ODAT.XP.ZS), % of imports of goods, services and primary income (DT.ODA.ODAT.MP.ZS) and % of
 *   gross capital formation (DT.ODA.ODAT.GI.ZS). Ratios are shown for the same year as the dollar
 *   figure only.
 * - Net aid from six large donors (DC.DAC.USAL.CD, DEUL, GBRL, FRAL, JPNL and CECL for EU institutions)
 *   and their share of all aid received in that year. Other donors and multilateral lenders are not
 *   listed one by one.
 * - The last ten years, the change on the year and how far the latest year is below the highest of
 *   those years.
 *
 * The World Bank republishes these from the OECD Development Assistance Committee under CC BY 4.0; the
 * app reads them from the World Bank, not from the OECD. Net means grants and soft loans less
 * repayments, so a year can be negative. Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';

export const DONOR_IDS = ['aid_from_usa', 'aid_from_deu', 'aid_from_gbr', 'aid_from_fra', 'aid_from_jpn', 'aid_from_eu'] as const;
export type DonorId = (typeof DONOR_IDS)[number];

export const AID_IDS = ['aid_usd', 'aid_gni', 'aid_per_person', 'aid_gov_expense', 'aid_imports', 'aid_investment', ...DONOR_IDS] as const;
export type AidId = (typeof AID_IDS)[number];

export const AID_SOURCES = 'World Bank World Development Indicators (from OECD Development Assistance Committee figures; IMF for government spending and imports), CC BY 4.0';

export const AID_METHOD =
  'Latest year the World Bank publishes net development aid received, with aid as % of GNI, per person, % of central government spending, % of imports and % of investment for that same year; net aid from the United States, Germany, the United Kingdom, France, Japan and EU institutions and their share of all aid that year; the last ten years. Net is grants and soft loans less repayments. A description, not a forecast.';

export interface AidRatios {
  gni?: number;
  perPerson?: number;
  govExpense?: number;
  imports?: number;
  investment?: number;
}

export interface AidProfile {
  latest?: { year: number; usd: number } & AidRatios;
  latestMissing?: string;
  /** Up to the last 10 years with aid in US dollars, oldest first. */
  years: Array<{ year: number; usd: number; gni?: number }>;
  /** Change on the previous year, %, when both years are above 0. */
  change1y?: number;
  /** The highest year shown, and how far the latest is below it, % (0 when the latest is the highest). */
  peak?: { year: number; usd: number; belowPct: number };
  /** Latest year any of the six donors has a figure (not after the latest aid year). */
  donorYear?: number;
  donors: Array<{ id: DonorId; usd: number; sharePct?: number }>;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const byYear = (pts: YearValue[] | undefined, beforeYear: number) => new Map((pts ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).map((p) => [p.year, p.value]));

export function aidProfile(series: Partial<Record<AidId, YearValue[]>>, beforeYear: number, historySaved = true): AidProfile {
  const m = Object.fromEntries(AID_IDS.map((id) => [id, byYear(series[id], beforeYear)])) as Record<AidId, Map<number, number>>;
  const out: AidProfile = { years: [], donors: [], sources: AID_SOURCES, method: AID_METHOD };
  const aidYears = [...m.aid_usd.keys()].sort((a, b) => a - b);
  const ly = aidYears[aidYears.length - 1];
  if (ly === undefined) {
    out.latestMissing = historySaved ? 'The World Bank publishes no development aid figure for this country (countries that do not receive aid have none)' : 'No saved World Bank history for this country yet (Data health > World Bank)';
    return out;
  }
  const usd = m.aid_usd.get(ly)!;
  const at = (id: AidId) => {
    const v = m[id].get(ly);
    return v === undefined ? undefined : r1(v);
  };
  const ratios: AidRatios = {};
  const pairs: Array<[keyof AidRatios, AidId]> = [['gni', 'aid_gni'], ['perPerson', 'aid_per_person'], ['govExpense', 'aid_gov_expense'], ['imports', 'aid_imports'], ['investment', 'aid_investment']];
  for (const [k, id] of pairs) {
    const v = at(id);
    if (v !== undefined) ratios[k] = v;
  }
  out.latest = { year: ly, usd: r4(usd), ...ratios };
  const shown = aidYears.slice(-10);
  out.years = shown.map((y) => {
    const g = m.aid_gni.get(y);
    return { year: y, usd: r4(m.aid_usd.get(y)!), ...(g !== undefined ? { gni: r1(g) } : {}) };
  });
  const prev = m.aid_usd.get(ly - 1);
  if (prev !== undefined && prev > 0 && usd > 0) out.change1y = r1((usd / prev - 1) * 100);
  if (shown.length > 1) {
    const top = shown.reduce((best, y) => (m.aid_usd.get(y)! > m.aid_usd.get(best)! ? y : best), shown[0]);
    const tv = m.aid_usd.get(top)!;
    if (tv > 0) out.peak = { year: top, usd: r4(tv), belowPct: r1((1 - usd / tv) * 100) };
  }
  const dy = Math.max(...DONOR_IDS.flatMap((id) => [...m[id].keys()].filter((y) => y <= ly)));
  if (Number.isFinite(dy)) {
    out.donorYear = dy;
    const total = m.aid_usd.get(dy);
    out.donors = DONOR_IDS.flatMap((id) => {
      const v = m[id].get(dy);
      if (v === undefined) return [];
      return [{ id, usd: r4(v), ...(total !== undefined && total > 0 ? { sharePct: r1((v / total) * 100) } : {}) }];
    }).sort((a, b) => b.usd - a.usd);
  }
  return out;
}

export const DONOR_NAME: Record<DonorId, string> = {
  aid_from_usa: 'United States',
  aid_from_deu: 'Germany',
  aid_from_gbr: 'United Kingdom',
  aid_from_fra: 'France',
  aid_from_jpn: 'Japan',
  aid_from_eu: 'EU institutions',
};

const money = (v: number) => (Math.abs(v) >= 1 ? `US$${v.toFixed(1)} bn` : `US$${Math.round(v * 1000)} m`);

/** One English sentence for Explain in chat. */
export function aidSentence(p: AidProfile, country: string): string {
  if (!p.latest) return `${country}: development aid Missing (${p.latestMissing}).`;
  const l = p.latest;
  const parts = [`${country} received ${money(l.usd)} in net development aid in ${l.year}`];
  if (l.gni !== undefined) parts.push(`${l.gni}% of GNI`);
  if (l.govExpense !== undefined) parts.push(`${l.govExpense}% of central government spending`);
  if (l.perPerson !== undefined) parts.push(`US$${l.perPerson} per person`);
  let s = `${parts.join('; ')}.`;
  if (p.peak && p.peak.belowPct > 0) s += ` That is ${p.peak.belowPct}% below ${p.peak.year}, the highest of the last ten years.`;
  const big = p.donors.filter((d) => d.sharePct !== undefined && d.usd > 0).slice(0, 2);
  if (big.length && p.donorYear !== undefined) s += ` Largest of six listed donors in ${p.donorYear}: ${big.map((d) => `${DONOR_NAME[d.id]} ${d.sharePct}%`).join(', ')}.`;
  return s;
}
