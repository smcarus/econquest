/**
 * Quest resolver (Quests step 5): works out the result of a Forecast Quest once its date has passed,
 * and the record results are kept in, quests/resolutions.jsonl.
 *
 * The record is one JSON line per event, never edited: a result (settled or unresolvable), a
 * maintainer's decision on a dispute, a withdrawal, or a note (for example that the source later
 * revised the figure). Each line carries the SHA-256 of the line before it, so a changed, removed
 * or reordered line breaks the chain from there on. A recorded result is never replaced: a dispute
 * decision is a new line, and the page shows both.
 *
 * A Replication Quest has no feed rule: the maintainer records the app's own figure, where the app
 * showed it, and the Quest's tolerance (`--replicate`); each entry then matches or not.
 *
 * Values are read the way the rule says:
 *   daily, weekly   the first published value on or after the date
 *   annual          the value for the year as first downloaded on or after the date: later
 *                   revisions, kept by the official history download, are undone
 *
 * Browser-safe, pure; hashing and the file are in src/utils/questResolveStore.ts.
 */
import type { HistoryRevision } from './officialHistory';
import type { ForecastQuest } from './quests';
import { evaluateRule, type QuestObservation, type QuestRule, type QuestSeriesRef, type RuleReading } from './questRules';
import { questSeriesDef } from './questSeries';
import { daysBetween, directionBaseRate, firstOnOrAfter, type Point } from './questScoring';

export type ResolutionKind = 'settled' | 'unresolvable' | 'decision' | 'withdrawn' | 'note';

export type ResolutionOutcome =
  | { answer: 'probability'; happened: boolean; baseRate: number | null }
  | { answer: 'level'; value: number; noChange: number | null }
  /** A Replication Quest: the app's figure, recorded by the maintainer from the app, and the tolerance a match allows. */
  | { answer: 'replication'; value: number; tolerance: number; from: string };

export interface ResolutionLine {
  seq: number;
  at: string;
  kind: ResolutionKind;
  questId: string;
  questVersion: number;
  questHash: string;
  /** settled */
  outcome?: ResolutionOutcome;
  readings?: Array<{ value: number; date: string }>;
  via?: 'rule' | 'fallback';
  /** unresolvable, withdrawn, note, decision */
  reason?: string;
  /** decision on a dispute: the recorded result stands, or the Quest is Unresolvable after all */
  decision?: 'stands' | 'unresolvable';
  by: string;
  prev: string;
  hash: string;
}

export type ResolutionDraft = Omit<ResolutionLine, 'seq' | 'prev' | 'hash'>;

export const GENESIS = 'GENESIS';

export function canonicalLine(l: Omit<ResolutionLine, 'hash'> | ResolutionLine): string {
  const { hash: _h, ...rest } = l as ResolutionLine;
  const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v);
  return JSON.stringify(sort(rest));
}

/** Index of the first line that breaks the chain, or -1 when it holds. */
export function brokenAt(lines: ResolutionLine[], hash: (s: string) => string): number {
  let prev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.seq !== i + 1 || l.prev !== prev || hash(canonicalLine(l)) !== l.hash) return i;
    prev = l.hash;
  }
  return -1;
}

export type QuestResultState =
  | { state: 'none' }
  | { state: 'settled'; line: ResolutionLine; decision?: ResolutionLine }
  | { state: 'unresolvable'; line: ResolutionLine; decision?: ResolutionLine }
  | { state: 'withdrawn'; line: ResolutionLine };

/** Where a Quest stands in the record: its first result, the latest decision on it, or a withdrawal. */
export function resultState(lines: ResolutionLine[], questId: string, version: number): QuestResultState {
  const mine = lines.filter((l) => l.questId === questId && l.questVersion === version);
  const withdrawn = mine.find((l) => l.kind === 'withdrawn');
  const result = mine.find((l) => l.kind === 'settled' || l.kind === 'unresolvable');
  if (withdrawn && (!result || withdrawn.seq < result.seq)) return { state: 'withdrawn', line: withdrawn };
  if (!result) return { state: 'none' };
  const decision = [...mine].reverse().find((l) => l.kind === 'decision' && l.seq > result.seq);
  if (decision?.decision === 'unresolvable') return { state: 'unresolvable', line: result, decision };
  return { state: result.kind === 'settled' ? 'settled' : 'unresolvable', line: result, ...(decision ? { decision } : {}) } as QuestResultState;
}

/**
 * The value for `period` as the first download on or after `on` saw it. `points` are today's values,
 * `revisions` the changes the official history download recorded (oldest first), `pulledAt` the
 * latest download. Revisions seen after the first download on or after `on` are undone.
 */
export function firstReadValue(points: Point[], revisions: HistoryRevision[] | undefined, pulledAt: string, period: string, on: string): RuleReading {
  if (pulledAt.slice(0, 10) < on) return { reason: `Not downloaded since ${on} yet` };
  const current = points.find((p) => p.date === period);
  const revs = (revisions || []).filter((r) => r.date === period).sort((a, b) => a.seenAt.localeCompare(b.seenAt));
  // The first download on or after `on`: a revision whose earlier download was before `on` came from it.
  let value: number | undefined = current?.value;
  for (let i = revs.length - 1; i >= 0; i--) {
    const r = revs[i];
    if (r.seenAt.slice(0, 10) < on) break;
    const fromFirstDownloadAfter = r.prevPulledAt.slice(0, 10) < on;
    if (fromFirstDownloadAfter) break;
    value = r.from;
  }
  if (value === undefined) return { reason: `No value for ${period} published` };
  return { value, date: period };
}

