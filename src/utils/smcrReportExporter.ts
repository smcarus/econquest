import { jsPDF } from 'jspdf';
import { approvalText, coherenceText, compositeText, riskPctText } from './councilResult';
import { AIRuntimeConfig, CouncilAssessmentRun } from '../types/council';
import { computeFullEconometricForecastSuite } from './econometricForecastingEngine';
import { runSovereignStrategyBacktest } from './strategyBacktestingEngine';
import {
  buildDefaultPortfolioPositions,
  computeCrossCurrencyAndLegalBasis,
  computeMultiSovereignPortfolioRisk,
  simulateSovereignRestructuringAndRating,
} from './institutionalRiskDeskEngine';
import { computeGeopoliticalRiskDeskSuite } from './geopoliticalRiskEngine';
import { computeInstitutionalSupplyChainMatrix } from './supplyChainMatrixEngine';
import { computeGlobalLiquidityFundingSuite } from './globalLiquidityEngine';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';

/**
 * Generates the Canonical SMCR-1.0 JSON-Schema Envelope
 * Standardized for both human auditors and downstream AI platforms (Ollama, LangGraph, MCP, OpenAI/Anthropic)
 */
export function buildCanonicalSMCREnvelope(run: CouncilAssessmentRun) {
  const sc = run.supremeCouncil;
  const econ = computeFullEconometricForecastSuite(run.openData);
  const backtest = runSovereignStrategyBacktest(run.openData);
  const portfolioRisk = computeMultiSovereignPortfolioRisk(
    run,
    buildDefaultPortfolioPositions(run.iso3, SOVEREIGN_CATALOG)
  );
  const restructuring = simulateSovereignRestructuringAndRating(run.openData);
  const xccyBasis = computeCrossCurrencyAndLegalBasis(run.openData);
  const geoDesk = computeGeopoliticalRiskDeskSuite(run.openData);
  const supplyChainMatrix = computeInstitutionalSupplyChainMatrix(run.openData);
  const globalLiquidity = computeGlobalLiquidityFundingSuite(run.openData);
  return {
    $schema: 'https://econquest.org/schemas/smcr-v1.0.json',
    schema_version: 'SMCR-1.0',
    platform_name: 'Sovereign Council Orchestrator of EconQuest',
    platform_tagline:
      'A premier, multi-agent global macroeconomic, hedge fund simulation, investment banking risk engine, and sovereign policy research platform.',
    sec_01_provenance_and_header: {
      report_id: sc?.reportId || run.runId,
      generated_at_iso8601: sc?.generatedAt || new Date().toISOString(),
      target_sovereign_iso3: run.iso3,
      target_country_name: run.countryName,
      currency_code: run.openData.currencyCode,
      scenario_directive: run.scenarioPrompt,
      runtime_engine: run.runtimeUsed,
      data_provenance_tiers: {
        tier_1_multilateral_apis: [
          'IMF DataMapper WEO v1 (GGXWDG_NGDP, GGXCNL_NGDP, PCPIPCH, NGDP_RPCH)',
          'World Bank Open Data v2 (FI.RES.TOTL.MO, BN.CAB.XOKA.GD.ZS, DT.DOD.DECT.GN.ZS)',
          'US Treasury Fiscal Data Exchange Rates API',
          'BIS Central Bank Policy Rate Series',
        ],
        tier_2_prediction_and_event_feeds: [
          'Polymarket Gamma Real-Money Odds API',
          'GDELT 2.0 Global Knowledge Graph Event & Tone API',
        ],
        tier_3_search_and_primary_policy_docs: [
          run.policyDocumentTitle || 'IMF Article IV Staff Concluding Statement',
          'Google Search Grounding Citations',
        ],
      },
    },
    sec_02_executive_decision_verdict: {
      decision_verdict: sc?.decisionVerdict || 'DEFENSIVE_HEDGE',
      composite_risk_score: sc?.compositeRiskScore ?? null,
      global_coherence_score: typeof sc?.globalCoherenceScore === 'number' ? sc.globalCoherenceScore : null,
      executive_summary: sc?.executiveSummary || '',
      three_regime_probability_matrix: run.regimeDistribution,
      historical_crisis_analogs: run.crisisAnalogs,
    },
    sec_03_decision_point_threshold_matrix: sc?.decisionPointMatrix || [],
    sec_04_desk_dialectical_and_quantitative_ledger: {
      telemetry_snapshot: {
        imf_gross_debt_pct_gdp: run.openData.imfIndicators.debtToGdpPct,
        imf_gross_debt_2027f_pct_gdp: run.openData.imfIndicators.debtToGdpForecast2027Pct,
        imf_primary_balance_pct_gdp: run.openData.imfIndicators.primaryFiscalBalancePct,
        imf_real_gdp_growth_pct: run.openData.imfIndicators.realGdpGrowthPct,
        imf_headline_cpi_pct: run.openData.imfIndicators.cpiInflationPct,
        wb_fx_reserves_months_imports: run.openData.worldBankIndicators.fxReservesMonthsImport,
        wb_current_account_pct_gdp: run.openData.worldBankIndicators.currentAccountPctGdp,
        cb_policy_rate_pct: run.openData.monetaryAndMarket.policyRatePct,
        sovereign_10y_yield_pct: run.openData.monetaryAndMarket.sovereign10YBondYieldPct,
        cds_5y_spread_bps: run.openData.monetaryAndMarket.cds5YSpreadBps,
        gdelt_conflict_index: run.openData.gdeltMetrics.conflictIntensityIndex,
        dsa_r_minus_g_pct: run.openData.dsaAnalytics.rMinusGDifferentialPct,
        dsa_consolidation_gap_pct_gdp: run.openData.dsaAnalytics.fiscalConsolidationGapPct,
        greenspan_guidotti_ratio_pct: run.openData.debtRollover.greenspanGuidottiRatioPct,
      },
      econometric_forecast_suite: {
        monte_carlo_2030_median_debt_pct_gdp: econ.stochasticDsa.medianDebt2030PctGdp,
        monte_carlo_2030_p95_debt_pct_gdp: econ.stochasticDsa.p95Debt2030PctGdp,
        monte_carlo_distress_probability_pct: econ.stochasticDsa.probabilityOfDistress2030Pct,
        growth_at_risk_5th_pct_yoy: econ.garFarTail.gdpGar5thPercentilePct,
        fiscal_at_risk_95th_pct_gdp: econ.garFarTail.fiscalFar95thDeficitPctGdp,
        nss_10y_term_premium_bps: econ.nssTermStructure.tenYearTermPremiumBps,
        kaminsky_reinhart_ews_crisis_zscore: econ.markovEws.compositeCrisisZScore,
        markov_12m_crisis_transition_prob_pct: econ.markovEws.crisisProbability12MPct,
      },
      strategy_backtest_summary: {
        benchmark_label: backtest.benchmarkLabel,
        cumulative_net_alpha_pct: backtest.netCumulativeAlphaPct,
        annualized_alpha_pct: backtest.annualizedAlphaPct,
        information_ratio: backtest.informationRatio,
        overall_hit_rate_pct: backtest.overallHitRatePct,
        desk_attribution: backtest.deskAttribution,
      },
      institutional_risk_desk_suite: {
        portfolio_cvar_99_ten_day_pct_nav: portfolioRisk.expectedShortfallCvar99TenDayPct,
        portfolio_lvar_99_ten_day_pct_nav: portfolioRisk.liquidityAdjustedLvar99TenDayPct,
        net_portfolio_rate_dv01_usd_thousands: portfolioRisk.totalNetRateDv01UsdThousands,
        net_portfolio_credit_cs01_usd_thousands: portfolioRisk.totalNetCreditCs01UsdThousands,
        restructured_npv_recovery_cents: restructuring.restructuredNpvRecoveryCents,
        cds_5y_cumulative_default_prob_pct: restructuring.cdsImplied5YCumulativeDefaultProbPct,
        five_year_fx_hedged_pickup_over_eurobond_bps: xccyBasis.fiveYearNetHedgedPickUpBps,
        ny_law_jurisdictional_spread_bps:
          xccyBasis.legalAndLiquidity.jurisdictionalLegalSpreadBps,
      },
      geopolitical_risk_desk_suite: {
        composite_gpr_zscore: geoDesk.gprAndEscalation.compositeGprZScore,
        gpr_threat_zscore: geoDesk.gprAndEscalation.gprThreatZScore,
        gpr_act_zscore: geoDesk.gprAndEscalation.gprActZScore,
        chokepoint_cpi_passthrough_bps: geoDesk.aggregateChokepointCpiPassThroughBps,
        sanctions_insulated_import_cover_months:
          geoDesk.sanctionsAndReserves.sanctionsInsulatedImportCoverMonths,
        top_ranked_geopolitical_tail_hedge: geoDesk.topRankedHedgeInstrument,
      },
      supply_chain_leontief_matrix: {
        aggregate_leontief_multiplier: supplyChainMatrix.aggregateLeontiefMultiplier,
        total_economy_output_contraction_pct_gdp:
          supplyChainMatrix.totalEconomyOutputContractionPctGdp,
        total_supply_chain_ppi_passthrough_bps:
          supplyChainMatrix.totalSupplyChainPpiPassThroughBps,
        earliest_production_halt_day: supplyChainMatrix.earliestProductionHaltDay,
        most_vulnerable_input_label: supplyChainMatrix.mostVulnerableInputLabel,
        total_ib_working_capital_need_usd_millions:
          supplyChainMatrix.totalIbWorkingCapitalNeedUsdMillions,
        top_hedge_fund_supply_chain_trade:
          supplyChainMatrix.ibSectorImpacts[0]?.hedgeFundTradeExpression || '',
      },
      global_liquidity_funding_suite: {
        global_liquidity_stress_zscore: globalLiquidity.globalLiquidityStressIndexZScore,
        us_sofr_rate_pct: globalLiquidity.usSofrRatePct,
        us_3m_fra_ois_spread_bps: globalLiquidity.us3mFraOisSpreadBps,
        us_gc_repo_sofr_spread_bps: globalLiquidity.usGcRepoSofrSpreadBps,
        fed_srf_draws_usd_bn: globalLiquidity.fedSrfDrawsUsdBn,
        fed_on_rrp_balance_usd_bn: globalLiquidity.fedOnRrpBalanceUsdBn,
        fed_swap_lines_total_usd_bn: globalLiquidity.fedSwapLinesTotalUsdBn,
        target_sovereign_rollover_spread_delta_bps:
          globalLiquidity.portfolioTransmission.targetSovereignExternalRolloverSpreadDeltaBps,
        ib_treasury_advisory_mandate:
          globalLiquidity.portfolioTransmission.ibTreasuryAdvisoryMandate,
        hf_relative_value_arbitrage_trade:
          globalLiquidity.portfolioTransmission.hfRelativeValueArbitrageTrade,
      },
      sub_agent_reports: run.subAgents,
      desk_debates: run.deskDebates,
    },
    sec_05_cross_desk_cascade_and_cro_audit: {
      dependency_cascade_steps: run.cascadeSteps,
      cro_human_in_the_loop_gate: run.croState,
    },
    sec_06_dual_audience_execution_plan: {
      block_6a_policy_researcher_memo: sc?.policyResearcherReport,
      block_6b_asset_manager_market_translation: sc?.marketTranslationLayer,
    },
    sec_07_formal_minority_report_dissents: [
      ...(run.deskDebates.geopolitical.minorityDissents || []),
      ...(run.deskDebates.sovereign.minorityDissents || []),
      ...(run.deskDebates.macro.minorityDissents || []),
    ],
  };
}

