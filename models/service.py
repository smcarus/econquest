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
}

# Levels that cannot be zero: a zero in the file means the model does not fill that series in that
# period (Pakistan's CPI stops in 2017, for example), so it is sent as missing, never as 0.
ZERO_IS_MISSING = {"real_gdp", "nominal_gdp", "cpi", "gov_debt", "gov_revenue", "gov_spending", "usd_rate"}

_lock = threading.Lock()
_loaded: dict[str, tuple[object, object]] = {}


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
        return mdl, df


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
    per = list(mdl.current_per)
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


def baseline(iso3: str) -> dict:
    mdl, df = load(iso3)
    per = list(mdl.current_per)
    start, end = per[0], per[-1]
    desc = getattr(mdl, "var_description", {}) or {}
    rows = df.loc[:end]
    # Ten periods of history before the model starts solving, then the solved years.
    pos = list(rows.index).index(start)
    rows = rows.iloc[max(0, pos - (40 if BY_ISO[iso3]["frequency"] == "quarterly" else 10)) :]
    series = {}
    missing = []
    for key, code in SERIES.items():
        col = iso3 + code
        if col not in df.columns:
            missing.append(key)
            continue
        series[key] = {
            "code": col,
            "description": str(desc.get(col, "")),
            "values": [None if (key in ZERO_IS_MISSING and v == 0) else v for v in (num(x) for x in rows[col].tolist())],
        }
        if all(v is None for v in series[key]["values"]):
            del series[key]
            missing.append(key)
    return {
        "iso3": iso3,
        "periods": [period_label(p) for p in rows.index],
        "projectedFrom": period_label(start),
        "series": series,
        "missing": missing,
        "note": "The model file's own baseline as the World Bank published it; periods from projectedFrom on are the projection stored in the file, not a current World Bank forecast.",
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
