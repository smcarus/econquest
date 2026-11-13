/**
 * Remittances (parked idea PA1, pulled forward by Sam on 13 November 2026): money people working
 * abroad send home, beside the other money coming into the country, and what it costs to send.
 *
 * - Remittances received, US dollars (World Bank WDI BX.TRF.PWKR.CD.DT) and % of GDP
 *   (BX.TRF.PWKR.DT.GD.ZS, already saved since G17).
 * - Set beside exports of goods and services (NE.EXP.GNFS.CD), net foreign direct investment inflows
 *   (BX.KLT.DINV.CD.WD) and net development aid received (DT.ODA.ODAT.CD, from OECD DAC), all in
 *   current US dollars for the same year, so the comparison never mixes years.
 * - Years exports fell: how remittances moved in the same year. A description of what moved together,
 *   not what caused what.
 * - Cost of sending the equivalent of US$200 (SI.RMT.COST.IB.ZS, World Bank Remittance Prices
 *   Worldwide) against the UN goal of below 3% by 2030 (SDG target 10.c).
 * - Remittances paid abroad (BM.TRF.PWKR.CD.DT), for countries many migrants work in.
 *
 * All from the World Bank (CC BY 4.0), read from the official history the app saves per country.
 * Only figures the World Bank published; gaps say Missing with the reason. Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';

export const REMIT_IDS = ['remittances_usd', 'remittances', 'remittances_paid_usd', 'exports_usd', 'fdi_in_usd', 'aid_usd', 'remittance_cost'] as const;
export type RemitId = (typeof REMIT_IDS)[number];

export const SDG_COST_TARGET = 3;

export const REMIT_SOURCES = 'World Bank World Development Indicators (IMF balance of payments; OECD DAC for aid; Remittance Prices Worldwide for cost), CC BY 4.0';

export const REMIT_METHOD =
  'Latest year the World Bank publishes remittances received, set beside exports, net foreign direct investment inflows and net development aid in the same year, all in current US dollars. Years exports fell: the change in remittances in the same year. Cost: average total cost of sending the equivalent of US$200, against the UN goal of below 3%. A description, not a forecast; what moved together is not what caused it.';

export interface Compare {
  id: 'exports_usd' | 'fdi_in_usd' | 'aid_usd';
  /** US$ bn in the same year as the remittances figure; absent when the World Bank has none. */
  usd?: number;
  /** Remittances as a multiple of it (only when it is above 0). */
  ratio?: number;
}

export interface RemitYear {
  year: number;
  remittances?: number;
  exports?: number;
  fdi?: number;
  aid?: number;
}

