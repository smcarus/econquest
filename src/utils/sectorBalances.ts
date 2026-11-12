/**
 * Sector balances and private debt (data batch G40).
 *
 * Sector balances: what each part of the economy saves minus what it invests, % of GDP. They add up
 * by accounting: government balance + private balance = current account, so the rest of the world
 * lends the country minus the current account. The app reads two published figures for the same
 * year, the government's overall balance (IMF Fiscal Monitor, general government net lending) and
 * the current account (IMF WEO, % of GDP), and works out the other two:
 *   - foreign balance = minus the current account (what the rest of the world lends the country);
 *   - private balance = current account minus government balance (households and firms together),
 *     the remainder of the identity, labelled as such. It also takes in errors and omissions and any
 *     difference between the two IMF datasets, so it is a rough reading, not a measured figure.
 * Years must match; IMF projection years are kept as projections.
 *
 * Private debt: credit to households and to non-financial companies from all lenders, % of GDP,
 * market value, adjusted for breaks (BIS total credit statistics, WS_TC, quarterly). The BIS host
 * does not answer from this project's cloud session; the codes follow the BIS key layout
 * (FREQ.BORROWERS_CTY.TC_BORROWERS.TC_LENDERS.VALUATION.UNIT_TYPE.TC_ADJUST, e.g. Q.US.H.A.M.770.A)
 * and `npm run check:data` row bis_private_debt confirms the live answer. Browser-safe, pure.
 */
import { BIS_API, BIS_ISO2, parseBisCsv } from './bisDebtSecurities';
import { quarterKey } from './debtSchedule';
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

// --- Sector balances ---

export interface SectorBalances {
  year: string;
  governmentPct: number;
  privatePct: number;
  foreignPct: number;
  currentAccountPct: number;
}

const r1 = (v: number) => Number(v.toFixed(1));

/** The three balances for one year; undefined when a figure is missing or the years differ. */
export function sectorBalances(governmentPct: number | undefined, currentAccountPct: number | undefined, govYear: string | undefined, caYear: string | undefined): SectorBalances | undefined {
  if (governmentPct === undefined || currentAccountPct === undefined || !Number.isFinite(governmentPct) || !Number.isFinite(currentAccountPct)) return undefined;
  if (!govYear || !caYear || govYear !== caYear) return undefined;
  return { year: govYear, governmentPct: r1(governmentPct), currentAccountPct: r1(currentAccountPct), foreignPct: r1(-currentAccountPct), privatePct: r1(currentAccountPct - governmentPct) };
}

/**
 * The private and foreign balances as yearly series, from the government balance and current
 * account series (oldest first). A year is kept only when both are published; a year either marks
 * as an IMF projection stays marked.
 */
export function sectorBalanceSeries(gov: Series | SeriesMissing | undefined, ca: Series | SeriesMissing | undefined): Array<Series | SeriesMissing> {
  const pLabel = 'Private sector balance (remainder)';
  const fLabel = 'Foreign balance (minus the current account)';
  const missing = (why: string): Array<Series | SeriesMissing> => [
    { id: 'private_balance', label: pLabel, reason: why },
    { id: 'foreign_balance', label: fLabel, reason: why },
  ];
  if (!ca || !('points' in ca)) return missing(`Needs the IMF current account series: ${ca && 'reason' in ca ? ca.reason.charAt(0).toLowerCase() + ca.reason.slice(1) : 'not downloaded'}`);
  const foreign: Series = {
    id: 'foreign_balance',
    label: fLabel,
    unit: '% of GDP',
    freq: 'annual',
    source: `worked out: minus the ${ca.source}`,
    pulledAt: ca.pulledAt,
    points: ca.points.map((p) => ({ ...p, value: r1(-p.value) })),
    about: 'What the rest of the world lends the country (positive) or borrows from it (negative), % of GDP: the current account with its sign turned.',
  };
  if (!gov || !('points' in gov)) return [{ id: 'private_balance', label: pLabel, reason: `Needs the IMF overall fiscal balance series: ${gov && 'reason' in gov ? gov.reason.charAt(0).toLowerCase() + gov.reason.slice(1) : 'not downloaded'}` }, foreign];
  const g = new Map(gov.points.map((p) => [p.date, p]));
  const points: SeriesPoint[] = [];
  for (const c of ca.points) {
    const gp = g.get(c.date);
    if (!gp) continue;
    const projected = c.note === 'IMF projection' || gp.note === 'IMF projection';
    points.push({ date: c.date, value: r1(c.value - gp.value), ...(projected ? { note: 'IMF projection' } : {}) });
  }
  if (!points.length) return [{ id: 'private_balance', label: pLabel, reason: 'The IMF government balance and current account have no year in common' }, foreign];
  return [
    {
      id: 'private_balance',
      label: pLabel,
      unit: '% of GDP',
      freq: 'annual',
      source: `worked out: ${ca.source} minus ${gov.source}`,
      pulledAt: ca.pulledAt,
      points,
      about: 'Households and firms together: saving minus investment, % of GDP, worked out as the current account minus the government balance for the same year. It is the remainder of an accounting identity, not a measured figure, so it also takes in errors and differences between the IMF datasets.',
    },
    foreign,
  ];
}

