/**
 * Menu > Models & validation: the register of every rule that turns figures into a call, with its
 * status. A status other than Not validated / Descriptive / Model-assisted comes only from a
 * pre-registered backtest. See src/data/modelRegister.ts.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, ShieldQuestion, X } from 'lucide-react';
import { MODEL_REGISTER, REGISTER_HEADER, registerRows, STATUS_LABEL, type ValidationStatus } from '../data/modelRegister';
import { ValidationBadge } from './ValidationBadge';

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function downloadCsv() {
  const text = '﻿' + [REGISTER_HEADER, ...registerRows()].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `econquest-model-register-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ModelRegisterDialog({ focusId, onClose }: { focusId?: string | null; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(focusId ?? null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (focusId) document.getElementById(`register-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const counts = MODEL_REGISTER.reduce<Partial<Record<ValidationStatus, number>>>((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {});

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="model-register-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="model-register-title" className="ui-title inline-flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4" aria-hidden /> Models & validation
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close models and validation" className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto ui-body">
          <p>
            Every rule in the app that turns figures into a call. A rule is marked passed or failed only by a backtest
            whose pass mark was fixed before it ran. Until then it reads Not validated, wherever it shows.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400" data-register-counts>
            {(Object.keys(STATUS_LABEL) as ValidationStatus[])
              .filter((s) => counts[s])
              .map((s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`)
              .join(' · ')}
          </p>
          <div>
            <button type="button" onClick={downloadCsv} className="ui-btn ui-btn-ghost inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" aria-hidden /> CSV
            </button>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {MODEL_REGISTER.map((e) => (
              <li key={e.id} id={`register-${e.id}`} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id} className="text-left">
                    <span className="block">{e.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {e.use} · {e.says}
                    </span>
                  </button>
                  <ValidationBadge id={e.id} />
                </div>
                {open === e.id && (
                  <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <dt className="text-slate-500 dark:text-slate-400">Rule</dt>
                    <dd>{e.method}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Reads</dt>
                    <dd>{e.inputs}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Shows in</dt>
                    <dd>{e.where}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">How it is tested</dt>
                    <dd>{e.testPlan}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Limits</dt>
                    <dd>{e.limits}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Code</dt>
                    <dd className="break-all">{e.code}</dd>
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
