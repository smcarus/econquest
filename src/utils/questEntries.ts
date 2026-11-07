/**
 * Private Quest entries (Quests step 4): a forecast logged on this computer (or a class's own
 * server), never published. Each entry is fixed and hashed when logged and appended to
 * data/local/quest-entries.jsonl; nothing is edited. A person may log again before entries close;
 * the last entry logged by the close date is the one that counts, and every earlier one is kept.
 *
 * Scored from the same feeds once the Quest's date has passed (daily and weekly series). Annual
 * series wait for the resolver, which reads the value as first published (src/utils/questResolve.ts), because
 * today's download may already hold a revised figure. Scoring, not a signal. Browser-safe, pure.
 */
import { questSettlesOn, type DebateQuest, type ForecastQuest } from './quests';
import { questSeriesDef } from './questSeries';
import type { QuestObservation, QuestRule } from './questRules';
import { daysBetween, directionBaseRate, firstOnOrAfter, scoreLevel, scoreProbability, type LevelScore, type Point, type ProbabilityScore } from './questScoring';

export const RATIONALE_MAX = 2000;
export const GROUP_MAX = 40;

/** A Forecast Quest takes a probability or a number; a Debate Quest takes a position (1 = the first listed). */
export type EntryAnswer = { probability: number } | { level: number } | { position: number };

/** The Quests that take entries. */
export type EntryQuest = ForecastQuest | DebateQuest;

/** A Debate entry must argue its position: at least this many characters. */
export const ARGUMENT_MIN = 40;

export interface QuestEntryInput {
  questId: string;
  answer: EntryAnswer;
  rationale?: string;
  /** A class code, so a teacher can see the class table. */
  group?: string;
}

export interface QuestEntry extends QuestEntryInput {
  id: string;
  questVersion: number;
  /** SHA-256 of the Quest file the entry answers. */
  questHash: string;
  author: string;
  loggedAt: string;
  hash: string;
}

export function canonicalEntry(e: Omit<QuestEntry, 'hash'> | QuestEntry): string {
  const { hash: _h, ...rest } = e as QuestEntry;
  const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v);
  return JSON.stringify(sort(rest));
}

export function entryProblems(x: Partial<QuestEntryInput>, quest: EntryQuest, today: string): string[] {
  const out: string[] = [];
  if (today > quest.closesOn) out.push(`Entries closed on ${quest.closesOn}`);
  if (today < quest.opensOn && quest.approvedBy) out.push(`Entries open on ${quest.opensOn}`);
  const a = x.answer as Partial<{ probability: number; level: number; position: number }> | undefined;
  if (quest.type === 'debate') {
    const n = quest.positions.length;
    if (!a || !Number.isInteger(a.position) || (a.position as number) < 1 || (a.position as number) > n) out.push(`This Quest asks you to pick a position, 1 to ${n}`);
    if (typeof x.rationale !== 'string' || x.rationale.trim().length < ARGUMENT_MIN) out.push(`Your argument: at least ${ARGUMENT_MIN} characters, saying why, with the figures you rely on`);
  } else if (quest.rule.kind === 'level') {
    if (!a || typeof a.level !== 'number' || !Number.isFinite(a.level)) out.push('This Quest asks for a number');
  } else if (!a || typeof a.probability !== 'number' || !(a.probability >= 0 && a.probability <= 1)) {
    out.push('This Quest asks for a probability from 0 to 1');
  }
  if (x.rationale !== undefined && (typeof x.rationale !== 'string' || x.rationale.length > RATIONALE_MAX)) out.push(`${quest.type === 'debate' ? 'Argument' : 'Rationale'}: up to ${RATIONALE_MAX} characters`);
  if (x.group !== undefined && (typeof x.group !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(x.group))) out.push('Class code: letters, digits, - or _, up to 40');
  return out;
}

/** The entry that counts for each person on a Quest: the last one logged on or before the close date. */
export function countedEntries(entries: QuestEntry[], quest: Pick<EntryQuest, 'id' | 'closesOn'>): QuestEntry[] {
  const byAuthor = new Map<string, QuestEntry>();
  for (const e of entries) {
    if (e.questId !== quest.id || e.loggedAt.slice(0, 10) > quest.closesOn) continue;
    const prev = byAuthor.get(e.author);
    if (!prev || e.loggedAt >= prev.loggedAt) byAuthor.set(e.author, e);
  }
  return [...byAuthor.values()];
}

export type EntryScore =
  | { status: 'open' | 'waiting'; note: string }
  | { status: 'resolver'; note: string }
  | { status: 'unresolvable'; note: string }
  | { status: 'debate'; note: string }
  | ({ status: 'settled'; readings: Point[]; via: 'rule' | 'fallback' } & (ProbabilityScore | LevelScore));

type Outcome = { happened: boolean; readings: Point[]; baseRate: number | null } | { level: number; readings: Point[]; noChange: number | null } | { reason: string } | { wait: string } | { resolver: string };

