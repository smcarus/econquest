/**
 * Signal Quests (Quests step 10): an entry is a pre-registered test, run once and judged by the
 * signal standard (docs/METHODOLOGY.md), the same way as the app's own tests.
 *
 *   The test       an entry's answer is { test: {...} }: one of the app's test methods (the rules it
 *                  can already run on the free long histories), its settings, the sample and the
 *                  pass mark. A test that needs a method or data the app does not have yet starts
 *                  with a code pull request that adds the method; it cannot be entered as a file.
 *   Fixed first    the entry file is the registration: added by pull request (or posted from an
 *                  email) while entries are open, never changed, its SHA-256 recorded with the
 *                  verdict. A replacement before close is a new file; the highest number counts.
 *   Judged once    after entries close, `npm run quests:run-tests` runs every counted test once
 *                  with method 2 (whole years resampled), and the verdicts go in
 *                  quests/test-verdicts.json. A failed test is recorded and never re-run or re-tuned.
 *   Counted        every Quest test joins the family the Holm correction is taken over in
 *                  docs/TRACK_RECORD.md, so the more tests are tried, the higher the bar for each.
 *
 * The pass mark can be stricter than the app's own floor, never looser: at least 30 cases over at
 * least 6 years, p at or under 0.05, a lift of at least 1 point. Browser-safe, pure.
 */
import type { BacktestMethod, BacktestSpec } from './backtest';

/** The test methods an entry can use, with the settings each reads (from the app's registered tests). */
export const SIGNAL_METHODS: Record<BacktestMethod, { label: string; params: string[]; /** Reads files on the owner's computer (GDELT, UCDP), not a feed. */ local?: boolean }> = {
  cli_turn_policy: { label: 'OECD leading-indicator turns before policy-rate moves', params: ['confirmMonths', 'publicationLagMonths', 'windowMonths'] },
  cftc_crowding: { label: 'Crowded futures positioning that unwinds', params: ['lookbackWeeks', 'minLookbackWeeks', 'highPct', 'lowPct', 'windowWeeks', 'unwindPts', 'minGapWeeks'] },
  taylor_gap: { label: 'Policy rate far from a Taylor-rule rate, then moving towards it', params: ['publicationLagMonths', 'windowMonths', 'bandPts', 'rStar', 'inflationWeight', 'outputWeight', 'gapPublishMonth'] },
  regime_quadrant: { label: 'Growth and inflation regime before policy moves', params: ['cliLagMonths', 'cpiLagMonths', 'cliChangeMonths', 'cpiChangeMonths', 'windowMonths'] },
  cycle_clock: { label: 'Rate moves coming in runs', params: ['holdAfterMonths', 'windowMonths'] },
  timing_unwind: { label: 'Crowded positioning that has started to turn', params: ['lookbackWeeks', 'minLookbackWeeks', 'highPct', 'lowPct', 'turnWeeks', 'turnPts', 'windowWeeks', 'unwindPts', 'minGapWeeks'] },
  rule_family: { label: 'A family of policy rules agreeing before moves', params: ['publicationLagMonths', 'windowMonths', 'rStar', 'gapPublishMonth'] },
  unrest_onset: { label: 'Protest spikes before armed conflict starts', params: ['baselineMonths', 'zSpike', 'sdFloorPts', 'minMonthsInYear'], local: true },
};
export const SIGNAL_METHOD_IDS = Object.keys(SIGNAL_METHODS) as BacktestMethod[];

/** The app's floor for a Quest test's pass mark. */
export const SIGNAL_FLOOR = { minCases: 30, minYears: 6, maxPValue: 0.05, minLiftPts: 1 };
export const HYPOTHESIS_MIN = 40;
export const HYPOTHESIS_MAX = 600;
export const LIMIT_MAX = 400;

/** What an entrant writes: the parts of a pre-registered test that are theirs to choose. */
export interface SignalTest {
  hypothesis: string;
  method: BacktestMethod;
  params: Record<string, number>;
  sample: { from: string; to?: string };
  passMark: { minCases: number; minLiftPts: number; maxPValue: number; minSeriesShare?: number; minYears: number };
  knownLimits: string[];
}

