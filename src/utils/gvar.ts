/**
 * A small global VAR (platform comparison gap CG16): how a shock in one economy spreads to others.
 *
 * Method (Pesaran, Schuermann and Weiner 2004; Dees, di Mauro, Pesaran and Smith 2007, the GVAR):
 *   1. Each country gets its own small model of real GDP growth and inflation, where the country's
 *      own last-year values and its trading partners' values ("foreign" variables, this year and
 *      last year) explain this year's values: a VARX*(1,1), estimated by least squares.
 *      The United States, the largest economy, sees the others only through last year's figures,
 *      so its own surprises are not read back into it (a simple form of the dominant-unit set-up).
 *   2. The foreign variables are trade-weighted averages of the other countries in the model. The
 *      weights are each country's goods exports plus imports with each partner, the average of the
 *      latest three years the IMF has for that pair (IMF International Trade in Goods by partner,
 *      IMTS), shares within the model's countries.
 *   3. The country models are stacked into one model for all countries together, checked for
 *      stability, and a shock is traced with generalised impulse responses (Pesaran and Shin 1998),
 *      which use the cross-country correlation of surprises and do not depend on country order.
 *   4. Bands: the yearly surprises of all countries are resampled together (keeping their
 *      correlation), the data are rebuilt from the model, every country model is estimated again
 *      and the response recomputed; 5th and 95th percentiles of the stable draws.
 *
 * Annual data (IMF World Economic Outlook history, 1996 onwards, so the high-inflation years
 * before stabilisation in several countries do not dominate), so the sample is short: about thirty
 * years. The responses are a rough guide to direction and size, not a forecast. Weak exogeneity of
 * the foreign variables is assumed, not tested. Browser-safe, pure.
 */

export const GVAR_VARS = ['gdp', 'cpi'] as const;
export type GvarVar = (typeof GVAR_VARS)[number];
export const GVAR_VAR_LABEL: Record<GvarVar, string> = { gdp: 'Real GDP growth (%)', cpi: 'Inflation (%)' };

