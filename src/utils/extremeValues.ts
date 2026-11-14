/**
 * Return periods and extreme values for a season index (I3 + I4, Sam 2026-11-14), used by the
 * parametric trigger designer.
 *
 * I3, from the record: each past season's return period by its rank (Weibull plotting position:
 * the r-th most extreme of n seasons is passed about 1 year in (n + 1) / r), and the level passed
 * about 1 year in T read from the record (empirical quantile) while T is inside the record.
 *
 * I4, extreme value fit: a generalised extreme value (GEV) distribution fitted to the season values
 * by L-moments (Hosking, J. R. M., 1990, "L-moments: analysis and estimation of distributions using
 * linear combinations of order statistics", J. R. Statist. Soc. B 52; Hosking, Wallis and Wood 1985,
 * Technometrics 27). L-moments are the usual choice for short hydrological and climate records
 * because they are less thrown by one wild year than ordinary moments. For a cover that pays when
 * the index is low (drought) the fit is made on the negated values, so the lower tail is the one
 * modelled. From the fit: the level passed about 1 year in 2, 5, 10, 20, 50 and 100, each with a 90%
 * range from refitting on resampled seasons (bootstrap, fixed seed so the same record always gives
 * the same range), the return period of the trigger and exit, and the burn cost from the fitted curve
 * rather than from the past years alone. A simple check: how many past seasons passed the fitted
 * 1-in-10 level against the number expected.
 *
 * Beyond the length of the record every figure is extrapolation, and the panel says so. Browser-safe,
 * pure.
 */
import { payoutFraction, quantile, type SeasonValue, type TriggerDesign, type TriggerDirection } from './parametricTrigger';

/** Fewer seasons than this and no GEV fit is made. */
export const GEV_MIN_SEASONS = 20;
export const RETURN_PERIODS = [2, 5, 10, 20, 50, 100];
const BOOT_RUNS = 400;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Lanczos approximation of the gamma function (g = 7), enough for 1 + k with k in (-1, 1). */
export function gamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  const x = z - 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a;
}

/** Hosking's GEV: location xi, scale alpha, shape k (k > 0 bounded upper tail; k < 0 heavy tail). */
export interface Gev {
  xi: number;
  alpha: number;
  k: number;
}

/** Sample L-moments l1, l2 and L-skewness t3 from unbiased probability-weighted moments. */
export function lmoments(values: number[]): { l1: number; l2: number; t3: number } | null {
  const x = [...values].sort((a, b) => a - b);
  const n = x.length;
  if (n < 3) return null;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let j = 0; j < n; j++) {
    b0 += x[j];
    b1 += (j / (n - 1)) * x[j];
    b2 += ((j * (j - 1)) / ((n - 1) * (n - 2))) * x[j];
  }
  b0 /= n;
  b1 /= n;
  b2 /= n;
  const l1 = b0;
  const l2 = 2 * b1 - b0;
  const l3 = 6 * b2 - 6 * b1 + b0;
  if (!(l2 > 0)) return null;
  return { l1, l2, t3: l3 / l2 };
}

/** GEV by L-moments (Hosking 1985 approximation for k); null when the values cannot be fitted. */
export function fitGev(values: number[]): Gev | null {
  const m = lmoments(values);
  if (!m) return null;
  const c = 2 / (3 + m.t3) - Math.LN2 / Math.log(3);
  const k = 7.859 * c + 2.9554 * c * c;
  if (!Number.isFinite(k) || k <= -1 || k >= 1) return null;
  if (Math.abs(k) < 1e-6) {
    const alpha = m.l2 / Math.LN2;
    return { xi: m.l1 - 0.5772156649 * alpha, alpha, k: 0 };
  }
  const g = gamma(1 + k);
  const alpha = (m.l2 * k) / ((1 - 2 ** -k) * g);
  const xi = m.l1 - (alpha * (1 - g)) / k;
  return Number.isFinite(alpha) && alpha > 0 && Number.isFinite(xi) ? { xi, alpha, k } : null;
}

/** Value with non-exceedance probability F (0 < F < 1). */
export function gevQuantile(g: Gev, F: number): number {
  const y = -Math.log(F);
  return g.k === 0 ? g.xi - g.alpha * Math.log(y) : g.xi + (g.alpha / g.k) * (1 - y ** g.k);
}

/** Probability of a value at or below x. */
export function gevCdf(g: Gev, x: number): number {
  if (g.k === 0) return Math.exp(-Math.exp(-(x - g.xi) / g.alpha));
  const s = 1 - (g.k * (x - g.xi)) / g.alpha;
  if (s <= 0) return g.k > 0 ? 1 : 0;
  return Math.exp(-(s ** (1 / g.k)));
}

/** Deterministic random numbers (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In the cover's direction: a fitted model on "badness" (values for 'above', negated for 'below'). */
const signOf = (d: TriggerDirection) => (d === 'below' ? -1 : 1);

export interface ReturnLevel {
  years: number;
  /** From the record (empirical quantile); undefined when T is longer than the record. */
  record?: number;
  fitted?: number;
  low?: number;
  high?: number;
  /** T longer than the record: the fitted figure is extrapolation. */
  beyond: boolean;
}

export interface RarityResult {
  seasons: number;
  direction: TriggerDirection;
  /** Each season's return period by rank in the record, newest first. */
  ranked: Array<{ year: number; value: number; returnYears: number }>;
  levels: ReturnLevel[];
  gev?: Gev;
  trigger: { recordYears?: number; fittedYears?: number };
  exit: { recordYears?: number; fittedYears?: number };
  /** Burn cost (% of cover) from the fitted curve. */
  fittedBurnPct?: number;
  /** Past seasons beyond the fitted 1-in-10 level, and the number expected. */
  check?: { beyond10: number; expected10: number };
  /** Why there is no fit, when there is none. */
  noFit?: string;
}

