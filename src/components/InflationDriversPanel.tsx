import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Flame } from 'lucide-react';
import type { DriverRow, InflationDrivers, InflationDriversOutcome } from '../utils/inflationDrivers';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Inflation drivers (G26, src/utils/inflationDrivers.ts): headline
 * against core inflation, food and energy, and (Eurostat only) their approximate contributions.
 */

type Reply = InflationDriversOutcome & { iso3: string; sentence?: string };

const f = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1));
const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
const ROWS: Array<{ key: keyof Omit<DriverRow, 'period'>; label: 'inf_headline' | 'inf_core' | 'inf_food' | 'inf_energy' }> = [
  { key: 'headline', label: 'inf_headline' },
  { key: 'core', label: 'inf_core' },
  { key: 'food', label: 'inf_food' },
  { key: 'energy', label: 'inf_energy' },
];

export const InflationDriversPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMonths, setShowMonths] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/inflation-drivers/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as InflationDrivers & Reply) : null;
  const l = ok?.latest;
  const c = ok?.contributions;

  return (
    <section className="ui-panel" data-inflation-drivers="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Flame className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('inf_title', { country: countryName })}
          <ValidationBadge id="inflation_drivers" />
          {ok && l && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Inflation drivers, ${countryName}`,
                  value: [`headline ${f(l.headline)}%`, l.core !== undefined ? `core ${f(l.core)}%` : '', l.food !== undefined ? `food ${f(l.food)}%` : '', l.energy !== undefined ? `energy ${f(l.energy)}%` : ''].filter(Boolean).join('; '),
                  source: ok.sources.join('; '),
                  asOf: l.period,
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
        <p className="ui-label">{t('inf_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('inf_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && l && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-inflation-sentence={ok.source}>
              {l.core !== undefined ? t('inf_sentenceCore', { country: countryName, h: f(l.headline), m: l.period, c: f(l.core) }) : t('inf_sentence', { country: countryName, h: f(l.headline), m: l.period })}
              {ok.coreChange3m && ` ${t(ok.coreChange3m.trend === 'rising' ? 'inf_coreRising' : ok.coreChange3m.trend === 'easing' ? 'inf_coreEasing' : 'inf_coreSteady', { d: sg(ok.coreChange3m.pts) })}`}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('inf_measure')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('inf_latest')}</th>
                  <th className="py-1 font-medium text-right">{t('inf_yearAgo')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {ROWS.map((r) => (
                  <tr key={r.key} className="border-t border-slate-100 dark:border-slate-800" data-inflation-row={r.key}>
                    <td className="py-0.5 pr-3">{t(r.label)}</td>
                    <td className="py-0.5 pr-3 text-right font-medium">{l[r.key] !== undefined ? f(l[r.key]) : t('c_missing')}</td>
                    <td className="py-0.5 text-right">{f(ok.yearAgo?.[r.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ok.coreGapPts !== undefined && <p className="text-xs text-slate-600 dark:text-slate-300">{t('inf_coreGap', { d: sg(ok.coreGapPts), m: l.period })}</p>}
            {c && (
              <div className="text-xs text-slate-700 dark:text-slate-200" data-inflation-contributions="true">
                <p className="font-medium">{t('inf_contribTitle', { m: l.period })}</p>
                <ul className="list-disc pl-5">
                  <li>{t('inf_contribPart', { part: t('inf_food'), v: sg(c.food), w: c.weights.food })}</li>
                  <li>{t('inf_contribPart', { part: t('inf_energy'), v: sg(c.energy), w: c.weights.energy })}</li>
                  <li>{t('inf_contribPart', { part: t('inf_core'), v: sg(c.core), w: c.weights.core })}</li>
                </ul>
                <p className="text-slate-500 dark:text-slate-400">{t('inf_residual', { v: sg(c.residual) })}</p>
              </div>
            )}
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            <button type="button" className="ui-btn text-xs" onClick={() => setShowMonths((v) => !v)}>
              {showMonths ? t('inf_hideMonths') : t('inf_showMonths')}
            </button>
            {showMonths && (
              <table className="w-full text-xs" data-inflation-months="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('inf_colMonth')}</th>
                    {ROWS.map((r) => (
                      <th key={r.key} className="py-1 pr-3 font-medium text-right">
                        {t(r.label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...ok.months].reverse().map((m) => (
                    <tr key={m.period} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-0.5 pr-3">{m.period}</td>
                      {ROWS.map((r) => (
                        <td key={r.key} className="py-0.5 pr-3 text-right">
                          {f(m[r.key])}
                        </td>
                      ))}
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
