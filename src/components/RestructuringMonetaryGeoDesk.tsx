import React, { useState, useMemo } from 'react';
import {
  CouncilAssessmentRun,
  WatchlistItem,
  RestructuringTermSheetInputs,
  TaylorRuleStressInputs,
  GeoSanctionsChokepointInputs,
  ClimateFiscalSlbInputs,
  MaritimeChokepointId,
  NgfsClimateScenarioId,
} from '../types/council';
import {
  DEFAULT_RESTRUCTURING_TERM_SHEET,
  DEFAULT_TAYLOR_RULE_INPUTS,
  DEFAULT_GEO_SANCTIONS_CHOKEPOINT_INPUTS,
  DEFAULT_CLIMATE_FISCAL_SLB_INPUTS,
  computeSovereignRestructuringWaterfallSuite,
  computeTaylorRuleFiscalDominanceSuite,
  computeGeoSanctionsChokepointSuite,
  computeNgfsClimateFiscalSuite,
} from '../utils/restructuringMonetaryGeoEngine';
import {
  Scale,
  Landmark,
  ShieldAlert,
  Leaf,
  Zap,
  RotateCcw,
  ArrowUpRight,
  Lock,
  Anchor,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type RestructuringMonetaryGeoSubTabId =
  | 'restructuring_npv_cac_waterfall'
  | 'taylor_rule_fiscal_dominance'
  | 'geopolitical_reserves_chokepoints'
  | 'ngfs_climate_slb_greenium';

interface RestructuringMonetaryGeoDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  isDark?: boolean;
  activeSubTab?: RestructuringMonetaryGeoSubTabId;
  onSelectSubTab?: (subTab: RestructuringMonetaryGeoSubTabId) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onApplyShockToTerminal?: (params: {
    label: string;
    cdsDeltaBps: number;
    yield10YDeltaBps: number;
    fxDepreciationPct: number;
  }) => void;
}

