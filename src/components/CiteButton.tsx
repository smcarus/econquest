import React, { useMemo, useState } from 'react';
import { Copy, Download, Quote, X } from 'lucide-react';
import { citation, citationFileStem, type CiteKind } from '../utils/citation';
import { useT } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';

type Form = 'text' | 'bibtex' | 'ris';

/**
 * "Cite" (data plan G11): opens a small panel with a citation for a chart, table or council answer
 * in plain text, BibTeX and RIS (src/utils/citation.ts), to copy or download. Built only when opened.
 */
export const CiteButton: React.FC<{
  kind: CiteKind;
  title: string;
  sources: Array<string | undefined>;
  asOf?: string;
  className?: string;
  disabled?: boolean;
}> = ({ kind, title, sources, asOf, className, disabled }) => {
  const [open, setOpen] = useState(false);
  const t = useT(SHELL);
  return (
    <>
      <button
        type="button"
        className={className ?? 'ui-btn ui-btn-ghost'}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={t('citeTitle')}
        data-cite-button={kind}
      >
        <Quote className="w-3.5 h-3.5" /> {t('cite')}
      </button>
      {open && <CitePanel kind={kind} title={title} sources={sources} asOf={asOf} onClose={() => setOpen(false)} />}
    </>
  );
};

const CitePanel: React.FC<{ kind: CiteKind; title: string; sources: Array<string | undefined>; asOf?: string; onClose: () => void }> = ({ kind, title, sources, asOf, onClose }) => {
  const t = useT(SHELL);
  const [form, setForm] = useState<Form>('text');
  const [copied, setCopied] = useState(false);
  const c = useMemo(() => citation({ kind, title, sources, asOf, accessed: new Date().toISOString().slice(0, 10) }), [kind, title, sources, asOf]);
  const body = form === 'text' ? c.text : form === 'bibtex' ? c.bibtex : c.ris;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const ext = form === 'text' ? 'txt' : form === 'bibtex' ? 'bib' : 'ris';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: form === 'ris' ? 'application/x-research-info-systems' : 'text/plain;charset=utf-8' }));
    a.download = `${citationFileStem(title)}.${ext}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const forms: Array<[Form, string]> = [['text', t('citePlain')], ['bibtex', 'BibTeX'], ['ris', 'RIS']];
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-2 sm:p-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('citeHeading')} onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-3" onClick={(e) => e.stopPropagation()} data-cite-panel="true">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="ui-label">{t('citeHeading')}</div>
            <h2 className="ui-section-title truncate">{title}</h2>
          </div>
          <button type="button" className="ui-btn" onClick={onClose} aria-label={t('citeClose')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist">
          {forms.map(([f, label]) => (
            <button key={f} type="button" role="tab" className="ui-pill" aria-pressed={form === f} aria-selected={form === f} onClick={() => setForm(f)} data-cite-form={f}>
              {label}
            </button>
          ))}
        </div>
        <textarea readOnly value={body} className="w-full h-56 font-mono text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-2" data-cite-body={form} />
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="ui-btn" onClick={() => void copy()}>
            <Copy className="w-3.5 h-3.5" /> {copied ? t('citeCopied') : t('citeCopy')}
          </button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={download}>
            <Download className="w-3.5 h-3.5" /> {t('citeDownload')}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('citeNote')}</p>
      </div>
    </div>
  );
};
