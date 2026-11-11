/**
 * Climate and energy (data batch G20): emissions per head, the renewable share of energy use, the
 * energy mix and physical climate risk.
 *
 * - Greenhouse gas emissions per head (World Bank WDI EN.GHG.ALL.PC.CE.AR5: all greenhouse gases,
 *   excluding land use, tonnes of CO2 equivalent per person, from the EU's EDGAR database).
 * - Renewable energy, % of final energy consumption (World Bank WDI EG.FEC.RNEW.ZS, the UN
 *   Sustainable Development Goal 7 figure).
 * - Energy mix: the shares of coal, oil, gas, nuclear and renewables in primary energy, from Our
 *   World in Data's energy file, which takes them from the Energy Institute's Statistical Review of
 *   World Energy. The Energy Institute's terms allow only private, non-commercial use, so the file is
 *   downloaded on the user's own computer by the daily run and never shipped (Sam's choice for
 *   personal use, as for the IMF investor base); the licence page says so.
 * - Physical climate risk (ND-GAIN): Missing. ND-GAIN states no licence, so the app does not read it
 *   until ND-GAIN says in writing that the scores may be used.
 *
 * Only figures a live feed answered are used; nothing built in. Browser-safe: no fs, no network.
 */
import type { OpenDataSnapshot } from '../types/council';

export const EMISSIONS_CODE = 'EN.GHG.ALL.PC.CE.AR5';
export const RENEWABLE_CODE = 'EG.FEC.RNEW.ZS';

export type ClimateField = 'ghgPerHeadT' | 'renewableSharePct';

/** The World Bank codes, the snapshot field each fills, and how many yearly rows to ask for. */
export const CLIMATE_CODES: Array<{ code: string; field: ClimateField; perPage: number }> = [
  { code: EMISSIONS_CODE, field: 'ghgPerHeadT', perPage: 10 },
  { code: RENEWABLE_CODE, field: 'renewableSharePct', perPage: 10 },
];

/** The latest usable row (rows come newest first): emissions 0 to 100 tonnes a head, the share 0 to 100. */
export function pickClimateRow(field: ClimateField, rows: unknown): { value: number; year: string } | undefined {
  if (!Array.isArray(rows)) return undefined;
  for (const r of rows as Array<{ date?: unknown; value?: unknown }>) {
    const v = r?.value;
    const year = String(r?.date ?? '');
    if (typeof v !== 'number' || !Number.isFinite(v) || !/^\d{4}$/.test(year) || v < 0 || v > 100) continue;
    return { value: v, year };
  }
  return undefined;
}

export interface YearValue {
  value: number;
  year: string;
}

export interface ClimateFigures {
  ghgPerHeadT?: YearValue;
  renewableSharePct?: YearValue;
}

