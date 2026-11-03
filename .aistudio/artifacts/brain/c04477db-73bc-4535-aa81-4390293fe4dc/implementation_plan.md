# 3-Pillar Activity Architecture & 1–2 Screen Viewport Reorganization Plan

## 1. Confirmed Product & UX Decisions
Based on your selections, the desk will be reorganized around three core principles to maximize usability, speed, and cognitive clarity:

- **Top Navigation by Activity Pillar**: Replace the 10-hub navigation bar with **3 Primary Activity Pillars** — **Market & Trading**, **Policy Research**, and **Macroeconomic Research** — so every tool is grouped by the exact workflow being performed.
- **Strict 1–2 Screen Vertical Scroll Budget**: Eliminate long multi-page vertical stacks by introducing **Inner Card Tabs** and **Collapsible Drawers** inside dense workspaces, ensuring every view fits cleanly within 1 to 2 screens of scrolling maximum while preserving 100% of existing quantitative models and interactive functionality.
- **Consolidated 1-Line Status & Context Bar**: Replace the three stacked top banners (Morning Alpha & Catalyst Radar, Executive BLUF Scorecard, and Plain-English Desk Guide) with **one compact 1-line status bar** featuring live sovereign KPIs, an instant plain-English summary for the active tool, and 1-click **Slide-Over Drawers** for the full Morning Radar, Executive Brief, and Desk Guide.

---

## 2. System & Viewport Architecture

