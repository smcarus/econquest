/**
 * Definition tags (data plan G6): every series says what it measures and whose figure it is, so two
 * numbers with the same name are not mistaken for each other (general government debt is not
 * central government debt; consumer prices are not the GDP deflator).
 *
 * The tags come from each source's own definition of the series, written here once per series id.
 * A series the table does not know says so ("Not stated yet") rather than guessing.
 *
 * Seasonal adjustment and how each series' points are formed (data plan G7), and real or nominal, base
 * year and currency (data plan G8), are filled here too.
 *
 * Browser-safe: no fs, no network.
 */

/** Whose figure it is. A short, fixed list, so every screen and language shows the same words. */
export const COVERAGE = {
  generalGov: 'General government (central, state and local government and social security)',
  centralGov: 'Central government',
  ppg: 'Public and publicly guaranteed debt owed abroad',
  govDefault: 'Government debt',
  wholeEconomy: 'Whole economy',
  industry: 'Industry',
  allSectors: 'All sectors of the economy, public and private',
  privateNonFin: 'Households and non-financial firms',
  householdSector: 'Households and the non-profit bodies that serve them',
  nonFinFirms: 'Non-financial companies',
  households: 'Households (consumer prices)',
  centralBank: 'Central bank',
  market: 'Market prices',
  forecasters: 'Survey of professional forecasters',
  firmsHouseholds: 'Survey of firms and households',
  futures: 'Futures market participants',
  foreignHolders: 'Foreign holders of US Treasury securities',
  shipping: 'Ships and seaborne trade',
  country: 'The whole country',
  governance: 'The country\'s governance, as experts and surveys rate it',
  world: 'World market',
  financial: 'Financial markets',
  model: 'Model estimate by the source',
  appCalc: 'App calculation from the figures named in the source',
  own: 'Your own file',
  paid: 'Your own subscription',
  notStated: 'Not stated yet',
  banks: 'Banks and other deposit-taking institutions',
} as const;
export type CoverageKey = keyof typeof COVERAGE;

/**
 * The label fields a series carries. G6 fills `definition` and `coverage`; the rest stay empty
 * until G7 (seasonal adjustment) and G8 (real or nominal, base year, currency).
 */
export interface SeriesTags {
  /** What exactly it measures, from the source's own definition. */
  definition: string;
  /** Whose figure it is (one of COVERAGE). */
  coverage: string;
  /** G7: seasonally adjusted, not adjusted, or not applicable (one of SEASONAL). */
  seasonalAdjustment?: string;
  /** G7: how the observations are formed from more frequent data, and how the app turns months into quarters. */
  frequencyNote?: string;
  /** G8: real, nominal, share of GDP, index, rate and so on (one of MEASURE). */
  measure?: string;
  /** G8: base year of an index or of constant prices. */
  baseYear?: string;
  /** G8: currency of an amount, with market rate or purchasing power parity (one of CURRENCY). */
  currency?: string;
}

type Def = { definition: string; coverage: CoverageKey };
const d = (definition: string, coverage: CoverageKey): Def => ({ definition, coverage });

