import React, { useEffect, useMemo, useState } from 'react';
import {
  AnnotatedChartSpec,
  CouncilAssessmentRun,
  OpenDataSnapshot,
} from '../types/council';
import {
  CSV_TARGET_FIELD_SPECS,
  CleanedCsvDatasetResult,
  CsvColumnMappingConfig,
  CsvTargetFieldId,
  CsvUnitMultiplier,
  SAMPLE_SOVEREIGN_CSV_PRESETS,
  applyMappedCsvToSovereignOpenData,
  autoDetectCsvColumnMappings,
  buildCsvPolicySummaryMarkdown,
  buildCustomCrisisBacktestEpisodeFromCsv,
  generateBlankCsvTemplateString,
  parseRawCsvText,
  processAndCleanMappedCsv,
} from '../utils/csvImportAndMappingEngine';
import { HistoricalCrisisEpisode } from '../utils/portfolioAndBacktestEngine';
import { StatRefBadge } from './StatRefTooltip';
import {
  FileSpreadsheet,
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Play,
  ArrowRight,
  Sliders,
  Database,
  History,
  FileText,
} from 'lucide-react';

interface PolicyDocumentAndCsvLabProps {
  run: CouncilAssessmentRun;
  policyDocTitle: string;
  policyDocText: string;
  onChangePolicyDocTitle: (title: string) => void;
  onChangePolicyDocText: (text: string) => void;
  onDocumentFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunCouncilWithDocument: () => void;
  onApplyCsvToLiveState: (
    updatedOpenData: OpenDataSnapshot,
    updatedCharts: AnnotatedChartSpec[],
    datasetSummary: string
  ) => void;
  onRegisterCustomCrisisBacktest: (
    customEpisode: HistoricalCrisisEpisode,
    navigateImmediately: boolean
  ) => void;
}

const PREVIEW_NUMERIC_COLUMNS: Array<{
  field: Exclude<CsvTargetFieldId, 'UNMAPPED' | 'observationDate' | 'iso3'>;
  shortLabel: string;
  unit: string;
  decimals: number;
}> = [
  { field: 'cds5YSpreadBps', shortLabel: '5Y CDS', unit: 'bps', decimals: 0 },
  { field: 'sovereign10YBondYieldPct', shortLabel: '10Y Yield', unit: '%', decimals: 2 },
  { field: 'sovereign2YBondYieldPct', shortLabel: '2Y Yield', unit: '%', decimals: 2 },
  { field: 'policyRatePct', shortLabel: 'Policy Rate', unit: '%', decimals: 2 },
  { field: 'debtToGdpPct', shortLabel: 'Debt/GDP', unit: '%', decimals: 1 },
  { field: 'primaryFiscalBalancePct', shortLabel: 'Primary Bal', unit: '%', decimals: 2 },
  { field: 'fxReservesMonthsImport', shortLabel: 'FX Cover', unit: 'mo', decimals: 2 },
  { field: 'imfAraRatioPct', shortLabel: 'IMF ARA', unit: '%', decimals: 1 },
  { field: 'inflationCpiYoYPct', shortLabel: 'CPI YoY', unit: '%', decimals: 2 },
  { field: 'realGdpGrowthPct', shortLabel: 'Real GDP', unit: '%', decimals: 2 },
  { field: 'fxSpotRatePerUsd', shortLabel: 'Spot FX', unit: '/USD', decimals: 2 },
];

