# Deploying EconQuest as a data and alert source

This guide is for running EconQuest on a server so that an outside portfolio system (a "console")
can read its figures, receive its events and send it positions over HTTP. It builds on
[HOME_SERVER.md](HOME_SERVER.md) (Docker install, Ollama, backups) and
[KUBERNETES.md](KUBERNETES.md); the addresses themselves are in [DATA_API.md](DATA_API.md) and
[openapi.json](openapi.json).

The short version:

1. Run the app behind a reverse proxy that holds the TLS certificate.
2. Name the host in `ALLOWED_HOSTS`, turn on sign-in, and trust the proxy.
3. Make one token per outside system, with only the scopes it needs.
4. Point health checks at `/healthz` (alive) and `/readyz` (ready for traffic).
5. Run the daily download on a timer and set `DAILY_DOWNLOAD_DEADLINE`, so the console hears
   `daily_download_ready` when the data is in, or `feed_failed` when it is not.
6. Seal the audit log and copy it to a locked bucket.

## 1. Reverse proxy and TLS

The app speaks plain HTTP on port 3737 and should never be reached directly from another machine.
Put a reverse proxy in front of it that holds the certificate and forwards to `127.0.0.1:3737`.

**Caddy (built in).** The compose file has an `https` profile with Caddy; see "HTTPS and sign-in"
in [HOME_SERVER.md](HOME_SERVER.md#https-and-sign-in). With a public domain whose ports 80 and 443
reach the server, set `TLS_MODE` to your email address and Caddy gets a Let's Encrypt certificate.

**nginx.** If you already run nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name econquest.example.org;
  ssl_certificate     /etc/letsencrypt/live/econquest.example.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/econquest.example.org/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3737;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # The event stream (GET /api/v1/events/stream) is a long-lived response.
    proxy_buffering off;
    proxy_read_timeout 1h;
  }
}
```

Keep `BIND_ADDRESS=127.0.0.1` so only the proxy can reach the app.

## 2. Host names, sign-in and the proxy

In `.env`:

```sh
ALLOWED_HOSTS=econquest.example.org   # every name the proxy forwards; comma separated
TRUST_PROXY=1                         # one proxy hop: client addresses and HTTPS come from it
COOKIE_SECURE=true                    # sign-in cookies only over HTTPS
ECONQUEST_SECRET_KEY=...              # openssl rand -base64 32; encrypts saved keys; keep a copy elsewhere
```

- `ALLOWED_HOSTS` turns on the host check: a request naming any other host is refused, which stops
  DNS-rebinding attacks. Listing a name also turns sign-in on: nothing works until the first admin
  account is made (the setup code is in the log; see [SECURITY.md](SECURITY.md)).
- Tokens (below) work without a browser session; people use accounts.
- People can sign in with an account they already have at Google, Microsoft, Okta, Keycloak or any
  other OpenID Connect provider: set `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_ALLOWED_EMAILS`; see
  "Sign-in through an OIDC provider" in [SECURITY.md](SECURITY.md).

## 3. Service tokens

Each outside system gets its own named token, limited to what it needs, revocable at any time. A
token's secret is shown once; the app keeps only its SHA-256 hash.

| Scope | Lets the system |
|---|---|
| `read:data` | read series, panels, country lists and snapshots |
| `read:council` | read the last council run per country |
| `read:events` | read and stream events, set webhooks and indicator watches |
| `write:holdings` | send its positions |
| `write:exclusions` | change the hidden-names list |
| `run:scenarios` | run shocks and historical replays on a portfolio it sends |

Make them in Menu > Settings > API tokens, or from the server's command line (useful when the
server is set up by script):

```sh
docker compose exec econquest npm run tokens -- create "Risk console" read:data,read:events,run:scenarios
docker compose exec econquest npm run tokens -- create "Book sync" write:holdings --account alice
docker compose exec econquest npm run tokens -- list
docker compose exec econquest npm run tokens -- revoke <id>
```

`--account` puts the positions that token sends in that account's Holdings. A running app sees a
new or revoked token at once. Every token made, revoked or used is in the audit log. The
integration key from `.env` (`SMCR_INTEGRATION_API_KEY`) keeps working as a legacy key with the
three read scopes.

To rotate a token: make the new one, switch the outside system to it, then revoke the old one.

## 4. Health checks

| Address | Answers | Use it for |
|---|---|---|
| `GET /healthz` | `200 {"status":"ok","code":"..."}` as soon as the process serves requests. Touches no feed, file or model. | Liveness: restart the container if this stops answering. `code` is a fingerprint of the running code. |
| `GET /readyz` | `200` once listening, while not shutting down and while the data folder can be written; `503` otherwise, with the reason. | Readiness: send traffic only while this says ready. |

Both answer without a token or sign-in and reveal nothing about the data. The Docker image's own
health check calls `/healthz`; the Helm chart (`deploy/helm/econquest`) uses both.

## 5. Daily download and its deadline

New figures come in through the daily download (`npm run daily`), never when a page or an API
address is opened. On a server, run it on a timer before the console needs the data, for example
with cron on the host:

```cron
# 05:00 every day, server time
0 5 * * * cd /srv/econquest && docker compose exec -T -e ECONQUEST_WHERE=server econquest npm run daily >> /var/log/econquest-daily.log 2>&1
```

(or a systemd timer; Kubernetes: a CronJob that runs the same command in the app's image with the
same data volume). A run usually takes 20 to 60 minutes. A second start the same day does nothing.

Then set the deadline the console relies on:

```sh
DAILY_DOWNLOAD_DEADLINE=07:30    # HH:MM; "off" or empty for none
SCHEDULE_TZ=America/New_York     # the deadline's time zone (default TZ, else UTC)
```

What the console receives (as events: `GET /api/v1/events`, the stream, or webhooks):

- `daily_download_ready` when a run finishes, with every step's outcome and
  `data.deadline: { time, time_zone, counts_for, after_deadline_of }`: `counts_for` is the day whose
  deadline the run meets; `after_deadline_of` is set when the run finished after that day's
  deadline had already passed. A step that failed also sends its own `feed_failed`.
- `feed_failed` with `entity.name: "Daily download"` and `discriminator: "deadline:<day>"`, once
  per day, when the deadline passes and no run finished in the 24 hours up to it. The summary says
  what was seen: still running (and since when), the last run's finish time, or no run at all. The
  figures the app serves are then still the last ones that finished, each with its own date.

## 6. Audit seal and locked copies

Set `AUDIT_SEAL_KEY` so each audit entry carries a seal only that key can make, and
`AUDIT_BUCKET_URL` with its keys so each entry is copied to an S3-compatible bucket with object
lock. Both are explained in "Audit seal and locked copies" in [SECURITY.md](SECURITY.md).

## 7. Webhooks from a server

A webhook can point at any `http://` or `https://` address the server can reach, including your
internal network, so a console on the same network can receive events directly. Cloud metadata
addresses (169.254.x.x and similar) and the app's own port are refused. Use `https://` for any
receiver outside the machine: every delivery is signed (HMAC-SHA256 in the `X-EconQuest-Signature-256`
header; see "Events and webhooks" in [DATA_API.md](DATA_API.md)), but the body itself is only
private over TLS. A console that cannot accept incoming calls can read
`GET /api/v1/events?after=<id>` or the stream instead.

## Checklist

- [ ] Proxy with TLS forwards to `127.0.0.1:3737`; the event stream is not buffered.
- [ ] `ALLOWED_HOSTS`, `TRUST_PROXY=1`, `COOKIE_SECURE=true`, `ECONQUEST_SECRET_KEY` set; first admin made.
- [ ] One token per outside system, smallest scopes; secrets stored in the console's secret store.
- [ ] Liveness on `/healthz`, readiness on `/readyz`.
- [ ] Daily download on a timer; `DAILY_DOWNLOAD_DEADLINE` and `SCHEDULE_TZ` set; the console acts on `feed_failed`.
- [ ] `AUDIT_SEAL_KEY` set and kept outside `data/`; bucket with object lock receiving copies (Menu > Audit log shows the count).
- [ ] Backups of `data/` running ([BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md)); the keys kept separately.
