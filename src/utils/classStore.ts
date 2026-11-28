/**
 * The classes file (data/local/classes.json) for Quests in the classroom (src/utils/classes.ts).
 * Server-only. Each change reads, changes and writes the whole file atomically, so a crash leaves
 * the old file or the new one, never half of either.
 */
import fs from 'fs';
import path from 'path';
import { writeFileAtomic } from './atomicWrite';
import type { SchoolClass } from './classes';
import type { ClassEntry } from './classAssignments';

export function classesPath(dataDir: string): string {
  return path.join(dataDir, 'local', 'classes.json');
}

export function loadClasses(file: string): SchoolClass[] {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8')) as { classes?: SchoolClass[] };
    return Array.isArray(j.classes) ? j.classes : [];
  } catch {
    return [];
  }
}

export function saveClasses(file: string, classes: SchoolClass[]): void {
  writeFileAtomic(file, `${JSON.stringify({ version: 1, classes }, null, 2)}\n`, 0o600);
}

/** Read, change and write in one step; returns what the change returned. */
export function changeClasses<T>(file: string, change: (classes: SchoolClass[]) => T): T {
  const classes = loadClasses(file);
  const out = change(classes);
  saveClasses(file, classes);
  return out;
}

export function classEntriesPath(dataDir: string): string {
  return path.join(dataDir, 'local', 'class-entries.jsonl');
}

/** Every class entry, oldest first (one JSON object per line; a broken line is skipped). */
export function loadClassEntries(file: string): ClassEntry[] {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  return text.split('\n').flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line) as ClassEntry];
    } catch {
      return [];
    }
  });
}

export function appendClassEntry(file: string, entry: ClassEntry): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
}
