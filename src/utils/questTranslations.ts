/**
 * Translated Quest text (roadmap QL1). The English Quest file is the rule; a translation only helps
 * people read it in Spanish, French or Brazilian Portuguese.
 *
 * A translation is its own file, quests/translations/<quest file name without .json>.<lang>.json,
 * for example quests/translations/arg-debt-2026.es.json or tur-policy.v2.fr.json. Keeping it apart
 * from the Quest file means an approved Quest's fingerprint never changes when a translation is added
 * or corrected, so anyone can add one later by pull request.
 *
 * The file holds the Quest's id and version, the language, who translated it, and the same text
 * fields as the Quest: title, summary and knownLimits, plus positions (Debate), hypothesis (Signal)
 * or target (Replication). Lists must have the same length as the English ones, so each translated
 * line sits beside the English one it translates.
 *
 * No figures: a translation may only use the numbers that appear in the same English field (dates,
 * thresholds, years), so it can never add a figure of its own.
 *
 * Browser-safe, pure.
 */
import { POSITION_MAX, SUMMARY_MAX, TITLE_MAX, questFileName, type Quest } from './quests';

export const QUEST_TRANSLATION_LANGS = ['es', 'fr', 'pt'] as const;
export type QuestTranslationLang = (typeof QUEST_TRANSLATION_LANGS)[number];

/** The text fields a translation carries. */
export interface QuestText {
  title: string;
  summary: string;
  knownLimits: string[];
  positions?: string[];
  hypothesis?: string;
  target?: string;
  /** Who translated it (shown with the translation; not part of the Quest's own text). */
  translator?: string;
}

export interface QuestTranslation extends QuestText {
  quest: string;
  version: number;
  lang: QuestTranslationLang;
  /** GitHub login of the person who translated it. */
  translator: string;
}

/** Translations of the served Quests: "id@version" to the text in each language that has one. */
export type QuestTranslationMap = Record<string, Partial<Record<QuestTranslationLang, QuestText>>>;

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const str = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;

/** File name a translation must be saved under. */
export function translationFileName(t: Pick<QuestTranslation, 'quest' | 'version' | 'lang'>): string {
  return `${questFileName({ id: t.quest, version: t.version }).replace(/\.json$/, '')}.${t.lang}.json`;
}

/** The numbers written in a text (digits, with a decimal point or comma inside), for the no-figures check. */
export function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));
}

/** Numbers in the translation that are not in the English text: a translation may not add a figure. */
function newNumbers(english: string, translated: string): string[] {
  const allowed = new Set(numbersIn(english));
  return numbersIn(translated).filter((n) => !allowed.has(n));
}

