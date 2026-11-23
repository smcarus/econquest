# Translation review

The app's Spanish, French and Portuguese text was written without a native-speaker check, and the
language switch says so ("not yet reviewed"). This page is the checklist for closing that.

## How a review works

1. Open a **Translation review** issue (Issues > New issue) so two people do not review the same files.
2. Read every string in the files below for your language, in the app and in the file. Check meaning,
   register (Spanish *usted*, French *vous*, Brazilian Portuguese *você*) and economics terms
   (use the term a central bank in a country speaking that language would use).
3. Open a pull request with your changes, signed off (see CONTRIBUTING.md). Tick the files you
   finished in the table below in the same pull request.
4. When every file for a language is ticked by a native speaker, a maintainer sets `reviewed: true`
   for that language in `src/i18n/lang.ts`, and the "not yet reviewed" note goes away.

Do not translate data labels that come from a source (series names from the IMF, World Bank and
others stay as the source publishes them), and keep every "Missing" reason accurate: a reason
that sounds better but says something different is a wrong translation.

## Shared message files (all three languages in each file)

| File | ES | FR | PT |
|---|---|---|---|
| `src/i18n/messages/brief.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/chat.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/common.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/council.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/gapModel.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/menu.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/ownData.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/panels.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/reports.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/research.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/shell.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/tools.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/watchlist.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/workspace.ts` | ☐ | ☐ | ☐ |
| `src/i18n/messages/yourTests.ts` | ☐ | ☐ | ☐ |

## Spanish (usted)

| File | Reviewed by |
|---|---|
| `src/i18n/es/brief.ts` | |
| `src/i18n/es/briefText.ts` | |
| `src/i18n/es/chat.ts` | |
| `src/i18n/es/chatText.ts` | |
| `src/i18n/es/common.ts` | |
| `src/i18n/es/compareText.ts` | |
| `src/i18n/es/council.ts` | |
| `src/i18n/es/definitionsText.ts` | |
| `src/i18n/es/gapModel.ts` | |
| `src/i18n/es/glossaryText.ts` | |
| `src/i18n/es/index.ts` | |
| `src/i18n/es/keyFieldsText.ts` | |
| `src/i18n/es/menu.ts` | |
| `src/i18n/es/missing.ts` | |
| `src/i18n/es/ownData.ts` | |
| `src/i18n/es/panelText.ts` | |
| `src/i18n/es/panels.ts` | |
| `src/i18n/es/reports.ts` | |
| `src/i18n/es/reportsText.ts` | |
| `src/i18n/es/research.ts` | |
| `src/i18n/es/shell.ts` | |
| `src/i18n/es/toolText.ts` | |
| `src/i18n/es/tools.ts` | |
| `src/i18n/es/toolsCatalog.ts` | |
| `src/i18n/es/watchlist.ts` | |
| `src/i18n/es/workedText.ts` | |
| `src/i18n/es/workspace.ts` | |
| `src/i18n/es/yourTests.ts` | |

## French (vous)

| File | Reviewed by |
|---|---|
| `src/i18n/fr/brief.ts` | |
| `src/i18n/fr/briefText.ts` | |
| `src/i18n/fr/chat.ts` | |
| `src/i18n/fr/chatText.ts` | |
| `src/i18n/fr/common.ts` | |
| `src/i18n/fr/compareText.ts` | |
| `src/i18n/fr/council.ts` | |
| `src/i18n/fr/definitionsText.ts` | |
| `src/i18n/fr/gapModel.ts` | |
| `src/i18n/fr/glossaryText.ts` | |
| `src/i18n/fr/index.ts` | |
| `src/i18n/fr/keyFieldsText.ts` | |
| `src/i18n/fr/menu.ts` | |
| `src/i18n/fr/missing.ts` | |
| `src/i18n/fr/ownData.ts` | |
| `src/i18n/fr/panelText.ts` | |
| `src/i18n/fr/panels.ts` | |
| `src/i18n/fr/reports.ts` | |
| `src/i18n/fr/reportsText.ts` | |
| `src/i18n/fr/research.ts` | |
| `src/i18n/fr/shell.ts` | |
| `src/i18n/fr/toolText.ts` | |
| `src/i18n/fr/tools.ts` | |
| `src/i18n/fr/toolsCatalog.ts` | |
| `src/i18n/fr/watchlist.ts` | |
| `src/i18n/fr/workedText.ts` | |
| `src/i18n/fr/workspace.ts` | |
| `src/i18n/fr/yourTests.ts` | |

## Brazilian Portuguese (você)

| File | Reviewed by |
|---|---|
| `src/i18n/pt/brief.ts` | |
| `src/i18n/pt/briefText.ts` | |
| `src/i18n/pt/chat.ts` | |
| `src/i18n/pt/chatText.ts` | |
| `src/i18n/pt/common.ts` | |
| `src/i18n/pt/compareText.ts` | |
| `src/i18n/pt/council.ts` | |
| `src/i18n/pt/definitionsText.ts` | |
| `src/i18n/pt/gapModel.ts` | |
| `src/i18n/pt/glossaryText.ts` | |
| `src/i18n/pt/index.ts` | |
| `src/i18n/pt/keyFieldsText.ts` | |
| `src/i18n/pt/menu.ts` | |
| `src/i18n/pt/missing.ts` | |
| `src/i18n/pt/ownData.ts` | |
| `src/i18n/pt/panelText.ts` | |
| `src/i18n/pt/panels.ts` | |
| `src/i18n/pt/reports.ts` | |
| `src/i18n/pt/reportsText.ts` | |
| `src/i18n/pt/research.ts` | |
| `src/i18n/pt/shell.ts` | |
| `src/i18n/pt/toolText.ts` | |
| `src/i18n/pt/tools.ts` | |
| `src/i18n/pt/toolsCatalog.ts` | |
| `src/i18n/pt/watchlist.ts` | |
| `src/i18n/pt/workedText.ts` | |
| `src/i18n/pt/workspace.ts` | |
| `src/i18n/pt/yourTests.ts` | |

## Also translated

- `docs/GUIDE.es.md`, `docs/GUIDE.fr.md`, `docs/GUIDE.pt.md` and the README language sections.
- The one-page policy brief PDF text (in `src/i18n/*/brief*.ts`).
