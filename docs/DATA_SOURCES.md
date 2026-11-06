# Data sources

Every outside source the app reads, what it fills, and how to set it up. All settings go in
one file, `.env` (start from `.env.example`). After a change, restart the app and check:

```bash
npm run check:data        # one line per source, from this computer
```

The same check is on the **Tools** page (Menu > Tools, inside Settings) under **Data connections**. Each source is asked for one
small real answer, through the same address and reader the app uses, and comes back as:

| Status | Meaning |
| --- | --- |
| Connected | It answered and the app read it. The figure it returned is shown. |
| Needs setup | A key, file or setting it needs is missing or was not accepted. |
| Not set (optional) | Not needed: the app uses a free route instead, or it is an AI provider you do not use. |
| Off (your own account) | Paid data you have not switched on. |
| No answer | Timeout, address not found, connection refused, or blocked on the way. |
| Refused | It answered with an HTTP error (key rejected, not found, rate limited). |
| Unreadable answer | It answered, but not in the format the app reads. The source may have changed. |

### Check history

Every run of the check is kept in `data/local/data-health/source-checks.jsonl`, one line per run,
newest last (about a year of runs; states, reasons and the figure returned, never keys or setup
lines). Runs come from three places: the **nightly check** the app runs once a day after 05:30
local time (`DATA_CHECK_TIME`, `DATA_CHECK_TZ`; a Mac asleep then runs it when it wakes, and an
offline computer waits for the connection), **Check again** under Data connections, and
`npm run check:data` (add `-- --no-save` to leave a run out). From the history each source gets:
failing since (the first run of its current failing streak), runs failed in a row, the last time it
connected, and how many of its last 30 runs connected. "Needs setup", "Off" and "Not set" are not
failures: nothing was asked. `npm run check:data` ends with the sources that broke or came back
since the last saved run.

The rule throughout: a figure is shown only when one of these sources filled it. Where a source
did not answer or is not set up, the figure reads **Missing** with the reason. Nothing is
estimated, invented or taken from built-in sample values.

## Free, no key

The country snapshot (World Bank, IMF WEO, GDELT, FX, official 10Y yield, Polymarket) is pulled once
a week. If a feed does not answer on a pull (no internet, a slow server), the last good figure from
that feed is kept, its source label ends "kept from the <date> pull", and the snapshot is tried
again within the hour. A built-in value is never kept, and the 5Y CDS is never kept (it follows the
own-data switch in Settings).

