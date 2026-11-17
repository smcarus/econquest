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

## The Quant desk in Council chat

With research tools set up, Council chat has one more desk agent, the **Quant desk**. It joins a
question when:

- the question uses one of its words: backtest, forecast, volatility (or vol, GARCH, implied
  volatility), nowcast, an option price, chain or premium (a call or put option), drawdown or
  Sharpe. "Option" counts only in the markets sense, so "policy options" does not bring it in;
- or the AI model that picks the desks judges it fits (the model is told about the desk only when
  research tools are set up, so the prompt is unchanged when they are off);
- or the last question used it and this one is a follow-up that names no other topic.

The chat shows why it was asked, as for every desk.

**What it calls.** The desk asks the server which tools the token can see (`tools/list`) and calls
only those. It picks the calls by stated rules on the question's words, never by guessing: a
volatility or price forecast for each currency, pair or ticker named (a three-letter currency such as
BRL is read as units per US dollar, USDBRL, as the contract quotes FX); return statistics for
drawdown or Sharpe; a saved run when the question names its id; a nowcast list and the latest
nowcast; an option chain. The horizon (1 to 60 days) and the start date come from the question
only; with none named, the server's defaults are used. At most the "tool calls per question" limit
is used (4 by default); anything left out is said.

**What it shows.** Each figure is taken from the server's reply as it came, rounded to 4 decimals at
most (a yearly volatility fraction is also shown as a percentage in brackets). Each finding carries
the result's link, its data-through date and the reply's label ("Hypothetical, past performance; not
a recommendation"). A reply without a labelled cite block is not used, and fields the server flags
are never printed. The figures go to the synthesis as the desk's findings, so the referee's number
check accepts them and the written answer may quote them; nothing else from the server can be quoted.
The answer card, the agent documents and the network view (badge "reads: outside research tools")
show each figure with its link and date. The desk never words anything as a call to buy or sell.

**When the server does not answer.** A refused call or no answer within the time limit puts a
"Research tools unavailable" line with the reason under the answer; the other desks still answer.
A server that lets only local models read results refuses calls marked `cloud`; the desk then shows
the server's reason and is left out of the answer.

**Correlation.** The chat question's id is sent as `X-Correlation-Id` on each call and on the
synthesis request, so the audit log's research tools entries, the chat's own entries and the
server's tool-call log share one id.

## When the server does not answer (Test connection)

A refusal (for example a revoked key, too many calls, tools switched off, or a cloud model when
only local models may see results) or no answer within the time limit is shown as
"Research tools unavailable" with the reason. Nothing else in the app depends on the server.

## Tests

There is no live server in the tests. `tests/helpers/researchToolsServer.ts` and
`tests/helpers/stand-in-research-fetch.mjs` answer only with replies built from the contract's
examples (the GARCH volatility forecast and the paper-portfolio refusal), plus the contract's HTTP
refusals. `tests/researchTools.test.ts` covers the client; `tests/quantDesk.test.ts` covers the Quant
desk's picking, calls, figures and the chat with it on and off; `tests/researchToolsServer.test.ts`
runs the real server against the stand-in, including the BRL volatility question, a local-only
refusal and a timed-out call.
