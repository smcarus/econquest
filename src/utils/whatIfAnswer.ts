/**
 * The what-if answer (WI5, Sam 2026-11-17): when the Scenario Agent answered, the council's answer
 * follows a fixed order a policy reader can follow, from where things stand now to what would change
 * the answer:
 *
 *   1. Where things stand now    today's figures (the Scenario Agent's "Now:" figures and the other agents')
 *   2. The change                the shock as sized ("Shock:")
 *   3. First effects             the app's own calculations ("After the shock"), with their bands
 *   4. How it spreads            how the first effects carry to the rest of the economy, across agents
 *   5. What history shows        past episodes, cases elsewhere, record context
 *   6. What research finds       published studies, averages over many countries
 *   7. Trends now                where the other agents' figures point today
 *   8. What would change it      what in the figures would change the answer
 *
 * The model writes each section only from the figures that belong to it, and every sentence is
 * checked like any summary sentence (sentenceCheck): a number that does not trace to an agent's
 * figure removes it, and so does a sentence that contradicts an agent's call. A section with no
 * figures is never written by the model: it shows "Missing" and why. The three kinds of evidence are
 * kept apart in the prompt and on screen: app calculations (co-movement, not cause), published
 * averages (not estimates for this country) and past episodes (a description of the past).
 *
 * Browser-safe.
 */
import { CDS_HIDDEN } from './cdsHidden';
import { isDocFinding, sentenceCheck, type AgentAnswer, type AgentFigure, type CouncilBrief } from './askCouncil';
import type { Contradiction } from './stanceCheck';
import { isCitable, References, type Reference } from './citations';

export type WhatIfSectionId = 'start' | 'shock' | 'effects' | 'spread' | 'history' | 'research' | 'trends' | 'watch';

/** What kind of evidence a section holds, shown beside its title. */
export type WhatIfKind = 'data' | 'calc' | 'past' | 'study' | 'interp';

export const WHATIF_ORDER: WhatIfSectionId[] = ['start', 'shock', 'effects', 'spread', 'history', 'research', 'trends', 'watch'];

export const WHATIF_SECTIONS: Record<WhatIfSectionId, { label: string; kind: WhatIfKind; asks: string; max: number }> = {
  start: { label: 'Where things stand now', kind: 'data', asks: 'today\'s figures the change starts from, quoted as written with their dates', max: 3 },
  shock: { label: 'The change', kind: 'data', asks: 'the change as sized, and where its size came from (the question, or a level set against today\'s figure)', max: 2 },
  effects: { label: 'First effects', kind: 'calc', asks: 'what the app\'s calculations give after the change, each with its band where there is one; say they are app calculations on a stated change, and that the engine and local projections show co-movement, not cause', max: 4 },
  spread: { label: 'How it spreads', kind: 'interp', asks: 'how the first effects carry to the rest of the economy (prices, borrowing costs, the budget, trade, households and firms), connecting the Scenario Agent\'s figures with the other agents\' findings. Reason from the figures; add no new numbers', max: 4 },
  history: { label: 'What history shows', kind: 'past', asks: 'what happened in past episodes and in cases elsewhere, and how today\'s level compares with the record; say it describes the past, not a forecast', max: 3 },
  research: { label: 'What research finds', kind: 'study', asks: 'what the published studies found, naming the authors and year; say each is an average over many countries and years, not an estimate for this country, and compare it with the app\'s own figures in words', max: 3 },
  trends: { label: 'Trends now', kind: 'interp', asks: 'where the other agents\' figures point today (policy stance, the currency, the budget, markets, politics) and whether that adds to or softens the change', max: 3 },
  watch: { label: 'What would change the answer', kind: 'interp', asks: 'what in the figures would make the effect larger or smaller, or turn it around (a wide band, a missing channel, a stance that could shift)', max: 3 },
};

const SCENARIO_ID = 'scenario';

/** A what-if answer: the Scenario Agent came back with at least one finding. */
export function isWhatIfAnswer(answers: AgentAnswer[]): boolean {
  return answers.some((a) => a.id === SCENARIO_ID && a.findings.some((f) => !isDocFinding(f)));
}