/** The model's countries; the country being looked at is added when it is not one of them. */
export const GVAR_CORE = ['USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'ITA', 'CAN', 'KOR', 'IND', 'BRA', 'MEX', 'AUS', 'TUR', 'ZAF', 'IDN'];
export const GVAR_FIRST_YEAR = 1996;
export const GVAR_HORIZON = 5;
export const GVAR_DRAWS = 200;
export const GVAR_MIN_YEARS = 20;

export const GVAR_SOURCE = 'IMF World Economic Outlook (DataMapper NGDP_RPCH, PCPIPCH); trade weights from IMF International Trade in Goods by partner (IMTS)';

export const datamapperUrl = (indicator: 'NGDP_RPCH' | 'PCPIPCH', iso3s: string[]) => `https://www.imf.org/external/datamapper/api/v1/${indicator}/${iso3s.join('/')}`;
export const imtsUrl = (iso3: string, partners: string[]) =>
  `https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/IMTS/+/${iso3}.XG_FOB_USD+MG_CIF_USD.${partners.join('+')}.A?attributes=dsd&measures=all`;

// ---- small matrix helpers ----------------------------------------------------------------------
type M = number[][];
const zeros = (r: number, c: number): M => Array.from({ length: r }, () => new Array(c).fill(0));
const eye = (n: number): M => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
function mul(a: M, b: M): M {
  const n = a.length;
  const m = b[0].length;
  const k = b.length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++)
    for (let p = 0; p < k; p++) {
      const v = a[i][p];
      if (v === 0) continue;
      for (let j = 0; j < m; j++) out[i][j] += v * b[p][j];
    }
  return out;
}
const mulVec = (a: M, v: number[]) => a.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
/** Inverse by Gauss-Jordan with partial pivoting; null when singular. */
export function inverse(a: M): M | null {
  const n = a.length;
  const m = a.map((r, i) => [...r, ...eye(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let j = 0; j < 2 * n; j++) m[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((r) => r.slice(n));
}
/** Least squares: coefficients (regressors x equations) for Y on X, or null. */
function ols(X: M, Y: M): M | null {
  const Xt = X[0].map((_, j) => X.map((r) => r[j]));
  const inv = inverse(mul(Xt, X));
  return inv ? mul(inv, mul(Xt, Y)) : null;
}

/** Spectral radius of a square matrix, from the growth of its powers (repeated squaring). */
export function spectralRadius(a: M): number {
  let p = a.map((r) => [...r]);
  let logScale = 0;
  const steps = 9; // a^(2^9) = a^512
  for (let s = 0; s < steps; s++) {
    p = mul(p, p);
    logScale *= 2;
    const norm = Math.max(...p.map((r) => r.reduce((x, v) => x + Math.abs(v), 0)));
    if (!(norm > 0)) return 0;
    if (!Number.isFinite(norm)) return Infinity;
    p = p.map((r) => r.map((v) => v / norm));
    logScale += Math.log(norm);
  }
  return Math.exp(logScale / 2 ** steps);
}

// ---- data readers ---------------------------------------------------------------------------------

/** DataMapper reply to country -> year -> value. */
export function parseDatamapper(j: unknown, indicator: string): Record<string, Record<number, number>> {
  const v = (j as { values?: Record<string, Record<string, Record<string, unknown>>> })?.values?.[indicator] ?? {};
  const out: Record<string, Record<number, number>> = {};
  for (const [iso3, years] of Object.entries(v)) {
    for (const [y, val] of Object.entries(years || {})) {
      const n = typeof val === 'number' ? val : Number(val);
      if (/^\d{4}$/.test(y) && Number.isFinite(n)) (out[iso3] ??= {})[Number(y)] = n;
    }
  }
  return out;
}

/** IMTS reply for one reporting country: partner -> trade (exports + imports), mean of the latest three years. */
export function parseImtsTrade(j: unknown): Record<string, number> {
  const data = (j as { data?: { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, unknown[]> }> }>; structures?: Array<{ dimensions?: { series?: Array<{ id: string; values: Array<{ id?: string; value?: string }> }>; observation?: Array<{ values: Array<{ id?: string; value?: string }> }> } }> } })?.data;
  const st = data?.structures?.[0]?.dimensions;
  const series = data?.dataSets?.[0]?.series;
  if (!st?.series || !series) return {};
  const cpPos = st.series.findIndex((d) => d.id === 'COUNTERPART_COUNTRY');
  const indPos = st.series.findIndex((d) => d.id === 'INDICATOR');
  const years = (st.observation?.[0]?.values || []).map((v) => Number(v.value ?? v.id));
  if (cpPos < 0 || indPos < 0) return {};
  const byPartner: Record<string, Record<number, number>> = {};
  for (const [key, s] of Object.entries(series)) {
    const idx = key.split(':').map(Number);
    const partner: { id?: string; value?: string } | undefined = st.series[cpPos].values[idx[cpPos]];
    const ind: { id?: string; value?: string } | undefined = st.series[indPos].values[idx[indPos]];
    const p = String(partner?.id ?? partner?.value ?? '');
    const flow = String(ind?.id ?? ind?.value ?? '');
    if (!p || !/^(XG_FOB_USD|MG_CIF_USD)$/.test(flow)) continue;
    for (const [o, arr] of Object.entries(s.observations || {})) {
      const y = years[Number(o)];
      const v = Number(arr?.[0]);
      if (!Number.isFinite(y) || !Number.isFinite(v) || v < 0) continue;
      const row = (byPartner[p] ??= {});
      row[y] = (row[y] ?? 0) + v;
    }
  }
  const out: Record<string, number> = {};
  for (const [p, row] of Object.entries(byPartner)) {
    const ys = Object.keys(row).map(Number).sort((a, b) => b - a).slice(0, 3);
    if (ys.length) out[p] = ys.reduce((s, y) => s + row[y], 0) / ys.length;
  }
  return out;
}

/**
 * Trade weights within the model's countries: row i is country i's trade with each other
 * country as a share of its trade with all of them. Where a country's own report is missing, its
 * partners' reports of trade with it are used. Null for a country with no trade figures at all.
 */
export function tradeWeights(countries: string[], trade: Record<string, Record<string, number>>): { W: M; missing: string[] } {
  const n = countries.length;
  const W = zeros(n, n);
  const missing: string[] = [];
  for (let i = 0; i < n; i++) {
    let total = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const own = trade[countries[i]]?.[countries[j]];
      const mirror = trade[countries[j]]?.[countries[i]];
      const v = own !== undefined ? own : mirror ?? 0;
      W[i][j] = v;
      total += v;
    }
    if (total > 0) for (let j = 0; j < n; j++) W[i][j] /= total;
    else missing.push(countries[i]);
  }
  return { W, missing };
}

// ---- the model ------------------------------------------------------------------------------------

export interface GvarData {
  countries: string[];
  years: number[];
  /** x[t][i*2 + v]: country i, variable v (0 growth, 1 inflation), year t. */
  x: number[][];
}

/** Years from `from` where every country has both figures, newest last; countries without enough are dropped. */
export function buildData(countries: string[], gdp: Record<string, Record<number, number>>, cpi: Record<string, Record<number, number>>, from: number, through: number): { data: GvarData; dropped: string[] } {
  const dropped: string[] = [];
  const kept: string[] = [];
  for (const c of countries) {
    let n = 0;
    for (let y = from; y <= through; y++) if (gdp[c]?.[y] !== undefined && cpi[c]?.[y] !== undefined) n++;
    if (n >= GVAR_MIN_YEARS) kept.push(c);
    else dropped.push(c);
  }
  const years: number[] = [];
  for (let y = from; y <= through; y++) if (kept.every((c) => gdp[c]?.[y] !== undefined && cpi[c]?.[y] !== undefined)) years.push(y);
  const x = years.map((y) => kept.flatMap((c) => [gdp[c][y], cpi[c][y]]));
  return { data: { countries: kept, years, x }, dropped };
}

