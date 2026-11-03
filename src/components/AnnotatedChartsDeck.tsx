import React, { useState } from 'react';
import {
  AnnotatedChartSpec,
  CouncilAssessmentRun,
  TimeframeKey,
} from '../types/council';
import { Info } from 'lucide-react';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface AnnotatedChartsDeckProps {
  run: CouncilAssessmentRun;
  onRefreshLiveOpenData: () => void;
  isFetchingData: boolean;
  onOpenForecastingLab?: () => void;
  initialInnerTab?: 'horizon_charts' | 'maturity_contagion';
}

const TIMEFRAME_LABELS: Record<TimeframeKey, string> = {
  '30D': '30D High-Freq',
  '90D': '90D Tactical',
  '1Y': '1Y Cyclical',
  '5Y': '5Y Structural',
  '10Y_WEO': '10Y + IMF Forecast',
};

const PROVENANCE_LABELS: Record<string, string> = {
  TIER_1_MULTILATERAL_API: 'Official Multilateral Series',
  TIER_2_PREDICTION_EVENT: 'Real-Money Prediction & Event Stream',
  TIER_3_SEARCH_POLICY_DOC: 'Verified Search & Policy Document',
  TIER_4_MODEL_ESTIMATE: 'Model-Implied Estimate',
};

export const AnnotatedChartsDeck: React.FC<AnnotatedChartsDeckProps> = ({
  run,
  onRefreshLiveOpenData,
  isFetchingData,
  onOpenForecastingLab,
  initialInnerTab = 'horizon_charts',
}) => {
  const [innerTab, setInnerTab] = useState<'horizon_charts' | 'maturity_contagion'>(
    initialInnerTab
  );
  const [selectedTimeframes, setSelectedTimeframes] = useState<Record<string, TimeframeKey>>({
    chart_sovereign_debt_trajectory: '10Y_WEO',
    chart_external_reserve_adequacy: '5Y',
    chart_macro_policy_real_yield: '5Y',
    chart_geopol_prediction_velocity: '30D',
  });

  const handleTimeframeChange = (chartId: string, tf: TimeframeKey) => {
    setSelectedTimeframes((prev) => ({ ...prev, [chartId]: tf }));
  };

  const rollover = run.openData.debtRollover;
  const peakBucket =
    rollover.buckets.find((b) => b.isPeakRollover) ||
    [...rollover.buckets].sort(
      (a, b) =>
        b.domesticLocalPctGdp +
        b.externalHardCurrencyPctGdp -
        (a.domesticLocalPctGdp + a.externalHardCurrencyPctGdp)
    )[0];
  const peakTotalPctGdp = peakBucket
    ? peakBucket.domesticLocalPctGdp + peakBucket.externalHardCurrencyPctGdp
    : 4.8;

  return (
    <div className="space-y-4">
      {/* Top Open-Data Provenance & Telemetry Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-y-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Live Institutional Telemetry
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Target: {run.countryName} ({run.iso3})</span>
              {run.openData.liveCreditRating && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    Rating: {run.openData.liveCreditRating}
                  </span>
                </>
              )}
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Spot {run.openData.currencyCode}/USD: {run.openData.monetaryAndMarket.exchangeRatePerUsd} ({run.openData.monetaryAndMarket.fxYtdChangePct >= 0 ? '+' : ''}{run.openData.monetaryAndMarket.fxYtdChangePct}% YTD)
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Updated {new Date(run.openData.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Sovereign, Macroeconomic &amp; Geopolitical Horizon Charts (With Plain-English Guides)
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onOpenForecastingLab && (
              <button
                type="button"
                onClick={onOpenForecastingLab}
                className="px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
              >
                Open Econometric Forecasting Lab →
              </button>
            )}
            <button
              type="button"
              onClick={onRefreshLiveOpenData}
              disabled={isFetchingData}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {isFetchingData ? 'Syncing IMF / WB / FX / Grounding...' : 'Refresh Live Data Feeds'}
            </button>
          </div>
        </div>

        {/* Active Live Feed Provenance Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Active Institutional Feeds ({run.openData.liveApiSourcesActive.length}):
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {run.openData.liveApiSourcesActive.join(' · ')}
            </span>
          </div>
          {run.openData.groundingCitations && run.openData.groundingCitations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Grounding Sources:</span>
              {run.openData.groundingCitations.slice(0, 3).map((cit, i) => (
                <a
                  key={i}
                  href={cit.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[180px]"
                  title={cit.title}
                >
                  [{i + 1}] {cit.title}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 6-Metric Quantitative Snapshot Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Gross Debt / GDP (IMF)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.imfIndicators.debtToGdpPct.toFixed(1)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              2027F: {run.openData.imfIndicators.debtToGdpForecast2027Pct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">FX Reserves (World Bank)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} mos
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Greenspan-Guidotti: {rollover.greenspanGuidottiRatioPct}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">CB Policy / Real Rate</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.monetaryAndMarket.policyRatePct.toFixed(2)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              Real: {run.openData.monetaryAndMarket.realPolicyRatePct >= 0 ? '+' : ''}{run.openData.monetaryAndMarket.realPolicyRatePct.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Headline CPI YoY</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.imfIndicators.cpiInflationPct.toFixed(2)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Real GDP: {run.openData.imfIndicators.realGdpGrowthPct >= 0 ? '+' : ''}{run.openData.imfIndicators.realGdpGrowthPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">10Y Local Yield / 5Y CDS</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-amber-600 dark:text-amber-400">
              5Y CDS: {run.openData.monetaryAndMarket.cds5YSpreadBps} bps
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">GDELT / Polymarket Stress</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {run.openData.gdeltMetrics.conflictIntensityIndex}/100
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Odds: {run.openData.polymarketContracts[0]?.probabilityPct ?? 65}%
            </div>
          </div>
        </div>

        {/* Inner Card Tab Bar to Cap Vertical Scroll at 1-1.5 Screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInnerTab('horizon_charts')}
              className={`px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                innerTab === 'horizon_charts'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              1. 2×2 Sovereign &amp; Macro Horizon Charts (GDP, Debt, Yield, Reserves)
            </button>
            <button
              type="button"
              onClick={() => setInnerTab('maturity_contagion')}
              className={`px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                innerTab === 'maturity_contagion'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              2. Debt Maturity Wall (Q1 2025–Q4 2026) &amp; Cross-Desk Contagion
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            1–2 Page Scroll Budget Active · Switch inner tab to inspect rollover cliff
          </span>
        </div>
      </div>

      {/* INNER TAB 1: 2x2 Grid of Conclusion-First Multi-Timeframe Institutional Charts */}
      {innerTab === 'horizon_charts' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {run.charts.map((chart) => {
            const activeTf: TimeframeKey = selectedTimeframes[chart.chartId] || '10Y_WEO';
            const points = chart.seriesByTimeframe[activeTf] || chart.seriesByTimeframe['5Y'] || [];

            return (
              <ChartCard
                key={chart.chartId}
                chart={chart}
                activeTf={activeTf}
                points={points}
                onSelectTimeframe={(tf) => handleTimeframeChange(chart.chartId, tf)}
              />
            );
          })}
        </div>
      )}

      {/* INNER TAB 2: EMBEDDED SOVEREIGN DEBT MATURITY WALL & CROSS-DESK CONTAGION */}
      {innerTab === 'maturity_contagion' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Sovereign Debt Maturity Wall &amp; Rollover Cliff Audit
                  </span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>8-Quarter Forward Amortization Schedule (Q1 2025 – Q4 2026)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 text-balance">
                  <RichTextWithStatRefs
                    text={`${run.countryName}'s biggest debt repayment bill hits in ${peakBucket?.periodLabel || 'Q3 2025'} (${peakTotalPctGdp.toFixed(1)}% of GDP; $${(peakBucket?.totalUsdBn ?? 0).toFixed(1)}B), while central bank US dollar savings cover ${rollover.greenspanGuidottiRatioPct}% of foreign debt due in the next year (Ref: Peak Rollover = ${peakTotalPctGdp.toFixed(1)}% GDP · GG Cover = ${rollover.greenspanGuidottiRatioPct}%)`}
                  />
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Greenspan-Guidotti Ratio</span>
                  <span
                    className={`font-bold text-sm ${
                      rollover.greenspanGuidottiRatioPct < 100
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {rollover.greenspanGuidottiRatioPct}% (100% Floor)
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Liquid FX Reserves vs 12M Ext Debt</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    ${rollover.liquidFxReservesUsdBn}B vs ${rollover.shortTermExternalDebtUsdBn}B
                  </span>
                </div>
              </div>
            </div>

            {/* Stacked Quarterly Maturity Wall Bar Chart + 3 Concise Bullets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8" data-chart-card="true">
                <div className="grid grid-cols-8 gap-2.5 pt-2 items-end h-48 border-b border-slate-200 dark:border-slate-800 pb-2 px-2 relative">
                  {/* 4.5% GDP Quarterly Rollover Stress Line */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-red-500/70 pointer-events-none flex justify-end pr-2"
                    style={{ bottom: '68%' }}
                  >
                    <span className="text-[10px] font-mono text-red-600 dark:text-red-400 bg-white/90 dark:bg-slate-900/90 px-1 -mt-2.5">
                      4.5% GDP Quarterly Rollover Cliff Threshold
                    </span>
                  </div>

                  {rollover.buckets.map((b) => {
                    const totalPctGdp = b.domesticLocalPctGdp + b.externalHardCurrencyPctGdp;
                    const heightPct = Math.min(100, Math.max(18, (totalPctGdp / 6.5) * 100));
                    const extSharePct = totalPctGdp > 0 ? (b.externalHardCurrencyPctGdp / totalPctGdp) * 100 : 30;
                    const domSharePct = 100 - extSharePct;

                    return (
                      <div key={b.periodLabel} className="flex flex-col items-center h-full justify-end group">
                        <div className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 mb-1">
                          {totalPctGdp.toFixed(1)}%
                        </div>
                        <div
                          className={`w-full flex flex-col overflow-hidden border ${
                            b.isPeakRollover
                              ? 'border-amber-500 ring-1 ring-amber-500/40'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${b.periodLabel}: Total $${b.totalUsdBn}B (${totalPctGdp.toFixed(1)}% GDP | Avg Coupon ${b.avgCouponPct}%)`}
                        >
                          <div
                            style={{ height: `${extSharePct}%` }}
                            className="bg-amber-500 dark:bg-amber-500/90 w-full"
                          />
                          <div
                            style={{ height: `${domSharePct}%` }}
                            className="bg-blue-600 dark:bg-blue-500 w-full"
                          />
                        </div>
                        <div
                          className={`text-[11px] font-mono mt-1.5 ${
                            b.isPeakRollover
                              ? 'font-bold text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {b.periodLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                      <span>Domestic Local-Currency Redemptions (% GDP)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-amber-500 inline-block" />
                      <span>External Hard-Currency (USD/EUR) Maturities (% GDP)</span>
                    </span>
                  </div>
                  <span className="font-mono">
                    WAM: {rollover.weightedAvgMaturityYears} yrs · Floating-Rate Share: {rollover.floatingRateDebtSharePct}%
                  </span>
                </div>
              </div>

              {/* Structured 3-Pillar Explainer for Debt Maturity Wall */}
              <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  Plain-English Guide — Upcoming Debt Payments
                </div>
                <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                      1. What This Shows in Plain English
                    </span>
                    How much government debt comes due each quarter over the next two years, split between local-currency bonds (blue) and foreign US dollar/euro bonds (amber).
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                      2. Why It Matters
                    </span>
                    Cash crunches happen when a big wave of US dollar debt comes due at a time when global investors refuse to lend, forcing the central bank to drain its dollar savings.
                  </div>
                  <div>
                    <span className="font-bold text-red-600 dark:text-red-400 block text-[11px] uppercase tracking-wider">
                      3. Warning Sign &amp; Action
                    </span>
                    If quarterly debt payments top <span className="font-mono font-semibold">4.5% of GDP</span> or reserve coverage drops below <span className="font-mono font-semibold">100%</span>, buy 5-year default protection (CDS) ahead of {peakBucket?.periodLabel || 'Q3 2025'}.
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <StatRefBadge
                      refText={`Ref: Greenspan-Guidotti = ${rollover.greenspanGuidottiRatioPct}% (100% Floor) · WAM = ${rollover.weightedAvgMaturityYears}Y · Floating Share = ${rollover.floatingRateDebtSharePct}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cross-Desk Contagion & Chief Risk Officer Adjustment Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>Cross-Desk Risk Transmission</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Active Assessment Horizon (Initial Desk Consensus vs. Cascade Shock vs. CRO Gate)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Cross-Desk Contagion &amp; Chief Risk Officer Adjustment ({run.countryName})
                </h3>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Composite Risk: {(run.supremeCouncil?.compositeRiskScore ?? 0.62).toFixed(2)} / 1.00
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
              {/* Visual Horizontal Bar Comparison */}
              <div className="lg:col-span-7 space-y-4">
                {(['geopolitical', 'macro', 'sovereign'] as const).map((deskKey) => {
                  const debate = run.deskDebates[deskKey];
                  const pre = debate.preCascadeRiskScore;
                  const post = debate.postCascadeRiskScore;
                  const cro =
                    deskKey === 'geopolitical'
                      ? run.croState.geopoliticalRiskScore
                      : deskKey === 'sovereign'
                      ? run.croState.sovereignRiskScore
                      : run.croState.macroRiskScore;

                  return (
                    <div key={deskKey} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {debate.deskName}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          Initial: {pre.toFixed(2)} → Post-Cascade: {post.toFixed(2)} → CRO Gate: {cro.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-slate-400 dark:bg-slate-500"
                              style={{ width: `${Math.min(100, Math.round(pre * 100))}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                            Initial Desk ({Math.round(pre * 100)}%)
                          </div>
                        </div>
                        <div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${Math.min(100, Math.round(post * 100))}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                            Cascade Shock ({Math.round(post * 100)}%)
                          </div>
                        </div>
                        <div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${Math.min(100, Math.round(cro * 100))}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                            CRO Final ({Math.round(cro * 100)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Structured 3-Pillar Explainer for Cross-Desk Contagion */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  Plain-English Guide — How Risks Domino Across Desks
                </div>
                <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                      1. What This Shows in Plain English
                    </span>
                    Shows how each specialist team&apos;s initial risk score (gray) jumps higher once shipping, inflation, and interest-rate shocks spill over from one desk to the next (amber and blue).
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                      2. Why It Matters
                    </span>
                    A +{run.croState.energyInflationShockPct}% shipping and fuel cost jump forces the Central Bank to keep interest rates high, which then adds +{run.croState.debtServicingSpreadBps} bps to the government&apos;s borrowing costs.
                  </div>
                  <div>
                    <span className="font-bold text-red-600 dark:text-red-400 block text-[11px] uppercase tracking-wider">
                      3. Warning Sign &amp; Action
                    </span>
                    Whenever a desk&apos;s risk score reaches <span className="font-mono font-semibold">0.70</span> (70%) or higher after spillover effects, the portfolio automatically adds defensive hedges and cuts long-term bond exposure.
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <StatRefBadge
                      refText={`Ref: Geo→Macro Freight Impulse = +${run.croState.energyInflationShockPct}% · Macro→Sov Spread Delta = +${run.croState.debtServicingSpreadBps} bps · CRO Gate Threshold = 0.70`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ChartCardProps {
  chart: AnnotatedChartSpec;
  activeTf: TimeframeKey;
  points: AnnotatedChartSpec['seriesByTimeframe']['1Y'];
  onSelectTimeframe: (tf: TimeframeKey) => void;
}

const ChartCard: React.FC<ChartCardProps> = ({
  chart,
  activeTf,
  points,
  onSelectTimeframe,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const primaryVals = points.map((p) => p.primaryValue);
  const allPrimaryAndThreshold = [...primaryVals, chart.thresholdValue];
  const minPrimary = Math.min(...allPrimaryAndThreshold) * 0.9;
  const maxPrimary = Math.max(...allPrimaryAndThreshold) * 1.08 || 100;
  const rangePrimary = Math.max(1, maxPrimary - minPrimary);

  const svgWidth = 540;
  const svgHeight = 190;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 28;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (i: number) =>
    points.length <= 1 ? padLeft + plotW / 2 : padLeft + (i / (points.length - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - ((val - minPrimary) / rangePrimary) * plotH;

  const thresholdY = Math.max(padTop, Math.min(padTop + plotH, getY(chart.thresholdValue)));

  const polylinePoints = points.map((p, i) => `${getX(i)},${getY(p.primaryValue)}`).join(' ');

  const latestPoint = points[hoverIdx !== null ? hoverIdx : points.length - 1] || points[0];
  const isBreachingThreshold =
    chart.chartId === 'chart_external_reserve_adequacy'
      ? (latestPoint?.primaryValue ?? 0) <= chart.thresholdValue
      : (latestPoint?.primaryValue ?? 0) >= chart.thresholdValue;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
      {/* Header: Category Kicker -> Timeframe Buttons -> Conclusion Headline First */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {chart.categoryKicker}
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{PROVENANCE_LABELS[chart.provenanceTier]}</span>
          </div>
          {/* Timeframe Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5">
            {(['30D', '90D', '1Y', '5Y', '10Y_WEO'] as TimeframeKey[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2 py-1 text-[11px] font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTf === tf
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tf === '10Y_WEO' ? '10Y+WEO' : tf}
              </button>
            ))}
          </div>
        </div>

        {/* Bold Conclusion Takeaway Headline First */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 leading-snug text-balance">
          <RichTextWithStatRefs text={chart.conclusionHeadline} />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {chart.title} · Horizon: <strong className="text-slate-700 dark:text-slate-200">{TIMEFRAME_LABELS[activeTf]}</strong>
        </p>

        {/* Active Point Telemetry Readout */}
        {latestPoint && (
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{chart.primarySeriesLabel}</span>
              <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-slate-100">
                {latestPoint.primaryValue} {chart.primaryUnit}
                {latestPoint.isForecast ? ' (IMF Proj)' : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{chart.secondarySeriesLabel}</span>
              <span className="font-mono font-bold text-sm tabular-nums text-blue-600 dark:text-blue-400">
                {latestPoint.secondaryValue > 0 && chart.secondaryUnit.includes('GDP')
                  ? `+${latestPoint.secondaryValue}`
                  : latestPoint.secondaryValue}{' '}
                {chart.secondaryUnit}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Regime Status</span>
              <span
                className={`font-mono font-semibold text-xs tabular-nums ${
                  isBreachingThreshold
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isBreachingThreshold ? 'Threshold Breached' : 'Within Corridor'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive SVG Plot */}
      <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/40 relative" data-chart-card="true">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 overflow-visible select-none"
          role="img"
          aria-label={chart.title}
        >
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const yPos = padTop + ratio * plotH;
            const val = maxPrimary - ratio * rangePrimary;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={svgWidth - padRight}
                  y2={yPos}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Regime Break Threshold Reference Line */}
          <line
            x1={padLeft}
            y1={thresholdY}
            x2={svgWidth - padRight}
            y2={thresholdY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={svgWidth - padRight - 4}
            y={Math.max(12, thresholdY - 5)}
            textAnchor="end"
            className="text-[9.5px] font-mono font-semibold fill-red-600 dark:fill-red-400"
          >
            {chart.thresholdLabel} ({chart.thresholdValue})
          </text>

          {/* Secondary Series Bars at bottom of plot */}
          {points.map((pt, i) => {
            const x = getX(i);
            const barH = Math.min(36, Math.max(4, Math.abs(pt.secondaryValue) * 1.4));
            return (
              <rect
                key={`sec-${i}`}
                x={x - 10}
                y={padTop + plotH - barH}
                width={20}
                height={barH}
                className={
                  pt.isForecast
                    ? 'fill-blue-400/25 dark:fill-blue-500/20'
                    : 'fill-blue-500/20 dark:fill-blue-400/20'
                }
              />
            );
          })}

          {/* Primary Series Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            points={polylinePoints}
          />

          {/* Interactive Data Nodes & X-Axis Labels */}
          {points.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.primaryValue);
            const isHovered = hoverIdx === i;
            return (
              <g
                key={pt.period}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 4}
                  className={
                    pt.isForecast
                      ? 'fill-amber-500 stroke-white dark:stroke-slate-900'
                      : 'fill-blue-600 stroke-white dark:stroke-slate-900'
                  }
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono font-semibold fill-slate-700 dark:fill-slate-200"
                >
                  {pt.primaryValue}
                </text>
                <text
                  x={cx}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-slate-500 dark:fill-slate-400"
                >
                  {pt.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Structured 3-Pillar Plain-English Explainer Below Every Chart */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/90 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10.5px] mb-1">
              1. What This Shows in Plain English ({TIMEFRAME_LABELS[activeTf]})
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {chart.explainer.whatItMeasures}
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10.5px] mb-1">
              2. Why It Matters
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {chart.explainer.whyItMattersInstitutionally}
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wider text-[10.5px] mb-1">
              3. Warning Threshold ({chart.thresholdValue} {chart.primaryUnit})
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {chart.explainer.regimeBreakThresholdExplanation}
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
          <span>
            <RichTextWithStatRefs text={chart.explainer.crossDeskCascadeLink} />
          </span>
          <StatRefBadge
            refText={`Statistical Ref: ${chart.primarySeriesLabel} = ${latestPoint?.primaryValue} ${chart.primaryUnit} | Threshold = ${chart.thresholdValue} ${chart.primaryUnit} · Source: ${chart.dataSourceCitation}`}
          />
        </div>
      </div>
    </div>
  );
};
