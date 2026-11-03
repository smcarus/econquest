# Implementation Plan: GUI External/Internal API & Host Connector Hub + Documentation Sync

## 1. Executive Summary & Architectural Scope
This plan refines the **EconQuest Sovereign Council Orchestrator** so users can seamlessly configure, test, map, and manage **external APIs** and **internal network hosts** entirely from the GUI, alongside updated documentation across `README.md`, `SOVEREIGN_COUNCIL_MANUAL.md`, `docs/USER_MANUAL.md`, and the in-app **Manual & GitHub Docs** viewer.

Specifically, we will implement:
1. **External & Internal API / Host Connector GUI Hub (Tab 4 in the AI Runtime & Self-Host Studio + Quick-Access Header Launch)**:
   - Manage three classes of connectors from a single interactive GUI:
     - **Macro & Market Data REST Feeds** (World Bank, IMF DataMapper, FRED, US Treasury FiscalData, GDELT, plus user-defined internal data lakes, intranet microservices, or external REST JSON APIs).
     - **Internal & External LLM Host Gateways** (Ollama, vLLM, LocalAI, LM Studio, TGI, LiteLLM proxy, or internal enterprise OpenAI-compatible gateways with custom headers and health checks).
     - **Outbound Webhook & Enterprise Event Bus Connectors** (Slack, Microsoft Teams, Discord, PagerDuty, or internal risk-bus HTTP endpoints with customizable JSON payload templates and 1-click test dispatch).
2. **Server-Side Proxy Ping Tester, Live JSON Inspector & Telemetry Mapper**:
   - All custom headers/auth tokens and HTTP requests are executed server-side via `/api/connectors/*` routes to avoid browser CORS blocks and keep credentials out of client code.
   - Users can click **Ping & Inspect JSON** on any connector to view live HTTP status, round-trip latency (ms), response headers, and formatted JSON payload.
   - Users can map JSON dot-paths (e.g., `data.0.gdp_growth`, `metrics.cpi_yoy`, `sovereign.cds_5y_bps`) directly into live sovereign indicators (`gdpGrowth`, `cpiInflation`, `debtToGdp`, `cds5yBps`, `fxReservesMonths`, `policyRate`, `politicalStability`) or inject custom JSON context into the 9-agent Council prompts.
3. **Comprehensive Documentation & In-App Manual Synchronization**:
   - Update `/README.md`, `/SOVEREIGN_COUNCIL_MANUAL.md`, and `/docs/USER_MANUAL.md` (and verify `/api/docs/manual-and-readme`) so both GitHub visitors and in-app **Manual & Docs** users have complete, step-by-step documentation for the 4-Tab GUI Studio, Per-Agent Model & Directive Matrix, Docker Mac/Windows Self-Hosting Builder, and External/Internal API Connectors.

---

## 2. Backend & Type System Additions

### A. Type Definitions (`/src/types/council.ts`)
- Add `ExternalInternalConnectorConfig`:
  - `id`: string
  - `name`: string
  - `category`: `'macro_rest' | 'llm_gateway' | 'webhook_bus'`
  - `networkScope`: `'external' | 'internal_host'`
  - `url`: string (supports `{{ISO3}}` and `{{ISO2}}` template variables for sovereign-specific macro queries)
  - `method`: `'GET' | 'POST'`
  - `headers`: `Record<string, string>` (e.g., `Accept`, `X-Internal-Service`, custom auth header names handled via backend runtime store)
  - `bodyTemplate`?: string
  - `enabled`: boolean
  - `timeoutMs`: number
  - `telemetryMappings`?: `Partial<Record<'gdpGrowth' | 'cpiInflation' | 'debtToGdp' | 'cds5yBps' | 'fxReservesMonths' | 'policyRate' | 'politicalStability', string>>` (maps sovereign metric keys to JSON dot-paths in the response)
  - `injectIntoCouncilPrompt`?: boolean
  - `lastStatus`?: `'untested' | 'ok' | 'error'`
  - `lastLatencyMs`?: number
  - `lastTestedAt`?: string
- Extend `AIRuntimeConfig` with `apiConnectors?: ExternalInternalConnectorConfig[]`.

### B. Server-Side API & Proxy Routes (`/server.ts`)
- **Pre-Seeded Default Connectors**:
  - Seed default editable connectors in `serverRuntimeGuiConfig.apiConnectors` covering:
    1. **World Bank Macro Indicators API** (`macro_rest`, `external`, `https://api.worldbank.org/v2/country/{{ISO3}}/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=2`)
    2. **IMF DataMapper Sovereign Debt Feed** (`macro_rest`, `external`, `https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/{{ISO3}}`)
    3. **Internal Enterprise Risk Lake / Custom Host** (`macro_rest`, `internal_host`, `http://host.docker.internal:8080/api/v1/sovereign/{{ISO3}}`)
    4. **Local / Internal Ollama & vLLM Gateway** (`llm_gateway`, `internal_host`, `http://localhost:11434/api/tags`)
    5. **Outbound SMCR-1.0 Risk Bus Webhook** (`webhook_bus`, `internal_host`, `http://host.docker.internal:9000/webhooks/smcr-verdict`)
