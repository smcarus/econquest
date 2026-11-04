import type { OpenDataSnapshot } from '../../src/types/council.ts';

/** Figure paths the free IMF, World Bank, GDELT and FX feeds fill. */
export const FEED_PATHS = [
  'imf.debtToGdpPct',
  'imf.debtToGdpForecast2027Pct',
  'imf.cpiInflationPct',
  'imf.realGdpGrowthPct',
  'imf.primaryFiscalBalancePct',
  'wb.fxReservesMonthsImport',
  'wb.currentAccountPctGdp',
  'wb.externalDebtPctGni',
  'wb.politicalStabilityPercentile',
  'gdelt.averageTone',
  'market.exchangeRatePerUsd',
];

/** Marks figures as filled by a live feed, as the server does when a feed answers. */
export function markLive(s: OpenDataSnapshot, paths: string[] = FEED_PATHS): OpenDataSnapshot {
  s.liveFields = { ...(s.liveFields || {}), ...Object.fromEntries(paths.map((p) => [p, p.startsWith('imf.') ? 'IMF WEO' : p.startsWith('wb.') ? 'World Bank' : 'live feed'])) };
  const feeds = new Set(s.dataStatus?.verifiedLiveSources || []);
  if (paths.some((p) => p.startsWith('imf.'))) feeds.add('IMF DataMapper WEO');
  if (paths.some((p) => p.startsWith('wb.'))) feeds.add('World Bank Open Data v2');
  if (paths.some((p) => p.startsWith('gdelt.'))) feeds.add('GDELT');
  if (paths.some((p) => p.startsWith('market.exchange'))) feeds.add('Spot FX (Frankfurter)');
  s.dataStatus = { verifiedLiveSources: [...feeds], checkedAt: s.dataStatus?.checkedAt || '2026-11-04T12:00:00Z' };
  return s;
}
