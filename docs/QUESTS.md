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
| Resolver, results, disputes, Track record tab | Not built |
| Public entries, anti-gaming checks | Not built |
| Contributor statistics and scoreboard | Not built |
| Quest generator and digests | Not built |
| Debate, signal and replication workflows | Not built |
| Preference profiles | Not built |
| Health page and yearly dataset | Not built |

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
