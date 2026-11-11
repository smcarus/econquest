/**
 * Low-income country debt (roadmap U1): what matters most for the poorest borrowers.
 *
 * - Risk of debt distress (IMF/World Bank Debt Sustainability Framework for low-income countries):
 *   low, moderate, high or in debt distress, from the IMF's published list of LIC DSAs, each with the
 *   date of the rating, typed by hand from the list (DSA_LIST below). The list states no terms of use;
 *   the ratings are facts quoted with the source and date.
 * - DSSI: whether the country took part in the G20 Debt Service Suspension Initiative (May 2020 to
 *   December 2021), typed by hand from the World Bank's DSSI page (DSSI_LIST below).
 * - Common Framework: whether the country applied for a debt treatment under the G20 Common
 *   Framework, typed by hand from the Paris Club's page (COMMON_FRAMEWORK below).
 * - Official lending from China: loan commitments by China's government and state lenders, added up
 *   from AidData's Global Chinese Development Finance Dataset (ODC-By), which the user downloads into
 *   data/local/aiddata/ (src/utils/aiddataStore.ts). Nothing is fetched.
 *
 * Hand-typed rows are facts with their source and the day they were read, like the official calendar
 * (src/data/officialCalendar.ts). No figure is estimated or filled in. Browser-safe: no fs, no network.
 */

export type DistressRating = 'low' | 'moderate' | 'high' | 'in_distress';

export const DISTRESS_LABEL: Record<DistressRating, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  in_distress: 'In debt distress',
};

export interface TypedFact {
  /** Where it was read. */
  source: string;
  url: string;
  /** Day the source was read (YYYY-MM-DD). */
  read: string;
}

export interface DsaRow {
  iso3: string;
  /** Risk of external debt distress, per the most recent published DSA. */
  rating: DistressRating;
  /** Publication date of that DSA (YYYY-MM-DD). */
  ratedOn: string;
  /** Debt sustainability assessment, given only for countries at high risk or in debt distress. */
  assessment?: 'sustainable' | 'unsustainable';
  /** In debt distress because of unresolved arrears to external creditors (the list's note 4/). */
  arrears?: true;
  /** In a debt restructuring process in the context of an IMF programme (note 5/). */
  restructuring?: true;
}

/** The list as published, its "as of" date, and the day it was read. */
export const DSA_SOURCE: TypedFact & { asOf: string } = {
  source: 'IMF, List of IMF/WBG LIC DSAs for PRGT-Eligible Countries',
  url: 'https://www.imf.org/external/Pubs/ft/dsa/DSAlist.pdf',
  read: '2026-11-11',
  asOf: '2026-09-30',
};

/**
 * Typed from the list as of 30 September 2026 (read 2026-11-11): 67 countries with a published DSA.
 * Eritrea is on the list with no published DSA, so it has no row. The list's own note counts 26 at
 * moderate and 9 at low risk; its table shows 27 and 8, and the table is what is typed here.
 */
