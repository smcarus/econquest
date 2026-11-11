# Roadmap

What is planned for EconQuest, in the order it will be built. Last updated 11 November 2026.

## How the work is done

Every piece of work is one small change to the code. It is built and tested on its own, reviewed,
and only then joins the main app, so a problem in one change never holds up the others. A new phase
starts only when the one before it is finished. The order below is fixed; it can change only if the
maintainer decides so, and this page is updated when it does.

The same rules hold for every change:

- **Only real figures.** A new source adds figures only from its own published data; anything it
  cannot supply reads Missing, with the reason.
- **Each new source** comes with tests on saved replies (never the live service), a Data health row,
  a licence row, plain-language help at each help level, and its words in English, Spanish and French.
- **New data is fetched by the daily download**, not when a page opens, so no page waits on a website.
- **New screens load only when opened**, and each language downloads only when picked, so the app
  stays within its size limits (465 KB compressed at start-up, 7.5 MB in all).

## Done so far

| Area | What was added |
| --- | --- |
| Languages | The whole app in Spanish (formal *usted*) and French (formal *vous*), each downloaded only when picked |
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
| 3 | G16 inequality, tax revenue and tariffs (done: Gini, central government tax revenue and its split, applied tariffs, each with its year); U1 low-income country debt (done: debt-distress ratings, Common Framework, China lending from AidData, shipped summary; DSSI participation set aside for later); G17 people (done: poverty at three lines, remittances, labour force participation, youth unemployment, age dependency); G20 climate and energy (done: emissions per person, renewable share, energy mix downloaded to each computer under the Energy Institute's personal-use terms; ND-GAIN Missing, no licence); G18 trade and commodity exposure (done: goods trade by group, net energy imports, export concentration, top five export markets); G19 debt structure (done: interest as % of revenue, currency mix and maturity of new public external loans; who holds government debt from the IMF investor base workbook you download); G18 trade exposure; G20 climate and energy; G22 wages and house prices; G40 sector balances and private debt; G41 monthly activity; G42 revenue by level of government; G12/G13 euro area and UK figures as first published | The figures a full economic terminal needs, especially for the poorest countries |
| 4 | G43 security, privacy and Windows check; S1 success measures; U3 light mode for modest laptops; public release | The app goes public, and runs without a local AI model |
| Checkpoint 1 | About four weeks after the public release | Real use decides what comes next |
| 5 | G23 crisis early-warning; G24 external sustainability; G25 yield curve and financial conditions; G26 inflation drivers; G27 growth accounting; G28 bank and government links; G29 debt restructuring calculator; G30 who pays for a policy; G31 central bank word count; then G32 behavioural finance agent | New analysis tools; each forward-looking one is tested before it gets a badge |
| 6 | G33 behavioural policy check; G34 precedent finder; G35 fiscal rules check; G36 political feasibility; G37 trade-off chart; G39 one-page policy brief | A fuller policy review |
| 7 | U2 Portuguese, Arabic and Swahili; W1 worked examples; Phase 5 classroom and pilot, with P4 expert review | More languages once the screens have settled; teaching |
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
- A review of the Spanish and French translations by native speakers.
