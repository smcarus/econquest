/**
 * Charts from Council chat. A question such as "chart Brazil's policy rate against inflation and
 * test whether one leads the other" becomes a chart request (which series, which tests); the chat
 * fetches the series the app holds, and computeChart() draws the lines and runs the tests with
 * src/utils/stats.ts. The result is also an agent answer (the Chart Agent), so the summary agent can
 * talk about it and follow-up questions can ask about the results. Only real series are charted:
 * a series the app does not hold is listed as Missing with the reason.
 */
import type { LiveWatchlistItem } from '../types/council';
import {
  adf,
  alignPair,
  commonFreq,
  crossCorrelation,
  fmtP,
  granger,
  hpFilter,
  hpLambda,
  ols,
  pearson,
  periodsPerYear,
  rollingCorrelation,
  sampleCaution,
  strengthWord,
  toFreq,
  transform,
  TRANSFORM_LABEL,
  type Freq,
  type Pair,
  type Point,
  type Transform,
} from './stats';

export type ChartTest = 'correlation' | 'regression' | 'leadlag' | 'granger' | 'adf' | 'hp' | 'rolling';

export const TEST_TITLE: Record<ChartTest, string> = {
  correlation: 'Correlation',
  regression: 'Regression',
  leadlag: 'Which moves first (lead/lag)',
  granger: 'Granger causality',
  adf: 'Stationarity (ADF test)',
  hp: 'Trend and cycle (HP filter)',
  rolling: 'Is the relationship stable? (rolling correlation)',
};

export interface ChartSeriesRef {
  /** Null for world series (commodity prices). */
  iso3: string | null;
  countryName: string | null;
  id: string;
  /** Tried when the first series is missing (monthly inflation falls back to the IMF annual figure). */
  fallback?: string;
  label: string;
}

export interface ChartRequest {
  series: ChartSeriesRef[];
  tests: ChartTest[];
  transform: Transform;
  /** Why the planner made a chart, in words. */
  why: string;
  /** Notes for the reader (countries left out, and so on). */
  notes: string[];
}

/** A series as the app's /api/series routes return it (only the fields the chart needs). */
export interface FetchedSeries {
  id: string;
  label: string;
  unit: string;
  freq: string;
  source: string;
  points: Point[];
}

export interface ChartLine {
  key: string;
  label: string;
  unit: string;
  axis: 'left' | 'right';
  source: string;
  points: Point[];
  dashed?: boolean;
}

export interface ChartTestResult {
  test: ChartTest;
  title: string;
  reading: string;
  /** label, value: what the reading rests on. */
  figures: Array<{ label: string; value: string }>;
  caution?: string;
  /** Lead/lag table or rolling correlation, for the small chart under the test. */
  lags?: Array<{ lag: number; r: number; p: number }>;
  rolling?: Point[];
}

export interface ChartResult {
  title: string;
  freq: Freq;
  transform: Transform;
  lines: ChartLine[];
  scatter?: { xLabel: string; yLabel: string; pairs: Pair[]; fit?: { a: number; b: number } };
  tests: ChartTestResult[];
  missing: string[];
  notes: string[];
  first?: string;
  last?: string;
}

// ---------------------------------------------------------------------------------------------
// Reading a chart request out of a question

