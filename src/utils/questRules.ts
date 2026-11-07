/**
 * Quest settle rules (Quests step 2): the small, fixed set of ways a Forecast Quest can be decided.
 * A Quest file holds data, never code, so every rule is one of these kinds on one named series:
 *
 *   threshold  is the value above / below a stated number at a date?          answer: probability
 *   between    is the value inside a stated range at a date?                  answer: probability
 *   direction  is the value at one date higher / lower than at another?       answer: probability
 *   level      what is the value at a date?                                   answer: a number
 *
 * An observation is a date for daily and weekly series (the first published value on or after it)
 * and a period plus a date for annual series (the value for that year as first read on or after the
 * date). Direction rules may start from "closesOn", the day entries close, so a question can be
 * about change from then without typing today's figure into the file.
 *
 * Browser-safe, pure.
 */
import { questSeriesDef, seriesProblem } from './questSeries';

export interface QuestSeriesRef {
  /** ISO3 code, or WLD for a world series. */
  country: string;
  series: string;
}

export interface QuestObservation {
  /** YYYY-MM-DD: the first published value on or after this date. */
  on: string;
  /** Annual series only: the year whose value is read, e.g. "2026". */
  period?: string;
}

export type QuestRule =
  | { kind: 'threshold'; ref: QuestSeriesRef; at: QuestObservation; op: 'above' | 'below'; value: number }
  | { kind: 'between'; ref: QuestSeriesRef; at: QuestObservation; low: number; high: number }
  | { kind: 'direction'; ref: QuestSeriesRef; from: QuestObservation | 'closesOn'; to: QuestObservation; op: 'higher' | 'lower' }
  | { kind: 'level'; ref: QuestSeriesRef; at: QuestObservation };

export const RULE_KINDS = ['threshold', 'between', 'direction', 'level'] as const;

export type RuleAnswer = 'probability' | 'level';

