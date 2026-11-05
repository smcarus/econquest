/**
 * Pre-registered backtests (Sam, 2026-11-05). A rule in the model register is marked passed or
 * failed only here, by a test whose rule, sample, outcome window and pass mark were written down and
 * hashed (validation/preregistered/*.json, hashes in manifest.json) before it ran. Changing any of
 * them is a new version of the test, visible in the manifest and in git history.
 *
 * Each test compares how often the signal was followed by what it points to (hit rate) with how
 * often the same outcome happened after any month or week in the same sample (base rate). It passes
 * only with enough cases, a lift of at least the stated points, and a one-sided binomial p-value
 * at or below the stated level. Fewer cases than the minimum = "too few cases to test".
 *
 * The data are read as the app pulls them: BIS monthly policy rates, the OECD leading indicator via
 * DBnomics (today's vintage), CFTC weekly positioning. Pure functions: the runner fetches.
 */
import { cliTurns } from './oecdCli';
import { targetIn } from '../data/inflationTargetHistory';
import type { CftcWeek } from './cftcPositioning';
import type { ValidationStatus } from '../data/modelRegister';

export type BacktestMethod = 'cli_turn_policy' | 'cftc_crowding' | 'taylor_gap';

export interface BacktestSpec {
  id: string;
  version: number;
  registeredOn: string;
  registeredBy: string;
  hypothesis: string;
  method: BacktestMethod;
  params: Record<string, number>;
  sample: { from: string; to?: string };
  passMark: { minCases: number; minLiftPts: number; maxPValue: number };
  knownLimits: string[];
}

export interface BacktestCase {
  where: string;
  when: string;
  what: string;
  hit: boolean;
  /** Chance of the same outcome after any period in this series (base rate), 0 to 1. */
  base: number;
}

export interface BacktestResult {
  id: string;
  specVersion: number;
  specHash: string;
  ranAt: string;
  status: Extract<ValidationStatus, 'passed' | 'failed' | 'too_few_cases'>;
  /** Plain-English verdict. */
  verdict: string;
  cases: number;
  hits: number;
  hitRatePct: number;
  baseRatePct: number;
  liftPts: number;
  pValue: number;
  span: { from: string; to: string };
  series: string[];
  data: string;
  sample: BacktestCase[];
}

/* ------------------------------------------------------------------ statistics */

function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

/** One-sided binomial tail P(X >= k) for X ~ Bin(n, p). */
export function binomialUpperTail(n: number, k: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let total = 0;
  for (let i = k; i <= n; i++) total += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  return Math.min(1, total);
}

/** Verdict from the cases and the pass mark fixed in the spec. */
export function judge(spec: BacktestSpec, cases: BacktestCase[]): Pick<BacktestResult, 'status' | 'verdict' | 'cases' | 'hits' | 'hitRatePct' | 'baseRatePct' | 'liftPts' | 'pValue'> {
  const n = cases.length;
  const hits = cases.filter((c) => c.hit).length;
  const base = n ? cases.reduce((s, c) => s + c.base, 0) / n : 0;
  const rate = n ? hits / n : 0;
  const pValue = n ? binomialUpperTail(n, hits, base) : 1;
  const r1 = (x: number) => Number(x.toFixed(1));
  const out = { cases: n, hits, hitRatePct: r1(rate * 100), baseRatePct: r1(base * 100), liftPts: r1((rate - base) * 100), pValue: Number(pValue.toPrecision(3)) };
  const m = spec.passMark;
  if (n < m.minCases) return { ...out, status: 'too_few_cases', verdict: `Too few cases to test: ${n} found, the test needs ${m.minCases}.` };
  const pass = out.liftPts >= m.minLiftPts && pValue <= m.maxPValue;
  const reading = `Followed ${hits} of ${n} times (${out.hitRatePct}%) against ${out.baseRatePct}% after any period: a lift of ${out.liftPts} points, p = ${out.pValue}.`;
  return pass
    ? { ...out, status: 'passed', verdict: `Passed. ${reading} The pass mark was a lift of ${m.minLiftPts} points or more with p at or below ${m.maxPValue}.` }
    : { ...out, status: 'failed', verdict: `Failed. ${reading} The pass mark was a lift of ${m.minLiftPts} points or more with p at or below ${m.maxPValue}.` };
}

/* ------------------------------------------------------------------ month helpers */

