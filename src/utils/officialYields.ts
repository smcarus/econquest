/**
 * Official 10-year government bond yields from free public sources.
 *
 * Source: OECD "Long-term interest rates" (10-year government bonds, monthly average),
 * republished by the St. Louis Fed on FRED. No API key is needed. The figure is a monthly
 * average and is usually one to two months behind, so it is always shown with its month.
 *
 * Coverage is OECD members only. Countries without a series (for example Brazil, Turkey,
 * Indonesia, Egypt) keep the AI estimate or sample value, and are labelled as such.
 */

export interface OfficialYieldObservation {
  valuePct: number;
  /** Month of the observation, YYYY-MM. */
  period: string;
  source: string;
  seriesId: string;
  url: string;
}

/** FRED series ids, checked on fred.stlouisfed.org on 2026-11-04 (latest Sep 2026). */
export const FRED_10Y_SERIES: Record<string, string> = {
  MEX: 'IRLTLT01MXM156N',
  ZAF: 'IRLTLT01ZAM156N',
  JPN: 'IRLTLT01JPM156N',
  GBR: 'IRLTLT01GBM156N',
  POL: 'IRLTLT01PLM156N',
  CHL: 'IRLTLT01CLM156N',
};

export const OFFICIAL_YIELD_SOURCE_LABEL = 'FRED / OECD 10Y government yield (monthly average)';

export function fredSeriesUrl(seriesId: string): string {
  return `https://fred.stlouisfed.org/series/${seriesId}`;
}

/** No-key CSV download, limited to the last two years. */
export function fredCsvUrl(seriesId: string, now = new Date()): string {
  const start = new Date(now.getFullYear() - 2, now.getMonth(), 1).toISOString().slice(0, 10);
  return `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=${start}`;
}

/**
 * Parses a FRED graph CSV ("observation_date,<ID>" or the older "DATE,<ID>" header).
 * Missing values are "." and are skipped. Returns the latest numeric observation, or null.
 */
export function parseFredCsvLatest(csv: string, seriesId: string): OfficialYieldObservation | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !/date/i.test(lines[0])) return null;
  for (let i = lines.length - 1; i >= 1; i--) {
    const [date, raw] = lines[i].split(',');
    const value = Number(raw);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || raw === undefined || raw.trim() === '.' || !Number.isFinite(value)) continue;
    if (value <= -5 || value > 70) return null; // not a plausible yield: treat the feed as broken
    return {
      valuePct: Number(value.toFixed(2)),
      period: date.trim().slice(0, 7),
      source: 'OECD via FRED',
      seriesId,
      url: fredSeriesUrl(seriesId),
    };
  }
  return null;
}

/** "Sep 2026" from "2026-09". */
export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${y}` : period;
}
