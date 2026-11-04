import React, { useMemo, useState } from 'react';
import {
  AIRuntimeConfig,
  CouncilAssessmentRun,
  DeskId,
  SubAgentId,
  SubAgentReport,
} from '../types/council';
import {
  ShieldAlert,
  ExternalLink,
  History,
  Code2,
  ArrowRight,
  Cpu,
  Play,
} from 'lucide-react';
import { CouncilPipelineReliabilityPanel } from './CouncilPipelineReliabilityPanel';
import { computeFullEconometricForecastSuite } from '../utils/econometricForecastingEngine';
import { computeGeopoliticalRiskDeskSuite } from '../utils/geopoliticalRiskEngine';
import {
  computeCrossCurrencyAndLegalBasis,
  simulateSovereignRestructuringAndRating,
} from '../utils/institutionalRiskDeskEngine';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';

interface CouncilHierarchyAndDebatesProps {
  run: CouncilAssessmentRun;
  onJumpToCROGate: () => void;
  onOpenGeopoliticalDesk?: () => void;
  isRunningPhase1And2?: boolean;
  onReverifyPipeline?: () => void;
  runtimeConfig?: AIRuntimeConfig;
  onUpdateRuntimeConfig?: (next: AIRuntimeConfig) => void;
  onOpenRuntimeModal?: () => void;
}

