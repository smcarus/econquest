/**
 * W1 worked examples (Menu > Worked examples): four guided case studies that go from a question to
 * a short memo using the app's own screens. Each one reads the figures saved on this computer for
 * the open country, on the day: never a built-in number. A figure no feed has filled reads Missing,
 * and a step that needs it says so instead of working it out.
 *
 * The words are English here; Spanish and French are in src/i18n/{es,fr}/workedText.ts, swapped at
 * display time (translateText). The memo draft stays in the reader's language choice at display;
 * the copy and download use the same words the reader sees.
 *
 * Browser-safe: no fs, no React.
 */
import type { OpenDataSnapshot } from '../types/council';
import type { ToolTarget } from '../data/toolsCatalog';
import { getSnapshotDataStatus } from './dataStatus';

export type WorkedExampleId = 'debt' | 'inflation' | 'currency' | 'policy';

/** A figure a step reads, by its snapshot path ('imf.debtToGdpPct'). */
export interface WorkedFigureDef {
  path: string;
  label: string;
  unit: string;
}

export interface WorkedStep {
  title: string;
  /** What to do and why, in plain words. */
  text: string;
  /** Where the screen is, as the menus name it. */
  where?: string;
  /** Opens that screen. */
  target?: ToolTarget;
  /** A question for the reader; their own answer goes in the memo. */
  ask?: string;
}

