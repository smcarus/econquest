/**
 * External sustainability (G24): can the country keep paying what it owes the rest of the world?
 * Worked out from yearly figures the app already saves through the official history download:
 *
 * - The current account, % of GDP (IMF WEO).
 * - External debt, % of GDP: World Bank IDS total external debt stocks over IMF GDP in dollars.
 * - External debt service against reserves and against exports: principal and interest actually
 *   paid in the year (World Bank IDS) over end-year reserves (World Bank) and over exports of goods
 *   and services (World Bank). Above 100% of reserves, a year's payments would use up the reserves.
 * - The external debt-stabilising non-interest current account (the IMF external DSA identity):
 *   nica* = d × (i − g) ÷ (1 + g), with d the latest external debt ratio, i the effective interest
 *   rate (interest paid over the previous year's debt stock) and g the growth of GDP in dollars, both
 *   averaged over the last five years with all figures. The actual non-interest current account is
 *   the current account plus interest paid on external debt, % of GDP.
 *
 * Two parts of the plan have no source the app may use yet, so they read Missing with the reason:
 * the current account norm (IMF External Balance Assessment coefficients, reuse terms not
 * confirmed) and the net international investment position (no cross-country series downloaded).
 *
 * IDS covers low- and middle-income countries only. Description, not a forecast. Browser-safe.
 */
import type { Series } from './seriesHistory';

export const ES_AVG_YEARS = 5;
export const CA_NORM_MISSING = "Current account norm: the IMF External Balance Assessment coefficients have no confirmed reuse terms, so no norm is shown (licence row imf_eba)";
export const NIIP_MISSING = 'Net international investment position: no cross-country series is downloaded yet (the IMF publishes it in its international investment position data, not read by the app)';
export const ES_METHOD =
  'External debt (World Bank IDS) over GDP in dollars (IMF WEO); debt service (principal and interest paid, IDS) over reserves and over exports (World Bank); debt-stabilising non-interest current account nica* = d × (i − g) ÷ (1 + g), with i = interest paid over the previous year\'s debt and g = growth of GDP in dollars, each averaged over the last 5 years with all figures; actual non-interest current account = current account + interest paid, % of GDP.';
export const ES_SOURCES = ['World Bank International Debt Statistics', 'World Bank WDI (reserves, exports)', 'IMF World Economic Outlook (current account, GDP in dollars)'];

export interface EsYear {
  year: number;
  currentAccountPct?: number;
  externalDebtPct?: number;
  debtServiceToReservesPct?: number;
  debtServiceToExportsPct?: number;
}

export interface DebtStabilising {
  /** Latest external debt, % of GDP, and its year. */
  debtPct: number;
  year: number;
  /** Five-year averages, %. */
  interestRatePct: number;
  usdGrowthPct: number;
  years: number[];
  /** Debt-stabilising non-interest current account, % of GDP (positive = a surplus is needed). */
  requiredPct: number;
  /** Actual non-interest current account in `year`, % of GDP. */
  actualPct?: number;
  /** actual minus required, points: negative = debt ratio rising on these averages. */
  gapPts?: number;
}

export interface ExternalSustainability {
  ok: true;
  years: EsYear[];
  latest: EsYear;
  stabilising?: DebtStabilising;
  missing: string[];
  method: string;
  sources: string[];
}

export type ExternalSustainabilityOutcome = ExternalSustainability | { ok: false; reason: string };