export const CouncilHierarchyAndDebates: React.FC<CouncilHierarchyAndDebatesProps> = ({
  run,
  onJumpToCROGate,
  onOpenGeopoliticalDesk,
  isRunningPhase1And2 = false,
  onReverifyPipeline,
  runtimeConfig,
  onUpdateRuntimeConfig,
  onOpenRuntimeModal,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<SubAgentId>('ag4_fiscal_auditor');
  const [selectedDeskTab, setSelectedDeskTab] = useState<DeskId | 'all'>('all');

  const activeAgent: SubAgentReport =
    run.subAgents.find((a) => a.agentId === selectedAgentId) || run.subAgents[0];

  // Closed-Loop Quantitative Desk Models wired into each of the 9 Specialist Agents
  const closedLoopQuantModels = useMemo(() => {
    const geo = computeGeopoliticalRiskDeskSuite(run.openData);
    const econ = computeFullEconometricForecastSuite(
      run.openData,
      geo.portfolioTransmission.propagatedForecastShocks
    );
    const restruct = simulateSovereignRestructuringAndRating(run.openData);
    const xccy = computeCrossCurrencyAndLegalBasis(run.openData);
    return { geo, econ, restruct, xccy };
  }, [run.openData]);

  const activeAgentClosedLoopMetrics = useMemo(() => {
    const { geo, econ, restruct, xccy } = closedLoopQuantModels;
    const map: Record<
      SubAgentId,
      {
        engineName: string;
        formulaTag: string;
        plainEnglishSummary: string;
        items: { label: string; value: string; note: string }[];
      }
    > = {
      ag1_intel_scraper: {
        engineName: 'Caldara-Iacoviello GPR & GDELT Escalation Engine',
        formulaTag: 'Ref: GPR Z-Score & Event Velocity',
        plainEnglishSummary:
          'Measures whether global news tension is abnormally high compared to history and how fast conflict headlines are building up.',
        items: [
          {
            label: 'Composite GPR Z-Score',
            value: `${geo.gprAndEscalation.compositeGprZScore >= 0 ? '+' : ''}${geo.gprAndEscalation.compositeGprZScore}σ`,
            note: geo.gprAndEscalation.escalationTree[0]?.stageTitle || 'Elevated GPR Regime',
          },
          {
            label: 'GDELT Event Tone / Conflict',
            value: `${run.openData.gdeltMetrics.conflictIntensityIndex}/100`,
            note: `Tone ${run.openData.gdeltMetrics.averageTone}`,
          },
        ],
      },
      ag2_transmission_mapper: {
        engineName: 'Maritime Chokepoint & Tariff Pass-Through Engine',
        formulaTag: 'Ref: Freight → CPI → 5Y CDS Impulse',
        plainEnglishSummary:
          'Calculates how much shipping detours and tariffs raise local inflation, interest rates, and currency pressure.',
        items: [
          {
            label: 'Propagated Real Rate Shock',
            value: `+${geo.portfolioTransmission.propagatedForecastShocks.realRateShockBps} bps`,
            note: 'Chokepoint + Tariff CPI impulse',
          },
          {
            label: 'Propagated FX Pressure',
            value: `+${geo.portfolioTransmission.propagatedForecastShocks.fxDepreciationShockPct}%`,
            note: `Vol Multiplier ${geo.portfolioTransmission.propagatedForecastShocks.externalVolatilityMultiplier}x`,
          },
        ],
      },
      ag3_sanctions_legal: {
        engineName: 'Sanctions Reserve Freeze & NY-Law Indenture Engine',
        formulaTag: 'Ref: OFAC / SWIFT & Governing Law Basis',
        plainEnglishSummary:
          'Checks what share of central bank reserves could be frozen by Western sanctions and the extra safety of New York-law bonds.',
        items: [
          {
            label: 'G7 Freeze-Exposed Reserve Share',
            value: `${geo.sanctionsAndReserves.g7FreezeExposedSharePct}%`,
            note: geo.sanctionsAndReserves.clearingChannelAssessment,
          },
          {
            label: 'NY-Law vs Local-Law Spread',
            value: `+${xccy.legalAndLiquidity.jurisdictionalLegalSpreadBps} bps`,
            note: 'External indenture protection premium',
          },
        ],
      },
      ag4_fiscal_auditor: {
        engineName: 'IMF SRDSF Gross Financing Needs & Sovereign-Bank Doom Loop',
        formulaTag: 'Ref: GFN % GDP + 1,000-Path DSA + Bank CET1',
        plainEnglishSummary:
          'Tracks the government’s total yearly borrowing bill and how much local bank capital is eroded when banks are forced to buy those bonds.',
        items: [
          {
            label: 'IMF SRDSF Annual GFN',
            value: `${econ.imfSrdsfGfn.totalGfnPctGdp}% GDP`,
            note: `vs ${econ.imfSrdsfGfn.imfEmDistressThresholdPctGdp}% IMF Threshold (${econ.imfSrdsfGfn.srdsfRiskZone})`,
          },
          {
            label: 'Doom-Loop Bank CET1 Hit',
            value: `-${econ.imfSrdsfGfn.sovereignBankDoomLoopCet1DepletionBps} bps`,
            note: `Post-stress CET1: ${econ.imfSrdsfGfn.postStressBankCet1RatioPct}%`,
          },
        ],
      },
      ag5_external_balance: {
        engineName: 'IMF ARA Reserve Burn Clock & 5Y XCCY Swap Basis Engine',
        formulaTag: 'Ref: FXI Drain Velocity & CIP Deviation',
        plainEnglishSummary:
          'Counts how many months the central bank can spend US dollars defending the currency before hitting the IMF minimum safety floor.',
        items: [
          {
            label: 'FXI Burn to 100% ARA Floor',
            value: `${econ.fiscalDominanceAndFxBurn.monthsToAraBreach} Months`,
            note: `-$${econ.fiscalDominanceAndFxBurn.monthlyFxiBurnRateUsdBn}B/mo FXI drain`,
          },
          {
            label: '5Y XCCY Basis & Pick-Up',
            value: `${xccy.fiveYearXccyBasisBps} bps`,
            note: `${xccy.fiveYearNetHedgedPickUpBps >= 0 ? '+' : ''}${xccy.fiveYearNetHedgedPickUpBps} bps vs USD Eurobond`,
          },
        ],
      },
      ag6_political_will: {
        engineName: 'ICMA CAC Holdout Game Theory & Restructuring NPV Simulator',
        formulaTag: 'Ref: Single-Limb 75% vs Dual-Limb Blocking Cost',
        plainEnglishSummary:
          'Estimates whether bondholders would accept a voluntary debt restructuring deal or if holdout funds have a financial incentive to sue.',
        items: [
          {
            label: 'ICMA Single-Limb 75% CAC Share',
            value: `${restruct.cacGameTheory.icmaSingleLimb75SharePct}% Stock`,
            note: `Holdout Litigation Odds: ${restruct.cacGameTheory.holdoutLitigationProbPct}%`,
          },
          {
            label: 'Nash Cooperative NPV vs Holdout',
            value: `${restruct.cacGameTheory.nashEquilibriumPayoffCents.toFixed(1)}¢ vs ${restruct.cacGameTheory.holdoutExpectedNetPayoffCents.toFixed(1)}¢`,
            note: `Single-series block: $${restruct.cacGameTheory.singleSeriesBlockingCostUsdMillions}M`,
          },
        ],
      },
      ag7_hf_nowcaster: {
        engineName: 'Adrian-Boyarchenko-Giannone Growth & Fiscal-at-Risk (GaR/FaR)',
        formulaTag: 'Ref: 5th-Pct Left-Tail GDP & 95th-Pct Deficit FaR',
        plainEnglishSummary:
          'Models how bad a recession and budget deficit could get in a worst-5% economic downturn over the next 12 months.',
        items: [
          {
            label: '5th-Percentile GaR (Left Tail)',
            value: `${econ.garFarTail.gdpGar5thPercentilePct}% GDP`,
            note: `Recession Prob: ${econ.garFarTail.recessionProbabilityPct}%`,
          },
          {
            label: '95th-Percentile Fiscal FaR',
            value: `${econ.garFarTail.fiscalFar95thDeficitPctGdp}% GDP`,
            note: `Mean Balance: ${econ.garFarTail.fiscalMeanBalancePctGdp}% GDP`,
          },
        ],
      },
      ag8_cb_watcher: {
        engineName: 'Blanchard-Leeper Fiscal Dominance Frontier & NSS Term Structure',
        formulaTag: 'Ref: Reversal Rate r* & 10Y Term Premium',
        plainEnglishSummary:
          'Finds the tipping point where central bank interest rate hikes backfire by inflating the government’s debt bill faster than they cool inflation.',
        items: [
          {
            label: 'Blanchard-Leeper Threshold r*',
            value: `${econ.fiscalDominanceAndFxBurn.blanchardLeeperThresholdRatePct}%`,
            note: `${econ.fiscalDominanceAndFxBurn.policyRateHeadroomBps >= 0 ? '+' : ''}${econ.fiscalDominanceAndFxBurn.policyRateHeadroomBps} bps headroom (+${econ.fiscalDominanceAndFxBurn.annualFiscalCostPer100BpsPctGdp}% GDP/100bp)`,
          },
          {
            label: 'Nelson-Siegel 10Y Term Premium',
            value: `+${econ.nssTermStructure.tenYearTermPremiumBps} bps`,
            note: `1Y Implied Policy Δ: ${econ.nssTermStructure.implied1YPolicyRateDeltaBps} bps`,
          },
        ],
      },
      ag9_global_spillover: {
        engineName: 'Kaminsky-Reinhart Crisis EWS & BVAR Spillover Matrix',
        formulaTag: 'Ref: 3-State Markov Regime Switching & Z-Score',
        plainEnglishSummary:
          'Combines five early-warning indicators to measure the probability of a sudden-stop funding crisis over the next year.',
        items: [
          {
            label: 'Composite Crisis EWS Z-Score',
            value: `${econ.markovEws.compositeCrisisZScore >= 0 ? '+' : ''}${econ.markovEws.compositeCrisisZScore}σ`,
            note: `12M Sudden-Stop Odds: ${econ.markovEws.crisisProbability12MPct}%`,
          },
          {
            label: 'Dominant Markov Regime',
            value: econ.markovEws.currentDominantRegime,
            note: 'Conditioned on 5-factor Kaminsky-Reinhart thresholds',
          },
        ],
      },
    };
    return map[activeAgent.agentId] || map.ag4_fiscal_auditor;
  }, [activeAgent.agentId, closedLoopQuantModels, run.openData]);

  const desks: Array<{ id: DeskId; label: string; lead: string }> = [
    {
      id: 'geopolitical',
      label: 'Geopolitical Risk Desk',
      lead: 'Managing Director — Geopolitics & Chokepoints',
    },
    {
      id: 'sovereign',
      label: 'Sovereign Credit Desk',
      lead: 'Managing Director — Sovereign Credit & Fiscal',
    },
    {
      id: 'macro',
      label: 'Macroeconomic Desk',
      lead: 'Managing Director — Global Macro & Monetary',
    },
  ];

  const allMinorityDissents = [
    ...(run.deskDebates.geopolitical.minorityDissents || []),
    ...(run.deskDebates.sovereign.minorityDissents || []),
    ...(run.deskDebates.macro.minorityDissents || []),
  ];

  return (
    <div className="space-y-6">
      {/* Live Pipeline Execution Health, Latency & Quantitative Anchor Audit Panel */}
      <CouncilPipelineReliabilityPanel
        run={run}
        isRunningPhase1And2={isRunningPhase1And2}
        onReverifyPipeline={onReverifyPipeline}
        onJumpToCROGate={onJumpToCROGate}
      />

      {/* Interactive Council of Agents Hierarchy Map */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Institutional Research Committee Hierarchy (`TradingAgents` State Graph)</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Select any specialist analyst card below to inspect its quantitative findings &amp; JSON schema</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Council of Agents Architecture &amp; Specialist Analyst Inspector
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenRuntimeModal && (
              <button
                type="button"
                onClick={onOpenRuntimeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Open 12-Agent &amp; Docker GUI Studio</span>
              </button>
            )}
            {onOpenGeopoliticalDesk && (
              <button
                type="button"
                onClick={onOpenGeopoliticalDesk}
                className="px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
              >
                Open Geopolitical Wargaming &amp; Chokepoint Desk →
              </button>
            )}
            <button
              type="button"
              onClick={onJumpToCROGate}
              className="ui-btn ui-btn-primary shrink-0"
            >
              Open CRO Override Gate &amp; Decision Report
            </button>
          </div>
        </div>

        {/* Supreme Council Top Node */}
        <div className="mt-5 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 p-4 text-center">
            <div className="text-xs tabular-nums text-blue-400">
              SUPREME COUNCIL ORCHESTRATOR (PORTFOLIO &amp; POLICY TRANSLATION LAYER)
            </div>
            <div className="text-sm font-semibold mt-0.5">
              Global Coherence: {((run.supremeCouncil?.globalCoherenceScore ?? 0.91) * 100).toFixed(0)}% · Verdict:{' '}
              <span className="tabular-nums text-amber-400">
                {run.supremeCouncil?.decisionVerdict || 'AWAITING_CRO_GATE'}
              </span>{' '}
              · Composite Risk: {(run.supremeCouncil?.compositeRiskScore ?? 0.62).toFixed(2)}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* 3 Desks & 9 Sub-Agents Interactive Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {desks.map((desk) => {
            const debate = run.deskDebates[desk.id];
            const deskAgents = run.subAgents.filter((a) => a.deskId === desk.id);
            return (
              <div
                key={desk.id}
                className="border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Desk Lead Header */}
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{desk.lead}</span>
                      <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {debate.preCascadeRiskScore.toFixed(2)} → {debate.postCascadeRiskScore.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {desk.label}
                    </h3>
                  </div>

                  {/* 3 Sub-Agents under this Desk */}
                  <div className="space-y-2.5 mt-3">
                    {deskAgents.map((agent) => {
                      const isSelected = agent.agentId === selectedAgentId;
                      return (
                        <button
                          key={agent.agentId}
                          type="button"
                          onClick={() => setSelectedAgentId(agent.agentId)}
                          className={`w-full text-left p-3 border transition-colors ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 '
                              : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {agent.agentCode}
                            </span>
                            <span className="tabular-nums text-slate-600 dark:text-slate-400">
                              {agent.stance} · Risk {agent.riskScore.toFixed(2)} · Calib {(agent.brierCalibrationWeight * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                            {agent.agentName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            <RichTextWithStatRefs text={agent.findingsSummary} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <strong>Desk Consensus:</strong> {debate.consensusStance} ({debate.postCascadeRiskScore.toFixed(2)})
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Sub-Agent Deep-Dive & Structured JSON Schema Payload */}
        {activeAgent && (
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>Selected Analyst: {activeAgent.agentCode}</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Brier Calibration Reliability Weight: {(activeAgent.brierCalibrationWeight * 100).toFixed(0)}%</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Confidence: {(activeAgent.confidence * 100).toFixed(0)}%</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeAgent.agentName} — {activeAgent.roleTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  <RichTextWithStatRefs text={activeAgent.findingsSummary} />
                </p>
              </div>

              {/* Inline GUI Model & Prompt Configurator for Selected Agent */}
              {runtimeConfig && onUpdateRuntimeConfig && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                      <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        GUI Model &amp; Directive Configurator for {activeAgent.agentCode} (
                        {activeAgent.agentName})
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      {onOpenRuntimeModal && (
                        <button
                          type="button"
                          onClick={onOpenRuntimeModal}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                        >
                          All 12 Agents &amp; Docker GUI →
                        </button>
                      )}
                      {onReverifyPipeline && (
                        <button
                          type="button"
                          onClick={onReverifyPipeline}
                          disabled={isRunningPhase1And2}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          <Play className="w-3 h-3" />
                          <span>{isRunningPhase1And2 ? 'Running...' : 'Apply & Re-Run Agent'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Assigned Ollama / LLM Model Tag for {activeAgent.agentCode}
                      </label>
                      <input
                        type="text"
                        value={runtimeConfig.agentModelOverrides?.[activeAgent.agentId] || ''}
                        onChange={(e) =>
                          onUpdateRuntimeConfig({
                            ...runtimeConfig,
                            agentModelOverrides: {
                              ...(runtimeConfig.agentModelOverrides || {}),
                              [activeAgent.agentId]: e.target.value,
                            },
                          })
                        }
                        placeholder={`Default: ${
                          runtimeConfig.deskModelOverrides?.[activeAgent.deskId] ||
                          runtimeConfig.ollamaQuickModel ||
                          'qwen2.5:7b'
                        }`}
                        className="w-full px-2.5 py-1.5 tabular-nums text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Custom Analytical Directive / Prompt Override for {activeAgent.agentCode}
                      </label>
                      <input
                        type="text"
                        value={runtimeConfig.agentPromptOverrides?.[activeAgent.agentId] || ''}
                        onChange={(e) =>
                          onUpdateRuntimeConfig({
                            ...runtimeConfig,
                            agentPromptOverrides: {
                              ...(runtimeConfig.agentPromptOverrides || {}),
                              [activeAgent.agentId]: e.target.value,
                            },
                          })
                        }
                        placeholder={`Enter custom focus instruction for ${activeAgent.agentCode}...`}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quantitative Metrics Table */}
              <div className="border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-3 font-semibold">Metric / Indicator</th>
                      <th className="py-2 px-3 font-semibold text-right">Value</th>
                      <th className="py-2 px-3 font-semibold">Context / Delta</th>
                      <th className="py-2 px-3 font-semibold">Provenance Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {activeAgent.keyMetrics.map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {m.label}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums font-semibold text-right text-blue-600 dark:text-blue-400">
                          {m.value}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-600 dark:text-slate-400">
                          {m.change}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {m.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Closed-Loop Quantitative Desk Engine Feed */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Closed-Loop Desk Engine Wired to {activeAgent.agentCode}: {activeAgentClosedLoopMetrics.engineName}
                  </span>
                  <StatRefBadge
                    refText={activeAgentClosedLoopMetrics.formulaTag}
                    variant="inline"
                  />
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Plain-English Meaning:</strong> {activeAgentClosedLoopMetrics.plainEnglishSummary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeAgentClosedLoopMetrics.items.map((it) => (
                    <div
                      key={it.label}
                      className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        {it.label}
                      </span>
                      <span className="tabular-nums font-semibold text-sm text-blue-600 dark:text-blue-400">
                        {it.value}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                        {it.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grounding Citations */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verified Grounding Sources &amp; Open API Feeds ({activeAgent.dataSourcesUsed.join(' · ')}):
                </div>
                <div className="flex flex-wrap gap-3">
                  {activeAgent.groundingSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span>{src.title.slice(0, 68)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Strict Schema JSON Output Payload */}
            <div className="lg:col-span-5 bg-slate-950 text-slate-100 p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Structured Inter-Agent JSON Payload</span>
                  </span>
                  <span className="tabular-nums text-xs text-emerald-400">Schema verified</span>
                </div>
                <pre className="mt-3 text-xs tabular-nums text-slate-200 overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    {
                      analyst: activeAgent.agentName,
                      desk: activeAgent.deskId,
                      stance: activeAgent.stance,
                      risk_score: activeAgent.riskScore,
                      brier_calibration_weight: activeAgent.brierCalibrationWeight,
                      telemetry_payload: activeAgent.structuredPayload,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
                Analysts communicate via deterministic JSON payloads so downstream desks parse quantitative variables without ambiguity.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Internal Desk Debates (Devil's Advocate Protocol) & Formal Minority Report */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Adversarial Committee Cross-Examination (Devil&apos;s Advocate Protocol)
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Internal Desk Debates &amp; Managing Director Resolutions
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1">
              {(['all', 'geopolitical', 'sovereign', 'macro'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedDeskTab(tab)}
                  className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    selectedDeskTab === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 '
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'All Desks' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {Object.values(run.deskDebates)
              .filter((d) => selectedDeskTab === 'all' || d.deskId === selectedDeskTab)
              .map((debate) => (
                <div
                  key={debate.deskId}
                  className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {debate.deskName}
                      </span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {debate.deskLeadTitle}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      Consensus: {debate.consensusStance} ({debate.postCascadeRiskScore.toFixed(2)})
                    </span>
                  </div>

                  {debate.rounds.map((r) => (
                    <div key={r.roundNumber} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Constructive / Baseline Thesis — {r.proposerAgent}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          <RichTextWithStatRefs text={r.thesis} />
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-rose-600 dark:text-rose-400">
                          Devil&apos;s Advocate Challenge — {r.challengerAgent}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          <RichTextWithStatRefs text={r.counterThesis} />
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="text-xs text-slate-700 dark:text-slate-300 pt-1">
                    <strong className="text-slate-900 dark:text-slate-100">Managing Director Resolution: </strong>
                    <RichTextWithStatRefs text={debate.consensusSummary} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Formal Minority Report Dissent & Historical Crisis Analogs */}
        <div className="xl:col-span-4 space-y-6">
          {/* Minority Dissent Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Formal Minority Report &amp; Dissenting View</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preserves specialist tail-risk warnings when an analyst diverges from desk consensus by ≥ 0.20 risk points.
            </p>
            {allMinorityDissents.map((d) => (
              <div
                key={d.dissentId}
                className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between tabular-nums font-semibold text-rose-700 dark:text-rose-300">
                  <span>{d.agentName}</span>
                  <span>
                    {d.agentRiskScore.toFixed(2)} vs {d.deskConsensusScore.toFixed(2)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <RichTextWithStatRefs text={d.coreDissentArgument} />
                </p>
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>
                    <strong>Early-Warning Catalyst:</strong> {d.earlyWarningTrigger}
                  </div>
                  <div>
                    <strong>Falsification Threshold:</strong> {d.falsificationThreshold}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Historical Crisis Analog Matcher */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Historical Crisis Parallels &amp; Realized Drawdowns</span>
            </div>
            <div className="space-y-3">
              {run.crisisAnalogs.map((analog) => (
                <div
                  key={analog.analogId}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {analog.crisisName}
                    </span>
                    <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      {analog.similarityScorePct}% Match
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-slate-200 dark:border-slate-800 tabular-nums text-xs">
                    <div>
                      <span className="text-slate-400 block">3M FX</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {analog.historicalOutcome.fxDrawdown3MPct}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">5Y CDS</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        +{analog.historicalOutcome.sovereignSpreadWideningBps}bp
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">6M Local Bond</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {analog.historicalOutcome.localBondReturn6MPct}%
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>Key Distinction Today:</strong> {analog.keyDifferencesToday}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Desk Dependency Cascade Engine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Automated Inter-Desk Contagion Propagation (`Geopolitical → Macro → Sovereign Credit`)
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            Cross-Desk Dependency Cascade &amp; Quantitative State Transmission
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {run.cascadeSteps.map((step) => (
            <div
              key={step.stepOrder}
              className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  {step.sourceDesk} Desk → {step.targetDesk} Desk Transmission
                </span>
                <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                  Risk Shift: {step.priorRiskScore.toFixed(2)} → {step.postCascadeRiskScore.toFixed(2)}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{step.triggerAgent}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{step.receivingAgent}</span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs tabular-nums text-slate-800 dark:text-slate-200">
                {step.shockDelta}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <RichTextWithStatRefs text={step.transmissionMechanism} />
              </p>

              <pre className="p-3 bg-slate-950 text-slate-200 text-xs tabular-nums overflow-x-auto">
                {JSON.stringify(step.jsonPatch, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
