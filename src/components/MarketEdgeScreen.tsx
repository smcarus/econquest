import React, { useEffect, useMemo, useState } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { missingReason } from '../utils/liveFigures';
import { peerScreen, type RvLabel } from '../utils/marketsMacro';
import { benchmarkRows, marketEdgePeers, type MarketEdgeAnchorsReply } from '../utils/marketEdgeAnchors';
import { formatPeriod } from '../utils/officialYields';

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
  const { rows, fit } = useMemo(() => peerScreen(peers, us?.valuePct), [peers, us]);
  const bench = useMemo(() => benchmarkRows(anchors?.anchors || [], peers.map((p) => p.iso3), us?.valuePct), [anchors, peers, us]);
  const anchorIso = new Set((anchors?.anchors || []).map((a) => a.iso3));

  return (
    <section className="ui-panel" data-market-edge="true" data-no-provenance-overlay="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title">{title}</h3>
        <p className="ui-label">
          {intro ? `${intro} ` : ''}
          {fit
            ? `Sorted from cheapest to richest 5Y CDS for its risk score. Model: log CDS fitted on the app's risk score across ${fit.n} countries; more than 15% above the fit counts as cheap, more than 15% below as rich.`
            : 'The cheap or rich reading needs 4 or more countries with a CDS figure.'}
        </p>
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
              <th className="px-3 py-2 text-right font-normal">5Y CDS</th>
              <th className="hidden sm:table-cell px-3 py-2 text-right font-normal">Risk score</th>
              <th className="hidden lg:table-cell px-3 py-2 text-right font-normal" title="BIS real broad effective exchange rate against its 10-year average">
                Real FX vs 10y avg
              </th>
              <th className="px-4 py-2 text-right font-normal">CDS vs peers</th>
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
                  <td className="px-3 py-2 text-right">
                    <div className={`tabular-nums ${r.cdsBps === undefined ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.cdsBps !== undefined ? `${Math.round(r.cdsBps)} bps` : '–'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={r.cdsBps === undefined ? missingReason('cds', r.iso3).help : undefined}>{r.cdsNote}</div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums">{r.risk !== undefined ? r.risk.toFixed(2) : <span className="text-slate-400 dark:text-slate-500" title={missingReason('risk', r.iso3).help}>–</span>}</td>
                  <td className="hidden lg:table-cell px-3 py-2 text-right">
                    <div className="tabular-nums">{item?.reerGapPct !== undefined ? `${item.reerGapPct >= 0 ? '+' : ''}${item.reerGapPct.toFixed(0)}%` : '–'}</div>
                    {item?.reerPeriod && <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">BIS, {formatPeriod(item.reerPeriod)}</div>}
                  </td>
                  <td className={`px-4 py-2 text-right whitespace-nowrap ${r.rv ? RV_CLASS[r.rv.label] : ''}`}>
                    {r.rv ? `${r.rv.gapPct >= 0 ? '+' : ''}${r.rv.gapPct.toFixed(0)}% ${r.rv.label}` : '–'}
                  </td>
                </tr>
              );
            })}
            {bench.length > 0 && (
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <td colSpan={7} className="px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Benchmarks, always shown. No risk score in the app yet, so they are not in the cheap or rich fit.
                </td>
              </tr>
            )}
            {bench.map((b) => (
              <tr key={b.iso3} data-edge-row={b.iso3} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{b.countryName}</td>
                <td className="px-3 py-2 text-right">
                  <div className="tabular-nums">{b.yieldPct !== undefined ? `${b.yieldPct.toFixed(2)}%` : '–'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{b.yieldNote}</div>
                </td>
                <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">
                  {b.iso3 === 'USA' && b.yieldPct !== undefined ? 'benchmark' : b.spreadBps !== undefined ? `${b.spreadBps} bps` : '–'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="tabular-nums">{b.cdsBps !== undefined ? `${Math.round(b.cdsBps)} bps` : '–'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{b.cdsNote}</div>
                </td>
                <td className="hidden sm:table-cell px-3 py-2 text-right">–</td>
                <td className="hidden lg:table-cell px-3 py-2 text-right">–</td>
                <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">–</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {anchors ? '' : 'Loading the benchmarks. '}
        Model readings for discussion, not trade advice. Local-currency yields differ partly because inflation differs; the risk score is the app's own model.
      </p>
    </section>
  );
};