const PERIOD = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** Everything wrong with a proposed test; empty when it can be run. `allowed` limits the methods (the Quest's own list). */
export function signalTestProblems(raw: unknown, allowed?: string[]): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['test: a test, written as { "hypothesis", "method", "params", "sample", "passMark", "knownLimits" }'];
  const t = raw as Partial<SignalTest> & Record<string, unknown>;
  const out: string[] = [];
  const known = new Set(['hypothesis', 'method', 'params', 'sample', 'passMark', 'knownLimits']);
  for (const k of Object.keys(t)) if (!known.has(k)) out.push(`test.${k}: not part of a test`);
  if (typeof t.hypothesis !== 'string' || t.hypothesis.trim().length < HYPOTHESIS_MIN || t.hypothesis.length > HYPOTHESIS_MAX)
    out.push(`test.hypothesis: what the test expects to find, in ${HYPOTHESIS_MIN} to ${HYPOTHESIS_MAX} characters`);
  const def = typeof t.method === 'string' ? SIGNAL_METHODS[t.method as BacktestMethod] : undefined;
  if (!def) out.push(`test.method: one of ${SIGNAL_METHOD_IDS.join(', ')}`);
  else if (allowed?.length && !allowed.includes(t.method as string)) out.push(`test.method: this Quest takes ${allowed.join(', ')}`);
  if (!t.params || typeof t.params !== 'object' || Array.isArray(t.params)) out.push('test.params: the settings, as names and numbers');
  else if (def) {
    for (const [k, v] of Object.entries(t.params)) {
      if (!def.params.includes(k)) out.push(`test.params.${k}: not a setting of ${t.method} (it reads ${def.params.join(', ')})`);
      else if (typeof v !== 'number' || !Number.isFinite(v)) out.push(`test.params.${k}: a number`);
    }
    const missing = def.params.filter((k) => !(k in (t.params as object)));
    if (missing.length) out.push(`test.params: give every setting, so nothing is chosen after the run (missing ${missing.join(', ')})`);
  }
  const s = t.sample as Partial<SignalTest['sample']> | undefined;
  if (!s || typeof s !== 'object' || typeof s.from !== 'string' || !PERIOD.test(s.from)) out.push('test.sample.from: where the sample starts, YYYY or YYYY-MM');
  else {
    if (s.to !== undefined && (typeof s.to !== 'string' || !PERIOD.test(s.to) || s.to <= s.from)) out.push('test.sample.to: after the start, YYYY or YYYY-MM (leave it out to use everything published)');
    for (const k of Object.keys(s)) if (k !== 'from' && k !== 'to') out.push(`test.sample.${k}: not part of a sample`);
  }
  const pm = t.passMark as Partial<SignalTest['passMark']> | undefined;
  if (!pm || typeof pm !== 'object') out.push('test.passMark: { "minCases", "minLiftPts", "maxPValue", "minYears" }');
  else {
    const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
    if (!num(pm.minCases) || !Number.isInteger(pm.minCases) || (pm.minCases as number) < SIGNAL_FLOOR.minCases) out.push(`test.passMark.minCases: a whole number, at least ${SIGNAL_FLOOR.minCases}`);
    if (!num(pm.minYears) || !Number.isInteger(pm.minYears) || (pm.minYears as number) < SIGNAL_FLOOR.minYears) out.push(`test.passMark.minYears: a whole number of years with cases, at least ${SIGNAL_FLOOR.minYears}`);
    if (!num(pm.maxPValue) || (pm.maxPValue as number) <= 0 || (pm.maxPValue as number) > SIGNAL_FLOOR.maxPValue) out.push(`test.passMark.maxPValue: above 0 and at most ${SIGNAL_FLOOR.maxPValue}`);
    if (!num(pm.minLiftPts) || (pm.minLiftPts as number) < SIGNAL_FLOOR.minLiftPts) out.push(`test.passMark.minLiftPts: how many points better than the base rate it must be, at least ${SIGNAL_FLOOR.minLiftPts}`);
    if (pm.minSeriesShare !== undefined && (!num(pm.minSeriesShare) || (pm.minSeriesShare as number) <= 0 || (pm.minSeriesShare as number) > 1)) out.push('test.passMark.minSeriesShare: a share above 0 and at most 1');
    for (const k of Object.keys(pm)) if (!['minCases', 'minLiftPts', 'maxPValue', 'minSeriesShare', 'minYears'].includes(k)) out.push(`test.passMark.${k}: not part of a pass mark`);
  }
  if (!Array.isArray(t.knownLimits) || !t.knownLimits.length || !t.knownLimits.every((k) => typeof k === 'string' && k.trim().length > 0 && k.length <= LIMIT_MAX))
    out.push(`test.knownLimits: at least one short sentence (up to ${LIMIT_MAX} characters) on what the test cannot show`);
  return out;
}

