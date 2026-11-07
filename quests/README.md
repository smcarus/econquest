# Quests

Quests are switched off in the app until they are verified and documented; see [docs/QUESTS.md](../docs/QUESTS.md).

Open questions about economies, sovereigns and geopolitical risk that anyone can answer, argue and check. Each Quest is one JSON file with a stated rule for how it is settled from the app's own feeds.

- `quests/drafts/` holds proposed Quests. They can still be edited.
- `quests/` holds approved Quests. An approved file is fixed: its SHA-256 is listed in `manifest.json`, a changed file fails the check, and a change is a new version (`<id>.v2.json`). A Quest is withdrawn by a resolution line, never deleted.

Four types:

| Type | How it ends |
| --- | --- |
| `forecast` | Settled from a feed by one of the rule kinds in `src/utils/questRules.ts` (`threshold`, `between`, `direction`, `level`) |
| `signal` | Contributors propose pre-registered tests; each is run once and badged under the signal standard |
| `replication` | Reproduce a figure the app shows, within the stated tolerance |
| `debate` | Not scored; closes with an evidence map of the positions and the figures each cites |

Rules a Quest file must follow:

- No data figures. Numbers in a Quest are question parameters (a threshold, a tolerance); every figure shown with it is read live from a feed.
- A Forecast Quest settles only on a series listed in `src/utils/questSeries.ts`, whose source's licence allows free sharing with credit.
- Dates run `registeredOn` ≤ `opensOn` < `closesOn` < the date the rule reads.
- Forecasts on conflict, unrest or casualties are not allowed; those questions run as Debate Quests.

Check every file with `npm run quests:check`. When a Quest is approved, move it from `drafts/` to `quests/`, set `approvedBy`, and run `npm run quests:check -- --add` to record its hash. The same check runs in `npm test`.

Quest text, entries and evidence maps are licensed under CC BY 4.0.
