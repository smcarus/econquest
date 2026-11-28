/**
 * Assignments inside a class card (roadmap Phase 5, Q3): the teacher sets a Quest with a due time in
 * the class's time zone, a rule on AI use and instructions, gives single students more time, shows
 * entries early and copies last term's assignments; students hand in before their due time and see
 * classmates' entries once everyone's time is up. Feedback, peer review and sensitive topics (Q6) are
 * in ./ClassFeedback.tsx; sealed hand-in files (Q9) in ./ClassHandInFile.tsx. Server: src/server/routes/classes.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { readLang, translateText } from '../i18n/lang';
import { useT, useTx } from '../i18n/useLang';
import { describeRule, RULE_WORDS, type QuestRule, type RuleWords } from '../utils/questRules';
import type { QuestLevel } from '../utils/quests';
import type { ClassView } from '../utils/classes';
import type { AiRule } from '../utils/classAssignments';
import { FeedbackCell, MyFeedback, PeerReview, useAnonName, type FeedbackRow } from './ClassFeedback';
import { TeacherHandIns } from './ClassHandInFile';

type Answer = { probability?: number; level?: number; position?: number; value?: number };
type Assignment = {
  id: string;
  questId: string;
  title: string;
  due: string;
  dueUtc: string;
  extended: boolean;
  classDue: string;
  aiRule: AiRule;
  instructions: string;
  open: boolean;
  entriesVisible: boolean;
  revealed: boolean;
  peerReview?: boolean;
  sensitive?: boolean;
  answerKind: 'probability' | 'level' | 'position' | 'value';
  positions?: string[];
  classQuest?: boolean;
  summary?: string;
  rule?: QuestRule;
  level?: QuestLevel | null;
  questMissing: boolean;
  myEntry?: { answer: Answer; rationale: string; at: string };
  entryCount?: number;
  studentCount?: number;
  extensions?: Array<{ accountId: string; username: string; due: string }>;
};
type EntryRow = { name: string; ref?: string; mine: boolean; answer: Answer; rationale: string; code: string; at: string; username?: string; ai?: { rule: AiRule; note?: string; declaredNone?: boolean }; replaced?: number; late?: boolean };

export const fieldCls = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

export async function call(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error ? translateText(j.error, readLang()) : `HTTP ${r.status}`);
  return j;
}

/** "2027-02-04T23:59" as the person reads it, and the same instant in their own time zone. */
function whenText(local: string, utc: string, tz: string) {
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const own = new Date(utc).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return { classTime: `${local.replace('T', ' ')} (${tz})`, own: mine === tz ? '' : own };
}

/** A settle rule in the chosen language, built from the same parts as on a Quest page. */
export function useRuleText() {
  const t = useT(QUESTS);
  const tx = useTx();
  const words = Object.fromEntries(Object.keys(RULE_WORDS).map((k) => [k, t(k as keyof typeof QUESTS.en)])) as RuleWords;
  return (r: QuestRule) => describeRule(r, words, tx);
}

function answerText(a: Answer, positions?: string[]) {
  if (typeof a.probability === 'number') return `${Math.round(a.probability * 1000) / 10}%`;
  if (typeof a.position === 'number') return positions?.[a.position - 1] ?? `#${a.position}`;
  if (typeof a.level === 'number') return String(a.level);
  if (typeof a.value === 'number') return String(a.value);
  return '';
}