/**
 * Generates Standardized YAML-Frontmatter + GFM Markdown (SMCR-1.0)
 * Engineered for zero-ambiguity ingestion by other LLMs, RAG pipelines, Obsidian, or human analysts
 */
export function buildSMCRMarkdownReport(run: CouncilAssessmentRun): string {
  const env = buildCanonicalSMCREnvelope(run);
  const sc = run.supremeCouncil;
  const dissents = env.sec_07_formal_minority_report_dissents;

  return `---
schema_version: "SMCR-1.0"
platform: "Sovereign Council Orchestrator of EconQuest"
report_id: "${env.sec_01_provenance_and_header.report_id}"
generated_at: "${env.sec_01_provenance_and_header.generated_at_iso8601}"
target_iso3: "${run.iso3}"
target_country: "${run.countryName}"
currency: "${run.openData.currencyCode}"
decision_verdict: "${env.sec_02_executive_decision_verdict.decision_verdict}"
composite_risk_score: ${env.sec_02_executive_decision_verdict.composite_risk_score}
global_coherence_score: ${env.sec_02_executive_decision_verdict.global_coherence_score}
desk_risk_scores:
  geopolitical: ${run.croState.geopoliticalRiskScore}
  sovereign: ${run.croState.sovereignRiskScore}
  macroeconomic: ${run.croState.macroRiskScore}
cro_override_applied: ${run.croState.isOverridden}
---

# SOVEREIGN COUNCIL ORCHESTRATOR OF ECONQUEST — INSTITUTIONAL DOSSIER: ${run.countryName.toUpperCase()} (${run.iso3})
> *A premier, multi-agent global macroeconomic, hedge fund simulation, investment banking risk engine, and sovereign policy research platform.*

## PROVENANCE, TAXONOMY & TELEMETRY HEADER
- **Report Identifier**: \`${env.sec_01_provenance_and_header.report_id}\`
- **Target Sovereign**: ${run.countryName} (\`${run.iso3}\` · Currency: \`${run.openData.currencyCode}\`)
- **Assessment Directive**: ${run.scenarioPrompt}
- **AI Orchestration Runtime**: ${run.runtimeUsed}
- **Active Open-Data Connectors**: ${run.openData.liveApiSourcesActive.join(' · ')}

---

## EXECUTIVE DECISION VERDICT & 3-REGIME PROBABILITY SCORECARD
- **DECISION VERDICT**: **\`${env.sec_02_executive_decision_verdict.decision_verdict}\`**
- **Composite Risk Score**: \`${compositeText({ compositeRiskScore: env.sec_02_executive_decision_verdict.composite_risk_score ?? NaN })}\` (Global Coherence: \`${coherenceText({ globalCoherenceScore: env.sec_02_executive_decision_verdict.global_coherence_score })}\`)

### Executive Synthesis
${sc?.executiveSummary || 'Awaiting Supreme Council synthesis.'}

### 3-Regime Probability Distribution
| Regime Scenario | Implied Probability | 10Y / CDS Spread Delta | Institutional Regime Narrative |
| :--- | :---: | :---: | :--- |
| **Base Case**: ${run.regimeDistribution.baseCase.label} | \`${run.regimeDistribution.baseCase.probabilityPct}%\` | \`+${run.regimeDistribution.baseCase.expectedSpreadDeltaBps} bps\` | ${run.regimeDistribution.baseCase.narrative} |
| **Adverse Tail**: ${run.regimeDistribution.adverseTailCase.label} | \`${run.regimeDistribution.adverseTailCase.probabilityPct}%\` | \`+${run.regimeDistribution.adverseTailCase.expectedSpreadDeltaBps} bps\` | ${run.regimeDistribution.adverseTailCase.narrative} |
| **Reform Case**: ${run.regimeDistribution.constructiveReformCase.label} | \`${run.regimeDistribution.constructiveReformCase.probabilityPct}%\` | \`${run.regimeDistribution.constructiveReformCase.expectedSpreadDeltaBps} bps\` | ${run.regimeDistribution.constructiveReformCase.narrative} |

### Historical Crisis Analog Matches
${run.crisisAnalogs
  .map(
    (a) =>
      `- **${a.crisisName} (${a.year}) — ${a.similarityScorePct}% Similarity**: 3M FX Drawdown \`${a.historicalOutcome.fxDrawdown3MPct}%\`, Spread Widening \`+${a.historicalOutcome.sovereignSpreadWideningBps} bps\`. *Key Distinction Today*: ${a.keyDifferencesToday}`
  )
  .join('\n')}

