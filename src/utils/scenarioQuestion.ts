/**
 * Scenario reader (WI1, Sam 2026-11-17): reads a "what would happen if ..." question into the
 * shocks it states, so the council can start from today's figures and apply them.
 *
 * Kinds of shock read from plain words:
 * - policy_rate: the country's central bank rate, in points ("raises rates by 200 basis points").
 * - us_rate: the Federal Reserve's rate, in points.
 * - interest_cost: government borrowing costs or bond yields, in points.
 * - dollar: the US dollar against other currencies, in % (+ = stronger dollar).
 * - currency: the country's own currency against the US dollar, in % of units per dollar
 *   (+ = weaker currency, the scenario engine's convention).
 * - oil, food, commodity: world prices, in % (oil can also be given as a price, "oil at $150").
 * - fin_stress: financial stress, in index points of the stress index the user picks.
 * - supply_chain: the NY Fed supply chain pressure index, in standard deviations.
 * - growth: real GDP growth, in points ("growth falls 2 points", "a recession" with no size).
 * - inflation: consumer price inflation, in points.
 * Spending lines are read by src/utils/fiscalWhatIf.ts and trade-route shocks (Hormuz, Taiwan
 * Strait, Russia) by the Global Spillover Agent's list; this reader carries them along.
 *
 * Sizes are only the ones the question states. A shock with no size reads "size needed": the app
 * asks the user (or, in WI2, offers the largest past move with its date) and never picks one itself.
 * "Raise rates by 2%" is read as 2 points, and the reading says so.
 *
 * Browser-safe, pure.
 */
import { parseWhatIf, type WhatIfQuestion } from './fiscalWhatIf';
import type { FactorId } from './scenarioEngine';

export type ShockKind =
  | 'policy_rate'
  | 'us_rate'
  | 'interest_cost'
  | 'dollar'
  | 'currency'
  | 'oil'
  | 'food'
  | 'commodity'
  | 'fin_stress'
  | 'supply_chain'
  | 'growth'
  | 'inflation';

export type TradeRoute = 'hormuz' | 'taiwan' | 'russia';

export interface ShockKindInfo {
  label: string;
  unit: 'pts' | '%' | 'index pts' | 'std dev';
  /** What a positive change means, in words. */
  up: string;
  down: string;
}

export const SHOCK_KINDS: Record<ShockKind, ShockKindInfo> = {
  policy_rate: { label: 'Central bank policy rate', unit: 'pts', up: 'raised', down: 'cut' },
  us_rate: { label: 'US Federal Reserve rate', unit: 'pts', up: 'raised', down: 'cut' },
  interest_cost: { label: 'Government borrowing costs (bond yields)', unit: 'pts', up: 'higher', down: 'lower' },
  dollar: { label: 'US dollar against other currencies', unit: '%', up: 'stronger', down: 'weaker' },
  currency: { label: 'Currency against the US dollar', unit: '%', up: 'weaker', down: 'stronger' },
  oil: { label: 'World oil price', unit: '%', up: 'higher', down: 'lower' },
  food: { label: 'World food prices', unit: '%', up: 'higher', down: 'lower' },
  commodity: { label: 'Export commodity prices', unit: '%', up: 'higher', down: 'lower' },
  fin_stress: { label: 'Financial stress', unit: 'index pts', up: 'higher', down: 'lower' },
  supply_chain: { label: 'Global supply chain pressure', unit: 'std dev', up: 'higher', down: 'lower' },
  growth: { label: 'Real GDP growth', unit: 'pts', up: 'faster', down: 'slower' },
  inflation: { label: 'Inflation', unit: 'pts', up: 'higher', down: 'lower' },
};

export type ReadAs = { as: 'pct_as_pts'; value: number } | { as: 'double' } | { as: 'halve' };

export interface Shock {
  kind: ShockKind;
  /** +1 up, -1 down (in the kind's own sense, see SHOCK_KINDS), null when the words do not say. */
  direction: 1 | -1 | null;
  /** Signed change in the kind's unit; null when the question gives no size (or gives a level). */
  change: number | null;
  /** A level the question names instead of a change ("rates to 6%", "oil at $150"); null otherwise. */
  target: { value: number; unit: 'pts' | 'usd' } | null;
  /** The words the shock was read from. */
  said: string;
  /** How the size was read, when it needed reading: "2%" on a rate read as 2 points, a doubling as +100%, a halving as -50%. */
  read?: ReadAs;
}

export interface ScenarioQuestion {
  shocks: Shock[];
  /** A spending-line change, read by fiscalWhatIf. */
  spending: WhatIfQuestion | null;
  /** Trade-route shocks named in the question. */
  routes: TradeRoute[];
  /** Shocks with no size and no level: the user is asked for one. */
  needsSize: Shock[];
}

