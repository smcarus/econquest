/**
 * Quest series (Quests step 2): the series a Quest may be settled on, and why.
 *
 * A Quest names a series by the id the app already uses for it in Country Research > History & data
 * (src/utils/seriesHistory.ts) plus a country (ISO3, or WLD for a world series such as Brent). Only
 * the series listed here can settle a Quest, and only because their source's row in the licence
 * register (src/data/dataLicences.ts) allows free, non-commercial sharing of the figures with
 * credit. Anything else (OECD inflation, FRED yields, market prices) can be shown in a Quest's brief
 * but cannot decide its result.
 *
 * Browser-safe, pure.
 */
import { DATA_LICENCES } from '../data/dataLicences';
import { CBPOL_AREA, CBPOL_NOT_COVERED } from './bisPolicyRates';
import { CFTC_CURRENCY_CODES } from './cftcPositioning';

export type QuestSeriesFreq = 'daily' | 'weekly' | 'annual';

export interface QuestSeriesDef {
  id: string;
  label: string;
  unit: string;
  freq: QuestSeriesFreq;
  /** Row id in the licence register. */
  licence: string;
  source: string;
  /** World series take country WLD; country series take an ISO3 code. */
  world?: boolean;
  /** Countries the source covers; undefined = any ISO3 code (checked again when the Quest settles). */
  countries?: string[];
  /** Countries the source does not cover. */
  notCovered?: string[];
  about: string;
}

const bisCountries = Object.keys(CBPOL_AREA).filter((c) => !CBPOL_NOT_COVERED.has(c));
const cftcCountries = Object.keys(CFTC_CURRENCY_CODES);

const imfAbout = 'IMF World Economic Outlook. An annual value is settled as the IMF published it in the first edition read on or after the settle date; later revisions are noted, never applied.';
const wbAbout = 'World Bank World Development Indicators. An annual value is settled as first read on or after the settle date; later revisions are noted, never applied.';

export const QUEST_SERIES: QuestSeriesDef[] = [
  { id: 'policy_rate', label: 'Central bank policy rate', unit: '%', freq: 'daily', licence: 'bis', source: 'BIS central bank policy rates (daily)', countries: bisCountries, about: 'Settled on the first published daily value on or after the date.' },
  { id: 'fx_per_usd', label: 'Exchange rate', unit: 'per USD', freq: 'daily', licence: 'ecb', source: 'ECB euro reference rates, crossed to the US dollar', notCovered: ['USA'], about: 'Units of the currency per US dollar; higher = weaker currency. Settled on the first ECB fixing on or after the date.' },
  { id: 'cftc_lev_net', label: 'Leveraged funds net position', unit: '% of open interest', freq: 'weekly', licence: 'cftc', source: 'CFTC Traders in Financial Futures', countries: cftcCountries, about: 'Settled on the first weekly report dated on or after the date.' },
  { id: 'commodity_eia_rbrte', label: 'Brent crude', unit: '$/bbl', freq: 'daily', licence: 'eia', source: 'US EIA daily spot prices', world: true, about: 'Settled on the first daily price on or after the date.' },
  { id: 'commodity_eia_rwtc', label: 'WTI crude', unit: '$/bbl', freq: 'daily', licence: 'eia', source: 'US EIA daily spot prices', world: true, about: 'Settled on the first daily price on or after the date.' },
  { id: 'debt_gdp', label: 'Government debt', unit: '% of GDP', freq: 'annual', licence: 'imf', source: 'IMF WEO', about: imfAbout },
  { id: 'gdp_growth', label: 'Real GDP growth', unit: '%', freq: 'annual', licence: 'imf', source: 'IMF WEO', about: imfAbout },
  { id: 'cpi_imf', label: 'Inflation (IMF WEO)', unit: '%', freq: 'annual', licence: 'imf', source: 'IMF WEO', about: imfAbout },
  { id: 'unemployment', label: 'Unemployment rate', unit: '%', freq: 'annual', licence: 'imf', source: 'IMF WEO', about: imfAbout },
  { id: 'primary_balance', label: 'Primary balance', unit: '% of GDP', freq: 'annual', licence: 'imf', source: 'IMF Fiscal Monitor', about: imfAbout },
  { id: 'reserves_months', label: 'Reserves', unit: 'months of imports', freq: 'annual', licence: 'worldbank', source: 'World Bank WDI', about: wbAbout },
  { id: 'reserves_usd', label: 'Total reserves incl. gold', unit: 'USD bn', freq: 'annual', licence: 'worldbank', source: 'World Bank WDI', about: wbAbout },
  { id: 'current_account', label: 'Current account', unit: '% of GDP', freq: 'annual', licence: 'worldbank', source: 'World Bank WDI', about: wbAbout },
  { id: 'external_debt', label: 'External debt', unit: '% of GNI', freq: 'annual', licence: 'worldbank', source: 'World Bank WDI', about: wbAbout },
];

export function questSeriesDef(id: string): QuestSeriesDef | undefined {
  return QUEST_SERIES.find((s) => s.id === id);
}

/** Why this series cannot settle a Quest for this country, or null when it can. */
export function seriesProblem(country: string, seriesId: string): string | null {
  const def = questSeriesDef(seriesId);
  if (!def) return `series "${seriesId}" cannot settle a Quest (not in src/utils/questSeries.ts)`;
  const row = DATA_LICENCES.find((r) => r.id === def.licence);
  if (!row) return `series "${seriesId}" names licence row "${def.licence}", which is not in the register`;
  if (row.share !== 'allowed') return `${row.name} does not allow free sharing of its figures (register: ${row.share}), so it cannot settle a Quest`;
  if (def.world) return country === 'WLD' ? null : `series "${seriesId}" is a world series: use country WLD`;
  if (!/^[A-Z]{3}$/.test(country) || country === 'WLD') return `country "${country}" must be an ISO3 code for series "${seriesId}"`;
  if (def.countries && !def.countries.includes(country)) return `${def.source} does not cover ${country}`;
  if (def.notCovered?.includes(country)) return `${def.source} does not cover ${country}`;
  return null;
}
