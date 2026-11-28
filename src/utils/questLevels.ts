/**
 * Level tags for Quests (classroom step Q4): intro, intermediate or advanced, on every Quest and
 * every pack, so a professor can pick Quests that fit a course and students can filter by level.
 *
 * A Quest written since then carries `level` in its own file. An approved Quest is fixed (its hash is
 * in quests/manifest.json), so the Quests that came before levels take theirs from quests/levels.json,
 * a plain map from Quest id to level. A Quest's own `level` wins over the map.
 *
 * Browser-safe, pure.
 */
import { QUEST_LEVELS, type Quest, type QuestLevel } from './quests';

export interface LevelsFile {
  note?: string;
  levels: Record<string, QuestLevel>;
}

export const LEVELS_NOTE = 'Levels for Quests approved before Quest files carried a level (classroom step Q4). A new Quest puts "level" in its own file; this map is only for files that can no longer change.';

/** Problems in quests/levels.json; `questIds` are the Quests on file. */
export function levelsFileProblems(raw: unknown, questIds: ReadonlySet<string>): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['not a JSON object with "levels"'];
  const levels = (raw as { levels?: unknown }).levels;
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) return ['levels: { "<quest id>": "intro" | "intermediate" | "advanced" }'];
  const out: string[] = [];
  for (const [id, level] of Object.entries(levels as Record<string, unknown>)) {
    if (!questIds.has(id)) out.push(`levels.${id}: no Quest with that id`);
    if (!QUEST_LEVELS.includes(level as QuestLevel)) out.push(`levels.${id}: one of ${QUEST_LEVELS.join(', ')}`);
  }
  return out;
}

/** A Quest's level: its own, else the map's, else none. */
export function questLevel(q: Pick<Quest, 'id' | 'level'>, map: Readonly<Record<string, QuestLevel>>): QuestLevel | undefined {
  return q.level ?? (Object.prototype.hasOwnProperty.call(map, q.id) ? map[q.id] : undefined);
}

/** Ids of Quests with no level at all (each one is listed by npm run quests:check). */
export function questsWithoutLevel(quests: Array<Pick<Quest, 'id' | 'level'>>, map: Readonly<Record<string, QuestLevel>>): string[] {
  return [...new Set(quests.filter((q) => !questLevel(q, map)).map((q) => q.id))];
}
