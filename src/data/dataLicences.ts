/**
 * Licence register: each outside source the app reads, what its own terms say about showing the
 * figures to other people and about commercial use, and the attribution it asks for.
 *
 * Every quote below was read on the source's own terms page on the date in `checked`. Where a page
 * could not be read, or the terms do not answer the question, the row says so and is marked
 * `not_verified`: nothing here is filled in from memory. This is a research note, not legal advice;
 * a licence question that matters for a client or a sale should go to the provider in writing.
 *
 * docs/DATA_LICENCES.md is generated from this file (`npm run docs:licences`) and a test fails if
 * the two differ, so the in-app register (Menu > About & data licences) and the document never drift.
 */

export type LicenceShare = 'allowed' | 'restricted' | 'unclear';

export const LICENCE_SHARE_LABEL: Record<LicenceShare, string> = {
  allowed: 'Free sharing allowed',
  restricted: 'Do not pass on',
  unclear: 'Sharing unclear',
};

export type LicenceStatus = 'open' | 'conditions' | 'permission' | 'not_verified';

export interface LicenceRow {
  id: string;
  name: string;
  /** What the app reads from it (matches docs/DATA_SOURCES.md). */
  usedFor: string;
  terms: { label: string; url: string }[];
  status: LicenceStatus;
  /** Showing the figures to people outside your own use (clients, colleagues, a published note). */
  display: string;
  commercial: string;
  /** The attribution to print beside the figures, as the source asks for it. */
  attribution: string;
  /** Short verbatim quotes from the terms page(s). */
  quotes: string[];
  /** What is unclear or needs action. Rows with a flag are listed in "Open questions". */
  flag?: string;
  /** Free, non-commercial sharing of the figures with other people (an open-source research note, a
   * public chart). Judged from the quotes above; 'unclear' when the terms do not settle it. */
  share: LicenceShare;
  shareNote: string;
  checked: string;
  /** The day the source stopped publishing or answering for good (docs/MAINTENANCE.md). Its figures
   * keep their last date with an "Ended" note and are never filled from another source without a new
   * register row. */
  ended?: string;
}

/** Terms are re-read at least once a year (upkeep routine M1, docs/MAINTENANCE.md). */
export const LICENCE_RECHECK_DAYS = 365;

/** True when the row's terms were last read more than a year before `now`. */
export function licenceCheckDue(row: Pick<LicenceRow, 'checked'>, now: Date = new Date()): boolean {
  const t = Date.parse(`${row.checked}T00:00:00Z`);
  return Number.isFinite(t) && now.getTime() - t > LICENCE_RECHECK_DAYS * 86_400_000;
}

/** Register rows whose terms are due a re-read. */
export function licencesDue(now: Date = new Date(), rows: LicenceRow[] = DATA_LICENCES): LicenceRow[] {
  return rows.filter((r) => !r.ended && licenceCheckDue(r, now));
}

export const LICENCE_STATUS_LABEL: Record<LicenceStatus, string> = {
  open: 'Open with attribution',
  conditions: 'Allowed with conditions',
  permission: 'Permission needed for client or commercial use',
  not_verified: 'Terms not confirmed',
};

export const LICENCE_STATUS_HELP: Record<LicenceStatus, string> = {
  open: 'The terms allow redistribution and commercial use as long as the source is credited.',
  conditions: 'Display to others is allowed, but the terms add conditions beyond a credit (a notice, no extra charge, no changes).',
  permission: 'Your own research use is fine; showing the figures to clients, publishing them or using them commercially needs the provider\'s written permission (or a paid licence).',
  not_verified: 'The terms page could not be read or does not answer the question. Treat as personal research use only until confirmed.',
};

const D = '2026-11-06';

