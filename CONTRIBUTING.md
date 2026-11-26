# Contributing to EconQuest Terminal

Thank you for helping. This project is open-source research software for emerging-market sovereign
and macro risk. Contributions of every size are welcome: a fixed feed, a methods check, a
replication, a test, a typo.

Please read the [code of conduct](CODE_OF_CONDUCT.md) first. Security problems go through
[SECURITY.md](SECURITY.md), not public issues.

## The research rules

Every change has to keep these. Pull requests that break them are not merged, however useful.

1. **Only real figures.** A number appears only when an official series, a live feed or the user's
   own file supplied it. When a figure is not available, the app shows **Missing** with the reason
   ("Needs setup", "Feed did not answer", "No source yet"). No built-in, sample or AI-estimated
   figures, and no web-search estimates.
2. **Paid data only from the user's own account**, behind a switch in Settings, with no stub values.
3. **Every new data source gets a licence row** in `src/data/dataLicences.ts` (quote the terms and
   the date you read them), then run `npm run docs:licences`. If the terms do not allow showing the
   figures to others, say so in the row.
4. **Signals and forecasts are pre-registered.** Add the spec under `docs/validation/` before the
   first run, and do not change it after you have seen a result. A failed test stays failed; a new
   idea is a new version with its own spec. See [docs/METHODS.md](docs/METHODS.md).
5. **Accurate labels.** Say what a panel is ("Description, not a tested signal"), where a figure came
   from and how old it is.
6. **No bypassing bot checks** on data providers' sites (no fake browser user agents).

## Set up

You need Node.js 20.19 or later, or 22.12 or later, and git.

```bash
git clone https://github.com/e-conquest/econquest.git   # the public copy, once it is published
cd econquest
npm install
npm run dev          # http://localhost:3000
```

Settings go in a `.env` file in the repository folder; [.env.example](.env.example) lists every one
with a line on what it does. None is needed to start.

Before changing anything, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the parts fit
together, how one figure travels from a source to the screen and into a council answer, and where to
start for common changes.

