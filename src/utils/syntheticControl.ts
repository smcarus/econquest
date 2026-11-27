/**
 * SC1 "What happened after": the synthetic control method (Abadie, Diamond and Hainmueller 2010,
 * JASA 105(490)). A country that made a change in some year is compared with a "twin": a weighted
 * mix of other countries whose yearly path of one outcome matched it in the years before. The gap
 * between the country and its twin after the change is the estimate.
 *
 * The rules are fixed and shown on screen:
 * - Outcomes are yearly series from the saved histories (src/utils/officialHistory.ts). Only years
 *   before the As of year are read, as in the Precedent finder (src/utils/precedentFinder.ts).
 * - Years before: the ten years before the change year that the country has; at least eight.
 *   Years after: the change year (year 0) and up to five more, before the As of year.
 * - Donors: every other country with the outcome in every year used, minus the countries the caller
 *   names as having made the same kind of change in that window (they are not untreated).
 * - Weights are non-negative and sum to 1, chosen so the twin's path in the years before is as close
 *   as possible (least squares) to the country's, with a small fixed penalty on far-off donors so
 *   there is one answer when many mixes fit (Abadie and L'Hour 2021). Matching on the outcome path alone avoids a hidden
 *   choice of which other figures matter (Kaul, Klossner, Pfeifer and Schieler 2022, JBES 40(3)).
 * - Placebo checks: the same steps for every donor as if it had made the change. The p-value is the
 *   share of countries (the country and its donors) whose ratio of after-gap to before-gap (root mean
 *   square) is at least the country's own (Abadie, Diamond and Hainmueller 2010, section 2.2).
 *   Leave-one-out drops the largest donor and refits; the in-time placebo pretends the change came
 *   three years earlier.
 * - Missing, with the reason, when: fewer than eight years before, fewer than ten donors, the
 *   country's average before the change lies outside every donor's (no mix can match it), or the
 *   before-fit is loose (root mean square gap above half the country's own standard deviation in
 *   those years). One donor above 80% of the weight is flagged: it is a one-country comparison.
 *
 * Description, not advice: one country against a constructed comparison. Not validated until the
 * pre-registered false-alarm test (docs/validation/preregistered/synthetic_control.json) passes.
 *
 * Pure and browser-safe; deterministic (the same inputs always give the same answer).
 */

export const SYNTH_METHOD_VERSION = 'synth-v1';
export const PRE_YEARS = 10;
export const MIN_PRE_YEARS = 8;
export const POST_YEARS = 5;
export const MIN_DONORS = 10;
export const FIT_LIMIT_SD = 0.5;
export const DOMINANT_WEIGHT = 0.8;
export const IN_TIME_SHIFT = 3;

export const SYNTH_OUTCOMES = ['cpi_imf', 'gdp_growth', 'debt_gdp', 'primary_balance', 'current_account', 'reserves_months', 'currency_change'] as const;
export type SynthOutcome = (typeof SYNTH_OUTCOMES)[number];

/** Where each outcome comes from (series ids in src/utils/officialHistory.ts). */
export const SYNTH_SOURCES: Record<SynthOutcome, string> = {
  cpi_imf: 'IMF WEO (PCPIPCH)',
  gdp_growth: 'IMF WEO (NGDP_RPCH)',
  debt_gdp: 'IMF WEO (GGXWDG_NGDP)',
  primary_balance: 'IMF Fiscal Monitor (GGXONLB_G01_GDP_PT)',
  current_account: 'World Bank (BN.CAB.XOKA.GD.ZS)',
  reserves_months: 'World Bank (FI.RES.TOTL.MO)',
  currency_change: 'World Bank (PA.NUS.FCRF), yearly % change of local currency per US dollar',
};

export function parseOutcome(raw: unknown): SynthOutcome {
  const s = String(raw ?? '');
  return (SYNTH_OUTCOMES as readonly string[]).includes(s) ? (s as SynthOutcome) : 'cpi_imf';
}

/** Yearly values of one outcome per country. */
export type YearValues = Map<number, number>;