/** Words for each series, most specific first. World series carry no country. */
const SERIES_WORDS: Array<{ re: RegExp; id: string; label: string; world?: boolean; fallback?: string }> = [
  { re: /external debt/i, id: 'external_debt', label: 'External debt' },
  { re: /output gap/i, id: 'output_gap', label: 'Output gap' },
  { re: /current account/i, id: 'current_account', label: 'Current account' },
  { re: /primary (?:fiscal )?balance|fiscal balance|budget balance|deficit/i, id: 'primary_balance', label: 'Primary balance' },
  { re: /(?:government |public )?debt(?:[- ]to[- ]gdp| ratio)?/i, id: 'debt_gdp', label: 'Government debt' },
  { re: /policy rate|interest rates?|central bank rate|selic|repo rate|key rate/i, id: 'policy_rate', label: 'Policy rate' },
  { re: /\binflation\b|\bcpi\b|consumer prices/i, id: 'cpi_monthly', fallback: 'cpi_imf', label: 'Inflation' },
  { re: /leading indicator|\bcli\b/i, id: 'cli', label: 'OECD leading indicator' },
  { re: /10[- ]?y(?:ea)?r?(?: bond)? yields?|bond yields?|\byields?\b/i, id: 'yield_10y', label: '10Y government bond yield' },
  { re: /(?:real )?gdp growth|\bgrowth\b|\bgdp\b/i, id: 'gdp_growth', label: 'Real GDP growth' },
  { re: /\breserves\b/i, id: 'reserves_months', label: 'Reserves' },
  { re: /exchange rate|\bcurrency\b|\bfx\b/i, id: 'fx_per_usd', label: 'Exchange rate' },
  { re: /positioning|\bcftc\b/i, id: 'cftc_lev_net', label: 'Leveraged funds positioning (CFTC)' },
  { re: /news tone|\btone\b/i, id: 'gdelt_tone', label: 'News tone (GDELT)' },
  { re: /\bbrent\b|\boil\b/i, id: 'commodity_pink_sheet_crude_brent', label: 'Brent crude', world: true },
  { re: /\bgold\b/i, id: 'commodity_pink_sheet_gold', label: 'Gold', world: true },
  { re: /\bcopper\b/i, id: 'commodity_pink_sheet_copper', label: 'Copper', world: true },
  { re: /\bwheat\b/i, id: 'commodity_pink_sheet_wheat_us_hrw', label: 'Wheat (US HRW)', world: true },
  { re: /natural gas|\blng\b/i, id: 'commodity_pink_sheet_ngas_eur', label: 'Natural gas, Europe', world: true },
  { re: /soybeans?/i, id: 'commodity_pink_sheet_soybeans', label: 'Soybeans', world: true },
];

const CHART_WORDS = /\b(chart|plot|graph|draw|visuali[sz]e|scatter)\b/i;
const TEST_WORDS: Array<[RegExp, ChartTest]> = [
  [/correlat|move together|co-?move/i, 'correlation'],
  [/regress|sensitiv|elasticit|\bbeta\b|scatter/i, 'regression'],
  [/lead.?lag|leads? or lags|which (?:one )?leads|moves? first|comes? first/i, 'leadlag'],
  [/granger|helps? (?:to )?predict|predictive/i, 'granger'],
  [/stationar|unit root|\badf\b|dickey/i, 'adf'],
  [/\bhp\b|hodrick|prescott|trend and cycle|cycle and trend|(?:gap from|against|above|below) (?:its )?trend|detrend/i, 'hp'],
  [/\bstable\b|rolling|still hold|over time|structural break/i, 'rolling'],
];
const TRANSFORM_WORDS: Array<[RegExp, Transform]> = [
  [/year[- ]on[- ]year|\by\/y\b|\byoy\b|annual change/i, 'yoy'],
  [/z[- ]?scores?|standardi[sz]/i, 'zscore'],
  [/\bindex(ed)?\b|rebased/i, 'index100'],
  [/\bchanges?\b|first difference/i, 'change'],
];

/** The series a question names, in the order it names them; each phrase counts once. */
export function seriesInQuestion(question: string): Array<(typeof SERIES_WORDS)[number]> {
  let rest = question;
  const hits: Array<{ at: number; w: (typeof SERIES_WORDS)[number] }> = [];
  for (const w of SERIES_WORDS) {
    const re = new RegExp(w.re.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest))) {
      if (!hits.some((h) => h.w.id === w.id)) hits.push({ at: m.index, w });
      // Blank the phrase out so "debt to GDP" is not also read as GDP growth.
      rest = rest.slice(0, m.index) + ' '.repeat(m[0].length) + rest.slice(m.index + m[0].length);
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.w);
}

/** The tests a question asks for. */
export function testsInQuestion(question: string): ChartTest[] {
  return TEST_WORDS.filter(([re]) => re.test(question)).map(([, t]) => t);
}

/** Most series one chart draws. */
export const MAX_LINES = 4;

/**
 * A chart request when the question asks for a chart or a statistical test on named series; null
 * otherwise. `countries` are the plan's countries (named in the question, or the whole watchlist).
 */
