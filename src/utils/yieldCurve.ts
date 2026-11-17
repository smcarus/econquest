/**
 * Yield curve and financial conditions (G25). Worked out from monthly figures the app already reads:
 *
 * - The term spread: the 10-year government bond yield (FRED / OECD IRLTLT01, monthly average) minus
 *   the central bank policy rate (BIS, end of month). The policy rate stands in for a 3-month bill
 *   rate, which the app does not hold for most countries. Below 0 the curve is inverted.
 * - Inverted spells (start, end, lowest point) since 1990, and the calendar-year average spread the
 *   pre-registered test yield_curve_recession reads.
 * - A financial conditions index: the policy rate, the 10-year yield, the 10-year spread over US
 *   Treasuries (left out for the United States) and the BIS real effective exchange rate, each as a
 *   z-score against its own monthly history since 1990, averaged with fixed equal weights. Positive =
 *   tighter than the country's own average. Description only: the weights are fixed, not fitted, and
 *   no forward call is made from it.
 *
 * Whether an inverted year comes before a fall in real GDP more often than usual is the claim of
 * yield_curve_recession (docs/validation/preregistered/yield_curve_recession.json). Only once that
 * test has passed does the reading show a figure, and that figure is the test's own historical hit
 * rate, not a fitted probability. Browser-safe, pure.
 */

export const CURVE_TEST_ID = 'yield_curve_recession';
export const CURVE_MIN_MONTHS = 10;
export const FCI_MIN_MONTHS = 60;
export const CURVE_NOT_RUN =
  'Not validated: whether an inverted year comes before a fall in real GDP more often than usual is the pre-registered test yield_curve_recession (Menu > Models & validation). No recession figure is shown until it passes.';
export const CURVE_METHOD =
  'Term spread = 10-year government bond yield (OECD monthly average, via FRED) minus the central bank policy rate (BIS, end of month); inverted when below 0. Year averages use years with at least 10 months of both. Financial conditions index = equal-weight average of z-scores (each against its own monthly history since 1990) of the policy rate, the 10-year yield, the 10-year spread over US Treasuries and the BIS real effective exchange rate (higher = tighter); a month counts only with every component the country has.';
export const CURVE_SOURCES = ['FRED / OECD 10-year government bond yields (IRLTLT01)', 'BIS central bank policy rates (WS_CBPOL)', 'BIS real effective exchange rates (WS_EER)'];

export interface MonthPoint {
  /** "YYYY-MM". */
  period: string;
  value: number;
}

export interface CurveSpell {
  from: string;
  /** Last inverted month; absent while the spell is still running. */
  to?: string;
  low: number;
  lowMonth: string;
}

export type FciComponentId = 'policy' | 'yield10' | 'usSpread' | 'reer';

export interface FciReading {
  month: string;
  value: number;
  yearAgo?: { month: string; value: number };
  components: Array<{ id: FciComponentId; z: number; level: number }>;
  weight: number;
  since: string;
  months: number;
}

export interface CurveHitRate {
  hitRatePct: number;
  baseRatePct: number;
  cases: number;
  span: { from: string; to: string };
}

export interface YieldCurve {
  ok: true;
  latest: { month: string; yield10: number; policy: number; spread: number };
  yearAgo?: { month: string; spread: number };
  /** Monthly spread, oldest first. */
  monthly: MonthPoint[];
  spells: CurveSpell[];
  /** Calendar-year average spreads (years with at least 10 months of both), newest last. */
  years: Array<{ year: number; spread: number; months: number }>;
  fci?: FciReading;
  /** The historical hit rate of the passed test; absent until yield_curve_recession passes. */
  hitRate?: CurveHitRate;
  missing: string[];
  method: string;
  sources: string[];
}

export type YieldCurveOutcome = YieldCurve | { ok: false; reason: string };