/** Which section a Scenario Agent figure belongs to, by its label. */
export function sectionOfFigure(label: string): WhatIfSectionId | null {
  if (/^Now:/.test(label)) return 'start';
  if (/^Shock:/.test(label)) return 'shock';
  if (/^After the shock\b/.test(label) || /^Net .+ trade$/.test(label)) return 'effects';
  if (/^(Past episode|When it happened before|Record context)\b/.test(label)) return 'history';
  if (/^Research:/.test(label)) return 'research';
  return null;
}

const HISTORY_MISSING = /past episode|cases elsewhere|record|replay|, [a-z0-9 ]+ \d{4}:/i;

export interface WhatIfCoverage {
  section: WhatIfSectionId;
  /** The figures the section may use, as "Agent: label" lines for the prompt. */
  figures: string[];
  /** Why the section cannot be written; absent when it can. */
  missing?: string;
}

/** For each section: the figures it may use, or why it cannot be answered. */
export function whatIfCoverage(answers: AgentAnswer[]): WhatIfCoverage[] {
  const scen = answers.filter((a) => a.id === SCENARIO_ID);
  const others = answers.filter((a) => a.id !== SCENARIO_ID && a.findings.some((f) => !isDocFinding(f)));
  const by = new Map<WhatIfSectionId, string[]>();
  for (const a of scen)
    for (const f of a.findings)
      for (const g of f.figures) {
        const s = sectionOfFigure(g.label);
        if (s) by.set(s, [...(by.get(s) || []), `${f.countryName}: ${g.label}`]);
      }
  const otherFigs = others.flatMap((a) => a.findings.filter((f) => !isDocFinding(f)).map((f) => `${a.name} Agent, ${f.countryName}`));
  const scenMissing = scen.flatMap((a) => a.missing);
  const histMissing = scenMissing.filter((m) => HISTORY_MISSING.test(m));
  const calcMissing = scenMissing.filter((m) => !HISTORY_MISSING.test(m));
  const why = (xs: string[], fallback: string) => (xs.length ? xs.slice(0, 2).join('; ') : fallback);
  const effects = by.get('effects') || [];
  return WHATIF_ORDER.map((section): WhatIfCoverage => {
    switch (section) {
      case 'start': {
        const figs = [...(by.get('start') || []), ...otherFigs];
        return figs.length ? { section, figures: figs } : { section, figures: [], missing: 'no agent came back with today\'s figures' };
      }
      case 'shock': {
        const figs = by.get('shock') || [];
        return figs.length ? { section, figures: figs } : { section, figures: [], missing: why(calcMissing.filter((m) => /size|level|not on file|stated/i.test(m)), 'the question gave no size, so nothing was run') };
      }
      case 'effects':
        return effects.length ? { section, figures: effects } : { section, figures: [], missing: why(calcMissing, 'none of the app\'s calculations had their inputs on file') };
      case 'spread':
        return effects.length ? { section, figures: [...effects, ...otherFigs] } : { section, figures: [], missing: 'there are no calculated first effects to follow through the economy' };
      case 'history': {
        const figs = by.get('history') || [];
        return figs.length ? { section, figures: figs } : { section, figures: [], missing: why(histMissing, 'no past episode, case elsewhere or record figure for this change is on file') };
      }
      case 'research': {
        const figs = by.get('research') || [];
        return figs.length ? { section, figures: figs } : { section, figures: [], missing: 'no study in the app\'s research library covers this kind of change' };
      }
      case 'trends':
        return otherFigs.length ? { section, figures: otherFigs } : { section, figures: [], missing: 'no other agent came back with figures' };
      case 'watch': {
        const any = [...by.values()].some((v) => v.length) || otherFigs.length > 0;
        return any ? { section, figures: [] } : { section, figures: [], missing: 'no agent came back with figures' };
      }
    }
  });
}

