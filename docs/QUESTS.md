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
| Quest generator and digests | Not built |
| Debate, signal and replication workflows | Not built |
| Preference profiles | Not built |
| Health page and yearly dataset | Not built |

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

## Contributor statistics

Statistics come only from the public entries and the recorded results, so anyone can recompute them. The app works them out each time the Scoreboard tab opens; `npm run quests:stats` writes the same figures to `quests/stats.json` for the public record and a future public board, and looks up each new contributor's GitHub account creation date (kept in `quests/accounts.json`, which is public data). Commit both files after a run.

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

## Checklist before Quests are switched on

Working properly:

- [ ] `npm run quests:check` passes on every Quest file
- [ ] At least 10 Quests approved by the maintainer, with real dates, moved from `quests/drafts/` to `quests/` and hashed
- [ ] Every approved Forecast Quest shows a live figure (or Missing with a reason) for each series it reads, checked on the maintainer's computer with all keys set
- [ ] The resolver settles a past test Quest correctly from each source used (BIS, ECB, CFTC, EIA, IMF, World Bank), and a missing value gives Unresolvable
- [ ] Entries can be made and are checked (opened before close, one per GitHub login): one test entry by pull request on the public repository passes, one after close fails
- [ ] `QUESTS_REPO` set in `.env.example`, and on the public repository: Actions on, branch protection requiring the `Quest entries` check, the `QUESTS_MAINTAINERS` variable set
- [ ] CONTRIBUTING gives the address for emailed entries
- [ ] Scores match a hand calculation for at least three settled test Quests
- [ ] Private entries on drafts are refused once Quests go live (today a draft takes private entries so it can be tested)
- [ ] Practice questions checked on the maintainer's computer for every daily and weekly series
- [ ] The UI smoke and journey tests cover the Quests page with Quests on and off
- [ ] A test Quest of each kind settled with `npm run quests:resolve` on the maintainer's computer, and the record checked with `--verify`
- [ ] A Quests tab on Menu > Track record shows the recorded results and the chain check
- [ ] `npm run quests:stats` run on the maintainer's computer: account dates looked up, figures checked by hand for one contributor with test entries

Documented:

- [ ] This page lists what works and what does not, with no "Not built" item that users can reach
- [ ] `CONTRIBUTING.md` has the Quests section: how to propose, enter, dispute, and access from countries GitHub blocks
- [ ] A privacy notice says what is public (login, entries, rationales, scores, the GitHub account's creation date) and that git history is permanent
- [ ] The user manual has a Quests section
- [ ] The public repository has a Quests category in GitHub Discussions, linked from each approved Quest

## Rules Quests keep

- No data figures in a Quest file; every figure is read live from a feed, and a missing one reads Missing with the reason.
- A Forecast Quest settles only on a series whose source's licence allows free sharing with credit (`src/utils/questSeries.ts`).
- An approved Quest and a recorded result are never changed. A change is a new version; a correction is a new line.
- Forecasts on conflict, unrest or casualties are not allowed; those questions run as Debate Quests.
- No stakes and no prizes. Quests are not a betting market.
