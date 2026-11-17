import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { DEFAULT_PRECEDENT_FEATURES, MIN_FEATURES, PRECEDENT_FEATURES, PRECEDENT_HORIZON, PRECEDENT_OUTCOMES, PRECEDENT_SOURCES, FIRST_YEAR, type PrecedentFeature, type PrecedentOutcome, type PrecedentResult } from '../utils/precedentFinder';
import type { PolicyReview } from '../utils/policyReview';
import { useT } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Precedents (roadmap G34), after Diagnose. Other countries whose yearly figures
 * matched this country's on the figures the user picks, and what followed, worked out on request
 * from the saved histories (src/utils/precedentFinder.ts). Nothing is saved; the steps and the memo
 * do not change. A description, not a tested signal.
 */

type Answer = PrecedentResult & { historyPulledAt?: string };

const FEATURE_KEY = {
  debt_gdp: 'pc_f_debt_gdp',
  cpi_imf: 'pc_f_cpi_imf',
  reserves_months: 'pc_f_reserves_months',
  current_account: 'pc_f_current_account',
  gdp_growth: 'pc_f_gdp_growth',
  primary_balance: 'pc_f_primary_balance',
} as const satisfies Record<PrecedentFeature, string>;

const OUTCOME_KEY = {
  growth_avg: 'pc_o_growth_avg',
  inflation_after: 'pc_o_inflation_after',
  debt_change: 'pc_o_debt_change',
  primary_change: 'pc_o_primary_change',
  current_account_after: 'pc_o_current_account_after',
  reserves_after: 'pc_o_reserves_after',
  currency_change: 'pc_o_currency_change',
} as const satisfies Record<PrecedentOutcome, string>;

const fmt = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? null : v.toFixed(d));

export const PrecedentFinder: React.FC<{ review: PolicyReview; countryName: string }> = ({ review, countryName }) => {
  const t = useT(REPORTS);
  const [features, setFeatures] = useState<PrecedentFeature[]>([...DEFAULT_PRECEDENT_FEATURES]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setAnswer(null);
    setError('');
  }, [review.id, review.steps.frame?.hash]);

  const label = (f: PrecedentFeature) => t(FEATURE_KEY[f]);
  const toggle = (f: PrecedentFeature) => setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : PRECEDENT_FEATURES.filter((x) => cur.includes(x) || x === f)));
  const find = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/precedents?features=${features.join(',')}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
      setAnswer(body as Answer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const cell = (v: number | null | undefined, d = 1) => fmt(v, d) ?? <span className="text-slate-400">{t('pc_missingCell')}</span>;
  const missingText = (a: Answer) => {
    const m = a.missing!;
    if (m.reason === 'too_few_features') return t('pc_pickTwo');
    if (m.reason === 'no_history') return t('pc_m_noHistory');
    if (m.reason === 'no_pool') return t('pc_m_noPool');
    return `${t('pc_m_noTarget', { year: String(a.lastYear) })}${m.features?.length ? ` ${t('pc_m_noFigures', { list: m.features.map(label).join(', ') })}` : ''}`;
  };

  return (
    <div className="space-y-2">
      <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <legend className="ui-label mb-1">{t('pc_figures')}</legend>
        {PRECEDENT_FEATURES.map((f) => (
          <label key={f} className="inline-flex items-center gap-1">
            <input type="checkbox" checked={features.includes(f)} onChange={() => toggle(f)} /> {label(f)}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={answer ? 'ui-btn' : 'ui-btn ui-btn-primary'} disabled={busy || features.length < MIN_FEATURES} onClick={find}>
          <Search className="w-3.5 h-3.5" /> {busy ? t('pc_finding') : answer ? t('pc_again') : t('pc_find')}
        </button>
        {features.length < MIN_FEATURES && <span className="text-xs text-slate-500 dark:text-slate-400">{t('pc_pickTwo')}</span>}
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{t('pc_error', { why: error })}</p>}
      {answer?.missing && <p className="text-xs text-amber-700 dark:text-amber-400">{missingText(answer)}</p>}
      {answer?.target && (
        <p className="text-sm">
          {t('pc_target', { country: countryName, year: String(answer.target.year), values: answer.features.map((f) => `${label(f)} ${fmt(answer.target!.values[f])}`).join('; ') })}
        </p>
      )}
      {answer && !answer.missing && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('pc_pool', { years: String(answer.pool.countryYears), countries: String(answer.pool.countries), first: String(FIRST_YEAR), last: String(answer.lastYear - 1 - PRECEDENT_HORIZON) })}</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full" data-precedents="matches">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pr-2">{t('pc_country')}</th>
                  <th className="pr-2">{t('pc_year')}</th>
                  <th className="pr-2">{t('pc_distance')}</th>
                  {answer.features.map((f) => (
                    <th key={f} className="pr-2">{label(f)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.matches.map((m) => (
                  <tr key={m.iso3} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="pr-2">{m.name}</td>
                    <td className="pr-2 font-code">{m.year}</td>
                    <td className="pr-2 font-code">{m.distance.toFixed(2)}</td>
                    {answer.features.map((f) => (
                      <td key={f} className="pr-2 font-code">{cell(m.values[f])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h5 className="ui-label">{t('pc_whatFollowed')}</h5>
          <div className="overflow-x-auto">
            <table className="text-xs w-full" data-precedents="outcomes">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pr-2">{t('pc_country')}</th>
                  {PRECEDENT_OUTCOMES.map((o) => (
                    <th key={o} className="pr-2">{t(OUTCOME_KEY[o])}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.matches.map((m) => (
                  <tr key={m.iso3} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="pr-2">{m.name} ({m.year})</td>
                    {PRECEDENT_OUTCOMES.map((o) => (
                      <td key={o} className="pr-2 font-code">{cell(m.outcomes[o])}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                  <td className="pr-2">{t('pc_median')}</td>
                  {PRECEDENT_OUTCOMES.map((o) => (
                    <td key={o} className="pr-2 font-code">
                      {cell(answer.summary[o].median)} <span className="font-normal text-slate-500">{t('pc_nOf', { n: String(answer.summary[o].n), total: String(answer.matches.length) })}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <dl className="text-xs space-y-1">
            <div>
              <dt className="inline font-semibold">{t('pc_programme')}: </dt>
              <dd className="inline">{t('pc_programmeMissing')}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{t('pc_crisis')}: </dt>
              <dd className="inline">{t('pc_crisisMissing')}</dd>
            </div>
          </dl>
          <details className="text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer">{t('pc_method')}</summary>
            <p className="mt-1">{t('pc_methodText')}</p>
            <p className="mt-1">{t('pc_sources', { list: [...answer.features, 'fx_lcu_usd' as const].map((f) => PRECEDENT_SOURCES[f]).join('; ') })}</p>
            {answer.historyPulledAt && <p className="mt-1">{t('pc_historyFrom', { date: answer.historyPulledAt.slice(0, 10) })}</p>}
          </details>
        </>
      )}
    </div>
  );
};