export const RestructuringMonetaryGeoDesk: React.FC<RestructuringMonetaryGeoDeskProps> = ({
  run,
  watchlistItems,
  activeSubTab: controlledSubTab,
  onSelectSubTab,
  onSelectSovereign,
  onApplyShockToTerminal,
}) => {
  const [localSubTab, setLocalSubTab] = useState<RestructuringMonetaryGeoSubTabId>(
    'restructuring_npv_cac_waterfall'
  );

  const validSubTabs: RestructuringMonetaryGeoSubTabId[] = [
    'restructuring_npv_cac_waterfall',
    'taylor_rule_fiscal_dominance',
    'geopolitical_reserves_chokepoints',
    'ngfs_climate_slb_greenium',
  ];

  const activeSubTab: RestructuringMonetaryGeoSubTabId =
    controlledSubTab && validSubTabs.includes(controlledSubTab)
      ? controlledSubTab
      : localSubTab;

  const handleSelectSubTab = (tab: RestructuringMonetaryGeoSubTabId) => {
    setLocalSubTab(tab);
    if (onSelectSubTab) onSelectSubTab(tab);
  };

  // Interactive Stress States for Suites 9.1 - 9.4
  const [termSheetInputs, setTermSheetInputs] = useState<RestructuringTermSheetInputs>(
    DEFAULT_RESTRUCTURING_TERM_SHEET
  );
  const [taylorInputs, setTaylorInputs] = useState<TaylorRuleStressInputs>(
    DEFAULT_TAYLOR_RULE_INPUTS
  );
  const [geoInputs, setGeoInputs] = useState<GeoSanctionsChokepointInputs>(
    DEFAULT_GEO_SANCTIONS_CHOKEPOINT_INPUTS
  );
  const [climateInputs, setClimateInputs] = useState<ClimateFiscalSlbInputs>(
    DEFAULT_CLIMATE_FISCAL_SLB_INPUTS
  );

  // Quantitative Engines
  const restructuringSuite = useMemo(
    () =>
      computeSovereignRestructuringWaterfallSuite(
        run.openData,
        watchlistItems,
        termSheetInputs
      ),
    [run.openData, watchlistItems, termSheetInputs]
  );

  const taylorSuite = useMemo(
    () =>
      computeTaylorRuleFiscalDominanceSuite(run.openData, watchlistItems, taylorInputs),
    [run.openData, watchlistItems, taylorInputs]
  );

  const geoSuite = useMemo(
    () =>
      computeGeoSanctionsChokepointSuite(run.openData, watchlistItems, geoInputs),
    [run.openData, watchlistItems, geoInputs]
  );

  const climateSuite = useMemo(
    () =>
      computeNgfsClimateFiscalSuite(run.openData, watchlistItems, climateInputs),
    [run.openData, watchlistItems, climateInputs]
  );

  const subTabConfigs: {
    id: RestructuringMonetaryGeoSubTabId;
    code: string;
    label: string;
    badge: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'restructuring_npv_cac_waterfall',
      code: '9.1',
      label: 'IMF / Paris Club Restructuring & NPV Lab',
      badge: `${restructuringSuite.eurobondNpvRecoveryCents.toFixed(1)}¢ Recovery`,
      icon: <Scale className="w-3.5 h-3.5" />,
    },
    {
      id: 'taylor_rule_fiscal_dominance',
      code: '9.2',
      label: 'Central Bank Taylor Rule & Fiscal Dominance',
      badge: `${taylorSuite.activeRow.policyStanceGapBps >= 0 ? `+${taylorSuite.activeRow.policyStanceGapBps}` : taylorSuite.activeRow.policyStanceGapBps} bps Stance`,
      icon: <Landmark className="w-3.5 h-3.5" />,
    },
    {
      id: 'geopolitical_reserves_chokepoints',
      code: '9.3',
      label: 'Reserve Custody Freeze & Chokepoint Matrix',
      badge: `${geoSuite.activeRow.postFreezeImportCoverMonths.toFixed(1)}M Cover`,
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    {
      id: 'ngfs_climate_slb_greenium',
      code: '9.4',
      label: 'NGFS Climate Fiscal Stress & SLB Greenium',
      badge: `+${climateSuite.activeRow.projected10YClimateDebtAdderPctGdp.toFixed(1)}% GDP Debt`,
      icon: <Leaf className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Institutional Header */}
      <div className="institutional-card p-5 border-l-4 border-l-indigo-600">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <span>TIER-9 SOVEREIGN WORKOUT, MONETARY REACTION & GEO-ECONOMIC DESK</span>
              <span>•</span>
              <span>ZERO-NOTIONAL NORMALIZED (% GDP / BPS / 0–100¢ PAR / MONTHS COVER)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              9. Restructuring Waterfall, Taylor Rule Reaction, Reserve Custody Freeze & NGFS Climate Lab —{' '}
              <span className="text-indigo-600 dark:text-indigo-400">
                {run.countryName} ({run.iso3})
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-4xl">
              Simulate IMF Preferred Creditor Status and Paris Club Comparability of Treatment workouts (`0–100¢` par NPV recovery), benchmark Monetary Policy Committee rates against an Open-Economy Augmented Taylor Rule, audit Central Bank FX reserve custody freeze resilience (`% of reserves` and `months import cover`), and price NGFS climate fiscal stress and SLB coupon step-up risks (`bps`).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-right">
              <div className="text-[10px] font-mono uppercase text-slate-500">Eurobond NPV / Haircut</div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {restructuringSuite.eurobondNpvRecoveryCents.toFixed(1)}¢ / -{restructuringSuite.weightedAverageNpvHaircutPct.toFixed(1)}% NPV
              </div>
            </div>
            <div className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-right">
              <div className="text-[10px] font-mono uppercase text-slate-500">Spot vs. Taylor Rate</div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {taylorSuite.activeRow.spotPolicyRatePct.toFixed(2)}% vs. {taylorSuite.activeRow.taylorImpliedPolicyRatePct.toFixed(2)}%
              </div>
            </div>
            <div className="px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-right">
              <div className="text-[10px] font-mono uppercase text-slate-500">Sanction-Immune Reserves</div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {geoSuite.activeRow.sanctionImmuneReserveSharePct.toFixed(1)}% ({geoSuite.activeRow.postFreezeImportCoverMonths.toFixed(1)}M)
              </div>
            </div>
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
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={isActive ? 'text-indigo-300 dark:text-white' : 'text-indigo-600 dark:text-indigo-400'}>
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
          9.1 IMF & PARIS CLUB DEBT RESTRUCTURING & NPV RECOVERY SIMULATOR
         ===================================================================== */}
      {activeSubTab === 'restructuring_npv_cac_waterfall' && (
        <div className="space-y-6">
          {/* Diagnostic Banner */}
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-amber-600 dark:text-amber-400 mr-2">
                [IMF DSA & PARIS CLUB COMPARABILITY ENGINE]
              </span>
              {restructuringSuite.headlineDiagnostic}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTermSheetInputs(DEFAULT_RESTRUCTURING_TERM_SHEET)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Term Sheet
              </button>
              {onApplyShockToTerminal && (
                <button
                  onClick={() =>
                    onApplyShockToTerminal({
                      label: `IMF/Paris Club Workout (${termSheetInputs.principalHaircutPct}% Haircut, ${restructuringSuite.eurobondNpvRecoveryCents}¢ NPV)`,
                      cdsDeltaBps: Math.round((100 - restructuringSuite.eurobondNpvRecoveryCents) * 8.5),
                      yield10YDeltaBps: Math.round((termSheetInputs.exitYieldPct - 8.5) * 45),
                      fxDepreciationPct: Number((termSheetInputs.principalHaircutPct * 0.25).toFixed(1)),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Propagate Restructuring Stress to Terminal
                </button>
              )}
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Eurobond NPV Recovery</div>
              <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {restructuringSuite.eurobondNpvRecoveryCents.toFixed(1)}¢
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Per 100¢ par (+{restructuringSuite.vriPresentValueGainCents.toFixed(1)}¢ GDP VRI)
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Pre → Post Debt / GDP</div>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                {restructuringSuite.preRestructuringDebtGdpPct.toFixed(1)}% → {restructuringSuite.postRestructuringDebtGdpPct.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                IMF Target: {restructuringSuite.imfTargetDebtGdpPct.toFixed(1)}% GDP
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Weighted NPV Relief</div>
              <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                -{restructuringSuite.weightedAverageNpvHaircutPct.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Across all 5 creditor tiers
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">GFN Relief (% of GDP)</div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {restructuringSuite.preRestructuringGfnPctGdp.toFixed(1)}% → {restructuringSuite.postRestructuringGfnPctGdp.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gross Financing Need / GDP
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Paris Club Parity Gap</div>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                {restructuringSuite.parisClubComparabilityGapPct.toFixed(1)}¢
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {restructuringSuite.parisClubComparabilityGapPct <= 10 ? 'Comparability Met' : 'Parity Divergence'}
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">CAC Holdout Litigation Risk</div>
              <div
                className={`text-lg font-mono font-bold mt-1 ${
                  restructuringSuite.cacHoldoutBlockingProbPct >= 35
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {restructuringSuite.cacHoldoutBlockingProbPct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Blocking minority probability
              </div>
            </div>
          </div>

          {/* Interactive Term Sheet Controls + Exit Yield Sensitivity SVG */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Restructuring Term-Sheet Calibrator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Adjust nominal haircut, extension, exit yield, and CAC aggregation regime
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  0–100¢ Par Engine
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Nominal Principal Haircut (%)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{termSheetInputs.principalHaircutPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={70}
                    step={2}
                    value={termSheetInputs.principalHaircutPct}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        principalHaircutPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Maturity Extension (+Years)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      +{termSheetInputs.maturityExtensionYears} Years
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={1}
                    value={termSheetInputs.maturityExtensionYears}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        maturityExtensionYears: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Coupon Reduction Adjustment (bps)
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {termSheetInputs.couponReductionBps} bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-500}
                    max={0}
                    step={25}
                    value={termSheetInputs.couponReductionBps}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        couponReductionBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Principal Grace Period (Years)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {termSheetInputs.gracePeriodYears} Years
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={termSheetInputs.gracePeriodYears}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        gracePeriodYears: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Post-Exchange Exit Yield Discount Rate (%)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {termSheetInputs.exitYieldPct.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={22}
                    step={0.5}
                    value={termSheetInputs.exitYieldPct}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        exitYieldPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      GDP-Linked Warrant / VRI Kicker (+bps)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{termSheetInputs.vriGdpWarrantKickerBps} bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={250}
                    step={25}
                    value={termSheetInputs.vriGdpWarrantKickerBps}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        vriGdpWarrantKickerBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Collective Action Clause (CAC) Aggregation Architecture
                  </label>
                  <select
                    value={termSheetInputs.cacRegime}
                    onChange={(e) =>
                      setTermSheetInputs((prev) => ({
                        ...prev,
                        cacRegime: e.target.value as RestructuringTermSheetInputs['cacRegime'],
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="SINGLE_LIMB_AGGREGATED_75">
                      ICMA Single-Limb Aggregated CAC (75% Cross-Series Vote)
                    </option>
                    <option value="DUAL_LIMB_SERIES_66_75">
                      Dual-Limb CAC (66.7% Per-Series + 75% Aggregated)
                    </option>
                    <option value="LEGACY_UNANIMOUS_NO_CAC">
                      Legacy Pre-CAC Unanimous Consent (High Vulture Holdout Risk)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exit Yield NPV Curve & Seniority Waterfall Visual */}
            <div className="lg:col-span-7 institutional-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      NPV Recovery vs. Exit Yield Discount Curve (0–100¢ per 100¢ Par)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Compares External Eurobond NPV (including GDP warrant kicker) vs. Paris Club Bilateral NPV across exit yields (6%–20%)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                      Eurobonds (CAC)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Paris Club Official
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 640 230" className="w-full h-56">
                    {/* Grid lines */}
                    {[20, 40, 60, 80, 100].map((val) => {
                      const y = 195 - (val / 100) * 165;
                      return (
                        <g key={val}>
                          <line
                            x1={48}
                            y1={y}
                            x2={610}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={40}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[10px] font-mono fill-slate-400"
                          >
                            {val}¢
                          </text>
                        </g>
                      );
                    })}

                    {/*Polyline for Bilateral NPV*/}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      points={restructuringSuite.exitYieldSensitivityCurve
                        .map((pt, idx) => {
                          const x =
                            65 +
                            (idx /
                              Math.max(1, restructuringSuite.exitYieldSensitivityCurve.length - 1)) *
                              525;
                          const y = 195 - (pt.bilateralNpvCents / 100) * 165;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/*Polyline for Eurobond NPV*/}
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      points={restructuringSuite.exitYieldSensitivityCurve
                        .map((pt, idx) => {
                          const x =
                            65 +
                            (idx /
                              Math.max(1, restructuringSuite.exitYieldSensitivityCurve.length - 1)) *
                              525;
                          const y = 195 - (pt.eurobondNpvCents / 100) * 165;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Data points */}
                    {restructuringSuite.exitYieldSensitivityCurve.map((pt, idx) => {
                      const x =
                        65 +
                        (idx /
                          Math.max(1, restructuringSuite.exitYieldSensitivityCurve.length - 1)) *
                          525;
                      const yEb = 195 - (pt.eurobondNpvCents / 100) * 165;
                      const yPc = 195 - (pt.bilateralNpvCents / 100) * 165;
                      return (
                        <g key={pt.exitYieldPct}>
                          <circle cx={x} cy={yPc} r={3.5} fill="#10b981" />
                          <circle cx={x} cy={yEb} r={4.5} fill="#4f46e5" />
                          <text
                            x={x}
                            y={yEb - 8}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-bold fill-indigo-600 dark:fill-indigo-400"
                          >
                            {pt.eurobondNpvCents.toFixed(0)}¢
                          </text>
                          <text
                            x={x}
                            y={214}
                            textAnchor="middle"
                            className="text-[10px] font-mono fill-slate-500"
                          >
                            {pt.exitYieldPct}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Creditor Tier Comparability Summary Bars */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-mono uppercase text-slate-500">
                  Creditor Seniority Recovery Waterfall (0–100¢ per 100¢ Par)
                </div>
                {restructuringSuite.creditorWaterfall.map((tier) => (
                  <div key={tier.tierId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        #{tier.seniorityRank} {tier.tierLabel}{' '}
                        <span className="text-slate-400 font-mono">
                          ({tier.debtShareOfTotalPct}% of debt / {tier.preRestructuringDebtGdpPct}% GDP)
                        </span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tier.npvRecoveryCentsPerPar.toFixed(1)}¢ recovery (-{tier.impliedPresentValueLossPct.toFixed(1)}% NPV)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          tier.seniorityRank === 1
                            ? 'bg-emerald-500'
                            : tier.seniorityRank <= 3
                            ? 'bg-sky-500'
                            : tier.seniorityRank === 4
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, tier.npvRecoveryCentsPerPar)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5-Tier Creditor Waterfall Table */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Creditor Seniority, Comparability of Treatment & CAC Holdout Matrix — {run.countryName} ({run.iso3})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Audits IMF/World Bank Preferred Creditor Status (PCS) exemption, Paris Club Evian comparability, and CAC single-limb voting thresholds
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Rank & Creditor Class</th>
                    <th className="py-2.5 px-3">Legal / CAC Regime</th>
                    <th className="py-2.5 px-3 text-right">Debt Share (%)</th>
                    <th className="py-2.5 px-3 text-right">Pre-Debt (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">Nominal Haircut</th>
                    <th className="py-2.5 px-3 text-right">Extension</th>
                    <th className="py-2.5 px-3 text-right">NPV Recovery (¢)</th>
                    <th className="py-2.5 px-3 text-right">Holdout Risk</th>
                    <th className="py-2.5 px-3">Comparability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {restructuringSuite.creditorWaterfall.map((row) => (
                    <tr key={row.tierId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">
                          #{row.seniorityRank}
                        </span>
                        {row.tierLabel}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                        {row.legalRegime}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.debtShareOfTotalPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.preRestructuringDebtGdpPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        -{row.appliedPrincipalHaircutPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        +{row.maturityExtensionYears}Y
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {row.npvRecoveryCentsPerPar.toFixed(1)}¢
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.estimatedHoldoutRiskPct}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            row.comparabilityStatus === 'PREFERRED_CREDITOR_EXEMPT'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : row.comparabilityStatus === 'COMPARABLE_BURDEN_PARITY'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : row.comparabilityStatus === 'DOMESTIC_STABILITY_CARVEOUT'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {row.comparabilityStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Sovereign Restructuring & IMF DSA Sustainability Table */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cross-Sovereign IMF DSA Post-Workout Sustainability Comparator
              </h3>
              <p className="text-[11px] text-slate-500">
                Evaluates whether the simulated term sheet restores each watchlist sovereign below its IMF Debt Sustainability Analysis (DSA) debt-to-GDP threshold
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3 text-right">Pre-Debt (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">Post-Workout Debt (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">IMF DSA Target (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">Eurobond NPV (¢)</th>
                    <th className="py-2.5 px-3 text-right">GFN Relief (% GDP)</th>
                    <th className="py-2.5 px-3">IMF DSA Sustainability Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {restructuringSuite.peerRestructuringTable.map((peer) => (
                    <tr
                      key={peer.iso3}
                      onClick={() => {
                        const found = watchlistItems.find((w) => w.iso3 === peer.iso3);
                        if (found && onSelectSovereign) onSelectSovereign(found);
                      }}
                      className={`cursor-pointer transition-colors ${
                        peer.isCurrentActiveSovereign
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {peer.countryName}
                        </span>{' '}
                        <span className="text-slate-400">({peer.iso3})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {peer.preDebtToGdpPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {peer.postDebtToGdpPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {peer.imfDsaSustainabilityTargetGdpPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {peer.eurobondNpvRecoveryCents.toFixed(1)}¢
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        -{peer.gfnReductionPctGdp.toFixed(1)}% GDP
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded ${
                            peer.dsaVerdict === 'RESTORED_SUSTAINABLE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : peer.dsaVerdict === 'MARGINAL_BUFFER'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {peer.dsaVerdict === 'RESTORED_SUSTAINABLE' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {peer.dsaVerdict.replace(/_/g, ' ')}
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
          9.2 CENTRAL BANK AUGMENTED TAYLOR RULE & FISCAL DOMINANCE LAB
         ===================================================================== */}
      {activeSubTab === 'taylor_rule_fiscal_dominance' && (
        <div className="space-y-6">
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-indigo-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 mr-2">
                [AUGMENTED TAYLOR RULE & FISCAL DOMINANCE ENGINE]
              </span>
              {taylorSuite.headlineDiagnostic}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTaylorInputs(DEFAULT_TAYLOR_RULE_INPUTS)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Taylor Parameters
              </button>
              {onApplyShockToTerminal && (
                <button
                  onClick={() =>
                    onApplyShockToTerminal({
                      label: `MPC Taylor Adjustment (${taylorSuite.activeRow.policyStanceGapBps} bps Stance Gap)`,
                      cdsDeltaBps: Math.round(Math.max(-60, -taylorSuite.activeRow.policyStanceGapBps * 0.35)),
                      yield10YDeltaBps: Math.round(-taylorSuite.activeRow.policyStanceGapBps * 0.45),
                      fxDepreciationPct: Number(
                        Math.max(-4, -taylorSuite.activeRow.policyStanceGapBps * 0.015).toFixed(1)
                      ),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Propagate Monetary Reaction to Terminal
                </button>
              )}
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Spot Policy Rate</div>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                {taylorSuite.activeRow.spotPolicyRatePct.toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Real Rate: {taylorSuite.activeRow.realPolicyRatePct.toFixed(2)}%
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Taylor Equilibrium Rate</div>
              <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {taylorSuite.activeRow.taylorImpliedPolicyRatePct.toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                r* = {taylorSuite.activeRow.neutralRealRatePct.toFixed(2)}% | Target π* = {taylorSuite.activeRow.inflationTargetPct.toFixed(1)}%
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">MPC Stance Gap (bps)</div>
              <div
                className={`text-lg font-mono font-bold mt-1 ${
                  taylorSuite.activeRow.policyStanceGapBps >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {taylorSuite.activeRow.policyStanceGapBps >= 0
                  ? `+${taylorSuite.activeRow.policyStanceGapBps}`
                  : taylorSuite.activeRow.policyStanceGapBps}{' '}
                bps
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {taylorSuite.activeRow.policyStanceGapBps >= 0 ? 'Hawkish Buffer' : 'Behind the Curve'}
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Fiscal Dominance Score</div>
              <div
                className={`text-lg font-mono font-bold mt-1 ${
                  taylorSuite.activeRow.fiscalDominanceScore >= 65
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {taylorSuite.activeRow.fiscalDominanceScore} / 100
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Interest / Rev: {taylorSuite.activeRow.interestToRevenuePct.toFixed(1)}%
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Financial Repression Tax</div>
              <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                {taylorSuite.activeRow.financialRepressionTaxPctGdp.toFixed(2)}% GDP
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Implicit domestic debt liquidation
              </div>
            </div>

            <div className="institutional-card p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-500">Monetary Regime</div>
              <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
                {taylorSuite.activeRow.regimeClassification.replace(/_/g, ' ')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Output Gap: {taylorSuite.activeRow.estimatedOutputGapPctGdp >= 0 ? `+${taylorSuite.activeRow.estimatedOutputGapPctGdp}` : taylorSuite.activeRow.estimatedOutputGapPctGdp}% GDP
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Taylor Rule Sliders */}
            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  MPC Reaction Function Parameters
                </h3>
                <p className="text-[11px] text-slate-500">
                  Calibrate neutral real rate (r*), inflation target, Taylor weights, and CPI supply shocks
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Neutral Equilibrium Real Rate r* (%)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {taylorInputs.neutralRealRateRStarPct.toFixed(2)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1.0}
                    max={4.0}
                    step={0.25}
                    value={taylorInputs.neutralRealRateRStarPct}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        neutralRealRateRStarPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Central Bank Inflation Target π* (%)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {taylorInputs.inflationTargetPct.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.5}
                    max={6.0}
                    step={0.5}
                    value={taylorInputs.inflationTargetPct}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        inflationTargetPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Inflation Gap Hawkish Weight (α)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {taylorInputs.inflationGapWeightAlpha.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1.8}
                    step={0.05}
                    value={taylorInputs.inflationGapWeightAlpha}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        inflationGapWeightAlpha: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Output Gap Stabilization Weight (β)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {taylorInputs.outputGapWeightBeta.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    value={taylorInputs.outputGapWeightBeta}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        outputGapWeightBeta: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      FX Pass-Through & Spread Defense Weight (γ)
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {taylorInputs.fxPassThroughDefenseWeightGamma.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={0.6}
                    step={0.05}
                    value={taylorInputs.fxPassThroughDefenseWeightGamma}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        fxPassThroughDefenseWeightGamma: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Simulated CPI Supply Shock (bps)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {taylorInputs.simulatedSupplyInflationShockBps >= 0
                        ? `+${taylorInputs.simulatedSupplyInflationShockBps}`
                        : taylorInputs.simulatedSupplyInflationShockBps}{' '}
                      bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-200}
                    max={500}
                    step={25}
                    value={taylorInputs.simulatedSupplyInflationShockBps}
                    onChange={(e) =>
                      setTaylorInputs((prev) => ({
                        ...prev,
                        simulatedSupplyInflationShockBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Sovereign Yield Curve Transmission Chart */}
            <div className="lg:col-span-7 institutional-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Sovereign Yield Curve Transmission (3M–30Y Nominal vs. Taylor Equilibrium vs. Real)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Projects how closing the MPC Taylor stance gap reprices the sovereign curve across tenors
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-slate-700 dark:text-slate-300">● Spot Nominal</span>
                    <span className="text-indigo-600 dark:text-indigo-400">● Taylor Implied</span>
                    <span className="text-emerald-600 dark:text-emerald-400">● Real Yield</span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2.5 pt-2">
                  {taylorSuite.yieldCurveTransmission.map((pt) => (
                    <div
                      key={pt.tenorLabel}
                      className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 text-center space-y-1.5"
                    >
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pt.tenorLabel}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">Spot</div>
                      <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {pt.spotNominalYieldPct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                        Taylor Eq.
                      </div>
                      <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {pt.taylorEquilibriumNominalYieldPct.toFixed(2)}%
                      </div>
                      <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Real: {pt.realYieldPct.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                  Fiscal Dominance Interpretation:
                </span>
                When interest payments consume{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                  {taylorSuite.activeRow.interestToRevenuePct.toFixed(1)}%
                </span>{' '}
                of government revenues, every +100 bps policy rate hike directly expands the fiscal deficit, creating pressure to hold rates below the Taylor-implied{' '}
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {taylorSuite.activeRow.taylorImpliedPolicyRatePct.toFixed(2)}%
                </span>
                .
              </div>
            </div>
          </div>

          {/* Cross-Sovereign Taylor Rule Matrix */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cross-Sovereign Central Bank Reaction & Fiscal Dominance Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3 text-right">Spot Policy (%)</th>
                    <th className="py-2.5 px-3 text-right">CPI / Target (%)</th>
                    <th className="py-2.5 px-3 text-right">Taylor Rate (%)</th>
                    <th className="py-2.5 px-3 text-right">Stance Gap (bps)</th>
                    <th className="py-2.5 px-3 text-right">Real Rate (%)</th>
                    <th className="py-2.5 px-3 text-right">Fiscal Dom. (0–100)</th>
                    <th className="py-2.5 px-3 text-right">Repression Tax (% GDP)</th>
                    <th className="py-2.5 px-3">Monetary Regime Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {taylorSuite.peerTaylorMatrix.map((row) => (
                    <tr
                      key={row.iso3}
                      onClick={() => {
                        const found = watchlistItems.find((w) => w.iso3 === row.iso3);
                        if (found && onSelectSovereign) onSelectSovereign(found);
                      }}
                      className={`cursor-pointer ${
                        row.isCurrentActiveSovereign
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {row.countryName}
                        </span>{' '}
                        <span className="text-slate-400">({row.iso3})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.spotPolicyRatePct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.headlineInflationPct.toFixed(1)}% / {row.inflationTargetPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {row.taylorImpliedPolicyRatePct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          row.policyStanceGapBps >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.policyStanceGapBps >= 0
                          ? `+${row.policyStanceGapBps}`
                          : row.policyStanceGapBps}{' '}
                        bps
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.realPolicyRatePct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.fiscalDominanceScore}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.financialRepressionTaxPctGdp.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            row.regimeClassification === 'CREDIBLE_ORTHODOX_HAWK'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : row.regimeClassification === 'NEUTRAL_TAYLOR_ALIGNED'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : row.regimeClassification === 'BEHIND_THE_CURVE_DOVISH'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {row.regimeClassification.replace(/_/g, ' ')}
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
          9.3 GEOPOLITICAL RESERVE CUSTODY FREEZE & MARITIME CHOKEPOINT MATRIX
         ===================================================================== */}
      {activeSubTab === 'geopolitical_reserves_chokepoints' && (
        <div className="space-y-6">
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-rose-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-rose-600 dark:text-rose-400 mr-2">
                [RESERVE CUSTODY FREEZE & MARITIME CHOKEPOINT AUDIT]
              </span>
              {geoSuite.headlineDiagnostic}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setGeoInputs(DEFAULT_GEO_SANCTIONS_CHOKEPOINT_INPUTS)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Geo Stress
              </button>
              {onApplyShockToTerminal && (
                <button
                  onClick={() =>
                    onApplyShockToTerminal({
                      label: `Reserve Freeze (${geoInputs.g7ReserveFreezeSeverityPct}%) & ${geoInputs.activeChokepointDisruption.replace(/_/g, ' ')} Blockade`,
                      cdsDeltaBps: Math.round(
                        (100 - geoSuite.activeRow.sanctionImmuneReserveSharePct) * 2.4 +
                          geoSuite.activeRow.blockadeCpiPassThroughBps * 0.45
                      ),
                      yield10YDeltaBps: Math.round(geoSuite.activeRow.blockadeCpiPassThroughBps * 0.65),
                      fxDepreciationPct: Number(
                        ((100 - geoSuite.activeRow.sanctionImmuneReserveSharePct) * 0.18).toFixed(1)
                      ),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Propagate Geo-Sanctions Shock to Terminal
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls */}
            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sanctions Custody Freeze & Maritime Blockade Controls
                </h3>
                <p className="text-[11px] text-slate-500">
                  Test central bank reserve immobilization and maritime trade artery disruption
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      G7 Custody Reserve Freeze Severity (%)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {geoInputs.g7ReserveFreezeSeverityPct}% Frozen
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={geoInputs.g7ReserveFreezeSeverityPct}
                    onChange={(e) =>
                      setGeoInputs((prev) => ({
                        ...prev,
                        g7ReserveFreezeSeverityPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5 text-indigo-500" />
                    Primary Disrupted Maritime Chokepoint
                  </label>
                  <select
                    value={geoInputs.activeChokepointDisruption}
                    onChange={(e) =>
                      setGeoInputs((prev) => ({
                        ...prev,
                        activeChokepointDisruption: e.target.value as MaritimeChokepointId,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="strait_of_hormuz">Strait of Hormuz (Gulf Energy Artery)</option>
                    <option value="bab_el_mandeb_red_sea">Bab el-Mandeb / Red Sea Corridor</option>
                    <option value="suez_canal">Suez Canal (Europe–Asia Container Route)</option>
                    <option value="strait_of_malacca">Strait of Malacca (Indo-Pacific Lifeline)</option>
                    <option value="panama_canal">Panama Canal (Inter-Oceanic Bulk & LNG)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Chokepoint Blockade / Rerouting Intensity (%)
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {geoInputs.chokepointBlockadeIntensityPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={geoInputs.chokepointBlockadeIntensityPct}
                    onChange={(e) =>
                      setGeoInputs((prev) => ({
                        ...prev,
                        chokepointBlockadeIntensityPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Secondary Sanctions / Tariff Penalty (bps)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      +{geoInputs.secondaryTariffPenaltyBps} bps
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1500}
                    step={50}
                    value={geoInputs.secondaryTariffPenaltyBps}
                    onChange={(e) =>
                      setGeoInputs((prev) => ({
                        ...prev,
                        secondaryTariffPenaltyBps: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Reserve Custody Breakdown + Chokepoint Impact */}
            <div className="lg:col-span-7 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Central Bank FX & Gold Reserve Custody Architecture (100% Sum)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pre-shock reserve share vs. post-freeze accessible liquidity ({geoSuite.activeRow.preShockImportCoverMonths.toFixed(1)}M → {geoSuite.activeRow.postFreezeImportCoverMonths.toFixed(2)}M import cover)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {geoSuite.activeCustodyBreakdown.map((bucket) => (
                  <div key={bucket.bucketId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {bucket.bucketLabel}
                      </span>
                      <span className="font-mono">
                        <span className="text-slate-500">Pre: {bucket.preShockSharePct}%</span>
                        {' → '}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Accessible: {bucket.postShockAccessibleSharePct}%
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${bucket.postShockAccessibleSharePct}%` }}
                      />
                      <div
                        className="bg-rose-500/70 h-full"
                        style={{
                          width: `${Math.max(0, bucket.preShockSharePct - bucket.postShockAccessibleSharePct)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">{bucket.custodyJurisdictionNote}</div>
                  </div>
                ))}
              </div>

              {/* 5 Maritime Chokepoints Breakdown */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-mono uppercase text-slate-500 mb-2">
                  Maritime Chokepoint Trade Routing & Blockade Drag ({run.countryName})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {geoSuite.chokepointVulnerabilityBreakdown.map((cp) => (
                    <div
                      key={cp.chokepointId}
                      className={`p-2.5 rounded border text-xs ${
                        cp.chokepointId === geoInputs.activeChokepointDisruption
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {cp.chokepointName.split('(')[0]}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                        {cp.tradeShareRoutedPct}% Trade
                      </div>
                      <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400">
                        GDP: {cp.gdpGrowthDragPct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cross-Sovereign Geo-Risk Table */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cross-Sovereign Reserve Custody Freeze & Chokepoint Vulnerability Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3 text-right">G7 Custody (%)</th>
                    <th className="py-2.5 px-3 text-right">Gold + Non-G7 Swaps (%)</th>
                    <th className="py-2.5 px-3 text-right">Sanction-Immune (%)</th>
                    <th className="py-2.5 px-3 text-right">Pre → Post Import Cover</th>
                    <th className="py-2.5 px-3 text-right">Blockade CPI (+bps)</th>
                    <th className="py-2.5 px-3 text-right">Fiscal Subsidy (% GDP)</th>
                    <th className="py-2.5 px-3">Geo-Economic Resilience Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {geoSuite.peerGeoMatrix.map((row) => (
                    <tr
                      key={row.iso3}
                      onClick={() => {
                        const found = watchlistItems.find((w) => w.iso3 === row.iso3);
                        if (found && onSelectSovereign) onSelectSovereign(found);
                      }}
                      className={`cursor-pointer ${
                        row.isCurrentActiveSovereign
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {row.countryName}
                        </span>{' '}
                        <span className="text-slate-400">({row.iso3})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.g7CustodyExposurePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {row.domesticGoldAndSwapBufferPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {row.sanctionImmuneReserveSharePct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.preShockImportCoverMonths.toFixed(1)}M →{' '}
                        <span
                          className={
                            row.postFreezeImportCoverMonths < 3.0
                              ? 'text-rose-600 font-bold'
                              : 'text-emerald-600 font-bold'
                          }
                        >
                          {row.postFreezeImportCoverMonths.toFixed(2)}M
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        +{row.blockadeCpiPassThroughBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.emergencyFiscalSubsidyCostPctGdp.toFixed(2)}% GDP
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            row.geoResilienceVerdict === 'FORTRESS_AUTARKY_BUFFER'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : row.geoResilienceVerdict === 'MODERATE_CHOKEPOINT_SENSITIVITY'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : row.geoResilienceVerdict === 'HIGH_CUSTODY_FREEZE_VULNERABILITY'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {row.geoResilienceVerdict.replace(/_/g, ' ')}
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
          9.4 NGFS CLIMATE FISCAL STRESS & SLB "GREENIUM" ANALYZER
         ===================================================================== */}
      {activeSubTab === 'ngfs_climate_slb_greenium' && (
        <div className="space-y-6">
          <div className="institutional-card p-4 bg-slate-50/80 dark:bg-slate-900/50 border-l-4 border-l-emerald-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 mr-2">
                [NGFS CLIMATE FISCAL & SLB GREENIUM ENGINE]
              </span>
              {climateSuite.headlineDiagnostic}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setClimateInputs(DEFAULT_CLIMATE_FISCAL_SLB_INPUTS)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset NGFS Parameters
              </button>
              {onApplyShockToTerminal && (
                <button
                  onClick={() =>
                    onApplyShockToTerminal({
                      label: `NGFS ${climateInputs.selectedNgfsScenario.replace(/_/g, ' ')} (+${climateSuite.activeRow.projected10YClimateDebtAdderPctGdp}% GDP Debt)`,
                      cdsDeltaBps: climateSuite.activeRow.netClimateSpreadImpactBps,
                      yield10YDeltaBps: climateSuite.activeRow.netClimateSpreadImpactBps,
                      fxDepreciationPct: Number(
                        (climateSuite.activeRow.projected10YClimateDebtAdderPctGdp * 0.22).toFixed(1)
                      ),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Propagate NGFS Climate Stress to Terminal
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* NGFS Controls */}
            <div className="lg:col-span-5 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  NGFS Scenario & Sustainability-Linked Bond (SLB) Calibrator
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure carbon transition speed, physical weather severity, and SLB KPI step-up risk
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    NGFS Reference Climate Pathway
                  </label>
                  <select
                    value={climateInputs.selectedNgfsScenario}
                    onChange={(e) =>
                      setClimateInputs((prev) => ({
                        ...prev,
                        selectedNgfsScenario: e.target.value as NgfsClimateScenarioId,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ORDERLY_NET_ZERO_2050">
                      Orderly Net Zero 2050 (Early Carbon Price, Low Physical Damage)
                    </option>
                    <option value="DELAYED_DISORDERLY_TRANSITION">
                      Delayed / Disorderly Transition (Stranded Hydrocarbon Shock)
                    </option>
                    <option value="HOT_HOUSE_WORLD_CURRENT_POLICIES">
                      Hot House World / Current Policies (Severe Physical GDP Loss)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Global Carbon Border & Transition Intensity (0–100)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {climateInputs.globalCarbonTaxTrajectoryScore} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={climateInputs.globalCarbonTaxTrajectoryScore}
                    onChange={(e) =>
                      setClimateInputs((prev) => ({
                        ...prev,
                        globalCarbonTaxTrajectoryScore: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Acute & Chronic Physical Weather Severity (0–100)
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {climateInputs.acuteWeatherShockSeverityPct} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={climateInputs.acuteWeatherShockSeverityPct}
                    onChange={(e) =>
                      setClimateInputs((prev) => ({
                        ...prev,
                        acuteWeatherShockSeverityPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      SLB Sustainability KPI Target Miss Probability (%)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {climateInputs.slbTargetMissProbabilityPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={climateInputs.slbTargetMissProbabilityPct}
                    onChange={(e) =>
                      setClimateInputs((prev) => ({
                        ...prev,
                        slbTargetMissProbabilityPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* 3-Pathway NGFS Comparison for Active Sovereign */}
            <div className="lg:col-span-7 institutional-card p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  NGFS 3-Scenario Macro-Fiscal & Sovereign Spread Comparison — {run.countryName} ({run.iso3})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Compares transition revenue loss (% GDP), physical damage (% GDP), 10Y cumulative debt adder (% GDP), and net spread impact (bps)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {climateSuite.scenarioComparisonForActive.map((sc) => {
                  const isSelected = sc.scenarioId === climateInputs.selectedNgfsScenario;
                  return (
                    <div
                      key={sc.scenarioId}
                      onClick={() =>
                        setClimateInputs((prev) => ({
                          ...prev,
                          selectedNgfsScenario: sc.scenarioId,
                        }))
                      }
                      className={`p-4 rounded border cursor-pointer transition-all space-y-2.5 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {sc.scenarioTitle}
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Transition Loss:</span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {sc.transitionFiscalCostPctGdp.toFixed(2)}% GDP/yr
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Physical Damage:</span>
                          <span className="text-rose-600 dark:text-rose-400">
                            {sc.physicalDamageCostPctGdp.toFixed(2)}% GDP/yr
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">10Y Debt Adder:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            +{sc.cumulativeDebtAdder10YPctGdp.toFixed(1)}% GDP
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Net Spread Impact:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {sc.sovereignSpreadShockBps >= 0
                              ? `+${sc.sovereignSpreadShockBps}`
                              : sc.sovereignSpreadShockBps}{' '}
                            bps
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Sovereign Greenium Discount
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {climateSuite.activeRow.sovereignGreeniumDiscountBps} bps
                  </div>
                  <div className="text-[10px] text-slate-500">Green bond pricing advantage</div>
                </div>
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    SLB Coupon Step-Up Penalty
                  </div>
                  <div className="text-base font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    +{climateSuite.activeRow.slbCouponStepUpPenaltyBps} bps
                  </div>
                  <div className="text-[10px] text-slate-500">Expected KPI miss penalty</div>
                </div>
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Climate Rating Notch Risk
                  </div>
                  <div className="text-base font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {climateSuite.activeRow.climateFiscalRatingRiskNotches} Notches
                  </div>
                  <div className="text-[10px] text-slate-500">10Y shadow rating migration</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cross-Sovereign Climate & SLB Table */}
          <div className="institutional-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cross-Sovereign NGFS Climate Fiscal Vulnerability & SLB Greenium Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3">Sovereign</th>
                    <th className="py-2.5 px-3 text-right">Hydrocarbon Rev (% Rev)</th>
                    <th className="py-2.5 px-3 text-right">Stranded Rev Loss (% Rev)</th>
                    <th className="py-2.5 px-3 text-right">Physical Damage (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">10Y Debt Adder (% GDP)</th>
                    <th className="py-2.5 px-3 text-right">Greenium (bps)</th>
                    <th className="py-2.5 px-3 text-right">SLB Step-Up (+bps)</th>
                    <th className="py-2.5 px-3 text-right">Net Spread Shock (bps)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {climateSuite.peerClimateMatrix.map((row) => (
                    <tr
                      key={row.iso3}
                      onClick={() => {
                        const found = watchlistItems.find((w) => w.iso3 === row.iso3);
                        if (found && onSelectSovereign) onSelectSovereign(found);
                      }}
                      className={`cursor-pointer ${
                        row.isCurrentActiveSovereign
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {row.countryName}
                        </span>{' '}
                        <span className="text-slate-400">({row.iso3})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {row.hydrocarbonFiscalRevenueSharePct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        -{row.strandedRevenueErosionPctRev.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        -{row.physicalClimateDamagePctGdp.toFixed(2)}% GDP
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        +{row.projected10YClimateDebtAdderPctGdp.toFixed(1)}% GDP
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {row.sovereignGreeniumDiscountBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        +{row.slbCouponStepUpPenaltyBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {row.netClimateSpreadImpactBps >= 0
                          ? `+${row.netClimateSpreadImpactBps}`
                          : row.netClimateSpreadImpactBps}{' '}
                        bps
                      </td>
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
