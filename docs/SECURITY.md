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
- **Who did it**: every audit entry written while someone is signed in names the account (Menu >
  Audit log, and a By column in the CSV). The name is part of the entry's hash, so changing who did
  something breaks the chain check. Entries from before accounts existed have no name and still check.
- **Sign-off**: the name on a review or approval is the signed-in account's, not typed. Approving is an
  Admin step, and the account that reviewed a report cannot approve it (no "self-approved" with accounts).
- **Own workspace per account**: holdings, watchlists and added countries are kept per account in
  `data/local/users/<account id>/workspace.json`. The first admin starts from what the single user had
  saved (`data/local/workspace.json`, which stays as the workspace while sign-in is off). When a different
  account signs in on the same browser, the previous account's browser copy is removed first. Saved
  research, policy reviews and sign-offs stay a shared team library, with who saved what in the audit log.
  The morning brief uses the first active admin's watchlists. A backup holds the team library and the
  workspace of the admin making it; other accounts' workspaces are in `data/local/users/` and are
  covered by copying the data folder.
- **Keys encrypted at rest**: with a master key set, the data and AI keys saved in Menu > Settings are
  written to `data/local/settings.json` with AES-256-GCM. The master key is never in the data folder; it
  comes from `ECONQUEST_SECRET_KEY` (32+ characters, e.g. `openssl rand -base64 32`), the file named by
  `ECONQUEST_SECRET_KEY_FILE`, or the Docker secret `/run/secrets/econquest_secret_key`. Keys saved
  before are encrypted at the next start. Without a master key they stay plain text in a mode-600 file,
  and Menu > Settings says so. Keep a copy of the master key: without it, encrypted keys cannot be
  opened and must be entered again (they are kept, not deleted, until then).
- **Accounts and sessions are never in a backup** (Menu > Settings > Backup lists what one holds).
- **CSRF token**: while signed in, every change must carry `X-CSRF-Token`, derived from that browser's
  session (the page gets it at start). A page on another site cannot read it.
- **Rate limits per account**: 600 requests a minute in all, and 10 a minute (20 at once) for calls that
  run the AI model. Over the limit the server answers 429 with Retry-After.
- **Security headers** on every reply: no framing (`X-Frame-Options: DENY`, `frame-ancestors 'none'`),
  `nosniff`, `Referrer-Policy: same-origin`, no camera, microphone or location, no `X-Powered-By`.
  A full Content-Security-Policy for scripts is not set yet.
- The earlier checks stay: only listed host names are answered (DNS rebinding), and changes sent from
  pages on other sites are refused.

## Roles

| Role | Can |
| --- | --- |
| Viewer | Read Research, Reports and saved council answers, and keep their own watchlists and holdings. Cannot ask the council or change anything shared. |
| Analyst | Ask the council, save research, run policy reviews and backtests, sign off, refresh data, change watchlists and holdings. Sees which keys are set (masked) but cannot change them. |
| Admin | Everything, plus data and AI keys, AI model settings, backup and restore, the audit log, connectors and webhooks, watch alerts, the morning brief, and accounts (Menu > Users). |

One table in `src/utils/permissions.ts` decides this for every API call; a new route is Analyst
unless listed. The server refuses, so hiding a button is never the only check. The last active
admin cannot be demoted or disabled. Disabling an account signs it out at once. A password set
or reset by an admin is random, shown once, and never logged.

With accounts, an admin may change keys from any browser; the old "only from the computer running
the app" rule applies only while sign-in is off.

## Locked out

On the server (picked up by a running app straight away):

```
npm run users -- list
npm run users -- reset-password <username>     # prints a new random password once
npm run users -- add-admin <username> "<Name>"
npm run users -- disable <username>
```

Under Docker: `docker compose exec econquest npm run users -- list`.

## Sign-in through an OIDC provider

A server with several people on it can let them sign in with an account they already have at an
OpenID Connect provider (Google, Microsoft Entra ID, Okta, Keycloak, Authentik and others), beside
the local accounts. It is off unless `OIDC_ISSUER` and `OIDC_CLIENT_ID` are set (see `.env.example`).

