# Testing EconQuest before its public release

EconQuest has not had its first public release yet. Before it does, a small group of invited testers
(teachers, researchers and analysts) try it on their own computers and say what is wrong, confusing
or missing. This page is for them, and for anyone else who wants to try the code as it is today.

## What you need

- A computer with at least 8 GB of memory and 20 GB of free disk space. Light mode (below) is meant
  for a computer like this.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), installed and running. On
  Windows it may ask to turn on "WSL 2" and to restart; say yes.
- About 30 to 60 minutes, mostly waiting for downloads.
- Optional: a free Google Gemini key for Council chat. Every figure, chart and tool works without it.
- Optional: a free GitHub account, to send a problem report from the app.

## Installing from the code

The ready-made app (`ghcr.io/e-conquest/econquest`) and the public copy at
github.com/e-conquest/econquest are not published yet, so testers install from the code at
**github.com/smcarus/econquest**, which is public.

1. Start Docker Desktop and wait until it says it is running.
2. On [github.com/smcarus/econquest](https://github.com/smcarus/econquest) press **Code > Download
   ZIP**, and unzip it into your Documents folder. (If you use git, `git clone
   https://github.com/smcarus/econquest.git` does the same.)
3. Start it in light mode:
   - **Windows:** open the `scripts` folder and double-click `start-windows-light.bat`.
   - **Mac:** open the **Terminal** app, go to the folder you unzipped (for example
     `cd ~/Documents/econquest-main`), then type `scripts/start-mac.sh --light`.
4. When it says it is ready, open http://localhost:3737 in your web browser.

Light mode leaves out the local AI model, which needs a large computer, and downloads less. To use
Council chat, add a Gemini key in **Menu > Settings > AI model**; your Council chat questions then go
to Google to be answered. Nothing else about you is sent to the project. [INSTALL.md](./INSTALL.md)
has the full steps, and [PRIVACY.md](./PRIVACY.md) lists everything that leaves your computer.

The first start downloads data for a few minutes, and figures fill in as each source answers.

## What to try

Pick what interests you:

1. **Research one country you know well.** Are the figures right? Is anything you would expect
   missing?
2. **Council chat.** Ask a question you might set your students, for example "Should Ghana raise
   interest rates?" Is the answer sound, and does it say where each figure comes from?
3. **What-if.** Ask Council chat a what-if question (for example "What if the Fed raises rates by 1
   point?"), and look at Debt sustainability for one country.
4. **Policy review.** Press **Policy review** in the header, then **New policy review**. Walk through
   one review and make the one-page PDF brief. In the Precedents step, try **What happened after**:
   pick a change the country made and see how it went against countries that did not make it.
5. **Compare** two or three neighbouring or similar countries.
6. **Help level.** Press the **?** button and try Key help and Full help. Is the wording right for
   your students or readers?
7. **Languages.** If you teach or work in Spanish, French or Portuguese, switch the language and say
   what reads badly.
8. **Keyboard and screen reader.** If you use either, try one task without a mouse.
   [ACCESSIBILITY.md](./ACCESSIBILITY.md) lists what is known not to work yet.

## Things you will notice

- **Missing.** Some figures say Missing. That is on purpose: the app never fills a gap with an
  estimate. Each one says why: no free source, the source did not answer, or a file or key is
  needed.
- **AI-written answers are labelled.** Treat them as a starting point, not a verdict.
- **Research, not advice.** EconQuest does not tell anyone what to buy or sell.

## Reporting a problem or an idea

Use **Menu > Report a problem**, or the **Flag** button next to a figure or a council answer. If a
screen fails to draw, its note has **Report this problem** too. Each opens a new issue on
[github.com/smcarus/econquest/issues](https://github.com/smcarus/econquest/issues) with the app
version and the details filled in, and no figures or saved data. Nothing is sent until you press
**Submit** there. A free GitHub account is needed; if you do not have one, write to the person who
invited you instead.

Helpful details: what you clicked, what you expected, what you saw, and a screenshot.

On the day the public copy opens, these links move to github.com/e-conquest/econquest, and this
page is replaced by the normal install guide.

## Three questions at the end

After two or three weeks, please answer:

1. Would you use it in a class or in your work? Which part, and for what?
2. What was wrong, confusing or missing?
3. Which one change would make it most useful?
