/**
 * Data API: ask Council chat a new question (scope ask:council, POST /api/v1/council/ask).
 *
 * The answer comes from the same steps as the browser's Council chat (src/utils/councilQuestion.ts
 * for the plan and the desk agents, the server's synthesis step for the summary, with its number
 * and stance checks). This file holds the parts only the API needs, kept pure so the tests can run
 * them on recorded inputs:
 *  - reading and checking the request (question, iso3, history, max_cost_usd);
 *  - the hidden-names list: hidden names in the question and history are replaced with "[hidden]"
 *    before any step sees them, hidden countries leave the pool, and any sentence or figure in the
 *    reply that still names one is left out; the reply carries only a count;
 *  - only real figures: estimates, built-in samples and your own documents are left out, and so is
 *    any figure whose source the licence register does not allow passing on (counted);
 *  - the reply: answer, agents, citations (source, period, badge, terms link), checks, cost.
 */
import { ISO_NUMERIC_TO_ISO3 } from '../data/worldCountries';
import { countryMentionPatterns, type AgentAnswer, type AgentFigure, type AgentFinding, type EarlierTurn, type SynthesisResult } from '../utils/askCouncil';
import { shareableSource, type ValueBadge } from '../utils/consoleEvents';
import { hiddenNote, type HiddenKind } from '../utils/exclusions';
import { shareForSource } from '../utils/licenceLookup';

export const MAX_QUESTION_CHARS = 2000;
export const MAX_HISTORY_TURNS = 10;
export const HIDDEN_MARK = '[hidden]';
export const ASK_DISCLAIMER =
  'Research output from the app\'s own figures, not investment advice. Each sentence of the answer was checked against the agents\' figures (numbers) and their calls (stance); sentences that failed were removed. Figures carry their source and period; check them at the source before relying on them.';

export interface HiddenTest {
  countryHidden(iso3: string | undefined | null): boolean;
  isHidden(kind: HiddenKind, value: string | undefined | null): boolean;
}

export interface AskRequest {
  question: string;
  iso3?: string;
  history: Array<{ role: 'user' | 'council'; content: string }>;
  maxCostUsd?: number;
}

export interface AskProblem {
  status: number;
  code: string;
  message: string;
}

/** Reads and checks the request body; a problem carries the HTTP status and error code. */
export function parseAskRequest(body: unknown): AskRequest | AskProblem {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const question = typeof b.question === 'string' ? b.question.trim() : '';
  if (!question) return { status: 422, code: 'question_empty', message: 'Send a question (the "question" field).' };
  if (question.length > MAX_QUESTION_CHARS) return { status: 422, code: 'question_too_long', message: `The question is ${question.length} characters; the limit is ${MAX_QUESTION_CHARS}.` };
  let iso3: string | undefined;
  if (b.iso3 !== undefined && b.iso3 !== null && b.iso3 !== '') {
    if (typeof b.iso3 !== 'string' || !/^[A-Za-z]{3}$/.test(b.iso3.trim())) return { status: 422, code: 'bad_iso3', message: 'iso3 must be a three-letter ISO country code, for example "BRA".' };
    iso3 = b.iso3.trim().toUpperCase();
  }
  const history: AskRequest['history'] = [];
  if (b.history !== undefined && b.history !== null) {
    if (!Array.isArray(b.history)) return { status: 422, code: 'bad_history', message: 'history must be a list of {role, content} turns.' };
    if (b.history.length > MAX_HISTORY_TURNS) return { status: 422, code: 'history_too_long', message: `history holds ${b.history.length} turns; the limit is ${MAX_HISTORY_TURNS}. Nothing is remembered between calls, so send only the turns the question follows on from.` };
    for (const [i, t] of (b.history as unknown[]).entries()) {
      const turn = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
      const role = turn.role;
      const content = typeof turn.content === 'string' ? turn.content.trim() : '';
      if ((role !== 'user' && role !== 'council') || !content) return { status: 422, code: 'bad_history', message: `history turn ${i + 1} needs role "user" or "council" and some content.` };
      if (content.length > MAX_QUESTION_CHARS) return { status: 422, code: 'bad_history', message: `history turn ${i + 1} is longer than ${MAX_QUESTION_CHARS} characters.` };
      history.push({ role, content });
    }
  }
  let maxCostUsd: number | undefined;
  if (b.max_cost_usd !== undefined && b.max_cost_usd !== null) {
    const v = typeof b.max_cost_usd === 'number' ? b.max_cost_usd : Number.NaN;
    if (!Number.isFinite(v) || v < 0) return { status: 422, code: 'bad_max_cost', message: 'max_cost_usd must be a number of US dollars, 0 or more.' };
    maxCostUsd = v;
  }
  return { question, ...(iso3 ? { iso3 } : {}), history, ...(maxCostUsd !== undefined ? { maxCostUsd } : {}) };
}

