/**
 * Public Quest entries on disk (src/utils/questPublicEntries.ts): quests/entries/<id>/<login>.<n>.json.
 * Server and scripts only.
 */
import fs from 'fs';
import path from 'path';
import { ENTRIES_DIR, parseEntryPath, type PublicEntry } from './questPublicEntries';

export interface PublicEntryFile {
  /** Path from the repo root, e.g. quests/entries/tur-policy-2027h1/alice.1.json. */
  rel: string;
  text: string;
  entry?: PublicEntry;
  parseError?: string;
}

/** Every entry file under quests/entries/ (questsDir is the quests/ folder). */
export function readPublicEntryFiles(questsDir: string): PublicEntryFile[] {
  const root = path.join(questsDir, 'entries');
  const out: PublicEntryFile[] = [];
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return out;
  }
  for (const id of ids) {
    for (const name of fs.readdirSync(path.join(root, id)).filter((n) => n.endsWith('.json')).sort()) {
      const rel = `${ENTRIES_DIR}/${id}/${name}`;
      const text = fs.readFileSync(path.join(root, id, name), 'utf8');
      try {
        out.push({ rel, text, entry: JSON.parse(text) as PublicEntry });
      } catch (e) {
        out.push({ rel, text, parseError: (e as Error).message });
      }
    }
  }
  return out;
}

/** Entries whose file name agrees with their contents (the checker refuses the rest). */
export function loadPublicEntries(questsDir: string): PublicEntry[] {
  return readPublicEntryFiles(questsDir)
    .filter((f) => {
      const at = parseEntryPath(f.rel);
      return f.entry && at && f.entry.questId === at.questId && f.entry.login === at.login && f.entry.n === at.n;
    })
    .map((f) => f.entry!);
}
