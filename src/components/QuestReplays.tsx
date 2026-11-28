/**
 * Replays tab on Menu > Quests (classroom step Q5): packs of questions about the past, week by week,
 * for the first weeks of a term. Each try picks a past start date, the answer is scored at once
 * against what happened, and the result is saved on this computer (data/local/quest-replays.jsonl)
 * under the signed-in account. Server: src/server/routes/quests.ts; scoring: src/utils/questReplays.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { readLang, translateText } from '../i18n/lang';
import { useLang, useT, useTx } from '../i18n/useLang';
import { packText } from '../utils/questPacks';
import type { ReplayItem, ReplayPack, ReplayQuestion, ReplayResult } from '../utils/questReplays';
import type { LevelScore, Point, ProbabilityScore } from '../utils/questScoring';

type Key = keyof typeof QUESTS.en;
type Reply = { enabled: true; packs: ReplayPack[]; results: ReplayResult[]; summary: { n: number; meanSkill: number | null; beatBase: number } };
type Asked = { item: ReplayItem; token: string; question: ReplayQuestion; unit: string; label: string; country: string };
type Scored = { end: Point; score: ProbabilityScore | LevelScore };

const field = 'px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
const num = (x: number) => (Math.round(x * 10000) / 10000).toString();

async function call(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error ? translateText(j.error, readLang()) : `HTTP ${r.status}`);
  return j;
}

export function QuestReplays() {
  const t = useT(QUESTS);
  const tx = useTx();
  const lang = useLang();
  const [data, setData] = useState<Reply | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [packId, setPackId] = useState('');
  const [asked, setAsked] = useState<Asked | null>(null);
  const [answer, setAnswer] = useState('');
  const [scored, setScored] = useState<Scored | null>(null);
  const load = useCallback(() => {
    call('/api/quests/replays')
      .then((j: Reply) => {
        setData(j);
        setPackId((cur) => cur || j.packs[0]?.id || '');
      })
      .catch((e) => setErr(e?.message || String(e)));
  }, []);
  useEffect(load, [load]);
  const pack = data?.packs.find((p) => p.id === packId);

  const ask = async (item: ReplayItem) => {
    setErr(null);
    setScored(null);
    setAnswer('');
    try {
      const j = await call(`/api/quests/replays/${encodeURIComponent(packId)}/${encodeURIComponent(item.id)}/new`);
      setAsked({ item, token: j.token, question: j.question, unit: j.unit, label: j.label, country: j.ref.country });
    } catch (e: any) {
      setAsked(null);
      setErr(e?.message || String(e));
    }
  };
  const submit = async () => {
    if (!asked) return;
    setErr(null);
    const n = Number(answer);
    const body = asked.question.kind === 'level' ? { answer: { level: n } } : { answer: { probability: n / 100 } };
    try {
      const j = await call(`/api/quests/replays/answer/${asked.token}`, 'POST', body);
      setScored({ end: j.end, score: j.score });
      load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const questionText = (a: Asked) => {
    const q = a.question;
    const name = a.country === 'WLD' ? tx(a.label) : `${tx(a.label)} (${a.country})`;
    const unit = tx(a.unit);
    const start = t('rpStart', { date: q.start.date, name, value: num(q.start.value), unit });
    const end = q.endDate;
    const ask =
      q.kind === 'direction'
        ? t(q.op === 'lower' ? 'rpQ_lower' : 'rpQ_higher', { end })
        : q.kind === 'threshold'
          ? t(q.op === 'below' ? 'rpQ_below' : 'rpQ_above', { end, value: num(q.threshold ?? 0), unit })
          : q.kind === 'between'
            ? t('rpQ_between', { end, low: num(q.low ?? 0), high: num(q.high ?? 0), unit })
            : t('rpQ_level', { end, unit });
    return `${start} ${ask}`;
  };
  const scoreText = (s: Scored, unit: string) => {
    const e = t('rpEnd', { date: s.end.date, value: num(s.end.value), unit: tx(unit) });
    if (s.score.answer === 'level') {
      const l = s.score;
      return `${e} ${t('rpLevelScore', { error: num(l.error), noChange: l.noChangeError === null ? '—' : num(l.noChangeError) })}${l.skill === null ? '' : ` ${t('skillIs', { v: num(l.skill) })}`}`;
    }
    const p = s.score;
    return `${e} ${t(p.happened ? 'rpHappened' : 'rpNotHappened')} ${t('scoreBrier', { v: num(p.brier) })}${p.baseRate === null ? ` ${t('practiceNoBase')}` : t('practiceBase', { rate: `${Math.round(p.baseRate * 100)}%`, base: num(p.baseBrier ?? 0), skill: num(p.skill ?? 0) })}`;
  };

  if (!data) return err ? <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">{err}</p> : null;
  return (
    <section className="space-y-3" data-quest-replays>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('rpIntro')}</p>
      {data.packs.length === 0 && <p className="text-sm text-slate-500">{t('rpNone')}</p>}
      {data.packs.length > 0 && (
        <label className="text-xs inline-flex items-center gap-1">
          <span>{t('filterPack')}</span>
          <select className={field} value={packId} onChange={(e) => setPackId(e.target.value)} data-quest-replay-pack>
            {data.packs.map((p) => (
              <option key={p.id} value={p.id}>
                {packText(p.title, lang)} ({t(`level_${p.level}` as Key)})
              </option>
            ))}
          </select>
        </label>
      )}
      {pack && <p className="text-sm">{packText(pack.summary, lang)}</p>}
      {pack?.weeks.map((w) => (
        <div key={w.week} className="space-y-1" data-quest-replay-week={w.week}>
          <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('rpWeek', { n: w.week, title: packText(w.title, lang) })}</h3>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">
            {w.items.map((it) => (
              <li key={it.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">
                  {packText(it.title, lang)} <span className="text-xs text-slate-500">· {t(`level_${it.level}` as Key)}</span>
                </span>
                <button type="button" className="ui-btn text-xs" onClick={() => ask(it)} data-quest-replay-try={it.id}>
                  {t('rpTry')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {err && <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      {asked && (
        <form
          className="space-y-2 border border-slate-200 dark:border-slate-800 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-quest-replay-question
        >
          <p className="text-sm">{questionText(asked)}</p>
          {!scored && (
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs space-y-1">
                <span className="block">{asked.question.kind === 'level' ? t('yourForecast') : t('probYes')}</span>
                <input type="number" step="any" min={asked.question.kind === 'level' ? undefined : 0} max={asked.question.kind === 'level' ? undefined : 100} className={`${field} w-28`} value={answer} onChange={(e) => setAnswer(e.target.value)} data-quest-replay-answer />
              </label>
              <button type="submit" className="ui-btn text-xs" disabled={answer.trim() === ''} data-quest-replay-submit>
                {t('rpScore')}
              </button>
            </div>
          )}
          {scored && (
            <>
              <p className="text-sm" role="status" data-quest-replay-result>
                {scoreText(scored, asked.unit)}
              </p>
              <button type="button" className="ui-btn text-xs" onClick={() => ask(asked.item)}>
                {t('rpAgain')}
              </button>
            </>
          )}
        </form>
      )}
      <div className="space-y-1" data-quest-replay-mine>
        <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('rpMine')}</h3>
        {data.summary.n === 0 ? (
          <p className="text-xs text-slate-500">{t('rpMineNone')}</p>
        ) : (
          <p className="text-xs text-slate-500">{t('rpMineSummary', { n: data.summary.n, beat: data.summary.beatBase, skill: data.summary.meanSkill === null ? '—' : num(data.summary.meanSkill) })}</p>
        )}
      </div>
    </section>
  );
}
