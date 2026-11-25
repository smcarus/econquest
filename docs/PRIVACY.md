# Privacy

EconQuest runs on your own computer (or on a server you run). It has no accounts with the project,
no adverts and no tracking. This page says what stays on your computer, what leaves it, and when.

## In short

- **Nothing about you is sent to the project.** The app has no telemetry, no usage statistics, no
  crash reports sent anywhere and no analytics scripts. The project counts only public GitHub
  numbers (stars, issues, downloads), never people (`npm run check:success`).
- **What you save stays where the app runs:** settings, keys, watchlists, saved research, policy
  reviews, holdings, the audit log and downloaded figures.
- **The screens ask no outside server for anything:** the fonts, icons and scripts come with the app.
- **Data leaves the computer only to reach a service you use:** the public data sources, the AI
  provider you choose, and anything else you switch on yourself (listed below).

## What leaves your computer, and when

| What | Goes to | When | What is sent |
| --- | --- | --- | --- |
| Requests for figures | Public data sources (IMF, World Bank, BIS, ECB, FRED, OECD and the others in [DATA_SOURCES.md](./DATA_SOURCES.md)) | When a screen needs a figure, and in the daily download | The series and country asked for, and your computer's internet address, as with any web request. The app names itself as an open-source research tool and sends nothing about you. A source that needs a free key (FRED, for example) gets that key |
| Questions to the AI | The AI provider chosen in Menu > Settings > AI model | When you ask the council something | **No AI** and **Ollama** send nothing; Ollama runs on your computer. **Google Gemini** (or another online provider you set up) receives the question and the figures it uses, under that provider's own terms. Your key goes only to that provider |
| Update check | GitHub | At most once a day, when the app is open | A request for the project's newest release number, the same public page anyone can read. Menu > About shows the answer. Off with `UPDATE_CHECK=off` in `.env` |
| Alerts | The webhook or email server you set in Menu > Settings > Server alerts | Only if you set one | The alert text. Keys and passwords are blanked from every message |
| Locked audit copies | The storage bucket you set in `AUDIT_BUCKET_URL` | Only if you set one | Each audit log entry |
| Sign-in | The sign-in provider you set (`OIDC_ISSUER`) | Only if you set one, when someone signs in | What that provider needs to sign the person in |
| Broker prices | Your own IBKR gateway on this computer | Only if you set one | Requests for the contracts you list; it never leaves the computer |
| Flags and problem reports | GitHub | Only when you open the ready-made issue link (the Flag button, Report this problem on an error note, or Menu > Report a problem) and send it yourself | The text you see before sending. A figure from a paid subscription is left out; error details hold the version, the screen, the error and the page path, never figures or saved data |

## What is kept, and where

| What | Where | Notes |
| --- | --- | --- |
| Keys and settings | `data/local/settings.json` on the computer running the app | Never written to backups, logs or the audit log |
| Saved research, reviews, watch alerts, holdings | `data/local/` | Included in Menu > Backup (without keys) |
| Downloaded figures and their history | `data/live/` and `data/local/` | Public figures, plus any files you added yourself |
| Your flags and ratings | `data/local/feedback.jsonl` | Never sent by the app |
| Screen choices (language, dark mode, layout, last session) | Your browser's own storage for this site | Stays in that browser |
| Audit log | `data/local/` | Each council question with the figures used, and each save, delete, export, settings or key change (never keys, passwords, uploaded document text or holdings amounts). With accounts on, only admins can read it |

On a shared server (home server, team or class), the person who runs it can read everything the
server keeps, as with any server.

## Removing your data

Menu > Backup downloads what you made, so you can keep it. To remove everything, follow
[Remove EconQuest](./INSTALL.md#remove-econquest) in INSTALL.md. Clearing the site data in your
browser removes the screen choices kept there.

## Questions

Ask in the project's GitHub Discussions, or report a security problem as described in
[SECURITY.md](../SECURITY.md).
