# Outside research tools

Council chat can call a research-tools server that you run yourself: backtests, volatility and
price forecasts, nowcasts and option prices. The app talks to it over MCP (the Model Context
Protocol: JSON-RPC 2.0 over HTTP POST). Nothing in the app is tied to one server or one firm; any
server that follows the contract in [`contracts/research-tools.json`](contracts/research-tools.json)
works.

## Off by default

The feature is off until both the server address and the token are set. With either missing, the
app sends nothing to any research server and Council chat behaves exactly as before.

## Where it is used, and where it is not

- **Used:** Council chat questions only.
- **Never used:** scheduled council runs, the daily download, the morning brief and other briefs,
  the pre-registered validation backtests, the data API's `ask:council`, and any score, badge or
  signal. Results from the server never feed the app's own figures.

## Settings

Menu > Settings > Research tools, or `.env`:

| Setting | `.env` name | Default | What it does |
|---|---|---|---|
| Server address | `RESEARCH_TOOLS_URL` | none | For example `https://research.example.net:8443`. The app adds `/mcp`. |
| Token | `RESEARCH_TOOLS_TOKEN` | none | One key per app, made by the server's admin. Stored like the other API keys (encrypted at rest when a master key is set), never shown in full, never logged, never in backups. |
| Time limit | `RESEARCH_TOOLS_TIMEOUT_S` | 20 | Seconds the app waits for each request. |
| Tool calls per question | `RESEARCH_TOOLS_MAX_CALLS` | 4 | The most tool calls one chat question may make (1 to 10). |

**Test connection** on the same page opens a session with the server and lists the tools this token
can see. The Test button on each row does the same and shows the count. Only this computer, or an
admin when sign-in is on, can run the test.

## What is sent

Each request is a JSON-RPC 2.0 POST to `<address>/mcp`: `initialize` once per question (protocol
version `2025-06-18`, `2025-03-26` or `2024-11-05`, from the contract), then `tools/list`, then up to
the limit of `tools/call`. Every request carries:

- `Authorization: Bearer <token>`
- `X-Correlation-Id`: the chat question's id, so the app's audit entries and the server's tool-call
  entries can be joined (8 to 64 letters, digits, `-`, `_` or `.`).
- `X-Model-Location`: `local` when the chat's AI model runs on this computer or a local server
  (Ollama, or an OpenAI-compatible server on this computer), `cloud` otherwise. Google Gemini counts
  as cloud whenever its key is set, because the app also falls back to it. A server that limits
  council research to local models refuses calls marked `cloud`.

Replies may come as plain JSON or as an event stream; both are read.

## Audit log

Every `tools/list` and `tools/call` request, and a failed opening, goes in the audit log (kind
"Outside research tools") with the tool name, the correlation id, the outcome (answered, refused, no
answer, unreadable answer), the server's reason when it gave one, the time taken, where the model
runs, and the id of the saved result. The arguments are logged cut to one short line (160
characters). The token is never logged.

## When the server does not answer

A refusal (for example a revoked key, too many calls, tools switched off, or a cloud model when
only local models may see results) or no answer within the time limit is shown as
"Research tools unavailable" with the reason. Nothing else in the app depends on the server.

## Tests

There is no live server in the tests. `tests/helpers/researchToolsServer.ts` and
`tests/helpers/stand-in-research-fetch.mjs` answer only with replies built from the contract's
examples (the GARCH volatility forecast and the paper-portfolio refusal), plus the contract's HTTP
refusals. `tests/researchTools.test.ts` covers the client; `tests/researchToolsServer.test.ts` runs
the real server against the stand-in.
