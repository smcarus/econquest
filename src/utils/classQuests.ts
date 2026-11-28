/**
 * Class Quests (classroom step Q4): a teacher writes a Quest for one class, from the same fixed rule
 * types as every other Quest (src/utils/questRules.ts), so the app can settle it from a public feed
 * and never needs a figure typed in. Two types:
 *   forecast  above or below a number, higher or lower than when entries close, or the value itself,
 *             on one of the series a Quest may read (src/utils/questSeries.ts)
 *   debate    two to four positions, argued with evidence; not scored
 * Each Quest carries a level (intro, intermediate or advanced). It is kept with the class, in
 * data/local/class-quests/<class id>/, never in quests/, and only members of the class see it.
 *
 * Browser-safe, pure. Files: src/utils/classStore.ts. Routes: src/server/routes/classes.ts.
 */
import { questFileName, questProblems, QUEST_LEVELS, QUEST_REGIONS, QUEST_TOPICS, type DebateQuest, type ForecastQuest, type Quest, type QuestLevel, type QuestRegion, type QuestTopic } from './quests';
import { questSeriesDef, type QuestSeriesDef } from './questSeries';
import type { QuestObservation, QuestRule } from './questRules';

export const CLASS_QUEST_TYPES = ['forecast', 'debate'] as const;
export type ClassQuestType = (typeof CLASS_QUEST_TYPES)[number];
export const CLASS_RULE_KINDS = ['direction', 'threshold', 'level'] as const;
export type ClassRuleKind = (typeof CLASS_RULE_KINDS)[number];
/** At most this many Quests in one class, so the folder stays small. */
export const CLASS_QUESTS_MAX = 200;

/** What the teacher fills in on the form. */
export interface ClassQuestInput {
  type?: unknown;
  title?: unknown;
  summary?: unknown;
  level?: unknown;
  topic?: unknown;
  region?: unknown;
  /** ISO3 code; ignored for a world series (Brent, WTI). */
  country?: unknown;
  opensOn?: unknown;
  closesOn?: unknown;
  // forecast
  series?: unknown;
  kind?: unknown;
  /** threshold: above | below; direction: higher | lower. */
  op?: unknown;
  /** threshold only. */
  value?: unknown;
  /** The date the series is read on (YYYY-MM-DD). */
  on?: unknown;
  /** Annual series: the year whose value is read. */
  period?: unknown;
  // debate
  positions?: unknown;
  settlesOn?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** A file-safe id for a new class Quest: class-<words from the title>-<suffix>. */
export function classQuestId(title: string, suffix: string): string {
  let words = '';
  for (const ch of title.toLowerCase().normalize('NFKD')) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x300 && code <= 0x36f) continue;
    const ok = /[a-z0-9]/.test(ch) ? ch : '-';
    if (ok === '-' && (!words || words.endsWith('-'))) continue;
    words += ok;
    if (words.length >= 40) break;
  }
  while (words.endsWith('-')) words = words.slice(0, -1);
  const tail = suffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || '1';
  return `class-${words ? `${words}-` : ''}${tail}`;
}

function observation(def: QuestSeriesDef | undefined, on: string, period: string): QuestObservation {
  return def?.freq === 'annual' ? { on, period } : { on };
}

/** The rule a forecast form describes, or null when the kind is not one a class Quest may use. */
export function classRule(input: ClassQuestInput): QuestRule | null {
  const series = str(input.series);
  const def = questSeriesDef(series);
  const country = def?.world ? 'WLD' : str(input.country).toUpperCase();
  const ref = { country, series };
  const at = observation(def, str(input.on), str(input.period));
  const op = str(input.op);
  switch (str(input.kind)) {
    case 'direction':
      // A daily or weekly series compares with the day entries close; an annual one with the year before, read on the same day.
      return {
        kind: 'direction',
        ref,
        from: def?.freq === 'annual' && /^\d{4}$/.test(at.period ?? '') ? { on: at.on, period: String(Number(at.period) - 1) } : 'closesOn',
        to: at,
        op: op === 'lower' ? 'lower' : 'higher',
      };
    case 'threshold':
      return { kind: 'threshold', ref, at, op: op === 'below' ? 'below' : 'above', value: typeof input.value === 'number' ? input.value : Number(str(input.value)) };
    case 'level':
      return { kind: 'level', ref, at };
    default:
      return null;
  }
}

