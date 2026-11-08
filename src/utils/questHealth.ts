/**
 * Quests health (Quests step 12): the few measures that show whether Quests are working, for the
 * review six months after the first Quest opens. Worked out from the public files only (Quests,
 * public entries, the results record, Signal Quest verdicts), so anyone can check them.
 *
 *   People per month     how many people had a counted entry on a Quest that closed that month
 *                        (entry files carry no date of their own, so the Quest's closing month is used)
 *   Entries per Quest    counted entries (a replacement replaces, never adds) on each closed Quest
 *   Settled on time      share of due Quests whose result was recorded within GRACE_DAYS of the day
 *                        it was due; Debate Quests have no result, and a withdrawn Quest is left out
 *   Crowd skill          the crowd's middle answer against the base rate (src/utils/questStats.ts)
 *
 * Browser-safe, pure.
 */
import { countedPublicEntries, type PublicEntry } from './questPublicEntries';
import { questSettlesOn, type Quest, type QuestType } from './quests';
import { resultState, type ResolutionLine } from './questResolve';
import type { QuestTestVerdict } from './questSignal';
import type { Gated } from './questStats';

/** A result recorded this many days after the due date still counts as on time. */
export const GRACE_DAYS = 14;
/** The review falls this many months after the first Quest opened. */
export const REVIEW_MONTHS = 6;

export interface HealthMonth {
  /** YYYY-MM */
  month: string;
  questsClosed: number;
  entries: number;
  people: number;
}

export interface HealthQuest {
  id: string;
  title: string;
  type: QuestType;
  closesOn: string;
  entries: number;
}

export type OnTimeState = 'on_time' | 'late' | 'overdue' | 'waiting';

export interface QuestHealth {
  asOf: string;
  /** The day the first approved Quest opened; null before any is approved. */
  firstOpened: string | null;
  /** The six-month review date; null before any Quest is approved. */
  reviewOn: string | null;
  approved: number;
  closed: number;
  /** Closed Quests with no counted entry. */
  closedEmpty: number;
  totalEntries: number;
  totalPeople: number;
  /** People with counted entries in two or more different months. */
  returning: number;
  months: HealthMonth[];
  perQuest: HealthQuest[];
  /** Middle number of counted entries per closed Quest; null before any closes. */
  medianEntries: number | null;
  onTime: {
    graceDays: number;
    /** Due Quests that count towards the share (on time + late + overdue). */
    due: number;
    onTime: number;
    /** Recorded, but more than graceDays after the due date. */
    late: number;
    /** No result yet and more than graceDays past the due date. */
    overdue: number;
    /** Due, still inside the grace period, no result yet: not counted either way. */
    waiting: number;
    share: number | null;
    quests: Array<{ id: string; title: string; settlesOn: string; recordedOn: string | null; state: OnTimeState }>;
  };
  crowd: Gated<number>;
}

export interface HealthInput {
  quests: Array<{ quest: Quest; approved: boolean }>;
  entries: PublicEntry[];
  lines: ResolutionLine[];
  tests: QuestTestVerdict[];
  crowd: Gated<number>;
  today: string;
}

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function addMonths(d: string, n: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(day, last))).toISOString().slice(0, 10);
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function questHealth(x: HealthInput): QuestHealth {
  const approved = x.quests.filter((q) => q.approved).map((q) => q.quest);
  const firstOpened = approved.length ? approved.map((q) => q.opensOn).sort()[0] : null;
  const closed = approved.filter((q) => q.closesOn < x.today).sort((a, b) => a.closesOn.localeCompare(b.closesOn) || a.id.localeCompare(b.id));
  const counted = new Map(closed.map((q) => [q.id, countedPublicEntries(x.entries, q.id, q.version)]));

  const months = new Map<string, { questsClosed: number; entries: number; people: Set<string> }>();
  const monthsOf = new Map<string, Set<string>>();
  for (const q of closed) {
    const m = q.closesOn.slice(0, 7);
    const row = months.get(m) ?? { questsClosed: 0, entries: 0, people: new Set<string>() };
    row.questsClosed++;
    for (const e of counted.get(q.id)!) {
      row.entries++;
      row.people.add(e.login);
      (monthsOf.get(e.login) ?? monthsOf.set(e.login, new Set()).get(e.login)!).add(m);
    }
    months.set(m, row);
  }

  const perQuest: HealthQuest[] = closed.map((q) => ({ id: q.id, title: q.title, type: q.type, closesOn: q.closesOn, entries: counted.get(q.id)!.length }));

  const onTimeQuests: QuestHealth['onTime']['quests'] = [];
  for (const q of approved) {
    if (q.type === 'debate') continue;
    const settlesOn = questSettlesOn(q);
    if (settlesOn > x.today) continue;
    let recordedOn: string | null = null;
    if (q.type === 'signal') {
      // Nothing to run when nobody entered a test.
      if (!countedPublicEntries(x.entries, q.id, q.version).length) continue;
      const runs = x.tests.filter((t) => t.questId === q.id && t.questVersion === q.version).map((t) => t.ranAt.slice(0, 10)).sort();
      recordedOn = runs[0] ?? null;
    } else {
      const st = resultState(x.lines, q.id, q.version);
      if (st.state === 'withdrawn') continue;
      recordedOn = st.state === 'none' ? null : st.line.at.slice(0, 10);
    }
    const deadline = addDays(settlesOn, GRACE_DAYS);
    const state: OnTimeState = recordedOn ? (recordedOn <= deadline ? 'on_time' : 'late') : x.today > deadline ? 'overdue' : 'waiting';
    onTimeQuests.push({ id: q.id, title: q.title, settlesOn, recordedOn, state });
  }
  onTimeQuests.sort((a, b) => a.settlesOn.localeCompare(b.settlesOn) || a.id.localeCompare(b.id));
  const n = (s: OnTimeState) => onTimeQuests.filter((q) => q.state === s).length;
  const due = n('on_time') + n('late') + n('overdue');

  const allCounted = [...counted.values()].flat();
  return {
    asOf: x.today,
    firstOpened,
    reviewOn: firstOpened ? addMonths(firstOpened, REVIEW_MONTHS) : null,
    approved: approved.length,
    closed: closed.length,
    closedEmpty: perQuest.filter((q) => !q.entries).length,
    totalEntries: allCounted.length,
    totalPeople: new Set(allCounted.map((e) => e.login)).size,
    returning: [...monthsOf.values()].filter((s) => s.size >= 2).length,
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, r]) => ({ month, questsClosed: r.questsClosed, entries: r.entries, people: r.people.size })),
    perQuest,
    medianEntries: median(perQuest.map((q) => q.entries)),
    onTime: { graceDays: GRACE_DAYS, due, onTime: n('on_time'), late: n('late'), overdue: n('overdue'), waiting: n('waiting'), share: due ? n('on_time') / due : null, quests: onTimeQuests },
    crowd: x.crowd,
  };
}
