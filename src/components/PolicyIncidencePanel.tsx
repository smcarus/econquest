import React, { useEffect, useMemo, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Users } from 'lucide-react';
import { incidence, incidenceSentence, INCIDENCE_METHOD, QUINTILES, type ContextRow, type Direction, type IncidenceContext } from '../utils/policyIncidence';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Who pays for a policy (G30, src/utils/policyIncidence.ts): the
 * user types a tax or spending change and the share each fifth of people carries (with its source);
 * the panel sets it beside each fifth's share of income and the country's saved Gini, tax and poverty
 * figures. Starts empty: no built-in incidence shares.
 */

type Reply = IncidenceContext & { iso3: string };
type CtxKey = 'pi_gini' | 'pi_taxRevenue' | 'pi_taxIncome' | 'pi_taxGoods' | 'pi_taxTrade' | 'pi_povLowest' | 'pi_povLowerMiddle' | 'pi_povUpperMiddle';
const CTX: Record<ContextRow['id'], CtxKey> = {
  gini: 'pi_gini',
  tax_revenue: 'pi_taxRevenue',
  tax_income: 'pi_taxIncome',
  tax_goods: 'pi_taxGoods',
  tax_trade: 'pi_taxTrade',
  poverty_lowest: 'pi_povLowest',
  poverty_lower_middle: 'pi_povLowerMiddle',
  poverty_upper_middle: 'pi_povUpperMiddle',
};
const Q_LABEL = ['pi_q1', 'pi_q2', 'pi_q3', 'pi_q4', 'pi_q5'] as const;
const input = 'w-20 px-1.5 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';
const num = (s: string | undefined): number | null => {
  const t = (s ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export const PolicyIncidencePanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction | ''>('');
  const [size, setSize] = useState('');
  const [shares, setShares] = useState<string[]>(['', '', '', '', '']);
  const [source, setSource] = useState('');
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/policy-incidence/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const out = useMemo(
    () => incidence({ direction: direction || null, sizePctGdp: num(size), shares: shares.map(num), source }, reply?.incomeShares ?? null),
    [direction, size, shares, source, reply]
  );
  const ok = out.ok ? out : null;
  const anyTyped = direction !== '' || size.trim() !== '' || shares.some((s) => s.trim() !== '') || source.trim() !== '';
  const sentence = ok ? incidenceSentence(ok, countryName) : '';

  return (
    <section className="ui-panel" data-policy-incidence="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('pi_title', { country: countryName })}
          <ValidationBadge id="policy_incidence" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Who pays for a policy, ${countryName}`,
                  value: ok.groups.map((g) => `fifth ${g.q}: ${g.sharePct}% of the change (${g.amountPctGdp}% of GDP)${g.ratio !== undefined ? `, ${g.incomeSharePct}% of income, ratio ${g.ratio}` : ''}`).join('; '),
                  source: [`Incidence shares typed by the user from: ${ok.source}`, ...(reply?.sources || [])].join('; '),
                  asOf: reply?.incomeShares ? String(reply.incomeShares.year) : new Date().toISOString().slice(0, 10),
                  iso3,
                  countryName,
                  detail: [sentence, INCIDENCE_METHOD, ...(reply?.missing || [])],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('pi_intro')}</p>
      </header>
      <div className="p-4 space-y-3 text-xs">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('pi_what'), error })}</p>}
        {reply && reply.rows.length > 0 && (
          <table className="text-xs" data-pi-context="true">
            <tbody className="tabular-nums">
              {reply.rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-0.5 pr-3 text-slate-600 dark:text-slate-300">{t(CTX[r.id])}</td>
                  <td className="py-0.5 pr-3 text-right font-medium">{r.value.toFixed(1)}</td>
                  <td className="py-0.5 text-right text-slate-500 dark:text-slate-400">{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="space-y-2" data-pi-inputs="true">
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">{t('pi_direction')}</span>
            <select className={`${input} w-auto`} value={direction} onChange={(e) => setDirection(e.target.value as Direction | '')} data-pi-field="direction">
              <option value="">{t('pi_choose')}</option>
              <option value="pay">{t('pi_pay')}</option>
              <option value="gain">{t('pi_gain')}</option>
            </select>
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">{t('pi_size')}</span>
            <input className={input} inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} data-pi-field="size" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">{t('pi_shares')}</span>
            {shares.map((v, i) => (
              <input
                key={i}
                className={input}
                inputMode="decimal"
                value={v}
                onChange={(e) => setShares((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
                aria-label={t(Q_LABEL[i])}
                placeholder={t(Q_LABEL[i])}
                data-pi-field={`share.${i}`}
              />
            ))}
          </div>
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300">{t('pi_source')}</span>
            <input className={`${input} w-full sm:w-96`} value={source} onChange={(e) => setSource(e.target.value)} data-pi-field="source" />
          </label>
        </div>
        {!out.ok && (
          <div className="text-amber-700 dark:text-amber-400 space-y-0.5" data-missing="true">
            {!anyTyped ? (
              <p>{t('pi_blank')}</p>
            ) : (
              out.problems.map((p) => <p key={p}>{p === 'sum' ? t('pi_sum', { sum: out.sharesSum }) : t(`pi_need_${p}` as 'pi_need_direction')}</p>)
            )}
          </div>
        )}
        {ok && (
          <>
            <table className="w-full text-xs" data-pi-table="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('pi_group')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('pi_shareCol')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('pi_amountCol')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('pi_incomeCol', { year: reply?.incomeShares?.year ?? '' })}</th>
                  <th className="py-1 font-medium text-right">{t('pi_ratioCol')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {ok.groups.map((g) => (
                  <tr key={g.q} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-3">{t(Q_LABEL[g.q - 1])}</td>
                    <td className="py-0.5 pr-3 text-right">{g.sharePct}%</td>
                    <td className="py-0.5 pr-3 text-right">{g.amountPctGdp.toFixed(2)}</td>
                    <td className="py-0.5 pr-3 text-right">{g.incomeSharePct !== undefined ? `${g.incomeSharePct}%` : t('c_missing')}</td>
                    <td className="py-0.5 text-right font-medium">{g.ratio !== undefined ? g.ratio.toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ok.reading && (
              <p className="text-sm text-slate-900 dark:text-white" data-pi-reading={ok.reading}>
                {t(`pi_reading_${ok.reading}_${ok.direction}` as 'pi_reading_regressive_pay', { q1: ok.groups[0].ratio!.toFixed(2), q5: ok.groups[QUINTILES - 1].ratio!.toFixed(2) })}
              </p>
            )}
            <p className="text-slate-500 dark:text-slate-400">{t('pi_yourSource', { source: ok.source })}</p>
          </>
        )}
        {reply?.missing.map((m) => (
          <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(m) })}
          </p>
        ))}
        <p className="text-slate-500 dark:text-slate-400">
          {t('c_method', { method: INCIDENCE_METHOD })} {reply && reply.sources.length > 0 ? t('c_sources', { sources: reply.sources.join('; ') }) : ''}
        </p>
      </div>
    </section>
  );
};
