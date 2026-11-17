/**
 * Daily-download deadline (console integration item 11). An outside system that reads EconQuest's
 * figures each morning needs to know whether today's data came in. With DAILY_DOWNLOAD_DEADLINE set
 * (HH:MM, in SCHEDULE_TZ or TZ), the daily download either finishes by then, and its
 * daily_download_ready event says it was on time, or the server sends one feed_failed event for the
 * day at the deadline, naming what it saw (still running, never started, or failed to finish).
 *
 * A run counts for a day when it finished in the 24 hours up to that day's deadline. Browser-safe.
 */
import { clockIn } from './dataHealth';
import type { DailyFile } from './dailyRun';
import type { EventInput } from './consoleEvents';

export interface Deadline {
  /** HH:MM, local to `timeZone`. */
  time: string;
  timeZone: string;
}

export function parseDeadline(value: string | undefined, timeZone: string): { deadline: Deadline | null; problem?: string } {
  const v = (value || '').trim();
  if (!v || v.toLowerCase() === 'off') return { deadline: null };
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { deadline: null, problem: `DAILY_DOWNLOAD_DEADLINE must be a time like 07:30 (it was "${v.slice(0, 20)}"); no deadline is checked.` };
  return { deadline: { time: `${m[1]!.padStart(2, '0')}:${m[2]}`, timeZone } };
}

const prevDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Whether a run that finished at `finishedAt` is the one for the day whose deadline is `day` `d.time`. */
function finishedForDay(finishedAt: string, day: string, d: Deadline): boolean {
  const f = clockIn(new Date(finishedAt), d.timeZone);
  return (f.day === day && f.time <= d.time) || (f.day === prevDay(day) && f.time > d.time);
}

/**
 * For a finished run: the day whose deadline it counts for (the next deadline after it finished),
 * and, when it finished after its own day's deadline had passed, that day.
 */
export function deadlineNote(finishedAt: string, d: Deadline): { time: string; time_zone: string; counts_for: string; after_deadline_of: string | null } {
  const f = clockIn(new Date(finishedAt), d.timeZone);
  const late = f.time > d.time;
  const next = new Date(Date.parse(`${f.day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return { time: d.time, time_zone: d.timeZone, counts_for: late ? next : f.day, after_deadline_of: late ? f.day : null };
}

/**
 * At or after today's deadline: nothing when today's run finished in time; otherwise one
 * feed_failed for the day (dedupe on the day). Before the deadline: nothing.
 */
export function deadlineInputs(daily: DailyFile, d: Deadline, now: Date): EventInput[] {
  const c = clockIn(now, d.timeZone);
  if (c.time < d.time) return [];
  const last = daily.last;
  if (last?.finishedAt && finishedForDay(last.finishedAt, c.day, d)) return [];
  let what: string;
  if (!last) what = 'no daily download has ever run';
  else if (!last.finishedAt) {
    const started = clockIn(new Date(last.startedAt), d.timeZone);
    what = `the run that started ${started.day === c.day ? 'at' : `on ${started.day} at`} ${started.time} has not finished`;
  } else {
    const f = clockIn(new Date(last.finishedAt), d.timeZone);
    what = `the last run finished on ${f.day} at ${f.time}`;
  }
  return [
    {
      type: 'feed_failed',
      entity: { kind: 'app', name: 'Daily download' },
      severity: 'warning',
      as_of: c.day,
      source: 'EconQuest daily download',
      evidence_url: '/api/daily/status',
      summary: `Daily download missed its ${d.time} deadline (${d.timeZone}) for ${c.day}: ${what}. Figures are from the last run that finished.`,
      data: { deadline: d.time, time_zone: d.timeZone, day: c.day, last_started_at: last?.startedAt ?? null, last_finished_at: last?.finishedAt ?? null },
      discriminator: `deadline:${c.day}`,
    },
  ];
}
