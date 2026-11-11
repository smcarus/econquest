/**
 * Debt structure (data batch G19): what currencies a government's external debt is in, how long new
 * loans run, and how much of revenue goes on interest.
 *
 * - Currency mix of public and publicly guaranteed (PPG) external debt, World Bank International
 *   Debt Statistics (API source 6, counterpart World): DT.CUR.USDL.ZS US dollar, DT.CUR.EURO.ZS euro,
 *   DT.CUR.JYEN.ZS yen, DT.CUR.UKPS.ZS pound sterling, DT.CUR.SWFR.ZS Swiss franc, DT.CUR.SDRW.ZS SDR,
 *   DT.CUR.MULC.ZS multiple currencies, DT.CUR.OTHC.ZS all other currencies. Low- and middle-income
 *   countries only. Codes as the IDS names them; the World Bank host does not answer from the build
 *   computer, so the parser is tested on rows shaped like the IDS answers already read for D6.
 * - Average maturity of new PPG external loans, all lenders (DT.MAT.DPPG, years). IDS has no average
 *   maturity of the debt already owed, so the label says "new loans".
 * - Interest payments, % of revenue (World Bank WDI GC.XPN.INTP.RV.ZS): central government only.
 * - Who holds government debt: the IMF Sovereign Debt Investor Base (utils/investorBase.ts), from the
 *   workbook you put in data/local/imf-investor-base/. For the United States, which it does not cover,
 *   the app points to the Treasury's foreign-holder figures (TIC).
 *
 * Only figures a live feed answered are used; nothing built in. Browser-safe, pure.
 */
import { WB_API, IDS_SOURCE_ID } from './debtSchedule';
import { parseIdsRows } from './idsCreditors';

export const IDS_CURRENCIES: Array<{ code: string; label: string }> = [
  { code: 'DT.CUR.USDL.ZS', label: 'US dollar' },
  { code: 'DT.CUR.EURO.ZS', label: 'euro' },
  { code: 'DT.CUR.JYEN.ZS', label: 'yen' },
  { code: 'DT.CUR.UKPS.ZS', label: 'pound sterling' },
  { code: 'DT.CUR.SWFR.ZS', label: 'Swiss franc' },
  { code: 'DT.CUR.SDRW.ZS', label: 'SDR (IMF basket)' },
  { code: 'DT.CUR.MULC.ZS', label: 'several currencies' },
  { code: 'DT.CUR.OTHC.ZS', label: 'other currencies' },
];
export const IDS_NEW_MATURITY = 'DT.MAT.DPPG';
export const INTEREST_REVENUE_CODE = 'GC.XPN.INTP.RV.ZS';

export function debtStructureUrl(iso3: string): string {
  const codes = [...IDS_CURRENCIES.map((c) => c.code), IDS_NEW_MATURITY].join(';');
  return `${WB_API}/sources/${IDS_SOURCE_ID}/country/${encodeURIComponent(iso3)}/series/${codes}/counterpart-area/WLD/time/all?format=json&per_page=2000`;
}

export interface DebtStructure {
  fetchedAt: string;
  /** The latest year with a currency split, and the shares that year (largest first, above 0). */
  currency?: { year: string; shares: Array<{ label: string; pct: number }> };
  /** Average maturity of new PPG external loans that year, all lenders. */
  newLoanMaturity?: { years: number; year: string };
}

/**
 * IDS sources answer -> currency split and new-loan maturity. Null when the answer is not understood;
 * an object with neither part when IDS answered but has nothing for the country.
 */
export function parseDebtStructure(json: unknown, fetchedAt: string): DebtStructure | null {
  const rows = parseIdsRows(json, 'WLD');
  if (!rows) return null;
  const out: DebtStructure = { fetchedAt };
  const years = new Set(IDS_CURRENCIES.flatMap((c) => Object.keys(rows[c.code] || {})));
  const latest = [...years].sort().reverse().find((y) => IDS_CURRENCIES.some((c) => (rows[c.code]?.[y] ?? 0) > 0));
  if (latest) {
    const shares = IDS_CURRENCIES.map((c) => ({ label: c.label, pct: Number((rows[c.code]?.[latest] ?? 0).toFixed(1)) }))
      .filter((s) => s.pct > 0 && s.pct <= 100)
      .sort((a, b) => b.pct - a.pct);
    if (shares.length) out.currency = { year: latest, shares };
  }
  const mat = rows[IDS_NEW_MATURITY] || {};
  // A year with 0 had no new commitments; that is not a 0-year loan.
  const my = Object.keys(mat).sort().reverse().find((y) => mat[y] > 0);
  if (my) out.newLoanMaturity = { years: Number(mat[my].toFixed(1)), year: my };
  return out;
}

/** "US dollar 84.0%, euro 6.1%, several currencies 5.2% (2024)". */
export function currencyValue(c: NonNullable<DebtStructure['currency']>): string {
  return `${c.shares.map((s) => `${s.label} ${s.pct.toFixed(1)}%`).join(', ')} (${c.year})`;
}

/** The US dollar share, when IDS gives one. */
export const usdShare = (d: { currency?: DebtStructure['currency'] } | undefined): number | undefined => d?.currency?.shares.find((s) => s.label === 'US dollar')?.pct;

export const IDS_STRUCTURE_SOURCE = 'World Bank International Debt Statistics; public and publicly guaranteed external debt';
export const INTEREST_SOURCE = 'World Bank WDI (IMF Government Finance Statistics)';
export const INTEREST_CENTRAL_NOTE = 'central government only';

export const INVESTOR_BASE_US_HELP =
  'For the United States, the app reads the US Treasury\'s figures on foreign holders of Treasury securities (TIC); they show in the FX Valuation agent and under History & data. A full split by holder (banks, the Federal Reserve and others) is not connected yet.';

export interface DebtStructureFigures {
  interestPctRevenue?: { value: number; year: string };
  currency?: NonNullable<DebtStructure['currency']>;
  newLoanMaturity?: NonNullable<DebtStructure['newLoanMaturity']>;
}

/** The live parts of a snapshot; undefined when none is live. */
export function debtStructureFromSnapshot(snap: import('../types/council').OpenDataSnapshot): DebtStructureFigures | undefined {
  const out: DebtStructureFigures = {};
  const tag = snap.liveFields?.['wb.interestPctRevenue'];
  const v = snap.worldBankIndicators?.interestPctRevenue;
  const year = /((?:19|20)\d{2})/.exec(tag || '')?.[1];
  if (tag && tag !== 'AI estimate' && year && typeof v === 'number' && Number.isFinite(v)) out.interestPctRevenue = { value: v, year };
  if (snap.debtStructure?.currency) out.currency = snap.debtStructure.currency;
  if (snap.debtStructure?.newLoanMaturity) out.newLoanMaturity = snap.debtStructure.newLoanMaturity;
  return Object.keys(out).length ? out : undefined;
}