export const DATA_LICENCES: LicenceRow[] = [
  {
    id: 'worldbank',
    name: 'World Bank indicators and debt statistics (IDS, QEDS)',
    usedFor: 'Reserves, current account, external debt, political stability, trade shares, military spending (SIPRI, MS.MIL.XPND.GD.ZS); inequality (Gini, SI.POV.GINI), central government tax revenue and its split (GC.TAX.*), applied tariffs (TM.TAX.MRCH.*, WITS/TRAINS); poverty rates (SI.POV.DDAY, SI.POV.LMIC, SI.POV.UMIC), remittances (BX.TRF.PWKR.DT.GD.ZS), labour force participation and youth unemployment (ILO modelled estimates), age dependency (SP.POP.DPND); interest as % of revenue (GC.XPN.INTP.RV.ZS); goods exports and imports by group (TX.VAL.*, TM.VAL.*), net energy imports (EG.IMP.CONS.ZS); consumer price inflation to work out real wage growth (FP.CPI.TOTL.ZG); greenhouse gas emissions per person (EN.GHG.ALL.PC.CE.AR5, from EU EDGAR), renewable share of energy use (EG.FEC.RNEW.ZS); currency mix and maturity of new loans of public external debt (IDS DT.CUR.*, DT.MAT.DPPG); external debt falling due; who holds public external debt and terms of new loans (IDS)',
    terms: [{ label: 'Terms of Use for Datasets', url: 'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets' }],
    status: 'open',
    display: 'Allowed: the data may be shared with third parties under CC BY 4.0.',
    commercial: 'Allowed (CC BY 4.0 sets no commercial limit).',
    attribution: 'The World Bank: <dataset name>: <data source>, e.g. "The World Bank: World Development Indicators".',
    quotes: [
      'Unless specifically labeled otherwise, these Datasets are provided to you under a Creative Commons Attribution 4.0 International License (CC BY 4.0), with the additional terms below.',
      'You may extract, download, and make copies of the data contained in the Datasets, and you may share that data with third parties according to these terms of use.',
      'Some datasets and indicators are provided by third parties, and may not be redistributed or reused without the consent of the original data provider',
    ],
    flag: 'Third-party indicators inside World Bank datasets can carry their own terms (stated in each indicator\'s metadata); the per-dataset licence for IDS and QEDS in the Data Catalog was not read. Military spending is SIPRI\'s data republished by the World Bank; SIPRI\'s own terms were not read.',
    share: 'allowed',
    shareNote: 'CC BY 4.0 allows sharing with credit.',
    checked: D,
  },
  {
    id: 'pinksheet',
    name: 'World Bank Pink Sheet (commodity prices)',
    usedFor: 'Monthly commodity prices: oil, gas, metals, farm goods',
    terms: [
      { label: 'Terms of Use for Datasets', url: 'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets' },
      { label: 'Data Catalog', url: 'https://datacatalog.worldbank.org' },
    ],
    status: 'not_verified',
    display: 'Likely covered by the World Bank dataset terms (CC BY 4.0), but the Pink Sheet\'s own catalog entry could not be read.',
    commercial: 'Not confirmed.',
    attribution: 'The World Bank: Commodity Price Data (The Pink Sheet).',
    quotes: [],
    flag: 'Read the Pink Sheet licence field in the World Bank Data Catalog before showing commodity prices to clients. Some prices in it come from third parties.',
    share: 'unclear',
    shareNote: 'Catalog licence not read.',
    checked: D,
  },
  {
    id: 'imf',
    name: 'IMF (World Economic Outlook, Fiscal Monitor, International Liquidity, Balance of Payments, COFER, Consumer Price Index)',
    usedFor: 'Debt/GDP, inflation, growth, primary balance, output gap, reserves, current account, imports, COFER shares, monthly consumer prices (CPI dataset), government spending by function (GFS COFOG, read through DBnomics); revenue and spending by level of government (GFS main aggregates by sub-sector, GFSMAB, read through DBnomics)',
    terms: [{ label: 'Copyright and Usage (Special Terms for Statistical Data)', url: 'https://www.imf.org/en/About/copyright-and-terms' }],
    status: 'permission',
    display: 'Allowed with attribution: the IMF lets users publish and distribute its Data.',
    commercial: 'Needs permission: email copyright@imf.org. Systematic or bulk automated download also needs permission.',
    attribution: 'Source: International Monetary Fund, <database name>, <link to the dataset>.',
    quotes: [
      'Users may download, extract, copy, create derivative works, publish, distribute, and use Data obtained from IMF Sites subject to these conditions:',
      'Distributed or reproduced Data must appear accurately with attribution to the IMF as the source, e.g. "Source: International Monetary Fund, Database Name, <<link to the dataset>>."',
      'For any potential commercial reuse of IMF Data, email copyright@imf.org to request permission.',
      'The IMF prohibits bulk download of information by automated technology without explicit permission',
    ],
    flag: 'Commercial reuse (for example a paid service or client deliverables) needs the IMF\'s permission. Whether the app\'s "Download all country data" counts as bulk automated download is not addressed by the terms. COFER and Fiscal Monitor are not named, but fall under "statistical data ... that explicitly identify the International Monetary Fund as the source".',
    share: 'allowed',
    shareNote: 'IMF Data may be published and distributed with attribution; only commercial reuse needs permission.',
    checked: D,
  },
  {
    id: 'comtrade',
    name: 'UN Comtrade',
    usedFor: 'Goods trade by partner and export mix by HS chapter; top five export markets and export concentration (the app\'s Herfindahl calculation)',
    terms: [
      { label: 'Policy on Comtrade data use', url: 'https://uncomtrade.org/docs/policy-on-comtrade-data-use/' },
      { label: 'Re-dissemination of data (FAQ)', url: 'https://uncomtrade.org/docs/re-dissemination-of-data/' },
    ],
    status: 'permission',
    display: 'Internal use only. Free, not-for-profit visualisation is exempt; a paid report or dashboard is exempt only below 100,000 original records.',
    commercial: 'Paid, subscription or otherwise monetised use counts as commercial; commercial APIs need a premium subscription.',
    attribution: 'Source: UN Comtrade.',
    quotes: [
      'UN Comtrade data are provided for internal use only and may not be re-disseminated in any form without UNSD\'s permission.',
      'Internal use explicitly excludes data dissemination to any entity outside the institutional unit.',
      'Free visualization and analytics applications are exempt.',
      'A paid report or chargeable dashboard is exempt when the database used for re-dissemination contains fewer than 100,000 original UN Comtrade records.',
      'Use "Source: UN Comtrade."',
    ],
    flag: 'The policy page and the FAQ read differently (blanket "internal use only" against the FAQ\'s exemptions). The app stores a few hundred rows per country, well under 100,000, but confirm with comtrade@un.org before a paid product.',
    share: 'allowed',
    shareNote: 'The FAQ exempts free, not-for-profit visualisation and analytics applications.',
    checked: D,
  },
  {
    id: 'wits',
    name: 'WITS (World Integrated Trade Solution)',
    usedFor: 'Export and import shares with China and Russia',
    terms: [{ label: 'WITS FAQ, Databases (usage conditions)', url: 'https://wits.worldbank.org/faqs.html' }],
    status: 'permission',
    display: 'The trade shares come from UN Comtrade data, which WITS says is for internal use only.',
    commercial: 'Needs UNSD\'s written permission (see UN Comtrade).',
    attribution: 'Source: UN Comtrade via WITS (World Bank).',
    quotes: [
      'These data are copyrighted by the United Nations. They are made available for internal use only and may not be re-disseminated in any form without written permission of the United Nations Statistics Division (UNSD).',
    ],
    flag: 'Same position as UN Comtrade. Where Comtrade has the shares the app already uses Comtrade instead.',
    share: 'restricted',
    shareNote: 'WITS states its Comtrade-derived data is for internal use only.',
    checked: D,
  },
  {
    id: 'bis',
    name: 'BIS statistics (policy rates, real exchange rates, debt securities, credit cycle)',
    usedFor: 'Central bank policy rates and their history, real exchange rates, government debt securities, credit-to-GDP gaps, debt service ratios, residential property prices (real and nominal, country brief and History & data) and household and company debt (total credit)',
    terms: [
      { label: 'Terms of permitted use of BIS statistics', url: 'https://data.bis.org/help/legal' },
      { label: 'BIS terms and conditions', url: 'https://www.bis.org/terms_conditions.htm' },
    ],
    status: 'conditions',
    display: 'Allowed if the BIS is cited as the source.',
    commercial: 'Allowed, provided including the statistics adds no extra charge for subscribers or users.',
    attribution: 'Source: BIS (Bank for International Settlements), <dataset>, e.g. "Source: BIS central bank policy rates".',
    quotes: [
      'The use of the statistics is unrestricted, provided that:',
      'if the statistics are reproduced, the BIS must be cited in your publication or product as the source of the statistics;',
      'if the statistics will be used in a commercial publication or product, their inclusion in the publication or product will not result in any additional charge to subscribers or other users;',
    ],
    flag: 'In a paid product the BIS figures must not be what is charged for. The general bis.org terms allow redistribution "for non-commercial purposes", which the statistics terms override for statistics.',
    share: 'allowed',
    shareNote: 'Use is unrestricted with the BIS cited.',
    checked: D,
  },
  {
    id: 'ecb',
    name: 'ECB statistics: euro reference rates (through Frankfurter), Survey of Professional Forecasters',
    usedFor: 'Daily exchange rate history per US dollar since 1999; FX volatility; last year\'s closing rate for the year-to-date move; Survey of Professional Forecasters inflation expectations (ECB Data Portal, dataset SPF, quarterly world series); euro area GDP, HICP inflation and unemployment as first published (ECB Euro Area Real-Time Database, dataset RTD, with its revision history)',
    terms: [
      { label: 'ECB statistics reuse policy', url: 'https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html' },
      { label: 'Frankfurter licence', url: 'https://frankfurter.dev/license/' },
    ],
    status: 'open',
    display: 'Allowed, free of charge, if the source is quoted and the statistics are not modified.',
    commercial: 'Allowed ("irrespective of any subsequent commercial or non-commercial use").',
    attribution: 'Source: ECB statistics (via Frankfurter). Volatility and year-to-date moves are the app\'s own calculations from them.',
    quotes: [
      'All publicly available ESCB statistics may be reused free of charge on the condition that the source is quoted (e.g. "Source: ECB statistics.")',
      'Frankfurter doesn\'t own the rates, so it can\'t give you rights the provider doesn\'t. If a provider publishes terms of use, they apply.',
    ],
    flag: 'Derived figures (volatility, year-to-date change) should be labelled as the app\'s calculation so they are not presented as ECB statistics.',
    share: 'allowed',
    shareNote: 'Free reuse with the source quoted and the figures unmodified.',
    checked: D,
  },
  {
    id: 'erapi',
    name: 'ExchangeRate-API open access (open.er-api.com)',
    usedFor: 'Spot exchange rates against the dollar',
    terms: [
      { label: 'Free / open access docs', url: 'https://www.exchangerate-api.com/docs/free' },
      { label: 'Terms of use', url: 'https://www.exchangerate-api.com/terms' },
    ],
    status: 'permission',
    display: 'Not allowed to redistribute; rates may be used for your own end purposes with a credit link on the page.',
    commercial: 'Allowed for your own currency conversion, not in a product that passes rates on to others.',
    attribution: 'Rates By Exchange Rate API (linked to https://www.exchangerate-api.com) on every page that uses the rates.',
    quotes: [
      'You\'re welcome to cache the data we respond with and to use it for either personal or commercial currency conversion purposes. You are, however, not allowed to re-distribute it.',
      'ExchangeRate-API data may only be used for your end purposes and not in any product or service that offers programmatic or automatic access to exchange rate data.',
      'Use of the exchange rates we provide for actual transactions or as financial data is explicitly not recommended.',
    ],
    flag: 'Spot rates shown to clients or in exports would be redistribution. Options: switch spot FX to the ECB rates (Frankfurter, already the backup) for anything shared, or ask ExchangeRate-API in writing.',
    share: 'restricted',
    shareNote: 'The terms forbid redistributing the rates.',
    checked: D,
  },
  {
    id: 'nyfed',
    name: 'New York Fed markets data',
    usedFor: 'Fed funds, SOFR, reverse repo; Global Supply Chain Pressure Index (GSCPI, a factor in the global shock scenarios and a world series; built by the New York Fed from transport and manufacturing data)',
    terms: [{ label: 'Terms of Use', url: 'https://www.newyorkfed.org/privacy/termsofuse' }],
    status: 'conditions',
    display: 'Allowed for personal or business purposes; reference rates (SOFR, EFFR and others) must carry the New York Fed\'s notice.',
    commercial: 'Allowed for business purposes; no general ban on data.',
    attribution: '"© <year> Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org." For SOFR and EFFR also: "The <rate> is subject to the Terms of Use posted at newyorkfed.org. The New York Fed is not responsible for publication of the <rate> by <publisher>, does not sanction or endorse any particular republication, and has no liability for your use."',
    quotes: [
      'The New York Fed grants you a non-exclusive license, subject to the Terms, to use, copy, and distribute Content for your personal or business purposes.',
      'None of the Content is investment advice.',
    ],
    flag: 'Exports that include SOFR or the fed funds rate should carry the reference-rate notice above.',
    share: 'allowed',
    shareNote: 'The licence covers use, copying and distribution, with the notice for reference rates.',
    checked: D,
  },
  {
    id: 'fred',
    name: 'FRED (St. Louis Fed): 10Y government yields from the OECD; St. Louis Fed and Chicago Fed stress indices; US inflation expectations',
    usedFor: 'US monthly activity: industrial production (INDPRO, Federal Reserve), retail and food services sales (RSAFS, Census Bureau) and the unemployment rate (UNRATE, BLS); US data as first published and as known on a past day (ALFRED vintages of GDPC1 real GDP, CPIAUCSL CPI and UNRATE unemployment, with your FRED API key; government statistics from BEA and BLS); US inflation expectations: 5- and 10-year breakevens and the 5y5y forward (T5YIE, T10YIE, T5YIFR, computed by the St. Louis Fed from US Treasury yields, labelled "Copyrighted: Citation Required") and the Cleveland Fed 1- and 10-year expected inflation (EXPINF1YR, EXPINF10YR, labelled "Public Domain: Citation Requested"); St. Louis Fed Financial Stress Index (STLFSI4, the default stress factor in the global shock scenarios; owned by the St. Louis Fed itself, labelled "Copyrighted: Citation Required"); Chicago Fed NFCI and adjusted NFCI (NFCI, ANFCI, alternative stress factors and world series; owned by the Federal Reserve Bank of Chicago, labelled "Copyrighted: Citation Required"); 10Y yields for the US, Mexico, South Africa, Japan, UK, Poland, Chile, India, Korea, Israel, Canada, Australia, New Zealand, Switzerland, the Nordics, Czechia, Hungary, Slovakia and 11 euro-area countries (all OECD series on FRED)',
    terms: [
      { label: 'FRED legal', url: 'https://fred.stlouisfed.org/legal/' },
      { label: 'FRED API terms', url: 'https://fred.stlouisfed.org/docs/api/terms_of_use.html' },
      { label: 'Example series: Mexico 10Y', url: 'https://fred.stlouisfed.org/series/IRLTLT01MXM156N' },
    ],
    status: 'permission',
    display: 'The series are labelled "Copyrighted: Citation Required" (owner: OECD). FRED\'s terms say to contact the data owner before any use beyond personal use, and that FRED cannot give that permission.',
    commercial: 'Unclear in FRED\'s own terms (one section allows reports to clients with attribution for citation-required series; others require the owner\'s permission).',
    attribution: 'OECD (year), Main Economic Indicators, long-term interest rates, retrieved from FRED, Federal Reserve Bank of St. Louis. With the FRED API key: "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis."',
    quotes: [
      'BEFORE USING DATA SERIES OWNED BY THIRD PARTIES FOR ANYTHING OTHER THAN YOUR OWN PERSONAL USE, YOU MUST CONTACT THE DATA OWNER TO OBTAIN PERMISSION.',
      'Data in this graph are copyrighted. Please review the copyright information in the series notes before sharing.',
      'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.',
    ],
    flag: 'The yields belong to the OECD; FRED\'s terms conflict on client display. Settle it through the OECD\'s own licence (see the OECD row, not yet confirmed).',
    share: 'unclear',
    shareNote: 'The OECD owns the series; FRED says to ask the owner before any use beyond personal use.',
    checked: D,
  },
  {
    id: 'oecd',
    name: 'OECD leading indicators and consumer prices (via DBnomics)',
    usedFor: 'Composite leading indicator; headline CPI inflation',
    terms: [
      { label: 'OECD terms and conditions', url: 'https://www.oecd.org/en/about/terms-conditions.html' },
      { label: 'DBnomics legal terms', url: 'https://docs.db.nomics.world/legal-terms/' },
    ],
    status: 'not_verified',
    display: 'DBnomics passes on the OECD\'s own licence. The OECD terms page could not be read past its navigation, so the OECD data licence is not confirmed here.',
    commercial: 'Not confirmed.',
    attribution: 'OECD (year), <dataset name>, <data source>, via DBnomics (citation form quoted on FRED\'s OECD series notes).',
    quotes: [
      'Data distributed by DBnomics is subject to the same license and terms of use as its original source provider.',
      'All OECD data should be cited as follows: OECD (year), (dataset name), (data source) DOI or https://data-explorer.oecd.org/. (accessed on (date)).',
    ],
    flag: 'Read the OECD data licence on oecd.org in a browser (the page needs JavaScript) and update this row; the FRED yields depend on it too.',
    share: 'unclear',
    shareNote: 'The OECD data licence was not confirmed.',
    checked: D,
  },
  {
    id: 'eurostat',
    name: 'Eurostat HICP, government expenditure by function (COFOG) and EU business and consumer surveys',
    usedFor: 'Monthly inflation for EU members (Poland on the defaults); government spending by function, % of GDP (gov_10a_exp); revenue and spending by level of government (gov_10a_main); the European Commission\'s business and consumer surveys as Eurostat republishes them (ei_bssi_m_r2, ei_bsee_m_r2); monthly industrial production, retail trade volume and unemployment rate (sts_inpr_m, sts_trtu_m, une_rt_m)',
    terms: [{ label: 'Eurostat copyright and reuse', url: 'https://ec.europa.eu/eurostat/about-us/policies/copyright' }],
    status: 'open',
    display: 'Allowed without a licence if Eurostat is named and any change to the data is stated.',
    commercial: 'Allowed for EU, EFTA and candidate countries (the app reads EU and EFTA members only).',
    attribution: 'Source: Eurostat (prc_hicp_minr, gov_10a_exp, gov_10a_main, ei_bssi_m_r2, ei_bsee_m_r2, sts_inpr_m, sts_trtu_m, une_rt_m); surveys by the European Commission (DG ECFIN).',
    quotes: [
      'Eurostat has a policy of encouraging free re-use of its data, both for non-commercial and commercial purposes.',
      'when re-use involves modifications to the data or text, this must be stated clearly to the end user of the information.',
    ],
    share: 'allowed',
    shareNote: 'Free reuse with Eurostat named.',
    checked: D,
  },
  {
    id: 'ons',
    name: 'Office for National Statistics (UK)',
    usedFor: 'UK monthly activity: index of production (K222), retail sales volume (J5EK) and the unemployment rate (MGSX); UK GDP as first published (GDP revision triangle, ABMI)',
    terms: [
      { label: 'ONS licences', url: 'https://www.ons.gov.uk/methodology/geography/licences' },
      { label: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' },
    ],
    status: 'open',
    display: 'Open Government Licence v3.0: reuse is allowed with ONS named as the source.',
    commercial: 'Allowed ("whether commercially or privately", ONS licences page; "exploit the Information commercially and non-commercially", OGL v3.0).',
    attribution: 'Source: Office for National Statistics licensed under the Open Government Licence v.3.0',
    quotes: [
      'if you wish to use or re-use ONS material, whether commercially or privately',
      'you may do so freely without a specific application for a licence, subject to the conditions of the Open Government Licence',
      'If you are reproducing ONS content you must include a source accreditation to ONS.',
    ],
    share: 'allowed',
    shareNote: 'Open Government Licence v3.0 with ONS named.',
    checked: '2026-11-12',
  },
  {
    id: 'cftc',
    name: 'CFTC Commitments of Traders',
    usedFor: 'Weekly currency futures positioning',
    terms: [{ label: 'CFTC web policy', url: 'https://www.cftc.gov/webpolicy/index.htm' }],
    status: 'open',
    display: 'Public domain.',
    commercial: 'Allowed.',
    attribution: 'Source: CFTC Commitments of Traders (acknowledgement requested).',
    quotes: [
      'Government information at the CFTC website is in the public domain. Public domain information may be freely distributed and copied, but it is requested that in any subsequent use the CFTC be given appropriate acknowledgement.',
    ],
    share: 'allowed',
    shareNote: 'Public domain.',
    checked: D,
  },
  {
    id: 'tic',
    name: 'US Treasury TIC (major foreign holders)',
    usedFor: 'Holdings of US Treasuries by country',
    terms: [
      { label: 'TIC system page', url: 'https://home.treasury.gov/data/treasury-international-capital-tic-system' },
      { label: 'Treasury site policies', url: 'https://home.treasury.gov/subfooter/site-policies-and-notices' },
    ],
    status: 'not_verified',
    display: 'No terms, licence or copyright statement was found on the TIC or Treasury site-policy pages.',
    commercial: 'Not stated.',
    attribution: 'Source: US Treasury, Treasury International Capital (TIC) system.',
    quotes: [],
    flag: 'Treasury does not state a licence for TIC. Its Fiscal Data site says its data is "free, without restriction" for commercial use, but that page does not cover TIC.',
    share: 'unclear',
    shareNote: 'No terms found.',
    checked: D,
  },
  {
    id: 'us_fiscal_data',
    name: 'US Treasury Fiscal Data (Treasury Securities Auctions Data)',
    usedFor: 'Bid-to-cover, high yield, amounts offered and accepted, and the indirect bidders\' share at each auction of US bills, notes and bonds',
    terms: [
      { label: 'Fiscal Data about and terms', url: 'https://fiscaldata.treasury.gov/about-us/' },
      { label: 'Treasury Securities Auctions Data', url: 'https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/' },
    ],
    status: 'open',
    display: 'Allowed: Fiscal Data says its data are free, without restriction, to copy, adapt and redistribute.',
    commercial: 'Allowed ("for non-commercial or commercial purposes").',
    attribution: 'Source: U.S. Department of the Treasury, Fiscal Data, Treasury Securities Auctions Data.',
    quotes: ['free, without restriction, and available to copy, adapt, redistribute, or otherwise use for non-commercial or commercial purposes.'],
    share: 'allowed',
    shareNote: 'Free, without restriction.',
    checked: '2026-11-08',
  },
  {
    id: 'eia',
    name: 'US EIA open data',
    usedFor: 'Daily Brent and WTI spot prices (with your free key)',
    terms: [{ label: 'EIA copyrights and reuse', url: 'https://www.eia.gov/about/copyrights_reuse.php' }],
    status: 'open',
    display: 'Public domain.',
    commercial: 'No restriction stated.',
    attribution: 'Source: U.S. Energy Information Administration (<publication date>).',
    quotes: [
      'U.S. government publications are in the public domain and are not subject to copyright protection. You may use and/or distribute any of our data, files, databases, reports, graphs, charts, and other information products',
    ],
    share: 'allowed',
    shareNote: 'Public domain.',
    checked: D,
  },
  {
    id: 'gdelt',
    name: 'GDELT (DOC API, raw GDELT 2.0 files and GDELT 1.0 event files)',
    usedFor: 'Headlines and news tone; weekly event counts and news themes per country; monthly event history back to 1979',
    terms: [{ label: 'GDELT terms of use', url: 'https://www.gdeltproject.org/about.html#termsofuse' }],
    status: 'open',
    display: 'Allowed in any form, with a citation and link.',
    commercial: 'Allowed, without fee.',
    attribution: 'Source: The GDELT Project (https://www.gdeltproject.org/).',
    quotes: [
      'You may redistribute, rehost, republish, and mirror any of the GDELT datasets in any form. However, any use or redistribution of the data must include a citation to the GDELT Project and a link to this website (https://www.gdeltproject.org/).',
      'available for unlimited and unrestricted use for any academic, commercial, or governmental use of any kind without fee.',
    ],
    flag: 'Headlines link to news articles owned by their publishers; GDELT\'s terms cover GDELT\'s data, not the articles.',
    share: 'allowed',
    shareNote: 'Any redistribution allowed with a citation and link.',
    checked: D,
  },
  {
    id: 'ucdp',
    name: 'UCDP (Uppsala Conflict Data Program) downloaded files',
    usedFor: 'Armed conflicts, battle deaths, non-state and one-sided violence per country and year; preliminary monthly Candidate events since the yearly release (release shipped in datasets/ucdp/; newer files fetched into data/local/ucdp/ by the daily start-up run or npm run ucdp:pull, or put there by you)',
    terms: [{ label: 'UCDP downloads (licence and citations)', url: 'https://ucdp.uu.se/downloads/' }],
    status: 'open',
    display: 'Allowed: free to use and redistribute under CC BY 4.0, citing the publications listed with each dataset.',
    commercial: 'Allowed (CC BY 4.0 sets no commercial limit).',
    attribution:
      'UCDP, Uppsala University (ucdp.uu.se), CC BY 4.0; cite the dataset publications, e.g. Davies, Pettersson & Öberg (2026), Journal of Peace Research, and Gleditsch et al. (2002), Journal of Peace Research 39(5).',
    quotes: [
      'All datasets are free of charge and licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — you are free to use and redistribute them provided you cite the relevant publications listed with each dataset.',
    ],
    share: 'allowed',
    shareNote: 'CC BY 4.0 allows sharing with a citation of the dataset publications.',
    checked: D,
  },
  {
    id: 'ofac',
    name: 'OFAC sanctions lists (US Treasury)',
    usedFor: 'SDN and non-SDN sanctions list entries by country and programme (files you put in data/local/sanctions/)',
    terms: [{ label: 'OFAC Sanctions List Service', url: 'https://ofac.treasury.gov/sanctions-list-service' }],
    status: 'not_verified',
    display: 'Not confirmed: the terms page could not be read from where this register was written.',
    commercial: 'Not confirmed.',
    attribution: 'Office of Foreign Assets Control, US Department of the Treasury.',
    quotes: [],
    flag: 'Read the terms on the OFAC Sanctions List Service page and update this row before showing list counts to others.',
    share: 'unclear',
    shareNote: 'Terms not read.',
    checked: D,
  },
  {
    id: 'unsc',
    name: 'UN Security Council Consolidated List',
    usedFor: 'UN sanctions list entries by country, regime and year listed (consolidated.xml in data/local/sanctions/)',
    terms: [{ label: 'UN Security Council Consolidated List', url: 'https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list' }],
    status: 'not_verified',
    display: 'Not confirmed: the terms page could not be read from where this register was written.',
    commercial: 'Not confirmed.',
    attribution: 'United Nations Security Council Consolidated List.',
    quotes: [],
    flag: 'Read the UN terms of use for the consolidated list and update this row before showing list counts to others.',
    share: 'unclear',
    shareNote: 'Terms not read.',
    checked: D,
  },
  {
    id: 'gpr',
    name: 'Caldara-Iacoviello Geopolitical Risk index',
    usedFor: 'Monthly geopolitical risk index, world and 44 countries (file fetched into data/local/gpr/ by the daily start-up run or npm run gpr:pull, or saved there by you), in the country risk scorecard',
    terms: [{ label: 'Geopolitical Risk Index page', url: 'https://www.matteoiacoviello.com/gpr.htm' }],
    status: 'not_verified',
    display: 'Not confirmed: the data page could not be read from where this register was written.',
    commercial: 'Not confirmed.',
    attribution: 'Caldara, Dario and Matteo Iacoviello (2022), "Measuring Geopolitical Risk", American Economic Review 112(4), 1194-1225.',
    quotes: [],
    flag: 'Read the terms and citation request on the GPR data page and update this row before showing the index to others.',
    share: 'unclear',
    shareNote: 'Terms not read.',
    checked: D,
  },
  {
    id: 'polymarket',
    name: 'Polymarket',
    usedFor: 'Prediction-market odds',
    terms: [{ label: 'Terms of Use (effective 11 Aug 2026)', url: 'https://polymarket.com/tos' }],
    status: 'permission',
    display: 'Personal, limited licence only. Redistribution to capital-markets firms or data distributors needs written agreement.',
    commercial: 'Professional capital-markets users (including investment managers and financial technology companies) may not access the data through an API without written agreement.',
    attribution: 'None stated.',
    quotes: [
      'Access or use any data, content, or information contained on our Site, any Interface or Features directly or through an API ... if you are (i) a non-retail, professional entity that engages in capital markets activities',
      'Sell, resell, sublicense, redistribute, or otherwise commercially exploit the Data to any Capital Market Client or market data distributor, unless otherwise agreed to in writing by us;',
    ],
    flag: 'A desk, fund or fintech using the app professionally falls inside the restriction. Keep Polymarket odds to personal research, or agree terms with Polymarket.',
    share: 'unclear',
    shareNote: 'A personal licence; redistribution is barred only to capital-markets firms and data distributors, and sharing with others is not addressed.',
    checked: D,
  },
  {
    id: 'kalshi',
    name: 'Kalshi',
    usedFor: 'Prediction-market odds',
    terms: [
      { label: 'Developer Agreement v1.1', url: 'https://assets.kalshi.com/Kalshi-Developer-Agreement.pdf' },
      { label: 'Data Terms of Use', url: 'https://kalshi-public-docs.s3.amazonaws.com/kalshi-data-terms-of-service.pdf' },
    ],
    status: 'permission',
    display: 'Not allowed without Kalshi\'s written authorization.',
    commercial: 'Not allowed: personal, non-commercial use only; API use is limited to a member\'s own trading.',
    attribution: 'None stated.',
    quotes: [
      'Use of Kalshi APIs is expressly limited to facilitating a members own trading on the Exchange; all other usages are disallowed',
      'You may not share such data or content with third parties in any manner without prior written authorization from Kalshi.',
      'You may access content only for your personal use for non-commercial purposes.',
    ],
    flag: 'The strictest terms in the app. Showing Kalshi odds to anyone else, or using them in a professional setting, needs Kalshi\'s written authorization.',
    share: 'restricted',
    shareNote: 'Sharing with third parties needs Kalshi\'s written authorization.',
    checked: D,
  },
  {
    id: 'bcrp',
    name: 'Central Reserve Bank of Peru (BCRPData): J.P. Morgan EMBI spreads; interbank PEN rate',
    usedFor: 'USD bond spread over Treasuries for Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru, Venezuela (the free stand-in for CDS); daily soles per US dollar (PD04638PD), the BCRP\'s own series',
    terms: [
      { label: 'BCRPData Condiciones de Uso', url: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/condiciones-de-uso' },
      { label: 'Example series: EMBIG Peru', url: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04709XD/html' },
    ],
    status: 'not_verified',
    display: 'The BCRP allows reproduction without permission if it is cited, but the spreads are J.P. Morgan\'s index and the BCRP says responsibility for outside data rests with the original provider. J.P. Morgan\'s own terms were not read.',
    commercial: 'Not stated by the BCRP; J.P. Morgan index terms not confirmed.',
    attribution: 'Fuente: BCRP (BCRPData), from J.P. Morgan EMBI Global.',
    quotes: [
      'Puede reproducirse total o parcialmente, sin autorización expresa, siempre y cuando se cite la fuente.',
      'La responsabilidad sobre las estadísticas cuya fuente es externa al Banco recae en la entidad que provee el dato original.',
    ],
    flag: 'EMBI is a J.P. Morgan index, usually licensed. Keep the spreads to your own research until J.P. Morgan\'s terms for republished EMBI levels are confirmed.',
    share: 'unclear',
    shareNote: 'The BCRP allows reproduction with citation, but J.P. Morgan\'s terms for the EMBI levels were not read.',
    checked: D,
  },
  {
    id: 'trm_colombia',
    name: 'Colombia TRM (Superintendencia Financiera) on datos.gov.co',
    usedFor: 'Daily pesos per US dollar (Tasa Representativa del Mercado), dataset 32sa-8pi3',
    terms: [{ label: 'Dataset 32sa-8pi3 on datos.gov.co', url: 'https://www.datos.gov.co/d/32sa-8pi3' }],
    status: 'not_verified',
    display: 'The dataset\'s licence was not read.',
    commercial: 'Not confirmed.',
    attribution: 'Fuente: Superintendencia Financiera de Colombia, TRM (datos.gov.co).',
    quotes: [],
    flag: 'Read the licence shown on the datos.gov.co dataset page for 32sa-8pi3 and update this row.',
    share: 'unclear',
    shareNote: 'Licence not read yet.',
    checked: '2026-11-07',
  },
  {
    id: 'bcra',
    name: 'Banco Central de la República Argentina (Cotizaciones API)',
    usedFor: 'Daily pesos per US dollar, the BCRA official quote',
    terms: [{ label: 'BCRA website (API terms still to find)', url: 'https://www.bcra.gob.ar/' }],
    status: 'not_verified',
    display: 'The API terms were not read.',
    commercial: 'Not confirmed.',
    attribution: 'Fuente: Banco Central de la República Argentina.',
    quotes: [],
    flag: 'Find and read the terms for the BCRA public APIs (api.bcra.gob.ar) and update this row.',
    share: 'unclear',
    shareNote: 'Terms not read yet.',
    checked: '2026-11-07',
  },
  {
    id: 'bcb',
    name: 'Banco Central do Brasil (SGS 13522, IPCA 12 months; Focus market expectations)',
    usedFor: 'Brazil\'s IPCA inflation over 12 months; IBGE monthly industrial production, retail sales volume and unemployment rate as the BCB republishes them (SGS 21859, 1455, 24369); Focus survey median IPCA expected over the next 12 months (Olinda OData, Expectativas)',
    terms: [
      { label: 'Open data portal: about', url: 'https://dadosabertos.bcb.gov.br/pages/sobre-o-portal' },
      { label: 'Focus dataset page (licence: ODbL)', url: 'https://dadosabertos.bcb.gov.br/dataset/expectativas-mercado' },
    ],
    status: 'not_verified',
    display: 'The open data portal names no licence and its footer reads "Todos os direitos reservados" (all rights reserved). The copyright page needs JavaScript and was not read.',
    commercial: 'Not stated.',
    attribution: 'Fonte: Banco Central do Brasil, SGS série 13522.',
    quotes: ['© Banco Central do Brasil - Todos os direitos reservados'],
    flag: 'The Focus dataset page names the Open Data Commons Open Database License (ODbL), read 2026-11-07, while the site footer reads all rights reserved. Read https://www.bcb.gov.br/acessoinformacao/direitosautorais in a browser and update this row.',
    share: 'unclear',
    shareNote: 'No licence stated; the footer reads all rights reserved.',
    checked: D,
  },
  {
    id: 'banxico',
    name: 'Banco de México (SIE API, INPC), with your token',
    usedFor: 'Mexico\'s INPC inflation over 12 months (only when you add your own Banxico token)',
    terms: [{ label: 'SIE API page (terms shown when you request a token)', url: 'https://www.banxico.org.mx/SieAPIRest/service/v1/?locale=en' }],
    status: 'not_verified',
    display: 'Not confirmed. The terms are shown on the token page, which could not be read from the build machine.',
    commercial: 'Not stated here.',
    attribution: 'Fuente: Banco de México, SIE (serie SP30578).',
    quotes: [],
    flag: 'Read the terms on the token page when you request the token and update this row.',
    share: 'unclear',
    shareNote: 'Terms not read yet; treated as unclear until they are.',
    checked: D,
  },
  {
    id: 'tesouro',
    name: 'Brazil Treasury (Tesouro Direto price history)',
    usedFor: 'Brazil 10Y yield (NTN-F)',
    terms: [{ label: 'Dataset page (licence)', url: 'https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto' }],
    status: 'open',
    display: 'Allowed under the Open Database License (ODbL).',
    commercial: 'Allowed under ODbL (attribution; a shared derived database stays under ODbL).',
    attribution: 'Fonte: Tesouro Transparente, Taxas dos Títulos Ofertados pelo Tesouro Direto (ODbL).',
    quotes: ['Licença Aberta para Bases de Dados (ODbL) do Open Data Commons'],
    share: 'allowed',
    shareNote: 'Open Database License (ODbL), with credit.',
    checked: D,
  },
  {
    id: 'evds',
    name: 'Central Bank of Turkey (EVDS), with your key',
    usedFor: 'Turkey monthly CPI inflation and 10Y yield',
    terms: [{ label: 'TCMB terms of use (Kullanım Şartları)', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/Kullanim+Sartlari' }],
    status: 'permission',
    display: 'May be published with the source cited.',
    commercial: 'Needs the TCMB\'s written permission.',
    attribution: 'Kaynak: TCMB EVDS (Central Bank of the Republic of Türkiye).',
    quotes: ['Sitede yer alan bilgiler, kaynak gösterilmek suretiyle yayımlanabilir; ancak bu bilgilerin ticari amaçlarla kullanımı TCMB\'nin yazılı iznine tabidir.'],
    flag: 'These are the TCMB website terms; they do not name EVDS, whose own pages need JavaScript and were not read.',
    share: 'allowed',
    shareNote: 'May be published with the source cited; only commercial use needs permission.',
    checked: D,
  },
  {
    id: 'acled',
    name: 'ACLED (Armed Conflict Location & Event Data), with your account or your downloaded files',
    usedFor: 'Conflict events per country over twelve months (only when you add your own ACLED account, or put an aggregated file you downloaded from myACLED in data/local/acled/)',
    terms: [
      { label: 'ACLED End User License Agreement (1 Nov 2026)', url: 'https://acleddata.com/eula/' },
      { label: 'ACLED Attribution Policy (5 Nov 2026)', url: 'https://acleddata.com/attributionpolicy' },
      { label: 'myACLED access levels (FAQ)', url: 'https://acleddata.com/myacled-faqs' },
    ],
    status: 'conditions',
    display: 'Free for non-commercial use, including internal research. Anything published must be transformative and must not let the underlying data be rebuilt; ACLED must be named as the source.',
    commercial: 'Not allowed without a corporate licence from ACLED; governments and multilateral bodies need a public-sector licence.',
    attribution: 'ACLED (Armed Conflict Location & Event Data), accessed [date], www.acleddata.com; filters and any changes stated.',
    quotes: [
      'a royalty-free, non-exclusive, non-transferable, non-sublicensable license ... for non-commercial purposes, which may include internal use',
      'Commercial entities may not access or use the Content and/or Platforms without first obtaining a corporate license from the Licensor.',
      'The Licensee may only publish or distribute materials incorporating ACLED\'s Data where such materials are transformative in nature and do not allow reverse engineering of the underlying dataset.',
      'ACLED as the source of the data must be clearly and prominently acknowledged. This applies to uses of the original ACLED data as well as any manipulation of or additions to the data.',
    ],
    flag: 'Monthly counts per country may count as "reorganized" data, which the EULA says is not enough to publish. Keep ACLED figures to your own research and leave them out of anything shared until ACLED confirms. API access needs the Research level; Open accounts get aggregated downloads only, which the app reads from data/local/acled/. The same EULA covers the downloaded files: they stay on your computer and are never shipped with the app.',
    share: 'restricted',
    shareNote: 'Non-commercial research use only; publishing needs transformative work that cannot be reversed into the data.',
    checked: '2026-11-06',
  },
  {
    id: 'boc_boe',
    name: 'Bank of Canada and Bank of England Sovereign Default Database (BoC-BoE)',
    usedFor: 'Government debt in default each year since 1960, by creditor (IMF, Paris Club, China, foreign-currency bonds and bank loans, local-currency debt)',
    terms: [
      { label: 'Bank of Canada Terms of Use, Disclosures and Disclaimers', url: 'https://www.bankofcanada.ca/terms/' },
      { label: 'BoC-BoE Sovereign Default Database: What\'s new in 2026? (Staff Analytical Paper 2026-48)', url: 'https://www.bankofcanada.ca/2026/10/staff-analytical-paper-2026-48/' },
    ],
    status: 'conditions',
    display: 'Allowed: the Bank lets anyone use, copy and distribute its website content, crediting the Bank and saying if anything was changed, without suggesting the Bank endorses the use.',
    commercial: 'Not limited by the terms for the Bank\'s own content; a paid product that includes it must tell buyers the content is free on the Bank\'s website.',
    attribution: 'Source: Bank of Canada and Bank of England, BoC-BoE Sovereign Default Database (<edition>), Bank of Canada Valet API; figures as published, US$ millions.',
    quotes: [
      'You must attribute the Bank of Canada as the source of the content, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests that the Bank endorses you or your use of the content.',
      'You must exercise due diligence in ensuring the accuracy of any content you reproduce.',
      'The Bank does not grant You permission to re-use such third-party content unless it expressly indicates that You may do so.',
    ],
    flag: 'The database is compiled from published sources (IMF, World Bank, Paris Club and others); the Bank\'s terms withhold permission for third-party content unless stated, and no database-specific licence was found. The Valet API must not be queried around its request limits: the app reads the file at most once a day.',
    share: 'allowed',
    shareNote: 'The Bank\'s terms allow free use and distribution with credit; the third-party caveat is noted above.',
    checked: '2026-11-07',
  },
  {
    id: 'imf_portwatch',
    name: 'IMF PortWatch (daily chokepoint transits and port activity, ArcGIS feature layers)',
    usedFor: 'Ships through eight chokepoints and estimated volume (world series); each country\'s port calls and estimated seaborne imports and exports, monthly averages of daily data',
    terms: [
      { label: 'PortWatch terms of use (page could not be read)', url: 'https://portwatch.imf.org/pages/terms' },
      { label: 'PortWatch data and methodology', url: 'https://portwatch.imf.org/pages/data-and-methodology' },
    ],
    status: 'not_verified',
    display: 'The PortWatch terms page did not give its text to an automated reader, and the layers carry no licence or copyright text.',
    commercial: 'Not confirmed.',
    attribution: 'Source: IMF PortWatch (portwatch.imf.org), daily port and chokepoint data and preliminary trade volume estimates.',
    quotes: [],
    flag: 'Read the PortWatch terms in a browser (portwatch.imf.org/pages/terms) and update this row. PortWatch is an IMF site, so the IMF Copyright and Usage terms may apply, but the AIS ship data come from partners and may carry their own terms.',
    share: 'unclear',
    shareNote: 'Terms not read yet.',
    checked: '2026-11-08',
  },
  {
    id: 'own',
    name: 'Your own paid data (CDS file, LSEG account)',
    usedFor: '5Y sovereign CDS (hidden for now)',
    terms: [{ label: 'Your own contract with the vendor', url: 'https://developers.lseg.com' }],
    status: 'not_verified',
    display: 'Set by your own licence with the vendor. Market data licences usually limit display to licensed users.',
    commercial: 'Set by your own licence.',
    attribution: 'As your vendor contract requires.',
    quotes: [],
    flag: 'Check your vendor contract before CDS figures go into anything shared. The app never ships paid data and never stores the password in exports, backups or the audit log.',
    share: 'restricted',
    shareNote: 'Set by your vendor contract; treated as restricted unless it says otherwise.',
    checked: D,
  },
  {
    id: 'aiddata',
    name: 'AidData Global Chinese Development Finance Dataset, version 3.0',
    usedFor: 'Official loan commitments from China by borrowing country, 2000-2021: per-country sums of version 3.0 shipped in datasets/aiddata/, or a newer file the user puts in data/local/aiddata/ (issuer brief, Fiscal & Debt Agent)',
    terms: [
      { label: 'gcdf-geospatial-data README and LICENSE (AidData, GitHub)', url: 'https://github.com/aiddata/gcdf-geospatial-data' },
      { label: 'Dataset page (citation)', url: 'https://www.aiddata.org/data/aiddatas-global-chinese-development-finance-dataset-version-3-0' },
    ],
    status: 'open',
    display: 'Allowed: the AidData dataset is under the Open Data Commons Attribution License (ODC-By).',
    commercial: 'ODC-By sets no commercial limit; the pages read do not mention commercial use.',
    attribution: 'AidData. 2023. Global Chinese Development Finance Dataset, Version 3.0.',
    quotes: [
      'The original dataset produced by AidData is licensed using the Open Data Commons Attribution License (ODC-By).',
      'Any use of the dataset and its content must include appropriate attribution to AidData',
      'uses incorporating the geospatial features from OSM must also attribute OSM and be made available using ODbL.',
    ],
    flag: 'The licence is stated in AidData\'s GitHub repository for the geospatial edition; the dataset page itself states none and aiddata.org/terms did not load. Use the project-level table only (ODC-By), not the OpenStreetMap shapes (ODbL, share-alike).',
    share: 'allowed',
    shareNote: 'ODC-By allows sharing with credit to AidData.',
    checked: '2026-11-11',
  },
  {
    id: 'imf_lic_dsa',
    name: 'IMF list of low-income country debt sustainability analyses',
    usedFor: 'Risk of external debt distress for each low-income country, with the date of its latest DSA (issuer brief, Fiscal & Debt Agent), typed by hand from the list as of 30 September 2026',
    terms: [{ label: 'LIC DSA list (PDF)', url: 'https://www.imf.org/external/Pubs/ft/dsa/DSAlist.pdf' }],
    status: 'not_verified',
    display: 'Not stated: the one-page list has no terms of use. The ratings are shown as facts with the source, the list date and the day it was read.',
    commercial: 'Not stated.',
    attribution: 'Source: International Monetary Fund, List of IMF/WBG LIC DSAs for PRGT-Eligible Countries, as of September 30, 2026.',
    quotes: [],
    flag: 'The list itself states no terms (copy read 2026-11-11, given by the maintainer). The general IMF copyright and usage page did not load from the build computer; the question is in the email to copyright@imf.org.',
    share: 'unclear',
    shareNote: 'No terms stated on the list; facts quoted with source and date.',
    checked: '2026-11-11',
  },
  {
    id: 'ilostat',
    name: 'ILOSTAT (International Labour Organization)',
    usedFor: 'Average monthly earnings of employees (EAR_4MTH_SEX_ECO_CUR_NB_A): nominal and real wage growth (country brief, Central Bank and Politics agents), downloaded weekly by the daily run',
    terms: [
      { label: 'ILO rights and permissions', url: 'https://www.ilo.org/rights-and-permissions' },
      { label: 'ILOSTAT', url: 'https://ilostat.ilo.org/' },
    ],
    status: 'open',
    display: 'Allowed: ILO databases and datasets published from 3 May 2023 are under CC BY 4.0.',
    commercial: 'Allowed (CC BY 4.0 sets no commercial limit).',
    attribution: 'Source: ILOSTAT, International Labour Organization (ILO).',
    quotes: [
      'As of 3 May 2023, databases and datasets together with the accompanying referential metadata are covered by the Creative Commons CC BY 4.0 licence.',
      'Databases and datasets together with the accompanying referential metadata produced prior to 3 May 2023 do not automatically benefit from a Creative Commons licence.',
    ],
    flag: 'Data produced before 3 May 2023 is not automatically CC BY; the app reads the current ILOSTAT release, published after that date. The ILO name and logo may not be used without written permission.',
    share: 'allowed',
    shareNote: 'CC BY 4.0 allows sharing with credit to the ILO.',
    checked: '2026-11-11',
  },
  {
    id: 'owid_energy',
    name: 'Our World in Data energy file (Energy Institute Statistical Review of World Energy)',
    usedFor: 'Energy mix: shares of coal, oil, gas, nuclear and renewables in primary energy (country brief, Global Spillover Agent), downloaded weekly to this computer by the daily run',
    terms: [
      { label: 'Our World in Data energy data (README)', url: 'https://github.com/owid/energy-data' },
      { label: 'Energy Institute terms', url: 'https://www.energyinst.org/terms' },
      { label: 'Energy Institute Statistical Review', url: 'https://www.energyinst.org/statistical-review' },
    ],
    status: 'permission',
    display: 'Not allowed without the Energy Institute\'s permission: its terms allow private, non-commercial use only. Our World in Data\'s CC BY covers its own work, not the Energy Institute\'s figures.',
    commercial: 'Not allowed without the Energy Institute\'s permission.',
    attribution: 'Energy Institute - Statistical Review of World Energy (year); Our World in Data energy dataset.',
    quotes: [
      'You may only print (or download to disk) the Contents for the purpose of private and personal non-commercial use',
      'is subject to the license terms from the original third-party authors',
    ],
    flag: 'The energy mix shares come from the Energy Institute, whose website terms allow private, non-commercial use only. The maintainer chose (2026-11-11, personal non-commercial use) to have each computer download the file itself and never ship it. Do not show these figures to others or use them commercially without the Energy Institute\'s permission; ask the Energy Institute before any wider use.',
    share: 'restricted',
    shareNote: 'Private, non-commercial use only; not shipped with the app.',
    checked: '2026-11-11',
  },
  {
    id: 'pwt',
    name: 'Penn World Table (Groningen Growth and Development Centre)',
    usedFor: 'Real GDP, capital stock, persons engaged, hours, human capital and labour share for growth accounting (Research > History & data), read once per edition into data/local/pwt/',
    terms: [{ label: 'Penn World Table page (PWT 11.0, October 2025)', url: 'https://www.rug.nl/ggdc/productivity/pwt/' }],
    status: 'open',
    display: 'Allowed under CC BY 4.0.',
    commercial: 'Allowed (CC BY 4.0 sets no commercial limit).',
    attribution: 'Feenstra, Robert C., Robert Inklaar and Marcel P. Timmer (2015), "The Next Generation of the Penn World Table", American Economic Review, 105(10), 3150-3182.',
    quotes: [
      'is licensed under a Creative Commons Attribution 4.0 International License',
      'When using these data (for whatever purpose), please make the following reference:',
    ],
    share: 'allowed',
    shareNote: 'CC BY 4.0 allows sharing with credit.',
    checked: '2026-11-11',
  },  {
    id: 'imf_investor_base',
    name: 'IMF Sovereign Debt Investor Base for Emerging Markets and Developing Economies (Arslanalp and Tsuda)',
    usedFor: 'Who holds government debt: foreign official, foreign banks, foreign other investors, domestic central bank, domestic banks, domestic other investors (country brief, Fiscal & Debt Agent), from the workbook you put in data/local/imf-investor-base/',
    terms: [
      { label: 'IMF Copyright and Usage (Special Terms for Statistical Data)', url: 'https://www.imf.org/en/About/copyright-and-terms' },
      { label: 'Workbook (wp1439.zip)', url: 'https://www.imf.org/-/media/websites/imf/imported-datasets/external/pubs/ft/wp/2014/data/wp1439.zip' },
    ],
    status: 'permission',
    display: 'Allowed with credit under the IMF data terms; the workbook itself states no terms.',
    commercial: 'Needs permission: email copyright@imf.org.',
    attribution: 'Source: International Monetary Fund, Sovereign Debt Investor Base for Emerging Markets and Developing Economies; Arslanalp and Tsuda (2014), IMF Working Paper WP/14/39.',
    quotes: ['The dataset can be quoted as "Sovereign investor base estimates by Arslanalp and Tsuda (2014)".'],
    flag: 'The workbook (version of 6 November 2026, read 2026-11-11, given by the maintainer) and the working paper state no terms; the paper PDF is marked "Not for Redistribution", so neither is shipped with the app. The general IMF statistical data terms are taken to apply (publish with credit; commercial reuse needs permission). Confirm with copyright@imf.org with the other IMF questions.',
    share: 'allowed',
    shareNote: 'IMF Data may be published and distributed with credit; commercial reuse needs permission. The workbook is not shipped.',
    checked: '2026-11-11',
  },
  {
    id: 'dssi_cf',
    name: 'DSSI and Common Framework status (World Bank, Paris Club)',
    usedFor: 'Which countries applied to the Common Framework (and, once typed, which took part in the Debt Service Suspension Initiative), typed by hand with source and date (issuer brief, Fiscal & Debt Agent)',
    terms: [
      { label: 'World Bank DSSI brief', url: 'https://www.worldbank.org/en/brief/2022/03/10/covid-19-debt-service-suspension-initiative' },
      { label: 'Paris Club, Common Framework', url: 'https://clubdeparis.org/en/communications/page/common-framework' },
    ],
    status: 'not_verified',
    display: 'Not stated on either page.',
    commercial: 'Not stated.',
    attribution: 'World Bank, COVID-19 Debt Service Suspension Initiative; Paris Club, Common Framework.',
    quotes: [
      'Forty-eight out of 73 eligible countries participated.',
      'As of 2024, four countries have applied to the Common Framework for a debt treatment: Tchad, Zambia, Ethiopia and Ghana.',
    ],
    flag: 'Neither page states terms. The rows would be facts typed by hand with a link and date, like the official calendar; the World Bank country table did not load and needs reading in a browser.',
    share: 'unclear',
    shareNote: 'No terms stated.',
    checked: '2026-11-11',
  },
];

const P = '2026-11-11';

/** A source a planned roadmap step will read. Not read by the app yet, so not in the in-app register;
 * the row moves into DATA_LICENCES when its step is built. */
export interface PlannedLicenceRow extends LicenceRow {
  plannedFor: string;
}

/** Licence sweep of 11 November 2026 (Wave 0 of the build order): every source a planned step needs,
 * read before the step is built so no step waits on a licence. Same rules as the register above. */
export const PLANNED_LICENCES: PlannedLicenceRow[] = [


  {
    id: 'imf_gfs_fsi',
    name: 'IMF Government Finance Statistics and Financial Soundness Indicators',
    plannedFor: 'G28 Bank-sovereign links (GFS by level of government is in use since G42, under the IMF row)',
    usedFor: 'Bank capital, asset quality and holdings of government debt',
    terms: [{ label: 'IMF Copyright and Usage (Special Terms for Statistical Data)', url: 'https://www.imf.org/en/About/copyright-and-terms' }],
    status: 'permission',
    display: 'Allowed with attribution: GFS is named in the IMF\'s statistical data terms.',
    commercial: 'Needs permission: email copyright@imf.org. Bulk automated download also needs permission.',
    attribution: 'Source: International Monetary Fund, <database name>, <link to the dataset>.',
    quotes: [
      'Users may download, extract, copy, create derivative works, publish, distribute, and use Data obtained from IMF Sites subject to these conditions:',
      'For any potential commercial reuse of IMF Data, email copyright@imf.org to request permission.',
      'The IMF prohibits bulk download of information by automated technology without explicit permission',
    ],
    flag: 'FSI is not named in the terms; it falls under "statistical data ... that explicitly identify the International Monetary Fund as the source". Same commercial and bulk-download limits as the main IMF row.',
    share: 'allowed',
    shareNote: 'IMF Data may be published and distributed with attribution.',
    checked: P,
  },
  {
    id: 'imf_mona',
    name: 'IMF Monitoring of Fund Arrangements (MONA)',
    plannedFor: 'G34 Precedent finder',
    usedFor: 'IMF programmes by country: type, dates, size and conditions',
    terms: [{ label: 'MONA database page', url: 'https://www.imf.org/external/np/pdr/mona/index.aspx' }],
    status: 'not_verified',
    display: 'Not stated on the MONA page.',
    commercial: 'Not stated on the MONA page.',
    attribution: 'Source: International Monetary Fund, Monitoring of Fund Arrangements (MONA) database.',
    quotes: [],
    flag: 'The MONA page has no terms. It is probably covered by the general IMF statistical data terms (publish with attribution, commercial use needs permission), but the page does not say so. Ask copyright@imf.org or treat as the main IMF row only after confirming.',
    share: 'unclear',
    shareNote: 'No terms on the dataset page.',
    checked: P,
  },
  {
    id: 'imf_fiscal_rules',
    name: 'IMF Fiscal Rules Dataset, 1985-2024',
    plannedFor: 'G35 Fiscal rules check',
    usedFor: 'National and supranational fiscal rules by country and year (123 economies)',
    terms: [{ label: 'Fiscal Rules Dataset page (version 1.0 update, 25 September 2025)', url: 'https://www.imf.org/en/topics/fiscal-policies/fiscal-rules-dataset' }],
    status: 'not_verified',
    display: 'Not stated on the dataset page.',
    commercial: 'Not stated on the dataset page.',
    attribution: '"Fiscal Rules Dataset: 1985-2024", International Monetary Fund, Washington, DC (2025), with the authors listed on the page.',
    quotes: [],
    flag: 'The page gives a citation but no terms. Probably under the general IMF statistical data terms; confirm before building G35.',
    share: 'unclear',
    shareNote: 'No terms on the dataset page.',
    checked: P,
  },
  {
    id: 'imf_eba',
    name: 'IMF External Balance Assessment (EBA)',
    plannedFor: 'G24 External sustainability',
    usedFor: 'Published current account norm coefficients',
    terms: [{ label: 'EBA page', url: 'https://www.imf.org/external/np/res/eba/' }],
    status: 'not_verified',
    display: 'Not stated on the EBA page.',
    commercial: 'Not stated on the EBA page.',
    attribution: 'Source: International Monetary Fund, External Balance Assessment.',
    quotes: ['Data and estimates from the EBA exercise are available online.'],
    flag: 'The page says data and estimates are online but does not say whether the coefficients are included or under what terms. Read the methodology paper and data files before G24; if reuse is not allowed, the norm shows "Missing".',
    share: 'unclear',
    shareNote: 'No terms on the page.',
    checked: P,
  },
  {
    id: 'laeven_valencia',
    name: 'Laeven and Valencia, Systemic Banking Crises database (2018 update)',
    plannedFor: 'G23 Crisis early-warning; G34 Precedent finder',
    usedFor: 'Start and end years of systemic banking, currency and sovereign debt crises',
    terms: [
      { label: 'IMF Working Paper 18/206', url: 'https://www.imf.org/en/Publications/WP/Issues/2018/09/14/Systemic-Banking-Crises-Revisited-46232' },
      { label: 'IMF Copyright and Usage', url: 'https://www.imf.org/en/About/copyright-and-terms' },
    ],
    status: 'not_verified',
    display: 'Not stated: the paper has no licence or data statement.',
    commercial: 'Not stated.',
    attribution: 'Laeven, Luc and Fabian Valencia (2018), "Systemic Banking Crises Revisited", IMF Working Paper 18/206.',
    quotes: [],
    flag: 'No data file or terms found on the IMF page. Whether the IMF statistical data terms cover a working paper\'s crisis dates is not stated. The crisis dates could be typed from the paper\'s tables with citation; confirm with the IMF before G23 runs.',
    share: 'unclear',
    shareNote: 'No terms found.',
    checked: P,
  },
  {
    id: 'dpi',
    name: 'Database of Political Institutions 2020 (Inter-American Development Bank)',
    plannedFor: 'G36 Political feasibility',
    usedFor: 'Checks and balances, government fractionalisation, election timing',
    terms: [{ label: 'DPI 2020 publication page (IDB)', url: 'https://publications.iadb.org/en/database-political-institutions-2020-dpi2020' }],
    status: 'not_verified',
    display: 'Not stated on the publication page.',
    commercial: 'Not stated.',
    attribution: 'Database of Political Institutions 2020 (DPI2020), Inter-American Development Bank; take the full citation from the download page when it is found.',
    quotes: [],
    flag: 'The IDB page has no licence or data link, and the DPI was not found on data.iadb.org. Find the download page in a browser and read its licence before G36.',
    share: 'unclear',
    shareNote: 'No licence found.',
    checked: P,
  },
  {
    id: 'ndgain',
    name: 'ND-GAIN Country Index (University of Notre Dame)',
    plannedFor: 'G20 Climate and energy',
    usedFor: 'Climate vulnerability and readiness scores',
    terms: [
      { label: 'ND-GAIN download page', url: 'https://gain.nd.edu/our-work/country-index/download-data/' },
      { label: 'University of Notre Dame copyright page', url: 'https://www.nd.edu/copyright/' },
    ],
    status: 'not_verified',
    display: 'Not stated: the page calls the index "free and open-access" but gives no licence.',
    commercial: 'Not stated.',
    attribution: 'Notre Dame Global Adaptation Initiative Country Index (ND-GAIN). (Year). University of Notre Dame.',
    quotes: ['As a free and open-access tool, ND-GAIN appreciates understanding how the Country Index is used.'],
    flag: 'No licence stated. Ask ND-GAIN in writing whether the scores may be redistributed inside an open-source app before G20 uses them.',
    share: 'unclear',
    shareNote: '"Free and open-access" is not a licence.',
    checked: P,
  },
];

/** The rows with an open question, in register order. */
export function openLicenceQuestions(rows: LicenceRow[] = DATA_LICENCES): LicenceRow[] {
  return rows.filter((r) => r.flag && r.status !== 'open');
}

/** docs/DATA_LICENCES.md, generated from the register. */
export function licencesMarkdown(rows: LicenceRow[] = DATA_LICENCES): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const out: string[] = [
    '# Data licences',
    '',
    '<!-- Generated from src/data/dataLicences.ts by `npm run docs:licences`. Edit that file, not this one. -->',
    '',
    'What each outside source\'s own terms say about showing its figures to other people (clients, colleagues, a',
    'published note) and about commercial use, with the credit it asks for. Each quote was read on the source\'s',
    'terms page on the date shown. Where a page could not be read or does not answer the question, the row says',
    '"Terms not confirmed" rather than guessing. This is a research note, not legal advice: a question that',
    'matters for a client or a sale should go to the provider in writing.',
    '',
    'Each row\'s terms are read again at least once a year; the app marks a row "Licence check due" when its',
    'date is more than 12 months old (docs/MAINTENANCE.md).',
    '',
    'The same register is in the app under **Menu > About & data licences**. Every export (council briefs and',
    'documents, policy memos, reports, notebooks, chart CSVs, Excel downloads, backups) ends with the line',
    '"Research, not validated advice." and points here (src/utils/disclaimer.ts).',
    '',
    '| Status | Meaning |',
    '| --- | --- |',
    ...(Object.keys(LICENCE_STATUS_LABEL) as LicenceStatus[]).map((s) => `| ${LICENCE_STATUS_LABEL[s]} | ${LICENCE_STATUS_HELP[s]} |`),
    '',
    '## Summary',
    '',
    '| Source | Status | Free non-commercial sharing | Show to others | Commercial use | Credit |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${esc(r.name)} | ${LICENCE_STATUS_LABEL[r.status]} | ${LICENCE_SHARE_LABEL[r.share]} | ${esc(r.display)} | ${esc(r.commercial)} | ${esc(r.attribution)} |`),
    '',
    '## Sources',
    '',
  ];
  for (const r of rows) {
    out.push(`### ${r.name}`, '');
    out.push(`- **Used for:** ${r.usedFor}`);
    out.push(`- **Status:** ${LICENCE_STATUS_LABEL[r.status]}`);
    out.push(`- **Free non-commercial sharing:** ${LICENCE_SHARE_LABEL[r.share]}. ${r.shareNote}`);
    out.push(`- **Terms read:** ${r.terms.map((t) => `[${t.label}](${t.url})`).join('; ')} (checked ${r.checked})`);
    out.push(`- **Show to others:** ${r.display}`);
    out.push(`- **Commercial use:** ${r.commercial}`);
    out.push(`- **Credit:** ${r.attribution}`);
    if (r.ended) out.push(`- **Ended:** ${r.ended}. Figures keep their last date; nothing is filled in from another source.`);
    if (r.flag) out.push(`- **Open question:** ${r.flag}`);
    if (r.quotes.length) {
      out.push('', 'From the terms:', '');
      for (const q of r.quotes) out.push(`> ${q}`, '>');
      out.pop();
    }
    out.push('');
  }
  if (rows === DATA_LICENCES) {
    out.push('## Sources planned, not read by the app yet', '');
    out.push('Read in the licence sweep of 11 November 2026, before the steps that need them are built. Each row moves into the register above when its step is built. UN Comtrade (G18) and the IMF datasets already read are covered by the rows above.', '');
    out.push('| Source | Planned for | Status | Free non-commercial sharing | Credit |', '| --- | --- | --- | --- | --- |');
    for (const r of PLANNED_LICENCES) out.push(`| ${esc(r.name)} | ${esc(r.plannedFor)} | ${LICENCE_STATUS_LABEL[r.status]} | ${LICENCE_SHARE_LABEL[r.share]} | ${esc(r.attribution)} |`);
    out.push('');
    for (const r of PLANNED_LICENCES) {
      out.push(`### ${r.name}`, '');
      out.push(`- **Planned for:** ${r.plannedFor}`);
      out.push(`- **Will be used for:** ${r.usedFor}`);
      out.push(`- **Status:** ${LICENCE_STATUS_LABEL[r.status]}`);
      out.push(`- **Free non-commercial sharing:** ${LICENCE_SHARE_LABEL[r.share]}. ${r.shareNote}`);
      out.push(`- **Terms read:** ${r.terms.map((t) => `[${t.label}](${t.url})`).join('; ')} (checked ${r.checked})`);
      out.push(`- **Show to others:** ${r.display}`);
      out.push(`- **Commercial use:** ${r.commercial}`);
      out.push(`- **Credit:** ${r.attribution}`);
      if (r.flag) out.push(`- **Before building:** ${r.flag}`);
      if (r.quotes.length) {
        out.push('', 'From the terms:', '');
        for (const q of r.quotes) out.push(`> ${q}`, '>');
        out.pop();
      }
      out.push('');
    }
  }
  const open = openLicenceQuestions(rows);
  out.push('## Open questions', '');
  if (!open.length) out.push('None.', '');
  open.forEach((r, i) => out.push(`${i + 1}. **${r.name}** (${LICENCE_STATUS_LABEL[r.status]}): ${r.flag}`));
  out.push('');
  return out.join('\n');
}
