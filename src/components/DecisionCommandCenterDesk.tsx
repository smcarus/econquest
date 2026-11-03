import React, { useEffect, useMemo, useState } from 'react';
import {
  ConditionalBayesianEventSimulation,
  CouncilAssessmentRun,
  DecisionLedgerEntry,
  DecisionThesisDirection,
  MacroQuadrantId,
  RawVenueEventContract,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_QUADRANT_PROBABILITIES,
  buildDefaultDecisionLedgerEntries,
  buildFallbackPredictionContracts,
  computeCrossSovereignDislocationScreener,
  computeDecisionLedgerAnalytics,
  computeFourQuadrantMacroStressMatrix,
  computePreMortemAndKillSwitchSuite,
  computePredictionMarketArbitrageSuite,
} from '../utils/decisionCommandEngine';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Crosshair,
  ShieldAlert,
  BookCheck,
  Grid,
  PlusCircle,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
} from 'lucide-react';

export type DecisionCommandSubTabId =
  | 'decision_dislocation_screener'
  | 'decision_premortem_killswitch'
  | 'decision_ledger_brier'
  | 'decision_quadrant_stress'
  | 'decision_prediction_markets';

const DECISION_LEDGER_STORAGE_KEY = 'sovereign_council_decision_ledger_v1';

interface DecisionCommandCenterDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  isDark?: boolean;
  activeSubTab?: DecisionCommandSubTabId;
  onSelectSubTab?: (sub: DecisionCommandSubTabId) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onApplyConditionalEventShock?: (sim: ConditionalBayesianEventSimulation) => void;
}