export interface CurveInputs {
  yields?: MonthPoint[] | null;
  policy?: MonthPoint[] | null;
  usYields?: MonthPoint[] | null;
  reer?: MonthPoint[] | null;
  isUs?: boolean;
  /** The saved verdict of yield_curve_recession, if any. */
  test?: { status: string; hitRatePct: number; baseRatePct: number; cases: number; span: { from: string; to: string } } | null;
  hasFred: boolean;
  hasPolicy: boolean;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const toMap = (pts: MonthPoint[] | null | undefined) => {
  const m = new Map<string, number>();
  for (const p of pts || []) {
    const k = String(p.period).slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(k) && Number.isFinite(p.value)) m.set(k, p.value);
  }
  return m;
};
const prevMonth = (m: string, back: number) => {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7)) - 1 - back;
  const yy = y + Math.floor(mo / 12);
  return `${yy}-${String(((mo % 12) + 12) % 12 + 1).padStart(2, '0')}`;
};

/** Spells with the spread below 0; a missing month ends a spell. */
export function curveSpells(monthly: MonthPoint[]): CurveSpell[] {
  const out: CurveSpell[] = [];
  let cur: CurveSpell | null = null;
  let last = '';
  for (const p of monthly) {
    if (cur && last && prevMonth(p.period, 1) !== last) {
      cur.to = last;
      out.push(cur);
      cur = null;
    }
    if (p.value < 0) {
      if (!cur) cur = { from: p.period, low: p.value, lowMonth: p.period };
      else if (p.value < cur.low) {
        cur.low = p.value;
        cur.lowMonth = p.period;
      }
    } else if (cur) {
      cur.to = last;
      out.push(cur);
      cur = null;
    }
    last = p.period;
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ ...s, low: r2(s.low) }));
}

/** Equal-weight z-score index; each component against its own history. */
export function financialConditions(parts: Array<{ id: FciComponentId; pts: Map<string, number> }>): FciReading | undefined {
  const use = parts.filter((p) => p.pts.size >= FCI_MIN_MONTHS);
  if (use.length < 2) return undefined;
  const stats = use.map((p) => {
    const v = [...p.pts.values()];
    const mean = v.reduce((s, a) => s + a, 0) / v.length;
    const sd = Math.sqrt(v.reduce((s, a) => s + (a - mean) ** 2, 0) / Math.max(1, v.length - 1));
    return { ...p, mean, sd };
  });
  if (stats.some((s) => !(s.sd > 0))) return undefined;
  const months = [...use[0].pts.keys()].filter((m) => use.every((p) => p.pts.has(m))).sort();
  if (!months.length) return undefined;
  const at = (m: string) => stats.map((s) => ({ id: s.id, z: (s.pts.get(m)! - s.mean) / s.sd, level: s.pts.get(m)! }));
  const idx = (m: string) => at(m).reduce((s, c) => s + c.z, 0) / stats.length;
  const month = months[months.length - 1];
  const ago = prevMonth(month, 12);
  return {
    month,
    value: r2(idx(month)),
    ...(months.includes(ago) ? { yearAgo: { month: ago, value: r2(idx(ago)) } } : {}),
    components: at(month).map((c) => ({ id: c.id, z: r2(c.z), level: r2(c.level) })),
    weight: r2(1 / stats.length),
    since: months[0],
    months: months.length,
  };
}