Every figure works without an AI model. For the council, choose Ollama on your computer or a Gemini
key in Menu > Settings > AI model. A free FRED key fills most 10-year yields. See
[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Before you open a pull request

```bash
npm run lint         # TypeScript
npm test             # unit and server tests, network replaced by fixtures
npm run build
npx playwright install chromium   # once
npm run test:smoke     # every page with all feeds down
npm run test:journeys  # the main tasks, click by click
npm run test:a11y      # WCAG 2.2 A and AA on the main pages, and a keyboard focus pass
npm run size:check     # start-up under 520 KB compressed, the whole app under 9 MB
```

- Keep pull requests small and about one thing. Rebase on `main` rather than merging it in.
- Add or update a test in `tests/` for each module you change in `src/utils/` or `server.ts`.
  Tests must not reach the network; use `tests/helpers/offline-fetch.mjs`. Tests also run on
  Windows (Actions > Windows check), so compare file paths with forward slashes
  (`path.relative(...).split(path.sep).join('/')`), never by hand-written `/`.
- The built app sends a strict page security policy (`PRODUCTION_CSP` in
  `src/utils/requestLimits.ts`): no inline scripts, no `eval`, and connections only to the app's own
  server. A screen that needs an outside address goes through a server route. `npm run test:smoke`
  fails on anything the policy blocks.
- New UI follows [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) and sits inside a `PanelBoundary`.
  It must work with a keyboard alone: every control can be reached with Tab, shows a focus ring and
  is not hidden behind another element when focused (`npm run test:a11y` checks this on the main
  pages). Animation stops when the computer's "reduce motion" setting is on: the style rule in
  `src/index.css` covers spinners and transitions, and a scripted scroll takes its behaviour from
  `scrollBehavior()` in `src/utils/motion.ts`. [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) says
  what is checked and what is known not to work yet.
  A new screen loads only when it is opened (`lazyNamed` in `src/components/LazyDesk.tsx`).
- Every new piece of screen text goes in `src/i18n/messages/` and in the Spanish, French and
  Portuguese files beside it (`src/i18n/es/`, `fr/`, `pt/`): Spanish uses *usted*, French *vous* and
  Portuguese is Brazilian, with *você*. `npm test` fails when a language misses a key.
- Some documents are generated and must not be edited by hand: `docs/METHODS.md`
  (`npm run docs:methods`), `docs/TRACK_RECORD.md` (`npm run docs:track-record`, from
  `docs/validation/recorded-verdicts.json`, which only `npm run track-record:import` adds to),
  `docs/DATA_LICENCES.md` (`npm run docs:licences`) and `docs/GLOSSARY.md` (`npm run docs:glossary`).
- Use plain words a lay reader understands. Say what something does, not how good it is.
- Never commit keys, `.env`, or anything from `data/`.
- Every outside build step and base image is pinned to a fixed version: a GitHub Actions step names
  a full commit with the version in a comment after it, and a Dockerfile names a base image digest.
  `tests/pinnedBuildSteps.test.ts` fails on a loose tag such as `@v4` or `node:22`; Dependabot keeps
  the pins current. Once the repository is public, CodeQL code scanning runs on each pull request
  and its findings show under Security > Code scanning. `npm run sbom` prints the software parts
  list of what the app ships.
- Real feed replies to test against ship in `tests/fixtures/recorded-public/`: World Bank, IMF
  DataMapper, BIS, ECB, New York Fed, Eurostat, CFTC, GDELT and Brazil Treasury replies, kept
  unchanged, from sources whose terms allow passing them on (see its README for each credit).
  `npm test` replays them through the server (`tests/recordedPublic.test.ts`) with no key and no
  connection; a change that stops the app reading one of those sources or figures fails there.
- A full recording (`npm run record:feeds`) stays on your computer: several sources do not allow
  their data to be passed on, so `tests/fixtures/recorded/` is not part of the public repository.

## Sign off your commits (DCO)

By contributing you certify the [Developer Certificate of Origin](https://developercertificate.org/):
that you wrote the change or have the right to submit it under the project's licences. Add a
sign-off line to each commit:

```bash
git commit -s -m "Explain what changed"
```

which adds `Signed-off-by: Your Name <you@example.org>`. Code is contributed under the Apache License
2.0 and documentation and content under CC BY 4.0 ([LICENSE-docs.md](LICENSE-docs.md)).

AI coding tools are fine to use. You are responsible for the change as if you wrote it by hand: read
it, test it, and say in the pull request that a tool helped.

## Where things are

The short table is below; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) has the full map.

| Path | What |
| --- | --- |
| `server.ts` | Express app start-up: routes, data pulls, caches and the archive |
| `src/server/` | Server parts: feed readers (`feeds/`), routes, the AI client, the last good answers (`lastGood.ts`), release-day re-reads (`releaseWatch.ts`), the update check (`updateCheck.ts`), the broker gateway, events and webhooks, sign-in |
| `src/utils/` | One module per source or calculation, each with a test in `tests/` |
| `src/components/` | React pages and panels |
| `src/i18n/` | Screen text in English (`messages/`) and Spanish, French and Portuguese |
| `src/data/` | Navigation, official calendar, country list, model register, licence register |
| `docs/validation/` | Pre-registered specs and recorded verdicts |
| `scripts/` | Command-line jobs (`npm run check:data`, the daily run, backtests, evaluations, safe updates) |
| `tests/smoke/` | Browser checks of the built app: every page, the main journeys, accessibility |
| `models/` | The optional Python service that runs the World Bank country models (ModelFlow, Docker profile `models`) |
| `.github/workflows/` | CI, the Windows check, the image build, releases, the Quests checks, code scanning and Scorecard |

## Add a data source, step by step

A new source touches several places, because of the research rules above. Each step names the file
to change; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) section 2 explains how the parts connect. The
official forecasts source (`src/server/feeds/officialForecasts.ts` and `src/utils/officialForecasts.ts`)
is a complete recent example to copy from.

1. **Read the terms first.** Add a row to `src/data/dataLicences.ts`: quote what the source's own
   terms page says about showing the figures to others and about commercial use, with the date you
   read it. If the page cannot be read or does not say, mark the row `not_verified`; never fill it in
   from memory. Run `npm run docs:licences`. Then add a pattern for the source's name to
   `SOURCE_PATTERNS` in `src/utils/licenceLookup.ts`, so sharing mode can hold back its figures when
   the terms do not allow passing them on.
2. **Write the parser as a plain function** in `src/utils/<source>.ts`: text or JSON in, figures out,
   no network and no files. Every figure keeps its source label and date. When the reply has nothing
   usable, return the reason, not a guess.
