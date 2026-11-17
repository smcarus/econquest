import React, { useEffect, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { RegionalProfile } from '../utils/regional';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Regional figures (R6, src/utils/regional.ts): output per
 * person by region (DOSE), EU regional GDP per person and unemployment (Eurostat NUTS 2) and, from
 * your own file, the subnational Human Development Index (Global Data Lab).
 */

type Reply = RegionalProfile & { iso3: string; sentence: string };

const SHOWN = 12;
const BASIS_KEY = { usd_2015: 'rg_basisUsd2015', lcu2015_usd: 'rg_basisLcu2015', usd_current: 'rg_basisUsdNow' } as const;

const whole = (v: number) => Math.round(v).toLocaleString('en');
const gap = (v: number | undefined, unit = '%') => (v === undefined ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`);

export const RegionalPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    setAll(false);
    fetch(`/api/regional/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const d = reply?.dose;
  const e = reply?.euro;
  const g = reply?.gdl;
  const has = !!(d || e || g);
  const cut = <T,>(rows: T[]) => (all ? rows : rows.slice(0, SHOWN));
  const longest = Math.max(d?.rows.length ?? 0, e?.rows.length ?? 0, g?.rows.length ?? 0);
  const muted = 'text-xs text-slate-500 dark:text-slate-400';
  const amber = 'text-xs text-amber-700 dark:text-amber-400';

  return (
    <section className="ui-panel" data-regional="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <MapPinned className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rg_title', { country: countryName })}
          <ValidationBadge id="regional" />
          {has && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Regional figures, ${countryName}`,
                  value: reply!.sentence,
                  source: reply!.sources,
                  asOf: reply!.asOf || '',
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
        <p className="ui-label">{t('rg_intro')}</p>
      </header>
      <div className="p-4 space-y-4">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('rg_what'), error })}</p>}
        {reply && (
          <div className="space-y-2" data-rg-dose="true">
            <h3 className="text-sm font-medium">{t('rg_doseHead')}</h3>
            {d ? (
              <>
                <p className="ui-body" data-rg-spread={String(d.spread.cvPct)}>
                  {t('rg_doseSummary', {
                    year: String(d.year),
                    top: d.rows[0].name,
                    bottom: d.rows[d.rows.length - 1].name,
                    times: String(d.spread.topBottom),
                    cv: String(d.spread.cvPct),
                  })}
                  {d.spreadThen && ` ${t(d.spreadThen.cvPct > d.spread.cvPct ? 'rg_closer' : d.spreadThen.cvPct < d.spread.cvPct ? 'rg_further' : 'rg_same', { then: String(d.spreadThen.cvPct), year: String(d.spreadThen.year) })}`}
                </p>
                <p className={muted}>
                  {t(BASIS_KEY[d.basis])} {t(d.nationalFrom === 'population_weighted' ? 'rg_nationalWeighted' : 'rg_nationalSimple', { v: whole(d.national) })}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-rg-dose-table="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('rg_tRegion')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('rg_tOutput')}</th>
                        <th className="py-1 font-medium text-right">{t('rg_tGap')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cut(d.rows).map((r) => (
                        <tr key={r.name} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">{r.name}</td>
                          <td className="py-0.5 pr-3 text-right">{whole(r.value)}</td>
                          <td className={`py-0.5 text-right ${r.gapPct < -25 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{gap(r.gapPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className={amber} data-missing="true">
                {t('c_missingReason', { reason: tx(reply.doseMissing || '') })}
              </p>
            )}
          </div>
        )}
        {reply && (e || reply.euroMissing) && (
          <div className="space-y-2" data-rg-euro="true">
            <h3 className="text-sm font-medium">{t('rg_euroHead')}</h3>
            {e ? (
              <>
                {e.gdpSpread && (
                  <p className="ui-body">
                    {t('rg_euroSummary', { times: String(e.gdpSpread.topBottom), year: String(e.gdpYear ?? '') })}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-rg-euro-table="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('rg_tRegion')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('rg_tGdpPps', { year: String(e.gdpYear ?? '') })}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('rg_tGap')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('rg_tUnemp', { year: String(e.unempYear ?? '') })}</th>
                        <th className="py-1 font-medium text-right">{t('rg_tUnempGap')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cut(e.rows).map((r) => (
                        <tr key={r.code} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">
                            {r.name} <span className="text-slate-500 dark:text-slate-400">{r.code}</span>
                          </td>
                          <td className="py-0.5 pr-3 text-right">{r.gdp !== undefined ? whole(r.gdp) : '–'}</td>
                          <td className="py-0.5 pr-3 text-right">{gap(r.gdpGapPct)}</td>
                          <td className="py-0.5 pr-3 text-right">{r.unemp !== undefined ? r.unemp.toFixed(1) : '–'}</td>
                          <td className="py-0.5 text-right">{gap(r.unempGap, '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={muted}>{t('rg_euroNote')}</p>
              </>
            ) : (
              <p className={muted} data-missing="true">
                {t('c_missingReason', { reason: tx(reply.euroMissing || '') })}
              </p>
            )}
          </div>
        )}
        {reply && (
          <div className="space-y-2" data-rg-gdl="true">
            <h3 className="text-sm font-medium">{t('rg_gdlHead')}</h3>
            {g ? (
              <>
                <p className="ui-body">
                  {t('rg_gdlSummary', { year: String(g.year), top: g.rows[0].name, bottom: g.rows[g.rows.length - 1].name, gap: g.topBottomGap.toFixed(3) })}
                  {g.national !== undefined && ` ${t('rg_gdlNational', { v: g.national.toFixed(3) })}`}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-rg-gdl-table="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('rg_tRegion')}</th>
                        <th className="py-1 font-medium text-right">{t('rg_tHdi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cut(g.rows).map((r) => (
                        <tr key={r.name} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">{r.name}</td>
                          <td className="py-0.5 text-right">{r.value.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className={muted} data-missing="true">
                {t('c_missingReason', { reason: tx(reply.gdlMissing || '') })}
              </p>
            )}
          </div>
        )}
        {longest > SHOWN && (
          <button type="button" className="ui-btn text-xs" onClick={() => setAll((v) => !v)} data-rg-more="true">
            {all ? t('rg_fewer') : t('rg_all')}
          </button>
        )}
        {reply && (
          <p className={muted}>
            {t('rg_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
      </div>
    </section>
  );
};
