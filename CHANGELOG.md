# Changelog

Notable changes for each release. The format follows [Keep a Changelog](https://keepachangelog.com/)
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Expert review round (P4, Policy review > Expert review): a short form a pilot economist or
  professor fills for a memo: clarity and use of evidence (1 to 5), whether the sources are correct,
  whether they would act on it, and a comment. Saved with the policy review on this computer, tied to
  the memo's hash, hash chained and audited; CSV download. Each reviewer chooses whether the review may
  be published (no, without their name, or with it) and can change that later; `npm run
  reviews:summary` writes docs/validation/expert-reviews.md from consenting reviews only.
  `npm run check:success` now counts them. English, Spanish and French.
- Behavioural check in Policy review (G33, under Evidence): for each saved option, where it depends
  on how people behave (take-up of a benefit, the response to a tax change, trust in an inflation
  target, defaults, removing something people have, acting now for a gain later), found by fixed word
  rules, each with published studies and official reviews from a fixed list with full citations
  (World Bank WDR 2015, OECD 2017 and twelve papers). No AI-written evidence and no built-in effect
  sizes: sizes appear only when you enter them with a source; they are hashed, audited and read Out
  of date when the options change. Description, not a tested signal. New glossary group Behavioural
  economics (present bias, defaults, framing, anchoring, loss aversion). English, Spanish and French.
- Central bank word count (G31, Research > History & data, also in Tools): hawkish and dovish
  phrases ("higher inflation", "weaker growth") counted with the fixed, published dictionary of
  Apel and Blix Grimaldi (2012, Sveriges Riksbank Working Paper 261), in central bank statements
  you save in data/local/cb-statements/<ISO3>/ (text, Markdown or saved web pages named by date),
  with a net index by statement and a box to count any pasted text. The same text always gives the
  same count; no AI scoring; the app downloads no statements. Description, not a tested signal.
  English, Spanish and French.
- Who pays for a policy (G30, Research > History & data, also in Tools): you type a tax or spending
  change (households pay or gain), its size in % of GDP, the share each fifth of people carries and
  the study those shares come from; the panel shows each fifth's amount, its share of income, the
  ratio of the two and whether the change is regressive, progressive or about proportional, beside
  the Gini index, the tax split (G16) and poverty rates (G17). Five new saved World Bank figures:
  the income share of each fifth (SI.DST.FRST.20 to SI.DST.05TH.20). Starts empty; no built-in
  incidence shares. English, Spanish and French.
- Debt restructuring calculator (G29, Research > History & data, also in Tools): type an old bond
  and the new bond offered for it (face value, coupon, years, grace years) and one to three discount
  rates; the panel shows what each bond is worth, the NPV haircut (Sturzenegger and Zettelmeyer
  2008), the market haircut, the payments year by year and a CSV. Every field starts blank. The
  smaller calculator in Model sandboxes now points here. The hidden desks "Haircut and exit yield"
  and "Investor base and banks" now link to this calculator and to Banks and the government.
  English, Spanish and French.
- Banks and the government (G28, Research > History & data, also in Tools): how tied a country's
  banks and government are, each figure with its source and year: bank assets, bank claims on the
  central government (also as a share of bank assets), domestic banks' share of government debt
  (IMF investor base, your file) and that share in % of GDP, bank capital to assets and
  non-performing loans. Four new saved World Bank figures (GFDD.DI.02, FS.AST.CGOV.GD.ZS,
  FB.BNK.CAPA.ZS, FB.AST.NPER.ZS), also under History & data. State-owned banks and contingent
  liabilities read Missing with the reason. Description only, no score. English, Spanish and French.
- Growth accounting (G27, Research > History & data, also in Tools): growth in each ten-year period
  split into capital, hours worked, human capital and productivity (TFP) from the Penn World Table
  (CC BY 4.0), as a stacked chart, a table and a CSV download. The edition's workbook is read once
  into data/local/pwt/ (downloaded, or your own copy put there); only the columns used are kept.
  Connection check row pwt. The licence row moves from planned to in use. English, Spanish and
  French.
- Inflation drivers (G26, Research > History & data, also in Tools): headline against core inflation
  (excluding food and energy), food and energy price changes, the core trend over 3 months, and for
  EU members the approximate points food, energy and the rest add to headline (Eurostat item
  weights for the same year only, residual shown). Sources: Eurostat HICP for EU members, BLS CPI-U
  via FRED for the United States, OECD consumer prices for other OECD members; elsewhere Missing
  with the reason. New glossary entry on core inflation and connection check row
  eurostat_hicp_parts. English, Spanish and French.
- Yield curve and financial conditions (G25, Research > History & data, also in Tools): the 10-year
  government bond yield minus the policy rate each month, past spells with the curve inverted,
  calendar-year averages, and a financial conditions index (policy rate, 10-year yield, spread over
  US Treasuries, real effective exchange rate; z-scores against the country's own history since
  1990, fixed equal weights; description only). The pre-registered `yield_curve_recession` test
  moved unchanged to docs/validation/preregistered and now runs with the other backtests (FRED
  10-year yields, BIS policy rates, IMF real GDP growth outturns). No recession figure is shown
  until it passes; after that only its historical hit rate. English, Spanish and French.
- External sustainability (G24, Research > History & data, also in Tools): external debt as % of
  GDP, a year of external debt service against reserves and exports, and the debt-stabilising
  non-interest current account d × (i − g) ÷ (1 + g) on five-year averages, beside the actual one.
  New saved World Bank IDS figures: external debt, debt service and interest paid, in US dollars.
  The current account norm (IMF EBA, terms not confirmed) and the net international investment
  position read Missing with the reason. English, Spanish and French.
- Crisis early-warning (G23, Research > History & data, also in Tools): the BIS credit-to-GDP gap
  against the Basel III lines of 2 and 10 points, past spells above 10 points, three-year change in
  private credit to GDP, and the private debt service ratio and real house price growth against
  their own average. No probability; marked Not validated. The pre-registered `crisis_warning` test
  stays in docs/validation/pending until the licence for the Laeven-Valencia crisis dates is
  confirmed, then its runner is built. English, Spanish and French.
- Behavioural Finance Agent (G32) in Council chat: describes herding and sentiment, never forecasts.
  Crowded CFTC positioning (pointing to the crowding rule's own badge), Polymarket crowd odds as
  market prices, and for EU members the European Commission's consumer confidence, economic
  sentiment and households' expected price trends (new: Eurostat ei_bsco_m, balance), each placed
  against its own history with a percentile, plus the 12-month change in expectations and the Timing
  Agent's reading. Survey against market inflation expectations and Kalshi read Missing with the
  reason. The pre-registered `inflation_expectations_lead` test (written 11 November, hash
  unchanged) is now runnable: December survey changes against Eurostat HICP inflation 12 months
  later, judged with its own seed and bootstrap. New connection check row `eu_price_expectations`;
  glossary entries for herding and households' expected prices (EN/ES/FR).
- Worked examples (W1, Menu > Worked examples): four guided case studies for the open country, from
  a question to a memo draft using the app's own screens: debt sustainability, inflation and
  interest rates, the currency, and a policy review. Figures are the ones saved on the computer,
  with source and year, or Missing; the short working (debt-stabilising primary balance, real policy
  rate, reserves against three months of imports, the budget with a spending plan) is done only when
  every input is live. Each step opens its screen; the memo can be copied or downloaded as Markdown.
  English, Spanish and French.
- Light mode for a modest laptop (U3, `LIGHT_MODE=on`, docs/INSTALL.md "On a modest laptop"): no
  AI model on the computer (the council uses your own Gemini key, or stays off and says so; the
  referee rule is unchanged), no GDELT 15-minute news files unless `GDELT_RAW_WEEKS` is set (about
  3.4 GB of the first download), and the start-up download and daily run fetch only the countries
  on your first watchlist and those you added, unless `PRELOAD_COUNTRIES` is set. The Mac start
  script takes `--light`, the Windows one `-Light`, and `scripts\start-windows-light.bat` starts it
  with one double-click. Settings > AI model says when light mode is on. The memory and disk
  figures for light mode are targets until measured on a real run.
- Success measures for after the public release (S1, docs/ROADMAP.md "How we will know it works"):
  GitHub stars, forks, issues, pull requests, flags sent as issues, discussions, app image and release
  downloads, the outcome-check hit rate, answer ratings and pilot feedback scores, with checkpoint 1 as
  the review date. Nothing is tracked: the app sends nothing for these. `npm run check:success` reads
  GitHub's public counts without a key and this computer's outcome checks and ratings, and keeps each
  run in data/local/success-measures.jsonl to show the change since the last run.
- Windows fixes found by the first GitHub Windows check: every text file now keeps Unix line endings
  on every checkout, so the pre-registered tests' hashes match on Windows (and in a Docker image built
  from a Windows checkout); test helpers are loaded by file URL so the tests run on Windows.
- Security, privacy and Windows review before the public release (G43, docs/SECURITY_REVIEW.md).
  `npm audit` finds no known vulnerabilities; routes, sign-in, file permissions, backups and exports
  were checked and needed no change. Fixed: the bundled Ollama container (used when no Ollama runs
  on the computer) is now published on 127.0.0.1 only, not on every network address, and Ollama no
  longer lets every website call it (`OLLAMA_ORIGINS=*` removed from the compose file, the Mac start
  script and the `.env` Settings generates). The Windows start scripts are now plain ASCII, so
  Windows PowerShell 5.1 can run them (a long dash broke the script), and stop with a plain message
  when Docker is not running or a build or start fails. A manual-only GitHub Windows check parses
  the script with Windows PowerShell 5.1 and runs the tests on Windows; a person's run on a Windows
  computer with Docker Desktop is still to do (steps in the review).

- Euro area and UK figures as first published (G12, G13): Research > History & data on euro
  members' pages now shows every release of euro area GDP growth, HICP inflation and unemployment
  from the ECB Euro Area Real-Time Database (its revision history), and the UK page shows every
  publication of quarterly GDP growth since 1992 from the ONS revision triangle. Both use the same
  panel as US data as first published: every release of a period, and what was known on a chosen
  day. The ONS gives only the month of each publication, so each is dated the last day of its
  month. When the ONS refuses the download, a copy of abmi.zip saved in data/local/ons-triangles/
  is read. Two new weekly daily-run steps save gzipped copies. `npm run check:vintages` prints both
  sources' layouts; two Data health rows. Licence check: ECB statistics reuse policy (free reuse
  with the source quoted) and the ONS Open Government Licence v3.0. Spanish and French text.

