/**
 * Fiscal what-if (Sam, 2026-11-08): take today's figures, change one spending line, and re-run the
 * app's own tools on it. The line is a COFOG sector (govSpending.ts: Eurostat or IMF); defence uses
 * the World Bank's military spending (SIPRI) first, as it is newer.
 *
 * What changes:
 * - Spending on the line moves by `cutPp` points of GDP (spending x share cut).
 * - The freed money is either spent elsewhere ("respend") or kept to lower the deficit ("deficit").
 *   A question that says neither is run both ways, side by side.
 * - Output effect, year by year: a published path per point of GDP of spending
 *   (src/data/spendingMultipliers.ts): Barro and Redlick for a defence cut, Abiad, Furceri and
 *   Topalova (IMF WP/15/95) for money put into public investment, and otherwise the IMF bucket range
 *   (fiscalMultipliers.ts) held as a level. Respending on the same path as the cut nets to zero, and
 *   the answer says so rather than guessing.
 * - Budget feedback: where a published semi-elasticity exists (European Commission for EU members,
 *   else the OECD's table), the
 *   primary balance also moves by semi-elasticity x the output change.
 * - Debt: the debt identity (debtSustainability.nextDebt) on the IMF baseline inputs, with the
 *   primary balance raised by the money kept (and the feedback), and growth moved each year by the
 *   change in the output level.
 *
 * No figure here is built in: the spending figure, the inputs, the paths and the semi-elasticity all
 * come from the caller or the cited data file, with their sources. Browser-safe.
 */
import { nextDebt, nominalGrowthPct, type YearAssump } from './debtSustainability';
import { sectorByCode, sectorsInQuestion, TABLE_LABEL, type CofogSector } from './govSpending';
import { DEFENCE, INVESTMENT_WORDS, PUBLIC_INVESTMENT, semiElasticityFor, type MultiplierPath } from '../data/spendingMultipliers';
import { multiplierView, TNM_CITATION } from './fiscalMultipliers';
import type { LiveWatchlistItem } from '../types/council';

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
  /** Where respent money goes: public investment when the question says so, else other spending. */
  destination: 'investment' | 'other';
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
    return { sector, share, uses, said: hit[0], destination: INVESTMENT_WORDS.test(question) ? 'investment' : 'other' };
  }
  return null;
}

/** An output-level path per 1 pp of GDP of spending, years 1..5, low and high ends, with its source. */
export interface PathRange {
  low: number[];
  high: number[];
  source: string;
}

/** A first-year multiplier range held as a level from then on (the IMF bucket range states year one only). */
export function flatPath(low: number, high: number, source: string, years = 5): PathRange {
  return { low: Array(years).fill(low), high: Array(years).fill(high), source };
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
  /** Output effect of the cut, per pp of GDP, by year. */
  cut: PathRange;
  /** Output effect of the money respent, per pp of GDP, by year; the cut's own path when not set (nets to zero). */
  respend?: PathRange;
  /** Budget balance semi-elasticity to the output gap; without one the budget does not respond to the output change. */
  semiElasticity?: { value: number; source: string };
}

export interface WhatIfRun {
  use: WhatIfUse;
  /** Policy change in the primary balance, points of GDP (up = less borrowing), before the budget's response to output. */
  pbChangePp: number;
  /** First-year change in real GDP, %, low and high ends. */
  growth: { low: number; high: number };
  /** Change in the level of real GDP by the last year, %, low and high ends. */
  level: { year: string; low: number; high: number };
  /** The budget's response to that output change in the last year, points of GDP (semi-elasticity x output change). */
  feedback?: { low: number; high: number };
  /** Debt at the end of the horizon, % of GDP: baseline, and with the change at each end of the range. */
  debtEnd: { year: string; baseline: number; low: number; high: number };
  /** Year by year: debt on the baseline and at each end, and the output level at each end. */
  years: Array<{ year: string; debtBaseline: number; debtLow: number; debtHigh: number; levelLow: number; levelHigh: number }>;
}

export interface WhatIfResult {
  cutPp: number;
  newSpendPct: number;
  runs: WhatIfRun[];
  method: string;
}

const r2 = (v: number) => Number(v.toFixed(2));
const at = (xs: number[], k: number) => xs[Math.min(k, xs.length - 1)] ?? 0;

function debtPath(debtNow: number, years: YearAssump[]): number[] {
  let d = debtNow;
  return years.map((y) => (d = nextDebt(d, y.i, nominalGrowthPct(y.g, y.pi), y.pb)));
}

