# Top-Level External Application Integration Plan (`SMCR-1.0` Desk Output Bus)

## 1. Overview & Architectural Goal
Enable downstream applications, risk engines, portfolio management systems (PMS/OMS), and internal enterprise services to consume real-time and on-demand outputs from the **Sovereign & Macro Council Orchestrator** at any granularity:
- **Individual Desk Outputs** (`Geopolitical Desk`, `Sovereign Credit Desk`, `Macro & FX Desk`)
- **9 Specialized Sub-Agent Reports** (Agents 1–9 structured JSON theses, risk scores, and quantitative anchors)
- **Quantitative Suites** (BVAR/Taylor Rule, Chokepoints/Sanctions, Global Liquidity Z-Score, Restructuring NPV, Half-Kelly LOB sizing, and XCCY Basis)
- **Full `SMCR-1.0` Bundle** (All 3 Desks + CRO Gate + 3-Referee Supreme Council Synthesis)

---

## 2. Backend Integration Endpoints (`server.ts`)

### A. REST Pull API (`/api/v1/integration/*`)
1. **`GET /api/v1/integration/desks/:iso3`**
   - **Query Parameters**:
     - `desk` (optional): `'all' | 'geopolitical' | 'sovereign' | 'macro'` (defaults to `'all'`)
     - `includeSubAgents` (optional): `'true' | 'false'` (defaults to `'true'`)
     - `includeQuant` (optional): `'true' | 'false'` (defaults to `'true'`)
   - **Response**: Standardized `SMCR-1.0` JSON envelope containing the requested desk's adversarial debate synthesis (`consensusScore`, `confidence`, `keyDrivers`, `round1ProposerThesis`, `round1ChallengerCounter`, `round2ProposerRebuttal`, `round2Synthesis`, `dissentingSummary`), its 3 assigned sub-agent reports, and its dedicated quantitative engine output.
2. **`GET /api/v1/integration/bundle/:iso3`**
   - Returns the complete top-level `SMCR-1.0` institutional payload combining:
     - `metadata` (`schemaVersion: "SMCR-1.0"`, `iso3`, `countryName`, `reportId`, `generatedAt`, `hmacSha256`)
     - `desks` (`geopolitical`, `sovereign`, `macro` — each with sub-agents, debate synthesis, and desk quant metrics)
     - `croGate` (`geopoliticalRiskScore`, `sovereignRiskScore`, `macroRiskScore`, `compositeScore`, `isLocked`, `overrideJustification`)
     - `supremeCouncil` (3-Referee synthesis, `convictionScore`, `executiveSummary`, `geopoliticalDirectives`, `sovereignCreditDirectives`, `macroTradePositioning`, and `executionSizing` via Half-Kelly LOB)
     - `quantSuites` (Full outputs from Hubs 1–7)
3. **`GET /api/v1/integration/openapi.json`**
   - Serves a machine-readable **OpenAPI 3.1.0 Specification** documenting all `/api/v1/integration/*` and `/api/council/*` endpoints, request parameters, authentication headers (`X-SMCR-API-Key`), and response schemas so external teams can auto-generate TypeScript, Python, Go, or Java clients.

### B. Outbound Push Webhook Dispatcher & Test Broadcaster
1. **`POST /api/v1/integration/publish`**
   - Accepts `{ iso3, scope: 'all_desks_bundle' | 'geopolitical_desk' | 'sovereign_desk' | 'macro_desk' | 'supreme_council', runSnapshot? }`.
   - Builds the corresponding `SMCR-1.0` desk or bundle payload, signs it using **HMAC-SHA256** (`X-SMCR-Signature-256: sha256=...`, `X-SMCR-Event`, `X-SMCR-Delivery-Id`, `X-SMCR-ISO3`), and dispatches it in parallel to all enabled `webhook_bus` connectors configured in the GUI.
   - Also triggers automatically at the end of `POST /api/council/phase1-and-cascade` and `POST /api/council/supreme-synthesis` when `autoBroadcastOnRun` is enabled.
