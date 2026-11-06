# User manual

How to use the terminal, page by page. For setup see the [README](../README.md); for every data
source and its settings see [DATA_SOURCES.md](./DATA_SOURCES.md).

The header has three pages: **Workspace · Research · Reports**. **Tools** is inside the **Settings**
window (Menu > Tools, or the Tools tab in Settings). Workspace is the daily start; Research is where
you look into one country, the watchlist side by side, or your own holdings.

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

The page the app opens on is a chat page, laid out like an AI chat app: the conversation with the
council fills the screen and the question box sits at the bottom. **Briefing** (top right of the
chat; an amber dot means an input needs setup) opens a side panel with Your inputs, the watchlist,
What moved, Next two weeks and Watch alerts; on a phone it covers the screen, and *Close* hides it.
The app remembers whether you left it open.

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
When no feed has answered for the watchlist it reads Missing with that reason, not "Nothing moved".

**Watchlist.** A compact card with your list, under Your inputs; the open country is marked *Open* and countries in your imported holdings are marked *Held*. *Pop out* opens the full table in its own window,
with your choice of columns; *Edit* adds or removes countries and switches lists.

**Council chat.** A chat with the council. Type a question in the box at the bottom, or pick one of
the suggestions. Your question appears as a message, and the council answers in the chat: the
summary first, then the documents (the synthesis and one per agent, with how many agents answered
with figures), the agent debate, and one row of actions on each answer: *Save to Reports* (keeps the
answer as the council brief and every document under Reports > Council documents; it then reads
*Saved to Reports* with a link to open Reports), *Copy*, and *Download* (Markdown or PDF). Earlier answers stay in
the chat above the newest one. *New conversation* clears it (saved conversations stay in Saved
research).

The chat is one conversation across the whole app. On Research and Reports, *Council chat* in the
header opens the same chat in a panel on the right (full screen on a phone); questions asked there
show on Workspace too, and an answer that is still being written keeps going when you change page.
*Close* hides the panel; the header button brings it back.

Under the question box, *Options* holds the rest: the countries to ask about, policy documents, the
full council and saved research.

- *Countries*: as named in the question, otherwise the whole watchlist. A country not on the
  watchlist is named as not covered rather than silently answered for the list; *Add … for this
  question* pulls its live figures (any country, up to five at a time) and asks again, without
  changing your watchlist.
- *Agents*: chosen from the question's topic (or by the AI model, if set up). Each answers with
  figures and their sources: Central Bank (policy rate, stance, cycle), Fiscal & Debt (debt path,
  stabilising primary balance, reserves against debt due), Politics & Events (GDELT tone, weekly
  event counts and economic news themes from the GDELT raw files, World Bank stability rank,
  Polymarket odds), Relative Value (cheap or rich against peers), FX (real exchange
  rate against its history), Global Spillover (Hormuz, Taiwan, Russia, commodity prices), Calendar
  (dates in the next 60 days) and Timing (catalysts, cycle clock, positioning, tone shifts; dates,
  never probabilities).
- *Policy documents*: add a PDF or text file, or paste text. The Document agent quotes passages, and
  figures in the document are checked against the app's own figures.
- *Brief*: with Gemini or Ollama set up, a summary agent writes a short brief from the agents'
  answers only. A number check marks any figure it cannot trace to an agent.
- *Follow-up*: once a conversation has started, the box asks follow-ups. "and the currency?" or
  "what about Egypt?" keeps the last question's countries or agents. Asking the same question later shows what changed since last time.
