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
| Public entries, anti-gaming checks | Not built |
| Contributor statistics and scoreboard | Not built |
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

## Checklist before Quests are switched on

Working properly:

- [ ] `npm run quests:check` passes on every Quest file
- [ ] At least 10 Quests approved by the maintainer, with real dates, moved from `quests/drafts/` to `quests/` and hashed
- [ ] Every approved Forecast Quest shows a live figure (or Missing with a reason) for each series it reads, checked on the maintainer's computer with all keys set
- [ ] The resolver settles a past test Quest correctly from each source used (BIS, ECB, CFTC, EIA, IMF, World Bank), and a missing value gives Unresolvable
- [ ] Entries can be made and are checked (opened before close, one per GitHub login)
- [ ] Scores match a hand calculation for at least three settled test Quests
- [ ] Private entries on drafts are refused once Quests go live (today a draft takes private entries so it can be tested)
- [ ] Practice questions checked on the maintainer's computer for every daily and weekly series
- [ ] The UI smoke and journey tests cover the Quests page with Quests on and off
- [ ] A test Quest of each kind settled with `npm run quests:resolve` on the maintainer's computer, and the record checked with `--verify`
- [ ] A Quests tab on Menu > Track record shows the recorded results and the chain check

Documented:

- [ ] This page lists what works and what does not, with no "Not built" item that users can reach
- [ ] `CONTRIBUTING.md` has the Quests section: how to propose, enter, dispute, and access from countries GitHub blocks
- [ ] A privacy notice says what is public (login, entries, rationales, scores) and that git history is permanent
- [ ] The user manual has a Quests section
- [ ] The public repository has a Quests category in GitHub Discussions, linked from each approved Quest

## Rules Quests keep

- No data figures in a Quest file; every figure is read live from a feed, and a missing one reads Missing with the reason.
- A Forecast Quest settles only on a series whose source's licence allows free sharing with credit (`src/utils/questSeries.ts`).
- An approved Quest and a recorded result are never changed. A change is a new version; a correction is a new line.
- Forecasts on conflict, unrest or casualties are not allowed; those questions run as Debate Quests.
- No stakes and no prizes. Quests are not a betting market.