export interface RemitProfile {
  /** Latest year with remittances received in US dollars. */
  latest?: { year: number; usd: number; pctGdp?: number };
  latestMissing?: string;
  compare: Compare[];
  /** Up to the last 10 years with remittances, oldest first. */
  years: RemitYear[];
  /** Change in remittances over the years shown, %. */
  change?: { from: number; to: number; pct: number };
  /** Years exports fell (in US dollars) and how remittances moved the same year. */
  exportFalls: Array<{ year: number; exportsPct: number; remittancesPct: number }>;
  cost?: { year: number; pct: number; aboveTarget: boolean };
  costMissing?: string;
  paid?: { year: number; usd: number };
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const byYear = (pts: YearValue[] | undefined, beforeYear: number) => new Map((pts ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).map((p) => [p.year, p.value]));

/** The profile from the saved yearly series; `beforeYear` cuts everything at that year (the current year by default). */
export function remittanceProfile(series: Partial<Record<RemitId, YearValue[]>>, beforeYear: number, historySaved = true): RemitProfile {
  const m = Object.fromEntries(REMIT_IDS.map((id) => [id, byYear(series[id], beforeYear)])) as Record<RemitId, Map<number, number>>;
  const remitYears = [...m.remittances_usd.keys()].sort((a, b) => a - b);
  const ly = remitYears[remitYears.length - 1];
  const out: RemitProfile = { compare: [], years: [], exportFalls: [], sources: REMIT_SOURCES, method: REMIT_METHOD };
  if (ly === undefined) {
    out.latestMissing = historySaved ? 'The World Bank publishes no remittance figure for this country before this year' : 'No saved World Bank history for this country yet (Data health > World Bank)';
  } else {
    const usd = m.remittances_usd.get(ly)!;
    const pct = m.remittances.get(ly);
    out.latest = { year: ly, usd: r3(usd), ...(pct !== undefined ? { pctGdp: r1(pct) } : {}) };
    for (const id of ['exports_usd', 'fdi_in_usd', 'aid_usd'] as const) {
      const v = m[id].get(ly);
      out.compare.push({ id, ...(v !== undefined ? { usd: r3(v) } : {}), ...(v !== undefined && v > 0 ? { ratio: Math.round((usd / v) * 100) / 100 } : {}) });
    }
    const shown = remitYears.slice(-10);
    out.years = shown.map((y) => ({
      year: y,
      remittances: r3(m.remittances_usd.get(y)!),
      ...(m.exports_usd.has(y) ? { exports: r3(m.exports_usd.get(y)!) } : {}),
      ...(m.fdi_in_usd.has(y) ? { fdi: r3(m.fdi_in_usd.get(y)!) } : {}),
      ...(m.aid_usd.has(y) ? { aid: r3(m.aid_usd.get(y)!) } : {}),
    }));
    const first = m.remittances_usd.get(shown[0])!;
    if (shown.length > 1 && first > 0) out.change = { from: shown[0], to: ly, pct: r1((usd / first - 1) * 100) };
    for (const y of remitYears) {
      const e0 = m.exports_usd.get(y - 1);
      const e1 = m.exports_usd.get(y);
      const r0 = m.remittances_usd.get(y - 1);
      const rv = m.remittances_usd.get(y);
      if (e0 && e1 !== undefined && r0 && rv !== undefined && e1 < e0) out.exportFalls.push({ year: y, exportsPct: r1((e1 / e0 - 1) * 100), remittancesPct: r1((rv / r0 - 1) * 100) });
    }
  }
  const costYears = [...m.remittance_cost.keys()].sort((a, b) => a - b);
  const cy = costYears[costYears.length - 1];
  if (cy !== undefined) {
    const v = r1(m.remittance_cost.get(cy)!);
    out.cost = { year: cy, pct: v, aboveTarget: v > SDG_COST_TARGET };
  } else out.costMissing = 'The World Bank survey of sending costs does not cover this country';
  const paidYears = [...m.remittances_paid_usd.keys()].sort((a, b) => a - b);
  const py = paidYears[paidYears.length - 1];
  if (py !== undefined) out.paid = { year: py, usd: r3(m.remittances_paid_usd.get(py)!) };
  return out;
}

const bn = (v: number) => (Math.abs(v) >= 1 ? `US$${v.toFixed(1)} bn` : `US$${Math.round(v * 1000)} m`);

/** One English sentence for Explain in chat. */
export function remitSentence(p: RemitProfile, country: string): string {
  if (!p.latest) return `${country}: remittances Missing (${p.latestMissing}).`;
  const parts = [`${country} received ${bn(p.latest.usd)} in remittances in ${p.latest.year}${p.latest.pctGdp !== undefined ? ` (${p.latest.pctGdp}% of GDP)` : ''}`];
  const ex = p.compare.find((c) => c.id === 'exports_usd');
  if (ex?.ratio !== undefined) parts.push(`${Math.round(ex.ratio * 100)}% of exports of goods and services`);
  const fdi = p.compare.find((c) => c.id === 'fdi_in_usd');
  if (fdi?.ratio !== undefined) parts.push(`${fdi.ratio.toFixed(1)} times net foreign direct investment`);
  const aid = p.compare.find((c) => c.id === 'aid_usd');
  if (aid?.ratio !== undefined) parts.push(`${aid.ratio.toFixed(1)} times net aid`);
  let s = `${parts.join('; ')}.`;
  if (p.cost) s += ` Sending US$200 cost ${p.cost.pct}% on average in ${p.cost.year} (UN goal below ${SDG_COST_TARGET}%).`;
  return s;
}