export const DSA_LIST: DsaRow[] = [
  { iso3: 'AFG', rating: 'high', ratedOn: '2021-06-28', assessment: 'sustainable' }, // Afghanistan
  { iso3: 'BGD', rating: 'moderate', ratedOn: '2026-01-30' }, // Bangladesh
  { iso3: 'BEN', rating: 'moderate', ratedOn: '2026-04-30' }, // Benin
  { iso3: 'BTN', rating: 'moderate', ratedOn: '2026-01-27' }, // Bhutan
  { iso3: 'BFA', rating: 'moderate', ratedOn: '2026-07-28' }, // Burkina Faso
  { iso3: 'BDI', rating: 'high', ratedOn: '2026-06-23', assessment: 'sustainable' }, // Burundi
  { iso3: 'KHM', rating: 'low', ratedOn: '2026-09-28' }, // Cambodia
  { iso3: 'CMR', rating: 'high', ratedOn: '2026-04-03', assessment: 'sustainable' }, // Cameroon
  { iso3: 'CPV', rating: 'moderate', ratedOn: '2026-02-26' }, // Cabo Verde
  { iso3: 'CAF', rating: 'high', ratedOn: '2025-06-23', assessment: 'sustainable' }, // Central African Republic
  { iso3: 'TCD', rating: 'high', ratedOn: '2025-08-13', assessment: 'sustainable' }, // Chad
  { iso3: 'COM', rating: 'high', ratedOn: '2026-02-19', assessment: 'sustainable' }, // Comoros
  { iso3: 'COD', rating: 'moderate', ratedOn: '2026-09-08' }, // Congo, Democratic Republic of
  { iso3: 'COG', rating: 'in_distress', ratedOn: '2026-04-03', assessment: 'sustainable', arrears: true }, // Congo, Republic of
  { iso3: 'CIV', rating: 'low', ratedOn: '2026-07-09' }, // Côte d'Ivoire
  { iso3: 'DJI', rating: 'in_distress', ratedOn: '2025-09-22', assessment: 'unsustainable' }, // Djibouti
  { iso3: 'DMA', rating: 'moderate', ratedOn: '2026-06-02' }, // Dominica
  { iso3: 'ETH', rating: 'in_distress', ratedOn: '2026-07-13', assessment: 'unsustainable', restructuring: true }, // Ethiopia
  { iso3: 'GMB', rating: 'high', ratedOn: '2026-07-14', assessment: 'sustainable' }, // Gambia, The
  { iso3: 'GHA', rating: 'moderate', ratedOn: '2026-08-04' }, // Ghana
  { iso3: 'GRD', rating: 'in_distress', ratedOn: '2025-02-04', assessment: 'sustainable', arrears: true }, // Grenada
  { iso3: 'GIN', rating: 'moderate', ratedOn: '2024-05-17' }, // Guinea
  { iso3: 'GNB', rating: 'high', ratedOn: '2026-06-17', assessment: 'sustainable' }, // Guinea-Bissau
  { iso3: 'HTI', rating: 'high', ratedOn: '2025-12-16', assessment: 'sustainable' }, // Haiti
  { iso3: 'HND', rating: 'low', ratedOn: '2026-06-30' }, // Honduras
  { iso3: 'KEN', rating: 'high', ratedOn: '2024-11-01', assessment: 'sustainable' }, // Kenya
  { iso3: 'KIR', rating: 'high', ratedOn: '2026-05-15', assessment: 'sustainable' }, // Kiribati
  { iso3: 'KGZ', rating: 'moderate', ratedOn: '2026-07-02' }, // Kyrgyz Republic
  { iso3: 'LAO', rating: 'in_distress', ratedOn: '2026-02-20', assessment: 'unsustainable' }, // Lao P.D.R.
  { iso3: 'LSO', rating: 'moderate', ratedOn: '2025-09-18' }, // Lesotho
  { iso3: 'LBR', rating: 'moderate', ratedOn: '2026-05-13' }, // Liberia
  { iso3: 'MDG', rating: 'moderate', ratedOn: '2025-03-21' }, // Madagascar
  { iso3: 'MWI', rating: 'in_distress', ratedOn: '2025-08-06', assessment: 'unsustainable', restructuring: true }, // Malawi
  { iso3: 'MDV', rating: 'high', ratedOn: '2024-05-13', assessment: 'unsustainable' }, // Maldives
  { iso3: 'MLI', rating: 'moderate', ratedOn: '2025-09-10' }, // Mali
  { iso3: 'MHL', rating: 'moderate', ratedOn: '2025-12-04' }, // Marshall Islands
  { iso3: 'MRT', rating: 'moderate', ratedOn: '2026-06-29' }, // Mauritania
  { iso3: 'FSM', rating: 'moderate', ratedOn: '2026-05-05' }, // Micronesia
  { iso3: 'MDA', rating: 'low', ratedOn: '2026-03-05' }, // Moldova
  { iso3: 'MOZ', rating: 'high', ratedOn: '2026-02-19', assessment: 'unsustainable' }, // Mozambique
  { iso3: 'MMR', rating: 'low', ratedOn: '2021-01-28' }, // Myanmar
  { iso3: 'NPL', rating: 'low', ratedOn: '2026-06-08' }, // Nepal
  { iso3: 'NIC', rating: 'moderate', ratedOn: '2026-01-26' }, // Nicaragua
  { iso3: 'NER', rating: 'high', ratedOn: '2026-03-31', assessment: 'sustainable' }, // Niger
  { iso3: 'PNG', rating: 'high', ratedOn: '2026-06-10', assessment: 'sustainable' }, // Papua New Guinea
  { iso3: 'RWA', rating: 'moderate', ratedOn: '2026-06-12' }, // Rwanda
  { iso3: 'WSM', rating: 'moderate', ratedOn: '2026-09-21' }, // Samoa
  { iso3: 'STP', rating: 'in_distress', ratedOn: '2025-12-23', assessment: 'sustainable', arrears: true }, // São Tomé and Príncipe
  { iso3: 'SEN', rating: 'moderate', ratedOn: '2023-07-07' }, // Senegal
  { iso3: 'SLE', rating: 'high', ratedOn: '2026-07-07', assessment: 'sustainable' }, // Sierra Leone
  { iso3: 'SLB', rating: 'low', ratedOn: '2026-07-07' }, // Solomon Islands
  { iso3: 'SOM', rating: 'moderate', ratedOn: '2025-12-16' }, // Somalia
  { iso3: 'SSD', rating: 'high', ratedOn: '2024-06-10', assessment: 'sustainable' }, // South Sudan
  { iso3: 'VCT', rating: 'high', ratedOn: '2026-07-17', assessment: 'unsustainable' }, // St. Vincent and the Grenadines
  { iso3: 'SDN', rating: 'in_distress', ratedOn: '2021-07-01', assessment: 'sustainable', arrears: true }, // Sudan
  { iso3: 'TJK', rating: 'high', ratedOn: '2025-07-08', assessment: 'sustainable' }, // Tajikistan
  { iso3: 'TZA', rating: 'moderate', ratedOn: '2025-07-03' }, // Tanzania
  { iso3: 'TLS', rating: 'moderate', ratedOn: '2025-09-26' }, // Timor Leste
  { iso3: 'TGO', rating: 'moderate', ratedOn: '2026-07-22' }, // Togo
  { iso3: 'TON', rating: 'high', ratedOn: '2025-11-10', assessment: 'sustainable' }, // Tonga
  { iso3: 'TUV', rating: 'high', ratedOn: '2025-09-12', assessment: 'sustainable' }, // Tuvalu
  { iso3: 'UGA', rating: 'moderate', ratedOn: '2026-08-06' }, // Uganda
  { iso3: 'UZB', rating: 'low', ratedOn: '2026-06-23' }, // Uzbekistan
  { iso3: 'VUT', rating: 'moderate', ratedOn: '2025-09-25' }, // Vanuatu
  { iso3: 'YEM', rating: 'in_distress', ratedOn: '2026-04-03', assessment: 'unsustainable' }, // Yemen, Republic of
  { iso3: 'ZMB', rating: 'high', ratedOn: '2026-02-02', assessment: 'sustainable' }, // Zambia
  { iso3: 'ZWE', rating: 'in_distress', ratedOn: '2025-10-02', assessment: 'unsustainable' }, // Zimbabwe
];
export const DSA_NO_PUBLISHED = ['ERI'];

