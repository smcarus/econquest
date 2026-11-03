# Sovereign Council Orchestrator — Comprehensive User Manual (`v2.5`)

**Institutional Multi-Agent Sovereign Credit, Macro-Fiscal, Geopolitical Wargaming & Quantitative Relative-Value Terminal**

---

## Table of Contents

1. [Terminal Architecture & Navigation Ergonomics](#1-terminal-architecture--navigation-ergonomics)
   - [1.1 The 3 Primary Activity Pillars](#11-the-3-primary-activity-pillars)
   - [1.2 The 1–2 Screen Scroll Budget & Page 1 / Page 2 Desk Pagination](#12-the-12-screen-scroll-budget--page-1--page-2-desk-pagination)
   - [1.3 Consolidated 1-Line Status Bar & Slide-Over Drawers](#13-consolidated-1-line-status-bar--slide-over-drawers)
   - [1.4 Global Command Palette (`⌘K` / `Ctrl+K`) & Layout Modes](#14-global-command-palette-k--ctrlk--layout-modes)
2. [Complete Breakdown of the 10 Analytical Hubs (All 40 Modules)](#2-complete-breakdown-of-the-10-analytical-hubs-all-40-modules)
   - [Hub 1: Overview, Maps & Charts](#hub-1-overview-maps--charts)
   - [Hub 2: Macro & Econometrics](#hub-2-macro--econometrics)
   - [Hub 3: Geopolitics & Supply Chains](#hub-3-geopolitics--supply-chains)
   - [Hub 4: Portfolio & Council Governance](#hub-4-portfolio--council-governance)
   - [Hub 5: Institutional Quant Desk (9 Sub-Workbenches)](#hub-5-institutional-quant-desk-9-sub-workbenches)
   - [Hub 6: Portfolio, DMO & Document AI](#hub-6-portfolio-dmo--document-ai)
   - [Hub 7: Decision Command Center](#hub-7-decision-command-center)
   - [Hub 8: Sovereign Ratings, FX & IC Dossier](#hub-8-sovereign-ratings-fx--ic-dossier)
   - [Hub 9: Restructuring, Monetary & Geo-Risk](#hub-9-restructuring-monetary--geo-risk)
   - [Hub 10: Persona Playbooks & Signal Hub](#hub-10-persona-playbooks--signal-hub)
3. [Workflow for the 9-Agent Adversarial Council & CRO Governance Gate](#3-workflow-for-the-9-agent-adversarial-council--cro-governance-gate)
   - [3.1 Architecture of the 9 Sub-Agents & 3 Domain Desks](#31-architecture-of-the-9-sub-agents--3-domain-desks)
   - [3.2 Phase 1: Parallel Sub-Agent Telemetry & Devil's Advocate Debates](#32-phase-1-parallel-sub-agent-telemetry--devils-advocate-debates)
   - [3.3 Phase 2: Cross-Desk Dependency Cascade](#33-phase-2-cross-desk-dependency-cascade)
   - [3.4 Human-in-the-Loop (HITL) Chief Risk Officer (CRO) Checkpoint](#34-human-in-the-loop-hitl-chief-risk-officer-cro-checkpoint)
   - [3.5 Phase 3: Supreme Council Synthesis & Quantitative Anchor Verification](#35-phase-3-supreme-council-synthesis--quantitative-anchor-verification)
4. [Instructions for the CSV Backtesting Engine & Persona-Switching](#4-instructions-for-the-csv-backtesting-engine--persona-switching)
   - [4.1 CSV Ingestion, Auto-Mapping & Unit Normalization (`policy_doc_lab`)](#41-csv-ingestion-auto-mapping--unit-normalization-policy_doc_lab)
   - [4.2 Synthesizing Custom Crisis Episodes & Running Historical Crisis Replay (`backtest_engine`)](#42-synthesizing-custom-crisis-episodes--running-historical-crisis-replay-backtest_engine)
   - [4.3 Systematic Strategy Backtester Lab (`persona_strategy_backtester_lab`)](#43-systematic-strategy-backtester-lab-persona_strategy_backtester_lab)
   - [4.4 In-Place Persona-Switching (`INDIVIDUAL_TRADER`, `INSTITUTIONAL_PM_IC`, `POLICY_RESEARCHER`)](#44-in-place-persona-switching-individual_trader-institutional_pm_ic-policy_researcher)
5. [How to Export SMCR-1.0 Compliant Reports & Academic Artifacts](#5-how-to-export-smcr-10-compliant-reports--academic-artifacts)
   - [5.1 Overview of the SMCR-1.0 Institutional Standard](#51-overview-of-the-smcr-10-institutional-standard)
   - [5.2 Exporting the Multi-Page SMCR-1.0 PDF Dossier](#52-exporting-the-multi-page-smcr-10-pdf-dossier)
   - [5.3 Exporting YAML-Markdown (`.md`), Canonical JSON (`.json`), and Python SDK (`.py`)](#53-exporting-yaml-markdown-md-canonical-json-json-and-python-sdk-py)
   - [5.4 Dispatches to Institutional Webhooks & Local Ollama Runtimes](#54-dispatches-to-institutional-webhooks--local-ollama-runtimes)
   - [5.5 Exporting Boardroom IC Pitchbooks & Academic LaTeX Booktabs / BibTeX](#55-exporting-boardroom-ic-pitchbooks--academic-latex-booktabs--bibtex)
6. [Real-Time Data Provenance Overlay & Statistical Reference Glossary](#6-real-time-data-provenance-overlay--statistical-reference-glossary)

---

## 1. Terminal Architecture & Navigation Ergonomics

### 1.1 The 3 Primary Activity Pillars
While the underlying analytical engine comprises **10 specialized Domain Hubs (40 modules)**, the top navigation bar organizes every tool into **3 Primary Activity Pillars** based on your daily workflow:

1. **`1. Market & Trading` (Blue Pillar)**
   - **Curve, CDS & Execution**: `NSS Yield Curve`, `CDS & Basis Arb`, `RV Blotter & DV01`, `Order Book & Liquidity`
   - **Portfolio & Stress Testing**: `Portfolio Stress Lab`, `EMBI Pair Book`, `Contagion & CVaR₉₉`, `PCA Alpha Matrix`
   - **Signals, Arbitrage & Catalysts**: `Top Alpha Signals`, `Dislocation Screener`, `Prediction Market Arb`, `Catalyst Vol Calendar`, `Strategy Backtester`, `Peer RV Matrix`
2. **`2. Policy Research` (Emerald Pillar)**
   - **Monetary, Treasury & Ratings Policy**: `Taylor Rule & Dominance`, `DMO Auction Simulator`, `Shadow Credit Ratings`, `Bank-Sovereign Doom Loop`
   - **Debt Restructuring & Climate Transition**: `IMF / CAC Waterfall`, `Haircut NPV Solver`, `NGFS Climate & SLBs`
   - **Policy Document AI, Council & Governance**: `MPC / IMF Document AI`, `Document & CSV Lab`, `9-Agent Council Debates`, `CRO Gate & Dossier`, `Pre-Mortem & Kill-Switch`, `Decision Ledger & Brier`, `Guided Playbooks`, `IC Pitchbook Exporter`
3. **`3. Macroeconomic Research` (Indigo Pillar)**
   - **Global Macro Overview, DSA & Liquidity**: `Global Map & Horizon Charts`, `DSA & Fan Charts Lab`, `Global Liquidity & XCCY`, `4-Quadrant Macro Matrix`
   - **Econometrics & FX Valuation**: `FX BEER / FEER Lab`, `Matrix OLS (HAC) & ROC`, `Macro Surprise & Bayes`
   - **Geopolitics, Chokepoints & Crisis Replay**: `Geopolitical Wargaming`, `Supply-Chain Chokepoints`, `Reserve Custody Freeze`, `Historical Crisis Replay`, `LaTeX & Empirical CSV`

### 1.2 The 1–2 Screen Scroll Budget & Page 1 / Page 2 Desk Pagination
Every analytical desk is wrapped in the **Viewport Scroll Budget Container**:
- **Zero Nested Scrollbars**: Desks never trap your mouse wheel inside a nested scroll box.
- **Automatic Card Pagination**: Any desk with 3 or more analytical cards automatically paginates its sections into:
  - **Page 1: Primary Workbench & Controls** (interactive shock sliders, primary KPIs, and flagship visualization).
  - **Page 2: Deep-Dive Matrix & Diagnostics** (cross-sovereign attribution tables, sensitivity matrices, and export toolbars).
- **Show All Toggle**: Click `Show All (N)` on the right side of the Desk View bar if you prefer to view all panels stacked on a single page.

### 1.3 Consolidated 1-Line Status Bar & Slide-Over Drawers
Directly above the active desk, the **Consolidated Status Bar** displays live telemetry for the selected ISO-3 sovereign (`Debt/GDP`, `5Y CDS`, `10Y Yield`, `FX Reserves`, `Policy Rate`, `Risk Score`) and provides 3 slide-over drawers:
- **Morning Alpha Radar**: Surfaces the Top-3 cross-sovereign pricing dislocations and 7-day forward Central Bank MPC / CPI / IMF review event volatility catalysts, with 1-click **Stage IC Trade Ticket**.
- **Executive BLUF Scorecard**: Displays the Bottom-Line-Up-Front investment thesis, 3-desk risk breakdown, and quick navigation links.
- **Desk Guide & Glossary**: Explains what the active desk measures in plain English, how to read its charts, and lets you switch between **Simple Brief** and **Pro Quant** density modes.

### 1.4 Global Command Palette (`⌘K` / `Ctrl+K`) & Layout Modes
- **Command Palette (`⌘K`)**: Press `⌘K` or `Ctrl+K` (or click `Jump ⌘K` in the top bar) to fuzzy-search all 40 modules, 12+ sovereigns, persona lenses, and system actions (`Run Pre-Flight QA Audit`, `Onboard Custom ISO-3`, `Export SMCR-1.0 PDF`).
- **Workspace Layout Switcher**: Located in the secondary bar (`Focused Desk` | `Split` | `Report`):
  - **Focused Desk (`executive_brief`)**: Default 1–2 screen paginated single-module view.
  - **Split (`split_workbench`)**: Side-by-side sovereign telemetry and multi-agent Council workbench.
  - **Report (`full_report`)**: Continuous vertical institutional briefing across all desks.

---

## 2. Complete Breakdown of the 10 Analytical Hubs (All 40 Modules)

Below is the complete reference for all **10 Analytical Domain Hubs** and their constituent workbenches.

---

### Hub 1: Overview, Maps & Charts
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `charts_watchlists` | **Global Macro Map & Horizon Charts** | `3. Macroeconomic Research` → `Global Macro Overview, DSA & Liquidity` | Combines two inner-tabbed workspaces: **(1) Sovereign Horizon Charts & Debt Maturity Wall** (inner-tabbed across *Macro-Fiscal & Inflation Trajectory*, *Yield Curve & 5Y CDS Regime*, and *Sovereign Debt Maturity Wall & Rollover*) and **(2) Interactive Global Geopolitical & Chokepoint Map** (live GDELT instability markers, maritime chokepoint corridors, and 1-click sovereign selection). |
| `risk_analytics` | **Peer Relative Value Z-Score Matrix** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | Cross-sectional Z-score standardization of 5Y CDS spreads vs. composite fundamental risk across all watchlist sovereigns, identifying rich/cheap outliers (bps per unit of risk), credit rating migration probabilities, and sovereign contagion betas. |

---

### Hub 2: Macro & Econometrics
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `forecasting_lab` | **Econometric & Debt Sustainability (DSA) Lab** | `3. Macroeconomic Research` → `Global Macro Overview, DSA & Liquidity` | Implements the IMF Debt Sustainability Analysis (DSA) law of motion: $d_t = \frac{1 + r_t}{1 + g_t} d_{t-1} - pb_t + sfa_t$. Runs 1,000-path joint Monte Carlo simulations to render **10th/25th/50th/75th/90th percentile Debt/GDP Fan Charts (2025–2030)**, computes the debt-stabilizing primary balance $pb^* = \frac{r - g}{1 + g} d_{t-1}$, and evaluates the **IMF Assessing Reserve Adequacy (ARA)** metric. |
| `global_liquidity` | **Global Liquidity & XCCY Basis Desk** | `3. Macroeconomic Research` → `Global Macro Overview, DSA & Liquidity` | Tracks G4 Central Bank (Fed, ECB, BoJ, PBoC) net liquidity impulse, NY Fed SOFR vs. EFFR repo funding stress, 5Y Cross-Currency (XCCY) basis swap spreads (bps), and EM dollar funding beta transmission. |
| `market_maker_alpha` | **Market-Maker & Order Book Depth** | `1. Market & Trading` → `Curve, CDS & Execution` | Simulates sovereign Eurobond limit order book depth, dealer gamma/inventory skew, Kyle's lambda ($\lambda$) price impact for institutional block trades ($10M–$250M), and systematic carry + momentum Z-scores. |

---

### Hub 3: Geopolitics & Supply Chains
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `geopolitical_desk` | **Geopolitical Wargaming Desk** | `3. Macroeconomic Research` → `Geopolitics, Chokepoints & Crisis Replay` | Interactive 5-factor geopolitical shock simulator (*Trade Fragmentation*, *Maritime Chokepoint Blockade*, *Sanctions & Asset Custody Freeze*, *Cyber/Grid Disruption*, *Energy Supply Shock*). Features a sequential game-theory escalation tree, GDELT conflict tone telemetry, and a live toggle to propagate geopolitical shocks directly into the DSA Lab and Portfolio Contagion Desk. |
| `supply_chain_matrix` | **Chokepoint Supply-Chain Matrix** | `3. Macroeconomic Research` → `Geopolitics, Chokepoints & Crisis Replay` | Quantifies sovereign import/export exposure across 5 critical maritime chokepoints (*Strait of Hormuz*, *Bab el-Mandeb / Red Sea*, *Suez Canal*, *Taiwan Strait*, *Strait of Malacca*), strategic commodity concentration (Herfindahl-Hirschman Index $\text{HHI} = \sum s_i^2$), and headline CPI pass-through (bps). |

---

### Hub 4: Portfolio & Council Governance
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `portfolio_risk_desk` | **Portfolio Contagion & $\text{CVaR}_{99}$** | `1. Market & Trading` → `Portfolio & Stress Testing` | Multi-sovereign bond & CDS book analytics featuring an $N \times N$ cross-sovereign contagion spillover matrix, Parametric $\text{VaR}_{95}$, **Cornish-Fisher skewness/kurtosis-adjusted $\text{CVaR}_{99}$ (Expected Shortfall)**, and **Marginal Contribution to Risk ($\text{MCTR}_i = w_i \frac{(\Sigma w)_i}{\sigma_p}$)**. |
| `backtest_engine` | **Historical Crisis Replay (1997–2022)** | `3. Macroeconomic Research` → `Geopolitics, Chokepoints & Crisis Replay` | Interactive replay of 5 historical sovereign crises (1997 Asia, 1998 Russia GKO, 2001 Argentina, 2011 Eurozone, 2022 UK Gilt LDI) plus custom CSV episodes, computing Early Warning Signal (EWS) lead time ($T-k$ months) and **AUROC** classification accuracy. |
| `council_debates` | **9-Agent Council & Devil's Advocate Debates** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Displays real-time execution health for the 9 specialized sub-agents across the Geopolitical, Sovereign Debt, and Macro-Fiscal desks, full adversarial **Thesis vs. Devil's Advocate** debate transcripts, and the **Phase 2 Cross-Desk Dependency Cascade**. |
| `cro_reports` | **CRO Gate & SMCR-1.0 Dossier** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Human-in-the-Loop Chief Risk Officer counterfactual assumption override gate, Supreme Council Phase 3 synthesis trigger, and multi-format **SMCR-1.0 Report Exporter** (PDF, Markdown, JSON, Python SDK, Webhook). |
| `policy_doc_lab` | **Policy Document & CSV Lab** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Dual ingestion workbench: **(1) Policy Document Context Upload** (.txt/.md/.csv for IMF Article IV reports & MPC minutes) and **(2) 13-Column Sovereign CSV Auto-Mapper, Data Cleaner & Custom Crisis Synthesizer**. |

---

### Hub 5: Institutional Quant Desk (9 Sub-Workbenches)
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `quant_nss_yield_curve` | **NSS Yield Curve & Carry+Roll** | `1. Market & Trading` → `Curve, CDS & Execution` | Fits the 6-factor **Nelson-Siegel-Svensson (NSS)** parametric yield curve ($1\text{Y}–30\text{Y}$): $y(\tau) = \beta_0 + \beta_1\frac{1-e^{-\tau/\lambda_1}}{\tau/\lambda_1} + \beta_2\left(\frac{1-e^{-\tau/\lambda_1}}{\tau/\lambda_1} - e^{-\tau/\lambda_1}\right) + \beta_3\left(\frac{1-e^{-\tau/\lambda_2}}{\tau/\lambda_2} - e^{-\tau/\lambda_2}\right)$. Computes 12M **Total Carry + Roll-Down (bps)** across all tenors, 2s10s steepener & 2s5s10s butterfly P&L, and stages 1-click IC Trade Tickets. |
| `quant_cds_basis` | **CDS Hazard & Basis Arbitrage** | `1. Market & Trading` → `Curve, CDS & Execution` | Bootstraps piecewise-constant **ISDA hazard rates ($\lambda_t$)** and survival probabilities $Q(0,T) = \exp(-\int_0^T \lambda(u)du)$ from 1Y/3Y/5Y/7Y/10Y CDS quotes assuming recovery $R$, and identifies negative/positive **CDS-Bond Basis Arbitrage** ($\text{Basis} = s_{\text{CDS}} - Z_{\text{Spread}}$). |
| `quant_trade_blotter` | **RV Trade Blotter & DV01/CS01** | `1. Market & Trading` → `Curve, CDS & Execution` | Multi-leg relative-value trade structuring blotter (outright bond, CDS protection, 2s10s steepener, CDS-vs-cash basis package). Computes net **DV01**, **CS01**, **Convexity**, 90-day Carry+Roll, and a **5-Factor P&L Attribution Waterfall** ($\Delta \text{Carry}, \Delta \text{Rate}, \Delta \text{Spread}, \Delta \text{Convexity}, \Delta \text{FX}$). |
| `quant_portfolio_stress_lab` | **Portfolio Stress-Test & Scenario Lab** | `1. Market & Trading` → `Portfolio & Stress Testing` | Batch multi-sovereign EMBI portfolio stress simulator. Applies simultaneous macro shocks (*FX Devaluation %*, *Parallel Spread Widening bps*, *US Treasury Core Rate Shift bps*, *Global Oil/Commodity Shock %*, *Liquidity Bid-Ask Haircut*) with 6 institutional presets and attributes instantaneous book P&L ($ and bps) by factor and sovereign. |
| `quant_alpha_correlation` | **PCA Alpha & Correlation Matrix** | `1. Market & Trading` → `Portfolio & Stress Testing` | Computes the $N \times N$ rolling correlation matrix of sovereign 5Y CDS and 10Y yields, extracts the 1st Principal Component (**Global Risk-On/Risk-Off PCA Factor**), decomposes spreads into **Systematic Beta vs. Idiosyncratic Alpha Residual (bps)**, and solves for optimal active EMBI weights. |
| `quant_macro_catalyst_calendar` | **Macro & MPC Catalyst Vol Calendar** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | 90-day forward calendar of Central Bank MPC rate decisions, CPI releases, IMF Article IV / EFF board reviews, and sovereign rating dates. Computes implied 1-day event yield volatility ($\pm\text{bps}$) and breakeven straddle/hedge sizing. |
| `quant_restructuring_npv` | **Sovereign Haircut & Exit-Yield NPV** | `2. Policy Research` → `Debt Restructuring & Climate Transition` | Sovereign Loss-Given-Default (LGD) and workout calculator. Models coupon reduction, maturity extension (grace period + amortization), principal face haircut %, and exit-yield discounting ($y_{\text{exit}} \in [8\%, 18\%]$) to compute **NPV Recovery (cents on the dollar)** and ICMA Collective Action Clause (CAC) voting thresholds. |
| `quant_matrix_econometrics` | **Matrix OLS (HAC) & ROC Econometrics** | `3. Macroeconomic Research` → `Econometrics & FX Valuation` | In-browser matrix Ordinary Least Squares estimator $\hat{\beta} = (X^\top X)^{-1}X^\top y$ with **Newey-West Heteroskedasticity and Autocorrelation Consistent (HAC)** standard errors, **Bohn (1998) Fiscal Reaction Function** sustainability test ($\rho > 0$), Variance Inflation Factors (VIF), and out-of-sample ROC/AUC diagnostics. |
| `quant_macro_surprise` | **Macro Surprise Z-Score & Bayes** | `3. Macroeconomic Research` → `Econometrics & FX Valuation` | Standardized economic & inflation surprise index ($Z_i = \frac{A_i - E_i}{\sigma_i}$) across CPI, GDP, PMI, Fiscal Balance, and Trade releases, coupled with a sequential **Bayesian Regime Updater** $P(H \mid E) = \frac{P(E \mid H)P(H)}{P(E)}$ for sovereign distress probability. |

---

### Hub 6: Portfolio, DMO & Document AI
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `embi_portfolio_pair_book` | **EMBI Portfolio & Pair-Trade Book** | `1. Market & Trading` → `Portfolio & Stress Testing` | Tracks active sovereign weights vs. **J.P. Morgan EMBI Global Diversified** benchmark weights, computes ex-ante **Tracking Error (bps)** and **Information Ratio**, and structures beta-neutral / duration-neutral cross-sovereign pair trades. |
| `dmo_treasury_auction_sim` | **24M DMO Treasury Auction Simulator** | `2. Policy Research` → `Monetary, Treasury & Ratings Policy` | Simulates the Debt Management Office (DMO) 24-month gross financing need ($\text{GFN} = \text{Maturing Debt} + \text{Fiscal Deficit}$) across 5 funding channels (*Domestic Nominal*, *CPI-Linker/FX-Linked*, *T-Bills*, *External Eurobond*, *Official IMF/WB*). Computes clearing auction tail (bps), bid-to-cover ratio, and domestic bank Tier-1 absorption limits. |
| `mpc_imf_document_ai` | **MPC & IMF Article IV Document AI** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Hybrid Gemini AI + deterministic NLP parser that extracts Hawkish/Dovish Central Bank tone (-100 to +100), Fiscal Consolidation Credibility, IMF Quantitative Performance Criteria (QPC) status, and Eurobond CAC clauses, converting text directly into a **Calibrated Policy Shock Vector** applied to the live terminal. |

---

### Hub 7: Decision Command Center
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `decision_dislocation_screener` | **Model vs. Market Dislocation Screener** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | Compares market-implied 5Y cumulative default probability $PD_{\text{mkt}} = 1 - \exp\left(-\frac{s_{\text{CDS}}}{1 - R} \cdot 5\right)$ against the Council's fundamental econometric default probability $PD_{\text{model}}$, ranking sovereigns by **Dislocation Edge (bps)** and computing **Fractional Kelly Sizing**. |
| `decision_prediction_markets` | **Polymarket & Kalshi Event Arbitrage** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | Dual-venue prediction market scanner (Polymarket Gamma API & Kalshi v2 API) tracking live contracts on Central Bank rate cuts, sovereign defaults, elections, and geopolitical ceasefires. Computes cross-venue arbitrage spreads (¢) and runs a **Conditional Bayesian Event Shock Simulator** that reprices live sovereign 5Y CDS and 10Y yields. |
| `decision_premortem_killswitch` | **Pre-Mortem & Kill-Switch Engine** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Implements Gary Klein's **Prospective Hindsight Pre-Mortem** (3 structured failure pathways assuming the sovereign thesis fails over 6 months) and monitors **5 Automated Kill-Switch Tripwires** (*FX Reserves < 3.0m*, *5Y CDS > Threshold*, *Primary Deficit Slippage*, *Real Rate Inversion*, *GDELT Instability Surge*). |
| `decision_ledger_brier` | **Decision Ledger & Brier Audit** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Persistent institutional thesis ledger recording entry date, sovereign ISO-3, direction (`LONG_CREDIT` / `SHORT_CREDIT`), entry 5Y CDS spread, probability forecast $p_i$, live mark-to-market P&L (bps), and **Brier Skill Score** $\text{BS} = \frac{1}{N}\sum (p_i - o_i)^2$. |
| `decision_quadrant_stress` | **4-Quadrant Macro Regime Matrix** | `3. Macroeconomic Research` → `Global Macro Overview, DSA & Liquidity` | Evaluates sovereign resilience simultaneously across 4 global macro regimes: **(1) Goldilocks Disinflation**, **(2) Stagflationary Supply Shock**, **(3) US Rates Higher-for-Longer**, and **(4) Global Demand Hard Landing**. |

---

### Hub 8: Sovereign Ratings, FX & IC Dossier
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `ratings_shadow_fallen_angel` | **Shadow Rating & Fallen-Angel Cliff** | `2. Policy Research` → `Monetary, Treasury & Ratings Policy` | Replicates the S&P / Moody's / Fitch **5-Pillar Sovereign Rating Methodology** (*Institutional*, *Economic*, *External*, *Fiscal*, *Monetary* scores) to derive a quantitative **Shadow Credit Rating**, notch dislocation vs. official agency rating, and forced-selling spread widening at the **BBB- / BB+ Fallen-Angel Cliff**. |
| `debt_investor_base_doom_loop` | **Investor Base & Bank Doom-Loop** | `2. Policy Research` → `Monetary, Treasury & Ratings Policy` | Decomposes sovereign debt ownership across the **IMF Sovereign Debt Investor Base (SDIB)** 5 sectors (*Domestic Banks*, *Domestic Non-Banks*, *Central Bank*, *Foreign Official*, *Foreign Non-Bank*). Simulates foreign sudden-stop outflows and quantifies the **Bank-Sovereign Doom-Loop** (mark-to-market sovereign bond losses eroding domestic bank CET1 Tier-1 capital ratios). |
| `ic_pitchbook_dossier_exporter` | **Boardroom IC Pitchbook Exporter** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Multi-sovereign Investment Committee comparative scorecard and 1-click exporter for **Boardroom IC Pitchbooks** in formatted PDF, Markdown, and JSON. |
| `fx_beer_feer_equilibrium` | **FX BEER / FEER Valuation Lab** | `3. Macroeconomic Research` → `Econometrics & FX Valuation` | Estimates Real Effective Exchange Rate (REER) misalignment (%) using both the **Behavioral Equilibrium Exchange Rate (BEER)** model (Terms of Trade, Balassa-Samuelson productivity, real interest differential, NFA) and the **IMF Fundamental Equilibrium Exchange Rate (FEER)** current-account norm elasticity solver. |

---

### Hub 9: Restructuring, Monetary & Geo-Risk
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `taylor_rule_fiscal_dominance` | **Central Bank Taylor Rule & Dominance** | `2. Policy Research` → `Monetary, Treasury & Ratings Policy` | Computes the **Open-Economy Augmented Taylor Rule** $i^*_t = r^* + \pi_t + \alpha_\pi(\pi_t - \pi^*) + \alpha_y(y_t - y^*) + \alpha_{fx}\Delta e_t$, compares $i^*_t$ against the spot policy rate (bps gap), and scores **Fiscal Dominance Risk (0–100)** and **Financial Repression Liquidation Tax (% of GDP)**. |
| `restructuring_npv_cac_waterfall` | **IMF / Paris Club & CAC Waterfall** | `2. Policy Research` → `Debt Restructuring & Climate Transition` | Models a **5-Tier Creditor Seniority Waterfall** (*1. IMF/WB Preferred Creditor Status*, *2. Paris Club Bilateral*, *3. Non-Paris Club Bilateral*, *4. External Eurobonds with ICMA Single-Limb/Two-Limb CACs*, *5. Domestic Local-Law Debt*) to solve for Comparability of Treatment and equalized NPV recovery. |
| `ngfs_climate_slb_greenium` | **NGFS Climate Stress & SLB Greenium** | `2. Policy Research` → `Debt Restructuring & Climate Transition` | Simulates **NGFS Phase IV Climate Scenarios** (*Net Zero 2050*, *Delayed Transition*, *Hot House World*) on sovereign hydrocarbon fiscal revenues, physical climate GDP damage, and **Sustainability-Linked Bond (SLB)** KPI step-up coupon penalties vs. Greenium savings (bps). |
| `geopolitical_reserves_chokepoints` | **Reserve Custody Freeze & Chokepoints** | `3. Macroeconomic Research` → `Geopolitics, Chokepoints & Crisis Replay` | Audits central bank FX & gold reserve custody location (*G7 Jurisdiction vs. Domestic/Non-G7 Vaults* + BIS swap lines) to compute **Sanctions-Adjusted Usable Import Cover (months)** alongside a 5-corridor maritime blockade simulator. |

---

### Hub 10: Persona Playbooks & Signal Hub
| Module ID | Workbench Title | Activity Pillar Location | Mathematical & Analytical Scope |
| :--- | :--- | :--- | :--- |
| `persona_cross_hub_signal_scanner` | **Top Alpha Signal Scanner** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | Synthesizes all 9 quantitative engines across the entire active watchlist to surface the **Top-3 High-Conviction Signals** tailored to each persona (*Trader Arbitrage*, *Institutional IC Allocation*, *Policy Research Anomaly*), with 1-click sovereign/module jump and trade staging. |
| `persona_strategy_backtester_lab` | **Systematic Strategy Backtester Lab** | `1. Market & Trading` → `Signals, Arbitrage & Catalysts` | Historical regime backtester (2022–2025) evaluating 4 systematic rules (*Prediction Market vs. CDS Arb*, *Taylor Rule FX Carry/Short*, *Shadow Rating Fallen-Angel Hedge*, *Distressed Eurobond NPV Workout*) with cumulative bps return curves, Sharpe ratios, and drawdown analytics. |
| `persona_guided_playbook_cockpit` | **Guided Policy & IC Playbooks** | `2. Policy Research` → `Policy Document AI, Council & Governance` | Interactive step-by-step operational checklists for **Individual Traders**, **Institutional PMs/ICs**, and **Policy Researchers**. Tracks task completion progress and provides 1-click deep links to the exact workbench required for each step. |
| `persona_academic_latex_csv_exporter` | **Academic LaTeX & Empirical CSV Exporter** | `3. Macroeconomic Research` → `Geopolitics, Chokepoints & Crisis Replay` | Generates publication-ready **LaTeX `booktabs` Tables** (`\toprule`, `\midrule`, `\bottomrule`) with Newey-West HAC standard errors in parentheses and significance stars (`*** p<0.01`), **BibTeX Citations (`.bib`)**, **Tidy Empirical Panel CSVs**, and **Working Paper Drafts (`.md`)**. |

---

## 3. Workflow for the 9-Agent Adversarial Council & CRO Governance Gate

### 3.1 Architecture of the 9 Sub-Agents & 3 Domain Desks
The Council divides sovereign risk assessment into **3 Domain Desks**, each staffed by **3 specialized quantitative/qualitative sub-agents**:

1. **Geopolitical & Supply-Chain Desk**
   - `Agent 1.1`: *Sanctions, Reserve Custody & Sovereign Immunity Analyst*
   - `Agent 1.2`: *Maritime Chokepoint & Strategic Commodity Trade Analyst*
   - `Agent 1.3`: *Domestic Regime Stability, Electoral Cycle & GDELT Conflict Analyst*
2. **Sovereign Debt & Market Microstructure Desk**
   - `Agent 2.1`: *Debt Maturity Wall, Rollover & DMO Auction Analyst*
   - `Agent 2.2`: *Creditor Seniority, IMF/Paris Club & ICMA CAC Legal Analyst*
   - `Agent 2.3`: *ISDA CDS Hazard Curve, Eurobond Basis & Order-Book Liquidity Analyst*
3. **Macro-Fiscal & Monetary Econometrics Desk**
   - `Agent 3.1`: *Central Bank Taylor Rule, Inflation Expectations & Fiscal Dominance Analyst*
   - `Agent 3.2`: *Stochastic Debt Sustainability ($r - g$) & Primary Balance Bohn Test Analyst*
   - `Agent 3.3`: *External Balance of Payments, BEER/FEER FX & IMF ARA Reserve Adequacy Analyst*

### 3.2 Phase 1: Parallel Sub-Agent Telemetry & Devil's Advocate Debates
When you click **Run Council** in the top-right header:
1. All 9 sub-agents inspect the active sovereign's `OpenDataSnapshot`, geopolitical wargame parameters, liquidity stress parameters, and any uploaded policy document snippet.
2. Each of the 3 Domain Desks conducts an adversarial **Thesis vs. Devil's Advocate Debate**:
   - **Lead Desk Thesis**: Articulates the primary structural risk or relative-value opportunity, grounded in exact quantitative anchors (e.g., `5Y CDS 345 bps`, `Debt/GDP 88.4%`, `FX Reserves 3.8 months`).
   - **Devil's Advocate Counter-Thesis**: Challenges the primary thesis with counterfactual data (e.g., domestic bank absorption capacity, central bank positive real policy rate buffer, or bilateral swap line backstops).
   - **Desk Arbiter Synthesis**: Resolves the debate into a calibrated Desk Risk Score ($0.00–1.00$) and confidence interval.

### 3.3 Phase 2: Cross-Desk Dependency Cascade
Immediately following Phase 1, the **Cross-Desk Dependency Cascade** computes directional spillover elasticities across the three desks:
- $\text{Geopolitical Desk} \longrightarrow \text{Sovereign Debt Desk}$ (e.g., how sanctions or shipping blockades widen 5Y CDS spreads and compress foreign auction participation).
- $\text{Sovereign Debt Desk} \longrightarrow \text{Macro-Fiscal Desk}$ (e.g., how higher sovereign bond yields increase the effective real interest rate $r_t$, worsening the $r - g$ debt snowball).
- $\text{Macro-Fiscal Desk} \longrightarrow \text{Geopolitical Desk}$ (e.g., how food/energy inflation and austerity measures feed back into domestic social stability).

### 3.4 Human-in-the-Loop (HITL) Chief Risk Officer (CRO) Checkpoint
After Phase 2 completes, the pipeline **pauses automatically** at stage `AWAITING_CRO_APPROVAL` and navigates to **2. Policy Research** → **CRO Gate & Dossier** (`cro_reports`).
- As the **Chief Risk Officer**, you can inspect the **Council Pipeline Reliability & Quantitative Anchor Audit Panel** and override any of the 7 governance parameters:
  1. `Geopolitical Risk Score` ($0.00–1.00$)
  2. `Sovereign Debt Risk Score` ($0.00–1.00$)
  3. `Macro-Fiscal Risk Score` ($0.00–1.00$)
  4. `Energy & Commodity Inflation Shock (%)`
  5. `Sovereign Debt Servicing Spread Shock (bps)`
  6. `FX Reserve Adequacy Override (months of imports)`
  7. `Political Will & Reform Credibility Index (0–100)` plus free-text `CRO Governance Directive Notes`.

### 3.5 Phase 3: Supreme Council Synthesis & Quantitative Anchor Verification
Clicking **Approve Assumptions & Convene Supreme Council** executes Phase 3:
- Synthesizes the CRO-approved assumptions and 3-desk debates into a final **Supreme Council Verdict**, **Composite Risk Score**, **Early Warning Status** (`NORMAL`, `WATCH`, `ELEVATED_STRESS`, `CRITICAL_DEFAULT_RISK`), **Executive Summary**, and **Actionable Institutional Recommendations**.
- Unlocks the **SMCR-1.0 Dossier** for immediate export.

---

## 4. Instructions for the CSV Backtesting Engine & Persona-Switching

### 4.1 CSV Ingestion, Auto-Mapping & Unit Normalization (`policy_doc_lab`)
To ingest your own proprietary or historical macro-market dataset:
1. Open **2. Policy Research** → **Policy Document AI, Council & Governance** → **Document & CSV Lab** (`policy_doc_lab`).
2. In the **Sovereign Macro-Market CSV Ingestion, Auto-Mapper & Crisis Backtest Calibration** card:
   - Click **Download Blank CSV Template** to obtain a ready-to-fill `.csv` file with the 13 standard headers, **or**
   - Click **Upload Custom CSV / TSV** to upload any comma- or tab-delimited file from Bloomberg, Haver, IMF WEO, FRED, or national central banks, **or**
   - Select one of the 5 built-in multi-period historical presets (*Brazil Fiscal-Inflation Regime*, *Egypt Devaluation & IMF EFF*, *Turkey Orthodox Pivot*, *Argentina Stabilization*, *UK 2022 LDI Gilt Crisis*).
3. **Verify Column Mappings**:
   - The **Smart Column Auto-Mapper** inspects header names and sample numeric ranges to map your columns to the 13 canonical fields (`observationDate`, `iso3`, `cds5YSpreadBps`, `sovereign10YBondYieldPct`, `sovereign2YBondYieldPct`, `policyRatePct`, `debtToGdpPct`, `primaryFiscalBalancePct`, `fxReservesMonthsImport`, `imfAraRatioPct`, `inflationCpiYoYPct`, `realGdpGrowthPct`, `fxSpotRatePerUsd`).
   - Use the dropdown on any column to change its target mapping or apply a **Unit Multiplier** (`1x`, `100x (% → bps)`, `0.01x (bps → %)`, `1000x`).
4. **Hydrate Live Terminal State**:
   - Select any observation row in the **Cleaned & Normalized Time-Series Preview Table** and click **Apply Selected Row to Live Sovereign Desk** to push those exact macro and market figures across all 40 modules.

### 4.2 Synthesizing Custom Crisis Episodes & Running Historical Crisis Replay (`backtest_engine`)
1. From the **Document & CSV Lab**, click **Synthesize & Open in Crisis Backtest Engine**.
2. The engine automatically converts your multi-row CSV time series into a full **Historical Crisis Episode**:
   - Computes period-by-period **Geopolitical**, **Sovereign Debt**, **Macro-Fiscal**, and **Composite Council Risk Scores** ($0.00–1.00$).
   - Identifies the **Peak 5Y CDS Spread (bps)** and calculates the **Early Warning Signal (EWS) Lead Time** (how many steps before peak spread the Council's composite risk score crossed the `0.65` warning threshold).
3. Inside **3. Macroeconomic Research** → **Historical Crisis Replay** (`backtest_engine`):
   - Switch between the 5 canonical historical crises (1997 Asia, 1998 Russia GKO, 2001 Argentina, 2011 Eurozone, 2022 UK LDI) and your custom CSV episodes.
   - Use the interactive timeline scrubber to inspect the exact macro-fiscal state at each step ($T-12$ through $T+6$).
   - Click **Apply Historical Crisis Shocks to Live Sovereign Desk** to shock the currently active sovereign with that crisis episode's rate, spread, FX, and primary balance deltas and open the **Scenario A vs. Scenario B Delta Comparator** (`A vs B` button in the top header).

### 4.3 Systematic Strategy Backtester Lab (`persona_strategy_backtester_lab`)
To backtest systematic trading and hedging rules:
1. Navigate to **1. Market & Trading** → **Signals, Arbitrage & Catalysts** → **Strategy Backtester** (`persona_strategy_backtester_lab`).
2. Select among 4 institutional strategies (*Prediction Market vs. CDS Arbitrage*, *Taylor Rule FX Carry & Short*, *Shadow Rating Fallen-Angel Cliff Hedge*, *Distressed Eurobond NPV Workout*).
3. Customize signal entry Z-score thresholds, holding horizon, and transaction cost haircuts (bps) to inspect cumulative P&L (bps), annualized Sharpe ratio, win rate %, and trade-by-trade attribution.

### 4.4 In-Place Persona-Switching (`INDIVIDUAL_TRADER`, `INSTITUTIONAL_PM_IC`, `POLICY_RESEARCHER`)
The terminal supports three specialized institutional personas via the **Trader | Institution | Researcher** toggle in the top header:
1. **`Trader` (`INDIVIDUAL_TRADER`)**: Optimizes the terminal for liquid sovereign credit, FX, and event-driven relative value.
   - *Key Desks*: `NSS Yield Curve`, `CDS & Basis Arb`, `RV Blotter & DV01`, `Prediction Market Arb`, `Catalyst Vol Calendar`.
2. **`Institution` (`INSTITUTIONAL_PM_IC`)**: Optimizes the terminal for benchmarked EM debt portfolios, risk committees, and boardroom IC allocation.
   - *Key Desks*: `Portfolio Stress Lab`, `EMBI Pair Book`, `Contagion & CVaR₉₉`, `Shadow Credit Ratings`, `IC Pitchbook Exporter`, `CRO Gate & Dossier`.
3. **`Researcher` (`POLICY_RESEARCHER`)**: Optimizes the terminal for econometric modeling, central bank / IMF policy analysis, and academic publication.
   - *Key Desks*: `Taylor Rule & Dominance`, `DSA & Fan Charts Lab`, `Matrix OLS (HAC) & ROC`, `FX BEER / FEER Lab`, `IMF / CAC Waterfall`, `LaTeX & Empirical CSV`.

> **Non-Disruptive In-Place Lens**: Clicking `Trader`, `Institution`, or `Researcher` in the header updates your active persona lens **in-place** without navigating away from your current desk.

---

## 5. How to Export SMCR-1.0 Compliant Reports & Academic Artifacts

### 5.1 Overview of the SMCR-1.0 Institutional Standard
Every Supreme Council assessment is serialized into the **Standardized Multi-Agent Council Report (`SMCR-1.0`)** schema, guaranteeing full reproducibility, cryptographic-style report IDs, explicit quantitative anchor verification, and human-in-the-loop CRO sign-off metadata.

### 5.2 Exporting the Multi-Page SMCR-1.0 PDF Dossier
- **From Any Desk**: Click the **PDF** button in the top-right header bar.
- **From the CRO Gate**: Navigate to **2. Policy Research** → **CRO Gate & Dossier** (`cro_reports`) and click **Export SMCR-1.0 PDF Dossier**.
- **Contents of the PDF**:
  1. Institutional Cover & Metadata Header (`Report ID`, `ISO-3`, `Timestamp`, `CRO Verification Status`).
  2. Executive BLUF Synthesis & Early Warning Classification.
  3. Quantitative Macro-Fiscal & Market Telemetry Anchor Table.
  4. 3-Desk Risk Scores & 9-Agent Adversarial Debate Transcripts.
  5. Cross-Desk Dependency Cascade & CRO Counterfactual Override Audit.
  6. Actionable Trade & Policy Recommendations.

### 5.3 Exporting YAML-Markdown (`.md`), Canonical JSON (`.json`), and Python SDK (`.py`)
On **Page 2** of **CRO Gate & Dossier** (`cro_reports`), use the 4 tabs inside the **SMCR-1.0 Institutional Report & Code Exporter**:
1. **`Executive Dossier`**: Interactive formatted preview of the full SMCR-1.0 report.
2. **`YAML-Markdown (.md)`**: Click **Copy Markdown** or **Download .md** to export a Git-friendly Markdown specification with structured YAML frontmatter.
3. **`JSON Schema (.json)`**: Click **Copy JSON** or **Download .json** to export the canonical `SMCR-1.0` JSON envelope.
4. **`TradingAgents Python SDK (.py)`**: Click **Copy Python Code** or **Download .py** to export a standalone Python script pre-configured with your active sovereign's telemetry and CRO overrides.

### 5.4 Dispatches to Institutional Webhooks & Local Ollama Runtimes
- **Webhook Dispatch**: In **CRO Gate & Dossier**, enter your target HTTPS endpoint in the **Webhook Target URL** field and click **Dispatch SMCR-1.0 JSON** to send the signed `SMCR-1.0` JSON payload via server-side proxy (`/api/council/webhook-dispatch`).
- **Local Ollama / Air-Gapped LLM Support**: Toggle the AI Runtime Provider between **Google Gemini Cloud (`gemini-2.5-flash` / `gemini-2.5-pro`)** and **Local Ollama Runtime (`http://localhost:11434`, supporting `qwen2.5:32b`, `deepseek-r1:32b`, `llama3.3:70b`)** and click **Test Ollama Endpoint** to verify connectivity.

### 5.5 Exporting Boardroom IC Pitchbooks & Academic LaTeX Booktabs / BibTeX
- **Boardroom IC Pitchbooks**: Navigate to **2. Policy Research** → **IC Pitchbook Exporter** (`ic_pitchbook_dossier_exporter`) to export multi-sovereign Investment Committee scorecards and trade pitchbooks in PDF, Markdown, or JSON.
- **Executive Tear-Sheet & Trade Tickets**: Click **IC Ticket / Tear-Sheet** in the secondary bar from any desk to inspect staged relative-value trades and export a 1-page sovereign tear-sheet.
- **Academic LaTeX & Empirical CSVs**: Navigate to **3. Macroeconomic Research** → **LaTeX & Empirical CSV** (`persona_academic_latex_csv_exporter`) to export publication-ready LaTeX `booktabs` regression tables, BibTeX `.bib` references, and tidy panel CSV datasets.

---

## 6. Real-Time Data Provenance Overlay & Statistical Reference Glossary

### 6.1 Inspecting Live API Handshakes on Any Chart or Table
Every chart and table in the terminal displays a live **`API PROVENANCE`** or **`PROVENANCE`** badge:
1. **Click Any Provenance Badge**: Opens the **Real-Time Data Provenance & API Handshake Ledger** modal.
2. **Verify Source Authority & Endpoint URI**: Inspect the exact REST endpoint URI (e.g., `https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/BRA`, `https://api.worldbank.org/v2/country/BRA/indicator/...`, `https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json`, or `https://gamma-api.polymarket.com/events`), UTC handshake timestamp, HTTP status (`200 OK`), and round-trip latency (ms).
3. **Copy cURL or Re-Handshake**: Click **Copy Endpoint URI** to copy the full audit record and `cURL` command, or click **Re-Handshake Endpoint Now** to trigger an immediate live refresh.

### 6.2 Using Interactive Statistical Reference Tooltips
Hover over (or click to pin) any dotted-underlined statistical badge or column header across the terminal to view its formal mathematical definition, variable glossary, quantitative interpretation thresholds, and institutional citation:

| Badge / Term | Formal Mathematical Definition | Primary Institutional Source |
| :--- | :--- | :--- |
| **`VaR` / `VaR₉₅`** | $\text{VaR}_{\alpha} = -\mu_p + z_{\alpha}\sigma_p$ | J.P. Morgan RiskMetrics (1996); Basel III Market Risk Framework |
| **`CVaR` / `CVaR₉₉`** | $\text{CVaR}_{\alpha} = -\mathbb{E}[R_p \mid R_p \le -\text{VaR}_{\alpha}]$ (Cornish-Fisher adjusted) | Basel Committee FRTB (MAR33); Rockafellar & Uryasev (2000) |
| **`DV01`** | $\text{DV01} = -\frac{\partial P}{\partial y} \times 10^{-4} = \text{Dirty Price} \times \text{ModDur} \times 10^{-4}$ | Fabozzi, *Fixed Income Analysis* (CFA Institute) |
| **`CS01`** | $\text{CS01} = \text{Notional} \times \text{RPV01} \times 10^{-4}$ | ISDA CDS Standard Model (Markit / OpenGamma) |
| **`MCTR`** | $\text{MCTR}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sqrt{w^\top \Sigma w}}$ | Litterman (1996), *Goldman Sachs Risk Management Series* |
| **`Z-Spread` & `Basis`** | $P_{\text{dirty}} = \sum \frac{CF_k}{\exp((r(t_k) + Z)t_k)}$; $\text{Basis} = s_{\text{CDS}} - Z$ | O'Kane (2008), *Modelling Single-name and Multi-name Credit Derivatives* |
| **`NSS`** | 6-Factor Nelson-Siegel-Svensson Parametric Yield Curve | Nelson & Siegel (1987); Svensson (1994, NBER / BIS Paper No. 25) |
| **`BEER` / `FEER`** | Behavioral & Fundamental Equilibrium Real Effective Exchange Rate | Clark & MacDonald (1998, IMF WP/98/67); IMF EBA Methodology |
| **`Bohn Test`** | $pb_t = \alpha + \rho \cdot d_{t-1} + \gamma_Y \tilde{y}_t + \varepsilon_t \quad (\rho > 0 \implies \text{No-Ponzi})$ | Bohn, H. (1998), *Quarterly Journal of Economics*, 113(3), 949–963 |
| **`ARA`** | $\text{ARA}_{\text{Float}} = 5\%\text{Exports} + 5\%\text{M2} + 30\%\text{STD} + 15\%\text{OtherLiab}$ | IMF Policy Paper, *Assessing Reserve Adequacy — Specific Proposals* (2015) |
| **`Brier Score`** | $\text{BS} = \frac{1}{N}\sum_{i=1}^N (p_i - o_i)^2$ | Brier, G. W. (1950), *Monthly Weather Review*, 78(1), 1–3 |
| **`AUROC`** | $\text{AUROC} = \int_0^1 \text{TPR}(\text{FPR}^{-1}(u))\,du$ | Berge & Jordà (2011); Drehmann & Juselius (2014, BIS Quarterly Review) |

---

## 7. Self-Hosting with Docker (macOS & Windows), 12-Agent GUI Studio & External/Internal API Host Connectors

### 7.1 Architectural Overview of Dual Ollama Topology
EconQuest supports two complementary Docker topologies so both **macOS Apple Silicon (M1–M4)** and **Windows 10/11 (WSL2 + NVIDIA GPU or CPU)** achieve maximum local inference throughput:
1. **Host Ollama Bridge (`http://host.docker.internal:11434`)**:
   - Recommended on **macOS Apple Silicon** (where Docker Desktop runs a Linux VM without Apple Metal passthrough, so running native macOS `ollama serve` on the host provides 5–10x faster Metal GPU inference) and on **Windows** when the native Ollama desktop app is already installed.
2. **Bundled Ollama Container Profiles (`--profile bundled-ollama` & `--profile bundled-ollama-gpu`)**:
   - Runs an official `ollama/ollama:latest` container inside the same Docker bridge network (`http://ollama:11434` or `http://ollama-gpu:11434`), mounts a persistent volume (`econquest_ollama_models`), and automatically pulls your configured `OLLAMA_QUICK_MODEL` and `OLLAMA_DEEP_MODEL` on container startup.

### 7.2 Step-by-Step macOS Self-Hosting (`scripts/start-mac.sh` & `start-mac.command`)
1. Ensure **Docker Desktop for Mac** is installed. For Apple Silicon Metal GPU acceleration, install native Ollama (`brew install ollama` or from `ollama.com`).
2. Run the turnkey launcher from Terminal (or double-click `start-mac.command` in Finder):
   ```bash
   OLLAMA_QUICK_MODEL=qwen2.5:7b OLLAMA_DEEP_MODEL=deepseek-r1:8b bash ./scripts/start-mac.sh
   ```
3. The script automatically verifies Docker Desktop, detects or launches `OLLAMA_ORIGINS="*" ollama serve` on your Mac host (or falls back to `--profile bundled-ollama`), pulls the models, and opens `http://localhost:3737`.

### 7.3 Step-by-Step Windows 10/11 Self-Hosting (`scripts/start-windows.ps1` & `scripts/start-windows.bat`)
1. Ensure **Docker Desktop for Windows (WSL2 backend)** is running.
2. Run the PowerShell launcher (or double-click `scripts\start-windows.bat`):
   ```powershell
   .\scripts\start-windows.ps1
   ```
3. The script checks whether native Windows Ollama is active on `http://localhost:11434`. If not, it checks for `nvidia-smi` and launches either `--profile bundled-ollama-gpu` (NVIDIA GPU passthrough) or `--profile bundled-ollama` (CPU), then opens `http://localhost:3737`.

### 7.4 Using the 5-Tab Interactive GUI Configuration Studio (`AI / APIs / Docker` Header Modal)
Click the **`AI / APIs / Docker`** button in the top command header to open the **5-Tab Interactive GUI Configuration Studio**:
1. **Tab 1 — Global Models & Parameters GUI**:
   - Switch between **Local Ollama Only**, **Hybrid (Ollama → Gemini)**, **Cloud Google Gemini**, or **vLLM / LM Studio (`openai_compatible`)**.
   - Configure `ollamaBaseUrl` and `openAiBaseUrl` via 1-click topology buttons (`http://localhost:11434`, `http://host.docker.internal:11434`, `http://ollama:11434`) or custom host/IP inputs.
   - Adjust **Temperature** (`0.00–1.00`), **Context Window (`num_ctx`)** (`2,048` to `32,768` tokens), **Request Timeout (sec)**, and **Devil's Advocate Debate Rounds** (`1–3`).
2. **Tab 2 — Per-Desk & 12-Agent GUI Matrix**:
   - Assign custom Ollama or OpenAI-compatible model tags and custom system prompt directives to any of the **4 Desks** (`Geopolitical`, `Sovereign Credit`, `Macroeconomic`, `Supreme Council`) or individual **Specialist Sub-Agents (`AG-1` through `AG-9`)**.
   - Click **Pull** or **Test** on any row to download the model or run a live JSON schema micro-benchmark.
   - You can also edit any agent's model tag and custom directive inline inside **Hub 4 → 9-Agent Council & Devil's Advocate Debates** (`council_debates`).
3. **Tab 3 — Docker & OS Self-Host GUI Builder**:
   - Configure Target OS, Docker ↔ Ollama topology, web app port (`PORT`), Ollama port, container name, `OLLAMA_KEEP_ALIVE`, and `OLLAMA_ORIGINS`.
   - Download the live-generated `.env` file or copy the auto-updated macOS, Windows PowerShell, and Docker Compose launch commands.
4. **Tab 4 — External & Internal API / Host GUI Connector Hub**:
   - Connect and manage **Macro & Market Data REST Feeds**, **Internal/External LLM Gateways**, and **Outbound Webhook / Risk Event Buses** (supporting both public external URLs and internal Docker/intranet hosts such as `http://host.docker.internal:8080/api/v1/sovereign/{{ISO3}}`).
   - Add custom HTTP headers (proxied server-side via `/api/connectors/ping-and-inspect` so credentials never leak to client code and browser CORS restrictions are bypassed).
   - Click **Ping & Inspect Live JSON** to measure round-trip latency (`ms`), inspect the formatted JSON response payload, map JSON dot-paths (`1.0.value`, `values.GGXWDG_NGDP.{{ISO3}}.2025`, `telemetry.gdpGrowthPct`, etc.) into live sovereign indicators (`gdpGrowth`, `cpiInflation`, `debtToGdp`, `cds5yBps`, `fxReservesMonths`, `policyRate`, `politicalStability`), and click **Apply Mapped Values to Active Sovereign** to immediately hydrate all 10 analytical hubs.
5. **Tab 5 — Top-Level Application Integration Bus (Outbound Desks, Webhooks, SSE & OpenAPI 3.1)**:
   - Configure how external applications receive desk and council outputs via **REST Pull API**, **Outbound HMAC-SHA256 Push Webhooks**, and **Real-Time Server-Sent Events (SSE)**.
   - Click **Save & Apply GUI Configuration** in the modal footer to persist all settings to both browser `localStorage` and the live Express server (`POST /api/ai/runtime-config-save`).

---

## 8. Top-Level External Application Integration Guide (`SMCR-1.0` Desk Output Bus)

Downstream applications (such as portfolio management systems, automated execution engines, or enterprise risk lakes) can consume desk outputs from this application using three real-time transport mechanisms:

### 8.1 REST Pull API (`/api/v1/integration/desks/:iso3` & `/api/v1/integration/bundle/:iso3`)
- **Pull Individual Desk Outputs**:
  ```bash
  # Pull Geopolitical Risk Desk (Debate + Sub-Agents AG-1..AG-3 + Chokepoints/Sanctions Quant Suite)
  curl -s "http://localhost:3737/api/v1/integration/desks/BRA?desk=geopolitical&includeSubAgents=true&includeQuant=true" \
    -H "X-SMCR-API-Key: smcr_live_9f8a7b6c5d4e3f2a1b"

  # Pull Sovereign Credit Desk (Debate + Sub-Agents AG-4..AG-6 + IMF SRDSF DSA & Restructuring NPV)
  curl -s "http://localhost:3737/api/v1/integration/desks/BRA?desk=sovereign"

  # Pull Macroeconomic & FX Desk (Debate + Sub-Agents AG-7..AG-9 + BVAR, NSS Curve & Liquidity Z-Score)
  curl -s "http://localhost:3737/api/v1/integration/desks/BRA?desk=macro"
  ```
- **Pull Complete `SMCR-1.0` Sovereign Bundle**:
  ```bash
  curl -s "http://localhost:3737/api/v1/integration/bundle/BRA" \
    -H "X-SMCR-API-Key: smcr_live_9f8a7b6c5d4e3f2a1b"
  ```

### 8.2 Outbound Push Webhooks & 1-Click Broadcaster (`POST /api/v1/integration/publish`)
- Whenever a Phase 1–2 or Phase 3 Council run completes (and `Auto-Broadcast Desk Outputs on Council Run` is enabled in **Tab 5**), or when you click **`Broadcast Desk Outputs Now`**, the server signs the `SMCR-1.0` JSON envelope with your configured HMAC secret (`X-SMCR-Signature-256: sha256=...`) and `POST`s it to all enabled `webhook_bus` connectors.

### 8.3 Real-Time Server-Sent Events (SSE) Stream (`GET /api/v1/integration/stream`)
- External web or Node.js/Python services can subscribe to `/api/v1/integration/stream` to receive instant push notifications (`council.phase1_2.desks_ready`, `council.phase3.supreme_verdict_ready`, `manual.gui.broadcast`) without polling.

### 8.4 OpenAPI 3.1.0 Specification (`GET /api/v1/integration/openapi.json`)
- Download `/api/v1/integration/openapi.json` (or click **Download OpenAPI 3.1 Spec (.json)** in **Tab 5**) to import all routes and schemas into Postman, Insomnia, Swagger UI, or OpenAPI client generators.



