# Quests

Status: **switched off.** Quests are not yet available to users. The menu shows "Quests: Not yet available", greyed out, and every Quests route answers only `{ "enabled": false }`.

Quests are open questions about economies, sovereigns and geopolitical risk that anyone can answer, argue and check. Each Quest is one JSON file in `quests/` with a stated rule for how it is settled from the app's own feeds. The file format and its rules are in [quests/README.md](../quests/README.md).

## Turning Quests on

Quests stay off until every box in the checklist below is ticked. Only the project maintainer turns them on for a release.

- **For testing on your own computer:** add `QUESTS_ENABLED=on` to `.env` (or the environment) and restart. Any other value, or none, keeps them off.
- **For a release:** the maintainer ticks the checklist, then changes this page's status line and the default in `.env.example` in the same pull request.

## What works today

| Part | State |
| --- | --- |
| Quest file format, settle rules, licence check (`npm run quests:check`) | Built and tested |
| Menu > Quests, read only: list, filters, Quest page with rule, live figures and known limits | Built and tested, switched off |
| Log privately (hashed, append-only, `data/local/quest-entries.jsonl`), My entries, scoring of daily and weekly series against base rate or no change | Built and tested, switched off |
| Practice on past data (answer hidden, scored at once, not saved) | Built and tested, switched off |
| Class table for a class code (private to the server it runs on) | Built and tested, switched off |
| Resolver: results worked out from the feeds, recorded by `npm run quests:resolve` in the hash-chained `quests/resolutions.jsonl`; yearly figures read as first published; disputes, withdrawals and notes; Results tab and result on each Quest page; recorded results used for scores | Built and tested, switched off |
| Quests tab on Menu > Track record | Not built (added when Quests go live, so nothing shows while they are off) |
| Public entries by pull request (`quests/entries/<id>/<login>.<n>.json`): Prepare entry in the app opens GitHub's prefilled page; the entry checker (`npm run quests:entries`, CI job `Quest entries`); replacements numbered and kept; emailed entries posted by a maintainer; entries hidden in the app until close, then shown with scores and the spread | Built and tested, switched off |
| Contributor statistics and scoreboard: skill with a 90% range, beat no change, calibration, sharpness, record against the crowd, fields, streak, each shown only above its minimum; rankings after 12 settled forecasts and a 90-day-old GitHub account; seasons, all-time and field tables (`npm run quests:stats`, Scoreboard tab) | Built and tested, switched off |
| Quest generator (`npm run quests:generate`: weekly Brent and currency Quests, monthly policy-rate Quests, as drafts), batch approval (`npm run quests:approve`), weekly digest (`npm run quests:digest`) and "This week" on the Quests page | Built and tested, switched off |
| Debate Quests: pick a position and argue it (privately, by pull request or by email); Claim Check reads each argument as it is written; an opening brief written once by the app's AI model (`npm run quests:brief`), which may state no figures of its own; an evidence map after close with the results of related Forecast Quests, exported as Markdown; debates argued listed on each contributor's page, never scored | Built and tested, switched off |
| Replication Quests: an entry gives the figure a person's script produced and a public link to the script; after close the maintainer records the app's own figure (`npm run quests:resolve -- --replicate`); each entry reproduces it if within the Quest's tolerance; listed on contributor pages, never ranked | Built and tested, switched off |
| Signal Quests: an entry is a pre-registered test on one of the app's test rules, entered in public only (pull request or email); the app checks it as it is written; after close every test is run once (`npm run quests:run-tests`), recorded in `quests/test-verdicts.json` and counted in the Holm correction in docs/TRACK_RECORD.md; tests listed on contributor pages, never ranked | Built and tested, switched off; no test has been run on real data yet |
| Public board: one static page (`npm run quests:board`, default `docs/quests/index.html`) built only from the files in `quests/`, with the ranked table and its rules, seasons, the crowd, each approved Quest and its result, every contributor and signed-up stances; no scripts, readable on a phone, light and dark | Built and tested; not published yet |
| Stance profiles: eight economics questions set in the app (kept in the browser); a public profile only by the person's own pull request (`quests/profiles/<login>.json`, checked by the `Quest entries` CI job); shown on the Stances tab and contributor pages; group tables of stance against skill not shown | Built and tested, switched off |
| Health measures for the six-month review: people per month, entries per Quest, results recorded on time, crowd against the base rate (Health tab, `/api/quests/health`, and on the public board) | Built and tested, switched off |
| Yearly open dataset (`npm run quests:dataset -- --year <YYYY>`): CSV tables of Quests, entries, results, test verdicts and scores with a README, citation file and checksums, ready to deposit for a DOI; stance profiles left out | Built and tested; no dataset released yet |

