/**
 * Who pays for a policy (G30): how a tax or spending change is shared across the five income groups
 * (fifths of people, poorest to richest), set beside the share of income each group holds.
 *
 * The user types the change (a tax rise or spending cut that households pay, or a tax cut or
 * spending increase they gain from), its size in % of GDP, the share of it each fifth carries, and
 * where those shares come from (a published incidence study, for example a CEQ Institute
 * assessment). Nothing is built in: the panel starts empty.
 *
 * For each fifth q, with s_q its share of the change (%) and y_q its share of income (%):
 *   amount (% of GDP)  = size × s_q ÷ 100
 *   share ratio        = s_q ÷ y_q   (1 = in line with its share of income)
 * A payment whose ratio is higher for the poorest fifth than for the richest falls more heavily on
 * poorer groups against their income (regressive); lower, more heavily on richer groups
 * (progressive). For a gain the reading flips. Within 0.1 of each other: about proportional.
 *
 * The income shares (World Bank SI.DST.FRST.20 to SI.DST.05TH.20) come from household surveys, and
 * some measure consumption rather than income. Context beside them: the Gini index, tax revenue and
 * its split (G16) and poverty rates (G17). Description only, no forecast. Browser-safe, pure.
 */

export type Direction = 'pay' | 'gain';
export const QUINTILES = 5;
export const NEAR = 0.1;

export interface YearValue {
  year: number;
  value: number;
}

export interface ContextRow {
  id: 'gini' | 'tax_revenue' | 'tax_income' | 'tax_goods' | 'tax_trade' | 'poverty_lowest' | 'poverty_lower_middle' | 'poverty_upper_middle';
  value: number;
  year: number;
}

export interface IncomeShares {
  year: number;
  /** Poorest fifth first, %. */
  q: number[];
}

export interface IncidenceContext {
  rows: ContextRow[];
  incomeShares: IncomeShares | null;
  missing: string[];
  sources: string[];
}

export interface IncidenceInputs {
  direction: Direction | null;
  sizePctGdp: number | null;
  /** Share of the change each fifth carries, %, poorest first. */
  shares: Array<number | null>;
  source: string;
}

export interface IncidenceGroup {
  q: number;
  sharePct: number;
  amountPctGdp: number;
  incomeSharePct?: number;
  ratio?: number;
}

export interface IncidenceResult {
  ok: true;
  direction: Direction;
  sizePctGdp: number;
  source: string;
  groups: IncidenceGroup[];
  /** regressive / progressive / proportional; null without income shares. */
  reading: 'regressive' | 'progressive' | 'proportional' | null;
  sharesSum: number;
}

export interface IncidenceProblem {
  ok: false;
  problems: Array<'direction' | 'size' | 'shares' | 'sum' | 'source'>;
  sharesSum: number;
}

export type IncidenceOutcome = IncidenceResult | IncidenceProblem;

export const INCIDENCE_METHOD =
  'Amount for each fifth = size of the change (% of GDP) × the share it carries. Share ratio = the share of the change a fifth carries ÷ the share of income it holds (World Bank household surveys, same survey year for all five). A payment with a higher ratio for the poorest fifth than for the richest falls more heavily on poorer groups against their income (regressive); lower, on richer groups (progressive); for a gain the reading flips; within 0.1, about proportional. The shares of the change are yours, with the source you name; nothing is built in. Description, not a forecast.';
export const WB_PIP = 'World Bank WDI (Poverty and Inequality Platform, household surveys)';
export const WB_TAX = 'World Bank WDI (IMF Government Finance Statistics)';

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;
const lastOf = (s?: YearValue[]) => (s?.length ? [...s].filter((p) => Number.isFinite(p.value)).sort((a, b) => a.year - b.year).pop() : undefined);