- **New Endpoints**:
  - `POST /api/connectors/ping-and-inspect`:
    - Accepts a connector configuration (`url`, `method`, `headers`, `bodyTemplate`, `timeoutMs`, `sampleIso3`, `telemetryMappings`).
    - Substitutes `{{ISO3}}` / `{{ISO2}}` (defaulting to the active sovereign, e.g., `USA` / `US`), performs the HTTP request server-side with an `AbortSignal.timeout`, measures latency in `ms`, extracts a safe JSON preview, and evaluates all configured `telemetryMappings` dot-paths against the returned JSON so the user can immediately verify extracted numbers.
  - **Live Integration into `GET /api/sovereign-live/:iso3` & `POST /api/council/phase1-and-cascade`**:
    - When `GET /api/sovereign-live/:iso3` runs, any enabled custom `macro_rest` connectors with `telemetryMappings` are queried in parallel; resolved numeric values override or enrich the sovereign telemetry snapshot and append provenance source citations.
    - When `POST /api/council/phase1-and-cascade` runs, any enabled connectors marked `injectIntoCouncilPrompt: true` provide a structured JSON snippet to the 9 sub-agents so internal host telemetry directly informs the Council debate.

---

## 3. Frontend GUI Enhancements

### A. 4th Tab in `SelfHostAndOllamaRuntimeModal` (`/src/components/TurnkeyCommandAndIntegrityModals.tsx`)
- Expand the modal navigation to include **`4. External & Internal API / Host GUI`**:
  - **Connector Directory & Filter Bar**:
    - Filter by `All`, `Macro & Data Feeds`, `Internal/External LLM Hosts`, and `Webhook & Alert Buses`, plus a `+ New API / Host Connector` button.
  - **Interactive Connector Editor**:
    - Edit connector Name, Category (`Macro REST`, `LLM Gateway`, `Webhook Bus`), Network Scope (`External Public API` vs. `Internal Host / Docker LAN`), HTTP Method (`GET`/`POST`), Endpoint URL (with `{{ISO3}}` support), Timeout (ms), Custom HTTP Headers (key-value builder), and toggles for **Active** and **Inject into 9-Agent Council Context**.
  - **Live Ping Tester & JSON Inspector**:
    - 1-click **Ping & Inspect Live JSON** button with sample ISO3 selector (`USA`, `DEU`, `JPN`, `BRA`, `IND`, etc.).
    - Displays HTTP Status code, round-trip latency (`tabular-nums` in ms), resolved URL, and an interactive JSON payload viewer.
  - **Visual JSON Dot-Path to Telemetry Mapper**:
    - For `Macro REST` connectors, provides a clean mapping grid linking Sovereign Telemetry fields (`GDP Growth %`, `CPI Inflation %`, `Debt-to-GDP %`, `5Y CDS Spread bps`, `FX Reserves Months`, `Policy Rate %`) to JSON dot-paths (e.g., `1.0.value` or `data.metrics.gdpGrowth`), showing the live extracted value next to each field upon ping.
    - Includes a **Apply Mapped Values to Current Sovereign** button for instant testing on the active dashboard.

---

## 4. Documentation & In-App Manual Updates

### A. Synchronized Markdown Files (`/README.md`, `/SOVEREIGN_COUNCIL_MANUAL.md`, `/docs/USER_MANUAL.md`)
- Add a comprehensive **GUI Configuration Studio & External/Internal API Host Integration** section covering:
  1. **Tab 1 — Global Models & Parameters GUI**: Switching between Cloud Gemini, Local Ollama, and Internal vLLM/OpenAI-compatible hosts; tuning temperature, context window (`num_ctx`), and debate rounds.
  2. **Tab 2 — Per-Desk & 12-Agent GUI Matrix**: Assigning distinct local/cloud models (`qwen2.5:14b`, `deepseek-r1:14b`, `llama3.2:3b`, etc.) and custom system prompt directives to individual agents (`AG-1` through `AG-9`) and Supreme Council referees.
  3. **Tab 3 — Docker & OS Self-Host GUI Builder**: Generating `.env` files and one-line launch scripts for macOS Apple Silicon and Windows (NVIDIA GPU / CPU) using either Host Native Ollama (`host.docker.internal:11434`) or Bundled Docker Compose (`--profile local-ai`).
  4. **Tab 4 — External & Internal API / Host Connector Hub**: Connecting internal enterprise hosts, custom REST macro feeds, LLM gateways, and outbound risk webhooks; using the Live Ping Tester, JSON Inspector, and Dot-Path Telemetry Mapper.

---

## 5. Verification & Git Readiness
1. Run `lint_applet` (`tsc --noEmit`) and `compile_applet` (`vite build`) to verify zero TypeScript or bundle errors.
2. Verify `/api/connectors/ping-and-inspect`, `/api/ai/runtime-config-save`, and `/api/docs/manual-and-readme` against the live Express server.
3. Stage and commit all updated code and documentation files to the local Git repository so the workspace remains clean and ready for GitHub Sync.
