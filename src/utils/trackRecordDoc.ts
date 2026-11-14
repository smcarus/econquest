/**
 * docs/TRACK_RECORD.md (npm run docs:track-record): one public page with every pre-registered test
 * on record, passed or failed, and the Holm (1979) correction across all of them, so a reader can
 * see in one place how many rules were tried and which passes survive.
 *
 * Built only from files in the repository: the recorded verdicts (docs/validation/recorded-verdicts.json,
 * copied from real runs) and the pre-registered test files with their hashes. Nothing is estimated.
 *
 * The p a verdict was judged on is the row's own `p` when it has one; older rows state it only in
 * their summary, and the largest p written there is taken (a forecast must pass at every horizon,
 * so its worst horizon decides, as in the app). A row whose summary gives no p is counted in the
 * family with p = 1. Holm-adjusted p-values only rise when any input p rises, so this can only make
 * every other adjusted p larger (stricter), never smaller; the row itself reads "p not recorded".
 *
 * Tests entered to Signal Quests (quests/test-verdicts.json, src/utils/questSignal.ts) join the same
 * family: each one tried raises the bar for every other, the app's own tests included.
 *
 * Browser-safe, pure.
 */
import { holm } from './multipleTesting';
import { VERDICT_FOLDER, type RecordedVerdict, type VerdictKind } from './methodsDoc';
import type { QuestTestVerdict } from './questSignal';

/** A row's kind: one of the app's own test folders, or a test entered to a Signal Quest. */
export type TrackKind = VerdictKind | 'quest';

export interface TestFile {
  kind: VerdictKind;
  id: string;
  version: number;
  file: string;
  registeredOn?: string;
  hash?: string;
  /** The registered pass mark for p. */
  maxPValue?: number;
}

export interface RecordedRun {
  ranAt: string;
  where: string;
}

export interface TrackRow {
  key: string;
  verdict: RecordedVerdict;
  kind: TrackKind;
  file?: TestFile;
  /** A Quest test: where its entry file is. */
  quest?: { questId: string; login: string; n: number };
  /** The p the verdict was judged on, when the record states one. */
  p?: number;
  adjusted?: number;
  alpha: number;
  holds?: boolean;
}

const KIND_LABEL: Record<TrackKind, string> = { backtest: 'Backtest', forecast: 'Forecast evaluation', signal: 'Signal test', quest: 'Quest test' };
const VERDICT_LABEL: Record<RecordedVerdict['verdict'], string> = { passed: 'Passed', failed: 'Failed', too_few_cases: 'Too few cases' };

/** The largest "p <number>" written in a summary, or undefined when it states none. */
export function pFromSummary(summary: string): number | undefined {
  const ps = [...summary.matchAll(/\bp (\d+(?:\.\d+)?(?:e-?\d+)?)\b/gi)].map((m) => Number(m[1])).filter((p) => Number.isFinite(p) && p >= 0 && p <= 1);
  return ps.length ? Math.max(...ps) : undefined;
}

const fileName = (id: string, version: number) => (version === 1 ? `${id}.json` : `${id}.v${version}.json`);
const r3 = (v: number) => Number(v.toPrecision(3));
const fmtP = (p: number) => (p < 0.001 ? p.toExponential(1) : String(r3(p)));

/** One row per recorded verdict (each version of each test counts), with the Holm reading across them all. */
export function trackRows(verdicts: RecordedVerdict[], files: TestFile[], questVerdicts: QuestTestVerdict[] = []): TrackRow[] {
  const own: TrackRow[] = verdicts.map((v) => {
    const kind = v.kind ?? 'backtest';
    const file = files.find((f) => f.kind === kind && f.id === v.id && f.version === v.version);
    const p = typeof v.p === 'number' && Number.isFinite(v.p) ? v.p : pFromSummary(v.summary);
    return { key: `${kind} ${v.id} v${v.version}`, verdict: v, kind, file, p, alpha: file?.maxPValue ?? (kind === 'forecast' ? 0.1 : 0.05) };
  });
  const quests: TrackRow[] = questVerdicts.map((q) => ({
    key: `quest ${q.id} v${q.version}`,
    verdict: { id: q.id, version: q.version, ranAt: q.ranAt, verdict: q.verdict, method: 2, summary: q.summary, ...(q.p !== undefined ? { p: q.p } : {}) },
    kind: 'quest',
    quest: { questId: q.questId, login: q.login, n: q.n },
    file: { kind: 'signal', id: q.id, version: q.version, file: `${q.login}.${q.n}.json`, registeredOn: q.registeredOn, hash: q.entryHash, maxPValue: q.maxPValue },
    p: typeof q.p === 'number' && Number.isFinite(q.p) ? q.p : undefined,
    alpha: q.maxPValue,
  }));
  const base = [...own, ...quests];
  const adj = holm(base.map((r) => ({ key: r.key, p: r.p ?? 1 })));
  return base.map((r) => {
    if (r.p === undefined) return r;
    const a = adj.get(r.key) ?? 1;
    return { ...r, adjusted: r3(a), holds: a <= r.alpha };
  });
}

