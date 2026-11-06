import React, { useState, useEffect } from 'react';
import { toDisplayCase } from '../utils/displayCase';
import { CouncilAssessmentRun } from '../types/council';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { EconQuestLogo } from './EconQuestLogo';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';
import { coherenceText } from '../utils/councilResult';

interface ExecutiveBriefScorecardProps {
  run: CouncilAssessmentRun;
  isCompactByDefault?: boolean;
  onSelectSection: (
    sec:
      | 'charts_watchlists'
      | 'forecasting_lab'
      | 'geopolitical_desk'
      | 'supply_chain_matrix'
      | 'global_liquidity'
      | 'market_maker_alpha'
      | 'portfolio_risk_desk'
      | 'backtest_engine'
      | 'risk_analytics'
      | 'council_debates'
      | 'cro_reports'
      | 'policy_doc_lab'
      | 'institutional_quant_desk'
  ) => void;
}

export const ExecutiveBriefScorecard: React.FC<ExecutiveBriefScorecardProps> = ({
  run,
  isCompactByDefault = false,
  onSelectSection,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isCompactByDefault);

  useEffect(() => {
    setIsCollapsed(isCompactByDefault);
  }, [isCompactByDefault]);
  const sc = run.supremeCouncil;
  const open = run.openData;
  const compositeScore = sc?.compositeRiskScore ?? 0.60;
  const nextCatalyst = open.catalystCalendar[0];
  const topTrigger = sc?.decisionPointMatrix[0];

  const verdictLabel =
    sc?.decisionVerdict === 'EXECUTE_TRADES'
      ? 'Actionable Conviction Trade'
      : sc?.decisionVerdict === 'DEFENSIVE_HEDGE'
      ? 'Defensive Curve & Tail Hedge'
      : 'Hold & Monitor Thresholds';

  if (isCollapsed) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
            <EconQuestLogo size={14} className="inline-block" />
            <span>
              {run.countryName} ({run.iso3} · {open.currencyCode})
            </span>
          </span>
          <span
            className={`px-2 py-0.5 text-xs tabular-nums font-semibold border ${
              compositeScore >= 0.65
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                : compositeScore >= 0.48
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}
          >
            {verdictLabel} · Risk {(compositeScore * 100).toFixed(0)}/100
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
          <div className="flex flex-wrap items-center gap-3 tabular-nums text-xs text-slate-600 dark:text-slate-300">
            <span>
              Debt: <strong>{open.imfIndicators.debtToGdpPct.toFixed(1)}% GDP</strong>
            </span>
            <span>
              5Y CDS: <strong className="text-blue-600 dark:text-blue-400">{open.monetaryAndMarket.cds5YSpreadBps} bps</strong>
            </span>
            <span>
              10Y Yield: <strong>{open.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%</strong>
            </span>
            <span>
              Reserves: <strong>{open.worldBankIndicators.fxReservesMonthsImport.toFixed(1)}m</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shrink-0"
        >
          <span>Expand Executive Brief</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
      {/* Top Row: Country Header, Plain-English Verdict Headline & Quick Drill-Down Links */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5 max-w-4xl">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
            <EconQuestLogo size={16} className="inline-block" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Sovereign Council Orchestrator of EconQuest
            </span>
            <span aria-hidden="true">·</span>
            <span>Executive Risk Briefing (Bottom Line Up Front)</span>
            <span aria-hidden="true">·</span>
            <span>{run.countryName} ({run.iso3} · {open.currencyCode})</span>
            <span aria-hidden="true">·</span>
            <span>Council Coherence: {coherenceText(sc)}</span>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <span>Collapse to 1-Line Ribbon</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white text-balance">
            {run.countryName}: {toDisplayCase(sc?.marketTranslationLayer.regimeStance) || 'Defensive curve steepening & tail-hedged carry'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <RichTextWithStatRefs text={sc?.executiveSummary || ''} />
          </p>
        </div>

        {/* Verdict & Composite Score Box */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 shrink-0 xl:w-72 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Council Verdict</span>
            <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
              Risk {(compositeScore * 100).toFixed(0)} / 100
            </span>
          </div>
          <div
            className={`text-sm font-semibold mt-1 ${
              compositeScore >= 0.65
                ? 'text-rose-600 dark:text-rose-400'
                : compositeScore >= 0.48
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {verdictLabel}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs tabular-nums">
            <div>
              <span className="text-slate-400 block">Geopol</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(run.croState.geopoliticalRiskScore * 100).toFixed(0)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Sovereign</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(run.croState.sovereignRiskScore * 100).toFixed(0)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Macro</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(run.croState.macroRiskScore * 100).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Executive Synthesis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Fiscal Sustainability & (r - g) Math */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              1. Government Debt &amp; Budget Gap
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Debt is {open.imfIndicators.debtToGdpPct.toFixed(1)}% of the economy; budget needs{' '}
              <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                {open.dsaAnalytics.fiscalConsolidationGapPct > 0 ? '+' : ''}
                {open.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}% GDP
              </span>{' '}
              in savings
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Because interest rates exceed economic growth, stopping debt from snowballing requires a{' '}
              <strong className="tabular-nums">+{open.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(2)}%</strong>{' '}
              budget surplus (now <strong className="tabular-nums">{open.imfIndicators.primaryFiscalBalancePct.toFixed(1)}%</strong>).
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
              <StatRefBadge
                refText={`Ref: r − g = ${open.dsaAnalytics.rMinusGDifferentialPct >= 0 ? '+' : ''}${open.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}% · pb* = +${open.dsaAnalytics.debtStabilizingPrimaryBalancePct.toFixed(2)}% GDP`}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSection('forecasting_lab')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Monte Carlo Fan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('portfolio_risk_desk')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline w-fit"
            >
              <span>Portfolio VaR &amp; Haircut</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: External Buffer vs Domestic Rollover */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              2. US Dollar Savings vs. Local Debt Risk
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Dollar reserves cover {open.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of imports ({' '}
              <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {open.debtRollover.greenspanGuidottiRatioPct}%
              </span>{' '}
              of 1Y foreign debt)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Plenty of US dollars to pay foreign bondholders, but{' '}
              <strong className="tabular-nums">{open.debtRollover.floatingRateDebtSharePct}%</strong> of local debt has floating rates that jump when the central bank hikes.
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
              <StatRefBadge
                refText={`Ref: Greenspan-Guidotti = ${open.debtRollover.greenspanGuidottiRatioPct}% (100% Floor) · Floating = ${open.debtRollover.floatingRateDebtSharePct}%`}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSection('charts_watchlists')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Reserve &amp; Rate Charts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('global_liquidity')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Global Liquidity &amp; XCCY Basis</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Primary Decision Trigger & Backtest Audit */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              3. Key Warning Trigger &amp; Defensive Action
            </div>
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">
              Watch if: {topTrigger?.bearBreakTrigger || 'Debt > 88.5% GDP or Primary < -1.2%'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              <strong>Plain-English Action:</strong>{' '}
              {topTrigger?.requiredActionIfTriggered || 'Hedge long-term local bonds and buy 5-year default insurance (CDS)'}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
              <StatRefBadge
                refText={`Ref: Primary Gap = ${topTrigger?.currentValue || `${open.imfIndicators.debtToGdpPct.toFixed(1)}% GDP`} · Urgency = ${topTrigger?.urgency || 'IMMEDIATE'}`}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSection('backtest_engine')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Backtest &amp; Desk Hit-Rate</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('cro_reports')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline w-fit"
            >
              <span>CRO Gate</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Next Institutional Risk Catalyst & Geopolitical Wargaming */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              4. Next Market-Moving Event ({nextCatalyst?.dateLabel || 'none on file'})
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
              {nextCatalyst?.title || 'No official scheduled event on file'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              {nextCatalyst ? `Now: ${nextCatalyst.consensusExpectation}` : ''}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
              <StatRefBadge
                refText={`Ref: Policy = ${open.monetaryAndMarket.policyRatePct}% · CPI = ${open.imfIndicators.cpiInflationPct}% · Implied Vol Move = ${nextCatalyst?.impliedVolatilityImpact || 'not estimated'}`}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSection('geopolitical_desk')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Geopolitical Wargame</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('supply_chain_matrix')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <span>Supply Chain Matrix</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