/** A class Quest from the form, or the problems in plain words. */
export function classQuestFrom(input: ClassQuestInput, ctx: { id: string; author: string; today: string }): { quest: Quest | null; problems: string[] } {
  const out: string[] = [];
  const type = str(input.type) as ClassQuestType;
  if (!CLASS_QUEST_TYPES.includes(type)) out.push('Choose Forecast or Debate');
  const level = str(input.level) as QuestLevel;
  if (!QUEST_LEVELS.includes(level)) out.push('Choose a level: intro, intermediate or advanced');
  const topic = str(input.topic) as QuestTopic;
  if (!QUEST_TOPICS.includes(topic)) out.push('Choose a topic');
  const region = str(input.region) as QuestRegion;
  if (!QUEST_REGIONS.includes(region)) out.push('Choose a region');
  const opensOn = str(input.opensOn);
  if (opensOn && opensOn < ctx.today) out.push('Entries cannot open before today');
  if (out.length) return { quest: null, problems: out };

  const base = {
    id: ctx.id,
    version: 1,
    title: str(input.title),
    summary: str(input.summary),
    level,
    topics: [topic],
    region,
    registeredOn: ctx.today,
    opensOn,
    closesOn: str(input.closesOn),
    author: ctx.author,
    approvedBy: ctx.author,
    knownLimits: [] as string[],
  };
  let quest: Quest;
  if (type === 'forecast') {
    const rule = classRule(input);
    if (!rule) return { quest: null, problems: ['Choose how the forecast is settled: higher or lower, above or below a number, or the value itself'] };
    quest = { ...base, type: 'forecast', countries: [rule.ref.country], rule, fallback: 'unresolvable' } as ForecastQuest;
  } else {
    const positions = (Array.isArray(input.positions) ? input.positions : str(input.positions).split('\n')).map(str).filter(Boolean);
    const country = str(input.country).toUpperCase() || 'WLD';
    quest = { ...base, type: 'debate', countries: [country], positions, settlesOn: str(input.settlesOn) } as DebateQuest;
  }
  const problems = questProblems(quest, { approved: true, fileName: questFileName(quest), classQuest: true });
  return problems.length ? { quest: null, problems } : { quest, problems: [] };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDate(d: string, days: number): string {
  return new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * A class Quest moved to a later term: every date moved by `days`, and the year an annual rule reads
 * moved by the same number of calendar years as its read date. Checked again before it is kept.
 */
export function shiftClassQuest(q: Quest, days: number, today: string): Quest {
  const shiftObs = (o: QuestObservation): QuestObservation => {
    const on = shiftDate(o.on, days);
    return o.period ? { on, period: String(Number(o.period) + Number(on.slice(0, 4)) - Number(o.on.slice(0, 4))) } : { on };
  };
  const moved: Record<string, unknown> = { ...q, registeredOn: today };
  for (const k of ['opensOn', 'closesOn', 'settlesOn'] as const) {
    const v = (q as unknown as Record<string, unknown>)[k];
    if (typeof v === 'string' && DATE_RE.test(v)) moved[k] = shiftDate(v, days);
  }
  if (q.type === 'forecast') {
    const r = q.rule;
    moved.rule =
      r.kind === 'direction'
        ? { ...r, from: r.from === 'closesOn' ? 'closesOn' : shiftObs(r.from), to: shiftObs(r.to) }
        : { ...r, at: shiftObs(r.at) };
  }
  return moved as unknown as Quest;
}

/** Problems with one class Quest file read back from disk; empty when it can be used. */
export function classQuestFileProblems(raw: unknown, fileName: string): string[] {
  const p = questProblems(raw, { approved: true, fileName, classQuest: true });
  const q = raw as Partial<Quest> | null;
  if (!p.length && q && !CLASS_QUEST_TYPES.includes(q.type as ClassQuestType)) p.push('type: a class Quest is a forecast or a debate');
  if (!p.length && q && !q.level) p.push('level: a class Quest names its level');
  return p;
}
