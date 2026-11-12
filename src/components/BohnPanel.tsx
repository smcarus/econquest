import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Scale } from 'lucide-react';
import type { BohnOutcome } from '../utils/bohnTest';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Fiscal reaction: does the primary balance rise when debt is
 * higher? (Bohn test, src/utils/bohnTest.ts.) An estimate on the IMF history the app saves.
 */

type Reply = BohnOutcome & { iso3: string; sentence?: string; references?: string[] };

const f = (v: number | undefined, d = 3) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));
const VERDICT: Record<string, string> = { responds: 'Responds to debt', weak: 'Weak response', no_response: 'No response found' };
const VERDICT_KEY = { responds: 'bohn_responds', weak: 'bohn_weak', no_response: 'bohn_none' } as const;

export const BohnPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRows, setShowRows] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();
  const verdict = (v: string) => (v in VERDICT_KEY ? t(VERDICT_KEY[v as keyof typeof VERDICT_KEY]) : v);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/bohn/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  return (
    <section className="ui-panel" data-bohn="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('bohn_title', { country: countryName })}
          <ValidationBadge id="fiscal_reaction" />
          {reply?.ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Fiscal reaction (Bohn test), ${countryName}`,
                  value: `rho ${f(reply.rho.value)} (Newey-West s.e. ${f(reply.rho.se)}, p ${f(reply.rho.p, 2)}): ${VERDICT[reply.verdict]}`,
                  source: reply.method,
                  asOf: `${reply.from}-${reply.to}`,
                  iso3,
                  countryName,
                  detail: [reply.sentence || '', reply.gapNote || ''].filter(Boolean),
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('bohn_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('bohn_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {reply?.ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-bohn-sentence="true">{tx(reply.sentence || '')}</p>
            <table className="text-sm">
              <tbody>
                <tr><td className="pr-4 text-slate-500 dark:text-slate-400">{t('bohn_rho')}</td><td className="tabular-nums">{f(reply.rho.value)} <span className="text-slate-500">(s.e. {f(reply.rho.se)}, p {f(reply.rho.p, 2)})</span></td></tr>
                {reply.gamma && <tr><td className="pr-4 text-slate-500 dark:text-slate-400">{t('bohn_gamma')}</td><td className="tabular-nums">{f(reply.gamma.value)} <span className="text-slate-500">(s.e. {f(reply.gamma.se)}, p {f(reply.gamma.p, 2)})</span></td></tr>}
                <tr><td className="pr-4 text-slate-500 dark:text-slate-400">{t('bohn_reading')}</td><td>{verdict(reply.verdict)}</td></tr>
                <tr><td className="pr-4 text-slate-500 dark:text-slate-400">{t('bohn_sample')}</td><td>{t('bohn_sampleVal', { from: reply.from, to: reply.to, n: reply.n, r2: f(reply.r2, 2) })}</td></tr>
              </tbody>
            </table>
            {reply.gapNote && <p className="text-xs text-slate-500 dark:text-slate-400">{tx(reply.gapNote)}.</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('c_method', { method: reply.method })}. {t('bohn_note')}</p>
            <button type="button" className="ui-pill" aria-pressed={showRows} onClick={() => setShowRows(!showRows)}>
              {showRows ? t('c_hideYears') : t('c_showYears')}
            </button>
            {showRows && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('bohn_pb')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('bohn_debtLag')}</th>
                    {reply.withGap && <th className="py-1 font-medium text-right">{t('bohn_gap')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {reply.rows.map((r) => (
                    <tr key={r.year} className="border-t border-slate-100 dark:border-slate-800 tabular-nums">
                      <td className="py-0.5 pr-3">{r.year}</td>
                      <td className="py-0.5 pr-3 text-right">{r.primaryBalance}</td>
                      <td className="py-0.5 pr-3 text-right">{r.debtLag}</td>
                      {reply.withGap && <td className="py-0.5 text-right">{r.gap}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {reply.references && (
              <details className="text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer">{t('c_references')}</summary>
                <ul className="mt-1 space-y-0.5">{reply.references.map((r) => <li key={r}>{r}</li>)}</ul>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
};
