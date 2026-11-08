/**
 * The referees (Sam, 2026-11-05): the steps that judge and sum up the agents run on the large
 * model set under Menu > Settings > AI model ("Referee model"), never on the small fast one:
 *   - the Supreme Council's final step (full council),
 *   - the Council chat summary and explanations,
 *   - the agent debate,
 *   - the Policy review Options step, which ranks options (judging; Sam's rule 2026-11-06: judging
 *     steps run on the referee model, never 8B).
 * Picking agents and the desk agents stay on the fast model. A referee model of 8B or less is
 * flagged in Settings and under each answer, so a small model never referees unnoticed.
 *
 * Small referee (Sam, 2026-11-08, plan item L1): a mid-size referee such as a 14B model needs about
 * half the memory of the 32B default, so the council can run on smaller computers. It is opt-in:
 * Menu > Settings > AI model > "Allow a 14B referee" (off by default). With the switch off, a
 * mid-size referee setting is replaced by the 32B default; with it on, every answer it judges
 * carries a "small referee" note. 30B and larger count as full referees (gemma4:31b, qwen3:30b).
 *
 * Browser-safe.
 */

/** AI_MODEL_TEST_REFEREE is Settings > AI model > Test, second call: it goes through the referee model the same way. */
export const REFEREE_STEPS = new Set(['STAGE_3_SUPREME_COUNCIL', 'COUNCIL_SYNTHESIS', 'COUNCIL_DEBATE', 'REVIEW_OPTIONS', 'AI_MODEL_TEST_REFEREE']);

export const isRefereeStep = (stepName: string) => REFEREE_STEPS.has(stepName);

/** Billions of parameters from an Ollama tag ("gemma4:31b" -> 31, "qwen3:30b-a3b" -> 30); null when the tag does not say. */
export function modelSizeB(tag: string | undefined): number | null {
  const m = /[:\-_](\d+(?:\.\d+)?)b\b/i.exec(String(tag || ''));
  return m ? Number(m[1]) : null;
}

/** Referees should be larger than the 7-8B models the agents run on. */
export const SMALL_REFEREE_MAX_B = 8;

export function isSmallModel(tag: string | undefined): boolean {
  const b = modelSizeB(tag);
  return b !== null && b <= SMALL_REFEREE_MAX_B;
}

/** The largest downloaded model, offered when the referee model is small. */
export function largestModel(installed: string[]): string | undefined {
  return [...installed].filter((t) => (modelSizeB(t) ?? 0) > SMALL_REFEREE_MAX_B).sort((a, b) => (modelSizeB(b) ?? 0) - (modelSizeB(a) ?? 0))[0];
}

/** A referee of this size or larger is a full referee. */
export const FULL_REFEREE_MIN_B = 30;

export type RefereeTier = 'small' | 'mid' | 'full';

/** small: 8B or less (flagged); mid: 9B to 29B (needs the opt-in, labelled); full: 30B or more, or a tag that does not say its size. */
export function refereeTier(tag: string | undefined): RefereeTier {
  const b = modelSizeB(tag);
  if (b === null) return 'full';
  if (b <= SMALL_REFEREE_MAX_B) return 'small';
  return b < FULL_REFEREE_MIN_B ? 'mid' : 'full';
}

export const isMidModel = (tag: string | undefined) => refereeTier(tag) === 'mid';

/** The referee model actually used: a mid-size model only when the opt-in is on, else the 32B default. */
export function allowedRefereeModel(tag: string, allowSmallReferee: boolean | undefined): string {
  return isMidModel(tag) && !allowSmallReferee ? DEFAULT_REFEREE_MODEL : tag;
}

/** The note under an answer when its referee ran on a small or mid-size model; null otherwise. Reads the provider text ("Local Ollama (qwen2.5:7b · Referee)"). */
export function smallRefereeNote(provider: string | undefined): string | null {
  const tag = /\(([^\s·)]+)/.exec(provider || '')?.[1];
  if (!tag) return null;
  const tier = refereeTier(tag);
  if (tier === 'small') return `The referee ran on ${tag}, a small model. Set your largest model as the Referee model under Menu > Settings > AI model.`;
  if (tier === 'mid') return `Small referee: ${tag} judged this answer. It needs less memory than the 32B default but its judgements are less reliable. Change it under Menu > Settings > AI model.`;
  return null;
}

/** Sam's referee (2026-11-05): Qwen 2.5, 32B. Pull it once with "ollama pull qwen2.5:32b". */
export const DEFAULT_REFEREE_MODEL = 'qwen2.5:32b';
/** The old default, an 8B model; a setting still holding it was never chosen, so it moves to the new default. */
export const OLD_DEFAULT_REFEREE_MODEL = 'deepseek-r1:8b';

export function refereeModelOrDefault(tag: string | undefined | null): string | undefined {
  const t = String(tag || '').trim();
  if (!t) return undefined;
  return t === OLD_DEFAULT_REFEREE_MODEL ? DEFAULT_REFEREE_MODEL : t;
}