export function ClassAssignments({ cls, otherTeaching }: { cls: ClassView; otherTeaching: ClassView[] }) {
  const t = useT(QUESTS);
  const [list, setList] = useState<Assignment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const teacher = cls.myRole === 'teacher';
  const base = `/api/classes/${encodeURIComponent(cls.id)}`;
  const load = useCallback(() => {
    call(`${base}/assignments`).then((j) => setList(j.assignments)).catch((e) => setErr(e?.message || String(e)));
  }, [base]);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    setNote(null);
    try {
      await fn();
      load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  const [copyFrom, setCopyFrom] = useState('');

  return (
    <section className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-2" aria-label={t('asgTitle')} data-class-assignments>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-medium">{t('asgTitle')}</h4>
        <a className="text-xs underline" href={`${base}/calendar.ics`} download data-class-calendar>
          {t('asgCalendar')}
        </a>
      </div>
      {err && <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      {note && <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">{note}</p>}
      {list && list.length === 0 && <p className="text-xs text-slate-500">{t('asgNone')}</p>}
      <ul className="space-y-2">
        {(list ?? []).map((a) => (
          <AssignmentItem key={a.id} a={a} cls={cls} base={base} act={act} />
        ))}
      </ul>
      {teacher && !cls.archived && <NewAssignment base={base} act={act} />}
      {teacher && !cls.archived && otherTeaching.length > 0 && (
        <form
          className="flex flex-wrap gap-1 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const j = await call(`${base}/copy`, 'POST', { fromClassId: copyFrom });
              setNote(t('asgCopied', { n: j.copied.length, skipped: j.skipped.length ? ` ${t('asgCopySkipped', { list: j.skipped.map((s: string) => translateText(s, readLang())).join('; ') })}` : '' }));
            });
          }}
        >
          <label className="text-xs space-y-1">
            <span className="block">{t('asgCopyFrom')}</span>
            <select className={fieldCls} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} data-class-copy-from>
              <option value="">—</option>
              {otherTeaching.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.term.label})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ui-btn text-xs" disabled={!copyFrom} data-class-copy>
            {t('asgCopy')}
          </button>
        </form>
      )}
    </section>
  );
}