---

## DECISION-POINT & CATALYST THRESHOLD MATRIX
| ID | Variable & Indicator | Desk | Provenance | Current Level | Bull Threshold | Bear Regime-Break Trigger | Required Institutional Action if Triggered | Urgency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
${(sc?.decisionPointMatrix || [])
  .map(
    (dp) =>
      `| \`${dp.variableId}\` | **${dp.variableName}** | ${dp.deskSource.toUpperCase()} | \`${dp.provenanceTier}\` | \`${dp.currentValue}\` | \`${dp.bullThreshold}\` | \`${dp.bearBreakTrigger}\` | ${dp.requiredActionIfTriggered} | **${dp.urgency}** |`
  )
  .join('\n')}

---

## DESK-BY-DESK DIALECTICAL LEDGER & QUANTITATIVE EVIDENCE

### Quantitative Sovereign, DSA & Macro Telemetry Snapshot
| Indicator | Value | Unit | Provenance Source |
| :--- | :---: | :---: | :--- |
| General Government Gross Debt | \`${run.openData.imfIndicators.debtToGdpPct.toFixed(1)}%\` (2027F: \`${run.openData.imfIndicators.debtToGdpForecast2027Pct.toFixed(1)}%\`) | % GDP | IMF DataMapper WEO (\`TIER_1\`) |
| Primary Fiscal Balance | \`${run.openData.imfIndicators.primaryFiscalBalancePct.toFixed(1)}%\` | % GDP | IMF Fiscal Monitor (\`TIER_1\`) |
| IMF $(r - g)$ Differential & Fiscal Gap | \`+${run.openData.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}%\` / Gap \`+${run.openData.dsaAnalytics.fiscalConsolidationGapPct.toFixed(2)}%\` | % / % GDP | IMF DSA Engine (\`TIER_1\`) |
| FX Reserves Import Cover & Greenspan-Guidotti | \`${run.openData.worldBankIndicators.fxReservesMonthsImport.toFixed(1)}m\` / \`${run.openData.debtRollover.greenspanGuidottiRatioPct}%\` | Months / % | World Bank v2 (\`TIER_1\`) |
| Current Account Balance | \`${run.openData.worldBankIndicators.currentAccountPctGdp.toFixed(1)}%\` | % GDP | World Bank v2 (\`TIER_1\`) |
| Central Bank Policy Rate / Real Rate | \`${run.openData.monetaryAndMarket.policyRatePct.toFixed(2)}%\` / \`+${run.openData.monetaryAndMarket.realPolicyRatePct.toFixed(2)}%\` | % | BIS / Central Bank (\`TIER_1\`) |
| Headline CPI Inflation YoY | \`${run.openData.imfIndicators.cpiInflationPct.toFixed(2)}%\` | % YoY | IMF WEO / National CPI (\`TIER_1\`) |
| 10Y Local Bond Yield / 5Y USD CDS | \`${run.openData.monetaryAndMarket.sovereign10YBondYieldPct.toFixed(2)}%\` / \`${run.openData.monetaryAndMarket.cds5YSpreadBps} bps\` | % / bps | Market Feed (\`TIER_1\`) |

### Internal Desk Devil's Advocate Debates
${Object.values(run.deskDebates)
  .map(
    (d) => `#### ${d.deskName} (Pre-Cascade: \`${d.preCascadeRiskScore.toFixed(2)}\` -> Post-Cascade: \`${d.postCascadeRiskScore.toFixed(2)}\` · Stance: \`${d.consensusStance}\`)
