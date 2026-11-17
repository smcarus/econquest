/**
 * IMF monthly policy rates (LI4): the central bank policy rate for countries the BIS policy-rate
 * collection does not cover or the app does not pull from it (for example Egypt, Nigeria, Kenya,
 * Ghana, Pakistan and Bangladesh).
 *
 * Source: the IMF data portal's free SDMX 3.0 API (api.imf.org, no key), dataset MFS_IR (monetary
 * and financial statistics, interest rates, IMF.STA), found by the IMF's own code names
 * (src/utils/imfMonthly.ts): "monetary policy-related interest rate" or "policy rate", monthly. The
 * series key can be set in .env (IMF_POLICY_KEY, {ISO3} for the country) if the names differ.
 *
 * The BIS figure always wins where the app pulls it. The IMF figure is shown as the policy rate
 * with its own source and month, but it is kept out of the pre-registered policy-rate tests and
 * the tools built on BIS rate moves (cycle clock, Taylor gap, rate-move signals), which stay on
 * the BIS list they were fixed on.
 *
 * Browser-safe, pure.
 */
import type { ImfMonthlyPull, ImfMonthlySpec } from './imfMonthly';
import type { Series } from './seriesHistory';

export const IMF_POLICY_SPEC: ImfMonthlySpec = {
  flow: 'MFS_IR',
  short: 'IMF MFS',
  long: 'IMF Monetary and Financial Statistics, interest rates (MFS_IR dataset), monetary policy-related rate, monthly',
  env: 'IMF_POLICY_KEY',
  want: [/monetary policy[- ]related|central bank policy rate|^policy rate\b|\bpolicy rate\b/i],
  avoid: /lending|deposit|treasury|government|interbank|money market|savings|mortgage|real\b/i,
  accept: (l) => /policy/i.test(l),
  decimals: 3,
};

/** Months after the end of the latest month before the figure is marked as possibly out of date. */
export const IMF_POLICY_STALE_MONTHS = 4;

export interface ImfPolicyRate {
  ratePct: number;
  /** YYYY-MM. */
  date: string;
  change12mPts?: number;
  stale: boolean;
  source: string;
}

const monthsBetween = (from: string, to: Date) => {
  const [y, m] = from.split('-').map(Number);
  return (to.getUTCFullYear() - y) * 12 + (to.getUTCMonth() + 1 - m);
};

/** The latest IMF monthly policy rate for a country, or null. */
export function imfPolicyRateFor(pull: ImfMonthlyPull | null | undefined, iso3: string, now = new Date()): ImfPolicyRate | null {
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
    stale: monthsBetween(last.period, now) > IMF_POLICY_STALE_MONTHS,
    source: s.long,
  };
}

/** The saved IMF monthly policy rate as a policy rate history, or null. */
export function imfPolicySeries(pull: ImfMonthlyPull | null | undefined, iso3: string): Series | null {
  const s = pull?.series?.[String(iso3 || '').toUpperCase()];
  const points = (s?.points || []).filter((p) => Number.isFinite(p.value)).map((p) => ({ date: p.period, value: p.value }));
  if (!s || !points.length) return null;
  return {
    id: 'policy_rate',
    label: 'Policy rate',
    unit: '%',
    freq: 'monthly',
    source: s.long,
    pulledAt: pull!.pulledAt,
    points,
    about: 'The central bank policy rate for each month as the IMF publishes it, because the BIS collection the app uses does not cover this country.',
  };
}
