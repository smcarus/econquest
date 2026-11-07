# Installing EconQuest

EconQuest runs on your own computer. There is no EconQuest website to sign up to and no account
with us: you download the app, it runs on your machine, and it fetches figures straight from free
public sources such as the IMF, the World Bank and central banks. Your keys, your saved research
and the questions you ask stay on your computer.

This guide is written for people who have never installed anything like this before. If you are a
developer, "From the code" below is the short route.

## What you need

- **A computer** running macOS, Windows 10 or 11, or Linux, made in roughly the last six years.
  Apple Silicon Macs (M1 and later) and ordinary Intel or AMD computers both work.
- **About 5 GB of free disk space** for the app and its saved data. If you also run an AI model on
  your computer, add 5 GB for the small model and 20 GB for the large one.
- **An internet connection**, so the app can fetch figures. Nothing has to be opened to the
  internet: the app only reaches out, nobody can reach in.
- **Docker Desktop**, a free program that runs ready-made apps in a sealed box so they cannot
  disturb the rest of your computer. Step 1 below installs it.

An AI model is optional. Every figure, chart and signal works without one; the AI is only needed for
the council chat, summaries, debates and plain-language explanations ("Choose your AI" below).

## Pick your way

| Way | Best for | What it takes |
| --- | --- | --- |
| **Ready-made app** (this page, steps 1-4) | Almost everyone | Install Docker Desktop, download one file, type two commands |
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

   The first time, Docker downloads the app (a few hundred megabytes), which takes a few minutes.
   After that it starts in seconds. The `-d` means it keeps running in the background after you
   close the terminal.

### Step 4: Open it

Open **http://localhost:3737** in your web browser. "localhost" means "this computer": the app is
not on the internet, only on your machine.

The first screen shows a **Getting started** card that ticks itself off as you go. A new install
shows dashes until each source has answered, which can take a minute.

## Choose your AI

Pick one in Menu > Settings > AI model. You can change your mind at any time.

| Choice | What it costs | What it needs | Privacy |
| --- | --- | --- | --- |
| **No AI** | Nothing | Nothing | Nothing leaves your computer except requests for public figures |
| **Google Gemini** | Free up to Google's daily limits, then Google bills your own key | A Gemini API key from [Google's Gemini API key page](https://ai.google.dev/gemini-api/docs/api-key), pasted into Menu > Settings > API keys | Your questions and the figures they use are sent to Google |
| **Ollama** (an AI model on your own computer) | Nothing | The free [Ollama app](https://ollama.com/download) and enough memory (below) | Everything stays on your computer |

EconQuest uses two Ollama models. A small one (qwen2.5:7b) answers for each desk; a large one
(qwen2.5:32b) acts as the referee that weighs the desks' answers, writes the summary and runs the
debate. The referee is always the large model, because a small one makes too many mistakes.

| Your computer's memory | What works with Ollama |
| --- | --- |
| 16 GB | The desk answers; use Gemini for the referee, or run Ollama on a bigger computer |
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

**Your data.** Everything EconQuest saves (settings, keys, downloaded figures, saved research) is
kept in a Docker storage area that survives restarts and updates. Menu > Settings > Backup downloads
all of it, except your keys, as one file you can keep or restore on another computer. Keys are
never put in backups or logs; you type them in again after a restore.

**A specific version.** To stay on one release instead of always taking the newest, add a line such
as `ECONQUEST_IMAGE=ghcr.io/e-conquest/econquest:0.1.0` to the `.env` file in your folder.
[env.example](../deploy/quick-start/env.example) lists every optional setting.

## If something goes wrong

| What you see | What it usually means, and the fix |
| --- | --- |
| `Cannot connect to the Docker daemon` or `docker: command not found` | Docker Desktop is not running or not installed. Start it, wait until it says running, try again. |
| `port is already allocated` | Something else uses port 3737. Create `.env` in your folder with the line `PORT=3740`, run `docker compose up -d`, and open http://localhost:3740. |
| `manifest unknown` or `not found` when downloading | The ready-made image has not been published yet, or the name is mistyped. Check the line in `.env`, or use "From the code" below. |
| The page does not open | Wait a minute after starting and reload. `docker compose ps` should show econquest as "healthy". |
| Many figures say **Missing** | That is honest, not broken: the app never invents a number. Each Missing figure says why (no free source, the source is down, or a key is needed). Data connections shows which sources answer. |
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
The [README](../README.md) covers development, tests and the integration API.

## Your own cloud server

The same ready-made app runs on a rented Linux server. A small server with Gemini doing the AI costs
roughly $5-12 a month; a server that runs the large model itself costs much more (about $40-100 a
month without a graphics card, and slow; several hundred with one). Prices are approximate.

Follow [HOME_SERVER.md](HOME_SERVER.md) on the server, and before letting anyone reach it from the
internet, turn on its **HTTPS and sign-in** section, so only people with an account can open it. Do
not open a copy to the general public: the keys saved in Settings belong to the whole server, so
every visitor would be using yours, and several free data sources allow personal use but not
passing their figures on to the public.

## Licence

EconQuest is free and open source: the code under the Apache-2.0 licence, the documentation under
CC BY 4.0. Each data source has its own terms, listed in Menu > About & data licences.
