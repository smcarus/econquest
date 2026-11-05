import React, { useEffect, useMemo, useState } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { missingReason } from '../utils/liveFigures';
import { peerBasisNote, peerScreen, type RvLabel } from '../utils/marketsMacro';
import { benchmarkRows, marketEdgePeers, type MarketEdgeAnchorsReply } from '../utils/marketEdgeAnchors';
import { formatPeriod } from '../utils/officialYields';
import { byMovingMost, cliTrendText, policyMoveText, signedBps, trendFor, trendForObservation, type MarketTrend } from '../utils/marketTrends';

const RV_CLASS: Record<RvLabel, string> = {
  cheap: 'text-emerald-700 dark:text-emerald-400',
  rich: 'text-rose-700 dark:text-rose-400',
  'in line': 'text-slate-600 dark:text-slate-400',
};

let anchorsRequest: Promise<MarketEdgeAnchorsReply | null> | null = null;

/** The always-shown benchmarks (US, China, Russia, UK, EU, India), fetched once per page load. */
export function useMarketEdgeAnchors(): MarketEdgeAnchorsReply | null {
  const [data, setData] = useState<MarketEdgeAnchorsReply | null>(null);
  useEffect(() => {
    let live = true;
    anchorsRequest ??= fetch('/api/data/market-edge-anchors')
      .then((r) => (r.ok ? (r.json() as Promise<MarketEdgeAnchorsReply>) : null))
      .catch(() => null)
      .then((d) => {
        if (!d) anchorsRequest = null; // try again next time
        return d;
      });
    void anchorsRequest.then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/**
 * MarketEdge screen: the watchlist sorted from cheapest to richest 5Y CDS for its risk score,
 * then the benchmarks that are always shown. Used on Today and on the Country page.
 */
export const MarketEdgeScreen: React.FC<{
  watchlist: LiveWatchlistItem[];
  anchors: MarketEdgeAnchorsReply | null;
  /** The country open on the Country page, highlighted. */
  highlightIso3?: string;
  onOpenCountry: (item: LiveWatchlistItem) => void;
  title?: string;
  /** Shown under the title before the model note. */
  intro?: string;
}> = ({ watchlist, anchors, highlightIso3, onOpenCountry, title = 'MarketEdge', intro }) => {
  const peers = useMemo(() => marketEdgePeers(watchlist, anchors?.peers || []), [watchlist, anchors]);
  const us = anchors?.us10Y;
  const [sortBy, setSortBy] = useState<'value' | 'moving'>('value');
  const screen = useMemo(() => peerScreen(peers, us?.valuePct), [peers, us]);
  const { fit, realFit, basis } = screen;
  const trendByIso = useMemo(() => new Map(peers.map((p) => [p.iso3, trendFor(p, us)])), [peers, us]);
  const rows = useMemo(
    () => (sortBy === 'moving' ? byMovingMost(screen.rows, (r) => trendByIso.get(r.iso3) || {}) : screen.rows),
    [screen, sortBy, trendByIso]
  );
  const bench = useMemo(() => benchmarkRows(anchors?.anchors || [], peers.map((p) => p.iso3), us?.valuePct), [anchors, peers, us]);
  const benchTrend = useMemo(
    () =>
      new Map(
        (anchors?.anchors || []).map((a) => [
          a.iso3,
          trendForObservation(a.yield, us, a.cli ? { level: a.cli.level, change1m: a.cli.change1m, phase: a.cli.phase, month: a.cli.month } : undefined, a.iso3 === 'USA'),
        ])
      ),
    [anchors, us]
  );
  const anchorIso = new Set((anchors?.anchors || []).map((a) => a.iso3));

  return (
    <section className="ui-panel" data-market-edge="true" data-no-provenance-overlay="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title">{title}</h3>
        <p className="ui-label">
          {intro ? `${intro} ` : ''}
          {peerBasisNote(basis, fit, realFit)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs" role="group" aria-label="Sort MarketEdge">
          <span className="text-slate-500 dark:text-slate-400">Sort:</span>
          {(
            [
              ['value', 'Cheap to rich'],
              ['moving', 'Moving most (3m yield change)'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              data-edge-sort={k}
              aria-pressed={sortBy === k}
              onClick={() => setSortBy(k)}
              className={`px-2 py-0.5 border ${sortBy === k ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2 text-left font-normal">Country</th>
              <th className="px-3 py-2 text-right font-normal">10Y yield</th>
              <th
                className="hidden md:table-cell px-3 py-2 text-right font-normal"
                title={us ? `US 10Y ${us.valuePct.toFixed(2)}%, OECD via FRED, ${formatPeriod(us.period)} avg` : 'US 10Y not available'}
              >
                Over US 10Y
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-right font-normal" title="Change in the 10Y yield against 3 and 12 months earlier (monthly averages). Spread change is against the US 10Y over the same 3 months.">
                Change 3m · 12m
              </th>
              <th className="px-3 py-2 text-right font-normal">5Y CDS</th>
              <th className="hidden sm:table-cell px-3 py-2 text-right font-normal">Risk score</th>
              <th className="hidden lg:table-cell px-3 py-2 text-right font-normal" title="BIS real broad effective exchange rate against its 10-year average">
                Real FX vs 10y avg
              </th>
              <th className="hidden xl:table-cell px-3 py-2 text-right font-normal" title="OECD Composite Leading Indicator: phase by the OECD rule on level and monthly change">Leading ind.</th>
              <th className="hidden xl:table-cell px-3 py-2 text-right font-normal" title="The latest change in the policy rate in the BIS monthly series">Last policy move</th>
              <th className="px-4 py-2 text-right font-normal">{basis === 'real_yield' ? 'Real yield vs peers' : 'CDS vs peers'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const item = peers.find((p) => p.iso3 === r.iso3);
              return (
                <tr
                  key={r.iso3}
                  data-edge-row={r.iso3}
                  className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    r.iso3 === highlightIso3 ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                  }`}
                  onClick={() => item && onOpenCountry(item)}
                >
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                    {r.countryName}
                    {anchorIso.has(r.iso3) && !watchlist.some((w) => w.iso3 === r.iso3) && (
                      <div className="text-xs font-normal text-slate-500 dark:text-slate-400">Always shown</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className={`tabular-nums ${r.yield10YPct === undefined ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.yield10YPct !== undefined ? `${r.yield10YPct.toFixed(2)}%` : '–'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={r.yield10YPct === undefined ? missingReason('yield', r.iso3).help : undefined}>{r.yieldNote}</div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">{r.spreadBps !== undefined ? `${r.spreadBps} bps` : '–'}</td>
                  <TrendCells t={trendByIso.get(r.iso3)} part="change" />
                  <td className="px-3 py-2 text-right">
                    <div className={`tabular-nums ${r.cdsBps === undefined ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.cdsBps !== undefined ? `${Math.round(r.cdsBps)} bps` : '–'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={r.cdsBps === undefined ? missingReason('cds', r.iso3).help : undefined}>{r.cdsNote}</div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums">{r.risk !== undefined ? r.risk.toFixed(2) : <span className="text-slate-400 dark:text-slate-500" title={missingReason('risk', r.iso3).help}>–</span>}</td>
                  <td className="hidden lg:table-cell px-3 py-2 text-right">
                    <div className="tabular-nums">{item?.reerGapPct !== undefined ? `${item.reerGapPct >= 0 ? '+' : ''}${item.reerGapPct.toFixed(0)}%` : '–'}</div>
                    {item?.reerPeriod && <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">BIS, {formatPeriod(item.reerPeriod)}</div>}
                  </td>
                  <TrendCells t={trendByIso.get(r.iso3)} part="cycle" />
                  {basis === 'real_yield' ? (
                    <td
                      className={`px-4 py-2 text-right whitespace-nowrap ${r.realRv ? RV_CLASS[r.realRv.label] : ''}`}
                      title={r.realYieldPct !== undefined ? `Real 10Y yield ${r.realYieldPct.toFixed(1)}% against about ${r.realRv?.fittedPct.toFixed(1)}% for its risk score` : 'Needs a 10Y yield, inflation and a risk score'}
                    >
                      {r.realRv ? `${r.realRv.gapPts >= 0 ? '+' : ''}${r.realRv.gapPts.toFixed(1)} pts ${r.realRv.label}` : '–'}
                    </td>
                  ) : (
                    <td className={`px-4 py-2 text-right whitespace-nowrap ${r.rv ? RV_CLASS[r.rv.label] : ''}`}>
                      {r.rv ? `${r.rv.gapPct >= 0 ? '+' : ''}${r.rv.gapPct.toFixed(0)}% ${r.rv.label}` : '–'}
                    </td>
                  )}
                </tr>
              );
            })}
            {bench.length > 0 && (
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <td colSpan={10} className="px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Benchmarks, always shown. No risk score in the app yet, so they are not in the cheap or rich fit.
                </td>
              </tr>
            )}
            {bench.map((b) => (
              <tr key={b.iso3} data-edge-row={b.iso3} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                  {b.countryName}
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400" title="OECD Composite Leading Indicator, amplitude adjusted (long-term average = 100); phase by the OECD rule on level and monthly change">
                    {b.cliNote}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="tabular-nums">{b.yieldPct !== undefined ? `${b.yieldPct.toFixed(2)}%` : '–'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{b.yieldNote}</div>
                </td>
                <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">
                  {b.iso3 === 'USA' && b.yieldPct !== undefined ? 'benchmark' : b.spreadBps !== undefined ? `${b.spreadBps} bps` : '–'}
                </td>
                <TrendCells t={benchTrend.get(b.iso3)} part="change" />
                <td className="px-3 py-2 text-right">
                  <div className="tabular-nums">{b.cdsBps !== undefined ? `${Math.round(b.cdsBps)} bps` : '–'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{b.cdsNote}</div>
                </td>
                <td className="hidden sm:table-cell px-3 py-2 text-right">–</td>
                <td className="hidden lg:table-cell px-3 py-2 text-right">–</td>
                <TrendCells t={benchTrend.get(b.iso3)} part="cycle" />
                <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">–</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {anchors ? '' : 'Loading the benchmarks. '}
        Changes are moves in the sourced series, not forecasts. Model readings for discussion, not trade advice. Local-currency yields differ partly because inflation differs; the risk score is the app's own model.
      </p>
    </section>
  );
};

const MUTED = 'text-slate-400 dark:text-slate-500';

/** Trend cells: "change" = 3m and 12m yield change plus spread change; "cycle" = leading indicator and last policy move. */
const TrendCells: React.FC<{ t?: MarketTrend; part: 'change' | 'cycle' }> = ({ t, part }) => {
  if (part === 'change')
    return (
      <td className="hidden md:table-cell px-3 py-2 text-right whitespace-nowrap" data-edge-trend="change">
        <div className={`tabular-nums ${t?.yieldChg3mBps === undefined ? MUTED : ''}`}>
          {t?.yieldChg3mBps === undefined && t?.yieldChg12mBps === undefined
            ? '–'
            : `${t?.yieldChg3mBps !== undefined ? signedBps(t.yieldChg3mBps) : '–'} · ${t?.yieldChg12mBps !== undefined ? signedBps(t.yieldChg12mBps) : '–'}`}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400" title={t?.yieldChg3mBps === undefined ? 'Needs an official monthly yield with 3 months of history' : undefined}>
          {t?.spreadChg3mBps !== undefined ? `Spread 3m ${signedBps(t.spreadChg3mBps)}` : t?.yieldChg3mBps === undefined ? 'No monthly history' : ''}
        </div>
      </td>
    );
  return (
    <>
      <td className="hidden xl:table-cell px-3 py-2 text-right whitespace-nowrap text-xs" data-edge-trend="cli">
        {t?.cli ? cliTrendText(t.cli) : <span className={MUTED}>–</span>}
      </td>
      <td className="hidden xl:table-cell px-3 py-2 text-right whitespace-nowrap text-xs tabular-nums" data-edge-trend="policy">
        {t?.policyMove ? policyMoveText(t.policyMove) : <span className={MUTED}>–</span>}
      </td>
    </>
  );
};
