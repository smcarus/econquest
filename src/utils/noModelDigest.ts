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

export interface NoModelDigest {
  lines: DigestLine[];
  unanswered: UnansweredPart[];
  /** What the agents could not answer, in their own words. */
  gaps: string[];
}

const MAX_LINES = 6;
const MAX_FIGURES = 3;

// "a 200bp rise in rates", "rates rise 2 points", "higher interest rates", "a rate hike of 100 basis points"
const RATE_SHOCK =
  /(?:\b\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?)\b[^.?!]{0,40}?\b(?:rise|rises|increase|hike|jump|higher|up)\b[^.?!]{0,20}?\brates?\b|\b\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|(?:percentage )?points?|pts?)\b\s+(?:rise|rises|increase|hike|higher)\b(?:\s+in\s+(?:interest\s+)?rates?)?|\b(?:rise|rises|increase|hike|jump)\s+(?:in|of)\s+(?:interest\s+)?rates?(?:\s+(?:of|by)\s+\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|points?|pts?))?|\bhigher\s+(?:interest\s+)?rates?\b|\brates?\s+(?:rise|rising|go(?:es)? up|climb)\b(?:\s+(?:by\s+)?\d+(?:\.\d+)?\s*(?:bp|bps|basis[- ]points?|points?|pts?))?)/i;
const ASKS_EFFECT = /\bwhat (?:would|will|happens|if)\b|\bwhat does\b|\bimpact of\b|\beffect of\b|\bhow (?:would|will|much)\b|\bif\b/i;

/** The digest for one answer; `whatIfShown` is true when the fiscal what-if card already answers part of it. */
export function noModelDigest(question: string, answers: AgentAnswer[], whatIfShown = false): NoModelDigest {
  const lines: DigestLine[] = [];
  for (const a of answers) {
    for (const f of [...a.findings].sort((x, y) => y.weight - x.weight)) {
      if (lines.length >= MAX_LINES) break;
      lines.push({ agent: a.name, country: f.countryName, reading: f.reading, figures: f.figures.slice(0, MAX_FIGURES).map((g) => `${g.label} ${g.value}`) });
    }
  }
  const gaps = [...new Set(answers.flatMap((a) => a.missing))];
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
    unanswered.push({ said: question.trim(), where: 'No agent found figures for this question. Try naming a country, or open Research for that country to see what the app holds.' });
  }
  return { lines, unanswered, gaps };
}