export interface WorkedExample {
  id: WorkedExampleId;
  title: string;
  question: string;
  /** One line on what the reader learns. */
  learn: string;
  figures: WorkedFigureDef[];
  steps: WorkedStep[];
}

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: 'debt',
    title: 'Debt sustainability',
    question: 'Is government debt on a path the country can keep up?',
    learn: 'How debt, growth, inflation and interest rates fit together, and what budget balance holds debt steady.',
    figures: [
      { path: 'imf.debtToGdpPct', label: 'Government debt', unit: '% of GDP' },
      { path: 'imf.debtToGdpForecast2027Pct', label: 'Government debt, IMF projection', unit: '% of GDP' },
      { path: 'imf.primaryFiscalBalancePct', label: 'Primary balance (before interest)', unit: '% of GDP' },
      { path: 'imf.realGdpGrowthPct', label: 'Real GDP growth', unit: '%' },
      { path: 'imf.cpiInflationPct', label: 'Inflation', unit: '%' },
      { path: 'market.sovereign10YBondYieldPct', label: '10-year government bond yield', unit: '%' },
      { path: 'wb.interestPctRevenue', label: 'Interest paid', unit: '% of revenue' },
    ],
    steps: [
      {
        title: 'Read the starting figures',
        text: 'Look at the figures above. Debt alone says little: a country with fast growth and low interest rates can carry more debt than one with slow growth and high rates. Note the year beside each figure; the IMF projection is for a later year than the debt figure.',
        ask: 'Is debt rising or falling between the latest year and the IMF projection?',
      },
      {
        title: 'Open the debt path',
        text: 'The Debt sustainability panel projects debt over five years from the same figures, and shows what happens with lower growth, higher interest rates or a weaker budget. It runs only when every input is live.',
        where: 'Research > History & data > Debt sustainability',
        target: { area: 'country', tab: 'history', anchor: 'tool-debt-sustainability' },
        ask: 'Which shock moves debt the most?',
      },
      {
        title: 'Work out the budget that holds debt steady',
        text: 'Debt as a share of GDP stays flat when the primary balance equals debt × (interest rate − nominal growth) ÷ (1 + nominal growth). Nominal growth is real growth plus inflation. The 10-year yield stands in for the interest rate on new borrowing; the average rate on all debt is usually lower, so this is a cautious reading. The working is shown below when every figure is live.',
        ask: 'How far is the actual primary balance from the one that holds debt steady?',
      },
      {
        title: 'Ask the council (optional)',
        text: 'In Council chat, ask: "Is government debt sustainable, and what would change the answer?" The answer is written by the AI model and names its figures; check them against the ones above.',
        where: 'Workspace > Council chat',
        target: { area: 'today', anchor: 'tool-council' },
      },
      {
        title: 'Write the memo',
        text: 'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words.',
      },
    ],
  },
  {
    id: 'inflation',
    title: 'Inflation and interest rates',
    question: "Is the central bank's policy tight or loose?",
    learn: 'What a real interest rate is, and how inflation, the output gap and unemployment point to tighter or looser policy.',
    figures: [
      { path: 'imf.cpiInflationPct', label: 'Inflation', unit: '%' },
      { path: 'market.policyRatePct', label: 'Central bank policy rate', unit: '%' },
      { path: 'imf.outputGapPct', label: 'Output gap', unit: '% of potential GDP' },
      { path: 'imf.unemploymentPct', label: 'Unemployment rate', unit: '%' },
      { path: 'imf.realGdpGrowthPct', label: 'Real GDP growth', unit: '%' },
    ],
    steps: [
      {
        title: 'Read the starting figures',
        text: 'The policy rate is the interest rate the central bank sets. What matters for borrowers and savers is the rate after inflation, called the real rate. The IMF inflation figure is for the year shown beside it; the latest monthly figure is in History & data.',
        ask: 'Is inflation above or below the central bank target you know of?',
      },
      {
        title: 'Work out the real policy rate',
        text: 'Real policy rate = policy rate − inflation. A clearly positive real rate usually holds spending and prices back (tight); a negative one pushes them up (loose). The working is shown below when both figures are live.',
        ask: 'Is the real rate positive or negative, and by how much?',
      },
      {
        title: 'Check how busy the economy is',
        text: 'The output gap is how far the economy runs above (positive) or below (negative) what it can produce without pushing up prices. A positive gap with high inflation argues for tighter policy; a negative gap with low inflation argues for looser policy. The IMF publishes an output gap mostly for advanced economies; elsewhere it reads Missing and the Output gap panel estimates one from the data.',
        where: 'Research > History & data > Output gap',
        target: { area: 'country', tab: 'history', anchor: 'tool-output-gap' },
        ask: 'Do the output gap and unemployment point the same way as the real rate?',
      },
      {
        title: 'Compare with other countries',
        text: 'Markets & signals shows whether interest rates are tight or loose against the country’s peers.',
        where: 'Research > Markets & signals',
        target: { area: 'country', tab: 'macro' },
      },
      {
        title: 'Write the memo',
        text: 'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words.',
      },
    ],
  },
  {
    id: 'currency',
    title: 'The currency',
    question: 'How exposed is the currency if foreign money stops coming in?',
    learn: 'How reserves, the current account and external debt show a country’s cushion against a sudden stop.',
    figures: [
      { path: 'market.exchangeRatePerUsd', label: 'Exchange rate', unit: 'per US dollar' },
      { path: 'market.fxYtdChangePct', label: 'Change since 1 January', unit: '%' },
      { path: 'wb.fxReservesMonthsImport', label: 'Reserves', unit: 'months of imports' },
      { path: 'imf.currentAccountImfPct', label: 'Current account balance', unit: '% of GDP' },
      { path: 'wb.externalDebtPctGni', label: 'External debt', unit: '% of GNI' },
    ],
    steps: [
      {
        title: 'Read the starting figures',
        text: 'A current account deficit means the country spends more abroad than it earns and must borrow or attract investment to pay for it. Reserves are the foreign money the central bank holds to pay bills or support the currency if that money stops.',
        ask: 'Does the country earn more abroad than it spends (surplus), or less (deficit)?',
      },
      {
        title: 'Check the cushion',
        text: 'A common rule of thumb treats reserves worth three months of imports as the minimum. The working below compares the figure with that line when it is live. The Reserve adequacy panel uses the IMF’s fuller measure, which also counts debt falling due and money that could leave.',
        where: 'Research > History & data > Reserve adequacy',
        target: { area: 'country', tab: 'history', anchor: 'tool-reserve-adequacy' },
        ask: 'Would the reserves last long if foreign money stopped?',
      },
      {
        title: 'Look at the market',
        text: 'Markets & signals shows whether the currency looks strong or weak against its peers, and how much extra interest it pays for the swings it brings.',
        where: 'Research > Markets & signals',
        target: { area: 'country', tab: 'macro' },
        ask: 'Has the currency already fallen this year, and does that fit the figures above?',
      },
      {
        title: 'Write the memo',
        text: 'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words.',
      },
    ],
  },
  {
    id: 'policy',
    title: 'A policy review',
    question: 'Can the government afford to spend 1% of GDP more each year?',
    learn: 'How a spending plan changes the budget and debt, who pays for it, and how to set out options in a policy review.',
    figures: [
      { path: 'imf.revenuePct', label: 'Government revenue', unit: '% of GDP' },
      { path: 'imf.expenditurePct', label: 'Government spending', unit: '% of GDP' },
      { path: 'imf.overallBalancePct', label: 'Overall budget balance', unit: '% of GDP' },
      { path: 'imf.debtToGdpPct', label: 'Government debt', unit: '% of GDP' },
      { path: 'wb.taxRevenuePctGdp', label: 'Tax revenue, central government', unit: '% of GDP' },
      { path: 'wb.interestPctRevenue', label: 'Interest paid', unit: '% of revenue' },
      { path: 'wb.giniIndex', label: 'Income inequality (Gini)', unit: '0 to 100' },
    ],
    steps: [
      {
        title: 'Read the starting figures',
        text: 'The overall balance is revenue minus spending, including interest. Spending 1% of GDP more without new revenue makes the balance 1 point worse and, other things equal, adds about 1 point of GDP to debt each year. The working below shows the new balance when the figures are live.',
        ask: 'Would the plan be paid for by borrowing, higher taxes or cuts elsewhere?',
      },
      {
        title: 'Start a policy review',
        text: 'In Policy reviews, choose the country and write the goal, for example "spend 1% of GDP more on schools without raising debt above its current level". The review sets out options, what each would cost, who would pay, and how each could fail, and checks the result after 12 and 24 months.',
        where: 'Reports > Memos and notes > Policy reviews',
        target: { area: 'reports', anchor: 'tool-policy-reviews' },
        ask: 'Which option would you choose, and who bears its cost?',
      },
      {
        title: 'Weigh who pays',
        text: 'Tax revenue and inequality show how much room there is to raise taxes and who would feel it. Interest already paid shows how much of today’s revenue is spoken for.',
        ask: 'Is there room to raise revenue, or would the plan need borrowing?',
      },
      {
        title: 'Write the memo',
        text: 'The draft below holds the question, the figures with their sources and years, the working, and space for your own answers. Copy or download it, then write your conclusion in your own words. Policy reviews can also write a memo from the review itself.',
      },
    ],
  },
];

