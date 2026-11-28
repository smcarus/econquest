/**
 * Reads a Quest file from the repository's quests/ folder (approved) or quests/drafts/ for use as a
 * test fixture, without its approver, so a test can write it as a draft or approve it itself. Tests
 * build their own quests folders from these and never depend on which Quests are approved today.
 */
import fs from 'node:fs';
import path from 'node:path';

export function repoQuestPath(file: string): string {
  const approved = path.join(process.cwd(), 'quests', file);
  return fs.existsSync(approved) ? approved : path.join(process.cwd(), 'quests', 'drafts', file);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function repoQuest(file: string): any {
  const q = JSON.parse(fs.readFileSync(repoQuestPath(file), 'utf8'));
  delete q.approvedBy;
  return q;
}
