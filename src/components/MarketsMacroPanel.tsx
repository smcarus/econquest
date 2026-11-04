import React, { useMemo } from 'react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { marketsMacroBrief, type RvLabel } from '../utils/marketsMacro';
import { BriefGroups, BriefSummary } from './CountryBriefPanel';

const RV_CLASS: Record<RvLabel, string> = {
  cheap: 'text-emerald-700 dark:text-emerald-400',
  rich: 'text-rose-700 dark:text-rose-400',
  'in line': 'text-slate-600 dark:text-slate-400',
};

/**
 * Country page > Markets & macro: the economy, market pricing and simple model readings of where
 * they disagree, then the same readings across the watchlist.
 */
export const MarketsMacroPanel: React.FC<{
  run: CouncilAssessmentRun;
  peers: WatchlistItem[];
  onOpenCountry: (item: WatchlistItem) => void;
}> = ({ run, peers, onOpenCountry }) => {
  const brief = useMemo(() => marketsMacroBrief(run, peers), [run, peers]);
  const { rows, fit } = brief.screen;
  const us = run.openData.us10YYield;

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true" data-markets-macro="true">
      <section className="ui-panel">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">Markets & macro</h2>
          <p className="ui-label">What the economy is doing, what markets are pricing, and where the two disagree.</p>
        </header>
        <BriefSummary brief={brief} />
      </section>
      <BriefGroups brief={brief} />

      <section className="ui-panel">
        <header className="ui-panel-header">
          <h3 className="ui-section-title">Peer screen</h3>
          <p className="ui-label">
            Your watchlist, sorted from cheapest to richest 5Y CDS for its risk score.{' '}
            {fit
              ? `Model: log CDS fitted on the app's risk score across ${fit.n} countries; more than 15% above the fit counts as cheap, more than 15% below as rich.`
              : 'The cheap or rich reading needs 4 or more countries with a CDS figure.'}
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 text-left font-normal">Country</th>
                <th className="px-3 py-2 text-right font-normal">10Y yield</th>
                <th className="hidden md:table-cell px-3 py-2 text-right font-normal" title={us ? `US 10Y ${us.valuePct.toFixed(2)}%, OECD via FRED` : undefined}>
                  Over US 10Y
                </th>
                <th className="px-3 py-2 text-right font-normal">5Y CDS</th>
                <th className="hidden sm:table-cell px-3 py-2 text-right font-normal">Risk score</th>
                <th className="px-4 py-2 text-right font-normal">CDS vs peers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const item = peers.find((p) => p.iso3 === r.iso3);
                return (
                  <tr
                    key={r.iso3}
                    className={`border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      r.iso3 === run.iso3 ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                    }`}
                    onClick={() => item && onOpenCountry(item)}
                  >
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{r.countryName}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="tabular-nums">{r.yield10YPct.toFixed(2)}%</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.yieldNote}</div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2 text-right tabular-nums">{r.spreadBps !== undefined ? `${r.spreadBps} bps` : '–'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="tabular-nums">{Math.round(r.cdsBps)} bps</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.cdsNote}</div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2 text-right tabular-nums">{r.risk.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right whitespace-nowrap ${r.rv ? RV_CLASS[r.rv.label] : ''}`}>
                      {r.rv ? `${r.rv.gapPct >= 0 ? '+' : ''}${r.rv.gapPct.toFixed(0)}% ${r.rv.label}` : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          Model readings for discussion, not trade advice. Local-currency yields differ partly because inflation differs; the risk score is the app's own model.
        </p>
      </section>
    </div>
  );
};
