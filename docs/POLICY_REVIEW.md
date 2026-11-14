# Policy review

A guided, repeatable case file for a principal, economist or politician who uses the council to look
for ways to improve policy and macroeconomic conditions in one country.

It lives in **Reports > Policy reviews**. A review can also be started from a Council chat answer.

> Everything a policy review produces is **research, not validated advice**. The memo says so until
> the backtests behind the signals it relies on pass (Menu > Models & validation).

## The six steps

| Step | What you do | What is recorded |
| --- | --- | --- |
| 1. Frame | Country, the problem in one or two sentences, the goal (indicator, lower / higher / stable, optional target and date), constraints (peg, fiscal room, election...), who it is for, and the **As of** day. | The frame as entered. |
| 2. Diagnose | The app fills a fixed set of indicators for the As of day: inflation vs target, growth and output gap, policy rate and real rate, Taylor gap, government debt, r minus g, primary balance, reserves, current account, leading indicator. Standard charts (Taylor gap, real rate, r minus g, Phillips curve). | Every figure with its value, source, period and the pull it came from; Missing figures with the reason. |
| 3. Options | The council answers a set question built from the frame. Agents write their standard documents; synthesis ranks the options with trade-offs, who bears the cost and what would need to be true. Each option carries a pre-mortem: how it could fail and one to three figures that would show it first (required; an option without one is listed under gaps). You can add your own options. | The question template version, the AI model, every agent and synthesis document, your options. |
| 4. Evidence | For each option: past episodes from the country's own history (Replicate a rate decision), Chart Agent tests (lead/lag, Granger, regression) with their settings, the number check, and the Models & validation status of each signal used. | Each test with its inputs, settings and result. |
| Behavioural check (G33, beside step 4) | For each option, where it depends on how people behave (take-up, response to a tax, trust in a target, defaults, losses and framing, acting now for a gain later), found by fixed word rules in the saved option text, each with published studies from the fixed list in `src/data/behaviouralEvidence.ts`. Effect sizes only if you enter them with a source. Description, not a tested signal. Not part of the step chain: it does not change the memo or mark later steps out of date. | Your sizes with their sources, the hash of the Options step they were entered against (Out of date once options run again), their own hash and an audit log entry. |
| 5. Recommendation memo | Written only from steps 1 to 4. Cites every figure by number with source and as-of. States what to watch and the review date. Triggers in a wording the app reads ("above 8", "below 3", "target 4", "rises", "falls") are checked on the start page against the latest saved figures (Policy review watch). Draft > Reviewed > Approved sign-off. Download as Markdown or PDF. | The memo text, its hash and the sign-off history. |
| 6. Track outcomes | On the review date the app sets what happened beside the starting point. **Review again** copies the frame onto newer data; the new review shows what changed (frame, recommended option, each figure then and now, goal move). | The figures at review time and the link to the next review. |

## Policy council

A policy review can weigh one measure instead of a broad goal: a tax change, a subsidy reform, a
spending programme, a new rule. Tick **Weigh one measure (policy council)** in the frame and
describe the measure; its size (% of GDP, local currency or US$ billion a year), the month it
starts and how many years to look ahead are optional. The review then carries the title "policy
council" and keeps the measure in the frame, so it is part of the frame hash and a change to it
marks every later step out of date.

The council parts of the review are built on top of the measure:

| Part | What you do | What is recorded |
| --- | --- | --- |
| Question (PK1) | The measure, its size, start and years ahead in the frame. | Part of the frame. |
| Costs and benefits (PK2) | One line per cost or benefit, one value per year from the first year, each with where the figures come from (and a link if you have one). Tick the official discount rates to use and add your own with a reason. The app shows, for each rate, the present value of costs and of benefits, the net, benefits per unit of cost, the year from which the running discounted total stays at or above zero, how far costs (or benefits) would have to rise to flip the answer, and the flat rate at which the net turns the other way. | Your lines and rates, the hash of the frame they were entered against (Out of date once the frame changes), their own hash and an audit log entry. |
| Who gains and who loses (PK3) | One row per group (suggestions such as poorer households, exporters, the government budget, or your own): gains, loses or both, and why. A size only with its unit and source; a row without one reads **Missing**. Optionally the share of the change each fifth of people carries, from a published incidence study, set against each fifth's share of income from World Bank household surveys (the same reading as Who pays for a policy, G30). | Your rows and shares, the frame hash, their own hash and an audit log entry. |
| What follows (PK4) | A chain of links, each "this raises (or lowers) that", with how long it takes if you know. Each link rests on a figure from this review's Diagnose step (copied in with its value, period and source), on a source you name, or is marked **assumption**. The app counts how many links rest on each. | Your links, the frame hash, their own hash and an audit log entry. |
| What could go differently (PK5) | Two to five cases (base, good and bad to start), each a short story with the costs and benefits of the PK2 table scaled by your percentages and the benefits arriving later by the years you give, and what each rests on (none means assumption). Odds for every case or none. The app shows the net present value of each case at one PK2 rate, and with odds the odds-weighted net and the chance of a negative net. | Your cases, the frame hash, their own hash and an audit log entry. |
| The council weighs it (PK6) | Run the Options step as usual. With a measure in the frame, the council is handed the measure and every part above that is up to date with the frame (an out-of-date part is left out and named as not entered). Option 1 is always the measure itself; the council judges it against the goal, the diagnosis and your entries, says which entries rest on a source and which on an assumption, puts the assumptions in what must be true, and ranks two or more alternatives or changes against it. It may use only numbers from the diagnosis and your entries; a sentence with any other number is removed and listed. If you change a part after the Options step ran, the step says so and asks you to run it again. | The Options step as before, plus the hash of each council part it was given. |

