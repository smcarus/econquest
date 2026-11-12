import { ValidationBadge } from './ValidationBadge';
import React, { useEffect, useState } from 'react';
import { Gavel } from 'lucide-react';
import type { DecisionReplay, RateDecision } from '../utils/decisionReplay';
import type { InflationTarget } from '../utils/marketsMacro';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History > Replicate a rate decision: pick one of the bank's moves (or any
 * date) and see the data the week before, what a simple Taylor rule pointed to, and what the bank
 * did. Built on the app's own series; the stated caveats travel with every reading.
 */

type ListReply = { decisions: RateDecision[]; policySource: string | null; first: string | null; last: string | null; policyMissing?: string; target: InflationTarget | null };
type ReplayReply = ListReply & { replay: DecisionReplay; sentence: string };

const p2 = (v: number) => `${v.toFixed(2)}%`;
const sg = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;

export const DecisionReplayPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [list, setList] = useState<ListReply | null>(null);
  const [date, setDate] = useState('');
  const [reply, setReply] = useState<ReplayReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setList(null);
    setReply(null);
    setError(null);
    fetch(`/api/decision-replay/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: ListReply) => {
        if (!live) return;
        setList(b);
        setDate(b.decisions[0]?.date || '');
      })
      .catch((e: Error) => live && (setListFailed(true), setError(e.message)));
    return () => {
      live = false;
    };
  }, [iso3]);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setError(null);
    fetch(`/api/decision-replay/${encodeURIComponent(iso3)}?date=${encodeURIComponent(date)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({})))?.message || `HTTP ${r.status}`))))
      .then((b: ReplayReply) => live && setReply(b))
      .catch((e: Error) => live && (setReply(null), setError(e.message)));
    return () => {
      live = false;
    };
  }, [iso3, date]);

  const r = reply?.replay;

  return (
    <section className="ui-panel" data-decision-replay="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Gavel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rep_title', { country: countryName })}
          <ValidationBadge id="taylor_gap" />
        </h2>
        <p className="ui-label">{t('rep_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {list === null && !error && <p className="ui-body">{t('c_loading')}</p>}
        {list && list.policyMissing && (
          <p className="ui-body" data-missing="true">
            {t('rep_noPolicy', { reason: tx(list.policyMissing) })}
          </p>
        )}
        {list && !list.policyMissing && (
          <div className="space-y-2">
            {list.decisions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('rep_decisions')}>
                {list.decisions.slice(0, 12).map((d) => (
                  <button key={d.date} type="button" className="ui-pill" aria-pressed={date === d.date} onClick={() => setDate(d.date)}>
                    {t(d.toPct > d.fromPct ? 'rep_up' : 'rep_down', { date: d.date, n: Math.abs(d.toPct - d.fromPct).toFixed(2) })}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('rep_noChange', { range: list.last && list.last !== list.first ? t('c_range', { from: list.first ?? '', to: list.last }) : list.first ?? '' })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="ui-label" htmlFor={`replay-${iso3}`}>
                {t('rep_anyDate')}
              </label>
              <input
                id={`replay-${iso3}`}
                type="date"
                value={date.length === 10 ? date : ''}
                min={list.first && list.first.length === 10 ? list.first : undefined}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              {list.policySource && <span className="text-xs text-slate-500 dark:text-slate-400">{t('rep_from', { source: list.policySource })}</span>}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{listFailed ? t('c_couldNotRead', { what: t('rep_what'), error }) : tx(error)}</p>}
        {r && reply && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-replay-sentence="true">
              {tx(reply.sentence)}
            </p>
            <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
              <tbody>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_rateBefore', { date: r.asOf })}</td>
                  <td className="py-1.5 text-right text-slate-900 dark:text-white">{p2(r.rateBeforePct)}</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_bankDid', { date: r.decisionDate })}</td>
                  <td className="py-1.5 text-right text-slate-900 dark:text-white">
                    {t(`act_${r.action}`, { rate: p2(r.rateAfterPct) })}
                  </td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_inflation')}</td>
                  <td className={`py-1.5 text-right ${r.inflation ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} title={r.inflation?.source}>
                    {r.inflation ? `${p2(r.inflation.pct)} (${r.inflation.month})` : t('c_missing')}
                  </td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_target')}</td>
                  <td className={`py-1.5 text-right ${r.target ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {r.target ? (
                      <a href={r.target.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {r.target.pct}%{r.target.bandPts ? ` ± ${r.target.bandPts}` : ''} ({r.target.bank})
                      </a>
                    ) : (
                      t('c_missing')
                    )}
                  </td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_cli')}</td>
                  <td className={`py-1.5 text-right ${r.cli ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {r.cli ? `${r.cli.level.toFixed(2)} (${r.cli.month})${r.cli.change6m !== undefined ? t('rep_cli6m', { change: sg(r.cli.change6m) }) : ''}` : t('c_missing')}
                  </td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{t('rep_taylor')}</td>
                  <td className={`py-1.5 text-right ${r.rule ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {r.rule ? t('rep_taylorVal', { rate: p2(r.rule.pct), gap: sg(r.rule.gapPts) }) : t('c_missing')}
                  </td>
                </tr>
              </tbody>
            </table>
            {r.rule && <p className="text-xs text-slate-500 dark:text-slate-400">{r.rule.method}. {t('rep_withinPt')}</p>}
            {r.missing.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('c_missingReason', { reason: r.missing.map(tx).join('; ') })}</p>}
            <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-0.5">
              {r.caveats.map((c) => (
                <li key={c}>{tx(c)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
