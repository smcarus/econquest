/**
 * Small gap model (Sam, 2026-11-08, plan item L2): four plain quarterly equations for the output gap,
 * inflation, the policy rate and the exchange rate. The model ships with NO numbers: every parameter
 * is typed in by the user and shown beside the result. A blank parameter is reported as Missing and
 * nothing is simulated. The starting point may be filled from the latest saved figures, but only
 * when the user presses the button for it (the screen, plan item L2b); this file never reads data.
 *
 * Equations (t = quarter; y = output gap, %; p = inflation, % a year; i = policy rate, %;
 * q = exchange-rate gap, %, up = weaker home currency; shocks e are set by the user):
 *
 *   y(t) = b1 y(t-1) - b2 [ i(t-1) - p(t-1) - rStar ] + b3 q(t-1)                       + e_y(t)
 *   p(t) = c1 p(t-1) + (1 - c1) pStar + c2 y(t-1) + c3 [ q(t-1) - q(t-2) ]               + e_p(t)
 *   i(t) = rho i(t-1) + (1 - rho) [ rStar + pStar + phiP (p(t) - pStar) + phiY y(t) ]    + e_i(t)
 *   q(t) = d1 q(t-1) - d2 [ i(t) - iForeign ]                                            + e_q(t)
 *
 * The first is an IS curve, the second a Phillips curve with exchange-rate pass-through, the third
 * a Taylor-type rule with smoothing, the fourth an uncovered-interest-parity style exchange rate.
 * It is a teaching and exploring tool, not a forecast: results are the user's assumptions played out.
 *
 * Browser-safe, pure, no imports.
 */

export const GAP_PARAMS = ['b1', 'b2', 'b3', 'c1', 'c2', 'c3', 'rho', 'phiP', 'phiY', 'd1', 'd2', 'rStar', 'pStar', 'iForeign'] as const;
export type GapParam = (typeof GAP_PARAMS)[number];

export const GAP_START = ['y0', 'p0', 'i0', 'q0'] as const;
export type GapStart = (typeof GAP_START)[number];

export type GapVariable = 'y' | 'p' | 'i' | 'q';

/** Plain names for the screen and for exports. */
export const GAP_PARAM_LABELS: Record<GapParam, string> = {
  b1: 'Output gap persistence (b1)',
  b2: 'Effect of the real interest rate on the output gap (b2)',
  b3: 'Effect of a weaker currency on the output gap (b3)',
  c1: 'Inflation persistence (c1)',
  c2: 'Effect of the output gap on inflation (c2)',
  c3: 'Pass-through of currency moves to inflation (c3)',
  rho: 'Policy rate smoothing (rho)',
  phiP: 'Policy response to inflation (phiP)',
  phiY: 'Policy response to the output gap (phiY)',
  d1: 'Exchange-rate gap persistence (d1)',
  d2: 'Effect of the interest-rate gap on the currency (d2)',
  rStar: 'Neutral real interest rate, % (rStar)',
  pStar: 'Inflation target, % (pStar)',
  iForeign: 'Foreign policy rate, % (iForeign)',
};

export const GAP_START_LABELS: Record<GapStart, string> = {
  y0: 'Starting output gap, %',
  p0: 'Starting inflation, % a year',
  i0: 'Starting policy rate, %',
  q0: 'Starting exchange-rate gap, %',
};

export interface GapShock {
  variable: GapVariable;
  /** Quarter the shock hits, 1 = the first simulated quarter. */
  quarter: number;
  /** Size in percentage points. */
  size: number;
}

/** What the user typed; a blank is undefined, null or an empty string. */
export interface GapInput {
  params: Partial<Record<GapParam, number | string | null>>;
  start: Partial<Record<GapStart, number | string | null>>;
  shocks?: GapShock[];
  /** Quarters to simulate, 1 to 40. */
  quarters: number;
}

export interface GapPoint {
  quarter: number;
  y: number;
  p: number;
  i: number;
  q: number;
}

