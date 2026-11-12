import React, { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { CountrySanctions, SanctionsEntry, SanctionsData } from '../utils/sanctionsLists';
import { SANCTIONS_LISTS } from '../utils/sanctionsLists';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Sanctions lists (src/utils/sanctionsLists.ts): OFAC and UN
 * entries tied to the country by address or nationality, by programme, and a plain-text name search.
 */

type Reply =
  | ({ ok: true; sentence: string; method: string; files: SanctionsData['files']; skipped: SanctionsData['skipped']; unknownCountries: Array<[string, number]> } & CountrySanctions)
  | { ok: false; reason: string; method: string; skipped?: SanctionsData['skipped'] };

const TYPE_KEY = { individual: 'sanc_type_individual', entity: 'sanc_type_entity', vessel: 'sanc_type_vessel', aircraft: 'sanc_type_aircraft' } as const;

export const SanctionsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<SanctionsEntry[] | null>(null);
  const t = useT(PANELS);
  const tx = useTx();
  const typeLabel = (k: string) => (k in TYPE_KEY ? t(TYPE_KEY[k as keyof typeof TYPE_KEY]) : k);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/sanctions/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    fetch(`/api/sanctions-search?q=${encodeURIComponent(q.trim())}`)
      .then((r) => r.json())
      .then((b: { matches: SanctionsEntry[] }) => setMatches(b.matches || []))
      .catch(() => setMatches([]));
  };

  return (
    <section className="ui-panel" data-sanctions="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Ban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('sanc_title', { country: countryName })}
          <ValidationBadge id="sanctions_lists" />
        </h2>
        <p className="ui-label">{t('sanc_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('sanc_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}{reply.skipped?.length ? t('sanc_notRead', { files: reply.skipped.map((s) => `${s.file} (${tx(s.reason)})`).join('; ') }) : ''}
          </p>
        )}
        {reply?.ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-sanctions-sentence="true">{tx(reply.sentence)}</p>
            <table className="text-xs">
              <tbody>
                {reply.byList.map((l) => (
                  <tr key={l.list} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-4 text-slate-500 dark:text-slate-400">{SANCTIONS_LISTS[l.list].name}</td>
                    <td className="py-0.5 pr-4 tabular-nums text-right">{l.entries}</td>
                    <td className="py-0.5 text-slate-500">{Object.entries(l.byType).map(([k, n]) => `${n} ${typeLabel(k)}`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reply.programs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{t('sanc_programmes')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {reply.programs.map((p) => `${p.program} (${SANCTIONS_LISTS[p.list].short}) ${p.entries}`).join(' · ')}
                </p>
              </div>
            )}
            {reply.unListedByYear.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('sanc_unByYear', { years: reply.unListedByYear.map((y) => `${y.year} ${y.entries}`).join(', ') })}
              </p>
            )}
            <form className="flex gap-2 items-center" onSubmit={search}>
              <input type="search" className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" aria-label={t('sanc_searchAria')} placeholder={t('sanc_searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit" className="ui-btn text-xs">{t('sanc_search')}</button>
            </form>
            {matches && (
              <div className="text-xs" data-sanctions-matches="true">
                {matches.length === 0 ? (
                  <p className="text-slate-500">{t('sanc_noMatch')}</p>
                ) : (
                  <ul className="space-y-0.5">
                    {matches.map((m) => (
                      <li key={`${m.list}-${m.id}`}>
                        {m.name} <span className="text-slate-500">({SANCTIONS_LISTS[m.list].short} {m.id}; {typeLabel(m.type)}; {m.programs.join(', ') || t('sanc_noProgramme')}{m.countries.length ? `; ${m.countries.join(', ')}` : ''})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('sanc_filesRead', { files: reply.files.map((f) => `${f.file} (${t('sanc_entries', { n: f.entries })}${f.modified ? `, ${f.modified}` : ''})`).join('; ') })}
              {reply.skipped.length ? t('sanc_notRead', { files: reply.skipped.map((s) => `${s.file} (${tx(s.reason)})`).join('; ') }) : ''}
              {reply.unknownCountries.length ? t('sanc_unmatched', { names: reply.unknownCountries.map(([n, k]) => `${n} (${k})`).join(', ') }) : ''}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('c_method', { method: reply.method })} {t('risk_notSignal')}</p>
          </>
        )}
      </div>
    </section>
  );
};
