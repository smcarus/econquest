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
import { classQuestFileProblems } from './classQuests';
import { questFileName, type Quest } from './quests';

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

/** Every row of a class log, oldest first (one JSON object per line; a broken line is skipped). */
export function loadJsonl<T>(file: string): T[] {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  return text.split('\n').flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line) as T];
    } catch {
      return [];
    }
  });
}

export function appendJsonl(file: string, row: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, { mode: 0o600 });
}

export const loadClassEntries = (file: string): ClassEntry[] => loadJsonl<ClassEntry>(file);
export const appendClassEntry = (file: string, entry: ClassEntry): void => appendJsonl(file, entry);

/** Feedback and peer reviews (Q6), next to the entries file. */
export function classFeedbackPath(entriesFile: string): string {
  return path.join(path.dirname(entriesFile), 'class-feedback.jsonl');
}
export function classReviewsPath(entriesFile: string): string {
  return path.join(path.dirname(entriesFile), 'class-reviews.jsonl');
}

/** A class's own Quests (Q4): data/local/class-quests/<class id>/, next to classes.json. */
export function classQuestsDir(classesFile: string, classId: string): string {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(classId)) throw new Error('Bad class id');
  return path.join(path.dirname(classesFile), 'class-quests', classId);
}

/** The class Quests that pass the checks, oldest first. */
export function loadClassQuests(dir: string): Quest[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return names
    .flatMap((name) => {
      try {
        const json = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        return classQuestFileProblems(json, name).length ? [] : [json as Quest];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.registeredOn.localeCompare(b.registeredOn) || a.id.localeCompare(b.id));
}

export function saveClassQuest(dir: string, q: Quest): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileAtomic(path.join(dir, questFileName(q)), `${JSON.stringify(q, null, 2)}\n`, 0o600);
}

export function removeClassQuest(dir: string, q: Pick<Quest, 'id' | 'version'>): void {
  fs.rmSync(path.join(dir, questFileName(q)), { force: true });
}

/** Keep only the rows of a class log that pass `keep`, written atomically (Q8: deleting a class). */
export function rewriteJsonl<T>(file: string, keep: (row: T) => boolean): number {
  if (!fs.existsSync(file)) return 0;
  const rows = loadJsonl<T>(file);
  const kept = rows.filter(keep);
  if (kept.length !== rows.length) writeFileAtomic(file, kept.map((r) => `${JSON.stringify(r)}\n`).join(''), 0o600);
  return rows.length - kept.length;
}

/** Remove a class's own Quests folder. */
export function removeClassQuestsDir(classesFile: string, classId: string): void {
  fs.rmSync(classQuestsDir(classesFile, classId), { recursive: true, force: true });
}
