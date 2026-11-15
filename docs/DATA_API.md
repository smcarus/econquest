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
| `measure` | Real (adjusted for inflation), real growth rate, nominal (current prices), share of GDP or GNI, price change (inflation), interest rate or spread, exchange rate, index, survey balance, ratio or share, probability, count, years, or score |
| `base_year` | The base year of an index or of constant prices (for example `2010` for the World Bank CPI index, `2021` for GDP per head at PPP); empty where there is none |
| `currency` | For amounts and prices: US dollars at market exchange rates, international dollars at purchasing power parity, the country's own currency, local currency per US dollar or per international dollar, or US dollar bonds; empty for ratios and indexes |

The `/api/series/...` lists carry the same labels under `tags` (`tags.definition`, `tags.coverage`,
`tags.seasonalAdjustment`, `tags.measure`, `tags.baseYear`, `tags.currency`), plus `tags.frequencyNote` where it matters how the points are formed
(for example month-end rates, a monthly average of daily figures, one point per auction, or how the
app averages months into quarters for the GDP nowcast). A series the app has no definition for says "Not stated yet" rather than a guess.

The helpers give `value` as a number: a float in Python (`None` where the figure is Missing), numeric
in R (`NA`), and numeric in Stata. Every other column stays text.

Files downloaded from the app's pages start with a byte order mark so Excel shows accents correctly.
The helpers ask for the file without it (their own User-Agent, or `?bom=0` from Stata), so the first
column is always `iso3`. Add `?bom=0` yourself if you read an address with another tool.

Panel tables in latest mode have `iso3, country, figure_id, figure, value, unit, status, period,
source, reason_if_missing`. A figure the app does not hold has an empty value, status `Missing` and
the reason.

The figure ids for panels are listed in the `figures` part of the `/api/panel` answer (for example
`policy_rate` and `cpi_monthly`); the panel table on Research > Compare countries uses the same ones. Series ids for a country come from `series_list` (Python) or `/api/series/BRA` in a
browser.

## Country codes

Every country in an answer carries both ISO 3166 codes: `iso2` (alpha-2, for example `BR`) and
`iso3` (alpha-3, `BRA`). JSON answers have both fields; tables keyed by country end with an `iso2`
column, after all the columns they had before, so a script that reads columns by position keeps
working. World tables leave `iso2` empty.

