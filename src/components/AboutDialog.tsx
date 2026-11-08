import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Info, X } from 'lucide-react';
import { REQUIRED_CREDITS } from '../data/requiredCredits';
import { SourceCredits } from './SourceCredits';
import { useT } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import { DATA_LICENCES, LICENCE_STATUS_LABEL, openLicenceQuestions, type LicenceStatus } from '../data/dataLicences';

/**
 * Menu > About & data licences: what the app is, the standing research notice, and the licence
 * register (src/data/dataLicences.ts, the same rows as docs/DATA_LICENCES.md). Opened on a source
 * with `focusId` from the Sources panel.
 */

export { OPEN_ABOUT_EVENT, openDataLicences } from './aboutOpen';

const STATUS_CLASS: Record<LicenceStatus, string> = {
  open: 'text-emerald-700 dark:text-emerald-400',
  conditions: 'text-blue-700 dark:text-blue-400',
  permission: 'text-amber-700 dark:text-amber-400',
  not_verified: 'text-slate-500 dark:text-slate-400',
};

export function AboutDialog({ focusId, onClose }: { focusId?: string | null; onClose: () => void }) {
  const t = useT(MENU);
  const [open, setOpen] = useState<string | null>(focusId ?? null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (focusId) document.getElementById(`licence-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const counts = DATA_LICENCES.reduce<Partial<Record<LicenceStatus, number>>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  const questions = openLicenceQuestions();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="about-title" className="ui-title inline-flex items-center gap-2">
            <Info className="w-4 h-4" aria-hidden /> {t('ab_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('ab_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto ui-body">
          <p>{t('ab_what')}</p>
          <p className="border border-amber-200 dark:border-amber-800 p-2 text-amber-800 dark:text-amber-300" data-research-notice>
            {t('ab_notice')}
          </p>
          <h3 className="ui-section-title">{t('ab_credits')}</h3>
          <p>{t('ab_creditsNote')}</p>
          <ul className="space-y-1" data-about-credits>
            {REQUIRED_CREDITS.map((c) => (
              <li key={c.id}>
                <SourceCredits credits={[c]} className="!text-sm !text-slate-700 dark:!text-slate-200" />
              </li>
            ))}
          </ul>
          <h3 className="ui-section-title">{t('ab_licences')}</h3>
          <p>
            {t('ab_licencesNote')}
            {t('ab_englishNote') !== "Each source's row stays in English because it quotes that source's own terms." && ` ${t('ab_englishNote')}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400" data-licence-counts>
            {(Object.keys(LICENCE_STATUS_LABEL) as LicenceStatus[])
              .filter((s) => counts[s])
              .map((s) => `${counts[s]} ${t(`ab_st_${s}`).toLowerCase()}`)
              .join(' · ')}
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {DATA_LICENCES.map((r) => (
              <li key={r.id} id={`licence-${r.id}`} className="py-2">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="w-full text-left flex items-start justify-between gap-3">
                  <span>
                    <span className="block">{r.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{r.usedFor}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${STATUS_CLASS[r.status]}`} title={t(`ab_sth_${r.status}`)}>
                    {t(`ab_st_${r.status}`)}
                  </span>
                </button>
                {open === r.id && (
                  <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <dt className="text-slate-500 dark:text-slate-400">{t('ab_freeSharing')}</dt>
                    <dd data-licence-share={r.share}>
                      {t(`ab_sh_${r.share}`)}. {r.shareNote}
                    </dd>
                    <dt className="text-slate-500 dark:text-slate-400">{t('ab_show')}</dt>
                    <dd>{r.display}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">{t('ab_commercial')}</dt>
                    <dd>{r.commercial}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">{t('ab_credit')}</dt>
                    <dd>{r.attribution}</dd>
                    {r.flag && (
                      <>
                        <dt className="text-slate-500 dark:text-slate-400">{t('ab_question')}</dt>
                        <dd>{r.flag}</dd>
                      </>
                    )}
                    {r.quotes.length > 0 && (
                      <>
                        <dt className="text-slate-500 dark:text-slate-400">{t('ab_fromTerms')}</dt>
                        <dd className="space-y-1">
                          {r.quotes.map((q) => (
                            <blockquote key={q} className="border-l-2 border-slate-200 dark:border-slate-700 pl-2 italic">
                              {q}
                            </blockquote>
                          ))}
                        </dd>
                      </>
                    )}
                    <dt className="text-slate-500 dark:text-slate-400">{t('ab_termsRead')}</dt>
                    <dd className="space-x-2">
                      {r.terms.map((term) => (
                        <a key={term.url} href={term.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline">
                          {term.label} <ExternalLink className="w-3 h-3" aria-hidden />
                        </a>
                      ))}
                      <span className="text-slate-400 dark:text-slate-500">{t('ab_checked', { date: r.checked })}</span>
                    </dd>
                  </dl>
                )}
              </li>
            ))}
          </ul>
          {questions.length > 0 && (
            <details>
              <summary className="cursor-pointer">{t('ab_questions', { n: questions.length })}</summary>
              <ol className="mt-1 list-decimal pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {questions.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.name}:</span> {r.flag}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
