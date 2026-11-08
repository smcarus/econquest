# Changelog

Notable changes for each release. The format follows [Keep a Changelog](https://keepachangelog.com/)
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
