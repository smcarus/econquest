/**
 * docs/METHODS.md: a methods note for each model and signal in the app, generated from the model
 * register (src/data/modelRegister.ts), the pre-registered backtests (docs/validation/preregistered/)
 * and the verdicts recorded from real runs (docs/validation/recorded-verdicts.json), plus the three
 * stated-method views that make no call to backtest (output gap, debt sustainability, fiscal
 * multipliers). `npm run docs:methods` writes it; a test fails if it is out of date.
 *
 * Browser-safe: the caller reads the files and passes them in.
 */
import { MODEL_REGISTER, STATUS_LABEL, type RegisterEntry } from '../data/modelRegister';
import { RESEARCH_NOTICE } from './disclaimer';

export interface PreregisteredSpec {
  file: string;
  hash?: string;
  id: string;
  version: number;
  registeredOn: string;
  hypothesis: string;
  framework?: number;
  retestOf?: { version: number; verdict: string; change: string };
  sample?: { from?: string };
  passMark?: { minCases?: number; minLiftPts?: number; maxPValue?: number; minSeriesShare?: number; minYears?: number };
  knownLimits?: string[];
}

export interface RecordedVerdict {
  id: string;
  version: number;
  ranAt: string;
  verdict: 'passed' | 'failed' | 'too_few_cases';
  method: number;
  summary: string;
}

const VERDICT_LABEL: Record<RecordedVerdict['verdict'], string> = { passed: 'Passed', failed: 'Failed', too_few_cases: 'Too few cases' };