/** The test's id in the track record: the Quest and the entrant, so two people's tests never share one. */
export function questTestId(questId: string, login: string, questVersion = 1): string {
  return `quest_${questId}${questVersion > 1 ? `_v${questVersion}` : ''}_${login}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

/** The pre-registered test file the runner reads, built from an entry. `registeredOn` is when entries closed. */
export function signalSpec(test: SignalTest, at: { questId: string; questVersion: number; login: string; n: number; registeredOn: string }): BacktestSpec {
  return {
    id: questTestId(at.questId, at.login, at.questVersion),
    version: at.n,
    registeredOn: at.registeredOn,
    registeredBy: `${at.login}, entry ${at.n} to Quest ${at.questId}`,
    hypothesis: test.hypothesis,
    method: test.method,
    params: test.params,
    sample: test.sample,
    passMark: test.passMark,
    knownLimits: test.knownLimits,
    framework: 2,
  };
}

/** A starting point for the entry form: the settings of the app's own registered test for a method. */
export const SIGNAL_TEMPLATE: SignalTest = {
  hypothesis: 'When leveraged-fund positioning in a currency future is in the top or bottom 5% of the past three years, it comes back within 6 weeks more often than after any week.',
  method: 'cftc_crowding',
  params: { lookbackWeeks: 156, minLookbackWeeks: 52, highPct: 95, lowPct: 5, windowWeeks: 6, unwindPts: 3, minGapWeeks: 8 },
  sample: { from: '2007-06' },
  passMark: { minCases: 30, minLiftPts: 10, maxPValue: 0.05, minSeriesShare: 0.5, minYears: 8 },
  knownLimits: ['An unwind is measured in positioning, not in the exchange rate.'],
};

// ---------------------------------------------------------------- the record of Quest test verdicts

export type QuestVerdictStatus = 'passed' | 'failed' | 'too_few_cases';

export interface QuestTestVerdict {
  questId: string;
  questVersion: number;
  login: string;
  /** The entry's number (its file is quests/entries/<questId>/<login>.<n>.json). */
  n: number;
  /** SHA-256 of the entry file that was run. */
  entryHash: string;
  /** The id the test runs under (questTestId); version = n. */
  id: string;
  version: number;
  method: BacktestMethod;
  registeredOn: string;
  maxPValue: number;
  ranAt: string;
  by: string;
  verdict: QuestVerdictStatus;
  /** The method 2 p the verdict was judged on. */
  p?: number;
  summary: string;
}

export interface QuestTestRecord {
  note: string;
  runs: Array<{ questId: string; questVersion: number; ranAt: string; by: string; where: string }>;
  verdicts: QuestTestVerdict[];
}

export const TEST_RECORD_NOTE =
  'Verdicts of the tests entered to Signal Quests, written only by `npm run quests:run-tests` from a real run, once per Quest after entries close. Never edit a line by hand: a failed test stays failed. Every verdict here is counted in the Holm correction in docs/TRACK_RECORD.md.';

export const emptyTestRecord = (): QuestTestRecord => ({ note: TEST_RECORD_NOTE, runs: [], verdicts: [] });

/** Problems with the record (a hand-edited or broken file). */
export function testRecordProblems(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return ['not a JSON object'];
  const r = raw as Partial<QuestTestRecord>;
  const out: string[] = [];
  if (!Array.isArray(r.runs)) out.push('runs: a list');
  if (!Array.isArray(r.verdicts)) return [...out, 'verdicts: a list'];
  const seen = new Set<string>();
  r.verdicts.forEach((v, i) => {
    const k = `${v?.id} v${v?.version}`;
    if (!v || typeof v.id !== 'string' || !Number.isInteger(v.version) || !['passed', 'failed', 'too_few_cases'].includes(v.verdict as string)) out.push(`verdicts[${i}]: not a verdict`);
    else if (seen.has(k)) out.push(`verdicts[${i}]: ${k} is recorded twice; a test is run once`);
    seen.add(k);
    if (v && v.p !== undefined && !(typeof v.p === 'number' && v.p >= 0 && v.p <= 1)) out.push(`verdicts[${i}].p: a number from 0 to 1`);
  });
  return out;
}

/** The status of an entry's test in plain words, with the Holm reading when there is one. */
export function describeTestVerdict(v: Pick<QuestTestVerdict, 'verdict' | 'p' | 'summary'>, holm?: { adjusted?: number; holds?: boolean }): { label: string; text: string } {
  if (v.verdict === 'too_few_cases') return { label: 'Too few cases', text: `There was not enough history to judge it. ${v.summary}` };
  if (v.verdict === 'failed') return { label: 'Failed', text: `It did not beat the simple base rate by its own pass mark. ${v.summary}` };
  if (holm?.holds) return { label: 'Validated', text: `It passed and still holds after the correction for every test on record (Holm p ${holm.adjusted}). ${v.summary}` };
  return { label: 'Provisional pass', text: `It passed its own pass mark, but not by enough to hold once every test on record is counted${holm?.adjusted !== undefined ? ` (Holm p ${holm.adjusted})` : ''}. ${v.summary}` };
}