export function chartRequest(question: string, countries: LiveWatchlistItem[], namedCountries: boolean): ChartRequest | null {
  const asked = testsInQuestion(question);
  const wantsChart = CHART_WORDS.test(question);
  let words = seriesInQuestion(question);
  if (!wantsChart && !asked.length) return null;
  if (!words.length) {
    // "Chart Brazil" with no series named: the monetary picture, the most asked-for pair.
    if (!wantsChart) return null;
    words = SERIES_WORDS.filter((w) => w.id === 'policy_rate' || w.id === 'cpi_monthly');
  }
  const notes: string[] = [];
  const own = words.filter((w) => !w.world);
  const world = words.filter((w) => w.world);
  // Without a named country, a per-country series is drawn for the first watchlist country only.
  const pool = namedCountries ? countries : countries.slice(0, 1);
  if (!namedCountries && own.length && countries.length > 1) notes.push(`No country was named, so the chart shows ${pool[0]?.countryName ?? 'the first watchlist country'}; name others to compare them`);
  const series: ChartSeriesRef[] = [];
  if (own.length === 1 && pool.length > 1) {
    // One series across countries: Brazil's and Mexico's policy rates on one chart.
    for (const c of pool.slice(0, MAX_LINES - world.length)) series.push({ iso3: c.iso3, countryName: c.countryName, id: own[0].id, fallback: own[0].fallback, label: `${c.countryName}: ${own[0].label}` });
    if (pool.length > MAX_LINES - world.length) notes.push(`Only the first ${MAX_LINES - world.length} countries fit on one chart`);
  } else if (own.length) {
    const c = pool[0];
    if (!c) return null;
    if (pool.length > 1) notes.push(`Several series for several countries do not fit one chart, so this shows ${c.countryName}; ask again for the others`);
    for (const w of own) series.push({ iso3: c.iso3, countryName: c.countryName, id: w.id, fallback: w.fallback, label: `${c.countryName}: ${w.label}` });
  }
  for (const w of world) series.push({ iso3: null, countryName: null, id: w.id, label: w.label });
  if (series.length > MAX_LINES) notes.push(`Only ${MAX_LINES} series fit on one chart; the rest were left out`);
  const kept = series.slice(0, MAX_LINES);
  if (!kept.length) return null;
  const tests = defaultTests(asked, kept.length);
  // Without the word chart, only make one when a test can actually run on what was named.
  if (!wantsChart && !tests.length) return null;
  const tf = TRANSFORM_WORDS.find(([re]) => re.test(question))?.[1] ?? 'level';
  const why = wantsChart ? 'the question asks for a chart' : `the question asks for ${asked.map((t) => TEST_TITLE[t].toLowerCase()).join(', ')}`;
  return { series: kept, tests, transform: tf, why, notes };
}

/** With two series, correlation and lead/lag come by default; tests that need two series drop with one. */
function defaultTests(asked: ChartTest[], lines: number): ChartTest[] {
  const pairTests: ChartTest[] = ['correlation', 'regression', 'leadlag', 'granger', 'rolling'];
  const set = new Set<ChartTest>(asked);
  if (lines >= 2 && !asked.some((t) => pairTests.includes(t))) {
    set.add('correlation');
    set.add('leadlag');
  }
  if (lines < 2) for (const t of pairTests) set.delete(t);
  const order: ChartTest[] = ['correlation', 'regression', 'leadlag', 'granger', 'rolling', 'adf', 'hp'];
  return order.filter((t) => set.has(t));
}

/** A follow-up about the last chart keeps its series and adds any tests it asks for. */
export function carryChart(question: string, prev: ChartRequest, countries?: LiveWatchlistItem[]): ChartRequest {
  const more = testsInQuestion(question);
  const tf = TRANSFORM_WORDS.find(([re]) => re.test(question))?.[1] ?? prev.transform;
  let series = prev.series;
  const why = countries?.length ? 'the same chart as your last question, for the countries this one names' : 'carried over from your last question (the same chart)';
  if (countries?.length) {
    const own = prev.series.filter((s) => s.iso3);
    const world = prev.series.filter((s) => !s.iso3);
    const oneSeries = own.length > 0 && own.every((s) => s.id === own[0].id);
    const base = (s: ChartSeriesRef) => s.label.replace(/^[^:]+:\s*/, '');
    const swapped: ChartSeriesRef[] = oneSeries && own.length > 1
      ? countries.slice(0, MAX_LINES - world.length).map((c) => ({ ...own[0], iso3: c.iso3, countryName: c.countryName, label: `${c.countryName}: ${base(own[0])}` }))
      : own.map((s) => ({ ...s, iso3: countries[0].iso3, countryName: countries[0].countryName, label: `${countries[0].countryName}: ${base(s)}` }));
    series = [...swapped, ...world].slice(0, MAX_LINES);
  }
  return { ...prev, series, tests: defaultTests([...prev.tests, ...more], series.length), transform: tf, why, notes: [] };
}