- **Consensus Synthesis**: ${d.consensusSummary}
${d.rounds
  .map(
    (r) =>
      `- **Round ${r.roundNumber} Proponent (${r.proposerAgent})**: ${r.thesis}\n- **Round ${r.roundNumber} Devil's Advocate (${r.challengerAgent})**: ${r.counterThesis}\n- **Managing Director Resolution**: ${r.deskLeadResolution}`
  )
  .join('\n')}`
  )
  .join('\n\n')}

---

## CROSS-DESK DEPENDENCY CASCADE & CRO OVERRIDE AUDIT TRAIL
${run.cascadeSteps
  .map(
    (c) =>
      `### ${c.sourceDesk.toUpperCase()} (${c.triggerAgent}) -> ${c.targetDesk.toUpperCase()} (${c.receivingAgent})
- **Shock Variable**: \`${c.shockVariable}\` (\`${c.shockDelta}\`)
- **Risk Score Shift**: \`${c.priorRiskScore.toFixed(2)}\` -> \`${c.postCascadeRiskScore.toFixed(2)}\`
- **Transmission Mechanism**: ${c.transmissionMechanism}`
  )
  .join('\n\n')}

### Human-in-the-Loop Chief Risk Officer (CRO) Checkpoint
- **Override Status**: \`${run.croState.isOverridden ? 'MANUAL CRO OVERRIDE APPLIED' : 'VERIFIED DEFAULT CONSENSUS'}\`
- **Final Approved Desk Scores**: Geopolitical \`${run.croState.geopoliticalRiskScore.toFixed(2)}\` · Sovereign \`${run.croState.sovereignRiskScore.toFixed(2)}\` · Macro \`${run.croState.macroRiskScore.toFixed(2)}\`
- **CRO Sign-Off Notes**: ${run.croState.croNotes}

---

## DUAL-AUDIENCE EXECUTION BLOCKS (POLICY MEMO + TRADE TICKETS)

### For the Policy Researcher: Structural Vulnerabilities & Interventions
${(sc?.policyResearcherReport.structuralVulnerabilities || []).map((v) => `- ${v}`).join('\n')}

| Target Authority | Recommended Policy Intervention | Expected Quantitative Impact | Priority |
| :--- | :--- | :--- | :---: |
${(sc?.policyResearcherReport.policyRecommendations || [])
  .map((p) => `| **${p.authority}** | ${p.action} | ${p.expectedImpact} | \`${p.priority}\` |`)
  .join('\n')}

