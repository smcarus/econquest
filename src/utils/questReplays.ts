/**
 * Replay Quests and term packs (classroom step Q5). A replay is a Quest asked about the past: the app
 * picks a past start date on a daily or weekly series, shows the value on that day, and asks what
 * happened next, by any of the four rule types:
 *   direction  higher or lower after `days`
 *   threshold  above or below the start value plus `delta` (in the series' own unit)
 *   between    inside the start value plus or minus `band`
 *   level      the value itself, scored against "no change"
 * The answer is scored at once from the history, and the base rate uses only windows that ended
 * before the start, so it is the base rate someone could have known on that day.
 *
 * Replay packs (quests/replays/<id>.json) give a class something to score in the first weeks of a
 * term, before live Quests settle: weeks of replay items, each with a level. A replay item holds
 * question parameters only (a horizon, a step), never a figure from the series.
 *
 * Browser-safe, pure.
 */
import { QUEST_LEVELS, type QuestLevel } from './quests';
import { questSeriesDef, seriesProblem } from './questSeries';
import { QUEST_TRANSLATION_LANGS } from './questTranslations';
import { addDaysIso, daysBetween, directionBaseRate, firstOnOrAfter, scoreLevel, scoreProbability, type LevelScore, type Point, type ProbabilityScore } from './questScoring';
import type { PackText } from './questPacks';

export const REPLAY_KINDS = ['direction', 'threshold', 'between', 'level'] as const;
export type ReplayKind = (typeof REPLAY_KINDS)[number];

export interface ReplayItem {
  id: string;
  title: PackText;
  country: string;
  series: string;
  kind: ReplayKind;
  /** direction: higher | lower; threshold: above | below. */
  op?: 'higher' | 'lower' | 'above' | 'below';
  /** threshold: the step from the start value, in the series' unit. */
  delta?: number;
  /** between: half-width of the range around the start value, in the series' unit. */
  band?: number;
  /** When true, delta and band are a percentage of the start value (for prices and exchange rates). */
  relative?: boolean;
  /** Days from the start to the value that settles it (7 to 366). */
  days: number;
  level: QuestLevel;
}

export interface ReplayWeek {
  week: number;
  title: PackText;
  items: ReplayItem[];
}

export interface ReplayPack {
  id: string;
  title: PackText;
  summary: PackText;
  level: QuestLevel;
  weeks: ReplayWeek[];
}

const ID = /^[a-z0-9][a-z0-9-]{1,50}$/;
const TEXT_MAX = 400;

function textProblems(v: unknown, where: string): string[] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [`${where}: { "en": ..., "es": ..., "fr": ..., "pt": ... }`];
  const o = v as Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(o)) {
    if (k !== 'en' && !(QUEST_TRANSLATION_LANGS as readonly string[]).includes(k)) out.push(`${where}.${k}: not a language the app speaks`);
    else if (typeof o[k] !== 'string' || !(o[k] as string).trim() || (o[k] as string).length > TEXT_MAX) out.push(`${where}.${k}: text up to ${TEXT_MAX} characters`);
  }
  if (!('en' in o)) out.push(`${where}.en: English is required`);
  for (const l of QUEST_TRANSLATION_LANGS) if (!(l in o)) out.push(`${where}.${l}: missing (every replay text is in each language the app speaks)`);
  return out;
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Problems in one replay item; empty when it can be asked. */
export function replayItemProblems(raw: unknown, where = 'item'): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [`${where}: an object`];
  const it = raw as Partial<ReplayItem> & Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(it)) if (!['id', 'title', 'country', 'series', 'kind', 'op', 'delta', 'band', 'relative', 'days', 'level'].includes(k)) out.push(`${where}.${k}: not a replay field`);
  if (typeof it.id !== 'string' || !ID.test(it.id)) out.push(`${where}.id: lower-case letters, digits and -`);
  out.push(...textProblems(it.title, `${where}.title`));
  const def = typeof it.series === 'string' ? questSeriesDef(it.series) : undefined;
  if (!def) out.push(`${where}.series: one of the series a Quest may read`);
  else if (def.freq === 'annual') out.push(`${where}.series: a replay needs a daily or weekly series`);
  else {
    const p = seriesProblem(String(it.country), def.id);
    if (p) out.push(`${where}.country: ${p}`);
  }
  if (!REPLAY_KINDS.includes(it.kind as ReplayKind)) out.push(`${where}.kind: one of ${REPLAY_KINDS.join(', ')}`);
  if (it.kind === 'direction' && it.op !== 'higher' && it.op !== 'lower') out.push(`${where}.op: higher or lower`);
  if (it.kind === 'threshold' && it.op !== 'above' && it.op !== 'below') out.push(`${where}.op: above or below`);
  if ((it.kind === 'between' || it.kind === 'level') && it.op !== undefined) out.push(`${where}.op: only direction and threshold take one`);
  if (it.kind === 'threshold' ? !finite(it.delta) || it.delta === 0 : it.delta !== undefined) out.push(`${where}.delta: ${it.kind === 'threshold' ? 'a step other than zero, in the series unit' : 'only a threshold takes one'}`);
  if (it.kind === 'between' ? !finite(it.band) || it.band <= 0 : it.band !== undefined) out.push(`${where}.band: ${it.kind === 'between' ? 'a half-width above zero, in the series unit' : 'only a range takes one'}`);
  if (it.relative !== undefined && (typeof it.relative !== 'boolean' || (it.kind !== 'threshold' && it.kind !== 'between'))) out.push(`${where}.relative: true or false, for a threshold or a range only`);
  if (!Number.isInteger(it.days) || (it.days as number) < 7 || (it.days as number) > 366) out.push(`${where}.days: a whole number from 7 to 366`);
  if (!QUEST_LEVELS.includes(it.level as QuestLevel)) out.push(`${where}.level: one of ${QUEST_LEVELS.join(', ')}`);
  return out;
}