## How a Quest is settled

When a Forecast Quest's date has passed, the app reads the answer from the feed exactly as the Quest's rule says, and the maintainer records it.

1. Start the app with `QUESTS_ENABLED=on` (Docker on port 3737, or `npm run dev` on 3000).
2. Run `npm run quests:resolve -- --by <your GitHub login> --dry-run` to see what is due. Each Quest shows one of:
   - a result in plain words, for example "Yes, it happened (74.1 on 2026-12-11, then 75.3 on 2026-12-18)";
   - "wait": the value is not published yet, or the feed did not answer; run it again later;
   - "check": the feeds give Unresolvable (the series has no value and the fallback, if any, has none either). This is never recorded automatically, because a missing value can be a passing fault. If it is right, run again with `--unresolvable <id>`.
3. Run it again without `--dry-run` to write the results, then commit `quests/resolutions.jsonl` in a pull request.

How values are read:

- **Daily and weekly series** (policy rates, exchange rates, oil prices, CFTC positions): the first value published on or after the date in the rule.
- **Yearly figures** (IMF and World Bank): the value as the source first published it in the first download on or after the date. Sources often revise these figures months later; the app keeps a list of every change it sees between downloads (`data/history/<country>.json`), and the resolver undoes changes made after that first download. A later revision can be added as a note; it never changes the result.

The record, `quests/resolutions.jsonl`, has one line per event, and lines are never edited. Each line holds the SHA-256 fingerprint of the line before it, so if any old line is changed, removed or moved, the check fails from that line on (`npm run quests:resolve -- --verify`, and the Results tab in the app) and the script refuses to write until the file is restored from git. The script also skips a Quest whose file in the running app differs from the one in this folder.

### Disputes, withdrawals and notes

- **Dispute.** Anyone may dispute a result within 7 days of it being recorded, in the Quest's Discussion thread, saying which part of the rule was not followed. The maintainer answers there and records the decision: `npm run quests:resolve -- --by <login> --decide <id> stands "reason"`, or `... --decide <id> unresolvable "reason"` when the result was wrong and the Quest is Unresolvable after all. The original result stays visible, with the decision below it. A wrong result is never replaced by a different answer: it can only stand or become Unresolvable.
- **Withdrawal.** A Quest with no result yet can be withdrawn, for example because its source stopped publishing: `--withdraw <id> "reason"`. Entries on it are not scored.
- **Note.** `--note <id> "text"` adds information, for example that the source later revised the figure.

## Public entries

A public entry is a small file in the public repository, `quests/entries/<quest id>/<GitHub name>.<n>.json`, added by a pull request. It holds the Quest's id, version and file fingerprint, the person's GitHub name, the answer (a probability from 0 to 1, or a number), an optional reason of up to 2,000 characters, and how it came in.

How someone enters, in plain steps:

1. Open the Quest in Menu > Quests, type a GitHub name and an answer under **Enter publicly**, and press **Prepare entry**.
2. The app shows the file and opens GitHub's "new file" page with it already filled in. GitHub makes a personal copy of the repository for anyone who cannot write to it.
3. Press "Commit changes", then "Create pull request". Within a few minutes the **Quest entries** check says pass, or gives the exact problem.

What the check enforces (`src/utils/questPublicEntries.ts`):

