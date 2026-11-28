# Roadmap

What is planned for EconQuest, in the order it will be built. Last updated 27 November 2026.

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
  stays within its size limits (520 KB compressed at start-up, 9 MB in all).

## Done so far

| Area | What was added |
| --- | --- |
| Languages | The whole app in Spanish (formal *usted*), French (formal *vous*) and Brazilian Portuguese (*você*), each downloaded only when picked; Arabic and Swahili planned but paused by the maintainer on 12 November, not started |
| Documentation | README and walk-through guide with screenshots in English, Spanish, French and Portuguese; recommended AI models, settings and measured download and disk sizes; a table of the files you save yourself in the install guide; a deployment guide for running the app as a service, a plain-language guide to how the app works (docs/HOW_IT_WORKS.md), every document brought up to date with the console integration on 13 November, and again on 14 November with the feed fixes, the usability fixes, markets and financing data, the policy council, and weather and insurance (README and guide in four languages, methodology version 1.3, the plain-language guide, install guide, data API and data sources), and on 17 November with Ask Council chat, the Research and Reports layout, what-if questions, the five user roles and the outside research tools (README and guide in four languages with new screenshots, methodology version 1.4, the plain-language guide version 1.4, install guide, data API), and on 24 November with everything from lower-income coverage to the standard app features (README and guide in four languages with 21 new screenshots, methodology and the plain-language guide version 1.6, install, upkeep, contributing and data API guides), and on 27 November with What happened after (methodology and the plain-language guide version 1.10, user manual, guide and features in four languages, testing, data API and architecture notes) |
| Researcher tools | Opt-in 14B referee for smaller computers; a small gap model you fill in yourself, with a council link; the data API with R, Python and Stata helpers; register and run your own tests, with their own Holm correction |
| Your own data | Load your own CSV series and use them across the app |
| Fiscal what-ifs | Spending multipliers by type, defence and spending by purpose, OECD and European Commission budget elasticities, an editable what-if card |
| Figures you can compare and cite | A Cite button on every chart, table and answer (plain text, BibTeX, RIS) and a citation file and data manifest in replication packs; each series says what it measures and whose figure it is, whether it is seasonally adjusted, real or nominal, its base year and currency; forecasts show a range and say what it means; each country's next CPI and GDP release dates from the statistics office's own calendar |
| Paid data you already have | A Settings screen for your own subscription (off by default, paid figures never leave your computer) and three vendors: Macrobond, then Trading Economics and EODHD (27 November, #724), each with the user's own key; a mapping that names a CDS is refused while CDS is hidden |
| New data | IMF PortWatch shipping, central bank decision dates, a Calendar tab, US Treasury auctions, EU business and consumer surveys, fresher inflation figures (IMF monthly prices, freshest source per country) |
| Easier running | `npm run go` (one command to update and start), downloads at start-up and the daily data download (which records how much it downloads), the ready-made app image, and the computer and disk space needed, written down in the install guide |
| Trust and testing | Pre-registered tests with badges, the track record with the Holm correction (39 tests on record on 23 November: 11 passed, 8 of them still holding after the correction; verdicts copied from real runs with `npm run track-record:import`), the forward record for release days, agent badges and a sources line on every answer; statistics checked against standard packages (ADF refitted on the full sample, daily year-on-year by calendar date, HP smoothing by frequency, dollar figures to the nearest $1,000) |
| Learning | Four help levels (help off, key help, full help, expert), a three-step start-here card, a plain-language glossary, teaching episodes and exam mode; Quests built but switched off until checked |
| Connecting other systems | Console integration C1 to C13 (13 November, #512 to #525): stable country and security identifiers, named API tokens with scopes, correlation IDs, events and signed webhooks, indicator watches, a country snapshot, positions sent in from outside, a hidden-names list, scenarios and crisis replays on a portfolio, a sealed audit log with locked copies, a deployment guide, and sign-in through any OpenID Connect provider |
| Smaller and faster | Council chat and several Research panels load only when opened |
| Easier first use (24 November, #660 to #662, #666, #669) | A short answer by stated rules at the top of Council chat when no AI model writes one, a shorter Missing list, more room for the answer, Policy review as its own page next to Reports, plain wording, and a start-here card |
| Recovering on its own (24 November, #663 to #668, #670) | Updates that never stop on files the app writes itself, slow sources asked again before they count as failed, a second try for failed downloads and later tries after two hours, the next free port when 3000 is busy, and the last good answer with its own dates while a source does not answer |
| Standard app features (24 November, #671 to #677) | A privacy page, a notice when a newer version is out, Copy details and Report a problem, a question before deleting a watchlist, following the computer's dark or light setting, steps to remove the app, and keyboard shortcuts |
| Release check and the poorest countries (25 November, #683 to #687) | A second security review and a stricter page security policy for the built app; Add a country lists every country, not only those on the world map; the 59 countries on the IMF low-income debt list built in, saved daily once they are on a watchlist; the automatic Windows check passes again |
| The World Bank's country models (26 November, #691 to #696) | The World Bank's public MFMod models for Bolivia, Croatia, Iraq, Nepal, Pakistan and Turkiye, run on the user's computer by an optional Python service (ModelFlow, Docker profile `models`, off by default); their stored baseline under IMF forecasts by edition; one-shock runs (oil, food, government purchases, policy rate) shown as differences from the model's own baseline, in the panel and in Scenario Agent answers; and a pre-registered reproduction check (`npm run mfmod:validate`) that passed on the maintainer's computer on 26 November (`docs/validation/models/results.json`) |
| Safer builds and accessibility (26 November, #697, #698, #706 to #709) | Every build step and base image pinned to a fixed version, with a test that fails on a loose tag; CodeQL code scanning and OpenSSF Scorecard, which run once the repository is public; software parts lists (SPDX and CycloneDX), checksums and a signed build proof with each release and image; accessibility checked against WCAG 2.2 A and AA with a keyboard focus pass; the computer's reduce motion setting followed; and an accessibility statement ([ACCESSIBILITY.md](./ACCESSIBILITY.md)) |
| What happened after (27 November, #714 to #721) | In Policy review > Precedents, a country set against a "twin" of countries that did not make the same change (synthetic control), with placebo, leave-one-out and three-years-early checks; changes found by rules, from your saved files and your own entries (kept in Backup); keep a result for the one-page brief; Cite; every country with the same kind of change, pooled; a pre-registered false-alarm test (`npm run synth:validate`), Not validated until it runs on a computer that reaches the IMF and World Bank |
| What this means for you (27 November) | Menu > What this means for you: your own inflation rate from your split over the official price groups (Eurostat main groups and weights for EU members; food, energy and the rest elsewhere; IMF groups after a Mac check), against headline, and your loan payment after a rate change you choose and after the central bank's last move; entries kept only in the browser |
| Testing before release (26 November, #712) | Invited testers install from the code at github.com/smcarus/econquest in light mode ([TESTING.md](./TESTING.md)); Menu > Report a problem and the Flag button open issues there until the public repository opens |
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
| Pulled forward | Parked idea group A, data for underserved countries (Sam chose 13 November): PA1 remittances (done 13 November: received, beside exports, investment and aid the same year, years exports fell, cost of sending against the UN 3% goal); PA5 financial inclusion (done 13 November: Global Findex accounts for adults, women and men, poorer and richer households, branches, cash machines, private credit); PA3 commodity prices and terms of trade (done 13 November: trade shares of fuel, ores and metals and food, World Bank monthly price moves, rough effect as % of GDP, commodity dependence, terms of trade index); PA4 aid (done 13 November: net aid received against GNI, government spending, imports and investment, per person, six donors, ten years; read from the World Bank's republication of OECD DAC figures); PA2 food prices (done 13 November: food price inflation from the FAOSTAT file you save, hunger and food insecurity, net food imports, world staple prices); PA6 disasters (done 13 November: EM-DAT events since 2000 from the file you download with your own account, by type, deaths and people affected, damage as % of GDP, largest events) | The largest outside flows and pressures for lower-income countries |
| Pulled forward | Parked idea group C, policy workflow tools (Sam chose 13 November): PC1 watch alerts (done 13 November: the start page checks each memo's watch triggers against the latest saved figures); PC2 peer comparison (done 13 November: diagnosis figures beside up to six peers, each as saved on the As of day, with median and rank); PC3 review-to-review comparison (done 13 November: frame changes, recommended options, figures then and now, goal move) | Close the loop on a policy review before and at its review date |
| Pulled forward | Parked idea group B, markets and financing data from free sources (Sam chose 14 November): PB1 exchange rate regime (built 14 November: the Ilzetzki, Reinhart and Rogoff monthly classification from the workbook you save in data/local/irr/, coarse and fine codes in History & data, cited, never shipped); PB3 central bank balance sheets (built 14 November: BIS central bank total assets, % of GDP and US$ bn, in History & data); PB4 dollar funding stress (built 14 November: BIS dollar credit to non-banks per country and Federal Reserve swap lines outstanding each Wednesday; cross-currency basis left out, paid data); PB2 capital controls counted done with the Chinn-Ito index already in (Sam chose 14 November) | Whether the currency floats, is managed or is pegged changes every policy option |
| Pulled forward | Policy council inside Policy review (Sam asked 14 November): PK1 the measure to weigh in the frame (built 14 November); PK2 cost-benefit (built 14 November: costs and benefits by year with sources, present values at cited official discount rates and your own, pay-back year, switching values); PK3 winners and losers (built 14 November: groups that gain or lose and why, sizes only with a source, by-fifth shares against income shares); PK4 second-order effects (built 14 November: a chain of links, each resting on a Diagnose figure, a named source or marked as an assumption); PK5 scenarios (built 14 November: two to five cases scaled from the cost-benefit table, with odds); then a pause for Sam to try them; PK6 the council weighs the measure in the Options step (built 14 November: option 1 is the measure, alternatives ranked against it, figures only from the diagnosis and the entries); PK7 a market instead of a measure (built 14 November: market readings copied in from the app's history at As of, cases as a change in value, the council ranks responses against keeping the current stance); PK8 brief (built 14 November: the council parts at the end of the one-page brief PDF); PK9 docs and check-back (built 14 November: user manual, guide and glossary terms; outcome checks set a currency market council's cases against what happened) | Weigh one measure the way the council weighs a country: costs, who gains and who pays, what follows and what could go differently |
| Pulled forward | Weather and insurance (Sam asked 14 November): W1 monthly temperature and rainfall at each capital from NASA POWER, with the comparison against 1991-2020 (built 14 November); W2 temperature and rainfall averaged over each country since 1901 from the World Bank climate portal (CRU TS, built 14 November); W3 the full Pink Sheet history since 1960 for rice, wheat, maize and soybeans (built 14 November); then insurance I1 to I8, starting with I5 a parametric trigger designer and burn analysis (built 14 November) I6 a fair price with a loading you pick, I3 and I4 return periods and an extreme value fit, and I7 basis risk against a second weather series, I1 and I2 disaster loss history with frequency and severity fits from the EM-DAT file, and I8 tropical cyclone tracks near each country from NOAA IBTrACS (all built 14 November) | Weather shocks drive food prices, farm incomes and budgets in the countries that can least absorb them |
| Pulled forward | Ask Council chat from another program (15 November, #574): a token with the `ask:council` scope asks Council chat a new question and gets the answer the chat gives, from the same code, with every figure cited, hidden names left out and an optional cost limit | Another program can ask the council without a person at the screen |
| Pulled forward | Research and Reports layout (16 November, #575 and #576): Reports in five tabs; History & data as the chart and a menu of tools in eight groups, one tool at a time; Summary, Sources and My holdings one figure group at a time; Markets & signals and Compare in parts. Nothing removed | Pages fit a screen or two instead of ten |
| Pulled forward | Deep what-if (all done 17 November, #577 to #582): WI1 Council chat reads the changes a question states, with their sizes; WI2 the Scenario Agent sets today's figures beside the figures after the change; WI3 what history shows (past episodes, similar moves since 1980, where the new level would sit); WI4 published research beside the app's numbers; WI5 answers in eight sections, each marked with its kind of evidence; WI6 an editable scenario card, and debt paths kept for the trade-off chart | Ask "what if?" in plain words and see the arithmetic, the past and the research behind the answer |
| Pulled forward | Outside research tools (done 17 November, #597 and #598): a client for a research-tools server you run (Settings > Research tools, Test connection, every call in the audit log), and the Quant desk in Council chat, which shows that server's figures with their links and labels. Off by default; chat only | Bring figures from your own quant server into a chat answer without mixing them with the app's own |
| Pulled forward | Console integration (Sam opened 13 November; all done 13 November, #512 to #525), so an outside portfolio console can read EconQuest figures and send holdings in: C1 stable identifiers (ISO alpha-2 and alpha-3; ISIN, LEI, CIK or ticker plus an entity ID); C2 scoped API tokens (Settings > API tokens) with optional OIDC sign-in; C3 correlation IDs (X-Correlation-Id in the audit log); C4 indicator event stream (one envelope, idempotency, retries, signed webhooks, delivery log); C5 indicator watches over the API; C6 country snapshot without a council run; C7 holdings write API; C8 hidden-names list; C9 scenario API on a supplied portfolio (EM FX, US rates, fiscal, historical replays; Mac check owed: `npm run replays:pull`, then check:data row fed_h10); C10 audit seal (HMAC plus S3 object lock); C11 server deployment guide, /healthz and a daily-download deadline; C12 validation (scorecard pre-registration, crisis_warning licence status); C13 capital controls from the Chinn-Ito index, cited and never re-published (Mac check owed: `npm run chinn-ito:pull`, then check:data row chinn_ito) | Use EconQuest figures inside an outside portfolio tool, with the same research rules |
| Pulled forward | Quick wins from the platform comparison (Sam chose 23 November): CG1 spreadsheet links (built 23 November: an Excel Power Query helper and a Google Sheets script for a home-server copy, both reading the data API, with the key only in a header); CG2 official forecasts side by side (built 23 November: IMF WEO, World Bank Global Economic Prospects and OECD Economic Outlook growth and inflation forecasts for this year and the next two, with the spread between them; the Philadelphia Fed survey for the United States only from your file, as no terms of use were found); CG3 release days (built 23 November: CPI and monthly activity sources re-read hourly on a calendar release day until a newer month arrives, shown on Today and in Data health; GDP not re-read, as its source lags by months); CG4 the IMF and World Bank low-income debt framework parked (Sam chose 23 November: the framework was revised in September 2026 and its new guidance note comes in mid-2027; built then, on the new note) | Spreadsheets refresh from the app; a free stand-in for consensus forecasts; new figures on the day they come out |
| Pulled forward | Track record and the scorecard test (19 to 23 November, #625, #626, #637 to #639): the runner for the country risk scorecard test (C12, passed on its first run), `npm run track-record:import` to copy verdicts from a real run, and the 22 and 23 November runs imported | 39 tests on record, each copied from a real run, never by hand |
| Pulled forward | Predictive econometrics PE1 to PE8 (Sam asked 22 November; done 22 November, #627 to #636): KPSS beside ADF, drift and seasonal benchmarks and band scores, tests on figures as first published, GARCH(1,1) currency volatility, ridge and lasso nowcasts, ARIMA by exact likelihood, a dynamic factor nowcast, quantile growth bands and a random forest nowcast, each with a pre-registered test | GARCH volatility and quantile bands passed and hold after the correction; ridge and lasso passed but do not hold after it; the rest failed and stay on record |
| Pulled forward | UI review fixes, self-healing and standard app features (24 November, #660 to #677) | See the three rows for 24 November under "Done so far" |
| Pulled forward | What happened after (Sam chose 27 November, from the world-class review): SC1 synthetic control with placebo, leave-one-out and in-time checks (#714); SC2 changes found by rules, from your files and your own (#715); SC3 the pre-registered false-alarm test and `npm run synth:validate` (#716); SC4 the card in Policy review > Precedents (#717); your own changes in Backup (#718); SC5 keep for the policy brief, Cite, and a link from the Scenario Agent's scenario card (#719); SC6 every country with the same kind of change, pooled (#720); the documents (#721), all on 27 November | How a country went after a change, against countries that did not make it |
| Pulled forward | What this means for you (Sam chose 27 November, idea B4 from the world-class review): PY1 official price groups and weights (Eurostat; IMF groups behind `IMF_CPI_GROUPS=on`; food, energy and the rest elsewhere); PY2 your rate from your split; PY3 loan payment and the central bank's last move; PY4 the screen in its own menu entry in four languages; PY5 entries kept only in the browser; PY6 the documents, all on 27 November | Inflation and interest rates in one household's terms |
| Pulled forward | Paid data connections (Sam chose 27 November; done 27 November, #724): Trading Economics and EODHD next to Macrobond, each used only with the user's own key, figures kept on the user's computer; not yet tried against a live key | Frontier bond yields, stock indices and more for users who already pay for one of them |
| Checkpoint 1 | About four weeks after the public release. Checkpoint 2 was folded into it on 13 November, so this is the one review before more work is planned | Real use decides what comes next: the parked ideas below are looked at, and the rest of the list is kept, dropped or reordered |
| 5 | G23 crisis early-warning (screen done 12 November: BIS credit gap against the Basel III lines, debt service, house prices, Not validated; its test runner waits for the crisis-dates licence); G24 external sustainability (done 12 November: external debt, debt service against reserves and exports, debt-stabilising current account; norm and investment position Missing with the reason); G25 yield curve and financial conditions (done 12 November: term spread, inverted spells, equal-weight conditions index; its locked recession test now runnable, no recession figure until it passes); G26 inflation drivers (done 12 November: headline against core, food and energy, contributions for EU members from Eurostat item weights); G27 growth accounting (done 12 November: capital, hours, human capital and TFP from the Penn World Table, chart and CSV); G28 bank and government links (done 12 November: bank size, claims on the government, banks' share of government debt, capital and bad loans, each with source and year; state-owned banks and contingent liabilities Missing with the reason); G29 debt restructuring calculator (done 12 November: old and new bond terms and up to three discount rates typed by the user, NPV and market haircuts, payments year by year, CSV; every field blank); G30 who pays for a policy (done 12 November: incidence shares typed by the user with their source, set against each fifth's share of income, regressive or progressive reading, beside the Gini, tax split and poverty rates; starts empty); G31 central bank word count (done 12 November: Apel and Blix Grimaldi 2012 dictionary on statements you save or paste, net index by statement; no AI scoring, no downloads); G32 behavioural finance agent (done early, 12 November: Council chat agent describing herding and sentiment, its locked test now runnable) | New analysis tools; each forward-looking one is tested before it gets a badge |
| 6 | G33 behavioural policy check (done 12 November: flags in Policy review where an option depends on take-up, a tax response, trust in a target, defaults, losses or acting now for a gain later, each citing published studies from a fixed list; effect sizes only as entered with a source; glossary group Behavioural economics); G34 precedent finder (done 12 November: closest country-years on the figures picked and what followed over three years, from the saved histories; IMF programme and crisis dates Missing until the IMF confirms terms); G35 fiscal rules check (done 12 November: EU, WAEMU and CEMAC treaty limits checked against the latest saved IMF debt and balance; national rules listed from the IMF Fiscal Rules Dataset you save locally, terms not confirmed, not shipped); G36 political feasibility (done 13 November: beside the Policy review options, elections on file, DPI checks and balances from the file you save locally, terms not confirmed, not shipped, and GDELT unrest, cut at the As of day); G37 trade-off chart (done 13 November: under Debt sustainability, the costed options and the what-if results you keep from Council chat on two axes you pick, each drawn from the low to the high published multiplier); G39 one-page policy brief (done 13 November: Policy review memo step, one PDF page for non-economists with the question, the chosen option, its figures with sources and ranges, and what to watch, in English, Spanish, French and Portuguese) | A fuller policy review |
| 7 | U2 Portuguese, Arabic and Swahili (Arabic and Swahili paused by the maintainer on 12 November and left planned; they start only when the maintainer says so. Portuguese done 12 November in four parts: Brazilian, "você"; the whole app, from the app frame, Workspace and Council chat to Research, Tools, Compare, Menu, Settings, help and glossary, Worked examples and Reports); W1 worked examples (done early, 12 November: Menu > Worked examples, four case studies from a question to a memo, EN/ES/FR/PT); Phase 5 classroom and pilot (building since the maintainer's go on 28 November), with P4 expert review (form done 12 November: Policy review > Expert review, five questions on the memo, saved with its hash, CSV, published summary only with consent; the review round itself runs with the pilot) | More languages once the screens have settled; teaching |
| When documentation arrives | G14 Haver, G15 Moody's | Paid vendors that need a subscriber's API documentation |

## Five user roles (group R, planned 17 November)

The maintainer asked on 17 November what a policy researcher, a public administrator, a politician,
an economist and a market trader each need, and to fill the gaps. The app was checked first. Two
gaps were already filled and are left out: a small structural model (the gap model you fill in
yourself, done 8 November) and fan charts in general (forecasts and the debt fan already show a
range). Research notebooks and replication packs exist too, so R1 and R2 build on them. Each step
below is one small change, built and tested on its own, in the order the maintainer picks.

| # | For | Change | What it means for you | Source and terms |
| --- | --- | --- | --- | --- |
| R1 | Policy researcher | Working-paper bundle (built 17 November) | Pin a chart or series to a research notebook with its As of day and a fingerprint of the figures, then export the notebook as one zip: your draft in Markdown, the data behind each pinned figure, a citation file and the replication scripts | The app's own figures; nothing new downloaded |
| R2 | Policy researcher | Replication check (built 17 November) | A "Check it still holds" button on each pinned figure, and `npm run notebook:check`: reads the figures again and says Same, Revised (old and new value) or Source no longer answers | The app's own figures |
| R3 | Public administrator | Budget credibility (built 17 November) | How much of the approved budget each government actually spent, year by year, with the PEFA grade bands (A within 5%, B within 10%, C within 15%) | World Bank WDI GF.XPD.BUDG.ZS, built on PEFA indicator PI-1 (SDG 16.6.1); CC BY 4.0, no key |
| R4 | Public administrator | Budget execution tracker (built 17 November) | Load your approved budget and monthly spending by ministry or programme from a template file; see each line's spending against the share of the year gone, lines running behind or ahead, and a straight-line year-end figure labelled as such | Your own file; it stays on your computer |
| R5 | Public administrator | Development projects (built 17 November) | Active World Bank projects in each country: amount committed, amount paid out so far, approval and closing dates, and projects paying out slowly for the time gone | World Bank Projects and Operations API; CC BY 4.0, no key. IATI (all donors) parked: it needs a free key and each publisher sets its own licence |
| R6 | Politician | Regional figures (built 17 November) | Output per person for each region of a country, the gap to the national average and how wide regions are spread; GDP per person and unemployment for EU regions | DOSE regional output dataset (Zenodo, CC BY 4.0, file downloaded by the daily run); Eurostat NUTS 2 regions (Eurostat reuse policy, source named; non-EU figures for non-commercial use). Global Data Lab subnational HDI only from a file you save in data/local/gdl/ (free for non-commercial use, never shipped) |
| R7 | Politician | What this means for people (built 17 November) | A plain one-page summary of a policy review: what changes, cost per household, who gains and who pays, which regions are furthest behind and what peer countries did. Fixed sentences filled with the figures, Missing where a figure is absent; no AI wording, so no new council recording. In all four languages, and it can be added to the one-page brief | The app's own figures (policy review, PK3 winners and losers, R6) |
| R8 | Economist | Ranges from past forecast misses (built 17 November) | A band around the IMF projection sized by how far past IMF projections at the same horizon missed for that country, and an empirical band on the app's own forecasts from their tested out-of-sample misses; fewer than 8 past cases reads Missing | Past IMF WEO editions you save in data/local/weo-vintages/; the app's own forecast evaluation |
| R9 | Market trader | Data surprises (built 17 November) | Each release against an expectation saved before it came out: Brazil's Focus survey, the ECB survey of forecasters, a Kalshi market price where one exists, otherwise the app's own nowcast; each surprise scaled by its own past spread; labelled with where the expectation came from | BCB Focus and ECB SPF (already read); Kalshi (already read). Paid consensus forecasts only behind your own subscription switch |
| R10 | Market trader | Surprise index (built 17 November) | One index per country from recent surprises (older ones count less), a chart and a Today card; a description, not a signal, with its test written and locked before any backtest | Built from R9 |
| R11 | Market trader | Full yield curves (built 17 November) | Every maturity of the US Treasury and euro area government curves each day, a fitted curve (Nelson-Siegel-Svensson), daily moves in level, slope and curvature, and roll-down and carry | US Treasury daily par yield curve (public domain, no key); ECB euro area yield curve (ECB reuse with the source named, no key) |

**What the maintainer runs on the Mac.** After each step, `npm run check:data` for its new row
(R3 wb_budget_credibility, R5 wb_projects, R6 dose and eurostat_regions, R11 ust_curve and
ecb_curve). All of these answered on the Mac on 17 November, after three fixes to the checks (#594
to #596: Zenodo asked to see who is calling, and the ECB curve and survey checks asked for less at a
time). R8 needs the past IMF editions already owed in data/local/weo-vintages/ and then
`npm run forecast:evaluate`. R9 and R10 need some weeks of the daily download to build a log of
expectations saved before each release. R6 can also read the Global Data Lab file, if you choose to
save it.

**Recommended order** (to be confirmed by the maintainer): the public administrator first (R3, R5,
R4), because it serves the lower-income countries the project is for and uses open World Bank data;
then the politician (R6, R7), the researcher (R1, R2), the economist (R8) and the trader (R11, R9,
R10).

## Phase 5: Quests in the classroom (wave 7, building)

The maintainer said go on 28 November; the steps are built and merged one at a time. This phase lets a professor run Quests with a class. It sits behind its own class switch with its own
go-live checklist, so schools can start before Quests opens to everyone. The app never grades; the
professor does.

| # | Change |
| --- | --- |
| Q1 | Teacher, marker and student roles; classes by term with a join code. Built 28 November (Classes tab on Menu > Quests, behind `CLASSES_ENABLED=on`, needs sign-in) |
| Q2 | One-command class setup, a release pinned for the whole term, and a page for school IT staff. Built 28 November (`npm run class:setup`, docs/SCHOOL_IT.md) |
| Q3 | Assignments: dates in local time, an AI rule, private extensions, entries hidden until close, copy last term. Built 28 November (class time zone, AI rule, extensions, calendar file) |
| Q4 | Professor-written class Quests with intro, intermediate and advanced tags. Built 28 November (class Quests in data/local/class-quests/, quests/levels.json, Level filter) |
| Q5 | Replay Quests and four ready-made term packs. Built 28 November (Replays tab, quests/replays/, four- and eight-week Brent Quests in the generator) |
| Q6 | Feedback, optional anonymous peer review, a switch for sensitive topics. Built 28 November (feedback with a mark, peer review on debates, names hidden on sensitive topics) |
| Q7 | Class table settings and a one-page student report |
| Q8 | Gradebook file, voided Quests left out of marks, archived classes deleted after a period the professor sets |
| Q9 | Sealed hand-in files for students working on their own copies |
| Q10 | Accessibility review of the classroom screens (WCAG 2.2 AA, as the rest of the app is checked since 26 November), designed for phone width first |
| Q11 | Load test: 40 students on one modest laptop |
| Q12 | Community links on GitHub (publish an entry, class tags, packs), after the public release |
| Q13 | Teacher guide (English, then Spanish and French) and a Teaching page on the website |

Open groups (clubs and research teams, not only classes) are part of Q12.

Two small follow-ons, added in November 2026:

| # | Change |
| --- | --- |
| QL1 | Spanish, French and Brazilian Portuguese titles and questions for Quests, shown in the chosen language, and the Quests screen in the same languages (widened by the maintainer on 27 November); community translations of Quests open with it. Part 1, the Quest text in `quests/translations/`, merged 27 November (#728); part 2, the whole Quests screen, built 27 November |
| L3a | Settled Quest forecasts served by the researcher data API and its R, Python and Stata helpers, answering only when Quests are switched on. Built 28 November |

After the build comes a one-term pilot with two professors (one in an underserved country), then
outreach to economics departments.

### Before Quests open to everyone

These join the public Quests go-live checklist (docs/QUESTS.md). They need the public repository and
ship only when Quests are switched on for everyone, not with the classroom changes:

- Links to Quests from country pages and from Council chat (built 28 November, shown only while Quests are on).
- Sealed public entries: each entry is locked in with a fingerprint before the deadline and revealed
  after it, so nobody can copy or change a forecast.
- A dashboard for maintainers (built 28 November: the Maintainer tab on Menu > Quests).
- On GitHub: an Ideas category where people vote on suggestions; a contributor, reviewer and steward
  ladder in GOVERNANCE.md; a Discussion thread opened for each Quest, with the result posted when it
  settles; a rule-based check of the figures quoted in revealed debate entries (no AI judging); a
  welcome message for first-time contributors and a "good first Quest" label; badges for taking part,
  not rankings; a "report a data problem" link on every Quest; debate rules and a report link on every
  thread, locked a week after the Quest settles; a monthly round-up; and a first replication
  challenge on a published paper the maintainer picks.

## The public release

The licences, governance files, the security review (second pass on 25 November), light mode and the public export tool are in
place. Before the public copy goes up, three checks remain:

1. A person starts the app on a Windows computer with `start-windows.bat` and confirms it opens.
   The automatic Windows check (start script, type check and tests on a GitHub Windows machine)
   passed on 25 November; it cannot start Docker Desktop, so the person's run is still needed.
2. Light mode is measured on a modest laptop (`scripts/start-mac.sh --light`, then
   `docker stats --no-stream`), so the memory and disk figures in the install guide are measured, not
   targets.
3. The clean public copy is exported again (`npm run public:export`), so it carries everything up to
   the release. The last export was on 25 November (main through #687); it is run once more after
   the last change before the release.

Then: publish it at [github.com/e-conquest/econquest](https://github.com/e-conquest/econquest),
switch on Discussions and private vulnerability reporting there, protect its main branch, make the
ready-made app image public, add the public address to the citation file and website, and open
donations through the project website (GitHub Sponsors and Open Source Collective) once a fiscal host
is in place. The release day and checkpoint 1 (about four weeks later) are written on this page on
the day of the release.

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
| Expert review scores (P4) | What pilot economists and professors score policy review memos: clarity, use of evidence, whether the sources are correct, whether they would act on them | Policy review > Expert review on the computer where they fill it in; `npm run check:success` counts them; published only with consent in docs/validation/expert-reviews.md (`npm run reviews:summary`) |

No targets are set before the release: there is nothing yet to compare against. **Review date:**
checkpoint 1, about four weeks after the public release. The release day and the review day are
written here on the day of the release.

## Parked ideas (looked at in checkpoint 1)

Ideas raised on 13 November 2026 that are not on the build list. Groups A (data for lower-income
countries) and C (policy review tools) were brought forward that day, and group B (markets and
financing data) on 14 November; all three are done and listed under "The build order from here".
Group D waits for checkpoint 1, unless the maintainer brings it forward. A source marked "terms to confirm" would be read only from a file you save in
`data/local/` until its terms are confirmed.

**Group B: markets and financing data**

| # | Idea | Why it matters | Source |
| --- | --- | --- | --- |
| PB1 | Exchange rate regime | Whether the currency floats, is managed or is pegged changes every policy option | Built 14 November (pulled forward): Ilzetzki, Reinhart and Rogoff classification from your file in data/local/irr/ |
| PB2 | Capital controls | How open the capital account is shapes currency and interest rate options | Done (Sam chose 14 November): the Chinn-Ito index, in the country risk scorecard and History & data since 13 November (C13), covers it. The Fernández, Klein, Rebucci, Schindler and Uribe dataset is not used, because no terms of use were found |
| PB3 | Central bank balance sheets | Size and growth of central bank assets show money creation and currency support | Built 14 November (pulled forward): BIS central bank total assets |
| PB4 | Dollar funding stress | Use of Federal Reserve swap lines and the dollar funding gap in a crisis | Built 14 November (pulled forward): New York Fed swap line operations (New York Fed terms of use, attribution) and BIS dollar credit to non-banks |

**Group CG: closing gaps with leading platforms (from the comparison of 23 November)**

Raised in the scored comparison of 23 November 2026 against Bloomberg, Haver, Macrobond, CEIC, the IMF
and World Bank tools, FRED, Oxford Economics, Trading Economics and research software. CG1 to CG3 were
pulled forward the same day; CG4 is parked until the 2027 guidance note; CG5 to CG17 were built
the same day ("close every closeable gap").

| # | Idea | Why it matters | Source |
| --- | --- | --- | --- |
| CG4 | The IMF and World Bank low-income debt framework: the risk rating from the published thresholds, with the stress tests | Lower-income countries are rated on this framework; the app shows published ratings only | The revised framework (approved September 2026) and its guidance note due mid-2027; built on that note, not the 2018 one |
| CG5 | Forecasts written down before the figures exist, scored each month | The only check that rules out hindsight; the forward record is weeks old | The app's own forecasts and the official calendar. Built 23 November: forecasts written before the figures, scored monthly |
| CG6 | One search across every free catalogue | Millions of series instead of the ones each screen uses | DBnomics, IMF, World Bank, Eurostat, national offices; licence shown per provider, unknown terms read only from your file. Built 23 November: Menu > Find data (DBnomics, IMF, World Bank, Eurostat) |
| CG7 | A small open-economy projection model (output gap, inflation, policy rate, exchange rate) | The kind of model many central banks use; tested before any forecast shows | Berg, Karam and Laxton (2006), IMF working paper; the app's Kalman filter. Built 23 November: estimated small open-economy model with a pre-registered test (cpi_gap_model); shown only when it passes |
| CG8 | Bayesian and structural vector autoregressions with impulse responses | Standard tools for how shocks pass through an economy | No new data. Built 23 November: Bayesian (Minnesota prior) and structural (recursive and long-run) VARs in the Chart Agent |
| CG9 | Live prices from your own broker or data account | Live market prices without the app redistributing paid data | Your own account, behind the Settings switch; shown on screen only. Built 23 November: Interactive Brokers through the Client Portal Gateway you run; shown on screen only, never saved |
| CG10 | Team work on a home server: comments, a second approver, read-only links | One user per installation today | No new data. Built 23 November: comments and read-only share links; the second approver was already in place (sign-off) |
| CG11 | Council answers in the chosen language | The council writes in English today | A prompt change; needs a new council recording on the Mac. Built 23 November: Spanish, French and Portuguese; English prompts unchanged, so the recorded council replay still applies |
| CG12 | Native speakers check the Spanish, French and Portuguese | No translation has been checked by a native speaker | Volunteers. Built 23 November: docs/TRANSLATION_REVIEW.md and an issue form; waits on volunteers |
| CG13 | Inflation targets and decision dates for 12 more lower-income countries | Missing today for Nigeria, Ethiopia, Uganda, Pakistan, Bangladesh and others | Each central bank's own page, read from the Mac. Built 23 November: targets for Philippines, Egypt, Uganda and Pakistan; decision dates for Pakistan, the Philippines and Nigeria; others named as without a target |
| CG14 | Teaching: macro lab, offline country report, more worked examples | Same as group D below | Group D. Built 23 November: offline country report, macro lab and a commodity worked example |
| CG15 | Real-time figures beyond the United States and the euro area | Tests on data as first published for more countries | OECD original-release data (OECD terms now confirmed). Built 23 November: OECD revisions dataset, all 38 members (`npm run oecd:vintages`) |
| CG16 | A small global VAR for how shocks spread between economies | Spillover questions; an Oxford-scale model is out of reach | Published data and methods. Built 23 November: 16 main economies plus the country, IMF trade weights, generalised impulse responses with bootstrap bands |
| CG17 | A feed of official documents (IMF country reports, central bank statements and minutes) | Curated reading beside the figures | Each publisher's own terms. Built 23 November: World Bank documents and BIS central bankers' speeches (IMF pages give no usable feed) |
**Group D: teaching and sharing**

| # | Idea | Why it matters | Source |
| --- | --- | --- | --- |
| PD1 | Offline country report | One HTML file of a country page that opens without the app, for journalists, students and slow connections | Figures already saved, each with source and date |
| PD2 | Macro lab | Small textbook models (aggregate demand and supply, the debt equation) with sliders and plain explanations | No data |
| PD3 | More worked examples | Two or three more walk-throughs, for example a commodity shock, a currency crisis or an IMF programme | Saved histories |

## Paused: the phone app

A free standalone phone app that uses your own keys, for Android (Google Play, F-Droid and a direct
download) and iPhone. Two of its 21 changes are done (one more is open and paused); the rest wait
until the public release is live and the maintainer restarts the work. The first stage (separating the app's engine from the server)
also tidies how the main app stores data and calls feeds.

## Built, waiting on a check or a licence

These parts are built but wait on something outside the code. Until then they read Missing or Not
validated, with the reason.

| Part | Waiting on |
| --- | --- |
| Scenario replays (C9) | A first run of `npm run replays:pull` on a computer that reaches FRED and BCRP, then `npm run check:data` (row fed_h10), and a read of the copyright line on FRED's exchange rate pages |
| Dollar funding (PB4) | `npm run check:data` (rows bis_usd_credit, nyfed_swaps) on the Mac |
| Weather (W1) | `npm run check:data` (row nasa_power) and open History & data for one country on the Mac |
| Weather (W2) | `npm run check:data` (row wb_cckp) on the Mac |
| Tropical cyclones (I8) | A first press of *Download storm tracks from NOAA* on a computer that reaches NOAA, then `npm run check:data` (row ibtracs); the file layout is tested only on made-up rows so far |
| Disaster loss model (I1, I2) | The EM-DAT file saved in `data/local/emdat/` on the Mac; the model is tested only on made-up events so far |
| Central bank assets (PB3) | `npm run check:data` (row bis_cb_assets) on the Mac; the BIS layout was read from a live answer, but the app's request has not run from the cloud |
| Exchange rate regime (PB1) | The IRR monthly workbook saved in `data/local/irr/`, then `npm run check:data` (row irr_file); the file layout is tested only on made-up rows so far |
| Capital account openness (C13) | A first run of `npm run chinn-ito:pull`, then `npm run check:data` (row chinn_ito); the file layout is tested only on made-up rows so far |
| Crisis early-warning test (G23) | The licence for the Laeven-Valencia crisis dates (asked of the IMF) |
| Official forecasts side by side (CG2) | `npm run check:data` (rows wb_gep, oecd_eo) on the Mac; the Philadelphia Fed survey only from medianLevel.xlsx saved in `data/local/philly-spf/` |
| OECD real-time editions (CG15) | `npm run oecd:vintages`, then `npm run check:data` (row oecd_rtd) and `npm run forecast:evaluate` for the two OECD real-time tests |
| Find data (CG6) | `npm run check:data` (row catalogues) on the Mac |
| Your broker prices (CG9) | A first live check by someone running the IBKR Client Portal Gateway; tested against saved replies only so far (row broker_prices) |
| New version notice | Shows "No public release yet" until e-conquest/econquest exists and has a release |
| Data surprises and the surprise index (R9, R10) | Some weeks of the daily download, to build a log of expectations saved before each release; the index's registered test runs once 60 month ends qualify, which will take years |
| Ranges from past IMF misses (R8) | The past IMF editions saved in `data/local/weo-vintages/`, then `npm run forecast:evaluate` for the app's own forecast ranges |
| Quant desk (outside research tools) | A first live check against the maintainer's own research-tools server on the Mac; so far tested against a stand-in server only |
| Revenue by state (G42 step 2) | The coverage count from `npm run check:data` (row imf_gov_levels) |
| Haver and Moody's (G14, G15) | A subscriber's API documentation |
| Several new World Bank, Eurostat, ONS and BCB series | A daily download on a computer that reaches the feeds; they could not be checked from the build machine |
| What happened after (SC3) | `npm run synth:validate` (or `npm run mac:validate`) on the Mac with the saved yearly histories; Not validated until then |
| What this means for you (PY1) | `npm run check:data` (row eurostat_hicp_groups) and `npm run check:imf` (CPI groups) on the Mac; the IMF groups stay off until `IMF_CPI_GROUPS=on` is set |

## Noted, not yet scheduled

- Giving the council the defence and spending-by-purpose figures directly in its instructions.
- Budget elasticities for Brazil, India, China and other countries outside the OECD.
- Council-drafted what-if questions.
- Wider statistics tools (more than two variables, panels).
- Bilateral and current tariff rates (WITS, WTO).
- A dated data snapshot with a DOI, to be decided at the public release.
- A review of the Spanish, French and Portuguese translations by native speakers (the process and checklist are in docs/TRANSLATION_REVIEW.md; it waits on volunteers).
