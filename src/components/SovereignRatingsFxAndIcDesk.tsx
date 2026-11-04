import React, { useMemo, useState } from 'react';
import {
  BoardroomICPitchbookDossier,
  CouncilAssessmentRun,
  FxEquilibriumStressInputs,
  InvestorBaseDoomLoopStressInputs,
  ShadowRatingStressInputs,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_FX_EQUILIBRIUM_STRESS,
  DEFAULT_INVESTOR_BASE_STRESS,
  DEFAULT_SHADOW_RATING_STRESS,
  buildBoardroomICPitchbookDossier,
  computeFxEquilibriumValuationSuite,
  computeInvestorBaseDoomLoopSuite,
  computeSovereignShadowRatingSuite,
  exportICPitchbookJsonDossier,
  exportICPitchbookMarkdownMemo,
  exportICPitchbookPdfDossier,
} from '../utils/ratingsFxAndIcPitchbookEngine';
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
  Award,
  Globe,
  Landmark,
  FileSpreadsheet,
  RotateCcw,
  Download,
  FileText,
  FileCode,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

export type RatingsFxIcSubTabId =
  | 'ratings_shadow_fallen_angel'
  | 'fx_beer_feer_equilibrium'
  | 'debt_investor_base_doom_loop'
  | 'ic_pitchbook_dossier_exporter';

interface SovereignRatingsFxAndIcDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  isDark?: boolean;
  activeSubTab?: RatingsFxIcSubTabId;
  onSelectSubTab?: (sub: RatingsFxIcSubTabId) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onApplyRatingOrDoomLoopShockToTerminal?: (params: {
    label: string;
    cdsDeltaBps: number;
    yield10YDeltaBps: number;
    fxDepreciationPct: number;
  }) => void;
}

