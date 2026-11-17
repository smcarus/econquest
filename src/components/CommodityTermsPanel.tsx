import React, { useEffect, useState } from 'react';
import { Wheat } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { DEPENDENCE_LINE, type CommodityTerms, type GroupId } from '../utils/commodityTerms';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Commodity prices and terms of trade (PA3,
 * src/utils/commodityTerms.ts): what the country sells and buys in fuel, ores and metals and food,
 * how the World Bank monthly prices of those moved, the rough effect on income as % of GDP, and the
 * yearly terms of trade index.
 */

type Reply = CommodityTerms & { iso3: string; sentence: string };

const GROUP_KEY: Record<GroupId, 'ct_fuel' | 'ct_ores_metals' | 'ct_food'> = { fuel: 'ct_fuel', ores_metals: 'ct_ores_metals', food: 'ct_food' };

const signed = (v: number | undefined, digits = 1) => (v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}`);
const pctCell = (v: number | undefined) => (v === undefined ? '–' : `${v.toFixed(1)}%`);
const tone = (v: number | undefined) => (v === undefined || v === 0 ? '' : v > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400');

export const CommodityTermsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/commodity-terms/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const hasAny = reply && (reply.mixYear !== undefined || reply.tot);

  return (
    <section className="ui-panel" data-commodity-terms="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Wheat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ct_title', { country: countryName })}
          <ValidationBadge id="commodity_terms" />
          {hasAny && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Commodity prices and terms of trade, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: reply!.pricesAsOf || String(reply!.mixYear ?? reply!.tot?.year ?? ''),
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
        <p className="ui-label">{t('ct_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ct_what'), error })}</p>}
        {reply && reply.mixYear === undefined && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.mixMissing || '') })}
          </p>
        )}
        {reply && reply.mixYear !== undefined && (
          <>
            <h3 className="ui-label">{t('ct_mixTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ct-table="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('ct_tGroup')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ct_tExports')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ct_tImports')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ct_t1m')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ct_t12m')}</th>
                    <th className="py-1 font-medium text-right">{t('ct_tEffect')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.groups.map((g) => (
                    <tr key={g.id} className="border-t border-slate-100 dark:border-slate-800" data-ct-row={g.id} title={g.prices.map((p) => p.name).join(', ')}>
                      <td className="py-0.5 pr-3">{t(GROUP_KEY[g.id])}</td>
                      <td className="py-0.5 pr-3 text-right">{pctCell(g.exportShare)}</td>
                      <td className="py-0.5 pr-3 text-right">{pctCell(g.importShare)}</td>
                      <td className="py-0.5 pr-3 text-right">{g.move1m === undefined ? '–' : `${signed(g.move1m)}%`}</td>
                      <td className="py-0.5 pr-3 text-right">{g.move12m === undefined ? '–' : `${signed(g.move12m)}%`}</td>
                      <td className={`py-0.5 text-right ${tone(g.effectPctGdp)}`}>{signed(g.effectPctGdp, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {reply.pricesAsOf ? t('ct_shareYear', { year: String(reply.mixYear), month: reply.pricesAsOf }) : t('ct_sharesOnly', { year: String(reply.mixYear) })}
              </p>
            </div>
            {reply.pricesMissing && <p className="text-xs text-amber-700 dark:text-amber-400">{t('ct_pricesMissing', { why: tx(reply.pricesMissing) })}</p>}
            {reply.exportsPctGdp !== undefined && reply.importsPctGdp !== undefined ? (
              <p className="text-xs">{t('ct_tradeGdp', { x: reply.exportsPctGdp.toFixed(1), m: reply.importsPctGdp.toFixed(1), year: String(reply.mixYear) })}</p>
            ) : (
              reply.effectMissing && <p className="text-xs text-amber-700 dark:text-amber-400">{t('ct_effectMissing', { why: tx(reply.effectMissing) })}</p>
            )}
            {reply.netEffectPctGdp !== undefined && (
              <p className={`ui-body ${tone(reply.netEffectPctGdp)}`} data-ct-net={String(reply.netEffectPctGdp)}>
                {reply.netEffectPctGdp >= 0 ? t('ct_netGain', { v: reply.netEffectPctGdp.toFixed(2) }) : t('ct_netLoss', { v: (-reply.netEffectPctGdp).toFixed(2) })}
              </p>
            )}
            {reply.netEffectPctGdp !== undefined && <p className="text-xs text-slate-500 dark:text-slate-400">{t('ct_netNote')}</p>}
            {reply.commodityExportShare !== undefined && (
              <p className="text-xs" data-ct-dependent={String(Boolean(reply.dependent))}>
                {t(reply.dependent ? 'ct_dependent' : 'ct_notDependent', { pct: reply.commodityExportShare.toFixed(1), line: String(DEPENDENCE_LINE) })} {t('ct_dependNote')}
              </p>
            )}
          </>
        )}
        {reply && (
          <>
            <h3 className="ui-label">{t('ct_totTitle')}</h3>
            {reply.tot ? (
              <div data-ct-tot="true" className="space-y-1">
                <p className="text-xs">
                  {t('ct_tot', { v: reply.tot.value.toFixed(1), year: String(reply.tot.year) })}
                  {reply.tot.change1y !== undefined && <>; {t('ct_tot1y', { pct: `${signed(reply.tot.change1y)}%` })}</>}
                  {reply.tot.change5y !== undefined && <>; {t('ct_tot5y', { pct: `${signed(reply.tot.change5y)}%` })}</>}
                </p>
                {reply.tot.years.length > 1 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 [font-variant-numeric:tabular-nums]">{reply.tot.years.map((y) => `${y.year}: ${y.value.toFixed(1)}`).join(' · ')}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('ct_totNote')}</p>
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('c_missingReason', { reason: tx(reply.totMissing || '') })}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('ct_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