const cell = (s: string) => s.replace(/\|/g, '\\|');

/** Whole days from registration to the run, or undefined when the registration date is missing. */
export function daysBeforeRun(r: TrackRow): number | undefined {
  const reg = r.file?.registeredOn?.slice(0, 10);
  const ran = r.verdict.ranAt.slice(0, 10);
  if (!reg || !/^\d{4}-\d{2}-\d{2}$/.test(reg)) return undefined;
  const d = Math.round((Date.parse(`${ran}T00:00:00Z`) - Date.parse(`${reg}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(d) ? d : undefined;
}

function sameDayLine(rows: TrackRow[]): string {
  const known = rows.map(daysBeforeRun).filter((d): d is number => d !== undefined);
  const same = known.filter((d) => d <= 0).length;
  const near = known.filter((d) => d <= 1).length;
  const missing = rows.length - known.length;
  const most = known.length ? Math.max(...known) : 0;
  const parts = [`${near} of the ${rows.length} tests were written down on the day they ran or the day before (${same} on the same day).`];
  if (most > 1) parts.push(`The longest gap between writing a test down and running it is ${most} days.`);
  if (missing) parts.push(`${missing} ${missing === 1 ? 'test has' : 'tests have'} no registration date on file.`);
  return parts.join(' ');
}

export function trackRecordMarkdown(verdicts: RecordedVerdict[], files: TestFile[], runs: RecordedRun[], questVerdicts: QuestTestVerdict[] = []): string {
  const rows = trackRows(verdicts, files, questVerdicts);
  const n = rows.length;
  const count = (k: RecordedVerdict['verdict']) => rows.filter((r) => r.verdict.verdict === k).length;
  const passes = rows.filter((r) => r.verdict.verdict === 'passed');
  const holding = passes.filter((r) => r.holds);
  const noP = passes.filter((r) => r.p === undefined);
  const name = (r: TrackRow) => `${r.verdict.id} v${r.verdict.version}`;
  const list = (rs: TrackRow[]) => (rs.length ? rs.map(name).join(', ') : 'none');
  const out: string[] = [
    '<!-- Generated by `npm run docs:track-record` from docs/validation/recorded-verdicts.json and the pre-registered test files. Edit those, not this file. -->',
    '',
    '# Track record',
    '',
    'Every pre-registered test the app has been judged on, passed or failed. Each test was written down',
    'and hashed before it was run (docs/validation/), judged once against its own pass mark, and never',
    're-tuned after a fail; a changed test is a new version and counts as a new test. Verdicts are copied',
    'from the owner\'s real runs and never edited. Backtest and evaluation results are hypothetical: they',
    'show how a rule would have done on past data, not money made.',
    '',
    `**When each test was written down.** ${sameDayLine(rows)} For a test written down shortly before it ran,`,
    'on data already public, the hash shows the rule did not change after the run; it does not show that',
    'the rule was fixed before anyone looked at the data. Read those as *specified and hashed before the',
    'run*. Only a test written down before its data exist rules out both. The *Registered* and *Run*',
    'columns below give both dates for every test.',
    '',
    '**In plain words.** Each test asks one question: would this rule have done better than the simplest',
    'possible guess, using only the figures that had actually been published at the time and after',
    'trading costs? *Passed* means it did, by more than luck would usually explain. *Failed* means it did',
    'not. *Too few cases* means there was not enough history to tell. The *p* column is the chance of a',
    'result at least this good by luck alone if the rule had no value (smaller is stronger). The *Holm p*',
    'column raises the bar because many rules were tried, and some would pass by luck. Doing well on past',
    'data does not mean a rule will work in future, which is why passes are also tracked forward (below).',
    'Terms are explained in the [Glossary](./GLOSSARY.md).',
    '',
    `**${n} tests on record: ${count('passed')} passed, ${count('failed')} failed, ${count('too_few_cases')} too few cases.**`,
    '',
    `Because ${n} tests were tried, a single p under 0.05 is not enough. The Holm correction across all ${n}`,
    'asks whether each pass still holds at its own pass mark once the number of tries is counted.',
    '',
    `- Passes that still hold after the correction: ${list(holding)}.`,
    `- Passes that do not hold after it: ${list(passes.filter((r) => r.p !== undefined && !r.holds))}.`,
    `- Passes whose record gives no p, so the correction cannot be read for them: ${list(noP)}.`,
    '',
    'A pass that does not hold after the correction is shown in the app as *Provisional pass* until its',
    'forward record (below) confirms it or the test is run again with a new pre-registered version.',
    '',
    '## Every test',
    '',
    '| Test | Kind | Registered | Run | Verdict | p | Holm p | Holds at pass mark |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const v = r.verdict;
    const method = v.method ? `, method ${v.method}` : '';
    const holds = r.p === undefined ? 'p not recorded' : `${r.holds ? 'Yes' : 'No'} (${r.alpha})`;
    out.push(
      `| ${cell(name(r))} | ${KIND_LABEL[r.kind]}${method} | ${r.file?.registeredOn ?? 'Missing'} | ${v.ranAt.slice(0, 10)} | ${VERDICT_LABEL[v.verdict]} | ${r.p === undefined ? 'not recorded' : fmtP(r.p)} | ${r.adjusted === undefined ? '' : fmtP(r.adjusted)} | ${holds} |`,
    );
  }
  out.push(
    '',
    `Holm p is across all ${n} tests above; a test whose record gives no p is counted with p = 1, which can only`,
    'make the other adjusted p-values larger. The app\'s own reading (Menu > Models & validation) uses every',
    'version run on that computer, so it can count more tests than this page. A computer that has not run a',
    "test yet shows the verdict on this page instead, marked \"from the project's published track record\".",
    '',
    '## What each run found',
    '',
  );
  for (const r of rows) {
    const v = r.verdict;
    const hash = r.file?.hash ? `, SHA-256 \`${r.file.hash.slice(0, 12)}\`` : '';
    if (r.quest) {
      const entry = `quests/entries/${r.quest.questId}/${r.quest.login}.${r.quest.n}.json`;
      out.push(`- **${name(r)}** (${VERDICT_LABEL[v.verdict].toLowerCase()}; entered by ${r.quest.login} to Signal Quest ${r.quest.questId}, entry file [${entry}](../${entry})${hash}): ${v.summary}`);
      continue;
    }
    const folder = VERDICT_FOLDER[r.kind as VerdictKind];
    const file = r.file?.file ?? fileName(v.id, v.version);
    out.push(`- **${name(r)}** (${VERDICT_LABEL[v.verdict].toLowerCase()}; test file [docs/validation/${folder}/${file}](./validation/${folder}/${file})${hash}): ${v.summary}`);
  }
  out.push(
    '',
    '## Forward record',
    '',
    'A backtest can be fitted to the past by accident; calls written down before the outcome is known',
    'cannot. Once a test passes, the server records each new call it makes while the outcome is still',
    'open and scores it by the same rule when the window ends (data/local/validation/forward.jsonl, each',
    'line hashed over the one before). The server runs all the pre-registered tests every Sunday at 03:30',
    'by default (Menu > Data health > Scheduled; `SCHEDULE_BACKTESTS=off` stops it), so this record grows',
    'without anyone pressing a button. Menu > Models & validation > Track record shows it, with a CSV.',
    '',
    'No forward results are copied into this page yet: the first scored calls come once each pass\'s',
    'window has ended. They will be added here from a real run, never by hand.',
    '',
    '## Runs',
    '',
    ...runs.map((x) => `- ${x.ranAt}: ${x.where}`),
    '',
  );
  return out.join('\n');
}
