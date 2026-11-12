/**
 * Central bank word count (G31): counts hawkish and dovish phrases in central bank statements with a
 * fixed, published dictionary, so the same text always gives the same count. No AI scoring.
 *
 * Dictionary: Apel, Mikael and Marianna Blix Grimaldi (2012), "The Information Content of Central
 * Bank Minutes", Sveriges Riksbank Working Paper 261, section 6 and Table 1 (pp. 9-10):
 *   nouns (each with a wildcard, so compounds count: "inflation expectations"): inflation, cyclical
 *     position, growth, price, wages, oil price, development
 *   hawkish adjectives: increasing, faster, stronger, higher, with their basic forms (fast, strong,
 *     high); the paper's footnote 11 also counts "increased"
 *   dovish adjectives: decreasing, slower, weaker, lower, with their basic forms (slow, weak, low);
 *     footnote 11 also counts "decreased"
 * A phrase is an adjective directly followed by a noun ("higher inflation", "weaker growth"). The
 * paper does not state how far apart the two words may be; the app counts only the two-word
 * combination, as the paper describes it.
 *
 * Net index = (hawkish − dovish) ÷ (hawkish + dovish) + 1: 0 is all dovish, 2 all hawkish, 1 balanced.
 * The paper describes this net index (after Birz and Lott 2011, with 1 added so it is never
 * negative); the formula itself is set out here as the app reads that description.
 *
 * The dictionary was built for Riksbank minutes (translated from Swedish); on other banks' English
 * statements it is a description of wording, not a tested signal. Browser-safe, pure.
 */

export const CBW_HAWK = ['increasing', 'increased', 'faster', 'fast', 'stronger', 'strong', 'higher', 'high'] as const;
export const CBW_DOVE = ['decreasing', 'decreased', 'slower', 'slow', 'weaker', 'weak', 'lower', 'low'] as const;
/** Noun stems; two-word stems first so "oil price" is not also counted as "price". */
export const CBW_NOUNS = ['oil price', 'cyclical position', 'inflation', 'growth', 'price', 'wage', 'development'] as const;
export type CbwNoun = (typeof CBW_NOUNS)[number];

export const CBW_REFERENCE =
  'Apel, Mikael and Marianna Blix Grimaldi (2012), "The Information Content of Central Bank Minutes", Sveriges Riksbank Working Paper Series No. 261, section 6 and Table 1, pp. 9-10.';
export const CBW_METHOD =
  'Counts two-word phrases from the Apel and Blix Grimaldi (2012) dictionary: a hawkish adjective (increasing, increased, faster, stronger, higher, or fast, strong, high) or a dovish one (decreasing, decreased, slower, weaker, lower, or slow, weak, low) directly followed by one of the nouns inflation, cyclical position, growth, price, wage(s), oil price or development, each with any ending ("inflation expectations" counts as inflation). Upper and lower case are the same. Net index = (hawkish − dovish) ÷ (hawkish + dovish) + 1: 0 all dovish, 1 balanced, 2 all hawkish. The same text always gives the same count; no AI scoring. Built for Riksbank minutes, so on other banks it describes wording and is not a tested signal.';

export interface CbwCount {
  hawk: number;
  dove: number;
  /** null when no phrase matched. */
  net: number | null;
  words: number;
  /** Each phrase found and how often, most frequent first. */
  phrases: Array<{ phrase: string; side: 'hawk' | 'dove'; n: number }>;
  byNoun: Record<CbwNoun, { hawk: number; dove: number }>;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000 + 0;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Plain text from a saved statement: tags and entities out, spaces and dashes evened. */
export function cbwPlain(text: string): string {
  return text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const ADJ = new RegExp(`\\b(${[...CBW_HAWK, ...CBW_DOVE].map(esc).join('|')})\\s+(${CBW_NOUNS.map((n) => esc(n).replace(' ', '\\s+')).join('|')})\\w*`, 'gi');

export function cbWordCount(raw: string): CbwCount {
  const text = cbwPlain(raw);
  const byNoun = Object.fromEntries(CBW_NOUNS.map((n) => [n, { hawk: 0, dove: 0 }])) as CbwCount['byNoun'];
  const tally = new Map<string, { side: 'hawk' | 'dove'; n: number }>();
  let hawk = 0;
  let dove = 0;
  for (const m of text.matchAll(ADJ)) {
    const adj = m[1].toLowerCase();
    const noun = m[2].toLowerCase().replace(/\s+/g, ' ') as CbwNoun;
    const side = (CBW_HAWK as readonly string[]).includes(adj) ? 'hawk' : 'dove';
    if (side === 'hawk') hawk++;
    else dove++;
    byNoun[noun][side]++;
    const key = `${adj} ${noun}`;
    const t = tally.get(key) || { side, n: 0 };
    t.n++;
    tally.set(key, t);
  }
  const words = text ? text.split(' ').length : 0;
  const phrases = [...tally.entries()].map(([phrase, v]) => ({ phrase, side: v.side, n: v.n })).sort((a, b) => b.n - a.n || a.phrase.localeCompare(b.phrase));
  return { hawk, dove, net: hawk + dove ? r3((hawk - dove) / (hawk + dove) + 1) : null, words, phrases, byNoun };
}

/** A saved statement's date from its file name: 2026-10-29, 20261029, or 2026-10 (month). */
export function cbwDateFromName(name: string): string | null {
  const m = /((?:19|20)\d{2})-?([01]\d)(?:-?([0-3]\d))?/.exec(name);
  if (!m) return null;
  const mo = Number(m[2]);
  const d = m[3] ? Number(m[3]) : 1;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}${m[3] ? `-${m[3]}` : ''}`;
}

export interface CbwStatement extends CbwCount {
  file: string;
  date: string;
}

export function cbwSentence(list: CbwStatement[], name: string): string {
  if (!list.length) return `${name}: no saved central bank statements.`;
  const last = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2] : null;
  const net = last.net === null ? 'no dictionary phrase' : `net index ${last.net.toFixed(2)} (${last.hawk} hawkish, ${last.dove} dovish phrases)`;
  const change = prev && prev.net !== null && last.net !== null ? `, against ${prev.net.toFixed(2)} on ${prev.date}` : '';
  return `${name}: the statement of ${last.date} has ${net}${change}. Dictionary: Apel and Blix Grimaldi (2012).`;
}
