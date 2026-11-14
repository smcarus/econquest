/**
 * The one inflation figure a country page works from, so every tab compares the policy rate with the
 * same number: the latest monthly year-on-year reading (national statistics, the IMF monthly CPI or
 * OECD via DBnomics, src/utils/oecdInflation.ts) when there is one, otherwise the IMF WEO yearly
 * average. Each reading names itself, so a sentence can say which inflation it used.
 *
 * Browser-safe, pure.
 */
import type { OpenDataSnapshot, WatchlistItem } from '../types/council';
import { cpiSource } from './oecdInflation';

export interface InflationReading {
  pct: number;
  /** Where and when, in words: "Banco Central do Brasil IPCA ..., Sep 2026" or "IMF WEO, 2025 average". */
  source: string;
  monthly: boolean;
}

export type InflationPeer = Pick<WatchlistItem, 'iso3' | 'oecdCpi'>;

/** `imfCpi` is the live IMF WEO figure (undefined when it is not live). */
export function latestInflation(open: Pick<OpenDataSnapshot, 'imfIndicators'> | undefined, imfCpi: number | undefined, self?: Partial<InflationPeer>): InflationReading | undefined {
  const m = self?.oecdCpi;
  if (m && Number.isFinite(m.yoyPct)) return { pct: m.yoyPct, source: cpiSource(m), monthly: true };
  if (imfCpi === undefined || !Number.isFinite(imfCpi)) return undefined;
  const year = open?.imfIndicators?.years?.['imf.cpiInflationPct'];
  return { pct: imfCpi, source: year ? `IMF WEO, ${year} average` : 'IMF WEO, yearly average', monthly: false };
}