export const isProblem = (v: unknown): v is AskProblem => Boolean(v && typeof v === 'object' && 'status' in v && 'code' in v);

/**
 * Earlier turns as the AI steps read them: each user turn is an earlier question, and the council
 * turn after it is that question's headline (as the browser sends them).
 */
export function historyTurns(history: AskRequest['history']): EarlierTurn[] {
  const out: EarlierTurn[] = [];
  for (const t of history) {
    if (t.role === 'user') out.push({ question: t.content.slice(0, 500) });
    else if (out.length && out[out.length - 1]!.headline === undefined) out[out.length - 1]!.headline = t.content.slice(0, 600);
  }
  return out;
}

const COUNTRIES = (() => {
  const seen = new Set<string>();
  return Object.values(ISO_NUMERIC_TO_ISO3).filter((c) => !seen.has(c.iso3) && seen.add(c.iso3));
})();

/** The hidden countries as patterns, found by testing each ISO country against the list (it holds fingerprints only). */
export function hiddenCountryPatterns(hidden: HiddenTest): RegExp[] {
  return COUNTRIES.filter((c) => hidden.countryHidden(c.iso3)).flatMap((c) => countryMentionPatterns(c.iso3, c.name));
}

const ID_WORD = /[A-Za-z0-9][A-Za-z0-9._:-]*[A-Za-z0-9]|[A-Za-z0-9]/g;

/** True when a word is a hidden ISIN, LEI, CIK, ticker or entity ID. */
function hiddenId(word: string, hidden: HiddenTest): boolean {
  if (hidden.isHidden('entity_id', word)) return true;
  if (/^[A-Z0-9]{12}$/i.test(word) && hidden.isHidden('isin', word)) return true;
  if (/^[A-Z0-9]{20}$/i.test(word) && hidden.isHidden('lei', word)) return true;
  if (/^\d{6,10}$/.test(word) && hidden.isHidden('cik', word)) return true;
  // Tickers only as written in capitals, so ordinary words are not taken for one.
  return word === word.toUpperCase() && /[A-Z]/.test(word) && hidden.isHidden('ticker', word);
}

/** Replaces every hidden name in a text with "[hidden]"; returns the text and how many were replaced. */
export function hideNames(text: string, hidden: HiddenTest, patterns: RegExp[] = hiddenCountryPatterns(hidden)): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const re of patterns) {
    out = out.replace(re, (_m, before: string) => {
      count++;
      return `${before}${HIDDEN_MARK}`;
    });
  }
  out = out.replace(ID_WORD, (w) => {
    if (w === HIDDEN_MARK.slice(1, -1) || !hiddenId(w, hidden)) return w;
    count++;
    return HIDDEN_MARK;
  });
  return { text: out, count };
}

/** True when a text names anything on the hidden list. */
export function namesHidden(text: string, hidden: HiddenTest, patterns: RegExp[]): boolean {
  return hideNames(text, hidden, patterns).count > 0;
}