- **Before close only.** The time is when GitHub runs the check, which nobody can set. A push to the pull request after entries close runs it again, and it fails.
- **Only for yourself.** The name in the file must be the GitHub account that opened the pull request.
- **One counted entry per person.** A replacement is the next number (`alice.2.json`); earlier entries are never changed or removed, and the highest number counts.
- **Entries only.** A pull request with entries holds nothing else, and one entry per Quest.
- **Approved Quests only**, and the answer must be in range.
- **The checker cannot be changed by the pull request it checks:** it runs from the base branch and only reads the entry files from the pull request.

Hidden until close: the app shows only how many entries there are until entries close; after that it lists each counted entry with its score, and the middle answer and middle half of the answers. Pull requests on GitHub are public, so someone determined could read open entries there; the docs and the app say so. Copying gains little, because scores are against the base rate and rankings need many settled Quests.

Emailed entries: GitHub blocks some countries. Someone there can email their entry to a maintainer before entries close; the maintainer posts it within 7 days of close with `npm run quests:entries -- --by <login> --email ~name --quest <id> --received <time the email arrived> --probability 0.6`, in a pull request of its own. It shows as "(emailed)" under a ~name, which can never be a GitHub account. Only logins in the repository variable `QUESTS_MAINTAINERS` (default `smcarus`) may post them.

For the maintainer:

- Merge entry pull requests as soon as their check passes, so a replacement finds the earlier entry and takes the next number.
- Never press "Re-run" or "Update branch" on an entry pull request after entries close: that runs the check again with today's time, and it fails.
- A pull request that only adds entries skips the full CI and runs only the short `Quest entries` job.
- Set `QUESTS_REPO` (owner/name of the public repository) for Prepare entry to work; without it the app offers only Log privately.

## Debate Quests

Some questions have no single figure that settles them: "What would most reliably rebuild Egypt's foreign reserves?" A Debate Quest lists two to four positions. Nobody is scored and no position is ever called right. The point is to argue in public with the evidence, and to see afterwards what the figures showed.

How it works, step by step:

1. **The question.** A maintainer approves the Debate Quest like any other (`npm run quests:approve`). It can name related Forecast Quests in a `related` list, for example a Quest on whether reserves rise by a date; their results are shown with the debate later.
2. **The opening brief.** Before entries open, the maintainer runs `npm run quests:brief -- --by <login> <id>` on the computer with Ollama. The app's own AI model (the referee model, 32B or larger, at temperature 0 and seed 42) writes, for each position, its strongest case, its weakest point and which figures in the app to check. The brief may not state any number of its own (a word with a digit that is not already in the Quest's own words makes the script refuse it, and nothing is written), because every figure in the app comes from a feed, never from a model. The brief is saved in `quests/briefs/<id>.<version>.json` with its model, settings, date and fingerprint, labelled as written by the model, and never replaced. Commit it in a pull request.
3. **Entries.** Anyone picks a position and writes an argument of at least 40 characters, citing the app's figures: privately in the app, by pull request (the entry file holds `"answer": { "position": 2 }` and the argument as `rationale`), or by email through a maintainer (`npm run quests:entries -- --email ~name ... --position 2 --rationale "..."`). The rules for public entries (above) apply unchanged: replacements are numbered and kept, the last one counts, entries are checked by CI.
4. **Claim Check while writing.** As the argument is typed, Claim Check compares every figure it states (policy rate, inflation, government debt, primary balance, reserves, growth) and every ranking ("the highest in the G20") with the app's figure for the Quest's country, by fixed rules and no AI, so a wrong figure can be fixed before it is sent.
5. **The evidence map.** Arguments are hidden in the app until entries close. Then the Quest page shows how many argued each position, each argument with its Claim Check readings, how many stated figures match or differ from the app's, and the results of the related Forecast Quests. **Export evidence map** downloads it as Markdown with the app's standing notice. Claim Check uses the app's figures on the day the map is opened, which may be newer than the argument.
6. **Contributor pages** list the Debates a person argued. Debates never count towards any score or ranking.

Conflict, unrest and casualty questions run only as Debate Quests.

## Replication Quests

