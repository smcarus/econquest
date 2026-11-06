# Security: accounts and sign-in

The app started as a one-person tool on one computer. This page says what protects it when more
than one person uses it, and what does not yet. It grows with each security change.

## When sign-in applies

| Situation | Sign-in |
| --- | --- |
| No accounts, app on this computer only (the default, `start-mac.command`, `npm run dev`) | Off. Everything works as before. Menu > Account offers to create the first admin account. |
| No accounts, app opened to a network (`HOST=0.0.0.0` or `ALLOWED_HOSTS` set) or `AUTH=on` | Set-up only. Nothing works until the first admin account is created, and creating it needs the one-time setup code printed in the server log. |
| At least one account | Required for everyone, on every page and API call, including on the computer running the app. |

The setup code stops someone else on the network from claiming the app before you do. Find it with
`docker logs econquest-orchestrator` (Docker) or in the terminal running `npm run dev`.

## What is in place

- **Passwords** are stored only as salted scrypt hashes in `data/local/auth/accounts.json` (mode 600).
  At least 12 characters; may not contain the username.
- **Sessions** are random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` behind HTTPS
  with `COOKIE_SECURE=true`). The server keeps only each token's SHA-256 in `data/local/auth/sessions.json`,
  so a copy of that file cannot be used to sign in. A session ends after 12 hours without use or 7 days
  in all (`SESSION_IDLE_HOURS`, `SESSION_MAX_DAYS`).
- **Wrong passwords**: 5 for one username, or 20 from one address, within 15 minutes lock further tries
  for the rest of the 15 minutes. A wrong username takes as long to refuse as a wrong password.
- **Password change** (Menu > Account) signs the account out on every other browser.
- **Audit log** records the first account, each sign-in, failed sign-in, sign-out and password change,
  with the account name, never the password or token.
- **Accounts and sessions are never in a backup** (Menu > Settings > Backup lists what one holds).
- The earlier checks stay: only listed host names are answered (DNS rebinding), and changes sent from
  pages on other sites are refused.

## Locked out

On the server (picked up by a running app straight away):

```
npm run users -- list
npm run users -- reset-password <username>     # prints a new random password once
npm run users -- add-admin <username> "<Name>"
npm run users -- disable <username>
```

Under Docker: `docker compose exec econquest npm run users -- list`.

## Not yet (planned, in order)

1. Roles (Viewer, Analyst, Admin): today every account can do everything, as the single user could.
2. A CSRF token on every change, rate limits on the API and AI calls, security headers.
3. The account name on every audit entry and on sign-offs, with approver separate from reviewer.
4. Separate workspaces per account (watchlists, holdings, saved research).
5. API keys encrypted at rest with a key kept outside the data folder.
6. HTTPS through a reverse proxy in the compose stack.

Accounts record a provider (`local` today) so Google or Microsoft sign-in can be added later.
