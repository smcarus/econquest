import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import { MEASURE_FORMULA, hasMfmodModel, measures, shownYears, toAnnual, type MfmodBaselineReply, type MfmodMeasure } from '../utils/mfmodBaseline';

/**
 * Country Research > History & data > IMF forecasts by edition > World Bank country model (World Bank
 * country models plan, step M2): the baseline stored in the World Bank's public MFMod model file for
 * the six countries that have one, read through the optional models service (/api/mfmod/baseline).
 * Shown only for those six countries; nothing for any other.
 */

const LABEL: Record<MfmodMeasure, 'wbm_growth' | 'wbm_inflation' | 'wbm_balance' | 'wbm_debt' | 'wbm_ca' | 'wbm_policy'> = {
  growth: 'wbm_growth',
  inflation: 'wbm_inflation',
  balance: 'wbm_balance',
  debt: 'wbm_debt',
  current_account: 'wbm_ca',
  policy_rate: 'wbm_policy',
};

export const WorldBankModelPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<MfmodBaselineReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const has = hasMfmodModel(iso3);

  useEffect(() => {
    if (!has) return;
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/mfmod/baseline?iso3=${encodeURIComponent(iso3)}`)
      .then((r) => r.json())
      .then((b: MfmodBaselineReply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, has]);

  if (!has) return null;
  const table = reply?.ready ? measures(toAnnual(reply)) : null;
  const cols = table ? shownYears(table) : [];

  return (
    <section className="ui-panel" data-wb-model="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('wbm_title')}
        </h2>
        <p className="ui-label">{t('wbm_intro', { country: countryName })}</p>
      </header>
      <div className="p-4 space-y-3">
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('wbm_title'), error })}</p>}
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {reply && reply.on === false && (
          <p className="text-sm text-slate-700 dark:text-slate-300" data-missing="true" data-wb-model-off="true">
            {t('wbm_off')}
          </p>
        )}
        {reply && reply.on !== false && !reply.ready && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: reply.note ?? t('wbm_noAnswer') })}
          </p>
        )}
        {table && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-wb-model-sentence="true">
              {t('wbm_sentence', { from: table.projectedFrom ?? table.years[0] })}
            </p>
            {table.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('wbm_measure')}</th>
                      {cols.map((i) => (
                        <th key={table.years[i]} className="py-1 pr-3 font-medium text-right">
                          {table.years[i]}
                          {table.projectedFrom !== null && table.years[i] >= table.projectedFrom && <span className="block font-normal">{t('wbm_modelYear')}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r) => (
                      <tr key={r.measure} className="border-t border-slate-100 dark:border-slate-800" data-wb-model-row={r.measure}>
                        <td className="py-1 pr-3">{t(LABEL[r.measure])}</td>
                        {cols.map((i) => (
                          <td key={table.years[i]} className="py-1 pr-3 text-right">
                            {r.values[i] === null ? <span className="text-slate-400" data-missing="true">{t('c_missing')}</span> : r.values[i]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {table.missing.length > 0 && (
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5" data-missing="true">
                {table.missing.map((m) => (
                  <li key={m.measure}>{t('wbm_notInModel', { measure: t(LABEL[m.measure]) })}</li>
                ))}
              </ul>
            )}
            {table.quarterly && <p className="text-xs text-slate-500 dark:text-slate-400">{t('wbm_quarterly')}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('wbm_method')} {table.rows.map((r) => `${t(LABEL[r.measure])}: ${MEASURE_FORMULA[r.measure]}.`).join(' ')}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
