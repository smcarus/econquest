import React, { useState } from 'react';
import {
  AIRuntimeConfig,
  CROOverrideState,
  CouncilAssessmentRun,
} from '../types/council';
import {
  buildCanonicalSMCREnvelope,
  buildSMCRMarkdownReport,
  buildTradingAgentsPythonCode,
  exportSMCRPdfDossier,
} from '../utils/smcrReportExporter';
import {
  Sliders,
  FileText,
  Download,
  Copy,
  Check,
  Server,
  Terminal,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { CouncilPipelineReliabilityPanel } from './CouncilPipelineReliabilityPanel';
import { RichTextWithStatRefs } from './StatRefTooltip';

interface CROCheckpointAndReportsProps {
  run: CouncilAssessmentRun;
  croDraft: CROOverrideState;
  runtimeConfig: AIRuntimeConfig;
  isRunningPhase1And2?: boolean;
  isRunningPhase3: boolean;
  onUpdateCroDraft: (next: CROOverrideState) => void;
  onUpdateRuntimeConfig: (next: AIRuntimeConfig) => void;
  onApproveAndConveneSupremeCouncil: () => void;
  onReverifyPipeline?: () => void;
}

export const CROCheckpointAndReports: React.FC<CROCheckpointAndReportsProps> = ({
  run,
  croDraft,
  runtimeConfig,
  isRunningPhase1And2 = false,
  isRunningPhase3,
  onUpdateCroDraft,
  onUpdateRuntimeConfig,
  onApproveAndConveneSupremeCouncil,
  onReverifyPipeline,
}) => {
  const [reportViewMode, setReportViewMode] = useState<
    'executive_dossier' | 'markdown_spec' | 'json_schema' | 'python_sdk'
  >('executive_dossier');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const [ollamaStatus, setOllamaStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
    models: string[];
  }>({
    checked: false,
    connected: false,
    message: 'Click "Test Ollama Endpoint" to probe local model availability.',
    models: ['qwen2.5:32b', 'deepseek-r1:32b', 'llama3.3:70b'],
  });

  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const sc = run.supremeCouncil;
  const markdownContent = buildSMCRMarkdownReport(run);
  const jsonEnvelope = JSON.stringify(buildCanonicalSMCREnvelope(run), null, 2);
  const pythonCode = buildTradingAgentsPythonCode(run, runtimeConfig);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestOllama = async () => {
    try {
      const res = await fetch('/api/ai/ollama-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaBaseUrl: runtimeConfig.ollamaBaseUrl }),
      });
      const data = await res.json();
      setOllamaStatus({
        checked: true,
        connected: Boolean(data.connected),
        message: data.message || 'Checked Ollama endpoint.',
        models: Array.isArray(data.models) && data.models.length > 0 ? data.models : ollamaStatus.models,
      });
    } catch {
      setOllamaStatus({
        checked: true,
        connected: false,
        message: 'Could not reach local Ollama endpoint.',
        models: ollamaStatus.models,
      });
    }
  };

  const handleDispatchWebhook = async () => {
    if (!runtimeConfig.webhookTargetUrl.trim()) {
      setWebhookStatus('Please enter a valid target Webhook URL first.');
      return;
    }
    setWebhookStatus('Dispatching SMCR-1.0 JSON envelope...');
    try {
      const res = await fetch('/api/council/webhook-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: runtimeConfig.webhookTargetUrl,
          payload: buildCanonicalSMCREnvelope(run),
        }),
      });
      const data = await res.json();
      if (res.ok && data.dispatched) {
        setWebhookStatus(`Dispatched SMCR-1.0 payload (HTTP ${data.status}) at ${data.timestamp.slice(11, 19)} UTC`);
      } else {
        setWebhookStatus(data.error || 'Webhook endpoint returned an error.');
      }
    } catch (e: any) {
      setWebhookStatus(`Dispatch error: ${e?.message || 'Network failure'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Pipeline Execution Health, Latency & Quantitative Anchor Audit Panel */}
      <CouncilPipelineReliabilityPanel
        run={run}
        isRunningPhase1And2={isRunningPhase1And2}
        onReverifyPipeline={onReverifyPipeline}
      />

      {/* 1. HUMAN-IN-THE-LOOP CRO GATE & COUNTERFACTUAL SHOCK WAR-GAMING */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <span>Human-in-the-Loop (HITL) Governance Gate</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                Pipeline Status:{' '}
                {run.stage === 'AWAITING_CRO_APPROVAL'
                  ? 'PAUSED BEFORE SUPREME COUNCIL — AWAITING CRO APPROVAL'
                  : 'CRO VERIFIED & SUPREME COUNCIL SYNTHESIZED'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Chief Risk Officer (CRO) Assumption Override &amp; Counterfactual Shock War-Gaming
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                onUpdateCroDraft({
                  ...run.croState,
                  counterfactualShocks: {
                    brentCrudeShockUsd: 0,
                    fedTerminalRateShockBps: 0,
                    chokepointTransitDropPct: 0,
                    domesticFiscalSlippagePctGdp: 0,
                  },
                  isOverridden: false,
                })
              }
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              Reset to Desk Consensus
            </button>
            <button
              type="button"
              onClick={onApproveAndConveneSupremeCouncil}
              disabled={isRunningPhase3}
              className="ui-btn ui-btn-primary shrink-0"
            >
              {isRunningPhase3
                ? 'Convening Supreme Council (Deep Think)...'
                : run.stage === 'AWAITING_CRO_APPROVAL'
                ? 'Approve Assumptions & Convene Supreme Council'
                : 'Re-Run Supreme Council with CRO Overrides'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Desk Risk Score Overrides */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Desk Risk Vector &amp; Structural Variable Overrides
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Geopolitical Risk Score
                  </label>
                  <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {croDraft.geopoliticalRiskScore.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.98"
                  step="0.01"
                  value={croDraft.geopoliticalRiskScore}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      geopoliticalRiskScore: Number(e.target.value),
                      isOverridden: true,
                    })
                  }
                  className="w-full mt-2 accent-blue-600"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Sovereign Credit Risk Score
                  </label>
                  <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {croDraft.sovereignRiskScore.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.98"
                  step="0.01"
                  value={croDraft.sovereignRiskScore}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      sovereignRiskScore: Number(e.target.value),
                      isOverridden: true,
                    })
                  }
                  className="w-full mt-2 accent-blue-600"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Macroeconomic Risk Score
                  </label>
                  <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {croDraft.macroRiskScore.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.98"
                  step="0.01"
                  value={croDraft.macroRiskScore}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      macroRiskScore: Number(e.target.value),
                      isOverridden: true,
                    })
                  }
                  className="w-full mt-2 accent-blue-600"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Political Will Index (0–100)
                  </label>
                  <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {croDraft.politicalWillIndex}/100
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="1"
                  value={croDraft.politicalWillIndex}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      politicalWillIndex: Number(e.target.value),
                      isOverridden: true,
                    })
                  }
                  className="w-full mt-2 accent-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Chief Risk Officer Mandate &amp; Override Directive Notes:
              </label>
              <textarea
                rows={2}
                value={croDraft.croNotes}
                onChange={(e) =>
                  onUpdateCroDraft({
                    ...croDraft,
                    croNotes: e.target.value,
                    isOverridden: true,
                  })
                }
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Counterfactual War-Gaming Shock Injectors */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Counterfactual Stress-Test &amp; War-Gaming Shock Injector
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    Brent Crude Oil Spike (+$/bbl)
                  </label>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    +${croDraft.counterfactualShocks.brentCrudeShockUsd}/bbl
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={croDraft.counterfactualShocks.brentCrudeShockUsd}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      isOverridden: true,
                      counterfactualShocks: {
                        ...croDraft.counterfactualShocks,
                        brentCrudeShockUsd: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full mt-2 accent-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    US Fed Terminal Rate Shock (+bps)
                  </label>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    +{croDraft.counterfactualShocks.fedTerminalRateShockBps} bps
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="25"
                  value={croDraft.counterfactualShocks.fedTerminalRateShockBps}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      isOverridden: true,
                      counterfactualShocks: {
                        ...croDraft.counterfactualShocks,
                        fedTerminalRateShockBps: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full mt-2 accent-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    Maritime Chokepoint Transit Drop (%)
                  </label>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    -{croDraft.counterfactualShocks.chokepointTransitDropPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="10"
                  value={croDraft.counterfactualShocks.chokepointTransitDropPct}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      isOverridden: true,
                      counterfactualShocks: {
                        ...croDraft.counterfactualShocks,
                        chokepointTransitDropPct: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full mt-2 accent-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-800 dark:text-slate-200">
                    Domestic Fiscal Slippage (+% GDP)
                  </label>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    +{croDraft.counterfactualShocks.domesticFiscalSlippagePctGdp.toFixed(1)}% GDP
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.5"
                  value={croDraft.counterfactualShocks.domesticFiscalSlippagePctGdp}
                  onChange={(e) =>
                    onUpdateCroDraft({
                      ...croDraft,
                      isOverridden: true,
                      counterfactualShocks: {
                        ...croDraft.counterfactualShocks,
                        domesticFiscalSlippagePctGdp: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full mt-2 accent-amber-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <strong>Live Stress Preview:</strong> Applying these counterfactual shocks shifts effective Composite Risk to{' '}
              <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {(
                  (croDraft.geopoliticalRiskScore +
                    croDraft.sovereignRiskScore +
                    croDraft.macroRiskScore) /
                    3 +
                  croDraft.counterfactualShocks.brentCrudeShockUsd * 0.002 +
                  croDraft.counterfactualShocks.domesticFiscalSlippagePctGdp * 0.02
                ).toFixed(2)}
              </span>
              . Click <strong>Approve Assumptions &amp; Convene Supreme Council</strong> to re-synthesize all trade tickets and policy recommendations.
            </div>
          </div>
        </div>
      </div>

      {/* 2. STANDARDIZED SMCR-1.0 REPORT SUITE (HUMAN + AI DUAL-READABLE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Standardized Report Specification: SMCR-1.0 (Sovereign-Macro Council Report v1.0)</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Report ID: {sc?.reportId || run.runId}</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              Supreme Council Decision-Point Dossier &amp; Multi-Format AI Export
            </h2>
          </div>

          {/* Standardized Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportSMCRPdfDossier(run)}
              className="ui-btn ui-btn-primary inline-flex shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Institutional PDF (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleDownloadFile(
                  markdownContent,
                  `SMCR-1.0_${run.iso3}_${new Date().toISOString().slice(0, 10)}.md`,
                  'text/markdown'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download AI Markdown (.md)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleDownloadFile(
                  jsonEnvelope,
                  `SMCR-1.0_${run.iso3}_${new Date().toISOString().slice(0, 10)}.json`,
                  'application/json'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON-Schema (.json)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyText(markdownContent, 'smcr_md')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedLabel === 'smcr_md' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied for AI</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SMCR-1.0 for Other AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          {[
            { id: 'executive_dossier', label: 'Executive Decision Dossier' },
            { id: 'markdown_spec', label: 'Standardized YAML + Markdown (.md)' },
            { id: 'json_schema', label: 'Canonical JSON-Schema Envelope (.json)' },
            { id: 'python_sdk', label: 'TradingAgents Python + Ollama Exporter (.py)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportViewMode(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                reportViewMode === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 '
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View 1: Executive Decision Dossier */}
        {reportViewMode === 'executive_dossier' && sc && (
          <div className="space-y-6">
            {/* Executive Verdict Banner */}
            <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                <span className="text-blue-400">Supreme council decision verdict</span>
                <span>
                  VERDICT: <strong className="text-amber-400">{sc.decisionVerdict}</strong> · COMPOSITE RISK:{' '}
                  <strong>{sc.compositeRiskScore.toFixed(2)} / 1.00</strong> · COHERENCE:{' '}
                  <strong>{(sc.globalCoherenceScore * 100).toFixed(0)}%</strong>
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                <RichTextWithStatRefs text={sc.executiveSummary} />
              </p>
            </div>

            {/* Decision-Point & Catalyst Threshold Matrix */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Decision-Point &amp; Catalyst Threshold Matrix (Action Triggers)
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-semibold">ID</th>
                      <th className="py-2.5 px-3 font-semibold">Indicator &amp; Desk</th>
                      <th className="py-2.5 px-3 font-semibold">Current Level</th>
                      <th className="py-2.5 px-3 font-semibold">Bull Threshold</th>
                      <th className="py-2.5 px-3 font-semibold">Bear Regime-Break Trigger</th>
                      <th className="py-2.5 px-3 font-semibold">Required Decision Action if Triggered</th>
                      <th className="py-2.5 px-3 font-semibold">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sc.decisionPointMatrix.map((dp) => (
                      <tr key={dp.variableId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 tabular-nums font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {dp.variableId}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {dp.variableName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dp.deskSource.toUpperCase()} · {dp.provenanceTier}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-800 dark:text-slate-200">
                          {dp.currentValue}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-emerald-700 dark:text-emerald-400">
                          {dp.bullThreshold}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-rose-600 dark:text-rose-400">
                          {dp.bearBreakTrigger}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {dp.requiredActionIfTriggered}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {dp.urgency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dual-Audience Translation Layer: Policy Researcher vs Asset Manager */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Policy Researcher Structural Report */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
                <div className="text-xs tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  FOR THE POLICY RESEARCHER &amp; CENTRAL BANK / IMF STAFF
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Structural Vulnerabilities &amp; Institutional Policy Recommendations
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {sc.policyResearcherReport.structuralVulnerabilities.map((v, i) => (
                    <li key={i} className="leading-relaxed">
                      <RichTextWithStatRefs text={v} />
                    </li>
                  ))}
                </ul>

                <div className="pt-2 space-y-2">
                  {sc.policyResearcherReport.policyRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                        <span>{rec.authority}</span>
                        <span className="tabular-nums text-xs text-blue-600 dark:text-blue-400">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        <RichTextWithStatRefs text={rec.action} />
                      </p>
                      <div className="text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                        Expected Quantitative Impact: {rec.expectedImpact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset Manager / Trader Execution Tickets */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
                <div className="flex items-center justify-between text-xs tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>FOR THE ASSET MANAGER &amp; MACRO TRADER</span>
                  <span>STANCE: {sc.marketTranslationLayer.regimeStance}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Portfolio Trade Execution Tickets &amp; Risk Guardian Audit
                </h4>

                <div className="space-y-2.5">
                  {sc.marketTranslationLayer.tradeExpressions.map((trd) => (
                    <div
                      key={trd.ticketId}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {trd.ticketId} · [{trd.direction}] {trd.instrument}
                        </span>
                        <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          Weight: {trd.sizingWeightPct}% ({trd.targetHorizon})
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        <RichTextWithStatRefs text={trd.entryRationale} />
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 tabular-nums text-xs">
                        <div className="text-slate-600 dark:text-slate-400">
                          Entry/Target: <strong className="text-slate-900 dark:text-slate-100">{trd.targetLevel}</strong>
                        </div>
                        <div className="text-rose-600 dark:text-rose-400">
                          Stop/Invalidation: <strong>{trd.invalidationStopTrigger}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk Guardian Box */}
                <div className="p-3 bg-slate-900 text-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between tabular-nums font-semibold text-emerald-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Risk Guardian Portfolio Audit: {sc.marketTranslationLayer.riskGuardianCheck.approvalStatus}</span>
                    </span>
                    <span>
                      Max DD Est: -{sc.marketTranslationLayer.riskGuardianCheck.maxDrawdownEstimatePct}% | Haircut:{' '}
                      {sc.marketTranslationLayer.riskGuardianCheck.liquidityHaircutPct}%
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    <RichTextWithStatRefs
                      text={sc.marketTranslationLayer.riskGuardianCheck.factorCrowdingWarning}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Standardized YAML + Markdown */}
        {reportViewMode === 'markdown_spec' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Standardized SMCR-1.0 Markdown with YAML Frontmatter (Ready for RAG / LLM / Obsidian ingestion)</span>
              <button
                type="button"
                onClick={() => handleCopyText(markdownContent, 'md_raw')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedLabel === 'md_raw' ? 'Copied Markdown!' : 'Copy Full Markdown'}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 text-xs tabular-nums overflow-x-auto max-h-[520px] leading-relaxed">
              {markdownContent}
            </pre>
          </div>
        )}

        {/* View 3: Canonical JSON-Schema Envelope */}
        {reportViewMode === 'json_schema' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Canonical SMCR-1.0 JSON-Schema Envelope (Zero-shot machine-readable by Ollama, MCP, LangGraph)</span>
              <button
                type="button"
                onClick={() => handleCopyText(jsonEnvelope, 'json_raw')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedLabel === 'json_raw' ? 'Copied JSON!' : 'Copy JSON Envelope'}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 text-xs tabular-nums overflow-x-auto max-h-[520px] leading-relaxed">
              {jsonEnvelope}
            </pre>
          </div>
        )}

        {/* View 4: TradingAgents Python + Ollama Exporter */}
        {reportViewMode === 'python_sdk' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Drop-in Python Script for tauricresearch/tradingagents (Includes Free Open-Data @tools + Gemini/Ollama Config)</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyText(pythonCode, 'py_raw')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {copiedLabel === 'py_raw' ? 'Copied Python Code!' : 'Copy Python Script'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(pythonCode, `council_tradingagents_${run.iso3.toLowerCase()}.py`, 'text/x-python')
                  }
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Download .py File
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 text-xs tabular-nums overflow-x-auto max-h-[520px] leading-relaxed">
              {pythonCode}
            </pre>
          </div>
        )}
      </div>

      {/* 3. MULTI-PLATFORM AI & SELF-HOSTED OLLAMA CONNECTOR BRIDGE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Platform AI Interoperability · Self-Hosted Ollama, OpenAI-Compatible &amp; Webhook Dispatch
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            AI Runtime Routing &amp; External Platform Connectors
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Provider Selector & Ollama Config */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google AI Studio (Gemini)' },
                { id: 'ollama', label: 'Self-Hosted Ollama' },
                { id: 'hybrid', label: 'Hybrid (Gemini + Ollama)' },
                { id: 'openai_compatible', label: 'OpenAI / vLLM API' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onUpdateRuntimeConfig({
                      ...runtimeConfig,
                      providerMode: mode.id as AIRuntimeConfig['providerMode'],
                    })
                  }
                  className={`p-2.5 text-xs font-semibold border text-left transition-colors ${
                    runtimeConfig.providerMode === mode.id
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Self-Hosted Ollama Base URL
                </label>
                <input
                  type="text"
                  value={runtimeConfig.ollamaBaseUrl}
                  onChange={(e) =>
                    onUpdateRuntimeConfig({ ...runtimeConfig, ollamaBaseUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Ollama Quick-Think Model (Sub-Agents)
                </label>
                <input
                  type="text"
                  value={runtimeConfig.ollamaQuickModel}
                  onChange={(e) =>
                    onUpdateRuntimeConfig({ ...runtimeConfig, ollamaQuickModel: e.target.value })
                  }
                  placeholder="qwen2.5:32b"
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Ollama Deep-Think Model (Supreme Council)
                </label>
                <input
                  type="text"
                  value={runtimeConfig.ollamaDeepModel}
                  onChange={(e) =>
                    onUpdateRuntimeConfig({ ...runtimeConfig, ollamaDeepModel: e.target.value })
                  }
                  placeholder="deepseek-r1:32b"
                  className="w-full px-2.5 py-1.5 text-xs tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-slate-600 dark:text-slate-300">
                <strong>Ollama Status:</strong> {ollamaStatus.message}
              </div>
              <button
                type="button"
                onClick={handleTestOllama}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Test Ollama Endpoint
              </button>
            </div>
          </div>

          {/* Downstream AI Platform Webhook Push */}
          <div className="lg:col-span-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Downstream AI Platform Webhook / MCP Dispatcher
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Push the standardized <code className="tabular-nums">SMCR-1.0</code> JSON envelope directly to external agent orchestrators (n8n, LangGraph Cloud, CrewAI, AutoGen, or execution bots).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="url"
                  value={runtimeConfig.webhookTargetUrl}
                  onChange={(e) =>
                    onUpdateRuntimeConfig({ ...runtimeConfig, webhookTargetUrl: e.target.value })
                  }
                  placeholder="https://your-ai-pipeline.example.com/webhook/smcr"
                  className="flex-1 px-2.5 py-1.5 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleDispatchWebhook}
                  className="ui-btn ui-btn-primary inline-flex shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Push SMCR-1.0</span>
                </button>
              </div>
              {webhookStatus && (
                <div className="text-xs tabular-nums text-blue-600 dark:text-blue-400 pt-1">
                  {webhookStatus}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Tip: Switch the report tab above to <strong>TradingAgents Python + Ollama Exporter (.py)</strong> to copy the complete self-hosted Python script.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
