/**
 * What happened after (plan step SC5): a result kept on the policy review for the one-page brief.
 * The server works the twin out again when you press "Keep for the policy brief" (the browser's
 * numbers are never trusted), and keeps the few figures the brief needs beside the steps. At most
 * five are kept; keeping the same change and figure again replaces the earlier one.
 *
 * The brief section is worded here in the brief's language from the same catalog as the card
 * (src/i18n/messages/synth.ts), so the card and the brief say the same thing. Browser-safe, pure.
 */
import type { EventKind, EventOrigin, PolicyEvent } from './policyEvents';
import { SYNTH_SOURCES, SYNTH_OUTCOMES, type SynthOutcome, type SynthResult } from './syntheticControl';
import { translate, type Lang } from '../i18n/lang';
import { SYNTH } from '../i18n/messages/synth';

export const MAX_KEPT_SYNTH = 5;

export interface KeptSynth {
  eventId: string;
  kind: EventKind;
  origin: EventOrigin;
  eventYear: number;
  /** As the event list words it in English; your own events keep your words. */
  eventLabel: string;
  parts?: Record<string, string | number>;
  outcome: SynthOutcome;
  asOf: string;
  methodVersion: string;
  /** Years after the change the sentence reads (3, or the last year there is). */
  k: number;
  actual: number;
  twin: number;
  gap: number;
  p: number;
  rank: number;
  runs: number;
  fitRatio: number | null;
  /** The largest parts of the twin, largest first (at most three). */
  weights: Array<{ name: string; weight: number }>;
  dominant: string | null;
  source: string;
  historyPulledAt?: string;
  keptAt: string;
}

export const OUTCOME_KEY = {
  cpi_imf: 'o_cpi_imf',
  gdp_growth: 'o_gdp_growth',
  debt_gdp: 'o_debt_gdp',
  primary_balance: 'o_primary_balance',
  current_account: 'o_current_account',
  reserves_months: 'o_reserves_months',
  currency_change: 'o_currency_change',
} as const satisfies Record<SynthOutcome, string>;

type Tr = (key: keyof typeof SYNTH.en, vars?: Record<string, string | number>) => string;
const trFor = (lang: Lang): Tr => (key, vars) => translate(SYNTH, lang, key, vars);

/** An event's words in the chosen language; your own events as you wrote them. */
export function synthEventLabel(e: Pick<PolicyEvent, 'kind' | 'label' | 'parts'>, tr: Tr): string {
  if (e.kind === 'own') return e.label;
  const parts = { ...(e.parts || {}) };
  if (e.kind === 'fiscal_rule' && typeof parts.rule === 'string') parts.rule = tr(`fr_${parts.rule}` as 'fr_er');
  return tr(`ev_${e.kind}` as 'ev_devaluation', parts);
}

const figureWord = (o: SynthOutcome, tr: Tr) => tr(OUTCOME_KEY[o]).replace(/ \(.*\)$/, '').toLowerCase();

/** The plain sentence: k years after, the figure against its twin, and the placebo p-value. */
export function synthSentence(x: { k: number; eventYear: number; outcome: SynthOutcome; gap: number; actual: number; twin: number; rank: number; runs: number; p: number }, tr: Tr): string {
  const dir = x.gap > 0 ? tr('above') : x.gap < 0 ? tr('below') : tr('same');
  return tr('sentence', { k: x.k, year: x.eventYear, figure: figureWord(x.outcome, tr), gap: Math.abs(x.gap).toFixed(2), dir, actual: x.actual.toFixed(2), twin: x.twin.toFixed(2), rank: x.rank, runs: x.runs, p: x.p.toFixed(2) });
}

/** The figures the brief needs from a worked-out twin; an error when there is nothing to keep. */
export function keptFrom(r: SynthResult, event: PolicyEvent, now: Date, historyPulledAt?: string): KeptSynth | { error: string } {
  if (r.missing) return { error: `Nothing to keep: the twin is Missing (${r.missing.reason}).` };
  if (!r.placebo) return { error: 'Nothing to keep: the placebo check did not run.' };
  const after = r.path.filter((p) => p.k >= 0);
  const at = after.find((p) => p.k === 3) ?? after[after.length - 1];
  if (!at) return { error: 'Nothing to keep: no years after the change.' };
  return {
    eventId: event.id,
    kind: event.kind,
    origin: event.origin,
    eventYear: event.year,
    eventLabel: event.label,
    ...(event.parts ? { parts: event.parts } : {}),
    outcome: r.outcome,
    asOf: r.asOf,
    methodVersion: r.methodVersion,
    k: at.k,
    actual: at.actual,
    twin: at.twin,
    gap: at.gap,
    p: r.placebo.p,
    rank: r.placebo.rank,
    runs: r.placebo.runs,
    fitRatio: r.fitRatio,
    weights: r.weights.slice(0, 3).map((w) => ({ name: w.name, weight: w.weight })),
    dominant: r.dominantDonor,
    source: SYNTH_SOURCES[r.outcome],
    ...(historyPulledAt ? { historyPulledAt } : {}),
    keptAt: now.toISOString(),
  };
}

/** Adds one result, replacing the same change and figure; the oldest goes when there are more than five. */
export function withKept(list: KeptSynth[] | undefined, k: KeptSynth): KeptSynth[] {
  const rest = (list || []).filter((x) => !(x.eventId === k.eventId && x.outcome === k.outcome));
  return [...rest, k].slice(-MAX_KEPT_SYNTH);
}

export function withoutKept(list: KeptSynth[] | undefined, eventId: string, outcome: string): KeptSynth[] {
  return (list || []).filter((x) => !(x.eventId === eventId && x.outcome === outcome));
}

export function isOutcome(v: unknown): v is SynthOutcome {
  return typeof v === 'string' && (SYNTH_OUTCOMES as readonly string[]).includes(v);
}

/**
 * The brief's section for the kept results, in the brief's language, or undefined when none are kept.
 * `validated` is true only once the method's pre-registered test has passed.
 */
export function synthBrief(list: KeptSynth[] | undefined, lang: Lang, validated: boolean): { heading: string; lines: string[] } | undefined {
  if (!list?.length) return undefined;
  const tr = trFor(lang);
  const lines: string[] = [];
  for (const x of list) {
    const twin = x.weights.map((w) => `${w.name} ${Math.round(w.weight * 100)}%`).join(', ');
    lines.push(tr('briefLine', { event: synthEventLabel({ kind: x.kind, label: x.eventLabel, parts: x.parts }, tr), sentence: synthSentence(x, tr), twin, source: x.source }));
  }
  if (!validated) lines.push(tr('briefNotValidated'));
  lines.push(tr('notAdvice'));
  return { heading: tr('briefHeading'), lines };
}
