import React, { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import { convertAll, fmtAmount, CONVERTER_METHOD, type ConverterSeries } from '../utils/unitConverters';

/**
 * Country Research > History & data > Unit converters (src/utils/unitConverters.ts): a local
 * currency amount in real terms, US dollars, PPP and per head, each with its factor and source.
 */

export const UnitConverterPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [series, setSeries] = useState<ConverterSeries | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [amount, setAmount] = useState('1000000');
  const [year, setYear] = useState('');
  const [target, setTarget] = useState('');
  const [readError, setReadError] = useState<string | null>(null);
  const t = useT(TOOLS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setSeries(null);
    setMissing([]);
    fetch(`/api/unit-converters/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: { series: ConverterSeries; missing: string[] }) => {
        if (!live) return;
        const s = b.series || {};
        setSeries(s);
        setMissing(b.missing || []);
        const years = (s.cpi || s.fx || []).filter((p) => p.note !== 'IMF projection').map((p) => String(p.date).slice(0, 4));
        const last = years[years.length - 1] || String(new Date().getUTCFullYear() - 1);
        setYear((y) => y || last);
        setTarget((t) => t || last);
      })
      .catch((e: Error) => {
        if (!live) return;
        setSeries({});
        setReadError(e.message);
      });
    return () => {
      live = false;
    };
  }, [iso3]);

  const value = Number(amount.replace(/[, _]/g, ''));
  const results = useMemo(() => (series && Number.isFinite(value) && /^\d{4}$/.test(year) && /^\d{4}$/.test(target) ? convertAll(value, year, target, series) : []), [series, value, year, target]);
  const input = 'px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

  return (
    <section className="ui-panel" data-unit-converter="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ut_title', { country: countryName })}
        </h2>
        <p className="ui-label">{t('ut_intro', { country: countryName })}</p>
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400">{t('ut_amount')}</span>
            <input className={`${input} w-36 tabular-nums`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={t('ut_amountAria')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400">{t('ut_year')}</span>
            <input className={`${input} w-20 tabular-nums`} value={year} onChange={(e) => setYear(e.target.value.trim())} aria-label={t('ut_year')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400">{t('ut_target')}</span>
            <input className={`${input} w-20 tabular-nums`} value={target} onChange={(e) => setTarget(e.target.value.trim())} aria-label={t('ut_targetAria')} />
          </label>
        </div>
        {!series && <p className="ui-body">{t('c_loading')}</p>}
        {series && !Number.isFinite(value) && <p className="text-xs text-amber-700 dark:text-amber-400">{t('ut_nan')}</p>}
        {results.length > 0 && (
          <table className="w-full text-xs" data-converter-results="true">
            <tbody>
              {results.map((r) => (
                <tr key={r.ok ? r.step.label : r.label} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td className="py-1 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx(r.ok ? r.step.label : r.label)}</td>
                  {r.ok ? (
                    <>
                      <td className="py-1 pr-3 tabular-nums text-right whitespace-nowrap text-slate-900 dark:text-white">
                        {fmtAmount(r.step.value)} <span className="text-slate-500">{tx(r.step.unit)}</span>
                      </td>
                      <td className="py-1 text-slate-500">
                        {tx(r.step.how)}. {r.step.source}.
                      </td>
                    </>
                  ) : (
                    <td className="py-1 text-amber-700 dark:text-amber-400" colSpan={2} data-missing="true">
                      {t('c_missingReason', { reason: tx(r.reason) })}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {readError && <p className="text-xs text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ut_what'), error: readError })}</p>}
        {missing.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('ut_notRead', { list: missing.map(tx).join(' ') })}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('c_method', { method: CONVERTER_METHOD })}</p>
      </div>
    </section>
  );
};
