import React, { useState } from 'react';
import { Download, Send } from 'lucide-react';
import { ACT_ANSWERS, ACT_LABEL, CONSENTS, CONSENT_LABEL, SCALE_LABEL, SOURCES_ANSWERS, SOURCES_LABEL, tallyExpert, type ActAnswer, type Consent, type SourcesAnswer } from '../utils/expertReview';
import type { PolicyReview, ReviewStep, StepState } from '../utils/policyReview';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Expert review (roadmap P4): the short form a pilot economist or professor fills
 * for the memo, and the reviews already saved, with the reviewer's choice about publication.
 * See src/utils/expertReview.ts.
 */

const INPUT = 'w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
type Form = { reviewer: string; role: string; clarity: number; evidence: number; sources: SourcesAnswer | ''; wouldAct: ActAnswer | ''; comment: string; consent: Consent | '' };
const EMPTY: Form = { reviewer: '', role: '', clarity: 0, evidence: 0, sources: '', wouldAct: '', comment: '', consent: '' };

async function send<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || `The app answered ${res.status}.`);
  return j as T;
}

const Scale: React.FC<{ name: string; value: number; onChange: (n: number) => void; tx: (s: string) => string }> = ({ name, value, onChange, tx }) => (
  <div className="flex flex-wrap gap-2" role="radiogroup">
    {[1, 2, 3, 4, 5].map((n) => (
      <label key={n} className="text-xs flex items-center gap-1 text-slate-700 dark:text-slate-300">
        <input type="radio" name={name} checked={value === n} onChange={() => onChange(n)} /> {n} {tx(SCALE_LABEL[n])}
      </label>
    ))}
  </div>
);

export const ExpertReviewForm: React.FC<{
  review: PolicyReview;
  memoState: StepState;
  changed?: string[];
  onSaved: (out: { review: PolicyReview; states: Record<ReviewStep, StepState> }) => Promise<void>;
}> = ({ review, memoState, changed = [], onSaved }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const [f, setF] = useState<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = review.expertReviews ?? [];
  const memoHash = review.steps.memo?.hash;
  const tally = tallyExpert(list);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const id = (s: string) => `xr-${review.id}-${s}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSaved(await send(`/api/reviews/${encodeURIComponent(review.id)}/expert-reviews`, 'POST', f));
      setF(EMPTY);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const consent = async (xid: string, c: Consent) => {
    setError('');
    try {
      await onSaved(await send(`/api/reviews/${encodeURIComponent(review.id)}/expert-reviews/${encodeURIComponent(xid)}/consent`, 'PUT', { consent: c }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-3" data-expert-review="true">
      {memoState !== 'done' && <p className="text-xs text-slate-500 dark:text-slate-400">{t('xr_memoFirst')}</p>}
      {list.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-700 dark:text-slate-300">
            {t('xr_tally', { n: String(tally.reviews), clarity: String(tally.meanClarity ?? '-'), evidence: String(tally.meanEvidence ?? '-'), consenting: String(tally.consenting) })}
          </p>
          {list.map((x) => (
            <div key={x.id} className="border-t border-slate-200 dark:border-slate-700 pt-2 text-xs space-y-1" data-expert-row={x.id}>
              <p className="text-slate-800 dark:text-slate-200">
                <span className="font-semibold">{x.reviewer}</span>, {x.role}. {x.savedAt.slice(0, 16).replace('T', ' ')}
                {x.memoHash !== memoHash && <span className="ui-badge ui-badge-warning ml-2">{t('xr_olderMemo')}</span>}
                {changed.includes(x.id) && <span className="ui-badge ui-badge-warning ml-2">{t('xr_changed')}</span>}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                {t('xr_rowScores', { clarity: String(x.clarity), evidence: String(x.evidence) })} {t('xr_sources')}: {tx(SOURCES_LABEL[x.sources])}. {t('xr_act')}: {tx(ACT_LABEL[x.wouldAct])}.
              </p>
              {x.comment && <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{x.comment}</p>}
              <label className="ui-label flex flex-wrap items-center gap-2">
                {t('xr_consent')}
                <select className="px-1.5 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" value={x.consent} onChange={(e) => consent(x.id, e.target.value as Consent)}>
                  {CONSENTS.map((c) => (
                    <option key={c} value={c}>
                      {tx(CONSENT_LABEL[c])}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-slate-500 dark:text-slate-400">
                {t('xr_hash')} <span className="font-code">{x.hash.slice(0, 12)}</span>
              </p>
            </div>
          ))}
          <a className="ui-btn" href="/api/expert-reviews.csv" download>
            <Download className="w-3.5 h-3.5" /> {t('xr_csv')}
          </a>
        </div>
      )}
      {memoState === 'done' && !open && (
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => setOpen(true)}>
          {t('xr_start')}
        </button>
      )}
      {memoState === 'done' && open && (
        <form className="space-y-3 border border-slate-200 dark:border-slate-700 p-3" onSubmit={submit} data-expert-form="true">
          <p className="ui-label">{t('xr_formNote')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="ui-label" htmlFor={id('name')}>
              {t('xr_name')}
              <input id={id('name')} className={INPUT} value={f.reviewer} maxLength={80} onChange={(e) => set({ reviewer: e.target.value })} />
            </label>
            <label className="ui-label" htmlFor={id('role')}>
              {t('xr_role')}
              <input id={id('role')} className={INPUT} value={f.role} maxLength={120} onChange={(e) => set({ role: e.target.value })} />
            </label>
          </div>
          <fieldset className="space-y-1">
            <legend className="ui-label">{t('xr_clarity')}</legend>
            <Scale name={id('clarity')} value={f.clarity} onChange={(n) => set({ clarity: n })} tx={tx} />
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="ui-label">{t('xr_evidence')}</legend>
            <Scale name={id('evidence')} value={f.evidence} onChange={(n) => set({ evidence: n })} tx={tx} />
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="ui-label">{t('xr_sourcesQ')}</legend>
            {SOURCES_ANSWERS.map((s) => (
              <label key={s} className="text-xs flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <input type="radio" name={id('sources')} checked={f.sources === s} onChange={() => set({ sources: s })} /> {tx(SOURCES_LABEL[s])}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="ui-label">{t('xr_actQ')}</legend>
            {ACT_ANSWERS.map((s) => (
              <label key={s} className="text-xs flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <input type="radio" name={id('act')} checked={f.wouldAct === s} onChange={() => set({ wouldAct: s })} /> {tx(ACT_LABEL[s])}
              </label>
            ))}
          </fieldset>
          <label className="ui-label block" htmlFor={id('comment')}>
            {t('xr_comment')}
            <textarea id={id('comment')} className={INPUT} rows={4} maxLength={2000} value={f.comment} onChange={(e) => set({ comment: e.target.value })} />
          </label>
          <fieldset className="space-y-1">
            <legend className="ui-label">{t('xr_consentQ')}</legend>
            {CONSENTS.map((c) => (
              <label key={c} className="text-xs flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <input type="radio" name={id('consent')} checked={f.consent === c} onChange={() => set({ consent: c })} /> {tx(CONSENT_LABEL[c])}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-1.5">
            <button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>
              <Send className="w-3.5 h-3.5" /> {busy ? t('xr_saving') : t('xr_save')}
            </button>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>
              {t('xr_cancel')}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
