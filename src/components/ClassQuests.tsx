/**
 * Class Quests inside a class card (roadmap Phase 5, Q4): the teacher writes a Forecast or Debate
 * Quest for this class from the fixed rule types, with a level; teacher and markers see the list.
 * Students see a class Quest when it is set for the class (ClassAssignments). The app settles a
 * forecast from a public feed, so the form never asks for a figure that is not part of the question.
 * Server: src/server/routes/classes.ts; checks: src/utils/classQuests.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { QUESTS } from '../i18n/messages/quests';
import { useT, useTx } from '../i18n/useLang';
import type { ClassView } from '../utils/classes';
import { QUEST_LEVELS, QUEST_REGIONS, QUEST_TOPICS, type QuestLevel } from '../utils/quests';
import { QUEST_SERIES, questSeriesDef } from '../utils/questSeries';
import type { QuestRule } from '../utils/questRules';
import { call, fieldCls, useRuleText } from './ClassAssignments';

type Item = { id: string; type: 'forecast' | 'debate'; title: string; summary: string; level: QuestLevel | null; opensOn: string; closesOn: string; rule?: QuestRule; positions?: string[]; author: string; used: boolean };
type Key = keyof typeof QUESTS.en;

const REGION_KEY: Record<(typeof QUEST_REGIONS)[number], Key> = { Americas: 'cqRegionAmericas', EMEA: 'cqRegionEmea', 'Asia-Pacific': 'cqRegionAsia', Global: 'cqRegionGlobal' };

export function ClassQuests({ cls }: { cls: ClassView }) {
  const t = useT(QUESTS);
  const ruleText = useRuleText();
  const [list, setList] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const teacher = cls.myRole === 'teacher';
  const base = `/api/classes/${encodeURIComponent(cls.id)}/class-quests`;
  const load = useCallback(() => {
    if (cls.myRole === 'student') return;
    call(base).then((j) => setList(j.quests)).catch((e) => setErr(e?.message || String(e)));
  }, [base, cls.myRole]);
  useEffect(load, [load]);
  if (cls.myRole === 'student') return null;
  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <section className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-2" aria-label={t('cqTitle')} data-class-quests>
      <h4 className="text-xs font-medium">{t('cqTitle')}</h4>
      <p className="text-xs text-slate-500">{t('cqIntro')}</p>
      {err && <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">{err}</p>}
      {list && list.length === 0 && <p className="text-xs text-slate-500">{t('cqNone')}</p>}
      <ul className="space-y-1">
        {(list ?? []).map((q) => (
          <li key={q.id} className="border border-slate-200 dark:border-slate-800 p-2 text-xs space-y-1" data-class-quest={q.id}>
            <div className="text-sm text-slate-900 dark:text-white">{q.title}</div>
            <div className="text-slate-500">
              {[t(`type_${q.type}` as Key), q.level ? t(`level_${q.level}` as Key) : '', t('cqDates', { opens: q.opensOn, closes: q.closesOn })].filter(Boolean).join(' · ')}
            </div>
            <p className="whitespace-pre-wrap">{q.summary}</p>
            {q.rule && <p className="text-slate-600 dark:text-slate-300">{t('cqSettledBy', { rule: ruleText(q.rule) })}</p>}
            {q.positions && <p className="text-slate-600 dark:text-slate-300">{t('cqPositionsShown', { list: q.positions.join(' / ') })}</p>}
            {teacher && !q.used && (
              <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => act(() => call(`${base}/${encodeURIComponent(q.id)}`, 'DELETE'))} data-class-quest-remove>
                {t('cqRemove')}
              </button>
            )}
            {q.used && <p className="text-slate-500">{t('cqUsed')}</p>}
          </li>
        ))}
      </ul>
      {teacher && !cls.archived && !open && (
        <button type="button" className="ui-btn text-xs" onClick={() => setOpen(true)} data-class-quest-new>
          {t('cqNew')}
        </button>
      )}
      {teacher && !cls.archived && open && (
        <ClassQuestForm
          onCancel={() => setOpen(false)}
          onSave={(body) =>
            act(async () => {
              await call(base, 'POST', body);
              setOpen(false);
            })
          }
        />
      )}
    </section>
  );
}

function ClassQuestForm({ onSave, onCancel }: { onSave: (body: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const t = useT(QUESTS);
  const tx = useTx();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    type: 'forecast' as 'forecast' | 'debate',
    title: '',
    summary: '',
    level: 'intro' as QuestLevel,
    topic: 'inflation',
    region: 'Global',
    country: '',
    opensOn: today,
    closesOn: '',
    series: 'policy_rate',
    kind: 'direction',
    op: 'higher',
    value: '',
    on: '',
    period: '',
    positions: '',
    settlesOn: '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const def = questSeriesDef(f.series);
  const annual = def?.freq === 'annual';
  const lbl = 'text-xs space-y-1';
  return (
    <form
      className="space-y-2 border border-slate-200 dark:border-slate-800 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...f, value: f.value === '' ? undefined : Number(f.value), positions: f.positions.split('\n') });
      }}
      data-class-quest-form
    >
      <div className="flex flex-wrap gap-2 items-end">
        <label className={lbl}>
          <span className="block">{t('cqType')}</span>
          <select className={fieldCls} value={f.type} onChange={set('type')} data-class-quest-type>
            <option value="forecast">{t('type_forecast')}</option>
            <option value="debate">{t('type_debate')}</option>
          </select>
        </label>
        <label className={lbl}>
          <span className="block">{t('filterLevel')}</span>
          <select className={fieldCls} value={f.level} onChange={set('level')} data-class-quest-level>
            {QUEST_LEVELS.map((k) => (
              <option key={k} value={k}>
                {t(`level_${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          <span className="block">{t('cqTopic')}</span>
          <select className={fieldCls} value={f.topic} onChange={set('topic')} data-class-quest-topic>
            {QUEST_TOPICS.map((k) => (
              <option key={k} value={k}>
                {t(`cqTopic_${k}` as Key)}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          <span className="block">{t('cqRegion')}</span>
          <select className={fieldCls} value={f.region} onChange={set('region')} data-class-quest-region>
            {QUEST_REGIONS.map((k) => (
              <option key={k} value={k}>
                {t(REGION_KEY[k])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={`${lbl} block`}>
        <span className="block">{t('cqQuestion')}</span>
        <input className={`${fieldCls} w-full`} value={f.title} maxLength={160} onChange={set('title')} data-class-quest-title />
      </label>
      <label className={`${lbl} block`}>
        <span className="block">{t('cqSummary')}</span>
        <textarea className={`${fieldCls} w-full h-16`} value={f.summary} maxLength={1200} onChange={set('summary')} data-class-quest-summary />
      </label>
      <div className="flex flex-wrap gap-2 items-end">
        <label className={lbl}>
          <span className="block">{t('cqOpens')}</span>
          <input type="date" className={fieldCls} value={f.opensOn} min={today} onChange={set('opensOn')} data-class-quest-opens />
        </label>
        <label className={lbl}>
          <span className="block">{t('cqCloses')}</span>
          <input type="date" className={fieldCls} value={f.closesOn} min={f.opensOn} onChange={set('closesOn')} data-class-quest-closes />
        </label>
        {!(f.type === 'forecast' && def?.world) && (
          <label className={lbl}>
            <span className="block">{t('cqCountry')}</span>
            <input className={`${fieldCls} w-24 uppercase`} value={f.country} maxLength={3} placeholder="BRA" onChange={set('country')} data-class-quest-country />
          </label>
        )}
      </div>
      {f.type === 'forecast' ? (
        <div className="flex flex-wrap gap-2 items-end">
          <label className={lbl}>
            <span className="block">{t('cqSeries')}</span>
            <select className={fieldCls} value={f.series} onChange={set('series')} data-class-quest-series>
              {QUEST_SERIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {tx(s.label)} ({tx(s.unit)})
                </option>
              ))}
            </select>
          </label>
          <label className={lbl}>
            <span className="block">{t('cqKind')}</span>
            <select
              className={fieldCls}
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value, op: e.target.value === 'threshold' ? 'above' : 'higher' })}
              data-class-quest-kind
            >
              <option value="direction">{t(annual ? 'cqKind_directionAnnual' : 'cqKind_direction')}</option>
              <option value="threshold">{t('cqKind_threshold')}</option>
              <option value="level">{t('cqKind_level')}</option>
            </select>
          </label>
          {f.kind === 'direction' && (
            <select className={fieldCls} value={f.op} onChange={set('op')} aria-label={t('cqKind')} data-class-quest-op>
              <option value="higher">{t('cqOp_higher')}</option>
              <option value="lower">{t('cqOp_lower')}</option>
            </select>
          )}
          {f.kind === 'threshold' && (
            <>
              <select className={fieldCls} value={f.op} onChange={set('op')} aria-label={t('cqKind')} data-class-quest-op>
                <option value="above">{t('cqOp_above')}</option>
                <option value="below">{t('cqOp_below')}</option>
              </select>
              <label className={lbl}>
                <span className="block">{t('cqValue', { unit: tx(def?.unit ?? '') })}</span>
                <input type="number" step="any" className={`${fieldCls} w-24`} value={f.value} onChange={set('value')} data-class-quest-value />
              </label>
            </>
          )}
          <label className={lbl}>
            <span className="block">{t('cqReadOn')}</span>
            <input type="date" className={fieldCls} value={f.on} min={f.closesOn} onChange={set('on')} data-class-quest-on />
          </label>
          {annual && (
            <label className={lbl}>
              <span className="block">{t('cqPeriod')}</span>
              <input className={`${fieldCls} w-20`} value={f.period} maxLength={4} placeholder="2026" onChange={set('period')} data-class-quest-period />
            </label>
          )}
          {def && <p className="text-xs text-slate-500 w-full">{tx(def.about)}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-end">
          <label className={`${lbl} flex-1 min-w-[12rem]`}>
            <span className="block">{t('cqPositions')}</span>
            <textarea className={`${fieldCls} w-full h-16`} value={f.positions} onChange={set('positions')} data-class-quest-positions />
          </label>
          <label className={lbl}>
            <span className="block">{t('cqSettles')}</span>
            <input type="date" className={fieldCls} value={f.settlesOn} min={f.closesOn} onChange={set('settlesOn')} data-class-quest-settles />
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="ui-btn text-xs" disabled={!f.title.trim() || !f.closesOn} data-class-quest-save>
          {t('cqSave')}
        </button>
        <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={onCancel}>
          {t('asgCancel')}
        </button>
      </div>
    </form>
  );
}
