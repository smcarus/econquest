# User manual

How to use the terminal, page by page. For setup see the [README](../README.md); for every data
source and its settings see [DATA_SOURCES.md](./DATA_SOURCES.md).

The header has five pages: **Workspace · Country Research · Compare · Portfolio · Reports**. **Tools**
is inside the **Settings** window (Menu > Tools, or the Tools tab in Settings).
Workspace is the daily start; Compare holds the panels that set the watchlist side by side.

**Reading any figure.** A figure is shown only when a real source supplied it. Hover it for the
source and date. A dash or **Missing** means no source answered, and the note beside it says why:

- *Needs setup*: a key or file is missing (Menu > Settings says which).
- *Feed did not answer*: the source was down or unreachable on the last pull; it is retried within
  the hour.
- *No source yet*: no free official source is wired in for that figure and country.
- *kept from the <date> pull*: the latest pull failed for that source, so the last good figure is
  shown with its original date.

Figures worked out by the app from live inputs (risk scores, debt paths, cheap or rich readings) are
labelled with the agent or rule that made them, for example "Fiscal & Debt Agent", and are never
shown when an input is missing.

---

## 1. Workspace

The page the app opens on. From the top:

**Your inputs.** One chip for each thing you set that changes what Workspace shows: watchlist, open
country, data feeds, free keys, AI model, holdings and saved research. Each chip shows its state
(green set, amber needs setup with the reason, grey optional and not used yet), names the panels it
feeds, and opens the place where you change it. On a new install, the amber chips are the setup
steps. Point at a chip to outline the panels it feeds. Under each panel title a *Uses:* line names
the inputs behind it, marks any that are Missing or need setup, and opens one when you press it.

**Since your last visit.** What moved on the watchlist since you last opened the app: policy rate
moves (BIS), new monthly inflation prints, turns in the OECD leading indicator, 10Y yield moves of 25
bp or more, and watch alerts that started firing. Each line has its date and source. On a first
visit it lists policy moves from the last 30 days. Your last visit is remembered in this browser only.

**Watchlist.** A compact card with your list. *Pop out* opens the full table in its own window,
with your choice of columns; *Edit* adds or removes countries and switches lists.

**Ask the council.** Type a question, or pick one of the suggestions.

- *Countries*: as named in the question, otherwise the whole watchlist. A country not on the
  watchlist is named as not covered rather than silently answered for the list; *Add … for this
  question* pulls its live figures (any country, up to five at a time) and asks again, without
  changing your watchlist.
- *Agents*: chosen from the question's topic (or by the AI model, if set up). Each answers with
  figures and their sources: Central Bank (policy rate, stance, cycle), Fiscal & Debt (debt path,
  stabilising primary balance, reserves against debt due), Politics & Events (GDELT tone, World Bank
  stability rank, Polymarket odds), Relative Value (cheap or rich against peers), FX (real exchange
  rate against its history), Global Spillover (Hormuz, Taiwan, Russia, commodity prices), Calendar
  (dates in the next 60 days) and Timing (catalysts, cycle clock, positioning, tone shifts; dates,
  never probabilities).
- *Policy documents*: add a PDF or text file, or paste text. The Document agent quotes passages, and
  figures in the document are checked against the app's own figures.
- *Brief*: with Gemini or Ollama set up, a summary agent writes a short brief from the agents'
  answers only. A number check marks any figure it cannot trace to an agent.
- *Follow-up*: "and the currency?" or "what about Egypt?" keeps the last question's countries or
  agents. Asking the same question later shows what changed since last time.
- *Saved research*: every brief and document is kept on this computer
  (`data/local/research.json`). Open, copy, send to Reports or delete from the list.
- *Run the full council*: nine desk agents debate the open country, then pause for your approval
  before the final report. It needs Gemini or Ollama (Menu > AI model). If no model answers, the
  council gives no assessment and no verdict and says so; a desk whose model did not answer is left
  empty. Agent confidence is shown only when the model gave one.

**Watch alerts.** Rules you set on the timing figures, for example "CFTC positioning percentile at
or above 90 for any country". There are no built-in thresholds, and a missing figure never
triggers. Rules are kept in `data/local/watch-rules.json`.

**Next two weeks.** Official rate decisions, CPI releases, elections, budget deadlines and IMF
reviews, each linked to its source.

---

## 2. Compare

Your watchlist side by side, in this order. Opening Compare does not count as a visit for *Since
your last visit*.

**Where data and price disagree.** One line per country, biggest gap first: cheap or rich spread
against peers, policy rate against inflation, carry and currency valuation. Built from live figures
only. Stated rules for discussion, not trade advice.

**MarketEdge.** Your watchlist plus the US, China, Russia, UK, EU and India. Columns: 10Y yield,
spread over the US 10Y, 3-month and 12-month changes, CDS (your own data only), risk score, real FX
against its 10-year average, OECD leading indicator, last policy move, and cheap or rich against
peers. Sort by *Cheap to rich* or *Moving most*. Without a CDS file, cheap or rich uses the real
10Y yield against the risk score when four or more countries have both.

