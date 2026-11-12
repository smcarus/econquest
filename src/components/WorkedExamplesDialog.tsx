import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download, ListChecks, X } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import type { OpenDataSnapshot } from '../types/council';
import type { ToolTarget } from '../data/toolsCatalog';
import { WORKED_EXAMPLES, WORKED_MISSING, lineText, memoDraft, workedFigures, workedLines, type WorkedExampleId } from '../utils/workedExamples';

/**
 * Menu > Worked examples (W1, src/utils/workedExamples.ts): four guided case studies for the open
 * country. Figures come from the country's saved snapshot (live ones only); "Open this screen"
 * closes the dialog and goes to the screen the step names.
 */
export function WorkedExamplesDialog({
  countryName,
  snapshot,
  onOpenScreen,
  onClose,
}: {
  countryName: string;
  snapshot: OpenDataSnapshot | null | undefined;
  onOpenScreen: (target: ToolTarget) => void;
  onClose: () => void;
}) {
  const t = useT(MENU);
  const tx = useTx();
  const [openId, setOpenId] = useState<WorkedExampleId | null>(null);
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => setCopied(null), [openId]);

  const example = WORKED_EXAMPLES.find((e) => e.id === openId) || null;
  const figures = useMemo(() => (example ? workedFigures(example, snapshot) : []), [example, snapshot]);
  const lines = useMemo(() => (example ? workedLines(example, figures) : []), [example, figures]);
  const today = new Date().toISOString().slice(0, 10);
  const memo = example ? memoDraft(example, countryName, figures, lines, today, tx) : '';

  const copy = () => {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(memo))
      .then(() => setCopied('yes'))
      .catch(() => setCopied('failed'));
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([memo], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `econquest-${example?.id}-${(snapshot?.iso3 || 'country').toLowerCase()}-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="worked-title" data-worked-examples className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="worked-title" className="ui-title inline-flex items-center gap-2">
            <ListChecks className="w-4 h-4" aria-hidden /> {example ? `${tx(example.title)}: ${countryName}` : t('we_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('we_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto ui-body">
          {!example && (
            <>
              <p>{t('we_intro', { country: countryName })}</p>
              <p className="text-slate-500 dark:text-slate-400">{t('we_otherCountry')}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {WORKED_EXAMPLES.map((e) => (
                  <li key={e.id}>
                    <button type="button" data-worked-open={e.id} onClick={() => setOpenId(e.id)} className="w-full h-full text-left border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className="block font-semibold text-slate-900 dark:text-white">{tx(e.title)}</span>
                      <span className="block mt-1">{tx(e.question)}</span>
                      <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">{t('we_learn', { text: tx(e.learn) })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {example && (
            <div data-worked-example={example.id} className="space-y-3">
              <button type="button" onClick={() => setOpenId(null)} className="ui-btn ui-btn-ghost inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t('we_back')}
              </button>
              <p className="font-semibold text-slate-900 dark:text-white">{tx(example.question)}</p>
              <h3 className="ui-section-title">{t('we_figures', { country: countryName })}</h3>
              <table className="w-full text-xs">
                <tbody>
                  {figures.map((f) => (
                    <tr key={f.path} data-worked-figure={f.path} data-live={f.value !== undefined ? 'true' : 'false'} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-2">{tx(f.label)}</td>
                      {f.value !== undefined ? (
                        <td className="py-1 tabular-nums text-slate-900 dark:text-white">
                          {f.value.toFixed(1)} {tx(f.unit)}
                          {(f.source || f.when) && <span className="ml-1 text-slate-500 dark:text-slate-400">({[f.source, f.when].filter(Boolean).join(', ')})</span>}
                        </td>
                      ) : (
                        <td className="py-1 text-amber-700 dark:text-amber-400">{tx(WORKED_MISSING)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="ui-section-title">{t('we_working')}</h3>
              <ul className="space-y-1 text-xs" data-worked-working>
                {lines.map((l) => (
                  <li key={l.label} data-worked-line={l.value !== undefined ? 'worked' : 'needs'}>
                    <span className="font-semibold">{tx(l.label)}:</span> {lineText(l, tx)}
                  </li>
                ))}
              </ul>
              <h3 className="ui-section-title">{t('we_steps')}</h3>
              <ol className="space-y-3 list-decimal pl-5">
                {example.steps.map((s) => (
                  <li key={s.title} className="space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{tx(s.title)}</p>
                    <p>{tx(s.text)}</p>
                    {s.where && <p className="text-xs text-slate-500 dark:text-slate-400">{t('we_where', { where: tx(s.where) })}</p>}
                    {s.target && (
                      <button type="button" className="ui-btn" data-worked-screen={s.where} onClick={() => onOpenScreen(s.target as ToolTarget)}>
                        {t('we_open')}
                      </button>
                    )}
                    {s.ask && <p className="text-blue-800 dark:text-blue-300">{t('we_ask', { ask: tx(s.ask) })}</p>}
                  </li>
                ))}
              </ol>
              <h3 className="ui-section-title">{t('we_memo')}</h3>
              <textarea readOnly value={memo} rows={14} aria-label={t('we_memo')} data-worked-memo className="w-full font-mono text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="ui-btn inline-flex items-center gap-1" onClick={copy}>
                  <Copy className="w-3.5 h-3.5" aria-hidden /> {copied === 'yes' ? t('we_copied') : t('we_copy')}
                </button>
                <button type="button" className="ui-btn inline-flex items-center gap-1" onClick={download}>
                  <Download className="w-3.5 h-3.5" aria-hidden /> {t('we_download')}
                </button>
                {copied === 'failed' && <span className="text-xs text-amber-700 dark:text-amber-400">{t('we_copyFailed')}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