/** "High (DSA published 2026-02-02); debt judged sustainable". */
export function dsaValue(d: DsaRow): string {
  const notes = [
    d.assessment ? `debt judged ${d.assessment}` : '',
    d.arrears ? 'because of unresolved arrears to external creditors' : '',
    d.restructuring ? 'in a debt restructuring with an IMF programme' : '',
  ].filter(Boolean);
  return `${DISTRESS_LABEL[d.rating]} (DSA published ${d.ratedOn})${notes.length ? `; ${notes.join('; ')}` : ''}`;
}

export const dsaSource = () => `${DSA_SOURCE.source}, as of ${DSA_SOURCE.asOf}, read ${DSA_SOURCE.read}`;
export const DSA_NOT_READ =
  'The rating comes from the IMF\'s published list of debt sustainability analyses for low-income countries. The list has not been typed in, so no rating is shown rather than one typed from memory.';

/**
 * DSSI participants. LATER: set aside on 2026-11-11 (maintainer's call); type the 48 countries from the
 * World Bank page's country table, with its read date, when it is next opened in a browser. Until
 * then every country reads Missing with DSSI_NOT_READ.
 */
export const DSSI_LIST: Array<{ iso3: string } & TypedFact> = [];
export const DSSI_SOURCE: TypedFact = { source: 'World Bank, COVID-19 Debt Service Suspension Initiative', url: 'https://www.worldbank.org/en/brief/2022/03/10/covid-19-debt-service-suspension-initiative', read: '' };
export const DSSI_NOT_READ =
  'The World Bank\'s page lists the 48 countries (of 73 eligible) that took part in the Debt Service Suspension Initiative, which paused official debt payments from May 2020 to December 2021. Its country table has not been typed in yet, so no answer is shown rather than one from memory.';

