import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { TrendingDown } from 'lucide-react';
import type { FciComponentId, YieldCurve, YieldCurveOutcome } from '../utils/yieldCurve';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Yield curve and financial conditions (G25, src/utils/yieldCurve.ts):
 * the 10-year yield minus the policy rate, inverted spells, year averages, and an equal-weight
 * financial conditions index. No recession figure until the pre-registered yield_curve_recession test
 * passes; then only that test's historical hit rate.
 */

type Reply = YieldCurveOutcome & { iso3: string; sentence?: string; notValidated?: string };

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;
const COMP_KEY: Record<FciComponentId, 'yc_comp_policy' | 'yc_comp_yield10' | 'yc_comp_usSpread' | 'yc_comp_reer'> = {
  policy: 'yc_comp_policy',
  yield10: 'yc_comp_yield10',
  usSpread: 'yc_comp_usSpread',
  reer: 'yc_comp_reer',
};

export const YieldCurvePanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showYears, setShowYears] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/yield-curve/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as YieldCurve & Reply) : null;
  const l = ok?.latest;
  const fci = ok?.fci;
  const level = (id: FciComponentId, v: number) => (id === 'reer' ? t('yc_levelIndex', { v: v.toFixed(1) }) : id === 'usSpread' ? t('yc_levelPts', { v: sg(v) }) : t('yc_levelPct', { v: v.toFixed(2) }));

  return (
    <section className="ui-panel" data-yield-curve="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('yc_title', { country: countryName })}
          <ValidationBadge id="yield_curve_recession" />
          {ok && l && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Yield curve and financial conditions, ${countryName}`,
                  value: `term spread ${sg(l.spread)} points (10-year ${l.yield10}% minus policy rate ${l.policy}%)${fci ? `; financial conditions index ${sg(fci.value)}` : ''}`,
                  source: ok.sources.join('; '),
                  asOf: l.month,
                  iso3,
                  countryName,
                  detail: [ok.sentence || '', ok.notValidated || '', ok.method, ...ok.missing],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('yc_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('yc_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && l && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-curve-sentence={l.spread < 0 ? 'inverted' : 'normal'}>
              {t(l.spread < 0 ? 'yc_sentInverted' : 'yc_sentNormal', { country: countryName, m: l.month, y: l.yield10.toFixed(2), p: l.policy.toFixed(2), s: sg(l.spread) })}
              {ok.yearAgo && ` ${t('yc_yearAgo', { v: sg(ok.yearAgo.spread) })}`}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('yc_measure')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('yc_latest')}</th>
                  <th className="py-1 font-medium">{t('yc_note')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr className="border-t border-slate-100 dark:border-slate-800" data-curve-row="spread">
                  <td className="py-0.5 pr-3">{t('yc_spread')}</td>
                  <td className={`py-0.5 pr-3 text-right font-medium ${l.spread < 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{t('c_pts', { value: sg(l.spread) })}</td>
                  <td className="py-0.5">{l.month}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800" data-curve-row="yield">
                  <td className="py-0.5 pr-3">{t('yc_yield')}</td>
                  <td className="py-0.5 pr-3 text-right">{l.yield10.toFixed(2)}%</td>
                  <td className="py-0.5">{l.month}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800" data-curve-row="policy">
                  <td className="py-0.5 pr-3">{t('yc_policy')}</td>
                  <td className="py-0.5 pr-3 text-right">{l.policy.toFixed(2)}%</td>
                  <td className="py-0.5">{l.month}</td>
                </tr>
                {fci && (
                  <>
                    <tr className="border-t border-slate-100 dark:border-slate-800" data-curve-row="fci">
                      <td className="py-0.5 pr-3 font-medium">{t('yc_fci')}</td>
                      <td className="py-0.5 pr-3 text-right font-medium">{sg(fci.value)}</td>
                      <td className="py-0.5">
                        {fci.month}; {t('yc_fciNote', { w: fci.weight, since: fci.since })}
                        {fci.yearAgo && `; ${t('yc_fciAgo', { v: sg(fci.yearAgo.value) })}`}
                      </td>
                    </tr>
                    {fci.components.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800" data-curve-fci={c.id}>
                        <td className="py-0.5 pr-3 pl-3">{t(COMP_KEY[c.id])}</td>
                        <td className="py-0.5 pr-3 text-right">{sg(c.z)}</td>
                        <td className="py-0.5">{level(c.id, c.level)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
            <p className="text-xs text-slate-600 dark:text-slate-300" data-curve-spells={ok.spells.length}>
              {ok.spells.length
                ? t('yc_spells', {
                    list: ok.spells
                      .map((s) => (s.to ? t('yc_spellClosed', { from: s.from, to: s.to, low: sg(s.low), m: s.lowMonth }) : t('yc_spellOpen', { from: s.from, low: sg(s.low), m: s.lowMonth })))
                      .join('; '),
                  })
                : t('yc_spellsNone', { since: ok.monthly[0]?.period || l.month })}
            </p>
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            {ok.hitRate ? (
              <p className="text-xs text-slate-700 dark:text-slate-200" data-curve-hit-rate="true">
                {t('yc_hitRate', { hit: ok.hitRate.hitRatePct, n: ok.hitRate.cases, from: ok.hitRate.span.from, to: ok.hitRate.span.to, base: ok.hitRate.baseRatePct })}
              </p>
            ) : (
              <p className="text-xs text-blue-800 dark:text-blue-300" data-curve-not-validated="true">{t('yc_notValidated')}</p>
            )}
            {ok.years.length > 0 && (
              <button type="button" className="ui-btn text-xs" onClick={() => setShowYears((v) => !v)}>
                {showYears ? t('c_hideYears') : t('c_showYears')}
              </button>
            )}
            {showYears && (
              <table className="w-full text-xs" data-curve-years="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('yc_colSpread')}</th>
                    <th className="py-1 font-medium text-right">{t('yc_colMonths')}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...ok.years].reverse().map((y) => (
                    <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-0.5 pr-3">{y.year}</td>
                      <td className={`py-0.5 pr-3 text-right ${y.spread < 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{sg(y.spread)}</td>
                      <td className="py-0.5 text-right">{y.months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('c_method', { method: ok.method })} {t('c_sources', { sources: ok.sources.join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
