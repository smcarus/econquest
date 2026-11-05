/**
 * Model and signal register (Sam, 2026-11-05): every rule in the app that turns figures into a
 * call, with what it says, how, what it reads, where it shows and how far it has been tested.
 * The register is the single place a status lives; the badge beside each panel reads it.
 *
 * Statuses, in the spirit of the Python econquest program's "model-assisted, not validated":
 * - not_validated: makes a call that can be tested, and has not passed a pre-registered backtest.
 * - passed / failed / too_few_cases: set only by a pre-registered backtest (rules fixed and hashed
 *   before the run), never by hand.
 * - descriptive: says where things stand (a phase, a change, a date) and makes no call to test.
 * - model_assisted: written by an AI model, checked by stated rules (number and stance checks),
 *   not validated and not testable as a rule.
 *
 * Browser-safe.
 */

export type ValidationStatus = 'not_validated' | 'passed' | 'failed' | 'too_few_cases' | 'descriptive' | 'model_assisted';

export const STATUS_LABEL: Record<ValidationStatus, string> = {
  not_validated: 'Not validated',
  passed: 'Backtest passed',
  failed: 'Backtest failed',
  too_few_cases: 'Too few cases to test',
  descriptive: 'Descriptive, no call',
  model_assisted: 'Model-assisted, not validated',
};

export interface RegisterEntry {
  id: string;
  name: string;
  /** What it tells the reader, in plain words. */
  says: string;
  /** The rule, short. */
  method: string;
  inputs: string;
  /** Where it shows in the app. */
  where: string;
  /** Decision input = feeds a council call or ranking; Research = read alongside, no ranking. */
  use: 'Decision input' | 'Research';
  status: ValidationStatus;
  /** How it would be tested, or why it cannot be with free data. */
  testPlan: string;
  limits: string;
  code: string;
  /** Panel titles (BriefGroups) and other labels that show this entry's badge. */
  panels: string[];
}

