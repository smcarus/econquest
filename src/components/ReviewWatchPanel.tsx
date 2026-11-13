import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { WORKSPACE } from '../i18n/messages/workspace';
import { startPolicyReview } from '../utils/reviewHandoff';
import type { ReviewWatch, WatchStatus } from '../utils/reviewWatch';

/**
 * Policy review watch on Today (PC1, src/utils/reviewWatch.ts): the figures each policy review memo
 * said to watch, with their triggers checked against the latest saved pull. Shows nothing until a
 * memo names a figure with a trigger.
 */

type Row = ReviewWatch & { id: string; title: string; iso3: string };

const STATUS_KEY: Record<WatchStatus, 'rw_crossed' | 'rw_notCrossed' | 'rw_missing' | 'rw_cannotRead' | 'rw_noMatch' | 'rw_noPull'> = {
  crossed: 'rw_crossed',
  not_crossed: 'rw_notCrossed',
  missing: 'rw_missing',
  cannot_read: 'rw_cannotRead',
  no_match: 'rw_noMatch',
  no_pull: 'rw_noPull',
};

const ORDER: WatchStatus[] = ['crossed', 'cannot_read', 'no_match', 'missing', 'no_pull', 'not_crossed'];
const SHOW = 12;

export const ReviewWatchPanel: React.FC<{ countryName: (iso3: string) => string }> = ({ countryName }) => {
  const t = useT(WORKSPACE);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/reviews/watch')
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => live && setRows(Array.isArray(d?.reviews) ? d.reviews : []))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, []);

  if (!rows || !rows.length) return null;
  const items = rows
    .flatMap((r) => r.items.map((it) => ({ r, it })))
    .sort((a, b) => ORDER.indexOf(a.it.status) - ORDER.indexOf(b.it.status) || a.r.title.localeCompare(b.r.title));
  const crossed = items.filter((x) => x.it.status === 'crossed').length;
  const unread = items.some((x) => x.it.status === 'cannot_read');
  const shown = all ? items : items.slice(0, SHOW);

  return (
    <section className="ui-panel" data-review-watch="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rw_title')}
        </h2>
        <p className="ui-label">{t('rw_intro')}</p>
      </header>
      <div className="p-4 space-y-2">
        <p className={`text-sm ${crossed ? 'text-amber-700 dark:text-amber-400 font-medium' : ''}`} data-rw-crossed={String(crossed)}>
          {crossed ? t('rw_summary', { crossed, total: items.length }) : t('rw_noneCrossed')}
        </p>
        <ul className="text-xs space-y-1.5">
          {shown.map(({ r, it }, i) => (
            <li key={`${r.id}-${i}`} data-rw-status={it.status} className="flex flex-wrap items-baseline gap-x-2">
              <span className={`font-medium ${it.status === 'crossed' ? 'text-amber-700 dark:text-amber-400' : ''}`}>{t(STATUS_KEY[it.status])}</span>
              <span>
                {r.title} ({countryName(r.iso3)}): {it.indicator}, {t('rw_trigger', { trigger: it.trigger })}
                {it.now !== undefined && it.now !== null && (
                  <>
                    {'; '}
                    {it.then !== undefined && it.then !== null ? t('rw_values', { now: String(it.now), period: it.nowPeriod || '', then: String(it.then) }) : t('rw_valuesNow', { now: String(it.now), period: it.nowPeriod || '' })}
                  </>
                )}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{r.pullDate ? t('rw_dates', { date: r.reviewDate, pull: r.pullDate }) : t('rw_datesNoPull', { date: r.reviewDate })}</span>
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => startPolicyReview({ openId: r.id })} data-rw-open={r.id}>
                {t('rw_open')}
              </button>
            </li>
          ))}
        </ul>
        {items.length > SHOW && !all && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setAll(true)}>
            {t('rw_more', { n: items.length - SHOW })}
          </button>
        )}
        {unread && <p className="text-xs text-slate-500 dark:text-slate-400">{t('rw_wording')}</p>}
      </div>
    </section>
  );
};
