/**
 * Draft -> Reviewed -> Approved on a saved council conversation (Reports > Saved research).
 * Each step records a name and the report's content hash on the server (src/utils/signoff.ts).
 */
import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { SignOffStatus, SignOffStep, SignOffView } from '../utils/signoff';
import { useT } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

const LABEL = { draft: 'so_draft', reviewed: 'so_reviewed', approved: 'so_approved', changed: 'so_changed' } as const;
const TONE: Record<SignOffStatus, string> = { draft: '', reviewed: 'ui-badge-accent', approved: 'ui-badge-positive', changed: 'ui-badge-warning' };
const NAME_KEY = 'econquest.signoffName.v1';

/** Keyed "brief:<id>" or "review:<id>". */
let cache: Record<string, SignOffView> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(v: Record<string, SignOffView> | null) => void>();

function reload(): Promise<void> {
  loading = fetch('/api/signoffs')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j?.briefs) {
        const next: Record<string, SignOffView> = {};
        for (const [id, v] of Object.entries(j.briefs as Record<string, SignOffView>)) next[`brief:${id}`] = v;
        for (const [id, v] of Object.entries((j.reviews || {}) as Record<string, SignOffView>)) next[`review:${id}`] = v;
        cache = next;
      }
      listeners.forEach((l) => l(cache));
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

function useSignOffs() {
  const [v, setV] = useState(cache);
  useEffect(() => {
    listeners.add(setV);
    if (!loading) void reload();
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
};

export function SignOffControl({ briefId, kind = 'brief' }: { briefId: string; kind?: 'brief' | 'review' }) {
  const all = useSignOffs();
  const view = all?.[`${kind}:${briefId}`];
  const status: SignOffStatus = view?.status ?? 'draft';
  const [pending, setPending] = useState<SignOffStep | null>(null);
  const [name, setName] = useState(readName);
  const [error, setError] = useState('');
  const t = useT(CHAT);

  const sign = async () => {
    if (!pending) return;
    setError('');
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* not remembered: fine */
    }
    try {
      const r = await fetch(`/api/signoffs/${kind}/${encodeURIComponent(briefId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: pending, by: name }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setPending(null);
      await reload();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const who =
    status === 'approved'
      ? `${t('so_by', { name: view?.approvedBy ?? '' })}${view?.selfApproved ? t('so_self') : view?.reviewedBy ? t('so_reviewedBy', { name: view.reviewedBy }) : ''}`
      : status === 'reviewed'
      ? t('so_by', { name: view?.reviewedBy ?? '' })
      : status === 'changed'
      ? t('so_again')
      : '';
  const steps: Array<{ step: SignOffStep; label: string }> =
    status === 'draft' || status === 'changed'
      ? [{ step: 'reviewed', label: t('so_markReviewed') }]
      : status === 'reviewed'
      ? [
          { step: 'approved', label: t('so_approve') },
          { step: 'withdrawn', label: t('so_withdraw') },
        ]
      : [{ step: 'withdrawn', label: t('so_withdrawApproval') }];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" data-signoff={status}>
      <span className={`ui-badge ${TONE[status]} font-normal`} title={view ? t('so_hash', { hash: view.contentHash }) : undefined}>
        <BadgeCheck className="w-3 h-3" aria-hidden />
        {t(LABEL[status])}
        {who}
      </span>
      {!pending &&
        steps.map((s) => (
          <button key={s.step} type="button" className="ui-btn ui-btn-ghost" onClick={() => setPending(s.step)}>
            {s.label}
          </button>
        ))}
      {pending && (
        <span className="inline-flex flex-wrap items-center gap-1">
          <label className="sr-only" htmlFor={`signoff-name-${kind}-${briefId}`}>
            {t('so_name')}
          </label>
          <input
            id={`signoff-name-${kind}-${briefId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void sign()}
            placeholder={t('so_name')}
            className="px-2 py-1 text-xs w-36 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            autoFocus
          />
          <button type="button" className="ui-btn ui-btn-primary" disabled={!name.trim()} onClick={() => void sign()}>
            {pending === 'withdrawn' ? t('so_signWithdraw') : pending === 'approved' ? t('so_signApproved') : t('so_signReviewed')}
          </button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setPending(null)}>
            {t('so_cancel')}
          </button>
        </span>
      )}
      {error && <span className="text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}

/** Refresh every sign-off badge (after a report is saved over or deleted). */
export const refreshSignOffs = reload;
