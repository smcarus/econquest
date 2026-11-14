/**
 * Parametric insurance: trigger designer and burn analysis (I5, Sam 2026-11-14).
 *
 * A parametric cover pays from a measured index (season rainfall, temperature, a world price), not from
 * an assessed loss. The design is a season (calendar months, may run across the new year), how the
 * months are combined (rainfall summed, temperature and prices averaged), a direction (pays when the
 * index is below the trigger, as for drought, or above it, as for heat or a price spike), a trigger
 * where payment starts, an exit where it reaches the full cover, and the cover amount. Between trigger
 * and exit the payout rises in a straight line, the usual layout of index covers such as the African
 * Risk Capacity drought cover and the World Bank index insurance guides.
 *
 * Burn analysis replays the design over every complete past season in the series: what it would have
 * paid each year, how often it pays, and the average yearly payout (the burn cost, the expected loss
 * before any loading). The pricing step with a loading (I6) and basis risk (I7) build on this.
 *
 * Only complete seasons count; nothing is filled in. Browser-safe, pure.
 */

export type IndexAgg = 'sum' | 'mean';
export type TriggerDirection = 'below' | 'above';

export interface TriggerDesign {
  /** First month of the season, 1-12. */
  startMonth: number;
  /** Last month of the season, 1-12; before startMonth means the season runs across the new year. */
  endMonth: number;
  agg: IndexAgg;
  direction: TriggerDirection;
  /** Index level where payment starts. */
  trigger: number;
  /** Index level where payment reaches the full cover. */
  exit: number;
  /** Cover amount (sum insured), in whatever money the user works in. */
  cover: number;
}

export interface SeasonValue {
  /** The year the season ends in. */
  year: number;
  value: number;
}

export interface BurnYear {
  year: number;
  index: number;
  /** Payout as % of the cover, 0 to 100. */
  payoutPct: number;
  payout: number;
}

export interface BurnStats {
  from: number;
  to: number;
  years: number;
  paying: number;
  /** Share of years with any payout, %. */
  frequencyPct: number;
  /** Average yearly payout as % of the cover: the burn cost. */
  burnPct: number;
  burnAmount: number;
  /** Sample standard deviation of the yearly payout, % of the cover. */
  sdPct: number;
}

export interface BurnResult extends BurnStats {
  rows: BurnYear[];
  maxPct: number;
  maxYear?: number;
  /** The same figures for seasons from RECENT_FROM, when there are at least RECENT_MIN_YEARS of them. */
  recent?: BurnStats;
}

export const RECENT_FROM = 1991;
export const RECENT_MIN_YEARS = 10;
/** Fewer complete seasons than this and the burn analysis is not shown. */
export const MIN_SEASONS = 10;

export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Calendar months of a season in order, for example 11..2 -> [11, 12, 1, 2]. */
export function seasonMonths(startMonth: number, endMonth: number): number[] {
  const out: number[] = [];
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    out.push(m);
    if (m === endMonth) break;
    m = (m % 12) + 1;
  }
  return out;
}

/**
 * One value per complete season from monthly points ("YYYY-MM" dates). A season that runs across the
 * new year belongs to the year it ends in. Seasons with any month missing are left out.
 */
export function seasonValues(points: Array<{ date: string; value: number }>, startMonth: number, endMonth: number, agg: IndexAgg): SeasonValue[] {
  const byYm = new Map<string, number>();
  for (const p of points) {
    const m = /^(\d{4})-(\d{2})/.exec(p.date);
    if (m && Number.isFinite(p.value)) byYm.set(`${m[1]}-${m[2]}`, p.value);
  }
  if (!byYm.size) return [];
  const months = seasonMonths(startMonth, endMonth);
  const wraps = months.some((m, i) => i > 0 && m < months[i - 1]);
  const years = [...byYm.keys()].map((k) => Number(k.slice(0, 4)));
  const first = Math.min(...years);
  const last = Math.max(...years);
  const out: SeasonValue[] = [];
  for (let y = first; y <= last + 1; y++) {
    let sum = 0;
    let ok = true;
    let crossed = false;
    for (let i = 0; i < months.length; i++) {
      if (i > 0 && months[i] < months[i - 1]) crossed = true;
      const yr = wraps && !crossed ? y - 1 : y;
      const v = byYm.get(`${yr}-${String(months[i]).padStart(2, '0')}`);
      if (v === undefined) {
        ok = false;
        break;
      }
      sum += v;
    }
    if (ok) out.push({ year: y, value: r2(agg === 'sum' ? sum : sum / months.length) });
  }
  return out;
}