/** The views that state a method on official data and make no call a backtest could score. */
export const STATED_METHODS: { id: string; name: string; where: string; method: string[]; limits: string; code: string }[] = [
  {
    id: 'output_gap',
    name: 'Output gap (app estimate)',
    where: 'Research > History & data, Policy review Diagnose, Central Bank Watcher and Fiscal & Debt agents',
    method: [
      'The IMF DataMapper publishes no output gap for the countries the app covers, so the app estimates one from log real GDP chained from IMF WEO real growth (NGDP_RPCH).',
      'Three standard filters on the same input: Hodrick-Prescott with lambda 100, Hodrick-Prescott with lambda 6.25 (Ravn and Uhlig 2002), and the Hamilton (2018) regression filter in annual form (h = 2, p = 1).',
      'The reading is the median of the three; the band is lowest to highest. The HP trend runs over the IMF projections to ease the end-point problem, and projection years say so.',
    ],
    limits: 'Filters on GDP alone are rough and are revised as new years arrive; the newest years move most. A stated method on official data, not an official estimate and not a forecast.',
    code: 'src/utils/outputGap.ts',
  },
  {
    id: 'debt_sustainability',
    name: 'Debt sustainability view',
    where: 'Research > History & data, Policy review Diagnose, Fiscal & Debt Agent',
    method: [
      'Public debt dynamics: d(t) = d(t-1) x (1 + i) / (1 + n) - pb + sfa, on IMF WEO debt, IMF Fiscal Monitor primary and overall balance, IMF growth and inflation. Consumer price inflation stands in for the GDP deflator, which the DataMapper does not publish.',
      'Five-year scenarios: the IMF path as published, a baseline on the IMF inputs with no stock-flow adjustment, ten-year historical averages, and growth, primary balance, interest rate and combined shocks shaped like the IMF standardised stress tests (2013 Staff Guidance Note), with sizes stated by the app.',
    ],
    limits: 'A view on stated assumptions, not a forecast and not an IMF DSA. Shock sizes are the app\'s choices, not the IMF\'s country calibration.',
    code: 'src/utils/debtSustainability.ts',
  },
  {
    id: 'gross_financing_need',
    name: 'Gross financing need (lower bound)',
    where: 'Research > History & data',
    method: [
      'GFN = overall deficit + amortisation, % of GDP, from last year to five years out. Deficit = minus the IMF Fiscal Monitor overall balance; interest shown = primary minus overall balance.',
      'Amortisation = World Bank IDS projected principal on public and publicly guaranteed external debt (DT.AMT.DPPG.CD, all creditors) divided by IMF WEO GDP in US dollars (NGDPD) for the same year. QEDS next-12-month general government external principal is shown alongside.',
      'Flag: a total of 15% of GDP or more, the IMF market-access DSA benchmark for emerging markets.',
    ],
    limits: 'Domestic amortisation (local debt held by residents) has no free cross-country source, so the total is a lower bound; for countries that borrow mainly at home it can be far below the true need. IDS covers low- and middle-income countries only. IMF years from this one on and all IDS years are projections.',
    code: 'src/utils/grossFinancingNeed.ts',
  },
  {
    id: 'reserve_adequacy',
    name: 'Reserve adequacy (IMF ARA, partial)',
    where: 'Research > History & data',
    method: [
      'Traditional ratios: reserves in months of imports, reserves / short-term external debt (Greenspan-Guidotti, 100%), reserves / broad money (20%).',
      'IMF ARA EM metric without other portfolio liabilities: 30% of short-term external debt (World Bank IDS) + 5% (floating) or 10% (fixed) of broad money (World Bank, % of GDP x IMF WEO GDP in US$) + 5% or 10% of exports of goods and services (World Bank). Both weightings shown; reserves include gold.',
      'Reading: reserves under 100% of the floating-weight partial metric are under 100% of the full IMF metric whatever the regime; above that, adequacy cannot be shown without the missing term.',
    ],
    limits: 'Other portfolio liabilities (from the international investment position) have no free cross-country source, so the ratio is an upper bound of the IMF\'s. The exchange rate regime is not a free feed. Short-term debt is World Bank IDS, low- and middle-income countries only; annual data lag a year or more.',
    code: 'src/utils/reserveAdequacy.ts',
  },
  {
    id: 'debt_fan',
    name: 'Debt fan chart (stochastic)',
    where: 'Research > History & data > Debt sustainability',
    method: [
      'Centred on the debt sustainability baseline (the debt identity on the IMF\'s projected growth, inflation, interest and primary balance), five years.',
      'Each simulated year draws one whole past year (bootstrap with replacement, up to the last 25 outturn years with all four inputs, at least 10) and adds that year\'s deviations from the sample means to the baseline inputs, so the four shocks keep their joint behaviour. Interest shocks phase in as a fifth of the debt rolls over each year.',
      '2,000 paths with a fixed seed; reports the 10th, 25th, 50th, 75th and 90th percentiles by year and the share of paths ending above today\'s debt and above the baseline. Shape of the IMF market-access DSA fan (IMF 2013).',
    ],
    limits: 'Only shocks the sample has seen; no stock-flow adjustments (valuation, bank support), which drive many debt jumps. Centred on the IMF\'s inputs, not an app forecast. CPI inflation stands in for the GDP deflator.',
    code: 'src/utils/debtFan.ts',
  },
  {
    id: 'local_projections',
    name: 'Inflation after policy rate changes (local projections)',
    where: 'Research > History & data',
    method: [
      'Jorda (2005) local projections on monthly data: inflation (% y/y, OECD or national CPI) h months ahead less the month before, on the change in the BIS month-end policy rate in month t, with 3 lags of both monthly changes. One OLS per horizon: 0, 3, 6, 9, 12, 18, 24 months.',
      'Newey-West standard errors with lag max(h + 1, floor(4 x (n/100)^(2/9))); 90% bands. Needs 60 months and at least 5 rate changes.',
    ],
    limits: 'Reduced form: the rate change is not an identified monetary policy shock. Central banks move ahead of expected inflation, so early responses often have the "wrong" sign (price puzzle). Records co-movement in the sample, not the effect of policy; regimes and targets change over long samples.',
    code: 'src/utils/localProjections.ts',
  },
  {
    id: 'rule_family',
    name: 'Policy rule family',
    where: 'Research > History & data',
    method: [
      'Five rules on the same inputs (latest monthly inflation pi, the bank\'s stated target pi*, output gap, r* 2%): Taylor (1993) r* + pi + 0.5(pi - pi*) + 0.5 gap; balanced approach, gap weight 1.0; inflation only, no gap term; inertial 0.85 x current rate + 0.15 x Taylor (1993); first difference current rate + 0.5(pi - pi*) + 0.5 x change in the gap over a year.',
      'Output gap: IMF WEO (NGAP_NPGDP) for this year where published (a projection), else the app\'s own estimate, labelled. Rules needing the gap show Missing without it.',
      'Reading: the policy rate more than 1 point above every rule = tight on all; more than 1 point below = loose on all; otherwise inside the range.',
    ],
    limits: 'r* is a stated parameter, not data: each point lower moves the level rules one point down, the inertial rule 0.15 and the first-difference rule not at all. Rules are cross-checks of stance, not forecasts; banks also weigh the exchange rate, financial stability and expectations. Annual output gaps are revised every WEO.',
    code: 'src/utils/ruleFamily.ts',
  },
  {
    id: 'costed_options',
    name: 'Costed fiscal options',
    where: 'Research > History & data > Debt sustainability',
    method: [
      'Four stated options against the debt sustainability baseline on IMF inputs: tighten 0.5 pt at once, 1 pt over 2 years, 2 pts over 3 years, loosen 1 pt at once. The primary balance rises by the step each year and stays up.',
      'Real growth in a step year is lower by multiplier x step (output level loss persists; later growth as baseline). Multiplier: the IMF bucket-approach first-year range for the country\'s group in normal times (TNM 14/04 Table 6: emerging 0.1-0.3, advanced 0.4-0.6), both ends shown.',
      'Debt from the identity d(t) = d(t-1)(1 + i)/(1 + n) - pb, so interest falls with debt. Reports debt at the horizon, the change against the baseline and the output lost; flags when debt rises above the baseline in year 1 (denominator effect).',
    ],
    limits: 'No cycle or lower-bound adjustment to the multiplier, no confidence or risk-premium effects, inflation and interest as in the baseline. Composition (spending or taxes) is not modelled. Stated options on stated assumptions, not a forecast or a recommendation.',
    code: 'src/utils/costedOptions.ts',
  },
  {
    id: 'beer',
    name: 'BEER fair value (behavioural equilibrium exchange rate)',
    where: 'Research > History & data',
    method: [
      'Clark and MacDonald (1998), one country at a time: OLS of the log BIS real broad effective exchange rate (yearly average of complete years) on log net barter terms of trade (World Bank), log GDP per head at PPP against the US (World Bank, a Balassa-Samuelson stand-in), and the current account summed from its first year (a net foreign assets proxy), at least 15 years, Newey-West errors.',
      'Misalignment = 100 x (log REER - log fitted). The latest monthly REER is set against the fair value of the latest year with all fundamentals, and the year is stated. Coefficients whose sign is opposite to theory (all three are expected positive) are flagged.',
    ],
    limits: 'A levels regression on 20-30 annual points with no cointegration test: a yardstick, not a forecast, and it implies a gap that closes, which is not tested here. Productivity is against the US, not trade partners. Net foreign assets have no free API, so the summed current account (no valuation changes) stands in. World Bank data are today\'s vintage.',
    code: 'src/utils/beer.ts',
  },
  {
    id: 'event_study',
    name: 'Currency around rate decisions (event study)',
    where: 'Research > History & data',
    method: [
      'Events: every day the BIS daily policy rate series changes (the date the new rate takes effect), its own central bank or the Federal Reserve, split into hikes and cuts; a change within 10 daily observations of the last kept one is dropped so one episode is not counted twice.',
      'Path: 100 x log change of units per US dollar (ECB reference rates) from the ECB business day before the event to each day from 10 before to 20 after (up = weaker currency). Average path for hikes and for cuts, 90% band from resampling the events (2,000 draws, fixed seed); at least 5 events per group.',
    ],
    limits: 'Description of the past, not a tested signal. No measure of surprise: an expected decision moves little on the day. Episodes with very different causes are averaged. ECB daily fixings, not intraday prices; currencies the ECB does not publish have no study.',
    code: 'src/utils/eventStudy.ts',
  },
  {
    id: 'unrest_onset',
    name: 'Unrest spikes (GDELT) and conflict onset',
    where: 'Research > History & data (Event history)',
    method: [
      "Each complete month (daily files covering the month), protests (CAMEO root 14) and violence (roots 18 to 20) as a share of the events GDELT 1.0 places in the country or names it as an actor. z = (share - mean of the previous 24 complete months) / max(their standard deviation, 0.25 points). A spike is z of 3 or more; an episode is the first month of a run of spikes. Only earlier months enter the baseline.",
      'Pre-registered test (unrest_onset v1): every country-year from 2018 with at least 10 scored months and no state-based armed conflict located in the country (UCDP/PRIO). A year with a spike episode is a call that conflict is located in the country the next calendar year. Base rate: the share of all such quiet country-years followed by conflict, pooled. Method 2: whole years resampled, p at most 0.05, a lift of at least 3 points, 30 cases over 6 years.',
    ],
    limits: 'UCDP files are yearly, so the outcome is the next calendar year. GDELT on disk starts in 2016, leaving about seven scored years. The pooled base rate mixes countries with very different risks. News-based machine coding, with coverage that varies by country and year.',
    code: 'src/utils/unrestSpikes.ts',
  },
  {
    id: 'idea_journal',
    name: 'Trade idea journal',
    where: 'Menu > Idea journal',
    method: [
      'An idea is a country, an instrument (its currency against the US dollar from ECB reference rates, or its policy rate from BIS daily data), a direction, a horizon of 7 to 730 days, an optional invalidation (currency ideas: an adverse move of that many %), a thesis and a type (carry, value, momentum, macro, policy, event, other).',
      'When logged the server fixes the entry level (latest published value, with its date) and the horizon date, takes the SHA-256 of the record\'s canonical JSON and appends it to data/local/ideas.jsonl; the app never edits a record, and a changed line is shown as not matching its hash.',
      'Scoring: on the first published value on or after the horizon date. Currency: move = 100 x (entry / value - 1) in the idea\'s direction (units per USD falling = the currency strengthening), a hit when above zero; invalidated if the adverse move is reached on any ECB day first. Policy rate: up, down or unchanged against the entry. Hit rate and average currency move by idea type.',
    ],
    limits: 'Scoring, not a signal. Spot moves only, no carry or costs. Few ideas give a noisy hit rate. The hash shows a change, it does not prevent deletion of the file.',
    code: 'src/utils/ideaJournal.ts',
  },
  {
    id: 'global_scenarios',
    name: 'Global shock scenarios (scenario engine)',
    where: 'Research > History & data',
    method: [
      'One OLS per response on monthly changes over the last 15 years (at least 60 months): the currency (100 x log change of units per US dollar, ECB month-end) and the policy rate (BIS month-end, change in points), each on the US policy rate change (BIS) and the dollar (100 x log change of euros per dollar, ECB).',
      'A scenario is a set of stated factor moves (presets: Fed +1 point, dollar +5%, both, the reverse; or your own). Implied move = coefficients x shock, intercept left out; 90% band from the Newey-West covariance of the coefficients. The residual standard deviation is shown as the size of a typical unexplained month.',
    ],
    limits: 'Contemporaneous co-movement, linear in the shock: not causal, and the Fed and the dollar often move for the same reasons as the country. Shocks larger than any month in the sample are flagged as extrapolation. The dollar factor is euros per dollar, not a trade-weighted index. Oil is not a factor yet (only five years of monthly prices saved). Currencies the ECB does not publish have no currency model.',
    code: 'src/utils/scenarioEngine.ts',
  },
  {
    id: 'fiscal_reaction',
    name: 'Fiscal reaction (Bohn test)',
    where: 'Research > History & data',
    method: [
      'OLS of the IMF Fiscal Monitor primary balance (% of GDP) on the previous year\'s IMF WEO government debt (% of GDP) and the app\'s output gap estimate: pb(t) = a + rho x d(t-1) + gamma x gap(t). IMF projection years are left out.',
      'Newey-West (HAC, Bartlett) standard errors with lag floor(4 x (n/100)^(2/9)). Needs 15 years; when the output gap covers fewer than 80% of them the regression runs without it and says so.',
      'Reading: rho above zero with p below 0.05 = the primary balance responds to debt (Bohn 1998\'s sufficient condition for sustainability holds in the sample); p below 0.10 = weak; otherwise no response found.',
    ],
    limits: 'A record of past behaviour on the whole sample: the response can change with governments and regimes, and short samples give wide errors. No response found does not by itself show debt is unsustainable. Not a forecast.',
    code: 'src/utils/bohnTest.ts',
  },
  {
    id: 'fiscal_multipliers',
    name: 'Fiscal multipliers (cited reference view)',
    where: 'Research > History & data, Policy review Diagnose, Fiscal & Debt Agent',
    method: [
      'The app does not estimate multipliers. It places a country in the IMF bucket approach (Batini, Eyraud, Forni and Weber 2014, IMF TNM 14/04) using only figures it holds, and shows the published first-year ranges (low 0.1-0.3, medium 0.4-0.6, large 0.7-1.0, Table 6) with the cycle and lower-bound adjustments from p.14.',
      'A characteristic the app has no data for stays "not known" and widens the range rather than being guessed.',
    ],
    limits: 'Calibrated on advanced economies; emerging and low-income countries generally sit in the low bucket. A reference, not an estimate.',
    code: 'src/utils/fiscalMultipliers.ts',
  },
];

