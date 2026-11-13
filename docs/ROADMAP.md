# Roadmap

What is planned for EconQuest, in the order it will be built. Last updated 13 November 2026.

## How the work is done

Every piece of work is one small change to the code. It is built and tested on its own, reviewed,
and only then joins the main app, so a problem in one change never holds up the others. A new phase
starts only when the one before it is finished. The order below is fixed; it can change only if the
maintainer decides so, and this page is updated when it does.

The same rules hold for every change:

- **Only real figures.** A new source adds figures only from its own published data; anything it
  cannot supply reads Missing, with the reason.
- **Each new source** comes with tests on saved replies (never the live service), a Data health row,
  a licence row, plain-language help at each help level, and its words in English, Spanish, French and Portuguese.
- **New data is fetched by the daily download**, not when a page opens, so no page waits on a website.
- **New screens load only when opened**, and each language downloads only when picked, so the app
  stays within its size limits (465 KB compressed at start-up, 7.5 MB in all).

## Done so far

| Area | What was added |
| --- | --- |
| Languages | The whole app in Spanish (formal *usted*), French (formal *vous*) and Brazilian Portuguese (*você*), each downloaded only when picked; Arabic and Swahili planned, not started |
| Documentation | README and walk-through guide with screenshots in English, Spanish, French and Portuguese; recommended AI models, settings and measured download and disk sizes |
| Researcher tools | Opt-in 14B referee for smaller computers; a small gap model you fill in yourself, with a council link; the data API with R, Python and Stata helpers; register and run your own tests, with their own Holm correction |
| Your own data | Load your own CSV series and use them across the app |
| Fiscal what-ifs | Spending multipliers by type, defence and spending by purpose, OECD and European Commission budget elasticities, an editable what-if card |
| Figures you can compare and cite | A Cite button on every chart, table and answer (plain text, BibTeX, RIS) and a citation file and data manifest in replication packs; each series says what it measures and whose figure it is, whether it is seasonally adjusted, real or nominal, its base year and currency; forecasts show a range and say what it means; each country's next CPI and GDP release dates from the statistics office's own calendar |
| Paid data you already have | A Settings screen for your own subscription (off by default, paid figures never leave your computer) and the first vendor, Macrobond |
| New data | IMF PortWatch shipping, central bank decision dates, a Calendar tab, US Treasury auctions, EU business and consumer surveys, fresher inflation figures (IMF monthly prices, freshest source per country) |
| Easier running | `npm run go` (one command to update and start), downloads at start-up and the daily data download (which records how much it downloads), the ready-made app image, and the computer and disk space needed, written down in the install guide |
| Trust and testing | Pre-registered tests with badges, the track record with the Holm correction, agent badges and a sources line on every answer |
| Learning | Three help levels, a plain-language glossary, teaching episodes and exam mode; Quests built but switched off until checked |
| Smaller and faster | Council chat and several Research panels load only when opened |
| Open source | Licences (Apache-2.0, CC BY 4.0, DCO), governance, contributing guide, the methodology and a clean public export |

## Phase 4: data and economist readiness (G1 to G10 done)

This phase fills free data gaps, adds a way to plug in a paid data subscription you already have, and
makes figures safer to compare and cite.

| # | Change | What it means for you | Status |
| --- | --- | --- | --- |
| G1 | US Treasury auctions | How much demand there is at each US government debt sale (bid-to-cover, yield, amounts) | Done |
| G2 | EU business and consumer surveys | A free stand-in for paid PMI surveys for EU members, labelled "not a PMI" | Done |
| G3 | Fresher inflation figures | Uses the freshest of national, Eurostat or IMF monthly inflation before the stale OECD copy, and shows each figure's age | Done |
| G4 | Paid-data connector | A Settings screen for your own data subscription; off by default; paid figures never leave your computer or appear in downloads, backups or shared copies | Done |
| G5 | Macrobond adapter | The first paid vendor plugged into G4: signs in with your own Web API licence and fetches your mapped series in the daily run or with "Fetch now" | Done (still to be tried by a Macrobond licence holder) |
| G6 | Definition tags | Each figure says what it measures (for example, general or central government) | Done |
| G7 | Seasonal adjustment and frequency | States whether figures are seasonally adjusted and how monthly figures become quarterly ones | Done |
| G8 | Units and conversions | Real or nominal, base year, currency, market rate or purchasing power parity | Done |
| G9 | Uncertainty ranges | Forecasts show a range, not just one number; hidden at Help off | Done |
| G10 | Release calendar | When each country's next inflation and growth figures come out | Done (six countries read; the rest say why not) |

