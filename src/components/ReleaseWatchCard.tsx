import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import type { WatchRow } from '../utils/releaseWatch';

/**
 * Today and Data health > Calendar: Release days (CG3, src/utils/releaseWatch.ts). CPI and monthly
 * activity releases from yesterday to a week on, and whether the app's source has the new month yet.
 * Loads on its own.
 */
export const ReleaseWatchCard: React.FC<{ countryName?: (iso3: string) => string }> = ({ countryName }) => {
  const [data, setData] = useState<{ rows: WatchRow[]; off: boolean } | null>(null);
  const t = useT(PANELS);
  const tx = useTx();
  useEffect(() => {
    let live = true;
    fetch('/api/release-watch')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => live && setData(b ?? { rows: [], off: false }))
      .catch(() => live && setData({ rows: [], off: false }));
    return () => {
      live = false;
    };
  }, []);
  if (!data) return null;
  const name = (iso3: string) => countryName?.(iso3) || iso3;
  const status = (r: WatchRow) => {
    if (r.status === 'arrived' && r.arrived) return <span className="text-emerald-700 dark:text-emerald-400">{t('rw_arrived', { period: r.arrived.period })}</span>;
    if (r.status === 'waiting') return <span>{t('rw_waiting', { n: r.checks })}</span>;
    if (r.status === 'no_new_month') return <span className="text-amber-700 dark:text-amber-400" data-missing="true">{t('rw_noNewMonth')}{r.sources.includes('imf_cpi') ? ` ${t('rw_imfLag')}` : ''}</span>;
    if (r.status === 'not_rechecked') return <span className="text-slate-500 dark:text-slate-400">{t('rw_notRechecked')}</span>;
    return <span className="text-slate-500 dark:text-slate-400">{t('rw_coming')}</span>;
  };
  return (
    <section className="ui-panel" data-release-watch="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rw_title')}
        </h2>
        <p className="ui-label">{t('rw_intro')}</p>
      </header>
      <div className="p-3 text-sm space-y-1">
        {data.off && <p className="text-xs text-amber-700 dark:text-amber-400">{t('rw_off')}</p>}
        {!data.rows.length ? (
          <p className="text-slate-600 dark:text-slate-300">{t('rw_none')}</p>
        ) : (
          <ul className="space-y-1">
            {data.rows.map((r) => (
              <li key={`${r.iso3}-${r.category}-${r.date}`} className="flex flex-wrap justify-between gap-x-3">
                <span>
                  <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">{r.date}</span> {name(r.iso3)}: {tx(r.title)}
                </span>
                <span className="text-xs">{status(r)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
