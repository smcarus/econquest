import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, Radar, Ticket } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import {
  buildMorningAlphaAndCatalystRadar,
  StagedTradeTicketSpec,
} from '../utils/nssYieldCurveAndCatalystEngine';
import { hasOfficialSchedule, upcomingOfficialEvents } from '../data/officialCalendar';
import { DATA_MODE_LABEL, formatAsOf } from '../utils/dataStatus';
import { cdsSourceNote, yieldSourceHelp, yieldSourceNote } from '../utils/watchlistYield';
import { MarketEdgeScreen, useMarketEdgeAnchors } from './MarketEdgeScreen';

/**
 * Today: the institutional PM's morning view.
 * What moved since my last visit, which signals fired, what is on the official calendar
 * in the next two weeks, and what is waiting for me. Every row links into the desk that explains it.
 */

const LAST_VISIT_KEY = 'econquest_today_last_visit_v1';

type VisitSnapshot = {
  savedAt: string;
  rows: Record<string, { cds5YBps: number; yield10YPct: number; compositeRisk: number; yieldSource?: string }>;
};

function loadLastVisit(): VisitSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LAST_VISIT_KEY);
    return raw ? (JSON.parse(raw) as VisitSnapshot) : null;
  } catch {
    return null;
  }
}

function saveVisit(items: WatchlistItem[]) {
  try {
    const rows: VisitSnapshot['rows'] = {};
    items.forEach((it) => {
      rows[it.iso3] = {
        cds5YBps: it.cds5YBps,
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

const ALERT_CLASS: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  ELEVATED: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  STABLE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
};

const ALERT_LABEL: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'High',
  ELEVATED: 'Elevated',
  STABLE: 'Stable',
};

const Delta: React.FC<{ value: number | null; unit: string; digits?: number; higherIsWorse?: boolean }> = ({
  value,
  unit,
  digits = 0,
  higherIsWorse = true,
}) => {
  if (value === null || Math.abs(value) < Math.pow(10, -digits) / 2) {
    return <span className="text-slate-400 dark:text-slate-500">–</span>;
  }
  const worse = higherIsWorse ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${
        worse ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
      }`}
    >
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : ''}
      {value.toFixed(digits)}
      {unit}
    </span>
  );
};

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
  watchlistItems: WatchlistItem[];
  stagedTickets: StagedTradeTicketSpec[];
  onOpenCountry: (item: WatchlistItem, sectionId?: string) => void;
  onStageTicket: (ticket: StagedTradeTicketSpec) => void;
  onOpenTickets: () => void;
  onOpenWatchlistManager: () => void;
  /** Core view: watchlist and calendar only (see utils/simpleMode.ts). */
  coreOnly?: boolean;
}> = ({
  run,
  watchlistName,
  watchlistItems,
  stagedTickets,
  onOpenCountry,
  onStageTicket,
  onOpenTickets,
  onOpenWatchlistManager,
  coreOnly = false,
}) => {
  // Read the previous visit once, then record this one after the figures settle.
  const [lastVisit] = useState<VisitSnapshot | null>(() => loadLastVisit());
  const edgeAnchors = useMarketEdgeAnchors();
  useEffect(() => {
    const t = window.setTimeout(() => saveVisit(watchlistItems), 5000);
    return () => window.clearTimeout(t);
  }, [watchlistItems]);

  const rows = useMemo(
    () => [...watchlistItems].sort((a, b) => b.compositeRisk - a.compositeRisk),
    [watchlistItems]
  );

  const radar = useMemo(
    () => buildMorningAlphaAndCatalystRadar(run, watchlistItems),
    [run, watchlistItems]
  );
  const watchIsos = useMemo(() => watchlistItems.map((w) => w.iso3), [watchlistItems]);
  const upcoming = useMemo(() => upcomingOfficialEvents(watchIsos, 14), [watchIsos]);
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Today</h1>
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
            ? 'No live data yet: figures below are built-in sample values'
            : `Live data for ${liveCount} of ${watchlistItems.length} countries`}
        </p>
      </div>

      <Card
        title="Watchlist"
        icon={<span className="w-2 h-2 rounded-full bg-blue-600" />}
        note={
          lastVisit
            ? `Change since your last visit (${formatAsOf(lastVisit.savedAt)}). Sorted by composite risk.`
            : 'Sorted by composite risk. Changes since your last visit will show from your next visit.'
        }
        action={
          <button
            type="button"
            onClick={onOpenWatchlistManager}
            className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
          >
            Edit watchlist
          </button>
        }
      >
        {/* Phones: one tappable card per country instead of a squeezed table. */}
        <ul className="sm:hidden -mx-4 divide-y divide-slate-100 dark:divide-slate-800 [font-variant-numeric:tabular-nums]" data-no-provenance-overlay="true">
          {rows.map((it) => {
            const prev = lastVisit?.rows[it.iso3];
            return (
              <li key={it.iso3}>
                <button
                  type="button"
                  onClick={() => onOpenCountry(it)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    it.iso3 === run.iso3 ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-white">{it.countryName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {it.iso3} · {it.currencyCode} · {DATA_MODE_LABEL[it.dataMode || 'sample']}
                        </div>
                      </div>
                      <span className={`shrink-0 whitespace-nowrap px-1.5 py-0.5 text-xs font-medium border ${ALERT_CLASS[it.alertStatus]}`}>
                        {ALERT_LABEL[it.alertStatus]} · {it.compositeRisk.toFixed(2)}
                      </span>
                    </div>
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500 dark:text-slate-400">5Y CDS</dt>
                        <dd className="font-medium text-slate-900 dark:text-white">
                          {Math.round(it.cds5YBps)} bps
                          {prev && (
                            <span className="ml-1 text-xs font-normal">
                              <Delta value={it.cds5YBps - prev.cds5YBps} unit="" />
                            </span>
                          )}
                          <div className={`text-xs font-normal ${it.cds5YSource === 'own' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {cdsSourceNote(it)}
                          </div>
                        </dd>
                      </div>
                      <div title={yieldSourceHelp(it)}>
                        <dt className="text-xs text-slate-500 dark:text-slate-400">10Y yield</dt>
                        <dd className="font-medium text-slate-900 dark:text-white">{it.yield10YPct.toFixed(2)}%</dd>
                        <dd
                          className={`text-xs ${
                            it.yield10YSource === 'official'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {yieldSourceNote(it)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden sm:block overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm [font-variant-numeric:tabular-nums]" data-no-provenance-overlay="true">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3 font-medium">Country</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
                <th className="py-2 pr-3 font-medium text-right">5Y CDS (bps)</th>
                <th className="hidden md:table-cell py-2 pr-3 font-medium text-right">Change</th>
                <th className="py-2 pr-3 font-medium text-right">10Y yield</th>
                <th className="hidden md:table-cell py-2 pr-3 font-medium text-right">Change</th>
                <th className="hidden md:table-cell py-2 pr-3 font-medium text-right">Debt/GDP</th>
                <th className="hidden md:table-cell py-2 pr-3 font-medium text-right">Reserves (mo)</th>
                <th className="hidden md:table-cell py-2 pr-3 font-medium">Data</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => {
                const prev = lastVisit?.rows[it.iso3];
                const isActive = it.iso3 === run.iso3;
                return (
                  <tr
                    key={it.iso3}
                    onClick={() => onOpenCountry(it)}
                    className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-900 dark:text-white">{it.countryName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {it.iso3} · {it.currencyCode}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-1.5 py-0.5 text-xs font-medium border ${ALERT_CLASS[it.alertStatus]}`}>
                        {ALERT_LABEL[it.alertStatus]} · {it.compositeRisk.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="font-medium">{Math.round(it.cds5YBps)}</div>
                      <div className={`text-xs whitespace-nowrap ${it.cds5YSource === 'own' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {cdsSourceNote(it)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell py-2 pr-3 text-right text-xs">
                      <Delta value={prev ? it.cds5YBps - prev.cds5YBps : null} unit="" />
                    </td>
                    <td className="py-2 pr-3 text-right" title={yieldSourceHelp(it)}>
                      <div className="font-medium">{it.yield10YPct.toFixed(2)}%</div>
                      <div
                        className={`text-xs whitespace-nowrap ${
                          it.yield10YSource === 'official'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {yieldSourceNote(it)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell py-2 pr-3 text-right text-xs">
                      {/* A change is only shown when both figures come from the same kind of source. */}
                      <Delta
                        value={
                          prev && (prev.yieldSource || 'sample') === (it.yield10YSource || 'sample')
                            ? (it.yield10YPct - prev.yield10YPct) * 100
                            : null
                        }
                        unit=" bp"
                      />
                    </td>
                    <td className="hidden md:table-cell py-2 pr-3 text-right">{it.debtToGdpPct.toFixed(1)}%</td>
                    <td className="hidden md:table-cell py-2 pr-3 text-right">{it.fxReservesMonths.toFixed(1)}</td>
                    <td className="hidden md:table-cell py-2 pr-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {DATA_MODE_LABEL[it.dataMode || 'sample']}
                    </td>
                    <td className="py-2 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <MarketEdgeScreen
        watchlist={watchlistItems}
        anchors={edgeAnchors}
        highlightIso3={run.iso3}
        onOpenCountry={(item) => onOpenCountry(item, 'macro')}
        intro="Your watchlist plus the US, China, Russia, UK, EU and India, always shown."
      />

      <div className={coreOnly ? '' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
        {!coreOnly && (
        <Card
          title="Signals"
          icon={<Radar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          note="Model output: best 12-month carry and roll-down on each curve. Not trade advice."
        >
          {radar.topAlphaSignals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No signals for this watchlist.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {radar.topAlphaSignals.map((sig) => (
                <li key={sig.signalId} className="py-2.5 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openIso(sig.iso3, sig.targetSectionId)}
                    className="text-left group"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {sig.countryName}: {sig.headlineMetricBps}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{sig.subText}</div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openIso(sig.iso3, sig.targetSectionId)}
                      className="ui-btn"
                    >
                      Why
                    </button>
                    {sig.ticketSpec && (
                      <button
                        type="button"
                        onClick={() => onStageTicket(sig.ticketSpec)}
                        className="ui-btn ui-btn-primary"
                      >
                        Stage ticket
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        )}

        <Card
          title="Next two weeks"
          icon={<CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          note="Official central bank and statistics schedules. Each row links to its source."
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
            No staged tickets. Use “Stage ticket” on a signal to start one.
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