| Source | Fills | Address | Kept for |
| --- | --- | --- | --- |
| World Bank indicators | Reserves, current account, external debt, political stability, trade shares | api.worldbank.org | 1 week (country snapshot) |
| World Bank debt statistics (IDS, QEDS) | External debt falling due by year and quarter (banker brief) | api.worldbank.org | 12 h |
| IMF World Economic Outlook | Debt/GDP, inflation, GDP growth, primary balance, output gap (only where the IMF publishes one, mostly advanced economies) | www.imf.org | 1 week (country snapshot) |
| IMF reserves and balance of payments | Monthly official reserves (International Liquidity, IL); quarterly current account and imports of goods and services (BOP); import cover and current account % of GDP | api.imf.org | 1 day, on disk (structures 1 week) |
| IMF COFER | World shares of official FX reserves by currency (US dollar, euro, renminbi, yen, sterling and others), quarterly | api.imf.org | 1 day, on disk |
| GDELT | Headlines and news tone (a risk score input) | api.gdeltproject.org | 7 days, on disk (`GDELT_REFRESH_DAYS`) |
| GDELT 2.0 raw files (events and Global Knowledge Graph) | Weekly event counts per country (protests, sanctions, violence, Goldstein and tone) and economic-theme shares of news (inflation, central bank, debt, currency, fiscal, lenders and more) with tone and the people and organisations named | data.gdeltproject.org/gdeltv2/ | Per day on disk (`data/live/gdelt-raw/`), look-back `GDELT_RAW_WEEKS` (default 8) |
| Polymarket, Kalshi | Prediction-market odds | gamma-api.polymarket.com, api.elections.kalshi.com | per request |
| New York Fed | Fed funds, SOFR, reverse repo | markets.newyorkfed.org | 3 min to 6 h |
| Spot FX | Exchange rates against the dollar | open.er-api.com (backup: Frankfurter) | 3 min |
| ECB rates (Frankfurter) | FX volatility; last year's closing rate for the year-to-date move | api.frankfurter.dev | 12 h |
| BIS | Real exchange rates; government debt securities | stats.bis.org | 12 h |
| BIS central bank policy rates | Policy rate per country with its date and central bank, the 12-month change and the last move | stats.bis.org | 12 h, on disk |
| WITS | Export and import shares with China and Russia | wits.worldbank.org | 24 h |
| CFTC Commitments of Traders | Weekly currency futures positioning (leveraged funds, asset managers) for MXN, BRL, ZAR, JPY, GBP, EUR | publicreporting.cftc.gov | Until a newer report can exist (weekly), on disk |
| US Treasury TIC | Holdings of US Treasuries by country, monthly (Japan, UK, China, Brazil, India and the other ~15 holders Treasury names) | ticdata.treasury.gov | 1 day, on disk |
| World Bank Pink Sheet | Monthly commodity prices: oil (Brent, WTI, Dubai), gas, LNG, coal, copper, iron ore, aluminium, nickel, gold, platinum, silver, soybeans, maize, wheat, palm oil, coffee, cocoa, sugar | www.worldbank.org (page), thedocs.worldbank.org (workbook) | 1 day, on disk |
| OECD leading indicators (via DBnomics) | Composite leading indicator (amplitude adjusted, 100 = long-term average), monthly, for the countries the OECD covers | api.db.nomics.world | 1 day, on disk |
| OECD consumer prices (via DBnomics) | Headline CPI inflation, y/y, monthly; the app's inflation figure where the OECD publishes one (IMF elsewhere) | api.db.nomics.world | 1 day, on disk |
| Banco Central do Brasil (SGS 13522) | Brazil's IPCA inflation over 12 months, monthly; used instead of the OECD figure when at least as new (it was September 2026 against May on 2026-11-05) | api.bcb.gov.br | 1 day, on disk |
| Eurostat HICP (prc_hicp_minr) | Monthly inflation, annual rate, all items, for EU members on your lists (Poland on the defaults); used instead of the OECD figure when at least as new. Turkey is not in this dataset | ec.europa.eu | 1 day, on disk |
| UN Comtrade | Annual goods trade by partner (shares with China, Taiwan, Russia and the Gulf producers; top partners) and the export mix by HS chapter (fuels, ores, metals, farm goods) | comtradeapi.un.org | 30 days per country, on disk |
| FRED download | 10Y yields: US, Mexico, South Africa, Japan, UK, Poland, Chile | fred.stlouisfed.org | 6 h |
| Brazil Treasury (Tesouro Direto) | Brazil 10Y yield (NTN-F) | www.tesourotransparente.gov.br | 6 h, also on disk |

Notes from the first check on Sam's Mac (2026-11-05):

- **GDELT** allows one request every 5 seconds and answers HTTP 429 otherwise. The app now
  queues its GDELT requests 5.5 seconds apart and skips one that would wait more than 30 seconds.
  After a refusal GDELT holds each answer about 11 seconds and keeps refusing, so the app sends
  nothing to GDELT for 15 minutes after any refusal. Each country is pulled once every
  `GDELT_REFRESH_DAYS` days (default 7) and kept on disk (`data/live/gdelt/`).