/** Leaves out each sentence that names a hidden item; returns the rest and how many went. */
export function withoutHiddenSentences(text: string, hidden: HiddenTest, patterns: RegExp[]): { text: string; count: number } {
  if (!text) return { text, count: 0 };
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => !namesHidden(s, hidden, patterns));
  return { text: kept.join(' ').trim(), count: sentences.length - kept.length };
}

/** A figure the API may pass on: a published or app-computed figure, not an estimate, a sample or your own document. */
export function isRealFigure(g: AgentFigure): boolean {
  return g.tag === 'live' || g.tag === 'official' || g.tag === 'model';
}

export interface FilterCounts {
  /** Figures left out because the source's terms do not allow passing them on (or it is not in the licence register). */
  notShareable: number;
  /** Figures left out because they are not real figures (estimates, samples, your own documents). */
  notReal: number;
  /** Findings and figures left out because they name a hidden item. */
  hidden: number;
}

/**
 * The agents' answers with only figures the API may pass on. A finding is kept only when every one
 * of its figures may be passed on, because its reading quotes them; the rest are left out and counted.
 */
export function answersForApi(answers: AgentAnswer[], hidden: HiddenTest, patterns: RegExp[], shareable: (source: string) => boolean = shareableSource): { answers: AgentAnswer[]; counts: FilterCounts } {
  const counts: FilterCounts = { notShareable: 0, notReal: 0, hidden: 0 };
  const out = answers.map((a) => {
    const findings: AgentFinding[] = [];
    let dropped = 0;
    for (const f of a.findings) {
      const unreal = f.figures.filter((g) => !isRealFigure(g)).length;
      // A figure the app worked out ('model') is the app's own; the figures it was worked out from
      // sit in the same finding and are checked here, so a closed input still keeps the finding out.
      const closed = f.figures.filter((g) => isRealFigure(g) && g.tag !== 'model' && !shareable(g.source)).length;
      const named = hidden.countryHidden(f.iso3) || namesHidden([f.countryName, f.reading, ...f.figures.flatMap((g) => [g.label, g.value, g.source])].join(' \n '), hidden, patterns);
      if (named) {
        counts.hidden += 1;
        dropped++;
      } else if (unreal || closed) {
        counts.notReal += unreal;
        counts.notShareable += closed;
        dropped++;
      } else findings.push(f);
    }
    const missing = a.missing.map((m) => withoutHiddenSentences(m, hidden, patterns)).filter((m) => {
      counts.hidden += m.count;
      return m.text;
    }).map((m) => m.text);
    const note = dropped ? [`${dropped} finding${dropped === 1 ? ' was' : 's were'} left out of this answer: the data API passes on only real figures whose sources allow it, and never a hidden name.`] : [];
    const { chart: _chart, ...rest } = a;
    return { ...rest, findings, missing: [...missing, ...note] };
  });
  return { answers: out, counts };
}

