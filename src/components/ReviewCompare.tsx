import React, { useEffect, useState } from 'react';
import type { PolicyReview, ReviewFrame } from '../utils/policyReview';
import { compareReviews, type FrameField } from '../utils/reviewCompare';
import { GOAL_MOVE_LABEL } from '../utils/reviewOutcomes';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > What changed since the earlier review (PC3, src/utils/reviewCompare.ts): shown on
 * a review started with Review again. The earlier review is read when this opens; nothing is saved.
 */

const FIELD_KEY: Record<FrameField, 'pr_problemDt' | 'pr_goalDt' | 'pr_constraintsDt' | 'pr_for'> = {
  problem: 'pr_problemDt',
  goal: 'pr_goalDt',
  constraints: 'pr_constraintsDt',
  audience: 'pr_for',
};

const fmt = (v: number | null) => (v === null ? null : String(v));

export const ReviewCompare: React.FC<{ review: PolicyReview; previousId: string }> = ({ review, previousId }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const [earlier, setEarlier] = useState<PolicyReview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setEarlier(null);
    setError('');
    fetch(`/api/reviews/${encodeURIComponent(previousId)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error || `The app answered ${r.status}.`);
        return body.review as PolicyReview;
      })
      .then((x) => live && setEarlier(x))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [previousId]);

  if (error) return <p className="text-xs text-amber-700 dark:text-amber-400">{t('prc_error', { why: error })}</p>;
  if (!earlier) return null;
  const c = compareReviews(earlier, review);
  if (!c) return null;
  const fa = earlier.steps.frame!.content as ReviewFrame;
  const fb = review.steps.frame!.content as ReviewFrame;
  const goal = (f: ReviewFrame) => `${tx(f.goal.indicator)}: ${tx(f.goal.direction)}${f.goal.target ? t('pr_toTarget', { t: f.goal.target }) : ''}${f.goal.by ? t('pr_byDate', { d: f.goal.by }) : ''}`;
  const side = (field: FrameField, f: ReviewFrame, text: string) => (field === 'goal' ? goal(f) : text || t('pr_noneStated'));
  const missingCell = <span className="text-slate-400">{t('pc_missingCell')}</span>;
  const groups = [...new Set(c.rows.map((r) => r.group))];

  return (
    <details className="border border-slate-200 dark:border-slate-700 p-3 text-sm" data-review-compare="true">
      <summary className="cursor-pointer font-medium">{t('prc_summary')}</summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('prc_dates', { a: c.earlier.asOf, pa: c.earlier.pullDate || '–', b: c.later.asOf, pb: c.later.pullDate || '–' })}
        </p>
        <h5 className="ui-label">{t('prc_frameTitle')}</h5>
        {c.frameChanges.length ? (
          <ul className="text-xs space-y-1" data-review-compare-frame="true">
            {c.frameChanges.map((x) => (
              <li key={x.field}>
                <span className="font-medium">{t(FIELD_KEY[x.field])}:</span> {t('prc_beforeAfter', { before: side(x.field, fa, x.before), after: side(x.field, fb, x.after) })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs">{t('prc_sameFrame')}</p>
        )}
        <h5 className="ui-label">{t('prc_recTitle')}</h5>
        <p className="text-xs">{t('prc_rec', { before: c.recommended.earlier || t('prc_noMemo'), after: c.recommended.later || t('prc_noMemo') })}</p>
        <h5 className="ui-label">{t('prc_figuresTitle')}</h5>
        {c.rowsMissing ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t(c.rowsMissing === 'later' ? 'prc_runDiagnose' : c.rowsMissing === 'earlier' ? 'prc_earlierNoDiag' : 'prc_bothNoDiag')}</p>
        ) : (
          <>
            {c.goal && (
              <p className="text-xs" data-review-compare-goal={c.goal.move}>
                <span className="font-medium">{t('prc_goal', { label: tx(c.goal.label) })}</span>{' '}
                <span className={c.goal.move === 'right_way' ? 'ui-badge ui-badge-positive' : c.goal.move === 'wrong_way' ? 'ui-badge ui-badge-negative' : 'ui-badge'}>{tx(GOAL_MOVE_LABEL[c.goal.move])}</span>
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-review-compare-figures="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="pr-2 py-1 font-normal">#</th>
                    <th className="pr-2 py-1 font-normal">{t('pr_indicator')}</th>
                    <th className="pr-2 py-1 font-normal text-right">{t('prc_then', { d: c.earlier.asOf })}</th>
                    <th className="pr-2 py-1 font-normal text-right">{t('prc_now', { d: c.later.asOf })}</th>
                    <th className="py-1 font-normal text-right">{t('prc_change')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <React.Fragment key={g}>
                      <tr>
                        <td colSpan={5} className="pt-2 pb-0.5 ui-label">
                          {tx(g)}
                        </td>
                      </tr>
                      {c.rows
                        .filter((r) => r.group === g)
                        .map((r) => (
                          <tr key={r.field} className="border-t border-slate-100 dark:border-slate-800" data-compare-row={r.field}>
                            <td className="pr-2 py-0.5 text-slate-500">[{r.ref}]</td>
                            <td className="pr-2 py-0.5">
                              {tx(r.label)}
                              {r.unit === '%' ? ' (%)' : r.unit ? <span className="text-slate-500 dark:text-slate-400"> ({r.unit})</span> : ''}
                            </td>
                            <td className="pr-2 py-0.5 text-right" title={r.beforePeriod}>
                              {fmt(r.before) ?? missingCell}
                            </td>
                            <td className="pr-2 py-0.5 text-right" title={r.afterPeriod}>
                              {fmt(r.after) ?? missingCell}
                            </td>
                            <td className="py-0.5 text-right">{r.change === null ? missingCell : `${r.change > 0 ? '+' : ''}${r.change}`}</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('prc_caveat')}</p>
      </div>
    </details>
  );
};
