# Reading the app's data from R, Python or Stata

The figures and series you see in the app can be read straight into your own scripts. The addresses
below are the same ones the app's own pages use, so a script gets exactly what the screens show:
the same values, the same units, the same source and date on every value, and the same "Missing"
with its reason where the app has no figure. Nothing is estimated or filled in for you.

There are three small helper files in `scripts/data-api/`, one each for Python, R and Stata. None
needs anything installed beyond the language itself. Copy the one you use next to your script.

## Before you start

1. Start the app as usual (`npm run go`, `npm run dev` or Docker).
2. Find its address. `npm run dev` runs at `http://localhost:3000`; the Docker copy runs at
   `http://localhost:3737`. The helpers use `http://localhost:3000` unless you set
   `ECONQUEST_URL` (or pass `base=`).
3. On your own computer with sign-in off (the usual case) that is all. If your copy has sign-in on,
   read "Copies with sign-in on" below.

## Python

```python
import econquest as eq            # scripts/data-api/econquest.py, next to your script

rate = eq.series("BRA", "policy_rate")              # one dict per date
every = eq.country_series("BRA")                    # every series for Brazil, one long table
panel = eq.panel(["BRA", "MEX"], ["policy_rate", "cpi_monthly"], mode="history")
past = eq.figures("BRA", as_of="2026-06-30")        # the figures as the app saved them that day
listing = eq.series_list("BRA")                     # what exists, and what is Missing and why

import pandas as pd                                 # optional
df = pd.DataFrame(rate)
```

## R

```r
source("econquest.R")             # scripts/data-api/econquest.R
rate  <- eq_series("BRA", "policy_rate")
panel <- eq_panel(c("BRA", "MEX"), c("policy_rate", "cpi_monthly"), mode = "history")
past  <- eq_figures("BRA", as_of = "2026-06-30")
```

## Stata

```stata
do econquest.do                   // scripts/data-api/econquest.do
econquest_series BRA policy_rate
econquest_panel BRA,MEX policy_rate,cpi_monthly history
econquest_figures BRA 2026-06-30
```

Each Stata command replaces the data in memory. Values arrive as text and the `value` column is
turned into numbers; dates stay as text (`YYYY-MM`, `YYYY-Qn` or `YYYY`), so convert them with
`monthly()`, `quarterly()` or `real()` to suit the series.

## What comes back

Series tables (one row per date) have these columns:

| Column | Meaning |
| --- | --- |
| `iso3` | Country code, or `WORLD` |
| `series_id`, `series` | The series' short id and its name |
| `unit`, `frequency` | For example `%` and `monthly` |
| `date`, `value` | The period and the figure |
| `source` | Where the series comes from |
| `source_that_day` | Set when a date's figure came from a different source than the rest |
| `pulled_at` | When the app last downloaded it |
| `definition` | What the series measures, from its source's own definition (for example "General government gross debt, as % of GDP (IMF WEO GGXWDG_NGDP)") |
| `coverage` | Whose figure it is: general government, central government, public external debt, households and firms, the whole economy, and so on |
| `seasonal_adjustment` | Seasonally adjusted, seasonally and calendar adjusted, not seasonally adjusted, a change on a year earlier (seasons largely cancel), not applicable (yearly figure, market price or forecast), or "Not stated by the source" |
| `measure`, `base_year`, `currency` | Empty for now; filled by a later change (real or nominal, base year, currency) |

The `/api/series/...` lists carry the same labels under `tags` (`tags.definition`, `tags.coverage`,
`tags.seasonalAdjustment`), plus `tags.frequencyNote` where it matters how the points are formed
(for example month-end rates, a monthly average of daily figures, one point per auction, or how the
app averages months into quarters for the GDP nowcast). A series the app has no definition for says "Not stated yet" rather than a guess.

Panel tables in latest mode have `iso3, country, figure_id, figure, value, unit, status, period,
source, reason_if_missing`. A figure the app does not hold has an empty value, status `Missing` and
the reason.

The figure ids for panels are listed in the `figures` part of the `/api/panel` answer (for example
`policy_rate` and `cpi_monthly`); the panel table on Research > Compare countries uses the same ones. Series ids for a country come from `series_list` (Python) or `/api/series/BRA` in a
browser.

## Sharing mode

Downloads follow Menu > Sharing mode exactly as they do in the app: with it on, values whose source
does not allow passing them on for free, and figures from your own files (Menu > Your data), are
held back and say why. Turn it off for your own research; turn it on before you hand files to
someone else.

Figures from your own paid data subscription (Menu > Settings > Your subscriptions) are never sent
to scripts: a request carrying the API key, or from another computer, gets the series named with
"Withheld: your subscription data" instead, and table downloads always withhold them.

## The addresses

Every address answers a plain `GET`. Tables also come as Excel: change `.csv` to `.xlsx`.

- `GET /api/series/:iso3`: every series the app holds for one country (id, label, unit, frequency,
  source, first and last date, latest value), and the series that are Missing with the reason.
- `GET /api/series/:iso3/:id`: one series in full, as JSON.
- `GET /api/series/world`: series not about one country (commodity prices, stress indexes, your own
  world series).
- `GET /api/series/world/:id`: one world series in full.
- `GET /api/panel`: countries by figures as JSON. Query: `countries=BRA,MEX` (up to 60),
  `figures=policy_rate,cpi_monthly`, `mode=latest` or `mode=history` (history gives a 50-row
  preview; use the table download for every row).
- `GET /api/export/:iso3/series.csv`: every series for one country as one long table.
- `GET /api/export/:iso3/series/:id.csv`: one series as a table.
- `GET /api/export/world/series.csv`: world series as a table.
- `GET /api/export/panel.csv`: the panel as a table, same query as `/api/panel`.
- `GET /api/export/:iso3/figures.csv`: the latest figures for one country with source and period.
  Add `?asOf=YYYY-MM-DD` for the figures as the app saved them on or before that day.

An address that has nothing to give answers with a short JSON note, for example
`404 NO_SERIES` with the reason the series is Missing.

## How fast, and how often

The addresses answer from the app's saved copies first; a first download that is slow finishes in
the background, the same as on the screens. The daily run (`npm run go -- daily`) keeps the saved
copies fresh, so a script never needs to download from the original sources itself.

So that a script in a loop cannot slow the app for everyone else, reads that do not come from a
signed-in account are limited to about 120 a minute from one address. Past that the app answers
`429` with a `Retry-After` header saying how many seconds to wait. One panel download with many
countries counts as one read, so prefer that to one call per country.

## Copies with sign-in on

When the app is shared on a network and asks people to sign in, a script has no account. It can
still read these addresses (and only these, plus the integration API) with the integration API key:

1. Pick a long random key and set it in `.env` as `SMCR_INTEGRATION_API_KEY=...`, then restart the
   app. Without this the key changes at every restart.
2. In Menu > Settings > AI model > Advanced AI set-up, tick "Enforce X-SMCR-API-Key Header on
   Pull/SSE".
3. Give the key to the script in `ECONQUEST_KEY` (or `key=`). The helpers send it in the
   `X-SMCR-API-Key` header; `Authorization: Bearer <key>` also works.

The key is only ever read from the header, never from the address, so it does not end up in logs
or browser history. Treat it like a password: anyone with it can read the data the app holds.