// --- Private debt (BIS total credit) ---

export interface PrivateDebt {
  fetchedAt: string;
  /** Quarter (YYYYQn) -> % of GDP. */
  householdDebt?: Record<string, number>;
  corporateDebt?: Record<string, number>;
}

export interface PrivateDebtReading {
  quarter: string;
  householdPct?: number;
  corporatePct?: number;
}

export interface PrivateDebtPull {
  pulledAt: string;
  countries: Record<string, PrivateDebtReading>;
}

/** One country, full quarterly history (History & data). */
export function bisPrivateDebtUrl(iso2: string): string {
  return `${BIS_API}/WS_TC/Q.${iso2}.H+N.A.M.770.A/all?format=csv`;
}
/** Every BIS country from `fromYear` (the daily run, for the brief). */
export function bisPrivateDebtAllUrl(fromYear: number): string {
  return `${BIS_API}/WS_TC/Q..H+N.A.M.770.A/all?format=csv&startPeriod=${fromYear}`;
}
/** Brazil only, for the connection check. */
export const BIS_PRIVATE_DEBT_SAMPLE_URL = `${BIS_API}/WS_TC/Q.BR.H+N.A.M.770.A/all?format=csv&lastNObservations=4`;

const keep = (r: Record<string, string>) =>
  r.TC_LENDERS === 'A' && (r.VALUATION === undefined || r.VALUATION === 'M' || r.VALUATION === '') && (r.UNIT_TYPE === undefined || r.UNIT_TYPE === '770') && (r.TC_ADJUST === undefined || r.TC_ADJUST === 'A' || r.TC_ADJUST === '');

function quarterValue(r: Record<string, string>): { q: string; v: number } | null {
  const q = quarterKey(r.TIME_PERIOD);
  const v = Number(r.OBS_VALUE);
  return q && r.OBS_VALUE !== '' && r.OBS_VALUE !== 'NaN' && Number.isFinite(v) && v >= 0 ? { q, v: Number(v.toFixed(2)) } : null;
}

/** One country's answer -> household and company debt by quarter. */
export function parseBisPrivateDebt(text: unknown): Omit<PrivateDebt, 'fetchedAt'> {
  const out: Omit<PrivateDebt, 'fetchedAt'> = {};
  for (const r of parseBisCsv(text)) {
    if (!keep(r) || (r.TC_BORROWERS !== 'H' && r.TC_BORROWERS !== 'N')) continue;
    const x = quarterValue(r);
    if (!x) continue;
    const key = r.TC_BORROWERS === 'H' ? 'householdDebt' : 'corporateDebt';
    (out[key] ||= {})[x.q] = x.v;
  }
  return out;
}

const ISO3_OF_BIS: Record<string, string> = Object.fromEntries(Object.entries(BIS_ISO2).map(([iso3, iso2]) => [iso2, iso3]));

