/**
 * One country's History & data tools, grouped by the question they answer. The page shows the
 * history chart and this menu; one tool opens at a time below it, so the page is a couple of
 * screens instead of forty panels stacked. Ids are the anchors Tools, worked examples and the
 * chat link to (tool-...), so old links still open the right tool.
 */

export type CountryToolGroupId = 'debt' | 'money' | 'external' | 'growth' | 'people' | 'risk' | 'past' | 'learn';

export interface CountryTool {
  /** The anchor id, e.g. 'tool-debt-sustainability'. */
  id: string;
  /** Message key in RESEARCH for its name. */
  label: string;
  /** Shown only for some countries. */
  only?: (c: { iso3: string; currencyCode?: string }) => boolean;
}

export interface CountryToolGroup {
  id: CountryToolGroupId;
  label: string;
  tools: CountryTool[];
}

export const COUNTRY_TOOL_GROUPS: CountryToolGroup[] = [
  {
    id: 'debt',
    label: 'tg_debt',
    tools: [
      { id: 'tool-debt-sustainability', label: 'tl_debt_sustainability' },
      { id: 'tool-gross-financing-need', label: 'tl_gross_financing_need' },
      { id: 'tool-fiscal-reaction', label: 'tl_fiscal_reaction' },
      { id: 'tool-fiscal-rules', label: 'tl_fiscal_rules' },
      { id: 'tool-budget-credibility', label: 'tl_budget_credibility' },
      { id: 'tool-budget-execution', label: 'tl_budget_execution' },
      { id: 'tool-fiscal-multipliers', label: 'tl_fiscal_multipliers' },
      { id: 'tool-restructuring', label: 'tl_restructuring' },
      { id: 'tool-bank-sovereign', label: 'tl_bank_sovereign' },
      { id: 'tool-policy-incidence', label: 'tl_policy_incidence' },
    ],
  },
  {
    id: 'money',
    label: 'tg_money',
    tools: [
      { id: 'tool-yield-curve', label: 'tl_yield_curve' },
      { id: 'tool-full-curves', label: 'tl_full_curves' },
      { id: 'tool-surprises', label: 'tl_surprises' },
      { id: 'tool-inflation-drivers', label: 'tl_inflation_drivers' },
      { id: 'tool-rule-family', label: 'tl_rule_family' },
      { id: 'tool-local-projections', label: 'tl_local_projections' },
      { id: 'tool-cb-words', label: 'tl_cb_words' },
      { id: 'tool-event-study', label: 'tl_event_study' },
    ],
  },
  {
    id: 'external',
    label: 'tg_external',
    tools: [
      { id: 'tool-reserve-adequacy', label: 'tl_reserve_adequacy' },
      { id: 'tool-external-sustainability', label: 'tl_external_sustainability' },
      { id: 'tool-beer', label: 'tl_beer' },
      { id: 'tool-commodity-terms', label: 'tl_commodity_terms' },
      { id: 'tool-global-scenarios', label: 'tl_global_scenarios' },
    ],
  },
  {
    id: 'growth',
    label: 'tg_growth',
    tools: [
      { id: 'tool-forecast', label: 'tl_forecast' },
      { id: 'tool-output-gap', label: 'tl_output_gap' },
      { id: 'tool-growth-accounting', label: 'tl_growth_accounting' },
      { id: 'tool-gap-model', label: 'tl_gap_model' },
      { id: 'tool-gvar', label: 'tl_gvar' },
      { id: 'tool-sandboxes', label: 'tl_sandboxes' },
    ],
  },
  {
    id: 'people',
    label: 'tg_people',
    tools: [
      { id: 'tool-remittances', label: 'tl_remittances' },
      { id: 'tool-aid', label: 'tl_aid' },
      { id: 'tool-wb-projects', label: 'tl_wb_projects' },
      { id: 'tool-official-docs', label: 'tl_official_docs' },
      { id: 'tool-regional', label: 'tl_regional' },
      { id: 'tool-financial-inclusion', label: 'tl_financial_inclusion' },
      { id: 'tool-food-prices', label: 'tl_food_prices' },
    ],
  },
  {
    id: 'risk',
    label: 'tg_risk',
    tools: [
      { id: 'tool-risk-scorecard', label: 'tl_risk_scorecard' },
      { id: 'tool-crisis-warning', label: 'tl_crisis_warning' },
      { id: 'tool-sanctions', label: 'tl_sanctions' },
      { id: 'tool-event-history', label: 'tl_event_history' },
      { id: 'tool-disasters', label: 'tl_disasters' },
      { id: 'tool-storm-tracks', label: 'tl_storm_tracks' },
      { id: 'tool-parametric-trigger', label: 'tl_parametric_trigger' },
    ],
  },
  {
    id: 'past',
    label: 'tg_past',
    tools: [
      { id: 'tool-weo-vintages', label: 'tl_weo_vintages' },
      { id: 'tool-us-vintages', label: 'tl_us_vintages', only: (c) => c.iso3 === 'USA' },
      { id: 'tool-first-published', label: 'tl_first_published', only: (c) => c.iso3 === 'GBR' || c.currencyCode === 'EUR' },
      { id: 'tool-as-of', label: 'tl_as_of' },
      { id: 'tool-decision-replay', label: 'tl_decision_replay' },
      { id: 'tool-track-record', label: 'tl_track_record' },
    ],
  },
  {
    id: 'learn',
    label: 'tg_learn',
    tools: [
      { id: 'tool-exercises', label: 'tl_exercises' },
      { id: 'tool-macro-lab', label: 'tl_macro_lab' },
      { id: 'tool-unit-converters', label: 'tl_unit_converters' },
    ],
  },
];

export const COUNTRY_TOOL_IDS: string[] = COUNTRY_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id));

export function isCountryTool(anchor: string | null | undefined): boolean {
  return !!anchor && COUNTRY_TOOL_IDS.includes(anchor);
}

/** Groups with only the tools this country has. */
export function toolGroupsFor(c: { iso3: string; currencyCode?: string }): CountryToolGroup[] {
  return COUNTRY_TOOL_GROUPS.map((g) => ({ ...g, tools: g.tools.filter((t) => !t.only || t.only(c)) })).filter((g) => g.tools.length > 0);
}

/** Fired with an anchor id when something links to a country tool; the open History & data page picks it. */
export const COUNTRY_TOOL_EVENT = 'econquest:country-tool';

const PICK_KEY = 'econquest.countryTool.v1';

/** The last tool opened in this browser (a viewer convenience; empty when storage is blocked). */
export function readToolPick(): string | null {
  try {
    const v = window.localStorage.getItem(PICK_KEY);
    return isCountryTool(v) ? v : null;
  } catch {
    return null;
  }
}

export function saveToolPick(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(PICK_KEY, id);
    else window.localStorage.removeItem(PICK_KEY);
  } catch {
    // storage blocked: the pick lasts until the page closes
  }
}
