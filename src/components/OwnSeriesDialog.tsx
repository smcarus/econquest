/**
 * Menu > Your data: load your own series from a CSV file (for example figures from your national
 * statistics office that no connected feed carries), check it, save it, list and delete it.
 * Your figures are kept exactly as given and labelled "Your file" wherever they show.
 * See src/engine/ownSeries.ts for the file rules.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { isCountryIso3 } from '../data/iso3166';
import { useT } from '../i18n/useLang';
import { OWN_DATA } from '../i18n/messages/ownData';
import { OWN_FREQS, OWN_NO_COUNTRY, type OwnFreq, type OwnPoint, type OwnSeriesSummary } from '../engine/ownSeries';

type Check = { ok: boolean; problems: string[]; rowsRead: number; blank: number; count: number; first: OwnPoint | null; last: OwnPoint | null; sample: OwnPoint[] };

const countries = [...SOVEREIGN_CATALOG].sort((a, b) => a.countryName.localeCompare(b.countryName));
const FREQ_KEY = { daily: 'freqDaily', weekly: 'freqWeekly', monthly: 'freqMonthly', quarterly: 'freqQuarterly', annual: 'freqAnnual' } as const satisfies Record<OwnFreq, string>;

export function OwnSeriesDialog({ onClose }: { onClose: () => void }) {
  const t = useT(OWN_DATA);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [list, setList] = useState<OwnSeriesSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');
  const [freq, setFreq] = useState<OwnFreq>('monthly');
  const [iso3, setIso3] = useState('');
  // "Another country": any ISO 3166 three-letter code, for countries outside the watchlist catalogue.
  const [otherIso3, setOtherIso3] = useState('');
  const [source, setSource] = useState('');
  const [licence, setLicence] = useState('');
  const [note, setNote] = useState('');
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/own-series');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setList((await r.json()).series);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Any change to the file or description means the last check no longer applies.
  useEffect(() => setCheck(null), [csv, label, unit, freq, iso3, otherIso3, source, licence, note]);

  const country = iso3 === 'other' ? otherIso3.trim().toUpperCase() : iso3;
  const meta = () => ({ label, unit, freq, iso3: country, source, licence, note });
  const pickFile = async (f: File | undefined) => {
    setMsg(null);
    if (!f) return;
    if (f.size > 2_000_000) {
      setMsg(t('tooBig'));
      return;
    }
    setFileName(f.name);
    setCsv(await f.text());
    if (!label) setLabel(f.name.replace(/\.(csv|txt|tsv)$/i, '').replace(/[_-]+/g, ' '));
  };
  const runCheck = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/own-series/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meta: meta(), csv }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setCheck(await r.json());
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/own-series', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meta: meta(), csv }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMsg(t('saved', { label, count: j.saved.count, first: j.saved.first, last: j.saved.last, hash: String(j.saved.csvSha256).slice(0, 12) }));
      setCsv('');
      setFileName('');
      setLabel('');
      setUnit('');
      setSource('');
      setLicence('');
      setNote('');
      await load();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    const r = await fetch(`/api/own-series/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? t('deleted') : j?.error || `HTTP ${r.status}`);
    await load();
  };

  const field = 'w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
  const nameOf = (code: string) => (code === OWN_NO_COUNTRY ? t('notOneCountryShort') : countries.find((c) => c.iso3 === code)?.countryName || code);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="own-series-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl" data-own-series>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="own-series-title" className="ui-title inline-flex items-center gap-2">
            <FileUp className="w-4 h-4" aria-hidden /> {t('title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('intro1')} <strong>{t('yourFile')}</strong> {t('intro2')}
          </p>
          <details className="text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer">{t('layoutTitle')}</summary>
            <div className="mt-1 space-y-1">
              <p>{t('layout1')}</p>
              <pre className="bg-slate-100 dark:bg-slate-800 p-2 overflow-x-auto">date,value{'\n'}2024-01,3.2{'\n'}2024-02,3.5{'\n'}2024-03,</pre>
              <p>{t('layout2')}</p>
              <p>{t('layout3')}</p>
              <p>{t('layout4')}</p>
            </div>
          </details>

          <fieldset className="space-y-2 border border-slate-200 dark:border-slate-800 p-3">
            <legend className="text-sm font-medium px-1">{t('loadSeries')}</legend>
            <label className="text-xs space-y-1 block">
              <span>{t('csvFile')} {fileName && <em className="not-italic text-slate-500">({fileName})</em>}</span>
              <input type="file" accept=".csv,.tsv,.txt,text/csv" className="block text-sm" onChange={(e) => void pickFile(e.target.files?.[0])} data-own-file />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span>{t('name')}</span>
                <input className={field} value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder={t('namePlaceholder')} data-own-label />
              </label>
              <label className="text-xs space-y-1">
                <span>{t('unit')}</span>
                <input className={field} value={unit} maxLength={60} onChange={(e) => setUnit(e.target.value)} placeholder={t('unitPlaceholder')} data-own-unit />
              </label>
              <label className="text-xs space-y-1">
                <span>{t('frequency')}</span>
                <select className={field} value={freq} onChange={(e) => setFreq(e.target.value as OwnFreq)} data-own-freq>
                  {OWN_FREQS.map((f) => (
                    <option key={f} value={f}>
                      {t(FREQ_KEY[f])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span>{t('country')}</span>
                <select className={field} value={iso3} onChange={(e) => setIso3(e.target.value)} data-own-country>
                  <option value="">{t('choose')}</option>
                  <option value={OWN_NO_COUNTRY}>{t('notOneCountry')}</option>
                  <option value="other">{t('anotherCountry')}</option>
                  {countries.map((c) => (
                    <option key={c.iso3} value={c.iso3}>
                      {c.countryName}
                    </option>
                  ))}
                </select>
                {iso3 === 'other' && (
                  <input
                    className={field}
                    value={otherIso3}
                    maxLength={3}
                    onChange={(e) => setOtherIso3(e.target.value)}
                    placeholder={t('codePlaceholder')}
                    aria-label={t('codeAria')}
                    aria-invalid={otherIso3.length === 3 && !isCountryIso3(otherIso3.toUpperCase())}
                    data-own-other-country
                  />
                )}
              </label>
            </div>
            <label className="text-xs space-y-1 block">
              <span>{t('source')}</span>
              <input className={field} value={source} maxLength={500} onChange={(e) => setSource(e.target.value)} placeholder={t('sourcePlaceholder')} data-own-source />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span>{t('licence')}</span>
                <input className={field} value={licence} maxLength={500} onChange={(e) => setLicence(e.target.value)} placeholder={t('licencePlaceholder')} />
              </label>
              <label className="text-xs space-y-1">
                <span>{t('note')}</span>
                <input className={field} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" className="ui-btn" disabled={busy || !csv} onClick={() => void runCheck()} data-own-check>
                {t('check')}
              </button>
              <button type="button" className="ui-btn ui-btn-primary" disabled={busy || !check?.ok} onClick={() => void save()} data-own-save>
                {t('save')}
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('checkFirst')}</span>
            </div>
            {check && !check.ok && (
              <div role="alert" className="text-xs text-red-700 dark:text-red-300 space-y-0.5" data-own-problems>
                {check.problems.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            {check?.ok && (
              <div className="text-xs text-emerald-700 dark:text-emerald-300" data-own-preview>
                <p>
                  {t('preview', { count: check.count, first: check.first?.date ?? '', last: check.last?.date ?? '' })}
                  {check.blank ? (check.blank === 1 ? t('skippedOne') : t('skippedMany', { n: check.blank })) : ''}{t('firstRows')}{' '}
                  {check.sample.map((p) => `${p.date} ${p.value}`).join(' · ')}
                </p>
              </div>
            )}
            {msg && (
              <p className="text-xs text-slate-700 dark:text-slate-200" role="status">
                {msg}
              </p>
            )}
          </fieldset>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('yourSeries')}</h3>
            {loadError && <p className="text-xs text-red-700 dark:text-red-300">{t('loadFailed', { error: loadError })}</p>}
            {list && !list.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('none')}</p>}
            {list && list.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-own-list>
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 pr-2">{t('name')}</th>
                      <th className="py-1 pr-2">{t('country')}</th>
                      <th className="py-1 pr-2">{t('colFigures')}</th>
                      <th className="py-1 pr-2">{t('colSource')}</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
                        <td className="py-1 pr-2">
                          {s.meta.label} <span className="text-slate-500">({s.meta.unit}, {s.meta.freq})</span>
                          {!s.intact && <span className="block text-red-700 dark:text-red-300">{t('changedOutside')}</span>}
                        </td>
                        <td className="py-1 pr-2">{nameOf(s.meta.iso3)}</td>
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {t('range', { count: s.count, first: s.first ?? '', last: s.last ?? '' })}
                        </td>
                        <td className="py-1 pr-2">
                          {t('yourFilePrefix', { source: s.meta.source })}
                          {s.meta.licence ? ` (${s.meta.licence})` : ''}
                        </td>
                        <td className="py-1 text-right">
                          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void remove(s.id)}>
                            {confirmDelete === s.id ? t('confirmDelete') : t('delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