export interface SynthHistory {
  iso3: string;
  name: string;
  series: Record<string, { points: Array<{ date: string; value: number }> } | undefined>;
}

/** One outcome's yearly values from a saved history, years before lastYear only. */
export function outcomeYears(h: SynthHistory, outcome: SynthOutcome, lastYear: number): YearValues {
  const read = (id: string): YearValues => {
    const out: YearValues = new Map();
    for (const p of h.series[id]?.points || []) {
      const y = Number(p.date.slice(0, 4));
      if (Number.isInteger(y) && y < lastYear && Number.isFinite(p.value)) out.set(y, p.value);
    }
    return out;
  };
  if (outcome !== 'currency_change') return read(outcome);
  const fx = read('fx_lcu_usd');
  const out: YearValues = new Map();
  for (const [y, v] of fx) {
    const prev = fx.get(y - 1);
    if (prev !== undefined && prev > 0 && v > 0) out.set(y, (v / prev - 1) * 100);
  }
  return out;
}

const round = (v: number, d = 2) => Number(v.toFixed(d));
const rms = (xs: number[]) => (xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : 0);

/** Solve M x = r by Gaussian elimination with partial pivoting; null when M is singular. */
function solve(M: number[][], r: number[]): number[] | null {
  const k = r.length;
  const a = M.map((row, i) => [...row, r[i]]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let i = c + 1; i < k; i++) if (Math.abs(a[i][c]) > Math.abs(a[piv][c])) piv = i;
    if (Math.abs(a[piv][c]) < 1e-12) return null;
    [a[c], a[piv]] = [a[piv], a[c]];
    for (let i = c + 1; i < k; i++) {
      const f = a[i][c] / a[c][c];
      if (f !== 0) for (let j = c; j <= k; j++) a[i][j] -= f * a[c][j];
    }
  }
  const x = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = a[i][k];
    for (let j = i + 1; j < k; j++) s -= a[i][j] * x[j];
    x[i] = s / a[i][i];
  }
  return x;
}

/**
 * Weights on the simplex minimising 1/2 ||y - X w||^2 + sum_j linear_j w_j, X given as columns (one
 * per donor, each the same length as y). The sum-to-one rule is added as one heavily weighted extra
 * row, then the non-negative problem is solved exactly with the Lawson and Hanson (1974) active-set
 * method, extended for the linear term; the result is rescaled to sum to exactly 1. Ties go to the
 * first column, so the answer is deterministic.
 */
