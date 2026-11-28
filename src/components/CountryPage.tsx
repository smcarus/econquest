import { HC_SPREAD_LABEL, HC_SPREAD_LONG, HC_SPREAD_NOT_CDS, HC_SPREAD_SOURCE, hcSpreadWhen } from '../utils/hardCurrencySpread';
import React, { useEffect, useMemo, useState } from 'react';
import { noteExamOpened } from '../utils/examMode';
import { openDataLicences } from './aboutOpen';
import { Plus, RefreshCw } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { RESEARCH } from '../i18n/messages/research';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { DataStatusBadge } from './DataStatusBadge';
import { useOnlineStatus } from './OfflineData';
import { hasOfficialSchedule, upcomingOfficialEvents } from '../data/officialCalendar';
import { describeOfficialYield, formatPeriod } from '../utils/officialYields';
import { getSnapshotDataStatus } from '../utils/dataStatus';
import { countryDataSources, pathMissing } from '../utils/countryNotes';
import { creditsForSources } from '../data/requiredCredits';
import { SourceCredits } from './SourceCredits';
import { describeAge, freshnessChecks } from '../utils/freshness';
import { toLive } from '../utils/liveFigures';
import { BriefGroups, CountryBriefPanel, type BriefView } from './CountryBriefPanel';
import { MarketsMacroPanel } from './MarketsMacroPanel';
import { PanelBoundary } from './PanelBoundary';
import { ResearchSectionNav } from './ResearchSections';
import { lazyNamed, DeskLoading } from './LazyDesk';
import { COUNTRY_TOOL_EVENT, isCountryTool, readToolPick, saveToolPick, toolGroupsFor } from '../utils/countryTools';
import { scrollBehavior } from '../utils/motion';
// Charts (recharts) load only when History opens, keeping them out of the first download.
const HistoryPanel = lazyNamed(() => import('./HistoryPanel'), 'HistoryPanel');
const AsOfPanel = lazyNamed(() => import('./AsOfPanel'), 'AsOfPanel');
const DecisionReplayPanel = lazyNamed(() => import('./DecisionReplayPanel'), 'DecisionReplayPanel');
const TrackRecordPanel = lazyNamed(() => import('./TrackRecordPanel'), 'TrackRecordPanel');
const QuestLinks = lazyNamed(() => import('./QuestLinks'), 'QuestLinks');
const GdeltEventsPanel = lazyNamed(() => import('./GdeltEventsPanel'), 'GdeltEventsPanel');
const GdeltHistoryPanel = lazyNamed(() => import('./GdeltHistoryPanel'), 'GdeltHistoryPanel');
const OutputGapPanel = lazyNamed(() => import('./OutputGapPanel'), 'OutputGapPanel');
const DebtSustainabilityPanel = lazyNamed(() => import('./DebtSustainabilityPanel'), 'DebtSustainabilityPanel');
const WeoVintagesPanel = lazyNamed(() => import('./WeoVintagesPanel'), 'WeoVintagesPanel');
const UsVintagesPanel = lazyNamed(() => import('./UsVintagesPanel'), 'UsVintagesPanel');
const BohnPanel = lazyNamed(() => import('./BohnPanel'), 'BohnPanel');
const GfnPanel = lazyNamed(() => import('./GfnPanel'), 'GfnPanel');
const RuleFamilyPanel = lazyNamed(() => import('./RuleFamilyPanel'), 'RuleFamilyPanel');
const ScenarioPanel = lazyNamed(() => import('./ScenarioPanel'), 'ScenarioPanel');
const EventStudyPanel = lazyNamed(() => import('./EventStudyPanel'), 'EventStudyPanel');
const BeerPanel = lazyNamed(() => import('./BeerPanel'), 'BeerPanel');
const LocalProjectionsPanel = lazyNamed(() => import('./LocalProjectionsPanel'), 'LocalProjectionsPanel');
const ReserveAdequacyPanel = lazyNamed(() => import('./ReserveAdequacyPanel'), 'ReserveAdequacyPanel');
const CrisisWarningPanel = lazyNamed(() => import('./CrisisWarningPanel'), 'CrisisWarningPanel');
const GrowthAccountingPanel = lazyNamed(() => import('./GrowthAccountingPanel'), 'GrowthAccountingPanel');
const BankSovereignPanel = lazyNamed(() => import('./BankSovereignPanel'), 'BankSovereignPanel');
const RestructuringCalcPanel = lazyNamed(() => import('./RestructuringCalcPanel'), 'RestructuringCalcPanel');
const PolicyIncidencePanel = lazyNamed(() => import('./PolicyIncidencePanel'), 'PolicyIncidencePanel');
const FiscalRulesPanel = lazyNamed(() => import('./FiscalRulesPanel'), 'FiscalRulesPanel');
const RemittancesPanel = lazyNamed(() => import('./RemittancesPanel'), 'RemittancesPanel');
const FinancialInclusionPanel = lazyNamed(() => import('./FinancialInclusionPanel'), 'FinancialInclusionPanel');
const CommodityTermsPanel = lazyNamed(() => import('./CommodityTermsPanel'), 'CommodityTermsPanel');
const AidPanel = lazyNamed(() => import('./AidPanel'), 'AidPanel');
const WbProjectsPanel = lazyNamed(() => import('./WbProjectsPanel'), 'WbProjectsPanel');
const RegionalPanel = lazyNamed(() => import('./RegionalPanel'), 'RegionalPanel');
const BudgetExecutionPanel = lazyNamed(() => import('./BudgetExecutionPanel'), 'BudgetExecutionPanel');
const BudgetCredibilityPanel = lazyNamed(() => import('./BudgetCredibilityPanel'), 'BudgetCredibilityPanel');
const FoodPricesPanel = lazyNamed(() => import('./FoodPricesPanel'), 'FoodPricesPanel');
const DisastersPanel = lazyNamed(() => import('./DisastersPanel'), 'DisastersPanel');
const ParametricTriggerPanel = lazyNamed(() => import('./ParametricTriggerPanel'), 'ParametricTriggerPanel');
const StormTracksPanel = lazyNamed(() => import('./StormTracksPanel'), 'StormTracksPanel');
const CbWordsPanel = lazyNamed(() => import('./CbWordsPanel'), 'CbWordsPanel');
const InflationDriversPanel = lazyNamed(() => import('./InflationDriversPanel'), 'InflationDriversPanel');
const YieldCurvePanel = lazyNamed(() => import('./YieldCurvePanel'), 'YieldCurvePanel');
const FullCurvesPanel = lazyNamed(() => import('./FullCurvesPanel'), 'FullCurvesPanel');
const SurprisesPanel = lazyNamed(() => import('./SurprisesPanel'), 'SurprisesPanel');
const ExternalSustainabilityPanel = lazyNamed(() => import('./ExternalSustainabilityPanel'), 'ExternalSustainabilityPanel');
const RiskScorecardPanel = lazyNamed(() => import('./RiskScorecardPanel'), 'RiskScorecardPanel');
const UnitConverterPanel = lazyNamed(() => import('./UnitConverterPanel'), 'UnitConverterPanel');
const ExercisesPanel = lazyNamed(() => import('./ExercisesPanel'), 'ExercisesPanel');
const ModelSandboxPanel = lazyNamed(() => import('./ModelSandboxPanel'), 'ModelSandboxPanel');
const GapModelPanel = lazyNamed(() => import('./GapModelPanel'), 'GapModelPanel');
const GvarPanel = lazyNamed(() => import('./GvarPanel'), 'GvarPanel');
const MacroLabPanel = lazyNamed(() => import('./MacroLabPanel'), 'MacroLabPanel');
const OfficialDocsPanel = lazyNamed(() => import('./OfficialDocsPanel'), 'OfficialDocsPanel');
const SanctionsPanel = lazyNamed(() => import('./SanctionsPanel'), 'SanctionsPanel');
const ForecastPanel = lazyNamed(() => import('./ForecastPanel'), 'ForecastPanel');
const FiscalMultiplierPanel = lazyNamed(() => import('./FiscalMultiplierPanel'), 'FiscalMultiplierPanel');

