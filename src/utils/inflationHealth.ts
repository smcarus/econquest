/**
 * Data health, inflation (plan G3): every country's monthly inflation figure with its source,
 * reference month and age, so an old copy shows up instead of hiding behind a number.
 *
 * Stated rules, no model:
 * - Age counts days from the end of the reference month to today (September's figure is 0 days
 *   old on 30 September and 38 days old on 7 November).
 * - Old OECD copy: the figure comes from the OECD mirror on DBnomics and is more than
 *   OLD_DAYS old. The OECD copy stopped updating in June 2026; a fresher source (national,
 *   Eurostat or IMF) replaces it as soon as one answers with a month at least as new.
 * - Old: any other source more than OLD_DAYS old.
 * - Missing: no monthly inflation source answered for the country.
 *
 * Browser-safe, pure. Nothing here changes a figure.
 */
import type { CpiBasis, CpiReading } from './oecdInflation';

export const OLD_DAYS = 90;

export type InflationFlag = 'old_oecd' | 'old' | 'missing';

export const INFLATION_FLAG_TEXT: Record<InflationFlag, string> = {
  old_oecd: `OECD copy on DBnomics, more than ${OLD_DAYS} days old: a national, Eurostat or IMF figure replaces it when one answers`,
  old: `More than ${OLD_DAYS} days old: the source has not published a newer month`,
  missing: 'No monthly inflation source answered for this country',
};

export const BASIS_TEXT: Record<CpiBasis, string> = {
  national: 'National or Eurostat',
  imf: 'IMF monthly CPI',
  oecd_yoy: 'OECD copy (DBnomics)',
  from_index: 'OECD copy (DBnomics), from the index',
};

export interface InflationHealthRow {
  iso3: string;
  basis?: CpiBasis;
  /** The source's own label (e.g. "Eurostat HICP"), when it has one. */
  source?: string;
  month?: string;
  yoyPct?: number;
  ageDays?: number;
  flag?: InflationFlag;
}

export interface InflationHealth {
  rows: InflationHealthRow[];
  /** Rows with a flag. */
  needsLook: number;
  oldDays: number;
}

/** Days from the last day of a YYYY-MM month to today (UTC); null for another shape. */
export function daysSinceMonthEnd(month: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const end = Date.UTC(Number(m[1]), Number(m[2]), 0);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - end) / 86400000));
}

export function inflationHealth(iso3s: string[], readingFor: (iso3: string) => CpiReading | null, now = new Date()): InflationHealth {
  const rows: InflationHealthRow[] = iso3s.map((iso3) => {
    const r = readingFor(iso3);
    if (!r) return { iso3, flag: 'missing' };
    const ageDays = daysSinceMonthEnd(r.month, now) ?? undefined;
    const oecd = r.basis === 'oecd_yoy' || r.basis === 'from_index';
    const old = ageDays !== undefined && ageDays > OLD_DAYS;
    return {
      iso3,
      basis: r.basis,
      ...(r.short ? { source: r.short } : {}),
      month: r.month,
      yoyPct: r.yoyPct,
      ...(ageDays !== undefined ? { ageDays } : {}),
      ...(old ? { flag: oecd ? ('old_oecd' as const) : ('old' as const) } : {}),
    };
  });
  // Flagged first (oldest first), then the rest by country.
  rows.sort((a, b) => Number(Boolean(b.flag)) - Number(Boolean(a.flag)) || (b.ageDays ?? 1e9) - (a.ageDays ?? 1e9) || a.iso3.localeCompare(b.iso3));
  return { rows, needsLook: rows.filter((r) => r.flag).length, oldDays: OLD_DAYS };
}