interface CountryFit {
  a: number[];
  phi: M;
  l0: M;
  l1: M;
  resid: number[][];
}

function foreign(W: M, x: number[]): number[] {
  const n = W.length;
  const out = new Array(n * 2).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const w = W[i][j];
      if (!w) continue;
      out[i * 2] += w * x[j * 2];
      out[i * 2 + 1] += w * x[j * 2 + 1];
    }
  return out;
}

function fitCountries(x: number[][], W: M, lagOnly: boolean[] = []): CountryFit[] | null {
  const n = W.length;
  const T = x.length;
  const xs = x.map((row) => foreign(W, row));
  const fits: CountryFit[] = [];
  for (let i = 0; i < n; i++) {
    // The largest economy (lagOnly) sees the others only through last year's figures, so its own
    // surprises are not read back into it through partners that move with it in the same year.
    const now = !lagOnly[i];
    const X: M = [];
    const Y: M = [];
    for (let t = 1; t < T; t++) {
      X.push([1, x[t - 1][i * 2], x[t - 1][i * 2 + 1], ...(now ? [xs[t][i * 2], xs[t][i * 2 + 1]] : []), xs[t - 1][i * 2], xs[t - 1][i * 2 + 1]]);
      Y.push([x[t][i * 2], x[t][i * 2 + 1]]);
    }
    const B = ols(X, Y);
    if (!B) return null;
    const fitted = mul(X, B);
    // B rows: regressors; columns: equations. The matrices are equation x variable.
    const tr = (r1: number, r2: number): M => [
      [B[r1][0], B[r2][0]],
      [B[r1][1], B[r2][1]],
    ];
    const lag = now ? 5 : 3;
    fits.push({
      a: [B[0][0], B[0][1]],
      phi: tr(1, 2),
      l0: now ? tr(3, 4) : [[0, 0], [0, 0]],
      l1: tr(lag, lag + 1),
      resid: Y.map((y, t) => [y[0] - fitted[t][0], y[1] - fitted[t][1]]),
    });
  }
  return fits;
}

export interface GlobalModel {
  /** x_t = c + F x_{t-1} + G0inv u_t */
  c: number[];
  F: M;
  G0inv: M;
  /** Covariance of the stacked country surprises u. */
  sigma: M;
  /** u[t][k], years 2..T. */
  u: number[][];
  radius: number;
}

function stack(fits: CountryFit[], W: M): GlobalModel | null {
  const n = W.length;
  const K = n * 2;
  const G0 = eye(K);
  const G1 = zeros(K, K);
  const a = new Array(K).fill(0);
  for (let i = 0; i < n; i++) {
    const f = fits[i];
    for (let e = 0; e < 2; e++) {
      a[i * 2 + e] = f.a[e];
      for (let v = 0; v < 2; v++) G1[i * 2 + e][i * 2 + v] += f.phi[e][v];
      for (let j = 0; j < n; j++) {
        const w = W[i][j];
        if (!w) continue;
        for (let v = 0; v < 2; v++) {
          G0[i * 2 + e][j * 2 + v] -= f.l0[e][v] * w;
          G1[i * 2 + e][j * 2 + v] += f.l1[e][v] * w;
        }
      }
    }
  }
  const G0inv = inverse(G0);
  if (!G0inv) return null;
  const F = mul(G0inv, G1);
  const u = fits[0].resid.map((_, t) => fits.flatMap((f) => f.resid[t]));
  const T = u.length;
  const sigma = zeros(K, K);
  for (const row of u) for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) sigma[p][q] += (row[p] * row[q]) / T;
  return { c: mulVec(G0inv, a), F, G0inv, sigma, u, radius: spectralRadius(F) };
}

/** The country treated as the largest economy: its foreign variables enter with a lag only. */
export const GVAR_DOMINANT = 'USA';

export function fitGvar(data: GvarData, W: M, dominant: string | null = GVAR_DOMINANT): GlobalModel | null {
  const fits = fitCountries(data.x, W, data.countries.map((c) => c === dominant));
  return fits ? stack(fits, W) : null;
}

/** Generalised impulse responses of every variable to a one-standard-deviation surprise in position k, years 0..h. */
export function girf(m: GlobalModel, k: number, h = GVAR_HORIZON): number[][] {
  const sd = Math.sqrt(m.sigma[k][k]);
  if (!(sd > 0)) return [];
  const impact = mulVec(m.G0inv, m.sigma.map((r) => r[k] / sd));
  const out = [impact];
  for (let s = 1; s <= h; s++) out.push(mulVec(m.F, out[s - 1]));
  return out;
}