export function ruleAnswer(rule: QuestRule): RuleAnswer {
  return rule.kind === 'level' ? 'level' : 'probability';
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (s: unknown): s is string => typeof s === 'string' && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function observationProblems(obs: unknown, seriesId: string, label: string): string[] {
  const def = questSeriesDef(seriesId);
  if (!obs || typeof obs !== 'object') return [`${label}: missing`];
  const o = obs as Partial<QuestObservation>;
  const out: string[] = [];
  if (!isDate(o.on)) out.push(`${label}.on: must be a YYYY-MM-DD date`);
  if (def?.freq === 'annual') {
    if (typeof o.period !== 'string' || !/^\d{4}$/.test(o.period)) out.push(`${label}.period: an annual series needs the year, e.g. "2026"`);
    else if (isDate(o.on) && Number(o.period) >= Number(o.on.slice(0, 4))) out.push(`${label}: the value for ${o.period} cannot be published by ${o.on}`);
  } else if (o.period !== undefined) {
    out.push(`${label}.period: only annual series take a period`);
  }
  return out;
}

/** The last date a rule reads; the Quest settles on or after it. */
export function ruleSettleDate(rule: QuestRule): string {
  return rule.kind === 'direction' ? rule.to.on : rule.at.on;
}

/** Everything wrong with a rule; empty when it is valid. `closesOn` is the Quest's close date. */
export function ruleProblems(rule: unknown, closesOn?: string): string[] {
  if (!rule || typeof rule !== 'object') return ['rule: missing'];
  const r = rule as Record<string, unknown>;
  if (!RULE_KINDS.includes(r.kind as (typeof RULE_KINDS)[number])) return [`rule.kind: must be one of ${RULE_KINDS.join(', ')}`];
  const ref = r.ref as Partial<QuestSeriesRef> | undefined;
  if (!ref || typeof ref.country !== 'string' || typeof ref.series !== 'string') return ['rule.ref: needs country and series'];
  const out: string[] = [];
  const sp = seriesProblem(ref.country, ref.series);
  if (sp) out.push(`rule.ref: ${sp}`);
  const typed = rule as QuestRule;
  if (typed.kind === 'direction') {
    if (typed.op !== 'higher' && typed.op !== 'lower') out.push('rule.op: must be higher or lower');
    out.push(...observationProblems(typed.to, ref.series, 'rule.to'));
    if (typed.from !== 'closesOn') {
      out.push(...observationProblems(typed.from, ref.series, 'rule.from'));
      const f = typed.from as QuestObservation;
      if (isDate(f?.on) && isDate(typed.to?.on) && f.on >= typed.to.on && (f.period ?? '') >= (typed.to.period ?? '')) out.push('rule: "from" must come before "to"');
    } else if (questSeriesDef(ref.series)?.freq === 'annual') {
      out.push('rule.from: an annual series needs a stated period, not closesOn');
    } else if (closesOn && isDate(typed.to?.on) && typed.to.on <= closesOn) {
      out.push('rule.to: must be after the day entries close');
    }
  } else {
    out.push(...observationProblems(typed.at, ref.series, 'rule.at'));
    if (typed.kind === 'threshold') {
      if (typed.op !== 'above' && typed.op !== 'below') out.push('rule.op: must be above or below');
      if (!finite(typed.value)) out.push('rule.value: must be a number');
    }
    if (typed.kind === 'between') {
      if (!finite(typed.low) || !finite(typed.high)) out.push('rule.low / rule.high: must be numbers');
      else if (typed.low >= typed.high) out.push('rule: low must be below high');
    }
  }
  if (closesOn && !out.length && ruleSettleDate(typed) <= closesOn) out.push('rule: the value it reads must come after the day entries close');
  return out;
}

/** A value read for a rule, or why it could not be read (the Quest is then Unresolvable). */
export type RuleReading = { value: number; date: string } | { reason: string };

export type RuleOutcome =
  | { status: 'settled'; answer: 'probability'; happened: boolean; readings: Array<{ value: number; date: string }> }
  | { status: 'settled'; answer: 'level'; value: number; readings: Array<{ value: number; date: string }> }
  | { status: 'unresolvable'; reason: string };

/**
 * Decide a rule from the readings supplied by the resolver. `read` returns the published value for
 * an observation (the resolver handles first-on-or-after and first-read vintages); `closesOn` is the
 * Quest's close date, used for direction rules that start there.
 */
export function evaluateRule(rule: QuestRule, closesOn: string, read: (ref: QuestSeriesRef, obs: QuestObservation) => RuleReading): RuleOutcome {
  const get = (obs: QuestObservation) => read(rule.ref, obs);
  if (rule.kind === 'direction') {
    const a = get(rule.from === 'closesOn' ? { on: closesOn } : rule.from);
    if ('reason' in a) return { status: 'unresolvable', reason: a.reason };
    const b = get(rule.to);
    if ('reason' in b) return { status: 'unresolvable', reason: b.reason };
    const happened = rule.op === 'higher' ? b.value > a.value : b.value < a.value;
    return { status: 'settled', answer: 'probability', happened, readings: [a, b] };
  }
  const x = get(rule.at);
  if ('reason' in x) return { status: 'unresolvable', reason: x.reason };
  if (rule.kind === 'level') return { status: 'settled', answer: 'level', value: x.value, readings: [x] };
  const happened = rule.kind === 'threshold' ? (rule.op === 'above' ? x.value > rule.value : x.value < rule.value) : x.value >= rule.low && x.value <= rule.high;
  return { status: 'settled', answer: 'probability', happened, readings: [x] };
}

/** The rule in plain words, for the Quest page and the checker's output. */
export function describeRule(rule: QuestRule): string {
  const def = questSeriesDef(rule.ref.series);
  const name = `${def?.label ?? rule.ref.series}${rule.ref.country === 'WLD' ? '' : ` (${rule.ref.country})`}`;
  const unit = def?.unit ? ` ${def.unit}` : '';
  const obs = (o: QuestObservation) => (o.period ? `for ${o.period} (as first published on or after ${o.on})` : `on the first value published on or after ${o.on}`);
  switch (rule.kind) {
    case 'threshold':
      return `Yes if ${name} ${obs(rule.at)} is ${rule.op} ${rule.value}${unit}.`;
    case 'between':
      return `Yes if ${name} ${obs(rule.at)} is between ${rule.low} and ${rule.high}${unit}, inclusive.`;
    case 'direction':
      return `Yes if ${name} ${obs(rule.to)} is ${rule.op} than ${rule.from === 'closesOn' ? 'on the first value published on or after the day entries close' : obs(rule.from)}.`;
    case 'level':
      return `Forecast ${name}${unit ? `, in${unit},` : ''} ${obs(rule.at)}.`;
  }
}
