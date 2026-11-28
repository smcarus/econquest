/**
 * What this means for you (plan step PY3): what a change in interest rates does to a loan payment.
 *
 * Repayment loans use the standard annuity: payment = balance × r ÷ (1 − (1 + r)^−n), with r the
 * monthly rate (yearly rate ÷ 12) and n the months left; at a rate of zero it is balance ÷ n.
 * Interest-only loans pay balance × r. A variable loan's payment changes with the rate at once; a
 * fixed loan's payment does not change until the fixed period ends, and then it is worked out on the
 * balance still owed at that point and the months left.
 *
 * For a variable loan the app also shows the payment if the lender passed on the central bank's last
 * move in full, read from the policy rate feeds with its date (BIS, else the IMF monthly series), or
 * Missing. Lenders do not always pass on the full move; that is said beside the figure.
 * Browser-safe, pure.
 */

export type LoanType = 'variable' | 'fixed';
export type LoanKind = 'repayment' | 'interest_only';

export interface LoanInput {
  balance: number;
  /** Yearly interest rate, %. */
  ratePct: number;
  /** Years left to pay. */
  years: number;
  type: LoanType;
  kind: LoanKind;
  /** Fixed loans: years left at the fixed rate. */
  fixedYearsLeft?: number;
}

export interface CbMove {
  /** YYYY-MM or YYYY-MM-DD. */
  period: string;
  fromPct: number;
  toPct: number;
  /** points */
  changePts: number;
  source: string;
}

export interface LoanResult {
  ok: true;
  /** Monthly payment now. */
  payment: number;
  /** Monthly payment with your own rate change. */
  withChange: number;
  changePts: number;
  /** withChange − payment. */
  diff: number;
  /** When the new payment starts: now (variable) or after the fixed period (fixed). */
  startsAfterMonths: number;
  /** Variable loans only: payment if the central bank's last move were passed on in full. */
  cb?: { move: CbMove; payment: number; diff: number };
  /** Why the central bank line is not there. */
  cbMissing?: string;
}

export type LoanOutcome = LoanResult | { ok: false; reason: string };

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;

/** Monthly payment for a balance, yearly rate % and months left. */
export function monthlyPayment(balance: number, ratePct: number, months: number, kind: LoanKind = 'repayment'): number {
  const r = ratePct / 100 / 12;
  if (kind === 'interest_only') return balance * r;
  if (months <= 0) return balance;
  if (Math.abs(r) < 1e-12) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

/** Balance still owed after paying `paid` months of a repayment loan. */
export function balanceAfter(balance: number, ratePct: number, months: number, paid: number, kind: LoanKind = 'repayment'): number {
  if (kind === 'interest_only') return balance;
  const r = ratePct / 100 / 12;
  const p = monthlyPayment(balance, ratePct, months, kind);
  if (Math.abs(r) < 1e-12) return Math.max(0, balance - p * paid);
  return Math.max(0, balance * Math.pow(1 + r, paid) - (p * (Math.pow(1 + r, paid) - 1)) / r);
}

export function checkLoan(x: Partial<LoanInput>): string | null {
  if (!(Number.isFinite(x.balance) && (x.balance as number) > 0)) return 'Enter the balance still owed.';
  if (!(Number.isFinite(x.ratePct) && (x.ratePct as number) >= 0 && (x.ratePct as number) < 100)) return 'Enter the yearly interest rate (0 to 100%).';
  if (!(Number.isFinite(x.years) && (x.years as number) > 0 && (x.years as number) <= 50)) return 'Enter the years left to pay (up to 50).';
  if (x.type === 'fixed' && !(Number.isFinite(x.fixedYearsLeft) && (x.fixedYearsLeft as number) >= 0 && (x.fixedYearsLeft as number) <= (x.years as number)))
    return 'Enter the years left at the fixed rate (no more than the years left to pay).';
  return null;
}

/** The payment now, with your own rate change, and (variable loans) after the central bank's last move. */
export function loanEffect(x: LoanInput, changePts: number, cb: CbMove | { missing: string } | null): LoanOutcome {
  const bad = checkLoan(x);
  if (bad) return { ok: false, reason: bad };
  if (!Number.isFinite(changePts) || x.ratePct + changePts < 0) return { ok: false, reason: 'The rate after your change would be below zero.' };
  const n = Math.round(x.years * 12);
  const payment = monthlyPayment(x.balance, x.ratePct, n, x.kind);
  const at = (newRate: number, afterMonths: number) => {
    if (afterMonths <= 0) return monthlyPayment(x.balance, newRate, n, x.kind);
    if (afterMonths >= n) return payment;
    return monthlyPayment(balanceAfter(x.balance, x.ratePct, n, afterMonths, x.kind), newRate, n - afterMonths, x.kind);
  };
  const startsAfterMonths = x.type === 'fixed' ? Math.round((x.fixedYearsLeft ?? 0) * 12) : 0;
  const withChange = at(x.ratePct + changePts, startsAfterMonths);
  const out: LoanResult = { ok: true, payment: r2(payment), withChange: r2(withChange), changePts, diff: r2(withChange - payment), startsAfterMonths };
  if (x.type === 'variable') {
    if (cb && 'changePts' in cb) {
      const p = at(Math.max(0, x.ratePct + cb.changePts), 0);
      out.cb = { move: cb, payment: r2(p), diff: r2(p - payment) };
    } else out.cbMissing = cb && 'missing' in cb ? cb.missing : 'No policy rate move is saved for this country.';
  }
  return out;
}

/** The central bank's last move from the BIS reading, else from the IMF monthly series; or a reason. */
export function cbLastMove(
  bis: { lastMove?: { period: string; fromPct: number; toPct: number }; bank?: string; rate?: string; historyFrom?: string } | null | undefined,
  imf: { points: Array<{ period: string; value: number }>; long?: string } | null | undefined
): CbMove | { missing: string } {
  if (bis?.lastMove) {
    const m = bis.lastMove;
    const who = [bis.bank, bis.rate].filter(Boolean).join(' ');
    return { period: m.period, fromPct: m.fromPct, toPct: m.toPct, changePts: r2(m.toPct - m.fromPct), source: `BIS central bank policy rates${who ? `, ${who}` : ''}` };
  }
  if (bis && !bis.lastMove) return { missing: `The central bank has not moved its rate since ${bis.historyFrom ?? 'the start of the history the app reads'} (BIS).` };
  const pts = (imf?.points || []).filter((p) => Number.isFinite(p.value)).sort((a, b) => a.period.localeCompare(b.period));
  for (let i = pts.length - 1; i > 0; i--) {
    if (Math.abs(pts[i].value - pts[i - 1].value) > 1e-9) {
      return { period: pts[i].period, fromPct: pts[i - 1].value, toPct: pts[i].value, changePts: r2(pts[i].value - pts[i - 1].value), source: imf?.long || 'IMF monthly policy rate' };
    }
  }
  if (pts.length) return { missing: `The central bank has not moved its rate since ${pts[0].period} (IMF monthly series).` };
  return { missing: 'Neither the BIS nor the IMF policy rate series the app reads has this country.' };
}
