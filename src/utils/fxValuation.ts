/**
 * FX valuation: is the currency cheap or dear, and does its carry pay for its swings?
 *
 * - Real exchange rate gap: the BIS real broad effective exchange rate (monthly, free, no key)
 *   against its own 10-year average. Above the average = strong (dear), below = weak (cheap).
 *   A 10-year average is a yardstick, not a fair value: real exchange rates can trend for years.
 * - Carry-to-volatility: the policy-rate gap over the US federal funds rate, divided by the
 *   currency's realised volatility against the dollar over about three months (ECB reference
 *   rates via Frankfurter, free, no key). Frankfurter has no CLP or EGP, so those show none.
 *
 * Checked 2026-11-04: BIS WS_EER M.R.B.BR answers with monthly rows to 2026-09; Frankfurter
 * serves USD crosses from api.frankfurter.dev/v1.
 */
import { BIS_API, parseBisCsv } from './bisDebtSecurities';

export const REER_LABEL = 'BIS real effective exchange rates';
export const FX_VOL_LABEL = 'ECB reference rates (Frankfurter)';

export function reerUrl(iso2: string, now = new Date()): string {
  const start = `${now.getUTCFullYear() - 10}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${BIS_API}/WS_EER/M.R.B.${iso2}/all?startPeriod=${start}&format=csv`;
}

export interface ReerGap {
  latest: number;
  /** YYYY-MM of the latest month. */
  period: string;
  average: number;
  months: number;
  /** Latest against the average, percent. Positive = stronger than usual. */
  gapPct: number;
}

/** BIS CSV of the real broad index. Needs five years of months to call an average. */
export function parseReer(text: unknown): ReerGap | null {
  const pts = parseBisCsv(text)
    .filter((r) => r.EER_TYPE === 'R' && r.EER_BASKET === 'B' && /^\d{4}-\d{2}$/.test(r.TIME_PERIOD) && r.OBS_VALUE !== '')
    .map((r) => ({ period: r.TIME_PERIOD, v: Number(r.OBS_VALUE) }))
    .filter((p) => Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.period.localeCompare(b.period));
  if (pts.length < 60) return null;
  const last = pts[pts.length - 1];
  const average = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  return {
    latest: last.v,
    period: last.period,
    average: Number(average.toFixed(2)),
    months: pts.length,
    gapPct: Number(((last.v / average - 1) * 100).toFixed(1)),
  };
}

export function frankfurterSeriesUrl(ccy: string, now = new Date()): string {
  const from = new Date(now.getTime() - 100 * 86400000).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return `https://api.frankfurter.dev/v1/${from}..${to}?from=USD&to=${ccy}`;
}

export interface FxVol {
  /** Annualised realised volatility of daily log changes, percent. */
  volPct: number;
  days: number;
  from: string;
  to: string;
}

/** Frankfurter time series ({ rates: { 'YYYY-MM-DD': { CCY: n } } }). Needs 40 trading days. */
export function parseFxVol(json: unknown, ccy: string): FxVol | null {
  const rates = (json as { rates?: Record<string, Record<string, unknown>> })?.rates;
  if (!rates || typeof rates !== 'object') return null;
  const pts = Object.entries(rates)
    .map(([d, r]) => ({ d, v: Number(r?.[ccy]) }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.d) && Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.d.localeCompare(b.d));
  if (pts.length < 41) return null;
  const rets = pts.slice(1).map((p, i) => Math.log(p.v / pts[i].v));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return { volPct: Number((Math.sqrt(variance * 252) * 100).toFixed(1)), days: pts.length, from: pts[0].d, to: pts[pts.length - 1].d };
}

/** NY Fed EFFR reply ({ refRates: [{ effectiveDate, percentRate }] }). */
export function parseEffr(json: unknown): { pct: number; date: string } | null {
  const r = (json as { refRates?: Array<{ effectiveDate?: string; percentRate?: number }> })?.refRates?.[0];
  if (!r || typeof r.percentRate !== 'number' || !r.effectiveDate) return null;
  return { pct: r.percentRate, date: r.effectiveDate };
}

export type ReerLabel = 'strong' | 'weak' | 'near average';
/** More than 10% from its 10-year average counts as strong or weak. */
export function reerLabel(gapPct: number): ReerLabel {
  return gapPct > 10 ? 'strong' : gapPct < -10 ? 'weak' : 'near average';
}

/** Carry (policy rate minus US rate) per unit of volatility. Above 0.5 pays well for its swings. */
export function carryToVol(localPolicyPct: number, usPct: number, volPct: number): { carryPts: number; ratio: number } | null {
  if (!(volPct > 0)) return null;
  const carryPts = localPolicyPct - usPct;
  return { carryPts: Number(carryPts.toFixed(2)), ratio: Number((carryPts / volPct).toFixed(2)) };
}
