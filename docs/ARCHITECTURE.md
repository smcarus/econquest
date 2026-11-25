# How the code fits together

This is the map for people who want to change EconQuest. It explains what the main parts are, how
one figure travels from a public source to the screen and into a council answer, and where to look
when you want to add or change something. For setting up, the commands and the rules every change
keeps, see [CONTRIBUTING.md](../CONTRIBUTING.md); for what the app does from a user's side, see
[HOW_IT_WORKS.md](./HOW_IT_WORKS.md).

File and function names are given so you can find them with a search (`git grep -n <name>`). Line
numbers are left out because they move with every change.

## Contents

1. [The parts at a glance](#1-the-parts-at-a-glance)
2. [How one figure travels](#2-how-one-figure-travels)
3. [The daily download and the source check](#3-the-daily-download-and-the-source-check)
4. [How Council chat answers](#4-how-council-chat-answers)
5. [The full council and the referee](#5-the-full-council-and-the-referee)
6. [AI model calls](#6-ai-model-calls)
7. [The screens](#7-the-screens)
8. [Screen text in four languages](#8-screen-text-in-four-languages)
9. [The shared engine](#9-the-shared-engine)
10. [Finding your way round the server](#10-finding-your-way-round-the-server)
11. [Tests](#11-tests)
12. [Where to start for common changes](#12-where-to-start-for-common-changes)

## 1. The parts at a glance

```
  Public sources (IMF, World Bank, BIS, central banks, ...)        Your own files in data/local/
                 |                                                            |
                 v                                                            v
  +--------------------------------------------------------------------------------------+
  |  Server: server.ts + src/server/   (Node.js, Express, TypeScript)                     |
  |   feed readers  ->  country snapshots and world files  ->  data/ on disk              |
  |   routes (/api/...)   daily download   council steps   AI calls (src/server/ai.ts)    |
  +--------------------------------------------------------------------------------------+
                 |  JSON over HTTP, same computer                     |  optional
                 v                                                    v
  +---------------------------------------------+        +-----------------------------+
  |  Page: src/App.tsx + src/components/        |        |  AI provider: Ollama,        |
  |  (React 19, Vite, TypeScript)               |        |  Google Gemini, or a local   |
  |  calculations shared with the server live   |        |  OpenAI-compatible server    |
  |  in src/utils/                              |        +-----------------------------+
  +---------------------------------------------+
```

- **`server.ts`** starts the Express app, registers every route, serves the built page (or Vite in
  development), and runs the background jobs: snapshot refresh, the daily download, the nightly
  source check and the scheduled tests. It is long (over 7,000 lines); section 10 says how to find
  your way in it.
- **`src/server/`** holds the parts that have been moved out of `server.ts`: feed readers
  (`feeds/`), groups of routes (`routes/`), the AI client (`ai.ts`), the network pull for one
  country (`snapshot/network.ts`), the last good answers (`lastGood.ts`), events and webhooks,
  sign-in and the update check.
- **`src/utils/`** is most of the app's logic: one module per source or calculation (about 400 of
  them), each with a test in `tests/`. Most modules are plain functions with no network or file
  access, so the page, the server and the tests can all use them.
- **`src/components/`** are the React pages and panels.
- **`src/data/`** holds fixed tables: navigation, the official calendar, the country list, the
  licence register (`dataLicences.ts`), the model register and the glossary.
- **`src/types/council.ts`** has the shared types, above all `OpenDataSnapshot` (one country's
  figures).
- **`data/`** (not in git) is everything the app saves on the computer. Its folders are listed in
  [INSTALL.md](./INSTALL.md#disk-space-part-by-part).

## 2. How one figure travels

Take Brazil's central bank policy rate on Research > One country.

1. **The page asks.** The Research page calls `GET /api/data/sovereign-snapshot?iso3=BRA`.
2. **The server looks for a saved copy.** `fetchLiveOpenDataSnapshot` in `server.ts` reads
   `data/live/BRA.json` through `loadStoredSnapshot`. If the copy is older than a week (or an hour,
   when the last pull came back short), it starts a refresh in the background with
   `refreshStoredSnapshot` and answers at once from what is saved.
3. **A refresh pulls every free feed for that country.** `fetchLiveOpenDataSnapshotNetwork` in
   `src/server/snapshot/network.ts` asks the IMF, World Bank, BIS and the other feeds, through the
   readers in `src/server/feeds/` and the parsing functions in `src/utils/`. It starts from
   `buildBaselineOpenData` (`src/data/presetsAndBaselines.ts`), in which every figure is `NaN`, and
   fills in only what a feed returned.
4. **Every filled figure is labelled.** When a feed fills a figure, its path and a short source label
   go into `snapshot.liveFields`, for example
   `liveFields['market.policyRatePct'] = 'BIS, 2026-11-20 (Banco Central do Brasil)'`. **A figure
   with no `liveFields` entry is not data and must never be shown.** This is how the "only real
   figures" rule is kept in code.
5. **Last good figures are kept.** `mergeLastGood` (`src/utils/snapshotMerge.ts`) carries over a
   figure from the previous pull when its feed did not answer this time, with the old date in its
   label, and marks the pull incomplete so it is tried again within the hour.
6. **The pull is saved twice.** The snapshot is written to `data/live/<ISO3>.json` (through a
   temporary file, so a crash never leaves half a file) and a dated copy goes to `data/archive/`
   (`archivePull`), which is what the "as of a past day" views read.
7. **Overlays are laid on as it is served.** `withBisPolicyRate` puts the newest BIS policy rate
   (or, for countries the BIS does not cover, the IMF monthly rate) over the saved figure, and
   `withOfficialCalendar` rebuilds the release calendar for today.
8. **The page shows it, or says why not.** Screens show a figure only when its path is in
   `liveFields`. Otherwise they show **Missing** with a reason from `missingReason`
   (`src/utils/liveFigures.ts`): needs setup, feed did not answer, or no source yet.

Not every figure comes through the country snapshot. The other routes are:

| Kind | Saved where | Filled by | Read by |
| --- | --- | --- | --- |
| Country snapshot (newest figures) | `data/live/<ISO3>.json` | `refreshStoredSnapshot` | `/api/data/sovereign-snapshot`, the watchlist, the council |
| Full yearly history (World Bank, IMF WEO) | `data/history/<ISO3>.json` | `src/utils/officialHistory.ts`, refreshed weekly | History & data charts, downloads, `/api/series/...` |
| World-wide files (BIS rates, official forecasts, yield curves, ...) | `data/live/*.json` | a `world:` step of the daily download (section 3) | a route that reads the saved file, never the network, for example `/api/official-forecasts/:iso3` in `src/server/routes/analysis.ts` |
| Files you save yourself (EM-DAT, IRR, IMF Fiscal Rules, ...) | `data/local/<folder>/` | you | a store module such as `src/utils/fxRegimeStore.ts`, read when a page asks |
| One-country downloads on first open (weather) | `data/live/nasa-power/`, `data/live/wb-cckp/` | the route itself, kept 7 or 30 days | the History & data tool |

A route that a page opens should read what is saved and answer quickly; slow downloads belong in
the daily download or in a background refresh.

## 3. The daily download and the source check

- **`npm run daily`** runs `tsx server.ts --daily` (`npm run go -- daily` starts the same thing on a
  schedule). The list of steps is `preloadPlan` in `src/utils/preload.ts`: one step per country and
  one per world-wide file (ids that start with `world:`). Each world step is carried out by a `case`
  in `runPreloadStep` in `server.ts`, which returns `done` or `failed` with a note.
- A slow source is asked up to three times; a step that failed is tried again at the end of the run
  and after two hours. The log is `data/local/logs/daily.log`, and `npm run go -- status` prints the
  last run.
- **`npm run check:data`** (`scripts/check-connections.ts`) asks every source once and prints one
  row each. The rows are defined in `src/utils/connectionCheck.ts` with `add('<row id>', ...)`; the
  same check runs nightly inside the app and feeds Menu > Data health.

## 4. How Council chat answers

The chat agents are code, not AI. Every figure in an answer comes from the app's saved figures.

1. **Plan.** `councilAnswers` in `src/utils/councilQuestion.ts` is the one path for both the chat
   (`src/components/CouncilChatState.tsx`) and the data API (`POST /api/v1/council/ask`).
   `planCouncil` (`src/utils/askCouncil.ts`) finds the countries in the question and picks agents by
   stated keyword rules (`COUNCIL_AGENTS`). With an AI model set up, `POST /api/council/choose-agents`
   lets the model pick instead (`applyAgentChoice`); the reason each agent was asked is shown either
   way.
2. **Answer.** `runCouncil` runs each agent over the watchlist figures. Each finding keeps its source
   and a tag (Live data, Official, Your document, or the agent's own model reading).
   `keepSourcedFindings` drops any finding whose figure is not from a feed, an official series or the
   user's file, and lists it as a gap. Special agents live in their own modules: `scenarioAgent.ts`
   (what-if), `forecastAgent.ts`, `councilChart.ts`, `timingAgent.ts`, `behaviourAgent.ts`,
   `agentDocument.ts`.
3. **Summarise (only with an AI model).** `POST /api/council/synthesise` in `server.ts` sends the
   agents' answers to the referee model, which writes a short brief. Back on the page,
   `sentenceCheck` and `checkBrief` in `askCouncil.ts` remove any sentence with a number that does
   not trace back to an agent's figures, and list what was removed. Explain mode
   (`src/utils/explain.ts`) and what-if mode (`src/utils/whatIfAnswer.ts`) work the same way, sentence
   by sentence.
4. **Without an AI model** the short answer comes from the app's stated rules, and steps 1 to 2 are
   unchanged.

## 5. The full council and the referee

**Run the full council** sends one country to nine AI agents on three desks.

1. `POST /api/council/phase1-and-cascade` (`server.ts`) refreshes the country's figures, runs the
   three desks on the fast model, applies each desk's answer to its three agents and the debate
   rounds, and reports progress to `GET /api/council/progress/:id`.
2. The page then stops for the user's approval (`src/components/CouncilApprovalCard.tsx`).
3. `supremeCouncilStep` (`server.ts`) runs the referee model on everything the desks found and
   writes the final report. `checkSupremeText` (`src/utils/runFigureCheck.ts`) checks every number in it against the inputs.
4. Timings go to `data/local/council-timing.jsonl` (`src/utils/councilTiming.ts`).

The policy council (`src/utils/policyCouncil.ts`) and the Policy review steps
(`src/server/routes/reviews.ts`) follow the same pattern: figures in, model text out, every number
checked.

## 6. AI model calls

Every model call goes through `src/server/ai.ts`. It picks the model for each step from Menu >
Settings > AI model, talks to Gemini, Ollama or an OpenAI-compatible server, cleans up the JSON,
retries, falls back from Ollama to Gemini when set to, and reports which model answered
(`executeResilientLlmStep`). The referee rules (never 8B or smaller; 14B only when allowed) are in
`src/utils/refereeModel.ts`. Summaries and review steps run at temperature 0 with a fixed seed so a
rerun reads the same.

No step ever takes a figure from a model. A model writes words around figures the app already has.

## 7. The screens

- **`src/main.tsx`** mounts **`src/App.tsx`**, which holds the header, the pages and the dialogs.
- The pages are listed in `NAV` in `src/data/navigation.ts` (Workspace, Research, Policy review,
  Reports, Tools).
- **Research > One country** is `src/components/CountryPage.tsx`. Its History & data tools are listed
  in `COUNTRY_TOOL_GROUPS` (`src/utils/countryTools.ts`), eight groups, one tool open at a time.
- **Every new screen loads only when opened:** wrap it with `lazyNamed` from
  `src/components/LazyDesk.tsx`. `npm run size:check` fails if the start-up download grows past
  520 KB compressed or the whole app past 9 MB.
- **Every panel sits inside `PanelBoundary`** (`src/components/PanelBoundary.tsx`), so a panel that
  crashes shows a message and a *Copy details* button instead of blanking the app.
- Look and spacing follow [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (shared classes such as
  `ui-panel`, `ui-btn` and `ui-label`).

## 8. Screen text in four languages

- English text lives in catalogs in `src/i18n/messages/` (one file per area: `menu.ts`,
  `panels.ts`, `research.ts` and so on), defined with `defineMessages`.
- Each catalog has a Spanish, French and Portuguese twin with the same keys in `src/i18n/es/`,
  `fr/` and `pt/`. A test fails when a language misses a key.
- A component reads its text with `const t = useT(PANELS)` and `t('key', { country })`
  (`src/i18n/useLang.ts`). A language's files download only when it is picked.
- Some text is built by rules on the server or in `src/utils/` (headlines, Missing reasons). Where it
  is translated, it goes through the same catalogs; where it is not yet, the README says so.

## 9. The shared engine

`src/engine/` is the part of the app that is meant to run unchanged on the server, in a future phone
app and in tests. It reaches files, keys, the network and the log only through a `Platform` object
(`src/platform/types.ts`; the computer's version is `src/platform/node.ts`). A test,
`tests/engineBoundary.test.ts`, fails any change that makes engine code import Node, Express or
phone-only modules. Code moves into the engine a piece at a time; most of the app is still in
`src/utils/` and `server.ts`.

## 10. Finding your way round the server

`server.ts` reads from top to bottom roughly like this:

| Part | What to search for |
| --- | --- |
| Imports, settings and folders | `DATA_DIR`, `SNAPSHOT_DIR` |
| Country snapshots: load, refresh, save, archive | `loadStoredSnapshot`, `refreshStoredSnapshot`, `archivePull` |
| Yearly history and the models built on it | `loadOfficialHistory`, `HISTORY_DIR` |
| Countries the server keeps, added countries | `SOVEREIGN_CATALOG`, `addedCountries` |
| Daily download steps | `runPreloadStep`, `runDailyCli` |
| Readers of saved world files and your own files | `cbpolPullQuick`, `loadImfPolicy`, functions named `...Data` |
| Council chat summary, agent choice, explain, what-if | `synthesiseAnswers`, `choose-agents`, `explainAnswers`, `whatIf` |
| Nightly source check and scheduled jobs | `DATA_CHECK_TIME`, `scheduledJobs` |
| Full council and the referee | `phase1-and-cascade`, `supremeCouncilStep` |
| `startServer`: sign-in, then every route in order | `async function startServer`, `app.get(`, `app.post(` |
| Start-up and listening | `createViteServer`, `app.listen(PORT` |

Groups of routes that have been moved out are registered from `startServer` with a
`register...Routes(app, ...)` call; their code is in `src/server/routes/`. New groups of routes go
there rather than into `server.ts`. Every address an outside program may call is in
[openapi.json](./openapi.json) and [DATA_API.md](./DATA_API.md); `tests/openapi.test.ts` checks every documented data address is in the OpenAPI file.

## 11. Tests

| Command | What it runs |
| --- | --- |
| `npm test` | Every file in `tests/*.test.ts` with Node's built-in runner (`tsx --test`). No test reaches the network |
| `npx tsx --test tests/officialForecasts.test.ts` | One file, while you work on it |
| `npm run lint` | The type check, normal and strict |
| `npm run test:smoke` | Opens every page of the built app (run `npm run build` first) in Chromium with every feed down, and fails on a crash or a blocked request |
| `npm run test:journeys` | The main tasks, click by click |
| `npm run test:a11y` | Accessibility of the main pages |

How the network is replaced in tests:

- **`tests/helpers/offline-fetch.mjs`** is loaded into a real server (`NODE_OPTIONS="--import ..."`)
  and makes every request fail as if offline, except a few fixed answers. `tests/server.test.ts` and
  the smoke test use it.
- **`tests/helpers/replay-fetch.mjs`** answers with real recorded replies.
  `tests/fixtures/recorded-public/` holds replies from sources whose terms allow sharing them, so
  `tests/recordedPublic.test.ts` checks that every source and figure that connected when recorded
  still does. `npm run record:feeds` re-records, on a computer that reaches the feeds. The full
  recording (`tests/fixtures/recorded/`) stays private, because some sources do not allow sharing.
- **`tests/councilRecorded.test.ts`** replays real model replies from
  `tests/fixtures/council-recorded/`. It fails when a prompt, template, input or setting changes
  what the model would be asked (see CONTRIBUTING, "Changing what a model is asked").
- Small parsing tests keep a cut-down real reply in `tests/fixtures/<source>/`, named with the date
  it was saved.

Continuous integration (`.github/workflows/ci.yml`) runs the type check and tests on every pull
request, and the build, size check and browser tests when code changes. Actions > Windows check
runs the tests on Windows by hand.

## 12. Where to start for common changes

| You want to | Start in |
| --- | --- |
| Add a data source | CONTRIBUTING, "Add a data source, step by step" |
| Fix a feed that stopped answering | `npm run check:data`, then the reader in `src/server/feeds/` or `src/utils/` and its test |
| Add a History & data tool | a panel in `src/components/`, a route that reads saved data, an entry in `COUNTRY_TOOL_GROUPS`, a `lazyNamed` import in `CountryPage.tsx`, text in four languages |
| Change what a chat agent says | the agent in `src/utils/askCouncil.ts` (or its own module) and its test; agents are code, so no recording is needed |
| Change a model prompt | the step in `server.ts` or `src/server/routes/`, then CONTRIBUTING, "Changing what a model is asked" |
| Add a signal or forecast test | a spec in `docs/validation/` first, then the code; see [METHODS.md](./METHODS.md) |
| Add an address for outside programs | the route, `docs/openapi.json` and `docs/DATA_API.md` together |
| Change screen text | the English catalog in `src/i18n/messages/` and its three twins |
