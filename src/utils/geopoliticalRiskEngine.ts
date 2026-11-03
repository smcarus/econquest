import {
  BilateralTariffExposure,
  BilateralTradeCorridorArc,
  ChokepointCommodityCell,
  CyberInfrastructureVector,
  CyberVulnerabilityResult,
  DiplomaticAlignmentResult,
  DiplomaticBlocNode,
  ElectoralFragilityProfile,
  EscalationBranchNode,
  GeoPortfolioTransmissionRow,
  GeoPortfolioTransmissionSummary,
  GeopoliticalRiskDeskSuite,
  GeopoliticalTailHedgeItem,
  GeopoliticalWargameParams,
  GprAndEscalationResult,
  MaritimeChokepointImpact,
  OpenDataSnapshot,
  OsintConflictEvent,
  ReserveCustodyTranche,
  SanctionsAndReserveFreezeResult,
  StrategicSupplyChainNode,
  StrategicSupplyChainResult,
  SubseaCableRouteArc,
  UpstreamSupplyFlowLink,
} from '../types/council';

export const DEFAULT_WARGAME_PARAMS: GeopoliticalWargameParams = {
  chokepointClosureSeverityPct: 25,
  tariffEscalationPct: 15,
  sanctionsAndClearingIntensity: 20,
  electoralAndUnrestShock: 25,
  cyberHybridIntensityPct: 20,
};

interface SovereignGeopoliticalProfile {
  coord: { lat: number; lon: number; capitalLabel: string };
  chokepointWeights: {
    hormuz: number;
    babElMandeb: number;
    taiwanStrait: number;
    suez: number;
    panama: number;
    blackSea: number;
  };
  g7ReserveCustodyPct: number;
  multilateralSdrPct: number;
  domesticGoldAndNonG7Pct: number;
  clearingVulnerabilityFactor: number;
  tariffPartners: {
    bloc: string;
    partnerLat: number;
    partnerLon: number;
    exportSharePct: number;
    baseTariffPct: number;
    sectors: string;
    elasticity: number;
    linkedSupplyChainIds: string[];
  }[];
  electoralCatalyst: string;
  baseFiscalSlippagePctGdp: number;
  baseCoalitionCohesion: number;
  baseCbInsulation: number;
  baseSocialUnrest: number;
  blocClassification: DiplomaticAlignmentResult['geoeconomicBlocClassification'];
  usG7IdealPoint: number;
  chinaScoIdealPoint: number;
  nonAlignedSwingLeverage: number;
  friendShoringBetaPctGdp: number;
  subseaCableRedundancy: number;
  powerGridReserveMarginPct: number;
  cyberFragilityBase: number;
}

const COUNTRY_GEO_PROFILES: Record<string, SovereignGeopoliticalProfile> = {
  BRA: {
    coord: { lat: -15.8, lon: -47.9, capitalLabel: 'Brasília / Santos Port' },
    chokepointWeights: {
      hormuz: 14,
      babElMandeb: 9,
      taiwanStrait: 24,
      suez: 11,
      panama: 16,
      blackSea: 12,
    },
    g7ReserveCustodyPct: 68,
    multilateralSdrPct: 11,
    domesticGoldAndNonG7Pct: 21,
    clearingVulnerabilityFactor: 0.28,
    tariffPartners: [
      {
        bloc: 'China & Asia-Pacific',
        partnerLat: 31.2,
        partnerLon: 121.5,
        exportSharePct: 31.4,
        baseTariffPct: 4.5,
        sectors: 'Iron Ore, Soybeans, Crude Oil, Cellulose',
        elasticity: 0.42,
        linkedSupplyChainIds: ['critical_minerals_pgms', 'semi_logic_7nm', 'rare_earth_magnets'],
      },
      {
        bloc: 'United States & USMCA',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 12.2,
        baseTariffPct: 6.0,
        sectors: 'Aerospace, Steel, Semi-Manufactured Goods, Coffee',
        elasticity: 0.55,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'semi_logic_7nm'],
      },
      {
        bloc: 'European Union (Mercosur Corridor)',
        partnerLat: 51.9,
        partnerLon: 4.5,
        exportSharePct: 14.8,
        baseTariffPct: 5.5,
        sectors: 'Agribusiness, Minerals, Biofuels',
        elasticity: 0.38,
        linkedSupplyChainIds: ['fertilizer_staple_grain', 'critical_minerals_pgms'],
      },
    ],
    electoralCatalyst: '2026 General Election & Fiscal Framework Target Review',
    baseFiscalSlippagePctGdp: 0.65,
    baseCoalitionCohesion: 58,
    baseCbInsulation: 76,
    baseSocialUnrest: 34,
    blocClassification: 'MULTI_ALIGNED_SWING_HEDGER',
    usG7IdealPoint: 0.18,
    chinaScoIdealPoint: 0.44,
    nonAlignedSwingLeverage: 84,
    friendShoringBetaPctGdp: 0.45,
    subseaCableRedundancy: 7,
    powerGridReserveMarginPct: 18.5,
    cyberFragilityBase: 38,
  },
  MEX: {
    coord: { lat: 19.4, lon: -99.1, capitalLabel: 'Mexico City / Manzanillo' },
    chokepointWeights: {
      hormuz: 8,
      babElMandeb: 5,
      taiwanStrait: 22,
      suez: 6,
      panama: 28,
      blackSea: 3,
    },
    g7ReserveCustodyPct: 76,
    multilateralSdrPct: 10,
    domesticGoldAndNonG7Pct: 14,
    clearingVulnerabilityFactor: 0.22,
    tariffPartners: [
      {
        bloc: 'United States (USMCA Joint Review)',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 79.5,
        baseTariffPct: 2.5,
        sectors: 'Automotive, Electronics, Machinery, Energy',
        elasticity: 0.88,
        linkedSupplyChainIds: ['semi_logic_7nm', 'crude_lng_hydrocarbons', 'critical_minerals_pgms'],
      },
      {
        bloc: 'European Union & UK',
        partnerLat: 51.9,
        partnerLon: 4.5,
        exportSharePct: 5.4,
        baseTariffPct: 3.5,
        sectors: 'Auto Parts, Medical Devices, Chemicals',
        elasticity: 0.35,
        linkedSupplyChainIds: ['semi_logic_7nm', 'fertilizer_staple_grain'],
      },
      {
        bloc: 'China & East Asia Supply Chain',
        partnerLat: 31.2,
        partnerLon: 121.5,
        exportSharePct: 3.8,
        baseTariffPct: 8.0,
        sectors: 'Copper, Intermediate Components, Minerals',
        elasticity: 0.45,
        linkedSupplyChainIds: ['semi_logic_7nm', 'rare_earth_magnets'],
      },
    ],
    electoralCatalyst: '2026 USMCA Joint Review & Judicial Reform Implementation',
    baseFiscalSlippagePctGdp: 0.55,
    baseCoalitionCohesion: 74,
    baseCbInsulation: 72,
    baseSocialUnrest: 38,
    blocClassification: 'US_G7_ANCHORED',
    usG7IdealPoint: 0.58,
    chinaScoIdealPoint: -0.12,
    nonAlignedSwingLeverage: 68,
    friendShoringBetaPctGdp: 1.35,
    subseaCableRedundancy: 8,
    powerGridReserveMarginPct: 9.4,
    cyberFragilityBase: 44,
  },
  TUR: {
    coord: { lat: 41.0, lon: 29.0, capitalLabel: 'Ankara / Istanbul Bosphorus' },
    chokepointWeights: {
      hormuz: 26,
      babElMandeb: 19,
      taiwanStrait: 12,
      suez: 24,
      panama: 4,
      blackSea: 36,
    },
    g7ReserveCustodyPct: 44,
    multilateralSdrPct: 9,
    domesticGoldAndNonG7Pct: 47,
    clearingVulnerabilityFactor: 0.58,
    tariffPartners: [
      {
        bloc: 'European Union Customs Union',
        partnerLat: 50.8,
        partnerLon: 4.3,
        exportSharePct: 41.2,
        baseTariffPct: 3.0,
        sectors: 'Automotive, Textiles, White Goods, Steel',
        elasticity: 0.68,
        linkedSupplyChainIds: ['semi_logic_7nm', 'critical_minerals_pgms'],
      },
      {
        bloc: 'MENA & Gulf Cooperation Council',
        partnerLat: 25.2,
        partnerLon: 55.3,
        exportSharePct: 18.6,
        baseTariffPct: 5.0,
        sectors: 'Defense, Construction Materials, Refined Fuels',
        elasticity: 0.46,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'],
      },
      {
        bloc: 'United States & NATO Corridor',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 6.4,
        baseTariffPct: 7.5,
        sectors: 'Steel, Aluminum, Chemicals, Defense Components',
        elasticity: 0.52,
        linkedSupplyChainIds: ['semi_logic_7nm', 'crude_lng_hydrocarbons'],
      },
    ],
    electoralCatalyst: 'Orthodox Monetary Endurance vs. Municipal Wage & Credit Demands',
    baseFiscalSlippagePctGdp: 0.85,
    baseCoalitionCohesion: 66,
    baseCbInsulation: 54,
    baseSocialUnrest: 49,
    blocClassification: 'MULTI_ALIGNED_SWING_HEDGER',
    usG7IdealPoint: 0.14,
    chinaScoIdealPoint: 0.36,
    nonAlignedSwingLeverage: 89,
    friendShoringBetaPctGdp: 0.62,
    subseaCableRedundancy: 6,
    powerGridReserveMarginPct: 14.2,
    cyberFragilityBase: 54,
  },
  EGY: {
    coord: { lat: 30.0, lon: 31.2, capitalLabel: 'Cairo / Suez Canal Authority' },
    chokepointWeights: {
      hormuz: 28,
      babElMandeb: 42,
      taiwanStrait: 9,
      suez: 48,
      panama: 3,
      blackSea: 34,
    },
    g7ReserveCustodyPct: 48,
    multilateralSdrPct: 16,
    domesticGoldAndNonG7Pct: 36,
    clearingVulnerabilityFactor: 0.52,
    tariffPartners: [
      {
        bloc: 'European Union Med Energy & Trade',
        partnerLat: 41.9,
        partnerLon: 12.5,
        exportSharePct: 32.5,
        baseTariffPct: 3.5,
        sectors: 'LNG, Fertilizers, Petrochemicals, Produce',
        elasticity: 0.64,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'],
      },
      {
        bloc: 'GCC & Red Sea Corridor',
        partnerLat: 24.7,
        partnerLon: 46.7,
        exportSharePct: 24.0,
        baseTariffPct: 4.0,
        sectors: 'Refined Petroleum, Cables, Foodstuffs',
        elasticity: 0.55,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'],
      },
      {
        bloc: 'United States (QIZ Protocol)',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 7.8,
        baseTariffPct: 4.5,
        sectors: 'Apparel, Textiles, Fertilizers',
        elasticity: 0.48,
        linkedSupplyChainIds: ['semi_logic_7nm', 'fertilizer_staple_grain'],
      },
    ],
    electoralCatalyst: 'IMF EFF Structural Reform Reviews & Food/Fuel Subsidy Phasing',
    baseFiscalSlippagePctGdp: 0.95,
    baseCoalitionCohesion: 68,
    baseCbInsulation: 58,
    baseSocialUnrest: 56,
    blocClassification: 'MULTI_ALIGNED_SWING_HEDGER',
    usG7IdealPoint: 0.12,
    chinaScoIdealPoint: 0.39,
    nonAlignedSwingLeverage: 77,
    friendShoringBetaPctGdp: 0.28,
    subseaCableRedundancy: 14,
    powerGridReserveMarginPct: 8.2,
    cyberFragilityBase: 64,
  },
  ZAF: {
    coord: { lat: -25.7, lon: 28.2, capitalLabel: 'Pretoria / Durban Port' },
    chokepointWeights: {
      hormuz: 21,
      babElMandeb: 14,
      taiwanStrait: 24,
      suez: 15,
      panama: 6,
      blackSea: 8,
    },
    g7ReserveCustodyPct: 58,
    multilateralSdrPct: 12,
    domesticGoldAndNonG7Pct: 30,
    clearingVulnerabilityFactor: 0.36,
    tariffPartners: [
      {
        bloc: 'China & BRICS Commodity Corridor',
        partnerLat: 31.2,
        partnerLon: 121.5,
        exportSharePct: 23.8,
        baseTariffPct: 4.0,
        sectors: 'PGMs, Iron Ore, Manganese, Chrome',
        elasticity: 0.61,
        linkedSupplyChainIds: ['critical_minerals_pgms', 'rare_earth_magnets'],
      },
      {
        bloc: 'European Union EPA',
        partnerLat: 51.9,
        partnerLon: 4.5,
        exportSharePct: 21.5,
        baseTariffPct: 3.5,
        sectors: 'Automotive, Platinum Group Metals, Citrus',
        elasticity: 0.52,
        linkedSupplyChainIds: ['critical_minerals_pgms', 'semi_logic_7nm'],
      },
      {
        bloc: 'United States (AGOA Renewal Risk)',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 8.9,
        baseTariffPct: 6.5,
        sectors: 'Vehicles, Precious Metals, Ferroalloys',
        elasticity: 0.72,
        linkedSupplyChainIds: ['critical_minerals_pgms', 'semi_logic_7nm'],
      },
    ],
    electoralCatalyst: 'GNU Coalition Budget Votes & Transnet/Eskom Logistics Tariffs',
    baseFiscalSlippagePctGdp: 0.60,
    baseCoalitionCohesion: 61,
    baseCbInsulation: 84,
    baseSocialUnrest: 52,
    blocClassification: 'EURASIAN_SCO_TILTED',
    usG7IdealPoint: -0.08,
    chinaScoIdealPoint: 0.56,
    nonAlignedSwingLeverage: 74,
    friendShoringBetaPctGdp: -0.15,
    subseaCableRedundancy: 5,
    powerGridReserveMarginPct: 6.8,
    cyberFragilityBase: 58,
  },
  POL: {
    coord: { lat: 52.2, lon: 21.0, capitalLabel: 'Warsaw / Gdańsk LNG Terminal' },
    chokepointWeights: {
      hormuz: 12,
      babElMandeb: 11,
      taiwanStrait: 15,
      suez: 13,
      panama: 4,
      blackSea: 29,
    },
    g7ReserveCustodyPct: 72,
    multilateralSdrPct: 8,
    domesticGoldAndNonG7Pct: 20,
    clearingVulnerabilityFactor: 0.16,
    tariffPartners: [
      {
        bloc: 'Eurozone Core (Germany Supply Chain)',
        partnerLat: 52.5,
        partnerLon: 13.4,
        exportSharePct: 58.4,
        baseTariffPct: 0.0,
        sectors: 'EV Batteries, Machinery, Auto Components, Furniture',
        elasticity: 0.48,
        linkedSupplyChainIds: ['semi_logic_7nm', 'critical_minerals_pgms'],
      },
      {
        bloc: 'United States & UK',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 9.2,
        baseTariffPct: 4.5,
        sectors: 'Aviation Parts, IT Services, Industrial Goods',
        elasticity: 0.44,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'semi_logic_7nm'],
      },
      {
        bloc: 'Eastern Flank & Ukraine Reconstruction',
        partnerLat: 50.4,
        partnerLon: 30.5,
        exportSharePct: 7.5,
        baseTariffPct: 2.0,
        sectors: 'Energy Logistics, Defense, Steel, Agri-processing',
        elasticity: 0.58,
        linkedSupplyChainIds: ['fertilizer_staple_grain', 'crude_lng_hydrocarbons'],
      },
    ],
    electoralCatalyst: 'NATO Eastern Flank Defense Capex (4.7% GDP) & EU Excessive Deficit Procedure',
    baseFiscalSlippagePctGdp: 0.72,
    baseCoalitionCohesion: 69,
    baseCbInsulation: 75,
    baseSocialUnrest: 26,
    blocClassification: 'US_G7_ANCHORED',
    usG7IdealPoint: 0.86,
    chinaScoIdealPoint: -0.58,
    nonAlignedSwingLeverage: 42,
    friendShoringBetaPctGdp: 1.15,
    subseaCableRedundancy: 9,
    powerGridReserveMarginPct: 15.6,
    cyberFragilityBase: 49,
  },
  COL: {
    coord: { lat: 4.7, lon: -74.1, capitalLabel: 'Bogotá / Cartagena Port' },
    chokepointWeights: {
      hormuz: 10,
      babElMandeb: 6,
      taiwanStrait: 14,
      suez: 7,
      panama: 32,
      blackSea: 5,
    },
    g7ReserveCustodyPct: 78,
    multilateralSdrPct: 11,
    domesticGoldAndNonG7Pct: 11,
    clearingVulnerabilityFactor: 0.25,
    tariffPartners: [
      {
        bloc: 'United States Bilateral FTA',
        partnerLat: 38.9,
        partnerLon: -77.0,
        exportSharePct: 29.5,
        baseTariffPct: 3.5,
        sectors: 'Crude Oil, Cut Flowers, Coffee, Gold',
        elasticity: 0.67,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'],
      },
      {
        bloc: 'Panama & Andean Regional Corridor',
        partnerLat: 9.0,
        partnerLon: -79.5,
        exportSharePct: 18.2,
        baseTariffPct: 4.0,
        sectors: 'Coal, Refined Fuels, Plastics, Pharmaceuticals',
        elasticity: 0.49,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'critical_minerals_pgms'],
      },
      {
        bloc: 'European Union & Asia',
        partnerLat: 51.9,
        partnerLon: 4.5,
        exportSharePct: 21.0,
        baseTariffPct: 5.0,
        sectors: 'Thermal Coal, Ferronickel, Bananas',
        elasticity: 0.51,
        linkedSupplyChainIds: ['critical_minerals_pgms', 'fertilizer_staple_grain'],
      },
    ],
    electoralCatalyst: '2026 Presidential Cycle & Fiscal Rule Compliance Audit',
    baseFiscalSlippagePctGdp: 0.78,
    baseCoalitionCohesion: 51,
    baseCbInsulation: 81,
    baseSocialUnrest: 46,
    blocClassification: 'US_G7_ANCHORED',
    usG7IdealPoint: 0.46,
    chinaScoIdealPoint: 0.08,
    nonAlignedSwingLeverage: 61,
    friendShoringBetaPctGdp: 0.38,
    subseaCableRedundancy: 6,
    powerGridReserveMarginPct: 11.2,
    cyberFragilityBase: 45,
  },
  USA: {
    coord: { lat: 38.9, lon: -77.0, capitalLabel: 'Washington D.C. / NY / Houston' },
    chokepointWeights: {
      hormuz: 16,
      babElMandeb: 12,
      taiwanStrait: 34,
      suez: 10,
      panama: 26,
      blackSea: 6,
    },
    g7ReserveCustodyPct: 62,
    multilateralSdrPct: 18,
    domesticGoldAndNonG7Pct: 20,
    clearingVulnerabilityFactor: 0.08,
    tariffPartners: [
      {
        bloc: 'USMCA (Mexico & Canada Supply Chains)',
        partnerLat: 19.4,
        partnerLon: -99.1,
        exportSharePct: 32.6,
        baseTariffPct: 2.5,
        sectors: 'Refined Energy, Semiconductors, Automotive, Aerospace',
        elasticity: 0.56,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'critical_minerals_pgms'],
      },
      {
        bloc: 'China & Indo-Pacific Tech Corridor',
        partnerLat: 24.8,
        partnerLon: 121.0,
        exportSharePct: 19.4,
        baseTariffPct: 14.5,
        sectors: 'Wafer Fab Equipment, Agribusiness, LNG, Pharmaceuticals',
        elasticity: 0.74,
        linkedSupplyChainIds: ['semi_logic_7nm', 'rare_earth_magnets'],
      },
      {
        bloc: 'European Union & UK',
        partnerLat: 51.5,
        partnerLon: -0.1,
        exportSharePct: 22.8,
        baseTariffPct: 3.5,
        sectors: 'LNG, Defense Systems, Cloud & Financial Services',
        elasticity: 0.42,
        linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'semi_logic_7nm'],
      },
    ],
    electoralCatalyst: 'Statutory Debt Ceiling X-Date, Tariff Executive Orders & 10Y Term Premium',
    baseFiscalSlippagePctGdp: 0.90,
    baseCoalitionCohesion: 54,
    baseCbInsulation: 82,
    baseSocialUnrest: 32,
    blocClassification: 'US_G7_ANCHORED',
    usG7IdealPoint: 0.98,
    chinaScoIdealPoint: -0.82,
    nonAlignedSwingLeverage: 50,
    friendShoringBetaPctGdp: 0.52,
    subseaCableRedundancy: 22,
    powerGridReserveMarginPct: 14.8,
    cyberFragilityBase: 41,
  },
};

