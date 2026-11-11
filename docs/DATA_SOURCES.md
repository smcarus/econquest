# Data sources

Every outside source the app reads, what it fills, and how to set it up. All settings go in
one file, `.env` (start from `.env.example`). After a change, restart the app and check:

```bash
npm run check:data        # one line per source, from this computer
```

The same check is on the **Tools** page (Menu > Tools, inside Settings) under **Data connections**. Each source is asked for one
small real answer, through the same address and reader the app uses, and comes back as:

| Status | Meaning |
| --- | --- |
| Connected | It answered and the app read it. The figure it returned is shown. |
| Needs setup | A key, file or setting it needs is missing or was not accepted. |
| Not set (optional) | Not needed: the app uses a free route instead, or it is an AI provider you do not use. |
| Off (your own account) | Paid data you have not switched on. |
| No answer | Timeout, address not found, connection refused, or blocked on the way. |
| Refused | It answered with an HTTP error (key rejected, not found, rate limited). |
| Unreadable answer | It answered, but not in the format the app reads. The source may have changed. |

What each source's terms allow (showing figures to others, commercial use, the credit to print) is in
[DATA_LICENCES.md](DATA_LICENCES.md), and in the app under Menu > About & data licences.

### Check history

Every run of the check is kept in `data/local/data-health/source-checks.jsonl`, one line per run,
newest last (about a year of runs; states, reasons and the figure returned, never keys or setup
lines). Runs come from three places: the **nightly check** the app runs once a day after 05:30
local time (`DATA_CHECK_TIME`, `DATA_CHECK_TZ`; a Mac asleep then runs it when it wakes, and an
offline computer waits for the connection), **Check again** under Data connections, and
`npm run check:data` (add `-- --no-save` to leave a run out). From the history each source gets:
failing since (the first run of its current failing streak), runs failed in a row, the last time it
connected, and how many of its last 30 runs connected. "Needs setup", "Off" and "Not set" are not
failures: nothing was asked. `npm run check:data` ends with the sources that broke or came back
since the last saved run.

The rule throughout: a figure is shown only when one of these sources filled it. Where a source
did not answer or is not set up, the figure reads **Missing** with the reason. Nothing is
estimated, invented or taken from built-in sample values.

## Free, no key

The country snapshot (World Bank, IMF WEO, GDELT, FX, official 10Y yield, Polymarket) is pulled once
a week. If a feed does not answer on a pull (no internet, a slow server), the last good figure from
that feed is kept, its source label ends "kept from the <date> pull", and the snapshot is tried
again within the hour. A built-in value is never kept, and the 5Y CDS is never kept (it follows the
own-data switch in Settings).

