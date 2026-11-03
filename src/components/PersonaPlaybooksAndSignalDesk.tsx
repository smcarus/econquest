import React, { useState, useMemo } from 'react';
import {
  CouncilAssessmentRun,
  WatchlistItem,
  UserPersonaId,
  StrategyBacktestInputs,
  SystematicStrategyId,
} from '../types/council';
import {
  DEFAULT_STRATEGY_BACKTEST_INPUTS,
  computeCrossHubPersonaSignals,
  buildPersonaWorkflowPlaybooks,
  computeSystematicStrategyBacktestSuite,
  buildAcademicResearchExportSuite,
  exportEmpiricalPanelCsv,
  exportAcademicWorkingPaperMarkdown,
} from '../utils/personaPlaybooksAndSignalEngine';
import {
  Radar,
  Compass,
  LineChart,
  GraduationCap,
  Zap,
  ArrowUpRight,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  UserCheck,
  Building2,
  BookOpen,
} from 'lucide-react';

export type PersonaPlaybookSubTabId =
  | 'persona_cross_hub_signal_scanner'
  | 'persona_guided_playbook_cockpit'
  | 'persona_strategy_backtester_lab'
  | 'persona_academic_latex_csv_exporter';

interface PersonaPlaybooksAndSignalDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  activePersona: UserPersonaId;
  onChangePersona: (persona: UserPersonaId) => void;
  isDark?: boolean;
  activeSubTab?: PersonaPlaybookSubTabId;
  onSelectSubTab?: (subTab: PersonaPlaybookSubTabId) => void;
  onJumpToNavSection?: (navSectionId: string) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onApplyShockToTerminal?: (params: {
    label: string;
    cdsDeltaBps: number;
    yield10YDeltaBps: number;
    fxDepreciationPct: number;
  }) => void;
}