- **GDELT raw files** are the 15-minute files GDELT publishes for everyone (listed in
  `masterfilelist.txt`, newest in `lastupdate.txt`), not the DOC API, so they are not limited to one
  request every 5 seconds. `npm run gdelt:pull` reads every events file in the look-back
  (`GDELT_RAW_WEEKS`, default 8) and one Global Knowledge Graph file every
  `GDELT_GKG_EVERY_HOURS` hours (default 3; GKG files are about ten times larger). Each file is
  downloaded into memory, added up per country and thrown away; only one small file per day is kept
  in `data/live/gdelt-raw/`, with the list of files already read, so a stopped pull carries on and a
  weekly pull only fetches new files. `npm run gdelt:pull -- --estimate` prints the files left and a
  size estimate from the newest file sizes before downloading anything. A file GDELT never
  published (HTTP 404, it has gaps) is shown as missing; HTTP 429 or 503 pauses 15 minutes.
  Countries: GDELT writes places in FIPS codes (Chile CI, South Africa SF, Japan JA, UK UK), mapped
  to ISO3 in `src/utils/gdeltRaw.ts`. An event counts for a country when it happens there or the
  country is either actor; an article counts when it names a place in the country. Theme groups are
  GDELT theme names listed in `GKG_THEME_GROUPS` (for example ECON_INFLATION, ECON_CENTRALBANK,
  ECON_DEBT, ECON_CURRENCY*, ECON_TAXATION, ECON_DEVELOPMENTORGS). With GKG sampling the figures shown
  are shares of the articles read, and the share of files read is shown with them. The pull is the
  last step of *Download all country data* (no per-step time limit; Stop works mid-pull). After the
  first pull the server tops it up weekly (`GDELT_REFRESH_DAYS`), new files only.
- **Brazil Treasury** serves the whole price history, about 15 MB, slowly (60 seconds on the Mac).
  The app allows 90 seconds, downloads it once at a time, and keeps the answer on disk
  (`data/live/tesouro.json`) so a restart does not download it again.

