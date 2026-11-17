/**
 * Full yield curves (R11). Every maturity of two government curves each day:
 *
 * - United States: the Treasury's daily par yield curve (home.treasury.gov, CSV for the year; US
 *   government work, no key). Par yields: the coupon at which a new bond of that maturity would sell
 *   at face value.
 * - Euro area: the ECB's daily yield curve for all euro area central government bonds (ECB Data
 *   Portal, dataset YC, key B.U2.EUR.4F.G_N_C.SV_C_YM.SR_*; Source: ECB statistics). Spot rates: the
 *   yield of a single payment at that maturity.
 *
 * On each curve the app works out (its own calculations, labelled as such):
 * - A fitted curve (Nelson-Siegel-Svensson: level, slope and two humps, with the two decay times
 *   chosen on a grid and the four weights by least squares).
 * - Level (10-year yield), slope (10-year minus 2-year) and curvature (twice the 5-year minus the
 *   2-year and the 10-year), with their moves over one day and about one month (21 business days).
 * - Carry and roll-down over three months for each maturity of a year or more: carry is the yield
 *   over the 3-month rate for a quarter; roll-down is what the price gains if the curve stays put and
 *   the bond slides to a shorter maturity (modified duration times the drop in yield along the fitted
 *   curve). Both in basis points, before costs; a description, not a trade signal.
 *
 * Pure and browser-safe.
 */
import { csvRows } from './stressIndices';

export type CurveArea = 'us' | 'ea';

export interface CurveDay {
  /** YYYY-MM-DD. */
  date: string;
  /** Maturity in years (as a string, e.g. "0.25") to yield in %. */
  yields: Record<string, number>;
}

export interface CurveSeries {
  area: CurveArea;
  /** Oldest first. */
  days: CurveDay[];
}

export interface CurvesFile {
  pulledAt: string;
  us?: CurveSeries;
  ea?: CurveSeries;
}

export const CURVE_KEEP_DAYS = 320;

export const CURVE_INFO: Record<CurveArea, { label: string; kind: 'par' | 'spot'; source: string }> = {
  us: { label: 'US Treasury par yield curve', kind: 'par', source: 'U.S. Department of the Treasury, Daily Treasury Par Yield Curve Rates' },
  ea: { label: 'Euro area government yield curve (all issuers)', kind: 'spot', source: 'ECB statistics, euro area yield curves (all euro area central government bonds), ECB Data Portal' },
};

export const ustCurveUrl = (year: number) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;

export const ECB_CURVE_TENORS = ['SR_3M', 'SR_6M', 'SR_1Y', 'SR_2Y', 'SR_3Y', 'SR_5Y', 'SR_7Y', 'SR_10Y', 'SR_15Y', 'SR_20Y', 'SR_30Y'] as const;
/**
 * One request per maturity by default: the ECB did not answer within 10 s when asked for all eleven
 * maturities in one query from a Mac, while its other datasets answered in about 3 s.
 */
export const ecbCurveUrl = (lastN = CURVE_KEEP_DAYS, tenors: readonly string[] = ECB_CURVE_TENORS) =>
  `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_C.SV_C_YM.${tenors.join('+')}?format=csvdata&lastNObservations=${lastN}`;

const key = (m: number) => String(Number(m.toFixed(4)));

