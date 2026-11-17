import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { WbProjectsProfile } from '../utils/wbProjects';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > World Bank projects (R5, src/utils/wbProjects.ts): active
 * World Bank projects with the amount committed, the share of each project's life gone and, for IDA
 * credits and grants, the share paid out. From the weekly saved copy of the World Bank's own lists.
 */

type Reply = WbProjectsProfile & { iso3: string; sentence: string };

const SHOWN = 15;

const mUsd = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));

export const WbProjectsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    setAll(false);
    fetch(`/api/wb-projects/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const has = reply && !reply.missing && reply.rows.length > 0;
  const rows = reply ? (all ? reply.rows : reply.rows.slice(0, SHOWN)) : [];
  const bn = (m: number) => (m >= 1000 ? t('rm_bn', { v: (m / 1000).toFixed(1) }) : t('rm_m', { v: String(Math.round(m)) }));

  return (
    <section className="ui-panel" data-wb-projects="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('wp_title', { country: countryName })}
          <ValidationBadge id="wb_projects" />
          {has && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `World Bank projects, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: reply!.asOf || '',
                  iso3,
                  countryName,
                  detail: [reply!.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('wp_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('wp_what'), error })}</p>}
        {reply?.missing && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.missing) })}
          </p>
        )}
        {has && (
          <>
            <p className="ui-body" data-wp-summary={String(reply!.count)}>
              {t('wp_summary', { n: String(reply!.count), date: reply!.asOf || '' })}
              {reply!.committed !== undefined && ` ${t('wp_committed', { usd: bn(reply!.committed) })}`}
            </p>
            {reply!.idaPaidOut !== undefined && reply!.idaStillToPay !== undefined ? (
              <p className="text-sm" data-wp-ida="true">
                {t('wp_ida', { paid: bn(reply!.idaPaidOut), left: bn(reply!.idaStillToPay) })}
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-wp-ida-missing="true">
                {t('c_missingReason', { reason: tx(reply!.paidOutMissing || '') })}
              </p>
            )}
            {reply!.slowCount > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400" data-wp-slow={String(reply!.slowCount)}>
                {t('wp_slowCount', { n: String(reply!.slowCount) })}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-wp-table="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('wp_tProject')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('wp_tCommitted')}</th>
                    <th className="py-1 pr-3 font-medium">{t('wp_tDates')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('wp_tTime')}</th>
                    <th className="py-1 font-medium text-right">{t('wp_tPaid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 align-top" data-wp-row={r.id}>
                      <td className="py-0.5 pr-3">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                            {r.name}
                          </a>
                        ) : (
                          r.name
                        )}
                        <span className="text-slate-500 dark:text-slate-400"> {r.id}</span>
                        {r.regional && <span className="text-slate-500 dark:text-slate-400"> · {t('wp_regional')}</span>}
                        {r.slow && <span className="text-amber-700 dark:text-amber-400"> · {t('wp_slow')}</span>}
                      </td>
                      <td className="py-0.5 pr-3 text-right">{r.commitment !== undefined ? mUsd(r.commitment) : '–'}</td>
                      <td className="py-0.5 pr-3 whitespace-nowrap">
                        {r.approved || '?'} – {r.closing || '?'}
                      </td>
                      <td className="py-0.5 pr-3 text-right">{r.timeGonePct !== undefined ? `${r.timeGonePct.toFixed(0)}%` : '–'}</td>
                      <td className="py-0.5 text-right">{r.paidOutPct !== undefined ? `${r.paidOutPct.toFixed(0)}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reply!.rows.length > SHOWN && (
              <button type="button" className="ui-btn text-xs" onClick={() => setAll((v) => !v)} data-wp-more="true">
                {all ? t('wp_fewer') : t('wp_all', { n: String(reply!.rows.length) })}
              </button>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('wp_note')}</p>
          </>
        )}
        {reply && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('wp_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
      </div>
    </section>
  );
};