- Revenue and spending by level of government (G42, step 1): two new rows under "Fiscal and debt"
  in the country brief and note show central, state, local and social security revenue and
  spending as % of GDP, with the share done by state and local governments, for the latest year.
  The sources are Eurostat (gov_10a_main) for EU members and the IMF Government Finance Statistics
  (main aggregates by sub-sector, read through DBnomics) for other countries. Each level is counted
  before transfers between levels are netted out, so the share is worked out from the sum of the
  levels and labelled so. Countries that publish only central government figures read Missing
  with the reason. A new weekly daily-run step saves one copy. The Fiscal & Debt Agent quotes
  spending by level. A Data health row also counts how many countries publish state or local
  figures, which decides whether step 2 (a per-state screen) is built. Licence check: IMF GFS falls
  under the IMF statistical data terms (attribution; personal use). Glossary entry; Spanish and
  French text.

- Monthly activity (G41): a new group "Monthly activity" in the country brief and note with
  industrial production, retail sales and the monthly unemployment rate, each for the latest month
  with the change on a year earlier (and on the month for the indexes). Sources: Eurostat for EU
  members and Turkey; the Federal Reserve (industrial production), Census Bureau (retail sales, in
  dollars) and BLS (unemployment) through FRED for the United States; the ONS for the United
  Kingdom; IBGE through the Banco Central do Brasil for Brazil. Other countries read Missing with
  the reason; the IMF has no free monthly series the app could confirm. A new daily-run step saves
  one copy for all of them. The release calendar gains monthly activity dates for the United States
  (Fed G.17, Census retail sales, BLS employment report), read from each office's own page; the
  Eurostat, ONS and IBGE calendars could not be read and say so. History & data gains three monthly
  charts with CSV. The Central Bank Agent quotes industrial production and the monthly unemployment
  rate. Data health rows for Eurostat, ONS and BCB activity; an ONS licence row (Open Government
  Licence v3.0); a glossary entry; Spanish and French text.