/**
 * Country page: everything about one sovereign, in the four sections Research shares with
 * Compare and My holdings. The old specialist desk tabs ran on built-in figures and were removed.
 */

export type CountryTabId = 'brief' | 'macro' | 'overview' | 'history';

export interface CountryTabConfig {
  id: CountryTabId;
  label: string;
}

// The first four use Research's shared section names (utils/researchSections.ts); ids stay so old links land.
export const COUNTRY_TABS: CountryTabConfig[] = [
  // Role start view (economist, banker): figures with sources and a link to the report template.
  { id: 'brief', label: 'Summary' },
  // MarketEdge: the economy, market pricing and model readings of where they disagree.
  { id: 'macro', label: 'Markets & signals' },
  // History: each figure's run of real observations as a chart (src/components/HistoryPanel.tsx).
  { id: 'history', label: 'History & data' },
  // Sources (id 'overview'): what is live for this country.
  { id: 'overview', label: 'Sources' },
];

/** Where the Country page opens when no role or desk says otherwise. */
export const DEFAULT_COUNTRY_TAB: CountryTabConfig = COUNTRY_TABS.find((t) => t.id === 'overview')!;

const Figure: React.FC<{ label: string; value: string; title?: string; missing?: string; onHistory?: () => void }> = ({ label, value, title, missing, onHistory }) => {
  const t = useT(RESEARCH);
  return (
  <div
    className={`min-w-0 ${onHistory ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
    title={onHistory ? `${title ? `${title} ` : ''}${t('clickHistory')}` : title}
    data-missing={missing ? 'true' : undefined}
    role={onHistory ? 'button' : undefined}
    tabIndex={onHistory ? 0 : undefined}
    onClick={onHistory}
    onKeyDown={onHistory ? (e) => (e.key === 'Enter' || e.key === ' ') && onHistory() : undefined}
  >
    <div className="text-xs text-slate-500 dark:text-slate-400 sm:whitespace-nowrap">{label}</div>
    <div className={`text-sm whitespace-nowrap [font-variant-numeric:tabular-nums] ${missing ? 'text-slate-400 dark:text-slate-500' : 'font-semibold text-slate-900 dark:text-white'}`}>
      {value}
    </div>
    {missing && <div className="text-xs text-amber-700 dark:text-amber-400 sm:whitespace-nowrap">{missing}</div>}
  </div>
  );
};

/** The header's key figures, each shown only from a real source. */
const HEADER_FIGURES: Array<{ path: string; label: string; fmt: (v: number) => string; series: string }> = [
  { path: 'imf.debtToGdpPct', label: 'Debt / GDP', fmt: (v) => `${v.toFixed(1)}%`, series: 'debt_gdp' },
  // The free stand-in for CDS (hidden for now): a bond spread, labelled as one.
  { path: 'market.hcBondSpreadBps', label: HC_SPREAD_LABEL, fmt: (v) => `${Math.round(v)} bps`, series: 'hc_spread' },
  { path: 'market.sovereign10YBondYieldPct', label: '10Y yield', fmt: (v) => `${v.toFixed(2)}%`, series: 'yield_10y' },
  { path: 'market.policyRatePct', label: 'Policy rate', fmt: (v) => `${v.toFixed(2)}%`, series: 'policy_rate' },
  { path: 'wb.fxReservesMonthsImport', label: 'Reserves', fmt: (v) => `${v.toFixed(1)} mo`, series: 'reserves_months' },
];

/** Header figure names in the chosen language. */
const FIG_KEY: Record<string, 'fig_debt' | 'fig_spread' | 'fig_yield' | 'fig_policy' | 'fig_reserves'> = {
  'market.hcBondSpreadBps': 'fig_spread',
  'imf.debtToGdpPct': 'fig_debt',
  'market.sovereign10YBondYieldPct': 'fig_yield',
  'market.policyRatePct': 'fig_policy',
  'wb.fxReservesMonthsImport': 'fig_reserves',
};

export const CountryPage: React.FC<{
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  /** Countries the app covers that are not on the open watchlist (src/utils/countryChoices.ts). */
  otherCountries?: WatchlistItem[];
  activeTab: CountryTabId;
  onChangeTab: (tab: CountryTabId) => void;
  onSelectCountry: (item: WatchlistItem) => void;
  onAddCountry: () => void;
  onSync: () => void;
  isSyncing: boolean;
  /** Opens the Compare page (the watchlist side by side). */
  onOpenCompare?: () => void;
  briefView: BriefView;
  onWriteNote: (view: BriefView) => void;
}> = ({
  run,
  watchlistItems,
  otherCountries = [],
  activeTab,
  onChangeTab,
  onSelectCountry,
  onAddCountry,
  onSync,
  isSyncing,
  onOpenCompare,
  briefView,
  onWriteNote,
}) => {
  const t = useT(RESEARCH);
  const tx = useTx();
  const net = useOnlineStatus();
  const offline = !!net && !net.online;
  // Exam mode: what was opened goes to the audit log for the teacher.
  useEffect(() => noteExamOpened('country', `${run.countryName}, ${activeTab}`), [run.countryName, activeTab]);
  const item = watchlistItems.find((w) => w.iso3 === run.iso3);
  const tabs = COUNTRY_TABS;
  const tab = tabs.find((t) => t.id === activeTab) || DEFAULT_COUNTRY_TAB;
  const open = run.openData;
  const status = useMemo(() => getSnapshotDataStatus(open), [open]);
  const events = useMemo(() => upcomingOfficialEvents([run.iso3], 120), [run.iso3]);
  // Which series History opens on, when a header figure was clicked.
  const [historyPick, setHistoryPick] = useState<string | null>(null);
  const showHistory = tabs.some((t) => t.id === 'history');
  // History & data: one tool open at a time, picked from the menu (or by a link from Tools or the chat).
  const [toolPick, setToolPick] = useState<string | null>(() => readToolPick());
  const pickTool = (id: string | null) => {
    setToolPick(id);
    saveToolPick(id);
  };
  useEffect(() => {
    const onTool = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (isCountryTool(id)) pickTool(id);
    };
    window.addEventListener(COUNTRY_TOOL_EVENT, onTool);
    return () => window.removeEventListener(COUNTRY_TOOL_EVENT, onTool);
  }, []);

  return (
    <div className="space-y-3" data-country-page="true">
      {/* Country header: one row with selector, key figures, data status and actions */}
      <div className="ui-panel px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="country-select" className="sr-only">
              {t('country')}
            </label>
            <select
              id="country-select"
              value={run.iso3}
              onChange={(e) => {
                if (e.target.value === '__add') {
                  onAddCountry();
                  return;
                }
                const next = watchlistItems.find((w) => w.iso3 === e.target.value) || otherCountries.find((w) => w.iso3 === e.target.value);
                if (next) onSelectCountry(next);
              }}
              className="text-lg font-semibold text-slate-900 dark:text-white bg-transparent border border-slate-200 dark:border-slate-700 px-2 py-1 pr-7"
            >
              {!item && !otherCountries.some((w) => w.iso3 === run.iso3) && <option value={run.iso3}>{run.countryName}</option>}
              {otherCountries.length ? (
                <>
                  <optgroup label={t('onWatchlist')}>
                    {watchlistItems.map((w) => (
                      <option key={w.iso3} value={w.iso3}>
                        {w.countryName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('otherCountries')}>
                    {otherCountries.map((w) => (
                      <option key={w.iso3} value={w.iso3}>
                        {w.countryName}
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                watchlistItems.map((w) => (
                  <option key={w.iso3} value={w.iso3}>
                    {w.countryName}
                  </option>
                ))
              )}
              <option value="__add">{t('addCountry')}</option>
            </select>
            {/* On a phone, Refresh sits beside the country as an icon. */}
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="ui-btn inline-flex sm:hidden ml-auto"
              aria-label={isSyncing ? t('refreshingShort') : t('refresh')}
              title={t('refreshTitleShort')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Two columns on a phone so the five figures take three short rows, one row on a wide screen. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-x-5">
            {HEADER_FIGURES.map((f) => {
              const v = status.live(f.path);
              const why = v === undefined ? pathMissing(status, f.path) : undefined;
              return (
                <Figure
                  key={f.path}
                  label={f.path === 'market.hcBondSpreadBps' && open.hcBondSpread ? `${t('fig_spread')}, ${hcSpreadWhen(open.hcBondSpread.period)}` : f.path === 'market.cds5YSpreadBps' && status.ownCds ? `5Y CDS, ${formatPeriod(status.ownCds.date)}` : f.path === 'market.sovereign10YBondYieldPct' && status.officialYield ? `${t('fig_yield')}, ${describeOfficialYield(status.officialYield).when}` : FIG_KEY[f.path] ? t(FIG_KEY[f.path]!) : f.label}
                  value={v === undefined ? t('missing') : f.fmt(v)}
                  missing={why ? tx(why.short) : undefined}
                  title={why ? tx(why.help) : f.path === 'market.hcBondSpreadBps' && open.hcBondSpread ? `${HC_SPREAD_LONG}, ${hcSpreadWhen(open.hcBondSpread.period)}, ${HC_SPREAD_SOURCE}. ${HC_SPREAD_NOT_CDS}` : f.path === 'market.sovereign10YBondYieldPct' && status.officialYield ? `Official figure: ${describeOfficialYield(status.officialYield).long}.` : f.path === 'market.cds5YSpreadBps' && status.ownCds ? `Your own ${status.ownCds.source} quote.` : undefined}
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

          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <DataStatusBadge snapshot={open} />
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="ui-btn hidden sm:inline-flex"
              title={t('refreshTitle')}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? t('refreshing') : t('refresh')}
            </button>
          </div>
        </div>
        {/* Quests about this country, only while Quests are switched on (nothing shows otherwise). */}
        <React.Suspense fallback={null}>
          <div className="mt-2 empty:hidden">
            <QuestLinks iso3s={[run.iso3]} where="country" />
          </div>
        </React.Suspense>

        {/* Sections: the same four as Compare and My holdings */}
        <ResearchSectionNav
          ariaLabel={t('countrySectionsAria')}
          active={tab.id}
          onChange={(id) => onChangeTab(id as CountryTabId)}
          sections={tabs}
        />
      </div>

      {tab.id === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 space-y-2">
            <section className="ui-panel">
              <header className="ui-panel-header">
                <h2 className="ui-section-title">{offline ? t('savedFor', { name: run.countryName }) : t('liveFor', { name: run.countryName })}</h2>
                <p className="ui-label">
                  {t('sourcesNote')}
                  {offline && t('sourcesOffline')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(run.iso3)}/figures.csv`} download>
                    {t('downloadCsv')}
                  </a>
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(run.iso3)}/figures.xlsx`} download>
                    {t('excel')}
                  </a>
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(run.iso3)}/report.html`} download data-offline-report>
                    {t('offlineReport')}
                  </a>
                  <button type="button" className="ui-btn ui-btn-ghost inline-flex" onClick={() => openDataLicences()} data-open-licences>
                    {t('licences')}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('termsNote')}</p>
                <SourceCredits credits={creditsForSources(run.openData?.liveApiSourcesActive ?? [])} className="mt-1" />
              </header>
            </section>
            <FreshnessPanel item={watchlistItems.find((w) => w.iso3 === run.iso3)} />
            <BriefGroups brief={{ headline: '', judgements: [], groups: countryDataSources(run) }} picker />
          </div>
          <section className="ui-panel">
            <header className="ui-panel-header">
              <h2 className="ui-section-title">{t('comingUp')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('comingUpNote')}</p>
            </header>
            <div className="p-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hasOfficialSchedule(run.iso3)
                    ? t('nothingScheduled')
                    : t('noSchedule', { name: run.countryName })}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {events.slice(0, 6).map((ev) => (
                    <li key={`${ev.date}-${ev.title}`} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-900 dark:text-white">
                          {ev.title}
                          {ev.dateKind === 'legal_deadline' && <span className="text-xs text-slate-500 dark:text-slate-400">{t('lawDate')}</span>}
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
                          {ev.daysUntil === 0 ? t('today') : t('inDays', { n: ev.daysUntil })}
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
                <Plus className="w-3 h-3" /> {t('addAnother')}
              </button>
            </div>
          </section>
        </div>
      )}

      {tab.id === 'history' && (
        <div className="space-y-3">
          <div id="tool-history" className="scroll-mt-4" />
          <React.Suspense fallback={<DeskLoading />}>
            <HistoryPanel key={run.iso3} iso3={run.iso3} countryName={run.countryName} pick={historyPick} />
          </React.Suspense>
          <ToolMenu
            country={{ iso3: run.iso3, countryName: run.countryName, currencyCode: run.openData?.currencyCode }}
            pick={toolPick}
            onPick={(id) => {
              pickTool(id);
              // Bring the tool that just opened into view.
              if (id) window.setTimeout(() => document.querySelector('[data-tool-menu]')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 60);
            }}
          />
          <ToolSlot id="tool-event-history" pick={toolPick}>
            <PanelBoundary name="Event history">
              <React.Suspense fallback={<DeskLoading />}>
                <GdeltHistoryPanel key={`gdelt-daily-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-risk-scorecard" pick={toolPick}>
            <PanelBoundary name="Country risk scorecard">
              <React.Suspense fallback={<DeskLoading />}>
                <RiskScorecardPanel key={`risk-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-sanctions" pick={toolPick}>
            <PanelBoundary name="Sanctions lists">
              <React.Suspense fallback={<DeskLoading />}>
                <SanctionsPanel key={`sanctions-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-unit-converters" pick={toolPick}>
            <PanelBoundary name="Unit converters">
              <React.Suspense fallback={<DeskLoading />}>
                <UnitConverterPanel key={`conv-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-exercises" pick={toolPick}>
            <PanelBoundary name="Exercises">
              <React.Suspense fallback={<DeskLoading />}>
                <ExercisesPanel key={`ex-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-macro-lab" pick={toolPick}>
            <PanelBoundary name="Macro lab">
              <React.Suspense fallback={<DeskLoading />}>
                <MacroLabPanel key={`ml-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} snapshot={run.openData} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-sandboxes" pick={toolPick}>
            <PanelBoundary name="Model sandboxes">
              <React.Suspense fallback={<DeskLoading />}>
                <ModelSandboxPanel key={`sb-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-restructuring" pick={toolPick}>
            <PanelBoundary name="Debt restructuring calculator">
              <React.Suspense fallback={<DeskLoading />}>
                <RestructuringCalcPanel key={`rc-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-gap-model" pick={toolPick}>
            <PanelBoundary name="Small gap model">
              <React.Suspense fallback={<DeskLoading />}>
                <GapModelPanel key={`gm-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} snapshot={run.openData} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-gvar" pick={toolPick}>
            <PanelBoundary name="How shocks spread between economies">
              <React.Suspense fallback={<DeskLoading />}>
                <GvarPanel key={`gv-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-forecast" pick={toolPick}>
            <PanelBoundary name="Nowcast and forecasts">
              <React.Suspense fallback={<DeskLoading />}>
                <ForecastPanel key={`fc-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-output-gap" pick={toolPick}>
            <PanelBoundary name="Output gap">
              <React.Suspense fallback={<DeskLoading />}>
                <OutputGapPanel key={`gap-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-debt-sustainability" pick={toolPick}>
            <PanelBoundary name="Debt sustainability">
              <React.Suspense fallback={<DeskLoading />}>
                <DebtSustainabilityPanel key={`dsa-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-gross-financing-need" pick={toolPick}>
            <PanelBoundary name="Gross financing need">
              <React.Suspense fallback={<DeskLoading />}>
                <GfnPanel key={`gfn-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-reserve-adequacy" pick={toolPick}>
            <PanelBoundary name="Reserve adequacy">
              <React.Suspense fallback={<DeskLoading />}>
                <ReserveAdequacyPanel key={`ara-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-external-sustainability" pick={toolPick}>
            <PanelBoundary name="External sustainability">
              <React.Suspense fallback={<DeskLoading />}>
                <ExternalSustainabilityPanel key={`es-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-crisis-warning" pick={toolPick}>
            <PanelBoundary name="Crisis early-warning">
              <React.Suspense fallback={<DeskLoading />}>
                <CrisisWarningPanel key={`cw-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-yield-curve" pick={toolPick}>
            <PanelBoundary name="Yield curve">
              <React.Suspense fallback={<DeskLoading />}>
                <YieldCurvePanel key={`yc-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-full-curves" pick={toolPick}>
            <PanelBoundary name="Full yield curves">
              <React.Suspense fallback={<DeskLoading />}>
                <FullCurvesPanel key={`fyc-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-surprises" pick={toolPick}>
            <PanelBoundary name="Data surprises">
              <React.Suspense fallback={<DeskLoading />}>
                <SurprisesPanel key={`sp-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-inflation-drivers" pick={toolPick}>
            <PanelBoundary name="Inflation drivers">
              <React.Suspense fallback={<DeskLoading />}>
                <InflationDriversPanel key={`inf-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-growth-accounting" pick={toolPick}>
            <PanelBoundary name="Growth accounting">
              <React.Suspense fallback={<DeskLoading />}>
                <GrowthAccountingPanel key={`ga-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-bank-sovereign" pick={toolPick}>
            <PanelBoundary name="Bank and government links">
              <React.Suspense fallback={<DeskLoading />}>
                <BankSovereignPanel key={`bs-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-policy-incidence" pick={toolPick}>
            <PanelBoundary name="Who pays for a policy">
              <React.Suspense fallback={<DeskLoading />}>
                <PolicyIncidencePanel key={`pi-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-cb-words" pick={toolPick}>
            <PanelBoundary name="Central bank word count">
              <React.Suspense fallback={<DeskLoading />}>
                <CbWordsPanel key={`cbw-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-fiscal-rules" pick={toolPick}>
            <PanelBoundary name="Fiscal rules">
              <React.Suspense fallback={<DeskLoading />}>
                <FiscalRulesPanel key={`fr-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-budget-credibility" pick={toolPick}>
            <PanelBoundary name="Budget credibility">
              <React.Suspense fallback={<DeskLoading />}>
                <BudgetCredibilityPanel key={`bc-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-budget-execution" pick={toolPick}>
            <PanelBoundary name="Budget execution">
              <React.Suspense fallback={<DeskLoading />}>
                <BudgetExecutionPanel key={`be-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-remittances" pick={toolPick}>
            <PanelBoundary name="Remittances">
              <React.Suspense fallback={<DeskLoading />}>
                <RemittancesPanel key={`rm-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-financial-inclusion" pick={toolPick}>
            <PanelBoundary name="Financial inclusion">
              <React.Suspense fallback={<DeskLoading />}>
                <FinancialInclusionPanel key={`fi-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-commodity-terms" pick={toolPick}>
            <PanelBoundary name="Commodity prices and terms of trade">
              <React.Suspense fallback={<DeskLoading />}>
                <CommodityTermsPanel key={`ct-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-aid" pick={toolPick}>
            <PanelBoundary name="Aid received">
              <React.Suspense fallback={<DeskLoading />}>
                <AidPanel key={`ad-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-wb-projects" pick={toolPick}>
            <PanelBoundary name="World Bank projects">
              <React.Suspense fallback={<DeskLoading />}>
                <WbProjectsPanel key={`wp-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-official-docs" pick={toolPick}>
            <PanelBoundary name="Official documents">
              <React.Suspense fallback={<DeskLoading />}>
                <OfficialDocsPanel key={`od-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-regional" pick={toolPick}>
            <PanelBoundary name="Regional figures">
              <React.Suspense fallback={<DeskLoading />}>
                <RegionalPanel key={`rg-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-food-prices" pick={toolPick}>
            <PanelBoundary name="Food prices and food security">
              <React.Suspense fallback={<DeskLoading />}>
                <FoodPricesPanel key={`fp-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-disasters" pick={toolPick}>
            <PanelBoundary name="Natural disasters">
              <React.Suspense fallback={<DeskLoading />}>
                <DisastersPanel key={`dis-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-parametric-trigger" pick={toolPick}>
            <PanelBoundary name="Parametric insurance trigger designer">
              <React.Suspense fallback={<DeskLoading />}>
                <ParametricTriggerPanel key={`pt-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-storm-tracks" pick={toolPick}>
            <PanelBoundary name="Tropical cyclones">
              <React.Suspense fallback={<DeskLoading />}>
                <StormTracksPanel key={`st-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-fiscal-reaction" pick={toolPick}>
            <PanelBoundary name="Fiscal reaction">
              <React.Suspense fallback={<DeskLoading />}>
                <BohnPanel key={`bohn-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-global-scenarios" pick={toolPick}>
            <PanelBoundary name="Global shock scenarios">
              <React.Suspense fallback={<DeskLoading />}>
                <ScenarioPanel key={`scenario-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-event-study" pick={toolPick}>
            <PanelBoundary name="Currency around rate decisions">
              <React.Suspense fallback={<DeskLoading />}>
                <EventStudyPanel key={`event-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-beer" pick={toolPick}>
            <PanelBoundary name="BEER fair value">
              <React.Suspense fallback={<DeskLoading />}>
                <BeerPanel key={`beer-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-rule-family" pick={toolPick}>
            <PanelBoundary name="Policy rules">
              <React.Suspense fallback={<DeskLoading />}>
                <RuleFamilyPanel key={`rules-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-local-projections" pick={toolPick}>
            <PanelBoundary name="Inflation after rate changes">
              <React.Suspense fallback={<DeskLoading />}>
                <LocalProjectionsPanel key={`lp-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-fiscal-multipliers" pick={toolPick}>
            <PanelBoundary name="Fiscal multipliers">
              <React.Suspense fallback={<DeskLoading />}>
                <FiscalMultiplierPanel key={`mult-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} item={item} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-weo-vintages" pick={toolPick}>
            <PanelBoundary name="IMF forecasts by edition">
              <React.Suspense fallback={<DeskLoading />}>
                <WeoVintagesPanel key={`weo-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          {run.iso3 === 'USA' && (
            <>
              <ToolSlot id="tool-us-vintages" pick={toolPick}>
                <PanelBoundary name="US data as first published">
                  <React.Suspense fallback={<DeskLoading />}>
                    <UsVintagesPanel />
                  </React.Suspense>
                </PanelBoundary>
              </ToolSlot>
            </>
          )}
          {run.iso3 === 'GBR' && (
            <>
              <ToolSlot id="tool-first-published" pick={toolPick}>
                <PanelBoundary name="UK GDP as first published">
                  <React.Suspense fallback={<DeskLoading />}>
                    <UsVintagesPanel area="uk" />
                  </React.Suspense>
                </PanelBoundary>
              </ToolSlot>
            </>
          )}
          {run.openData?.currencyCode === 'EUR' && (
            <>
              <ToolSlot id="tool-first-published" pick={toolPick}>
                <PanelBoundary name="Euro area figures as first published">
                  <React.Suspense fallback={<DeskLoading />}>
                    <UsVintagesPanel area="ea" />
                  </React.Suspense>
                </PanelBoundary>
              </ToolSlot>
            </>
          )}
          <ToolSlot id="tool-as-of" pick={toolPick}>
            <PanelBoundary name="As of a past day">
              <React.Suspense fallback={<DeskLoading />}>
                <AsOfPanel key={`asof-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-decision-replay" pick={toolPick}>
            <PanelBoundary name="Replicate a rate decision">
              <React.Suspense fallback={<DeskLoading />}>
                <DecisionReplayPanel key={`replay-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
          <ToolSlot id="tool-track-record" pick={toolPick}>
            <PanelBoundary name="Track record">
              <React.Suspense fallback={<DeskLoading />}>
                <TrackRecordPanel key={`track-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          </ToolSlot>
        </div>
      )}
      {tab.id === 'macro' && (
        <MarketsMacroPanel
          run={run}
          peers={watchlistItems}
          onOpenCountry={onSelectCountry}
          onOpenCompare={onOpenCompare}
          afterSummary={
            <PanelBoundary name="News and events">
              <React.Suspense fallback={<DeskLoading />}>
                <GdeltEventsPanel key={`gdelt-${run.iso3}`} iso3={run.iso3} countryName={run.countryName} />
              </React.Suspense>
            </PanelBoundary>
          }
        />
      )}
      {tab.id === 'brief' && <CountryBriefPanel key={briefView} run={run} peers={watchlistItems} view={briefView} onWriteNote={onWriteNote} />}
    </div>
  );
};

/** One History & data tool: drawn only while it is the one picked. */
const ToolSlot: React.FC<{ id: string; pick: string | null; children: React.ReactNode }> = ({ id, pick, children }) =>
  pick === id ? (
    <div className="space-y-3" data-country-tool={id}>
      <div id={id} className="scroll-mt-4" />
      {children}
    </div>
  ) : null;

/**
 * The History & data tool menu: every tool by group when none is open; a compact picker above the
 * open one, with "All tools" to go back to the full menu.
 */
const ToolMenu: React.FC<{
  country: { iso3: string; countryName: string; currencyCode?: string };
  pick: string | null;
  onPick: (id: string | null) => void;
}> = ({ country, pick, onPick }) => {
  const t = useT(RESEARCH);
  const groups = toolGroupsFor(country);
  const open = groups.some((g) => g.tools.some((x) => x.id === pick));
  if (open) {
    return (
      <div className="ui-panel px-4 py-2 flex flex-wrap items-center gap-2" data-tool-menu="compact">
        <label htmlFor="country-tool-pick" className="ui-label">
          {t('tm_pick')}
        </label>
        <select
          id="country-tool-pick"
          value={pick ?? ''}
          onChange={(e) => onPick(e.target.value || null)}
          className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 px-2 py-1 pr-7 max-w-full"
          data-tool-select
        >
          <option value="">{t('tm_choose')}</option>
          {groups.map((g) => (
            <optgroup key={g.id} label={t(g.label as 'tg_debt')}>
              {g.tools.map((x) => (
                <option key={x.id} value={x.id}>
                  {t(x.label as 'tl_aid')}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => onPick(null)} data-tool-all>
          {t('tm_all')}
        </button>
      </div>
    );
  }
  return (
    <section className="ui-panel" data-tool-menu="full">
      <header className="ui-panel-header">
        <h2 className="ui-section-title">{t('tm_title', { name: country.countryName })}</h2>
        <p className="ui-label">{t('tm_note')}</p>
      </header>
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-4">
        {groups.map((g) => (
          <div key={g.id} data-tool-group={g.id}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{t(g.label as 'tg_debt')}</h3>
            <ul className="space-y-0.5">
              {g.tools.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    className="text-left text-sm text-blue-700 dark:text-blue-300 hover:underline"
                    onClick={() => onPick(x.id)}
                    data-tool-open={x.id}
                  >
                    {t(x.label as 'tl_aid')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * Sources tab: dated figures older than their source usually runs, with why and what would give a
 * fresher one (src/utils/freshness.ts). Says so in one line when everything is within its usual age.
 */
const FreshnessPanel: React.FC<{ item?: WatchlistItem }> = ({ item }) => {
  const checks = item ? freshnessChecks(item) : [];
  if (!checks.length) return null;
  const t = useT(RESEARCH);
  const stale = checks.filter((c) => c.stale);
  return (
    <section className="ui-panel" data-freshness="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title">{stale.length ? t('olderThan', { stale: stale.length, total: checks.length }) : t('freshness')}</h2>
        <p className="ui-label">
          {stale.length
            ? t('staleNote')
            : t('allFresh', { n: checks.length })}
        </p>
      </header>
      {stale.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {stale.map((c) => (
            <li key={c.id} className="px-4 py-2 text-sm" data-stale-figure={c.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">{c.label}</span>
                <span className="text-xs tabular-nums text-amber-700 dark:text-amber-400">
                  {c.period}: {describeAge(c)}
                </span>
              </div>
              {c.why && <p className="text-xs text-slate-600 dark:text-slate-400">{c.why}</p>}
              {c.fresher && <p className="text-xs text-slate-600 dark:text-slate-400">{t('fresher', { source: c.fresher })}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
