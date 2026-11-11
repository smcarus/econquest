# EconQuest Sovereign Council Terminal

EconQuest is a free research terminal for understanding countries' economies, their governments'
finances and the risks around them. It gathers figures from free public sources (the IMF, the World
Bank, the Bank for International Settlements, central banks, statistics offices and others), shows
each one with where it came from and when, and lets you ask a council of specialist AI agents
questions about the countries you follow. Every answer is built only from those figures.

It runs on your own computer. There is no EconQuest website to sign up to and no account with us:
your keys, your saved research and the questions you ask stay with you.

The whole app is in **English, Spanish and French**.

## Why it exists

In the maintainer's words:

> "In 2026 we feel and see the economic effects of poor economic policies. I wanted to see if I could
> make a tool that could assist people in learning and understanding economics, finding multiple and
> optimal financial and policy options, and attempting to bring the best tools to the most
> underserved countries."

Professional economic terminals cost tens of thousands of dollars a year, which puts them out of reach
of most students, journalists, smaller finance ministries and central banks, and analysts in the
countries that most need careful economic policy. EconQuest aims to offer much of the same research,
built on free official data, with every method written down so anyone can check it.

**Who it is for:** analysts of emerging-market government debt and credit, economists at central
banks, finance ministries and international institutions, macro and currency investors, country-risk
teams, teachers and students, journalists, and anyone who wants to understand what is happening to an
economy and why.

## Free, open and independent

