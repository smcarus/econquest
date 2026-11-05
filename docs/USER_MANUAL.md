# User manual

How to use the terminal, page by page. For setup see the [README](../README.md); for every data
source and its settings see [DATA_SOURCES.md](./DATA_SOURCES.md).

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

**Getting started.** Shown on a new install until its four steps are done (see the README) or you
press Hide.

**Watchlist.** A compact card with your list. *Pop out* opens the full table in its own window,
with your choice of columns; *Edit* adds or removes countries and switches lists.

**Ask the council.** Type a question, or pick one of the suggestions.

- *Countries*: as named in the question, otherwise the whole watchlist. A country not on the
  watchlist is named as not covered rather than silently answered for the list.
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
  before the final report.

**Watch alerts.** Rules you set on the timing figures, for example "CFTC positioning percentile at
or above 90 for any country". There are no built-in thresholds, and a missing figure never
triggers. Rules are kept in `data/local/watch-rules.json`.

**Where data and price disagree.** One line per country, biggest gap first: cheap or rich spread
against peers, policy rate against inflation, carry and currency valuation. Built from live figures
only. Stated rules for discussion, not trade advice.

**MarketEdge.** Your watchlist plus the US, China, Russia, UK, EU and India. Columns: 10Y yield,
spread over the US 10Y, 3-month and 12-month changes, CDS (your own data only), risk score, real FX
against its 10-year average, OECD leading indicator, last policy move, and cheap or rich against
peers. Sort by *Cheap to rich* or *Moving most*. Without a CDS file, cheap or rich uses the real
10Y yield against the risk score when four or more countries have both.

**Scenario exposure.** Who is most exposed to a Hormuz closure, a Taiwan blockade, tighter Russia
sanctions, and the last 12 months of commodity prices, from UN Comtrade trade shares, World Bank
Pink Sheet and EIA prices.

**Compare countries.** Tick countries and figures, then *Build table*. *Latest values* gives one cell per
country and figure, with its period underneath; hover for the source, or for the reason when it reads
Missing. *Full history* counts every observation; *Download CSV* saves either view, with unit, period,
source and the reason for every missing cell, ready for Excel, R or Stata.

**Next two weeks.** Official rate decisions, CPI releases, elections, budget deadlines and IMF
reviews, each linked to its source.

---

## 2. Country Research

Pick a country from the list at the top. **Refresh now** pulls every source for it again at once.

**Brief.** Three views of the open country, each a list of observations with the rule behind it:

- *Economist*: growth, inflation, debt, reserves and the external position.
- *Issuer*: market access, external debt falling due in the next 12 months (World Bank/IMF QEDS and
  IDS, BIS debt securities), distress tests and pricing against peers.
- *Official sector*: debt sustainability. Debt path under a baseline and standard shocks, the
  stabilising primary balance and r minus g. Run only when debt, primary balance, growth, inflation
  and the official 10Y yield are all live; otherwise it lists what is missing.

**MarketEdge.** The country against its peers: CDS or real yield fitted on the risk score, policy
stance (tight, neutral or loose), the cycle clock (hiking, cutting or on hold and for how long; the
leading indicator phase and last turning point; next decision date), a policy rule check (the policy rate against a simple
Taylor rule: r* of 2%, inflation, half the gap to the bank's own target and half the IMF output gap
where the IMF publishes one; the term is left out and said so elsewhere), FX valuation, carry per unit of
volatility, CFTC futures positioning, US Treasury TIC holdings, IMF reserves and balance of payments,
world reserve currency shares (COFER), shock early warning and the signal track record.

**Overview.** Every figure the country pages use, with its source and date, or why it is missing and
what would fill it. *Download these figures* saves them as CSV: value, unit, period and source for each live
figure; "Missing" and the reason for the rest, never a number.

**History.** Every figure that has a run of real observations, as a chart with its source, how often it
comes, the pull date and any gaps (named, never filled). Policy rate (BIS), monthly inflation, the OECD
leading indicator, CFTC positioning and TIC holdings come with their own history; every other figure
gains one point per weekly pull from the pull archive, each with what the source said that day. Click
a figure in the country header to open its history. *Show the numbers* lists every observation.
*Download this series* and *Download every series* save CSV files in long format (one row per
observation, with unit, frequency, source, the source that day and the pull date).
Figures with no history yet are listed with the reason.

With Menu > Show all tools, more tabs appear (Debt & fiscal, Markets, Politics & geo, Scenarios,
Restructuring) holding the older desks.

---

## 3. Portfolio

Import your holdings as CSV (Portfolio > Holdings; a template is provided). Without holdings the
page uses your watchlist at equal weight. The book brief shows concentration, where the risk sits,
the DV01 cost of a 10 bp move and dates to watch. The client brief says the same in plain language.

---

## 4. Reports

Templates built on the briefs: country note, issuer note, sustainability assessment, portfolio
review, client portfolio review and the council brief. Each shows its sources, and missing inputs
are named rather than filled. Download as Markdown or PDF.

---

## 5. Tools

- **Ready tools**: every working tool, what it shows and its sources, with a link to it.
- **Data connections**: the same check as `npm run check:data`, one line per source. *Check again*
  re-runs it.
- **Hidden desks**: each older desk, what live input it would need to come back, and which ready
  tool already covers it.

---

## 6. Menu

- **Settings** (⌘, or Ctrl+,): free keys (FRED, EIA, UN Comtrade, Turkey EVDS), your own paid data
  (CDS source Off, My CSV or My LSEG), and the Gemini key. Each key has a Test button. Keys are
  saved on this computer, shown masked, and can be changed only from this computer.
- **AI model**: Ollama (local), Gemini, hybrid, or an OpenAI-compatible server such as LM Studio.
- **Show all tools**: brings back the hidden desks and tabs. Remembered in this browser.

---

## 7. When something looks wrong

- **Everything reads Missing.** Open Tools > Data connections. If every source fails, the computer
  is offline or a VPN or firewall blocks it; figures fill in within the hour once it is back.
- **One panel shows "could not be drawn".** The rest of the app still works. Press Try again; if it
  keeps failing, the error text under it helps find the cause.
- **GDELT says it is paused.** GDELT allows few requests; after a refusal the app waits 15 minutes.
  Its figures are pulled weekly and show their pull date.
- **The AI summary does not appear.** Menu > AI model: check Ollama is running, or a Gemini key is
  saved. Every figure and agent answer works without it.
