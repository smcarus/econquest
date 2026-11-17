import React from 'react';
import type { AgentAnswer } from '../utils/askCouncil';
import { citedWhatIf, type WhatIfBrief, type WhatIfKind, type WhatIfSectionId } from '../utils/whatIfAnswer';
import { useT, useTx } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

const TITLE: Record<WhatIfSectionId, keyof typeof CHAT.en> = {
  start: 'wf_start',
  shock: 'wf_shock',
  effects: 'wf_effects',
  spread: 'wf_spread',
  history: 'wf_history',
  research: 'wf_research',
  trends: 'wf_trends',
  watch: 'wf_watch',
};
const KIND: Record<WhatIfKind, keyof typeof CHAT.en> = { data: 'wf_kData', calc: 'wf_kCalc', past: 'wf_kPast', study: 'wf_kStudy', interp: 'wf_kInterp' };

/**
 * A what-if answer in Council chat (src/utils/whatIfAnswer.ts): eight sections from where things
 * stand now to what would change the answer, each marked with the kind of evidence it rests on.
 * Sentences that quote a figure carry its reference number; a section with no figures says Missing and why.
 */
export const WhatIfAnswer: React.FC<{ headline: string; whatIf: WhatIfBrief; disagreements: string[]; answers: AgentAnswer[] }> = ({ headline, whatIf, disagreements, answers }) => {
  const c = citedWhatIf(whatIf, answers);
  const t = useT(CHAT);
  const tx = useTx();
  return (
    <div className="space-y-3" data-whatif="true">
      {headline && <p className="text-sm font-medium text-slate-900 dark:text-white">{headline}</p>}
      {c.sections.map((s) => (
        <div key={s.id} data-whatif-section={s.id}>
          <div className="flex items-center gap-2">
            <span className="ui-label">{t(TITLE[s.id])}</span>
            <span className={`ui-badge ${s.kind === 'data' ? 'ui-badge-accent' : ''}`} data-whatif-kind={s.kind}>
              {t(KIND[s.kind])}
            </span>
          </div>
          {s.sentences.length ? (
            <ul className="list-disc pl-5 mt-1 text-sm text-slate-800 dark:text-slate-200 space-y-1">
              {s.sentences.map((x) => (
                <li key={x.text}>
                  {x.text}
                  {x.refs.length > 0 && <span className="text-xs text-slate-500 dark:text-slate-400"> [{x.refs.join(', ')}]</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" data-whatif-missing="true">
              {t('wf_missing', { why: tx(s.missing ?? '') })}
            </p>
          )}
        </div>
      ))}
      {disagreements.length > 0 && (
        <div data-whatif-section="disagreements">
          <span className="ui-label">{t('wf_disagree')}</span>
          <ul className="list-disc pl-5 mt-1 text-sm text-slate-800 dark:text-slate-200 space-y-1">
            {disagreements.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {c.references.length > 0 && (
        <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5" data-whatif-refs={c.references.length}>
          {c.references.map((r) => (
            <li key={r.n}>
              [{r.n}] {r.url ? <a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.source}</a> : r.source}
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('wf_note')}</p>
    </div>
  );
};
