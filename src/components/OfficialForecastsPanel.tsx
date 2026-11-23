import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import type { ForecastMissingWhy, ForecastSourceId, OfficialForecastsReply } from '../utils/officialForecasts';

/**
 * Country Research > History & data > IMF forecasts by edition > Official forecasts side by side
 * (CG2, src/utils/officialForecasts.ts): this year's and the next two years' growth and inflation
 * forecasts from the IMF, the World Bank, the OECD and (United States, your file) the Philadelphia
 * Fed, with the spread between them. Read from the daily download's saved copy.
 */

const SRC: Record<ForecastSourceId, 'of_src_imf_weo' | 'of_src_wb_gep' | 'of_src_oecd_eo' | 'of_src_philly_spf'> = {
  imf_weo: 'of_src_imf_weo',
  wb_gep: 'of_src_wb_gep',
  oecd_eo: 'of_src_oecd_eo',
  philly_spf: 'of_src_philly_spf',
};

const WHY: Record<ForecastMissingWhy, 'of_why_not_downloaded' | 'of_why_not_read' | 'of_why_no_years' | 'of_why_not_in_gep' | 'of_why_not_in_oecd' | 'of_why_philly_no_file' | 'of_why_philly_bad_file'> = {
  not_downloaded: 'of_why_not_downloaded',
  not_read: 'of_why_not_read',
  no_years: 'of_why_no_years',
  not_in_gep: 'of_why_not_in_gep',
  not_in_oecd: 'of_why_not_in_oecd',
  philly_no_file: 'of_why_philly_no_file',
  philly_bad_file: 'of_why_philly_bad_file',
};

export const OfficialForecastsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<OfficialForecastsReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/official-forecasts/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: OfficialForecastsReply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const gdp = reply?.measures.find((m) => m.measure === 'gdp');
  const next = reply?.years[1];
  const nextVals = next && gdp ? gdp.rows.filter((r) => r.basis === 'annual_average' && typeof r.values[next] === 'number').map((r) => r.values[next]) : [];
  const lo = nextVals.length ? Math.min(...nextVals) : 0;
  const hi = nextVals.length ? Math.max(...nextVals) : 0;

  return (
    <section className="ui-panel" data-official-forecasts="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('of_title')}
        </h2>
        <p className="ui-label">{t('of_intro', { country: countryName })}</p>
      </header>
      <div className="p-4 space-y-3">
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('of_title'), error })}</p>}
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {reply && next && nextVals.length >= 2 && (
          <p className="text-sm text-slate-900 dark:text-white" data-official-forecasts-sentence="true">
            {lo === hi
              ? t('of_sentenceSame', { year: next, n: nextVals.length, lo })
              : t('of_sentenceRange', { year: next, n: nextVals.length, lo, hi, spread: Math.round((hi - lo) * 10) / 10 })}
          </p>
        )}
        {reply &&
          reply.measures.map((m) => (
            <div key={m.measure} className="overflow-x-auto" data-official-forecasts-measure={m.measure}>
              <h3 className="ui-label font-medium">{t(m.measure === 'gdp' ? 'of_gdp' : 'of_cpi')}</h3>
              {m.rows.length > 0 && (
                <table className="w-full text-sm tabular-nums mt-1">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('of_source')}</th>
                      {reply.years.map((y) => (
                        <th key={y} className="py-1 pr-3 font-medium text-right">{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.rows.map((r) => (
                      <tr key={r.source} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3">
                          {t(SRC[r.source])}
                          {r.edition && <span className="text-xs text-slate-500 dark:text-slate-400"> ({r.edition})</span>}
                          {r.basis === 'q4_on_q4' && <span className="block text-xs text-slate-500 dark:text-slate-400">{t('of_q4')}</span>}
                        </td>
                        {reply.years.map((y) => (
                          <td key={y} className="py-1 pr-3 text-right">{typeof r.values[y] === 'number' ? r.values[y] : <span className="text-slate-400" data-missing="true">{t('c_missing')}</span>}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <td className="py-1 pr-3 text-xs">{t('of_spread')}</td>
                      {m.spread.map((c) => (
                        <td key={c.year} className="py-1 pr-3 text-right text-xs">{c.spread === null ? t('of_spreadNone') : c.spread}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
              {m.missing.length > 0 && (
                <ul className="mt-1 text-xs text-amber-700 dark:text-amber-400 space-y-0.5" data-missing="true">
                  {m.missing.map((x) => (
                    <li key={x.source}>
                      {t(SRC[x.source])}: {t(WHY[x.why], { from: reply.years[0], to: reply.years[reply.years.length - 1] })}
                      {x.detail && <span className="text-slate-500 dark:text-slate-400"> ({x.detail})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        {reply?.pulledAt && <p className="text-xs text-slate-500 dark:text-slate-400">{t('of_copy', { date: reply.pulledAt.slice(0, 10) })}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('of_method')}</p>
      </div>
    </section>
  );
};
