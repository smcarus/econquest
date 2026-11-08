import React, { useEffect, useState } from 'react';
import { PencilRuler } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import type { Exercise, ExerciseId } from '../utils/exercises';

/**
 * Country Research > History & data > Exercises (src/utils/exercises.ts): questions worked out
 * from the app's series at a month, checked within a tolerance, with the answer key (held back on
 * the server in exam mode).
 */

type Ex = Pick<Exercise, 'id' | 'question' | 'hint' | 'unit' | 'tolerance'> & Partial<Pick<Exercise, 'answer' | 'inputs' | 'workings'>>;
type Reply = { exercises: Ex[]; notSet: Array<{ id: ExerciseId; reason: string }>; examMode: boolean; method: string };
type Checked = { correct: boolean; tolerance: number; unit: string; answer?: number };

const defaultMonth = () => `${new Date().getUTCFullYear() - 1}-12`;

export const ExercisesPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [month, setMonth] = useState(defaultMonth);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [given, setGiven] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, Checked | string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const t = useT(TOOLS);
  const tx = useTx();

  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
    let live = true;
    setReply(null);
    setError(null);
    setChecked({});
    setShown({});
    fetch(`/api/exercises/${encodeURIComponent(iso3)}?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3, month]);

  const check = (id: string) => {
    fetch(`/api/exercises/${encodeURIComponent(iso3)}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, month, answer: Number(String(given[id] || '').replace(',', '.')) }) })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        setChecked((c) => ({ ...c, [id]: r.ok ? (b as Checked) : String(b.error || `HTTP ${r.status}`) }));
      })
      .catch(() => setChecked((c) => ({ ...c, [id]: t('c_serverDown') })));
  };
  const input = 'px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

  return (
    <section className="ui-panel" data-exercises="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <PencilRuler className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ex_title', { country: countryName })}
        </h2>
        <p className="ui-label">{t('ex_intro')}</p>
      </header>
      <div className="p-4 space-y-3 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">{t('ex_month')}</span>
          <input type="month" className={input} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('ex_monthAria')} />
        </label>
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ex_what'), error })}</p>}
        {reply?.examMode && <p className="text-amber-700 dark:text-amber-400">{t('ex_exam')}</p>}
        {reply && reply.exercises.length === 0 && <p className="ui-body">{t('ex_none', { month })}</p>}
        {reply?.exercises.map((e, i) => {
          const c = checked[e.id];
          return (
            <div key={e.id} className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1" data-exercise={e.id}>
              <p className="text-slate-900 dark:text-white">
                {i + 1}. {tx(e.question)}
              </p>
              <p className="text-slate-500 dark:text-slate-400">{tx(e.hint)}</p>
              <div className="flex items-center gap-2">
                <input className={`${input} w-24 tabular-nums`} inputMode="decimal" value={given[e.id] || ''} onChange={(ev) => setGiven((g) => ({ ...g, [e.id]: ev.target.value }))} aria-label={t('ex_answerAria', { n: i + 1 })} />
                <span className="text-slate-500">{tx(e.unit)}</span>
                <button type="button" className="ui-btn" onClick={() => check(e.id)} disabled={!given[e.id]}>
                  {t('ex_check')}
                </button>
                {!reply.examMode && e.answer !== undefined && (
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setShown((s) => ({ ...s, [e.id]: !s[e.id] }))}>
                    {shown[e.id] ? t('ex_hideKey') : t('ex_key')}
                  </button>
                )}
              </div>
              {typeof c === 'string' && <p className="text-amber-700 dark:text-amber-400">{tx(c)}</p>}
              {c && typeof c !== 'string' && (
                <p className={c.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'} data-exercise-result={c.correct ? 'right' : 'wrong'}>
                  {t(c.correct ? 'ex_right' : c.answer !== undefined ? 'ex_wrongAnswer' : 'ex_wrong', { tol: c.tolerance, unit: tx(c.unit), answer: c.answer ?? '' })}
                </p>
              )}
              {shown[e.id] && e.answer !== undefined && (
                <div className="text-slate-600 dark:text-slate-300" data-answer-key="true">
                  <p>
                    {t('ex_answer', { answer: e.answer, unit: tx(e.unit), workings: tx(e.workings || '') })}
                  </p>
                  <ul className="list-disc ml-4">
                    {e.inputs?.map((x) => (
                      <li key={x.label + x.when}>
                        {tx(x.label)}: {x.value} {tx(x.unit)} ({tx(x.when)}; {tx(x.source)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {reply && reply.notSet.length > 0 && (
          <p className="text-amber-700 dark:text-amber-400" data-missing="true">
            {t('ex_notSet', { list: reply.notSet.map((n) => `${t(`ex_id_${n.id}`)} (${tx(n.reason)})`).join('; ') })}
          </p>
        )}
        {reply && <p className="text-slate-500 dark:text-slate-400">{t('c_method', { method: reply.method })}</p>}
      </div>
    </section>
  );
};