export interface EsInputs {
  currentAccountPct?: Series;
  gdpUsd?: Series;
  externalDebtUsd?: Series;
  debtServiceUsd?: Series;
  interestUsd?: Series;
  reservesUsd?: Series;
  exportsUsd?: Series;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const byYear = (s: Series | undefined): Map<number, number> => {
  const m = new Map<number, number>();
  for (const p of s?.points || []) {
    const y = Number(String(p.date).slice(0, 4));
    if (Number.isFinite(y) && Number.isFinite(p.value)) m.set(y, p.value);
  }
  return m;
};
const pct = (a: number | undefined, b: number | undefined) => (a !== undefined && b !== undefined && b > 0 ? r1((a / b) * 100) : undefined);

export function debtStabilisingNica(debtPct: number, interestRatePct: number, usdGrowthPct: number): number {
  const i = interestRatePct / 100;
  const g = usdGrowthPct / 100;
  return r1((debtPct * (i - g)) / (1 + g));
}

export function externalSustainability(inp: EsInputs): ExternalSustainabilityOutcome {
  const ca = byYear(inp.currentAccountPct);
  const gdp = byYear(inp.gdpUsd);
  const debt = byYear(inp.externalDebtUsd);
  const tds = byYear(inp.debtServiceUsd);
  const int = byYear(inp.interestUsd);
  const res = byYear(inp.reservesUsd);
  const exp = byYear(inp.exportsUsd);
  if (!debt.size && !tds.size) return { ok: false, reason: 'The World Bank publishes no external debt figures for this country (its International Debt Statistics cover low- and middle-income countries only)' };
  if (!gdp.size) return { ok: false, reason: 'IMF GDP in US dollars is not saved yet (Menu > Offline data, or open History & data while online)' };

  // Years with World Bank external debt data, newest last; IMF projections beyond them are not used.
  const yrs = [...new Set([...debt.keys(), ...tds.keys()])].sort((a, b) => a - b);
  const years: EsYear[] = yrs.map((y) => {
    const row: EsYear = { year: y };
    const c = ca.get(y);
    if (c !== undefined) row.currentAccountPct = r1(c);
    const d = pct(debt.get(y), gdp.get(y));
    if (d !== undefined) row.externalDebtPct = d;
    const sr = pct(tds.get(y), res.get(y));
    if (sr !== undefined) row.debtServiceToReservesPct = sr;
    const se = pct(tds.get(y), exp.get(y));
    if (se !== undefined) row.debtServiceToExportsPct = se;
    return row;
  });
  const shown = years.filter((r) => Object.keys(r).length > 1);
  if (!shown.length) return { ok: false, reason: 'External debt is saved, but not for any year with IMF GDP in dollars' };
  const latest = shown[shown.length - 1]!;

  const missing: string[] = [CA_NORM_MISSING, NIIP_MISSING];
  let stabilising: DebtStabilising | undefined;
  const last = [...debt.keys()].filter((y) => gdp.has(y)).sort((a, b) => b - a)[0];
  if (last !== undefined) {
    const used: number[] = [];
    const iList: number[] = [];
    const gList: number[] = [];
    for (let y = last; y > last - 15 && used.length < ES_AVG_YEARS; y--) {
      const iv = int.get(y);
      const prevDebt = debt.get(y - 1);
      const g1 = gdp.get(y);
      const g0 = gdp.get(y - 1);
      if (iv === undefined || prevDebt === undefined || !(prevDebt > 0) || g1 === undefined || g0 === undefined || !(g0 > 0)) continue;
      used.push(y);
      iList.push((iv / prevDebt) * 100);
      gList.push((g1 / g0 - 1) * 100);
    }
    if (used.length >= 3) {
      const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      // Computed from unrounded inputs; only the figures shown are rounded.
      const debtPct = pct(debt.get(last), gdp.get(last))!;
      const iAvg = avg(iList);
      const gAvg = avg(gList);
      const interestRatePct = r1(iAvg);
      const usdGrowthPct = r1(gAvg);
      const requiredPct = debtStabilisingNica((debt.get(last)! / gdp.get(last)!) * 100, iAvg, gAvg);
      const c = ca.get(last);
      const iv = int.get(last);
      const actualPct = c !== undefined && iv !== undefined ? r1(c + (iv / gdp.get(last)!) * 100) : undefined;
      stabilising = {
        debtPct,
        year: last,
        interestRatePct,
        usdGrowthPct,
        years: used.sort((a, b) => a - b),
        requiredPct,
        ...(actualPct !== undefined ? { actualPct, gapPts: r1(actualPct - requiredPct) } : {}),
      };
      if (actualPct === undefined) missing.push(`Actual non-interest current account for ${last}: the IMF current account or World Bank interest paid is missing for that year`);
    } else missing.push('Debt-stabilising current account: fewer than 3 years with interest paid, external debt and GDP in dollars');
  }
  if (!tds.size) missing.push('External debt service: the World Bank publishes none for this country');
  else if (!res.size) missing.push('Reserves in US dollars are not saved, so debt service against reserves is missing');

  return { ok: true, years: shown, latest, ...(stabilising ? { stabilising } : {}), missing, method: ES_METHOD, sources: ES_SOURCES };
}

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export function esSentence(r: ExternalSustainability, name: string): string {
  const l = r.latest;
  const parts: string[] = [];
  if (l.externalDebtPct !== undefined) parts.push(`external debt was ${l.externalDebtPct}% of GDP in ${l.year}`);
  if (l.debtServiceToReservesPct !== undefined) parts.push(`that year's debt service took ${l.debtServiceToReservesPct}% of reserves`);
  let s = `${name}: ${parts.join(', and ') || `figures for ${l.year} are partial`}.`;
  const st = r.stabilising;
  if (st) {
    const need = st.requiredPct >= 0 ? `a non-interest current account surplus of ${st.requiredPct}% of GDP` : `a non-interest current account deficit of up to ${Math.abs(st.requiredPct)}% of GDP`;
    s += ` On the ${st.years.length}-year averages (interest ${st.interestRatePct}%, growth of GDP in dollars ${st.usdGrowthPct}%), holding external debt at ${st.debtPct}% of GDP takes ${need}`;
    s += st.actualPct !== undefined ? `; in ${st.year} it was ${sg(st.actualPct)}%, so the ratio ${st.gapPts! >= 0 ? 'would hold or fall' : 'would rise'} on these averages.` : '.';
  }
  return s;
}
