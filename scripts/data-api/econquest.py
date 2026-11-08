"""
EconQuest data helper for Python (docs/DATA_API.md). Standard library only: no packages to install.

    import econquest as eq
    rows = eq.series("BRA", "policy_rate")          # list of dicts, one per date
    every = eq.country_series("BRA")                # every series for Brazil, one long table
    panel = eq.panel(["BRA", "MEX"], ["policy_rate", "cpi_monthly"], mode="history")
    figures = eq.figures("BRA", as_of="2026-06-30") # figures as the app saved them that day
    listing = eq.series_list("BRA")                 # what exists, and what is Missing and why

Each row keeps the app's unit, source and dates, so nothing is cut loose from where it came from.
With pandas installed, pandas.DataFrame(rows) gives a data frame.

Settings (or pass base=/key= to each call):
    ECONQUEST_URL   where the app runs, default http://localhost:3000 (Docker: http://localhost:3737)
    ECONQUEST_KEY   only for a copy with sign-in on: the integration API key, sent in a header
"""
import csv
import io
import json
import os
import urllib.parse
import urllib.request

__all__ = ["series_list", "series", "country_series", "world_series", "panel", "figures"]


def _base(base=None):
    return (base or os.environ.get("ECONQUEST_URL") or "http://localhost:3000").rstrip("/")


def _get(path, params=None, base=None, key=None):
    url = _base(base) + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    req = urllib.request.Request(url, headers={"User-Agent": "econquest-python-helper"})
    key = key or os.environ.get("ECONQUEST_KEY")
    if key:
        req.add_header("X-SMCR-API-Key", key)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            msg = json.loads(body).get("message") or json.loads(body).get("error") or body
        except ValueError:
            msg = body
        raise RuntimeError(f"EconQuest answered {e.code} for {path}: {msg}") from None


def _rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def _code(iso3):
    return urllib.parse.quote(str(iso3).upper())


def series_list(iso3, base=None, key=None):
    """What the app holds for one country, and what is Missing with the reason (a dict)."""
    return json.loads(_get(f"/api/series/{_code(iso3)}", base=base, key=key))


def series(iso3, series_id, base=None, key=None):
    """One series, one row per date: iso3, series_id, series, unit, frequency, date, value, source, ..."""
    return _rows(_get(f"/api/export/{_code(iso3)}/series/{urllib.parse.quote(series_id)}.csv", base=base, key=key))


def country_series(iso3, base=None, key=None):
    """Every series for one country as one long table."""
    return _rows(_get(f"/api/export/{_code(iso3)}/series.csv", base=base, key=key))


def world_series(base=None, key=None):
    """Series not about one country (commodity prices and others)."""
    return _rows(_get("/api/export/world/series.csv", base=base, key=key))


def panel(countries, figures=None, mode="latest", base=None, key=None):
    """Countries by figures. mode="latest" gives one cell each; mode="history" gives every date."""
    params = {"countries": ",".join(countries), "figures": ",".join(figures) if figures else None, "mode": mode}
    return _rows(_get("/api/export/panel.csv", params, base=base, key=key))


def figures(iso3, as_of=None, base=None, key=None):
    """The latest figures for one country, or as saved on a past day (as_of="YYYY-MM-DD")."""
    return _rows(_get(f"/api/export/{_code(iso3)}/figures.csv", {"asOf": as_of}, base=base, key=key))
