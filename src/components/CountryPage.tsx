import React, { useMemo, useState } from 'react';
import { GitCompare, Plus, RefreshCw, Ticket } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { findPillarForNavSection } from './ActivityPillarWorkspaceController';
import { DataStatusBadge } from './DataStatusBadge';
import { hasOfficialSchedule, upcomingOfficialEvents } from '../data/officialCalendar';
import { describeOfficialYield, formatPeriod } from '../utils/officialYields';
import { getSnapshotDataStatus } from '../utils/dataStatus';
import { countryDataSources, pathMissing } from '../utils/countryNotes';
import { toLive } from '../utils/liveFigures';
import { isCoreCountryTab } from '../utils/simpleMode';
import { BriefGroups, CountryBriefPanel, type BriefView } from './CountryBriefPanel';
import { MarketsMacroPanel } from './MarketsMacroPanel';
import { AsOfPanel } from './AsOfPanel';
import { DecisionReplayPanel } from './DecisionReplayPanel';
import { TrackRecordPanel } from './TrackRecordPanel';
import { PanelBoundary } from './PanelBoundary';
import { HistoryPanel } from './HistoryPanel';

/**
 * Country page: everything about one sovereign, grouped the way a PM works through it.
 * Each tab is a short list of existing desks; one desk shows at a time.
 */

export type CountryTabId = 'brief' | 'macro' | 'overview' | 'history' | 'debt' | 'markets' | 'geo' | 'scenarios' | 'restructuring';

export interface CountryTabConfig {
  id: CountryTabId;
  label: string;
  desks: string[];
}

export const COUNTRY_TABS: CountryTabConfig[] = [
  // Role start view (economist, banker): figures with sources and a link to the report template. No desks.
  { id: 'brief', label: 'Brief', desks: [] },
  // MarketEdge: the economy, market pricing and model readings of where they disagree. No desks.
  { id: 'macro', label: 'MarketEdge', desks: [] },
  // History: each figure's run of real observations as a chart (src/components/HistoryPanel.tsx). No desks.
  { id: 'history', label: 'History', desks: [] },
  // Sources (id 'overview'): what is live for this country. Its old chart desks ran on built-in figures and were removed (Sam, 2026-11-04).
  { id: 'overview', label: 'Sources', desks: [] },
  {
    id: 'debt',
    label: 'Debt & fiscal',
    desks: [
      'forecasting_lab',
      'dmo_treasury_auction_sim',
      'debt_investor_base_doom_loop',
      'ratings_shadow_fallen_angel',
      'taylor_rule_fiscal_dominance',
    ],
  },
  {
    id: 'markets',
    label: 'Markets',
    desks: [
      'quant_nss_yield_curve',
      'quant_cds_basis',
      'fx_beer_feer_equilibrium',
      'decision_dislocation_screener',
      'global_liquidity',
      'market_maker_alpha',
      'quant_macro_catalyst_calendar',
    ],
  },
  {
    id: 'geo',
    label: 'Politics & geo',
    desks: [
      'geopolitical_desk',
      'supply_chain_matrix',
      'geopolitical_reserves_chokepoints',
      'decision_prediction_markets',
      'ngfs_climate_slb_greenium',
    ],
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    desks: ['decision_quadrant_stress', 'backtest_engine', 'quant_macro_surprise'],
  },
  {
    id: 'restructuring',
    label: 'Restructuring',
    desks: ['restructuring_npv_cac_waterfall', 'quant_restructuring_npv'],
  },
];

/** Where the Country page opens when no role or desk says otherwise. */
export const DEFAULT_COUNTRY_TAB: CountryTabConfig = COUNTRY_TABS.find((t) => t.id === 'overview')!;

/** Restructuring is only relevant for stressed credits. */
export function isRestructuringRelevant(item: WatchlistItem | undefined, run: CouncilAssessmentRun): boolean {
  // Only real figures decide this: your own CDS, or a risk score built on live inputs.
  const cds = getSnapshotDataStatus(run.openData).live('market.cds5YSpreadBps');
  return (cds !== undefined && cds >= 400) || (item ? toLive(item).alertStatus === 'CRITICAL' : false);
}

/** The tab (and desk) that holds a given desk id, for links from Today and elsewhere. */
export function findCountryTabForDesk(deskId: string): CountryTabConfig | undefined {
  return COUNTRY_TABS.find((t) => t.desks.includes(deskId));
}

function deskLabel(id: string): string {
  try {
    const { moduleItem } = findPillarForNavSection(id);
    return moduleItem.id === id || id === 'institutional_quant_desk'
      ? moduleItem.shortLabel || moduleItem.label
      : id;
  } catch {
    return id;
  }
}

const ALERT_CLASS: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  ELEVATED: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  STABLE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
};
const ALERT_LABEL: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'High risk',
  ELEVATED: 'Elevated risk',
  STABLE: 'Stable',
};

