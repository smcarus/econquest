/**
 * Fiscal what-if (Sam, 2026-11-08): take today's figures, change one spending line, and re-run the
 * app's own tools on it. The line is a COFOG sector (govSpending.ts: Eurostat or IMF); defence uses
 * the World Bank's military spending (SIPRI) first, as it is newer.
 *
 * What changes:
 * - Spending on the line moves by `cutPp` points of GDP (spending x share cut).
 * - The freed money is either spent elsewhere ("respend") or kept to lower the deficit ("deficit").
 *   A question that says neither is run both ways, side by side.
 * - First-year growth effect = multiplier x change in spending (points of GDP), low and high ends of
 *   the cited IMF range (fiscalMultipliers.ts) unless the reader sets their own. Respending at the
 *   same multiplier as the cut nets to zero: the range does not tell defence and other spending
 *   apart, and the answer says so rather than guessing.
 * - Debt: the debt identity (debtSustainability.nextDebt) on the IMF baseline inputs, with the
 *   primary balance raised by the money kept and year-one real growth moved by the growth effect.
 *   The growth effect is a one-off change in the level of output, so later years keep IMF growth.
 *
 * No figure here is built in: the spending figure, the inputs and the multiplier range all come
 * from the caller with their sources. Browser-safe.
 */
import { nextDebt, nominalGrowthPct, type YearAssump } from './debtSustainability';
import { sectorsInQuestion, type CofogSector } from './govSpending';

export type WhatIfUse = 'respend' | 'deficit';

export interface WhatIfQuestion {
  /** The spending line, a COFOG sector. */
  sector: CofogSector;
  /** Share of the line removed: 0.5 = halved. Negative = an increase (doubled = -1). */
  share: number;
  /** Where the money goes; both when the question does not say. */
  uses: WhatIfUse[];
  /** The words that set the change, for the reading. */
  said: string;
}

const MOVE_RES: Array<{ re: RegExp; share: (m: RegExpExecArray) => number }> = [
  { re: /\b(?:halved|halving|halve|cut (?:it |them )?in half|by half|50 ?(?:%|percent|per cent))\b/i, share: () => 0.5 },
  { re: /\b(?:cut|reduced?|reducing|slash(?:ed|ing)?|lower(?:ed|ing)?|trimm?(?:ed|ing)?)\b[^.?!]{0,40}?\bby (\d{1,2}(?:\.\d+)?) ?(?:%|percent|per cent)/i, share: (m) => Number(m[1]) / 100 },
  { re: /\b(\d{1,2}(?:\.\d+)?) ?(?:%|percent|per cent) (?:cut|reduction|lower)\b/i, share: (m) => Number(m[1]) / 100 },
  { re: /\b(?:by a third|cut (?:it )?by one third)\b/i, share: () => 1 / 3 },
  { re: /\b(?:by a quarter|cut (?:it )?by one quarter)\b/i, share: () => 0.25 },
  { re: /\b(?:scrapped|abolished|eliminated|zeroed)\b/i, share: () => 1 },
  { re: /\bdoubled?\b|\bdoubling\b/i, share: () => -1 },
];
const RESPEND_RE = /\b(?:reallocat\w*|redirect\w*|re-?spen[dt]\w*|spent on|spend (?:it )?on|put (?:back )?into|invest\w* in|back (?:in)?to the economy|restructur\w*|infrastructure|education|health)\b/i;
const DEFICIT_RE = /\b(?:deficit|pay (?:down|off) (?:the )?debt|debt reduction|reduce (?:the )?debt|borrow less|save[ds]?)\b/i;

/** Reads a what-if about a spending line from plain words; null when the question is not one. */
export function parseWhatIf(question: string): WhatIfQuestion | null {
  // The sector named first in the question is the one changed ("halve defence and spend it on schools").
  const sector = sectorsInQuestion(question).sort((a, b) => question.search(a.words) - question.search(b.words))[0];
  if (!sector) return null;
  for (const m of MOVE_RES) {
    const hit = m.re.exec(question);
    if (!hit) continue;
    const share = m.share(hit);
    if (!Number.isFinite(share) || share === 0 || share > 1) return null;
    const respend = RESPEND_RE.test(question);
    const deficit = DEFICIT_RE.test(question);
    const uses: WhatIfUse[] = respend && !deficit ? ['respend'] : deficit && !respend ? ['deficit'] : ['respend', 'deficit'];
    return { sector, share, uses, said: hit[0] };
  }
  return null;
}

