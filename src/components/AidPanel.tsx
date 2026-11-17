import React, { useEffect, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { AidProfile, DonorId } from '../utils/aidReceived';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Aid received (PA4, src/utils/aidReceived.ts): net development
 * aid in US dollars and against GNI, government spending, imports and investment, six large donors,
 * and the last ten years. World Bank figures (from OECD DAC) from the saved history.
 */

type Reply = AidProfile & { iso3: string; sentence: string };

const DONOR_KEY: Record<DonorId, 'ad_usa' | 'ad_deu' | 'ad_gbr' | 'ad_fra' | 'ad_jpn' | 'ad_eu'> = {
  aid_from_usa: 'ad_usa',
  aid_from_deu: 'ad_deu',
  aid_from_gbr: 'ad_gbr',
  aid_from_fra: 'ad_fra',
  aid_from_jpn: 'ad_jpn',
  aid_from_eu: 'ad_eu',
};

const bnCell = (v: number) => v.toFixed(Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);

export const AidPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/aid/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const usd = (v: number) => (Math.abs(v) >= 1 ? t('rm_bn', { v: v.toFixed(1) }) : t('rm_m', { v: String(Math.round(v * 1000)) }));
  const l = reply?.latest;

  return (
    <section className="ui-panel" data-aid="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ad_title', { country: countryName })}
          <ValidationBadge id="aid_received" />
          {l && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Aid received, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: String(l.year),
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
        <p className="ui-label">{t('ad_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ad_what'), error })}</p>}
        {reply && !l && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.latestMissing || '') })}
          </p>
        )}
        {reply && l && (
          <>
            <p className="ui-body" data-ad-latest="true">
              {t('ad_latest', { year: String(l.year), usd: usd(l.usd) })}
              {reply.change1y !== undefined && ` ${t('ad_change1y', { pct: `${reply.change1y > 0 ? '+' : ''}${reply.change1y.toFixed(1)}%` })}`}
            </p>
            <h3 className="ui-label">{t('ad_sizeTitle', { year: String(l.year) })}</h3>
            <ul className="text-xs space-y-0.5" data-ad-ratios="true">
              <li>
                {t('ad_gni')}: {l.gni !== undefined ? `${l.gni.toFixed(1)}%` : <span className="text-amber-700 dark:text-amber-400">{t('ad_noFigure')}</span>}
              </li>
              <li>
                {t('ad_govExpense')}: {l.govExpense !== undefined ? `${l.govExpense.toFixed(1)}%` : <span className="text-amber-700 dark:text-amber-400">{t('ad_noFigure')}</span>}
              </li>
              <li>
                {t('ad_imports')}: {l.imports !== undefined ? `${l.imports.toFixed(1)}%` : <span className="text-amber-700 dark:text-amber-400">{t('ad_noFigure')}</span>}
              </li>
              <li>
                {t('ad_investment')}: {l.investment !== undefined ? `${l.investment.toFixed(1)}%` : <span className="text-amber-700 dark:text-amber-400">{t('ad_noFigure')}</span>}
              </li>
              <li>
                {t('ad_perPerson')}: {l.perPerson !== undefined ? t('ad_usdPerson', { v: l.perPerson.toFixed(1) }) : <span className="text-amber-700 dark:text-amber-400">{t('ad_noFigure')}</span>}
              </li>
            </ul>
            {reply.years.length > 1 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ad-table="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('ad_tUsd')}</th>
                      <th className="py-1 font-medium text-right">{t('ad_tGni')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reply.years.map((y) => (
                      <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{y.year}</td>
                        <td className="py-0.5 pr-3 text-right">{bnCell(y.usd)}</td>
                        <td className="py-0.5 text-right">{y.gni === undefined ? '–' : y.gni.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reply.peak && (
              <p className="text-xs" data-ad-peak={String(reply.peak.belowPct)}>
                {reply.peak.belowPct > 0 ? t('ad_belowPeak', { pct: reply.peak.belowPct.toFixed(1), year: String(reply.peak.year) }) : t('ad_atPeak')}
              </p>
            )}
            <h3 className="ui-label">{reply.donorYear !== undefined ? t('ad_donorsTitle', { year: String(reply.donorYear) }) : t('ad_donorsTitleNoYear')}</h3>
            {reply.donors.length ? (
              <ul className="text-xs space-y-0.5" data-ad-donors="true">
                {reply.donors.map((d) => (
                  <li key={d.id} data-ad-donor={d.id}>
                    <span className="font-medium">{t(DONOR_KEY[d.id])}:</span> {usd(d.usd)}
                    {d.sharePct !== undefined && <span className="text-slate-500 dark:text-slate-400"> {t('ad_share', { pct: d.sharePct.toFixed(1) })}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('ad_noDonors')}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('ad_donorNote')}</p>
          </>
        )}
        {reply && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ad_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
      </div>
    </section>
  );
};