| Source | Fills | Address | Kept for |
| --- | --- | --- | --- |
| World Bank indicators | Reserves, current account, external debt, political stability, trade shares, governance (WGI), and for the unit converters CPI, population, the official exchange rate and the ICP PPP factor | api.worldbank.org | 1 week (country snapshot) |
| World Bank inequality, taxes and tariffs (WDI) | Gini index (SI.POV.GINI, household surveys up to 15 years back), central government tax revenue (GC.TAX.TOTL.GD.ZS) and its split (GC.TAX.YPKG.RV.ZS, GC.TAX.GSRV.RV.ZS, GC.TAX.INTT.RV.ZS), applied tariff weighted and simple mean (TM.TAX.MRCH.WM.AR.ZS, TM.TAX.MRCH.SM.AR.ZS, from WITS/TRAINS) | api.worldbank.org | 1 week (country snapshot) |
| World Bank people and living standards (WDI) | Poverty rate at three international lines (SI.POV.DDAY, SI.POV.LMIC, SI.POV.UMIC, household surveys up to 15 years back), remittances received (BX.TRF.PWKR.DT.GD.ZS), labour force participation (SL.TLF.CACT.ZS) and youth unemployment (SL.UEM.1524.ZS), both ILO modelled estimates, age dependency ratio (SP.POP.DPND) | api.worldbank.org | 1 week (country snapshot) |
| World Bank emissions and renewables (WDI) | Greenhouse gas emissions per person excluding land use, tonnes CO2e (EN.GHG.ALL.PC.CE.AR5, from EU EDGAR); renewable energy, % of final energy consumption (EG.FEC.RNEW.ZS) | api.worldbank.org | 1 week (country snapshot) |
| Our World in Data energy file | Energy mix: shares of coal, oil, gas, nuclear and renewables in primary energy (Energy Institute Statistical Review of World Energy, via Our World in Data); downloaded to this computer, not shipped (Energy Institute terms: private, non-commercial use only) | catalog.ourworldindata.org (older file: raw.githubusercontent.com/owid/energy-data) | 1 week, daily run, on disk |
| World Bank trade and energy (WDI) | Shares of merchandise exports and imports in fuel, ores and metals, food and manufactures (TX.VAL.FUEL.ZS.UN, TX.VAL.MMTL.ZS.UN, TX.VAL.FOOD.ZS.UN, TX.VAL.MANF.ZS.UN and the TM.VAL.* counterparts); net energy imports, % of energy use (EG.IMP.CONS.ZS; negative = net exporter) | api.worldbank.org | 1 week (country snapshot) |
| World Bank debt structure (WDI, IDS) | Interest payments, % of central government revenue (GC.XPN.INTP.RV.ZS); currency mix of public and publicly guaranteed external debt (IDS DT.CUR.USDL.ZS, DT.CUR.EURO.ZS, DT.CUR.JYEN.ZS, DT.CUR.UKPS.ZS, DT.CUR.SWFR.ZS, DT.CUR.SDRW.ZS, DT.CUR.MULC.ZS, DT.CUR.OTHC.ZS) and average maturity of new loans (DT.MAT.DPPG), low- and middle-income countries only | api.worldbank.org | 1 week (country snapshot) |
| IMF Sovereign Debt Investor Base (Arslanalp and Tsuda) | Who holds general government debt: foreign official, foreign banks, foreign other investors, domestic central bank, domestic banks, domestic other investors (shares), about 136 emerging and developing economies, yearly | your file in data/local/imf-investor-base/ (wp1439.zip from imf.org) | when you replace the file (the IMF updates it end-April and end-October) |
| IMF list of LIC DSAs | Risk of debt distress for 67 low-income countries, with each DSA's date (typed from the list as of 30 Sep 2026) | typed in src/utils/lowIncomeDebt.ts | updated by hand when the list changes |
| Paris Club, Common Framework | Countries that applied for a debt treatment (typed, as of 2024) | typed in src/utils/lowIncomeDebt.ts | by hand |
| AidData Global Chinese Development Finance (v3.0) | Official loan commitments from China by country, 2000-2021 | datasets/aiddata/china-lending.json (shipped summary); data/local/aiddata/ (a newer file of yours wins) | when AidData publishes a new version |
| World Bank debt statistics (IDS, QEDS) | External debt falling due by year and quarter (banker brief) | api.worldbank.org | 12 h |
| IMF World Economic Outlook | Debt/GDP, inflation, GDP growth, primary balance, output gap (only where the IMF publishes one, mostly advanced economies) | www.imf.org | 1 week (country snapshot) |
| IMF WEO past editions (your files) | Each figure as a given WEO edition published it (real-time vintages), for fair comparisons against the IMF | data/local/weo-vintages/ (you download them; nothing fetched) | when you add files |
| IMF reserves and balance of payments | Monthly official reserves (International Liquidity, IL); quarterly current account and imports of goods and services (BOP); import cover and current account % of GDP | api.imf.org | 1 day, on disk (structures 1 week) |
| IMF COFER | World shares of official FX reserves by currency (US dollar, euro, renminbi, yen, sterling and others), quarterly | api.imf.org | 1 day, on disk |
| IMF monthly consumer prices (CPI) | Monthly inflation, all items, year on year, for catalog countries outside the EU; used when its month is at least as new as the OECD copy's (national and Eurostat series win a tie) | api.imf.org | Daily run, on disk (data/live/imf-cpi.json); pages read the saved copy |
| GDELT | Headlines and news tone (a risk score input) | api.gdeltproject.org | 7 days, on disk (`GDELT_REFRESH_DAYS`) |
| GDELT 2.0 raw files (events and Global Knowledge Graph) | Weekly event counts per country (protests, sanctions, violence, Goldstein and tone) and economic-theme shares of news (inflation, central bank, debt, currency, fiscal, lenders and more) with tone and the people and organisations named | data.gdeltproject.org/gdeltv2/ | Per day on disk (`data/live/gdelt-raw/`), look-back `GDELT_RAW_WEEKS` (default 8) |
| GDELT 1.0 event files | Monthly event history per country (events, protests, sanctions, violence, Goldstein, tone; share of all events GDELT coded), back to 1979 if wanted. Alongside the 2.0 files, not instead | data.gdeltproject.org/events/ | Per month on disk (`data/live/gdelt-daily/`), from `GDELT_DAILY_FROM` (default 2016-01) |
| Polymarket, Kalshi | Prediction-market odds | gamma-api.polymarket.com, api.elections.kalshi.com | per request |
| New York Fed | Fed funds, SOFR, reverse repo | markets.newyorkfed.org | 3 min to 6 h |
| Spot FX | Exchange rates against the dollar | open.er-api.com (backup: Frankfurter) | 3 min |
| ECB rates (Frankfurter) | FX volatility; last year's closing rate for the year-to-date move | api.frankfurter.dev | 12 h |
| ECB daily history (Frankfurter) | Exchange rate per US dollar, every ECB business day since 1999, one quarter per request; saved to data/live/fx-history.json, finished quarters kept for good | api.frankfurter.dev | 12 h (current quarter) |
| BIS | Real exchange rates; government debt securities | stats.bis.org | 12 h |
| BIS central bank policy rates | Policy rate per country with its date and central bank, the 12-month change and the last move | stats.bis.org | 12 h, on disk |
| WITS | Export and import shares with China and Russia | wits.worldbank.org | 24 h |
| CFTC Commitments of Traders | Weekly currency futures positioning (leveraged funds, asset managers) for MXN, BRL, ZAR, JPY, GBP, EUR | publicreporting.cftc.gov | Until a newer report can exist (weekly), on disk |
| US Treasury TIC | Holdings of US Treasuries by country, monthly (Japan, UK, China, Brazil, India and the other ~15 holders Treasury names) | ticdata.treasury.gov | 1 day, on disk |
| US Treasury Fiscal Data (auctions) | US Treasury auctions: bid-to-cover, high yield (bills: high investment rate), amounts offered and accepted, indirect bidders' share, for 13- and 26-week bills, 2-, 5- and 10-year notes and 30-year bonds, ten years back (TIPS, floating-rate notes and cash management bills left out). United States page, issuer note and council charts | api.fiscaldata.treasury.gov | Daily run, on disk (data/live/ust-auctions.json); pages read the saved copy |
| World Bank Pink Sheet | Monthly commodity prices: oil (Brent, WTI, Dubai), gas, LNG, coal, copper, iron ore, aluminium, nickel, gold, platinum, silver, soybeans, maize, wheat, palm oil, coffee, cocoa, sugar | www.worldbank.org (page), thedocs.worldbank.org (workbook) | 1 day, on disk |
| OECD leading indicators (via DBnomics) | Composite leading indicator (amplitude adjusted, 100 = long-term average), monthly, for the countries the OECD covers | api.db.nomics.world | 1 day, on disk |
| OECD quarterly GDP (via DBnomics) | Real GDP growth, quarter on quarter and year on year, seasonally adjusted, for about 53 OECD and partner areas; feeds the nowcast and forecasts | api.db.nomics.world | 1 day, on disk |
| BCB IBC-Br (SGS 24364) | Brazil's monthly economic activity index, seasonally adjusted, full history from 2003; for the GDP nowcast | api.bcb.gov.br | 1 day, on disk |
| Eurostat industrial production (sts_inpr_m) | Monthly industrial production, industry excl. construction, seasonally and calendar adjusted, 2021 = 100, for EU members (and Turkey where Eurostat has it), from 2000; for the GDP nowcast | ec.europa.eu | 1 day, on disk |
| OECD consumer prices (via DBnomics) | Headline CPI inflation, y/y, monthly; the app's inflation figure where the OECD publishes one (IMF elsewhere) | api.db.nomics.world | 1 day, on disk |
| Banco Central do Brasil (SGS 13522) | Brazil's IPCA inflation over 12 months, monthly; used instead of the OECD figure when at least as new (it was September 2026 against May on 2026-11-05) | api.bcb.gov.br | 1 day, on disk |
| Eurostat HICP (prc_hicp_minr) | Monthly inflation, annual rate, all items, for EU members on your lists (Poland on the defaults); used instead of the OECD figure when at least as new. Turkey is not in this dataset | ec.europa.eu | 1 day, on disk |
| Eurostat: EU business and consumer surveys (ei_bssi_m_r2, ei_bsee_m_r2) | The European Commission's monthly surveys, seasonally adjusted, for EU members on the country list, from 2005: Economic Sentiment Indicator, industrial, services and consumer confidence, Employment Expectations Indicator. Labelled "EU business survey, not a PMI". Economist note, country page and council charts | ec.europa.eu | Daily run, on disk (data/live/eu-surveys.json); pages read the saved copy |
| UN Comtrade | Annual goods trade by partner (shares with China, Taiwan, Russia and the Gulf producers; top five export markets) and exports by HS chapter, every chapter (the export mix of fuels, ores, metals and farm goods, and the app's export concentration index) | comtradeapi.un.org | 30 days per country, on disk |
| Central bank of Peru (BCRPData, EMBIG) | USD bond spread over US Treasuries: J.P. Morgan EMBI Global spread, monthly average, for Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru and Venezuela, plus the Latin American and emerging-market aggregates. The free stand-in for 5Y CDS: labelled a bond spread, never CDS. Other countries read Missing ("No free source"). Published about three weeks after the month | estadisticas.bcrp.gob.pe | 12 h, on disk (`data/live/market-extras.json`) |
| FRED download | 10Y yields (OECD monthly): US, Mexico, South Africa, Japan, UK, Poland, Chile, India, Korea, Israel, Canada, Australia, New Zealand, Switzerland, Nordics, Czechia, Hungary, Slovakia and 11 euro-area countries | fred.stlouisfed.org | 6 h |
| FRED download | Fed balance sheet (H.4.1): WALCL total assets, WRESBAL reserves, WTREGEN Treasury General Account; NY Fed RRPONTSYD overnight reverse repos | fred.stlouisfed.org | 12 h (1 h after a miss); saved to data/live/fed-balance-sheet.json |
| FRED download (API with your key) | Stress indices: St. Louis Fed STLFSI4, Chicago Fed NFCI and ANFCI (weekly; scenario factor of your choice and world series) | fred.stlouisfed.org | 12 h (1 h after a miss) |
| NY Fed download | Global Supply Chain Pressure Index (monthly; scenario factor and world series), an Excel 97 .xls file (served even at gscpi_data.csv), read with the app's own .xls reader | newyorkfed.org | 12 h (1 h after a miss) |
| IMF PortWatch (ArcGIS feature layers) | Ships through eight chokepoints and their estimated volume (world series); each country's port calls and estimated seaborne imports and exports. Daily data from ship signals, shown as monthly averages per day; the latest month is partial | services9.arcgis.com | 24 h (1 h after a miss) |
| ECB Data Portal | Survey of Professional Forecasters: euro-area HICP expected 1 year, 2 years and longer term ahead (quarterly world series). Series keys not yet verified live; see `npm run check:data` | data-api.ecb.europa.eu | 12 h (1 h after a miss) |
| BCB Olinda (Focus) | Focus survey median IPCA expected over the next 12 months, Brazil page. Field names not yet verified live; see `npm run check:data` | olinda.bcb.gov.br | 12 h (1 h after a miss) |
| FRED download (API with your key) | US inflation expectations: T5YIE, T10YIE, T5YIFR breakevens (daily, shown at month-end); Cleveland Fed EXPINF1YR, EXPINF10YR (monthly). US country page only | fred.stlouisfed.org | 12 h (1 h after a miss) |
| Brazil Treasury (Tesouro Direto) | Brazil 10Y yield (NTN-F) | www.tesourotransparente.gov.br | 6 h, also on disk |

Notes from the first check on Sam's Mac (2026-11-05):

- **GDELT** allows one request every 5 seconds and answers HTTP 429 otherwise. The app now
  queues its GDELT requests 5.5 seconds apart and skips one that would wait more than 30 seconds.
  After a refusal GDELT holds each answer about 11 seconds and keeps refusing, so the app sends
  nothing to GDELT for 15 minutes after any refusal. Each country is pulled once every
  `GDELT_REFRESH_DAYS` days (default 7) and kept on disk (`data/live/gdelt/`).
- **GDELT raw files** are the 15-minute files GDELT publishes for everyone (listed in
  `masterfilelist.txt`, newest in `lastupdate.txt`), not the DOC API, so they are not limited to one
  request every 5 seconds. `npm run gdelt:pull` reads every events file in the look-back
  (`GDELT_RAW_WEEKS`, default 8) and one Global Knowledge Graph file every
  `GDELT_GKG_EVERY_HOURS` hours (default 3; GKG files are about ten times larger). Each file is
  downloaded into memory, added up per country and thrown away; only one small file per day is kept
  in `data/live/gdelt-raw/`, with the list of files already read, so a stopped pull carries on and a
  weekly pull only fetches new files. `npm run gdelt:pull -- --estimate` prints the files left and a
  size estimate from the newest file sizes before downloading anything. A file GDELT never
  published (HTTP 404, it has gaps) is shown as missing; HTTP 429 or 503 pauses 15 minutes.
  Countries: GDELT writes places in FIPS codes (Chile CI, South Africa SF, Japan JA, UK UK), mapped
  to ISO3 in `src/utils/gdeltRaw.ts`. An event counts for a country when it happens there or the
  country is either actor; an article counts when it names a place in the country. Theme groups are
  GDELT theme names listed in `GKG_THEME_GROUPS` (for example ECON_INFLATION, ECON_CENTRALBANK,
  ECON_DEBT, ECON_CURRENCY*, ECON_TAXATION, ECON_DEVELOPMENTORGS). With GKG sampling the figures shown
  are shares of the articles read, and the share of files read is shown with them. The pull is the
  last step of *Download all country data* (no per-step time limit; Stop works mid-pull). After the
  first pull the server tops it up weekly (`GDELT_REFRESH_DAYS`), new files only.
- **GDELT 1.0 event files** (`npm run gdelt:daily`, add `-- --estimate` to see the size first, or
  `-- --from 1979` for the whole history) are listed with their sizes in
  `data.gdeltproject.org/events/filesizes`: one zip per year for 1979-2005, per month for January
  2006 to March 2013 (both by the date the event took place, 57 columns), then one per day from
  1 April 2013 (the events GDELT found that day, 58 columns). Each zip is streamed, unzipped and read
  line by line as it arrives, then dropped (a year file unzips to over a gigabyte, so it is never held
  whole); one small file per month is kept in `data/live/gdelt-daily/`, listing the files already in
  it, so nothing is counted twice and a later run fetches only new days. Sizes: about 14 MB for 1979
  rising to 160 MB for 2000, 10 to 100 MB per month for 2006-2013, and 2 to 8 MB per day since; from
  2016 that is roughly 25 GB to download, all of it about 35 GB. GDELT's volume grew many times over
  the years, so the readings use shares (protests as a share of the country's events, the country's
  share of all events), never raw counts across years. Same country rule and FIPS mapping as the 2.0
  files; the 2.0 15-minute pull is unchanged and still gives the weekly figures and news themes.
- **Brazil Treasury** serves the whole price history, about 15 MB, slowly (60 seconds on the Mac).
  The app allows 90 seconds, downloads it once at a time, and keeps the answer on disk
  (`data/live/tesouro.json`) so a restart does not download it again.

- **CFTC** publishes positions as of Tuesday on Friday afternoon (US Eastern), so the newest
  figure is 3 to 10 days old and always shows its report date and the date the app pulled it. The
  app asks once for about three years of weekly reports for all six currency futures (one small
  request), keeps it on disk (`data/live/cftc.json`), and asks again only when the newest report
  is 7 or more days old and the last pull is over 12 hours old. Readings: leveraged funds net as
  a share of open interest, asset managers net, the week's change, and where leveraged funds sit
  in their own last three years (90th percentile or above = crowded long, 10th or below = crowded
  short; tagged as the FX Valuation Agent's reading). Turkey, Egypt, Indonesia, Poland and Chile
  have no CFTC-reported future and say so.
- **US Treasury TIC** publishes its Major Foreign Holders table monthly, around the 18th, for
  the month-end two months earlier (so the newest figure is 6 to 10 weeks old). It names only the
  largest holders; Mexico, Turkey, South Africa, Poland, Chile, Indonesia and Egypt are inside
  "All Other" and read Missing for that reason. The app reads `slt_table5.txt` (the older
  `mfh.txt` stopped at January 2023), keeps it on disk (`data/live/tic.json`) and asks again
  after a day. Readings: holdings, change on the month and over 12 months, share of all foreign
  holdings, and a stated rule on the 12-month change (down 10% or more = selling, up 10% or
  more = buying; tagged as the FX Valuation Agent's reading).
- **EU business and consumer surveys** are the European Commission's monthly surveys of firms and
  households (DG ECFIN), read from Eurostat's free JSON API, which republishes them (datasets
  `ei_bssi_m_r2` and `ei_bsee_m_r2`; reuse allowed with Eurostat named and changes stated). One
  request per indicator covers every EU member on the country list, seasonally adjusted, from
  2005: the Economic Sentiment Indicator and the Employment Expectations Indicator (indexes,
  long-term average = 100) and industrial, services and consumer confidence (balances: "better"
  minus "worse" replies, in percentage points). They stand in for the paid purchasing managers'
  indexes but are not PMIs (different questions and scale; a PMI's line is 50), and every label
  says "EU business survey, not a PMI". Readings: an index above or below 100 (within 0.5 counts
  as at the average); a balance against three months earlier (within 0.5 points counts as about
  unchanged). A month not yet published is skipped, never filled in. The daily run saves the copy
  (`data/live/eu-surveys.json`); a failed indicator keeps its last good series. Other countries stay
  Missing: China's statistics office blocks robots and the regional Fed surveys on FRED may not be
  redistributed.
- **US Treasury auctions** come from the Fiscal Data API (`auctions_query`, free, no key; Fiscal
  Data's terms allow any use). One request reads ten years of auctions. Kept: regular bills, notes
  and bonds of six terms (13- and 26-week bills; 2-, 5- and 10-year notes; 30-year bonds), by
  original term so a reopened 10-year counts as a 10-year. Left out: inflation-protected
  securities, floating-rate notes and cash management bills, whose yields do not compare. Every
  value arrives as text and an unpublished one is the word "null"; auctions announced but not
  yet held have no bid-to-cover and are skipped, never filled in. The daily run saves the copy
  (`data/live/ust-auctions.json`); the United States page, its issuer note and the council charts
  read only that copy, so no page waits on Fiscal Data. Readings: bid-to-cover (dollars bid per
  dollar sold), high yield (bills: high investment rate), amounts offered and accepted, the
  indirect bidders' share of the competitive amount, and a stated rule against the previous six
  auctions of the same term (more than 0.1 above their average bid-to-cover = stronger demand,
  more than 0.1 below = weaker, otherwise in line). TreasuryDirect asks robots not to read it and
  is not used. Germany's, the UK's and Brazil's auctions have no free source the app can read and
  are not shown.
- **OECD quarterly GDP** comes from the OECD's dataflow `DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_OECD`
  through DBnomics: GDP (`B1GQ`), chain-linked volume, calendar and seasonally adjusted (`Y`),
  growth on the previous quarter (`G1`) and on the same quarter a year earlier (`GY`). DBnomics'
  copy runs some months behind the OECD; `npm run check:data` shows the newest quarter. Countries
  outside the dataset read Missing with that reason. Saved in `data/live/oecd-qna.json`.
- **OECD leading indicators** come from the OECD's dataflow `DSD_STES@DF_CLI` (measure LI,
  amplitude adjusted), read through DBnomics (see "OECD via DBnomics" below). The OECD publishes around
  mid-month; the newest month is usually one to two months old and always shows with the date the
  app pulled it. The app asks once a day for every area at once (the OECD asks users to keep calls
  modest), keeps it on disk (`data/live/oecd-cli.json`), and if the narrow query finds nothing it
  asks once without the adjustment filter and reads it the same way. The EU benchmark reads the euro
  area. Readings: the level, the change on the month and over six months, and the OECD's cycle
  phase as a stated rule (above 100 and rising = expansion, above and falling = downturn, below
  and falling = slowdown, below and rising = recovery; tagged as the Global Spillover Agent's
  reading). A country the OECD answered without (Egypt, for one) reads Missing: "OECD publishes
  no CLI"; when the OECD did not answer, it says that instead.

- **BIS central bank policy rates** (dataset `WS_CBPOL`) come from each central bank through the
  BIS, daily for most countries. The app asks twice for every country at once: the latest daily
  figure, and about 25 months of month-end figures for the change over 12 months and when the
  rate last moved. It keeps both on disk (`data/live/bis-policy-rates.json`) and asks again after
  12 hours. Every figure carries its date and the central bank's name; a figure more than 45 days
  old is flagged as possibly out of date. The US figure is the mid-point of the Fed's target
  range; the EU benchmark uses the ECB deposit rate. Egypt is not in the dataset and reads Missing
  for that reason. `GET /api/data/policy-rates` lists what the app holds for each country.
  The rate feeds the watchlist column, the Country tab (with the 12-month change and last move),
  the Central Bank Watcher Agent and the stance check (policy tight / neutral / loose).
- **Monthly inflation, freshest source first** (plan G3). Each country's monthly inflation comes
  from the freshest of: its own statistics office or central bank feed (Brazil, Mexico and Turkey
  with a key), Eurostat HICP for EU members, the IMF's monthly consumer prices, and the OECD copy
  on DBnomics, which stopped updating in June 2026. The newest month wins; on the same month the
  order above decides. A country's series always comes whole from one source, never stitched,
  and every figure names its source and month. The IMF series comes from the CPI dataset on
  api.imf.org, found by name as for the reserves: in each dimension the code named "Consumer price
  index", "All items" and "Year-over-year percent change", monthly, other dimensions open
  (`IMF_CPI_KEY` in `.env` overrides it; `npm run check:imf` prints what matched). The daily run
  saves the IMF copy (`data/live/imf-cpi.json`). Menu > Data health > Inflation lists each
  country's source and age, flags any figure more than 90 days old, and says when an old OECD copy
  is in use.
- **IMF reserves and balance of payments** come from the IMF data portal's SDMX 3.0 API
  (api.imf.org, no key). IFS was retired in 2025 and split into topic datasets: monthly reserves
  are in **IL** (International Liquidity) and the balance of payments in **BOP**. The IMF also
  changed its codes, so the app does not hard-code them: it reads each dataset's structure,
  picks the indicator whose IMF name fits ("Total reserves (gold at market value)", "Current
  account balance", "Goods and services" debit for imports), then asks for that series for each
  country and checks the series is in US dollars and states its unit (millions, billions). The
  live API states millions on some series whose values are whole dollars; when the stated unit
  would put a value above $100 trillion, the app reads the values as dollars. Every figure shows the IMF
  series key and period. If a name does not match (the check says which), set the series key in
  `.env`: `IMF_RESERVES_KEY`, `IMF_CA_KEY`, `IMF_IMPORTS_KEY`, with `{ISO3}` for the country.
  `npm run check:imf` prints the live IMF dimension order, the indicator codes whose names look
  relevant and the Brazil series each measure picks, to check the matching.
  Kept on disk in `data/live/imf_external.json` and asked again after a day. Readings: reserves
  and their 12-month change; months of imports (reserves over the last four quarters of imports,
  divided by 12; stated rule: under 3 = thin, 3 to 6 = adequate, over 6 = ample, tagged as the
  Central Bank Watcher Agent's reading); current account in the latest quarter and over four
  quarters as % of GDP, with GDP from the IMF World Economic Outlook for that year. A country the
  IMF has not published reads Missing with the reason.
- **World Bank Pink Sheet** is released early each month (around the third working day) with
  monthly average prices up to the month before, in nominal US dollars. The workbook's address
  changes with every release, so the app reads the World Bank's commodity markets page
  (worldbank.org/en/research/commodity-markets), follows its "Monthly prices" link
  (`CMO-Historical-Data-Monthly.xlsx`, about 1 to 2 MB) and reads the "Monthly Prices" sheet with
  its own small .xlsx reader (no extra package). If that page ever changes, put the workbook link
  in `PINK_SHEET_URL`. Kept on disk (`data/live/commodities.json`) and pulled again after a day.
  Readings per commodity: latest month, change on the month and over 12 months, and the latest
  against its 3-year average. A commodity whose column is not found reads Missing and says so.
  Shown at `GET /api/data/commodities`; the spillover scenarios read it.
- **OECD via DBnomics.** On Sam's first check (2026-11-05) the OECD's own API (sdmx.oecd.org)
  answered both OECD rows with HTTP 429 and a Cloudflare "Just a moment" page, its bot check.
  Sam chose DBnomics (03:33Z): a free mirror of the OECD's datasets under the OECD's own codes,
  no key. The app now reads `DSD_STES@DF_CLI` and `DSD_PRICES@DF_PRICES_ALL` from
  `api.db.nomics.world/v22/series/OECD/...`, filtered by dimension name, keeps the last 40 months
  of each series on disk, makes one call at a time at least 5 seconds apart, and pauses an hour
  after a 429 or a bot check. Figures say "OECD via DBnomics". DBnomics refreshes its OECD copy
  on its own schedule, so a new OECD month can appear a few days later than on the OECD's site.
- **OECD consumer prices** come from the same route (dataflow `OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL`,
  headline CPI, all items, monthly). The OECD's own y/y rate is used; where only the index is in
  the reply, y/y is worked out from the index 12 months apart and the source says so. Asked once
  a day for every area, kept on disk (`data/live/oecd-cpi.json`). Where the OECD has a figure it
  becomes the app's inflation figure (watchlist, Central Bank Watcher, real rates, the
  divergence list), shown as "OECD, <month>", because it is monthly and the IMF's is annual;
  elsewhere the IMF figure stays and says IMF. Readings: the y/y rate, the change over three
  months, and a stated rule on it (up 0.5 pts or more = rising, down 0.5 pts or more = easing).
  A country the OECD answered without reads "OECD publishes no CPI" on the OECD rows.

- **UN Comtrade** works without a key through its public preview, which returns up to 500 rows
  a request and allows few requests, so the app asks two small questions per country (every
  partner's total, then exports and imports by HS chapter), one at a time 1.5 seconds apart, and
  only once every 30 days (data/live/comtrade.json). It asks for the year two back, then three
  back if that year is not reported yet; every figure carries its year. A free key (Menu > Settings, or
  `COMTRADE_API_KEY` in `.env`; comtradeplus.un.org > My Comtrade > My API portal) switches to the keyed
  route with higher limits; the key is sent in a header, never in the address. Comtrade files
  Taiwan as "Other Asia, nes" (code 490) and the app labels it Taiwan. Readings: goods exports
  and imports, the share with China, Taiwan, Russia and the Gulf producers (Iran, Iraq, Kuwait,
  Qatar, Saudi Arabia, UAE, Bahrain, Oman), the top three markets and suppliers, the commodity
  share of exports, and fuels as a share of imports. On the Country tab and at
  `GET /api/data/trade-partners`.
- **IMF COFER** (currency composition of official foreign exchange reserves) is quarterly and
  published only for the world and country groups, never for one country. The app reads the
  world figure: it finds the world code in the COFER country list by name, asks for every COFER
  series for the world, and reads each currency from the series name. It uses the IMF's own share
  series when there are any, otherwise claims in each currency over total allocated reserves
  (stated on the row). Shown on every Country tab as a world reading, with the country's own
  currency first when COFER names it (Japan, UK, US, China, euro area, Canada, Australia,
  Switzerland), and given to the FX Valuation Agent for those currencies. Kept on disk in
  `data/live/imf_cofer.json`, asked again after a day. `IMF_COFER_KEY` in `.env` sets the series
  key if the names do not match.
- **Spillover scenarios** (Global Spillover Agent) use these: the Taiwan scenario counts exports
  to Taiwan as well as China (Comtrade; WITS has no Taiwan figure), Comtrade shares replace WITS
  when Comtrade has China and Russia, Hormuz states the Brent level it starts from and the share
  of imports from the Gulf producers, and a fourth line, "Commodity prices, last 12 months",
  applies each commodity's actual 12-month Pink Sheet move to the country's export mix and its
  fuel imports. Each line reads Missing when a figure it needs did not load.
  The World Bank trade shares and WITS partner shares are kept on disk after each pull that
  returned any figure (`data/live/trade-exposure.json`) and shown from there when no feed answers.

## Free, downloaded files

These files are fetched by the daily start-up run (see "Daily start-up run" below) where the
publisher allows an automated download; ACLED is the one that still has to be downloaded by hand.

### Geopolitical Risk index (Caldara and Iacoviello)

The country risk scorecard reads the monthly Geopolitical Risk file from
<https://www.matteoiacoviello.com/gpr.htm> (Caldara and Iacoviello, American Economic Review 2022):
the world index and the country index for 44 countries (CC BY: cite Caldara and Iacoviello 2022 and
the page). The daily start-up run (`npm run daily`, started by `npm run go`) fetches the monthly
file as published (`data_gpr_export.xls`) into `data/local/gpr/` when the saved copy is more than 7
days old; `npm run gpr:pull` does the same by hand. A download is kept only if it reads as the GPR
table. You can also save the file there yourself as .xls, .xlsx or .csv; the newest file is used.

### Sanctions lists (OFAC, UN)

Country Research > History & data > Sanctions lists reads files you download into
`data/local/sanctions/`: OFAC's SDN.CSV and ADD.CSV and the non-SDN CONS_PRIM.CSV and CONS_ADD.CSV
(from <https://ofac.treasury.gov/sanctions-list-service>, the legacy CSV layout), and the UN Security
Council consolidated.xml (<https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list>).
`npm run sanctions:pull` (also part of the daily start-up run) tries the official download addresses
and keeps a file only if it reads as the list; if a site refuses, download the file by hand into the
same folder. No key is needed. The
EU and UK lists are not read yet.

### UCDP conflict data

The Uppsala Conflict Data Program publishes its datasets as CSV files at
<https://ucdp.uu.se/downloads/> (free, CC BY 4.0, cite the publications listed with each dataset).
The 26.1 release of the five files below is shipped in the repository (`datasets/ucdp/`, unchanged,
with its licence and citations in the README there), so the figures work with no setup. The daily
start-up run (`npm run daily`; by hand `npm run ucdp:pull`) checks ucdp.uu.se for a newer yearly
release of the same five files and for the monthly Candidate Events files after the latest release,
and saves any it finds, as published, in `data/local/ucdp/`; a file is kept only if it reads as that
UCDP file. You can also put files there yourself, as the .zip or the .csv inside. The app reads both folders when it starts
and again whenever a file changes; a newer release of a dataset wins over an older one.

| File (26.1 release) | Fills | Years |
| --- | --- | --- |
| UCDP/PRIO Armed Conflict Dataset (`UcdpPrioConflict_v26_1.csv`) | Armed conflicts located in the country, how many at war intensity (1,000+ battle deaths), their type, the opposing sides; conflicts elsewhere where the government is a side or a supporter | 1946-2025 |
| UCDP Battle-Related Deaths, conflict level (`BattleDeaths_v26_1_conf.csv`) | Battle deaths in state-based conflict where the battles took place (best, low, high) | 1989-2025 |
| UCDP Non-State Conflict (`NonState_v26_1.csv`) | Deaths in fighting between armed groups, neither a government | 1989-2025 |
| UCDP One-Sided Violence (`OneSided_v26_1.csv`) | Civilians killed deliberately by a government or an armed group | 1989-2025 |
| UCDP Dyadic Dataset (`Dyadic_v26_1.csv`) | Pairs of warring sides in conflicts located in the country | 1946-2025 |

- Each file is recognised by its columns, not its name, so next year's release (27.1) reads the same.
  If two releases of one dataset are in the folder, the newer one is used and the older one is listed
  as skipped.
- The figures are for the latest year in the files, with the three years before it. They show under
  Research > Sources ("Conflict (UCDP downloaded files)"), in the Politics & Events Agent and in the
  council's figure list, each labelled UCDP with the release.
- A country UCDP codes with no rows in a year had no conflict UCDP recorded (a real zero: UCDP codes
  the whole world). A file not in the folder makes its figures Missing with the file to add. Hong Kong
  has no UCDP code (it counts under China).
- UCDP counts organised violence only, where a conflict or actor reached 25 deaths in a calendar year.
  A conflict fought in more than one country counts in each of them.
- **Months since the yearly release (preliminary).** UCDP also publishes Candidate Events each month
  (`GEDEvent_v26_0_9.csv` for September 2026, or the cumulative `GEDEvent_v26_01_26_09.csv`, from
  <https://ucdp.uu.se/downloads/>, CC BY 4.0). Put them in `data/local/ucdp/`; the app reads them by
  their columns, counts each event once by its id (the later file wins), by the month it started, and
  shows the months after the yearly files' last year as a separate preliminary line: deaths by type,
  the low-high range and how many events UCDP flags "Check". They never enter the yearly totals, the
  backtests or the scorecard. Not shipped: download the latest month yourself.
- Countries are Gleditsch-Ward numbers in the files, mapped to ISO3 in `src/utils/ucdpConflict.ts`.
  `npm run check:data` shows the files read, the releases and any codes the app has no country for.

### ACLED aggregated files

ACLED (Armed Conflict Location & Event Data) publishes weekly aggregated files, one per region
(Africa, Asia-Pacific, Europe and Central Asia, Latin America & the Caribbean, Middle East, United
States & Canada), at <https://acleddata.com/conflict-data/download-data-files/aggregated-data>. A free
registered myACLED account is enough to download them; the ACLED API needs the Research level, which
Open accounts (any public email such as gmail.com) do not get. The app does not call ACLED for these.

1. Log in to myACLED and open Aggregated data.
2. Download the file for your region (as many regions as you like).
3. Put it, as downloaded (.xlsx or .csv, zipped or not), in `data/local/acled/`. No restart is
   needed: the folder is read again whenever a file changes.

- The file is recognised by its columns (week, country, event_type, events, fatalities; the others
  are ignored), in any case and with or without spaces. A file without them is listed as not read in
  `npm run check:data` (row "ACLED aggregated files").
- Rows are weekly counts per Admin 1 area and event type. The app adds them into country months; a
  week counts in the month it starts in (ACLED weeks run Saturday to Friday), and only months the
  file covers to their last day are used. `population_best` is never added up.
- The figures are the same as with an ACLED account (twelve months of events and fatalities by
  type, the last three months against the nine before), labelled with the file name and its date.
  When you also have an account with API access, the API reading wins.
- The files stay in `data/local/` on your computer: they are not in git and not shipped with the
  app, since ACLED's EULA restricts sharing (see Menu > About & data licences).

## Free, with your own key

Keys marked "Settings or .env" can be pasted in the app under **Menu > Settings > Data API keys**
(or Cmd/Ctrl + comma). The app saves them on this computer only, in `data/local/settings.json`
(file readable by your user only, not in git), shows them masked, and sends each one only to its
own source. A key saved in Settings is used instead of the same key in `.env`; removing it there
goes back to `.env`. Each key has a Test button that runs the same check as Data connections.
`npm run check:data` reads the saved keys too. Keys can only be changed from the computer running
the app. Under Docker, `docker-compose.yml` publishes the app on this computer only
(`127.0.0.1`) and turns on `SETTINGS_ALLOW_REMOTE`, because requests reach the container from
Docker's network. `npm run dev` listens on this computer only (`127.0.0.1`), so nobody else on your Wi-Fi can open the
app, read saved research or change watch rules; set `HOST="0.0.0.0"` in `.env` to open it to your
network on purpose. Docker reads and writes the same `data/local/settings.json` in the project
folder, so a key saved while the app runs in Docker also works with `npm run dev` and
`npm run check:data`, and the other way round.

| Source | Fills | Settings |
| --- | --- | --- |
| FRED API | The same yields as the FRED download, plus the full histories (stress indices, US inflation expectations), through the official API; and US data as first published (ALFRED vintages of real GDP, CPI and unemployment, US page only, needs the key) | Settings or .env: `FRED_API_KEY` (optional; the download is used without it) |
| Turkey central bank (EVDS) | Turkey 10Y yield | Settings or .env: `EVDS_API_KEY` and `EVDS_TR10Y_SERIES` (both needed) |
| US EIA open data | Daily Brent and WTI spot prices | Settings or .env: `EIA_API_KEY` (optional; free at eia.gov/opendata > Register; without it oil comes monthly from the Pink Sheet). Pulled every 12 h, on disk with the Pink Sheet |

## Your own paid data (off unless you switch it on)

All of these can be set in **Menu > Settings > Your own paid data** (pick Off, My CSV file or
My LSEG account, then fill in that option's settings), or in `.env`. Picking Off in Settings
switches CDS off even when `.env` has a feed set. The LSEG password and app key are stored and
shown like the other keys (masked); the file path, user name and RICs are shown in full.

| Source | Fills | Settings |
| --- | --- | --- |
| Your CDS file | 5Y sovereign CDS | `CDS_FEED="csv"`, `CDS_CSV_PATH` (full path; columns `iso3,date,cds5y_bps,source`) |
| LSEG Data Platform | 5Y sovereign CDS | `CDS_FEED="lseg"`, `LSEG_APP_KEY`, `LSEG_USERNAME`, `LSEG_PASSWORD`, `LSEG_CDS_RICS` |

The check reads your file and says how many countries it found and how old the latest quote is
(it warns after 7 days). For LSEG it signs in and prices your RICs. Keys and passwords never
appear in the check, the app or its logs.

Not built yet (planned, also own-account only): Bloomberg, EPFR/IIF flows, consensus forecasts.
Policy rates come from the free BIS dataset (see above); only Egypt, which the BIS does not cover,
reads Missing.

## What each series measures (data plan G6)

Every series carries two labels, taken from its source's own definition: **what it measures** (for
example "General government gross debt, as % of GDP (IMF WEO GGXWDG_NGDP)") and **whose figure it
is**, from one short list: general government (central, state and local government and social
security), central government, public and publicly guaranteed debt owed abroad, government debt in
default, the whole economy, industry, all sectors of the economy, households and non-financial firms,
households (consumer prices), the central bank, market prices, surveys of forecasters or of firms and
households, and a few more. They show under the title on the History page and as the `definition` and
`coverage` columns in every series download. The labels are kept in one table
(`src/utils/seriesDefinitions.ts`); a series not in it says "Not stated yet", never a guess. Your own
files say "As you described it when you loaded the file" and your subscription series "As your vendor
defines the series code you mapped".

**Units (data plan G8).** Each series also says whether it is real (adjusted for inflation) or nominal,
a share of GDP, a price change, a rate, an index and so on; the base year of an index or of constant
prices where it has one (World Bank CPI 2010 = 100, terms of trade 2015 = 100, GDP per head at PPP in
constant 2021 international dollars, IBC-Br 2002 = 100, Eurostat industrial production 2021 = 100); and,
for amounts and prices, the currency, including whether dollar figures use market exchange rates (IMF
WEO GDP in US dollars, World Bank amounts, debt in default) or purchasing power parity (GDP per head at
PPP). The unit converters (Research > One country > History & data) turn nominal amounts into real ones, local currency into
dollars and dollars into PPP terms using the World Bank CPI, exchange rate and PPP factor series these
labels name.

**Seasonal adjustment and how often (data plan G7).** Each series also says whether it is seasonally
adjusted, from how the app asks the source for it: OECD quarterly GDP is seasonally and calendar
adjusted (ADJUSTMENT Y); the EU surveys are seasonally adjusted (s_adj=SA); Eurostat industrial
production is seasonally and calendar adjusted, Brazil's IBC-Br seasonally adjusted; monthly inflation
is a change on a year earlier, so seasonal swings largely cancel; yearly figures, market prices and
inflation forecasts are "not applicable"; where the source does not say (BIS credit series, the NY Fed
supply chain index), "Not stated by the source". Where it matters, a note says how the points are
formed: month-end policy rates then the latest daily figures, the bond spread as a monthly average of
daily spreads, PortWatch daily counts averaged over each month, CFTC positions as of each Tuesday, one
point per Treasury auction, saved-download series as one point per download. **Months into quarters:**
the only place the app turns monthly figures into quarterly ones is the GDP nowcast, which averages the
three months of each quarter of the activity index and the leading indicator; a month not yet published
is forecast from the series' own past and the nowcast says so.

## Your data subscription (data plan G4; off unless you switch it on)

For someone who already pays for a data service. **Menu > Settings > Your subscriptions** switches
it on and picks the vendor, takes the vendor's sign-in details, and keeps the list of series you
want ("Your series"). The same switch can be set in `.env` as `PAID_DATA_VENDOR`.

- **Nothing is built in.** The app ships no vendor series codes and no vendor figures. You type the
  vendor's own code (for example Macrobond `usgdp`), the country (or WLD), what it is, its unit and
  how often it comes out. The list (codes and your labels, no figures) is kept in
  `data/local/paid/mappings.json`; adding and removing go to the audit log, never a figure or a key.
- **Labelled.** A mapped series shows under Research > One country > History as
  "<your label> (Your subscription: <vendor>)", with "Your subscription: <vendor>, series <code>" as
  its source. It sits next to the free series and never replaces or blends with them.
- **Never passed on.** Every table download, the series download, sharing mode, backups, the public
  copy and the council leave subscription figures out. Downloads name the series and say
  "Withheld: your subscription data" where the figures would be. The figures are shown only to
  screens on the computer running the app: another computer on the network, or a script using the
  data API key, is told they are withheld. The History page offers no download or "Publish chart"
  for them.
- **Sign-in details** are stored like the other keys (encrypted when a master key is set, masked,
  never in the audit log, a backup or the connection check).

| Vendor | Status | Settings |
| --- | --- | --- |
| Macrobond | Fetching works (data plan G5); not yet tried against a live licence | `PAID_DATA_VENDOR="macrobond"`, `MACROBOND_CLIENT_ID`, `MACROBOND_CLIENT_SECRET` (Web API client credentials; the API licence is separate from the desktop app) |
| Haver Analytics | Planned, G14, once a subscriber shares the API documentation | `PAID_DATA_VENDOR="haver"` |
| Moody's Analytics | Planned, G15, memory only (figures never saved to disk) | `PAID_DATA_VENDOR="moodys"` |

Until a vendor's fetching part exists, its mapped series read Missing with that reason.

**Macrobond (data plan G5).** The app signs in to the Macrobond Web API with your client ID and
secret (OAuth2 client credentials, scope `macrobond_web_api.read_mb`, the token address taken from
`apiauth.macrobondfinancial.com`) and reads your mapped codes from
`api.macrobondfinancial.com/v1/series/fetchseries`, a few codes per request, a quarter of a second
apart (Macrobond allows 100 requests per 10 seconds). The sign-in token is held in memory only.
Each date is turned into the period of the frequency you chose (for example 2026-04-01 becomes
2026-Q2 for a quarterly series); missing values are skipped, never filled in. A series Macrobond
cannot give keeps its last saved copy. Figures are saved in `data/local/paid/macrobond/`, which the
public copy refuses to include. Fetching happens in the daily run (step "Your data subscription",
`npm run go -- daily`) and with **Fetch now** under Settings > Your subscriptions; both report counts
and dates, never a figure. Before relying on it, check that your Macrobond licence lets you keep a
local copy of the series you fetch.

The connection check (row `paid_data`, also in `npm run check:data`) says whether the subscription
is on, whether its sign-in details are set and how many series are mapped. For Macrobond it also
signs in and reads the first mapped series, showing only how many values came back and their first
and last dates. It never shows a figure or a sign-in detail.

## AI model

| Provider | Settings | The check |
| --- | --- | --- |
| Ollama (on this computer) | `DEFAULT_AI_PROVIDER="ollama"`, `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`, `OLLAMA_DEEP_MODEL` | Lists installed models and names any configured model that is missing, with the `ollama pull` line |
| Gemini | `DEFAULT_AI_PROVIDER="gemini"`, and the key in Menu > Settings > AI model key or `GEMINI_API_KEY` | Reads the model's description, so the key and model name are checked without spending tokens |
| OpenAI-style server | `DEFAULT_AI_PROVIDER="openai_compatible"`, `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL` | Lists its models |

The provider can also be changed in the app (Menu > Settings > AI model and data connections). That setting
wins while the app runs; `npm run check:data` reads only `.env`.

## Your own connectors

Menu > Settings > AI model and data connections > connectors lets you point the app at your own JSON
address (an internal data lake, for example) and map its fields. Figures from a connector are
labelled with the connector's name. When a connector cannot be reached, its test says so and
maps nothing.

## Daily start-up run

Every `npm run go` (and a double-click on `econquest-mac.command`) starts the daily start-up run in
the background once the app is up; the app can be used straight away. It runs at most once every
20 hours (an hour after a run that found no connection), inside the Docker app when that is running
(so its figures land in the Docker app's data) and on this computer otherwise. In order:

1. Every free feed for every country, the same run as Menu > Offline data > Download all (steps
   pulled within the last day are skipped), including government spending by sector (Eurostat and
   IMF COFOG) and defence spending (SIPRI via the World Bank).
2. Files: past IMF WEO editions (`npm run weo:pull`, tried at most once a week because the IMF
   often refuses automated downloads with HTTP 403; then they have to be downloaded by hand from the
   IMF WEO database page into `data/local/weo-vintages/`), the OFAC and UN sanctions lists
   (`sanctions:pull`), the Geopolitical Risk index (`gpr:pull`) and newer UCDP files (`ucdp:pull`).
3. The long histories behind the nowcasts and forecasts (refreshed weekly), then a nowcast and a
   forecast for every country, listing which are Missing and why.
4. The pre-registered tests (backtests, forecast evaluations, currency signal tests) when the last
   run is more than 7 days old, so a Sunday the computer was off is caught up. Results are added to
   the forward record; recorded verdicts are never changed. `SCHEDULE_BACKTESTS=off` stops them here
   too.
5. The connection check, which lists every source that needs a key or a file from you. Sources that
   need your own key (FRED, Comtrade and the rest under Menu > Settings > API keys) are used only
   when you have set the key.

How much each run downloads (roughly 150 to 200 MB a day, an estimate) and how much space the
saved data takes is in [INSTALL.md](INSTALL.md#how-much-data-it-downloads).

The log is `data/local/logs/daily.log`; `npm run go -- status` (or `npm run daily:status -- --full`)
shows what the last run did. `npm run go -- daily` runs it now in the window, `npm run go -- --no-daily`
starts without it. Nothing is made up: a step that fails says why and the last good figures stay.

## Pull archive

Every country pull the app saves is also kept by day in `data/archive/<ISO3>/<YYYY-MM-DD>.json.gz`
(not in git). `data/live/` holds only the newest pull; the archive keeps each one, so later tools
can show what the data said on a past date. A retry later the same day replaces that day's file.
Files are gzipped, a few tens of KB each. Nothing is deleted unless you set `ARCHIVE_KEEP_DAYS` in
`.env` to a number of days. Read it back with `GET /api/archive` (countries and days),
`/api/archive/<ISO3>` (days) and `/api/archive/<ISO3>/<date>` (the pull on or before that date).
Docker and `npm run dev` share the same `data/archive/` folder.

## Docker

`docker compose` passes `.env` into the container. A CDS file must sit inside a folder the
container can see; running with `npm run dev` on the Mac avoids that step.
