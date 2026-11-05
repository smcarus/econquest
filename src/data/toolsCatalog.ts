/**
 * The Tools page (Sam, 2026-11-05: "finish the tools page", under the no-built-in-figures rule).
 *
 * READY tools run only on live feeds, official series and your own files, and show Missing with the
 * reason otherwise. HIDDEN desks are the older library: each computes from built-in example figures,
 * so it stays hidden until the data it needs is connected. Each says what that data is, and which
 * ready tool covers the same question today.
 */

export type ToolTarget =
  | { area: 'today'; anchor: string }
  | { area: 'country'; tab: 'brief' | 'macro' | 'overview'; brief?: 'economist' | 'banker' | 'official' }
  | { area: 'reports' }
  | { area: 'portfolio' };

export interface ReadyTool {
  id: string;
  title: string;
  what: string;
  sources: string;
  target: ToolTarget;
}

export const READY_TOOLS: ReadyTool[] = [
  {
    id: 'ask_council',
    title: 'Ask the council',
    what: 'Ask a question about your watchlist. Desk agents answer from live figures with their sources, and a synthesis agent may quote only those figures.',
    sources: 'Live figures below; Gemini or Ollama for the summary, if set up',
    target: { area: 'today', anchor: 'tool-council' },
  },
  {
    id: 'marketedge',
    title: 'MarketEdge screen',
    what: 'Your watchlist plus the US, China, Russia, UK, EU and India: 10Y yield, spread over the US, CDS, risk score and real FX against its own history.',
    sources: 'Official 10Y yields (FRED/OECD, Tesouro, EVDS), your CDS file, BIS real exchange rates',
    target: { area: 'today', anchor: 'tool-marketedge' },
  },
  {
    id: 'divergences',
    title: 'Where data and price disagree',
    what: 'One line per country, biggest gap first: cheap or rich CDS against peers, policy rate against inflation, carry and currency valuation.',
    sources: 'Live IMF and World Bank figures, official yields, your CDS file, BIS',
    target: { area: 'today', anchor: 'tool-divergences' },
  },
  {
    id: 'scenarios',
    title: 'Scenario exposure',
    what: 'Who is most exposed to a Hormuz closure, a Taiwan blockade or tighter Russia sanctions, from trade and energy shares.',
    sources: 'World Bank and WITS trade data',
    target: { area: 'today', anchor: 'tool-scenarios' },
  },
  {
    id: 'calendar',
    title: 'Official calendar',
    what: 'Rate decisions, CPI releases, elections, budget deadlines and IMF reviews, each linked to its source.',
    sources: 'Central bank, statistics office and election calendars on file',
    target: { area: 'today', anchor: 'tool-calendar' },
  },
  {
    id: 'economist_brief',
    title: 'Country economist brief',
    what: 'Growth, inflation, debt, reserves and the external position for the open country, with the rule behind each observation.',
    sources: 'IMF WEO, World Bank, official yields',
    target: { area: 'country', tab: 'brief', brief: 'economist' },
  },
  {
    id: 'issuer_brief',
    title: 'Issuer note',
    what: 'Market access, debt falling due in the next 12 months, distress tests and pricing against peers on official yields.',
    sources: 'World Bank/IMF QEDS, BIS debt securities, official yields, your CDS file',
    target: { area: 'country', tab: 'brief', brief: 'banker' },
  },
  {
    id: 'sustainability',
    title: 'Debt sustainability',
    what: 'Debt path under baseline and shock scenarios, the stabilising primary balance and r minus g, run only when every input is live.',
    sources: 'IMF WEO debt, growth, inflation and primary balance; official 10Y yield',
    target: { area: 'country', tab: 'brief', brief: 'official' },
  },
  {
    id: 'country_marketedge',
    title: 'Country markets and macro',
    what: 'The open country against its peers: CDS fitted on the risk score, policy stance, FX valuation, carry per unit of volatility, futures positioning, US Treasury holdings and the OECD leading indicator.',
    sources: 'Live feeds, official yields, BIS, ECB exchange rates, CFTC Commitments of Traders, US Treasury TIC, OECD, your CDS file',
    target: { area: 'country', tab: 'macro' },
  },
  {
    id: 'what_is_live',
    title: 'What is live',
    what: 'Every figure the country pages use, with its source, or why it is missing and what would fill it.',
    sources: 'All connected feeds',
    target: { area: 'country', tab: 'overview' },
  },
  {
    id: 'book',
    title: 'Book and client briefs',
    what: 'Concentration, where the risk sits and dates to watch across your holdings, or your watchlist at equal weight.',
    sources: 'Your holdings file, live risk scores, your CDS file, official yields',
    target: { area: 'portfolio' },
  },
  {
    id: 'reports',
    title: 'Reports',
    what: 'Country note, issuer note, sustainability assessment, portfolio and client reviews, and the council brief, as Markdown or PDF.',
    sources: 'The briefs above',
    target: { area: 'reports' },
  },
];