/** Runs the change through the debt identity on the IMF baseline; null without baseline inputs. */
export function runWhatIf(inp: WhatIfInputs): WhatIfResult | null {
  if (!inp.baseline.length || !(inp.spend.pct > 0)) return null;
  const cutPp = inp.spend.pct * inp.share;
  const respend = inp.respend || inp.cut;
  const eps = inp.semiElasticity?.value;
  const basePath = debtPath(inp.debtNow, inp.baseline);
  const baseEnd = basePath[basePath.length - 1];
  const last = inp.baseline.length - 1;
  const endYear = inp.baseline[last].year;
  const runs: WhatIfRun[] = inp.uses.map((use) => {
    const kept = use === 'deficit' ? cutPp : 0;
    // Weak end: the cut costs the most output and respending adds the least; strong end the other way.
    // Money respent on the cut's own path takes the same end, so it nets to zero.
    const samePath = !inp.respend;
    const levels = (end: 'weak' | 'strong') =>
      inp.baseline.map((_, k) => {
        const cutM = at(end === 'weak' ? inp.cut.high : inp.cut.low, k);
        const resM = samePath ? cutM : at(end === 'weak' ? respend.low : respend.high, k);
        return cutPp * (-cutM + (use === 'respend' ? resM : 0));
      });
    const run = (lv: number[]) =>
      debtPath(inp.debtNow, inp.baseline.map((y, k) => ({ ...y, g: y.g + lv[k] - (k ? lv[k - 1] : 0), pb: y.pb + kept + (eps !== undefined ? eps * lv[k] : 0) })));
    const weak = levels('weak');
    const strong = levels('strong');
    const [pw, ps] = [run(weak), run(strong)];
    const [dw, ds] = [pw[last], ps[last]];
    const lo = (a: number, b: number) => r2(Math.min(a, b));
    const hi = (a: number, b: number) => r2(Math.max(a, b));
    return {
      use,
      pbChangePp: r2(kept),
      growth: { low: lo(weak[0], strong[0]), high: hi(weak[0], strong[0]) },
      level: { year: endYear, low: lo(weak[last], strong[last]), high: hi(weak[last], strong[last]) },
      ...(eps !== undefined ? { feedback: { low: lo(eps * weak[last], eps * strong[last]), high: hi(eps * weak[last], eps * strong[last]) } } : {}),
      debtEnd: { year: endYear, baseline: r2(baseEnd), low: lo(dw, ds), high: hi(dw, ds) },
      years: inp.baseline.map((y, k) => ({ year: y.year, debtBaseline: r2(basePath[k]), debtLow: lo(pw[k], ps[k]), debtHigh: hi(pw[k], ps[k]), levelLow: lo(weak[k], strong[k]), levelHigh: hi(weak[k], strong[k]) })),
    };
  });
  const same = !inp.respend;
  return {
    cutPp: r2(cutPp),
    newSpendPct: r2(inp.spend.pct - cutPp),
    runs,
    method: [
      `Spending change = ${inp.spend.pct.toFixed(2)}% of GDP (${inp.spend.source}, ${inp.spend.year}) x ${Math.round(inp.share * 100)}%.`,
      `Output effect of the cut: ${inp.cut.source}; of the money respent: ${same ? 'the same, so respending nets to zero' : respend.source}. Each year's output level = spending change x the published effect for that year; growth moves by the change in that level.`,
      eps !== undefined ? `The budget responds to the output change by ${eps} x the change (${inp.semiElasticity!.source}).` : 'The budget\'s response to the output change is not included: no published semi-elasticity in the app for this country.',
      `Debt: d(t) = d(t-1)(1+i)/(1+n) - pb on the IMF baseline inputs from ${inp.year}. Not a forecast.`,
    ].join(' '),
  };
}

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

/** One plain sentence per run, for the agent's reading. */
export function whatIfSentence(r: WhatIfRun, cutPp: number, respendLabel = 'other spending'): string {
  const range = (a: number, b: number, unit = '%') => (a === b ? `${sgn(a)}${unit}` : `${sgn(a)}${unit} to ${sgn(b)}${unit}`);
  const d = r.debtEnd.low === r.debtEnd.high ? `${r.debtEnd.low.toFixed(1)}%` : `${r.debtEnd.low.toFixed(1)}-${r.debtEnd.high.toFixed(1)}%`;
  const lead = r.use === 'respend' ? `If the ${cutPp.toFixed(1)}% of GDP is spent on ${respendLabel}` : `If the ${cutPp.toFixed(1)}% of GDP is kept to cut the deficit`;
  return `${lead}, first-year growth moves ${range(r.growth.low, r.growth.high)}, output is ${range(r.level.low, r.level.high)} by ${r.level.year}, and debt in ${r.debtEnd.year} is ${d} of GDP against ${r.debtEnd.baseline.toFixed(1)}% on the IMF baseline.`;
}