export type GapResult =
  | { ok: true; path: GapPoint[]; params: Record<GapParam, number>; start: Record<GapStart, number>; unstable: boolean }
  | { ok: false; missing: string[]; problems: string[] };

export const MAX_QUARTERS = 40;
const UNSTABLE_ABS = 1e4;

function num(v: number | string | null | undefined): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Checks the input and runs the model. Never fills a blank: a blank is named in `missing`. */
export function runGapModel(input: GapInput): GapResult {
  const missing: string[] = [];
  const problems: string[] = [];
  const params = {} as Record<GapParam, number>;
  const start = {} as Record<GapStart, number>;
  for (const k of GAP_PARAMS) {
    const n = num(input.params?.[k]);
    if (n === null) missing.push(`Missing: enter this parameter: ${GAP_PARAM_LABELS[k]}`);
    else if (Number.isNaN(n)) problems.push(`Not a number: ${GAP_PARAM_LABELS[k]}`);
    else params[k] = n;
  }
  for (const k of GAP_START) {
    const n = num(input.start?.[k]);
    if (n === null) missing.push(`Missing: enter the starting value: ${GAP_START_LABELS[k]}`);
    else if (Number.isNaN(n)) problems.push(`Not a number: ${GAP_START_LABELS[k]}`);
    else start[k] = n;
  }
  const quarters = Math.round(Number(input.quarters));
  if (!Number.isFinite(quarters) || quarters < 1 || quarters > MAX_QUARTERS) problems.push(`Quarters must be a whole number from 1 to ${MAX_QUARTERS}.`);
  for (const s of input.shocks ?? []) {
    if (!['y', 'p', 'i', 'q'].includes(s.variable)) problems.push(`Shock on an unknown variable: ${String(s.variable)}`);
    if (!Number.isInteger(s.quarter) || s.quarter < 1 || s.quarter > MAX_QUARTERS) problems.push(`Shock quarter must be a whole number from 1 to ${MAX_QUARTERS}.`);
    if (!Number.isFinite(s.size)) problems.push('Shock size must be a number.');
  }
  if (missing.length || problems.length) return { ok: false, missing, problems };

  const { b1, b2, b3, c1, c2, c3, rho, phiP, phiY, d1, d2, rStar, pStar, iForeign } = params;
  const shock = (v: GapVariable, t: number) => (input.shocks ?? []).filter((s) => s.variable === v && s.quarter === t).reduce((a, s) => a + s.size, 0);

  const path: GapPoint[] = [{ quarter: 0, y: start.y0, p: start.p0, i: start.i0, q: start.q0 }];
  let qPrev2 = start.q0; // before the start the exchange-rate gap is taken as unchanged
  let unstable = false;
  for (let t = 1; t <= quarters; t++) {
    const prev = path[t - 1]!;
    const y = b1 * prev.y - b2 * (prev.i - prev.p - rStar) + b3 * prev.q + shock('y', t);
    const p = c1 * prev.p + (1 - c1) * pStar + c2 * prev.y + c3 * (prev.q - qPrev2) + shock('p', t);
    const i = rho * prev.i + (1 - rho) * (rStar + pStar + phiP * (p - pStar) + phiY * y) + shock('i', t);
    const q = d1 * prev.q - d2 * (i - iForeign) + shock('q', t);
    qPrev2 = prev.q;
    const point = { quarter: t, y, p, i, q };
    if ([y, p, i, q].some((v) => !Number.isFinite(v) || Math.abs(v) > UNSTABLE_ABS)) {
      unstable = true;
      break;
    }
    path.push(point);
  }
  return { ok: true, path, params, start, unstable };
}

/** The path as CSV rows (quarter, output gap, inflation, policy rate, exchange-rate gap), numbers to 4 decimals. */
export function gapPathCsv(path: GapPoint[]): string {
  const f = (v: number) => (Math.round(v * 1e4) / 1e4).toString();
  return ['quarter,output_gap_pct,inflation_pct,policy_rate_pct,exchange_rate_gap_pct', ...path.map((r) => [r.quarter, f(r.y), f(r.p), f(r.i), f(r.q)].join(','))].join('\n');
}
