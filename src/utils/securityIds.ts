/**
 * Security and issuer identifiers on holdings, so an outside portfolio system can name a position
 * the way it already does and get the same name back.
 *
 * - ISIN (ISO 6166): 2-letter country prefix, 9 letters or digits, 1 check digit (Luhn on the
 *   letters turned into numbers, A = 10 ... Z = 35).
 * - LEI (ISO 17442): 18 letters or digits, then 2 check digits (ISO 7064 MOD 97-10, as IBANs).
 * - CIK: the SEC's company number, 1 to 10 digits; stored zero-padded to 10, as EDGAR writes it.
 * - Ticker: letters, digits and . - / : with an optional exchange suffix ("PETR4 BZ", "AAPL.O");
 *   stored in capitals, not checked against any exchange list.
 * - Entity ID: whatever the caller uses for this position or issuer. Stored and given back exactly
 *   as sent (no trimming, no change of case), up to 128 characters.
 *
 * A position needs no identifier; the ones given must be well formed. Pure functions.
 */

export interface SecurityIds {
  isin?: string;
  lei?: string;
  cik?: string;
  ticker?: string;
  entityId?: string;
}

export const ID_FIELDS = ['isin', 'lei', 'cik', 'ticker', 'entityId'] as const;
export type IdField = (typeof ID_FIELDS)[number];

export const ENTITY_ID_MAX = 128;

/** Value of a character in the ISIN and LEI check sums: 0-9 as is, A = 10 ... Z = 35. */
const charValue = (c: string): number => (c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 55);

export function isinCheckDigit(first11: string): number {
  const digits = [...first11.toUpperCase()].map((c) => String(charValue(c))).join('');
  let sum = 0;
  // Luhn: double every second digit from the right of the payload (the check digit is not in it).
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isIsin(v: string): boolean {
  const s = v.toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s)) return false;
  return isinCheckDigit(s.slice(0, 11)) === Number(s[11]);
}

/** MOD 97-10 over the code with letters turned into numbers; a valid LEI leaves 1. */
function mod97(s: string): number {
  let rem = 0;
  for (const c of s) {
    const v = String(charValue(c));
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem;
}

export function isLei(v: string): boolean {
  const s = v.toUpperCase();
  if (!/^[A-Z0-9]{18}[0-9]{2}$/.test(s)) return false;
  return mod97(s) === 1;
}

export function isCik(v: string): boolean {
  return /^[0-9]{1,10}$/.test(v) && Number(v) > 0;
}

export function isTicker(v: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9.\-/:]{0,19}( [A-Za-z0-9]{1,6})?$/.test(v);
}

export interface IdsParse {
  ids: SecurityIds;
  errors: string[];
}

/**
 * Check and tidy the identifiers sent for one position. Unknown fields are ignored here; empty
 * strings count as not given. ISIN, LEI and ticker are put in capitals, CIK zero-padded; the
 * entity ID is kept exactly as sent.
 */
export function parseSecurityIds(input: Partial<Record<IdField, unknown>>, where = ''): IdsParse {
  const ids: SecurityIds = {};
  const errors: string[] = [];
  const at = where ? `${where}: ` : '';
  const text = (k: IdField): string | null => {
    const v = input[k];
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string' && typeof v !== 'number') {
      errors.push(`${at}${k} must be text.`);
      return null;
    }
    return String(v);
  };
  const isin = text('isin');
  if (isin !== null) {
    const s = isin.trim().toUpperCase();
    if (isIsin(s)) ids.isin = s;
    else errors.push(`${at}isin "${isin.slice(0, 20)}" is not a valid ISIN (2 letters, 9 letters or digits, 1 check digit).`);
  }
  const lei = text('lei');
  if (lei !== null) {
    const s = lei.trim().toUpperCase();
    if (isLei(s)) ids.lei = s;
    else errors.push(`${at}lei "${lei.slice(0, 24)}" is not a valid LEI (20 letters or digits ending in 2 check digits).`);
  }
  const cik = text('cik');
  if (cik !== null) {
    const s = cik.trim();
    if (isCik(s)) ids.cik = s.padStart(10, '0');
    else errors.push(`${at}cik "${cik.slice(0, 12)}" is not a valid CIK (1 to 10 digits).`);
  }
  const ticker = text('ticker');
  if (ticker !== null) {
    const s = ticker.trim();
    if (isTicker(s)) ids.ticker = s.toUpperCase();
    else errors.push(`${at}ticker "${ticker.slice(0, 24)}" is not a ticker (letters, digits and . - / :, up to 20, with an optional exchange code after a space).`);
  }
  const entity = text('entityId');
  if (entity !== null) {
    if (entity.length > ENTITY_ID_MAX) errors.push(`${at}entityId is longer than ${ENTITY_ID_MAX} characters.`);
    else ids.entityId = entity;
  }
  return { ids, errors };
}

/** The identifiers a holding carries, for a list or a CSV, in a fixed order. */
export function idsOf(h: SecurityIds): SecurityIds {
  const out: SecurityIds = {};
  for (const k of ID_FIELDS) if (h[k] !== undefined) out[k] = h[k];
  return out;
}

/** Short label for a position's identifiers, e.g. "ISIN US0378331005 · ID pos-17". */
export function idsLabel(h: SecurityIds): string {
  const parts: string[] = [];
  if (h.isin) parts.push(`ISIN ${h.isin}`);
  if (h.lei) parts.push(`LEI ${h.lei}`);
  if (h.cik) parts.push(`CIK ${h.cik}`);
  if (h.ticker) parts.push(`Ticker ${h.ticker}`);
  if (h.entityId) parts.push(`ID ${h.entityId}`);
  return parts.join(' · ');
}
