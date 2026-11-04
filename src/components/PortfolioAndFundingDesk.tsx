import React, { useEffect, useMemo, useState } from 'react';
import {
  AIRuntimeConfig,
  CalibratedPolicyShockVector,
  CouncilAssessmentRun,
  PolicyDocumentAnalysisResult,
  PolicyDocumentCategory,
  TreasuryFundingMixParams,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_TREASURY_FUNDING_MIX,
  computeDeterministicDocumentAnalysis,
  computeEmbiPortfolioAndPairBook,
  computeTreasuryAuctionRolloverSimulator,
  getCuratedPolicyDocumentTemplate,
} from '../utils/portfolioAndFundingEngine';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Briefcase,
  Landmark,
  FileSearch,
  Sparkles,
  Sliders,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Zap,
} from 'lucide-react';

export type PortfolioFundingSubTabId =
  | 'embi_portfolio_pair_book'
  | 'dmo_treasury_auction_sim'
  | 'mpc_imf_document_ai';

interface PortfolioAndFundingDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  runtimeConfig: AIRuntimeConfig;
  isDark?: boolean;
  activeSubTab?: PortfolioFundingSubTabId;
  onSelectSubTab?: (sub: PortfolioFundingSubTabId) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onApplyCalibratedDocumentShock?: (
    shock: CalibratedPolicyShockVector,
    docTitle: string,
    docText: string
  ) => void;
  /** % weights per ISO3 from imported holdings; when set, they are the book's active weights. */
  holdingsWeightsPct?: Record<string, number>;
}

