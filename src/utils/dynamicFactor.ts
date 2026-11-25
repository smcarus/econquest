/**
 * Dynamic factor nowcast of GDP growth (two-step method of Doz, Giannone and Reichlin 2011, as in
 * Giannone, Reichlin and Small 2008): the monthly indicators a country publishes move together
 * because of one common factor, read with a Kalman filter that copes with the ragged edge (each
 * indicator ends in a different month) without filling anything in by hand.
 *
 *   1. Monthly series: activity index growth (% m/m), OECD leading indicator change, change in y/y
 *      inflation, change in the policy rate; each standardised on the months published by the
 *      nowcast day. Series the country lacks are left out.
 *   2. Principal component on the months where every series is published: loadings (lambda_i), the
 *      factor's AR(1) coefficient (phi) and innovation variance, and each series' own noise (psi_i).
 *   3. Kalman filter and smoother on all months, every series processed one at a time (exact with
 *      independent noises, Koopman and Durbin 2000): x_it = lambda_i f_t + e_it, f_t = phi f_{t-1} + u_t.
 *      A month with no figure for a series simply skips that series.
 *   4. Bridge: GDP growth in a quarter on the quarter's average smoothed factor and last quarter's
 *      growth, least squares on fully published quarters; the target quarter is predicted from its
 *      factor average (months not out yet come from the filter's projection).
 *
 * Pure, browser-safe; tested against the bridge nowcast's design (docs/validation/forecasts/gdp_nowcast_dfm.json).
 */
import { addDays, addMonthsTo, monthsOf, periodEnd, publishedBy, type DatedPoint } from './forecastModels';
import { ols } from './stats';
import type { ForecastCase, ForecastSpec } from './forecastEval';
import type { CountryData } from './forecastCases';

export interface FactorModel {
  months: string[];
  /** Smoothed factor for every month from the first to the last (including months after the newest figure up to `upTo`). */
  factor: number[];
  loadings: number[];
  phi: number;
  q: number;
  psi: number[];
  series: string[];
}

/** Month-on-month transform of a monthly series: pct = % change, diff = change. */
function monthly(points: DatedPoint[], kind: 'pct' | 'diff'): Map<string, number> {
  const s = points.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = new Map<string, number>();
  for (let i = 1; i < s.length; i++) {
    if (addMonthsTo(s[i - 1].date, 1) !== s[i].date) continue;
    const v = kind === 'pct' ? (s[i - 1].value ? (s[i].value / s[i - 1].value - 1) * 100 : NaN) : s[i].value - s[i - 1].value;
    if (Number.isFinite(v)) out.set(s[i].date, v);
  }
  return out;
}

/** First principal component of standardised columns (power iteration on the correlation matrix). */
function firstPc(rows: number[][]): number[] {
  const k = rows[0].length;
  const C = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => rows.reduce((a, r) => a + r[i] * r[j], 0) / rows.length));
  let v = Array(k).fill(1 / Math.sqrt(k));
  for (let it = 0; it < 500; it++) {
    const w = C.map((r) => r.reduce((a, x, j) => a + x * v[j], 0));
    const norm = Math.sqrt(w.reduce((a, x) => a + x * x, 0)) || 1;
    const nv = w.map((x) => x / norm);
    const d = Math.max(...nv.map((x, i) => Math.abs(x - v[i])));
    v = nv;
    if (d < 1e-12) break;
  }
  // Sign: positive loading on the first series (activity when present), so a higher factor means stronger growth.
  return v[0] < 0 ? v.map((x) => -x) : v;
}