### For the Asset Manager / Trader: Market Translation & Trade Tickets
- **Portfolio Regime Stance**: \`${sc?.marketTranslationLayer.regimeStance || ''}\`
- **Risk Guardian Approval**: \`${approvalText(sc?.marketTranslationLayer.riskGuardianCheck.approvalStatus)}\` (Liquidity Haircut: \`${riskPctText(sc?.marketTranslationLayer.riskGuardianCheck.liquidityHaircutPct)}\`, Max Drawdown Est: \`${riskPctText(sc?.marketTranslationLayer.riskGuardianCheck.maxDrawdownEstimatePct)}\`)
- **Factor Crowding Audit**: ${sc?.marketTranslationLayer.riskGuardianCheck.factorCrowdingWarning || ''}

| Ticket ID | Asset Class | Instrument | Direction | Weight | Horizon | Entry / Target | Hard Invalidation / Stop Trigger |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
${(sc?.marketTranslationLayer.tradeExpressions || [])
  .map(
    (t) =>
      `| \`${t.ticketId}\` | ${t.assetClass} | **${t.instrument}** | \`${t.direction}\` | \`${t.sizingWeightPct}%\` | ${t.targetHorizon} | ${t.entryLevel} -> ${t.targetLevel} | **${t.invalidationStopTrigger}** |`
  )
  .join('\n')}

---