export interface WhatIfInputs {
  /** Spending on the line, % of GDP, with its year and source. */
  spend: { pct: number; year: string; source: string };
  share: number;
  uses: WhatIfUse[];
  /** Debt now and the year it is for (the DSA's last outturn). */
  debtNow: number;
  year: string;
  /** The DSA baseline inputs, one per projection year (IMF growth, inflation, interest, primary balance). */
  baseline: YearAssump[];
  /** First-year multiplier range for the cut, with its source; respending uses the same unless set. */
  multiplier: { low: number; high: number; source: string };
  respendMultiplier?: { low: number; high: number; source: string };
}

export interface WhatIfRun {
  use: WhatIfUse;
  /** Change in the primary balance, points of GDP (up = less borrowing). */
  pbChangePp: number;
  /** First-year change in real GDP, %, low and high ends. */
  growth: { low: number; high: number };
  /** Debt at the end of the horizon, % of GDP: baseline, and with the change at each end of the range. */
  debtEnd: { year: string; baseline: number; low: number; high: number };
}

export interface WhatIfResult {
  cutPp: number;
  newSpendPct: number;
  runs: WhatIfRun[];
  method: string;
}

const r2 = (v: number) => Number(v.toFixed(2));

function pathEnd(debtNow: number, years: YearAssump[]): number {
  let d = debtNow;
  for (const y of years) d = nextDebt(d, y.i, nominalGrowthPct(y.g, y.pi), y.pb);
  return d;
}

/** Runs the change through the debt identity on the IMF baseline; null without baseline inputs. */
export function runWhatIf(inp: WhatIfInputs): WhatIfResult | null {
  if (!inp.baseline.length || !(inp.spend.pct > 0)) return null;
  const cutPp = inp.spend.pct * inp.share;
  const respendM = inp.respendMultiplier || inp.multiplier;
  const baseEnd = pathEnd(inp.debtNow, inp.baseline);
  const endYear = inp.baseline[inp.baseline.length - 1].year;
  const runs: WhatIfRun[] = inp.uses.map((use) => {
    const pbChangePp = use === 'deficit' ? cutPp : 0;
    // The cut takes m x cut off output; respending adds the respend multiplier back.
    const g = (m: 'low' | 'high') => -inp.multiplier[m] * cutPp + (use === 'respend' ? respendM[m] * cutPp : 0);
    const growth = { low: r2(Math.min(g('low'), g('high'))), high: r2(Math.max(g('low'), g('high'))) };
    const shifted = (dg: number) => inp.baseline.map((y, k) => ({ ...y, g: k === 0 ? y.g + dg : y.g, pb: y.pb + pbChangePp }));
    const a = pathEnd(inp.debtNow, shifted(growth.low));
    const b = pathEnd(inp.debtNow, shifted(growth.high));
    return { use, pbChangePp: r2(pbChangePp), growth, debtEnd: { year: endYear, baseline: r2(baseEnd), low: r2(Math.min(a, b)), high: r2(Math.max(a, b)) } };
  });
  return {
    cutPp: r2(cutPp),
    newSpendPct: r2(inp.spend.pct - cutPp),
    runs,
    method: `Spending change = ${inp.spend.pct.toFixed(2)}% of GDP (${inp.spend.source}, ${inp.spend.year}) x ${Math.round(inp.share * 100)}%. First-year growth effect = multiplier x spending change, at both ends of the range (${inp.multiplier.source}); respending ${inp.respendMultiplier ? `at ${inp.respendMultiplier.source}` : 'at the same range, so it nets to zero'}. Debt: d(t) = d(t-1)(1+i)/(1+n) - pb on the IMF baseline inputs from ${inp.year}, primary balance raised by the money kept, year-one growth moved by the growth effect (a one-off level change). Not a forecast.`,
  };
}

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

/** One plain sentence per run, for the agent's reading. */
export function whatIfSentence(r: WhatIfRun, cutPp: number): string {
  const g = r.growth.low === r.growth.high ? `${sgn(r.growth.low)}%` : `${sgn(r.growth.low)}% to ${sgn(r.growth.high)}%`;
  const d = r.debtEnd.low === r.debtEnd.high ? `${r.debtEnd.low.toFixed(1)}%` : `${r.debtEnd.low.toFixed(1)}-${r.debtEnd.high.toFixed(1)}%`;
  return r.use === 'respend'
    ? `If the ${cutPp.toFixed(1)}% of GDP is spent elsewhere, borrowing is unchanged; first-year growth moves ${g} on the cited range, and debt in ${r.debtEnd.year} is ${d} of GDP against ${r.debtEnd.baseline.toFixed(1)}% on the IMF baseline.`
    : `If the ${cutPp.toFixed(1)}% of GDP is kept to cut the deficit, first-year growth moves ${g}, and debt in ${r.debtEnd.year} is ${d} of GDP against ${r.debtEnd.baseline.toFixed(1)}% on the IMF baseline.`;
}
