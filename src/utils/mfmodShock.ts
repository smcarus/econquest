/**
 * What-if shocks through the World Bank's public MFMod country models (World Bank country models
 * plan, step M3). The models service (models/service.py, /shock) runs the model twice, once as the
 * file stores it and once with the shock; this file turns the two runs into the difference the shock
 * makes, year by year from the year the shock starts.
 *
 * Only differences are shown. The public model files carry old data (Pakistan's model solves from
 * 2016), so their levels are not today's economy; the difference between the two runs is what the
 * model says the shock does. Years are counted from the start of the shock ("year 1"), not as
 * calendar years, for the same reason.
 *
 * Shocks the models take (checked in each of the six files, 26 November 2026):
 * - oil: world crude oil price, % (all six models).
 * - food: world maize, rice, wheat and soybean prices together, % (all six).
 * - policy_rate: policy rate held above the model's own path, points (Pakistan, Turkiye and Iraq;
 *   Bolivia, Nepal and Croatia have no policy rate rule: exchange rate peg, peg to the Indian rupee,
 *   euro).
 * - spending: government purchases of goods and services, points of nominal GDP (all six).
 *
 * Browser-safe, pure.
 */
import type { AgentFigure } from './askCouncil';
import { measures, toAnnual, type MfmodBaselineReply, type MfmodMeasure, type MfmodSeriesKey } from './mfmodBaseline';
import type { ScenarioQuestion } from './scenarioQuestion';

export type MfmodShockKind = 'oil' | 'food' | 'policy_rate' | 'spending';

export const MFMOD_SHOCKS: Record<MfmodShockKind, { label: string; unit: '%' | 'pts' | 'pts of GDP'; max: number; hold: number }> = {
  oil: { label: 'World oil price', unit: '%', max: 300, hold: 6 },
  food: { label: 'World food prices (maize, rice, wheat, soybeans)', unit: '%', max: 300, hold: 6 },
  policy_rate: { label: 'Policy rate', unit: 'pts', max: 20, hold: 2 },
  spending: { label: 'Government purchases of goods and services', unit: 'pts of GDP', max: 10, hold: 6 },
};

/** Countries whose model has a policy rate rule the shock can switch off. */
export const MFMOD_POLICY_RATE = new Set(['PAK', 'TUR', 'IRQ']);

/** Longest the service holds a shock, in years (models/service.py HORIZON_YEARS). */
export const MFMOD_HORIZON_YEARS = 6;

export function isMfmodShockKind(x: unknown): x is MfmodShockKind {
  return typeof x === 'string' && x in MFMOD_SHOCKS;
}

/** Checks a shock request; the reason in words when it cannot be run. */
export function checkMfmodShock(iso3: string, kind: unknown, size: unknown, hold?: unknown): { ok: true; kind: MfmodShockKind; size: number; hold: number } | { ok: false; reason: string } {
  if (!isMfmodShockKind(kind)) return { ok: false, reason: `kind must be one of ${Object.keys(MFMOD_SHOCKS).join(', ')}` };
  const spec = MFMOD_SHOCKS[kind];
  const n = Number(size);
  if (size === '' || size === null || size === undefined || !Number.isFinite(n) || n === 0 || Math.abs(n) > spec.max) return { ok: false, reason: `size must be a non-zero number up to ${spec.max} ${spec.unit}` };
  const h = hold === undefined || hold === '' ? spec.hold : Number(hold);
  if (!Number.isInteger(h) || h < 1 || h > MFMOD_HORIZON_YEARS) return { ok: false, reason: `hold must be a whole number of years from 1 to ${MFMOD_HORIZON_YEARS}` };
  if (kind === 'policy_rate' && !MFMOD_POLICY_RATE.has(iso3.toUpperCase())) return { ok: false, reason: 'this country\'s model has no policy rate rule of its own, as the currency is pegged or in a currency union' };
  return { ok: true, kind, size: n, hold: h };
}

type Series = NonNullable<MfmodBaselineReply['series']>;

export interface MfmodShockReply {
  on?: boolean;
  ready?: boolean;
  note?: string;
  source?: string;
  iso3?: string;
  kind?: MfmodShockKind;
  size?: number;
  unit?: string;
  hold?: number;
  periods?: string[];
  shockFrom?: string;
  shockTo?: string;
  base?: Series;
  shocked?: Series;
  missing?: string[];
}

export type MfmodDiffMeasure = 'gdp_level' | MfmodMeasure | 'currency';