/** The live World Bank figures of a snapshot, each with the year in its source tag; undefined when none is live. */
export function climateFromSnapshot(snap: OpenDataSnapshot): ClimateFigures | undefined {
  const lf = snap.liveFields || {};
  const wb = (snap.worldBankIndicators || {}) as unknown as Record<string, unknown>;
  const out: ClimateFigures = {};
  for (const { field } of CLIMATE_CODES) {
    const tag = lf[`wb.${field}`];
    const v = wb[field];
    const year = /((?:19|20)\d{2})/.exec(tag || '')?.[1];
    if (!tag || tag === 'AI estimate' || !year || typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[field] = { value: v, year };
  }
  return Object.keys(out).length ? out : undefined;
}

// --- Energy mix (Our World in Data energy file) ---

export const OWID_ENERGY_URL = 'https://catalog.ourworldindata.org/energy/owid_energy/owid_energy.csv';
/** The older file, no longer updated by Our World in Data; read only when the new one does not answer. */
export const OWID_ENERGY_LEGACY_URL = 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv';

export const MIX_FUELS = ['coal', 'oil', 'gas', 'nuclear', 'renewables'] as const;
export type MixFuel = (typeof MIX_FUELS)[number];
export const FUEL_LABEL: Record<MixFuel, string> = { coal: 'coal', oil: 'oil', gas: 'gas', nuclear: 'nuclear', renewables: 'renewables' };

/** Column names: the file renamed every column on 2026-09-10 (new first, then the old name). */
const COLUMNS: Record<MixFuel, [string, string]> = {
  coal: ['coal_energy_share_pct', 'coal_share_energy'],
  oil: ['oil_energy_share_pct', 'oil_share_energy'],
  gas: ['gas_energy_share_pct', 'gas_share_energy'],
  nuclear: ['nuclear_energy_share_pct', 'nuclear_share_energy'],
  renewables: ['renewables_energy_share_pct', 'renewables_share_energy'],
};

export interface EnergyMix {
  year: string;
  /** Share of primary energy, percent, for each fuel the file gives that year. */
  shares: Partial<Record<MixFuel, number>>;
}

export interface OwidEnergyPull {
  pulledAt: string;
  /** Which file answered: the current one, or the older one that is no longer updated. */
  file: 'current' | 'legacy';
  countries: Record<string, EnergyMix>;
}

/** One CSV line, with quoted fields ("Bonaire, Sint Eustatius and Saba"). */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Which columns of a header line hold the energy mix, or null when the file is not laid out as expected. */
export function energyColumns(header: string): { iso: number; year: number; fuels: Partial<Record<MixFuel, number>> } | null {
  const h = splitLine(header.replace(/^﻿/, '').trim());
  const iso = h.indexOf('iso_code');
  const year = h.indexOf('year');
  if (iso < 0 || year < 0) return null;
  const fuels: Partial<Record<MixFuel, number>> = {};
  for (const f of MIX_FUELS) {
    const i = COLUMNS[f].map((c) => h.indexOf(c)).find((x) => x >= 0);
    if (i !== undefined) fuels[f] = i;
  }
  // Coal, oil and gas are needed; without them it is not the energy mix.
  return fuels.coal !== undefined && fuels.oil !== undefined && fuels.gas !== undefined ? { iso, year, fuels } : null;
}

/**
 * The file -> the latest year with coal, oil and gas shares for each country (three-letter codes
 * only; regions such as "OWID_WRL" are left out). Null when the header is not understood.
 */
export function parseOwidEnergy(text: string): Record<string, EnergyMix> | null {
  const nl = text.indexOf('\n');
  const cols = energyColumns(nl < 0 ? text : text.slice(0, nl));
  if (!cols) return null;
  const out: Record<string, EnergyMix> = {};
  for (const line of text.slice(nl + 1).split('\n')) {
    if (!line.trim()) continue;
    const c = splitLine(line.replace(/\r$/, ''));
    const iso3 = c[cols.iso];
    const year = c[cols.year];
    if (!/^[A-Z]{3}$/.test(iso3 || '') || !/^\d{4}$/.test(year || '')) continue;
    const shares: Partial<Record<MixFuel, number>> = {};
    for (const f of MIX_FUELS) {
      const i = cols.fuels[f];
      if (i === undefined || c[i] === '' || c[i] === undefined) continue;
      const v = Number(c[i]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) shares[f] = Number(v.toFixed(1));
    }
    if (shares.coal === undefined || shares.oil === undefined || shares.gas === undefined) continue;
    if (!out[iso3] || year > out[iso3].year) out[iso3] = { year, shares };
  }
  return out;
}

/** "oil 38.1%, gas 28.0%, coal 12.4%, renewables 15.2%, nuclear 6.3% (2025)": largest first. */
export function energyMixValue(m: EnergyMix): string {
  return `${MIX_FUELS.filter((f) => m.shares[f] !== undefined)
    .sort((a, b) => (m.shares[b] as number) - (m.shares[a] as number))
    .map((f) => `${FUEL_LABEL[f]} ${(m.shares[f] as number).toFixed(1)}%`)
    .join(', ')} (${m.year})`;
}

/** Oil and gas together, % of primary energy, for the oil-shock reading. */
export const oilGasShare = (m: EnergyMix): number | undefined => (m.shares.oil !== undefined && m.shares.gas !== undefined ? Number((m.shares.oil + m.shares.gas).toFixed(1)) : undefined);

export const ENERGY_MIX_SOURCE = 'Our World in Data energy file, from the Energy Institute Statistical Review of World Energy; share of primary energy';
export const ENERGY_MIX_LEGACY_NOTE = 'older file, no longer updated by Our World in Data';
export const ENERGY_MIX_TERMS_NOTE = 'Energy Institute terms: private, non-commercial use only; downloaded on this computer, not shipped';
export const EMISSIONS_SOURCE = 'World Bank WDI (EU EDGAR); all greenhouse gases excluding land use, tonnes of CO2 equivalent per person';
export const RENEWABLE_SOURCE = 'World Bank WDI (SDG 7: IEA, IRENA, UN Statistics Division and others); share of final energy consumption';

export const ENERGY_MIX_SETUP_HELP =
  'The energy mix comes from Our World in Data\'s energy file, which the daily run downloads to this computer (npm run go -- daily, or Menu > Offline data > Download all country data). It has not been downloaded yet, or the download did not answer. The file is not shipped with the app: the Energy Institute, whose figures it uses, allows private, non-commercial use only.';
export const ENERGY_MIX_NOT_COVERED_HELP =
  'Our World in Data\'s energy file was read, but has no coal, oil and gas shares for this country. The Energy Institute lists about 80 countries one by one and groups the rest into regions. The app leaves it Missing rather than estimate it.';
export const CLIMATE_RISK_HELP =
  'Physical climate risk would come from the ND-GAIN Country Index (University of Notre Dame), which scores how exposed a country is to climate change and how ready it is to adapt. Its download page calls it free and open-access but states no licence, so the app does not read it until ND-GAIN says in writing that the scores may be used. It shows Missing rather than an estimate.';
