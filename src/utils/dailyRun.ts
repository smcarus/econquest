/**
 * The daily start-up run (`npm run daily`, started in the background by `npm run go` and the Mac
 * double-click file, at most once a day): everything the app can fetch by itself, so the figures,
 * the conflict and risk files, the nowcasts and forecasts and the weekly tests are ready without a
 * hand step. In order:
 *   1. every free feed for every country (the same run as Menu > Offline data > Download all;
 *      steps pulled within the last day are skipped);
 *   2. the files the app used to need downloaded by hand: past IMF WEO editions, the OFAC and UN
 *      sanctions lists, the Caldara-Iacoviello GPR index, newer UCDP conflict data;
 *   3. the long histories behind the nowcasts and forecasts (weekly), then a nowcast and a forecast
 *      for every country, to say which work and why the others are Missing;
 *   4. the pre-registered tests (backtests, forecast evaluations, currency signal tests) when the
 *      last run is more than 7 days old, so a missed Sunday is caught up; results are only added
 *      to the forward record, never changed;
 *   5. the connection check, which lists every source that needs a key or a file from you.
 * Nothing here makes a figure: a step that fails is reported with the reason, and the last good
 * figures stay. The result is kept in data/local/daily-run.json for `npm run go -- status`.
 */
import fs from 'fs';
import path from 'path';
import { formatBytes } from './preload';

export const DAILY_MIN_GAP_MS = 20 * 60 * 60 * 1000;
export const TESTS_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

export type DailyOutcome = 'done' | 'failed' | 'skipped';

export interface DailyStep {
  id: string;
  label: string;
  outcome: DailyOutcome;
  /** One line: what it brought back, or why it failed or was skipped. */
  note?: string;
  /** Lines worth reading in full (files not saved, sources needing setup). */
  details?: string[];
  /** Bytes this step downloaded (src/utils/downloadCounter.ts); missing in runs before it was counted. */
  bytes?: number;
}

export interface DailyRun {
  startedAt: string;
  finishedAt?: string;
  /** Where it ran: "docker" or "this computer". */
  where?: string;
  steps: DailyStep[];
  /** Bytes the whole run downloaded so far. */
  downloadedBytes?: number;
  /** The feeds could not be reached: the next start tries again (after an hour) instead of waiting a day. */
  offline?: boolean;
}

export interface DailyFile {
  last?: DailyRun;
}

/** Files fetched by scripts (each also runs on its own as npm run <script>). */
export const FILE_PULLS: Array<{ id: string; script: string; label: string; args?: string[] }> = [
  { id: 'weo', script: 'weo-pull.ts', args: ['--weekly'], label: 'Past IMF World Economic Outlook editions (real-time IMF figures, debt fan test)' },
  { id: 'sanctions', script: 'sanctions-pull.ts', label: 'OFAC and UN sanctions lists' },
  { id: 'gpr', script: 'gpr-pull.ts', label: 'Geopolitical Risk index (Caldara and Iacoviello, monthly)' },
  { id: 'ucdp', script: 'ucdp-pull.ts', label: 'UCDP conflict data (newer yearly release, monthly candidate events)' },
  { id: 'replays', script: 'replays-pull.ts', label: 'Monthly history for the scenario replays (OECD 10Y yields and Fed H.10 exchange rates via FRED, BCRP EMBIG spreads)' },
];

/** Data that cannot be fetched automatically, said plainly instead of pretending. */
export const BY_HAND: Array<{ label: string; why: string; how: string }> = [
  {
    label: 'Past IMF World Economic Outlook editions (only if the IMF refuses the download)',
    why: 'The IMF website often refuses automated downloads of its past WEO database files (HTTP 403), and the app does not get around that.',
    how: 'Open the IMF WEO database page (imf.org > Publications > World Economic Outlook databases), download the "By countries" file of each edition you need, and put it as downloaded in data/local/weo-vintages/.',
  },
  {
    label: 'ACLED political violence and protest counts',
    why: 'ACLED gives its files only to people signed in to a free myACLED account, so the app cannot fetch them.',
    how: 'Sign in at acleddata.com, download the Aggregated data file for each region you need, and put it as downloaded in data/local/acled/.',
  },
];

export function dailyFilePath(dataDir: string): string {
  return path.join(dataDir, 'local', 'daily-run.json');
}

