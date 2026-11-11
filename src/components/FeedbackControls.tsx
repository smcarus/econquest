import React, { useState } from 'react';
import { Flag, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FeedbackAnswer, FeedbackFigure } from '../utils/feedback';
import { useT } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';

/**
 * Flag a figure or an answer (roadmap P2) and rate an answer (P3). Both save on this computer only
 * (data/local/feedback.jsonl, src/utils/feedback.ts). A flag then offers a GitHub issue link the
 * person opens and sends themselves.
 */
async function send(body: unknown): Promise<{ issueUrl?: string; error?: string }> {
  try {
    const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { issueUrl: j.issueUrl } : { error: j.error || `HTTP ${r.status}` };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}

export const FlagButton: React.FC<{ target: 'figure' | 'answer'; figure?: FeedbackFigure; answer?: FeedbackAnswer; className?: string; compact?: boolean }> = ({ target, figure, answer, className, compact }) => {
  const t = useT(SHELL);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ issueUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    const out = await send({ kind: 'flag', target, note, figure, answer });
    setBusy(false);
    if (out.error) setError(out.error);
    else setDone({ issueUrl: out.issueUrl });
  };
  return (
    <span className="inline-block align-top" data-feedback-flag={target}>
      <button type="button" className={className ?? 'ui-btn ui-btn-ghost'} title={t('fbFlagTitle')} aria-label={t('fbFlagTitle')} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Flag className="w-3.5 h-3.5" aria-hidden /> {compact ? null : t('fbFlag')}
      </button>
      {open && (
        <span className="block mt-1 p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5 text-xs min-w-[16rem] max-w-md" data-feedback-panel>
          {done ? (
            <>
              <span className="block text-slate-700 dark:text-slate-300">{t('fbSaved')}</span>
              {done.issueUrl && (
                <a className="ui-btn inline-flex" href={done.issueUrl} target="_blank" rel="noopener noreferrer" data-feedback-issue>
                  {t('fbIssue')}
                </a>
              )}
              <span className="block text-slate-500 dark:text-slate-400">{t('fbIssueNote')}</span>
            </>
          ) : (
            <>
              <label className="block ui-label">
                {t('fbFlagHeading')}
                <textarea className="mt-1 w-full h-16 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1 text-xs" value={note} maxLength={1000} placeholder={t('fbFlagPlaceholder')} onChange={(e) => setNote(e.target.value)} />
              </label>
              {error && <span className="block text-rose-600 dark:text-rose-400">{error}</span>}
              <span className="flex gap-1.5">
                <button type="button" className="ui-btn ui-btn-primary" disabled={busy || note.trim().length < 3} onClick={() => void save()}>
                  {t('fbSave')}
                </button>
                <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>
                  {t('fbCancel')}
                </button>
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
};

export const RateAnswer: React.FC<{ answer: FeedbackAnswer; disabled?: boolean }> = ({ answer, disabled }) => {
  const t = useT(SHELL);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (r: 'up' | 'down', why: string) => {
    setError(null);
    const out = await send({ kind: 'rating', target: 'answer', rating: r, note: why, answer });
    if (out.error) setError(out.error);
    else setSaved(true);
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={t('fbRateTitle')} data-feedback-rate>
      {(['up', 'down'] as const).map((r) => (
        <button
          key={r}
          type="button"
          className="ui-btn ui-btn-ghost"
          aria-pressed={rating === r}
          aria-label={t(r === 'up' ? 'fbUp' : 'fbDown')}
          title={t(r === 'up' ? 'fbUp' : 'fbDown')}
          disabled={disabled}
          onClick={() => {
            setRating(r);
            setSaved(false);
            void save(r, reason);
          }}
          data-feedback-rating={r}
        >
          {r === 'up' ? <ThumbsUp className="w-3.5 h-3.5" aria-hidden /> : <ThumbsDown className="w-3.5 h-3.5" aria-hidden />}
        </button>
      ))}
      {rating && (
        <span className="inline-flex items-center gap-1">
          <input className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-1 py-0.5 text-xs w-48" value={reason} maxLength={1000} placeholder={t('fbReason')} onChange={(e) => setReason(e.target.value)} onBlur={() => reason.trim() && void save(rating, reason)} />
          {saved && <span className="text-xs text-slate-500 dark:text-slate-400">{t('fbThanks')}</span>}
        </span>
      )}
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </span>
  );
};