/** Return period of passing level v in the record: (n + 1) / (seasons at or beyond v), or undefined if none. */
function recordReturn(vals: number[], v: number, dir: TriggerDirection): number | undefined {
  const hits = vals.filter((x) => (dir === 'below' ? x <= v : x >= v)).length;
  return hits ? r1((vals.length + 1) / hits) : undefined;
}

function fittedReturn(g: Gev, v: number, dir: TriggerDirection): number | undefined {
  const p = 1 - gevCdf(g, signOf(dir) * v);
  return p > 0 ? r1(1 / p) : undefined;
}

/** The fitted burn cost: mean payout over the fitted distribution (midpoint rule on 4000 quantiles). */
function fittedBurn(g: Gev, d: Pick<TriggerDesign, 'direction' | 'trigger' | 'exit'>): number {
  const N = 4000;
  const s = signOf(d.direction);
  let sum = 0;
  for (let i = 0; i < N; i++) sum += payoutFraction(s * gevQuantile(g, (i + 0.5) / N), d);
  return r2((sum / N) * 100);
}

/** Return periods from the record and the GEV fit for one design's seasons. */
export function rarity(seasons: SeasonValue[], d: Pick<TriggerDesign, 'direction' | 'trigger' | 'exit'>): RarityResult {
  const dir = d.direction;
  const s = signOf(dir);
  const vals = seasons.map((x) => x.value);
  const n = vals.length;
  // Most extreme first in the cover's direction; ties share the better rank.
  const order = [...seasons].sort((a, b) => s * (b.value - a.value));
  const ranked = order
    .map((x) => ({ year: x.year, value: x.value, returnYears: r1((n + 1) / (1 + order.filter((o) => s * (o.value - x.value) > 0).length)) }))
    .sort((a, b) => b.year - a.year);
  const out: RarityResult = {
    seasons: n,
    direction: dir,
    ranked,
    levels: [],
    trigger: { recordYears: recordReturn(vals, d.trigger, dir) },
    exit: { recordYears: recordReturn(vals, d.exit, dir) },
  };
  const gev = n >= GEV_MIN_SEASONS ? fitGev(vals.map((v) => s * v)) : null;
  if (!gev) out.noFit = n < GEV_MIN_SEASONS ? `Fewer than ${GEV_MIN_SEASONS} complete seasons, so no extreme value fit` : 'The extreme value fit did not converge on these seasons';
  // Bootstrap: refit on resampled seasons; keep the fitted level for each T.
  const boots: number[][] = RETURN_PERIODS.map(() => []);
  if (gev) {
    const rnd = seeded(n * 7919 + Math.round(vals.reduce((a, b) => a + b, 0)));
    for (let b = 0; b < BOOT_RUNS; b++) {
      const sample = Array.from({ length: n }, () => s * vals[Math.floor(rnd() * n)]);
      const g = fitGev(sample);
      if (!g) continue;
      RETURN_PERIODS.forEach((T, i) => boots[i].push(s * gevQuantile(g, 1 - 1 / T)));
    }
  }
  out.levels = RETURN_PERIODS.map((T, i) => {
    const beyond = T > n;
    const rec = beyond ? undefined : r2(quantile(vals, dir === 'below' ? 1 / T : 1 - 1 / T));
    if (!gev) return { years: T, ...(rec !== undefined ? { record: rec } : {}), beyond };
    const fitted = r2(s * gevQuantile(gev, 1 - 1 / T));
    const bs = boots[i];
    const lo = bs.length >= 50 ? r2(quantile(bs, 0.05)) : undefined;
    const hi = bs.length >= 50 ? r2(quantile(bs, 0.95)) : undefined;
    return { years: T, ...(rec !== undefined ? { record: rec } : {}), fitted, ...(lo !== undefined ? { low: Math.min(lo, hi!), high: Math.max(lo, hi!) } : {}), beyond };
  });
  if (gev) {
    out.gev = gev;
    out.trigger.fittedYears = fittedReturn(gev, d.trigger, dir);
    out.exit.fittedYears = fittedReturn(gev, d.exit, dir);
    if (d.direction === 'below' ? d.exit < d.trigger : d.exit > d.trigger) out.fittedBurnPct = fittedBurn(gev, d);
    const l10 = s * gevQuantile(gev, 0.9);
    out.check = { beyond10: vals.filter((v) => (dir === 'below' ? v <= l10 : v >= l10)).length, expected10: r1(n / 10) };
  }
  return out;
}

/** One English sentence for Explain. */
export function raritySentence(r: RarityResult, unit: string): string {
  const parts: string[] = [];
  const t = r.trigger;
  const e = r.exit;
  if (t.recordYears || t.fittedYears) parts.push(`the trigger is passed about 1 year in ${t.recordYears ?? '-'} in the record and 1 in ${t.fittedYears ?? '-'} on the fitted curve`);
  if (e.recordYears || e.fittedYears) parts.push(`the exit 1 in ${e.recordYears ?? '-'} and 1 in ${e.fittedYears ?? '-'}`);
  const l = r.levels.find((x) => x.years === 20);
  const lvl = l?.fitted !== undefined ? ` The fitted 1-in-20 season is ${l.fitted} ${unit}${l.low !== undefined ? ` (90% range ${l.low} to ${l.high})` : ''}.` : '';
  const burn = r.fittedBurnPct !== undefined ? ` Burn cost from the fitted curve ${r.fittedBurnPct}% of the cover.` : '';
  return `${r.seasons} seasons, GEV fitted by L-moments: ${parts.join('; ') || 'no trigger return period'}.${lvl}${burn}`;
}
