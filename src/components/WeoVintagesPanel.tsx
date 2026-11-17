import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';
import { WEO_VINTAGE_CODES, WEO_VINTAGE_LABELS, vintageLabel, type WeoVintageReply } from '../utils/weoVintages';
import type { WeoMissReply } from '../utils/missBands';

/**
 * Country Research > History & data > IMF forecasts by edition: every saved WEO edition's figure for
 * one year (src/utils/weoVintages.ts), from the files in data/local/weo-vintages/. Shows how the
 * IMF's number moved and whether each was a projection, an estimate or data at the time.
 */

const KIND = { actual: 'weo_kind_actual', estimate: 'weo_kind_estimate', projection: 'weo_kind_projection' } as const;

export const WeoVintagesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [code, setCode] = useState<string>('NGDP_RPCH');
  const [year, setYear] = useState<string>('');
  const [reply, setReply] = useState<WeoVintageReply | null>(null);
  const [bands, setBands] = useState<WeoMissReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setError(null);
    const q = new URLSearchParams({ code, ...(year ? { year } : {}), ...(tick ? { fresh: '1' } : {}) });
    fetch(`/api/weo-vintages/${encodeURIComponent(iso3)}?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: WeoVintageReply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, code, year, tick]);

  // R8: range around the latest edition's projections from past IMF misses (src/utils/missBands.ts).
  useEffect(() => {
    let live = true;
    setBands(null);
    fetch(`/api/weo-vintages/${encodeURIComponent(iso3)}/bands?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: WeoMissReply | null) => live && setBands(b))
      .catch(() => live && setBands(null));
    return () => {
      live = false;
    };
  }, [iso3, code, tick]);

  const MISS_WHY = { none_saved: 'weo_missNoneSaved', no_series: 'weo_missNoSeries', no_years: 'weo_missNoYears' } as const;

  return (
    <section className="ui-panel" data-weo-vintages="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('weo_title', { country: countryName })}
        </h2>
        <p className="ui-label">{t('weo_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('weo_what'), error })}</p>}
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {reply && reply.editions === 0 && (
          <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1" data-missing="true">
            <p>{t('weo_none')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('weo_howTo')}{' '}
              <button type="button" className="underline" onClick={() => setTick((n) => n + 1)}>{t('weo_readAgainLink')}</button>. {t('weo_nothingFetched')}
            </p>
          </div>
        )}
        {reply && reply.editions > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                {t('weo_indicator')}
                <select className="px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={code} onChange={(e) => { setCode(e.target.value); setYear(''); }}>
                  {WEO_VINTAGE_CODES.map((c) => (
                    <option key={c} value={c}>{tx(WEO_VINTAGE_LABELS[c])}</option>
                  ))}
                </select>
              </label>
              {reply.years.length > 0 && (
                <label className="flex items-center gap-1">
                  {t('c_year')}
                  <select className="px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={reply.year ?? ''} onChange={(e) => setYear(e.target.value)}>
                    {reply.years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
              )}
              <button type="button" className="ui-pill" onClick={() => setTick((n) => n + 1)}>{t('weo_readAgain')}</button>
            </div>
            {!reply.releases.length ? (
              <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">{t('weo_noneHas', { n: reply.editions, label: tx(reply.label).toLowerCase(), country: countryName })}</p>
            ) : (
              <>
                {reply.sentence && <p className="text-sm text-slate-900 dark:text-white" data-weo-vintage-sentence="true">{tx(reply.sentence)}</p>}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('weo_edition')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{tx(reply.label)}, {reply.year}</th>
                      <th className="py-1 font-medium">{t('weo_atTime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reply.releases.map((r) => (
                      <tr key={r.vintage} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3">{r.label}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">{r.value}</td>
                        <td className="py-1 text-slate-500 dark:text-slate-400">{r.kind in KIND ? t(KIND[r.kind as keyof typeof KIND]) : r.kind}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('weo_source')}</p>
              </>
            )}
            {bands && (
              <div className="overflow-x-auto pt-2" data-weo-miss-bands="true">
                <h3 className="ui-label font-medium">{t('weo_missTitle')}</h3>
                {bands.why ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">{t(MISS_WHY[bands.why])}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('weo_missIntro', { season: t(bands.season === 'april' ? 'weo_missApril' : 'weo_missOctober'), country: countryName, edition: bands.editionLabel ?? '' })}
                    </p>
                    <table className="w-full text-sm tabular-nums mt-1">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                          <th className="py-1 pr-3 font-medium">{t('weo_missYear')}</th>
                          <th className="py-1 pr-3 font-medium">{t('weo_missProj')}</th>
                          <th className="py-1 pr-3 font-medium">{t('fc_miss70')}</th>
                          <th className="py-1 pr-3 font-medium">{t('fc_miss90')}</th>
                          <th className="py-1 pr-3 font-medium">{t('fc_missAvg')}</th>
                          <th className="py-1 pr-3 font-medium">{t('fc_missCases')}</th>
                          <th className="py-1 font-medium">{t('weo_missUsed')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bands.rows.map((r) => (
                          <tr key={r.year} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-1 pr-3">{r.year}</td>
                            <td className="py-1 pr-3">{r.projection}</td>
                            {r.range && r.span ? (
                              <>
                                <td className="py-1 pr-3">{t('c_range', { from: r.range.lo70, to: r.range.hi70 })}</td>
                                <td className="py-1 pr-3">{t('c_range', { from: r.range.lo90, to: r.range.hi90 })}</td>
                                <td className="py-1 pr-3">{r.range.meanMiss > 0 ? '+' : ''}{r.range.meanMiss}</td>
                                <td className="py-1 pr-3">{r.range.cases}</td>
                                <td className="py-1">{t('weo_missEditions', { from: vintageLabel(r.span.from), to: vintageLabel(r.span.to) })}</td>
                              </>
                            ) : (
                              <td colSpan={5} className="py-1 text-amber-700 dark:text-amber-400" data-missing="true">{t('weo_missFew', { n: r.cases ?? 0 })}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
