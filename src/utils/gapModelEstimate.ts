/**
 * Gap model estimated from data (platform comparison gap CG7): a small quarterly projection model
 * in the spirit of Berg, Karam and Laxton (2006, "A Practical Model-Based Approach to Monetary
 * Policy Analysis", IMF WP/06/80), with its parameters estimated from each country's own data
 * rather than calibrated, and tested out of sample before any projection is shown.
 *
 *   Output gap   y(t) = a0 + b1 y(t-1) + b2 [i(t-1) - p(t-1)]          (IS curve; theory: b2 < 0)
 *   Inflation    p(t) = c0 + c1 p(t-1) + c2 y(t-1)                     (Phillips curve; c2 > 0)
 *   Policy rate  i(t) = d0 + rho i(t-1) + d1 p(t) + d2 y(t)             (rule with smoothing)
 *
 * y is a real-time output gap: the one-sided HP cycle (lambda 1600) of the log GDP level built from
 * quarterly growth, so the gap for quarter t uses GDP only up to t. p is CPI inflation (y/y, mean
 * of the quarter's three months), i the policy rate (mean of the quarter's months). Each equation
 * is fitted by OLS on the quarters up to the origin (at most `window` of them); the projection plays
 * the three equations forward with no shocks. The exchange-rate equation of the hand-typed gap model
 * (utils/gapModel.ts) is left out: the evaluation data hold no exchange-rate gap for every country.
 *
 * The registered test (docs/validation/forecasts/cpi_gap_model.json) compares the projected
 * inflation 4 and 8 quarters ahead with the last inflation figure carried on. A projection is shown
 * only while the test passes. Browser-safe, pure.
 */
import type { CountryData } from './forecastCases';
import type { ForecastCase, ForecastSpec } from './forecastEval';
import { hpFilter, ols } from './stats';

export const GAP_HP_LAMBDA = 1600;
/** Quarters of growth needed before the first one-sided gap (the HP filter needs a run to settle). */
export const GAP_BURN_IN = 12;

export interface GapQuarter {
  period: string;
  y: number;
  p: number;
  i: number;
}

export interface GapEstimate {
  iso3: string;
  /** Last quarter of data used. */
  through: string;
  quarters: number;
  coef: { a0: number; b1: number; b2: number; c0: number; c1: number; c2: number; d0: number; rho: number; d1: number; d2: number };
  /** Coefficients whose sign is the opposite of what the theory expects (reported, not changed). */
  oddSigns: string[];
  last: GapQuarter;
  /** Projection, quarters 1..H after `through`. */
  path: Array<{ period: string; y: number; p: number; i: number }>;
}

const quarterOf = (month: string) => `${month.slice(0, 4)}-Q${Math.ceil(Number(month.slice(5, 7)) / 3)}`;

export function nextQuarter(q: string, n = 1): string {
  const y = Number(q.slice(0, 4));
  const k = Number(q.slice(6)) - 1 + n;
  return `${y + Math.floor(k / 4)}-Q${(((k % 4) + 4) % 4) + 1}`;
}

/** Mean of each quarter's months, only for quarters with all three months. */
export function quarterMeans(points: Array<{ date: string; value: number }> | undefined): Map<string, number> {
  const acc = new Map<string, number[]>();
  for (const p of points || []) {
    if (!/^\d{4}-\d{2}/.test(p.date) || !Number.isFinite(p.value)) continue;
    const q = quarterOf(p.date);
    acc.set(q, [...(acc.get(q) || []), p.value]);
  }
  return new Map([...acc].filter(([, v]) => v.length === 3).map(([q, v]) => [q, v.reduce((a, b) => a + b, 0) / 3]));
}

/**
 * Real-time output gap per quarter: the last value of the HP cycle of the log GDP level up to that
 * quarter (one-sided), over an unbroken run of quarterly growth. In % of the trend level.
 */