- **The app is free**, on every computer, and will stay free. There are no paid tiers and no adverts.
- **Open source.** The code is under the Apache License 2.0 and the documentation, methods notes and
  learning content are under CC BY 4.0, so anyone may use, change and share them (see [Licence](#licence)).
- **Donations, only through the project website.** Once the project has a fiscal host, gifts will be
  taken only through the website, by GitHub Sponsors and Open Source Collective. Until then it takes no
  donations ([GOVERNANCE.md](./GOVERNANCE.md)). Donors and sponsors have no say over methods, results or
  which countries are covered.
- **Public home.** The public copy of the project will live at
  [github.com/e-conquest/econquest](https://github.com/e-conquest/econquest), with the ready-made app at
  `ghcr.io/e-conquest/econquest`.

This is research and teaching software, not investment advice.

---

## The one rule: only real figures

A number appears only when a live feed, an official series or your own file supplied it. Anything
else reads **Missing**, with the reason ("Needs setup", "Feed did not answer", "No source yet"). There
are no built-in, sample or AI-estimated figures anywhere in the app. If the app does not know a
figure, it says so rather than guess.

Paid data (for example credit default swap prices, LSEG, EPFR, credit ratings or analyst consensus) is
used only from your own account or your own file, behind a switch in Settings, and is never passed on
in downloads or shared copies.

---

## What you can do with it

### Ask the council

Council chat is the heart of the app. Type a question in plain words, such as "Is Brazil's debt
sustainable?" or "Who is most exposed to a closure of the Strait of Hormuz?". The agents that cover
the question answer from the app's figures, each naming its source: Central Bank, Fiscal & Debt,
Politics & Events, Relative Value, FX (currencies), Global Spillover, Calendar and Timing, plus a
Document agent that reads policy papers you upload. A summary agent then writes a short brief that may
quote only their figures, and a number check flags any figure it cannot trace back to a source.

For a deeper look, **Run the full council** sends one country to nine specialist agents on three
desks (geopolitics, sovereign credit and the wider economy). They debate, and the app stops for your
approval before writing the final report.

A separate, larger AI model acts as the **referee**, judging whether each answer sticks to the
figures. By default the referee is a 32-billion-parameter model; people with smaller computers can opt
in to a 14-billion one under Menu > Settings > AI model, and every answer it judges is then labelled
"Small referee". Smaller models are never used as a full referee.

The AI can run on your own computer through Ollama (free, nothing leaves your machine) or through a
Google Gemini key, or a local server such as LM Studio. **Every figure, chart and test works without
any AI model**; the AI is only needed for the chat, summaries, debates and explanations. Each answer
is labelled as AI-written.

### Study one country, or many side by side

**Research** has three views: **One country**, **Compare countries** (your watchlist side by side) and
**My holdings** (a list of bonds or positions you load). Each has the same four sections:

- **Summary**: a plain brief of where the economy stands, what moved, and where market prices and
  the data disagree.
- **Markets & signals**: bond spreads, currencies, prediction-market odds (Kalshi and Polymarket) and
  the app's tested signals, each with its test result.
- **History & data**: charts going back years, "as of" views of what was known on a past date, and
  the research panels described below. Each series says what it measures and whose figure it is
  (for example general or central government), whether it is seasonally adjusted, real or nominal,
  its base year and its currency; the same labels go into every download.
- **Sources**: which sources answered, when, and why any figure is missing.

The watchlist starts with the 19 member countries of the G20, and you can add any country.

### Look ahead and test policy choices

On each country's **History & data**:

- **Nowcasts and forecasts** of growth and inflation, each with its out-of-sample test result and a
  range (50, 70 and 90% bands) that says how far it could be off. A forecast that failed its test is
  not drawn by default. Where no sound range exists, such as for IMF projections, the app says so.
- **Output gap**: how far the economy is running above or below its normal capacity.
- **Debt sustainability**: whether government debt is on a stable path, with fan charts showing the
  range of likely outcomes, gross financing needs, and the fiscal reaction test (does the government
  tighten when debt rises?).
- **Reserve adequacy, policy rules and inflation after rate changes**: whether a central bank has
  enough foreign reserves, how its rate compares with common rules, and what past rate moves did.
- **Fiscal what-ifs**: change government spending or taxes and see the likely effect on growth and
  debt, using published spending multipliers by type of spending (such as defence and public
  investment), each government's spending broken down by purpose (the UN's COFOG categories), and the
  OECD's and European Commission's published budget elasticities where they exist. The what-if card can also be opened from Council chat.
- **A small gap model** you fill in yourself: four plain equations for the output gap, inflation, the
  policy rate and the exchange rate. Every number starts blank and is typed in by you; a "Fill starting
  point from latest data" button copies today's figures with their sources. You can ask the council to
  explain your run, labelled "Your model".
- **IMF forecasts by edition**, so you can see how the IMF's view of a country changed over time, and
  US data as first published.

### Write reports

**Reports** builds country notes, issuer notes, debt sustainability assessments, portfolio and client
reviews, policy reviews and council briefs, downloadable as Markdown or PDF with sources and dates.

### Learn as you go

- **Help levels**: the "?" button in the header switches between **Help off** (figures only, without forecast ranges), **Key
  help** (the default: explains the charts, the main figures and what each reading means in real life)
  and **Full help** (explains every figure and term, and why each missing figure is missing).
- **Glossary**: every economic, market and testing term in plain words ([docs/GLOSSARY.md](./docs/GLOSSARY.md)).
- **Teaching episodes, exercises and exam mode** for classes. In exam mode no AI step runs.
- **Quests** (open questions anyone can answer and check) are built but **switched off** and greyed out
  in the Menu until they have been checked. They turn on only with `QUESTS_ENABLED=on`
  ([docs/QUESTS.md](./docs/QUESTS.md)).

### Bring your own data and tests

- **Your data** (Menu > Your data): load your own series from a CSV file. It is checked line by line,
  kept exactly as given, labelled "Your file" wherever it shows, and fingerprinted so any change is visible.
- **Your tests** (Menu > Models & validation > Your tests): register your own trading-signal or model
  test under the same strict rules as the app's own (below). Once saved it is frozen and cannot be
  edited; it then runs on free histories and its verdict is recorded for good.
- **Data API**: R, Python and Stata scripts can read the same series, panels and tables the screens
  show, with source and date on every value ([docs/DATA_API.md](./docs/DATA_API.md), helper files in
  `scripts/data-api/`, nothing extra to install).

---

## Where the data comes from

All of these are free. A few need a free key, which you add in Menu > Settings.

| Area | Sources |
| --- | --- |
| Growth, debt, budgets, trade | World Bank (indicators and debt statistics), IMF (World Economic Outlook, past editions, reserves, balance of payments, reserve currency shares, government spending by purpose), OECD (leading indicators, prices, quarterly GDP, read through DBnomics), IMF monthly consumer prices, Eurostat (inflation, industrial production, government spending), UN Comtrade and WITS (trade partners) |
| Interest rates and bonds | BIS (central bank policy rates, debt securities, real exchange rates), FRED (official 10-year yields; free key), New York Fed rates, US Treasury (foreign holders, auctions), Brazil Treasury, Peru's central bank (EMBIG spreads) |
| Currencies and commodities | Spot exchange rates (open.er-api.com), ECB reference rates, World Bank commodity prices (Pink Sheet), US EIA oil prices (free key) |
| Surveys and expectations | EU business and consumer surveys (European Commission, via Eurostat; a free stand-in for paid PMIs, labelled as such), ECB Survey of Professional Forecasters, Brazil's Focus survey, NY Fed supply chain pressure index |
| Central banks and calendar | Banco Central do Brasil, Banco de México (free token), official central bank decision dates, CPI and GDP release dates from statistics offices' own calendars |
| Politics, conflict and shipping | GDELT news events, UCDP and ACLED conflict data (ACLED files are downloaded by hand), OFAC and UN sanctions lists, the Geopolitical Risk index, IMF PortWatch (ships through chokepoints and port calls) |
| Markets and positioning | Kalshi and Polymarket prediction markets, CFTC Commitments of Traders |

The full list, with what each source fills and how often it is fetched, is in
[docs/DATA_SOURCES.md](./docs/DATA_SOURCES.md). What each source's terms allow (showing figures to
others, commercial use, credit) is in [docs/DATA_LICENCES.md](./docs/DATA_LICENCES.md).

---

## How you can check it

- **Every figure carries its source and date**, and Menu > Data health shows whether each source is
  still arriving and whether any figure has been revised since it was first shown. Its Inflation tab shows where each
  country's inflation figure comes from and how old it is, and flags any over 90 days old. Where several
  sources publish the same figure, the app uses the freshest one.
- **Signals and models are tested before they are trusted.** Each test is written down and
  fingerprinted *before* it is run (pre-registration), uses only data that was available at the time,
  counts trading costs, and is checked with resampling. Because many tests are run, the results are
  corrected for luck across all of them (the Holm correction). A test that fails is recorded as failed
  and never re-tuned until it passes.
- **Badges** show where each signal stands: Validated, Provisional, Under review, Withdrawn or Review
  due. Most signals have not passed; the app says so.
- **The track record** keeps every pre-registered test, passed or failed, and a forward record of
  live predictions ([docs/TRACK_RECORD.md](./docs/TRACK_RECORD.md), [docs/METHODS.md](./docs/METHODS.md)).
- **An audit log** records what was asked, which figures were used and who signed off a report.

The full method is in [docs/METHODOLOGY.md](./docs/METHODOLOGY.md).

---

## Start it

**New to this?** [docs/INSTALL.md](docs/INSTALL.md) is a plain-language, step-by-step guide: install
Docker Desktop, download one file, and run the ready-made app. No building and no programming needed.

**What your computer needs.** At least 8 GB of memory (16 GB recommended), 5 GB of free disk space
(10 GB recommended, plus about 5 GB and 20 GB for the optional small and large AI models) and an
internet connection. The first full data download is about 3.6 to 3.8 GB, mostly GDELT news files;
after that the daily run downloads roughly 150 to 200 MB (an estimate; about 4.5 to 6 GB a month).
The saved data folder is about 150 MB after the first few days and grows by about 40 MB a year.
[docs/INSTALL.md](docs/INSTALL.md#what-you-need) has the full tables and how each figure was found.

**From the code** (Node.js 20.19 or later, or 22.12 or later):

```bash
npm install
npm run go           # update, install, start the app and begin the daily data download
```

`npm run go` is one command for everything: it pulls the latest code, installs packages, downloads
the AI models if you use Ollama, rebuilds and starts the Docker app on http://localhost:3737 and the
development app on http://localhost:3000, and begins the daily data download in the background. On a
Mac you can double-click `econquest-mac.command` instead (Windows: `scripts/start-windows.bat`).

| Command | What it does |
| --- | --- |
| `npm run go` | Update and start everything |
| `npm run go -- status` | Show what is running and what the last daily download did |
| `npm run go -- daily` | Run the daily data download now |
| `npm run go -- --test` | Start, then run the type check and tests |
| `npm run go -- --validate` | Start, then re-run the signal tests and write the report |
| `npm run go -- stop` | Stop the app |
| `npm run dev` | Only the development app, on http://localhost:3000 |

To run it on an always-on Linux box or NAS with Ollama on the same machine, see
[docs/HOME_SERVER.md](docs/HOME_SERVER.md). On a Kubernetes cluster, use the Helm chart in
`deploy/helm/econquest/` ([docs/KUBERNETES.md](docs/KUBERNETES.md)).

### First run

A new install shows dashes until the first download finishes. Workspace opens with a **Getting
started** card that ticks itself off:

1. **See which sources answer.** Menu > Tools > Data connections (or `npm run check:data`) lists every
   source as connected (with a figure it returned), needs setup, off, or why it failed.
2. **Add a free FRED key** in Menu > Settings (⌘, or Ctrl+,). It fills official 10-year yields for
   several countries.
3. **Choose an AI model** in Menu > Settings > AI model: Ollama on this computer, a local server, or a
   Gemini key. Needed only for the council summary, the debate and explanations.
4. **Pick your countries** with Edit on the watchlist card.
5. **Pick your language and help level** with the buttons in the header.

Keys saved in Settings go to `data/local/settings.json` (never in git, never in backups or the audit
log) and take effect without a restart.

### How data is kept

The **daily download** fetches every free feed once a day in the background (also IMF forecast
editions, sanctions lists, the Geopolitical Risk index, conflict files, nowcasts and forecasts, and the
weekly tests when a week has passed), so opening a page never waits on the internet. Its log is in
`data/local/logs/daily.log`.

If a source fails, the last good figure is kept with "kept from the <date> pull" on its label, and the
pull is retried. **Refresh now** on a country page pulls everything for that country again. Every pull
is also archived by day in `data/archive/`, so the data as it stood on a past date is never lost.
Your holdings, watchlists and settings are in `data/local/`; Menu > Settings > Backup saves all of it
except the keys as one file you can restore on another computer.

---

## The pages

| Page | What it is for |
| --- | --- |
| **Workspace** | Council chat fills the screen; **Briefing** opens your inputs, watchlist, what moved, the next two weeks and watch alerts in a side panel |
| **Research** | One country, Compare countries and My holdings, each with Summary, Markets & signals, History & data and Sources. CSV and Excel downloads |
| **Reports** | Notes, reviews, policy reviews, council briefs, saved research and teaching episodes; Markdown or PDF |
| **Menu** | Settings (including API keys and *Your subscriptions* for a paid data account you already have, off by default), Tools and data connections, Data health, Your data, Models & validation (with Your tests), Idea journal, Audit log, Offline data, Sharing mode, Exam mode, User manual, About & data licences, and Quests (greyed out for now) |

Council chat is the same conversation on every page: on Research and Reports, *Council chat* in the
header opens it in a side panel.

---

## Languages

Every screen, menu, help text and glossary entry is available in English, Spanish (formal *usted*) and
French (formal *vous*), switched with the language button in the header. A language downloads only
when picked, so it never slows the app for anyone else. A few things stay in English for now and say
so: the council agents read questions in English and write their documents in English, and method
notes cite papers in English. Neither translation has yet been reviewed by a native speaker; help
with that is welcome.

---

## Roadmap

Planned work, in order (details and status in [docs/ROADMAP.md](./docs/ROADMAP.md)):

1. **Citations, upkeep and feedback**: "Cite this" on every chart, table and answer (done); a size
   review, a monthly source check, and checks of past policy reviews against what happened.
2. **The figures a full terminal needs**: inequality, tax revenue and tariffs, low-income country
   debt, people, trade and debt structure, climate, wages and house prices, sector balances, monthly
   activity, and euro area and UK figures as first published.
3. **The public release** at e-conquest/econquest, after a security and Windows check, with a light
   mode for modest laptops.
4. **Analysis and policy tools**: crisis early-warning, external sustainability, the yield curve,
   inflation drivers, growth accounting, a restructuring calculator, behavioural finance, and a
   fuller policy review.
5. **More languages and teaching**: Portuguese, Arabic and Swahili, worked examples, and Quests in
   the classroom with a one-term pilot.
6. **A phone app** (paused): a free standalone app that uses your own keys.

---

## Documentation

- [docs/INSTALL.md](./docs/INSTALL.md): step-by-step install for people new to this
- [docs/USER_MANUAL.md](./docs/USER_MANUAL.md): how to use each page
- [docs/GLOSSARY.md](./docs/GLOSSARY.md): every economic, market and testing term in plain words
- [docs/METHODOLOGY.md](./docs/METHODOLOGY.md): how data is sourced, how the council is checked, and how models and signals are tested and graded
- [docs/DATA_SOURCES.md](./docs/DATA_SOURCES.md): every source, what it fills, how to set it up
- [docs/DATA_LICENCES.md](./docs/DATA_LICENCES.md): what each source's terms allow
- [docs/DATA_API.md](./docs/DATA_API.md): reading the app's figures from R, Python and Stata
- [docs/METHODS.md](./docs/METHODS.md): a methods note per model and signal, with its pre-registered backtests and recorded verdicts
- [docs/TRACK_RECORD.md](./docs/TRACK_RECORD.md): every pre-registered test on record, passed or failed, with the Holm correction and the forward record
- [docs/ROADMAP.md](./docs/ROADMAP.md): what is planned next, in order
- [docs/QUESTS.md](./docs/QUESTS.md): Quests and the checklist before they are turned on
- [docs/RISK_AND_COMPLIANCE.md](./docs/RISK_AND_COMPLIANCE.md): audit log, model register, report sign-off
- [docs/BACKUP_AND_RESTORE.md](./docs/BACKUP_AND_RESTORE.md): backups and moving to another computer
- [docs/HOME_SERVER.md](./docs/HOME_SERVER.md) and [docs/KUBERNETES.md](./docs/KUBERNETES.md): running it for a household, team or class
- [docs/SECURITY.md](./docs/SECURITY.md): accounts, sign-in, sessions, and what is not protected yet
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md): UI rules for contributors
- [CONTRIBUTING.md](./CONTRIBUTING.md): how to contribute, the research rules, and signing off commits

---

## For developers

```bash
npm run lint         # TypeScript
npm test             # unit and server tests (Node's built-in runner, network replaced by fixtures)
npm run build        # production bundle
npm run size:check   # fails if the start-up download or the whole app grows past its limit
npm run test:smoke   # opens every page of the built app in Chromium with all feeds down
npm run check:data   # live check of every source from this computer
npm run check:imf    # prints the IMF series codes the app matches
npm run record:feeds # records every free feed's real reply for the tests (run where the feeds answer), then the shareable subset
npm run preload      # downloads every free feed for every country, for fast offline use
```

Every pull request runs the type check and tests on GitHub (`.github/workflows/ci.yml`); changes to
code also run the build, size check and browser tests, and changes to packaging also build the app
image. The smoke test needs Playwright's Chromium once: `npx playwright install chromium`.
`tests/server.test.ts` and the smoke test start the real server with `tests/helpers/offline-fetch.mjs`
in place of the network.

**Size limits.** Every screen added since the start loads only when it is opened, and each language
downloads only when picked. The start-up download must stay under 465 KB compressed and the whole app
under 7.5 MB; `npm run size:check` enforces both.

**Tests on real replies.** The offline fixtures are hand-written. `npm run record:feeds`, run on a
computer that reaches the feeds, saves what every free feed really sends (gzipped, keys taken out of
every URL, own paid data and AI switched off) in `tests/fixtures/recorded/`, with what the app made of
it. `tests/recorded.test.ts` replays those replies through the real server with the clock set back to
the recording, and fails, naming the source, if a source connected then no longer is or a figure
filled then is now Missing. It is skipped until a recording exists. Record again after adding a feed.
The same run builds `tests/fixtures/recorded-public/` (`npm run record:public`): only the replies from
sources whose terms allow passing data on (`tests/helpers/publicFeeds.mjs`), replayed once to save
what the app reads from them. That folder ships in the public repository, so
`tests/recordedPublic.test.ts` gives outside contributors the same check without a key.

Layout: `server.ts` and `src/server/` (Express API, data pulls and caches), `src/utils/` (one module
per source or calculation, each with a test in `tests/`), `src/components/` (React pages and panels),
`src/data/` (navigation, official calendar, country list), `src/i18n/` (English message files, with
Spanish in `es/` and French in `fr/`). Each panel sits inside a crash guard (`PanelBoundary`), so one
failing panel never blanks the app.

### Integration API

Other apps can read council output from `/api/v1/integration/*` (desks, bundle, publish, an SSE
stream, deliveries, and `openapi.json`). It answers `404 NO_COUNCIL_RUN` until you have run the full
council on that country, and never sends built-in figures. Set `SMCR_INTEGRATION_API_KEY` and
`SMCR_WEBHOOK_HMAC_SECRET` in `.env` to fix the key and signing secret. The same key lets a script
read the [data API](docs/DATA_API.md) addresses, and only those, on a copy with sign-in on.

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

---

## Licence

Code: [Apache License 2.0](./LICENSE). Documentation, methods notes, validation records and Quest
content: [CC BY 4.0](./LICENSE-docs.md). Figures fetched from outside sources keep their own terms
([docs/DATA_LICENCES.md](./docs/DATA_LICENCES.md)); the bundled UCDP datasets are CC BY 4.0 ([NOTICE](./NOTICE)).
Contributions are signed off under the Developer Certificate of Origin (DCO).

Contributions are welcome: see [CONTRIBUTING.md](./CONTRIBUTING.md), the
[code of conduct](./CODE_OF_CONDUCT.md), [GOVERNANCE.md](./GOVERNANCE.md) and, for security problems,
[SECURITY.md](./SECURITY.md). To cite the software, use [CITATION.cff](./CITATION.cff).