/** Exact series ids. */
const BY_ID: Record<string, Def> = {
  // Monetary and prices
  policy_rate: d('The central bank\'s main policy interest rate, as collected by the BIS', 'centralBank'),
  cpi_monthly: d('Consumer price index, change on the same month a year earlier', 'households'),
  cpi_imf: d('Consumer prices, change in the yearly average (IMF WEO PCPIPCH)', 'households'),
  cpi_index: d('Consumer price index, yearly average, 2010 = 100 (World Bank FP.CPI.TOTL)', 'households'),
  broad_money_gdp: d('Broad money: currency, deposits and similar claims held outside banks, as % of GDP (World Bank FM.LBL.BMNY.GD.ZS)', 'allSectors'),
  // Activity
  cli: d('OECD composite leading indicator, amplitude adjusted, 100 = long-term trend', 'wholeEconomy'),
  gdp_qoq: d('Real GDP (volume), change on the previous quarter', 'wholeEconomy'),
  gdp_yoy_q: d('Real GDP (volume), change on the same quarter a year earlier', 'wholeEconomy'),
  gdp_growth: d('Real GDP at constant prices, yearly change (IMF WEO NGDP_RPCH)', 'wholeEconomy'),
  gdp_usd: d('GDP at current prices in US dollars (IMF WEO NGDPD)', 'wholeEconomy'),
  gdp_pc_ppp: d('GDP per head at purchasing power parity, constant 2021 international dollars (World Bank NY.GDP.PCAP.PP.KD)', 'wholeEconomy'),
  output_gap: d('Actual GDP minus potential GDP, as % of potential (IMF WEO NGAP_NPGDP, or the app estimate where the IMF has none)', 'wholeEconomy'),
  unemployment: d('Unemployed people as % of the labour force, national definitions (IMF WEO LUR)', 'country'),
  population: d('Total population at mid-year (World Bank SP.POP.TOTL)', 'country'),
  // Public finances
  debt_gdp: d('General government gross debt, as % of GDP (IMF WEO GGXWDG_NGDP)', 'generalGov'),
  primary_balance: d('General government net lending or borrowing excluding interest, as % of GDP (IMF Fiscal Monitor)', 'generalGov'),
  overall_balance: d('General government net lending or borrowing, interest included, as % of GDP (IMF Fiscal Monitor)', 'generalGov'),
  revenue: d('General government revenue, as % of GDP (IMF Fiscal Monitor)', 'generalGov'),
  expenditure: d('General government total expenditure, interest included, as % of GDP (IMF Fiscal Monitor)', 'generalGov'),
  // External
  current_account: d('Current account balance, as % of GDP (World Bank BN.CAB.XOKA.GD.ZS)', 'allSectors'),
  current_account_usd: d('Current account balance in US dollars (IMF WEO BCA)', 'allSectors'),
  exports_usd: d('Exports of goods and services in current US dollars (World Bank NE.EXP.GNFS.CD)', 'allSectors'),
  terms_of_trade: d('Net barter terms of trade: export unit values over import unit values, 2015 = 100', 'allSectors'),
  reserves_months: d('Total reserves including gold, in months of imports (World Bank FI.RES.TOTL.MO)', 'centralBank'),
  reserves_usd: d('Total reserves including gold, in US dollars (World Bank FI.RES.TOTL.CD)', 'centralBank'),
  gini: d('Gini index of income or consumption from household surveys, 0 = everyone equal, 100 = one person has everything (World Bank SI.POV.GINI)', 'households'),
  tax_revenue: d('Tax revenue of the central government, as % of GDP; states, local government and social security are not included (World Bank GC.TAX.TOTL.GD.ZS)', 'centralGov'),
  tax_income: d('Taxes on income, profits and capital gains, as % of central government revenue (World Bank GC.TAX.YPKG.RV.ZS)', 'centralGov'),
  tax_goods: d('Taxes on goods and services, as % of central government revenue (World Bank GC.TAX.GSRV.RV.ZS)', 'centralGov'),
  tax_trade: d('Taxes on international trade, as % of central government revenue (World Bank GC.TAX.INTT.RV.ZS)', 'centralGov'),
  tariff_weighted: d('Applied tariff rate on all products, weighted by import shares (World Bank TM.TAX.MRCH.WM.AR.ZS, from WITS/TRAINS)', 'country'),
  tariff_simple: d('Applied tariff rate on all products, simple mean over product lines (World Bank TM.TAX.MRCH.SM.AR.ZS, from WITS/TRAINS)', 'country'),
  poverty_lowest: d('Share of people living below the lowest international poverty line, from household surveys (World Bank SI.POV.DDAY)', 'country'),
  poverty_lower_middle: d('Share of people living below the poverty line used for lower-middle-income countries, from household surveys (World Bank SI.POV.LMIC)', 'country'),
  poverty_upper_middle: d('Share of people living below the poverty line used for upper-middle-income countries, from household surveys (World Bank SI.POV.UMIC)', 'country'),
  remittances: d('Personal remittances received, money sent home by people working abroad, as % of GDP (World Bank BX.TRF.PWKR.DT.GD.ZS)', 'country'),
  labour_participation: d('People aged 15 and over in work or looking for work, as % of all people aged 15 and over, ILO modelled estimate (World Bank SL.TLF.CACT.ZS)', 'model'),
  youth_unemployment: d('Unemployed people aged 15-24 as % of the labour force aged 15-24, ILO modelled estimate (World Bank SL.UEM.1524.ZS)', 'model'),
  age_dependency: d('People younger than 15 or older than 64 per 100 people aged 15-64 (World Bank SP.POP.DPND)', 'country'),
  interest_revenue: d('Interest payments of the central government, as % of its revenue (World Bank GC.XPN.INTP.RV.ZS)', 'centralGov'),
  export_fuel: d('Fuels (oil, gas, coal and refined products) as % of merchandise exports (World Bank TX.VAL.FUEL.ZS.UN)', 'country'),
  export_ores_metals: d('Ores and metals as % of merchandise exports (World Bank TX.VAL.MMTL.ZS.UN)', 'country'),
  export_food: d('Food as % of merchandise exports (World Bank TX.VAL.FOOD.ZS.UN)', 'country'),
  export_manuf: d('Manufactured goods as % of merchandise exports (World Bank TX.VAL.MANF.ZS.UN)', 'country'),
  import_fuel: d('Fuels (oil, gas, coal and refined products) as % of merchandise imports (World Bank TM.VAL.FUEL.ZS.UN)', 'country'),
  import_ores_metals: d('Ores and metals as % of merchandise imports (World Bank TM.VAL.MMTL.ZS.UN)', 'country'),
  import_food: d('Food as % of merchandise imports (World Bank TM.VAL.FOOD.ZS.UN)', 'country'),
  import_manuf: d('Manufactured goods as % of merchandise imports (World Bank TM.VAL.MANF.ZS.UN)', 'country'),
  ghg_per_head: d('All greenhouse gases excluding land use, tonnes of CO2 equivalent per person (World Bank EN.GHG.ALL.PC.CE.AR5, from EDGAR)', 'country'),
  renewable_share: d('Renewable energy as % of final energy consumption, including traditional biomass (World Bank EG.FEC.RNEW.ZS)', 'country'),
  net_energy_imports: d('Energy use minus production, as % of energy use; negative = net exporter (World Bank EG.IMP.CONS.ZS)', 'country'),
  external_debt: d('Total external debt stocks, public and private, as % of GNI (World Bank DT.DOD.DECT.GN.ZS)', 'allSectors'),
  short_term_debt_reserves: d('External debt due within one year (original maturity), as % of reserves', 'allSectors'),
  short_term_debt_usd: d('External debt with original maturity of one year or less, in US dollars', 'allSectors'),
  external_debt_usd: d("Total external debt stocks, public and private, in US dollars (World Bank DT.DOD.DECT.CD)", 'allSectors'),
  ext_debt_service_usd: d("Principal and interest paid on total external debt in the year, in US dollars (World Bank DT.TDS.DECT.CD)", 'allSectors'),
  ext_interest_usd: d("Interest paid on total external debt in the year, in US dollars (World Bank DT.INT.DECT.CD)", 'allSectors'),
  bank_assets_gdp: d("Assets of deposit money banks, % of GDP (World Bank GFDD.DI.02)", 'banks'),
  bank_claims_gov_gdp: d("Claims of deposit-taking institutions on central government, % of GDP (World Bank FS.AST.CGOV.GD.ZS, from IMF monetary statistics)", 'banks'),
  bank_capital_assets: d("Bank capital and reserves as % of total assets, not risk-weighted (World Bank FB.BNK.CAPA.ZS, from IMF Financial Soundness Indicators)", 'banks'),
  bank_npl: d("Non-performing loans as % of gross bank loans (World Bank FB.AST.NPER.ZS, from IMF Financial Soundness Indicators)", 'banks'),
  fdi_in_gdp: d('Direct investment into the country by foreigners, net of disinvestment, as % of GDP', 'allSectors'),
  fdi_out_gdp: d('Direct investment abroad by residents, net of disinvestment, as % of GDP', 'allSectors'),
  fdi_net_usd: d('Net direct investment in the balance of payments (BPM6 sign), in US dollars', 'allSectors'),
  portfolio_net_usd: d('Net portfolio investment in the balance of payments (BPM6 sign), in US dollars', 'allSectors'),
  financial_account_usd: d('Net financial account of the balance of payments (BPM6 sign), in US dollars', 'allSectors'),
  // Exchange rates
  fx_per_usd: d('Units of the country\'s currency per US dollar, reference or official rate', 'market'),
  fx_lcu_usd: d('Official exchange rate, local currency per US dollar, yearly average (World Bank PA.NUS.FCRF)', 'market'),
  ppp_factor: d('PPP conversion factor for GDP, local currency per international dollar (World Bank ICP)', 'wholeEconomy'),
  // Markets
  yield_10y: d('Yield on the government\'s 10-year bond, in its own currency', 'centralGov'),
  hc_spread: d('Spread of the government\'s US dollar bonds over US Treasuries (J.P. Morgan EMBI Global, via BCRP); not CDS', 'centralGov'),
  implied_pd_5y: d('Chance of default over five years implied by the US dollar bond spread, with an assumed recovery', 'appCalc'),
  cftc_lev_net: d('Leveraged funds\' net long position in the currency future, as % of open interest (CFTC TFF)', 'futures'),
  tic_holdings: d('US Treasury securities held in the country, as US Treasury TIC reports them (SLT table 5)', 'foreignHolders'),
  gdelt_tone: d('Average tone of news articles about the country (GDELT)', 'country'),
  stability: d('World Bank WGI political stability estimate, shown on a 0 to 100 scale', 'governance'),
  // Credit cycle (BIS)
  credit_gap: d('Credit to households and non-financial firms as % of GDP, minus its long-run trend (BIS)', 'privateNonFin'),
  credit_gdp: d('Credit to households and non-financial firms from all lenders, as % of GDP (BIS)', 'privateNonFin'),
  debt_service_ratio: d('Interest and principal paid by households and non-financial firms, as % of their income (BIS)', 'privateNonFin'),
  house_prices_real_yoy: d('Residential property prices deflated by consumer prices, change on a year earlier (BIS)', 'households'),
  house_prices_nominal_yoy: d('Residential property prices in local currency, change on a year earlier (BIS)', 'households'),
  industrial_production: d('Output of mining, manufacturing and utilities (industry excluding construction), volume index, from the statistics office or central bank named in the source', 'industry'),
  retail_sales: d('Retail sales, volume index (the United States: retail and food services sales in US dollars, not adjusted for prices), from the statistics office named in the source', 'wholeEconomy'),
  unemployment_monthly: d('Unemployed people as % of the labour force, monthly (the UK and Brazil: three months to the month), from the statistics office named in the source', 'country'),
  household_debt: d('Credit to households from all lenders, % of GDP, market value, break-adjusted (BIS total credit)', 'householdSector'),
  corporate_debt: d('Credit to non-financial companies from all lenders, % of GDP, market value, break-adjusted (BIS total credit)', 'nonFinFirms'),
  current_account_imf: d('Current account balance, % of GDP (IMF WEO BCA_NGDPD)', 'allSectors'),
  private_balance: d('Households and firms: saving minus investment, % of GDP, worked out as current account minus government balance (remainder of the identity)', 'privateNonFin'),
  foreign_balance: d('Rest of the world lending to the country, % of GDP: minus the current account', 'allSectors'),
  // Public external debt (World Bank IDS)
  ppg_external_usd: d('Public and publicly guaranteed external debt outstanding at year end, in US dollars (World Bank IDS)', 'ppg'),
  ppg_multilateral_share: d('Share of public external debt owed to multilateral lenders (World Bank IDS)', 'ppg'),
  ppg_bilateral_share: d('Share of public external debt owed to other governments (World Bank IDS)', 'ppg'),
  ppg_bonds_share: d('Share of public external debt owed to bondholders (World Bank IDS)', 'ppg'),
  ppg_banks_share: d('Share of public external debt owed to commercial banks (World Bank IDS)', 'ppg'),
  ppg_china_share: d('Share of public external debt owed to Chinese lenders (World Bank IDS)', 'ppg'),
  ppg_usd_share: d('Share of public external debt in US dollars (World Bank IDS)', 'ppg'),
  new_loans_rate_official: d('Average interest rate on new external loans from official lenders (World Bank IDS)', 'ppg'),
  new_loans_rate_private: d('Average interest rate on new external loans and bonds from private lenders (World Bank IDS)', 'ppg'),
  new_loans_maturity_official: d('Average maturity of new external loans from official lenders (World Bank IDS)', 'ppg'),
  new_loans_maturity_private: d('Average maturity of new external loans and bonds from private lenders (World Bank IDS)', 'ppg'),
  // Defaults (Bank of Canada and Bank of England database)
  default_total_usd: d('Government debt in default, all creditors, in US dollars (BoC-BoE database)', 'govDefault'),
  default_fc_bonds_usd: d('Government foreign-currency bonds in default, in US dollars (BoC-BoE database)', 'govDefault'),
  default_fc_banks_usd: d('Government foreign-currency bank loans in default, in US dollars (BoC-BoE database)', 'govDefault'),
  default_paris_club_usd: d('Government debt to Paris Club governments in default, in US dollars (BoC-BoE database)', 'govDefault'),
  default_china_usd: d('Government debt to Chinese official lenders in default, in US dollars (BoC-BoE database)', 'govDefault'),
  default_imf_usd: d('Government arrears to the IMF, in US dollars (BoC-BoE database)', 'govDefault'),
  default_lc_usd: d('Government local-currency debt in default, in US dollars (BoC-BoE database)', 'govDefault'),
  // Inflation expectations
  us_breakeven_5y: d('5-year Treasury yield minus the 5-year TIPS yield (FRED T5YIE)', 'market'),
  us_breakeven_10y: d('10-year Treasury yield minus the 10-year TIPS yield (FRED T10YIE)', 'market'),
  us_5y5y_forward: d('Expected average inflation over the five years starting five years ahead, from breakevens (FRED T5YIFR)', 'market'),
  us_expinf_1y: d('Cleveland Fed model estimate of expected inflation over the next year', 'model'),
  us_expinf_10y: d('Cleveland Fed model estimate of expected average inflation over the next ten years', 'model'),
  spf_hicp_1y: d('Mean forecast of euro area HICP inflation one year ahead (ECB SPF)', 'forecasters'),
  spf_hicp_2y: d('Mean forecast of euro area HICP inflation two years ahead (ECB SPF)', 'forecasters'),
  spf_hicp_lt: d('Mean forecast of euro area HICP inflation about five years ahead (ECB SPF)', 'forecasters'),
  focus_ipca_12m: d('Median forecast of IPCA inflation over the next 12 months (BCB Focus survey)', 'forecasters'),
  // Shipping (IMF PortWatch)
  portwatch_port_calls: d('Ship calls per day at the country\'s ports, monthly average (IMF PortWatch)', 'shipping'),
  portwatch_imports: d('Estimated cargo unloaded per day at the country\'s ports, monthly average (IMF PortWatch)', 'shipping'),
  portwatch_exports: d('Estimated cargo loaded per day at the country\'s ports, monthly average (IMF PortWatch)', 'shipping'),
  // EU business and consumer surveys (European Commission)
  eu_survey_esi: d('European Commission economic sentiment indicator, 100 = long-term average; not a PMI', 'firmsHouseholds'),
  eu_survey_industry: d('Balance of positive minus negative replies from manufacturers (European Commission); not a PMI', 'firmsHouseholds'),
  eu_survey_services: d('Balance of positive minus negative replies from service firms (European Commission); not a PMI', 'firmsHouseholds'),
  eu_survey_consumer: d('Balance of positive minus negative replies from consumers (European Commission); not a PMI', 'firmsHouseholds'),
  eu_survey_employment: d('Employment expectations indicator, 100 = long-term average (European Commission); not a PMI', 'firmsHouseholds'),
  eu_survey_prices: d("Balance of households expecting prices to rise faster minus those expecting slower rises or falls over the next 12 months (European Commission consumer survey); an expectation, not an inflation rate", 'firmsHouseholds'),
  // Stress and supply chain indices
  stress_stlfsi: d('St. Louis Fed Financial Stress Index (STLFSI4): zero = average stress', 'financial'),
  stress_nfci: d('Chicago Fed National Financial Conditions Index: zero = average, positive = tighter', 'financial'),
  stress_anfci: d('Chicago Fed adjusted NFCI: financial conditions with the part explained by the economy taken out', 'financial'),
  // World Bank Worldwide Governance Indicators: estimates with world mean 0 and standard deviation 1.
  wgi_voice: d('World Bank WGI estimate of voice and accountability', 'governance'),
  wgi_stability: d('World Bank WGI estimate of political stability and absence of violence', 'governance'),
  wgi_effectiveness: d('World Bank WGI estimate of government effectiveness', 'governance'),
  wgi_regulatory: d('World Bank WGI estimate of regulatory quality', 'governance'),
  wgi_rule_of_law: d('World Bank WGI estimate of rule of law', 'governance'),
  wgi_corruption: d('World Bank WGI estimate of control of corruption', 'governance'),
  gscpi: d('NY Fed Global Supply Chain Pressure Index: standard deviations from average pressure', 'world'),
};

