import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { PolicyReview } from '../utils/policyReview';
import { MAX_PEERS, type PeerTable } from '../utils/reviewPeers';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Peers (PC2, src/utils/reviewPeers.ts), after Diagnose: the diagnosis figures of
 * peer countries the user picks, each from its saved pull on or before the As of day, with the peer
 * median and the review country's rank. Nothing is saved in the review; the chosen peers are
 * remembered in this browser only.
 */

type Country = { iso3: string; countryName: string };

const storeKey = (id: string) => `econquest.reviewPeers.v1.${id}`;
const loadPeers = (id: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(storeKey(id)) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX_PEERS) : [];
  } catch {
    return [];
  }
};
const savePeers = (id: string, list: string[]) => {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify(list));
  } catch {
    // Private window or blocked storage: the choice is simply not remembered.
  }
};

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? null : String(Math.round(v * 100) / 100));

export const ReviewPeers: React.FC<{ review: PolicyReview; iso3: string; countries: Country[]; countryName: (iso3: string) => string }> = ({ review, iso3, countries, countryName }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const [peers, setPeers] = useState<string[]>(() => loadPeers(review.id));
  const [answer, setAnswer] = useState<PeerTable | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setPeers(loadPeers(review.id));
    setAnswer(null);
    setError('');
  }, [review.id, review.steps.diagnose?.hash]);

  const choices = countries.filter((c) => c.iso3 !== iso3);
  const set = (list: string[]) => {
    const next = list.slice(0, MAX_PEERS);
    setPeers(next);
    savePeers(review.id, next);
  };
  const toggle = (code: string) => set(peers.includes(code) ? peers.filter((x) => x !== code) : [...peers, code]);
  const region = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.region;
  const sameRegion = region ? choices.filter((c) => SOVEREIGN_CATALOG.find((x) => x.iso3 === c.iso3)?.region === region).map((c) => c.iso3) : [];

  const compare = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}/peers?iso3=${peers.join(',')}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
      setAnswer(body as PeerTable);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const missingCell = <span className="text-slate-400">{t('pc_missingCell')}</span>;
  const groups = answer ? [...new Set(answer.rows.map((r) => r.group))] : [];

  return (
    <div className="space-y-2">
      <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <legend className="ui-label mb-1">{t('pe_pick', { n: MAX_PEERS })}</legend>
        {choices.map((c) => (
          <label key={c.iso3} className="inline-flex items-center gap-1">
            <input type="checkbox" checked={peers.includes(c.iso3)} disabled={!peers.includes(c.iso3) && peers.length >= MAX_PEERS} onChange={() => toggle(c.iso3)} /> {c.countryName}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={answer ? 'ui-btn' : 'ui-btn ui-btn-primary'} disabled={busy || !peers.length} onClick={compare} data-review-peers-compare="true">
          <Users className="w-3.5 h-3.5" /> {busy ? t('pe_comparing') : answer ? t('pe_again') : t('pe_compare')}
        </button>
        {sameRegion.length > 0 && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => set(sameRegion)}>
            {t('pe_region')}
          </button>
        )}
        {peers.length > 0 && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => set([])}>
            {t('pe_clear')}
          </button>
        )}
        {!peers.length && <span className="text-xs text-slate-500 dark:text-slate-400">{t('pe_none')}</span>}
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{t('pe_error', { why: error })}</p>}
      {answer && (
        <>
          {answer.peers
            .filter((p) => p.missing)
            .map((p) => (
              <p key={p.iso3} className="text-xs text-amber-700 dark:text-amber-400">
                {t('pe_noPull', { country: countryName(p.iso3), asOf: answer.asOf })}
              </p>
            ))}
          <div className="overflow-x-auto">
            <table className="text-xs w-full [font-variant-numeric:tabular-nums]" data-review-peers="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pr-2 py-1 font-normal">#</th>
                  <th className="pr-2 py-1 font-normal">{t('pr_indicator')}</th>
                  <th className="pr-2 py-1 font-normal text-right">{countryName(iso3)}</th>
                  {answer.peers.map((p) => (
                    <th key={p.iso3} className="pr-2 py-1 font-normal text-right">
                      {countryName(p.iso3)}
                    </th>
                  ))}
                  <th className="pr-2 py-1 font-normal text-right">{t('pe_median')}</th>
                  <th className="py-1 font-normal text-right">{t('pe_rank')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <React.Fragment key={g}>
                    <tr>
                      <td colSpan={answer.peers.length + 5} className="pt-2 pb-0.5 ui-label">
                        {tx(g)}
                      </td>
                    </tr>
                    {answer.rows
                      .filter((r) => r.group === g)
                      .map((r) => (
                        <tr key={r.field} className="border-t border-slate-100 dark:border-slate-800" data-peer-row={r.field}>
                          <td className="pr-2 py-0.5 text-slate-500">[{r.ref}]</td>
                          <td className="pr-2 py-0.5">
                            {tx(r.label)}
                            {r.unit && r.unit !== '%' ? <span className="text-slate-500 dark:text-slate-400"> ({r.unit})</span> : r.unit === '%' ? ' (%)' : ''}
                          </td>
                          <td className="pr-2 py-0.5 text-right font-medium">{fmt(r.own) ?? missingCell}</td>
                          {r.peers.map((c) => (
                            <td key={c.iso3} className="pr-2 py-0.5 text-right" title={c.period}>
                              {fmt(c.value) ?? missingCell}
                            </td>
                          ))}
                          <td className="pr-2 py-0.5 text-right">{fmt(r.median) ?? missingCell}</td>
                          <td className="py-0.5 text-right">{r.rank !== undefined ? t('pe_rankOf', { rank: r.rank, of: r.of }) : missingCell}</td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('pe_pulls', { asOf: answer.asOf, list: answer.peers.filter((p) => p.pullDate).map((p) => `${countryName(p.iso3)} ${p.pullDate}`).join(', ') || '–' })} {t('pe_rankNote')}
          </p>
        </>
      )}
    </div>
  );
};
