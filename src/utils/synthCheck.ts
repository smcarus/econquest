/**
 * SC3: the pre-registered false-alarm test of "What happened after" (synthetic control,
 * src/utils/syntheticControl.ts), spec in docs/validation/models/synthetic_control.json and run by
 * `npm run synth:validate` on a computer with the saved yearly histories (data/history/).
 *
 * Pseudo-events: country-years drawn with a fixed seed among those with no event found by the rules
 * (src/utils/policyEvents.ts) in that year or the year before. Nothing happened there by the rules,
 * so a method with the right size finds an effect (placebo p-value at or below 0.10) in about 10%
 * of them. The test passes when that rate lies in the registered range for every outcome.
 * Power (reported, not a pass condition): the same draws with a made-up jump of one standard
 * deviation (of the country's own years before) added from the change year on.
 *
 * Pure and browser-safe; deterministic for a given seed and histories.
 */
import { MIN_PRE_YEARS, POST_YEARS, PRE_YEARS, syntheticControl, outcomeYears, type SynthHistory, type SynthOutcome } from './syntheticControl';
import { ruleEvents } from './policyEvents';

export interface SynthCheckSpec {
  id: string;
  version: number;
  registeredOn: string;
  registeredBy: string;
  hypothesis: string;
  method: string;
  params: { seed: number; perOutcome: number; outcomes: SynthOutcome[]; fromYear: number; alpha: number; jumpSd: number; maxDrawsPerOutcome: number };
  passMark: { minFalseAlarm: number; maxFalseAlarm: number; minRunsPerOutcome: number };
  knownLimits: string[];
}

export interface SynthOutcomeResult {
  outcome: SynthOutcome;
  runs: number;
  draws: number;
  missing: Record<string, number>;
  falseAlarms: number;
  falseAlarmRate: number | null;
  detected: number;
  powerRuns: number;
  power: number | null;
  pass: boolean;
  reason?: string;
}

export interface SynthCheckResult {
  verdict: 'passed' | 'failed' | 'not_run';
  reason?: string;
  outcomes: SynthOutcomeResult[];
  countries: number;
  lastYear: number;
}