/** Ids built from a pattern. */
const BY_PATTERN: Array<{ re: RegExp; def: Def }> = [
  { re: /^ust_auction_btc_/, def: d('Bids received divided by the amount sold at the US Treasury auction', 'centralGov') },
  { re: /^ust_auction_high_yield_/, def: d('Highest accepted yield at the US Treasury auction', 'centralGov') },
  { re: /^portwatch_.+_ships$/, def: d('Ships passing the chokepoint per day, monthly average (IMF PortWatch)', 'shipping') },
  { re: /^portwatch_.+_volume$/, def: d('Estimated cargo passing the chokepoint per day, monthly average (IMF PortWatch)', 'shipping') },
  { re: /^commodity_pink_sheet_/, def: d('World Bank Pink Sheet monthly average price for the commodity named', 'world') },
  { re: /^commodity_eia_/, def: d('US EIA daily spot price for the product named', 'world') },
];

/** Activity index: Brazil's IBC-Br covers the economy, Eurostat's index covers industry only. */
function activityDef(source: string): Def {
  return /IBC-Br|Banco Central do Brasil/i.test(source)
    ? d('Central Bank of Brazil economic activity index (IBC-Br), a monthly stand-in for GDP', 'wholeEconomy')
    : d('Industrial production volume index, industry excluding construction (Eurostat)', 'industry');
}

