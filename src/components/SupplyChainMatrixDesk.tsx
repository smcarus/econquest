import React, { useMemo, useState } from 'react';
import {
  CouncilAssessmentRun,
  SupplyChainShockParams,
} from '../types/council';
import {
  CRITICAL_INPUT_CATALOG,
  DEFAULT_SUPPLY_CHAIN_SHOCKS,
  computeInstitutionalSupplyChainMatrix,
} from '../utils/supplyChainMatrixEngine';
import {
  RotateCcw,
  Cpu,
  Network,
  Clock,
  Globe2,
  Briefcase,
  AlertOctagon,
  ArrowUpRight,
  Sliders,
} from 'lucide-react';
import { StatRefBadge } from './StatRefTooltip';

interface SupplyChainMatrixDeskProps {
  run: CouncilAssessmentRun;
  onOpenGeopoliticalDesk?: () => void;
  onOpenPortfolioDesk?: () => void;
}

const DEPLETION_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'];

export const SupplyChainMatrixDesk: React.FC<SupplyChainMatrixDeskProps> = ({
  run,
  onOpenGeopoliticalDesk,
  onOpenPortfolioDesk,
}) => {
  const [shockParams, setShockParams] = useState<SupplyChainShockParams>(
    DEFAULT_SUPPLY_CHAIN_SHOCKS
  );
  const [embargoedInputIds, setEmbargoedInputIds] = useState<string[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const suite = useMemo(
    () =>
      computeInstitutionalSupplyChainMatrix(
        run.openData,
        shockParams,
        embargoedInputIds
      ),
    [run.openData, shockParams, embargoedInputIds]
  );

  const {
    leontiefSectors,
    leontiefMatrix,
    bilateralCriticalInputs,
    depletionTrajectories,
    ibSectorImpacts,
  } = suite;

  const toggleEmbargoInput = (id: string) => {
    setEmbargoedInputIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const applyPreset = (
    preset: 'baseline' | 'chip_ree_embargo' | 'chokepoint_siege' | 'full_supply_freeze'
  ) => {
    if (preset === 'baseline') {
      setShockParams(DEFAULT_SUPPLY_CHAIN_SHOCKS);
      setEmbargoedInputIds([]);
    } else if (preset === 'chip_ree_embargo') {
      setShockParams({
        upstreamExportQuotaCutPct: 55,
        maritimeRoutingDelayDays: 14,
        inventoryBurnMultiplier: 1.45,
        importSubstitutionElasticityPct: 15,
      });
      setEmbargoedInputIds(['logic_wafers_7nm', 'ndpr_rare_earths']);
    } else if (preset === 'chokepoint_siege') {
      setShockParams({
        upstreamExportQuotaCutPct: 40,
        maritimeRoutingDelayDays: 26,
        inventoryBurnMultiplier: 1.65,
        importSubstitutionElasticityPct: 10,
      });
      setEmbargoedInputIds(['refined_diesel_lng', 'npk_fertilizer_potash']);
    } else if (preset === 'full_supply_freeze') {
      setShockParams({
        upstreamExportQuotaCutPct: 75,
        maritimeRoutingDelayDays: 30,
        inventoryBurnMultiplier: 2.1,
        importSubstitutionElasticityPct: 5,
      });
      setEmbargoedInputIds(CRITICAL_INPUT_CATALOG.map((c) => c.id));
    }
  };

  // --- SVG GEOMETRY FOR 90-DAY STOCKPILE DEPLETION CHART ---
  const depW = 540;
  const depH = 225;
  const padL = 44;
  const padR = 24;
  const padT = 18;
  const padB = 30;
  const plotW = depW - padL - padR;
  const plotH = depH - padT - padB;
  const maxStockpileY = 70;

  const getDepX = (day: number) => padL + (day / 90) * plotW;
  const getDepY = (daysRemaining: number) =>
    padT + plotH - (Math.min(maxStockpileY, Math.max(0, daysRemaining)) / maxStockpileY) * plotH;

  const floor15Y = getDepY(15);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP CONTROL BAR: LEONTIEF SUPPLY-CHAIN & EXPORT-CONTROL SHOCK LAB
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              Sovereign Council Orchestrator of EconQuest · Supply Chain &amp; Leontief Input-Output Risk Engine
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {run.countryName} ({run.iso3}) — Institutional Supply Chain Matrix, Stockpile Depletion &amp; IB Sector Advisory
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPreset('baseline')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Baseline Flow</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('chip_ree_embargo')}
              className="px-2.5 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              Chip &amp; Rare-Earth Embargo
            </button>
            <button
              type="button"
              onClick={() => applyPreset('chokepoint_siege')}
              className="px-2.5 py-1.5 text-xs font-medium bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-300 hover:bg-orange-100 transition-colors whitespace-nowrap shrink-0"
            >
              LNG &amp; Fertilizer Siege (+26d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('full_supply_freeze')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
            >
              Full Strategic Supply Freeze
            </button>
            {onOpenGeopoliticalDesk && (
              <button
                type="button"
                onClick={onOpenGeopoliticalDesk}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>GDELT Alerts Map</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <StatRefBadge
          refText={`Statistical Reference: Leontief Inverse L = (I − A)⁻¹ · Mean Output Multiplier ${suite.aggregateLeontiefMultiplier.toFixed(2)}x · Stressed GVA Contraction ${suite.totalEconomyOutputContractionPctGdp}% GDP · Earliest Factory Halt Day ${suite.earliestProductionHaltDay} (15d Floor)`}
        />

        {/* 4 Interactive Supply-Chain Shock Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Upstream Export Quota Cut</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-red-600 dark:text-red-400">
                -{shockParams.upstreamExportQuotaCutPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={shockParams.upstreamExportQuotaCutPct}
              onChange={(e) =>
                setShockParams((prev) => ({
                  ...prev,
                  upstreamExportQuotaCutPct: Number(e.target.value),
                }))
              }
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% Normal</span>
              <span>40% Quota</span>
              <span>80% Embargo</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Maritime Rerouting Lag</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                +{shockParams.maritimeRoutingDelayDays} Days
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={2}
              value={shockParams.maritimeRoutingDelayDays}
              onChange={(e) =>
                setShockParams((prev) => ({
                  ...prev,
                  maritimeRoutingDelayDays: Number(e.target.value),
                }))
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0d Direct</span>
              <span>14d Cape</span>
              <span>30d Blockade</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Inventory Burn Velocity</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-purple-600 dark:text-purple-400">
                {shockParams.inventoryBurnMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={shockParams.inventoryBurnMultiplier}
              onChange={(e) =>
                setShockParams((prev) => ({
                  ...prev,
                  inventoryBurnMultiplier: Number(e.target.value),
                }))
              }
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.5x Rationed</span>
              <span>1.25x Base</span>
              <span>2.5x Surge</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Import Substitution Speed</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                {shockParams.importSubstitutionElasticityPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={shockParams.importSubstitutionElasticityPct}
              onChange={(e) =>
                setShockParams((prev) => ({
                  ...prev,
                  importSubstitutionElasticityPct: Number(e.target.value),
                }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% Rigid</span>
              <span>30% Dual-Source</span>
              <span>60% Reshored</span>
            </div>
          </div>
        </div>

        {/* Per-Input Embargo Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Targeted Critical Input Embargo Toggles:</span>
          </span>
          {CRITICAL_INPUT_CATALOG.map((item) => {
            const active = embargoedInputIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleEmbargoInput(item.id)}
                className={`px-2.5 py-1 text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-red-600 border-red-600 text-white font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-400'
                }`}
              >
                {active ? `EMBARGOED: ${item.label}` : item.label}
              </button>
            );
          })}
        </div>

        {/* 6-KPI Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Mean Leontief (I − A)⁻¹
            </div>
            <div className="text-lg font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {suite.aggregateLeontiefMultiplier.toFixed(2)}x
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              6-Sector Inter-Industry
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Stressed GVA Contraction
            </div>
            <div className="text-lg font-mono tabular-nums font-bold text-red-600 dark:text-red-400 mt-0.5">
              {suite.totalEconomyOutputContractionPctGdp}% GDP
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Cascade Output Loss
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Producer Price (PPI) Spike
            </div>
            <div className="text-lg font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              +{suite.totalSupplyChainPpiPassThroughBps} bps
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Upstream Input Cost
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Earliest Factory Halt (T*)
            </div>
            <div
              className={`text-lg font-mono tabular-nums font-bold mt-0.5 ${
                suite.earliestProductionHaltDay <= 25
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Day {suite.earliestProductionHaltDay}
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate">
              {suite.mostVulnerableInputLabel}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              IB Working-Capital Need
            </div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              ${suite.totalIbWorkingCapitalNeedUsdMillions.toLocaleString()}M
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Buffer Inventory RCF
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Active Input Embargoes
            </div>
            <div className="text-lg font-mono tabular-nums font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              {embargoedInputIds.length} / 5 Inputs
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Sub Elasticity: {shockParams.importSubstitutionElasticityPct}%
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODULE 1 & 2: LEONTIEF (I - A)^-1 INTER-INDUSTRY MATRIX + 90-DAY STOCKPILE DEPLETION
          ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: 6x6 Leontief Input-Output Inter-Industry Heatmap Matrix (7 cols) */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Leontief Inverse (I − A)⁻¹ Inter-Industry Cascade Matrix (6 × 6 Domestic Sectors)
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {suite.leontiefConclusionHeadline}
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500">
                  <th className="py-2 px-2">Supplier \ Consumer</th>
                  {leontiefSectors.map((s) => (
                    <th key={s.sectorId} className="py-2 px-2 text-center">
                      {s.shortCode}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-right">Fwd Lᵢ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
                {leontiefSectors.map((sup) => {
                  const isRowSelected = selectedSectorId === sup.sectorId;
                  return (
                    <tr
                      key={sup.sectorId}
                      onClick={() =>
                        setSelectedSectorId((prev) =>
                          prev === sup.sectorId ? null : sup.sectorId
                        )
                      }
                      className={`cursor-pointer ${
                        isRowSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="py-2 px-2 font-sans text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {sup.shortCode}
                        <span className="block text-[10px] font-normal text-slate-500">
                          Import: {sup.importedInputReliancePct}%
                        </span>
                      </td>
                      {leontiefSectors.map((con) => {
                        const cell = leontiefMatrix.find(
                          (c) =>
                            c.supplierSectorId === sup.sectorId &&
                            c.consumingSectorId === con.sectorId
                        );
                        if (!cell) return <td key={con.sectorId} />;
                        const cellBg =
                          cell.tier === 'CRITICAL'
                            ? 'bg-red-100/80 dark:bg-red-950/70 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800'
                            : cell.tier === 'HIGH'
                            ? 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                            : cell.tier === 'MODERATE'
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
                        return (
                          <td
                            key={con.sectorId}
                            className={`p-1.5 text-center border ${cellBg}`}
                          >
                            <div className="text-[11px] font-bold tabular-nums">
                              a={cell.directTechnicalCoeffAij.toFixed(2)}
                            </div>
                            <div className="text-[9.5px] opacity-85 tabular-nums">
                              L={cell.totalRequirementMultiplierLij.toFixed(2)}x
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-right font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {sup.forwardLinkageMultiplier.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
              <span>
                <strong>Forward Cascade Multipliers:</strong> Power Grid/Utilities and Refining/Logistics exhibit the highest forward Leontief multipliers, propagating upstream energy or transformer shortages across all downstream industries.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 font-bold">•</span>
              <span>
                <strong>Imported Input Bottleneck:</strong> Tech/Semiconductors ({leontiefSectors[0].importedInputReliancePct}% import reliance) and Auto/Aerospace ({leontiefSectors[2].importedInputReliancePct}% import reliance) suffer the steepest GVA contraction under quota cuts.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
              <span>
                <strong>Second-Round PPI Amplification:</strong> Indirect $(I - A)^{-1}$ requirements add +{suite.totalSupplyChainPpiPassThroughBps} bps to domestic producer prices.
              </span>
            </li>
          </ul>
        </div>

        {/* Right: 90-Day Stockpile Depletion Countdown & Production Halt Horizon Curve (5 cols) */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>
                Stockpile Depletion Countdown &amp; Production Halt Horizon (Days 0 to 90)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {suite.mostVulnerableInputLabel} breaches the 15-Day Operational Floor first, reaching complete buffer exhaustion by Day {suite.earliestProductionHaltDay}.
            </h3>
          </div>

          <svg
            viewBox={`0 0 ${depW} ${depH}`}
            className="w-full h-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            role="img"
            aria-label="90-Day Stockpile Depletion Countdown Chart"
          >
            {/* Critical 15-Day Minimum Operational Floor Zone */}
            <rect
              x={padL}
              y={floor15Y}
              width={plotW}
              height={padT + plotH - floor15Y}
              fill="#ef4444"
              fillOpacity={0.14}
            />
            <line
              x1={padL}
              y1={floor15Y}
              x2={padL + plotW}
              y2={floor15Y}
              stroke="#ef4444"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
            <text
              x={padL + 6}
              y={floor15Y - 4}
              className="text-[9px] font-mono font-bold fill-red-600 dark:fill-red-400"
            >
              15-DAY CRITICAL ASSEMBLY CURTAILMENT FLOOR
            </text>

            {/* Axes */}
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke="#64748b"
              strokeWidth={1.2}
            />
            <line
              x1={padL}
              y1={padT}
              x2={padL}
              y2={padT + plotH}
              stroke="#64748b"
              strokeWidth={1.2}
            />

            {[0, 15, 30, 45, 60, 75, 90].map((d) => {
              const x = getDepX(d);
              return (
                <g key={d}>
                  <line
                    x1={x}
                    y1={padT + plotH}
                    x2={x}
                    y2={padT + plotH + 4}
                    stroke="#64748b"
                  />
                  <text
                    x={x}
                    y={padT + plotH + 15}
                    textAnchor="middle"
                    className="text-[9.5px] font-mono fill-slate-500"
                  >
                    D+{d}
                  </text>
                </g>
              );
            })}

            {/* Plot each of the 5 Critical Input Depletion Trajectories */}
            {depletionTrajectories.map((series, idx) => {
              const color = DEPLETION_COLORS[idx % DEPLETION_COLORS.length];
              const polyPts = series.points
                .map((pt) => `${getDepX(pt.day)},${getDepY(pt.remainingDaysBuffer)}`)
                .join(' ');
              const lastPt = series.points[series.points.length - 1];
              return (
                <g key={series.inputId}>
                  <polyline
                    points={polyPts}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.2}
                  />
                  <circle
                    cx={getDepX(lastPt.day)}
                    cy={getDepY(lastPt.remainingDaysBuffer)}
                    r={3.2}
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>

          {/* Legend & Depletion Day Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {depletionTrajectories.map((series, idx) => (
              <div
                key={series.inputId}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 inline-block shrink-0"
                    style={{ backgroundColor: DEPLETION_COLORS[idx % DEPLETION_COLORS.length] }}
                  />
                  <span className="truncate text-slate-800 dark:text-slate-200">
                    {series.inputLabel}
                  </span>
                </span>
                <span
                  className={`font-bold shrink-0 ml-2 ${
                    series.stressedDepletionHorizonDay <= 30
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Halt: D+{series.stressedDepletionHorizonDay}
                </span>
              </div>
            ))}
          </div>

          <ul className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 font-bold">•</span>
              <span>
                <strong>Just-in-Time Semiconductor Fragility:</strong> Logic wafers (&lt;7nm) begin at 24 days of buffer and cross the 15-day curtailment floor within 2 weeks under an export freeze.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
              <span>
                <strong>HV Grid Transformer Lead Times:</strong> Sub-station IGBT and HVDC transformer stocks deplete by Day {depletionTrajectories[2].stressedDepletionHorizonDay} with a 28–36 month replacement lag.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
              <span>
                <strong>Substitution Mitigation:</strong> Raising Import Substitution Elasticity via dual-sourcing extends production halt horizons by +12 to +22 days.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* =====================================================================
          MODULE 3: BILATERAL COUNTRY-TO-COUNTRY CRITICAL INPUT & EXPORT CONTROL MATRIX
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Bilateral Country-to-Country Critical Input Dependency, Supplier HHI &amp; Export-Control Regime Matrix
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Sovereign Bilateral Supply Corridors, Substitution Lag (Months) &amp; Counter-Retaliation Leverage ({run.countryName})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 shrink-0">
            HHI &gt; 4,000 = Sovereign Monopoly Supplier Choke
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3">Partner Country / Supplier Bloc</th>
                <th className="py-2.5 px-3">Critical Inputs &amp; Export-Control Regime</th>
                <th className="py-2.5 px-3 text-right">Import Share</th>
                <th className="py-2.5 px-3 text-right">Supplier HHI</th>
                <th className="py-2.5 px-3 text-right">Substitution Lag</th>
                <th className="py-2.5 px-3 text-right">Retaliation Leverage</th>
                <th className="py-2.5 px-3 text-right">Import Bill Delta</th>
                <th className="py-2.5 px-3 text-center">Choke Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {bilateralCriticalInputs.map((row) => (
                <tr
                  key={row.corridorId}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {row.partnerCountryOrBloc}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      {row.criticalInputsSupplied}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Regime: {row.exportControlRegime}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                    {row.sovereignImportSharePct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                    {row.globalSupplierHhi.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {row.domesticSubstitutionLagMonths} mos
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                    {row.bilateralRetaliationLeverageScore}/100
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                    +${row.stressedAnnualImportBillDeltaUsdBn}B/yr
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold border ${
                        row.riskClassification === 'MONOPOLY_CHOKE'
                          ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                          : row.riskClassification === 'STRATEGIC_DEPENDENCY'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {row.riskClassification.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          MODULE 4: INVESTMENT BANKING SECTOR EQUITY, CREDIT SPREAD & CAPEX M&A TABLE
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Investment Banking &amp; Hedge Fund Sector Translation · Corporate Margin, HY/IG Credit Spread, EV/EBITDA &amp; M&amp;A Capex Advisory
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Sector-Level Corporate Credit, Valuation Multiple Compression &amp; Strategic M&amp;A / Nearshoring Mandates
            </h3>
          </div>
          {onOpenPortfolioDesk && (
            <button
              type="button"
              onClick={onOpenPortfolioDesk}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 whitespace-nowrap shrink-0"
            >
              <span>Open Portfolio VaR &amp; Tail Risk Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3">Domestic Industry Sector</th>
                <th className="py-2.5 px-3 text-right">EBITDA Margin</th>
                <th className="py-2.5 px-3 text-right">Corp Credit Spread</th>
                <th className="py-2.5 px-3 text-right">EV/EBITDA Impact</th>
                <th className="py-2.5 px-3 text-right">WC Facility Need</th>
                <th className="py-2.5 px-3">Investment Banking Capex / M&amp;A Mandate &amp; Hedge Fund Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {ibSectorImpacts.map((row) => (
                <tr
                  key={row.sectorId}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {row.sectorName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                    -{row.ebitdaMarginCompressionBps} bps
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                    +{row.corporateCreditSpreadWideningBps} bps
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                    {row.evToEbitdaMultipleImpactPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    ${row.workingCapitalFacilityNeedUsdMillions}M
                  </td>
                  <td className="py-2.5 px-3 space-y-1">
                    <div className="text-slate-800 dark:text-slate-200">
                      <strong className="text-blue-600 dark:text-blue-400">IB Advisory: </strong>
                      {row.ibCapexAndMaAdvisoryMandate}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      <strong>HF Expression: </strong>
                      {row.hedgeFundTradeExpression}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
