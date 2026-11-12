import React, { useMemo } from 'react';
import { Scale } from 'lucide-react';
import type { WatchlistItem } from '../types/council';
import { multiplierView } from '../utils/fiscalMultipliers';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Fiscal multipliers: where the country sits in the IMF
 * bucket approach on the figures the app holds, what it cannot judge, and the published ranges.
 * A cited reference, not an estimate.
 */
export const FiscalMultiplierPanel: React.FC<{ iso3: string; countryName: string; item?: WatchlistItem }> = ({ iso3, countryName, item }) => {
  const t = useT(PANELS);
  const tx = useTx();
  const bucket = (b: string) => (b === 'low' || b === 'medium' || b === 'large' ? t(`mult_bucket_${b}`) : b);
  const mv = useMemo(
    () =>
      multiplierView({
        iso3,
        ...(item?.fiscal?.debtPctGdp ? { debtPctGdp: item.fiscal.debtPctGdp } : {}),
        ...(item?.outputGap ? { outputGap: item.outputGap } : {}),
        ...(item?.policyRateSource === 'bis' && item.policyRatePct !== undefined ? { policyRatePct: item.policyRatePct } : {}),
      }),
    [iso3, item],
  );
  return (
    <section className="ui-panel" data-multipliers="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('mult_title', { country: countryName })}
          <button
            type="button"
            className="ui-btn ml-auto text-xs"
            data-explain-panel="true"
            onClick={() =>
              explainInChat({
                kind: 'panel',
                label: `Fiscal multipliers, ${countryName}`,
                value: `${mv.guide.low} to ${mv.guide.high} first year, normal times (${mv.guide.bucket} bucket)`,
                source: mv.method,
                iso3,
                countryName,
                detail: [`Trough ${mv.cycle.trough.low} to ${mv.cycle.trough.high}; peak ${mv.cycle.peak.low} to ${mv.cycle.peak.high}`, mv.cycle.note, ...mv.literature.slice(0, 5).map((l) => `${l.finding}: ${l.value} [${l.source}]`)],
              })
            }
          >
            {t('c_explain')}
          </button>
        </h2>
        <p className="ui-label">{t('mult_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        <p className="text-sm text-slate-900 dark:text-white" data-multiplier-sentence="true">
          {tx(mv.sentence)}
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
          <div title={tx(mv.guide.why)}>
            <dt className="ui-label">{t('mult_normal', { bucket: bucket(mv.guide.bucket) })}</dt>
            <dd className="text-slate-900 dark:text-white">
              {t('c_range', { from: mv.guide.low, to: mv.guide.high })}
            </dd>
          </div>
          <div>
            <dt className="ui-label">{t('mult_trough')}</dt>
            <dd className="text-slate-900 dark:text-white">
              {t('c_range', { from: mv.cycle.trough.low, to: mv.cycle.trough.high })}
            </dd>
          </div>
          <div>
            <dt className="ui-label">{t('mult_peak')}</dt>
            <dd className="text-slate-900 dark:text-white">
              {t('c_range', { from: mv.cycle.peak.low, to: mv.cycle.peak.high })}
            </dd>
          </div>
          <div title={mv.lowerBound?.why ? tx(mv.lowerBound.why) : undefined}>
            <dt className="ui-label">{t('mult_zlb')}</dt>
            <dd className="text-slate-900 dark:text-white">{mv.lowerBound ? t('c_range', { from: mv.lowerBound.low, to: mv.lowerBound.high }) : t('mult_na')}</dd>
          </div>
        </dl>
        <p className="text-xs text-slate-600 dark:text-slate-300">{tx(mv.cycle.note)}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-multiplier-characteristics="true">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-3">{t('mult_char')}</th>
                <th className="py-1 pr-3">{t('mult_point')}</th>
                <th className="py-1 pr-3">{t('mult_why')}</th>
              </tr>
            </thead>
            <tbody>
              {mv.characteristics.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td className="py-1 pr-3 text-slate-900 dark:text-white">{tx(c.label)}</td>
                  <td className="py-1 pr-3 tabular-nums">{c.point === undefined ? t('mult_notKnown') : c.point}</td>
                  <td className="py-1 pr-3 text-xs text-slate-600 dark:text-slate-300">{tx(c.why)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('mult_score', { score: mv.score.min === mv.score.max ? mv.score.min : t('c_range', { from: mv.score.min, to: mv.score.max }), buckets: mv.normal.buckets.map(bucket).join(' / '), low: mv.normal.low, high: mv.normal.high })}
          </p>
        </div>
        <details className="text-xs text-slate-500 dark:text-slate-400" open>
          <summary className="cursor-pointer">{t('mult_ranges')}</summary>
          <ul className="mt-1 space-y-1">
            {mv.literature.map((l) => (
              <li key={l.id}>
                <span className="text-slate-900 dark:text-white">{tx(l.finding)}:</span> {l.value}. <span className="italic">{l.source}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1">{mv.method}</p>
        </details>
      </div>
    </section>
  );
};
