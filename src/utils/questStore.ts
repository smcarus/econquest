/**
 * Quest files on disk (Quests step 2): reads quests/*.json (approved, fixed) and quests/drafts/*.json,
 * with each file's SHA-256 over its raw bytes, and quests/manifest.json. Server and scripts only.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { collectionProblems, questProblems, type Quest } from './quests';

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

/** JSON files in quests/ that are not Quests: the manifest, contributor statistics, account ages and Signal Quest verdicts. */
export const NOT_QUESTS = new Set(['manifest.json', 'stats.json', 'accounts.json', 'test-verdicts.json']);

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
