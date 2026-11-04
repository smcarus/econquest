import React, { useMemo } from 'react';
import { GitCompare, Plus, RefreshCw, Ticket } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { findPillarForNavSection } from './ActivityPillarWorkspaceController';
import { DataStatusBadge } from './DataStatusBadge';
import { ExecutiveBriefScorecard } from './ExecutiveBriefScorecard';
import { hasOfficialSchedule, upcomingOfficialEvents } from '../data/officialCalendar';

/**
 * Country page: everything about one sovereign, grouped the way a PM works through it.
 * Each tab is a short list of existing desks; one desk shows at a time.
 */

export type CountryTabId = 'overview' | 'debt' | 'markets' | 'geo' | 'scenarios' | 'restructuring';

export interface CountryTabConfig {
  id: CountryTabId;
  label: string;
  desks: string[];
}

export const COUNTRY_TABS: CountryTabConfig[] = [
  { id: 'overview', label: 'Overview', desks: ['charts_watchlists', 'risk_analytics'] },
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
    desks: ['quant_portfolio_stress_lab', 'decision_quadrant_stress', 'backtest_engine', 'quant_macro_surprise'],
  },
  {
    id: 'restructuring',
    label: 'Restructuring',
    desks: ['restructuring_npv_cac_waterfall', 'quant_restructuring_npv'],
  },
];

/** Restructuring is only relevant for stressed credits. */
export function isRestructuringRelevant(item: WatchlistItem | undefined, run: CouncilAssessmentRun): boolean {
  const cds = run.openData.monetaryAndMarket.cds5YSpreadBps;
  return cds >= 400 || item?.alertStatus === 'CRITICAL';
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
  CRITICAL: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900',
  ELEVATED: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  STABLE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
};
const ALERT_LABEL: Record<WatchlistItem['alertStatus'], string> = {
  CRITICAL: 'High risk',
  ELEVATED: 'Elevated risk',
  STABLE: 'Stable',
};

const Figure: React.FC<{ label: string; value: string; title?: string }> = ({ label, value, title }) => (
  <div className="min-w-0" title={title}>
    <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</div>
    <div className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap [font-variant-numeric:tabular-nums]">
      {value}
    </div>
  </div>
);

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
  onOpenTickets: () => void;
  ticketCount: number;
  renderDesk: (deskId: string) => React.ReactNode;
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
  onOpenTickets,
  ticketCount,
  renderDesk,
}) => {
  const item = watchlistItems.find((w) => w.iso3 === run.iso3);
  const showRestructuring = isRestructuringRelevant(item, run);
  const tabs = COUNTRY_TABS.filter((t) => t.id !== 'restructuring' || showRestructuring || activeTab === 'restructuring');
  const tab = COUNTRY_TABS.find((t) => t.id === activeTab) || COUNTRY_TABS[0];
  const desk = tab.desks.includes(activeDesk) ? activeDesk : tab.desks[0];
  const open = run.openData;
  const mkt = open.monetaryAndMarket;
  const events = useMemo(() => upcomingOfficialEvents([run.iso3], 120), [run.iso3]);
  const alert = item?.alertStatus;

  return (
    <div className="space-y-3" data-country-page="true">
      {/* Country header: one row with selector, key figures, data status and actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3">
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
            <Figure label="Debt / GDP" value={`${open.imfIndicators.debtToGdpPct.toFixed(1)}%`} />
            <Figure label="5Y CDS" value={`${Math.round(mkt.cds5YSpreadBps)} bps`} />
            <Figure label="10Y yield" value={`${mkt.sovereign10YBondYieldPct.toFixed(2)}%`} />
            <Figure label="Policy rate" value={`${mkt.policyRatePct.toFixed(2)}%`} />
            <Figure
              label="Reserves"
              value={`${open.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mo`}
              title="FX reserves in months of imports"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            <DataStatusBadge snapshot={open} />
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              title="Fetch the latest World Bank and US Treasury figures for this country"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync'}
            </button>
            <button
              type="button"
              onClick={onCompare}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <GitCompare className="w-3 h-3" />
              Compare
            </button>
            <button
              type="button"
              onClick={onOpenTickets}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Ticket className="w-3 h-3" />
              IC tickets{ticketCount > 0 ? ` (${ticketCount})` : ''}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-3 -mb-3 flex gap-1 overflow-x-auto border-t border-slate-100 dark:border-slate-800" aria-label="Country sections">
          {tabs.map((t) => {
            const isActive = t.id === tab.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTab(t.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                } ${t.id === 'restructuring' ? 'text-red-700 dark:text-red-300' : ''}`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab.id === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" data-no-stat-ref="true">
          <div className="xl:col-span-2">
            <ExecutiveBriefScorecard run={run} isCompactByDefault={false} onSelectSection={(sec) => {
              const target = findCountryTabForDesk(sec);
              if (target) {
                onChangeTab(target.id);
                onChangeDesk(sec);
              }
            }} />
          </div>
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <header className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Coming up</h2>
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
                        <div className="text-sm text-slate-900 dark:text-white">{ev.title}</div>
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
              className={`px-2.5 py-1 text-xs border transition-colors ${
                d === desk
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              {deskLabel(d)}
            </button>
          ))}
        </div>
      )}

      {renderDesk(desk)}
    </div>
  );
};