export const DecisionCommandCenterDesk: React.FC<DecisionCommandCenterDeskProps> = ({
  run,
  watchlistItems,
  isDark = false,
  activeSubTab: controlledSubTab,
  onSelectSubTab,
  onSelectSovereign,
  onApplyConditionalEventShock,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<DecisionCommandSubTabId>(
    'decision_dislocation_screener'
  );
  const activeTab = controlledSubTab || internalSubTab;

  const handleTabChange = (tab: DecisionCommandSubTabId) => {
    setInternalSubTab(tab);
    onSelectSubTab?.(tab);
  };

  // --- 7.1 Cross-Sovereign Dislocation Screener ---
  const dislocationSuite = useMemo(
    () => computeCrossSovereignDislocationScreener(run.openData, watchlistItems),
    [run.openData, watchlistItems]
  );

  // --- 7.2 Pre-Mortem & Kill-Switch Engine ---
  const preMortemSuite = useMemo(
    () => computePreMortemAndKillSwitchSuite(run),
    [run]
  );

  // --- 7.3 Persistent Decision Ledger & Brier Calibration State ---
  const [ledgerEntries, setLedgerEntries] = useState<DecisionLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(DECISION_LEDGER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return buildDefaultDecisionLedgerEntries(watchlistItems);
  });

  useEffect(() => {
    try {
      localStorage.setItem(DECISION_LEDGER_STORAGE_KEY, JSON.stringify(ledgerEntries));
    } catch {
      // Ignore storage error
    }
  }, [ledgerEntries]);

  const [newDirection, setNewDirection] =
    useState<DecisionThesisDirection>('LONG_SOVEREIGN_CREDIT');
  const [newAssignedCrisisProbPct, setNewAssignedCrisisProbPct] = useState<number>(25);
  const [newTargetDeltaBps, setNewTargetDeltaBps] = useState<number>(-45);
  const [newStopDeltaBps, setNewStopDeltaBps] = useState<number>(35);
  const [newRationale, setNewRationale] = useState<string>(
    `Fundamental vs. market CDS dislocation on ${run.countryName} (${run.iso3}) with strict reserve floor stop.`
  );
  const [ledgerStatusBanner, setLedgerStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    setNewRationale(
      `Fundamental vs. market CDS dislocation on ${run.countryName} (${run.iso3}) with strict reserve floor stop.`
    );
  }, [run.iso3, run.countryName]);

  const ledgerSuite = useMemo(
    () => computeDecisionLedgerAnalytics(ledgerEntries, run.openData, watchlistItems),
    [ledgerEntries, run.openData, watchlistItems]
  );

  const handleLogDecisionToLedger = (customEntry?: Partial<DecisionLedgerEntry>) => {
    const iso = customEntry?.iso3 || run.iso3;
    const cName = customEntry?.countryName || run.countryName;
    const dir = customEntry?.direction || newDirection;
    const entryCds =
      typeof customEntry?.entry5YCdsBps === 'number'
        ? customEntry.entry5YCdsBps
        : Math.round(run.openData.monetaryAndMarket.cds5YSpreadBps + (dir === 'LONG_SOVEREIGN_CREDIT' ? 12 : -12));
    const entryYld =
      typeof customEntry?.entry10YYieldPct === 'number'
        ? customEntry.entry10YYieldPct
        : run.openData.monetaryAndMarket.sovereign10YBondYieldPct;

    const entry: DecisionLedgerEntry = {
      entryId: `DEC-${iso}-${Date.now().toString().slice(-4)}`,
      loggedAt: new Date().toISOString().slice(0, 10),
      iso3: iso,
      countryName: cName,
      direction: dir,
      thesisRationale: customEntry?.thesisRationale || newRationale,
      entry5YCdsBps: entryCds,
      entry10YYieldPct: entryYld,
      assigned90DCrisisProbPct:
        typeof customEntry?.assigned90DCrisisProbPct === 'number'
          ? customEntry.assigned90DCrisisProbPct
          : newAssignedCrisisProbPct,
      targetSpreadDeltaBps:
        typeof customEntry?.targetSpreadDeltaBps === 'number'
          ? customEntry.targetSpreadDeltaBps
          : newTargetDeltaBps,
      hardStopSpreadDeltaBps:
        typeof customEntry?.hardStopSpreadDeltaBps === 'number'
          ? customEntry.hardStopSpreadDeltaBps
          : newStopDeltaBps,
      invalidationTriggerNote:
        customEntry?.invalidationTriggerNote ||
        `5Y CDS breaches stop (${entryCds + (dir === 'LONG_SOVEREIGN_CREDIT' ? 40 : -40)} bps) or FX Reserves < 3.0m`,
    };

    setLedgerEntries((prev) => [entry, ...prev]);
    setLedgerStatusBanner(
      `Logged ${entry.direction.replace(/_/g, ' ')} on ${entry.countryName} (${entry.iso3}) at ${entry.entry5YCdsBps} bps into Decision Ledger.`
    );
  };

  // --- 7.4 Simultaneous 4-Quadrant Global Macro Stress Matrix State ---
  const [quadrantProbs, setQuadrantProbs] = useState<Record<MacroQuadrantId, number>>(
    DEFAULT_QUADRANT_PROBABILITIES
  );

  const quadrantSuite = useMemo(
    () =>
      computeFourQuadrantMacroStressMatrix(run.openData, watchlistItems, quadrantProbs),
    [run.openData, watchlistItems, quadrantProbs]
  );

  // --- 7.5 Live Polymarket & Kalshi Dual-Venue Prediction Market Arbitrage State ---
  const [livePredictionContracts, setLivePredictionContracts] = useState<RawVenueEventContract[]>(
    () => buildFallbackPredictionContracts(run.openData)
  );
  const [activePredictionSources, setActivePredictionSources] = useState<string>(
    'Live Polymarket Gamma + Kalshi v2 APIs (with Sovereign Parity Anchor)'
  );
  const [isLoadingPredictionMarkets, setIsLoadingPredictionMarkets] = useState<boolean>(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [simulatedEventProbPct, setSimulatedEventProbPct] = useState<number | undefined>(
    undefined
  );

  const handleSyncPredictionMarkets = async (iso3: string, countryName: string) => {
    setIsLoadingPredictionMarkets(true);
    try {
      const resp = await fetch(
        `/api/data/prediction-markets?iso3=${encodeURIComponent(iso3)}&countryName=${encodeURIComponent(countryName)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data?.contracts) && data.contracts.length > 0) {
          setLivePredictionContracts(data.contracts);
          setSelectedContractId(data.contracts[0].contractId);
          setSimulatedEventProbPct(undefined);
        }
        if (data?.activeSourcesLabel) {
          setActivePredictionSources(data.activeSourcesLabel);
        }
      } else {
        const fb = buildFallbackPredictionContracts(run.openData);
        setLivePredictionContracts(fb);
        setSelectedContractId(fb[0]?.contractId || '');
      }
    } catch {
      const fb = buildFallbackPredictionContracts(run.openData);
      setLivePredictionContracts(fb);
      setSelectedContractId(fb[0]?.contractId || '');
    } finally {
      setIsLoadingPredictionMarkets(false);
    }
  };

  useEffect(() => {
    const fb = buildFallbackPredictionContracts(run.openData);
    setLivePredictionContracts(fb);
    setSelectedContractId(fb[0]?.contractId || '');
    setSimulatedEventProbPct(undefined);
    handleSyncPredictionMarkets(run.iso3, run.countryName);
  }, [run.iso3, run.countryName]);

  const predictionSuite = useMemo(
    () =>
      computePredictionMarketArbitrageSuite(
        run.openData,
        livePredictionContracts,
        selectedContractId,
        simulatedEventProbPct,
        activePredictionSources
      ),
    [
      run.openData,
      livePredictionContracts,
      selectedContractId,
      simulatedEventProbPct,
      activePredictionSources,
    ]
  );

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#cbd5e1';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
      {/* TOP HEADER & SUB-TAB SWITCHER */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-600 text-white">
              TIER-7 DECISION COMMAND CENTER
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {run.countryName} ({run.iso3}) · Model vs. Market Edge · Pre-Mortem · Brier Audit
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
            Cross-Sovereign Dislocation Screener, Pre-Mortem Kill-Switches & Brier Decision Ledger
          </h2>
        </div>

        {!onSelectSubTab && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabChange('decision_dislocation_screener')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeTab === 'decision_dislocation_screener'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>7.1 Model vs. Market Screener</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('decision_premortem_killswitch')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeTab === 'decision_premortem_killswitch'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>7.2 Pre-Mortem & Kill-Switches</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('decision_ledger_brier')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeTab === 'decision_ledger_brier'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookCheck className="w-3.5 h-3.5" />
              <span>7.3 Decision Ledger & Brier Audit</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('decision_quadrant_stress')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeTab === 'decision_quadrant_stress'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>7.4 4-Quadrant Stress Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('decision_prediction_markets')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                activeTab === 'decision_prediction_markets'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>7.5 Polymarket & Kalshi Event Arb</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================================================
          SUB-TAB 7.1: CROSS-SOVEREIGN MODEL-VS-MARKET DISLOCATION SCREENER
      ========================================================================== */}
      {activeTab === 'decision_dislocation_screener' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-indigo-600 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white mr-1.5">
              Automated Cross-Sovereign Dislocation Alpha:
            </span>
            {dislocationSuite.headlineConclusion}
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                #1 Oversold Credit (Buy Credit / Sell CDS)
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {dislocationSuite.topLongCreditOpportunity.countryName} (
                {dislocationSuite.topLongCreditOpportunity.iso3})
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                Gap: +{dislocationSuite.topLongCreditOpportunity.dislocationSpreadGapBps} bps (
                +{dislocationSuite.topLongCreditOpportunity.dislocationZScore}σ)
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60">
              <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                #1 Complacent Market (Buy CDS Protection)
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {dislocationSuite.topShortProtectionOpportunity.countryName} (
                {dislocationSuite.topShortProtectionOpportunity.iso3})
              </div>
              <div className="text-[11px] font-mono text-rose-700 dark:text-rose-400">
                Gap: {dislocationSuite.topShortProtectionOpportunity.dislocationSpreadGapBps} bps (
                {dislocationSuite.topShortProtectionOpportunity.dislocationZScore}σ)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Universe Dislocation Dispersion
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {dislocationSuite.universeCrossSectionalDispersionBps} bps
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Mean Gap: {dislocationSuite.universeMeanSpreadGapBps >= 0 ? `+${dislocationSuite.universeMeanSpreadGapBps}` : dislocationSuite.universeMeanSpreadGapBps} bps
              </div>
            </div>

            {(() => {
              const activeRow =
                dislocationSuite.rows.find((r) => r.isCurrentActiveSovereign) ||
                dislocationSuite.rows[0];
              return (
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60">
                  <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                    Active Sovereign ({activeRow.iso3}) Gap
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {activeRow.dislocationSpreadGapBps >= 0
                      ? `+${activeRow.dislocationSpreadGapBps}`
                      : activeRow.dislocationSpreadGapBps}{' '}
                    bps
                  </div>
                  <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400">
                    Mkt 5Y PD {activeRow.marketImplied5YDefaultProbPct}% vs Model{' '}
                    {activeRow.econometric5YDefaultProbPct}%
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chart: Market 5Y CDS vs Econometric Fundamental Fair 5Y CDS across Sovereign Universe */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Market 5Y CDS Spread vs. Econometric Fundamental Fair Spread (bps) & Dislocation Gap
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Positive Gap = Market Oversold (Buy Credit) · Negative Gap = Market Rich (Buy Protection)
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dislocationSuite.rows}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="iso3"
                    tick={{ fontSize: 11, fill: axisColor }}
                    stroke={axisColor}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisColor }}
                    stroke={axisColor}
                    tickFormatter={(v: number) => `${v}bp`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar
                    dataKey="market5YCdsSpreadBps"
                    name="Market 5Y CDS Spread (bps)"
                    fill="#3b82f6"
                  />
                  <Bar
                    dataKey="fundamentalFair5YCdsSpreadBps"
                    name="Econometric Fair 5Y CDS (bps)"
                    fill="#64748b"
                  />
                  <Line
                    type="monotone"
                    dataKey="dislocationSpreadGapBps"
                    name="Dislocation Alpha Gap (bps)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dislocation Screener Ranking Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-[11px] font-mono text-slate-500">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2 text-right">Mkt 5Y CDS</th>
                  <th className="py-2.5 px-2 text-right">Model Fair CDS</th>
                  <th className="py-2.5 px-2 text-right">Alpha Gap (bps)</th>
                  <th className="py-2.5 px-2 text-right">Z-Score</th>
                  <th className="py-2.5 px-2 text-right">Mkt 5Y PD</th>
                  <th className="py-2.5 px-2 text-right">Model 5Y PD</th>
                  <th className="py-2.5 px-3">Actionable Signal</th>
                  <th className="py-2.5 px-3 text-right">Decision Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {dislocationSuite.rows.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.isCurrentActiveSovereign
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-500">
                      #{row.convictionRank}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          const found = watchlistItems.find((w) => w.iso3 === row.iso3);
                          if (found && onSelectSovereign) onSelectSovereign(found);
                        }}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5"
                      >
                        <span>{row.countryName}</span>
                        <span className="text-[10px] font-mono px-1 bg-slate-200 dark:bg-slate-800">
                          {row.iso3}
                        </span>
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {row.market5YCdsSpreadBps} bp
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500">
                      {row.fundamentalFair5YCdsSpreadBps} bp
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-bold ${
                        row.dislocationSpreadGapBps >= 35
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.dislocationSpreadGapBps <= -35
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {row.dislocationSpreadGapBps >= 0
                        ? `+${row.dislocationSpreadGapBps}`
                        : row.dislocationSpreadGapBps}{' '}
                      bp
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.dislocationZScore >= 0
                        ? `+${row.dislocationZScore}σ`
                        : `${row.dislocationZScore}σ`}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.marketImplied5YDefaultProbPct}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.econometric5YDefaultProbPct}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          row.actionableSignal === 'DISTRESSED_OVERSHOOT_BUY_CREDIT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : row.actionableSignal === 'COMPLACENT_MARKET_BUY_CDS_PROTECTION'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {row.actionableSignal.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          handleLogDecisionToLedger({
                            iso3: row.iso3,
                            countryName: row.countryName,
                            direction:
                              row.dislocationSpreadGapBps >= 0
                                ? 'LONG_SOVEREIGN_CREDIT'
                                : 'SHORT_CREDIT_BUY_CDS',
                            entry5YCdsBps: row.market5YCdsSpreadBps,
                            entry10YYieldPct: row.local10YYieldPct,
                            assigned90DCrisisProbPct: Math.round(row.econometric5YDefaultProbPct),
                            targetSpreadDeltaBps:
                              row.dislocationSpreadGapBps >= 0
                                ? -Math.max(25, Math.abs(row.dislocationSpreadGapBps))
                                : Math.max(25, Math.abs(row.dislocationSpreadGapBps)),
                            hardStopSpreadDeltaBps: 35,
                            thesisRationale: row.tradeExpressionSummary,
                          });
                          handleTabChange('decision_ledger_brier');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                      >
                        <span>Log to Ledger</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 7.2: PRE-MORTEM FAILURE TREE & KILL-SWITCH TRIPWIRES
      ========================================================================== */}
      {activeTab === 'decision_premortem_killswitch' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-amber-500 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white mr-1.5">
              Klein Pre-Mortem & Automated Stop-Out Protocol:
            </span>
            {preMortemSuite.headlineSummary}
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">90D Thesis Failure Prob</div>
              <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {preMortemSuite.aggregate90DFailureProbPct}%
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Conditional on macro/fiscal shock
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">
                Expected Failure Drawdown
              </div>
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                +{preMortemSuite.expectedTailDrawdownBps} bps
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Probability-weighted 5Y CDS spike
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">
                Breached Kill-Switches
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {preMortemSuite.breachedTripwiresCount} / 5
              </div>
              <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                {preMortemSuite.warningTripwiresCount} in thin-buffer warning
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">Active Stance Tested</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-2">
                {preMortemSuite.activeStanceAssumed}
              </div>
            </div>
          </div>

          {/* 3-Branch Pre-Mortem Failure Tree */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {preMortemSuite.failureBranches.map((br) => (
              <div
                key={br.branchId}
                className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                      CONDITIONAL WEIGHT: {br.conditionalProbabilityPct}%
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                      5Y CDS +{br.projected5YCdsWideningBps}bp
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {br.pathwayTitle}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {br.causalChainNarrative}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Lead Tripwire:{' '}
                    </span>
                    {br.primaryEarlyWarningLeadIndicator}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Pre-Emptive Hedge:{' '}
                    </span>
                    {br.preEmptiveMitigationAction}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 5-Domain Hard Kill-Switch Tripwire Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Hard Kill-Switch Tripwire Matrix (Automated Thesis Invalidation Thresholds)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Eliminates thesis-creep by enforcing pre-committed exit rules
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-500">
                  <th className="py-2.5 px-3">Indicator</th>
                  <th className="py-2.5 px-2">Live Reading</th>
                  <th className="py-2.5 px-2">Hard Stop Threshold</th>
                  <th className="py-2.5 px-2">Remaining Buffer</th>
                  <th className="py-2.5 px-3">Buffer Consumption</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-3">Automated Execution Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {preMortemSuite.killSwitchTripwires.map((ks) => (
                  <tr key={ks.tripwireId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      {ks.indicatorLabel}
                    </td>
                    <td className="py-2.5 px-2 font-bold">{ks.currentLiveReading}</td>
                    <td className="py-2.5 px-2 text-rose-600 dark:text-rose-400">
                      {ks.hardStopThreshold}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                      {ks.distanceToTriggerLabel}
                    </td>
                    <td className="py-2.5 px-3 w-36">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            ks.tripwireStatus === 'KILL_SWITCH_BREACHED'
                              ? 'bg-rose-600'
                              : ks.tripwireStatus === 'WARNING_BUFFER_THIN'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, ks.bufferConsumptionPct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          ks.tripwireStatus === 'KILL_SWITCH_BREACHED'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : ks.tripwireStatus === 'WARNING_BUFFER_THIN'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {ks.tripwireStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">
                      {ks.automatedExecutionProtocol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cognitive Bias Guardrail Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {preMortemSuite.cognitiveBiasChecklist.map((cb) => (
              <div
                key={cb.biasId}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{cb.biasName}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      cb.guardrailStatus === 'VERIFIED_ANCHORED'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {cb.guardrailStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic">{cb.diagnosticQuestion}</p>
                <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  {cb.quantitativeRealityCheck}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 7.3: PERSISTENT DECISION LEDGER & EX-POST BRIER TRACKER
      ========================================================================== */}
      {activeTab === 'decision_ledger_brier' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-emerald-600 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                Ex-Post Decision Accountability & Brier Calibration:
              </span>
              {ledgerSuite.headlineDiagnostic}
            </div>
            <button
              type="button"
              onClick={() =>
                setLedgerEntries(buildDefaultDecisionLedgerEntries(watchlistItems))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default Ledger</span>
            </button>
          </div>

          {ledgerStatusBanner && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{ledgerStatusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setLedgerStatusBanner(null)}
                className="underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 5 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">Directional Hit Rate</div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {ledgerSuite.directionalHitRatePct}%
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {ledgerSuite.totalLoggedDecisions} logged sovereign calls
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">
                Cumulative Net Performance
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {ledgerSuite.cumulativeNetPerformanceBps >= 0
                  ? `+${ledgerSuite.cumulativeNetPerformanceBps}`
                  : ledgerSuite.cumulativeNetPerformanceBps}{' '}
                bps
              </div>
              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                Mean: {ledgerSuite.meanPerformancePerCallBps >= 0 ? `+${ledgerSuite.meanPerformancePerCallBps}` : ledgerSuite.meanPerformancePerCallBps} bps/call
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">Ex-Post Brier Score</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {ledgerSuite.compositeBrierScore.toFixed(4)}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                0.000 = Perfect · 0.250 = Coin Flip
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">Brier Skill Score (BSS)</div>
              <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                +{ledgerSuite.brierSkillScorePct}%
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Edge over uninformative prior
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">Active Sovereign Spot</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {run.iso3} · {run.openData.monetaryAndMarket.cds5YSpreadBps}bp
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                10Y Yield: {run.openData.monetaryAndMarket.sovereign10YBondYieldPct}%
              </div>
            </div>
          </div>

          {/* Snapshot New Decision Form + Brier Calibration Curve Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Snapshot Active Sovereign Thesis ({run.countryName} · {run.iso3}) to Decision Ledger
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Directional Thesis
                  </label>
                  <select
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value as DecisionThesisDirection)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="LONG_SOVEREIGN_CREDIT">Long Sovereign Credit (Sell CDS)</option>
                    <option value="SHORT_CREDIT_BUY_CDS">Short Credit (Buy 5Y CDS)</option>
                    <option value="LONG_LCY_RATES_RECEIVER">Long 10Y Local Bond Receiver</option>
                    <option value="SHORT_FX_TACTICAL_HEDGE">Short Spot FX Tactical Hedge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Assigned 90D Crisis Prob: {newAssignedCrisisProbPct}%
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    step={1}
                    value={newAssignedCrisisProbPct}
                    onChange={(e) => setNewAssignedCrisisProbPct(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target Spread Move (bps): {newTargetDeltaBps} bps
                  </label>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={5}
                    value={newTargetDeltaBps}
                    onChange={(e) => setNewTargetDeltaBps(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Hard Stop-Loss Buffer (bps): {newStopDeltaBps} bps
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    step={5}
                    value={newStopDeltaBps}
                    onChange={(e) => setNewStopDeltaBps(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Conviction Rationale & Invalidation Note
                </label>
                <input
                  type="text"
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLogDecisionToLedger()}
                className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Commit Timestamped Call to Decision Ledger ({run.iso3} @{' '}
                {run.openData.monetaryAndMarket.cds5YSpreadBps} bps)
              </button>
            </div>

            <div className="lg:col-span-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Brier Forecasting Calibration Curve (Assigned Probability % vs. Realized Crisis %)
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={ledgerSuite.calibrationCurve}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="bucketLabel"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="perfectCalibrationPct"
                      name="45° Perfect Calibration"
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Bar
                      dataKey="observedFrequencyPct"
                      name="Realized Crisis Frequency (%)"
                      fill="#4f46e5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Decision Ledger Mark-to-Market Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-[11px] font-mono text-slate-500">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-2">Sovereign</th>
                  <th className="py-2.5 px-2">Direction</th>
                  <th className="py-2.5 px-2 text-right">Entry CDS</th>
                  <th className="py-2.5 px-2 text-right">Live CDS</th>
                  <th className="py-2.5 px-2 text-right">Perf (bps)</th>
                  <th className="py-2.5 px-2 text-right">Crisis Prob</th>
                  <th className="py-2.5 px-2 text-right">Brier (p-o)²</th>
                  <th className="py-2.5 px-3">Thesis Status</th>
                  <th className="py-2.5 px-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {ledgerSuite.evaluatedRows.map((row) => (
                  <tr key={row.entryId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500">{row.loggedAt}</td>
                    <td className="py-2.5 px-2 font-sans font-bold text-slate-900 dark:text-white">
                      {row.countryName} ({row.iso3})
                    </td>
                    <td className="py-2.5 px-2 text-[11px]">
                      {row.direction.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.entry5YCdsBps} bp</td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {row.currentLive5YCdsBps} bp
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-bold ${
                        row.directionalPerformanceBps >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.directionalPerformanceBps >= 0
                        ? `+${row.directionalPerformanceBps}`
                        : row.directionalPerformanceBps}{' '}
                      bp
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.assigned90DCrisisProbPct}%</td>
                    <td className="py-2.5 px-2 text-right">{row.entryBrierScore.toFixed(3)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          row.thesisHealthStatus === 'TARGET_ACHIEVED' ||
                          row.thesisHealthStatus === 'THESIS_INTACT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : row.thesisHealthStatus === 'DRIFTING_WATCH'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {row.thesisHealthStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setLedgerEntries((prev) =>
                            prev.filter((e) => e.entryId !== row.entryId)
                          )
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remove entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 7.4: SIMULTANEOUS 4-QUADRANT GLOBAL MACRO STRESS MATRIX
      ========================================================================== */}
      {activeTab === 'decision_quadrant_stress' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-blue-600 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                Simultaneous 4-Quadrant Global Macro Stress Synthesis:
              </span>
              {quadrantSuite.headlineSummary}
            </div>
            <button
              type="button"
              onClick={() => setQuadrantProbs(DEFAULT_QUADRANT_PROBABILITIES)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0"
            >
              Reset Quadrant Weights
            </button>
          </div>

          {/* Quadrant Probability Sliders */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quadrantSuite.quadrants.map((q) => (
              <div key={q.quadrantId}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="font-bold truncate">{q.quadrantTitle.split('·')[1] || q.quadrantTitle}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {q.assignedProbabilityPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={70}
                  value={quadrantProbs[q.quadrantId]}
                  onChange={(e) =>
                    setQuadrantProbs((prev) => ({
                      ...prev,
                      [q.quadrantId]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* 2x2 Quadrant Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {quadrantSuite.quadrants.map((q) => (
              <div
                key={q.quadrantId}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {q.quadrantTitle}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Weight: {q.assignedProbabilityPct}%
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {q.growthRegimeLabel} · {q.inflationLiquidityLabel}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {q.globalDriverAssumptions}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-xs">
                  <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">{run.iso3} 5Y CDS Δ</div>
                    <div
                      className={`font-bold ${
                        q.activeSovereignCdsDeltaBps > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {q.activeSovereignCdsDeltaBps >= 0
                        ? `+${q.activeSovereignCdsDeltaBps}`
                        : q.activeSovereignCdsDeltaBps}{' '}
                      bps
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">10Y Yield Δ</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {q.activeSovereign10YYieldDeltaBps >= 0
                        ? `+${q.activeSovereign10YYieldDeltaBps}`
                        : q.activeSovereign10YYieldDeltaBps}{' '}
                      bps
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Spot FX Δ</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {q.activeSovereignFxDeltaPct >= 0
                        ? `+${q.activeSovereignFxDeltaPct}`
                        : q.activeSovereignFxDeltaPct}
                      %
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 pt-1">
                  Optimal Expression: {q.optimalQuadrantTradeExpression}
                </div>
              </div>
            ))}
          </div>

          {/* Cross-Sovereign 4-Quadrant Stress Heatmap Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Cross-Sovereign 4-Quadrant Stress Matrix (5Y CDS Delta in bps)
              </span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                All-Weather Pair: {quadrantSuite.allWeatherDominantHedge}
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-500">
                  <th className="py-2.5 px-3">Resilience Rank</th>
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2 text-right">Spot 5Y CDS</th>
                  <th className="py-2.5 px-2 text-right">Q1 Stagflation</th>
                  <th className="py-2.5 px-2 text-right">Q2 USD Squeeze</th>
                  <th className="py-2.5 px-2 text-right">Q3 Fiscal Freeze</th>
                  <th className="py-2.5 px-2 text-right">Q4 Goldilocks</th>
                  <th className="py-2.5 px-2 text-right">Prob-Weighted E[ΔCDS]</th>
                  <th className="py-2.5 px-3">Regime Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {quadrantSuite.sovereignMatrix.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.isCurrentActiveSovereign
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-500">
                      #{row.regimeResilienceRank}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      {row.countryName} ({row.iso3})
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.spot5YCdsBps} bp</td>
                    <td className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400">
                      +{row.q1StagflationCdsDeltaBps} bp
                    </td>
                    <td className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400">
                      +{row.q2UsdSqueezeCdsDeltaBps} bp
                    </td>
                    <td className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400">
                      +{row.q3FiscalFreezeCdsDeltaBps} bp
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-600 dark:text-emerald-400">
                      {row.q4GoldilocksCdsDeltaBps} bp
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">
                      {row.probWeightedExpectedCdsDeltaBps >= 0
                        ? `+${row.probWeightedExpectedCdsDeltaBps}`
                        : row.probWeightedExpectedCdsDeltaBps}{' '}
                      bp
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          row.resilienceClassification === 'ALL_WEATHER_RESILIENT'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : row.resilienceClassification === 'MODERATE_BETA'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {row.resilienceClassification.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 7.5: POLYMARKET & KALSHI DUAL-VENUE EVENT ARBITRAGE & BAYES SHOCK LAB
      ========================================================================== */}
      {activeTab === 'decision_prediction_markets' && (
        <div className="p-5 space-y-6">
          {/* Top Diagnostic Banner + Live Dual-Venue Refresh */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-indigo-600 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                Polymarket & Kalshi Dual-Venue Event vs. Sovereign CDS Arbitrage:
              </span>
              {predictionSuite.headlineSummary}
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                Active Feed: {predictionSuite.activeSourcesLabel} · Spot 5Y CDS:{' '}
                {run.openData.monetaryAndMarket.cds5YSpreadBps} bps (ISDA 1Y Implied Default Prob:{' '}
                {predictionSuite.bayesianSimulation.priorSovereignCrisisProbPct}%)
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSyncPredictionMarkets(run.iso3, run.countryName)}
              disabled={isLoadingPredictionMarkets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingPredictionMarkets ? 'animate-spin' : ''}`}
              />
              <span>
                {isLoadingPredictionMarkets
                  ? 'Syncing Polymarket & Kalshi...'
                  : 'Refresh Live Polymarket + Kalshi'}
              </span>
            </button>
          </div>

          {ledgerStatusBanner && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{ledgerStatusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setLedgerStatusBanner(null)}
                className="underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 4 KPI Summary Cards (Strictly Cents ¢, Probabilities %, and Basis Points bps) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">
                Dual-Venue Active Contracts
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {predictionSuite.contracts.length} Contracts
              </div>
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                {predictionSuite.polymarketContractsCount} Polymarket ·{' '}
                {predictionSuite.kalshiContractsCount} Kalshi
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Top Cross-Venue Spread (Polymarket vs. Kalshi)
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {predictionSuite.topCrossVenueArbContract.crossVenueSpreadCents >= 0
                  ? `+${predictionSuite.topCrossVenueArbContract.crossVenueSpreadCents}`
                  : predictionSuite.topCrossVenueArbContract.crossVenueSpreadCents}
                ¢ (Net {predictionSuite.topCrossVenueArbContract.netCrossVenueArbCents}¢)
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                {predictionSuite.topCrossVenueArbContract.tickerOrSlug}:{' '}
                {predictionSuite.topCrossVenueArbContract.yesPriceCents}¢ vs.{' '}
                {predictionSuite.topCrossVenueArbContract.counterVenuePriceCents}¢
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Top Event Odds vs. 5Y CDS Dislocation
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {predictionSuite.topEventVsCdsDislocationContract.eventVsCdsProbGapPct >= 0
                  ? `+${predictionSuite.topEventVsCdsDislocationContract.eventVsCdsProbGapPct}`
                  : predictionSuite.topEventVsCdsDislocationContract.eventVsCdsProbGapPct}
                % Gap
              </div>
              <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400 truncate">
                Event: {predictionSuite.topEventVsCdsDislocationContract.impliedProbabilityPct}% vs. CDS:{' '}
                {predictionSuite.topEventVsCdsDislocationContract.cdsHazardImpliedProbPct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500">
                Conditional Posterior 90D Crisis Prob
              </div>
              <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {predictionSuite.bayesianSimulation.posteriorSovereignCrisisProbPct}%
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Prior: {predictionSuite.bayesianSimulation.priorSovereignCrisisProbPct}% · Δ5Y CDS:{' '}
                {predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps >= 0
                  ? `+${predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}`
                  : predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}{' '}
                bps
              </div>
            </div>
          </div>

          {/* Interactive Conditional Bayesian Event Odds Shock Simulator + Response Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Conditional Bayesian Event Odds Shock Simulator
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {predictionSuite.bayesianSimulation.selectedContract.venue}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Polymarket / Kalshi Binary Event Contract
                </label>
                <select
                  value={predictionSuite.bayesianSimulation.selectedContract.contractId}
                  onChange={(e) => {
                    setSelectedContractId(e.target.value);
                    setSimulatedEventProbPct(undefined);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  {predictionSuite.contracts.map((c) => (
                    <option key={c.contractId} value={c.contractId}>
                      [{c.venue}] {c.question} ({c.yesPriceCents}¢)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span>
                    Live Market Odds:{' '}
                    <strong>
                      {predictionSuite.bayesianSimulation.currentMarketProbPct}¢ (
                      {predictionSuite.bayesianSimulation.currentMarketProbPct}%)
                    </strong>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    Simulated Contract Odds:{' '}
                    {predictionSuite.bayesianSimulation.simulatedShockProbPct}¢ (Δ{' '}
                    {predictionSuite.bayesianSimulation.probDeltaPct >= 0
                      ? `+${predictionSuite.bayesianSimulation.probDeltaPct}`
                      : predictionSuite.bayesianSimulation.probDeltaPct}
                    %)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={99}
                  step={1}
                  value={predictionSuite.bayesianSimulation.simulatedShockProbPct}
                  onChange={(e) => setSimulatedEventProbPct(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
                  <span>1¢ (Event Resolved NO)</span>
                  <span>50¢ (Maximum Entropy)</span>
                  <span>99¢ (Event Resolved YES)</span>
                </div>
              </div>

              {/* Conditional Sovereign Repricing Output Grid */}
              <div className="grid grid-cols-3 gap-2.5 font-mono text-xs pt-1">
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Conditional 5Y CDS Δ</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps >= 0
                      ? `+${predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}`
                      : predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}{' '}
                    bps
                  </div>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Conditional 10Y Yield Δ</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {predictionSuite.bayesianSimulation.conditional10YYieldDeltaBps >= 0
                      ? `+${predictionSuite.bayesianSimulation.conditional10YYieldDeltaBps}`
                      : predictionSuite.bayesianSimulation.conditional10YYieldDeltaBps}{' '}
                    bps
                  </div>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Conditional Spot FX Δ</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {predictionSuite.bayesianSimulation.conditionalSpotFxDeltaPct >= 0
                      ? `+${predictionSuite.bayesianSimulation.conditionalSpotFxDeltaPct}`
                      : predictionSuite.bayesianSimulation.conditionalSpotFxDeltaPct}
                    %
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onApplyConditionalEventShock && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyConditionalEventShock(predictionSuite.bayesianSimulation)
                    }
                    className="flex-1 py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    Apply Conditional Event Shock to Terminal (
                    {predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps >= 0
                      ? `+${predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}`
                      : predictionSuite.bayesianSimulation.conditional5YCdsDeltaBps}{' '}
                    bps)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const sim = predictionSuite.bayesianSimulation;
                    handleLogDecisionToLedger({
                      iso3: run.iso3,
                      countryName: run.countryName,
                      direction:
                        sim.conditional5YCdsDeltaBps >= 0
                          ? 'SHORT_CREDIT_BUY_CDS'
                          : 'LONG_SOVEREIGN_CREDIT',
                      assigned90DCrisisProbPct: sim.posteriorSovereignCrisisProbPct,
                      targetSpreadDeltaBps: sim.conditional5YCdsDeltaBps,
                      hardStopSpreadDeltaBps: 35,
                      thesisRationale: `[${sim.selectedContract.venue} Event Arb] ${sim.selectedContract.question} repricing from ${sim.currentMarketProbPct}¢ to ${sim.simulatedShockProbPct}¢ -> E[Δ5Y CDS] = ${sim.conditional5YCdsDeltaBps >= 0 ? `+${sim.conditional5YCdsDeltaBps}` : sim.conditional5YCdsDeltaBps} bps.`,
                    });
                  }}
                  className="py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Log Event Call to Ledger
                </button>
              </div>
            </div>

            {/* Right: Conditional Response Curve across 0-100¢ */}
            <div className="lg:col-span-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Conditional Sovereign Repricing Curve Across Event Contract Odds (0¢ to 100¢)
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={predictionSuite.bayesianSimulation.responseCurve}
                    margin={{ top: 10, right: 18, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="eventOddsCents"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}¢`}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}bp`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine
                      yAxisId="left"
                      x={predictionSuite.bayesianSimulation.currentMarketProbPct}
                      stroke="#64748b"
                      strokeDasharray="3 3"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="projected5YCdsBps"
                      name="Conditional 5Y CDS Spread (bps)"
                      fill="#4f46e5"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="posteriorCrisisProbPct"
                      name="Posterior 90D Crisis Prob (%)"
                      stroke="#e11d48"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Dual-Venue Polymarket & Kalshi vs. Sovereign CDS Arbitrage Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Dual-Venue Polymarket & Kalshi Event Contracts vs. Sovereign ISDA CDS Implied Hazard
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                All contract prices in cents (0–100¢) & implied probabilities (%) · Zero notional figures
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-500">
                  <th className="py-2.5 px-3">Venue</th>
                  <th className="py-2.5 px-3">Event Contract & Ticker</th>
                  <th className="py-2.5 px-2 text-right">YES / NO (¢)</th>
                  <th className="py-2.5 px-2 text-right">Bid-Ask</th>
                  <th className="py-2.5 px-2 text-right">Counter-Venue</th>
                  <th className="py-2.5 px-2 text-right">Net Arb (¢)</th>
                  <th className="py-2.5 px-2 text-right">CDS Implied (%)</th>
                  <th className="py-2.5 px-2 text-right">Event-CDS Gap</th>
                  <th className="py-2.5 px-3">Cross-Asset Arbitrage Trade Expression</th>
                  <th className="py-2.5 px-2 text-right">Shock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {predictionSuite.contracts.map((c) => {
                  const isSelected =
                    c.contractId ===
                    predictionSuite.bayesianSimulation.selectedContract.contractId;
                  return (
                    <tr
                      key={c.contractId}
                      className={
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold ${
                            c.venue === 'POLYMARKET'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {c.venue}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {c.question}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {c.tickerOrSlug} · {c.category.replace(/_/g, ' ')} ·{' '}
                          {c.isLiveApiSourced ? 'LIVE API' : 'PARITY ANCHOR'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {c.yesPriceCents}¢
                        </span>{' '}
                        / <span className="text-slate-500">{c.noPriceCents}¢</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-500">
                        {c.bidAskSpreadCents}¢
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div>
                          {c.counterVenueName}: <strong>{c.counterVenuePriceCents}¢</strong>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Spread:{' '}
                          {c.crossVenueSpreadCents >= 0
                            ? `+${c.crossVenueSpreadCents}¢`
                            : `${c.crossVenueSpreadCents}¢`}
                        </div>
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold ${
                          c.netCrossVenueArbCents > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {c.netCrossVenueArbCents > 0
                          ? `+${c.netCrossVenueArbCents}¢`
                          : '0¢'}
                      </td>
                      <td className="py-2.5 px-2 text-right">{c.cdsHazardImpliedProbPct}%</td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold ${
                          c.eventVsCdsProbGapPct >= 5
                            ? 'text-amber-600 dark:text-amber-400'
                            : c.eventVsCdsProbGapPct <= -5
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {c.eventVsCdsProbGapPct >= 0
                          ? `+${c.eventVsCdsProbGapPct}%`
                          : `${c.eventVsCdsProbGapPct}%`}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[11px] text-slate-700 dark:text-slate-300 max-w-xs">
                        <div className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 mb-0.5">
                          {c.crossAssetArbSignal.replace(/_/g, ' ')}
                        </div>
                        {c.crossAssetTradeExpression}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContractId(c.contractId);
                            setSimulatedEventProbPct(Math.min(95, c.yesPriceCents + 25));
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-sans font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                        >
                          <span>Simulate</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
