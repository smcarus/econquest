import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import { BEHAVIOUR_CHANNELS, CHANNEL_RULES, type BehaviourChannel } from '../data/behaviouralEvidence';
import { BEHAVIOUR_METHOD, FIELD_LABEL, behaviourState, behaviourText, behaviouralFlags, type BehaviourEffect } from '../utils/behaviouralCheck';
import type { PolicyReview, ReviewStep, StepState } from '../utils/policyReview';
import type { OptionsStep } from '../utils/reviewOptions';
import { ValidationBadge } from './ValidationBadge';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Behavioural check (roadmap G33), between Evidence and the memo. Flags come from
 * fixed word rules over the saved options (src/utils/behaviouralCheck.ts) and cite studies from a
 * fixed list. Effect sizes appear only when the user enters them with a source; they are saved
 * beside the steps, hashed and audited.
 */

const INPUT = 'w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
type Draft = { rank: number; channel: BehaviourChannel; effect: string; source: string; link: string };

export const BehaviouralCheck: React.FC<{
  review: PolicyReview;
  optionsState: StepState;
  changed?: boolean;
  onSaved: (out: { review: PolicyReview; states: Record<ReviewStep, StepState> }) => Promise<void>;
}> = ({ review, optionsState, changed, onSaved }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const options = review.steps.options?.content as OptionsStep | undefined;
  const flags = useMemo(() => (options && optionsState === 'done' ? behaviouralFlags(options.options) : []), [options, optionsState]);
  const saved = review.behaviour;
  const state = behaviourState(saved, review.steps.options?.hash);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setDrafts((saved?.effects ?? []).map((e) => ({ ...e, link: e.link ?? '' })));
    setError('');
  }, [review.id, saved?.hash]);

  if (!options || optionsState !== 'done') return <p className="text-xs text-slate-500 dark:text-slate-400">{t('bc_optionsFirst')}</p>;

  const set = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/behaviour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effects: drafts.map((d) => ({ rank: d.rank, channel: d.channel, effect: d.effect, source: d.source, ...(d.link.trim() ? { link: d.link } : {}) })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
      await onSaved(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const effects: BehaviourEffect[] = saved?.effects ?? [];
  const copy = () => navigator.clipboard?.writeText(behaviourText(flags, effects)).catch(() => undefined);

  return (
    <div className="space-y-3" data-behavioural-check="true">
      <div className="flex flex-wrap items-center gap-2">
        <ValidationBadge id="behavioural_check" />
        <button type="button" className="ui-btn ui-btn-ghost" onClick={copy}>
          <Copy className="w-3.5 h-3.5" /> {t('bc_copy')}
        </button>
      </div>
      {changed && <p className="text-xs text-amber-700 dark:text-amber-400">{t('bc_changed')}</p>}
      {saved && state === 'out_of_date' && <p className="text-xs text-amber-700 dark:text-amber-400">{t('bc_outOfDate')}</p>}
      {flags.map((o) => (
        <div key={o.rank} className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1.5" data-behaviour-option={o.rank}>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {o.rank}. {o.title}
          </p>
          {!o.flags.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('bc_none')}</p>}
          {o.flags.map((f) => (
            <div key={f.channel} className="text-xs space-y-1" data-behaviour-flag={f.channel}>
              <p className="text-slate-800 dark:text-slate-200">
                <span className="font-semibold">{tx(f.label)}.</span> {tx(f.question)}
              </p>
              <p className="text-slate-500 dark:text-slate-400">{t('bc_words', { words: f.matched.join(', '), fields: f.fields.map((x) => tx(FIELD_LABEL[x])).join(', ') })}</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-300">
                {f.studies.map((s) => (
                  <li key={s.id}>
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.citation}
                    </a>{' '}
                    {tx(s.about)}
                  </li>
                ))}
              </ul>
              {effects
                .filter((e) => e.rank === o.rank && e.channel === f.channel)
                .map((e, i) => (
                  <p key={i} className="text-slate-800 dark:text-slate-200">
                    {t('bc_entered', { effect: e.effect, source: e.source })}
                  </p>
                ))}
            </div>
          ))}
        </div>
      ))}

      <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-2">
        <p className="ui-section-title">{t('bc_sizes')}</p>
        <p className="ui-label">{t('bc_sizesNote')}</p>
        {!drafts.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('bc_noSizes')}</p>}
        {drafts.map((d, i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-2 border border-slate-200 dark:border-slate-700 p-2" data-behaviour-entry={i}>
            <label className="ui-label">
              {t('bc_option')}
              <select className={INPUT} value={d.rank} onChange={(e) => set(i, { rank: Number(e.target.value) })}>
                {options.options.map((o) => (
                  <option key={o.rank} value={o.rank}>
                    {o.rank}. {o.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-label">
              {t('bc_behaviour')}
              <select className={INPUT} value={d.channel} onChange={(e) => set(i, { channel: e.target.value as BehaviourChannel })}>
                {BEHAVIOUR_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {tx(CHANNEL_RULES[c].label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-label">
              {t('bc_effect')}
              <input className={INPUT} value={d.effect} maxLength={200} onChange={(e) => set(i, { effect: e.target.value })} />
            </label>
            <label className="ui-label">
              {t('bc_source')}
              <input className={INPUT} value={d.source} maxLength={300} onChange={(e) => set(i, { source: e.target.value })} />
            </label>
            <label className="ui-label">
              {t('bc_link')}
              <input className={INPUT} value={d.link} maxLength={400} onChange={(e) => set(i, { link: e.target.value })} />
            </label>
            <div className="flex items-end">
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setDrafts((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="w-3.5 h-3.5" /> {t('bc_remove')}
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="ui-btn"
            onClick={() => setDrafts((x) => [...x, { rank: flags[0]?.rank ?? options.options[0]?.rank ?? 1, channel: flags[0]?.flags[0]?.channel ?? 'take_up', effect: '', source: '', link: '' }])}
          >
            <Plus className="w-3.5 h-3.5" /> {t('bc_add')}
          </button>
          {(drafts.length > 0 || saved) && (
            <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={save}>
              <Save className="w-3.5 h-3.5" /> {busy ? t('bc_saving') : t('bc_save')}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('bc_saved', { when: saved.savedAt.slice(0, 16).replace('T', ' '), hash: saved.hash.slice(0, 12) })}
          </p>
        )}
      </div>
      <p className="ui-label">{tx(BEHAVIOUR_METHOD)}</p>
    </div>
  );
};