- **CFTC** publishes positions as of Tuesday on Friday afternoon (US Eastern), so the newest
  figure is 3 to 10 days old and always shows its report date and the date the app pulled it. The
  app asks once for about three years of weekly reports for all six currency futures (one small
  request), keeps it on disk (`data/live/cftc.json`), and asks again only when the newest report
  is 7 or more days old and the last pull is over 12 hours old. Readings: leveraged funds net as
  a share of open interest, asset managers net, the week's change, and where leveraged funds sit
  in their own last three years (90th percentile or above = crowded long, 10th or below = crowded
  short; tagged as the FX Valuation Agent's reading). Turkey, Egypt, Indonesia, Poland and Chile
  have no CFTC-reported future and say so.
- **US Treasury TIC** publishes its Major Foreign Holders table monthly, around the 18th, for
  the month-end two months earlier (so the newest figure is 6 to 10 weeks old). It names only the
  largest holders; Mexico, Turkey, South Africa, Poland, Chile, Indonesia and Egypt are inside
  "All Other" and read Missing for that reason. The app reads `slt_table5.txt` (the older
  `mfh.txt` stopped at January 2023), keeps it on disk (`data/live/tic.json`) and asks again
  after a day. Readings: holdings, change on the month and over 12 months, share of all foreign
  holdings, and a stated rule on the 12-month change (down 10% or more = selling, up 10% or
  more = buying; tagged as the FX Valuation Agent's reading).
- **OECD leading indicators** come from the OECD's dataflow `DSD_STES@DF_CLI` (measure LI,
  amplitude adjusted), read through DBnomics (see "OECD via DBnomics" below). The OECD publishes around
  mid-month; the newest month is usually one to two months old and always shows with the date the
  app pulled it. The app asks once a day for every area at once (the OECD asks users to keep calls
  modest), keeps it on disk (`data/live/oecd-cli.json`), and if the narrow query finds nothing it
  asks once without the adjustment filter and reads it the same way. The EU benchmark reads the euro
  area. Readings: the level, the change on the month and over six months, and the OECD's cycle
  phase as a stated rule (above 100 and rising = expansion, above and falling = downturn, below
  and falling = slowdown, below and rising = recovery; tagged as the Global Spillover Agent's
  reading). A country the OECD answered without (Egypt, for one) reads Missing: "OECD publishes
  no CLI"; when the OECD did not answer, it says that instead.

- **BIS central bank policy rates** (dataset `WS_CBPOL`) come from each central bank through the
  BIS, daily for most countries. The app asks twice for every country at once: the latest daily
  figure, and about 25 months of month-end figures for the change over 12 months and when the
  rate last moved. It keeps both on disk (`data/live/bis-policy-rates.json`) and asks again after
  12 hours. Every figure carries its date and the central bank's name; a figure more than 45 days
  old is flagged as possibly out of date. The US figure is the mid-point of the Fed's target
  range; the EU benchmark uses the ECB deposit rate. Egypt is not in the dataset and reads Missing
  for that reason. `GET /api/data/policy-rates` lists what the app holds for each country.
  The rate feeds the watchlist column, the Country tab (with the 12-month change and last move),
  the Central Bank Watcher Agent and the stance check (policy tight / neutral / loose).
- **IMF reserves and balance of payments** come from the IMF data portal's SDMX 3.0 API
  (api.imf.org, no key). IFS was retired in 2025 and split into topic datasets: monthly reserves
  are in **IL** (International Liquidity) and the balance of payments in **BOP**. The IMF also
  changed its codes, so the app does not hard-code them: it reads each dataset's structure,
  picks the indicator whose IMF name fits ("Total reserves (gold at market value)", "Current
  account balance", "Goods and services" debit for imports), then asks for that series for each
  country and checks the series is in US dollars and states its unit (millions, billions). The
  live API states millions on some series whose values are whole dollars; when the stated unit
  would put a value above $100 trillion, the app reads the values as dollars. Every figure shows the IMF
  series key and period. If a name does not match (the check says which), set the series key in
  `.env`: `IMF_RESERVES_KEY`, `IMF_CA_KEY`, `IMF_IMPORTS_KEY`, with `{ISO3}` for the country.
  `npm run check:imf` prints the live IMF dimension order, the indicator codes whose names look
  relevant and the Brazil series each measure picks, to check the matching.
  Kept on disk in `data/live/imf_external.json` and asked again after a day. Readings: reserves
  and their 12-month change; months of imports (reserves over the last four quarters of imports,
  divided by 12; stated rule: under 3 = thin, 3 to 6 = adequate, over 6 = ample, tagged as the
  Central Bank Watcher Agent's reading); current account in the latest quarter and over four
  quarters as % of GDP, with GDP from the IMF World Economic Outlook for that year. A country the
  IMF has not published reads Missing with the reason.
- **World Bank Pink Sheet** is released early each month (around the third working day) with
  monthly average prices up to the month before, in nominal US dollars. The workbook's address
  changes with every release, so the app reads the World Bank's commodity markets page
  (worldbank.org/en/research/commodity-markets), follows its "Monthly prices" link
  (`CMO-Historical-Data-Monthly.xlsx`, about 1 to 2 MB) and reads the "Monthly Prices" sheet with
  its own small .xlsx reader (no extra package). If that page ever changes, put the workbook link
  in `PINK_SHEET_URL`. Kept on disk (`data/live/commodities.json`) and pulled again after a day.
  Readings per commodity: latest month, change on the month and over 12 months, and the latest
  against its 3-year average. A commodity whose column is not found reads Missing and says so.
  Shown at `GET /api/data/commodities`; the spillover scenarios read it.
- **OECD via DBnomics.** On Sam's first check (2026-11-05) the OECD's own API (sdmx.oecd.org)
  answered both OECD rows with HTTP 429 and a Cloudflare "Just a moment" page, its bot check.
  Sam chose DBnomics (03:33Z): a free mirror of the OECD's datasets under the OECD's own codes,
  no key. The app now reads `DSD_STES@DF_CLI` and `DSD_PRICES@DF_PRICES_ALL` from
  `api.db.nomics.world/v22/series/OECD/...`, filtered by dimension name, keeps the last 40 months
  of each series on disk, makes one call at a time at least 5 seconds apart, and pauses an hour
  after a 429 or a bot check. Figures say "OECD via DBnomics". DBnomics refreshes its OECD copy
  on its own schedule, so a new OECD month can appear a few days later than on the OECD's site.
- **OECD consumer prices** come from the same route (dataflow `OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL`,
  headline CPI, all items, monthly). The OECD's own y/y rate is used; where only the index is in
  the reply, y/y is worked out from the index 12 months apart and the source says so. Asked once
  a day for every area, kept on disk (`data/live/oecd-cpi.json`). Where the OECD has a figure it
  becomes the app's inflation figure (watchlist, Central Bank Watcher, real rates, the
  divergence list), shown as "OECD, <month>", because it is monthly and the IMF's is annual;
  elsewhere the IMF figure stays and says IMF. Readings: the y/y rate, the change over three
  months, and a stated rule on it (up 0.5 pts or more = rising, down 0.5 pts or more = easing).
  A country the OECD answered without reads "OECD publishes no CPI" on the OECD rows.

- **UN Comtrade** works without a key through its public preview, which returns up to 500 rows
  a request and allows few requests, so the app asks two small questions per country (every
  partner's total, then exports and imports by HS chapter), one at a time 1.5 seconds apart, and
  only once every 30 days (data/live/comtrade.json). It asks for the year two back, then three
  back if that year is not reported yet; every figure carries its year. A free key (Menu > Settings, or
  `COMTRADE_API_KEY` in `.env`; comtradeplus.un.org > My Comtrade > My API portal) switches to the keyed
  route with higher limits; the key is sent in a header, never in the address. Comtrade files
  Taiwan as "Other Asia, nes" (code 490) and the app labels it Taiwan. Readings: goods exports
  and imports, the share with China, Taiwan, Russia and the Gulf producers (Iran, Iraq, Kuwait,
  Qatar, Saudi Arabia, UAE, Bahrain, Oman), the top three markets and suppliers, the commodity
  share of exports, and fuels as a share of imports. On the Country tab and at
  `GET /api/data/trade-partners`.
- **IMF COFER** (currency composition of official foreign exchange reserves) is quarterly and
  published only for the world and country groups, never for one country. The app reads the
  world figure: it finds the world code in the COFER country list by name, asks for every COFER
  series for the world, and reads each currency from the series name. It uses the IMF's own share
  series when there are any, otherwise claims in each currency over total allocated reserves
  (stated on the row). Shown on every Country tab as a world reading, with the country's own
  currency first when COFER names it (Japan, UK, US, China, euro area, Canada, Australia,
  Switzerland), and given to the FX Valuation Agent for those currencies. Kept on disk in
  `data/live/imf_cofer.json`, asked again after a day. `IMF_COFER_KEY` in `.env` sets the series
  key if the names do not match.
- **Spillover scenarios** (Global Spillover Agent) use these: the Taiwan scenario counts exports
  to Taiwan as well as China (Comtrade; WITS has no Taiwan figure), Comtrade shares replace WITS
  when Comtrade has China and Russia, Hormuz states the Brent level it starts from and the share
  of imports from the Gulf producers, and a fourth line, "Commodity prices, last 12 months",
  applies each commodity's actual 12-month Pink Sheet move to the country's export mix and its
  fuel imports. Each line reads Missing when a figure it needs did not load.

## Free, with your own key

Keys marked "Settings or .env" can be pasted in the app under **Menu > Settings > Data API keys**
(or Cmd/Ctrl + comma). The app saves them on this computer only, in `data/local/settings.json`
(file readable by your user only, not in git), shows them masked, and sends each one only to its
own source. A key saved in Settings is used instead of the same key in `.env`; removing it there
goes back to `.env`. Each key has a Test button that runs the same check as Data connections.
`npm run check:data` reads the saved keys too. Keys can only be changed from the computer running
the app. Under Docker, `docker-compose.yml` publishes the app on this computer only
(`127.0.0.1`) and turns on `SETTINGS_ALLOW_REMOTE`, because requests reach the container from
Docker's network. `npm run dev` listens on this computer only (`127.0.0.1`), so nobody else on your Wi-Fi can open the
app, read saved research or change watch rules; set `HOST="0.0.0.0"` in `.env` to open it to your
network on purpose. Docker reads and writes the same `data/local/settings.json` in the project
folder, so a key saved while the app runs in Docker also works with `npm run dev` and
`npm run check:data`, and the other way round.

| Source | Fills | Settings |
| --- | --- | --- |
| FRED API | The same yields as the FRED download, through the official API | Settings or .env: `FRED_API_KEY` (optional; the download is used without it) |
| Turkey central bank (EVDS) | Turkey 10Y yield | Settings or .env: `EVDS_API_KEY` and `EVDS_TR10Y_SERIES` (both needed) |
| US EIA open data | Daily Brent and WTI spot prices | Settings or .env: `EIA_API_KEY` (optional; free at eia.gov/opendata > Register; without it oil comes monthly from the Pink Sheet). Pulled every 12 h, on disk with the Pink Sheet |

## Your own paid data (off unless you switch it on)

All of these can be set in **Menu > Settings > Your own paid data** (pick Off, My CSV file or
My LSEG account, then fill in that option's settings), or in `.env`. Picking Off in Settings
switches CDS off even when `.env` has a feed set. The LSEG password and app key are stored and
shown like the other keys (masked); the file path, user name and RICs are shown in full.

| Source | Fills | Settings |
| --- | --- | --- |
| Your CDS file | 5Y sovereign CDS | `CDS_FEED="csv"`, `CDS_CSV_PATH` (full path; columns `iso3,date,cds5y_bps,source`) |
| LSEG Data Platform | 5Y sovereign CDS | `CDS_FEED="lseg"`, `LSEG_APP_KEY`, `LSEG_USERNAME`, `LSEG_PASSWORD`, `LSEG_CDS_RICS` |

The check reads your file and says how many countries it found and how old the latest quote is
(it warns after 7 days). For LSEG it signs in and prices your RICs. Keys and passwords never
appear in the check, the app or its logs.

Not built yet (planned, also own-account only): Bloomberg, EPFR/IIF flows, consensus forecasts.
Policy rates come from the free BIS dataset (see above); only Egypt, which the BIS does not cover,
reads Missing.

## AI model

| Provider | Settings | The check |
| --- | --- | --- |
| Ollama (on this computer) | `DEFAULT_AI_PROVIDER="ollama"`, `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`, `OLLAMA_DEEP_MODEL` | Lists installed models and names any configured model that is missing, with the `ollama pull` line |
| Gemini | `DEFAULT_AI_PROVIDER="gemini"`, and the key in Menu > Settings > AI model key or `GEMINI_API_KEY` | Reads the model's description, so the key and model name are checked without spending tokens |
| OpenAI-style server | `DEFAULT_AI_PROVIDER="openai_compatible"`, `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL` | Lists its models |

The provider can also be changed in the app (Menu > Settings > AI model and data connections). That setting
wins while the app runs; `npm run check:data` reads only `.env`.

## Your own connectors

Menu > Settings > AI model and data connections > connectors lets you point the app at your own JSON
address (an internal data lake, for example) and map its fields. Figures from a connector are
labelled with the connector's name. When a connector cannot be reached, its test says so and
maps nothing.

## Pull archive

Every country pull the app saves is also kept by day in `data/archive/<ISO3>/<YYYY-MM-DD>.json.gz`
(not in git). `data/live/` holds only the newest pull; the archive keeps each one, so later tools
can show what the data said on a past date. A retry later the same day replaces that day's file.
Files are gzipped, a few tens of KB each. Nothing is deleted unless you set `ARCHIVE_KEEP_DAYS` in
`.env` to a number of days. Read it back with `GET /api/archive` (countries and days),
`/api/archive/<ISO3>` (days) and `/api/archive/<ISO3>/<date>` (the pull on or before that date).
Docker and `npm run dev` share the same `data/archive/` folder.

## Docker

`docker compose` passes `.env` into the container. A CDS file must sit inside a folder the
container can see; running with `npm run dev` on the Mac avoids that step.