export const PersonaPlaybooksAndSignalDesk: React.FC<PersonaPlaybooksAndSignalDeskProps> = ({
  run,
  watchlistItems,
  activePersona,
  onChangePersona,
  activeSubTab: controlledSubTab,
  onSelectSubTab,
  onJumpToNavSection,
  onSelectSovereign,
  onApplyShockToTerminal,
}) => {
  const [localSubTab, setLocalSubTab] = useState<PersonaPlaybookSubTabId>(
    'persona_cross_hub_signal_scanner'
  );

  const validSubTabs: PersonaPlaybookSubTabId[] = [
    'persona_cross_hub_signal_scanner',
    'persona_guided_playbook_cockpit',
    'persona_strategy_backtester_lab',
    'persona_academic_latex_csv_exporter',
  ];

  const activeSubTab: PersonaPlaybookSubTabId =
    controlledSubTab && validSubTabs.includes(controlledSubTab)
      ? controlledSubTab
      : localSubTab;

  const handleSelectSubTab = (tab: PersonaPlaybookSubTabId) => {
    setLocalSubTab(tab);
    if (onSelectSubTab) onSelectSubTab(tab);
  };

  const [backtestInputs, setBacktestInputs] = useState<StrategyBacktestInputs>(
    DEFAULT_STRATEGY_BACKTEST_INPUTS
  );
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);
  const [copiedBibtex, setCopiedBibtex] = useState<boolean>(false);

  // Quantitative Engines
  const signals = useMemo(
    () =>
      computeCrossHubPersonaSignals(run.openData, watchlistItems, activePersona),
    [run.openData, watchlistItems, activePersona]
  );

  const playbooks = useMemo(
    () => buildPersonaWorkflowPlaybooks(run.openData, watchlistItems),
    [run.openData, watchlistItems]
  );

  const activePlaybook = useMemo(
    () =>
      playbooks.find((p) => p.personaId === activePersona) || playbooks[0],
    [playbooks, activePersona]
  );

  const backtestSuite = useMemo(
    () =>
      computeSystematicStrategyBacktestSuite(
        run.openData,
        watchlistItems,
        backtestInputs
      ),
    [run.openData, watchlistItems, backtestInputs]
  );

  const academicSuite = useMemo(
    () => buildAcademicResearchExportSuite(run.openData, watchlistItems),
    [run.openData, watchlistItems]
  );

  const personaOptions: {
    id: UserPersonaId;
    label: string;
    shortBadge: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'INDIVIDUAL_TRADER',
      label: 'Individual Macro & Prediction Trader',
      shortBadge: 'Event Arb & Taylor Front-Run',
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'INSTITUTIONAL_PM_IC',
      label: 'Institutional Sovereign PM & IC Desk',
      shortBadge: 'Fallen-Angel, Doom-Loop & CAC NPV',
      icon: <Building2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'POLICY_RESEARCHER',
      label: 'Multilateral Policy & Academic Researcher',
      shortBadge: 'IMF DSA, Reserve Freeze & LaTeX',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
  ];

  const subTabConfigs: {
    id: PersonaPlaybookSubTabId;
    code: string;
    label: string;
    badge: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'persona_cross_hub_signal_scanner',
      code: '10.1',
      label: 'Cross-Hub Top Alpha & Research Scanner',
      badge: `${signals.length} Live Signals`,
      icon: <Radar className="w-3.5 h-3.5" />,
    },
    {
      id: 'persona_guided_playbook_cockpit',
      code: '10.2',
      label: 'Guided Persona Playbook Cockpit',
      badge: activePersona === 'INDIVIDUAL_TRADER' ? 'Trader' : activePersona === 'INSTITUTIONAL_PM_IC' ? 'Institution' : 'Researcher',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    {
      id: 'persona_strategy_backtester_lab',
      code: '10.3',
      label: 'Systematic Strategy Backtester Lab',
      badge: `Sharpe ${backtestSuite.annualizedSharpeRatio.toFixed(2)}`,
      icon: <LineChart className="w-3.5 h-3.5" />,
    },
    {
      id: 'persona_academic_latex_csv_exporter',
      code: '10.4',
      label: 'Academic LaTeX & Empirical CSV Exporter',
      badge: `N=${academicSuite.panelRows.length} Panel`,
      icon: <GraduationCap className="w-3.5 h-3.5" />,
    },
  ];

  const handleCopyText = (text: string, type: 'latex' | 'bibtex') => {
    navigator.clipboard.writeText(text);
    if (type === 'latex') {
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    } else {
      setCopiedBibtex(true);
      setTimeout(() => setCopiedBibtex(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Institutional Header + Persona Switcher */}
      <div className="institutional-card p-5 border-l-4 border-l-emerald-600">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>TIER-10 CROSS-HUB SIGNAL SYNTHESIS, PERSONA PLAYBOOKS & EMPIRICAL EXPORTER</span>
              <span>•</span>
              <span>ZERO-NOTIONAL NORMALIZED (% GDP / BPS / 0–100¢ / SHARPE)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              10. Persona Playbooks, 9-Hub Signal Scanner, Strategy Backtester & Academic LaTeX Lab —{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {run.countryName} ({run.iso3})
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-4xl">
              Operationalizes the entire platform across three specialized lenses: **Individual Trader** (Polymarket/Kalshi vs. CDS arbitrage & Taylor front-running), **Institutional PM & Risk Committee** (Fallen-angel cliffs, Bank CET1 doom-loops & Paris Club CAC recovery floors), and **Policy & Academic Researcher** (Snowball $r - g$ counterfactuals, reserve custody freeze resilience & publication-ready LaTeX/CSV empirical panels).
            </p>
          </div>

          {/* 3-Mode Persona Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {personaOptions.map((p) => {
              const isSelected = activePersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onChangePersona(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <span>{p.icon}</span>
                  <div>
                    <div className="text-xs font-bold leading-tight">{p.label}</div>
                    <div
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {p.shortBadge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Tab Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          {subTabConfigs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectSubTab(tab.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded text-left border transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={isActive ? 'text-emerald-300 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}>
                    {tab.icon}
                  </span>
                  <div className="truncate">
                    <span className="text-[10px] font-mono opacity-75 mr-1.5">{tab.code}</span>
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </div>
                </div>
                <span
                  className={`ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          10.1 AUTOMATED CROSS-HUB TOP ALPHA & RESEARCH SIGNAL SCANNER
         ===================================================================== */}
      {activeSubTab === 'persona_cross_hub_signal_scanner' && (
        <div className="space-y-6">
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-emerald-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 mr-2">
                [LIVE 9-HUB WATCHLIST SYNTHESIS — {activePersona.replace(/_/g, ' ')}]
              </span>
              Scanning {watchlistItems.length} watchlist sovereigns across CDS hazard dislocations, Polymarket/Kalshi event spreads, S&P/Moody’s/Fitch shadow ratings, BEER/FEER FX misalignments, Bank CET1 doom-loops, Paris Club CAC recovery floors, Taylor Rule stance gaps, and G7 custody freeze buffers.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSelectSubTab('persona_guided_playbook_cockpit')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white"
              >
                <Compass className="w-3.5 h-3.5" />
                Open Step-by-Step Playbook
              </button>
            </div>
          </div>

          {/* Top-3 Flagship Signal Cards + 3 Secondary Watchlist Signals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {signals.slice(0, 3).map((sig) => (
              <div
                key={sig.signalId}
                className="institutional-card p-5 flex flex-col justify-between border-t-4 border-t-emerald-600"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      #{sig.rank} TOP {sig.personaId === 'INDIVIDUAL_TRADER' ? 'TRADER ALPHA' : sig.personaId === 'INSTITUTIONAL_PM_IC' ? 'INSTITUTIONAL IC' : 'POLICY RESEARCH'} SIGNAL
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Conviction: {sig.convictionScore}/100
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {sig.sourceHubLabel} • {sig.signalCategory}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {sig.countryName} ({sig.iso3}) — {sig.primaryDislocationMetric}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {sig.headlineThesis}
                  </p>

                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Entry Anchor:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold text-right">
                        {sig.entryBenchmark}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Target Convergence:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-right">
                        {sig.targetConvergence}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400">
                      Kill-Switch: {sig.killSwitchInvalidation}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 text-xs">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 mr-1">
                      Actionable Expression:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {sig.recommendedExpression}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      const found = watchlistItems.find((w) => w.iso3 === sig.iso3);
                      if (found && onSelectSovereign) onSelectSovereign(found);
                      if (onJumpToNavSection) onJumpToNavSection(sig.targetNavSection);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Inspect Source Hub
                  </button>
                  {onApplyShockToTerminal && (
                    <button
                      onClick={() => onApplyShockToTerminal(sig.shockPropagationPayload)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Simulate in Terminal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Complete Ranked Cross-Hub Signal Table */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Full Ranked Cross-Hub Watchlist Signal Queue ({activePersona.replace(/_/g, ' ')})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3">Source Hub</th>
                    <th className="py-2.5 px-3">Dislocation Metric</th>
                    <th className="py-2.5 px-3">Recommended Trade / Policy Expression</th>
                    <th className="py-2.5 px-3 text-right">Conviction</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {signals.map((sig) => (
                    <tr key={sig.signalId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        #{sig.rank}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {sig.countryName} ({sig.iso3})
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        {sig.sourceHubLabel}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {sig.primaryDislocationMetric}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {sig.recommendedExpression}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {sig.convictionScore}/100
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            const found = watchlistItems.find((w) => w.iso3 === sig.iso3);
                            if (found && onSelectSovereign) onSelectSovereign(found);
                            if (onJumpToNavSection) onJumpToNavSection(sig.targetNavSection);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          Open Hub
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          10.2 GUIDED PERSONA PLAYBOOK COCKPIT
         ===================================================================== */}
      {activeSubTab === 'persona_guided_playbook_cockpit' && (
        <div className="space-y-6">
          <div className="institutional-card p-5 bg-slate-50/70 dark:bg-slate-900/50 border-l-4 border-l-indigo-600">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono uppercase text-indigo-600 dark:text-indigo-400">
                  ACTIVE OPERATIONAL PLAYBOOK • {activePlaybook.personaId.replace(/_/g, ' ')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activePlaybook.personaTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {activePlaybook.personaSubtitle}
                </p>
              </div>
              <div className="p-3.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md">
                <div className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                  Structural Edge Mechanism
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                  {activePlaybook.coreEdgeStatement}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">
                Zero-Notional Benchmark Metrics:
              </span>
              {activePlaybook.primaryMetricsUsed.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 text-[11px] font-mono rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* 4-Step Guided Execution Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activePlaybook.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="institutional-card p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-indigo-600 text-white">
                      STEP {step.stepNumber}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-mono rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {step.liveTelemetryBadge}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {step.hubReference}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {step.stepTitle}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.analyticalObjective}
                  </p>

                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                        Quantitative Decision Rule:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {step.decisionRule}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                        Why It Generates Edge:
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {step.edgeMechanism}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    Target Module: {step.hubReference}
                  </span>
                  <button
                    onClick={() => {
                      if (onJumpToNavSection) {
                        if (
                          step.targetNavSection === 'persona_academic_latex_csv_exporter'
                        ) {
                          handleSelectSubTab('persona_academic_latex_csv_exporter');
                        } else {
                          onJumpToNavSection(step.targetNavSection);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    Launch Step {step.stepNumber} Workspace
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          10.3 SYSTEMATIC STRATEGY BACKTESTER & HISTORICAL REGIME REPLAY
         ===================================================================== */}
      {activeSubTab === 'persona_strategy_backtester_lab' && (
        <div className="space-y-6">
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-indigo-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 mr-2">
                [SYSTEMATIC CROSS-HUB BACKTESTER — {backtestSuite.strategyTitle}]
              </span>
              {backtestSuite.strategyRuleSummary}
            </div>
            <button
              onClick={() => setBacktestInputs(DEFAULT_STRATEGY_BACKTEST_INPUTS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Backtest Rules
            </button>
          </div>

          {/* Backtest KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Cumulative Net Alpha
              </div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                +{backtestSuite.totalCumulativeNetAlphaBps} bps
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Net of {backtestInputs.transactionBidAskHaircutBps} bps bid-ask cost
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Annualized Sharpe Ratio
              </div>
              <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {backtestSuite.annualizedSharpeRatio.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Risk-adjusted spread capture
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Win / Hit Rate (%)
              </div>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                {backtestSuite.winHitRatePct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Across 12 historical regime windows
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Profit Factor
              </div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {backtestSuite.profitFactor.toFixed(2)}x
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gross wins / gross losses
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Max Drawdown (bps)
              </div>
              <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                -{backtestSuite.maxDrawdownBps} bps
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Capped by {backtestInputs.stopLossKillSwitchBps} bps kill-switch
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Brier Calibration Score
              </div>
              <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {backtestSuite.brierCalibrationScore.toFixed(3)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                0.00 = Perfect calibration
              </div>
            </div>
          </div>

          {/* Controls + Cumulative Alpha Curve SVG */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Systematic Rule & Risk-Control Calibrator
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select strategy archetype, entry conviction filter, kill-switch stop, and holding horizon
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Systematic Cross-Hub Strategy Rule
                  </label>
                  <select
                    value={backtestInputs.strategyId}
                    onChange={(e) =>
                      setBacktestInputs((prev) => ({
                        ...prev,
                        strategyId: e.target.value as SystematicStrategyId,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="PREDICTION_MARKET_CDS_ARB">
                      1. Polymarket / Kalshi vs. 5Y CDS Hazard Arbitrage (Trader)
                    </option>
                    <option value="TAYLOR_BEHIND_CURVE_FX_SHORT">
                      2. Taylor Rule Behind-the-Curve & REER Overvaluation (Trader)
                    </option>
                    <option value="SHADOW_RATING_FALLEN_ANGEL_HEDGE">
                      3. Shadow Rating BBB-/BB+ Fallen-Angel Pre-Hedge (Institutional)
                    </option>
                    <option value="DISTRESSED_EUROBOND_NPV_WORKOUT">
                      4. IMF / Paris Club Eurobond NPV Floor Workout (Institutional)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Minimum Signal Dislocation Threshold (¢ / Notch Score)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ≥ {backtestInputs.entryThresholdScore}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={20}
                    step={1}
                    value={backtestInputs.entryThresholdScore}
                    onChange={(e) =>
                      setBacktestInputs((prev) => ({
                        ...prev,
                        entryThresholdScore: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Pre-Mortem Hard Stop-Loss Kill-Switch (bps)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{backtestInputs.stopLossKillSwitchBps} bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={180}
                    step={5}
                    value={backtestInputs.stopLossKillSwitchBps}
                    onChange={(e) =>
                      setBacktestInputs((prev) => ({
                        ...prev,
                        stopLossKillSwitchBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Transaction Bid-Ask & Roll Slippage (bps)
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {backtestInputs.transactionBidAskHaircutBps} bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={2}
                    value={backtestInputs.transactionBidAskHaircutBps}
                    onChange={(e) =>
                      setBacktestInputs((prev) => ({
                        ...prev,
                        transactionBidAskHaircutBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Convergence Holding Horizon
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([30, 90, 180] as const).map((days) => (
                      <button
                        key={days}
                        onClick={() =>
                          setBacktestInputs((prev) => ({
                            ...prev,
                            holdingHorizonDays: days,
                          }))
                        }
                        className={`py-1.5 text-xs font-mono font-bold rounded border ${
                          backtestInputs.holdingHorizonDays === days
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cumulative Net Alpha Equity Curve SVG */}
            <div className="lg:col-span-7 institutional-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Historical Regime Replay Cumulative Net Alpha Curve (bps, 2022–2025)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tracks cumulative spread/probability alpha (in basis points) net of transaction costs and kill-switch stops
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Total: +{backtestSuite.totalCumulativeNetAlphaBps} bps
                  </span>
                </div>

                {(() => {
                  const maxVal = Math.max(
                    300,
                    ...backtestSuite.historicalWindows.map((w) => w.cumulativeAlphaBps)
                  );
                  const minVal = Math.min(
                    0,
                    ...backtestSuite.historicalWindows.map((w) => w.cumulativeAlphaBps)
                  );
                  const range = Math.max(100, maxVal - minVal);

                  return (
                    <div className="w-full overflow-x-auto">
                      <svg viewBox="0 0 660 230" className="w-full h-56">
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const val = Math.round(minVal + ratio * range);
                          const y = 190 - ratio * 155;
                          return (
                            <g key={idx}>
                              <line
                                x1={55}
                                y1={y}
                                x2={630}
                                y2={y}
                                stroke="currentColor"
                                className="text-slate-200 dark:text-slate-800"
                                strokeDasharray="3 3"
                              />
                              <text
                                x={48}
                                y={y + 4}
                                textAnchor="end"
                                className="text-[10px] font-mono fill-slate-400"
                              >
                                {val} bps
                              </text>
                            </g>
                          );
                        })}

                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={3}
                          points={backtestSuite.historicalWindows
                            .map((w, idx) => {
                              const x =
                                68 +
                                (idx /
                                  Math.max(1, backtestSuite.historicalWindows.length - 1)) *
                                  545;
                              const y =
                                190 -
                                ((w.cumulativeAlphaBps - minVal) / range) * 155;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />

                        {backtestSuite.historicalWindows.map((w, idx) => {
                          const x =
                            68 +
                            (idx /
                              Math.max(1, backtestSuite.historicalWindows.length - 1)) *
                              545;
                          const y =
                            190 - ((w.cumulativeAlphaBps - minVal) / range) * 155;
                          return (
                            <g key={w.windowLabel}>
                              <circle
                                cx={x}
                                cy={y}
                                r={4.5}
                                fill={
                                  w.outcome === 'STOPPED_OUT'
                                    ? '#f43f5e'
                                    : w.netAlphaAfterCostBps >= 0
                                    ? '#10b981'
                                    : '#f59e0b'
                                }
                              />
                              <text
                                x={x}
                                y={y - 8}
                                textAnchor="middle"
                                className="text-[9px] font-mono font-bold fill-slate-700 dark:fill-slate-300"
                              >
                                {w.cumulativeAlphaBps}
                              </text>
                              <text
                                x={x}
                                y={212}
                                textAnchor="middle"
                                className="text-[9px] font-mono fill-slate-500"
                              >
                                {w.windowLabel}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-3 p-3 rounded bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                  Kill-Switch Protection Note:
                </span>
                Episodes whose adverse excursion exceeds{' '}
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                  -{backtestInputs.stopLossKillSwitchBps} bps
                </span>{' '}
                are automatically stopped out (red markers), preventing tail drawdowns from eroding multi-quarter cumulative alpha.
              </div>
            </div>
          </div>

          {/* Historical Regime Episode Log */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Historical Regime Replay Episode Ledger (2022–2025)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Quarter</th>
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3">Historical Dislocation Episode</th>
                    <th className="py-2.5 px-3 text-right">Gross Alpha (bps)</th>
                    <th className="py-2.5 px-3 text-right">Net Alpha (bps)</th>
                    <th className="py-2.5 px-3 text-right">Cumulative (bps)</th>
                    <th className="py-2.5 px-3">Execution Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {backtestSuite.historicalWindows.map((w) => (
                    <tr key={w.windowLabel} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold">{w.windowLabel}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {w.sovereignIso3}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {w.episodeDescription}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {w.grossAlphaBps >= 0 ? `+${w.grossAlphaBps}` : w.grossAlphaBps} bps
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          w.netAlphaAfterCostBps >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {w.netAlphaAfterCostBps >= 0
                          ? `+${w.netAlphaAfterCostBps}`
                          : w.netAlphaAfterCostBps}{' '}
                        bps
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        +{w.cumulativeAlphaBps} bps
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            w.outcome === 'WIN'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : w.outcome === 'STOPPED_OUT'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {w.outcome.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          10.4 ACADEMIC ECONOMETRIC PAPER, LATEX BOOKTABS & CSV EXPORTER
         ===================================================================== */}
      {activeSubTab === 'persona_academic_latex_csv_exporter' && (
        <div className="space-y-6">
          <div className="institutional-card p-5 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-indigo-600 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase text-indigo-600 dark:text-indigo-400">
                EMPIRICAL ECONOMETRIC PANEL & OVERLEAF LATEX GENERATOR (N = {academicSuite.panelRows.length} SOVEREIGNS)
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {academicSuite.paperTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-4xl">
                {academicSuite.abstractSummary}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => exportEmpiricalPanelCsv(academicSuite)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Download Panel CSV (.csv)
              </button>
              <button
                onClick={() => exportAcademicWorkingPaperMarkdown(academicSuite)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export Working Paper (.md)
              </button>
            </div>
          </div>

          {/* LaTeX Booktabs Table + Econometric Specification & BibTeX */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 institutional-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    Publication-Ready LaTeX Booktabs Table (`\toprule`, `\midrule`, `\bottomrule`)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ready to paste directly into Overleaf, AER / IMF Economic Review, or central bank working papers
                  </p>
                </div>
                <button
                  onClick={() => handleCopyText(academicSuite.latexBooktabsTable, 'latex')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copiedLatex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied LaTeX
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy LaTeX Table
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-80">
                {academicSuite.latexBooktabsTable}
              </pre>
            </div>

            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-2.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Structural Panel Regression Specification (LaTeX)
                  </h4>
                </div>
                <pre className="p-3 rounded bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {academicSuite.econometricSpecificationLatex}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-2.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    BibTeX Citation Block
                  </h4>
                  <button
                    onClick={() => handleCopyText(academicSuite.bibtexCitationBlock, 'bibtex')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {copiedBibtex ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy BibTeX
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded bg-slate-950 text-indigo-200 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {academicSuite.bibtexCitationBlock}
                </pre>
              </div>
            </div>
          </div>

          {/* Preview of Normalized Cross-Sovereign Empirical Panel */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Normalized Cross-Sovereign Empirical Panel Dataset Preview (N = {academicSuite.panelRows.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3 text-right">Debt (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">r − g (%)</th>
                    <th className="py-2.5 px-3 text-center">Off / Shd</th>
                    <th className="py-2.5 px-3 text-right">REER Mis. (%)</th>
                    <th className="py-2.5 px-3 text-right">CET1 Str. (%)</th>
                    <th className="py-2.5 px-3 text-right">NPV Rec. (¢)</th>
                    <th className="py-2.5 px-3 text-right">Taylor Δ (bps)</th>
                    <th className="py-2.5 px-3 text-right">Unenc. Res. (%)</th>
                    <th className="py-2.5 px-3 text-right">NGFS Debt (+% GDP)</th>
                    <th className="py-2.5 px-3 text-right">5Y CDS (bps)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
                  {academicSuite.panelRows.map((r) => (
                    <tr key={r.iso3} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                        {r.countryName} ({r.iso3})
                      </td>
                      <td className="py-2.5 px-3 text-right">{r.debtToGdpPct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right">
                        {r.rMinusGSnowballPct >= 0
                          ? `+${r.rMinusGSnowballPct.toFixed(2)}%`
                          : `${r.rMinusGSnowballPct.toFixed(2)}%`}
                      </td>
                      <td className="py-2.5 px-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                        {r.officialRating} / {r.shadowRating}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.reerMisalignmentPct >= 0
                          ? `+${r.reerMisalignmentPct.toFixed(1)}%`
                          : `${r.reerMisalignmentPct.toFixed(1)}%`}
                      </td>
                      <td className="py-2.5 px-3 text-right">{r.bankCet1PostStressPct.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {r.eurobondWorkoutNpvCents.toFixed(1)}¢
                      </td>
                      <td className="py-2.5 px-3 text-right">{r.taylorStanceGapBps} bps</td>
                      <td className="py-2.5 px-3 text-right">{r.sanctionImmuneReservesPct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                        +{r.ngfs10YClimateDebtAdderPctGdp.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{r.spot5YCdsBps} bps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
