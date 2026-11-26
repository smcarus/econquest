# Upkeep routine

How EconQuest is kept working as its data sources, their terms and its libraries change. Most of it
runs on its own; the rest is a short list for the maintainer once a month and once a year.

## Every day (automatic)

The daily data run (`npm run go`, or `npm run go -- daily`) ends with a connection check of every
source. Each check is saved in `data/local/data-health/source-checks.jsonl` (states and reasons only,
never keys) and shown in **Menu > Data health**: which sources answered, which failed and since when.

When a source has failed at every check for **30 days or more** (and at least three checks in a row),
Data health and `npm run check:data` flag it: "Failing for 30 days or more. Check whether the source
has ended or moved."

A few things recover on their own, so a single bad morning needs no action:

- **Retries.** The connection check asks a source up to three times (3 s, then 10 s apart) after no
  answer in time, a cut connection, 429 or 500-504, following the server's Retry-After (up to 60 s).
  A failure that stays says how many times it was asked. Refusals (401, 403, 404), bot-check pages and
  "connection refused" are not retried.
- **Second and later tries.** Download steps that fail in the daily run are tried again at the end of
  the run, and, once 2 hours have passed, by the next start (at most 3 times before the next daily
  run). `npm run go -- status` lists each later try and what now works.
- **Last good answers.** Five feeds show their last good answer, with its own dates, while their
  source does not answer (saved in `data/live/last-good/`; asked again after 15 minutes, 1 hour, then
  every 4 hours; never served past its limit). Data health > Sources lists them.
- **Release days.** On a day the official calendar lists a CPI or monthly activity release, the app
  re-reads that source about once an hour until the new month arrives (`data/local/release-watch.json`;
  `RELEASE_WATCH=off` turns it off).
- **Safe updates.** `npm run go` and `npm run update` back up files the app writes itself (generated
  docs, recorded test data) to `data/local/backups/before-pull-<time>/`, put them back to the
  repository version, and pull. Files changed by hand are left alone and named
  (`bash scripts/safe-pull.sh` does the same on its own). The live-check scripts (`check:data`,
  `oecd:vintages`, `mac:validate`, `council:record`) update the folder first when it is behind
  GitHub (`ECONQUEST_NO_UPDATE=1` skips this).

## Once a month (maintainer)

1. **Open Data health.** For each source flagged as failing for 30 days or more, look at the source's
   own site: has it moved to a new address, changed its format, or ended? A move or a format change
   is fixed in a normal pull request with tests on saved replies. An ending follows the rule below.
2. **Dependency updates.** Dependabot opens its pull requests once a month: minor and patch updates
   together in one pull request per ecosystem, each major update on its own. Each is merged only
   after CI passes and on the maintainer's word. A major update that breaks something waits, with a
   note on the pull request saying why.
3. **Licence check due.** Data health lists any source whose terms were last read more than 12
   months ago (see below).
4. **Success measures.** After the public release, run `npm run check:success` to keep a record of
   GitHub stars, issues, flags and downloads, and of the outcome checks and answer ratings on this
   computer. The list and its review date are in docs/ROADMAP.md, "How we will know it works".
5. **Track record.** On a computer that reaches the feeds, run `npm run oecd:vintages` (new OECD
   editions only) and `npm run mac:validate`, then
   `npm run track-record:import -- --where "<which computer>"`. It adds a row for every test run
   there that is not on record yet (a recorded verdict is never changed; a passed or failed row
   recorded without a p takes the run's p when the test file and verdict match), summarises the forward
   record after checking its hash chain, and rebuilds docs/TRACK_RECORD.md and docs/METHODS.md.
   Commit the three files in a pull request.
6. **Translations.** Look at open Translation review issues; a language loses its "not yet
   reviewed" note only when every file in docs/TRANSLATION_REVIEW.md is ticked by a native speaker.

## Each release (maintainer)

Citations name the app's version and the git commit it was built from (`src/utils/buildInfo.ts`), so
a reader can find the exact code. The version only changes when someone changes it:

1. Run Actions > Windows check on the release commit (by hand; it costs nothing unless started) and
   `npm run public:export` for the clean public copy.
2. Raise `version` in `package.json`, `CITATION.cff` (with `date-released`) and `APP_CITATION` in
   `src/utils/citation.ts`; a test checks the three agree.
3. Add the release to `CHANGELOG.md`, tag it (`git tag v<version>`) and push the tag; the image
   workflow publishes `ghcr.io/...:<version>`.
4. Publish a GitHub Release for the tag on the public repository. Menu > About reads the newest
   release there once a day (`src/server/updateCheck.ts`) to tell people a newer version is out; a tag
   without a Release is not seen. Until the public repository has a release, About says "No public
   release yet". Publishing the Release starts `.github/workflows/release.yml`, which adds the
   source archive, the software parts lists (SPDX and CycloneDX), `SHA256SUMS` and GitHub-signed
   build proof to it within a few minutes; check they appear
   ([SECURITY.md](SECURITY.md#build-safety-and-checking-a-download)).
5. On the day the public repository and the image are first published, take out the "Not public
   yet" note at the top of Quick start in the four READMEs and of "The ready-made app, step by step"
   in `docs/INSTALL.md`, the testers' lines in the "Not public yet" notes and the "Testing first" item
   under Next in `docs/FEATURES*.md`, replace `docs/TESTING.md` with a pointer to INSTALL (and its
   links in the READMEs, HOW_IT_WORKS and the guides' Report a problem lines), point `ISSUE_REPO` in `src/utils/problemReport.ts` at
   `e-conquest/econquest` (Flag and Report a problem open issues there), then follow INSTALL steps 1 to 4 on a computer that has never run EconQuest
   (one Mac and one Windows PC) to check every link and command works.
6. Read [ACCESSIBILITY.md](ACCESSIBILITY.md) again and update its "Last reviewed" line and its known
   gaps.
7. Once the repository is public, archive the tag on Zenodo so the release gets a DOI, and add the
   DOI to `CITATION.cff`.

Docker builds pass the commit in (`APP_COMMIT`; `npm run go`, `start-mac.sh` and `update.sh` set it
from git, the image workflow from the pushed commit). A copy built without it cites the version alone.

## Once a year (maintainer)

Every row in the licence register (`src/data/dataLicences.ts`, shown in **Menu > About & data
licences** and `docs/DATA_LICENCES.md`) is read again on the source's own terms page. A row whose
`checked` date is more than 12 months old shows **Licence check due** in the app. After reading:

- update the quotes, status and sharing note if the terms changed, and set `checked` to the day read;
- if the new terms no longer allow what the app does with the figures, open an issue before anything
  else and switch the source off until it is settled;
- run `npm run docs:licences` so the document matches the register.

## When a source ends

A source has ended when it says so, when its address is gone for good, or when it has failed every
check for months with no new home. Then:

1. **Its figures stay, with their last date.** Nothing already saved is deleted. Each figure keeps the
   date it was published, and the source's licence row gets an `ended` date, shown as "Ended" in the
   app and in `docs/DATA_LICENCES.md`.
2. **Nothing is filled in from elsewhere.** A gap left by the source reads "Missing" with the reason.
   Another source can take its place only through a normal pull request that adds the new source with
   its own licence row, tests and Data health row, and says in the changelog which figures it now
   supplies and how they differ.
3. **Tests that used it** keep their recorded verdicts. A pre-registered test that can no longer run
   is marked as such on the track record; it is never re-run on a different source under the same
   version.
4. **The changelog says so**, with the date the source ended and what the app shows instead.
