/**
 * The countries on the IMF and World Bank low-income debt sustainability list (DSA_LIST in
 * src/utils/lowIncomeDebt.ts) that were not yet built in, added on 25 November 2026 so the
 * smallest and poorest economies show in every country list, not only through Add a country.
 *
 * Names, regions and currency codes only. Like every built-in country, each figure is Missing until
 * a feed fills it; no focus line is written for them.
 */
import type { WatchlistItem } from '../types/council';

/** [ISO-3, name, region, ISO 4217 currency] */
const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['AFG', 'Afghanistan', 'South Asia', 'AFN'],
  ['BEN', 'Benin', 'Sub-Saharan Africa', 'XOF'],
  ['BTN', 'Bhutan', 'South Asia', 'BTN'],
  ['BFA', 'Burkina Faso', 'Sub-Saharan Africa', 'XOF'],
  ['BDI', 'Burundi', 'Sub-Saharan Africa', 'BIF'],
  ['CPV', 'Cabo Verde', 'Sub-Saharan Africa', 'CVE'],
  ['KHM', 'Cambodia', 'Asia-Pacific', 'KHR'],
  ['CMR', 'Cameroon', 'Sub-Saharan Africa', 'XAF'],
  ['CAF', 'Central African Republic', 'Sub-Saharan Africa', 'XAF'],
  ['TCD', 'Chad', 'Sub-Saharan Africa', 'XAF'],
  ['COM', 'Comoros', 'Sub-Saharan Africa', 'KMF'],
  ['COG', 'Republic of the Congo', 'Sub-Saharan Africa', 'XAF'],
  ['CIV', 'Côte d’Ivoire', 'Sub-Saharan Africa', 'XOF'],
  ['DJI', 'Djibouti', 'MENA', 'DJF'],
  ['DMA', 'Dominica', 'Latin America', 'XCD'],
  ['GMB', 'The Gambia', 'Sub-Saharan Africa', 'GMD'],
  ['GRD', 'Grenada', 'Latin America', 'XCD'],
  ['GIN', 'Guinea', 'Sub-Saharan Africa', 'GNF'],
  ['GNB', 'Guinea-Bissau', 'Sub-Saharan Africa', 'XOF'],
  ['HTI', 'Haiti', 'Latin America', 'HTG'],
  ['HND', 'Honduras', 'Latin America', 'HNL'],
  ['KIR', 'Kiribati', 'Asia-Pacific', 'AUD'],
  ['KGZ', 'Kyrgyzstan', 'Central Asia', 'KGS'],
  ['LAO', 'Laos', 'Asia-Pacific', 'LAK'],
  ['LSO', 'Lesotho', 'Sub-Saharan Africa', 'LSL'],
  ['LBR', 'Liberia', 'Sub-Saharan Africa', 'LRD'],
  ['MDG', 'Madagascar', 'Sub-Saharan Africa', 'MGA'],
  ['MWI', 'Malawi', 'Sub-Saharan Africa', 'MWK'],
  ['MDV', 'Maldives', 'South Asia', 'MVR'],
  ['MLI', 'Mali', 'Sub-Saharan Africa', 'XOF'],
  ['MHL', 'Marshall Islands', 'Asia-Pacific', 'USD'],
  ['MRT', 'Mauritania', 'Sub-Saharan Africa', 'MRU'],
  ['FSM', 'Micronesia', 'Asia-Pacific', 'USD'],
  ['MDA', 'Moldova', 'CEE / Europe', 'MDL'],
  ['MOZ', 'Mozambique', 'Sub-Saharan Africa', 'MZN'],
  ['NPL', 'Nepal', 'South Asia', 'NPR'],
  ['NIC', 'Nicaragua', 'Latin America', 'NIO'],
  ['NER', 'Niger', 'Sub-Saharan Africa', 'XOF'],
  ['PNG', 'Papua New Guinea', 'Asia-Pacific', 'PGK'],
  ['RWA', 'Rwanda', 'Sub-Saharan Africa', 'RWF'],
  ['WSM', 'Samoa', 'Asia-Pacific', 'WST'],
  ['STP', 'São Tomé and Príncipe', 'Sub-Saharan Africa', 'STN'],
  ['SEN', 'Senegal', 'Sub-Saharan Africa', 'XOF'],
  ['SLE', 'Sierra Leone', 'Sub-Saharan Africa', 'SLE'],
  ['SLB', 'Solomon Islands', 'Asia-Pacific', 'SBD'],
  ['SOM', 'Somalia', 'Sub-Saharan Africa', 'SOS'],
  ['SSD', 'South Sudan', 'Sub-Saharan Africa', 'SSP'],
  ['VCT', 'St Vincent and the Grenadines', 'Latin America', 'XCD'],
  ['SDN', 'Sudan', 'Sub-Saharan Africa', 'SDG'],
  ['TJK', 'Tajikistan', 'Central Asia', 'TJS'],
  ['TLS', 'Timor-Leste', 'Asia-Pacific', 'USD'],
  ['TGO', 'Togo', 'Sub-Saharan Africa', 'XOF'],
  ['TON', 'Tonga', 'Asia-Pacific', 'TOP'],
  ['TUV', 'Tuvalu', 'Asia-Pacific', 'AUD'],
  ['UZB', 'Uzbekistan', 'Central Asia', 'UZS'],
  ['VUT', 'Vanuatu', 'Asia-Pacific', 'VUV'],
  ['YEM', 'Yemen', 'MENA', 'YER'],
  ['ZMB', 'Zambia', 'Sub-Saharan Africa', 'ZMW'],
  ['ZWE', 'Zimbabwe', 'Sub-Saharan Africa', 'ZWG'],
];

export const LOW_INCOME_DEBT_ADDED_ISO3: readonly string[] = ROWS.map((r) => r[0]);

export function lowIncomeCatalogItems(): WatchlistItem[] {
  return ROWS.map(([iso3, countryName, region, currencyCode]) => ({
    iso3,
    countryName,
    region,
    currencyCode,
    focusTheme: '',
    yield10YPct: Number.NaN,
    cds5YBps: Number.NaN,
    debtToGdpPct: Number.NaN,
    fxReservesMonths: Number.NaN,
  }));
}
