/**
 * Sealed hand-in files (roadmap Phase 5, Q9). The teacher downloads a hand-in sheet for an
 * assignment and loads the sealed files that come back; a student who works on their own copy of the
 * app opens the sheet under Menu > Quests > Hand in, writes their answer and seals it. Sealing
 * happens in the browser, so the answer never leaves the student's computer except inside the file.
 * Rules: src/utils/classHandIn.ts; server: src/server/routes/classes.ts.
 */
import { useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { useT } from '../i18n/useLang';
import { call, fieldCls } from './ClassAssignments';
import { sealFingerprint, sealHandIn, sheetProblems, sealedProblems, type HandInSheet } from '../utils/classHandIn';

type Loaded = { student: string; fingerprint: string; sealedAt: string; late: boolean };

const readJson = (f: File) =>
  f.text().then((s) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  });

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** In an assignment, for the teacher: the sheet to send out, and the sealed files to load. */
export function TeacherHandIns({ aBase, archived, onLoaded }: { aBase: string; archived: boolean; onLoaded: () => void }) {
  const t = useT(QUESTS);
  const [done, setDone] = useState<Loaded[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = async (files: FileList | null) => {
    setErr(null);
    for (const f of Array.from(files ?? [])) {
      try {
        const sealed = await readJson(f);
        if (sealedProblems(sealed).length) throw new Error(t('hiNotSealed'));
        const r: Loaded = await call(`${aBase}/hand-ins`, 'POST', { sealed });
        setDone((d) => [...d, r]);
        onLoaded();
      } catch (e: any) {
        setErr(`${f.name}: ${e?.message || String(e)}`);
      }
    }
  };
  return (
    <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-1" data-class-hand-in-files>
      <p className="text-slate-500">{t('hiTeacherNote')}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <a className="underline" href={`${aBase}/sheet`} download data-class-sheet>
          {t('hiDownloadSheet')}
        </a>
        {!archived && (
          <label className="flex flex-wrap items-center gap-1 max-w-full">
            <span>{t('hiLoadFiles')}</span>
            <input type="file" accept=".json,application/json" multiple className="text-xs max-w-full" onChange={(e) => void load(e.target.files).then(() => (e.target.value = ''))} data-class-load-sealed />
          </label>
        )}
      </div>
      {err && (
        <p className="text-rose-700 dark:text-rose-400" role="alert">
          {err}
        </p>
      )}
      {done.length > 0 && (
        <ul className="space-y-0.5" aria-live="polite" data-class-loaded>
          {done.map((d) => (
            <li key={d.fingerprint}>{t(d.late ? 'hiLoadedLate' : 'hiLoaded', { student: d.student, at: new Date(d.sealedAt).toLocaleString(), fp: d.fingerprint })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Menu > Quests > Hand in: open a sheet from the teacher, answer, seal and save the file. */
export function SealedHandInTab() {
  const t = useT(QUESTS);
  const [sheet, setSheet] = useState<HandInSheet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [code, setCode] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [declared, setDeclared] = useState(false);
  const [sealed, setSealed] = useState<{ fp: string; at: string } | null>(null);

  const open = async (f: File | undefined) => {
    setErr(null);
    setSealed(null);
    if (!f) return;
    const s = await readJson(f);
    if (sheetProblems(s).length) {
      setSheet(null);
      setErr(t('hiNotSheet'));
      return;
    }
    setSheet(s as HandInSheet);
    setValue('');
  };

  const answer = (k: HandInSheet['answerKind']): Record<string, number> => {
    const n = Number(value);
    if (k === 'probability') return { probability: n / 100 };
    if (k === 'position') return { position: n };
    if (k === 'level') return { level: n };
    return { value: n };
  };

  const seal = async (s: HandInSheet) => {
    setErr(null);
    const n = Number(value);
    if (!value.trim() || !Number.isFinite(n) || (s.answerKind === 'probability' && (n < 0 || n > 100))) return setErr(t('hiNeedAnswer'));
    try {
      const sealedAt = new Date().toISOString();
      const file = await sealHandIn(s, { username: username.trim(), name: name.trim() || username.trim(), answer: answer(s.answerKind), rationale, code, aiNote, aiDeclaredNone: declared, sealedAt, sheetId: s.sheetId, questHash: s.questHash });
      const fp = await sealFingerprint(file);
      download(`econquest-hand-in-${username.trim().replace(/[^A-Za-z0-9_-]/g, '') || 'student'}-${fp.slice(0, 6)}.json`, file);
      setSealed({ fp, at: sealedAt });
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const late = sheet ? Date.now() > Date.parse(sheet.dueUtc) : false;
  return (
    <section className="space-y-3 text-sm" aria-label={t('tab_handin')} data-quest-hand-in>
      <p className="text-slate-600 dark:text-slate-300">{t('hiStudentIntro')}</p>
      <label className="block space-y-1">
        <span className="block text-xs">{t('hiOpenSheet')}</span>
        <input type="file" accept=".json,application/json" className="text-xs max-w-full" onChange={(e) => void open(e.target.files?.[0])} data-hand-in-sheet />
      </label>
      {err && (
        <p className="text-rose-700 dark:text-rose-400" role="alert">
          {err}
        </p>
      )}
      {sheet && (
        <form
          className="space-y-2 border border-slate-200 dark:border-slate-800 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void seal(sheet);
          }}
          data-hand-in-form
        >
          <div className="text-slate-900 dark:text-white font-medium">{sheet.title}</div>
          <div className="text-xs text-slate-500">{t('hiSheetMeta', { cls: sheet.className, due: `${sheet.due.replace('T', ' ')} (${sheet.timeZone})` })}</div>
          {late && <p className="text-amber-800 dark:text-amber-300 text-xs">{t('hiPastDue')}</p>}
          {sheet.summary && <p className="whitespace-pre-wrap text-xs">{sheet.summary}</p>}
          {sheet.instructions && <p className="whitespace-pre-wrap text-xs">{sheet.instructions}</p>}
          <div className="text-xs text-slate-500">{t(`asgAiShown_${sheet.aiRule}` as keyof typeof QUESTS.en)}</div>
          <div className="flex flex-wrap gap-2 items-end text-xs">
            <label className="space-y-1">
              <span className="block">{t('hiUsername')}</span>
              <input className={`${fieldCls} w-36`} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required data-hand-in-username />
            </label>
            <label className="space-y-1">
              <span className="block">{t('hiName')}</span>
              <input className={`${fieldCls} w-44`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            {sheet.answerKind === 'position' ? (
              <label className="space-y-1">
                <span className="block">{t('asgPosition')}</span>
                <select className={fieldCls} value={value} onChange={(e) => setValue(e.target.value)} data-hand-in-answer>
                  <option value="">—</option>
                  {(sheet.positions ?? []).map((p, i) => (
                    <option key={p} value={String(i + 1)}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="space-y-1">
                <span className="block">{sheet.answerKind === 'probability' ? t('probYes') : sheet.answerKind === 'level' ? t('yourForecast') : t('asgYourFigure')}</span>
                <input className={`${fieldCls} w-32`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} data-hand-in-answer />
              </label>
            )}
            {sheet.answerKind === 'value' && (
              <label className="space-y-1">
                <span className="block">{t('asgCodeUrl')}</span>
                <input className={`${fieldCls} w-64`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="https://" />
              </label>
            )}
          </div>
          <label className="block space-y-1 text-xs">
            <span className="block">{t('asgWhy')}</span>
            <textarea className={`${fieldCls} w-full h-20`} value={rationale} onChange={(e) => setRationale(e.target.value)} data-hand-in-rationale />
          </label>
          {sheet.aiRule === 'note' && (
            <label className="block space-y-1 text-xs">
              <span className="block">{t('asgAiNoteLabel')}</span>
              <input className={`${fieldCls} w-full`} value={aiNote} onChange={(e) => setAiNote(e.target.value)} data-hand-in-ai-note />
            </label>
          )}
          {sheet.aiRule === 'none' && (
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
              <span>{t('asgAiDeclare')}</span>
            </label>
          )}
          <p className="text-xs text-slate-500">{t('hiSealNote')}</p>
          <button type="submit" className="ui-btn text-xs" disabled={!username.trim() || !value.trim()} data-hand-in-seal>
            {t('hiSeal')}
          </button>
          {sealed && (
            <p className="text-xs" aria-live="polite" data-hand-in-sealed>
              {t('hiSealed', { fp: sealed.fp, at: new Date(sealed.at).toLocaleString() })}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
