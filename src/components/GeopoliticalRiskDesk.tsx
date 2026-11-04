import React, { useMemo, useState } from 'react';
import {
  CouncilAssessmentRun,
  GeopoliticalWargameParams,
  OsintConflictEvent,
  WatchlistItem,
} from '../types/council';
import {
  DEFAULT_WARGAME_PARAMS,
  computeGeopoliticalRiskDeskSuite,
  parseOsintIntelligenceSignal,
} from '../utils/geopoliticalRiskEngine';
import {
  RotateCcw,
  ShieldAlert,
  Anchor,
  Lock,
  GitBranch,
  Umbrella,
  Sliders,
  ArrowUpRight,
  Radio,
  Globe,
  Cpu,
  WifiOff,
  Briefcase,
  Zap,
  Send,
  MapPin,
  Layers,
  Filter,
  AlertOctagon,
  Scale,
  Flame,
  Vote,
  PackageCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { StatRefBadge } from './StatRefTooltip';
import {
  WorldCountryVectorLayer,
  CountryMapFeatureInfo,
  REGIONAL_THEATER_PRESETS,
  RegionalTheaterPreset,
} from './WorldCountryVectorLayer';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';

interface GeopoliticalRiskDeskProps {
  run: CouncilAssessmentRun;
  watchlistItems?: WatchlistItem[];
  wargameParams?: GeopoliticalWargameParams;
  onChangeWargameParams?: (next: GeopoliticalWargameParams) => void;
  propagateGeoShocks?: boolean;
  onTogglePropagateGeoShocks?: (active: boolean) => void;
  onSelectSovereign?: (item: WatchlistItem) => void;
  onJumpToCouncilDebates?: () => void;
  onJumpToPortfolioDesk?: () => void;
  onJumpToForecastingLab?: () => void;
  onOpenSupplyChainMatrixDesk?: () => void;
}

type GeoSubViewMode =
  | 'all_modules'
  | 'map_and_supply_chain'
  | 'osint_and_escalation'
  | 'sanctions_and_diplomacy'
  | 'coalition_and_irf'
  | 'regime_and_mobilization'
  | 'cyber_and_portfolio';

type SanctionBlocId = 'OFAC_PRIMARY' | 'OFAC_SECONDARY' | 'EU_COUNCIL' | 'UK_G7_CAP' | 'UN_SC';
type KineticIrfTrigger = 'MARITIME_BLOCKADE' | 'ENERGY_EMBARGO' | 'BORDER_KINETIC' | 'FULL_SANCTIONS';

// Equirectangular projection helper for 880x400 world map canvas
const MAP_W = 880;
const MAP_H = 400;
function projectLatLon(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((75 - Math.max(-62, Math.min(75, lat))) / 137) * MAP_H;
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

export const GeopoliticalRiskDesk: React.FC<GeopoliticalRiskDeskProps> = ({
  run,
  watchlistItems = SOVEREIGN_CATALOG,
  wargameParams: externalParams,
  onChangeWargameParams,
  propagateGeoShocks = true,
  onTogglePropagateGeoShocks,
  onSelectSovereign,
  onJumpToCouncilDebates,
  onJumpToPortfolioDesk,
  onJumpToForecastingLab,
  onOpenSupplyChainMatrixDesk,
}) => {
  const [internalParams, setInternalParams] =
    useState<GeopoliticalWargameParams>(DEFAULT_WARGAME_PARAMS);
  const wargameParams = externalParams || internalParams;

  const updateWargameParams = (
    updater:
      | GeopoliticalWargameParams
      | ((prev: GeopoliticalWargameParams) => GeopoliticalWargameParams)
  ) => {
    const next = typeof updater === 'function' ? updater(wargameParams) : updater;
    if (onChangeWargameParams) {
      onChangeWargameParams(next);
    } else {
      setInternalParams(next);
    }
  };

  const [subView, setSubView] = useState<GeoSubViewMode>('all_modules');
  const [customOsintEvents, setCustomOsintEvents] = useState<OsintConflictEvent[]>([]);
  const [osintInputText, setOsintInputText] = useState<string>('');
  const [autoApplyOsintToSliders, setAutoApplyOsintToSliders] = useState<boolean>(true);

  // Per-Commodity Export-Ban / Quota Stress Toggles
  const [activeExportBanChainIds, setActiveExportBanChainIds] = useState<string[]>([]);

  // Geospatial Map Layer Toggles
  const [showLayerGdeltNodes, setShowLayerGdeltNodes] = useState<boolean>(true);
  const [showLayerChokepoints, setShowLayerChokepoints] = useState<boolean>(true);
  const [showLayerSubseaCables, setShowLayerSubseaCables] = useState<boolean>(true);
  const [showLayerTradeCorridors, setShowLayerTradeCorridors] = useState<boolean>(true);
  const [showRiskChoropleth, setShowRiskChoropleth] = useState<boolean>(true);

  // Synchronized Selection State between Map & Supply Chain Matrix
  const [selectedChokepointId, setSelectedChokepointId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
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
    () =>
      computeGeopoliticalRiskDeskSuite(
        run.openData,
        wargameParams,
        customOsintEvents,
        activeExportBanChainIds
      ),
    [run.openData, wargameParams, customOsintEvents, activeExportBanChainIds]
  );

  const {
    sovereignCoord,
    chokepoints,
    sanctionsAndReserves,
    gprAndEscalation,
    tailHedges,
    osintEvents,
    diplomaticAlignment,
    strategicSupplyChain,
    cyberVulnerability,
    portfolioTransmission,
    subseaCableRoutes,
    bilateralTradeCorridors,
  } = suite;

  // Compute active synchronized filter sets
  const selectedEventObj = useMemo(
    () => osintEvents.find((e) => e.eventId === selectedEventId) || null,
    [osintEvents, selectedEventId]
  );
  const selectedChokepointObj = useMemo(
    () => chokepoints.find((c) => c.corridorId === selectedChokepointId) || null,
    [chokepoints, selectedChokepointId]
  );
  const selectedChainObj = useMemo(
    () =>
      strategicSupplyChain.supplyChainNodes.find((n) => n.chainId === selectedChainId) || null,
    [strategicSupplyChain.supplyChainNodes, selectedChainId]
  );

  const highlightedChokepointIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedChokepointId) set.add(selectedChokepointId);
    if (selectedEventObj) {
      selectedEventObj.linkedChokepointIds.forEach((id) => set.add(id));
    }
    if (selectedChainObj) {
      selectedChainObj.linkedChokepointIds.forEach((id) => set.add(id));
    }
    return set;
  }, [selectedChokepointId, selectedEventObj, selectedChainObj]);

  const highlightedSupplyChainIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedChainId) set.add(selectedChainId);
    if (selectedChokepointObj) {
      selectedChokepointObj.linkedSupplyChainIds.forEach((id) => set.add(id));
    }
    if (selectedEventObj) {
      selectedEventObj.linkedSupplyChainIds.forEach((id) => set.add(id));
    }
    return set;
  }, [selectedChainId, selectedChokepointObj, selectedEventObj]);

  const hasSynchronizedSelection =
    Boolean(selectedChokepointId) || Boolean(selectedChainId) || Boolean(selectedEventId);

  const clearSynchronizedSelection = () => {
    setSelectedChokepointId(null);
    setSelectedChainId(null);
    setSelectedEventId(null);
  };

  const toggleExportBan = (chainId: string) => {
    setActiveExportBanChainIds((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
  };

  const applyPresetWargame = (
    preset: 'baseline' | 'hormuz_redsea' | 'tariff_sanctions' | 'cyber_grid' | 'tail_blockade'
  ) => {
    if (preset === 'baseline') {
      updateWargameParams(DEFAULT_WARGAME_PARAMS);
      setActiveExportBanChainIds([]);
    } else if (preset === 'hormuz_redsea') {
      updateWargameParams({
        chokepointClosureSeverityPct: 80,
        tariffEscalationPct: 15,
        sanctionsAndClearingIntensity: 35,
        electoralAndUnrestShock: 30,
        cyberHybridIntensityPct: 30,
      });
    } else if (preset === 'tariff_sanctions') {
      updateWargameParams({
        chokepointClosureSeverityPct: 35,
        tariffEscalationPct: 45,
        sanctionsAndClearingIntensity: 75,
        electoralAndUnrestShock: 45,
        cyberHybridIntensityPct: 40,
      });
      setActiveExportBanChainIds(['semi_logic_7nm', 'rare_earth_magnets']);
    } else if (preset === 'cyber_grid') {
      updateWargameParams({
        chokepointClosureSeverityPct: 40,
        tariffEscalationPct: 25,
        sanctionsAndClearingIntensity: 50,
        electoralAndUnrestShock: 45,
        cyberHybridIntensityPct: 85,
      });
    } else if (preset === 'tail_blockade') {
      updateWargameParams({
        chokepointClosureSeverityPct: 95,
        tariffEscalationPct: 60,
        sanctionsAndClearingIntensity: 90,
        electoralAndUnrestShock: 80,
        cyberHybridIntensityPct: 90,
      });
      setActiveExportBanChainIds([
        'semi_logic_7nm',
        'rare_earth_magnets',
        'crude_lng_hydrocarbons',
      ]);
    }
  };

  const handleInjectOsintSignal = (signalOverride?: string) => {
    const textToParse = (signalOverride ?? osintInputText).trim();
    if (!textToParse) return;
    const parsed = parseOsintIntelligenceSignal(textToParse, run.iso3, run.countryName);
    setCustomOsintEvents((prev) => [parsed.event, ...prev.slice(0, 5)]);
    setSelectedEventId(parsed.event.eventId);
    if (autoApplyOsintToSliders && Object.keys(parsed.suggestedWargameDelta).length > 0) {
      updateWargameParams((prev) => ({
        ...prev,
        ...parsed.suggestedWargameDelta,
      }));
    }
    if (!signalOverride) {
      setOsintInputText('');
    }
  };

  const showMapAndSupplyChain =
    subView === 'all_modules' || subView === 'map_and_supply_chain';
  const showOsintAndEscalation =
    subView === 'all_modules' || subView === 'osint_and_escalation';
  const showSanctionsAndDiplomacy =
    subView === 'all_modules' || subView === 'sanctions_and_diplomacy';
  const showCoalitionAndIrf =
    subView === 'all_modules' || subView === 'coalition_and_irf';
  const showRegimeAndMobilization =
    subView === 'all_modules' || subView === 'regime_and_mobilization';
  const showCyberAndPortfolio =
    subView === 'all_modules' || subView === 'cyber_and_portfolio';

  // Interactive State for Sanction Coalition Builder & Kinetic-to-Macro IRFs
  const [activeSanctionBlocs, setActiveSanctionBlocs] = useState<SanctionBlocId[]>([
    'OFAC_PRIMARY',
    'EU_COUNCIL',
    'UK_G7_CAP',
  ]);
  const [selectedIrfTrigger, setSelectedIrfTrigger] =
    useState<KineticIrfTrigger>('MARITIME_BLOCKADE');

  const toggleSanctionBloc = (blocId: SanctionBlocId) => {
    setActiveSanctionBlocs((prev) =>
      prev.includes(blocId) ? prev.filter((b) => b !== blocId) : [...prev, blocId]
    );
  };

  // =========================================================================
  // NEW ENGINE 1: SANCTION COALITION & RESERVE FREEZE CASCADE SIMULATOR
  // =========================================================================
  const coalitionCascade = useMemo(() => {
    const totalReservesUsdBn = run.openData.debtRollover.liquidFxReservesUsdBn;
    const baseImportCoverMonths = run.openData.worldBankIndicators.fxReservesMonthsImport;
    const monthlyImportBillUsdBn = Math.max(
      1.2,
      totalReservesUsdBn / Math.max(1.5, baseImportCoverMonths)
    );

    const hasOfacPrimary = activeSanctionBlocs.includes('OFAC_PRIMARY');
    const hasOfacSecondary = activeSanctionBlocs.includes('OFAC_SECONDARY');
    const hasEu = activeSanctionBlocs.includes('EU_COUNCIL');
    const hasUkG7 = activeSanctionBlocs.includes('UK_G7_CAP');
    const hasUn = activeSanctionBlocs.includes('UN_SC');

    const custodyTranches = [
      {
        trancheId: 'usd_nyfed',
        custodyLabel: 'USD · Federal Reserve / US Treasury Custody',
        sharePct: 38,
        frozen: hasOfacPrimary || hasOfacSecondary || hasUn,
        settlementRail: 'Fedwire / CHIPS / SWIFT',
      },
      {
        trancheId: 'eur_euroclear',
        custodyLabel: 'EUR · Euroclear / ECB / Bundesbank Custody',
        sharePct: 24,
        frozen: hasEu || hasUn,
        settlementRail: 'TARGET2 / Euroclear',
      },
      {
        trancheId: 'gbp_jpy_g7',
        custodyLabel: 'GBP & JPY · Bank of England / BoJ G7 Custody',
        sharePct: 12,
        frozen: hasUkG7 || hasUn,
        settlementRail: 'CHAPS / BOJ-NET',
      },
      {
        trancheId: 'cny_cips',
        custodyLabel: 'CNY & EM · PBoC Swap / Offshore CIPS Corridors',
        sharePct: 14,
        frozen: hasUn || (hasOfacSecondary && wargameParams.sanctionsAndClearingIntensity > 80),
        settlementRail: 'CIPS / Bilateral Local FX',
      },
      {
        trancheId: 'domestic_gold',
        custodyLabel: 'Physical Bullion · Domestic Sovereign Vaults',
        sharePct: 12,
        frozen: false,
        settlementRail: 'Physical / Airlift Settlement (22% Haircut)',
      },
    ].map((t) => {
      const amountUsdBn = Number(((totalReservesUsdBn * t.sharePct) / 100).toFixed(1));
      return {
        ...t,
        amountUsdBn,
      };
    });

    const frozenReservesUsdBn = Number(
      custodyTranches
        .filter((t) => t.frozen)
        .reduce((acc, t) => acc + t.amountUsdBn, 0)
        .toFixed(1)
    );
    const sanctionImmuneReservesUsdBn = Number(
      Math.max(1.5, totalReservesUsdBn - frozenReservesUsdBn).toFixed(1)
    );
    const frozenSharePct = Math.round((frozenReservesUsdBn / Math.max(1, totalReservesUsdBn)) * 100);
    const effectiveImportCoverMonths = Number(
      (sanctionImmuneReservesUsdBn / monthlyImportBillUsdBn).toFixed(1)
    );

    // Secondary Tariff & Payment Rerouting Drag
    const coalitionWeight =
      (hasOfacPrimary ? 0.28 : 0) +
      (hasOfacSecondary ? 0.32 : 0) +
      (hasEu ? 0.20 : 0) +
      (hasUkG7 ? 0.12 : 0) +
      (hasUn ? 0.25 : 0);

    const exportPriceHaircutPct = Number(
      Math.min(42, (coalitionWeight * 24 + wargameParams.sanctionsAndClearingIntensity * 0.18)).toFixed(1)
    );
    const paymentReroutingCostBps = Math.round(
      coalitionWeight * 165 + wargameParams.sanctionsAndClearingIntensity * 1.4
    );
    const bilateralExportLossPctGdp = Number(
      (coalitionWeight * 3.8 + (wargameParams.tariffEscalationPct / 100) * 2.4).toFixed(2)
    );

    return {
      custodyTranches,
      totalReservesUsdBn,
      frozenReservesUsdBn,
      sanctionImmuneReservesUsdBn,
      frozenSharePct,
      effectiveImportCoverMonths,
      exportPriceHaircutPct,
      paymentReroutingCostBps,
      bilateralExportLossPctGdp,
    };
  }, [run.openData, activeSanctionBlocs, wargameParams]);

  // =========================================================================
  // NEW ENGINE 2: KINETIC-TO-MACRO SHOCK IMPULSE RESPONSE CURVES (8Q VAR IRFs)
  // =========================================================================
  const kineticIrfAnalytics = useMemo(() => {
    const severityScale =
      0.55 +
      (wargameParams.chokepointClosureSeverityPct / 100) * 0.45 +
      (wargameParams.sanctionsAndClearingIntensity / 100) * 0.35;

    const triggerConfig: Record<
      KineticIrfTrigger,
      {
        label: string;
        peakCpiBps: number;
        peakGdpDropPct: number;
        peakFiscalSurgePctGdp: number;
        peakCdsWideningBps: number;
      }
    > = {
      MARITIME_BLOCKADE: {
        label: 'Maritime Chokepoint Blockade (Hormuz / Bab el-Mandeb / Malacca)',
        peakCpiBps: 215,
        peakGdpDropPct: -1.85,
        peakFiscalSurgePctGdp: 1.65,
        peakCdsWideningBps: 145,
      },
      ENERGY_EMBARGO: {
        label: 'Coordinated Crude / LNG Pipeline Embargo & Price Cap',
        peakCpiBps: 290,
        peakGdpDropPct: -2.45,
        peakFiscalSurgePctGdp: 2.30,
        peakCdsWideningBps: 195,
      },
      BORDER_KINETIC: {
        label: 'Direct Border Kinetic Escalation & Industrial Mobilization',
        peakCpiBps: 260,
        peakGdpDropPct: -3.20,
        peakFiscalSurgePctGdp: 3.85,
        peakCdsWideningBps: 280,
      },
      FULL_SANCTIONS: {
        label: 'Full G7/OFAC Reserve Freeze & Secondary Tariff Package',
        peakCpiBps: 340,
        peakGdpDropPct: -3.60,
        peakFiscalSurgePctGdp: 2.95,
        peakCdsWideningBps: 335,
      },
    };

    const cfg = triggerConfig[selectedIrfTrigger];
    // Hump-shaped structural VAR impulse response weights across Q0..Q8
    const shapeWeights = [0.35, 0.78, 1.0, 0.92, 0.76, 0.60, 0.46, 0.34, 0.25];

    const irfSeries = shapeWeights.map((w, qIdx) => ({
      quarter: `Q+${qIdx}`,
      cpiShockBps: Math.round(cfg.peakCpiBps * w * severityScale),
      cdsShockBps: Math.round(cfg.peakCdsWideningBps * w * severityScale),
      gdpImpulsePct: Number((cfg.peakGdpDropPct * w * severityScale).toFixed(2)),
      fiscalSurgePctGdp: Number((cfg.peakFiscalSurgePctGdp * w * severityScale).toFixed(2)),
    }));

    return {
      triggerLabel: cfg.label,
      irfSeries,
      peakCpiBps: irfSeries[2].cpiShockBps,
      peakCdsBps: irfSeries[2].cdsShockBps,
      peakGdpDropPct: irfSeries[2].gdpImpulsePct,
      peakFiscalSurgePctGdp: irfSeries[2].fiscalSurgePctGdp,
    };
  }, [selectedIrfTrigger, wargameParams]);

  // =========================================================================
  // NEW ENGINE 3: REGIME STABILITY, ELECTION CYCLE & POLITICAL TRANSITION TRACKER
  // =========================================================================
  const regimeStabilityAnalytics = useMemo(() => {
    const wbPolPercentile = run.openData.worldBankIndicators.politicalStabilityPercentile;
    const unrestShock = wargameParams.electoralAndUnrestShock;
    const cpi = run.openData.imfIndicators.cpiInflationPct;

    const pillars = [
      {
        pillarName: 'Executive & Parliamentary Coalition Durability',
        score: Math.max(18, Math.min(92, Math.round(wbPolPercentile * 0.85 - unrestShock * 0.32 + 22))),
        keyDriver: 'Governing majority cohesion vs. early snap-election threshold',
      },
      {
        pillarName: 'Social Cost-of-Living & Food/Energy Unrest Insulation',
        score: Math.max(15, Math.min(90, Math.round(82 - cpi * 4.2 - unrestShock * 0.42))),
        keyDriver: `Headline CPI (${cpi.toFixed(1)}%) pass-through into real household wage compression`,
      },
      {
        pillarName: 'Central Bank Independence & Institutional Anchor',
        score: Math.max(22, Math.min(95, Math.round(wbPolPercentile * 0.9 - unrestShock * 0.22 + 18))),
        keyDriver: 'Protection against fiscal dominance & statutory debt monetization',
      },
      {
        pillarName: 'Electoral / Leadership Transition Continuity',
        score: Math.max(16, Math.min(90, Math.round(76 - unrestShock * 0.48))),
        keyDriver: 'Policy anchor stability across the upcoming 12-month electoral window',
      },
      {
        pillarName: 'Sovereign External Treaty & IMF Covenant Compliance',
        score: Math.max(24, Math.min(94, Math.round(80 - run.croState.sovereignRiskScore * 35 - unrestShock * 0.2))),
        keyDriver: 'Credibility of medium-term primary fiscal consolidation targets',
      },
    ];

    const compositeStabilityScore = Math.round(
      pillars.reduce((acc, p) => acc + p.score, 0) / pillars.length
    );

    const probStatusQuo = Math.max(15, Math.min(72, Math.round(compositeStabilityScore * 0.78)));
    const probPopulistShift = Math.min(55, Math.max(15, Math.round((100 - probStatusQuo) * 0.62)));
    const probGridlock = Math.max(8, 100 - probStatusQuo - probPopulistShift);

    const electoralScenarios = [
      {
        scenarioId: 'technocratic_continuity',
        scenarioTitle: 'Technocratic / Status-Quo Policy Continuity',
        probabilityPct: probStatusQuo,
        primaryBalanceDeltaPctGdp: '+0.4% GDP Consolidation',
        yield10YImpactBps: -25,
        spotFxImpactPct: '+1.8% Appreciation',
        ratingOutlookImpact: 'Stable / Positive Affirmation',
        tone: 'CONSTRUCTIVE',
      },
      {
        scenarioId: 'populist_expansion',
        scenarioTitle: 'Populist Fiscal Expansion & Central Bank Pressure',
        probabilityPct: probPopulistShift,
        primaryBalanceDeltaPctGdp: '-2.1% GDP Fiscal Slippage',
        yield10YImpactBps: 145,
        spotFxImpactPct: '-8.5% Depreciation',
        ratingOutlookImpact: 'Negative Watch / -1 Notch',
        tone: 'ADVERSE',
      },
      {
        scenarioId: 'hung_parliament_gridlock',
        scenarioTitle: 'Fragmented Coalition / Constitutional & Budget Gridlock',
        probabilityPct: probGridlock,
        primaryBalanceDeltaPctGdp: '-1.1% GDP Delayed Reform',
        yield10YImpactBps: 75,
        spotFxImpactPct: '-4.2% Depreciation',
        ratingOutlookImpact: 'Negative Outlook Revision',
        tone: 'CAUTIOUS',
      },
    ];

    return {
      pillars,
      compositeStabilityScore,
      electoralScenarios,
    };
  }, [run.openData, run.croState.sovereignRiskScore, wargameParams.electoralAndUnrestShock]);

  // =========================================================================
  // NEW ENGINE 4: STRATEGIC COMMODITY & DEFENSE INDUSTRIAL MOBILIZATION LEDGER
  // =========================================================================
  const mobilizationLedger = useMemo(() => {
    const chokeStress = wargameParams.chokepointClosureSeverityPct / 100;
    const baseDefenseSpendPctGdp = 2.15;
    const stressedDefenseTargetPctGdp = Number(
      (baseDefenseSpendPctGdp + chokeStress * 1.45 + (wargameParams.sanctionsAndClearingIntensity / 100) * 0.85).toFixed(2)
    );
    const defenseFiscalSurgePctGdp = Number(
      (stressedDefenseTargetPctGdp - baseDefenseSpendPctGdp).toFixed(2)
    );

    const verticals = [
      {
        verticalId: 'crude_lng_spr',
        verticalName: 'Crude Oil, Refined Distillates & LNG Strategic Reserve (SPR)',
        domesticSelfSufficiencyPct: 38,
        netImportDependencyPct: 62,
        baselineBufferDays: 90,
        stressedBufferDays: Math.max(18, Math.round(90 * (1 - chokeStress * 0.52))),
        primaryChokeExposure: 'Strait of Hormuz / Malacca / Pipeline Corridors',
        mobilizationPriority: 'CRITICAL',
      },
      {
        verticalId: 'grain_fertilizer_food',
        verticalName: 'Caloric Grain, Potash/Nitrogen Fertilizer & Ag-Inputs',
        domesticSelfSufficiencyPct: 54,
        netImportDependencyPct: 46,
        baselineBufferDays: 115,
        stressedBufferDays: Math.max(28, Math.round(115 * (1 - chokeStress * 0.38))),
        primaryChokeExposure: 'Black Sea / Bab el-Mandeb / Panama Canal',
        mobilizationPriority: 'HIGH',
      },
      {
        verticalId: 'munitions_aerospace_semi',
        verticalName: 'Defense Munitions, Energetics & Dual-Use Aerospace Chips',
        domesticSelfSufficiencyPct: 29,
        netImportDependencyPct: 71,
        baselineBufferDays: 60,
        stressedBufferDays: Math.max(12, Math.round(60 * (1 - chokeStress * 0.64))),
        primaryChokeExposure: 'Taiwan Strait / Wassenaar Export Control Regimes',
        mobilizationPriority: 'CRITICAL',
      },
      {
        verticalId: 'critical_minerals_grid',
        verticalName: 'Rare Earth Permanent Magnets, Gallium & HVDC Grid Transformers',
        domesticSelfSufficiencyPct: 22,
        netImportDependencyPct: 78,
        baselineBufferDays: 52,
        stressedBufferDays: Math.max(11, Math.round(52 * (1 - chokeStress * 0.62))),
        primaryChokeExposure: 'South China Sea / Critical Mineral Export Licensing',
        mobilizationPriority: 'CRITICAL',
      },
      {
        verticalId: 'pharma_api_medical',
        verticalName: 'Active Pharmaceutical Ingredients (APIs) & Trauma Biologics',
        domesticSelfSufficiencyPct: 34,
        netImportDependencyPct: 66,
        baselineBufferDays: 75,
        stressedBufferDays: Math.max(20, Math.round(75 * (1 - chokeStress * 0.45))),
        primaryChokeExposure: 'Suez Canal / Air-Freight Cold-Chain Corridors',
        mobilizationPriority: 'HIGH',
      },
    ];

    const defenseIndustrialUtilizationPct = Math.min(
      98,
      Math.round(68 + chokeStress * 26)
    );
    const stockpileReplenishmentUsdBn = Number(
      (14.5 + chokeStress * 28.0).toFixed(1)
    );

    return {
      baseDefenseSpendPctGdp,
      stressedDefenseTargetPctGdp,
      defenseFiscalSurgePctGdp,
      defenseIndustrialUtilizationPct,
      stockpileReplenishmentUsdBn,
      verticals,
    };
  }, [wargameParams]);

  const sovPt = projectLatLon(sovereignCoord.lat, sovereignCoord.lon);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP CONTROL BAR: INTERACTIVE GEOPOLITICAL WARGAMING & CROSS-DESK PROPAGATION
          ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tier-1 Geopolitical Risk &amp; Strategic Intelligence Desk · GDELT Alerts Map, Synchronized Supply-Chain Matrix, UNGA Topology &amp; Portfolio VaR Transmission
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {run.countryName} ({run.iso3}) — Geopolitical Wargaming &amp; Strategic Intelligence Suite
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetWargame('baseline')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Baseline</span>
            </button>
            <button
              type="button"
              onClick={() => applyPresetWargame('hormuz_redsea')}
              className="px-2.5 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              Hormuz &amp; Red Sea Blockade
            </button>
            <button
              type="button"
              onClick={() => applyPresetWargame('tariff_sanctions')}
              className="px-2.5 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              45% Tariff &amp; Chip/REE Ban
            </button>
            <button
              type="button"
              onClick={() => applyPresetWargame('cyber_grid')}
              className="px-2.5 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              Subsea Cable &amp; Grid Cyber Shock
            </button>
            <button
              type="button"
              onClick={() => applyPresetWargame('tail_blockade')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
            >
              Stage-3 Kinetic &amp; Sanctions Crisis
            </button>
          </div>
        </div>

        <StatRefBadge
          refText={`Statistical Reference: Caldara-Iacoviello GPR Index, GDELT Event Velocity & UNCTAD Maritime Chokepoint Model · GPR Z-Score ${gprAndEscalation.compositeGprZScore >= 0 ? '+' : ''}${gprAndEscalation.compositeGprZScore}σ · Propagated Real Rate +${portfolioTransmission.propagatedForecastShocks.realRateShockBps} bps · Stressed CVaR₉₉ ${portfolioTransmission.geoStressedCvar99PctNav}% NAV`}
        />

        {/* BIDIRECTIONAL CROSS-DESK PROPAGATION BAR */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span>Bidirectional Cross-Desk Shock Propagation</span>
                <span
                  className={`px-1.5 py-0.5 text-xs tabular-nums font-semibold ${
                    propagateGeoShocks
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {propagateGeoShocks ? 'Live transmission on' : 'Standalone mode'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Dynamically transmits active Geopolitical Wargame &amp; Supply-Chain Export-Ban shocks (+
                {portfolioTransmission.propagatedForecastShocks.realRateShockBps} bps real rate,{' '}
                {portfolioTransmission.propagatedForecastShocks.realGdpGrowthShockPct}% GDP, +
                {portfolioTransmission.propagatedForecastShocks.fxDepreciationShockPct}% FX,{' '}
                {portfolioTransmission.geoStressedCvar99PctNav}% Stressed CVaR₉₉) into the Multi-Sovereign Portfolio Book and Stochastic Debt Fan Charts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onTogglePropagateGeoShocks && (
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap shrink-0">
                <input
                  type="checkbox"
                  checked={propagateGeoShocks}
                  onChange={(e) => onTogglePropagateGeoShocks(e.target.checked)}
                  className="accent-blue-600"
                />
                <span>Propagate to Portfolio &amp; Debt Fan</span>
              </label>
            )}
            {onJumpToPortfolioDesk && (
              <button
                type="button"
                onClick={onJumpToPortfolioDesk}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                <span>Open Stressed Portfolio Book</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onJumpToForecastingLab && (
              <button
                type="button"
                onClick={onJumpToForecastingLab}
                className="ui-btn ui-btn-primary inline-flex shrink-0"
              >
                <span>Open Stressed Debt Fan Chart</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onJumpToCouncilDebates && (
              <button
                type="button"
                onClick={onJumpToCouncilDebates}
                className="ui-btn inline-flex shrink-0"
              >
                <span>Geopolitical Council Debate</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 5 INTERACTIVE WARGAMING SLIDERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Chokepoint Closure</span>
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {wargameParams.chokepointClosureSeverityPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={wargameParams.chokepointClosureSeverityPct}
              onChange={(e) =>
                updateWargameParams((prev) => ({
                  ...prev,
                  chokepointClosureSeverityPct: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0% Open</span>
              <span>50% Reroute</span>
              <span>100% Blockade</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Bilateral Tariff Shock</span>
              </span>
              <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                +{wargameParams.tariffEscalationPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={wargameParams.tariffEscalationPct}
              onChange={(e) =>
                updateWargameParams((prev) => ({
                  ...prev,
                  tariffEscalationPct: Number(e.target.value),
                }))
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>+0% WTO</span>
              <span>+25% Sector</span>
              <span>+60% Embargo</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>OFAC / Custody Freeze</span>
              </span>
              <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                {wargameParams.sanctionsAndClearingIntensity}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={wargameParams.sanctionsAndClearingIntensity}
              onChange={(e) =>
                updateWargameParams((prev) => ({
                  ...prev,
                  sanctionsAndClearingIntensity: Number(e.target.value),
                }))
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0 None</span>
              <span>50 Secondary</span>
              <span>100 G7 Freeze</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Electoral &amp; Unrest</span>
              </span>
              <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                {wargameParams.electoralAndUnrestShock}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={wargameParams.electoralAndUnrestShock}
              onChange={(e) =>
                updateWargameParams((prev) => ({
                  ...prev,
                  electoralAndUnrestShock: Number(e.target.value),
                }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0 Stable</span>
              <span>50 Slippage</span>
              <span>100 Crisis</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cyber &amp; Subsea Attack</span>
              </span>
              <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {wargameParams.cyberHybridIntensityPct ?? 20}/100
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={wargameParams.cyberHybridIntensityPct ?? 20}
              onChange={(e) =>
                updateWargameParams((prev) => ({
                  ...prev,
                  cyberHybridIntensityPct: Number(e.target.value),
                }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>0 Baseline</span>
              <span>50 DDoS/OT</span>
              <span>100 Grid/Cable</span>
            </div>
          </div>
        </div>

        {/* 6-KPI EXECUTIVE TELEMETRY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              GPR Threat / Act Z-Score
            </div>
            <div
              className={`text-lg tabular-nums tabular-nums font-semibold mt-0.5 ${
                gprAndEscalation.compositeGprZScore >= 2.0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              +{gprAndEscalation.compositeGprZScore.toFixed(2)}σ
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              T: +{gprAndEscalation.gprThreatZScore.toFixed(1)}σ · A: +{gprAndEscalation.gprActZScore.toFixed(1)}σ
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Sanctions-Usable Reserves
            </div>
            <div
              className={`text-lg tabular-nums tabular-nums font-semibold mt-0.5 ${
                sanctionsAndReserves.sanctionsInsulatedImportCoverMonths < 3.0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              ${sanctionsAndReserves.sanctionsInsulatedReservesUsdBn}B
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              {sanctionsAndReserves.sanctionsInsulatedImportCoverMonths}m cover (vs {sanctionsAndReserves.headlineImportCoverMonths}m)
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              UNGA Bloc &amp; Contagion
            </div>
            <div className="text-lg tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {diplomaticAlignment.secondarySanctionsContagionProbPct}% Prob
            </div>
            <div className="text-xs tabular-nums text-slate-500 truncate">
              Swing Score: {diplomaticAlignment.nonAlignedSwingLeverageScore}/100
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Supply-Chain &amp; Cyber Drag
            </div>
            <div className="text-lg tabular-nums font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              -{strategicSupplyChain.totalSupplyShockGdpDragBps + cyberVulnerability.stressed7DayHybridAttackGdpDragBps} bps GDP
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              Export Bans: {activeExportBanChainIds.length} · Cyber: {cyberVulnerability.compositeCyberFragilityScore}/100
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Book Unhedged Geo Stress
            </div>
            <div className="text-lg tabular-nums font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              {portfolioTransmission.totalUnhedgedGeoStressPctNav}% NAV
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              ${Math.abs(portfolioTransmission.totalUnhedgedGeoStressPnlUsdThousands).toLocaleString()}k · CVaR {portfolioTransmission.geoStressedCvar99PctNav}%
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Net Hedged Book Impact
            </div>
            <div className="text-lg tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {portfolioTransmission.netHedgedGeoStressPctNav}% NAV
            </div>
            <div className="text-xs tabular-nums text-slate-500">
              Hedge Offset: +${portfolioTransmission.tailHedgeOffsetPnlUsdThousands.toLocaleString()}k
            </div>
          </div>
        </div>

        {/* SUB-DESK VIEW SELECTOR */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          {[
            { id: 'all_modules', label: 'Complete Intelligence Suite' },
            { id: 'map_and_supply_chain', label: 'GDELT Alerts Map & Supply-Chain Matrix' },
            { id: 'osint_and_escalation', label: 'OSINT Feed, GPR & Escalation Tree' },
            { id: 'sanctions_and_diplomacy', label: 'Sanctions, Reserves & UNGA Bloc Topology' },
            { id: 'coalition_and_irf', label: 'Sanction Coalition Simulator & Kinetic-to-Macro IRFs' },
            { id: 'regime_and_mobilization', label: 'Regime/Election Tracker & Defense Mobilization Ledger' },
            { id: 'cyber_and_portfolio', label: 'Cyber/Subsea Grid & Portfolio VaR Transmission' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id as GeoSubViewMode)}
              aria-pressed={subView === tab.id}
              className="ui-pill whitespace-nowrap shrink-0"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          NEW MODULE: SYNCHRONIZED GDELT ALERTS & STRATEGIC THEATER MAP
          ===================================================================== */}
      {showMapAndSupplyChain && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>
                  Geospatial Intelligence Theater · Synchronized GDELT/ACLED Conflict Alerts, Maritime Chokepoints, Subsea Cables &amp; Trade Corridors
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Interactive GDELT 2.0 Alerts &amp; Strategic Supply-Chain Theater Map ({run.countryName})
              </h3>
            </div>

            {/* 4 Geospatial Layer Toggles + Clear Filter */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Layers:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLayerGdeltNodes((v) => !v)}
                className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  showLayerGdeltNodes
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                GDELT/ACLED Alerts ({osintEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setShowLayerChokepoints((v) => !v)}
                className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  showLayerChokepoints
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                Chokepoints (6)
              </button>
              <button
                type="button"
                onClick={() => setShowLayerSubseaCables((v) => !v)}
                className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  showLayerSubseaCables
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                Subsea Cables ({subseaCableRoutes.length})
              </button>
              <button
                type="button"
                onClick={() => setShowLayerTradeCorridors((v) => !v)}
                className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  showLayerTradeCorridors
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                Tariff/Trade Arcs ({bilateralTradeCorridors.length})
              </button>
              <button
                type="button"
                onClick={() => setShowRiskChoropleth((v) => !v)}
                className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                  showRiskChoropleth
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                Risk Choropleth
              </button>
              {hasSynchronizedSelection && (
                <button
                  type="button"
                  onClick={clearSynchronizedSelection}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                >
                  <Filter className="w-3 h-3" />
                  <span>Reset Sync Filter</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Geospatial Tactical World Map SVG (8 columns on XL) */}
            <div className="xl:col-span-8 bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 relative overflow-hidden">
              {/* Top Cartographic Projection & Viewport Zoom / Theater Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Natural earth 1:110m vector borders</span>
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
                      aria-pressed={activeTheaterId === preset.id}
                      className="ui-pill"
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
                    aria-pressed={activeTheaterId === 'ACTIVE_SOVEREIGN'}
                    className="ui-pill"
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
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>{zoomLevel.toFixed(1)}x</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                {/* Floating Hovered Country Telemetry HUD Overlay */}
                {hoveredCountry && (
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none px-3 py-2 bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 text-xs tabular-nums space-y-0.5 max-w-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {hoveredCountry.countryName} ({hoveredCountry.iso3})
                      </span>
                      {hoveredCountry.watchlistItem && (
                        <span
                          className={`px-1.5 py-0.2 text-xs font-semibold ${
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
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                        <div>
                          5Y CDS: <strong className="text-blue-600 dark:text-blue-400">{hoveredCountry.watchlistItem.cds5YBps} bps</strong> · 10Y Yield: <strong>{hoveredCountry.watchlistItem.yield10YPct}%</strong>
                        </div>
                        <div>
                          Debt/GDP: <strong>{hoveredCountry.watchlistItem.debtToGdpPct}%</strong> · Reserves: <strong>{hoveredCountry.watchlistItem.fxReservesMonths}m</strong>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold pt-0.5">
                          Click country polygon to switch active sovereign →
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
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
                      className={`w-full h-auto bg-[#E4EDF7] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 select-none ${
                        zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                      role="img"
                      aria-label="GDELT Alerts and Strategic Chokepoint World Map"
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
                      {/* Graticule Grid Lines */}
                      {[60, 120, 180, 240, 300, 360].map((y) => (
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
                      {/* Equator */}
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
                        ? '#e11d48'
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
                          className="text-xs tabular-nums font-semibold fill-emerald-800 dark:fill-emerald-400"
                        >
                          {cable.cableName.split(' ')[0]} ({cable.bandwidthSharePct}% BW)
                        </text>
                      </g>
                    );
                  })}

                {/* LAYER 2: BILATERAL TARIFF & SANCTIONS TRADE CORRIDORS */}
                {showLayerTradeCorridors &&
                  bilateralTradeCorridors.map((arc) => {
                    const pt = projectLatLon(arc.partnerLat, arc.partnerLon);
                    const midX = (sovPt.x + pt.x) / 2;
                    const midY = Math.min(sovPt.y, pt.y) - 28;
                    return (
                      <g key={arc.corridorId} opacity={0.9}>
                        <path
                          d={`M ${sovPt.x} ${sovPt.y} Q ${midX} ${midY} ${pt.x} ${pt.y}`}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={Math.max(1.4, arc.tradeSharePct / 18)}
                        />
                        <circle cx={pt.x} cy={pt.y} r={3.5} fill="#2563eb" />
                        <text
                          x={midX}
                          y={midY - 3}
                          textAnchor="middle"
                          className="text-xs tabular-nums font-semibold fill-blue-800 dark:fill-blue-300"
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
                    const isSelected =
                      selectedChokepointId === cp.corridorId ||
                      highlightedChokepointIds.has(cp.corridorId);
                    const color =
                      cp.vulnerabilityStatus === 'CRITICAL'
                        ? '#e11d48'
                        : cp.vulnerabilityStatus === 'HIGH'
                        ? '#d97706'
                        : '#0284c7';
                    const shortName = cp.corridorName.split(' (')[0];
                    return (
                      <g
                        key={cp.corridorId}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedChokepointId((prev) =>
                            prev === cp.corridorId ? null : cp.corridorId
                          );
                          setSelectedEventId(null);
                        }}
                      >
                        {/* Shipping lane vector to active sovereign */}
                        <line
                          x1={sovPt.x}
                          y1={sovPt.y}
                          x2={cpPt.x}
                          y2={cpPt.y}
                          stroke={color}
                          strokeWidth={isSelected ? 2.2 : 1.0}
                          strokeOpacity={isSelected ? 0.9 : 0.45}
                          strokeDasharray="2 3"
                        />
                        {isSelected && (
                          <circle
                            cx={cpPt.x}
                            cy={cpPt.y}
                            r={13}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth={1.8}
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
                          className={`text-xs tabular-nums ${
                            isSelected
                              ? 'fill-amber-700 dark:fill-amber-300 font-semibold'
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
                    fillOpacity={0.25}
                    stroke="#2563eb"
                    strokeWidth={1.5}
                  />
                  <circle cx={sovPt.x} cy={sovPt.y} r={4.5} fill="#2563eb" stroke="#ffffff" />
                  <text
                    x={sovPt.x}
                    y={sovPt.y - 14}
                    textAnchor="middle"
                    className="text-xs tabular-nums font-semibold fill-slate-900 dark:fill-white"
                  >
                    {run.countryName.toUpperCase()} ({run.iso3})
                  </text>
                </g>

                {/* LAYER 4: PULSING GDELT 2.0 / ACLED CONFLICT & OSINT ALERT NODES */}
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
                        ? '#e11d48'
                        : ev.goldsteinScale <= -5.5
                        ? '#d97706'
                        : '#d97706';

                    return (
                      <g
                        key={ev.eventId}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedEventId((prev) =>
                            prev === ev.eventId ? null : ev.eventId
                          );
                          setSelectedChokepointId(null);
                        }}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius + 6}
                          fill={nodeColor}
                          fillOpacity={isSelected ? 0.45 : 0.22}
                          stroke={isSelected ? '#ffffff' : nodeColor}
                          strokeWidth={isSelected ? 1.8 : 0.8}
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
                          y={cy - radius - 8}
                          textAnchor="middle"
                          className="text-xs tabular-nums font-semibold fill-rose-800 dark:fill-rose-300"
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

              {/* Structured 3-Pillar Plain-English Explainer Below the Tactical Map */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1">
                    1. What This Map Shows
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {osintEvents.length} active GDELT/ACLED conflict nodes, 6 maritime chokepoints, subsea fiber cables, and bilateral trade corridors linked to {sovereignCoord.capitalLabel}.
                  </p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1">
                    2. Why It Matters
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Physical co-location of {subseaCableRoutes[0].cableName} and {chokepoints[0].corridorName.split(' (')[0]} transmits +{gprAndEscalation.expectedProbabilityWeightedCdsDeltaBps} bps into 5Y sovereign CDS spreads.
                  </p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-semibold text-rose-600 dark:text-rose-400 text-xs mb-1">
                    3. Key Thresholds &amp; Filter Sync
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Goldstein conflict scale ≤ -6.0 or chokepoint delay ≥ +7 days triggers supply-chain inflation alerts. Click any map node to filter the Supply-Chain Matrix below.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Tactical Node Inspector & Live OSINT Signal Injector (4 columns on XL) */}
            <div className="xl:col-span-4 space-y-4">
              {/* Tactical Node Inspector Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Tactical Geospatial Node Inspector
                  </span>
                  <span className="text-xs tabular-nums px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                    {selectedEventObj
                      ? 'GDELT / OSINT node'
                      : selectedChokepointObj
                      ? 'Maritime chokepoint'
                      : selectedChainObj
                      ? 'Supply chain hub'
                      : 'Default overview'}
                  </span>
                </div>

                {selectedEventObj ? (
                  <div className="space-y-2 text-xs">
                    <div className="tabular-nums text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {selectedEventObj.cameoCode}
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedEventObj.headline}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">Goldstein / ACLED</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {selectedEventObj.goldsteinScale.toFixed(1)} · {selectedEventObj.acledSeverityScore}/100
                        </span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">Empirical Market Shock</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          +{selectedEventObj.empiricalCdsImpactBps} bps CDS · {selectedEventObj.empiricalFxImpactPct}% FX
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <strong>Synchronized Supply Chains Affected:</strong>{' '}
                      {selectedEventObj.linkedSupplyChainIds.join(', ')}
                    </div>
                  </div>
                ) : selectedChokepointObj ? (
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedChokepointObj.corridorName}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Commodities: {selectedChokepointObj.primaryCommodities}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">Sovereign Trade Share</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {selectedChokepointObj.sovereignTradeShareExposedPct}% (+{selectedChokepointObj.reroutingDelayDays}d delay)
                        </span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">CPI &amp; 5Y CDS Shock</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          +{selectedChokepointObj.importedCpiPassThroughBps} bps CPI · +{selectedChokepointObj.cds5YSpreadImpactBps} bps CDS
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <strong>Synchronized Supply Chains Highlighted Below:</strong>{' '}
                      {selectedChokepointObj.linkedSupplyChainIds.length} strategic input chains
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      Click any <strong>Maritime Chokepoint diamond</strong> or{' '}
                      <strong>pulsing GDELT/ACLED alert circle</strong> on the map to inspect its CAMEO conflict taxonomy and automatically highlight affected cells in the Supply Chain Matrix.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {chokepoints.slice(0, 4).map((cp) => (
                        <button
                          key={cp.corridorId}
                          type="button"
                          onClick={() => setSelectedChokepointId(cp.corridorId)}
                          className="px-2 py-1 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500"
                        >
                          Inspect {cp.corridorName.split(' (')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick OSINT Flash Injector on Map Panel */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                  <span>Inject Live GDELT / OSINT Alert onto Map</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={osintInputText}
                    onChange={(e) => setOsintInputText(e.target.value)}
                    placeholder="Paste breaking maritime, tariff, or cyber alert..."
                    className="flex-1 px-2.5 py-1.5 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleInjectOsintSignal()}
                    className="ui-btn ui-btn-primary shrink-0"
                  >
                    Plot Node
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleInjectOsintSignal(
                        `FLASH GDELT: Naval interdiction in Strait of Hormuz & Red Sea spikes war-risk insurance for ${run.countryName} tankers.`
                      )
                    }
                    className="px-2 py-1 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500"
                  >
                    + Hormuz Tanker Alert
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInjectOsintSignal(
                        `FLASH GDELT: Taiwan Strait wafer foundry export quota inspection delays <7nm semiconductor shipments to ${run.countryName}.`
                      )
                    }
                    className="px-2 py-1 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500"
                  >
                    + Taiwan Strait Chip Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          UPGRADED 4-VIEW INSTITUTIONAL SUPPLY CHAIN MATRIX (SYNCHRONIZED WITH MAP)
          ===================================================================== */}
      {showMapAndSupplyChain && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Synchronized 4-View Supply Chain Dependency Matrix · Chokepoint-to-Commodity Heatmap, HHI vs. Stockpile Quadrant &amp; Upstream Flow Network
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {strategicSupplyChain.conclusionHeadline}
              </h3>
            </div>

            {/* Interactive Export-Ban / Quota Stress Toggles per Commodity Node */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Simulate Export Ban / Quota Cut:</span>
              </span>
              {strategicSupplyChain.supplyChainNodes.map((node) => {
                const banned = activeExportBanChainIds.includes(node.chainId);
                return (
                  <button
                    key={node.chainId}
                    type="button"
                    onClick={() => toggleExportBan(node.chainId)}
                    className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                      banned
                        ? 'bg-rose-600 border-rose-600 text-white font-semibold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                    }`}
                  >
                    {banned ? `BAN: ${node.shortLabel}` : node.shortLabel}
                  </button>
                );
              })}
              {onOpenSupplyChainMatrixDesk && (
                <button
                  type="button"
                  onClick={onOpenSupplyChainMatrixDesk}
                  className="ui-btn ui-btn-primary inline-flex shrink-0 ml-1"
                >
                  <span>Full Leontief &amp; IB Supply Chain Matrix</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* VIEW 1 & VIEW 2: CHOKEPOINT-TO-COMMODITY CROSS-IMPACT HEATMAP + HHI vs. STOCKPILE QUADRANT PLOT */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* View 1: 6x5 Chokepoint-to-Commodity Cross-Impact Heatmap Matrix (7 cols) */}
            <div className="xl:col-span-7 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Chokepoint-to-Commodity Cross-Impact Heatmap (Transit Share % &amp; Stressed CPI bps)
                </div>
                <span className="text-xs tabular-nums text-slate-500">
                  Click any cell to synchronize Map &amp; Matrix
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs tabular-nums text-slate-500">
                      <th className="py-2 px-2">Maritime Corridor \ Chain</th>
                      {strategicSupplyChain.supplyChainNodes.map((sc) => (
                        <th
                          key={sc.chainId}
                          onClick={() =>
                            setSelectedChainId((prev) =>
                              prev === sc.chainId ? null : sc.chainId
                            )
                          }
                          className={`py-2 px-2 text-center cursor-pointer ${
                            highlightedSupplyChainIds.has(sc.chainId)
                              ? 'text-blue-600 dark:text-blue-400 font-semibold underline'
                              : ''
                          }`}
                        >
                          {sc.shortLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs tabular-nums">
                    {chokepoints.map((cp) => {
                      const rowHighlighted = highlightedChokepointIds.has(cp.corridorId);
                      const shortCorridor = cp.corridorName.split(' (')[0];
                      return (
                        <tr
                          key={cp.corridorId}
                          className={
                            rowHighlighted ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''
                          }
                        >
                          <td
                            onClick={() =>
                              setSelectedChokepointId((prev) =>
                                prev === cp.corridorId ? null : cp.corridorId
                              )
                            }
                            className="py-2 px-2 font-sans text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                          >
                            {shortCorridor}
                          </td>
                          {strategicSupplyChain.supplyChainNodes.map((sc) => {
                            const cell = strategicSupplyChain.chokepointCommodityMatrix.find(
                              (c) => c.corridorId === cp.corridorId && c.chainId === sc.chainId
                            );
                            if (!cell) return <td key={sc.chainId} />;
                            const isSyncHighlighted =
                              rowHighlighted || highlightedSupplyChainIds.has(sc.chainId);
                            const cellBg =
                              cell.severityTier === 'CRITICAL'
                                ? 'bg-rose-100/80 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                : cell.severityTier === 'HIGH'
                                ? 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                : cell.severityTier === 'MODERATE'
                                ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';

                            return (
                              <td
                                key={sc.chainId}
                                onClick={() => {
                                  setSelectedChokepointId(cp.corridorId);
                                  setSelectedChainId(sc.chainId);
                                }}
                                className={`p-1.5 text-center border cursor-pointer transition-all ${cellBg} ${
                                  isSyncHighlighted
                                    ? 'ring-2 ring-blue-500 dark:ring-amber-400 font-semibold'
                                    : ''
                                }`}
                              >
                                <div className="text-xs font-semibold tabular-nums">
                                  {cell.transitFlowDependencyPct}% flow
                                </div>
                                <div className="text-xs opacity-85 tabular-nums">
                                  +{cell.stressedCpiImpactBps}bp CPI
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">•</span>
                  <span>
                    <strong>Taiwan Strait Tech Choke:</strong> Concentrates 84% of advanced wafer/chip flow and 76% of rare-earth magnet transit.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">•</span>
                  <span>
                    <strong>Hormuz &amp; Black Sea Inflation Beta:</strong> Hydrocarbon and NPK fertilizer corridors drive the largest headline CPI pass-through when blocked.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">•</span>
                  <span>
                    <strong>Interactive Cell Isolation:</strong> Clicking any cell highlights both the transit corridor on the map and the commodity row below.
                  </span>
                </li>
              </ul>
            </div>

            {/* View 2: Supplier Monopoly (HHI) vs. Domestic Stockpile Buffer Quadrant Scatter Plot (5 cols) */}
            <div className="xl:col-span-5 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Supplier Monopoly (HHI) vs. Domestic Stockpile Buffer (Days) Quadrant
              </div>

              <svg
                viewBox="0 0 440 230"
                className="w-full h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                role="img"
                aria-label="Supplier HHI vs Stockpile Buffer Quadrant Plot"
              >
                {/* Danger Zone Top-Left Quadrant Shading (HHI > 4000, Stockpile < 50d) */}
                <rect
                  x={48}
                  y={16}
                  width={150}
                  height={98}
                  fill="#f43f5e"
                  fillOpacity={0.12}
                />
                <text
                  x={54}
                  y={30}
                  className="text-xs tabular-nums font-semibold fill-rose-600 dark:fill-rose-400"
                >
                  Acute monopoly choke zone
                </text>

                {/* Axes */}
                <line x1={48} y1={195} x2={415} y2={195} stroke="#64748b" strokeWidth={1.2} />
                <line x1={48} y1={16} x2={48} y2={195} stroke="#64748b" strokeWidth={1.2} />

                {/* Quadrant Divider Lines: X = 50 days stockpile, Y = 4000 HHI */}
                <line
                  x1={198}
                  y1={16}
                  x2={198}
                  y2={195}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
                <line
                  x1={48}
                  y1={114}
                  x2={415}
                  y2={114}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />

                <text x={230} y={218} textAnchor="middle" className="text-xs tabular-nums fill-slate-500">
                  Domestic Strategic Stockpile Buffer (Days of Consumption →)
                </text>
                <text
                  x={14}
                  y={110}
                  transform="rotate(-90 14 110)"
                  textAnchor="middle"
                  className="text-xs tabular-nums fill-slate-500"
                >
                  Supplier Monopoly HHI (↑)
                </text>

                {/* Plot each of the 5 Supply Chain Nodes */}
                {strategicSupplyChain.supplyChainNodes.map((sc) => {
                  // Stockpile: 0 to 130 days -> X: 48 to 405
                  const cx = 48 + Math.min(130, sc.domesticStockpileDays) * 2.7;
                  // HHI: 2000 to 8000 -> Y: 195 down to 22
                  const cy =
                    195 - ((Math.max(2000, Math.min(7800, sc.globalSupplierHhiIndex)) - 2000) / 5800) * 170;
                  const isHighlighted = highlightedSupplyChainIds.has(sc.chainId);
                  const isDanger = sc.globalSupplierHhiIndex >= 4000 && sc.domesticStockpileDays <= 45;

                  return (
                    <g
                      key={sc.chainId}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedChainId((prev) =>
                          prev === sc.chainId ? null : sc.chainId
                        )
                      }
                    >
                      {isHighlighted && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={12}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={2}
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={sc.isExportBanActive ? 8 : 6}
                        fill={
                          sc.isExportBanActive
                            ? '#e11d48'
                            : isDanger
                            ? '#f43f5e'
                            : '#3b82f6'
                        }
                        stroke="#ffffff"
                        strokeWidth={1.2}
                      />
                      <text
                        x={cx + 9}
                        y={cy + 3}
                        className="text-xs tabular-nums font-semibold fill-slate-800 dark:fill-slate-200"
                      >
                        {sc.shortLabel} ({sc.domesticStockpileDays}d, HHI {sc.globalSupplierHhiIndex})
                      </text>
                    </g>
                  );
                })}
              </svg>

              <ul className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">•</span>
                  <span>
                    <strong>Extreme HHI Monopoly Concentration:</strong> Rare Earth Magnets (HHI 7,100) and Logic Chips &lt;7nm (HHI 6,450) sit deep inside the top-left danger quadrant.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">•</span>
                  <span>
                    <strong>Stockpile Exhaustion Horizon:</strong> Domestic semiconductor inventories cover just 24 days of industrial consumption before assembly halts.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">•</span>
                  <span>
                    <strong>Export-Ban Stress Amplification:</strong> Toggling an export ban above enlarges the node marker and injects +85% tail amplification into GDP/CPI drag.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* VIEW 3: UPSTREAM EXPORTER-TO-SOVEREIGN INPUT-OUTPUT SANKEY FLOW DIAGRAM */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Upstream Supplier Hub → Maritime Chokepoint → Sovereign Domestic Sector Input-Output Flow Diagram
              </div>
              <span className="text-xs tabular-nums text-slate-500">
                Bezier Width = Flow Share (%) · Color = Bottleneck Vulnerability Score
              </span>
            </div>

            <svg
              viewBox="0 0 860 225"
              className="w-full h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2"
              role="img"
              aria-label="Upstream Exporter to Sovereign Input-Output Flow Diagram"
            >
              <text x={24} y={18} className="text-xs tabular-nums font-semibold fill-slate-500">
                Stage 1: upstream monopoly supplier hubs
              </text>
              <text x={325} y={18} className="text-xs tabular-nums font-semibold fill-slate-500">
                STAGE 2: MARITIME CHOKEPOINT &amp; TARIFF FILTER
              </text>
              <text x={615} y={18} className="text-xs tabular-nums font-semibold fill-slate-500">
                STAGE 3: {run.countryName.toUpperCase()} DOMESTIC SECTORS
              </text>

              {strategicSupplyChain.upstreamFlowLinks.map((link, idx) => {
                const y = 40 + idx * 36;
                const isHighlighted =
                  highlightedSupplyChainIds.has(link.chainId) ||
                  highlightedChokepointIds.has(link.chokepointCorridorId);
                const strokeColor =
                  link.stressedBottleneckScore >= 75
                    ? '#f43f5e'
                    : link.stressedBottleneckScore >= 55
                    ? '#f59e0b'
                    : '#3b82f6';
                const strokeW = Math.max(2, link.flowVolumeSharePct / 16);

                return (
                  <g
                    key={link.linkId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedChainId(link.chainId);
                      setSelectedChokepointId(link.chokepointCorridorId);
                    }}
                    opacity={hasSynchronizedSelection && !isHighlighted ? 0.35 : 1}
                  >
                    {/* Stage 1 Node */}
                    <rect
                      x={20}
                      y={y - 10}
                      width={215}
                      height={24}
                      fill="#0f172a"
                      stroke={strokeColor}
                      strokeWidth={isHighlighted ? 2 : 1}
                      rx={2}
                    />
                    <text x={28} y={y + 5} className="text-xs tabular-nums fill-slate-100">
                      {link.upstreamHubLabel}
                    </text>

                    {/* Bezier 1 -> 2 */}
                    <path
                      d={`M 235 ${y + 2} C 280 ${y + 2}, 285 ${y + 2}, 325 ${y + 2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                    />

                    {/* Stage 2 Chokepoint Node */}
                    <rect
                      x={325}
                      y={y - 10}
                      width={205}
                      height={24}
                      fill="#1e293b"
                      stroke={strokeColor}
                      strokeWidth={isHighlighted ? 2 : 1}
                      rx={2}
                    />
                    <text x={333} y={y + 5} className="text-xs tabular-nums fill-amber-300">
                      {link.chokepointLabel} ({link.flowVolumeSharePct}%)
                    </text>

                    {/* Bezier 2 -> 3 */}
                    <path
                      d={`M 530 ${y + 2} C 570 ${y + 2}, 575 ${y + 2}, 615 ${y + 2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                    />

                    {/* Stage 3 Domestic Sector Node */}
                    <rect
                      x={615}
                      y={y - 10}
                      width={225}
                      height={24}
                      fill="#0f172a"
                      stroke={strokeColor}
                      strokeWidth={isHighlighted ? 2 : 1}
                      rx={2}
                    />
                    <text x={623} y={y + 5} className="text-xs tabular-nums fill-emerald-300">
                      {link.domesticSectorLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* VIEW 4: FULL STRATEGIC SUPPLY-CHAIN DEPENDENCY LEDGER TABLE */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Strategic Supply Chain / Node</th>
                  <th className="py-2.5 px-3">Sovereign Position</th>
                  <th className="py-2.5 px-3 text-right">Net Balance</th>
                  <th className="py-2.5 px-3 text-right">Supplier HHI</th>
                  <th className="py-2.5 px-3 text-right">Stockpile</th>
                  <th className="py-2.5 px-3 text-right">Vulnerability</th>
                  <th className="py-2.5 px-3 text-right">Stressed GDP Drag</th>
                  <th className="py-2.5 px-3 text-right">Stressed CPI Impact</th>
                  <th className="py-2.5 px-3 text-center">Export-Ban Stress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {strategicSupplyChain.supplyChainNodes.map((node) => {
                  const isHighlighted = highlightedSupplyChainIds.has(node.chainId);
                  return (
                    <tr
                      key={node.chainId}
                      onClick={() =>
                        setSelectedChainId((prev) =>
                          prev === node.chainId ? null : node.chainId
                        )
                      }
                      className={`cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-blue-50/70 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {node.commodityOrTechName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Hub: {node.primarySupplierBloc} · Sectors: {node.downstreamDomesticSectors}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                            node.sovereignPosition === 'NET_STRATEGIC_EXPORTER'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : node.sovereignPosition === 'ACUTE_IMPORT_DEPENDENT'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {node.sovereignPosition.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right tabular-nums tabular-nums font-semibold ${
                          node.netTradeBalancePctConsumption >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {node.netTradeBalancePctConsumption >= 0 ? '+' : ''}
                        {node.netTradeBalancePctConsumption}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                        {node.globalSupplierHhiIndex.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {node.domesticStockpileDays}d
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {node.exportControlVulnerabilityScore}/100
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        -{node.stressedGdpImpactBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        +{node.stressedCpiImpactBps} bps
                      </td>
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExportBan(node.chainId);
                        }}
                      >
                        <button
                          type="button"
                          className={`px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                            node.isExportBanActive
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {node.isExportBanActive ? 'Ban active' : 'Normal flow'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE A: HYBRID OSINT & GDELT / ACLED CONFLICT & SANCTIONS EVENT STREAM
          ===================================================================== */}
      {showOsintAndEscalation && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <span>
                  Hybrid Intelligence Ingestion · GDELT 2.0 CAMEO Taxonomy, ACLED Conflict Intensity &amp; Live AI OSINT Signal Parser
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {suite.osintEventStreamHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">
              Goldstein Scale: -10.0 (Extreme Kinetic) to +10.0 (Cooperation)
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Timestamp / Feed</th>
                  <th className="py-2.5 px-3">CAMEO Event Code &amp; Intelligence Headline</th>
                  <th className="py-2.5 px-3 text-right">Coords</th>
                  <th className="py-2.5 px-3 text-right">Goldstein Scale</th>
                  <th className="py-2.5 px-3 text-right">ACLED Severity</th>
                  <th className="py-2.5 px-3 text-right">5Y CDS Impact</th>
                  <th className="py-2.5 px-3 text-right">Spot FX Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {osintEvents.map((ev) => (
                  <tr
                    key={ev.eventId}
                    onClick={() =>
                      setSelectedEventId((prev) =>
                        prev === ev.eventId ? null : ev.eventId
                      )
                    }
                    className={`cursor-pointer ${
                      selectedEventId === ev.eventId
                        ? 'bg-rose-50/60 dark:bg-rose-950/30'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {ev.sourceFeed}
                      </div>
                      <div className="text-xs text-slate-500">{ev.timestampUtc}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="tabular-nums text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {ev.cameoCode} · {ev.locationLabel}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {ev.headline}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-xs text-slate-500">
                      {ev.lat.toFixed(1)}°, {ev.lon.toFixed(1)}°
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      {ev.goldsteinScale.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200">
                      {ev.acledSeverityScore}/100
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      +{ev.empiricalCdsImpactBps} bps
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                      {ev.empiricalFxImpactPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 2: SANCTIONS, TARIFF ESCALATION & FX RESERVE FREEZE LAB
          ===================================================================== */}
      {showSanctionsAndDiplomacy && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>
                  Sanctions, Bilateral Tariff Escalation &amp; Central Bank FX Reserve Freeze Stress Lab
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {sanctionsAndReserves.conclusionHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">
              IMF ARA Minimum Adequacy Threshold: 3.0 Months Cover
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-5 bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Headline vs. Sanctions-Accessible FX Reserves ($Bn &amp; Custody Breakdown)
              </div>

              <svg
                viewBox="0 0 460 175"
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="Central Bank FX Reserve Custody Freeze Waterfall"
              >
                <text
                  x={8}
                  y={32}
                  className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  Headline Reserves
                </text>
                <rect x={145} y={18} width={230} height={20} fill="#3b82f6" rx={2} />
                <text
                  x={382}
                  y={32}
                  className="text-xs tabular-nums font-semibold fill-slate-900 dark:fill-slate-100"
                >
                  ${sanctionsAndReserves.headlineReservesUsdBn}B ({sanctionsAndReserves.headlineImportCoverMonths}m)
                </text>

                <text
                  x={8}
                  y={74}
                  className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  Post-Freeze Usable
                </text>
                {(() => {
                  const usableW = Math.max(
                    12,
                    Math.round(
                      (sanctionsAndReserves.sanctionsInsulatedReservesUsdBn /
                        Math.max(1, sanctionsAndReserves.headlineReservesUsdBn)) *
                        230
                    )
                  );
                  const frozenW = Math.max(0, 230 - usableW);
                  return (
                    <>
                      <rect x={145} y={60} width={usableW} height={20} fill="#10b981" rx={2} />
                      <rect
                        x={145 + usableW}
                        y={60}
                        width={frozenW}
                        height={20}
                        fill="#f43f5e"
                        fillOpacity={0.35}
                        rx={2}
                      />
                      <text
                        x={382}
                        y={74}
                        className="text-xs tabular-nums font-semibold fill-emerald-600 dark:fill-emerald-400"
                      >
                        ${sanctionsAndReserves.sanctionsInsulatedReservesUsdBn}B ({sanctionsAndReserves.sanctionsInsulatedImportCoverMonths}m)
                      </text>
                    </>
                  );
                })()}

                <text
                  x={8}
                  y={122}
                  className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  Custody Tranches
                </text>
                {(() => {
                  const g7W = Math.round((sanctionsAndReserves.g7FreezeExposedSharePct / 100) * 230);
                  const domW = Math.round(
                    (sanctionsAndReserves.domesticGoldAndNonG7SharePct / 100) * 230
                  );
                  const multiW = Math.max(4, 230 - g7W - domW);
                  return (
                    <>
                      <rect x={145} y={108} width={g7W} height={18} fill="#f43f5e" />
                      <rect x={145 + g7W} y={108} width={multiW} height={18} fill="#f59e0b" />
                      <rect
                        x={145 + g7W + multiW}
                        y={108}
                        width={domW}
                        height={18}
                        fill="#10b981"
                      />
                      <text
                        x={145}
                        y={142}
                        className="text-xs tabular-nums fill-slate-600 dark:fill-slate-400"
                      >
                        Red: G7 Custody ({sanctionsAndReserves.g7FreezeExposedSharePct}%) · Amber: IMF SDR · Green: Domestic Gold/CNY ({sanctionsAndReserves.domesticGoldAndNonG7SharePct}%)
                      </text>
                    </>
                  );
                })()}
              </svg>

              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Euroclear / NY Paying-Agent Assessment:{' '}
                </span>
                {sanctionsAndReserves.clearingChannelAssessment}
              </div>
            </div>

            <div className="xl:col-span-7 space-y-4">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-3">Central Bank Reserve Custody Tranche</th>
                      <th className="py-2 px-3 text-right">Share</th>
                      <th className="py-2 px-3 text-right">Gross ($Bn)</th>
                      <th className="py-2 px-3 text-right">Sanctions Haircut</th>
                      <th className="py-2 px-3 text-right">Usable ($Bn)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {sanctionsAndReserves.custodyTranches.map((t) => {
                      const usable = Number(
                        (t.amountUsdBn * (1 - t.effectiveHaircutUnderSanctionsPct / 100)).toFixed(1)
                      );
                      return (
                        <tr key={t.custodyCategory}>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {t.custodyCategory}
                            </div>
                            <div className="text-xs text-slate-500">{t.jurisdictionLabel}</div>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {t.shareOfReservesPct}%
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold">
                            ${t.amountUsdBn}B
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                            -{t.effectiveHaircutUnderSanctionsPct}%
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                            ${usable}B
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-3">Bilateral Trade Partner Corridor</th>
                      <th className="py-2 px-3 text-right">Export Share</th>
                      <th className="py-2 px-3 text-right">Stressed Tariff</th>
                      <th className="py-2 px-3 text-right">GDP Drag</th>
                      <th className="py-2 px-3 text-right">FX Pressure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {sanctionsAndReserves.tariffExposures.map((te) => (
                      <tr key={te.partnerBloc}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {te.partnerBloc}
                          </div>
                          <div className="text-xs text-slate-500">{te.keyVulnerableSectors}</div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {te.shareOfSovereignExportsPct}%
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                          {te.effectiveTariffRatePct}%
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                          -{te.estimatedGdpDragBps} bps
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                          -{te.fxDepreciationPressurePct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE C: UNGA DIPLOMATIC ALIGNMENT, BLOC TOPOLOGY & SECONDARY SANCTIONS CONTAGION
          ===================================================================== */}
      {showSanctionsAndDiplomacy && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Bailey-Strezhnev-Voeten UNGA Voting Topology, Friend-Shoring Beta &amp; Secondary Sanctions Spillover
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {diplomaticAlignment.conclusionHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">
              Friend-Shoring FDI Net Beta: {diplomaticAlignment.friendShoringFdiNetBetaPctGdp >= 0 ? '+' : ''}
              {diplomaticAlignment.friendShoringFdiNetBetaPctGdp}% GDP
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Geopolitical &amp; Economic Bloc</th>
                  <th className="py-2.5 px-3 text-right">UNGA Voting Coincidence</th>
                  <th className="py-2.5 px-3 text-right">Ideal-Point Distance</th>
                  <th className="py-2.5 px-3 text-right">Trade Share</th>
                  <th className="py-2.5 px-3 text-right">FDI Share</th>
                  <th className="py-2.5 px-3 text-center">Secondary Sanctions Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {diplomaticAlignment.blocTopology.map((b) => (
                  <tr key={b.blocName}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {b.blocName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {b.defenseAndSecurityTreatyStatus}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {b.ungaVotingAlignmentPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {b.idealPointDistance.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {b.bilateralTradeSharePct}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {b.fdiStockSharePct}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                          b.secondarySanctionsSpilloverRisk === 'CRITICAL'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                            : b.secondarySanctionsSpilloverRisk === 'ELEVATED'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {b.secondarySanctionsSpilloverRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 3: GPR THREAT vs. ACT INDEX, ELECTORAL FRAGILITY & 3-STAGE ESCALATION TREE
          ===================================================================== */}
      {showOsintAndEscalation && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Caldara-Iacoviello GPR Threat vs. Act Decomposition, Electoral Fragility &amp; 3-Stage Escalation Game-Tree
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {gprAndEscalation.conclusionHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">
              GDELT Goldstein Tone: {gprAndEscalation.gdeltGoldsteinTone}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-5 bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Electoral Calendar &amp; Institutional Insulation Scorecard
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Primary Political Catalyst</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {gprAndEscalation.electoralProfile.nextPoliticalCatalystLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Pre-Election Fiscal Slippage</div>
                  <div className="text-sm tabular-nums font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                    -{gprAndEscalation.electoralProfile.preElectionFiscalSlippagePctGdp}% GDP
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Coalition Cohesion Score</div>
                  <div className="text-sm tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {gprAndEscalation.electoralProfile.coalitionCohesionScore}/100
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Central Bank Insulation</div>
                  <div className="text-sm tabular-nums font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                    {gprAndEscalation.electoralProfile.cbAndJudicialInsulationScore}/100
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Social Unrest Intensity</div>
                  <div className="text-sm tabular-nums font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                    {gprAndEscalation.electoralProfile.socialUnrestAndStrikeIntensity}/100
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-7 space-y-3">
              {gprAndEscalation.escalationTree.map((branch) => {
                const isStage3 = branch.stageId === 'STAGE_3_KINETIC_BLOCKADE';
                const isStage2 = branch.stageId === 'STAGE_2_HYBRID_SANCTIONS';
                return (
                  <div
                    key={branch.stageId}
                    className={`p-4 border ${
                      isStage3
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                        : isStage2
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
                        : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {branch.stageTitle}
                      </span>
                      <span className="px-2 py-0.5 text-xs tabular-nums font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                        Branch Probability: {branch.branchProbabilityPct}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                      {branch.triggerConditions}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 text-xs tabular-nums">
                      <div>
                        <span className="text-slate-500">10Y Local Yield: </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {branch.local10YYieldDeltaBps >= 0 ? '+' : ''}
                          {branch.local10YYieldDeltaBps} bps
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">5Y CDS Spread: </span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {branch.cds5YSpreadDeltaBps >= 0 ? '+' : ''}
                          {branch.cds5YSpreadDeltaBps} bps
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Spot FX Shock: </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {branch.spotFxDeltaPct >= 0 ? '+' : ''}
                          {branch.spotFxDeltaPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE D: CYBER WARFARE, SUBSEA CABLE & CRITICAL GRID INFRASTRUCTURE SCORER
          ===================================================================== */}
      {showCyberAndPortfolio && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Hybrid &amp; Asymmetric Infrastructure Warfare Scorer · Subsea Fiber Cables, Power Grid SCADA, Central Bank RTGS &amp; Port Automation
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {cyberVulnerability.conclusionHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">
              Subsea Cables: {cyberVulnerability.subseaCableRedundancyCount} · Grid Reserve: {cyberVulnerability.powerGridReserveMarginPct}%
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Critical Infrastructure Vector</th>
                  <th className="py-2.5 px-3">Active Threat Actor &amp; Choke Topology</th>
                  <th className="py-2.5 px-3 text-right">Redundancy Score</th>
                  <th className="py-2.5 px-3 text-right">Attack Prob</th>
                  <th className="py-2.5 px-3 text-right">Daily GDP Loss</th>
                  <th className="py-2.5 px-3 text-right">Liquidity Freeze</th>
                  <th className="py-2.5 px-3 text-center">Risk Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {cyberVulnerability.vectors.map((vec) => (
                  <tr
                    key={vec.vectorId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {vec.domainName}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {vec.activeThreatActorProfile}
                      </div>
                      <div className="text-xs text-slate-500">{vec.chokeConcentrationMetric}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {vec.redundancyScore}/100
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                      {vec.attackProbabilityPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      -${vec.estimatedDailyGdpLossUsdMillions}M/d
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {vec.bankingLiquidityFreezeHours} hrs
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                          vec.vulnerabilityTier === 'CRITICAL'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                            : vec.vulnerabilityTier === 'HIGH'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {vec.vulnerabilityTier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE E: DIRECT MULTI-SOVEREIGN PORTFOLIO VaR / PnL STRESS TRANSMISSION
          & MODULE 4: GEOPOLITICAL TAIL-HEDGE & SAFE-HAVEN CONVEXITY PRICER
          ===================================================================== */}
      {showCyberAndPortfolio && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Direct Multi-Sovereign Portfolio Stress Transmission ($250M Book) &amp; Safe-Haven Tail-Hedge Convexity Pricer
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {portfolioTransmission.conclusionHeadline}
              </h3>
            </div>
            <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              Top Hedge: {suite.topRankedHedgeInstrument}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Sovereign Book Position ($250M NAV)</th>
                  <th className="py-2.5 px-3 text-right">Book Weight</th>
                  <th className="py-2.5 px-3 text-right">Notional</th>
                  <th className="py-2.5 px-3 text-right">Geo Contagion Beta</th>
                  <th className="py-2.5 px-3 text-right">Projected 5Y CDS</th>
                  <th className="py-2.5 px-3 text-right">Projected Spot FX</th>
                  <th className="py-2.5 px-3 text-right">Projected 10Y Yield</th>
                  <th className="py-2.5 px-3 text-right">Unhedged Stress PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {portfolioTransmission.positionTransmissions.map((row) => (
                  <tr
                    key={row.iso3}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                      row.iso3 === run.iso3 ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {row.countryName} ({row.iso3}) · {row.currencyCode}
                      {row.iso3 === run.iso3 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs tabular-nums bg-blue-600 text-white">
                          Active epicenter
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {row.weightNavPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      ${row.notionalUsdMillions}M
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {row.geopoliticalSpilloverBeta.toFixed(2)}x
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      +{row.projectedCdsWideningBps} bps
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {row.projectedFxMovePct}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      +{row.projectedLocalYieldMoveBps} bps
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      -${Math.abs(row.unhedgedStressPnlUsdThousands).toLocaleString()}k ({row.unhedgedStressReturnBpsNav} bps)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2.5">
              <Umbrella className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{suite.tailHedgeConclusionHeadline}</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Rank &amp; Tail-Hedge Instrument</th>
                    <th className="py-2.5 px-3">Asset Class</th>
                    <th className="py-2.5 px-3 text-right">Annual Carry / Bleed</th>
                    <th className="py-2.5 px-3 text-right">+2σ GPR Shock Payoff</th>
                    <th className="py-2.5 px-3 text-right">Convexity / Carry Ratio</th>
                    <th className="py-2.5 px-3 text-right">Drawdown Corr</th>
                    <th className="py-2.5 px-3 text-right">Target Sizing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {tailHedges.map((h, i) => (
                    <tr
                      key={h.hedgeId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          #{i + 1} · {h.instrumentName}
                        </div>
                        <div className="text-xs text-slate-500">{h.protectionMechanism}</div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-xs text-slate-600 dark:text-slate-400">
                        {h.assetClass}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {h.annualizedCarryCostBps} bps/yr
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        +{h.twoSigmaGprShockPayoffBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        {h.convexityToCarryRatio.toFixed(2)}x
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        +{h.correlationToSovereignDrawdown.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {h.recommendedAllocationPctNav}% NAV
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
          NEW MODULE F: SANCTION COALITION & RESERVE FREEZE CASCADE SIMULATOR
          + 8-QUARTER KINETIC-TO-MACRO SHOCK IMPULSE RESPONSE CURVES (IRFs)
          ===================================================================== */}
      {showCoalitionAndIrf && (
        <div className="space-y-6">
          {/* Sub-Panel 1: Interactive Sanction Coalition & Central Bank Reserve Freeze Simulator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>
                    Interactive Multilateral Sanction Coalition Builder · Central Bank Reserve Custody Freeze &amp; Secondary Tariff Cascade
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Active Coalition Freezes ${coalitionCascade.frozenReservesUsdBn}B ({coalitionCascade.frozenSharePct}% of Total Reserves) · Sanction-Immune Liquidity: ${coalitionCascade.sanctionImmuneReservesUsdBn}B ({coalitionCascade.effectiveImportCoverMonths}m Import Cover)
                </h3>
              </div>

              {/* Toggleable Sanctioning Blocs */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {(
                  [
                    { id: 'OFAC_PRIMARY', label: 'US OFAC Primary (SDN)' },
                    { id: 'OFAC_SECONDARY', label: 'US Secondary Tariffs' },
                    { id: 'EU_COUNCIL', label: 'EU Council / Euroclear' },
                    { id: 'UK_G7_CAP', label: 'UK OFSI / G7 Maritime Cap' },
                    { id: 'UN_SC', label: 'UN Ch. VII Mandate' },
                  ] as Array<{ id: SanctionBlocId; label: string }>
                ).map((bloc) => {
                  const active = activeSanctionBlocs.includes(bloc.id);
                  return (
                    <button
                      key={bloc.id}
                      type="button"
                      onClick={() => toggleSanctionBloc(bloc.id)}
                      className={`px-2.5 py-1 text-xs tabular-nums border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-rose-600 border-rose-600 text-white font-semibold'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {bloc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4-Card Sanction Cascade Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                <span className="text-rose-600 dark:text-rose-400 block">Immediately Frozen FX Reserves</span>
                <span className="tabular-nums font-semibold text-lg text-rose-600 dark:text-rose-400">
                  ${coalitionCascade.frozenReservesUsdBn}B ({coalitionCascade.frozenSharePct}%)
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Out of ${coalitionCascade.totalReservesUsdBn}B Gross Sovereign Reserves
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Sanction-Immune Usable Reserves</span>
                <span className="tabular-nums font-semibold text-lg text-emerald-600 dark:text-emerald-400">
                  ${coalitionCascade.sanctionImmuneReservesUsdBn}B
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Effective Import Cover: {coalitionCascade.effectiveImportCoverMonths} Months
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Shadow-Fleet / Export Price Haircut</span>
                <span className="tabular-nums font-semibold text-lg text-amber-600 dark:text-amber-400">
                  -{coalitionCascade.exportPriceHaircutPct}% Discount
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Bilateral Export Revenue Loss: -{coalitionCascade.bilateralExportLossPctGdp}% GDP
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">SWIFT-to-CIPS / Barter Rerouting Drag</span>
                <span className="tabular-nums font-semibold text-lg text-slate-900 dark:text-slate-100">
                  +{coalitionCascade.paymentReroutingCostBps} bps
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Cross-Border Settlement Friction Premium
                </span>
              </div>
            </div>

            {/* Central Bank Reserve Custody Breakdown Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Central Bank Reserve Tranche &amp; Custody Jurisdiction</th>
                    <th className="py-2.5 px-3">Primary Settlement Rail</th>
                    <th className="py-2.5 px-3 text-right">Portfolio Share</th>
                    <th className="py-2.5 px-3 text-right">Tranche Notional</th>
                    <th className="py-2.5 px-3 text-center">Coalition Freeze Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {coalitionCascade.custodyTranches.map((tr) => (
                    <tr
                      key={tr.trancheId}
                      className={
                        tr.frozen
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {tr.custodyLabel}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-xs text-slate-600 dark:text-slate-400">
                        {tr.settlementRail}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {tr.sharePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        ${tr.amountUsdBn}B
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                            tr.frozen
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {tr.frozen ? 'Immobilised or frozen' : 'Liquid and accessible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Panel 2: 8-Quarter Kinetic-to-Macro Shock Impulse Response Curves (IRFs) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    8-Quarter Structural VAR Kinetic-to-Macro Shock Impulse Response Functions (Q0–Q8)
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {kineticIrfAnalytics.triggerLabel} · Peak Q+2 Impact: +{kineticIrfAnalytics.peakCpiBps}bp CPI, {kineticIrfAnalytics.peakGdpDropPct}% GDP, +{kineticIrfAnalytics.peakCdsBps}bp 5Y CDS
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {(
                  [
                    { id: 'MARITIME_BLOCKADE', label: 'Maritime Blockade' },
                    { id: 'ENERGY_EMBARGO', label: 'Energy Embargo' },
                    { id: 'BORDER_KINETIC', label: 'Border Kinetic Conflict' },
                    { id: 'FULL_SANCTIONS', label: 'Full G7/OFAC Sanctions' },
                  ] as Array<{ id: KineticIrfTrigger; label: string }>
                ).map((trig) => (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => setSelectedIrfTrigger(trig.id)}
                    aria-pressed={selectedIrfTrigger === trig.id}
                    className="ui-pill whitespace-nowrap shrink-0"
                  >
                    {trig.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Chart: CPI Pass-Through & 5Y CDS Impulse Response (bps) */}
              <div className="xl:col-span-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Headline CPI Inflation Pass-Through &amp; 5Y Sovereign CDS Widening (bps, Q0–Q8)
                  </span>
                  <span className="tabular-nums text-xs text-slate-400">
                    Amber: CPI (+bp) · Red: 5Y CDS (+bp)
                  </span>
                </div>
                {(() => {
                  const svgW = 520;
                  const svgH = 200;
                  const padL = 44;
                  const padR = 18;
                  const padT = 16;
                  const padB = 26;
                  const maxBps = Math.max(
                    380,
                    ...kineticIrfAnalytics.irfSeries.map((d) =>
                      Math.max(d.cpiShockBps, d.cdsShockBps)
                    )
                  );
                  const toX = (i: number) =>
                    padL +
                    (i / (kineticIrfAnalytics.irfSeries.length - 1)) * (svgW - padL - padR);
                  const toY = (v: number) =>
                    padT + (1 - Math.max(0, Math.min(maxBps, v)) / maxBps) * (svgH - padT - padB);

                  const cpiPts = kineticIrfAnalytics.irfSeries
                    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.cpiShockBps).toFixed(1)}`)
                    .join(' ');
                  const cdsPts = kineticIrfAnalytics.irfSeries
                    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.cdsShockBps).toFixed(1)}`)
                    .join(' ');

                  return (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-56 bg-slate-950 border border-slate-800"
                    >
                      {[0.25, 0.5, 0.75, 1].map((frac) => {
                        const y = padT + (1 - frac) * (svgH - padT - padB);
                        const val = Math.round(maxBps * frac);
                        return (
                          <g key={frac}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={svgW - padR}
                              y2={y}
                              stroke="#1e293b"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={padL - 6}
                              y={y + 3}
                              textAnchor="end"
                              className="text-xs tabular-nums fill-slate-400"
                            >
                              +{val}
                            </text>
                          </g>
                        );
                      })}
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2.3}
                        points={cpiPts}
                      />
                      <polyline
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth={2.3}
                        points={cdsPts}
                      />
                      {kineticIrfAnalytics.irfSeries.map((d, i) => (
                        <g key={d.quarter}>
                          <circle
                            cx={toX(i)}
                            cy={toY(d.cpiShockBps)}
                            r={3}
                            fill="#f59e0b"
                          />
                          <circle
                            cx={toX(i)}
                            cy={toY(d.cdsShockBps)}
                            r={3}
                            fill="#f43f5e"
                          />
                          <text
                            x={toX(i)}
                            y={svgH - 7}
                            textAnchor="middle"
                            className="text-xs tabular-nums fill-slate-400"
                          >
                            {d.quarter}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>

              {/* Right Chart: Real GDP Contraction & Defense Fiscal Deficit Surge (% GDP) */}
              <div className="xl:col-span-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Real GDP Contraction vs. Defense Fiscal Surge (% GDP, Q0–Q8)
                  </span>
                  <span className="tabular-nums text-xs text-slate-400">
                    Blue: Real GDP (%) · Purple: Fiscal Surge (+% GDP)
                  </span>
                </div>
                {(() => {
                  const svgW = 520;
                  const svgH = 200;
                  const padL = 44;
                  const padR = 18;
                  const padT = 16;
                  const padB = 26;
                  const minPct = -5.0;
                  const maxPct = 5.0;
                  const toX = (i: number) =>
                    padL +
                    (i / (kineticIrfAnalytics.irfSeries.length - 1)) * (svgW - padL - padR);
                  const toY = (v: number) =>
                    padT +
                    (1 - (Math.max(minPct, Math.min(maxPct, v)) - minPct) / (maxPct - minPct)) *
                      (svgH - padT - padB);

                  const gdpPts = kineticIrfAnalytics.irfSeries
                    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.gdpImpulsePct).toFixed(1)}`)
                    .join(' ');
                  const fiscPts = kineticIrfAnalytics.irfSeries
                    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.fiscalSurgePctGdp).toFixed(1)}`)
                    .join(' ');
                  const zeroY = toY(0);

                  return (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-56 bg-slate-950 border border-slate-800"
                    >
                      {[-4, -2, 0, 2, 4].map((val) => {
                        const y = toY(val);
                        return (
                          <g key={val}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={svgW - padR}
                              y2={y}
                              stroke={val === 0 ? '#475569' : '#1e293b'}
                              strokeDasharray={val === 0 ? '4 2' : '3 3'}
                            />
                            <text
                              x={padL - 6}
                              y={y + 3}
                              textAnchor="end"
                              className="text-xs tabular-nums fill-slate-400"
                            >
                              {val > 0 ? `+${val}%` : `${val}%`}
                            </text>
                          </g>
                        );
                      })}
                      <line
                        x1={padL}
                        y1={zeroY}
                        x2={svgW - padR}
                        y2={zeroY}
                        stroke="#64748b"
                        strokeWidth={1}
                      />
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2.3}
                        points={gdpPts}
                      />
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2.3}
                        points={fiscPts}
                      />
                      {kineticIrfAnalytics.irfSeries.map((d, i) => (
                        <g key={d.quarter}>
                          <circle
                            cx={toX(i)}
                            cy={toY(d.gdpImpulsePct)}
                            r={3}
                            fill="#3b82f6"
                          />
                          <circle
                            cx={toX(i)}
                            cy={toY(d.fiscalSurgePctGdp)}
                            r={3}
                            fill="#3b82f6"
                          />
                          <text
                            x={toX(i)}
                            y={svgH - 7}
                            textAnchor="middle"
                            className="text-xs tabular-nums fill-slate-400"
                          >
                            {d.quarter}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW MODULE G: REGIME STABILITY, ELECTION CYCLE & POLITICAL TRANSITION TRACKER
          + STRATEGIC COMMODITY & DEFENSE INDUSTRIAL MOBILIZATION LEDGER
          ===================================================================== */}
      {showRegimeAndMobilization && (
        <div className="space-y-6">
          {/* Sub-Panel 1: Regime Stability, Election Cycle & Political Transition Tracker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    Regime Stability, Parliamentary Coalition Durability &amp; Electoral Transition Tail-Risk Tracker ({run.countryName})
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Composite Institutional Stability Score: {regimeStabilityAnalytics.compositeStabilityScore}/100 · Electoral Unrest Stress Parameter: {wargameParams.electoralAndUnrestShock}/100
                </h3>
              </div>
              <span className="text-xs tabular-nums text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                WB Political Stability Percentile: {run.openData.worldBankIndicators.politicalStabilityPercentile}th
              </span>
            </div>

            {/* 5 Institutional Pillar Bars */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {regimeStabilityAnalytics.pillars.map((pil) => (
                <div
                  key={pil.pillarName}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                    {pil.pillarName}
                  </div>
                  <div className="flex items-center justify-between tabular-nums">
                    <span
                      className={`text-sm font-semibold ${
                        pil.score < 45
                          ? 'text-rose-600 dark:text-rose-400'
                          : pil.score < 65
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {pil.score}/100
                    </span>
                    <span className="text-xs text-slate-400">
                      {pil.score < 45 ? 'Fragile' : pil.score < 65 ? 'Watch' : 'Resilient'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        pil.score < 45
                          ? 'bg-rose-600'
                          : pil.score < 65
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pil.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pil.keyDriver}
                  </p>
                </div>
              ))}
            </div>

            {/* Electoral & Political Transition Pricing Matrix */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Political / Electoral Transition Scenario</th>
                    <th className="py-2.5 px-3 text-right">Implied Prob</th>
                    <th className="py-2.5 px-3">Primary Balance Trajectory</th>
                    <th className="py-2.5 px-3 text-right">10Y Yield Impact</th>
                    <th className="py-2.5 px-3 text-right">Spot FX Move</th>
                    <th className="py-2.5 px-3">Agency Rating Outlook Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {regimeStabilityAnalytics.electoralScenarios.map((sc) => (
                    <tr
                      key={sc.scenarioId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {sc.scenarioTitle}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        {sc.probabilityPct}%
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-700 dark:text-slate-300">
                        {sc.primaryBalanceDeltaPctGdp}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right tabular-nums tabular-nums font-semibold ${
                          sc.yield10YImpactBps > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {sc.yield10YImpactBps > 0 ? '+' : ''}
                        {sc.yield10YImpactBps} bps
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        {sc.spotFxImpactPct}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {sc.ratingOutlookImpact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Panel 2: Strategic Commodity & Defense Industrial Mobilization Ledger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Strategic Commodity Buffer Stockpile Days &amp; Defense Industrial Surge Ledger ({run.countryName})
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  Defense Expenditure Surge: {mobilizationLedger.baseDefenseSpendPctGdp}% → {mobilizationLedger.stressedDefenseTargetPctGdp}% GDP (+{mobilizationLedger.defenseFiscalSurgePctGdp}% GDP) · Industrial Utilization: {mobilizationLedger.defenseIndustrialUtilizationPct}%
                </h3>
              </div>
              <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                12M Stockpile Replenishment Issuance: +${mobilizationLedger.stockpileReplenishmentUsdBn}B
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Strategic Wartime / Crisis Commodity Vertical</th>
                    <th className="py-2.5 px-3 text-right">Domestic Self-Sufficiency</th>
                    <th className="py-2.5 px-3 text-right">Net Import Dependency</th>
                    <th className="py-2.5 px-3 text-right">Baseline Buffer</th>
                    <th className="py-2.5 px-3 text-right">Stressed Buffer Horizon</th>
                    <th className="py-2.5 px-3">Primary Chokepoint / Licensing Exposure</th>
                    <th className="py-2.5 px-3 text-center">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {mobilizationLedger.verticals.map((v) => (
                    <tr
                      key={v.verticalId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {v.verticalName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {v.domesticSelfSufficiencyPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {v.netImportDependencyPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        {v.baselineBufferDays} days
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right tabular-nums tabular-nums font-semibold ${
                          v.stressedBufferDays < 30
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {v.stressedBufferDays} days
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                        {v.primaryChokeExposure}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs tabular-nums font-semibold border ${
                            v.mobilizationPriority === 'CRITICAL'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {v.mobilizationPriority}
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
    </div>
  );
};

