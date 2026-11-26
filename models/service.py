"""
EconQuest models service: runs the World Bank's public MFMod country models (ModelFlow) on this
computer and answers the app over HTTP. Optional: the app works the same without it.

Started by `docker compose --profile models up -d` (see docs/INSTALL.md). Python standard library
only, plus ModelFlow (pip package ModelFlowIb, MIT-based licence, copyright Danmarks Nationalbank
and ECB).

Model files: the six country models the World Bank publishes in github.com/worldbank/MFMod-ModelFlow
(folder models/, CC0 1.0, read 26 November 2026). Each is downloaded once into MFMOD_DIR and read
from there afterwards, so the service also works offline once the files are on disk. Nothing is
shipped with EconQuest.

Calls (all GET, JSON):
  /health            ModelFlow version and which model files are on disk.
  /models            For each model: the model's own title, years of data, years it solves.
  /baseline?iso3=PAK The model file's own baseline for a few headline series, with each year marked
                     as data or as the stored projection. Nothing is changed or shocked here.
  /shock?iso3=PAK&kind=oil&size=20&hold=5
                     The same series with one shock applied from the first year the model solves,
                     beside the baseline, so the app can show the difference the shock makes.
                     Kinds (see SHOCKS): oil and food (world prices, % change), policy_rate (points,
                     only where the model has a policy rate rule) and spending (government purchases
                     of goods and services, points of nominal GDP). The shock is held for `hold`
                     years, then the model's own equations take over again.
  /check/baseline    Each model loaded as stored and solved again: the largest relative difference
                     per headline series over the solve span (pre-registered check A,
                     docs/validation/models/mfmod_reproduction.json).
  /check/book-oil    The World Bank manual's Pakistan example (oil +25 US$ a barrel in 2025-27,
                     solved 2020-2040) on the manual's own copy of the model, downloaded once from
                     the same repository: % difference from the baseline for the four series the
                     manual prints, 2020-2035 (pre-registered check B); and the same run on the
                     public copy the app uses, 2020-2030, for information.

Every figure comes from the model file as the World Bank published it. Where a model lacks a
series the reply says so; no figure is filled in.
"""
from __future__ import annotations

import json
import math
import os
import sys
import threading
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MFMOD_DIR = os.environ.get("MFMOD_DIR", "/data/mfmod")
MFMOD_SOURCE = os.environ.get(
    "MFMOD_SOURCE", "https://raw.githubusercontent.com/worldbank/MFMod-ModelFlow/main/models"
)
PORT = int(os.environ.get("MFMOD_PORT", "8765"))
HOST = os.environ.get("MFMOD_HOST", "0.0.0.0")

# The public models, as the World Bank's repository lays them out (folder/data/file).
MODELS = [
    {"iso3": "BOL", "name": "Bolivia", "path": "Bolivia/data/bol.pcim", "frequency": "annual"},
    {"iso3": "HRV", "name": "Croatia", "path": "Croatia/data/hrv.pcim", "frequency": "quarterly"},
    {"iso3": "IRQ", "name": "Iraq", "path": "Iraq/data/irq.pcim", "frequency": "annual"},
    {"iso3": "NPL", "name": "Nepal", "path": "Nepal/data/NPL.pcim", "frequency": "annual"},
    {"iso3": "PAK", "name": "Pakistan", "path": "Pakistan/data/pak.pcim", "frequency": "annual"},
    {"iso3": "TUR", "name": "Turkiye", "path": "Türkiye/data/tur.pcim", "frequency": "annual"},
]
BY_ISO = {m["iso3"]: m for m in MODELS}

# Headline series, by the World Bank's mnemonic (country code in front in each model).
SERIES = {
    "real_gdp": "NYGDPMKTPKN",
    "nominal_gdp": "NYGDPMKTPCN",
    "cpi": "FPCPITOTLXN",
    "gov_debt": "GGDBTTOTLCN",
    "gov_balance": "GGBALOVRLCN",
    "gov_revenue": "GGREVTOTLCN",
    "gov_spending": "GGEXPTOTLCN",
    "current_account_usd": "BNCABFUNDCD",
    "usd_rate": "PANUSATLS",
    "policy_rate": "FMLBLPOLYXN",
    "consumer_deflator": "NECONPRVTXN",
}