/** The tag fields for one series: from the table, or "Not stated yet" where it has no entry. */
export function seriesTags(s: { id: string; source?: string; freq?: string; own?: boolean; paid?: boolean }): SeriesTags {
  if (s.own) {
    const said = 'As you described it when you loaded the file';
    return { definition: said, coverage: COVERAGE.own, seasonalAdjustment: said, measure: said };
  }
  if (s.paid) {
    const said = 'As your vendor defines the series code you mapped';
    return { definition: said, coverage: COVERAGE.paid, seasonalAdjustment: said, measure: said };
  }
  const def = s.id === 'activity_monthly' ? activityDef(s.source || '') : BY_ID[s.id] ?? BY_PATTERN.find((p) => p.re.test(s.id))?.def;
  const note = frequencyNoteFor(s);
  const u = unitsFor(s);
  const timing = {
    seasonalAdjustment: seasonalFor(s),
    ...(note ? { frequencyNote: note } : {}),
    measure: u ? MEASURE[u[0]] : COVERAGE.notStated,
    ...(u?.[1] ? { currency: CURRENCY[u[1]] } : {}),
    ...(u?.[2] ? { baseYear: u[2] } : {}),
  };
  if (!def) return { definition: COVERAGE.notStated, coverage: COVERAGE.notStated, ...timing };
  return { definition: def.definition, coverage: COVERAGE[def.coverage], ...timing };
}