The rest of Phase 4 (G11 to G15) is now part of the build order below.

## The build order from here

Agreed on 9 November 2026 and started on 11 November. Steps are grouped into waves so that work which
shares code is done together, the computer runs that only the maintainer can do are batched, and
outside users can try the app before the larger tools are built. **No new features are added to this
list until checkpoint 1;** new ideas are kept on a parked list and looked at then.

| Wave | Steps | What it means for you |
| --- | --- | --- |
| 0 | Licence check of every planned source; tests for G23, G25 and G32 written down and locked before those tools exist | No later step waits on a licence, and building a tool cannot bend its test |
| 1 | G11 "Cite this" (done); K1 size review (done); M1 upkeep routine (done: sources failing for 30 days flagged, yearly licence re-read, monthly library updates) | Citations for every chart and answer; room for more languages; sources that change or vanish are caught |
| 2 | P1 policy outcome check (done: 12- and 24-month checks, Policy track record); G38 "how could this fail" step (done: pre-mortem per option, early warnings checked at 12 and 24 months); P2 flag a figure or answer (done); P3 rate answers (done) | Policy reviews are checked against what happened after 12 and 24 months; you can report problems |
| 3 | G16 inequality, tax revenue and tariffs (done: Gini, central government tax revenue and its split, applied tariffs, each with its year); U1 low-income country debt (done: debt-distress ratings, Common Framework, China lending from AidData, shipped summary; DSSI participation set aside for later); G17 people (done: poverty at three lines, remittances, labour force participation, youth unemployment, age dependency); G20 climate and energy (done: emissions per person, renewable share, energy mix downloaded to each computer under the Energy Institute's personal-use terms; ND-GAIN Missing, no licence); G18 trade and commodity exposure (done: goods trade by group, net energy imports, export concentration, top five export markets); G19 debt structure (done: interest as % of revenue, currency mix and maturity of new public external loans; who holds government debt from the IMF investor base workbook you download); G22 wages and house prices (done: nominal and real wage growth from ILOSTAT with World Bank inflation, real and nominal house prices from the BIS); G40 sector balances and private debt (done: government, private and foreign balances from the IMF government balance and current account, the private balance labelled as the remainder; household and company debt from BIS total credit); G41 monthly activity (done: industrial production, retail sales and the monthly unemployment rate from Eurostat for EU members and Turkey, the US Fed, Census Bureau and BLS, the UK ONS and Brazil's IBGE; US release dates in the calendar; other countries Missing with the reason); G42 revenue by level of government (step 1 done: central, state, local and social security revenue and spending from Eurostat and IMF GFS, with the state and local share; step 2, a per-state screen, waits for the coverage count from the Mac check); G12/G13 euro area and UK figures as first published (done: euro area GDP, HICP inflation and unemployment from the ECB real-time database; UK GDP growth since 1992 from the ONS revision triangle; both in History & data) | The figures a full economic terminal needs, especially for the poorest countries |
| 4 | G43 security, privacy and Windows check (review done: docs/SECURITY_REVIEW.md; Ollama no longer open to the network or to web pages; Windows scripts fixed; a first run on a Windows computer is still to do); S1 success measures (done: the list below under "How we will know it works", counted without tracking anyone, `npm run check:success`); U3 light mode for modest laptops (done: `LIGHT_MODE=on`, no AI model on the computer, no GDELT news files, watchlist countries only; memory and disk figures to be measured before the release); public release | The app goes public, and runs without a local AI model |
| Pulled forward | Parked idea group A, data for underserved countries (Sam chose 13 November): PA1 remittances (done 13 November: received, beside exports, investment and aid the same year, years exports fell, cost of sending against the UN 3% goal); PA5 financial inclusion (done 13 November: Global Findex accounts for adults, women and men, poorer and richer households, branches, cash machines, private credit); PA3 commodity prices and terms of trade (done 13 November: trade shares of fuel, ores and metals and food, World Bank monthly price moves, rough effect as % of GDP, commodity dependence, terms of trade index); PA4 aid (done 13 November: net aid received against GNI, government spending, imports and investment, per person, six donors, ten years; read from the World Bank's republication of OECD DAC figures); then PA2 food prices, PA6 disasters once their terms are checked | The largest outside flows and pressures for lower-income countries |
| Checkpoint 1 | About four weeks after the public release | Real use decides what comes next |
| 5 | G23 crisis early-warning (screen done 12 November: BIS credit gap against the Basel III lines, debt service, house prices, Not validated; its test runner waits for the crisis-dates licence); G24 external sustainability (done 12 November: external debt, debt service against reserves and exports, debt-stabilising current account; norm and investment position Missing with the reason); G25 yield curve and financial conditions (done 12 November: term spread, inverted spells, equal-weight conditions index; its locked recession test now runnable, no recession figure until it passes); G26 inflation drivers (done 12 November: headline against core, food and energy, contributions for EU members from Eurostat item weights); G27 growth accounting (done 12 November: capital, hours, human capital and TFP from the Penn World Table, chart and CSV); G28 bank and government links (done 12 November: bank size, claims on the government, banks' share of government debt, capital and bad loans, each with source and year; state-owned banks and contingent liabilities Missing with the reason); G29 debt restructuring calculator (done 12 November: old and new bond terms and up to three discount rates typed by the user, NPV and market haircuts, payments year by year, CSV; every field blank); G30 who pays for a policy (done 12 November: incidence shares typed by the user with their source, set against each fifth's share of income, regressive or progressive reading, beside the Gini, tax split and poverty rates; starts empty); G31 central bank word count (done 12 November: Apel and Blix Grimaldi 2012 dictionary on statements you save or paste, net index by statement; no AI scoring, no downloads); G32 behavioural finance agent (done early, 12 November: Council chat agent describing herding and sentiment, its locked test now runnable) | New analysis tools; each forward-looking one is tested before it gets a badge |
| 6 | G33 behavioural policy check (done 12 November: flags in Policy review where an option depends on take-up, a tax response, trust in a target, defaults, losses or acting now for a gain later, each citing published studies from a fixed list; effect sizes only as entered with a source; glossary group Behavioural economics); G34 precedent finder (done 12 November: closest country-years on the figures picked and what followed over three years, from the saved histories; IMF programme and crisis dates Missing until the IMF confirms terms); G35 fiscal rules check (done 12 November: EU, WAEMU and CEMAC treaty limits checked against the latest saved IMF debt and balance; national rules listed from the IMF Fiscal Rules Dataset you save locally, terms not confirmed, not shipped); G36 political feasibility (done 13 November: beside the Policy review options, elections on file, DPI checks and balances from the file you save locally, terms not confirmed, not shipped, and GDELT unrest, cut at the As of day); G37 trade-off chart (done 13 November: under Debt sustainability, the costed options and the what-if results you keep from Council chat on two axes you pick, each drawn from the low to the high published multiplier); G39 one-page policy brief (done 13 November: Policy review memo step, one PDF page for non-economists with the question, the chosen option, its figures with sources and ranges, and what to watch, in English, Spanish, French and Portuguese) | A fuller policy review |
| 7 | U2 Portuguese, Arabic and Swahili (Portuguese done 12 November in four parts: Brazilian, "você"; the whole app, from the app frame, Workspace and Council chat to Research, Tools, Compare, Menu, Settings, help and glossary, Worked examples and Reports); W1 worked examples (done early, 12 November: Menu > Worked examples, four case studies from a question to a memo, EN/ES/FR/PT); Phase 5 classroom and pilot, with P4 expert review (form done 12 November: Policy review > Expert review, five questions on the memo, saved with its hash, CSV, published summary only with consent; the review round itself runs with the pilot) | More languages once the screens have settled; teaching |
| Checkpoint 2 | After the pilot term | |
| When documentation arrives | G14 Haver, G15 Moody's | Paid vendors that need a subscriber's API documentation |

## Phase 5: Quests in the classroom (wave 7)

This phase lets a professor run Quests with a class. It sits behind its own class switch with its own
go-live checklist, so schools can start before Quests opens to everyone. The app never grades; the
professor does.

| # | Change |
| --- | --- |
| Q1 | Teacher, marker and student roles; classes by term with a join code |
| Q2 | One-command class setup, a release pinned for the whole term, and a page for school IT staff |
| Q3 | Assignments: dates in local time, an AI rule, private extensions, entries hidden until close, copy last term |
| Q4 | Professor-written class Quests with intro, intermediate and advanced tags |
| Q5 | Replay Quests and four ready-made term packs |
| Q6 | Feedback, optional anonymous peer review, a switch for sensitive topics |
| Q7 | Class table settings and a one-page student report |
| Q8 | Gradebook file, voided Quests left out of marks, archived classes deleted after a period the professor sets |
| Q9 | Sealed hand-in files for students working on their own copies |
| Q10 | Accessibility review (WCAG 2.1 AA), designed for phone width first |
| Q11 | Load test: 40 students on one modest laptop |
| Q12 | Community links on GitHub (publish an entry, class tags, packs), after the public release |
| Q13 | Teacher guide (English, then Spanish and French) and a Teaching page on the website |

Open groups (clubs and research teams, not only classes) are part of Q12.

Two small follow-ons, added in November 2026:

| # | Change |
| --- | --- |
| QL1 | Spanish and French titles and questions in Quest files, shown in the chosen language; community translations of Quests open with it |
| L3a | Settled Quest forecasts served by the researcher data API and its R, Python and Stata helpers, answering only when Quests are switched on |

After the build comes a one-term pilot with two professors (one in an underserved country), then
outreach to economics departments.

### Before Quests open to everyone

These join the public Quests go-live checklist (docs/QUESTS.md). They need the public repository and
ship only when Quests are switched on for everyone, not with the classroom changes:

- Links to Quests from country pages and from Council chat.
- Sealed public entries: each entry is locked in with a fingerprint before the deadline and revealed
  after it, so nobody can copy or change a forecast.
- A dashboard for maintainers.
- On GitHub: an Ideas category where people vote on suggestions; a contributor, reviewer and steward
  ladder in GOVERNANCE.md; a Discussion thread opened for each Quest, with the result posted when it
  settles; a rule-based check of the figures quoted in revealed debate entries (no AI judging); a
  welcome message for first-time contributors and a "good first Quest" label; badges for taking part,
  not rankings; a "report a data problem" link on every Quest; debate rules and a report link on every
  thread, locked a week after the Quest settles; a monthly round-up; and a first replication
  challenge on a published paper the maintainer picks.

## The public release

The licences, governance files and the public export tool are in place. Still to do: refresh the
clean public copy, publish it at [github.com/e-conquest/econquest](https://github.com/e-conquest/econquest),
switch on Discussions and private vulnerability reporting there, make the ready-made app image public,
add the public address to the citation file and website, and open donations through the project
website (GitHub Sponsors and Open Source Collective) once a fiscal host is in place.

## How we will know it works (S1)

A short list of things to watch after the public release. The app sends nothing for these: no
analytics, no usage pings, no counting of who opens it. Every count is either public on GitHub or
kept on the maintainer's own computer. `npm run check:success` prints the counts it can read and keeps
each run in `data/local/success-measures.jsonl`, so the change since the release can be read at the
review.

| Measure | What it tells us | Where it is counted |
| --- | --- | --- |
| GitHub stars and forks | How many people found the project worth keeping an eye on, or copying to change | GitHub (`npm run check:success`) |
| Issues and pull requests | Whether people use the app enough to report problems or send changes, and how many reports wait for an answer | GitHub (`npm run check:success`) |
| Flags sent as issues | Figures or answers people found wrong and chose to report with the Flag button | GitHub issues titled "Flag:" (`npm run check:success`) |
| Discussions | Questions and ideas from people using the app | The Discussions tab, read by hand (GitHub gives no count without a sign-in) |
| App image downloads | How often the ready-made app image is downloaded (downloads, not people) | The package page on GitHub, read by hand |
| Release downloads | How often files attached to a release are downloaded (downloads, not people) | GitHub (`npm run check:success`) |
| Outcome-check hit rate (P1) | How often a saved policy review's goal was met after 12 and 24 months; fewer than 10 judged checks is too few to read a rate from | Policy track record, on the maintainer's computer |
| Answer ratings (P3) | Thumbs up and down on council answers; other people's ratings count only when they choose to send them | Data health, on the maintainer's computer |
| Expert review scores (P4) | What pilot economists and professors score policy review memos: clarity, use of evidence, whether the sources are correct, whether they would act on them | Reports > Policy reviews > Expert review on the computer where they fill it in; `npm run check:success` counts them; published only with consent in docs/validation/expert-reviews.md (`npm run reviews:summary`) |

No targets are set before the release: there is nothing yet to compare against. **Review date:**
checkpoint 1, about four weeks after the public release. The release day and the review day are
written here on the day of the release.

## Paused: the phone app

A free standalone phone app that uses your own keys, for Android (Google Play, F-Droid and a direct
download) and iPhone. Two of its 21 changes are done; the rest wait until the public release is live
and the maintainer restarts the work. The first stage (separating the app's engine from the server)
also tidies how the main app stores data and calls feeds.

## Noted, not yet scheduled

- Giving the council the defence and spending-by-purpose figures directly in its instructions.
- Budget elasticities for Brazil, India, China and other countries outside the OECD.
- Council-drafted what-if questions.
- Wider statistics tools (more than two variables, panels).
- Bilateral and current tariff rates (WITS, WTO).
- A dated data snapshot with a DOI, to be decided at the public release.
- A review of the Spanish, French and Portuguese translations by native speakers.
