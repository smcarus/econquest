import React, { useEffect, useMemo, useState } from 'react';
import { PanelBuilder } from './PanelBuilder';
import { RegimeQuadrant } from './RegimeQuadrant';
import { CalendarClock, ExternalLink, Ticket } from 'lucide-react';
import type { CouncilAssessmentRun, LiveWatchlistItem } from '../types/council';
import type { StagedTradeTicketSpec } from '../utils/nssYieldCurveAndCatalystEngine';
import { POLITICAL_FISCAL_CATEGORIES, hasOfficialSchedule, upcomingOfficialEvents } from '../data/officialCalendar';
import { rankDivergences } from '../utils/divergences';
import { formatAsOf } from '../utils/dataStatus';
import { PanelBoundary } from './PanelBoundary';
import { FirstRunGuide } from './FirstRunGuide';
import type { FirstRunStepId } from '../utils/firstRun';
import { MarketEdgeScreen, useMarketEdgeAnchors } from './MarketEdgeScreen';
import { DivergenceList } from './DivergenceList';
import { WatchAlertsPanel } from './WatchAlertsPanel';
import { ScenarioExposurePanel } from './ScenarioExposurePanel';
import { AskCouncilPanel, type FullCouncilStep } from './AskCouncilPanel';
import { marketEdgePeers } from '../utils/marketEdgeAnchors';
import { MissingSources, WatchlistTable } from './WatchlistTable';
import { POP_OUT_URL, WATCHLIST_VIEW_KEY, loadView, saveView, type WatchlistView } from '../utils/watchlistView';

/**
 * Today: the institutional PM's morning view.
 * What moved since my last visit, which signals fired, what is on the official calendar
 * in the next two weeks, and what is waiting for me. Every row links into the desk that explains it.
 */

// v2: only figures from real sources are recorded (v1 held built-in values, so it is ignored).
const LAST_VISIT_KEY = 'econquest_today_last_visit_v2';

type VisitSnapshot = {
  savedAt: string;
  rows: Record<string, { cds5YBps?: number; cdsSource?: string; yield10YPct?: number; compositeRisk?: number; yieldSource?: string }>;
};

function loadLastVisit(): VisitSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LAST_VISIT_KEY);
    return raw ? (JSON.parse(raw) as VisitSnapshot) : null;
  } catch {
    return null;
  }
}

function saveVisit(items: LiveWatchlistItem[]) {
  try {
    const rows: VisitSnapshot['rows'] = {};
    items.forEach((it) => {
      rows[it.iso3] = {
        cds5YBps: it.cds5YBps,
        cdsSource: it.cds5YBps !== undefined ? it.cds5YSource : undefined,
        yield10YPct: it.yield10YPct,
        compositeRisk: it.compositeRisk,
        yieldSource: it.yield10YSource || 'sample',
      };
    });
    window.localStorage.setItem(
      LAST_VISIT_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), rows } satisfies VisitSnapshot)
    );
  } catch {
    // Browser storage unavailable: the page still works, it just can't show changes.
  }
}