### Market council (PK7)

Instead of a measure, the frame can ask what an event means for one market of the country: pick
**What an event means for a market**, choose the market (the currency against the US dollar,
government bonds in local currency, or government bonds in US dollars) and describe the event, for
example "The Fed keeps rates where they are through 2027". The review then carries the title
"market council". Its parts are:

| Part | What you do | What is recorded |
| --- | --- | --- |
| Market readings | Press **Copy in the market readings**. The app takes, from its own saved history, the newest value whose period ended on or before the As of day: policy rate, carry against the US (the policy rate minus the US policy rate on that day, with both dates), exchange rate, 10-year yield, dollar bond spread, CFTC leveraged-fund positioning, Fed dollar swap lines (all central banks and the country's own), BIS US dollar credit to non-banks and its growth, central bank assets and US Treasury holdings. Each has its date and source, or reads **Missing** with the reason. Nothing you send is used. | The readings, the As of day, the frame hash, their own hash and an audit log entry. |
| Who gains and who loses | As for a measure. | As for a measure. |
| What follows | As for a measure. | As for a measure. |
| What could go differently | Two to five cases, each a short story and the change in value over the horizon for someone holding the market (in US dollars for a foreign holder), with what it rests on (none means assumption). Odds for every case or none. With odds, the app shows the odds-weighted change and the chance of a loss. | Your cases, the frame hash, their own hash and an audit log entry. |

In the Options step the council is given the event, the market, the readings and your entries.
Option 1 is keeping the current stance unchanged, as the baseline; the other options are responses
by the central bank, the finance ministry or a holder of the market, ranked against it. As for a
measure, only numbers from the diagnosis, the readings and your entries may stay in the answer.
Scenario exposure (Markets page) is not copied in: it has no saved history, so it cannot be read as
of a past day.

The official discount rates offered, each with the passage it comes from, checked 14 November 2026
(`src/data/discountRates.ts`):

| Rate | Applies to | Source |
| --- | --- | --- |
| 3.00% for years 0 to 30, 2.50% to year 75, 2.25% after | UK central government appraisal | HM Treasury, Green Book supplementary guidance: discounting (October 2026), paras 2.1 and 3.8 |
| 3% and 7% | US federal regulatory analysis (7% the base case) | OMB Circular A-4 (2003 version, in force again since 2025), section D.2 |
| 3% | EU-funded projects 2021-2027 without a national rate | European Commission, Economic Appraisal Vademecum 2021-2027, section 2.3 |
| 9%, and 6% for social-sector, selected poverty-targeting and mainly environmental projects | Asian Development Bank projects | ADB, Guidelines for the Economic Analysis of Projects (2017), para. 16 |

Every cost, benefit, group figure or link you enter carries its own source; where there is none
the app says **Missing** or **assumption**. No figure is estimated for you.

## Expert review (P4)

Once the memo is done, a pilot economist or professor can fill a short form on it: clarity (1 to 5),
use of evidence (1 to 5), whether the sources are correct, whether they would act on it, and a free
comment, with their name and role. They choose whether it may appear in the published summary (no,
without their name, or with it); the choice can change later and is not part of the hash. Each review
keeps the memo hash it read, is hash chained to the review before and written to the audit log, and
lives in the review's `expertReviews` list in data/local/reviews.json. `npm run reviews:summary`
writes docs/validation/expert-reviews.md from consenting reviews only (it refuses if any stored hash
no longer matches); `GET /api/expert-reviews.csv` downloads every review on this computer.

## Automatic outcome checks (12 and 24 months)

Every saved review is checked on its own 12 and 24 months after its As of day
(src/utils/outcomeChecks.ts, rules version `outcome-check-v1`). A check reads the goal from the frame
and the goal indicator from the Diagnose step, then the same indicator from the saved pull on or
before the due day. So a check made late, when the app was not running on the day, gives the same
result.

| Result | When |
| --- | --- |
| Hit | The target was met: at or below it for "lower", at or above it for "higher", inside the range or within the stable band for "stable". With no number in the target, the figure moved the way the goal wants from the start. |
| Miss | Not met, on the same rule. |
| Too early | The latest figure is still for the period the review started from. |
| Missing | No Diagnose step, the goal is not a standard indicator, no starting figure, no saved pull in the 45 days before the due day, or no figure in that pull. The reason is saved. |

The target is read as the first number written in it, or a range such as "2-3%". The stable band is
the larger of 0.5 units and 5% of the reference value. Each check is saved once in
`data/local/reviews.json` with its review, chained by SHA-256 to the check before it, never changed,
and written to the audit log. A frame changed later keeps its old checks and gets new ones. Checks
run 30 seconds after the server starts, every 6 hours, and when the track record is opened.

From rules version `outcome-check-v2`, each check also judges the early-warning figures named in the
recommended option's pre-mortem (step 3): **Warning shown** when the figure moved the way the
pre-mortem said would signal failure, **No warning**, **Too early** or **Missing**, on the same pull
and with the same 45-day rule. The memo lists them and pre-fills them under What to watch.

The results show under step 6 and in Menu > Models & validation > Track record > Policy track record,
with hits out of the checks that could be judged. They say only whether the goal written in the
frame was met. The app does not know whether the advice was followed, and what happened afterwards
is not what the advice caused.

## Reproducibility

- Each saved step keeps its content, the time, the SHA-256 of the content and the hash of the step
  before it. Changing an earlier step marks every later step **Out of date** until it is run again,
  so a memo can never rest on figures it was not written from.
- Indicator [13] is the USD bond spread over US Treasuries (J.P. Morgan EMBI Global via the central bank of Peru, monthly; a bond spread, not CDS), Missing outside the eight Latin American countries BCRP covers. Model readings [14]-[20] follow the thirteen indicators: output gap (one-sided HP and Hamilton), r minus g, debt-stabilising primary balance, debt five years on at 10-year averages and under a combined shock, and the IMF bucket fiscal multiplier range. They use only IMF yearly outturns published by the As of day (from April, last year; before April, the year before), never projections; the figures are today's IMF vintage of those years, so later revisions show (src/utils/reviewModels.ts).
- The As of day fixes the data: running Diagnose again on the same review gives the same figures
  from the same archived pull. Statistical tests are deterministic given their inputs and settings.
- AI wording can differ between runs. Every run is kept, so two runs can be compared side by side.
- Every step is written to the audit log (Menu > Audit log). Opening a review re-checks every
  stored hash against its content and says if a step was edited outside the app.
- No sample or built-in figures: a figure the app does not have is shown as Missing with the reason.

## Storage

`data/local/reviews.json` (mode 600), next to the research library. Nothing is sent anywhere except
the questions sent to the AI model you chose in Menu > Settings.

## API

| Route | What it does |
| --- | --- |
| `GET /api/reviews` | Every review with the state of each step and the next step to do. |
| `GET /api/reviews/:id` | One review, its step states and any step whose stored hash no longer matches. |
| `POST /api/reviews` | Start a review from `{ frame, previousId? }`. |
| `PUT /api/reviews/:id/frame` | Change the frame (later steps go Out of date). |
| `DELETE /api/reviews/:id` | Delete a review. |

| `POST /api/reviews/:id/diagnose` | Step 2 from the saved pull on or before the As of day. |
| `POST /api/reviews/:id/options` | Step 3: `{ userOptions, runtimeConfig }` asks the council (temperature 0, prompt hashed, numbers checked); `{ ownOnly: true }` saves your options unassessed. |
| `POST /api/reviews/:id/evidence` | Step 4: the evidence pack (five charts and tests, past episodes, validation status), every series cut at the As of day. |
| `POST /api/reviews/:id/behaviour` | Behavioural check: `{ effects: [{ rank, channel, effect, source, link? }] }`; every entry needs a source. Saved beside the steps with the Options step's hash. |
| `POST /api/reviews/:id/memo` | Step 5: `{ recommended, rationale, watch, reviewDate }`; the memo is assembled from the saved steps with no AI. |
| `POST /api/reviews/:id/expert-reviews` | Expert review (P4): `{ reviewer, role, clarity, evidence, sources, wouldAct, comment?, consent }`; needs a memo that is done. |
| `PUT /api/reviews/:id/expert-reviews/:xid/consent` | Change whether one expert review may be published (`none`, `anonymous`, `named`). |
| `GET /api/expert-reviews.csv` | Every expert review on this computer, one row each, with its consent. |
| `GET /api/expert-reviews/summary` | The text of docs/validation/expert-reviews.md as it would be written now. |
| `POST /api/signoffs/review/:id` | Sign-off on the memo (Reviewed, Approved, Withdrawn) against the memo step's hash. An approved review cannot be deleted. |
| `POST /api/reviews/:id/outcomes` | Step 6: the latest saved pull beside the figures the review started from. |
| `GET /api/reviews/track-record` | Makes any outcome checks now due, then lists every check with its result and reason, the next check of each review, and the tally. |