Wherever an address names a country you may use either code, in any case: `/api/series/BR`,
`/api/export/tr/figures.csv` and `/api/panel?countries=BR,MX` work the same as the alpha-3 forms.
Kosovo has no ISO code; the app uses `UVK` (the IMF's code) for alpha-3 and accepts `XK`, the code
most banks use, for alpha-2.

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

## Series added on 14 November

These series come through the same addresses as every other series, with the same columns and
labels. Weather series for a country are filled the first time its History & data page is opened
(or the series list is asked for), and then kept for 7 days (capital) or 30 days (country average).

| Series id | What it is | Source |
| --- | --- | --- |
| `weather_temp`, `weather_temp_anom` | Monthly temperature at the capital, °C, and °C warmer or colder than the same month's 1991-2020 average | NASA POWER |
| `weather_rain`, `weather_rain_pct` | Monthly rainfall at the capital, mm, and as % of the same month's 1991-2020 average | NASA POWER |
| `country_temp`, `country_temp_anom` | Monthly temperature averaged over the country since 1901, and against 1991-2020 | World Bank climate portal (CRU TS, CC BY 4.0) |
| `country_rain`, `country_rain_pct` | Monthly rainfall averaged over the country since 1901, and as % of 1991-2020 | World Bank climate portal (CRU TS, CC BY 4.0) |
| `cb_assets_gdp`, `cb_assets_usd` | Central bank total assets, % of GDP and US$ bn, quarterly | BIS |
| `usd_credit`, `usd_credit_yoy` | US dollar loans and bonds owed by the country's non-banks, US$ bn and change on a year earlier | BIS global liquidity indicators |
| `fed_swaps_total`, `fed_swaps_cb` | Federal Reserve dollar swap lines outstanding each Wednesday, all central banks and the country's own | New York Fed |
| `fx_regime_coarse`, `fx_regime_fine` | Exchange rate regime code by month (coarse 1 to 6, fine 1 to 15) | Ilzetzki, Reinhart and Rogoff workbook you save in `data/local/irr/`; held back in Sharing mode, because the authors state no licence for passing it on |
| `commodity_pink_sheet_rice_05`, `commodity_pink_sheet_wheat_us_hrw`, `commodity_pink_sheet_maize`, `commodity_pink_sheet_soybeans` | World prices of rice (Thai 5%), wheat (US HRW), maize and soybeans, US$ per tonne, monthly since 1960 (world series) | World Bank Pink Sheet |

The insurance tools (trigger designer, fair price, return periods, basis risk, disaster loss model,
tropical cyclones) and the policy council are calculations on these series and on files you save;
they are not served as separate tables. Use the series above to rebuild them in your own code, with
the rules in [METHODS.md](./METHODS.md).

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

## Connecting an outside portfolio system

An outside portfolio system (a "console") can use the app as a data and alert source over HTTP.
The full list of addresses, with what each one takes and gives, is in
[`docs/openapi.json`](openapi.json), which the app also serves at
`/api/v1/integration/openapi.json`.

### Naming positions

A position (holding) can carry the identifiers your system already uses, all optional:

| Field | What it is | How it is stored |
| --- | --- | --- |
| `isin` | ISO 6166 security number, for example `US0378331005` | In capitals; the check digit must be right |
| `lei` | ISO 17442 legal entity identifier, 20 characters | In capitals; the two check digits must be right |
| `cik` | The SEC's company number, 1 to 10 digits | Zero-padded to 10 digits, as EDGAR writes it |
| `ticker` | Letters, digits and `. - / :`, with an optional exchange code after a space (`PETR4 BZ`) | In capitals; not checked against any exchange list |
| `entityId` | Your own ID for the position or issuer, up to 128 characters | Exactly as sent, and given back unchanged |

The holdings file (Menu > Holdings > Import CSV) reads the same identifiers from optional columns
named `isin`, `lei`, `cik`, `ticker` and `entity_id`. A file with an `isin` column and no
`instrument` column names each position by its ISIN. A malformed identifier stops that row and the
import says which row and why. Exports add the identifier columns only when a position has one.

### API tokens

An outside system signs in with a scoped API token, not a password. Make one in Menu > Settings >
API tokens: give it a name (the system that will use it) and tick only what it needs.

| Scope | What it allows |
| --- | --- |
| `read:data` | The data addresses above (series, panels, tables) and country snapshots |
| `read:council` | The last council run per country (`/api/v1/integration/desks/...` and `/bundle/...`) |
| `ask:council` | Ask Council chat a new question (`POST /api/v1/council/ask`); uses your AI model |
| `read:events` | The event stream, webhooks and indicator watches |
| `write:holdings` | Positions sent in by the outside system |
| `write:exclusions` | The hidden-names list |
| `run:scenarios` | Scenarios on a portfolio sent in the request |

The token is shown once, when it is made: copy it then. The app keeps only a SHA-256 fingerprint
of it in `data/local/api-tokens.json`, never the token itself, and backups never include that file.
Send it in a header on every call:

```
Authorization: Bearer eqt_...
```

(`X-SMCR-API-Key: eqt_...` also works.) A token works whether sign-in is on or off. A call the
token's scopes do not cover is refused with `403 TOKEN_SCOPE`, naming the scope it needs; an
unknown or revoked token gets `401 INVALID_TOKEN`. Revoking a token in Settings stops it at once.
Each token may make about 600 calls a minute.

Every call made with a token is written to the audit log (Menu > Audit log, kind "API tokens"):
which token, the method and address, and the answer's status. Refusals are logged too. Making and
revoking tokens is logged with the name of whoever did it. The token itself never appears in the
log.

Addresses under `/api/v1/` other than the integration API (`/api/v1/integration/...`) answer
tokens only, even on a computer with sign-in off, since they are meant for outside systems.

**The legacy key.** The integration key in `.env` (`SMCR_INTEGRATION_API_KEY`) keeps working as it
did, and counts as a token with the three read scopes (`read:data`, `read:council`,
`read:events`). It cannot ask Council chat, send positions, set hidden names or run scenarios. For a new connection,
prefer a named token: it can be limited and revoked without changing `.env`.

### Correlation IDs

Send an `X-Correlation-Id` header on any call to trace one action across your logs and this app's.
It may be 1 to 128 letters, digits and `. _ : -` (a UUID, a trace ID or a job number all fit).
The app sends it back on the reply in the same header and writes it into every audit log entry the
call makes; Menu > Audit log can search for it, and the CSV download has a "Correlation ID" column.
The ID is part of each entry's hash, so it cannot be changed afterwards without the log check
noticing. A malformed ID is refused with `400 BAD_CORRELATION_ID`. Without the header, the reply
carries an ID the app made, which is not written to the log.


### Events and webhooks

The app sends an event when something an outside system may act on happens. Every event has the
same envelope:

| Field | What it holds |
| --- | --- |
| `id` | `evt_...`, increasing. Use it with `after=` or `Last-Event-ID` to miss nothing. |
| `type` | One of the types below. |
| `entity` | What it is about: a country (with `iso2` and `iso3`), a model, a source or the app, plus `indicator` where there is one. |
| `severity` | `info`, `warning` or `critical`. |
| `occurred_at` | When the app noticed it. |
| `as_of` | The period or date the value refers to. |
| `source` | Where the value comes from, named as the data-licence register names it. |
| `evidence_url` | Where to read the value behind the event. A relative address is on this server. |
| `shareable` | `true` only when the licence register lets the value be passed on. An unchecked source is `false`. |
| `badge` | `official` for a published figure; for a signal or model, its validation badge (`validated`, `provisional`, `under_review`, `review_due`, `withdrawn`) or `not_validated`. |
| `idempotency_key` | The same for the same happening, so a receiver can drop repeats. |
| `summary`, `data` | A plain sentence and the values behind it. |

| Type | When |
| --- | --- |
| `signal_state_changed` | The policy cycle, CFTC positioning or growth-and-inflation regime of a country moves to another state. |
| `threshold_crossed` | One of your indicator watches is crossed (see "Indicator watches" below). |
| `badge_changed` | A pre-registered test run changes a model's badge. |
| `figure_revised` | A watched figure is revised. |
| `data_stale`, `feed_failed` | A watched figure goes out of date or Missing; a step of the daily download fails. |
| `sanctions_list_changed` | A saved OFAC or UN list changes. |
| `release_upcoming` | The day before a central bank decision, CPI or GDP release (official calendars) or a US Treasury auction (announced on Fiscal Data). |
| `council_run_finished` | A council run on a country finishes. |
| `daily_download_ready` | The daily download finishes. |

Three ways to receive them, all with a token that has `read:events` (or the legacy key):

- **Catch up:** GET `/api/v1/events?after=<id>` (or `since=<ISO time>`), with optional
  `types=` and `countries=` (comma-separated). Oldest first, up to `limit` (200, at most 1000).
- **Live:** GET `/api/v1/events/stream`, server-sent events with the same filters. On reconnect,
  send `Last-Event-ID` and missed events come first. The older `/api/v1/integration/stream`
  carries the same events too.
- **Webhooks:** `POST /api/v1/webhooks` with `{ "url": "...", "types": [...], "countries": [...], "name": "..." }`.
  The reply holds a secret (`whsec_...`) shown once. Each delivery is a POST of one event with
  these headers:

  | Header | Value |
  | --- | --- |
  | `X-EconQuest-Event` | The type |
  | `X-EconQuest-Event-Id` | The event id |
  | `X-EconQuest-Delivery-Id` | The same on every retry of one delivery |
  | `X-EconQuest-Attempt` | 1, 2, ... |
  | `X-EconQuest-Timestamp` | Unix seconds |
  | `X-EconQuest-Signature-256` | `sha256=` + HMAC-SHA256 of `<timestamp>.<body>` with the secret |
  | `Idempotency-Key` | The event's `idempotency_key` |

  Check the signature, refuse old timestamps, and answer 2xx within 8 seconds. Anything else is
  retried after 30 s, 2 min, 10 min, 1 h and 6 h, then given up. GET `/api/v1/events/deliveries`
  lists every attempt. GET `/api/v1/webhooks` lists yours; `DELETE /api/v1/webhooks/<id>` removes
  one. Secrets are encrypted on disk when `ECONQUEST_SECRET_KEY` is set and never written to the
  audit log or backups. Adding and removing webhooks is in the audit log.

Checking a delivery in Python:

```python
import hmac, hashlib, time
def verified(secret: str, headers, body: bytes) -> bool:
    ts = headers["X-EconQuest-Timestamp"]
    if abs(time.time() - int(ts)) > 300:
        return False
    mac = hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest("sha256=" + mac, headers["X-EconQuest-Signature-256"])
```

Events are kept in `data/local/events/` (the last 5,000). The daily download writes its own events
there and the server sends them on within a few seconds.

### Indicator watches

A watch is a threshold you choose on one figure, for one country or for every watchlist country
(`*`). None is built in. POST `/api/v1/watches` with
`{ "country": "MX", "metric": "policy_rate", "op": ">=", "value": 7, "note": "..." }`.
GET `/api/v1/watches` lists yours with their last check, and the figures a watch can use with their
unit, source and shareable flag:

| Metric | Figure | Source |
| --- | --- | --- |
| `yield_level` | 10-year yield, % | Official 10-year yields (only official or your own upload; never a sample or estimate) |
| `yield_3m_bps` | 10-year yield change over 3 months, bps | The same |
| `policy_rate` | Policy rate, % | BIS central bank policy rates |
| `cli_level` | OECD composite leading indicator | OECD |
| `cftc_percentile` | CFTC positioning percentile over 3 years | CFTC Traders in Financial Futures |
| `tone_shift` | GDELT news tone shift | GDELT |
| `reserves_12m_pct` | Reserves change over 12 months, % | IMF International Reserves |
| `shock_alerts` | Number of shock early-warning alerts | The app's stated rules (badge `not_validated`) |
| `odds_1w_pts` | Largest weekly Polymarket odds move, points | Polymarket |

Watches are checked each time the watchlist is rebuilt from saved data, which happens after every
daily download. When the figure is on the far side of your threshold and was not at the last check
(including the first check after the watch was made), a `threshold_crossed` event goes to the stream
and to your webhooks, with the value, its date (`as_of`) and its source. It fires again only after
the figure has gone back. A country with no figure never fires. DELETE `/api/v1/watches/<id>` removes
one. These are the same rules as Menu > Watch alerts; a token sees only the watches it made. Adding
and removing them is in the audit log.

### Country snapshot

GET `/api/v1/countries/<code>/snapshot` (alpha-2 or alpha-3; a token with `read:data`) returns
every figure the app holds for one country. No council run is needed. It reads what the daily
download saved and never fetches, so it can be called at any time. GET `/api/v1/countries` lists the
watchlist countries with both codes.

- `figures`: the panel figures (policy rate, inflation, growth, debt, balances, reserves, yield,
  leading indicator, positioning, Treasury holdings).
- `series`: the latest value of every saved series, plus the series that are Missing.
  Capital account openness is here as `capital_openness` (the Chinn-Ito index scaled 0 to 1) and
  `capital_openness_raw` (KAOPEN as published), yearly; cite Chinn and Ito (2006), Journal of
  Development Economics 81(1), 163-192. The authors give no licence, so these values are
  `shareable: false` and are held back in sharing mode.
- `signals`: the policy cycle, CFTC positioning and growth-and-inflation regime states, with their
  validation badges.
- `council`: the id of the last council run, or null.

Every value has `status` (`Live` or `Missing`), `value`, `as_of` (the period it refers to), `source`,
`badge` and `shareable`. A Missing value has `value: null` and a `reason`. Where IMF projection years
exist, `value` is the latest outturn and `projected_to` says how far the projections go. A series
from a file you loaded has `origin: "own_file"`, badge `not_validated` and `shareable: false`. With
sharing mode on, a value whose source does not allow passing it on is held back, with the reason.
Your paid-subscription figures are never included.

### Sending positions

A token with `write:holdings` sends the positions it holds; they appear in Holdings next to the ones
added in the app or imported from CSV (the CSV import is unchanged), marked "Sent by" and the
token's name. They go to the workspace of the account that made the token, or the shared one when
sign-in is off.

- PUT `/api/v1/holdings` with `{ "holdings": [ ... ] }` replaces this token's positions with
  exactly these. An empty list removes them all.
- POST `/api/v1/holdings` adds positions; one with an `entity_id` already sent is updated (its id
  stays the same). Send `entity_id` on every position if you will update them.
- GET `/api/v1/holdings` lists what this token sent; DELETE `/api/v1/holdings/<id or entity_id>`
  removes one.

Each position: `country` (ISO alpha-2 or alpha-3), `notional_usd_mm` (USD millions, not zero; a
negative number means short), and optionally `instrument`, `type` (`HC_BOND`, `LC_BOND`, `CDS`,
`FX`, `OTHER`), `side` (`long` or `short`), `duration` (years), `isin`, `lei`, `cik`, `ticker` and
`entity_id`, checked as described under "Naming positions". A list is all or nothing: if any
position has a problem, nothing changes and the reply lists every problem. Up to 5,000 positions per
call. A token never sees or changes positions added in the app or sent by another token. Each change
is in the audit log with counts, never the positions themselves.

### Hidden names

Countries and securities on the hidden-names list never appear: not in Holdings, the watchlist,
country pages, the data addresses, the snapshot, events or webhooks. Where something was left out,
the reply says only how many (`"hidden": 1`, or the `X-EconQuest-Hidden` header on lists such as
`countries=`), and an address about a hidden country answers `404` with `"error": "HIDDEN"`.

The list keeps a fingerprint (SHA-256) of each name, never the name, so no screen, reply, backup or
log can show one back. Set it in Menu > Settings > Hidden names, or with a token that has
`write:exclusions`:

- POST `/api/v1/exclusions` with `{ "names": [ { "kind": "country", "value": "MX" }, { "kind": "isin", "value": "US0378331005" } ] }`.
  Kinds: `country` (ISO alpha-2 or alpha-3), `isin`, `lei`, `cik`, `ticker`, `entity_id`, checked
  as for positions.
- POST `/api/v1/exclusions/remove` with the same shape shows names again; PUT `/api/v1/exclusions`
  replaces the whole list (an empty list clears it); DELETE `/api/v1/exclusions/<id>` removes one
  entry.
- GET `/api/v1/exclusions` returns the count, the count per kind and entry ids, never names.

A list is all or nothing, and a refused name is not repeated in the reply. Every change is in the
audit log as counts ("added 2 hidden names; 2 items hidden now").

### Scenarios on a portfolio

With a token that has `run:scenarios`, POST `/api/v1/scenarios` with the positions (the same fields
as `/api/v1/holdings`) and a scenario. The positions are used for this one reply and not saved.

- A shock: `{ "kind": "shock", "em_fx_pct": -15, "us_rates_bp": 100, "countries": { "TUR": { "fx_pct": -30, "spread_bp": 400, "local_yield_bp": 600 } } }`.
  `em_fx_pct` moves every emerging-market currency against the US dollar (negative = weaker);
  "emerging" means outside the IMF World Economic Outlook list of advanced economies. A per-country
  move overrides it, and is how a fiscal shock is set (spread for USD bonds and CDS, local 10Y yield
  for local bonds).
- A historical replay: `{ "kind": "replay", "episode": "gfc_2008" }`. Episodes: `asia_1997`
  (Jun 1997 to Jan 1998), `russia_1998` (Jul to Sep 1998), `year_2001` (Dec 2000 to Dec 2001),
  `gfc_2008` (Aug to Nov 2008), `taper_2013` (Apr to Aug 2013), `covid_2020` (Jan to Mar 2020),
  `year_2022` (Dec 2021 to Oct 2022). The move is the change between the two months' averages, from
  the OECD 10-year yields and Federal Reserve Board H.10 exchange rates on FRED (from 1990), the ECB
  reference rates (from 1999) and the BCRP EMBI spreads (eight Latin American countries, from 2016).
  The daily download saves these; a request never fetches anything.

The reply gives each position's moves (`components`: `fx`, `us_rates`, `spread`, `local_yield`),
each with its move, the P&L in US dollars, the two monthly values, the source and the shareable flag.
A move with no source is `"status": "Missing"` with the reason: CDS in a replay (a bond spread is not
CDS), a country outside the series, a window before a series starts, a position without a duration.
Then the position's `pnl_usd` is `null` and `pnl_known_usd` gives the known part. Every reply has
`"hypothetical": true`: it is a first-order estimate (duration times the yield or spread move,
notional times the currency move), not a forecast or a valuation. GET `/api/v1/scenarios` lists the
episodes and which countries the saved series cover for each.

### Asking Council chat

With a token that has `ask:council`, an outside system can ask Council chat a new question and get
the answer the chat in the app gives for the same question and figures: the AI model picks the desk
agents, the agents answer on the app's own figures, and the synthesis agent writes the summary under
the usual checks (a sentence with a number that is not in the agents' figures, or one that calls an
agent's stance the opposite way, is removed). It runs the same code as the chat; there is no second
answer path.

POST `/api/v1/council/ask` with:

```json
{
  "question": "Whose government debt is high and rising?",
  "iso3": "TUR",
  "history": [
    { "role": "user", "content": "Which central banks look behind the curve?" },
    { "role": "council", "content": "Turkey looks behind the curve." }
  ],
  "max_cost_usd": 0.05
}
```

- `question`: up to 2,000 characters.
- `iso3` (optional): one country, as the chat's country picker. Without it the countries come from
  the question, or the whole watchlist when it names none.
- `history` (optional): at most 10 earlier turns of the same conversation, oldest first. A `user`
  turn is an earlier question and the `council` turn after it is that answer's headline, as the chat
  sends them to the model. Nothing is remembered between calls.
- `max_cost_usd` (optional): the most this question may cost. See "Cost" below.

The countries are the token maker's first saved watchlist (Menu > Watchlists), the market benchmarks
the chat adds, and any country named in the question or in `iso3` that is off the watchlist (its
figures are pulled for this request, as "Add" does in the chat). The AI model is the one saved under
Menu > Settings > AI model.

The reply:

```json
{
  "answer": "Headline.\n- Point one.\n- Point two.",
  "brief": { "headline": "...", "points": ["..."], "disagreements": ["..."], "gaps": ["..."] },
  "agents": [ { "id": "fiscal", "label": "Fiscal & Debt", "summary": "Turkey: Government debt is ...", "stance": [ { "iso3": "TUR", "dim": "policy", "call": "tight" } ] } ],
  "citations": [ { "label": "Turkey: Government debt", "value": "25.1% of GDP", "source": "IMF World Economic Outlook, 2025", "date": "2025", "badge": "official", "url": "https://www.imf.org/en/About/copyright-and-terms", "iso3": "TUR", "agent": "Fiscal & Debt", "shareable": true } ],
  "checks": { "number_trace": { "status": "pass", "removed": 0 }, "stance_check": { "status": "pass", "removed": 0 } },
  "hidden_count": 0,
  "hidden_note": null,
  "left_out": { "not_shareable": 0, "not_real": 0 },
  "scope": "the countries asked",
  "model": "Local Ollama (qwen2.5:32b · Referee)",
  "cost_usd": 0,
  "run_id": "ask_0f3a...",
  "asked_at": "2026-11-15T09:00:00.000Z",
  "disclaimer": "Research output from the app's own figures, not investment advice. ..."
}
```

- `answer` is the headline and points as one text; `brief` has them apart. When no summary was
  written, both are `null` and `reason` says why (for example, the agents found no figures).
- `citations`: every figure the answer rests on, once each, with its source and the period read
  from the source text (`date`: a day, month, quarter or year, or `null` when the source names none).
  `badge` is `official` for a published figure and `not_validated` for one the app worked out (a gap,
  a rule rate); such a figure names its method as the source, and has no `date` or `url` of its own.
  `url` is the source's terms page from the licence register (docs/DATA_LICENCES.md).
- `checks`: `pass` when a summary was written, with the number of sentences each check removed;
  `no_answer` when none was.
- `run_id` names this call in the audit log.

**Only real figures that may be passed on.** Estimates, built-in samples and your own documents are
never used. A figure whose source the licence register does not mark as free to share is left out,
with the finding it belongs to (its reading quotes the figure), and counted in `left_out`. A figure
the app worked out from other figures counts as the app's own; the figures it came from are in the
same finding and are checked. Central banks' stated inflation targets are not in the licence
register yet, so findings that use one (most of the central bank agent's) are left out and counted.

**Hidden names.** Hidden names in the question and history are replaced with `[hidden]` before any
step sees them, hidden countries are taken out of the countries the agents answer on, and any
finding, figure or sentence of the summary that still names one is left out. The reply carries only
`hidden_count` and `hidden_note` ("1 item hidden"). An `iso3` on the list answers `404 HIDDEN`.
Countries are recognised by name, other common names (also as the start of a longer word, so
"Brazilian" counts), short forms and ISO code; securities by ISIN, LEI, CIK, ticker (in capitals)
and entity ID.

**Cost.** A model on this computer (Ollama, or an OpenAI-compatible server on localhost) costs
nothing, and `cost_usd` is `0`. The app has no price list for cloud models: set
`AI_PRICE_INPUT_PER_MTOK` and `AI_PRICE_OUTPUT_PER_MTOK` (US dollars per million tokens) in `.env`
to price them. The estimate counts characters / 4 as tokens and each step's answer at its longest
allowance, so it is an upper estimate, not the provider's bill (Gemini's thinking tokens are not
counted). With `max_cost_usd`, each model call is priced before it is made; one that would take the
total past the limit is refused with `402` and `"error": "cost_limit"`, and nothing more runs. A
call that could reach a cloud model with no price set is refused the same way, since its cost is
not known. Without prices, `cost_usd` is `null` when a cloud model answered. Google Gemini counts as
reachable whenever `GEMINI_API_KEY` is set, because the app tries it when the chosen model does not
answer.

**Limits and the audit log.** Each question counts against the same AI request limit as the token
maker's own questions in the app (about 10 a minute, 20 at once). Every call is in the audit log: an
"API tokens" entry for the call, and a "Council" entry with the token's name, the correlation ID
(when the call sent `X-Correlation-Id`), the question as it reached the model, the model, every
figure used with its source, the run ID and the cost.

Errors: `401` without a token; `403 TOKEN_SCOPE` without `ask:council`; `422` for an empty question,
one over 2,000 characters, more than 10 history turns, or a malformed field (`error` names which);
`402 cost_limit`; `429` at the AI request limit (with `Retry-After`); `503` with `"error": "no_model"`
when no AI model answered (set one up under Menu > Settings > AI model), or `"exam_mode"` while
exam mode is on.