/**
 * Seasonal adjustment (data plan G7), from a short fixed list. Taken from how the app asks each source
 * for the series (for example the OECD's ADJUSTMENT code, Eurostat's s_adj=SA); where the source does
 * not say, "Not stated by the source".
 */
export const SEASONAL = {
  sa: 'Seasonally adjusted',
  sca: 'Seasonally and calendar adjusted',
  nsa: 'Not seasonally adjusted',
  yoy: 'A change on a year earlier, so seasonal swings largely cancel',
  yearly: 'Not applicable: one figure per year',
  market: 'Not applicable: a market price, rate or position on the day',
  forecast: 'Not applicable: a forecast of inflation a year or more ahead',
  notStated: 'Not stated by the source',
} as const;
type SeasonalKey = keyof typeof SEASONAL;

const SEASONAL_BY_ID: Record<string, SeasonalKey> = {
  policy_rate: 'market',
  cpi_monthly: 'yoy',
  cli: 'sa', // the OECD builds it from seasonally adjusted components (ADJUSTMENT AA = amplitude adjusted)
  gdp_qoq: 'sca', // OECD ADJUSTMENT Y: calendar and seasonally adjusted
  gdp_yoy_q: 'sca',
  cftc_lev_net: 'market',
  tic_holdings: 'nsa',
  hc_spread: 'market',
  implied_pd_5y: 'market',
  fx_per_usd: 'market',
  yield_10y: 'market',
  gdelt_tone: 'nsa',
  credit_gap: 'notStated',
  credit_gdp: 'notStated',
  debt_service_ratio: 'notStated',
  house_prices_real_yoy: 'yoy',
  house_prices_nominal_yoy: 'yoy',
  household_debt: 'notStated',
  corporate_debt: 'notStated',
  us_breakeven_5y: 'market',
  us_breakeven_10y: 'market',
  us_5y5y_forward: 'market',
  us_expinf_1y: 'nsa', // FRED series page: not seasonally adjusted
  us_expinf_10y: 'nsa',
  spf_hicp_1y: 'forecast',
  spf_hicp_2y: 'forecast',
  spf_hicp_lt: 'forecast',
  focus_ipca_12m: 'forecast',
  portwatch_port_calls: 'nsa',
  portwatch_imports: 'nsa',
  portwatch_exports: 'nsa',
  stress_stlfsi: 'market',
  stress_nfci: 'market',
  stress_anfci: 'market',
  gscpi: 'notStated',
};
const SEASONAL_BY_PATTERN: Array<{ re: RegExp; key: SeasonalKey }> = [
  { re: /^eu_survey_/, key: 'sa' }, // Eurostat s_adj=SA
  { re: /^ust_auction_/, key: 'market' },
  { re: /^portwatch_/, key: 'nsa' },
  { re: /^commodity_/, key: 'market' },
];