export interface GvarResponse {
  iso3: string;
  /** Response of each variable, years 0..horizon, to the shock scaled to `size` on impact. */
  gdp: number[];
  cpi: number[];
  gdpLow?: number[];
  gdpHigh?: number[];
  cpiLow?: number[];
  cpiHigh?: number[];
}

export interface GvarResult {
  countries: string[];
  years: [number, number];
  shock: { iso3: string; variable: GvarVar; size: number; oneSd: number };
  radius: number;
  responses: GvarResponse[];
  /** Trade weights of the shocked country's partners in each country's foreign variables. */
  exposure: Array<{ iso3: string; weight: number }>;
  draws: number;
  stableDraws: number;
}

const quantile = (vals: number[], q: number) => {
  const s = [...vals].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const p = (s.length - 1) * q;
  const lo = Math.floor(p);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (p - lo);
};

/** Seeded random numbers, so the same data give the same bands. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function scaled(resp: number[][], k: number, size: number): number[][] | null {
  const imp = resp[0]?.[k];
  if (!imp || Math.abs(imp) < 1e-9) return null;
  return resp.map((row) => row.map((v) => (v * size) / imp));
}

/**
 * The whole run: fit, check stability, trace a shock of `size` percentage points on impact to
 * `variable` in `iso3`, with bootstrap bands. Error sentence when the model cannot be used.
 */
export function runGvar(data: GvarData, W: M, iso3: string, variable: GvarVar, size: number, opts: { draws?: number; seed?: number; horizon?: number } = {}): GvarResult | { error: string } {
  const i = data.countries.indexOf(iso3);
  if (i < 0) return { error: `${iso3} is not in the model (not enough IMF figures since ${GVAR_FIRST_YEAR}).` };
  if (data.years.length < GVAR_MIN_YEARS) return { error: `Only ${data.years.length} years where every country has figures; at least ${GVAR_MIN_YEARS} are needed.` };
  const h = opts.horizon ?? GVAR_HORIZON;
  const k = i * 2 + (variable === 'gdp' ? 0 : 1);
  const m = fitGvar(data, W);
  if (!m) return { error: 'The country models could not be estimated (the figures are too alike to separate).' };
  if (!(m.radius < 1)) return { error: `The combined model is not stable (largest root ${m.radius.toFixed(3)}), so its responses would grow without end. It is not shown.` };
  const base = scaled(girf(m, k, h), k, size);
  if (!base) return { error: 'The shock has no effect on its own variable on impact, so it cannot be scaled.' };
  const oneSd = Math.sqrt(m.sigma[k][k]);

  // Bootstrap: resample years of surprises (all countries together), rebuild the data, refit.
  const draws = opts.draws ?? GVAR_DRAWS;
  const rand = rng(opts.seed ?? 20261123);
  const T = data.x.length;
  const K = data.countries.length * 2;
  const sims: number[][][] = [];
  for (let d = 0; d < draws; d++) {
    const x: number[][] = [data.x[0]];
    for (let t = 1; t < T; t++) {
      const uRow = m.u[Math.floor(rand() * m.u.length)];
      const shock = mulVec(m.G0inv, uRow);
      const prev = mulVec(m.F, x[t - 1]);
      x.push(Array.from({ length: K }, (_, p) => m.c[p] + prev[p] + shock[p]));
    }
    const mb = fitGvar({ ...data, x }, W);
    if (!mb || !(mb.radius < 1)) continue;
    const r = scaled(girf(mb, k, h), k, size);
    if (r) sims.push(r);
  }

  const responses: GvarResponse[] = data.countries.map((c, j) => {
    const pick = (r: number[][], v: number) => r.map((row) => row[j * 2 + v]);
    const res: GvarResponse = { iso3: c, gdp: pick(base, 0), cpi: pick(base, 1) };
    if (sims.length >= 20) {
      const band = (v: number, q: number) => base.map((_, s) => quantile(sims.map((r) => r[s][j * 2 + v]), q));
      res.gdpLow = band(0, 0.05);
      res.gdpHigh = band(0, 0.95);
      res.cpiLow = band(1, 0.05);
      res.cpiHigh = band(1, 0.95);
    }
    return res;
  });
  return {
    countries: data.countries,
    years: [data.years[0], data.years[data.years.length - 1]],
    shock: { iso3, variable, size, oneSd },
    radius: m.radius,
    responses,
    exposure: data.countries.map((c, j) => ({ iso3: c, weight: W[j][i] })).filter((e) => e.iso3 !== iso3).sort((a, b) => b.weight - a.weight),
    draws,
    stableDraws: sims.length,
  };
}
