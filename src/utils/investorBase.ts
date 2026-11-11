/**
 * Who holds government debt (G19), from the IMF Sovereign Debt Investor Base for Emerging Markets and
 * Developing Economies (Arslanalp and Tsuda), the workbook the IMF posts at
 * https://www.imf.org/-/media/websites/imf/imported-datasets/external/pubs/ft/wp/2014/data/wp1439.zip
 * and updates at the end of April and October.
 *
 * Read from the sheets "ExtendedDataset" (emerging markets) and "ExtendedDataset_LIC" (low-income
 * countries): yearly blocks, each headed by a label and the years 1989 onwards, one row per country.
 * The six holder blocks (foreign official, foreign banks, foreign nonbanks, domestic central bank,
 * domestic banks, domestic nonbanks) hold shares of general government debt in the posted workbook
 * (version of 6 November 2026), although their headers say billions of US dollars; when a block holds
 * amounts instead, they are divided by the total. "…" means no estimate. The latest year is marked
 * preliminary by the workbook.
 *
 * Terms: the workbook and its page state none, so the IMF's general data terms apply (publish with
 * credit; commercial reuse needs the IMF's permission). The file is not shipped with the app; you put
 * it in data/local/imf-investor-base/. Pure, browser-safe.
 */

export const INVESTOR_BASE_URL = 'https://www.imf.org/-/media/websites/imf/imported-datasets/external/pubs/ft/wp/2014/data/wp1439.zip';
export const INVESTOR_BASE_SOURCE = 'IMF, Sovereign Debt Investor Base for Emerging Markets and Developing Economies (Arslanalp and Tsuda)';
export const INVESTOR_BASE_CITATION = 'Serkan Arslanalp and Takahiro Tsuda (2014), "Tracking Global Demand for Emerging Market Sovereign Debt", IMF Working Paper WP/14/39, Washington, DC; dataset updated by the authors.';

/** The workbook's country names, as written there, to ISO3. */
export const INVESTOR_BASE_ISO3: Record<string, string> = {
  "Argentina": 'ARG', "Brazil": 'BRA', "Bulgaria": 'BGR', "Chile": 'CHL', "China": 'CHN', "Colombia": 'COL',
  "Egypt": 'EGY', "Hungary": 'HUN', "India": 'IND', "Indonesia": 'IDN', "Malaysia": 'MYS', "Mexico": 'MEX',
  "Peru": 'PER', "Philippines": 'PHL', "Poland": 'POL', "Romania": 'ROU', "Russia": 'RUS', "South Africa": 'ZAF',
  "Thailand": 'THA', "Turkey": 'TUR', "Ukraine": 'UKR', "Uruguay": 'URY', "Albania": 'ALB', "Algeria": 'DZA',
  "Angola": 'AGO', "Antigua and Barbuda": 'ATG', "Armenia": 'ARM', "Azerbaijan": 'AZE', "Bahamas, The": 'BHS',
  "Bahrain": 'BHR', "Barbados": 'BRB', "Belarus": 'BLR', "Belize": 'BLZ', "Bolivia": 'BOL',
  "Bosnia and Herzegovina": 'BIH', "Botswana": 'BWA', "Brunei Darussalam": 'BRN', "Costa Rica": 'CRI', "Croatia": 'HRV',
  "Dominican Republic": 'DOM', "Ecuador": 'ECU', "El Salvador": 'SLV', "Equatorial Guinea": 'GNQ', "Eswatini": 'SWZ',
  "Fiji": 'FJI', "Gabon": 'GAB', "Georgia": 'GEO', "Guatemala": 'GTM', "Iran": 'IRN', "Iraq": 'IRQ', "Jamaica": 'JAM',
  "Jordan": 'JOR', "Kazakhstan": 'KAZ', "Kosovo": 'XKX', "Kuwait": 'KWT', "Lebanon": 'LBN', "Libya": 'LBY',
  "Mauritius": 'MUS', "Mongolia": 'MNG', "Montenegro": 'MNE', "Morocco": 'MAR', "Namibia": 'NAM', "Nauru": 'NRU',
  "Nigeria": 'NGA', "North Macedonia, Republic of": 'MKD', "Oman": 'OMN', "Pakistan": 'PAK', "Palau": 'PLW',
  "Panama": 'PAN', "Paraguay": 'PRY', "Qatar": 'QAT', "Saudi Arabia": 'SAU', "Serbia": 'SRB', "Seychelles": 'SYC',
  "Sri Lanka": 'LKA', "St. Kitts and Nevis": 'KNA', "St. Lucia": 'LCA', "Suriname": 'SUR', "Syria": 'SYR',
  "Trinidad and Tobago": 'TTO', "Tunisia": 'TUN', "Turkmenistan": 'TKM', "United Arab Emirates": 'ARE',
  "Venezuela": 'VEN', "Vietnam": 'VNM', "Afghanistan": 'AFG', "Bangladesh": 'BGD', "Benin": 'BEN', "Bhutan": 'BTN',
  "Burkina Faso": 'BFA', "Burundi": 'BDI', "Cambodia": 'KHM', "Cameroon": 'CMR', "Cabo Verde": 'CPV',
  "Central African Republic": 'CAF', "Chad": 'TCD', "Comoros": 'COM', "Congo, Rep": 'COG', "Congo, Dem. Rep.": 'COD',
  "Côte d'Ivoire": 'CIV', "Djibouti": 'DJI', "Dominica": 'DMA', "Eritrea": 'ERI', "Ethiopia": 'ETH',
  "Gambia, The": 'GMB', "Ghana": 'GHA', "Grenada": 'GRD', "Guinea": 'GIN', "Guinea-Bissau": 'GNB', "Guyana": 'GUY',
  "Haiti": 'HTI', "Honduras": 'HND', "Kenya": 'KEN', "Kiribati": 'KIR', "Kyrgyz Republic": 'KGZ', "Lao PDR": 'LAO',
  "Lesotho": 'LSO', "Liberia": 'LBR', "Madagascar": 'MDG', "Malawi": 'MWI', "Maldives": 'MDV', "Mali": 'MLI',
  "Marshall Islands": 'MHL', "Mauritania": 'MRT', "Micronesia": 'FSM', "Moldova": 'MDA', "Mozambique": 'MOZ',
  "Myanmar": 'MMR', "Nepal": 'NPL', "Nicaragua": 'NIC', "Niger": 'NER', "Papua New Guinea": 'PNG', "Rwanda": 'RWA',
  "Samoa": 'WSM', "São Tomé and Príncipe": 'STP', "Senegal": 'SEN', "Sierra Leone": 'SLE', "Solomon Islands": 'SLB',
  "Somalia": 'SOM', "South Sudan": 'SSD', "St. Vincent and the Grenadines": 'VCT', "Sudan": 'SDN', "Tajikistan": 'TJK',
  "Tanzania": 'TZA', "Timor-Leste": 'TLS', "Togo": 'TGO', "Tonga": 'TON', "Tuvalu": 'TUV', "Uganda": 'UGA',
  "Uzbekistan": 'UZB', "Vanuatu": 'VUT', "Yemen": 'YEM', "Zambia": 'ZMB', "Zimbabwe": 'ZWE',
};

