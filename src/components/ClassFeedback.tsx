/**
 * Feedback inside an assignment (roadmap Phase 5, Q6): the teacher and markers comment on each entry
 * with an optional short mark; students read the feedback on their own entry; with peer review on a
 * debate, students review two classmates' arguments without names once everyone's due time has
 * passed. Server: src/server/routes/classes.ts; rules: src/utils/classFeedback.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { useT } from '../i18n/useLang';
import { call, fieldCls } from './ClassAssignments';

export type FeedbackRow = { ref?: string; student?: string; by: string; mine?: boolean; text: string; mark: string; at: string };

/** "Student 3" or "Classmate B" from the server, in the chosen language; any other name as it is. */
export function useAnonName() {
  const t = useT(QUESTS);
  return (name: string) => {
    const m = /^(Student|Classmate) (\w+)$/.exec(name);
    return m ? t(m[1] === 'Student' ? 'anonStudent' : 'anonClassmate', { n: m[2]! }) : name;
  };
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function FeedbackList({ rows }: { rows: FeedbackRow[] }) {
  const t = useT(QUESTS);
  return (
    <ul className="space-y-1">
      {rows.map((f) => (
        <li key={`${f.by}-${f.at}`} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2">
          <div className="text-slate-500">
            {`${f.by} · ${when(f.at)}`}
            {f.mark ? ` · ${t('fbMarkShown', { mark: f.mark })}` : ''}
          </div>
          <p className="whitespace-pre-wrap">{f.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** One entry's feedback for the teacher or a marker: what is written so far, and a form for their own. */
export function FeedbackCell({ aBase, entryRef, rows, onSaved, archived }: { aBase: string; entryRef: string; rows: FeedbackRow[]; onSaved: () => void; archived: boolean }) {
  const t = useT(QUESTS);
  const mine = rows.find((r) => r.mine);
  const [text, setText] = useState(mine?.text ?? '');
  const [mark, setMark] = useState(mine?.mark ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-1" data-class-feedback={entryRef}>
      {rows.length > 0 && <FeedbackList rows={rows} />}
      {!archived && (
        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            setSaved(false);
            call(`${aBase}/feedback`, 'POST', { ref: entryRef, text, mark })
              .then(() => {
                setSaved(true);
                onSaved();
              })
              .catch((x) => setErr(x?.message || String(x)));
          }}
        >
          <label className="block">
            <span className="sr-only">{t('fbWrite')}</span>
            <textarea className={`${fieldCls} w-full h-14`} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('fbWrite')} data-class-feedback-text />
          </label>
          <div className="flex flex-wrap gap-1 items-center">
            <label>
              <span className="sr-only">{t('fbMark')}</span>
              <input className={`${fieldCls} w-24`} value={mark} maxLength={20} onChange={(e) => setMark(e.target.value)} placeholder={t('fbMark')} data-class-feedback-mark />
            </label>
            <button type="submit" className="ui-btn text-xs" disabled={!text.trim()} data-class-feedback-save>
              {t('fbSave')}
            </button>
            {saved && <span role="status" className="text-emerald-700 dark:text-emerald-400">{t('fbSaved')}</span>}
          </div>
          {err && <p role="alert" className="text-rose-700 dark:text-rose-400">{err}</p>}
        </form>
      )}
    </div>
  );
}

/** A student's view of the feedback on their own entry. */
export function MyFeedback({ aBase }: { aBase: string }) {
  const t = useT(QUESTS);
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    call(`${aBase}/feedback`).then((j) => setRows(j.feedback)).catch((x) => setErr(x?.message || String(x)));
  }, [aBase]);
  return (
    <div className="space-y-1" data-class-my-feedback>
      <h5 className="font-medium">{t('fbYours')}</h5>
      {err && <p role="alert" className="text-rose-700 dark:text-rose-400">{err}</p>}
      {rows && rows.length === 0 && <p className="text-slate-500">{t('fbNone')}</p>}
      {rows && rows.length > 0 && <FeedbackList rows={rows} />}
    </div>
  );
}

type ToReview = { ref: string; label: string; answer: Record<string, number>; rationale: string; myReview: string };
type PeerReply =
  | { open: boolean; opensAt: string; handedIn: boolean; toReview: ToReview[]; aboutMine: Array<{ text: string; at: string }> }
  | { open: boolean; opensAt: string; expected: number; reviews: Array<{ author: string; reviewer: string; text: string; at: string }> };

/** Peer review on a debate: students review two arguments; the teacher and markers read every review. */
export function PeerReview({ aBase, positions, archived }: { aBase: string; positions?: string[]; archived: boolean }) {
  const t = useT(QUESTS);
  const anon = useAnonName();
  const [data, setData] = useState<PeerReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    call(`${aBase}/peer`).then(setData).catch((x) => setErr(x?.message || String(x)));
  }, [aBase]);
  useEffect(load, [load]);
  if (err) return <p role="alert" className="text-rose-700 dark:text-rose-400">{err}</p>;
  if (!data) return null;
  return (
    <div className="space-y-2" data-class-peer>
      <h5 className="font-medium">{t('pvShow')}</h5>
      {!data.open && <p className="text-slate-500">{t('pvNotOpen', { when: when(data.opensAt) })}</p>}
      {'reviews' in data && data.open && (
        <>
          <p>{t('pvCount', { n: data.reviews.length, of: data.expected })}</p>
          <ul className="space-y-1">
            {data.reviews.map((r) => (
              <li key={`${r.reviewer}-${r.author}`} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                <div className="text-slate-500">{t('pvWho', { reviewer: anon(r.reviewer), author: anon(r.author) })}</div>
                <p className="whitespace-pre-wrap">{r.text}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {'toReview' in data && data.open && (
        <>
          {!data.handedIn && <p className="text-slate-500">{t('pvNotHandedIn')}</p>}
          {data.toReview.length > 0 && <p className="text-slate-500">{t('pvIntro')}</p>}
          {data.toReview.map((x) => (
            <ReviewForm key={x.ref} x={x} aBase={aBase} positions={positions} archived={archived} onSaved={load} />
          ))}
          <div data-class-peer-mine>
            <h5 className="font-medium">{t('pvAboutMine')}</h5>
            {data.aboutMine.length === 0 ? (
              <p className="text-slate-500">{t('pvNoneYet')}</p>
            ) : (
              <ul className="space-y-1">
                {data.aboutMine.map((r) => (
                  <li key={r.at} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2 whitespace-pre-wrap">
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewForm({ x, aBase, positions, archived, onSaved }: { x: ToReview; aBase: string; positions?: string[]; archived: boolean; onSaved: () => void }) {
  const t = useT(QUESTS);
  const anon = useAnonName();
  const [text, setText] = useState(x.myReview);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const position = typeof x.answer.position === 'number' ? positions?.[x.answer.position - 1] ?? `#${x.answer.position}` : '';
  return (
    <form
      className="space-y-1 border border-slate-200 dark:border-slate-800 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        setSaved(false);
        call(`${aBase}/peer`, 'POST', { ref: x.ref, text })
          .then(() => {
            setSaved(true);
            onSaved();
          })
          .catch((y) => setErr(y?.message || String(y)));
      }}
      data-class-peer-review={x.ref}
    >
      <div className="font-medium">
        {anon(x.label)}
        {position ? `: ${position}` : ''}
      </div>
      <p className="whitespace-pre-wrap">{x.rationale}</p>
      <label className="block space-y-1">
        <span className="block">{t('pvYourReview')}</span>
        <textarea className={`${fieldCls} w-full h-16`} value={text} disabled={archived} onChange={(e) => setText(e.target.value)} data-class-peer-text />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className="ui-btn text-xs" disabled={archived || !text.trim()} data-class-peer-save>
          {t('pvSave')}
        </button>
        {saved && <span role="status" className="text-emerald-700 dark:text-emerald-400">{t('fbSaved')}</span>}
      </div>
      {err && <p role="alert" className="text-rose-700 dark:text-rose-400">{err}</p>}
    </form>
  );
}
