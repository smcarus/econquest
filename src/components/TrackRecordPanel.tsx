import { ValidationBadge } from './ValidationBadge';
import React, { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import type { TrackRecord } from '../utils/trackRecord';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History > Track record: the policy-rule signal the app gave on each saved
 * pull and, once the horizon has passed, what the central bank did. Built from the pull archive
 * only, so it fills in week by week from the day the archive started.
 */

type Reply = TrackRecord & { sentence: string; policyMissing: string | null };

const p2 = (v: number) => `${v.toFixed(2)}%`;
const sg = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;

export const TrackRecordPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();
  const word = (s: 'raise' | 'cut' | 'hold') => t(`sig_${s}`);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/track-record/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const rows = reply ? (all ? reply.entries : reply.entries.filter((e) => e.call || !e.reading)) : [];

  return (
    <section className="ui-panel" data-track-record="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('tr_title', { country: countryName })}
          <ValidationBadge id="taylor_gap" />
        </h2>
        <p className="ui-label">{t('tr_intro', { days: reply?.horizonDays ?? 90 })}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('tr_what'), error })}</p>}
        {reply && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-track-sentence="true">
              {tx(reply.sentence)}
            </p>
            {reply.policyMissing && (
              <p className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('tr_noPolicy', { reason: tx(reply.policyMissing) })}
              </p>
            )}
            {reply.scored > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {t('tr_bySignal', {
                  list: (['raise', 'hold', 'cut'] as const)
                    .filter((k) => reply.bySignal[k].scored)
                    .map((k) => t('tr_followed', { signal: word(k), n: reply.bySignal[k].followed, all: reply.bySignal[k].scored }))
                    .join(', '),
                })}
              </p>
            )}
            {reply.entries.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="ui-pill" aria-pressed={all} onClick={() => setAll(!all)}>
                    {all ? t('tr_every') : t('tr_callsOnly')}
                  </button>
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/track-record.csv`} download>
                    {t('tr_download')}
                  </a>
                  <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/track-record.xlsx`} download>
                    {t('c_excel')}
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-normal">{t('tr_pull')}</th>
                        <th className="py-1 pr-3 font-normal">{t('tr_pointed')}</th>
                        <th className="py-1 pr-3 font-normal text-right">{t('tr_policy')}</th>
                        <th className="py-1 pr-3 font-normal text-right">{t('tr_rule')}</th>
                        <th className="py-1 font-normal">{t('tr_bankDid')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((e) => (
                        <tr key={e.day} className="border-t border-slate-100 dark:border-slate-800 align-top">
                          <td className="py-1.5 pr-3 text-slate-900 dark:text-white whitespace-nowrap">
                            {e.day}
                            {e.call && <div className="text-xs text-slate-400">{t('tr_call')}</div>}
                          </td>
                          {e.reading ? (
                            <>
                              <td className="py-1.5 pr-3 text-slate-900 dark:text-white" title={t('tr_readingTitle', { inf: p2(e.reading.inflationPct), basis: tx(e.reading.inflationBasis), gap: e.reading.outputGapPct !== undefined ? t('tr_gapPart', { gap: sg(e.reading.outputGapPct) }) : t('tr_noGap') })}>
                                {word(e.reading.signal)}
                                <div className="text-xs text-slate-400">{t('tr_againstRule', { gap: sg(e.reading.gapPts) })}</div>
                              </td>
                              <td className="py-1.5 pr-3 text-right text-slate-900 dark:text-white" title={e.reading.policySource}>
                                {p2(e.reading.policyPct)}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-slate-900 dark:text-white">{p2(e.reading.rulePct)}</td>
                            </>
                          ) : (
                            <td colSpan={3} className="py-1.5 pr-3 text-slate-400" data-missing="true">
                              {t('scen_missing', { reason: (e.missing || []).map(tx).join(', ') })}
                            </td>
                          )}
                          <td className="py-1.5 text-slate-700 dark:text-slate-300">
                            {!e.outcome
                              ? e.reading
                                ? t('tr_same')
                                : ''
                              : e.outcome.status === 'pending'
                                ? t('tr_pending', { date: e.outcome.due })
                                : t('tr_outcome', {
                                    did:
                                      e.outcome.action === 'held'
                                        ? t('tr_heldAt', { rate: p2(e.outcome.toPct) })
                                        : t(e.outcome.action === 'raised' ? 'tr_movedRaised' : 'tr_movedCut', { from: p2(e.outcome.fromPct), to: p2(e.outcome.toPct) }),
                                    on: e.outcome.on,
                                    verdict: e.outcome.followed ? t('tr_yes') : t('tr_no'),
                                  })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-0.5">
              {reply.caveats.map((c) => (
                <li key={c}>{tx(c)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