```
+--------------------------------------------------------------------------------------------------+
|  TOP COMMAND BAR: Sovereign Selector | 3 Activity Pillars: [Market & Trading] [Policy] [Macro]   |
+--------------------------------------------------------------------------------------------------+
|  PILLAR SUB-DESK BAR: Categorized Sub-Tabs for the Active Pillar + Quick Search / IC Drawer      |
+--------------------------------------------------------------------------------------------------+
|  1-LINE COMPACT STATUS BAR:                                                                      |
|  [Sovereign KPIs: Debt/GDP • 5Y CDS • 10Y Yield] | Plain-English Summary | [Radar] [BLUF] [Guide]|
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|  ACTIVE WORKSPACE CANVAS (Strict 1–2 Screen Max Vertical Scroll Budget)                          |
|  +--------------------------------------------------------------------------------------------+  |
|  |  INNER CARD TABS (For Multi-Block Views):                                                  |  |
|  |  e.g. [ 1. Primary Interactive Engine ]  [ 2. Deep-Dive Matrix / Curve ]  [ 3. Diagnostics]|  |
|  +--------------------------------------------------------------------------------------------+  |
|  |                                                                                            |  |
|  |  Focused 12-Column Bento Grid (Maximum 2–3 Cards Visible Simultaneously)                   |  |
|  |  • Real-Time Data Provenance Badges on every chart & table                                 |  |
|  |  • Interactive Statistical Reference Tooltips (VaR, CVaR, DV01, CS01, Beer/Feer, etc.)     |  |
|  |                                                                                            |  |
|  +--------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Three Primary Activity Pillars & Desk Mapping

### Pillar 1: Market & Trading
Focused on sovereign fixed-income execution, relative-value pricing, curve carry/roll-down, derivatives basis, and portfolio risk management.
- **Yield Curve & NSS Carry/Roll Lab**: 2Y–30Y Nelson-Siegel-Svensson term structure, 12M carry + roll-down decomposition, and key-rate DV01 hedging.
- **CDS Hazard & Basis Arbitrage**: ISDA survival probability bootstrap, bond-CDS negative basis screener, and market-implied default probability.
- **Relative Value & Execution Blotter**: 6-bond benchmark pricing table, live DV01/CS01 calculator, and limit-order book simulator.
- **EMBI Portfolio & Stress-Test Lab**: Multi-sovereign portfolio optimizer, batch currency + spread shock scenario lab, and network contagion simulator.
- **Market Signals & Backtesting**: Top-5 quantitative trade recommendations, walk-forward systematic strategy backtester, and prediction market vs. CDS dislocation screener.
- **Head-to-Head Sovereign Comparator & Catalyst Calendar**: Side-by-side 2–3 sovereign radar comparison and upcoming MPC/IMF/CPI volatility calendar.

### Pillar 2: Policy Research
Focused on central bank monetary reaction functions, treasury issuance strategy, IMF DSA restructuring mechanics, ratings governance, and policy document analysis.
- **Monetary Policy & Fiscal Dominance**: Central Bank Taylor Rule vs. actual policy rate gap and fiscal dominance inflation tax simulator.
- **Debt Restructuring & CAC Waterfall**: Sovereign Haircut & NPV recovery solver across Eurobonds, multilaterals, and domestic T-bills with collective action clause voting thresholds.
- **Treasury Issuance & Shadow Ratings**: 24-month DMO gross financing needs (GFN) auction simulator, ordered-logit shadow credit rating model, and domestic bank sovereign-bank doom-loop stress test.
- **Policy Document & Central Bank AI**: Live MPC statement and IMF Article IV hawkish/dovish sentiment decoder, plus custom sovereign scenario builder.
- **9-Agent Council & CRO Governance**: Interactive 9-agent institutional committee debate, transcript synthesis, and Chief Risk Officer model validation & audit matrix.
- **Climate Transition & SLB Greenium**: NGFS physical/transition climate risk pathways and sustainability-linked bond step-up coupon calculator.

### Pillar 3: Macroeconomic Research
Focused on structural macro fundamentals, debt sustainability trajectories, econometric regressions, FX equilibrium valuation, and geopolitical supply-chain shocks.
- **Global Macro Map & Horizon Forecasts**: Interactive geopolitical map, 2×2 baseline/bull/bear fan charts, debt maturity wall, and cross-asset sensitivity matrix.
- **Debt Sustainability (DSA) & Fan Charts**: Deterministic `r − g` debt dynamics workbench, primary balance stabilizer, and 1,000-path Monte Carlo stochastic debt cone.
- **FX Equilibrium & Econometric Lab**: BEER/FEER real effective exchange rate misalignment model, Matrix OLS (Newey-West HAC) regression lab, and Bayesian macro surprise updater.
- **Geopolitical Wargaming & Chokepoints**: Sanctions & FX reserve custody freeze simulator, maritime trade chokepoint supply-chain matrix, and bilateral trade/banking contagion network.
- **Historical Crisis Replay & Data Export**: 5-crisis historical backtest replay (Argentina 2001, Greece 2012, Sri Lanka 2022, etc.) and one-click LaTeX/CSV/JSON institutional dossier export.

---

## 4. Enforcing the 1–2 Screen Scroll Limit Across Every View

1. **Consolidated 1-Line Top Status Bar + Slide-Over Drawers**:
   - Saves over 650px of vertical height above the fold on every single screen.
   - Displays live active sovereign headline metrics (`Debt/GDP`, `5Y CDS`, `10Y Yield`, `Reserves`, `Regime`), a concise 1-line plain-English explanation of the current desk, and 3 instant drawer buttons:
     - **Morning Alpha Radar Drawer**: Top-3 daily sovereign dislocations, upcoming 7-day macro catalysts, and 1-click trade staging.
     - **Executive BLUF Scorecard Drawer**: Full 6-KPI sovereign scorecard, bottom-line investment thesis, and 1-click PDF/Print briefing.
     - **Desk Clarity Guide & Formula Glossary Drawer**: Plain-English user guide for the active tool, input/output translation, and interactive mathematical definitions.
2. **Tabbed Multi-Section Workbenches**:
   - The Flagship Macro Overview (`Global Macro Map & Horizon Forecasts`) is segmented into three clean inner tabs so users never scroll past 1.5 screens:
     - **Tab A — Geopolitical Map & Sovereign Watchlist**: Interactive world choropleth, shipping chokepoints, and 38-country peer selector.
     - **Tab B — 2×2 Macro & Debt Horizon Charts**: Real GDP, CPI inflation, Debt/GDP trajectory, and 10Y yield fan charts with interactive horizon scrubber.
     - **Tab C — Debt Maturity Wall & Cross-Asset Betas**: Sovereign amortization schedule (2025–2033), DXY/Brent/UST10Y factor betas, and desk contagion bars.
   - Every deep-dive workbench is wrapped in a **Viewport Page Budget Container** that automatically organizes tall multi-card views into clean **Page 1 / Page 2** inner section tabs whenever content would otherwise exceed 1.5–2 screens of vertical height.
