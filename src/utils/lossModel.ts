/**
 * Disaster loss history and a frequency-severity loss model (I1 + I2, Sam 2026-11-14), from the
 * EM-DAT file the user saves in data/local/emdat/ (src/utils/disasters.ts). Nothing is shipped.
 *
 * I1, loss history: for every year from EMDAT_FROM to the latest year in the file, the number of
 * events, the events that report damage, damage in US dollars of today (EM-DAT's adjusted figure),
 * damage as % of that year's GDP (nominal damage over IMF GDP), people affected and deaths; the
 * average yearly loss.
 *
 * I2, frequency and severity, the standard actuarial split of a yearly loss into how many events and
 * how large each is:
 * - frequency: events with a damage figure per year. Poisson when the yearly counts are not much more
 *   spread out than their mean (variance / mean up to 1.5), otherwise negative binomial by the method
 *   of moments (disasters often come in clusters). Chance of at least one such event in a year.
 * - severity: damage per event (US$ bn of today), lognormal fitted on the logs (maximum likelihood):
 *   median, mean, and the event passed 1 time in 10 and 1 in 100; a check of the fitted 90th
 *   percentile against the record's.
 * - yearly loss: 20,000 simulated years (fixed seed) of a frequency draw and that many severity draws:
 *   average yearly loss and the yearly loss passed 1 year in 10, 50 and 100, also as % of the latest
 *   GDP.
 *
 * Limits stated in the panel: many EM-DAT events carry no damage figure, so losses are understated;
 * reporting has improved over time; the lognormal can understate the largest events.
 * Browser-safe, pure.
 */
import { EMDAT_FROM, type DisasterEvent } from './disasters';

export const LOSS_MIN_YEARS = 10;
export const SEVERITY_MIN_EVENTS = 5;
export const SIM_YEARS = 20000;
export const ALL_TYPES = 'All natural disasters';

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export interface LossYear {
  year: number;
  events: number;
  withDamage: number;
  /** US$ bn of today (EM-DAT adjusted), over the events that report it. */
  damageAdj: number;
  /** Nominal damage over GDP that year, %. */
  damagePctGdp?: number;
  affected: number;
  deaths: number;
}