A Replication Quest asks people to rebuild a figure the app shows, for example the Bohn fiscal reaction coefficient for Brazil, from the same public data with their own code. It checks the app: if many people get the same figure, readers can trust it; if a careful script gets something else, the app may be wrong.

1. **Enter.** Write a script in any language, put it where anyone can read it (a GitHub repository or gist; the link must start with https://), and enter the figure it gives: privately in the app, by pull request (the entry file holds `"answer": { "value": 0.061 }` and `"code": "https://..."`), or by email through a maintainer (`--value` and `--code`). Notes are optional: say which data vintage and settings you used, and any difference you found.
2. **Entries close.** Figures are hidden in the app until then.
3. **The app's figure is recorded.** The maintainer opens the panel the Quest names, with the settings it states, and records what the app shows: `npm run quests:resolve -- --by <login> --replicate <id> <figure> "panel, settings, date read"`. This is a line in the results record like any other result, and is never changed (a dispute is decided with `--decide`).
4. **Matching.** An entry reproduces the figure when it is within the Quest's tolerance of the app's figure. An entry that differs is not "wrong": if its notes show the app made a mistake, the maintainer opens a bug against the app and records a note naming the entry (`--note`), and that entry solves the Quest.
5. **Contributor pages** list each replication and whether it reproduced the app's figure. Replications are never ranked.

## Making new Quests

A steady flow of Quests keeps people coming back, so the app drafts routine ones for the maintainer to approve in a batch (`src/utils/questGenerator.ts`):

- **Weekly**: Brent crude, and seven currencies against the US dollar (Brazilian real, Mexican peso, South African rand, Turkish lira, Indian rupee, Indonesian rupiah, Japanese yen): higher or lower one week after entries close. Entries open a week before they close, on a Friday.
- **Monthly**: whether eleven central banks (the United States, Brazil, Mexico, Chile, Colombia, South Africa, Turkey, Poland, Hungary, India, Indonesia) will have cut their policy rate by the end of the next month. Entries open two weeks before the end of the month.

Every generated Quest asks "higher or lower than on the day entries close", so no figure is ever written into a Quest file, and each passes the same checker as a hand-written Quest. The app has no calendar of data releases or central-bank meetings yet; when it gets one, Quests dated to those events can be added here.

1. `npm run quests:generate -- --weeks 4` lists what it would draft; add `--write` to write the drafts into `quests/drafts/`.
2. Read them, edit or delete any you do not want.
3. `npm run quests:approve -- --by <your login> <id> <id> ...` moves each to `quests/`, sets you as approver and records its fingerprint in `quests/manifest.json`. It refuses a draft that fails the checker or whose entries have already closed.
4. Commit `quests/` in a pull request.

Each week, `npm run quests:digest` prints a short post for the Quests category in GitHub Discussions: what closes and opens in the next 7 days, results recorded in the last 7, and results still due. The same list shows as **This week** at the top of the Quests page.

## Contributor statistics

Statistics come only from the public entries and the recorded results, so anyone can recompute them. The app works them out each time the Scoreboard tab opens; `npm run quests:stats` writes the same figures to `quests/stats.json` for the public record (the public board, `npm run quests:board`, works them out the same way), and looks up each new contributor's GitHub account creation date (kept in `quests/accounts.json`, which is public data). Commit both files after a run.

What is shown, and when (a figure resting on too few cases says how many more it needs instead of showing a number):

| Figure | What it means | Shown after |
| --- | --- | --- |
| Skill | How much better (+) or worse (-) the person's probabilities were than the base rate, averaged: base-rate Brier score minus their Brier score | 12 settled forecasts with a base rate |
| 90% range | A bootstrap range around the skill score; if two people's ranges overlap, they may not really differ | with skill |
| Beat no change | Share of number forecasts closer than assuming nothing moves | 12 settled |
| Calibration | When they said 70%, how often it happened, in 10% steps, and the average gap | 30 settled |
| Sharpness | How far from 50% their probabilities sit (0 to 1); only useful with skill | 12 settled |
| Against the crowd | Skill on Quests where they called the other outcome from the crowd's middle answer | 12 such Quests |
| Fields | Skill by topic and by region | 8 settled in the field |
| Streak | Settled Quests in a row with positive skill; shown, never ranked | 5 settled |

Rankings use skill only. To be ranked a person needs 12 settled forecasts with a base rate and a GitHub account that was at least 90 days old when the first Quest they entered closed, which makes throwaway accounts useless. Emailed entries, checked by a maintainer, need no account. Seasons run by the calendar year a Quest settles in, with an all-time table that never resets; field tables rank only within a field. Nobody is ranked on how many Quests they enter.

## Public board

For people who never install the app, `npm run quests:board` builds one static web page from the files in `quests/` (Quests, public entries, the results record, Signal Quest verdicts and stance profiles), by default at `docs/quests/index.html`, which GitHub Pages can serve. It shows what the Scoreboard tab shows: the ranked table with 90% ranges and the rules for being ranked, seasons, the crowd against the base rate, each approved Quest with its status and result, every contributor with their settled count, debates, replications and tests (listed, never ranked), the health measures below, and the stances of people who signed up with a profile. Drafts are left out. The page has no scripts and makes no network calls, and anyone can rebuild it from the same files and get the same page. Run `npm run quests:stats` first so new GitHub account dates are looked up, set `QUESTS_REPO` for links to the repository, then commit the page with the stats files.

## Stance profiles

Stance profiles exist for one research question: do people who hold a view forecast better or worse on the Quests that test it? A stance tied to a name is a political opinion about a person, so the design leaves the choice entirely to that person.

1. **Eight questions on economics, not parties.** Inflation against growth, cutting deficits against spending, floating against managed exchange rates, open against controlled capital flows, central-bank independence, lenders against borrowers in debt deals, whether sanctions work, and open trade against protection. Each is a scale from -2 to 2 between two plain positions (0 means no lean), and any can be left out. No left-right label, no party names, nothing marked right or wrong. The list is in `src/utils/questStances.ts`.
2. **Set in the app.** The Stances tab keeps what a person sets in their own browser and nowhere else.
3. **Sign up on GitHub, if you want a profile.** A person who wants their stances on their public page ticks that they understand it is public and that git keeps every version, then opens GitHub's prefilled page for `quests/profiles/<login>.json` and opens a pull request. The `Quest entries` check allows a profile to be added or changed only by the person it names, and removed by them or a maintainer on request; the pull request holds nothing else. Nobody has to have a profile, and having one changes nothing about scoring.
4. **Never inferred.** The app does not work out anyone's stance from their forecasts, arguments or anything else.
5. **No group tables for now.** Tables of stance against skill for groups of people need a way to collect stances without names, which the project does not have, so they are not shown (Sam, 2026-11-08). With profiles only by name, any table would be of named people, so it is left out rather than built on them.

Profiles are not recorded verdicts: removing one is allowed, and entries, scores and results stay as recorded.

## Signal Quests

A Signal Quest asks people to propose a test of an idea, for example "crowded futures positioning comes back within six weeks". A test asks whether a rule would have beaten the simplest guess (how often the same thing happened after any month or week) on past data, using only figures that had been published at the time. The tests follow the same signal standard as the app's own (docs/METHODOLOGY.md), and they are judged in the same family: every test tried raises the bar for every other, the app's own included.

1. **Write the test down.** An entry's answer is `"answer": { "test": { ... } }` with:
   - `hypothesis`: what the test expects to find, in plain words (40 to 600 characters);
   - `method`: one of the rules the app can already run on its long free histories (the Propose a test box lists them with their settings, and `src/utils/questSignal.ts` holds the list). A Quest may limit the rules with `"methods": [...]`. A test that needs a rule or data the app does not have yet starts with a code pull request that adds the rule; it cannot be entered as a file;
   - `params`: every setting of that rule, so nothing is chosen after the run;
   - `sample`: `{ "from": "YYYY-MM" }`, and `"to"` if the test should stop before the latest data;
   - `passMark`: at least 30 cases over at least 6 years with cases, p at or under 0.05 with whole years resampled (method 2), and a lift of at least 1 point over the base rate. A test may ask for more, never less;
   - `knownLimits`: at least one sentence on what the test cannot show.
2. **Enter it in public**, by pull request (the app's Propose a test box checks the test as you type and prepares the file) or by email through a maintainer (`npm run quests:entries -- --by <login> --email ~name --quest <id> --received <time> --test test.json`). A test cannot be logged privately: it must be fixed in the open before it runs. A replacement before close is the next number; only the newest is run.
3. **Entries close.** Tests are hidden in the app until then.
4. **Each test is run once.** A maintainer runs `npm run quests:run-tests -- --by <login> <id>` on a computer that reaches the feeds (BIS, DBnomics, CFTC, OECD, IMF; the protest-spike rule also reads the GDELT and UCDP files on that computer). Each counted entry that passes the entry check becomes a test file with its own hash, registered on the close date, and is run by the same runner as `npm run backtest`, judged by method 2. If any test cannot run (a feed did not answer), nothing is recorded and the maintainer runs it again later, so an outage never becomes a verdict. The verdicts go in `quests/test-verdicts.json` with the SHA-256 of each entry file; a Quest's tests are run once, and a second run is refused. The maintainer then runs `npm run docs:track-record` and commits both files.
5. **Verdicts.** Each test reads *Passed*, *Failed* or *Too few cases* against its own pass mark, never changed. A pass that still holds after the Holm correction across every test on record reads *Validated*; one that does not reads *Provisional pass*. A failed test is never re-run or re-tuned: a better idea is a new test in a new Quest, and it counts as another test tried. Results on past data are hypothetical: they show how a rule would have done, not money made.
6. **Contributor pages** list each test proposed and its verdict. Tests are never ranked.

## Is it working? (health)

Six months after the first Quest opens, the maintainer looks at four measures to decide whether to keep going, change things or stop. The Health tab and the public board show them, worked out from the public files alone (`src/utils/questHealth.ts`):

| Measure | What it counts | Why it matters |
| --- | --- | --- |
| People per month | People with a counted entry on a Quest that closed that month, and how many came back in more than one month. Entry files carry no date of their own, so the Quest's closing month is used | A project with no regular contributors is not worth the upkeep |
| Entries per Quest | Counted entries on each closed Quest (a replacement replaces, never adds), the middle Quest's count, and how many closed with none | A crowd figure from two answers means little |
| Results on time | Share of due Quests whose result was recorded within 14 days of the day it was due; late and overdue are listed. Debate Quests have no result, a withdrawn Quest is left out, and a Signal Quest with no tests entered has nothing to run | Late results mean a feed or the maintainer is the bottleneck |
| Crowd against the base rate | The crowd's middle answer scored against how often the thing happened in the past, shown once there are enough settled Quests | Whether the crowd adds anything a simple base rate does not |

## Yearly open dataset

Once a year the maintainer runs `npm run quests:dataset -- --year <YYYY>` (add `--out <folder>`, default `quests-dataset-<YYYY>/`, which git ignores). It writes, for every approved Quest that closed in the year:

- `quests.csv`, `entries.csv` (replacements included and marked), `results.csv` (every line of the results record, with its hash), `test-verdicts.csv` and `scores.csv`;
- `README.md` describing every column in plain words, what is left out and why, the licence (CC BY 4.0) and the credit each data source asks for;
- `CITATION.cff` and `SHA256SUMS`.

Stance profiles are left out: a person can remove their profile from the repository, but not from a deposited dataset. GitHub account dates, private logs, class tables and drafts are left out too. To get a DOI, upload the folder to Zenodo (or another repository that issues DOIs) as a Dataset under CC BY 4.0, then add the DOI to the dataset's `CITATION.cff` and to this page. The script makes no network calls, so the same files always give the same tables.

## Checklist before Quests are switched on

Working properly:

- [ ] `npm run quests:check` passes on every Quest file
- [ ] At least 10 Quests approved by the maintainer, with real dates, moved from `quests/drafts/` to `quests/` and hashed (`npm run quests:generate` and `quests:approve` help)
- [ ] Someone posts the weekly digest (`npm run quests:digest`) in Discussions, or a scheduled job does
- [ ] Every approved Forecast Quest shows a live figure (or Missing with a reason) for each series it reads, checked on the maintainer's computer with all keys set
- [ ] The resolver settles a past test Quest correctly from each source used (BIS, ECB, CFTC, EIA, IMF, World Bank), and a missing value gives Unresolvable
- [ ] Entries can be made and are checked (opened before close, one per GitHub login): one test entry by pull request on the public repository passes, one after close fails
- [ ] `QUESTS_REPO` set in `.env.example`, and on the public repository: Actions on, branch protection requiring the `Quest entries` check, the `QUESTS_MAINTAINERS` variable set
- [ ] CONTRIBUTING gives the address for emailed entries
- [ ] Scores match a hand calculation for at least three settled test Quests
- [ ] A test Signal Quest run with `npm run quests:run-tests` on the maintainer's computer, its verdicts checked against `npm run backtest` run on the same test files, and docs/TRACK_RECORD.md regenerated
- [ ] An opening brief written with `npm run quests:brief` on the maintainer's computer for a test Debate Quest, read by the maintainer, and an evidence map exported after a test close
- [ ] Private entries on drafts are refused once Quests go live (today a draft takes private entries so it can be tested)
- [ ] Practice questions checked on the maintainer's computer for every daily and weekly series
- [ ] The UI smoke and journey tests cover the Quests page with Quests on and off
- [ ] A test Quest of each kind settled with `npm run quests:resolve` on the maintainer's computer, and the record checked with `--verify`
- [ ] A Quests tab on Menu > Track record shows the recorded results and the chain check
- [ ] The public board built with `npm run quests:board` on the public repository, checked on a phone, and GitHub Pages switched on for it
- [ ] `npm run quests:stats` run on the maintainer's computer: account dates looked up, figures checked by hand for one contributor with test entries
- [ ] The Health tab checked against a hand count for the test Quests, and the six-month review date written in the maintainer's calendar
- [ ] A test dataset built with `npm run quests:dataset` from the test Quests, opened in a spreadsheet, and the Zenodo upload steps tried in Zenodo's sandbox

Documented:

- [ ] This page lists what works and what does not, with no "Not built" item that users can reach
- [ ] `CONTRIBUTING.md` has the Quests section: how to propose, enter, dispute, and access from countries GitHub blocks
- [ ] A privacy notice says what is public (login, entries, rationales, scores, the GitHub account's creation date, and stance profiles for people who sign up with one) and that git history is permanent
- [ ] The user manual has a Quests section
- [ ] The public repository has a Quests category in GitHub Discussions, linked from each approved Quest

Planned, to build before Quests are switched on for everyone (added November 2026; see docs/ROADMAP.md):

- [ ] Links to Quests from country pages and from Council chat
- [ ] Sealed public entries: each entry locked in with a fingerprint (commit) before the deadline and revealed after it
- [ ] A maintainer dashboard
- [ ] An Ideas category in GitHub Discussions with votes
- [ ] A contributor, reviewer and steward ladder in GOVERNANCE.md
- [ ] A Discussion thread opened automatically for each Quest, with the result posted when it settles
- [ ] A rule-based check of the figures quoted in revealed debate entries (no AI judging)
- [ ] A welcome Action for first-time contributors and a "good first Quest" label
- [ ] Badges for taking part, not rankings
- [ ] A "report a data problem" link on every Quest
- [ ] Debate rules and a report link on every thread, locked a week after the Quest settles
- [ ] A monthly round-up Action
- [ ] One first replication challenge, on a paper the maintainer picks

## Rules Quests keep

- No data figures in a Quest file; every figure is read live from a feed, and a missing one reads Missing with the reason.
- A Forecast Quest settles only on a series whose source's licence allows free sharing with credit (`src/utils/questSeries.ts`).
- An approved Quest and a recorded result are never changed. A change is a new version; a correction is a new line.
- Forecasts on conflict, unrest or casualties are not allowed; those questions run as Debate Quests.
- No stakes and no prizes. Quests are not a betting market.
