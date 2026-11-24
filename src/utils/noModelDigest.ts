/**
 * What the council chat shows when no AI model wrote a summary: the agents' own readings and their
 * key figures, in the answer itself (not three clicks down under Sources), and the parts of the
 * question nothing answered, with where in the app they can be worked out.
 *
 * Every line comes from the agents' documents (src/utils/askCouncil.ts), built by stated rules;
 * nothing here is new analysis. Browser-safe, pure.
 */
import type { AgentAnswer } from './askCouncil';

export interface DigestLine {
  agent: string;
  country: string;
  reading: string;
  /** Up to three of the finding's figures, "label value". */
  figures: string[];
}

export interface UnansweredPart {
  /** The words of the question that went unanswered. */
  said: string;
  /** Why, and where in the app it can be worked out. */
  where: string;
}

/** A one-line answer for one country, built from the agents' fixed calls by stated rules (no AI). */
export interface ShortAnswer {
  country: string;
  text: string;
}

export interface NoModelDigest {
  /** The short answer at the top: a yes/no where the question asks one and the rules give one. */
  short: ShortAnswer[];
  lines: DigestLine[];
  unanswered: UnansweredPart[];
  /** What the agents could not answer, in their own words. */
  gaps: string[];
}

const MAX_LINES = 6;
const MAX_SHORT = 3;

const CURVE = /\b(behind|ahead of) the curve\b/i;
const MONETARY = /central bank|monetary|policy rate|interest rates?|\brates?\b|\bhikes?\b|\bcuts?\b|\btight|\bloose|easing|tightening/i;
const FX_WORDS: Record<string, string> = {
  strong: 'the real exchange rate is strong for its history',
  'near average': 'the real exchange rate is near its 10-year average',
  weak: 'the real exchange rate is weak for its history',
};

const lowerFirst = (t: string) => (t ? t[0]!.toLowerCase() + t.slice(1) : t);
const firstSentence = (t: string) => (/^.*?[.!?](?=\s|$)/.exec(t)?.[0] ?? t).trim();

/**
 * The short answer: for a question about monetary policy, the Central Bank Watcher's call (tight,
 * neutral or loose) and how far the policy rate sits from a simple Taylor rule, with a plain "No" /
 * "Possibly" / "Not clearly" when the question asks whether a bank is behind the curve. For other
 * questions, each country's fixed calls (policy, real exchange rate) and its debt path in one line.
 * Only the agents' own calls and figures are used; nothing here is new analysis.
 */
export function shortAnswer(question: string, answers: AgentAnswer[]): ShortAnswer[] {
  const out: ShortAnswer[] = [];
  const cb = answers.find((a) => a.id === 'cb');
  const curve = CURVE.exec(question);
  if (cb && (curve || MONETARY.test(question))) {
    for (const f of [...cb.findings].sort((x, y) => y.weight - x.weight)) {
      if (out.length >= MAX_SHORT) break;
      const call = f.stance?.find((s) => s.dim === 'policy')?.call;
      if (!call) continue;
      const looks = /Policy looks [^.]*\./.exec(f.reading)?.[0] ?? `Policy looks ${call}.`;
      const gap = f.figures.find((g) => g.label === 'Policy rate against the rule')?.value;
      const n = gap ? Number.parseFloat(gap.replace(/[^\d.+-]/g, ' ').trim().split(/\s+/)[0] ?? '') : Number.NaN;
      const rule = Number.isFinite(n) ? ` The policy rate is ${Math.abs(n).toFixed(2)} pts ${n >= 0 ? 'above' : 'below'} the rate a simple Taylor rule gives.` : '';
      let lead = '';
      if (curve) {
        const ahead = curve[1]!.toLowerCase() !== 'behind';
        // Behind the curve: tight = No, loose = Possibly. Ahead of the curve: tight = Yes, loose = No.
        lead = call === 'neutral' ? 'Not clearly. ' : ahead ? (call === 'tight' ? 'Yes. ' : 'No. ') : call === 'tight' ? 'No. ' : 'Possibly. ';
      }
      out.push({ country: f.countryName, text: `${lead}${looks}${rule}` });
    }
    if (out.length) return out;
  }
  const order: string[] = [];
  const parts = new Map<string, { country: string; bits: string[] }>();
  const add = (iso3: string, country: string, bit: string) => {
    if (!parts.has(iso3)) {
      parts.set(iso3, { country, bits: [] });
      order.push(iso3);
    }
    parts.get(iso3)!.bits.push(bit);
  };
  for (const a of answers) {
    for (const f of a.findings) {
      for (const s of f.stance || []) {
        if (s.dim === 'policy') add(f.iso3, f.countryName, `monetary policy looks ${s.call}`);
        else if (s.dim === 'fx' && FX_WORDS[s.call]) add(f.iso3, f.countryName, FX_WORDS[s.call]!);
      }
      if (a.id === 'fiscal' && /^Government debt is/.test(f.reading)) add(f.iso3, f.countryName, lowerFirst(firstSentence(f.reading)).replace(/\.$/, ''));
    }
  }
  for (const iso3 of order.slice(0, MAX_SHORT)) {
    const p = parts.get(iso3)!;
    out.push({ country: p.country, text: `${p.bits.join('; ').replace(/^./, (c) => c.toUpperCase())}.` });
  }
  return out;
}
const MAX_FIGURES = 3;