// ---------------------------------------------------------------------------------------------
// Drawing and testing

const r2 = (v: number) => v.toFixed(2);
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

function asFreq(f: string): Freq {
  return f === 'daily' || f === 'weekly' || f === 'monthly' || f === 'quarterly' || f === 'annual' ? f : 'annual';
}

/** "monthly" → "months" for lag wording. */
function unitWord(freq: Freq, n: number): string {
  const w = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', annual: 'year' }[freq];
  return `${n} ${w}${n === 1 ? '' : 's'}`;
}

/**
 * The chart and its tests. `fetched` lines up with req.series: a series, or the reason it is missing.
 * Lines are put on their common (coarsest) frequency so they share an axis and the tests compare
 * like with like.
 */
export function computeChart(req: ChartRequest, fetched: Array<FetchedSeries | { reason: string }>): ChartResult {
  const missing: string[] = [];
  const have: Array<{ ref: ChartSeriesRef; s: FetchedSeries }> = [];
  req.series.forEach((ref, i) => {
    const f = fetched[i];
    if (f && 'points' in f && f.points.length) have.push({ ref, s: f });
    else missing.push(`${ref.label}: Missing (${(f && 'reason' in f && f.reason) || 'no data'})`);
  });
  const freq = have.length ? commonFreq(have.map((h) => h.s.points.map((p) => ({ date: p.date, value: p.value })))) : 'annual';
  // A series stored at a finer frequency than its dates show (e.g. "per pull") still lines up by date.
  const units: string[] = [];
  const lines: ChartLine[] = have.map(({ ref, s }, i) => {
    const onFreq = toFreq(s.points, freq);
    const pts = transform(onFreq, req.transform, freq);
    const unit = req.transform === 'level' ? s.unit : req.transform === 'yoy' ? '% y/y' : req.transform === 'zscore' ? 'std. dev.' : req.transform === 'index100' ? 'index' : s.unit;
    if (!units.includes(unit)) units.push(unit);
    const label = ref.countryName && !s.label.includes(ref.countryName) ? `${ref.countryName}: ${s.label}` : s.label;
    return { key: `s${i}`, label, unit, axis: units.indexOf(unit) === 0 ? 'left' : 'right', source: s.source, points: pts };
  });
  const notes = [...req.notes];
  if (units.length > 2) notes.push(`The series have ${units.length} different units, so all but the first share the right-hand axis; ask for z-scores to compare their shapes`);
  if (req.transform !== 'level') notes.push(`Shown as: ${TRANSFORM_LABEL[req.transform].toLowerCase()}`);
  const allDates = lines.flatMap((l) => l.points.map((p) => p.date)).sort();
  const title = lines.length ? lines.map((l) => l.label).join(' vs ') : req.series.map((s) => s.label).join(' vs ');
  const out: ChartResult = { title, freq, transform: req.transform, lines, tests: [], missing, notes, first: allDates[0], last: allDates[allDates.length - 1] };

  const [a, b] = lines;
  const pair = a && b ? alignPair(a.points, b.points, freq) : null;
  const pairs = pair?.pairs ?? [];
  const span = pairs.length ? `${pairs[0].date} to ${pairs[pairs.length - 1].date}, ${pairs.length} ${freq} points` : '';
  const caution = sampleCaution(pairs.length, freq) ?? undefined;
  const fail = (test: ChartTest, why: string) => out.tests.push({ test, title: TEST_TITLE[test], reading: `Not run: ${why}`, figures: [] });

  for (const test of req.tests) {
    if (['correlation', 'regression', 'leadlag', 'granger', 'rolling'].includes(test) && (!a || !b)) {
      fail(test, 'it needs two series and the chart has fewer');
      continue;
    }
    if (test === 'correlation') {
      const c = pearson(pairs.map((p) => p.x), pairs.map((p) => p.y));
      if ('error' in c) fail(test, c.error);
      else
        out.tests.push({
          test,
          title: TEST_TITLE[test],
          reading: `${a.label} and ${b.label} show ${strengthWord(c.r)} ${c.r >= 0 ? 'positive' : 'negative'} correlation: r = ${r2(c.r)} (${fmtP(c.p)}, ${span}). Correlation is not causation, and two trending series can correlate by accident.`,
          figures: [
            { label: 'Correlation (r)', value: r2(c.r) },
            { label: 'p-value', value: fmtP(c.p).replace('p = ', '').replace('p ', '') },
            { label: 'Points', value: String(c.n) },
          ],
          caution,
        });
    }
    if (test === 'regression') {
      const reg = ols(pairs.map((p) => p.y), pairs.map((p) => [p.x]));
      if ('error' in reg) fail(test, reg.error);
      else {
        out.scatter = { xLabel: a.label, yLabel: b.label, pairs, fit: { a: reg.coef[0], b: reg.coef[1] } };
        out.tests.push({
          test,
          title: TEST_TITLE[test],
          reading: `Regressing ${b.label} on ${a.label}: each 1 ${a.unit} more in ${a.label} goes with ${fmt(reg.coef[1])} ${b.unit} in ${b.label} (t = ${r2(reg.t[1])}, ${fmtP(reg.p[1])}); R² = ${r2(reg.r2)} over ${reg.n} points. Plain OLS: with trending series the t-statistic overstates confidence.`,
          figures: [
            { label: 'Slope', value: fmt(reg.coef[1]) },
            { label: 'Intercept', value: fmt(reg.coef[0]) },
            { label: 't-statistic', value: r2(reg.t[1]) },
            { label: 'R²', value: r2(reg.r2) },
            { label: 'Points', value: String(reg.n) },
          ],
          caution,
        });
      }
    }
    if (test === 'leadlag') {
      const max = Math.max(1, Math.min(Math.round(periodsPerYear(freq) * 1.5), Math.floor(pairs.length / 4)));
      const cc = crossCorrelation(pairs, max);
      if (!cc.length) fail(test, `too few overlapping points (${pairs.length})`);
      else {
        const top = cc.reduce((x, y) => (Math.abs(y.r) > Math.abs(x.r) ? y : x));
        const zero = cc.find((c) => c.lag === 0);
        const who = top.lag > 0 ? `${a.label} moves first, by about ${unitWord(freq, top.lag)}` : top.lag < 0 ? `${b.label} moves first, by about ${unitWord(freq, -top.lag)}` : 'neither moves first: the two line up best with no lag';
        out.tests.push({
          test,
          title: TEST_TITLE[test],
          reading: `Strongest link at a lag of ${top.lag}: ${who} (r = ${r2(top.r)}, ${fmtP(top.p)}${zero && top.lag !== 0 ? `; with no lag r = ${r2(zero.r)}` : ''}). Lags up to ${unitWord(freq, max)} either way were checked.`,
          figures: [
            { label: 'Best lag', value: String(top.lag) },
            { label: 'Correlation at best lag', value: r2(top.r) },
            ...(zero ? [{ label: 'Correlation with no lag', value: r2(zero.r) }] : []),
          ],
          caution,
          lags: cc.map((c) => ({ lag: c.lag, r: c.r, p: c.p })),
        });
      }
    }
    if (test === 'granger') {
      const lags = Math.max(1, Math.min(periodsPerYear(freq) >= 12 ? 6 : periodsPerYear(freq) >= 4 ? 4 : 2, Math.floor((pairs.length - 10) / 3)));
      const fwd = granger(pairs, lags);
      const back = granger(pairs.map((p) => ({ date: p.date, x: p.y, y: p.x })), lags);
      if ('error' in fwd) fail(test, fwd.error);
      else {
        const say = (p: number, from: string, to: string) => (p < 0.05 ? `past ${from} does help predict ${to}` : `past ${from} adds nothing significant to predicting ${to}`);
        const bp = 'error' in back ? NaN : back.p;
        out.tests.push({
          test,
          title: TEST_TITLE[test],
          reading: `With ${lags} lag(s): ${say(fwd.p, a.label, b.label)} (F = ${r2(fwd.f)}, ${fmtP(fwd.p)})${Number.isFinite(bp) ? `; ${say(bp, b.label, a.label)} (${fmtP(bp)})` : ''}. "Granger causality" means predictive help only, not cause; it assumes both series are stationary.`,
          figures: [
            { label: `F, ${a.label} → ${b.label}`, value: r2(fwd.f) },
            { label: `p, ${a.label} → ${b.label}`, value: fmtP(fwd.p).replace('p = ', '').replace('p ', '') },
            ...(Number.isFinite(bp) ? [{ label: `p, ${b.label} → ${a.label}`, value: fmtP(bp).replace('p = ', '').replace('p ', '') }] : []),
            { label: 'Lags', value: String(lags) },
          ],
          caution,
        });
      }
    }
    if (test === 'rolling') {
      const window = Math.max(8, Math.min(periodsPerYear(freq) * 3, Math.floor(pairs.length / 3)));
      const roll = rollingCorrelation(pairs, window);
      if (roll.length < 2) fail(test, `too few overlapping points for a ${window}-point window`);
      else {
        const vals = roll.map((p) => p.value);
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const now = vals[vals.length - 1];
        const flips = vals.some((v) => v > 0.2) && vals.some((v) => v < -0.2);
        out.tests.push({
          test,
          title: TEST_TITLE[test],
          reading: `Over ${window}-point windows the correlation ranged from ${r2(lo)} to ${r2(hi)} and is ${r2(now)} in the latest window (to ${roll[roll.length - 1].date}). ${flips ? 'It has changed sign, so the relationship is not stable.' : hi - lo > 0.6 ? 'It has moved a lot, so treat the full-sample figure with care.' : 'It has stayed in a fairly narrow range.'}`,
          figures: [
            { label: 'Rolling correlation, lowest', value: r2(lo) },
            { label: 'Rolling correlation, highest', value: r2(hi) },
            { label: 'Rolling correlation, latest', value: r2(now) },
            { label: 'Window', value: String(window) },
          ],
          rolling: roll,
        });
      }
    }
    if (test === 'adf') {
      for (const l of lines.slice(0, 2)) {
        const r = adf(l.points.map((p) => p.value));
        if ('error' in r) {
          out.tests.push({ test, title: `${TEST_TITLE.adf}: ${l.label}`, reading: `Not run: ${r.error}`, figures: [] });
          continue;
        }
        out.tests.push({
          test,
          title: `${TEST_TITLE.adf}: ${l.label}`,
          reading: `${l.label}: ADF statistic ${r2(r.stat)} against a 5% critical value of ${r2(r.critical['5%'])} (${r.lags} lag(s), ${r.n} points). ${r.stationary ? 'The unit root is rejected: the series looks stationary (it tends to return to its mean).' : 'The unit root is not rejected: the series may wander (trend or random walk), so correlations and regressions on its level can mislead; its change is safer.'}`,
          figures: [
            { label: `ADF statistic, ${l.label}`, value: r2(r.stat) },
            { label: '5% critical value', value: r2(r.critical['5%']) },
            { label: 'Lags', value: String(r.lags) },
          ],
          caution: sampleCaution(r.n, freq) ?? undefined,
        });
      }
    }
    if (test === 'hp') {
      const l = lines[0];
      if (!l) continue;
      const hp = hpFilter(l.points.map((p) => p.value), hpLambda(freq));
      if ('error' in hp) {
        fail(test, hp.error);
        continue;
      }
      out.lines.push({ key: `${l.key}_trend`, label: `${l.label}, HP trend`, unit: l.unit, axis: l.axis, source: 'HP filter on the series above', points: l.points.map((p, i) => ({ date: p.date, value: hp.trend[i] })), dashed: true });
      const gap = hp.cycle[hp.cycle.length - 1];
      out.tests.push({
        test,
        title: `${TEST_TITLE.hp}: ${l.label}`,
        reading: `${l.label} is ${fmt(Math.abs(gap))} ${l.unit} ${gap >= 0 ? 'above' : 'below'} its HP trend at the last point (${l.points[l.points.length - 1].date}; smoothing λ = ${hpLambda(freq)}). The HP trend bends towards the latest points, so the end of the sample is the least reliable part.`,
        figures: [
          { label: 'Gap from trend, latest', value: fmt(gap) },
          { label: 'Trend, latest', value: fmt(hp.trend[hp.trend.length - 1]) },
          { label: 'Smoothing λ', value: String(hpLambda(freq)) },
        ],
      });
    }
  }
  // Keep what is drawn (and saved with the conversation) to a sensible size; the tests above used every point.
  for (const l of out.lines) if (l.points.length > MAX_SAVED_POINTS) l.points = l.points.slice(-MAX_SAVED_POINTS);
  if (out.scatter && out.scatter.pairs.length > MAX_SAVED_POINTS) out.scatter.pairs = out.scatter.pairs.slice(-MAX_SAVED_POINTS);
  for (const t of out.tests) if (t.rolling && t.rolling.length > MAX_SAVED_POINTS) t.rolling = t.rolling.slice(-MAX_SAVED_POINTS);
  return out;
}

