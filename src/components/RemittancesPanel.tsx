import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { SDG_COST_TARGET, type RemitProfile } from '../utils/remittances';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Remittances (PA1, src/utils/remittances.ts): money sent home by
 * people working abroad, beside exports, foreign direct investment and aid in the same year, how it
 * moved in years exports fell, and what sending it costs. World Bank figures from the saved history.
 */

type Reply = RemitProfile & { iso3: string; sentence: string };

const COMPARE_KEY = { exports_usd: 'rm_exports', fdi_in_usd: 'rm_fdi', aid_usd: 'rm_aid' } as const;

const bn = (v: number | undefined) => (v === undefined ? '–' : v.toFixed(Math.abs(v) >= 10 ? 1 : 2));
const pctSigned = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

export const RemittancesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/remittances/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const usd = (v: number) => (Math.abs(v) >= 1 ? t('rm_bn', { v: v.toFixed(1) }) : t('rm_m', { v: String(Math.round(v * 1000)) }));

  return (
    <section className="ui-panel" data-remittances="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rm_title', { country: countryName })}
          <ValidationBadge id="remittances" />
          {reply?.latest && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Remittances, ${countryName}`,
                  value: reply.sentence,
                  source: reply.sources,
                  asOf: String(reply.latest!.year),
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
        <p className="ui-label">{t('rm_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('rm_what'), error })}</p>}
        {reply && !reply.latest && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.latestMissing || '') })}
          </p>
        )}
        {reply?.latest && (
          <>
            <p className="ui-body" data-rm-latest="true">
              {t('rm_latest', { year: String(reply.latest.year), usd: usd(reply.latest.usd) })}
              {reply.latest.pctGdp !== undefined && t('rm_pctGdp', { pct: reply.latest.pctGdp.toFixed(1) })}
            </p>
            <h3 className="ui-label">{t('rm_compareTitle', { year: String(reply.latest.year) })}</h3>
            <ul className="text-xs space-y-0.5" data-rm-compare="true">
              {reply.compare.map((c) => (
                <li key={c.id} data-rm-compare-row={c.id}>
                  <span className="font-medium">{t(COMPARE_KEY[c.id])}:</span>{' '}
                  {c.usd === undefined ? (
                    <span className="text-amber-700 dark:text-amber-400">{t('rm_noFigure')}</span>
                  ) : c.ratio === undefined ? (
                    <>
                      {usd(c.usd)} <span className="text-slate-500 dark:text-slate-400">{t('rm_noRatio')}</span>
                    </>
                  ) : (
                    <>
                      {usd(c.usd)}; {c.ratio >= 1 ? t('rm_times', { x: c.ratio.toFixed(1) }) : t('rm_share', { pct: String(Math.round(c.ratio * 100)) })}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {reply.years.length > 1 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-rm-table="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('rm_tRemit')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('rm_tExports')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('rm_tFdi')}</th>
                      <th className="py-1 font-medium text-right">{t('rm_tAid')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reply.years.map((y) => (
                      <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{y.year}</td>
                        <td className="py-0.5 pr-3 text-right">{bn(y.remittances)}</td>
                        <td className="py-0.5 pr-3 text-right">{bn(y.exports)}</td>
                        <td className="py-0.5 pr-3 text-right">{bn(y.fdi)}</td>
                        <td className="py-0.5 text-right">{bn(y.aid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('rm_unit')}</p>
              </div>
            )}
            {reply.change && <p className="text-xs">{t('rm_change', { from: String(reply.change.from), to: String(reply.change.to), pct: pctSigned(reply.change.pct) })}</p>}
            <h3 className="ui-label">{t('rm_fallsTitle')}</h3>
            {reply.exportFalls.length ? (
              <ul className="text-xs list-disc pl-5" data-rm-falls="true">
                {reply.exportFalls.map((f) => (
                  <li key={f.year}>{t('rm_fall', { year: String(f.year), e: pctSigned(f.exportsPct), r: pctSigned(f.remittancesPct) })}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">{t('rm_noFalls')}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('rm_fallNote')}</p>
          </>
        )}
        {reply && (
          <>
            <p className="text-xs" data-rm-cost={reply.cost ? String(reply.cost.aboveTarget) : 'missing'}>
              {reply.cost ? (
                <>
                  {t('rm_cost', { pct: reply.cost.pct.toFixed(1), year: String(reply.cost.year) })}{' '}
                  <span className={reply.cost.aboveTarget ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                    {reply.cost.aboveTarget ? t('rm_above', { target: String(SDG_COST_TARGET) }) : t('rm_within', { target: String(SDG_COST_TARGET) })}
                  </span>
                </>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">{t('rm_costMissing', { why: tx(reply.costMissing || '') })}</span>
              )}
            </p>
            {reply.paid && <p className="text-xs">{t('rm_paid', { year: String(reply.paid.year), usd: usd(reply.paid.usd) })}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('rm_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