export const WORKED_MISSING = 'Missing: no live figure is saved for this country yet (Menu > Data health shows why).';
export const WORKED_NEEDS = 'Not worked out: it needs {list}, which read Missing.';

export interface WorkedFigure extends WorkedFigureDef {
  value?: number;
  source?: string;
  /** Year or date the figure is for. */
  when?: string;
}

/** The example's figures from the snapshot: live ones only, with source and year. */
export function workedFigures(example: WorkedExample, snapshot: OpenDataSnapshot | null | undefined): WorkedFigure[] {
  if (!snapshot) return example.figures.map((f) => ({ ...f }));
  const status = getSnapshotDataStatus(snapshot);
  const years = snapshot.imfIndicators?.years || {};
  return example.figures.map((f) => {
    if (f.path === 'market.sovereign10YBondYieldPct') {
      // Only an official series counts for the 10-year yield (src/utils/dataStatus.ts).
      const y = status.officialYield;
      return y && Number.isFinite(y.valuePct) ? { ...f, value: y.valuePct, source: y.source, when: y.period } : { ...f };
    }
    const value = status.live(f.path);
    if (value === undefined) return { ...f };
    const source = snapshot.liveFields?.[f.path];
    let when = years[f.path];
    if (f.path === 'market.policyRatePct' && snapshot.bisPolicyRate) when = snapshot.bisPolicyRate.date;
    return { ...f, value, source, when };
  });
}

