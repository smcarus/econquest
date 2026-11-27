/**
 * What this means for you (plan step PY2): your own inflation rate from your split of spending over
 * the official consumer price groups (src/utils/priceGroups.ts).
 *
 * Your rate = Σ (your share in a group ÷ 100) × the group's annual rate, for the newest month every
 * group you spend in has a figure. Each group's push is its term in that sum. Shares are scaled to
 * add up to 100 (the scaling is said). A group you spend in with no figure for any month makes the
 * whole rate Missing with the reason; nothing is filled in. The same sum with the official weights
 * is shown beside the published headline, so the gap that comes from the method can be seen.
 * A description of the past twelve months, not a forecast. Browser-safe, pure.
 */
import type { MonthValue } from './inflationDrivers';
import type { PriceGroup } from './priceGroups';

export interface GroupPush {
  id: string;
  sharePct: number;
  ratePct: number;
  /** points of your rate */
  push: number;
}

export interface PersonalRate {
  ok: true;
  period: string;
  ratePct: number;
  headlinePct?: number;
  /** your rate − headline, points */
  gapPts?: number;
  pushes: GroupPush[];
  /** True when the shares you entered did not add up to 100 and were scaled. */
  scaled: boolean;
  enteredTotal: number;
  /** The official basket worked out the same way, when there are official weights. */
  officialPct?: number;
  /** Your rate month by month (the chart), oldest first; months where a group you spend in has no figure are left out. */
  months: Array<{ period: string; you: number; headline?: number }>;
}

export type PersonalOutcome = PersonalRate | { ok: false; reason: string };

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;

/** Official weights scaled to 100, as the starting split; null when any group has no weight. */
export function officialShares(groups: PriceGroup[]): Record<string, number> | null {
  if (!groups.length || groups.some((g) => g.weightPct === undefined)) return null;
  const total = groups.reduce((a, g) => a + (g.weightPct as number), 0);
  if (!(total > 0)) return null;
  return Object.fromEntries(groups.map((g) => [g.id, r2(((g.weightPct as number) / total) * 100)]));
}

function rateAt(shares: Record<string, number>, total: number, maps: Map<string, Map<string, number>>, period: string): number | null {
  let sum = 0;
  for (const [id, s] of Object.entries(shares)) {
    if (!(s > 0)) continue;
    const v = maps.get(id)?.get(period);
    if (v === undefined) return null;
    sum += (s / total) * v;
  }
  return sum;
}

export function personalRate(groups: PriceGroup[], headline: MonthValue[], shares: Record<string, number>, labels: Record<string, string> = {}): PersonalOutcome {
  const clean = Object.fromEntries(Object.entries(shares).filter(([id, s]) => Number.isFinite(s) && s > 0 && groups.some((g) => g.id === id)));
  const enteredTotal = r2(Object.values(clean).reduce((a, b) => a + b, 0));
  if (!(enteredTotal > 0)) return { ok: false, reason: 'Enter how much of your spending goes to at least one group.' };
  if (Object.values(shares).some((s) => Number.isFinite(s) && s < 0)) return { ok: false, reason: 'A share cannot be below zero.' };
  const maps = new Map(groups.map((g) => [g.id, new Map(g.rates.map((p) => [p.period, p.value]))]));
  const noFigures = Object.keys(clean).filter((id) => !maps.get(id)?.size);
  if (noFigures.length) return { ok: false, reason: `No figures for ${noFigures.map((id) => labels[id] || id).join(', ')}, where you put part of your spending; set those to 0 or wait for the source.` };
  const hmap = new Map(headline.map((p) => [p.period, p.value]));
  const allPeriods = [...new Set(groups.flatMap((g) => g.rates.map((p) => p.period)))].sort();
  const months: PersonalRate['months'] = [];
  for (const p of allPeriods) {
    const v = rateAt(clean, enteredTotal, maps, p);
    if (v !== null) months.push({ period: p, you: r2(v), ...(hmap.has(p) ? { headline: hmap.get(p) } : {}) });
  }
  const last = months[months.length - 1];
  if (!last) return { ok: false, reason: 'The groups you spend in have no month in common yet.' };
  const pushes: GroupPush[] = Object.entries(clean)
    .map(([id, s]) => {
      const ratePct = maps.get(id)!.get(last.period)!;
      return { id, sharePct: r2((s / enteredTotal) * 100), ratePct, push: r2((s / enteredTotal) * ratePct) };
    })
    .sort((a, b) => Math.abs(b.push) - Math.abs(a.push));
  const official = officialShares(groups);
  const officialV = official ? rateAt(official, 100, maps, last.period) : null;
  return {
    ok: true,
    period: last.period,
    ratePct: last.you,
    ...(last.headline !== undefined ? { headlinePct: last.headline, gapPts: r2(last.you - last.headline) } : {}),
    pushes,
    scaled: Math.abs(enteredTotal - 100) > 0.05,
    enteredTotal,
    ...(officialV !== null ? { officialPct: r2(officialV) } : {}),
    months: months.slice(-24),
  };
}
