/**
 * Local market rates from IMF monthly data (LP1): the Treasury bill rate, the government bond yield
 * and the money market rate, for countries with no official 10-year yield in the app (most
 * lower-income countries: Nigeria, Kenya, Ghana, Egypt, Pakistan, Bangladesh and others).
 *
 * Source: the IMF data portal's free SDMX 3.0 API (api.imf.org, no key), dataset MFS_IR (monetary
 * and financial statistics, interest rates, IMF.STA), found by the IMF's own code names
 * (src/utils/imfMonthly.ts), monthly averages or end of month as each country reports them. Each
 * series key can be set in .env (IMF_TBILL_KEY, IMF_GOVBOND_KEY, IMF_MONEY_KEY, {ISO3} for the
 * country) if the names differ. Free for non-commercial use under the IMF's terms.
 *
 * The government bond yield is the one the country reports to the IMF; its maturity differs by
 * country, so it is never shown as a 10-year yield and never fills the 10Y fields, the spread over
 * US Treasuries or the tests built on them.
 *
 * Browser-safe, pure.
 */
import type { ImfMonthlyPull, ImfMonthlySpec } from './imfMonthly';
import { FRED_10Y_SERIES } from './officialYields';
import type { Series } from './seriesHistory';

export type LocalRateKind = 'tbill' | 'govbond' | 'money';

const AVOID_COMMON = /lending|deposit|savings|mortgage|policy|real\b|corporate|repurchase|repo\b|foreign|fund\b|funds\b/i;

export const IMF_LOCAL_RATE_SPECS: Record<LocalRateKind, ImfMonthlySpec> = {
  tbill: {
    flow: 'MFS_IR',
    short: 'IMF MFS',
    long: 'IMF Monetary and Financial Statistics, interest rates (MFS_IR dataset), Treasury bill rate, monthly',
    env: 'IMF_TBILL_KEY',
    want: [/treasury bills?/i, /\bbills?\b/i],
    avoid: new RegExp(`${AVOID_COMMON.source}|bond|money market|interbank`, 'i'),
    accept: (l) => /bill/i.test(l),
    decimals: 3,
  },
  govbond: {
    flow: 'MFS_IR',
    short: 'IMF MFS',
    long: 'IMF Monetary and Financial Statistics, interest rates (MFS_IR dataset), government bond yield, monthly',
    env: 'IMF_GOVBOND_KEY',
    want: [/government bonds?/i, /\bbonds?\b/i],
    avoid: new RegExp(`${AVOID_COMMON.source}|bill|money market|interbank`, 'i'),
    accept: (l) => /bond/i.test(l),
    decimals: 3,
  },
  money: {
    flow: 'MFS_IR',
    short: 'IMF MFS',
    long: 'IMF Monetary and Financial Statistics, interest rates (MFS_IR dataset), money market rate, monthly',
    env: 'IMF_MONEY_KEY',
    want: [/money market/i, /interbank/i],
    avoid: new RegExp(`${AVOID_COMMON.source}|bill|bond`, 'i'),
    accept: (l) => /money market|interbank/i.test(l),
    decimals: 3,
  },
};

export const LOCAL_RATE_KINDS: LocalRateKind[] = ['tbill', 'govbond', 'money'];

export const LOCAL_RATE_LABEL: Record<LocalRateKind, string> = {
  tbill: 'Treasury bill rate',
  govbond: 'Government bond yield',
  money: 'Money market rate',
};

/** What each rate is, in plain words. */
export const LOCAL_RATE_ABOUT: Record<LocalRateKind, string> = {
  tbill:
    'The interest rate the government pays when it borrows for a few months by selling Treasury bills in its own currency, as the country reports it to the IMF each month. It is the most widely quoted local market rate in many lower-income countries.',
  govbond:
    'The yield on government bonds in the local currency, as the country reports it to the IMF each month. The maturity differs by country (often 2 to 10 years), so it is not a 10-year yield and is not compared with US 10-year Treasuries.',
  money:
    'The rate banks charge each other for short loans (the money market or interbank rate), as the country reports it to the IMF each month. It shows how tight local cash is, often close to the policy rate.',
};

/** The name inside a sentence. */
const IN_TEXT: Record<LocalRateKind, string> = { tbill: 'Treasury bill rate', govbond: 'government bond yield', money: 'money market rate' };

export const LOCAL_RATE_SERIES_ID: Record<LocalRateKind, string> = {
  tbill: 'tbill_rate',
  govbond: 'gov_bond_yield',
  money: 'money_market_rate',
};

/** Months after the end of the latest month before a figure is marked as possibly out of date. */
export const LOCAL_RATE_STALE_MONTHS = 4;

/**
 * Countries the IMF local rates are asked for: those with no official 10-year yield in the app
 * (OECD via FRED, or Brazil's Treasury). Turkey's EVDS needs a personal key, so Turkey is asked too.
 */
export function imfLocalRatesWanted(iso3: string): boolean {
  const c = String(iso3 || '').toUpperCase();
  return /^[A-Z]{3}$/.test(c) && c !== 'BRA' && !FRED_10Y_SERIES[c];
}