- *Explain*: ask why ("why is Brazil's real rate so high?"), what something means ("what does a weak
  lira mean for households?") or how it feeds through, and the council explains instead of ranking.
  The answer is split into **Data** (what the figures are, each with a numbered source) and
  **Interpretation** (why it is where it is, what it means through each lens: monetary policy,
  public finances, households and firms, trade and external, conflict and politics, markets, and
  what would change the reading). Name a lens ("for the budget", "for households") to get just that
  one; otherwise every lens the agents have figures for is covered. A lens with no figures reads
  *Missing* with the reason. Households and firms are read from inflation, rates and the currency;
  there are no surveys in the app. The same number check applies: a sentence with a number not in
  the agents' figures is removed.
- *Explain on a figure, chart or panel*: an *Explain* link sits beside every figure in an agent
  document and on the Research pages (point at a row on a wide screen to see it), at the top of
  each Research panel, and on every chat chart. It sends that exact figure, with its source and
  date (or the chart's latest points and test results), to Council chat and asks the council to
  explain it; on Research the chat opens in its side panel. Follow up with "and for households?" to
  narrow it.
- *Saved research*: every brief and document is kept on this computer
  (`data/local/research.json`). Open, copy, send to Reports or delete from the list.
- *Run the full council*: nine desk agents debate the open country, then pause in the chat for your
  approval before the final report, which also appears in the chat. It needs Gemini or Ollama (Menu > Settings > AI model). If no model answers, the
  council gives no assessment and no verdict and says so; a desk whose model did not answer is left
  empty. Agent confidence is shown only when the model gave one.
- *Pin this conversation to the figures held now*: answers in the conversation keep using those
  figures even if the feeds refresh. *Use the latest figures* under the box unpins it.

**Snapshots and Re-run.** Every AI summary or explanation is pinned to a snapshot, shown folded
under the answer (`Snapshot 715d5502 · latest data · qwen2.5:32b`). Open it to see when the
question was asked, which data it used, the AI model, the temperature (0) and seed (42), short
hashes of the instructions, the prompt, the inputs and the answer, each agent document read, and
every figure with its source and period. *Re-run on this snapshot* sends exactly the same inputs
to the model set now and says whether the answer is the same word for word, or what changed and
why (a different model, changed app instructions, or the model itself). Snapshots are kept in
`data/local/snapshots/`, named in Menu > Audit log, written into saved and downloaded briefs
(under Method), and included in Menu > Backup. A snapshot edited after it was saved is not
re-run.

**Regression check.** `npm run council:regress` (with the app running) sends a fixed set of
questions with frozen agent answers (`docs/validation/council-regression/cases.json`) through
the same summary step, on your AI model, and checks each reading: for example that Brazil's
policy is read as tight, or that Egypt's debt is not called sustainable when its debt figures are
missing. It prints PASS or FAIL per case with the reason and saves the report in
`data/local/validation/council-regression.json`; each case is a snapshot you can re-run. When a
recorded baseline exists it also says whether the answers match it.

**Recorded baseline (real-model regression in CI).** `npm run council:record` runs the same set
on your referee model (qwen2.5:32b) on a private copy of the server and records every model
reply. Once those are committed, CI replays them and fails when a code change alters what the
model is asked or what the checked answers say. See
`docs/validation/council-regression/README.md`.

**Watch alerts.** Rules you set on the timing figures, for example "CFTC positioning percentile at
or above 90 for any country". There are no built-in thresholds, and a missing figure never
triggers. Rules are kept in `data/local/watch-rules.json`.

**Next two weeks.** Official rate decisions, CPI releases, elections, budget deadlines and IMF
reviews, each linked to its source. Below it, the next three elections, budgets and IMF dates in the
coming year (*Show all* for the rest), with countries where data and price disagree first.

---

## 2. Research

One page, three scopes, chosen at the top: **One country: <name>**, **Compare countries** and **My
holdings**. Every scope has the same four sections, so you learn the page once:

| Section | One country | Compare countries | My holdings |
| --- | --- | --- | --- |
| **Summary** | The brief | Where data and price disagree; growth and inflation | Book brief; the book |
| **Markets & signals** | MarketEdge | MarketEdge table; scenarios | Signals on your holdings |
| **History & data** | Charts, As of, Replicate, Track record | Compare countries table | Import and edit holdings |
| **Sources** | What is live for the country | Each key figure, Live or Missing, per country | The same, for the countries you hold |

The section stays when you switch scope: from Brazil's *Markets & signals*, *Compare countries* opens
on markets for the whole watchlist. Click a country in Compare or My holdings to open it on its own;
*Back to Compare countries* (or *My holdings*) returns you. Research opens on the scope you used last.
On a phone the scopes read *<country> · Compare · Holdings*.

### Compare countries

Your watchlist side by side. Opening it does not count as a visit for *Since your last visit*.
**Summary** holds the first and third panels below, **Markets & signals** the second and fourth,
**History & data** the table, and **Sources** a grid of every country and key figure, each Live or
Missing with its reason.

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

### One country

Pick a country from the list at the top. **Refresh now** pulls every source for it again at once.
The sections are Summary (the brief), Markets & signals (MarketEdge), History & data and Sources.

**Summary (the brief).** Three views of the open country, each a list of observations with the rule behind it:

- *Economist*: growth, inflation, debt, reserves and the external position.
- *Issuer*: market access, external debt falling due in the next 12 months (World Bank/IMF QEDS and
  IDS, BIS debt securities), distress tests and pricing against peers.
- *Official sector*: debt sustainability. Debt path under a baseline and standard shocks, the
  stabilising primary balance and r minus g. Run only when debt, primary balance, growth, inflation
  and the official 10Y yield are all live; otherwise it lists what is missing.

**Markets & signals (MarketEdge).** Under three headings, *Economy and policy*, *Markets and positioning* and *Risks and
links*. The country against its peers: CDS or real yield fitted on the risk score, policy
stance (tight, neutral or loose), the cycle clock (hiking, cutting or on hold and for how long; the
leading indicator phase and last turning point; next decision date), a policy rule check (the policy rate against a simple
Taylor rule: r* of 2%, inflation, half the gap to the bank's own target and half the IMF output gap
where the IMF publishes one; the term is left out and said so elsewhere), FX valuation, carry per unit of
volatility, CFTC futures positioning, US Treasury TIC holdings, IMF reserves and balance of payments,
world reserve currency shares (COFER), shock early warning and the signal track record. The same
readings across the watchlist are under Compare countries.

**History & data.** Every figure that has a run of real observations, as a chart with its source, how often it
comes, the pull date and any gaps (named, never filled). Policy rate (BIS), monthly inflation, the OECD
leading indicator, CFTC positioning and TIC holdings come with their own history. Government debt,
primary balance, growth, IMF inflation, output gap, reserves (months of imports and USD), current
account, external debt, short-term debt and political stability come with every year the World Bank
or IMF WEO publish (saved in data/history/, refreshed weekly); IMF years from the current one on are
marked "IMF projection" and never shown as the latest figure. Any other figure gains one point per
weekly pull from the pull archive, each with what the source said that day. Click
a figure in the country header to open its history. *Show the numbers* lists every observation.
*Download this series* and *Download every series* save CSV files in long format (one row per
observation, with unit, frequency, source, the source that day and the pull date).
Figures with no history yet are listed with the reason.

**Sources.** Every figure the country pages use, with its source and date, or why it is missing and
what would fill it. *Download these figures* saves them as CSV: value, unit, period and source for each live
figure; "Missing" and the reason for the rest, never a number.

*Older than usual* lists any dated figure that is older than its source normally runs (how often it
comes out plus its usual delay: a daily yield more than 7 days old, a monthly CPI more than 2 months
back, a weekly CFTC report more than 14 days old), with why it runs behind and the fresher source that
would replace it, if there is one. Annual IMF and World Bank figures are not judged; their year is
shown beside them. When the Central Bank, Fiscal & Debt, Relative Value, FX or Timing agent answers
with such a figure, it says so under what it could not answer.

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

### My holdings

Import your holdings as CSV under **History & data** (a template is provided), or add positions one at
a time. **Summary** shows the book brief and the book, **Markets & signals** the signals on your
holdings, and **Sources** what is live for each country you hold. Holdings, watchlists,
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

## 3. Reports

**Policy reviews.** At the top of Reports. A step-by-step case file for a principal, economist or
politician looking for ways to improve policy in one country, with the council's help. Start one with
*New policy review*, or with *Start a policy review* under any Council chat answer (the question
becomes the problem). Six steps, in order:

1. **Frame.** Country, the problem in a sentence or two, the goal (which indicator, lower / higher /
   stable, optional target and month), constraints, who it is for, and the **As of** day. Every later
   step reads the data the app had saved on or before that day.
2. **Diagnose.** Twelve standard indicators from that saved pull, each numbered [1] to [12] with its
   source and period, or Missing with the reason, plus the real policy rate and r minus g when their
   inputs are live.
3. **Options.** Add up to four options of your own if you like, then *Ask the council*. It ranks
   options for the goal from the frame and diagnosis only, at temperature 0, each with how it works,
   time to effect, trade-offs, who bears the cost, what must be true and risks, and one sentence from
   each council lens. Sentences with numbers that are not in the diagnosis are removed and listed. No
   AI model? *Save my options only* keeps yours, marked not assessed.
4. **Evidence.** Charts and tests (Taylor gap, real rate, does the policy rate lead inflation, r minus
   g, leading indicator), past policy-rate moves with inflation a year later, and the validation status
   of each signal the options lean on. Every series is cut at the As of day.
5. **Recommendation memo.** Pick the option, add your reasoning, what to watch and a review date. The
   memo is assembled from the steps above with no AI, cites every figure by number, and opens with
   "Research, not validated advice" until the signals behind it pass their backtests. Mark it Reviewed
   and Approved (with your name and the memo's hash); download Markdown or PDF.
6. **Track outcomes.** On the review date, *Check outcomes* sets the latest saved figures beside the
   ones the review started from and says whether the goal indicator moved the right way. *Review
   again* starts a new review with the same frame on today's data, linked to this one.

Changing an earlier step marks later ones **Out of date** until they are run again. Every step is
saved with a hash and written to the audit log. Kept in `data/local/reviews.json`; see
[POLICY_REVIEW.md](./POLICY_REVIEW.md) for the method.

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

## 4. Tools (Menu > Tools, inside Settings)

- **Groups**: every working tool, grouped by use (Council chat, Keep up, Screen and compare
  countries, Study one country, Look back, Your portfolio, Write and share). Click a group to open
  it; *Open all* opens every group and *Show sources* lists each tool's sources.
- **Data connections**: the same check as `npm run check:data`, one line per source. *Check again*
  re-runs it.
- **Hidden desks**: each older desk, what live input it would need to come back, and which ready
  tool already covers it.

---

## 5. Menu

- **Tools**: opens Settings on its Tools tab (section 6). Opening a tool closes Settings and goes to it.
- **Settings** (⌘, or Ctrl+,): free keys (FRED, EIA, UN Comtrade, Turkey EVDS), your own paid data
  (CDS source Off, My CSV or My LSEG), and the Gemini key. Each key has a Test button. Keys are
  saved on this computer, shown masked, and can be changed only from this computer.
- **AI model**: Ollama (local), Gemini, hybrid, or an OpenAI-compatible server such as LM Studio.
- **Offline data**: downloads every free feed for every country for fast, offline use (below). Shows
  countries ready, size on this computer, an estimate for what is left, and anything not saved with
  the reason.
- **Show all tools**: brings back the hidden desks and tabs. Remembered in this browser.
- **Morning brief** (Settings > Morning brief): at a time you set, the council answers your standing
  questions (up to four; three starting ones on policy stance, cheap or rich, and coming dates) about
  the watchlist you pick, your AI model writes each summary, and each is saved to Reports > Saved
  research as "Morning brief: <question>", with what moved since the same question last ran. *Run
  now* runs it at once. The time is read in your browser's time zone (right under Docker too). The app
  must be running; a brief missed while it was closed runs when it next starts that day. Without an AI
  model the agents' answers are saved with no summary. Settings are kept in
  `data/local/morning-brief.json`.
- **Models & validation**: every rule in the app that turns figures into a call (policy rule check,
  leading-indicator turns, CFTC crowding, CDS cheap/rich, real exchange rate gap, shock early
  warning, the disagreement ranking, and the descriptive ones), with what it says, its rule, inputs,
  limits and status. The same status shows as a badge beside each panel; click it to open its row.
  *Not validated* stays until a backtest passes. *Run backtests* (or `npm run backtest`) runs the
  pre-registered tests in `docs/validation/preregistered/`: each file fixes the rule, the sample, the
  outcome window and the pass mark (enough cases, a lift over the base rate, a p-value) before any
  run, and its SHA-256 is listed in `manifest.json`; a file that no longer matches its hash is refused.
  The tests pull the long free histories (BIS policy rates since 1990, the OECD leading indicator,
  CFTC since 2006, OECD consumer prices), so they need a connection. A verdict (passed, failed, too few cases) replaces the
  badge and is saved in `data/local/validation/results.json` and in the audit log. Tests: leading-
  indicator turn to policy move, CFTC crowding to unwind, and the policy rule check (Taylor gap:
  does a tight reading come before a cut, and a loose one before a hike, within 6 months, judged
  against each bank's inflation target as it stood at the time, from `src/data/inflationTargetHistory.ts`).
  Every verdict also carries a *stricter check* (method 2). Method 1 counts each case as independent;
  but turns and policy moves bunch in global cycles, and CFTC entries in several USD crosses land in
  the same weeks, so method 1 overstates how sure a result is. Method 2 redraws whole calendar years
  of cases together 4,000 times (fixed seed, so the same data give the same answer), reports a 90%
  range for the lift and a p-value (how often the lift vanishes when the years are redrawn), and asks
  that the lift is positive in at least half the series with five or more cases. It also shows the
  lift by series and what is left when any one series is dropped. A test registered under method 1
  keeps its verdict; when it passed but fails method 2 the badge reads *Passed, fails stricter check*.
  A test file with `"framework": 2` is judged by method 2. A new version of a failed rule carries
  `retestOf` (the earlier version, its verdict and what changed) and is shown as a re-test.
  Later versions sit beside the first as `<id>.v2.json`, `<id>.v3.json`; every version runs, the
  badge shows the latest, and the row lists the earlier versions' verdicts. Registered so far:
  `cftc_crowding.v2.json`, the same rule as v1 judged by method 2, and `taylor_gap.v2.json`, a
  re-test of the failed Taylor gap that adds the output-gap term (0.5 x the app's real-time output
  gap from IMF real GDP growth, year t used from April of t+1), judged by method 2. The Taylor v2 run
  also pulls IMF real GDP growth for each country with a dated target.
  Also registered (method 2): the growth and inflation quadrant (`regime_quadrant.json`: both up
  before a hike, both down before a cut, within 6 months), the cycle clock (`cycle_clock.json`: once
  it reads hiking or cutting, another move the same way within 6 months) and the Timing Agent's one
  call (`timing_agent.json`: crowded and already turning before a further 3-point unwind within 8
  weeks). Until they are run these three read *Not validated*.
- **Sign-off on saved research**: each saved council conversation (Saved research) shows Draft,
  Reviewed or Approved. *Mark reviewed*, then *Approve*, each with your name; the step records the
  SHA-256 of the report's content. If the report changes afterwards (a follow-up saved over it) it
  reads *Changed after sign-off* until reviewed again. While you are the only user the approval says
  "self-approved, no second reviewer". An approved report cannot be deleted until the approval is
  withdrawn. Steps are kept in `data/local/signoffs.json` and in the audit log.
- **Audit log**: every council answer (the question, the AI model that wrote the summary or "none",
  and each figure the agents used with its source and period, plus what was missing) and every save,
  delete, download, settings, key and AI model change, newest first. Search it or pick a kind, and
  download it as CSV or as the log file itself. Kept in `data/local/audit/audit-log.jsonl`; lines are
  only added, each chained to the one before by a SHA-256 hash, and the window checks the chain each
  time it opens: an entry changed or removed after it was written shows as "Check failed". Someone who
  rewrites the whole file could rebuild the chain, so keep the latest hash or an export elsewhere if
  that matters. Keys, document text and holdings amounts are never logged. The log is not in backups.
- **Backup** (Settings > Backup): *Download backup* saves one file with your saved research
  (briefs, documents, notebooks, teaching episodes), policy reviews, watch alerts, holdings, watchlists, added
  countries and AI model settings. API keys are never in it. *Choose a backup file* shows what a
  file holds, then *Restore this backup* replaces what is saved here with it; a copy of what was
  here is saved first in `data/local/backups/`, and AI keys already on this computer are kept. Use it
  to move to another computer or to keep a copy.

### Download all country data (for offline use)

One pass over every free feed for every country the app covers: the world feeds once (BIS policy
rates, OECD leading indicators and inflation, national inflation, CFTC, TIC, IMF reserves and COFER,
commodity prices, UN Comtrade), then for each country its latest figures from every feed and the full
World Bank and IMF history, and last the GDELT raw files (see *GDELT events and news themes* below). Everything is saved under `data/` (live, history, archive), so pages,
charts and the History tab then load from disk and keep working without a connection. Screens still
show only the newest value; the full runs are behind History & data and the downloads.

In the app: Menu > Offline data > *Download all country data*. The window shows the step running,
countries ready, the size on disk and an estimate for what is left (the average of the countries
already saved; "known after the first country" until then). You can close it; the download carries
on. *Stop after this step* stops it; *Carry on downloading* picks up where it stopped.

**Offline.** When the free feeds cannot be reached from this computer, an *Offline* pill appears in
the top bar with the date of the saved data. Pages, History and downloads keep working from disk; the
app does not try its background refreshes until the feeds answer again (checked every minute).

From a terminal in the app folder:

```bash
npm run preload                        # every country
npm run preload -- --countries=BRA,TUR # only these
npm run preload -- --fresh             # download everything again, even what was saved today
docker compose exec econquest npm run preload   # when the app runs in Docker
```

Each step prints one line (ok, FAIL with the reason, or needs setup when a key is needed). Ctrl+C stops after
the current step; the next run skips every step saved within the last day and carries on. Progress is
kept in `data/local/preload.json`. A step that takes longer than 3 minutes (`PRELOAD_STEP_TIMEOUT_S`
in `.env` changes it) is recorded as not saved and the run moves on. GDELT allows few requests: the
run does not wait out its 15-minute pause; GDELT news tone fills in on a later hourly refresh. A feed that fails leaves its figures Missing with
the reason; nothing is filled in.

### GDELT events and news themes (raw files)

GDELT publishes its data as files every 15 minutes, free to download. The app reads two tables:

- **Events**: who did what to whom, coded by type (protest, sanction, assault and so on), with an
  intensity score (Goldstein: -10 most conflictual, +10 most cooperative) and a place. An event
  counts for a country when it happens there or the country is one of the two actors.
- **Global Knowledge Graph (GKG)**: one row per news article, with its themes, the places, people and
  organisations it names, and its tone. An article counts for a country when it names a place
  there. Themes are grouped: inflation and prices, central bank and interest rates, debt and default,
  currency and reserves, taxes and spending, IMF and other lenders, markets, jobs, trade, sanctions,
  protests.

Where it shows: Research > one country > Markets & signals > *News and events* (the latest complete
week against the weeks before, theme shares, the most-named people and organisations, and a
week-by-week table), the Politics & Events Agent, and the figures sent to the full council. Before
the files are pulled, all three say Missing.

How it is pulled: the last step of *Download all country data*, or from a terminal:

```bash
npm run gdelt:pull -- --estimate   # files left and download size, downloads nothing
npm run gdelt:pull                 # pull (Ctrl+C stops; the next run carries on)
```

The first pull covers `GDELT_RAW_WEEKS` weeks (default 8: about 5,400 events files and 450 GKG
files, roughly 3.4 GB to download). Each file is read and then thrown away; only a small summary per
day is kept in `data/live/gdelt-raw/`. GKG files are large, so one every `GDELT_GKG_EVERY_HOURS`
hours is read (default 3); theme figures are then shares of the articles read, and the panel says
so. After the first pull the app tops it up once a week by itself (only the new files). Run either
the app's download or the terminal pull, not both at once.

---

## 6. When something looks wrong

- **Everything reads Missing.** Open Menu > Tools > Data connections. If every source fails, the computer
  is offline or a VPN or firewall blocks it; figures fill in within the hour once it is back.
- **One panel shows "could not be drawn".** The rest of the app still works. Press Try again; if it
  keeps failing, the error text under it helps find the cause.
- **GDELT says it is paused.** GDELT allows few requests; after a refusal the app waits 15 minutes.
  Its figures are pulled weekly and show their pull date. The raw-file pull (events and news themes)
  is not limited this way; if it stops part way, run it again and it carries on.
- **"This app only answers on localhost".** You opened it by a name other than localhost or
  127.0.0.1. Use `http://localhost:<port>`, or list the name in `ALLOWED_HOSTS` in `.env` if you
  opened the app to your network on purpose.
- **The full council says no AI model answered.** Same check as below; nothing is filled in for it.
- **The AI summary does not appear.** Menu > Settings > AI model: check Ollama is running, or a Gemini key is
  saved. Every figure and agent answer works without it.
