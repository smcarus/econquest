/**
 * Quest packs (quests/packs/*.json): a named set of Quests grouped by topic, so a newcomer has a
 * ready list of economic and policy problems to work through (the starter pack: practice on past
 * data, forecasts, policy debates and a replication, by topic). A pack only lists Quest ids; the
 * Quests themselves, their rules and their fingerprints are unchanged. Titles carry each language
 * the app speaks; English is required.
 *
 * Browser-safe, pure.
 */
import { QUEST_TRANSLATION_LANGS } from './questTranslations';
import { QUEST_LEVELS, type QuestLevel } from './quests';

export type PackText = { en: string } & Partial<Record<(typeof QUEST_TRANSLATION_LANGS)[number], string>>;

export interface QuestPackGroup {
  id: string;
  title: PackText;
  quests: string[];
}

export interface QuestPack {
  id: string;
  title: PackText;
  summary: PackText;
  /** Who the pack is for: intro, intermediate or advanced (classroom step Q4). */
  level: QuestLevel;
  groups: QuestPackGroup[];
}

const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const TEXT_MAX = 400;

function textProblems(v: unknown, where: string): string[] {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [`${where}: { "en": ..., "es": ..., "fr": ..., "pt": ... }`];
  const o = v as Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(o)) {
    if (k !== 'en' && !(QUEST_TRANSLATION_LANGS as readonly string[]).includes(k)) out.push(`${where}.${k}: not a language the app speaks (en, ${QUEST_TRANSLATION_LANGS.join(', ')})`);
    else if (typeof o[k] !== 'string' || !(o[k] as string).trim() || (o[k] as string).length > TEXT_MAX) out.push(`${where}.${k}: text up to ${TEXT_MAX} characters`);
  }
  if (!('en' in o)) out.push(`${where}.en: English is required`);
  return out;
}

/** Problems in a pack file; `questIds` are the Quests on file (approved and drafts). */
export function packProblems(raw: unknown, fileName: string, questIds: ReadonlySet<string>): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['a pack is a JSON object'];
  const p = raw as Partial<QuestPack> & Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(p)) if (!['id', 'title', 'summary', 'level', 'groups'].includes(k)) out.push(`${k}: not a pack field`);
  if (typeof p.id !== 'string' || !ID.test(p.id)) out.push('id: lower-case letters, digits and -');
  else if (fileName !== `${p.id}.json`) out.push(`file name must be ${p.id}.json`);
  out.push(...textProblems(p.title, 'title'), ...textProblems(p.summary, 'summary'));
  if (!QUEST_LEVELS.includes(p.level as QuestLevel)) out.push(`level: one of ${QUEST_LEVELS.join(', ')}`);
  if (!Array.isArray(p.groups) || !p.groups.length) return [...out, 'groups: one or more groups'];
  const seen = new Set<string>();
  const groupIds = new Set<string>();
  p.groups.forEach((g, i) => {
    const at = `groups[${i}]`;
    if (!g || typeof g !== 'object') return void out.push(`${at}: { "id", "title", "quests" }`);
    if (typeof g.id !== 'string' || !ID.test(g.id)) out.push(`${at}.id: lower-case letters, digits and -`);
    else if (groupIds.has(g.id)) out.push(`${at}.id: "${g.id}" is used twice`);
    else groupIds.add(g.id);
    out.push(...textProblems(g.title, `${at}.title`));
    if (!Array.isArray(g.quests) || !g.quests.length) return void out.push(`${at}.quests: one or more Quest ids`);
    for (const id of g.quests) {
      if (typeof id !== 'string' || !questIds.has(id)) out.push(`${at}.quests: "${String(id)}" is not a Quest on file`);
      else if (seen.has(id)) out.push(`${at}.quests: "${id}" is in the pack twice`);
      else seen.add(id);
    }
  });
  return out;
}

/** A pack's text in a language, English when that language is missing. */
export function packText(t: PackText, lang: string): string {
  return (t as Record<string, string | undefined>)[lang] || t.en;
}