- Sector balances and private debt (G40): a new group "Sector balances and private debt" in the
  country brief and note. The government balance (IMF Fiscal Monitor), the private sector balance
  and the foreign balance sit side by side for the same year. The private balance is worked out as
  the current account minus the government balance, the remainder of an accounting identity, and is
  labelled so; the foreign balance is minus the IMF WEO current account. When the two IMF figures are
  for different years the rows read Missing rather than mixing years. Household and company debt
  (credit from all lenders, % of GDP, BIS total credit statistics) show with their quarter. A new
  daily-run step downloads all BIS countries at once; the per-country History & data download adds
  the full quarterly history. History & data gains five charts with CSV: household debt, company
  debt, the IMF current account (% of GDP), and the private and foreign balances by year, with IMF
  projection years kept as projections. The Fiscal & Debt Agent quotes the private balance and both
  debt figures. A Data health row for BIS total credit; glossary entries; Spanish and French text.

- Wages and house prices (G22): four new rows under "Growth and inflation" in the country brief and
  note: nominal wage growth (average monthly earnings of employees in local currency from ILOSTAT,
  the International Labour Organization's statistics, CC BY 4.0), real wage growth (the app's own
  figure: nominal growth deflated by World Bank consumer price inflation for the same year, labelled
  so), and real and nominal house prices (BIS residential property prices, change on a year
  earlier), each with its year or quarter. Wage growth is left Missing when the ILO marks a break in
  the series or the year before is not published. Two new daily-run steps download all countries at
  once (wages weekly, house prices daily). Nominal house prices also chart under History & data. The
  Central Bank Agent quotes nominal pay and real house prices; the Politics Agent quotes real pay.
  Data health rows for ILOSTAT and the BIS house price series; the ILOSTAT licence row moves from
  planned to in use; glossary entries explain real against nominal; Spanish and French text.

