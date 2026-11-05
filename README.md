# EconQuest Sovereign Council Terminal

A research terminal for emerging-market sovereign and macro risk. It pulls free public data (World
Bank, IMF, BIS, OECD, FRED, CFTC, US Treasury, UN Comtrade, GDELT, Polymarket and more), shows it
country by country with its source and date, and lets you ask a council of desk agents about your
watchlist. Every agent answers from those figures only, and a summary agent may quote nothing else.

**The one rule: only real figures.** A number appears only when a live feed, an official series or
your own file supplied it. Anything else reads **Missing**, with the reason ("Needs setup", "Feed did
not answer", "No source yet"). There are no built-in, sample or AI-estimated figures. Paid data (CDS,
LSEG, EPFR, ratings, consensus) is used only from your own account or file, behind a switch in
Settings.

- [docs/USER_MANUAL.md](./docs/USER_MANUAL.md): how to use each page
- [docs/DATA_SOURCES.md](./docs/DATA_SOURCES.md): every source, what it fills, how to set it up
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md): UI rules for contributors

---

## Start it

You need Node.js 20 or later. Everything else is optional.

```bash
npm install
npm run dev          # http://localhost:3000, this computer only
```

On a Mac you can instead double-click `start-mac.command`, which runs the app in Docker on
http://localhost:3737 (Windows: `scripts/start-windows.bat`). Both ways read and write the same
`data/` folder, so keys and saved research carry over.

### First run

A new install shows dashes everywhere until a source answers. Workspace opens with a **Getting
started** card that ticks itself off:

1. **See which sources answer.** Menu > Tools > Data connections (or `npm run check:data`) lists every
   source as connected (with a figure it returned), needs setup, off, or why it failed.
2. **Add a free FRED key** in Menu > Settings (⌘, or Ctrl+,). It fills official 10Y yields for the
   US, Mexico, South Africa, Japan, the UK, Poland and Chile.
3. **Choose an AI model** in Menu > AI model: Ollama on this computer, or Gemini with a key. Needed
   only for the council summary, the debate and agent picks; every figure works without it.
4. **Pick your countries** with Edit on the watchlist card.

Keys saved in Settings go to `data/local/settings.json` (not in git) and take effect without a
restart. They win over the same key in `.env`. A few advanced switches stay in `.env` only; start
from `.env.example`.

### How data is kept

Each country's snapshot is pulled once a week and saved in `data/live/`. If a source fails during a
pull, the last good figure from that source is kept with "kept from the <date> pull" on its label,
and the pull is retried within the hour. **Refresh now** on the country page pulls everything for
that country again at once. Slower sources (IMF reserves, CFTC, TIC, OECD, Comtrade, Pink Sheet,
GDELT) keep their own caches; [DATA_SOURCES.md](./docs/DATA_SOURCES.md) lists each one's interval.
Your holdings, watchlists, added countries and AI model settings are kept in
`data/local/workspace.json` (shared by Docker and `npm run dev`), with saved research in
`data/local/research.json` and keys in `data/local/settings.json`.
Every pull is also kept by day in `data/archive/`, so the data as it stood on a past date is never
lost ([DATA_SOURCES.md](./docs/DATA_SOURCES.md#pull-archive)).

---

## What is in it

| Page | What it is for |
| --- | --- |
| **Workspace** | The daily start: since your last visit, watchlist, Ask the council, watch alerts, next two weeks |
| **Country Research** | Brief (economist, issuer and official-sector views), MarketEdge for the country, History charts, Sources (every figure with its source); CSV and Excel downloads |
| **Compare** | The watchlist side by side: where data and price disagree, MarketEdge, growth and inflation, scenarios, and a Compare countries table to download |
| **Portfolio** | Your holdings (CSV import) or your watchlist at equal weight: concentration, where the risk sits, dates to watch |
| **Reports** | Country note, issuer note, sustainability assessment, portfolio and client reviews, council brief; Markdown or PDF |
| **Tools** (in Menu) | Every ready tool grouped by use, data connections, and what each hidden desk would need to come back |

About 40 older desks are hidden while their inputs are not live. Menu > Show all tools brings them
back; their code is kept.

### Ask the council

Type a question about your watchlist ("Is Brazil's debt sustainable?", "Who is most exposed to a
Hormuz closure?"). The agents that cover the question answer from the app's figures, each with its
source: Central Bank, Fiscal & Debt, Politics & Events, Relative Value, FX, Global Spillover,
Calendar and Timing, plus a Document agent for policy files you upload. A summary agent then writes a
short brief that may quote only their figures; a number check flags any figure that is not traceable.
Briefs and documents are saved on this computer in `data/local/research.json`.

For a deeper view, **Run the full council** debates the open country across nine desk agents and
stops for your approval before the final report.

---

## For developers

```bash
npm run lint         # TypeScript
npm test             # unit and server tests (Node's built-in runner, network replaced by fixtures)
npm run build        # production bundle
npm run test:smoke   # opens every page of the built app in Chromium with all feeds down
npm run check:data   # live check of every source from this computer
npm run check:imf    # prints the IMF series codes the app matches
```

Every pull request runs lint, tests, build and the UI smoke test on GitHub
(`.github/workflows/ci.yml`). The smoke test needs Playwright's Chromium once:
`npx playwright install chromium`. `tests/server.test.ts` and the smoke test start the real server
with `tests/helpers/offline-fetch.mjs` in place of the network.

Layout: `server.ts` (Express API, data pulls and caches), `src/utils/` (one module per source or
calculation, each with a test in `tests/`), `src/components/` (React pages and panels),
`src/data/` (navigation, official calendar, country list). Each panel sits inside a crash guard
(`PanelBoundary`), so one failing panel never blanks the app.

### Integration API

Other apps can read council output from `/api/v1/integration/*` (desks, bundle, publish, an SSE
stream, deliveries, and `openapi.json`). It answers `404 NO_COUNCIL_RUN` until you have run the full
council on that country, and never sends built-in figures. Set `SMCR_INTEGRATION_API_KEY` and
`SMCR_WEBHOOK_HMAC_SECRET` in `.env` to fix the key and signing secret.

### Network

`npm run dev` listens on 127.0.0.1, so only this computer can open the app. Docker publishes on
127.0.0.1 too. Set `HOST="0.0.0.0"` in `.env` only if you want other machines on your network to
reach it; Settings can still be changed only from this computer unless `SETTINGS_ALLOW_REMOTE` is
"true".

The server answers only to localhost names (localhost, 127.0.0.1, [::1]), so a website cannot reach
it by pointing its own domain at this computer, and it refuses changes sent from pages on other
sites. If you open it to your network, list the names it may be reached by in `ALLOWED_HOSTS`. The
connector test and webhook buttons work only from this computer and cannot be pointed at the app
itself or at cloud metadata addresses.
