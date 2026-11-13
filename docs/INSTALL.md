# Installing EconQuest

EconQuest runs on your own computer. There is no EconQuest website to sign up to and no account
with us: you download the app, it runs on your machine, and it fetches figures straight from free
public sources such as the IMF, the World Bank and central banks. Your keys, your saved research
and the questions you ask stay on your computer.

This guide is written for people who have never installed anything like this before. If you are a
developer, "From the code" below is the short route.

## What you need

### Minimum and recommended computer

| Part | Minimum | Recommended | Notes |
| --- | --- | --- | --- |
| Operating system | macOS (one of the three newest versions), Windows 10 or 11 (64-bit), or 64-bit Linux | The same | Apple Silicon (M1 and later) and Intel or AMD computers all work. Docker Desktop, used by the ready-made app, needs WSL 2 on Windows. |
| Memory (RAM) | 8 GB | 16 GB | The app itself used about 230 MB of memory when idle in a test on 9 November 2026; Docker Desktop and your web browser use more. Running an AI model on the same computer needs much more (see "Choose your AI"). |
| Free disk space | 5 GB | 10 GB, plus room for AI models | Breakdown in the next table. |
| Processor | Any 64-bit processor from roughly the last six years | The same | Only the AI models need a fast processor or a graphics card. |
| Internet | Any connection that can open ordinary websites | A connection without a small monthly data cap | The app only makes outgoing requests; nothing has to be opened to the internet. See "How much data it downloads" below. |
| Node.js (only for "From the code") | Node.js 20.19 or later, or 22.12 or later | Node.js 22 (the version the ready-made app uses) | Earlier releases of Node.js 20 and 22 cannot run the build tools. Not needed for the ready-made app. |

### Disk space, part by part

| Part | Size | How the figure was found |
| --- | --- | --- |
| Docker Desktop | A few GB | Docker's own requirement; check docker.com for the current figure. |
| The ready-made app (Docker image) | About 0.8 GB once unpacked; the download is about 170 MB | Measured on 13 November 2026: the image built from the repository's Dockerfile is 798 MB unpacked and 170 MB compressed. |
| From the code instead | About 0.5 GB | Measured on 13 November 2026: installed packages (`node_modules`) 465 MB, built app (`dist`) 7 MB, source code and its history 70 MB. |
| Saved data (the `data/` folder) | About 150 MB after the first few days, growing by about 40 MB a year, plus the options below | Measured on the developer's Mac on 9 November 2026 (details in the next table). |
| Past IMF World Economic Outlook editions | 2 to 9 MB per edition; about 100 MB for the 14 editions on that Mac | Measured. Every edition since 2007 would be roughly 300 MB (estimate: about 38 editions at an average of 7 MB). |
| GDELT long history (optional, `npm run gdelt:daily`) | About 5 MB kept on disk from 2016; the download is much larger (below) | Measured: 41 KB per month of history. |
| Small AI model (qwen2.5:7b, optional) | About 5 GB | Model size published by Ollama. |
| Mid-size referee (qwen2.5:14b, optional, only with "Allow a 14B referee") | About 9 GB | Model size published by Ollama. |
| Large AI model (qwen2.5:32b, optional) | About 20 GB | Model size published by Ollama. |

