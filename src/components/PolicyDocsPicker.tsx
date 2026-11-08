import React, { useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { MAX_DOCS, MAX_DOC_CHARS, docTitle, type PolicyDoc } from '../utils/policyDocs';
import { readDocumentFile } from '../utils/readDocument';
import { useT } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

const newId = () => Math.random().toString(36).slice(2, 10);
const words = (t: string) => (t.match(/\S+/g) || []).length;

/** Add policy documents (PDF, text or pasted) for the Policy Document Agent. They stay in this browser tab. */
export function PolicyDocsPicker({ docs, onChange, disabled }: { docs: PolicyDoc[]; onChange: (d: PolicyDoc[]) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const full = docs.length >= MAX_DOCS;
  const t = useT(CHAT);

  const add = (d: Omit<PolicyDoc, 'id' | 'addedAt'>, current: PolicyDoc[]) => [...current, { ...d, id: newId(), addedAt: new Date().toISOString() }];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setNote('');
    let next = docs;
    const problems: string[] = [];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_DOCS) {
        problems.push(t('pd_max', { name: f.name, n: MAX_DOCS }));
        break;
      }
      try {
        const { text, pages } = await readDocumentFile(f);
        if (words(text) < 20) problems.push(t('pd_noText', { name: f.name }));
        else next = add({ title: docTitle(f.name), text, pages }, next);
      } catch (e: any) {
        problems.push(t('pd_unreadable', { name: f.name, why: e?.message || t('pd_unknown') }));
      }
    }
    onChange(next);
    setNote(problems.join('. '));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-1.5" data-policy-docs="true">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ui-label">{t('pd_title')}</span>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} data-policy-docs-input="true" />
        <button type="button" className="ui-btn" disabled={disabled || busy || full} onClick={() => fileRef.current?.click()}>
          <FileText className="w-3.5 h-3.5" /> {busy ? t('pd_reading') : t('pd_add')}
        </button>
        <button type="button" className="ui-btn" disabled={disabled || full} onClick={() => setPasting((p) => !p)}>
          {t('pd_paste')}
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('pd_kept')}</span>
      </div>

      {pasting && (
        <div className="space-y-1.5 border border-slate-200 dark:border-slate-700 p-2">
          <input
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder={t('pd_titlePh')}
            maxLength={120}
            className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value.slice(0, MAX_DOC_CHARS))}
            rows={4}
            placeholder={t('pd_textPh')}
            className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={words(pasteText) < 20 || full}
            onClick={() => {
              onChange(add({ title: pasteTitle.trim() || t('pd_pasted'), text: pasteText }, docs));
              setPasteText('');
              setPasteTitle('');
              setPasting(false);
            }}
          >
            {t('pd_addBtn')}
          </button>
        </div>
      )}

      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {docs.map((d) => (
            <li key={d.id} className="ui-pill flex items-center gap-1" data-policy-doc={d.title}>
              <span>
                {d.title} <span className="text-slate-500 dark:text-slate-400">({d.pages ? (d.pages === 1 ? t('pd_page1') : t('pd_pages', { n: d.pages })) : ''}{t('pd_words', { n: words(d.text).toLocaleString() })})</span>
              </span>
              <button type="button" aria-label={t('pd_remove', { title: d.title })} onClick={() => onChange(docs.filter((x) => x.id !== d.id))} className="hover:text-rose-700">
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="text-xs text-amber-700 dark:text-amber-400">{note}</p>}
    </div>
  );
}