/** The Paris Club's page, read 2026-11-11: "As of 2024, four countries have applied to the Common Framework for a debt treatment: Tchad, Zambia, Ethiopia and Ghana." */
export const COMMON_FRAMEWORK_SOURCE: TypedFact = { source: 'Paris Club, Common Framework', url: 'https://clubdeparis.org/en/communications/page/common-framework', read: '2026-11-11' };
export const COMMON_FRAMEWORK_AS_OF = '2024';
export const COMMON_FRAMEWORK: string[] = ['TCD', 'ZMB', 'ETH', 'GHA'];

/* ------------------------------------------------------------------------------------------
 * AidData: official lending from China
 * ------------------------------------------------------------------------------------------ */

export const AIDDATA_SOURCE = 'AidData, Global Chinese Development Finance Dataset, Version 3.0 (ODC-By)';
export const AIDDATA_CITATION =
  'Custer, S., Dreher, A., Elston, T.B., et al. 2023. Tracking Chinese Development Finance: An Application of AidData\'s TUFF 3.0 Methodology. Williamsburg, VA: AidData at William & Mary.';
/** Years added up for the "recent" figure, counting back from the newest commitment year in the file. */
export const AIDDATA_RECENT_YEARS = 5;

export interface ChinaLending {
  /** Loan commitments added up, US$ billions. */
  totalUsdBn: number;
  /** Over the last AIDDATA_RECENT_YEARS years of the file. */
  recentUsdBn: number;
  recentFrom: number;
  loans: number;
  firstYear: number;
  lastYear: number;
  /** "constant 2021 US dollars" or "current US dollars", whichever column the file had. */
  dollars: string;
  file: string;
}

export interface AiddataTable {
  /** By ISO3. */
  countries: Map<string, ChinaLending>;
  /** Newest commitment year in the file. */
  fileLastYear: number;
  file: string;
  modified: string;
}