- Climate and energy (G20): a new "Climate and energy" group in the country brief and note:
  greenhouse gas emissions per person (World Bank, from the EU's EDGAR database, excluding land use)
  and the renewable share of final energy use (World Bank, SDG 7), each with its year; the energy mix
  (coal, oil, gas, nuclear and renewables shares of primary energy) from Our World in Data's energy
  file, based on the Energy Institute's Statistical Review. The Energy Institute's terms allow
  private, non-commercial use only, so the daily run downloads the file to each computer (weekly,
  new step "Energy mix") and it is never shipped; the licence page and the row's source say so.
  Physical climate risk (ND-GAIN) reads Missing, since ND-GAIN states no licence. The Global
  Spillover Agent quotes the energy mix. Emissions and the renewable share chart under History & data
  and are in downloads; Data health rows for the World Bank figures and the energy file; glossary
  entries; Spanish and French text.

- Trade and commodity exposure (G18): a new "Trade" group in the country brief and note: the shares
  of goods exports and imports in fuel, ores and metals, food and manufactures (World Bank, from UN
  Comtrade), net energy imports as % of energy use (World Bank; a net exporter is shown as how many
  times its own use it produces, and an old year is said to be old), export concentration (the app's
  Herfindahl calculation across the 97 HS chapters, labelled so, with the rule shown) and the top five
  export markets (UN Comtrade). Comtrade's product request now asks for every HS chapter; when that is
  refused the app asks for the commodity chapters as before and leaves the concentration Missing. The
  Hormuz scenario's working names the energy position, the scenario panel shows the two biggest
  gainers as well as the three hardest hit, and the Global Spillover Agent quotes the new figures. The
  nine World Bank series chart under History & data and are in downloads; Data health row; glossary
  entries; Spanish and French text.

- Debt structure (G19): new rows under Fiscal and debt in the country brief and note, and in the
  Fiscal & Debt Agent: interest payments as % of central government revenue (World Bank), the
  currency mix of public external debt (US dollar, euro, yen, pound, Swiss franc, SDR, several and
  other currencies) and the average maturity of new public external loans (World Bank International
  Debt Statistics; low- and middle-income countries only; labelled as new loans, not the debt already
  owed). "Who holds government debt" comes from the IMF Sovereign Debt Investor Base for Emerging
  Markets and Developing Economies (Arslanalp and Tsuda): shares held by foreign official lenders,
  foreign banks, other foreign investors, the central bank, local banks and other local investors,
  for about 136 countries, read from the workbook you put in `data/local/imf-investor-base/` (not
  shipped; IMF data terms, commercial use needs permission; licence row added). Without the file it
  reads Missing with the download link; for the United States it points to the Treasury's
  foreign-holder figures. Interest as % of revenue charts under History & data and is in downloads.
  Data health has rows for the World Bank figures and the IMF file; glossary entries; Spanish and
  French text.

- People and living standards (G17): seven World Bank series in the country brief (new group
  "People"), History & data, downloads and the council: the poverty rate at the lowest international
  line and the two higher lines (household surveys up to 15 years back, with the dollar amount of each
  line as the World Bank names it, the survey year and income or consumption), remittances received
  (% of GDP), labour force participation and youth unemployment (ILO modelled estimates, labelled so)
  and the age dependency ratio. Each reads Missing with a reason when absent. The Politics & Events
  Agent quotes the extreme poverty rate and youth unemployment; the FX Valuation Agent quotes remittances. Data
  health has a row for it; glossary entries at Key and Full help; Spanish and French text.

- Low-income country debt (U1): a new group "Debt relief and lending from China" in the issuer brief
  and note, and in the Fiscal & Debt Agent. It shows the IMF/World Bank risk of debt distress for 67
  low-income countries (typed from the IMF list as of 30 September 2026, with each DSA's date, the
  sustainability judgement and the arrears and restructuring notes), whether the country applied to
  the G20 Common Framework (Paris Club, as of 2024), and official loan commitments from China, 2000-2021, summed per
  country from AidData's Global Chinese Development Finance Dataset 3.0 and shipped in
  `datasets/aiddata/` (ODC-By; swap drawdowns, refinancing and pledges left out). A newer AidData file
  in `data/local/aiddata/` wins; `npm run aiddata:summary` rewrites the shipped summary. DSSI participation is set aside for later and reads Missing with the reason. Data
  health has a row for the AidData file; three licence rows move from planned to in use.

- Inequality, tax revenue and tariffs (G16): seven World Bank series in the country brief (new
  group "Distribution and taxes"), History & data, downloads and the Fiscal & Debt Agent: the Gini
  index (household surveys, up to 15 years back, with the survey year and income or consumption),
  central government tax revenue (% of GDP, labelled as lower than the IMF general government
  figure), taxes on income and profits, on goods and services and on trade (% of revenue), and the
  applied tariff, weighted and simple mean (labelled with its year; later tariff changes are not in
  it). Each reads Missing with a reason when absent. Data health has a row for it; glossary entries
  at Key and Full help; Spanish and French text.

- Flag and rate (P2, P3): a Flag button on History series, council answer figures and council
  answers saves a note on this computer (data/local/feedback.jsonl) with the figure, source and app
  version, and offers a filled-in GitHub issue link that you send yourself (paid figures leave their
  value out). Thumbs up or down on council answers, with an optional reason; ratings never change an
  answer. Data health counts both; `npm run feedback:export` writes the rated questions for the
  council test set.

- Pre-mortem step (G38): in a policy review, the council now says for every option how it could fail
  and names one to three diagnosis figures that would show it first, rising or falling. An option
  without one is flagged. The memo carries the recommended option's pre-mortem and pre-fills its
  figures under What to watch, and the 12- and 24-month outcome checks judge each one (Warning shown,
  No warning, Too early, Missing). Options template v3, memo template v2, outcome-check rules v2.

- Policy outcome check (P1): every saved policy review is checked on its own 12 and 24 months after
  its As of day. Each check reads Hit, Miss, Too early or Missing with the reason, from the pull saved
  on or before the due day, is saved once with the review (hash chained, never changed) and written
  to the audit log. Results show under step 6 and in Menu > Models & validation > Track record >
  Policy track record (docs/POLICY_REVIEW.md).

- Upkeep routine (M1, docs/MAINTENANCE.md): Data health and `npm run check:data` flag a source that
  has failed every check for 30 days or more; a licence row whose terms were read over 12 months ago
  shows "Licence check due" (About & data licences, Data health); Dependabot runs monthly, minor and
  patch updates grouped; a written rule for a source that ends (figures keep their last date with an
  "Ended" note, nothing filled in from elsewhere).
- Size review (K1): the app drops from 5.84 MB to 5.19 MB. jsPDF's helpers for HTML and SVG pages
  (html2canvas, DOMPurify, canvg), which the app never uses, are left out of the build, and the
  share-preview logo is stored with 256 colours (336 KB to 41 KB). Start-up size is unchanged.
  The whole-app limit goes from 6 MB to 7.5 MB to make room for three more languages.
- "Cite this" (G11): a Cite button on Chart Agent charts, History series and council answers gives a
  citation in plain text, BibTeX and RIS: the app with its version and the date cited, then each
  data source with the credit its terms ask for and the date read (src/utils/citation.ts).
  Replication packs add `data-manifest.csv` and `CITATION.cff`.
- Licence check of every source the planned steps will read (Wave 0): 13 new rows in a "Sources
  planned, not read by the app yet" section of docs/DATA_LICENCES.md. Open with credit: AidData
  (ODC-By), Penn World Table and Our World in Data (CC BY 4.0), IMF GFS and FSI (IMF data terms).
  Not confirmed yet, with what to do before building: IMF MONA, Fiscal Rules, EBA and the LIC DSA
  list, Laeven-Valencia crisis dates, DPI, ND-GAIN, ILOSTAT, DSSI and Common Framework pages.
- Three tests written down and hashed before their tools exist (docs/validation/pending/): credit
  gap and banking crises (G23), inverted yield curve and recessions (G25), household inflation
  expectations and later inflation (G32).
- The roadmap shows the agreed build order in waves, from Wave 0 to checkpoint 2, and the freeze on
  new features until checkpoint 1.
- Docs brought up to date through data plan G10: the roadmap's done list adds figure labels, ranges,
  the release calendar and the paid-data frame, and marks Phase 4 as paused after G10 for review; the
  README describes the labels on each series, forecast ranges, the release dates and Your
  subscriptions.
- The daily run now records how much it downloaded: each step in `npm run go -- status` shows its
  size, with a total for the run, kept in data/local/daily-run.json. Only replies from other
  computers count; a compressed reply counts the size sent over the network.
- Docs: minimum and recommended computer (operating system, memory, disk, Node.js 20.19+ or 22.12+,
  internet), disk space part by part, what sits in `data/`, and how much each run downloads (first
  run, daily, weekly, monthly), each figure marked as measured or estimated (INSTALL.md "What you
  need"; short version in the README, home server guide, data sources and user manual). Plainer
  wording in the docs, help text and code comments in English, Spanish and French ("honest",
  "quietly", "silently", "simply", "genuinely" and "ensuring" replaced where they were filler).
- Release calendar (data plan G10): each country's brief now shows the next CPI release and the next
  first GDP estimate, from the statistics office's own calendar, read 9 November 2026 for the United
  States, Canada, the United Kingdom, China (CPI), Japan and Australia. The other G20 countries show
  Missing with the reason the office's calendar could not be read (refused an automated reader, built
  in the browser, robots.txt for Turkey and Russia, or an error); no date is estimated from a pattern.
  The dates also appear in Next two weeks and in Data health > Calendar. Spanish and French text.
- Uncertainty ranges (data plan G9): forecasts show a range by default, and say what it means. A line
  under the forecast chart explains the 50, 70 and 90% bands (how often the figure should land inside,
  judged by the model's own past misses, and that doubt about the model itself is left out). Where a
  method has no sound range the screen says "No range available" and why: IMF projections, projection
  years in the gross financing need table, and the small gap model. The fiscal what-if says its range
  spans the published multipliers and is not a probability band. At Help off the forecast bands, the
  nowcast band and the debt fan bands are hidden, with a line saying so; downloads, the data API and
  Explain keep them. Spanish and French text.
- Units labels (data plan G8): every series now says whether it is real or nominal (or a share of GDP, a
  price change, a rate, an index and so on), its base year where it has one, and for amounts and prices
  its currency, including whether dollar figures use market exchange rates or purchasing power parity.
  Shown on the History page, filled in the `measure`, `base_year` and `currency` download columns, and
  under `tags` in the series lists. Spanish and French text.
- Seasonal adjustment and frequency labels (data plan G7): every series now says whether it is seasonally
  adjusted (seasonally adjusted; seasonally and calendar adjusted; not adjusted; a change on a year
  earlier; not applicable for yearly figures, market prices and forecasts; or "Not stated by the source"),
  taken from how the app asks each source. Where it matters, a note says how the points are formed
  (month-end rates, monthly averages of daily figures, one point per auction or per saved download) and
  that the GDP nowcast averages three months into a quarter, flagging a month it had to forecast. Shown on
  the History page, filled in the `seasonal_adjustment` download column, and under `tags` in the series
  lists. Spanish and French text.
- Definition tags (data plan G6): every series now says what it measures and whose figure it is (general
  government, central government, public external debt, households and firms, the whole economy and so
  on), from each source's own definition. Shown under the title on the History page, under `tags` in the
  series lists, and as new `definition` and `coverage` columns in every series download. Empty
  `seasonal_adjustment`, `measure`, `base_year` and `currency` columns are added now so G7 and G8 only fill
  them. A series without a definition says "Not stated yet". Spanish and French text.
- Macrobond adapter (data plan G5): with your subscription set to Macrobond and your Web API client ID
  and secret entered, the app signs in (token held in memory only) and fetches your mapped series, in the
  daily run (new step "Your data subscription") or with the new "Fetch now" button under Settings > Your
  subscriptions. Dates become periods of the frequency you chose; missing values are skipped, never
  filled; a series Macrobond cannot give keeps its last saved copy. The `paid_data` connection row now
  signs in and reads the first mapped series, showing only counts and dates. Notes never carry a figure
  or a sign-in detail. Spanish and French text. Not yet tried against a live licence.
- Your data subscription (data plan G4): the frame for a paid data service you already subscribe to.
  New Settings page "Your subscriptions" (off by default; lazy-loaded series list): pick the vendor
  (Macrobond; Haver and Moody's planned), enter its sign-in details (stored like the other keys) and map
  the vendor series codes you want to a country, label, unit and frequency. Nothing is built in. Mapped
  series show on the History page labelled "Your subscription: <vendor>"; their figures never leave the
  computer: every table download withholds them ("Withheld: your subscription data"), backups, sharing
  mode, the public copy and the council leave them out, and other computers and scripts using the data
  API key are told they are withheld. Data health row `paid_data` (no figures, no sign-in details), audit
  entries for mapping changes, Spanish and French text. Fetching from Macrobond comes in G5; until then
  mapped series read Missing with that reason.
- README rewritten for lay readers to match the app as it is now (three languages, the council and its
  referee, the research panels, your own data and tests, the data API, the daily download, how figures are
  tested), and a new docs/ROADMAP.md lists what is done and what comes next, in order.
- Fresher inflation figures (data plan G3): IMF monthly consumer prices (CPI dataset, found by IMF names,
  `IMF_CPI_KEY` override) join the national and Eurostat series ahead of the stale OECD copy on DBnomics. Each
  country takes the freshest source (same month: national, then IMF, then OECD), always whole from one source.
  New Data health tab "Inflation" with each figure's source, month and age, flagging figures over 90 days old
  and old OECD copies. Daily-run step `world:imf_cpi`, Data health row `imf_cpi`, `npm run check:imf` prints the
  CPI codes, and the freshness note now points to IMF monthly CPI where no national feed exists.
- EU business and consumer surveys (data plan G2): the European Commission's monthly Economic Sentiment
  Indicator, industrial, services and consumer confidence and Employment Expectations Indicator for EU members,
  seasonally adjusted, from 2005, read free from Eurostat. A free stand-in for paid PMIs, labelled "EU business
  survey, not a PMI" everywhere. The daily download saves them (data/live/eu-surveys.json); they show on the
  economist note under Growth and inflation, as chartable series on each EU member's page and in council charts.
  New Data health row (eu_surveys), Eurostat licence row extended, glossary entry, and Spanish and French text.
- US Treasury auctions (data plan G1): bid-to-cover, high yield, amounts and the indirect bidders' share for
  13- and 26-week bills, 2-, 5- and 10-year notes and 30-year bonds, ten years back, from the free US Treasury
  Fiscal Data API. The daily download saves them (data/live/ust-auctions.json) and pages read only that copy.
  They show on the United States issuer note ("Recent US Treasury auctions", with a stated rule against the
  previous six auctions), as chartable series on the United States page and in council charts. New Data health
  row, licence row (open, any use), glossary entry, and Spanish and French text.
- French, part 4 (the last): the Menu and its dialogs (Settings with every key and setting, backups, morning
  brief, About, add a country and the rest), the help at Key help and Full help (chart guides, panel introductions
  and the whole glossary), and Reports (teaching episodes, saved research, policy reviews and the memo builder).
  French now covers the whole app, like Spanish. The Settings, help and Reports coverage tests check French too.
- French, part 3: the watchlist (also when popped out), Your data, the small gap model, Your tests, My holdings and
  the book briefs, the Tools page with its groups, descriptions and tool panels, and Compare countries (MarketEdge,
  divergences, growth and inflation quadrant, scenarios, story leads and the Fed balance sheet). The tool, compare
  and chat-card coverage tests now check French as well as Spanish.
- French, part 2: the Research pages (scope bar, section names, Sources), one country's three briefs with their
  figure names, reasons and meanings, and every panel on one country's other tabs, including the sentences the app
  writes from the data (debt sustainability, policy rules, event studies, scenarios, track record and the rest).
  Tests check that every brief and panel sentence the app can build has French, as they already do for Spanish.
- French, part 1: the language button now goes English, Español, Français. French downloads only when picked
  (its own file, separate from the Spanish) and covers the header, Workspace and its Briefing panel, Council chat
  and its cards, and the reasons a figure shows as Missing, in the formal "vous". Anything not translated yet
  shows in English. Tests check every French file is complete, keeps its placeholders and never uses "tu".
- Register your own test, part 2 (run and record): "Run my tests" under Menu > Models & validation > Your tests runs
  every registered test that has no verdict yet, in the background, with the same methods and free histories as the
  app's own backtests. Verdicts are kept in data/local/validation/user-results.json (forward record in
  user-forward.jsonl) and the audit log, apart from the app's own; a recorded verdict is never run again, so it
  cannot change. Each verdict shows a Holm-adjusted p across your own tests only.
- Register your own test, part 1 (the form): Menu > Models & validation > Your tests lets a researcher write a
  hypothesis, pick one of the app's backtest methods and type every threshold, the sample and the pass mark, then
  save it. Saving freezes it with the server's date and a SHA-256 fingerprint in its own manifest
  (data/local/validation/user-tests/); it cannot be edited or removed, and a file changed by hand is refused.
  Every box starts blank, with the app's own registered value shown only as a reference. Kept apart from the
  app's tests. Running them comes in the next change. English and Spanish.
- Data API for scripts: docs/DATA_API.md lists the read-only addresses for series, panels and figure tables
  (the same ones the screens use, with source and date on every value and Missing with its reason), with
  helper files for Python, R and Stata in scripts/data-api/ that need nothing installed. Downloads follow
  Sharing mode. A copy with sign-in on lets a script read those addresses, and only those, with the
  integration API key sent in a header. Reads that do not come from a signed-in account are limited to
  about 120 a minute per address so a script cannot slow the app.
- Small gap model, part 3 (council link): "Ask the council about this run" sends the run to Council chat as an
  Explain request labelled "Your model", with every parameter, the starting point, any shocks and the path, so the
  council treats the numbers as the user's own assumptions, not published figures or a forecast. It asks the AI
  model only when pressed.
- Small gap model, part 2 (the screen): Research > One country > History & data now has the small gap model under
  the sandboxes. Every parameter starts blank; a "Fill starting point from latest data" button copies the country's
  latest saved output gap, inflation and policy rate into the starting boxes with each one's source, and names the
  reason when a figure is missing (the exchange-rate gap is always the user's own judgement). Optional shocks, a
  chart and table of the path, and a CSV download with the settings written at the top. English and Spanish.
- Small gap model, part 1 (the calculation, src/utils/gapModel.ts): four plain quarterly equations for the output
  gap, inflation, the policy rate and the exchange rate. It ships with no numbers: every parameter and starting value
  is typed in by the user, a blank one is shown as Missing and nothing runs, and a setting that explodes stops with
  a warning. The screen comes in the next change.
- Small referee (opt-in): Menu > Settings > AI model has a new "Allow a 14B referee" box, off by default. With it
  ticked, a mid-size model (9B to 29B, for example qwen2.5:14b) can be the referee, which needs about half the memory
  of the 32B model; every chat summary and debate it judges says "Small referee". With it unticked, a mid-size
  referee setting is ignored and the 32B model is used. `OLLAMA_ALLOW_SMALL_REFEREE=on npm run go` also downloads
  the 14B model. 30B and larger models stay full referees; 8B or less stays flagged.
- Lighter checks on pull requests: a change that only touches writing (Markdown files, docs/, licence files) runs
  the type check and tests but skips the build, size check and browser tests; the app-image check runs only when
  the Dockerfile, deploy files, server code, package files or the checks themselves change; a newer push to the
  same pull request cancels the older run; and the browser download for the UI tests is kept between runs.
  Every push to main still runs everything.
- Faster start: Council chat's screens now download the first time the chat or the Agents panel is shown, not
  with the rest of the app, which takes about 13 KB (compressed) off what every visitor downloads at start.
  The conversation itself still lives above the pages, so a question keeps running while you move.
- Spanish (español): an EN / ES button in the header switches the app's own words; the header, Menu and help
  switch come first, the rest follows a part at a time. Translations live in keyed message files (src/i18n/messages/).
  Council chat and Your data are now in Spanish too. The Spanish words load only when Spanish is chosen
  (src/i18n/es/), so English users download none of them. In Spanish the chat says to ask questions in English
  for now, because the agents read questions in English. Workspace (the Agents and Briefing panels, your inputs,
  what moved, the next two weeks and watch alerts) is in Spanish too, and so are the watchlist table, its
  column picker and the pop-out watchlist window. The reasons a figure shows as Missing are in Spanish on screen
  as well; they stay English in notes and in what the council reads. Research's frame is in Spanish too: the scope
  bar, the four section names, the Compare and My holdings headers, the live-data badge, the Sources grid, and one
  country's header and Sources tab; the panels inside each section follow. One country's Summary and Markets & signals
  now have Spanish headings, buttons and help links. The text those panels build from the data (panel titles, figure
  names, the reason under a missing figure, "Why missing?", "What it means" and the missing-figures note) is shown in
  Spanish too, swapped on screen only so notes and the council still read English; observations with figures in
  them, source names and calendar event titles stay English for now.
  The one-country Research panels (History & data, the output gap, debt sustainability, fiscal reaction, IMF
  forecast vintages, US data vintages, financing needs, policy rules, event studies, the fair-value exchange rate,
  local projections, reserve adequacy, the risk scorecard, sanctions, fiscal multipliers, scenarios, forecasts,
  "as of" history, decision replay, track record and GDELT news) are in Spanish too, including the sentences and
  reasons the app writes from the data; method notes and references stay English because they cite papers and data
  sets, and what the council reads stays English. Five of those panels now download only when opened, which takes
  about 110 KB (compressed) off the start. The app's total size limit is raised from 5 MB to 6 MB to hold the
  Spanish and French text, which downloads only when someone picks that language.
  Holdings and Tools are in Spanish too: the holdings editor, the book table, signals on your holdings, the book
  and client briefs on screen, the Tools page with every tool and hidden desk, the compare-countries table, research
  notebooks, unit converters, exercises and model sandboxes. Downloaded reviews and notebooks stay English.
  The Spanish now addresses the reader as usted throughout, the usual form for professional and official readers.
  The Compare countries panels are in Spanish too: story leads, where data and price disagree, growth and inflation,
  MarketEdge, scenario exposure and the Fed balance sheet, with the sentences the app writes from the data. The
  "Since your last visit" lines on Workspace now show in Spanish as well.
  The Menu dialogs are in Spanish too: Settings (AI model, free data keys and what each one does, server alerts,
  morning brief, backup), About & data licences, Account and the sign-in page, Add a country, the Idea journal,
  Data connections and Offline data. Each source's licence row stays in English because it quotes that source's terms.
  The help is in Spanish too: every "What is this?" glossary entry, the panel introductions, the "How to read this
  chart" guides, and the Glossary in Menu > User manual, which is shown translated in Spanish (docs/GLOSSARY.md stays
  English). The user manual and the About the project page stay English for now and say so.
  Council chat's cards are in Spanish too: the approval pause and its assumptions, the answer snapshot and re-run
  notes, the what-if scenario card, explanations, the chart card's buttons and controls, the agent documents' frame,
  sign-off, policy documents, and the Agents panel's steps, agent descriptions and scope notes. The agent documents
  themselves stay English, as the agents and the summary read them, and the window says so. "Menu > Settings" links in
  translated help still open the right page of Settings.
  The Reports pages are in Spanish too: policy reviews (every step, option, lens, evidence and outcome screen), saved
  council documents, teaching episodes and the report builder's settings, types and section headings. The memo and
  report text itself stays English, because it is shared and exported, and the page says so.
- Your data (Menu > Your data): load your own series from a CSV file, checked line by line, kept exactly as given,
  labelled "Your file" with your source, fingerprinted with SHA-256 and recorded in the audit log.
- Ready-made app image: each public release publishes the app to GitHub's image store
  (ghcr.io/e-conquest/econquest), for Intel/AMD and Apple Silicon/ARM machines, so nobody has to build it.
- docs/INSTALL.md: a plain-language install guide for people new to this, with deploy/quick-start/compose.yml.
- docs/METHODOLOGY.md: the methodology document (version 1.0) for the website and the public release.
- G20 Members watchlist: all 19 G20 member countries, first on the list for new users and added once
  for existing users. The twelve new countries draw on the same free feeds; figures with no source read Missing with the reason.

## [0.1.0] - 2026-11-07

First public release.

- Research terminal for emerging-market sovereign and macro risk on free official data (World Bank,
  IMF, BIS, ECB, central banks, FRED, CFTC, UCDP and others), each figure shown with its source and date.
- Council chat with desk agents that answer only from the app's figures, on a local Ollama model or a
  Gemini key.
- Research panels: debt sustainability and fan charts, gross financing need, reserve adequacy, policy
  rules, inflation after rate changes, capital flows, FX factors, conflict, sanctions and geopolitical
  risk, ALFRED first-release US data.
- Pre-registered backtests, forecasts and signals with recorded verdicts, Holm correction and badges
  (docs/METHODS.md).
- Accounts, audit log, encrypted keys, Docker, home-server and Helm deployment.
- Licences: Apache-2.0 for code, CC BY 4.0 for documentation and content.