// "a 200bp rise in rates", "rates rise 2 points", "higher interest rates", "a rate hike of 100 basis points"
const RATE_SHOCK =
  /(?:\b\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?)\b[^.?!]{0,40}?\b(?:rise|rises|increase|hike|jump|higher|up)\b[^.?!]{0,20}?\brates?\b|\b\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|(?:percentage )?points?|pts?)\b\s+(?:rise|rises|increase|hike|higher)\b(?:\s+in\s+(?:interest\s+)?rates?)?|\b(?:rise|rises|increase|hike|jump)\s+(?:in|of)\s+(?:interest\s+)?rates?(?:\s+(?:of|by)\s+\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|points?|pts?))?|\bhigher\s+(?:interest\s+)?rates?\b|\brates?\s+(?:rise|rising|go(?:es)? up|climb)\b(?:\s+(?:by\s+)?\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|points?|pts?))?)/i;
const ASKS_EFFECT = /\bwhat (?:would|will|happens|if)\b|\bwhat does\b|\bimpact of\b|\beffect of\b|\bhow (?:would|will|much)\b|\bif\b/i;

const CMD = String.raw`npm run [\w:.-]+(?:\s+--(?=\s))?(?:\s+(?:-{1,4}[\w-]+|daily|status|stop)(?:\s+\d{4})?)*`;
const NESTED = String.raw`\s*\((?:[^()]|\([^()]*\))*\)`;

/**
 * One "Missing for this question" line in plain words for the chat: the terminal commands the
 * agents name (useful in the manual, not in an answer) are taken out, and the text that pointed to
 * them says what is needed instead. The agents' documents under Sources keep the full text.
 */
export function plainGap(text: string): string {
  return text
    .replace(new RegExp(String.raw`;\s*${CMD}`, 'g'), '')
    .replace(new RegExp(String.raw`,?\s+or\s+(?:with\s+)?${CMD}(?:${NESTED})?`, 'g'), '')
    .replace(new RegExp(String.raw`:?\s*(?:Pull|Run|Get) (?:them|it) with ${CMD}(?:${NESTED})?\.?`, 'g'), ' (a one-off download; the user manual says how)')
    .replace(new RegExp(String.raw`(?::\s*|\s+with\s+|\s+using\s+|\s+)${CMD}(?:${NESTED})?`, 'g'), ' (see the user manual)')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([),.;])/g, '$1')
    .trim();
}

/** The digest for one answer; `whatIfShown` is true when the fiscal what-if card already answers part of it. */
export function noModelDigest(question: string, answers: AgentAnswer[], whatIfShown = false, namedCountry = false): NoModelDigest {
  const lines: DigestLine[] = [];
  for (const a of answers) {
    for (const f of [...a.findings].sort((x, y) => y.weight - x.weight)) {
      if (lines.length >= MAX_LINES) break;
      lines.push({ agent: a.name, country: f.countryName, reading: f.reading, figures: f.figures.slice(0, MAX_FIGURES).map((g) => `${g.label} ${g.value}`) });
    }
  }
  const gaps = [...new Set(answers.flatMap((a) => a.missing).map(plainGap))];
  const unanswered: UnansweredPart[] = [];
  const shock = RATE_SHOCK.exec(question);
  if (shock && ASKS_EFFECT.test(question) && !whatIfShown) {
    unanswered.push({
      said: shock[0].trim(),
      where:
        'No agent works out the effect of a rate change. Research > History & data > Debt sustainability runs a stated interest rate shock (the effective rate up to 2 points higher, phased in as debt rolls over) on the debt path; Research > Markets & signals shows the policy rate and its history.',
    });
  }
  if (!answers.some((a) => a.findings.length)) {
    unanswered.push({
      said: question.trim(),
      where: namedCountry
        ? "No agent found figures for this question: the country's sources have not answered yet. Research for that country shows what the app holds and why each figure is missing."
        : 'No agent found figures for this question. Try naming a country, or open Research for that country to see what the app holds.',
    });
  }
  return { short: shortAnswer(question, answers), lines, unanswered, gaps };
}