/** What a reader can change on the scenario card; anything not set comes from the question. */
export interface WhatIfChoices {
  sectorCode?: string;
  share?: number;
  uses?: WhatIfUse[];
  destination?: 'investment' | 'other';
  /** The reader's own first-year output effects, held as a level (labelled "your setting"). */
  cutOwn?: { low: number; high: number };
  respendOwn?: { low: number; high: number };
}

export interface WhatIfSetup {
  sector: CofogSector;
  share: number;
  uses: WhatIfUse[];
  destination: 'investment' | 'other';
  spend?: { pct: number; year: string; source: string };
  cut?: PathRange;
  respend?: PathRange;
  /** True when the money respent follows the cut's own path (so respending nets to zero). */
  sameRespend: boolean;
  respendLabel: string;
  semiElasticity?: { value: number; source: string };
  inputs?: WhatIfInputs;
  /** Why the what-if cannot run, when it cannot. */
  cannotRun?: string;
}

const asPath = (p: MultiplierPath): PathRange => ({ low: p.low, high: p.high, source: `${p.source}, ${p.scope}; ${p.fill}` });

/**
 * Gathers a country's inputs for a what-if: the spending figure (World Bank/SIPRI for defence, else
 * Eurostat or IMF COFOG), the IMF baseline inputs, the published output paths (defence: Barro and
 * Redlick; public investment: IMF WP/15/95; anything else: the IMF bucket range held as a level) or
 * the reader's own, and the EU budget semi-elasticity where there is one.
 */
export function whatIfSetup(it: LiveWatchlistItem, q: WhatIfQuestion, ch: WhatIfChoices = {}): WhatIfSetup {
  const f = it.fiscal || {};
  const dsa = it.debtSustainability;
  const sector = (ch.sectorCode && sectorByCode(ch.sectorCode)) || q.sector;
  const share = ch.share ?? q.share;
  const uses = ch.uses ?? q.uses;
  const destination = ch.destination ?? q.destination;
  const cofog = it.govSpending?.[sector.code];
  const spend =
    sector.code === 'GF02' && f.defencePctGdp
      ? { pct: f.defencePctGdp.value, year: f.defencePctGdp.year, source: 'World Bank (SIPRI)' }
      : cofog
        ? { pct: cofog.pct, year: cofog.year, source: TABLE_LABEL[cofog.table] }
        : undefined;
  const mv = f.debtPctGdp
    ? multiplierView({ iso3: it.iso3, debtPctGdp: f.debtPctGdp, outputGap: it.outputGap, ...(it.policyRateSource === 'bis' && it.policyRatePct !== undefined ? { policyRatePct: it.policyRatePct } : {}) })
    : undefined;
  const bucket = mv ? flatPath(mv.guide.low, mv.guide.high, `IMF bucket range ${mv.guide.low}-${mv.guide.high} (${mv.guide.bucket}, first year, held as a level), ${TNM_CITATION}`) : undefined;
  const own = (v: { low: number; high: number }) => flatPath(Math.min(v.low, v.high), Math.max(v.low, v.high), `your setting, ${v.low}-${v.high} first year, held as a level`);
  const cut = ch.cutOwn ? own(ch.cutOwn) : sector.code === 'GF02' ? asPath(DEFENCE) : bucket;
  const respendPublished = destination === 'investment' ? asPath(PUBLIC_INVESTMENT) : bucket;
  const respend = ch.respendOwn ? own(ch.respendOwn) : respendPublished;
  const sameRespend = !ch.respendOwn && !ch.cutOwn && respend === cut;
  const semiElasticity = semiElasticityFor(it.iso3);
  const baseline = dsa?.inputs;
  const out: WhatIfSetup = { sector, share, uses, destination, spend, cut, respend, sameRespend, respendLabel: destination === 'investment' ? 'public investment' : 'other spending', semiElasticity };
  if (spend && dsa && baseline?.length && cut) {
    out.inputs = { spend, share, uses, debtNow: dsa.debtNow, year: dsa.year, baseline, cut, ...(respend && !sameRespend ? { respend } : {}), ...(semiElasticity ? { semiElasticity } : {}) };
  } else {
    const need = [
      !spend ? `${sector.label.toLowerCase()} spending (${sector.code === 'GF02' ? 'World Bank/SIPRI or ' : ''}Eurostat or IMF COFOG)` : '',
      !baseline?.length ? 'the IMF baseline inputs for the debt path' : '',
      !cut ? 'IMF debt for the multiplier range' : '',
    ].filter(Boolean);
    out.cannotRun = `${it.countryName}: the ${sector.label.toLowerCase()} what-if cannot run, as ${need.join(' and ')} ${need.length > 1 ? 'are' : 'is'} missing`;
  }
  return out;
}