2. **`GET /api/v1/integration/deliveries`**
   - Returns the in-memory ring buffer (up to 50 recent dispatches) of outbound webhook deliveries and SSE broadcasts with `deliveryId`, `timestamp`, `iso3`, `scope`, `targetUrl`, `statusCode`, `latencyMs`, `hmacSigned`, and `responsePreview`.

### C. Real-Time Server-Sent Events (SSE) Stream
1. **`GET /api/v1/integration/stream`**
   - Establishes a persistent `text/event-stream` connection (`Cache-Control: no-cache`, `Connection: keep-alive`).
   - Emits initial `connected` handshake event and broadcasts live events (`desk.output.ready`, `cro.override.updated`, `supreme.synthesis.ready`, `manual.broadcast`) whenever desk outputs are generated or broadcast from the GUI.

### D. Optional API Key & HMAC Security Middleware
- Configurable via GUI (`integrationSecurity` in `AIRuntimeConfig`):
  - `requireApiKey`: boolean (default `false` for zero-friction local dev; when `true`, validates `X-SMCR-API-Key` or `Authorization: Bearer <key>` on `/api/v1/integration/*`).
  - `apiKey`: customizable token string (e.g., `smcr_live_9f8a7b6c5d4e3f2a1b`).
  - `webhookHmacSecret`: customizable secret used to compute `X-SMCR-Signature-256` on all outbound webhook dispatches.
  - `autoBroadcastOnRun`: boolean (default `true`) to automatically push desk outputs to registered webhooks & SSE listeners whenever a council run completes.

---

## 3. Frontend GUI Enhancements

### A. Tab 5 in `AI / APIs / Docker` Configuration Studio (`src/components/TurnkeyCommandAndIntegrityModals.tsx`)
- Add **`5. Top-Level Integration Hub (Desks, Webhooks, SSE & OpenAPI)`** to `SelfHostAndOllamaRuntimeModal`:
  1. **Outbound Desk Broadcaster Bar**:
     - Select target payload scope (`Full SMCR-1.0 Bundle`, `Geopolitical Desk Only`, `Sovereign Credit Desk Only`, `Macro & FX Desk Only`, `Supreme Council Verdict`).
     - **`Broadcast Active Desk Outputs Now`** button that pushes the active sovereign's live `CouncilAssessmentRun` to all enabled `webhook_bus` endpoints and active SSE stream subscribers.
  2. **API Key, HMAC Signing & Auto-Broadcast Controls**:
     - Toggle `Auto-Broadcast on Council Completion`.
     - Toggle `Enforce X-SMCR-API-Key on Pull/SSE Endpoints`.
     - Edit/regenerate `Inbound API Key` and `Outbound Webhook HMAC-SHA256 Secret`.
  3. **Live Outbound Webhook & SSE Delivery Log**:
     - Real-time table displaying recent dispatches (`Delivery ID`, `ISO3`, `Desk Scope`, `Target Endpoint`, `HTTP Status`, `Latency ms`, `Signature`).
  4. **Downstream Consumer Quickstart & OpenAPI 3.1 Viewer**:
     - Interactive code tabs (`cURL`, `Python`, `TypeScript / EventSource SSE`) pre-filled with the active sovereign (`iso3`) and configured API key.
     - **`Download OpenAPI 3.1 Spec (openapi.json)`** button.

### B. Full-Sweep Health Check & Documentation (`README.md` & `docs/USER_MANUAL.md`)
- Add `SWEEP-INT-09` (`Top-Level Desk Integration Bus: REST + Webhooks + SSE + OpenAPI 3.1`) to `/api/health/full-sweep`.
- Update `README.md` and `docs/USER_MANUAL.md` with a dedicated **Downstream Application Integration (`SMCR-1.0` Pull REST, Push Webhooks & SSE Stream)** section so the in-app **Manual & Docs** viewer reflects all integration schemas and endpoints.