/** What each difference is, in words. */
export const DIFF_FORMULA: Record<MfmodDiffMeasure, string> = {
  gdp_level: 'real GDP in the shocked run / real GDP in the baseline run - 1, in %',
  growth: 'real GDP growth (% on the year before) in the shocked run minus the same in the baseline run',
  inflation: 'consumer price inflation in the shocked run minus the baseline run (private consumption deflator where the model does not fill the price index)',
  balance: 'government balance / nominal GDP x 100, shocked run minus baseline run',
  debt: 'government gross debt / nominal GDP x 100, shocked run minus baseline run',
  current_account: 'current account in US$ x LCU per US$ / nominal GDP x 100, shocked run minus baseline run',
  policy_rate: 'policy interest rate, shocked run minus baseline run',
  currency: 'local currency units per US dollar, shocked run / baseline run - 1, in % (+ = weaker currency)',
};

export interface MfmodDiffTable {
  /** 1 = the first year of the shock. */
  years: number[];
  holdYears: number;
  quarterly: boolean;
  inflationFrom: 'cpi' | 'consumer_deflator' | null;
  rows: Array<{ measure: MfmodDiffMeasure; values: Array<number | null> }>;
  missing: MfmodDiffMeasure[];
}

const yearOf = (p: string | undefined): number | null => {
  const m = /^(\d{4})/.exec(p ?? '');
  return m ? Number(m[1]) : null;
};
const round2 = (x: number | null): number | null => (x === null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const pctDiff = (a: number | null | undefined, b: number | null | undefined): number | null => (a === null || a === undefined || b === null || b === undefined || a === 0 ? null : (b / a - 1) * 100);

/** The shocked run minus the baseline run, for each year from the shock's first year. */
export function shockDiff(reply: MfmodShockReply): MfmodDiffTable | null {
  if (!reply.periods?.length || !reply.base || !reply.shocked) return null;
  const from = yearOf(reply.shockFrom);
  const a = toAnnual({ periods: reply.periods, projectedFrom: reply.shockFrom, series: reply.base });
  const b = toAnnual({ periods: reply.periods, projectedFrom: reply.shockFrom, series: reply.shocked });
  const ta = measures(a, { round: false });
  // Same inflation series in both runs: the baseline's choice wins.
  const inflationFrom = ta.inflationFrom;
  const tb = measures(b, { round: false, inflationFrom });
  const idx = a.years.map((y, i) => ({ y, i })).filter(({ y }) => from !== null && y >= from);
  const years = idx.map(({ y }) => y - (from as number) + 1);
  const rows: MfmodDiffTable['rows'] = [];
  const missing: MfmodDiffMeasure[] = [];
  const level = (k: MfmodSeriesKey) => idx.map(({ i }) => round2(pctDiff(a.values[k]?.[i], b.values[k]?.[i])));
  const push = (measure: MfmodDiffMeasure, values: Array<number | null>) => (values.every((v) => v === null) ? missing.push(measure) : rows.push({ measure, values }));
  push('gdp_level', level('real_gdp'));
  for (const m of ['growth', 'inflation', 'balance', 'debt', 'current_account', 'policy_rate'] as MfmodMeasure[]) {
    const ra = ta.rows.find((r) => r.measure === m);
    const rb = tb.rows.find((r) => r.measure === m);
    if (!ra || !rb) {
      missing.push(m);
      continue;
    }
    push(
      m,
      idx.map(({ i }) => (ra.values[i] === null || rb.values[i] === null ? null : round2((rb.values[i] as number) - (ra.values[i] as number)))),
    );
  }
  push('currency', level('usd_rate'));
  return { years, holdYears: reply.hold ?? MFMOD_HORIZON_YEARS, quarterly: a.quarterly, inflationFrom, rows, missing };
}

/** A Scenario Agent shock the World Bank model can run, or why it cannot. */
export type MfmodPlan = { kind: MfmodShockKind; size: number; hold: number } | { kind: MfmodShockKind; reason: string };

/** The question's shocks that the country's World Bank model can take. Shocks of other kinds are left to the app's other channels. */
export function mfmodPlan(sq: Pick<ScenarioQuestion, 'shocks'>, iso3: string): MfmodPlan[] {
  const out: MfmodPlan[] = [];
  for (const s of sq.shocks) {
    if (s.kind !== 'oil' && s.kind !== 'food' && s.kind !== 'policy_rate') continue;
    if (s.change === null) {
      if (s.target) out.push({ kind: s.kind, reason: s.kind === 'oil' ? 'the model needs the change in %, not a price level, as its stored oil price is from an old baseline' : 'the model needs the change in points, not a level' });
      continue;
    }
    const c = checkMfmodShock(iso3, s.kind, s.change);
    out.push(c.ok ? { kind: c.kind, size: c.size, hold: c.hold } : { kind: s.kind, reason: c.reason });
  }
  return out;
}

/** One model run for the Scenario Agent, as the server hands it in. */
export interface MfmodScenarioRun {
  kind: MfmodShockKind;
  size: number;
  hold: number;
  table?: MfmodDiffTable;
  reason?: string;
}

export interface MfmodScenarioData {
  /** False when the World Bank models are not turned on. */
  on: boolean;
  runs: MfmodScenarioRun[];
  /** Shocks the model could not take, with the reason. */
  notRun: Array<{ kind: MfmodShockKind; reason: string }>;
}

export const MFMOD_SCENARIO_NOTE = "the app's run of the World Bank's public MFMod model (CC0, run with ModelFlow), shocked run minus the model's own baseline; the public files carry old data, so read the difference, not a level; not a World Bank forecast";

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
const UNIT: Record<MfmodDiffMeasure, string> = { gdp_level: '%', growth: ' pts', inflation: ' pts', balance: ' pts of GDP', debt: ' pts of GDP', current_account: ' pts of GDP', policy_rate: ' pts', currency: '%' };
const WORDS: Record<MfmodDiffMeasure, string> = {
  gdp_level: 'real GDP',
  growth: 'real GDP growth',
  inflation: 'inflation',
  balance: 'budget balance',
  debt: 'government debt',
  current_account: 'current account',
  policy_rate: 'policy rate',
  currency: 'currency per US dollar (+ = weaker)',
};

const sizeWords = (r: Pick<MfmodScenarioRun, 'kind' | 'size'>) => {
  const u = MFMOD_SHOCKS[r.kind].unit;
  const n = `${r.size > 0 ? '+' : ''}${r.size}`;
  if (u === '%') return `${n}%`;
  const pts = Math.abs(r.size) === 1 ? 'point' : 'points';
  return u === 'pts' ? `${n} ${pts}` : `${n} ${pts} of GDP`;
};
const shockWords = (r: MfmodScenarioRun) => `${MFMOD_SHOCKS[r.kind].label.toLowerCase()} ${sizeWords(r)}, held ${r.hold} year${r.hold === 1 ? '' : 's'}`;

/** The World Bank model's runs as Scenario Agent figures, sentences and Missing lines. */
export function mfmodFigures(data: MfmodScenarioData | undefined, name: string, figures: AgentFigure[], parts: string[], missing: string[]): number {
  if (!data) return 0;
  let weight = 0;
  for (const n of data.notRun) missing.push(`${name}: World Bank country model, ${MFMOD_SHOCKS[n.kind].label.toLowerCase()} (${n.reason})`);
  if (!data.on) {
    if (data.runs.length || data.notRun.length) missing.push(`${name}: World Bank country model (turned off; Install guide, "Add the World Bank country models")`);
    return 0;
  }
  for (const r of data.runs) {
    if (!r.table) {
      missing.push(`${name}: World Bank country model, ${MFMOD_SHOCKS[r.kind].label.toLowerCase()} (${r.reason || 'no answer'})`);
      continue;
    }
    const t = r.table;
    const at = (m: MfmodDiffMeasure, y: number) => t.rows.find((x) => x.measure === m)?.values[t.years.indexOf(y)] ?? null;
    for (const m of ['gdp_level', 'inflation', 'balance', 'debt', 'current_account', 'policy_rate', 'currency'] as MfmodDiffMeasure[]) {
      const y1 = at(m, 1);
      const y3 = at(m, 3);
      if (y1 === null && y3 === null) continue;
      if (m === 'policy_rate' && r.kind !== 'policy_rate' && y1 === 0 && y3 === 0) continue;
      const val = [y1 !== null ? `year 1 ${sgn(y1)}${UNIT[m]}` : null, y3 !== null ? `year 3 ${sgn(y3)}${UNIT[m]}` : null].filter(Boolean).join(', ');
      figures.push({ label: `World Bank model: ${WORDS[m]}`, value: val, source: `${shockWords(r)}; ${DIFF_FORMULA[m]}; ${MFMOD_SCENARIO_NOTE}`, tag: 'model' });
    }
    const g1 = at('gdp_level', 1);
    const g3 = at('gdp_level', 3);
    const b1 = at('balance', 1);
    const bits: string[] = [];
    if (g1 !== null) bits.push(`real GDP ${Math.abs(g1).toFixed(2)}% ${g1 >= 0 ? 'above' : 'below'} its own baseline in the first year${g3 !== null ? ` and ${Math.abs(g3).toFixed(2)}% ${g3 >= 0 ? 'above' : 'below'} by the third` : ''}`);
    if (b1 !== null && Math.abs(b1) >= 0.01) bits.push(`the budget balance ${b1 >= 0 ? 'better' : 'worse'} by ${Math.abs(b1).toFixed(2)} points of GDP in the first year`);
    if (bits.length) parts.push(`In ${name}'s World Bank country model, ${shockWords(r)} leaves ${bits.join(', and ')}.`);
    if (g1 !== null) weight = Math.max(weight, Math.min(1, Math.abs(g1) / 2));
  }
  return weight;
}