export function fitFactorModel(input: Array<{ name: string; values: Map<string, number> }>, upTo: string, minBalanced = 36): FactorModel | { error: string } {
  const series = input.filter((s) => s.values.size > 0);
  if (!series.length) return { error: 'No monthly indicator to build the factor from.' };
  // Standardise each series on its own months.
  const std = series.map((s) => {
    const v = [...s.values.values()];
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1;
    return new Map([...s.values].map(([d, x]) => [d, (x - m) / sd]));
  });
  const first = [...std.flatMap((m) => [...m.keys()])].sort()[0];
  const months: string[] = [];
  for (let d = first; d <= upTo; d = addMonthsTo(d, 1)) months.push(d);
  const balanced = months.filter((d) => std.every((m) => m.has(d)));
  if (balanced.length < minBalanced) return { error: `Only ${balanced.length} months with every indicator published; the factor needs ${minBalanced}.` };
  const rows = balanced.map((d) => std.map((m) => m.get(d)!));
  const w = firstPc(rows);
  const pc = rows.map((r) => r.reduce((a, x, j) => a + x * w[j], 0));
  // Loadings by regressing each series on the principal component; noise from the residuals.
  const pcVar = pc.reduce((a, x) => a + x * x, 0) / pc.length;
  const loadings = std.map((_, j) => rows.reduce((a, r, t) => a + r[j] * pc[t], 0) / rows.length / pcVar);
  const psi = std.map((_, j) => Math.max(1e-4, rows.reduce((a, r, t) => a + (r[j] - loadings[j] * pc[t]) ** 2, 0) / rows.length));
  // Factor AR(1) on consecutive balanced months.
  let sxy = 0;
  let sxx = 0;
  const pcBy = new Map(balanced.map((d, t) => [d, pc[t]]));
  for (const d of balanced) {
    const prev = pcBy.get(addMonthsTo(d, -1));
    if (prev === undefined) continue;
    sxy += prev * pcBy.get(d)!;
    sxx += prev * prev;
  }
  const phi = Math.max(-0.98, Math.min(0.98, sxx > 0 ? sxy / sxx : 0));
  let rs = 0;
  let rn = 0;
  for (const d of balanced) {
    const prev = pcBy.get(addMonthsTo(d, -1));
    if (prev === undefined) continue;
    rs += (pcBy.get(d)! - phi * prev) ** 2;
    rn++;
  }
  const q = Math.max(1e-4, rn ? rs / rn : pcVar * (1 - phi * phi));
  // Scalar-state Kalman filter, one series at a time, then the Rauch-Tung-Striebel smoother.
  const aP: number[] = [];
  const PP: number[] = [];
  const aF: number[] = [];
  const PF: number[] = [];
  let a = 0;
  let P = q / (1 - phi * phi);
  for (const d of months) {
    aP.push(a);
    PP.push(P);
    for (let j = 0; j < std.length; j++) {
      const x = std[j].get(d);
      if (x === undefined) continue;
      const F = loadings[j] * loadings[j] * P + psi[j];
      const K = (P * loadings[j]) / F;
      a += K * (x - loadings[j] * a);
      P -= K * loadings[j] * P;
    }
    aF.push(a);
    PF.push(P);
    a = phi * a;
    P = phi * phi * P + q;
  }
  const factor = aF.slice();
  for (let t = months.length - 2; t >= 0; t--) {
    const J = (PF[t] * phi) / PP[t + 1];
    factor[t] = aF[t] + J * (factor[t + 1] - aP[t + 1]);
  }
  return { months, factor, loadings, phi, q, psi, series: series.map((s) => s.name) };
}

/** The monthly inputs a nowcast made on `asOf` can see (null when the country has neither activity nor the leading indicator). */
export function factorInputs(c: CountryData, asOf: string, lags: { activity: number; cli: number; cpi: number; policy: number }): Array<{ name: string; values: Map<string, number> }> | null {
  if (!(c.activity?.length || c.cli?.length)) return null;
  const out: Array<{ name: string; values: Map<string, number> }> = [];
  const add = (pts: DatedPoint[] | undefined, lag: number, kind: 'pct' | 'diff', name: string) => {
    if (!pts?.length) return;
    const pub = publishedBy(pts, asOf, lag);
    const m = monthly(pub, kind);
    if (m.size) out.push({ name, values: m });
  };
  add(c.activity, lags.activity, 'pct', 'Activity index growth');
  add(c.cli, lags.cli, 'diff', 'Leading indicator change');
  add(c.cpi, lags.cpi, 'diff', 'Inflation change');
  add(c.policy, lags.policy, 'diff', 'Policy rate change');
  return out;
}

