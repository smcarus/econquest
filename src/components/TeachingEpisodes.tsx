import React, { useEffect, useState } from 'react';
import { Download, GraduationCap, Plus, Trash2 } from 'lucide-react';
import type { Episode } from '../utils/researchLibrary';
import { useResearchLibrary } from './SavedResearch';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Reports > Teaching episodes: a country, a past decision date and the questions students answer
 * from the data. The handout takes its figures from the app's own series for that date (the
 * decision replay), each with its source; the teacher's copy adds what the bank did and your notes.
 */

type Country = { iso3: string; countryName: string };

const inputCls = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

function EpisodeView({ ep, countryName, onSave, onDelete }: { ep: Episode; countryName: string; onSave: (patch: { questions: string; notes: string }) => Promise<boolean>; onDelete: () => void }) {
  const [questions, setQuestions] = useState(ep.questions.join('\n'));
  const [notes, setNotes] = useState(ep.notes);
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const t = useT(REPORTS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setPreview(null);
    fetch(`/api/decision-replay/${encodeURIComponent(ep.iso3)}?date=${encodeURIComponent(ep.date)}`)
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!live) return;
        setPreview(r.ok ? b.sentence : t('te_missing', { why: tx(b.message || b.policyMissing || `HTTP ${r.status}`) }));
      })
      .catch((e: Error) => live && setPreview(t('te_missing', { why: e.message })));
    return () => {
      live = false;
    };
  }, [ep.iso3, ep.date]);

  const save = async () => {
    if (saved) return;
    if (await onSave({ questions, notes })) setSaved(true);
  };

  return (
    <div className="px-2 pb-3 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('te_view', { country: countryName, date: ep.date })} <span className="text-slate-800 dark:text-slate-200">{preview ?? t('te_loading')}</span> {t('te_studentsSee')}
      </p>
      <div>
        <label className="ui-label block mb-1" htmlFor={`ep-q-${ep.id}`}>
          {t('te_questions')}
        </label>
        <textarea
          id={`ep-q-${ep.id}`}
          rows={4}
          value={questions}
          onChange={(e) => {
            setQuestions(e.target.value);
            setSaved(false);
          }}
          onBlur={() => void save()}
          className={`w-full ${inputCls}`}
        />
      </div>
      <div>
        <label className="ui-label block mb-1" htmlFor={`ep-n-${ep.id}`}>
          {t('te_notes')}
        </label>
        <textarea
          id={`ep-n-${ep.id}`}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          onBlur={() => void save()}
          className={`w-full ${inputCls}`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ui-btn" disabled={saved} onClick={() => void save()}>
          {saved ? t('te_saved') : t('te_save')}
        </button>
        <a className="ui-btn inline-flex" href={`/api/export/episode/${encodeURIComponent(ep.id)}.md`} download>
          <Download className="w-3.5 h-3.5" /> {t('te_handout')}
        </a>
        <a className="ui-btn inline-flex" href={`/api/export/episode/${encodeURIComponent(ep.id)}.md?teacher=1`} download>
          <Download className="w-3.5 h-3.5" /> {t('te_teacher')}
        </a>
        <button type="button" className="ui-btn" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" /> {t('te_delete')}
        </button>
      </div>
    </div>
  );
}

export const TeachingEpisodes: React.FC<{ countries?: Country[] }> = ({ countries = [] }) => {
  const lib = useResearchLibrary();
  const [title, setTitle] = useState('');
  const [iso3, setIso3] = useState(countries[0]?.iso3 || '');
  const [date, setDate] = useState('');
  const [questions, setQuestions] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const t = useT(REPORTS);

  useEffect(() => {
    if (!iso3 && countries[0]) setIso3(countries[0].iso3);
  }, [countries.map((c) => c.iso3).join(',')]);

  const nameOf = (code: string) => countries.find((c) => c.iso3 === code)?.countryName || code;
  const ready = title.trim() && /^[A-Z]{3}$/.test(iso3) && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <section className="ui-panel" data-teaching-episodes="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('te_title')}
        </h2>
        <p className="ui-label">
          {t('te_intro')}
        </p>
      </header>
      <div className="p-4 space-y-3">
        {lib.error && <p className="text-xs text-amber-700 dark:text-amber-400">{lib.error}</p>}
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            const id = await lib.createEpisode({ title: title.trim(), iso3, date, questions });
            if (id) {
              setTitle('');
              setQuestions('');
              setOpenId(id);
            }
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="episode-title">
              {t('te_epTitle')}
            </label>
            <input id="episode-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('te_titlePh')} className={`flex-1 min-w-[12rem] ${inputCls}`} />
            <label className="sr-only" htmlFor="episode-country">
              {t('te_country')}
            </label>
            <select id="episode-country" value={iso3} onChange={(e) => setIso3(e.target.value)} className={inputCls}>
              {countries.map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.countryName}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="episode-date">
              {t('te_date')}
            </label>
            <input id="episode-date" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <label className="sr-only" htmlFor="episode-questions">
            {t('te_questions')}
          </label>
          <textarea
            id="episode-questions"
            rows={3}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder={t('te_qPh')}
            className={`w-full ${inputCls}`}
          />
          <button type="submit" className="ui-btn" disabled={!ready}>
            <Plus className="w-3.5 h-3.5" /> {t('te_add')}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('te_tip')}</p>
        </form>

        {lib.episodes.length === 0 && !lib.error && <p className="ui-body">{t('te_none')}</p>}
        {lib.episodes.length > 0 && (
          <ul className="space-y-1.5">
            {lib.episodes.map((ep) => (
              <li key={ep.id} className="border border-slate-200 dark:border-slate-700" data-episode={ep.title}>
                <button
                  type="button"
                  aria-expanded={openId === ep.id}
                  onClick={() => setOpenId(openId === ep.id ? null : ep.id)}
                  className="w-full text-left px-2 py-1.5 flex flex-wrap items-baseline justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-sm text-slate-900 dark:text-white">{ep.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {nameOf(ep.iso3)} · {ep.date} · {ep.questions.length === 1 ? t('te_q1') : t('te_qn', { n: ep.questions.length })}
                  </span>
                </button>
                {openId === ep.id && (
                  <EpisodeView
                    key={ep.id}
                    ep={ep}
                    countryName={nameOf(ep.iso3)}
                    onSave={(patch) => lib.updateEpisode(ep.id, patch)}
                    onDelete={async () => {
                      if (await lib.deleteEpisode(ep.id)) setOpenId(null);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