function passMarkText(s: PreregisteredSpec): string {
  const p = s.passMark ?? {};
  const parts = [
    p.minCases !== undefined ? `at least ${p.minCases} cases` : '',
    p.minLiftPts !== undefined ? `a lift of ${p.minLiftPts} points or more over the base rate` : '',
    p.maxPValue !== undefined ? `p at or below ${p.maxPValue}` : '',
    s.framework === 2 && p.minSeriesShare !== undefined ? `a positive lift in at least ${Math.round(p.minSeriesShare * 100)}% of series` : '',
    s.framework === 2 && p.minYears !== undefined ? `at least ${p.minYears} years` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

function entrySection(e: RegisterEntry, specs: PreregisteredSpec[], verdicts: RecordedVerdict[]): string[] {
  const mine = specs.filter((s) => s.id === e.id).sort((a, b) => a.version - b.version);
  const ran = verdicts.filter((v) => v.id === e.id).sort((a, b) => a.version - b.version || a.ranAt.localeCompare(b.ranAt));
  const latest = ran[ran.length - 1];
  const out = [`### ${e.name}`, ''];
  out.push(`- **Says:** ${e.says}`);
  out.push(`- **Rule:** ${e.method}`);
  out.push(`- **Reads:** ${e.inputs}`);
  out.push(`- **Shows in:** ${e.where}`);
  out.push(`- **Use:** ${e.use}`);
  out.push(`- **Status:** ${latest ? `Backtest ${VERDICT_LABEL[latest.verdict].toLowerCase()} (version ${latest.version}, recorded ${latest.ranAt.slice(0, 10)})` : STATUS_LABEL[e.status]}`);
  out.push(`- **How it is tested:** ${e.testPlan}`);
  out.push(`- **Limits:** ${e.limits}`);
  out.push(`- **Code:** \`${e.code}\``);
  if (mine.length) {
    out.push('', '**Pre-registered tests**', '');
    for (const s of mine) {
      const retest = s.retestOf ? ` A re-test of version ${s.retestOf.version}, which ${s.retestOf.verdict}; what changed: ${s.retestOf.change}` : '';
      out.push(
        `- Version ${s.version} (\`docs/validation/preregistered/${s.file}\`, registered ${s.registeredOn}, method ${s.framework === 2 ? '2, whole years resampled' : '1, cases counted as independent'}${s.sample?.from ? `, sample from ${s.sample.from}` : ''}). ${s.hypothesis}${retest} Pass mark: ${passMarkText(s)}.${s.hash ? ` SHA-256 ${s.hash.slice(0, 16)}…` : ''}`
      );
    }
  }
  if (ran.length) {
    out.push('', '**Recorded verdicts**', '');
    for (const v of ran) out.push(`- Version ${v.version}, ${v.ranAt}: **${VERDICT_LABEL[v.verdict]}** (method ${v.method}). ${v.summary}`);
  } else if (mine.length) {
    out.push('', '**Recorded verdicts**', '', '- None recorded yet. Run `npm run backtest` (or Menu > Models & validation > Run backtests).');
  }
  const limits = mine.flatMap((s) => (s.knownLimits ?? []).map((l) => `v${s.version}: ${l}`));
  if (limits.length) out.push('', '**Known limits, stated before the run**', '', ...limits.map((l) => `- ${l}`));
  out.push('');
  return out;
}

export function methodsMarkdown(specs: PreregisteredSpec[], verdicts: RecordedVerdict[]): string {
  const latestFor = (id: string) =>
    verdicts.filter((v) => v.id === id).sort((a, b) => a.version - b.version || a.ranAt.localeCompare(b.ranAt)).pop();
  const out: string[] = [
    '# Methods',
    '',
    '<!-- Generated by `npm run docs:methods` from src/data/modelRegister.ts, docs/validation/preregistered/ and docs/validation/recorded-verdicts.json. Edit those, not this file. -->',
    '',
    `${RESEARCH_NOTICE} One note per model and signal: what it says, the rule, what it reads, where it shows, how it is`,
    'tested, its pre-registered backtests and the verdicts recorded from real runs. A verdict comes only from a test whose',
    'rule, sample and pass mark were fixed and hashed before it ran; a failed rule is never tuned until it passes (a',
    'changed rule is registered as a new, labelled re-test). Passing a backtest is not independent model validation.',
    '',
    'The live verdicts are in Menu > Models & validation, read from `data/local/validation/results.json` on the computer',
    'that ran them; they win over the recorded verdicts here, which are copied from the owner\'s runs.',
    '',
    '**Method 1** counts each case as independent. **Method 2** redraws whole calendar years of cases together 4,000',
    'times (fixed seed), reports a 90% range for the lift and a p-value, and asks that the lift is positive in at least',
    'half the series with five or more cases. A p-value of 0.00025 is the smallest 4,000 redraws can give.',
    '',
    '## Summary',
    '',
    '| Model or signal | Use | Status | Latest recorded verdict |',
    '| --- | --- | --- | --- |',
    ...MODEL_REGISTER.map((e) => {
      const v = latestFor(e.id);
      return `| ${e.name} | ${e.use} | ${v ? `Backtest ${VERDICT_LABEL[v.verdict].toLowerCase()}` : STATUS_LABEL[e.status]} | ${v ? `v${v.version}, ${v.ranAt.slice(0, 10)}, method ${v.method}` : 'None'} |`;
    }),
    ...STATED_METHODS.map((m) => `| ${m.name} | Research | Stated method, no call to test | Not applicable |`),
    '',
    '## Models and signals',
    '',
  ];
  for (const e of MODEL_REGISTER) out.push(...entrySection(e, specs, verdicts));
  out.push('## Stated-method views', '', 'These show where things stand on a stated method and make no call a backtest could score.', '');
  for (const m of STATED_METHODS) {
    out.push(`### ${m.name}`, '', `- **Shows in:** ${m.where}`, ...m.method.map((l) => `- ${l}`), `- **Limits:** ${m.limits}`, `- **Code:** \`${m.code}\``, '');
  }
  return out.join('\n');
}
