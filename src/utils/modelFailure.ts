/**
 * Why an AI model step did not answer, in plain words, so the chat can say more than
 * "no model answered". Also the time a step may wait for a model on this computer.
 */

/** Steps that summarise a whole conversation: a local model needs longer than the quick steps. */
export const LONG_CHAT_STEPS = new Set(['COUNCIL_SYNTHESIS', 'COUNCIL_DEBATE']);

/** A local model (Ollama on a laptop) can take a minute or more to read the agents' answers. */
export const LONG_CHAT_STEP_MIN_MS = 120_000;

/**
 * How long one local-model call may take. The user's timeout from Menu > AI model wins when it is
 * longer; the summary and debate steps never wait less than LONG_CHAT_STEP_MIN_MS.
 */
export function localStepTimeoutMs(stepName: string, userTimeoutSec: unknown, isDeepStep: boolean): number {
  const user = typeof userTimeoutSec === 'number' && userTimeoutSec >= 5 && userTimeoutSec <= 600 ? Math.round(userTimeoutSec * 1000) : null;
  const base = user ?? (isDeepStep ? 25_000 : 16_000);
  return LONG_CHAT_STEPS.has(stepName) ? Math.max(base, LONG_CHAT_STEP_MIN_MS) : base;
}

export interface ModelAttempt {
  /** e.g. "Ollama qwen2.5:7b at http://localhost:11434" or "Gemini". */
  where: string;
  error?: unknown;
  timeoutMs?: number;
  /** The model answered, but not with a JSON object. */
  notJson?: boolean;
}

/** One short sentence for one failed attempt. */
export function describeAttempt(a: ModelAttempt): string {
  if (a.notJson) return `${a.where} answered, but not in the format the app needs`;
  const e = a.error as { name?: string; message?: string; cause?: { code?: string } } | undefined;
  const msg = String(e?.message || e || '').trim();
  const code = e?.cause?.code || '';
  if (e?.name === 'AbortError' || /aborted/i.test(msg)) {
    return `${a.where} did not answer within ${Math.round((a.timeoutMs || 0) / 1000)} s`;
  }
  if (code === 'ECONNREFUSED' || /ECONNREFUSED/.test(msg)) return `${a.where} is not running`;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || /ENOTFOUND|EAI_AGAIN/.test(msg)) return `${a.where} could not be found`;
  if (/HTTP 404/.test(msg)) return `${a.where} answered HTTP 404 (is that model pulled? run "ollama pull" for it)`;
  const http = msg.match(/HTTP (\d{3})/);
  if (http) return `${a.where} answered HTTP ${http[1]}`;
  if (/fetch failed/i.test(msg)) return `${a.where} could not be reached`;
  return `${a.where} failed (${msg.slice(0, 160) || 'unknown error'})`;
}

/**
 * The reason for the chat. Local-model "could not be found" lines for the Docker fallback addresses
 * are dropped when another attempt says more, so a laptop user sees the line that matters.
 */
export function describeFailures(attempts: ModelAttempt[], geminiKeySet: boolean): string {
  const lines = attempts.map(describeAttempt);
  const useful = lines.filter((l) => !/(host\.docker\.internal|ollama:11434).*could not be (found|reached)/.test(l));
  const shown = useful.length ? useful : lines;
  if (!geminiKeySet) shown.push('no Gemini key is set');
  return shown.length ? shown.join('; ') : 'no model is set up';
}
