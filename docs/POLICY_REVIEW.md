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