export const addMonths = (p: string, n: number): string => {
  const [y, m] = p.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

/** Splits a monthly series into unbroken runs of calendar months. */
export function monthlyRuns<T extends { period: string }>(pts: T[]): T[][] {
  const runs: T[][] = [];
  for (const p of pts) {
    const run = runs[runs.length - 1];
    if (run && addMonths(run[run.length - 1].period, 1) === p.period) run.push(p);
    else runs.push([p]);
  }
  return runs;
}

/* ------------------------------------------------------------------ CLI turn -> policy move */

/**
 * After each leading-indicator turn, dated when it could first be known (the turn month plus the
 * months that confirm it plus the publication lag), did the policy rate move the matching way
 * (peak -> cut, trough -> hike) within the window? Base rate: the share of all months in the same
 * span after which a move that way came within the window.
 */
export function cliTurnPolicyCases(
  spec: BacktestSpec,
  where: string,
  cli: { period: string; value: number }[],
  policy: { period: string; pct: number }[]
): BacktestCase[] {
  const { confirmMonths = 2, publicationLagMonths = 1, windowMonths = 6 } = spec.params;
  if (!cli.length || policy.length < 2) return [];
  const pct = new Map(policy.map((p) => [p.period, p.pct]));
  const first = policy[0].period;
  const last = policy[policy.length - 1].period;
  const moveIn = (m: string): number => {
    const a = pct.get(addMonths(m, -1));
    const b = pct.get(m);
    return a === undefined || b === undefined ? 0 : Math.sign(Number((b - a).toFixed(4)));
  };
  /** True / false when a move `dir` came in (from, from+window]; null when the window runs past the data. */
  const moved = (from: string, dir: number): boolean | null => {
    if (addMonths(from, windowMonths) > last || from < first) return null;
    for (let k = 1; k <= windowMonths; k++) if (moveIn(addMonths(from, k)) === dir) return true;
    return false;
  };
  const lo = spec.sample.from;
  const hi = spec.sample.to || '9999-12';
  const cliMonths = new Set(cli.map((p) => p.period));
  const baseFor = (dir: number) => {
    let n = 0;
    let yes = 0;
    for (const p of policy) {
      if (p.period < lo || p.period > hi || !cliMonths.has(p.period)) continue;
      const m = moved(p.period, dir);
      if (m === null) continue;
      n++;
      if (m) yes++;
    }
    return n ? yes / n : 0;
  };
  const base = { [-1]: baseFor(-1), [1]: baseFor(1) } as Record<number, number>;
  const out: BacktestCase[] = [];
  for (const run of monthlyRuns(cli)) {
    for (const t of cliTurns(run)) {
      const known = addMonths(t.month, confirmMonths + publicationLagMonths);
      if (known < lo || known > hi) continue;
      const dir = t.kind === 'peak' ? -1 : 1;
      const hit = moved(known, dir);
      if (hit === null) continue;
      out.push({ where, when: known, what: `${t.kind} in ${t.month}, known ${known}: ${dir < 0 ? 'cut' : 'hike'} within ${windowMonths} months?`, hit, base: base[dir] });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ Taylor gap -> policy move */

/**
 * Each month: rule rate = rStar + inflation + inflationWeight x (inflation - target), with the
 * inflation published by then (publicationLagMonths back) and the target in force that month
 * (src/data/inflationTargetHistory.ts). No output gap: the IMF's is annual and revised every
 * vintage. Policy more than bandPts above the rule = tight, below = loose. A call is the first
 * month of a run of the same reading. Hit: tight -> a cut, loose -> a hike, within windowMonths.
 * Base rate: the share of all months in the same span followed by a cut (hike) within the window.
 */
export function taylorGapCases(
  spec: BacktestSpec,
  iso3: string,
  inflation: { period: string; value: number }[],
  policy: { period: string; pct: number }[]
): BacktestCase[] {
  const { publicationLagMonths = 2, windowMonths = 6, bandPts = 1, rStar = 2, inflationWeight = 0.5 } = spec.params;
  if (!inflation.length || policy.length < 2) return [];
  const pct = new Map(policy.map((p) => [p.period, p.pct]));
  const cpi = new Map(inflation.map((p) => [p.period, p.value]));
  const last = policy[policy.length - 1].period;
  const moveIn = (m: string): number => {
    const a = pct.get(addMonths(m, -1));
    const b = pct.get(m);
    return a === undefined || b === undefined ? 0 : Math.sign(Number((b - a).toFixed(4)));
  };
  const moved = (from: string, dir: number): boolean | null => {
    if (addMonths(from, windowMonths) > last) return null;
    for (let k = 1; k <= windowMonths; k++) if (moveIn(addMonths(from, k)) === dir) return true;
    return false;
  };
  const lo = spec.sample.from;
  const hi = spec.sample.to || '9999-12';
  type Row = { month: string; reading: -1 | 0 | 1; gap: number; rule: number; target: number; infl: number; rate: number };
  const rows: Row[] = [];
  for (const p of policy) {
    if (p.period < lo || p.period > hi) continue;
    const t = targetIn(iso3, p.period);
    const infl = cpi.get(addMonths(p.period, -publicationLagMonths));
    if (!t || infl === undefined) continue;
    const rule = rStar + infl + inflationWeight * (infl - t.pct);
    const gap = p.pct - rule;
    rows.push({ month: p.period, reading: gap > bandPts ? 1 : gap < -bandPts ? -1 : 0, gap, rule, target: t.pct, infl, rate: p.pct });
  }
  const baseFor = (dir: number) => {
    let n = 0;
    let yes = 0;
    for (const r of rows) {
      const m = moved(r.month, dir);
      if (m === null) continue;
      n++;
      if (m) yes++;
    }
    return n ? yes / n : 0;
  };
  const base = { [-1]: baseFor(-1), [1]: baseFor(1) } as Record<number, number>;
  const out: BacktestCase[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.reading) continue;
    // First month of a run: the month before was a different reading, or not a consecutive month.
    const prev = rows[i - 1];
    if (prev && prev.reading === r.reading && addMonths(prev.month, 1) === r.month) continue;
    const want = r.reading === 1 ? -1 : 1;
    const hit = moved(r.month, want);
    if (hit === null) continue;
    out.push({
      where: iso3,
      when: r.month,
      what: `${r.reading === 1 ? 'tight' : 'loose'}: policy ${r.rate.toFixed(2)}% vs rule ${r.rule.toFixed(2)}% (inflation ${r.infl.toFixed(1)}%, target ${r.target}%): ${want < 0 ? 'cut' : 'hike'} within ${windowMonths} months?`,
      hit,
      base: base[want],
    });
  }
  return out;
}

/* ------------------------------------------------------------------ CFTC crowding -> unwind */

/**
 * Leveraged-fund net positioning as a share of open interest. A week is crowded long (short) when
 * it ranks at or above highPct (at or below lowPct) among the lookback weeks before it and itself:
 * only past weeks, no hindsight. An entry counts when the week before was not crowded that way and
 * no entry the same way was counted in the minGapWeeks before. Hit: the share comes back unwindPts
 * within windowWeeks. Base rate: the same move after any week with enough history.
 */
export function cftcCrowdingCases(spec: BacktestSpec, where: string, weeks: CftcWeek[]): BacktestCase[] {
  const { lookbackWeeks = 156, minLookbackWeeks = 52, highPct = 90, lowPct = 10, windowWeeks = 8, unwindPts = 3, minGapWeeks = 8 } = spec.params;
  const share = weeks.map((w) => (w.levNet / w.openInterest) * 100);
  const rank = (i: number): number | null => {
    if (i < minLookbackWeeks) return null;
    const past = share.slice(Math.max(0, i - lookbackWeeks), i + 1);
    return (past.filter((v) => v <= share[i]).length / past.length) * 100;
  };
  const lo = spec.sample.from;
  const hi = spec.sample.to || '9999-12-31';
  const inSample = (i: number) => weeks[i].date >= lo && weeks[i].date <= hi && i + windowWeeks < share.length && i >= minLookbackWeeks;
  const unwound = (i: number, dir: 1 | -1) => share.slice(i + 1, i + 1 + windowWeeks).some((v) => (dir === 1 ? v <= share[i] - unwindPts : v >= share[i] + unwindPts));
  const baseFor = (dir: 1 | -1) => {
    let n = 0;
    let yes = 0;
    for (let i = 0; i < share.length; i++) {
      if (!inSample(i)) continue;
      n++;
      if (unwound(i, dir)) yes++;
    }
    return n ? yes / n : 0;
  };
  const base = { 1: baseFor(1), [-1]: baseFor(-1) } as Record<number, number>;
  const out: BacktestCase[] = [];
  const lastEntry: Record<number, number> = { 1: -Infinity, [-1]: -Infinity };
  let prevRank = rank(minLookbackWeeks - 1);
  for (let i = minLookbackWeeks; i < share.length; i++) {
    const r = rank(i);
    if (r === null) continue;
    const dir: 1 | -1 | 0 = r >= highPct && (prevRank === null || prevRank < highPct) ? 1 : r <= lowPct && (prevRank === null || prevRank > lowPct) ? -1 : 0;
    prevRank = r;
    if (!dir || !inSample(i) || i - lastEntry[dir] < minGapWeeks) continue;
    lastEntry[dir] = i;
    out.push({ where, when: weeks[i].date, what: `entered crowded ${dir === 1 ? 'long' : 'short'} (${Math.round(r)}th percentile): back ${unwindPts} pts within ${windowWeeks} weeks?`, hit: unwound(i, dir), base: base[dir] });
  }
  return out;
}

/** Keeps the result file small: an even spread of the cases, oldest first. */
export function sampleCases(cases: BacktestCase[], max = 300): BacktestCase[] {
  const sorted = [...cases].sort((a, b) => a.when.localeCompare(b.when));
  if (sorted.length <= max) return sorted;
  const step = sorted.length / max;
  return Array.from({ length: max }, (_, i) => sorted[Math.floor(i * step)]);
}

export function spanOf(cases: BacktestCase[]): { from: string; to: string } {
  const w = cases.map((c) => c.when).sort();
  return { from: w[0] ?? '', to: w[w.length - 1] ?? '' };
}
