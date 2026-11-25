import React, { useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';
import { modLabel } from '../utils/shortcuts';

/** The list of keyboard shortcuts, opened with ? (src/utils/shortcuts.ts). */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT(SHELL);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const mod = modLabel(typeof navigator !== 'undefined' ? navigator.platform : '');
  const rows: [string, string][] = [
    ['/', t('kbAsk')],
    [`${mod}K`, t('kbTools')],
    [`${mod},`, t('kbSettings')],
    ['?', t('kbHelp')],
    ['Esc', t('kbClose')],
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="kb-title" className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl" data-shortcuts>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="kb-title" className="ui-title inline-flex items-center gap-2">
            <Keyboard className="w-4 h-4" aria-hidden /> {t('kbTitle')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('kbCloseAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <dl className="p-4 space-y-2 ui-body">
          {rows.map(([k, what]) => (
            <div key={k} className="flex items-baseline gap-3">
              <dt className="w-16 shrink-0">
                <kbd className="px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono">{k}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <p className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400">{t('kbNote')}</p>
      </div>
    </div>
  );
}
