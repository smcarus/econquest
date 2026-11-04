import React, { useMemo } from 'react';
import { Upload } from 'lucide-react';
import type { WatchlistItem } from '../types/council';
import { yieldSourceHelp, yieldSourceNote } from '../utils/watchlistYield';
import type { StagedTradeTicketSpec } from '../utils/nssYieldCurveAndCatalystEngine';
import { summariseBook, type Holding } from '../utils/holdings';

/**
 * Top of the Portfolio page: what the book holds and where the risk sits.
 * With holdings imported, weights are by gross notional. Without them, the book is the
 * watchlist at equal weight, and the page says so.
 */

interface PortfolioSummaryProps {
  watchlistItems: WatchlistItem[];
  /** Watchlist plus the full catalogue, for risk scores of held countries. */
  riskLookup: WatchlistItem[];
  holdings: Holding[];
  stagedTickets: StagedTradeTicketSpec[];
  onOpenCountry: (item: WatchlistItem) => void;
  onManageHoldings: () => void;
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

const fmtMm = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 0 : 1 })}mm`;
const signed = (v: number, f: (x: number) => string) => (v < 0 ? `−${f(-v)}` : f(v));

interface Row {
  iso3: string;
  countryName: string;
  item?: WatchlistItem;
  weight: number;
  riskShare: number;
  grossUsdMm?: number;
  netCreditUsdMm?: number;
  dv01UsdK?: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  watchlistItems,
  riskLookup,
  holdings,
  stagedTickets,
  onOpenCountry,
  onManageHoldings,
}) => {
  const hasHoldings = holdings.length > 0;

  const s = useMemo(() => {
    if (hasHoldings) {
      const book = summariseBook(holdings, riskLookup);
      const covered = book.rows.filter((r) => r.item);
      const wCovered = covered.reduce((a, r) => a + r.weight, 0) || 1;
      const avg = (f: (i: WatchlistItem) => number) => covered.reduce((a, r) => a + f(r.item!) * (r.weight / wCovered), 0);
      return {
        rows: book.rows as Row[],
        book,
        avgCds: avg((i) => i.cds5YBps),
        avgRisk: avg((i) => i.compositeRisk),
        highRisk: covered.filter((r) => r.item!.alertStatus === 'CRITICAL').length,
        sampleCount: covered.filter((r) => !r.item!.dataMode || r.item!.dataMode === 'sample' || r.item!.dataMode === 'unverified').length,
        countries: book.rows.length,
      };
    }
    const n = watchlistItems.length || 1;
    const riskTotal = watchlistItems.reduce((a, i) => a + i.compositeRisk, 0) || 1;
    const avg = (f: (i: WatchlistItem) => number) => watchlistItems.reduce((a, i) => a + f(i) / n, 0);
    return {
      rows: [...watchlistItems]
        .map((i) => ({ iso3: i.iso3, countryName: i.countryName, item: i, weight: 1 / n, riskShare: i.compositeRisk / riskTotal }))
        .sort((a, b) => b.riskShare - a.riskShare) as Row[],
      book: null,
      avgCds: avg((i) => i.cds5YBps),
      avgRisk: avg((i) => i.compositeRisk),
      highRisk: watchlistItems.filter((i) => i.alertStatus === 'CRITICAL').length,
      sampleCount: watchlistItems.filter((i) => !i.dataMode || i.dataMode === 'sample' || i.dataMode === 'unverified').length,
      countries: watchlistItems.length,
    };
  }, [hasHoldings, holdings, riskLookup, watchlistItems]);

  if (!hasHoldings && watchlistItems.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="ui-body">No holdings and an empty watchlist. Import holdings to see your book.</p>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onManageHoldings}>
          <Upload className="w-3.5 h-3.5" /> Import holdings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ui-label">
          {hasHoldings
            ? `Your holdings: ${holdings.length} position${holdings.length === 1 ? '' : 's'}, weighted by gross notional.`
            : 'No holdings loaded, so this shows your watchlist at equal weight.'}
          {s.sampleCount > 0 && ` Risk figures for ${s.sampleCount} ${s.sampleCount === 1 ? 'country are' : 'countries are'} sample values, not live data.`}
        </p>
        <button type="button" className={hasHoldings ? 'ui-btn' : 'ui-btn ui-btn-primary'} onClick={onManageHoldings}>
          <Upload className="w-3.5 h-3.5" /> {hasHoldings ? 'Edit holdings' : 'Import holdings'}
        </button>
      </div>

      {hasHoldings && s.book ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <Stat label="Gross notional" value={fmtMm(s.book.grossUsdMm)} note={`${s.countries} ${s.countries === 1 ? 'country' : 'countries'}`} />
          <Stat
            label="Net credit exposure"
            value={signed(s.book.netCreditUsdMm, fmtMm)}
            note="Long bonds and sold protection, less hedges"
          />
          <Stat
            label="Credit DV01"
            value={`${signed(s.book.dv01UsdK, (v) => `$${v.toFixed(1)}k`)} / bp`}
            note={s.book.missingDuration ? `${s.book.missingDuration} position${s.book.missingDuration === 1 ? '' : 's'} without duration left out` : 'Loss per 1 bp wider spreads'}
          />
          <Stat
            label="Weighted 5Y CDS"
            value={`${s.avgCds.toFixed(0)} bps`}
            note={s.highRisk ? `${s.highRisk} high-risk ${s.highRisk === 1 ? 'country' : 'countries'}` : `Risk score ${s.avgRisk.toFixed(2)}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <Stat label="Countries" value={String(s.countries)} note={`${(100 / (s.countries || 1)).toFixed(0)}% each`} />
          <Stat label="Average 5Y CDS" value={`${s.avgCds.toFixed(0)} bps`} />
          <Stat label="Average risk score" value={s.avgRisk.toFixed(2)} />
          <Stat label="High-risk countries" value={String(s.highRisk)} />
        </div>
      )}

      {s.book && s.book.uncovered.length > 0 && (
        <p className="ui-label">
          No risk data for {s.book.uncovered.join(', ')} yet. These positions count in notional and DV01 but not in the risk share.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Where the book's risk sits</caption>
            <thead>
              <tr className="ui-label text-left border-b border-slate-100 dark:border-slate-800">
                <th className="py-1.5 pr-3 font-normal">Country</th>
                <th className="py-1.5 pr-3 font-normal">Risk</th>
                {hasHoldings && <th className="py-1.5 pr-3 font-normal text-right">Net credit</th>}
                {hasHoldings && <th className="py-1.5 pr-3 font-normal text-right">DV01 ($k/bp)</th>}
                <th className="py-1.5 pr-3 font-normal text-right">10Y yield</th>
                <th className="py-1.5 pr-3 font-normal text-right">Weight</th>
                <th className="py-1.5 pr-3 font-normal text-right">Share of risk</th>
                <th className="py-1.5 font-normal w-1/4 hidden sm:table-cell" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr
                  key={r.iso3}
                  className={`border-b border-slate-50 dark:border-slate-800/60 ${r.item ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer' : ''}`}
                  onClick={() => r.item && onOpenCountry(r.item)}
                >
                  <td className="py-1.5 pr-3 text-slate-900 dark:text-white whitespace-nowrap">{r.countryName}</td>
                  <td className="py-1.5 pr-3">
                    {r.item ? (
                      <span className={ALERT_BADGE[r.item.alertStatus]}>
                        {ALERT_LABEL[r.item.alertStatus]} · {r.item.compositeRisk.toFixed(2)}
                      </span>
                    ) : (
                      <span className="ui-badge">No data</span>
                    )}
                  </td>
                  {hasHoldings && (
                    <td className="py-1.5 pr-3 text-right ui-num whitespace-nowrap">{signed(r.netCreditUsdMm ?? 0, fmtMm)}</td>
                  )}
                  {hasHoldings && (
                    <td className="py-1.5 pr-3 text-right ui-num">{signed(r.dv01UsdK ?? 0, (v) => v.toFixed(1))}</td>
                  )}
                  <td className="py-1.5 pr-3 text-right" title={r.item ? yieldSourceHelp(r.item) : undefined}>
                    {r.item ? (
                      <>
                        <span className="ui-num">{r.item.yield10YPct.toFixed(2)}%</span>
                        <span
                          className={`block text-xs whitespace-nowrap ${
                            r.item.yield10YSource === 'official'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {yieldSourceNote(r.item)}
                        </span>
                      </>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right ui-num">{(r.weight * 100).toFixed(0)}%</td>
                  <td className="py-1.5 pr-3 text-right ui-num">{r.item ? `${(r.riskShare * 100).toFixed(0)}%` : '–'}</td>
                  <td className="py-1.5 hidden sm:table-cell">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-1.5 ${
                          r.item?.alertStatus === 'CRITICAL' ? 'bg-rose-500' : r.item?.alertStatus === 'ELEVATED' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.round(r.riskShare * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ui-label mt-1">
            Share of risk = weight × the country's risk score, as a share of the book total.{' '}
            {(() => {
              const items = s.rows.filter((r) => r.item);
              const official = items.filter((r) => r.item!.yield10YSource === 'official').length;
              return `${official} of ${items.length} yields are official figures; the rest are sample values or estimates.`;
            })()}{' '}
            Click a row to open the country.
          </p>
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
