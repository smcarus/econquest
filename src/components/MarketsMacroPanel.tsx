import React, { useMemo } from 'react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { toLive } from '../utils/liveFigures';
import { marketsMacroBrief } from '../utils/marketsMacro';
import { marketEdgePeers } from '../utils/marketEdgeAnchors';
import { BriefGroups, BriefSummary } from './CountryBriefPanel';
import { useMarketEdgeAnchors } from './MarketEdgeScreen';
import type { BriefRow } from '../utils/countryNotes';

/** Rows the Brief tab already shows; MarketEdge leaves them out of its first group. */
const ON_BRIEF = new Set(['Real GDP growth', 'CPI inflation', 'Primary balance', 'Debt / GDP', 'Current account', 'FX reserves']);

/** The MarketEdge groups under three headings. A group not named here goes under the last one. */
const SECTIONS: { title: string; groups: string[] }[] = [
  {
    title: 'Economy and policy',
    groups: ['Macro now', 'Central Bank Watcher Agent', 'Cycle clock', 'OECD inflation (monthly)', 'OECD leading indicator (monthly)', 'Reserves and balance of payments (IMF)'],
  },
  {
    title: 'Markets and positioning',
    groups: ['Market pricing', 'Relative Value Agent', 'FX Valuation Agent', 'Futures positioning (CFTC, weekly)', 'US Treasury holdings (TIC, monthly)', 'World reserve currencies (IMF COFER, quarterly)'],
  },
  { title: 'Risks and links', groups: [] },
];

/**
 * Country page > MarketEdge: the economy, market pricing and simple model readings of where
 * they disagree, in three sections. The same readings across the watchlist are on Compare.
 */
export const MarketsMacroPanel: React.FC<{
  run: CouncilAssessmentRun;
  peers: WatchlistItem[];
  onOpenCountry: (item: WatchlistItem) => void;
  /** Opens Compare, where the peer screen lives. */
  onOpenCompare?: () => void;
}> = ({ run, peers, onOpenCompare }) => {
  const anchors = useMarketEdgeAnchors();
  // Peers without their built-in figures (utils/liveFigures.ts).
  const livePeers = useMemo(() => peers.map(toLive), [peers]);
  const allPeers = useMemo(() => marketEdgePeers(livePeers, anchors?.peers || []), [livePeers, anchors]);
  const brief = useMemo(() => marketsMacroBrief(run, allPeers), [run, allPeers]);
  const sections = useMemo(() => {
    const named = new Set(SECTIONS.flatMap((x) => x.groups));
    const groups = brief.groups.map((g) =>
      g.title === 'Macro now'
        ? { ...g, title: 'Policy rate and inflation target', rows: g.rows.filter((r: BriefRow) => !ON_BRIEF.has(r.label)) }
        : g
    );
    return SECTIONS.map((sec, i) => ({
      title: sec.title,
      groups: brief.groups
        .map((g, k) => ({ g: groups[k], orig: g.title }))
        .filter(({ orig }) => (i === SECTIONS.length - 1 ? !named.has(orig) : sec.groups.includes(orig)))
        .sort((a, b) => (sec.groups.length ? sec.groups.indexOf(a.orig) - sec.groups.indexOf(b.orig) : 0))
        .map(({ g }) => g),
    }));
  }, [brief]);

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true" data-markets-macro="true">
      <section className="ui-panel">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">MarketEdge</h2>
          <p className="ui-label">What the economy is doing, what markets are pricing, and where the two disagree.</p>
        </header>
        <BriefSummary brief={brief} />
      </section>
      {sections.map((sec) =>
        sec.groups.length ? (
          <div key={sec.title} className="space-y-2">
            <h3 className="ui-section-title pt-2">{sec.title}</h3>
            <BriefGroups brief={{ ...brief, groups: sec.groups }} />
          </div>
        ) : null
      )}

      <div className="ui-panel px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="ui-body">{run.countryName} against the rest of your watchlist and the benchmark markets is on Compare.</p>
        {onOpenCompare && (
          <button type="button" className="ui-btn" onClick={onOpenCompare}>
            Open Compare
          </button>
        )}
      </div>
    </div>
  );
};
