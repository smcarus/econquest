/**
 * Debt restructuring calculator (G29): an old bond against the new bond offered for it, on terms
 * the user types, valued at up to three discount rates the user picks. Builds on the cash flows and
 * present values in src/utils/restructuring.ts.
 *
 *   NPV haircut (Sturzenegger and Zettelmeyer 2008) = 1 - PV(new) / PV(old), both at the same rate
 *   Market haircut (also in Cruces and Trebesch 2013) = 1 - PV(new) / face of the old bond
 *   Face cut                                          = 1 - face of the new bond / face of the old
 *
 * Both bonds pay once a year: the coupon on the face still outstanding, and principal in equal
 * parts after the grace years (grace one year short of maturity is a bullet bond). Payments the old
 * bond missed before the exchange (past-due interest) are not counted. Every field starts blank and
 * nothing is filled in from data. An illustration of the arithmetic, not a forecast of any deal.
 * Browser-safe, pure.
 */
import { cashflows, presentValue, type BondTerms } from './restructuring';

export type RcField = 'face' | 'couponPct' | 'years' | 'graceYears';
export type RcSide = 'oldBond' | 'newBond';
export const RC_MAX_RATES = 3;
export const RC_MAX_YEARS = 100;

export interface RcInputs {
  oldBond: Partial<Record<RcField, number | null>>;
  newBond: Partial<Record<RcField, number | null>>;
  /** Discount rates, % a year; blanks are skipped, at most three are used. */
  ratesPct: Array<number | null | undefined>;
}

export interface RcRow {
  ratePct: number;
  pvOld: number;
  pvNew: number;
  npvHaircutPct: number;
  marketHaircutPct: number;
}

export interface RcResult {
  ok: true;
  oldBond: BondTerms;
  newBond: BondTerms;
  faceHaircutPct: number;
  rows: RcRow[];
  /** Year by year, per the face values typed: what each bond pays. */
  cashflows: Array<{ year: number; old: number; new: number }>;
  totalOld: number;
  totalNew: number;
  method: string;
}

export interface RcProblem {
  ok: false;
  /** Fields left blank, as side.field. */
  blank: string[];
  /** Fields out of range, as side.field. */
  invalid: string[];
  /** true when no discount rate is typed. */
  noRate: boolean;
}

export type RcOutcome = RcResult | RcProblem;

export const RC_METHOD =
  'Both bonds pay once a year: the coupon on the face still outstanding, principal in equal parts after the grace years (grace one year short of maturity makes a bullet bond). Present value = each payment ÷ (1 + rate)^year, summed. NPV haircut = 1 − PV(new) ÷ PV(old), both at the same rate (Sturzenegger and Zettelmeyer 2008); market haircut = 1 − PV(new) ÷ face of the old bond (also reported by Cruces and Trebesch 2013); face cut = 1 − new face ÷ old face. Past-due interest is not counted. Every term and rate is yours; nothing comes from data. An illustration of the arithmetic, not a forecast of any deal.';
export const RC_REFERENCES = [
  'Sturzenegger, Federico and Jeromin Zettelmeyer (2008), "Haircuts: Estimating Investor Losses in Sovereign Debt Restructurings, 1998-2005", Journal of International Money and Finance, 27(5), 780-805.',
  'Cruces, Juan J. and Christoph Trebesch (2013), "Sovereign Defaults: The Price of Haircuts", American Economic Journal: Macroeconomics, 5(3), 85-117.',
];

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;
const FIELDS: RcField[] = ['face', 'couponPct', 'years', 'graceYears'];

function check(side: RcSide, b: RcInputs[RcSide], blank: string[], invalid: string[]): BondTerms | null {
  const v = (f: RcField) => b[f];
  for (const f of FIELDS) {
    const x = v(f);
    if (x === null || x === undefined || !Number.isFinite(x)) blank.push(`${side}.${f}`);
  }
  const face = v('face');
  const coupon = v('couponPct');
  const years = v('years');
  const grace = v('graceYears');
  const bad = (f: RcField) => invalid.push(`${side}.${f}`);
  if (typeof face === 'number' && Number.isFinite(face) && !(face > 0)) bad('face');
  if (typeof coupon === 'number' && Number.isFinite(coupon) && !(coupon >= 0 && coupon <= 100)) bad('couponPct');
  const yearsOk = typeof years === 'number' && Number.isInteger(years) && years >= 1 && years <= RC_MAX_YEARS;
  if (typeof years === 'number' && Number.isFinite(years) && !yearsOk) bad('years');
  if (typeof grace === 'number' && Number.isFinite(grace) && !(Number.isInteger(grace) && grace >= 0 && (!yearsOk || grace < years!))) bad('graceYears');
  const mine = (s: string) => s.startsWith(`${side}.`);
  if (blank.some(mine) || invalid.some(mine)) return null;
  return { face: face!, couponPct: coupon!, years: years!, graceYears: grace! };
}