const MONTHS_TO_QUARTERS =
  'Monthly. Where the app needs quarters (the GDP nowcast), it averages the three months of each quarter; a month not yet published is forecast from the series\' own past and flagged as a forecast';
/** How each series' points are formed, where that is not plain from its frequency. */
const FREQUENCY_NOTE_BY_ID: Record<string, string> = {
  policy_rate: 'Daily rates; for a long history the app shows month-end rates, then the latest daily figures',
  cli: MONTHS_TO_QUARTERS,
  activity_monthly: MONTHS_TO_QUARTERS,
  hc_spread: 'Monthly average of daily spreads',
  focus_ipca_12m: 'Weekly survey; the app shows the last reading of each month',
  cftc_lev_net: 'Weekly, positions as of each Tuesday',
  tic_holdings: 'Monthly, holdings at the end of each month',
  fx_per_usd: 'Daily reference rates on working days; no figure on weekends and holidays',
};
const FREQUENCY_NOTE_BY_PATTERN: Array<{ re: RegExp; note: string }> = [
  { re: /^portwatch_/, note: 'Daily counts averaged over each month' },
  { re: /^ust_auction_/, note: 'One point per auction: bills about every week, notes and bonds about once a month' },
];
const PER_PULL_NOTE = 'One point per saved download: the figure as the app saw it that day, not a new observation';

function seasonalFor(s: { id: string; source?: string; freq?: string }): string {
  if (s.id === 'activity_monthly') return /IBC-Br|Banco Central do Brasil/i.test(s.source || '') ? SEASONAL.sa : SEASONAL.sca;
  // Monthly activity (G41): as each source is asked for it; the BCB copies of IBGE series do not say.
  if (s.id === 'industrial_production' || s.id === 'retail_sales' || s.id === 'unemployment_monthly') {
    const src = s.source || '';
    if (/BCB SGS/.test(src)) return SEASONAL.notStated;
    if (/^Eurostat/.test(src)) return s.id === 'unemployment_monthly' ? SEASONAL.sa : SEASONAL.sca;
    return SEASONAL.sa;
  }
  const key = SEASONAL_BY_ID[s.id] ?? SEASONAL_BY_PATTERN.find((p) => p.re.test(s.id))?.key;
  if (key) return SEASONAL[key];
  // Yearly official figures (IMF, World Bank, BIS yearly, defaults): one figure per year.
  if (s.freq === 'annual' || (s.freq === 'per pull' && BY_ID[s.id])) return SEASONAL.yearly;
  return SEASONAL.notStated;
}

