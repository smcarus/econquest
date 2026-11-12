import { CDS_HIDDEN } from '../utils/cdsHidden';
import { ValidationBadge } from './ValidationBadge';
import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LiveWatchlistItem } from '../types/council';
import { QUALITY_LABEL, rankDivergences, type LastLook, type Quality } from '../utils/divergences';
import { formatPeriod } from '../utils/officialYields';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';

const QUALITY_CLASS: Record<Quality, string> = {
  live: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  estimate: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  sample: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
};

/**
 * Today > Where data and price disagree: one line per country, strongest gap first, with the two
 * figures behind it, what it could mean, the next official date and the change since last look.
 */
export const DivergenceList: React.FC<{
  items: LiveWatchlistItem[];
  lastLook?: LastLook | null;
  onOpenCountry: (item: LiveWatchlistItem) => void;
  limit?: number;
}> = ({ items, lastLook, onOpenCountry, limit = 8 }) => {
  const t = useT(TOOLS);
  const tx = useTx();
  const ranked = useMemo(() => rankDivergences(items, lastLook), [items, lastLook]);
  const shown = ranked.slice(0, limit);

  return (
    <section className="ui-panel" data-divergences="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title flex flex-wrap items-center gap-2">
          {t('dv_title')}
          <ValidationBadge id="divergence_rank" />
        </h3>
        <p className="ui-label">{t('dv_intro')}</p>
      </header>
      {shown.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t('dv_none')}</p>
      ) : (
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {shown.map((c, i) => {
            const item = items.find((it) => it.iso3 === c.iso3);
            return (
              <li key={c.iso3} data-divergence={c.iso3}>
                <button
                  type="button"
                  onClick={() => item && onOpenCountry(item)}
                  className="w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-slate-400">{i + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-900 dark:text-white">{c.countryName}</span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">{tx(c.top.label)}</span>
                      <span className={`px-1.5 py-0.5 text-xs border ${QUALITY_CLASS[c.top.quality]}`}>{tx(QUALITY_LABEL[c.top.quality])}</span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{tx(c.top.headline)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.top.evidence.map((e) => `${tx(e.text)} (${tx(e.source)})`).join(' · ')}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{tx(c.top.soWhat)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[
                        c.catalyst
                          ? t('dv_next', {
                              title: c.catalyst.title,
                              when: c.catalyst.legalDeadline ? t('dv_by', { date: formatPeriod(c.catalyst.date) }) : formatPeriod(c.catalyst.date),
                              days: c.catalyst.daysUntil === 0 ? t('dv_today') : c.catalyst.daysUntil === 1 ? t('dv_tomorrow') : t('dv_inDays', { n: c.catalyst.daysUntil }),
                            })
                          : t('dv_noDate'),
                        c.change && tx(c.change),
                        c.others.length ? t('dv_also', { list: c.others.map((o) => tx(o.label)).join(', ') }) : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {t('dv_rules')}
      </p>
    </section>
  );
};
