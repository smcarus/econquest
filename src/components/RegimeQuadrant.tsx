import { ValidationBadge } from './ValidationBadge';
import { ChartGuide } from './HelpLevel';
import React, { useMemo } from 'react';
import { Compass } from 'lucide-react';
import { CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { LiveWatchlistItem } from '../types/council';
import { QUADRANT_NOTE, regimeMap, type RegimePoint } from '../utils/regimeQuadrant';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';

/**
 * Workspace > Growth and inflation: each watchlist country placed by the 6-month change in its
 * OECD leading indicator and the 3-month change in its monthly inflation. Countries without both
 * figures are listed with what is missing, never placed.
 */
const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;

export const RegimeQuadrant: React.FC<{ items: LiveWatchlistItem[]; onOpenCountry?: (item: LiveWatchlistItem) => void }> = ({ items, onOpenCountry }) => {
  const t = useT(TOOLS);
  const tx = useTx();
  const { points, missing } = useMemo(() => regimeMap(items), [items]);
  const span = useMemo(() => {
    const m = Math.max(0.5, ...points.map((p) => Math.abs(p.growthPts)), ...points.map((p) => Math.abs(p.inflationPts)));
    return Math.ceil(m * 1.2 * 2) / 2;
  }, [points]);

  return (
    <section className="ui-panel" data-regime-quadrant="true">
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {t('rq_title')}
            <ValidationBadge id="regime_quadrant" />
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('rq_intro')}
          </p>
          <ChartGuide id="regime" className="pt-1" />
        </div>
      </header>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          {points.length === 0 ? (
            <p className="ui-body">{t('rq_none')}</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis type="number" dataKey="growthPts" domain={[-span, span]} tick={{ fontSize: 12 }} label={{ value: t('rq_xAxis'), position: 'insideBottom', offset: -12, fontSize: 12 }} />
                  <YAxis type="number" dataKey="inflationPts" domain={[-span, span]} tick={{ fontSize: 12 }} width={48} label={{ value: t('rq_yAxis'), angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <ReferenceLine x={0} stroke="#64748b" />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Tooltip
                    content={({ payload }) => {
                      const p = payload?.[0]?.payload as RegimePoint | undefined;
                      if (!p) return null;
                      return (
                        <div className="ui-panel px-2 py-1 text-xs">
                          <div className="font-medium">{p.countryName}</div>
                          <div>{t('rq_tipCli', { v: sg(p.growthPts), month: p.cliMonth })}</div>
                          <div>{t('rq_tipCpi', { v: sg(p.inflationPts), month: p.cpiMonth, source: tx(p.cpiSource) })}</div>
                          <div>{tx(p.quadrant)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={points} fill="#2563eb" isAnimationActive={false}>
                    <LabelList dataKey="iso3" position="top" fontSize={12} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 space-y-2">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {points.map((p) => {
              const item = items.find((i) => i.iso3 === p.iso3);
              return (
                <li key={p.iso3} className="py-1.5">
                  <button type="button" className="text-left w-full" onClick={() => item && onOpenCountry?.(item)}>
                    <div className="text-sm text-slate-900 dark:text-white">
                      {p.countryName}: <span className="font-medium">{tx(p.quadrant)}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t('rq_row', { g: sg(p.growthPts), gm: p.cliMonth, i: sg(p.inflationPts), im: p.cpiMonth })} {tx(QUADRANT_NOTE[p.quadrant])}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('rq_notPlaced')}</h3>
              <ul>
                {groupMissing(missing.map((m) => ({ name: m.countryName, reason: t('rq_missing', { list: m.missing.map((x) => tx(x)).join(t('rq_and')) }) }))).map((g) => (
                  <li key={g.reason} className="text-xs" data-missing="true">
                    <span className="text-slate-700 dark:text-slate-300">{g.names.join(', ')}</span>
                    <span className="text-amber-700 dark:text-amber-400">: {g.reason}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** One line per reason, naming every country it applies to. */
function groupMissing(rows: { name: string; reason: string }[]): { reason: string; names: string[] }[] {
  const by = new Map<string, string[]>();
  for (const r of rows) by.set(r.reason, [...(by.get(r.reason) || []), r.name]);
  return [...by].map(([reason, names]) => ({ reason, names }));
}