export function realTimeGaps(gdpQoq: Array<{ date: string; value: number }> | undefined): Map<string, number> {
  const g = (gdpQoq || []).filter((p) => /^\d{4}-Q[1-4]$/.test(p.date) && Number.isFinite(p.value)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = new Map<string, number>();
  let run: Array<{ date: string; level: number }> = [];
  for (const p of g) {
    if (run.length && nextQuarter(run[run.length - 1].date) !== p.date) run = [];
    const prev = run.length ? run[run.length - 1].level : 0;
    run.push({ date: p.date, level: prev + 100 * Math.log(1 + p.value / 100) });
    if (run.length >= GAP_BURN_IN) {
      const f = hpFilter(run.map((r) => r.level), GAP_HP_LAMBDA);
      if (!('error' in f)) out.set(p.date, f.cycle[f.cycle.length - 1]);
    }
  }
  return out;
}

/** Quarters where the gap, inflation and policy rate all exist, in order; breaks start a new run (the last run is kept). */
export function gapQuarters(c: CountryData): GapQuarter[] {
  const y = realTimeGaps(c.gdpQoq);
  const p = quarterMeans(c.cpi);
  const i = quarterMeans(c.policy);
  const rows = [...y.keys()].filter((q) => p.has(q) && i.has(q)).sort();
  let run: GapQuarter[] = [];
  for (const q of rows) {
    if (run.length && nextQuarter(run[run.length - 1].period) !== q) run = [];
    run.push({ period: q, y: y.get(q)!, p: p.get(q)!, i: i.get(q)! });
  }
  return run;
}

/** Fits the three equations on rows (t = 1..n-1 use t-1 as the lag). Null when any equation cannot be solved. */
export function fitGapEquations(rows: GapQuarter[]): GapEstimate['coef'] | null {
  if (rows.length < 12) return null;
  const cur = rows.slice(1);
  const lag = rows.slice(0, -1);
  const eqY = ols(cur.map((r) => r.y), lag.map((r) => [r.y, r.i - r.p]), 10);
  const eqP = ols(cur.map((r) => r.p), lag.map((r) => [r.p, r.y]), 10);
  const eqI = ols(cur.map((r) => r.i), cur.map((r, t) => [lag[t].i, r.p, r.y]), 10);
  if ('error' in eqY || 'error' in eqP || 'error' in eqI) return null;
  const [a0, b1, b2] = eqY.coef;
  const [c0, c1, c2] = eqP.coef;
  const [d0, rho, d1, d2] = eqI.coef;
  return { a0, b1, b2, c0, c1, c2, d0, rho, d1, d2 };
}

export function projectGap(coef: GapEstimate['coef'], last: GapQuarter, H: number): Array<{ y: number; p: number; i: number }> {
  const out: Array<{ y: number; p: number; i: number }> = [];
  let s = { y: last.y, p: last.p, i: last.i };
  for (let h = 1; h <= H; h++) {
    const y = coef.a0 + coef.b1 * s.y + coef.b2 * (s.i - s.p);
    const p = coef.c0 + coef.c1 * s.p + coef.c2 * s.y;
    const i = coef.d0 + coef.rho * s.i + coef.d1 * p + coef.d2 * y;
    s = { y, p, i };
    out.push(s);
  }
  return out;
}

function oddSigns(c: GapEstimate['coef']): string[] {
  const odd: string[] = [];
  if (c.b2 > 0) odd.push('b2 (a higher real rate goes with a wider output gap)');
  if (c.c2 < 0) odd.push('c2 (a wider output gap goes with lower inflation)');
  if (c.d1 < 0) odd.push('d1 (the policy rate falls when inflation rises)');
  return odd;
}

/** The estimate and projection for one country, from all its quarters (at most `window`). */
export function estimateGapModel(c: CountryData, opts: { window?: number; minTrain?: number; horizon?: number } = {}): GapEstimate | null {
  const rows = gapQuarters(c);
  const window = opts.window ?? 60;
  const minTrain = opts.minTrain ?? 32;
  if (rows.length < minTrain) return null;
  const train = rows.slice(-window);
  const coef = fitGapEquations(train);
  if (!coef) return null;
  const last = train[train.length - 1];
  const H = opts.horizon ?? 8;
  const path = projectGap(coef, last, H).map((s, k) => ({ period: nextQuarter(last.period, k + 1), ...s }));
  return { iso3: c.iso3, through: last.period, quarters: train.length, coef, oddSigns: oddSigns(coef), last, path };
}

/**
 * Out-of-sample cases: at each origin quarter from the sample start with at least minTrain quarters
 * before it, fit on quarters up to the origin and project inflation h quarters ahead; benchmark:
 * the origin's inflation carried on (naive). Pseudo real-time: today's vintage, and the origin's
 * quarter is treated as fully known (GDP out), as after the GDP release.
 */
export function gapModelCases(spec: ForecastSpec, data: CountryData[]): { cases: ForecastCase[]; series: string[] } {
  const window = spec.params.window ?? 60;
  const minTrain = spec.params.minTrain ?? 32;
  const maxH = Math.max(...spec.horizons);
  const out: ForecastCase[] = [];
  for (const c of data) {
    const rows = gapQuarters(c);
    for (let k = minTrain - 1; k < rows.length; k++) {
      const origin = rows[k].period;
      if (origin < spec.sample.from || (spec.sample.to && origin > spec.sample.to)) continue;
      const coef = fitGapEquations(rows.slice(Math.max(0, k + 1 - window), k + 1));
      if (!coef) continue;
      const proj = projectGap(coef, rows[k], maxH);
      for (const h of spec.horizons) {
        if (k + h >= rows.length) continue;
        out.push({ where: c.iso3, origin, target: rows[k + h].period, h, actual: rows[k + h].p, model: { mean: proj[h - 1].p }, bench: { mean: rows[k].p } });
      }
    }
  }
  return { cases: out, series: [...new Set(out.map((x) => x.where))].sort() };
}