const Card: React.FC<{
  title: string;
  icon: React.ReactNode;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, note, action, children, className = '' }) => (
  <section
    className={`ui-panel ${className}`}
  >
    <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {icon}
          {title}
        </h2>
        {note && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      </div>
      {action}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export const TodayPage: React.FC<{
  run: CouncilAssessmentRun;
  watchlistName: string;
  /** The list shown, so the pop-out opens on the same one. */
  watchlistId?: string;
  watchlistItems: LiveWatchlistItem[];
  stagedTickets: StagedTradeTicketSpec[];
  onOpenCountry: (item: LiveWatchlistItem, sectionId?: string) => void;
  onStageTicket: (ticket: StagedTradeTicketSpec) => void;
  onOpenTickets: () => void;
  onOpenWatchlistManager: () => void;
  /** Opens Reports on the council brief just saved. */
  onSendCouncilToReports?: () => void;
  /** The full council on the open country, run and approved inside Ask the council. */
  fullCouncil?: FullCouncilStep;
  /** Core view: watchlist and calendar only (see utils/simpleMode.ts). */
  coreOnly?: boolean;
  /** Menu > AI model choice, for the first-run guide. */
  aiProvider?: string;
  /** A first-run guide button was pressed. */
  onFirstRunAction?: (id: FirstRunStepId) => void;
}> = ({
  run,
  watchlistName,
  watchlistId,
  watchlistItems,
  stagedTickets,
  onOpenCountry,
  onStageTicket,
  onOpenTickets,
  onOpenWatchlistManager,
  onSendCouncilToReports,
  fullCouncil,
  coreOnly = false,
  aiProvider,
  onFirstRunAction,
}) => {
  // Read the previous visit once, then record this one after the figures settle.
  const [lastVisit] = useState<VisitSnapshot | null>(() => loadLastVisit());
  const edgeAnchors = useMarketEdgeAnchors();
  const edgeItems = useMemo(() => marketEdgePeers(watchlistItems, edgeAnchors?.peers || []), [watchlistItems, edgeAnchors]);
  useEffect(() => {
    const t = window.setTimeout(() => saveVisit(watchlistItems), 5000);
    return () => window.clearTimeout(t);
  }, [watchlistItems]);

  // Columns and sort, shared with the pop-out window through this browser's storage.
  const [view, setView] = useState<WatchlistView>(() => loadView());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WATCHLIST_VIEW_KEY) setView(loadView());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const changeView = (v: WatchlistView) => {
    setView(v);
    saveView(v);
  };
  const popOut = () => {
    // The pop-out starts on the list shown here.
    changeView({ ...view, watchlistId });
    window.open(POP_OUT_URL, 'econquest-watchlist', 'popup,width=1100,height=720');
  };

  const watchIsos = useMemo(() => watchlistItems.map((w) => w.iso3), [watchlistItems]);
  const upcoming = useMemo(() => upcomingOfficialEvents(watchIsos, 14), [watchIsos]);
  const flaggedIsos = useMemo(() => new Set(rankDivergences(edgeItems, lastVisit?.rows).map((r) => r.iso3)), [edgeItems, lastVisit]);
  const politicalFiscal = useMemo(
    () =>
      upcomingOfficialEvents(watchIsos, 365)
        .filter((e) => POLITICAL_FISCAL_CATEGORIES.includes(e.category))
        .sort((a, b) => Number(flaggedIsos.has(b.iso3)) - Number(flaggedIsos.has(a.iso3)) || a.daysUntil - b.daysUntil),
    [watchIsos, flaggedIsos]
  );
  const noSchedule = useMemo(
    () => watchlistItems.filter((w) => !hasOfficialSchedule(w.iso3)),
    [watchlistItems]
  );

  const liveCount = watchlistItems.filter((w) => w.dataMode === 'live' || w.dataMode === 'partial').length;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const byIso = new Map(watchlistItems.map((w) => [w.iso3, w]));
  const openIso = (iso3: string, sectionId?: string) => {
    const item = byIso.get(iso3);
    if (item) onOpenCountry(item, sectionId);
  };

  return (
    <div className="space-y-4" data-no-stat-ref="true">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Workspace</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {today} · {watchlistName} · {watchlistItems.length} countries
          </p>
        </div>
        <p
          className={`text-xs px-2 py-1 border ${
            liveCount === 0
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
          }`}
          title="A country counts as live when at least one public data feed answered on its last pull."
        >
          {liveCount === 0
            ? 'No live data yet: figures read Missing until a source answers'
            : `Live data for ${liveCount} of ${watchlistItems.length} countries`}
        </p>
      </div>

      {onFirstRunAction && (
        <PanelBoundary name="Getting started">
          <FirstRunGuide liveCount={liveCount} aiProvider={aiProvider} onAction={onFirstRunAction} />
        </PanelBoundary>
      )}

      {/* Watchlist as a small card in the top-left corner; the full table lives in the pop-out. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(16rem,22rem)_1fr] gap-4 items-start">
        <Card
          title="Watchlist"
          icon={<span className="w-2 h-2 rounded-full bg-blue-600" />}
          note={`${watchlistName} · ${watchlistItems.length} countries. Pop out for every column.`}
          action={
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={popOut}
                title="Open the full watchlist in its own window, with your choice of columns"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Pop out
              </button>
              <button
                type="button"
                onClick={onOpenWatchlistManager}
                className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
              >
                Edit
              </button>
            </div>
          }
        >
          <PanelBoundary name="The watchlist">
          <MissingSources items={watchlistItems} compact />
          <WatchlistTable
            compact
            items={watchlistItems}
            view={view}
            onChangeView={changeView}
            lastLook={lastVisit?.rows}
            highlightIso3={run.iso3}
            onOpen={(it) => onOpenCountry(it)}
          />
          </PanelBoundary>
        </Card>

        <div className="min-w-0 scroll-mt-4" id="tool-council">
        <PanelBoundary name="Ask the council">
        <AskCouncilPanel
          items={edgeItems}
          onOpenCountry={(item) => onOpenCountry(item, 'macro')}
          onSendToReports={() => onSendCouncilToReports?.()}
          fullCouncil={fullCouncil}
        />
        </PanelBoundary>
        </div>
      </div>

      <div id="tool-watch-alerts" className="scroll-mt-4">
        <PanelBoundary name="Watch alerts">
          <WatchAlertsPanel items={edgeItems} onOpenCountry={(item) => onOpenCountry(item, 'macro')} />
        </PanelBoundary>
      </div>

      <div id="tool-divergences" className="scroll-mt-4">
        <PanelBoundary name="Where data and price disagree">
        <DivergenceList
          items={edgeItems}
          lastLook={lastVisit?.rows}
          onOpenCountry={(item) => onOpenCountry(item, 'macro')}
        />
        </PanelBoundary>
      </div>

      <div id="tool-marketedge" className="scroll-mt-4">
        <PanelBoundary name="MarketEdge">
        <MarketEdgeScreen
          watchlist={watchlistItems}
          anchors={edgeAnchors}
          highlightIso3={run.iso3}
          onOpenCountry={(item) => onOpenCountry(item, 'macro')}
          intro="Your watchlist plus the US, China, Russia, UK, EU and India, always shown."
        />
        </PanelBoundary>
      </div>

      <div id="tool-scenarios" className="scroll-mt-4">
        <PanelBoundary name="Scenarios">
          <ScenarioExposurePanel items={edgeItems} onOpenCountry={(item) => onOpenCountry(item, 'macro')} />
        </PanelBoundary>
      </div>

      <div id="tool-panel" className="scroll-mt-4">
        <PanelBoundary name="Compare countries">
          <PanelBuilder countries={watchlistItems.map((w) => ({ iso3: w.iso3, countryName: w.countryName }))} />
        </PanelBoundary>
      </div>

      <div id="tool-regime" className="scroll-mt-4">
        <PanelBoundary name="Growth and inflation">
          <RegimeQuadrant items={edgeItems} onOpenCountry={(item) => onOpenCountry(item, 'macro')} />
        </PanelBoundary>
      </div>

      <div id="tool-calendar" className={`scroll-mt-4 ${coreOnly ? '' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}`}>

        <Card
          title="Next two weeks"
          icon={<CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          note="Official central bank, statistics and election dates. Each row links to its source."
        >
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No scheduled decisions or releases in the next 14 days.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.slice(0, 8).map((ev) => (
                <li key={`${ev.iso3}-${ev.date}-${ev.title}`} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => openIso(ev.iso3, 'quant_macro_catalyst_calendar')}
                      className="text-left text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {byIso.get(ev.iso3)?.countryName || ev.iso3}: {ev.title}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                        title={ev.primarySource ? 'Official source' : 'Secondary source quoting the official schedule'}
                      >
                        {ev.sourceName}
                      </a>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-slate-900 dark:text-white">
                      {ev.daysUntil === 0 ? 'Today' : ev.daysUntil === 1 ? 'Tomorrow' : `In ${ev.daysUntil} days`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(`${ev.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {noSchedule.length > 0 && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No official schedule on file for {noSchedule.map((w) => w.countryName).join(', ')}.
            </p>
          )}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800" data-political-fiscal="true">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">Elections, budgets and IMF, next 12 months</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Countries on the ranked list above come first. Budget dates are the latest the constitution allows.
            </p>
            {politicalFiscal.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">None on file for this watchlist.</p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {politicalFiscal.map((ev) => (
                  <li key={`pf-${ev.iso3}-${ev.date}-${ev.title}`} data-pf-event={ev.iso3} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => openIso(ev.iso3)}
                        className="text-left text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {byIso.get(ev.iso3)?.countryName || ev.iso3}: {ev.title}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {flaggedIsos.has(ev.iso3) && <span className="text-blue-700 dark:text-blue-300">On the ranked list · </span>}
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          title={ev.primarySource ? 'Official source' : 'Secondary source'}
                        >
                          {ev.sourceName}
                        </a>
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {ev.dateKind === 'legal_deadline' ? 'By ' : ''}
                        {new Date(`${ev.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {ev.daysUntil === 0 ? 'Today' : ev.daysUntil === 1 ? 'Tomorrow' : `In ${ev.daysUntil} days`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {!coreOnly && (
      <Card
        title="Waiting for you"
        icon={<Ticket className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        note="Trade tickets staged for the investment committee."
        action={
          stagedTickets.length > 0 ? (
            <button
              type="button"
              onClick={onOpenTickets}
              className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
            >
              Open IC tickets
            </button>
          ) : undefined
        }
      >
        {stagedTickets.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No staged tickets.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {stagedTickets.slice(0, 5).map((t) => (
              <li key={t.ticketId} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{t.strategyTitle}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.countryName} · conviction {t.convictionScore0To100}/100
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openIso(t.iso3, t.targetSectionId)}
                  className="ui-btn"
                >
                  Open desk
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      )}
    </div>
  );
};
