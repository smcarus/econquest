import React, { useMemo } from 'react';
import type { WatchlistItem } from '../types/council';
import type { StagedTradeTicketSpec } from '../utils/nssYieldCurveAndCatalystEngine';

/**
 * Top of the Portfolio page: what the book holds and where the risk sits.
 * No holdings import exists yet, so the book is the watchlist at equal weight, and the
 * page says so. Figures carry the same data status as the watchlist rows.
 */

interface PortfolioSummaryProps {
  watchlistItems: WatchlistItem[];
  stagedTickets: StagedTradeTicketSpec[];
  onOpenCountry: (item: WatchlistItem) => void;
}

const ALERT_BADGE: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'ui-badge ui-badge-negative',
  ELEVATED: 'ui-badge ui-badge-warning',
  STABLE: 'ui-badge ui-badge-positive',
};
const ALERT_LABEL: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'High',
  ELEVATED: 'Elevated',
  STABLE: 'Stable',
};

const Stat: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="min-w-0">
    <div className="ui-label">{label}</div>
    <div className="text-lg font-semibold text-slate-900 dark:text-white ui-num">{value}</div>
    {note && <div className="ui-label">{note}</div>}
  </div>
);

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ watchlistItems, stagedTickets, onOpenCountry }) => {
  const s = useMemo(() => {
    const n = watchlistItems.length || 1;
    const w = 1 / n;
    const avg = (f: (i: WatchlistItem) => number) => watchlistItems.reduce((a, i) => a + f(i) * w, 0);
    const riskTotal = watchlistItems.reduce((a, i) => a + i.compositeRisk, 0) || 1;
    const rows = [...watchlistItems]
      .map((i) => ({ item: i, weight: w, riskShare: i.compositeRisk / riskTotal }))
      .sort((a, b) => b.riskShare - a.riskShare);
    const sampleCount = watchlistItems.filter((i) => !i.dataMode || i.dataMode === 'sample' || i.dataMode === 'unverified').length;
    return {
      avgCds: avg((i) => i.cds5YBps),
      avgYield: avg((i) => i.yield10YPct),
      avgRisk: avg((i) => i.compositeRisk),
      highRisk: watchlistItems.filter((i) => i.alertStatus === 'CRITICAL').length,
      rows,
      sampleCount,
    };
  }, [watchlistItems]);

  if (watchlistItems.length === 0) {
    return <p className="ui-body">Your watchlist is empty. Add countries to build a book.</p>;
  }

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true">
      <p className="ui-label">
        No holdings are loaded yet, so the book is your watchlist at equal weight.
        {s.sampleCount > 0 && ` ${s.sampleCount} of ${watchlistItems.length} countries show sample figures, not live data.`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
        <Stat label="Countries" value={String(watchlistItems.length)} note={`${(100 / watchlistItems.length).toFixed(0)}% each`} />
        <Stat label="Average 5Y CDS" value={`${s.avgCds.toFixed(0)} bps`} />
        <Stat label="Average 10Y yield" value={`${s.avgYield.toFixed(2)}%`} />
        <Stat
          label="Average risk score"
          value={s.avgRisk.toFixed(2)}
          note={s.highRisk ? `${s.highRisk} high-risk ${s.highRisk === 1 ? 'country' : 'countries'}` : 'No high-risk countries'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Where the book's risk sits</caption>
            <thead>
              <tr className="ui-label text-left border-b border-slate-100 dark:border-slate-800">
                <th className="py-1.5 pr-3 font-normal">Country</th>
                <th className="py-1.5 pr-3 font-normal">Risk</th>
                <th className="py-1.5 pr-3 font-normal text-right">Weight</th>
                <th className="py-1.5 pr-3 font-normal text-right">Share of risk</th>
                <th className="py-1.5 font-normal w-1/3 hidden sm:table-cell" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {s.rows.map(({ item, weight, riskShare }) => (
                <tr
                  key={item.iso3}
                  className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => onOpenCountry(item)}
                >
                  <td className="py-1.5 pr-3 text-slate-900 dark:text-white whitespace-nowrap">{item.countryName}</td>
                  <td className="py-1.5 pr-3">
                    <span className={ALERT_BADGE[item.alertStatus]}>
                      {ALERT_LABEL[item.alertStatus]} · {item.compositeRisk.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right ui-num">{(weight * 100).toFixed(0)}%</td>
                  <td className="py-1.5 pr-3 text-right ui-num">{(riskShare * 100).toFixed(0)}%</td>
                  <td className="py-1.5 hidden sm:table-cell">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-1.5 ${item.alertStatus === 'CRITICAL' ? 'bg-rose-500' : item.alertStatus === 'ELEVATED' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.round(riskShare * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ui-label mt-1">Share of risk = the country's risk score as a share of the book total. Click a row to open the country.</p>
        </div>

        <div>
          <div className="ui-section-title mb-1">Staged trade ideas</div>
          {stagedTickets.length === 0 ? (
            <p className="ui-label">None yet. Stage a ticket from Today or any desk.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stagedTickets.slice(0, 5).map((t) => (
                <li key={t.ticketId} className="py-1.5">
                  <div className="text-sm text-slate-900 dark:text-white truncate" title={t.strategyTitle}>
                    {t.strategyTitle}
                  </div>
                  <div className="ui-label">
                    {t.countryName} · conviction {t.convictionScore0To100}/100
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