function decide(rule: QuestRule, closesOn: string, points: Point[] | { reason: string }, today: string): Outcome {
  const def = questSeriesDef(rule.ref.series);
  if (def?.freq === 'annual') return { resolver: 'An annual figure is scored once its result is recorded, from the value as first published, not from today\'s download.' };
  const end: QuestObservation = rule.kind === 'direction' ? rule.to : rule.at;
  if (today < end.on) return { wait: `Scored after ${end.on}` };
  if ('reason' in points) return { reason: points.reason };
  const at = firstOnOrAfter(points, end.on);
  if (!at) return { wait: `No value published on or after ${end.on} yet` };
  const start = firstOnOrAfter(points, closesOn);
  const history = points.filter((p) => p.date <= closesOn);
  if (rule.kind === 'level') return { level: at.value, readings: [at], noChange: history.length ? history[history.length - 1].value : null };
  if (rule.kind === 'direction') {
    const from = rule.from === 'closesOn' ? start : firstOnOrAfter(points, rule.from.on);
    if (!from) return { reason: 'No value for the start date' };
    const base = directionBaseRate(history, daysBetween(from.date, rule.to.on), rule.op, closesOn);
    return { happened: rule.op === 'higher' ? at.value > from.value : at.value < from.value, readings: [from, at], baseRate: base?.rate ?? null };
  }
  const hit = rule.kind === 'threshold' ? (rule.op === 'above' ? at.value > rule.value : at.value < rule.value) : at.value >= rule.low && at.value <= rule.high;
  return { happened: hit, readings: [at], baseRate: null };
}

/**
 * Score one entry. `pointsFor` gives the series a rule reads (daily or weekly points, oldest first)
 * or why it has none.
 */
export function scoreEntry(entry: QuestEntry, quest: ForecastQuest, pointsFor: (rule: QuestRule) => Point[] | { reason: string }, today: string): EntryScore {
  if (today <= quest.closesOn) return { status: 'open', note: `Entries close ${quest.closesOn}; result due ${questSettlesOn(quest)}` };
  let o = decide(quest.rule, quest.closesOn, pointsFor(quest.rule), today);
  let via: 'rule' | 'fallback' = 'rule';
  if ('reason' in o && quest.fallback !== 'unresolvable') {
    o = decide(quest.fallback.rule, quest.closesOn, pointsFor(quest.fallback.rule), today);
    via = 'fallback';
  }
  if ('wait' in o) return { status: 'waiting', note: o.wait };
  if ('resolver' in o) return { status: 'resolver', note: o.resolver };
  if ('reason' in o) return { status: 'unresolvable', note: o.reason };
  const a = entry.answer as { probability?: number; level?: number };
  if ('level' in o) return { status: 'settled', via, readings: o.readings, ...scoreLevel(a.level as number, o.level, o.noChange) };
  return { status: 'settled', via, readings: o.readings, ...scoreProbability(a.probability as number, o.happened, o.baseRate) };
}

export interface ClassRow {
  author: string;
  entries: number;
  settled: number;
  /** Mean skill against the base rate on probability Quests (null when none settled with a base rate). */
  probabilitySkill: number | null;
  /** Mean skill against no change on number Quests. */
  levelSkill: number | null;
}

/** The class table: counted entries of one class code, by person. Private to the server it runs on. */
export function classTable(scored: Array<{ entry: QuestEntry; score: EntryScore }>): ClassRow[] {
  const rows = new Map<string, { entries: number; settled: number; p: number[]; l: number[] }>();
  for (const { entry, score } of scored) {
    const r = rows.get(entry.author) || { entries: 0, settled: 0, p: [], l: [] };
    r.entries++;
    if (score.status === 'settled') {
      r.settled++;
      if (score.skill !== null) (score.answer === 'probability' ? r.p : r.l).push(score.skill);
    }
    rows.set(entry.author, r);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1e4) / 1e4 : null);
  return [...rows.entries()]
    .map(([author, r]) => ({ author, entries: r.entries, settled: r.settled, probabilitySkill: avg(r.p), levelSkill: avg(r.l) }))
    .sort((a, b) => (b.probabilitySkill ?? -Infinity) - (a.probabilitySkill ?? -Infinity) || a.author.localeCompare(b.author));
}

/**
 * Practice on past data: a window of the Quest's own length that ended before today, picked from
 * the series' history. `pick` returns a number in [0, 1) (Math.random in the app; fixed in tests).
 * Only direction rules on daily or weekly series can be practised.
 */
export function practiceWindow(rule: QuestRule, closesOn: string, points: Point[], today: string, pick: () => number): { start: Point; endDate: string; days: number } | { reason: string } {
  if (rule.kind !== 'direction' || rule.from !== 'closesOn') return { reason: 'Practice is for Quests that ask whether a series will be higher or lower after entries close' };
  if (questSeriesDef(rule.ref.series)?.freq === 'annual') return { reason: 'Practice needs a daily or weekly series' };
  const days = daysBetween(closesOn, rule.to.on);
  const lastStart = new Date(Date.parse(`${today}T00:00:00Z`) - (days + 1) * 86_400_000).toISOString().slice(0, 10);
  const starts = points.filter((p) => p.date <= lastStart);
  // Leave at least 30 windows of history before the start for the base rate.
  const usable = starts.slice(Math.min(starts.length, Math.ceil((30 * 7) / Math.max(1, avgGapDays(points)))));
  if (!usable.length) return { reason: 'Not enough history to practise on yet' };
  const start = usable[Math.min(usable.length - 1, Math.floor(pick() * usable.length))];
  return { start, endDate: new Date(Date.parse(`${start.date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10), days };
}

function avgGapDays(points: Point[]): number {
  if (points.length < 2) return 1;
  return daysBetween(points[0].date, points[points.length - 1].date) / (points.length - 1);
}

/** Score a practice answer from the history; the base rate uses only windows that ended before the start. */
export function scorePractice(op: 'higher' | 'lower', probability: number, start: Point, endDate: string, days: number, points: Point[]): { score: ProbabilityScore; end: Point } | { reason: string } {
  const end = firstOnOrAfter(points, endDate);
  if (!end) return { reason: 'No value at the end of the window' };
  const happened = op === 'higher' ? end.value > start.value : end.value < start.value;
  const base = directionBaseRate(points, days, op, start.date);
  return { score: scoreProbability(probability, happened, base?.rate ?? null), end };
}
