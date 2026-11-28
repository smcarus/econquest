/**
 * What this means for you (plan step PY5): your spending split and your loan, kept only in this
 * browser (localStorage), never sent to the server, never in data/, the audit log, Backup or For
 * people (Sam's choice, 27 November 2026). "Clear what I entered" removes all of it. Storage can be
 * blocked (a private window, cleared site data): the screen then works for this visit only.
 * Browser-safe, pure apart from localStorage.
 */
import type { LoanKind, LoanType } from './loanPayment';

export const YOUR_PRICES_KEY = 'econquest.yourPrices.v1';

export interface SavedLoan {
  balance?: number;
  ratePct?: number;
  years?: number;
  type?: LoanType;
  kind?: LoanKind;
  fixedYearsLeft?: number;
  changePts?: number;
}

export interface YourPricesSaved {
  /** Your split by country, then by group id, % of spending. */
  shares: Record<string, Record<string, number>>;
  loan: SavedLoan;
}

const EMPTY: YourPricesSaved = { shares: {}, loan: {} };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Reads what was kept, dropping anything that is not a number where a number belongs. */
export function parseSaved(raw: string | null): YourPricesSaved {
  if (!raw) return { shares: {}, loan: {} };
  try {
    const x = JSON.parse(raw) as Partial<YourPricesSaved>;
    const shares: YourPricesSaved['shares'] = {};
    for (const [iso3, m] of Object.entries(x?.shares || {})) {
      if (!/^[A-Z0-9]{3}$/.test(iso3) || !m || typeof m !== 'object') continue;
      const clean = Object.fromEntries(Object.entries(m).filter(([, v]) => num(v) !== undefined && (v as number) >= 0)) as Record<string, number>;
      if (Object.keys(clean).length) shares[iso3] = clean;
    }
    const l = (x?.loan || {}) as SavedLoan;
    const loan: SavedLoan = {};
    for (const k of ['balance', 'ratePct', 'years', 'fixedYearsLeft', 'changePts'] as const) if (num(l[k]) !== undefined) loan[k] = l[k];
    if (l.type === 'fixed' || l.type === 'variable') loan.type = l.type;
    if (l.kind === 'repayment' || l.kind === 'interest_only') loan.kind = l.kind;
    return { shares, loan };
  } catch {
    return { shares: {}, loan: {} };
  }
}

export function readSaved(): YourPricesSaved {
  try {
    return parseSaved(window.localStorage.getItem(YOUR_PRICES_KEY));
  } catch {
    return { ...EMPTY };
  }
}

/** False when the browser would not keep it (the screen still works for this visit). */
export function writeSaved(s: YourPricesSaved): boolean {
  try {
    window.localStorage.setItem(YOUR_PRICES_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved(): boolean {
  try {
    window.localStorage.removeItem(YOUR_PRICES_KEY);
    return true;
  } catch {
    return false;
  }
}