function getGeoProfile(iso3: string): SovereignGeopoliticalProfile {
  return COUNTRY_GEO_PROFILES[iso3] || COUNTRY_GEO_PROFILES.BRA;
}

/**
 * Parses an analyst-injected OSINT cable or breaking intelligence dispatch
 * into CAMEO event taxonomy, Goldstein conflict scale, geospatial coordinates, and wargame slider adjustments.
 */
export function parseOsintIntelligenceSignal(
  rawSignalText: string,
  iso3: string,
  countryName: string
): {
  event: OsintConflictEvent;
  suggestedWargameDelta: Partial<GeopoliticalWargameParams>;
} {
  const profile = getGeoProfile(iso3);
  const lower = rawSignalText.toLowerCase();
  const isMaritime =
    lower.includes('strait') ||
    lower.includes('hormuz') ||
    lower.includes('red sea') ||
    lower.includes('tanker') ||
    lower.includes('canal') ||
    lower.includes('blockade') ||
    lower.includes('houthi');
  const isSanctions =
    lower.includes('ofac') ||
    lower.includes('sanction') ||
    lower.includes('tariff') ||
    lower.includes('freeze') ||
    lower.includes('euroclear') ||
    lower.includes('secondary');
  const isCyber =
    lower.includes('cyber') ||
    lower.includes('cable') ||
    lower.includes('grid') ||
    lower.includes('scada') ||
    lower.includes('ddos') ||
    lower.includes('ransomware');
  const isUnrest =
    lower.includes('protest') ||
    lower.includes('strike') ||
    lower.includes('election') ||
    lower.includes('coalition') ||
    lower.includes('riot');

  let eventCategory: OsintConflictEvent['eventCategory'] = 'DIPLOMATIC_RUPTURE';
  let cameoCode = 'CAMEO-138 (Threaten Military/Economic Coercion)';
  let goldsteinScale = -5.8;
  let acledSeverityScore = 64;
  let empiricalCdsImpactBps = 28;
  let empiricalFxImpactPct = -2.1;
  let lat = profile.coord.lat + 2.5;
  let lon = profile.coord.lon - 3.0;
  let linkedChokepointIds: string[] = ['hormuz', 'bab_el_mandeb'];
  let linkedSupplyChainIds: string[] = ['crude_lng_hydrocarbons', 'semi_logic_7nm'];
  const suggestedWargameDelta: Partial<GeopoliticalWargameParams> = {};

  if (isMaritime) {
    eventCategory = 'MARITIME_INTERDICTION';
    cameoCode = 'CAMEO-192 (Blockade / Maritime Chokepoint Interdiction)';
    goldsteinScale = -8.4;
    acledSeverityScore = 84;
    empiricalCdsImpactBps = 48;
    empiricalFxImpactPct = -3.8;
    lat = lower.includes('taiwan') ? 24.2 : lower.includes('red sea') ? 13.5 : 26.2;
    lon = lower.includes('taiwan') ? 119.8 : lower.includes('red sea') ? 43.0 : 56.3;
    linkedChokepointIds = lower.includes('taiwan')
      ? ['taiwan_strait']
      : ['hormuz', 'bab_el_mandeb', 'suez_canal'];
    linkedSupplyChainIds = lower.includes('taiwan')
      ? ['semi_logic_7nm', 'rare_earth_magnets']
      : ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'];
    suggestedWargameDelta.chokepointClosureSeverityPct = 75;
  } else if (isSanctions) {
    eventCategory = 'SANCTIONS_ENFORCEMENT';
    cameoCode = 'CAMEO-163 (Impose Embargo, Tariff or Asset Freeze)';
    goldsteinScale = -7.2;
    acledSeverityScore = 76;
    empiricalCdsImpactBps = 42;
    empiricalFxImpactPct = -3.4;
    lat = 38.9;
    lon = -77.0;
    linkedChokepointIds = ['panama_canal', 'suez_canal'];
    linkedSupplyChainIds = ['semi_logic_7nm', 'rare_earth_magnets', 'critical_minerals_pgms'];
    suggestedWargameDelta.sanctionsAndClearingIntensity = 65;
    suggestedWargameDelta.tariffEscalationPct = 35;
  } else if (isCyber) {
    eventCategory = 'CYBER_INFRASTRUCTURE';
    cameoCode = 'CAMEO-176 (Attack Cyber & Critical Subsea/Grid Node)';
    goldsteinScale = -7.6;
    acledSeverityScore = 79;
    empiricalCdsImpactBps = 36;
    empiricalFxImpactPct = -2.7;
    lat = profile.coord.lat - 1.5;
    lon = profile.coord.lon + 2.2;
    linkedChokepointIds = ['suez_canal', 'bab_el_mandeb'];
    linkedSupplyChainIds = ['semi_logic_7nm', 'crude_lng_hydrocarbons'];
    suggestedWargameDelta.cyberHybridIntensityPct = 75;
  } else if (isUnrest) {
    eventCategory = 'CIVIL_UNREST_PROTEST';
    cameoCode = 'CAMEO-145 (Violent Protest / Fiscal Strike Mobilization)';
    goldsteinScale = -6.5;
    acledSeverityScore = 72;
    empiricalCdsImpactBps = 34;
    empiricalFxImpactPct = -2.9;
    lat = profile.coord.lat;
    lon = profile.coord.lon;
    linkedChokepointIds = ['panama_canal', 'black_sea'];
    linkedSupplyChainIds = ['fertilizer_staple_grain', 'crude_lng_hydrocarbons'];
    suggestedWargameDelta.electoralAndUnrestShock = 65;
  } else {
    suggestedWargameDelta.chokepointClosureSeverityPct = 45;
    suggestedWargameDelta.sanctionsAndClearingIntensity = 45;
  }

  const cleanHeadline =
    rawSignalText.trim().length > 140
      ? `${rawSignalText.trim().slice(0, 137)}...`
      : rawSignalText.trim();

  return {
    event: {
      eventId: `OSINT-${iso3}-${Date.now().toString().slice(-4)}`,
      timestampUtc: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      sourceFeed: 'LIVE_AI_OSINT',
      cameoCode,
      eventCategory,
      headline: cleanHeadline,
      locationLabel: `${countryName} (${iso3}) Strategic Theater`,
      goldsteinScale,
      acledSeverityScore,
      empiricalCdsImpactBps,
      empiricalFxImpactPct,
      verificationStatus: 'ANALYST_INJECTED',
      lat,
      lon,
      linkedChokepointIds,
      linkedSupplyChainIds,
    },
    suggestedWargameDelta,
  };
}

