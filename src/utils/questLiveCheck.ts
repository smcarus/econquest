/**
 * The report for `npm run quests:live-check` (scripts/quests-live-check.ts): what the running app
 * shows for every Quest on file, drafts included, so the maintainer can tick the "live figure or
 * Missing with a reason" and "practice questions" boxes in docs/QUESTS.md from one pasted output.
 * Nothing here calls the network; the script fetches and hands the answers in.
 */

export interface LiveFigure {
  series: string;
  country: string;
  label?: string;
  value?: number;
  date?: string;
  missing?: string;
}

export interface LiveQuest {
  id: string;
  type: string;
  approved: boolean;
  /** The figures the Quest page shows, or why the page did not answer. */
  figures: LiveFigure[] | { error: string };
  /** Forecast Quests only: the practice question's start date, or why there is none. */
  practice?: { start: string; endDate: string } | { error: string };
}

export interface StarterRun {
  language: 'Python' | 'R' | 'Stata';
  outcome: 'ran' | 'failed' | 'not installed';
  detail?: string;
}

export interface LiveCheckInput {
  app: string;
  quests: LiveQuest[];
  bohn: { rows: number; file: string } | { error: string };
  starters: StarterRun[];
}

export interface LiveCheckReport {
  lines: string[];
  counts: { quests: number; figures: number; live: number; missing: number; pageErrors: number; practiceOk: number; practiceNone: number };
}

const isErr = (x: unknown): x is { error: string } => typeof x === 'object' && x !== null && 'error' in x;

export function liveCheckReport(input: LiveCheckInput): LiveCheckReport {
  const lines: string[] = [`Quests live check against ${input.app}`, ''];
  const counts = { quests: input.quests.length, figures: 0, live: 0, missing: 0, pageErrors: 0, practiceOk: 0, practiceNone: 0 };
  lines.push('Figures on each Quest page (a Missing figure must give a reason):');
  for (const q of input.quests) {
    const tag = `${q.approved ? 'approved' : 'draft'} ${q.type}`;
    if (isErr(q.figures)) {
      counts.pageErrors++;
      lines.push(`  PAGE ERROR  ${q.id} (${tag}): ${q.figures.error}`);
      continue;
    }
    if (!q.figures.length) lines.push(`  no series   ${q.id} (${tag})`);
    for (const f of q.figures) {
      counts.figures++;
      const name = `${f.series}${f.country === 'WLD' ? '' : ` ${f.country}`}`;
      if (typeof f.value === 'number') {
        counts.live++;
        lines.push(`  live        ${q.id} (${tag}): ${name} = ${f.value} on ${f.date ?? '?'}`);
      } else {
        counts.missing++;
        lines.push(`  MISSING     ${q.id} (${tag}): ${name}: ${f.missing?.trim() || 'no reason given (this is a bug)'}`);
      }
    }
  }
  lines.push('', 'Practice questions (Forecast Quests on daily or weekly series):');
  for (const q of input.quests) {
    if (!q.practice) continue;
    if (isErr(q.practice)) {
      counts.practiceNone++;
      lines.push(`  none        ${q.id}: ${q.practice.error}`);
    } else {
      counts.practiceOk++;
      lines.push(`  ok          ${q.id}: from ${q.practice.start} to ${q.practice.endDate}`);
    }
  }
  lines.push('', 'Bohn replication (bra-bohn-replication):');
  lines.push(isErr(input.bohn) ? `  download FAILED: ${input.bohn.error}` : `  downloaded ${input.bohn.rows} rows to ${input.bohn.file}`);
  for (const s of input.starters) lines.push(`  ${s.language} starter: ${s.outcome}${s.detail ? ` (${s.detail})` : ''}`);
  lines.push(
    '',
    `Summary: ${counts.quests} Quests, ${counts.figures} figures (${counts.live} live, ${counts.missing} Missing), ${counts.pageErrors} page errors; practice ${counts.practiceOk} ok, ${counts.practiceNone} none.`,
  );
  return { lines, counts };
}

/** What should fail the run: a page error, a Missing figure with no reason, a failed download or starter. */
export function liveCheckProblems(input: LiveCheckInput): string[] {
  const out: string[] = [];
  for (const q of input.quests) {
    if (isErr(q.figures)) out.push(`${q.id}: page error`);
    else for (const f of q.figures) if (typeof f.value !== 'number' && !f.missing?.trim()) out.push(`${q.id}: ${f.series} Missing with no reason`);
  }
  if (isErr(input.bohn)) out.push('Bohn download failed');
  for (const s of input.starters) if (s.outcome === 'failed') out.push(`${s.language} starter failed`);
  return out;
}