/** Quarter's average smoothed factor. */
export function quarterFactor(fm: FactorModel, quarter: string): number | undefined {
  const idx = monthsOf(quarter).map((m) => fm.months.indexOf(m));
  if (idx.some((i) => i < 0)) return undefined;
  return idx.reduce((a, i) => a + fm.factor[i], 0) / 3;
}

/** Out-of-sample cases for the dynamic factor nowcast (same design as gdpNowcastCases). */
export function dfmNowcastCases(spec: ForecastSpec, data: CountryData[]): { cases: ForecastCase[]; series: string[] } {
  const after = spec.params.asOfDaysAfterQuarter ?? 30;
  const lags = { gdp: spec.params.gdpLagDays ?? 60, activity: spec.params.activityLagDays ?? 45, cli: spec.params.cliLagDays ?? 45, cpi: spec.params.cpiLagDays ?? 30, policy: spec.params.policyLagDays ?? 1 };
  const minQuarters = spec.params.minQuarters ?? 24;
  const out: ForecastCase[] = [];
  for (const c of data) {
    if (!c.gdpQoq?.length) continue;
    const gdpAll = c.gdpQoq.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const g of gdpAll) {
      if (g.date < spec.sample.from || (spec.sample.to && g.date > spec.sample.to)) continue;
      const asOf = addDays(periodEnd(g.date), after);
      const inputs = factorInputs(c, asOf, lags);
      if (!inputs) continue;
      const ms = monthsOf(g.date);
      // An activity or leading-indicator month of the target quarter must be out (as in the bridge test).
      if (!inputs.filter((s) => s.name !== 'Inflation change' && s.name !== 'Policy rate change').some((s) => ms.some((m) => s.values.has(m)))) continue;
      const fm = fitFactorModel(inputs, ms[2], spec.params.minBalancedMonths ?? 36);
      if ('error' in fm) continue;
      const gdp = publishedBy(gdpAll, asOf, lags.gdp);
      if (gdp.some((x) => x.date === g.date)) continue;
      // Bridge on fully published quarters whose three months are all inside the factor's span.
      const y: number[] = [];
      const X: number[][] = [];
      for (let i = 1; i < gdp.length; i++) {
        const f = quarterFactor(fm, gdp[i].date);
        if (f === undefined) continue;
        y.push(gdp[i].value);
        X.push([f, gdp[i - 1].value]);
      }
      if (y.length < minQuarters) continue;
      const reg = ols(y, X, minQuarters);
      if ('error' in reg) continue;
      const fq = quarterFactor(fm, g.date);
      const lastG = gdp[gdp.length - 1];
      // The bridge's lag is last quarter's growth: it must be published (it is under the registered lags).
      const prevQ = monthsOf(g.date)[0] === `${g.date.slice(0, 4)}-01` ? `${Number(g.date.slice(0, 4)) - 1}-Q4` : `${g.date.slice(0, 4)}-Q${Number(g.date.slice(-1)) - 1}`;
      if (fq === undefined || !lastG || lastG.date !== prevQ) continue;
      const mean = reg.coef[0] + reg.coef[1] * fq + reg.coef[2] * lastG.value;
      const sd = Math.sqrt(reg.rss / Math.max(1, reg.n - reg.k));
      const known = gdp.map((x) => x.value);
      const bench = spec.benchmark === 'mean' ? known.reduce((a, b) => a + b, 0) / known.length : lastG.value;
      out.push({ where: c.iso3, origin: lastG.date, target: g.date, h: 1, actual: g.value, model: { mean, sd }, bench: { mean: bench } });
    }
  }
  return { cases: out, series: [...new Set(out.map((x) => x.where))].sort() };
}
