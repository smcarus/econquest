# Changelog

Notable changes for each release. The format follows [Keep a Changelog](https://keepachangelog.com/)
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