/** Mulberry32: a small seeded generator, so the same seed gives the same draws everywhere. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run the registered test on the saved histories, as of a day. */
export function runSynthCheck(spec: SynthCheckSpec, histories: SynthHistory[], asOf: string): SynthCheckResult {
  const lastYear = Number(asOf.slice(0, 4));
  const base = { outcomes: [] as SynthOutcomeResult[], countries: histories.length, lastYear };
  if (histories.length < 20) return { ...base, verdict: 'not_run', reason: `only ${histories.length} saved country histories in data/history/; run the daily download first` };
  const busy = new Set(ruleEvents(histories, lastYear).flatMap((e) => [`${e.iso3}:${e.year}`, `${e.iso3}:${e.year + 1}`]));
  const { seed, perOutcome, outcomes, fromYear, alpha, jumpSd, maxDrawsPerOutcome } = spec.params;
  const results: SynthOutcomeResult[] = [];
  outcomes.forEach((outcome, oi) => {
    const rnd = seeded(seed + oi);
    // Candidate country-years: the outcome in every year needed, no rule event in the year or the year before.
    const candidates: Array<{ h: SynthHistory; year: number }> = [];
    for (const h of [...histories].sort((a, b) => (a.iso3 < b.iso3 ? -1 : 1))) {
      const ys = outcomeYears(h, outcome, lastYear);
      for (let y = fromYear; y + POST_YEARS < lastYear; y++) {
        if (busy.has(`${h.iso3}:${y}`)) continue;
        let pre = 0;
        for (let k = y - PRE_YEARS; k < y; k++) if (ys.has(k)) pre++;
        if (pre >= MIN_PRE_YEARS && ys.has(y)) candidates.push({ h, year: y });
      }
    }
    const r: SynthOutcomeResult = { outcome, runs: 0, draws: 0, missing: {}, falseAlarms: 0, falseAlarmRate: null, detected: 0, powerRuns: 0, power: null, pass: false };
    const used = new Set<number>();
    while (r.runs < perOutcome && r.draws < maxDrawsPerOutcome && used.size < candidates.length) {
      const i = Math.floor(rnd() * candidates.length);
      if (used.has(i)) continue;
      used.add(i);
      r.draws++;
      const { h, year } = candidates[i];
      const res = syntheticControl({ iso3: h.iso3, eventYear: year, asOf, outcome, histories });
      if (res.missing) {
        r.missing[res.missing.reason] = (r.missing[res.missing.reason] || 0) + 1;
        continue;
      }
      r.runs++;
      if ((res.placebo?.p ?? 1) <= alpha) r.falseAlarms++;
      // Power: the same country with a made-up jump from the change year on.
      const pre = res.path.filter((p) => p.k < 0).map((p) => p.actual);
      const m = pre.reduce((s, v) => s + v, 0) / pre.length;
      const sd = Math.sqrt(pre.reduce((s, v) => s + (v - m) ** 2, 0) / pre.length);
      if (sd > 0) {
        const id = outcome === 'currency_change' ? null : outcome;
        if (id) {
          const pts = h.series[id]?.points || [];
          const bumped: SynthHistory = { ...h, series: { ...h.series, [id]: { points: pts.map((p) => (Number(p.date.slice(0, 4)) >= year ? { ...p, value: p.value + jumpSd * sd } : p)) } } };
          const pw = syntheticControl({ iso3: h.iso3, eventYear: year, asOf, outcome, histories: histories.map((x) => (x.iso3 === h.iso3 ? bumped : x)) });
          if (!pw.missing) {
            r.powerRuns++;
            if ((pw.placebo?.p ?? 1) <= alpha) r.detected++;
          }
        }
      }
    }
    r.falseAlarmRate = r.runs ? Number((r.falseAlarms / r.runs).toFixed(4)) : null;
    r.power = r.powerRuns ? Number((r.detected / r.powerRuns).toFixed(4)) : null;
    if (r.runs < spec.passMark.minRunsPerOutcome) r.reason = `only ${r.runs} runs could be made (${spec.passMark.minRunsPerOutcome} needed)`;
    else if (r.falseAlarmRate! < spec.passMark.minFalseAlarm || r.falseAlarmRate! > spec.passMark.maxFalseAlarm) r.reason = `false-alarm rate ${(r.falseAlarmRate! * 100).toFixed(1)}% outside ${spec.passMark.minFalseAlarm * 100}% to ${spec.passMark.maxFalseAlarm * 100}%`;
    r.pass = !r.reason;
    results.push(r);
  });
  const tooFew = results.find((r) => r.runs < spec.passMark.minRunsPerOutcome);
  if (tooFew) return { ...base, outcomes: results, verdict: 'not_run', reason: `${tooFew.outcome}: ${tooFew.reason}` };
  return { ...base, outcomes: results, verdict: results.every((r) => r.pass) ? 'passed' : 'failed' };
}

export function synthCheckSummary(r: SynthCheckResult): string {
  const lines = [`What happened after (synthetic control), false-alarm test: ${r.verdict.toUpperCase()}${r.reason ? ` (${r.reason})` : ''}. ${r.countries} countries, years before ${r.lastYear}.`];
  for (const o of r.outcomes) {
    lines.push(
      `  ${o.outcome}: ${o.runs} runs from ${o.draws} draws; false alarms ${o.falseAlarms} (${o.falseAlarmRate === null ? 'n/a' : `${(o.falseAlarmRate * 100).toFixed(1)}%`}); power ${o.power === null ? 'n/a' : `${(o.power * 100).toFixed(1)}%`} of ${o.powerRuns}; Missing ${JSON.stringify(o.missing)}${o.reason ? `; ${o.reason}` : ''}`,
    );
  }
  return lines.join('\n');
}
