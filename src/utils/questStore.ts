/**
 * Quest files on disk (Quests step 2): reads quests/*.json (approved, fixed) and quests/drafts/*.json,
 * with each file's SHA-256 over its raw bytes, and quests/manifest.json. Server and scripts only.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { collectionProblems, questProblems, QUEST_LEVELS, type Quest, type QuestLevel } from './quests';
import { levelsFileProblems, questsWithoutLevel } from './questLevels';
import { translationKey, translationProblems, translationText, type QuestTranslation, type QuestTranslationMap } from './questTranslations';
import { packProblems, type QuestPack } from './questPacks';

export const MANIFEST_NOTE =
  'SHA-256 of each approved Quest file. An approved Quest is fixed: a changed file fails the check, so a change is a new version (a new file), and a Quest is withdrawn by a resolution line, never deleted.';

export interface QuestFile {
  name: string;
  /** Path relative to the repo root, for messages. */
  rel: string;
  approved: boolean;
  json: unknown;
  hash: string;
  parseError?: string;
}

/** JSON files in quests/ that are not Quests: the manifest, contributor statistics, account ages, and Signal Quest verdicts. */
export const NOT_QUESTS = new Set(['manifest.json', 'stats.json', 'accounts.json', 'test-verdicts.json', 'levels.json']);

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

function readDir(dir: string, approved: boolean, relBase: string): QuestFile[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json') && !NOT_QUESTS.has(n)).sort();
  } catch {
    return [];
  }
  return names.map((name) => {
    const buf = fs.readFileSync(path.join(dir, name));
    const rel = `${relBase}/${name}`;
    try {
      return { name, rel, approved, json: JSON.parse(buf.toString('utf8')), hash: sha256(buf) };
    } catch (e) {
      return { name, rel, approved, json: null, hash: sha256(buf), parseError: (e as Error).message };
    }
  });
}

export function readQuestFiles(questsDir: string): QuestFile[] {
  return [...readDir(questsDir, true, 'quests'), ...readDir(path.join(questsDir, 'drafts'), false, 'quests/drafts')];
}

export function readManifest(questsDir: string): Record<string, string> {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(questsDir, 'manifest.json'), 'utf8'));
    return m && typeof m.files === 'object' ? (m.files as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeManifest(questsDir: string, files: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(questsDir, 'manifest.json'), `${JSON.stringify({ note: MANIFEST_NOTE, files: sorted }, null, 2)}\n`);
}

export interface QuestCheckResult {
  files: QuestFile[];
  /** Problems by file (rel path), plus "collection" for cross-file ones. */
  problems: Record<string, string[]>;
  ok: boolean;
}

export function checkQuests(questsDir: string, manifest = readManifest(questsDir)): QuestCheckResult {
  const files = readQuestFiles(questsDir);
  const problems: Record<string, string[]> = {};
  for (const f of files) {
    const p = f.parseError ? [`not valid JSON: ${f.parseError}`] : questProblems(f.json, { approved: f.approved, fileName: f.name });
    if (p.length) problems[f.rel] = p;
  }
  const c = collectionProblems(files, manifest);
  if (c.length) problems.collection = c;
  Object.assign(problems, checkTranslations(questsDir, files));
  Object.assign(problems, checkPacks(questsDir, files));
  Object.assign(problems, checkLevels(questsDir, files));
  return { files, problems, ok: Object.keys(problems).length === 0 };
}

/** The valid Quests, approved first. */
export function loadQuests(questsDir: string): Array<{ quest: Quest; approved: boolean; hash: string; file: string }> {
  const manifest = readManifest(questsDir);
  return readQuestFiles(questsDir)
    .filter((f) => !f.parseError && questProblems(f.json, { approved: f.approved, fileName: f.name }).length === 0)
    .filter((f) => !f.approved || manifest[f.name] === f.hash)
    .map((f) => ({ quest: f.json as Quest, approved: f.approved, hash: f.hash, file: f.rel }));
}

export interface TranslationFile {
  name: string;
  rel: string;
  json: unknown;
  parseError?: string;
}

/** quests/translations/*.json (roadmap QL1): translated Quest text, kept apart from the hashed Quest files. */
export function readTranslationFiles(questsDir: string): TranslationFile[] {
  const dir = path.join(questsDir, 'translations');
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return names.map((name) => {
    const rel = `quests/translations/${name}`;
    try {
      return { name, rel, json: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) };
    } catch (e) {
      return { name, rel, json: null, parseError: (e as Error).message };
    }
  });
}

/** Problems in each translation file, checked against the Quest file it translates. */
export function checkTranslations(questsDir: string, files = readQuestFiles(questsDir)): Record<string, string[]> {
  const quests = new Map<string, Quest>();
  for (const f of files) {
    const q = f.json as Quest | null;
    if (q && typeof q.id === 'string' && typeof q.version === 'number') quests.set(translationKey(q.id, q.version), q);
  }
  const problems: Record<string, string[]> = {};
  for (const t of readTranslationFiles(questsDir)) {
    const j = t.json as Partial<QuestTranslation> | null;
    const quest = j && typeof j.quest === 'string' && typeof j.version === 'number' ? quests.get(translationKey(j.quest, j.version)) : undefined;
    const p = t.parseError ? [`not valid JSON: ${t.parseError}`] : translationProblems(t.json, quest, t.name);
    if (p.length) problems[t.rel] = p;
  }
  return problems;
}

