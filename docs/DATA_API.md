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
`read:events`). It cannot send positions, set hidden names or run scenarios. For a new connection,
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