export interface LocalRate {
  ratePct: number;
  /** YYYY-MM. */
  date: string;
  change12mPts?: number;
  stale: boolean;
  source: string;
}

/** Pulls of the three rates, any of which may be missing. */
export type LocalRatePulls = Partial<Record<LocalRateKind, ImfMonthlyPull | null>>;

/** The three rates laid on a country snapshot, each only when the IMF published it. */
export type LocalRatesReading = Partial<Record<LocalRateKind, LocalRate>> & { pulledAt: string };

const monthsBetween = (from: string, to: Date) => {
  const [y, m] = from.split('-').map(Number);
  return (to.getUTCFullYear() - y) * 12 + (to.getUTCMonth() + 1 - m);
};

/** The latest figure of one rate for a country, or null. */
export function localRateFor(pull: ImfMonthlyPull | null | undefined, iso3: string, now = new Date()): LocalRate | null {
  const s = pull?.series?.[String(iso3 || '').toUpperCase()];
  const pts = (s?.points || []).filter((p) => Number.isFinite(p.value));
  const last = pts[pts.length - 1];
  if (!s || !last) return null;
  const [y, m] = last.period.split('-').map(Number);
  const prior = pts.find((p) => p.period === `${y - 1}-${String(m).padStart(2, '0')}`);
  return {
    ratePct: last.value,
    date: last.period,
    ...(prior ? { change12mPts: Math.round((last.value - prior.value) * 100) / 100 } : {}),
    stale: monthsBetween(last.period, now) > LOCAL_RATE_STALE_MONTHS,
    source: s.long,
  };
}

/** All three rates for a country, or null when the IMF published none of them. */
export function localRatesFor(pulls: LocalRatePulls, iso3: string, now = new Date()): LocalRatesReading | null {
  const out: LocalRatesReading = { pulledAt: '' };
  let latest = '';
  for (const k of LOCAL_RATE_KINDS) {
    const r = localRateFor(pulls[k], iso3, now);
    if (!r) continue;
    out[k] = r;
    const at = pulls[k]?.pulledAt || '';
    if (at > latest) latest = at;
  }
  if (!LOCAL_RATE_KINDS.some((k) => out[k])) return null;
  out.pulledAt = latest;
  return out;
}

/** One saved rate as a history series, or null. */
export function localRateSeries(kind: LocalRateKind, pull: ImfMonthlyPull | null | undefined, iso3: string): Series | null {
  const s = pull?.series?.[String(iso3 || '').toUpperCase()];
  const points = (s?.points || []).filter((p) => Number.isFinite(p.value)).map((p) => ({ date: p.period, value: p.value }));
  if (!s || !points.length) return null;
  return {
    id: LOCAL_RATE_SERIES_ID[kind],
    label: LOCAL_RATE_LABEL[kind],
    unit: '%',
    freq: 'monthly',
    source: s.long,
    pulledAt: pull!.pulledAt,
    points,
    about: LOCAL_RATE_ABOUT[kind],
  };
}

/** "Sep 2026" from "2026-09". */
export function localRateWhen(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m >= 1 && m <= 12 ? `${names[m - 1]} ${y}` : period;
}

/** Why a rate is missing for a country, in words. */
export function localRateMissing(kind: LocalRateKind, iso3: string, pulled: boolean): { kind: 'setup' | 'unreachable'; short: string; help: string } {
  if (!imfLocalRatesWanted(iso3))
    return {
      kind: 'setup',
      short: 'Not asked for',
      help: 'This country has an official 10-year government bond yield in the app, so the IMF monthly local rates are not downloaded for it.',
    };
  if (!pulled)
    return {
      kind: 'unreachable',
      short: 'Not downloaded yet',
      help: `The ${IN_TEXT[kind]} comes from the IMF's free monthly interest-rate data, saved by the daily download (npm run go -- daily). It has not been saved yet, the IMF did not answer, or the country reports none of these rates to the IMF. npm run check:data, row imf_rates, says why.`,
    };
  return {
    kind: 'setup',
    short: 'Not in IMF data',
    help: `The IMF answered, but this country reports no monthly ${IN_TEXT[kind]} to it. The app leaves it Missing rather than fill the gap.`,
  };
}

/** Stock index: no free source with terms that allow reuse for these countries. */
export const STOCK_INDEX_MISSING = {
  kind: 'setup' as const,
  short: 'No free source',
  help: 'Stock exchange index levels for these countries are sold by the exchanges and data vendors; no free source with terms that allow reuse was found. The app shows Missing rather than an estimate.',
};

/** "12.40%" with "(+1.20 pts in 12 months)" where known. */
export function localRateValue(r: LocalRate): string {
  const chg = r.change12mPts !== undefined ? ` (${r.change12mPts >= 0 ? '+' : ''}${r.change12mPts.toFixed(2)} pts in 12 months)` : '';
  return `${r.ratePct.toFixed(2)}%${chg}`;
}

/** Source line: "IMF monthly, Sep 2026" and a warning when out of date. */
export function localRateSource(r: LocalRate): string {
  return `IMF monthly (MFS), ${localRateWhen(r.date)}${r.stale ? `, may be out of date (more than ${LOCAL_RATE_STALE_MONTHS} months old)` : ''}`;
}
