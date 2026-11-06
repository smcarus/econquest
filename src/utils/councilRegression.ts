/**
 * Council regression set (docs/validation/council-regression/cases.json): fixed agent answers and
 * the reading a good summary must give. Each run goes through the same summary step as Council
 * chat (temperature 0, fixed seed, number checks) and is saved as an answer snapshot, so a failing
 * case can be opened and re-run.
 *
 * `npm run council:regress` runs it against the AI model set in the app (Sam's Ollama referee on
 * the Mac). CI runs it against a stand-in model: that checks the harness reports pass and fail
 * honestly, not the quality of a real model's reading.
 *
 * Browser-safe: types and the check. The server runs the cases.
 */
import type { AgentAnswer, SynthesisResult } from './askCouncil';

export interface RegressionExpect {
  /** Pattern (case-insensitive) the headline must match. */
  headline?: string;
  /** Names that must appear somewhere in the answer. */
  mention?: string[];
  /** Pattern (case-insensitive) that must not appear anywhere in the answer. */
  forbid?: string;
  /** Pattern the gaps must match (the answer must say what is missing). */
  gapsMention?: string;
  /** At most this many sentences removed by the number and stance checks. */
  maxRemoved?: number;
}

export interface RegressionCase {
  id: string;
  question: string;
  answers: AgentAnswer[];
  expect: RegressionExpect;
}

export interface RegressionSet {
  about?: string;
  version: number;
  cases: RegressionCase[];
}

export interface RegressionCaseResult {
  id: string;
  question: string;
  pass: boolean;
  /** Why it failed, in plain words; empty when it passed. */
  failures: string[];
  headline: string;
  removed: number;
  snapshotId?: string;
}

export interface RegressionReport {
  ranAt: string;
  setVersion: number;
  /** SHA-256 of the case file, so a report names exactly which set it ran. */
  setHash: string;
  model: string | null;
  passed: number;
  total: number;
  results: RegressionCaseResult[];
}

export function parseRegressionSet(raw: unknown): RegressionSet {
  const o = raw as Partial<RegressionSet> | null;
  const cases = (Array.isArray(o?.cases) ? o!.cases : []).filter(
    (c): c is RegressionCase => Boolean(c && typeof c.id === 'string' && typeof c.question === 'string' && Array.isArray(c.answers) && c.expect && typeof c.expect === 'object')
  );
  return { ...(o?.about ? { about: o.about } : {}), version: Number(o?.version) || 0, cases };
}

const re = (p: string) => new RegExp(p, 'i');

/** Checks one summary against what the case expects. */
export function checkRegressionCase(c: RegressionCase, out: SynthesisResult): RegressionCaseResult {
  const b = out.brief;
  const failures: string[] = [];
  const removed = (out.removed?.length ?? 0) + (out.contradicted?.length ?? 0);
  if (!b) {
    failures.push(`No answer: ${out.reason || 'no AI model answered'}`);
  } else {
    const all = [b.headline, ...b.points, ...b.disagreements, ...b.gaps].join('\n');
    const e = c.expect;
    if (e.headline && !re(e.headline).test(b.headline)) failures.push(`The headline does not give the expected reading (/${e.headline}/): "${b.headline}"`);
    for (const name of e.mention ?? []) if (!all.toLowerCase().includes(name.toLowerCase())) failures.push(`The answer does not mention ${name}.`);
    if (e.forbid) {
      const hit = all.match(re(e.forbid));
      if (hit) failures.push(`The answer says something it must not ("${hit[0]}").`);
    }
    if (e.gapsMention && !re(e.gapsMention).test(b.gaps.join('\n'))) failures.push('The answer does not say what is missing.');
    if (e.maxRemoved !== undefined && removed > e.maxRemoved) failures.push(`${removed} sentence(s) were removed by the checks (at most ${e.maxRemoved} allowed): the model wrote numbers or calls the agents did not give.`);
  }
  return { id: c.id, question: c.question, pass: failures.length === 0, failures, headline: b?.headline || '', removed, ...(out.snapshot ? { snapshotId: out.snapshot.id } : {}) };
}
