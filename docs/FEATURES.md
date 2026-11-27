# Features and details

**English** · [Español](./FEATURES.es.md) · [Français](./FEATURES.fr.md) · [Português](./FEATURES.pt.md)

Everything EconQuest does, in detail: every task and tool, the sizes and requirements, the AI models
and their settings, languages, Quests, data sources, how to check the figures, the commands, the
roadmap and the developer notes. The short introduction and the install steps are in the
[README](../README.md).

## Contents

- [What you can do with it](#what-you-can-do-with-it)
- [System requirements and sizes](#system-requirements-and-sizes)
- [AI models: which to use, sizes and settings](#ai-models-which-to-use-sizes-and-settings)
- [Languages](#languages)
- [Quests: crowdsourcing answers to economic questions](#quests-crowdsourcing-answers-to-economic-questions)
- [Where the data comes from](#where-the-data-comes-from)
- [How you can check it](#how-you-can-check-it)
- [Commands](#commands)
- [Roadmap](#roadmap)
- [For developers](#for-developers)

---

## What you can do with it

| Task | Where | What you get |
| --- | --- | --- |
| Ask a question in plain words | **Workspace** (Council chat) | Specialist agents answer from the app's figures, each naming its source; without an AI model a short answer by the app's stated rules comes first; with an AI model, a summary agent writes a short brief that may quote only their figures, and a number check flags any figure it cannot trace |
| Ask what a change would do | **Workspace** (Council chat) | Ask "what would happen to Turkey if the Fed raised rates by 1 point?" The app reads the change back to you (you can edit the sizes and ask again), the Scenario Agent sets today's figures beside the figures after the change, lists what happened in past episodes of the same kind and what published studies found, and the answer comes in eight parts, each marked with the kind of evidence it rests on |
| Run the World Bank's own country model | **History & data > IMF forecasts by edition**, and Council chat what-ifs | For Bolivia, Croatia, Iraq, Nepal, Pakistan and Turkiye, with the optional models service turned on ([install guide](./INSTALL.md#add-the-world-bank-country-models-optional)): the baseline stored in the World Bank's public MFMod model, and *Try a shock in the model* (world oil or food prices, government purchases, or the policy rate where the model has one), shown as the difference from the model's own path because the public copies carry old data. The Scenario Agent adds the model's answer to oil, food and policy rate questions. A check written down before the real run tests that the app reproduces the World Bank's own results |
| Study one country | **Research > One country** | Summary, Markets & signals, History & data and Sources. History & data shows the history chart, then a menu of tools in eight groups that open one at a time: charts going back years, nowcasts and forecasts with ranges, output gap, debt sustainability, reserve adequacy, policy rules, crisis early-warning, yield curve, inflation drivers, growth accounting, IMF forecasts by edition, and "as of" views of what was known on a past day. For lower-income countries: remittances, aid received, financial inclusion, commodity prices and terms of trade, food prices and food security, and natural disasters. Weather at the capital since 1981 and across the country since 1901, rice, wheat, maize and soybean prices since 1960, a parametric insurance designer (burn cost, fair price, return periods, basis risk), a disaster loss model and tropical cyclone tracks. How the currency is run in fact, central bank assets and dollar funding stress. For public administrators and politicians: budget credibility (how much of the approved budget was spent, with PEFA grade bands), a budget execution tracker from your own file, World Bank projects and how fast they pay out, and regional figures. For economists and traders: ranges from past forecast misses, full US and euro area yield curves, and data surprises with an inflation surprise index |
| Compare countries | **Research > Compare countries** | Your watchlist side by side (the 19 G20 member countries to start with, or the 15 largest lower-income countries by region), story leads and where market prices and the data disagree |
| Follow your holdings | **Research > My holdings** | A list of bonds or positions you load, against the risks and signals |
| Test a policy choice | **Policy review** (its own page in the header) | A step-by-step case file: frame the problem, diagnose, rank options, check the evidence and precedents (including **What happened after**: the country against a twin of countries that did not make the same change), write a recommendation memo and a one-page brief for non-economists, then track what happened. Compare the diagnosis with up to six peer countries, get a warning on the start page when a watched figure crosses its trigger, and see what changed when you review the same policy again. The policy council weighs one measure (costs and benefits at official discount rates, who gains and who loses, what follows, scenarios) or what an event means for one market. **For people** turns a review into a plain summary for constituents: what changes, the cost per person, who gains and who pays, and the regions furthest behind |
| Try a fiscal what-if | **History & data**, or from Council chat | Change government spending or taxes and see the likely effect on growth and debt, using published multipliers and budget elasticities, with a range |
| Write a report | **Reports** (tabs: Write a note, Council documents, Notebooks, Teaching) | Country notes, issuer notes, debt sustainability assessments, portfolio and client reviews and council briefs, as Markdown or PDF with sources and dates |
| Write a working paper | **Council chat** charts, **Reports > Notebooks** | Pin a chart to a research notebook with the date its figures run to and a fingerprint of the figures; download the notebook as one zip (draft, data, Python, R and Stata scripts, citation file); later, *Check it still holds* says whether each figure is the same, revised or gone |
| Learn as you go | Header buttons, **Menu > User manual**, **Menu > Worked examples** | Four help levels (Help off, Key help, Full help, Expert), a plain-language glossary, five worked case studies, teaching episodes and exam mode |
| Bring your own data and tests | **Menu > Your data**, **Menu > Models & validation** | Load your own CSV series; register your own signal or model test under the same strict rules as the app's own |
| Use the figures in R, Python or Stata | [docs/DATA_API.md](./DATA_API.md) | The same series, panels and tables the screens show, with source and date on every value |
| Connect a portfolio system | **Menu > Settings > API tokens**, [docs/DATA_API.md](./DATA_API.md) | Another program reads country snapshots and events, sends its positions in, and runs shocks and past-crisis replays on its portfolio, each with a token limited to what you tick ([details](#connecting-an-outside-system)) |

**Council chat** is the heart of the app. The agents are Central Bank, Fiscal & Debt, Politics &
Events, Relative Value, FX (currencies), Global Spillover, Calendar, Timing and Behavioural Finance,
plus a Document agent that reads policy papers you upload, a Chart Agent for charts and tests, and
the **Scenario Agent** for what-if questions. If you run a research-tools server of your own, the
**Quant desk** can bring its backtests, volatility and option figures into a chat answer, each with its
link and the server's "hypothetical" label; it is off unless you set it up. **Run the full council** sends one country
to nine specialist agents on three desks (geopolitics, sovereign credit and the wider economy); they
debate, and the app stops for your approval before writing the final report. A larger AI model acts as
the **referee**, judging whether each answer sticks to the figures ([AI models](#ai-models-which-to-use-sizes-and-settings)).

**Every figure, chart and test works without any AI model.** The AI is needed only for the chat
summary, debates and plain-language explanations, and each answer it writes is labelled as AI-written.

---

## System requirements and sizes

| Part | Minimum | Recommended |
| --- | --- | --- |
| Operating system | macOS (three newest versions), Windows 10 or 11 (64-bit, WSL 2 for Docker Desktop), or 64-bit Linux | The same; Apple Silicon and Intel or AMD all work |
| Memory | 8 GB (4 GB in light mode, a target not yet measured) | 16 GB; 32 GB to run the large AI referee on the same computer |
| Free disk | 5 GB | 10 GB, plus room for AI models (below) |
| Internet | Any connection | One without a small monthly data cap |
| Node.js (only to run from the code) | 20.19 or later, or 22.12 or later | 22 |

### Download sizes

Each figure says how it was found. "Measured" means measured on the date given; "estimate" gives its
method. Measurements from 13 November 2026 are of the main branch through pull request #510; the built
app and the language files were measured again on 17 November 2026, through pull request #598.

| What | Size | How the figure was found |
| --- | --- | --- |
| Source code (`git clone`) | 70 MB (29 MB of files and 41 MB of history) | Measured, fresh clone, 13 November 2026 |
| Ready-made app (Docker image) | About 170 MB to download; 798 MB once unpacked | Measured: image built from the repository's Dockerfile on 13 November 2026 (798 MB unpacked, 170 MB compressed with gzip). The download from the registry is compressed the same way, so expect a similar size |
| Installed packages, from the code (`npm install`) | 465 MB | Measured, 13 November 2026 |
| Built web app (`npm run build`) | 7.75 MB in all; 481 KB compressed at start-up | Measured with `npm run size:check`, 24 November 2026, through pull request #677 (limits 520 KB and 9 MB) |
| Each extra language (Spanish, French, Portuguese) | About 0.85 MB (about 270 KB compressed), downloaded only when picked | Measured from the build, 17 November 2026 |
| First full data download | About 3.6 to 3.8 GB, mostly GDELT news files | Estimate: GDELT about 3.4 GB for 8 weeks (from GDELT's own file sizes), past IMF forecast editions about 100 MB (measured), the rest as in the daily run |
| First data download in light mode | Target: well under 1 GB | Not yet measured; owed from a light-mode run on the developer's Mac before the public release |
| Daily data download | Roughly 150 to 200 MB (about 4.5 to 6 GB a month) | Estimate from recorded replies and file sizes ([INSTALL.md](./INSTALL.md#how-much-data-it-downloads)). The daily run now records what it downloads; the measured figure from a week of runs (`npm run go -- status` on the developer's Mac) will replace this estimate |
| AI models through Ollama (optional) | qwen2.5:7b 4.7 GB; qwen2.5:14b 9 GB; qwen2.5:32b 20 GB | Model sizes published by Ollama |
| GDELT long history (optional, `npm run gdelt:daily`) | About 25 GB from 2016 (35 GB from 1979); about 5 MB kept on disk | GDELT's published file sizes; `-- --estimate` gives the exact figure |

### Space used once running

| Set-up | About how much disk | Made up of |
| --- | --- | --- |
| Light mode, no local AI | Target 2 GB | Not yet measured, as above |
| Ready-made app, no local AI | About 1 GB, growing about 40 MB a year | App image 0.8 GB (measured) plus the `data/` folder, about 150 MB after the first few days (measured on the developer's Mac, 9 November 2026, 22 countries) |
| Ready-made app with a 14B referee | About 15 GB | The above plus qwen2.5:7b and qwen2.5:14b (4.7 + 9 GB) |
| Ready-made app with the full local AI | About 26 GB | The above plus qwen2.5:7b and qwen2.5:32b (4.7 + 20 GB) |
| From the code instead of the image | Add about 0.5 GB | Source and history 70 MB, packages 465 MB, build 7.75 MB (measured) |

Docker Desktop itself needs a few GB more (check docker.com). Every past IMF forecast edition since
2007 would add roughly 300 MB (estimate: about 38 editions at an average of 7 MB). To see the real
size on your own computer, run `du -sh data data/*` in the EconQuest folder, or open Menu > Offline
data. [docs/INSTALL.md](./INSTALL.md#what-you-need) has the folder-by-folder tables.

---

## AI models: which to use, sizes and settings

The AI writes the council summary, runs the debate, picks agents for a question and explains figures.
It never supplies a figure: every number comes from a feed, an official series or your file. Choose a
provider in Menu > Settings > AI model.

| Provider | Cost | Privacy | Notes |
| --- | --- | --- | --- |
| **No AI** | Free | Nothing leaves your computer except requests for public figures | Every figure, chart and test works; agents answer from the figures without a written summary |
| **Ollama** on your computer | Free | Everything stays on your computer | Needs the [Ollama app](https://ollama.com/download) and enough memory (below) |
| **Google Gemini** | Free up to Google's daily limits, then billed to your own key | Questions and the figures they use go to Google | Needs a Gemini API key; the default model is `gemini-3.8-flash`, changed with `GEMINI_MODEL` in `.env` |
| **Ollama, then Gemini** | As above | As above | Ollama first; Gemini answers when Ollama does not |
| Local OpenAI-compatible server (such as LM Studio) | Free | Stays on your computer | Under Advanced AI set-up; you set the address and model name |

### Two roles: fast model and referee

| Role | What it does | Default | Rule |
| --- | --- | --- | --- |
| **Fast model** | Picks agents and writes the desk agents' answers | `qwen2.5:7b` (`OLLAMA_QUICK_MODEL`) | A 7 to 8B model answers in under a minute on most Macs |
| **Referee** | The full council's final step, Council chat summaries and explanations, the agent debate, the Policy review Options step and Quest debate briefs | `qwen2.5:32b` (`OLLAMA_DEEP_MODEL`) | 30B or larger counts as a full referee. A model of 8B or less is never used as a referee: it is flagged in Settings and under each answer. A 14B referee is allowed only if you turn on **Allow a 14B referee** (off by default), and every answer it judges says "Small referee" |

### Which set-up for which computer

| Your computer | Recommended set-up |
| --- | --- |
| 4 GB laptop | Light mode with a Google Gemini key, or no AI |
| 8 GB | Google Gemini, or no AI. A local model leaves too little memory for the app, Docker and a browser |
| 16 GB | Ollama `qwen2.5:7b` for the desks, with "Ollama, then Gemini" so Gemini does the refereeing; or opt in to a `qwen2.5:14b` referee, labelled "Small referee" (it needs about half the memory of the 32B model) |
| 32 GB or more, or a graphics card with 24 GB | Everything local: `qwen2.5:7b` and `qwen2.5:32b` |

Download the models once with `ollama pull qwen2.5:7b` and `ollama pull qwen2.5:32b` (or `npm run go`
does it). On a computer without enough memory or a graphics chip the large model can take 10 minutes
or more per full council report; use Gemini for the referee, or run Ollama on a bigger machine
([HOME_SERVER.md](./HOME_SERVER.md)).

### Settings the app uses

These are the values in the code today; the ones marked "changeable" are under Menu > Settings > AI
model > Advanced AI set-up.

| Setting | Value | Why |
| --- | --- | --- |
| Temperature, Council chat summary and explanations | 0, with seed 42 | The same figures give the same answer, exactly on the same Ollama model and machine |
| Temperature, Policy review steps | 0 | A rerun reads as close as the model allows |
| Temperature, Quest debate briefs | 0, with seed 42, on the referee | Written once and recorded with its settings |
| Temperature, other steps (full council desks) | 0.2 (changeable, 0 to 1.5) | A little variety between desk answers |
| Context window (Ollama `num_ctx`) | 8,192 tokens (changeable, 1,024 to 65,536) | Enough for a question, the figures and the instructions |
| Answer length cap on long steps (Ollama `num_predict`) | 2,048 tokens; 4,096 for reasoning models | Stops a model that keeps writing padding |
| Wait per model call | 16 seconds for a desk step and 25 for a full-council step by default (changeable, 5 to 180); at least 120 seconds for referee steps | A dead address fails fast; the referee gets time to think |
| Model kept loaded (Ollama `keep_alive`) | 30 minutes on long steps | The next question does not reload a 20 GB model |
| Answer format | JSON checked against a schema; Gemini thinking level low | The app reads each field and checks every figure against its source |

In `.env` (see [deploy/quick-start/env.example](../deploy/quick-start/env.example)):
`DEFAULT_AI_PROVIDER` (`ollama` or `gemini`), `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`,
`OLLAMA_DEEP_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `LIGHT_MODE`.

---

## Languages

| Language | Status | Form of address |
| --- | --- | --- |
| English | Complete; the source language | |
| Spanish (español) | Whole app | Formal *usted* |
| French (français) | Whole app | Formal *vous* |
| Brazilian Portuguese (português) | Whole app | *Você* |
| Arabic, Swahili | Planned, not started | |

Every screen, menu, help text, glossary entry and worked example is translated; the one-page policy
brief prints in all four languages. Switch with the **EN / ES / FR / PT** button in the header; the
choice is kept in your browser. A language downloads only when picked, so it never slows the app for
anyone else.

Some things stay as they are written and say so: figures, source names and series names show as the
source gave them; Council chat and the council write their answers in the language you pick (the agents still read questions best in English);
method notes cite papers in English; some text the app's rules write about a country (such as the
brief's headline sentences) is still in English. None of the translations has yet been checked by a
native speaker; help with that is welcome: the steps and the file checklist are in
[docs/TRANSLATION_REVIEW.md](./TRANSLATION_REVIEW.md).

This README and the walk-through guide are in all four languages. The other documents are in English.

---

## Quests: crowdsourcing answers to economic questions

Quests turn open economic questions into a public, scored game anyone can join, so that many people
can work on a country's problems, test each other's reasoning against the data, and build a record of
who forecasts well. **Quests are built but switched off.** Menu > Quests is greyed out ("Not yet
available") until every item on the checklist in [docs/QUESTS.md](./QUESTS.md) is ticked and the
project has gone public. To try them on your own computer, add `QUESTS_ENABLED=on` to `.env` and
restart.

![Menu > Quests with QUESTS_ENABLED=on: a list of draft Quests with their type and result date](./images/18-quests.png)

**What a Quest is.** One file in `quests/`, with a question and a stated rule for how it is settled
from the app's own feeds. There are four kinds:

| Kind | Example | How it ends |
| --- | --- | --- |
| **Forecast** | "Will Turkey's policy rate be lower on 30 June 2027 than when entries close?" | Settled from the feed by its rule; each entry is scored |
| **Debate** | "What would most reliably rebuild Egypt's foreign reserves?" | Never scored. People argue a position with the app's figures; Claim Check compares every figure they state with the app's; after close an evidence map shows the arguments beside what the figures showed |
| **Replication** | "Reproduce the Bohn fiscal reaction estimate for Brazil" | Each entry gives the figure a person's own public script produced; it reproduces the app's figure if within the stated tolerance. A careful entry that finds a mistake in the app solves the Quest |
| **Signal** | "Does crowded futures positioning come back within six weeks?" | People propose a pre-registered test; each is run once after close, counted in the Holm correction with every other test on record, and badged like the app's own |

**How the game works.**

- **Play in private or in public.** Log an answer privately on your own computer, practise on past
  data (scored at once, not saved), or enter publicly by a pull request the app prepares for you.
  People in countries GitHub blocks can enter by email through a maintainer.
- **Scores against a base rate.** Forecasts are scored with the Brier score against how often the
  thing happened in the past, and number forecasts against "nothing changes", so luck and copying
  gain little.
- **Scoreboard.** Skill with a 90% range, calibration, sharpness, record against the crowd, strengths
  by field and region, streaks, seasons by calendar year and an all-time table. A person is ranked
  only after 12 settled forecasts and with a GitHub account at least 90 days old; nobody is ranked on
  how many Quests they enter. Debates, replications and tests are listed on contributor pages, never
  ranked.
- **Nothing can be changed afterwards.** Approved Quests are fingerprinted; results are written to a
  hash-chained record that fails its check if any line is altered; disputes are decided in public.
- **Open for people without the app.** A static public board (`npm run quests:board`) shows the
  tables, results and the crowd against the base rate, and a yearly open dataset can be deposited
  for a DOI.
- **Rules that keep it sound.** No figures written into a Quest file; Forecast Quests settle only on
  sources whose terms allow sharing with credit; questions on conflict, unrest or casualties run only
  as Debates; no stakes and no prizes. Quests are not a betting market.
- **In the classroom.** Teachers can run Quests with a class code and a private class table; a
  one-term pilot with two professors is planned ([docs/ROADMAP.md](./ROADMAP.md)).

Fourteen draft Quests are in `quests/drafts/`; none is approved yet. The full rules, the maintainer's
steps and the launch checklist are in [docs/QUESTS.md](./QUESTS.md) and
[quests/README.md](../quests/README.md).

---

## Where the data comes from

All of these are free. A few need a free key, which you add in Menu > Settings.

| Area | Sources |
| --- | --- |
| Growth, debt, budgets, trade | World Bank (indicators and debt statistics), IMF (World Economic Outlook, past editions, reserves, balance of payments, reserve currency shares, government spending by purpose), OECD (leading indicators, prices, quarterly GDP, read through DBnomics), IMF monthly consumer prices, Eurostat (inflation, industrial production, government spending), UN Comtrade and WITS (trade partners) |
| Interest rates and bonds | US Treasury daily par yield curve and ECB euro area government yield curve (every maturity, each day), BIS (central bank policy rates, debt securities, real exchange rates, central bank total assets, US dollar credit to non-banks), New York Fed dollar swap lines, IMF monthly policy rates (Monetary and Financial Statistics) for countries the BIS does not cover, FRED (official 10-year yields; free key), New York Fed rates, US Treasury (foreign holders, auctions), Brazil Treasury, Peru's central bank (EMBIG spreads), and monthly OECD 10-year yields and Federal Reserve H.10 exchange rates from FRED since 1990 for the past-crisis replays |
| Currencies and commodities | Spot exchange rates (open.er-api.com), ECB reference rates, IMF monthly exchange rates for currencies with no daily official rate (for example the naira, shilling and cedi), World Bank commodity prices (Pink Sheet; rice, wheat, maize and soybeans since 1960), US EIA oil prices (free key), the Ilzetzki, Reinhart and Rogoff exchange rate regime classification (a workbook you save yourself; the authors ask for a citation and state no licence) |
| Surveys and expectations | EU business and consumer surveys (European Commission, via Eurostat; a free stand-in for paid PMIs, labelled as such), ECB Survey of Professional Forecasters, Brazil's Focus survey, NY Fed supply chain pressure index; for data surprises, US consumer prices from the BLS and the Kalshi CPI market as saved before each release |
| Budgets, projects and regions | World Bank budget outturn from PEFA assessments (UN goal 16.6.1), World Bank projects and the IDA statement of credits, DOSE output per person by region (Wenz et al. 2023, CC BY 4.0), Eurostat figures for EU regions, and the Global Data Lab subnational Human Development Index (a file you save; non-commercial terms). Your own monthly spending file for the budget execution tracker stays on your computer |
| Central banks and calendar | Banco Central do Brasil, Banco de México (free token), official central bank decision dates (now also Kenya, Ghana, Tanzania and India) and inflation targets, each read on the bank's own page, CPI and GDP release dates from statistics offices' own calendars |
| Institutions and openness | World Bank Worldwide Governance Indicators, the Chinn-Ito index of capital account openness (downloaded to your computer once a month at most, credited to Chinn and Ito 2006, and never passed on) |
| Politics, conflict and shipping | GDELT news events, UCDP and ACLED conflict data (ACLED files are downloaded by hand), OFAC and UN sanctions lists, the Geopolitical Risk index, IMF PortWatch (ships through chokepoints and port calls) |
| Markets and positioning | Kalshi and Polymarket prediction markets, CFTC Commitments of Traders |
| Lower-income countries | World Bank (remittances and the cost of sending them, Global Findex accounts, aid received as republished from the OECD, food security, commodity trade shares and terms of trade); two files you save yourself: FAOSTAT consumer prices for food price inflation, and EM-DAT natural disasters, downloaded with your own free EM-DAT account (its terms do not allow the app to ship it) |
| Weather and hazards | NASA POWER (monthly temperature and rainfall at each capital since 1981), World Bank Climate Change Knowledge Portal (CRU TS country averages since 1901, CC BY 4.0), NOAA IBTrACS tropical cyclone tracks since 1980 (downloaded only when you press the button, or read from a file you save) |

The full list, with what each source fills and how often it is fetched, is in
[docs/DATA_SOURCES.md](./DATA_SOURCES.md). What each source's terms allow (showing figures to
others, commercial use, credit) is in [docs/DATA_LICENCES.md](./DATA_LICENCES.md).

**How data is kept.** The daily download fetches every free feed once a day in the background, so
opening a page never waits on the internet (log: `data/local/logs/daily.log`; Menu > Data health >
Daily download follows it as it runs). If a source fails, the last good figure is kept with "kept from
the <date> pull" on its label. Every pull is archived by day in `data/archive/`, so the data as it
stood on a past date is never lost. Menu > Settings > Backup saves your holdings, watchlists and
settings, without the keys, as one file.

---

## How you can check it

- **Every figure carries its source and date**, and Menu > Data health shows whether each source is
  still arriving and whether any figure has been revised since it was first shown.
- **Signals and models are tested before they are trusted.** Each test is written down and
  fingerprinted *before* it is run (pre-registration), uses only data that was available at the time,
  counts trading costs, and is checked with resampling. Because many tests are run, the results are
  corrected for luck across all of them (the Holm correction). A test that fails is recorded as failed
  and never re-tuned until it passes.
- **Badges** show where each signal stands: Validated, Provisional, Under review, Withdrawn or Review
  due. Most signals have not passed; the app says so.
- **The track record** keeps every pre-registered test, passed or failed, and a forward record of
  live predictions ([docs/TRACK_RECORD.md](./TRACK_RECORD.md), [docs/METHODS.md](./METHODS.md)).
  Each test was written down and hashed before it ran; so far that was the same day or the day before,
  on public data, so the hash shows the rule did not change after the run, not that it was fixed
  before anyone looked at the data. The forward record is the stronger check.
- **An audit log** records what was asked, which figures were used and who signed off a report.

The full method is in [docs/METHODOLOGY.md](./METHODOLOGY.md); the same in plain words is
[docs/HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run go` | Update and start everything |
| `npm run go -- status` | Show what is running and what the last daily download did, with its size |
| `npm run go -- daily` | Run the daily data download now |
| `npm run go -- --test` | Start, then run the type check and tests |
| `npm run go -- --validate` | Start, then re-run the signal tests and write the report |
| `npm run go -- stop` | Stop the app |
| `npm run update` | Update the code and the Docker app only (files the app writes itself are backed up and put back first, so they never block the update) |
| `npm run dev` | Only the development app, on http://localhost:3000 |
| `npm run check:data` | Live check of every source from this computer |
| `npm run replays:pull` | Save the monthly history the past-crisis replays use (also part of the daily download) |
| `npm run chinn-ito:pull` | Save the Chinn-Ito capital account openness file (also part of the daily download, at most once every 30 days) |
| `npm run mac:validate` | Run every check that needs the live feeds or the saved files, one after the other, and write one report (data sources, backtests, IMF editions, forecasts, currency signals, World Bank models, What happened after, council) |
| `npm run synth:validate` | Run the pre-registered false-alarm test for What happened after on the saved yearly histories |
| `npm run forecast:evaluate` | Re-run the pre-registered forecast tests (nowcasts, forecasts, GARCH, quantile bands, tests on figures as first published) |
| `npm run track-record:import` | Copy verdicts and forward-record counts from a real run into docs/validation/ and rebuild the track record |
| `npm run oecd:vintages` | Save the OECD's monthly real-time editions (only new ones on later runs) |
| `npm run notebook:check` | Check every pinned figure in your research notebooks against today's figures (Same, Revised or no longer answers) |
| `npm run tokens -- list` | List, make (`create "<name>" <scopes>`) or revoke (`revoke <id>`) API tokens from the command line |
| `npm run check:success` | Print the public success measures (stars, issues, downloads) and keep each run |

---

## Roadmap

Where things stand on 27 November 2026 (details and status in [docs/ROADMAP.md](./ROADMAP.md)):

**Done**

1. **Citations, upkeep and feedback**: "Cite this" on every chart, table and answer, a size review,
   a monthly source check, and checks of past policy reviews against what happened.
2. **The figures a full terminal needs**: inequality, tax revenue and tariffs, low-income country
   debt, people, trade and debt structure, climate, wages and house prices, sector balances, monthly
   activity, and euro area and UK figures as first published (revenue by state is a second step that
   waits on a coverage check).
3. **Analysis and policy tools**: crisis early-warning, external sustainability, the yield curve,
   inflation drivers, growth accounting, a restructuring calculator, behavioural finance, and a fuller
   policy review with precedents, fiscal rules, political feasibility, a trade-off chart and a
   one-page brief.
4. **Data for lower-income countries** (brought forward on 13 November): remittances, financial
   inclusion, commodity prices and terms of trade, aid received, food prices and natural disasters.
5. **Policy review tools** (brought forward on 13 November): peer comparison, watch alerts on the
   start page, and comparing a review with the earlier one.
6. **Connecting other systems** (13 November): API tokens, events and webhooks, indicator watches,
   country snapshots, positions sent in, hidden names, scenarios and crisis replays, a sealed audit
   log, a deployment guide and OpenID Connect sign-in.
7. **Languages and teaching**: the whole app in Portuguese, and four worked examples.
8. **Markets and financing data** (brought forward on 14 November): how the currency is run in fact
   (exchange rate regime), central bank balance sheets, and dollar funding stress (BIS dollar credit
   and Federal Reserve swap lines). Capital controls are covered by the Chinn-Ito index.
9. **Policy council** (14 November): inside a policy review, weigh one measure with costs and
   benefits, who gains and who loses, second-order effects and scenarios, or weigh what an event
   means for the currency or government bonds; the council ranks the options against it, and the
   one-page brief carries the result.
10. **Weather and insurance** (14 November): weather at the capital and across the country, food
    prices since 1960, a parametric insurance trigger designer with burn cost, fair price, return
    periods and basis risk, a disaster loss model from EM-DAT, and tropical cyclone tracks.
11. **Asking from another program, and tidier pages** (15 and 16 November): another program can ask
    Council chat a question with an `ask:council` token; Reports in tabs, and History & data as the
    chart plus a menu of tools, one at a time.
12. **What-if questions** (17 November): Council chat reads the change a question states, the
    Scenario Agent sets today's figures beside the figures after it with what history and published
    research show, the answer comes in eight parts, and the sizes can be edited and asked again.
13. **Five user roles** (17 November): for public administrators, budget credibility, budget
    execution and World Bank projects; for politicians, regional figures and a plain summary for
    constituents; for researchers, a working-paper bundle and a replication check; for economists,
    ranges from past forecast misses; for traders, full yield curves, data surprises and an inflation
    surprise index.
14. **Outside research tools** (17 November): Council chat can call a research-tools server you run,
    through the Quant desk; off by default.
15. **Better coverage of lower-income countries** (17 November): countries you add (Research > One country > Add a
    country) are saved by the daily download like the built-in ones, with history, "as of" views and
    alerts; a **Lower-income countries** watchlist of the 15 largest by region (India, Pakistan,
    Nigeria, Bangladesh, Ethiopia, Egypt, the Philippines, DR Congo, Viet Nam, Tanzania, Kenya,
    Myanmar, Uganda, Ghana and Bolivia); IMF monthly exchange rates and policy rates where no daily or
    BIS figure exists, also used for inflation nowcasts and forecasts and policy rate forecasts; and
    inflation targets and decision dates read on the banks' own pages.
16. **Quick wins from the platform comparison** (23 November): spreadsheets refresh from the app
    (an Excel Power Query helper and a Google Sheets script); official forecasts side by side (the
    IMF, the World Bank and the OECD, with the spread between them) in History & data; and release
    days, when the app re-reads CPI and monthly activity sources hourly until the new month arrives,
    shown on Today.

17. **Closing the gaps with leading platforms** (23 November): forecasts written down before the
    figures exist and scored each month; one search across the free catalogues (Menu > Find data);
    Bayesian and structural VARs in the Chart Agent; a small open-economy model estimated and tested
    before it shows; real-time figures for all 38 OECD members; official documents and central bank
    speeches per country; an offline country report, a macro lab and a commodity worked example;
    comments and read-only links on a home server; live prices from your own Interactive Brokers
    account, shown on screen only; council answers in Spanish, French or Portuguese; inflation
    targets and decision dates for more lower-income countries; a native-speaker review process for
    the translations; and how shocks spread between economies (a small global VAR with IMF trade
    weights). The low-income debt framework waits for its 2027 guidance note.
18. **Forecasting methods and the track record** (19 to 23 November): GARCH currency volatility,
    ridge, lasso, random forest and dynamic factor nowcasts, ARIMA, quantile growth bands, the KPSS
    test, tests on figures as first published, and the country risk scorecard test. 39 tests are now
    on record: 11 passed, 8 of them still holding once the number of tests is counted. Verdicts are
    copied from real runs with `npm run track-record:import`, never by hand.
19. **Easier first use** (24 November): a three-step start-here card; a short answer at the top of
    Council chat when no AI model writes one; a shorter Missing list and more room for the answer;
    Policy review as its own page next to Reports; and the help button as a list of the four levels.
20. **Recovering on its own** (24 November): updates that do not stop on files the app writes itself;
    slow or busy sources asked again before they count as failed; a second try for failed downloads at
    the end of the daily run and later tries after two hours; and the last good answer, with its own
    dates, while a source does not answer.
21. **Standard app features** (24 November): a privacy page ([docs/PRIVACY.md](./PRIVACY.md)), a
    notice when a newer version is out, Copy details and Report a problem, a question before deleting
    a watchlist, following the computer's dark or light setting, steps to remove the app, and keyboard
    shortcuts.
22. **Release check and the poorest countries** (25 November): a second security review and a
    stricter page security policy for the built app; Add a country lists every country, not only
    those on the world map; the 59 countries on the IMF and World Bank low-income debt list (Malawi,
    Sierra Leone, Haiti, Nepal, the small island states and others) are in every country list, saved
    by the daily download once they are on a watchlist; and the automatic Windows check passes.
23. **The World Bank's country models** (26 November): the macro-fiscal models the World Bank
    publishes for Bolivia, Croatia, Iraq, Nepal, Pakistan and Turkiye run on your computer through an
    optional service; their baseline and one-shock runs in History & data and in what-if answers; and
    a pre-registered check that the app reproduces the World Bank's own results, which passed on the
    developer's computer on 26 November.
24. **Safer builds and accessibility** (26 November): every build step and base image pinned to a
    fixed version; code scanning and a practices score once the repository is public; software parts
    lists, checksums and a signed build proof with each release; accessibility checked against WCAG
    2.2 with a keyboard pass; the computer's reduce motion setting followed; and an accessibility
    statement ([docs/ACCESSIBILITY.md](./ACCESSIBILITY.md)).
25. **What happened after** (27 November): in Policy review > Precedents, pick a change a country
    made (a big budget swing, a devaluation, a new exchange rate regime or fiscal rule, or one you add
    with a source) and see the country against a "twin" of countries that did not make it, with
    checks on how unusual the gap is; keep a result for the one-page brief, cite it, or line up every
    country that made the same kind of change. Marked Not validated until its pre-registered
    false-alarm test runs on a computer that reaches the IMF and World Bank.

**Next**

- **Testing first.** A small group of invited testers install from the code at
  github.com/smcarus/econquest in light mode and report problems with Menu > Report a problem or the
  Flag button, which open issues there until the public copy opens ([TESTING.md](./TESTING.md)).
- **The public release** at e-conquest/econquest. Light mode, both security reviews and the
  automatic Windows check are done; a first start by a person on a Windows computer, a light-mode
  measurement and a last public export remain.
- **Checkpoint 1**, about four weeks after the public release, is the one review before more work is
  planned. Real use decides what comes next; no new features are added before it.

**Waiting**

- **Quests in the classroom**: the plan is complete (13 small changes, then a one-term pilot with
  two professors); building starts when the maintainer says go.
- **Arabic and Swahili**: planned, paused by the maintainer.
- **The phone app**: paused until after the public release.
- **Checks on the maintainer's computer**: some sources (weather, storm tracks, central bank assets,
  dollar funding, the exchange rate regime file) are built and tested on saved replies, but could not
  be reached from the build machine; `npm run check:data` on a computer that reaches them confirms
  each one. The sources for the five user roles answered there on 17 November. The IMF monthly exchange
  rates, policy rates and local market rates answered there on 18 and 19 November. The official
  forecasts, the OECD real-time editions and the catalogue search (rows `wb_gep`, `oecd_eo`,
  `oecd_rtd` and `catalogues`) wait for their first check there. What happened after waits
  for its first false-alarm test there (`npm run synth:validate`). The Quant desk waits
  for a first check against a real research-tools server, and data surprises need some weeks of daily
  downloads to build up.

---

## For developers

```bash
npm run lint         # TypeScript
npm test             # unit and server tests (Node's built-in runner, network replaced by fixtures)
npm run build        # production bundle
npm run size:check   # fails if the start-up download or the whole app grows past its limit
npm run test:smoke   # opens every page of the built app in Chromium with all feeds down
npm run test:a11y    # accessibility check of the main pages (WCAG 2.2 A and AA, keyboard focus); fails on serious problems
npm run check:data   # live check of every source from this computer
npm run check:imf    # prints the IMF series codes the app matches
npm run record:feeds # records every free feed's real reply for the tests (run where the feeds answer), then the shareable subset
npm run preload      # downloads every free feed for every country, for fast offline use
```

**Stack.** Node.js and Express on the server (`server.ts`, `src/server/`), React 19 and Vite on the
page, TypeScript throughout. AI calls go through `src/server/ai.ts` to Ollama, Google Gemini or an
OpenAI-compatible local server.

**Layout.** The full map is [docs/ARCHITECTURE.md](./ARCHITECTURE.md). In short: `src/utils/` (one module per source or calculation, each with a test in `tests/`),
`src/components/` (React pages and panels), `src/data/` (navigation, official calendar, country list),
`src/i18n/` (English message files, with Spanish in `es/`, French in `fr/` and Portuguese in `pt/`),
`quests/` (Quest files), `docs/validation/` (pre-registered tests and verdicts). Each panel sits inside
a crash guard (`PanelBoundary`), so one failing panel never blanks the app.

**Continuous integration.** Every pull request runs the type check and tests on GitHub
(`.github/workflows/ci.yml`); changes to code also run the build, size check and browser tests, and
changes to packaging also build the app image. Every outside build step and base image is pinned to a
fixed version, and a test fails on a loose tag. In the public repository, CodeQL code scanning and
OpenSSF Scorecard run as well, and each GitHub Release carries software parts lists (SPDX and
CycloneDX), checksums and a signed build proof ([docs/SECURITY.md](./SECURITY.md); `npm run sbom`
makes the list locally). The smoke test needs Playwright's Chromium once:
`npx playwright install chromium`. `tests/server.test.ts` and the smoke test start the real server
with `tests/helpers/offline-fetch.mjs` in place of the network.

**Size limits.** Every screen added since the start loads only when it is opened, and each language
downloads only when picked. The start-up download must stay under 520 KB compressed and the whole app
under 9 MB; `npm run size:check` enforces both.

**Tests on real replies.** `npm run record:feeds`, run on a computer that reaches the feeds, saves
what every free feed really sends (gzipped, keys taken out of every URL, own paid data and AI switched
off) in `tests/fixtures/recorded/`, with what the app made of it. `tests/recorded.test.ts` replays those
replies through the real server with the clock set back to the recording, and fails, naming the
source, if a source connected then no longer is or a figure filled then is now Missing. The same run
builds `tests/fixtures/recorded-public/`: only the replies from sources whose terms allow passing data
on. That folder ships in the public repository, so `tests/recordedPublic.test.ts` gives outside
contributors the same check without a key. Council prompts have their own recorded replay
(`npm run council:record`, `tests/councilRecorded.test.ts`).

**Screenshots.** The images in `docs/images/` come from a build that replays
`tests/fixtures/recorded-public/` (start the server with
`NODE_OPTIONS="--import ./tests/helpers/replay-fetch.mjs" REPLAY_DIR=tests/fixtures/recorded-public`),
so they show only figures whose sources allow passing them on.

### Connecting an outside system

EconQuest can serve figures and alerts to another program, such as a portfolio console, over HTTP.
The full reference, with examples, is "Connecting an outside portfolio system" in
[docs/DATA_API.md](./DATA_API.md); every address is in [docs/openapi.json](./openapi.json).

- **Sign-in with a token.** Make a named API token in **Menu > Settings > API tokens** (or with
  `npm run tokens`), tick only what it may do (`read:data`, `read:council`, `ask:council`,
  `read:events`, `write:holdings`, `write:exclusions`, `run:scenarios`), and revoke it at any time. The secret is
  shown once; the app keeps only its fingerprint. Every use is written to the audit log.
  `SMCR_INTEGRATION_API_KEY` in `.env` still works as a legacy key with the three read scopes.
- **Names both sides agree on.** Countries by ISO alpha-2 or alpha-3 (every answer carries both);
  positions by ISIN, LEI, CIK or ticker plus the other system's own entity ID, which comes back
  unchanged.
- **Tracing.** Any call may carry an `X-Correlation-Id` header; it is sent back and written into the
  audit log entries the call makes.
- **Country snapshot.** `GET /api/v1/countries/<code>/snapshot` returns every saved figure for a
  country, with source, date, badge and whether it may be passed on, without a council run. It
  includes capital account openness from the Chinn-Ito index, withheld in sharing mode.
- **Events and webhooks.** Signal and badge changes, revisions, stale or failed feeds, sanctions list
  changes, releases due tomorrow, council runs and the daily download can be read after an id,
  streamed live, or sent to webhooks signed with HMAC-SHA256 and retried with backoff.
- **Indicator watches.** The other system sets its own thresholds (none is built in); a crossing
  found after the daily download sends a `threshold_crossed` event.
- **Positions in.** With `write:holdings`, `PUT` or `POST /api/v1/holdings` sends positions, which
  appear in Holdings marked "Sent by" and the token's name.
- **Hidden names.** Countries and securities on the hidden-names list (**Menu > Settings > Hidden
  names**, or `/api/v1/exclusions`) never appear on any screen, in any reply or in any event; screens
  show only a count, and the app keeps fingerprints, not the names.
- **Scenarios.** With `run:scenarios`, `POST /api/v1/scenarios` runs a shock (emerging-market
  currencies, US rates, per-country fiscal moves) or replays a past crisis (1997, 1998, 2001, 2008,
  2013, 2020, 2022) on a portfolio sent in the request. Results are per position, labelled
  hypothetical (a first-order estimate, not a valuation), and a move with no source is Missing with
  the reason.
- **Ask Council chat.** With `ask:council`, `POST /api/v1/council/ask` asks a new question and gets
  the answer the chat gives in the app: the same agents, figures and checks, every figure cited with
  source, period, badge and terms page, hidden names left out, the model and the cost. It counts
  against the AI request limit, and `max_cost_usd` refuses a call before it would cost more.
- **Council output.** `/api/v1/integration/*` (desks, bundle, publish, a live stream and
  deliveries) answers `404 NO_COUNCIL_RUN` until the full council has run on that country, and never
  sends built-in figures. `SMCR_WEBHOOK_HMAC_SECRET` fixes its signing secret.
- **Outside research tools.** Council chat can call a research-tools server you run yourself
  (backtests, volatility and price forecasts, nowcasts, option prices) over MCP. Set the address and
  token in **Menu > Settings > Research tools**; it is off until both are set, works in chat only,
  and every call goes in the audit log. Once set, the **Quant desk** joins chat questions about
  backtests, forecasts, volatility, nowcasts, option prices, drawdowns or Sharpe ratios and shows each
  figure with its link, data-through date and the server's "hypothetical" label
  ([docs/RESEARCH_TOOLS.md](./RESEARCH_TOOLS.md)).
- **Audit seal.** With `AUDIT_SEAL_KEY` set, every audit log entry also carries an HMAC; with
  `AUDIT_BUCKET_URL`, each entry is copied to an S3-compatible bucket with object lock, so a rewrite
  of the whole log on this computer can be caught ([docs/SECURITY.md](./SECURITY.md)).
- **Sign-in for people.** On a server with several people, they can sign in through any standard
  OpenID Connect provider (Google, Microsoft, Okta, Keycloak and others), beside or instead of local
  passwords ([docs/SECURITY.md](./SECURITY.md)).
- **Running it as a service.** Reverse proxy and TLS, `ALLOWED_HOSTS`, service tokens, `/healthz`
  and `/readyz`, and `DAILY_DOWNLOAD_DEADLINE` (an alert if the daily download has not finished by a
  set time) are covered in [docs/DEPLOYMENT.md](./DEPLOYMENT.md).

### Network

`npm run dev` listens on 127.0.0.1, so only this computer can open the app. Docker publishes on
127.0.0.1 too. Set `HOST="0.0.0.0"` in `.env` only if you want other machines on your network to
reach it; Settings can still be changed only from this computer unless `SETTINGS_ALLOW_REMOTE` is
"true".

The server answers only to localhost names (localhost, 127.0.0.1, [::1]), so a website cannot reach
it by pointing its own domain at this computer, and it refuses changes sent from pages on other
sites. If you open it to your network, list the names it may be reached by in `ALLOWED_HOSTS`. The
connector test and webhook buttons work only from this computer and cannot be pointed at the app
itself or at cloud metadata addresses.
