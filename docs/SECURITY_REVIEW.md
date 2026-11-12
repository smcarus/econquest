# Security, privacy and Windows review (G43)

Done on 12 November 2026, before the public copy is pushed to e-conquest/econquest. Each check
names what was looked at and what it found. Problems found are fixed in the same change, with a test
in `tests/securityChecks.test.ts` so they cannot come back unnoticed. To report a problem, see
[SECURITY.md](../SECURITY.md).

## Summary

| Area | Result |
| --- | --- |
| Dependencies | `npm audit`: 0 known vulnerabilities (all severities, production and development) |
| Who can reach the app | Only this computer by default; other host names refused; changes from other websites refused |
| Sign-in, roles, limits | In place and tested; no change needed |
| Files with private data | Written readable by your user account only (mode 600) |
| Backups and exports | Never hold API keys or paid-subscription figures |
| Ollama (the local AI model) | **Fixed:** the bundled Docker model was open to the network and to every web page |
| Windows start scripts | **Fixed:** the PowerShell script could not run on Windows PowerShell 5.1, and did not stop when a step failed |
| Windows real run | **Still open:** needs a Windows computer (see the end) |

## What was checked

**Dependencies.** `npm audit` reports no known vulnerabilities. Dependabot keeps opening update
PRs (see docs/MAINTENANCE.md for how they are handled).

**Who can reach the app** (`server.ts`, `src/utils/requestGuard.ts`, `src/utils/auth.ts`).
- The app listens on 127.0.0.1 unless `HOST` is set. Inside Docker it listens on all addresses, but
  every compose file publishes it on 127.0.0.1 only. The home-server set-up opens port 80/443
  through Caddy on purpose, with sign-in required.
- Requests naming any other host are refused, which stops DNS rebinding. Changes sent from pages on
  other sites are refused.
- Sign-in turns on by itself as soon as the app is opened to a network (`HOST` or `ALLOWED_HOSTS`),
  with a one-time setup code for the first admin.
- Tests: `requestGuard`, `auth`, `authServer`.

**Sign-in, roles and limits** (`src/utils/permissions.ts`, `src/utils/requestLimits.ts`).
- Session cookies are HttpOnly and SameSite=Lax, and Secure over HTTPS. The server keeps only a
  hash of each session token.
- One table decides the role for every API call. A new route needs an Analyst unless the table
  says otherwise. Keys, users, backup, the audit log and connectors are Admin only.
- Changes need a CSRF token. Each account has rate limits, with a separate one for AI calls. Script
  reads of the data addresses are limited per address. Sign-in attempts are limited.
- Security headers are sent on every reply: no framing, no type sniffing, same-origin referrer and
  opener.
- Tests: `permissions`, `requestLimits`, `authServer`.

**File paths from requests.** No route builds a file path from a request value. Ids are looked up in
lists, and export file names are stripped to letters, digits, `-` and `_` (`exportFileName`).

**Files with private data.**
- These are written with mode 600, readable by your user account only: API keys
  (`data/local/settings.json`, encrypted when a master key is set), accounts and sessions, the
  workspace (holdings and lists), the research library, reviews, feedback, Quest entries, the audit
  log and answer snapshots.
- Downloaded public figures (`data/live/`, `data/archive/`) use normal permissions.
- `data/` is never committed (`.gitignore`) or copied into the Docker image (`.dockerignore`).

**Logs and error messages.**
- No log line prints a key, token or password.
- URLs printed in warnings are those of keyless sources only. Keyed requests (FRED, EIA and others)
  report the failure without the URL.
- The data health log removes keys from URLs before saving.

**Backups and exports** (`src/utils/backup.ts`, `src/engine/paidData.ts`).
- Backups leave out `data/local/settings.json` and `data/local/paid/`, and remove any key or token
  from the AI settings. A restore keeps the keys already on the computer.
- Paid-subscription figures are withheld from table downloads, replication packs, share mode, the
  data API for other computers, the public copy and the council's AI model.
- Tests: `backup`, `backupDrill`, `paidData`, `secretBox`, `auditLog`.

**Secrets in the repository.** A search of the tracked files for API key, token and private-key
patterns finds only one made-up test value (`tests/userSettings.test.ts`).

## Problems found and fixed

1. **The bundled Ollama container was open to the network.** The bundled Ollama container is used
   when no Ollama runs on the computer. `docker-compose.yml` published it as `11434:11434` on every
   network address. Anyone on the same network (a café or office Wi-Fi) could run prompts on it, or
   download and delete models. It is now published on 127.0.0.1 only. The app reaches the model
   inside Docker as `http://ollama:11434`, so nothing else changes.
2. **Ollama let every website in** (`OLLAMA_ORIGINS=*`). This was set in `docker-compose.yml`, in
   `scripts/start-mac.sh` and in the `.env` that Settings generates. Any page open in your browser
   could call your local model. The app's pages never call Ollama themselves (the server does), so
   the setting is removed. Settings writes `OLLAMA_ORIGINS` only when you type a value.
3. **The Windows PowerShell script could not start.** Windows 10 and 11 come with Windows
   PowerShell 5.1, which reads a script saved without a byte-order mark as ANSI. The long dash in a
   message became a closing quote mark, so the whole script failed with a parse error. Both Windows
   scripts are now plain ASCII, and `.gitattributes` checks them out with Windows line endings.
4. **The Windows script went on after a failure.**
   - The "is Docker running" check could never fire: a failing program does not raise an error in
     PowerShell.
   - With `$ErrorActionPreference = "Stop"`, Docker's progress messages on a redirected stream
     would have ended the script.
   - The script now checks each step's exit code, stops with a plain message when the build or
     start fails, and does not open the browser on a failed start.

## Still open

- **First real run on Windows.** The fixes above come from reading the scripts; this review was done
  without a Windows computer. Two checks before the public release (Sam chose both):
  1. **GitHub Windows check** (`.github/workflows/windows-check.yml`, run by hand from Actions >
     Windows check). It parses the start script with Windows PowerShell 5.1, checks it was checked
     out with Windows line endings, and runs the type check and tests on Windows. It cannot start
     Docker Desktop.
  2. **A person's run** on Windows 10 or 11 with Docker Desktop (WSL 2):
     - Without Ollama: double-click `scripts\start-windows.bat`. The app should open at
       http://localhost:3737 with the bundled model container. The first start downloads the models
       and takes a long time.
     - With the Ollama app running: run it again. It should say it found Ollama on
       http://localhost:11434.
     - With Docker Desktop closed: it should stop at once with "Docker Desktop is not running".
     - Send back the window's text for any step that does not do this.
- **Review again** at checkpoint CP1, or before any change that opens the app to a network by default.
