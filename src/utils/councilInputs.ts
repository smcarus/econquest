/**
 * What the full council is told about a country. Only figures a live feed, an official series or
 * your own data filled are passed to the agents; every other figure is named as missing, with
 * the reason, so a model cannot treat a built-in value as data (Sam, 2026-11-04).
 */
import type { OpenDataSnapshot } from '../types/council';
import { getSnapshotDataStatus } from './dataStatus';
import { pathMissing } from './countryNotes';

const FIGURES: Array<{ label: string; path: string; fmt: (v: number, s: OpenDataSnapshot) => string }> = [
  { label: 'IMF gross debt / GDP', path: 'imf.debtToGdpPct', fmt: (v) => `${v}%` },
  { label: 'IMF debt / GDP, 2027 forecast', path: 'imf.debtToGdpForecast2027Pct', fmt: (v) => `${v}%` },
  { label: 'IMF primary fiscal balance', path: 'imf.primaryFiscalBalancePct', fmt: (v) => `${v}% of GDP` },
  { label: 'IMF real GDP growth', path: 'imf.realGdpGrowthPct', fmt: (v) => `${v}%` },
  { label: 'IMF headline CPI', path: 'imf.cpiInflationPct', fmt: (v) => `${v}%` },
  { label: 'World Bank FX reserves', path: 'wb.fxReservesMonthsImport', fmt: (v) => `${v} months of imports` },
  { label: 'World Bank current account', path: 'wb.currentAccountPctGdp', fmt: (v) => `${v}% of GDP` },
  { label: 'World Bank political stability', path: 'wb.politicalStabilityPercentile', fmt: (v) => `${v} percentile` },
  { label: 'Central bank policy rate', path: 'market.policyRatePct', fmt: (v) => `${v}%` },
  { label: '10Y government yield', path: 'market.sovereign10YBondYieldPct', fmt: (v) => `${v}%` },
  { label: '5Y USD CDS', path: 'market.cds5YSpreadBps', fmt: (v) => `${v} bps` },
  { label: 'Spot FX', path: 'market.exchangeRatePerUsd', fmt: (v, s) => `${v} ${s.currencyCode}/USD` },
  { label: 'GDELT conflict index', path: 'gdelt.conflictIntensityIndex', fmt: (v) => `${v}/100` },
  { label: 'GDELT news tone', path: 'gdelt.averageTone', fmt: (v) => `${v}` },
];

/** The model desks (debt fan, crisis odds, restructuring NPV...) run on these; without them their outputs are left out. */
export const DESK_ENGINE_INPUTS = ['imf.debtToGdpPct', 'imf.realGdpGrowthPct', 'imf.cpiInflationPct', 'imf.primaryFiscalBalancePct', 'wb.fxReservesMonthsImport'];

export interface CouncilInputs {
  /** One line per figure: the value and its source, or MISSING with the reason. */
  lines: string[];
  live: string[];
  missing: string[];
  /** Whether the model desk outputs may be shown to the agents. */
  deskEnginesLive: boolean;
  missingDeskInputs: string[];
}

export function councilInputs(snapshot: OpenDataSnapshot): CouncilInputs {
  const status = getSnapshotDataStatus(snapshot);
  const live: string[] = [];
  const missing: string[] = [];
  const lines = FIGURES.map((f) => {
    const v = status.live(f.path);
    if (v === undefined) {
      missing.push(f.label);
      return `- ${f.label}: MISSING (${pathMissing(status, f.path).short})`;
    }
    live.push(f.label);
    return `- ${f.label}: ${f.fmt(v, snapshot)} (${snapshot.liveFields?.[f.path] || 'live'})`;
  });
  const p = snapshot.polymarketContracts?.[0];
  lines.push(`- Polymarket key contract: ${p ? `"${p.question}" (${p.probabilityPct}% odds)` : 'none found for this country'}`);
  const missingDeskInputs = DESK_ENGINE_INPUTS.filter((path) => !status.isLive(path));
  return { lines, live, missing, deskEnginesLive: missingDeskInputs.length === 0, missingDeskInputs };
}

/** The instruction that goes with the figures. */
export const MISSING_FIGURES_RULE =
  'Figures marked MISSING are unknown. Do not estimate, assume or quote a value for them; say the figure is missing where it matters to your view, and lower your confidence.';