function NewAssignment({ base, act }: { base: string; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useT(QUESTS);
  const [open, setOpen] = useState(false);
  const [quests, setQuests] = useState<Array<{ id: string; title: string; type: string; closesOn: string; approved: boolean; classQuest?: boolean; level?: QuestLevel | null }>>([]);
  const [level, setLevel] = useState<QuestLevel | ''>('');
  const [questId, setQuestId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:59');
  const [aiRule, setAiRule] = useState<AiRule>('note');
  const [instructions, setInstructions] = useState('');
  const [peerReview, setPeerReview] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  useEffect(() => {
    if (open) call(`${base}/quests`).then((j) => setQuests(j.quests)).catch(() => setQuests([]));
  }, [open, base]);
  if (!open)
    return (
      <button type="button" className="ui-btn text-xs" onClick={() => setOpen(true)} data-class-new-assignment>
        {t('asgNew')}
      </button>
    );
  const q = quests.find((x) => x.id === questId);
  return (
    <form
      className="space-y-1 border border-slate-200 dark:border-slate-800 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void act(async () => {
          await call(`${base}/assignments`, 'POST', { questId, due: `${date}T${time}`, aiRule, instructions, peerReview: peerReview && q?.type === 'debate', sensitive });
          setOpen(false);
          setQuestId('');
          setDate('');
          setInstructions('');
          setPeerReview(false);
          setSensitive(false);
        });
      }}
      data-class-assignment-form
    >
      <label className="text-xs inline-flex items-center gap-1">
        <span>{t('filterLevel')}</span>
        <select className={fieldCls} value={level} onChange={(e) => setLevel(e.target.value as QuestLevel | '')} data-class-assignment-level>
          <option value="">{t('anyLevel')}</option>
          {(['intro', 'intermediate', 'advanced'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`level_${k}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs block space-y-1">
        <span className="block">{t('asgQuest')}</span>
        <select className={`${fieldCls} w-full`} value={questId} onChange={(e) => setQuestId(e.target.value)} data-class-assignment-quest>
          <option value="">—</option>
          {quests
            .filter((x) => !level || x.level === level || x.id === questId)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} ({[t(`type_${x.type}` as keyof typeof QUESTS.en), x.level ? t(`level_${x.level}` as keyof typeof QUESTS.en) : '', x.approved ? '' : t('status_draft'), x.classQuest ? t('cqMarker') : ''].filter(Boolean).join(', ')})
              </option>
            ))}
        </select>
      </label>
      {q && <p className="text-xs text-slate-500">{t('asgClosesOn', { date: q.closesOn })}</p>}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="block">{t('asgDueDate')}</span>
          <input type="date" className={fieldCls} value={date} max={q?.closesOn} onChange={(e) => setDate(e.target.value)} data-class-assignment-date />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">{t('asgDueTime')}</span>
          <input type="time" className={fieldCls} value={time} onChange={(e) => setTime(e.target.value)} data-class-assignment-time />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">{t('asgAiRule')}</span>
          <select className={fieldCls} value={aiRule} onChange={(e) => setAiRule(e.target.value as AiRule)} data-class-assignment-ai>
            <option value="allowed">{t('asgAi_allowed')}</option>
            <option value="note">{t('asgAi_note')}</option>
            <option value="none">{t('asgAi_none')}</option>
          </select>
        </label>
      </div>
      <label className="text-xs block space-y-1">
        <span className="block">{t('asgInstructions')}</span>
        <textarea className={`${fieldCls} w-full h-16`} value={instructions} onChange={(e) => setInstructions(e.target.value)} data-class-assignment-instructions />
      </label>
      {q?.type === 'debate' && (
        <label className="text-xs flex items-start gap-1">
          <input type="checkbox" className="mt-0.5" checked={peerReview} onChange={(e) => setPeerReview(e.target.checked)} data-class-assignment-peer />
          <span>{t('fbPeer')}</span>
        </label>
      )}
      <label className="text-xs flex items-start gap-1">
        <input type="checkbox" className="mt-0.5" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} data-class-assignment-sensitive />
        <span>{t('fbSensitive')}</span>
      </label>
      <div className="flex gap-1">
        <button type="submit" className="ui-btn text-xs" disabled={!questId || !date} data-class-assignment-save>
          {t('asgSet')}
        </button>
        <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setOpen(false)}>
          {t('asgCancel')}
        </button>
      </div>
    </form>
  );
}

function AssignmentItem({ a, cls, base, act }: { a: Assignment; cls: ClassView; base: string; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useT(QUESTS);
  const teacher = cls.myRole === 'teacher';
  const student = cls.myRole === 'student';
  const when = whenText(a.due, a.dueUtc, cls.timeZone);
  const ruleText = useRuleText();
  const anon = useAnonName();
  const [entries, setEntries] = useState<{ rows: EntryRow[]; hidden: boolean } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [panel, setPanel] = useState<'' | 'feedback' | 'peer'>('');
  const [extUser, setExtUser] = useState('');
  const [extDate, setExtDate] = useState('');
  const [extTime, setExtTime] = useState('23:59');
  const aBase = `${base}/assignments/${encodeURIComponent(a.id)}`;
  const showEntries = async () => {
    const j = await call(`${aBase}/entries`);
    // Feedback first, so each entry's form opens with the marker's own note already in it.
    if (!student) await loadFeedback();
    setEntries({ rows: j.entries, hidden: j.hiddenUntilDue });
  };
  const loadFeedback = async () => {
    const f = await call(`${aBase}/feedback`);
    setFeedback(f.feedback);
  };
  const isDebate = a.answerKind === 'position';
  return (
    <li className="border border-slate-200 dark:border-slate-800 p-2 space-y-1 text-xs" data-class-assignment={a.questId}>
      <div className="text-sm text-slate-900 dark:text-white">{a.title}</div>
      <div className="text-slate-500">
        {t('asgDue', { when: when.classTime })}
        {when.own ? ` · ${t('asgYourTime', { when: when.own })}` : ''}
        {a.extended ? ` · ${t('asgExtended')}` : ''}
        {` · ${a.open ? t('asgOpen') : t('asgClosed')}`}
      </div>
      {(a.level || a.classQuest) && (
        <div className="text-slate-500">
          {[a.level ? t(`level_${a.level}` as keyof typeof QUESTS.en) : '', a.classQuest ? t('cqMarker') : ''].filter(Boolean).join(' · ')}
        </div>
      )}
      {a.summary && <p className="whitespace-pre-wrap" data-class-assignment-summary>{a.summary}</p>}
      {a.rule && <p className="text-slate-600 dark:text-slate-300">{t('cqSettledBy', { rule: ruleText(a.rule) })}</p>}
      <div className="text-slate-500">{t(`asgAiShown_${a.aiRule}` as keyof typeof QUESTS.en)}</div>
      {a.peerReview && <div className="text-slate-500" data-class-peer-on>{t('fbPeerOn')}</div>}
      {a.sensitive && <div className="text-amber-800 dark:text-amber-300" data-class-sensitive-on>{t('fbSensitiveOn')}</div>}
      {a.instructions && <p className="whitespace-pre-wrap">{a.instructions}</p>}
      {a.questMissing && <p className="text-rose-700 dark:text-rose-400">{t('asgQuestMissing')}</p>}
      {a.myEntry && <p data-class-my-entry>{t('asgMyEntry', { answer: answerText(a.myEntry.answer, a.positions), at: new Date(a.myEntry.at).toLocaleString() })}</p>}
      {student && a.open && !a.questMissing && <HandIn a={a} aBase={aBase} act={act} />}
      {typeof a.entryCount === 'number' && <p>{t('asgCount', { n: a.entryCount, of: a.studentCount ?? 0 })}</p>}
      <div className="flex flex-wrap gap-1">
        {(a.entriesVisible || a.myEntry) && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(showEntries)} data-class-show-entries>
            {t('asgEntries')}
          </button>
        )}
        {student && a.myEntry && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" aria-expanded={panel === 'feedback'} onClick={() => setPanel(panel === 'feedback' ? '' : 'feedback')} data-class-show-feedback>
            {t('fbShow')}
          </button>
        )}
        {a.peerReview && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" aria-expanded={panel === 'peer'} onClick={() => setPanel(panel === 'peer' ? '' : 'peer')} data-class-show-peer>
            {t('pvShow')}
          </button>
        )}
        {teacher && !cls.archived && isDebate && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${aBase}/settings`, 'POST', { peerReview: !a.peerReview }))} data-class-peer-toggle>
            {a.peerReview ? t('fbPeerTurnOff') : t('fbPeerTurnOn')}
          </button>
        )}
        {teacher && !cls.archived && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${aBase}/settings`, 'POST', { sensitive: !a.sensitive }))} data-class-sensitive-toggle>
            {a.sensitive ? t('fbSensitiveTurnOff') : t('fbSensitiveTurnOn')}
          </button>
        )}
        {teacher && !a.revealed && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${aBase}/reveal`, 'POST', {}))} data-class-reveal>
            {t('asgReveal')}
          </button>
        )}
        {teacher && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(aBase, 'DELETE'))} data-class-remove-assignment>
            {t('asgRemove')}
          </button>
        )}
      </div>
      {teacher && !a.questMissing && <TeacherHandIns aBase={aBase} archived={cls.archived} onLoaded={() => void act(async () => {})} />}
      {panel === 'feedback' && <MyFeedback aBase={aBase} />}
      {panel === 'peer' && <PeerReview aBase={aBase} positions={a.positions} archived={cls.archived} />}
      {entries && (
        <div className="overflow-x-auto" data-class-entries>
          {entries.hidden && <p className="text-slate-500">{t('asgHidden')}</p>}
          <table className="w-full">
            <caption className="sr-only">{t('asgEntries')}</caption>
            <thead>
              <tr className="text-left text-slate-500">
                <th scope="col" className="font-normal">{t('classesColName')}</th>
                <th scope="col" className="font-normal">{t('asgColAnswer')}</th>
                <th scope="col" className="font-normal">{t('asgColWhy')}</th>
                {!student && <th scope="col" className="font-normal">{t('asgColAi')}</th>}
                {!student && <th scope="col" className="font-normal">{t('fbShow')}</th>}
              </tr>
            </thead>
            <tbody>
              {entries.rows.map((r) => (
                <tr key={`${r.ref ?? r.name}-${r.at}`} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td>
                    {anon(r.name)}
                    {r.late ? ` (${t('asgLate')})` : ''}
                    {r.replaced ? ` (${t('asgReplaced', { n: r.replaced })})` : ''}
                  </td>
                  <td>{answerText(r.answer, a.positions)}</td>
                  <td className="whitespace-pre-wrap">
                    {r.rationale}
                    {r.code ? ` ${r.code}` : ''}
                  </td>
                  {!student && <td>{r.ai?.note ?? (r.ai?.declaredNone ? t('asgAiDeclaredNone') : '')}</td>}
                  {!student && r.ref && (
                    <td className="min-w-48">
                      <FeedbackCell aBase={aBase} entryRef={r.ref} rows={feedback.filter((f) => f.ref === r.ref)} archived={cls.archived} onSaved={() => void loadFeedback()} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {teacher && (
        <form
          className="flex flex-wrap gap-1 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => call(`${aBase}/extension`, 'POST', { username: extUser, due: `${extDate}T${extTime}` }).then(() => setExtUser('')));
          }}
        >
          <span className="w-full text-slate-500">
            {t('asgExtensions')}
            {a.extensions && a.extensions.length > 0 ? ` ${a.extensions.map((x) => `${x.username} (${x.due.replace('T', ' ')})`).join(', ')}` : ` ${t('asgNoExtensions')}`}
          </span>
          <label>
            <span className="sr-only">{t('classesColUser')}</span>
            <input className={`${fieldCls} w-28`} value={extUser} onChange={(e) => setExtUser(e.target.value)} placeholder={t('classesColUser')} data-class-ext-user />
          </label>
          <label>
            <span className="sr-only">{t('asgDueDate')}</span>
            <input type="date" className={fieldCls} value={extDate} onChange={(e) => setExtDate(e.target.value)} data-class-ext-date />
          </label>
          <label>
            <span className="sr-only">{t('asgDueTime')}</span>
            <input type="time" className={fieldCls} value={extTime} onChange={(e) => setExtTime(e.target.value)} />
          </label>
          <button type="submit" className="ui-btn text-xs" disabled={!extUser.trim() || !extDate} data-class-ext-save>
            {t('asgGiveTime')}
          </button>
        </form>
      )}
    </li>
  );
}

function HandIn({ a, aBase, act }: { a: Assignment; aBase: string; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useT(QUESTS);
  const [value, setValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [code, setCode] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [declared, setDeclared] = useState(false);
  const answer = () => {
    const n = Number(value);
    if (a.answerKind === 'probability') return { probability: n / 100 };
    if (a.answerKind === 'position') return { position: n };
    if (a.answerKind === 'level') return { level: n };
    return { value: n };
  };
  return (
    <form
      className="space-y-1 border border-slate-200 dark:border-slate-800 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void act(() => call(`${aBase}/entries`, 'POST', { answer: answer(), rationale, code, aiNote, aiDeclaredNone: declared }));
      }}
      data-class-hand-in
    >
      <div className="flex flex-wrap gap-2 items-end">
        {a.answerKind === 'position' ? (
          <label className="space-y-1">
            <span className="block">{t('asgPosition')}</span>
            <select className={fieldCls} value={value} onChange={(e) => setValue(e.target.value)} data-class-answer>
              <option value="">—</option>
              {(a.positions ?? []).map((p, i) => (
                <option key={p} value={String(i + 1)}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="space-y-1">
            <span className="block">{a.answerKind === 'probability' ? t('probYes') : a.answerKind === 'level' ? t('yourForecast') : t('asgYourFigure')}</span>
            <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-class-answer />
          </label>
        )}
        {a.answerKind === 'value' && (
          <label className="space-y-1">
            <span className="block">{t('asgCodeUrl')}</span>
            <input className={`${fieldCls} w-64`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="https://" />
          </label>
        )}
      </div>
      <label className="block space-y-1">
        <span className="block">{t('asgWhy')}</span>
        <textarea className={`${fieldCls} w-full h-16`} value={rationale} onChange={(e) => setRationale(e.target.value)} data-class-rationale />
      </label>
      {a.aiRule === 'note' && (
        <label className="block space-y-1">
          <span className="block">{t('asgAiNoteLabel')}</span>
          <input className={`${fieldCls} w-full`} value={aiNote} onChange={(e) => setAiNote(e.target.value)} data-class-ai-note />
        </label>
      )}
      {a.aiRule === 'none' && (
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} data-class-ai-declare />
          <span>{t('asgAiDeclare')}</span>
        </label>
      )}
      <button type="submit" className="ui-btn text-xs" disabled={!value.trim()} data-class-hand-in-save>
        {a.myEntry ? t('asgReplace') : t('asgHandIn')}
      </button>
    </form>
  );
}
