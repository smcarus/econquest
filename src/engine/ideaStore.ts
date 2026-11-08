/**
 * Append-only store for the trade idea journal (src/engine/ideaJournal.ts): one JSON record per
 * line in local/ideas.jsonl. Records are never edited or removed by the app; each carries the
 * SHA-256 of its canonical JSON so a changed line shows up as "hash does not match".
 */
import type { Platform } from '../platform/types';
import { canonicalIdea, type Idea } from './ideaJournal';
import { sha256Hex } from './sha256';

export const IDEA_FILE_NAME = 'local/ideas.jsonl';

export function ideaHash(i: Omit<Idea, 'hash'> | Idea): string {
  return sha256Hex(canonicalIdea(i));
}

export interface LoadedIdea {
  idea: Idea;
  /** False when the line was changed after it was logged. */
  hashOk: boolean;
}

export async function loadIdeas(platform: Platform): Promise<{ ideas: LoadedIdea[]; badLines: number }> {
  const text = await platform.files.read(IDEA_FILE_NAME);
  if (text === null) return { ideas: [], badLines: 0 };
  const ideas: LoadedIdea[] = [];
  let badLines = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const idea = JSON.parse(line) as Idea;
      if (!idea?.id || !idea.hash) throw new Error('not an idea');
      ideas.push({ idea, hashOk: ideaHash(idea) === idea.hash });
    } catch {
      badLines += 1;
    }
  }
  return { ideas, badLines };
}

/** Hashes the record and appends it. Returns the stored record. */
export async function appendIdea(platform: Platform, rec: Omit<Idea, 'hash'>): Promise<Idea> {
  const idea: Idea = { ...rec, hash: ideaHash(rec) };
  await platform.files.append(IDEA_FILE_NAME, `${JSON.stringify(idea)}\n`);
  return idea;
}
