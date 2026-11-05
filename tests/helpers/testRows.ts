import type { WatchlistItem } from '../../src/types/council.ts';

/**
 * Test figures for watchlist rows. The app ships no built-in figures (catalogue numbers are NaN),
 * so tests that need numbers on a row take them from here.
 */
const ROWS: Record<string, Partial<WatchlistItem>> = {
  BRA: { geopoliticalRisk: 0.34, sovereignRisk: 0.64, macroRisk: 0.58, compositeRisk: 0.52, yield10YPct: 12.85, cds5YBps: 168, debtToGdpPct: 86.4, fxReservesMonths: 14.2 },
  TUR: { geopoliticalRisk: 0.68, sovereignRisk: 0.61, macroRisk: 0.72, compositeRisk: 0.67, yield10YPct: 28.4, cds5YBps: 264, debtToGdpPct: 31.8, fxReservesMonths: 4.1 },
  EGY: { geopoliticalRisk: 0.84, sovereignRisk: 0.78, macroRisk: 0.74, compositeRisk: 0.79, yield10YPct: 24.1, cds5YBps: 540, debtToGdpPct: 90.2, fxReservesMonths: 3.4 },
  ZAF: { geopoliticalRisk: 0.45, sovereignRisk: 0.62, macroRisk: 0.54, compositeRisk: 0.54, yield10YPct: 10.45, cds5YBps: 205, debtToGdpPct: 75.8, fxReservesMonths: 5.3 },
  MEX: { geopoliticalRisk: 0.56, sovereignRisk: 0.53, macroRisk: 0.49, compositeRisk: 0.53, yield10YPct: 9.95, cds5YBps: 132, debtToGdpPct: 54.6, fxReservesMonths: 4.6 },
  IDN: { geopoliticalRisk: 0.31, sovereignRisk: 0.39, macroRisk: 0.42, compositeRisk: 0.37, yield10YPct: 6.75, cds5YBps: 74, debtToGdpPct: 39.6, fxReservesMonths: 6.2 },
  JPN: { geopoliticalRisk: 0.38, sovereignRisk: 0.57, macroRisk: 0.51, compositeRisk: 0.49, yield10YPct: 1.18, cds5YBps: 24, debtToGdpPct: 251.2, fxReservesMonths: 15.8 },
  GBR: { geopoliticalRisk: 0.32, sovereignRisk: 0.48, macroRisk: 0.47, compositeRisk: 0.42, yield10YPct: 4.42, cds5YBps: 31, debtToGdpPct: 101.4, fxReservesMonths: 3.1 },
  POL: { geopoliticalRisk: 0.47, sovereignRisk: 0.41, macroRisk: 0.43, compositeRisk: 0.44, yield10YPct: 5.45, cds5YBps: 72, debtToGdpPct: 58.2, fxReservesMonths: 7.4 },
  CHL: { geopoliticalRisk: 0.22, sovereignRisk: 0.34, macroRisk: 0.39, compositeRisk: 0.32, yield10YPct: 5.6, cds5YBps: 64, debtToGdpPct: 42.1, fxReservesMonths: 5.8 },
};

export function withTestFigures(rows: WatchlistItem[]): WatchlistItem[] {
  return rows.map((r) => ({ ...r, ...(ROWS[r.iso3] || {}) }));
}
