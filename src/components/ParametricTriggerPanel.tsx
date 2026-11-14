import React, { useEffect, useMemo, useState } from 'react';
import { Umbrella } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { explainInChat } from '../utils/explainHandoff';
import {
  burnAnalysis,
  burnSentence,
  DEFAULT_LOADING,
  loadingProblem,
  priceCover,
  priceSentence,
  type LoadingMethod,
  designProblem,
  peakSeason,
  seasonMonths,
  seasonValues,
  suggestLevels,
  type IndexAgg,
  type TriggerDesign,
  type TriggerDirection,
} from '../utils/parametricTrigger';
import { rarity, raritySentence } from '../utils/extremeValues';
import { useLang, useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Parametric insurance: trigger designer and burn analysis (I5,
 * src/utils/parametricTrigger.ts). Pick an index the app already holds (country or capital rainfall
 * and temperature, world food prices), a season, a trigger, an exit and a cover; the panel replays the
 * design over every past season. Reads /api/series; nothing new is fetched.
 */

type IndexKey = 'country_rain' | 'weather_rain' | 'country_temp' | 'weather_temp' | 'rice' | 'wheat' | 'maize' | 'soybeans';

const INDEXES: Record<IndexKey, { url: (iso3: string) => string; agg: IndexAgg; direction: TriggerDirection; season: number | 'year'; label: string; key: keyof typeof PANELS.en }> = {
  country_rain: { url: (c) => `/api/series/${c}/country_rain`, agg: 'sum', direction: 'below', season: 4, label: 'rainfall, country average', key: 'ins_idxCountryRain' },
  weather_rain: { url: (c) => `/api/series/${c}/weather_rain`, agg: 'sum', direction: 'below', season: 4, label: 'rainfall at the capital', key: 'ins_idxCapitalRain' },
  country_temp: { url: (c) => `/api/series/${c}/country_temp`, agg: 'mean', direction: 'above', season: 3, label: 'temperature, country average', key: 'ins_idxCountryTemp' },
  weather_temp: { url: (c) => `/api/series/${c}/weather_temp`, agg: 'mean', direction: 'above', season: 3, label: 'temperature at the capital', key: 'ins_idxCapitalTemp' },
  rice: { url: () => '/api/series/world/commodity_pink_sheet_rice_05', agg: 'mean', direction: 'above', season: 'year', label: 'world rice price (Thai 5%)', key: 'ins_idxRice' },
  wheat: { url: () => '/api/series/world/commodity_pink_sheet_wheat_us_hrw', agg: 'mean', direction: 'above', season: 'year', label: 'world wheat price (US HRW)', key: 'ins_idxWheat' },
  maize: { url: () => '/api/series/world/commodity_pink_sheet_maize', agg: 'mean', direction: 'above', season: 'year', label: 'world maize price', key: 'ins_idxMaize' },
  soybeans: { url: () => '/api/series/world/commodity_pink_sheet_soybeans', agg: 'mean', direction: 'above', season: 'year', label: 'world soybean price', key: 'ins_idxSoybeans' },
};

interface SeriesReply {
  points: Array<{ date: string; value: number }>;
  unit: string;
  source: string;
  label: string;
}

const amber = 'text-amber-700 dark:text-amber-400';
const muted = 'text-xs text-slate-500 dark:text-slate-400';
const field = 'px-2 py-1 text-xs tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100';
const input = `${field} w-28`;

export const ParametricTriggerPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const t = useT(PANELS);
  const tx = useTx();
  const lang = useLang();
  const [which, setWhich] = useState<IndexKey>('country_rain');
  const [series, setSeries] = useState<SeriesReply | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [design, setDesign] = useState<TriggerDesign | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loadMethod, setLoadMethod] = useState<LoadingMethod>('expected');
  const [loadValue, setLoadValue] = useState<number>(DEFAULT_LOADING.expected);
  const [basis, setBasis] = useState<'all' | 'recent'>('all');
  const def = INDEXES[which];
  const monthName = (m: number) => new Date(Date.UTC(2000, m - 1, 1)).toLocaleString(lang, { month: 'long', timeZone: 'UTC' });

  useEffect(() => {
    let live = true;
    setSeries(null);
    setMissing(null);
    setDesign(null);
    fetch(def.url(encodeURIComponent(iso3)))
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok || !Array.isArray(b.points)) {
          setMissing(b.reason || b.message || `HTTP ${r.status}`);
          return;
        }
        setSeries(b as SeriesReply);
        // Defaults: the main season of the record, and trigger and exit passed about 1 year in 5 and 1 in 20.
        const peak = def.season === 'year' ? { startMonth: 1, endMonth: 12 } : peakSeason(b.points, def.season) || { startMonth: 1, endMonth: 12 };
        const levels = suggestLevels(seasonValues(b.points, peak.startMonth, peak.endMonth, def.agg), def.direction);
        setDesign({ ...peak, agg: def.agg, direction: def.direction, trigger: levels?.trigger ?? 0, exit: levels?.exit ?? 0, cover: 1_000_000 });
      })
      .catch((e: Error) => live && setMissing(e.message));
    return () => {
      live = false;
    };
  }, [iso3, which]); // eslint-disable-line react-hooks/exhaustive-deps

  const seasons = useMemo(() => (series && design ? seasonValues(series.points, design.startMonth, design.endMonth, design.agg) : []), [series, design?.startMonth, design?.endMonth, design?.agg]); // eslint-disable-line react-hooks/exhaustive-deps
  const problem = design ? designProblem(design) : null;
  const burn = design && !problem ? burnAnalysis(seasons, design) : null;
  const unit = series?.unit ?? '';
  const n = (v: number, digits = 0) => v.toLocaleString(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const set = (patch: Partial<TriggerDesign>) => setDesign((d) => (d ? { ...d, ...patch } : d));
  const fromHistory = () => {
    if (!design) return;
    const levels = suggestLevels(seasons, design.direction);
    if (levels) set(levels);
  };
  const loading = { method: loadMethod, value: loadValue };
  const basisStats = burn ? (basis === 'recent' && burn.recent ? burn.recent : burn) : null;
  const price = burn && design && basisStats ? priceCover(basisStats, design.cover, loading) : null;
  const loadProblem = loadingProblem(loading);
  const rare = useMemo(() => (burn && design ? rarity(seasons, design) : null), [burn, seasons, design?.direction, design?.trigger, design?.exit]); // eslint-disable-line react-hooks/exhaustive-deps
  const sentence = burn && design ? `${burnSentence(burn, design, def.label, unit)}${price ? ` ${priceSentence(price, loading)}` : ''}${rare ? ` ${raritySentence(rare, unit)}` : ''}` : '';
  const rows = burn ? (showAll ? burn.rows : burn.rows.filter((r) => r.payoutPct > 0)) : [];
  const seasonLabel = design ? t('ins_seasonOf', { from: monthName(design.startMonth), to: monthName(design.endMonth), n: String(seasonMonths(design.startMonth, design.endMonth).length) }) : '';

  return (
    <section className="ui-panel" data-parametric-trigger="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Umbrella className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ins_title', { country: countryName })}
          <ValidationBadge id="parametric_trigger" />
          {burn && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Parametric insurance trigger, ${countryName}`,
                  value: sentence,
                  source: series!.source,
                  asOf: String(burn.to),
                  iso3,
                  countryName,
                  detail: [
                    'Straight-line payout from trigger to exit, replayed over every complete past season; burn cost = average yearly payout as % of the cover, before any loading.',
                    'Fair price = burn cost x (1 + loading %) or burn cost + k x standard deviation of the yearly payout, as the user picks; 90% range applies the same loading to burn cost +/- 1.645 standard errors (SD / square root of the number of seasons).',
                  ],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('ins_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end text-xs">
          <label className="flex flex-col gap-1">
            <span className="ui-label">{t('ins_index')}</span>
            <select className={field} value={which} onChange={(e) => setWhich(e.target.value as IndexKey)} data-ins-index="true">
              {(Object.keys(INDEXES) as IndexKey[]).map((k) => (
                <option key={k} value={k}>
                  {t(INDEXES[k].key)}
                </option>
              ))}
            </select>
          </label>
          {design && (
            <>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_from')}</span>
                <select className={field} value={design.startMonth} onChange={(e) => set({ startMonth: Number(e.target.value) })} data-ins-start="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {monthName(i + 1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_to')}</span>
                <select className={field} value={design.endMonth} onChange={(e) => set({ endMonth: Number(e.target.value) })} data-ins-end="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {monthName(i + 1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_pays')}</span>
                <select className={field} value={design.direction} onChange={(e) => set({ direction: e.target.value as TriggerDirection })} data-ins-direction="true">
                  <option value="below">{t('ins_below')}</option>
                  <option value="above">{t('ins_above')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_trigger', { unit })}</span>
                <input type="number" className={input} value={design.trigger} onChange={(e) => set({ trigger: Number(e.target.value) })} data-ins-trigger="true" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_exit', { unit })}</span>
                <input type="number" className={input} value={design.exit} onChange={(e) => set({ exit: Number(e.target.value) })} data-ins-exit="true" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="ui-label">{t('ins_cover')}</span>
                <input type="number" min={0} className={input} value={design.cover} onChange={(e) => set({ cover: Number(e.target.value) })} data-ins-cover="true" />
              </label>
              <button type="button" className="ui-btn text-xs" onClick={fromHistory} data-ins-from-history="true">
                {t('ins_fromHistory')}
              </button>
            </>
          )}
        </div>

        {!series && !missing && <p className="ui-body">{t('c_loading')}</p>}
        {missing && (
          <p className={`text-sm ${amber}`} data-missing="true">
            {t('c_missingReason', { reason: tx(missing.replace(/\.$/, '')) })}
          </p>
        )}
        {design && <p className={muted}>{design.agg === 'sum' ? t('ins_aggSum', { season: seasonLabel }) : t('ins_aggMean', { season: seasonLabel })}</p>}
        {problem && (
          <p className={`text-sm ${amber}`} data-ins-problem="true">
            {tx(problem)}
          </p>
        )}
        {series && design && !problem && !burn && (
          <p className={`text-sm ${amber}`} data-missing="true">
            {t('ins_tooFew', { n: String(seasons.length) })}
          </p>
        )}
        {burn && design && (
          <>
            <p className="ui-body" data-ins-summary={String(burn.paying)}>
              {t('ins_summary', { paying: String(burn.paying), years: String(burn.years), from: String(burn.from), to: String(burn.to) })}
              {burn.paying > 0 && ` ${t('ins_oneIn', { n: String(Math.round(burn.years / burn.paying)) })}`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs [font-variant-numeric:tabular-nums]" data-ins-stats="true">
              <div>
                <div className="ui-label">{t('ins_burn')}</div>
                <div className="font-medium" data-ins-burn={String(burn.burnPct)}>
                  {n(burn.burnPct, 2)}% · {n(burn.burnAmount)}
                </div>
              </div>
              <div>
                <div className="ui-label">{t('ins_sd')}</div>
                <div className="font-medium">{n(burn.sdPct, 2)}%</div>
              </div>
              <div>
                <div className="ui-label">{t('ins_largest')}</div>
                <div className="font-medium">
                  {n(burn.maxPct, 1)}%{burn.maxYear ? ` (${burn.maxYear})` : ''}
                </div>
              </div>
              <div>
                <div className="ui-label">{t('ins_frequency')}</div>
                <div className="font-medium">{n(burn.frequencyPct, 1)}%</div>
              </div>
            </div>
            {burn.recent && (
              <p className="text-xs" data-ins-recent="true">
                {t('ins_recent', { from: String(burn.recent.from), paying: String(burn.recent.paying), years: String(burn.recent.years), burn: n(burn.recent.burnPct, 2) })}
                {Math.abs(burn.recent.burnPct - burn.burnPct) >= Math.max(1, burn.burnPct * 0.5) && ` ${t('ins_trendWarn')}`}
              </p>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2" data-ins-price-block="true">
              <h3 className="ui-label">{t('ins_priceTitle')}</h3>
              <div className="flex flex-wrap gap-3 items-end text-xs">
                <label className="flex flex-col gap-1">
                  <span className="ui-label">{t('ins_loadMethod')}</span>
                  <select
                    className={field}
                    value={loadMethod}
                    onChange={(e) => {
                      const m = e.target.value as LoadingMethod;
                      setLoadMethod(m);
                      setLoadValue(DEFAULT_LOADING[m]);
                    }}
                    data-ins-load-method="true"
                  >
                    <option value="expected">{t('ins_loadExpected')}</option>
                    <option value="sd">{t('ins_loadSd')}</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ui-label">{loadMethod === 'expected' ? t('ins_loadPct') : t('ins_loadK')}</span>
                  <input type="number" min={0} step={loadMethod === 'expected' ? 5 : 0.1} className={input} value={loadValue} onChange={(e) => setLoadValue(Number(e.target.value))} data-ins-load-value="true" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ui-label">{t('ins_basis')}</span>
                  <select className={field} value={basis} onChange={(e) => setBasis(e.target.value as 'all' | 'recent')} data-ins-basis="true">
                    <option value="all">{t('ins_basisAll', { from: String(burn.from), to: String(burn.to) })}</option>
                    {burn.recent && <option value="recent">{t('ins_basisRecent', { from: String(burn.recent.from), to: String(burn.recent.to) })}</option>}
                  </select>
                </label>
              </div>
              {loadProblem && <p className={`text-sm ${amber}`}>{tx(loadProblem)}</p>}
              {price && (
                <>
                  <p className="ui-body" data-ins-price={String(price.premiumPct)}>
                    {t('ins_priceLine', { pct: n(price.premiumPct, 2), amount: n(price.premiumAmount), burn: n(price.burnPct, 2), load: n(price.loadingPct, 2) })}
                    {price.multiple !== undefined && ` ${t('ins_multiple', { m: n(price.multiple, 2) })}`}
                  </p>
                  <p className="text-xs" data-ins-range="true">
                    {t('ins_range', { low: n(price.low, 2), high: n(price.high, 2), years: String(price.basis.years), se: n(price.sePct, 2) })}
                  </p>
                  {price.capped && <p className={`text-xs ${amber}`}>{t('ins_capped')}</p>}
                  {price.burnPct === 0 && <p className={`text-xs ${amber}`}>{t('ins_zeroBurn')}</p>}
                </>
              )}
              <p className={muted}>{t('ins_priceMethod')}</p>
            </div>
            {rare && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2" data-ins-rarity="true">
                <h3 className="ui-label">{t('ins_rareTitle')}</h3>
                <p className="text-xs" data-ins-trigger-rp={String(rare.trigger.fittedYears ?? '')}>
                  {t('ins_rareTrigger', {
                    rec: rare.trigger.recordYears !== undefined ? t('ins_oneInYears', { n: n(rare.trigger.recordYears, rare.trigger.recordYears < 10 ? 1 : 0) }) : t('ins_neverRecord'),
                    fit: rare.gev ? (rare.trigger.fittedYears !== undefined ? t('ins_oneInYears', { n: n(rare.trigger.fittedYears, rare.trigger.fittedYears < 10 ? 1 : 0) }) : t('ins_neverFit')) : '–',
                  })}{' '}
                  {t('ins_rareExit', {
                    rec: rare.exit.recordYears !== undefined ? t('ins_oneInYears', { n: n(rare.exit.recordYears, rare.exit.recordYears < 10 ? 1 : 0) }) : t('ins_neverRecord'),
                    fit: rare.gev ? (rare.exit.fittedYears !== undefined ? t('ins_oneInYears', { n: n(rare.exit.fittedYears, rare.exit.fittedYears < 10 ? 1 : 0) }) : t('ins_neverFit')) : '–',
                  })}
                </p>
                {rare.noFit && <p className={`text-xs ${amber}`}>{tx(rare.noFit)}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ins-levels="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('ins_tReturn')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('ins_tRecord', { unit })}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('ins_tFitted', { unit })}</th>
                        <th className="py-1 font-medium text-right">{t('ins_tRange')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rare.levels.map((l) => (
                        <tr key={l.years} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">
                            {t('ins_oneInYears', { n: String(l.years) })}
                            {l.beyond ? ' *' : ''}
                          </td>
                          <td className="py-0.5 pr-3 text-right">{l.record === undefined ? '–' : n(l.record, 1)}</td>
                          <td className="py-0.5 pr-3 text-right">{l.fitted === undefined ? '–' : n(l.fitted, 1)}</td>
                          <td className="py-0.5 text-right">{l.low === undefined ? '–' : `${n(l.low, 1)} – ${n(l.high!, 1)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rare.levels.some((l) => l.beyond) && <p className={muted}>{t('ins_beyondNote', { n: String(rare.seasons) })}</p>}
                {rare.fittedBurnPct !== undefined && (
                  <p className="text-xs" data-ins-fitted-burn={String(rare.fittedBurnPct)}>
                    {t('ins_fittedBurn', { fit: n(rare.fittedBurnPct, 2), rec: n(burn.burnPct, 2) })}
                  </p>
                )}
                {rare.check && <p className="text-xs">{t('ins_fitCheck', { got: String(rare.check.beyond10), expected: n(rare.check.expected10, 1) })}</p>}
                <p className={muted}>{t('ins_rareMethod')}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <h3 className="ui-label">{showAll ? t('ins_allYears') : t('ins_payingYears')}</h3>
              <button type="button" className="ui-btn text-xs" onClick={() => setShowAll((v) => !v)} data-ins-show-all="true">
                {showAll ? t('ins_showPaying') : t('ins_showAll')}
              </button>
            </div>
            {rows.length > 0 ? (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ins-years="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('ins_tIndex', { unit })}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('ins_tPayoutPct')}</th>
                      <th className="py-1 font-medium text-right">{t('ins_tPayout')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((r) => (
                      <tr key={r.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-0.5 pr-3">{r.year}</td>
                        <td className="py-0.5 pr-3 text-right">{n(r.index, 2)}</td>
                        <td className="py-0.5 pr-3 text-right">{n(r.payoutPct, 1)}%</td>
                        <td className="py-0.5 text-right">{n(r.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={muted}>{t('ins_noPayouts')}</p>
            )}
          </>
        )}
        <p className={muted}>{t('ins_method')}</p>
        {series && <p className={muted}>{t('c_sources', { sources: tx(series.source) })}</p>}
      </div>
    </section>
  );
};
