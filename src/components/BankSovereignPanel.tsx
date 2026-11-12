import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Landmark } from 'lucide-react';
import type { BankSovereign, BankSovereignOutcome, BsRowId } from '../utils/bankSovereign';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Banks and the government (G28, src/utils/bankSovereign.ts):
 * bank size, bank claims on the government, domestic banks' share of government debt, and bank
 * capital and bad loans, each with its source and year. Description only, no score.
 */

type Reply = BankSovereignOutcome & { iso3: string; sentence?: string };

const LABEL: Record<BsRowId, 'bs_bankAssets' | 'bs_claimsGov' | 'bs_claimsShare' | 'bs_banksShareDebt' | 'bs_banksDebtGdp' | 'bs_capital' | 'bs_npl'> = {
  bankAssets: 'bs_bankAssets',
  claimsGov: 'bs_claimsGov',
  claimsShare: 'bs_claimsShare',
  banksShareDebt: 'bs_banksShareDebt',
  banksDebtGdp: 'bs_banksDebtGdp',
  capital: 'bs_capital',
  npl: 'bs_npl',
};

export const BankSovereignPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/bank-sovereign/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as BankSovereign & Reply) : null;
  const newest = ok ? Math.max(...ok.rows.map((r) => r.year)) : 0;

  return (
    <section className="ui-panel" data-bank-sovereign="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('bs_title', { country: countryName })}
          <ValidationBadge id="bank_sovereign" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Banks and the government, ${countryName}`,
                  value: ok.rows.map((r) => `${r.id} ${r.value} (${r.year})`).join('; '),
                  source: ok.sources.join('; '),
                  asOf: String(newest),
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
        <p className="ui-label">{t('bs_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('bs_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && (
          <>
            <table className="w-full text-xs" data-bs-table="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('bs_figure')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('bs_value')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('c_year')}</th>
                  <th className="py-1 font-medium">{t('bs_source')}</th>
                </tr>
              </thead>
              <tbody>
                {ok.rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800" data-bs-row={r.id}>
                    <td className="py-0.5 pr-3">{t(LABEL[r.id])}</td>
                    <td className="py-0.5 pr-3 text-right font-medium tabular-nums">{r.value.toFixed(1)}</td>
                    <td className="py-0.5 pr-3 text-right tabular-nums">{r.year}</td>
                    <td className="py-0.5 text-slate-500 dark:text-slate-400">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('c_method', { method: ok.method })} {t('c_sources', { sources: ok.sources.join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