# Policy rates under other mnemonics: the rule the model uses, where it has one. Bolivia, Nepal and
# Croatia have no policy rate rule of their own (exchange rate peg, peg to the Indian rupee, euro).
POLICY_RATE = {"PAK": "FMLBLPOLYXN", "TUR": "FMLBLPOLYFR", "IRQ": "FMLBLPOLYFR"}

# World food prices shocked together: the grains every public model carries (World Bank Pink Sheet
# mnemonics, US$).
FOOD_PRICES = ["WLDFMAIZE", "WLDFRICE_05", "WLDFWHEAT_US_HRW", "WLDFSOYBEANS"]

SHOCKS = {
    "oil": {"unit": "%", "max": 300, "what": "World crude oil price (WLDFCRUDE_PETRO) moved by size%"},
    "food": {"unit": "%", "max": 300, "what": "World maize, rice, wheat and soybean prices moved by size%"},
    "policy_rate": {"unit": "pts", "max": 20, "what": "Policy rate set size percentage points above the model's own path (rule switched off while held)"},
    "spending": {"unit": "pts of GDP", "max": 10, "what": "Government purchases of goods and services (GGEXPGNFSCN) raised by size% of baseline nominal GDP"},
}
HORIZON_YEARS = 6

# Levels that cannot be zero: a zero in the file means the model does not fill that series in that
# period (Pakistan's CPI stops in 2017, for example), so it is sent as missing, never as 0.
ZERO_IS_MISSING = {"real_gdp", "nominal_gdp", "cpi", "gov_debt", "gov_revenue", "gov_spending", "usd_rate", "consumer_deflator"}

_lock = threading.Lock()
_loaded: dict[str, tuple[object, object]] = {}
# Each model's own solve span, kept at load: a shocked run changes the model's current_per.
_spans: dict[str, list] = {}


def local_file(m: dict) -> str:
    return os.path.join(MFMOD_DIR, m["iso3"].lower() + ".pcim")


def download_missing() -> list[str]:
    """Fetch each model file that is not on disk yet. Returns one line per problem."""
    os.makedirs(MFMOD_DIR, exist_ok=True)
    problems = []
    for m in MODELS:
        dest = local_file(m)
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            continue
        url = MFMOD_SOURCE.rstrip("/") + "/" + urllib.parse.quote(m["path"])
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "econquest-models"})
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
            if len(body) < 1000:
                raise ValueError(f"only {len(body)} bytes")
            tmp = dest + ".part"
            with open(tmp, "wb") as f:
                f.write(body)
            os.replace(tmp, dest)
        except Exception as e:  # noqa: BLE001 - reported, never fatal
            problems.append(f"{m['name']}: {e}")
    return problems


def modelflow_version() -> str:
    try:
        from importlib.metadata import version

        return version("ModelFlowIb")
    except Exception:  # noqa: BLE001
        return "unknown"


def load(iso3: str):
    """The model and its baseline frame, loaded once and kept."""
    with _lock:
        if iso3 in _loaded:
            return _loaded[iso3]
        from modelclass import model  # imported late: heavy, and /health should answer without it

        mdl, df = model.modelload(local_file(BY_ISO[iso3]), run=True, keep="Baseline")
        _loaded[iso3] = (mdl, df)
        _spans[iso3] = list(mdl.current_per)
        return mdl, df


def span(iso3: str) -> list:
    load(iso3)
    return _spans[iso3]


def num(x) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def period_label(p) -> str:
    return str(p)


def describe(iso3: str) -> dict:
    mdl, df = load(iso3)
    per = span(iso3)
    return {
        "iso3": iso3,
        "name": BY_ISO[iso3]["name"],
        "frequency": BY_ISO[iso3]["frequency"],
        "title": str(getattr(mdl, "name", "") or ""),
        "dataFrom": period_label(df.index[0]),
        "dataTo": period_label(df.index[-1]),
        "solveFrom": period_label(per[0]),
        "solveTo": period_label(per[-1]),
        "variables": int(len(df.columns)),
    }


def column(iso3: str, key: str) -> str:
    if key == "policy_rate" and iso3 in POLICY_RATE:
        return iso3 + POLICY_RATE[iso3]
    return iso3 + SERIES[key]


