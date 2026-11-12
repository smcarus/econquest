import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Siren } from 'lucide-react';
import { GAP_BUFFER_START, GAP_WARNING, quarterText, type CrisisWarning, type CrisisWarningOutcome } from '../utils/crisisWarning';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Crisis early-warning (G23, src/utils/crisisWarning.ts): the BIS
 * credit-to-GDP gap against the Basel III lines, past spells above 10 points, the three-year change in
 * private credit, the debt service ratio and real house prices against their own average. Not
 * validated until the pre-registered crisis_warning test runs.
 */

type Reply = CrisisWarningOutcome & { iso3: string; sentence?: string; notValidated?: string };

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export const CrisisWarningPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/crisis-warning/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as CrisisWarning & Reply) : null;
  const lines = { lo: GAP_BUFFER_START, hi: GAP_WARNING };

  return (
    <section className="ui-panel" data-crisis-warning="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Siren className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('cw_title', { country: countryName })}
          <ValidationBadge id="crisis_warning" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Crisis early-warning (BIS credit-to-GDP gap), ${countryName}`,
                  value: `credit-to-GDP gap ${sg(ok.gap.value)} points (${quarterText(ok.gap.quarter)})`,
                  source: ok.sources.join('; '),
                  asOf: quarterText(ok.gap.quarter),
                  iso3,
                  countryName,
                  detail: [ok.sentence || '', ok.notValidated || '', ok.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('cw_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('cw_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-crisis-sentence={ok.gap.zone}>
              {t(ok.gap.zone === 'above_warning' ? 'cw_sentAbove' : ok.gap.zone === 'buffer' ? 'cw_sentBuffer' : 'cw_sentBelow', { country: countryName, v: sg(ok.gap.value), q: quarterText(ok.gap.quarter), ...lines })}
              {ok.gap.yearAgo && ` ${t('cw_yearAgo', { v: sg(ok.gap.yearAgo.value) })}`}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('cw_measure')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('cw_latest')}</th>
                  <th className="py-1 pr-3 font-medium">{t('cw_when')}</th>
                  <th className="py-1 font-medium">{t('cw_compare')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr className="border-t border-slate-100 dark:border-slate-800" data-crisis-row="gap">
                  <td className="py-0.5 pr-3">{t('cw_gap')}</td>
                  <td className={`py-0.5 pr-3 text-right font-medium ${ok.gap.zone === 'above_warning' ? 'text-amber-700 dark:text-amber-400' : ''}`}>{t('c_pts', { value: sg(ok.gap.value) })}</td>
                  <td className="py-0.5 pr-3">{quarterText(ok.gap.quarter)}</td>
                  <td className="py-0.5">{t(ok.gap.zone === 'above_warning' ? 'cw_zoneAbove' : ok.gap.zone === 'buffer' ? 'cw_zoneBuffer' : 'cw_zoneBelow', lines)}</td>
                </tr>
                {ok.creditChange && (
                  <tr className="border-t border-slate-100 dark:border-slate-800" data-crisis-row="credit">
                    <td className="py-0.5 pr-3">{t('cw_credit')}</td>
                    <td className="py-0.5 pr-3 text-right">{t('cw_creditValue', { v: sg(ok.creditChange.pts) })}</td>
                    <td className="py-0.5 pr-3">{t('c_range', { from: quarterText(ok.creditChange.from), to: quarterText(ok.creditChange.to) })}</td>
                    <td className="py-0.5">{t('cw_creditCompare', { from: ok.creditChange.fromValue, to: ok.creditChange.toValue })}</td>
                  </tr>
                )}
                {ok.dsr && (
                  <tr className="border-t border-slate-100 dark:border-slate-800" data-crisis-row="dsr">
                    <td className="py-0.5 pr-3">{t('cw_dsr')}</td>
                    <td className="py-0.5 pr-3 text-right">{t('cw_dsrValue', { v: ok.dsr.value })}</td>
                    <td className="py-0.5 pr-3">{quarterText(ok.dsr.quarter)}</td>
                    <td className="py-0.5">{t('cw_vsAverage', { d: sg(ok.dsr.deviation), avg: `${ok.dsr.average}%`, since: quarterText(ok.dsr.since) })}</td>
                  </tr>
                )}
                {ok.realHousePrices && (
                  <tr className="border-t border-slate-100 dark:border-slate-800" data-crisis-row="houses">
                    <td className="py-0.5 pr-3">{t('cw_houses')}</td>
                    <td className="py-0.5 pr-3 text-right">{sg(ok.realHousePrices.value)}%</td>
                    <td className="py-0.5 pr-3">{quarterText(ok.realHousePrices.quarter)}</td>
                    <td className="py-0.5">{t('cw_vsAverage', { d: sg(ok.realHousePrices.deviation), avg: `${sg(ok.realHousePrices.average)}%`, since: quarterText(ok.realHousePrices.since) })}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-xs text-slate-600 dark:text-slate-300" data-crisis-spells={ok.spells.length}>
              {ok.spells.length
                ? t('cw_spells', {
                    hi: GAP_WARNING,
                    list: ok.spells
                      .map((s) =>
                        s.to
                          ? t('cw_spellClosed', { from: quarterText(s.from), to: quarterText(s.to), peak: sg(s.peak), q: quarterText(s.peakQuarter) })
                          : t('cw_spellOpen', { from: quarterText(s.from), peak: sg(s.peak), q: quarterText(s.peakQuarter) })
                      )
                      .join('; '),
                  })
                : t('cw_spellsNone', { hi: GAP_WARNING })}
            </p>
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            <p className="text-xs text-blue-800 dark:text-blue-300" data-crisis-not-validated="true">{t('cw_notValidated')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('c_method', { method: ok.method })} {t('c_sources', { sources: ok.sources.join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