export function simplexLeastSquares(y: number[], cols: number[][], opts: { maxIter?: number; tol?: number; linear?: number[] } = {}): { w: number[]; iterations: number } {
  const n = cols.length;
  const T = y.length;
  if (n === 0) return { w: [], iterations: 0 };
  if (n === 1) return { w: [1], iterations: 0 };
  const maxIter = opts.maxIter ?? 30 * n;
  const scale = Math.max(1, ...y.map(Math.abs), ...cols.map((c) => Math.max(...c.map(Math.abs))));
  const big = 100 * scale;
  const A = cols.map((c) => [...c, big]);
  const b = [...y, big];
  const lin = opts.linear || new Array(n).fill(0);
  const Atb = A.map((c, j) => c.reduce((s, v, t) => s + v * b[t], 0) - lin[j]);
  const dot = (i: number, j: number) => A[i].reduce((s, v, t) => s + v * A[j][t], 0);
  const qCache = new Map<number, number>();
  const Q = (i: number, j: number) => {
    const key = i < j ? i * n + j : j * n + i;
    let v = qCache.get(key);
    if (v === undefined) {
      v = dot(i, j);
      qCache.set(key, v);
    }
    return v;
  };
  const tol = (opts.tol ?? 1e-10) * Math.max(1, ...Atb.map(Math.abs));
  const w = new Array(n).fill(0);
  const passive: number[] = [];
  const inP = new Array(n).fill(false);
  let it = 0;
  const negGrad = (j: number) => Atb[j] - passive.reduce((s, i) => s + Q(j, i) * w[i], 0);
  while (it < maxIter) {
    let best = -1;
    let bestG = tol;
    for (let j = 0; j < n; j++) {
      if (inP[j]) continue;
      const g = negGrad(j);
      if (g > bestG) {
        bestG = g;
        best = j;
      }
    }
    if (best < 0) break;
    passive.push(best);
    inP[best] = true;
    for (;;) {
      it++;
      const s = solve(
        passive.map((i) => passive.map((j) => Q(i, j))),
        passive.map((i) => Atb[i]),
      );
      if (!s) {
        // The newest column adds nothing the others do not already give: drop it and stop adding.
        inP[passive.pop()!] = false;
        it = maxIter;
        break;
      }
      if (s.every((v) => v > 0)) {
        passive.forEach((i, k) => (w[i] = s[k]));
        break;
      }
      let alpha = Infinity;
      passive.forEach((i, k) => {
        if (s[k] <= 0) alpha = Math.min(alpha, w[i] / (w[i] - s[k]));
      });
      passive.forEach((i, k) => (w[i] = w[i] + alpha * (s[k] - w[i])));
      for (let k = passive.length - 1; k >= 0; k--) {
        const i = passive[k];
        if (w[i] <= 1e-14) {
          w[i] = 0;
          inP[i] = false;
          passive.splice(k, 1);
        }
      }
      if (!passive.length || it >= maxIter) break;
    }
  }
  const sum = w.reduce((s, v) => s + v, 0);
  return { w: sum > 0 ? w.map((v) => v / sum) : new Array(n).fill(1 / n), iterations: it };
}


interface Fit {
  weights: number[];
  preGap: number[];
  postGap: number[];
  preRmspe: number;
  postRmspe: number;
}

/**
 * Penalised synthetic control (Abadie and L'Hour 2021, JASA 116(536)): with more donors than years
 * many mixes fit the years before equally well, so a small cost on each donor's own distance from the
 * country picks the mix of the closest donors, one answer only. Fixed in advance, not tuned.
 */
export const PENALTY = 0.1;

function fit(target: number[], targetPost: number[], donorPre: number[][], donorPost: number[][]): Fit {
  const linear = donorPre.map((c) => (PENALTY * c.reduce((s, v, t) => s + (v - target[t]) ** 2, 0)) / 2);
  const { w } = simplexLeastSquares(target, donorPre, { linear });
  const twin = (cols: number[][], len: number) => Array.from({ length: len }, (_, t) => cols.reduce((s, c, j) => s + w[j] * c[t], 0));
  const preTwin = twin(donorPre, target.length);
  const postTwin = twin(donorPost, targetPost.length);
  const preGap = target.map((v, t) => v - preTwin[t]);
  const postGap = targetPost.map((v, t) => v - postTwin[t]);
  return { weights: w, preGap, postGap, preRmspe: rms(preGap), postRmspe: rms(postGap) };
}

export type SynthMissingReason = 'no_history' | 'too_few_pre_years' | 'no_post_years' | 'too_few_donors' | 'outside_range' | 'poor_fit';

export interface SynthYear {
  /** Years from the change; 0 is the change year. */
  k: number;
  year: number;
  actual: number;
  twin: number;
  gap: number;
}

export interface SynthResult {
  methodVersion: string;
  iso3: string;
  outcome: SynthOutcome;
  eventYear: number;
  asOf: string;
  lastYear: number;
  missing?: { reason: SynthMissingReason; detail?: string };
  preYears: number[];
  postYears: number[];
  /** Every year shown, before and after, country against twin. */
  path: SynthYear[];
  /** Donors with a weight of at least 0.1%, largest first. */
  weights: Array<{ iso3: string; name: string; weight: number }>;
  donorCount: number;
  excluded: string[];
  preRmspe: number | null;
  postRmspe: number | null;
  /** Root mean square gap before the change as a share of the country's own standard deviation then. */
  fitRatio: number | null;
  dominantDonor: string | null;
  /** Placebo in space: country's after/before ratio ranked among its donors'. */
  placebo: { p: number; rank: number; runs: number; paths: Array<{ iso3: string; gaps: number[] }> } | null;
  leaveOneOut: { dropped: string; gaps: number[] } | null;
  inTime: { fakeYear: number; gaps: number[]; ratio: number } | null;
}