/** "3 Mo", "1.5 Month", "10 Yr" -> years; null for anything else. */
export function ustMaturity(label: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(mo|month|months|yr|year|years)\s*$/i.exec(label.replace(/"/g, ''));
  if (!m) return null;
  const n = Number(m[1]);
  return /^m/i.test(m[2]) ? n / 12 : n;
}

/** "SR_3M" -> 0.25, "SR_10Y" -> 10, "SR_1Y6M" -> 1.5; null otherwise. */
export function ecbMaturity(code: string): number | null {
  const m = /^SR_(?:(\d+)Y)?(?:(\d+)M)?$/.exec(code.trim());
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || 0) + Number(m[2] || 0) / 12;
}

/** The Treasury CSV (Date in MM/DD/YYYY, one column per maturity) to days, oldest first. */
export function parseUstCsv(text: string): CurveDay[] | { reason: string } {
  const rows = csvRows(text);
  if (rows.length < 2) return { reason: 'the Treasury file holds no rows' };
  const head = rows[0].map((h) => h.trim());
  const di = head.findIndex((h) => /^date$/i.test(h));
  if (di < 0) return { reason: `no Date column (columns: ${head.slice(0, 8).join(', ')})` };
  const cols = head.map((h, i) => ({ i, m: i === di ? null : ustMaturity(h) })).filter((c): c is { i: number; m: number } => c.m !== null);
  if (cols.length < 6) return { reason: `fewer than 6 maturity columns (columns: ${head.slice(0, 8).join(', ')})` };
  const days: CurveDay[] = [];
  for (const r of rows.slice(1)) {
    const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((r[di] || '').trim());
    if (!d) continue;
    const yields: Record<string, number> = {};
    for (const c of cols) {
      const v = Number((r[c.i] || '').trim());
      if ((r[c.i] || '').trim() !== '' && Number.isFinite(v)) yields[key(c.m)] = v;
    }
    if (Object.keys(yields).length) days.push({ date: `${d[3]}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`, yields });
  }
  if (!days.length) return { reason: 'no row had a date and a yield' };
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

/** ECB Data Portal csvdata (one row per series and day) to days, oldest first. */
export function parseEcbCurveCsv(text: string): CurveDay[] | { reason: string } {
  const rows = csvRows(text);
  if (rows.length < 2) return { reason: 'the ECB reply holds no rows' };
  const head = rows[0].map((h) => h.trim());
  const ti = head.indexOf('TIME_PERIOD');
  const vi = head.indexOf('OBS_VALUE');
  const mi = head.indexOf('DATA_TYPE_FM');
  const ki = head.indexOf('KEY');
  if (ti < 0 || vi < 0 || (mi < 0 && ki < 0)) return { reason: `not the ECB csvdata layout (columns: ${head.slice(0, 8).join(', ')})` };
  const by = new Map<string, Record<string, number>>();
  for (const r of rows.slice(1)) {
    const code = mi >= 0 ? r[mi] : String(r[ki] || '').split('.').pop() || '';
    const m = ecbMaturity(code || '');
    const date = (r[ti] || '').trim();
    const v = Number((r[vi] || '').trim());
    if (m === null || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (r[vi] || '').trim() === '' || !Number.isFinite(v)) continue;
    if (!by.has(date)) by.set(date, {});
    by.get(date)![key(m)] = v;
  }
  if (!by.size) return { reason: 'no row had a maturity, a day and a value' };
  return [...by.entries()].map(([date, yields]) => ({ date, yields })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Days from two downloads merged (later wins on the same day), the last CURVE_KEEP_DAYS kept. */
export function mergeDays(a: CurveDay[], b: CurveDay[]): CurveDay[] {
  const by = new Map<string, CurveDay>();
  for (const d of [...a, ...b]) by.set(d.date, d);
  return [...by.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-CURVE_KEEP_DAYS);
}

/* --------------------------------------------------------------- Nelson-Siegel-Svensson */

export interface NssFit {
  b0: number;
  b1: number;
  b2: number;
  b3: number;
  t1: number;
  t2: number;
  /** Root mean square gap between the fitted and the published yields, in basis points. */
  rmseBp: number;
}

function loads(m: number, t1: number, t2: number): [number, number, number, number] {
  const x1 = m / t1;
  const x2 = m / t2;
  const f1 = x1 < 1e-8 ? 1 : (1 - Math.exp(-x1)) / x1;
  const f2 = x2 < 1e-8 ? 1 : (1 - Math.exp(-x2)) / x2;
  return [1, f1, f1 - Math.exp(-x1), f2 - Math.exp(-x2)];
}

export function nssYield(f: Pick<NssFit, 'b0' | 'b1' | 'b2' | 'b3' | 't1' | 't2'>, m: number): number {
  const l = loads(m, f.t1, f.t2);
  return f.b0 * l[0] + f.b1 * l[1] + f.b2 * l[2] + f.b3 * l[3];
}

/** Solves a small linear system (Gaussian elimination with pivoting); null when singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= k * m[c][j];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Fits the curve: decay times on a grid (t1 0.2 to 5 years, t2 above t1 up to 15), weights by least squares. Null with fewer than 6 maturities. */
export function fitNss(points: Array<{ m: number; y: number }>): NssFit | null {
  if (points.length < 6) return null;
  let best: NssFit | null = null;
  for (let t1 = 0.2; t1 <= 5.0001; t1 += 0.2) {
    for (let t2 = t1 + 0.5; t2 <= 15.0001; t2 += 0.5) {
      const xtx = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
      const xty = [0, 0, 0, 0];
      for (const p of points) {
        const l = loads(p.m, t1, t2);
        for (let i = 0; i < 4; i++) {
          xty[i] += l[i] * p.y;
          for (let j = 0; j < 4; j++) xtx[i][j] += l[i] * l[j];
        }
      }
      // A small ridge keeps the near-collinear humps from swinging to huge opposite weights.
      for (let i = 1; i < 4; i++) xtx[i][i] += 1e-6;
      const b = solve(xtx, xty);
      if (!b || b.some((v) => !Number.isFinite(v) || Math.abs(v) > 100)) continue;
      const f = { b0: b[0], b1: b[1], b2: b[2], b3: b[3], t1, t2 };
      const sse = points.reduce((s, p) => s + (nssYield(f, p.m) - p.y) ** 2, 0);
      const rmseBp = Math.sqrt(sse / points.length) * 100;
      if (!best || rmseBp < best.rmseBp) best = { ...f, rmseBp };
    }
  }
  return best && { ...best, b0: r4(best.b0), b1: r4(best.b1), b2: r4(best.b2), b3: r4(best.b3), t1: r4(best.t1), t2: r4(best.t2), rmseBp: r2(best.rmseBp) };
}

/* --------------------------------------------------------------- readings */

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const bp = (x: number) => Math.round(x * 1000) / 10;

export interface Factors {
  level: number;
  slope: number;
  curvature: number;
}

/** Level (10y), slope (10y - 2y), curvature (2 x 5y - 2y - 10y), in %, from the published 2-, 5- and 10-year yields; null when one is missing. */
export function factorsOf(d: CurveDay): Factors | null {
  const y2 = d.yields['2'];
  const y5 = d.yields['5'];
  const y10 = d.yields['10'];
  if (![y2, y5, y10].every((v) => typeof v === 'number')) return null;
  return { level: r2(y10), slope: r2(y10 - y2), curvature: r2(2 * y5 - y2 - y10) };
}

/** Modified duration of a par bond paying a yearly coupon equal to its yield (y in %). */
export function parDuration(m: number, y: number): number {
  const i = y / 100;
  if (m <= 0) return 0;
  if (Math.abs(i) < 1e-6) return m;
  return (1 - Math.pow(1 + i, -m)) / i;
}

export interface CurvePointReading {
  m: number;
  label: string;
  y: number;
  /** Change on the previous day, basis points. */
  d1?: number;
  /** Carry and roll-down over three months, basis points (maturities of a year or more). */
  carry?: number;
  roll?: number;
}

export interface FullCurveReading {
  ok: true;
  area: CurveArea;
  label: string;
  kind: 'par' | 'spot';
  source: string;
  date: string;
  prevDate?: string;
  points: CurvePointReading[];
  fit?: NssFit & { curve: Array<{ m: number; y: number }> };
  monthAgo?: { date: string; points: Array<{ m: number; y: number }> };
  factors?: Factors & { d1?: Factors; d21?: Factors };
  /** Oldest first: level, slope and curvature each day. */
  history: Array<{ date: string } & Factors>;
  pulledAt?: string;
}

export type FullCurveOutcome = FullCurveReading | { ok: false; area: CurveArea; reason: string; source: string };

export function maturityLabel(m: number): string {
  if (m < 1) return `${Math.round(m * 12)}M`;
  return Number.isInteger(m) ? `${m}Y` : `${Math.round(m * 12)}M`;
}

const pointsOf = (d: CurveDay) =>
  Object.entries(d.yields)
    .map(([k, y]) => ({ m: Number(k), y }))
    .filter((p) => Number.isFinite(p.m) && p.m > 0)
    .sort((a, b) => a.m - b.m);

const diff = (a: Factors, b: Factors): Factors => ({ level: bp(a.level - b.level), slope: bp(a.slope - b.slope), curvature: bp(a.curvature - b.curvature) });

/** Everything the panel shows for one curve, from the saved days. */
export function fullCurveReading(series: CurveSeries | undefined, pulledAt?: string): FullCurveOutcome {
  const area = series?.area ?? 'us';
  const info = CURVE_INFO[area];
  const days = series?.days ?? [];
  if (!days.length) return { ok: false, area, source: info.source, reason: `the ${area === 'us' ? 'Treasury' : 'ECB'} curve has not been downloaded yet (daily step world:curves)` };
  const last = days[days.length - 1];
  const prev = days[days.length - 2];
  const pts = pointsOf(last);
  const fit = fitNss(pts);
  const short = pts.find((p) => Math.abs(p.m - 0.25) < 1e-6)?.y ?? (fit ? nssYield(fit, 0.25) : undefined);
  const points: CurvePointReading[] = pts.map((p) => {
    const out: CurvePointReading = { m: p.m, label: maturityLabel(p.m), y: p.y };
    const before = prev?.yields[key(p.m)];
    if (typeof before === 'number') out.d1 = bp(p.y - before);
    if (fit && p.m >= 1 && short !== undefined) {
      out.carry = bp((p.y - short) * 0.25);
      const yShorter = nssYield(fit, p.m - 0.25);
      out.roll = bp(parDuration(p.m - 0.25, yShorter) * (nssYield(fit, p.m) - yShorter));
    }
    return out;
  });
  const curve = fit ? Array.from({ length: 60 }, (_, i) => 0.25 + (i * (pts[pts.length - 1].m - 0.25)) / 59).map((m) => ({ m: r2(m), y: r2(nssYield(fit, m)) })) : [];
  const ago = days.length > 21 ? days[days.length - 22] : undefined;
  const history = days.map((d) => ({ date: d.date, f: factorsOf(d) })).filter((x): x is { date: string; f: Factors } => !!x.f).map((x) => ({ date: x.date, ...x.f }));
  const fNow = factorsOf(last);
  const fPrev = prev && factorsOf(prev);
  const fAgo = ago && factorsOf(ago);
  return {
    ok: true,
    area,
    label: info.label,
    kind: info.kind,
    source: info.source,
    date: last.date,
    ...(prev ? { prevDate: prev.date } : {}),
    points,
    ...(fit ? { fit: { ...fit, curve } } : {}),
    ...(ago ? { monthAgo: { date: ago.date, points: pointsOf(ago) } } : {}),
    ...(fNow ? { factors: { ...fNow, ...(fPrev ? { d1: diff(fNow, fPrev) } : {}), ...(fAgo ? { d21: diff(fNow, fAgo) } : {}) } } : {}),
    history,
    ...(pulledAt ? { pulledAt } : {}),
  };
}

/** One plain sentence on the latest curve. */
export function fullCurveSentence(r: FullCurveReading): string {
  const f = r.factors;
  if (!f) return `${r.label} on ${r.date}: ${r.points.length} maturities.`;
  const shape = f.slope < 0 ? 'inverted (10-year below 2-year)' : 'upward sloping (10-year above 2-year)';
  const move = f.d1 ? `; on the day the 10-year moved ${f.d1.level > 0 ? '+' : ''}${f.d1.level} bp and the 10y-2y slope ${f.d1.slope > 0 ? '+' : ''}${f.d1.slope} bp` : '';
  return `${r.label} on ${r.date}: 10-year ${f.level}%, ${shape} by ${Math.abs(bp(f.slope))} bp${move}.`;
}

/** Euro area members in 2026 (Bulgaria joined on 1 January 2026): their pages open on the ECB curve. */
export const EURO_AREA_ISO3 = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP'];
export const defaultCurveArea = (iso3: string): CurveArea => (EURO_AREA_ISO3.includes(String(iso3).toUpperCase()) ? 'ea' : 'us');
