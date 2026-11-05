# Data sources

Every outside source the app reads, what it fills, and how to set it up. All settings go in
one file, `.env` (start from `.env.example`). After a change, restart the app and check:

```bash
npm run check:data        # one line per source, from this computer
```

The same check is on the **Tools** page under **Data connections**. Each source is asked for one
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

The rule throughout: a figure is shown only when one of these sources filled it. Where a source
did not answer or is not set up, the figure reads **Missing** with the reason. Nothing is
estimated, invented or taken from built-in sample values.

## Free, no key

| Source | Fills | Address | Kept for |
| --- | --- | --- | --- |
| World Bank indicators | Reserves, current account, external debt, political stability, trade shares | api.worldbank.org | 1 week (country snapshot) |
| World Bank debt statistics (IDS, QEDS) | External debt falling due by year and quarter (banker brief) | api.worldbank.org | 12 h |
| IMF World Economic Outlook | Debt/GDP, inflation, GDP growth, primary balance | www.imf.org | 1 week (country snapshot) |
| IMF reserves and balance of payments | Monthly official reserves (International Liquidity, IL); quarterly current account and imports of goods and services (BOP); import cover and current account % of GDP | api.imf.org | 1 day, on disk (structures 1 week) |
| GDELT | Headlines and news tone (a risk score input) | api.gdeltproject.org | 7 days, on disk (`GDELT_REFRESH_DAYS`) |
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
| OECD leading indicators | Composite leading indicator (amplitude adjusted, 100 = long-term average), monthly, for the countries the OECD covers | sdmx.oecd.org | 1 day, on disk |
| OECD consumer prices | Headline CPI inflation, y/y, monthly; the app's inflation figure where the OECD publishes one (IMF elsewhere) | sdmx.oecd.org | 1 day, on disk |
| FRED download | 10Y yields: US, Mexico, South Africa, Japan, UK, Poland, Chile | fred.stlouisfed.org | 6 h |
| Brazil Treasury (Tesouro Direto) | Brazil 10Y yield (NTN-F) | www.tesourotransparente.gov.br | 6 h, also on disk |

Notes from the first check on Sam's Mac (2026-11-05):

- **GDELT** allows one request every 5 seconds and answers HTTP 429 otherwise. The app now
  queues its GDELT requests 5.5 seconds apart and skips one that would wait more than 30 seconds.
  After a refusal GDELT holds each answer about 11 seconds and keeps refusing, so the app sends
  nothing to GDELT for 15 minutes after any refusal. Each country is pulled once every
  `GDELT_REFRESH_DAYS` days (default 7) and kept on disk (`data/live/gdelt/`).
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
- **OECD leading indicators** come from the OECD Data Explorer API (dataflow
  `OECD.SDD.STES,DSD_STES@DF_CLI`, measure LI, amplitude adjusted). The OECD publishes around
  mid-month; the newest month is usually one to two months old and always shows with the date the
  app pulled it. The app asks once a day for every area at once (the OECD asks users to keep calls
  modest), keeps it on disk (`data/live/oecd-cli.json`), and if the OECD refuses the narrow query
  asks once for the whole dataflow and reads it the same way. The EU benchmark reads the euro
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
  picks the indicator whose IMF name fits ("Reserve assets, total", "Current account",
  "Goods and services" imports), then asks for that series for each country and checks the
  series is in US dollars and states its unit (millions, billions). Every figure shows the IMF
  series key and period. If a name does not match (the check says which), set the series key in
  `.env`: `IMF_RESERVES_KEY`, `IMF_CA_KEY`, `IMF_IMPORTS_KEY`, with `{ISO3}` for the country.
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
- **OECD consumer prices** come from the same API (dataflow `OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL`,
  headline CPI, all items, monthly). The OECD's own y/y rate is used; where only the index is in
  the reply, y/y is worked out from the index 12 months apart and the source says so. Asked once
  a day for every area, kept on disk (`data/live/oecd-cpi.json`). Where the OECD has a figure it
  becomes the app's inflation figure (watchlist, Central Bank Watcher, real rates, the
  divergence list), shown as "OECD, <month>", because it is monthly and the IMF's is annual;
  elsewhere the IMF figure stays and says IMF. Readings: the y/y rate, the change over three
  months, and a stated rule on it (up 0.5 pts or more = rising, down 0.5 pts or more = easing).
  A country the OECD answered without reads "OECD publishes no CPI" on the OECD rows.

## Free, with your own key

| Source | Fills | Settings |
| --- | --- | --- |
| FRED API | The same yields as the FRED download, through the official API | `FRED_API_KEY` (optional; the download is used without it) |
| Turkey central bank (EVDS) | Turkey 10Y yield | `EVDS_API_KEY` and `EVDS_TR10Y_SERIES` (both needed) |
| US EIA open data | Daily Brent and WTI spot prices | `EIA_API_KEY` (optional; free at eia.gov/opendata > Register; without it oil comes monthly from the Pink Sheet). Pulled every 12 h, on disk with the Pink Sheet |

## Your own paid data (off unless you switch it on)

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
| Gemini | `DEFAULT_AI_PROVIDER="gemini"`, `GEMINI_API_KEY` | Reads the model's description, so the key and model name are checked without spending tokens |
| OpenAI-style server | `DEFAULT_AI_PROVIDER="openai_compatible"`, `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL` | Lists its models |

The provider can also be changed in the app (Menu > AI model and data connections). That setting
wins while the app runs; `npm run check:data` reads only `.env`.

## Your own connectors

Menu > AI model and data connections > connectors lets you point the app at your own JSON
address (an internal data lake, for example) and map its fields. Figures from a connector are
labelled with the connector's name. When a connector cannot be reached, its test says so and
maps nothing.

## Docker

`docker compose` passes `.env` into the container. A CDS file must sit inside a folder the
container can see; running with `npm run dev` on the Mac avoids that step.
