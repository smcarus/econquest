import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, X } from 'lucide-react';
import { ISO_NUMERIC_TO_ISO3 } from '../data/worldCountries';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import type { AddedCountry } from '../types/council';
import { FIELD_CLASS } from './SignInPage';
import { useT } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

/**
 * Research > One country > Add a country. The user picks a country and, if they know them, its
 * currency code and region. No figures are typed in or filled from templates: like every other
 * country, its figures come from the feeds and read Missing until a feed answers.
 */
export function AddCountryDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (c: AddedCountry) => void }) {
  const t = useT(MENU);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ iso3: string; name: string } | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const known = useMemo(() => new Set(SOVEREIGN_CATALOG.map((c) => c.iso3)), []);
  const countries = useMemo(() => {
    const byIso = new Map<string, string>();
    for (const c of Object.values(ISO_NUMERIC_TO_ISO3)) byIso.set(c.iso3, c.name);
    const q = query.trim().toLowerCase();
    return [...byIso.entries()]
      .map(([iso3, name]) => ({ iso3, name }))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.iso3.toLowerCase() === q)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    onAdd({
      iso3: picked.iso3,
      countryName: picked.name,
      currencyCode: currencyCode.trim().toUpperCase().slice(0, 3),
      region: region.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-country-title"
        onSubmit={submit}
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="add-country-title" className="ui-title inline-flex items-center gap-2">
            <Globe className="w-4 h-4" aria-hidden /> {t('adc_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('adc_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto ui-body">
          <p className="ui-label">
            {t('adc_intro')}
          </p>
          <label className="block space-y-0.5">
            <span className="ui-label block">{t('adc_find')}</span>
            <input className={FIELD_CLASS} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('adc_findPh')} />
          </label>
          <ul className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800" aria-label={t('adc_countries')}>
            {countries.map((c) => (
              <li key={c.iso3}>
                <button
                  type="button"
                  onClick={() => setPicked(c)}
                  aria-pressed={picked?.iso3 === c.iso3}
                  className={`w-full text-left px-3 py-1.5 text-sm ${
                    picked?.iso3 === c.iso3 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {c.name} <span className="ui-label">{c.iso3}{known.has(c.iso3) ? t('adc_already') : ''}</span>
                </button>
              </li>
            ))}
            {!countries.length && <li className="px-3 py-2 ui-label">{t('adc_noMatch')}</li>}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-0.5">
              <span className="ui-label block">{t('adc_currency')}</span>
              <input className={FIELD_CLASS} value={currencyCode} maxLength={3} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="KES" />
            </label>
            <label className="block space-y-0.5">
              <span className="ui-label block">{t('adc_region')}</span>
              <input className={FIELD_CLASS} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Africa" />
            </label>
          </div>
          <p className="ui-label">{t('adc_currencyNote')}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost">
            {t('c_cancel')}
          </button>
          <button type="submit" disabled={!picked} className="ui-btn ui-btn-primary">
            {picked ? t('adc_add', { name: picked.name }) : t('adc_pick')}
          </button>
        </div>
      </form>
    </div>
  );
}
