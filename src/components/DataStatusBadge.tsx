import React from 'react';
import type { OpenDataSnapshot } from '../types/council';
import {
  DATA_MODE_HELP,
  DATA_MODE_LABEL,
  formatAsOf,
  getSnapshotDataStatus,
} from '../utils/dataStatus';
import { formatPeriod } from '../utils/officialYields';

const MODE_CLASS = {
  live: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  partial: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  sample: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  unverified: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
} as const;

const DOT_CLASS = {
  live: 'bg-emerald-500',
  partial: 'bg-amber-500',
  sample: 'bg-slate-400',
  unverified: 'bg-slate-400',
} as const;

/**
 * Tells the user, in one glance, whether the figures on screen are live, partly live,
 * built-in sample values, or AI estimates. Used on the country status bar.
 */
export const DataStatusBadge: React.FC<{ snapshot: OpenDataSnapshot }> = ({ snapshot }) => {
  const status = getSnapshotDataStatus(snapshot);
  const asOf = formatAsOf(status.asOf);
  const feedList = status.liveFeeds.length
    ? `\n\nFeeds that answered:\n• ${status.liveFeeds.join('\n• ')}`
    : '';
  const marketHelp =
    status.marketSource === 'ai_estimate'
      ? 'Policy rate, bond yields, CDS and rating are estimates from an AI web search (Gemini), not market prices. Check them against a market data terminal before trading.'
      : 'Policy rate, bond yields, CDS and rating are built-in sample values, not market prices.';

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        title={`${DATA_MODE_HELP[status.mode]}${feedList}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border ${MODE_CLASS[status.mode]}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[status.mode]}`} />
        <span>{DATA_MODE_LABEL[status.mode]}</span>
        {status.mode !== 'unverified' && asOf && (
          <span className="font-normal opacity-80">· as of {asOf}</span>
        )}
      </span>
      <span
        title={marketHelp}
        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border ${
          status.marketSource === 'ai_estimate' ? MODE_CLASS.partial : MODE_CLASS.sample
        }`}
      >
        Prices: {status.marketSource === 'ai_estimate' ? 'AI estimate' : 'sample'}
      </span>
      {status.yieldSource === 'official' && status.yieldPeriod && (
        <span
          title="The 10-year government bond yield is the official OECD monthly average, published on FRED. It is usually one to two months behind."
          className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border ${MODE_CLASS.live}`}
        >
          10Y yield: official, {formatPeriod(status.yieldPeriod)}
        </span>
      )}
    </span>
  );
};