export function readDaily(file: string): DailyFile {
  try {
    const p = JSON.parse(fs.readFileSync(file, 'utf8'));
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function writeDaily(file: string, d: DailyFile): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, file);
}

/**
 * Whether the daily run should go now: never ran, the last one never finished, or it finished more
 * than 20 hours ago (so a start each morning always runs, a second start the same day does not).
 */
export function dailyDue(d: DailyFile, now: Date, force = false): { due: boolean; reason: string } {
  if (force) return { due: true, reason: 'asked to run again' };
  const last = d.last;
  if (!last) return { due: true, reason: 'first run' };
  if (!last.finishedAt) {
    // A run older than 12 hours that never finished was stopped (the Mac slept or the app stopped).
    if (now.getTime() - Date.parse(last.startedAt) > 12 * 60 * 60 * 1000) return { due: true, reason: 'the last run did not finish' };
    return { due: false, reason: `a run started at ${last.startedAt.slice(11, 16)} UTC may still be going` };
  }
  const age = now.getTime() - Date.parse(last.finishedAt);
  if (last.offline && age >= 60 * 60 * 1000) return { due: true, reason: 'the last run found no connection' };
  if (age >= DAILY_MIN_GAP_MS) return { due: true, reason: 'last run was more than 20 hours ago' };
  return { due: false, reason: `already ran today (finished ${last.finishedAt.slice(0, 16).replace('T', ' ')} UTC)` };
}

/** Whether the weekly tests are due: none on record, or the newest started more than 7 days ago. */
export function testsDue(lastStartedAt: string | undefined, now: Date): boolean {
  if (!lastStartedAt) return true;
  const t = Date.parse(lastStartedAt);
  return !Number.isFinite(t) || now.getTime() - t >= TESTS_EVERY_MS;
}

/** Lines of a script's output worth keeping: what it could not save, and what it did save. */
export function interestingLines(output: string): { saved: string[]; problems: string[] } {
  const lines = output.split(/\r?\n/).map((l) => l.trimEnd());
  // "Saved <file> (...)" per file; not the "Saved 0 new ..." totals line.
  const saved = lines.filter((l) => /^Saved /.test(l) && !/^Saved \d+ new /.test(l));
  const problems: string[] = [];
  let inList = false;
  for (const l of lines) {
    if (/^(Not saved|Not found automatically)/.test(l)) {
      inList = true;
      const rest = l.replace(/^(Not saved|Not found automatically)[^:]*:\s*/, '').trim();
      if (rest) problems.push(rest);
      continue;
    }
    if (inList && /^\s+\S/.test(l)) problems.push(l.trim());
    else inList = false;
  }
  return { saved, problems };
}

/** One-line note on a nowcast/forecast sweep. */
export function sweepNote(countries: number, ok: number, label: string): string {
  return `${label} for ${ok} of ${countries} countries`;
}

const MARK: Record<DailyOutcome, string> = { done: 'OK  ', failed: 'FAIL', skipped: 'SKIP' };

/** The report printed at the end of the run and by `npm run go -- status`. */
export function formatDaily(run: DailyRun, opts: { full?: boolean } = {}): string {
  const out: string[] = [];
  const when = run.finishedAt ? `finished ${run.finishedAt.slice(0, 16).replace('T', ' ')} UTC` : `started ${run.startedAt.slice(0, 16).replace('T', ' ')} UTC, not finished`;
  out.push(`Daily data run (${when}${run.where ? `, ${run.where}` : ''}):`);
  for (const s of run.steps) {
    out.push(`  ${MARK[s.outcome]} ${s.label}${s.note ? `: ${s.note}` : ''}${s.bytes ? ` (${formatBytes(s.bytes)} downloaded)` : ''}`);
    if (opts.full) for (const d of s.details || []) out.push(`         - ${d}`);
  }
  if (run.downloadedBytes !== undefined) out.push(`  Downloaded in all: ${formatBytes(run.downloadedBytes)}${run.finishedAt ? '' : ' so far'}`);
  if (opts.full) {
    out.push('');
    out.push('Download by hand (the app cannot fetch these):');
    for (const b of BY_HAND) out.push(`  - ${b.label}. ${b.why} ${b.how}`);
  }
  return out.join('\n');
}
