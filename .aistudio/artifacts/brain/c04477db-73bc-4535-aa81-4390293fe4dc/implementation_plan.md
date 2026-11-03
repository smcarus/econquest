# Iterative Clarity & Simplicity Master Plan: World-Class Institutional Desk UX

## 1. Executive Vision
Transform the **Sovereign Council Orchestrator of EconQuest** from a dense multi-panel terminal into the **highest-clarity, simplest, and fastest sovereign intelligence desk in the world**—preserving 100% of its econometric and institutional rigor while eliminating vertical scrolling fatigue, header clutter, and cognitive overload.

---

## 2. Four Core Iterative Upgrades (Executed Immediately in This Pass)

### Iteration 1: Above-the-Fold Workspace — Compact 1-Line BLUF Ribbon on Hubs 2–10
- **Problem Solved**: Previously, the full 450px `<ExecutiveBriefScorecard />` stayed expanded at the top of every hub, pushing Hubs 2–10 below the fold on laptop and desktop monitors.
- **Solution (`/src/components/ExecutiveBriefScorecard.tsx`)**:
  - **Hub 1 (`Overview, Maps & Charts`)**: Shows the full Executive Brief Scorecard by default (with a `Collapse to 1-Line Ribbon` toggle).
  - **Hubs 2–10 (All Specialized Quant, Geo, Portfolio, Ratings, Restructuring & Persona Desks)**: Automatically collapses into a **razor-sharp, 44px 1-Line Institutional Verdict Ribbon** displaying:
    - `Active Sovereign (ISO-3 · Currency)`
    - `Council Verdict Badge (Execute / Defensive Hedge / Hold)` & `Composite Risk (0–100)`
    - `Key Live Anchors: Debt/GDP (%) · 5Y CDS (bps) · 10Y Yield (%) · FX Import Cover (mos)`
    - One-click **`Expand Full BLUF Scorecard ▾`** button whenever the user wants the 4-pillar summary cards and decision matrix.
  - **Impact**: Every specialized hub (`5.6 Alpha Correlation Matrix`, `2.1 Forecasting Lab`, `8.1 Shadow Ratings`, `10.1 Signal Scanner`, etc.) now starts **immediately at the top of the viewport**.

### Iteration 2: Streamlined Low-Profile Command Bar & Pinned 1-Click Sovereign Pill Switcher
- **Problem Solved**: Multiple stacked toolbar rows and requiring the left sidebar to switch countries consumed both vertical and horizontal real estate.
- **Solution (`/src/App.tsx`)**:
  - **Unified Contextual Sub-Bar**: Consolidates the active hub's sub-module tabs, layout switcher, and a **Pinned 1-Click Sovereign Switcher Pill Strip** (`BRA`, `MEX`, `JPN`, `DEU`, `TUR`, `ZAF`, `EGY`, `ARG`, plus any custom onboarded ISO-3 sovereigns and `+ ISO-3`) into a sleek, low-profile strip.
  - **Collapsible Scenario Directive & Live Sync Popover**: Tucks the free-text Scenario Directive input into a clean expandable inline bar (`Scenario Query ▾`) so it never wastes a full row when not being typed into.
  - **Impact**: Users can switch between any sovereign in **1 click** from anywhere in the app without needing the left sidebar open.

### Iteration 3: Smart Auto-Collapse of Left Watchlist Sidebar on Wide Matrix & Quant Hubs
- **Problem Solved**: Wide $N \times N$ correlation heatmaps (`5.6`), multi-column trade blotters (`5.4`), peer dislocation matrices (`7.1`), shadow rating tables (`8.1`), and cross-hub signal scanners (`10.1`) were squeezed into 9 columns while the 3-column Watchlist sidebar remained open.
- **Solution (`/src/App.tsx`)**:
  - Automatically collapses the left Watchlist sidebar (`isWatchlistCollapsed = true`) when navigating into wide analytical hubs (`Hubs 2–10` and `1.2 Peer Relative Value`), granting the active desk the **full 12-column (`1600px`) width**.
  - Returning to `1.1 Overview` or clicking the `Watchlist` toggle button in the sub-bar opens or pins the full Watchlist Manager sidebar anytime.

### Iteration 4: Global `Simple Brief` vs. `Pro Quant` Density Mode & Plain-English Desk Synthesis Banner
- **Problem Solved**: First-time users, macro traders looking for a 5-second signal, and executives reviewing a specific desk need an instant, zero-jargon answer before diving into dense econometric tables.
- **Solution (`/src/components/DeskClaritySynthesisBanner.tsx` & `/src/App.tsx`)**:
  - Adds a global **`Simple Brief` / `Pro Quant`** density toggle in the top header:
    - **Dynamic Plain-English Desk Synthesis Card**: At the top of every hub (`1` through `10`), renders a crisp **3-Column "Desk Bottom Line" Bar** customized to the exact active sub-module and active sovereign:
      1. **What This Desk Shows (Plain English)**: 1-sentence zero-jargon explanation of the current module.
      2. **Live Signal for Active Sovereign**: The exact live quantitative reading (`bps`, `% of GDP`, `notches`, `ρ`, `Z-score`) and why it matters right now.
      3. **Actionable Next Step / Edge**: Specific trader, institutional PM, or researcher action with a 1-click jump button.
    - In **`Simple Brief` Mode**, this plain-English synthesis banner is prominently highlighted with enlarged typography and clean visual breathing room; in **`Pro Quant` Mode**, it condenses into a compact 1-line analytical header above the full econometric workbenches.

---

## 3. Verification & Quality Guardrails
- **100% Feature Preservation**: Zero analytical engines, tabs, sliders, or exports are removed—every capability across all 10 hubs and 37 sub-modules remains intact and faster to reach.
- **Strict Zero-Notional Ratio Discipline**: All metrics in the new synthesis banners and BLUF ribbon strictly use `% of GDP`, `% weight`, `bps`, `notches (1–21)`, `0–100¢`, `ρ`, and `months of imports`.
- **Build & Type Check**: Verify with `compile_applet` and `lint_applet` (`0` errors).
