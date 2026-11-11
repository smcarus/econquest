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