export function yieldCurve(inp: CurveInputs): YieldCurveOutcome {
  if (!inp.hasFred) return { ok: false, reason: 'No free monthly 10-year government bond yield is read for this country (FRED / OECD covers OECD members and India)' };
  if (!inp.hasPolicy) return { ok: false, reason: 'The BIS does not publish a policy rate for this country' };
  const Y = toMap(inp.yields);
  const P = toMap(inp.policy);
  if (!Y.size) return { ok: false, reason: 'FRED has not answered yet for the 10-year yield' };
  if (!P.size) return { ok: false, reason: 'The BIS policy rates are not saved yet' };
  const monthly = [...Y.keys()]
    .filter((m) => P.has(m))
    .sort()
    .map((m) => ({ period: m, value: r2(Y.get(m)! - P.get(m)!) }));
  if (!monthly.length) return { ok: false, reason: 'The 10-year yield and the policy rate share no month' };
  const lm = monthly[monthly.length - 1].period;
  const latest = { month: lm, yield10: r2(Y.get(lm)!), policy: r2(P.get(lm)!), spread: monthly[monthly.length - 1].value };
  const agoKey = prevMonth(lm, 12);
  const agoPt = monthly.find((p) => p.period === agoKey);

  const byYear = new Map<number, number[]>();
  for (const p of monthly) {
    const y = Number(p.period.slice(0, 4));
    (byYear.get(y) || byYear.set(y, []).get(y)!).push(p.value);
  }
  const years = [...byYear.entries()]
    .filter(([, v]) => v.length >= CURVE_MIN_MONTHS)
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({ year, spread: r2(v.reduce((s, a) => s + a, 0) / v.length), months: v.length }));

  const missing: string[] = [];
  const parts: Array<{ id: FciComponentId; pts: Map<string, number> }> = [
    { id: 'policy', pts: P },
    { id: 'yield10', pts: Y },
  ];
  if (!inp.isUs) {
    const US = toMap(inp.usYields);
    if (US.size) {
      const s = new Map<string, number>();
      for (const [m, v] of Y) if (US.has(m)) s.set(m, v - US.get(m)!);
      parts.push({ id: 'usSpread', pts: s });
    } else missing.push('Spread over US Treasuries: the US 10-year yield has not answered, so the conditions index leaves it out');
  }
  const R = toMap(inp.reer);
  if (R.size) parts.push({ id: 'reer', pts: R });
  else missing.push('Real effective exchange rate: the BIS has not answered or does not publish one, so the conditions index leaves it out');
  const fci = financialConditions(parts);
  if (!fci) missing.push(`Financial conditions index: fewer than two components with ${FCI_MIN_MONTHS} months or more`);

  const t = inp.test;
  const hitRate = t && t.status === 'passed' ? { hitRatePct: t.hitRatePct, baseRatePct: t.baseRatePct, cases: t.cases, span: t.span } : undefined;

  return {
    ok: true,
    latest,
    ...(agoPt ? { yearAgo: { month: agoPt.period, spread: agoPt.value } } : {}),
    monthly,
    spells: curveSpells(monthly),
    years,
    ...(fci ? { fci } : {}),
    ...(hitRate ? { hitRate } : {}),
    missing,
    method: CURVE_METHOD,
    sources: CURVE_SOURCES,
  };
}

export const monthText = (m: string) => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m.slice(5, 7)) - 1] || ''} ${m.slice(0, 4)}`;
};
const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

export function curveSentence(r: YieldCurve, name: string): string {
  const l = r.latest;
  let s = `${name}: in ${monthText(l.month)} the 10-year yield was ${l.yield10.toFixed(2)}% and the policy rate ${l.policy.toFixed(2)}%, a term spread of ${sg(l.spread)} points (${l.spread < 0 ? 'inverted' : 'not inverted'}).`;
  if (r.yearAgo) s += ` A year earlier it was ${sg(r.yearAgo.spread)}.`;
  if (r.fci) s += ` Financial conditions read ${sg(r.fci.value)} (equal-weight z-scores; positive = tighter than the country's own average since ${monthText(r.fci.since)}).`;
  if (r.hitRate && l.spread < 0)
    s += ` In the passed test, an inverted year was followed by a fall in real GDP in ${r.hitRate.hitRatePct}% of ${r.hitRate.cases} cases (${r.hitRate.span.from} to ${r.hitRate.span.to}), against ${r.hitRate.baseRatePct}% of years in general.`;
  return s;
}
