# EconQuest for school IT staff

A professor wants to run EconQuest for a class. This page says what that means for your network and
your computers. It is one page on purpose; the details are in the documents linked at the end.

## What it is

EconQuest is a free, open-source economics app (Apache-2.0 for the code, CC BY 4.0 for the
documents). It runs on one computer, the professor's laptop or a school server, and students open
it in an ordinary web browser on the same network. There is no EconQuest cloud service, no account
with the project, and no fee.

## What runs where

| Part | Where | Notes |
| --- | --- | --- |
| The app (a Node.js web server) | The professor's computer or a school server | Node.js 22 (or 20.19 and later). Started with `npm run go` on a Mac or `npm run dev` on any computer, after `npm run class:setup`. |
| Students | Any browser on the school network | Nothing is installed on student devices. |
| An AI model (optional) | The same computer (Ollama), or Google Gemini with the professor's own key | Classes work without one. |

## Network

- **Incoming:** students reach the app on **TCP port 3000** of that computer (`http://<address>:3000`;
  `npm run class:setup` prints the address). Nothing needs to be opened to the internet. If the
  school's Wi-Fi isolates devices from each other, allow port 3000 to that one computer, or put it
  on the wired network.
- **Outgoing:** ordinary HTTPS requests to public data sources (IMF, World Bank, BIS, ECB, FRED and
  others; the full list with their terms is in [DATA_SOURCES.md](./DATA_SOURCES.md)), once a day
  for the daily download and when a page needs a figure. At most once a day it asks GitHub for the
  newest release number; `UPDATE_CHECK=off` in `.env` stops that.
- **Encryption:** the app itself speaks plain HTTP on the local network. For a shared or open
  network, put it behind HTTPS as described in [HOME_SERVER.md](./HOME_SERVER.md) ("HTTPS and
  sign-in").

## Accounts and sign-in

`npm run class:setup` turns classes on (`CLASSES_ENABLED=on` in `.env`) and opens the app to the
network (`HOST=0.0.0.0`). From then on everyone must sign in. The professor holds the administrator
account and makes student accounts from nicknames; students can also join a class with a code.
Accounts are local to that computer: passwords are stored only as salted scrypt hashes, sessions
end after 12 hours without use, and sign-in through the school's own OpenID Connect provider
(Google, Microsoft, Okta, Keycloak) can be set up instead ([SECURITY.md](./SECURITY.md)). The app
never grades students; the professor does.

## What is stored

Everything stays on that computer, in the app's folder:

- `data/local/` holds accounts, sessions, classes (`data/local/classes.json`), private Quest
  entries, settings and keys. Files with accounts and keys are readable by the app's user only.
- `data/` holds downloaded public figures.

The app has no telemetry, no usage statistics and no advertising ([PRIVACY.md](./PRIVACY.md)).
Nothing about students is sent to the project. Every account and class change is written to the
audit log (Menu > Audit log, administrators only). To delete everything, delete the app's folder.

## Updates during a term

`npm run class:setup -- --until <last day of term>` pins the version in use for the whole term
(`data/local/class-release.json`), so the class sees the same app every week. Until that day,
`npm run go` and `npm run update` keep that version and say so; the day after, updates come back on
their own. For an urgent fix, `npm run class:setup -- --unpin` ends the pin early, and
`npm run class:setup -- --status` shows what is set.

## Computer size

The app alone needs little: it used about 230 MB of memory when idle in a test on 9 November 2026,
and 8 GB of memory is enough without a local AI model ([INSTALL.md](./INSTALL.md), "What you
need"). A load test with 40 students on a modest laptop is a planned step of the classroom work;
its result will be added here.

## More

- Installing: [INSTALL.md](./INSTALL.md)
- Security and sign-in: [SECURITY.md](./SECURITY.md); a server reachable from outside: [HOME_SERVER.md](./HOME_SERVER.md)
- Privacy: [PRIVACY.md](./PRIVACY.md)
- Classes and Quests: [QUESTS.md](./QUESTS.md)