/** Problems in a replay pack file. */
export function replayPackProblems(raw: unknown, fileName: string): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['a replay pack is a JSON object'];
  const p = raw as Partial<ReplayPack> & Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(p)) if (!['id', 'title', 'summary', 'level', 'weeks'].includes(k)) out.push(`${k}: not a replay pack field`);
  if (typeof p.id !== 'string' || !ID.test(p.id)) out.push('id: lower-case letters, digits and -');
  else if (fileName !== `${p.id}.json`) out.push(`file name must be ${p.id}.json`);
  out.push(...textProblems(p.title, 'title'), ...textProblems(p.summary, 'summary'));
  if (!QUEST_LEVELS.includes(p.level as QuestLevel)) out.push(`level: one of ${QUEST_LEVELS.join(', ')}`);
  if (!Array.isArray(p.weeks) || !p.weeks.length) return [...out, 'weeks: one or more weeks'];
  const ids = new Set<string>();
  p.weeks.forEach((w, i) => {
    const at = `weeks[${i}]`;
    if (!w || typeof w !== 'object') return void out.push(`${at}: { "week", "title", "items" }`);
    if (w.week !== i + 1) out.push(`${at}.week: ${i + 1} (weeks run in order from 1)`);
    out.push(...textProblems(w.title, `${at}.title`));
    if (!Array.isArray(w.items) || !w.items.length) return void out.push(`${at}.items: one or more replay items`);
    w.items.forEach((it, j) => {
      out.push(...replayItemProblems(it, `${at}.items[${j}]`));
      const id = (it as ReplayItem | null)?.id;
      if (typeof id === 'string') {
        if (ids.has(id)) out.push(`${at}.items[${j}].id: "${id}" is in the pack twice`);
        ids.add(id);
      }
    });
  });
  return out;
}