/** Fetches each series of a request from the app's own history routes; a missing one comes back with its reason. */
export async function fetchChartSeries(req: ChartRequest, get: typeof fetch = fetch): Promise<Array<FetchedSeries | { reason: string }>> {
  const one = async (ref: ChartSeriesRef, id: string): Promise<FetchedSeries | { reason: string }> => {
    const url = ref.iso3 ? `/api/series/${encodeURIComponent(ref.iso3)}/${encodeURIComponent(id)}` : `/api/series/world/${encodeURIComponent(id)}`;
    const r = await get(url);
    const body = (await r.json().catch(() => ({}))) as Partial<FetchedSeries> & { reason?: string; message?: string };
    if (r.ok && Array.isArray(body.points)) return body as FetchedSeries;
    return { reason: body.reason || body.message?.replace(/^.*?Missing\.\s*/, '') || (r.status === 404 ? 'the app holds no history for it yet' : `HTTP ${r.status}`) };
  };
  return Promise.all(
    req.series.map(async (ref) => {
      try {
        const first = await one(ref, ref.id);
        if ('reason' in first && ref.fallback) {
          const alt = await one(ref, ref.fallback);
          if (!('reason' in alt)) return alt;
        }
        return first;
      } catch {
        return { reason: 'the app server did not answer' };
      }
    })
  );
}