const WHAT_IF_RE =
  /\bwhat (?:would|will|could|might|happens?|happened)\b[^?]*\bif\b|\bwhat if\b|\bsuppose\b|\bsupposing\b|\bimagine\b|\bhypothetical(?:ly)?\b|\bscenario\b|\bhow (?:would|will|could|might)\b[^?]*\bif\b|\bif\b[^?]*\bwhat (?:would|will|happens)\b|\b(?:effects?|impact|consequences?) (?:of|if)\b/i;

/** True when the question asks what a stated change would do. */
export function isWhatIfQuestion(question: string): boolean {
  return WHAT_IF_RE.test(question);
}

const UP_RE = /\b(?:rais(?:e|es|ed|ing)|hik(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|ris(?:e|es|ing)|rose|jump(?:s|ed|ing)?|surg(?:e|es|ed|ing)|spik(?:e|es|ed|ing)|soar(?:s|ed|ing)?|climb(?:s|ed|ing)?|go(?:es)? up|went up|up|higher|doubl(?:e|es|ed|ing)|tighten(?:s|ed|ing)?|strengthen(?:s|ed|ing)?|stronger|rall(?:y|ies|ied))\b/i;
const DOWN_RE = /\b(?:cut(?:s|ting)?|lower(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|fall(?:s|ing)?|fell|drop(?:s|ped|ping)?|plung(?:e|es|ed|ing)|collaps(?:e|es|ed|ing)|crash(?:es|ed|ing)?|slump(?:s|ed|ing)?|tumbl(?:e|es|ed|ing)|sink(?:s|ing)?|sank|decline(?:s|d)?|declining|go(?:es)? down|went down|down|halv(?:e|es|ed|ing)|eas(?:e|es|ed|ing)|weaken(?:s|ed|ing)?|weaker|slow(?:s|ed|ing|er)?|contract(?:s|ed|ing)?|shrink(?:s|ing)?|los(?:e|es|ing)|lost)\b/i;
/** A currency weakening against the dollar: + in the engine's convention. */
const CCY_WEAK_RE = /\b(?:devalu\w*|depreciat\w*|weaken\w*|weaker|fall(?:s|ing)?|fell|drop\w*|plung\w*|collaps\w*|crash\w*|slump\w*|tumbl\w*|sink\w*|sank|los(?:e|es|ing)|lost|halv\w*)\b/i;
const CCY_STRONG_RE = /\b(?:appreciat\w*|strengthen\w*|stronger|ris(?:e|es|ing)|rose|rall\w*|revalu\w*|gain(?:s|ed|ing)?|jump\w*|surg\w*|climb\w*)\b/i;

const CURRENCY_WORDS =
  /\b(?:currency|exchange rate|peso|lira|real|rand|rupee|rupiah|ringgit|baht|korean won|yuan|renminbi|yen|zloty|forint|koruna|naira|cedi|shilling|kwacha|birr|dirham|dinar|riyal|pound|sterling|euro|franc|krona|krone|sol|colon|hryvnia|ruble|rouble|tenge|taka|kyat|dong|leu|lev)\b/i;
const AGAINST_DOLLAR = /\b(?:against|versus|vs\.?|to) the (?:us |u\.s\. )?dollar\b|\bagainst the usd\b/i;

/** Subject words, checked in this order (the first that fits a clause wins). */
const SUBJECTS: Array<{ kind: ShockKind; re: RegExp }> = [
  { kind: 'us_rate', re: /\b(?:fed|federal reserve|fomc|us (?:policy |interest )?rates?|u\.s\. (?:policy |interest )?rates?|american (?:interest )?rates?|fed funds)\b/i },
  { kind: 'interest_cost', re: /\b(?:borrowing costs?|bond yields?|yields?|cost of borrowing|interest (?:bill|costs?) on (?:the )?debt|spreads?|refinancing costs?)\b/i },
  { kind: 'policy_rate', re: /\b(?:policy rates?|interest rates?|central bank|rates?|repo rate|base rate|selic|monetary policy)\b/i },
  { kind: 'oil', re: /\b(?:oil|crude|brent|wti|petrol|gasoline|fuel prices?|energy prices?)\b/i },
  { kind: 'food', re: /\b(?:food prices?|food|grain|wheat|rice|maize|corn|fertili[sz]er)\b/i },
  { kind: 'commodity', re: /\b(?:commodit(?:y|ies)|copper|iron ore|soy(?:beans?)?|gold|coffee|cocoa|palm oil|export prices?|terms of trade)\b/i },
  { kind: 'fin_stress', re: /\b(?:financial stress|financial crisis|market stress|risk[- ]off|panic|credit crunch|financial conditions)\b/i },
  { kind: 'supply_chain', re: /\b(?:supply chains?|shipping|freight|supply shock)\b/i },
  { kind: 'growth', re: /\b(?:growth|gdp|recession|economy|output|slowdown|downturn)\b/i },
  { kind: 'inflation', re: /\b(?:inflation|prices|cpi)\b/i },
];

const ROUTES: Array<{ id: TradeRoute; re: RegExp }> = [
  { id: 'hormuz', re: /\bhormuz\b/i },
  { id: 'taiwan', re: /\btaiwan strait\b|\b(?:blockade|invasion|war) (?:of|over|on) taiwan\b|\btaiwan (?:crisis|blockade|invasion|war)\b/i },
  { id: 'russia', re: /\brussia(?:n)? (?:escalation|war|sanctions?)\b|\bsanctions? on russia\b/i },
];

const NUM = '(\\d+(?:\\.\\d+)?)';
const BP_RE = new RegExp(`${NUM}\\s*(?:bps?|basis[- ]points?)\\b`, 'i');
const PTS_RE = new RegExp(`${NUM}\\s*(?:percentage[- ]points?|pp|pts|points?)\\b`, 'i');
const PCT_RE = new RegExp(`${NUM}\\s*(?:%|percent\\b|per cent\\b)`, 'i');
const SD_RE = new RegExp(`${NUM}\\s*(?:standard deviations?|std devs?|sd)\\b`, 'i');
const USD_LEVEL_RE = new RegExp(`(?:to|at|hits?|reach(?:es)?|of|above|over)\\s*(?:us)?\\$\\s*${NUM}`, 'i');
const RATE_LEVEL_RE = new RegExp(`\\bto\\s+${NUM}\\s*(?:%|percent\\b|per cent\\b)`, 'i');
const WORD_SIZES: Array<{ re: RegExp; value: number }> = [
  { re: /\bquarter(?: of a)?[- ]point\b/i, value: 0.25 },
  { re: /\bhalf(?: a)?[- ]point\b/i, value: 0.5 },
  { re: /\bthree[- ]quarters? of a point\b/i, value: 0.75 },
];

const RATE_KINDS: ShockKind[] = ['policy_rate', 'us_rate', 'interest_cost', 'growth', 'inflation'];
const PRICE_KINDS: ShockKind[] = ['oil', 'food', 'commodity', 'dollar', 'currency'];

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** The part of the question that states the change: after "if", "suppose" or "imagine" when present. */
export function conditionText(question: string): string {
  const m = /\b(?:what if|if|suppose|supposing|imagine|assuming|effects? of|impact of|consequences? of)\b([\s\S]+)$/i.exec(question);
  return (m ? m[1] : question).replace(/[?]+\s*$/, '').trim();
}

/** Splits the condition on "and", commas and semicolons, keeping a clause's subject with its verb. */
function clauses(text: string): string[] {
  return text
    .split(/\s*(?:,|;|\band then\b|\band\b|\bwhile\b|\bplus\b|\bat the same time\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function directionOf(kind: ShockKind, clause: string): 1 | -1 | null {
  if (kind === 'currency') {
    const weak = CCY_WEAK_RE.exec(clause);
    const strong = CCY_STRONG_RE.exec(clause);
    if (weak && (!strong || weak.index <= strong.index)) return 1;
    if (strong) return -1;
    return null;
  }
  const up = UP_RE.exec(clause);
  const down = DOWN_RE.exec(clause);
  if (kind === 'growth' && /\brecession|slowdown|downturn|contraction\b/i.test(clause) && !up) return -1;
  if (up && (!down || up.index <= down.index)) return 1;
  if (down) return -1;
  return null;
}

function sizeOf(kind: ShockKind, clause: string): { change: number | null; target: Shock['target']; read?: ReadAs } {
  const isRate = RATE_KINDS.includes(kind);
  if (kind === 'oil') {
    const lv = USD_LEVEL_RE.exec(clause);
    if (lv) return { change: null, target: { value: Number(lv[1]), unit: 'usd' } };
  }
  if (isRate) {
    const lv = RATE_LEVEL_RE.exec(clause);
    if (lv && !/\bby\b/i.test(clause.slice(0, lv.index))) return { change: null, target: { value: Number(lv[1]), unit: 'pts' } };
    const bp = BP_RE.exec(clause);
    if (bp) return { change: r4(Number(bp[1]) / 100), target: null };
    const pts = PTS_RE.exec(clause);
    if (pts) return { change: Number(pts[1]), target: null };
    for (const w of WORD_SIZES) if (w.re.test(clause)) return { change: w.value, target: null };
    const pct = PCT_RE.exec(clause);
    if (pct) return { change: Number(pct[1]), target: null, read: { as: 'pct_as_pts', value: Number(pct[1]) } };
    return { change: null, target: null };
  }
  if (kind === 'supply_chain') {
    const sd = SD_RE.exec(clause) || PTS_RE.exec(clause);
    if (sd) return { change: Number(sd[1]), target: null };
    return { change: null, target: null };
  }
  if (kind === 'fin_stress') {
    const pts = PTS_RE.exec(clause);
    if (pts) return { change: Number(pts[1]), target: null };
    return { change: null, target: null };
  }
  const pct = PCT_RE.exec(clause);
  if (pct) return { change: Number(pct[1]), target: null };
  // A currency that "halves" or "doubles" is left for the user to size: halving its value is +100% units per dollar, and readers mean different things.
  if (PRICE_KINDS.includes(kind) && kind !== 'currency') {
    if (/\bdoubl(?:e|es|ed|ing)\b/i.test(clause)) return { change: 100, target: null, read: { as: 'double' } };
    if (/\bhalv(?:e|es|ed|ing)\b|\bin half\b/i.test(clause)) return { change: 50, target: null, read: { as: 'halve' } };
  }
  return { change: null, target: null };
}

function kindOf(clause: string): ShockKind | null {
  if (AGAINST_DOLLAR.test(clause) || /\b(?:devalu|depreciat|apprecia)\w*/i.test(clause)) return 'currency';
  // "real GDP", "euro area" and the like are not currencies.
  const plain = clause.replace(/\breal (?:gdp|growth|terms|rates?|incomes?|wages?|economy|estate)\b/gi, '').replace(/\beuro[- ]?(?:area|zone)\b/gi, '');
  if (CURRENCY_WORDS.test(plain) && (CCY_WEAK_RE.test(plain) || CCY_STRONG_RE.test(plain))) return 'currency';
  if (/\b(?:us |u\.s\. |the )?dollar\b|\bdxy\b|\bgreenback\b/i.test(clause)) return 'dollar';
  for (const s of SUBJECTS) if (s.re.test(clause)) return s.kind;
  return null;
}

/** Reads one clause into a shock; null when it states none. */
export function readShock(clause: string): Shock | null {
  const kind = kindOf(clause);
  if (!kind) return null;
  const direction = directionOf(kind, clause);
  const { change, target, read } = sizeOf(kind, clause);
  // "doubling" and "halving" carry their own sign.
  let dir = direction;
  if (read?.as === 'halve') dir = -1;
  if (read?.as === 'double') dir = 1;
  if (change === null && target === null && dir === null) return null;
  const signed = change === null ? null : r4(Math.abs(change) * (dir ?? 1));
  return { kind, direction: dir, change: signed, target, said: clause, ...(read ? { read } : {}) };
}

/**
 * Reads a what-if question; null when the question is not one or states no shock the app can run.
 * A shock named twice keeps its first reading.
 */
export function parseScenario(question: string): ScenarioQuestion | null {
  if (!isWhatIfQuestion(question)) return null;
  const spending = parseWhatIf(question);
  const routes = ROUTES.filter((r) => r.re.test(question)).map((r) => r.id);
  const cond = conditionText(question);
  const shocks: Shock[] = [];
  // A spending-line question is the fiscal what-if's; its clauses are not read again here.
  if (!spending) {
    for (const c of clauses(cond)) {
      const s = readShock(c);
      if (s && !shocks.some((x) => x.kind === s.kind)) shocks.push(s);
    }
  }
  if (!shocks.length && !spending && !routes.length) return null;
  return { shocks, spending, routes, needsSize: shocks.filter((s) => s.change === null && s.target === null) };
}

/** The shocks the scenario engine can take (src/utils/scenarioEngine.ts), in its units. */
export function engineShock(sq: ScenarioQuestion): Partial<Record<FactorId, number>> {
  const out: Partial<Record<FactorId, number>> = {};
  for (const s of sq.shocks) {
    if (s.change === null) continue;
    if (s.kind === 'us_rate') out.us_rate = s.change;
    else if (s.kind === 'dollar') out.dollar = s.change;
    else if (s.kind === 'fin_stress') out.fin_stress = s.change;
    else if (s.kind === 'supply_chain') out.supply_chain = s.change;
  }
  return out;
}

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v}`;

/** The shock in plain words: "US Federal Reserve rate raised 2 points". */
export function shockLabel(s: Shock): string {
  const k = SHOCK_KINDS[s.kind];
  const dir = s.direction === -1 ? k.down : s.direction === 1 ? k.up : 'changed';
  if (s.target) return `${k.label} ${s.target.unit === 'usd' ? `at $${s.target.value}` : `to ${s.target.value}%`}`;
  if (s.change === null) return `${k.label} ${dir}, size not stated`;
  const unit = k.unit === '%' ? '%' : ` ${k.unit}`;
  return `${k.label} ${dir} (${sgn(s.change)}${unit})`;
}

/** The question put back to the user when a shock has no size. */
export function sizeQuestion(s: Shock): string {
  const k = SHOCK_KINDS[s.kind];
  const unit = k.unit === 'pts' ? 'percentage points' : k.unit === '%' ? 'per cent' : k.unit;
  return `How large is the change in ${k.label.toLowerCase()}? Give a size in ${unit}, for example "by 2 ${unit}".`;
}

/** The shocks as a query value for GET /api/council/scenario/:iso3. */
export function scenarioQuery(sq: ScenarioQuestion): string {
  return encodeURIComponent(JSON.stringify(sq.shocks.map((s) => ({ kind: s.kind, direction: s.direction, change: s.change, target: s.target }))));
}

/** Plain words for one shock that this reader reads back to the same kind, direction and size (WI6). */
const PHRASE: Record<ShockKind, { subject: string; up: string; down: string; unit: 'pts' | '%' | 'sd' }> = {
  policy_rate: { subject: 'the central bank', up: 'raised rates', down: 'cut rates', unit: 'pts' },
  us_rate: { subject: 'the Fed', up: 'raised rates', down: 'cut rates', unit: 'pts' },
  interest_cost: { subject: 'bond yields', up: 'rose', down: 'fell', unit: 'pts' },
  dollar: { subject: 'the US dollar', up: 'strengthened', down: 'weakened', unit: '%' },
  currency: { subject: 'the currency', up: 'weakened', down: 'strengthened', unit: '%' },
  oil: { subject: 'oil prices', up: 'rose', down: 'fell', unit: '%' },
  food: { subject: 'food prices', up: 'rose', down: 'fell', unit: '%' },
  commodity: { subject: 'export commodity prices', up: 'rose', down: 'fell', unit: '%' },
  fin_stress: { subject: 'financial stress', up: 'rose', down: 'fell', unit: 'pts' },
  supply_chain: { subject: 'supply chain pressure', up: 'rose', down: 'fell', unit: 'sd' },
  growth: { subject: 'growth', up: 'rose', down: 'slowed', unit: 'pts' },
  inflation: { subject: 'inflation', up: 'rose', down: 'fell', unit: 'pts' },
};

/** One shock in words; null when it has neither a size nor a level. */
export function shockWords(s: Pick<Shock, 'kind' | 'change' | 'target'>): string | null {
  const p = PHRASE[s.kind];
  if (s.target) {
    if (s.target.unit === 'usd') return s.kind === 'oil' ? `oil hits $${s.target.value}` : null;
    if (!['policy_rate', 'us_rate', 'interest_cost'].includes(s.kind)) return null;
    return `${p.subject} ${s.kind === 'interest_cost' ? 'rose' : 'raised rates'} to ${s.target.value}%`;
  }
  if (s.change === null || s.change === 0) return null;
  const v = Math.abs(s.change);
  const size = p.unit === '%' ? `${v}%` : p.unit === 'sd' ? `${v} standard deviation${v === 1 ? '' : 's'}` : `${v} point${v === 1 ? '' : 's'}`;
  const verb = s.change > 0 ? p.up : p.down;
  return s.kind === 'currency' ? `${p.subject} ${verb} by ${size} against the dollar` : `${p.subject} ${verb} by ${size}`;
}

/**
 * The what-if question for a set of shocks, as the editable scenario card (WI6) sends it: "What would
 * happen to Turkey if the Fed raised rates by 1 point and oil prices rose by 50%?". Shocks with no
 * size are left out; null when none is left.
 */
export function scenarioText(shocks: Array<Pick<Shock, 'kind' | 'change' | 'target'>>, countries: string[]): string | null {
  const parts = shocks.map(shockWords).filter((x): x is string => Boolean(x));
  if (!parts.length) return null;
  const who = countries.length ? ` to ${countries.length > 1 ? `${countries.slice(0, -1).join(', ')} and ${countries[countries.length - 1]}` : countries[0]}` : '';
  return `What would happen${who} if ${parts.join(' and ')}?`;
}