export interface ReplayQuestion {
  start: Point;
  endDate: string;
  kind: ReplayKind;
  op?: ReplayItem['op'];
  /** threshold: the number to beat (start + delta). */
  threshold?: number;
  /** between: the range. */
  low?: number;
  high?: number;
  /** Threshold and range were set as a share of the start value; base-rate windows use the same share. */
  relative?: boolean;
  days: number;
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

function avgGapDays(points: Point[]): number {
  if (points.length < 2) return 1;
  return daysBetween(points[0].date, points[points.length - 1].date) / (points.length - 1);
}

/** A past start for a replay item, leaving room for 30 windows of history before it. */
export function replayQuestion(item: ReplayItem, points: Point[], today: string, pick: () => number): ReplayQuestion | { reason: string } {
  if (questSeriesDef(item.series)?.freq === 'annual') return { reason: 'A replay needs a daily or weekly series' };
  const lastStart = addDaysIso(today, -(item.days + 1));
  const starts = points.filter((p) => p.date <= lastStart);
  const skip = Math.ceil((30 * 7 + item.days) / Math.max(1, avgGapDays(points)));
  const usable = starts.slice(Math.min(starts.length, skip));
  if (!usable.length) return { reason: 'Not enough history for this replay yet' };
  const start = usable[Math.min(usable.length - 1, Math.floor(pick() * usable.length))];
  const q: ReplayQuestion = { start, endDate: addDaysIso(start.date, item.days), kind: item.kind, days: item.days, ...(item.op ? { op: item.op } : {}) };
  const step = (x: number | undefined) => (item.relative ? (start.value * (x ?? 0)) / 100 : (x ?? 0));
  if (item.kind === 'threshold') q.threshold = r6(start.value + step(item.delta));
  if (item.kind === 'between') {
    q.low = r6(start.value - step(item.band));
    q.high = r6(start.value + step(item.band));
  }
  if (item.relative) q.relative = true;
  return q;
}

/** Whether a replay question's event happened, from a start and end value. */
function happened(q: ReplayQuestion, start: number, end: number): boolean {
  // The question's step from its own start, applied to this window's start (as a share when relative).
  const moved = (x: number) => (q.relative ? (q.start.value === 0 ? start : (start * x) / q.start.value) : start + (x - q.start.value));
  switch (q.kind) {
    case 'direction':
      return q.op === 'lower' ? end < start : end > start;
    case 'threshold': {
      const level = moved(q.threshold ?? q.start.value);
      return q.op === 'below' ? end < level : end > level;
    }
    case 'between':
      return end >= moved(q.low ?? q.start.value) && end <= moved(q.high ?? q.start.value);
    default:
      return false;
  }
}

/** Share of past windows (at most one start a week, ended before `before`) in which the event happened. */
export function replayBaseRate(q: ReplayQuestion, points: Point[], before: string, minWindows = 30): number | null {
  if (q.kind === 'direction') return directionBaseRate(points, q.days, q.op === 'lower' ? 'lower' : 'higher', before, minWindows)?.rate ?? null;
  let hits = 0;
  let n = 0;
  let nextStart = '';
  for (let i = 0; i < points.length; i++) {
    const s = points[i];
    if (s.date < nextStart) continue;
    const endDate = addDaysIso(s.date, q.days);
    if (endDate > before) break;
    let e: Point | null = null;
    for (let j = i + 1; j < points.length; j++) if (points[j].date >= endDate) { e = points[j]; break; }
    if (!e) break;
    n++;
    if (happened(q, s.value, e.value)) hits++;
    nextStart = addDaysIso(s.date, 7);
  }
  return n >= minWindows ? hits / n : null;
}

export type ReplayAnswer = { probability: number } | { level: number };

export function replayAnswerProblems(q: Pick<ReplayQuestion, 'kind'>, answer: unknown): string[] {
  const a = (answer ?? {}) as Record<string, unknown>;
  if (q.kind === 'level') return finite(a.level) ? [] : ['Give your forecast as a number'];
  return finite(a.probability) && (a.probability as number) >= 0 && (a.probability as number) <= 1 ? [] : ['A probability from 0 to 1'];
}

/** Score a replay answer at once from the history. */
export function scoreReplay(q: ReplayQuestion, answer: ReplayAnswer, points: Point[]): { end: Point; score: ProbabilityScore | LevelScore } | { reason: string } {
  const end = firstOnOrAfter(points, q.endDate);
  if (!end) return { reason: 'No value at the end of the window' };
  if (q.kind === 'level') return { end, score: scoreLevel((answer as { level: number }).level, end.value, q.start.value) };
  const base = replayBaseRate(q, points, q.start.date);
  return { end, score: scoreProbability((answer as { probability: number }).probability, happened(q, q.start.value, end.value), base) };
}

/** One saved replay result (data/local/quest-replays.jsonl). */
export interface ReplayResult {
  at: string;
  /** Account id when sign-in is on; "local" otherwise. */
  accountId: string;
  packId: string;
  itemId: string;
  country: string;
  series: string;
  question: ReplayQuestion;
  answer: ReplayAnswer;
  end: Point;
  score: ProbabilityScore | LevelScore;
}

/** Summary of saved replays: how many, and the mean skill against the base rate or no change. */
export function replaySummary(results: ReplayResult[]): { n: number; meanSkill: number | null; beatBase: number } {
  const skills = results.map((r) => r.score.skill).filter((s): s is number => typeof s === 'number');
  return {
    n: results.length,
    meanSkill: skills.length ? r6(skills.reduce((a, b) => a + b, 0) / skills.length) : null,
    beatBase: skills.filter((s) => s > 0).length,
  };
}