function frequencyNoteFor(s: { id: string; freq?: string }): string | undefined {
  if (s.freq === 'per pull') return PER_PULL_NOTE;
  return FREQUENCY_NOTE_BY_ID[s.id] ?? FREQUENCY_NOTE_BY_PATTERN.find((p) => p.re.test(s.id))?.note;
}

/**
 * Units (data plan G8): real or nominal, the base year of an index or of constant prices, and the
 * currency, including whether dollar amounts use market exchange rates or purchasing power parity.
 * From each source's own description of the series (the IMF and World Bank indicator definitions, the
 * OECD and Eurostat dimension codes the app asks for). Short fixed lists, so every screen and language
 * shows the same words.
 */
export const MEASURE = {
  real: 'Real (adjusted for inflation)',
  realGrowth: 'Real growth rate (volume, adjusted for inflation)',
  nominal: 'Nominal (current prices)',
  shareGdp: 'Share of GDP or GNI (nominal over nominal)',
  inflation: 'Price change (inflation)',
  rate: 'Interest rate, yield or spread',
  fx: 'Exchange rate',
  index: 'Index',
  balance: 'Balance of survey replies (percentage points)',
  ratio: 'Ratio or share',
  probability: 'Probability',
  count: 'Count or physical quantity',
  years: 'Time (years)',
  score: 'Score or rank',
} as const;
type MeasureKey = keyof typeof MEASURE;

export const CURRENCY = {
  usdMarket: 'US dollars at market exchange rates',
  intlPpp: 'International dollars at purchasing power parity',
  local: 'The country\'s own currency',
  localPerUsd: 'Local currency per US dollar (market rate)',
  localPerIntl: 'Local currency per international dollar (purchasing power parity)',
  usdBonds: 'US dollar bonds',
} as const;
type CurrencyKey = keyof typeof CURRENCY;

type Units = [MeasureKey, CurrencyKey?, string?];
const UNITS_BY_ID: Record<string, Units> = {
  policy_rate: ['rate'],
  cpi_monthly: ['inflation'],
  cpi_imf: ['inflation'],
  cpi_index: ['index', undefined, '2010'],
  broad_money_gdp: ['shareGdp'],
  cli: ['index'],
  gdp_qoq: ['realGrowth'],
  gdp_yoy_q: ['realGrowth'],
  gdp_growth: ['realGrowth'],
  gdp_usd: ['nominal', 'usdMarket'],
  gdp_pc_ppp: ['real', 'intlPpp', '2021'],
  output_gap: ['real'],
  unemployment: ['ratio'],
  population: ['count'],
  debt_gdp: ['shareGdp'],
  primary_balance: ['shareGdp'],
  overall_balance: ['shareGdp'],
  revenue: ['shareGdp'],
  expenditure: ['shareGdp'],
  current_account: ['shareGdp'],
  current_account_imf: ['shareGdp'],
  private_balance: ['shareGdp'],
  foreign_balance: ['shareGdp'],
  household_debt: ['shareGdp'],
  corporate_debt: ['shareGdp'],
  current_account_usd: ['nominal', 'usdMarket'],
  exports_usd: ['nominal', 'usdMarket'],
  terms_of_trade: ['index', undefined, '2015'],
  reserves_months: ['ratio'],
  reserves_usd: ['nominal', 'usdMarket'],
  external_debt: ['shareGdp'],
  gini: ['score'],
  tax_revenue: ['shareGdp'],
  tax_income: ['ratio'],
  tax_goods: ['ratio'],
  tax_trade: ['ratio'],
  tariff_weighted: ['rate'],
  tariff_simple: ['rate'],
  poverty_lowest: ['ratio'],
  poverty_lower_middle: ['ratio'],
  poverty_upper_middle: ['ratio'],
  remittances: ['shareGdp'],
  labour_participation: ['ratio'],
  youth_unemployment: ['ratio'],
  age_dependency: ['ratio'],
  interest_revenue: ['ratio'],
  export_fuel: ['ratio'],
  export_ores_metals: ['ratio'],
  export_food: ['ratio'],
  export_manuf: ['ratio'],
  import_fuel: ['ratio'],
  import_ores_metals: ['ratio'],
  import_food: ['ratio'],
  import_manuf: ['ratio'],
  net_energy_imports: ['ratio'],
  ghg_per_head: ['count'],
  renewable_share: ['ratio'],
  short_term_debt_reserves: ['ratio'],
  short_term_debt_usd: ['nominal', 'usdMarket'],
  external_debt_usd: ['nominal', 'usdMarket'],
  ext_debt_service_usd: ['nominal', 'usdMarket'],
  ext_interest_usd: ['nominal', 'usdMarket'],
  bank_assets_gdp: ['shareGdp'],
  bank_claims_gov_gdp: ['shareGdp'],
  bank_capital_assets: ['ratio'],
  bank_npl: ['ratio'],
  fdi_in_gdp: ['shareGdp'],
  fdi_out_gdp: ['shareGdp'],
  fdi_net_usd: ['nominal', 'usdMarket'],
  portfolio_net_usd: ['nominal', 'usdMarket'],
  financial_account_usd: ['nominal', 'usdMarket'],
  fx_per_usd: ['fx', 'localPerUsd'],
  fx_lcu_usd: ['fx', 'localPerUsd'],
  ppp_factor: ['fx', 'localPerIntl'],
  yield_10y: ['rate', 'local'],
  hc_spread: ['rate', 'usdBonds'],
  implied_pd_5y: ['probability', 'usdBonds'],
  cftc_lev_net: ['ratio'],
  tic_holdings: ['nominal', 'usdMarket'],
  gdelt_tone: ['score'],
  stability: ['score'],
  credit_gap: ['shareGdp'],
  credit_gdp: ['shareGdp'],
  debt_service_ratio: ['ratio'],
  house_prices_real_yoy: ['real'],
  house_prices_nominal_yoy: ['nominal', 'local'],
  ppg_external_usd: ['nominal', 'usdMarket'],
  ppg_multilateral_share: ['ratio'],
  ppg_bilateral_share: ['ratio'],
  ppg_bonds_share: ['ratio'],
  ppg_banks_share: ['ratio'],
  ppg_china_share: ['ratio'],
  ppg_usd_share: ['ratio'],
  new_loans_rate_official: ['rate'],
  new_loans_rate_private: ['rate'],
  new_loans_maturity_official: ['years'],
  new_loans_maturity_private: ['years'],
  us_breakeven_5y: ['inflation'],
  us_breakeven_10y: ['inflation'],
  us_5y5y_forward: ['inflation'],
  us_expinf_1y: ['inflation'],
  us_expinf_10y: ['inflation'],
  spf_hicp_1y: ['inflation'],
  spf_hicp_2y: ['inflation'],
  spf_hicp_lt: ['inflation'],
  focus_ipca_12m: ['inflation'],
  eu_survey_esi: ['index'],
  eu_survey_employment: ['index'],
  eu_survey_industry: ['balance'],
  eu_survey_services: ['balance'],
  eu_survey_consumer: ['balance'],
  eu_survey_prices: ['balance'],
  stress_stlfsi: ['index'],
  stress_nfci: ['index'],
  stress_anfci: ['index'],
  gscpi: ['index'],
};
for (const id of ['wgi_voice', 'wgi_stability', 'wgi_effectiveness', 'wgi_regulatory', 'wgi_rule_of_law', 'wgi_corruption']) UNITS_BY_ID[id] = ['score'];
const UNITS_BY_PATTERN: Array<{ re: RegExp; units: Units }> = [
  { re: /^default_.+_usd$/, units: ['nominal', 'usdMarket'] },
  { re: /^ust_auction_btc_/, units: ['ratio'] },
  { re: /^ust_auction_high_yield_/, units: ['rate', 'usdBonds'] },
  { re: /^portwatch_/, units: ['count'] },
  { re: /^commodity_/, units: ['nominal', 'usdMarket'] },
];