export const WHATIF_INSTRUCTION = [
  'You are the synthesis agent of a sovereign research council: a senior economist answering a what-if question for a policy reader who may have no training in economics.',
  'You receive one standard document per agent. The Scenario Agent starts from today\'s figures, applies the stated change with the app\'s own tools and sets "now" beside "after the shock"; it also brings past episodes, cases elsewhere and published research. The other agents bring today\'s readings on policy, the budget, the currency, markets and politics.',
  'Answer in the order given: where things stand now, the change, first effects, how it spreads, what history shows, what research finds, trends now, and what would change the answer. Start from the "Now:" figures and carry the change through; do not just list figures.',
  'Keep three kinds of evidence apart and say which is which: the app\'s calculations on a stated change ("After the shock"; the scenario engine and local projections show co-movement, not cause; each has a 90% band you should name), published studies ("Research:"; an average over many countries and years, not an estimate for this country), and past episodes ("Past episode", "When it happened before", "Record context"; a description of the past, not a forecast).',
  'Connect the channels across agents: for example a higher policy rate against inflation, the currency, dollar debt and the budget; or an oil price rise through the trade balance, inflation and the policy rate.',
  'Use ONLY the figures in the documents. Every number you write must appear there, written as it appears. Describe sizes and comparisons in words (larger than, within the band of, well above); never calculate new numbers, forecast, or add outside facts, dates or events.',
  'Write a section only from the figures listed for it. If a section has none, leave it empty; the app says it is missing.',
  'Each finding states the agent\'s stance in fixed words (policy tight, neutral or loose; ' + (CDS_HIDDEN ? 'cheap, in line or rich against peers' : 'CDS cheap, in line or rich') + '; real exchange rate strong, near average or weak). Use those words; never describe a stance differently.',
  'Short sentences, one idea each, everyday words. The first time you use a technical term, say what it means in a few plain words in brackets. Where the figures allow, say what it means for prices in shops, loans and mortgages, jobs and savings, as a reading of the figures, not a measured effect.',
  'No advice to buy or sell.',
].join(' ');

/** Goes after the documents: the sections with their figures, the shape of the answer, the question last. */
export function whatIfTask(question: string, coverage: WhatIfCoverage[]): string {
  const lines = ['', 'Sections to write, in order (use only the figures listed for each; leave a section marked Missing empty):'];
  for (const c of coverage) {
    const s = WHATIF_SECTIONS[c.section];
    if (c.missing) {
      lines.push(`- ${c.section} (${s.label}): Missing, ${c.missing}.`);
      continue;
    }
    const figs = c.figures.length ? ` From: ${[...new Set(c.figures)].slice(0, 12).join('; ')}.` : '';
    lines.push(`- ${c.section} (${s.label}): ${s.asks}.${figs}`);
  }
  lines.push(
    '',
    'Write a JSON object with:',
    '- headline: one sentence that directly answers the question: what the change would most likely do, and how sure the figures let you be.',
    ...WHATIF_ORDER.map((id) => `- ${id}: a list of up to ${WHATIF_SECTIONS[id].max} sentences for "${WHATIF_SECTIONS[id].label}" (an empty list when Missing).`),
    '- disagreements: sentences on where the evidence points different ways, for example an app calculation against a published average or a past episode (empty list if none).',
    '- gaps: what the agents could not answer and how that limits the answer.',
    '',
    `What-if question to answer: ${question}`,
  );
  return lines.join('\n');
}

export interface WhatIfSection {
  id: WhatIfSectionId;
  label: string;
  kind: WhatIfKind;
  /** What the model wrote for this section, checked; empty when missing. */
  sentences: string[];
  /** Why the section has nothing: no figures for it, or nothing written survived the checks. */
  missing?: string;
}

export interface WhatIfBrief {
  sections: WhatIfSection[];
}

/** The raw shape the model is asked for. */
export type RawWhatIf = Partial<Record<WhatIfSectionId | 'headline' | 'disagreements' | 'gaps', unknown>>;

/**
 * Checks the model's what-if answer sentence by sentence, puts the sections in order, and fills
 * sections with no figures with "Missing" and the reason; a section the model wrote for although it
 * had no figures is dropped unread. `points` holds the same sentences flat for exports and saved documents.
 */