def pick_series(iso3: str, rows, desc: dict) -> tuple[dict, list]:
    """The headline series from a frame's rows; a series the model lacks, or never fills, is listed as missing."""
    series = {}
    missing = []
    for key in SERIES:
        col = column(iso3, key)
        if col not in rows.columns:
            missing.append(key)
            continue
        values = [None if (key in ZERO_IS_MISSING and v == 0) else v for v in (num(x) for x in rows[col].tolist())]
        if all(v is None for v in values):
            missing.append(key)
            continue
        series[key] = {"code": col, "description": str(desc.get(col, "")), "values": values}
    return series, missing


def baseline(iso3: str) -> dict:
    mdl, df = load(iso3)
    per = span(iso3)
    start, end = per[0], per[-1]
    desc = getattr(mdl, "var_description", {}) or {}
    rows = df.loc[:end]
    # Ten periods of history before the model starts solving, then the solved years.
    pos = list(rows.index).index(start)
    rows = rows.iloc[max(0, pos - (40 if BY_ISO[iso3]["frequency"] == "quarterly" else 10)) :]
    series, missing = pick_series(iso3, rows, desc)
    return {
        "iso3": iso3,
        "periods": [period_label(p) for p in rows.index],
        "projectedFrom": period_label(start),
        "series": series,
        "missing": missing,
        "note": "The model file's own baseline as the World Bank published it; periods from projectedFrom on are the projection stored in the file, not a current World Bank forecast.",
    }


class ShockError(ValueError):
    """A shock the model cannot take, or a size out of range; sent back as a 400 with the reason."""


def periods_per_year(iso3: str) -> int:
    return 4 if BY_ISO[iso3]["frequency"] == "quarterly" else 1


def shock(iso3: str, kind: str, size: float, hold: int) -> dict:
    if kind not in SHOCKS:
        raise ShockError(f"Unknown shock {kind!r}; known: {', '.join(SHOCKS)}.")
    spec = SHOCKS[kind]
    if not math.isfinite(size) or size == 0 or abs(size) > spec["max"]:
        raise ShockError(f"Size must be a non-zero number up to {spec['max']} {spec['unit']}.")
    if hold < 1 or hold > HORIZON_YEARS:
        raise ShockError(f"hold must be 1 to {HORIZON_YEARS} years.")
    if kind == "policy_rate" and iso3 not in POLICY_RATE:
        raise ShockError(f"The {BY_ISO[iso3]['name']} model has no policy rate rule of its own, so a policy rate shock cannot be run in it.")
    mdl, df = load(iso3)
    per = span(iso3)
    ppy = periods_per_year(iso3)
    start = per[0]
    pos = list(df.index).index(start)
    shocked_per = per[: hold * ppy]
    end = per[min(len(per), HORIZON_YEARS * ppy) - 1]
    s0, s1 = shocked_per[0], shocked_per[-1]
    sh = df.copy()
    if kind == "oil":
        sh.loc[s0:s1, "WLDFCRUDE_PETRO"] = df.loc[s0:s1, "WLDFCRUDE_PETRO"] * (1 + size / 100)
    elif kind == "food":
        cols = [c for c in FOOD_PRICES if c in df.columns]
        if not cols:
            raise ShockError("This model carries none of the world food prices.")
        for c in cols:
            sh.loc[s0:s1, c] = df.loc[s0:s1, c] * (1 + size / 100)
    elif kind == "policy_rate":
        v = column(iso3, "policy_rate")
        if v + "_D" not in df.columns or v + "_X" not in df.columns:
            raise ShockError("The model's policy rate cannot be set from outside.")
        sh.loc[s0:s1, v + "_D"] = 1
        sh.loc[s0:s1, v + "_X"] = df.loc[s0:s1, v] + size
    elif kind == "spending":
        v = iso3 + "GGEXPGNFSCN"
        if v + "_D" not in df.columns or v + "_X" not in df.columns:
            raise ShockError("The model's government purchases cannot be set from outside.")
        sh.loc[s0:s1, v + "_D"] = 1
        sh.loc[s0:s1, v + "_X"] = df.loc[s0:s1, v] + size / 100 * df.loc[s0:s1, iso3 + "NYGDPMKTPCN"]
    with _lock:
        import contextlib
        import io

        with contextlib.redirect_stdout(io.StringIO()):
            res = mdl(sh, start, end, keep=f"{kind} {size}")
    # One year of history before the shock, so year-on-year changes in the first shocked year can be worked out.
    first = max(0, pos - ppy)
    last = list(df.index).index(end)
    desc = getattr(mdl, "var_description", {}) or {}
    base_series, base_missing = pick_series(iso3, df.iloc[first : last + 1], desc)
    shocked_series, shocked_missing = pick_series(iso3, res.iloc[first : last + 1], desc)
    return {
        "iso3": iso3,
        "kind": kind,
        "size": size,
        "unit": spec["unit"],
        "what": spec["what"].replace("size", f"{size:g}"),
        "hold": hold,
        "periods": [period_label(p) for p in df.index[first : last + 1]],
        "shockFrom": period_label(s0),
        "shockTo": period_label(s1),
        "base": base_series,
        "shocked": shocked_series,
        "missing": sorted(set(base_missing) | set(shocked_missing)),
        "note": "Shocked run minus the model file's own baseline. The public model files carry old data, so read the differences, not the levels; the shock starts in the first year the model solves.",
    }