export const SovereignRatingsFxAndIcDesk: React.FC<SovereignRatingsFxAndIcDeskProps> = ({
  run,
  watchlistItems,
  isDark = false,
  activeSubTab: controlledSubTab,
  onSelectSubTab,
  onSelectSovereign,
  onApplyRatingOrDoomLoopShockToTerminal,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<RatingsFxIcSubTabId>(
    'ratings_shadow_fallen_angel'
  );
  const activeTab = controlledSubTab || internalSubTab;

  const handleTabChange = (tab: RatingsFxIcSubTabId) => {
    setInternalSubTab(tab);
    onSelectSubTab?.(tab);
  };

  // --- 8.1 S&P / Moody's / Fitch Shadow Rating & Fallen-Angel State ---
  const [ratingStress, setRatingStress] = useState<ShadowRatingStressInputs>(
    DEFAULT_SHADOW_RATING_STRESS
  );

  const shadowRatingSuite = useMemo(
    () =>
      computeSovereignShadowRatingSuite(run.openData, watchlistItems, ratingStress),
    [run.openData, watchlistItems, ratingStress]
  );

  // --- 8.2 FX Equilibrium BEER / FEER State ---
  const [fxStress, setFxStress] = useState<FxEquilibriumStressInputs>(
    DEFAULT_FX_EQUILIBRIUM_STRESS
  );

  const fxEquilibriumSuite = useMemo(
    () =>
      computeFxEquilibriumValuationSuite(run.openData, watchlistItems, fxStress),
    [run.openData, watchlistItems, fxStress]
  );

  // --- 8.3 Sovereign Debt Investor Base & Bank Doom-Loop State ---
  const [investorStress, setInvestorStress] =
    useState<InvestorBaseDoomLoopStressInputs>(DEFAULT_INVESTOR_BASE_STRESS);

  const investorBaseSuite = useMemo(
    () =>
      computeInvestorBaseDoomLoopSuite(run.openData, watchlistItems, investorStress),
    [run.openData, watchlistItems, investorStress]
  );

  // --- 8.4 Boardroom IC Pitchbook & Dossier Exporter State ---
  const [customVote, setCustomVote] = useState<
    BoardroomICPitchbookDossier['recommendedCommitteeVote'] | undefined
  >(undefined);
  const [customThesisText, setCustomThesisText] = useState<string>('');
  const [exportStatusBanner, setExportStatusBanner] = useState<string | null>(null);

  const icPitchbookDossier = useMemo(
    () =>
      buildBoardroomICPitchbookDossier(
        run,
        watchlistItems,
        customVote,
        customThesisText.trim() ? customThesisText : undefined
      ),
    [run, watchlistItems, customVote, customThesisText]
  );

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#cbd5e1';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      {/* TOP HEADER & SUB-TAB SWITCHER */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              8. Sovereign Ratings, FX & IC Dossier
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {run.countryName} ({run.iso3}) · S&P/Moody’s/Fitch Shadow Model · BEER/FEER FX · Bank Doom-Loop
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-1">
            Shadow Credit Rating Scorecard, FX BEER/FEER Equilibrium, Investor Base & Boardroom IC Pitchbook
          </h2>
        </div>

        {!onSelectSubTab && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabChange('ratings_shadow_fallen_angel')}
              aria-pressed={activeTab === 'ratings_shadow_fallen_angel'}
              className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Award className="w-3.5 h-3.5" />
              <span>8.1 Shadow Rating & Fallen-Angel</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('fx_beer_feer_equilibrium')}
              aria-pressed={activeTab === 'fx_beer_feer_equilibrium'}
              className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>8.2 FX BEER / FEER Valuation Lab</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('debt_investor_base_doom_loop')}
              aria-pressed={activeTab === 'debt_investor_base_doom_loop'}
              className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>8.3 Investor Base & Doom-Loop</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('ic_pitchbook_dossier_exporter')}
              aria-pressed={activeTab === 'ic_pitchbook_dossier_exporter'}
              className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>8.4 Boardroom IC Pitchbook</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================================================
          SUB-TAB 8.1: S&P / MOODY'S / FITCH SHADOW RATING & FALLEN-ANGEL SIMULATOR
      ========================================================================== */}
      {activeTab === 'ratings_shadow_fallen_angel' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                5-Pillar Rating Agency Shadow Replica:
              </span>
              {shadowRatingSuite.headlineDiagnostic}
            </div>
            <button
              type="button"
              onClick={() => setRatingStress(DEFAULT_SHADOW_RATING_STRESS)}
              className="ui-btn inline-flex shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Pillar Shocks</span>
            </button>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Official Agency Rating ({run.iso3})
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {shadowRatingSuite.activeSovereignRow.officialRating} /{' '}
                {shadowRatingSuite.activeSovereignRow.officialMoodysEquivalent}
              </div>
              <div className="text-xs text-slate-500">
                Notch #{shadowRatingSuite.activeSovereignRow.officialNumericNotch} of 21 (IG Floor = 12)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                5-Pillar Shadow Rating (Stressed)
              </div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {shadowRatingSuite.activeSovereignRow.stressedShadowRating} (Score:{' '}
                {shadowRatingSuite.compositeShadowScore}/100)
              </div>
              <div className="text-xs text-slate-500">
                Notch Dislocation:{' '}
                {shadowRatingSuite.activeSovereignRow.notchDislocationVsOfficial >= 0
                  ? `+${shadowRatingSuite.activeSovereignRow.notchDislocationVsOfficial}`
                  : shadowRatingSuite.activeSovereignRow.notchDislocationVsOfficial}{' '}
                notches
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                12M Rating Migration Probabilities
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                ▼{shadowRatingSuite.activeSovereignRow.prob12MDowngradePct}% / ▲
                {shadowRatingSuite.activeSovereignRow.prob12MUpgradePct}%
              </div>
              <div className="text-xs text-slate-500">
                Stable Outlook Prob: {shadowRatingSuite.activeSovereignRow.prob12MStablePct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Index-Exclusion / Migration Spread Impact
              </div>
              <div
                className={`text-lg font-semibold mt-0.5 ${
                  shadowRatingSuite.fallenAngelCliffSpreadBps > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {shadowRatingSuite.fallenAngelCliffSpreadBps >= 0
                  ? `+${shadowRatingSuite.fallenAngelCliffSpreadBps}`
                  : shadowRatingSuite.fallenAngelCliffSpreadBps}{' '}
                bps
              </div>
              <div className="text-xs text-slate-500">
                IG Cliff Distance:{' '}
                {shadowRatingSuite.activeSovereignRow.distanceToInvestmentGradeCliffNotches >= 0
                  ? `+${shadowRatingSuite.activeSovereignRow.distanceToInvestmentGradeCliffNotches}`
                  : shadowRatingSuite.activeSovereignRow.distanceToInvestmentGradeCliffNotches}{' '}
                notches vs. BBB-
              </div>
            </div>
          </div>

          {/* Interactive Pillar Shock Sliders + 5-Pillar Scorecard Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                Simulate Rating Agency Pillar Shocks ({run.iso3})
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Fiscal Deficit Slippage (% of GDP):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ratingStress.fiscalSlippagePctGdp >= 0
                      ? `+${ratingStress.fiscalSlippagePctGdp.toFixed(1)}%`
                      : `${ratingStress.fiscalSlippagePctGdp.toFixed(1)}%`}{' '}
                    GDP
                  </span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={5}
                  step={0.5}
                  value={ratingStress.fiscalSlippagePctGdp}
                  onChange={(e) =>
                    setRatingStress((prev) => ({
                      ...prev,
                      fiscalSlippagePctGdp: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Institutional & Rule-of-Law Shock (pts):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ratingStress.institutionalGovernanceShockPts >= 0
                      ? `+${ratingStress.institutionalGovernanceShockPts}`
                      : ratingStress.institutionalGovernanceShockPts}{' '}
                    pts
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={20}
                  step={1}
                  value={ratingStress.institutionalGovernanceShockPts}
                  onChange={(e) =>
                    setRatingStress((prev) => ({
                      ...prev,
                      institutionalGovernanceShockPts: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>FX Reserve Cover Shock (months of imports):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ratingStress.externalReserveDrainMonths >= 0
                      ? `+${ratingStress.externalReserveDrainMonths.toFixed(1)}m`
                      : `${ratingStress.externalReserveDrainMonths.toFixed(1)}m`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={2}
                  step={0.2}
                  value={ratingStress.externalReserveDrainMonths}
                  onChange={(e) =>
                    setRatingStress((prev) => ({
                      ...prev,
                      externalReserveDrainMonths: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Monetary Credibility & De-Anchoring (pts):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ratingStress.monetaryCredibilityShockPts >= 0
                      ? `+${ratingStress.monetaryCredibilityShockPts}`
                      : ratingStress.monetaryCredibilityShockPts}{' '}
                    pts
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={20}
                  step={1}
                  value={ratingStress.monetaryCredibilityShockPts}
                  onChange={(e) =>
                    setRatingStress((prev) => ({
                      ...prev,
                      monetaryCredibilityShockPts: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {onApplyRatingOrDoomLoopShockToTerminal && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyRatingOrDoomLoopShockToTerminal({
                      label: `Shadow Rating Migration (${shadowRatingSuite.activeSovereignRow.officialRating} -> ${shadowRatingSuite.activeSovereignRow.stressedShadowRating})`,
                      cdsDeltaBps: shadowRatingSuite.fallenAngelCliffSpreadBps,
                      yield10YDeltaBps: Math.round(
                        shadowRatingSuite.fallenAngelCliffSpreadBps * 0.85
                      ),
                      fxDepreciationPct: Number(
                        (shadowRatingSuite.fallenAngelCliffSpreadBps * 0.035).toFixed(1)
                      ),
                    })
                  }
                  className="ui-btn ui-btn-primary w-full"
                >
                  Apply Rating Migration Spread Impact (
                  {shadowRatingSuite.fallenAngelCliffSpreadBps >= 0
                    ? `+${shadowRatingSuite.fallenAngelCliffSpreadBps}`
                    : shadowRatingSuite.fallenAngelCliffSpreadBps}{' '}
                  bps) to Terminal
                </button>
              )}
            </div>

            {/* Right: 5-Pillar Baseline vs Stressed Score Chart */}
            <div className="lg:col-span-7 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                S&P / Moody’s / Fitch 5-Pillar Quantitative Scorecard (0–100 Scale · BBB- Threshold = 54)
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={shadowRatingSuite.pillars}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="pillarLabel"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: string) => v.slice(0, 18)}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
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
                      y={54}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      label={{
                        value: 'BBB- Investment Grade Floor (54)',
                        position: 'insideTopRight',
                        fill: '#d97706',
                        fontSize: 10,
                      }}
                    />
                    <Bar
                      dataKey="baselineScore"
                      name="Baseline Pillar Score"
                      fill="#94a3b8"
                    />
                    <Bar
                      dataKey="stressedScore"
                      name="Stressed Pillar Score"
                      fill="#2563eb"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cross-Sovereign Shadow Rating & Fallen-Angel Cliff Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs tabular-nums text-slate-500">
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2 text-right">Official (S&P / Moody’s)</th>
                  <th className="py-2.5 px-2 text-right">Shadow Rating</th>
                  <th className="py-2.5 px-2 text-right">Notch Gap</th>
                  <th className="py-2.5 px-2 text-right">Dist. to IG Cliff</th>
                  <th className="py-2.5 px-2 text-right">12M Up / Down Prob</th>
                  <th className="py-2.5 px-2 text-right">Forced Index Impact</th>
                  <th className="py-2.5 px-3">Rating Action Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {shadowRatingSuite.peerRatingLadder.map((row) => (
                  <tr
                    key={row.iso3}
                    onClick={() => {
                      const found = watchlistItems.find((w) => w.iso3 === row.iso3);
                      if (found && onSelectSovereign) onSelectSovereign(found);
                    }}
                    className={`cursor-pointer ${
                      row.isCurrentActiveSovereign
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {row.countryName} ({row.iso3})
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.officialRating} ({row.officialMoodysEquivalent})
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {row.stressedShadowRating}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-semibold ${
                        row.notchDislocationVsOfficial > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.notchDislocationVsOfficial < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {row.notchDislocationVsOfficial >= 0
                        ? `+${row.notchDislocationVsOfficial}`
                        : row.notchDislocationVsOfficial}{' '}
                      notches
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.distanceToInvestmentGradeCliffNotches >= 0
                        ? `+${row.distanceToInvestmentGradeCliffNotches}`
                        : row.distanceToInvestmentGradeCliffNotches}{' '}
                      notches
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ▲{row.prob12MUpgradePct}%
                      </span>{' '}
                      /{' '}
                      <span className="text-rose-600 dark:text-rose-400">
                        ▼{row.prob12MDowngradePct}%
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-semibold ${
                        row.forcedIndexSellingSpreadImpactBps > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {row.forcedIndexSellingSpreadImpactBps >= 0
                        ? `+${row.forcedIndexSellingSpreadImpactBps}`
                        : row.forcedIndexSellingSpreadImpactBps}{' '}
                      bps
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs font-semibold">
                      {row.ratingActionSignal.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 8.2: FX EQUILIBRIUM & BEER / FEER MISALIGNMENT LAB
      ========================================================================== */}
      {activeTab === 'fx_beer_feer_equilibrium' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                BEER & IMF FEER Real Effective Exchange Rate (REER) Valuation:
              </span>
              {fxEquilibriumSuite.headlineDiagnostic}
            </div>
            <button
              type="button"
              onClick={() => setFxStress(DEFAULT_FX_EQUILIBRIUM_STRESS)}
              className="ui-btn inline-flex shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset FX Drivers</span>
            </button>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Spot REER vs. BEER Equilibrium ({fxEquilibriumSuite.activeSovereignFx.currencyCode})
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {fxEquilibriumSuite.activeSovereignFx.spotReerIndex} vs.{' '}
                {fxEquilibriumSuite.activeSovereignFx.beerEquilibriumReerIndex}
              </div>
              <div className="text-xs text-slate-500">
                BEER Misalignment:{' '}
                {fxEquilibriumSuite.activeSovereignFx.beerMisalignmentPct >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.beerMisalignmentPct}%`
                  : `${fxEquilibriumSuite.activeSovereignFx.beerMisalignmentPct}%`}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                IMF FEER Current Account Gap (% GDP)
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {fxEquilibriumSuite.activeSovereignFx.currentAccountGapPctGdp >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.currentAccountGapPctGdp}%`
                  : `${fxEquilibriumSuite.activeSovereignFx.currentAccountGapPctGdp}%`}{' '}
                GDP
              </div>
              <div className="text-xs text-slate-500">
                FEER Misalignment:{' '}
                {fxEquilibriumSuite.activeSovereignFx.feerImpliedMisalignmentPct >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.feerImpliedMisalignmentPct}%`
                  : `${fxEquilibriumSuite.activeSovereignFx.feerImpliedMisalignmentPct}%`}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Consensus FX Misalignment (BEER + FEER)
              </div>
              <div
                className={`text-lg font-semibold mt-0.5 ${
                  fxEquilibriumSuite.activeSovereignFx.consensusFxMisalignmentPct >= 5
                    ? 'text-rose-600 dark:text-rose-400'
                    : fxEquilibriumSuite.activeSovereignFx.consensusFxMisalignmentPct <= -4
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {fxEquilibriumSuite.activeSovereignFx.consensusFxMisalignmentPct >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.consensusFxMisalignmentPct}% Overvalued`
                  : `${fxEquilibriumSuite.activeSovereignFx.consensusFxMisalignmentPct}% Undervalued`}
              </div>
              <div className="text-xs text-slate-500">
                Req. Real FX Adj:{' '}
                {fxEquilibriumSuite.activeSovereignFx.requiredRealFxAdjustmentPct >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.requiredRealFxAdjustmentPct}%`
                  : `${fxEquilibriumSuite.activeSovereignFx.requiredRealFxAdjustmentPct}%`}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Real Carry Pickup & 12M Deval Risk
              </div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {fxEquilibriumSuite.activeSovereignFx.realCarryDifferentialBps >= 0
                  ? `+${fxEquilibriumSuite.activeSovereignFx.realCarryDifferentialBps}`
                  : fxEquilibriumSuite.activeSovereignFx.realCarryDifferentialBps}{' '}
                bps
              </div>
              <div className="text-xs text-slate-500">
                12M Devaluation Tail Prob:{' '}
                {fxEquilibriumSuite.activeSovereignFx.devaluation12MTailProbPct}%
              </div>
            </div>
          </div>

          {/* Interactive BEER/FEER Fundamental Sliders + Cross-Sovereign Misalignment Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                BEER / FEER Structural Equilibrium Shocks ({fxEquilibriumSuite.activeSovereignFx.currencyCode})
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Terms-of-Trade Commodity Shock (%):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {fxStress.termsOfTradeShockPct >= 0
                      ? `+${fxStress.termsOfTradeShockPct}%`
                      : `${fxStress.termsOfTradeShockPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={1}
                  value={fxStress.termsOfTradeShockPct}
                  onChange={(e) =>
                    setFxStress((prev) => ({
                      ...prev,
                      termsOfTradeShockPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Real Interest Rate Differential Shift (bps):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {fxStress.realRateDifferentialShiftBps >= 0
                      ? `+${fxStress.realRateDifferentialShiftBps}`
                      : fxStress.realRateDifferentialShiftBps}{' '}
                    bps
                  </span>
                </div>
                <input
                  type="range"
                  min={-300}
                  max={300}
                  step={15}
                  value={fxStress.realRateDifferentialShiftBps}
                  onChange={(e) =>
                    setFxStress((prev) => ({
                      ...prev,
                      realRateDifferentialShiftBps: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Balassa-Samuelson Tradable Productivity Shift (%):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {fxStress.balassaSamuelsonProductivityShiftPct >= 0
                      ? `+${fxStress.balassaSamuelsonProductivityShiftPct.toFixed(1)}%`
                      : `${fxStress.balassaSamuelsonProductivityShiftPct.toFixed(1)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={fxStress.balassaSamuelsonProductivityShiftPct}
                  onChange={(e) =>
                    setFxStress((prev) => ({
                      ...prev,
                      balassaSamuelsonProductivityShiftPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs tabular-nums text-blue-600 dark:text-blue-400">
                Trade Expression: {fxEquilibriumSuite.activeSovereignFx.recommendedFxExpression}
              </div>
            </div>

            <div className="lg:col-span-7 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Cross-Sovereign BEER vs. FEER Currency Misalignment (% Overvalued + / Undervalued -)
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={fxEquilibriumSuite.peerFxValuationTable}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="currencyCode"
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
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Bar
                      dataKey="beerMisalignmentPct"
                      name="BEER Misalignment (%)"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="feerImpliedMisalignmentPct"
                      name="FEER Misalignment (%)"
                      fill="#10b981"
                    />
                    <Line
                      type="monotone"
                      dataKey="consensusFxMisalignmentPct"
                      name="Consensus Misalignment (%)"
                      stroke="#e11d48"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cross-Sovereign FX Equilibrium Valuation Table */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs tabular-nums text-slate-500">
                  <th className="py-2.5 px-3">Sovereign & FX</th>
                  <th className="py-2.5 px-2 text-right">Spot REER</th>
                  <th className="py-2.5 px-2 text-right">BEER Fair REER</th>
                  <th className="py-2.5 px-2 text-right">CA vs. Norm (% GDP)</th>
                  <th className="py-2.5 px-2 text-right">Consensus Misalign</th>
                  <th className="py-2.5 px-2 text-right">Real Carry (bps)</th>
                  <th className="py-2.5 px-2 text-right">12M Deval Prob</th>
                  <th className="py-2.5 px-3">Recommended FX Trade Expression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {fxEquilibriumSuite.peerFxValuationTable.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.isCurrentActiveSovereign
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {row.countryName} ({row.currencyCode})
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.spotReerIndex}</td>
                    <td className="py-2.5 px-2 text-right">{row.beerEquilibriumReerIndex}</td>
                    <td className="py-2.5 px-2 text-right">
                      {row.cyclicallyAdjustedCurrentAccountPctGdp}% /{' '}
                      {row.structuralCurrentAccountNormPctGdp}%
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-semibold ${
                        row.consensusFxMisalignmentPct >= 5
                          ? 'text-rose-600 dark:text-rose-400'
                          : row.consensusFxMisalignmentPct <= -4
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {row.consensusFxMisalignmentPct >= 0
                        ? `+${row.consensusFxMisalignmentPct}%`
                        : `${row.consensusFxMisalignmentPct}%`}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.realCarryDifferentialBps >= 0
                        ? `+${row.realCarryDifferentialBps}`
                        : row.realCarryDifferentialBps}{' '}
                      bp
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {row.devaluation12MTailProbPct}%
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs text-slate-700 dark:text-slate-300">
                      {row.recommendedFxExpression}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 8.3: SOVEREIGN DEBT INVESTOR BASE & BANK DOOM-LOOP MATRIX
      ========================================================================== */}
      {activeTab === 'debt_investor_base_doom_loop' && (
        <div className="p-5 space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                IMF Sovereign Debt Investor Base (SDIB) & Domestic Bank Doom-Loop Contagion:
              </span>
              {investorBaseSuite.headlineDiagnostic}
            </div>
            <button
              type="button"
              onClick={() => setInvestorStress(DEFAULT_INVESTOR_BASE_STRESS)}
              className="ui-btn inline-flex shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sudden-Stop Stress</span>
            </button>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Domestic Bank Share of Sovereign Debt
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {investorBaseSuite.activeSovereignRow.domesticBanksSharePct}% of Total Debt
              </div>
              <div className="text-xs text-slate-500">
                {investorBaseSuite.activeSovereignRow.sovereignHoldingsPctOfBankTier1Cet1}% of Bank Tier-1 CET1
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Foreign Private Real-Money Share
              </div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {investorBaseSuite.activeSovereignRow.foreignPrivateSharePct}% of Total Debt
              </div>
              <div className="text-xs text-slate-500">
                Foreign Official: {investorBaseSuite.activeSovereignRow.foreignOfficialSharePct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Stressed Banking System CET1 Ratio
              </div>
              <div
                className={`text-lg font-semibold mt-0.5 ${
                  investorBaseSuite.activeSovereignRow.stressedBankSystemCet1RatioPct < 10
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {investorBaseSuite.activeSovereignRow.stressedBankSystemCet1RatioPct}% (Δ -
                {investorBaseSuite.activeSovereignRow.cet1CapitalErosionPctPts}%)
              </div>
              <div className="text-xs text-slate-500">
                Baseline CET1: {investorBaseSuite.activeSovereignRow.baselineBankSystemCet1RatioPct}%
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-sans font-medium text-slate-500">
                Sudden-Stop 10Y Yield Repricing
              </div>
              <div className="text-lg font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                +{investorBaseSuite.activeSovereignRow.suddenStop10YRepricingBps} bps
              </div>
              <div className="text-xs text-slate-500">
                Doom-Loop Score: {investorBaseSuite.activeSovereignRow.doomLoopContagionScore}/100
              </div>
            </div>
          </div>

          {/* Sliders + Sudden-Stop & CET1 Erosion Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                Simulate Non-Resident Sudden Stop & Sovereign MTM Haircut ({run.iso3})
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Foreign Private Investor Exit (% of Foreign Holdings):</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {investorStress.foreignPrivateExitShockPct}% Exit
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={1}
                  value={investorStress.foreignPrivateExitShockPct}
                  onChange={(e) =>
                    setInvestorStress((prev) => ({
                      ...prev,
                      foreignPrivateExitShockPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between tabular-nums mb-1">
                  <span>Sovereign Bond MTM Price Haircut on Bank Book (%):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -{investorStress.sovereignBondHaircutMarkToMarketPct}% MTM Drop
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={investorStress.sovereignBondHaircutMarkToMarketPct}
                  onChange={(e) =>
                    setInvestorStress((prev) => ({
                      ...prev,
                      sovereignBondHaircutMarkToMarketPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* 5-Sector Creditor Table for Active Sovereign */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500">
                      <th className="py-1.5 px-2">Creditor Sector</th>
                      <th className="py-1.5 px-2 text-right">Base %</th>
                      <th className="py-1.5 px-2 text-right">Post-Shock %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {investorBaseSuite.activeCreditorBreakdown.map((sec) => (
                      <tr key={sec.sectorId}>
                        <td className="py-1.5 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {sec.sectorLabel.split('(')[0]}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {sec.baselineSharePctOfTotalDebt}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {sec.postShockSharePctOfTotalDebt}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {onApplyRatingOrDoomLoopShockToTerminal && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyRatingOrDoomLoopShockToTerminal({
                      label: `Investor Sudden-Stop & Bank Doom-Loop (${investorStress.foreignPrivateExitShockPct}% Foreign Exit)`,
                      cdsDeltaBps: Math.round(
                        investorBaseSuite.activeSovereignRow.suddenStop10YRepricingBps * 0.9
                      ),
                      yield10YDeltaBps:
                        investorBaseSuite.activeSovereignRow.suddenStop10YRepricingBps,
                      fxDepreciationPct: Number(
                        (investorStress.foreignPrivateExitShockPct * 0.35).toFixed(1)
                      ),
                    })
                  }
                  className="ui-btn ui-btn-primary w-full"
                >
                  Apply Sudden-Stop Repricing (+
                  {investorBaseSuite.activeSovereignRow.suddenStop10YRepricingBps} bps) to Terminal
                </button>
              )}
            </div>

            <div className="lg:col-span-7 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Non-Resident Sudden-Stop Curve: 10Y Yield Spike (bps) vs. Domestic Bank CET1 Ratio (%)
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={investorBaseSuite.suddenStopCurve}
                    margin={{ top: 10, right: 18, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="foreignExitPct"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `${v}% Exit`}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: axisColor }}
                      stroke={axisColor}
                      tickFormatter={(v: number) => `+${v}bp`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[4, 18]}
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
                      yAxisId="left"
                      dataKey="projected10YYieldBpsDelta"
                      name="10Y Yield Spike (bps)"
                      fill="#2563eb"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="stressedBankCet1RatioPct"
                      name="Stressed Bank CET1 Ratio (%)"
                      stroke="#e11d48"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cross-Sovereign Investor Base & Doom-Loop Matrix */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs tabular-nums text-slate-500">
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2 text-right">Dom. Banks (%)</th>
                  <th className="py-2.5 px-2 text-right">Dom. Pensions (%)</th>
                  <th className="py-2.5 px-2 text-right">Foreign Pvt (%)</th>
                  <th className="py-2.5 px-2 text-right">Sov / Bank CET1</th>
                  <th className="py-2.5 px-2 text-right">Base → Stressed CET1</th>
                  <th className="py-2.5 px-2 text-right">Doom-Loop Score</th>
                  <th className="py-2.5 px-3">Contagion Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {investorBaseSuite.peerInvestorBaseMatrix.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.isCurrentActiveSovereign
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {row.countryName} ({row.iso3})
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {row.domesticBanksSharePct}%
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.domesticNonBankSharePct}%</td>
                    <td className="py-2.5 px-2 text-right">{row.foreignPrivateSharePct}%</td>
                    <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-400">
                      {row.sovereignHoldingsPctOfBankTier1Cet1}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.baselineBankSystemCet1RatioPct}% →{' '}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {row.stressedBankSystemCet1RatioPct}%
                      </strong>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {row.doomLoopContagionScore}/100
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs font-semibold">
                      {row.doomLoopRegime.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SUB-TAB 8.4: BOARDROOM INVESTMENT COMMITTEE (IC) PITCHBOOK & EXPORTER
      ========================================================================== */}
      {activeTab === 'ic_pitchbook_dossier_exporter' && (
        <div className="p-5 space-y-6">
          {/* Top Export Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                {icPitchbookDossier.dossierId} · CONVICTION: {icPitchbookDossier.convictionConfidencePct}%
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                {icPitchbookDossier.committeeTitle}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  exportICPitchbookPdfDossier(icPitchbookDossier);
                  setExportStatusBanner(
                    `Exported Multi-Page Investment Committee Pitchbook PDF (${icPitchbookDossier.dossierId}.pdf).`
                  );
                }}
                className="ui-btn ui-btn-primary inline-flex"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Multi-Page PDF Pitchbook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportICPitchbookMarkdownMemo(icPitchbookDossier);
                  setExportStatusBanner(
                    `Downloaded Investment Committee Markdown Memo (${icPitchbookDossier.dossierId}.md).`
                  );
                }}
                className="ui-btn inline-flex"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Markdown (.md)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportICPitchbookJsonDossier(icPitchbookDossier);
                  setExportStatusBanner(
                    `Exported Canonical IC Pitchbook JSON (${icPitchbookDossier.dossierId}.json).`
                  );
                }}
                className="ui-btn inline-flex"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Export JSON (.json)</span>
              </button>
            </div>
          </div>

          {exportStatusBanner && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{exportStatusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setExportStatusBanner(null)}
                className="underline text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Committee Vote Selector & Custom Thesis Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                Customize Investment Committee Vote & Thesis Directive
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Formal Investment Committee Vote Recommendation
                </label>
                <select
                  value={icPitchbookDossier.recommendedCommitteeVote}
                  onChange={(e) =>
                    setCustomVote(
                      e.target.value as BoardroomICPitchbookDossier['recommendedCommitteeVote']
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <option value="APPROVE_OVERWEIGHT_ALLOCATION">
                    Approve overweight allocation (sell CDS / long carry)
                  </option>
                  <option value="HOLD_NEUTRAL_WAIT_FOR_CATALYST">
                    Hold neutral / relative-value curve trade only
                  </option>
                  <option value="APPROVE_DEFENSIVE_CDS_HEDGE">
                    Approve defensive 5Y CDS & FX ndf hedge
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Override Executive Thesis Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customThesisText}
                  onChange={(e) => setCustomThesisText(e.target.value)}
                  placeholder={icPitchbookDossier.icExecutiveThesis}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Right: 4-Pillar Evidence Summary & Kill-Switches */}
            <div className="lg:col-span-7 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                Executive Pitchbook Synthesis ({run.countryName} · {run.iso3})
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {icPitchbookDossier.icExecutiveThesis}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                {icPitchbookDossier.keyThesisPillars.map((pillar, idx) => (
                  <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="tabular-nums text-blue-600 dark:text-blue-400 mr-1.5">
                      0{idx + 1}.
                    </strong>
                    {pillar}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Multi-Sovereign Comparative IC Matrix */}
          <div className="border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Cross-Sovereign Investment Committee Comparative Matrix (Zero-Notional Units)
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                5Y CDS (bps) · Shadow Rating · BEER/FEER FX (%) · Bank Doom-Loop · Event Odds (¢)
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs tabular-nums text-slate-500">
                  <th className="py-2.5 px-3">Sovereign</th>
                  <th className="py-2.5 px-2 text-right">Spot 5Y CDS</th>
                  <th className="py-2.5 px-2 text-right">Mod-Mkt Gap</th>
                  <th className="py-2.5 px-2 text-right">Official → Shadow</th>
                  <th className="py-2.5 px-2 text-right">FX Misalign</th>
                  <th className="py-2.5 px-2 text-right">Doom-Loop (CET1)</th>
                  <th className="py-2.5 px-2 text-right">Event Odds</th>
                  <th className="py-2.5 px-2">IC Vote</th>
                  <th className="py-2.5 px-3">Primary Trade Structure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                {icPitchbookDossier.comparativeMatrix.map((row) => (
                  <tr
                    key={row.iso3}
                    className={
                      row.isCurrentActiveSovereign
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {row.countryName} ({row.iso3})
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.spot5YCdsBps} bp</td>
                    <td
                      className={`py-2.5 px-2 text-right font-semibold ${
                        row.modelVsMarketCdsGapPct >= 4
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.modelVsMarketCdsGapPct <= -4
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {row.modelVsMarketCdsGapPct >= 0
                        ? `+${row.modelVsMarketCdsGapPct}%`
                        : `${row.modelVsMarketCdsGapPct}%`}
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.officialVsShadowRating}</td>
                    <td
                      className={`py-2.5 px-2 text-right ${
                        row.consensusFxMisalignmentPct >= 5
                          ? 'text-rose-600 dark:text-rose-400'
                          : row.consensusFxMisalignmentPct <= -4
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {row.consensusFxMisalignmentPct >= 0
                        ? `+${row.consensusFxMisalignmentPct}%`
                        : `${row.consensusFxMisalignmentPct}%`}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {row.bankDoomLoopScore}/100 ({row.cet1PostStressPct}%)
                    </td>
                    <td className="py-2.5 px-2 text-right">{row.topPredictionEventOddsCents}¢</td>
                    <td className="py-2.5 px-2 font-sans text-xs font-semibold">
                      {row.icConvictionVote.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs text-slate-700 dark:text-slate-300">
                      {row.primaryTradeStructure}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