export function restructuringCalc(x: RcInputs): RcOutcome {
  const blank: string[] = [];
  const invalid: string[] = [];
  const oldBond = check('oldBond', x.oldBond, blank, invalid);
  const newBond = check('newBond', x.newBond, blank, invalid);
  const typed = x.ratesPct.filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  typed.forEach((r, i) => {
    if (!(r > -50 && r <= 100)) invalid.push(`rate.${i}`);
  });
  const rates = [...new Set(typed.filter((r) => r > -50 && r <= 100))].slice(0, RC_MAX_RATES);
  if (!oldBond || !newBond || !rates.length || invalid.length) return { ok: false, blank, invalid, noRate: !typed.length };
  const fo = cashflows(oldBond);
  const fn = cashflows(newBond);
  const rows = rates.map((ratePct) => {
    const pvOld = presentValue(fo, ratePct);
    const pvNew = presentValue(fn, ratePct);
    return { ratePct, pvOld: r2(pvOld), pvNew: r2(pvNew), npvHaircutPct: r2((1 - pvNew / pvOld) * 100), marketHaircutPct: r2((1 - pvNew / oldBond.face) * 100) };
  });
  const n = Math.max(fo.length, fn.length);
  const flows = Array.from({ length: n }, (_, i) => ({ year: i + 1, old: r2(fo[i] ?? 0), new: r2(fn[i] ?? 0) }));
  return {
    ok: true,
    oldBond,
    newBond,
    faceHaircutPct: r2((1 - newBond.face / oldBond.face) * 100),
    rows,
    cashflows: flows,
    totalOld: r2(fo.reduce((a, c) => a + c, 0)),
    totalNew: r2(fn.reduce((a, c) => a + c, 0)),
    method: RC_METHOD,
  };
}

/** One line for the explain hand-off and the CSV. */
export function rcSentence(r: RcResult): string {
  const rows = r.rows.map((x) => `at ${x.ratePct}% the old bond is worth ${x.pvOld} and the new ${x.pvNew}: NPV haircut ${x.npvHaircutPct}%, market haircut ${x.marketHaircutPct}%`);
  return `Old bond: face ${r.oldBond.face}, coupon ${r.oldBond.couponPct}%, ${r.oldBond.years} years, ${r.oldBond.graceYears} grace. New bond: face ${r.newBond.face}, coupon ${r.newBond.couponPct}%, ${r.newBond.years} years, ${r.newBond.graceYears} grace. Face cut ${r.faceHaircutPct}%; ${rows.join('; ')}.`;
}

/** The CSV the panel offers (UTF-8 with byte order mark): the haircuts, then the payments. */
export function rcCsv(r: RcResult): string {
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines: Array<Array<string | number>> = [
    ['bond', 'face', 'coupon_pct', 'years', 'grace_years'],
    ['old', r.oldBond.face, r.oldBond.couponPct, r.oldBond.years, r.oldBond.graceYears],
    ['new', r.newBond.face, r.newBond.couponPct, r.newBond.years, r.newBond.graceYears],
    [],
    ['discount_rate_pct', 'pv_old', 'pv_new', 'npv_haircut_pct', 'market_haircut_pct', 'face_cut_pct'],
    ...r.rows.map((x) => [x.ratePct, x.pvOld, x.pvNew, x.npvHaircutPct, x.marketHaircutPct, r.faceHaircutPct]),
    [],
    ['year', 'old_bond_pays', 'new_bond_pays'],
    ...r.cashflows.map((c) => [c.year, c.old, c.new]),
    [],
    ['method', r.method],
  ];
  return '﻿' + lines.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
