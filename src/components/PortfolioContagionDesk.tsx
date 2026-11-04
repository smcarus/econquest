import React, { useMemo, useState } from 'react';
import {
  CouncilAssessmentRun,
  GeopoliticalWargameParams,
  PortfolioExpressionType,
  PortfolioPositionItem,
  WatchlistItem,
} from '../types/council';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import {
  PORTFOLIO_BASKET_PRESETS,
  PortfolioBasketPresetId,
  computeMultiSovereignContagionBook,
} from '../utils/portfolioAndBacktestEngine';
import { PortfolioTailRiskDesk } from './PortfolioTailRiskDesk';
import { StatRefBadge, RichTextWithStatRefs } from './StatRefTooltip';
import {
  Network,
  Flame,
  Layers,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface PortfolioContagionDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems: WatchlistItem[];
  onSelectSovereign?: (item: WatchlistItem) => void;
  propagatedGeoWargameParams?: GeopoliticalWargameParams;
  isGeoPropagationActive?: boolean;
  onOpenGeopoliticalDesk?: () => void;
  /** The user's imported holdings, mapped to one position per country. */
  holdingsBook?: { positions: PortfolioPositionItem[]; navUsdMm: number; skipped: string[] };
}

const EXPRESSION_LABELS: Record<PortfolioExpressionType, string> = {
  LOCAL_RATES_RECEIVER: 'Receive 5Y/10Y Local Rates',
  USD_EUROBOND_LONG: 'Long 10Y USD Eurobond',
  CDS_5Y_PROTECTION: 'Buy 5Y Sovereign CDS Protection',
  CURVE_2S10S_STEEPENER: '2s10s Local Curve Steepener',
  FX_HEDGED_LOCAL_CARRY: 'FX-Hedged Local Bond Carry',
};

