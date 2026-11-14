# EconQuest Terminal: Methodology

**Version 1.2, 13 November 2026** (changes since version 1.0 are listed at the end). Describes the software as of release 0.1.0.
Licensed under [CC BY 4.0](../LICENSE-docs.md). Research, not validated advice.

This document sets out how the EconQuest Terminal sources its data, how its council of agents
answers questions, how its models and signals are tested and labelled, and what it does not do. It
is written for the people the terminal serves (sovereign and credit analysts, central bank, finance
ministry and international-institution economists, macro and FX investors, country-risk teams,
teachers, students and journalists) and for anyone who wants to check or reproduce its results.

Every statement here is meant to be checkable against the open code. Where a claim depends on a
file, the file is named. The per-model detail (rule, inputs, limits, pre-registered tests and
recorded verdicts for each of some 60 entries) is in the companion [Methods note](./METHODS.md),
generated from the code; this document explains the framework those entries sit in.

---

## The short version, in plain words

EconQuest is a free research tool. It gathers public figures about countries (growth, prices,
interest rates, government debt, trade, politics and conflict), helps people understand them, and
tests whether simple rules built on them say anything useful about what comes next.

- **Every number has a source.** Each figure on screen names where it came from and when. If no real
  source provided it, the app shows "Missing" and says why. It never fills a gap with a guess, a
  sample number or an estimate from an AI model.
- **The AI explains; it does not invent figures.** The council's agents, each covering one area (the
  central bank, the budget, politics and so on), are fixed code that read the figures and state what
  they show. An AI model only writes the short summary on top, and may quote only the agents'
  figures. The app checks that every number in the summary appears in those figures, and labels it
  as written by an AI model. It is an interpretation, not advice.
- **Rules are tested before they are trusted.** A signal is a rule that claims to say something
  about the future, for example that currencies paying high interest tend to earn more than they
  lose. Before a rule is tested, its details and pass mark are written down and locked with a digital
  fingerprint, so any change made after seeing the result would show. The test uses only figures
  that had been published at the time, counts trading costs, and the rule must beat the simplest
  possible guess.
- **Luck is counted.** When many rules are tested, some pass by chance. The app applies a standard
  correction (the Holm method) across every test on record and says which passes survive it.
- **Failures are kept.** Most rules tested so far failed. Their results stay on the record,
  unchanged, beside the few that passed, in the [Track record](./TRACK_RECORD.md).
- **Labels say how much weight a reading can bear:** Validated, Provisional, Under review,
  Withdrawn and Review due (section 9).
- **What it does not do.** It does not give investment advice, does not promise any forecast, and
  does not replace assessments by the IMF, the World Bank or credit rating agencies.

Every technical term used here and in the app is explained in the [Glossary](./GLOSSARY.md). A longer
companion guide, [How EconQuest works, in plain words](./HOW_IT_WORKS.md), explains the same framework
without jargon, with one result read step by step. This document is the exact technical statement;
where the two seem to differ, this one governs.

---

## Contents