/** The context rows and the latest year with all five income shares, from saved yearly series. */
export function incidenceContext(series: Partial<Record<ContextRow['id'] | 'income_share_q1' | 'income_share_q2' | 'income_share_q3' | 'income_share_q4' | 'income_share_q5', YearValue[]>>): IncidenceContext {
  const ids: ContextRow['id'][] = ['gini', 'tax_revenue', 'tax_income', 'tax_goods', 'tax_trade', 'poverty_lowest', 'poverty_lower_middle', 'poverty_upper_middle'];
  const rows: ContextRow[] = [];
  for (const id of ids) {
    const p = lastOf(series[id]);
    if (p) rows.push({ id, value: r2(p.value), year: p.year });
  }
  const qs = (['income_share_q1', 'income_share_q2', 'income_share_q3', 'income_share_q4', 'income_share_q5'] as const).map((k) => series[k] || []);
  const years = [...new Set(qs[0].map((p) => p.year))].sort((a, b) => b - a);
  let incomeShares: IncomeShares | null = null;
  for (const y of years) {
    const vals = qs.map((s) => s.find((p) => p.year === y)?.value);
    if (vals.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
      const sum = (vals as number[]).reduce((a, v) => a + v, 0);
      if (sum >= 95 && sum <= 105) {
        incomeShares = { year: y, q: (vals as number[]).map(r2) };
        break;
      }
    }
  }
  const missing: string[] = [];
  if (!incomeShares) missing.push('Income shares by fifth of people: the World Bank has no household survey with all five shares for this country, or they are not saved yet, so the share ratios cannot be worked out');
  if (!rows.some((r) => r.id.startsWith('tax_'))) missing.push('Tax revenue and its split: the World Bank publishes none for this country, or they are not saved yet');
  if (!rows.some((r) => r.id.startsWith('poverty_'))) missing.push('Poverty rates: the World Bank has no household survey for this country, or they are not saved yet');
  const sources = [...(incomeShares || rows.some((r) => r.id === 'gini' || r.id.startsWith('poverty_')) ? [WB_PIP] : []), ...(rows.some((r) => r.id.startsWith('tax_')) ? [WB_TAX] : [])];
  return { rows, incomeShares, missing, sources };
}

export function incidence(x: IncidenceInputs, income: IncomeShares | null): IncidenceOutcome {
  const problems: IncidenceProblem['problems'] = [];
  const typed = x.shares.slice(0, QUINTILES);
  const sharesOk = typed.length === QUINTILES && typed.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);
  const sum = r2(typed.reduce<number>((a, v) => a + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0));
  if (!x.direction) problems.push('direction');
  if (!(typeof x.sizePctGdp === 'number' && Number.isFinite(x.sizePctGdp) && x.sizePctGdp > 0 && x.sizePctGdp <= 50)) problems.push('size');
  if (!sharesOk) problems.push('shares');
  else if (Math.abs(sum - 100) > 0.5) problems.push('sum');
  if (x.source.trim().length < 3) problems.push('source');
  if (problems.length) return { ok: false, problems, sharesSum: sum };
  const size = x.sizePctGdp!;
  const groups: IncidenceGroup[] = (typed as number[]).map((s, i) => {
    const y = income?.q[i];
    return { q: i + 1, sharePct: s, amountPctGdp: r2((size * s) / 100), ...(y !== undefined && y > 0 ? { incomeSharePct: y, ratio: r2(s / y) } : {}) };
  });
  let reading: IncidenceResult['reading'] = null;
  const lo = groups[0].ratio;
  const hi = groups[QUINTILES - 1].ratio;
  if (lo !== undefined && hi !== undefined) {
    if (Math.abs(lo - hi) <= NEAR) reading = 'proportional';
    else reading = (lo > hi) === (x.direction === 'pay') ? 'regressive' : 'progressive';
  }
  return { ok: true, direction: x.direction!, sizePctGdp: size, source: x.source.trim(), groups, reading, sharesSum: sum };
}

export function incidenceSentence(r: IncidenceResult, name: string): string {
  const g1 = r.groups[0];
  const g5 = r.groups[QUINTILES - 1];
  const verb = r.direction === 'pay' ? 'pays' : 'gets';
  const what = r.direction === 'pay' ? 'a tax rise or spending cut' : 'a tax cut or spending increase';
  let s = `${name}: for ${what} of ${r.sizePctGdp}% of GDP, the poorest fifth ${verb} ${g1.sharePct}% of it (${g1.amountPctGdp}% of GDP) and the richest fifth ${g5.sharePct}% (${g5.amountPctGdp}% of GDP), on shares from ${r.source}.`;
  if (g1.incomeSharePct !== undefined && g5.incomeSharePct !== undefined) {
    const pay = r.direction === 'pay';
    const how =
      r.reading === 'regressive'
        ? pay
          ? 'regressive: heavier on poorer groups against their income'
          : 'regressive: more for richer groups against their income'
        : r.reading === 'progressive'
          ? pay
            ? 'progressive: heavier on richer groups against their income'
            : 'progressive: more for poorer groups against their income'
          : 'about proportional to income';
    s += ` They hold ${g1.incomeSharePct}% and ${g5.incomeSharePct}% of income, so the change is ${how}.`;
  }
  return s;
}