/** What the resolver needs for one series: daily or weekly points, or the annual run with its revisions. */
export type SeriesData =
  | { kind: 'points'; points: Point[] }
  | { kind: 'annual'; points: Point[]; revisions?: HistoryRevision[]; pulledAt: string }
  /** retry: the feed did not answer this time (a timeout, not a missing series); the resolver tries again later. */
  | { kind: 'missing'; reason: string; retry?: boolean };

function readFrom(data: SeriesData, obs: QuestObservation): RuleReading {
  if (data.kind === 'missing') return { reason: data.reason };
  if (data.kind === 'annual') return obs.period ? firstReadValue(data.points, data.revisions, data.pulledAt, obs.period, obs.on) : { reason: 'An annual series needs a period' };
  const p = firstOnOrAfter(data.points, obs.on);
  return p ? { value: p.value, date: p.date } : { reason: `No value published on or after ${obs.on} yet` };
}

/** True when a reading is missing only because the date has not come yet (the resolver tries again later). */
const notYet = (reason: string) => /yet$/.test(reason);

/**
 * The result of a Forecast Quest, as a line to append, or null when its value is not out yet.
 * `dataFor` returns what was fetched for each series the Quest reads.
 */
export function resolveForecast(quest: ForecastQuest, questHash: string, dataFor: (ref: QuestSeriesRef) => SeriesData, at: string, by: string): ResolutionDraft | null {
  const base = { at, questId: quest.id, questVersion: quest.version, questHash, by };
  const attempt = (rule: QuestRule) => {
    const data = dataFor(rule.ref);
    return { data, out: evaluateRule(rule, quest.closesOn, (_ref, obs) => readFrom(data, obs)) };
  };
  let via: 'rule' | 'fallback' = 'rule';
  let { data, out } = attempt(quest.rule);
  let rule = quest.rule;
  const wait = (d: SeriesData, o: typeof out) => o.status === 'unresolvable' && (notYet(o.reason) || (d.kind === 'missing' && d.retry === true));
  if (wait(data, out)) return null;
  if (out.status === 'unresolvable' && quest.fallback !== 'unresolvable') {
    rule = quest.fallback.rule;
    ({ data, out } = attempt(rule));
    via = 'fallback';
    if (wait(data, out)) return null;
  }
  if (out.status === 'unresolvable') return { ...base, kind: 'unresolvable', reason: out.reason };
  const history = data.kind === 'points' ? data.points.filter((p) => p.date <= quest.closesOn) : [];
  if (out.answer === 'level') {
    const noChange = history.length ? history[history.length - 1].value : null;
    return { ...base, kind: 'settled', via, readings: out.readings, outcome: { answer: 'level', value: out.value, noChange } };
  }
  let baseRate: number | null = null;
  if (rule.kind === 'direction' && data.kind === 'points' && questSeriesDef(rule.ref.series)?.freq !== 'annual') {
    const from = out.readings[0];
    baseRate = directionBaseRate(history, daysBetween(from.date, rule.to.on), rule.op, quest.closesOn)?.rate ?? null;
  }
  return { ...base, kind: 'settled', via, readings: out.readings, outcome: { answer: 'probability', happened: out.happened, baseRate } };
}

/** A result in plain words, for the script and the Quests page. */
export function describeOutcome(l: Pick<ResolutionLine, 'kind' | 'outcome' | 'readings' | 'via' | 'reason' | 'decision'>): string {
  if (l.kind === 'unresolvable') return `Unresolvable: ${l.reason ?? 'no reason given'}.`;
  if (l.kind === 'withdrawn') return `Withdrawn: ${l.reason ?? 'no reason given'}.`;
  if (l.kind === 'note') return `Note: ${l.reason ?? ''}`;
  if (l.kind === 'decision') return l.decision === 'unresolvable' ? `Decision on a dispute: Unresolvable after all. ${l.reason ?? ''}`.trim() : `Decision on a dispute: the result stands. ${l.reason ?? ''}`.trim();
  const read = (l.readings || []).map((r) => `${r.value} on ${r.date}`).join(', then ');
  const fb = l.via === 'fallback' ? ' (from the fallback rule, because the main series had no value)' : '';
  const o = l.outcome;
  if (!o) return 'Settled.';
  if (o.answer === 'replication') return `The app's figure is ${o.value} (${o.from}); an entry within ${o.tolerance} of it reproduces it.`;
  if (o.answer === 'level') return `The value was ${o.value}${read ? ` (${read})` : ''}${fb}.${o.noChange !== null ? ` On the day entries closed it was ${o.noChange}.` : ''}`;
  const rate = o.baseRate === null ? '' : ` In past periods of the same length this happened ${Math.round(o.baseRate * 100)}% of the time.`;
  return `${o.happened ? 'Yes, it happened' : 'No, it did not happen'}${read ? ` (${read})` : ''}${fb}.${rate}`;
}