export interface LossModel {
  type: string;
  from: number;
  to: number;
  years: LossYear[];
  events: number;
  withDamage: number;
  /** Average yearly damage, US$ bn of today. */
  averageLoss: number;
  frequency: {
    /** Events with a damage figure per year. */
    mean: number;
    variance: number;
    dispersion: number;
    model: 'poisson' | 'negative_binomial';
    /** Negative binomial size r and probability p (failures before r-th success parametrisation). */
    r?: number;
    p?: number;
    /** Chance of at least one damaging event in a year, %. */
    atLeastOnePct: number;
  };
  severity?: {
    n: number;
    mu: number;
    sigma: number;
    median: number;
    mean: number;
    p90: number;
    p99: number;
    /** The record's 90th percentile of event damage, to check the fit. */
    recordP90: number;
  };
  annual?: {
    mean: number;
    p90: number;
    p98: number;
    p99: number;
    /** The same as % of the latest GDP. */
    pctGdp?: { mean: number; p90: number; p98: number; p99: number; gdpYear: number };
    /** Share of simulated years with no damaging event, %. */
    zeroPct: number;
  };
  /** Why the frequency-severity model is not shown, when it is not. */
  noModel?: string;
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

/** Standard normal draw (Box-Muller). */
function normal(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Inverse standard normal CDF (Acklam's rational approximation, relative error below 1.2e-9). */
export function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Poisson draw (Knuth for small means, normal approximation above 30). */
function poisson(rnd: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(rnd)));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

/** Gamma(shape, 1) draw (Marsaglia-Tsang; boosted for shape below 1). */
function gammaDraw(rnd: () => number, shape: number): number {
  if (shape < 1) return gammaDraw(rnd, shape + 1) * Math.max(rnd(), 1e-12) ** (1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rnd);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rnd();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

const quant = (sorted: number[], p: number) => {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (sorted[Math.ceil(h)] - sorted[lo]) * (h - lo);
};

/** Loss history and frequency-severity model for one set of events (one type, or all). */
export function lossModel(
  type: string,
  events: DisasterEvent[],
  latestYear: number,
  gdp: Map<number, number>,
): LossModel | null {
  const from = EMDAT_FROM;
  const to = latestYear;
  if (to - from + 1 < LOSS_MIN_YEARS) return null;
  const evs = events.filter((e) => e.year >= from && e.year <= to);
  const years: LossYear[] = [];
  for (let y = from; y <= to; y++) {
    const list = evs.filter((e) => e.year === y);
    const dmg = list.filter((e) => (e.damageAdj ?? 0) > 0);
    const nominal = list.filter((e) => e.damage !== undefined).reduce((a, e) => a + e.damage!, 0);
    const g = gdp.get(y);
    years.push({
      year: y,
      events: list.length,
      withDamage: dmg.length,
      damageAdj: r3(dmg.reduce((a, e) => a + e.damageAdj!, 0)),
      ...(g && g > 0 && list.some((e) => e.damage !== undefined) ? { damagePctGdp: r2((nominal / g) * 100) } : {}),
      affected: list.reduce((a, e) => a + (e.affected ?? 0), 0),
      deaths: list.reduce((a, e) => a + (e.deaths ?? 0), 0),
    });
  }
  const n = years.length;
  const counts = years.map((y) => y.withDamage);
  const mean = counts.reduce((a, b) => a + b, 0) / n;
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const dispersion = mean > 0 ? variance / mean : 0;
  const nb = dispersion > 1.5 && variance > mean;
  const r = nb ? (mean * mean) / (variance - mean) : undefined;
  const p = nb ? r! / (r! + mean) : undefined;
  const atLeastOne = nb ? 1 - p! ** r! : 1 - Math.exp(-mean);
  const out: LossModel = {
    type,
    from,
    to,
    years,
    events: evs.length,
    withDamage: counts.reduce((a, b) => a + b, 0),
    averageLoss: r3(years.reduce((a, y) => a + y.damageAdj, 0) / n),
    frequency: {
      mean: r2(mean),
      variance: r2(variance),
      dispersion: r2(dispersion),
      model: nb ? 'negative_binomial' : 'poisson',
      ...(nb ? { r: r2(r!), p: r3(p!) } : {}),
      atLeastOnePct: r2(atLeastOne * 100),
    },
  };
  const sizes = evs.map((e) => e.damageAdj).filter((v): v is number => v !== undefined && v > 0);
  if (sizes.length < SEVERITY_MIN_EVENTS) {
    out.noModel = `Fewer than 5 events with a damage figure, so no severity fit`;
    return out;
  }
  const logs = sizes.map(Math.log);
  const mu = logs.reduce((a, b) => a + b, 0) / logs.length;
  const sigma = Math.sqrt(logs.reduce((a, b) => a + (b - mu) ** 2, 0) / logs.length);
  if (!(sigma > 0)) {
    out.noModel = 'Every event reports the same damage, so no severity fit';
    return out;
  }
  const sorted = [...sizes].sort((a, b) => a - b);
  out.severity = {
    n: sizes.length,
    mu: r3(mu),
    sigma: r3(sigma),
    median: r3(Math.exp(mu)),
    mean: r3(Math.exp(mu + (sigma * sigma) / 2)),
    p90: r3(Math.exp(mu + sigma * normInv(0.9))),
    p99: r3(Math.exp(mu + sigma * normInv(0.99))),
    recordP90: r3(quant(sorted, 0.9)),
  };
  // Simulated years.
  const rnd = seeded(sizes.length * 104729 + n * 31 + Math.round(mean * 1000));
  const sims = new Float64Array(SIM_YEARS);
  let zeros = 0;
  for (let i = 0; i < SIM_YEARS; i++) {
    const k = nb ? poisson(rnd, (gammaDraw(rnd, r!) * (1 - p!)) / p!) : poisson(rnd, mean);
    if (!k) zeros++;
    let loss = 0;
    for (let j = 0; j < k; j++) loss += Math.exp(mu + sigma * normal(rnd));
    sims[i] = loss;
  }
  const s = Array.from(sims).sort((a, b) => a - b);
  const annual = { mean: r3(s.reduce((a, b) => a + b, 0) / SIM_YEARS), p90: r3(quant(s, 0.9)), p98: r3(quant(s, 0.98)), p99: r3(quant(s, 0.99)) };
  const gdpYears = [...gdp.keys()].filter((y) => y <= to && (gdp.get(y) ?? 0) > 0).sort((a, b) => b - a);
  const g = gdpYears.length ? gdp.get(gdpYears[0])! : undefined;
  out.annual = {
    ...annual,
    ...(g ? { pctGdp: { mean: r2((annual.mean / g) * 100), p90: r2((annual.p90 / g) * 100), p98: r2((annual.p98 / g) * 100), p99: r2((annual.p99 / g) * 100), gdpYear: gdpYears[0] } } : {}),
    zeroPct: r2((zeros / SIM_YEARS) * 100),
  };
  return out;
}

/** Models for all natural disasters and for each type with at least one event. */
export function lossModels(events: DisasterEvent[], latestYear: number, gdp: Map<number, number>): LossModel[] {
  const out: LossModel[] = [];
  const all = lossModel(ALL_TYPES, events, latestYear, gdp);
  if (all) out.push(all);
  const types = [...new Set(events.filter((e) => e.year >= EMDAT_FROM).map((e) => e.type))].sort();
  for (const t of types) {
    const m = lossModel(
      t,
      events.filter((e) => e.type === t),
      latestYear,
      gdp,
    );
    if (m) out.push(m);
  }
  return out;
}

/** One English sentence for Explain. */
export function lossSentence(m: LossModel): string {
  const f = m.frequency;
  const base = `${m.type}, ${m.from}-${m.to}: ${m.withDamage} of ${m.events} events report damage; average yearly loss US$ ${m.averageLoss} bn of today; damaging events per year ${f.mean} (${f.model === 'poisson' ? 'Poisson' : `negative binomial, variance ${f.variance}`}), chance of at least one in a year ${f.atLeastOnePct}%.`;
  if (!m.severity || !m.annual) return base;
  return `${base} Event damage lognormal: median US$ ${m.severity.median} bn, 1 in 100 events US$ ${m.severity.p99} bn. Simulated yearly loss: average US$ ${m.annual.mean} bn, 1 year in 10 US$ ${m.annual.p90} bn, 1 in 100 US$ ${m.annual.p99} bn${m.annual.pctGdp ? ` (${m.annual.pctGdp.p99}% of ${m.annual.pctGdp.gdpYear} GDP)` : ''}.`;
}