export type HolderKey = 'foreignOfficial' | 'foreignBanks' | 'foreignNonbanks' | 'domesticCentralBank' | 'domesticBanks' | 'domesticNonbanks';
const BLOCKS: Array<[RegExp, HolderKey | 'total']> = [
  [/^Total \(/i, 'total'],
  [/^Foreign Official \(/i, 'foreignOfficial'],
  [/^Foreign Banks \(/i, 'foreignBanks'],
  [/^Foreign Nonbanks \(/i, 'foreignNonbanks'],
  [/^Domestic Central Bank \(/i, 'domesticCentralBank'],
  [/^Domestic Banks \(/i, 'domesticBanks'],
  [/^Domestic Nonbanks \(/i, 'domesticNonbanks'],
];
export const HOLDERS: HolderKey[] = ['foreignOfficial', 'foreignBanks', 'foreignNonbanks', 'domesticCentralBank', 'domesticBanks', 'domesticNonbanks'];

export interface InvestorBase {
  year: string;
  totalUsdBn: number;
  /** Shares of general government debt, % (0-100), each holder. */
  pct: Record<HolderKey, number>;
}

export interface InvestorBaseTable {
  countries: Map<string, InvestorBase>;
  /** "November 6, 2026", from the ReadMe sheet, when found. */
  version?: string;
  /** The last year in the file (marked preliminary there). */
  lastYear: number;
  file: string;
}

const num = (s: string | undefined): number | null => {
  const t = (s ?? '').trim();
  if (!t || t === '…' || t === '...') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

type Blocks = Partial<Record<HolderKey | 'total', Map<string, Map<string, number>>>>;

/** One sheet's rows into blocks: block -> country -> year -> value. Null when no total block. */
export function sheetBlocks(rows: Iterable<string[]>): Blocks | null {
  const out: Blocks = {};
  let block: HolderKey | 'total' | null = null;
  let years: string[] = [];
  let first = true;
  for (const r of rows) {
    const head = (r[0] ?? '').trim();
    if (first) {
      first = false;
      if (!/^Total \(/i.test(head)) return null;
    }
    const y1 = (r[1] ?? '').trim();
    // A header has consecutive years (1989, 1990, ...); a country row could hold a round amount like 1899.
    if (/^(19|20)\d{2}$/.test(y1) && (r[2] ?? '').trim() === String(Number(y1) + 1)) {
      // A block header: label, then the years.
      block = BLOCKS.find(([re]) => re.test(head))?.[1] ?? null;
      years = r.map((c) => (/^\d{4}$/.test((c ?? '').trim()) ? c.trim() : ''));
      continue;
    }
    if (!block || !head || !INVESTOR_BASE_ISO3[head]) continue;
    const m = (out[block] ||= new Map()).set(INVESTOR_BASE_ISO3[head], new Map()).get(INVESTOR_BASE_ISO3[head])!;
    r.forEach((c, i) => {
      const v = num(c);
      if (i > 0 && years[i] && v !== null) m.set(years[i], v);
    });
  }
  return out.total ? out : null;
}

/** The latest year with a total and all six holders, for each country, in shares (%). */
export function investorBaseTable(sheets: Blocks[], file: string, version?: string): InvestorBaseTable | null {
  const countries = new Map<string, InvestorBase>();
  let lastYear = 0;
  for (const b of sheets) {
    for (const [iso, totals] of b.total || []) {
      for (const y of [...totals.keys()].sort().reverse()) {
        const total = totals.get(y)!;
        const raw = HOLDERS.map((h) => b[h]?.get(iso)?.get(y));
        if (total <= 0 || raw.some((v) => v === undefined || v < 0)) continue;
        const sum = (raw as number[]).reduce((a, v) => a + v, 0);
        // Shares (summing to about 1) or amounts (summing to about the total).
        const scale = Math.abs(sum - 1) < 0.05 ? 100 : Math.abs(sum - total) / total < 0.05 ? 100 / total : 0;
        if (!scale) continue;
        const pct = Object.fromEntries(HOLDERS.map((h, i) => [h, Number(((raw[i] as number) * scale).toFixed(1))])) as Record<HolderKey, number>;
        countries.set(iso, { year: y, totalUsdBn: Number(total.toFixed(1)), pct });
        lastYear = Math.max(lastYear, Number(y));
        break;
      }
    }
  }
  return countries.size ? { countries, lastYear, file, ...(version ? { version } : {}) } : null;
}

/** "November 6, 2026" from the ReadMe sheet's "(This version: November 6, 2026)". */
export function versionFromRows(rows: Iterable<string[]>): string | undefined {
  for (const r of rows) for (const c of r) {
    const m = /This version:\s*([^)]+)\)/i.exec(c || '');
    if (m) return m[1].trim();
  }
  return undefined;
}

const p = (v: number) => `${v.toFixed(0)}%`;

/** "Foreign 11% (official 2%, banks 0%, other investors 9%); at home: central bank 24%, banks 25%, other investors 40% (2025, preliminary)". */
export function investorBaseValue(b: InvestorBase, lastYear: number): string {
  const f = b.pct.foreignOfficial + b.pct.foreignBanks + b.pct.foreignNonbanks;
  return `Foreign ${p(f)} (official ${p(b.pct.foreignOfficial)}, banks ${p(b.pct.foreignBanks)}, other investors ${p(b.pct.foreignNonbanks)}); at home: central bank ${p(b.pct.domesticCentralBank)}, banks ${p(b.pct.domesticBanks)}, other investors ${p(b.pct.domesticNonbanks)} (${b.year}${Number(b.year) === lastYear ? ', preliminary' : ''})`;
}

export const foreignShare = (b: InvestorBase): number => b.pct.foreignOfficial + b.pct.foreignBanks + b.pct.foreignNonbanks;

export const INVESTOR_BASE_SETUP_HELP = `Who holds a government's debt comes from the IMF Sovereign Debt Investor Base for Emerging Markets and Developing Economies (free; the IMF's data terms allow showing it with credit, commercial use needs the IMF's permission). Download the workbook (wp1439.zip) from ${INVESTOR_BASE_URL} and put it, or the .xlsx inside, in data/local/imf-investor-base/. The app reads it on this computer; nothing is sent anywhere.`;

/** What the snapshot carries for one country. */
export interface InvestorBaseReading {
  state: 'found' | 'notCovered' | 'noFile' | 'unreadable';
  holders?: InvestorBase;
  lastYear?: number;
  version?: string;
  /** Why the file did not read, when it did not. */
  reason?: string;
}

export function investorBaseReading(iso3: string, data: { table: InvestorBaseTable | null; skipped: Array<{ file: string; reason: string }> } | null): InvestorBaseReading {
  if (!data) return { state: 'noFile' };
  if (!data.table) return { state: 'unreadable', reason: data.skipped.map((x) => `${x.file}: ${x.reason}`).join('; ') };
  const holders = data.table.countries.get(iso3);
  const meta = { lastYear: data.table.lastYear, ...(data.table.version ? { version: data.table.version } : {}) };
  return holders ? { state: 'found', holders, ...meta } : { state: 'notCovered', ...meta };
}

export function investorBaseSource(r: InvestorBaseReading): string {
  return `${INVESTOR_BASE_SOURCE}${r.version ? `, version of ${r.version}` : ''}; shares of general government debt`;
}