export interface WorkedLine {
  label: string;
  /** The result, when every input is live. */
  value?: number;
  unit: string;
  /** How it was worked out, as a sum with the inputs (numbers only). */
  working?: string;
  /** A sentence on how to read the result. */
  note?: string;
  /** The figures it needs that read Missing, by label; set instead of value and working. */
  needs?: string[];
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const fmt = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

/** The step-3-style working for each example: worked out only when every input is live. */
export function workedLines(example: WorkedExample, figures: WorkedFigure[]): WorkedLine[] {
  const get = (path: string) => figures.find((f) => f.path === path);
  const need = (paths: string[]): number[] | string[] => {
    const missing = paths.filter((p) => get(p)?.value === undefined);
    if (missing.length) return missing.map((p) => get(p)?.label ?? p);
    return paths.map((p) => get(p)!.value as number);
  };
  const missed = (v: number[] | string[]): v is string[] => typeof v[0] === 'string';
  if (example.id === 'debt') {
    const v = need(['imf.debtToGdpPct', 'market.sovereign10YBondYieldPct', 'imf.realGdpGrowthPct', 'imf.cpiInflationPct', 'imf.primaryFiscalBalancePct']);
    if (missed(v)) return [{ label: 'Primary balance that holds debt steady', unit: '% of GDP', needs: v }];
    const [d, i, g, p, pb] = v;
    const n = ((1 + g / 100) * (1 + p / 100) - 1) * 100;
    const pbStar = (d * (i - n)) / (100 + n);
    return [
      { label: 'Nominal growth', value: r1(n), unit: '%', working: `(1 + ${fmt(g)}%) × (1 + ${fmt(p)}%) − 1 = ${fmt(n)}%` },
      { label: 'Primary balance that holds debt steady', value: r1(pbStar), unit: '% of GDP', working: `${fmt(d)} × (${fmt(i)} − ${fmt(n)}) ÷ (100 + ${fmt(n)}) = ${fmt(pbStar)}` },
      { label: 'Gap to the actual primary balance', value: r1(pbStar - pb), unit: 'points of GDP', working: `${fmt(pbStar)} − (${fmt(pb)}) = ${fmt(pbStar - pb)}`, note: 'Positive means the budget would need to improve by this much to hold debt steady.' },
    ];
  }
  if (example.id === 'inflation') {
    const v = need(['market.policyRatePct', 'imf.cpiInflationPct']);
    if (missed(v)) return [{ label: 'Real policy rate', unit: '%', needs: v }];
    const [rate, inf] = v;
    return [{ label: 'Real policy rate', value: r1(rate - inf), unit: '%', working: `${fmt(rate)} − ${fmt(inf)} = ${fmt(rate - inf)}`, note: 'The inflation figure is for its IMF year, so the real rate today may differ.' }];
  }
  if (example.id === 'currency') {
    const v = need(['wb.fxReservesMonthsImport']);
    if (missed(v)) return [{ label: 'Reserves against the three-month line', unit: 'months', needs: v }];
    const [m] = v;
    return [{ label: 'Reserves against the three-month line', value: r1(m - 3), unit: 'months', working: `${fmt(m)} − 3 = ${fmt(m - 3)}`, note: m >= 3 ? 'Above the rule-of-thumb minimum.' : 'Below the rule-of-thumb minimum.' }];
  }
  const v = need(['imf.overallBalancePct', 'imf.debtToGdpPct']);
  if (missed(v)) return [{ label: 'Overall balance with the plan', unit: '% of GDP', needs: v }];
  const [bal, d] = v;
  return [
    { label: 'Overall balance with the plan', value: r1(bal - 1), unit: '% of GDP', working: `${fmt(bal)} − 1 = ${fmt(bal - 1)}` },
    { label: 'Debt after one year, if borrowed', value: r1(d + 1), unit: '% of GDP', working: `${fmt(d)} + 1 = ${fmt(d + 1)}`, note: 'Before the effect of growth and inflation.' },
  ];
}

export interface MemoWords {
  question: string;
  figures: string;
  working: string;
  answers: string;
  yourAnswer: string;
  conclusion: string;
  footer: string;
}

export const MEMO_WORDS: MemoWords = {
  question: 'Question',
  figures: 'Figures',
  working: 'Working',
  answers: 'Your answers',
  yourAnswer: 'Your answer:',
  conclusion: 'Conclusion (in your own words):',
  footer: 'Figures as saved on this computer on {date}. Every figure names its source and year; none is built in.',
};

/**
 * The memo draft as Markdown. `tx` swaps known English text for the reader's language (identity in
 * English), so the copy matches the screen.
 */
export function memoDraft(
  example: WorkedExample,
  countryName: string,
  figures: WorkedFigure[],
  lines: WorkedLine[],
  date: string,
  tx: (s: string) => string = (s) => s,
): string {
  const out: string[] = [];
  out.push(`# ${tx(example.title)}: ${countryName}`, '');
  out.push(`## ${tx(MEMO_WORDS.question)}`, '', tx(example.question), '');
  out.push(`## ${tx(MEMO_WORDS.figures)}`, '');
  for (const f of figures) {
    if (f.value === undefined) out.push(`- ${tx(f.label)}: ${tx(WORKED_MISSING)}`);
    else out.push(`- ${tx(f.label)}: ${fmt(f.value)} ${tx(f.unit)}${f.source || f.when ? ` (${[f.source, f.when].filter(Boolean).join(', ')})` : ''}`);
  }
  out.push('', `## ${tx(MEMO_WORDS.working)}`, '');
  for (const l of lines) out.push(`- ${tx(l.label)}: ${lineText(l, tx)}`);
  out.push('', `## ${tx(MEMO_WORDS.answers)}`, '');
  for (const s of example.steps) if (s.ask) out.push(`- ${tx(s.ask)}`, `  ${tx(MEMO_WORDS.yourAnswer)} `);
  out.push('', tx(MEMO_WORDS.conclusion), '', '', '---', tx(MEMO_WORDS.footer).replace('{date}', date), '');
  return out.join('\n');
}

/** 'Government debt' -> 'government debt' inside a sentence; 'IMF ...' stays. */
const lowerFirst = (x: string) => (/^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);

/** One working line in words: the result and the sum, or what it needs. */
export function lineText(l: WorkedLine, tx: (s: string) => string = (s) => s): string {
  if (l.value === undefined) return tx(WORKED_NEEDS).replace('{list}', (l.needs || []).map((n) => lowerFirst(tx(n))).join(', '));
  return [`${fmt(l.value)} ${tx(l.unit)}`, l.working ? `(${l.working})` : '', l.note ? tx(l.note) : ''].filter(Boolean).join(' ');
}

/** Every English sentence the worked examples show, for the translation check. */
export function workedTexts(): string[] {
  const out = new Set<string>([WORKED_MISSING, WORKED_NEEDS, ...Object.values(MEMO_WORDS)]);
  for (const e of WORKED_EXAMPLES) {
    [e.title, e.question, e.learn].forEach((s) => out.add(s));
    for (const f of e.figures) [f.label, f.unit].forEach((s) => out.add(s));
    for (const s of e.steps) [s.title, s.text, s.where, s.ask].forEach((x) => x && out.add(x));
  }
  for (const l of ['Nominal growth', 'Primary balance that holds debt steady', 'Gap to the actual primary balance', 'Real policy rate', 'Reserves against the three-month line', 'Overall balance with the plan', 'Debt after one year, if borrowed', 'points of GDP', 'months', 'Positive means the budget would need to improve by this much to hold debt steady.', 'The inflation figure is for its IMF year, so the real rate today may differ.', 'Above the rule-of-thumb minimum.', 'Below the rule-of-thumb minimum.', 'Before the effect of growth and inflation.'])
    out.add(l);
  return [...out];
}