/** The chart as an agent finding, so the summary agent and follow-ups can talk about the results. */
export function chartFinding(req: ChartRequest, result: ChartResult): {
  iso3: string;
  countryName: string;
  reading: string;
  figures: Array<{ label: string; value: string; source: string; tag: 'model' }>;
  weight: number;
} | null {
  const ran = result.tests.filter((t) => t.figures.length);
  if (!result.lines.length) return null;
  const source = `Chart Agent on ${result.lines.map((l) => `${l.label} (${l.source})`).join('; ')}, ${result.first ?? ''} to ${result.last ?? ''}, ${result.freq}`;
  const figures = ran.flatMap((t) => t.figures.map((f) => ({ label: `${t.title}: ${f.label}`, value: f.value, source, tag: 'model' as const })));
  for (const l of result.lines.filter((x) => !x.dashed)) {
    const last = l.points[l.points.length - 1];
    if (last) figures.push({ label: `${l.label}, latest (${last.date})`, value: `${fmt(last.value)} ${l.unit}`, source: l.source, tag: 'model' });
  }
  const reading = ran.length ? ran.map((t) => t.reading).join(' ') : `Charted ${result.title} from ${result.first} to ${result.last}.`;
  const first = req.series.find((s) => s.iso3);
  return { iso3: first?.iso3 ?? 'WLD', countryName: result.title, reading, figures, weight: 1 };
}

/** Suggested follow-ups after a chart: the tests not yet run. */
export function chartFollowUps(req: ChartRequest): string[] {
  const out: string[] = [];
  if (req.series.length >= 2) {
    if (!req.tests.includes('rolling')) out.push('Is that relationship stable over time?');
    if (!req.tests.includes('granger')) out.push('Does one help predict the other?');
    if (!req.tests.includes('regression')) out.push('Show it as a scatter with a regression line');
  }
  if (!req.tests.includes('adf')) out.push('Are these series stationary?');
  if (!req.tests.includes('hp')) out.push('Where is it against its trend?');
  return out;
}

/** Points kept per line in a saved conversation (enough for a chart, small enough for the file). */
export const MAX_SAVED_POINTS = 600;
