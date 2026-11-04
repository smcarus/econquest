import React, { useMemo, useState } from 'react';
import { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import {
  buildMorningAlphaAndCatalystRadar,
  StagedTradeTicketSpec,
} from '../utils/nssYieldCurveAndCatalystEngine';
import {
  Radar,
  CalendarClock,
  ArrowUpRight,
  PlusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MorningAlphaAndCatalystRadarProps {
  activeRun: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  onSelectSovereignAndSection: (iso3: string, targetSectionId: string) => void;
  onStageTradeTicket: (ticket: StagedTradeTicketSpec) => void;
}

export const MorningAlphaAndCatalystRadar: React.FC<
  MorningAlphaAndCatalystRadarProps
> = ({
  activeRun,
  watchlistItems,
  onSelectSovereignAndSection,
  onStageTradeTicket,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const radarSuite = useMemo(
    () => buildMorningAlphaAndCatalystRadar(activeRun, watchlistItems),
    [activeRun, watchlistItems]
  );

  const topAlpha = radarSuite.topAlphaSignals[0];
  const nextCat = radarSuite.imminentCatalysts[0];

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95">
      {/* Compact 1-Line Morning Radar Ribbon */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold text-blue-600 dark:text-blue-400">
            <Radar className="w-3.5 h-3.5" />
            <span>Morning Alpha & Catalyst Radar</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            |
          </span>
          {topAlpha && (
            <div className="flex items-center gap-1.5 tabular-nums">
              <span className="text-slate-500 dark:text-slate-400">Top Carry+Roll:</span>
              <button
                type="button"
                onClick={() =>
                  onSelectSovereignAndSection(topAlpha.iso3, topAlpha.targetSectionId)
                }
                className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                {topAlpha.badgeLabel} ({topAlpha.headlineMetricBps})
              </button>
            </div>
          )}
          <span className="text-slate-300 dark:text-slate-700 hidden md:inline" aria-hidden="true">
            ·
          </span>
          {nextCat && (
            <div className="hidden md:flex items-center gap-1.5 tabular-nums">
              <CalendarClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-slate-500 dark:text-slate-400">Next Catalyst:</span>
              <button
                type="button"
                onClick={() =>
                  onSelectSovereignAndSection(
                    nextCat.iso3,
                    'quant_macro_catalyst_calendar'
                  )
                }
                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {nextCat.iso3} {nextCat.categoryBadge} in {nextCat.daysUntilEvent}d (±
                {nextCat.implied1DayYieldVolBps} bps vol)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {topAlpha && (
            <button
              type="button"
              onClick={() => onStageTradeTicket(topAlpha.ticketSpec)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Stage Top Alpha ({topAlpha.iso3})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <span>{isExpanded ? 'Hide Radar Grid' : 'Expand Top-3 Alpha & Catalysts'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded 2-Column Morning Alpha Dislocations & Catalyst Countdown Grid */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Top-3 Cross-Watchlist NSS Carry+Roll & Alpha Dislocations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                Top-3 Watchlist NSS Term-Structure & Carry+Roll Dislocations
              </span>
              <button
                type="button"
                onClick={() =>
                  onSelectSovereignAndSection(activeRun.iso3, 'quant_nss_yield_curve')
                }
                className="text-xs tabular-nums text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Open 5.7 NSS Yield Curve Lab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {radarSuite.topAlphaSignals.map((sig, i) => (
                <div
                  key={sig.signalId}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      <span>#{i + 1} ALPHA DISLOCATION</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {sig.iso3}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {sig.badgeLabel}
                    </div>
                    <div className="text-sm tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {sig.headlineMetricBps}
                    </div>
                    <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                      {sig.subText}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectSovereignAndSection(sig.iso3, sig.targetSectionId)
                      }
                      className="flex-1 px-2 py-1 text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center transition-colors"
                    >
                      Inspect Curve
                    </button>
                    <button
                      type="button"
                      onClick={() => onStageTradeTicket(sig.ticketSpec)}
                      className="ui-btn ui-btn-primary flex-1 text-center"
                    >
                      + Stage Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Next-3 Imminent Macro & Central Bank Catalysts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                Next-3 Imminent Watchlist Macro & Central Bank Catalysts
              </span>
              <button
                type="button"
                onClick={() =>
                  onSelectSovereignAndSection(
                    activeRun.iso3,
                    'quant_macro_catalyst_calendar'
                  )
                }
                className="text-xs tabular-nums text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Open 5.8 Catalyst Vol Calendar</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {radarSuite.imminentCatalysts.map((evt) => (
                <div
                  key={evt.eventId}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-xs tabular-nums">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        IN {evt.daysUntilEvent} DAYS ({evt.eventDateLabel})
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {evt.iso3}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {evt.categoryBadge}
                    </div>
                    <div className="text-xs tabular-nums font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      ±{evt.implied1DayYieldVolBps} bps Yield / ±{evt.implied1DayCdsVolBps} bps CDS
                    </div>
                    <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                      Model: {evt.econQuestModelForecastLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectSovereignAndSection(
                          evt.iso3,
                          'quant_macro_catalyst_calendar'
                        )
                      }
                      className="flex-1 px-2 py-1 text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-center transition-colors"
                    >
                      Event Tree
                    </button>
                    <button
                      type="button"
                      onClick={() => onStageTradeTicket(evt.stagedTicketSpec)}
                      className="ui-btn ui-btn-primary flex-1 text-center"
                    >
                      + Stage Hedge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