/** The all-country answer -> the latest quarter per catalogue country (with both figures when there is one). */
export function parseBisPrivateDebtAll(text: unknown): Record<string, PrivateDebtReading> {
  const by: Record<string, Record<string, { H?: number; N?: number }>> = {};
  for (const r of parseBisCsv(text)) {
    if (!keep(r) || (r.TC_BORROWERS !== 'H' && r.TC_BORROWERS !== 'N')) continue;
    const iso3 = ISO3_OF_BIS[r.BORROWERS_CTY];
    const x = quarterValue(r);
    if (!iso3 || !x) continue;
    ((by[iso3] ||= {})[x.q] ||= {})[r.TC_BORROWERS as 'H' | 'N'] = x.v;
  }
  const out: Record<string, PrivateDebtReading> = {};
  for (const [iso3, qs] of Object.entries(by)) {
    const sorted = Object.keys(qs).sort();
    const quarter = [...sorted].reverse().find((q) => qs[q].H !== undefined && qs[q].N !== undefined) ?? sorted[sorted.length - 1];
    const x = qs[quarter];
    out[iso3] = { quarter, ...(x.H !== undefined ? { householdPct: r1(x.H) } : {}), ...(x.N !== undefined ? { corporatePct: r1(x.N) } : {}) };
  }
  return out;
}

export const PRIVATE_DEBT_DEFS = [
  { id: 'household_debt', key: 'householdDebt', label: 'Household debt', about: 'Credit to households (and the non-profit bodies that serve them) from all lenders, % of GDP, market value, adjusted for breaks (BIS total credit).' },
  { id: 'corporate_debt', key: 'corporateDebt', label: 'Company debt', about: 'Credit to non-financial companies from all lenders, loans and bonds, % of GDP, market value, adjusted for breaks (BIS total credit).' },
] as const;

export const PRIVATE_DEBT_SOURCE = 'BIS total credit statistics';

/** History & data: one quarterly series each, or Missing with the reason. */
export function privateDebtSeries(debt: PrivateDebt | null | undefined, covered: boolean): Array<Series | SeriesMissing> {
  return PRIVATE_DEBT_DEFS.map((d) => {
    if (!covered) return { id: d.id, label: d.label, reason: 'Not a BIS reporting country in the catalogue' };
    if (!debt) return { id: d.id, label: d.label, reason: 'The BIS has not answered yet' };
    const points = Object.entries(debt[d.key] || {})
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (!points.length) return { id: d.id, label: d.label, reason: `The BIS publishes no ${d.label.toLowerCase()} series for this country` };
    return { id: d.id, label: d.label, unit: '% of GDP', freq: 'quarterly' as const, source: PRIVATE_DEBT_SOURCE, pulledAt: debt.fetchedAt, points, about: d.about };
  });
}

// --- Words ---

const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
export const quarterText = (q: string) => q.replace(/^(\d{4})Q/, '$1 Q');

export function balanceValue(v: number, year: string): string {
  return `${signed(v)} of GDP (${year})`;
}

export const SECTOR_RULE = 'government balance + private balance = current account; foreign balance = minus the current account';
export const SECTOR_SOURCE = 'IMF Fiscal Monitor (government balance) and IMF WEO (current account)';

export const SECTOR_YEARS_HELP =
  'The sector balances are worked out from the government balance and the current account, so both must be for the same year. The IMF figures are for different years, and mixing years would give a wrong answer.';
export const PRIVATE_DEBT_SETUP_HELP =
  'Household and company debt come from the BIS (Bank for International Settlements) total credit statistics, which the daily run downloads (npm run go -- daily, or Menu > Offline data > Download all country data). They have not been downloaded yet, or the download did not answer.';
export const PRIVATE_DEBT_NOT_COVERED_HELP =
  'The BIS was read but has no total credit series for this country. The BIS publishes them for about 40 economies, from central banks and statistics offices. The app shows Missing rather than an estimate.';
