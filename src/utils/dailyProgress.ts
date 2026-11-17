/**
 * How far the daily download (src/utils/dailyRun.ts, data/local/daily-run.json) has got, for the
 * progress view in Menu > Data health > Daily download and the line on screen while it runs. The
 * run saves each step as it ends, so the file can be read while it is still going.
 *
 * Browser-safe, pure.
 */
import type { DailyRun, DailyStep } from './dailyRun';

export const DAILY_PARTS: Array<{ label: string; ids: string[] }> = [
  { label: 'Free feeds for every country', ids: ['feeds'] },
  { label: 'Files: past IMF editions, sanctions lists, risk index, conflict data', ids: ['weo', 'sanctions', 'gpr', 'ucdp'] },
  { label: 'Long histories, nowcasts and forecasts', ids: ['nowcasts'] },
  { label: 'Pre-registered tests (weekly)', ids: ['tests'] },
  { label: 'Connection check: sources that need a key or a file from you', ids: ['check'] },
];

/** A run that has not finished after this long was stopped (the computer slept or the app closed). */
export const DAILY_STOPPED_AFTER_MS = 12 * 60 * 60 * 1000;

export type DailyState = 'none' | 'running' | 'stopped' | 'finished';

export interface DailyProgress {
  state: DailyState;
  /** Parts finished, of DAILY_PARTS.length. */
  partsDone: number;
  /** The part running now (1-based), while running. */
  current?: number;
  currentLabel?: string;
  done: number;
  failed: number;
  skipped: number;
  /** Steps that failed, with their note. */
  failedSteps: DailyStep[];
  /** Lines naming a source that needs a key, a file or an account from you. */
  needsYou: string[];
  downloadedBytes?: number;
}

export function dailyProgress(run: DailyRun | null | undefined, now = new Date()): DailyProgress {
  if (!run) return { state: 'none', partsDone: 0, done: 0, failed: 0, skipped: 0, failedSteps: [], needsYou: [] };
  const ids = new Set(run.steps.map((s) => s.id));
  let partsDone = 0;
  for (const p of DAILY_PARTS) {
    if (p.ids.every((id) => ids.has(id))) partsDone++;
    else break;
  }
  const started = Date.parse(run.startedAt);
  const state: DailyState = run.finishedAt ? 'finished' : Number.isFinite(started) && now.getTime() - started > DAILY_STOPPED_AFTER_MS ? 'stopped' : 'running';
  const count = (o: DailyStep['outcome']) => run.steps.filter((s) => s.outcome === o).length;
  const needsYou = [
    ...new Set(
      run.steps.flatMap((s) => (s.details || []).filter((d) => /^Needs setup\b/i.test(d)).map((d) => d.replace(/^Needs setup:\s*/i, '').trim())),
    ),
  ];
  const current = state === 'running' && partsDone < DAILY_PARTS.length ? partsDone + 1 : undefined;
  return {
    state,
    partsDone,
    ...(current ? { current, currentLabel: DAILY_PARTS[current - 1].label } : {}),
    done: count('done'),
    failed: count('failed'),
    skipped: count('skipped'),
    failedSteps: run.steps.filter((s) => s.outcome === 'failed'),
    needsYou,
    downloadedBytes: run.downloadedBytes,
  };
}

/** One line for the top of the screen while the run is going, or null when there is nothing to say. */
export function dailyLine(p: DailyProgress): string | null {
  if (p.state !== 'running') return null;
  const part = p.current ? `part ${p.current} of ${DAILY_PARTS.length}: ${p.currentLabel}` : 'finishing';
  return `Downloading data, ${part}. Figures fill in as each part ends; until then some read Missing.`;
}
