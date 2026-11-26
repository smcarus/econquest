import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import { MEASURE_FORMULA, hasMfmodModel, measures, shownYears, toAnnual, type MfmodBaselineReply, type MfmodMeasure } from '../utils/mfmodBaseline';
import { DIFF_FORMULA, MFMOD_POLICY_RATE, MFMOD_SHOCKS, checkMfmodShock, shockDiff, type MfmodDiffMeasure, type MfmodShockKind, type MfmodShockReply } from '../utils/mfmodShock';

/**
 * Country Research > History & data > IMF forecasts by edition > World Bank country model (World Bank
 * country models plan, step M2): the baseline stored in the World Bank's public MFMod model file for
 * the six countries that have one, read through the optional models service (/api/mfmod/baseline).
 * Shown only for those six countries; nothing for any other.
 *
 * Try a shock (step M3): the model run again with one shock (oil or food prices, the policy rate where
 * the model has one, government purchases), shown as the difference from the model's own baseline,
 * year by year from the start of the shock (/api/mfmod/shock, src/utils/mfmodShock.ts).
 */

const DIFF_LABEL: Record<MfmodDiffMeasure, 'wbm_gdpLevel' | 'wbm_dGrowth' | 'wbm_dInflation' | 'wbm_dBalance' | 'wbm_dDebt' | 'wbm_dCa' | 'wbm_dPolicy' | 'wbm_currency'> = {
  gdp_level: 'wbm_gdpLevel',
  growth: 'wbm_dGrowth',
  inflation: 'wbm_dInflation',
  balance: 'wbm_dBalance',
  debt: 'wbm_dDebt',
  current_account: 'wbm_dCa',
  policy_rate: 'wbm_dPolicy',
  currency: 'wbm_currency',
};

const KIND_LABEL: Record<MfmodShockKind, 'wbm_kindOil' | 'wbm_kindFood' | 'wbm_kindPolicy' | 'wbm_kindSpending'> = {
  oil: 'wbm_kindOil',
  food: 'wbm_kindFood',
  policy_rate: 'wbm_kindPolicy',
  spending: 'wbm_kindSpending',
};

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

  const table = reply?.ready ? measures(toAnnual(reply)) : null;
  const cols = table ? shownYears(table) : [];
  const kinds = (Object.keys(MFMOD_SHOCKS) as MfmodShockKind[]).filter((k) => k !== 'policy_rate' || MFMOD_POLICY_RATE.has(iso3.toUpperCase()));
  const [kind, setKind] = useState<MfmodShockKind>('oil');
  const [size, setSize] = useState('');
  const [shock, setShock] = useState<MfmodShockReply | null>(null);
  const [shockBusy, setShockBusy] = useState(false);
  const [shockError, setShockError] = useState<string | null>(null);
  const check = checkMfmodShock(iso3, kind, size.trim());
  const diff = shock?.ready ? shockDiff(shock) : null;
  const runShock = () => {
    if (!check.ok) return;
    setShockBusy(true);
    setShockError(null);
    setShock(null);
    fetch(`/api/mfmod/shock?iso3=${encodeURIComponent(iso3)}&kind=${check.kind}&size=${check.size}`)
      .then((r) => r.json())
      .then((b: MfmodShockReply) => setShock(b))
      .catch((e: Error) => setShockError(e.message))
      .finally(() => setShockBusy(false));
  };

  if (!has) return null;
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
            {table.inflationFrom === 'consumer_deflator' && <p className="text-xs text-slate-500 dark:text-slate-400">{t('wbm_deflator')}</p>}
            {table.quarterly && <p className="text-xs text-slate-500 dark:text-slate-400">{t('wbm_quarterly')}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('wbm_method')} {table.rows.map((r) => `${t(LABEL[r.measure])}: ${MEASURE_FORMULA[r.measure]}.`).join(' ')}
            </p>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2" data-wb-model-shock="true">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('wbm_try')}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">{t('wbm_tryIntro')}</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 flex flex-col gap-1">
                  {t('wbm_shock')}
                  <select className="ui-input text-sm" value={kind} onChange={(e) => setKind(e.target.value as MfmodShockKind)} data-wb-model-kind="true">
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {t(KIND_LABEL[k])}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-600 dark:text-slate-300 flex flex-col gap-1">
                  {t('wbm_size')}
                  <input className="ui-input text-sm w-28" type="number" inputMode="decimal" step="any" value={size} onChange={(e) => setSize(e.target.value)} data-wb-model-size="true" />
                </label>
                <button type="button" className="ui-btn text-sm" disabled={!check.ok || shockBusy} onClick={runShock} data-wb-model-run="true">
                  {shockBusy ? t('wbm_running') : t('wbm_run')}
                </button>
              </div>
              {size.trim() !== '' && !check.ok && <p className="text-xs text-amber-700 dark:text-amber-400">{t('wbm_sizeRange', { max: MFMOD_SHOCKS[kind].max })}</p>}
              {shockError && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('wbm_try'), error: shockError })}</p>}
              {shock && !shock.ready && (
                <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
                  {t('c_missingReason', { reason: shock.note ?? t('wbm_noAnswer') })}
                </p>
              )}
              {diff && (
                <>
                  <p className="text-sm text-slate-900 dark:text-white" data-wb-model-diff-sentence="true">
                    {t('wbm_diffSentence', { hold: diff.holdYears })}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                          <th className="py-1 pr-3 font-medium">{t('wbm_diffMeasure')}</th>
                          {diff.years.map((y) => (
                            <th key={y} className="py-1 pr-3 font-medium text-right">
                              {t('wbm_year', { n: y })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {diff.rows.map((r) => (
                          <tr key={r.measure} className="border-t border-slate-100 dark:border-slate-800" data-wb-model-diff-row={r.measure}>
                            <td className="py-1 pr-3">{t(DIFF_LABEL[r.measure])}</td>
                            {r.values.map((v, i) => (
                              <td key={diff.years[i]} className="py-1 pr-3 text-right">
                                {v === null ? <span className="text-slate-400" data-missing="true">{t('c_missing')}</span> : `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {diff.missing.length > 0 && (
                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5" data-missing="true">
                      {diff.missing.map((m) => (
                        <li key={m}>{t('wbm_notInModel', { measure: t(DIFF_LABEL[m]) })}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('wbm_diffMethod')} {diff.rows.map((r) => `${t(DIFF_LABEL[r.measure])}: ${DIFF_FORMULA[r.measure]}.`).join(' ')}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
