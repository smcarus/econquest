/**
 * Macro lab (group D, PD2; platform comparison gap CG14): two textbook models with sliders and
 * plain explanations. No data: the units are a teaching index (potential output and the expected
 * price level both 100), and every number on screen comes from the sliders.
 *
 *   Aggregate demand and supply (Mankiw, Macroeconomics, ch. 10-14, linear form)
 *     AD:   Y = Yn + (1/b) [ (Pe - P) ] + d                  demand shock d shifts AD right
 *     SRAS: P = Pe + c (Y - Yn) + s                          supply shock s shifts SRAS up
 *     LRAS: Y = Yn                                           in the long run Pe catches up with P
 *   Short-run equilibrium: Y - Yn = (d - s/b) / (1 + c/b), P = Pe + c (Y - Yn) + s.
 *
 *   Debt dynamics (the debt equation, IMF DSA guidance)
 *     d(t+1) = d(t) (1 + r) / (1 + g) - pb
 *   d debt, % of GDP; r nominal interest rate and g nominal growth, %; pb primary balance, % of GDP.
 *   The primary balance that holds debt steady: pb* = d (r - g) / (1 + g).
 *
 * Browser-safe, pure.
 */

export const YN = 100;
export const PE = 100;

export interface AdAsInput {
  /** Slope of AD (how much prices must fall to raise demand by one point): b > 0. */
  b: number;
  /** Slope of short-run supply: c >= 0 (0 = flat, prices fixed). */
  c: number;
  /** Demand shock, points of output at the old price level. */
  d: number;
  /** Supply shock, points of price level at potential output (up = costlier). */
  s: number;
}

export interface AdAsResult {
  y: number;
  p: number;
  gap: number;
  /** Long run, once expectations catch up: output back at potential, prices absorb the shocks. */
  longRun: { y: number; p: number };
  /** Lines to draw: AD and SRAS (after the shocks) over output from 80 to 120. */
  ad: Array<{ y: number; p: number }>;
  sras: Array<{ y: number; p: number }>;
  reading: string;
}

export function adAs(i: AdAsInput): AdAsResult | { error: string } {
  if (!(i.b > 0)) return { error: 'The slope of demand must be above zero.' };
  if (!(i.c >= 0)) return { error: 'The slope of supply cannot be below zero.' };
  const gap = (i.d - i.s / i.b) / (1 + i.c / i.b);
  const y = YN + gap;
  const p = PE + i.c * gap + i.s;
  const ys = Array.from({ length: 41 }, (_, k) => 80 + k);
  const ad = ys.map((yy) => ({ y: yy, p: PE - i.b * (yy - YN - i.d) }));
  const sras = ys.map((yy) => ({ y: yy, p: PE + i.c * (yy - YN) + i.s }));
  // Long run: Y = Yn on AD, so P = Pe + b d.
  const longRun = { y: YN, p: PE + i.b * i.d };
  const r = (v: number) => (Math.round(v * 10) / 10).toString();
  const what =
    Math.abs(gap) < 0.05 && Math.abs(p - PE) < 0.05
      ? 'Nothing has moved: output is at potential and prices at what people expected.'
      : `Output is ${r(Math.abs(gap))} points ${gap >= 0 ? 'above' : 'below'} potential and the price level ${r(Math.abs(p - PE))} points ${p >= PE ? 'above' : 'below'} what people expected.`;
  const why =
    i.s !== 0 && i.d === 0
      ? ' A supply shock moves output and prices in opposite directions (stagflation when costs rise): a central bank cannot fix both at once.'
      : i.d !== 0 && i.s === 0
        ? ` A demand shock moves output and prices the same way; the flatter supply is (c = ${r(i.c)}), the more of it shows up in output rather than prices.`
        : '';
  return { y, p, gap, longRun, ad, sras, reading: `${what}${why} In the long run, as expectations catch up, output returns to potential and the price level ends at ${r(longRun.p)}.` };
}

export interface DebtInput {
  d0: number;
  r: number;
  g: number;
  pb: number;
  years: number;
}

export function debtPath(i: DebtInput): { path: Array<{ t: number; d: number }>; stabilisingPb: number; reading: string } | { error: string } {
  if (!(i.g > -100)) return { error: 'Growth must be above -100%.' };
  if (!(i.years >= 1 && i.years <= 50)) return { error: 'Years must be 1 to 50.' };
  const path = [{ t: 0, d: i.d0 }];
  for (let t = 1; t <= i.years; t++) path.push({ t, d: (path[t - 1].d * (1 + i.r / 100)) / (1 + i.g / 100) - i.pb });
  const stabilisingPb = (i.d0 * (i.r - i.g)) / (100 + i.g);
  const end = path[path.length - 1].d;
  const r = (v: number) => (Math.round(v * 10) / 10).toString();
  const rg = i.r > i.g ? 'Interest is above growth, so debt grows on its own unless the budget runs a primary surplus.' : i.r < i.g ? 'Growth is above interest, so debt shrinks as a share of GDP even with a small primary deficit.' : 'Interest equals growth, so only the primary balance moves debt.';
  return { path, stabilisingPb, reading: `${rg} After ${i.years} years debt is ${r(end)}% of GDP (from ${r(i.d0)}%). The primary balance that would hold it at ${r(i.d0)}% is ${r(stabilisingPb)}% of GDP${i.pb >= stabilisingPb ? '; the balance you set is at or above it.' : '; the balance you set is below it, so debt rises.'}` };
}