export function computeGeopoliticalRiskDeskSuite(
  openData: OpenDataSnapshot,
  params: GeopoliticalWargameParams = DEFAULT_WARGAME_PARAMS,
  customOsintEvents: OsintConflictEvent[] = [],
  activeExportBanChainIds: string[] = []
): GeopoliticalRiskDeskSuite {
  const profile = getGeoProfile(openData.iso3);
  const chokepointSeverity = Math.max(0, Math.min(100, params.chokepointClosureSeverityPct)) / 100;
  const tariffShock = Math.max(0, Math.min(60, params.tariffEscalationPct));
  const sanctionsShock = Math.max(0, Math.min(100, params.sanctionsAndClearingIntensity)) / 100;
  const unrestShock = Math.max(0, Math.min(100, params.electoralAndUnrestShock)) / 100;
  const cyberShock = Math.max(0, Math.min(100, params.cyberHybridIntensityPct ?? 20)) / 100;

  // =========================================================================
  // 1. MARITIME CHOKEPOINT & SUPPLY-CHAIN DISRUPTION SIMULATOR
  // =========================================================================
  const rawCorridors = [
    {
      corridorId: 'hormuz',
      corridorName: 'Strait of Hormuz (21M bbl/d Crude & Qatari LNG)',
      primaryCommodities: 'Crude Oil, Condensate, LNG, Petrochemicals',
      share: profile.chokepointWeights.hormuz,
      baseDelayDays: 14,
      freightMult: 2.8,
      cpiBeta: 1.45,
      cdsBeta: 1.35,
      lat: 26.5,
      lon: 56.2,
      linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain'],
    },
    {
      corridorId: 'bab_el_mandeb',
      corridorName: 'Bab el-Mandeb & Red Sea (Asia–Europe Container & Tanker Artery)',
      primaryCommodities: 'Containerized Manufactures, Refined Diesel, LNG',
      share: profile.chokepointWeights.babElMandeb,
      baseDelayDays: 12,
      freightMult: 2.5,
      cpiBeta: 1.25,
      cdsBeta: 1.15,
      lat: 12.6,
      lon: 43.3,
      linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'semi_logic_7nm', 'fertilizer_staple_grain'],
    },
    {
      corridorId: 'taiwan_strait',
      corridorName: 'Taiwan Strait (Advanced Semiconductors & East Asia Feeder)',
      primaryCommodities: 'Logic Chips (<7nm), Electronics, Industrial Machinery',
      share: profile.chokepointWeights.taiwanStrait,
      baseDelayDays: 18,
      freightMult: 3.1,
      cpiBeta: 1.35,
      cdsBeta: 1.45,
      lat: 24.5,
      lon: 119.5,
      linkedSupplyChainIds: ['semi_logic_7nm', 'rare_earth_magnets', 'critical_minerals_pgms'],
    },
    {
      corridorId: 'suez_canal',
      corridorName: 'Suez Canal (Mediterranean–Indo-Pacific Transit)',
      primaryCommodities: 'Crude, Grain, Fertilizers, Finished Consumer Goods',
      share: profile.chokepointWeights.suez,
      baseDelayDays: 11,
      freightMult: 2.2,
      cpiBeta: 1.15,
      cdsBeta: 1.10,
      lat: 30.6,
      lon: 32.3,
      linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'fertilizer_staple_grain', 'semi_logic_7nm'],
    },
    {
      corridorId: 'panama_canal',
      corridorName: 'Panama Canal (US Gulf–LatAm–Asia Neopanamax Corridor)',
      primaryCommodities: 'US Gulf LNG, Propane, Soybeans, Copper Concentrates',
      share: profile.chokepointWeights.panama,
      baseDelayDays: 10,
      freightMult: 1.95,
      cpiBeta: 0.95,
      cdsBeta: 0.85,
      lat: 9.1,
      lon: -79.7,
      linkedSupplyChainIds: ['crude_lng_hydrocarbons', 'critical_minerals_pgms', 'fertilizer_staple_grain'],
    },
    {
      corridorId: 'black_sea',
      corridorName: 'Black Sea & Turkish Straits (Grain, Fertilizer & Urals/CPC Crude)',
      primaryCommodities: 'Wheat, Corn, Nitrogen Fertilizer, Black Sea Crude',
      share: profile.chokepointWeights.blackSea,
      baseDelayDays: 9,
      freightMult: 2.35,
      cpiBeta: 1.30,
      cdsBeta: 1.20,
      lat: 43.2,
      lon: 34.0,
      linkedSupplyChainIds: ['fertilizer_staple_grain', 'crude_lng_hydrocarbons'],
    },
  ];

  const chokepoints: MaritimeChokepointImpact[] = rawCorridors.map((c) => {
    const effectiveSeverity = 0.2 + chokepointSeverity * 0.8;
    const reroutingDelayDays = Number((c.baseDelayDays * effectiveSeverity).toFixed(1));
    const freightAndWarRiskSurgePct = Math.round(
      c.freightMult * 65 * effectiveSeverity * (0.7 + c.share / 50)
    );
    const importedCpiPassThroughBps = Math.round(
      c.share * c.cpiBeta * effectiveSeverity * 3.2
    );
    const currentAccountImpactPctGdp = Number(
      (-(c.share * 0.032 * effectiveSeverity)).toFixed(2)
    );
    const cds5YSpreadImpactBps = Math.round(
      c.share * c.cdsBeta * effectiveSeverity * 2.1
    );

    let vulnerabilityStatus: MaritimeChokepointImpact['vulnerabilityStatus'] = 'LOW';
    if (cds5YSpreadImpactBps >= 35 || c.share >= 28) {
      vulnerabilityStatus = 'CRITICAL';
    } else if (cds5YSpreadImpactBps >= 20 || c.share >= 18) {
      vulnerabilityStatus = 'HIGH';
    } else if (cds5YSpreadImpactBps >= 10 || c.share >= 11) {
      vulnerabilityStatus = 'MODERATE';
    }

    return {
      corridorId: c.corridorId,
      corridorName: c.corridorName,
      primaryCommodities: c.primaryCommodities,
      sovereignTradeShareExposedPct: c.share,
      reroutingDelayDays,
      freightAndWarRiskSurgePct,
      importedCpiPassThroughBps,
      currentAccountImpactPctGdp,
      cds5YSpreadImpactBps,
      vulnerabilityStatus,
      lat: c.lat,
      lon: c.lon,
      linkedSupplyChainIds: c.linkedSupplyChainIds,
    };
  });

  const mostVulnerableCorridor = [...chokepoints].sort(
    (a, b) => b.cds5YSpreadImpactBps - a.cds5YSpreadImpactBps
  )[0];

  const totalExposedMaritimeTradePct = Math.min(
    92,
    Math.round(chokepoints.reduce((acc, c) => acc + c.sovereignTradeShareExposedPct * 0.65, 0))
  );
  const aggregateChokepointCpiPassThroughBps = chokepoints.reduce(
    (acc, c) => acc + c.importedCpiPassThroughBps,
    0
  );
  const aggregateChokepointCdsImpactBps = chokepoints.reduce(
    (acc, c) => acc + c.cds5YSpreadImpactBps,
    0
  );

  const chokepointConclusionHeadline = `${openData.countryName} carries ${mostVulnerableCorridor.sovereignTradeShareExposedPct}% trade exposure to ${
    mostVulnerableCorridor.corridorName.split(' (')[0]
  }; a ${params.chokepointClosureSeverityPct}% closure shock injects +${aggregateChokepointCpiPassThroughBps} bps into domestic CPI and +${aggregateChokepointCdsImpactBps} bps into 5Y CDS.`;

  // =========================================================================
  // 2. SANCTIONS, TARIFF ESCALATION & FX RESERVE FREEZE LAB
  // =========================================================================
  const headlineReservesUsdBn = openData.debtRollover.liquidFxReservesUsdBn;
  const headlineImportCoverMonths = openData.worldBankIndicators.fxReservesMonthsImport;

  const g7HaircutPct = Math.round(Math.min(95, 15 + sanctionsShock * 80));
  const multilateralHaircutPct = Math.round(Math.min(50, 5 + sanctionsShock * 42));
  const domesticGoldHaircutPct = Math.round(Math.min(15, sanctionsShock * 12));

  const custodyTranches: ReserveCustodyTranche[] = [
    {
      custodyCategory: 'G7 Sovereign Custodians (USTs, Bunds, Gilts, JGBs)',
      jurisdictionLabel: 'Fed NY / Euroclear / Clearstream / BoE',
      shareOfReservesPct: profile.g7ReserveCustodyPct,
      amountUsdBn: Number(
        ((headlineReservesUsdBn * profile.g7ReserveCustodyPct) / 100).toFixed(1)
      ),
      freezeVulnerability: 'HIGH_G7_EXPOSED',
      effectiveHaircutUnderSanctionsPct: g7HaircutPct,
    },
    {
      custodyCategory: 'IMF SDR Allocations & BIS Liquidity Tranches',
      jurisdictionLabel: 'IMF SDR Department / BIS Basel',
      shareOfReservesPct: profile.multilateralSdrPct,
      amountUsdBn: Number(
        ((headlineReservesUsdBn * profile.multilateralSdrPct) / 100).toFixed(1)
      ),
      freezeVulnerability: 'MODERATE_MULTILATERAL',
      effectiveHaircutUnderSanctionsPct: multilateralHaircutPct,
    },
    {
      custodyCategory: 'Domestic Vaulted Bullion & Non-G7 Bilateral Swap Lines',
      jurisdictionLabel: 'Domestic Central Bank Vault / PBoC CNY & Regional Swaps',
      shareOfReservesPct: profile.domesticGoldAndNonG7Pct,
      amountUsdBn: Number(
        ((headlineReservesUsdBn * profile.domesticGoldAndNonG7Pct) / 100).toFixed(1)
      ),
      freezeVulnerability: 'IMMUNE_DOMESTIC_OR_NON_G7',
      effectiveHaircutUnderSanctionsPct: domesticGoldHaircutPct,
    },
  ];

  const sanctionsInsulatedReservesUsdBn = Number(
    custodyTranches
      .reduce(
        (acc, t) => acc + t.amountUsdBn * (1 - t.effectiveHaircutUnderSanctionsPct / 100),
        0
      )
      .toFixed(1)
  );

  const sanctionsInsulatedImportCoverMonths = Number(
    (
      headlineImportCoverMonths *
      (sanctionsInsulatedReservesUsdBn / Math.max(1, headlineReservesUsdBn))
    ).toFixed(1)
  );

  const paymentAgentTechnicalDefaultProbPct = Number(
    Math.min(
      88,
      profile.clearingVulnerabilityFactor * 22 +
        sanctionsShock * 58 * profile.clearingVulnerabilityFactor
    ).toFixed(1)
  );

  const tariffExposures: BilateralTariffExposure[] = profile.tariffPartners.map((tp) => {
    const effectiveTariffRatePct = Number((tp.baseTariffPct + tariffShock).toFixed(1));
    const estimatedGdpDragBps = Math.round(
      tp.exportSharePct * (effectiveTariffRatePct / 10) * tp.elasticity * 1.9
    );
    const fxDepreciationPressurePct = Number(
      ((estimatedGdpDragBps / 100) * 2.4 + sanctionsShock * 3.2).toFixed(1)
    );
    return {
      partnerBloc: tp.bloc,
      shareOfSovereignExportsPct: tp.exportSharePct,
      effectiveTariffRatePct,
      estimatedGdpDragBps,
      fxDepreciationPressurePct,
      keyVulnerableSectors: tp.sectors,
    };
  });

  const totalTariffGdpDragBps = tariffExposures.reduce(
    (acc, t) => acc + t.estimatedGdpDragBps,
    0
  );

  const sanctionsAndReserves: SanctionsAndReserveFreezeResult = {
    conclusionHeadline: `Under a ${params.sanctionsAndClearingIntensity}/100 sanctions freeze & +${params.tariffEscalationPct}% tariff shock, ${openData.countryName}'s usable FX reserves drop from $${headlineReservesUsdBn}B (${headlineImportCoverMonths}m cover) to $${sanctionsInsulatedReservesUsdBn}B (${sanctionsInsulatedImportCoverMonths}m cover) with ${totalTariffGdpDragBps} bps export GDP drag.`,
    headlineReservesUsdBn,
    headlineImportCoverMonths,
    sanctionsInsulatedReservesUsdBn,
    sanctionsInsulatedImportCoverMonths,
    g7FreezeExposedSharePct: profile.g7ReserveCustodyPct,
    domesticGoldAndNonG7SharePct: profile.domesticGoldAndNonG7Pct,
    paymentAgentTechnicalDefaultProbPct,
    clearingChannelAssessment:
      paymentAgentTechnicalDefaultProbPct >= 25
        ? 'ELEVATED CLEARING FRICTION: High reliance on NY/London paying agents exposes external Eurobond coupons to OFAC/Euroclear compliance freezes even when fiscal willingness to pay remains intact.'
        : 'LOW CLEARING FRICTION: Diversified payment rails and strong G7 diplomatic alignment keep technical settlement disruption risk contained.',
    custodyTranches,
    tariffExposures,
  };

  // =========================================================================
  // 3. CALDARA-IACOVIELLO GPR THREAT vs. ACT, ELECTORAL RISK & ESCALATION TREE
  // =========================================================================
  const baseGpr = openData.gdeltMetrics.conflictIntensityIndex / 35;
  const gprThreatZScore = Number(
    (
      baseGpr +
      (tariffShock / 60) * 1.15 +
      unrestShock * 0.95 +
      chokepointSeverity * 0.65 +
      cyberShock * 0.55
    ).toFixed(2)
  );
  const gprActZScore = Number(
    (
      baseGpr * 0.78 +
      chokepointSeverity * 1.35 +
      sanctionsShock * 1.15 +
      unrestShock * 0.45 +
      cyberShock * 0.72
    ).toFixed(2)
  );
  const compositeGprZScore = Number(
    (gprThreatZScore * 0.48 + gprActZScore * 0.52).toFixed(2)
  );

  const electoralProfile: ElectoralFragilityProfile = {
    nextPoliticalCatalystLabel: profile.electoralCatalyst,
    preElectionFiscalSlippagePctGdp: Number(
      (profile.baseFiscalSlippagePctGdp + unrestShock * 1.15).toFixed(2)
    ),
    coalitionCohesionScore: Math.max(
      12,
      Math.round(profile.baseCoalitionCohesion - unrestShock * 34)
    ),
    cbAndJudicialInsulationScore: Math.max(
      18,
      Math.round(profile.baseCbInsulation - unrestShock * 22 - sanctionsShock * 12)
    ),
    socialUnrestAndStrikeIntensity: Math.min(
      98,
      Math.round(profile.baseSocialUnrest + unrestShock * 44)
    ),
    regimeContinuityProbPct: Math.max(
      22,
      Math.min(94, Math.round(82 - unrestShock * 38 - sanctionsShock * 14))
    ),
  };

  const rawStage3 = Math.min(
    65,
    Math.round(
      8 +
        chokepointSeverity * 26 +
        sanctionsShock * 20 +
        unrestShock * 10 +
        cyberShock * 12
    )
  );
  const rawStage2 = Math.min(
    68,
    Math.round(
      24 +
        (tariffShock / 60) * 20 +
        sanctionsShock * 16 +
        unrestShock * 12 +
        cyberShock * 10
    )
  );
  const stage3Prob = Math.min(62, rawStage3);
  const stage2Prob = Math.min(100 - stage3Prob - 10, rawStage2);
  const stage1Prob = Math.max(10, 100 - stage2Prob - stage3Prob);

  const escalationTree: EscalationBranchNode[] = [
    {
      stageId: 'STAGE_1_CONTAINMENT',
      stageTitle: 'Stage 1: Diplomatic De-Escalation & Corridor Deterrence',
      branchProbabilityPct: stage1Prob,
      triggerConditions:
        'Bilateral tariff exemptions negotiated; naval escort coalition caps war-risk surcharges; central bank holds orthodox real-rate buffer.',
      local10YYieldDeltaBps: Math.round(-25 + unrestShock * 30),
      cds5YSpreadDeltaBps: Math.round(-18 + chokepointSeverity * 22),
      spotFxDeltaPct: Number((-1.2 + unrestShock * 2.5).toFixed(1)),
      recommendedDeskAction:
        'Harvest front-end FX-hedged local carry; maintain 15% out-of-the-money Brent call spread as low-bleed insurance.',
    },
    {
      stageId: 'STAGE_2_HYBRID_SANCTIONS',
      stageTitle: 'Stage 2: Targeted Secondary Sanctions, Tariff War & Cyber Friction',
      branchProbabilityPct: stage2Prob,
      triggerConditions:
        'Reciprocal 25%–35% sector tariffs enacted; secondary compliance delays cross-border clearing; Cape of Good Hope rerouting persists.',
      local10YYieldDeltaBps: Math.round(
        65 + (tariffShock / 60) * 75 + unrestShock * 55 + cyberShock * 35
      ),
      cds5YSpreadDeltaBps: Math.round(
        55 + sanctionsShock * 85 + chokepointSeverity * 45 + cyberShock * 30
      ),
      spotFxDeltaPct: Number(
        (5.4 + (tariffShock / 60) * 6.5 + sanctionsShock * 4.8).toFixed(1)
      ),
      recommendedDeskAction:
        'Rotate local duration into 2s10s curve steepeners; add 5Y Sovereign CDS protection and long USD/LCY 25-delta risk reversals.',
    },
    {
      stageId: 'STAGE_3_KINETIC_BLOCKADE',
      stageTitle: 'Stage 3: Kinetic Chokepoint Blockade & G7 Reserve Custody Freeze',
      branchProbabilityPct: stage3Prob,
      triggerConditions:
        'Kinetic closure of Hormuz/Red Sea or Taiwan Strait; G7 asset freeze on central bank custody tranches; pre-election fiscal dominance.',
      local10YYieldDeltaBps: Math.round(
        185 + chokepointSeverity * 145 + sanctionsShock * 120 + cyberShock * 65
      ),
      cds5YSpreadDeltaBps: Math.round(
        195 + chokepointSeverity * 165 + sanctionsShock * 155 + cyberShock * 55
      ),
      spotFxDeltaPct: Number(
        (14.5 + chokepointSeverity * 11.5 + sanctionsShock * 9.5).toFixed(1)
      ),
      recommendedDeskAction:
        'Execute CRO hard stop on unhedged local duration; monetize Gold/CHF & Brent volatility convexity; switch to NY-Law defensive belly.',
    },
  ];

  const expectedProbabilityWeightedCdsDeltaBps = Math.round(
    escalationTree.reduce(
      (acc, node) => acc + (node.branchProbabilityPct / 100) * node.cds5YSpreadDeltaBps,
      0
    )
  );

  const gprAndEscalation: GprAndEscalationResult = {
    conclusionHeadline: `Caldara-Iacoviello GPR Composite reaches +${compositeGprZScore.toFixed(
      2
    )}σ (Threats +${gprThreatZScore.toFixed(2)}σ vs. Acts +${gprActZScore.toFixed(
      2
    )}σ), pricing a ${stage2Prob + stage3Prob}% combined probability of Hybrid Sanctions or Kinetic Blockade (+${expectedProbabilityWeightedCdsDeltaBps} bps probability-weighted 5Y CDS shift).`,
    compositeGprZScore,
    gprThreatZScore,
    gprActZScore,
    gdeltGoldsteinTone: Number(
      (
        openData.gdeltMetrics.averageTone -
        chokepointSeverity * 2.1 -
        unrestShock * 1.6 -
        cyberShock * 0.9
      ).toFixed(2)
    ),
    expectedProbabilityWeightedCdsDeltaBps,
    electoralProfile,
    escalationTree,
  };

  // =========================================================================
  // 4. GEOPOLITICAL TAIL-HEDGE & SAFE-HAVEN CONVEXITY PRICER
  // =========================================================================
  const rawHedges: Omit<GeopoliticalTailHedgeItem, 'convexityToCarryRatio'>[] = [
    {
      hedgeId: 'brent_call_spread',
      instrumentName: '3M Brent Crude $90/$110 Call Spread',
      assetClass: 'COMMODITY_VOL',
      annualizedCarryCostBps: -38,
      twoSigmaGprShockPayoffBps: Math.round(165 + chokepointSeverity * 185),
      correlationToSovereignDrawdown: 0.84,
      recommendedAllocationPctNav: 3.5,
      protectionMechanism:
        'Direct convex payout on Strait of Hormuz / Red Sea tanker interdiction and energy import-bill spikes.',
    },
    {
      hedgeId: 'sov_5y_cds',
      instrumentName: `5Y ${openData.countryName} Sovereign CDS Protection (ISDA 2014)`,
      assetClass: 'SOVEREIGN_CDS',
      annualizedCarryCostBps: -Math.round(openData.monetaryAndMarket.cds5YSpreadBps * 0.28),
      twoSigmaGprShockPayoffBps: Math.round(
        140 + sanctionsShock * 195 + unrestShock * 95
      ),
      correlationToSovereignDrawdown: 0.96,
      recommendedAllocationPctNav: 5.0,
      protectionMechanism:
        'Pure jump-to-default and credit-spread widening hedge against fiscal slippage or Eurobond clearing disruption.',
    },
    {
      hedgeId: 'fx_25d_risk_reversal',
      instrumentName: `3M USD/${openData.currencyCode} 25-Delta Call / Put Risk Reversal`,
      assetClass: 'FX_OPTIONS',
      annualizedCarryCostBps: -52,
      twoSigmaGprShockPayoffBps: Math.round(
        135 + (tariffShock / 60) * 165 + sanctionsShock * 110
      ),
      correlationToSovereignDrawdown: 0.89,
      recommendedAllocationPctNav: 4.0,
      protectionMechanism:
        'Captures skewed implied-volatility smile explosion during bilateral tariff retaliation or sudden-stop outflows.',
    },
    {
      hedgeId: 'physical_gold_chf',
      instrumentName: 'Spot Gold (XAU/USD) & Long CHF/USD Safe-Haven Basket',
      assetClass: 'PRECIOUS_METALS',
      annualizedCarryCostBps: -18,
      twoSigmaGprShockPayoffBps: Math.round(92 + sanctionsShock * 115 + chokepointSeverity * 65),
      correlationToSovereignDrawdown: 0.78,
      recommendedAllocationPctNav: 6.0,
      protectionMechanism:
        'Zero-counterparty-risk store of value insulated from G7 central bank custody freezes and fiat debasement.',
    },
    {
      hedgeId: 'ust_2y_bull_steepener',
      instrumentName: 'US 2Y/10Y Treasury Bull Steepener Overlay',
      assetClass: 'SAFE_HAVEN_RATES',
      annualizedCarryCostBps: -24,
      twoSigmaGprShockPayoffBps: Math.round(78 + chokepointSeverity * 60 + (tariffShock / 60) * 75),
      correlationToSovereignDrawdown: 0.71,
      recommendedAllocationPctNav: 4.5,
      protectionMechanism:
        'Offsets global trade contraction and flight-to-quality bid when tariff escalation depresses global growth.',
    },
  ];

  const tailHedges: GeopoliticalTailHedgeItem[] = rawHedges
    .map((h) => ({
      ...h,
      convexityToCarryRatio: Number(
        (h.twoSigmaGprShockPayoffBps / Math.max(10, Math.abs(h.annualizedCarryCostBps))).toFixed(2)
      ),
    }))
    .sort((a, b) => b.convexityToCarryRatio - a.convexityToCarryRatio);

  const topHedge = tailHedges[0];
  const tailHedgeConclusionHeadline = `${topHedge.instrumentName} ranks #1 in Geopolitical Tail Convexity (${topHedge.convexityToCarryRatio.toFixed(
    2
  )}x payoff-to-bleed ratio), delivering +${topHedge.twoSigmaGprShockPayoffBps} bps under a +2σ GPR shock for ${Math.abs(
    topHedge.annualizedCarryCostBps
  )} bps annualized carry cost.`;

  // =========================================================================
  // 5. HYBRID OSINT & GDELT / ACLED CONFLICT & SANCTIONS EVENT STREAM (GEOSPATIAL)
  // =========================================================================
  const baselineOsintEvents: OsintConflictEvent[] = [
    {
      eventId: `GDELT-${openData.iso3}-101`,
      timestampUtc: '2026-11-02 14:20 UTC',
      sourceFeed: 'GDELT_2.0_CAMEO',
      cameoCode: 'CAMEO-192 (Maritime Chokepoint Escort & War-Risk Repricing)',
      eventCategory: 'MARITIME_INTERDICTION',
      headline: `Lloyd's Joint War Committee elevates hull war-risk surcharge across ${
        mostVulnerableCorridor.corridorName.split(' (')[0]
      }; container & tanker diversions add ${mostVulnerableCorridor.reroutingDelayDays}d transit lag for ${openData.countryName} cargo.`,
      locationLabel: mostVulnerableCorridor.corridorName.split(' (')[0],
      goldsteinScale: Number((-6.8 - chokepointSeverity * 2.6).toFixed(1)),
      acledSeverityScore: Math.min(98, Math.round(62 + chokepointSeverity * 32)),
      empiricalCdsImpactBps: Math.round(18 + chokepointSeverity * 38),
      empiricalFxImpactPct: Number((-1.4 - chokepointSeverity * 2.8).toFixed(1)),
      verificationStatus: 'VERIFIED_PRIMARY',
      lat: mostVulnerableCorridor.lat,
      lon: mostVulnerableCorridor.lon,
      linkedChokepointIds: [mostVulnerableCorridor.corridorId, 'bab_el_mandeb'],
      linkedSupplyChainIds: mostVulnerableCorridor.linkedSupplyChainIds,
    },
    {
      eventId: `OFAC-${openData.iso3}-102`,
      timestampUtc: '2026-11-02 11:05 UTC',
      sourceFeed: 'OFAC_TREASURY',
      cameoCode: 'CAMEO-163 (Secondary Sanctions & Tariff Compliance Notice)',
      eventCategory: 'SANCTIONS_ENFORCEMENT',
      headline: `G7 / OFAC cross-border trade compliance audit targets dual-use transshipment and bilateral tariff corridors (${profile.tariffPartners[0].bloc}), exposing ${profile.g7ReserveCustodyPct}% G7-custodied reserve assets to compliance screening.`,
      locationLabel: `${openData.countryName} / G7 Clearing Corridors`,
      goldsteinScale: Number((-5.4 - sanctionsShock * 3.4).toFixed(1)),
      acledSeverityScore: Math.min(96, Math.round(54 + sanctionsShock * 38)),
      empiricalCdsImpactBps: Math.round(14 + sanctionsShock * 44),
      empiricalFxImpactPct: Number((-1.1 - sanctionsShock * 3.1).toFixed(1)),
      verificationStatus: 'VERIFIED_PRIMARY',
      lat: profile.tariffPartners[0].partnerLat,
      lon: profile.tariffPartners[0].partnerLon,
      linkedChokepointIds: ['taiwan_strait', 'panama_canal'],
      linkedSupplyChainIds: ['semi_logic_7nm', 'rare_earth_magnets', 'critical_minerals_pgms'],
    },
    {
      eventId: `ACLED-${openData.iso3}-103`,
      timestampUtc: '2026-11-01 19:45 UTC',
      sourceFeed: 'ACLED_CONFLICT',
      cameoCode: 'CAMEO-145 (Public Sector Union & Energy Subsidy Mobilization)',
      eventCategory: 'CIVIL_UNREST_PROTEST',
      headline: `ACLED monitors urban labor mobilization ahead of ${profile.electoralCatalyst}, raising pre-election primary fiscal slippage risk to ${electoralProfile.preElectionFiscalSlippagePctGdp}% of GDP.`,
      locationLabel: `${profile.coord.capitalLabel}`,
      goldsteinScale: Number((-4.9 - unrestShock * 3.5).toFixed(1)),
      acledSeverityScore: electoralProfile.socialUnrestAndStrikeIntensity,
      empiricalCdsImpactBps: Math.round(12 + unrestShock * 36),
      empiricalFxImpactPct: Number((-0.9 - unrestShock * 2.5).toFixed(1)),
      verificationStatus: 'MULTI_SOURCE_CORROBORATED',
      lat: profile.coord.lat,
      lon: profile.coord.lon,
      linkedChokepointIds: ['suez_canal', 'black_sea'],
      linkedSupplyChainIds: ['fertilizer_staple_grain', 'crude_lng_hydrocarbons'],
    },
    {
      eventId: `CERT-${openData.iso3}-104`,
      timestampUtc: '2026-11-01 08:15 UTC',
      sourceFeed: 'GDELT_2.0_CAMEO',
      cameoCode: 'CAMEO-176 (Asymmetric Cyber Reconnaissance on Grid/Port SCADA)',
      eventCategory: 'CYBER_INFRASTRUCTURE',
      headline: `National CERT flags state-nexus probing across subsea landing stations (${profile.subseaCableRedundancy} active cables) and port customs clearing terminals; power grid reserve margin stands at ${profile.powerGridReserveMarginPct}%.`,
      locationLabel: `${openData.countryName} Subsea & RTGS Grid`,
      goldsteinScale: Number((-5.2 - cyberShock * 3.6).toFixed(1)),
      acledSeverityScore: Math.min(96, Math.round(profile.cyberFragilityBase + cyberShock * 36)),
      empiricalCdsImpactBps: Math.round(10 + cyberShock * 34),
      empiricalFxImpactPct: Number((-0.8 - cyberShock * 2.2).toFixed(1)),
      verificationStatus: 'MULTI_SOURCE_CORROBORATED',
      lat: profile.coord.lat + 3.2,
      lon: profile.coord.lon + 4.1,
      linkedChokepointIds: ['bab_el_mandeb', 'suez_canal'],
      linkedSupplyChainIds: ['semi_logic_7nm', 'crude_lng_hydrocarbons'],
    },
  ];

  const osintEvents = [...customOsintEvents, ...baselineOsintEvents];
  const avgGoldstein =
    osintEvents.reduce((acc, ev) => acc + ev.goldsteinScale, 0) / osintEvents.length;
  const osintEventStreamHeadline = `GDELT 2.0 & ACLED Telemetry tracks ${osintEvents.length} active geospatial conflict/sanctions nodes (Mean Goldstein Conflict Score ${avgGoldstein.toFixed(
    1
  )}), led by ${osintEvents[0].cameoCode.split(' ')[0]} in ${osintEvents[0].locationLabel}.`;

  // =========================================================================
  // 6. UNGA DIPLOMATIC ALIGNMENT, BLOC TOPOLOGY & SECONDARY SANCTIONS CONTAGION
  // =========================================================================
  const usG7AlignPct = Math.round(((profile.usG7IdealPoint + 1) / 2) * 100);
  const chinaScoAlignPct = Math.round(((profile.chinaScoIdealPoint + 1) / 2) * 100);
  const secondarySanctionsContagionProbPct = Math.min(
    92,
    Math.round(
      (1 - (profile.usG7IdealPoint + 1) / 2) * 45 +
        sanctionsShock * 42 +
        (tariffShock / 60) * 15
    )
  );

  const blocTopology: DiplomaticBlocNode[] = [
    {
      blocName: 'United States & G7 Financial Coalition',
      ungaVotingAlignmentPct: usG7AlignPct,
      idealPointDistance: Number(Math.abs(1.0 - profile.usG7IdealPoint).toFixed(2)),
      bilateralTradeSharePct:
        openData.iso3 === 'MEX'
          ? 79.5
          : openData.iso3 === 'POL'
          ? 67.6
          : openData.iso3 === 'COL'
          ? 50.5
          : 34.2,
      fdiStockSharePct: 58.0,
      defenseAndSecurityTreatyStatus:
        openData.iso3 === 'POL' || openData.iso3 === 'TUR' || openData.iso3 === 'USA'
          ? 'NATO Article 5 Treaty Ally'
          : openData.iso3 === 'BRA' || openData.iso3 === 'COL' || openData.iso3 === 'EGY'
          ? 'Major Non-NATO Ally (MNNA)'
          : 'Bilateral Security & Trade Framework',
      secondarySanctionsSpilloverRisk:
        secondarySanctionsContagionProbPct >= 55
          ? 'CRITICAL'
          : secondarySanctionsContagionProbPct >= 35
          ? 'ELEVATED'
          : 'LOW',
    },
    {
      blocName: 'China / BRICS+ & SCO Commodity Corridor',
      ungaVotingAlignmentPct: chinaScoAlignPct,
      idealPointDistance: Number(Math.abs(1.0 - profile.chinaScoIdealPoint).toFixed(2)),
      bilateralTradeSharePct:
        openData.iso3 === 'BRA'
          ? 31.4
          : openData.iso3 === 'ZAF'
          ? 23.8
          : openData.iso3 === 'EGY'
          ? 16.5
          : 11.8,
      fdiStockSharePct: 19.5,
      defenseAndSecurityTreatyStatus:
        openData.iso3 === 'BRA' || openData.iso3 === 'ZAF' || openData.iso3 === 'EGY'
          ? 'BRICS+ Member & Bilateral CNY Swap Line'
          : 'Strategic Commercial & Belt-and-Road Partner',
      secondarySanctionsSpilloverRisk:
        sanctionsShock >= 0.45 ? 'CRITICAL' : sanctionsShock >= 0.25 ? 'ELEVATED' : 'MODERATE',
    },
    {
      blocName: 'Global South / Non-Aligned Swing Caucus (G77)',
      ungaVotingAlignmentPct: profile.nonAlignedSwingLeverage,
      idealPointDistance: Number(((100 - profile.nonAlignedSwingLeverage) / 45).toFixed(2)),
      bilateralTradeSharePct: 22.4,
      fdiStockSharePct: 14.0,
      defenseAndSecurityTreatyStatus: 'Multilateral Regional Clearing & South-South Corridor',
      secondarySanctionsSpilloverRisk: 'MODERATE',
    },
  ];

  const diplomaticAlignment: DiplomaticAlignmentResult = {
    conclusionHeadline: `UNGA Ideal-Point Topology classifies ${openData.countryName} as ${profile.blocClassification.replace(
      /_/g,
      ' '
    )} (US/G7 Ideal Point ${profile.usG7IdealPoint >= 0 ? '+' : ''}${profile.usG7IdealPoint.toFixed(
      2
    )} vs. China/SCO ${profile.chinaScoIdealPoint >= 0 ? '+' : ''}${profile.chinaScoIdealPoint.toFixed(
      2
    )}), yielding a ${secondarySanctionsContagionProbPct}% secondary sanctions spillover probability.`,
    geoeconomicBlocClassification: profile.blocClassification,
    usG7IdealPointScore: profile.usG7IdealPoint,
    chinaScoIdealPointScore: profile.chinaScoIdealPoint,
    nonAlignedSwingLeverageScore: profile.nonAlignedSwingLeverage,
    friendShoringFdiNetBetaPctGdp: Number(
      (profile.friendShoringBetaPctGdp - (tariffShock / 60) * 0.45).toFixed(2)
    ),
    secondarySanctionsContagionProbPct,
    blocTopology,
  };

  // =========================================================================
  // 7. CRITICAL MINERALS, SEMICONDUCTOR & ENERGY SUPPLY-CHAIN MATRIX (4-VIEW)
  // =========================================================================
  const isCommodityExporter =
    openData.iso3 === 'BRA' || openData.iso3 === 'ZAF' || openData.iso3 === 'COL';
  const isEnergyImporter =
    openData.iso3 === 'TUR' || openData.iso3 === 'POL' || openData.iso3 === 'EGY';

  const rawSupplyNodes: Omit<
    StrategicSupplyChainNode,
    'exportControlVulnerabilityScore' | 'stressedGdpImpactBps' | 'stressedCpiImpactBps' | 'isExportBanActive'
  >[] = [
    {
      chainId: 'semi_logic_7nm',
      commodityOrTechName: 'Advanced Logic Semiconductors (<7nm) & Wafer Fab',
      shortLabel: 'Logic Chips <7nm',
      strategicCategory: 'SEMICONDUCTORS',
      sovereignPosition:
        openData.iso3 === 'USA' ? 'BALANCED_PROCESSOR' : 'ACUTE_IMPORT_DEPENDENT',
      netTradeBalancePctConsumption: openData.iso3 === 'USA' ? -28 : -88,
      globalSupplierHhiIndex: 6450,
      primarySupplierBloc: 'Taiwan Strait & South Korea Foundry Cluster',
      supplierHubLat: 24.8,
      supplierHubLon: 121.0,
      domesticStockpileDays: 24,
      linkedChokepointIds: ['taiwan_strait', 'suez_canal', 'panama_canal'],
      downstreamDomesticSectors: 'Auto Assembly, Telecom 5G, Cloud Data Centers & Defense Avionics',
    },
    {
      chainId: 'critical_minerals_pgms',
      commodityOrTechName: 'Critical Minerals (Lithium, Niobium, PGMs, Copper)',
      shortLabel: 'Critical Minerals',
      strategicCategory: 'CRITICAL_MINERALS',
      sovereignPosition: isCommodityExporter
        ? 'NET_STRATEGIC_EXPORTER'
        : 'ACUTE_IMPORT_DEPENDENT',
      netTradeBalancePctConsumption:
        openData.iso3 === 'BRA' || openData.iso3 === 'ZAF' ? 185 : -54,
      globalSupplierHhiIndex: 4200,
      primarySupplierBloc: 'South America / Southern Africa / China Refining',
      supplierHubLat: -23.5,
      supplierHubLon: -46.6,
      domesticStockpileDays: isCommodityExporter ? 115 : 38,
      linkedChokepointIds: ['panama_canal', 'taiwan_strait', 'bab_el_mandeb'],
      downstreamDomesticSectors: 'EV Battery Cathodes, Grid Transformers, Steel Alloys & Catalysts',
    },
    {
      chainId: 'rare_earth_magnets',
      commodityOrTechName: 'Rare Earth Permanent Magnets (NdPr / Dysprosium)',
      shortLabel: 'Rare Earth Magnets',
      strategicCategory: 'RENEWABLE_METALS',
      sovereignPosition: 'ACUTE_IMPORT_DEPENDENT',
      netTradeBalancePctConsumption: -82,
      globalSupplierHhiIndex: 7100,
      primarySupplierBloc: 'China Heavy Rare Earth Refining Monopoly',
      supplierHubLat: 28.7,
      supplierHubLon: 115.9,
      domesticStockpileDays: 31,
      linkedChokepointIds: ['taiwan_strait', 'bab_el_mandeb', 'suez_canal'],
      downstreamDomesticSectors: 'Wind Turbines, EV Traction Motors, Precision Robotics & Actuators',
    },
    {
      chainId: 'crude_lng_hydrocarbons',
      commodityOrTechName: 'Crude Oil, Refined Diesel & LNG Baseload Fuel',
      shortLabel: 'Crude Oil & LNG',
      strategicCategory: 'HYDROCARBONS',
      sovereignPosition:
        openData.iso3 === 'BRA' || openData.iso3 === 'COL' || openData.iso3 === 'USA'
          ? 'NET_STRATEGIC_EXPORTER'
          : 'ACUTE_IMPORT_DEPENDENT',
      netTradeBalancePctConsumption: isEnergyImporter ? -74 : 32,
      globalSupplierHhiIndex: 3150,
      primarySupplierBloc: 'Arabian Gulf (Hormuz) & US Gulf LNG Corridor',
      supplierHubLat: 25.3,
      supplierHubLon: 51.5,
      domesticStockpileDays: isEnergyImporter ? 42 : 90,
      linkedChokepointIds: ['hormuz', 'bab_el_mandeb', 'suez_canal', 'panama_canal'],
      downstreamDomesticSectors: 'Thermal Baseload Power, Heavy Trucking Freight, Petrochemicals',
    },
    {
      chainId: 'fertilizer_staple_grain',
      commodityOrTechName: 'Nitrogen / Potash Fertilizers & Wheat Inputs',
      shortLabel: 'Fertilizers & Grain',
      strategicCategory: 'FOOD_FERTILIZER',
      sovereignPosition:
        openData.iso3 === 'USA' || openData.iso3 === 'POL'
          ? 'BALANCED_PROCESSOR'
          : 'ACUTE_IMPORT_DEPENDENT',
      netTradeBalancePctConsumption:
        openData.iso3 === 'BRA' || openData.iso3 === 'EGY' ? -78 : -35,
      globalSupplierHhiIndex: 3850,
      primarySupplierBloc: 'Black Sea / Baltic & Red Sea Bulk Corridors',
      supplierHubLat: 44.6,
      supplierHubLon: 37.8,
      domesticStockpileDays: 45,
      linkedChokepointIds: ['black_sea', 'suez_canal', 'bab_el_mandeb', 'panama_canal'],
      downstreamDomesticSectors: 'Export Agribusiness, Staple Food Basket CPI, Biofuel Feedstocks',
    },
  ];

  const supplyChainNodes: StrategicSupplyChainNode[] = rawSupplyNodes.map((node) => {
    const isExportBanActive = activeExportBanChainIds.includes(node.chainId);
    const banMultiplier = isExportBanActive ? 1.85 : 1.0;
    const banVulnerabilityAdd = isExportBanActive ? 22 : 0;

    let baseVuln = 55;
    let baseGdp = 14;
    let baseCpi = 12;

    if (node.chainId === 'semi_logic_7nm') {
      baseVuln = 68 + chokepointSeverity * 24 + (tariffShock / 60) * 14;
      baseGdp = 18 + chokepointSeverity * 36 + (tariffShock / 60) * 22;
      baseCpi = 14 + chokepointSeverity * 28;
    } else if (node.chainId === 'critical_minerals_pgms') {
      baseVuln = isCommodityExporter
        ? 28 + (tariffShock / 60) * 32
        : 58 + (tariffShock / 60) * 34;
      baseGdp = isCommodityExporter
        ? 12 + (tariffShock / 60) * 28
        : 16 + (tariffShock / 60) * 26;
      baseCpi = 10 + chokepointSeverity * 18;
    } else if (node.chainId === 'rare_earth_magnets') {
      baseVuln = 64 + (tariffShock / 60) * 26 + sanctionsShock * 18;
      baseGdp = 11 + (tariffShock / 60) * 24;
      baseCpi = 9 + (tariffShock / 60) * 19;
    } else if (node.chainId === 'crude_lng_hydrocarbons') {
      baseVuln = isEnergyImporter
        ? 62 + chokepointSeverity * 34
        : 32 + chokepointSeverity * 22;
      baseGdp = isEnergyImporter
        ? 28 + chokepointSeverity * 54
        : 12 + chokepointSeverity * 20;
      baseCpi = isEnergyImporter
        ? 35 + chokepointSeverity * 68
        : 18 + chokepointSeverity * 32;
    } else if (node.chainId === 'fertilizer_staple_grain') {
      baseVuln = 52 + chokepointSeverity * 28 + sanctionsShock * 24;
      baseGdp = 15 + chokepointSeverity * 29;
      baseCpi = 24 + chokepointSeverity * 46;
    }

    return {
      ...node,
      isExportBanActive,
      exportControlVulnerabilityScore: Math.min(99, Math.round(baseVuln + banVulnerabilityAdd)),
      stressedGdpImpactBps: Math.round(baseGdp * banMultiplier),
      stressedCpiImpactBps: Math.round(baseCpi * banMultiplier),
    };
  });

  // 6 Chokepoints x 5 Commodities Cross-Impact Heatmap Matrix
  const BASE_FLOW_SHARES: Record<string, Record<string, number>> = {
    hormuz: {
      semi_logic_7nm: 8,
      critical_minerals_pgms: 12,
      rare_earth_magnets: 10,
      crude_lng_hydrocarbons: 68,
      fertilizer_staple_grain: 38,
    },
    bab_el_mandeb: {
      semi_logic_7nm: 34,
      critical_minerals_pgms: 28,
      rare_earth_magnets: 36,
      crude_lng_hydrocarbons: 46,
      fertilizer_staple_grain: 42,
    },
    taiwan_strait: {
      semi_logic_7nm: 84,
      critical_minerals_pgms: 42,
      rare_earth_magnets: 76,
      crude_lng_hydrocarbons: 18,
      fertilizer_staple_grain: 14,
    },
    suez_canal: {
      semi_logic_7nm: 38,
      critical_minerals_pgms: 26,
      rare_earth_magnets: 34,
      crude_lng_hydrocarbons: 52,
      fertilizer_staple_grain: 48,
    },
    panama_canal: {
      semi_logic_7nm: 22,
      critical_minerals_pgms: 48,
      rare_earth_magnets: 24,
      crude_lng_hydrocarbons: 36,
      fertilizer_staple_grain: 44,
    },
    black_sea: {
      semi_logic_7nm: 4,
      critical_minerals_pgms: 18,
      rare_earth_magnets: 6,
      crude_lng_hydrocarbons: 32,
      fertilizer_staple_grain: 74,
    },
  };

  const chokepointCommodityMatrix: ChokepointCommodityCell[] = [];
  for (const cp of chokepoints) {
    const shortCorridor = cp.corridorName.split(' (')[0];
    for (const sc of supplyChainNodes) {
      const baseFlow = BASE_FLOW_SHARES[cp.corridorId]?.[sc.chainId] ?? 15;
      const countryWeightFactor = 0.65 + cp.sovereignTradeShareExposedPct / 45;
      const transitFlowDependencyPct = Math.min(96, Math.round(baseFlow * countryWeightFactor));
      const banMult = sc.isExportBanActive ? 1.65 : 1.0;
      const stressedCpiImpactBps = Math.round(
        (transitFlowDependencyPct / 100) * sc.stressedCpiImpactBps * 0.42 * banMult
      );
      const stressedGdpImpactBps = Math.round(
        (transitFlowDependencyPct / 100) * sc.stressedGdpImpactBps * 0.42 * banMult
      );

      let severityTier: ChokepointCommodityCell['severityTier'] = 'LOW';
      if (transitFlowDependencyPct >= 60 || stressedCpiImpactBps >= 18) {
        severityTier = 'CRITICAL';
      } else if (transitFlowDependencyPct >= 40 || stressedCpiImpactBps >= 11) {
        severityTier = 'HIGH';
      } else if (transitFlowDependencyPct >= 22 || stressedCpiImpactBps >= 6) {
        severityTier = 'MODERATE';
      }

      chokepointCommodityMatrix.push({
        corridorId: cp.corridorId,
        corridorShortName: shortCorridor,
        chainId: sc.chainId,
        chainShortName: sc.shortLabel,
        transitFlowDependencyPct,
        stressedCpiImpactBps,
        stressedGdpImpactBps,
        severityTier,
      });
    }
  }

  const upstreamFlowLinks: UpstreamSupplyFlowLink[] = [
    {
      linkId: 'flow_semi_tw',
      upstreamHubLabel: 'Taiwan / Korea Wafer Foundries',
      chokepointCorridorId: 'taiwan_strait',
      chokepointLabel: 'Taiwan Strait',
      chainId: 'semi_logic_7nm',
      commodityLabel: 'Logic Chips (<7nm)',
      domesticSectorLabel: 'Auto, 5G Telecom & Cloud Compute',
      flowVolumeSharePct: 84,
      stressedBottleneckScore: supplyChainNodes[0].exportControlVulnerabilityScore,
    },
    {
      linkId: 'flow_ree_cn',
      upstreamHubLabel: 'China Rare Earth Refining Cluster',
      chokepointCorridorId: 'taiwan_strait',
      chokepointLabel: 'Taiwan Strait / Red Sea',
      chainId: 'rare_earth_magnets',
      commodityLabel: 'NdPr Permanent Magnets',
      domesticSectorLabel: 'Wind Turbines, EV Motors & Grid',
      flowVolumeSharePct: 76,
      stressedBottleneckScore: supplyChainNodes[2].exportControlVulnerabilityScore,
    },
    {
      linkId: 'flow_lng_hormuz',
      upstreamHubLabel: 'Arabian Gulf & US Gulf LNG/Crude',
      chokepointCorridorId: 'hormuz',
      chokepointLabel: 'Strait of Hormuz / Suez',
      chainId: 'crude_lng_hydrocarbons',
      commodityLabel: 'Crude Oil & LNG Fuel',
      domesticSectorLabel: 'Baseload Power & Freight Diesel',
      flowVolumeSharePct: 68,
      stressedBottleneckScore: supplyChainNodes[3].exportControlVulnerabilityScore,
    },
    {
      linkId: 'flow_fert_blacksea',
      upstreamHubLabel: 'Black Sea / Baltic Bulk Terminals',
      chokepointCorridorId: 'black_sea',
      chokepointLabel: 'Black Sea & Suez Canal',
      chainId: 'fertilizer_staple_grain',
      commodityLabel: 'NPK Fertilizers & Wheat',
      domesticSectorLabel: 'Agribusiness & Food Basket CPI',
      flowVolumeSharePct: 72,
      stressedBottleneckScore: supplyChainNodes[4].exportControlVulnerabilityScore,
    },
    {
      linkId: 'flow_minerals_panama',
      upstreamHubLabel: 'Andean / Southern Africa Minerals',
      chokepointCorridorId: 'panama_canal',
      chokepointLabel: 'Panama Canal & Atlantic',
      chainId: 'critical_minerals_pgms',
      commodityLabel: 'Lithium, Copper, Niobium & PGMs',
      domesticSectorLabel: 'Battery Cathodes & Heavy Industry',
      flowVolumeSharePct: 58,
      stressedBottleneckScore: supplyChainNodes[1].exportControlVulnerabilityScore,
    },
  ];

  const aggregateSupplyChainVulnerabilityScore = Math.round(
    supplyChainNodes.reduce((acc, n) => acc + n.exportControlVulnerabilityScore, 0) /
      supplyChainNodes.length
  );
  const exportRetaliationLeverageScore = isCommodityExporter ? 78 : 44;
  const totalSupplyShockGdpDragBps = supplyChainNodes.reduce(
    (acc, n) => acc + n.stressedGdpImpactBps,
    0
  );
  const totalSupplyShockCpiPassThroughBps = supplyChainNodes.reduce(
    (acc, n) => acc + n.stressedCpiImpactBps,
    0
  );

  const strategicSupplyChain: StrategicSupplyChainResult = {
    conclusionHeadline: `Strategic Input-Output Matrix flags ${aggregateSupplyChainVulnerabilityScore}/100 supply-chain choke vulnerability (${activeExportBanChainIds.length} active export bans; Export Retaliation Leverage ${exportRetaliationLeverageScore}/100), generating -${totalSupplyShockGdpDragBps} bps GDP drag and +${totalSupplyShockCpiPassThroughBps} bps CPI pass-through.`,
    aggregateSupplyChainVulnerabilityScore,
    exportRetaliationLeverageScore,
    totalSupplyShockGdpDragBps,
    totalSupplyShockCpiPassThroughBps,
    supplyChainNodes,
    chokepointCommodityMatrix,
    upstreamFlowLinks,
  };

  // =========================================================================
  // 8. CYBER WARFARE, SUBSEA CABLE & CRITICAL GRID INFRASTRUCTURE SCORER
  // =========================================================================
  const vectors: CyberInfrastructureVector[] = [
    {
      vectorId: 'subsea_swift',
      infrastructureDomain: 'SUBSEA_CABLES_SWIFT',
      domainName: 'Subsea Fiber Landing Stations & SWIFT Interbank Settlement',
      redundancyScore: Math.max(
        18,
        Math.round(82 - profile.cyberFragilityBase * 0.55 - cyberShock * 28)
      ),
      chokeConcentrationMetric: `${profile.subseaCableRedundancy} international subsea cables; top 2 landing stations carry 68% of FX/SWIFT bandwidth`,
      activeThreatActorProfile: 'Hybrid Seabed Sabotage & BGP Route Hijacking',
      attackProbabilityPct: Math.min(88, Math.round(14 + cyberShock * 56 + chokepointSeverity * 18)),
      estimatedDailyGdpLossUsdMillions: Math.round(
        145 + cyberShock * 210 + (100 - profile.cyberFragilityBase) * 1.2
      ),
      bankingLiquidityFreezeHours: Math.round(6 + cyberShock * 36),
      vulnerabilityTier:
        cyberShock >= 0.55 || profile.cyberFragilityBase >= 58
          ? 'CRITICAL'
          : cyberShock >= 0.3
          ? 'HIGH'
          : 'MODERATE',
    },
    {
      vectorId: 'power_grid_scada',
      infrastructureDomain: 'POWER_GRID_SCADA',
      domainName: 'National High-Voltage Power Grid & Pipeline SCADA Control',
      redundancyScore: Math.max(
        15,
        Math.round(profile.powerGridReserveMarginPct * 4.2 - cyberShock * 25)
      ),
      chokeConcentrationMetric: `${profile.powerGridReserveMarginPct}% peak generation reserve margin; 18-month HV transformer replacement lead time`,
      activeThreatActorProfile: 'APT Industrial Control System (ICS/OT) Wiper Malware',
      attackProbabilityPct: Math.min(84, Math.round(16 + cyberShock * 52)),
      estimatedDailyGdpLossUsdMillions: Math.round(190 + cyberShock * 260),
      bankingLiquidityFreezeHours: Math.round(4 + cyberShock * 18),
      vulnerabilityTier:
        profile.powerGridReserveMarginPct < 10 || cyberShock >= 0.5
          ? 'CRITICAL'
          : 'HIGH',
    },
    {
      vectorId: 'cb_rtgs_rails',
      infrastructureDomain: 'CENTRAL_BANK_RTGS',
      domainName: 'Central Bank RTGS, Sovereign Debt Auction & Instant Payment Rails',
      redundancyScore: Math.max(28, Math.round(84 - cyberShock * 32 - sanctionsShock * 18)),
      chokeConcentrationMetric: 'Tier-4 Domestic Cloud Mirroring with Air-Gapped Cold Ledger',
      activeThreatActorProfile: 'State-Sponsored Financial DDoS & Sovereign Custodian Intrusion',
      attackProbabilityPct: Math.min(86, Math.round(18 + cyberShock * 50 + sanctionsShock * 20)),
      estimatedDailyGdpLossUsdMillions: Math.round(165 + cyberShock * 230),
      bankingLiquidityFreezeHours: Math.round(8 + cyberShock * 42),
      vulnerabilityTier: cyberShock >= 0.45 ? 'CRITICAL' : 'MODERATE',
    },
    {
      vectorId: 'port_customs',
      infrastructureDomain: 'PORT_CUSTOMS_LOGISTICS',
      domainName: 'Automated Container Port Cranes & Customs Single-Window',
      redundancyScore: Math.max(22, Math.round(74 - cyberShock * 34)),
      chokeConcentrationMetric: 'Top 3 maritime terminals process 76% of containerized trade',
      activeThreatActorProfile: 'Supply-Chain Ransomware & GPS/AIS Spoofing',
      attackProbabilityPct: Math.min(89, Math.round(22 + cyberShock * 54)),
      estimatedDailyGdpLossUsdMillions: Math.round(110 + cyberShock * 175),
      bankingLiquidityFreezeHours: Math.round(2 + cyberShock * 12),
      vulnerabilityTier: cyberShock >= 0.4 ? 'HIGH' : 'MODERATE',
    },
  ];

  const compositeCyberFragilityScore = Math.min(
    98,
    Math.round(profile.cyberFragilityBase * 0.65 + cyberShock * 48)
  );
  const stressed7DayHybridAttackGdpDragBps = Math.round(
    14 + cyberShock * 62 + (20 - Math.min(18, profile.powerGridReserveMarginPct)) * 1.8
  );
  const stressedBankingSpreadWideningBps = Math.round(18 + cyberShock * 75 + sanctionsShock * 35);

  const cyberVulnerability: CyberVulnerabilityResult = {
    conclusionHeadline: `Hybrid Cyber & Subsea Infrastructure Fragility reaches ${compositeCyberFragilityScore}/100 (${profile.subseaCableRedundancy} subsea cables; ${profile.powerGridReserveMarginPct}% grid reserve margin); a 7-day coordinated hybrid attack inflicts ${stressed7DayHybridAttackGdpDragBps} bps GDP drag and +${stressedBankingSpreadWideningBps} bps banking spread widening.`,
    compositeCyberFragilityScore,
    subseaCableRedundancyCount: profile.subseaCableRedundancy,
    powerGridReserveMarginPct: profile.powerGridReserveMarginPct,
    stressed7DayHybridAttackGdpDragBps,
    stressedBankingSpreadWideningBps,
    vectors,
  };

  // =========================================================================
  // 9. SUBSEA CABLE ROUTES & BILATERAL TRADE CORRIDORS FOR GEOSPATIAL MAP
  // =========================================================================
  const cableStatus: SubseaCableRouteArc['status'] =
    cyberShock >= 0.55
      ? 'CHOKED_ALERT'
      : cyberShock >= 0.3 || chokepointSeverity >= 0.5
      ? 'DEGRADED_LATENCY'
      : 'OPERATIONAL';

  const subseaCableRoutes: SubseaCableRouteArc[] = [
    {
      cableId: 'cable_seamewe_aae1',
      cableName: 'SEA-ME-WE 5 & AAE-1 Euro-Asia Subsea Trunk',
      landingStationLabel: 'Suez / Zafarana – Red Sea – Marseille',
      startLat: 43.3,
      startLon: 5.4,
      midLat: 21.5,
      midLon: 38.5,
      endLat: 1.3,
      endLon: 103.8,
      bandwidthSharePct: 38,
      status: cableStatus,
      linkedChokepointId: 'bab_el_mandeb',
    },
    {
      cableId: 'cable_ellalink_sat3',
      cableName: 'EllaLink & South Atlantic Interbank Trunk',
      landingStationLabel: `${profile.coord.capitalLabel} – Sines / Lisbon – London`,
      startLat: profile.coord.lat,
      startLon: profile.coord.lon,
      midLat: 14.0,
      midLon: -24.0,
      endLat: 38.7,
      endLon: -9.1,
      bandwidthSharePct: 34,
      status: cableStatus,
      linkedChokepointId: 'suez_canal',
    },
    {
      cableId: 'cable_transpacific_faster',
      cableName: 'Trans-Pacific FASTER & Apricot Wafer Telemetry Trunk',
      landingStationLabel: 'Taiwan / Tokyo – Guam – US West Coast',
      startLat: 24.8,
      startLon: 121.5,
      midLat: 32.0,
      midLon: 165.0,
      endLat: 37.4,
      endLon: -122.1,
      bandwidthSharePct: 28,
      status: cableStatus,
      linkedChokepointId: 'taiwan_strait',
    },
  ];

  const bilateralTradeCorridors: BilateralTradeCorridorArc[] = profile.tariffPartners.map(
    (tp, idx) => ({
      corridorId: `trade_arc_${idx}`,
      partnerName: tp.bloc,
      partnerLat: tp.partnerLat,
      partnerLon: tp.partnerLon,
      tradeSharePct: tp.exportSharePct,
      effectiveTariffPct: Number((tp.baseTariffPct + tariffShock).toFixed(1)),
      primaryGoods: tp.sectors,
      linkedSupplyChainIds: tp.linkedSupplyChainIds,
    })
  );

  // =========================================================================
  // 10. DIRECT MULTI-SOVEREIGN PORTFOLIO VaR / PnL STRESS TRANSMISSION
  // =========================================================================
  const portfolioNavUsdMillions = 250;
  const bookTemplate = [
    { iso3: 'BRA', countryName: 'Brazil', currencyCode: 'BRL', weightNavPct: 22, beta: 0.92 },
    { iso3: 'MEX', countryName: 'Mexico', currencyCode: 'MXN', weightNavPct: 20, beta: 0.84 },
    { iso3: 'TUR', countryName: 'Turkey', currencyCode: 'TRY', weightNavPct: 14, beta: 1.28 },
    { iso3: 'ZAF', countryName: 'South Africa', currencyCode: 'ZAR', weightNavPct: 14, beta: 1.04 },
    { iso3: 'POL', countryName: 'Poland', currencyCode: 'PLN', weightNavPct: 15, beta: 0.76 },
    { iso3: 'EGY', countryName: 'Egypt', currencyCode: 'EGP', weightNavPct: 15, beta: 1.36 },
  ];

  const activeInTemplate = bookTemplate.some((b) => b.iso3 === openData.iso3);
  const effectiveBook = activeInTemplate
    ? bookTemplate
    : [
        {
          iso3: openData.iso3,
          countryName: openData.countryName,
          currencyCode: openData.currencyCode,
          weightNavPct: 22,
          beta: 1.0,
        },
        ...bookTemplate.slice(1),
      ];

  const exportBanExtraCds = activeExportBanChainIds.length * 14;
  const baseCdsShock = expectedProbabilityWeightedCdsDeltaBps + exportBanExtraCds;
  const baseFxShock =
    (escalationTree[1].spotFxDeltaPct * stage2Prob +
      escalationTree[2].spotFxDeltaPct * stage3Prob) /
      100 +
    activeExportBanChainIds.length * 0.8;
  const baseYieldShock =
    (escalationTree[1].local10YYieldDeltaBps * stage2Prob +
      escalationTree[2].local10YYieldDeltaBps * stage3Prob) /
      100 +
    activeExportBanChainIds.length * 12;

  const positionTransmissions: GeoPortfolioTransmissionRow[] = effectiveBook.map((pos) => {
    const isTarget = pos.iso3 === openData.iso3;
    const effectiveBeta = isTarget ? 1.0 : pos.beta * 0.68;
    const notionalUsdMillions = Number(
      ((portfolioNavUsdMillions * pos.weightNavPct) / 100).toFixed(1)
    );
    const projectedCdsWideningBps = Math.round(baseCdsShock * effectiveBeta);
    const projectedFxMovePct = Number((-baseFxShock * effectiveBeta).toFixed(2));
    const projectedLocalYieldMoveBps = Math.round(baseYieldShock * effectiveBeta);

    const rateAndCreditLossPct =
      (projectedCdsWideningBps * 0.045 + projectedLocalYieldMoveBps * 0.032) / 10;
    const fxLossPct = Math.abs(projectedFxMovePct) * 0.38;
    const totalPositionLossPct = -(rateAndCreditLossPct + fxLossPct);
    const unhedgedStressPnlUsdThousands = Math.round(
      notionalUsdMillions * 10 * totalPositionLossPct
    );
    const unhedgedStressReturnBpsNav = Math.round(
      (unhedgedStressPnlUsdThousands / (portfolioNavUsdMillions * 10)) * 100
    );

    return {
      iso3: pos.iso3,
      countryName: pos.countryName,
      currencyCode: pos.currencyCode,
      weightNavPct: pos.weightNavPct,
      notionalUsdMillions,
      geopoliticalSpilloverBeta: Number(effectiveBeta.toFixed(2)),
      projectedCdsWideningBps,
      projectedFxMovePct,
      projectedLocalYieldMoveBps,
      unhedgedStressPnlUsdThousands,
      unhedgedStressReturnBpsNav,
    };
  });

  const totalUnhedgedGeoStressPnlUsdThousands = positionTransmissions.reduce(
    (acc, r) => acc + r.unhedgedStressPnlUsdThousands,
    0
  );
  const totalUnhedgedGeoStressPctNav = Number(
    ((totalUnhedgedGeoStressPnlUsdThousands / (portfolioNavUsdMillions * 1000)) * 100).toFixed(2)
  );

  const avgHedgePayoffBps =
    (tailHedges[0].twoSigmaGprShockPayoffBps * 0.45 +
      tailHedges[1].twoSigmaGprShockPayoffBps * 0.35 +
      tailHedges[2].twoSigmaGprShockPayoffBps * 0.2) *
    (compositeGprZScore / 2.2);
  const tailHedgeOffsetPnlUsdThousands = Math.round(
    portfolioNavUsdMillions * 10 * (avgHedgePayoffBps / 100) * 0.55
  );
  const netHedgedGeoStressPnlUsdThousands =
    totalUnhedgedGeoStressPnlUsdThousands + tailHedgeOffsetPnlUsdThousands;
  const netHedgedGeoStressPctNav = Number(
    ((netHedgedGeoStressPnlUsdThousands / (portfolioNavUsdMillions * 1000)) * 100).toFixed(2)
  );

  const baselineCvar99PctNav = 3.45;
  const geoStressedCvar99PctNav = Number(
    (
      baselineCvar99PctNav +
      Math.abs(totalUnhedgedGeoStressPctNav) * 0.62 +
      cyberShock * 0.45
    ).toFixed(2)
  );

  const propagatedForecastShocks = {
    realRateShockBps: Math.round(
      aggregateChokepointCdsImpactBps * 0.85 +
        sanctionsShock * 125 +
        cyberShock * 45 +
        activeExportBanChainIds.length * 20
    ),
    realGdpGrowthShockPct: Number(
      (
        -(
          totalTariffGdpDragBps +
          totalSupplyShockGdpDragBps * 0.45 +
          stressed7DayHybridAttackGdpDragBps * 0.5
        ) / 100
      ).toFixed(2)
    ),
    primaryBalanceShockPctGdp: Number(
      (-electoralProfile.preElectionFiscalSlippagePctGdp).toFixed(2)
    ),
    fxDepreciationShockPct: Math.round(
      Math.min(40, Math.abs(baseFxShock) * 1.35 + sanctionsShock * 8)
    ),
    externalVolatilityMultiplier: Number(
      Math.min(2.5, 1.0 + compositeGprZScore * 0.28).toFixed(2)
    ),
  };

  const portfolioTransmission: GeoPortfolioTransmissionSummary = {
    conclusionHeadline: `Active Wargame Shocks inflict $${Math.abs(
      totalUnhedgedGeoStressPnlUsdThousands
    ).toLocaleString()}k (${totalUnhedgedGeoStressPctNav}% NAV) unhedged drawdown on the $250M Multi-Sovereign Book and lift 99% Tail CVaR from ${baselineCvar99PctNav}% to ${geoStressedCvar99PctNav}% NAV; the Tail-Hedge Overlay recovers +$${tailHedgeOffsetPnlUsdThousands.toLocaleString()}k (Net ${netHedgedGeoStressPctNav}% NAV).`,
    portfolioNavUsdMillions,
    totalUnhedgedGeoStressPnlUsdThousands,
    totalUnhedgedGeoStressPctNav,
    tailHedgeOffsetPnlUsdThousands,
    netHedgedGeoStressPnlUsdThousands,
    netHedgedGeoStressPctNav,
    baselineCvar99PctNav,
    geoStressedCvar99PctNav,
    propagatedForecastShocks,
    positionTransmissions,
  };

  return {
    wargameParams: params,
    sovereignCoord: profile.coord,
    chokepointConclusionHeadline,
    totalExposedMaritimeTradePct,
    aggregateChokepointCpiPassThroughBps,
    aggregateChokepointCdsImpactBps,
    chokepoints,
    sanctionsAndReserves,
    gprAndEscalation,
    tailHedgeConclusionHeadline,
    topRankedHedgeInstrument: topHedge.instrumentName,
    tailHedges,
    osintEventStreamHeadline,
    osintEvents,
    diplomaticAlignment,
    strategicSupplyChain,
    cyberVulnerability,
    portfolioTransmission,
    subseaCableRoutes,
    bilateralTradeCorridors,
  };
}
