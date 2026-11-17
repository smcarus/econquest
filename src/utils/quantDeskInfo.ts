/**
 * The Quant desk's name, remit and the words that bring it in (src/utils/quantDesk.ts holds the
 * desk itself, run on the server). Kept apart so the start-up bundle carries only these lines.
 *
 * The Quant desk reads an outside research-tools server you run (src/server/researchTools.ts). It is
 * asked only when that server is set up, and only from Council chat.
 */
export const QUANT_AGENT_NAME = 'Quant desk';

export const QUANT_DESK_COVERS =
  'figures from an outside research-tools server you run (volatility and price forecasts, backtests, return statistics, nowcasts, option chains), each with its link, its data-through date and the label from the reply; hypothetical results on past data, not a recommendation';

/**
 * Words that bring the Quant desk in. "Option" counts only in the markets sense (an option price,
 * chain or premium, a call or put option, implied volatility), so "policy options" does not.
 */
export const QUANT_TOPIC =
  /back-?test\w*|\bforecast\w*|volatil\w*|\bvol\b|\bgarch\b|\bnowcast\w*|\boptions? (?:price|prices|pricing|chain|chains|premium|premiums|greeks)\b|\b(?:call|put) options?\b|implied vol\w*|drawdowns?|\bsharpe\b/i;

/** Why the Quant desk was asked, or null: the AI model's pick, the words in the question, or carried from the last question. */
export function quantReason(
  question: string,
  choice: { agents: Array<{ id: string; why: string }> | null } | null,
  previous?: { quant?: { why: string } },
  namesOtherTopic = false
): string | null {
  const ai = (choice?.agents || []).find((a) => String(a?.id || '').trim().toLowerCase() === 'quant');
  if (ai) {
    const why = String(ai.why || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim().slice(0, 200);
    return why ? `the AI model judged: ${why}` : 'the AI model picked it';
  }
  const m = question.match(QUANT_TOPIC);
  if (m) return `the question mentions "${m[0].trim()}"`;
  if (previous?.quant && !namesOtherTopic) return `carried over from your last question (${previous.quant.why})`;
  return null;
}