def _quiet(f, *a, **k):
    import contextlib
    import io

    with contextlib.redirect_stdout(io.StringIO()):
        return f(*a, **k)


def check_baseline() -> dict:
    """Check A: each model as stored against the same file solved again, over its solve span."""
    from modelclass import model

    out, problems = [], []
    for m in MODELS:
        iso3 = m["iso3"]
        if not os.path.exists(local_file(m)):
            problems.append(f"{m['name']}: model file not downloaded")
            continue
        try:
            with _lock:
                _m0, stored = _quiet(model.modelload, local_file(m), run=False)
                solved_mdl, solved = _quiet(model.modelload, local_file(m), run=True, keep="Check")
                per = list(solved_mdl.current_per)
            rows = {}
            gdp = stored.loc[per[0] : per[-1], iso3 + SERIES["nominal_gdp"]].astype(float)
            for key in SERIES:
                col = column(iso3, key)
                if col not in stored.columns:
                    continue
                a = stored.loc[per[0] : per[-1], col].astype(float)
                b = solved.loc[per[0] : per[-1], col].astype(float)
                if key == "gov_balance":
                    diffs = [abs(y - x) / g for x, y, g in zip(a, b, gdp) if math.isfinite(x) and math.isfinite(y) and g]
                else:
                    diffs = [abs(y / x - 1) for x, y in zip(a, b) if math.isfinite(x) and math.isfinite(y) and x != 0 and y != 0]
                if diffs:
                    rows[key] = {"code": col, "maxRelativeDifference": max(diffs), "periods": len(diffs)}
            out.append({"iso3": iso3, "solveFrom": period_label(per[0]), "solveTo": period_label(per[-1]), "series": rows})
        except Exception as e:  # noqa: BLE001
            problems.append(f"{m['name']}: {e}")
    return {"models": out, "problems": problems, "modelflow": modelflow_version()}


BOOK_OIL_SERIES = ["PAKNYGDPMKTPKN", "PAKNECONPRVTKN", "PAKNEIMPGNFSKN", "PAKNECONPRVTXN"]
# The copy of the Pakistan model kept beside the World Bank's manual (same repository, CC0), which the
# manual's example loads; it solves to 2035, the public copy in models/Pakistan/data/ to 2030.
BOOK_PAK_PATH = "jn/mfbook/content/models/pak.pcim"  # from the repository root (MFMOD_SOURCE minus its last folder, models)


def book_pak_file() -> str:
    """The manual's Pakistan model, downloaded once next to the six public files."""
    dest = os.path.join(MFMOD_DIR, "pak-book.pcim")
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    url = MFMOD_SOURCE.rstrip("/").rsplit("/", 1)[0] + "/" + BOOK_PAK_PATH
    req = urllib.request.Request(url, headers={"User-Agent": "econquest-models"})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read()
    if len(body) < 1000:
        raise ValueError(f"the manual's Pakistan model: only {len(body)} bytes")
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(body)
    os.replace(tmp, dest)
    return dest


