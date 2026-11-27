/**
 * What happened after, pooled (plan step SC6): every country that made one kind of change before the
 * As of year, each against its own twin, and the gaps put side by side year by year: the median gap,
 * the middle 80% across events (10th to 90th percentile) and how many events each year rests on.
 *
 * Each twin is fitted the same way as on the card (src/utils/syntheticControl.ts) but without the
 * placebo runs, so the pool is quick; events whose twin is Missing are counted by reason and left out.
 * Your own events are not pooled: each one is a different kind of change.
 *
 * Not validated: the spread across events says how much the gaps differ, not whether the average is
 * more than chance. The register keeps it Not validated until the pre-registered test passes.
 */
import { excludedFor, type EventKind, type PolicyEvent } from './policyEvents';
import { POST_YEARS, PRE_YEARS, syntheticControl, type SynthHistory, type SynthMissingReason, type SynthOutcome } from './syntheticControl';

/** At most this many events are fitted, newest first, so one request stays quick. */
export const MAX_POOLED = 300;
/** A year is shown only when at least this many events reach it. */
export const MIN_POOLED_PER_YEAR = 5;

export interface PooledYear {
  k: number;
  n: number;
  median: number;
  p10: number;
  p90: number;
}

export interface PooledResult {
  kind: Exclude<EventKind, 'own'>;
  outcome: SynthOutcome;
  asOf: string;
  /** Events of this kind before the As of year (all countries). */
  events: number;
  /** Events fitted (the newest MAX_POOLED when there are more). */
  tried: number;
  /** Events with a usable twin. */
  used: number;
  countries: number;
  missing: Partial<Record<SynthMissingReason, number>>;
  years: PooledYear[];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Linear-interpolated quantile of a sorted list. */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

export function pooledGaps(input: { kind: Exclude<EventKind, 'own'>; outcome: SynthOutcome; asOf: string; events: PolicyEvent[]; histories: SynthHistory[] }): PooledResult {
  const { kind, outcome, asOf, histories } = input;
  const lastYear = Number(asOf.slice(0, 4));
  const ofKind = input.events.filter((e) => e.kind === kind && e.year < lastYear).sort((a, b) => b.year - a.year || (a.iso3 < b.iso3 ? -1 : a.iso3 > b.iso3 ? 1 : 0));
  const tried = ofKind.slice(0, MAX_POOLED);
  const missing: PooledResult['missing'] = {};
  const byK = new Map<number, number[]>();
  const countries = new Set<string>();
  let used = 0;
  for (const e of tried) {
    const r = syntheticControl({ iso3: e.iso3, eventYear: e.year, asOf, outcome, histories, exclude: excludedFor(e, input.events), placebo: false });
    if (r.missing) {
      missing[r.missing.reason] = (missing[r.missing.reason] ?? 0) + 1;
      continue;
    }
    used += 1;
    countries.add(e.iso3);
    for (const p of r.path) {
      if (p.k < -PRE_YEARS || p.k > POST_YEARS) continue;
      const list = byK.get(p.k) ?? [];
      list.push(p.gap);
      byK.set(p.k, list);
    }
  }
  const years: PooledYear[] = [...byK.entries()]
    .filter(([, xs]) => xs.length >= MIN_POOLED_PER_YEAR)
    .sort((a, b) => a[0] - b[0])
    .map(([k, xs]) => {
      const s = [...xs].sort((a, b) => a - b);
      return { k, n: s.length, median: round(quantile(s, 0.5)), p10: round(quantile(s, 0.1)), p90: round(quantile(s, 0.9)) };
    });
  return { kind, outcome, asOf, events: ofKind.length, tried: tried.length, used, countries: countries.size, missing, years };
}