- [Why EconQuest exists](#why-econquest-exists)
1. [What the terminal is](#1-what-the-terminal-is)
2. [Principles](#2-principles)
3. [Data](#3-data)
4. [The council of agents](#4-the-council-of-agents)
5. [The model and signal register](#5-the-model-and-signal-register)
6. [The signal standard](#6-the-signal-standard)
7. [Testing methods](#7-testing-methods)
8. [Multiple testing](#8-multiple-testing)
9. [Evidence grades](#9-evidence-grades)
10. [The forward record](#10-the-forward-record)
11. [Results on record](#11-results-on-record)
12. [Quests (built, switched off)](#12-quests-built-switched-off)
13. [Reproducibility](#13-reproducibility)
14. [Limitations and what stays Missing](#14-limitations-and-what-stays-missing)
15. [Changing the methodology](#15-changing-the-methodology)
16. [References](#16-references)
- [Version history](#version-history)

---

## Why EconQuest exists

> *"In 2026 we feel and see the economic effects of poor economic policies. I wanted to see if I could
> make a tool that could assist people in learning and understanding economics, finding multiple and
> optimal financial and policy options, and attempting to bring the best tools to the most
> underserved countries."*

In the maintainer's words.

Sovereign and macroeconomic risk analysis is concentrated in expensive, closed systems. Commercial
terminals and rating data are priced for large institutions, which leaves students, teachers,
journalists, smaller institutions and many analysts in the countries being assessed without
comparable tools. Many tools fill data gaps with estimates without saying so, and the forward claims
behind their signals are seldom tested in public: models that stop working tend to be retired
without a report. Large language models add a further risk, fluent commentary with plausible but
untraceable figures.

The terminal was built to show that the work can be done on free public data under stricter rules
than are common in the industry: every figure traceable to its source, gaps shown as gaps, every
forward claim tested against a specification fixed before the run, every verdict published and never
edited, and AI confined to explaining figures it is given, with automatic checks on what it writes.
Its aims are to help people learn and understand economics, to set out several costed financial and
policy options rather than a single answer, and to bring research-grade tools to the economies least
served by commercial ones. It
began as a geopolitical-risk desk built around a geopolitical risk VaR measure (section 5.1) and grew
into a terminal for sovereign and macroeconomic risk. It is a non-commercial, open-source research
project; its methods and results cannot be bought or changed for money (see `GOVERNANCE.md`).

## 1. What the terminal is

The EconQuest Terminal is an open-source research application for emerging-market sovereign and
macroeconomic risk. It runs on the user's own computer (or a server they control). It:

- pulls free public data from official and open sources, country by country, and shows each figure
  with its source and the period it describes;
- lets the user ask a council of desk agents about a watchlist, with every agent answering only from
  those figures, and an automatic check that removes any summary sentence whose numbers cannot be
  traced back to them;
- runs a register of models and signals, each with a stated rule, its inputs and limits, and a
  status earned only through tests that were fixed and hashed before they ran.

It is a research and teaching tool. It does not place trades, size positions, issue ratings or give
investment advice, and nothing it shows has been independently validated by a third party. Every
export carries the notice "Research, not validated advice" (`src/utils/disclaimer.ts`).

### 1.1 Where it runs

There is no EconQuest website to sign up to and no hosted copy run by the project. Each person runs
the terminal themselves: on their own computer through Docker Desktop (a ready-made app image is
built from the public repository for Apple Silicon and ordinary Intel or AMD computers), from the
code with Node.js, or on a server they control. The terminal fetches figures straight from the public
sources; it only reaches out, and nothing has to be opened to the internet. Setup is explained step
by step for non-technical readers in [INSTALL.md](./INSTALL.md).

This is a deliberate choice, for three reasons:

- **Source terms.** Several free sources allow personal or research use but not redistribution to
  others (section 3.7). When each person fetches their own figures, no one redistributes them.
- **Keys and saved work stay with the user.** Keys for sources such as FRED, saved research, uploaded
  documents and the audit log live on the user's computer. A shared copy would have to hold everyone's
  keys in one place.
- **The AI model is the user's choice.** The council's AI model can run on the user's own computer
  through Ollama, so questions never leave it, or through a service the user picks with their own key.
  A shared copy would need one paid model for everyone.

The consequence for this document: every verdict in section 11 came from a run on the maintainer's
computer, and anyone can rerun the same tests on theirs (section 13).

## 2. Principles

Seven rules govern everything below. They are enforced in code and in tests, not only stated.

1. **Only real figures.** A number appears only when a live feed, an official series or the user's
   own file supplied it. There are no built-in, sample, placeholder or AI-estimated figures.
2. **Missing, with a reason.** Where no source answered, the figure reads **Missing** with the reason
   ("Needs setup", "Feed did not answer", "No source yet"). A gap is never filled by interpolation,
   a default or a model's guess.
3. **Source and date on every figure.** Each value carries the source that supplied it and the
   period it describes, through to exports, briefs and the audit log.
4. **Free and open by default; paid data only from the user's own account.** The terminal works on
   free sources. Licensed data can be used only through the user's own account or file, behind a
   switch that is off by default.
5. **Tested before it is trusted.** A rule that turns figures into a call carries a status. A "passed"
   label comes only from a test whose rule, sample and pass mark were written down and hashed before
   the run. A failed rule is shown as failed and never tuned until it passes.
6. **Accurate labels.** Each output says what it is: live figure, official series, the user's document,
   a model reading, a description that makes no forward claim, or an AI-written answer.
7. **Open and reproducible.** The code, the test specifications, their hashes and the recorded
   verdicts are public. Anyone can rerun the tests.

## 3. Data

### 3.1 Sources

The terminal reads only sources that are free to access. They fall into four groups. The full list,
what each fills, its address, how long it is cached and how to set it up is in
[DATA_SOURCES.md](./DATA_SOURCES.md); what each source's terms allow is in
[DATA_LICENCES.md](./DATA_LICENCES.md).

| Group | Examples |
| --- | --- |
| Free feeds, no key | World Bank (indicators, governance, debt statistics, Pink Sheet commodity prices, remittances and remittance prices, Global Findex, aid received as republished from the OECD DAC, food security), IMF (World Economic Outlook, reserves and balance of payments, COFER), BIS (policy rates, real exchange rates, debt securities, credit gap), OECD (via DBnomics), ECB reference rates, Eurostat, CFTC Commitments of Traders, US Treasury, New York Fed, UN Comtrade, WITS, national central banks (for example BCB, BCRP), GDELT, Polymarket and Kalshi odds |
| Free with the user's own key | FRED and ALFRED (St. Louis Fed), US EIA |
| Free files the user downloads | IMF WEO past editions, Caldara-Iacoviello Geopolitical Risk index, Chinn-Ito capital account openness index, OFAC and UN sanctions lists, UCDP conflict data (one release ships with the code under CC BY 4.0), ACLED aggregated files. Read from `data/local/` and never shipped, because their terms are unconfirmed or forbid passing them on: FAOSTAT Consumer Price Indices, EM-DAT disasters (each user's own account), IMF Fiscal Rules Dataset, Database of Political Institutions 2020, IMF investor base workbook, central bank statements the user saves. The full table is in [INSTALL.md](./INSTALL.md#files-you-save-yourself) |
| The user's own paid data (off by default) | Their own CDS file or their own LSEG account |

Prediction-market odds (Polymarket, Kalshi) are shown as market prices, labelled as such, and are
never treated as official statistics.

### 3.2 Provenance and labels

Every figure the agents and screens use carries one of four tags: **Live data** (a feed answered),
**Official** (a published official series), **Your document** (a file the user supplied) or a
**model reading** (the output of a rule in the register, applied to tagged inputs). A figure without
one of these never reaches the council: its finding is dropped and the gap is stated
(`src/utils/askCouncil.ts`).

The daily download runs in the background at most once every 20 hours and refreshes each feed whose saved copy is older than that feed's own interval ([DATA_SOURCES.md](./DATA_SOURCES.md)); each country's snapshot is refreshed weekly, and pages read the saved copy. If a source fails during a pull, the last good figure from
that same source is kept, with "kept from the *date* pull" on its label, and the pull is retried
within the hour. A built-in value is never kept in its place.

Every pull is archived by day (`data/archive/`), so the terminal can show what it held on any past
date (**As of a past day**), and a nightly source check records which sources answered, which need
setup and which failed, with failure streaks (`data/local/data-health/`).

### 3.3 Missing rather than estimated

The rule is applied without exception. Examples of what reads Missing today, and why:

- **Sovereign CDS** has no free source. It is hidden from screens and prompts
  (`src/utils/cdsHidden.ts`); the USD bond spread over Treasuries (J.P. Morgan EMBI Global as
  published by BCRP) stands in, and is labelled "a bond spread, not CDS".
- **Credit ratings, PMIs, government bond auction results outside the United States and consensus
  forecasts** have no free source that the terminal can use, so they read Missing. (US Treasury
  auction results come from the Treasury's Fiscal Data API.)
- **Egypt's policy rate** is not in the BIS dataset, so it reads Missing.

Where an AI model writes the council's final report and leaves a field empty, the field reads
Missing; template text is never shown as a result (`src/utils/councilResult.ts`).

### 3.4 No AI-generated figures

No figure in the terminal comes from an AI model or from an AI web search. Models write prose from
figures the terminal already holds; they do not supply numbers. The full council can optionally run
a web search (when the user has a Gemini key and has not switched search off): it returns links
only, labelled "link not checked", and no figure from those pages enters the analysis.

### 3.5 Paid data behind the user's own account

Licensed data (CDS today; Bloomberg, fund-flow and consensus feeds are planned) is read only from the
user's own file or own account, set under Settings and off by default. Keys are stored on the user's
computer only, sent only to their own source, masked on screen, and kept out of the audit log,
backups and source checks. No licensed data is redistributed with the software.

### 3.6 Real-time data and release lags

A test that uses data nobody had at the time overstates what a rule could have done. The terminal
reduces this in three ways:

- **Release lags.** Every pre-registered test states how long after the period each input could be
  used (for example, monthly inflation lagged two months; an annual output gap usable only from April
  of the following year). These lags are part of the hashed specification.
- **Real-time vintages where they exist.** IMF World Economic Outlook figures can be read edition by
  edition from the IMF's published past databases (`src/utils/weoVintages.ts`), each edition counted
  as published at the end of its month so a backtest never sees it early. US GDP, CPI and
  unemployment can be read as first published, or as known on any date, from ALFRED
  (`src/utils/alfredVintages.ts`).
- **The pull archive.** The track-record log scores the policy-rule signal only from what the
  terminal held on each saved pull day (`src/utils/trackRecord.ts`).

Where a test still uses today's revised data, its specification says so in its stated limits.

### 3.7 Licences and credit

A licence register (`src/data/dataLicences.ts`, generated into [DATA_LICENCES.md](./DATA_LICENCES.md))
classifies every source: open with attribution, allowed with conditions, permission needed for client
or commercial use, or terms not confirmed. Every figures download carries a licence column, and every
reference list in a brief ends each source with its licence class. A figure worked out from several
sources takes the strictest class among them.

### 3.8 Figures served to outside systems

Another program, such as a portfolio console, can read the terminal's figures over HTTP with a named
API token limited to the scopes the user ticks ([DATA_API.md](./DATA_API.md)). The same rules hold
there as on screen:

- **Same figures, same labels.** A country snapshot returns only saved figures, each with its source,
  date, model register badge and whether its licence allows passing it on; a figure with no source is
  Missing with the reason. In sharing mode, figures whose terms do not allow passing them on (for
  example the Chinn-Ito index, whose authors give no licence) are withheld, as in downloads.
- **Stable names.** Countries are named by both ISO 3166 codes; positions by ISIN, LEI, CIK or ticker
  plus the caller's own entity ID, returned unchanged, so the two systems can match records without
  guessing.
- **Hidden names.** Countries and securities on the user's hidden-names list are removed before
  anything is shown, replied or sent, and only a count is reported. The list is stored as keyed
  fingerprints, so the file does not reveal the names.
- **Scenario estimates are hypothetical.** A shock (emerging-market currencies against the US dollar,
  US rates, per-country currency, spread and yield moves) or a replay of a past episode (1997, 1998,
  2001, 2008, 2013, 2020, 2022) is applied to a portfolio sent in the request. The estimate is first
  order: duration times the yield or spread move, and notional times the currency move.
  Carry, convexity, roll-down and the path inside the window are left out, so it is neither a
  forecast nor a valuation (`src/utils/scenarioReplay.ts`). A replay's move is the change between the
  monthly averages of the last calm month and the stress month, from OECD 10-year yields and Federal
  Reserve H.10 exchange rates (FRED, from 1990) and J.P. Morgan EMBI Global spreads (BCRP, from 2016),
  so it is smaller than the worst day inside the window. A move with no source (for example spreads
  before 2016, or CDS) is Missing with the reason, and that position's total is left blank rather
  than filled with a proxy.
- **Events, not judgements.** Events report what changed (a badge, a revision, a stale feed, a
  threshold crossed); indicator watches are set by the caller, and none is built in.

## 4. The council of agents

### 4.1 Council chat

A user asks a question about their watchlist. Desk agents that cover the question answer it: Central
Bank, Fiscal & Debt, Politics & Events, Relative Value, FX, Global Spillover, Calendar, Timing,
Nowcast & Forecast, and a Document agent for policy files the user uploads. The AI model chooses
which agents to ask when one is set up; otherwise stated keyword rules do. Either way the reason each
agent was asked is shown.

The **agents themselves are deterministic code**, not language models. Each reads the tagged figures
and the register's rules and returns findings, each with its source and tag. A summary agent, which
is a language model (a local model through Ollama, Google Gemini, or any OpenAI-compatible server the
user chooses), then writes a short brief from the agents' findings alone. Every AI-written answer is
labelled as such in the terminal, with the model that wrote it.

### 4.2 The referee model

Steps that judge or sum up (the council summary, the agent debate, the full council's final report
and the ranking of policy options) run on the larger "referee" model the user sets. A referee of
8 billion parameters or fewer is flagged in Settings and under every answer it writes, so a small
model never referees unnoticed (`src/utils/refereeModel.ts`).

### 4.3 The automatic traceability check

Two checks run on every summary before it is shown:

- **Number check.** Each sentence of the summary is scanned for numbers. A number traces back when
  one of the agents' figures, rounded to the digits written, gives it. Labels that contain digits but
  are not figures (tenors such as 10Y, quarters, years, agent names) are excluded first. Any sentence
  with a number that does not trace back is removed, and the removed sentences are listed under the
  answer.
- **Stance check.** Some agents state their call in fixed words: policy tight, neutral or loose
  against a rule; the real exchange rate strong, near average or weak against its own history. A
  summary sentence that describes the same thing for the same country in an opposing word is removed
  and shown beside the agent's call (`src/utils/stanceCheck.ts`).

The number check catches invented figures; the stance check catches wrong words about real ones. Neither
checks wording or emphasis, which remain the model's. The same number check is applied to the full
council's free text (`src/utils/runFigureCheck.ts`).

### 4.4 The full council

For a deeper view of one country, the full council runs nine agents in three desks (Geopolitical
Risk, Sovereign Credit, Macroeconomic). Each desk debates in proposer and challenger rounds, a
cross-desk cascade carries findings between desks, and the run **stops for the user's approval** of
the risk assumptions before the final report is written. If no desk model answers, the run stops
with an error rather than showing template output. Every number in the debates and the report goes
through the number check.

### 4.5 Audit log

Every council answer (the question, the AI model, each figure with source and period, and what was
missing), and every save, delete, download, settings change, backtest and sign-off, is written to a
local audit log. Each line is chained to the one before by SHA-256, and the chain is checked when the
log is opened (`src/utils/auditLog.ts`). This detects a changed or removed line; it cannot stop
someone who rewrites the whole chain, which the risk and compliance note states
([RISK_AND_COMPLIANCE.md](./RISK_AND_COMPLIANCE.md)). Two optional settings close that gap. With a
seal key held outside the data folder, every entry also carries an HMAC-SHA256 of its hash, which a
rewritten chain cannot reproduce without the key; and each entry can be copied, in order, to an
S3-compatible bucket with object lock, where it cannot be changed or deleted before its retention
date ([SECURITY.md](./SECURITY.md), "Audit seal and locked copies"). A call from another program may
carry a correlation ID, which is written into the entries it causes, so a decision in that program can
be traced to the figures it read.

### 4.6 Regression testing of the council

A fixed set of council questions with frozen inputs, and the reading a good answer must give, is run
on the referee model at temperature 0 with a fixed seed. The model's replies are recorded, and the
automated test suite replays them through the real server. The build fails if a prompt changed
without a new recording, if the checked answers differ from the baseline, if a case that passed now
fails, or if any answer contains a number that no input gave. Cases that failed when recorded are
listed as known failures, not edited to pass
([council-regression/README.md](./validation/council-regression/README.md)).

### 4.7 Explanations and help levels

Plain-language help is shown at one of three levels, set with the help button at the top of the page
and kept in the user's browser. **Key help**, the default, puts a guide on every chart (how to read
it, and what it means in real life), a short introduction on each panel, a "What it means" line under
each brief observation, and *What is this?* on the main figures. **Full help** adds *What is this?* on
every figure and term. **Help off** shows figures, sources and observations only.

These guides, introductions, "What it means" lines and glossary entries are fixed text, written in
advance and stored in the code (for example `src/data/chartGuides.ts` and the [Glossary](./GLOSSARY.md)).
They describe standard economics in general terms, contain no figures of their own and are not written
by an AI model at the time of reading. The one exception is **Explain** on a figure, which asks the
council what the figure means for that country: that answer is written by the AI model, labelled as
such, and goes through the same number check as any council answer (section 4.3).

## 5. The model and signal register

Every rule that turns figures into a reading is listed in the register (`src/data/modelRegister.ts`,
shown under Menu > Models & validation and as a badge beside each panel). Each entry states what it
says, its rule, what it reads, where it shows, its intended use (decision input or research), how it
is tested, its limits and its code.

Each entry carries one status:

| Status | Meaning |
| --- | --- |
| Backtest / forecast evaluation / signal test **passed** | Met a pass mark fixed and hashed before the run |
| **Failed** | Did not meet it. Shown as failed; never tuned afterwards |
| **Too few cases** | The registered minimum sample was not reached; no verdict |
| **Not validated** | Makes a forward claim, or has a forward test registered, that has not yet been run or passed (for example, the country risk scorecard, whose test that weak governance comes before a sovereign default was fixed and hashed on 13 November 2026, before any run) |
| **Description, not a tested signal** | Shows published figures or past co-movement and makes no forward call (for example, gross financing need, geopolitical risk VaR, sanctions list counts) |
| **Model-assisted, not validated** | AI-written output with automatic checks (the council summary); not testable as a rule |
| **Stated method, no call to test** | A calculation or teaching tool with a published method and no forward claim |

### 5.1 Geopolitical risk VaR

The project began from the question of how much a country's markets can lose in periods of high
geopolitical tension. The *Geopolitical risk VaR* panel (Country Research > History & data > Global
shock scenarios; `src/utils/grVar.ts`) answers it for the currency, from public data only.

- **Stress months.** Months in which the Caldara and Iacoviello (2022) Geopolitical Risk index (world,
  and the country index where the file has one) is at or above its 90th percentile, computed over the
  months that also have the currency. At least 100 overlapping months and 20 stress months are
  required; otherwise the panel reads Missing.
- **VaR and expected shortfall.** The 95th percentile of the monthly currency change against the US
  dollar (100 × log change of units per dollar, month-end ECB rates; positive means weaker), and the
  mean change at or beyond it, each computed in stress months and in all months.
- **Global channels.** The mean US policy rate and dollar moves of the stress months are put through
  the country's fitted scenario model (Global shock scenarios), with a 90% band from Newey-West
  coefficient standard errors.
- **Status.** Description, not a tested signal: it measures past co-movement with a news-based index
  and makes no forward call.
- **Limits.** The index is persistent, so stress months are fewer independent episodes than their
  count, and a 95% tail read from 20 to 40 months is imprecise. Currency only; no bond or equity
  prices. The index counts newspaper coverage, a proxy for risk rather than risk itself.

A plain-language account, with a worked reading, is in [How EconQuest works](./HOW_IT_WORKS.md#10-geopolitical-risk-var-explained).

## 6. The signal standard

Every signal that makes a forward claim is held to the same standard. It applies to new signals and
was applied retroactively to existing predictive tools.

1. **Published ideas only.** Each signal comes from published or academic work (for example the
   Taylor rule, currency carry, value and momentum). No rule is found by searching the data.
2. **Pre-registration with a hash.** Before any run, the specification is written down: hypothesis,
   rule, universe, sample dates, release lags, rebalancing, cost, benchmark, pass mark and known
   limits. Its SHA-256 hash goes into a manifest (`docs/validation/*/manifest.json`). The runner
   refuses a specification whose hash no longer matches until it is registered again.
3. **Pseudo real time.** Inputs respect publication lags, stated in the specification (section 3.6).
4. **Net results against a naive benchmark.** Trading signals pass on returns net of a flat,
   conservative cost (no free bid-ask), against doing nothing. Forecasts must beat a naive benchmark
   (the last value carried forward, or the historical mean). Event signals must beat the base rate of
   the same outcome in the same sample.
5. **Block bootstrap and multiple-testing correction.** Cases close in time are resampled together,
   and each verdict is shown with a Holm-adjusted p-value across every test on record, beside the
   number of tests (section 8).
6. **Failed means failed.** A failed signal is shown failed and never tuned. A new version is allowed
   only to fix a stated data or design flaw; it is registered as a labelled re-test, says what changed
   and why, and counts as one more test in the correction.
7. **Forward record.** Once a test passes, every later call is written down before its outcome is
   known and scored when its window closes (section 10).

## 7. Testing methods

All tests are run by the open code (`npm run backtest`, `npm run forecast:evaluate`,
`npm run signals:evaluate`; all three by `npm run mac:validate`). Resampling uses fixed seeds, so the
same data give the same verdict on any computer.

### 7.1 Event backtests (hit rate against base rate)

The question is whether the signal was followed by what it points to more often than that outcome
happened after any period in the same sample. For example: does a "tight" reading against a Taylor
rule come before a rate cut within six months more often than a cut follows any month?

- **Method 1** counts each case as independent and applies a one-sided binomial test.
- **Method 2**, the stricter check, recognises that cases cluster in time (policy moves come in global
  cycles; positioning in several currencies moves in the same weeks). It resamples whole calendar
  years of cases together 4,000 times, reports a 90% range for the lift and a p-value, and requires
  the lift to be positive in at least half of the series with five or more cases. With 4,000 redraws,
  the smallest p-value it can report is 0.00025.

A test passes only with at least the registered number of cases (and years, for method 2), a lift of
at least the registered number of points over the base rate, and a p-value at or below the registered
level. Below the minimum sample, the verdict is "too few cases", not a pass or a fail
(`src/utils/backtest.ts`).

### 7.2 Signal tests (portfolio returns net of costs)

Currency factor signals (carry, value, momentum) are tested as monthly long-short portfolios against
the US dollar: the third of currencies with the highest score held long and the lowest third short,
equal weights, rebalanced monthly. Returns are net of a flat 0.25% cost per unit of weight traded.
The test asks whether the mean net return is above zero (the return of holding dollars), with whole
years resampled together, over at least 120 months and 10 years. The universe is fixed before the
run and excludes pegged and tightly managed currencies. Gross and net returns, the 90% range and the
Sharpe ratio are all reported. These are hypothetical results and are labelled so.

### 7.3 Forecast evaluation (rolling origin)

Nowcasts and forecasts are evaluated out of sample with a rolling origin: at each origin the model is
fitted only on what came before, forecasts each registered horizon, and is scored against the value
that later came out. The benchmark is fitted the same way. The score is the relative root mean square
error (model RMSE divided by benchmark RMSE, all series pooled), where below 1 means the model beat
the benchmark. As in method 2, whole calendar years are resampled to give a 90% range and a one-sided
p-value, and the model must also beat the benchmark in a registered share of series. The
Diebold-Mariano test with the Harvey-Leybourne-Newbold small-sample correction is reported per series
for reference, and the coverage of the 70% and 90% bands is reported beside the verdict
(`src/utils/forecastEval.ts`). A forecast that fails is not drawn by default in the terminal.

### 7.4 Conventions in the charts and tables

These settings apply wherever the terminal computes a statistic (`src/utils/stats.ts`), and the
replication packs use the same ones.

- **Unit-root test (ADF).** The lag is chosen by AIC, with every candidate lag fitted on one common
  sample; the test statistic is then refitted at the chosen lag on every usable row, as statsmodels
  `adfuller` does.
- **Year-on-year change of a daily series.** Each point is compared with the last observation on or
  before the same date a year earlier, at most 7 days older; 29 February compares with 28 February.
  With no observation in that window the change is left out.
- **Hodrick-Prescott smoothing.** The trend on a chart uses a smoothing parameter that follows the
  Ravn-Uhlig rule: 6.25 for annual, 1,600 for quarterly, 129,600 for monthly, 6.25 × 52⁴ for weekly
  and 6.25 × 252⁴ for daily data. The output gap panels set their own (100 and 6.25 on yearly GDP,
  [METHODS.md](./METHODS.md)).
- **US dollar amounts.** World Bank dollar series (reserves, external debt, debt service, exports,
  balance of payments flows, trade totals) are kept in billions to six decimals, the nearest $1,000,
  so small economies do not round to zero. Ratios built from them use the unrounded inputs and round
  only the result.
- **Watch triggers.** A policy review trigger is read only when its number is unambiguous: "2,5" and
  "0,750" read as 2.5 and 0.75, but a thousands separator such as "above 1,500" reads as "cannot read"
  rather than being guessed.

## 8. Multiple testing

The more rules are tried, the more likely one passes by chance. Each verdict is therefore shown with
a Holm (1979) adjusted p-value, computed across **every version of every test that has been run**:
backtests, forecast evaluations and signal tests, failed ones and earlier versions included (a rule
tried twice is two tests). Holm's step-down procedure controls the family-wise error rate without
assumptions about how the tests depend on each other. A verdict "holds after correction" when its
adjusted p-value is at or below that test's own registered pass mark. The correction never changes a
recorded verdict; it determines the evidence grade (`src/utils/multipleTesting.ts`). The public
track record (docs/TRACK_RECORD.md) also counts the tests people enter to Signal Quests
(docs/QUESTS.md), so every outside test tried raises the bar for the app's own passes too.

## 9. Evidence grades

A recorded verdict is never changed. A test that passed also carries an **evidence grade**, shown as
a badge beside the panel and under Menu > Models & validation (`src/utils/evidenceGrade.ts`):

| Grade | Colour | Rule |
| --- | --- | --- |
| **Validated** | Green | Passed its pre-registered test and still holds after the Holm correction across every test on record; or, failing that, at least 24 months of forward record with at least 12 scored calls beat the test's own base rate (one-sided binomial p ≤ 0.05) |
| **Provisional pass** | Amber | Passed on its own but not after the correction |
| **Under review** | Amber | 12 or more forward calls scored, and the forward hit rate is below the base rate |
| **Withdrawn** | Red | The forward hit rate is significantly below the base rate (one-sided p ≤ 0.05). Stays withdrawn until a new pre-registered version passes |
| **Review due** | Amber | The test last ran more than 12 months ago |

"Validated" here is a research label with a defined meaning: a pre-registered test survived a
multiple-testing correction, or a forward record confirmed it. It is not independent model
validation in the regulatory sense, and it is not investment advice.

**What "pre-registered" means here.** Each test's rule, data, pass mark and costs were written down
and hashed before it was run, so the rule cannot have changed after the result was seen. The tests
on record so far were written down on the day they ran or the day before, on data that was already
public. For those the hash does not show that the rule was fixed before anyone looked at the data,
so read them as specified and hashed before the run. Only a test written down before its data exist
(the forward record, below) rules out both. docs/TRACK_RECORD.md gives the registration and run
dates of every test.

### 9.1 Industry grounding

The grades follow practices used by model-validation and quantitative research teams:

| Practice | Source | Where it appears here |
| --- | --- | --- |
| Pre-registration; no re-tuning after a fail | Standard research practice against data mining | Signal standard rules 2 and 6 |
| A single-test p of 0.05 is too lax once many rules have been tried | Harvey, Liu and Zhu (2016) | Holm correction; Provisional versus Validated |
| Traffic-light zones for ongoing backtesting | Basel Committee on Banking Supervision (1996) | Green, amber and red grades |
| Ongoing monitoring, outcomes analysis, periodic revalidation | Federal Reserve and OCC, SR 11-7 (2011) | Forward record; Under review; Withdrawn; Review due after 12 months |
| Hypothetical performance labelled as such, net of costs | SEC Marketing Rule (2020); GIPS standards | Every backtest figure is labelled hypothetical and stated net of the registered costs |

The terminal is not a regulated entity and these frameworks do not apply to it formally. They are
followed because they are the best available public statements of how to keep model claims accurate and checkable.

## 10. The forward record

The in-sample verdict says how a rule did on the past. The forward record says how it does on calls
nobody could have tuned. Once a test passes, each run appends to a local file: a *call* line for
every open call of a passing test not yet on record, and an *outcome* line for every recorded call
whose window has closed, scored by the same rule (hit or miss, with the base rate of that outcome in
that series). Lines are never edited. Each carries a SHA-256 over the previous line's hash and its
own content, so a changed, removed or reordered line breaks the chain from that point
(`src/utils/forwardRecord.ts`). The forward record feeds the Validated, Under review and Withdrawn
grades.

## 11. Results on record

The verdicts below were recorded from runs of the open code on the maintainer's computer between
5 and 7 November 2026 ([recorded-verdicts.json](./validation/recorded-verdicts.json)). Live verdicts
on any computer that reruns the tests are shown in the terminal and take precedence. Results are
hypothetical and, for trading signals, net of the registered costs.

**Passed (4 backtests or signal tests, 1 forecast evaluation)**

| Test | Result |
| --- | --- |
| Crowded futures positioning to unwind (CFTC), v2, method 2 | Lift 19.8 points over the base rate (90% range 15.7 to 23.8), p 0.00025, positive in 6 of 6 currencies |
| Timing Agent, method 2 | Lift 21.4 points (90% range 13.4 to 29.0), positive in 6 of 6 currencies |
| Cycle clock, method 2 | Lift 35.8 points, positive in 24 of 24 countries. It confirms that rate moves come in runs; it is not an edge over a forecaster who already expects the next move |
| Currency carry (25 currencies, 2000 to 2026) | 3.34% a year net of costs (3.65% gross), 90% range 0.58% to 6.04%, Sharpe 0.45, p 0.026. Carry is known for crash risk, which the average does not show |
| GDP nowcast (bridge equation), 1 quarter ahead | Relative RMSE 0.896 against the historical mean (90% range 0.876 to 0.924), better in 28 of 35 series |

**Failed**: Taylor-rule gap (v1, and v2 with a real-time output gap), leading-indicator turn to policy
move, growth and inflation quadrant, unrest spikes to conflict onset, currency value, currency
momentum, CPI nowcast and forecast, GDP forecast (AR), policy rate forecast and debt forecast.

**Too few cases**: policy rule family; debt fan chart coverage (its bands held the outcome less often
than their nominal 80%, with misses mostly above the band, but the registered minimum sample was not
reached).

**After the multiple-testing correction.** Not every pass survives. Currency carry's p-value of 0.026
cannot hold once it is one of some twenty tests, so its grade is Provisional pass, and the terminal shows its
adjusted p-value beside the verdict. The CFTC positioning test, at the smallest p-value the method can report, holds.
The grade shown in the terminal is computed from all tests on record at the time it is read.

A failed result is a result. Most of the forecasting models fail to beat naive benchmarks, which is
consistent with the wider literature on macroeconomic forecasting, and they are shown that way.

### 11.1 Which countries the results rest on

A result says something only about the countries and years it was tested on. The terminal's default
watchlist is the 19 member countries of the G20 (Argentina, Australia, Brazil, Canada, China, France,
Germany, India, Indonesia, Italy, Japan, Korea, Mexico, Russia, Saudi Arabia, South Africa, Turkey,
the United Kingdom and the United States; the European Union and the African Union are not countries
and are left out). The tests do not all cover the same countries, because each uses only the series a
free source publishes over a long enough history. The coverage below is copied from the
pre-registered test files and the recorded runs.

| Test | What it covered |
| --- | --- |
| Crowded futures positioning (CFTC) and Timing Agent | 6 currency futures traded in Chicago: Mexican peso, Brazilian real, South African rand, Japanese yen, British pound and euro; June 2007 to September 2026 |
| Cycle clock | 24 countries' policy rates (BIS), from January 1995 |
| Currency carry, momentum | 25 currencies against the US dollar: Australian, Canadian and New Zealand dollars, Swiss franc, British pound, Japanese yen, Norwegian and Swedish kronor, euro, Czech koruna, Hungarian forint, Polish zloty, Israeli shekel, Korean won, Mexican peso, South African rand, Brazilian real, Indian rupee, Indonesian rupiah, Philippine peso, Thai baht, Malaysian ringgit, Turkish lira, Romanian leu and Icelandic krona; January 2000 to September 2026 |
| Currency value | The same list, of which 20 currencies had the price data, January 2004 to February 2026 |
| GDP nowcast | 35 countries' quarterly GDP, fourth quarter 2007 to fourth quarter 2025 |
| Taylor-rule gap | 13 countries, February 2000 to February 2026 |
| Unrest spikes to conflict onset | 113 countries, 2018 to 2024 |
| CPI, GDP, policy rate and debt forecasts | Between 24 and 184 series, from 2008 (each count is in the [Track record](./TRACK_RECORD.md)) |

Pegged and tightly managed currencies are left out of the currency tests by rule. Several G20
countries (China, Saudi Arabia, Argentina, Russia) are therefore absent from some tests, and a result
from mostly advanced and large emerging economies may not carry over to smaller or frontier ones.

## 12. Quests (built, switched off)

**Status: built and tested, but switched off.** Quests are not available to users yet. The menu shows
"Quests: Not yet available", greyed out, and they stay off until every item on the go-live checklist
in [QUESTS.md](./QUESTS.md) is ticked. They are described here because their method is fixed in code
and should be open to criticism before launch.

A Quest is an open question about an economy, a sovereign or geopolitical risk that anyone can answer,
argue and check, for example "Will Brazil's policy rate be above 14% on 31 March?". Each Quest is one
file in the public repository (`quests/`) with a fingerprint, like a pre-registered test, and states in
advance exactly which feed and which value will settle it.

- **Settled from the feeds, by a stated rule.** When a Forecast Quest's date passes, the app reads the
  answer from the named feed exactly as the rule says: for daily and weekly series, the first value
  published on or after the date; for yearly IMF and World Bank figures, the value as first published,
  with later revisions undone. A missing value is never settled automatically. A Quest may settle only
  on a source whose terms allow its figures to be shown with credit.
- **A tamper-evident results file.** Each result is one line in `quests/resolutions.jsonl`, chained to
  the line before by a SHA-256 fingerprint, like the forward record (section 10). Anyone may dispute a
  result within 7 days; a disputed result can only stand or become "unresolvable", never be replaced by
  a different answer.
- **Scored against the simplest guess.** A forecast is scored by how much better it did than the base
  rate (for yes-or-no questions, the Brier score of the base rate minus the person's Brier score) or
  than assuming nothing changes (for number questions). Each statistic is shown only once a person has
  enough settled forecasts for it to mean something (12 for skill, 30 for calibration), with a 90%
  bootstrap range. Rankings need 12 settled forecasts and a GitHub account at least 90 days old.
- **Debate Quests are never scored.** Some questions have no single figure that settles them ("What
  would most reliably rebuild Egypt's foreign reserves?"). A Debate Quest lists two to four positions;
  people argue them, and nobody is called right. While an argument is typed, Claim Check compares each
  figure it states with the app's own figure, by fixed rules and no AI. After entries close, an
  evidence map shows each argument with its Claim Check readings and the results of related Forecast
  Quests.
- **The opening brief is labelled AI-written and states no figures.** Before a debate opens, the
  app's AI model (the referee model, at least 32 billion parameters, temperature 0, fixed seed) writes
  the strongest case and the weakest point of each position. The script refuses any brief that states
  a number not already in the Quest, so no figure comes from a model. The brief is saved with its model
  and settings and never replaced.

## 13. Reproducibility

- **Open code and specifications.** All code, every pre-registered specification and the manifest of
  their hashes are public. A specification changed after registration is refused by the runner, and
  the history of every specification is visible in version control.
- **Deterministic runs.** Bootstrap resampling uses seeds fixed in the specification. Rerunning a test
  on the same data gives the same verdict.
- **Recorded feeds.** The test suite can replay the real replies of every free feed, recorded on a
  given date, through the real server, and fails if a source that connected then no longer connects or
  a figure filled then is now Missing. (The recordings themselves are not distributed with the public
  release, because some sources' terms do not allow redistribution; anyone can record their own with
  `npm run record:feeds`.)
- **Replication packs.** A chart result can be downloaded as a zip containing the data it drew
  (`data.csv`), the same statistical tests written out in Python, R and Stata with the settings the
  terminal used, and a README listing each column's source, licence and the terminal's own figures to
  check against. The scripts implement the arithmetic directly (OLS, Granger F test, ADF with the lag
  chosen by AIC on one common sample and the test refitted at that lag on every usable row,
  Hodrick-Prescott filter) so they match the terminal's statistics rather than a
  package's defaults (`src/utils/replicationPack.ts`).
- **Point-in-time views.** *As of a past day* shows every figure the terminal held on a date;
  *Replicate a rate decision* shows the inputs a simple rule would have had before a central bank
  move, with its caveats.
- **Exports.** Every brief, note, memo and figures download carries its sources, periods, licence
  classes and the research notice.

## 14. Limitations and what stays Missing

The terminal states what it cannot do. In particular:

- **No free source, so Missing:** sovereign CDS (hidden; a USD bond spread stands in, labelled as
  such), credit ratings, PMIs, government bond auction results outside the United States, consensus
  forecasts, and some countries' series (for example Egypt's policy rate).
- **Revised data.** Where real-time vintages are not available, tests use today's revised data and
  say so. OECD figures obtained through DBnomics can lag the official release by about five months.
- **Small samples.** Many emerging-market series are short and stress episodes cluster. Results from a
  few dozen independent episodes are rough, and the specifications state this.
- **In-sample verdicts.** A pass is evidence about the past under one fixed specification. It is not a
  forecast of future performance; only the forward record speaks to that.
- **AI-written text.** The traceability checks catch untraceable numbers and contradicted stances, not
  emphasis, omission or poor reasoning. A different model can lean differently on the same figures.
- **Descriptive tools make no forward claim.** Geopolitical risk VaR, gross financing need, reserve
  adequacy and similar panels describe; they are not tested signals. The country risk scorecard also
  gives no overall score; its registered default test has no runner yet, so it reads Not validated.
- **Scenario estimates are first order.** Shock and replay results on a portfolio leave out carry,
  convexity and the path inside the window, and replays use monthly averages; they understate the
  worst day and are labelled hypothetical.
- **Not a compliance tool.** The sanctions panel counts entries on official lists; it does no alias
  or fuzzy matching and does not apply ownership rules. EU and UK lists are not yet read.
- **Single-user controls.** On a single-user installation, a report "approved" by its author is
  labelled self-approved. Audit-log integrity relies on a hash chain, which detects edits but not a
  full rewrite of the chain, unless the optional seal key and locked bucket copies are set up.
- **Source terms.** Some free sources require permission for client or commercial use. The licence
  register states each case; users are responsible for respecting the terms of the sources they use.

## 15. Changing the methodology

Changes to rules, specifications, the register or this document go through public pull requests with
a sign-off under the Developer Certificate of Origin (see `CONTRIBUTING.md`). A new or changed test is
a new registered version with its own hash; a recorded verdict is never edited, and a new row is added
only from a real run. Material changes to this document are listed in the project changelog with a new
version number.

## 16. References

- Basel Committee on Banking Supervision (1996). *Supervisory framework for the use of "backtesting"
  in conjunction with the internal models approach to market risk capital requirements.* Bank for
  International Settlements.
- Board of Governors of the Federal Reserve System and Office of the Comptroller of the Currency
  (2011). *Supervisory Guidance on Model Risk Management* (SR 11-7 / OCC 2011-12).
- Caldara, D. and Iacoviello, M. (2022). Measuring geopolitical risk. *American Economic Review*,
  112(4), 1194-1225.
- Chinn, M. D. and Ito, H. (2006). What matters for financial development? Capital controls,
  institutions, and interactions. *Journal of Development Economics*, 81(1), 163-192.
- CFA Institute. *Global Investment Performance Standards (GIPS)*, 2020 edition.
- Diebold, F. X. and Mariano, R. S. (1995). Comparing predictive accuracy. *Journal of Business &
  Economic Statistics*, 13(3), 253-263.
- Harvey, C. R., Liu, Y. and Zhu, H. (2016). ... and the cross-section of expected returns. *Review of
  Financial Studies*, 29(1), 5-68.
- Harvey, D., Leybourne, S. and Newbold, P. (1997). Testing the equality of prediction mean squared
  errors. *International Journal of Forecasting*, 13(2), 281-291.
- Holm, S. (1979). A simple sequentially rejective multiple test procedure. *Scandinavian Journal of
  Statistics*, 6(2), 65-70.
- Taylor, J. B. (1993). Discretion versus policy rules in practice. *Carnegie-Rochester Conference
  Series on Public Policy*, 39, 195-214.
- US Securities and Exchange Commission (2020). *Investment Adviser Marketing* (Rule 206(4)-1, the
  Marketing Rule). Release No. IA-5653.

Per-model references are given in the [Methods note](./METHODS.md).

## Version history

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 7 November 2026 | First version |
| 1.1 | 8 November 2026 | Opening section on why EconQuest exists; a plain-language companion, [How EconQuest works](./HOW_IT_WORKS.md); where it runs (1.1), explanations and help levels (4.7), geopolitical risk VaR (5.1), which countries the results rest on (11.1) and Quests (12). Published on the project website; joined the repository with version 1.2 |
| 1.2 | 13 November 2026 | Sources and the files you save (3.1), statistics conventions in the charts and tables (7.4), figures served to outside systems and hypothetical scenario estimates (3.8), the audit seal and locked copies (4.5), the country risk scorecard listed as Not validated with its registered default test (5, 14), scenario limits (14). The short version corrected: the council's chat agents are fixed code, and only the summary writer is an AI model |

---

*EconQuest Terminal methodology, version 1.2 (13 November 2026). Text licensed under CC BY 4.0: you may
share and adapt it with credit to "EconQuest Terminal contributors". Research, not validated advice.*