export const MODEL_REGISTER: RegisterEntry[] = [
  {
    id: 'taylor_gap',
    name: 'Policy rule check (Taylor gap)',
    says: 'Policy is tight, neutral or loose against a simple Taylor rule.',
    method: 'Rule rate = 2% + inflation + 0.5 x (inflation - target) + 0.5 x output gap; tight or loose when the policy rate is more than the band away.',
    inputs: 'BIS policy rate, monthly inflation (else IMF WEO), central bank target, IMF output gap',
    where: 'Research > Markets & signals (Central Bank Watcher Agent), Council chat, Replicate a rate decision',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Does a tight (loose) reading precede a cut (hike) or hold more often than chance within 6 months, on BIS policy-rate history since the 1990s with inflation lagged to what was published?',
    limits: 'r* fixed at 2%; output gap is an annual IMF estimate revised each vintage; targets are hand-entered.',
    code: 'src/utils/taylorRule.ts',
    panels: ['Central Bank Watcher Agent', 'Replicate a rate decision', 'Track record log'],
  },
  {
    id: 'cli_turn_policy',
    name: 'Leading-indicator turn to policy move',
    says: 'After an OECD leading-indicator peak (trough), the central bank tends to cut (hike).',
    method: 'Each CLI turning point is matched with a policy move in the matching direction within 6 months.',
    inputs: 'OECD composite leading indicator (via DBnomics), BIS policy rates',
    where: 'Research > Markets & signals (Signal track record), Timing Agent',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Hit rate against the base rate of policy moves in any 6-month window, over the full CLI history per country, turns dated only with data available at the time.',
    limits: 'Turning points are dated with hindsight today; the OECD mirror lags 5 to 6 months.',
    code: 'src/utils/signalRecord.ts, src/utils/oecdCli.ts',
    panels: ['Signal track record'],
  },
  {
    id: 'cftc_crowding',
    name: 'Crowded futures positioning to unwind',
    says: 'Leveraged-fund positioning in the top or bottom 10% of its range tends to unwind.',
    method: 'Entry into the 3-year top or bottom decile counts as crowded; an unwind is a 3-point move of open interest back within 8 weeks.',
    inputs: 'CFTC Traders in Financial Futures, weekly',
    where: 'Research > Markets & signals (Futures positioning, Signal track record), Timing Agent',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Rolling bands built only from past weeks (no hindsight), unwind rate against the rate after any random week, on CFTC history back to 2006.',
    limits: 'Bands use the whole 3-year sample today (hindsight); only currencies with CME futures.',
    code: 'src/utils/cftcPositioning.ts, src/utils/signalRecord.ts',
    panels: ['Futures positioning (CFTC, weekly)'],
  },
  {
    id: 'cds_rich_cheap',
    name: 'CDS cheap or rich against risk peers',
    says: 'A country’s CDS is cheap, in line or rich against peers with a similar risk score.',
    method: 'Fit of log CDS on the app’s risk score across the watchlist; the residual sets the call.',
    inputs: 'CDS (your own file or LSEG only), the app’s risk score',
    where: 'Research > Markets & signals (Relative Value Agent), Compare, MarketEdge disagreements',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Needs a CDS history, which is paid data. Stays Not validated unless your own CDS file holds enough history to test convergence of the residual.',
    limits: 'Off unless you load your own CDS; few peers make the fit unstable.',
    code: 'src/utils/marketsMacro.ts, src/utils/marketEdgeAnchors.ts',
    panels: ['Relative Value Agent'],
  },
  {
    id: 'reer_gap',
    name: 'Real exchange rate gap and carry-to-volatility',
    says: 'The currency is strong (dear) or weak (cheap) against its own 10-year average, and whether carry pays for its swings.',
    method: 'BIS real broad effective rate against its 10-year average; policy-rate gap over the US divided by 3-month realised volatility.',
    inputs: 'BIS real effective exchange rates (monthly), BIS policy rates, ECB reference rates (Frankfurter)',
    where: 'Research > Markets & signals (FX Valuation Agent), Council chat',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Does a gap beyond one standard deviation narrow over the next 12 months more often than not, on BIS REER history since 1994, using only the average known at the time?',
    limits: 'A 10-year average is a yardstick, not a fair value; real rates can trend for years.',
    code: 'src/utils/fxValuation.ts',
    panels: ['FX Valuation Agent'],
  },
  {
    id: 'shock_warning',
    name: 'Shock early warning',
    says: 'Where external pressure is building (watch or alert), not that a shock will happen.',
    method: 'Stated thresholds: debt due over reserves, reserves falling, import cover, external gap, terms-of-trade swing.',
    inputs: 'World Bank QEDS, BIS debt securities, IMF reserves and balance of payments, World Bank Pink Sheet, UN Comtrade',
    where: 'Research > Markets & signals (Shock early warning)',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Alerts against a dated list of external crises (IMF programmes, sharp currency falls, defaults) over 2000 to 2024, with hit and false-alarm rates fixed in advance.',
    limits: 'Thresholds are rules of thumb; several inputs are annual or quarterly and published late.',
    code: 'src/utils/shockWatch.ts',
    panels: ['Shock early warning'],
  },
  {
    id: 'divergence_rank',
    name: 'Where data and price disagree (ranking)',
    says: 'Ranks countries by the size of the gap between what the data say and what markets price.',
    method: 'Size of each rule’s gap (policy, CDS, real yield, refinancing, FX) times how far its figures can be trusted.',
    inputs: 'The readings above',
    where: 'MarketEdge disagreements, Compare',
    use: 'Decision input',
    status: 'not_validated',
    testPlan: 'Tested through its parts: a ranking can only be validated once the rules it ranks have passed.',
    limits: 'Inherits every limit of the rules it combines.',
    code: 'src/utils/divergences.ts',
    panels: ['Where data and price disagree'],
  },
  {
    id: 'regime_quadrant',
    name: 'Growth and inflation quadrant',
    says: 'Whether growth and inflation are rising or falling, per country.',
    method: 'CLI change over 6 months and the change in y/y inflation over 3 months; above zero is up.',
    inputs: 'OECD leading indicator, monthly inflation',
    where: 'Compare',
    use: 'Research',
    status: 'descriptive',
    testPlan: 'Describes direction only; nothing to test as a call.',
    limits: 'Uses the latest months, which are revised.',
    code: 'src/utils/regimeQuadrant.ts',
    panels: ['Growth and inflation quadrant'],
  },
  {
    id: 'cycle_clock',
    name: 'Cycle clock',
    says: 'Where each country sits in its policy and business cycle, and the next decision date.',
    method: 'Runs of BIS policy moves, OECD leading-indicator phase, official calendar.',
    inputs: 'BIS policy rates, OECD leading indicator, official central bank calendars',
    where: 'Research > Markets & signals (Cycle clock), Timing Agent',
    use: 'Research',
    status: 'descriptive',
    testPlan: 'Says where things stand and for how long, never what happens next.',
    limits: 'About two years of policy history; the calendar is updated by hand.',
    code: 'src/utils/cycleClock.ts',
    panels: ['Cycle clock'],
  },
  {
    id: 'timing_agent',
    name: 'Timing Agent',
    says: 'Lines up dated catalysts, cycle, positioning, news, odds and flows for when something might play out.',
    method: 'Collects dated facts from the sources listed; gives no probability.',
    inputs: 'Official calendar, BIS, OECD, CFTC, GDELT, Polymarket, TIC, official 10Y yields',
    where: 'Council chat',
    use: 'Research',
    status: 'descriptive',
    testPlan: 'Describes the setup with dates; the positioning and turn rules inside it are tested on their own rows.',
    limits: 'Only as current as each feed.',
    code: 'src/utils/timingAgent.ts',
    panels: [],
  },
  {
    id: 'council_summary',
    name: 'Council summary (AI synthesis)',
    says: 'The answer to your question, written by your AI model from the agents’ documents.',
    method: 'AI model (Ollama or Gemini) with every number traced to an agent’s figure and every stance word checked; failing sentences are removed and shown.',
    inputs: 'The agents’ documents only',
    where: 'Council chat, Reports',
    use: 'Decision input',
    status: 'model_assisted',
    testPlan: 'Not testable as a rule. Checks: number trace, stance check; each answer is in the audit log with its model and figures.',
    limits: 'Wording and emphasis are the model’s; a different model can lean differently on the same figures.',
    code: 'server.ts (synthesiseAnswers), src/utils/askCouncil.ts, src/utils/stanceCheck.ts',
    panels: [],
  },
];

export function registerEntry(id: string): RegisterEntry | undefined {
  return MODEL_REGISTER.find((e) => e.id === id);
}

/** The entry whose badge belongs beside a panel title, if any. */
export function registerForPanel(title: string): RegisterEntry | undefined {
  return MODEL_REGISTER.find((e) => e.panels.includes(title));
}

export const REGISTER_HEADER = ['Name', 'Status', 'Use', 'What it says', 'Rule', 'Inputs', 'Where it shows', 'How it is tested', 'Limits', 'Code'];

export function registerRows(entries: RegisterEntry[] = MODEL_REGISTER): string[][] {
  return entries.map((e) => [e.name, STATUS_LABEL[e.status], e.use, e.says, e.method, e.inputs, e.where, e.testPlan, e.limits, e.code]);
}
