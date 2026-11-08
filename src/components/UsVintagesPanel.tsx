import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import type { AlfredReply } from '../utils/alfredVintages';

/**
 * Country Research > History & data > US data as first published (United States only): every
 * release of one month's or quarter's figure from ALFRED (src/utils/alfredVintages.ts), and the
 * figure as it was known on a chosen day. Needs the user's free FRED API key.
 */

type Reply = AlfredReply & { choices?: Array<{ id: string; label: string }> };
const SELECT = 'px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

export const UsVintagesPanel: React.FC = () => {
  const [series, setSeries] = useState('GDPC1');
  const [period, setPeriod] = useState('');
  const [asOf, setAsOf] = useState('');
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setError(null);
    const q = new URLSearchParams({ series, ...(period ? { period } : {}), ...(asOf ? { asOf } : {}) });
    fetch(`/api/us-vintages?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [series, period, asOf]);

  const label = (d: string) => (series === 'GDPC1' ? `${d.slice(0, 4)} Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}` : d.slice(0, 7));

  return (
    <section className="ui-panel" data-us-vintages="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('usv_title')}
        </h2>
        <p className="ui-label">{t('usv_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('usv_what'), error })}</p>}
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {reply && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              {t('usv_figure')}
              <select className={SELECT} value={series} onChange={(e) => { setSeries(e.target.value); setPeriod(''); }}>
                {(reply.choices || []).map((c) => (
                  <option key={c.id} value={c.id}>{tx(c.label)}</option>
                ))}
              </select>
            </label>
            {reply.ok && reply.periods && (
              <label className="flex items-center gap-1">
                {t('usv_period')}
                <select className={SELECT} value={reply.period} onChange={(e) => setPeriod(e.target.value)}>
                  {[...reply.periods].reverse().map((d) => (
                    <option key={d} value={d}>{label(d)}</option>
                  ))}
                </select>
              </label>
            )}
            {reply.ok && (
              <label className="flex items-center gap-1">
                {t('usv_knownOn')}
                <input type="date" className={SELECT} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              </label>
            )}
          </div>
        )}
        {reply && !reply.ok && <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">{t('c_missingReason', { reason: tx(reply.reason || '') })}</p>}
        {reply?.ok && (
          <>
            {reply.sentence && <p className="text-sm text-slate-900 dark:text-white" data-us-vintage-sentence="true">{tx(reply.sentence)}</p>}
            {reply.asOf && (
              <p className="text-sm text-slate-900 dark:text-white" data-us-vintage-asof="true">
                {reply.asOf.value === null ? t('usv_notYet', { day: reply.asOf.day, period: reply.periodLabel ?? '' }) : t('usv_was', { day: reply.asOf.day, period: reply.periodLabel ?? '', value: reply.asOf.value })}
              </p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('usv_publishedFrom')}</th>
                  <th className="py-1 font-medium text-right">{tx(reply.label || '')}, {reply.periodLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(reply.releases || []).map((r) => (
                  <tr key={r.day} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1 pr-3">{r.day}</td>
                    <td className="py-1 text-right tabular-nums">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('usv_note', { source: reply.source ?? '' })}</p>
          </>
        )}
      </div>
    </section>
  );
};