3. **Test the parser on a real reply.** Save a small cut of a real reply in
   `tests/fixtures/<source>/`, named with the date you saved it, and write `tests/<source>.test.ts`.
   Never make up a reply by hand to stand in for a real one.
4. **Fetch it.** Put the download in `src/server/feeds/<source>.ts`. Use `fetchWithTimeout` or
   `fetchRetrying` from `src/server/http.ts`, send the app's own user agent (`RESEARCH_USER_AGENT` there,
   never a fake browser one), and keep keys out of anything that is logged.
   - A figure for one country goes into the country snapshot in
     `src/server/snapshot/network.ts`, with an entry in `snapshot.liveFields` naming the source.
   - A world-wide file is saved by the daily download: add a `world:` step to `preloadPlan` in
     `src/utils/preload.ts` and a `case` for it in `runPreloadStep` in `server.ts` that saves the file
     under `data/live/` and returns `done` or `failed` with a note.
   - A file the user must download themselves is read by a store module (`src/utils/<source>Store.ts`)
     from its own folder under `data/local/`, and never shipped.
5. **Serve it from what is saved.** A route the page opens reads the saved copy and answers at once;
   it never waits on the source. Put new routes in a file under `src/server/routes/` and register it
   from `startServer` in `server.ts`.
6. **Say why it is missing.** Every place that shows the figure shows **Missing** with a reason when
   it is not there: needs setup (and where to set it up), the source did not answer, or no source yet.
7. **Add a row to the source check.** Add the id to `SOURCE_IDS` and an `add('<id>', ...)` check in
   `src/utils/connectionCheck.ts` that asks the source once and prints one figure it returned. This
   is what `npm run check:data` and Menu > Data health show.
8. **Show it.** A new panel loads only when opened (`lazyNamed`), sits inside a `PanelBoundary`,
   and says what it measures, whose figure it is and how old it is. For a History & data tool, add an
   entry to `COUNTRY_TOOL_GROUPS` in `src/utils/countryTools.ts`.
9. **Screen text in four languages.** Add every new string to the English catalog in
   `src/i18n/messages/` and to the Spanish, French and Portuguese files beside it.
10. **Write it down.** Add the source to `docs/DATA_SOURCES.md` (what it fills and how to set it
    up), a line to `CHANGELOG.md` under Unreleased, and, for a file the user saves, a row in the
    "Files you save yourself" table in `docs/INSTALL.md`.
11. **Check it live.** The tests never reach the network, so run `npm run check:data` on a computer
    that reaches the source and say in the pull request what the new row printed. If you cannot reach
    the source, say so; the maintainer will check it.

## Changing what a model is asked

Most of the app needs no AI model, and the Council chat agents are code, so changing what an agent
says needs only its unit test. Changing anything a **model** is sent is different: a prompt, an
instruction, a template, the inputs a step passes or its settings.

`tests/councilRecorded.test.ts` replays real replies from the referee model, recorded in
`tests/fixtures/council-recorded/`. When a change alters what the model would be asked, that test
fails and names the first line that changed. That is expected, and the fix is a new recording, not a
change to the test:

- **If you have Ollama and a 32B model** (about 20 GB, best with 32 GB of memory), run
  `npm run council:record -- --model qwen2.5:32b`. It uses an empty data folder and takes several
  minutes. Read the answers it prints; if they are right, commit `tests/fixtures/council-recorded/`
  with your change.
- **If you do not,** open the pull request anyway and say in it that the council recording needs to
  be made again. The maintainer records it on a computer that can, and the pull request waits for that.

Never edit the files in `tests/fixtures/council-recorded/` by hand.

## Good first contributions

- A feed that broke: run `npm run check:data`, find the source that fails, fix its module and test.
- A licence row marked "Terms not confirmed": read the provider's terms and update the row.
- A methods note in `docs/METHODS.md` that is unclear or wrong.
- Issues labelled `good first issue`.

## Review a translation

If Spanish, French or Brazilian Portuguese is your first language, the most useful thing you can do
is read the app's text in it. None of the three has been checked by a native speaker yet. The
checklist, the register for each language and the steps are in
[docs/TRANSLATION_REVIEW.md](docs/TRANSLATION_REVIEW.md); start with a **Translation review** issue
so two people do not take the same files.

## Quests

A section on proposing and entering Quests will be added here when Quests launch.

## Questions

Open a Discussion or an issue. Decisions and who makes them are described in
[GOVERNANCE.md](GOVERNANCE.md).
