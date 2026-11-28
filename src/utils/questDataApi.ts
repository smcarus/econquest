/**
 * Settled Quest forecasts for scripts (roadmap L3a): one row per counted public entry on an approved
 * Forecast Quest that has a recorded result in quests/resolutions.jsonl. Scores come from the record,
 * never from today's feeds, so a script gets the same numbers as the Quests screen and the
 * scoreboard. Private entries (data/local/quest-entries.jsonl) and practice answers never appear.
 *
 * Served by GET /api/quests/settled (JSON) and GET /api/export/quests/forecasts.csv (also .xlsx),
 * only while Quests are switched on (QUESTS_ENABLED=on).
 */
import type { ForecastQuest, Quest } from './quests';
import { questSettlesOn } from './quests';
import { describeRule } from './questRules';
import { resultState, type ResolutionLine } from './questResolve';
import { countedPublicEntries, type PublicEntry } from './questPublicEntries';
import { scoreLevel, scoreProbability } from './questScoring';

export const QUEST_FORECAST_HEADER = [
  'quest_id', 'quest_version', 'title', 'countries', 'series_id', 'rule', 'answer_type', 'closes_on', 'settles_on',
  'result', 'settled_via', 'readings', 'happened', 'outcome_value', 'benchmark', 'benchmark_kind',
  'login', 'entry_n', 'entered_via', 'forecast', 'score_kind', 'score', 'benchmark_score', 'skill',
];

export type QuestForecastCell = string | number | null;

/** Rows in QUEST_FORECAST_HEADER order, sorted by settle date, Quest and login. */
export function questForecastRows(quests: Array<{ quest: Quest; approved: boolean }>, entries: PublicEntry[], lines: ResolutionLine[]): QuestForecastCell[][] {
  const rows: QuestForecastCell[][] = [];
  const forecasts = quests.filter((x) => x.approved && x.quest.type === 'forecast').map((x) => x.quest as ForecastQuest);
  forecasts.sort((a, b) => questSettlesOn(a).localeCompare(questSettlesOn(b)) || a.id.localeCompare(b.id));
  for (const q of forecasts) {
    const st = resultState(lines, q.id, q.version);
    if (st.state === 'none') continue;
    const answerType = q.rule.kind === 'level' ? 'level' : 'probability';
    const line = st.line;
    const o = st.state === 'settled' ? line.outcome : undefined;
    const prob = o?.answer === 'probability' ? o : undefined;
    const lvl = o?.answer === 'level' ? o : undefined;
    const benchmark = prob ? prob.baseRate : lvl ? lvl.noChange : null;
    const readings = st.state === 'settled' ? (line.readings || []).map((r) => `${r.value} on ${r.date}`).join('; ') : '';
    const base: QuestForecastCell[] = [
      q.id, q.version, q.title, q.countries.join(';'), q.rule.ref.series, describeRule(q.rule), answerType, q.closesOn, questSettlesOn(q),
      st.state, st.state === 'settled' ? line.via || 'rule' : '', readings,
      prob ? (prob.happened ? 1 : 0) : null, lvl ? lvl.value : null, benchmark ?? null,
      benchmark === null || benchmark === undefined ? '' : prob ? 'base_rate' : 'no_change',
    ];
    for (const e of countedPublicEntries(entries, q.id, q.version)) {
      const a = e.answer as { probability?: number; level?: number };
      const forecast = answerType === 'level' ? a.level : a.probability;
      if (typeof forecast !== 'number') continue;
      let score: QuestForecastCell[] = [answerType === 'level' ? 'abs_error' : 'brier', null, null, null];
      if (prob) {
        const s = scoreProbability(forecast, prob.happened, prob.baseRate);
        score = ['brier', s.brier, s.baseBrier, s.skill];
      } else if (lvl) {
        const s = scoreLevel(forecast, lvl.value, lvl.noChange);
        score = ['abs_error', s.error, s.noChangeError, s.skill];
      }
      rows.push([...base, e.login, e.n, e.via, forecast, ...score]);
    }
  }
  return rows;
}