const Figure: React.FC<{ label: string; value: string; title?: string; missing?: string; onHistory?: () => void }> = ({ label, value, title, missing, onHistory }) => (
  <div
    className={`min-w-0 ${onHistory ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
    title={onHistory ? `${title ? `${title} ` : ''}Click for its history.` : title}
    data-missing={missing ? 'true' : undefined}
    role={onHistory ? 'button' : undefined}
    tabIndex={onHistory ? 0 : undefined}
    onClick={onHistory}
    onKeyDown={onHistory ? (e) => (e.key === 'Enter' || e.key === ' ') && onHistory() : undefined}
  >
    <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</div>
    <div className={`text-sm whitespace-nowrap [font-variant-numeric:tabular-nums] ${missing ? 'text-slate-400 dark:text-slate-500' : 'font-semibold text-slate-900 dark:text-white'}`}>
      {value}
    </div>
    {missing && <div className="text-xs text-amber-700 dark:text-amber-400 whitespace-nowrap">{missing}</div>}
  </div>
);

/** The header's key figures, each shown only from a real source. */
const HEADER_FIGURES: Array<{ path: string; label: string; fmt: (v: number) => string; series: string }> = [
  { path: 'imf.debtToGdpPct', label: 'Debt / GDP', fmt: (v) => `${v.toFixed(1)}%`, series: 'debt_gdp' },
  { path: 'market.cds5YSpreadBps', label: '5Y CDS', fmt: (v) => `${Math.round(v)} bps`, series: 'cds_5y' },
  { path: 'market.sovereign10YBondYieldPct', label: '10Y yield', fmt: (v) => `${v.toFixed(2)}%`, series: 'yield_10y' },
  { path: 'market.policyRatePct', label: 'Policy rate', fmt: (v) => `${v.toFixed(2)}%`, series: 'policy_rate' },
  { path: 'wb.fxReservesMonthsImport', label: 'Reserves', fmt: (v) => `${v.toFixed(1)} mo`, series: 'reserves_months' },
];

export const CountryPage: React.FC<{
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  activeTab: CountryTabId;
  activeDesk: string;
  onChangeTab: (tab: CountryTabId) => void;
  onChangeDesk: (deskId: string) => void;
  onSelectCountry: (item: WatchlistItem) => void;
  onAddCountry: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onCompare: () => void;
  /** Opens the Compare page (the watchlist side by side). */
  onOpenCompare?: () => void;
  onOpenTickets: () => void;
  ticketCount: number;
  renderDesk: (deskId: string) => React.ReactNode;
  briefView: BriefView;
  onWriteNote: (view: BriefView) => void;
  /** Core view: Brief and Overview tabs only (see utils/simpleMode.ts). */
  coreOnly?: boolean;
}> = ({
  run,
  watchlistItems,
  activeTab,
  activeDesk,
  onChangeTab,
  onChangeDesk,
  onSelectCountry,
  onAddCountry,
  onSync,
  isSyncing,
  onCompare,
  onOpenCompare,
  onOpenTickets,
  ticketCount,
  renderDesk,
  briefView,
  onWriteNote,
  coreOnly = false,
}) => {
  const item = watchlistItems.find((w) => w.iso3 === run.iso3);
  const showRestructuring = isRestructuringRelevant(item, run);
  const tabs = COUNTRY_TABS.filter((t) => t.id !== 'restructuring' || showRestructuring || activeTab === 'restructuring').filter(
    (t) => !coreOnly || isCoreCountryTab(t.id)
  );
  const tab = tabs.find((t) => t.id === activeTab) || tabs.find((t) => t.id === DEFAULT_COUNTRY_TAB.id) || tabs[0];
  const desk = tab.desks.includes(activeDesk) ? activeDesk : tab.desks[0];
  const open = run.openData;
  const status = useMemo(() => getSnapshotDataStatus(open), [open]);
  const events = useMemo(() => upcomingOfficialEvents([run.iso3], 120), [run.iso3]);
  // The risk badge only when the score rests on live inputs.
  const alert = item ? toLive(item).alertStatus : undefined;
  // Which series History opens on, when a header figure was clicked.
  const [historyPick, setHistoryPick] = useState<string | null>(null);
  const showHistory = tabs.some((t) => t.id === 'history');

  return (
    <div className="space-y-3" data-country-page="true">
      {/* Country header: one row with selector, key figures, data status and actions */}
      <div className="ui-panel px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="country-select" className="sr-only">
              Country
            </label>
            <select
              id="country-select"
              value={run.iso3}
              onChange={(e) => {
                if (e.target.value === '__add') {
                  onAddCountry();
                  return;
                }
                const next = watchlistItems.find((w) => w.iso3 === e.target.value);
                if (next) onSelectCountry(next);
              }}
              className="text-lg font-semibold text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 px-2 py-1 pr-7"
            >
              {!item && <option value={run.iso3}>{run.countryName}</option>}
              {watchlistItems.map((w) => (
                <option key={w.iso3} value={w.iso3}>
                  {w.countryName}
                </option>
              ))}
              <option value="__add">+ Add a country…</option>
            </select>
            {alert && (
              <span className={`px-1.5 py-0.5 text-xs font-medium border ${ALERT_CLASS[alert]}`}>
                {ALERT_LABEL[alert]}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {HEADER_FIGURES.map((f) => {
              const v = status.live(f.path);
              const why = v === undefined ? pathMissing(status, f.path) : undefined;
              return (
                <Figure
                  key={f.path}
                  label={f.path === 'market.cds5YSpreadBps' && status.ownCds ? `5Y CDS, ${formatPeriod(status.ownCds.date)}` : f.path === 'market.sovereign10YBondYieldPct' && status.officialYield ? `10Y yield, ${describeOfficialYield(status.officialYield).when}` : f.label}
                  value={v === undefined ? 'Missing' : f.fmt(v)}
                  missing={why?.short}
                  title={why ? why.help : f.path === 'market.sovereign10YBondYieldPct' && status.officialYield ? `Official figure: ${describeOfficialYield(status.officialYield).long}.` : f.path === 'market.cds5YSpreadBps' && status.ownCds ? `Your own ${status.ownCds.source} quote.` : undefined}
                  onHistory={
                    showHistory
                      ? () => {
                          setHistoryPick(f.series);
                          onChangeTab('history');
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            <DataStatusBadge snapshot={open} />
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="ui-btn inline-flex"
              title="Pull every data feed for this country again now (normally once a week, or within the hour after a failed pull)"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Refreshing…' : 'Refresh now'}
            </button>
            {!coreOnly && (
              <>
                <button type="button" onClick={onCompare} className="ui-btn inline-flex">
                  <GitCompare className="w-3 h-3" />
                  Compare
                </button>
                <button type="button" onClick={onOpenTickets} className="ui-btn inline-flex">
                  <Ticket className="w-3 h-3" />
                  IC tickets{ticketCount > 0 ? ` (${ticketCount})` : ''}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-3 -mb-3 flex gap-1 ui-scroll-x border-t border-slate-100 dark:border-slate-800" aria-label="Country sections">
          {tabs.map((t) => {
            const isActive = t.id === tab.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTab(t.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`ui-tab ${t.id === 'restructuring' ? 'text-rose-700 dark:text-rose-300' : ''}`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab.id === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" data-no-stat-ref="true">
          <div className="xl:col-span-2 space-y-2" data-no-provenance-overlay="true">
            <section className="ui-panel">
              <header className="ui-panel-header">
                <h2 className="ui-section-title">What is live for {run.countryName}</h2>
                <p className="ui-label">Every figure the country pages use, with its source, or why it is missing and what would fill it. No built-in values are shown.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(run.iso3)}/figures.csv`} download>
                    Download these figures (CSV)
                  </a>
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(run.iso3)}/figures.xlsx`} download>
                    Excel
                  </a>
                </div>
              </header>
            </section>
            <BriefGroups brief={{ headline: '', judgements: [], groups: countryDataSources(run) }} />
          </div>
          <section className="ui-panel">
            <header className="ui-panel-header">
              <h2 className="ui-section-title">Coming up</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official schedule, next 120 days</p>
            </header>
            <div className="p-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hasOfficialSchedule(run.iso3)
                    ? 'Nothing scheduled in the next 120 days.'
                    : `No official schedule on file for ${run.countryName}.`}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {events.slice(0, 6).map((ev) => (
                    <li key={`${ev.date}-${ev.title}`} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-900 dark:text-white">
                          {ev.title}
                          {ev.dateKind === 'legal_deadline' && <span className="text-xs text-slate-500 dark:text-slate-400"> · latest date in law</span>}
                        </div>
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                        >
                          {ev.sourceName}
                        </a>
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {new Date(`${ev.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {ev.daysUntil === 0 ? 'today' : `in ${ev.daysUntil}d`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={onAddCountry}
                className="mt-3 inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add another country
              </button>
            </div>
          </section>
        </div>
      )}

      {tab.id === 'history' && (
        <div className="space-y-3">
          <div id="tool-history" className="scroll-mt-4" />
          <HistoryPanel key={run.iso3} iso3={run.iso3} countryName={run.countryName} pick={historyPick} />
          <div id="tool-as-of" className="scroll-mt-4" />
          <PanelBoundary name="As of a past day">
            <AsOfPanel key={`asof-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
          </PanelBoundary>
          <div id="tool-decision-replay" className="scroll-mt-4" />
          <PanelBoundary name="Replicate a rate decision">
            <DecisionReplayPanel key={`replay-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
          </PanelBoundary>
          <div id="tool-track-record" className="scroll-mt-4" />
          <PanelBoundary name="Track record">
            <TrackRecordPanel key={`track-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
          </PanelBoundary>
        </div>
      )}
      {tab.id === 'macro' && <MarketsMacroPanel run={run} peers={watchlistItems} onOpenCountry={onSelectCountry} onOpenCompare={onOpenCompare} />}
      {tab.id === 'brief' && <CountryBriefPanel key={briefView} run={run} peers={watchlistItems} view={briefView} onWriteNote={onWriteNote} />}

      {/* Desk picker for this tab */}
      {tab.desks.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={`${tab.label} tools`}>
          {tab.desks.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === desk}
              onClick={() => onChangeDesk(d)}
              className="ui-pill"
            >
              {deskLabel(d)}
            </button>
          ))}
        </div>
      )}

      {desk && renderDesk(desk)}
    </div>
  );
};