/** The period a figure refers to, read from its source text: a date, month, quarter or year; null when it names none. */
export function periodFromSource(source: string): string | null {
  const s = String(source || '');
  const iso = s.match(/\b(\d{4})-(\d{2})(?:-(\d{2}))?\b/);
  if (iso) return iso[3] ? `${iso[1]}-${iso[2]}-${iso[3]}` : `${iso[1]}-${iso[2]}`;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const mon = s.match(/\b(\d{1,2}\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (mon) {
    const mm = String(months.indexOf(mon[2]!.slice(0, 3).toLowerCase()) + 1).padStart(2, '0');
    const dd = mon[1] ? String(Number(mon[1].trim())).padStart(2, '0') : null;
    return dd ? `${mon[3]}-${mm}-${dd}` : `${mon[3]}-${mm}`;
  }
  const q = s.match(/\b(\d{4})\s*-?\s*Q([1-4])\b/i) || s.match(/\bQ([1-4])\s+(\d{4})\b/i);
  if (q) return /^\d{4}$/.test(q[1]!) ? `${q[1]}-Q${q[2]}` : `${q[2]}-Q${q[1]}`;
  const y = s.match(/\b(19[5-9]\d|20\d\d)\b/g);
  return y ? y[y.length - 1]! : null;
}

/** A published figure is "official"; a figure the app worked out has not been through the signal standard as such. */
export function badgeForFigure(g: AgentFigure): ValueBadge {
  return g.tag === 'live' || g.tag === 'official' ? 'official' : 'not_validated';
}

export interface Citation {
  label: string;
  value: string;
  source: string;
  date: string | null;
  badge: ValueBadge;
  url: string | null;
  iso3: string;
  agent: string;
  shareable: true;
}

/** Every figure the answer rests on, once each, with its source, period, badge and the source's terms page. */
export function citationsFrom(answers: AgentAnswer[]): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const a of answers) {
    for (const f of a.findings) {
      for (const g of f.figures) {
        const key = `${f.iso3}|${g.label}|${g.value}|${g.source}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // A figure the app worked out names its method, not a publication: no period or terms page of its own.
        const own = g.tag === 'model';
        const terms = own ? null : (shareForSource(g.source)?.rows[0]?.terms[0]?.url ?? null);
        out.push({ label: f.countryName && !g.label.includes(f.countryName) ? `${f.countryName}: ${g.label}` : g.label, value: g.value, source: g.source, date: own ? null : periodFromSource(g.source), badge: badgeForFigure(g), url: terms, iso3: f.iso3, agent: a.name, shareable: true });
      }
    }
  }
  return out;
}

export interface AgentView {
  id: string;
  label: string;
  summary: string;
  stance: Array<{ iso3: string; dim: string; call: string }>;
}

/** One line per agent: what it found (its readings), or what it could not answer, and its calls. */
export function agentsFrom(answers: AgentAnswer[]): AgentView[] {
  return answers.map((a) => ({
    id: a.id,
    label: a.name,
    summary: (a.findings.length ? a.findings.map((f) => (f.countryName && !f.reading.includes(f.countryName) ? `${f.countryName}: ${f.reading}` : f.reading)) : a.missing).join(' ').slice(0, 2000),
    stance: a.findings.flatMap((f) => (f.stance || []).map((s) => ({ iso3: f.iso3, dim: s.dim, call: s.call }))),
  }));
}

/** The summary as one text: the headline, then each point on its own line. */
export function answerText(out: SynthesisResult): string | null {
  const b = out.brief;
  if (!b) return null;
  return [b.headline, ...b.points.map((p) => `- ${p}`)].filter(Boolean).join('\n');
}

/** What each check did: pass when a summary was written (failing sentences removed), no_answer otherwise. */
export function checksFrom(out: SynthesisResult): { number_trace: { status: 'pass' | 'no_answer'; removed: number }; stance_check: { status: 'pass' | 'no_answer'; removed: number } } {
  const status = out.brief ? 'pass' : 'no_answer';
  return { number_trace: { status, removed: out.removed.length }, stance_check: { status, removed: out.contradicted?.length ?? 0 } };
}

/** Takes any hidden name out of the summary the model wrote (the steps never saw one, so this rarely has work). */
export function briefWithoutHidden(out: SynthesisResult, hidden: HiddenTest, patterns: RegExp[]): { out: SynthesisResult; count: number } {
  if (!out.brief) return { out, count: 0 };
  let count = 0;
  const clean = (s: string) => {
    const r = withoutHiddenSentences(s, hidden, patterns);
    count += r.count;
    return r.text;
  };
  const list = (xs: string[]) => xs.map(clean).filter(Boolean);
  const b = out.brief;
  const brief = { ...b, headline: clean(b.headline), points: list(b.points), disagreements: list(b.disagreements), gaps: list(b.gaps) };
  // An explanation's lenses repeat the points; when a sentence went, only the checked points are kept.
  if (count && b.explain) delete (brief as { explain?: unknown }).explain;
  return { out: { ...out, brief }, count };
}

export const hiddenText = (n: number) => (n ? hiddenNote(n) : null);

export const newRunId = (rand: () => string) => `ask_${rand()}`;
