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