/**
 * The twin for one country, outcome and change year, using the saved histories. `exclude` names
 * countries with the same kind of change in the window (from the event finder).
 */
export function syntheticControl(input: {
  iso3: string;
  eventYear: number;
  asOf: string;
  outcome: SynthOutcome;
  histories: SynthHistory[];
  exclude?: string[];
  placebo?: boolean;
}): SynthResult {
  const { iso3, eventYear: E, asOf, outcome } = input;
  const lastYear = Number(asOf.slice(0, 4));
  const exclude = [...new Set((input.exclude || []).filter((c) => c !== iso3))].sort();
  const base: SynthResult = {
    methodVersion: SYNTH_METHOD_VERSION, iso3, outcome, eventYear: E, asOf, lastYear, preYears: [], postYears: [], path: [], weights: [],
    donorCount: 0, excluded: exclude, preRmspe: null, postRmspe: null, fitRatio: null, dominantDonor: null, placebo: null, leaveOneOut: null, inTime: null,
  };
  const own = input.histories.find((h) => h.iso3 === iso3);
  if (!own) return { ...base, missing: { reason: 'no_history' } };
  const ownY = outcomeYears(own, outcome, lastYear);
  const preYears = Array.from({ length: PRE_YEARS }, (_, i) => E - PRE_YEARS + i).filter((y) => ownY.has(y));
  if (preYears.length < MIN_PRE_YEARS) return { ...base, preYears, missing: { reason: 'too_few_pre_years', detail: `${preYears.length} of ${PRE_YEARS}` } };
  const postYears = Array.from({ length: POST_YEARS + 1 }, (_, i) => E + i).filter((y) => y < lastYear && ownY.has(y));
  if (!postYears.length) return { ...base, preYears, missing: { reason: 'no_post_years' } };
  const used = [...preYears, ...postYears];

  const skip = new Set([iso3, ...exclude]);
  const donors = input.histories
    .filter((h) => !skip.has(h.iso3))
    .map((h) => ({ h, y: outcomeYears(h, outcome, lastYear) }))
    .filter((d) => used.every((yr) => d.y.has(yr)))
    .sort((a, b) => (a.h.iso3 < b.h.iso3 ? -1 : a.h.iso3 > b.h.iso3 ? 1 : 0));
  const withDonors = { ...base, preYears, postYears, donorCount: donors.length };
  if (donors.length < MIN_DONORS) return { ...withDonors, missing: { reason: 'too_few_donors', detail: `${donors.length} of ${MIN_DONORS}` } };

  const target = preYears.map((y) => ownY.get(y)!);
  const targetPost = postYears.map((y) => ownY.get(y)!);
  const pre = donors.map((d) => preYears.map((y) => d.y.get(y)!));
  const post = donors.map((d) => postYears.map((y) => d.y.get(y)!));

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ownMean = mean(target);
  const donorMeans = pre.map(mean);
  if (ownMean > Math.max(...donorMeans) || ownMean < Math.min(...donorMeans)) {
    return { ...withDonors, missing: { reason: 'outside_range', detail: ownMean > Math.max(...donorMeans) ? 'above' : 'below' } };
  }

  const main = fit(target, targetPost, pre, post);
  const sd = Math.sqrt(target.reduce((s, x) => s + (x - ownMean) ** 2, 0) / target.length);
  const fitRatio = sd > 0 ? main.preRmspe / sd : main.preRmspe === 0 ? 0 : Infinity;
  const ranked = donors.map((d, j) => ({ iso3: d.h.iso3, name: d.h.name, weight: main.weights[j] })).sort((a, b) => b.weight - a.weight || (a.iso3 < b.iso3 ? -1 : 1));
  const weights = ranked.filter((r) => r.weight >= 0.001).map((r) => ({ ...r, weight: round(r.weight, 3) }));
  const path: SynthYear[] = [
    ...preYears.map((y, t) => ({ k: y - E, year: y, actual: round(target[t]), twin: round(target[t] - main.preGap[t]), gap: round(main.preGap[t]) })),
    ...postYears.map((y, t) => ({ k: y - E, year: y, actual: round(targetPost[t]), twin: round(targetPost[t] - main.postGap[t]), gap: round(main.postGap[t]) })),
  ];
  const result: SynthResult = {
    ...withDonors,
    path,
    weights,
    preRmspe: round(main.preRmspe, 3),
    postRmspe: round(main.postRmspe, 3),
    fitRatio: Number.isFinite(fitRatio) ? round(fitRatio, 3) : null,
    dominantDonor: ranked[0].weight > DOMINANT_WEIGHT ? ranked[0].iso3 : null,
  };
  if (!(fitRatio <= FIT_LIMIT_SD)) return { ...result, missing: { reason: 'poor_fit', detail: Number.isFinite(fitRatio) ? String(round(fitRatio, 2)) : 'flat' } };

  if (input.placebo !== false) {
    // Placebo in space: each donor against the other donors.
    const ratio = (f: Fit) => (f.preRmspe > 0 ? f.postRmspe / f.preRmspe : f.postRmspe > 0 ? Infinity : 0);
    const own = ratio(main);
    const paths: Array<{ iso3: string; gaps: number[] }> = [];
    let atLeast = 1;
    for (let j = 0; j < donors.length; j++) {
      const otherPre = pre.filter((_, i) => i !== j);
      const otherPost = post.filter((_, i) => i !== j);
      const f = fit(pre[j], post[j], otherPre, otherPost);
      if (ratio(f) >= own) atLeast += 1;
      paths.push({ iso3: donors[j].h.iso3, gaps: [...f.preGap, ...f.postGap].map((g) => round(g)) });
    }
    result.placebo = { p: round(atLeast / (donors.length + 1), 3), rank: atLeast, runs: donors.length + 1, paths };

    // Leave-one-out: drop the largest donor.
    const top = donors.findIndex((d) => d.h.iso3 === ranked[0].iso3);
    const loo = fit(target, targetPost, pre.filter((_, i) => i !== top), post.filter((_, i) => i !== top));
    result.leaveOneOut = { dropped: ranked[0].iso3, gaps: loo.postGap.map((g) => round(g)) };

    // In time: pretend the change came three years earlier; the gaps in the three years before the real change should be small.
    const fake = E - IN_TIME_SHIFT;
    const fakePre = Array.from({ length: PRE_YEARS }, (_, i) => fake - PRE_YEARS + i).filter((y) => ownY.has(y));
    const fakePost = Array.from({ length: IN_TIME_SHIFT }, (_, i) => fake + i).filter((y) => ownY.has(y));
    const fakeDonors = donors.filter((d) => [...fakePre, ...fakePost].every((y) => d.y.has(y)));
    if (fakePre.length >= MIN_PRE_YEARS && fakePost.length === IN_TIME_SHIFT && fakeDonors.length >= MIN_DONORS) {
      const f = fit(
        fakePre.map((y) => ownY.get(y)!),
        fakePost.map((y) => ownY.get(y)!),
        fakeDonors.map((d) => fakePre.map((y) => d.y.get(y)!)),
        fakeDonors.map((d) => fakePost.map((y) => d.y.get(y)!)),
      );
      result.inTime = { fakeYear: fake, gaps: f.postGap.map((g) => round(g)), ratio: round(f.preRmspe > 0 ? f.postRmspe / f.preRmspe : 0, 3) };
    }
  }
  return result;
}

/** The gap k years after the change, or null when that year is not in the result. */
export function gapAt(r: SynthResult, k: number): number | null {
  return r.path.find((p) => p.k === k)?.gap ?? null;
}
