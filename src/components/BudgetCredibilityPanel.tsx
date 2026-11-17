import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { BcProfile, Band } from '../utils/budgetCredibility';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Budget credibility (R3, src/utils/budgetCredibility.ts): how
 * much of the approved budget the government spent each year, the PEFA PI-1 band of each year and a
 * grade on the PEFA rule worked out by the app. World Bank figures (from PEFA assessments) from the
 * saved history.
 */

type Reply = BcProfile & { iso3: string; sentence: string };

const BAND_CLASS: Record<Band, string> = {
  A: 'text-emerald-700 dark:text-emerald-400',
  B: 'text-blue-700 dark:text-blue-400',
  C: 'text-amber-700 dark:text-amber-400',
  D: 'text-red-700 dark:text-red-400',
};

export const BudgetCredibilityPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/budget-credibility/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const l = reply?.latest;

  return (
    <section className="ui-panel" data-budget-credibility="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('bc_title', { country: countryName })}
          <ValidationBadge id="budget_credibility" />
          {l && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Budget credibility, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: String(l.year),
                  iso3,
                  countryName,
                  detail: [reply!.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('bc_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('bc_what'), error })}</p>}
        {reply && !l && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.latestMissing || '') })}
          </p>
        )}
        {reply && l && (
          <>
            <p className="ui-body" data-bc-latest={String(l.pct)}>
              {t('bc_latest', { year: String(l.year), pct: l.pct.toFixed(1) })}{' '}
              {l.gap < 0 ? t('bc_under', { gap: Math.abs(l.gap).toFixed(1) }) : l.gap > 0 ? t('bc_over', { gap: l.gap.toFixed(1) }) : t('bc_exact')}{' '}
              <span className={`font-medium ${BAND_CLASS[l.band]}`}>({t('bc_band', { band: l.band })})</span>
            </p>
            {reply.grade ? (
              <div data-bc-grade={reply.grade.band}>
                <h3 className="ui-label">{t('bc_gradeTitle', { from: String(reply.grade.from), to: String(reply.grade.to) })}</h3>
                <p className="text-sm">
                  <span className={`font-semibold ${BAND_CLASS[reply.grade.band]}`}>{t('bc_grade', { band: reply.grade.band })}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('bc_gradeNote')}</p>
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-bc-grade-missing="true">
                {t('c_missingReason', { reason: tx(reply.gradeMissing || '') })}
              </p>
            )}
            {reply.years.length > 1 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-bc-table="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('bc_tPct')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('bc_tGap')}</th>
                      <th className="py-1 font-medium text-right">{t('bc_tBand')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reply.years].reverse().map((y) => (
                      <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{y.year}</td>
                        <td className="py-0.5 pr-3 text-right">{y.pct.toFixed(1)}</td>
                        <td className="py-0.5 pr-3 text-right">{`${y.gap > 0 ? '+' : ''}${y.gap.toFixed(1)}`}</td>
                        <td className={`py-0.5 text-right font-medium ${BAND_CLASS[y.band]}`}>{y.band}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reply.years.length > 1 && reply.avgAbsGap !== undefined && (
              <p className="text-xs" data-bc-avg={String(reply.avgAbsGap)}>
                {t('bc_avg', { n: String(reply.years.length), avg: reply.avgAbsGap.toFixed(1), under: String(reply.underYears) })}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('bc_bandsKey')} {t('bc_fewYears')}
            </p>
          </>
        )}
        {reply && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('bc_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
      </div>
    </section>
  );
};
