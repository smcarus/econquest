/**
 * Append-only store for private Quest entries (src/utils/questEntries.ts): one JSON record per line
 * in data/local/quest-entries.jsonl, each with the SHA-256 of its canonical JSON. Never edited.
 * Server and scripts only.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { canonicalEntry, type QuestEntry } from './questEntries';

export const entryFilePath = (dataDir: string) => path.join(dataDir, 'local', 'quest-entries.jsonl');

export const entryHash = (e: Omit<QuestEntry, 'hash'> | QuestEntry) => crypto.createHash('sha256').update(canonicalEntry(e)).digest('hex');

export function loadEntries(file: string): { entries: Array<{ entry: QuestEntry; hashOk: boolean }>; badLines: number } {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { entries: [], badLines: 0 };
  }
  const entries: Array<{ entry: QuestEntry; hashOk: boolean }> = [];
  let badLines = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as QuestEntry;
      if (!entry?.id || !entry.hash || !entry.questId) throw new Error('not an entry');
      entries.push({ entry, hashOk: entryHash(entry) === entry.hash });
    } catch {
      badLines++;
    }
  }
  return { entries, badLines };
}

export function appendEntry(file: string, rec: Omit<QuestEntry, 'hash'>): QuestEntry {
  const entry: QuestEntry = { ...rec, hash: entryHash(rec) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  return entry;
}
