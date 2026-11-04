/**
 * Scenario exposure: which countries a Hormuz, Taiwan Strait or Russia shock would hit hardest,
 * through trade. Owned by the Global Spillover Agent (the council agent of that name).
 *
 * Inputs are official trade figures (free, no key), checked 2026-11-04:
 * - World Bank WDI: fuel imports and fuel exports (% of merchandise trade), imports and exports
 *   of goods and services (% of GDP). Latest year, usually last year.
 * - World Bank WITS: partner shares of exports and imports (China, Russia). Latest year available.
 *
 * Each scenario is a stated shock applied to those shares, giving a first-round hit to the
 * current account in % of GDP. It is a model: no second-round effects, no price elasticities,
 * and fuel shares of merchandise trade are applied to goods-and-services totals (an approximation).
 */

export const WB_TRADE_INDICATORS = {
  fuelImportsPctMerch: 'TM.VAL.FUEL.ZS.UN',
  fuelExportsPctMerch: 'TX.VAL.FUEL.ZS.UN',
  importsPctGdp: 'NE.IMP.GNFS.ZS',
  exportsPctGdp: 'NE.EXP.GNFS.ZS',
} as const;
export type WbTradeKey = keyof typeof WB_TRADE_INDICATORS;

export function wbIndicatorUrl(iso3s: string[], indicator: string): string {
  return `https://api.worldbank.org/v2/country/${iso3s.join(';')}/indicator/${indicator}?format=json&mrnev=1&per_page=100`;
}

/** World Bank [meta, rows] reply -> ISO3 -> { value, year }. */
export function parseWbLatest(json: unknown): Map<string, { value: number; year: string }> {
  const out = new Map<string, { value: number; year: string }>();
  const rows = Array.isArray(json) ? json[1] : null;
  if (!Array.isArray(rows)) return out;
  for (const r of rows as Array<{ countryiso3code?: string; date?: string; value?: unknown }>) {
    const v = typeof r.value === 'number' ? r.value : NaN;
    if (!r.countryiso3code || !Number.isFinite(v)) continue;
    const prev = out.get(r.countryiso3code);
    if (!prev || String(r.date) > prev.year) out.set(r.countryiso3code, { value: v, year: String(r.date) });
  }
  return out;
}

export type WitsIndicator = 'XPRT-PRTNR-SHR' | 'MPRT-PRTNR-SHR';
export function witsUrl(iso3: string, partner: string, indicator: WitsIndicator, year: number): string {
  return `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade/reporter/${iso3.toLowerCase()}/year/${year}/partner/${partner.toLowerCase()}/product/all/indicator/${indicator}`;
}

/** WITS SDMX reply: <Obs TIME_PERIOD="2023" OBS_VALUE="30.7112" .../>. Share in percent. */
export function parseWitsShare(xml: unknown): { pct: number; year: string } | null {
  if (typeof xml !== 'string') return null;
  const obs = xml.match(/<Obs\b[^>]*>/);
  if (!obs) return null;
  const year = obs[0].match(/TIME_PERIOD="(\d{4})"/)?.[1];
  const val = Number(obs[0].match(/OBS_VALUE="([-\d.]+)"/)?.[1]);
  if (!year || !Number.isFinite(val) || val < 0 || val > 100) return null;
  return { pct: val, year };
}

export interface TradeExposure {
  fuelImportsPctMerch?: number;
  fuelExportsPctMerch?: number;
  importsPctGdp?: number;
  exportsPctGdp?: number;
  /** Year of the World Bank figures. */
  wbYear?: string;
  chinaExportSharePct?: number;
  russiaExportSharePct?: number;
  russiaImportSharePct?: number;
  /** Year of the WITS partner shares. */
  witsYear?: string;
}

export type ScenarioId = 'hormuz' | 'taiwan' | 'russia';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  shock: string;
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'hormuz', name: 'Strait of Hormuz closed', shock: 'Oil up 50%: net fuel imports cost 50% more (exporters gain).' },
  { id: 'taiwan', name: 'Taiwan Strait crisis', shock: 'Exports to China fall 20%.' },
  { id: 'russia', name: 'Russia escalation', shock: 'Trade with Russia halves (exports and imports).' },
];

export interface ScenarioImpact {
  /** First-round current account effect, % of GDP. Negative = hit. */
  pctGdp: number;
  /** The figures behind it, in words. */
  basis: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** First-round current account effect of one scenario, or null when a needed figure is missing. */
export function scenarioImpact(id: ScenarioId, t: TradeExposure): ScenarioImpact | null {
  if (id === 'hormuz') {
    if ([t.fuelImportsPctMerch, t.fuelExportsPctMerch, t.importsPctGdp, t.exportsPctGdp].some((v) => v === undefined)) return null;
    const netFuel = ((t.fuelImportsPctMerch as number) / 100) * (t.importsPctGdp as number) - ((t.fuelExportsPctMerch as number) / 100) * (t.exportsPctGdp as number);
    return {
      pctGdp: r2(-0.5 * netFuel),
      basis: `net fuel ${netFuel >= 0 ? 'imports' : 'exports'} about ${Math.abs(netFuel).toFixed(1)}% of GDP (World Bank, ${t.wbYear})`,
    };
  }
  if (id === 'taiwan') {
    if (t.chinaExportSharePct === undefined || t.exportsPctGdp === undefined) return null;
    const toChina = (t.chinaExportSharePct / 100) * t.exportsPctGdp;
    return { pctGdp: r2(-0.2 * toChina), basis: `exports to China about ${toChina.toFixed(1)}% of GDP (${t.chinaExportSharePct.toFixed(0)}% of exports, WITS ${t.witsYear})` };
  }
  if (t.russiaExportSharePct === undefined || t.russiaImportSharePct === undefined || t.exportsPctGdp === undefined || t.importsPctGdp === undefined) return null;
  const withRussia = (t.russiaExportSharePct / 100) * t.exportsPctGdp + (t.russiaImportSharePct / 100) * t.importsPctGdp;
  return { pctGdp: r2(-0.5 * withRussia), basis: `trade with Russia about ${withRussia.toFixed(1)}% of GDP (WITS ${t.witsYear})` };
}

/** Countries ranked from hardest hit to most helped, for one scenario. */
export function rankScenario(
  id: ScenarioId,
  items: Array<{ iso3: string; countryName: string; trade?: TradeExposure }>
): Array<{ iso3: string; countryName: string } & ScenarioImpact> {
  return items
    .map((it) => {
      const imp = it.trade ? scenarioImpact(id, it.trade) : null;
      return imp ? { iso3: it.iso3, countryName: it.countryName, ...imp } : null;
    })
    .filter((x): x is { iso3: string; countryName: string } & ScenarioImpact => x !== null)
    .sort((a, b) => a.pctGdp - b.pctGdp);
}
