/**
 * Watch alerts from policy reviews (parked idea PC1, pulled forward by Sam on 13 November 2026): the
 * memo of a policy review names figures to watch, each with an optional trigger in the user's own
 * words ("above 8", "target 4", "early warning if it rises"). This reads each trigger, checks it
 * against the latest saved pull for the review's country, and says which have been crossed, so the
 * start page can say so before the review date comes round.
 *
 * Only these wordings are read (and the same in Spanish, French and Portuguese): "above X" / "over X" /
 * "more than X" / "> X", "below X" / "under X" / "less than X" / "< X", "target X" (met when the
 * figure reaches X in the goal's direction), and "rises" / "falls" (against the figure the review
 * started from). Anything else says the app cannot
 * read it rather than guessing. A trigger is never invented: an item without one is not checked.
 *
 * Browser-safe and pure: the server passes the review's frame, diagnosis and memo, and a diagnosis
 * built from the latest saved pull.
 */
import type { ReviewFrame } from './policyReview';
import type { Diagnosis, DiagnosisFigure } from './reviewDiagnosis';
import type { MemoStep } from './reviewMemo';

export type TriggerKind = 'above' | 'below' | 'target' | 'rises' | 'falls';

export interface Trigger {
  kind: TriggerKind;
  value?: number;
}

export type WatchStatus = 'crossed' | 'not_crossed' | 'missing' | 'cannot_read' | 'no_match' | 'no_pull';

export interface ReviewWatchItem {
  indicator: string;
  trigger: string;
  status: WatchStatus;
  parsed?: Trigger;
  ref?: number;
  label?: string;
  unit?: string;
  /** The figure the review started from. */
  then?: number | null;
  now?: number | null;
  nowPeriod?: string;
}

export interface ReviewWatch {
  reviewDate: string;
  /** Day of the latest saved pull used, when there is one. */
  pullDate?: string;
  items: ReviewWatchItem[];
}

const NUM = '(-?\\d+(?:[.,]\\d+)?)';
// English first, then the Spanish, French and Portuguese wordings a user of those languages would type.
const ABOVE_WORDS = ['above', 'over', 'exceeds?', 'more than', 'higher than', 'greater than', 'por encima de', 'más de', 'mayor que', 'au-dessus de', 'plus de', 'supérieure? à', 'acima de', 'mais de', 'maior que', '>=?'];
const BELOW_WORDS = ['below', 'under', 'less than', 'lower than', 'por debajo de', 'menos de', 'menor que', 'en dessous de', 'moins de', 'inférieure? à', 'abaixo de', '<=?'];
const TARGET_WORDS = ['target(?: of)?', 'meta(?: de)?', 'objetivo(?: de)?', 'cible(?: de)?', 'objectif(?: de)?', 'alvo(?: de)?'];
const RISE_WORDS = ['rises?', 'rising', 'increases?', 'goes up', 'sube', 'aumenta', 'monte', 'augmente', 'hausse', 'sobe'];
const FALL_WORDS = ['falls?', 'falling', 'drops?', 'decreases?', 'goes down', 'baja', 'cae', 'disminuye', 'baisse', 'diminue', 'cai', 'desce'];
const numAfter = (words: string[]) => new RegExp(`(?:^|[^a-zà-ÿ])(?:${words.join('|')})\\s*${NUM}`);
const word = (words: string[]) => new RegExp(`(?:^|[^a-zà-ÿ])(?:${words.join('|')})(?:$|[^a-zà-ÿ])`);
const ABOVE = numAfter(ABOVE_WORDS);
const BELOW = numAfter(BELOW_WORDS);
const TARGET = numAfter(TARGET_WORDS);
const RISES = word(RISE_WORDS);
const FALLS = word(FALL_WORDS);
const num = (s: string) => Number(s.replace(',', '.'));

/** The trigger in one of the wordings the app reads, or null. */
export function parseTrigger(text: string): Trigger | null {
  const t = text.toLowerCase().replace(/%/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  let m = TARGET.exec(t);
  if (m) return { kind: 'target', value: num(m[1]) };
  m = ABOVE.exec(t);
  if (m) return { kind: 'above', value: num(m[1]) };
  m = BELOW.exec(t);
  if (m) return { kind: 'below', value: num(m[1]) };
  if (RISES.test(t)) return { kind: 'rises' };
  if (FALLS.test(t)) return { kind: 'falls' };
  return null;
}

/** The diagnosis figure an indicator names: its [n] reference, else a label match. */
export function figureFor(indicator: string, d: Diagnosis): DiagnosisFigure | undefined {
  const ref = /\[(\d+)\]/.exec(indicator);
  if (ref) return d.figures.find((f) => f.ref === Number(ref[1]));
  const g = indicator.toLowerCase().trim();
  if (!g) return undefined;
  return d.figures.find((f) => {
    const l = f.label.toLowerCase().replace(/ \(.*\)$/, '');
    return l.includes(g) || g.includes(l);
  });
}

export function reviewWatch(frame: ReviewFrame, then: Diagnosis, memo: MemoStep, now: Diagnosis | null): ReviewWatch {
  const out: ReviewWatch = { reviewDate: memo.inputs.reviewDate, ...(now ? { pullDate: now.pullDate } : {}), items: [] };
  for (const w of memo.inputs.watch) {
    if (!w.trigger) continue;
    const base: ReviewWatchItem = { indicator: w.indicator, trigger: w.trigger, status: 'cannot_read' };
    const parsed = parseTrigger(w.trigger);
    // A target is met in the goal's direction; with a "stable" goal there is no side to cross.
    if (!parsed || (parsed.kind === 'target' && frame.goal.direction === 'stable')) {
      out.items.push(base);
      continue;
    }
    base.parsed = parsed;
    const fig = figureFor(w.indicator, then);
    if (!fig) {
      out.items.push({ ...base, status: 'no_match' });
      continue;
    }
    const item: ReviewWatchItem = { ...base, ref: fig.ref, label: fig.label, unit: fig.unit, then: fig.value };
    if (!now) {
      out.items.push({ ...item, status: 'no_pull' });
      continue;
    }
    const n = now.figures.find((f) => f.field === fig.field);
    const v = n?.value ?? null;
    if (v === null) {
      out.items.push({ ...item, now: null, status: 'missing' });
      continue;
    }
    let crossed: boolean | null = null;
    if (parsed.kind === 'above') crossed = v > parsed.value!;
    else if (parsed.kind === 'below') crossed = v < parsed.value!;
    else if (parsed.kind === 'target') crossed = frame.goal.direction === 'lower' ? v <= parsed.value! : v >= parsed.value!;
    else if (fig.value !== null) crossed = parsed.kind === 'rises' ? v > fig.value : v < fig.value;
    out.items.push({ ...item, now: v, nowPeriod: n!.period, status: crossed === null ? 'missing' : crossed ? 'crossed' : 'not_crossed' });
  }
  return out;
}
