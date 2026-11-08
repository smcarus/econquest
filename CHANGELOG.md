# Changelog

Notable changes for each release. The format follows [Keep a Changelog](https://keepachangelog.com/)
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