export const PortfolioAndFundingDesk: React.FC<PortfolioAndFundingDeskProps> = ({
  run,
  watchlistItems,
  runtimeConfig,
  isDark = false,
  activeSubTab: controlledSubTab,
  onSelectSubTab,
  onSelectSovereign,
  onApplyCalibratedDocumentShock,
  holdingsWeightsPct,
}) => {
  const usingHoldings = !!holdingsWeightsPct && Object.keys(holdingsWeightsPct).length > 0;
  const [internalSubTab, setInternalSubTab] =
    useState<PortfolioFundingSubTabId>('embi_portfolio_pair_book');
  const activeTab = controlledSubTab || internalSubTab;

  const handleTabChange = (tab: PortfolioFundingSubTabId) => {
    setInternalSubTab(tab);
    onSelectSubTab?.(tab);
  };

  // --- Sub-Tab 1: EMBI Portfolio & Cross-Sovereign Pair Book State ---
  const [activeTiltOverridesBps, setActiveTiltOverridesBps] = useState<Record<string, number>>({});
  const [pairLongIso, setPairLongIso] = useState<string>(run.iso3);
  const [pairShortIso, setPairShortIso] = useState<string>(
    run.iso3 === 'ZAF' ? 'TUR' : 'ZAF'
  );
  const [pairInstrument, setPairInstrument] = useState<
    '5Y_USD_CDS' | '10Y_USD_EUROBOND' | '5Y_LOCAL_LCY_BOND'
  >('5Y_USD_CDS');
  const [pairLongWeightPct, setPairLongWeightPct] = useState<number>(10.0);

  useEffect(() => {
    setPairLongIso(run.iso3);
    if (pairShortIso === run.iso3) {
      const alt =
        watchlistItems.find((w) => w.iso3 !== run.iso3)?.iso3 ||
        (run.iso3 === 'BRA' ? 'TUR' : 'BRA');
      setPairShortIso(alt);
    }
  }, [run.iso3]);

  const embiSuite = useMemo(
    () =>
      computeEmbiPortfolioAndPairBook(
        run.openData,
        watchlistItems,
        activeTiltOverridesBps,
        {
          longIso3: pairLongIso,
          shortIso3: pairShortIso,
          instrumentType: pairInstrument,
          longWeightPct: pairLongWeightPct,
        },
        holdingsWeightsPct
      ),
    [
      run.openData,
      watchlistItems,
      activeTiltOverridesBps,
      pairLongIso,
      pairShortIso,
      pairInstrument,
      pairLongWeightPct,
      holdingsWeightsPct,
    ]
  );

  // --- Sub-Tab 2: 24-Month DMO Treasury Auction & Rollover Simulator State ---
  const [fundingMix, setFundingMix] = useState<TreasuryFundingMixParams>(
    DEFAULT_TREASURY_FUNDING_MIX
  );

  const dmoSuite = useMemo(
    () => computeTreasuryAuctionRolloverSimulator(run.openData, fundingMix),
    [run.openData, fundingMix]
  );

  // --- Sub-Tab 3: Hybrid AI + Econometric Document Intelligence State ---
  const [selectedDocCategory, setSelectedDocCategory] = useState<PolicyDocumentCategory>(
    'MPC_MONETARY_STATEMENT'
  );
  const [docTitle, setDocTitle] = useState<string>('');
  const [docText, setDocText] = useState<string>('');
  const [aiAnalysisOverride, setAiAnalysisOverride] =
    useState<PolicyDocumentAnalysisResult | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState<boolean>(false);
  const [docStatusMsg, setDocStatusMsg] = useState<string | null>(null);

  // Load curated document template when sovereign or category changes
  useEffect(() => {
    const tpl = getCuratedPolicyDocumentTemplate(run.openData, selectedDocCategory);
    setDocTitle(tpl.title);
    setDocText(tpl.text);
    setAiAnalysisOverride(null);
    setDocStatusMsg(null);
  }, [run.iso3, selectedDocCategory]);

  const deterministicDocAnalysis = useMemo(
    () =>
      computeDeterministicDocumentAnalysis(
        run.openData,
        docTitle,
        docText,
        selectedDocCategory
      ),
    [run.openData, docTitle, docText, selectedDocCategory]
  );

  const activeDocAnalysis = aiAnalysisOverride || deterministicDocAnalysis;

  const handleRunHybridAiDocumentAudit = async () => {
    setIsAnalyzingDoc(true);
    setDocStatusMsg(
      `Executing Hybrid Gemini Structured Extraction + Econometric Taylor/QPC Audit for ${run.countryName}...`
    );
    try {
      const res = await fetch('/api/council/analyze-policy-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iso3: run.iso3,
          documentTitle: docTitle,
          documentText: docText,
          documentCategory: selectedDocCategory,
          openData: run.openData,
          runtimeConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Document analysis request failed');
      }
      if (data?.analysis) {
        setAiAnalysisOverride(data.analysis);
        setDocStatusMsg(
          `Completed via ${data.analysis.providerUsed} (${data.analysis.extractedClauses.length} quantitative clauses verified).`
        );
      }
    } catch {
      setAiAnalysisOverride(null);
      setDocStatusMsg(
        'Verified using Deterministic Econometric & Lexicon Engine (offline fallback active).'
      );
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocTitle(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setDocText(content.slice(0, 20000));
      setAiAnalysisOverride(null);
      setDocStatusMsg(`Loaded "${file.name}" (${content.length.toLocaleString()} chars).`);
    };
    reader.readAsText(file);
  };

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#cbd5e1';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      {/* TOP HEADER & SUB-WORKSPACE BAR */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs tabular-nums font-semibold bg-blue-600 text-white">
              Tier-6 institutional desk
            </span>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {run.countryName} ({run.iso3}) · Zero-Notional Index Weight & % GDP Mode
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-1">
            EMBI Multi-Sovereign Portfolio Book, 24M DMO Auction Simulator & Document AI Lab
          </h2>
        </div>

        {!onSelectSubTab && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabChange('embi_portfolio_pair_book')}
              aria-pressed={activeTab === 'embi_portfolio_pair_book'}
              className="ui-pill inline-flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>6.1 EMBI Portfolio & Pair-Trade Book</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('dmo_treasury_auction_sim')}
              aria-pressed={activeTab === 'dmo_treasury_auction_sim'}
              className="ui-pill inline-flex items-center gap-1.5"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>6.2 24M DMO Treasury Auction Simulator</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('mpc_imf_document_ai')}
              aria-pressed={activeTab === 'mpc_imf_document_ai'}
              className="ui-pill inline-flex items-center gap-1.5"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>6.3 MPC & IMF Article IV Document AI</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================================================
          SUB-TAB 6.1: EMBI MULTI-SOVEREIGN PORTFOLIO & PAIR-TRADE BOOK
      ========================================================================== */}
      {activeTab === 'embi_portfolio_pair_book' && (
        <div className="p-5 space-y-6">
          {usingHoldings && (
            <p className="ui-badge ui-badge-accent">
              Active weights are your imported holdings (by gross notional). The tilt sliders have no effect while holdings are loaded.
            </p>
          )}
          {/* Top Headline Banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-blue-600 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                EMBI Global Diversified Relative-Value Book:
              </span>
              {embiSuite.headlineSummary}
            </div>
            <button
              type="button"
              onClick={() => setActiveTiltOverridesBps({})}
              className="ui-btn inline-flex shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Active Tilts</span>
            </button>
          </div>

          {/* 5 KPI Summary Cards (All in % Weight, bps, Duration Years, and Beta) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Book OAS vs. EMBI
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {embiSuite.activePortfolioWeightedSpreadBps} bps
              </div>
              <div className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
                Benchmark: {embiSuite.benchmarkWeightedSpreadBps} bps (
                {embiSuite.activePortfolioWeightedSpreadBps -
                  embiSuite.benchmarkWeightedSpreadBps >=
                0
                  ? `+${
                      embiSuite.activePortfolioWeightedSpreadBps -
                      embiSuite.benchmarkWeightedSpreadBps
                    }`
                  : embiSuite.activePortfolioWeightedSpreadBps -
                    embiSuite.benchmarkWeightedSpreadBps}{' '}
                bps)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Ex-Ante Tracking Error
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {embiSuite.exAnteTrackingErrorBps} bps
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Active Weight Vol √(wᵀΣw)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Book Beta & Spread Dur
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {embiSuite.portfolioBetaToEmbi}x · {embiSuite.portfolioSpreadDurationYears}y
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Mod Duration: {embiSuite.portfolioModifiedDurationYears} yrs
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Weighted Carry-to-Vol
              </div>
              <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {embiSuite.weightedCarryToVolRatio}x
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                12M Carry + Roll / Spread Vol
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                99% Cornish-Fisher CVaR
              </div>
              <div className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                -{embiSuite.cornishFisherCvar99Pct}%
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Parametric VaR₉₉: -{embiSuite.parametricVaR99Pct}%
              </div>
            </div>
          </div>

          {/* Interactive EMBI Multi-Sovereign Allocation & Relative-Value Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                J.P. Morgan EMBI Global Diversified Constituent Weights & Active Tilt Allocator
              </span>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Adjust sliders (-250 bps to +250 bps) to rebalance active weights (normalized to 100%)
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2">Rating</th>
                  <th className="py-2.5 px-2 text-right">EMBI Bench %</th>
                  <th className="py-2.5 px-2 text-right">Active Wt %</th>
                  <th className="py-2.5 px-3 text-center">Active Tilt Slider (bps)</th>
                  <th className="py-2.5 px-2 text-right">5Y CDS</th>
                  <th className="py-2.5 px-2 text-right">10Y Z-Sprd</th>
                  <th className="py-2.5 px-2 text-right">10Y LCY</th>
                  <th className="py-2.5 px-2 text-right">Debt/GDP</th>
                  <th className="py-2.5 px-2 text-right">EMBI β</th>
                  <th className="py-2.5 px-2 text-right">12M E[TR]</th>
                  <th className="py-2.5 px-3">Stance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {embiSuite.positions.map((pos) => {
                  const sliderVal =
                    typeof activeTiltOverridesBps[pos.iso3] === 'number'
                      ? activeTiltOverridesBps[pos.iso3]
                      : pos.activeTiltBps;
                  return (
                    <tr
                      key={pos.iso3}
                      className={
                        pos.isCurrentActiveSovereign
                          ? 'bg-blue-50/50 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            const found = watchlistItems.find((w) => w.iso3 === pos.iso3);
                            if (found && onSelectSovereign) onSelectSovereign(found);
                          }}
                          className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left flex items-center gap-1.5"
                        >
                          <span>{pos.countryName}</span>
                          <span className="text-xs tabular-nums px-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pos.iso3}
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                        {pos.creditRating}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-400">
                        {pos.embiBenchmarkWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-slate-900 dark:text-white">
                        {pos.activePortfolioWeightPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 justify-center">
                          <input
                            type="range"
                            min={-250}
                            max={250}
                            step={10}
                            value={sliderVal}
                            onChange={(e) =>
                              setActiveTiltOverridesBps((prev) => ({
                                ...prev,
                                [pos.iso3]: Number(e.target.value),
                              }))
                            }
                            className="w-24 accent-blue-600 cursor-pointer"
                          />
                          <span
                            className={`w-14 text-right text-xs font-semibold ${
                              pos.activeTiltBps > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : pos.activeTiltBps < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {pos.activeTiltBps >= 0
                              ? `+${pos.activeTiltBps}`
                              : pos.activeTiltBps}{' '}
                            bp
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">{pos.cds5YSpreadBps} bp</td>
                      <td className="py-2.5 px-2 text-right">{pos.eurobond10YZSpreadBps} bp</td>
                      <td className="py-2.5 px-2 text-right">{pos.local10YYieldPct}%</td>
                      <td className="py-2.5 px-2 text-right">{pos.debtToGdpPct}%</td>
                      <td className="py-2.5 px-2 text-right">{pos.empiricalBetaToEmbi}x</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        +{pos.expected12MTotalReturnPct}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 text-xs font-semibold ${
                            pos.convictionSignal === 'OVERWEIGHT_CONVICTION'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : pos.convictionSignal === 'SHORT_CREDIT_HEDGE'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : pos.convictionSignal === 'UNDERWEIGHT_DEFENSIVE'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {pos.convictionSignal.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* BETA-NEUTRAL CROSS-SOVEREIGN PAIR-TRADE STRUCTURER */}
          <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Beta-Neutral Cross-Sovereign Pair-Trade Structurer (12M Spread Z-Score & Carry)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sizes Short Leg index weight by empirical spread beta (β ={' '}
                  {embiSuite.activePairTrade.empiricalHedgeRatioBeta}x) to isolate idiosyncratic
                  sovereign spread compression from global EMBI beta moves.
                </p>
              </div>

              {/* Preset Pair Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {embiSuite.presetPairIdeas.map((idea) => (
                  <button
                    key={idea.pairId}
                    type="button"
                    onClick={() => {
                      setPairLongIso(idea.longIso3);
                      setPairShortIso(idea.shortIso3);
                      setPairInstrument(idea.instrumentType);
                    }}
                    aria-pressed={pairLongIso === idea.longIso3 &&
                      pairShortIso === idea.shortIso3 &&
                      pairInstrument === idea.instrumentType}
                      className="ui-pill"
                  >
                    Long {idea.longIso3} / Short {idea.shortIso3}
                  </button>
                ))}
              </div>
            </div>

            {/* Pair Controls + Telemetry Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-5 space-y-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Long Risk Sovereign
                    </label>
                    <select
                      value={pairLongIso}
                      onChange={(e) => setPairLongIso(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      {embiSuite.positions.map((p) => (
                        <option key={p.iso3} value={p.iso3}>
                          {p.countryName} ({p.iso3}) — {p.cds5YSpreadBps}bp
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Short Risk Hedge Sovereign
                    </label>
                    <select
                      value={pairShortIso}
                      onChange={(e) => setPairShortIso(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      {embiSuite.positions
                        .filter((p) => p.iso3 !== pairLongIso)
                        .map((p) => (
                          <option key={p.iso3} value={p.iso3}>
                            {p.countryName} ({p.iso3}) — {p.cds5YSpreadBps}bp
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Instrument Expression
                    </label>
                    <select
                      value={pairInstrument}
                      onChange={(e) =>
                        setPairInstrument(
                          e.target.value as
                            | '5Y_USD_CDS'
                            | '10Y_USD_EUROBOND'
                            | '5Y_LOCAL_LCY_BOND'
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <option value="5Y_USD_CDS">5Y USD Sovereign CDS</option>
                      <option value="10Y_USD_EUROBOND">10Y USD Eurobond Z-Spread</option>
                      <option value="5Y_LOCAL_LCY_BOND">5Y Local Currency Bond</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Long Leg Allocation (% Index): {pairLongWeightPct}%
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={25}
                      step={1}
                      value={pairLongWeightPct}
                      onChange={(e) => setPairLongWeightPct(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs tabular-nums">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Spread Differential</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {embiSuite.activePairTrade.currentSpreadDifferentialBps} bps
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Z-Score:{' '}
                      {embiSuite.activePairTrade.currentSpreadZScore >= 0
                        ? `+${embiSuite.activePairTrade.currentSpreadZScore}σ`
                        : `${embiSuite.activePairTrade.currentSpreadZScore}σ`}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Beta-Hedged Short Wt</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {embiSuite.activePairTrade.shortLegBetaHedgedWeightPct}%
                    </div>
                    <div className="text-xs text-slate-500">
                      Hedge Ratio β = {embiSuite.activePairTrade.empiricalHedgeRatioBeta}x
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Net Carry Pickup</div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {embiSuite.activePairTrade.annualizedNetCarryPickupBps >= 0
                        ? `+${embiSuite.activePairTrade.annualizedNetCarryPickupBps}`
                        : embiSuite.activePairTrade.annualizedNetCarryPickupBps}{' '}
                      bps/yr
                    </div>
                    <div className="text-xs text-slate-500">
                      90D E[Return]: +{embiSuite.activePairTrade.expected90DReturnBps} bps
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Mean-Reversion Target</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {embiSuite.activePairTrade.meanReversionTargetBps} bps
                    </div>
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      Stop: {embiSuite.activePairTrade.stopLossTriggerBps} bps
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-700 dark:text-slate-300">
                  {embiSuite.activePairTrade.pairRationale}
                </div>
              </div>

              {/* 12-Month Spread Differential & +/-2 Sigma Mean Reversion Chart */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    12-Month Pair Spread Differential ({embiSuite.activePairTrade.longIso3} minus{' '}
                    {embiSuite.activePairTrade.shortIso3}, bps) & ±2σ Bands
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">
                    12M Mean: {embiSuite.activePairTrade.historical12MMeanSpreadBps} bps · σ ={' '}
                    {embiSuite.activePairTrade.historical12MStdDevBps} bps
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={embiSuite.activePairTrade.history12M}
                      margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis
                        dataKey="monthLabel"
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
                      <ReferenceLine
                        y={embiSuite.activePairTrade.historical12MMeanSpreadBps}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="upper2SigmaBps"
                        name="+2σ Upper Band (bps)"
                        stroke="#f43f5e"
                        strokeDasharray="3 3"
                        dot={false}
                        strokeWidth={1.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="lower2SigmaBps"
                        name="-2σ Lower Band (bps)"
                        stroke="#10b981"
                        strokeDasharray="3 3"
                        dot={false}
                        strokeWidth={1.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="spreadDiffBps"
                        name="Pair Spread Differential (bps)"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 6.2: 24-MONTH TREASURY AUCTION & ROLLOVER SIMULATOR
      ========================================================================== */}
      {activeTab === 'dmo_treasury_auction_sim' && (
        <div className="p-5 space-y-6">
          {/* Headline Diagnostic */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-l-4 border-blue-600 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                DMO 24-Month Issuance & Bank Absorption Audit:
              </span>
              {dmoSuite.headlineDiagnostic}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFundingMix(DEFAULT_TREASURY_FUNDING_MIX)}
                className="ui-btn"
              >
                Baseline Mix
              </button>
              <button
                type="button"
                onClick={() =>
                  setFundingMix({
                    shortTermTBillsPct: 62,
                    mediumLongLocalBondsPct: 22,
                    usdEurobondsPct: 6,
                    sukukAndSyndicatedLoansPct: 6,
                    officialImfAndBilateralPct: 4,
                  })
                }
                className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                T-Bill Rollover Stress
              </button>
              <button
                type="button"
                onClick={() =>
                  setFundingMix({
                    shortTermTBillsPct: 20,
                    mediumLongLocalBondsPct: 34,
                    usdEurobondsPct: 12,
                    sukukAndSyndicatedLoansPct: 14,
                    officialImfAndBilateralPct: 20,
                  })
                }
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                Extend WAM + IMF Anchor
              </button>
            </div>
          </div>

          {/* 5 KPI Summary Cards (All in % of GDP, WACB %, WAM yrs, Bid-to-Cover x, and Bank Tier-1 %) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                24M Cumulative GFN
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {dmoSuite.total24MGrossFinancingNeedPctGdp}% GDP
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Annualized GFN: {dmoSuite.annualizedGfnPctGdp}% GDP
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Weighted Avg Borrowing Cost
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {dmoSuite.weightedAverageCostOfBorrowingPct}%
              </div>
              <div
                className={`text-xs tabular-nums ${
                  dmoSuite.wacbDeltaBps > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {dmoSuite.wacbDeltaBps >= 0
                  ? `+${dmoSuite.wacbDeltaBps}`
                  : dmoSuite.wacbDeltaBps}{' '}
                bps vs. baseline
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Weighted Avg Maturity (WAM)
              </div>
              <div className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {dmoSuite.weightedAverageMaturityYears} yrs
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                T-Bill Share: {dmoSuite.normalizedMix.shortTermTBillsPct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Auction Bid-to-Cover & Tail
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {dmoSuite.averageBidToCoverRatio}x avg
              </div>
              <div className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                Min: {dmoSuite.minBidToCoverRatio}x · Peak Tail: +{dmoSuite.peakAuctionTailBps}bp
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Peak Bank Sovereign Exposure
              </div>
              <div className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                {dmoSuite.peakBankSovereignExposurePctTier1}% Tier-1
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Uncovered Gap: {dmoSuite.cumulative24MUncoveredGapPctGdp}% GDP
              </div>
            </div>
          </div>

          {/* Interactive 5-Channel DMO Issuance Sliders */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Interactive DMO Gross Issuance Allocation Mix (Auto-Normalized to 100%)
                </span>
              </div>
              <span className="text-xs tabular-nums text-slate-500">
                Regime: {dmoSuite.crowdingOutSeverity.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs tabular-nums mb-1">
                  <span>91d/364d T-Bills</span>
                  <span className="font-semibold">{dmoSuite.normalizedMix.shortTermTBillsPct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={75}
                  value={fundingMix.shortTermTBillsPct}
                  onChange={(e) =>
                    setFundingMix((p) => ({ ...p, shortTermTBillsPct: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs tabular-nums mb-1">
                  <span>5Y/10Y Local Bonds</span>
                  <span className="font-semibold">
                    {dmoSuite.normalizedMix.mediumLongLocalBondsPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={fundingMix.mediumLongLocalBondsPct}
                  onChange={(e) =>
                    setFundingMix((p) => ({
                      ...p,
                      mediumLongLocalBondsPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs tabular-nums mb-1">
                  <span>USD Eurobonds</span>
                  <span className="font-semibold">{dmoSuite.normalizedMix.usdEurobondsPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={fundingMix.usdEurobondsPct}
                  onChange={(e) =>
                    setFundingMix((p) => ({ ...p, usdEurobondsPct: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs tabular-nums mb-1">
                  <span>Sukuk / Syndicated</span>
                  <span className="font-semibold">
                    {dmoSuite.normalizedMix.sukukAndSyndicatedLoansPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={fundingMix.sukukAndSyndicatedLoansPct}
                  onChange={(e) =>
                    setFundingMix((p) => ({
                      ...p,
                      sukukAndSyndicatedLoansPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs tabular-nums mb-1">
                  <span>Official IMF / Bilat</span>
                  <span className="font-semibold">
                    {dmoSuite.normalizedMix.officialImfAndBilateralPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={fundingMix.officialImfAndBilateralPct}
                  onChange={(e) =>
                    setFundingMix((p) => ({
                      ...p,
                      officialImfAndBilateralPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dual Charts: 24-Month GFN Decomposition (% GDP) & Bid-to-Cover vs Auction Tail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                24-Month Gross Financing Needs Stack (% GDP) & Cumulative Uncovered Gap
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dmoSuite.monthlySchedule}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="monthLabel"
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
                    <Bar
                      dataKey="primaryDeficitComponentPctGdp"
                      stackId="gfn"
                      name="Primary Deficit (% GDP)"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="maturingTBillRolloverPctGdp"
                      stackId="gfn"
                      name="Maturing T-Bill Rollover (% GDP)"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="bondAndEurobondAmortizationPctGdp"
                      stackId="gfn"
                      name="Bond & Eurobond Amortization (% GDP)"
                      fill="#f59e0b"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeUncoveredFundingGapPctGdp"
                      name="Cumulative Uncovered Gap (% GDP)"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Simulated Auction Bid-to-Cover Ratio (x) vs. Clearing Yield Tail (bps)
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dmoSuite.monthlySchedule}
                    margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}x`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: axisColor }}
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
                    <ReferenceLine yAxisId="left" y={1.25} stroke="#f43f5e" strokeDasharray="3 3" />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="auctionClearingTailBps"
                      name="Auction Clearing Tail (bps)"
                      fill="#f43f5e"
                      fillOpacity={0.18}
                      stroke="#f43f5e"
                      strokeWidth={1.8}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="simulatedBidToCoverRatio"
                      name="Bid-to-Cover Ratio (x)"
                      stroke="#10b981"
                      strokeWidth={2.4}
                      dot={{ r: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Compact 24-Month DMO Auction Schedule Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs tabular-nums text-slate-500">
                <tr>
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-2">Quarter</th>
                  <th className="py-2 px-2 text-right">Total GFN (% GDP)</th>
                  <th className="py-2 px-2 text-right">T-Bill Roll (% GDP)</th>
                  <th className="py-2 px-2 text-right">Bid-to-Cover</th>
                  <th className="py-2 px-2 text-right">Auction Tail</th>
                  <th className="py-2 px-2 text-right">Clearing Yield</th>
                  <th className="py-2 px-2 text-right">Bank Holdings (% Tier-1)</th>
                  <th className="py-2 px-3">Auction Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {dmoSuite.monthlySchedule.map((row) => (
                  <tr
                    key={row.monthIndex}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2 px-3 font-semibold">{row.monthLabel}</td>
                    <td className="py-2 px-2 text-slate-500">{row.calendarQuarter}</td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {row.grossFinancingNeedPctGdp}%
                    </td>
                    <td className="py-2 px-2 text-right">{row.maturingTBillRolloverPctGdp}%</td>
                    <td className="py-2 px-2 text-right font-semibold">{row.simulatedBidToCoverRatio}x</td>
                    <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">
                      +{row.auctionClearingTailBps} bp
                    </td>
                    <td className="py-2 px-2 text-right">{row.marginalDomesticClearingYieldPct}%</td>
                    <td className="py-2 px-2 text-right">
                      {row.domesticBankSovereignHoldingsPctTier1}%
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-semibold ${
                          row.auctionStatus === 'WELL_COVERED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : row.auctionStatus === 'TAIL_WIDENING'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {row.auctionStatus.replace(/_/g, ' ')}
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
          SUB-TAB 6.3: CENTRAL BANK MPC & IMF ARTICLE IV DOCUMENT AI LAB
      ========================================================================== */}
      {activeTab === 'mpc_imf_document_ai' && (
        <div className="p-5 space-y-6">
          {/* Template Selector & Upload Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
                Load Institutional Document Preset:
              </span>
              <button
                type="button"
                onClick={() => setSelectedDocCategory('MPC_MONETARY_STATEMENT')}
                aria-pressed={selectedDocCategory === 'MPC_MONETARY_STATEMENT'}
                className="ui-pill"
              >
                Central Bank MPC Statement
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocCategory('IMF_ARTICLE_IV_STAFF_REPORT')}
                aria-pressed={selectedDocCategory === 'IMF_ARTICLE_IV_STAFF_REPORT'}
                className="ui-pill"
              >
                IMF Article IV & QPC Audit
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocCategory('EUROBOND_CAC_PROSPECTUS')}
                aria-pressed={selectedDocCategory === 'EUROBOND_CAC_PROSPECTUS'}
                className="ui-pill"
              >
                Eurobond CAC Offering Circular
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .TXT/.MD</span>
                <input
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  onChange={handleDocFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleRunHybridAiDocumentAudit}
                disabled={isAnalyzingDoc}
                className="ui-btn ui-btn-primary inline-flex"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAnalyzingDoc
                    ? 'Running Gemini + Econometric Audit...'
                    : 'Run Hybrid AI + Econometric Audit'}
                </span>
              </button>
            </div>
          </div>

          {docStatusMsg && (
            <div className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{docStatusMsg}</span>
            </div>
          )}

          {/* 4 Quantitative Document Intelligence Gauges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Hawkish / Dovish Stance
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {activeDocAnalysis.hawkishDovishStanceScore >= 0
                  ? `+${activeDocAnalysis.hawkishDovishStanceScore}`
                  : activeDocAnalysis.hawkishDovishStanceScore}{' '}
                / 100
              </div>
              <div className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
                {activeDocAnalysis.monetaryStanceLabel.replace(/_/g, ' ')}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Taylor-Rule Rate Gap
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {activeDocAnalysis.actualPolicyRateGapBps >= 0
                  ? `+${activeDocAnalysis.actualPolicyRateGapBps}`
                  : activeDocAnalysis.actualPolicyRateGapBps}{' '}
                bps
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Implied Taylor Rate: {activeDocAnalysis.taylorRuleImpliedPolicyRatePct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Fiscal Slippage / QPC Risk
              </div>
              <div className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {activeDocAnalysis.fiscalSlippageRiskScore} / 100
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                CAC Regime: {activeDocAnalysis.cacVotingThresholdType.slice(0, 28)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                IMF Tranche Disbursement Prob
              </div>
              <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeDocAnalysis.imfProgramTrancheDisbursementProbPct}%
              </div>
              <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Engine: {activeDocAnalysis.isAiEnhanced ? 'Hybrid Gemini AI' : 'Deterministic'}
              </div>
            </div>
          </div>

          {/* Document Editor + Calibrated Shock Vector Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => {
                    setDocTitle(e.target.value);
                    setAiAnalysisOverride(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Communiqué / IMF Article IV / Prospectus Indenture Text
                </label>
                <textarea
                  rows={10}
                  value={docText}
                  onChange={(e) => {
                    setDocText(e.target.value);
                    setAiAnalysisOverride(null);
                  }}
                  className="w-full p-3 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 leading-relaxed"
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Executive Synthesis & Calibrated Macro Shock Vector
                  </span>
                  <span className="text-xs tabular-nums px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {activeDocAnalysis.providerUsed}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeDocAnalysis.executiveSynthesis}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 tabular-nums text-xs">
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Policy Rate Δ</div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {activeDocAnalysis.calibratedShockVector.policyRateDeltaBps >= 0
                        ? `+${activeDocAnalysis.calibratedShockVector.policyRateDeltaBps}`
                        : activeDocAnalysis.calibratedShockVector.policyRateDeltaBps}{' '}
                      bps
                    </div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Primary Bal Δ</div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {activeDocAnalysis.calibratedShockVector.primaryFiscalBalanceDeltaPctGdp >= 0
                        ? `+${activeDocAnalysis.calibratedShockVector.primaryFiscalBalanceDeltaPctGdp}`
                        : activeDocAnalysis.calibratedShockVector.primaryFiscalBalanceDeltaPctGdp}
                      % GDP
                    </div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">5Y CDS Spread Δ</div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {activeDocAnalysis.calibratedShockVector.sovereignSpreadShockBps >= 0
                        ? `+${activeDocAnalysis.calibratedShockVector.sovereignSpreadShockBps}`
                        : activeDocAnalysis.calibratedShockVector.sovereignSpreadShockBps}{' '}
                      bps
                    </div>
                  </div>
                </div>

                {onApplyCalibratedDocumentShock && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyCalibratedDocumentShock(
                        activeDocAnalysis.calibratedShockVector,
                        docTitle,
                        docText
                      )
                    }
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      Apply Calibrated Document Shock Vector to Live {run.countryName} Terminal State
                    </span>
                  </button>
                )}
              </div>

              {/* Clause-by-Clause Extraction Table */}
              <div className="border border-slate-200 dark:border-slate-800">
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Clause-by-Clause Quantitative Telemetry
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeDocAnalysis.extractedClauses.map((cl) => (
                    <div key={cl.clauseId} className="p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {cl.categoryLabel}
                        </span>
                        <span className="tabular-nums text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {cl.directionalSignal.replace(/_/g, ' ')} ·{' '}
                          {cl.impactScoreBps >= 0 ? `+${cl.impactScoreBps}` : cl.impactScoreBps} bps
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 italic text-xs">
                        “{cl.verbatimQuote}”
                      </p>
                      <div className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
                        Extracted Anchor: {cl.quantitativeMetricExtracted} (Confidence:{' '}
                        {cl.confidencePct}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
