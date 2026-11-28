/**
 * The class table and each student's report inside a class card (roadmap Phase 5, Q7). The teacher
 * chooses what students see of the table, puts students in teams of 3 to 5 that share a row, and
 * opens a one-page report for any student; a student opens their own. The report explains each
 * number in plain words, as far as the Help setting asks. Server: src/server/routes/classes.ts;
 * rules: src/utils/classReport.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { readLang, translateText } from '../i18n/lang';
import { useT } from '../i18n/useLang';
import { useHelpLevel } from './HelpLevel';
import { call, fieldCls } from './ClassAssignments';
import { useAnonName } from './ClassFeedback';
import type { ClassView } from '../utils/classes';
import type { CoachLine, ReportSummary, TableView } from '../utils/classReport';
import type { EntryScore } from '../utils/questEntries';
import type { CalibrationBin } from '../utils/questStats';

type Key = keyof typeof QUESTS.en;
type Row = { name: string; accountId?: string; mine: boolean; entries: number; settled: number; brier: number | null; probabilitySkill: number | null; levelSkill: number | null };
type TeamRow = Row & { id: string; members: string[] };
type Table = { tableView: TableView; rows: Row[]; teams: TeamRow[]; allTeams?: Array<{ id: string; name: string; members: string[] }>; sensitiveLeftOut: boolean };
type Report = {
  student: string;
  className: string;
  term: string;
  madeAt: string;
  summary: ReportSummary;
  entries: Array<{ title: string; answer: Record<string, number>; at: string; score: EntryScore; positions?: string[] }>;
  feedback: Array<{ assignment: string; by: string; text: string; mark: string; at: string }>;
  reviews: Array<{ assignment: string; text: string; at: string }>;
};

const num = (x: number | null) => (x === null ? '—' : (Math.round(x * 1000) / 1000).toString());
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ClassTable({ cls }: { cls: ClassView }) {
  const t = useT(QUESTS);
  const anon = useAnonName();
  const teacher = cls.myRole === 'teacher';
  const staff = cls.myRole !== 'student';
  const base = `/api/classes/${encodeURIComponent(cls.id)}`;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Table | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const load = useCallback(() => {
    call(`${base}/table`).then(setData).catch((e) => setErr(e?.message || String(e)));
  }, [base]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };
  const skillCells = (r: Row) => (
    <>
      <td className="text-right">{r.entries}</td>
      <td className="text-right">{r.settled}</td>
      <td className="text-right">{num(r.brier)}</td>
      <td className="text-right">{num(r.probabilitySkill)}</td>
      <td className="text-right">{num(r.levelSkill)}</td>
    </>
  );
  const head = (first: string) => (
    <thead>
      <tr className="text-left text-slate-500">
        <th scope="col" className="font-normal">{first}</th>
        <th scope="col" className="font-normal text-right">{t('ctColEntries')}</th>
        <th scope="col" className="font-normal text-right">{t('ctColSettled')}</th>
        <th scope="col" className="font-normal text-right">{t('ctColBrier')}</th>
        <th scope="col" className="font-normal text-right">{t('ctColSkillP')}</th>
        <th scope="col" className="font-normal text-right">{t('ctColSkillL')}</th>
        {staff && <th scope="col"><span className="sr-only">{t('ctReport')}</span></th>}
      </tr>
    </thead>
  );

  return (
    <section className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-2 text-xs" aria-label={t('ctTitle')} data-class-table>
      <div className="flex flex-wrap gap-1 items-center">
        <button type="button" className="ui-btn ui-btn-ghost text-xs" aria-expanded={open} onClick={() => setOpen(!open)} data-class-table-toggle>
          {t('ctTitle')}
        </button>
        {cls.myRole === 'student' && (
          <button type="button" className="ui-btn ui-btn-ghost text-xs" aria-expanded={report === 'me'} onClick={() => setReport(report === 'me' ? null : 'me')} data-class-my-report>
            {t('ctMyReport')}
          </button>
        )}
      </div>
      {err && <p className="text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      {open && data && (
        <div className="space-y-2">
          <p className="text-slate-500">{t('ctExplain')}</p>
          {data.sensitiveLeftOut && <p className="text-slate-500">{t('ctSensitiveOut')}</p>}
          {teacher && (
            <label className="flex flex-wrap items-center gap-1 max-w-full">
              <span>{t('ctViewLabel')}</span>
              <select className={`${fieldCls} max-w-full`} value={data.tableView} onChange={(e) => void act(() => call(`${base}/table-settings`, 'POST', { tableView: e.target.value }))} data-class-table-view>
                <option value="own">{t('ctView_own')}</option>
                <option value="nicknames">{t('ctView_nicknames')}</option>
                <option value="numbers">{t('ctView_numbers')}</option>
              </select>
            </label>
          )}
          {!staff && <p className="text-slate-500">{t(`ctSeen_${data.tableView}` as Key)}</p>}
          {data.rows.length === 0 ? (
            <p className="text-slate-500">{t('ctNone')}</p>
          ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('ctTitle')}>
              <table className="w-full" data-class-table-rows>
                <caption className="sr-only">{t('ctTitle')}</caption>
                {head(t('classesColName'))}
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.accountId ?? r.name} className={`border-t border-slate-100 dark:border-slate-800 ${r.mine ? 'font-medium' : ''}`}>
                      <td>{anon(r.name)}</td>
                      {skillCells(r)}
                      {staff && (
                        <td>
                          <button type="button" className="underline" onClick={() => setReport(r.accountId ?? null)} data-class-report-open={r.accountId}>
                            {t('ctReport')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.teams.length > 0 && (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('ctTeams')}>
              <table className="w-full" data-class-team-rows>
                <caption className="text-left font-medium">{t('ctTeams')}</caption>
                {head(t('ctColTeam'))}
                <tbody>
                  {data.teams.map((r) => (
                    <tr key={r.id} className={`border-t border-slate-100 dark:border-slate-800 ${r.mine ? 'font-medium' : ''}`}>
                      <td>
                        {r.name}
                        <span className="block text-slate-500">{r.members.map(anon).join(', ')}</span>
                      </td>
                      {skillCells(r)}
                      {staff && <td />}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {teacher && <Teams cls={cls} teams={data.allTeams ?? []} act={act} base={base} />}
        </div>
      )}
      {report && <StudentReport base={base} who={report} onClose={() => setReport(null)} teacherView={staff} />}
    </section>
  );
}

function Teams({ cls, teams, act, base }: { cls: ClassView; teams: Array<{ id: string; name: string; members: string[] }>; act: (fn: () => Promise<unknown>) => Promise<void>; base: string }) {
  const t = useT(QUESTS);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const students = (cls.members ?? []).filter((m) => m.role === 'student');
  const taken = new Set(teams.flatMap((x) => x.members));
  const free = students.filter((s) => !taken.has(s.displayName));
  return (
    <div className="space-y-1 border border-slate-200 dark:border-slate-800 p-2" data-class-teams>
      <h5 className="font-medium">{t('ctTeams')}</h5>
      <p className="text-slate-500">{t('ctTeamsNote')}</p>
      {teams.length > 0 && (
        <ul className="space-y-1">
          {teams.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2">
              <span>
                {x.name}: {x.members.join(', ')}
              </span>
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => void act(() => call(`${base}/teams/${encodeURIComponent(x.id)}`, 'DELETE'))}>
                {t('asgRemove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => call(`${base}/teams`, 'POST', { name, usernames: picked }).then(() => (setName(''), setPicked([]))));
        }}
      >
        <label className="block space-y-1">
          <span className="block">{t('ctTeamName')}</span>
          <input className={`${fieldCls} w-48`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-class-team-name />
        </label>
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="sr-only">{t('ctTeamMembers')}</legend>
          {free.map((s) => (
            <label key={s.accountId} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={picked.includes(s.username)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, s.username] : picked.filter((u) => u !== s.username))}
                data-class-team-member={s.username}
              />
              <span>{s.displayName}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="ui-btn text-xs" disabled={!name.trim() || picked.length < 3 || picked.length > 5} data-class-team-save>
          {t('ctTeamMake')}
        </button>
      </form>
    </div>
  );
}

function answerText(a: Record<string, number>, positions?: string[]) {
  if (typeof a.probability === 'number') return pct(a.probability);
  if (typeof a.position === 'number') return positions?.[a.position - 1] ?? `#${a.position}`;
  if (typeof a.level === 'number') return String(a.level);
  if (typeof a.value === 'number') return String(a.value);
  return '';
}

function StudentReport({ base, who, onClose, teacherView }: { base: string; who: string; onClose: () => void; teacherView: boolean }) {
  const t = useT(QUESTS);
  const help = useHelpLevel();
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setR(null);
    call(`${base}/report/${encodeURIComponent(who)}`).then(setR).catch((e) => setErr(e?.message || String(e)));
  }, [base, who]);
  if (err) return <p className="text-rose-700 dark:text-rose-400" role="alert">{err}</p>;
  if (!r) return null;
  const s = r.summary;
  const explain = (key: Key) => (help >= 1 ? <p className="text-slate-500">{t(key)}</p> : null);
  const scoreText = (sc: EntryScore) => {
    if (sc.status === 'settled' && sc.answer === 'probability')
      return `${t(sc.happened ? 'rpHappened' : 'rpNotHappened')} ${t('scoreBrier', { v: num(sc.brier) })}${sc.baseRate === null ? ` ${t('practiceNoBase')}` : t('practiceBase', { rate: pct(sc.baseRate), base: num(sc.baseBrier), skill: num(sc.skill) })}`;
    if (sc.status === 'settled') return t('rpLevelScore', { error: num(sc.error), noChange: num(sc.noChangeError) }) + (sc.skill === null ? '' : ` ${t('skillIs', { v: num(sc.skill) })}`);
    if (sc.status === 'replicated') return t(sc.matched ? 'ctMatched' : 'ctNotMatched');
    return translateText(sc.note, readLang());
  };
  return (
    <article className="border border-slate-300 dark:border-slate-700 p-3 space-y-3 bg-white dark:bg-slate-900 print:border-0" data-class-report>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">{t('ctReportTitle', { name: r.student })}</h4>
          <p className="text-slate-500">
            {r.className} · {r.term} · {new Date(r.madeAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-1 print:hidden">
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => window.print()} data-class-report-print>
            {t('ctPrint')}
          </button>
          <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={onClose}>
            {t('ctClose')}
          </button>
        </div>
      </header>
      {teacherView && <p className="border-l-2 border-amber-400 pl-2">{t('ctLuckWarning')}</p>}
      <section className="space-y-1" data-class-report-summary>
        <h5 className="font-medium">{t('ctSummary')}</h5>
        <p>{t('ctSummaryLine', { entries: s.entries, settled: s.settled })}</p>
        <p>{t('ctBrierLine', { v: num(s.brier) })}</p>
        {explain('ctBrierHelp')}
        <p>{t('ctSkillLine', { p: num(s.probabilitySkill), l: num(s.levelSkill), beat: s.beat, of: s.compared })}</p>
        {explain('ctSkillHelp')}
      </section>
      <section className="space-y-1" data-class-report-calibration>
        <h5 className="font-medium">{t('ctCalibration')}</h5>
        {explain('ctCalibrationHelp')}
        {'needs' in s.calibration ? (
          <p className="text-slate-500">{t('ctCalibrationNeeds', { have: s.calibration.have, needs: s.calibration.needs })}</p>
        ) : (
          <>
            <CalibrationChart bins={s.calibration.bins} />
            <ul className="list-disc pl-4" data-class-coach>
              {s.calibration.coach.map((c, i) => (
                <li key={i}>{coachText(t, c)}</li>
              ))}
            </ul>
            {help >= 2 && <p className="text-slate-500">{t('ctCoachMore')}</p>}
          </>
        )}
      </section>
      <section className="space-y-1">
        <h5 className="font-medium">{t('ctEntries')}</h5>
        {r.entries.length === 0 ? (
          <p className="text-slate-500">{t('ctNoEntries')}</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('ctEntries')}>
            <table className="w-full" data-class-report-entries>
              <caption className="sr-only">{t('ctEntries')}</caption>
              <thead>
                <tr className="text-left text-slate-500">
                  <th scope="col" className="font-normal">{t('asgQuest')}</th>
                  <th scope="col" className="font-normal">{t('asgColAnswer')}</th>
                  <th scope="col" className="font-normal">{t('ctColResult')}</th>
                </tr>
              </thead>
              <tbody>
                {r.entries.map((e) => (
                  <tr key={`${e.title}-${e.at}`} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td>{e.title}</td>
                    <td>{answerText(e.answer, e.positions)}</td>
                    <td>{scoreText(e.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="space-y-1" data-class-report-feedback>
        <h5 className="font-medium">{t('ctFeedback')}</h5>
        {r.feedback.length === 0 && r.reviews.length === 0 ? (
          <p className="text-slate-500">{t('fbNone')}</p>
        ) : (
          <ul className="space-y-1">
            {r.feedback.map((f) => (
              <li key={`${f.assignment}-${f.by}-${f.at}`} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                <div className="text-slate-500">
                  {f.assignment} · {f.by}
                  {f.mark ? ` · ${t('fbMarkShown', { mark: f.mark })}` : ''}
                </div>
                <p className="whitespace-pre-wrap">{f.text}</p>
              </li>
            ))}
            {r.reviews.map((v) => (
              <li key={`${v.assignment}-${v.at}`} className="border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                <div className="text-slate-500">
                  {v.assignment} · {t('ctPeerReview')}
                </div>
                <p className="whitespace-pre-wrap">{v.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function coachText(t: (key: Key, vars?: Record<string, string | number>) => string, c: CoachLine) {
  if (c.kind === 'wellCalibrated') return t('ctCoachWell', { n: c.n });
  return t(c.kind === 'tooSure' ? 'ctCoachTooSure' : 'ctCoachNotSure', { said: pct(c.said), happened: pct(c.happened), n: c.n });
}

/** Said (across) against happened (up); a dot on the diagonal is a forecast that came true as often as it said. */
function CalibrationChart({ bins }: { bins: CalibrationBin[] }) {
  const t = useT(QUESTS);
  const W = 220;
  const pad = 28;
  const x = (v: number) => pad + v * (W - pad - 8);
  const y = (v: number) => W - pad - v * (W - pad - 8);
  const max = Math.max(...bins.map((b) => b.n), 1);
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} role="img" aria-label={t('ctChartLabel')} className="text-slate-700 dark:text-slate-200">
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 3" />
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} stroke="currentColor" strokeOpacity="0.5" />
        <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} stroke="currentColor" strokeOpacity="0.5" />
        {[0, 0.5, 1].map((v) => (
          <g key={v} fontSize="9" fill="currentColor">
            <text x={x(v)} y={y(0) + 12} textAnchor="middle">
              {pct(v)}
            </text>
            <text x={x(0) - 4} y={y(v) + 3} textAnchor="end">
              {pct(v)}
            </text>
          </g>
        ))}
        {bins.map((b) => (
          <circle key={b.from} cx={x(b.said)} cy={y(b.happened)} r={3 + 5 * Math.sqrt(b.n / max)} fill="#2563eb" fillOpacity="0.75" />
        ))}
      </svg>
      <figcaption className="text-slate-500">{t('ctChartCaption')}</figcaption>
      <table className="sr-only">
        <caption>{t('ctChartLabel')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ctColSaid')}</th>
            <th scope="col">{t('ctColHappened')}</th>
            <th scope="col">{t('ctColEntries')}</th>
          </tr>
        </thead>
        <tbody>
          {bins.map((b) => (
            <tr key={b.from}>
              <td>{pct(b.said)}</td>
              <td>{pct(b.happened)}</td>
              <td>{b.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
