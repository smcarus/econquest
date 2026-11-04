import React, { useMemo } from 'react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { marketsMacroBrief } from '../utils/marketsMacro';
import { marketEdgePeers } from '../utils/marketEdgeAnchors';
import { BriefGroups, BriefSummary } from './CountryBriefPanel';
import { MarketEdgeScreen, useMarketEdgeAnchors } from './MarketEdgeScreen';

/**
 * Country page > MarketEdge: the economy, market pricing and simple model readings of where
 * they disagree, then the same readings across the watchlist.
 */
export const MarketsMacroPanel: React.FC<{
  run: CouncilAssessmentRun;
  peers: WatchlistItem[];
  onOpenCountry: (item: WatchlistItem) => void;
}> = ({ run, peers, onOpenCountry }) => {
  const anchors = useMarketEdgeAnchors();
  const allPeers = useMemo(() => marketEdgePeers(peers, anchors?.peers || []), [peers, anchors]);
  const brief = useMemo(() => marketsMacroBrief(run, allPeers), [run, allPeers]);

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true" data-markets-macro="true">
      <section className="ui-panel">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">MarketEdge</h2>
          <p className="ui-label">What the economy is doing, what markets are pricing, and where the two disagree.</p>
        </header>
        <BriefSummary brief={brief} />
      </section>
      <BriefGroups brief={brief} />

      <MarketEdgeScreen
        title="Peer screen"
        watchlist={peers}
        anchors={anchors}
        highlightIso3={run.iso3}
        onOpenCountry={onOpenCountry}
        intro="Your watchlist plus the markets always shown."
      />
    </div>
  );
};