**Growth and inflation.** Each country placed by the 6-month change in its OECD leading indicator
(right = picking up) and the 3-month change in its monthly inflation (up = rising), with a line on what
that quadrant means for policy. A country without both figures is listed with what is missing.

**Scenarios.** Who is most exposed to a Hormuz closure, a Taiwan blockade, tighter Russia
sanctions, and the last 12 months of commodity prices, from UN Comtrade trade shares, World Bank
Pink Sheet and EIA prices.

**Compare countries.** Tick countries and figures, then *Build table*. *Latest values* gives one cell per
country and figure, with its period underneath; hover for the source, or for the reason when it reads
Missing. *Full history* counts every observation; *Download CSV* saves either view, with unit, period,
source and the reason for every missing cell, ready for Excel, R or Stata.

---

## 3. Country Research

Pick a country from the list at the top. **Refresh now** pulls every source for it again at once.
The tabs are Brief, MarketEdge, History and Sources.

**Brief.** Three views of the open country, each a list of observations with the rule behind it:

- *Economist*: growth, inflation, debt, reserves and the external position.
- *Issuer*: market access, external debt falling due in the next 12 months (World Bank/IMF QEDS and
  IDS, BIS debt securities), distress tests and pricing against peers.
- *Official sector*: debt sustainability. Debt path under a baseline and standard shocks, the
  stabilising primary balance and r minus g. Run only when debt, primary balance, growth, inflation
  and the official 10Y yield are all live; otherwise it lists what is missing.

**MarketEdge.** Under three headings, *Economy and policy*, *Markets and positioning* and *Risks and
links*. The country against its peers: CDS or real yield fitted on the risk score, policy
stance (tight, neutral or loose), the cycle clock (hiking, cutting or on hold and for how long; the
leading indicator phase and last turning point; next decision date), a policy rule check (the policy rate against a simple
Taylor rule: r* of 2%, inflation, half the gap to the bank's own target and half the IMF output gap
where the IMF publishes one; the term is left out and said so elsewhere), FX valuation, carry per unit of
volatility, CFTC futures positioning, US Treasury TIC holdings, IMF reserves and balance of payments,
world reserve currency shares (COFER), shock early warning and the signal track record. The same
readings across the watchlist are on Compare.

**History.** Every figure that has a run of real observations, as a chart with its source, how often it
comes, the pull date and any gaps (named, never filled). Policy rate (BIS), monthly inflation, the OECD
leading indicator, CFTC positioning and TIC holdings come with their own history; every other figure
gains one point per weekly pull from the pull archive, each with what the source said that day. Click
a figure in the country header to open its history. *Show the numbers* lists every observation.
*Download this series* and *Download every series* save CSV files in long format (one row per
observation, with unit, frequency, source, the source that day and the pull date).
Figures with no history yet are listed with the reason.

**Sources.** Every figure the country pages use, with its source and date, or why it is missing and
what would fill it. *Download these figures* saves them as CSV: value, unit, period and source for each live
figure; "Missing" and the reason for the rest, never a number.

Every download (series, figures, *As of* figures, Compare countries) also comes as an Excel workbook:
the *Excel* button next to each CSV button. The workbook holds the same rows and columns as the CSV on a
*Data* sheet (bold, frozen header with filters; numbers stored as numbers, text as text so nothing runs as
a formula) and an *About* sheet naming the file and when it was made. Missing values stay Missing.

*As of a past day* (below the chart): pick a date and see every figure the app held on that day,
from its saved pulls, beside today's, with the change where both sides are live. A day without a pull
uses the pull before it. Each value keeps its own source and period; hover for them, or for the
reason a value reads Missing. *Download these figures* saves that day's figures as CSV. The archive
gains a day with each pull, so the choice of dates grows from the day you install this version.

*Replicate a rate decision* (below that): pick one of the central bank's moves from the BIS series, or
any date, and see the policy rate the week before, the latest monthly inflation before the decision
month, the bank's target, the OECD leading indicator, what a simple Taylor rule pointed to (raise,
cut, or hold within 1 pt) and what the bank did. Two caveats are always shown: today's series may hold
revised figures rather than the first release, and the output gap is left out because the IMF's is
revised every vintage. A teaching and checking tool, not a model of how the bank decides.

*Track record* (below that): the Taylor rule signal on each saved pull (raise, cut or hold within 1 pt)
and what the central bank did in the 90 days after it. The policy rate and the IMF output gap are read
from that day's saved pull, as the app held them; monthly inflation uses only months at least 45 days
old on the pull day. A run of weekly pulls with the same signal counts as one call. Each call stays
*pending* until 90 days have passed and the BIS series reaches that day. The line on top counts calls
followed and says when there are too few (under 5) to lean on. No odds are given. *Download log* saves
every pull as CSV or Excel. The log starts with the archive, so it fills in week by week.

