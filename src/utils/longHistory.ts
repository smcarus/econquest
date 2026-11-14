/**
 * Puts the long histories already on disk (data/live/model-history.json, src/utils/modelHistory.ts)
 * in front of the everyday feeds' short windows, so a chart or download starts where the source
 * starts rather than in late 2024. The everyday pulls keep about two years of BIS policy rates and
 * about 40 months of the OECD leading indicator and inflation; the weekly long-history pull holds
 * the same series from 1990 (BIS) or the start of the OECD record.
 *
 * Only observations older than the first point of the short window are added, so every recent
 * value still comes from the latest pull. Inflation is joined only when both runs are the same
 * OECD year-on-year series, so a series never changes definition part way along.
 *
 * Browser-safe, pure.
 */
import type { CbpolPull, CbpolSeries } from './bisPolicyRates';
import type { CliSeries } from './oecdCli';
import type { CpiSeries } from './oecdInflation';

export interface LongHistoryParts {
  policyMonthly?: Record<string, CbpolSeries> | null;
  cli?: CliSeries | null;
  cpi?: CpiSeries | null;
}

function prepend<T extends { period: string }>(short: T[], long: T[]): T[] {
  if (!long.length) return short;
  const first = short.reduce<string | undefined>((m, p) => (m === undefined || p.period < m ? p.period : m), undefined);
  const older = first === undefined ? long : long.filter((p) => p.period < first);
  return older.length ? [...older, ...short] : short;
}

/** The BIS pull with each area's month-ends reaching back as far as the long history does. */
export function withLongPolicy(pull: CbpolPull | null | undefined, long: LongHistoryParts['policyMonthly']): CbpolPull | null | undefined {
  if (!pull || !long) return pull;
  const monthly: Record<string, CbpolSeries> = { ...pull.monthly };
  for (const [area, s] of Object.entries(long)) {
    const cur = monthly[area];
    if (!cur && !pull.daily?.[area]) continue;
    monthly[area] = { ...s, ...cur, points: prepend(cur?.points ?? [], s.points ?? []) };
  }
  return { ...pull, monthly };
}

/** The leading indicator pull with each area's run reaching back as far as the long history does. */
export function withLongCli<P extends { pulledAt: string; series: CliSeries }>(pull: P | null | undefined, long: LongHistoryParts['cli']): P | null | undefined {
  if (!pull || !long) return pull;
  const series: CliSeries = { ...pull.series };
  for (const [area, pts] of Object.entries(long)) {
    if (series[area]) series[area] = prepend(series[area], pts);
  }
  return { ...pull, series };
}

/** Inflation, joined only where both runs are the OECD year-on-year series. */
export function withLongCpi(series: CpiSeries | null | undefined, long: LongHistoryParts['cpi']): CpiSeries | null | undefined {
  if (!series || !long) return series;
  const out: CpiSeries = { ...series };
  for (const [area, s] of Object.entries(long)) {
    const cur = out[area];
    if (cur && cur.basis === 'oecd_yoy' && s.basis === 'oecd_yoy') out[area] = { ...cur, points: prepend(cur.points, s.points) };
  }
  return out;
}
