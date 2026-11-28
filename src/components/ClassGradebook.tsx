/**
 * The gradebook inside a class card (roadmap Phase 5, Q8): the teacher sets the weights, sees the
 * rows and downloads them as a CSV file; a student downloads their own record. Withdrawn or
 * unresolvable Quests drop out of the marks, and sensitive topics never leave this copy.
 * Server: src/server/routes/classes.ts; rules: src/utils/classGradebook.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { useT } from '../i18n/useLang';
import { call, fieldCls } from './ClassAssignments';
import type { ClassView } from '../utils/classes';
import type { GradeRow, GradeWeights } from '../utils/classGradebook';

type Key = keyof typeof QUESTS.en;
type Book = { weights: GradeWeights; rows: GradeRow[]; leftOut: { sensitive: number; voided: number } };
const KEYS: Array<keyof GradeWeights> = ['participation', 'accuracy', 'calibration', 'marks'];
const num = (x: number | null) => (x === null ? '—' : String(Math.round(x * 10) / 10));

export function ClassGradebook({ cls }: { cls: ClassView }) {
  const t = useT(QUESTS);
  const base = `/api/classes/${encodeURIComponent(cls.id)}`;
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [weights, setWeights] = useState<Record<keyof GradeWeights, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    call(`${base}/gradebook`)
      .then((j: Book) => {
        setBook(j);
        setWeights(Object.fromEntries(KEYS.map((k) => [k, String(j.weights[k])])) as Record<keyof GradeWeights, string>);
      })
      .catch((e) => setErr(e?.message || String(e)));
  }, [base]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (cls.myRole === 'student')
    return (
      <section className="border-t border-slate-200 dark:border-slate-800 pt-2 text-xs space-y-1" data-class-my-record>
        <a className="underline" href={`${base}/my-record.csv`} download>
          {t('gbMyRecord')}
        </a>
        <p className="text-slate-500">{t('gbMyRecordNote')}</p>
      </section>
    );
  if (cls.myRole !== 'teacher') return null;
  const sum = weights ? KEYS.reduce((s, k) => s + (Number(weights[k]) || 0), 0) : 0;
  return (
    <section className="border-t border-slate-200 dark:border-slate-800 pt-2 text-xs space-y-2" aria-label={t('gbTitle')} data-class-gradebook>
      <button type="button" className="ui-btn ui-btn-ghost text-xs" aria-expanded={open} onClick={() => setOpen(!open)} data-class-gradebook-toggle>
        {t('gbTitle')}
      </button>
      {err && <p className="text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      {open && book && weights && (
        <div className="space-y-2">
          <p className="border-l-2 border-amber-400 pl-2">{t('ctLuckWarning')}</p>
          <p className="text-slate-500">{t('gbExplain')}</p>
          {(book.leftOut.sensitive > 0 || book.leftOut.voided > 0) && <p className="text-slate-500">{t('gbLeftOut', { sensitive: book.leftOut.sensitive, voided: book.leftOut.voided })}</p>}
          <form
            className="flex flex-wrap gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              call(`${base}/gradebook-settings`, 'POST', { weights: Object.fromEntries(KEYS.map((k) => [k, Number(weights[k])])) })
                .then(load)
                .catch((x) => setErr(x?.message || String(x)));
            }}
            data-class-gradebook-weights
          >
            {KEYS.map((k) => (
              <label key={k} className="space-y-1">
                <span className="block">{t(`gbW_${k}` as Key)}</span>
                <input type="number" min={0} max={100} step="any" className={`${fieldCls} w-20`} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: e.target.value })} data-class-weight={k} />
              </label>
            ))}
            <span className={sum === 100 ? 'text-slate-500' : 'text-rose-700 dark:text-rose-400'}>{t('gbSum', { n: Math.round(sum * 100) / 100 })}</span>
            <button type="submit" className="ui-btn text-xs" disabled={sum !== 100} data-class-weights-save>
              {t('gbSaveWeights')}
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full" data-class-gradebook-rows>
              <caption className="sr-only">{t('gbTitle')}</caption>
              <thead>
                <tr className="text-left text-slate-500">
                  <th scope="col" className="font-normal">{t('classesColName')}</th>
                  <th scope="col" className="font-normal text-right">{t('gbW_participation')}</th>
                  <th scope="col" className="font-normal text-right">{t('gbW_accuracy')}</th>
                  <th scope="col" className="font-normal text-right">{t('gbW_calibration')}</th>
                  <th scope="col" className="font-normal text-right">{t('gbW_marks')}</th>
                  <th scope="col" className="font-normal text-right">{t('gbTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {book.rows.map((r) => (
                  <tr key={r.username || r.student} className="border-t border-slate-100 dark:border-slate-800">
                    <td>{r.student}</td>
                    <td className="text-right">{num(r.participation)}</td>
                    <td className="text-right">{num(r.accuracy)}</td>
                    <td className="text-right">{num(r.calibration)}</td>
                    <td className="text-right">{num(r.marksPercent)}</td>
                    <td className="text-right font-medium">{num(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a className="underline" href={`${base}/gradebook.csv`} download data-class-gradebook-csv>
            {t('gbDownload')}
          </a>
        </div>
      )}
    </section>
  );
}
