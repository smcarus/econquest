import React, { useEffect, useState } from 'react';
import { Apple } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { FAO_CPI_NO_FILE, FAO_CPI_SETUP_HELP, type FoodView } from '../utils/foodPrices';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Food prices and food security (PA2, src/utils/foodPrices.ts):
 * food price inflation against all prices (FAOSTAT file the user saves), hunger and food insecurity,
 * net food imports as % of GDP, and world prices of staple foods.
 */

type Reply = FoodView & { iso3: string; sentence: string };

const signed = (v: number | undefined) => (v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const amber = 'text-amber-700 dark:text-amber-400';
const muted = 'text-xs text-slate-500 dark:text-slate-400';

export const FoodPricesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/food-prices/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const hasAny = reply && (reply.inflation || reply.security || reply.trade);
  const inf = reply?.inflation;

  return (
    <section className="ui-panel" data-food-prices="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Apple className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('fp_title', { country: countryName })}
          <ValidationBadge id="food_prices" />
          {hasAny && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Food prices and food security, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: inf?.month || String(reply!.trade?.year ?? reply!.security?.undernourishment?.year ?? ''),
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
        <p className="ui-label">{t('fp_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className={`text-sm ${amber}`}>{t('c_couldNotRead', { what: t('fp_what'), error })}</p>}
        {reply && (
          <>
            <h3 className="ui-label">{t('fp_inflationTitle')}</h3>
            {inf ? (
              <div className="space-y-1" data-fp-inflation="true">
                <p className="ui-body">
                  {t('fp_inflation', { month: inf.month, food: signed(inf.food) })}
                  {inf.general !== undefined && ` ${t('fp_general', { general: signed(inf.general) })}`}
                </p>
                {inf.gap !== undefined && (
                  <p className="text-xs" data-fp-gap={String(inf.gap)}>
                    {inf.gap > 0 ? t('fp_gapAbove', { pts: inf.gap.toFixed(1) }) : inf.gap < 0 ? t('fp_gapBelow', { pts: (-inf.gap).toFixed(1) }) : t('fp_gapNone')}
                  </p>
                )}
                {inf.months.length > 1 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-fp-table="true">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400">
                          <th className="py-1 pr-3 font-medium">{t('fp_tMonth')}</th>
                          <th className="py-1 pr-3 font-medium text-right">{t('fp_tFood')}</th>
                          <th className="py-1 font-medium text-right">{t('fp_tGeneral')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inf.months.slice(-12).map((m) => (
                          <tr key={m.month} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-0.5 pr-3">{m.month}</td>
                            <td className="py-0.5 pr-3 text-right">{signed(m.food)}</td>
                            <td className="py-0.5 text-right">{signed(m.general)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {inf.peak && inf.peak.month !== inf.month && <p className="text-xs">{t('fp_peak', { month: inf.peak.month, food: signed(inf.peak.food) })}</p>}
                <p className={muted}>{t('fp_inflationNote', { file: reply.inflationFile || '' })}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className={`text-xs ${amber}`} data-missing="true">
                  {t('c_missingReason', { reason: tx(reply.inflationMissing || '') })}
                </p>
                {(reply.inflationMissing === FAO_CPI_NO_FILE || !reply.inflationFile) && <p className={muted}>{tx(FAO_CPI_SETUP_HELP)}</p>}
              </div>
            )}

            <h3 className="ui-label">{t('fp_securityTitle')}</h3>
            {reply.security ? (
              <ul className="text-xs space-y-0.5" data-fp-security="true">
                <li>
                  {t('fp_under')}: {reply.security.undernourishment ? t('fp_pctYear', { v: reply.security.undernourishment.value.toFixed(1), year: String(reply.security.undernourishment.year) }) : <span className={amber}>{t('fp_noFigure')}</span>}
                </li>
                <li>
                  {t('fp_insecure')}: {reply.security.insecurity ? t('fp_pctYear', { v: reply.security.insecurity.value.toFixed(1), year: String(reply.security.insecurity.year) }) : <span className={amber}>{t('fp_noFigure')}</span>}
                </li>
                <li>
                  {t('fp_severe')}: {reply.security.severe ? t('fp_pctYear', { v: reply.security.severe.value.toFixed(1), year: String(reply.security.severe.year) }) : <span className={amber}>{t('fp_noFigure')}</span>}
                </li>
              </ul>
            ) : (
              <p className={`text-xs ${amber}`}>{t('c_missingReason', { reason: tx(reply.securityMissing || '') })}</p>
            )}
            <p className={muted}>{t('fp_securityNote')}</p>

            <h3 className="ui-label">{t('fp_tradeTitle')}</h3>
            {reply.trade ? (
              <div className="space-y-0.5 text-xs" data-fp-trade={String(reply.trade.netImportsPctGdp)}>
                <p>{t('fp_tradeShares', { imp: reply.trade.importShare.toFixed(1), exp: reply.trade.exportShare.toFixed(1), year: String(reply.trade.year) })}</p>
                <p className="font-medium">
                  {reply.trade.netImportsPctGdp > 0
                    ? t('fp_netImporter', { v: reply.trade.netImportsPctGdp.toFixed(2) })
                    : t('fp_netExporter', { v: (-reply.trade.netImportsPctGdp).toFixed(2) })}
                </p>
              </div>
            ) : (
              <p className={`text-xs ${amber}`}>{t('c_missingReason', { reason: tx(reply.tradeMissing || '') })}</p>
            )}

            <h3 className="ui-label">{t('fp_worldTitle')}</h3>
            {reply.staples.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-fp-staples="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('fp_tStaple')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('ct_t1m')}</th>
                      <th className="py-1 font-medium text-right">{t('ct_t12m')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reply.staples.map((s) => (
                      <tr key={s.code} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{tx(s.name)}</td>
                        <td className="py-0.5 pr-3 text-right">{signed(s.move1m)}</td>
                        <td className="py-0.5 text-right">{signed(s.move12m)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={muted}>{t('fp_worldNote', { month: reply.staples[0].asOf })}</p>
              </div>
            ) : (
              <p className={`text-xs ${amber}`}>{t('c_missingReason', { reason: tx(reply.staplesMissing || '') })}</p>
            )}
            <p className={muted}>
              {t('fp_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