1. Register the app with the provider as a web application, with the callback address
   `https://<your host>/api/auth/oidc/callback` (or set `OIDC_REDIRECT_URI` to the exact address).
2. Set `OIDC_ISSUER` (for Google `https://accounts.google.com`; for Microsoft
   `https://login.microsoftonline.com/<tenant id>/v2.0`), `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET`
   unless the provider registered a public client.
3. Say who may sign in: `OIDC_ALLOWED_EMAILS` (whole addresses, or `@example.org` for everyone at a
   domain) and `OIDC_ADMIN_EMAILS`. Others on the list get `OIDC_DEFAULT_ROLE` (viewer unless set);
   an admin can change the role in Menu > Users. An email on neither list is refused, whatever the
   provider says.
4. Restart. The sign-in page shows "Sign in with <OIDC_NAME>" above the username and password.

How it is checked:

- The authorization code flow with PKCE (S256), a random state tied to the browser by a 10-minute
  cookie, and a nonce. A sign-in that was not started in the same browser, or took longer than 10
  minutes, is refused.
- The ID token's signature is checked against the keys the provider publishes (RS256, PS256, ES256
  and the larger sizes; never `none` or a shared-secret algorithm), then its issuer, audience, expiry
  and nonce. Keys are fetched again once when a token names a new key, so a key change at the
  provider needs no restart.
- Only a verified email (`email_verified`) counts. At the first sign-in an account is made with the
  provider and the person's id there (`sub`); later sign-ins use that link, so a changed email at
  the provider does not move anyone to another account. A disabled account stays disabled.
- OIDC accounts have no password here: password sign-in, password change and password reset do not
  apply to them. Sessions, roles, CSRF, the audit log and API tokens work as for local accounts.
- With no accounts yet, an email in `OIDC_ADMIN_EMAILS` may create the first admin account by
  signing in; the setup code still works for a local admin.
- Every OIDC sign-in, new account and refusal (with the reason: not on the list, no verified email,
  disabled, expired, or a failed check) is in the audit log. The provider's tokens are not kept.

## Audit seal and locked copies

Each audit entry is chained to the one before it by a SHA-256 hash, so a line changed or removed
afterwards shows in Menu > Audit log. Two settings protect against someone who can edit the file
and rewrites the whole chain from some point on:

- **Seal.** With `AUDIT_SEAL_KEY` set (at least 32 characters, for example the output of
  `openssl rand -hex 32`), every new entry also carries an HMAC-SHA256 of its hash under that key.
  Without the key nobody can make a matching seal, so a rewritten chain fails the seal check.
  Keep the key in the server's environment or a secrets manager, not in `data/`: a key stored next
  to the log protects nothing. Entries written before the key was set read "not sealed", not broken.
  Changing the key starts a new run of seals; older ones are counted as "sealed with an earlier key".
- **Locked copies.** With `AUDIT_BUCKET_URL` and its keys set, each entry is also sent, in order, to
  an S3-compatible bucket as its own object (`econquest-audit/0000000001.json`, ...) with an
  object-lock retention date, so it cannot be changed or deleted before that date even by the
  account that wrote it (`COMPLIANCE`, the default) or only with a special permission
  (`GOVERNANCE`). The bucket must be created with object lock turned on (Amazon S3, MinIO,
  Backblaze B2 and Wasabi support it). Give the access key `s3:PutObject` and
  `s3:PutObjectRetention` on the prefix and nothing else. A failed upload is tried again (5 seconds,
  doubling to 10 minutes) and named in Menu > Audit log until it goes through; what has gone up is in
  `data/local/audit/bucket-state.json`.

To check the log against the bucket, download the objects and compare each with the line of the
same number in an export (Menu > Audit log > JSON Lines): they must be byte for byte the same.

The keys are read from the environment only. They are never written to the audit log, to settings
or to backups.

## Release review

The review done before the public release (dependencies, routes, file permissions, backups, the
local AI model and the Windows start scripts), with what it found and fixed, is in
[SECURITY_REVIEW.md](SECURITY_REVIEW.md).

## Not yet (planned, in order)

1. HTTPS through a reverse proxy in the compose stack.

Accounts record a provider: `local` (password kept here) or `oidc` (see "Sign-in through an OIDC provider").