def _book_oil_run(path: str, years: list) -> dict:
    from modelclass import model

    with _lock:
        mpak, _bline = _quiet(model.modelload, path, run=True, keep="Baseline")
        shocked_in = mpak.basedf.upd("<2025 2027> WLDFCRUDE_PETRO + 25")
        res = _quiet(mpak, shocked_in, 2020, 2040, keep="$25 increase in oil prices 2025-27")
        base = mpak.basedf
    return {v: [num((res.loc[y, v] / base.loc[y, v] - 1) * 100) for y in years] for v in BOOK_OIL_SERIES}


def check_book_oil() -> dict:
    """Check B: the manual's Pakistan oil example, run exactly as the manual runs it on the manual's own
    copy of the model; and, for information, the same run on the public copy the app uses, to 2030."""
    years = list(range(2020, 2036))
    series = _book_oil_run(book_pak_file(), years)
    public_years = list(range(2020, 2031))
    public = _book_oil_run(local_file(BY_ISO["PAK"]), public_years)
    return {
        "years": years,
        "series": series,
        "publicCopy": {"years": public_years, "series": public},
        "shock": "WLDFCRUDE_PETRO + 25 in 2025-2027, solved 2020-2040",
        "modelflow": modelflow_version(),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "econquest-models"

    def log_message(self, fmt, *args):  # quiet; errors still go to stderr below
        pass

    def reply(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        try:
            if u.path == "/health":
                files = [
                    {
                        "iso3": m["iso3"],
                        "name": m["name"],
                        "onDisk": os.path.exists(local_file(m)),
                        "bytes": os.path.getsize(local_file(m)) if os.path.exists(local_file(m)) else 0,
                    }
                    for m in MODELS
                ]
                return self.reply(200, {"ok": True, "modelflow": modelflow_version(), "python": sys.version.split()[0], "source": MFMOD_SOURCE, "models": files})
            if u.path == "/models":
                out, problems = [], []
                for m in MODELS:
                    if not os.path.exists(local_file(m)):
                        problems.append(f"{m['name']}: model file not downloaded")
                        continue
                    try:
                        out.append(describe(m["iso3"]))
                    except Exception as e:  # noqa: BLE001
                        problems.append(f"{m['name']}: {e}")
                return self.reply(200, {"models": out, "problems": problems})
            if u.path == "/baseline":
                iso3 = (q.get("iso3") or [""])[0].upper()
                if iso3 not in BY_ISO:
                    return self.reply(404, {"error": f"No public World Bank model for {iso3 or 'that country'}."})
                if not os.path.exists(local_file(BY_ISO[iso3])):
                    return self.reply(503, {"error": "The model file is not downloaded yet."})
                return self.reply(200, baseline(iso3))
            if u.path == "/check/baseline":
                return self.reply(200, check_baseline())
            if u.path == "/check/book-oil":
                if not os.path.exists(local_file(BY_ISO["PAK"])):
                    return self.reply(503, {"error": "The Pakistan model file is not downloaded yet."})
                return self.reply(200, check_book_oil())
            if u.path == "/shock":
                iso3 = (q.get("iso3") or [""])[0].upper()
                if iso3 not in BY_ISO:
                    return self.reply(404, {"error": f"No public World Bank model for {iso3 or 'that country'}."})
                if not os.path.exists(local_file(BY_ISO[iso3])):
                    return self.reply(503, {"error": "The model file is not downloaded yet."})
                try:
                    size = float((q.get("size") or ["nan"])[0])
                    hold = int((q.get("hold") or [str(HORIZON_YEARS)])[0])
                    return self.reply(200, shock(iso3, (q.get("kind") or [""])[0], size, hold))
                except (ShockError, ValueError) as e:
                    return self.reply(400, {"error": str(e)})
            return self.reply(404, {"error": "Unknown call."})
        except Exception as e:  # noqa: BLE001
            print(f"models service: {e}", file=sys.stderr)
            return self.reply(500, {"error": str(e)})


def main() -> None:
    for p in download_missing():
        print(f"models service: download problem: {p}", file=sys.stderr)
    print(f"models service on {HOST}:{PORT}, files in {MFMOD_DIR}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