function unitsFor(s: { id: string; source?: string }): Units | undefined {
  // The activity index: IBC-Br is based 2002 = 100, Eurostat's industrial production 2021 = 100.
  if (s.id === 'activity_monthly') return ['index', undefined, /IBC-Br|Banco Central do Brasil/i.test(s.source || '') ? '2002' : '2021'];
  if (s.id === 'retail_sales' && /RSAFS/.test(s.source || '')) return ['nominal', 'usdMarket'];
  if (s.id === 'industrial_production' || s.id === 'retail_sales') return ['index'];
  if (s.id === 'unemployment_monthly') return ['ratio'];
  return UNITS_BY_ID[s.id] ?? UNITS_BY_PATTERN.find((p) => p.re.test(s.id))?.units;
}

/** Download columns for the tags, after the existing series columns. */
export const TAG_COLUMNS = ['definition', 'coverage', 'seasonal_adjustment', 'measure', 'base_year', 'currency'] as const;

export function tagCells(t: SeriesTags): Array<string | null> {
  return [t.definition, t.coverage, t.seasonalAdjustment ?? null, t.measure ?? null, t.baseYear ?? null, t.currency ?? null];
}

/** Every definition and coverage the table can show, for the translation test. */
export function allTagTexts(): string[] {
  const defs = [...Object.values(BY_ID), ...BY_PATTERN.map((p) => p.def), activityDef('IBC-Br'), activityDef('Eurostat')].map((x) => x.definition);
  const timing = [...Object.values(SEASONAL), MONTHS_TO_QUARTERS, PER_PULL_NOTE, ...Object.values(FREQUENCY_NOTE_BY_ID), ...FREQUENCY_NOTE_BY_PATTERN.map((p) => p.note)];
  return [...new Set([...defs, ...Object.values(COVERAGE), ...timing, ...Object.values(MEASURE), ...Object.values(CURRENCY), 'As you described it when you loaded the file', 'As your vendor defines the series code you mapped'])];
}
