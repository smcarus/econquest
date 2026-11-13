import React, { useEffect, useMemo, useState } from 'react';
import type { CostedOptions } from '../utils/costedOptions';
import { TRADE_OFF_AXES, itemsFromCosted, ticks, tradeOffChart, type TradeOffAxis } from '../utils/tradeOff';
import { keptWhatIfs, onKeptChange, removeWhatIf } from '../utils/tradeOffStore';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Debt sustainability > Trade-off chart (G37, src/utils/tradeOff.ts): the costed options and any
 * what-if results kept from the chat, on two axes the user picks. Each line runs from the item's
 * low-multiplier end (open circle) to its high-multiplier end (filled circle).
 */

const AXIS_KEY = {
  debt_end: 'to_ax_debt_end',
  debt_vs_baseline: 'to_ax_debt_vs_baseline',
  output_cost: 'to_ax_output_cost',
  growth_first: 'to_ax_growth_first',
  pb_change: 'to_ax_pb_change',
} as const satisfies Record<TradeOffAxis, string>;

const W = 560;
const H = 300;
const M = { l: 48, r: 16, t: 12, b: 40 };
const COLOR = { baseline: 'var(--to-base, #64748b)', option: '#2563eb', whatif: '#9333ea' } as const;

export const TradeOffChart: React.FC<{ iso3: string; costed: CostedOptions }> = ({ iso3, costed }) => {
  const t = useT(PANELS);
  const tx = useTx();
  const [xAxis, setX] = useState<TradeOffAxis>('output_cost');
  const [yAxis, setY] = useState<TradeOffAxis>('debt_end');
  const [, bump] = useState(0);
  useEffect(() => onKeptChange(() => bump((n) => n + 1)), []);
  const kept = keptWhatIfs(iso3);
  const items = useMemo(() => [...itemsFromCosted(costed), ...kept], [costed, kept]);
  const c = tradeOffChart(items, xAxis, yAxis);
  const sx = (v: number) => M.l + ((v - c.x.min) / (c.x.max - c.x.min || 1)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - c.y.min) / (c.y.max - c.y.min || 1)) * (H - M.t - M.b);
  const label = (s: string) => (s === 'Baseline' ? t('dsa_baselineRow') : tx(s));
  const select = (value: TradeOffAxis, set: (a: TradeOffAxis) => void, aria: string) => (
    <select className="px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" value={value} onChange={(e) => set(e.target.value as TradeOffAxis)} aria-label={aria}>
      {TRADE_OFF_AXES.map((a) => (
        <option key={a} value={a}>
          {t(AXIS_KEY[a])}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2" data-trade-off="true">
      <h3 className="text-sm font-medium text-slate-900 dark:text-white">{t('to_title')}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">{t('to_intro')}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          {t('to_across')} {select(xAxis, setX, t('to_across'))}
        </label>
        <label className="flex items-center gap-1">
          {t('to_up')} {select(yAxis, setY, t('to_up'))}
        </label>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl h-auto text-slate-500 dark:text-slate-400" role="img" aria-label={t('to_aria', { x: t(AXIS_KEY[xAxis]), y: t(AXIS_KEY[yAxis]) })}>
        {ticks(c.x.min, c.x.max).map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} stroke="currentColor" strokeOpacity={v === 0 ? 0.6 : 0.15} />
            <text x={sx(v)} y={H - M.b + 14} fontSize="10" textAnchor="middle" fill="currentColor">
              {v}
            </text>
          </g>
        ))}
        {ticks(c.y.min, c.y.max).map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="currentColor" strokeOpacity={v === 0 ? 0.6 : 0.15} />
            <text x={M.l - 6} y={sy(v) + 3} fontSize="10" textAnchor="end" fill="currentColor">
              {v}
            </text>
          </g>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="currentColor">
          {t(AXIS_KEY[xAxis])}
        </text>
        {c.plotted.map((p, i) => (
          <g key={p.item.id} data-trade-off-item={p.item.id}>
            <line x1={sx(p.a.x)} y1={sy(p.a.y)} x2={sx(p.b.x)} y2={sy(p.b.y)} stroke={COLOR[p.item.kind]} strokeWidth={2.5} />
            <circle cx={sx(p.a.x)} cy={sy(p.a.y)} r={4} fill="white" stroke={COLOR[p.item.kind]} strokeWidth={2} />
            <circle cx={sx(p.b.x)} cy={sy(p.b.y)} r={4} fill={COLOR[p.item.kind]} />
            <text x={sx(p.b.x) + 6} y={sy(p.b.y) - 6} fontSize="10" fill={COLOR[p.item.kind]}>
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('to_upLabel', { y: t(AXIS_KEY[yAxis]) })}</p>
      <ol className="text-xs space-y-0.5 list-decimal pl-5">
        {c.plotted.map((p) => (
          <li key={p.item.id} style={{ color: COLOR[p.item.kind] }}>
            <span className="text-slate-800 dark:text-slate-200">
              {label(p.item.label)}: {t(AXIS_KEY[xAxis])} {p.a.x === p.b.x ? p.a.x : `${p.a.x} ${t('to_to')} ${p.b.x}`}; {t(AXIS_KEY[yAxis])} {p.a.y === p.b.y ? p.a.y : `${p.a.y} ${t('to_to')} ${p.b.y}`}
              {!p.hasRange && p.item.kind !== 'baseline' ? ` (${t('to_noRange')})` : ''}
              {p.item.kind === 'whatif' && (
                <button type="button" className="ml-2 underline text-slate-500" onClick={() => removeWhatIf(iso3, p.item.id)}>
                  {t('to_remove')}
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      {c.left.map((l) => (
        <p key={l.item.id} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
          {t('to_left', { item: label(l.item.label), axis: t(AXIS_KEY[l.axis]) })}
        </p>
      ))}
      {c.mixedHorizon && <p className="text-xs text-amber-700 dark:text-amber-400">{t('to_mixed')}</p>}
      {!kept.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('to_noWhatIf')}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('to_note')}</p>
    </div>
  );
};