/** The translations that pass, for the Quests served: "id@version" to each language's text. */
export function loadTranslations(questsDir: string, quests: Array<{ quest: Quest }>): QuestTranslationMap {
  const byKey = new Map(quests.map((x) => [translationKey(x.quest.id, x.quest.version), x.quest]));
  const map: QuestTranslationMap = {};
  for (const t of readTranslationFiles(questsDir)) {
    if (t.parseError) continue;
    const j = t.json as QuestTranslation;
    const quest = j && typeof j.quest === 'string' ? byKey.get(translationKey(j.quest, j.version)) : undefined;
    if (!quest || translationProblems(j, quest, t.name).length) continue;
    (map[translationKey(j.quest, j.version)] ??= {})[j.lang] = translationText(j);
  }
  return map;
}

/** quests/packs/*.json: named sets of Quests grouped by topic (src/utils/questPacks.ts). */
export function readPackFiles(questsDir: string): TranslationFile[] {
  const dir = path.join(questsDir, 'packs');
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return names.map((name) => {
    const rel = `quests/packs/${name}`;
    try {
      return { name, rel, json: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) };
    } catch (e) {
      return { name, rel, json: null, parseError: (e as Error).message };
    }
  });
}

/** Problems in each pack file, checked against the Quests on file. */
export function checkPacks(questsDir: string, files = readQuestFiles(questsDir)): Record<string, string[]> {
  const ids = new Set(files.map((f) => (f.json as Quest | null)?.id).filter((x): x is string => typeof x === 'string'));
  const problems: Record<string, string[]> = {};
  for (const f of readPackFiles(questsDir)) {
    const p = f.parseError ? [`not valid JSON: ${f.parseError}`] : packProblems(f.json, f.name, ids);
    if (p.length) problems[f.rel] = p;
  }
  return problems;
}

/** The packs that pass, each listing only the Quests served (a draft drops out when drafts are not served). */
export function loadPacks(questsDir: string, quests: Array<{ quest: Quest }>): QuestPack[] {
  const all = new Set(readQuestFiles(questsDir).map((f) => (f.json as Quest | null)?.id).filter((x): x is string => typeof x === 'string'));
  const served = new Set(quests.map((x) => x.quest.id));
  const out: QuestPack[] = [];
  for (const f of readPackFiles(questsDir)) {
    if (f.parseError || packProblems(f.json, f.name, all).length) continue;
    const p = f.json as QuestPack;
    const groups = p.groups.map((g) => ({ ...g, quests: g.quests.filter((id) => served.has(id)) })).filter((g) => g.quests.length);
    if (groups.length) out.push({ ...p, groups });
  }
  return out;
}

/** quests/levels.json: levels for Quests approved before files carried one (src/utils/questLevels.ts). */
export function levelsPath(questsDir: string): string {
  return path.join(questsDir, 'levels.json');
}

function readLevelsFile(questsDir: string): { json: unknown; parseError?: string } | null {
  try {
    const text = fs.readFileSync(levelsPath(questsDir), 'utf8');
    try {
      return { json: JSON.parse(text) };
    } catch (e) {
      return { json: null, parseError: (e as Error).message };
    }
  } catch {
    return null;
  }
}

/** Problems in quests/levels.json, and every Quest on file with no level. */
export function checkLevels(questsDir: string, files = readQuestFiles(questsDir)): Record<string, string[]> {
  const quests = files.map((f) => f.json as Quest | null).filter((q): q is Quest => Boolean(q && typeof q.id === 'string'));
  const f = readLevelsFile(questsDir);
  const out: Record<string, string[]> = {};
  if (f) {
    const p = f.parseError ? [`not valid JSON: ${f.parseError}`] : levelsFileProblems(f.json, new Set(quests.map((q) => q.id)));
    if (p.length) out['quests/levels.json'] = p;
  }
  const missing = questsWithoutLevel(quests, loadLevels(questsDir));
  if (missing.length) out.levels = missing.map((id) => `${id}: no level; add "level": "intro", "intermediate" or "advanced" to a draft, or the id to quests/levels.json for an approved Quest`);
  return out;
}

/** The level map, or an empty one when the file is missing or broken. */
export function loadLevels(questsDir: string): Record<string, QuestLevel> {
  const f = readLevelsFile(questsDir);
  if (!f || f.parseError || !f.json || typeof f.json !== 'object') return {};
  const levels = (f.json as { levels?: unknown }).levels;
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) return {};
  return Object.fromEntries(Object.entries(levels as Record<string, unknown>).filter(([, v]) => QUEST_LEVELS.includes(v as QuestLevel))) as Record<string, QuestLevel>;
}
