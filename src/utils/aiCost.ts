/**
 * What an AI step may cost, for the data API's ask:council limit (max_cost_usd). The app has no
 * price list of its own: a model on this computer (Ollama, or an OpenAI-compatible server on
 * localhost) costs nothing, and a cloud model is priced only from the prices you set in .env:
 *
 *   AI_PRICE_INPUT_PER_MTOK   US dollars per million input tokens
 *   AI_PRICE_OUTPUT_PER_MTOK  US dollars per million output tokens
 *
 * Tokens are estimated as characters / 4, and each step's answer at its longest allowance, so the
 * figure is an upper estimate, not the provider's bill. With no prices set, a call that could go to
 * a cloud model has no known cost: the API then refuses any request that sets a limit.
 */

export interface AiPrices {
  inputPerMTok: number;
  outputPerMTok: number;
}

/** Longest answer each step is counted at, in tokens. */
export const OUTPUT_ALLOWANCE: Record<'choose' | 'synthesis', number> = { choose: 400, synthesis: 2000 };

export function pricesFromEnv(env: Record<string, string | undefined>): AiPrices | null {
  const i = Number(env.AI_PRICE_INPUT_PER_MTOK);
  const o = Number(env.AI_PRICE_OUTPUT_PER_MTOK);
  const ok = (v: number, raw: string | undefined) => raw !== undefined && raw.trim() !== '' && Number.isFinite(v) && v >= 0;
  return ok(i, env.AI_PRICE_INPUT_PER_MTOK) && ok(o, env.AI_PRICE_OUTPUT_PER_MTOK) ? { inputPerMTok: i, outputPerMTok: o } : null;
}

const LOCAL_HOST = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\]|host\.docker\.internal|ollama)(:\d+)?(\/|$)/i;

/** True when an address is on this computer (or the bundled Docker service). */
export function isLocalAddress(url: string | undefined): boolean {
  return LOCAL_HOST.test(String(url || '').trim());
}

/**
 * Whether a step could reach a cloud model: an OpenAI-compatible server away from this computer,
 * or Google Gemini, which the app also tries when the chosen model does not answer and a key is set.
 */
export function mayUseCloud(runtimeConfig: { providerMode?: string; openAiBaseUrl?: string } | undefined, env: Record<string, string | undefined>): boolean {
  const mode = String(runtimeConfig?.providerMode || 'gemini');
  const geminiKey = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  if (geminiKey) return true;
  if (mode === 'openai_compatible') return !isLocalAddress(runtimeConfig?.openAiBaseUrl || env.OPENAI_COMPATIBLE_BASE_URL || 'http://localhost:8000/v1');
  return false;
}

export const estimateTokens = (chars: number) => Math.ceil(Math.max(0, chars) / 4);

/** Upper estimate of one step in US dollars: 0 on this computer, null when a cloud call has no price set. */
export function stepCost(promptChars: number, outputTokens: number, cloud: boolean, prices: AiPrices | null): number | null {
  if (!cloud) return 0;
  if (!prices) return null;
  return (estimateTokens(promptChars) * prices.inputPerMTok + outputTokens * prices.outputPerMTok) / 1e6;
}

/** What a step that ran cost: nothing when a model on this computer answered, or none did. */
export function spentOn(step: { providerUsed?: string; usedFallback: boolean }, openAiLocal: boolean, promptChars: number, outputChars: number, prices: AiPrices | null): number | null {
  const p = step.providerUsed || '';
  if (step.usedFallback || !p || /^Local Ollama/.test(p)) return 0;
  if (/^OpenAI-Compatible/.test(p) && openAiLocal) return 0;
  if (!/Gemini|^OpenAI-Compatible/.test(p)) return 0;
  if (!prices) return null;
  return (estimateTokens(promptChars) * prices.inputPerMTok + estimateTokens(outputChars) * prices.outputPerMTok) / 1e6;
}

/** Sum where an unknown part makes the whole unknown. */
export function addCost(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b;
}

export const roundUsd = (v: number | null) => (v === null ? null : Math.round(v * 1e6) / 1e6);