/** Everything wrong with a translation file, checked against its Quest (when found); empty when it passes. */
export function translationProblems(raw: unknown, quest: Quest | undefined, fileName?: string): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['not a JSON object'];
  const t = raw as Partial<QuestTranslation> & Record<string, unknown>;
  const out: string[] = [];
  if (typeof t.quest !== 'string' || !t.quest) out.push('quest: the id of the Quest it translates');
  if (!Number.isInteger(t.version) || (t.version as number) < 1) out.push('version: the version of the Quest it translates');
  if (!QUEST_TRANSLATION_LANGS.includes(t.lang as QuestTranslationLang)) out.push(`lang: one of ${QUEST_TRANSLATION_LANGS.join(', ')}`);
  if (typeof t.translator !== 'string' || !LOGIN.test(t.translator)) out.push('translator: a GitHub login');
  if (out.length) return out;
  const tr = t as QuestTranslation;
  if (fileName && fileName !== translationFileName(tr)) out.push(`file name: must be ${translationFileName(tr)}`);
  if (!quest) return [...out, `quest: no Quest ${tr.quest} version ${tr.version} in quests/ or quests/drafts/`];

  const field = (key: 'title' | 'summary' | 'hypothesis' | 'target', max: number, english: string | undefined) => {
    const v = tr[key];
    if (english === undefined) {
      if (v !== undefined) out.push(`${key}: this Quest has no ${key} to translate`);
      return;
    }
    if (!str(v, max)) return out.push(`${key}: 1 to ${max} characters`);
    const extra = newNumbers(english, v as string);
    if (extra.length) out.push(`${key}: has numbers that are not in the English (${extra.join(', ')}); a translation may not add figures`);
  };
  const list = (key: 'knownLimits' | 'positions', max: number, english: string[] | undefined) => {
    const v = tr[key];
    if (english === undefined) {
      if (v !== undefined) out.push(`${key}: this Quest has no ${key} to translate`);
      return;
    }
    if (!Array.isArray(v) || v.length !== english.length) return out.push(`${key}: ${english.length} line(s), one for each English line, in the same order`);
    v.forEach((line, i) => {
      if (!str(line, max)) out.push(`${key}[${i}]: 1 to ${max} characters`);
      else {
        const extra = newNumbers(english[i]!, line);
        if (extra.length) out.push(`${key}[${i}]: has numbers that are not in the English (${extra.join(', ')}); a translation may not add figures`);
      }
    });
  };
  field('title', TITLE_MAX, quest.title);
  field('summary', SUMMARY_MAX, quest.summary);
  list('knownLimits', 400, quest.knownLimits);
  list('positions', POSITION_MAX, quest.type === 'debate' ? quest.positions : undefined);
  field('hypothesis', SUMMARY_MAX, quest.type === 'signal' ? quest.hypothesis : undefined);
  field('target', SUMMARY_MAX, quest.type === 'replication' ? quest.target : undefined);
  const known = new Set(['quest', 'version', 'lang', 'translator', 'title', 'summary', 'knownLimits', 'positions', 'hypothesis', 'target']);
  for (const k of Object.keys(t)) if (!known.has(k)) out.push(`${k}: not a field of a translation`);
  return out;
}

/** The text of a translation, without its file details. */
export function translationText(t: QuestTranslation): QuestText {
  const text: QuestText = { title: t.title, summary: t.summary, knownLimits: t.knownLimits, translator: t.translator };
  if (t.positions) text.positions = t.positions;
  if (t.hypothesis) text.hypothesis = t.hypothesis;
  if (t.target) text.target = t.target;
  return text;
}

/** The key a translation map uses for a Quest. */
export const translationKey = (id: string, version: number) => `${id}@${version}`;

/**
 * The Quest's text in the chosen language, falling back to English field by field, and whether any
 * of it is a translation (so the screen can say the English is the rule).
 */
export function questTextIn(
  q: Pick<Quest, 'id' | 'version' | 'title' | 'summary' | 'knownLimits'> & { positions?: string[]; hypothesis?: string; target?: string },
  lang: string,
  map: QuestTranslationMap | undefined,
): QuestText & { translated: boolean } {
  const english: QuestText = { title: q.title, summary: q.summary, knownLimits: q.knownLimits, positions: q.positions, hypothesis: q.hypothesis, target: q.target };
  const t = lang === 'en' ? undefined : map?.[translationKey(q.id, q.version)]?.[lang as QuestTranslationLang];
  if (!t) return { ...english, translated: false };
  return {
    title: t.title || english.title,
    summary: t.summary || english.summary,
    knownLimits: t.knownLimits?.length === english.knownLimits.length ? t.knownLimits : english.knownLimits,
    positions: english.positions && t.positions?.length === english.positions.length ? t.positions : english.positions,
    hypothesis: english.hypothesis !== undefined ? t.hypothesis || english.hypothesis : undefined,
    target: english.target !== undefined ? t.target || english.target : undefined,
    translator: t.translator,
    translated: true,
  };
}

/** A title in the chosen language for a Quest known only by id (lists built on the server); English when there is none. */
export function questTitleIn(id: string, english: string, lang: string, map: QuestTranslationMap | undefined, version?: number): string {
  if (lang === 'en' || !map) return english;
  const key = version !== undefined ? translationKey(id, version) : Object.keys(map).filter((k) => k.startsWith(`${id}@`)).sort((a, b) => Number(b.split('@')[1]) - Number(a.split('@')[1]))[0];
  return (key && map[key]?.[lang as QuestTranslationLang]?.title) || english;
}
