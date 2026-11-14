/**
 * Federal Reserve dollar liquidity swap lines (Group B, PB4, 2026-11-14): how many dollars foreign
 * central banks have borrowed from the Fed to lend on to their banks. Large use is a sign that
 * banks outside the US cannot get dollars in the market (2008, March 2020).
 *
 * Source: the New York Fed Markets Data API, free, no key, under the New York Fed's terms of use
 * (licence row nyfed). `/api/fxs/usdollar/search.json?startDate=&endDate=` lists every operation:
 * { fxSwaps: { operations: [{ operationType, counterparty, currency, tradeDate, settlementDate,
 * maturityDate, termInDays, amount, interestRate, ... }] } }, amount in US dollars. Layout read from
 * live answers on 2026-11-14 (March 2020: 52 operations; Bank of Japan 2020-03-31, 84 days,
 * 29,724,000,000).
 *
 * The amount outstanding on a day is the sum of operations settled on or before that day and maturing
 * after it. The app shows it every Wednesday (the day the Fed's weekly balance sheet uses), in US$ bn,
 * for all central banks together and for the country's own central bank when it has drawn on a line.
 *
 * Browser-safe, pure.
 */
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

export const NYFED_SWAPS_SOURCE = 'New York Fed, central bank liquidity swap operations';
/** The first dollar swap lines opened in December 2007. */
export const FED_SWAPS_FROM = '2007-12-01';

export function nyfedSwapsUrl(startDate: string, endDate: string): string {
  return `https://markets.newyorkfed.org/api/fxs/usdollar/search.json?startDate=${startDate}&endDate=${endDate}`;
}
export const NYFED_SWAPS_SAMPLE_URL = 'https://markets.newyorkfed.org/api/fxs/usdollar/last/5.json';

export interface SwapOperation {
  counterparty: string;
  settle: string;
  mature: string;
  /** US$ bn. */
  usdBn: number;
}

export interface FedSwapsPull {
  pulledAt: string;
  operations: SwapOperation[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Dollar operations from one answer; anything unreadable is skipped. */
export function parseNyfedSwaps(json: unknown): SwapOperation[] | null {
  const ops = (json as { fxSwaps?: { operations?: unknown } })?.fxSwaps?.operations;
  if (!Array.isArray(ops)) return null;
  const out: SwapOperation[] = [];
  for (const o of ops as Array<Record<string, unknown>>) {
    if (String(o?.currency || 'USD').toUpperCase() !== 'USD') continue;
    const settle = String(o?.settlementDate || '');
    const mature = String(o?.maturityDate || '');
    const amount = Number(o?.amount);
    const counterparty = String(o?.counterparty || '').trim();
    if (!DATE.test(settle) || !DATE.test(mature) || !Number.isFinite(amount) || amount < 0 || !counterparty) continue;
    out.push({ counterparty, settle, mature, usdBn: amount / 1e9 });
  }
  return out;
}

/** Central bank names as the New York Fed writes them -> ISO3 (ECB is handled by currency). */
export const SWAP_COUNTERPARTY_ISO3: Record<string, string> = {
  'Bank of Japan': 'JPN',
  'Bank of England': 'GBR',
  'Swiss National Bank': 'CHE',
  'Bank of Canada': 'CAN',
  'Reserve Bank of Australia': 'AUS',
  'Banco Central do Brasil': 'BRA',
  'Banco de Mexico': 'MEX',
  'Bank of Mexico': 'MEX',
  'Bank of Korea': 'KOR',
  'Danmarks Nationalbank': 'DNK',
  'Norges Bank': 'NOR',
  'Sveriges Riksbank': 'SWE',
  'Reserve Bank of New Zealand': 'NZL',
  'Monetary Authority of Singapore': 'SGP',
};

/** Does this operation belong to the country's central bank? */
export function isCountryCounterparty(name: string, iso3: string, currency?: string): boolean {
  if (/european central bank/i.test(name)) return currency === 'EUR';
  const n = name.toLowerCase();
  return Object.entries(SWAP_COUNTERPARTY_ISO3).some(([k, v]) => v === iso3 && k.toLowerCase() === n);
}

const DAY = 24 * 60 * 60 * 1000;

/** Wednesdays from the first settlement to `until` (YYYY-MM-DD). */
function wednesdays(from: string, until: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${from}T00:00:00Z`);
  t += ((3 - new Date(t).getUTCDay() + 7) % 7) * DAY;
  const end = Date.parse(`${until}T00:00:00Z`);
  for (; t <= end; t += 7 * DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Amount outstanding every Wednesday, US$ bn, rounded to 0.001. */
export function outstandingByWednesday(ops: SwapOperation[], until: string): SeriesPoint[] {
  if (!ops.length) return [];
  const first = ops.map((o) => o.settle).sort()[0];
  return wednesdays(first, until).map((date) => ({
    date,
    value: Number(ops.reduce((s, o) => (o.settle <= date && o.mature > date ? s + o.usdBn : s), 0).toFixed(3)),
  }));
}

export const FED_SWAPS_ABOUT_TOTAL =
  'Dollars lent by the Federal Reserve to foreign central banks through swap lines, so they can lend dollars to their own banks, amount outstanding each Wednesday. Large use means banks outside the US could not borrow dollars in the market, as in late 2008 and March 2020.';
export const FED_SWAPS_ABOUT_CB =
  "Dollars this country's central bank has borrowed from the Federal Reserve through a swap line and lent on to its banks, amount outstanding each Wednesday.";

/** Total for all central banks, and the country's own central bank when it has ever drawn. */
export function fedSwapSeries(iso3: string, pull: FedSwapsPull | null | undefined, currency?: string): Array<Series | SeriesMissing> {
  const total = { id: 'fed_swaps_total', label: 'Fed dollar swap lines, all central banks' };
  const own = { id: 'fed_swaps_cb', label: "Fed dollar swap line, this country's central bank" };
  if (!pull) {
    const reason = 'The New York Fed has not answered yet';
    return [{ ...total, reason }, { ...own, reason }];
  }
  const until = pull.pulledAt.slice(0, 10);
  const base = { unit: 'US$ bn', freq: 'weekly' as const, source: NYFED_SWAPS_SOURCE, pulledAt: pull.pulledAt };
  const all = outstandingByWednesday(pull.operations, until);
  const mine = pull.operations.filter((o) => isCountryCounterparty(o.counterparty, iso3, currency));
  const out: Array<Series | SeriesMissing> = [
    all.length ? { ...total, ...base, points: all, about: FED_SWAPS_ABOUT_TOTAL } : { ...total, reason: 'The New York Fed lists no swap operations' },
  ];
  if (!mine.length) out.push({ ...own, reason: 'This central bank has not drawn on a Federal Reserve dollar swap line' });
  else out.push({ ...own, ...base, points: outstandingByWednesday(mine, until), about: FED_SWAPS_ABOUT_CB });
  return out;
}
