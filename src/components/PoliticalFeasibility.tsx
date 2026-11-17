import React, { useEffect, useState } from 'react';
import { Vote } from 'lucide-react';
import { DPI_FIELDS, type DpiField, type PoliticalFeasibility as PF } from '../utils/politicalFeasibility';
import type { PolicyReview } from '../utils/policyReview';
import { useT } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Political feasibility (roadmap G36), beside the options. Elections on file, checks
 * and balances from the DPI file the user saved, and unrest from the saved GDELT months, each cut at
 * the As of day (src/utils/politicalFeasibility.ts). Worked out on request; nothing is saved and the
 * memo does not change. A description, not a score.
 */

const FIELD_KEY = {
  system: 'pf_d_system',
  checks: 'pf_d_checks',
  frac: 'pf_d_frac',
  polariz: 'pf_d_polariz',
  yrcurnt: 'pf_d_yrcurnt',
} as const satisfies Record<DpiField, string>;

const SYSTEM_KEY = ['pf_sys0', 'pf_sys1', 'pf_sys2'] as const;

export const PoliticalFeasibility: React.FC<{ review: PolicyReview }> = ({ review }) => {
  const t = useT(REPORTS);
  const [answer, setAnswer] = useState<PF | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setAnswer(null);
    setError('');
  }, [review.id, review.steps.frame?.hash]);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/political`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
      setAnswer(body as PF);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dpiMissing = (a: PF) => {
    if (a.dpiCode === 'no_file') return t('pf_m_noDpi');
    if (a.dpiCode === 'no_row') return t('pf_m_dpiNoRow');
    if (a.dpiCode === 'no_year') return t('pf_m_dpiNoYear', { year: a.asOf.slice(0, 4) });
    return a.dpiMissing || '';
  };
  const dpiValue = (f: DpiField, v: number) => (f === 'system' && SYSTEM_KEY[v] ? t(SYSTEM_KEY[v]) : String(v));
  const miss = (text: string) => <p className="text-xs text-amber-700 dark:text-amber-400">{t('pf_missing', { why: text })}</p>;

  return (
    <div className="space-y-2" data-political="true">
      <button type="button" className={answer ? 'ui-btn' : 'ui-btn ui-btn-primary'} disabled={busy} onClick={load}>
        <Vote className="w-3.5 h-3.5" /> {busy ? t('pf_loading') : answer ? t('pf_again') : t('pf_show')}
      </button>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{t('pc_error', { why: error })}</p>}
      {answer && (
        <>
          <div data-political-part="elections">
            <h5 className="ui-label">{t('pf_elections')}</h5>
            {answer.nextElection ? (
              <p className="text-xs">
                {t('pf_next', { title: answer.nextElection.title, date: answer.nextElection.date, days: String(answer.nextElection.daysAway) })}
                {answer.nextElection.legalDeadline ? ` ${t('pf_deadline')}` : ''}{' '}
                <a className="underline" href={answer.nextElection.sourceUrl} target="_blank" rel="noreferrer">
                  {answer.nextElection.sourceName}
                </a>
              </p>
            ) : (
              miss(answer.lastElection ? t('pf_m_noNext') : t('pf_m_noElection'))
            )}
            {answer.lastElection && <p className="text-xs text-slate-600 dark:text-slate-300">{t('pf_last', { title: answer.lastElection.title, date: answer.lastElection.date })}</p>}
          </div>
          <div data-political-part="institutions">
            <h5 className="ui-label">{t('pf_institutions')}</h5>
            {answer.dpi ? (
              <>
                <p className="text-xs">{t('pf_dpiYear', { year: String(answer.dpi.year) })}</p>
                <ul className="text-xs list-disc pl-5">
                  {DPI_FIELDS.map((f) => (
                    <li key={f}>
                      {t(FIELD_KEY[f])}: {answer.dpi!.values[f] !== undefined ? <span className="font-code">{dpiValue(f, answer.dpi!.values[f]!)}</span> : <span className="text-slate-400">{t('pc_missingCell')}</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              miss(dpiMissing(answer))
            )}
          </div>
          <div data-political-part="unrest">
            <h5 className="ui-label">{t('pf_unrest')}</h5>
            {answer.unrest ? (
              <p className="text-xs">
                {t('pf_unrestLine', {
                  month: answer.unrest.month,
                  protest: answer.unrest.protestPct.toFixed(1),
                  protestPctile: answer.unrest.protestPctile === null ? '–' : String(Math.round(answer.unrest.protestPctile)),
                  violence: answer.unrest.violencePct.toFixed(1),
                  violencePctile: answer.unrest.violencePctile === null ? '–' : String(Math.round(answer.unrest.violencePctile)),
                  months: String(answer.unrest.months),
                  from: answer.unrest.from,
                })}
              </p>
            ) : (
              miss(answer.unrestMissing?.startsWith('Fewer') ? t('pf_m_fewMonths', { month: answer.asOf.slice(0, 7) }) : t('pf_m_noGdelt'))
            )}
          </div>
          <details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer">{t('pf_method')}</summary>
            <p className="mt-1">{t('pf_methodText')}</p>
            {answer.sources.length > 0 && <p className="mt-1">{t('pc_sources', { list: answer.sources.join('; ') })}</p>}
          </details>
        </>
      )}
    </div>
  );
};