export const PortfolioContagionDesk: React.FC<PortfolioContagionDeskProps> = ({
  run,
  watchlistItems,
  onSelectSovereign,
  propagatedGeoWargameParams,
  isGeoPropagationActive,
  onOpenGeopoliticalDesk,
  holdingsBook,
}) => {
  const hasHoldings = !!holdingsBook && holdingsBook.positions.length > 0;
  const [selectedPresetId, setSelectedPresetId] = useState<PortfolioBasketPresetId | 'HOLDINGS'>(
    hasHoldings ? 'HOLDINGS' : 'EM_HIGH_CARRY_CORE'
  );
  const [positions, setPositions] = useState<PortfolioPositionItem[]>(() =>
    hasHoldings ? holdingsBook!.positions.map((p) => ({ ...p })) : PORTFOLIO_BASKET_PRESETS[0].positions
  );
  const [epicenterIso3, setEpicenterIso3] = useState<string>(() => run.iso3);
  const [epicenterShockBps, setEpicenterShockBps] = useState<number>(250);
  const [portfolioNavUsdM, setPortfolioNavUsdM] = useState<number>(hasHoldings ? holdingsBook!.navUsdMm : 250);

  const handleLoadHoldings = () => {
    if (!holdingsBook || !holdingsBook.positions.length) return;
    setSelectedPresetId('HOLDINGS');
    setPositions(holdingsBook.positions.map((p) => ({ ...p })));
    setPortfolioNavUsdM(holdingsBook.navUsdMm);
  };
  const [channelView, setChannelView] = useState<'OMEGA_TOTAL' | 'TRADE' | 'BANK' | 'USD_BETA'>('OMEGA_TOTAL');

  const handleLoadPreset = (presetId: PortfolioBasketPresetId) => {
    const found = PORTFOLIO_BASKET_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(presetId);
    setPositions(found.positions.map((p) => ({ ...p })));
  };

  const handleAddCountryPosition = (iso3: string) => {
    if (positions.some((p) => p.iso3 === iso3)) return;
    const cat = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3);
    if (!cat) return;
    setPositions((prev) => [
      ...prev,
      {
        iso3: cat.iso3,
        countryName: cat.countryName,
        currencyCode: cat.currencyCode,
        expressionType: 'USD_EUROBOND_LONG',
        weightNavPct: 15,
      },
    ]);
  };

  const handleRemovePosition = (iso3: string) => {
    if (positions.length <= 2) return;
    setPositions((prev) => prev.filter((p) => p.iso3 !== iso3));
  };

  const handleUpdatePositionWeight = (iso3: string, weightNavPct: number) => {
    setPositions((prev) =>
      prev.map((p) => (p.iso3 === iso3 ? { ...p, weightNavPct } : p))
    );
  };

  const handleUpdateExpression = (iso3: string, expressionType: PortfolioExpressionType) => {
    setPositions((prev) =>
      prev.map((p) => (p.iso3 === iso3 ? { ...p, expressionType } : p))
    );
  };

  const contagionSuite = useMemo(
    () =>
      computeMultiSovereignContagionBook(
        run,
        positions,
        epicenterIso3,
        epicenterShockBps,
        portfolioNavUsdM
      ),
    [run, positions, epicenterIso3, epicenterShockBps, portfolioNavUsdM]
  );

  const uniqueIsosInMatrix = useMemo(
    () => Array.from(new Set([epicenterIso3, ...positions.map((p) => p.iso3)])),
    [epicenterIso3, positions]
  );

  const availableToAdd = useMemo(
    () => SOVEREIGN_CATALOG.filter((c) => !positions.some((p) => p.iso3 === c.iso3)),
    [positions]
  );

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SECTION 1: MULTI-SOVEREIGN CONTAGION SIMULATOR & BASKET PRESET WORKBENCH
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Network className="w-3.5 h-3.5" />
              <span>Contagion book · bilateral spillover Ω(i→j) &amp; risk attribution</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Multi-Country Sovereign Book &amp; Cross-Border Contagion Cascade Simulator
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasHoldings && (
              <button
                type="button"
                onClick={handleLoadHoldings}
                aria-pressed={selectedPresetId === 'HOLDINGS'}
                className="ui-pill"
                title={holdingsBook!.skipped.length ? `Not modelled (no country data): ${holdingsBook!.skipped.join(', ')}` : undefined}
              >
                Your holdings
              </button>
            )}
            {PORTFOLIO_BASKET_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset.id)}
                aria-pressed={selectedPresetId === preset.id}
                className="ui-pill whitespace-nowrap shrink-0"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Plain-English Conclusion Headline & Interactive Statistical Ref Badge */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
            <RichTextWithStatRefs text={contagionSuite.headlinePlainEnglish} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatRefBadge
              refText={`Statistical Reference: Contagion Spillover Ω(${contagionSuite.epicenterIso3}→${contagionSuite.mostVulnerableTargetIso3}) = ${contagionSuite.maxBilateralOmega.toFixed(2)} · Correlated CVaR(99%) = ${contagionSuite.correlatedCvar99PctNav.toFixed(2)}% NAV · Contagion-Stressed CVaR(99%) = ${contagionSuite.contagionStressedCvar99PctNav.toFixed(2)}% NAV`}
            />
            <StatRefBadge
              refText={`Ref: Undiversified CVaR(99%) = ${contagionSuite.undiversifiedCvar99PctNav.toFixed(2)}% NAV · Diversification Benefit = -${contagionSuite.diversificationBenefitPct.toFixed(1)}% · Epicenter Cascade PnL = ${contagionSuite.totalEpicenterCascadePnlUsdThousands >= 0 ? '+' : ''}$${contagionSuite.totalEpicenterCascadePnlUsdThousands}k`}
            />
          </div>
        </div>

        {/* Epicenter Shock Controls & Book Capital Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Contagion Epicenter Sovereign (Source i)</span>
            </label>
            <select
              value={epicenterIso3}
              onChange={(e) => setEpicenterIso3(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              {SOVEREIGN_CATALOG.map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.countryName} ({c.iso3} · 5Y CDS {c.cds5YBps} bps)
                </option>
              ))}
            </select>
            <span className="block text-xs text-slate-500 mt-1">
              Simulates an acute sovereign spread blowout originating in {contagionSuite.epicenterCountryName}.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Epicenter 5Y Spread Shock (Δs_i)
              </span>
              <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                +{epicenterShockBps} bps
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={600}
              step={25}
              value={epicenterShockBps}
              onChange={(e) => setEpicenterShockBps(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>+50 bps (Moderate)</span>
              <span>+250 bps (Severe)</span>
              <span>+600 bps (Sudden Stop)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Book Capital (NAV) &amp; Add Sovereign
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                ${portfolioNavUsdM}M NAV ({contagionSuite.grossExposurePctNav}% Gross)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddCountryPosition(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="" disabled>
                  + Add Sovereign to Book ({availableToAdd.length} available)...
                </option>
                {availableToAdd.map((c) => (
                  <option key={c.iso3} value={c.iso3}>
                    {c.countryName} ({c.iso3})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => (selectedPresetId === 'HOLDINGS' ? handleLoadHoldings() : handleLoadPreset(selectedPresetId))}
                title="Reset Basket Weights"
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 5-KPI Contagion & Correlated Tail Risk Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Undiversified Sum CVaR₉₉</span>
            <span className="text-base font-semibold tabular-nums text-slate-700 dark:text-slate-300">
              {contagionSuite.undiversifiedCvar99PctNav.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Assuming ρ = 1.00
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Correlated Book CVaR₉₉</span>
            <span className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {contagionSuite.correlatedCvar99PctNav.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block tabular-nums">
              Diversification: -{contagionSuite.diversificationBenefitPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Contagion-Stressed CVaR₉₉</span>
            <span className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {contagionSuite.contagionStressedCvar99PctNav.toFixed(2)}% NAV
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              Post-{contagionSuite.epicenterIso3} +{epicenterShockBps}bp Cascade
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Peak Bilateral Contagion Ω</span>
            <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              Ω = {contagionSuite.maxBilateralOmega.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              {contagionSuite.epicenterIso3} → {contagionSuite.mostVulnerableTargetIso3}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block">Net Contagion Cascade PnL</span>
            <span
              className={`text-base font-semibold tabular-nums tabular-nums ${
                contagionSuite.totalEpicenterCascadePnlUsdThousands >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {contagionSuite.totalEpicenterCascadePnlUsdThousands >= 0 ? '+' : ''}$
              {contagionSuite.totalEpicenterCascadePnlUsdThousands.toLocaleString()}k
            </span>
            <span className="text-xs text-slate-400 block tabular-nums">
              ({contagionSuite.totalEpicenterCascadePnlPctNav >= 0 ? '+' : ''}
              {contagionSuite.totalEpicenterCascadePnlPctNav}% NAV)
            </span>
          </div>
        </div>

        {/* Grid: Left 7 Cols Position Spillover & MCTR Table | Right 5 Cols N×N Bilateral Contagion Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Editable Book Positions, Transmitted Contagion Shock & MCTR */}
          <div className="xl:col-span-7 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Position-Level Contagion Transmission &amp; Marginal Risk Attribution (MCTR)
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                Epicenter: {contagionSuite.epicenterIso3} (+{epicenterShockBps} bps)
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/60">
                  <th className="py-2 px-2.5">Sovereign</th>
                  <th className="py-2 px-2.5">Trade Expression</th>
                  <th className="py-2 px-2.5">Weight (% NAV)</th>
                  <th className="py-2 px-2.5 text-right">Ω(i→j)</th>
                  <th className="py-2 px-2.5 text-right">ΔSpread / ΔFX</th>
                  <th className="py-2 px-2.5 text-right">Cascade PnL</th>
                  <th className="py-2 px-2.5 text-right">MCTR / Share</th>
                  <th className="py-2 px-2 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {contagionSuite.positionImpacts.map((pos) => {
                  const isEpicenter = pos.iso3 === epicenterIso3;
                  return (
                    <tr
                      key={pos.iso3}
                      className={
                        isEpicenter
                          ? 'bg-rose-50/50 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-950/50'
                      }
                    >
                      <td className="py-2.5 px-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const item = SOVEREIGN_CATALOG.find((c) => c.iso3 === pos.iso3);
                            if (item && onSelectSovereign) onSelectSovereign(item);
                          }}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                        >
                          {pos.countryName} ({pos.iso3})
                        </button>
                        <span className="block text-xs tabular-nums text-slate-400">
                          ${pos.notionalUsdMillions.toFixed(1)}M · {pos.currencyCode}
                          {isEpicenter ? ' · EPICENTER' : ''}
                        </span>
                      </td>

                      <td className="py-2.5 px-2.5">
                        <select
                          value={pos.expressionType}
                          onChange={(e) =>
                            handleUpdateExpression(
                              pos.iso3,
                              e.target.value as PortfolioExpressionType
                            )
                          }
                          className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 max-w-[165px]"
                        >
                          {Object.entries(EXPRESSION_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={5}
                            max={50}
                            step={5}
                            value={pos.weightNavPct}
                            onChange={(e) =>
                              handleUpdatePositionWeight(pos.iso3, Number(e.target.value))
                            }
                            className="w-16 accent-blue-600 cursor-pointer"
                          />
                          <span className="tabular-nums font-semibold w-8 text-right">
                            {pos.weightNavPct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {pos.omegaFromEpicenter.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        <div>+{pos.transmittedSpreadWideningBps}bp</div>
                        <div className="text-xs text-rose-500">
                          FX -{pos.transmittedFxDeprPct}%
                        </div>
                      </td>

                      <td
                        className={`py-2.5 px-2.5 text-right tabular-nums font-semibold tabular-nums ${
                          pos.stressedPositionPnlUsdThousands >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        <div>
                          {pos.stressedPositionPnlUsdThousands >= 0 ? '+' : ''}$
                          {pos.stressedPositionPnlUsdThousands}k
                        </div>
                        <div className="text-xs font-normal">
                          ({pos.stressedPositionPnlPctNav >= 0 ? '+' : ''}
                          {pos.stressedPositionPnlPctNav}% NAV)
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 text-right tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {pos.mctrPctNav.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-500">
                          {pos.riskSharePct.toFixed(1)}% Risk
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={positions.length <= 2}
                          onClick={() => handleRemovePosition(pos.iso3)}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                          title="Remove position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right 5 Cols: Interactive N×N Bilateral Contagion Matrix Heatmap */}
          <div className="xl:col-span-5 border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Bilateral Contagion Transmission Matrix Ω(i→j)
                </div>
                <div className="text-xs text-slate-500">
                  Row = Shock Source (i) · Col = Destination (j)
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs">
                {[
                  { id: 'OMEGA_TOTAL', label: 'Composite Ω' },
                  { id: 'TRADE', label: 'Trade T_ij' },
                  { id: 'BANK', label: 'BIS Bank B_ij' },
                  { id: 'USD_BETA', label: 'USD β_ij' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChannelView(tab.id as any)}
                    className={`px-2 py-0.5 font-medium transition-colors ${
                      channelView === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-1.5 px-2 text-left">Src \ Dst</th>
                    {uniqueIsosInMatrix.map((dst) => (
                      <th key={dst} className="py-1.5 px-2">
                        {dst}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {uniqueIsosInMatrix.map((src) => (
                    <tr key={src}>
                      <td className="py-2 px-2 text-left font-semibold text-slate-800 dark:text-slate-200">
                        {src}
                      </td>
                      {uniqueIsosInMatrix.map((dst) => {
                        const cell = contagionSuite.bilateralMatrix.find(
                          (c) => c.sourceIso3 === src && c.targetIso3 === dst
                        );
                        const val =
                          channelView === 'TRADE'
                            ? cell?.tradeChannelWeight ?? 0
                            : channelView === 'BANK'
                            ? cell?.bisBankingChannelWeight ?? 0
                            : channelView === 'USD_BETA'
                            ? cell?.usdFundingBetaWeight ?? 0
                            : cell?.omegaTotalElasticity ?? 0;

                        const isDiag = src === dst;
                        const bgClass = isDiag
                          ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-400'
                          : val >= 0.45
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold'
                          : val >= 0.30
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

                        return (
                          <td
                            key={dst}
                            onClick={() => setEpicenterIso3(src)}
                            title={`Click to set ${src} as contagion epicenter · Transmitted shock to ${dst}: +${cell?.transmittedSpreadShockBps ?? 0} bps`}
                            className={`py-2 px-2 cursor-pointer transition-colors ${bgClass}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p>
                • <strong>How to Read This Matrix</strong>: Each cell shows the fraction of a credit shock in row country <em>i</em> that spills over into column country <em>j</em> via bilateral trade (30%), BIS cross-border banking claims (32%), and shared USD funding beta (38%).
              </p>
              <StatRefBadge
                refText={`Ref: Bilateral Spillover Ω(i→j) = 0.30·T_ij + 0.32·B_ij + 0.38·ρ_USD · Peak Ω = ${contagionSuite.maxBilateralOmega.toFixed(2)}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: DEEP-DIVE PORTFOLIO TAIL-RISK, KEY-RATE DV01, CAC & KELLY DESK
          ===================================================================== */}
      <PortfolioTailRiskDesk
        run={run}
        watchlistItems={watchlistItems}
        onSelectSovereign={onSelectSovereign}
        propagatedGeoWargameParams={propagatedGeoWargameParams}
        isGeoPropagationActive={isGeoPropagationActive}
        onOpenGeopoliticalDesk={onOpenGeopoliticalDesk}
      />
    </div>
  );
};
