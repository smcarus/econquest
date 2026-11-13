/**
 * Trade-off chart (G37): costed fiscal options (utils/costedOptions.ts) and what-if results the user
 * kept (utils/fiscalWhatIf.ts) on two axes the user picks, for example debt at the horizon against
 * output lost. Each item is drawn from its low-multiplier end to its high-multiplier end, so the
 * length of the line is the range the published multipliers allow. An item whose two ends are the
 * same on both axes has no range, and the chart says so; an axis an item has no figure for leaves the
 * item off the chart with the reason.
 *
 * Only the app's own calculations on stated assumptions: not a forecast, not a recommendation.
 * Browser-safe, pure.
 */
import type { CostedOptions } from './costedOptions';
import type { WhatIfRun } from './fiscalWhatIf';

export const TRADE_OFF_AXES = ['debt_end', 'debt_vs_baseline', 'output_cost', 'growth_first', 'pb_change'] as const;
export type TradeOffAxis = (typeof TRADE_OFF_AXES)[number];

export interface Range {
  low: number;
  high: number;
}

export interface TradeOffItem {
  id: string;
  label: string;
  kind: 'baseline' | 'option' | 'whatif';
  horizonYear: string;
  /** Each axis at the low-multiplier and the high-multiplier end; null when the item has no such figure. */
  values: Record<TradeOffAxis, Range | null>;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const pt = (v: number): Range => ({ low: r2(v), high: r2(v) });
const rg = (low: number, high: number): Range => ({ low: r2(low), high: r2(high) });

/** The baseline and each costed option. First-year growth is not kept by the costing, so it is null. */
export function itemsFromCosted(c: CostedOptions): TradeOffItem[] {
  const base: TradeOffItem = {
    id: 'baseline',
    label: 'Baseline',
    kind: 'baseline',
    horizonYear: c.horizonYear,
    values: { debt_end: pt(c.baselineEnd), debt_vs_baseline: pt(0), output_cost: pt(0), growth_first: pt(0), pb_change: pt(0) },
  };
  return [
    base,
    ...c.options.map((o) => ({
      id: `opt-${o.option.id}`,
      label: o.option.label,
      kind: 'option' as const,
      horizonYear: c.horizonYear,
      values: {
        debt_end: rg(o.endLow, o.endHigh),
        debt_vs_baseline: rg(o.vsBaselineLow, o.vsBaselineHigh),
        output_cost: rg(o.outputCostLow, o.outputCostHigh),
        growth_first: null,
        pb_change: pt(o.option.sizePts),
      },
    })),
  ];
}

/** One what-if run (one use of the money). Output cost = the fall in the output level, so a gain is negative. */
export function itemFromWhatIf(id: string, label: string, r: WhatIfRun): TradeOffItem {
  return {
    id,
    label,
    kind: 'whatif',
    horizonYear: r.debtEnd.year,
    values: {
      debt_end: rg(r.debtEnd.low, r.debtEnd.high),
      debt_vs_baseline: rg(r.debtEnd.low - r.debtEnd.baseline, r.debtEnd.high - r.debtEnd.baseline),
      output_cost: rg(-r.level.low, -r.level.high),
      growth_first: rg(r.growth.low, r.growth.high),
      pb_change: pt(r.pbChangePp),
    },
  };
}

export interface ChartItem {
  item: TradeOffItem;
  /** Low-multiplier end and high-multiplier end. */
  a: { x: number; y: number };
  b: { x: number; y: number };
  hasRange: boolean;
}

export interface TradeOffChart {
  plotted: ChartItem[];
  /** Items left off, with the axis they have no figure for. */
  left: Array<{ item: TradeOffItem; axis: TradeOffAxis }>;
  /** Horizon years differ between items: their debt figures are for different years. */
  mixedHorizon: boolean;
  x: { min: number; max: number };
  y: { min: number; max: number };
}

/** Points to plot on the two axes picked, with a padded extent that always includes 0. */
export function tradeOffChart(items: TradeOffItem[], xAxis: TradeOffAxis, yAxis: TradeOffAxis): TradeOffChart {
  const plotted: ChartItem[] = [];
  const left: TradeOffChart['left'] = [];
  for (const item of items) {
    const x = item.values[xAxis];
    const y = item.values[yAxis];
    if (!x) {
      left.push({ item, axis: xAxis });
      continue;
    }
    if (!y) {
      left.push({ item, axis: yAxis });
      continue;
    }
    plotted.push({ item, a: { x: x.low, y: y.low }, b: { x: x.high, y: y.high }, hasRange: x.low !== x.high || y.low !== y.high });
  }
  const ext = (vals: number[]) => {
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const pad = (hi - lo || 1) * 0.08;
    return { min: r2(lo - pad), max: r2(hi + pad) };
  };
  const xs = plotted.flatMap((p) => [p.a.x, p.b.x]);
  const ys = plotted.flatMap((p) => [p.a.y, p.b.y]);
  const horizons = new Set(plotted.map((p) => p.item.horizonYear));
  return { plotted, left, mixedHorizon: horizons.size > 1, x: ext(xs), y: ext(ys) };
}

/** Up to `n` round tick values across [min, max]. */
export function ticks(min: number, max: number, n = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(r2(v));
  return out;
}