/** Share of the cover paid at index value x, 0 to 1: straight line from the trigger to the exit. */
export function payoutFraction(x: number, d: Pick<TriggerDesign, 'direction' | 'trigger' | 'exit'>): number {
  const { trigger, exit } = d;
  if (d.direction === 'below') {
    if (x >= trigger) return 0;
    if (exit >= trigger || x <= exit) return 1;
    return (trigger - x) / (trigger - exit);
  }
  if (x <= trigger) return 0;
  if (exit <= trigger || x >= exit) return 1;
  return (x - trigger) / (exit - trigger);
}

/** What is wrong with a design, or null when it can be run. */
export function designProblem(d: TriggerDesign): string | null {
  if (![d.trigger, d.exit, d.cover].every(Number.isFinite)) return 'Trigger, exit and cover must be numbers';
  if (d.cover <= 0) return 'The cover must be above 0';
  if (d.direction === 'below' && d.exit >= d.trigger) return 'For a cover that pays when the index is low, the exit must be below the trigger';
  if (d.direction === 'above' && d.exit <= d.trigger) return 'For a cover that pays when the index is high, the exit must be above the trigger';
  return null;
}

function stats(rows: BurnYear[], cover: number): BurnStats {
  const n = rows.length;
  const pcts = rows.map((r) => r.payoutPct);
  const mean = pcts.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(pcts.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const paying = rows.filter((r) => r.payoutPct > 0).length;
  return {
    from: rows[0].year,
    to: rows[n - 1].year,
    years: n,
    paying,
    frequencyPct: r2((paying / n) * 100),
    burnPct: r2(mean),
    burnAmount: Math.round((mean / 100) * cover),
    sdPct: r2(sd),
  };
}

/** Replays the design over every complete season; null when there are fewer than MIN_SEASONS. */
export function burnAnalysis(seasons: SeasonValue[], d: TriggerDesign): BurnResult | null {
  if (seasons.length < MIN_SEASONS || designProblem(d)) return null;
  const rows: BurnYear[] = [...seasons]
    .sort((a, b) => a.year - b.year)
    .map((s) => {
      const f = payoutFraction(s.value, d);
      return { year: s.year, index: s.value, payoutPct: r2(f * 100), payout: Math.round(f * d.cover) };
    });
  const top = rows.reduce<BurnYear | undefined>((best, r) => (r.payoutPct > (best?.payoutPct ?? 0) ? r : best), undefined);
  const recentRows = rows.filter((r) => r.year >= RECENT_FROM);
  return {
    ...stats(rows, d.cover),
    rows,
    maxPct: top?.payoutPct ?? 0,
    ...(top ? { maxYear: top.year } : {}),
    ...(recentRows.length >= RECENT_MIN_YEARS ? { recent: stats(recentRows, d.cover) } : {}),
  };
}

/** Empirical quantile (linear between order statistics, the R type 7 rule). */
export function quantile(values: number[], p: number): number {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const h = (v.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return v[lo] + (v[hi] - v[lo]) * (h - lo);
}

/**
 * Trigger and exit from the record: the trigger is passed about once in `triggerYears` seasons and the
 * exit about once in `exitYears` (defaults 1 in 5 and 1 in 20), read from the past seasons.
 */
export function suggestLevels(seasons: SeasonValue[], direction: TriggerDirection, triggerYears = 5, exitYears = 20): { trigger: number; exit: number } | null {
  if (seasons.length < MIN_SEASONS) return null;
  const vals = seasons.map((s) => s.value);
  const q = (p: number) => r2(quantile(vals, p));
  return direction === 'below' ? { trigger: q(1 / triggerYears), exit: q(1 / exitYears) } : { trigger: q(1 - 1 / triggerYears), exit: q(1 - 1 / exitYears) };
}

/**
 * The run of `length` calendar months with the highest average (the main rainy season, or the hottest
 * months), from complete calendar years; months 1-12 for start and end. Null with no data.
 */
export function peakSeason(points: Array<{ date: string; value: number }>, length: number): { startMonth: number; endMonth: number } | null {
  const sums = Array(12).fill(0);
  const counts = Array(12).fill(0);
  for (const p of points) {
    const m = /^\d{4}-(\d{2})/.exec(p.date);
    if (!m || !Number.isFinite(p.value)) continue;
    sums[Number(m[1]) - 1] += p.value;
    counts[Number(m[1]) - 1]++;
  }
  if (counts.some((c) => c === 0)) return null;
  const avg = sums.map((s, i) => s / counts[i]);
  let best = 0;
  let bestTotal = -Infinity;
  for (let s = 0; s < 12; s++) {
    let total = 0;
    for (let k = 0; k < length; k++) total += avg[(s + k) % 12];
    if (total > bestTotal + 1e-9) {
      bestTotal = total;
      best = s;
    }
  }
  return { startMonth: best + 1, endMonth: ((best + length - 1) % 12) + 1 };
}

/** One English sentence on the result, for Explain and the record. */
export function burnSentence(b: BurnResult, d: TriggerDesign, indexLabel: string, unit: string): string {
  const season = `${MONTHS_EN[d.startMonth - 1]} to ${MONTHS_EN[d.endMonth - 1]}`;
  const how = d.direction === 'below' ? 'below' : 'above';
  const oneIn = b.paying ? ` (about 1 year in ${Math.round(b.years / b.paying)})` : '';
  const recent = b.recent ? ` Since ${b.recent.from}: paid in ${b.recent.paying} of ${b.recent.years} years, average yearly payout ${b.recent.burnPct}% of the cover.` : '';
  return (
    `A cover on ${indexLabel}, ${season}, paying from ${d.trigger} ${unit} ${how} to full at ${d.exit} ${unit}, would have paid in ${b.paying} of ${b.years} seasons ${b.from}-${b.to}${oneIn}; ` +
    `average yearly payout (burn cost) ${b.burnPct}% of the cover, standard deviation ${b.sdPct}%, largest ${b.maxPct}%${b.maxYear ? ` in ${b.maxYear}` : ''}.${recent}`
  );
}

// ---------------------------------------------------------------------------------------------
// Fair price with a loading (I6). The user picks how the loading is set: a % of the expected payout
// (burn cost x (1 + p)), or k standard deviations of the yearly payout (burn cost + k x SD, the
// standard-deviation premium principle). The price is shown as a % of the cover (the rate on line)
// and as money, with the multiple of the burn cost. A short record makes the burn cost itself
// uncertain: its standard error is SD / sqrt(years), and the 90% range applies the same loading to
// burn cost +/- 1.645 standard errors.

export type LoadingMethod = 'expected' | 'sd';

export interface Loading {
  method: LoadingMethod;
  /** % of the expected payout when method is 'expected'; k (number of SDs) when 'sd'. */
  value: number;
}

export interface CoverPrice {
  basis: { from: number; to: number; years: number };
  burnPct: number;
  loadingPct: number;
  /** Price as % of the cover (rate on line), capped at 100. */
  premiumPct: number;
  premiumAmount: number;
  /** Price over burn cost; undefined when the burn cost is 0. */
  multiple?: number;
  /** Standard error of the burn cost, % of the cover. */
  sePct: number;
  /** Price at burn cost -/+ 1.645 standard errors, % of the cover. */
  low: number;
  high: number;
  capped: boolean;
}

export const DEFAULT_LOADING: Record<LoadingMethod, number> = { expected: 30, sd: 0.5 };

/** What is wrong with a loading, or null. */
export function loadingProblem(l: Loading): string | null {
  if (!Number.isFinite(l.value) || l.value < 0) return 'The loading must be a number of 0 or more';
  return null;
}

function priceAt(burnPct: number, sdPct: number, l: Loading): number {
  return l.method === 'expected' ? burnPct * (1 + l.value / 100) : burnPct + l.value * sdPct;
}

/** Fair price of the cover from burn statistics (whole record or recent years) and a loading. */
export function priceCover(s: BurnStats, cover: number, l: Loading): CoverPrice | null {
  if (loadingProblem(l) || !(cover > 0) || s.years < 2) return null;
  const raw = priceAt(s.burnPct, s.sdPct, l);
  const premiumPct = Math.min(100, raw);
  const se = s.sdPct / Math.sqrt(s.years);
  const lo = Math.max(0, s.burnPct - 1.645 * se);
  const hi = s.burnPct + 1.645 * se;
  return {
    basis: { from: s.from, to: s.to, years: s.years },
    burnPct: s.burnPct,
    loadingPct: r2(premiumPct - s.burnPct),
    premiumPct: r2(premiumPct),
    premiumAmount: Math.round((premiumPct / 100) * cover),
    ...(s.burnPct > 0 ? { multiple: r2(premiumPct / s.burnPct) } : {}),
    sePct: r2(se),
    low: r2(Math.min(100, priceAt(lo, s.sdPct, l))),
    high: r2(Math.min(100, priceAt(hi, s.sdPct, l))),
    capped: raw > 100,
  };
}

/** One English sentence on the price, for Explain. */
export function priceSentence(p: CoverPrice, l: Loading): string {
  const how = l.method === 'expected' ? `a loading of ${l.value}% of the expected payout` : `a loading of ${l.value} standard deviations of the yearly payout`;
  return (
    `On ${p.basis.from}-${p.basis.to} (${p.basis.years} seasons), with ${how}, the fair price is ${p.premiumPct}% of the cover a year (burn cost ${p.burnPct}% plus ${p.loadingPct}% loading` +
    `${p.multiple !== undefined ? `, ${p.multiple} times the burn cost` : ''}); 90% range from the length of the record ${p.low}% to ${p.high}%.`
  );
}
