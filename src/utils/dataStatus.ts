import type { OpenDataSnapshot } from '../types/council';

/**
 * Honest data-status labels.
 *
 * A snapshot starts from built-in sample values (presetsAndBaselines.ts). Only the
 * server records which feeds actually answered, in `dataStatus.verifiedLiveSources`.
 * Snapshots saved before that field existed are reported as "unverified".
 */
export type DataFeedKey =
  | 'imf'
  | 'worldbank'
  | 'nyfed'
  | 'fx'
  | 'polymarket'
  | 'gdelt'
  | 'treasury'
  | 'ai_market'
  | 'official_yield';

const FEED_PATTERNS: Record<DataFeedKey, RegExp> = {
  imf: /IMF/i,
  worldbank: /World Bank/i,
  nyfed: /NY Fed/i,
  fx: /Spot FX|ExchangeRate|Frankfurter/i,
  polymarket: /Polymarket/i,
  gdelt: /GDELT/i,
  treasury: /Treasury/i,
  ai_market: /Gemini/i,
  official_yield: /FRED/i,
};

export type SnapshotDataMode = 'live' | 'partial' | 'sample' | 'unverified';

export interface SnapshotDataStatus {
  mode: SnapshotDataMode;
  liveFeeds: string[];
  /** Policy rate, yields, CDS and rating: AI web-search estimate, or built-in sample. */
  marketSource: 'ai_estimate' | 'sample';
  asOf: string;
  /** Where the 10Y yield came from. 'official' = OECD via FRED, monthly average for `yieldPeriod`. */
  yieldSource: 'official' | 'ai_estimate' | 'sample';
  yieldPeriod?: string;
  isFeedLive: (key: DataFeedKey) => boolean;
}

export function getSnapshotDataStatus(snapshot: OpenDataSnapshot): SnapshotDataStatus {
  const verified = snapshot.dataStatus;
  const liveFeeds = verified ? verified.verifiedLiveSources : [];
  const isFeedLive = (key: DataFeedKey) => liveFeeds.some((s) => FEED_PATTERNS[key].test(s));
  let mode: SnapshotDataMode;
  if (!verified) mode = 'unverified';
  else if (liveFeeds.length === 0) mode = 'sample';
  else if (isFeedLive('imf') && isFeedLive('worldbank')) mode = 'live';
  else mode = 'partial';
  return {
    mode,
    liveFeeds,
    marketSource: isFeedLive('ai_market') ? 'ai_estimate' : 'sample',
    asOf: verified?.checkedAt || snapshot.fetchedAt,
    yieldSource:
      snapshot.official10YYield && isFeedLive('official_yield')
        ? 'official'
        : isFeedLive('ai_market')
          ? 'ai_estimate'
          : 'sample',
    yieldPeriod: snapshot.official10YYield?.period,
    isFeedLive,
  };
}

export const DATA_MODE_LABEL: Record<SnapshotDataMode, string> = {
  live: 'Live data',
  partial: 'Partly live',
  sample: 'Sample data, not live',
  unverified: 'Source not verified',
};

export const DATA_MODE_HELP: Record<SnapshotDataMode, string> = {
  live: 'IMF and World Bank figures were fetched from their public APIs.',
  partial: 'Some feeds answered; the rest of the figures are built-in sample values.',
  sample:
    'No data feed answered. All figures are built-in sample values for demonstration, not current data.',
  unverified:
    'This snapshot was saved by an older version that did not record which feeds answered. Press Sync to refresh.',
};

export function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
