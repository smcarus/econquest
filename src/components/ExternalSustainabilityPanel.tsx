import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Globe2 } from 'lucide-react';
import type { ExternalSustainability, ExternalSustainabilityOutcome } from '../utils/externalSustainability';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > External sustainability (G24, src/utils/externalSustainability.ts):
 * external debt, debt service against reserves and exports, and the debt-stabilising non-interest
 * current account. The current account norm and the investment position read Missing with the reason.
 */

type Reply = ExternalSustainabilityOutcome & { iso3: string; sentence?: string };

const f = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1));
const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export const ExternalSustainabilityPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showYears, setShowYears] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/external-sustainability/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as ExternalSustainability & Reply) : null;
  const st = ok?.stabilising;
  const l = ok?.latest;

  return (
    <section className="ui-panel" data-external-sustainability="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('es_title', { country: countryName })}
          <ValidationBadge id="external_sustainability" />
          {ok && l && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `External sustainability, ${countryName}`,
                  value: [l.externalDebtPct !== undefined ? `external debt ${l.externalDebtPct}% of GDP` : '', l.debtServiceToReservesPct !== undefined ? `debt service ${l.debtServiceToReservesPct}% of reserves` : '', st ? `debt-stabilising non-interest current account ${st.requiredPct}% of GDP` : ''].filter(Boolean).join('; '),
                  source: ok.sources.join('; '),
                  asOf: String(l.year),
                  iso3,
                  countryName,
                  detail: [ok.sentence || '', ok.method, ...ok.missing],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('es_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('es_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && l && (
          <>
            <table className="w-full text-xs">
              <tbody className="tabular-nums">
                <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="debt">
                  <td className="py-0.5 pr-3">{t('es_debt')}</td>
                  <td className="py-0.5 pr-3 text-right font-medium">{l.externalDebtPct !== undefined ? t('c_pctGdp', { value: f(l.externalDebtPct) }) : t('c_missing')}</td>
                  <td className="py-0.5 text-slate-500 dark:text-slate-400">{l.year}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="reserves">
                  <td className="py-0.5 pr-3">{t('es_dsReserves')}</td>
                  <td className={`py-0.5 pr-3 text-right font-medium ${l.debtServiceToReservesPct !== undefined && l.debtServiceToReservesPct >= 100 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{l.debtServiceToReservesPct !== undefined ? `${f(l.debtServiceToReservesPct)}%` : t('c_missing')}</td>
                  <td className="py-0.5 text-slate-500 dark:text-slate-400">{t('es_dsReservesNote', { year: l.year })}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="exports">
                  <td className="py-0.5 pr-3">{t('es_dsExports')}</td>
                  <td className="py-0.5 pr-3 text-right font-medium">{l.debtServiceToExportsPct !== undefined ? `${f(l.debtServiceToExportsPct)}%` : t('c_missing')}</td>
                  <td className="py-0.5 text-slate-500 dark:text-slate-400">{l.year}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="ca">
                  <td className="py-0.5 pr-3">{t('es_ca')}</td>
                  <td className="py-0.5 pr-3 text-right font-medium">{l.currentAccountPct !== undefined ? t('c_pctGdp', { value: sg(l.currentAccountPct) }) : t('c_missing')}</td>
                  <td className="py-0.5 text-slate-500 dark:text-slate-400">{l.year}</td>
                </tr>
                {st && (
                  <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="stabilising">
                    <td className="py-0.5 pr-3">{t('es_required')}</td>
                    <td className="py-0.5 pr-3 text-right font-medium">{t('c_pctGdp', { value: sg(st.requiredPct) })}</td>
                    <td className="py-0.5 text-slate-500 dark:text-slate-400">{t('es_requiredNote', { n: st.years.length, i: f(st.interestRatePct), g: f(st.usdGrowthPct), d: f(st.debtPct) })}</td>
                  </tr>
                )}
                {st?.actualPct !== undefined && (
                  <tr className="border-t border-slate-100 dark:border-slate-800" data-es-row="actual">
                    <td className="py-0.5 pr-3">{t('es_actual')}</td>
                    <td className={`py-0.5 pr-3 text-right font-medium ${st.gapPts! < 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{t('c_pctGdp', { value: sg(st.actualPct) })}</td>
                    <td className="py-0.5 text-slate-500 dark:text-slate-400">{t(st.gapPts! >= 0 ? 'es_holds' : 'es_rises', { year: st.year, gap: sg(st.gapPts!) })}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            <button type="button" className="ui-btn text-xs" onClick={() => setShowYears((v) => !v)}>
              {showYears ? t('c_hideYears') : t('c_showYears')}
            </button>
            {showYears && (
              <table className="w-full text-xs" data-es-years="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('es_colCa')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('es_colDebt')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('es_colReserves')}</th>
                    <th className="py-1 font-medium text-right">{t('es_colExports')}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...ok.years].reverse().map((y) => (
                    <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-0.5 pr-3">{y.year}</td>
                      <td className="py-0.5 pr-3 text-right">{f(y.currentAccountPct)}</td>
                      <td className="py-0.5 pr-3 text-right">{f(y.externalDebtPct)}</td>
                      <td className="py-0.5 pr-3 text-right">{f(y.debtServiceToReservesPct)}</td>
                      <td className="py-0.5 text-right">{f(y.debtServiceToExportsPct)}</td>
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
