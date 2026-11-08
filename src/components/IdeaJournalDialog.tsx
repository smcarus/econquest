/**
 * Menu > Idea journal: log a trade idea (thesis, instrument, direction, horizon, invalidation),
 * fixed and hashed when logged, and scored from the same free feeds at the horizon. Hit rate and
 * average move by idea type. Scoring, not a signal. See src/utils/ideaJournal.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { NotebookPen, X } from 'lucide-react';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { IDEA_MAX_DAYS, IDEA_MIN_DAYS, IDEA_TYPES, THESIS_MAX, type Idea, type IdeaInstrument, type IdeaScore, type IdeaSummaryRow, type IdeaType } from '../utils/ideaJournal';
import { takeIdeaPrefill } from '../utils/ideaHandoff';
import { ValidationBadge } from './ValidationBadge';
import { useT } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

type Row = { idea: Idea; hashOk: boolean; name: string; score: IdeaScore };
type Reply = { ideas: Row[]; summary: IdeaSummaryRow[]; badLines: number; file: string; method: string };

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${(v * 100).toFixed(0)}%`);
const countries = [...SOVEREIGN_CATALOG].sort((a, b) => a.countryName.localeCompare(b.countryName));

export function IdeaJournalDialog({ onClose }: { onClose: () => void }) {
  const t = useT(MENU);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prefill = useRef(takeIdeaPrefill());
  const [data, setData] = useState<Reply | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [iso3, setIso3] = useState(prefill.current?.iso3 || '');
  const [instrument, setInstrument] = useState<IdeaInstrument>('fx');
  const [direction, setDirection] = useState('long');
  const [horizonDays, setHorizonDays] = useState('90');
  const [invalidationPct, setInvalidationPct] = useState('');
  const [thesis, setThesis] = useState(prefill.current?.thesis?.slice(0, THESIS_MAX) || '');
  const [type, setType] = useState<IdeaType>('macro');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/ideas');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
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
  useEffect(() => {
    setDirection(instrument === 'fx' ? 'long' : 'up');
    if (instrument !== 'fx') setInvalidationPct('');
  }, [instrument]);

  const submit = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iso3, instrument, direction, horizonDays: Number(horizonDays), ...(invalidationPct ? { invalidationPct: Number(invalidationPct) } : {}), thesis, type }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setSaveMsg(t('ij_logged', { level: j.idea.entry.level, date: j.idea.entry.date, horizon: j.idea.horizonDate, hash: String(j.idea.hash).slice(0, 12) }));
      setThesis('');
      await load();
    } catch (e: any) {
      setSaveMsg(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="idea-journal-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl" data-idea-journal>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="idea-journal-title" className="ui-title inline-flex items-center gap-2">
            <NotebookPen className="w-4 h-4" aria-hidden /> {t('ij_title')} <ValidationBadge id="idea_journal" />
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('ij_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ij_intro')}
          </p>
          <fieldset className="space-y-2 border border-slate-200 dark:border-slate-800 p-3">
            <legend className="text-sm font-medium px-1">{t('ij_log')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-xs space-y-1">
                <span>{t('ij_country')}</span>
                <select className={field} value={iso3} onChange={(e) => setIso3(e.target.value)} data-idea-country>
                  <option value="">{t('ij_choose')}</option>
                  {countries.map((c) => (
                    <option key={c.iso3} value={c.iso3}>
                      {c.countryName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span>{t('ij_instrument')}</span>
                <select className={field} value={instrument} onChange={(e) => setInstrument(e.target.value as IdeaInstrument)}>
                  <option value="fx">{t('ij_fx')}</option>
                  <option value="policy">{t('ij_policy')}</option>
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span>{t('ij_direction')}</span>
                <select className={field} value={direction} onChange={(e) => setDirection(e.target.value)}>
                  {(instrument === 'fx' ? [['long', t('ij_long')], ['short', t('ij_short')]] : [['up', t('ij_up')], ['down', t('ij_down')], ['unchanged', t('ij_unchanged')]]).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span>{t('ij_horizon', { min: IDEA_MIN_DAYS, max: IDEA_MAX_DAYS })}</span>
                <input className={field} type="number" min={IDEA_MIN_DAYS} max={IDEA_MAX_DAYS} value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)} />
              </label>
              <label className="text-xs space-y-1">
                <span>{t('ij_invalidation')}</span>
                <input className={field} type="number" min={0} max={50} step="0.1" value={invalidationPct} disabled={instrument !== 'fx'} onChange={(e) => setInvalidationPct(e.target.value)} />
              </label>
              <label className="text-xs space-y-1">
                <span>{t('ij_type')}</span>
                <select className={field} value={type} onChange={(e) => setType(e.target.value as IdeaType)}>
                  {IDEA_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {t(`ij_t_${ty}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-xs space-y-1 block">
              <span>{t('ij_thesis')}</span>
              <textarea className={`${field} w-full`} rows={3} maxLength={THESIS_MAX} value={thesis} onChange={(e) => setThesis(e.target.value)} data-idea-thesis />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="ui-btn" disabled={saving || !iso3 || !thesis.trim()} onClick={() => void submit()} data-idea-log>
                {t('ij_logBtn')}
              </button>
              {saveMsg && <span className="text-xs" role="status">{saveMsg}</span>}
            </div>
          </fieldset>

          {loadError && <p className="text-sm text-rose-700 dark:text-rose-400">{t('ij_loadError', { detail: loadError })}</p>}
          {data && (
            <>
              <table className="w-full text-xs" data-idea-summary>
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1">{t('ij_type')}</th>
                    <th>{t('ij_closed')}</th>
                    <th>{t('ij_hitRate')}</th>
                    <th>{t('ij_avgMove')}</th>
                    <th>{t('ij_open')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.map((r) => (
                    <tr key={r.type} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1">{t(`ij_t_${r.type}`)}</td>
                      <td>{r.closed}</td>
                      <td>{pct(r.hitRate)}</td>
                      <td>{r.avgFxMove === null ? '–' : `${r.avgFxMove.toFixed(2)}%`}</td>
                      <td>{r.open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.badLines > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('ij_badLines', { n: data.badLines, file: data.file })}</p>}
              {data.ideas.length === 0 ? (
                <p className="text-sm text-slate-500">{t('ij_none')}</p>
              ) : (
                <ul className="space-y-2" data-idea-list>
                  {data.ideas.map(({ idea, hashOk, name, score }) => (
                    <li key={idea.id} className="border border-slate-200 dark:border-slate-800 p-2 text-xs space-y-1">
                      <div className="flex flex-wrap gap-x-3 font-medium">
                        <span>{name}</span>
                        <span>
                          {t(`ij_${idea.direction}` as 'ij_up')} {idea.instrument === 'fx' ? t('ij_vsUsd', { target: idea.target }) : t('ij_policyOf', { target: idea.target })}
                        </span>
                        <span>{t(`ij_t_${idea.type}`)}</span>
                        <span>{t(`ij_s_${score.status}`)}{score.move !== undefined ? ` (${score.move > 0 ? '+' : ''}${score.move}${idea.instrument === 'fx' ? '%' : ' pts'})` : ''}</span>
                      </div>
                      <div className="text-slate-500">
                        {t('ij_entry', { level: idea.entry.level, date: idea.entry.date, horizon: idea.horizonDate })}
                        {idea.invalidationPct !== undefined ? t('ij_invalidAt', { pct: idea.invalidationPct }) : ''}
                        {score.at ? t('ij_lastRead', { level: score.at.level, date: score.at.date }) : ''}
                        {t('ij_loggedBy', { date: idea.loggedAt.slice(0, 10), author: idea.author })}
                        {score.note ? ` ${score.note}.` : ''}
                      </div>
                      <div className="whitespace-pre-wrap">{idea.thesis}</div>
                      <div className={hashOk ? 'text-slate-400' : 'text-rose-700 dark:text-rose-400'}>
                        {hashOk ? t('ij_hashOk', { hash: idea.hash.slice(0, 16) }) : t('ij_hashBad')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-500">{data.method} {t('ij_keptIn', { file: data.file })}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
