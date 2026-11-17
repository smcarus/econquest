import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { FinancialInclusion } from '../utils/financialInclusion';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Financial inclusion (PA5, src/utils/financialInclusion.ts): who
 * has an account (Global Findex), the gaps by sex and household income in the same survey, bank
 * branches and cash machines, and credit to households and firms. World Bank figures from the saved
 * history.
 */

type Reply = FinancialInclusion & { iso3: string; sentence: string };

const Bar: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-40 shrink-0">{label}</span>
    <span className="flex-1 h-2 bg-slate-100 dark:bg-slate-800" aria-hidden="true">
      <span className="block h-2 bg-blue-600 dark:bg-blue-400" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
    <span className="w-12 text-right tabular-nums">{value.toFixed(1)}%</span>
  </div>
);

export const FinancialInclusionPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/financial-inclusion/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  return (
    <section className="ui-panel" data-financial-inclusion="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('fi_title', { country: countryName })}
          <ValidationBadge id="financial_inclusion" />
          {reply?.account && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Financial inclusion, ${countryName}`,
                  value: reply.sentence,
                  source: reply.sources,
                  asOf: String(reply.account!.year),
                  iso3,
                  countryName,
                  detail: [reply.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('fi_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('fi_what'), error })}</p>}
        {reply && !reply.account && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.accountMissing || '') })}
          </p>
        )}
        {reply?.account && (
          <div className="space-y-1.5" data-fi-accounts="true">
            <h3 className="ui-label">{t('fi_accountsTitle', { year: String(reply.account.year) })}</h3>
            <Bar value={reply.account.value} label={t('fi_adults')} />
            {reply.genderGap && (
              <>
                <Bar value={reply.genderGap.women} label={t('fi_women')} />
                <Bar value={reply.genderGap.men} label={t('fi_men')} />
              </>
            )}
            {reply.incomeGap && (
              <>
                <Bar value={reply.incomeGap.poorest40} label={t('fi_poorest')} />
                <Bar value={reply.incomeGap.richest60} label={t('fi_richest')} />
              </>
            )}
            <ul className="text-xs list-disc pl-5 pt-1">
              {reply.account.previous && (
                <li>{t('fi_change', { prev: reply.account.previous.value.toFixed(1), prevYear: String(reply.account.previous.year), now: reply.account.value.toFixed(1), year: String(reply.account.year) })}</li>
              )}
              {reply.genderGap && <li data-fi-gap="gender">{reply.genderGap.gap === 0 ? t('fi_genderEqual') : reply.genderGap.gap > 0 ? t('fi_genderGap', { pts: reply.genderGap.gap.toFixed(1) }) : t('fi_genderGapRev', { pts: (-reply.genderGap.gap).toFixed(1) })}</li>}
              {reply.incomeGap && <li data-fi-gap="income">{t('fi_incomeGap', { pts: reply.incomeGap.gap.toFixed(1) })}</li>}
            </ul>
          </div>
        )}
        {reply && (
          <>
            <h3 className="ui-label">{t('fi_accessTitle')}</h3>
            <ul className="text-xs space-y-0.5" data-fi-access="true">
              <li>
                {t('fi_branches')}: {reply.branches ? t('fi_per100k', { v: reply.branches.value.toFixed(1), year: String(reply.branches.year) }) : <span className="text-amber-700 dark:text-amber-400">{t('fi_noFigure')}</span>}
              </li>
              <li>
                {t('fi_atms')}: {reply.atms ? t('fi_per100k', { v: reply.atms.value.toFixed(1), year: String(reply.atms.year) }) : <span className="text-amber-700 dark:text-amber-400">{t('fi_noFigure')}</span>}
              </li>
              <li>
                {t('fi_credit')}: {reply.privateCredit ? t('fi_pctGdp', { v: reply.privateCredit.value.toFixed(1), year: String(reply.privateCredit.year) }) : <span className="text-amber-700 dark:text-amber-400">{t('fi_noFigure')}</span>}
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('fi_why')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('fi_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