## FORMAL MINORITY REPORT & DISSENTING AGENT LEDGER
${
  dissents.length === 0
    ? '- No unresolved sub-agent dissents exceeding the 0.20 divergence threshold.'
    : dissents
        .map(
          (d) =>
            `- **${d.agentName} (\`${d.dissentId}\` · Agent Risk \`${d.agentRiskScore.toFixed(2)}\` vs Desk Consensus \`${d.deskConsensusScore.toFixed(2)}\`)**: ${d.coreDissentArgument}\n  - *Early-Warning Catalyst*: ${d.earlyWarningTrigger}\n  - *Falsification Threshold*: ${d.falsificationThreshold}`
        )
        .join('\n')
}
`;
}

/**
 * Generates High-Clarity Institutional PDF Dossier (SMCR-1.0 Standard)
 */
export function exportSMCRPdfDossier(run: CouncilAssessmentRun): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 38;
  const contentWidth = pageWidth - margin * 2;
  let y = 42;

  const sc = run.supremeCouncil;
  const dissents = [
    ...(run.deskDebates.geopolitical.minorityDissents || []),
    ...(run.deskDebates.sovereign.minorityDissents || []),
    ...(run.deskDebates.macro.minorityDissents || []),
  ];

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 48) {
      doc.addPage();
      y = 42;
      // Running top header on continuation pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `SOVEREIGN COUNCIL ORCHESTRATOR OF ECONQUEST · SMCR-1.0 DOSSIER · ${run.countryName.toUpperCase()} (${run.iso3})`,
        margin,
        26
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 31, pageWidth - margin, 31);
    }
  };

  const drawSectionHeader = (kicker: string, title: string) => {
    checkPageBreak(42);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${kicker.toUpperCase()}  ·  ${title.toUpperCase()}`, margin + 8, y + 13.5);
    y += 28;
  };

  // --- TOP INSTITUTIONAL BANNER WITH ECONQUEST VECTOR CREST ---
  doc.setFillColor(11, 15, 23);
  doc.rect(0, 0, pageWidth, 86, 'F');

  // Vector EconQuest Crest Emblem on Top Left
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1.2);
  doc.rect(margin, 16, 28, 28);
  doc.setDrawColor(56, 189, 248);
  doc.circle(margin + 14, 30, 9);
  doc.setFillColor(245, 158, 11);
  doc.circle(margin + 14, 30, 2.5, 'F');

  const bannerTextX = margin + 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(96, 165, 250);
  doc.text('SOVEREIGN COUNCIL ORCHESTRATOR OF ECONQUEST · SMCR-1.0 DOSSIER', bannerTextX, 23);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${run.countryName.toUpperCase()} (${run.iso3}) — MACRO, HEDGE FUND & IB RISK DOSSIER`,
    bannerTextX,
    40
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(245, 158, 11);
  doc.text(
    'Multi-Agent Global Macroeconomic, Hedge Fund Simulation, Investment Banking Risk Engine & Sovereign Policy Platform',
    margin,
    56
  );

  doc.setFontSize(7.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Report ID: ${sc?.reportId || run.runId}   ·   Generated: ${new Date().toISOString().slice(0, 16)} UTC   ·   Currency: ${
      run.openData.currencyCode
    }   ·   Runtime: ${run.runtimeUsed.slice(0, 52)}`,
    margin,
    70
  );

  y = 100;

  // --- EXECUTIVE DECISION VERDICT & SCORECARD ---
  drawSectionHeader('Executive Briefing', 'Supreme Council Decision Verdict, Regime Scorecard & Provenance');

  // Verdict & Risk Score Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 52, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`VERDICT: ${sc?.decisionVerdict || 'DEFENSIVE_HEDGE'}`, margin + 10, y + 16);
  doc.text(
    `COMPOSITE RISK: ${compositeText(sc)}   |   COHERENCE: ${coherenceText(sc)}`,
    margin + 195,
    y + 16
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Desk Post-Cascade / CRO Scores:   Geopolitical: ${run.croState.geopoliticalRiskScore.toFixed(
      2
    )}   ·   Sovereign: ${run.croState.sovereignRiskScore.toFixed(2)}   ·   Macro: ${run.croState.macroRiskScore.toFixed(
      2
    )}   ·   CRO Override: ${run.croState.isOverridden ? 'YES' : 'VERIFIED DEFAULT'}`,
    margin + 10,
    y + 32
  );
  doc.text(
    `Key Telemetry: Debt/GDP ${run.openData.imfIndicators.debtToGdpPct.toFixed(1)}% · (r-g) +${run.openData.dsaAnalytics.rMinusGDifferentialPct.toFixed(2)}% · Reserves ${run.openData.worldBankIndicators.fxReservesMonthsImport.toFixed(
      1
    )}m · Policy Rate ${run.openData.monetaryAndMarket.policyRatePct.toFixed(2)}% · 5Y CDS ${run.openData.monetaryAndMarket.cds5YSpreadBps}bps`,
    margin + 10,
    y + 45
  );
  y += 62;

  // Executive Summary Paragraph
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Supreme Council Executive Synthesis:', margin, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  const summaryLines = doc.splitTextToSize(sc?.executiveSummary || '', contentWidth);
  checkPageBreak(summaryLines.length * 10.5 + 14);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 10.5 + 8;

  // 3-Regime Probability Distribution
  checkPageBreak(52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('3-Regime Probability Matrix & Historical Crisis Analog:', margin, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const regimes = [
    `• Base Case (${run.regimeDistribution.baseCase.probabilityPct}% | +${run.regimeDistribution.baseCase.expectedSpreadDeltaBps}bps): ${run.regimeDistribution.baseCase.narrative}`,
    `• Adverse Tail (${run.regimeDistribution.adverseTailCase.probabilityPct}% | +${run.regimeDistribution.adverseTailCase.expectedSpreadDeltaBps}bps): ${run.regimeDistribution.adverseTailCase.narrative}`,
    `• Constructive Reform (${run.regimeDistribution.constructiveReformCase.probabilityPct}% | ${run.regimeDistribution.constructiveReformCase.expectedSpreadDeltaBps}bps): ${run.regimeDistribution.constructiveReformCase.narrative}`,
  ];
  for (const rLine of regimes) {
    const wrapped = doc.splitTextToSize(rLine, contentWidth);
    checkPageBreak(wrapped.length * 10 + 4);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 10 + 2;
  }
  y += 6;

  // --- DECISION-POINT & CATALYST THRESHOLD MATRIX ---
  drawSectionHeader('Action Triggers', 'Decision-Point & Catalyst Threshold Matrix');

  for (const dp of sc?.decisionPointMatrix || []) {
    checkPageBreak(50);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${dp.variableId} · ${dp.variableName} [${dp.deskSource.toUpperCase()} | ${dp.provenanceTier}] — URGENCY: ${dp.urgency}`,
      margin + 6,
      y + 10
    );
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Current Level: ${dp.currentValue}   |   Bull Threshold: ${dp.bullThreshold}   |   Bear Break Trigger: ${dp.bearBreakTrigger}`,
      margin + 6,
      y
    );
    y += 11;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    const actLines = doc.splitTextToSize(`Required Decision Action if Triggered: ${dp.requiredActionIfTriggered}`, contentWidth - 12);
    doc.text(actLines, margin + 6, y);
    y += actLines.length * 10 + 6;
  }

  // --- DESK-BY-DESK DIALECTICAL LEDGER ---
  drawSectionHeader('Council Debates', 'Desk-by-Desk Dialectical Ledger (Devil’s Advocate Protocol)');

  for (const desk of Object.values(run.deskDebates)) {
    checkPageBreak(68);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${desk.deskName.toUpperCase()} — Pre-Cascade: ${desk.preCascadeRiskScore.toFixed(
        2
      )} -> Post-Cascade: ${desk.postCascadeRiskScore.toFixed(2)} (${desk.consensusStance})`,
      margin,
      y
    );
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    const round = desk.rounds[0];
    if (round) {
      const propLines = doc.splitTextToSize(`• Proponent (${round.proposerAgent}): ${round.thesis}`, contentWidth);
      doc.text(propLines, margin, y);
      y += propLines.length * 9.5 + 2;

      const chalLines = doc.splitTextToSize(
        `• Devil's Advocate (${round.challengerAgent}): ${round.counterThesis}`,
        contentWidth
      );
      doc.text(chalLines, margin, y);
      y += chalLines.length * 9.5 + 2;
    }
    const consLines = doc.splitTextToSize(`• Desk Lead Resolution: ${desk.consensusSummary}`, contentWidth);
    doc.setFont('helvetica', 'bold');
    doc.text(consLines, margin, y);
    y += consLines.length * 9.5 + 8;
  }

  // --- CROSS-DESK DEPENDENCY CASCADE & CRO GATE ---
  drawSectionHeader('Shock Transmission', 'Cross-Desk Dependency Cascade & CRO Human-in-the-Loop Audit');

  for (const step of run.cascadeSteps) {
    checkPageBreak(42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${step.sourceDesk.toUpperCase()} (${step.triggerAgent}) -> ${step.targetDesk.toUpperCase()} (${
        step.receivingAgent
      }) | ${step.shockDelta}`,
      margin,
      y
    );
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    const mechLines = doc.splitTextToSize(step.transmissionMechanism, contentWidth);
    doc.text(mechLines, margin, y);
    y += mechLines.length * 9.5 + 6;
  }

  checkPageBreak(36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  const croLines = doc.splitTextToSize(
    `CRO Checkpoint Directive (${run.croState.croApproverName}): ${run.croState.croNotes}`,
    contentWidth
  );
  doc.text(croLines, margin, y);
  y += croLines.length * 10 + 8;

  // --- DUAL-AUDIENCE EXECUTION PLAN ---
  drawSectionHeader('Execution Plan', 'Dual-Audience Action Plan: Policy Researcher Memo & Trade Tickets');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Policy Researcher Structural Recommendations:', margin, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  for (const rec of sc?.policyResearcherReport.policyRecommendations || []) {
    const recLines = doc.splitTextToSize(
      `• [${rec.priority}] ${rec.authority}: ${rec.action} (Impact: ${rec.expectedImpact})`,
      contentWidth
    );
    checkPageBreak(recLines.length * 9.5 + 4);
    doc.text(recLines, margin, y);
    y += recLines.length * 9.5 + 3;
  }
  y += 6;

  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Asset Manager Trade Execution Tickets (${sc?.marketTranslationLayer.regimeStance || ''}):`,
    margin,
    y
  );
  y += 12;

  for (const trd of sc?.marketTranslationLayer.tradeExpressions || []) {
    checkPageBreak(44);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 36, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${trd.ticketId} | [${trd.direction}] ${trd.instrument} (${trd.assetClass}) — Sizing: ${trd.sizingWeightPct}% | Horizon: ${trd.targetHorizon}`,
      margin + 6,
      y + 11
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Entry: ${trd.entryLevel}  ->  Target: ${trd.targetLevel}  |  INVALIDATION STOP: ${trd.invalidationStopTrigger}`, margin + 6, y + 22);
    doc.text(`Rationale: ${trd.entryRationale.slice(0, 115)}`, margin + 6, y + 32);
    y += 42;
  }

  // --- FORMAL MINORITY REPORT ---
  drawSectionHeader('Minority Dissents', 'Formal Minority Report & Dissenting Agent Ledger');

  if (dissents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('No unresolved sub-agent dissents exceeding the 0.20 divergence threshold.', margin, y);
    y += 14;
  } else {
    for (const d of dissents) {
      checkPageBreak(42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text(
        `${d.agentName} (${d.dissentId}) — Agent Score ${d.agentRiskScore.toFixed(2)} vs Desk Consensus ${d.deskConsensusScore.toFixed(2)}`,
        margin,
        y
      );
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(30, 41, 59);
      const dLines = doc.splitTextToSize(
        `${d.coreDissentArgument} | Early-Warning Catalyst: ${d.earlyWarningTrigger} | Falsification: ${d.falsificationThreshold}`,
        contentWidth
      );
      doc.text(dLines, margin, y);
      y += dLines.length * 9.5 + 8;
    }
  }

  // Machine-readable canonical footer stamp
  checkPageBreak(34);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 4, pageWidth - margin, y + 4);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `MACHINE-PARSEABLE SMCR-1.0 STAMP: {"schema":"SMCR-1.0","iso3":"${run.iso3}","verdict":"${
      sc?.decisionVerdict || 'DEFENSIVE_HEDGE'
    }","composite_risk":${(sc?.compositeRiskScore ?? 0.62).toFixed(2)},"geo":${run.croState.geopoliticalRiskScore.toFixed(
      2
    )},"sov":${run.croState.sovereignRiskScore.toFixed(2)},"mac":${run.croState.macroRiskScore.toFixed(2)}}`,
    margin,
    y + 16
  );

  doc.save(`SMCR-1.0_${run.iso3}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates Drop-In Python Code for tauricresearch/tradingagents
 * Includes Google AI Studio + Self-Hosted Ollama configs + Zero-Cost Open Data @tool functions
 */
export function buildTradingAgentsPythonCode(run: CouncilAssessmentRun, runtimeConfig: AIRuntimeConfig): string {
  const isOllama = runtimeConfig.providerMode === 'ollama';
  return `"""
Sovereign Council Orchestrator of EconQuest — tauricresearch/tradingagents Integration
A premier, multi-agent global macroeconomic, hedge fund simulation, investment banking risk engine, and sovereign policy research platform.
Target Sovereign: ${run.countryName} (${run.iso3}) | Report Standard: SMCR-1.0
Supports Google AI Studio (Gemini) AND Self-Hosted Ollama (${runtimeConfig.ollamaBaseUrl})
"""

import os
import requests
from typing import Dict, Any
from langchain_core.tools import tool
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

# ============================================================================
# 1. ZERO-COST INSTITUTIONAL OPEN-DATA TOOLS (NO API KEYS REQUIRED)
# ============================================================================

@tool
def fetch_imf_sovereign_fiscal_data(iso3: str = "${run.iso3}") -> Dict[str, Any]:
    """Fetches General Govt Gross Debt (% GDP) and WEO projections from IMF DataMapper API."""
    url = f"https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/{iso3}"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    series = res.json().get("values", {}).get("GGXWDG_NGDP", {}).get(iso3, {})
    return {
        "source": "IMF DataMapper WEO v1 (Tier 1 Official)",
        "iso3": iso3,
        "debt_to_gdp_2025": series.get("2025"),
        "debt_to_gdp_2027_forecast": series.get("2027"),
    }

@tool
def fetch_world_bank_external_reserves(iso3: str = "${run.iso3}") -> Dict[str, Any]:
    """Fetches FX Reserves in Months of Imports (FI.RES.TOTL.MO) from World Bank Open Data API v2."""
    url = f"https://api.worldbank.org/v2/country/{iso3}/indicator/FI.RES.TOTL.MO?format=json&per_page=5"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    rows = res.json()[1] if len(res.json()) > 1 else []
    latest = next((r for r in rows if r.get("value") is not None), {})
    return {
        "source": "World Bank Open Data v2 (Tier 1 Official)",
        "iso3": iso3,
        "fx_reserves_months_import": latest.get("value"),
        "year": latest.get("date"),
    }

@tool
def fetch_polymarket_geopolitical_odds(limit: int = 5) -> Dict[str, Any]:
    """Fetches real-money market-implied event probabilities from Polymarket Gamma API."""
    url = f"https://gamma-api.polymarket.com/events?limit={limit}&active=true&closed=false"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    events = res.json()
    return {
        "source": "Polymarket Gamma API (Tier 2 Prediction Market)",
        "contracts": [{"title": e.get("title"), "volume_usd": e.get("volume")} for e in events],
    }

# ============================================================================
# 2. MULTI-TIER COUNCIL OF AGENTS CONFIGURATION (GOOGLE AI STUDIO OR OLLAMA)
# ============================================================================

config = DEFAULT_CONFIG.copy()

${
  isOllama
    ? `# Self-Hosted Ollama Local Configuration
config["llm_provider"] = "ollama"
config["backend_url"] = "${runtimeConfig.ollamaBaseUrl}/v1"
config["quick_think_llm"] = "${runtimeConfig.ollamaQuickModel}"  # Sub-agent scraping & JSON extraction
config["deep_think_llm"] = "${runtimeConfig.ollamaDeepModel}"    # Desk Lead debates & Supreme Council`
    : `# Google AI Studio Multi-Tier Gemini Configuration
# Set export GOOGLE_API_KEY="your_ai_studio_key"
config["llm_provider"] = "google"
config["quick_think_llm"] = "${runtimeConfig.geminiQuickModel || 'gemini-2.5-flash'}"  # Fast Sub-Agent Ingestion (Ag1-Ag9)
config["deep_think_llm"] = "${runtimeConfig.geminiDeepModel || 'gemini-2.5-pro'}"      # Deep Reasoning Desk Leads & Supreme Council`
}

# Bound Devil's Advocate loops to prevent infinite academic consensus-seeking
config["max_debate_rounds"] = ${runtimeConfig.maxDebateRounds || 2}
config["max_risk_discuss_rounds"] = ${runtimeConfig.maxDebateRounds || 2}
config["online_tools"] = True

if __name__ == "__main__":
    ta = TradingAgentsGraph(
        selected_analysts=["market", "social", "news", "fundamentals"],
        debug=True,
        config=config,
    )
    # Run assessment for target sovereign / macro regime
    final_state, decision = ta.propagate("${run.iso3}", "${new Date().toISOString().slice(0, 10)}")
    print("SMCR-1.0 Supreme Council Decision:", decision)
`;
}
