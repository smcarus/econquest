import { CDS_HIDDEN } from '../utils/cdsHidden';
import React, { useEffect, useMemo, useState } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { missingReason } from '../utils/liveFigures';
import { peerScreen } from '../utils/marketsMacro';
import { benchmarkRows, marketEdgePeers, type MarketEdgeAnchorsReply } from '../utils/marketEdgeAnchors';
import { formatPeriod } from '../utils/officialYields';
import { requiredCredit } from '../data/requiredCredits';
import { SourceCredits } from './SourceCredits';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import { byMovingMost, cliTrendText, policyMoveText, signedBps, trendFor, trendForObservation, type MarketTrend } from '../utils/marketTrends';

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
 * MarketEdge screen: the watchlist sorted from the widest to the narrowest spread over US Treasuries,
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
  const t = useT(TOOLS);
  const tx = useTx();
  const peers = useMemo(() => marketEdgePeers(watchlist, anchors?.peers || []), [watchlist, anchors]);
  const us = anchors?.us10Y;
  const [sortBy, setSortBy] = useState<'value' | 'moving'>('value');
  const screen = useMemo(() => peerScreen(peers, us?.valuePct), [peers, us]);
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
    <section className="ui-panel" data-market-edge="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title">{title}</h3>
        <p className="ui-label">
          {intro ? `${tx(intro)} ` : ''}
          {t('me_intro')}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs" role="group" aria-label={t('me_sortAria')}>
          <span className="text-slate-500 dark:text-slate-400">{t('me_sort')}</span>
          {(
            [
              ['value', t('me_widest')],
              ['moving', t('me_moving')],
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
              <th className="px-4 py-2 text-left font-normal">{t('me_country')}</th>
              <th className="px-3 py-2 text-right font-normal">{t('me_yield')}</th>
              <th
                className="hidden md:table-cell px-3 py-2 text-right font-normal"
                title={us ? t('me_usTip', { v: us.valuePct.toFixed(2), period: formatPeriod(us.period) }) : t('me_usNone')}
              >
                {t('me_overUs')}
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-right font-normal" title={t('me_changeTip')}>
                {t('me_change')}
              </th>
              {!CDS_HIDDEN && <th className="px-3 py-2 text-right font-normal">{t('me_cds')}</th>}
              <th className="hidden lg:table-cell px-3 py-2 text-right font-normal" title={t('me_reerTip')}>
                {t('me_reer')}
              </th>
              <th className="hidden xl:table-cell px-3 py-2 text-right font-normal" title={t('me_cliTip')}>{t('me_cli')}</th>
              <th className="hidden xl:table-cell px-3 py-2 text-right font-normal" title={t('me_policyTip')}>{t('me_policy')}</th>
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
                      <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{t('me_always')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className={`tabular-nums ${r.yield10YPct === undefined ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.yield10YPct !== undefined ? `${r.yield10YPct.toFixed(2)}%` : '–'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={r.yield10YPct === undefined ? tx(missingReason('yield', r.iso3).help) : undefined}>{tx(r.yieldNote)}</div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">{r.spreadBps !== undefined ? `${r.spreadBps} bps` : '–'}</td>
                  <TrendCells t={trendByIso.get(r.iso3)} part="change" />
                  {!CDS_HIDDEN && (
                    <td className="px-3 py-2 text-right">
                      <div className={`tabular-nums ${r.cdsBps === undefined ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.cdsBps !== undefined ? `${Math.round(r.cdsBps)} bps` : '–'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={r.cdsBps === undefined ? tx(missingReason('cds', r.iso3).help) : undefined}>{tx(r.cdsNote)}</div>
                    </td>
                  )}
                  <td className="hidden lg:table-cell px-3 py-2 text-right">
                    <div className="tabular-nums">{item?.reerGapPct !== undefined ? `${item.reerGapPct >= 0 ? '+' : ''}${item.reerGapPct.toFixed(0)}%` : '–'}</div>
                    {item?.reerPeriod && <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">BIS, {formatPeriod(item.reerPeriod)}</div>}
                  </td>
                  <TrendCells t={trendByIso.get(r.iso3)} part="cycle" />
                </tr>
              );
            })}
            {bench.length > 0 && (
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <td colSpan={CDS_HIDDEN ? 7 : 8} className="px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('me_bench')}
                </td>
              </tr>
            )}
            {bench.map((b) => (
              <tr key={b.iso3} data-edge-row={b.iso3} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                  {b.countryName}
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400" title={t('me_cliNoteTip')}>
                    {tx(b.cliNote)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="tabular-nums">{b.yieldPct !== undefined ? `${b.yieldPct.toFixed(2)}%` : '–'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{tx(b.yieldNote)}</div>
                </td>
                <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">
                  {b.iso3 === 'USA' && b.yieldPct !== undefined ? t('me_benchmark') : b.spreadBps !== undefined ? `${b.spreadBps} bps` : '–'}
                </td>
                <TrendCells t={benchTrend.get(b.iso3)} part="change" />
                {!CDS_HIDDEN && (
                  <td className="px-3 py-2 text-right">
                    <div className="tabular-nums">{b.cdsBps !== undefined ? `${Math.round(b.cdsBps)} bps` : '–'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{tx(b.cdsNote)}</div>
                  </td>
                )}
                <td className="hidden lg:table-cell px-3 py-2 text-right">–</td>
                <TrendCells t={benchTrend.get(b.iso3)} part="cycle" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {anchors ? '' : t('me_loading')}
        {t('me_foot')}
      </p>
      {us && <SourceCredits credits={[requiredCredit('fred')]} className="px-4 pb-2" />}
    </section>
  );
};

const MUTED = 'text-slate-400 dark:text-slate-500';

/** Trend cells: "change" = 3m and 12m yield change plus spread change; "cycle" = leading indicator and last policy move. */
const TrendCells: React.FC<{ t?: MarketTrend; part: 'change' | 'cycle' }> = ({ t, part }) => {
  const tt = useT(TOOLS);
  const tx = useTx();
  if (part === 'change')
    return (
      <td className="hidden md:table-cell px-3 py-2 text-right whitespace-nowrap" data-edge-trend="change">
        <div className={`tabular-nums ${t?.yieldChg3mBps === undefined ? MUTED : ''}`}>
          {t?.yieldChg3mBps === undefined && t?.yieldChg12mBps === undefined
            ? '–'
            : `${t?.yieldChg3mBps !== undefined ? signedBps(t.yieldChg3mBps) : '–'} · ${t?.yieldChg12mBps !== undefined ? signedBps(t.yieldChg12mBps) : '–'}`}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400" title={t?.yieldChg3mBps === undefined ? tt('me_needHist') : undefined}>
          {t?.spreadChg3mBps !== undefined ? tt('me_spread3m', { v: signedBps(t.spreadChg3mBps) }) : t?.yieldChg3mBps === undefined ? tt('me_noHist') : ''}
        </div>
      </td>
    );
  return (
    <>
      <td className="hidden xl:table-cell px-3 py-2 text-right whitespace-nowrap text-xs" data-edge-trend="cli">
        {t?.cli ? tx(cliTrendText(t.cli)) : <span className={MUTED}>–</span>}
      </td>
      <td className="hidden xl:table-cell px-3 py-2 text-right whitespace-nowrap text-xs tabular-nums" data-edge-trend="policy">
        {t?.policyMove ? policyMoveText(t.policyMove) : <span className={MUTED}>–</span>}
      </td>
    </>
  );
};
