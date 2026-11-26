# Accessibility

EconQuest aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, the level
used by public-sector rules such as Section 508 in the United States and EN 301 549 in Europe. This
page says what is checked, what works, what does not yet, and how to report a problem.

Last reviewed: 26 November 2026, version 0.3.0 plus the changes listed in the change log.

## Status

**Partly meets WCAG 2.2 AA.** The automated checks pass on every page they cover. A full review by
a person using a screen reader has not been done yet, and the known gaps below remain.

## What is checked on every change

Each pull request runs `npm run test:a11y` (`tests/smoke/a11y.mjs`) on the built app, at laptop and
phone width, with every data feed switched off:

- **The axe-core rule set** for WCAG 2.0, 2.1 and 2.2 levels A and AA on the Workspace, Research
  (country, compare, portfolio), Reports, Tools, Settings, About and the pop-out watchlist. It covers,
  for example, names for buttons and fields, colour contrast, page language, heading order and the
  24-pixel minimum size for things you tap or click. Any serious or critical problem fails the change.
- **A keyboard pass** on the Workspace, Research and phone pages: moving with the Tab key, every
  control must show a visible focus ring (2.4.7) and must not be hidden behind a fixed bar or panel
  (2.4.11).
- **Keyboard journeys** (`npm run test:journeys`): the "Skip to content" link, Council chat, the
  country sections and the keyboard shortcuts.

Automated checks find only part of the problems a person meets, so they are a floor, not a proof.

## What works

- **Keyboard only.** Every screen can be used with the keyboard. "Skip to content" is the first
  thing Tab reaches. Shortcuts: `/` jumps to the council question box, Cmd/Ctrl+K opens Tools
  with its search box, Cmd/Ctrl+, opens Settings, Esc closes a window and `?` shows the list.
- **Visible focus.** A blue ring shows where the keyboard is, in light and dark mode.
- **Reduce motion.** With the computer's "reduce motion" setting on, spinners and transitions stop
  and the app jumps to a section instead of gliding. Charts are drawn without animation.
- **Zoom and text size.** The pages are built to work down to phone width, so browser zoom keeps
  the layout usable; the phone width is part of the automated check.
- **Light and dark mode** follow the computer's setting until you choose one.
- **Plain language and help levels.** The help level button in the header sets how much
  explanation each screen gives (off, key help, full). Terms are explained in the
  [glossary](GLOSSARY.md).
- **Four languages** (English, Spanish, French, Brazilian Portuguese), with the page language set so
  screen readers use the right voice.
- **Figures as text.** Council answers state each figure in words with its source and period, and
  chart data can be downloaded as a table (CSV or Excel).

## Known gaps

- **Charts.** Most charts are pictures to a screen reader. The figures are available as text in
  answers and as downloadable tables, but not yet as a table beside each chart.
- **Not yet tested by a person with a screen reader** (VoiceOver on Mac, NVDA on Windows, TalkBack
  on Android). This is the next step.
- **Small print.** A few labels use very small text. Browser zoom enlarges them.
- **Outside pages.** Pages of data sources and AI providers that the app links to are outside the
  project's control.

## Reporting a problem

If something in EconQuest is hard or impossible to use, please say so: Menu > Report a problem, or
open an issue on GitHub with the screen, what you tried and what assistive technology you use (for
example "VoiceOver on macOS 16, Safari"). Accessibility problems are treated as bugs.

## How this page is kept current

The statement is reviewed with each release (docs/MAINTENANCE.md, "Each release"). A change that
adds a screen adds it to `tests/smoke/a11y.mjs`.
