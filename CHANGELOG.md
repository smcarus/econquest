# Changelog

Notable changes for each release. The format follows [Keep a Changelog](https://keepachangelog.com/)
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

- When a screen or panel fails to draw, its note now has Copy details (version, where, the error and
  the first lines of the component stack; no figures or saved data) and Report this problem, which
  opens a new GitHub issue with those details filled in. Menu > Report a problem opens a new issue
  with the version filled in. Nothing is sent until the person sends it.
- Menu > About says when a newer release is out, with a link to what changed and the update steps,
  and the Menu shows "New version" beside About. The server asks GitHub for the newest release
  number at most once a day (an hour after no answer), only while the app is open, and sends nothing
  about you. `UPDATE_CHECK=off` turns it off.
- A privacy page, docs/PRIVACY.md, says in one place what stays on your computer, what leaves it and
  when: requests for figures to public sources, questions to an online AI provider only if you choose
  one, screen fonts from Google Fonts, and alerts, audit copies or sign-in only if you set them up.
  The app has no tracking, usage counts or crash reports. Menu > About & data licences has a short
  Privacy section in all four languages, and the READMEs link the page.
- While a source does not answer, five feeds that used to drop to Missing for an hour now show their
  last good answer, with its own dates: external debt falling due, the BIS credit cycle, World Bank
  creditors, BIS daily policy rates and the long BIS real exchange rate. The source is asked again
  after 15 minutes, 1 hour, then every 4 hours. A saved answer older than its limit (14 days for
  daily rates, up to 400 days for yearly data) is not served, so the figure reads Missing as before.
  Menu > Data health > Sources lists which feeds are showing saved figures and when each is asked
  again (saved in data/live/last-good/).
- The daily data run gives download steps that failed (the feeds, wholly or in part, and the WEO,
  sanctions, GPR, Chinn-Ito, UCDP and replay files) a second try at the end of the run, 2 minutes
  later. One that still fails is tried again, alone, by the next start once 2 hours have passed (at
  most 3 times before the next daily run), so a source that was down in the morning is fetched when
  it is back. `npm run go -- status` shows each later try and what now works. The weekly tests are
  never re-run this way.
- Slow or busy sources are asked again before they count as failed. The connection check
  (`npm run check:data` and the nightly check) tries up to three times, 3 s then 10 s apart, after no
  answer in time, a cut connection, 429 or 500-504, follows the server's Retry-After (up to 60 s),
  and gives the World Bank, ECB and GDELT 30 s per try. A failure that stays says how many times it
  was asked. Feed readers in the app try once more after 1.5 s. Refusals (401, 403, 404), bot-check
  pages and "connection refused" are not retried.
- When port 3000 is busy (often another Docker container), `npm run go` starts the dev server on the
  next free port, names what holds 3000 and lists it under "Notes"; this alone no longer makes the
  command fail. `npm run check:data`, `npm run oecd:vintages`, `npm run mac:validate` and
  `npm run council:record` update the folder first when it is behind GitHub and run again on the new
  code (`ECONQUEST_NO_UPDATE=1` skips this).
- `npm run go` and `npm run update` no longer stop on files the app writes itself (generated docs
  such as docs/METHODS.md and docs/TRACK_RECORD.md, docs/validation/recorded-verdicts.json, recorded
  test data under tests/fixtures): they are copied to data/local/backups/before-pull-<time>/, put
  back to the repo version, and the pull goes through. Files changed by hand are left alone and named
  (`bash scripts/safe-pull.sh` does the same on its own).
- `npm run oecd:vintages` no longer trips the OECD's request limit: requests go 4 seconds apart,
  a "too many requests" (429) or busy-server (500-504) answer is retried up to 4 times after a
  wait (the OECD's Retry-After when given), and the run stops after repeated 429s so the next run
  carries on from the files already saved. Countries with only quarterly consumer prices (for
  example Australia and New Zealand) are now named as such instead of "no new edition".
- How shocks spread between economies (History & data tool): a small global VAR of 16 main
  economies plus the country being looked at. Each country's growth and inflation read its trading
  partners' through IMF trade weights (International Trade in Goods by partner, latest three years);
  the models are joined, checked for stability and a surprise of your size is traced over five
  years with generalised impulse responses and 90% bootstrap bands. Annual IMF World Economic
  Outlook figures from 1996; the United States sees the others with a one-year lag. A source that
  does not answer reads Missing with the reason.
- Council answers in your language: with Spanish, French or Portuguese picked (Menu language
  button), Council chat, the Supreme Council, what-ifs and policy reviews write their text in that
  language ("usted", "vous", "você"). Field names, stances, ratings, numbers, units and source names
  stay as given so the app's checks read every answer the same way. English sends nothing extra, so
  English prompts and the recorded council replay are unchanged.
- Your broker prices: live prices for contracts you list, from your own Interactive Brokers
  account through the IBKR Client Portal Gateway you run and sign in to on your computer. Off by
  default (Menu > Settings > Your subscriptions); the app ships no contract ids and never sees your
  IBKR password. Prices are held in memory for 10 seconds and shown on screen only: never saved,
  put in downloads, backups or shared copies, answered to scripts or sent to the AI model. New
  connection check row `broker_prices` (gateway sign-in state only).
- Team work on a home server: comments under each policy review memo and saved report (any
  signed-in account, Viewers included; the author or an Admin marks one done) and read-only links
  to a memo or report (an Analyst or Admin makes one for 1 to 90 days; it opens without signing in,
  shows the saved text with no scripts, and can be withdrawn; only the link's hash is saved). The
  second approver was already in place through sign-off. Every comment and link goes in the audit log.

- Teaching (group D): an offline country report (one HTML file of the saved figures with sources,
  Missing reasons and licences, no scripts, opens without the app; button beside the CSV download);
  a Macro lab under Country Research > Learn (aggregate demand and supply, and the debt equation,
  with sliders; the debt part can start from the country's saved figures); and a fifth worked
  example, a commodity price fall, in all four languages.

- Official documents: Country Research > People > Official documents lists the newest World Bank
  documents about the country (routine project filings left out and counted) and BIS central
  bankers' speeches that name it, each linked to the publisher's page.

- OECD real-time data: `npm run oecd:vintages` saves the OECD's monthly Main Economic Indicators
  editions since 1999 (GDP volume and consumer prices, all 38 members) in data/local/oecd-vintages/,
  fetching only new editions on later runs. Two new pre-registered tests,
  gdp_forecast_realtime_oecd and cpi_forecast_realtime_oecd, ask the same questions as the US and
  euro area real-time tests across the OECD members. New check:data row `oecd_rtd`.

- Find data: Menu > Find data searches DBnomics (about 90 statistical providers), the IMF DataMapper,
  the World Bank's World Development Indicators and Eurostat in one box, with each provider's
  licence note and a link to its own page. A catalogue that does not answer is named with the
  reason. New check:data row `catalogues`.

- Gap model estimated from data: an IS curve, a Phillips curve and a policy rule (after Berg, Karam
  and Laxton 2006), each fitted on the country's last 60 quarters with a real-time output gap
  (one-sided HP filter). A new pre-registered test (docs/validation/forecasts/cpi_gap_model.json)
  compares its inflation projection one and two years ahead with today's inflation carried on.
  Country Research > Small gap model shows the fitted coefficients and projection only while the
  test passes, and says why otherwise. Models & validation lists it.

- Bayesian and structural VARs in the Chart Agent's lab: ask for a "Bayesian VAR" (Minnesota prior,
  random-walk or white-noise prior mean chosen by each series' persistence, 90% posterior bands) or a
  "structural VAR" (recursive order as on the chart, the reverse order for two series, and the
  Blanchard-Quah long-run identification, each with the forecast-error variance decomposition and
  bootstrap bands). Both use every series on the chart, up to four.

- Translation review: CONTRIBUTING.md asks native speakers to check the Spanish, French and
  Portuguese text, with a checklist of every file in docs/TRANSLATION_REVIEW.md and a Translation
  review issue form. A language loses its "not yet reviewed" note only when every file is ticked.

- Lower-income central banks: inflation targets for the Philippines (3% ±1), Egypt (7% ±2 for
  Q4 2026), Uganda (5%) and Pakistan (5-7%, filed as 6% ±1), and decision dates for Pakistan
  (FY27 calendar), the Philippines and Nigeria, all read on each bank's own page on 23 November
  2026. Kenya, Ethiopia, Bangladesh, Viet Nam, DR Congo, Myanmar and Bolivia stay Missing: their
  pages state no target or could not be read.

- Forward record for release days: the ridge, lasso and random forest GDP nowcasts now write their
  live calls to the forward record while their test passes, as the bridge nowcast already did (each
  ended quarter whose GDP is not out yet, fitted exactly as in the test, with the benchmark beside
  it), and each call is scored on the first published figure. When a GDP release on the official
  calendar is three days off or less, the daily run starts the tests early (once per release) so the
  call is on record before the figure. Models & validation > Track record and docs/TRACK_RECORD.md
  gain a month-by-month table of calls written and scored.

- Release days: on a day the official calendar lists a CPI or monthly activity release, the running
  app re-reads that country's source about once an hour, up to 12 times, until a newer month
  arrives, and marks it "New today" (US CPI from the BLS, other CPI from the IMF monthly series,
  activity from FRED, Eurostat, the ONS and the BCB). GDP releases are listed but not re-read: the
  app's quarterly GDP comes from OECD figures through DBnomics, months after the release. A Release
  days card on Today and in Data health > Calendar shows yesterday to a week on. State in
  data/local/release-watch.json; RELEASE_WATCH=off turns it off.

- Official forecasts side by side (History & data > IMF forecasts by edition): growth and inflation
  forecasts for this year and the next two from the IMF World Economic Outlook, World Bank Global
  Economic Prospects and the OECD Economic Outlook, with the spread between them; for the United
  States, the Philadelphia Fed Survey of Professional Forecasters from medianLevel.xlsx you save in
  data/local/philly-spf/ (no terms of use found, so never downloaded). A free stand-in for paid
  consensus forecasts, labelled as official forecasts. Daily step world:official_forecasts; Data
  health rows wb_gep and oecd_eo. The OECD terms were read: data may be used for any purpose with
  credit, so the OECD licence row is now open.

- Google Sheets: `scripts/data-api/econquest.gs` adds EQ_SERIES, EQ_COUNTRY, EQ_WORLD, EQ_PANEL and
  EQ_FIGURES for a copy of the app on a home server at an https address; the key stays in the
  script's settings and travels only in a header (docs/DATA_API.md, "Google Sheets").

- Excel: `scripts/data-api/econquest.pq` is a Power Query that brings the app's series, panels and
  figures into a workbook, refreshed with Data > Refresh All; values arrive as numbers, Missing stays
  empty with its reason, and a key for a copy with sign-in on travels only in a header
  (docs/DATA_API.md, "Excel").

- Track record: scorecard_default v1 (governance reading and sovereign default) recorded from the
  owner's run of 23 November. It passed method 2: lift 25.7 points, 90% range 20.2 to 31.4,
  p = 0.00025 with whole years resampled (22 series, 1996 to 2021), and it still holds after the Holm
  correction across all 39 tests (Holm p 0.00875). As registered, a pass does not turn the average
  into a score shown in the app. Forward record summary updated to 98 lines (17 scorecard calls,
  none scored yet).

- World Bank governance figures (WGI): the World Bank API stopped serving the old codes (VA.EST,
  PV.EST, GE.EST, RQ.EST, RL.EST, CC.EST), answering "The indicator was not found", so the
  scorecard's six governance estimates, the political stability figure in the country snapshot and
  the scorecard_default test (owner's run, 22 November) all came back empty. The same estimates are
  now read as GOV_WGI_<code> in the WGI source (source 3), with the old forms tried after it
  (src/utils/wgiCodes.ts).

- Track record: 13 tests added from the owner's run of 22 November (`npm run track-record:import`),
  the new forecast evaluations registered on 22 November. 38 tests are now on record: 10 passed, 25
  failed, 3 too few cases. fx_vol_garch v1 and gdp_forecast_quantile v1 pass and still hold after the
  Holm correction across all 38; gdp_nowcast_lasso v1 and gdp_nowcast_ridge v1 pass on their own but
  do not hold after it.

- Euro area figures as first published are read from the ECB in five-year parts with one retry
  each; the whole GDP history in one request timed out. A series with a missing part is not used.

- cpi_weo_realtime version 2 failed on its first run and stays failed (owner's decision, no retest).
  Known weakness: its pooled RMSE is dominated by hyperinflations (one year ahead, 367,474 against
  986 for the last year carried on); country by country the AR was better in 89 of 169 countries.
- Euro area figures as first published: the app now asks the ECB Data Portal for CSV. It had sent
  its default Accept header (JSON), so the reply could not be read and the euro area was left out
  of the real-time tests. Real-time Problem lines name the test version, and the run says when the
  ECB answers with nothing readable.

- cpi_weo_realtime version 2: an 18-year window instead of 15. With 15 years and 2 lags the AR had
  13 rows, below the 16 it needs, so version 1 produced no case and no verdict. `npm run
  forecast:evaluate` now names any real-time series it could not read or score, and labels QLIKE and
  pinball losses as such.

- Random forest GDP nowcast (tree ensemble on the ridge and lasso predictors, fixed settings) and
  quantile-regression growth bands (matching statsmodels QuantReg), with two pre-registered tests
  (gdp_nowcast_forest; gdp_forecast_quantile, scored by pinball loss against the AR's normal band).
- Dynamic factor GDP nowcast: one common factor of each country's monthly indicators read with a
  Kalman filter and smoother (two-step method), and a pre-registered test (gdp_nowcast_dfm) with the
  bridge nowcast's lags, countries and pass mark.
- ARIMA with moving-average and seasonal terms and outside predictors, by exact maximum likelihood
  through a Kalman filter (matching statsmodels' ARIMA in the tests), and two pre-registered tests
  (gdp_forecast_arma, cpi_forecast_arma) on the AR tests' data and pass marks.
- Ridge and lasso GDP nowcasts: up to ten published predictors with the penalty chosen in time
  order (never random folds), fits matching scikit-learn, and two pre-registered tests
  (gdp_nowcast_ridge, gdp_nowcast_lasso) with the bridge nowcast's lags, countries and pass mark.
- GARCH(1,1) currency volatility: a maximum-likelihood fit that matches the Python arch package,
  and a pre-registered test (fx_vol_garch) of whether it forecasts next month's swings in 23
  currencies better than the three-month volatility the app shows (QLIKE loss, years resampled).
  The app shows no GARCH figure unless the test passes. Runs with `npm run forecast:evaluate`.
- Forecast tests on data as first published: four pre-registered tests (gdp_forecast_realtime,
  cpi_forecast_realtime, gdp_weo_realtime, cpi_weo_realtime) rebuild each series as it was
  published on the forecast day, from ALFRED (US, your FRED key), the ECB Real-Time Database (euro
  area) and the IMF WEO editions you have saved (every country), and score forecasts on the first
  published figure. The IMF's own projection from the same edition is reported beside the verdict.
  `npm run forecast:evaluate` runs them; Models & validation has a new entry. No verdict yet: they
  run on the Mac.
- Forecast checks: the Chart Agent's stationarity test now runs KPSS beside ADF and reads the two
  together (statsmodels kpss with the automatic lag, matched to 1e-9 in tests); the Python
  replication file includes it. Forecast evaluations also report, beside the verdict and without
  changing it, the relative RMSE against the random walk with drift and the seasonal naive as well as
  the last value and the historical mean, and how good the whole band is (CRPS ratio, 90% interval
  score, pinball loss). Models & validation and `npm run forecast:evaluate` show the extra line.
- Track record brought up to date from the owner's 17 November run (npm run mac:validate on
  aca9fa7): five tests that had run but were missing from docs/TRACK_RECORD.md are added
  (inflation_expectations_lead v1 and yield_curve_recession v1, both failed; the first versions of
  cpi_forecast, cpi_nowcast and debt_forecast, all failed, which had been left out when their second
  versions were recorded). The record now holds 25 tests, and the Holm correction counts all of
  them. timing_agent, cycle_clock, gdp_nowcast and cli_turn_policy, recorded before rows carried a
  p, take the p of the 17 November run on the same test file with the same verdict (owner's choice,
  19 November); their verdicts are unchanged. With those p values, timing_agent, cycle_clock and
  gdp_nowcast are shown to hold after the correction, as cftc_crowding does; fx_carry still does not. The forward record section now shows each passing test's calls and scored outcomes (4 calls
  scored so far, too few to read anything into).
- `npm run track-record:import` copies verdicts and the forward record from a real run
  (data/local/validation/) into docs/validation/recorded-verdicts.json and rebuilds the track record
  and methods pages, so no figure is copied by hand. It never changes a row already on record, leaves
  out results run from a test file whose hash differs from the registered one, adds a run's p to a
  passed or failed row that has none only when the file and verdict match, and refuses a forward
  record whose hash chain is broken. The forward lines stay on the computer; only per-test counts and
  the chain's last hash are published.

- Country risk scorecard test (C12): the runner for scorecard_default, registered and hashed on
  13 November before any run, is built. The test file moved unchanged (same hash) to
  docs/validation/preregistered/, and `npm run backtest` now reads the six World Bank WGI estimates
  for every country and the BoC-BoE Sovereign Default Database to judge it. It has its own register
  entry (Governance reading and sovereign default); the scorecard itself still shows no overall
  score. The first verdict comes from a run on a computer that reaches the World Bank and the Bank
  of Canada.
- IMF local market rates, after the first live check (19 November): the Treasury bill rate now
  comes from "Government securities: Treasury bills yields" (the IMF's "Treasury bills, Rate" code
  holds no series), which covers Kenya, Nigeria, Ghana, Bangladesh, Bolivia, the Philippines and
  Egypt among others. A latest month more than two years old reads Missing with that month
  instead of an old number; its history stays in History & data. The `imf_rates` check row tests
  Ghana, which reports all three rates.

## [0.3.0] - 2026-11-19

Fixes to features added in 0.2.0, nowcasts, forecasts and local market rates for the lower-income
countries, and a clearer Menu, Tools page and watchlist screen. Numbered 0.3.0 rather than 0.2.1 because these
are new features.

- Local market rates for countries with no official 10-year yield (#617; most of the lower-income
  watchlist): the Treasury bill rate, government bond yield and money market rate from the IMF's
  free monthly interest-rate data (MFS_IR), found by the IMF's code names (`IMF_TBILL_KEY`,
  `IMF_GOVBOND_KEY`, `IMF_MONEY_KEY` in `.env` override). They show in Research (brief, Markets &
  signals, data sources), History & data, the market council and the council's figures, each with
  its month and a "may be out of date" note after four months. The government bond yield's maturity
  differs by country, so it never fills the 10-year yield. The daily run has a new step and
  `npm run check:data` a new row, `imf_rates`. Stock index levels read Missing with the reason (no
  free source with terms that allow reuse).
- Package updates (#618 to #620): minor and patch updates, lucide-react 1.76, and newer GitHub
  Actions steps; they replace the matching Dependabot pull requests.
- Phone layout (#616): the header controls move into the Menu with their names, Settings has a page
  picker, the Research tabs wrap onto a second line, and the starter question is shorter.
- Menu in three groups (#615): Tools on its own at the top, then Set up (Settings, Account, Offline
  data, Your data, Sharing and Exam mode), Check the data (Data health, Models and validation, Audit
  log, Idea journal) and Learn (User manual, Worked examples, About, Quests), with headings in four
  languages. Tools > Study one country now lists Policy review.
- Tools on one page (#614): Menu > Tools opens the Tools page and is no longer also a tab in
  Settings. "Look back" held 28 of 49 tools; it now holds only the look-back tools, and four new
  groups take the rest (Debt and the budget; Rates, prices and trade; Growth, people and aid;
  Disasters and climate). "Find a tool" searches every tool's name, description and group, in
  English and the reader's language, ignoring case and accents.
- Plain wording (#613): plain labels on the watchlist screen, plain default watchlist names for new
  installs (saved watchlists keep theirs), and small wording fixes in four languages. A what-if
  answer is now compared only with the same question asked before; before, it could show changes
  from an unrelated earlier question.
- Council chat (#612): "Missing for this question" is folded under its count (the agents' documents
  under Sources keep the full text), terminal commands are taken out of the chat, a question that
  names a country with no figures is no longer told to name a country, and a long answer opens at
  its question and findings.
- Every country the app covers can be reached from any watchlist (#611): Research > One country and
  Policy review list the open watchlist, then "Other countries in the app"; Compare countries has a
  watchlist picker; Council chat pulls the figures of a covered country named in a question. Before,
  the 15 lower-income countries were out of reach unless their watchlist was open.
- The watchlist screen no longer crashes on a Missing figure (#610): a 10Y yield, debt or reserves
  figure no source filled now reads as a dash, and the 10Y tooltip says Missing.

- Documentation for the lower-income nowcasts and forecasts (#608): README and walk-through guide in
  English, Spanish, French and Portuguese, the user manual and How EconQuest works 1.5.
- Nowcasts and forecasts for the lower-income countries: the inflation nowcast and forecast now use
  the IMF monthly consumer prices when neither the OECD nor a national series covers the country
  (until now the 13 new countries read "No monthly inflation series"), and the policy rate forecast
  uses the IMF monthly policy rate for countries the BIS does not cover, when its latest month is
  four months old or less; otherwise it says why. Each path names the IMF series it came from. The
  registered forecast evaluations keep their OECD and BIS inputs, so their verdicts do not change.

- IMF monthly exchange rates and policy rates: the first live check (17 November) found the right
  IMF codes for every country but took no series, because the live replies leave the code names out.
  Names now come from the IMF structure where the reply leaves them out, a series returned under the
  exact key asked for is taken on its key, months dated to the day are read, and the reason in
  `check:data` says why a series was not taken.

## [0.2.0] - 2026-11-17

The first tagged release since 0.1.0. In short: data and tools for lower-income countries
(remittances, aid, financial inclusion, food prices, disasters, weather and parametric insurance, a
Lower-income countries watchlist, IMF monthly exchange rates and policy rates, countries you add saved
by the daily download); policy review tools and the policy council; markets and financing data
(exchange rate regime, central bank assets, dollar funding); what-if questions with the Scenario
Agent; tools for five kinds of users; connecting other systems (API tokens, webhooks, OpenID Connect);
the whole app in Portuguese; and outside research tools through the Quant desk. Every change is listed
below.

- Documentation for the lower-income work (#601-#605): README and walk-through guide in English,
  Spanish, French and Portuguese (the Lower-income countries watchlist, adding a country, IMF monthly
  figures and where targets and decision dates come from), INSTALL (the two new IMF files and
  `check:data` rows) and METHODOLOGY 1.5.
- Reference facts for the lower-income watchlist, read on each bank's own page on 2026-11-17:
  Ghana's inflation target (8%, band 2 points) and India's target now linked to the RBI page that
  states it; next central bank decision dates for Kenya, Ghana, Tanzania and India. Countries whose
  pages state no target or date, or could not be read, are listed with the reason in
  `src/data/officialCalendar.ts` and show "no date on file".
- IMF monthly policy rates (LI4): countries the app does not take from the BIS policy-rate
  collection (for example Egypt, Nigeria, Kenya, Ghana, Pakistan, Bangladesh, Australia and Canada)
  now show the central bank policy rate from the IMF MFS_IR dataset on api.imf.org, monthly, with
  its source and month, in the watchlist, the country page, the history chart and the council's
  figures. It is found by the IMF's code names (`IMF_POLICY_KEY` in `.env` overrides). The BIS
  figure wins wherever the app pulls it, and the pre-registered rate tests and the tools built on
  BIS rate moves (cycle clock, Taylor gap, rate-move signals, alerts) still use BIS rates only. The
  daily run saves it to `data/live/imf-policy.json` (new step after the BIS step). New
  `npm run check:data` row imf_policy (Egypt as the sample); the dataset's codes could not be
  checked from the build machine.

- IMF monthly exchange rates (LI3): the exchange rate history of currencies with no ECB reference
  rate and no central bank daily feed in the app (for example the naira, Kenyan shilling, cedi,
  Egyptian pound and taka) now comes from the IMF ER dataset on api.imf.org, monthly average per US
  dollar, found by the IMF's code names (`IMF_FX_KEY` in `.env` overrides). The daily run saves it
  to `data/live/imf-fx.json` (new step after the ECB run); daily rates still win where they exist.
  New `npm run check:data` row imf_fx (Nigeria as the sample); the dataset's codes could not be
  checked from the build machine.

- Lower-income countries watchlist (LI2): a new ready-made list of fifteen of the most populous
  countries the World Bank classes as low or lower-middle income (India, Pakistan, Nigeria,
  Bangladesh, Ethiopia, Egypt, the Philippines, DR Congo, Viet Nam, Tanzania, Kenya, Myanmar,
  Uganda, Ghana, Bolivia), offered once to existing users. The thirteen not already in the app join
  its country list (names and plain-language topics only; every figure comes from a feed), so the
  start-up download and the daily run cover them. Their UN Comtrade reporter codes are the standard
  M49 codes, not yet checked against a live reply. No central bank inflation targets are filed for
  them yet.

- Countries you add in the daily download (LI1): the server now reads the countries you added
  (Menu > Add a country) from the shared workspace and each account's own, and puts them in its
  country list. The start-up download and the daily run save them like the built-in countries, so
  they get saved history, the As-of day and alerts; a country you remove leaves the list again.
  Before, the server dropped them as unknown, in light mode too, although the install guide said
  light mode fetched them. At most 25 added countries are taken; any beyond that are named on the
  Offline data page (English, Spanish, French, Portuguese).

- Documentation brought up to date with Ask Council chat (`ask:council`), the Research and Reports
  layout, the deep what-if work, the five user roles, the feed check fixes, the outside research
  tools and the Quant desk: README and walk-through guide in English, Spanish, French and Portuguese
  (what-if questions in Council chat, the History & data tools menu, the new tools for public
  administrators, politicians, researchers, economists and traders, Reports tabs, notebooks and the
  working-paper bundle, Settings > Research tools); four screenshots retaken or added
  (`06-history.png`, `11-reports.png`, `21-history-tools.png`, `22-what-if.png`); methodology version
  1.4 (new sources, the Scenario Agent and what-if answers in 4.1 and 5.4, the five-roles tools in
  5.5, outside research tools in 3.8, limits, references); the plain-language guide version 1.4 (new
  sections on what-if questions and on the tools for people who run and judge policy); the install
  guide (data/local/gdl/ and data/local/budget-execution/, the new data/live/ files, the newest
  check:data rows, `npm run notebook:check`); the data API (what-if questions through
  `ask:council`, and which new figures are panel calculations rather than series); the roadmap;
  built app sizes measured again on 17 November.

- Feed check fixes (#594 to #596): requests to Zenodo (the DOSE regional file) now name the app and
  where its code lives, after Zenodo answered the check with HTTP 403. The ECB yield curve check asks
  for the 10-year only with a 30 s limit, and the daily download asks for each maturity in turn. The
  ECB SPF check asks for the newest 8 quarters with a 30 s limit and tries once more after 5 s; the
  daily download keeps the full history with a 45 s limit and asks for the three SPF series one at a
  time.

- Research layout (#576): One country > History & data shows the history chart, then a menu of the
  tools in eight groups (Debt and budget, Rates and prices, External and currency, Growth and
  forecasts, People and development, Risks and shocks, Look back, Learn and convert); one tool opens
  at a time, and *All tools* goes back to the menu (before, every tool was stacked, about 10 screens).
  Links from Tools still open the tool. Summary, Sources and My holdings show one figure group at a
  time from a row of buttons, with *Show all*. Markets & signals is in three parts (Economy and
  policy, Markets and positioning, Risks and links). Compare has MarketEdge, scenario exposure and the
  Fed balance sheet as parts; where data and price disagree shows four countries until *Show all*.
  Figures with no history fold into one line. Nothing was removed, and every Missing figure keeps its
  reason.

- Reports layout (#575): Reports opens with tabs (Write a note, Policy reviews, Council documents,
  Notebooks and Teaching), each on its own, so the page fits about one laptop screen (was 5.6).
  Links from Tools, worked examples and Council chat open the right tab. The note's text and preview
  scroll inside a fixed height; on a phone they take turns.

- Size limits raised (Sam): start-up 520 KB compressed (was 465), whole app 9 MB (was 7.5).

- Quant desk in Council chat (research tools item 2): with research tools set up, a desk agent
  "Quant desk" joins a chat question that asks for a backtest, forecast, volatility, nowcast, option
  price, drawdown or Sharpe, or when the AI model picks it. It calls only tools the server lists for
  the token (at most the per-question limit), and each figure from the reply goes to the synthesis
  as a desk finding with its link, data-through date and label; the answer card, agent documents and
  network view (badge "reads: outside research tools") show them. A refusal or time-out shows
  "Research tools unavailable" and the other desks still answer; a local-only refusal shows the
  reason and leaves the desk out. Off by default: with no server set, the chat and its prompts are
  unchanged. Route `POST /api/council/quant`; model register `quant_desk`. Four languages.

- Outside research tools, client (research tools item 1): Menu > Settings > Research tools holds a
  research-tools server address, its token (stored like the other keys, never logged), a time limit
  (20 s) and tool calls per question (4). A small MCP client (JSON-RPC 2.0 over HTTP POST:
  `initialize`, `tools/list`, `tools/call`) sends the bearer token, `X-Correlation-Id` and
  `X-Model-Location` on every request; each request goes in the audit log (new kind "Outside
  research tools") with the tool, correlation id, outcome and the arguments cut to one line. Test
  connection lists the tools the token can see. Off until the address and token are set. Routes
  `POST /api/research-tools/test`, `GET /api/research-tools/status`. Contract in
  `docs/contracts/research-tools.json`; guide in `docs/RESEARCH_TOOLS.md`. Four languages.

- Inflation surprise index (R10): one number per place from the R9 inflation surprises (90-day
  half-life, a year at most, 3 needed), with a chart under Data surprises and a card on Today for
  Brazil, the euro area and the United States. Its test was registered before any run
  (`docs/validation/pending/surprise_index.json`, hash in the pending manifest). Routes
  `GET /api/surprise-index`, `index` in `/api/surprises/:iso3`. Four languages.

- Data surprises (R9): History & data > Data surprises sets each release against an expectation
  published before it: BCB Focus for Brazil's IPCA, the ECB SPF for euro area HICP, the Kalshi CPI
  market (snapshots saved before each release) for US CPI, and the app's own GDP nowcast on the
  forward record. Each surprise is scaled by the spread of the earlier ones once there are 8. Daily
  step `world:surprises`; route `GET /api/surprises/:iso3`; connection checks `focus_monthly`,
  `bls_cpi`; licence row for BLS; BCB and Kalshi rows extended; model register `data_surprises`.
  Four languages.

- Full yield curves (R11): History & data > Full yield curves shows every maturity of the US Treasury
  par yield curve and the ECB euro area government curve each day, a fitted Nelson-Siegel-Svensson
  curve, level (10y), slope (10y minus 2y) and curvature with their one-day and one-month moves, and
  three-month carry and roll-down for each maturity. Daily step `world:curves` (at most every 6 hours,
  `data/live/yield-curves.json`); route `GET /api/yield-curves?area=us|ea`; connection checks
  `ust_curve` and `ecb_curve`; licence row for the Treasury curve (US government work), ECB row
  extended. Four languages.

- Ranges from past misses (R8): History & data > IMF forecasts by edition gets *Range from past IMF
  misses*, a 70% and 90% range around the latest saved WEO edition's projections from how far past
  editions (same season, same years ahead) missed the country's outturn. Nowcast and forecasts gets
  *Ranges from past misses* on each tested step of the app's forecasts, from the out-of-sample
  misses the evaluation recorded for the country (the evaluation now keeps per-country miss
  percentiles). Fewer than 8 past cases reads Missing. Route `GET /api/weo-vintages/:iso3/bands`;
  `missRanges` in `/api/forecast/:iso3`. Four languages.

- Replication check (R2): *Check it still holds* on each pinned figure in a research notebook reads
  the series again and says Same, Revised (old and new value, up to 10) or Source no longer answers,
  and counts newer figures since the As of day. `npm run notebook:check` checks every pinned figure
  through the running app (`--url`, `--token`, `--json`; exit 1 on Revised or gone, 2 when the app
  does not answer). Four languages.

- Working-paper bundle (R1): *Pin to notebook* on a Chart Agent chart keeps it in a research
  notebook with its As of day (last date of its figures) and a SHA-256 fingerprint of the figures
  (up to 20 per notebook). *Working-paper bundle (.zip)* exports the notebook: `draft.md` with the
  pinned figures listed, one replication pack per figure under `figures/` (data and Python, R and
  Stata scripts), `CITATION.cff`, `README.md` and `MANIFEST.txt` with every file's SHA-256. The
  Markdown export lists the pinned figures too. Routes `POST /api/research/notebooks/:id/pins`,
  `DELETE .../pins/:pinId`, `GET /api/export/notebook/:id.zip`. Four languages.

- What this means for people (R7): a *For people* button on a Policy review memo gives a plain
  summary for constituents: what changes, the cost per person (council cost table ÷ population, and
  GDP for % of GDP, before the As of year), who gains and who pays, the three regions furthest
  behind (R6) and what three countries in a similar position saw next (G34). Fixed sentences in four
  languages with Missing and the reason, no AI wording, so no new council recording. Also added to
  the one-page brief. New read-only route `/api/reviews/:id/people`.

- Regional figures (R6): Research > History & data shows how far apart a country's regions are.
  Output per person for each first-level region from DOSE (Wenz et al. 2023, Zenodo, CC BY 4.0; 83
  countries, constant 2015 US$), the gap to the national figure, the richest-to-poorest ratio and
  the spread compared with ten years before; for EU and EFTA countries GDP per person in PPS and the
  unemployment rate by NUTS 2 region from Eurostat; and the subnational Human Development Index
  from a Global Data Lab CSV you save in data/local/gdl/ (non-commercial terms, never shipped or
  downloaded). DOSE and Eurostat come with the daily download once a week (step `world:regional`;
  DOSE is downloaded again only when Zenodo lists a new version). New Data health rows `dose` and
  `eurostat_regions`, licence rows `dose` and `gdl`, four languages.

- Budget execution tracker (R4): Research > History & data takes your approved budget and monthly
  spending by ministry or programme from a CSV file (columns line, approved, month, spent; a
  template is offered) and shows each line's share spent against the share of the fiscal year gone,
  lines running behind or ahead by more than 10 points, the gap in points, months missing, and a
  same-pace year-end figure only where no month is missing. The fiscal year start month, unit and
  source are required. The file is kept on this computer only (data/local/budget-execution/); the
  audit log records the file's SHA-256, never its contents. Four languages.

- World Bank projects (R5): Research > History & data lists the active World Bank projects in the
  country with the amount committed, approval and closing dates and the share of each project's
  planned time gone, largest first. For IDA credits and grants it adds the share paid out, from the
  IDA statement of credits, and flags projects paying out slowly for the time gone (budget support
  never flagged). Both lists are CC BY 4.0, need no key and come with the daily download once a
  week (step `world:wb_projects`, saved in data/live/wb-projects.json); the panel never fetches on
  open. New Data health rows `wb_projects` and `wb_ida_credits`, a licence row, glossary entry in
  four languages. IBRD loans have no paid-out figure yet.

- Budget credibility (R3): Research > History & data shows how much of the budget first approved for
  each year the government actually spent (World Bank GF.XPD.BUDG.ZS, from PEFA assessments, UN goal
  16.6.1), the PEFA PI-1 band of each year (A within 5%, B within 10%, C within 15%, D further) and a
  grade on the PEFA rule over the latest three years, worked out by the app and labelled as not the
  official PEFA score. Countries without a PEFA year read Missing with the reason. New Data health row
  `wb_budget_credibility`; glossary entry in four languages.

- Editable scenario card (WI6): the scenario read from a what-if question can be changed in Council
  chat (sizes, levels, changes taken out) and asked again as a follow-up, written in plain words the
  scenario reader reads back the same way (`scenarioText`). The Scenario Agent's debt paths can be
  kept for the trade-off chart under Debt sustainability (`itemFromScenarioDebt`); they are kept in
  the browser tab only and never sent to the AI model.

- What-if answer layout (WI5): when the Scenario Agent answers, the council's answer comes in eight
  sections, from where things stand now through the change, first effects, how it spreads, history,
  research and trends to what would change the answer (`src/utils/whatIfAnswer.ts`). Each section
  is written only from the figures that belong to it and shows the kind of evidence (data, app
  calculation, past, published study, interpretation); a section with no figures reads Missing with
  the reason. Every sentence is checked like any summary sentence. Studies are cited with their DOI.
  New synthesis instruction for what-if questions; the existing regression cases are unchanged.

- Scenario Agent research (WI4): a short list of peer-reviewed studies by kind of shock
  (`src/data/shockResearch.ts`: Iacoviello and Navarro 2019; Ha, Stocker and Yilmazkuday 2020;
  Kilian 2009; Reinhart and Rogoff 2009; Cerra and Saxena 2008), each checked against the paper with
  the page and the paper's own words for every number. The answer gives the finding for the
  country's group (IMF advanced or emerging), labelled as a published average, not an estimate for
  the country.
- Scenario Agent history (WI3): past episodes of the same kind of shock (the country's currency,
  10-year yield and USD bond spread between the episode's months, from the saved replay series);
  cases since 1980 where growth, inflation or the currency moved as far in one year, with the medians
  of what followed over three years and the eight closest starting points; and where the level after
  the shock would sit in the country's own record. Replays and the Scenario Agent share one reading of
  episode moves (`episodeMove`).
- Scenario Agent in Council chat (WI2): for a what-if question, today's figures beside what they
  would be after the stated change, for up to four countries. Uses the app's own tools: the
  scenario engine (Fed, dollar, financial stress, supply chains), local projections (inflation
  after a rate change), the debt identity on the IMF's inputs (borrowing costs, growth, inflation),
  dollar bonds (currency fall) and net trade (oil, food, commodity prices). Missing parts say why;
  with no size given, the largest monthly move on record is offered with its month. New
  `GET /api/council/scenario/:iso3`; model register row `scenario_agent`.
- Council chat reads what-if questions (WI1): the changes a question states (a central bank or
  Fed rate, borrowing costs, the dollar, the currency, oil, food or commodity prices, financial
  stress, supply chain pressure, growth, inflation), each with the size in your words, shown above
  the answer as *Scenario read from your question*. A change with no size asks you for one; the app
  never picks a size. The agents holding the figures each change moves are always asked.
- Ask Council chat from another program (scope `ask:council`): `POST /api/v1/council/ask` asks a
  new question and gets the answer the chat gives in the app, from the same code: the AI model picks
  the agents, the agents answer on the app's own figures, and the summary goes through the number
  and stance checks. Every figure is cited with source, period, badge and terms page; only real
  figures whose sources allow passing them on are used (the rest left out and counted); hidden names
  never appear, only a count; up to 10 earlier turns; `max_cost_usd` refuses a model call before it
  would pass the limit (prices for cloud models from `AI_PRICE_INPUT_PER_MTOK` and
  `AI_PRICE_OUTPUT_PER_MTOK` in `.env`; a model on this computer costs nothing). Counts against the
  AI request limit; each question is in the audit log with the token's name, correlation ID, model,
  figures and cost. Settings > API tokens, docs/DATA_API.md, docs/openapi.json (1.4.0) and the guide
  in English, Spanish, French and Portuguese.
- Documentation brought up to date with the feed fixes, the usability fixes, markets and financing
  data (Group B), the policy council and weather and insurance: README and walk-through guide in
  English, Spanish, French and Portuguese (History & data: exchange rate regime, central bank assets,
  dollar funding, weather, parametric insurance, tropical cyclones, the disaster loss model; Data
  health > Daily download); methodology version 1.3 (new sources, the policy council in 5.2, weather,
  disasters and parametric insurance in 5.3, short-record limits, references); the plain-language
  guide version 1.3 (new sections on the policy council and on weather, disasters and insurance);
  the install guide (data/local/ibtracs/, the data/live/ weather and storm folders, the newest
  check:data rows); the data API (series ids added on 14 November); data sources (IBTrACS); the
  roadmap.
- Tropical cyclones (I8): History & data shows hurricanes, typhoons and cyclones since 1980 whose
  centre passed within 50, 100 or 200 km of the country, from NOAA's IBTrACS tracks: storms by
  strength (tropical storm, hurricane, major), each season, the share of seasons with each (about
  1 season in how many), and the strongest storms with their closest distance. The tracks are
  downloaded from NOAA only when you press the button (kept in data/live/ibtracs/), or read from
  an IBTrACS CSV you save in data/local/ibtracs/. Licence row and Data health row ibtracs; glossary
  entries for tropical cyclones and the Saffir-Simpson scale; Spanish, French and Portuguese.
- Disaster loss model (I1 + I2): the Natural disasters panel adds every year's damage since 2000
  (at today's prices and as % of GDP) and a frequency-severity model by type of disaster: damaging
  events per year (Poisson, or negative binomial when bad years cluster), damage per event
  (lognormal, with a check against the record), and 20,000 simulated years giving the average
  yearly loss and the loss passed 1 year in 10, 50 and 100, also as % of GDP. From the EM-DAT file
  in data/local/emdat/ only. Glossary entries for the frequency-severity model and average annual
  loss; Spanish, French and Portuguese.
- Basis risk (I7): the trigger designer compares the cover with the other weather series (capital
  against whole country, same season): of the second series' worst 1 in 5 seasons, how many the
  cover paid in and how many it missed, payouts in years that were not bad, rank correlation, the
  average payout gap, and the missed years. Glossary entry for basis risk; Spanish, French and
  Portuguese.
- Return periods and extreme values (I3 + I4): the trigger designer says how often the trigger and
  exit are passed, from the record and from a GEV curve fitted by L-moments (low tail for low-index
  covers), with the season passed 1 year in 2, 5, 10, 20, 50 and 100, a 90% bootstrap range,
  extrapolation marked, the burn cost from the fitted curve and a fit check. Glossary entries for
  return period and extreme value fit; Spanish, French and Portuguese.
- Fair price for the parametric cover (I6): under the burn analysis, pick the loading as a % of the
  expected payout or as k standard deviations of the yearly payout, and price on the whole record or
  since 1991. Shows the price as % of the cover a year and in money, the multiple of the burn cost,
  and a 90% range from the length of the record; capped at 100% with a note. Glossary entry for the
  insurance loading; Spanish, French and Portuguese.
- Parametric insurance trigger designer (I5): History & data lets you design an index cover on
  country or capital rainfall or temperature, or the world price of rice, wheat, maize or soybeans:
  season, low or high trigger, trigger, exit and cover, with defaults from the record (wettest or
  hottest months, trigger 1 year in 5, exit 1 in 20). Burn analysis over every complete past season:
  years that paid, average yearly payout (burn cost) with its standard deviation, largest payout,
  the same since 1991, and a table by year. Reads series the app already holds; nothing new is
  fetched. Glossary entries for parametric insurance and burn cost; Spanish, French and Portuguese.
- Long food price history (W3): rice (Thai 5%), wheat (US HRW), maize and soybeans now keep the
  whole World Bank Pink Sheet monthly history from 1960 instead of the last 60 months, so History &
  data can chart them over decades next to the weather series. Other Pink Sheet prices still keep
  60 months.
- Weather across the country (W2): History & data shows monthly temperature and rainfall averaged
  over each country since 1901 from the World Bank Climate Change Knowledge Portal (CRU TS, CC BY
  4.0), newest CRU version first, with each month against its 1991-2020 average. Licence row and
  Data health row wb_cckp, Spanish, French and Portuguese text.
- Weather at the capital (W1): History & data shows monthly temperature and rainfall at each
  country's capital from NASA POWER since 1981, with each month against the same month's 1991-2020
  average (°C warmer or colder, rainfall as % of normal). One grid cell at the capital, not a
  country average; Missing with the reason when NASA has not answered or the 1991-2020 years are too
  few. Licence row nasa_power, Data health row nasa_power, Spanish, French and Portuguese text.
- Policy council check-back and docs (PK9): automatic outcome checks (rules version
  outcome-check-v3) set a currency market council's cases against the change in value for a holder
  in US dollars and name the closest case; for bonds they record how the yield or spread moved. The
  user manual and the guide (English, Spanish, French, Portuguese) explain the policy and market
  council, and the glossary adds present value, discount rate, incidence and second-order effect.
- Policy council in the one-page brief (PK8): the brief PDF ends with the council parts that are up
  to date with the frame (present values, who gains and who loses, the chain count by basis, cases
  with the odds-weighted result; for a market, the readings and cases). English, Spanish, French
  and Portuguese.
- Market council (PK7): a policy review can weigh what an event means for one market of the country
  (the currency, local-currency or US-dollar government bonds). The app copies in its market
  readings as they stood on the As of day (policy rate, carry against the US, exchange rate,
  10-year yield, dollar bond spread, CFTC positioning, Fed swap lines, BIS dollar credit, central
  bank assets, US Treasury holdings), each with date and source or Missing; the user sets cases as a
  change in value for a holder, with odds. The council ranks responses against keeping the current
  stance. Spanish, French and Portuguese text. A new council regression case; the council recording
  needs one new run.
- Policy council weighs the measure (PK6): with a measure in the policy review frame, the Options
  step hands the council the measure and the up-to-date costs and benefits, groups, chain of effects
  and scenarios. Option 1 is the measure itself, alternatives are ranked against it, and only
  numbers from the diagnosis and the user's entries are allowed. The step says when a part changed
  after it ran. A new council regression case; the council recording needs one new run.
- Policy council scenarios (PK5): for the measure in a policy review, two to five cases, each a
  short story with the costs and benefits table scaled by the user's percentages and benefits
  arriving later if they say so, with optional odds; net present value of each case, and with odds
  the odds-weighted net and the chance of a negative net. Spanish, French and Portuguese text.
- Policy council second-order effects (PK4): for the measure in a policy review, a chain of links
  (this raises or lowers that, and how long it takes), each resting on a figure from the review's
  Diagnose step with its source and period, a source the user names, or marked as an assumption,
  with a count of each. Spanish, French and Portuguese text.
- Policy council winners and losers (PK3): for the measure in a policy review, one row per group
  that gains or loses and why, with a size only when it has a unit and a source (otherwise
  Missing), and optionally the share each fifth of people carries set against its share of income
  (World Bank household surveys), read as regressive, progressive or about proportional. Spanish,
  French and Portuguese text.
- Policy council costs and benefits (PK2): for the measure in a policy review frame, enter costs
  and benefits by year, each with its source; the app shows present values at the official
  discount rates you tick (UK Green Book, US OMB Circular A-4 3% and 7%, European Commission 3%,
  Asian Development Bank 9% and 6%, each cited) and your own, the net, benefits per unit of cost,
  the pay-back year, how far figures would have to move to flip the answer and the flat rate where
  it flips. Saved beside the steps, tied to the frame, hashed and audited. Spanish, French and
  Portuguese text.
- Policy council question (PK1): a policy review can weigh one measure (a tax change, a subsidy
  reform, a spending programme). Tick "Weigh one measure" in the frame, describe the measure and
  optionally its size, start month and years ahead. It is part of the frame and its hash. Spanish,
  French and Portuguese text.
- `npm run council:record` no longer stops with "fetch failed" when the set takes more than five
  minutes on a 32B model: the long request has no time limit, and an error names its cause.
- Dollar funding stress (Group B, PB4): History & data shows US dollar loans and bonds owed by
  the country's non-banks (BIS global liquidity indicators, US$ bn and y/y) and the Federal
  Reserve's dollar swap lines (New York Fed), amount outstanding each Wednesday for all central
  banks and for the country's own central bank when it has drawn. The cross-currency basis is left
  out because it needs paid data. Data health rows bis_usd_credit and nyfed_swaps, glossary entry,
  Spanish, French and Portuguese text.
- Central bank assets (Group B, PB3): History & data shows each central bank's total assets from
  the BIS, as % of GDP and in US$ bn, quarterly, so asset purchases and emergency lending show as
  a fast rise. Free BIS series with citation. Data health row bis_cb_assets, glossary entry,
  Spanish, French and Portuguese text.
- Exchange rate regime (Group B, PB1): History & data shows the Ilzetzki, Reinhart and Rogoff
  classification of how a country's currency is run in fact, by month: the coarse code (1 peg,
  2 crawling peg, 3 managed floating, 4 freely floating, 5 freely falling, 6 dual market) and the
  fine code (1 to 15). Read from the monthly workbook you download from www.ilzetzki.com/irr-data
  into data/local/irr/; the authors ask for a citation and state no licence, so nothing is shipped.
  Data health row irr_file, licence row, glossary entry, Spanish, French and Portuguese text.

- Fixes from the usability review for economists and researchers:
  - Data health > Daily download shows the daily download as it goes: each of its five parts, what
    failed and why, sources that need a key or a file, and what to download by hand. While it runs,
    a line at the top of the screen says which part it is on. Route `GET /api/daily-run`.
  - Citations, the About box and feedback carry the code commit beside the version (`APP_COMMIT`,
    set by the start scripts and the image build); docs/MAINTENANCE.md lists the release steps.
  - Data API: the Python, R and Stata helpers get CSV without a byte-order mark (`bom=0`) and read
    `value` as a number.
  - Council chat without an AI model lists the figures found, the parts of the question no reading
    answered (such as a 200bp rate rise, pointing to Debt sustainability) and the gaps.
  - One inflation figure per country on Summary and Markets: the latest monthly series when there is
    one, else the IMF yearly average, with the source named; the real policy rate says which.
  - A missing Gini or poverty figure says the World Bank did not answer when that request failed,
    instead of "No survey in the last 15 years". The feed replay no longer lends one country's
    recording to another.
  - A new install shows the project's published verdicts (docs/validation/recorded-verdicts.json)
    on each badge until the tests run on that computer.
  - Help level Expert: figures, sources and forecast ranges without plain-language explanations.
  - Policy rate, leading indicator and OECD inflation charts and downloads start where the source
    starts once the weekly long-history file is on disk, instead of in late 2024.
  - The track record, glossary, methodology and README say that every test so far was written down
    the day it ran or the day before, on public data: specified and hashed before the run.
- ILOSTAT earnings: the 14 November check showed ILOSTAT's list has no EAR_4M.. ids any more, only
  other earnings ids (EAR_EHRA.. is hourly). The search now finds the yearly indicator by its name
  ("monthly earnings", by economic activity and local currency first, hourly left out) in the CSV
  or JSON list, and when nothing fits the check lists the yearly earnings indicators with their
  names.

- IMF GFS by level of government (DBnomics): the 14 November Mac run showed the real GFSMAB codes
  (A.BR.S1311.XDC.G1__Z, domestic currency). The app now asks for items G1__Z and G2M__Z, and when
  nothing comes back it reads DBnomics' description of the dataset, picks the unit labelled as a
  percent of GDP and asks again. Domestic-currency series are never read as shares. If no % of GDP
  unit exists, the figures stay Missing and `npm run check:data` row imf_gov_levels lists every unit
  code with its label; IMF_GFS_UNIT in .env sets the unit by hand.
- ILOSTAT earnings: no replacement id was found on the 14 November run. The search now also reads
  ILOSTAT's JSON list and accepts the newer EAR_4MMN ids, and when nothing is found the connection
  check reports what each list address returned (status, size, first characters, any EAR_ ids).

- IMF GFS by level of government (DBnomics): the connection check said OK while no series came back
  ("0 of 30 countries"). It now says the GFSMAB series the app asks for did not come back and lists
  the codes DBnomics holds for Brazil's central government, so the right codes can be set from the
  next Mac run; the daily run logs the same.
- IMF monthly consumer prices: on the 13 November run no IMF code name matched for any of the 19
  countries. The structure reader now also finds a dimension's codelist through its concept, or by
  the name CL_ plus the dimension; when still nothing matches, the app asks for every monthly
  series of the country and picks the all-items, year-over-year one by the names in the data. The
  reason line says how many codes each dimension carried. Not confirmed from the cloud:
  `npm run check:imf` on the Mac shows what matched.
- ILOSTAT earnings: ILOSTAT now refuses the indicator id the app used (EAR_4MTH_SEX_ECO_CUR_NB_A,
  "deprecated or invalid"). When it does, the daily run and `npm run check:data` read ILOSTAT's own
  list of indicators and use the yearly average monthly earnings id it offers (local currency
  first); the check names the ids found. `ILO_EARNINGS_ID` in .env chooses one by hand.
- Offline download: a country's full World Bank and IMF history now downloads four figures at a
  time instead of one after another, and that step may take 6 minutes before the run moves on
  (3 for other steps). On the 13 November run 15 of 22 countries timed out at 3 minutes.
- Penn World Table: the workbook now downloads from DataverseNL, where the GGDC page links it;
  the old www.rug.nl address answered 404.
- UCDP: Gleditsch-Ward codes 54 (Dominica) and 80 (Belize) now map to their countries; the
  connection check no longer lists them as codes without a country.
- Documentation brought up to date with the console integration (#512 to #526) and the planned
  state. The plain-language guide docs/HOW_IT_WORKS.md joins the repository (it was only on the
  project website), brought up to 13 November with a section on crisis replays; the methodology moves
  to version 1.2 with the sections from the website's version 1.1 (why EconQuest exists, where it
  runs, help levels, geopolitical risk VaR, which countries the results rest on, Quests) and a
  version history, and its short version now says that the council's chat agents are fixed code and
  only the summary writer is an AI model. The README in English, Spanish, French and Portuguese gains a "Connect a portfolio system"
  task, the Chinn-Ito index and the FRED history behind the crisis replays in its source list, and a
  roadmap in three parts (done, next, waiting); the English README's integration notes are now a
  "Connecting an outside system" list, and its command table adds `replays:pull`, `chinn-ito:pull`,
  `tokens` and `check:success`. The walk-through guide in all four languages explains API tokens,
  hidden names and single sign-on, and the country risk scorecard with capital account openness. The
  install guide lists the files the daily download saves in data/local/ (replays, Chinn-Ito, WEO
  editions, GPR, sanctions, UCDP) and the files that hold connections, the code-copy commands, and
  links to the deployment guide and OpenID Connect sign-in. The user manual describes Settings > API
  tokens, Settings > Hidden names, Account with single sign-on and positions sent in by another
  program; backup and restore says what the backup file leaves out; the methodology adds §3.8
  (figures served to outside systems, hypothetical first-order scenario estimates), the audit seal in
  §4.5, and lists the country risk scorecard as Not validated with its registered test rather than as
  a description; the risk and compliance note and the home server guide follow. The roadmap adds a
  "Connecting other systems" row, the parked idea groups B and D (with capital controls partly
  answered by Chinn-Ito), the three checks left before the public release, a table of built parts
  waiting on a check or licence, Arabic and Swahili paused, classroom Quests waiting for a go, and
  checkpoint 2 folded into checkpoint 1.
- Documentation brought up to date with the panels and tools added since the README rewrite: the
  README and walk-through guide in English, Spanish, French and Portuguese describe the panels for
  lower-income countries, peer comparison, Policy review watch and review-to-review comparison; the
  methodology gains statistics conventions (section 7.4) and the US Treasury auctions source; the
  install guide lists every file you save yourself in data/local/ and how to copy one into the
  ready-made app; data sources, data API, user manual, methods notes and roadmap updated; licence
  register rows for EM-DAT and FAOSTAT Consumer Price Indices, matched from the panels' source lines, so
  Sharing mode now withholds figures from those two files; sizes re-measured. A Python package
  file committed by mistake was removed from the repository root.
- Review-to-review comparison (PC3): a review started with Review again shows what changed since
  the earlier one: frame changes, the option each memo recommended, each diagnosis figure then and
  now with the change, and whether the goal indicator moved the way the goal wants. Read in the
  browser from both saved reviews; nothing is saved.
- Peer comparison for a policy review (PC2): after Diagnose, pick up to six watchlist countries (or
  the same region) to see each diagnosis figure beside the same figure for each peer, each from its
  saved pull on or before the review's As of day, with the peer median and the review country's rank.
  Not saved in the review. Route `GET /api/reviews/:id/peers?iso3=` (read only).
- Policy review watch (PC1): the start page checks the triggers in each policy review memo's "what
  to watch" list ("above 8", "below 3", "target 4", "rises", "falls", also in Spanish, French and
  Portuguese) against the latest saved figures for the country, lists each as Crossed or Not crossed,
  and opens the review. Other wording is kept but not checked. The memo form says which wordings are
  read. Route `GET /api/reviews/watch` (read only).
- Natural disasters (PA6): Research > History & data shows floods, storms, droughts, earthquakes and
  other natural disasters since 2000 from the EM-DAT public table you download with your own EM-DAT
  account and save in data/local/emdat/ (EM-DAT's terms do not allow passing it on, so nothing is
  shipped or fetched): events, deaths and people affected by type, yearly averages against
  population, the last ten years with damage as % of GDP, the five largest events, and EM-DAT's
  citation line. Route `GET /api/disasters/:iso3`.
- Food prices and food security (PA2): Research > History & data shows food price inflation against
  all prices from the FAOSTAT Consumer Price Indices file you save in data/local/fao-cpi/ (terms not
  confirmed, nothing shipped; values FAO estimated or imputed left out), undernourishment and food
  insecurity (World Bank, from FAO), net food imports as % of GDP, and Pink Sheet moves for rice,
  wheat, maize, soybeans, palm oil and sugar. Rice (Thai 5%) added to the Pink Sheet prices the app
  reads. Three new saved World Bank series; route `GET /api/food-prices/:iso3`.
- Aid received (PA4): Research > History & data shows net development aid the country receives (World
  Bank, from OECD DAC figures) in US dollars, as % of GNI, central government spending, imports and
  investment, per person, from six large donors with their share, and the last ten years with the
  distance below the highest. Eleven new saved World Bank series; route `GET /api/aid/:iso3`.
- Commodity prices and terms of trade (PA3): Research > History & data shows the country's shares of
  fuel, ores and metals and food in goods exports and imports, how World Bank Pink Sheet prices for
  each group moved over 1 and 12 months, the rough effect on income as % of GDP if prices hold for a
  year (the app's calculation, quantities fixed), commodity dependence against UNCTAD's 60% line, and
  the World Bank terms of trade index. Two new saved World Bank series (goods exports and imports in
  US dollars); route `GET /api/commodity-terms/:iso3`.
- Financial inclusion (PA5): Research > History & data shows who has an account (World Bank Global
  Findex: adults, women, men, poorest 40% and richest 60% of households, gaps within the same survey),
  bank branches and cash machines per 100,000 adults, and private credit as % of GDP. Eight new saved
  World Bank series; route `GET /api/financial-inclusion/:iso3`.
- Remittances (PA1): Research > History & data shows money sent home by people working abroad,
  beside exports, foreign direct investment and aid in the same year, how it moved in years exports
  fell, the cost of sending US$200 against the UN goal of below 3%, and money sent abroad. Five new
  saved World Bank series (BX.TRF.PWKR.CD.DT, BM.TRF.PWKR.CD.DT, BX.KLT.DINV.CD.WD, DT.ODA.ODAT.CD,
  SI.RMT.COST.IB.ZS); route `GET /api/remittances/:iso3`.
- Documentation: README rewritten to a developer and researcher standard, with recommended AI models
  by computer size, the referee rules, the model settings the app uses (temperature, seed, context
  window, time limits), measured download and disk sizes (source 59 MB, Docker image about 170 MB to
  download and 795 MB unpacked, packages 465 MB, build 6.5 MB, each language about 0.65 MB) beside
  the existing data estimates, the four languages, and how Quests work. New walk-through guide
  `docs/GUIDE.md` with 20 screenshots in `docs/images/`, taken from a build replaying the public
  recorded feed replies. README and guide translated into Spanish, French and Portuguese
  (`README.es.md`, `README.fr.md`, `README.pt.md`, `docs/GUIDE.*.md`). INSTALL.md image size now
  measured; ROADMAP and the user manual list Portuguese. The page description in `index.html` no
  longer names an outside project.

- One-page policy brief (G39): Policy review's memo step has a One-page brief (PDF) button: the
  question, the chosen option, the figures it rests on with sources and ranges, and what to watch,
  on one page for readers who are not economists, with fixed wording in English, Spanish, French or
  Portuguese. Built from the saved steps with no AI.
- Trade-off chart (G37): under Debt sustainability, the costed options and any what-if results
  kept from Council chat (new button Keep for the trade-off chart) on two axes you pick, such as
  debt at the horizon against output lost. Each item is a line from the low to the high published
  multiplier; items with no figure for an axis are left off with the reason. Kept results live in
  the page's memory only.
- Political feasibility (G36): Policy review shows, beside the options, the next and last election
  on file in the official calendar, checks and balances, fractionalisation, polarisation and years
  left in the term from the Database of Political Institutions file you save in `data/local/dpi/`,
  and protests and violence in the saved GDELT months, each cut at the As of day. The DPI's reuse
  terms are not confirmed, so nothing from it is shipped. New Data health row `dpi`; route
  `GET /api/reviews/:id/political`; glossary entry Checks and balances.
- Fiscal rules check (G35): Research > History & data shows the EU, WAEMU and CEMAC treaty limits
  that bind a country, checked against the latest saved IMF debt and overall balance before the
  current year, with the room left, and the national rules (expenditure, revenue, budget balance,
  debt) and since when, from the IMF Fiscal Rules Dataset you save in `data/local/imf-fiscal-rules/`.
  The IMF has not confirmed reuse terms, so nothing from it is shipped; without the file the national
  part reads Missing. New Data health row `imf_fiscal_rules`; route `GET /api/fiscal-rules/:iso3`.
- Precedent finder (G34): Policy review shows, after Diagnose, the eight countries whose yearly
  figures were closest to the review country's on the figures you pick, and what followed over the
  next three years (growth, inflation, debt, primary balance, current account, reserves, currency),
  read from the saved histories with the median of each. Only years before the As of year are read.
  IMF programme and crisis dates read Missing until the IMF confirms their terms. New route
  `GET /api/reviews/:id/precedents`; glossary entry Precedent finder.
- Portuguese, part 4 (U2): the Menu dialogs and Settings (keys, accounts, sign-in, add a country,
  idea journal, data connections, offline data, user manual and glossary), the help at Key help and
  Full help with the whole glossary and chart guides, the definition tags, Worked examples, and the
  Reports pages (teaching episodes, saved research, policy reviews, behavioural check, expert review
  and the memo builder). Portuguese now covers the whole app, like Spanish and French. The Settings,
  help, Reports, definition and worked-example coverage tests now check Portuguese as well. Not yet
  checked by a native speaker.
- Portuguese, part 3 (U2): the watchlist (also popped out), Your data, the small gap model, Your
  tests, My holdings and the book briefs, the Tools page and its tool panels, and Compare countries.
  The tool, compare and chat-card coverage tests now check Portuguese as well, and a new check keeps
  the spaces at the start and end of each Portuguese message, which put back three spaces part 2
  had dropped in the panels. Not yet checked by a native speaker.
- Portuguese, part 2 (U2): the Research scope bar, section names and Sources, one country's three
  briefs with their figure names, reasons and meanings, and every panel on one country's other tabs,
  including the sentences the app writes from the data. The brief and panel coverage tests now check
  Portuguese as well. Not yet checked by a native speaker.
- Portuguese, part 1 (U2): Brazilian Portuguese with the polite "você" joins the language button
  (EN / ES / FR / PT), downloaded only when picked. This part covers the app frame, Workspace,
  Council chat and the reasons a figure is Missing; other screens show in English until their parts
  arrive. Settings links in Portuguese help text open their Settings page. Not yet checked by a native
  speaker.
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
