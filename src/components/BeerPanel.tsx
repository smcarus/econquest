import React, { useEffect, useState } from 'react';
import { ChartGuide } from './HelpLevel';
import { Scale3d } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ValidationBadge } from './ValidationBadge';
import { ChartNumbers } from './ChartNumbers';
import { explainInChat } from '../utils/explainHandoff';
import type { BeerOutcome } from '../utils/beer';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > BEER fair value (src/utils/beer.ts): the real effective
 * exchange rate against the level its fundamentals have gone with.
 */

type Reply = BeerOutcome & { iso3: string; name?: string; sentence?: string; sources?: string[] };

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

export const BeerPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/beer/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply && reply.ok ? reply : null;

  return (
    <section className="ui-panel" data-beer="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scale3d className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('beer_title', { country: countryName })}
          <ValidationBadge id="beer" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `BEER fair value of the real exchange rate, ${countryName}`,
                  value: reply?.sentence || '',
                  source: (reply?.sources || []).join('; '),
                  asOf: ok.latest.month,
                  iso3,
                  countryName,
                  detail: [ok.method, ...ok.coef.map((c) => `${c.name}: ${c.beta} (s.e. ${c.se}), expected ${c.expected}`), `R² ${ok.r2}, ${ok.n} years ${ok.from}-${ok.to}`],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('beer_intro')}</p>
        <ChartGuide id="beer" className="pt-1" />
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('beer_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-beer-sentence="true">{tx(reply?.sentence || '')}</p>
            <div className="h-56" role="img" aria-label={t('beer_aria')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ok.years} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={44} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => f(v as number)} />
                  <Line dataKey="reer" name={t('beer_reer')} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="fitted" name={t('beer_fitted')} stroke="#64748b" strokeDasharray="5 3" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('beer_fundamental')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('beer_coef')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('beer_se')}</th>
                  <th className="py-1 font-medium">{t('beer_sign')}</th>
                </tr>
              </thead>
              <tbody>
                {ok.coef.map((c) => (
                  <tr key={c.name} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-3">{tx(c.name)}</td>
                    <td className="py-0.5 pr-3 text-right">{f(c.beta, 3)}</td>
                    <td className="py-0.5 pr-3 text-right">{f(c.se, 3)}</td>
                    <td className={`py-0.5 ${c.signOk ? '' : 'text-amber-700 dark:text-amber-400'}`}>{c.signOk ? t('beer_signOk') : t('beer_signBad')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ChartNumbers
              caption={t('beer_caption')}
              columns={[t('c_year'), t('beer_colReer'), t('beer_colFitted'), t('beer_colGap')]}
              rows={ok.years.map((y) => [y.year, f(y.reer), f(y.fitted), f(y.gapPct, 1)])}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('beer_latest', { month: ok.latest.month, reer: f(ok.latest.reer), year: ok.latest.fairValueYear, fair: f(ok.latest.fairValue), gap: `${ok.latest.gapPct >= 0 ? '+' : ''}${f(ok.latest.gapPct, 1)}`, r2: f(ok.r2), n: ok.n, from: ok.from, to: ok.to })}{' '}
              {t('c_method', { method: ok.method })} {t('beer_nfa')} {t('c_sources', { sources: (reply?.sources || []).join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
