/**
 * Basis risk for a parametric cover (I7, Sam 2026-11-14): how far the index the cover pays on is from
 * the loss it is meant to cover. The app has no farm or budget loss records, so a second measure of
 * the same weather stands in for the loss: for a cover on rainfall at the capital, rainfall averaged
 * over the whole country, and the other way round (temperature the same).
 *
 * Over the seasons both series hold:
 * - bad years: the worst 1 in `badShare` seasons of the second series, in the cover's direction;
 * - hit: a bad year in which the cover paid; missed: a bad year with no payout (the case that hurts
 *   the insured most); payout with no bad year: the cover paid but the second series was not bad;
 * - rank correlation (Spearman) between the two indexes;
 * - payout gap: the average gap between what the cover paid and what the same design would have paid
 *   on the second series, with its trigger and exit moved to the same place in that series' own
 *   spread (same share of seasons beyond each).
 *
 * This measures how well one weather measure tracks another, which is only a lower bound on basis
 * risk: real losses also depend on crops, timing within the season, prices and local conditions.
 * Browser-safe, pure.
 */
import { payoutFraction, quantile, type SeasonValue, type TriggerDesign } from './parametricTrigger';

export const BASIS_MIN_SEASONS = 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface BasisYear {
  year: number;
  cover: number;
  other: number;
  coverPayPct: number;
  otherPayPct: number;
  bad: boolean;
}

export interface BasisResult {
  seasons: number;
  from: number;
  to: number;
  badYears: number;
  hits: number;
  missed: number;
  /** Seasons where the cover paid but the second series was not bad. */
  paidNoBad: number;
  /** Share of bad years the cover paid in, %. */
  hitRatePct: number;
  spearman: number;
  /** Average |cover payout - payout on the second series|, % of the cover. */
  payoutGapPct: number;
  /** The design moved onto the second series. */
  otherTrigger: number;
  otherExit: number;
  rows: BasisYear[];
}

function ranks(v: number[]): number[] {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = Array(v.length).fill(0);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

/** Spearman rank correlation (Pearson on ranks, ties averaged). */
export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a);
  const rb = ranks(b);
  const n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n;
  const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** Where x sits in the spread of vals, 0 to 1: the inverse of the type 7 quantile, clamped to the range. */
function position(vals: number[], x: number): number {
  const v = [...vals].sort((a, b) => a - b);
  const n = v.length;
  if (x <= v[0]) return 0;
  if (x >= v[n - 1]) return 1;
  let i = 0;
  while (v[i + 1] < x) i++;
  const frac = v[i + 1] === v[i] ? 0 : (x - v[i]) / (v[i + 1] - v[i]);
  return (i + frac) / (n - 1);
}

/** Basis risk of the design against a second series; null with fewer than BASIS_MIN_SEASONS shared seasons. */
export function basisRisk(cover: SeasonValue[], other: SeasonValue[], d: Pick<TriggerDesign, 'direction' | 'trigger' | 'exit'>, badShare = 5): BasisResult | null {
  const byYear = new Map(other.map((s) => [s.year, s.value]));
  const pairs = cover.filter((s) => byYear.has(s.year)).map((s) => ({ year: s.year, cover: s.value, other: byYear.get(s.year)! }));
  pairs.sort((a, b) => a.year - b.year);
  const n = pairs.length;
  if (n < BASIS_MIN_SEASONS) return null;
  const cv = pairs.map((p) => p.cover);
  const ov = pairs.map((p) => p.other);
  // Same place in the second series' spread.
  const otherTrigger = r2(quantile(ov, position(cv, d.trigger)));
  const otherExit = r2(quantile(ov, position(cv, d.exit)));
  const od = { direction: d.direction, trigger: otherTrigger, exit: otherExit };
  // Bad years: the worst ceil(n / badShare) seasons of the second series in the cover's direction.
  const nBad = Math.max(1, Math.ceil(n / badShare));
  const worst = new Set(
    [...pairs]
      .sort((a, b) => (d.direction === 'below' ? a.other - b.other : b.other - a.other))
      .slice(0, nBad)
      .map((p) => p.year),
  );
  const rows: BasisYear[] = pairs.map((p) => ({
    year: p.year,
    cover: p.cover,
    other: p.other,
    coverPayPct: r2(payoutFraction(p.cover, d) * 100),
    otherPayPct: r2(payoutFraction(p.other, od) * 100),
    bad: worst.has(p.year),
  }));
  const hits = rows.filter((r) => r.bad && r.coverPayPct > 0).length;
  const paidNoBad = rows.filter((r) => !r.bad && r.coverPayPct > 0).length;
  return {
    seasons: n,
    from: pairs[0].year,
    to: pairs[n - 1].year,
    badYears: nBad,
    hits,
    missed: nBad - hits,
    paidNoBad,
    hitRatePct: r2((hits / nBad) * 100),
    spearman: r2(spearman(cv, ov)),
    payoutGapPct: r2(rows.reduce((s, r) => s + Math.abs(r.coverPayPct - r.otherPayPct), 0) / n),
    otherTrigger,
    otherExit,
    rows,
  };
}

/** One English sentence for Explain. */
export function basisSentence(b: BasisResult, otherLabel: string): string {
  return (
    `Against ${otherLabel} over ${b.seasons} shared seasons ${b.from}-${b.to}: of the ${b.badYears} worst seasons there, the cover paid in ${b.hits} and missed ${b.missed}; ` +
    `it paid in ${b.paidNoBad} other seasons; rank correlation ${b.spearman}; average payout gap ${b.payoutGapPct}% of the cover.`
  );
}