export interface AiddataData {
  table: AiddataTable | null;
  /** Files looked at and why each was not used. */
  skipped: Array<{ file: string; reason: string }>;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Finds the columns by their names in the GCDF file; null when a needed one is missing. */
export function aiddataColumns(header: string[]): { iso3: number; year: number; amount: number; dollars: string; flow: number; recommended: number } | null {
  const h = header.map(norm);
  const find = (re: RegExp) => h.findIndex((x) => re.test(x));
  const iso3 = find(/^recipient iso-?3$/);
  const year = find(/^commitment year$/);
  let amount = find(/^amount \(constant usd ?2021\)$|^amount \(constant usd\)/);
  let dollars = 'constant 2021 US dollars';
  if (amount < 0) {
    amount = find(/^amount \(nominal usd\)$|^amount \(current usd\)$/);
    dollars = 'current US dollars';
  }
  const flow = find(/^flow type$/);
  if (iso3 < 0 || year < 0 || amount < 0 || flow < 0) return null;
  return { iso3, year, amount, dollars, flow, recommended: find(/^recommended for aggregates$/) };
}

/** A loan or export credit (not a grant, debt relief, technical help or in-kind support). */
export const isLoanFlow = (flow: string) => /loan|credit/i.test(flow) && !/forgiv|resched|grant/i.test(flow);

/**
 * Adds up loan commitments per recipient from the rows of the GCDF table (first row the header).
 * Rows AidData marks as not recommended for aggregates are left out, as AidData advises. Returns
 * null with the reason when the columns are not there.
 */
export function aiddataTable(rows: Iterable<string[]>, file: string, modified: string): { table: AiddataTable } | { reason: string } {
  let cols: ReturnType<typeof aiddataColumns> = null;
  let headerSeen = false;
  const sums = new Map<string, { total: number; loans: number; first: number; last: number; byYear: Map<number, number> }>();
  let fileLast = 0;
  for (const r of rows) {
    if (!cols) {
      // The header may sit below a title row or two.
      cols = aiddataColumns(r);
      if (cols) headerSeen = true;
      continue;
    }
    if (cols.recommended >= 0 && !/^yes$/i.test(String(r[cols.recommended] ?? '').trim())) continue;
    if (!isLoanFlow(String(r[cols.flow] ?? ''))) continue;
    const iso = String(r[cols.iso3] ?? '').trim().toUpperCase();
    const year = Number(String(r[cols.year] ?? '').trim());
    const amt = Number(String(r[cols.amount] ?? '').replace(/[,$\s]/g, ''));
    if (!/^[A-Z]{3}$/.test(iso) || !Number.isInteger(year) || year < 1990 || year > 2100 || !Number.isFinite(amt) || amt <= 0) continue;
    fileLast = Math.max(fileLast, year);
    const s = sums.get(iso) || { total: 0, loans: 0, first: year, last: year, byYear: new Map() };
    s.total += amt;
    s.loans += 1;
    s.first = Math.min(s.first, year);
    s.last = Math.max(s.last, year);
    s.byYear.set(year, (s.byYear.get(year) || 0) + amt);
    sums.set(iso, s);
  }
  if (!headerSeen) return { reason: 'the columns "Recipient ISO-3", "Commitment Year", "Flow Type" and an "Amount" in US dollars were not found' };
  if (!sums.size) return { reason: 'no loan rows recommended for aggregates were found' };
  const recentFrom = fileLast - AIDDATA_RECENT_YEARS + 1;
  const countries = new Map<string, ChinaLending>();
  for (const [iso, s] of sums) {
    let recent = 0;
    for (const [y, v] of s.byYear) if (y >= recentFrom) recent += v;
    countries.set(iso, {
      totalUsdBn: s.total / 1e9,
      recentUsdBn: recent / 1e9,
      recentFrom,
      loans: s.loans,
      firstYear: s.first,
      lastYear: s.last,
      dollars: cols!.dollars,
      file,
    });
  }
  return { table: { countries, fileLastYear: fileLast, file, modified } };
}

export const AIDDATA_SETUP_HELP =
  'Official lending from China comes from AidData\'s Global Chinese Development Finance Dataset (free, ODC-By licence). Download the project-level file (version 3.0, .xlsx or .csv) from aiddata.org and put it, or the .zip it comes in, in data/local/aiddata/. The app adds up the loan commitments on this computer; nothing is sent anywhere.';

/* ------------------------------------------------------------------------------------------
 * The reading for one country
 * ------------------------------------------------------------------------------------------ */

export interface LicDebtReading {
  dsa?: DsaRow;
  /** On the list but with no published DSA (Eritrea). */
  dsaNone?: boolean;
  /** True when the DSA list has been typed in, so a country not on it is known not to be on it. */
  dsaListRead: boolean;
  dssi?: boolean;
  dssiListRead: boolean;
  commonFramework: boolean;
  china?: ChinaLending & { fileLastYear: number };
  /** Why the China figure is missing: no file, or the file could not be read. */
  chinaMissing?: { short: string; help: string };
}

export function licDebtReading(iso3: string, aid: AiddataData | null): LicDebtReading {
  const iso = iso3.toUpperCase();
  const out: LicDebtReading = {
    dsaListRead: DSA_LIST.length > 0,
    dssiListRead: DSSI_LIST.length > 0,
    commonFramework: COMMON_FRAMEWORK.includes(iso),
  };
  const dsa = DSA_LIST.find((r) => r.iso3 === iso);
  if (dsa) out.dsa = dsa;
  else if (DSA_NO_PUBLISHED.includes(iso)) out.dsaNone = true;
  if (out.dssiListRead) out.dssi = DSSI_LIST.some((r) => r.iso3 === iso);
  if (aid?.table) {
    const c = aid.table.countries.get(iso);
    if (c) out.china = { ...c, fileLastYear: aid.table.fileLastYear };
    else out.chinaMissing = { short: 'No loans from China in the AidData file', help: `AidData records no loan commitments from China's government or state lenders to this country between the first and last years of the file (to ${aid.table.fileLastYear}). That is a record of none found, not a missing number.` };
  } else if (aid?.skipped.length) {
    out.chinaMissing = { short: 'AidData file could not be read', help: `${aid.skipped.map((s) => `${s.file}: ${s.reason}`).join('; ')}. ${AIDDATA_SETUP_HELP}` };
  } else {
    out.chinaMissing = { short: 'AidData file not downloaded', help: AIDDATA_SETUP_HELP };
  }
  return out;
}

const bn = (v: number) => (v >= 10 ? `US$${v.toFixed(0)} bn` : v >= 1 ? `US$${v.toFixed(1)} bn` : `US$${(v * 1000).toFixed(0)} m`);

/** "US$42 bn committed 2000-2021 (186 loans); US$5.2 bn in 2017-2021". */
export function chinaValue(c: ChinaLending): string {
  return `${bn(c.totalUsdBn)} committed ${c.firstYear}-${c.lastYear} (${c.loans} loan${c.loans === 1 ? '' : 's'}); ${bn(c.recentUsdBn)} in ${c.recentFrom}-${c.recentFrom + AIDDATA_RECENT_YEARS - 1}`;
}

export const chinaSource = (c: ChinaLending) => `${AIDDATA_SOURCE}, ${c.dollars}; commitments, not money paid out or still owed`;