With Menu > Show all tools, more tabs appear (Debt & fiscal, Markets, Politics & geo, Scenarios,
Restructuring) holding the older desks.

---

## 4. Portfolio

Import your holdings as CSV (Portfolio > Holdings; a template is provided). Holdings, watchlists,
countries you added and the AI model settings are kept in `data/local/workspace.json`, so the app
shows the same ones under Docker and `npm run dev`, and clearing the browser does not lose them. Without holdings the
page uses your watchlist at equal weight. The book brief shows concentration, where the risk sits,
the DV01 cost of a 10 bp move and dates to watch. The client brief says the same in plain language.

*Signals on your holdings* lays each imported holding over the app's signals that bear on it and marks
each signal as leaning with or against the position. Local-currency bonds get the Taylor rule check, the
policy cycle and the 3-month move in the 10Y yield (25 bps or more counts): lower rates lean with a long
bond and against a short. Every credit holding gets the shock early warning: an alert leans against a
long bond or sold protection and with bought protection. FX and other holdings are listed but not
marked, since the holdings file does not say which leg is long. The top line splits the gross notional
into against, mixed, with and nothing either way. Missing inputs are named; built-in figures never
count. A signal against a position is a reason to look, not a call to trade.

---

## 5. Reports

Templates built on the briefs: country note, issuer note, sustainability assessment, portfolio
review, client portfolio review and the council brief. Each shows its sources, and missing inputs
are named rather than filled. Sourced figures carry a reference number, and a **References** list at
the end names each source once with the publisher's page and the date the app read it; figures
worked out by a stated rule keep their method beside them. Download as Markdown or PDF.

**Research notebooks.** Below the templates. Start a notebook for a topic ("Brazil fiscal"), or pick
a suggested country where you have two or more saved conversations. Tick the saved council
conversations and documents that belong in it and write your own notes. *Download notebook* gives one
Markdown file: your notes, each conversation as its full council brief with sources and references,
and the opening of each document. Deleting a notebook keeps the conversations and documents; deleting
a conversation takes it out of every notebook. Kept in `data/local/research.json`.

**Teaching episodes.** Below the notebooks. Give an episode a title, a country and a past decision
date (the moves listed under *Replicate a rate decision* make good dates), and write the questions,
one per line. *Student handout* is a Markdown file with the data as it stood the week before (policy
rate, latest inflation, target, leading indicator, each with its source and the replay's caveats) and
the questions. *Teacher copy* adds what the bank did, the Taylor rule reading and your notes. Episodes
hold no figures of their own; the handout reads them from the app's series when you download it.

---

## 6. Tools (Menu > Tools, inside Settings)

- **Groups**: every working tool, grouped by use (Ask the council, Keep up, Screen and compare
  countries, Study one country, Look back, Your portfolio, Write and share). Click a group to open
  it; *Open all* opens every group and *Show sources* lists each tool's sources.
- **Data connections**: the same check as `npm run check:data`, one line per source. *Check again*
  re-runs it.
- **Hidden desks**: each older desk, what live input it would need to come back, and which ready
  tool already covers it.

---

## 7. Menu

- **Tools**: opens Settings on its Tools tab (section 6). Opening a tool closes Settings and goes to it.
- **Settings** (⌘, or Ctrl+,): free keys (FRED, EIA, UN Comtrade, Turkey EVDS), your own paid data
  (CDS source Off, My CSV or My LSEG), and the Gemini key. Each key has a Test button. Keys are
  saved on this computer, shown masked, and can be changed only from this computer.
- **AI model**: Ollama (local), Gemini, hybrid, or an OpenAI-compatible server such as LM Studio.
- **Show all tools**: brings back the hidden desks and tabs. Remembered in this browser.

---

## 8. When something looks wrong

- **Everything reads Missing.** Open Menu > Tools > Data connections. If every source fails, the computer
  is offline or a VPN or firewall blocks it; figures fill in within the hour once it is back.
- **One panel shows "could not be drawn".** The rest of the app still works. Press Try again; if it
  keeps failing, the error text under it helps find the cause.
- **GDELT says it is paused.** GDELT allows few requests; after a refusal the app waits 15 minutes.
  Its figures are pulled weekly and show their pull date.
- **"This app only answers on localhost".** You opened it by a name other than localhost or
  127.0.0.1. Use `http://localhost:<port>`, or list the name in `ALLOWED_HOSTS` in `.env` if you
  opened the app to your network on purpose.
- **The full council says no AI model answered.** Same check as below; nothing is filled in for it.
- **The AI summary does not appear.** Menu > AI model: check Ollama is running, or a Gemini key is
  saved. Every figure and agent answer works without it.
