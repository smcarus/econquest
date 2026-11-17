import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { RULE_KINDS, type FiscalRulesCheck, type RuleKind } from '../utils/fiscalRules';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Fiscal rules (G35, src/utils/fiscalRules.ts): the EU, WAEMU or
 * CEMAC limits that bind the country, checked against the latest saved IMF figures, and the national
 * rules listed in the IMF Fiscal Rules Dataset workbook the user saved. Description only, no score.
 */

type Reply = FiscalRulesCheck & { sentence: string; historySaved: boolean };

const KIND_KEY: Record<RuleKind, 'fr_k_er' | 'fr_k_rr' | 'fr_k_bbr' | 'fr_k_dr'> = { er: 'fr_k_er', rr: 'fr_k_rr', bbr: 'fr_k_bbr', dr: 'fr_k_dr' };

export const FiscalRulesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/fiscal-rules/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const figureName = (f: string | null) => (f === 'debt_gdp' ? t('fr_debt') : t('fr_balance'));
  const nationalMissing = (r: Reply) => {
    if (r.nationalCode === 'no_row') return t('fr_noRow', { count: String(r.countriesInFile ?? 0) });
    if (r.nationalCode === 'unreadable') return r.nationalMissing || '';
    return t('fr_noFile');
  };

  return (
    <section className="ui-panel" data-fiscal-rules="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('fr_title', { country: countryName })}
          <ValidationBadge id="fiscal_rules" />
          {reply && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Fiscal rules, ${countryName}`,
                  value: reply.sentence,
                  source: reply.sources.join('; '),
                  asOf: String(reply.beforeYear - 1),
                  iso3,
                  countryName,
                  detail: [reply.method, ...reply.treaty.map((c) => c.missing || c.rule.caveat).filter(Boolean), reply.nationalMissing || ''],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('fr_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('fr_what'), error })}</p>}
        {reply && (
          <>
            <h3 className="ui-label">{t('fr_treaty')}</h3>
            {!reply.treaty.length && <p className="text-xs text-slate-600 dark:text-slate-300">{t('fr_noTreaty')}</p>}
            {reply.treaty.length > 0 && (
              <table className="w-full text-xs" data-fr-table="treaty">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('fr_rule')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('fr_latest')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('c_year')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('fr_room')}</th>
                    <th className="py-1 font-medium">{t('fr_result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.treaty.map((c) => (
                    <tr key={c.rule.id} className="border-t border-slate-100 dark:border-slate-800" data-fr-row={c.rule.id}>
                      <td className="py-0.5 pr-3">
                        <span className="font-medium">{c.rule.body}</span> {tx(c.rule.rule)}
                      </td>
                      <td className="py-0.5 pr-3 text-right tabular-nums">{c.value !== undefined ? c.value.toFixed(1) : '–'}</td>
                      <td className="py-0.5 pr-3 text-right tabular-nums">{c.year ?? '–'}</td>
                      <td className="py-0.5 pr-3 text-right tabular-nums">{c.room !== undefined ? `${c.room > 0 ? '+' : ''}${c.room.toFixed(1)}` : '–'}</td>
                      <td className="py-0.5" data-fr-meets={c.meets === null ? 'missing' : String(c.meets)}>
                        {c.meets === null ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            {c.missingCode === 'no_figure' ? t('fr_noFigure', { figure: figureName(c.rule.figure), year: String(reply.beforeYear) }) : t('c_missingReason', { reason: tx(c.missing || '') })}
                          </span>
                        ) : c.meets ? (
                          <span className="text-emerald-700 dark:text-emerald-400">{t('fr_meets')}</span>
                        ) : (
                          <span className="text-red-700 dark:text-red-400">{t('fr_misses')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {[...new Set(reply.treaty.map((c) => c.rule.caveat).filter(Boolean))].map((cv) => (
              <p key={cv} className="text-xs text-slate-500 dark:text-slate-400">
                {tx(cv)}
              </p>
            ))}
            <h3 className="ui-label">{t('fr_national')}</h3>
            {reply.national ? (
              <div className="space-y-1" data-fr-national="true">
                <p className="text-xs">{t('fr_nationalYear', { year: String(reply.national.year) })}</p>
                <ul className="text-xs list-disc pl-5">
                  {RULE_KINDS.map((k) => (
                    <li key={k} data-fr-kind={k}>
                      {t(KIND_KEY[k])}: {reply.national!.has[k] ? t('fr_inForceSince', { year: String(reply.national!.since[k]) }) : t('fr_none')}
                    </li>
                  ))}
                </ul>
                {reply.national.details.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('fr_details')} {reply.national.details.map((d) => `${d.label}: ${d.value}`).join('; ')}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('fr_limitsNote')}</p>
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: nationalMissing(reply) })}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('fr_methodText')} {t('c_sources', { sources: reply.sources.map(tx).join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
