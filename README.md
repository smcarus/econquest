# Sovereign Council Orchestrator (EconQuest Institutional Terminal)

> **Multi-Agent Sovereign Debt, Macro-Fiscal, Geopolitical Risk & Relative-Value Trading Terminal**  
> Built around **3 Primary Activity Pillars**, **10 Analytical Domain Hubs (40 Quantitative Workbenches)**, a **9-Agent Adversarial Council with Human-in-the-Loop CRO Governance**, **Real-Time Multilateral API Provenance**, and **Standardized SMCR-1.0 Institutional Report Exports**.

[![Standard](https://img.shields.io/badge/Report_Schema-SMCR--1.0-2563eb)](#4-how-to-export-smcr-10-compliant-reports)
[![Architecture](https://img.shields.io/badge/Council_Architecture-9_Sub--Agents_%2B_CRO_Gate-059669)](#2-workflow-for-the-9-agent-adversarial-council)
[![Navigation](https://img.shields.io/badge/Workspace-3_Activity_Pillars_%7C_10_Analytical_Hubs-4f46e5)](#1-breakdown-of-the-10-analytical-hubs--3-activity-pillars)

---

## 📖 Documentation Index

- **Root Overview & Quick Reference**: [`README.md`](./README.md) *(this file)*
- **Complete Institutional User Manual**: [`docs/USER_MANUAL.md`](./docs/USER_MANUAL.md) *(deep-dive operational manual covering all 40 modules, econometric equations, CSV backtesting schemas, persona workflows, and SMCR-1.0 compliance)*

---

## ⚡ Quick Start & Local Installation

### Prerequisites
- **Node.js** `>= 20.x` (or **Bun** `>= 1.1.x`)
- Optional: `GEMINI_API_KEY` in `.env` for live AI Council Phase 1–3 synthesis and MPC/IMF Article IV Document AI parsing (deterministic econometric engines and multilateral open-data APIs run out-of-the-box).
- Optional: `FRED_API_KEY` in `.env` (free from fred.stlouisfed.org) to fetch official OECD 10-year yields through the FRED API. Without it the app uses FRED's public CSV download for the same figures.
- Optional: `EVDS_API_KEY` and `EVDS_TR10Y_SERIES` in `.env` for Turkey's official 10-year yield from the central bank's EVDS service (free key from evds3.tcmb.gov.tr; the series code is the one EVDS shows for the bond yield you want, starting with `TP.`). Without both, Turkey's yield is shown as a sample value.

### Installation & Startup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for AI synthesis)
cp .env.example .env

# 3. Launch full-stack Express + Vite development server on port 3000
npm run dev

# 4. Type-check, run the tests & build production bundle
npm run lint
npm test
npm run build
```

Every pull request runs the same three checks on GitHub (`.github/workflows/ci.yml`). Tests live in `tests/` and use Node's built-in test runner, so there is nothing extra to install. `tests/server.test.ts` starts the real server with the network replaced by fixtures (`tests/helpers/offline-fetch.mjs`), so the data endpoints are checked without touching the internet.

---

## 🏛️ Terminal Organization: 3 Primary Activity Pillars & 1–2 Screen Scroll Budget

To maximize usability and eliminate endless vertical scrolling, the terminal is organized into **3 Primary Activity Pillars** in the top navigation bar and enforces a **1–2 Screen Maximum Scroll Budget** on every desk via **Page 1 (Primary Workbench & Controls)** and **Page 2 (Deep-Dive Matrix & Diagnostics)** pagination:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       SOVEREIGN COUNCIL ORCHESTRATOR TERMINAL                          │
├───────────────────────────┬────────────────────────────┬───────────────────────────────┤
│   1. MARKET & TRADING     │    2. POLICY RESEARCH      │  3. MACROECONOMIC RESEARCH    │
│   (Blue Pillar)           │    (Emerald Pillar)        │  (Indigo Pillar)              │
├───────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ • Curve, CDS & Execution  │ • Monetary, Treasury &     │ • Global Macro Overview,      │
│ • Portfolio & Stress      │   Ratings Policy           │   DSA & Liquidity             │
│   Testing                 │ • Debt Restructuring &     │ • Econometrics & FX           │
│ • Signals, Arbitrage &    │   Climate Transition       │   Valuation                   │
│   Catalysts               │ • Policy Document AI,      │ • Geopolitics, Chokepoints    │
│                           │   Council & Governance     │   & Crisis Replay             │
└───────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

### Consolidated Top Status Bar & Slide-Over Drawers
Below the navigation bar, a compact **1-line Sovereign Status Bar** displays live Debt/GDP, 5Y CDS, 10Y Yield, FX Reserves, Policy Rate, and Composite Risk Score alongside three on-demand slide-over drawers:
1. **Morning Alpha Radar**: Top-3 daily cross-sovereign dislocations and 7-day forward MPC/CPI event volatility catalysts.
2. **Executive BLUF Scorecard**: Bottom-Line-Up-Front investment thesis, 3-desk risk breakdown, and 1-click module routing.
3. **Desk Guide & Glossary**: Plain-English module explanation, inputs/outputs guide, and interactive **Simple Brief / Pro Quant** density toggle.

---

## 1. Breakdown of the 10 Analytical Hubs (& 3 Activity Pillars)

The terminal's **40 quantitative and qualitative modules** are structured across **10 Analytical Domain Hubs**, mapped directly into the **3 Primary Activity Pillars**:

| Hub # | Analytical Hub Name | Primary Activity Pillar(s) | Core Quantitative & Policy Capabilities |
| :--- | :--- | :--- | :--- |
| **Hub 1** | **Overview, Maps & Charts** | `3. Macroeconomic Research` / `1. Market & Trading` | Interactive global maritime chokepoint & GDELT map (`charts_watchlists`), 2×2 sovereign horizon charts, debt maturity wall, and cross-sovereign Peer Relative-Value Z-Score Matrix (`risk_analytics`). |
| **Hub 2** | **Macro & Econometrics** | `3. Macroeconomic Research` / `1. Market & Trading` | Monte Carlo Debt Sustainability Analysis (DSA) fan charts & $r - g$ dynamics (`forecasting_lab`), G4 Central Bank Global Liquidity & XCCY Basis swaps (`global_liquidity`), and Limit Order Book Depth & Dealer Gamma (`market_maker_alpha`). |
| **Hub 3** | **Geopolitics & Supply Chains** | `3. Macroeconomic Research` | 5-factor Geopolitical Wargaming simulator, game-theory escalation tree & sanctions custody freeze (`geopolitical_desk`), and Chokepoint Supply-Chain Matrix (`supply_chain_matrix`). |
| **Hub 4** | **Portfolio & Council Governance** | `1. Market & Trading` / `2. Policy Research` / `3. Macroeconomic Research` | Multi-sovereign Contagion & Cornish-Fisher $\text{CVaR}_{99}$ (`portfolio_risk_desk`), Historical Crisis Replay 1997–2022 (`backtest_engine`), 9-Agent Adversarial Council (`council_debates`), CRO Gate & SMCR-1.0 Exporter (`cro_reports`), and Policy Document & CSV Lab (`policy_doc_lab`). |
| **Hub 5** | **Institutional Quant Desk** | `1. Market & Trading` / `2. Policy Research` / `3. Macroeconomic Research` | 9 specialized quant workbenches: ISDA CDS Hazard Rate & Basis Arbitrage (`quant_cds_basis`), Sovereign LGD & Haircut NPV (`quant_restructuring_npv`), In-Browser Matrix OLS with Newey-West HAC (`quant_matrix_econometrics`), Multi-Leg RV Trade Blotter & DV01/CS01 (`quant_trade_blotter`), Macro Surprise Z-Score & Bayesian Update (`quant_macro_surprise`), PCA Alpha & Correlation Matrix (`quant_alpha_correlation`), 6-Factor Nelson-Siegel-Svensson Curve & Carry+Roll (`quant_nss_yield_curve`), 90D Macro & MPC Catalyst Vol Calendar (`quant_macro_catalyst_calendar`), and Batch Portfolio Stress-Test & Scenario Lab (`quant_portfolio_stress_lab`). |
| **Hub 6** | **Portfolio, DMO & Doc AI** | `1. Market & Trading` / `2. Policy Research` | EMBI Global Diversified Portfolio & Beta-Neutral Pair-Trade Book (`embi_portfolio_pair_book`), 24-Month Treasury DMO Auction & Rollover Simulator (`dmo_treasury_auction_sim`), and Hybrid AI + Econometric MPC/IMF Article IV Document Parser (`mpc_imf_document_ai`). |
| **Hub 7** | **Decision Command Center** | `1. Market & Trading` / `2. Policy Research` / `3. Macroeconomic Research` | Model vs. Market Default Probability Dislocation Screener (`decision_dislocation_screener`), Klein Pre-Mortem & 5-Domain Kill-Switch Tripwires (`decision_premortem_killswitch`), Persistent Decision Ledger & Brier Skill Audit (`decision_ledger_brier`), 4-Quadrant Macro Regime Stress Matrix (`decision_quadrant_stress`), and Live Polymarket Gamma & Kalshi v2 Event Arbitrage (`decision_prediction_markets`). |
| **Hub 8** | **Sovereign Ratings, FX & IC Dossier** | `2. Policy Research` / `3. Macroeconomic Research` | S&P/Moody's/Fitch 5-Pillar Shadow Rating Replica & BBB-/BB+ Fallen-Angel Cliff (`ratings_shadow_fallen_angel`), Behavioral (BEER) & IMF Fundamental (FEER) REER FX Valuation Lab (`fx_beer_feer_equilibrium`), IMF SDIB Investor Base & Bank-Sovereign Doom-Loop (`debt_investor_base_doom_loop`), and Boardroom IC Pitchbook Exporter (`ic_pitchbook_dossier_exporter`). |
| **Hub 9** | **Restructuring, Monetary & Geo-Risk** | `2. Policy Research` / `3. Macroeconomic Research` | IMF/Paris Club Comparability of Treatment & ICMA CAC Eurobond Waterfall (`restructuring_npv_cac_waterfall`), Open-Economy Augmented Taylor Rule & Fiscal Dominance (`taylor_rule_fiscal_dominance`), FX/Gold Reserve Custody Freeze & Maritime Chokepoints (`geopolitical_reserves_chokepoints`), and NGFS Climate Transition Stress & SLB Greenium (`ngfs_climate_slb_greenium`). |
| **Hub 10** | **Persona Playbooks & Signal Hub** | `1. Market & Trading` / `2. Policy Research` / `3. Macroeconomic Research` | Automated 9-Engine Cross-Hub Top Alpha Signal Scanner (`persona_cross_hub_signal_scanner`), Guided Persona Playbook Checklists (`persona_guided_playbook_cockpit`), Systematic Strategy Backtester Lab 2022–2025 (`persona_strategy_backtester_lab`), and Academic LaTeX Booktabs & Empirical CSV Exporter (`persona_academic_latex_csv_exporter`). |

> 📌 **Tip**: Press `⌘K` (macOS) or `Ctrl+K` (Windows/Linux) from anywhere in the terminal to open the **Global Command Palette** and jump instantaneously to any of the 40 modules, switch sovereigns, or trigger audits.

---

## 2. Workflow for the 9-Agent Adversarial Council

The **Sovereign Council Orchestrator** executes a 3-Phase hierarchical multi-agent pipeline with an explicit **Human-in-the-Loop (HITL) Chief Risk Officer (CRO) Gate**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: 3 DOMAIN DESKS × 3 SPECIALIZED SUB-AGENTS (9 AGENTS + DEBATES)      │
├────────────────────────┬─────────────────────────┬───────────────────────────┤
│  GEOPOLITICAL DESK     │   SOVEREIGN DEBT DESK   │    MACRO-FISCAL DESK      │
│ • Sanctions & Custody  │ • Maturity Wall & Roll  │ • Central Bank & Taylor   │
│ • Chokepoint & Trade   │ • Creditor Seniority    │ • Primary Balance & DSA   │
│ • Regime Stability     │ • CDS vs Cash Basis     │ • FX Reserves & Balance   │
│         ▼              │           ▼             │            ▼              │
│ [Adversarial Debate]   │  [Adversarial Debate]   │   [Adversarial Debate]    │
│ Thesis vs Devil's Adv. │  Thesis vs Devil's Adv. │   Thesis vs Devil's Adv.  │
└───────────┬────────────┴────────────┬────────────┴─────────────┬─────────────┘
            └─────────────────────────┼──────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CROSS-DESK DEPENDENCY CASCADE                                       │
│ Propagates Geopolitical shocks ──► Sovereign Spreads ──► Macro-Fiscal DSA    │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ HUMAN-IN-THE-LOOP (HITL) CHIEF RISK OFFICER (CRO) CHECKPOINT                 │
│ Pause & Override: Energy Shock %, Spread Shock (bps), FX Reserve Cover (m),  │
│ Political Will Index (0-100), Desk Risk Scores, and CRO Governance Notes     │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: SUPREME COUNCIL DEEP-THINK SYNTHESIS & SMCR-1.0 DOSSIER             │
│ Generates Composite Risk Score, Early Warning Status, Actionable Trade       │
│ Recommendations, and Standardized SMCR-1.0 PDF / Markdown / JSON / Python    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Council Execution
1. **Select Sovereign & Scenario Directive**: Choose a sovereign from the secondary bar (e.g., `BRA`, `EGY`, `TUR`, `ZAF`, `ARG`, `JPN`, `GBR`, `USA`, or onboard any custom ISO-3 via `+ ISO-3`). Optionally expand `Scenario Directive ▾` to enter a custom stress query or upload an IMF Article IV / MPC policy document in **Policy Document & CSV Lab** (`2. Policy Research` → `Document & CSV Lab`).
2. **Execute Phase 1 & Phase 2 (`Run Council`)**: Click the blue **Run Council** button in the top-right header.
   - **Phase 1**: All 9 specialized sub-agents analyze live multilateral telemetry (`IMF WEO`, `World Bank WDI v2`, `BIS`, `GDELT`, `Spot FX`, `5Y CDS`), followed by structured **Thesis vs. Devil's Advocate** debates inside each of the 3 desks.
   - **Phase 2**: The **Cross-Desk Dependency Cascade** quantifies spillover channels (e.g., how a Red Sea maritime blockade widens sovereign 5Y CDS and erodes primary fiscal balances).
3. **Review & Override at the CRO Gate**: The pipeline pauses automatically at `AWAITING_CRO_APPROVAL` and opens **CRO Gate & SMCR-1.0 Dossier** (`cro_reports`). Adjust any of the counterfactual sliders:
   - *Energy / Commodity Inflation Shock (%)*
   - *Sovereign Debt Servicing Spread Shock (bps)*
   - *FX Reserve Adequacy Override (months of imports)*
   - *Political Will & Reform Credibility Index (0–100)*
   - *Geopolitical, Sovereign & Macro Desk Risk Scores (0.00–1.00)*
4. **Convene Supreme Council (Phase 3)**: Click **Approve Assumptions & Convene Supreme Council** to synthesize the final institutional verdict and unlock all SMCR-1.0 report exports.

---

## 3. Instructions for the CSV Backtesting Engine & Persona-Switching

### A. CSV Ingestion, Auto-Mapping & Crisis Backtesting Engine

The terminal provides three complementary historical & custom backtesting workflows:

#### 1. Uploading & Mapping Custom CSV Time Series (`2. Policy Research` → `Document & CSV Lab`)
1. Navigate to **2. Policy Research** → **Policy Document AI, Council & Governance** → **Document & CSV Lab** (`policy_doc_lab`).
2. Click **Download Blank CSV Template** to get a pre-formatted 13-column sovereign macro-market CSV template, or click **Upload Custom CSV / TSV** (or select one of the built-in presets for Brazil, Egypt, Turkey, Argentina, or UK Gilt LDI).
3. **Auto-Detection & Column Mapping**: The engine automatically maps columns with confidence badges (`HIGH`, `MEDIUM`, `UNMAPPED`) across 13 canonical sovereign fields:
   - `observationDate` (`YYYY-MM` or `YYYY-MM-DD`)
   - `iso3` (3-letter ISO country code)
   - `cds5YSpreadBps` (5Y Sovereign CDS in bps)
   - `sovereign10YBondYieldPct` (10Y Benchmark Yield %)
   - `sovereign2YBondYieldPct` (2Y Benchmark Yield %)
   - `policyRatePct` (Central Bank Policy Rate %)
   - `debtToGdpPct` (Gross Government Debt % GDP)
   - `primaryFiscalBalancePct` (Primary Fiscal Balance % GDP)
   - `fxReservesMonthsImport` (FX Reserves in months of imports)
   - `imfAraRatioPct` (IMF Reserve Adequacy Ratio %)
   - `inflationCpiYoYPct` (Headline CPI Inflation % YoY)
   - `realGdpGrowthPct` (Real GDP Growth % YoY)
   - `fxSpotRatePerUsd` (Spot Exchange Rate per USD)
4. **Unit Multipliers & Missing-Value Imputation**: Adjust column multipliers (`1x`, `100x (% → bps)`, `0.01x (bps → %)`) if needed. Missing cells are automatically interpolated and winsorized.
5. **Two Execution Paths**:
   - Click **Apply Selected Row to Live Sovereign Desk** to hydrate the entire terminal (all 40 modules) with a specific historical observation row.
   - Click **Synthesize & Open in Crisis Backtest Engine** to compile the full multi-period CSV trajectory into a playable **Historical Crisis Episode** with automated Early Warning Signal (EWS) lead-time detection and AUROC validation.

#### 2. Historical Crisis Replay & AUROC Validation (`3. Macroeconomic Research` → `Historical Crisis Replay`)
- Navigate to **3. Macroeconomic Research** → **Geopolitics, Chokepoints & Crisis Replay** → **Historical Crisis Replay** (`backtest_engine`).
- Replay 5 landmark sovereign crises (**1997 Asian Financial Crisis**, **1998 Russia GKO Default**, **2001 Argentina Convertibility Collapse**, **2011 Eurozone Periphery Debt Crisis**, **2022 UK Gilt LDI Crisis**) plus any custom CSV-synthesized episodes.
- Scrub through the month-by-month timeline ($T-12$ to $T+6$), inspect when the Council's composite risk score crossed the `0.65` Early Warning threshold prior to peak spread dislocation, review the **Receiver Operating Characteristic (AUROC)** curve, and click **Apply Historical Crisis Shocks to Live Sovereign Desk** to stress-test the active sovereign against that historical regime.

#### 3. Systematic Strategy Backtester Lab (`1. Market & Trading` → `Strategy Backtester`)
- Navigate to **1. Market & Trading** → **Signals, Arbitrage & Catalysts** → **Strategy Backtester** (`persona_strategy_backtester_lab`) to backtest 4 systematic sovereign strategies across 2022–2025 regimes with Sharpe ratio, maximum drawdown, hit rate, and cumulative bps attribution.

---

### B. 3-Persona Lens Switching (In-Place Adaptive Workflow)

The top header features an in-place **3-Persona Switcher** (`Trader` | `Institution` | `Researcher`):

| Persona Button | Internal ID | Target User Profile | How the Terminal Adapts In-Place |
| :--- | :--- | :--- | :--- |
| **Trader** | `INDIVIDUAL_TRADER` | Sovereign CDS, FX & Eurobond Relative-Value Traders | Prioritizes **5Y CDS vs. Cash Basis Arbitrage**, **NSS Carry + Roll-Down (bps)**, **Polymarket/Kalshi Event Arbitrage**, **DV01/CS01 Trade Blotter**, and short-horizon catalyst volatility in the Desk Guide, Signal Scanner, and Playbook Cockpit. |
| **Institution** | `INSTITUTIONAL_PM_IC` | Emerging Market Debt Portfolio Managers, Risk Officers & Investment Committees | Prioritizes **EMBI Global Diversified Benchmark Weights**, **Batch Portfolio Stress-Test & Scenario Lab**, **Cornish-Fisher $\text{CVaR}_{99}$ & MCTR**, **Shadow Credit Rating Fallen-Angel Cliffs**, and **Boardroom IC Pitchbook / SMCR-1.0 Dossiers**. |
| **Researcher** | `POLICY_RESEARCHER` | Central Bank Economists, IMF/Treasury Desk Analysts & Academic Researchers | Prioritizes **Augmented Taylor Rules & Fiscal Dominance**, **Stochastic DSA Fan Charts ($r - g$)**, **In-Browser Matrix OLS with Newey-West HAC Standard Errors**, **IMF/Paris Club CAC Restructuring Waterfalls**, and **LaTeX Booktabs / BibTeX / Empirical CSV Exports**. |

- **In-Place Switching**: Clicking `Trader`, `Institution`, or `Researcher` in the top header updates the active persona lens **in-place without navigating away from your current workbench**, immediately updating the **Desk Guide & Glossary** drawer, **Top Alpha Signal Scanner**, and **Guided Playbooks**.

---

## 4. How to Export SMCR-1.0 Compliant Reports

The terminal implements the **Standardized Multi-Agent Council Report (`SMCR-1.0`)** institutional specification. You can export reports from two locations:

### Method A: 1-Click Header PDF Export
- Click the **PDF** button (`Export Standardized SMCR-1.0 PDF Dossier`) in the top-right header at any time to generate and download a multi-page, typeset PDF dossier (`SMCR-1.0_<ISO3>_<ReportID>.pdf`) for the active sovereign.

### Method B: Full Multi-Format Export Suite (`2. Policy Research` → `CRO Gate & Dossier`)
Navigate to **2. Policy Research** → **Policy Document AI, Council & Governance** → **CRO Gate & Dossier** (`cro_reports`) and scroll to the **SMCR-1.0 Institutional Report & Code Exporter** card (Page 2 of the desk) to access 4 standardized formats plus live webhook dispatch:

1. **Executive PDF Dossier (`Export SMCR-1.0 PDF Dossier`)**:
   - Multi-page vector PDF featuring the Sovereign Header, Executive BLUF Verdict, 3-Desk Risk Scorecard, 9-Agent Adversarial Debate Transcripts, Cross-Desk Dependency Cascade, CRO Override Audit Trail, and Actionable Trade/Policy Recommendations.
2. **YAML-Frontmatter Markdown Specification (`.md`)**:
   - Machine- and human-readable Markdown document with strict `SMCR-1.0` YAML frontmatter (`schema_version`, `report_id`, `iso3`, `composite_risk_score`, `early_warning_status`, `cro_verified`, `quantitative_anchors`).
3. **Canonical JSON Schema Envelope (`.json`)**:
   - Strictly typed JSON payload (`buildCanonicalSMCREnvelope`) ready for ingestion into institutional risk warehouses, Snowflake/BigQuery pipelines, or automated compliance archives.
4. **TradingAgents Python SDK Script (`.py`)**:
   - Self-contained, executable Python script replicating the active sovereign's Council configuration, CRO shock overrides, and either Gemini API (`google-genai`) or local Ollama (`qwen2.5:32b` / `deepseek-r1:32b`) runtime calls.
5. **Institutional Webhook Dispatch**:
   - Enter any REST endpoint URL in the **Institutional Webhook Dispatch** box and click **Dispatch SMCR-1.0 JSON** to `POST` the signed `SMCR-1.0` JSON envelope directly to your downstream risk server.

---

## 5. Real-Time Data Provenance & Interactive Statistical Glossary

- **Live API Provenance Badge Overlays**: Every chart and table across all 40 modules is automatically instrumented with a clickable **`API PROVENANCE`** / **`PROVENANCE`** badge overlay. Clicking any badge opens the **Real-Time Data Provenance & API Handshake Ledger**, displaying:
  - Last successful API handshake timestamp (UTC, local time, and age), HTTP status, and RTT latency (ms).
  - Primary institutional source authority (`IMF DataMapper WEO v1`, `World Bank WDI v2`, `BIS Statistics`, `NY Fed Markets API`, `Polymarket Gamma`, `GDELT 2.0`) and exact REST Endpoint URI with a 1-click `cURL` copy and **Re-Handshake Endpoint Now** button.
  - Field-level JSON path mappings (`$.values.GGXWDG_NGDP...`) and live values.
- **Interactive Statistical Reference Tooltips**: Hovering over (or clicking to pin) any dotted-underlined statistical badge or table header (`VaR₉₅`, `CVaR₉₉`, `DV01`, `CS01`, `MCTR`, `Z-Spread`, `NSS`, `BEER`, `FEER`, `Bohn Test`, `ARA`, `HHI`, `Brier Score`, `AUROC`) opens a mathematical popover containing the formal equation, variable-by-variable glossary, interpretation thresholds, and institutional source citation.

---

## 6. Self-Hosting with Docker (macOS & Windows), Local Ollama Models & 5-Tab GUI Configuration Studio

**EconQuest** is 100% self-hostable via Docker and Docker Compose on both **macOS (Apple Silicon M1/M2/M3/M4 & Intel)** and **Windows 10/11 (WSL2 + NVIDIA GPU or CPU)**, and includes a built-in **5-Tab Interactive GUI Configuration Studio** accessible from the **`AI / APIs / Docker`** button in the top command bar.

### A. The 5-Tab In-App GUI Configuration Studio (`AI / APIs / Docker` Button)
Click **`AI / APIs / Docker`** in the top header to configure models, agent prompts, Docker launchers, external/internal API hosts, and top-level application integrations without editing code or configuration files manually:

1. **Tab 1 — Global Models & Parameters GUI**:
   - Switch between **Local Ollama Only**, **Hybrid Failover (Local Ollama → Cloud Gemini)**, **Cloud Google Gemini**, or **vLLM / LM Studio (`openai_compatible`)**.
   - Select or enter custom local endpoints (`http://localhost:11434`, `http://host.docker.internal:11434`, `http://ollama:11434`, or any internal LAN IP) and tune **Temperature**, **Context Window (`num_ctx`)**, **Request Timeout**, and **Devil's Advocate Debate Rounds**.
2. **Tab 2 — Per-Desk & 12-Agent GUI Matrix**:
   - Assign distinct local Ollama or OpenAI-compatible model tags (`qwen2.5:7b`, `qwen2.5:14b`, `llama3.1:8b`, `deepseek-r1:8b`, `deepseek-r1:32b`, `qwq:32b`) and custom system prompt directives to any of the **4 Desks** or individual **Specialist Sub-Agents (`AG-1` through `AG-9`)**.
   - Trigger 1-click **`Pull`** (`POST /api/ai/ollama-pull`) and **`Test`** (`POST /api/ai/ollama-test`) micro-benchmarks per agent.
   - You can also configure each sub-agent inline inside **Hub 4 → 9-Agent Council & Devil's Advocate Debates** (`council_debates`).
3. **Tab 3 — Docker & OS Self-Host GUI Builder**:
   - Select your **Target Host OS** (`macOS Apple Silicon`, `macOS Intel`, `Windows WSL2 NVIDIA GPU`, `Windows CPU`, `Linux`), **Docker ↔ Ollama Topology** (`host.docker.internal` vs. bundled container), ports, container name, `OLLAMA_KEEP_ALIVE`, and `OLLAMA_ORIGINS`.
   - Automatically generates and downloads a tailored `.env` file and copy-paste one-line launch commands.
4. **Tab 4 — External & Internal API / Host GUI Connector Hub**:
   - Register, enable, and manage three classes of external and internal network hosts:
     - **Macro & Market REST Feeds** (`World Bank Open Data v2`, `IMF DataMapper WEO v1`, or custom internal risk data lakes such as `http://host.docker.internal:8080/api/v1/sovereign/{{ISO3}}`).
     - **Internal / External LLM Gateways** (custom Ollama, vLLM, TGI, or LiteLLM proxy endpoints).
     - **Outbound Webhook & Enterprise Event Buses** (`SMCR-1.0` JSON verdict dispatch to internal risk buses, Slack, Teams, or Discord).
   - **Live Server-Proxied Ping Tester & JSON Inspector**: Click **Ping & Inspect Live JSON** (`POST /api/connectors/ping-and-inspect`) with any sample ISO-3 code to inspect HTTP status, round-trip latency (ms), and formatted JSON payloads via the backend proxy.
   - **Visual JSON Dot-Path Telemetry Mapper**: Map JSON dot-paths (`1.0.value`, `values.GGXWDG_NGDP.{{ISO3}}.2025`, `telemetry.gdpGrowthPct`) directly into live sovereign indicators (`gdpGrowth`, `cpiInflation`, `debtToGdp`, `cds5yBps`, `fxReservesMonths`, `policyRate`, `politicalStability`) and click **Apply Mapped Values to Active Sovereign**.
5. **Tab 5 — Top-Level Application Integration Bus (Outbound Desks, Webhooks, SSE & OpenAPI 3.1)**:
   - Enables downstream applications, PMS/OMS engines, or enterprise risk dashboards to consume individual desk outputs (`geopolitical_desk`, `sovereign_desk`, `macro_desk`), the 9 sub-agent reports, quantitative suites, or the full `SMCR-1.0` bundle (`all_desks_bundle`).
   - Includes a **1-Click Outbound Desk Broadcaster**, **API Key (`X-SMCR-API-Key`) & HMAC-SHA256 (`X-SMCR-Signature-256`) Security Controls**, a **Live Delivery & Consumer Audit Log**, copy-ready `cURL` / `Python` / `TypeScript SSE` consumer snippets, and **OpenAPI 3.1.0 Spec (`openapi.json`)** download.

### B. Quick-Start: macOS (Apple Silicon Metal Acceleration or Bundled Container)
On macOS Apple Silicon, running native macOS Ollama on the host utilizes **Apple Metal GPU acceleration**, while the Dockerized EconQuest server connects seamlessly via `http://host.docker.internal:11434`:
```bash
# 1. One-click macOS launcher (auto-detects native macOS Ollama or starts bundled container profile):
bash ./scripts/start-mac.sh

# Or double-click `start-mac.command` in macOS Finder!
```

### C. Quick-Start: Windows 10/11 (WSL2 + Native Ollama or NVIDIA GPU Container)
On Windows, use the PowerShell or Batch launcher to automatically connect to native Windows Ollama (`localhost:11434`) or launch the bundled Ollama container with NVIDIA GPU passthrough (`--profile bundled-ollama-gpu`):
```powershell
# PowerShell:
.\scripts\start-windows.ps1

# Or double-click `scripts\start-windows.bat` in Windows Explorer
```

### D. Direct Docker Compose Profiles
```bash
# Option 1: Connect to Host Machine Ollama (Recommended for Mac Apple Silicon Metal & Windows Native)
docker compose up -d --build

# Option 2: All-in-One Bundled Ollama Container (CPU / Cross-Platform — auto-pulls models on boot)
OLLAMA_BASE_URL=http://ollama:11434 docker compose --profile bundled-ollama up -d --build

# Option 3: Bundled Ollama Container with NVIDIA GPU Passthrough (Windows WSL2 / Linux NVIDIA)
OLLAMA_BASE_URL=http://ollama-gpu:11434 docker compose --profile bundled-ollama-gpu up -d --build
```

---

## 7. Top-Level External Application Integration API (`SMCR-1.0` Desk Output Bus)

External applications can receive desk and council outputs via **REST Pull API**, **Outbound Push Webhooks**, or **Real-Time Server-Sent Events (SSE)**:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/integration/desks/:iso3` | `GET` | Pull granular desk output (`?desk=geopolitical\|sovereign\|macro\|all&includeSubAgents=true&includeQuant=true`) with `X-SMCR-Signature-256` HMAC header. |
| `/api/v1/integration/bundle/:iso3` | `GET` | Pull the complete `SMCR-1.0` bundle (all 3 desks, 9 sub-agents, quant suites, CRO Gate, Supreme Council synthesis, and Half-Kelly LOB execution sizing). |
| `/api/v1/integration/publish` | `POST` | Broadcast active sovereign desk outputs (`scope: 'all_desks_bundle' \| 'geopolitical_desk' \| 'sovereign_desk' \| 'macro_desk' \| 'supreme_council'`) to all enabled `webhook_bus` hosts and connected SSE stream subscribers. |
| `/api/v1/integration/stream` | `GET` | Subscribe to a persistent `text/event-stream` (SSE) feed emitting real-time `SMCR-1.0` JSON events whenever council runs complete or manual broadcasts are triggered. |
| `/api/v1/integration/openapi.json` | `GET` | Download the machine-readable **OpenAPI 3.1.0 Specification** for SDK generation and API gateway registration. |
| `/api/v1/integration/deliveries` | `GET` | Inspect recent outbound webhook, SSE, and REST pull delivery receipts (`deliveryId`, `scope`, `statusCode`, `latencyMs`, `hmacSignature`). |