export interface HiddenDesk {
  id: string;
  label: string;
  /** The data it would need to run on real figures. */
  needs: string;
  /** A ready tool that answers the same question today, by READY_TOOLS id. */
  coveredBy?: string;
}

export interface HiddenGroup {
  title: string;
  desks: HiddenDesk[];
}

export const HIDDEN_GROUPS: HiddenGroup[] = [
  {
    title: 'Markets and trading',
    desks: [
      { id: 'quant_nss_yield_curve', label: 'Yield curve and carry', needs: 'Government yields at every maturity (an official curve file or a licensed feed).' },
      { id: 'quant_cds_basis', label: 'CDS curve and basis', needs: 'A CDS curve by tenor and bond prices (licensed).' },
      { id: 'quant_trade_blotter', label: 'Trade blotter and DV01', needs: 'Bond-level positions with prices.' },
      { id: 'market_maker_alpha', label: 'Order book depth', needs: 'Dealer quotes and order book data (licensed).' },
      { id: 'decision_prediction_markets', label: 'Prediction markets', needs: 'Kalshi prices; Polymarket is connected for the council only.' },
      { id: 'quant_macro_catalyst_calendar', label: 'Event volatility calendar', needs: 'Option-implied volatility (licensed).', coveredBy: 'calendar' },
      { id: 'persona_cross_hub_signal_scanner', label: 'Signal scanner', needs: 'Live inputs for every signal it combines.', coveredBy: 'divergences' },
      { id: 'decision_dislocation_screener', label: 'Model against market', needs: 'Live CDS for every country.', coveredBy: 'divergences' },
      { id: 'risk_analytics', label: 'Peer z-score matrix', needs: 'Live risk inputs for a full peer set.', coveredBy: 'marketedge' },
    ],
  },
  {
    title: 'Portfolio',
    desks: [
      { id: 'quant_portfolio_stress_lab', label: 'Portfolio stress lab', needs: 'Your holdings plus live CDS and yields for every holding.', coveredBy: 'book' },
      { id: 'embi_portfolio_pair_book', label: 'EMBI pair book', needs: 'EMBI index weights and bond prices (licensed).' },
      { id: 'portfolio_risk_desk', label: 'Contagion and CVaR', needs: 'Price history for each holding, to estimate correlations.' },
      { id: 'quant_alpha_correlation', label: 'Correlation matrix', needs: 'Daily price history across countries.' },
      { id: 'persona_strategy_backtester_lab', label: 'Strategy backtester', needs: 'Historical price series.' },
      { id: 'decision_premortem_killswitch', label: 'Pre-mortem and stop levels', needs: 'Staged trades priced off live markets.' },
      { id: 'decision_ledger_brier', label: 'Decision record', needs: 'A record of past calls and their outcomes, which builds up over time.' },
    ],
  },
  {
    title: 'Debt and policy',
    desks: [
      { id: 'forecasting_lab', label: 'Debt fan charts', needs: 'Historical shock series for the fan; the central path is in the sustainability brief.', coveredBy: 'sustainability' },
      { id: 'taylor_rule_fiscal_dominance', label: 'Taylor rule', needs: 'An output gap (the policy rate now comes from the BIS).' },
      { id: 'dmo_treasury_auction_sim', label: 'Auction simulator', needs: 'The debt office auction calendar and results.' },
      { id: 'ratings_shadow_fallen_angel', label: 'Shadow rating', needs: 'Ratings history (licensed).' },
      { id: 'debt_investor_base_doom_loop', label: 'Investor base and banks', needs: 'Holders of government debt by sector.' },
      { id: 'restructuring_npv_cac_waterfall', label: 'Restructuring waterfall', needs: 'Bond terms and creditor composition.' },
      { id: 'quant_restructuring_npv', label: 'Haircut and exit yield', needs: 'Bond cash flows and prices.' },
      { id: 'ngfs_climate_slb_greenium', label: 'Climate stress', needs: 'NGFS scenario data and green bond prices.' },
    ],
  },
  {
    title: 'Macro',
    desks: [
      { id: 'charts_watchlists', label: 'Macro map and horizon charts', needs: 'Live history for each charted series.', coveredBy: 'what_is_live' },
      { id: 'global_liquidity', label: 'Global liquidity', needs: 'Cross-currency basis and funding spreads (licensed).' },
      { id: 'decision_quadrant_stress', label: 'Regime quadrant', needs: 'Live growth and inflation history.' },
      { id: 'fx_beer_feer_equilibrium', label: 'FX equilibrium models', needs: 'Productivity and terms-of-trade series.', coveredBy: 'country_marketedge' },
      { id: 'quant_matrix_econometrics', label: 'Econometrics', needs: 'Historical series for the regressions.' },
      { id: 'quant_macro_surprise', label: 'Data surprises', needs: 'Consensus forecasts (licensed).' },
    ],
  },
  {
    title: 'Geopolitics',
    desks: [
      { id: 'geopolitical_desk', label: 'Wargaming', needs: 'Conflict event data beyond GDELT (ACLED is not connected).', coveredBy: 'scenarios' },
      { id: 'supply_chain_matrix', label: 'Supply-chain matrix', needs: 'Product-level trade flows.', coveredBy: 'scenarios' },
      { id: 'geopolitical_reserves_chokepoints', label: 'Reserve custody', needs: 'Reserve holdings by custodian, which countries do not publish.' },
      { id: 'backtest_engine', label: 'Crisis replay', needs: 'A historical crisis data set.' },
    ],
  },
  {
    title: 'Documents and council',
    desks: [
      { id: 'mpc_imf_document_ai', label: 'Policy document reader', needs: 'An uploaded document (planned in the council work).' },
      { id: 'policy_doc_lab', label: 'Document and CSV lab', needs: 'An uploaded document or file (planned).' },
      { id: 'council_debates', label: 'Council debate', needs: 'Debate between the agents, which is planned for Ask the council.', coveredBy: 'ask_council' },
      { id: 'cro_reports', label: 'Risk sign-off dossier', needs: 'Covered by the approval step in Ask the council.', coveredBy: 'ask_council' },
      { id: 'persona_guided_playbook_cockpit', label: 'Guided playbooks', needs: 'Covered by the report templates.', coveredBy: 'reports' },
      { id: 'ic_pitchbook_dossier_exporter', label: 'Pitchbook export', needs: 'Covered by Reports.', coveredBy: 'reports' },
      { id: 'persona_academic_latex_csv_exporter', label: 'LaTeX and CSV export', needs: 'Covered by the Markdown export in Reports.', coveredBy: 'reports' },
    ],
  },
];

export const READY_BY_ID = Object.fromEntries(READY_TOOLS.map((t) => [t.id, t])) as Record<string, ReadyTool>;
