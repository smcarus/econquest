import React, { useMemo, useState } from 'react';
import {
  CouncilAssessmentRun,
  GeopoliticalWargameParams,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_WARGAME_PARAMS,
  computeGeopoliticalRiskDeskSuite,
} from '../utils/geopoliticalRiskEngine';
import {
  Compass,
  Layers,
  ShieldAlert,
  Sliders,
  ArrowUpRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Globe,
} from 'lucide-react';
import { StatRefBadge } from './StatRefTooltip';
import {
  WorldCountryVectorLayer,
  CountryMapFeatureInfo,
  REGIONAL_THEATER_PRESETS,
  RegionalTheaterPreset,
} from './WorldCountryVectorLayer';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';

interface HeroGeopoliticalMapCardProps {
  run: CouncilAssessmentRun;
  watchlistItems?: WatchlistItem[];
  wargameParams: GeopoliticalWargameParams;
  onChangeWargameParams: (next: GeopoliticalWargameParams) => void;
  onOpenGeopoliticalDesk: () => void;
  onOpenSupplyChainMatrix: () => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
}

const MAP_W = 880;
const MAP_H = 390;

function projectLatLon(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((75 - Math.max(-60, Math.min(75, lat))) / 135) * MAP_H;
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

export const HeroGeopoliticalMapCard: React.FC<HeroGeopoliticalMapCardProps> = ({
  run,
  watchlistItems = SOVEREIGN_CATALOG,
  wargameParams,
  onChangeWargameParams,
  onOpenGeopoliticalDesk,
  onOpenSupplyChainMatrix,
  onSelectSovereign,
}) => {
  const [showLayerGdeltNodes, setShowLayerGdeltNodes] = useState<boolean>(true);
  const [showLayerChokepoints, setShowLayerChokepoints] = useState<boolean>(true);
  const [showLayerSubseaCables, setShowLayerSubseaCables] = useState<boolean>(true);
  const [showLayerTradeCorridors, setShowLayerTradeCorridors] = useState<boolean>(true);
  const [showRiskChoropleth, setShowRiskChoropleth] = useState<boolean>(true);

  const [selectedChokepointId, setSelectedChokepointId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryMapFeatureInfo | null>(null);

  // Interactive Zoom, Pan & Regional Theater State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panCenter, setPanCenter] = useState<{ x: number; y: number }>({
    x: MAP_W / 2,
    y: MAP_H / 2,
  });
  const [activeTheaterId, setActiveTheaterId] =
    useState<RegionalTheaterPreset['id']>('GLOBAL');
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const suite = useMemo(
    () => computeGeopoliticalRiskDeskSuite(run.openData, wargameParams),
    [run.openData, wargameParams]
  );

  const {
    sovereignCoord,
    chokepoints,
    osintEvents,
    subseaCableRoutes,
    bilateralTradeCorridors,
    gprAndEscalation,
  } = suite;

  const sovPt = projectLatLon(sovereignCoord.lat, sovereignCoord.lon);

  const selectedChokepoint = useMemo(
    () =>
      chokepoints.find((c) => c.corridorId === selectedChokepointId) ||
      chokepoints[0],
    [chokepoints, selectedChokepointId]
  );

  const selectedEvent = useMemo(
    () => osintEvents.find((e) => e.eventId === selectedEventId) || null,
    [osintEvents, selectedEventId]
  );

  const isStressedPreset =
    wargameParams.chokepointClosureSeverityPct !== DEFAULT_WARGAME_PARAMS.chokepointClosureSeverityPct ||
    wargameParams.tariffEscalationPct !== DEFAULT_WARGAME_PARAMS.tariffEscalationPct ||
    wargameParams.cyberHybridIntensityPct !== DEFAULT_WARGAME_PARAMS.cyberHybridIntensityPct;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      {/* Header Bar: Kicker, Headline Conclusion, Quick Wargame Shock Presets & Deep-Dive Links */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-y-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Interactive Geospatial Intelligence Map
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Epicenter: {sovereignCoord.capitalLabel} ({run.iso3})</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Composite GPR Z-Score: {gprAndEscalation.compositeGprZScore >= 0 ? '+' : ''}{gprAndEscalation.compositeGprZScore.toFixed(2)}σ
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                Expected 5Y CDS Impact: +{gprAndEscalation.expectedProbabilityWeightedCdsDeltaBps} bps
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 text-balance">
              Global Maritime Chokepoints, Bilateral Trade Corridors &amp; Live GDELT Conflict Map ({run.countryName})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSupplyChainMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <span>Supply-Chain Matrix</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenGeopoliticalDesk}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              <span>Full Geopolitical Wargaming Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Layer Controls + Instant Scenario Wargame Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Map Layer Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Map Layers:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowLayerGdeltNodes((v) => !v)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                showLayerGdeltNodes
                  ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              GDELT Conflict Nodes ({osintEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setShowLayerChokepoints((v) => !v)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                showLayerChokepoints
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              Maritime Chokepoints ({chokepoints.length})
            </button>
            <button
              type="button"
              onClick={() => setShowLayerTradeCorridors((v) => !v)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                showLayerTradeCorridors
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              Trade &amp; Tariff Corridors ({bilateralTradeCorridors.length})
            </button>
            <button
              type="button"
              onClick={() => setShowLayerSubseaCables((v) => !v)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                showLayerSubseaCables
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              Subsea Fiber Cables ({subseaCableRoutes.length})
            </button>
            <button
              type="button"
              onClick={() => setShowRiskChoropleth((v) => !v)}
              className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                showRiskChoropleth
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              Sovereign Risk Choropleth
            </button>
          </div>

          {/* Quick Shock Wargame Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Quick Stress Test:</span>
            </span>
            <button
              type="button"
              onClick={() => onChangeWargameParams(DEFAULT_WARGAME_PARAMS)}
              className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                !isStressedPreset
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Baseline Regime
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeWargameParams({
                  ...wargameParams,
                  chokepointClosureSeverityPct: 65,
                  sanctionsAndClearingIntensity: 45,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-400 transition-colors"
            >
              Hormuz / Red Sea Blockade (65%)
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeWargameParams({
                  ...wargameParams,
                  tariffEscalationPct: 35,
                  sanctionsAndClearingIntensity: 55,
                })
              }
              className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-400 transition-colors"
            >
              Tariff &amp; Sanctions Escalation (+35%)
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas + Right Interactive Node Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 border-b border-slate-200 dark:border-slate-800">
        {/* Left 8 Columns: Theme-Aware Interactive SVG World Map */}
        <div className="xl:col-span-8 p-4 bg-slate-100/70 dark:bg-slate-950 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 relative">
          {/* Top Cartographic Projection & Viewport Zoom / Theater Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>NATURAL EARTH 1:110M VECTOR BORDERS</span>
              </span>
              <span className="text-slate-400">·</span>
              {REGIONAL_THEATER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActiveTheaterId(preset.id);
                    setZoomLevel(preset.zoom);
                    if (preset.zoom === 1) {
                      setPanCenter({ x: MAP_W / 2, y: MAP_H / 2 });
                    } else {
                      const pt = projectLatLon(preset.centerLat, preset.centerLon);
                      setPanCenter(pt);
                    }
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer ${
                    activeTheaterId === preset.id
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveTheaterId('ACTIVE_SOVEREIGN');
                  setZoomLevel(2.4);
                  setPanCenter(sovPt);
                }}
                className={`px-2 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer ${
                  activeTheaterId === 'ACTIVE_SOVEREIGN'
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:border-blue-500'
                }`}
              >
                Focus {run.iso3}
              </button>
            </div>

            {/* Zoom In / Out / Reset Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Zoom In"
                onClick={() => setZoomLevel((z) => Math.min(4.0, Number((z * 1.35).toFixed(2))))}
                className="p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Zoom Out"
                onClick={() =>
                  setZoomLevel((z) => {
                    const next = Math.max(1.0, Number((z / 1.35).toFixed(2)));
                    if (next === 1) {
                      setPanCenter({ x: MAP_W / 2, y: MAP_H / 2 });
                      setActiveTheaterId('GLOBAL');
                    }
                    return next;
                  })
                }
                className="p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Reset Global 1x View"
                onClick={() => {
                  setZoomLevel(1);
                  setPanCenter({ x: MAP_W / 2, y: MAP_H / 2 });
                  setActiveTheaterId('GLOBAL');
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-[10px] cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{zoomLevel.toFixed(1)}x</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {/* Floating Hovered Country Telemetry HUD Overlay */}
            {hoveredCountry && (
              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none px-3 py-2 bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 shadow-md text-xs font-mono space-y-0.5 max-w-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {hoveredCountry.countryName} ({hoveredCountry.iso3})
                  </span>
                  {hoveredCountry.watchlistItem && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold ${
                        hoveredCountry.watchlistItem.alertStatus === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : hoveredCountry.watchlistItem.alertStatus === 'ELEVATED'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {hoveredCountry.watchlistItem.alertStatus}
                    </span>
                  )}
                </div>
                {hoveredCountry.watchlistItem ? (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <div>
                      5Y CDS: <strong className="text-indigo-600 dark:text-indigo-400">{hoveredCountry.watchlistItem.cds5YBps} bps</strong> · 10Y Yield: <strong>{hoveredCountry.watchlistItem.yield10YPct}%</strong>
                    </div>
                    <div>
                      Debt/GDP: <strong>{hoveredCountry.watchlistItem.debtToGdpPct}%</strong> · Reserves: <strong>{hoveredCountry.watchlistItem.fxReservesMonths}m</strong>
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold pt-0.5">
                      Click country polygon to switch active sovereign →
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Natural Earth Sovereign Boundary · Use + Add ISO-3 Country in header to onboard
                  </div>
                )}
              </div>
            )}

            {(() => {
              const vbW = MAP_W / zoomLevel;
              const vbH = MAP_H / zoomLevel;
              const vbX = Math.max(0, Math.min(MAP_W - vbW, panCenter.x - vbW / 2));
              const vbY = Math.max(0, Math.min(MAP_H - vbH, panCenter.y - vbH / 2));
              return (
                <svg
                  viewBox={`${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
                  className={`w-full h-auto bg-[#E4EDF7] dark:bg-[#050B14] border border-slate-300 dark:border-slate-800 select-none ${
                    zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  role="img"
                  aria-label={`Global Chokepoint, Trade Corridor and GDELT Map for ${run.countryName}`}
                  onMouseDown={(e) => {
                    if (zoomLevel <= 1) return;
                    setDragStart({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      startX: panCenter.x,
                      startY: panCenter.y,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (!dragStart) return;
                    const dx = (e.clientX - dragStart.clientX) / zoomLevel;
                    const dy = (e.clientY - dragStart.clientY) / zoomLevel;
                    setPanCenter({
                      x: Math.max(0, Math.min(MAP_W, dragStart.startX - dx)),
                      y: Math.max(0, Math.min(MAP_H, dragStart.startY - dy)),
                    });
                  }}
                  onMouseUp={() => setDragStart(null)}
                  onMouseLeave={() => {
                    setDragStart(null);
                    setHoveredCountry(null);
                  }}
                >
                  {/* Graticule Latitude / Longitude Lines */}
                  {[60, 120, 180, 240, 300, 350].map((y) => (
                    <line
                      key={`lat-${y}`}
                      x1={0}
                      y1={y}
                      x2={MAP_W}
                      y2={y}
                      className="stroke-slate-300/70 dark:stroke-slate-800/80"
                      strokeWidth={0.6 / Math.sqrt(zoomLevel)}
                      strokeDasharray="3 3"
                    />
                  ))}
                  {[146, 293, 440, 586, 733].map((x) => (
                    <line
                      key={`lon-${x}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={MAP_H}
                      className="stroke-slate-300/70 dark:stroke-slate-800/80"
                      strokeWidth={0.6 / Math.sqrt(zoomLevel)}
                      strokeDasharray="3 3"
                    />
                  ))}
                  {/* Equator Reference Line */}
                  <line
                    x1={0}
                    y1={MAP_H / 2}
                    x2={MAP_W}
                    y2={MAP_H / 2}
                    className="stroke-slate-400/60 dark:stroke-slate-700/80"
                    strokeWidth={0.8 / Math.sqrt(zoomLevel)}
                  />

                  {/* Accurate Natural Earth 1:110m Sovereign Country Boundaries & Choropleth */}
                  <WorldCountryVectorLayer
                    activeIso3={run.iso3}
                    watchlistItems={watchlistItems}
                    projectLatLon={projectLatLon}
                    showRiskChoropleth={showRiskChoropleth}
                    zoomLevel={zoomLevel}
                    hoveredIso3={hoveredCountry?.iso3 ?? null}
                    onHoverCountry={setHoveredCountry}
                    onSelectCountry={(country) => {
                      if (country.watchlistItem && onSelectSovereign) {
                        onSelectSovereign(country.watchlistItem);
                      }
                    }}
                  />

            {/* LAYER 1: SUBSEA FIBER-OPTIC CABLE ROUTES */}
            {showLayerSubseaCables &&
              subseaCableRoutes.map((cable) => {
                const p1 = projectLatLon(cable.startLat, cable.startLon);
                const pm = projectLatLon(cable.midLat, cable.midLon);
                const p2 = projectLatLon(cable.endLat, cable.endLon);
                const strokeColor =
                  cable.status === 'CHOKED_ALERT'
                    ? '#dc2626'
                    : cable.status === 'DEGRADED_LATENCY'
                    ? '#d97706'
                    : '#059669';
                return (
                  <g key={cable.cableId} opacity={0.85}>
                    <path
                      d={`M ${p1.x} ${p1.y} Q ${pm.x} ${pm.y} ${p2.x} ${p2.y}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.6}
                      strokeDasharray="5 3"
                    />
                    <text
                      x={pm.x}
                      y={pm.y - 4}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono font-semibold fill-emerald-800 dark:fill-emerald-300"
                    >
                      {cable.cableName.split(' ')[0]} ({cable.bandwidthSharePct}% BW)
                    </text>
                  </g>
                );
              })}

            {/* LAYER 2: BILATERAL TARIFF & TRADE CORRIDORS */}
            {showLayerTradeCorridors &&
              bilateralTradeCorridors.map((arc) => {
                const pt = projectLatLon(arc.partnerLat, arc.partnerLon);
                const midX = (sovPt.x + pt.x) / 2;
                const midY = Math.min(sovPt.y, pt.y) - 26;
                return (
                  <g key={arc.corridorId} opacity={0.9}>
                    <path
                      d={`M ${sovPt.x} ${sovPt.y} Q ${midX} ${midY} ${pt.x} ${pt.y}`}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={Math.max(1.5, arc.tradeSharePct / 18)}
                    />
                    <circle cx={pt.x} cy={pt.y} r={3.5} fill="#2563eb" />
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono font-semibold fill-blue-800 dark:fill-blue-300"
                    >
                      {arc.partnerName.split(' ')[0]} ({arc.tradeSharePct}% · Tariff {arc.effectiveTariffPct}%)
                    </text>
                  </g>
                );
              })}

            {/* LAYER 3: MARITIME CHOKEPOINTS & SHIPPING BLOCKADE ARCS */}
            {showLayerChokepoints &&
              chokepoints.map((cp) => {
                const cpPt = projectLatLon(cp.lat, cp.lon);
                const isSelected = selectedChokepoint?.corridorId === cp.corridorId && !selectedEvent;
                const color =
                  cp.vulnerabilityStatus === 'CRITICAL'
                    ? '#dc2626'
                    : cp.vulnerabilityStatus === 'HIGH'
                    ? '#d97706'
                    : '#0284c7';
                const shortName = cp.corridorName.split(' (')[0];
                return (
                  <g
                    key={cp.corridorId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedChokepointId(cp.corridorId);
                      setSelectedEventId(null);
                    }}
                  >
                    <line
                      x1={sovPt.x}
                      y1={sovPt.y}
                      x2={cpPt.x}
                      y2={cpPt.y}
                      stroke={color}
                      strokeWidth={isSelected ? 2.2 : 1.1}
                      strokeOpacity={isSelected ? 0.95 : 0.45}
                      strokeDasharray="2 3"
                    />
                    {isSelected && (
                      <circle
                        cx={cpPt.x}
                        cy={cpPt.y}
                        r={12}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                    )}
                    <rect
                      x={cpPt.x - 5.5}
                      y={cpPt.y - 5.5}
                      width={11}
                      height={11}
                      transform={`rotate(45 ${cpPt.x} ${cpPt.y})`}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={1.2}
                    />
                    <text
                      x={cpPt.x + 8}
                      y={cpPt.y + 3}
                      className={`text-[9px] font-mono ${
                        isSelected
                          ? 'fill-amber-700 dark:fill-amber-300 font-bold'
                          : 'fill-slate-800 dark:fill-slate-200 font-medium'
                      }`}
                    >
                      {shortName} (+{cp.reroutingDelayDays}d)
                    </text>
                  </g>
                );
              })}

            {/* ACTIVE SOVEREIGN EPICENTER BEACON */}
            <g>
              <circle
                cx={sovPt.x}
                cy={sovPt.y}
                r={11}
                fill="#2563eb"
                fillOpacity={0.22}
                stroke="#2563eb"
                strokeWidth={1.6}
              />
              <circle cx={sovPt.x} cy={sovPt.y} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
              <text
                x={sovPt.x}
                y={sovPt.y - 14}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-slate-900 dark:fill-white"
              >
                {run.countryName.toUpperCase()} ({run.iso3})
              </text>
            </g>

            {/* LAYER 4: GDELT 2.0 / ACLED CONFLICT & OSINT ALERT NODES */}
            {showLayerGdeltNodes &&
              osintEvents.map((ev, idx) => {
                const evPt = projectLatLon(ev.lat, ev.lon);
                const offsetX = idx % 2 === 0 ? 6 : -6;
                const offsetY = idx % 3 === 0 ? -5 : 5;
                const cx = evPt.x + offsetX;
                const cy = evPt.y + offsetY;
                const isSelected = selectedEventId === ev.eventId;
                const radius = Math.max(5, Math.round(ev.acledSeverityScore / 11));
                const nodeColor =
                  ev.goldsteinScale <= -7.0
                    ? '#dc2626'
                    : ev.goldsteinScale <= -5.5
                    ? '#ea580c'
                    : '#ca8a04';

                return (
                  <g
                    key={ev.eventId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedEventId(ev.eventId);
                    }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius + 5}
                      fill={nodeColor}
                      fillOpacity={isSelected ? 0.4 : 0.2}
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth={1.2}
                    />
                    <text
                      x={cx}
                      y={cy - radius - 7}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono font-bold fill-red-800 dark:fill-red-300"
                    >
                      {ev.cameoCode.split(' ')[0]} ({ev.goldsteinScale.toFixed(1)})
                    </text>
                  </g>
                );
              })}
                </svg>
              );
            })()}
          </div>

          {/* Compact Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 inline-block" />
                <span>Maritime Chokepoint Diamond</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                <span>GDELT / ACLED Conflict Alert</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-blue-600 inline-block" />
                <span>Bilateral Trade / Tariff Corridor</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-600 inline-block" />
                <span>Subsea Fiber Trunk</span>
              </span>
            </div>
            <span className="font-mono">
              GDELT Conflict Index: {run.openData.gdeltMetrics.conflictIntensityIndex}/100
            </span>
          </div>
        </div>

        {/* Right 4 Columns: Selected Node Inspector + Top Chokepoint Vulnerability Table */}
        <div className="xl:col-span-4 p-4 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Interactive Map Node Inspector</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {selectedEvent ? 'GDELT Event Selected' : 'Chokepoint Selected'}
              </span>
            </div>

            {selectedEvent ? (
              <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {selectedEvent.cameoCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(null)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Switch to Chokepoints
                  </button>
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedEvent.headline}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedEvent.locationLabel} · {selectedEvent.eventCategory.replace(/_/g, ' ')} ({selectedEvent.verificationStatus.replace(/_/g, ' ')})
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums text-[11px]">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">Goldstein / ACLED</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {selectedEvent.goldsteinScale.toFixed(1)} · {selectedEvent.acledSeverityScore}/100
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">5Y CDS &amp; FX Impact</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      +{selectedEvent.empiricalCdsImpactBps} bps · {selectedEvent.empiricalFxImpactPct}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              selectedChokepoint && (
                <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedChokepoint.corridorName}
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        selectedChokepoint.vulnerabilityStatus === 'CRITICAL'
                          ? 'text-red-600 dark:text-red-400'
                          : selectedChokepoint.vulnerabilityStatus === 'HIGH'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {selectedChokepoint.vulnerabilityStatus}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <strong>Exposed Cargo:</strong> {selectedChokepoint.primaryCommodities}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums text-[11px]">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block">Trade Share / Delay</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {selectedChokepoint.sovereignTradeShareExposedPct}% · +{selectedChokepoint.reroutingDelayDays}d
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block">Imported CPI / CDS</span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        +{selectedChokepoint.importedCpiPassThroughBps} bps · +{selectedChokepoint.cds5YSpreadImpactBps} bps
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Quick Chokepoint Selector List */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Click Corridor to Inspect Pass-Through ({run.countryName})
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {chokepoints.map((cp) => {
                  const active = selectedChokepoint?.corridorId === cp.corridorId && !selectedEvent;
                  return (
                    <button
                      key={cp.corridorId}
                      type="button"
                      onClick={() => {
                        setSelectedChokepointId(cp.corridorId);
                        setSelectedEventId(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs border flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-slate-900 dark:text-white font-semibold'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate pr-2">{cp.corridorName.split(' (')[0]}</span>
                      <span className="font-mono tabular-nums text-[11px] shrink-0">
                        {cp.sovereignTradeShareExposedPct}% trade · +{cp.importedCpiPassThroughBps} bps CPI
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Closure Severity: {wargameParams.chokepointClosureSeverityPct}%</span>
            <span>Tariff Shock: +{wargameParams.tariffEscalationPct}%</span>
          </div>
        </div>
      </div>

      {/* Structured 3-Pillar Plain-English Map Explanation Footer */}
      <div className="p-5 bg-white dark:bg-slate-900 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              1. What This Map Shows in Plain English
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Shows <strong>{run.countryName}&apos;s</strong> main port and capital ({sovereignCoord.capitalLabel}), its biggest trading partners ({bilateralTradeCorridors.map((c) => `${c.partnerName.split(' ')[0]} ${c.tradeSharePct}%`).join(', ')}), undersea internet cables, and the 6 global shipping lanes where cargo ships can get delayed.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              2. Why It Matters to Everyday Prices &amp; Bonds
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              When cargo ships are forced to detour (+{selectedChokepoint?.reroutingDelayDays ?? 9} extra days via {selectedChokepoint?.corridorName.split(' (')[0]}) and pay war-risk insurance, imported food and fuel get more expensive—adding +{selectedChokepoint?.importedCpiPassThroughBps ?? 45} bps to consumer inflation and keeping interest rates high.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>3. Warning Threshold &amp; Action</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Red-Alert Trigger:</strong> If global conflict tension hits <span className="font-mono font-semibold">65/100</span> (now <span className="font-mono font-semibold">{run.openData.gdeltMetrics.conflictIntensityIndex}/100</span>) or a shipping lane closes by <span className="font-mono font-semibold">35%+</span>, bond default risk jumps by <span className="font-mono font-semibold">+{gprAndEscalation.expectedProbabilityWeightedCdsDeltaBps} bps</span>—triggering oil/freight hedges and 5-year CDS protection.
            </p>
          </div>
        </div>
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800">
          <StatRefBadge
            refText={`Statistical Reference: Caldara-Iacoviello GPR Z-Score = ${gprAndEscalation.compositeGprZScore >= 0 ? '+' : ''}${gprAndEscalation.compositeGprZScore}σ · GDELT Conflict = ${run.openData.gdeltMetrics.conflictIntensityIndex}/100 · Expected 5Y CDS Shock = +${gprAndEscalation.expectedProbabilityWeightedCdsDeltaBps} bps`}
          />
        </div>
      </div>
    </section>
  );
};