export function checkWhatIf(
  raw: RawWhatIf,
  question: string,
  answers: AgentAnswer[]
): { brief: CouncilBrief & { whatIf: WhatIfBrief }; removed: string[]; contradicted: Contradiction[] } {
  const { ok, removed, contradicted } = sentenceCheck(question, answers);
  const list = (xs: unknown, n: number): string[] =>
    (Array.isArray(xs) ? xs : typeof xs === 'string' ? [xs] : [])
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 600))
      .filter(ok)
      .slice(0, n);
  const headline = typeof raw.headline === 'string' ? raw.headline.trim().slice(0, 300) : '';
  const sections: WhatIfSection[] = whatIfCoverage(answers).map((c) => {
    const s = WHATIF_SECTIONS[c.section];
    const base = { id: c.section, label: s.label, kind: s.kind };
    if (c.missing) return { ...base, sentences: [], missing: c.missing };
    const wrote = Array.isArray(raw[c.section]) ? (raw[c.section] as unknown[]).filter((x) => typeof x === 'string' && x.trim()).length : 0;
    const sentences = list(raw[c.section], s.max);
    if (sentences.length) return { ...base, sentences };
    return { ...base, sentences: [], missing: wrote ? 'what the model wrote did not pass the number check' : 'the summary did not cover it' };
  });
  const disagreements = list(raw.disagreements, 4);
  const gaps = list(raw.gaps, 6);
  const points = sections.flatMap((s) => s.sentences.map((t) => `${s.label}: ${t}`));
  return {
    brief: { headline: headline && ok(headline) ? headline : '', points, disagreements, gaps, whatIf: { sections } },
    removed,
    contradicted,
  };
}

/* ------------------------------------------------------------------------------------------
 * Numbered references. A sentence cites a source when it quotes one of that source's figures
 * exactly as written. A published study is cited by its own reference and DOI; app calculations
 * (tag "model") are not references, as their source line says how they were made.
 * ------------------------------------------------------------------------------------------ */

export interface CitedWhatIf {
  sections: Array<Omit<WhatIfSection, 'sentences'> & { sentences: Array<{ text: string; refs: number[] }> }>;
  references: Reference[];
}

const TOKEN = /\d+(?:\.\d+)?/g;

interface CiteFig {
  tokens: Set<string>;
  source: string;
  url?: string;
  study: boolean;
}

function citeFigure(g: AgentFigure): CiteFig | null {
  const tokens = new Set(g.value.match(TOKEN) || []);
  if (/^Research:/.test(g.label)) {
    const citation = g.source.split('; ')[0].replace(/, doi \S+$/, '');
    const doi = /\bdoi (10\.[^;\s]+)/.exec(g.source)?.[1];
    return { tokens, source: citation, ...(doi ? { url: `https://doi.org/${doi}` } : {}), study: true };
  }
  return isCitable(g.source, g.tag) ? { tokens, source: g.source, study: false } : null;
}

export function citedWhatIf(w: WhatIfBrief, answers: AgentAnswer[]): CitedWhatIf {
  const refs = new References();
  const figs = answers.flatMap((a) => a.findings.flatMap((f) => f.figures.map(citeFigure).filter((x): x is CiteFig => x !== null)));
  const studies = figs.filter((f) => f.study);
  const cite = (text: string, section: WhatIfSectionId) => {
    const ns: number[] = [];
    const add = (g: CiteFig) => {
      const n = refs.cite(g.source, g.url);
      if (!ns.includes(n)) ns.push(n);
    };
    // A research sentence names its study by author, so cite the studies it names even without a number.
    if (section === 'research') for (const s of studies) if (text.includes(s.source.split(',')[0])) add(s);
    for (const t of text.match(TOKEN) || []) {
      if (/^(19|20)\d\d$/.test(t)) continue;
      const pool = section === 'research' ? [...studies, ...figs] : figs.filter((g) => !g.study);
      const hit = pool.find((g) => g.tokens.has(t));
      if (hit) add(hit);
    }
    return { text, refs: ns };
  };
  return {
    sections: w.sections.map((s) => ({ ...s, sentences: s.sentences.map((t) => cite(t, s.id)) })),
    references: refs.list,
  };
}