What sits in `data/` (developer's Mac, 9 November 2026, 22 countries):

| Folder | Size | What it holds | Grows? |
| --- | --- | --- | --- |
| `data/live/` (country and world files) | About 1 MB | Newest figures for each country and each world-wide source | No, each file is replaced |
| `data/live/gdelt-raw/` | About 8 MB | One summary file per day (about 135 KB each) for the GDELT look-back (8 weeks by default) | No, days older than the look-back are deleted |
| `data/live/gdelt-daily/` | About 5 MB | GDELT monthly totals since 2016 | About 0.5 MB a year |
| `data/history/` | About 10 KB per country | Full World Bank and IMF history | No |
| `data/archive/` | About 5 KB per country per day | A dated copy of each day's figures, so you can see what the data said on a past date | About 40 MB a year for 22 countries, unless you set `ARCHIVE_KEEP_DAYS` |
| `data/local/weo-vintages/` | About 100 MB | Past IMF forecast editions (see above) | When a new edition is added, twice a year |
| `data/local/ucdp/` | About 12 MB | UCDP conflict events | About 1.3 MB a month |
| `data/local/sanctions/` | About 10 MB | OFAC and UN sanctions lists | No, replaced each day |
| `data/local/gpr/` | About 3 MB | Geopolitical Risk index | No, replaced each month |
| Everything else in `data/local/` | A few MB | Settings, saved research, audit log, test results | Slowly, with use |

To see the real size on your own computer: on a Mac or Linux, run `du -sh data data/*` inside the
EconQuest folder; in the ready-made app, Menu > Offline data shows the size of the saved figures.

### How much data it downloads

The figures below come from the code and from recorded replies. The cloud computers used to build
the app cannot reach the data sources, so each figure is either measured from saved files or an
estimate, and says which. To check them on your own computer, compare the size of `data/` and your
network use before and after a run.

| When | What runs | About how much it downloads | How the figure was found |
| --- | --- | --- | --- |
| Once, the first time | The ready-made app (Docker image) | About 170 MB | Measured: the compressed image, 13 November 2026 (above) |
| Once, the first time | First full data download: every free source for every country, 8 weeks of GDELT files, past IMF forecast editions, sanctions, conflict and risk files | About 3.6 to 3.8 GB, most of it GDELT | GDELT: about 3.4 GB for 8 weeks (from GDELT's own file sizes, `npm run gdelt:pull -- --estimate`); IMF editions about 100 MB (measured); the rest as in the daily row |
| Once, if you choose | AI models through Ollama | About 5 GB (small) and 20 GB (large) | Model sizes published by Ollama |
| Once, if you choose | GDELT long history (`npm run gdelt:daily`) | About 25 GB from 2016; about 35 GB from 1979 | From GDELT's published file sizes; `npm run gdelt:daily -- --estimate` gives the exact figure |
| Every day | The daily run (`npm run go -- daily`, started by `npm run go`) | Roughly 150 to 200 MB | Estimate, broken down below |
| Every week | IMF past editions (only editions not yet saved), the Geopolitical Risk index, the weekly tests | Usually nothing to a few MB; up to about 10 MB when a new IMF edition appears | Measured file sizes; the tests use saved data only |
| Every month | New UCDP conflict file | About 1.3 MB | Measured |
| While the app is open | Background refresh of the figures on screen | A few MB at a time | Estimate: the same feeds as the daily run, only for the countries you look at |

The daily run, part by part (estimate):

| Part | About | How the figure was found |
| --- | --- | --- |
| Every free feed for every country | 70 to 100 MB | Recorded replies from 5 November 2026: 42 MB for one full pull of 10 countries (of which 15 MB is the Brazil Treasury price history and about 21 MB is world-wide sources downloaded once, not per country). Scaled to 22 countries and the sources added since. |
| GDELT 15-minute news files (only new ones) | About 60 MB | 3.4 GB for 8 weeks, divided by 56 days |
| OFAC and UN sanctions lists | About 10 MB | Measured: the five files saved on 8 November 2026 |
| Everything else (risk index, conflict files, forecasts and nowcasts) | Under 5 MB | Measured file sizes; forecasts and nowcasts use saved data |

That is roughly 4.5 to 6 GB a month if the daily run runs every day. A run with no internet changes
nothing: the last good figures stay, and the next start tries again. To download less, set
`GDELT_RAW_WEEKS` to fewer weeks (or `GDELT_GKG_EVERY_HOURS` to a larger number) in `.env`, or start
without the daily run (`npm run go -- --no-daily`).

An AI model is optional. Every figure, chart and signal works without one; the AI is only needed for
the council chat, summaries, debates and plain-language explanations ("Choose your AI" below).

## Pick your way

| Way | Best for | What it takes |
| --- | --- | --- |
| **Ready-made app** (this page, steps 1-4) | Almost everyone | Install Docker Desktop, download one file, type two commands |
| **Modest laptop** ("On a modest laptop" below) | A computer with 4 GB of memory or little free disk space | The ready-made app with one setting, light mode |
| **From the code** | Developers who want to change the app | Node.js 20 or later and the source code |
| **Home server** ([HOME_SERVER.md](HOME_SERVER.md)) | A household, team or class sharing one always-on machine | A Linux box or NAS with Docker; 32 GB of memory if it also runs the large AI model |
| **Your own cloud server** (below) | People with no spare hardware who want it reachable anywhere | A rented server, from about $5-12 a month, kept behind a sign-in |

## The ready-made app, step by step

### Step 1: Install Docker Desktop

1. Go to [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and
   download the version for your computer. On a Mac, pick "Apple Silicon" or "Intel" to match your
   machine (Apple menu > About This Mac tells you which).
2. Open the download and follow the installer. On Windows it may ask to turn on "WSL 2" and restart;
   say yes.
3. Start Docker Desktop and wait until it says it is running. It needs to be running whenever you
   use EconQuest.

On Linux, install Docker Engine and the compose plugin instead (`curl -fsSL https://get.docker.com |
sudo sh`, then log out and back in after `sudo usermod -aG docker "$USER"`).

### Step 2: Download the EconQuest settings file

1. Make a new folder called `econquest`, for example in your Documents folder.
2. Download [compose.yml](https://raw.githubusercontent.com/e-conquest/econquest/main/deploy/quick-start/compose.yml)
   into that folder (in your browser: right-click the link, then "Save link as"). Keep the name
   `compose.yml`. This small text file tells Docker which app to fetch and how to run it.

If you prefer the terminal, these two lines do the same:

```sh
mkdir econquest && cd econquest
curl -fsSLO https://raw.githubusercontent.com/e-conquest/econquest/main/deploy/quick-start/compose.yml
```

### Step 3: Start EconQuest

1. Open a terminal window: on a Mac, the **Terminal** app (in Applications > Utilities); on Windows,
   **PowerShell** (search for it in the Start menu).
2. Move into the folder you made. For example, if it is in Documents:

   ```sh
   cd Documents/econquest
   ```

3. Start the app:

   ```sh
   docker compose up -d
   ```

   The first time, Docker downloads the app (about 170 megabytes), which takes a few minutes.
   After that it starts in seconds. The `-d` means it keeps running in the background after you
   close the terminal.

### Step 4: Open it

Open **http://localhost:3737** in your web browser. "localhost" means "this computer": the app is
not on the internet, only on your machine.

The first screen shows a **Getting started** card that ticks itself off as you go. A new install
shows dashes until each source has answered, which can take a minute.

## On a modest laptop

Light mode is a lighter way to run EconQuest, chosen when you install it:

- **No AI model on your computer.** The council uses your own Google Gemini key if you add one
  (free up to Google's daily limits; Menu > Settings > API keys). Without a key it stays off and
  says so. Every figure, chart and signal works without it. The council never falls back to a
  smaller, less reliable model: a step that needs the large referee says so instead.
- **A smaller first download.** The GDELT 15-minute news files, about 3.4 GB of the 3.6 to 3.8 GB
  first download, are left out. The GDELT readings built from them (events and news themes) read
  Missing, with the reason. You can still download them later from Menu > Offline data.
- **Only your countries.** The download at start-up and the daily run fetch only the countries on
  your first watchlist (the one the app opens with) and any countries you added, not every country
  the app covers.

To turn it on with the ready-made app, create a file called `.env` in your `econquest` folder (next
to `compose.yml`) containing the line `LIGHT_MODE=on`, then start the app as in step 3. If you start
it from the code instead, use `scripts/start-mac.sh --light` on a Mac, or double-click
`scripts\start-windows-light.bat` on Windows. To turn it off again, remove the line and run
`docker compose up -d`.

Settings you can still change in `.env`: `PRELOAD_COUNTRIES=BRA,MEX` chooses exactly which countries
are downloaded; `GDELT_RAW_WEEKS=2` downloads two weeks of GDELT news files after all.

| | Target in light mode | Measured |
| --- | --- | --- |
| Memory (RAM) | 4 GB in all, with Docker Desktop and a web browser open | Not yet measured. It will be measured on a light-mode run before the public release and written here. |
| Disk space for EconQuest | 2 GB: the app image and its saved data (Docker Desktop itself is not counted) | Not yet measured, as above. |
| First download | Well under 1 GB | Not yet measured, as above. |

How the figures will be measured: after a first light-mode run, `docker stats --no-stream` shows
the app's memory use, `docker system df -v` and Menu > Offline data show the space used, and the
daily run's report (`npm run go -- status` on the developer's Mac) shows how much it downloaded.

## Choose your AI

Pick one in Menu > Settings > AI model. You can change your mind at any time.

| Choice | What it costs | What it needs | Privacy |
| --- | --- | --- | --- |
| **No AI** | Nothing | Nothing | Nothing leaves your computer except requests for public figures |
| **Google Gemini** | Free up to Google's daily limits, then Google bills your own key | A Gemini API key from [Google's Gemini API key page](https://ai.google.dev/gemini-api/docs/api-key), pasted into Menu > Settings > API keys | Your questions and the figures they use are sent to Google |
| **Ollama** (an AI model on your own computer) | Nothing | The free [Ollama app](https://ollama.com/download) and enough memory (below) | Everything stays on your computer |

EconQuest uses two Ollama models. A small one (qwen2.5:7b) answers for each desk; a large one
(qwen2.5:32b) acts as the referee that weighs the desks' answers, writes the summary and runs the
debate. The referee is the large model by default, because a small one makes too many mistakes; an
8B or smaller model is never used as referee. The settings the app uses (temperature, context window,
time limits) are listed in the [README](../README.md#ai-models-which-to-use-sizes-and-settings).

| Your computer's memory | What works with Ollama |
| --- | --- |
| 16 GB | The desk answers; use Gemini for the referee ("Ollama, then Gemini"), or turn on **Allow a 14B referee** and use qwen2.5:14b (about 9 GB), which needs about half the memory of the 32B model; every answer it judges then says "Small referee" |
| 32 GB or more (or a graphics card with 24 GB) | Everything, including the referee |

To use Ollama on a Mac or Windows PC:

1. Install the [Ollama app](https://ollama.com/download) and start it.
2. In a terminal, download the two models once (the large one is about 20 GB):

   ```sh
   ollama pull qwen2.5:7b
   ollama pull qwen2.5:32b
   ```

3. In EconQuest, Menu > Settings > AI model, choose Ollama. EconQuest finds the Ollama app on your
   computer by itself.

On Linux, or on a PC where you would rather not install the Ollama app, run Ollama inside Docker
instead: create a file called `.env` in your `econquest` folder containing the line
`OLLAMA_BASE_URL=http://ollama:11434`, then:

```sh
docker compose --profile ollama up -d
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull qwen2.5:32b
```

## Your first few minutes

1. **See which sources answer:** Menu > Tools > Data connections lists every source and whether it
   is working.
2. **Add a free FRED key** (from the US Federal Reserve Bank of St. Louis,
   [request one here](https://fred.stlouisfed.org/docs/api/api_key.html)) in Menu > Settings >
   API keys. It fills official 10-year government bond yields for several countries.
3. **Pick your countries:** Edit on the watchlist card. The G20 countries are there to start with.
4. **Save the data for offline use** (optional): Menu > Offline data > Download all country data.
5. **Set the help level** with the help button next to the dark-mode switch: Key help (the
   default) explains charts and what policies mean for everyday life; Full help explains
   everything; Help off hides the explanations.

The full guide to every screen is in Menu > User manual.

## Everyday use

| To | Do this (in a terminal, inside your `econquest` folder) |
| --- | --- |
| Stop the app | `docker compose down` (your saved data stays) |
| Start it again | `docker compose up -d` (Docker Desktop must be running) |
| Update to the newest release | `docker compose pull` then `docker compose up -d` |
| See what it is doing | `docker compose logs -f econquest` (Ctrl+C to stop watching) |
| Remove it and everything it saved | `docker compose down -v` (this deletes your saved data and keys; make a backup first) |
| List, make or revoke API tokens | `docker compose exec econquest npm run tokens -- list` (or `create "<name>" <scopes>`, `revoke <id>`); the same tokens as Menu > Settings > API tokens |

**Your data.** Everything EconQuest saves (settings, keys, downloaded figures, saved research) is
kept in a Docker storage area that survives restarts and updates. Menu > Settings > Backup downloads
all of it, except your keys, as one file you can keep or restore on another computer. Keys are
never put in backups or logs; you type them in again after a restore.

**A specific version.** To stay on one release instead of always taking the newest, add a line such
as `ECONQUEST_IMAGE=ghcr.io/e-conquest/econquest:0.1.0` to the `.env` file in your folder.
[env.example](../deploy/quick-start/env.example) lists every optional setting.

## Files you save yourself

Some sources cannot be downloaded by the app, because they need your own account or because their
terms are not confirmed or do not allow the app to pass them on. You download these yourself and put
them in a folder under `data/local/`. Nothing else is needed: the app reads a file the next time the
page asks for it, and **Menu > Data health** shows whether it was read. Until then the parts that need
the file read Missing and say where to get it.

| Folder | What to put there | Where to get it | Used for |
| --- | --- | --- | --- |
| `data/local/fao-cpi/` | FAOSTAT Consumer Price Indices, bulk download "All Data" or "All Data Normalized" (.zip or .csv) | https://www.fao.org/faostat/en/#data/CP, Bulk downloads | Food price inflation (History & data) |
| `data/local/emdat/` | EM-DAT public table (.xlsx, or a .csv or .zip of it) | https://public.emdat.be, with your own account (free for non-commercial use by universities, non-profit research bodies, public bodies and the media) | Natural disasters (History & data) |
| `data/local/imf-fiscal-rules/` | IMF Fiscal Rules Dataset (XLSX) | IMF Fiscal Rules Dataset page | National fiscal rules (Fiscal rules check) |
| `data/local/dpi/` | Database of Political Institutions 2020 (.csv or .xlsx) | Inter-American Development Bank | Checks and balances (Political feasibility in Policy review) |
| `data/local/imf-investor-base/` | `wp1439.zip`, the IMF Sovereign Debt Investor Base | imf.org (Arslanalp and Tsuda) | Who holds government debt (History & data) |
| `data/local/ons-triangles/` | `abmi.zip`, the ONS GDP revision triangle | ons.gov.uk, only if the app's own download is refused | UK GDP as first published |
| `data/local/weo-vintages/` | Past IMF World Economic Outlook editions | IMF WEO database page | IMF forecasts by edition |
| `data/local/acled/` | ACLED aggregated files (.xlsx or .csv, zipped or not) | acleddata.com, with your own account | Conflict events |
| `data/local/aiddata/` | A newer AidData Chinese development finance file (optional) | aiddata.org | China lending; a shipped summary is used otherwise |
| `data/local/cb-statements/<ISO3>/` | Central bank statements, one text, Markdown or web page file each, named from its date (for example `2026-10-29.txt`) | The central bank's own site | Central bank word count |

[USER_MANUAL.md](./USER_MANUAL.md) explains each panel, and [DATA_LICENCES.md](./DATA_LICENCES.md)
what each source's terms allow.

**With the ready-made app**, `data/` lives in Docker's storage area, so copy the file in from the
folder where you saved it, for example for EM-DAT:

```bash
docker compose exec econquest mkdir -p /app/data/local/emdat
docker compose cp emdat_public.xlsx econquest:/app/data/local/emdat/
```

**From the code**, save the file straight into the `data/local/...` folder inside your `econquest`
folder.

## Files the app downloads for you

The daily download also saves a few whole files under `data/local/`, because the sources publish them
as files rather than answering one question at a time. You do not need to do anything; this table is
here so you know what the folders are. Each one can also be fetched by hand from the code copy.

| Folder | What it holds | How often | By hand |
| --- | --- | --- | --- |
| `data/local/replays/` | Monthly history for the past-crisis replays: OECD 10-year government bond yields and Federal Reserve H.10 exchange rates from FRED since 1990, and J.P. Morgan EMBI Global spreads from Peru's central bank since 2016 | Once a week at most | `npm run replays:pull` |
| `data/local/chinn-ito/` | The Chinn-Ito capital account openness file (`kaopen_<year>.xls`), shown in the country risk scorecard with its citation and never passed on | Once every 30 days at most | `npm run chinn-ito:pull` |
| `data/local/weo-vintages/` | Past IMF World Economic Outlook editions | Once a week at most | `npm run weo:pull` |
| `data/local/gpr/` | The Geopolitical Risk index (Caldara and Iacoviello) | Once a week at most | `npm run gpr:pull` |
| `data/local/sanctions/`, `data/local/ucdp/` | OFAC and UN sanctions lists; newer UCDP conflict files | With each daily download | `npm run sanctions:pull`, `npm run ucdp:pull` |

If a download fails, the copy saved before is kept and nothing is filled in. `npm run check:data`
then shows which source did not answer (for the two newest, rows `fed_h10` and `chinn_ito`).

## Files that hold your connections

If you connect another program (Menu > Settings > API tokens), the app keeps what it needs in
`data/local/` as well:

| File or folder | What it holds |
| --- | --- |
| `data/local/api-tokens.json` | Each token's name, scopes, owner and dates, and a fingerprint of its secret (never the secret) |
| `data/local/hidden-names.json` | The hidden-names list, as fingerprints only |
| `data/local/watch-rules.json` | Watch alerts, including indicator watches set by another program |
| `data/local/events/` | The event log, webhook addresses and their signing secrets, and the delivery log |
| `data/local/audit/` | The audit log and, if you use a locked bucket, which entries have been copied there |

The backup file from Menu > Settings > Backup holds the watch alerts but not the tokens, hidden names
or webhooks. After moving to another computer with a backup file, make new tokens and add the hidden
names again; a full copy of the `data/` folder keeps them ([BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)).

## If something goes wrong

| What you see | What it usually means, and the fix |
| --- | --- |
| `Cannot connect to the Docker daemon` or `docker: command not found` | Docker Desktop is not running or not installed. Start it, wait until it says running, try again. |
| `port is already allocated` | Something else uses port 3737. Create `.env` in your folder with the line `PORT=3740`, run `docker compose up -d`, and open http://localhost:3740. |
| `manifest unknown` or `not found` when downloading | The ready-made image has not been published yet, or the name is mistyped. Check the line in `.env`, or use "From the code" below. |
| The page does not open | Wait a minute after starting and reload. `docker compose ps` should show econquest as "healthy". |
| Many figures say **Missing** | That is expected, not a fault: the app never invents a number. Each Missing figure says why (no free source, the source is down, or a key is needed). Data connections shows which sources answer. |
| The council says it cannot reach the AI | Ollama is not running, or the models are not downloaded. Start the Ollama app and run the `ollama pull` lines above, or switch to Gemini or No AI in Settings. |
| Answers are very slow | The large model on a computer without enough memory or a graphics chip can take 10 minutes or more per full council report. Use Gemini for the referee, or run Ollama on a bigger machine. |

## From the code (for developers)

```sh
git clone https://github.com/e-conquest/econquest.git
cd econquest
npm install
npm run dev          # http://localhost:3000
```

Or build the image yourself: `docker compose up -d --build` in the repository folder (port 3737).
The [README](../README.md) covers development, tests and connecting an outside system.

Useful commands in the code copy, on a computer that reaches the data sources:

| Command | What it does |
| --- | --- |
| `npm run go` | Pull the newest code, install, start Ollama and the app |
| `npm run go -- daily` | Run the daily data download now (log: `data/local/logs/daily.log`) |
| `npm run go -- status` | What is running and what the last daily download did, with its size |
| `npm run check:data` | Ask every source now and print one row each: connected, needs setup, or why it failed |
| `npm run replays:pull` | Save the monthly history for the past-crisis replays (`-- --force` saves it again) |
| `npm run chinn-ito:pull` | Save the Chinn-Ito file (`-- --force` downloads it again) |
| `npm run tokens -- list` | List, make or revoke API tokens |

## Your own cloud server

The same ready-made app runs on a rented Linux server. A small server with Gemini doing the AI costs
roughly $5-12 a month; a server that runs the large model itself costs much more (about $40-100 a
month without a graphics card, and slow; several hundred with one). Prices are approximate.

Follow [HOME_SERVER.md](HOME_SERVER.md) on the server, and before letting anyone reach it from the
internet, turn on its **HTTPS and sign-in** section, so only people with an account can open it.
People can sign in with a local password or, if you set it up, with an account they already have at
an OpenID Connect provider such as Google, Microsoft, Okta or Keycloak ([SECURITY.md](SECURITY.md)).
If the server is there to feed another system, [DEPLOYMENT.md](DEPLOYMENT.md) covers the reverse
proxy, service tokens, health checks and an alert when the daily download is late. Do
not open a copy to the general public: the keys saved in Settings belong to the whole server, so
every visitor would be using yours, and several free data sources allow personal use but not
passing their figures on to the public.

## Licence

EconQuest is free and open source: the code under the Apache-2.0 licence, the documentation under
CC BY 4.0. Each data source has its own terms, listed in Menu > About & data licences.