export const PolicyDocumentAndCsvLab: React.FC<PolicyDocumentAndCsvLabProps> = ({
  run,
  policyDocTitle,
  policyDocText,
  onChangePolicyDocTitle,
  onChangePolicyDocText,
  onDocumentFileUpload,
  onRunCouncilWithDocument,
  onApplyCsvToLiveState,
  onRegisterCustomCrisisBacktest,
}) => {
  const defaultPreset =
    SAMPLE_SOVEREIGN_CSV_PRESETS.find((p) => p.iso3 === run.iso3) ||
    SAMPLE_SOVEREIGN_CSV_PRESETS[0];

  const [datasetTitle, setDatasetTitle] = useState<string>(defaultPreset.title);
  const [rawCsvInput, setRawCsvInput] = useState<string>(defaultPreset.csvText);
  const [columnMappings, setColumnMappings] = useState<CsvColumnMappingConfig[]>(() => {
    const parsed = parseRawCsvText(defaultPreset.csvText);
    return autoDetectCsvColumnMappings(parsed);
  });
  const [selectedSnapshotRowIdx, setSelectedSnapshotRowIdx] = useState<number>(9);
  const [showRawCsvEditor, setShowRawCsvEditor] = useState<boolean>(false);
  const [lastAppliedFeedback, setLastAppliedFeedback] = useState<string | null>(null);

  const parsedCsv = useMemo(() => parseRawCsvText(rawCsvInput), [rawCsvInput]);

  // Re-run auto-detection whenever header count or names change
  useEffect(() => {
    const detected = autoDetectCsvColumnMappings(parsedCsv);
    setColumnMappings(detected);
    if (parsedCsv.rows.length > 0) {
      setSelectedSnapshotRowIdx(parsedCsv.rows.length - 1);
    }
  }, [rawCsvInput]);

  const cleanedDataset: CleanedCsvDatasetResult = useMemo(
    () =>
      processAndCleanMappedCsv(
        parsedCsv,
        columnMappings,
        run.openData,
        datasetTitle || 'Custom Sovereign CSV Dataset'
      ),
    [parsedCsv, columnMappings, run.openData, datasetTitle]
  );

  const synthesizedEpisode = useMemo(
    () => buildCustomCrisisBacktestEpisodeFromCsv(cleanedDataset, run),
    [cleanedDataset, run]
  );

  const handleLoadSamplePreset = (presetId: string) => {
    const found = SAMPLE_SOVEREIGN_CSV_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setDatasetTitle(found.title);
    setRawCsvInput(found.csvText);
    setLastAppliedFeedback(null);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanName = file.name.replace(/\.(csv|tsv|txt)$/i, '');
    setDatasetTitle(cleanName);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      if (text.trim()) {
        setRawCsvInput(text);
        setLastAppliedFeedback(
          `Loaded "${file.name}" (${text.split('\n').length - 1} rows) and auto-mapped columns.`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = generateBlankCsvTemplateString(run.iso3);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign_macro_template_${run.iso3.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateColumnTarget = (colIdx: number, nextTarget: CsvTargetFieldId) => {
    setColumnMappings((prev) =>
      prev.map((m) =>
        m.columnIndex === colIdx
          ? {
              ...m,
              targetField: nextTarget,
              autoConfidence: nextTarget === 'UNMAPPED' ? 'UNMAPPED' : 'HIGH',
            }
          : m
      )
    );
  };

  const handleUpdateUnitMultiplier = (colIdx: number, mult: CsvUnitMultiplier) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.columnIndex === colIdx ? { ...m, unitMultiplier: mult } : m))
    );
  };

  const handleApplyLiveStateOnly = () => {
    const { updatedOpenData, updatedCharts, appliedRow } = applyMappedCsvToSovereignOpenData(
      run.openData,
      cleanedDataset,
      selectedSnapshotRowIdx
    );
    const msg = `Applied CSV snapshot (${appliedRow.observationDate}) & ${cleanedDataset.rowCount}-step historical trajectory to live ${run.countryName} (${run.iso3}) state (5Y CDS: ${Math.round(appliedRow.values.cds5YSpreadBps)} bps, 10Y Yield: ${appliedRow.values.sovereign10YBondYieldPct.toFixed(2)}%, Debt/GDP: ${appliedRow.values.debtToGdpPct.toFixed(1)}%).`;
    onApplyCsvToLiveState(updatedOpenData, updatedCharts, msg);
    setLastAppliedFeedback(msg);
  };

  const handleApplyBacktestOnly = (navigateImmediately: boolean) => {
    onRegisterCustomCrisisBacktest(synthesizedEpisode, navigateImmediately);
    setLastAppliedFeedback(
      `Synthesized custom crisis replay "${synthesizedEpisode.title}" (${synthesizedEpisode.timeline.length} steps, Peak Spread ${synthesizedEpisode.peakSpreadBps} bps, EWS Lead Time ${synthesizedEpisode.earlyWarningLeadTimeMonths} steps).`
    );
  };

  const handleApplyBothLiveAndBacktest = (navigateToBacktest: boolean) => {
    const { updatedOpenData, updatedCharts, appliedRow } = applyMappedCsvToSovereignOpenData(
      run.openData,
      cleanedDataset,
      selectedSnapshotRowIdx
    );
    const summaryMarkdown = buildCsvPolicySummaryMarkdown(cleanedDataset);
    if (!policyDocText.includes(cleanedDataset.datasetTitle)) {
      onChangePolicyDocText(
        policyDocText
          ? `${policyDocText.trim()}\n\n${summaryMarkdown}`
          : summaryMarkdown
      );
    }
    const msg = `Propagated "${cleanedDataset.datasetTitle}" (${appliedRow.observationDate}) to Live ${run.countryName} State, Historical Charts, Policy Document Annex, and Custom Crisis Backtest Engine.`;
    onApplyCsvToLiveState(updatedOpenData, updatedCharts, msg);
    onRegisterCustomCrisisBacktest(synthesizedEpisode, navigateToBacktest);
    setLastAppliedFeedback(msg);
  };

  const clampedRowIdx = Math.min(
    Math.max(0, selectedSnapshotRowIdx),
    Math.max(0, cleanedDataset.rows.length - 1)
  );
  const selectedRow = cleanedDataset.rows[clampedRowIdx];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          MODULE 1: SOVEREIGN CSV BATCH IMPORT & AUTO-SCHEMA MAPPING ENGINE
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Quantitative Data Ingestion · Auto-Schema Mapper · Linear Interpolation &amp; 3σ Outlier Audit</span>
              <StatRefBadge refText="Ref: Kaminsky-Reinhart EWS Z-Score" variant="inline" />
              <StatRefBadge refText="Ref: Hamilton Markov Switching P(S_t=1)" variant="inline" />
              <StatRefBadge refText="Ref: IMF DSA Debt Stabilizing Primary Balance" variant="inline" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Sovereign CSV Batch Import &amp; Custom Backtest Calibration Engine
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Batch-upload historical sovereign time series (CDS spreads, 2Y/10Y yields, debt/GDP, FX reserves, CPI) to automatically map columns, linearly interpolate date gaps, flag statistical tail outliers, and propagate to both the live terminal state and the Crisis Replay &amp; Backtest Desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .CSV Template ({run.iso3})</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer transition-colors">
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload Sovereign Dataset (.CSV / .TSV)</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Institutional Preset Loader Bar + Dataset Title */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950/70 p-3.5 border border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Active CSV Dataset Title &amp; Provenance Label
            </label>
            <input
              type="text"
              value={datasetTitle}
              onChange={(e) => setDatasetTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="e.g., Brazil 2014-2016 Fiscal Dominance Cycle"
            />
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Sample Sovereign CSVs:
              </span>
              {SAMPLE_SOVEREIGN_CSV_PRESETS.map((preset) => {
                const isCurrent = datasetTitle === preset.title;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadSamplePreset(preset.id)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold border transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {preset.iso3} · {preset.id.split('_')[1]}–{preset.id.split('_')[2]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowRawCsvEditor((v) => !v)}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400"
            >
              {showRawCsvEditor ? 'Hide Raw CSV Editor' : 'Edit / Paste Raw CSV'}
            </button>
          </div>
        </div>

        {/* Collapsible Raw CSV Text Editor */}
        {showRawCsvEditor && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Paste comma-, semicolon-, or tab-delimited sovereign series below. Leave cells blank or `NA` to test automatic linear interpolation:
              </span>
              <span className="font-mono">
                Delimiter: &ldquo;{parsedCsv.delimiter === '\t' ? 'TAB' : parsedCsv.delimiter}&rdquo; · {parsedCsv.headers.length} Columns · {parsedCsv.rows.length} Rows
              </span>
            </div>
            <textarea
              rows={7}
              value={rawCsvInput}
              onChange={(e) => setRawCsvInput(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-950 text-emerald-300 border border-slate-800 leading-relaxed"
            />
          </div>
        )}

        {/* Data Hygiene & Telemetry KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Detected Sovereign</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {cleanedDataset.detectedIso3} · {cleanedDataset.rowCount} Steps
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {cleanedDataset.rows[0]?.observationDate} → {cleanedDataset.rows[cleanedDataset.rows.length - 1]?.observationDate}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Mapped Schema Series</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {cleanedDataset.mappedFieldCount} / 12 Series
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {cleanedDataset.totalBaselineFallbackColumns} baseline fallback(s)
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Linearly Interpolated</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
              {cleanedDataset.totalInterpolatedCells} Gap Cell(s)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Interior missing values repaired
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">3σ Outlier Diagnostics</div>
            <div className="text-base font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              {cleanedDataset.totalOutlierCells} Tail Spike(s)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Flagged at |Z| ≥ 2.35σ
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Peak Realized 5Y CDS</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {synthesizedEpisode.peakSpreadBps} bps
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Peak FX Drawdown: +{synthesizedEpisode.peakFxDepreciationPct}%
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Backtest EWS Lead Time</div>
            <div className="text-base font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
              T-{synthesizedEpisode.earlyWarningLeadTimeMonths} Steps
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Markov P(S_t=1) ≥ 35% trigger
            </div>
          </div>
        </div>

        {/* Interactive Column Mapping & Unit Conversion Table */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Interactive Column Mapping &amp; Unit Scaling Preview
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Auto-detected from CSV header tokens · Override any target schema field or unit multiplier below
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-2.5 font-semibold">CSV Column Header</th>
                  <th className="py-2 px-2.5 font-semibold">Sample Raw Values</th>
                  <th className="py-2 px-2.5 font-semibold">Mapped Terminal Schema Field</th>
                  <th className="py-2 px-2.5 font-semibold">Unit Multiplier</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Series Mean ± σ</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Hygiene (Obs / Interp / 3σ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {columnMappings.map((col) => {
                  const sampleVals = parsedCsv.rows
                    .slice(0, 3)
                    .map((r) => r[col.columnIndex] || 'NA')
                    .join(' · ');
                  const isNumericTarget =
                    col.targetField !== 'UNMAPPED' &&
                    col.targetField !== 'observationDate' &&
                    col.targetField !== 'iso3';
                  const stats = isNumericTarget
                    ? cleanedDataset.columnStats[
                        col.targetField as Exclude<
                          CsvTargetFieldId,
                          'UNMAPPED' | 'observationDate' | 'iso3'
                        >
                      ]
                    : undefined;

                  return (
                    <tr
                      key={col.columnIndex}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2 px-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        <span className="text-slate-400 mr-1.5">#{col.columnIndex + 1}</span>
                        {col.rawHeader}
                        <span
                          className={`ml-2 text-[10px] font-sans font-semibold ${
                            col.autoConfidence === 'HIGH'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : col.autoConfidence === 'MEDIUM'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          · {col.autoConfidence}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                        {sampleVals}
                      </td>
                      <td className="py-2 px-2.5">
                        <select
                          value={col.targetField}
                          onChange={(e) =>
                            handleUpdateColumnTarget(
                              col.columnIndex,
                              e.target.value as CsvTargetFieldId
                            )
                          }
                          className="w-full max-w-[250px] px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          {CSV_TARGET_FIELD_SPECS.map((spec) => (
                            <option key={spec.id} value={spec.id}>
                              {spec.label} ({spec.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2.5">
                        {isNumericTarget ? (
                          <select
                            value={col.unitMultiplier}
                            onChange={(e) =>
                              handleUpdateUnitMultiplier(
                                col.columnIndex,
                                Number(e.target.value) as CsvUnitMultiplier
                              )
                            }
                            className="px-2 py-1 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          >
                            <option value={1}>1x (Native Unit)</option>
                            <option value={100}>100x (% → bps)</option>
                            <option value={0.01}>0.01x (bps → %)</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 font-mono">Identity / Text</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {stats ? (
                          <span>
                            {stats.mean} ± {stats.stdDev}{' '}
                            <span className="text-slate-400">
                              [{stats.min}..{stats.max}]
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                        {stats ? (
                          <span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {stats.observedCount} obs
                            </span>
                            {' · '}
                            <span
                              className={
                                stats.interpolatedCount > 0
                                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              {stats.interpolatedCount} interp
                            </span>
                            {' · '}
                            <span
                              className={
                                stats.outlierCount > 0
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              {stats.outlierCount} outlier
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cleaned Time-Series Matrix Preview with Linear Interpolation & 3-Sigma Outlier Highlighting */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Cleaned &amp; Interpolated Time-Series Matrix (Click Any Row to Set Live Snapshot Override)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="inline-block w-2 h-2 bg-amber-500 mr-1" />
                Amber Cell = Linearly Interpolated Gap
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                <span className="inline-block w-2 h-2 bg-rose-500 mr-1" />
                Rose Cell = Statistical Tail Outlier (|Z| ≥ 2.35σ)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">Live Snapshot</th>
                  <th className="py-2 px-2.5 font-semibold">Date / Period</th>
                  <th className="py-2 px-2.5 font-semibold">ISO-3</th>
                  {PREVIEW_NUMERIC_COLUMNS.map((col) => (
                    <th key={col.field} className="py-2 px-2 font-semibold text-right">
                      {col.shortLabel}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {col.unit}
                      </span>
                    </th>
                  ))}
                  <th className="py-2 px-2.5 font-semibold text-right">EWS P(Crisis)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                {cleanedDataset.rows.map((row, rIdx) => {
                  const isSelectedSnapshot = rIdx === clampedRowIdx;
                  const backtestPt = synthesizedEpisode.timeline[rIdx];
                  return (
                    <tr
                      key={row.rowIndex}
                      onClick={() => setSelectedSnapshotRowIdx(rIdx)}
                      className={`cursor-pointer transition-colors ${
                        isSelectedSnapshot
                          ? 'bg-blue-50/90 dark:bg-blue-950/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 font-sans">
                        <input
                          type="radio"
                          name="selectedCsvSnapshotRow"
                          checked={isSelectedSnapshot}
                          onChange={() => setSelectedSnapshotRowIdx(rIdx)}
                          className="accent-blue-600"
                        />
                        {isSelectedSnapshot && (
                          <span className="ml-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {row.observationDate}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400">
                        {row.iso3}
                      </td>
                      {PREVIEW_NUMERIC_COLUMNS.map((col) => {
                        const val = row.values[col.field];
                        const diag = row.cellDiagnostics[col.field];
                        const isInterp = diag.provenance === 'LINEAR_INTERPOLATED';
                        const isOutlier = diag.isOutlier3Sigma;

                        return (
                          <td
                            key={col.field}
                            title={
                              isInterp
                                ? `Linearly interpolated across missing observation (${col.shortLabel})`
                                : isOutlier
                                ? diag.outlierNote
                                : `Observed ${col.shortLabel} (Z = ${diag.zScore >= 0 ? '+' : ''}${diag.zScore}σ)`
                            }
                            className={`py-1.5 px-2 text-right ${
                              isOutlier
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold'
                                : isInterp
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {val.toFixed(col.decimals)}
                            {isInterp && (
                              <span className="ml-1 text-[9px] text-amber-600 dark:text-amber-400">
                                INT
                              </span>
                            )}
                            {isOutlier && (
                              <span className="ml-1 text-[9px] text-rose-600 dark:text-rose-400">
                                {diag.zScore >= 0 ? '+' : ''}
                                {diag.zScore}σ
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={`py-1.5 px-2.5 text-right font-bold ${
                          (backtestPt?.markovCrisisProbPct || 0) >= 35
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {backtestPt ? `${backtestPt.markovCrisisProbPct.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diagnostic Audit Log + Action Bar for Live Sovereign State & Custom Crisis Backtest */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Selected Live Snapshot Row:{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {selectedRow?.observationDate} ({selectedRow?.iso3})
              </span>{' '}
              · 5Y CDS: <span className="font-mono">{Math.round(selectedRow?.values.cds5YSpreadBps || 0)} bps</span> · 10Y Yield:{' '}
              <span className="font-mono">{selectedRow?.values.sovereign10YBondYieldPct.toFixed(2)}%</span> · Debt/GDP:{' '}
              <span className="font-mono">{selectedRow?.values.debtToGdpPct.toFixed(1)}%</span>
            </div>
            {cleanedDataset.diagnosticLog.length > 0 && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{cleanedDataset.diagnosticLog.slice(0, 2).join(' · ')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleApplyLiveStateOnly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Apply to Live {run.iso3} State &amp; Charts</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyBacktestOnly(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Launch in Crisis Replay &amp; Backtest Desk</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyBothLiveAndBacktest(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply to Both Live State + Crisis Replay Backtest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {lastAppliedFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{lastAppliedFeedback}</span>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODULE 2: QUALITATIVE POLICY DOCUMENT & IMF ARTICLE IV INGESTION LAB
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Deep Policy Research Context Window (Up to 2M Tokens via Google AI Studio)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Policy Document &amp; IMF Article IV Qualitative Ingestion Lab
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const summary = buildCsvPolicySummaryMarkdown(cleanedDataset);
                onChangePolicyDocText(
                  policyDocText ? `${policyDocText.trim()}\n\n${summary}` : summary
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Append CSV Quantitative Annex to Document</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer whitespace-nowrap shrink-0">
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload Policy Document (.txt / .md / .json)</span>
              <input
                type="file"
                accept=".txt,.md,.json"
                onChange={onDocumentFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Document Title / Provenance Citation (Tier 3 Primary Source)
            </label>
            <input
              type="text"
              value={policyDocTitle}
              onChange={(e) => onChangePolicyDocTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Full Policy Document Text / Central Bank Minutes / Diplomatic Cable Excerpt
            </label>
            <textarea
              rows={8}
              value={policyDocText}
              onChange={(e) => onChangePolicyDocText(e.target.value)}
              placeholder="Paste IMF Article IV Consultation Report, Central Bank Monetary Policy Committee minutes, sovereign debt restructuring term sheet, or diplomatic cable text here..."
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangePolicyDocTitle(`IMF Article IV Staff Report — ${run.countryName} Debt Annex`);
                  onChangePolicyDocText(
                    `IMF ARTICLE IV STAFF APPRAISAL (${run.countryName.toUpperCase()}): Gross public debt is projected at ${run.openData.imfIndicators.debtToGdpPct}% of GDP with a primary balance of ${run.openData.imfIndicators.primaryFiscalBalancePct}% of GDP. Staff assess sovereign risk as high unless credible medium-term fiscal consolidation of 1.5–2.0% of GDP is legislated prior to peak Eurobond maturities. External FX reserve coverage stands at ${run.openData.worldBankIndicators.fxReservesMonthsImport} months of imports.`
                  );
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Load Preset: IMF Article IV Debt Annex
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangePolicyDocTitle(
                    `Central Bank MPC Hawkish Dissent — ${run.countryName}`
                  );
                  onChangePolicyDocText(
                    `MONETARY POLICY COMMITTEE MINUTES (${run.countryName.toUpperCase()}): With headline CPI at ${run.openData.imfIndicators.cpiInflationPct}% and policy rates at ${run.openData.monetaryAndMarket.policyRatePct}%, two dissenting members warned that premature easing or unanchored fiscal spending could trigger rapid local-currency bond outflows and push 5Y CDS spreads above ${run.openData.monetaryAndMarket.cds5YSpreadBps + 125} bps.`
                  );
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Load Preset: Central Bank MPC Dissent
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangePolicyDocTitle(`Maritime & Chokepoint Security Flash Cable`);
                  onChangePolicyDocText(
                    `GEOPOLITICAL FLASH ASSESSMENT: Elevated naval and maritime insurance war-risk premiums across key shipping corridors threaten energy import bills and transit revenue. Chokepoint exposure index is currently ${run.openData.monetaryAndMarket.chokepointExposureIndex}/100.`
                  );
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Load Preset: Geopolitical Red Sea Cable
              </button>
            </div>

            <button
              type="button"
              onClick={onRunCouncilWithDocument}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Council Assessment with Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
