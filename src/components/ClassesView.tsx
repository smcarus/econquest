/**
 * Classes tab on Menu > Quests (roadmap Phase 5, Q1): join a class with its code, make a class for a
 * term, and, as its teacher, add markers and students, make student accounts from nicknames, change
 * the join code and archive the class. Server: src/server/routes/classes.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { readLang, translateText } from '../i18n/lang';
import { useT } from '../i18n/useLang';
import type { ClassView } from '../utils/classes';

type ListReply = { enabled: boolean; reason?: string; needSignIn?: boolean; classes: ClassView[]; canCreate: boolean };
type Created = { nickname: string; username: string; password: string };

const fieldCls = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

async function call(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error ? translateText(j.error, readLang()) : `HTTP ${r.status}`);
  return j;
}

export function ClassesView() {
  const t = useT(QUESTS);
  const [data, setData] = useState<ListReply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [term, setTerm] = useState({ label: '', starts: '', ends: '' });
  const [created, setCreated] = useState<{ classId: string; rows: Created[] } | null>(null);

  const load = useCallback(() => {
    call('/api/classes').then(setData).catch((e) => setErr(e?.message || String(e)));
  }, []);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  if (!data) return err ? <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p> : null;
  if (!data.enabled || data.needSignIn) return <p className="text-sm text-slate-600 dark:text-slate-300" data-classes-off>{data.reason ? translateText(data.reason, readLang()) : ''}</p>;
  return (
    <div className="space-y-4" data-classes>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('classesIntro')}</p>
      {err && <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => call('/api/classes/join', 'POST', { code }).then(() => setCode('')));
        }}
      >
        <label className="text-xs space-y-1">
          <span className="block">{t('classesJoinCode')}</span>
          <input className={`${fieldCls} w-36 uppercase`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-EFGH" autoComplete="off" data-classes-join-code />
        </label>
        <button type="submit" className="ui-btn" disabled={!code.trim()} data-classes-join>
          {t('classesJoin')}
        </button>
      </form>

      {data.classes.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-300" data-classes-none>{t('classesNone')}</p>}
      <ul className="space-y-3">
        {data.classes.map((c) => (
          <ClassCard key={c.id} cls={c} act={act} created={created?.classId === c.id ? created.rows : null} onCreated={(rows) => setCreated({ classId: c.id, rows })} />
        ))}
      </ul>

      {data.canCreate && (
        <form
          className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => call('/api/classes', 'POST', { name, term }).then(() => {
              setName('');
              setTerm({ label: '', starts: '', ends: '' });
            }));
          }}
          data-classes-new
        >
          <div className="text-sm font-medium">{t('classesNew')}</div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs space-y-1">
              <span className="block">{t('classesName')}</span>
              <input className={`${fieldCls} w-48`} value={name} onChange={(e) => setName(e.target.value)} data-classes-name />
            </label>
            <label className="text-xs space-y-1">
              <span className="block">{t('classesTerm')}</span>
              <input className={`${fieldCls} w-36`} value={term.label} onChange={(e) => setTerm({ ...term, label: e.target.value })} placeholder={t('classesTermExample')} data-classes-term />
            </label>
            <label className="text-xs space-y-1">
              <span className="block">{t('classesStarts')}</span>
              <input type="date" className={fieldCls} value={term.starts} onChange={(e) => setTerm({ ...term, starts: e.target.value })} data-classes-starts />
            </label>
            <label className="text-xs space-y-1">
              <span className="block">{t('classesEnds')}</span>
              <input type="date" className={fieldCls} value={term.ends} onChange={(e) => setTerm({ ...term, ends: e.target.value })} data-classes-ends />
            </label>
            <button type="submit" className="ui-btn" data-classes-make>
              {t('classesMake')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ClassCard({ cls, act, created, onCreated }: { cls: ClassView; act: (fn: () => Promise<unknown>) => Promise<void>; created: Created[] | null; onCreated: (rows: Created[]) => void }) {
  const t = useT(QUESTS);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'marker' | 'student'>('marker');
  const [nicknames, setNicknames] = useState('');
  const teacher = cls.myRole === 'teacher';
  const base = `/api/classes/${encodeURIComponent(cls.id)}`;
  return (
    <li className="border border-slate-200 dark:border-slate-800 p-3 space-y-2" data-class={cls.id} data-class-role={cls.myRole}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-900 dark:text-white">{cls.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t('classesMeta', { term: cls.term.label, starts: cls.term.starts, ends: cls.term.ends, role: t(`classRole_${cls.myRole}`), n: cls.memberCount })}
            {cls.archived ? ` · ${t('classesArchived')}` : ''}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t('classesTeachers', { names: cls.teachers.join(', ') })}</div>
        </div>
        {teacher && cls.code && (
          <div className="text-xs text-right space-y-1">
            <div>
              {t('classesCode')} <code className="text-sm font-semibold" data-class-code>{cls.code}</code>
            </div>
            <div className="flex gap-1 justify-end">
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${base}/code`, 'POST', {}))} data-class-new-code>
                {t('classesNewCode')}
              </button>
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${base}/archive`, 'POST', { archived: !cls.archived }))} data-class-archive>
                {cls.archived ? t('classesRestore') : t('classesArchive')}
              </button>
            </div>
          </div>
        )}
      </div>

      {cls.members && (
        <table className="w-full text-xs" data-class-members>
          <caption className="sr-only">{t('classesMembers')}</caption>
          <thead>
            <tr className="text-left text-slate-500">
              <th scope="col" className="py-1 font-normal">{t('classesColName')}</th>
              <th scope="col" className="py-1 font-normal">{t('classesColUser')}</th>
              <th scope="col" className="py-1 font-normal">{t('classesColRole')}</th>
              {teacher && <th scope="col" className="py-1 font-normal"><span className="sr-only">{t('classesRemove')}</span></th>}
            </tr>
          </thead>
          <tbody>
            {cls.members.map((m) => (
              <tr key={m.accountId} className="border-t border-slate-100 dark:border-slate-800" data-class-member={m.username}>
                <td className="py-1">{m.displayName}</td>
                <td className="py-1">{m.username}</td>
                <td className="py-1">{t(`classRole_${m.role}`)}</td>
                {teacher && (
                  <td className="py-1 text-right">
                    {m.role !== 'teacher' && (
                      <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${base}/members/${encodeURIComponent(m.accountId)}`, 'DELETE'))} aria-label={t('classesRemoveWho', { name: m.displayName })}>
                        {t('classesRemove')}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {teacher && !cls.archived && (
        <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-800 pt-2">
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => call(`${base}/members`, 'POST', { username, role }).then(() => setUsername('')));
            }}
          >
            <div className="text-xs font-medium">{t('classesAdd')}</div>
            <div className="flex flex-wrap gap-1 items-end">
              <label className="text-xs">
                <span className="sr-only">{t('classesColUser')}</span>
                <input className={`${fieldCls} w-32`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('classesColUser')} autoComplete="off" data-class-add-user />
              </label>
              <label className="text-xs">
                <span className="sr-only">{t('classesColRole')}</span>
                <select className={fieldCls} value={role} onChange={(e) => setRole(e.target.value as 'marker' | 'student')} data-class-add-role>
                  <option value="marker">{t('classRole_marker')}</option>
                  <option value="student">{t('classRole_student')}</option>
                </select>
              </label>
              <button type="submit" className="ui-btn text-xs" disabled={!username.trim()} data-class-add>
                {t('classesAddButton')}
              </button>
            </div>
          </form>
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const j = await call(`${base}/students`, 'POST', { nicknames: nicknames.split(/\r?\n/) });
                onCreated(j.created);
                setNicknames('');
              });
            }}
          >
            <label className="text-xs font-medium block" htmlFor={`nick-${cls.id}`}>
              {t('classesNicknames')}
            </label>
            <textarea id={`nick-${cls.id}`} className={`${fieldCls} w-full h-20`} value={nicknames} onChange={(e) => setNicknames(e.target.value)} data-class-nicknames />
            <button type="submit" className="ui-btn text-xs" disabled={!nicknames.trim()} data-class-make-students>
              {t('classesMakeStudents')}
            </button>
          </form>
        </div>
      )}

      {created && created.length > 0 && (
        <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2 space-y-1" data-class-created>
          <p className="text-xs">{t('classesPasswordsOnce')}</p>
          <table className="w-full text-xs">
            <caption className="sr-only">{t('classesNewAccounts')}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="font-normal">{t('classesColName')}</th>
                <th scope="col" className="font-normal">{t('classesColUser')}</th>
                <th scope="col" className="font-normal">{t('classesColPassword')}</th>
              </tr>
            </thead>
            <tbody>
              {created.map((c) => (
                <tr key={c.username}>
                  <td>{c.nickname}</td>
                  <td>{c.username}</td>
                  <td>
                    <code>{c.password}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}
